import { NextRequest, NextResponse } from 'next/server';
import { TaskManager } from '@/lib/task-manager';

// 🔍 任务状态查询API - 轮询模式第二步
// 根据任务ID查询任务状态和结果

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    
    console.log(`🔍 查询任务状态: ${taskId}`);
    
    // 验证任务ID格式
    if (!taskId || !taskId.startsWith('task_')) {
      return NextResponse.json(
        { error: '无效的任务ID格式' },
        { status: 400 }
      );
    }
    
    // 获取任务信息（异步）
    const task = await TaskManager.getTask(taskId);
    
    if (!task) {
      return NextResponse.json(
        { 
          error: '任务不存在或已过期',
          taskId,
          suggestion: '任务可能已过期（30分钟），请重新提交任务'
        },
        { status: 404 }
      );
    }
    
    // 构建响应数据
    const response = {
      taskId: task.id,
      status: task.status,
      progress: task.progress,
      message: getStatusMessage(task.status, task.progress),
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      estimatedTime: task.estimatedTime,
      ...(task.status === 'completed' && {
        results: task.results,
        totalImages: task.results.length
      }),
      ...(task.status === 'failed' && {
        error: task.error
      }),
      // 轮询建议
      polling: {
        interval: task.status === 'completed' || task.status === 'failed' ? 0 : 10,
        shouldContinue: task.status === 'pending' || task.status === 'processing',
        nextPollTime: task.status === 'completed' || task.status === 'failed' 
          ? null 
          : Date.now() + 10000
      }
    };
    
    console.log(`📊 任务状态: ${taskId} -> ${task.status} (${task.progress}%)`);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ 查询任务状态失败:', error);
    
    return NextResponse.json(
      {
        error: '服务器内部错误',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// 获取状态描述消息
function getStatusMessage(status: string, progress: number): string {
  switch (status) {
    case 'pending':
      return '⏳ 任务已创建，等待开始处理...';
    case 'processing':
      if (progress < 30) return '🔍 正在分析图片和准备生成参数...';
      if (progress < 50) return '🎨 AI正在生成图像，请稍候...';
      if (progress < 80) return '✨ 正在优化和处理生成结果...';
      return '🎉 即将完成，准备返回结果...';
    case 'completed':
      return '✅ 图像生成完成！';
    case 'failed':
      return '❌ 生成失败，请重试';
    default:
      return '状态未知';
  }
}

// 支持批量查询（可选功能）
export async function POST(req: NextRequest) {
  try {
    const { taskIds } = await req.json();
    
    if (!Array.isArray(taskIds)) {
      return NextResponse.json(
        { error: '请提供任务ID数组' },
        { status: 400 }
      );
    }
    
    if (taskIds.length > 10) {
      return NextResponse.json(
        { error: '一次最多查询10个任务' },
        { status: 400 }
      );
    }
    
    const results = taskIds.map(taskId => {
      const task = TaskManager.getTask(taskId);
      if (!task) {
        return {
          taskId,
          error: '任务不存在或已过期'
        };
      }
      
      return {
        taskId: task.id,
        status: task.status,
        progress: task.progress,
        message: getStatusMessage(task.status, task.progress),
        ...(task.status === 'completed' && {
          results: task.results
        }),
        ...(task.status === 'failed' && {
          error: task.error
        })
      };
    });
    
    return NextResponse.json({
      success: true,
      tasks: results,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('❌ 批量查询失败:', error);
    
    return NextResponse.json(
      {
        error: '服务器内部错误',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
