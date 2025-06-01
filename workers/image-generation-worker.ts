// 🚀 图片生成 Worker 处理器
// 专门处理队列中的长时间图片生成任务，支持2分钟+执行时间

import { imageGenerationQueue, queueManager, ImageGenerationJob } from '../lib/queue-system';

// 风格提示词模板
const STYLE_PROMPTS = {
  cute: `Chibi full-body illustration of the main character from [REF_IMAGE], ignore any background. Precisely preserve the hairstyle, any existing accessories, facial features, expression, gender, and temperament from the reference image, with a slightly slimmer face. IMPORTANT: Only include accessories if they are clearly visible in the reference image. Head-to-body ratio around 1:1.2; big eyes, rounded simplified limbs; layered line art distinguishing: hairstyle, face, torso, limbs, and any visible accessories; flat pastel color block fills with subtle cel-shading shadows and highlight distinction; overall style cute yet handsome; high-resolution square canvas, 1:1 aspect ratio.`,
  toy: `3D isometric full-body toy figurine of the main character from [REF_IMAGE], ignore any background. Preserve exactly the hairstyle, any existing accessories, facial features, expression, gender and temperament from the reference, with a slightly slimmer face. IMPORTANT: Only include accessories if they are clearly visible in the reference image. Render smooth vinyl-like surfaces with clear segmentation into head, torso, arms, legs, joints and any visible accessories; use consistent bevel outlines and soft plastic material feel; apply muted yet vibrant color zones and subtle studio reflections; maintain a perfect blend of adorable and handsome; photorealistic 3D render, square 1:1 aspect ratio.`,
  cyber: `Cyberpunk full-body character illustration of the main character from [REF_IMAGE], ignore any background, square 1:1 canvas. Precisely preserve the hairstyle, any existing accessories, facial features, expression, gender and temperament from the reference, with a slightly slimmer face. IMPORTANT: Only include accessories if they are clearly visible in the reference image. Clear layered segmentation: hairstyle, face, upper-body armor/clothing, lower-body combat suit, limbs and any visible accessories; armor and clothing surfaces covered with glowing neon circuit patterns; distinct metallic and leather textures; blend high reflections with deep shadows, incorporating neon light reflections; dynamic pose emphasizing futuristic and cyberpunk aesthetics; high-resolution digital painting.`
};

// 变化提示词（确保每张图片独特）
const VARIATION_PROMPTS = [
  'with slight pose variation and unique background elements',
  'with different lighting mood and alternative angle perspective', 
  'with varied color saturation and distinct artistic interpretation'
];

// 🎨 单张图片生成函数
async function generateSingleImage(
  prompt: string, 
  imageData: string, 
  variationIndex: number,
  taskId: string
): Promise<string> {
  
  const variationPrompt = VARIATION_PROMPTS[variationIndex % VARIATION_PROMPTS.length];
  let finalPrompt = prompt.replace('[REF_IMAGE]', 'the uploaded reference image');
  finalPrompt += `. CRITICAL: Generate a character based on the uploaded reference image. Maintain the SAME SUBJECT TYPE (if it's an animal, generate an animal; if it's a person, generate a person). Preserve the key characteristics while applying the artistic style ${variationPrompt}.`;

  // 转换base64图片数据为Buffer
  const imageBuffer = Buffer.from(imageData, 'base64');
  
  // 准备API请求
  const apiUrl = 'https://ismaque.org/v1/images/edits';
  const apiKey = process.env.SPARROW_API_KEY || 'sk-1eEdZF3JuFocE3eyrFBnmE1IgMFwbGcwPfMciRMdxF1Zl8Ke';
  
  const formData = new FormData();
  formData.append('image', new Blob([imageBuffer]), 'reference.jpg');
  formData.append('mask', new Blob([imageBuffer]), 'mask.jpg');
  formData.append('prompt', finalPrompt);
  formData.append('n', '1');
  formData.append('size', '1024x1024'); // 服务器环境支持更高质量
  formData.append('response_format', 'url');
  formData.append('model', 'gpt-image-1');
  formData.append('user', `worker_${taskId}_${variationIndex}_${Date.now()}`);

  console.log(`🎨 Worker生成第${variationIndex + 1}张图片 - 变化: ${variationPrompt}`);

  // 设置120秒超时（服务器环境可以支持更长时间）
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API调用失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // 提取图片URL
    let imageUrl = '';
    if (data.data && Array.isArray(data.data) && data.data[0]?.url) {
      imageUrl = data.data[0].url;
    } else if (data.url) {
      imageUrl = data.url;
    } else if (data.data && Array.isArray(data.data) && data.data[0]?.b64_json) {
      imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
    }

    if (!imageUrl) {
      throw new Error('API响应中未找到有效图片URL');
    }

    console.log(`✅ Worker第${variationIndex + 1}张图片生成成功`);
    return imageUrl;

  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('图片生成超时（120秒）');
    }
    
    throw error;
  }
}

// 🔄 Worker处理函数
imageGenerationQueue.process('generate-images', 2, async (job) => {
  const startTime = Date.now();
  const { taskId, prompt, imageData, style } = job.data as ImageGenerationJob;
  
  console.log(`🚀 Worker开始处理任务: ${taskId}`);
  
  try {
    // 更新状态：开始处理
    await queueManager.updateTaskStatus(taskId, {
      status: 'active',
      progress: 10,
    });

    // 构建完整提示词
    const stylePrompt = STYLE_PROMPTS[style];
    if (!stylePrompt) {
      throw new Error(`未知的风格: ${style}`);
    }

    let fullPrompt = stylePrompt;
    if (prompt && prompt.trim()) {
      fullPrompt += ` Additional requirements: ${prompt}`;
    }

    // 更新状态：分析完成，开始生成
    await queueManager.updateTaskStatus(taskId, {
      status: 'active',
      progress: 30,
    });

    // 🎨 并行生成3张独特图片
    const promises = [];
    for (let i = 0; i < 3; i++) {
      promises.push(
        generateSingleImage(fullPrompt, imageData, i, taskId)
      );
    }

    // 更新状态：生成中
    await queueManager.updateTaskStatus(taskId, {
      status: 'active',
      progress: 60,
    });

    // 等待所有图片生成完成（允许部分失败）
    const results = await Promise.allSettled(promises);
    
    // 处理结果
    const successResults = results
      .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
      .map(result => result.value);
    
    const failedCount = results.length - successResults.length;
    
    // 服务器环境要求更高：至少2张成功
    if (successResults.length < 2) {
      throw new Error(`生成失败：只成功生成了${successResults.length}张图片，至少需要2张`);
    }

    // 更新状态：处理完成
    const processingTime = Date.now() - startTime;
    await queueManager.updateTaskStatus(taskId, {
      status: 'completed',
      progress: 100,
      results: successResults,
      processingTime,
    });

    console.log(`🎊 Worker任务完成: ${taskId} - 成功${successResults.length}张，失败${failedCount}张，耗时${processingTime}ms`);
    
    // 🔔 发送Webhook通知（如果有回调地址）
    if (job.data.callbackUrl) {
      try {
        await fetch(job.data.callbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId,
            status: 'completed',
            results: successResults,
            processingTime,
          }),
        });
        console.log(`📤 Webhook通知已发送: ${job.data.callbackUrl}`);
      } catch (webhookError) {
        console.error('❌ Webhook通知失败:', webhookError);
      }
    }

    return {
      taskId,
      results: successResults,
      processingTime,
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error(`❌ Worker任务失败: ${taskId} - ${errorMessage}`);
    
    // 更新状态：失败
    await queueManager.updateTaskStatus(taskId, {
      status: 'failed',
      progress: 0,
      error: errorMessage,
      processingTime,
    });

    // 🔔 发送失败Webhook通知
    if (job.data.callbackUrl) {
      try {
        await fetch(job.data.callbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId,
            status: 'failed',
            error: errorMessage,
            processingTime,
          }),
        });
      } catch (webhookError) {
        console.error('❌ 失败Webhook通知发送失败:', webhookError);
      }
    }

    throw error;
  }
});

// Worker事件监听
imageGenerationQueue.on('completed', (job, result) => {
  console.log(`✅ 队列任务完成: ${job.id}`);
});

imageGenerationQueue.on('failed', (job, err) => {
  console.log(`❌ 队列任务失败: ${job?.id} - ${err.message}`);
});

imageGenerationQueue.on('stalled', (job) => {
  console.log(`⏸️ 队列任务停滞: ${job.id}`);
});

console.log('🚀 图片生成Worker已启动，等待处理任务...');

export default imageGenerationQueue; 