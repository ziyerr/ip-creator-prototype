// 🎯 基于 Redis + Bull Queue 的长时间任务处理系统
// 解决2分钟+的图片生成任务，支持并发和重试

import Bull from 'bull';
import Redis from 'ioredis';

// Redis 连接配置
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
};

// 创建 Redis 实例
export const redis = new Redis(redisConfig);

// 创建图片生成队列
export const imageGenerationQueue = new Bull('image-generation', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3, // 最多重试3次
    backoff: {
      type: 'exponential',
      delay: 5000, // 5秒退避
    },
    removeOnComplete: 50, // 保留50个已完成任务
    removeOnFail: 50, // 保留50个失败任务
  },
});

// 任务数据接口
export interface ImageGenerationJob {
  taskId: string;
  prompt: string;
  imageData: string; // base64图片数据
  style: 'cute' | 'toy' | 'cyber';
  userId?: string;
  callbackUrl?: string; // Webhook回调地址
}

// 任务状态接口
export interface TaskStatus {
  taskId: string;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  progress: number; // 0-100
  results?: string[]; // 生成的图片URL数组
  error?: string;
  createdAt: number;
  updatedAt: number;
  processingTime?: number; // 处理时间(毫秒)
}

// 队列管理类
export class QueueManager {
  
  // 📤 提交图片生成任务到队列
  async submitImageGenerationTask(jobData: ImageGenerationJob): Promise<string> {
    try {
      console.log(`📋 提交任务到队列: ${jobData.taskId}`);
      
      // 添加任务到队列
      const job = await imageGenerationQueue.add(
        'generate-images',
        jobData,
        {
          jobId: jobData.taskId, // 使用taskId作为jobId
          delay: 0, // 立即执行
        }
      );

      // 存储初始状态到Redis
      await this.updateTaskStatus(jobData.taskId, {
        taskId: jobData.taskId,
        status: 'waiting',
        progress: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      console.log(`✅ 任务已入队: ${job.id}`);
      return jobData.taskId;
      
    } catch (error) {
      console.error('❌ 任务入队失败:', error);
      throw error;
    }
  }

  // 📊 查询任务状态
  async getTaskStatus(taskId: string): Promise<TaskStatus | null> {
    try {
      const statusJson = await redis.get(`task:${taskId}`);
      if (!statusJson) {
        return null;
      }
      return JSON.parse(statusJson);
    } catch (error) {
      console.error('❌ 查询任务状态失败:', error);
      return null;
    }
  }

  // 🔄 更新任务状态
  async updateTaskStatus(taskId: string, status: Partial<TaskStatus>): Promise<void> {
    try {
      const key = `task:${taskId}`;
      const existing = await this.getTaskStatus(taskId) || {
        taskId,
        status: 'waiting',
        progress: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const updated: TaskStatus = {
        ...existing,
        ...status,
        updatedAt: Date.now(),
      };

      // 存储到Redis，24小时过期
      await redis.setex(key, 24 * 60 * 60, JSON.stringify(updated));
      
      console.log(`📊 更新任务状态: ${taskId} - ${updated.status} ${updated.progress}%`);
      
    } catch (error) {
      console.error('❌ 更新任务状态失败:', error);
    }
  }

  // 🧹 清理过期任务
  async cleanupExpiredTasks(): Promise<void> {
    try {
      const keys = await redis.keys('task:*');
      let cleaned = 0;
      
      for (const key of keys) {
        const ttl = await redis.ttl(key);
        if (ttl === -1) { // 没有设置过期时间的清理
          await redis.del(key);
          cleaned++;
        }
      }
      
      if (cleaned > 0) {
        console.log(`🧹 清理了 ${cleaned} 个过期任务`);
      }
    } catch (error) {
      console.error('❌ 清理过期任务失败:', error);
    }
  }

  // 📈 获取队列统计信息
  async getQueueStats() {
    try {
      const waiting = await imageGenerationQueue.getWaiting();
      const active = await imageGenerationQueue.getActive();
      const completed = await imageGenerationQueue.getCompleted();
      const failed = await imageGenerationQueue.getFailed();

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total: waiting.length + active.length + completed.length + failed.length,
      };
    } catch (error) {
      console.error('❌ 获取队列统计失败:', error);
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        total: 0,
      };
    }
  }
}

// 创建全局队列管理器实例
export const queueManager = new QueueManager();

// 定期清理过期任务 (每小时执行一次)
setInterval(() => {
  queueManager.cleanupExpiredTasks();
}, 60 * 60 * 1000);

// 优雅关闭处理
process.on('SIGTERM', async () => {
  console.log('🛑 正在关闭队列系统...');
  await imageGenerationQueue.close();
  await redis.disconnect();
  process.exit(0);
});

export default queueManager; 