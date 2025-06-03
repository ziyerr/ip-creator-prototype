import { NextRequest, NextResponse } from 'next/server';

// 🔍 Vercel适配的状态检查API
// 由于我们采用同步调用，这个API主要用于兼容轮询模式的前端

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');
    
    if (!jobId) {
      return NextResponse.json(
        { error: '缺少jobId参数' },
        { status: 400 }
      );
    }
    
    console.log(`🔍 检查任务状态: ${jobId}`);
    
    // 由于我们采用同步调用模式，任务要么已完成要么不存在
    // 这里我们返回一个通用的"已完成"状态
    
    // 检查jobId格式是否有效
    if (!jobId.startsWith('job_')) {
      return NextResponse.json(
        {
          jobId,
          status: 'failed',
          error: '无效的任务ID格式',
          message: '❌ 任务ID格式错误'
        },
        { status: 404 }
      );
    }
    
    // 模拟检查：如果是最近的jobId（1小时内），认为可能存在
    const timestamp = parseInt(jobId.split('_')[1]);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    if (now - timestamp > oneHour) {
      return NextResponse.json(
        {
          jobId,
          status: 'expired',
          error: '任务已过期',
          message: '⏰ 任务已过期（1小时），请重新生成',
          suggestion: '请重新提交生成请求'
        },
        { status: 404 }
      );
    }
    
    // 对于有效的jobId，返回"已完成"状态
    // 实际的结果应该在提交时就已经返回了
    const response = {
      jobId,
      status: 'completed',
      message: '✅ 任务已完成',
      note: '由于采用同步模式，结果应该在提交时就已返回',
      timestamp: now,
      polling: {
        interval: 0, // 不需要继续轮询
        shouldContinue: false,
        nextPollTime: null
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ 状态检查失败:', error);
    
    return NextResponse.json(
      {
        error: '服务器内部错误',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// 支持POST请求批量检查
export async function POST(req: NextRequest) {
  try {
    const { jobIds } = await req.json();
    
    if (!Array.isArray(jobIds)) {
      return NextResponse.json(
        { error: '请提供jobIds数组' },
        { status: 400 }
      );
    }
    
    if (jobIds.length > 10) {
      return NextResponse.json(
        { error: '一次最多检查10个任务' },
        { status: 400 }
      );
    }
    
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    const results = jobIds.map(jobId => {
      if (!jobId || !jobId.startsWith('job_')) {
        return {
          jobId,
          status: 'failed',
          error: '无效的任务ID格式'
        };
      }
      
      const timestamp = parseInt(jobId.split('_')[1]);
      
      if (now - timestamp > oneHour) {
        return {
          jobId,
          status: 'expired',
          error: '任务已过期'
        };
      }
      
      return {
        jobId,
        status: 'completed',
        message: '任务已完成'
      };
    });
    
    return NextResponse.json({
      success: true,
      results,
      timestamp: now
    });
    
  } catch (error) {
    console.error('❌ 批量状态检查失败:', error);
    
    return NextResponse.json(
      {
        error: '服务器内部错误',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
