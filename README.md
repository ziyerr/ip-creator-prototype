# IP Creator - AI头像生成工具

基于 Next.js 开发的 AI 头像生成应用，支持多种艺术风格转换。

## 🎨 功能特点

- **三种艺术风格**：Q版可爱、潮玩玩具、赛博科幻
- **实时生成预览**：5秒间隔监听，实时显示生成进度
- **并行生成**：同时生成3张不同变化的图片
- **智能重试**：2分钟超时自动重试机制
- **高质量输出**：512x512 高清图片

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/ip-creator.git
cd ip-creator
```

### 2. 安装依赖

```bash
npm install
# 或
yarn install
# 或
pnpm install
```

### 3. 配置环境变量

创建 `.env.local` 文件并添加您的麻雀API密钥：

```env
# 麻雀API配置
MAQUE_API_KEY=your-api-key-here
```

> ⚠️ **重要**：请从[麻雀API官方文档](https://apifox.com/apidoc/docs-site/3868318/api-288978020)获取您的API密钥

### 4. 启动开发服务器

```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

## 🔧 技术栈

- **框架**: Next.js 15.2.4
- **前端**: React 18 + TypeScript
- **样式**: Tailwind CSS + Shadcn/ui
- **AI模型**: 麻雀API + gpt-image-1
- **状态管理**: React Hooks + localStorage

## 📡 API说明

本项目使用麻雀API的图像编辑接口：

- **端点**: `https://ismaque.org/v1/images/edits`
- **模型**: `gpt-image-1`
- **请求格式**: multipart/form-data
- **支持格式**: PNG, WEBP, JPG (每个文件小于25MB)

### API密钥配置

1. 访问麻雀API官方网站获取API密钥
2. 在项目根目录创建 `.env.local` 文件
3. 添加 `MAQUE_API_KEY=your-api-key-here`
4. 重启开发服务器

## 🎯 使用指南

1. **上传头像**：支持JPG/PNG格式，建议正面清晰照片
2. **选择风格**：
   - Q版可爱风：圆润比例、大眼睛、明快配色
   - 潮玩玩具风：3D等距视角、软质材质、精致细节
   - 赛博科幻风：高饱和霓虹色、未来电子纹理
3. **自定义需求**：可输入额外的生成要求（可选）
4. **生成图片**：点击生成按钮，等待AI处理

## ⚠️ 注意事项

- 请确保使用有效的麻雀API密钥
- 单次生成可能需要30-120秒，请耐心等待
- 如遇到401错误，请检查API密钥是否正确
- 建议使用稳定的网络连接

## 🐛 常见问题

### Q: 提示"API认证失败"怎么办？
A: 请检查 `.env.local` 文件中的 `MAQUE_API_KEY` 是否正确设置。

### Q: 生成超时怎么办？
A: 系统会自动重试最多2次。如果仍然失败，请检查网络连接或稍后再试。

### Q: 为什么只能生成512x512的图片？
A: 为了平衡生成速度和质量，当前版本固定使用512x512分辨率。

## 📝 开发计划

- [ ] 支持更多图片尺寸选项
- [ ] 添加批量生成功能
- [ ] 实现图片历史记录
- [ ] 支持更多艺术风格

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Pull Request 或创建 Issue！# Force Vercel to use latest commit
