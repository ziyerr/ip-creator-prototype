import { NextResponse } from 'next/server';
import { TaskManager } from '@/lib/task-manager';

// 🔍 调试API - 查看所有任务状态
export async function GET() {
  try {
    // 先清理过期任务
    const cleanedCount = await TaskManager.cleanupExpiredTasks();
    const allTasks = await TaskManager.getAllTasks();
    
    const response = {
      success: true,
      timestamp: Date.now(),
      cleanedTasks: cleanedCount,
      totalTasks: allTasks.length,
      tasks: allTasks.map(task => ({
        id: task.id,
        status: task.status,
        progress: task.progress,
        prompt: task.prompt.substring(0, 100) + (task.prompt.length > 100 ? '...' : ''),
        hasImageData: !!task.imageData,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        age: Math.floor((Date.now() - task.createdAt) / 1000) + '秒',
        results: task.results?.length || 0,
        error: task.error
      })),
      serverInfo: {
        nodeEnv: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
        uptime: process.uptime() + '秒'
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ 调试API失败:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: '调试API失败',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// 清理所有任务（调试用）
export async function DELETE() {
  try {
    const allTasks = await TaskManager.getAllTasks();
    const taskCount = allTasks.length;
    
    // 这里我们需要添加一个清理方法到TaskManager
    // 暂时返回信息
    
    return NextResponse.json({
      success: true,
      message: `发现 ${taskCount} 个任务`,
      note: '清理功能需要在TaskManager中实现'
    });
    
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: '清理失败',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
