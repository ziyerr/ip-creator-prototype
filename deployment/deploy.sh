#!/bin/bash

# 🔥 IP Creator - 火山引擎服务器自动部署脚本
# 使用方法：chmod +x deploy.sh && sudo ./deploy.sh

set -e  # 遇到错误立即退出

echo "🔥 开始IP Creator项目自动化部署..."

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${GREEN}[步骤] $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[警告] $1${NC}"
}

print_error() {
    echo -e "${RED}[错误] $1${NC}"
}

# 检查是否为root用户
if [[ $EUID -ne 0 ]]; then
   print_error "请使用root用户执行此脚本"
   echo "使用: sudo ./deploy.sh"
   exit 1
fi

print_step "1. 更新系统包..."
apt update && apt upgrade -y

print_step "2. 安装基础工具..."
apt install -y curl wget git vim htop unzip ufw

print_step "3. 配置时区..."
timedatectl set-timezone Asia/Shanghai

print_step "4. 创建deploy用户..."
if ! id "deploy" &>/dev/null; then
    adduser --disabled-password --gecos "" deploy
    usermod -aG sudo deploy
    echo "deploy用户创建成功"
else
    echo "deploy用户已存在"
fi

print_step "5. 安装Node.js 18 LTS..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    echo "Node.js安装完成: $(node --version)"
else
    echo "Node.js已安装: $(node --version)"
fi

print_step "6. 安装PM2进程管理器..."
npm install -g pm2

print_step "7. 安装Nginx..."
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
    echo "Nginx安装完成"
else
    echo "Nginx已安装"
fi

print_step "8. 配置防火墙..."
ufw allow 'Nginx Full'
ufw allow ssh
ufw --force enable

print_step "9. 切换到deploy用户并部署项目..."
sudo -u deploy bash << 'EOL'
cd /home/deploy

# 如果项目目录已存在，先备份
if [ -d "ip-creator-prototype" ]; then
    echo "备份现有项目..."
    mv ip-creator-prototype ip-creator-prototype-backup-$(date +%Y%m%d_%H%M%S)
fi

# 克隆最新代码
echo "克隆项目代码..."
git clone https://github.com/ziyerr/ip-creator-prototype.git
cd ip-creator-prototype

# 安装依赖
echo "安装项目依赖..."
npm install --production

# 创建环境变量文件
echo "创建环境变量文件..."
cat > .env.local << 'EOF'
SPARROW_API_KEY=sk-1eEdZF3JuFocE3eyrFBnmE1IgMFwbGcwPfMciRMdxF1Zl8Ke
NODE_ENV=production
PORT=3000
EOF

# 构建项目
echo "构建生产版本..."
npm run build

# 停止现有的PM2进程（如果存在）
pm2 delete ip-creator 2>/dev/null || true

# 启动新的PM2进程
echo "启动PM2进程..."
pm2 start npm --name "ip-creator" -- start

# 保存PM2配置
pm2 save
EOL

print_step "10. 配置PM2开机自启..."
sudo -u deploy pm2 startup | grep "sudo" | sh

print_step "11. 配置Nginx反向代理..."

# 获取服务器IP
SERVER_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip || echo "YOUR_SERVER_IP")

cat > /etc/nginx/sites-available/ip-creator << EOF
server {
    listen 80;
    server_name $SERVER_IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # 静态文件缓存优化
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# 启用配置
ln -sf /etc/nginx/sites-available/ip-creator /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 测试配置
nginx -t && systemctl reload nginx

print_step "12. 安装安全防护..."
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban

print_step "13. 验证部署..."
sleep 5

# 检查PM2状态
sudo -u deploy pm2 status

# 检查Nginx状态
systemctl status nginx --no-pager

# 检查端口
if netstat -tulpn | grep :80 > /dev/null; then
    echo "✅ Nginx (端口80) 运行正常"
else
    print_warning "Nginx端口80未监听"
fi

if netstat -tulpn | grep :3000 > /dev/null; then
    echo "✅ Next.js应用 (端口3000) 运行正常"
else
    print_warning "Next.js应用端口3000未监听"
fi

echo ""
echo "🎉 IP Creator部署完成！"
echo ""
echo "📊 部署信息："
echo "  - 服务器IP: $SERVER_IP"
echo "  - 访问地址: http://$SERVER_IP"
echo "  - 项目目录: /home/deploy/ip-creator-prototype"
echo "  - 进程管理: pm2 status"
echo "  - 日志查看: pm2 logs ip-creator"
echo ""
echo "🔧 常用命令："
echo "  - 重启应用: sudo -u deploy pm2 restart ip-creator"
echo "  - 查看日志: sudo -u deploy pm2 logs ip-creator"
echo "  - 更新代码: cd /home/deploy/ip-creator-prototype && git pull && npm run build && pm2 restart ip-creator"
echo ""
echo "🌐 请在浏览器访问: http://$SERVER_IP"
echo "   如果无法访问，请检查服务器安全组是否开放80端口" 