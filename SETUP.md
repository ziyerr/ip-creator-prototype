# 项目设置说明

## 环境变量配置

请在项目根目录创建 `.env.local` 文件，并添加以下环境变量：

```bash
# OpenAI API密钥
OPENAI_API_KEY=your_openai_api_key_here

# 火山引擎API密钥
VOLCENGINE_ACCESS_KEY_ID=your_volcengine_access_key_id_here
VOLCENGINE_SECRET_ACCESS_KEY=your_volcengine_secret_access_key_here

# Next.js环境变量
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 项目启动

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问应用
http://localhost:3000
```

## 图片预览问题解决方案

如果遇到图片预览不显示的问题，请检查以下几点：

### 1. 确保目录结构正确
```
public/
├── images/          # 参考图片
├── outputs/         # 生成的图片输出目录
├── placeholder.svg  # 占位符图片
└── ...
```

### 2. 检查静态文件访问
测试以下URL是否可以正常访问：
- http://localhost:3000/placeholder.svg
- http://localhost:3000/images/reference.png

### 3. 检查浏览器控制台
打开浏览器开发者工具，查看：
- Network 标签：确认图片请求状态
- Console 标签：查看是否有JavaScript错误

### 4. 常见问题和解决方案

**问题1：上传图片预览不显示**
- 检查文件类型是否为图片格式
- 确认浏览器支持 `URL.createObjectURL()`

**问题2：生成的图片不显示**
- 检查 `/outputs/` 目录是否存在
- 确认API返回的图片URL路径正确
- 查看服务器控制台日志

**问题3：API调用失败**
- 检查API密钥配置
- 确认网络连接正常
- 查看API服务状态

### 5. 调试步骤

1. **访问测试页面**: http://localhost:3000/test-api
2. **检查后端日志**: 查看终端输出的API调用日志
3. **验证静态资源**: 直接访问 `/placeholder.svg` 等静态文件

## 安全注意事项

- 所有API密钥都应该通过环境变量配置，不要直接在代码中硬编码
- `.env.local` 文件已被添加到 `.gitignore` 中，不会被提交到代码仓库
- 请妥善保管您的API密钥，不要在公开场合分享

## 推送到GitHub的问题解决

如果遇到"push declined due to repository rule violations"错误：

1. 确保代码中没有硬编码的API密钥
2. 所有敏感信息都通过环境变量配置
3. 检查 `.gitignore` 文件是否正确配置
4. 如果GitHub检测到历史提交中的密钥，可能需要清理Git历史记录

## 故障排除

如果遇到问题：

1. **重启开发服务器**: `Ctrl+C` 停止，然后 `npm run dev` 重启
2. **清除浏览器缓存**: 硬刷新页面 (`Ctrl+Shift+R`)
3. **检查依赖**: 运行 `npm install` 确保依赖正确安装
4. **查看日志**: 检查终端和浏览器控制台的错误信息 