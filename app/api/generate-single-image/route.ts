import { NextRequest } from 'next/server';

// 🚀 不使用Edge Runtime，允许更长的执行时间
// export const runtime = 'edge'; // 注释掉以使用Node.js Runtime

export async function POST(req: NextRequest) {
  try {
    console.log('=== 单图片生成API (Node.js Runtime) ===');
    
    // 1. 解析请求参数
    const requestFormData = await req.formData();
    const prompt = requestFormData.get('prompt') as string;
    const imageFile = requestFormData.get('image') as File;

    if (!prompt || !imageFile) {
      return Response.json({ 
        error: '缺少必要参数：prompt或image' 
      }, { status: 400 });
    }

    console.log('开始生成单张图片，提示词长度:', prompt.length);

    // API配置
    const apiUrl = 'https://ismaque.org/v1/images/edits';
    const apiKey = process.env.SPARROW_API_KEY || 'sk-1eEdZF3JuFocE3eyrFBnmE1IgMFwbGcwPfMciRMdxF1Zl8Ke';
    
    // 处理提示词
    let finalPrompt = prompt.replace('[REF_IMAGE]', 'the uploaded reference image');
    finalPrompt += `. CRITICAL: Generate a character based on the uploaded reference image. Maintain the SAME SUBJECT TYPE (if it's an animal, generate an animal; if it's a person, generate a person). Preserve the key characteristics while applying the artistic style.`;
    
    // 准备图片数据 - 兼容Node.js Runtime
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    
    // 🔧 优化策略：使用较小尺寸提高成功率和速度
    const apiFormData = new FormData();
    apiFormData.append('image', new Blob([imageBuffer]), imageFile.name);
    apiFormData.append('mask', new Blob([imageBuffer]), imageFile.name);
    apiFormData.append('prompt', finalPrompt);
    apiFormData.append('n', '1'); // 单张图片
    apiFormData.append('size', '512x512'); // 使用较小尺寸提高速度
    apiFormData.append('response_format', 'url');
    apiFormData.append('model', 'gpt-image-1');

    console.log('调用麻雀API生成单张优化图片...');
    
    // 🚀 Node.js Runtime支持更长超时，设置45秒
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    
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
        console.error('API响应中未找到图片URL:', data);
        throw new Error('API响应中未找到有效图片URL');
      }

      console.log('单张图片生成成功，URL:', imageUrl.substring(0, 100) + '...');

      // 返回单张图片结果
      return Response.json({
        success: true,
        url: imageUrl,
        message: 'Node.js Runtime单图片生成成功',
        model: 'gpt-image-1',
        size: '512x512',
        runtime: 'nodejs'
      });

    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.log('请求超时，返回超时错误');
        return Response.json({
          error: '生成请求超时',
          code: 'TIMEOUT',
          message: '图片生成时间超过45秒限制',
          suggestion: '网络可能不稳定，请重试'
        }, { status: 408 });
      }
      
      throw fetchError;
    }

  } catch (error) {
    console.error('单图片生成失败:', error);
    return Response.json({ 
      error: '单图片生成失败',
      details: error instanceof Error ? error.message : String(error),
      runtime: 'nodejs'
    }, { status: 500 });
  }
} 