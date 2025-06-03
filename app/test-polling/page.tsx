"use client"

import { useState } from 'react'
import { pollingManager, PollingTask } from '@/lib/polling-manager'

export default function TestPollingPage() {
  const [taskId, setTaskId] = useState<string>('')
  const [currentTask, setCurrentTask] = useState<PollingTask | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
  }

  const handleSubmitTask = async () => {
    setIsSubmitting(true)
    addLog('开始提交测试任务...')

    try {
      const testTaskId = await pollingManager.submitTask(
        'Q版可爱风格，卡通头像，圆润比例，大眼睛，明快配色，可爱表情，二次元风格',
        undefined, // 不上传图片，纯文生图
        {
          onProgress: (task: PollingTask) => {
            setCurrentTask(task)
            addLog(`进度更新: ${task.status} - ${task.progress}% - ${task.message}`)
          },
          onCompleted: (task: PollingTask) => {
            setCurrentTask(task)
            addLog(`✅ 任务完成! 生成了 ${task.results?.length || 0} 张图片`)
          },
          onFailed: (task: PollingTask) => {
            setCurrentTask(task)
            addLog(`❌ 任务失败: ${task.error}`)
          },
          onStatusChange: (task: PollingTask) => {
            addLog(`🔄 状态变化: ${task.status}`)
          }
        }
      )

      setTaskId(testTaskId)
      addLog(`📝 任务已提交，ID: ${testTaskId}`)
      
    } catch (error) {
      addLog(`❌ 提交失败: ${error}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStopPolling = () => {
    if (taskId) {
      pollingManager.stopPolling(taskId)
      addLog(`⏹️ 停止轮询: ${taskId}`)
    }
  }

  const handleClearLogs = () => {
    setLogs([])
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">轮询系统测试页面</h1>
        
        {/* 控制面板 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">控制面板</h2>
          
          <div className="flex gap-4 mb-4">
            <button
              onClick={handleSubmitTask}
              disabled={isSubmitting}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold"
            >
              {isSubmitting ? '提交中...' : '提交测试任务'}
            </button>
            
            <button
              onClick={handleStopPolling}
              disabled={!taskId}
              className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold"
            >
              停止轮询
            </button>
            
            <button
              onClick={handleClearLogs}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold"
            >
              清空日志
            </button>
          </div>
          
          {taskId && (
            <div className="bg-gray-100 p-3 rounded">
              <strong>当前任务ID:</strong> {taskId}
            </div>
          )}
        </div>

        {/* 任务状态 */}
        {currentTask && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">任务状态</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>状态:</strong> 
                <span className={`ml-2 px-2 py-1 rounded text-sm ${
                  currentTask.status === 'completed' ? 'bg-green-100 text-green-800' :
                  currentTask.status === 'failed' ? 'bg-red-100 text-red-800' :
                  currentTask.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {currentTask.status}
                </span>
              </div>
              
              <div>
                <strong>进度:</strong> {currentTask.progress}%
              </div>
              
              <div className="col-span-2">
                <strong>消息:</strong> {currentTask.message}
              </div>
              
              {currentTask.error && (
                <div className="col-span-2">
                  <strong>错误:</strong> 
                  <span className="text-red-600 ml-2">{currentTask.error}</span>
                </div>
              )}
              
              {currentTask.results && currentTask.results.length > 0 && (
                <div className="col-span-2">
                  <strong>结果:</strong>
                  <div className="mt-2 grid grid-cols-3 gap-4">
                    {currentTask.results.map((url, index) => (
                      <div key={index} className="border rounded-lg p-2">
                        <img 
                          src={url} 
                          alt={`生成图片 ${index + 1}`}
                          className="w-full h-32 object-cover rounded"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder.svg?height=128&width=128'
                          }}
                        />
                        <p className="text-sm text-gray-600 mt-1">图片 {index + 1}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 日志面板 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">实时日志</h2>
          
          <div className="bg-black text-green-400 p-4 rounded-lg h-96 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-gray-500">暂无日志...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* API 信息 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">API 端点</h2>
          
          <div className="space-y-2 text-sm">
            <div><strong>提交任务:</strong> POST /api/tasks/submit</div>
            <div><strong>查询状态:</strong> GET /api/tasks/status/[taskId]</div>
            <div><strong>轮询间隔:</strong> 10秒</div>
            <div><strong>任务过期:</strong> 30分钟</div>
          </div>
        </div>
      </div>
    </div>
  )
}
