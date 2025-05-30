import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

export async function POST(req: NextRequest) {
  // 1. 解析 multipart/form-data
  const formData = await req.formData();
  const prompt = formData.get('prompt') as string;
  const imageFile = formData.get('image') as File;

  // 2. 读取图片为base64
  const arrayBuffer = await imageFile.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const imageBase64 = buffer.toString('base64');
  const imageDataUrl = `data:image/png;base64,${imageBase64}`;

  // 3. 调用硅基流动API
  const apiUrl = 'https://api.siliconflow.cn/v1/images/generations';
  const apiKey = 'sk-tfdpvefypofzzevsgblozphkxhywowawfunpphpfblpvqbty';
  const body = {
    model: 'Kwai-Kolors/Kolors',
    prompt,
    image: imageDataUrl,
    image_size: '1024x1024',
    batch_size: 1,
    num_inference_steps: 20,
    guidance_scale: 7.5
  };

  const apiRes = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const apiData = (await apiRes.json()) as { images?: { url: string }[] };
  if (!apiData.images || !apiData.images[0]?.url) {
    return new Response(JSON.stringify({ error: '硅基流动API生成失败' }), { status: 500 });
  }

  // 4. 下载生成图片到 public/outputs
  const outputDir = path.join(process.cwd(), 'public/outputs');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const filename = `output_${Date.now()}.png`;
  const filePath = path.join(outputDir, filename);
  const imgRes = await fetch(apiData.images[0].url);
  const imgBuffer = await imgRes.buffer();
  fs.writeFileSync(filePath, imgBuffer);

  // 5. 返回本地图片URL
  return new Response(JSON.stringify({ url: `/outputs/${filename}` }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
} 