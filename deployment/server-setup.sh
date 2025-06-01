#!/bin/bash

# 🚀 火山引擎服务器环境搭建脚本
# 用途：一键搭建 Node.js + Redis + PM2 + Nginx 环境

set -e

echo "🔥 开始搭建火山引擎服务器环境..."

# 1. 更新系统
echo "📦 更新系统包..."
sudo apt update && sudo apt upgrade -y

# 2. 安装基础工具
echo "🛠️ 安装基础工具..."
sudo apt install -y curl wget git vim htop unzip

# 3. 安装 Node.js 18.x
echo "📦 安装 Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version

# 4. 安装 PM2 (进程管理器)
echo "⚡ 安装 PM2..."
sudo npm install -g pm2

# 5. 安装 Redis (队列系统)
echo "📊 安装 Redis..."
sudo apt install -y redis-server

# 配置 Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# 6. 安装 Nginx (反向代理)
echo "🌐 安装 Nginx..."
sudo apt install -y nginx

# 启动 Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 7. 配置防火墙
echo "🔒 配置防火墙..."
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 3000
sudo ufw --force enable

# 8. 创建应用目录
echo "📁 创建应用目录..."
sudo mkdir -p /var/www/ip-creator
sudo chown -R $USER:$USER /var/www/ip-creator

# 9. 安装 Redis CLI 工具
echo "🔧 安装 Redis 工具..."
sudo apt install -y redis-tools

# 10. 测试服务
echo "🧪 测试服务状态..."
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "PM2: $(pm2 --version)"
echo "Redis: $(redis-cli ping)"
echo "Nginx: $(nginx -v)"

echo "✅ 服务器环境搭建完成！"
echo "�� 下一步：部署应用代码和配置队列系统" 