// 客户端API函数 - 专用于麻雀API

// 风格提示词模板 - 优化版本，更精确的特征保持
const STYLE_PROMPTS = {
  cute: `Chibi full-body illustration of the main character from [REF_IMAGE], ignore any background. Precisely preserve the hairstyle, accessories (such as glasses), facial features, expression, gender, and temperament from the reference image, with a slightly slimmer face. Head-to-body ratio around 1:1.2; big eyes, rounded simplified limbs; layered line art distinguishing: hairstyle, face, torso, limbs, accessories; flat pastel color block fills with subtle cel-shading shadows and highlight distinction; overall style cute yet handsome; high-resolution square canvas, 1:1 aspect ratio.`,
  
  toy: `3D isometric full-body toy figurine of the main character from [REF_IMAGE], ignore any background. Preserve exactly the hairstyle, accessories (e.g., glasses), facial features, expression, gender and temperament from the reference, with a slightly slimmer face. Render smooth vinyl-like surfaces with clear segmentation into head, torso, arms, legs, joints and accessories; use consistent bevel outlines and soft plastic material feel; apply muted yet vibrant color zones and subtle studio reflections; maintain a perfect blend of adorable and handsome; photorealistic 3D render, square 1:1 aspect ratio.`,
  
  cyber: `Cyberpunk full-body character illustration of the main character from [REF_IMAGE], square 1:1 canvas, ignore any background. Precisely preserve the hairstyle, accessories (such as glasses), facial features, expression, gender and temperament from the reference, with a slightly slimmer face. Clear layered segmentation: hairstyle, face, upper-body armor/clothing, lower-body combat suit, limbs and tech accessories; armor and clothing surfaces covered with glowing neon circuit patterns; distinct metallic and leather textures; blend high reflections with deep shadows, incorporating neon light reflections; dynamic pose emphasizing futuristic and cyberpunk aesthetics; high-resolution digital painting.`
}

interface GenerateImageParams {
  prompt: string
  imageFile?: File
  style?: keyof typeof STYLE_PROMPTS
  customRequirements?: string
}

export async function generateImage(params: GenerateImageParams): Promise<string> {
  // 构建完整的提示词
  let fullPrompt = params.prompt
  
  // 如果指定了风格，使用对应的模板
  if (params.style && STYLE_PROMPTS[params.style]) {
    fullPrompt = STYLE_PROMPTS[params.style]
    
    // 如果有自定义需求，添加到模板中
    if (params.customRequirements?.trim()) {
      fullPrompt += ` Additional requirements: ${params.customRequirements.trim()}`
    }
  }

  const formData = new FormData()
  formData.append('prompt', fullPrompt)
  
  if (params.imageFile) {
    formData.append('image', params.imageFile)
  }

  console.log('调用生成图片API，提示词:', fullPrompt)

  const response = await fetch('/api/generate-image', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`图片生成失败: ${errorData.error || response.statusText}`)
  }

  const data = await response.json()
  return data.url
}

export async function generateImageWithReference(params: {
  prompt: string
  imageFile: File
  style?: keyof typeof STYLE_PROMPTS
  customRequirements?: string
}): Promise<string> {
  return generateImage({
    prompt: params.prompt,
    imageFile: params.imageFile,
    style: params.style,
    customRequirements: params.customRequirements
  })
}