# IP Creator - AI头像生成器

🎨 基于AI技术的专业头像生成工具，支持多种风格转换

## 🌐 在线体验
- **生产环境**: https://ip-creator.vercel.app
- **备用地址**: https://ip-creator-ziyerrs-projects.vercel.app

## ✨ 核心功能
- 📸 **智能头像上传** - 支持JPG、PNG格式
- 🎭 **三种专业风格** - Q版可爱、潮玩玩具、赛博科幻
- 🤖 **AI实时生成** - 基于麻雀API + gpt-image-1模型
- 🎨 **自定义需求** - 支持个性化描述输入
- 📱 **响应式设计** - 完美适配桌面和移动端

## 🛠️ 技术栈
- **前端**: Next.js 15.2.4 + React 18 + TypeScript
- **样式**: Tailwind CSS + Shadcn/ui
- **AI模型**: 麻雀API + gpt-image-1
- **部署**: Vercel (支持自动部署)
- **版本控制**: Git + GitHub

## 🚀 自动部署配置
✅ **已配置Git集成自动部署**
- 连接仓库: https://github.com/ziyerr/ip-creator-prototype.git
- 触发分支: main
- 部署方式: 每次push自动触发
- 状态监控: Vercel Dashboard

## 🔧 本地开发
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建项目
npm run build

# 启动生产服务器
npm start
```

## 📝 环境变量配置
创建 `.env.local` 文件：
```bash
OPENAI_API_KEY=your_openai_api_key_here
VOLCENGINE_ACCESS_KEY_ID=your_volcengine_access_key_id_here
VOLCENGINE_SECRET_ACCESS_KEY=your_volcengine_secret_access_key_here
```

---
*最后更新: 2025-05-30 | 自动部署已配置 🚀*