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
    
    // 重试函数
    const tryGenerateImage = async (attempt: number = 1): Promise<Response> => {
      console.log(`第${attempt}次尝试生成图片...`);
      
      // 生成1张图片（使用优化参数提高速度）
      const apiFormData = new FormData();
      apiFormData.append('image', new Blob([imageBuffer]), imageFile.name);
      apiFormData.append('mask', new Blob([imageBuffer]), imageFile.name);
      apiFormData.append('prompt', finalPrompt);
      apiFormData.append('n', '1'); // 单张图片
      apiFormData.append('size', '512x512'); // 使用较小尺寸提高速度
      apiFormData.append('response_format', 'url');
      apiFormData.append('model', 'gpt-image-1');
      
      console.log('使用优化参数: 512x512分辨率, 单张图片');
      
      console.log('调用麻雀API生成图片...');
      
      // 设置9.5秒超时（接近Vercel 10秒限制）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9500);
      
      console.log('开始API请求，设置9.5秒超时...');
      const startTime = Date.now();
      
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          body: apiFormData,
          signal: controller.signal
        });

        const responseTime = Date.now() - startTime;
        console.log(`API响应时间: ${responseTime}ms`);
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
          message: '图片生成成功',
          model: 'gpt-image-1',
          size: '512x512',
          attempt: attempt
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });

      } catch (fetchError: unknown) {
        clearTimeout(timeoutId);
        
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          if (attempt === 1) {
            console.log('第1次尝试超时，进行第2次重试...');
            return tryGenerateImage(2);
          } else {
            console.log('第2次尝试也超时，返回错误');
            return new Response(JSON.stringify({
              error: '图片生成超时',
              code: 'TIMEOUT',
              message: '经过2次尝试都超时了。麻雀API当前响应较慢，建议:\n1. 稍后重试\n2. 简化自定义需求\n3. 检查网络连接',
              suggestion: '服务器可能负载较高，请稍后重试',
              attempts: 2
            }), {
              status: 408,
              headers: { 'Content-Type': 'application/json' }
            });
          }
        }
        
        throw fetchError;
      }
    };

    // 开始生成
    return await tryGenerateImage();

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