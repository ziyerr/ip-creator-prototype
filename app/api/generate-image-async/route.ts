import { NextRequest } from 'next/server';

// 异步图片生成API - 使用标准Web API确保边缘兼容性
// 模拟KV存储的内存Map（生产环境建议使用Vercel KV或Redis）
const taskStorage = new Map<string, {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  results: string[];
  error?: string;
  createdAt: number;
}>();

// 清理过期任务（30分钟后）
const TASK_EXPIRY = 30 * 60 * 1000; // 30分钟

export async function POST(req: NextRequest) {
  try {
    console.log('=== 异步图片生成API处理 ===');
    
    // 解析请求参数
    const requestFormData = await req.formData();
    const action = requestFormData.get('action') as string;
    
    // 查询任务状态
    if (action === 'query') {
      const taskId = requestFormData.get('taskId') as string;
      
      if (!taskId) {
        return new Response(JSON.stringify({ 
          error: '缺少taskId参数' 
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 清理过期任务
      cleanExpiredTasks();

      const task = taskStorage.get(taskId);
      if (!task) {
        return new Response(JSON.stringify({ 
          error: '任务不存在或已过期',
          taskId 
        }), { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

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

    // 创建新任务
    const prompt = requestFormData.get('prompt') as string;
    const imageFile = requestFormData.get('image') as File;

    if (!prompt || !imageFile) {
      return new Response(JSON.stringify({ 
        error: '缺少必要参数：prompt或image' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 生成任务ID
    const taskId = `async_task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 初始化任务
    taskStorage.set(taskId, {
      status: 'pending',
      progress: 0,
      results: [],
      createdAt: Date.now()
    });

    console.log('创建异步任务:', taskId);

    // 立即返回任务ID
    const response = new Response(JSON.stringify({
      taskId,
      status: 'pending',
      message: '异步任务已创建，正在排队处理...',
      estimatedTime: '30-60秒'
    }), {
      status: 202, // 202 Accepted
      headers: { 'Content-Type': 'application/json' }
    });

    // 在后台异步处理任务
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
    console.error('异步API处理错误:', error);
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
    console.log(`开始处理异步任务 ${taskId}...`);
    
    // 更新状态
    task.status = 'processing';
    task.progress = 20;

    // API配置 - 从环境变量读取
    const apiUrl = process.env.MAQUE_API_URL || 'https://ismaque.org/v1/images/edits';
    const apiKey = process.env.MAQUE_API_KEY;

    if (!apiKey) {
      console.error('❌ 缺少 MAQUE_API_KEY 环境变量');
      task.status = 'failed';
      task.error = '服务器配置错误：缺少API密钥';
      return;
    }
    
    // 处理提示词
    let finalPrompt = prompt.replace('[REF_IMAGE]', 'the uploaded reference image');
    finalPrompt += `. CRITICAL: Generate a character based on the uploaded reference image. Maintain the SAME SUBJECT TYPE (if it's an animal, generate an animal; if it's a person, generate a person). Preserve the key characteristics while applying the artistic style.`;
    
    task.progress = 40;

    // 准备图片数据 - 使用标准Web API替代Buffer
    const imageArrayBuffer = await imageFile.arrayBuffer();
    
    // 生成3张图片（异步模式可以支持更长时间）
    const promises = [];
    for (let i = 0; i < 3; i++) {
      const generateSingleImage = async () => {
        const apiFormData = new FormData();
        apiFormData.append('image', new Blob([imageArrayBuffer]), imageFile.name);
        apiFormData.append('mask', new Blob([imageArrayBuffer]), imageFile.name);
        apiFormData.append('prompt', finalPrompt);
        apiFormData.append('n', '1');
        apiFormData.append('size', '1024x1024');
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
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: { message: errorText } };
          }
          // 直接返回JSON，不抛出异常
          task.status = 'failed';
          task.error = errorData.error?.message || errorText;
          return;
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
          console.error(`第${i + 1}张图片未找到URL，API响应:`, data);
          throw new Error(`第${i + 1}张图片未找到有效URL`);
        }

        console.log(`第${i + 1}张图片生成成功:`, imageUrl.substring(0, 100) + '...');
        return imageUrl;
      };

      promises.push(generateSingleImage());
    }

    task.progress = 60;

    // 等待所有图片生成完成
    console.log('等待3张图片生成完成...');
    const results = await Promise.all(promises);
    
    task.progress = 90;

    // 验证结果
    const validResults = results.filter(url => typeof url === 'string' && !!url);
    if (validResults.length === 0) {
      throw new Error('所有图片生成均失败');
    }

    // 完成任务
    task.status = 'completed';
    task.progress = 100;
    task.results = validResults;
    
    console.log(`异步任务 ${taskId} 完成，生成了 ${validResults.length} 张图片`);

  } catch (error) {
    console.error(`异步任务 ${taskId} 处理失败:`, error);
    task.status = 'failed';
    task.error = error instanceof Error ? error.message : String(error);
  }
}

// 清理过期任务
function cleanExpiredTasks() {
  const now = Date.now();
  for (const [taskId, task] of taskStorage.entries()) {
    if (now - task.createdAt > TASK_EXPIRY) {
      taskStorage.delete(taskId);
      console.log('清理过期任务:', taskId);
    }
  }
}

// 获取状态消息
function getStatusMessage(status: string, progress: number): string {
  switch (status) {
    case 'pending':
      return '⏳ 任务已创建，等待开始处理...';
    case 'processing':
      if (progress < 40) return '🔍 正在分析上传图片和准备生成参数...';
      if (progress < 80) return '🎨 AI正在生成3张专属IP形象...';
      if (progress < 95) return '✨ 正在优化和验证生成结果...';
      return '🎉 即将完成，准备展示结果...';
    case 'completed':
      return '✅ 所有图片生成完成！';
    case 'failed':
      return '❌ 生成失败，请重试';
    default:
      return '状态未知';
  }
} 