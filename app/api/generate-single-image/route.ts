import { NextRequest } from 'next/server';
import { writeFile, mkdir, readdir, unlink, stat } from 'fs/promises';
import { join } from 'path';

// 🚀 不使用Edge Runtime，允许更长的执行时间
// export const runtime = 'edge'; // 注释掉以使用Node.js Runtime

// 🧹 清理旧文件函数
async function cleanupOldFiles(outputDir: string) {
  try {
    const files = await readdir(outputDir);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24小时

    for (const file of files) {
      if (file.startsWith('generated_') && file.endsWith('.png')) {
        const filePath = join(outputDir, file);
        try {
          const stats = await stat(filePath);
          if (now - stats.mtime.getTime() > maxAge) {
            await unlink(filePath);
            console.log(`🗑️ 已删除过期文件: ${file}`);
          }
        } catch (error) {
          // 忽略单个文件的错误
        }
      }
    }
  } catch (error) {
    console.warn('清理旧文件失败:', error);
  }
}

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
    console.log('文件对象信息:', {
      name: imageFile.name,
      size: imageFile.size,
      type: imageFile.type,
      hasArrayBuffer: typeof imageFile.arrayBuffer === 'function',
      hasStream: typeof imageFile.stream === 'function',
      hasText: typeof imageFile.text === 'function',
      constructor: imageFile.constructor.name
    });

    // 🎨 为每张图片添加独特的变化指令
    const variationPrompts = [
      'with slight pose variation and unique background elements',
      'with different lighting mood and alternative angle perspective', 
      'with varied color saturation and distinct artistic interpretation'
    ];
    
    const variationIndex = parseInt(variationSeed) || 0;
    const selectedVariation = variationPrompts[variationIndex % variationPrompts.length];
    
    console.log(`🎨 使用变化策略 ${variationIndex + 1}: ${selectedVariation}`);
    
    // 🚀 调用麻雀API - 只使用真实API，不使用演示模式
    const apiUrl = 'https://ismaque.org/v1/images/edits';
    const apiKey = process.env.MAQUE_API_KEY || 'sk-5D59F8';
    
    // 将文件转换为Buffer - 兼容 Vercel 环境
    let imageBuffer: Buffer;
    try {
      console.log('🔄 开始文件转换...');

      // 方法1: 尝试标准 arrayBuffer 方法
      if (typeof imageFile.arrayBuffer === 'function') {
        console.log('📁 使用标准 arrayBuffer 方法');
        const arrayBuffer = await imageFile.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuffer);
        console.log(`✅ arrayBuffer 方法成功，大小: ${imageBuffer.length} bytes`);
      }
      // 方法2: 尝试 stream 方法 (Vercel 环境)
      else if (imageFile.stream && typeof imageFile.stream === 'function') {
        console.log('📁 使用 stream 方法 (Vercel 环境)');
        const chunks: Uint8Array[] = [];
        const reader = imageFile.stream().getReader();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }

        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;

        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }

        imageBuffer = Buffer.from(combined);
        console.log(`✅ stream 方法成功，大小: ${imageBuffer.length} bytes`);
      }
      // 方法3: 尝试 text 方法作为备用
      else if (typeof imageFile.text === 'function') {
        console.log('📁 使用 text 方法作为备用');
        const text = await imageFile.text();
        imageBuffer = Buffer.from(text, 'binary');
        console.log(`⚠️ text 方法完成，大小: ${imageBuffer.length} bytes (可能不准确)`);
      }
      // 方法4: 直接使用 File 对象的内部数据
      else if ((imageFile as any).buffer) {
        console.log('📁 使用内部 buffer 属性');
        imageBuffer = Buffer.from((imageFile as any).buffer);
        console.log(`✅ buffer 属性成功，大小: ${imageBuffer.length} bytes`);
      }
      // 方法5: 最后的备用方案
      else {
        console.log('📁 使用最后的备用方案');
        // 尝试将整个对象转换为字符串然后转换为 Buffer
        const fileString = String(imageFile);
        imageBuffer = Buffer.from(fileString, 'binary');
        console.log(`⚠️ 备用方案完成，大小: ${imageBuffer.length} bytes (可能不正确)`);
      }

      // 验证 Buffer 是否有效
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error('转换后的 Buffer 为空');
      }

      console.log(`📁 文件处理成功: ${imageFile.name}, 大小: ${imageBuffer.length} bytes`);

    } catch (bufferError) {
      console.error('文件转换失败:', bufferError);
      console.error('文件对象详细信息:', {
        ...Object.getOwnPropertyNames(imageFile).reduce((acc, prop) => {
          try {
            acc[prop] = typeof (imageFile as any)[prop];
          } catch {
            acc[prop] = 'inaccessible';
          }
          return acc;
        }, {} as any)
      });
      throw new Error(`文件处理失败: ${bufferError instanceof Error ? bufferError.message : String(bufferError)}`);
    }
    
    // 构建请求
    const apiFormData = new FormData();
    
    // 添加原始图片
    const imageBlob = new Blob([imageBuffer], { type: imageFile.type });
    apiFormData.append('image', imageBlob, imageFile.name || 'image.png');
    
    // 使用原图作为遮罩
    apiFormData.append('mask', imageBlob, 'mask.png');
    
    // 添加增强的提示词
    const finalPrompt = `${prompt} ${selectedVariation}`;
    apiFormData.append('prompt', finalPrompt);
    
    // 必需参数 - 明确指定 gpt-image-1 模型
    apiFormData.append('model', 'gpt-image-1');
    apiFormData.append('n', '1');
    apiFormData.append('size', '512x512');
    apiFormData.append('response_format', 'url');
    apiFormData.append('user', `variation_${variationSeed}_${Date.now()}`);
    
    console.log('🌐 调用麻雀API...');
    console.log('API URL:', apiUrl);
    console.log('使用模型: gpt-image-1');
    
    // 设置超时控制器 - 120秒
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    
    try {
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
      
      console.log('API响应状态:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API错误响应:', errorText);
        
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
          throw new Error(`API请求失败 (${response.status}): ${errorData.error?.message || errorText}`);
        }
      }
      
      const result = await response.json();
      console.log('API响应数据:', JSON.stringify(result).substring(0, 200));
      
      // 解析响应并保存图片文件
      let imageUrl = '';
      let base64Data = '';

      if (result.data && result.data[0]) {
        if (result.data[0].url && result.data[0].url.startsWith('http')) {
          // 如果返回的是真实URL，直接使用
          imageUrl = result.data[0].url;
        } else {
          // 如果返回的是base64，保存为文件
          base64Data = result.data[0].b64_json || result.data[0].url || '';
        }
      } else if (result.url && result.url.startsWith('http')) {
        imageUrl = result.url;
      } else if (result.images && result.images[0]) {
        base64Data = result.images[0];
      }

      // 🎯 如果有base64数据，保存为文件
      if (base64Data && !imageUrl) {
        try {
          // 清理base64数据（移除data:image/png;base64,前缀）
          const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');

          // 生成唯一文件名
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substring(2, 8);
          const fileName = `generated_${timestamp}_${randomId}.png`;

          // 确保输出目录存在
          const outputDir = join(process.cwd(), 'public', 'outputs');
          try {
            await mkdir(outputDir, { recursive: true });
          } catch (mkdirError) {
            // 目录可能已存在，忽略错误
          }

          // 🧹 清理旧文件（异步执行，不阻塞当前请求）
          cleanupOldFiles(outputDir).catch(console.warn);

          // 保存文件
          const filePath = join(outputDir, fileName);
          const imageBuffer = Buffer.from(cleanBase64, 'base64');
          await writeFile(filePath, imageBuffer);

          // 生成可访问的URL
          imageUrl = `/outputs/${fileName}`;

          console.log(`💾 图片已保存: ${fileName} (${(imageBuffer.length / 1024).toFixed(1)}KB)`);

        } catch (saveError) {
          console.error('保存图片文件失败:', saveError);
          // 如果保存失败，回退到data URL
          imageUrl = `data:image/png;base64,${base64Data}`;
        }
      }

      if (!imageUrl) {
        throw new Error(`API响应中未找到图片数据: ${JSON.stringify(result)}`);
      }
      
      console.log(`✅ 图片生成成功，变化${variationIndex + 1}`);
      
      // 返回成功结果
      return Response.json({
        success: true,
        url: imageUrl,
        message: `图片生成成功 - 变化${variationIndex + 1}`,
        model: 'gpt-image-1',
        size: '512x512',
        runtime: 'nodejs',
        variation: selectedVariation,
        variationIndex: variationIndex + 1,
        mode: 'api'
      });
      
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.error('API调用超时');
        throw new Error('图片生成超时（120秒），请稍后重试');
      }
      
      throw error;
    }

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