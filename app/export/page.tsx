"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Download, Share2, Copy, Check, ArrowLeft, Sparkles, Settings } from "lucide-react"

export default function ExportPage() {
  const router = useRouter()
  const [selectedFormat, setSelectedFormat] = useState("PNG")
  const [selectedSize, setSelectedSize] = useState("1024x1024")
  const [isExporting, setIsExporting] = useState(false)
  const [copied, setCopied] = useState(false)

  const formats = [
    { value: "PNG", label: "PNG", desc: "透明背景，适合头像" },
    { value: "JPG", label: "JPG", desc: "文件较小，适合分享" },
    { value: "SVG", label: "SVG", desc: "矢量格式，无限缩放" },
  ]

  const sizes = [
    { value: "512x512", label: "512×512", desc: "标准尺寸" },
    { value: "1024x1024", label: "1024×1024", desc: "高清推荐" },
    { value: "2048x2048", label: "2048×2048", desc: "超高清" },
  ]

  const handleExport = async () => {
    setIsExporting(true)
    setTimeout(() => {
      setIsExporting(false)
      console.log(`导出 ${selectedFormat} 格式，尺寸 ${selectedSize}`)
    }, 2000)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText("https://ip-creator.com/share/abc123")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>返回</span>
              </button>
              <div className="h-6 w-px bg-slate-300"></div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="font-semibold text-slate-900">IP创造师</span>
              </div>
            </div>
            <h1 className="text-lg font-semibold text-slate-900">导出您的IP形象</h1>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Preview */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">预览</h2>
            <div className="aspect-square bg-slate-100 rounded-xl flex items-center justify-center mb-6">
              <img
                src="/placeholder.svg?height=400&width=400"
                alt="Selected IP"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <div className="text-center">
              <h3 className="font-medium text-slate-900 mb-2">您的专属IP形象</h3>
              <p className="text-sm text-slate-500">可爱卡通风格 · 粉色主题</p>
            </div>
          </div>

          {/* Export Settings */}
          <div className="space-y-6">
            {/* Format Selection */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>导出格式</span>
              </h3>
              <div className="space-y-3">
                {formats.map((format) => (
                  <label
                    key={format.value}
                    className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <input
                      type="radio"
                      name="format"
                      value={format.value}
                      checked={selectedFormat === format.value}
                      onChange={(e) => setSelectedFormat(e.target.value)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">{format.label}</div>
                      <div className="text-sm text-slate-500">{format.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Size Selection */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">图像尺寸</h3>
              <div className="space-y-3">
                {sizes.map((size) => (
                  <label
                    key={size.value}
                    className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <input
                      type="radio"
                      name="size"
                      value={size.value}
                      checked={selectedSize === size.value}
                      onChange={(e) => setSelectedSize(e.target.value)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">{size.label}</div>
                      <div className="text-sm text-slate-500">{size.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Export Actions */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">下载与分享</h3>
              <div className="space-y-3">
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
                >
                  {isExporting ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>导出中...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      <span>
                        下载 {selectedFormat} ({selectedSize})
                      </span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleCopyLink}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5 text-green-600" />
                      <span className="text-green-600">已复制分享链接</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      <span>复制分享链接</span>
                    </>
                  )}
                </button>

                <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2">
                  <Share2 className="w-5 h-5" />
                  <span>分享到社交平台</span>
                </button>
              </div>
            </div>

            {/* Additional Services */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">扩展服务</h3>
              <div className="space-y-3">
                <div className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="font-medium text-slate-900 mb-1">表情包套装</div>
                  <div className="text-sm text-slate-500">基于您的IP形象生成多个表情包</div>
                </div>
                <div className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="font-medium text-slate-900 mb-1">周边商品定制</div>
                  <div className="text-sm text-slate-500">T恤、贴纸、马克杯等实体商品</div>
                </div>
                <div className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="font-medium text-slate-900 mb-1">品牌套装设计</div>
                  <div className="text-sm text-slate-500">完整的视觉识别系统设计</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
