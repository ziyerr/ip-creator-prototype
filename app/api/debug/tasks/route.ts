import { NextRequest, NextResponse } from 'next/server';
import { taskManager } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const taskId = searchParams.get('taskId');

    if (action === 'stats') {
      const stats = await taskManager.getTaskStats();
      return NextResponse.json({ success: true, stats });
    }

    if (action === 'list') {
      const tasks = await taskManager.getAllTasks(50);
      return NextResponse.json({ success: true, tasks });
    }

    if (action === 'detail' && taskId) {
      const task = await taskManager.getTask(taskId);
      return NextResponse.json({ success: true, task });
    }

    if (action === 'stuck') {
      // 查找卡住的任务（处理中超过10分钟）
      const allTasks = await taskManager.getAllTasks(100);
      const stuckTasks = allTasks.filter(task => {
        if (task.status !== 'processing') return false;
        const updatedTime = new Date(task.updated_at).getTime();
        const now = Date.now();
        return (now - updatedTime) > 10 * 60 * 1000; // 10分钟
      });
      
      return NextResponse.json({ 
        success: true, 
        stuckTasks,
        count: stuckTasks.length 
      });
    }

    return NextResponse.json({ 
      success: false, 
      error: '无效的action参数',
      availableActions: ['stats', 'list', 'detail', 'stuck']
    });

  } catch (error) {
    console.error('调试API错误:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误' 
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, taskId } = await req.json();

    if (action === 'reset' && taskId) {
      // 重置卡住的任务
      await taskManager.updateTask(taskId, {
        status: 'pending',
        progress: 0,
        error_message: undefined
      });
      
      return NextResponse.json({ 
        success: true, 
        message: `任务 ${taskId} 已重置` 
      });
    }

    if (action === 'fail' && taskId) {
      // 标记任务为失败
      await taskManager.updateTask(taskId, {
        status: 'failed',
        error_message: '手动标记为失败'
      });
      
      return NextResponse.json({ 
        success: true, 
        message: `任务 ${taskId} 已标记为失败` 
      });
    }

    if (action === 'cleanup') {
      // 清理过期任务
      const deletedCount = await taskManager.cleanupExpiredTasks();
      return NextResponse.json({ 
        success: true, 
        message: `清理了 ${deletedCount} 个过期任务` 
      });
    }

    return NextResponse.json({ 
      success: false, 
      error: '无效的action参数',
      availableActions: ['reset', 'fail', 'cleanup']
    });

  } catch (error) {
    console.error('调试API错误:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误' 
      },
      { status: 500 }
    );
  }
}
