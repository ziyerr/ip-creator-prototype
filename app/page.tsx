"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, Menu, Upload, X, Zap, Palette, Cpu, ArrowRight } from "lucide-react"
import { generateImageWithReference } from "@/lib/api"

interface StyleOption {
  id: string
  name: string
  description: string
  features: string[]
  icon: React.ComponentType<{ className?: string }>
  gradient: string
  slogan?: string
}

export default function HomePage() {
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [selectedStyle, setSelectedStyle] = useState<string>("")
  const [customInput, setCustomInput] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generationStage, setGenerationStage] = useState("")
  const [generatedImages, setGeneratedImages] = useState<Array<{ id: string; url: string; style: string }>>([])
  const [showResults, setShowResults] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [imageLoadStates, setImageLoadStates] = useState<Record<string, 'loading' | 'loaded' | 'error'>>({})

  const router = useRouter()

  const styleOptions: StyleOption[] = [
    {
      id: "cute",
      name: "Q版可爱风",
      description: "圆润比例、大眼睛、明快配色",
      features: ["夸张大眼", "圆润比例", "扁平明快配色"],
      icon: Sparkles,
      gradient: "from-pink-400 to-purple-400",
      slogan: "Q版可爱风格，卡通头像，圆润比例，大眼睛，明快配色，可爱表情，二次元风格",
    },
    {
      id: "toy",
      name: "潮玩玩具风",
      description: "3D等距视角、软质材质、精致细节",
      features: ["3D等距视角", "软质塑料质感", "精致细节"],
      icon: Palette,
      gradient: "from-orange-400 to-red-400",
      slogan: "潮玩玩具风格，3D等距视角，软质塑料材质，精致细节，玩具质感，立体造型",
    },
    {
      id: "cyber",
      name: "赛博科幻风",
      description: "高饱和霓虹色、未来电子纹理",
      features: ["高饱和霓虹色", "电子线路纹理", "未来感造型"],
      icon: Cpu,
      gradient: "from-cyan-400 to-blue-400",
      slogan: "赛博科幻风格，高饱和霓虹色，未来电子纹理，科技感，电子线路纹理，未来感造型",
    },
  ]

  const handleImageUpload = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    if (file.type.startsWith("image/")) {
      setUploadedImage(file)
    }
  }, [])

  const removeImage = useCallback(() => {
    setUploadedImage(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleImageUpload(e.dataTransfer.files)
    },
    [handleImageUpload],
  )

  const handleGenerate = useCallback(async () => {
    if (!uploadedImage || !selectedStyle) return

    console.log('开始生成流程...')
    setIsGenerating(true)
    setGenerationProgress(0)
    setGenerationStage("🔍 分析上传图片中...")
    setShowResults(false)
    setErrorMessage("")

    try {
      // 模拟图片分析步骤
      await new Promise(resolve => setTimeout(resolve, 800))
      setGenerationProgress(15)
      setGenerationStage("👤 识别人物特征与性别...")
      
      await new Promise(resolve => setTimeout(resolve, 600))
      setGenerationProgress(25)
      setGenerationStage("🎨 准备风格模板...")
      
      // 使用新的API和提示词模板系统
      console.log('开始使用麻雀API + gpt-image-1生成...')
      setGenerationProgress(35)
      setGenerationStage("📝 构建个性化提示词...")
      
      await new Promise(resolve => setTimeout(resolve, 500))
      setGenerationProgress(45)

      // 3. 调用AI生成图片
      setGenerationStage("🤖 AI正在生成您的专属IP形象（3张方案）...")
      setGenerationProgress(60)

      console.log('调用API生成3张方案图片...')
      
      try {
        // 一次性生成3张图片
        const generatedImageUrls = await generateImageWithReference({
          prompt: '生成3张不同变体的专属IP形象', // 这个会被模板覆盖
          imageFile: uploadedImage,
          style: selectedStyle as 'cute' | 'toy' | 'cyber',
          customRequirements: customInput || undefined,
        })
        
        console.log(`成功生成${generatedImageUrls.length}张图片:`, generatedImageUrls)
        
        // 更新进度
        setGenerationProgress(80)
        setGenerationStage("✨ 准备展示生成结果...")
        
        // 构建结果数组
        const results: Array<{ id: string; url: string; style: string }> = 
          generatedImageUrls.map((url, index) => ({
            id: (index + 1).toString(),
            url: url,
            style: `方案${String.fromCharCode(65 + index)}`
          }))
        
        // 补充到3张（如果API返回少于3张）
        while (results.length < 3) {
          results.push({
            id: (results.length + 1).toString(),
            url: "/placeholder.svg?height=300&width=300",
            style: `方案${String.fromCharCode(65 + results.length)}`
          })
        }
        
        // 4. 完成生成
        setGenerationStage("🎉 所有方案生成完成！")
        setGenerationProgress(95)
        
        await new Promise(resolve => setTimeout(resolve, 500))
        setGenerationProgress(100)
        setGenerationStage("✨ 展示您的专属IP形象...")

        setTimeout(() => {
          setGeneratedImages(results)
          setIsGenerating(false)
          setShowResults(true)
        }, 800)
        
      } catch (error) {
        console.error('生成过程中出错:', error)
        setGenerationStage("❌ 生成失败")
        setErrorMessage(error instanceof Error ? error.message : "生成过程中出现未知错误，请重试")

        // 显示错误提示，但仍然提供占位符结果
        setTimeout(() => {
          const fallbackResults = [
            { id: "1", url: "/placeholder.svg?height=300&width=300", style: "方案A" },
            { id: "2", url: "/placeholder.svg?height=300&width=300", style: "方案B" },
            { id: "3", url: "/placeholder.svg?height=300&width=300", style: "方案C" },
          ]
          setGeneratedImages(fallbackResults)
          setIsGenerating(false)
          setShowResults(true)
        }, 1000)
      }

    } catch (outerError) {
      console.error('外层处理错误:', outerError)
      setIsGenerating(false)
      setErrorMessage('系统错误，请重试')
    }
  }, [uploadedImage, selectedStyle, customInput])

  const handleRegenerateAll = useCallback(() => {
    setShowResults(false)
    setGeneratedImages([])
    handleGenerate()
  }, [handleGenerate])

  const canGenerate = uploadedImage && selectedStyle

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100/80 via-blue-100/60 to-purple-100/60 relative overflow-x-hidden">
      {/* 动感色块全局背景 */}
      <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-gradient-to-br from-pink-300/40 via-blue-300/30 to-purple-300/30 rounded-full blur-3xl opacity-60 animate-pulse z-0" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-tr from-blue-200/40 via-purple-200/30 to-pink-200/30 rounded-full blur-2xl opacity-50 animate-pulse z-0" />
      {/* Header */}
      <header className="relative z-10 bg-white/80 backdrop-blur-xl border-b-4 border-blue-100 shadow-lg rounded-b-3xl mx-2 mt-2">
        <div className="max-w-7xl mx-auto px-4 py-3 md:px-8 md:py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-400 via-blue-400 to-purple-400 rounded-2xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold bg-gradient-to-r from-pink-500 via-blue-500 to-purple-500 bg-clip-text text-transparent flex items-center gap-2">IP创造师 <span role="img" aria-label="潮">🔥</span></h1>
              <p className="text-sm text-slate-500 font-semibold">AI驱动的个人形象定制平台</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button className="text-blue-600 hover:text-pink-500 font-bold text-lg transition-colors">登录</button>
            <button className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white px-5 py-2 rounded-full font-extrabold text-lg shadow-lg transition-all">免费试用</button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <section className="relative py-8 px-2 md:py-16 md:px-0 flex items-center justify-center min-h-[90vh] bg-gradient-to-br from-pink-100/80 via-blue-100/60 to-purple-100/60 backdrop-blur-2xl overflow-hidden">
        {/* 动感色块背景 */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-gradient-to-br from-pink-300/40 via-blue-300/30 to-purple-300/30 rounded-full blur-3xl opacity-60 animate-pulse z-0" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-tr from-blue-200/40 via-purple-200/30 to-pink-200/30 rounded-full blur-2xl opacity-50 animate-pulse z-0" />
        <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 items-stretch justify-center">
          {/* 左侧：上传 & 选项 */}
          <div className={`bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl border-4 border-blue-100 p-6 flex flex-col justify-between transition-all duration-500 hover:shadow-blue-200/60 ${
            showResults 
              ? 'lg:w-[30%] lg:min-w-[320px] min-h-[400px]' 
              : 'flex-1 p-10 min-h-[520px]'
          } h-full`}>
            <div>
              <h2 className={`font-extrabold mb-3 bg-gradient-to-r from-pink-500 via-blue-500 to-purple-500 bg-clip-text text-transparent tracking-tight drop-shadow flex items-center gap-2 ${
                showResults ? 'text-2xl' : 'text-5xl'
              }`}>
                <span role="img" aria-label="闪电">⚡️</span> 
                {showResults ? 'IP创造师' : '一键生成专属 IP形象'}
              </h2>
              {!showResults && (
                <p className="text-2xl text-slate-500 mb-10 font-semibold flex items-center gap-2">
                  <span role="img" aria-label="魔法">✨</span> 上传头像，选择风格，AI为您实时生成独特IP形象
                </p>
              )}
              
              {/* 图片上传 */}
              <div className="mb-6">
                <label className="block text-base font-semibold text-slate-700 mb-2">上传头像</label>
                <div
                  className={`border-2 border-dashed rounded-2xl transition-all duration-300 bg-white/60 hover:bg-blue-50/60 shadow-inner ${
                    showResults ? 'p-4' : 'p-6'
                  } ${isDragging ? "border-blue-500 bg-blue-50/80" : "border-slate-300 hover:border-blue-400"}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {uploadedImage ? (
                    <div className="relative group flex items-center justify-center">
                      <img
                        src={URL.createObjectURL(uploadedImage)}
                        alt="上传的头像"
                        className={`object-contain rounded-xl shadow-lg ring-2 ring-blue-200/30 group-hover:scale-105 transition-transform duration-300 bg-white ${
                          showResults ? 'max-h-32 max-w-full' : 'max-h-64 max-w-full'
                        }`}
                        onError={(e) => {
                          console.error('图片加载失败');
                          e.currentTarget.src = "/placeholder.svg";
                        }}
                        onLoad={() => {
                          console.log('图片加载成功');
                        }}
                      />
                      <button
                        onClick={removeImage}
                        className="absolute top-2 right-2 w-8 h-8 bg-red-500/80 text-white rounded-full hover:bg-red-600/90 transition-colors flex items-center justify-center shadow-lg backdrop-blur-md"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) :
                    <label className="block cursor-pointer">
                      <div className={`text-center ${showResults ? 'py-4' : 'py-8'}`}>
                        <Upload className={`text-blue-400 mx-auto mb-3 drop-shadow ${showResults ? 'w-8 h-8' : 'w-12 h-12'}`} />
                        <p className="text-slate-700 font-semibold mb-1">上传您的头像</p>
                        {!showResults && (
                          <>
                            <p className="text-slate-400 text-base">拖拽图片到此处，或点击选择文件</p>
                            <p className="text-slate-300 text-xs mt-2">支持 JPG、PNG 格式</p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e.target.files)}
                        className="hidden"
                      />
                    </label>
                  }
                </div>
              </div>
              
              {/* 风格选择 - 精简版 */}
              <div className="mb-6">
                <label className={`block font-extrabold mb-4 bg-gradient-to-r from-pink-500 via-blue-500 to-purple-500 bg-clip-text text-transparent flex items-center gap-2 ${
                  showResults ? 'text-lg' : 'text-2xl'
                }`}>
                  <span role="img" aria-label="风格">🎨</span> 选择风格
                </label>
                <div className={`flex gap-3 overflow-x-auto pb-2 hide-scrollbar ${
                  showResults ? 'flex-col min-h-[200px]' : 'min-h-[340px]'
                }`}>
                  {styleOptions.map((style) => (
                    <div
                      key={style.id}
                      className={`border-4 rounded-3xl cursor-pointer transition-all shadow-xl flex items-center backdrop-blur-2xl hover:scale-105 hover:shadow-2xl hover:border-blue-400/80 active:scale-100 group relative ${
                        showResults 
                          ? 'min-w-full p-4 h-16 bg-gradient-to-r from-white/80 to-white/60' 
                          : `min-w-[220px] max-w-xs flex-1 px-7 py-8 flex-col justify-between min-h-[320px] h-full bg-gradient-to-br ${
                              style.id === 'cute' ? 'from-pink-200/80 via-pink-100/60 to-purple-100/60' : 
                              style.id === 'toy' ? 'from-yellow-100/80 via-orange-100/60 to-red-100/60' : 
                              'from-cyan-100/80 via-blue-100/60 to-purple-100/60'
                            }`
                      } ${selectedStyle === style.id ? 'border-blue-700 shadow-[0_0_0_4px_rgba(30,64,175,0.25)] bg-white/90' : 'border-transparent'}`}
                      onClick={() => setSelectedStyle(style.id)}
                      style={{ boxShadow: selectedStyle === style.id ? '0 8px 32px 0 rgba(30,64,175,0.18)' : '0 2px 8px 0 rgba(80,80,200,0.08)' }}
                    >
                      {showResults ? (
                        // 精简版显示
                        <>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/60 shadow-lg mr-3">
                            <style.icon className="w-5 h-5 text-white drop-shadow-lg" />
                          </div>
                          <h4 className="font-bold text-sm tracking-wider text-slate-900 flex-1">{style.name}</h4>
                          {selectedStyle === style.id && (
                            <span className="inline-block w-6 h-6 bg-white border-2 border-blue-700 rounded-full shadow-lg flex items-center justify-center">
                              <svg width="16" height="16" fill="none" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" stroke="#2563eb" strokeWidth="1.5" fill="#fff"/><path d="M5 8l2 2 4-4" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </span>
                          )}
                        </>
                      ) : (
                        // 完整版显示
                        <>
                          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 bg-white/60 shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <style.icon className="w-10 h-10 text-white drop-shadow-lg" />
                          </div>
                          <h4 className="font-extrabold text-xl mb-2 tracking-wider text-slate-900 font-[Pacifico,ui-sans-serif] drop-shadow-sm text-center">{style.name}</h4>
                          <div className="flex flex-wrap gap-2 justify-center mb-2 flex-1 items-end">
                            {style.features.map((feature, index) => (
                              <span key={index} className={`px-3 py-1 rounded-full text-xs font-bold ${style.id === 'cute' ? 'bg-pink-100 text-pink-600' : style.id === 'toy' ? 'bg-orange-100 text-orange-600' : 'bg-cyan-100 text-cyan-600'} shadow-sm`}>
                                {feature}
                              </span>
                            ))}
                          </div>
                          <div className={`mt-2 text-sm font-semibold italic ${style.id === 'cute' ? 'text-pink-500' : style.id === 'toy' ? 'text-orange-500' : 'text-cyan-500'} text-center`}>{style.description}</div>
                          <div className="absolute top-4 right-4">
                            {selectedStyle === style.id && (
                              <span className="inline-block w-8 h-8 bg-white border-4 border-blue-700 rounded-full shadow-lg flex items-center justify-center animate-bounce">
                                <svg width="22" height="22" fill="none" viewBox="0 0 22 22"><circle cx="11" cy="11" r="9" stroke="#2563eb" strokeWidth="2.5" fill="#fff"/><path d="M7 11.5l3 3 5-5" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* 自定义输入 */}
              <div className="mb-6">
                <label className="block text-base font-semibold text-slate-700 mb-2">
                  自定义需求 <span className="text-slate-400">(可选)</span>
                </label>
                <textarea
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="例如：希望更加可爱一些，添加一些科技元素..."
                  className={`w-full p-3 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-slate-700 placeholder-slate-400 text-base bg-white/60 shadow-inner ${
                    showResults ? 'h-12' : 'h-16'
                  }`}
                />
                <div className="text-right mt-1">
                  <span className="text-xs text-slate-400">{customInput.length}/200字符</span>
                </div>
              </div>
              
              {/* 重新生成按钮 - 仅在结果显示时出现 */}
              {showResults && (
                <button
                  onClick={handleRegenerateAll}
                  className="bg-white hover:bg-gray-50 text-gray-900 font-semibold text-base flex items-center space-x-2 transition-all duration-300 transform hover:scale-105 px-4 py-2 rounded-xl shadow-md border border-gray-200 hover:border-gray-300"
                  style={{ 
                    boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.08)'
                  }}
                >
                  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>重新生成</span>
                </button>
              )}
            </div>
          </div>
          
          {/* 右侧：生成进度 & 预览 */}
          <div className={`bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200 p-8 flex flex-col justify-between transition-all duration-500 hover:shadow-blue-200/60 ${
            showResults 
              ? 'lg:w-[70%] min-h-[600px]' 
              : 'flex-1 min-h-[480px]'
          } h-full`}>
            <h3 className="text-2xl font-bold text-slate-900 mb-6 tracking-tight drop-shadow-sm">实时生成预览</h3>
            <div className="flex-1 flex flex-col justify-center">
              {!isGenerating && !showResults && (
                <div className="flex items-center justify-center h-72 text-center">
                  <div>
                    <div className="w-24 h-24 bg-slate-100/80 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner backdrop-blur">
                      <Sparkles className="w-14 h-14 text-blue-300" />
                    </div>
                    <p className="text-slate-600 font-semibold mb-2 text-lg">准备开始创作</p>
                    <p className="text-slate-400 text-base">上传头像并选择风格后，点击生成按钮</p>
                  </div>
                </div>
              )}
              {isGenerating && (
                <div className="space-y-6">
                  {/* 进度条 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-base font-semibold text-slate-700">生成进度</span>
                      <span className="text-base text-slate-500">{generationProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200/80 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${generationProgress}%` }}
                      ></div>
                    </div>
                  </div>
                  {/* 当前阶段 */}
                  <div className={`border rounded-2xl p-4 ${errorMessage ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"}`}>
                    <div className="flex items-center space-x-3">
                      {!errorMessage && (
                        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                      )}
                      <span className={`font-semibold text-lg ${errorMessage ? "text-red-800" : "text-blue-800"}`}>{generationStage}</span>
                    </div>
                    {errorMessage && (
                      <p className="text-red-600 text-base mt-2">{errorMessage}</p>
                    )}
                  </div>
                  {/* 预览区域 */}
                  <div className="border-2 border-dashed border-slate-300/80 rounded-2xl p-8 text-center bg-white/60 shadow-inner backdrop-blur">
                    <div className="animate-pulse">
                      <div className="w-56 h-56 bg-slate-200/80 rounded-xl mx-auto mb-4 shadow-lg" />
                      <p className="text-slate-400 text-base">正在生成您的专属IP形象...</p>
                    </div>
                  </div>
                </div>
              )}
              {showResults && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xl font-bold text-slate-900">生成结果</h4>
                    <button
                      onClick={handleRegenerateAll}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-base flex items-center space-x-2 transition-all duration-300 transform hover:scale-105 px-4 py-2 rounded-xl shadow-lg border border-white/20"
                      style={{ 
                        boxShadow: '0 4px 16px 0 rgba(168, 85, 247, 0.4), 0 1px 2px rgba(0,0,0,0.3)',
                        textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                      }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>重新生成</span>
                    </button>
                  </div>
                  
                  {/* 图片展示网格 */}
                  <div className={`grid gap-6 ${
                    showResults ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'
                  }`}>
                    {generatedImages.map((image, index) => (
                      <div
                        key={image.id}
                        className="border-2 border-slate-200 rounded-2xl p-4 hover:shadow-xl transition-all cursor-pointer bg-white/90 backdrop-blur group relative overflow-hidden hover:border-blue-400/60"
                      >
                        <div className={`${showResults ? 'flex flex-col items-center' : 'flex items-center gap-4'}`}>
                          {/* 图片容器 */}
                          <div className="relative flex-shrink-0 w-full">
                            {/* 加载状态背景 */}
                            {imageLoadStates[image.id] === 'loading' && (
                              <div className="absolute inset-0 bg-slate-100 rounded-xl flex items-center justify-center">
                                <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                              </div>
                            )}
                            
                            <img
                              src={image.url}
                              alt={image.style}
                              className={`w-full object-cover rounded-xl shadow-lg group-hover:scale-105 transition-transform duration-300 border-2 border-slate-100 ${
                                showResults ? 'aspect-square' : 'h-32'
                              }`}
                              onError={(e) => {
                                console.error('生成图片加载失败:', {
                                  url: image.url,
                                  isBase64: image.url.startsWith('data:'),
                                  urlLength: image.url.length,
                                  domain: image.url.startsWith('http') ? new URL(image.url).hostname : 'unknown'
                                });
                                setImageLoadStates(prev => ({ ...prev, [image.id]: 'error' }));
                                // 尝试添加时间戳强制刷新
                                const currentSrc = e.currentTarget.src;
                                if (!currentSrc.includes('?t=')) {
                                  console.log('尝试添加时间戳重新加载图片...');
                                  e.currentTarget.src = `${image.url}?t=${Date.now()}`;
                                } else {
                                  console.log('图片加载彻底失败，使用占位符');
                                  e.currentTarget.src = "/placeholder.svg?height=300&width=300";
                                }
                              }}
                              onLoad={() => {
                                console.log('生成图片加载成功:', {
                                  url: image.url.substring(0, 100) + (image.url.length > 100 ? '...' : ''),
                                  isBase64: image.url.startsWith('data:'),
                                  urlLength: image.url.length
                                });
                                setImageLoadStates(prev => ({ ...prev, [image.id]: 'loaded' }));
                              }}
                              onLoadStart={() => {
                                console.log('开始加载图片:', image.id);
                                setImageLoadStates(prev => ({ ...prev, [image.id]: 'loading' }));
                              }}
                            />
                            
                            {/* 错误状态显示 */}
                            {imageLoadStates[image.id] === 'error' && (
                              <div className="absolute inset-0 bg-red-50 border-2 border-red-200 rounded-xl flex items-center justify-center">
                                <div className="text-center">
                                  <div className="text-red-500 text-xs font-semibold">加载失败</div>
                                  <button 
                                    onClick={(e) => {
                                      setImageLoadStates(prev => ({ ...prev, [image.id]: 'loading' }));
                                      // 重新加载图片
                                      const imgElement = e.currentTarget.parentElement?.parentElement?.querySelector('img');
                                      if (imgElement) {
                                        imgElement.src = `${image.url}?t=${Date.now()}`;
                                      }
                                    }}
                                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold mt-1"
                                  >
                                    重试
                                  </button>
                                </div>
                              </div>
                            )}
                            
                            {/* hover效果 */}
                            {imageLoadStates[image.id] === 'loaded' && (
                              <div className="absolute inset-0 flex items-center justify-center bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl">
                                <span className="text-xs text-blue-600 font-semibold">点击查看大图</span>
                              </div>
                            )}
                          </div>
                          
                          {/* 方案信息 */}
                          <div className={`${showResults ? 'w-full mt-4' : 'flex-1'}`}>
                            <h5 className={`font-bold text-slate-800 mb-2 ${showResults ? 'text-center text-lg' : 'text-lg'}`}>{image.style}</h5>
                            <p className={`text-sm text-slate-600 mb-3 ${showResults ? 'text-center' : ''}`}>
                              {index === 0 && "经典版本 - 保持原有风格特色"}
                              {index === 1 && "创意变化 - 在原基础上增加创新元素"}
                              {index === 2 && "个性定制 - 融入更多个性化特色"}
                            </p>
                            <div className={`flex gap-2 ${showResults ? 'justify-center flex-wrap' : ''}`}>
                              <button
                                onClick={() => {
                                  // 打开大图预览
                                  window.open(image.url, '_blank');
                                }}
                                className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-semibold text-sm transition-colors"
                              >
                                查看大图
                              </button>
                              <button
                                onClick={() => {
                                  // 下载图片
                                  const link = document.createElement('a');
                                  link.href = image.url;
                                  link.download = `ip-avatar-${image.style}.png`;
                                  link.click();
                                }}
                                className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-semibold text-sm transition-colors"
                              >
                                下载图片
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* 突出的导出按钮 */}
                  <div className="border-t-2 border-slate-200 pt-6 mt-6">
                    <div className="text-center mb-4">
                      <h4 className="text-lg font-bold text-slate-800 mb-2">🎉 生成完成！</h4>
                      <p className="text-slate-600">选择您最喜欢的方案并进行导出</p>
                    </div>
                    <button
                      onClick={() => router.push("/export")}
                      className="w-full bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 hover:from-emerald-600 hover:via-blue-600 hover:to-purple-600 text-white py-4 px-6 rounded-2xl font-bold text-lg shadow-2xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-3 border-2 border-white/20"
                      style={{ 
                        boxShadow: '0 8px 32px 0 rgba(34, 197, 94, 0.25), 0 4px 16px 0 rgba(59, 130, 246, 0.15)' 
                      }}
                    >
                      <Sparkles className="w-6 h-6" />
                      <span>选择方案并导出高清图片</span>
                      <ArrowRight className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 px-4 bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl mx-2 my-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h3 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-pink-500 via-blue-500 to-purple-500 bg-clip-text text-transparent mb-3 flex items-center justify-center gap-2">三种主流IP风格 <span role="img" aria-label="风格">🦄</span></h3>
            <p className="text-slate-600 max-w-2xl mx-auto text-lg font-semibold">专业设计师精心调校的风格模板，满足不同场景和用途需求</p>
          </div>
          <div className="flex gap-8 overflow-x-auto pb-2 hide-scrollbar min-h-[420px]">
            {styleOptions.map((style, index) => (
              <div key={style.id} className={`min-w-[240px] max-w-xs flex-1 bg-gradient-to-br ${style.id === 'cute' ? 'from-pink-100/80 via-pink-50/60 to-purple-50/60' : style.id === 'toy' ? 'from-yellow-50/80 via-orange-50/60 to-red-50/60' : 'from-cyan-50/80 via-blue-50/60 to-purple-50/60'} backdrop-blur-2xl rounded-3xl shadow-lg border-4 border-blue-100 p-8 h-full flex flex-col justify-between transition-all duration-300 hover:scale-105 hover:shadow-2xl mx-2`}>
                <div className="flex flex-col gap-2 items-center w-full h-full justify-between">
                  <div className={`w-16 h-16 bg-white/70 rounded-2xl flex items-center justify-center mb-4 shadow-lg`}>
                    <style.icon className="w-10 h-10 text-white drop-shadow-lg" />
                  </div>
                  <h4 className="font-extrabold text-xl mb-2 tracking-wider text-slate-900 font-[Pacifico,ui-sans-serif] drop-shadow-sm text-center">{style.name}</h4>
                  <p className="text-slate-600 mb-2 text-base font-semibold text-center">{style.description}</p>
                  <div className="flex flex-col gap-3 items-center justify-center min-h-[96px] mb-2">
                    {style.features.map((feature, featureIndex) => (
                      <span key={featureIndex} className={`px-3 py-1 rounded-full text-xs font-bold ${style.id === 'cute' ? 'bg-pink-100 text-pink-600' : style.id === 'toy' ? 'bg-orange-100 text-orange-600' : 'bg-cyan-100 text-cyan-600'} shadow-sm`}>
                        {feature}
                      </span>
                    ))}
                  </div>
                  <div className={`mt-2 text-sm font-semibold italic ${style.id === 'cute' ? 'text-pink-500' : style.id === 'toy' ? 'text-orange-500' : 'text-cyan-500'} text-center`}>{style.slogan || style.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-white/80 backdrop-blur-xl rounded-t-3xl shadow-2xl border-t-4 border-blue-100 py-10 px-4 mt-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-400 via-blue-400 to-purple-400 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-extrabold bg-gradient-to-r from-pink-500 via-blue-500 to-purple-500 bg-clip-text text-transparent">IP创造师</span>
              </div>
              <p className="text-sm text-slate-500 font-semibold">AI驱动的个人形象定制平台</p>
            </div>
            <div>
              <h4 className="text-blue-600 font-bold mb-4">产品</h4>
              <ul className="space-y-2 text-base">
                <li><a href="#" className="hover:text-pink-500 font-semibold transition-colors">功能介绍</a></li>
                <li><a href="#" className="hover:text-pink-500 font-semibold transition-colors">定价方案</a></li>
                <li><a href="#" className="hover:text-pink-500 font-semibold transition-colors">API接口</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-blue-600 font-bold mb-4">支持</h4>
              <ul className="space-y-2 text-base">
                <li><a href="#" className="hover:text-pink-500 font-semibold transition-colors">帮助中心</a></li>
                <li><a href="#" className="hover:text-pink-500 font-semibold transition-colors">联系我们</a></li>
                <li><a href="#" className="hover:text-pink-500 font-semibold transition-colors">用户反馈</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-blue-600 font-bold mb-4">公司</h4>
              <ul className="space-y-2 text-base">
                <li><a href="#" className="hover:text-pink-500 font-semibold transition-colors">关于我们</a></li>
                <li><a href="#" className="hover:text-pink-500 font-semibold transition-colors">隐私政策</a></li>
                <li><a href="#" className="hover:text-pink-500 font-semibold transition-colors">服务条款</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-blue-100 mt-8 pt-6 text-center text-base text-slate-400 font-semibold">
            <p>&copy; 2024 IP创造师. 保留所有权利.</p>
          </div>
        </div>
      </footer>

      {/* 悬浮吸底按钮，任何时候都显示在第一屏底部 */}
      {canGenerate && !showResults && (
        <div className="fixed bottom-0 left-0 w-full z-50 flex justify-center pointer-events-none">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="pointer-events-auto max-w-xl w-[90vw] md:w-[480px] mb-6 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white py-5 rounded-full font-extrabold text-2xl shadow-2xl transition-all flex items-center justify-center space-x-3 tracking-wider border-4 border-white/80 animate-pulse focus:outline-none focus:ring-4 focus:ring-blue-300 drop-shadow-xl"
            style={{ boxShadow: '0 8px 32px 0 rgba(80,80,200,0.25), 0 1.5px 8px 0 rgba(80,80,200,0.10)' }}
          >
            {isGenerating ? (
              <>
                <div className="animate-spin w-7 h-7 border-2 border-white border-t-transparent rounded-full"></div>
                <span>生成中...</span>
              </>
            ) : (
              <>
                <Zap className="w-7 h-7 mr-1" />
                <span>生成我的IP</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
