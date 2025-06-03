// 🎯 Vercel无服务器环境的轮询式图像生成任务管理器
// 使用文件系统进行临时存储，适配无服务器架构

import { promises as fs } from 'fs';
import path from 'path';

export interface ImageTask {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  prompt: string;
  imageData?: {
    buffer: string; // Base64编码的图片数据
    name: string;
    type: string;
  };
  results: string[]; // 生成的图片URL数组
  error?: string;
  createdAt: number;
  updatedAt: number;
  estimatedTime?: number; // 预计完成时间（秒）
}

// 任务过期时间（10分钟，适合无服务器环境）
const TASK_EXPIRY = 10 * 60 * 1000;

// 任务存储目录（使用/tmp在Vercel中）
const TASK_STORAGE_DIR = process.env.NODE_ENV === 'production'
  ? '/tmp/tasks'
  : path.join(process.cwd(), '.tmp', 'tasks');

// 确保存储目录存在
async function ensureStorageDir() {
  try {
    await fs.mkdir(TASK_STORAGE_DIR, { recursive: true });
  } catch (error) {
    // 目录可能已存在，忽略错误
  }
}

// 获取任务文件路径
function getTaskFilePath(taskId: string): string {
  return path.join(TASK_STORAGE_DIR, `${taskId}.json`);
}

export class TaskManager {

  // 创建新任务
  static async createTask(prompt: string, imageFile?: File): Promise<string> {
    await ensureStorageDir();

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    let imageData: ImageTask['imageData'] = undefined;

    // 如果有图片文件，转换为Base64
    if (imageFile) {
      try {
        const buffer = await imageFile.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        imageData = {
          buffer: base64,
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

    // 保存到文件系统
    await this.saveTask(task);
    console.log(`📝 创建任务: ${taskId}`);

    // 在无服务器环境中，不能立即开始处理任务
    // 任务处理将在状态查询时触发

    return taskId;
  }

  // 保存任务到文件系统
  static async saveTask(task: ImageTask): Promise<void> {
    try {
      const filePath = getTaskFilePath(task.id);
      await fs.writeFile(filePath, JSON.stringify(task, null, 2));
    } catch (error) {
      console.error(`❌ 保存任务失败: ${task.id}`, error);
      throw new Error('任务保存失败');
    }
  }

  // 从文件系统加载任务
  static async loadTask(taskId: string): Promise<ImageTask | null> {
    try {
      const filePath = getTaskFilePath(taskId);
      const data = await fs.readFile(filePath, 'utf-8');
      const task: ImageTask = JSON.parse(data);

      // 检查是否过期
      if (Date.now() - task.createdAt > TASK_EXPIRY) {
        await this.deleteTask(taskId);
        return null;
      }

      return task;
    } catch (error) {
      // 文件不存在或读取失败
      return null;
    }
  }

  // 删除任务文件
  static async deleteTask(taskId: string): Promise<void> {
    try {
      const filePath = getTaskFilePath(taskId);
      await fs.unlink(filePath);
    } catch (error) {
      // 文件可能不存在，忽略错误
    }
  }
  
  // 获取任务状态（异步）
  static async getTask(taskId: string): Promise<ImageTask | null> {
    console.log(`🔍 查找任务: ${taskId}`);

    const task = await this.loadTask(taskId);
    if (!task) {
      console.log(`❌ 任务不存在: ${taskId}`);
      return null;
    }

    console.log(`✅ 找到任务: ${taskId} - ${task.status}`);

    // 如果任务是pending状态，尝试开始处理
    if (task.status === 'pending') {
      console.log(`🚀 触发任务处理: ${taskId}`);
      // 在无服务器环境中，我们需要立即处理任务
      this.processTaskImmediate(taskId).catch(error => {
        console.error(`❌ 任务处理失败: ${taskId}`, error);
      });
    }

    return task;
  }

  // 更新任务状态（异步）
  static async updateTaskStatus(
    taskId: string,
    status: ImageTask['status'],
    progress?: number,
    error?: string,
    results?: string[]
  ): Promise<void> {
    console.log(`🔄 尝试更新任务状态: ${taskId} -> ${status}`);

    const task = await this.loadTask(taskId);
    if (!task) {
      console.error(`❌ 更新状态失败: 任务不存在 ${taskId}`);
      return;
    }

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

    // 保存更新后的任务
    await this.saveTask(task);

    console.log(`📊 任务状态更新成功: ${taskId} -> ${status} (${task.progress}%)`);
  }
  
  // 立即处理任务（适配无服务器环境）
  static async processTaskImmediate(taskId: string): Promise<void> {
    const task = await this.loadTask(taskId);
    if (!task) return;

    try {
      console.log(`🚀 开始处理任务: ${taskId}`);

      // 更新状态为处理中
      await this.updateTaskStatus(taskId, 'processing', 10);

      // API配置
      const apiKey = process.env.MAQUE_API_KEY;

      if (!apiKey) {
        throw new Error('缺少API密钥配置');
      }

      // 准备API请求数据
      await this.updateTaskStatus(taskId, 'processing', 30);

      let apiUrl: string;
      let requestBody: FormData | string;
      let headers: Record<string, string>;

      if (task.imageData) {
        // 图生图模式 - 使用edits端点，需要FormData
        apiUrl = process.env.MAQUE_API_URL || 'https://ismaque.org/v1/images/edits';
        const formData = new FormData();

        // 从Base64恢复图片数据
        const imageBuffer = Buffer.from(task.imageData.buffer, 'base64');
        const imageBlob = new Blob([imageBuffer], { type: task.imageData.type });

        formData.append('image', imageBlob, task.imageData.name);
        formData.append('mask', imageBlob, task.imageData.name);
        formData.append('prompt', task.prompt);
        formData.append('n', '3');
        formData.append('size', '1024x1024');
        formData.append('response_format', 'url');
        formData.append('model', 'gpt-image-1');

        requestBody = formData;
        headers = {
          'Authorization': `Bearer ${apiKey}`,
        };
      } else {
        // 文生图模式 - 使用generations端点，使用JSON
        apiUrl = 'https://ismaque.org/v1/images/generations';
        const requestData = {
          prompt: task.prompt,
          n: 3,
          size: '1024x1024',
          response_format: 'url',
          model: 'gpt-image-1'
        };

        requestBody = JSON.stringify(requestData);
        headers = {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        };
      }

      await this.updateTaskStatus(taskId, 'processing', 50);

      // 调用麻雀API
      console.log(`📡 调用麻雀API: ${apiUrl}`);
      console.log(`📋 请求类型: ${task.imageData ? '图生图(FormData)' : '文生图(JSON)'}`);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: requestBody,
      });

      await this.updateTaskStatus(taskId, 'processing', 80);

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
      await this.updateTaskStatus(taskId, 'completed', 100, undefined, imageUrls);
      console.log(`🎉 任务完成: ${taskId}, 生成了 ${imageUrls.length} 张图片`);

    } catch (error) {
      console.error(`❌ 任务处理失败: ${taskId}`, error);
      await this.updateTaskStatus(
        taskId,
        'failed',
        undefined,
        error instanceof Error ? error.message : String(error)
      );
    }
  }
  
  // 清理过期任务（异步）
  static async cleanupExpiredTasks(): Promise<number> {
    try {
      await ensureStorageDir();
      const files = await fs.readdir(TASK_STORAGE_DIR);
      const now = Date.now();
      let cleaned = 0;

      for (const file of files) {
        if (file.endsWith('.json')) {
          const taskId = file.replace('.json', '');
          const task = await this.loadTask(taskId);

          if (!task || (now - task.createdAt > TASK_EXPIRY)) {
            await this.deleteTask(taskId);
            cleaned++;
          }
        }
      }

      if (cleaned > 0) {
        console.log(`🧹 清理了 ${cleaned} 个过期任务`);
      }

      return cleaned;
    } catch (error) {
      console.error('清理任务失败:', error);
      return 0;
    }
  }

  // 获取所有任务（调试用）
  static async getAllTasks(): Promise<ImageTask[]> {
    try {
      await ensureStorageDir();
      const files = await fs.readdir(TASK_STORAGE_DIR);
      const tasks: ImageTask[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const taskId = file.replace('.json', '');
          const task = await this.loadTask(taskId);
          if (task) {
            tasks.push(task);
          }
        }
      }

      return tasks;
    } catch (error) {
      console.error('获取任务列表失败:', error);
      return [];
    }
  }
}

// 注意：在无服务器环境中不使用setInterval
// 清理任务将在API调用时按需执行
