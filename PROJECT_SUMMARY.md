# IP Creator 项目摘要

## 项目概述
这是一个基于Next.js的图像处理和创作应用，集成了多个AI图像生成和编辑API。

## 主要功能
- AI图像生成和编辑
- 支持OpenAI DALL-E API
- 支持火山引擎图像API
- 现代化的Web界面
- 图像导出功能

## 技术栈
- **前端**: Next.js 14, React, TypeScript
- **UI组件**: Tailwind CSS, shadcn/ui
- **AI服务**: OpenAI API, 火山引擎API
- **部署**: 支持Vercel部署

## 项目结构
```
ip-creator/
├── app/                    # Next.js应用目录
├── components/             # UI组件
├── tasks/                  # API集成任务
│   ├── openai_official_api/
│   └── jimeng_volcengine_api/
├── public/                 # 静态资源
├── styles/                 # 样式文件
└── lib/                    # 工具库
```

## 环境配置
- 需要配置OpenAI API密钥
- 需要配置火山引擎API密钥
- 所有密钥通过环境变量管理

## 安全状态
✅ 代码中已正确使用环境变量存储API密钥
✅ .gitignore已配置忽略敏感文件
⚠️ Git历史记录中包含旧的硬编码密钥（已在新版本中修复）

## 部署说明
1. 配置环境变量
2. 安装依赖: `npm install`
3. 运行开发服务器: `npm run dev`
4. 生产部署: `npm run build && npm start` 