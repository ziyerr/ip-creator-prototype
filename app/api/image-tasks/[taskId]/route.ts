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

// 引用主任务存储（与主API共享）
declare global {
  var imageTaskStorage: Map<string, ImageTask> | undefined;
}

// 获取任务存储实例
function getTaskStorage(): Map<string, ImageTask> {
  if (!global.imageTaskStorage) {
    global.imageTaskStorage = new Map();
  }
  return global.imageTaskStorage;
}

// 任务过期时间（30分钟）
const TASK_EXPIRY = 30 * 60 * 1000;

// 清理过期任务
function cleanupExpiredTasks(storage: Map<string, ImageTask>) {
  const now = Date.now();
  for (const [taskId, task] of storage.entries()) {
    if (now - task.createdAt > TASK_EXPIRY) {
      storage.delete(taskId);
      console.log(`🧹 清理过期任务: ${taskId}`);
    }
  }
}

// GET - 查询特定任务状态
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const params = await context.params;
    const { taskId } = params;

    if (!taskId) {
      return NextResponse.json({
        error: '无效的任务ID'
      }, { status: 400 });
    }

    const taskStorage = getTaskStorage();
    
    // 清理过期任务
    cleanupExpiredTasks(taskStorage);

    // 查找任务
    const task = taskStorage.get(taskId);
    
    if (!task) {
      return NextResponse.json({
        error: '任务不存在或已过期',
        taskId
      }, { status: 404 });
    }

    // 计算任务运行时间
    const runningTime = Date.now() - task.createdAt;
    const runningMinutes = Math.floor(runningTime / 60000);
    const runningSeconds = Math.floor((runningTime % 60000) / 1000);

    // 返回详细的任务状态
    return NextResponse.json({
      taskId: task.id,
      status: task.status,
      progress: task.progress,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      runningTime: {
        total: runningTime,
        formatted: `${runningMinutes}分${runningSeconds}秒`
      },
      results: task.results || [],
      error: task.error,
      message: getStatusMessage(task.status, task.progress),
      metadata: task.metadata,
      // 添加轮询建议
      polling: {
        recommended: task.status === 'pending' || task.status === 'processing',
        interval: 10000, // 10秒
        nextCheck: task.status === 'completed' || task.status === 'failed' ? null : Date.now() + 10000
      }
    });

  } catch (error) {
    console.error('❌ 查询任务状态失败:', error);
    return NextResponse.json({
      error: '服务器内部错误',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// DELETE - 删除任务
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const params = await context.params;
    const { taskId } = params;

    if (!taskId) {
      return NextResponse.json({
        error: '无效的任务ID'
      }, { status: 400 });
    }

    const taskStorage = getTaskStorage();
    
    // 查找并删除任务
    const task = taskStorage.get(taskId);
    
    if (!task) {
      return NextResponse.json({
        error: '任务不存在',
        taskId
      }, { status: 404 });
    }

    taskStorage.delete(taskId);
    
    console.log(`🗑️ 任务已删除: ${taskId}`);

    return NextResponse.json({
      message: '任务已删除',
      taskId
    });

  } catch (error) {
    console.error('❌ 删除任务失败:', error);
    return NextResponse.json({
      error: '服务器内部错误',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
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
