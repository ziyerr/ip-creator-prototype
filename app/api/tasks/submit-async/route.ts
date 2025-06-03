import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { taskManager } from '@/lib/supabase';

// 异步处理图片生成
async function processImageGeneration(taskId: string, prompt: string, imageFile?: File) {
  try {
    // 更新状态为处理中
    await taskManager.updateTask(taskId, {
      status: 'processing',
      progress: 10
    });

    const apiKey = process.env.MAQUE_API_KEY;

    if (!apiKey) {
      throw new Error('API密钥未配置');
    }

    // 根据是否有图片文件选择不同的API端点和参数
    let apiUrl: string;
    const apiFormData = new FormData();

    if (imageFile) {
      // 图生图模式 - 使用图片编辑接口
      apiUrl = 'https://ismaque.org/v1/images/edits';

      const imageBlob = new Blob([await imageFile.arrayBuffer()], { type: imageFile.type });
      apiFormData.append('image', imageBlob, imageFile.name);
      // 注意：图片编辑接口不需要mask参数，除非要指定编辑区域
      apiFormData.append('prompt', prompt);
      apiFormData.append('n', '1');
      apiFormData.append('size', '1024x1024');
      apiFormData.append('response_format', 'b64_json');
      apiFormData.append('model', 'gpt-image-1');
    } else {
      // 文生图模式 - 使用图片生成接口
      apiUrl = 'https://ismaque.org/v1/images/generations';

      apiFormData.append('prompt', prompt);
      apiFormData.append('n', '1');
      apiFormData.append('size', '1024x1024');
      apiFormData.append('response_format', 'b64_json');
      apiFormData.append('model', 'gpt-image-1');
    }

    // 更新进度
    await taskManager.updateTask(taskId, { progress: 30 });

    // 调用麻雀API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: apiFormData,
    });

    await taskManager.updateTask(taskId, { progress: 80 });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API调用失败: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    // 提取图片数据并转换为data URL（单张图片）
    const imageData = result.data?.[0];
    if (!imageData) {
      throw new Error('API返回的数据中没有图片数据');
    }

    let imageUrl: string;
    if (imageData.b64_json) {
      imageUrl = `data:image/png;base64,${imageData.b64_json}`;
    } else if (imageData.url) {
      imageUrl = imageData.url;
    } else {
      throw new Error('图片数据格式错误');
    }

    // 任务完成
    await taskManager.updateTask(taskId, {
      status: 'completed',
      progress: 100,
      results: [imageUrl] // 单张图片的数组
    });

  } catch (error) {
    console.error(`任务 ${taskId} 处理失败:`, error);
    await taskManager.updateTask(taskId, {
      status: 'failed',
      error_message: error instanceof Error ? error.message : '未知错误'
    });
  }
}

// POST - 提交异步任务
export async function POST(req: NextRequest) {
  try {
    // 清理过期任务
    await taskManager.cleanupExpiredTasks();

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
    await taskManager.createTask({
      task_id: taskId,
      prompt,
      image_file_name: imageFile?.name
    });

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

    const task = await taskManager.getTask(taskId);
    if (!task) {
      return NextResponse.json(
        { error: '任务不存在或已过期' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      taskId: task.task_id,
      status: task.status,
      progress: task.progress,
      ...(task.status === 'completed' && {
        results: task.results
      }),
      ...(task.status === 'failed' && {
        error: task.error_message
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
