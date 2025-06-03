// 🧪 轮询API测试脚本
// 测试任务提交和状态查询功能

const BASE_URL = 'http://localhost:3000';

async function testPollingAPI() {
  console.log('🧪 开始测试轮询API...\n');

  try {
    // 1. 测试任务提交
    console.log('📤 步骤1: 提交测试任务...');
    
    const formData = new FormData();
    formData.append('prompt', 'Q版可爱风格，卡通头像，圆润比例，大眼睛，明快配色，可爱表情，二次元风格');
    
    const submitResponse = await fetch(`${BASE_URL}/api/tasks/submit`, {
      method: 'POST',
      body: formData
    });
    
    if (!submitResponse.ok) {
      throw new Error(`提交失败: ${submitResponse.status}`);
    }
    
    const submitResult = await submitResponse.json();
    console.log('✅ 任务提交成功:', submitResult);
    
    const taskId = submitResult.taskId;
    if (!taskId) {
      throw new Error('没有返回任务ID');
    }
    
    // 2. 轮询任务状态
    console.log('\n🔄 步骤2: 开始轮询任务状态...');
    
    let pollCount = 0;
    const maxPolls = 30; // 最多轮询30次（5分钟）
    
    while (pollCount < maxPolls) {
      pollCount++;
      
      console.log(`\n📊 第${pollCount}次轮询 (${new Date().toLocaleTimeString()}):`);
      
      const statusResponse = await fetch(`${BASE_URL}/api/tasks/status/${taskId}`);
      
      if (!statusResponse.ok) {
        console.error(`❌ 状态查询失败: ${statusResponse.status}`);
        break;
      }
      
      const statusResult = await statusResponse.json();
      console.log(`   状态: ${statusResult.status}`);
      console.log(`   进度: ${statusResult.progress}%`);
      console.log(`   消息: ${statusResult.message}`);
      
      if (statusResult.error) {
        console.log(`   错误: ${statusResult.error}`);
      }
      
      if (statusResult.results && statusResult.results.length > 0) {
        console.log(`   结果: ${statusResult.results.length} 张图片`);
        statusResult.results.forEach((url, index) => {
          console.log(`     图片${index + 1}: ${url}`);
        });
      }
      
      // 检查是否完成
      if (statusResult.status === 'completed') {
        console.log('\n🎉 任务完成！');
        break;
      } else if (statusResult.status === 'failed') {
        console.log('\n❌ 任务失败！');
        break;
      }
      
      // 等待10秒再次轮询
      if (pollCount < maxPolls) {
        console.log('   ⏳ 等待10秒后继续轮询...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
    
    if (pollCount >= maxPolls) {
      console.log('\n⚠️ 达到最大轮询次数，停止测试');
    }
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
  }
}

// 测试API端点可用性
async function testAPIEndpoints() {
  console.log('🔍 测试API端点可用性...\n');
  
  const endpoints = [
    { name: '任务提交API', url: `${BASE_URL}/api/tasks/submit`, method: 'GET' },
    { name: '主页', url: `${BASE_URL}/`, method: 'GET' },
    { name: '测试页面', url: `${BASE_URL}/test-polling`, method: 'GET' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint.url, { method: endpoint.method });
      console.log(`✅ ${endpoint.name}: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log(`❌ ${endpoint.name}: ${error.message}`);
    }
  }
  
  console.log('');
}

// 主函数
async function main() {
  console.log('🚀 轮询系统测试工具\n');
  console.log('=' .repeat(50));
  
  // 先测试端点可用性
  await testAPIEndpoints();
  
  // 询问是否继续完整测试
  console.log('准备开始完整的轮询测试...');
  console.log('这将提交一个真实的图像生成任务并轮询结果');
  console.log('预计耗时: 1-3分钟\n');
  
  // 在Node.js环境中直接开始测试
  await testPollingAPI();
  
  console.log('\n' + '=' .repeat(50));
  console.log('🏁 测试完成！');
}

// 运行测试
if (typeof window === 'undefined') {
  // Node.js环境
  main().catch(console.error);
} else {
  // 浏览器环境
  console.log('请在Node.js环境中运行此测试脚本');
  console.log('命令: node test-polling-api.js');
}

module.exports = { testPollingAPI, testAPIEndpoints };
