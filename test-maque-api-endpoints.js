// 测试麻雀 API 端点的脚本
const https = require('https');
const http = require('http');

// 可能的 API 端点列表
const possibleEndpoints = [
  'https://ismaque.org/v1/images/generations',
  'https://ismaque.org/v1/images/edits', 
  'https://ismaque.org/v1/images/variations',
  'https://ismaque.org/v1/chat/completions',
  'https://ismaque.org/api/v1/images/generations',
  'https://ismaque.org/api/v1/images/edits',
  'https://ismaque.org/api/images/generations',
  'https://ismaque.org/api/images/edits',
  'https://api.ismaque.org/v1/images/generations',
  'https://api.ismaque.org/v1/images/edits',
  'https://ismaque.org/openai/v1/images/generations',
  'https://ismaque.org/openai/v1/images/edits'
];

// 测试单个端点
function testEndpoint(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname,
      method: 'HEAD',
      timeout: 10000,
      headers: {
        'User-Agent': 'IP-Creator-Test/1.0',
        'Accept': 'application/json'
      }
    };

    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(options, (res) => {
      resolve({
        url,
        status: res.statusCode,
        headers: res.headers,
        success: res.statusCode < 500 // 2xx, 3xx, 4xx 都算可访问
      });
    });

    req.on('error', (error) => {
      resolve({
        url,
        status: 'ERROR',
        error: error.message,
        success: false
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        url,
        status: 'TIMEOUT',
        error: 'Request timeout',
        success: false
      });
    });

    req.end();
  });
}

// 测试所有端点
async function testAllEndpoints() {
  console.log('🔍 开始测试麻雀 API 端点...\n');
  
  const results = [];
  
  for (const endpoint of possibleEndpoints) {
    console.log(`📡 测试: ${endpoint}`);
    const result = await testEndpoint(endpoint);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ 状态: ${result.status} - 可访问`);
    } else {
      console.log(`❌ 状态: ${result.status} - ${result.error || '不可访问'}`);
    }
    
    // 添加延迟避免过于频繁的请求
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📊 测试结果汇总:');
  console.log('='.repeat(80));
  
  const successfulEndpoints = results.filter(r => r.success);
  const failedEndpoints = results.filter(r => !r.success);
  
  if (successfulEndpoints.length > 0) {
    console.log('\n✅ 可访问的端点:');
    successfulEndpoints.forEach(result => {
      console.log(`  ${result.url} - HTTP ${result.status}`);
    });
  }
  
  if (failedEndpoints.length > 0) {
    console.log('\n❌ 不可访问的端点:');
    failedEndpoints.forEach(result => {
      console.log(`  ${result.url} - ${result.status} (${result.error || '未知错误'})`);
    });
  }
  
  console.log(`\n📈 总计: ${successfulEndpoints.length}/${results.length} 个端点可访问`);
  
  // 推荐使用的端点
  if (successfulEndpoints.length > 0) {
    console.log('\n💡 建议使用的端点:');
    
    // 优先推荐图片编辑端点
    const editEndpoints = successfulEndpoints.filter(r => r.url.includes('/edits'));
    if (editEndpoints.length > 0) {
      console.log(`  推荐 (图片编辑): ${editEndpoints[0].url}`);
    }
    
    // 其次推荐图片生成端点
    const genEndpoints = successfulEndpoints.filter(r => r.url.includes('/generations'));
    if (genEndpoints.length > 0) {
      console.log(`  备选 (图片生成): ${genEndpoints[0].url}`);
    }
    
    // 显示第一个可用端点
    console.log(`  首选: ${successfulEndpoints[0].url}`);
  } else {
    console.log('\n⚠️ 没有找到可访问的端点，可能的原因:');
    console.log('  1. 麻雀 API 服务暂时不可用');
    console.log('  2. API 端点地址已更改');
    console.log('  3. 需要特殊的认证头或参数');
    console.log('  4. 网络连接问题');
  }
}

// 额外测试：尝试 POST 请求到最可能的端点
async function testPostRequest() {
  console.log('\n🧪 测试 POST 请求 (需要 API Key)...');
  
  const testEndpoint = 'https://ismaque.org/v1/images/edits';
  const apiKey = process.env.MAQUE_API_KEY || 'sk-5D59F8';
  
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      model: 'gpt-image-1',
      prompt: 'test prompt',
      n: 1,
      size: '512x512'
    });
    
    const options = {
      hostname: 'ismaque.org',
      port: 443,
      path: '/v1/images/edits',
      method: 'POST',
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'IP-Creator-Test/1.0',
        'Accept': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`📡 POST 响应状态: ${res.statusCode}`);
        console.log(`📋 响应头:`, res.headers);
        
        if (data) {
          try {
            const jsonData = JSON.parse(data);
            console.log(`📄 响应数据:`, JSON.stringify(jsonData, null, 2));
          } catch {
            console.log(`📄 响应数据 (原始):`, data.substring(0, 500));
          }
        }
        
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ POST 请求失败: ${error.message}`);
      resolve({ error: error.message });
    });
    
    req.on('timeout', () => {
      req.destroy();
      console.log(`⏰ POST 请求超时`);
      resolve({ error: 'timeout' });
    });
    
    req.write(postData);
    req.end();
  });
}

// 主函数
async function main() {
  console.log('🚀 麻雀 API 端点测试工具');
  console.log('='.repeat(50));
  
  await testAllEndpoints();
  await testPostRequest();
  
  console.log('\n✅ 测试完成！');
}

// 运行测试
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testAllEndpoints, testEndpoint };
