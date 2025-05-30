import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

export async function POST(req: NextRequest) {
  try {
    console.log('=== 开始处理图片编辑请求 ===');
    
    // 1. 解析 multipart/form-data
    const formData = await req.formData();
    const prompt = formData.get('prompt') as string;
    const imageFile = formData.get('image') as File;

    console.log('提示词:', prompt);
    console.log('图片文件:', imageFile?.name, '大小:', imageFile?.size);

    if (!prompt || !imageFile) {
      return new Response(JSON.stringify({ error: '缺少必要参数' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. 读取图片为base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const imageBase64 = buffer.toString('base64');
    const imageDataUrl = `data:${imageFile.type};base64,${imageBase64}`;

    console.log('图片转换为base64完成，长度:', imageBase64.length);

    // 3. 调用硅基流动API
    const apiUrl = 'https://api.siliconflow.cn/v1/images/generations';
    const apiKey = 'sk-tfdpvefypofzzevsgblozphkxhywowawfunpphpfblpvqbty';
    
    const requestBody = {
      model: 'Kwai-Kolors/Kolors',
      prompt,
      image: imageDataUrl,
      image_size: '1024x1024',
      batch_size: 1,
      num_inference_steps: 20,
      guidance_scale: 7.5
    };

    console.log('发送API请求到硅基流动...');

    const apiRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('API响应状态:', apiRes.status, apiRes.statusText);

    if (!apiRes.ok) {
      const errorText = await apiRes.text();
      console.error('API错误响应:', errorText);
      return new Response(JSON.stringify({ 
        error: `硅基流动API错误: ${apiRes.status} ${apiRes.statusText}`,
        details: errorText
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const apiData = await apiRes.json() as { images?: { url: string }[] };
    console.log('API响应数据:', JSON.stringify(apiData, null, 2));

    if (!apiData.images || !apiData.images[0]?.url) {
      console.error('API响应中没有图片数据');
      return new Response(JSON.stringify({ 
        error: '硅基流动API生成失败，响应中没有图片数据',
        response: apiData
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. 确保输出目录存在
    const outputDir = path.join(process.cwd(), 'public/outputs');
    if (!fs.existsSync(outputDir)) {
      console.log('创建outputs目录...');
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 5. 下载生成图片到 public/outputs
    const filename = `output_${Date.now()}.png`;
    const filePath = path.join(outputDir, filename);
    
    console.log('开始下载生成的图片...');
    const imgRes = await fetch(apiData.images[0].url);
    
    if (!imgRes.ok) {
      console.error('下载图片失败:', imgRes.status, imgRes.statusText);
      return new Response(JSON.stringify({ 
        error: `下载生成图片失败: ${imgRes.status}`,
        imageUrl: apiData.images[0].url
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
    fs.writeFileSync(filePath, imgBuffer);
    
    const publicUrl = `/outputs/${filename}`;
    console.log('图片保存成功:', filePath);
    console.log('返回URL:', publicUrl);

    // 6. 返回本地图片URL
    return new Response(JSON.stringify({ 
      url: publicUrl,
      originalUrl: apiData.images[0].url,
      filename
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