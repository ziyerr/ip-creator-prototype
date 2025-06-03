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
}

// 全局任务管理器实例
export const taskManager = new SupabaseTaskManager();
