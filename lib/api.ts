// 客户端API函数

// 上传图片到 sm.ms 图床，返回公网URL
export async function uploadToSmms(file: File): Promise<string> {
  console.log('开始上传图片到sm.ms，文件大小:', file.size, '文件类型:', file.type);

  // 检查文件大小（sm.ms限制5MB）
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('图片文件过大，请选择小于5MB的图片');
  }

  // 检查文件类型
  if (!file.type.startsWith('image/')) {
    throw new Error('请选择图片文件');
  }

  const formData = new FormData();
  formData.append('smfile', file);

  try {
    const res = await fetch('https://sm.ms/api/v2/upload', {
      method: 'POST',
      body: formData,
    });

    console.log('sm.ms响应状态:', res.status, res.statusText);

    if (!res.ok) {
      throw new Error(`HTTP错误: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    console.log('sm.ms响应数据:', data);

    if (data.success) {
      console.log('图片上传成功，URL:', data.data.url);
      return data.data.url; // 公网图片URL
    } else {
      console.error('图片上传失败:', data);
      throw new Error(data.message || data.code || '上传失败');
    }
  } catch (error) {
    console.error('上传过程中发生错误:', error);
    throw error;
  }
}

// 备用方案：将图片转换为base64
export async function convertToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

// 智能上传：先尝试sm.ms，失败则使用base64
export async function smartUpload(file: File): Promise<string> {
  console.log('开始智能上传流程...');

  try {
    // 首先尝试上传到sm.ms
    const url = await uploadToSmms(file);
    console.log('sm.ms上传成功');
    return url;
  } catch (error) {
    console.warn('sm.ms上传失败，使用base64方案:', error);

    // 如果sm.ms失败，使用base64
    const base64 = await convertToBase64(file);
    console.log('base64转换成功');
    return base64;
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

    console.log('发送API请求，提示词:', fullPrompt);

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

    console.log('API响应状态:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API错误响应:', errorText);
      throw new Error(`API请求失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('API响应数据:', data);

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

// 使用本地后端API进行图像编辑（基于用户上传的图片）
export async function generateImageWithReference({
  prompt,
  imageFile,
}: {
  prompt: string;
  imageFile: File;
}): Promise<string> {
  // 构造FormData
  const formData = new FormData();
  formData.append('prompt', prompt);
  formData.append('image', imageFile);

  const response = await fetch('/api/edit-image', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`本地API请求失败: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  if (data.url) {
    return data.url;
  } else {
    throw new Error('本地API响应中没有找到生成的图片');
  }
}

// 回退方案：使用纯文本生成
async function fallbackToTextGeneration(prompt: string): Promise<string> {
  console.log('使用文本生成回退方案，提示词:', prompt);

  const fullPrompt = `生成一个${prompt}的IP形象，高质量，专业设计，适合作为个人头像或品牌形象`;

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
    const errorText = await response.text();
    throw new Error(`文本生成也失败了: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  if (data.data && data.data.length > 0) {
    return data.data[0].url;
  } else {
    throw new Error('文本生成API响应中没有找到生成的图片');
  }
}