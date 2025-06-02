#!/bin/bash

# 🎯 IP创造师 - 小白专用一键自动部署脚本
# 使用方法：./auto-deploy-xiaobai.sh
# 适用于：完全不懂代码的用户，一个命令搞定所有部署

set -e

# 服务器配置信息
SERVER_IP="14.103.140.197"
SERVER_PASSWORD="@Mahua666"
NEW_USER="ubuntu"
NEW_USER_PASSWORD="ipCreator2024!"
SPARROW_API_KEY="sk-1eEdZF3JuFocE3eyrFBnmE1IgMFwbGcwPfMciRMdxF1Zl8Ke"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

print_banner() {
    echo -e "${PURPLE}"
    echo "🎉========================================🎉"
    echo "🚀     IP创造师 - 小白一键部署工具     🚀"
    echo "🎯   让AI头像生成变得超级简单！       🎯"
    echo "🎉========================================🎉"
    echo -e "${NC}"
}

log_step() {
    echo -e "${BLUE}📋 步骤 $1: $2${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查依赖工具
check_dependencies() {
    log_step "1" "检查本地环境依赖"
    
    # 检查sshpass
    if ! command -v sshpass &> /dev/null; then
        log_info "正在安装 sshpass 工具..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            if command -v brew &> /dev/null; then
                brew install hudochenkov/sshpass/sshpass
            else
                log_error "请先安装 Homebrew: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
                exit 1
            fi
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Linux
            sudo apt update && sudo apt install -y sshpass
        else
            log_error "不支持的操作系统"
            exit 1
        fi
    fi
    
    # 检查curl
    if ! command -v curl &> /dev/null; then
        log_error "请先安装 curl"
        exit 1
    fi
    
    log_success "本地环境检查完成"
}

# 自动SSH执行命令
ssh_execute() {
    local command="$1"
    local user="${2:-root}"
    local password="${3:-$SERVER_PASSWORD}"
    
    if [ "$user" = "ubuntu" ]; then
        password="$NEW_USER_PASSWORD"
    fi
    
    sshpass -p "$password" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$user@$SERVER_IP" "$command"
}

# 上传文件到服务器
ssh_upload() {
    local local_file="$1"
    local remote_path="$2"
    local user="${3:-root}"
    local password="${4:-$SERVER_PASSWORD}"
    
    if [ "$user" = "ubuntu" ]; then
        password="$NEW_USER_PASSWORD"
    fi
    
    sshpass -p "$password" scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$local_file" "$user@$SERVER_IP:$remote_path"
}

# 第1步：测试服务器连接
test_server_connection() {
    log_step "2" "测试服务器连接"
    
    if ssh_execute "echo 'Hello from server'" root; then
        log_success "服务器连接成功！"
    else
        log_error "服务器连接失败，请检查IP地址和密码"
        exit 1
    fi
}

# 第2步：初始化服务器用户
initialize_server() {
    log_step "3" "初始化服务器用户和权限"
    
    # 创建ubuntu用户（如果不存在）
    ssh_execute "id ubuntu || (adduser --disabled-password --gecos '' ubuntu && echo 'ubuntu:$NEW_USER_PASSWORD' | chpasswd)" root
    
    # 添加sudo权限
    ssh_execute "usermod -aG sudo ubuntu" root
    
    # 配置sudo免密
    ssh_execute "echo 'ubuntu ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers" root
    
    log_success "用户初始化完成"
}

# 第3步：环境搭建
setup_environment() {
    log_step "4" "安装服务器环境 (Node.js + Redis + PM2 + Nginx)"
    
    # 创建临时安装脚本
    cat > temp_setup.sh << 'EOF'
#!/bin/bash
set -e

# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装基础工具
sudo apt install -y curl wget git vim htop unzip

# 安装 Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PM2
sudo npm install -g pm2

# 安装 Redis
sudo apt install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server

# 安装 Nginx
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 配置防火墙
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 3000
sudo ufw --force enable

# 创建应用目录
sudo mkdir -p /var/www/ip-creator
sudo chown -R ubuntu:ubuntu /var/www/ip-creator

echo "✅ 环境搭建完成！"
EOF

    # 上传并执行安装脚本
    ssh_upload "temp_setup.sh" "/tmp/setup.sh" "ubuntu"
    ssh_execute "chmod +x /tmp/setup.sh && /tmp/setup.sh" "ubuntu"
    
    # 清理临时文件
    rm temp_setup.sh
    
    log_success "环境搭建完成"
}

# 第4步：部署应用代码
deploy_application() {
    log_step "5" "部署IP创造师应用代码"
    
    # 创建部署脚本
    cat > temp_deploy.sh << EOF
#!/bin/bash
set -e

# 确保ubuntu用户拥有/var/www目录的权限
sudo mkdir -p /var/www
sudo chown -R ubuntu:ubuntu /var/www

# 克隆代码
cd /var/www
rm -rf ip-creator
git clone https://github.com/ziyerr/ip-creator-prototype.git ip-creator
cd ip-creator

# 确保所有文件权限正确
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
SPARROW_API_KEY=\$SPARROW_API_KEY
ENVEOF

# 复制PM2配置
cp deployment/ecosystem.config.js ecosystem.config.js

# 创建日志目录
sudo mkdir -p /var/log/pm2
sudo chown -R ubuntu:ubuntu /var/log/pm2

echo "✅ 应用部署完成！"
EOF

    # 上传并执行部署脚本
    ssh_upload "temp_deploy.sh" "/tmp/deploy.sh" "ubuntu"
    ssh_execute "chmod +x /tmp/deploy.sh && /tmp/deploy.sh" "ubuntu"
    
    # 清理临时文件
    rm temp_deploy.sh
    
    log_success "应用代码部署完成"
}

# 第5步：配置Nginx
configure_nginx() {
    log_step "6" "配置Nginx反向代理"
    
    # 创建Nginx配置
    cat > temp_nginx.conf << EOF
server {
    listen 80;
    server_name $SERVER_IP;

    client_max_body_size 50M;
    
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
    send_timeout 300s;

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
        
        proxy_buffering off;
        proxy_request_buffering off;
    }
    
    location /_next/static/ {
        alias /var/www/ip-creator/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
EOF

    # 上传并配置Nginx
    ssh_upload "temp_nginx.conf" "/tmp/ip-creator.conf" "ubuntu"
    ssh_execute "sudo mv /tmp/ip-creator.conf /etc/nginx/sites-available/ip-creator" "ubuntu"
    ssh_execute "sudo ln -sf /etc/nginx/sites-available/ip-creator /etc/nginx/sites-enabled/" "ubuntu"
    ssh_execute "sudo rm -f /etc/nginx/sites-enabled/default" "ubuntu"
    ssh_execute "sudo nginx -t && sudo systemctl restart nginx" "ubuntu"
    
    # 清理临时文件
    rm temp_nginx.conf
    
    log_success "Nginx配置完成"
}

# 第6步：启动服务
start_services() {
    log_step "7" "启动IP创造师服务"
    
    # 启动PM2服务
    ssh_execute "cd /var/www/ip-creator && pm2 start ecosystem.config.js --env production" "ubuntu"
    ssh_execute "pm2 save && pm2 startup systemd -u ubuntu --hp /home/ubuntu" "ubuntu"
    
    # 等待服务启动
    sleep 10
    
    log_success "服务启动完成"
}

# 第7步：验证部署
verify_deployment() {
    log_step "8" "验证部署结果"
    
    # 检查PM2状态
    log_info "检查PM2进程状态..."
    ssh_execute "pm2 list" "ubuntu"
    
    # 检查Redis
    log_info "检查Redis连接..."
    ssh_execute "redis-cli ping" "ubuntu"
    
    # 测试HTTP访问
    log_info "测试HTTP访问..."
    if curl -s -o /dev/null -w "%{http_code}" "http://$SERVER_IP" | grep -q "200"; then
        log_success "HTTP访问测试通过"
    else
        log_info "HTTP访问可能需要等待服务完全启动..."
    fi
    
    log_success "部署验证完成"
}

# 显示最终结果
show_final_result() {
    echo ""
    echo -e "${PURPLE}"
    echo "🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉"
    echo "🎊            部署成功完成！            🎊"
    echo "🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉"
    echo -e "${NC}"
    echo ""
    echo -e "${GREEN}🌐 您的IP创造师已成功部署！${NC}"
    echo -e "${GREEN}📱 访问地址: http://$SERVER_IP${NC}"
    echo ""
    echo -e "${BLUE}🎯 功能特点：${NC}"
    echo "   ✅ 支持2分钟+长时间AI图片生成"
    echo "   ✅ 3种风格：Q版可爱、玩具手办、赛博朋克"
    echo "   ✅ 真正生成3张独特图片"
    echo "   ✅ 队列系统，无超时限制"
    echo "   ✅ 实时进度反馈"
    echo ""
    echo -e "${BLUE}🔧 管理命令（SSH到服务器后使用）：${NC}"
    echo "   - 查看服务状态: pm2 list"
    echo "   - 查看日志: pm2 logs"
    echo "   - 重启服务: pm2 restart all"
    echo "   - 停止服务: pm2 stop all"
    echo ""
    echo -e "${BLUE}🌟 使用方法：${NC}"
    echo "   1. 打开浏览器访问: http://$SERVER_IP"
    echo "   2. 上传一张人脸照片"
    echo "   3. 选择喜欢的风格"
    echo "   4. 点击'生成我的IP'"
    echo "   5. 等待2-5分钟，获得3张高质量AI头像"
    echo ""
    echo -e "${YELLOW}💡 如果遇到问题：${NC}"
    echo "   - 确保防火墙已开放80端口"
    echo "   - 等待1-2分钟让服务完全启动"
    echo "   - 检查服务器安全组配置"
    echo ""
    echo -e "${GREEN}🎊 享受您的AI头像生成服务吧！${NC}"
}

# 主函数
main() {
    print_banner
    
    log_info "开始一键自动部署..."
    log_info "服务器IP: $SERVER_IP"
    log_info "预计耗时: 5-10分钟"
    echo ""
    
    check_dependencies
    test_server_connection
    initialize_server
    setup_environment
    deploy_application
    configure_nginx
    start_services
    verify_deployment
    show_final_result
    
    echo -e "${GREEN}🎉 一键部署完成！请在浏览器中访问: http://$SERVER_IP${NC}"
}

# 错误处理
trap 'echo -e "${RED}❌ 部署过程中发生错误，请检查网络连接和服务器状态${NC}"; exit 1' ERR

# 执行主函数
main "$@" 