import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

// 内存存储任务状态（生产环境建议使用Redis）
const tasks = new Map<string, {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  prompt?: string;
  imageFile?: string;
  results?: string[];
  error?: string;
  createdAt: number;
}>();

// 清理过期任务（24小时）
function cleanupExpiredTasks() {
  const now = Date.now();
  const expireTime = 24 * 60 * 60 * 1000; // 24小时
  
  for (const [taskId, task] of tasks.entries()) {
    if (now - task.createdAt > expireTime) {
      tasks.delete(taskId);
    }
  }
}

// 异步处理图片生成
async function processImageGeneration(taskId: string, prompt: string, imageFile?: File) {
  try {
    // 更新状态为处理中
    const task = tasks.get(taskId);
    if (!task) return;
    
    task.status = 'processing';
    task.progress = 10;
    tasks.set(taskId, task);

    const apiKey = process.env.MAQUE_API_KEY;
    const apiUrl = process.env.MAQUE_API_URL || 'https://ismaque.org/v1/images/edits';

    if (!apiKey) {
      throw new Error('API密钥未配置');
    }

    // 准备API请求
    const apiFormData = new FormData();
    
    if (imageFile) {
      // 图生图模式
      const imageBlob = new Blob([await imageFile.arrayBuffer()], { type: imageFile.type });
      apiFormData.append('image', imageBlob, imageFile.name);
      apiFormData.append('mask', imageBlob, imageFile.name);
    }
    
    apiFormData.append('prompt', prompt);
    apiFormData.append('n', '3');
    apiFormData.append('size', '1024x1024');
    apiFormData.append('response_format', 'b64_json');
    apiFormData.append('model', 'gpt-image-1');

    // 更新进度
    task.progress = 30;
    tasks.set(taskId, task);

    // 调用麻雀API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: apiFormData,
    });

    task.progress = 80;
    tasks.set(taskId, task);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API调用失败: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    // 提取图片数据并转换为data URL
    const imageUrls = result.data?.map((item: any) => {
      if (item.b64_json) {
        return `data:image/png;base64,${item.b64_json}`;
      } else if (item.url) {
        return item.url;
      } else {
        throw new Error(`图片数据格式错误`);
      }
    }) || [];

    if (imageUrls.length === 0) {
      throw new Error('API返回的数据中没有图片数据');
    }

    // 任务完成
    task.status = 'completed';
    task.progress = 100;
    task.results = imageUrls;
    tasks.set(taskId, task);

  } catch (error) {
    console.error(`任务 ${taskId} 处理失败:`, error);
    const task = tasks.get(taskId);
    if (task) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : '未知错误';
      tasks.set(taskId, task);
    }
  }
}

// POST - 提交异步任务
export async function POST(req: NextRequest) {
  try {
    // 清理过期任务
    cleanupExpiredTasks();

    const contentType = req.headers.get('content-type') || '';
    let prompt = '';
    let imageFile: File | undefined;

    if (contentType.includes('multipart/form-data')) {
      // FormData格式
      const formData = await req.formData();
      prompt = formData.get('prompt') as string;
      const file = formData.get('image') as File;
      if (file && file.size > 0) {
        imageFile = file;
      }
    } else {
      // JSON格式
      const body = await req.json();
      prompt = body.prompt;
    }

    if (!prompt) {
      return NextResponse.json(
        { error: '请提供图片描述' },
        { status: 400 }
      );
    }

    // 创建新任务
    const taskId = randomUUID();
    const task = {
      id: taskId,
      status: 'pending' as const,
      progress: 0,
      prompt,
      imageFile: imageFile?.name,
      createdAt: Date.now()
    };

    tasks.set(taskId, task);

    // 异步开始处理（不等待完成）
    processImageGeneration(taskId, prompt, imageFile).catch(console.error);

    return NextResponse.json({
      success: true,
      taskId,
      message: '任务已提交，请使用taskId查询进度'
    });

  } catch (error) {
    console.error('提交任务失败:', error);
    return NextResponse.json(
      { 
        error: '提交任务失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

// GET - 查询任务状态
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { error: '请提供taskId' },
        { status: 400 }
      );
    }

    const task = tasks.get(taskId);
    if (!task) {
      return NextResponse.json(
        { error: '任务不存在或已过期' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      taskId: task.id,
      status: task.status,
      progress: task.progress,
      ...(task.status === 'completed' && {
        results: task.results
      }),
      ...(task.status === 'failed' && {
        error: task.error
      })
    });

  } catch (error) {
    console.error('查询任务状态失败:', error);
    return NextResponse.json(
      { error: '查询失败' },
      { status: 500 }
    );
  }
}
