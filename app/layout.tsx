import '../polyfill-randomuuid';
import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Script from "next/script"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "IP创造师 - 5分钟创造专属IP形象",
  description: "通过对话式交互，让AI为你打造独一无二的个人IP形象。支持多种风格，快速生成，局部调整。",
  keywords: "IP形象,AI生成,个人品牌,角色设计,头像制作",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <head>
        <Script
          defer
          data-domain="popverse.ai"
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
