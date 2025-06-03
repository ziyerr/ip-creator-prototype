import { NextRequest, NextResponse } from 'next/server';
import { TaskManager } from '@/lib/task-manager';

// 🚀 任务提交API - 轮询模式第一步
// 接收图像生成请求，创建任务，立即返回任务ID

export async function POST(req: NextRequest) {
  try {
    console.log('=== 任务提交API ===');
    
    // 解析请求数据
    const formData = await req.formData();
    const prompt = formData.get('prompt') as string;
    const imageFile = formData.get('image') as File | null;
    
    // 验证必需参数
    if (!prompt) {
      return NextResponse.json(
        { error: '缺少必需参数: prompt' },
        { status: 400 }
      );
    }
    
    if (prompt.length > 1000) {
      return NextResponse.json(
        { error: 'prompt长度不能超过1000字符' },
        { status: 400 }
      );
    }
    
    // 验证图片文件（如果提供）
    if (imageFile) {
      if (imageFile.size > 4 * 1024 * 1024) { // 4MB限制
        return NextResponse.json(
          { error: '图片文件大小不能超过4MB' },
          { status: 400 }
        );
      }
      
      if (!imageFile.type.startsWith('image/')) {
        return NextResponse.json(
          { error: '只支持图片文件' },
          { status: 400 }
        );
      }
    }
    
    console.log('📝 创建新任务...');
    console.log('Prompt:', prompt);
    console.log('图片文件:', imageFile ? `${imageFile.name} (${imageFile.size} bytes)` : '无');
    
    // 创建任务
    const taskId = await TaskManager.createTask(prompt, imageFile || undefined);
    
    // 立即返回任务ID
    const response = {
      success: true,
      taskId,
      status: 'pending',
      message: '任务已创建，正在处理中...',
      estimatedTime: 60, // 预计60秒完成
      pollInterval: 10, // 建议10秒轮询一次
      statusUrl: `/api/tasks/status/${taskId}`
    };
    
    console.log('✅ 任务创建成功:', taskId);
    
    return NextResponse.json(response, { status: 202 }); // 202 Accepted
    
  } catch (error) {
    console.error('❌ 任务提交失败:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: '服务器内部错误',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// 支持GET请求查看API状态
export async function GET() {
  return NextResponse.json({
    api: 'Task Submit API',
    version: '1.0.0',
    description: '轮询式图像生成任务提交接口',
    usage: {
      method: 'POST',
      contentType: 'multipart/form-data',
      parameters: {
        prompt: 'string (required) - 图像描述，最大1000字符',
        image: 'file (optional) - 图片文件，最大4MB'
      },
      response: {
        taskId: 'string - 任务ID',
        status: 'string - 任务状态',
        statusUrl: 'string - 状态查询URL',
        pollInterval: 'number - 建议轮询间隔（秒）'
      }
    },
    example: {
      curl: `curl -X POST /api/tasks/submit \\
  -F "prompt=一只可爱的小猫" \\
  -F "image=@cat.jpg"`
    }
  });
}
