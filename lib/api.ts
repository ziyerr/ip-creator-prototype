// 客户端API函数 - 优化同步模式

// 风格提示词模板 - 修复版本，避免误添加不存在的配饰
const STYLE_PROMPTS = {
  cute: `Chibi full-body illustration of the main character from [REF_IMAGE], ignore any background. Precisely preserve the hairstyle, any existing accessories, facial features, expression, gender, and temperament from the reference image, with a slightly slimmer face. IMPORTANT: Only include accessories if they are clearly visible in the reference image. Head-to-body ratio around 1:1.2; big eyes, rounded simplified limbs; layered line art distinguishing: hairstyle, face, torso, limbs, and any visible accessories; flat pastel color block fills with subtle cel-shading shadows and highlight distinction; overall style cute yet handsome; high-resolution square canvas, 1:1 aspect ratio.`,
  
  toy: `3D isometric full-body toy figurine of the main character from [REF_IMAGE], ignore any background. Preserve exactly the hairstyle, any existing accessories, facial features, expression, gender and temperament from the reference, with a slightly slimmer face. IMPORTANT: Only include accessories if they are clearly visible in the reference image. Render smooth vinyl-like surfaces with clear segmentation into head, torso, arms, legs, joints and any visible accessories; use consistent bevel outlines and soft plastic material feel; apply muted yet vibrant color zones and subtle studio reflections; maintain a perfect blend of adorable and handsome; photorealistic 3D render, square 1:1 aspect ratio.`,
  
  cyber: `Cyberpunk full-body character illustration of the main character from [REF_IMAGE], ignore any background, square 1:1 canvas. Precisely preserve the hairstyle, any existing accessories, facial features, expression, gender and temperament from the reference, with a slightly slimmer face. IMPORTANT: Only include accessories if they are clearly visible in the reference image. Clear layered segmentation: hairstyle, face, upper-body armor/clothing, lower-body combat suit, limbs and any visible accessories; armor and clothing surfaces covered with glowing neon circuit patterns; distinct metallic and leather textures; blend high reflections with deep shadows, incorporating neon light reflections; dynamic pose emphasizing futuristic and cyberpunk aesthetics; high-resolution digital painting.`
};

interface GenerateImageParams {
  prompt: string;
  imageFile: File;
  style: 'cute' | 'toy' | 'cyber';
  customRequirements?: string;
}

export async function generateImageWithReference(
  params: GenerateImageParams
): Promise<string[]> {
  try {
    console.log('调用同步图片生成API...');
    
    // 构建完整提示词
    const stylePrompt = STYLE_PROMPTS[params.style];
    let fullPrompt = stylePrompt;
    
    // 添加自定义需求
    if (params.customRequirements && params.customRequirements.trim()) {
      fullPrompt += ` 额外要求: ${params.customRequirements.trim()}`;
    }
    
    console.log('调用生成图片API，提示词:', fullPrompt.substring(0, 200) + '...');
    
    // 准备请求数据
    const formData = new FormData();
    formData.append('prompt', fullPrompt);
    formData.append('image', params.imageFile);
    
    // 调用API
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      if (response.status === 408) {
        throw new Error('图片生成超时，请重试或选择其他风格');
      }
      throw new Error(`API调用失败: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('API响应:', data);
    
    if (!data.success || !data.urls || !Array.isArray(data.urls)) {
      throw new Error('API响应格式错误：未找到图片URLs');
    }
    
    console.log(`生成成功，获得${data.urls.length}张图片URL`);
    return data.urls;
    
  } catch (error) {
    console.error('图片生成API调用失败:', error);
    throw error;
  }
}