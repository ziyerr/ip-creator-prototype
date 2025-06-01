import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('=== 图片生成API处理 ===');
    
    // 1. 解析请求参数
    const requestFormData = await req.formData();
    const prompt = requestFormData.get('prompt') as string;
    const imageFile = requestFormData.get('image') as File;

    if (!prompt || !imageFile) {
      return new Response(JSON.stringify({ 
        error: '缺少必要参数：prompt或image' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('开始生成图片，提示词长度:', prompt.length);

    // API配置
    const apiUrl = 'https://ismaque.org/v1/images/edits';
    const apiKey = process.env.SPARROW_API_KEY || 'sk-1eEdZF3JuFocE3eyrFBnmE1IgMFwbGcwPfMciRMdxF1Zl8Ke';
    
    // 处理提示词
    let finalPrompt = prompt.replace('[REF_IMAGE]', 'the uploaded reference image');
    finalPrompt += `. CRITICAL: Generate a character based on the uploaded reference image. Maintain the SAME SUBJECT TYPE (if it's an animal, generate an animal; if it's a person, generate a person). Preserve the key characteristics while applying the artistic style.`;
    
    // 准备图片数据
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    
    // 生成1张高质量图片（避免超时）
    const apiFormData = new FormData();
    apiFormData.append('image', new Blob([imageBuffer]), imageFile.name);
    apiFormData.append('mask', new Blob([imageBuffer]), imageFile.name);
    apiFormData.append('prompt', finalPrompt);
    apiFormData.append('n', '1'); // 单张图片
    apiFormData.append('size', '1024x1024'); // 高质量
    apiFormData.append('response_format', 'url');
    apiFormData.append('model', 'gpt-image-1');

    console.log('调用麻雀API生成图片...');
    
    // 设置8秒超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: apiFormData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API调用失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('API响应:', data);

      // 提取图片URL
      let imageUrl = '';
      if (data.data && Array.isArray(data.data) && data.data[0]?.url) {
        imageUrl = data.data[0].url;
      } else if (data.url) {
        imageUrl = data.url;
      } else if (data.data && Array.isArray(data.data) && data.data[0]?.b64_json) {
        imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
      }

      if (!imageUrl) {
        throw new Error('API响应中未找到有效图片URL');
      }

      console.log('图片生成成功，URL:', imageUrl.substring(0, 100) + '...');

      // 返回结果 - 兼容前端期望的数组格式
      return new Response(JSON.stringify({
        success: true,
        urls: [imageUrl, imageUrl, imageUrl], // 复制为3个方案
        message: '高质量图片生成成功',
        model: 'gpt-image-1',
        size: '1024x1024'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.log('请求超时，返回超时错误');
        return new Response(JSON.stringify({
          error: '生成请求超时',
          code: 'TIMEOUT',
          message: '图片生成时间超过8秒限制，请重试或选择其他风格'
        }), {
          status: 408,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      throw fetchError;
    }

  } catch (error) {
    console.error('图片生成失败:', error);
    return new Response(JSON.stringify({ 
      error: '图片生成失败',
      details: error instanceof Error ? error.message : String(error)
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 