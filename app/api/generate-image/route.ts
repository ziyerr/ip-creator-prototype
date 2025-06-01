import { NextRequest } from 'next/server';

// 内存中的任务存储（生产环境可使用Redis）
const taskStorage = new Map<string, {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  results: string[];
  error?: string;
  createdAt: number;
}>();

// 清理过期任务（1小时后）
setInterval(() => {
  const now = Date.now();
  for (const [taskId, task] of taskStorage.entries()) {
    if (now - task.createdAt > 60 * 60 * 1000) { // 1小时
      taskStorage.delete(taskId);
    }
  }
}, 10 * 60 * 1000); // 每10分钟清理一次

export async function POST(req: NextRequest) {
  try {
    console.log('=== 异步图片生成任务处理 ===');
    
    // 1. 解析请求参数
    const requestFormData = await req.formData();
    const prompt = requestFormData.get('prompt') as string;
    const imageFile = requestFormData.get('image') as File;
    const action = requestFormData.get('action') as string;

    // 2. 如果是查询任务状态
    if (action === 'query') {
      const taskId = requestFormData.get('taskId') as string;
      if (!taskId || !taskStorage.has(taskId)) {
        return new Response(JSON.stringify({ 
          error: '任务不存在或已过期',
          taskId 
        }), { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const task = taskStorage.get(taskId)!;
      return new Response(JSON.stringify({
        taskId,
        status: task.status,
        progress: task.progress,
        results: task.results,
        error: task.error,
        message: getStatusMessage(task.status, task.progress)
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. 创建新的生成任务（默认操作）
    if (!prompt || !imageFile) {
      return new Response(JSON.stringify({ 
        error: '缺少必要参数：prompt或image' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 生成唯一任务ID
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 初始化任务状态
    taskStorage.set(taskId, {
      status: 'pending',
      progress: 0,
      results: [],
      createdAt: Date.now()
    });

    console.log('创建异步任务:', taskId);

    // 立即返回任务ID，不等待处理完成
    const response = new Response(JSON.stringify({
      taskId,
      status: 'pending',
      message: '任务已创建，正在准备生成3张专属IP形象...',
      estimatedTime: '60-90秒'
    }), {
      status: 202, // 202 Accepted
      headers: { 'Content-Type': 'application/json' }
    });

    // 异步处理任务（不阻塞响应）
    processImageGenerationTask(taskId, prompt, imageFile).catch(error => {
      console.error('异步任务处理失败:', error);
      const task = taskStorage.get(taskId);
      if (task) {
        task.status = 'failed';
        task.error = error instanceof Error ? error.message : String(error);
      }
    });

    return response;

  } catch (error) {
    console.error('请求处理错误:', error);
    return new Response(JSON.stringify({ 
      error: '服务器内部错误',
      details: error instanceof Error ? error.message : String(error)
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 异步处理图片生成任务
async function processImageGenerationTask(taskId: string, prompt: string, imageFile: File) {
  const task = taskStorage.get(taskId);
  if (!task) return;

  try {
    console.log(`开始处理任务 ${taskId}...`);
    
    // 更新状态为处理中
    task.status = 'processing';
    task.progress = 10;
    
    // API配置
    const apiUrl = 'https://ismaque.org/v1/images/edits';
    const apiKey = process.env.SPARROW_API_KEY || 'sk-1eEdZF3JuFocE3eyrFBnmE1IgMFwbGcwPfMciRMdxF1Zl8Ke';
    
    // 处理提示词
    let finalPrompt = prompt.replace('[REF_IMAGE]', 'the uploaded reference image');
    finalPrompt += `. CRITICAL: Generate a character based on the uploaded reference image. Maintain the SAME SUBJECT TYPE (if it's an animal, generate an animal; if it's a person, generate a person). Preserve the key characteristics while applying the artistic style.`;
    
    // 准备图片数据
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    task.progress = 20;
    
    // 并行生成3张图片
    const generationPromises = [];
    
    for (let i = 0; i < 3; i++) {
      const generateSingleImage = async () => {
        const apiFormData = new FormData();
        apiFormData.append('image', new Blob([imageBuffer]), imageFile.name);
        apiFormData.append('mask', new Blob([imageBuffer]), imageFile.name);
        apiFormData.append('prompt', finalPrompt);
        apiFormData.append('n', '1');
        apiFormData.append('size', '1024x1024'); // 恢复高质量
        apiFormData.append('response_format', 'url');
        apiFormData.append('model', 'gpt-image-1');

        console.log(`发起第${i + 1}张图片生成请求...`);
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          body: apiFormData,
        });

        if (!response.ok) {
          throw new Error(`API调用失败: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`第${i + 1}张图片API响应:`, data);

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
          throw new Error(`第${i + 1}张图片未找到有效URL`);
        }

        console.log(`第${i + 1}张图片生成成功:`, imageUrl.substring(0, 100) + '...');
        return imageUrl;
      };

      generationPromises.push(generateSingleImage());
    }

    task.progress = 30;

    // 等待所有图片生成完成
    console.log('等待3张图片并行生成完成...');
    const results = await Promise.all(generationPromises);
    
    // 验证生成结果
    const validResults = results.filter(url => url && url.length > 0);
    
    if (validResults.length === 0) {
      throw new Error('所有图片生成均失败');
    }

    // 更新任务状态为完成
    task.status = 'completed';
    task.progress = 100;
    task.results = validResults;
    
    console.log(`任务 ${taskId} 完成，成功生成 ${validResults.length} 张图片`);

  } catch (error) {
    console.error(`任务 ${taskId} 处理失败:`, error);
    task.status = 'failed';
    task.error = error instanceof Error ? error.message : String(error);
  }
}

// 获取状态消息
function getStatusMessage(status: string, progress: number): string {
  switch (status) {
    case 'pending':
      return '⏳ 任务已创建，等待开始处理...';
    case 'processing':
      if (progress < 30) return '🔍 正在分析上传图片和准备生成参数...';
      if (progress < 60) return '🎨 AI正在并行生成3张专属IP形象...';
      if (progress < 90) return '✨ 正在优化和验证生成结果...';
      return '🎉 即将完成，准备展示结果...';
    case 'completed':
      return '✅ 所有图片生成完成！';
    case 'failed':
      return '❌ 生成失败，请重试';
    default:
      return '状态未知';
  }
} 