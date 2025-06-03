/** @type {import('next').NextConfig} */
const nextConfig = {
  // 确保环境变量在服务端可用
  env: {
    // 这些变量只在服务端可用，不会暴露给客户端
    MAQUE_API_KEY: process.env.MAQUE_API_KEY,
    MAQUE_API_URL: process.env.MAQUE_API_URL,
  },
  
  // 图片优化配置
  images: {
    domains: [
      'ismaque.org',
      'localhost',
      'ip-creator-ziyerrs-projects.vercel.app'
    ],
    // 允许外部图片
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
      }
    ]
  },
  
  // 服务端外部包配置
  serverExternalPackages: [],
  
  // 输出配置
  output: 'standalone',
  
  // 重定向配置
  async redirects() {
    return [
      // 可以在这里添加重定向规则
    ]
  },
  
  // 头部配置
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
