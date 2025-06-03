import { NextRequest, NextResponse } from 'next/server';

// 🚀 Vercel适配的任务提交API
// 立即调用麻雀API并返回jobId，适合无服务器环境

export async function POST(req: NextRequest) {
  try {
    console.log('=== Vercel任务提交API ===');

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

    console.log('📝 直接调用麻雀API...');
    console.log('Prompt:', prompt);
    console.log('图片文件:', imageFile ? `${imageFile.name} (${imageFile.size} bytes)` : '无');

    // 生成唯一的jobId
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 准备麻雀API调用
    const apiKey = process.env.MAQUE_API_KEY;
    if (!apiKey) {
      throw new Error('缺少API密钥配置');
    }

    let apiUrl: string;
    let requestBody: FormData | string;
    let headers: Record<string, string>;

    if (imageFile) {
      // 图生图模式 - 使用edits端点
      apiUrl = process.env.MAQUE_API_URL || 'https://ismaque.org/v1/images/edits';
      const apiFormData = new FormData();

      // 转换File为Blob
      const imageArrayBuffer = await imageFile.arrayBuffer();
      const imageBlob = new Blob([imageArrayBuffer], { type: imageFile.type });

      apiFormData.append('image', imageBlob, imageFile.name);
      apiFormData.append('mask', imageBlob, imageFile.name); // 使用同一图片作为mask
      apiFormData.append('prompt', prompt);
      apiFormData.append('n', '3');
      apiFormData.append('size', '1024x1024');
      apiFormData.append('response_format', 'url');
      apiFormData.append('model', 'gpt-image-1');

      requestBody = apiFormData;
      headers = {
        'Authorization': `Bearer ${apiKey}`,
      };
    } else {
      // 文生图模式 - 使用generations端点
      apiUrl = 'https://ismaque.org/v1/images/generations';
      const requestData = {
        prompt: prompt,
        n: 3,
        size: '1024x1024',
        response_format: 'url',
        model: 'gpt-image-1'
      };

      requestBody = JSON.stringify(requestData);
      headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      };
    }

    console.log(`📡 调用麻雀API: ${apiUrl}`);
    console.log(`📋 请求类型: ${imageFile ? '图生图(FormData)' : '文生图(JSON)'}`);

    // 调用麻雀API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: requestBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 麻雀API调用失败:', errorText);
      throw new Error(`API请求失败 (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ 麻雀API响应成功:', result);

    // 提取图片URL
    const imageUrls = result.data?.map((item: any) => item.url) || [];

    if (imageUrls.length === 0) {
      throw new Error('API返回的数据中没有图片URL');
    }

    // 立即返回成功结果
    const successResponse = {
      success: true,
      jobId,
      status: 'completed',
      message: '图像生成完成！',
      results: imageUrls,
      totalImages: imageUrls.length,
      completedAt: Date.now()
    };

    console.log(`🎉 任务完成: ${jobId}, 生成了 ${imageUrls.length} 张图片`);

    return NextResponse.json(successResponse);

  } catch (error) {
    console.error('❌ 任务提交失败:', error);

    return NextResponse.json(
      {
        success: false,
        error: '图像生成失败',
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
