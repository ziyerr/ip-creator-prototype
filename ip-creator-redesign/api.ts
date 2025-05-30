// 上传图片到 sm.ms 图床，返回公网URL
export async function uploadToSmms(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('smfile', file);

  const res = await fetch('https://sm.ms/api/v2/upload', {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (data.success) {
    return data.data.url; // 公网图片URL
  } else {
    throw new Error(data.message || '上传失败');
  }
}

// gpt-4o-image图片生成
export async function generateImage({
  prompt,
  imageUrl,
}: {
  prompt: string;
  imageUrl?: string;
}): Promise<string> {
  try {
    // 构建完整的提示词，包含参考图片信息
    const fullPrompt = imageUrl
      ? `基于参考图片 ${imageUrl}，生成：${prompt}`
      : prompt;

    const response = await fetch('https://knowmyapi.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sk-IaOsiwfirWd4pqvx92VnNlkIWph7u8KLJuSSLMfqigqAstdi',
      },
      body: JSON.stringify({
        model: 'gpt-4o-image',
        prompt: fullPrompt,
        n: 1,
        size: '512x512',
        response_format: 'url',
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.data && data.data.length > 0) {
      return data.data[0].url;
    } else {
      throw new Error('API响应中没有找到生成的图片');
    }
  } catch (err) {
    console.error('图片生成失败:', err);
    throw err;
  }
}

// 保留原有的流式接口作为备用
export async function streamGpt4oImage({
  prompt,
  imageUrl,
  onMessage,
  onDone,
  onError,
}: {
  prompt: string;
  imageUrl: string;
  onMessage: (chunk: string) => void;
  onDone?: () => void;
  onError?: (err: any) => void;
}) {
  try {
    const response = await fetch('https://knowmyapi.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sk-IaOsiwfirWd4pqvx92VnNlkIWph7u8KLJuSSLMfqigqAstdi',
      },
      body: JSON.stringify({
        model: 'gpt-4o-image',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        stream: true,
      }),
    });

    if (!response.body) throw new Error('No response body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let done = false;

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        onMessage(chunk);
      }
      done = doneReading;
    }
    onDone && onDone();
  } catch (err) {
    onError && onError(err);
  }
}