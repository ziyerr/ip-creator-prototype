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
  mode?: 'sync' | 'async'; // 新增模式选择
}

// 同步模式图片生成（Edge Runtime，20秒超时）
export async function generateImageWithReference(
  params: GenerateImageParams
): Promise<string[]> {
  try {
    console.log('调用同步图片生成API（Edge Runtime）...');
    
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
        throw new Error('图片生成超时，建议尝试异步模式');
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

// 异步模式图片生成（无时间限制，支持真正的3张独立图片）
export async function generateImageAsync(
  params: GenerateImageParams,
  onProgress?: (status: { progress: number; message: string; status: string }) => void
): Promise<string[]> {
  try {
    console.log('开始异步图片生成任务...');
    
    // 构建完整提示词
    const stylePrompt = STYLE_PROMPTS[params.style];
    let fullPrompt = stylePrompt;
    
    // 添加自定义需求
    if (params.customRequirements && params.customRequirements.trim()) {
      fullPrompt += ` 额外要求: ${params.customRequirements.trim()}`;
    }
    
    // 1. 提交任务
    const formData = new FormData();
    formData.append('prompt', fullPrompt);
    formData.append('image', params.imageFile);
    
    const submitResponse = await fetch('/api/generate-image-async', {
      method: 'POST',
      body: formData,
    });
    
    if (!submitResponse.ok) {
      throw new Error(`任务提交失败: ${submitResponse.status}`);
    }
    
    const submitData = await submitResponse.json();
    const taskId = submitData.taskId;
    
    console.log('任务提交成功，ID:', taskId);
    
    // 2. 轮询任务状态
    return new Promise((resolve, reject) => {
      const pollInterval = setInterval(async () => {
        try {
          const queryFormData = new FormData();
          queryFormData.append('action', 'query');
          queryFormData.append('taskId', taskId);
          
          const queryResponse = await fetch('/api/generate-image-async', {
            method: 'POST',
            body: queryFormData,
          });
          
          if (!queryResponse.ok) {
            throw new Error(`查询失败: ${queryResponse.status}`);
          }
          
          const queryData = await queryResponse.json();
          
          // 调用进度回调
          if (onProgress) {
            onProgress({
              progress: queryData.progress,
              message: queryData.message,
              status: queryData.status
            });
          }
          
          console.log(`任务 ${taskId} 状态: ${queryData.status} 进度: ${queryData.progress}%`);
          
          if (queryData.status === 'completed') {
            clearInterval(pollInterval);
            console.log(`异步任务完成，生成了${queryData.results.length}张图片`);
            resolve(queryData.results);
          } else if (queryData.status === 'failed') {
            clearInterval(pollInterval);
            reject(new Error(queryData.error || '异步任务失败'));
          }
          
        } catch (error) {
          clearInterval(pollInterval);
          reject(error);
        }
      }, 3000); // 每3秒查询一次
      
      // 2分钟超时
      setTimeout(() => {
        clearInterval(pollInterval);
        reject(new Error('异步任务超时'));
      }, 120000);
    });
    
  } catch (error) {
    console.error('异步图片生成失败:', error);
    throw error;
  }
}

// 导入前端异步管理器
import { clientAsyncManager, type ClientTask } from './client-async-manager';

// 🚀 新增：浏览器本地缓存异步生成函数 - 支持5秒间隔实时图片显示
export async function generateImageWithClientAsync(params: {
  prompt: string;
  imageFile: File;
  style: 'cute' | 'toy' | 'cyber';
  customRequirements?: string;
}, onProgress?: (progress: { status: string; progress: number; message: string; results?: string[]; resultCount?: number }) => void): Promise<string[]> {
  
  console.log('🌐 启动前端异步模式，使用浏览器本地缓存...');
  
  // 构建完整提示词
  let fullPrompt = params.prompt;
  if (params.customRequirements) {
    fullPrompt += ` 用户自定义需求: ${params.customRequirements}`;
  }
  
  // 创建前端异步任务
  const taskId = await clientAsyncManager.createTask(
    fullPrompt, 
    params.imageFile, 
    params.style
  );
  
  console.log(`📋 前端任务创建成功: ${taskId}`);
  
  // 设置事件监听器 - 监听5秒间隔的轮询结果
  return new Promise((resolve, reject) => {
    let lastResultCount = 0; // 记录上次显示的图片数量
    
    // 监听任务进度更新事件（包含图片结果）
    const handleProgressUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { taskId: eventTaskId, status, progress, results, message } = customEvent.detail;
      
      // 只处理当前任务的事件
      if (eventTaskId !== taskId) return;
      
      const currentResultCount = results ? results.length : 0;
      
      console.log(`📸 收到任务进度更新: ${currentResultCount}张图片, 进度${progress}%`);
      
      // 如果有新图片或进度更新，立即通知UI
      if (onProgress) {
        onProgress({
          status,
          progress,
          message: message || `已生成${currentResultCount}张图片...`,
          results: results || [],
          resultCount: currentResultCount
        });
      }
      
      // 记录当前图片数量
      lastResultCount = currentResultCount;
    };
    
    // 监听任务状态更新事件（状态消息）
    const handleStatusUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { taskId: eventTaskId, message, progress, resultCount } = customEvent.detail;
      
      // 只处理当前任务的事件
      if (eventTaskId !== taskId) return;
      
      console.log(`📋 收到状态更新: ${message}`);
      
      // 更新状态消息
      if (onProgress) {
        onProgress({
          status: 'processing',
          progress: progress || 0,
          message: message,
          resultCount: resultCount || 0
        });
      }
    };
    
    // 添加事件监听器
    window.addEventListener('taskProgressUpdate', handleProgressUpdate);
    window.addEventListener('taskStatusUpdate', handleStatusUpdate);
    
    // 设置主要轮询检查（作为备用机制）
    const pollInterval = 3000; // 3秒轮询一次作为备用
    const maxPollTime = 8 * 60 * 1000; // 最多轮询8分钟（比前端任务超时时间长）
    const startTime = Date.now();
    
    const poll = () => {
      const task = clientAsyncManager.getTaskStatus(taskId);
      
      if (!task) {
        cleanup();
        reject(new Error('任务不存在或已过期'));
        return;
      }
      
      console.log(`🔍 备用轮询检查: ${task.status} ${task.progress}% (${task.results.length}张图片)`);
      
      // 如果有新图片且5秒监听没有触发，手动触发更新
      if (task.results.length > lastResultCount) {
        console.log(`📸 备用轮询发现新图片: ${task.results.length}张`);
        
        if (onProgress) {
          onProgress({
            status: task.status,
            progress: task.progress,
            message: `已生成${task.results.length}张图片...`,
            results: task.results,
            resultCount: task.results.length
          });
        }
        
        lastResultCount = task.results.length;
      }
      
      // 检查任务状态
      if (task.status === 'completed') {
        console.log(`✅ 前端异步任务完成，获得 ${task.results.length} 张图片`);
        cleanup();
        resolve(task.results);
        return;
      }
      
      if (task.status === 'failed') {
        const errorMsg = task.error || '未知错误';
        console.error(`❌ 前端异步任务失败: ${errorMsg}`);
        cleanup();
        reject(new Error(errorMsg));
        return;
      }
      
      // 检查超时
      if (Date.now() - startTime > maxPollTime) {
        console.error('🕐 前端异步任务轮询超时');
        cleanup();
        reject(new Error('前端异步任务轮询超时，请刷新页面重试'));
        return;
      }
      
      // 继续轮询
      setTimeout(poll, pollInterval);
    };
    
    // 清理函数
    const cleanup = () => {
      window.removeEventListener('taskProgressUpdate', handleProgressUpdate);
      window.removeEventListener('taskStatusUpdate', handleStatusUpdate);
    };
    
    // 开始轮询（延迟启动，优先使用5秒监听机制）
    setTimeout(poll, 6000); // 6秒后开始备用轮询
  });
}