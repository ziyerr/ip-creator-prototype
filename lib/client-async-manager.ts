// 浏览器本地异步任务管理器 - 完全前端实现
// 使用localStorage存储任务状态，避免服务器内存依赖

interface ClientTask {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  results: string[];
  error?: string;
  createdAt: number;
  prompt: string;
  imageFile: File;
  style: string;
}

interface TaskProgress {
  progress: number;
  message: string;
  status: string;
}

class ClientAsyncManager {
  private readonly STORAGE_KEY = 'ip_creator_tasks';
  private readonly TASK_EXPIRY = 30 * 60 * 1000; // 30分钟

  // 创建新任务
  async createTask(prompt: string, imageFile: File, style: string): Promise<string> {
    const taskId = `client_task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const task: ClientTask = {
      taskId,
      status: 'pending',
      progress: 0,
      results: [],
      createdAt: Date.now(),
      prompt,
      imageFile,
      style
    };

    // 存储到localStorage
    this.saveTask(task);
    
    console.log('🚀 创建前端异步任务:', taskId);
    
    // 立即开始处理任务
    this.processTask(taskId);
    
    return taskId;
  }

  // 查询任务状态
  getTaskStatus(taskId: string): ClientTask | null {
    const tasks = this.getAllTasks();
    return tasks[taskId] || null;
  }

  // 处理任务（在前端执行）
  private async processTask(taskId: string): Promise<void> {
    const task = this.getTaskStatus(taskId);
    if (!task) return;

    try {
      console.log(`📋 开始处理前端任务 ${taskId}...`);
      
      // 更新状态
      this.updateTaskStatus(taskId, 'processing', 10, '🔍 正在分析上传图片...');

      // 🔧 使用新的单图片生成API端点
      const stylePrompts = {
        cute: `Chibi full-body illustration of the main character from [REF_IMAGE], ignore any background. Precisely preserve the hairstyle, any existing accessories, facial features, expression, gender, and temperament from the reference image, with a slightly slimmer face. IMPORTANT: Only include accessories if they are clearly visible in the reference image. Head-to-body ratio around 1:1.2; big eyes, rounded simplified limbs; layered line art distinguishing: hairstyle, face, torso, limbs, and any visible accessories; flat pastel color block fills with subtle cel-shading shadows and highlight distinction; overall style cute yet handsome; high-resolution square canvas, 1:1 aspect ratio.`,
        toy: `3D isometric full-body toy figurine of the main character from [REF_IMAGE], ignore any background. Preserve exactly the hairstyle, any existing accessories, facial features, expression, gender and temperament from the reference, with a slightly slimmer face. IMPORTANT: Only include accessories if they are clearly visible in the reference image. Render smooth vinyl-like surfaces with clear segmentation into head, torso, arms, legs, joints and any visible accessories; use consistent bevel outlines and soft plastic material feel; apply muted yet vibrant color zones and subtle studio reflections; maintain a perfect blend of adorable and handsome; photorealistic 3D render, square 1:1 aspect ratio.`,
        cyber: `Cyberpunk full-body character illustration of the main character from [REF_IMAGE], ignore any background, square 1:1 canvas. Precisely preserve the hairstyle, any existing accessories, facial features, expression, gender and temperament from the reference, with a slightly slimmer face. IMPORTANT: Only include accessories if they are clearly visible in the reference image. Clear layered segmentation: hairstyle, face, upper-body armor/clothing, lower-body combat suit, limbs and any visible accessories; armor and clothing surfaces covered with glowing neon circuit patterns; distinct metallic and leather textures; blend high reflections with deep shadows, incorporating neon light reflections; dynamic pose emphasizing futuristic and cyberpunk aesthetics; high-resolution digital painting.`
      };

      const stylePrompt = stylePrompts[task.style as keyof typeof stylePrompts] || stylePrompts.cute;
      let finalPrompt = stylePrompt.replace('[REF_IMAGE]', 'the uploaded reference image');
      finalPrompt += `. CRITICAL: Generate a character based on the uploaded reference image. Maintain the SAME SUBJECT TYPE (if it's an animal, generate an animal; if it's a person, generate a person). Preserve the key characteristics while applying the artistic style.`;

      this.updateTaskStatus(taskId, 'processing', 30, '🎨 AI正在并行生成3张专属IP形象...');

      // 🚀 并行调用新的单图片生成API，每次生成1张
      const promises = [];
      for (let i = 0; i < 3; i++) {
        const generateSingleImageWithRetry = async (): Promise<string> => {
          const maxRetries = 2; // 最多重试2次
          let lastError: Error | null = null;
          
          for (let retry = 0; retry <= maxRetries; retry++) {
            try {
              console.log(`🖼️ 生成第${i + 1}张图片 (尝试 ${retry + 1}/${maxRetries + 1})...`);

              // 准备FormData
              const formData = new FormData();
              formData.append('prompt', finalPrompt);
              formData.append('image', task.imageFile);

              // 调用新的单图片生成API端点（Node.js Runtime，45秒超时）
              const response = await fetch('/api/generate-single-image', {
                method: 'POST',
                body: formData,
              });

              if (!response.ok) {
                if (response.status === 408) {
                  throw new Error(`第${i + 1}张图片生成超时`);
                }
                const errorText = await response.text();
                console.error(`第${i + 1}张图片API错误:`, response.status, errorText);
                throw new Error(`第${i + 1}张图片API调用失败: ${response.status}`);
              }

              const data = await response.json();
              console.log(`第${i + 1}张图片API响应:`, data);
              
              // 提取图片URL
              if (!data.success || !data.url) {
                console.error(`第${i + 1}张图片未找到URL，API响应:`, data);
                throw new Error(`第${i + 1}张图片未找到有效URL`);
              }

              const imageUrl = data.url;
              console.log(`✅ 第${i + 1}张图片生成成功:`, imageUrl.substring(0, 100) + '...');
              return imageUrl;
              
            } catch (error) {
              lastError = error instanceof Error ? error : new Error(String(error));
              console.warn(`第${i + 1}张图片生成失败 (尝试 ${retry + 1}/${maxRetries + 1}):`, lastError.message);
              
              // 如果不是最后一次重试，等待一下再重试
              if (retry < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
              }
            }
          }
          
          // 所有重试都失败了
          throw lastError || new Error(`第${i + 1}张图片生成完全失败`);
        };

        promises.push(generateSingleImageWithRetry());
      }

      this.updateTaskStatus(taskId, 'processing', 60, '⏳ 等待所有图片生成完成...');

      // 🔄 允许部分失败：至少成功生成1张图片就算成功
      const results = await Promise.allSettled(promises);
      
      this.updateTaskStatus(taskId, 'processing', 90, '✨ 正在处理和验证生成结果...');

      // 处理结果
      const successResults = results
        .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
        .map(result => result.value);
      
      const failedCount = results.length - successResults.length;
      
      if (successResults.length === 0) {
        throw new Error('所有图片生成均失败，请检查网络连接或稍后重试');
      }

      // 如果只成功了部分图片，补充成3张（复制成功的图片）
      while (successResults.length < 3) {
        successResults.push(successResults[0]); // 复制第一张成功的图片
      }

      // 完成任务
      const completionMessage = failedCount > 0 
        ? `🎉 生成完成！成功${3 - failedCount}张，失败${failedCount}张` 
        : '🎉 所有图片生成完成！';
        
      this.updateTaskStatus(taskId, 'completed', 100, completionMessage, successResults.slice(0, 3));
      
      console.log(`🎊 前端任务 ${taskId} 完成，成功生成 ${3 - failedCount} 张图片，失败 ${failedCount} 张`);

    } catch (error) {
      console.error(`❌ 前端任务 ${taskId} 处理失败:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.updateTaskStatus(taskId, 'failed', 0, `生成失败: ${errorMessage}`, [], errorMessage);
    }
  }

  // 更新任务状态
  private updateTaskStatus(
    taskId: string, 
    status: ClientTask['status'], 
    progress: number, 
    message?: string, 
    results?: string[], 
    error?: string
  ): void {
    const task = this.getTaskStatus(taskId);
    if (!task) return;

    task.status = status;
    task.progress = progress;
    if (results) task.results = results;
    if (error) task.error = error;

    this.saveTask(task);
    console.log(`📊 任务 ${taskId} 状态更新: ${status} ${progress}% ${message || ''}`);
  }

  // 保存任务到localStorage
  private saveTask(task: ClientTask): void {
    const tasks = this.getAllTasks();
    tasks[task.taskId] = task;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tasks));
  }

  // 获取所有任务
  private getAllTasks(): Record<string, ClientTask> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return {};
      const tasks = JSON.parse(data);
      
      // 清理过期任务
      const now = Date.now();
      Object.keys(tasks).forEach(taskId => {
        if (now - tasks[taskId].createdAt > this.TASK_EXPIRY) {
          delete tasks[taskId];
        }
      });
      
      return tasks;
    } catch (error) {
      console.error('读取localStorage任务失败:', error);
      return {};
    }
  }

  // 获取状态消息
  getStatusMessage(status: string, progress: number): string {
    switch (status) {
      case 'pending':
        return '⏳ 任务已创建，等待开始处理...';
      case 'processing':
        if (progress < 40) return '🔍 正在分析上传图片和准备生成参数...';
        if (progress < 80) return '🎨 AI正在并行生成3张专属IP形象...';
        if (progress < 95) return '✨ 正在优化和验证生成结果...';
        return '🎉 即将完成，准备展示结果...';
      case 'completed':
        return '✅ 所有图片生成完成！';
      case 'failed':
        return '❌ 生成失败，请重试';
      default:
        return '状态未知';
    }
  }

  // 清理所有任务
  clearAllTasks(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('🗑️ 已清理所有本地任务');
  }
}

// 创建全局实例
export const clientAsyncManager = new ClientAsyncManager();

// 导出接口
export type { ClientTask, TaskProgress }; 