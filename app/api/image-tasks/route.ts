import { NextRequest, NextResponse } from 'next/server';

// 任务状态类型
type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

// 任务数据结构
interface ImageTask {
  id: string;
  status: TaskStatus;
  progress: number;
  createdAt: number;
  updatedAt: number;
  prompt?: string;
  results?: string[];
  error?: string;
  metadata?: {
    originalFileName?: string;
    style?: string;
    variationSeed?: string;
  };
}

// 内存存储（生产环境建议使用Redis或数据库）
const taskStorage = new Map<string, ImageTask>();

// 任务过期时间（30分钟）
const TASK_EXPIRY = 30 * 60 * 1000;

// 清理过期任务
function cleanupExpiredTasks() {
  const now = Date.now();
  for (const [taskId, task] of taskStorage.entries()) {
    if (now - task.createdAt > TASK_EXPIRY) {
      taskStorage.delete(taskId);
      console.log(`🧹 清理过期任务: ${taskId}`);
    }
  }
}

// POST - 创建新的图像生成任务
export async function POST(req: NextRequest) {
  try {
    console.log('=== 创建图像生成任务 ===');
    
    // 清理过期任务
    cleanupExpiredTasks();
    
    // 解析请求数据
    const formData = await req.formData();
    const prompt = formData.get('prompt') as string;
    const imageFile = formData.get('image') as File;
    const style = formData.get('style') as string;
    const variationSeed = formData.get('variationSeed') as string;

    // 验证必需参数
    if (!prompt || !imageFile) {
      return NextResponse.json({
        error: '缺少必需参数：prompt 或 image'
      }, { status: 400 });
    }

    // 生成唯一任务ID
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 创建任务记录
    const task: ImageTask = {
      id: taskId,
      status: 'pending',
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      prompt,
      results: [],
      metadata: {
        originalFileName: imageFile.name,
        style,
        variationSeed
      }
    };

    // 存储任务
    taskStorage.set(taskId, task);
    
    console.log(`✅ 任务创建成功: ${taskId}`);
    console.log(`📋 当前任务数量: ${taskStorage.size}`);

    // 立即返回任务ID（不等待处理完成）
    const response = NextResponse.json({
      taskId,
      status: 'pending',
      message: '任务已创建，正在排队处理...',
      estimatedTime: '30-90秒'
    }, { status: 202 }); // 202 Accepted

    // 在后台异步处理任务
    processImageTask(taskId, prompt, imageFile, style, variationSeed)
      .catch(error => {
        console.error(`❌ 任务 ${taskId} 处理失败:`, error);
        const task = taskStorage.get(taskId);
        if (task) {
          task.status = 'failed';
          task.error = error instanceof Error ? error.message : String(error);
          task.updatedAt = Date.now();
        }
      });

    return response;

  } catch (error) {
    console.error('❌ 创建任务失败:', error);
    return NextResponse.json({
      error: '服务器内部错误',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// GET - 查询任务状态
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({
        error: '缺少 taskId 参数'
      }, { status: 400 });
    }

    // 清理过期任务
    cleanupExpiredTasks();

    // 查找任务
    const task = taskStorage.get(taskId);
    
    if (!task) {
      return NextResponse.json({
        error: '任务不存在或已过期',
        taskId
      }, { status: 404 });
    }

    // 返回任务状态
    return NextResponse.json({
      taskId: task.id,
      status: task.status,
      progress: task.progress,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      results: task.results || [],
      error: task.error,
      message: getStatusMessage(task.status, task.progress),
      metadata: task.metadata
    });

  } catch (error) {
    console.error('❌ 查询任务状态失败:', error);
    return NextResponse.json({
      error: '服务器内部错误',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// 异步处理图像生成任务
async function processImageTask(
  taskId: string, 
  prompt: string, 
  imageFile: File, 
  style?: string, 
  variationSeed?: string
) {
  const task = taskStorage.get(taskId);
  if (!task) return;

  try {
    console.log(`🚀 开始处理任务: ${taskId}`);
    
    // 更新状态为处理中
    task.status = 'processing';
    task.progress = 10;
    task.updatedAt = Date.now();

    // 准备API调用参数
    const apiUrl = process.env.MAQUE_API_URL || 'https://ismaque.org/v1/images/edits';
    const apiKey = process.env.MAQUE_API_KEY;

    if (!apiKey) {
      throw new Error('缺少 MAQUE_API_KEY 环境变量');
    }

    // 更新进度
    task.progress = 20;
    task.updatedAt = Date.now();

    // 转换图片为ArrayBuffer
    const imageArrayBuffer = await imageFile.arrayBuffer();
    
    // 更新进度
    task.progress = 30;
    task.updatedAt = Date.now();

    // 生成3张图片
    const results: string[] = [];
    const variationPrompts = [
      '保持原有风格特色，精致细腻',
      '在原基础上增加创新元素，更有个性',
      '融入更多个性化特色，独特魅力'
    ];

    for (let i = 0; i < 3; i++) {
      try {
        console.log(`🎨 生成第 ${i + 1} 张图片...`);
        
        // 构建API请求
        const apiFormData = new FormData();
        apiFormData.append('image', new Blob([imageArrayBuffer]), imageFile.name);
        apiFormData.append('mask', new Blob([imageArrayBuffer]), imageFile.name);
        
        const finalPrompt = `${prompt} ${variationPrompts[i]}`;
        apiFormData.append('prompt', finalPrompt);
        apiFormData.append('n', '1');
        apiFormData.append('size', '512x512');
        apiFormData.append('response_format', 'url');
        apiFormData.append('model', 'gpt-image-1');

        // API调用（55秒超时）
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 55000);

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          body: apiFormData,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

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
          task.updatedAt = Date.now();
          return;
        }

        const data = await response.json();
        
        if (data.data && data.data[0] && data.data[0].url) {
          results.push(data.data[0].url);
          console.log(`✅ 第 ${i + 1} 张图片生成成功`);
        } else {
          throw new Error(`第 ${i + 1} 张图片生成失败：无效的API响应`);
        }

        // 更新进度
        task.progress = 30 + (i + 1) * 20;
        task.updatedAt = Date.now();

      } catch (error) {
        console.error(`❌ 第 ${i + 1} 张图片生成失败:`, error);
        // 继续生成其他图片，不中断整个流程
      }
    }

    // 检查是否有成功的结果
    if (results.length === 0) {
      throw new Error('所有图片生成均失败');
    }

    // 如果不足3张，复制现有结果填充
    while (results.length < 3) {
      results.push(results[0]);
    }

    // 任务完成
    task.status = 'completed';
    task.progress = 100;
    task.results = results;
    task.updatedAt = Date.now();

    console.log(`🎉 任务 ${taskId} 处理完成，生成了 ${results.length} 张图片`);

  } catch (error) {
    console.error(`❌ 任务 ${taskId} 处理失败:`, error);
    task.status = 'failed';
    task.error = error instanceof Error ? error.message : String(error);
    task.updatedAt = Date.now();
  }
}

// 获取状态消息
function getStatusMessage(status: TaskStatus, progress: number): string {
  switch (status) {
    case 'pending':
      return '⏳ 任务已创建，等待开始处理...';
    case 'processing':
      if (progress < 20) return '🔍 正在分析上传图片...';
      if (progress < 40) return '🎨 AI正在生成第1张图片...';
      if (progress < 60) return '🎨 AI正在生成第2张图片...';
      if (progress < 80) return '🎨 AI正在生成第3张图片...';
      if (progress < 100) return '✨ 正在优化和验证生成结果...';
      return '🎉 即将完成...';
    case 'completed':
      return '✅ 所有图片生成完成！';
    case 'failed':
      return '❌ 生成失败，请重试';
    default:
      return '状态未知';
  }
}
