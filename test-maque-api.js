// 测试麻雀API配置
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.MAQUE_API_KEY;

console.log('=== 麻雀API配置检查 ===\n');

if (!apiKey) {
  console.error('❌ 错误：未找到 MAQUE_API_KEY 环境变量');
  console.log('请确保：');
  console.log('1. 已创建 .env.local 文件');
  console.log('2. 文件中包含 MAQUE_API_KEY=your-api-key');
  console.log('3. 已将 your-api-key 替换为实际的API密钥\n');
  process.exit(1);
}

if (apiKey === 'your-api-key-here') {
  console.error('❌ 错误：API密钥未修改');
  console.log('请编辑 .env.local 文件，将 your-api-key-here 替换为您的实际API密钥\n');
  process.exit(1);
}

console.log('✅ 找到API密钥配置');
console.log(`密钥格式：${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 4)}`);
console.log(`密钥长度：${apiKey.length} 字符`);

// 简单的格式验证
if (!apiKey.startsWith('sk-')) {
  console.warn('⚠️  警告：API密钥通常以 sk- 开头，请确认密钥是否正确');
}

console.log('\n配置看起来正确！现在可以重启开发服务器了。');
console.log('使用命令：npm run dev');
