import { NextRequest } from 'next/server';

// 移除Edge Runtime限制，使用默认Node.js运行时以获得更好的稳定性
// export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    console.log('=== Node.js Runtime 图片生成API处理 ===');
    
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
    console.log('上传文件信息:', imageFile.name, imageFile.size, 'bytes');

    // API配置
    const apiUrl = 'https://ismaque.org/v1/images/edits';
    const apiKey = process.env.SPARROW_API_KEY || 'sk-1eEdZF3JuFocE3eyrFBnmE1IgMFwbGcwPfMciRMdxF1Zl8Ke';
    
    // 处理提示词
    let finalPrompt = prompt.replace('[REF_IMAGE]', 'the uploaded reference image');
    finalPrompt += `. CRITICAL: Generate a character based on the uploaded reference image. Maintain the SAME SUBJECT TYPE (if it's an animal, generate an animal; if it's a person, generate a person). Preserve the key characteristics while applying the artistic style.`;
    
    // 准备图片数据 - 更好的文件处理
    let imageBuffer: Buffer;
    try {
      const arrayBuffer = await imageFile.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
      console.log('文件转换成功，缓冲区大小:', imageBuffer.length, 'bytes');
    } catch (fileError) {
      console.error('文件处理失败:', fileError);
      return new Response(JSON.stringify({
        error: '图片文件处理失败',
        details: '无法读取上传的图片文件'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 生成3张高质量图片（Node.js Runtime支持更长时间）
    const results: string[] = [];
    const maxRetries = 2;
    const totalImages = 3;
    let globalLastError: Error | null = null; // 全局错误记录
    
    for (let i = 0; i < totalImages; i++) {
      console.log(`🖼️ 生成第${i + 1}张图片...`);
      
      let success = false;
      let lastError: Error | null = null;
      
      for (let retry = 0; retry <= maxRetries && !success; retry++) {
        let timeoutId: NodeJS.Timeout | undefined;
        
        try {
          console.log(`🌐 第${i + 1}张图片，尝试第${retry + 1}次...`);
          
          // 为每张图片添加独特变化
          const variationPrompt = finalPrompt + ` Variation seed: ${i}_${retry}`;
          
          const apiFormData = new FormData();
          apiFormData.append('image', new Blob([imageBuffer], { type: imageFile.type }), imageFile.name);
          apiFormData.append('mask', new Blob([imageBuffer], { type: imageFile.type }), imageFile.name);
          apiFormData.append('prompt', variationPrompt);
          apiFormData.append('n', '1'); // 单张图片
          apiFormData.append('size', '1024x1024'); // 高质量
          apiFormData.append('response_format', 'url');
          apiFormData.append('model', 'gpt-image-1');

          // 增加超时控制和重试机制
          const controller = new AbortController();
          timeoutId = setTimeout(() => {
            controller.abort();
            console.error('⏰ API调用超时');
          }, 45000); // 45秒超时
          
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'User-Agent': 'IP-Creator/1.0',
            },
            body: apiFormData,
            signal: controller.signal
          });

          if (timeoutId) {
            clearTimeout(timeoutId);
          }

          if (!response.ok) {
            const errorText = await response.text().catch(() => '无法读取错误响应');
            console.error(`❌ 第${i + 1}张图片API调用失败:`, response.status, errorText);
            throw new Error(`API调用失败: HTTP ${response.status} - ${errorText.substring(0, 200)}`);
          }

          const data = await response.json();
          console.log(`✅ 第${i + 1}张图片API响应成功:`, Object.keys(data));

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
            console.error('❌ API响应中未找到图片URL:', data);
            throw new Error('API响应中未找到有效图片URL');
          }

          console.log(`🎉 第${i + 1}张图片生成成功:`, imageUrl.substring(0, 100) + '...');
          results.push(imageUrl);
          success = true;

        } catch (fetchError: unknown) {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
          globalLastError = lastError; // 记录到全局
          
          console.warn(`⚠️ 第${i + 1}张图片生成失败 (尝试 ${retry + 1}/${maxRetries + 1}):`, lastError.message);
          
          // 分析错误类型
          if (lastError.name === 'AbortError') {
            console.log('🕐 请求被取消（可能是超时）');
            break; // 超时不重试
          }
          
          if (lastError.message.includes('Failed to fetch') || lastError.message.includes('网络')) {
            console.log('🌐 检测到网络连接问题');
          }
          
          // 如果不是最后一次重试，等待后继续
          if (retry < maxRetries) {
            const waitTime = (retry + 1) * 2000; // 递增等待时间：2s, 4s
            console.log(`⏳ 等待${waitTime}ms后重试...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }
      
      // 如果这张图片完全失败，记录但继续下一张
      if (!success) {
        console.error(`❌ 第${i + 1}张图片完全失败:`, lastError?.message);
      }
    }

    // 检查最终结果
    const successCount = results.length;
    const failedCount = totalImages - successCount;
    
    console.log(`🎯 图片生成完成: ${successCount}张成功, ${failedCount}张失败`);

    // 至少要有1张成功才算成功
    if (successCount < 1) {
      return new Response(JSON.stringify({
        error: '所有图片生成都失败了',
        details: globalLastError?.message || '未知错误',
        suggestion: '请检查网络连接或稍后重试'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 如果只有部分成功，用成功的图片填充到3张
    const finalResults = [...results];
    while (finalResults.length < 3 && results.length > 0) {
      finalResults.push(results[0]); // 复制第一张成功的图片
    }

    // 返回结果
    return new Response(JSON.stringify({
      success: true,
      urls: finalResults,
      message: `Node.js Runtime图片生成完成 - ${successCount}张原创图片` + (failedCount > 0 ? `，${failedCount}张失败` : ''),
      model: 'gpt-image-1',
      size: '1024x1024',
      runtime: 'nodejs',
      stats: {
        successful: successCount,
        failed: failedCount,
        total: totalImages
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('🚨 图片生成过程出现严重错误:', error);
    return new Response(JSON.stringify({ 
      error: '图片生成失败',
      details: error instanceof Error ? error.message : String(error),
      runtime: 'nodejs',
      suggestion: '请检查网络连接、API配置或稍后重试'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 