import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('=== 开始处理图片生成请求（麻雀API图片编辑） ===');
    
    // 1. 解析 multipart/form-data
    const requestFormData = await req.formData();
    const prompt = requestFormData.get('prompt') as string;
    const imageFile = requestFormData.get('image') as File;

    console.log('提示词:', prompt);
    console.log('参考图片:', imageFile?.name, '大小:', imageFile?.size);

    if (!prompt) {
      return new Response(JSON.stringify({ error: '缺少提示词参数' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!imageFile) {
      return new Response(JSON.stringify({ error: '缺少参考图片' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. 准备API请求数据 - 使用麻雀API图片编辑接口（支持参考图片）
    const apiUrl = 'https://ismaque.org/v1/images/edits';
    
    // 从环境变量获取API密钥，如果没有则使用默认值（用于向后兼容）
    const apiKey = process.env.SPARROW_API_KEY || 'sk-1eEdZF3JuFocE3eyrFBnmE1IgMFwbGcwPfMciRMdxF1Zl8Ke';
    
    // 检查API密钥是否可用
    if (!apiKey || apiKey === 'your_api_key_here') {
      console.error('API密钥未配置或无效');
      return new Response(JSON.stringify({ 
        error: '服务配置错误：API密钥未设置',
        suggestion: '请联系管理员配置SPARROW_API_KEY环境变量',
        environment: process.env.NODE_ENV || 'unknown'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('使用API密钥:', apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4));
    
    // 处理提示词，替换占位符并增强描述，特别强调基于参考图片生成
    let finalPrompt = prompt.replace('[REF_IMAGE]', 'the uploaded reference image');
    
    // 为了更好的效果，增强提示词描述，强调基于参考图片生成相同主体
    if (imageFile) {
      finalPrompt += `. CRITICAL: Generate a character based on the uploaded reference image. Maintain the SAME SUBJECT TYPE (if it's an animal, generate an animal; if it's a person, generate a person). Preserve the key characteristics while applying the artistic style. The generated image must feature the same type of subject as shown in the reference image.`;
    }
    
    console.log('最终提示词:', finalPrompt);
    console.log('发送API请求到麻雀API图片编辑接口...');

    // 3. 使用multipart/form-data调用edits接口（支持参考图片）
    console.log('使用edits接口生成基于参考图片的图片');
    
    // 将图片文件转换为buffer
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    
    // 创建FormData
    const apiFormData = new FormData();
    apiFormData.append('image', new Blob([imageBuffer]), imageFile.name);
    apiFormData.append('mask', new Blob([imageBuffer]), imageFile.name); // 使用相同图片作为mask
    apiFormData.append('prompt', finalPrompt);
    apiFormData.append('n', '3'); // 生成3张图片
    apiFormData.append('size', '1024x1024');
    apiFormData.append('response_format', 'url');
    apiFormData.append('model', 'gpt-image-1');
    
    console.log('调用麻雀API图片编辑接口...');
    console.log('请求参数: 图片文件大小:', imageFile.size, 'bytes');
    console.log('提示词:', finalPrompt);
    console.log('生成数量: 3张图片');

    // 4. 添加重试机制处理网络错误
    let apiRes: Response | undefined;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        console.log(`API调用尝试 ${retryCount + 1}/${maxRetries}...`);
        
        apiRes = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          body: apiFormData,
        });
        
        console.log('API响应状态:', apiRes.status, apiRes.statusText);
        
        // 如果请求成功，跳出重试循环
        if (apiRes.ok || apiRes.status !== 500) {
          break;
        }
        
        throw new Error(`API返回错误状态: ${apiRes.status}`);
        
      } catch (error) {
        console.error(`API调用尝试 ${retryCount + 1} 失败:`, error);
        retryCount++;
        
        // 如果是最后一次尝试，抛出错误
        if (retryCount >= maxRetries) {
          return new Response(JSON.stringify({ 
            error: '网络连接不稳定，请稍后重试',
            details: error instanceof Error ? error.message : String(error),
            suggestion: 'API服务可能暂时不可用，建议稍后重试'
          }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // 等待后重试
        console.log(`等待 ${(retryCount) * 2} 秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, retryCount * 2000));
      }
    }

    // 确保apiRes存在
    if (!apiRes) {
      return new Response(JSON.stringify({ 
        error: '无法连接到API服务',
        suggestion: '请检查网络连接后重试'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 处理API错误响应
    if (!apiRes.ok) {
      const errorText = await apiRes.text();
      console.error('API调用失败:', errorText);
      
      // 尝试解析错误信息
      try {
        const errorJson = JSON.parse(errorText);
        return new Response(JSON.stringify({ 
          error: `麻雀API错误: ${errorJson.error?.message || apiRes.statusText}`,
          details: errorJson,
          statusCode: apiRes.status
        }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch {
        return new Response(JSON.stringify({ 
          error: `麻雀API错误: ${apiRes.status} ${apiRes.statusText}`,
          details: errorText,
          statusCode: apiRes.status
        }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    const apiData = await apiRes.json();
    console.log('API响应数据:', JSON.stringify(apiData, null, 2));

    // 4. 处理API响应 - 支持多张图片
    let imageUrls: string[] = [];
    
    // 检查标准OpenAI格式的data数组
    if (apiData.data && Array.isArray(apiData.data) && apiData.data.length > 0) {
      for (const result of apiData.data) {
        if (result?.url) {
          imageUrls.push(result.url);
          console.log('找到图片URL (data数组格式):', result.url);
        } else if (result?.b64_json) {
          // 如果返回base64格式，转换为data URL
          const base64Data = result.b64_json;
          const dataUrl = `data:image/png;base64,${base64Data}`;
          imageUrls.push(dataUrl);
          console.log('base64图片转换为data URL成功');
        }
      }
    }
    // 检查其他可能的字段格式
    else if (apiData.url) {
      imageUrls.push(apiData.url);
      console.log('找到图片URL (url字段):', apiData.url);
    }
    else if (apiData.image_url) {
      imageUrls.push(apiData.image_url);
      console.log('找到图片URL (image_url字段):', apiData.image_url);
    }
    else if (apiData.result) {
      imageUrls.push(apiData.result);
      console.log('找到图片URL (result字段):', apiData.result);
    }

    if (imageUrls.length === 0) {
      console.error('未找到图片URL，完整响应:', JSON.stringify(apiData, null, 2));
      
      // 特殊处理：如果只返回revised_prompt，说明这可能是文本处理而非图片生成
      if (apiData.revised_prompt && !apiData.data) {
        return new Response(JSON.stringify({ 
          error: 'API返回了文本处理结果而非图片，可能接口配置有误',
          response: apiData,
          suggestion: '请检查API参数配置，特别是mask参数和model参数是否正确'
        }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({ 
        error: '麻雀API响应中未找到图片URL',
        availableFields: Object.keys(apiData),
        fullResponse: apiData
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 5. 验证图片URL的可访问性
    console.log(`验证 ${imageUrls.length} 张图片URL的可访问性...`);
    
    for (let i = 0; i < imageUrls.length; i++) {
      try {
        const imgCheckRes = await fetch(imageUrls[i], { method: 'HEAD' });
        if (!imgCheckRes.ok) {
          console.warn(`图片${i+1} URL可能无法访问:`, imgCheckRes.status, imgCheckRes.statusText);
        } else {
          console.log(`图片${i+1} URL验证成功，Content-Type:`, imgCheckRes.headers.get('content-type'));
        }
      } catch (error) {
        console.warn(`图片${i+1} URL验证失败，但继续返回URL:`, error);
      }
    }

    // 6. 返回图片URLs (生产环境优化)
    console.log('直接返回原始图片URLs（生产环境模式）:', imageUrls);

    return new Response(JSON.stringify({ 
      urls: imageUrls,
      count: imageUrls.length,
      directUrl: true,
      source: 'sparrow-api',
      message: `生产环境模式：直接使用API提供的${imageUrls.length}张图片URL`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('处理请求时发生错误:', error);
    return new Response(JSON.stringify({ 
      error: '服务器内部错误',
      details: error instanceof Error ? error.message : String(error)
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 