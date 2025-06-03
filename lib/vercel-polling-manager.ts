// 🔄 Vercel适配的轮询管理器
// 专为Vercel无服务器环境设计的轮询系统

export interface VercelJob {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
  message: string;
  results?: string[];
  error?: string;
  submittedAt: number;
  completedAt?: number;
}

export interface VercelPollingCallbacks {
  onProgress?: (job: VercelJob) => void;
  onCompleted?: (job: VercelJob) => void;
  onFailed?: (job: VercelJob) => void;
  onStatusChange?: (job: VercelJob) => void;
}

export class VercelPollingManager {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private activeJobs: Map<string, VercelJob> = new Map();
  
  // 提交任务并开始轮询
  async submitJob(
    prompt: string,
    imageFile?: File,
    callbacks?: VercelPollingCallbacks
  ): Promise<string> {
    try {
      console.log('📤 提交Vercel任务...');
      
      // 准备表单数据
      const formData = new FormData();
      formData.append('prompt', prompt);
      
      if (imageFile) {
        formData.append('image', imageFile);
      }
      
      // 提交任务到Vercel API
      const response = await fetch('/api/tasks/submit', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '任务提交失败');
      }
      
      const jobId = result.jobId;
      console.log('✅ Vercel任务提交成功:', jobId);
      
      // 创建本地任务记录
      const job: VercelJob = {
        jobId,
        status: result.status || 'pending',
        message: result.message || '任务已提交',
        results: result.results,
        submittedAt: Date.now(),
        completedAt: result.completedAt
      };
      
      this.activeJobs.set(jobId, job);
      
      // 如果任务已经完成（同步模式），直接触发完成回调
      if (result.status === 'completed' && result.results) {
        console.log('🎉 任务同步完成，无需轮询');
        
        if (callbacks?.onCompleted) {
          callbacks.onCompleted(job);
        }
        
        return jobId;
      }
      
      // 否则开始轮询
      this.startPolling(jobId, callbacks);
      
      return jobId;
      
    } catch (error) {
      console.error('❌ Vercel任务提交失败:', error);
      throw error;
    }
  }
  
  // 开始轮询任务状态
  private startPolling(jobId: string, callbacks?: VercelPollingCallbacks): void {
    console.log(`🔄 开始轮询Vercel任务: ${jobId}`);
    
    // 立即检查一次
    this.checkJobStatus(jobId, callbacks);
    
    // 设置10秒间隔轮询
    const interval = setInterval(() => {
      this.checkJobStatus(jobId, callbacks);
    }, 10000); // 10秒间隔
    
    this.pollingIntervals.set(jobId, interval);
    
    // 设置最大轮询时间（5分钟）
    setTimeout(() => {
      if (this.pollingIntervals.has(jobId)) {
        console.log(`⏰ 轮询超时，停止轮询: ${jobId}`);
        this.stopPolling(jobId);
        
        const job = this.activeJobs.get(jobId);
        if (job && callbacks?.onFailed) {
          callbacks.onFailed({
            ...job,
            status: 'failed',
            error: '轮询超时，请重试'
          });
        }
      }
    }, 5 * 60 * 1000); // 5分钟超时
  }
  
  // 检查任务状态
  private async checkJobStatus(jobId: string, callbacks?: VercelPollingCallbacks): Promise<void> {
    try {
      console.log(`🔍 检查Vercel任务状态: ${jobId}`);
      
      const response = await fetch(`/api/checkImageStatus?jobId=${jobId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          this.handleJobNotFound(jobId, callbacks);
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // 更新本地任务状态
      const job: VercelJob = {
        jobId: data.jobId,
        status: data.status,
        message: data.message,
        results: data.results,
        error: data.error,
        submittedAt: this.activeJobs.get(jobId)?.submittedAt || Date.now(),
        completedAt: data.completedAt || (data.status === 'completed' ? Date.now() : undefined)
      };
      
      const previousJob = this.activeJobs.get(jobId);
      this.activeJobs.set(jobId, job);
      
      // 触发回调
      if (callbacks?.onProgress) {
        callbacks.onProgress(job);
      }
      
      if (previousJob?.status !== job.status && callbacks?.onStatusChange) {
        callbacks.onStatusChange(job);
      }
      
      // 检查是否完成
      if (job.status === 'completed') {
        console.log(`✅ Vercel任务完成: ${jobId}`);
        this.stopPolling(jobId);
        
        if (callbacks?.onCompleted) {
          callbacks.onCompleted(job);
        }
      } else if (job.status === 'failed' || job.status === 'expired') {
        console.log(`❌ Vercel任务失败: ${jobId}`);
        this.stopPolling(jobId);
        
        if (callbacks?.onFailed) {
          callbacks.onFailed(job);
        }
      }
      
      // 如果服务器建议停止轮询
      if (data.polling && !data.polling.shouldContinue) {
        this.stopPolling(jobId);
      }
      
    } catch (error) {
      console.error(`❌ 检查状态失败: ${jobId}`, error);
      
      // 网络错误时不立即停止轮询，继续尝试
      const job = this.activeJobs.get(jobId);
      if (job && callbacks?.onProgress) {
        callbacks.onProgress({
          ...job,
          message: '⚠️ 网络连接异常，正在重试...'
        });
      }
    }
  }
  
  // 处理任务不存在的情况
  private handleJobNotFound(jobId: string, callbacks?: VercelPollingCallbacks): void {
    console.warn(`⚠️ Vercel任务不存在或已过期: ${jobId}`);
    
    this.stopPolling(jobId);
    
    const job = this.activeJobs.get(jobId);
    if (job && callbacks?.onFailed) {
      callbacks.onFailed({
        ...job,
        status: 'failed',
        error: '任务不存在或已过期，请重新提交任务'
      });
    }
  }
  
  // 停止轮询
  stopPolling(jobId: string): void {
    const interval = this.pollingIntervals.get(jobId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(jobId);
      console.log(`⏹️ 停止Vercel轮询: ${jobId}`);
    }
  }
  
  // 获取任务状态
  getJob(jobId: string): VercelJob | undefined {
    return this.activeJobs.get(jobId);
  }
  
  // 获取所有活跃任务
  getAllJobs(): VercelJob[] {
    return Array.from(this.activeJobs.values());
  }
  
  // 清理完成的任务
  cleanupCompletedJobs(): void {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10分钟
    
    for (const [jobId, job] of this.activeJobs.entries()) {
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        job.completedAt &&
        (now - job.completedAt > maxAge)
      ) {
        this.activeJobs.delete(jobId);
        this.stopPolling(jobId);
        console.log(`🧹 清理Vercel任务: ${jobId}`);
      }
    }
  }
  
  // 停止所有轮询
  stopAllPolling(): void {
    for (const jobId of this.pollingIntervals.keys()) {
      this.stopPolling(jobId);
    }
    console.log('⏹️ 停止所有Vercel轮询');
  }
}

// 全局实例
export const vercelPollingManager = new VercelPollingManager();

// 页面卸载时清理
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    vercelPollingManager.stopAllPolling();
  });
  
  // 定期清理完成的任务
  setInterval(() => {
    vercelPollingManager.cleanupCompletedJobs();
  }, 5 * 60 * 1000); // 每5分钟清理一次
}
