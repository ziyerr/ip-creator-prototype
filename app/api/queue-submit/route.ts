import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';

// 🚀 队列任务提交API - 快速响应，无超时限制
// 任务提交后立即返回taskId，实际处理由Worker完成

export async function POST(req: NextRequest) {
  try {
    console.log('=== 队列任务提交API ===');
    
    // 解析请求参数
    const formData = await req.formData();
    const prompt = formData.get('prompt') as string;
    const imageFile = formData.get('image') as File;
    const style = formData.get('style') as string;
    const callbackUrl = formData.get('callbackUrl') as string | null;

    if (!imageFile || !style) {
      return NextResponse.json({ 
        error: '缺少必要参数：image或style' 
      }, { status: 400 });
    }

    // 验证风格参数
    const validStyles = ['cute', 'toy', 'cyber'];
    if (!validStyles.includes(style)) {
      return NextResponse.json({ 
        error: `无效的风格参数: ${style}，支持: ${validStyles.join(', ')}` 
      }, { status: 400 });
    }

    // 生成任务ID
    const taskId = `queue_task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`📋 创建队列任务: ${taskId}, 风格: ${style}`);

    // 转换图片为base64
    const imageBuffer = await imageFile.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');

    // 导入队列管理器（动态导入避免启动时错误）
    const { queueManager } = await import('@/lib/queue-system');
    
    // 准备任务数据
    const jobData = {
      taskId,
      prompt: prompt || '',
      imageData: imageBase64,
      style: style as 'cute' | 'toy' | 'cyber',
      callbackUrl: callbackUrl || undefined,
    };

    // 📤 提交任务到队列
    await queueManager.submitImageGenerationTask(jobData);

    console.log(`✅ 任务已提交到队列: ${taskId}`);

    // 立即返回taskId，不等待处理完成
    return NextResponse.json({
      success: true,
      taskId,
      status: 'queued',
      message: '任务已提交到队列，开始处理中',
      estimatedTime: '2-5分钟',
      queryUrl: `/api/queue-status?taskId=${taskId}`,
      data: {
        style,
        prompt: prompt || '',
        hasCallback: !!callbackUrl,
      }
    });

  } catch (error) {
    console.error('❌ 队列任务提交失败:', error);
    return NextResponse.json({ 
      error: '队列任务提交失败',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
} 