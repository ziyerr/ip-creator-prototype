import { NextRequest, NextResponse } from 'next/server';
import { taskManager } from '@/lib/supabase';

// POST - 手动检查超时任务
export async function POST(req: NextRequest) {
  try {
    console.log('🔍 手动检查超时任务...');
    
    const timeoutCount = await taskManager.checkTimeoutTasks();
    
    return NextResponse.json({
      success: true,
      timeoutCount,
      message: timeoutCount > 0 ? 
        `标记了 ${timeoutCount} 个超时任务` : 
        '没有发现超时任务'
    });

  } catch (error) {
    console.error('检查超时任务失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '检查超时任务失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

// GET - 获取超时统计
export async function GET(req: NextRequest) {
  try {
    // 先检查超时任务
    const timeoutCount = await taskManager.checkTimeoutTasks();
    
    // 获取统计信息
    const [timeoutStats, taskStats] = await Promise.all([
      taskManager.getTimeoutStats(),
      taskManager.getTaskStats()
    ]);

    return NextResponse.json({
      success: true,
      timeoutCount,
      timeoutStats,
      taskStats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('获取超时统计失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '获取超时统计失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}
