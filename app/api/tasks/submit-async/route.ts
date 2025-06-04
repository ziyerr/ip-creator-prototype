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

      console.log(`📷 原始图片信息: ${imageFile.name}, 大小: ${imageFile.size} bytes, 类型: ${imageFile.type}`);

      // 检查文件大小（4MB限制）
      if (imageFile.size > 4 * 1024 * 1024) {
        throw new Error('图片文件大小超过4MB限制');
      }

      // 确保是PNG格式（如果不是，需要转换）
      let finalImageBlob: Blob;
      if (imageFile.type === 'image/png') {
        finalImageBlob = new Blob([await imageFile.arrayBuffer()], { type: 'image/png' });
      } else {
        console.log(`🔄 转换图片格式从 ${imageFile.type} 到 image/png`);
        // 这里应该添加图片格式转换逻辑，暂时先用原格式
        finalImageBlob = new Blob([await imageFile.arrayBuffer()], { type: 'image/png' });
      }

      // 生成PNG文件名
      const pngFileName = imageFile.name.replace(/\.[^/.]+$/, '.png');

      apiFormData.append('image', finalImageBlob, pngFileName);
      apiFormData.append('prompt', prompt);
      apiFormData.append('n', '1');
      apiFormData.append('size', '1024x1024'); // 确保方形
      apiFormData.append('response_format', 'b64_json');
      apiFormData.append('model', 'gpt-image-1');

      console.log(`📤 图生图请求参数: prompt="${prompt}", size=1024x1024, format=b64_json`);
    } else {
      // 文生图模式 - 使用图片生成接口
      apiUrl = 'https://ismaque.org/v1/images/generations';

      apiFormData.append('prompt', prompt);
      apiFormData.append('n', '1');
      apiFormData.append('size', '1024x1024');
      apiFormData.append('response_format', 'b64_json');
      apiFormData.append('model', 'gpt-image-1');

      console.log(`📤 文生图请求参数: prompt="${prompt}", size=1024x1024, format=b64_json`);
    }

    // 更新进度并标记开始生成
    await taskManager.updateTask(taskId, { progress: 30 });
    await taskManager.markGenerationStarted(taskId);

    console.log(`🚀 开始调用麻雀API生成图片，任务ID: ${taskId}`);
    console.log(`📡 API URL: ${apiUrl}`);
    console.log(`🔑 API Key: ${apiKey ? `${apiKey.substring(0, 10)}...` : '未设置'}`);

    // 调用麻雀API
    const startTime = Date.now();
    console.log(`⏰ API调用开始时间: ${new Date().toISOString()}`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: apiFormData,
    });

    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`⏱️ API调用耗时: ${duration}ms`);
    console.log(`📥 API响应状态: ${response.status} ${response.statusText}`);

    await taskManager.updateTask(taskId, { progress: 80 });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API调用失败: ${response.status} ${response.statusText}`);
      console.error(`📄 错误详情: ${errorText}`);
      throw new Error(`API调用失败: ${response.status} - ${errorText}`);
    }

    console.log(`✅ API调用成功，开始解析响应数据...`);
    const result = await response.json();
    console.log(`📊 API返回数据结构:`, {
      hasData: !!result.data,
      dataLength: result.data?.length || 0,
      firstItemKeys: result.data?.[0] ? Object.keys(result.data[0]) : []
    });
    
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

    // 任务完成 - 标记完成时间
    await taskManager.updateTask(taskId, {
      status: 'completed',
      progress: 100,
      results: [imageUrl] // 单张图片的数组
    });
    await taskManager.markGenerationCompleted(taskId, true);

    console.log(`✅ 任务 ${taskId} 生成完成，图片URL: ${imageUrl.substring(0, 100)}...`);

  } catch (error) {
    console.error(`❌ 任务 ${taskId} 处理失败:`, error);

    // 任务失败 - 标记完成时间
    await taskManager.updateTask(taskId, {
      status: 'failed',
      error_message: error instanceof Error ? error.message : '未知错误'
    });
    await taskManager.markGenerationCompleted(taskId, false);
  }
}

// POST - 提交异步任务
export async function POST(req: NextRequest) {
  try {
    // 清理过期任务和检查超时任务
    await taskManager.cleanupExpiredTasks();
    await taskManager.checkTimeoutTasks();

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
    // 每次查询时都检查超时任务
    await taskManager.checkTimeoutTasks();

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
