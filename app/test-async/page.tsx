'use client';

import { useState, useRef } from 'react';
import { asyncPollingManager } from '@/lib/async-polling-manager';

export default function TestAsyncPage() {
  const [prompt, setPrompt] = useState('Q版可爱风格的小猫咪，大眼睛，粉色蝴蝶结');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

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
      addLog('开始提交异步任务...');

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
          },
          onError: (error) => {
            setError(error);
            setIsSubmitting(false);
            addLog(`任务失败: ${error}`);
          }
        }
      );

      setCurrentTaskId(taskId);
      addLog(`任务ID: ${taskId}`);
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

  const pollingInfo = asyncPollingManager.getPollingInfo();

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">🔄 异步轮询测试</h1>
      
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h2 className="font-semibold text-blue-800 mb-2">📋 测试说明</h2>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• 提交任务后立即返回，不会阻塞页面</li>
          <li>• 每10秒自动检查一次任务状态</li>
          <li>• 支持文生图和图生图两种模式</li>
          <li>• 避免Vercel 60秒超时限制</li>
        </ul>
      </div>

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
            ref={fileInputRef}
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
            {isSubmitting ? '处理中...' : '提交异步任务'}
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

      {/* 状态显示 */}
      {(isSubmitting || progress > 0) && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="font-semibold mb-4">📊 任务状态</h3>
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
