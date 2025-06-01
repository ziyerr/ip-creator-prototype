import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('=== 开始处理图片生成请求（麻雀API图片生成） ===');
    
    // 1. 解析 multipart/form-data
    const formData = await req.formData();
    const prompt = formData.get('prompt') as string;
    const imageFile = formData.get('image') as File;

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

    // 2. 准备API请求数据 - 使用麻雀API图片生成接口
    const apiUrl = 'https://ismaque.org/v1/images/generations';
    
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
    
    // 处理提示词，替换占位符并增强描述，特别强调特征保持
    let finalPrompt = prompt.replace('[REF_IMAGE]', 'the reference character maintaining all original characteristics');
    
    // 为了更好的效果，增强提示词描述，特别强调特征精确保持
    if (imageFile) {
      finalPrompt += `. CRITICAL ENHANCEMENT: Study the reference image carefully and preserve ALL original characteristics including exact gender, facial structure, expression, and overall temperament. Generate a faithful IP character adaptation that maintains the person's authentic identity while applying the specified artistic style. High quality, detailed artwork, professional character design.`;
    }
    
    console.log('最终提示词:', finalPrompt);
    console.log('发送API请求到麻雀API图片生成接口...');

    // 3. 使用JSON格式调用generations接口
    console.log('使用generations接口生成图片');
    
    const requestBody = {
      prompt: finalPrompt,
      n: 1,
      size: "1024x1024",
      response_format: "url",
      model: "gpt-image-1"
    };
    
    console.log('调用麻雀API图片生成接口...');
    console.log('请求体:', JSON.stringify(requestBody, null, 2));
    
    // 添加重试机制处理网络错误
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
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
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

    // 4. 处理API响应 - 根据官方文档检查响应格式
    let imageUrl = null;
    
    // 检查标准OpenAI格式的data数组
    if (apiData.data && Array.isArray(apiData.data) && apiData.data.length > 0) {
      const firstResult = apiData.data[0];
      
      if (firstResult?.url) {
        imageUrl = firstResult.url;
        console.log('找到图片URL (data数组格式):', imageUrl);
      } else if (firstResult?.b64_json) {
        // 如果返回base64格式，转换为data URL直接返回
        console.log('检测到base64格式图片，转换为data URL');
        const base64Data = firstResult.b64_json;
        
        // 构建data URL
        const dataUrl = `data:image/png;base64,${base64Data}`;
        console.log('base64图片转换为data URL成功');
        
        return new Response(JSON.stringify({ 
          url: dataUrl,
          directUrl: true,
          format: 'base64',
          source: 'sparrow-api',
          message: 'base64格式图片已转换为data URL'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } else if (firstResult?.revised_prompt && !firstResult?.url && !firstResult?.b64_json) {
        // API只返回了优化的提示词，没有生成图片
        console.log('API只返回了优化提示词，未生成图片');
        console.log('优化后的提示词:', firstResult.revised_prompt);
        
        return new Response(JSON.stringify({ 
          error: '该API接口似乎是文本优化服务，没有生成图片。请检查API接口是否正确',
          revised_prompt: firstResult.revised_prompt,
          suggestion: '可能需要使用不同的API端点或参数来生成图片',
          apiResponse: apiData
        }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    // 检查其他可能的字段
    else if (apiData.url) {
      imageUrl = apiData.url;
      console.log('找到图片URL (url字段):', imageUrl);
    }
    else if (apiData.image_url) {
      imageUrl = apiData.image_url;
      console.log('找到图片URL (image_url字段):', imageUrl);
    }
    else if (apiData.result) {
      imageUrl = apiData.result;
      console.log('找到图片URL (result字段):', imageUrl);
    }
    // 检查是否是异步任务
    else if (apiData.id || apiData.task_id) {
      console.log('检测到异步任务ID:', apiData.id || apiData.task_id);
      return new Response(JSON.stringify({ 
        error: '检测到异步任务，当前版本暂不支持轮询获取结果',
        taskId: apiData.id || apiData.task_id,
        message: '该API使用异步模式，需要轮询任务状态获取最终结果'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!imageUrl) {
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
    console.log('验证图片URL可访问性:', imageUrl);
    
    try {
      const imgCheckRes = await fetch(imageUrl, { method: 'HEAD' });
      if (!imgCheckRes.ok) {
        console.warn('图片URL可能无法访问:', imgCheckRes.status, imgCheckRes.statusText);
      } else {
        console.log('图片URL验证成功，Content-Type:', imgCheckRes.headers.get('content-type'));
      }
    } catch (error) {
      console.warn('图片URL验证失败，但继续返回URL:', error);
    }

    // 6. 直接返回原始图片URL (生产环境优化)
    console.log('直接返回原始图片URL（生产环境模式）:', imageUrl);

    return new Response(JSON.stringify({ 
      url: imageUrl,
      directUrl: true,
      source: 'sparrow-api',
      message: '生产环境模式：直接使用API提供的图片URL'
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