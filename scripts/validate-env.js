#!/usr/bin/env node

/**
 * 环境变量验证脚本
 * 确保所有必需的环境变量都已正确配置
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 验证环境变量配置...\n');

// 必需的环境变量
const REQUIRED_ENV_VARS = [
  {
    name: 'MAQUE_API_KEY',
    description: '麻雀API密钥',
    validation: (value) => {
      if (!value) return '缺少API密钥';
      if (!value.startsWith('sk-')) return 'API密钥格式错误，应以 sk- 开头';
      if (value.length < 20) return 'API密钥长度过短';
      if (value === 'your-api-key-here') return 'API密钥未更新，仍为示例值';
      return null;
    }
  },
  {
    name: 'MAQUE_API_URL',
    description: '麻雀API端点URL',
    validation: (value) => {
      if (!value) return null; // 可选，有默认值
      if (!value.startsWith('https://')) return 'API URL必须使用HTTPS';
      return null;
    },
    optional: true
  }
];

// 检查环境文件
const envFiles = ['.env', '.env.local', '.env.development.local'];
let envFileFound = false;
let loadedEnv = {};

for (const envFile of envFiles) {
  const envPath = path.join(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    console.log(`✅ 找到环境文件: ${envFile}`);
    envFileFound = true;
    
    // 读取环境文件
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          loadedEnv[key.trim()] = valueParts.join('=').trim();
        }
      }
    }
  }
}

if (!envFileFound) {
  console.log('⚠️  未找到环境文件，检查 process.env...');
}

// 验证环境变量
let hasErrors = false;
let hasWarnings = false;

console.log('\n📋 环境变量检查结果:');
console.log('=' .repeat(50));

for (const envVar of REQUIRED_ENV_VARS) {
  const value = loadedEnv[envVar.name] || process.env[envVar.name];
  const validation = envVar.validation(value);
  
  if (validation) {
    if (envVar.optional) {
      console.log(`⚠️  ${envVar.name}: ${validation} (可选)`);
      hasWarnings = true;
    } else {
      console.log(`❌ ${envVar.name}: ${validation}`);
      hasErrors = true;
    }
  } else if (value) {
    const maskedValue = envVar.name.includes('KEY') 
      ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}`
      : value;
    console.log(`✅ ${envVar.name}: ${maskedValue}`);
  } else if (envVar.optional) {
    console.log(`ℹ️  ${envVar.name}: 使用默认值 (可选)`);
  } else {
    console.log(`❌ ${envVar.name}: 未设置`);
    hasErrors = true;
  }
}

console.log('=' .repeat(50));

// 检查 Next.js 配置
const nextConfigPath = path.join(process.cwd(), 'next.config.js');
if (fs.existsSync(nextConfigPath)) {
  console.log('✅ Next.js 配置文件存在');
} else {
  console.log('⚠️  Next.js 配置文件不存在');
  hasWarnings = true;
}

// 检查 .gitignore
const gitignorePath = path.join(process.cwd(), '.gitignore');
if (fs.existsSync(gitignorePath)) {
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  const protectedFiles = ['.env', '.env.local', '.env.development.local'];
  const missingProtection = protectedFiles.filter(file => !gitignoreContent.includes(file));
  
  if (missingProtection.length === 0) {
    console.log('✅ .gitignore 正确保护环境文件');
  } else {
    console.log(`⚠️  .gitignore 缺少保护: ${missingProtection.join(', ')}`);
    hasWarnings = true;
  }
} else {
  console.log('❌ .gitignore 文件不存在');
  hasErrors = true;
}

// 总结
console.log('\n📊 验证总结:');
if (hasErrors) {
  console.log('❌ 发现错误，请修复后重试');
  console.log('\n🔧 修复建议:');
  console.log('1. 创建 .env 或 .env.local 文件');
  console.log('2. 添加正确的 MAQUE_API_KEY');
  console.log('3. 确保 .gitignore 保护敏感文件');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️  有警告，但可以继续运行');
  console.log('✅ 环境配置基本正确');
} else {
  console.log('✅ 所有环境变量配置正确！');
}

console.log('\n🚀 可以启动应用: npm run dev');
