// 客户端API函数 - 异步任务模式

// 风格提示词模板 - 修复版本，避免误添加不存在的配饰
const STYLE_PROMPTS = {
  cute: `Chibi full-body illustration of the main character from [REF_IMAGE], ignore any background. Precisely preserve the hairstyle, any existing accessories, facial features, expression, gender, and temperament from the reference image, with a slightly slimmer face. IMPORTANT: Only include accessories if they are clearly visible in the reference image. Head-to-body ratio around 1:1.2; big eyes, rounded simplified limbs; layered line art distinguishing: hairstyle, face, torso, limbs, and any visible accessories; flat pastel color block fills with subtle cel-shading shadows and highlight distinction; overall style cute yet handsome; high-resolution square canvas, 1:1 aspect ratio.`,
  
  toy: `3D isometric full-body toy figurine of the main character from [REF_IMAGE], ignore any background. Preserve exactly the hairstyle, any existing accessories, facial features, expression, gender and temperament from the reference, with a slightly slimmer face. IMPORTANT: Only include accessories if they are clearly visible in the reference image. Render smooth vinyl-like surfaces with clear segmentation into head, torso, arms, legs, joints and any visible accessories; use consistent bevel outlines and soft plastic material feel; apply muted yet vibrant color zones and subtle studio reflections; maintain a perfect blend of adorable and handsome; photorealistic 3D render, square 1:1 aspect ratio.`,
  
  cyber: `Cyberpunk full-body character illustration of the main character from [REF_IMAGE], square 1:1 canvas, ignore any background. Precisely preserve the hairstyle, any existing accessories, facial features, expression, gender and temperament from the reference, with a slightly slimmer face. IMPORTANT: Only include accessories if they are clearly visible in the reference image. Clear layered segmentation: hairstyle, face, upper-body armor/clothing, lower-body combat suit, limbs and any visible tech accessories; armor and clothing surfaces covered with glowing neon circuit patterns; distinct metallic and leather textures; blend high reflections with deep shadows, incorporating neon light reflections; dynamic pose emphasizing futuristic and cyberpunk aesthetics; high-resolution digital painting.`
}

interface GenerateImageParams {
  prompt: string
  imageFile?: File
  style?: keyof typeof STYLE_PROMPTS
  customRequirements?: string
}

interface TaskStatus {
  taskId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  results: string[]
  error?: string
  message: string
}

// 提交图片生成任务
export async function submitImageGenerationTask(params: GenerateImageParams): Promise<string> {
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

  console.log('提交异步图片生成任务，提示词:', fullPrompt)

  const response = await fetch('/api/generate-image', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`任务提交失败: ${errorData.error || response.statusText}`)
  }

  const data = await response.json()
  console.log('任务提交成功:', data)
  
  return data.taskId
}

// 查询任务状态
export async function queryTaskStatus(taskId: string): Promise<TaskStatus> {
  const formData = new FormData()
  formData.append('action', 'query')
  formData.append('taskId', taskId)

  const response = await fetch('/api/generate-image', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`查询任务状态失败: ${errorData.error || response.statusText}`)
  }

  const data = await response.json()
  return data as TaskStatus
}

// 轮询等待任务完成
export async function waitForTaskCompletion(
  taskId: string, 
  onProgress?: (status: TaskStatus) => void,
  maxWaitTime: number = 120000 // 2分钟超时
): Promise<string[]> {
  const startTime = Date.now()
  const pollInterval = 3000 // 3秒轮询一次
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const status = await queryTaskStatus(taskId)
      
      // 调用进度回调
      if (onProgress) {
        onProgress(status)
      }
      
      console.log(`任务 ${taskId} 状态:`, status.status, `进度: ${status.progress}%`)
      
      if (status.status === 'completed') {
        console.log(`任务完成，生成了 ${status.results.length} 张图片`)
        return status.results
      }
      
      if (status.status === 'failed') {
        throw new Error(`图片生成失败: ${status.error || '未知错误'}`)
      }
      
      // 等待后继续轮询
      await new Promise(resolve => setTimeout(resolve, pollInterval))
      
    } catch (error) {
      console.error('查询任务状态出错:', error)
      // 继续轮询，除非是致命错误
      if (error instanceof Error && error.message.includes('任务不存在')) {
        throw error
      }
      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }
  }
  
  throw new Error('任务等待超时，请稍后查看结果或重新生成')
}

// 完整的图片生成流程（提交任务+等待完成）
export async function generateImageWithReference(
  params: {
    prompt: string
    imageFile: File
    style?: keyof typeof STYLE_PROMPTS
    customRequirements?: string
  },
  onProgress?: (status: TaskStatus) => void
): Promise<string[]> {
  // 1. 提交任务
  const taskId = await submitImageGenerationTask({
    prompt: params.prompt,
    imageFile: params.imageFile,
    style: params.style,
    customRequirements: params.customRequirements
  })
  
  console.log('任务已提交，ID:', taskId)
  
  // 2. 等待任务完成
  const results = await waitForTaskCompletion(taskId, onProgress)
  
  return results
}