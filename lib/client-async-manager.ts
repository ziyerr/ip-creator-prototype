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
  imageFileData: string;
  imageFileName: string;
  imageFileType: string;
  style: string;
  retryCount?: number; // 重试次数
  lastAttemptTime?: number; // 最后一次尝试时间
  maxRetries?: number; // 最大重试次数
}

interface TaskProgress {
  progress: number;
  message: string;
  status: string;
}

class ClientAsyncManager {
  private readonly STORAGE_KEY = 'ip_creator_tasks';
  private readonly TASK_EXPIRY = 30 * 60 * 1000; // 30分钟
  private readonly RETRY_TIMEOUT = 2 * 60 * 1000; // 2分钟超时重试
  private readonly MAX_AUTO_RETRIES = 2; // 最大自动重试次数

  // 创建新任务
  async createTask(prompt: string, imageFile: File, style: string): Promise<string> {
    const taskId = `client_task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 🔧 将File对象转换为base64以便存储到localStorage
    const imageFileData = await this.fileToBase64(imageFile);
    
    const task: ClientTask = {
      taskId,
      status: 'pending',
      progress: 0,
      results: [],
      createdAt: Date.now(),
      prompt,
      imageFileData, // 存储base64数据
      imageFileName: imageFile.name,
      imageFileType: imageFile.type,
      style,
      retryCount: 0,
      lastAttemptTime: Date.now(),
      maxRetries: this.MAX_AUTO_RETRIES
    };

    // 存储到localStorage
    this.saveTask(task);
    
    console.log('🚀 创建前端异步任务:', taskId);
    
    // 立即开始处理任务
    this.processTask(taskId);
    
    // 🕒 启动2分钟超时检测
    this.startTimeoutMonitoring(taskId);
    
    // 🔄 启动5秒间隔轮询监听机制
    this.startPollingMonitoring(taskId);
    
    return taskId;
  }

  // 🕒 启动2分钟超时检测
  private startTimeoutMonitoring(taskId: string): void {
    const checkTimeout = () => {
      const task = this.getTaskStatus(taskId);
      if (!task) return; // 任务不存在，停止监控
      
      // 如果任务已完成或失败，停止监控
      if (task.status === 'completed' || task.status === 'failed') {
        return;
      }
      
      const now = Date.now();
      const timeSinceLastAttempt = now - (task.lastAttemptTime || task.createdAt);
      
      // 如果超过2分钟没有更新，检查是否需要重试
      if (timeSinceLastAttempt > this.RETRY_TIMEOUT) {
        const currentRetryCount = task.retryCount || 0;
        
        if (currentRetryCount < this.MAX_AUTO_RETRIES) {
          console.log(`⏰ 任务 ${taskId} 超过2分钟未完成，开始第${currentRetryCount + 1}次自动重试...`);
          this.retryTask(taskId);
        } else {
          console.log(`❌ 任务 ${taskId} 已达到最大重试次数(${this.MAX_AUTO_RETRIES})，任务失败`);
          this.updateTaskStatus(
            taskId, 
            'failed', 
            0, 
            undefined, 
            undefined, 
            `任务超时：已重试${this.MAX_AUTO_RETRIES}次，均超过2分钟未完成。请检查网络连接或稍后重试`
          );
          return;
        }
      }
      
      // 继续监控（每30秒检查一次）
      setTimeout(checkTimeout, 30 * 1000);
    };
    
    // 首次检查延迟2分钟
    setTimeout(checkTimeout, this.RETRY_TIMEOUT);
  }

  // 🔄 重试任务
  private async retryTask(taskId: string): Promise<void> {
    const task = this.getTaskStatus(taskId);
    if (!task) return;
    
    // 更新重试计数和时间
    task.retryCount = (task.retryCount || 0) + 1;
    task.lastAttemptTime = Date.now();
    task.status = 'pending';
    task.progress = 0;
    task.results = []; // 清空之前的结果，重新开始
    task.error = undefined;
    
    this.saveTask(task);
    
    const retryMessage = `🔄 第${task.retryCount}次自动重试 (${task.retryCount}/${this.MAX_AUTO_RETRIES})`;
    console.log(`${retryMessage} - 任务 ${taskId}`);
    
    // 更新UI显示重试状态
    this.updateTaskStatus(taskId, 'pending', 5, `${retryMessage} - 重新开始生成...`);
    
    // 重新开始处理任务
    this.processTask(taskId);
    
    // 重新启动超时监控
    this.startTimeoutMonitoring(taskId);
  }

  // 将File对象转换为base64字符串
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        // 移除data:image/xxx;base64,前缀，只保留base64数据
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // 将base64字符串转换回File对象
  private base64ToFile(base64Data: string, fileName: string, fileType: string): File {
    // 将base64转换为Uint8Array
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    
    // 创建File对象
    return new File([byteArray], fileName, { type: fileType });
  }

  // 查询任务状态
  getTaskStatus(taskId: string): ClientTask | null {
    const tasks = this.getAllTasks();
    return tasks[taskId] || null;
  }

  // 处理任务（在前端执行）
  private async processTask(taskId: string): Promise<void> {
    const task = this.getTaskStatus(taskId);
    if (!task || task.status !== 'pending') return;

    try {
      console.log(`📋 开始处理前端任务 ${taskId}...`);
      
      // 🔄 显示重试信息（如果是重试）
      const retryInfo = (task.retryCount && task.retryCount > 0) 
        ? ` (第${task.retryCount}次重试)` 
        : '';
      
      this.updateTaskStatus(taskId, 'processing', 10, `🔍 正在分析上传图片...${retryInfo}`);

      // 根据风格构建提示词
      const stylePrompts = {
        cute: `Chibi full-body illustration of the main character from [REF_IMAGE], ignore any background. Precisely preserve the hairstyle, any existing accessories, facial features, expression, gender, and temperament from the reference image, with a slightly slimmer face. IMPORTANT: Only include accessories if they are clearly visible in the reference image. Head-to-body ratio around 1:1.2; big eyes, rounded simplified limbs; layered line art distinguishing: hairstyle, face, torso, limbs, and any visible accessories; flat pastel color block fills with subtle cel-shading shadows and highlight distinction; overall style cute yet handsome; high-resolution square canvas, 1:1 aspect ratio.`,
        toy: `3D isometric full-body toy figurine of the main character from [REF_IMAGE], ignore any background. Preserve exactly the hairstyle, any existing accessories, facial features, expression, gender and temperament from the reference, with a slightly slimmer face. IMPORTANT: Only include accessories if they are clearly visible in the reference image. Render smooth vinyl-like surfaces with clear segmentation into head, torso, arms, legs, joints and any visible accessories; use consistent bevel outlines and soft plastic material feel; apply muted yet vibrant color zones and subtle studio reflections; maintain a perfect blend of adorable and handsome; photorealistic 3D render, square 1:1 aspect ratio.`,
        cyber: `Cyberpunk full-body character illustration of the main character from [REF_IMAGE], ignore any background, square 1:1 canvas. Precisely preserve the hairstyle, any existing accessories, facial features, expression, gender and temperament from the reference, with a slightly slimmer face. IMPORTANT: Only include accessories if they are clearly visible in the reference image. Clear layered segmentation: hairstyle, face, upper-body armor/clothing, lower-body combat suit, limbs and any visible accessories; armor and clothing surfaces covered with glowing neon circuit patterns; distinct metallic and leather textures; blend high reflections with deep shadows, incorporating neon light reflections; dynamic pose emphasizing futuristic and cyberpunk aesthetics; high-resolution digital painting.`
      };

      const stylePrompt = stylePrompts[task.style as keyof typeof stylePrompts] || stylePrompts.cute;
      let finalPrompt = stylePrompt.replace('[REF_IMAGE]', 'the uploaded reference image');
      finalPrompt += `. CRITICAL: Generate a character based on the uploaded reference image. Maintain the SAME SUBJECT TYPE (if it's an animal, generate an animal; if it's a person, generate a person). Preserve the key characteristics while applying the artistic style.`;

      this.updateTaskStatus(taskId, 'processing', 30, `🎨 AI正在并行生成3张专属IP形象...${retryInfo}`);

      // 🌊 生成策略选择：并行 vs 串行
      const USE_PARALLEL_GENERATION = true; // 🔥 设置为true启用同时生成3张图片
      
      if (USE_PARALLEL_GENERATION) {
        console.log('🚀 启用并行模式：同时生成3张图片...');
        await this.generateImagesInParallel(taskId, task, finalPrompt, retryInfo, 2, 3);
      } else {
        console.log('🌊 启用串行模式：一张一张生成图片...');
        await this.generateImagesInSequence(taskId, task, finalPrompt, retryInfo, 2, 3);
      }

    } catch (error) {
      console.error(`❌ 前端异步任务 ${taskId} 处理失败:`, error);
      
      // 增强错误信息
      let errorMessage = error instanceof Error ? error.message : String(error);
      
      // 分析错误类型并提供具体建议
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('网络')) {
        errorMessage = '网络连接失败，请检查网络连接后重试';
      } else if (errorMessage.includes('File对象') || errorMessage.includes('文件处理')) {
        errorMessage = '图片文件处理失败，请重新上传图片';
      } else if (errorMessage.includes('API调用失败')) {
        errorMessage = '图片生成服务暂时不可用，请稍后重试';
      } else if (errorMessage.includes('localStorage')) {
        errorMessage = '浏览器存储异常，请清理缓存或刷新页面重试';
      }
      
      const retryInfo = (task.retryCount && task.retryCount > 0) 
        ? ` (第${task.retryCount}次重试失败)` 
        : '';
      
      this.updateTaskStatus(taskId, 'failed', 0, undefined, undefined, errorMessage + retryInfo);
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
    task.lastAttemptTime = Date.now(); // 🕒 更新最后活动时间
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

  // 🔄 获取带重试信息的状态消息
  getDetailedStatusMessage(taskId: string): string {
    const task = this.getTaskStatus(taskId);
    if (!task) return '❓ 任务不存在';

    const baseMessage = this.getStatusMessage(task.status, task.progress);
    const retryInfo = (task.retryCount && task.retryCount > 0) 
      ? ` (第${task.retryCount}次重试)` 
      : '';

    // 如果任务失败且还有重试机会，显示重试倒计时
    if (task.status === 'failed' && task.retryCount && task.retryCount < this.MAX_AUTO_RETRIES) {
      const timeLeft = this.RETRY_TIMEOUT - (Date.now() - (task.lastAttemptTime || task.createdAt));
      if (timeLeft > 0) {
        const minutesLeft = Math.ceil(timeLeft / (60 * 1000));
        return `⏰ 任务失败，将在${minutesLeft}分钟后自动重试 (第${(task.retryCount || 0) + 1}次重试)`;
      }
    }

    return baseMessage + retryInfo;
  }

  // 🕒 检查任务是否需要重试提醒
  checkRetryStatus(taskId: string): { needsRetry: boolean; timeLeft: number; retryCount: number } {
    const task = this.getTaskStatus(taskId);
    if (!task) return { needsRetry: false, timeLeft: 0, retryCount: 0 };

    const now = Date.now();
    const timeSinceLastAttempt = now - (task.lastAttemptTime || task.createdAt);
    const currentRetryCount = task.retryCount || 0;
    
    const needsRetry = task.status === 'processing' && 
                      timeSinceLastAttempt > this.RETRY_TIMEOUT && 
                      currentRetryCount < this.MAX_AUTO_RETRIES;
    
    const timeLeft = Math.max(0, this.RETRY_TIMEOUT - timeSinceLastAttempt);
    
    return {
      needsRetry,
      timeLeft,
      retryCount: currentRetryCount
    };
  }

  // 清理所有任务
  clearAllTasks(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('已清理所有本地任务');
  }

  // 🔄 启动5秒间隔轮询监听机制
  private startPollingMonitoring(taskId: string): void {
    const pollInterval = 5000; // 5秒间隔
    
    const pollTask = () => {
      const task = this.getTaskStatus(taskId);
      if (!task) {
        console.log(`📭 任务 ${taskId} 不存在，停止轮询监听`);
        return; // 任务不存在，停止轮询
      }
      
      // 如果任务已完成或失败，停止轮询
      if (task.status === 'completed' || task.status === 'failed') {
        console.log(`🏁 任务 ${taskId} 已${task.status === 'completed' ? '完成' : '失败'}，停止轮询监听`);
        return;
      }
      
      // 🔍 检查是否有新的图片结果
      const currentResults = task.results || [];
      const resultCount = currentResults.length;
      
      console.log(`🔍 轮询检查任务 ${taskId}: 状态=${task.status}, 进度=${task.progress}%, 图片数=${resultCount}`);
      
      // 如果有新图片，触发UI更新（通过自定义事件）
      if (resultCount > 0) {
        console.log(`📸 发现${resultCount}张新图片，触发UI更新事件`);
        
        // 发送自定义事件通知UI更新
        const updateEvent = new CustomEvent('taskProgressUpdate', {
          detail: {
            taskId,
            status: task.status,
            progress: task.progress,
            results: currentResults,
            message: `已生成${resultCount}张图片，继续生成中...`,
            timestamp: Date.now()
          }
        });
        
        window.dispatchEvent(updateEvent);
      }
      
      // 🎯 根据当前状态提供详细反馈
      let statusMessage = '';
      if (task.status === 'processing') {
        if (task.progress < 40) {
          statusMessage = '🔍 正在分析上传图片和准备生成参数...';
        } else if (resultCount === 0) {
          statusMessage = '🎨 AI正在努力生成第1张图片...';
        } else if (resultCount === 1) {
          statusMessage = '🖼️ 第1张图片已完成，正在生成第2张...';
        } else if (resultCount === 2) {
          statusMessage = '🎉 已完成2张图片，正在生成最后1张...';
        } else {
          statusMessage = '✨ 正在验证和优化生成结果...';
        }
        
        // 发送状态更新事件
        const statusEvent = new CustomEvent('taskStatusUpdate', {
          detail: {
            taskId,
            message: statusMessage,
            progress: task.progress,
            resultCount,
            timestamp: Date.now()
          }
        });
        
        window.dispatchEvent(statusEvent);
      }
      
      // 继续轮询（每5秒检查一次）
      setTimeout(pollTask, pollInterval);
    };
    
    // 立即开始第一次轮询
    setTimeout(pollTask, 1000); // 1秒后开始轮询
  }

  // 🚀 并行生成策略：同时生成3张图片
  private async generateImagesInParallel(taskId: string, task: ClientTask, finalPrompt: string, retryInfo: string, maxRetries: number, totalImages: number): Promise<void> {
    console.log(`🚀 开始并行生成${totalImages}张图片...`);
    
    // 更新状态
    this.updateTaskStatus(taskId, 'processing', 40, `🚀 同时启动${totalImages}张图片生成...${retryInfo}`);
    
    // 创建3个并行的生成任务
    const generateSingleImage = async (imageIndex: number): Promise<{ index: number; url: string | null; error: string | null }> => {
      console.log(`🖼️ 启动第${imageIndex + 1}张图片生成任务...`);
      
      let lastError: Error | null = null;
      
      for (let retry = 0; retry <= maxRetries; retry++) {
        try {
          console.log(`🌐 第${imageIndex + 1}张图片API调用 (尝试 ${retry + 1}/${maxRetries + 1})...`);
          
          // 🎲 为每张图片添加独特变化种子
          const variationSeed = `${imageIndex}_${retry}_${Date.now()}`;
          
          // 构建请求
          const formData = new FormData();
          
          // 🔧 从base64重新构造File对象
          let imageFile: File;
          try {
            imageFile = this.base64ToFile(task.imageFileData, task.imageFileName, task.imageFileType);
            
            if (!imageFile || imageFile.size === 0) {
              throw new Error('重构的File对象无效或为空');
            }
            
            console.log(`✅ 第${imageIndex + 1}张图片File对象重构成功: ${imageFile.size} bytes`);
            
          } catch (fileError) {
            console.error(`❌ 第${imageIndex + 1}张图片File对象重构失败:`, fileError);
            throw new Error(`图片文件处理失败: ${fileError instanceof Error ? fileError.message : String(fileError)}`);
          }
          
          formData.append('prompt', finalPrompt);
          formData.append('image', imageFile);
          formData.append('variationSeed', variationSeed);

          // 🚨 超时控制
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            controller.abort();
            console.error(`❌ 第${imageIndex + 1}张图片API请求超时`);
          }, 120000); // 120秒超时（并行时给更多时间）

          const response = await fetch('/api/generate-single-image', {
            method: 'POST',
            body: formData,
            signal: controller.signal,
            headers: {
              'Accept': 'application/json',
            }
          }).finally(() => {
            clearTimeout(timeoutId);
          });

          if (!response.ok) {
            let errorDetails = '';
            try {
              const errorData = await response.json();
              errorDetails = errorData.details || errorData.error || errorData.message || '';
            } catch {
              errorDetails = await response.text().catch(() => '无法解析错误响应');
            }
            
            console.error(`❌ 第${imageIndex + 1}张图片API响应错误 ${response.status}:`, errorDetails);
            throw new Error(`第${imageIndex + 1}张图片API调用失败: HTTP ${response.status} - ${errorDetails}`);
          }

          const data = await response.json();
          
          if (!data.success || !data.url) {
            console.error(`❌ 第${imageIndex + 1}张图片API响应格式错误:`, data);
            throw new Error(`第${imageIndex + 1}张图片API响应无效 - 缺少成功标志或URL`);
          }

          const imageUrl = data.url;
          const variationInfo = data.variation || '独特变化';
          console.log(`✅ 第${imageIndex + 1}张图片生成成功 (${variationInfo}):`, imageUrl.substring(0, 100) + '...');
          
          return { index: imageIndex, url: imageUrl, error: null };
          
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.warn(`⚠️ 第${imageIndex + 1}张图片生成失败 (尝试 ${retry + 1}/${maxRetries + 1}):`, lastError.message);
          
          // 如果不是最后一次重试，等待后继续
          if (retry < maxRetries) {
            const waitTime = (retry + 1) * 1000; // 并行时缩短等待时间：1s, 2s
            console.log(`⏳ 第${imageIndex + 1}张图片等待${waitTime}ms后重试...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }
      
      // 所有重试都失败了
      const errorMessage = lastError?.message || `第${imageIndex + 1}张图片生成完全失败`;
      console.error(`❌ 第${imageIndex + 1}张图片最终失败:`, errorMessage);
      return { index: imageIndex, url: null, error: errorMessage };
    };
    
    // 🚀 同时启动3个生成任务
    console.log(`🚀 同时启动${totalImages}个并行生成任务...`);
    
    const promises = Array.from({ length: totalImages }, (_, i) => generateSingleImage(i));
    
    // 🎯 使用Promise.allSettled等待所有任务完成（不管成功失败）
    const results = await Promise.allSettled(promises);
    
    // 🔍 收集成功的结果
    const successfulImages: string[] = [];
    const failedImages: string[] = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { url, error } = result.value;
        if (url && !error) {
          successfulImages.push(url);
          console.log(`✅ 第${index + 1}张图片收集成功`);
        } else {
          failedImages.push(error || '未知错误');
          console.warn(`⚠️ 第${index + 1}张图片收集失败: ${error}`);
        }
      } else {
        failedImages.push(result.reason?.message || '任务被拒绝');
        console.error(`❌ 第${index + 1}张图片任务被拒绝:`, result.reason);
      }
    });
    
    // 🎉 批量更新结果到任务中
    const currentTask = this.getTaskStatus(taskId);
    if (currentTask) {
      currentTask.results = successfulImages; // 批量设置所有成功的图片
      
      const successCount = successfulImages.length;
      const failedCount = failedImages.length;
      
      console.log(`📊 并行生成完成: ${successCount}张成功, ${failedCount}张失败`);
      
      // 🔄 保存到localStorage
      this.saveTask(currentTask);
      
      // 🎯 验证结果
      if (successCount < 1) {
        throw new Error(`并行生成完全失败：没有成功生成任何图片。失败原因: ${failedImages.join('; ')}`);
      }
      
      // 🎉 任务完成
      const completionMessage = successCount >= 2
        ? `🎉 并行生成成功！同时完成${successCount}张图片！${retryInfo ? ` (第${task.retryCount}次重试成功)` : ''}` 
        : `🎯 部分成功！并行生成了${successCount}张图片${failedCount > 0 ? `，${failedCount}张失败` : ''}${retryInfo ? ` (第${task.retryCount}次重试)` : ''}`;

      this.updateTaskStatus(taskId, 'completed', 100, completionMessage);
      
      console.log(`✅ 并行生成任务 ${taskId} 完成: ${successCount}张成功, ${failedCount}张失败${retryInfo}`);
    }
  }

  // 🌊 串行生成策略：一张一张生成图片（原逻辑）
  private async generateImagesInSequence(taskId: string, task: ClientTask, finalPrompt: string, retryInfo: string, maxRetries: number, totalImages: number): Promise<void> {
    console.log(`🌊 开始串行生成${totalImages}张图片...`);
    
    for (let i = 0; i < totalImages; i++) {
      console.log(`🖼️ 生成第${i + 1}张独立图片 (尝试 1/${maxRetries + 1})...`);
      
      const generateSingleImageWithRetry = async (): Promise<string> => {
        let lastError: Error | null = null;

        for (let retry = 0; retry <= maxRetries; retry++) {
          try {
            console.log(`🌐 调用单图片生成API (第${i + 1}张，重试第${retry + 1}次)...`);
            
            // 🎲 为每张图片添加独特变化种子
            const variationSeed = i.toString();
            
            // 构建请求
            const formData = new FormData();
            
            // 🔧 从base64重新构造File对象，增强错误处理
            let imageFile: File;
            try {
              imageFile = this.base64ToFile(task.imageFileData, task.imageFileName, task.imageFileType);
              
              // 验证File对象
              if (!imageFile || imageFile.size === 0) {
                throw new Error('重构的File对象无效或为空');
              }
              
              console.log(`✅ File对象重构成功: ${imageFile.name}, 大小: ${imageFile.size} bytes, 类型: ${imageFile.type}`);
              
            } catch (fileError) {
              console.error('File对象重构失败:', fileError);
              throw new Error(`图片文件处理失败: ${fileError instanceof Error ? fileError.message : String(fileError)}`);
            }
            
            formData.append('prompt', finalPrompt);
            formData.append('image', imageFile);
            formData.append('variationSeed', variationSeed);

            // 🚨 增强错误处理和超时控制
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
              controller.abort();
              console.error('❌ API请求超时');
            }, 90000); // 90秒超时

            const response = await fetch('/api/generate-single-image', {
              method: 'POST',
              body: formData,
              signal: controller.signal,
              // 添加更多headers帮助调试
              headers: {
                'Accept': 'application/json',
              }
            }).finally(() => {
              clearTimeout(timeoutId);
            });

            if (!response.ok) {
              let errorDetails = '';
              try {
                const errorData = await response.json();
                errorDetails = errorData.details || errorData.error || errorData.message || '';
              } catch {
                errorDetails = await response.text().catch(() => '无法解析错误响应');
              }
              
              console.error(`❌ API响应错误 ${response.status}:`, errorDetails);
              throw new Error(`第${i + 1}张图片API调用失败: HTTP ${response.status} - ${errorDetails}`);
            }

            const data = await response.json();
            
            if (!data.success || !data.url) {
              console.error(`❌ 第${i + 1}张图片API响应格式错误:`, data);
              throw new Error(`第${i + 1}张图片API响应无效 - 缺少成功标志或URL`);
            }

            const imageUrl = data.url;
            const variationInfo = data.variation || '独特变化';
            console.log(`✅ 第${i + 1}张独立图片生成成功 (${variationInfo}):`, imageUrl.substring(0, 100) + '...');
            
            return imageUrl;
            
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            console.warn(`⚠️ 第${i + 1}张图片生成失败 (尝试 ${retry + 1}/${maxRetries + 1}):`, lastError.message);
            
            // 增强错误分类和处理
            if (lastError.name === 'AbortError') {
              console.log('🕐 请求被取消（可能是超时）');
              break; // 超时不重试
            }
            
            if (lastError.message.includes('Failed to fetch') || lastError.message.includes('网络')) {
              console.log('🌐 检测到网络连接问题');
            }
            
            // 如果不是最后一次重试，等待后继续
            if (retry < maxRetries) {
              const waitTime = (retry + 1) * 2000; // 递增等待时间：2s, 4s
              console.log(`⏳ 等待${waitTime}ms后重试...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
          }
        }
        
        // 所有重试都失败了
        throw lastError || new Error(`第${i + 1}张图片生成完全失败 - 已尝试${maxRetries + 1}次`);
      };

      try {
        // 🌊 生成单张图片
        const imageUrl = await generateSingleImageWithRetry();
        
        // 🚀 立即更新到任务结果中！用户马上就能看到这张图片
        const currentTask = this.getTaskStatus(taskId);
        if (currentTask) {
          currentTask.results.push(imageUrl);
          
          // 计算进度：每张图片完成后更新进度
          const completedImages = currentTask.results.length;
          const progress = 30 + Math.floor((completedImages / totalImages) * 60); // 30% + 60%分配给3张图片
          
          const progressMessage = retryInfo 
            ? `✨ 已完成第${completedImages}张图片${retryInfo}，继续生成中... (${completedImages}/${totalImages})`
            : `✨ 已完成第${completedImages}张图片，继续生成中... (${completedImages}/${totalImages})`;
          
          this.updateTaskStatus(taskId, 'processing', progress, progressMessage);
          
          // 🔄 保存到localStorage，让轮询立即能获取到新图片
          this.saveTask(currentTask);
          
          console.log(`🎉 第${i + 1}张图片已添加到结果中，当前进度: ${progress}%`);
        }
        
      } catch (error) {
        console.error(`❌ 第${i + 1}张图片生成最终失败:`, error);
        // 记录具体的失败原因但不中止整体任务
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`📝 失败详情: ${errorMessage}`);
        // 单张图片失败不影响其他图片继续生成
        continue;
      }
    }

    // 检查最终结果
    const finalTask = this.getTaskStatus(taskId);
    if (!finalTask) {
      throw new Error('任务状态丢失 - localStorage可能被清理');
    }
    
    const successCount = finalTask.results.length;
    const failedCount = totalImages - successCount;
    
    this.updateTaskStatus(taskId, 'processing', 90, `✨ 正在验证生成结果...${retryInfo}`);

    // 🚨 严格验证：必须至少有1张成功（降低要求以提高容错性）
    if (successCount < 1) {
      throw new Error(`生成完全失败：没有成功生成任何图片。请检查网络连接、API配置或稍后重试`);
    }

    // 🎉 任务完成
    const completionMessage = successCount >= 2
      ? `🎉 成功生成${successCount}张真实独立图片！${retryInfo ? ` (第${task.retryCount}次重试成功)` : ''}` 
      : `🎯 部分成功！生成了${successCount}张图片${failedCount > 0 ? `，${failedCount}张失败` : ''}${retryInfo ? ` (第${task.retryCount}次重试)` : ''}`;

    this.updateTaskStatus(taskId, 'completed', 100, completionMessage);
    
    console.log(`✅ 前端异步任务 ${taskId} 完成: ${successCount}张成功, ${failedCount}张失败${retryInfo}`);
  }
}

// 创建全局实例
export const clientAsyncManager = new ClientAsyncManager();

// 导出接口
export type { ClientTask, TaskProgress }; 