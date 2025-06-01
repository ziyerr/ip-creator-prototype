import { NextRequest, NextResponse } from 'next/server';

// 🔍 队列任务状态查询API
// 支持轮询查询任务处理进度和结果

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ 
        error: '缺少taskId参数' 
      }, { status: 400 });
    }

    console.log(`📊 查询任务状态: ${taskId}`);

    // 导入队列管理器
    const { queueManager } = await import('@/lib/queue-system');
    
    // 查询任务状态
    const taskStatus = await queueManager.getTaskStatus(taskId);
    
    if (!taskStatus) {
      return NextResponse.json({ 
        error: '任务不存在或已过期',
        taskId,
      }, { status: 404 });
    }

    // 计算处理进度描述
    let statusMessage = '';
    switch (taskStatus.status) {
      case 'waiting':
        statusMessage = '⏳ 任务排队中，等待处理...';
        break;
      case 'active':
        if (taskStatus.progress < 20) {
          statusMessage = '🔍 正在分析上传图片...';
        } else if (taskStatus.progress < 40) {
          statusMessage = '🎨 开始生成第一张图片...';
        } else if (taskStatus.progress < 70) {
          statusMessage = '🖼️ 并行生成3张独特图片中...';
        } else {
          statusMessage = '✨ 即将完成，处理最终结果...';
        }
        break;
      case 'completed':
        statusMessage = `🎉 生成完成！共${taskStatus.results?.length || 0}张图片`;
        break;
      case 'failed':
        statusMessage = `❌ 生成失败: ${taskStatus.error || '未知错误'}`;
        break;
      case 'delayed':
        statusMessage = '⏸️ 任务延迟中，稍后重试...';
        break;
      default:
        statusMessage = '状态未知';
    }

    // 返回详细状态信息
    return NextResponse.json({
      success: true,
      taskId,
      status: taskStatus.status,
      progress: taskStatus.progress,
      message: statusMessage,
      results: taskStatus.results || [],
      error: taskStatus.error,
      createdAt: taskStatus.createdAt,
      updatedAt: taskStatus.updatedAt,
      processingTime: taskStatus.processingTime,
      
      // 额外的查询信息
      isCompleted: taskStatus.status === 'completed',
      isFailed: taskStatus.status === 'failed',
      isProcessing: taskStatus.status === 'active' || taskStatus.status === 'waiting',
      
      // 下一次轮询建议
      nextPollDelay: taskStatus.status === 'completed' || taskStatus.status === 'failed' 
        ? null 
        : 3000, // 3秒后再次查询
    });

  } catch (error) {
    console.error('❌ 查询任务状态失败:', error);
    return NextResponse.json({ 
      error: '查询任务状态失败',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

// 📊 批量查询队列统计信息
export async function POST(req: NextRequest) {
  try {
    console.log('📈 查询队列统计信息');

    // 导入队列管理器
    const { queueManager } = await import('@/lib/queue-system');
    
    // 获取队列统计
    const stats = await queueManager.getQueueStats();

    return NextResponse.json({
      success: true,
      stats,
      message: '队列统计信息获取成功',
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('❌ 获取队列统计失败:', error);
    return NextResponse.json({ 
      error: '获取队列统计失败',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
} 