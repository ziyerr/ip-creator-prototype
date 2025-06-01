#!/bin/bash

# 🚀 IP创造师火山引擎服务器一键部署脚本
# 完整的自动化部署流程：代码部署 + 队列系统 + PM2管理

set -e

# 配置变量
APP_NAME="ip-creator"
APP_DIR="/var/www/${APP_NAME}"
REPO_URL="https://github.com/YOUR_USERNAME/ip-creator.git"  # 替换为你的仓库
BRANCH="main"
NODE_ENV="production"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_error "不建议使用root用户运行此脚本，请使用普通用户"
        exit 1
    fi
}

# 检查服务器环境
check_environment() {
    log_info "检查服务器环境..."
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js未安装，请先运行环境搭建脚本"
        exit 1
    fi
    
    # 检查PM2
    if ! command -v pm2 &> /dev/null; then
        log_error "PM2未安装，请先运行环境搭建脚本"
        exit 1
    fi
    
    # 检查Redis
    if ! systemctl is-active --quiet redis-server; then
        log_error "Redis服务未运行，请先启动Redis"
        exit 1
    fi
    
    log_success "环境检查通过"
}

# 停止现有服务
stop_services() {
    log_info "停止现有服务..."
    
    # 停止PM2进程
    pm2 stop all || true
    pm2 delete all || true
    
    log_success "现有服务已停止"
}

# 部署代码
deploy_code() {
    log_info "部署应用代码..."
    
    # 创建应用目录
    sudo mkdir -p ${APP_DIR}
    sudo chown -R $USER:$USER ${APP_DIR}
    
    # 克隆或更新代码
    if [ -d "${APP_DIR}/.git" ]; then
        log_info "更新现有代码..."
        cd ${APP_DIR}
        git fetch origin
        git reset --hard origin/${BRANCH}
    else
        log_info "克隆新代码..."
        rm -rf ${APP_DIR}
        git clone -b ${BRANCH} ${REPO_URL} ${APP_DIR}
        cd ${APP_DIR}
    fi
    
    log_success "代码部署完成"
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."
    
    cd ${APP_DIR}
    
    # 复制服务器端专用package.json
    cp deployment/package.json package.json
    
    # 安装依赖
    npm ci --production
    
    # 安装开发依赖（用于构建）
    npm install typescript ts-node @types/node --save-dev
    
    log_success "依赖安装完成"
}

# 构建应用
build_application() {
    log_info "构建Next.js应用..."
    
    cd ${APP_DIR}
    
    # 设置环境变量
    export NODE_ENV=production
    
    # 构建应用
    npm run build
    
    log_success "应用构建完成"
}

# 配置环境变量
setup_environment() {
    log_info "配置环境变量..."
    
    cd ${APP_DIR}
    
    # 创建.env.production文件
    cat > .env.production << EOF
NODE_ENV=production
PORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379
SPARROW_API_KEY=${SPARROW_API_KEY:-sk-1eEdZF3JuFocE3eyrFBnmE1IgMFwbGcwPfMciRMdxF1Zl8Ke}
EOF
    
    log_success "环境变量配置完成"
}

# 配置PM2
setup_pm2() {
    log_info "配置PM2进程管理..."
    
    cd ${APP_DIR}
    
    # 复制PM2配置文件
    cp deployment/ecosystem.config.js ecosystem.config.js
    
    # 替换配置中的路径
    sed -i "s|/var/www/ip-creator|${APP_DIR}|g" ecosystem.config.js
    
    # 创建日志目录
    sudo mkdir -p /var/log/pm2
    sudo chown -R $USER:$USER /var/log/pm2
    
    log_success "PM2配置完成"
}

# 配置Nginx反向代理
setup_nginx() {
    log_info "配置Nginx反向代理..."
    
    # 创建Nginx配置文件
    sudo tee /etc/nginx/sites-available/${APP_NAME} > /dev/null << EOF
server {
    listen 80;
    server_name YOUR_DOMAIN.COM;  # 替换为你的域名或IP

    # 客户端请求体大小限制（支持大图片上传）
    client_max_body_size 50M;
    
    # 超时配置（支持长时间请求）
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
        
        # 长时间请求支持
        proxy_buffering off;
        proxy_request_buffering off;
    }
    
    # 静态文件处理
    location /_next/static/ {
        alias ${APP_DIR}/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API路由超时配置
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # 支持2分钟的长时间请求
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
EOF

    # 启用站点
    sudo ln -sf /etc/nginx/sites-available/${APP_NAME} /etc/nginx/sites-enabled/
    
    # 删除默认站点
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # 测试Nginx配置
    sudo nginx -t
    
    # 重启Nginx
    sudo systemctl restart nginx
    
    log_success "Nginx配置完成"
}

# 启动服务
start_services() {
    log_info "启动应用服务..."
    
    cd ${APP_DIR}
    
    # 启动PM2服务
    pm2 start ecosystem.config.js --env production
    
    # 保存PM2配置
    pm2 save
    
    # 设置PM2开机自启
    pm2 startup
    
    log_success "服务启动完成"
}

# 验证部署
verify_deployment() {
    log_info "验证部署状态..."
    
    sleep 10  # 等待服务启动
    
    # 检查PM2进程状态
    echo "📊 PM2进程状态："
    pm2 list
    
    # 检查端口占用
    echo "🌐 端口占用情况："
    sudo netstat -tlnp | grep :3000 || log_warning "端口3000未被占用"
    
    # 检查Redis连接
    echo "📊 Redis状态："
    redis-cli ping || log_warning "Redis连接失败"
    
    # 测试HTTP响应
    echo "🔍 HTTP响应测试："
    curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || log_warning "HTTP请求失败"
    
    log_success "部署验证完成"
}

# 显示部署信息
show_deployment_info() {
    echo ""
    echo "🎉 =================================="
    echo "🎉 IP创造师部署完成！"
    echo "🎉 =================================="
    echo ""
    echo "📱 应用访问地址: http://YOUR_SERVER_IP"
    echo "📊 PM2管理命令:"
    echo "   - 查看状态: pm2 list"
    echo "   - 查看日志: pm2 logs"
    echo "   - 重启服务: pm2 restart all"
    echo "   - 停止服务: pm2 stop all"
    echo ""
    echo "🔧 队列系统信息:"
    echo "   - Redis: localhost:6379"
    echo "   - Worker进程: 2个并行"
    echo "   - 任务状态查询: /api/queue-status"
    echo ""
    echo "📋 重要配置文件:"
    echo "   - PM2配置: ${APP_DIR}/ecosystem.config.js"
    echo "   - Nginx配置: /etc/nginx/sites-available/${APP_NAME}"
    echo "   - 环境变量: ${APP_DIR}/.env.production"
    echo ""
    echo "📝 日志文件位置:"
    echo "   - 应用日志: /var/log/pm2/ip-creator-app.log"
    echo "   - Worker日志: /var/log/pm2/ip-creator-worker.log"
    echo "   - Nginx日志: /var/log/nginx/access.log"
    echo ""
    echo "🎯 后续操作:"
    echo "   1. 配置域名DNS指向服务器IP"
    echo "   2. 申请SSL证书(推荐Let's Encrypt)"
    echo "   3. 设置定期备份策略"
    echo "   4. 配置监控和告警"
    echo ""
}

# 主函数
main() {
    log_info "开始IP创造师火山引擎服务器部署..."
    
    # 检查参数
    if [ -z "$SPARROW_API_KEY" ]; then
        log_warning "未设置SPARROW_API_KEY环境变量，将使用默认值"
    fi
    
    check_root
    check_environment
    stop_services
    deploy_code
    install_dependencies
    build_application
    setup_environment
    setup_pm2
    setup_nginx
    start_services
    verify_deployment
    show_deployment_info
    
    log_success "🎊 部署完成！IP创造师已成功部署到火山引擎服务器！"
}

# 错误处理
trap 'log_error "部署过程中发生错误，请检查日志"; exit 1' ERR

# 执行主函数
main "$@" 