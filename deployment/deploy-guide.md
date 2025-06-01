# 🔥 火山引擎服务器部署指南 - IP Creator项目

## 📋 服务器购买完成后的部署流程

### 🖥️ **第一步：连接服务器**

#### MacOS/Linux 连接方式：
```bash
ssh root@YOUR_SERVER_IP
# 例如：ssh root@123.456.789.012
```

#### Windows 连接方式：
- 使用PuTTY或Windows Terminal
- 主机名：YOUR_SERVER_IP
- 端口：22
- 用户名：root

### 🛠️ **第二步：服务器环境初始化**

```bash
# 1. 更新系统包
apt update && apt upgrade -y

# 2. 安装基础工具
apt install -y curl wget git vim htop unzip

# 3. 配置时区
timedatectl set-timezone Asia/Shanghai

# 4. 创建非root用户（安全建议）
adduser deploy
usermod -aG sudo deploy
```

### 📦 **第三步：安装Node.js环境**

```bash
# 1. 安装Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# 2. 验证安装
node --version  # 应该显示 v18.x.x
npm --version   # 应该显示 9.x.x

# 3. 安装PM2进程管理器
npm install -g pm2

# 4. 安装pnpm（可选，如果项目使用pnpm）
npm install -g pnpm
```

### 🌐 **第四步：安装Nginx（反向代理）**

```bash
# 1. 安装Nginx
apt install -y nginx

# 2. 启动并设置开机自启
systemctl start nginx
systemctl enable nginx

# 3. 检查状态
systemctl status nginx

# 4. 配置防火墙
ufw allow 'Nginx Full'
ufw allow ssh
ufw --force enable
```

### 📂 **第五步：部署项目代码**

```bash
# 1. 切换到deploy用户
su - deploy

# 2. 克隆项目代码
cd /home/deploy
git clone https://github.com/ziyerr/ip-creator-prototype.git
cd ip-creator-prototype

# 3. 安装依赖
npm install --production

# 4. 创建环境变量文件
cp .env.example .env.local
vim .env.local
```

#### 环境变量配置：
```bash
# .env.local 内容
SPARROW_API_KEY=sk-1eEdZF3JuFocE3eyrFBnmE1IgMFwbGcwPfMciRMdxF1Zl8Ke
NODE_ENV=production
PORT=3000
```

### 🏗️ **第六步：构建和启动项目**

```bash
# 1. 构建生产版本
npm run build

# 2. 使用PM2启动项目
pm2 start npm --name "ip-creator" -- start

# 3. 保存PM2配置并设置开机自启
pm2 save
pm2 startup
# 执行命令提示的systemctl命令

# 4. 查看应用状态
pm2 status
pm2 logs ip-creator
```

### ⚙️ **第七步：配置Nginx反向代理**

```bash
# 1. 创建Nginx配置文件
sudo vim /etc/nginx/sites-available/ip-creator
```

#### Nginx配置内容：
```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
```

```bash
# 2. 启用配置
sudo ln -s /etc/nginx/sites-available/ip-creator /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# 3. 测试配置并重启
sudo nginx -t
sudo systemctl reload nginx
```

### 🔒 **第八步：SSL证书配置（可选但推荐）**

```bash
# 1. 安装Certbot
sudo apt install -y certbot python3-certbot-nginx

# 2. 获取SSL证书（需要域名）
sudo certbot --nginx -d your-domain.com

# 3. 设置自动续期
sudo crontab -e
# 添加：0 12 * * * /usr/bin/certbot renew --quiet
```

### 🎯 **第九步：验证部署**

访问测试：
- **HTTP**: http://YOUR_SERVER_IP
- **HTTPS**: https://your-domain.com （如果配置了SSL）

检查服务状态：
```bash
# 检查PM2进程
pm2 status

# 检查Nginx状态  
sudo systemctl status nginx

# 检查端口占用
netstat -tulpn | grep :80
netstat -tulpn | grep :3000

# 查看应用日志
pm2 logs ip-creator
```

### 🛡️ **第十步：安全加固**

```bash
# 1. 禁用root SSH登录
sudo vim /etc/ssh/sshd_config
# 修改：PermitRootLogin no
sudo systemctl restart ssh

# 2. 配置fail2ban防护
sudo apt install -y fail2ban
sudo systemctl enable fail2ban

# 3. 定期更新系统
sudo apt update && sudo apt upgrade -y
```

---

## 🎉 部署完成！

项目成功部署后，您的IP Creator将：
- ✅ 运行在生产环境服务器
- ✅ 支持高并发访问
- ✅ 具备自动重启能力
- ✅ 配置反向代理优化
- ✅ 支持HTTPS安全访问

## 📊 监控和维护

### 日常运维命令：
```bash
# 查看应用状态
pm2 status

# 重启应用
pm2 restart ip-creator

# 查看实时日志
pm2 logs ip-creator --lines 50

# 服务器性能监控
htop
df -h  # 磁盘使用
free -h  # 内存使用
```

## 🚨 故障排除

### 常见问题：
1. **502 Bad Gateway**: 检查PM2服务是否正常
2. **连接超时**: 检查防火墙和安全组配置
3. **内存不足**: 升级服务器配置或优化应用
4. **API调用失败**: 检查环境变量和网络连接 