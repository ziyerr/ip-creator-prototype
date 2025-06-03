'use client';

import { useState, useEffect } from 'react';
import { taskManager } from '@/lib/supabase';

export default function DebugTasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [timeoutStats, setTimeoutStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [allTasks, taskStats, timeoutStatsData] = await Promise.all([
        taskManager.getAllTasks(20),
        taskManager.getTaskStats(),
        taskManager.getTimeoutStats()
      ]);
      setTasks(allTasks);
      setStats(taskStats);
      setTimeoutStats(timeoutStatsData);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteTask = async (taskId: string) => {
    try {
      await taskManager.deleteTask(taskId);
      await loadData();
    } catch (err) {
      alert('删除失败: ' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  const handleCleanupTasks = async () => {
    try {
      const [deletedCount, timeoutCount] = await Promise.all([
        taskManager.cleanupExpiredTasks(),
        taskManager.checkTimeoutTasks()
      ]);
      alert(`清理了 ${deletedCount} 个过期任务，标记了 ${timeoutCount} 个超时任务`);
      await loadData();
    } catch (err) {
      alert('清理失败: ' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>加载任务数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">🔍 任务调试面板</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-red-800 mb-2">❌ 错误</h3>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* 统计信息 */}
      {stats && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="font-semibold mb-4">📊 任务统计</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">总任务</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-gray-600">等待中</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
              <div className="text-sm text-gray-600">处理中</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-gray-600">已完成</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <div className="text-sm text-gray-600">失败</div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={loadData}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              刷新数据
            </button>
            <button
              onClick={handleCleanupTasks}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              清理过期任务
            </button>
          </div>
        </div>
      )}

      {/* 超时统计 */}
      {timeoutStats && (
        <div className="bg-orange-50 p-6 rounded-lg shadow-md mb-6">
          <h3 className="font-semibold mb-4">⏰ 超时统计</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{timeoutStats.totalTimeoutCount}</div>
              <div className="text-sm text-gray-600">总超时任务</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{timeoutStats.recentTimeoutCount}</div>
              <div className="text-sm text-gray-600">24小时内超时</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {timeoutStats.avgGenerationTimeSeconds ?
                  `${Math.round(timeoutStats.avgGenerationTimeSeconds)}s` : 'N/A'}
              </div>
              <div className="text-sm text-gray-600">平均生成时间</div>
            </div>
          </div>
          <div className="mt-4 text-xs text-orange-700 bg-orange-100 rounded-lg px-3 py-2">
            💡 超时阈值：2分钟。超过此时间的processing任务将被自动标记为失败。
          </div>
        </div>
      )}

      {/* 任务列表 */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="font-semibold mb-4">📋 最近任务 (最新20个)</h3>
        
        {tasks.length === 0 ? (
          <p className="text-gray-500 text-center py-8">暂无任务数据</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">任务ID</th>
                  <th className="text-left p-2">状态</th>
                  <th className="text-left p-2">进度</th>
                  <th className="text-left p-2">提示词</th>
                  <th className="text-left p-2">生成时间</th>
                  <th className="text-left p-2">创建时间</th>
                  <th className="text-left p-2">更新时间</th>
                  <th className="text-left p-2">错误信息</th>
                  <th className="text-left p-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <div className="font-mono text-xs">
                        {task.task_id.substring(0, 12)}...
                      </div>
                      <div className="text-xs text-gray-500">
                        {task.image_file_name && `📷 ${task.image_file_name}`}
                      </div>
                    </td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        task.status === 'completed' ? 'bg-green-100 text-green-800' :
                        task.status === 'failed' ? 'bg-red-100 text-red-800' :
                        task.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              task.status === 'completed' ? 'bg-green-500' :
                              task.status === 'failed' ? 'bg-red-500' :
                              task.status === 'processing' ? 'bg-blue-500' :
                              'bg-yellow-500'
                            }`}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <span className="text-xs">{task.progress}%</span>
                      </div>
                    </td>
                    <td className="p-2 max-w-xs">
                      <div className="truncate" title={task.prompt}>
                        {task.prompt}
                      </div>
                    </td>
                    <td className="p-2 text-xs">
                      {task.generation_started_at && task.generation_completed_at ? (
                        <div>
                          <div className="text-green-600 font-medium">
                            {Math.round((new Date(task.generation_completed_at).getTime() - new Date(task.generation_started_at).getTime()) / 1000)}秒
                          </div>
                          {task.is_timeout && (
                            <div className="text-red-500 text-xs">⏰ 超时</div>
                          )}
                        </div>
                      ) : task.generation_started_at && task.status === 'processing' ? (
                        <div>
                          <div className="text-blue-600">
                            {Math.round((Date.now() - new Date(task.generation_started_at).getTime()) / 1000)}秒
                          </div>
                          <div className="text-xs text-gray-500">进行中</div>
                        </div>
                      ) : (
                        <div className="text-gray-400 text-xs">未开始</div>
                      )}
                    </td>
                    <td className="p-2 text-xs">
                      {new Date(task.created_at).toLocaleString()}
                    </td>
                    <td className="p-2 text-xs">
                      {new Date(task.updated_at).toLocaleString()}
                      <div className="text-gray-500">
                        ({Math.round((Date.now() - new Date(task.updated_at).getTime()) / 1000)}秒前)
                      </div>
                    </td>
                    <td className="p-2 max-w-xs">
                      {task.error_message && (
                        <div className="text-red-600 text-xs truncate" title={task.error_message}>
                          {task.error_message}
                        </div>
                      )}
                      {task.results && (
                        <div className="text-green-600 text-xs">
                          ✅ {Array.isArray(task.results) ? task.results.length : 1} 张图片
                        </div>
                      )}
                    </td>
                    <td className="p-2">
                      <button
                        onClick={() => handleDeleteTask(task.task_id)}
                        className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 调试信息 */}
      <div className="bg-gray-50 p-4 rounded-lg mt-6">
        <h4 className="font-semibold mb-2">🔧 调试信息</h4>
        <div className="text-sm space-y-1">
          <p><strong>当前时间:</strong> {new Date().toLocaleString()}</p>
          <p><strong>任务总数:</strong> {tasks.length}</p>
          <p><strong>处理中任务:</strong> {tasks.filter(t => t.status === 'processing').length}</p>
          <p><strong>超过5分钟的处理中任务:</strong> {
            tasks.filter(t => 
              t.status === 'processing' && 
              (Date.now() - new Date(t.updated_at).getTime()) > 5 * 60 * 1000
            ).length
          }</p>
        </div>
      </div>
    </div>
  );
}
