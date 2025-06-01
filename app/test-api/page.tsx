"use client"

import { useState } from "react"
import { generateImageWithReference } from "@/lib/api"

export default function TestApiPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const testAPI = async () => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log('开始测试异步任务API...')
      
      // 创建一个测试用的图片文件
      const testImageBlob = new Blob([new ArrayBuffer(1024)], { type: 'image/png' })
      const testImageFile = new File([testImageBlob], 'test.png', { type: 'image/png' })
      
      const imageUrls = await generateImageWithReference({
        prompt: 'Q版可爱风格，卡通头像，圆润比例，大眼睛，明快配色，可爱表情，二次元风格',
        imageFile: testImageFile,
        style: 'cute'
      }, (status) => {
        console.log('任务状态更新:', status)
      })
      
      console.log('API测试成功，生成的图片URLs:', imageUrls)
      setResult(imageUrls)
    } catch (err) {
      console.error('API测试失败:', err)
      setError(err instanceof Error ? err.message : '未知错误')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">异步任务API测试页面</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <button
            onClick={testAPI}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
          >
            {isLoading ? '测试中...' : '测试异步图片生成API'}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-red-800 font-semibold mb-2">错误信息：</h3>
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {result && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-green-800 font-semibold mb-2">生成成功！</h3>
              <p className="text-green-600 mb-4">生成了 {result.length} 张图片</p>
              <div className="grid gap-4">
                {result.map((url, index) => (
                  <div key={index} className="border rounded-lg p-2">
                    <p className="text-sm text-gray-600 mb-2">图片 {index + 1}: {url.substring(0, 50)}...</p>
                    <img 
                      src={url} 
                      alt={`生成的图片 ${index + 1}`} 
                      className="w-full max-w-md mx-auto rounded-lg shadow-md"
                      onError={(e) => {
                        console.error('图片加载失败')
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <a 
            href="/" 
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← 返回主页
          </a>
        </div>
      </div>
    </div>
  )
}
