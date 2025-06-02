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
    const variationSeed = requestFormData.get('variationSeed') as string || '';

    if (!prompt || !imageFile) {
      return Response.json({ 
        error: '缺少必要参数：prompt或image' 
      }, { status: 400 });
    }

    console.log('开始生成单张图片，提示词长度:', prompt.length, '变化种子:', variationSeed);

    // API配置
    const apiUrl = 'https://ismaque.org/v1/images/edits';
    const apiKey = process.env.SPARROW_API_KEY || 'sk-1eEdZF3JuFocE3eyrFBnmE1IgMFwbGcwPfMciRMdxF1Zl8Ke';
    
    // 处理提示词 - 添加变化因子确保每张图片独特
    let finalPrompt = prompt.replace('[REF_IMAGE]', 'the uploaded reference image');
    
    // 🎨 为每张图片添加独特的变化指令
    const variationPrompts = [
      'with slight pose variation and unique background elements',
      'with different lighting mood and alternative angle perspective', 
      'with varied color saturation and distinct artistic interpretation'
    ];
    
    const variationIndex = parseInt(variationSeed) || 0;
    const selectedVariation = variationPrompts[variationIndex % variationPrompts.length];
    
    finalPrompt += `. CRITICAL: Generate a character based on the uploaded reference image. Maintain the SAME SUBJECT TYPE (if it's an animal, generate an animal; if it's a person, generate a person). Preserve the key characteristics while applying the artistic style ${selectedVariation}.`;
    
    // 🔧 增强的文件处理逻辑，兼容前端异步管理器
    let imageBuffer: Buffer;
    try {
      // 详细分析文件对象
      console.log('🔍 文件对象详细分析:', {
        type: typeof imageFile,
        constructor: imageFile?.constructor?.name,
        isFile: imageFile instanceof File,
        isBlob: imageFile instanceof Blob,
        hasArrayBuffer: typeof imageFile?.arrayBuffer === 'function',
        hasStream: typeof imageFile?.stream === 'function',
        hasText: typeof imageFile?.text === 'function',
        name: imageFile?.name,
        size: imageFile?.size,
        typeProperty: imageFile?.type
      });

      // 🚨 核心修复：检测前端异步管理器重构的File对象
      if (imageFile && typeof imageFile === 'object') {
        
        // 方法1: 标准File对象处理
        if (typeof imageFile.arrayBuffer === 'function') {
          console.log('✅ 使用标准 arrayBuffer 方法');
          const arrayBuffer = await imageFile.arrayBuffer();
          imageBuffer = Buffer.from(arrayBuffer);
          console.log('✅ arrayBuffer 处理成功，大小:', imageBuffer.length, 'bytes');
        }
        // 方法2: Blob对象处理
        else if (typeof imageFile.stream === 'function') {
          console.log('✅ 使用 stream 方法处理Blob');
          const stream = imageFile.stream();
          const reader = stream.getReader();
          const chunks: Uint8Array[] = [];
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }
          
          const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
          const merged = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of chunks) {
            merged.set(chunk, offset);
            offset += chunk.length;
          }
          imageBuffer = Buffer.from(merged);
          console.log('✅ stream 处理成功，大小:', imageBuffer.length, 'bytes');
        }
        // 方法3: text方法处理（可能是base64编码）
        else if (typeof imageFile.text === 'function') {
          console.log('✅ 使用 text 方法处理（可能是base64）');
          const textContent = await imageFile.text();
          
          // 检查是否为base64格式
          if (textContent.startsWith('data:')) {
            // data:image/jpeg;base64,xxxxx 格式
            const base64Data = textContent.split(',')[1];
            imageBuffer = Buffer.from(base64Data, 'base64');
          } else {
            // 尝试作为直接base64字符串
            try {
              imageBuffer = Buffer.from(textContent, 'base64');
            } catch {
              // 如果不是base64，尝试作为二进制字符串
              imageBuffer = Buffer.from(textContent, 'binary');
            }
          }
          console.log('✅ text 处理成功，大小:', imageBuffer.length, 'bytes');
        }
        // 方法4: 直接访问内部数据
        else if ((imageFile as any)._buffer || (imageFile as any).buffer) {
          console.log('✅ 直接访问内部buffer');
          const buffer = (imageFile as any)._buffer || (imageFile as any).buffer;
          imageBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
          console.log('✅ 内部buffer处理成功，大小:', imageBuffer.length, 'bytes');
        }
        // 方法5: 尝试JSON序列化检查
        else {
          console.log('🔍 尝试分析对象结构...');
          const objectInfo = JSON.stringify(Object.getOwnPropertyNames(imageFile).slice(0, 10));
          console.log('对象属性:', objectInfo);
          
          // 如果对象有data属性，可能是某种封装格式
          if ((imageFile as any).data) {
            const data = (imageFile as any).data;
            if (typeof data === 'string') {
              // base64字符串
              imageBuffer = Buffer.from(data, 'base64');
            } else if (Array.isArray(data) || data instanceof Uint8Array) {
              // 数组格式
              imageBuffer = Buffer.from(data);
            } else {
              throw new Error('不支持的data格式');
            }
          } else {
            throw new Error('无法识别的文件格式，没有找到可用的数据提取方法');
          }
        }
      } 
      // 处理字符串类型（可能是前端传来的base64）
      else if (typeof imageFile === 'string') {
        console.log('✅ 处理字符串类型的文件数据');
        const fileStr = imageFile as string;
        if (fileStr.startsWith('data:')) {
          const base64Data = fileStr.split(',')[1];
          imageBuffer = Buffer.from(base64Data, 'base64');
        } else {
          imageBuffer = Buffer.from(fileStr, 'base64');
        }
        console.log('✅ 字符串处理成功，大小:', imageBuffer.length, 'bytes');
      }
      else {
        const fileType = typeof imageFile;
        const constructorName = (imageFile as any)?.constructor?.name || 'unknown';
        throw new Error(`不支持的文件类型: ${fileType}, constructor: ${constructorName}`);
      }
      
      // 验证buffer有效性
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error('处理后的图片数据为空');
      }
      
      console.log('🎉 文件处理完全成功！最终大小:', imageBuffer.length, 'bytes');
      
    } catch (bufferError) {
      console.error('❌ 图片文件处理失败:', bufferError);
      console.error('📊 详细文件信息:', {
        name: imageFile?.name,
        size: imageFile?.size,
        type: imageFile?.type,
        constructor: imageFile?.constructor?.name,
        hasArrayBuffer: typeof imageFile?.arrayBuffer,
        hasStream: typeof imageFile?.stream,
        hasText: typeof imageFile?.text,
        objectKeys: imageFile ? Object.getOwnPropertyNames(imageFile).slice(0, 10) : 'null'
      });
      
      return Response.json({ 
        error: '独立图片生成失败',
        details: bufferError instanceof Error ? bufferError.message : String(bufferError),
        runtime: 'nodejs',
        suggestion: '请检查上传的图片文件格式和完整性'
      }, { status: 500 });
    }
    
    // 🔧 真正独立生成策略：每次调用都有微妙差异
    const apiFormData = new FormData();
    apiFormData.append('image', new Blob([imageBuffer]), imageFile.name);
    apiFormData.append('mask', new Blob([imageBuffer]), imageFile.name);
    apiFormData.append('prompt', finalPrompt);
    apiFormData.append('n', '1'); // 单张图片，确保真正独立
    apiFormData.append('size', '512x512'); // 使用较小尺寸提高速度
    apiFormData.append('response_format', 'url');
    apiFormData.append('model', 'gpt-image-1');
    
    // 🎲 添加随机种子确保变化
    apiFormData.append('user', `variation_${variationSeed}_${Date.now()}`);

    console.log('调用麻雀API生成独特图片 - 变化:', selectedVariation);
    
    // 🚀 增强网络连接配置，解决ConnectTimeoutError
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 增加到120秒
    
    // 🔄 实现重试机制解决网络连接问题
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let retryCount = 0; retryCount <= maxRetries; retryCount++) {
      try {
        console.log(`网络连接尝试 ${retryCount + 1}/${maxRetries + 1}...`);
        
        // 🌐 优化fetch配置，针对网络连接超时问题
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'User-Agent': 'IP-Creator/1.0',
            'Accept': 'application/json',
            'Connection': 'keep-alive'
          },
          body: apiFormData,
          signal: controller.signal,
          // 添加keep-alive配置
          keepalive: true
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

        console.log(`✅ 独特图片生成成功 (变化${variationIndex + 1}, 重试${retryCount}):`, imageUrl.substring(0, 100) + '...');

        // 返回单张独特图片结果
        return Response.json({
          success: true,
          url: imageUrl,
          message: `真实独立图片生成成功 - 变化${variationIndex + 1} (${retryCount}次重试)`,
          model: 'gpt-image-1',
          size: '512x512',
          runtime: 'nodejs',
          variation: selectedVariation,
          variationIndex: variationIndex + 1,
          retryCount
        });
        
      } catch (fetchError: unknown) {
        lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
        console.error(`网络连接失败 (尝试${retryCount + 1}):`, lastError.message);
        
        // 如果是AbortError（超时），不重试
        if (lastError.name === 'AbortError') {
          console.log('请求超时，停止重试');
          break;
        }
        
        // 如果不是最后一次重试，等待后继续
        if (retryCount < maxRetries) {
          const waitTime = Math.pow(2, retryCount) * 1000; // 指数退避：1s, 2s, 4s
          console.log(`等待${waitTime}ms后重试...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    clearTimeout(timeoutId);
    
    // 所有重试都失败了
    if (lastError?.name === 'AbortError') {
      console.log('所有尝试都超时，返回超时错误');
      return Response.json({
        error: '生成请求超时',
        code: 'TIMEOUT',
        message: '图片生成时间超过120秒限制',
        suggestion: '网络可能不稳定，请重试'
      }, { status: 408 });
    }
    
    // 网络连接失败
    console.error('所有网络连接尝试都失败:', lastError?.message);
    return Response.json({
      error: '网络连接失败',
      code: 'NETWORK_ERROR',
      message: '无法连接到图片生成服务',
      details: lastError?.message,
      suggestion: '请检查网络连接或稍后重试',
      retries: maxRetries
    }, { status: 503 });

  } catch (error) {
    console.error('独立图片生成失败:', error);
    return Response.json({ 
      error: '独立图片生成失败',
      details: error instanceof Error ? error.message : String(error),
      runtime: 'nodejs'
    }, { status: 500 });
  }
} 