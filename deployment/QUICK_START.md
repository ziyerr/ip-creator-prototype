# 🚀 火山引擎服务器快速部署指南

## 🎯 现在就开始！

### 第一步：完成服务器购买
1. 在火山引擎控制台点击 **"立即购买"**
2. 支付完成后等待服务器创建（2-5分钟）
3. 记录服务器 **公网IP地址**

### 第二步：连接服务器
```bash
# MacOS/Linux用户
ssh root@YOUR_SERVER_IP

# Windows用户使用PuTTY
# 主机名：YOUR_SERVER_IP，端口：22，用户名：root
```

### 第三步：一键自动部署 🎉
```bash
# 下载部署脚本
wget https://raw.githubusercontent.com/ziyerr/ip-creator-prototype/main/deployment/deploy.sh

# 赋予执行权限
chmod +x deploy.sh

# 开始自动部署（约5-10分钟）
sudo ./deploy.sh
```

### 第四步：验证部署成功 ✅
- 浏览器访问：`http://YOUR_SERVER_IP`
- 看到IP Creator界面即部署成功！

---

## 📋 推荐服务器配置

| 配置项 | 推荐值 | 说明 |
|-------|--------|------|
| **CPU** | 2核 | 满足Next.js应用需求 |
| **内存** | 4GB | 保证应用稳定运行 |
| **存储** | 40GB SSD | 系统+代码+日志空间 |
| **带宽** | 5Mbps | 支持图片上传下载 |
| **OS** | Ubuntu 22.04 LTS | 最佳兼容性 |

**预估成本**: ￥100-200/月

---

## 🔧 部署后管理

### 查看应用状态
```bash
sudo -u deploy pm2 status
```

### 查看实时日志
```bash
sudo -u deploy pm2 logs ip-creator
```

### 重启应用
```bash
sudo -u deploy pm2 restart ip-creator
```

### 更新代码
```bash
cd /home/deploy/ip-creator-prototype
git pull
npm run build
sudo -u deploy pm2 restart ip-creator
```

---

## 🚨 故障排除

### 无法访问网站？
1. **检查安全组**: 确保开放80端口
2. **检查防火墙**: `sudo ufw status`
3. **检查服务**: `sudo -u deploy pm2 status`

### 图片生成失败？
1. **检查API密钥**: 环境变量是否正确
2. **检查网络**: 服务器是否能访问外网
3. **查看日志**: `sudo -u deploy pm2 logs ip-creator`

---

## 📞 技术支持

遇到问题？
- 📧 发送日志到技术支持
- 🔍 查看详细文档：`/deployment/deploy-guide.md`
- 🛠️ 远程协助部署服务 