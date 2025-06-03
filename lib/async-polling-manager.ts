// 🔄 异步轮询管理器 - 每10秒检查一次任务状态
// 专门用于处理长时间运行的图片生成任务

export interface AsyncTask {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  prompt: string;
  results?: string[];
  error?: string;
  createdAt: number;
}

export interface AsyncPollingCallbacks {
  onProgress?: (progress: number, status: string) => void;
  onComplete?: (results: string[]) => void;
  onError?: (error: string) => void;
}

export class AsyncPollingManager {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private callbacks: Map<string, AsyncPollingCallbacks> = new Map();

  /**
   * 提交新任务并开始轮询
   * @param prompt 提示词
   * @param imageFile 图片文件（可选）
   * @param callbacks 回调函数
   */
  async submitAndPoll(
    prompt: string,
    imageFile?: File,
    callbacks?: AsyncPollingCallbacks
  ): Promise<string> {
    try {
      console.log('📤 提交异步任务...');
      
      // 准备请求数据
      const formData = new FormData();
      formData.append('prompt', prompt);
      
      if (imageFile) {
        formData.append('image', imageFile);
        console.log('📷 包含图片文件:', imageFile.name);
      }

      // 提交任务到异步API
      const response = await fetch('/api/tasks/submit-async', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.taskId) {
        throw new Error(data.error || '提交任务失败');
      }

      const taskId = data.taskId;
      console.log('✅ 异步任务提交成功:', taskId);

      // 开始轮询
      if (callbacks) {
        this.startPolling(taskId, callbacks);
      }

      return taskId;

    } catch (error) {
      console.error('❌ 提交异步任务失败:', error);
      if (callbacks?.onError) {
        callbacks.onError(error instanceof Error ? error.message : '提交失败');
      }
      throw error;
    }
  }

  /**
   * 开始轮询任务状态
   * @param taskId 任务ID
   * @param callbacks 回调函数
   */
  startPolling(taskId: string, callbacks: AsyncPollingCallbacks) {
    // 清理已存在的轮询
    this.stopPolling(taskId);

    // 保存回调函数
    this.callbacks.set(taskId, callbacks);

    // 立即检查一次
    this.checkTaskStatus(taskId);

    // 设置10秒间隔轮询
    const interval = setInterval(() => {
      this.checkTaskStatus(taskId);
    }, 10000); // 10秒

    this.intervals.set(taskId, interval);

    console.log(`🔄 开始轮询任务 ${taskId}，每10秒检查一次状态`);
  }

  /**
   * 检查任务状态
   * @param taskId 任务ID
   */
  private async checkTaskStatus(taskId: string) {
    try {
      const response = await fetch(`/api/tasks/submit-async?taskId=${taskId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const callbacks = this.callbacks.get(taskId);

      if (!callbacks) {
        return;
      }

      console.log(`📊 任务 ${taskId} 状态: ${data.status}, 进度: ${data.progress}%`);

      // 调用进度回调
      if (callbacks.onProgress) {
        callbacks.onProgress(data.progress, data.status);
      }

      // 检查任务状态
      if (data.status === 'completed') {
        // 任务完成
        console.log(`✅ 任务 ${taskId} 完成！`);
        this.stopPolling(taskId);
        if (callbacks.onComplete && data.results) {
          callbacks.onComplete(data.results);
        }
      } else if (data.status === 'failed') {
        // 任务失败
        console.log(`❌ 任务 ${taskId} 失败:`, data.error);
        this.stopPolling(taskId);
        if (callbacks.onError) {
          callbacks.onError(data.error || '任务处理失败');
        }
      }
      // 如果状态是 pending 或 processing，继续轮询

    } catch (error) {
      console.error(`❌ 检查任务 ${taskId} 状态失败:`, error);
      const callbacks = this.callbacks.get(taskId);
      
      if (callbacks?.onError) {
        callbacks.onError(error instanceof Error ? error.message : '网络错误');
      }
      
      // 网络错误时不停止轮询，继续尝试
    }
  }

  /**
   * 停止轮询
   * @param taskId 任务ID
   */
  stopPolling(taskId: string) {
    const interval = this.intervals.get(taskId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(taskId);
      this.callbacks.delete(taskId);
      console.log(`⏹️ 停止轮询任务 ${taskId}`);
    }
  }

  /**
   * 获取当前轮询的任务数量
   */
  getActivePollingCount(): number {
    return this.intervals.size;
  }

  /**
   * 停止所有轮询
   */
  stopAllPolling() {
    console.log(`⏹️ 停止所有轮询 (${this.intervals.size} 个任务)`);
    for (const taskId of this.intervals.keys()) {
      this.stopPolling(taskId);
    }
  }

  /**
   * 获取轮询状态信息
   */
  getPollingInfo() {
    return {
      activeCount: this.intervals.size,
      taskIds: Array.from(this.intervals.keys())
    };
  }
}

// 全局异步轮询管理器实例
export const asyncPollingManager = new AsyncPollingManager();

// 页面卸载时清理所有轮询
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    asyncPollingManager.stopAllPolling();
  });
}
