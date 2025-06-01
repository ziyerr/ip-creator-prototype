import { NextRequest } from 'next/server';

// 使用 Edge Runtime，避免传统 Serverless 函数10秒超时限制
export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    console.log('=== Edge Runtime 图片生成API处理 ===');
    
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

    console.log('Edge Runtime 开始生成图片，提示词长度:', prompt.length);

    // API配置
    const apiUrl = 'https://ismaque.org/v1/images/edits';
    const apiKey = process.env.SPARROW_API_KEY || 'sk-1eEdZF3JuFocE3eyrFBnmE1IgMFwbGcwPfMciRMdxF1Zl8Ke';
    
    // 处理提示词
    let finalPrompt = prompt.replace('[REF_IMAGE]', 'the uploaded reference image');
    finalPrompt += `. CRITICAL: Generate a character based on the uploaded reference image. Maintain the SAME SUBJECT TYPE (if it's an animal, generate an animal; if it's a person, generate a person). Preserve the key characteristics while applying the artistic style.`;
    
    // 准备图片数据
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    
    // 生成1张高质量图片（Edge Runtime支持更长时间）
    const apiFormData = new FormData();
    apiFormData.append('image', new Blob([imageBuffer]), imageFile.name);
    apiFormData.append('mask', new Blob([imageBuffer]), imageFile.name);
    apiFormData.append('prompt', finalPrompt);
    apiFormData.append('n', '1'); // 单张图片
    apiFormData.append('size', '1024x1024'); // 高质量
    apiFormData.append('response_format', 'url');
    apiFormData.append('model', 'gpt-image-1');

    console.log('调用麻雀API生成图片 (Edge Runtime)...');
    
    // Edge Runtime 支持更长超时时间：20秒
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    
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
        const errorText = await response.text();
        console.error('API调用失败:', response.status, errorText);
        throw new Error(`API调用失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Edge Runtime API响应:', data);

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
        console.error('API响应中未找到图片URL，完整响应:', data);
        throw new Error('API响应中未找到有效图片URL');
      }

      console.log('Edge Runtime 图片生成成功，URL:', imageUrl.substring(0, 100) + '...');

      // 返回结果 - 兼容前端期望的数组格式
      return new Response(JSON.stringify({
        success: true,
        urls: [imageUrl, imageUrl, imageUrl], // 复制为3个方案
        message: 'Edge Runtime 高质量图片生成成功',
        model: 'gpt-image-1',
        size: '1024x1024',
        runtime: 'edge',
        timeout: '20s'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.log('Edge Runtime 请求超时 (20秒)，返回超时错误');
        return new Response(JSON.stringify({
          error: '生成请求超时',
          code: 'TIMEOUT',
          message: 'Edge Runtime 图片生成时间超过20秒限制，请重试或选择其他风格',
          runtime: 'edge',
          timeout: '20s'
        }), {
          status: 408,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      throw fetchError;
    }

  } catch (error) {
    console.error('Edge Runtime 图片生成失败:', error);
    return new Response(JSON.stringify({ 
      error: '图片生成失败',
      details: error instanceof Error ? error.message : String(error),
      runtime: 'edge'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 