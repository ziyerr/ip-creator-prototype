"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Send, Sparkles, RotateCcw, Download, ArrowLeft, User, Bot } from "lucide-react"

interface Message {
  id: string
  type: "user" | "assistant"
  content: string
  timestamp: Date
}

interface GeneratedImage {
  id: string
  url: string
  description: string
  style: string
}

export default function ChatPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [showResults, setShowResults] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Memoize the scroll function to prevent unnecessary re-renders
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  // Initialize messages only once
  useEffect(() => {
    if (initialized) return

    const initialInput = searchParams.get("initial")
    const hasImages = searchParams.get("hasImages")
    const imageCount = searchParams.get("imageCount")

    if (initialInput || hasImages) {
      const initialMessage: Message = {
        id: "1",
        type: "user",
        content: initialInput || "我上传了个人照片，请帮我基于这些照片创建IP形象",
        timestamp: new Date(),
      }
      setMessages([initialMessage])

      const timeoutId = setTimeout(() => {
        let aiContent = "很好！我已经收到了您的"

        if (initialInput && hasImages) {
          aiContent += "IP形象描述和个人照片。"
        } else if (hasImages) {
          aiContent += `${imageCount}张个人照片。`
        } else {
          aiContent += "IP形象描述。"
        }

        aiContent +=
          "基于您提供的信息，我需要确认几个关键细节：\n\n• 风格偏好：您希望是二次元动漫、卡通可爱、还是写实风格？\n• 保留程度：希望保留多少个人特征？（高度相似/适度调整/创意变化）\n• 主要用途：社交头像、品牌形象、表情包还是其他用途？"

        if (hasImages) {
          aiContent += "\n\n我会参考您上传的个人照片来生成IP形象，保持您的基本特征。"
        }

        const aiResponse: Message = {
          id: "2",
          type: "assistant",
          content: aiContent,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, aiResponse])
      }, 1000)

      setInitialized(true)
      return () => clearTimeout(timeoutId)
    } else {
      setInitialized(true)
    }
  }, [searchParams, initialized])

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    const timeoutId = setTimeout(() => {
      const responses = [
        "明白了！还有一个问题：您希望IP形象的表情和姿态是什么样的？比如微笑、严肃、活泼等？",
        "很好！最后确认一下色彩偏好：您更喜欢保持原有色调还是希望有特定的色彩风格？",
        "完美！我已经收集到所有必要信息。现在开始基于您的照片生成专属IP形象，预计需要30-60秒...",
      ]

      const randomResponse = responses[Math.floor(Math.random() * responses.length)]

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: randomResponse,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, aiMessage])
      setIsLoading(false)

      if (randomResponse.includes("开始基于您的照片生成")) {
        const generateTimeoutId = setTimeout(() => {
          generateImages()
        }, 2000)
        return () => clearTimeout(generateTimeoutId)
      }
    }, 1500)

    return () => clearTimeout(timeoutId)
  }, [input, isLoading])

  const generateImages = useCallback(() => {
    setIsGenerating(true)

    const timeoutId = setTimeout(() => {
      const mockImages: GeneratedImage[] = [
        {
          id: "1",
          url: "/placeholder.svg?height=300&width=300",
          description: "方案A",
          style: "二次元动漫风格",
        },
        {
          id: "2",
          url: "/placeholder.svg?height=300&width=300",
          description: "方案B",
          style: "可爱卡通风格",
        },
        {
          id: "3",
          url: "/placeholder.svg?height=300&width=300",
          description: "方案C",
          style: "简约现代风格",
        },
      ]

      setGeneratedImages(mockImages)
      setIsGenerating(false)
      setShowResults(true)

      const resultMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: "assistant",
        content:
          "🎉 基于您的个人照片，您的专属IP形象已生成完成！我为您准备了3个不同风格的方案，都保持了您的基本特征。您可以选择最喜欢的一个，或者告诉我需要调整的地方。",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, resultMessage])
    }, 3000)

    return () => clearTimeout(timeoutId)
  }, [])

  const handleRegeneratePartial = useCallback((imageId: string) => {
    console.log("局部重做:", imageId)
  }, [])

  const handleRegenerateAll = useCallback(() => {
    setShowResults(false)
    setGeneratedImages([])
    generateImages()
  }, [generateImages])

  const handleDownload = useCallback((imageId: string) => {
    console.log("下载图片:", imageId)
  }, [])

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSend()
      }
    },
    [handleSend],
  )

  // Get search params values once
  const hasImages = searchParams.get("hasImages")
  const imageCount = searchParams.get("imageCount")

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/")}
                className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>返回首页</span>
              </button>
              <div className="h-6 w-px bg-slate-300"></div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="font-semibold text-slate-900">IP创造师</span>
              </div>
            </div>
            <div className="text-sm text-slate-500">AI设计师正在为您服务</div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* 个人照片显示 */}
        {hasImages && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">您的个人照片</h4>
            <div className="flex space-x-2">
              {Array.from({ length: Number.parseInt(imageCount || "0") }).map((_, index) => (
                <div key={index} className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 text-xs">照片 {index + 1}</span>
                </div>
              ))}
            </div>
            <p className="text-blue-700 text-xs mt-2">AI将基于这些照片生成您的专属IP形象</p>
          </div>
        )}

        {/* Chat Container */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-6">
          {/* Chat Header */}
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900">与AI设计师对话</h2>
            <p className="text-slate-500 text-sm mt-1">详细描述您的需求，我会帮您完善创意细节</p>
          </div>

          {/* Messages */}
          <div className="h-96 overflow-y-auto p-6 space-y-6">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`flex space-x-3 max-w-md ${message.type === "user" ? "flex-row-reverse space-x-reverse" : ""}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.type === "user" ? "bg-blue-600" : "bg-slate-200"
                    }`}
                  >
                    {message.type === "user" ? (
                      <User className="w-5 h-5 text-white" />
                    ) : (
                      <Bot className="w-5 h-5 text-slate-600" />
                    )}
                  </div>
                  <div
                    className={`px-4 py-3 rounded-2xl ${
                      message.type === "user" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-900"
                    }`}
                  >
                    <p className="whitespace-pre-line text-sm">{message.content}</p>
                    <div className={`text-xs mt-2 ${message.type === "user" ? "text-blue-100" : "text-slate-500"}`}>
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex space-x-3 max-w-md">
                  <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                    <Bot className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="bg-slate-100 rounded-2xl px-4 py-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isGenerating && (
              <div className="flex justify-center">
                <div className="bg-blue-50 border border-blue-200 rounded-2xl px-6 py-4 text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-2"></div>
                  <p className="text-blue-800 font-medium">正在基于您的照片生成专属IP形象...</p>
                  <p className="text-blue-600 text-sm mt-1">预计需要30-60秒</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          {!showResults && (
            <div className="border-t border-slate-200 p-6">
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="继续描述您的想法..."
                  className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Generated Results */}
        {showResults && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">生成结果</h3>
                <p className="text-slate-500 text-sm">选择您最喜欢的方案，或要求调整</p>
              </div>
              <button
                onClick={handleRegenerateAll}
                className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>重新生成</span>
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {generatedImages.map((image) => (
                <div
                  key={image.id}
                  className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className="aspect-square bg-slate-100 rounded-lg mb-4 flex items-center justify-center">
                    <img
                      src={image.url || "/placeholder.svg"}
                      alt={image.description}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                  <h4 className="font-medium text-slate-900 mb-1">{image.description}</h4>
                  <p className="text-sm text-slate-500 mb-4">{image.style}</p>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleRegeneratePartial(image.id)}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg transition-colors text-sm"
                    >
                      调整细节
                    </button>
                    <button
                      onClick={() => handleDownload(image.id)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors flex items-center justify-center space-x-2 text-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span>选择此方案</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => router.push("/export")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-colors"
              >
                进入导出页面
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
