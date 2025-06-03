# 🔧 Vercel环境变量配置指南

## 📋 需要在Vercel中配置的环境变量

请在Vercel项目设置 → Environment Variables 中添加以下变量：

### 1️⃣ 麻雀API配置
```
MAQUE_API_KEY=sk-1eEdZF3JuFocE3eyrFBnmE1IgMFwbGcwPfMciRMdxF1Zl8Ke
MAQUE_API_URL=https://ismaque.org/v1/images/edits
```

### 2️⃣ Supabase配置
```
NEXT_PUBLIC_SUPABASE_URL=https://zdoxqffgsefczrtrcvge.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpkb3hxZmZnc2VmY3pydHJjdmdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5NTI4NTQsImV4cCI6MjA2NDUyODg1NH0.QYgitA0AJEtuZAYFn45i130KCpscVz8SINbPOL6Epdk
```

## 🎯 配置步骤

1. 打开 https://vercel.com/ziyerrs-projects/ip-creator
2. 点击 "Settings" 标签
3. 点击左侧菜单的 "Environment Variables"
4. 逐个添加上述环境变量：
   - Name: 变量名（如 MAQUE_API_KEY）
   - Value: 变量值
   - Environment: 选择 Production, Preview, Development（全选）
5. 点击 "Save" 保存每个变量

## ✅ 验证配置

配置完成后，可以通过以下方式验证：

1. **重新部署**: 在Vercel控制台触发新的部署
2. **测试API**: 访问 `/api/validate-config` 检查配置
3. **测试功能**: 访问 `/test-supabase` 测试完整功能

## 🚀 部署后测试

部署成功后，访问以下页面测试功能：

- `/test-supabase` - Supabase集成测试
- `/test-async` - 异步轮询测试
- `/` - 主页面

## 📊 数据库状态

Supabase数据库表 `image_tasks` 已创建并包含：
- ✅ 完整的表结构
- ✅ 索引优化
- ✅ 行级安全策略
- ✅ 自动更新触发器
- ✅ 清理函数

## 🔍 故障排除

如果遇到问题：

1. **检查环境变量**: 确保所有变量都正确配置
2. **查看部署日志**: 在Vercel控制台查看构建和运行时日志
3. **测试数据库连接**: 访问 `/test-supabase` 查看连接状态
4. **检查API响应**: 使用浏览器开发者工具查看网络请求

## 📞 支持

如需帮助，请检查：
- Vercel部署日志
- 浏览器控制台错误
- Supabase项目状态
