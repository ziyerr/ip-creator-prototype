import { NextRequest } from 'next/server';

// 简单的任务存储（生产环境可升级为Vercel KV或数据库）
const taskStorage = new Map<string, {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  results: string[];
  error?: string;
  createdAt: number;
  lastUpdated: number;
}>();

// 使用更intelligent的清理策略
const cleanupTasks = () => {
  const now = Date.now();
  const expiredTasks = [];
  
  for (const [taskId, task] of taskStorage.entries()) {
    // 30分钟后过期
    if (now - task.lastUpdated > 30 * 60 * 1000) {
      expiredTasks.push(taskId);
    }
  }
  
  expiredTasks.forEach(taskId => {
    console.log(`清理过期任务: ${taskId}`);
    taskStorage.delete(taskId);
  });
};

// 每5分钟清理一次过期任务
setInterval(cleanupTasks, 5 * 60 * 1000);

// 生成唯一任务ID
const generateTaskId = () => `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'submit';
    
    if (action === 'query') {
      // 查询任务状态
      const taskId = url.searchParams.get('taskId');
      
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
      const statusMessage = getStatusMessage(task.status, task.progress);
      
      return new Response(JSON.stringify({
        taskId,
        status: task.status,
        progress: task.progress,
        results: task.results,
        error: task.error,
        message: statusMessage,
        lastUpdated: task.lastUpdated
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 提交新任务
    const formData = await req.formData();
    const prompt = formData.get('prompt') as string;
    const imageFile = formData.get('image') as File;
    
    if (!prompt || !imageFile) {
      return new Response(JSON.stringify({
        error: '缺少必要参数：prompt或image'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 创建新任务
    const taskId = generateTaskId();
    const now = Date.now();
    
    taskStorage.set(taskId, {
      status: 'pending',
      progress: 0,
      results: [],
      createdAt: now,
      lastUpdated: now
    });
    
    console.log(`创建新任务: ${taskId}`);
    
    // 异步处理图片生成
    processImageGeneration(taskId, prompt, imageFile).catch(error => {
      console.error(`任务 ${taskId} 处理失败:`, error);
      const task = taskStorage.get(taskId);
      if (task) {
        task.status = 'failed';
        task.error = error.message;
        task.lastUpdated = Date.now();
      }
    });
    
    // 立即返回任务ID
    return new Response(JSON.stringify({
      taskId,
      status: 'pending',
      message: '任务已创建，正在准备生成3张专属IP形象...',
      estimatedTime: '60-90秒',
      pollInterval: 3000 // 建议3秒轮询一次
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('异步生成API错误:', error);
    return new Response(JSON.stringify({
      error: '服务器内部错误',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 异步处理图片生成
async function processImageGeneration(taskId: string, prompt: string, imageFile: File) {
  const task = taskStorage.get(taskId);
  if (!task) return;
  
  try {
    // 更新状态为处理中
    task.status = 'processing';
    task.progress = 10;
    task.lastUpdated = Date.now();
    
    console.log(`开始处理任务 ${taskId}`);
    
    // API配置
    const apiUrl = 'https://ismaque.org/v1/images/edits';
    const apiKey = process.env.SPARROW_API_KEY || 'sk-1eEdZF3JuFocE3eyrFBnmE1IgMFwbGcwPfMciRMdxF1Zl8Ke';
    
    // 处理提示词
    let finalPrompt = prompt.replace('[REF_IMAGE]', 'the uploaded reference image');
    finalPrompt += `. CRITICAL: Generate a character based on the uploaded reference image. Maintain the SAME SUBJECT TYPE (if it's an animal, generate an animal; if it's a person, generate a person). Preserve the key characteristics while applying the artistic style.`;
    
    // 准备图片数据
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    
    // 并行生成3张图片
    const generatePromises = [];
    
    for (let i = 0; i < 3; i++) {
      const apiFormData = new FormData();
      apiFormData.append('image', new Blob([imageBuffer]), imageFile.name);
      apiFormData.append('mask', new Blob([imageBuffer]), imageFile.name);
      apiFormData.append('prompt', finalPrompt);
      apiFormData.append('n', '1');
      apiFormData.append('size', '1024x1024');
      apiFormData.append('response_format', 'url');
      apiFormData.append('model', 'gpt-image-1');
      
      const generateSingle = async () => {
        console.log(`任务 ${taskId} - 开始生成第${i + 1}张图片`);
        
        // 更新进度
        const currentTask = taskStorage.get(taskId);
        if (currentTask) {
          currentTask.progress = 30 + (i * 20);
          currentTask.lastUpdated = Date.now();
        }
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          body: apiFormData,
        });
        
        if (!response.ok) {
          throw new Error(`第${i + 1}张图片生成失败: ${response.status} ${response.statusText}`);
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
          throw new Error(`第${i + 1}张图片未找到有效URL`);
        }
        
        console.log(`任务 ${taskId} - 第${i + 1}张图片生成成功`);
        return imageUrl;
      };
      
      generatePromises.push(generateSingle());
    }
    
    // 等待所有图片生成完成
    const imageUrls = await Promise.all(generatePromises);
    
    // 任务完成
    task.status = 'completed';
    task.progress = 100;
    task.results = imageUrls;
    task.lastUpdated = Date.now();
    
    console.log(`任务 ${taskId} 完成，生成了${imageUrls.length}张图片`);
    
  } catch (error) {
    console.error(`任务 ${taskId} 失败:`, error);
    task.status = 'failed';
    task.error = error instanceof Error ? error.message : String(error);
    task.lastUpdated = Date.now();
  }
}

// 获取状态消息
function getStatusMessage(status: string, progress: number): string {
  switch (status) {
    case 'pending':
      return '⏳ 任务已创建，等待开始处理...';
    case 'processing':
      if (progress < 30) {
        return '🔍 正在分析上传图片和准备生成参数...';
      } else if (progress < 90) {
        return '🎨 AI正在并行生成3张专属IP形象...';
      } else {
        return '✨ 正在优化和验证生成结果...';
      }
    case 'completed':
      return '✅ 所有图片生成完成！';
    case 'failed':
      return '❌ 生成过程中发生错误';
    default:
      return '🤔 未知状态';
  }
} 