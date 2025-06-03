# 🚀 Vercel 自动部署配置

## 📋 部署状态

- **生产环境**: https://ip-creator-ziyerrs-projects.vercel.app
- **自动部署**: ✅ 已配置
- **部署触发**: 推送到 `main` 分支
- **构建时间**: ~2-3 分钟

## 🔧 配置详情

### Vercel 配置 (`vercel.json`)

```json
{
  "functions": {
    "app/api/generate-image/route.ts": {
      "maxDuration": 30
    },
    "app/api/generate-single-image/route.ts": {
      "maxDuration": 60
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    }
  ],
  "headers": [
    {
      "source": "/outputs/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=86400"
        }
      ]
    }
  ]
}
```

### 关键配置说明

1. **函数超时设置**:
   - `generate-image`: 30秒（快速生成）
   - `generate-single-image`: 60秒（Vercel免费计划限制）

2. **静态文件缓存**:
   - `/outputs/` 目录下的图片文件缓存24小时
   - 提高图片加载性能

3. **API 路由重写**:
   - 确保 API 端点正确路由

## 🔄 自动部署流程

### 1. GitHub → Vercel 集成

当你推送代码到 GitHub 的 `main` 分支时：

1. **触发构建**: Vercel 自动检测到代码更改
2. **安装依赖**: `npm install`
3. **构建项目**: `npm run build`
4. **部署**: 将构建产物部署到生产环境
5. **更新 URL**: 生产环境立即可用

### 2. GitHub Actions 工作流

额外的 CI/CD 流程 (`.github/workflows/vercel-deploy.yml`):

- **构建验证**: 确保代码可以成功构建
- **健康检查**: 部署后验证网站可访问性
- **API 测试**: 验证 API 端点正常工作

## 🛠️ 环境变量配置

### 必需的环境变量

在 Vercel 项目设置中配置：

```bash
MAQUE_API_KEY=your-api-key-here
```

### GitHub Secrets (可选，用于 GitHub Actions)

```bash
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-org-id
VERCEL_PROJECT_ID=your-project-id
```

## 📊 部署监控

### 实时状态检查

使用 `check-deployment.html` 工具：
- 检查生产环境状态
- 测试 API 端点
- 监控部署健康状况

### Vercel 仪表板

访问 [Vercel Dashboard](https://vercel.com/dashboard) 查看：
- 部署历史
- 构建日志
- 性能指标
- 错误监控

## 🚨 故障排除

### 常见问题

1. **部署失败**:
   ```bash
   # 检查构建日志
   npx vercel logs
   ```

2. **API 超时**:
   - 检查 `vercel.json` 中的 `maxDuration` 设置
   - 确保 API 函数在时间限制内完成

3. **环境变量问题**:
   - 在 Vercel 项目设置中验证环境变量
   - 确保 `MAQUE_API_KEY` 正确设置

4. **文件存储问题**:
   - Vercel 的无服务器环境不支持持久文件存储
   - 生成的图片文件在每次部署后会丢失
   - 考虑使用云存储服务（如 AWS S3、Cloudinary）

### 手动部署

如果自动部署失败，可以手动部署：

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录 Vercel
vercel login

# 部署到生产环境
vercel --prod
```

## 🔮 未来优化

### 建议的改进

1. **云存储集成**:
   - 集成 AWS S3 或 Cloudinary
   - 持久化图片文件存储

2. **CDN 优化**:
   - 使用 Vercel Edge Network
   - 全球图片分发加速

3. **监控告警**:
   - 集成 Vercel Analytics
   - 设置部署失败通知

4. **A/B 测试**:
   - 使用 Vercel Preview 部署
   - 测试新功能后再发布

## 📞 支持

如果遇到部署问题：

1. 检查 [Vercel 文档](https://vercel.com/docs)
2. 查看项目的构建日志
3. 使用 `check-deployment.html` 工具诊断
4. 联系开发团队获取支持
