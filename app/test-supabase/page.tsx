'use client';

import { useState, useEffect } from 'react';
import { asyncPollingManager } from '@/lib/async-polling-manager';
import { taskManager } from '@/lib/supabase';

export default function TestSupabasePage() {
  const [prompt, setPrompt] = useState('Q版可爱风格的小猫咪，大眼睛，粉色蝴蝶结');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [taskStats, setTaskStats] = useState<any>(null);
  const [allTasks, setAllTasks] = useState<any[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // 加载任务统计和列表
  const loadTaskData = async () => {
    try {
      const [stats, tasks] = await Promise.all([
        taskManager.getTaskStats(),
        taskManager.getAllTasks(10)
      ]);
      setTaskStats(stats);
      setAllTasks(tasks);
      addLog(`加载了 ${tasks.length} 个任务，统计: ${JSON.stringify(stats)}`);
    } catch (error) {
      addLog(`加载任务数据失败: ${error}`);
    }
  };

  useEffect(() => {
    loadTaskData();
  }, []);

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      alert('请输入提示词');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setResults([]);
    setProgress(0);
    setStatus('');
    setLogs([]);

    try {
      addLog('开始提交Supabase异步任务...');

      const taskId = await asyncPollingManager.submitAndPoll(
        prompt,
        imageFile || undefined,
        {
          onProgress: (progress, status) => {
            setProgress(progress);
            setStatus(status);
            addLog(`进度更新: ${progress}% - ${status}`);
          },
          onComplete: (results) => {
            setResults(results);
            setIsSubmitting(false);
            addLog(`任务完成！生成了 ${results.length} 张图片`);
            loadTaskData(); // 重新加载任务数据
          },
          onError: (error) => {
            setError(error);
            setIsSubmitting(false);
            addLog(`任务失败: ${error}`);
            loadTaskData(); // 重新加载任务数据
          }
        }
      );

      setCurrentTaskId(taskId);
      addLog(`任务ID: ${taskId} (已保存到Supabase)`);
      addLog('开始10秒间隔轮询...');

    } catch (error) {
      setError(error instanceof Error ? error.message : '提交失败');
      setIsSubmitting(false);
      addLog(`提交失败: ${error}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      addLog(`选择图片: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    }
  };

  const handleStopPolling = () => {
    if (currentTaskId) {
      asyncPollingManager.stopPolling(currentTaskId);
      setIsSubmitting(false);
      addLog('手动停止轮询');
    }
  };

  const handleCleanupTasks = async () => {
    try {
      const deletedCount = await taskManager.cleanupExpiredTasks();
      addLog(`清理了 ${deletedCount} 个过期任务`);
      loadTaskData();
    } catch (error) {
      addLog(`清理任务失败: ${error}`);
    }
  };

  const pollingInfo = asyncPollingManager.getPollingInfo();

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">🗄️ Supabase + 异步轮询测试</h1>
      
      <div className="bg-green-50 p-4 rounded-lg mb-6">
        <h2 className="font-semibold text-green-800 mb-2">✅ Supabase集成功能</h2>
        <ul className="text-green-700 text-sm space-y-1">
          <li>• 任务状态持久化存储到Supabase数据库</li>
          <li>• 支持服务器重启后任务状态恢复</li>
          <li>• 自动清理过期任务（24小时）</li>
          <li>• 实时任务统计和历史记录</li>
        </ul>
      </div>

      {/* 任务统计 */}
      {taskStats && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="font-semibold mb-4">📊 任务统计</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{taskStats.total}</div>
              <div className="text-sm text-gray-600">总任务</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{taskStats.pending}</div>
              <div className="text-sm text-gray-600">等待中</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{taskStats.processing}</div>
              <div className="text-sm text-gray-600">处理中</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{taskStats.completed}</div>
              <div className="text-sm text-gray-600">已完成</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{taskStats.failed}</div>
              <div className="text-sm text-gray-600">失败</div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={loadTaskData}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              刷新数据
            </button>
            <button
              onClick={handleCleanupTasks}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
            >
              清理过期任务
            </button>
          </div>
        </div>
      )}

      {/* 输入区域 */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">提示词</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full p-3 border rounded-lg"
            rows={3}
            placeholder="描述你想要生成的图片..."
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">图片文件（可选，用于图生图）</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full p-2 border rounded-lg"
          />
          {imageFile && (
            <p className="text-sm text-gray-600 mt-1">
              已选择: {imageFile.name} ({(imageFile.size / 1024 / 1024).toFixed(2)}MB)
            </p>
          )}
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? '处理中...' : '提交Supabase任务'}
          </button>
          
          {isSubmitting && (
            <button
              onClick={handleStopPolling}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              停止轮询
            </button>
          )}
        </div>
      </div>

      {/* 当前任务状态 */}
      {(isSubmitting || progress > 0) && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="font-semibold mb-4">📊 当前任务状态</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>进度</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
            <p><strong>状态:</strong> {status}</p>
            <p><strong>任务ID:</strong> {currentTaskId}</p>
            <p><strong>活跃轮询:</strong> {pollingInfo.activeCount} 个</p>
          </div>
        </div>
      )}

      {/* 错误显示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-red-800 mb-2">❌ 错误</h3>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* 结果显示 */}
      {results.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="font-semibold mb-4">🎨 生成结果 ({results.length} 张图片)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((imageUrl, index) => (
              <div key={index} className="border rounded-lg overflow-hidden">
                <img 
                  src={imageUrl} 
                  alt={`生成的图片 ${index + 1}`}
                  className="w-full h-64 object-cover"
                />
                <div className="p-2 text-center">
                  <a 
                    href={imageUrl} 
                    download={`generated-image-${index + 1}.png`}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    下载图片 {index + 1}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 任务历史 */}
      {allTasks.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="font-semibold mb-4">📋 最近任务 (最新10个)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">任务ID</th>
                  <th className="text-left p-2">状态</th>
                  <th className="text-left p-2">进度</th>
                  <th className="text-left p-2">提示词</th>
                  <th className="text-left p-2">创建时间</th>
                </tr>
              </thead>
              <tbody>
                {allTasks.map((task) => (
                  <tr key={task.id} className="border-b">
                    <td className="p-2 font-mono text-xs">{task.task_id.substring(0, 8)}...</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        task.status === 'completed' ? 'bg-green-100 text-green-800' :
                        task.status === 'failed' ? 'bg-red-100 text-red-800' :
                        task.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="p-2">{task.progress}%</td>
                    <td className="p-2 max-w-xs truncate">{task.prompt}</td>
                    <td className="p-2">{new Date(task.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 日志显示 */}
      {logs.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-3">📝 执行日志</h3>
          <div className="bg-black text-green-400 p-3 rounded font-mono text-sm max-h-64 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
