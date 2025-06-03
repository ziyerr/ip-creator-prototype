"use client"

import { useState } from 'react'
import { vercelPollingManager, VercelJob } from '@/lib/vercel-polling-manager'

export default function TestVercelPage() {
  const [jobId, setJobId] = useState<string>('')
  const [currentJob, setCurrentJob] = useState<VercelJob | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
  }

  const handleSubmitJob = async () => {
    setIsSubmitting(true)
    addLog('开始提交Vercel测试任务...')

    try {
      const testJobId = await vercelPollingManager.submitJob(
        'Q版可爱风格，卡通头像，圆润比例，大眼睛，明快配色，可爱表情，二次元风格',
        undefined, // 不上传图片，纯文生图
        {
          onProgress: (job: VercelJob) => {
            setCurrentJob(job)
            addLog(`进度更新: ${job.status} - ${job.message}`)
          },
          onCompleted: (job: VercelJob) => {
            setCurrentJob(job)
            addLog(`✅ 任务完成! 生成了 ${job.results?.length || 0} 张图片`)
          },
          onFailed: (job: VercelJob) => {
            setCurrentJob(job)
            addLog(`❌ 任务失败: ${job.error}`)
          },
          onStatusChange: (job: VercelJob) => {
            addLog(`🔄 状态变化: ${job.status}`)
          }
        }
      )

      setJobId(testJobId)
      addLog(`📝 任务已提交，ID: ${testJobId}`)
      
    } catch (error) {
      addLog(`❌ 提交失败: ${error}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStopPolling = () => {
    if (jobId) {
      vercelPollingManager.stopPolling(jobId)
      addLog(`⏹️ 停止轮询: ${jobId}`)
    }
  }

  const handleClearLogs = () => {
    setLogs([])
  }

  const handleCheckStatus = async () => {
    if (!jobId) return
    
    try {
      addLog(`🔍 手动检查状态: ${jobId}`)
      const response = await fetch(`/api/checkImageStatus?jobId=${jobId}`)
      const data = await response.json()
      addLog(`📊 状态检查结果: ${JSON.stringify(data, null, 2)}`)
    } catch (error) {
      addLog(`❌ 状态检查失败: ${error}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Vercel轮询系统测试页面</h1>
        
        {/* 控制面板 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">控制面板</h2>
          
          <div className="flex gap-4 mb-4 flex-wrap">
            <button
              onClick={handleSubmitJob}
              disabled={isSubmitting}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold"
            >
              {isSubmitting ? '提交中...' : '提交测试任务'}
            </button>
            
            <button
              onClick={handleCheckStatus}
              disabled={!jobId}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold"
            >
              手动检查状态
            </button>
            
            <button
              onClick={handleStopPolling}
              disabled={!jobId}
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
          
          {jobId && (
            <div className="bg-gray-100 p-3 rounded">
              <strong>当前任务ID:</strong> {jobId}
            </div>
          )}
        </div>

        {/* 任务状态 */}
        {currentJob && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">任务状态</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>状态:</strong> 
                <span className={`ml-2 px-2 py-1 rounded text-sm ${
                  currentJob.status === 'completed' ? 'bg-green-100 text-green-800' :
                  currentJob.status === 'failed' ? 'bg-red-100 text-red-800' :
                  currentJob.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {currentJob.status}
                </span>
              </div>
              
              <div>
                <strong>提交时间:</strong> {new Date(currentJob.submittedAt).toLocaleString()}
              </div>
              
              <div className="col-span-2">
                <strong>消息:</strong> {currentJob.message}
              </div>
              
              {currentJob.error && (
                <div className="col-span-2">
                  <strong>错误:</strong> 
                  <span className="text-red-600 ml-2">{currentJob.error}</span>
                </div>
              )}
              
              {currentJob.results && currentJob.results.length > 0 && (
                <div className="col-span-2">
                  <strong>结果:</strong>
                  <div className="mt-2 grid grid-cols-3 gap-4">
                    {currentJob.results.map((url, index) => (
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
                        <a 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline"
                        >
                          查看原图
                        </a>
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
          <h2 className="text-xl font-semibold mb-4">Vercel API 端点</h2>
          
          <div className="space-y-2 text-sm">
            <div><strong>提交任务:</strong> POST /api/tasks/submit (同步调用麻雀API)</div>
            <div><strong>查询状态:</strong> GET /api/checkImageStatus?jobId=[jobId]</div>
            <div><strong>架构模式:</strong> 无服务器同步调用</div>
            <div><strong>超时限制:</strong> 60秒</div>
            <div><strong>轮询间隔:</strong> 10秒（兼容模式）</div>
          </div>
        </div>
      </div>
    </div>
  )
}
