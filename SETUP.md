# 项目设置说明

## 环境变量配置

请在项目根目录创建 `.env` 文件，并添加以下环境变量：

```bash
# OpenAI API密钥
OPENAI_API_KEY=your_openai_api_key_here

# 火山引擎API密钥
VOLCENGINE_ACCESS_KEY_ID=your_volcengine_access_key_id_here
VOLCENGINE_SECRET_ACCESS_KEY=your_volcengine_secret_access_key_here

# Next.js环境变量
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 安全注意事项

- 所有API密钥都应该通过环境变量配置，不要直接在代码中硬编码
- `.env` 文件已被添加到 `.gitignore` 中，不会被提交到代码仓库
- 请妥善保管您的API密钥，不要在公开场合分享

## 推送到GitHub的问题解决

如果遇到"push declined due to repository rule violations"错误：

1. 确保代码中没有硬编码的API密钥
2. 所有敏感信息都通过环境变量配置
3. 检查 `.gitignore` 文件是否正确配置
4. 如果GitHub检测到历史提交中的密钥，可能需要清理Git历史记录 