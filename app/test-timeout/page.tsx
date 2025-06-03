'use client';

import { useState } from 'react';

export default function TestTimeoutPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testSubmitTask = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/tasks/submit-async', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: '测试超时检测：一个可爱的卡通头像'
        })
      });
      
      const data = await response.json();
      setResult(data);
      
      if (data.success) {
        // 开始轮询任务状态
        pollTaskStatus(data.taskId);
      }
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : '提交失败' });
    } finally {
      setLoading(false);
    }
  };

  const pollTaskStatus = async (taskId: string) => {
    const maxPolls = 20; // 最多轮询20次（约3分钟）
    let pollCount = 0;
    
    const poll = async () => {
      try {
        const response = await fetch(`/api/tasks/submit-async?taskId=${taskId}`);
        const data = await response.json();
        
        console.log(`轮询 ${pollCount + 1}/${maxPolls}:`, data);
        
        setResult((prev: any) => ({
          ...prev,
          status: data.status,
          progress: data.progress,
          results: data.results,
          error: data.error,
          pollCount: pollCount + 1
        }));
        
        if (data.status === 'completed' || data.status === 'failed') {
          console.log('任务完成，停止轮询');
          return;
        }
        
        pollCount++;
        if (pollCount < maxPolls) {
          setTimeout(poll, 10000); // 10秒后再次轮询
        } else {
          console.log('轮询次数达到上限，停止轮询');
        }
      } catch (error) {
        console.error('轮询失败:', error);
      }
    };
    
    poll();
  };

  const checkTimeout = async () => {
    try {
      const response = await fetch('/api/tasks/check-timeout', { method: 'POST' });
      const data = await response.json();
      alert(JSON.stringify(data, null, 2));
    } catch (error) {
      alert('检查超时失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const testMaqueAPI = async () => {
    try {
      const response = await fetch('/api/test-maque', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: '测试麻雀API：一个可爱的卡通头像'
        })
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : '测试失败' });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">🧪 超时检测测试页面</h1>
      
      <div className="space-y-4 mb-6">
        <button
          onClick={testSubmitTask}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '提交中...' : '提交测试任务'}
        </button>
        
        <button
          onClick={checkTimeout}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 ml-2"
        >
          手动检查超时
        </button>
        
        <button
          onClick={testMaqueAPI}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 ml-2"
        >
          直接测试麻雀API
        </button>
      </div>

      {result && (
        <div className="bg-gray-100 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">测试结果：</h3>
          <pre className="text-sm overflow-auto max-h-96">
            {JSON.stringify(result, null, 2)}
          </pre>
          
          {result.results && result.results.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">生成的图片：</h4>
              {result.results.map((url: string, index: number) => (
                <div key={index} className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">图片 {index + 1}:</p>
                  <img 
                    src={url} 
                    alt={`生成图片 ${index + 1}`}
                    className="max-w-xs border rounded"
                    onLoad={() => console.log(`图片 ${index + 1} 加载成功`)}
                    onError={(e) => {
                      console.error(`图片 ${index + 1} 加载失败`);
                      console.log('图片URL:', url);
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-8 bg-yellow-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">📋 测试说明：</h3>
        <ul className="text-sm space-y-1">
          <li>• <strong>提交测试任务</strong>：提交一个图片生成任务并开始轮询状态</li>
          <li>• <strong>手动检查超时</strong>：立即检查并标记超时任务</li>
          <li>• <strong>直接测试麻雀API</strong>：绕过任务系统直接调用麻雀API</li>
          <li>• 任务超过2分钟会被自动标记为超时失败</li>
          <li>• 轮询最多进行20次（约3分钟）</li>
        </ul>
      </div>
    </div>
  );
}
