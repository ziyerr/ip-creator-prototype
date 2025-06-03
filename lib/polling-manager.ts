// 🔄 前端轮询管理器
// 处理任务提交和10秒间隔轮询

export interface PollingTask {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  results?: string[];
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export interface PollingCallbacks {
  onProgress?: (task: PollingTask) => void;
  onCompleted?: (task: PollingTask) => void;
  onFailed?: (task: PollingTask) => void;
  onStatusChange?: (task: PollingTask) => void;
}

export class PollingManager {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private activeTasks: Map<string, PollingTask> = new Map();
  
  // 提交新任务
  async submitTask(
    prompt: string, 
    imageFile?: File,
    callbacks?: PollingCallbacks
  ): Promise<string> {
    try {
      console.log('📤 提交新任务...');
      
      // 准备表单数据
      const formData = new FormData();
      formData.append('prompt', prompt);
      
      if (imageFile) {
        formData.append('image', imageFile);
      }
      
      // 提交任务
      const response = await fetch('/api/tasks/submit', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      const taskId = result.taskId;
      
      console.log('✅ 任务提交成功:', taskId);
      
      // 创建本地任务记录
      const task: PollingTask = {
        taskId,
        status: 'pending',
        progress: 0,
        message: '任务已创建，正在处理中...',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      this.activeTasks.set(taskId, task);
      
      // 立即开始轮询
      this.startPolling(taskId, callbacks);
      
      return taskId;
      
    } catch (error) {
      console.error('❌ 任务提交失败:', error);
      throw error;
    }
  }
  
  // 开始轮询任务状态
  private startPolling(taskId: string, callbacks?: PollingCallbacks): void {
    console.log(`🔄 开始轮询任务: ${taskId}`);
    
    // 立即查询一次
    this.pollTaskStatus(taskId, callbacks);
    
    // 设置10秒间隔轮询
    const interval = setInterval(() => {
      this.pollTaskStatus(taskId, callbacks);
    }, 10000); // 10秒间隔
    
    this.pollingIntervals.set(taskId, interval);
  }
  
  // 查询任务状态
  private async pollTaskStatus(taskId: string, callbacks?: PollingCallbacks): Promise<void> {
    try {
      console.log(`🔍 轮询任务状态: ${taskId}`);
      
      const response = await fetch(`/api/tasks/status/${taskId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          // 任务不存在或已过期
          this.handleTaskNotFound(taskId, callbacks);
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // 更新本地任务状态
      const task: PollingTask = {
        taskId: data.taskId,
        status: data.status,
        progress: data.progress,
        message: data.message,
        results: data.results,
        error: data.error,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
      
      const previousTask = this.activeTasks.get(taskId);
      this.activeTasks.set(taskId, task);
      
      // 触发回调
      if (callbacks?.onProgress) {
        callbacks.onProgress(task);
      }
      
      if (previousTask?.status !== task.status && callbacks?.onStatusChange) {
        callbacks.onStatusChange(task);
      }
      
      // 检查是否完成
      if (task.status === 'completed') {
        console.log(`✅ 任务完成: ${taskId}`);
        this.stopPolling(taskId);
        
        if (callbacks?.onCompleted) {
          callbacks.onCompleted(task);
        }
      } else if (task.status === 'failed') {
        console.log(`❌ 任务失败: ${taskId}`);
        this.stopPolling(taskId);
        
        if (callbacks?.onFailed) {
          callbacks.onFailed(task);
        }
      }
      
      // 如果服务器建议停止轮询
      if (data.polling && !data.polling.shouldContinue) {
        this.stopPolling(taskId);
      }
      
    } catch (error) {
      console.error(`❌ 轮询失败: ${taskId}`, error);
      
      // 网络错误时不立即停止轮询，继续尝试
      const task = this.activeTasks.get(taskId);
      if (task && callbacks?.onProgress) {
        callbacks.onProgress({
          ...task,
          message: '⚠️ 网络连接异常，正在重试...'
        });
      }
    }
  }
  
  // 处理任务不存在的情况
  private handleTaskNotFound(taskId: string, callbacks?: PollingCallbacks): void {
    console.warn(`⚠️ 任务不存在或已过期: ${taskId}`);
    
    this.stopPolling(taskId);
    
    const task = this.activeTasks.get(taskId);
    if (task && callbacks?.onFailed) {
      callbacks.onFailed({
        ...task,
        status: 'failed',
        error: '任务不存在或已过期，请重新提交任务'
      });
    }
  }
  
  // 停止轮询
  stopPolling(taskId: string): void {
    const interval = this.pollingIntervals.get(taskId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(taskId);
      console.log(`⏹️ 停止轮询: ${taskId}`);
    }
  }
  
  // 获取任务状态
  getTask(taskId: string): PollingTask | undefined {
    return this.activeTasks.get(taskId);
  }
  
  // 获取所有活跃任务
  getAllTasks(): PollingTask[] {
    return Array.from(this.activeTasks.values());
  }
  
  // 清理完成的任务
  cleanupCompletedTasks(): void {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10分钟
    
    for (const [taskId, task] of this.activeTasks.entries()) {
      if (
        (task.status === 'completed' || task.status === 'failed') &&
        (now - task.updatedAt > maxAge)
      ) {
        this.activeTasks.delete(taskId);
        this.stopPolling(taskId);
        console.log(`🧹 清理任务: ${taskId}`);
      }
    }
  }
  
  // 停止所有轮询
  stopAllPolling(): void {
    for (const taskId of this.pollingIntervals.keys()) {
      this.stopPolling(taskId);
    }
    console.log('⏹️ 停止所有轮询');
  }
}

// 全局实例
export const pollingManager = new PollingManager();

// 页面卸载时清理
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    pollingManager.stopAllPolling();
  });
  
  // 定期清理完成的任务
  setInterval(() => {
    pollingManager.cleanupCompletedTasks();
  }, 5 * 60 * 1000); // 每5分钟清理一次
}
