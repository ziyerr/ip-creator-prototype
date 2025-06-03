import { NextRequest } from 'next/server';

// 🚀 不使用Edge Runtime，允许更长的执行时间
// export const runtime = 'edge'; // 注释掉以使用Node.js Runtime

export async function POST(req: NextRequest) {
  try {
    console.log('=== Node.js Runtime 图片生成API处理 ===');
    
    // 处理FormData请求
    const formData = await req.formData();
    const prompt = formData.get('prompt') as string;
    const imageFile = formData.get('image') as File;
    const style = formData.get('style') as string;

    if (!prompt || !imageFile) {
      return Response.json({ 
        error: '缺少必要参数：prompt或image' 
      }, { status: 400 });
    }

    console.log('开始生成图片，提示词长度:', prompt.length);
    console.log('上传文件信息:', imageFile.name, imageFile.size, 'bytes');

    // 将文件转换为Buffer
    const arrayBuffer = await imageFile.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    console.log('文件转换成功，缓冲区大小:', imageBuffer.length, 'bytes');

    // 🚀 调用麻雀API生成3张图片 - 只使用真实API，不使用演示模式
    // 从环境变量读取配置
    const apiUrl = process.env.MAQUE_API_URL || 'https://ismaque.org/v1/images/edits';
    const apiKey = process.env.MAQUE_API_KEY;

    if (!apiKey) {
      console.error('❌ 缺少 MAQUE_API_KEY 环境变量');
      return Response.json({
        error: '服务器配置错误：缺少API密钥',
        details: '请联系管理员配置MAQUE_API_KEY环境变量'
      }, { status: 500 });
    }
    
    const generatedUrls: string[] = [];
    const totalImages = 3;
    let successCount = 0;
    let failedCount = 0;

    // 生成3张图片
    for (let i = 0; i < totalImages; i++) {
      console.log(`🖼️ 生成第${i + 1}张图片...`);
      
      const maxRetries = 1; // 减少重试次数，提高速度
      let imageGenerated = false;
      
      for (let retry = 0; retry <= maxRetries && !imageGenerated; retry++) {
        try {
          console.log(`🌐 第${i + 1}张图片，尝试第${retry + 1}次...`);
          
          // 构建请求
          const apiFormData = new FormData();
          
          // 添加原始图片
          const imageBlob = new Blob([imageBuffer], { type: imageFile.type });
          apiFormData.append('image', imageBlob, imageFile.name || 'image.png');
          
          // 使用原图作为遮罩
          apiFormData.append('mask', imageBlob, 'mask.png');
          
          // 添加变化种子确保每张图片不同
          const variationSeed = `${i}_${retry}_${Date.now()}`;
          const variationPrompts = [
            'with slight pose variation and unique background elements',
            'with different lighting mood and alternative angle perspective',
            'with varied color saturation and distinct artistic interpretation'
          ];
          const selectedVariation = variationPrompts[i % variationPrompts.length];
          
          // 构建最终提示词
          const finalPrompt = `${prompt} ${selectedVariation}`;
          apiFormData.append('prompt', finalPrompt);
          
          // 必需参数 - 明确指定 gpt-image-1 模型
          apiFormData.append('model', 'gpt-image-1');
          apiFormData.append('n', '1');
          apiFormData.append('size', '512x512');
          apiFormData.append('response_format', 'url');
          apiFormData.append('user', `main_${variationSeed}`);
          
          console.log('使用模型: gpt-image-1');
          
          // 设置超时控制 - 45秒
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            console.log('⏰ API调用超时');
            controller.abort();
          }, 45000);
          
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'User-Agent': 'IP-Creator/1.0',
              'Accept': 'application/json'
            },
            body: apiFormData,
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          console.log(`第${i + 1}张图片API响应状态:`, response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`第${i + 1}张图片API错误:`, errorText);
            
            let errorData;
            try {
              errorData = JSON.parse(errorText);
            } catch {
              errorData = { error: { message: errorText } };
            }
            
            // 直接抛出错误，不使用演示模式
            if (response.status === 401) {
              throw new Error(`API认证失败: ${errorData.error?.message || 'Invalid API Key'} - 请检查MAQUE_API_KEY环境变量`);
            } else if (response.status === 404) {
              throw new Error(`API端点不存在: ${apiUrl} - 请确认麻雀API地址是否正确`);
            } else {
              throw new Error(`API错误 (${response.status}): ${errorData.error?.message || errorText}`);
            }
          }
          
          const result = await response.json();
          
          // 解析响应获取图片URL
          let imageUrl = '';
          if (result.data && result.data[0]) {
            imageUrl = result.data[0].url || result.data[0].b64_json || '';
          } else if (result.url) {
            imageUrl = result.url;
          } else if (result.images && result.images[0]) {
            imageUrl = result.images[0];
          }
          
          if (!imageUrl) {
            throw new Error(`未找到图片URL: ${JSON.stringify(result)}`);
          }
          
          // 如果是 base64 格式，转换为 data URL
          if (!imageUrl.startsWith('data:') && !imageUrl.startsWith('http')) {
            imageUrl = `data:image/png;base64,${imageUrl}`;
          }
          
          generatedUrls.push(imageUrl);
          imageGenerated = true;
          successCount++;
          console.log(`✅ 第${i + 1}张图片生成成功`);
          
        } catch (error: any) {
          console.error(`⚠️ 第${i + 1}张图片生成失败 (尝试 ${retry + 1}/${maxRetries + 1}):`, error.message);
          
          if (error.name === 'AbortError') {
            console.log('🕐 请求被取消（可能是超时）');
          }
          
          if (retry === maxRetries) {
            failedCount++;
            console.error(`❌ 第${i + 1}张图片完全失败:`, error.message);
            // 第一张图片失败时立即抛出错误
            if (i === 0) {
              throw error;
            }
          } else {
            // 等待后重试
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
    }

    console.log(`🎯 图片生成完成: ${successCount}张成功, ${failedCount}张失败`);

    // 如果没有成功的图片，直接报错
    if (generatedUrls.length === 0) {
      throw new Error('所有图片生成均失败，请检查API配置和网络连接');
    }

    // 如果部分失败，用成功的图片填充
    while (generatedUrls.length < 3) {
      generatedUrls.push(generatedUrls[0]);
    }

    return Response.json({
      success: true,
      images: generatedUrls.slice(0, 3),
      message: `成功生成${successCount}张图片${failedCount > 0 ? `，${failedCount}张失败` : ''}`,
      style: style,
      count: 3,
      mode: 'api',
      model: 'gpt-image-1',
      runtime: 'nodejs'
    });

  } catch (error) {
    console.error('图片生成失败:', error);
    return Response.json({ 
      error: '图片生成失败',
      details: error instanceof Error ? error.message : String(error),
      runtime: 'nodejs',
      model: 'gpt-image-1'
    }, { status: 500 });
  }
} 