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
    
    console.log('调用麻雀API生成图片...');
    
    // 设置50秒超时（给Vercel 60秒留10秒缓冲）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50000);
    
    try {
      // 并行生成3张图片以提供更多选择
      const generatePromises = [];
      
      for (let i = 0; i < 3; i++) {
        const apiFormData = new FormData();
        apiFormData.append('image', new Blob([imageBuffer]), imageFile.name);
        apiFormData.append('mask', new Blob([imageBuffer]), imageFile.name);
        apiFormData.append('prompt', finalPrompt);
        apiFormData.append('n', '1'); // 每次生成1张
        apiFormData.append('size', '1024x1024'); // 高质量
        apiFormData.append('response_format', 'url');
        apiFormData.append('model', 'gpt-image-1');

        const generateSingle = async () => {
          console.log(`开始生成第${i + 1}张图片...`);
          
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
            },
            body: apiFormData,
            signal: controller.signal
          });

          if (!response.ok) {
            throw new Error(`第${i + 1}张图片生成失败: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();
          console.log(`第${i + 1}张图片API响应:`, data);

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
            throw new Error(`第${i + 1}张图片未找到有效URL`);
          }

          console.log(`第${i + 1}张图片生成成功:`, imageUrl.substring(0, 100) + '...');
          return imageUrl;
        };

        generatePromises.push(generateSingle());
      }

      // 等待所有图片生成完成
      console.log('等待3张图片并行生成完成...');
      const imageUrls = await Promise.all(generatePromises);
      
      clearTimeout(timeoutId);

      console.log(`所有图片生成成功，共${imageUrls.length}张:`, imageUrls.map(url => url.substring(0, 50) + '...'));

      // 返回结果 - 真正的3张不同图片
      return new Response(JSON.stringify({
        success: true,
        urls: imageUrls,
        message: `成功生成${imageUrls.length}张高质量图片`,
        model: 'gpt-image-1',
        size: '1024x1024',
        processingTime: '50秒内完成'
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
          message: '图片生成时间超过50秒限制，请重试或考虑使用异步生成模式'
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