# 麻雀API 配置指南

本指南将帮助您正确配置麻雀API，以使用 IP Creator 生成 AI 头像。

## 📋 前置要求

- 有效的麻雀API账号
- API密钥（API Key）
- 支持 gpt-image-1 模型的权限

## 🔧 配置步骤

### 1. 获取API密钥

1. 访问麻雀API官方网站
2. 登录您的账号
3. 进入API密钥管理页面
4. 创建或复制您的API密钥

### 2. 创建环境变量文件

在项目根目录创建 `.env.local` 文件：

```bash
touch .env.local
```

### 3. 配置API密钥

编辑 `.env.local` 文件，添加您的API密钥：

```env
# 麻雀API配置
MAQUE_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

> ⚠️ **注意**：
> - 将 `sk-xxxxxxxxxxxxxxxxxxxxxxxx` 替换为您的实际API密钥
> - 不要在密钥前后添加引号
> - 确保文件名是 `.env.local`，不是 `.env`

### 4. 验证配置

重启开发服务器：

```bash
npm run dev
```

如果配置正确，您应该能够：
- 上传图片
- 选择风格
- 成功生成AI头像

## 📡 API技术细节

### 端点信息

- **URL**: `https://ismaque.org/v1/images/edits`
- **方法**: POST
- **格式**: multipart/form-data

### 请求参数

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| image | file | ✅ | 原始图片文件 |
| mask | file | ✅ | 遮罩图片（可使用原图） |
| prompt | string | ✅ | 生成提示词 |
| model | string | ✅ | 固定为 `gpt-image-1` |
| n | integer | ✅ | 生成数量，默认为 1 |
| size | string | ✅ | 图片尺寸，默认 `512x512` |
| response_format | string | ✅ | 响应格式，默认 `url` |

### 响应格式

成功响应示例：
```json
{
  "created": 1234567890,
  "data": [
    {
      "url": "https://..."
    }
  ]
}
```

错误响应示例：
```json
{
  "error": {
    "message": "Invalid Token",
    "type": "rix_api_error"
  }
}
```

## 🚨 常见问题

### 1. API认证失败（401错误）

**错误信息**：
```
API认证失败: Invalid Token - 请检查MAQUE_API_KEY环境变量
```

**解决方法**：
- 确认 `.env.local` 文件存在
- 检查API密钥是否正确
- 重启开发服务器

### 2. API端点不存在（404错误）

**错误信息**：
```
API端点不存在: https://ismaque.org/v1/images/edits - 请确认麻雀API地址是否正确
```

**解决方法**：
- 确认API地址是否正确
- 检查网络连接
- 联系API提供商确认服务状态

### 3. 生成超时

**错误信息**：
```
图片生成超时（120秒），请稍后重试
```

**解决方法**：
- 检查网络连接速度
- 减少图片尺寸
- 简化提示词
- 稍后重试

## 💡 最佳实践

1. **保护API密钥**：
   - 不要将 `.env.local` 文件提交到Git
   - 不要在前端代码中硬编码API密钥
   - 定期更换API密钥

2. **优化性能**：
   - 使用 512x512 尺寸以获得最佳速度
   - 避免过于复杂的提示词
   - 在网络良好的环境下使用

3. **错误处理**：
   - 监控API使用量
   - 处理各种错误情况
   - 为用户提供清晰的错误信息

## 📞 支持

如果您遇到任何问题：
1. 查看本指南的常见问题部分
2. 查看[麻雀API官方文档](https://apifox.com/apidoc/docs-site/3868318/api-288978020)
3. 在项目的 GitHub Issues 中提问

---

*最后更新：2025-06-03* 