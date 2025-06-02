#!/bin/bash
set -e

# 克隆代码
cd /var/www
sudo rm -rf ip-creator
git clone https://github.com/ziyerr/ip-creator-prototype.git ip-creator
cd ip-creator
sudo chown -R ubuntu:ubuntu /var/www/ip-creator

# 复制服务器配置
cp deployment/package.json package.json

# 安装依赖
npm install

# 构建应用
export NODE_ENV=production
npm run build

# 创建环境变量文件
cat > .env.production << 'ENVEOF'
NODE_ENV=production
PORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379
SPARROW_API_KEY=sk-1eEdZF3JuFocE3eyrFBnmE1IgMFwbGcwPfMciRMdxF1Zl8Ke
ENVEOF

# 复制PM2配置
cp deployment/ecosystem.config.js ecosystem.config.js

# 创建日志目录
sudo mkdir -p /var/log/pm2
sudo chown -R ubuntu:ubuntu /var/log/pm2

echo "✅ 应用部署完成！"
