import '../polyfill-randomuuid';
import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { StagewiseToolbar } from '@stagewise/toolbar-next';

const inter = Inter({ subsets: ["latin"] })

const stagewiseConfig = {
  plugins: []
};

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
      <body className={inter.className}>
        {process.env.NODE_ENV === 'development' && <StagewiseToolbar config={stagewiseConfig} />}
        {children}
      </body>
    </html>
  )
}
