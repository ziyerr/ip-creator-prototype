// 🎯 轮询式图像生成任务管理器
// 支持任务创建、状态查询、结果获取

export interface ImageTask {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  prompt: string;
  imageData?: {
    buffer: ArrayBuffer;
    name: string;
    type: string;
  };
  results: string[]; // 生成的图片URL数组
  error?: string;
  createdAt: number;
  updatedAt: number;
  estimatedTime?: number; // 预计完成时间（秒）
}

// 内存存储（生产环境建议使用Redis或数据库）
const taskStorage = new Map<string, ImageTask>();

// 任务过期时间（30分钟）
const TASK_EXPIRY = 30 * 60 * 1000;

export class TaskManager {
  
  // 创建新任务
  static async createTask(prompt: string, imageFile?: File): Promise<string> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    let imageData: ImageTask['imageData'] = undefined;

    // 如果有图片文件，转换为ArrayBuffer
    if (imageFile) {
      try {
        const buffer = await imageFile.arrayBuffer();
        imageData = {
          buffer,
          name: imageFile.name,
          type: imageFile.type
        };
      } catch (error) {
        console.error('转换图片文件失败:', error);
        throw new Error('图片文件处理失败');
      }
    }

    const task: ImageTask = {
      id: taskId,
      status: 'pending',
      progress: 0,
      prompt,
      imageData,
      results: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      estimatedTime: 60 // 预计60秒完成
    };

    taskStorage.set(taskId, task);
    console.log(`📝 创建任务: ${taskId}`);

    // 立即开始处理任务
    this.processTask(taskId).catch(error => {
      console.error(`❌ 任务处理失败: ${taskId}`, error);
      this.updateTaskStatus(taskId, 'failed', undefined, error.message);
    });

    return taskId;
  }
  
  // 获取任务状态
  static getTask(taskId: string): ImageTask | null {
    const task = taskStorage.get(taskId);
    if (!task) {
      return null;
    }
    
    // 检查是否过期
    if (Date.now() - task.createdAt > TASK_EXPIRY) {
      taskStorage.delete(taskId);
      return null;
    }
    
    return task;
  }
  
  // 更新任务状态
  static updateTaskStatus(
    taskId: string, 
    status: ImageTask['status'], 
    progress?: number, 
    error?: string,
    results?: string[]
  ): void {
    const task = taskStorage.get(taskId);
    if (!task) return;
    
    task.status = status;
    task.updatedAt = Date.now();
    
    if (progress !== undefined) {
      task.progress = progress;
    }
    
    if (error) {
      task.error = error;
    }
    
    if (results) {
      task.results = results;
    }
    
    console.log(`📊 任务状态更新: ${taskId} -> ${status} (${task.progress}%)`);
  }
  
  // 处理任务（异步）
  static async processTask(taskId: string): Promise<void> {
    const task = taskStorage.get(taskId);
    if (!task) return;
    
    try {
      console.log(`🚀 开始处理任务: ${taskId}`);
      
      // 更新状态为处理中
      this.updateTaskStatus(taskId, 'processing', 10);
      
      // API配置
      const apiUrl = process.env.MAQUE_API_URL || 'https://ismaque.org/v1/images/edits';
      const apiKey = process.env.MAQUE_API_KEY;
      
      if (!apiKey) {
        throw new Error('缺少API密钥配置');
      }
      
      // 准备API请求数据
      this.updateTaskStatus(taskId, 'processing', 30);
      
      const formData = new FormData();

      if (task.imageData) {
        // 图生图模式
        const imageBlob = new Blob([task.imageData.buffer], { type: task.imageData.type });
        formData.append('image', imageBlob, task.imageData.name);
        formData.append('mask', imageBlob, task.imageData.name);
      }
      
      formData.append('prompt', task.prompt);
      formData.append('n', '3'); // 生成3张图片
      formData.append('size', '1024x1024');
      formData.append('response_format', 'url');
      formData.append('model', 'gpt-image-1');
      
      this.updateTaskStatus(taskId, 'processing', 50);
      
      // 调用麻雀API
      console.log(`📡 调用麻雀API: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      });
      
      this.updateTaskStatus(taskId, 'processing', 80);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API请求失败 (${response.status}): ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ API响应成功:', result);
      
      // 提取图片URL
      const imageUrls = result.data?.map((item: any) => item.url) || [];
      
      if (imageUrls.length === 0) {
        throw new Error('API返回的数据中没有图片URL');
      }
      
      // 任务完成
      this.updateTaskStatus(taskId, 'completed', 100, undefined, imageUrls);
      console.log(`🎉 任务完成: ${taskId}, 生成了 ${imageUrls.length} 张图片`);
      
    } catch (error) {
      console.error(`❌ 任务处理失败: ${taskId}`, error);
      this.updateTaskStatus(
        taskId, 
        'failed', 
        undefined, 
        error instanceof Error ? error.message : String(error)
      );
    }
  }
  
  // 清理过期任务
  static cleanupExpiredTasks(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [taskId, task] of taskStorage.entries()) {
      if (now - task.createdAt > TASK_EXPIRY) {
        taskStorage.delete(taskId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 清理了 ${cleaned} 个过期任务`);
    }
  }
  
  // 获取所有任务（调试用）
  static getAllTasks(): ImageTask[] {
    return Array.from(taskStorage.values());
  }
}

// 定期清理过期任务
setInterval(() => {
  TaskManager.cleanupExpiredTasks();
}, 5 * 60 * 1000); // 每5分钟清理一次
