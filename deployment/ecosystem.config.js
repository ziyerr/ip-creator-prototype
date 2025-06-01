// 🚀 PM2 进程管理配置 - IP创造师服务器部署
// 同时管理 Next.js 应用和 Worker 进程

module.exports = {
  apps: [
    {
      // 📱 Next.js 主应用
      name: 'ip-creator-app',
      script: 'npm',
      args: 'run start',
      cwd: '/var/www/ip-creator',
      instances: 1, // 单实例模式
      exec_mode: 'fork',
      
      // 环境配置
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        SPARROW_API_KEY: process.env.SPARROW_API_KEY || 'sk-1eEdZF3JuFocE3eyrFBnmE1IgMFwbGcwPfMciRMdxF1Zl8Ke',
      },
      
      // 资源限制
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
      
      // 日志配置
      log_file: '/var/log/pm2/ip-creator-app.log',
      out_file: '/var/log/pm2/ip-creator-app-out.log',
      error_file: '/var/log/pm2/ip-creator-app-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // 自动重启配置
      autorestart: true,
      max_restarts: 5,
      min_uptime: '10s',
      
      // 健康检查
      health_check: {
        url: 'http://localhost:3000/api/health',
        interval: 30000, // 30秒检查一次
        timeout: 5000,
      },
    },
    
    {
      // ⚙️ 图片生成 Worker 进程
      name: 'ip-creator-worker',
      script: 'ts-node',
      args: 'workers/image-generation-worker.ts',
      cwd: '/var/www/ip-creator',
      instances: 2, // 2个Worker并行处理
      exec_mode: 'fork',
      
      // 环境配置
      env: {
        NODE_ENV: 'production',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        SPARROW_API_KEY: process.env.SPARROW_API_KEY || 'sk-1eEdZF3JuFocE3eyrFBnmE1IgMFwbGcwPfMciRMdxF1Zl8Ke',
        WORKER_CONCURRENCY: 1, // 每个Worker同时处理1个任务
      },
      
      // 资源限制
      max_memory_restart: '2G',
      node_args: '--max-old-space-size=2048',
      
      // 日志配置
      log_file: '/var/log/pm2/ip-creator-worker.log',
      out_file: '/var/log/pm2/ip-creator-worker-out.log',
      error_file: '/var/log/pm2/ip-creator-worker-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // 自动重启配置
      autorestart: true,
      max_restarts: 10, // Worker允许更多重启次数
      min_uptime: '5s',
      restart_delay: 5000, // 5秒重启延迟
      
      // Worker特殊配置
      kill_timeout: 30000, // 30秒kill超时
      listen_timeout: 10000,
    },
    
    {
      // 📊 队列监控进程 (可选)
      name: 'ip-creator-monitor',
      script: 'ts-node',
      args: 'scripts/queue-monitor.ts',
      cwd: '/var/www/ip-creator',
      instances: 1,
      exec_mode: 'fork',
      
      env: {
        NODE_ENV: 'production',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        MONITOR_INTERVAL: 60000, // 1分钟监控间隔
      },
      
      // 资源限制（监控进程资源消耗小）
      max_memory_restart: '256M',
      
      // 日志配置
      log_file: '/var/log/pm2/ip-creator-monitor.log',
      out_file: '/var/log/pm2/ip-creator-monitor-out.log',
      error_file: '/var/log/pm2/ip-creator-monitor-error.log',
      
      // 可选启动（如果不需要监控可以注释掉）
      autorestart: true,
      max_restarts: 3,
    }
  ],
  
  // 部署配置
  deploy: {
    production: {
      user: 'ubuntu',
      host: 'YOUR_SERVER_IP', // 替换为火山引擎服务器IP
      ref: 'origin/main',
      repo: 'https://github.com/YOUR_USERNAME/ip-creator.git', // 替换为你的Git仓库
      path: '/var/www/ip-creator',
      
      // 部署前执行
      'pre-deploy-local': '',
      
      // 部署后执行
      'post-deploy': 'npm ci && npm run build && pm2 reload ecosystem.config.js --env production',
      
      // 设置环境变量
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      }
    }
  }
}; 