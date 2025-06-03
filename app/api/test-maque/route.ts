import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    
    if (!prompt) {
      return NextResponse.json(
        { error: '请提供prompt参数' },
        { status: 400 }
      );
    }

    const apiKey = process.env.MAQUE_API_KEY;
    const apiUrl = process.env.MAQUE_API_URL || 'https://ismaque.org/v1/images/edits';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'MAQUE_API_KEY未配置' },
        { status: 500 }
      );
    }

    console.log('🔍 测试麻雀API调用...');
    console.log('API URL:', apiUrl);
    console.log('Prompt:', prompt);

    const startTime = Date.now();

    // 准备API请求
    const apiFormData = new FormData();
    apiFormData.append('prompt', prompt);
    apiFormData.append('n', '1');
    apiFormData.append('size', '1024x1024');
    apiFormData.append('response_format', 'b64_json');
    apiFormData.append('model', 'gpt-image-1');

    console.log('📤 发送请求到麻雀API...');

    // 调用麻雀API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: apiFormData,
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`⏱️ API响应时间: ${duration}ms`);
    console.log('📥 API响应状态:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API调用失败:', response.status, errorText);
      
      return NextResponse.json({
        success: false,
        error: `API调用失败: ${response.status}`,
        details: errorText,
        duration,
        apiUrl,
        status: response.status
      });
    }

    const result = await response.json();
    console.log('✅ API调用成功');
    console.log('📊 返回数据结构:', {
      hasData: !!result.data,
      dataLength: result.data?.length || 0,
      firstItemKeys: result.data?.[0] ? Object.keys(result.data[0]) : []
    });

    // 检查返回的数据
    if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'API返回数据格式错误',
        result,
        duration
      });
    }

    const imageData = result.data[0];
    let imageUrl: string;

    if (imageData.b64_json) {
      imageUrl = `data:image/png;base64,${imageData.b64_json}`;
      console.log('🖼️ 获得base64图片，长度:', imageData.b64_json.length);
    } else if (imageData.url) {
      imageUrl = imageData.url;
      console.log('🔗 获得图片URL:', imageUrl);
    } else {
      return NextResponse.json({
        success: false,
        error: '图片数据格式错误',
        imageData: Object.keys(imageData),
        duration
      });
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      duration,
      apiStatus: response.status,
      dataType: imageData.b64_json ? 'base64' : 'url',
      imageSize: imageData.b64_json ? imageData.b64_json.length : 'N/A'
    });

  } catch (error) {
    console.error('🚨 测试API调用异常:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
