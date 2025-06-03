import { createClient } from '@supabase/supabase-js';

// Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// 创建Supabase客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 数据库类型定义
export interface ImageTask {
  id: string;
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  prompt: string;
  image_file_name?: string;
  results?: string[];
  error_message?: string;
  created_at: string;
  updated_at: string;
  generation_started_at?: string;
  generation_completed_at?: string;
  is_timeout?: boolean;
}

// 任务管理类
export class SupabaseTaskManager {
  
  /**
   * 创建新任务
   */
  async createTask(taskData: {
    task_id: string;
    prompt: string;
    image_file_name?: string;
  }): Promise<ImageTask> {
    const { data, error } = await supabase
      .from('image_tasks')
      .insert({
        task_id: taskData.task_id,
        status: 'pending',
        progress: 0,
        prompt: taskData.prompt,
        image_file_name: taskData.image_file_name,
      })
      .select()
      .single();

    if (error) {
      console.error('创建任务失败:', error);
      throw new Error(`创建任务失败: ${error.message}`);
    }

    return data;
  }

  /**
   * 更新任务状态
   */
  async updateTask(taskId: string, updates: {
    status?: 'pending' | 'processing' | 'completed' | 'failed';
    progress?: number;
    results?: string[];
    error_message?: string;
  }): Promise<ImageTask> {
    const { data, error } = await supabase
      .from('image_tasks')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('task_id', taskId)
      .select()
      .single();

    if (error) {
      console.error('更新任务失败:', error);
      throw new Error(`更新任务失败: ${error.message}`);
    }

    return data;
  }

  /**
   * 获取任务详情
   */
  async getTask(taskId: string): Promise<ImageTask | null> {
    const { data, error } = await supabase
      .from('image_tasks')
      .select('*')
      .eq('task_id', taskId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // 任务不存在
        return null;
      }
      console.error('获取任务失败:', error);
      throw new Error(`获取任务失败: ${error.message}`);
    }

    return data;
  }

  /**
   * 获取所有任务
   */
  async getAllTasks(limit = 100): Promise<ImageTask[]> {
    const { data, error } = await supabase
      .from('image_tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('获取任务列表失败:', error);
      throw new Error(`获取任务列表失败: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 删除任务
   */
  async deleteTask(taskId: string): Promise<void> {
    const { error } = await supabase
      .from('image_tasks')
      .delete()
      .eq('task_id', taskId);

    if (error) {
      console.error('删除任务失败:', error);
      throw new Error(`删除任务失败: ${error.message}`);
    }
  }

  /**
   * 清理过期任务（超过24小时）
   */
  async cleanupExpiredTasks(): Promise<number> {
    const expireTime = new Date();
    expireTime.setHours(expireTime.getHours() - 24);

    const { data, error } = await supabase
      .from('image_tasks')
      .delete()
      .lt('created_at', expireTime.toISOString())
      .select('task_id');

    if (error) {
      console.error('清理过期任务失败:', error);
      throw new Error(`清理过期任务失败: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * 获取任务统计信息
   */
  async getTaskStats(): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const { data, error } = await supabase
      .from('image_tasks')
      .select('status');

    if (error) {
      console.error('获取任务统计失败:', error);
      throw new Error(`获取任务统计失败: ${error.message}`);
    }

    const stats = {
      total: data?.length || 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    data?.forEach(task => {
      stats[task.status as keyof typeof stats]++;
    });

    return stats;
  }

  /**
   * 检查并标记超时任务（超过2分钟的processing任务）
   */
  async checkTimeoutTasks(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('check_task_timeout');

      if (error) {
        console.error('检查超时任务失败:', error);
        throw new Error(`检查超时任务失败: ${error.message}`);
      }

      const timeoutCount = data || 0;
      if (timeoutCount > 0) {
        console.log(`⏰ 标记了 ${timeoutCount} 个超时任务`);
      }

      return timeoutCount;
    } catch (error) {
      console.error('检查超时任务异常:', error);
      return 0;
    }
  }

  /**
   * 获取超时统计信息
   */
  async getTimeoutStats(): Promise<{
    totalTimeoutCount: number;
    recentTimeoutCount: number;
    avgGenerationTimeSeconds: number;
  }> {
    try {
      const { data, error } = await supabase.rpc('get_timeout_stats');

      if (error) {
        console.error('获取超时统计失败:', error);
        throw new Error(`获取超时统计失败: ${error.message}`);
      }

      const stats = data?.[0] || {};
      return {
        totalTimeoutCount: Number(stats.total_timeout_count || 0),
        recentTimeoutCount: Number(stats.recent_timeout_count || 0),
        avgGenerationTimeSeconds: Number(stats.avg_generation_time_seconds || 0)
      };
    } catch (error) {
      console.error('获取超时统计异常:', error);
      return {
        totalTimeoutCount: 0,
        recentTimeoutCount: 0,
        avgGenerationTimeSeconds: 0
      };
    }
  }

  /**
   * 标记任务开始生成
   */
  async markGenerationStarted(taskId: string): Promise<void> {
    const { error } = await supabase
      .from('image_tasks')
      .update({
        generation_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('task_id', taskId);

    if (error) {
      console.error('标记生成开始失败:', error);
      throw new Error(`标记生成开始失败: ${error.message}`);
    }
  }

  /**
   * 标记任务完成生成
   */
  async markGenerationCompleted(taskId: string, success: boolean = true): Promise<void> {
    const updates: any = {
      generation_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (!success) {
      updates.status = 'failed';
    }

    const { error } = await supabase
      .from('image_tasks')
      .update(updates)
      .eq('task_id', taskId);

    if (error) {
      console.error('标记生成完成失败:', error);
      throw new Error(`标记生成完成失败: ${error.message}`);
    }
  }

  /**
   * 检查任务是否超时（基于generation_started_at）
   */
  isTaskTimeout(task: ImageTask): boolean {
    if (!task.generation_started_at || task.status !== 'processing') {
      return false;
    }

    const startTime = new Date(task.generation_started_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - startTime.getTime()) / (1000 * 60);

    return diffMinutes > 2; // 超过2分钟视为超时
  }

  /**
   * 获取任务的生成时间（秒）
   */
  getGenerationTime(task: ImageTask): number | null {
    if (!task.generation_started_at || !task.generation_completed_at) {
      return null;
    }

    const startTime = new Date(task.generation_started_at);
    const endTime = new Date(task.generation_completed_at);

    return (endTime.getTime() - startTime.getTime()) / 1000;
  }
}

// 全局任务管理器实例
export const taskManager = new SupabaseTaskManager();
