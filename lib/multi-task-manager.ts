// 🔄 多任务并行管理器
// 同时发起3个独立任务，每个任务生成1张图片

export interface MultiTaskProgress {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: string;
  error?: string;
}

export interface MultiTaskCallbacks {
  onTaskProgress?: (taskIndex: number, task: MultiTaskProgress) => void;
  onAllCompleted?: (results: string[]) => void;
  onError?: (error: string) => void;
}

export class MultiTaskManager {
  private activeTasks: Map<string, {
    taskIndex: number;
    status: string;
    progress: number;
    result?: string;
    error?: string;
  }> = new Map();

  private callbacks?: MultiTaskCallbacks;
  private completedCount = 0;
  private totalTasks = 3;
  private results: (string | null)[] = [null, null, null];
  private hasError = false;

  /**
   * 提交3个并行任务
   */
  async submitMultipleTasks(
    prompt: string,
    imageFile?: File,
    callbacks?: MultiTaskCallbacks
  ): Promise<string[]> {
    this.callbacks = callbacks;
    this.completedCount = 0;
    this.results = [null, null, null];
    this.hasError = false;
    this.activeTasks.clear();

    console.log('🚀 开始提交3个并行任务...');

    const taskPromises: Promise<string>[] = [];

    // 同时发起3个任务
    for (let i = 0; i < this.totalTasks; i++) {
      const taskPromise = this.submitSingleTask(i, prompt, imageFile);
      taskPromises.push(taskPromise);
    }

    try {
      // 等待所有任务提交完成
      const taskIds = await Promise.all(taskPromises);
      console.log('✅ 所有任务提交成功:', taskIds);

      // 开始监听所有任务
      taskIds.forEach((taskId, index) => {
        this.startTaskPolling(taskId, index);
      });

      return taskIds;
    } catch (error) {
      console.error('❌ 任务提交失败:', error);
      if (this.callbacks?.onError) {
        this.callbacks.onError(error instanceof Error ? error.message : '任务提交失败');
      }
      throw error;
    }
  }

  /**
   * 提交单个任务
   */
  private async submitSingleTask(
    taskIndex: number,
    prompt: string,
    imageFile?: File
  ): Promise<string> {
    const formData = new FormData();
    formData.append('prompt', prompt);
    
    if (imageFile) {
      formData.append('image', imageFile);
    }

    const response = await fetch('/api/tasks/submit-async', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`任务${taskIndex + 1}提交失败: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !data.taskId) {
      throw new Error(data.error || `任务${taskIndex + 1}提交失败`);
    }

    console.log(`📤 任务${taskIndex + 1}提交成功: ${data.taskId}`);
    return data.taskId;
  }

  /**
   * 开始轮询单个任务
   */
  private startTaskPolling(taskId: string, taskIndex: number) {
    // 初始化任务状态
    this.activeTasks.set(taskId, {
      taskIndex,
      status: 'pending',
      progress: 0
    });

    // 立即检查一次
    this.checkTaskStatus(taskId, taskIndex);

    // 设置10秒间隔轮询
    const interval = setInterval(() => {
      this.checkTaskStatus(taskId, taskIndex);
    }, 10000);

    // 存储interval以便后续清理
    const task = this.activeTasks.get(taskId);
    if (task) {
      (task as any).interval = interval;
    }
  }

  /**
   * 检查单个任务状态
   */
  private async checkTaskStatus(taskId: string, taskIndex: number) {
    try {
      const response = await fetch(`/api/tasks/submit-async?taskId=${taskId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const task = this.activeTasks.get(taskId);
      
      if (!task) return;

      // 更新任务状态
      task.status = data.status;
      task.progress = data.progress;

      console.log(`📊 任务${taskIndex + 1} (${taskId.substring(0, 8)}...): ${data.status} ${data.progress}%`);

      // 调用进度回调
      if (this.callbacks?.onTaskProgress) {
        this.callbacks.onTaskProgress(taskIndex, {
          taskId,
          status: data.status,
          progress: data.progress,
          result: task.result,
          error: task.error
        });
      }

      // 检查任务完成状态
      if (data.status === 'completed') {
        this.handleTaskCompleted(taskId, taskIndex, data.results?.[0]);
      } else if (data.status === 'failed') {
        this.handleTaskFailed(taskId, taskIndex, data.error);
      }

    } catch (error) {
      console.error(`❌ 检查任务${taskIndex + 1}状态失败:`, error);
      // 网络错误时继续轮询，不停止
    }
  }

  /**
   * 处理任务完成
   */
  private handleTaskCompleted(taskId: string, taskIndex: number, result: string) {
    console.log(`✅ 任务${taskIndex + 1}完成!`);
    
    const task = this.activeTasks.get(taskId);
    if (task) {
      task.result = result;
      // 清理轮询
      if ((task as any).interval) {
        clearInterval((task as any).interval);
      }
    }

    // 保存结果
    this.results[taskIndex] = result;
    this.completedCount++;

    // 检查是否所有任务都完成
    if (this.completedCount === this.totalTasks && !this.hasError) {
      const finalResults = this.results.filter(r => r !== null) as string[];
      console.log(`🎉 所有任务完成! 生成了${finalResults.length}张图片`);
      
      if (this.callbacks?.onAllCompleted) {
        this.callbacks.onAllCompleted(finalResults);
      }
    }
  }

  /**
   * 处理任务失败
   */
  private handleTaskFailed(taskId: string, taskIndex: number, error: string) {
    console.log(`❌ 任务${taskIndex + 1}失败:`, error);
    
    const task = this.activeTasks.get(taskId);
    if (task) {
      task.error = error;
      // 清理轮询
      if ((task as any).interval) {
        clearInterval((task as any).interval);
      }
    }

    this.hasError = true;

    if (this.callbacks?.onError) {
      this.callbacks.onError(`任务${taskIndex + 1}失败: ${error}`);
    }
  }

  /**
   * 停止所有任务
   */
  stopAllTasks() {
    console.log('⏹️ 停止所有任务轮询');
    
    for (const [taskId, task] of this.activeTasks.entries()) {
      if ((task as any).interval) {
        clearInterval((task as any).interval);
      }
    }
    
    this.activeTasks.clear();
  }

  /**
   * 获取当前状态
   */
  getStatus() {
    return {
      totalTasks: this.totalTasks,
      completedCount: this.completedCount,
      activeTasks: this.activeTasks.size,
      results: this.results.filter(r => r !== null).length,
      hasError: this.hasError
    };
  }
}

// 全局多任务管理器实例
export const multiTaskManager = new MultiTaskManager();
