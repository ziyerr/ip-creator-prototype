// 🧪 完整流程测试脚本
// 使用内置的fetch (Node.js 18+)
const FormData = require('form-data');

const BASE_URL = 'http://localhost:3000';

async function testCompleteFlow() {
  console.log('🧪 开始完整流程测试...\n');

  try {
    // 1. 检查调试API
    console.log('📊 步骤1: 检查当前任务状态...');
    const debugResponse = await fetch(`${BASE_URL}/api/tasks/debug`);
    const debugData = await debugResponse.json();
    console.log('调试信息:', JSON.stringify(debugData, null, 2));

    // 2. 提交任务（不使用图片文件）
    console.log('\n📤 步骤2: 提交测试任务...');
    
    const formData = new FormData();
    formData.append('prompt', 'Q版可爱风格，卡通头像，圆润比例，大眼睛，明快配色，可爱表情，二次元风格');
    
    const submitResponse = await fetch(`${BASE_URL}/api/tasks/submit`, {
      method: 'POST',
      body: formData
    });
    
    console.log('提交响应状态:', submitResponse.status);
    
    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      throw new Error(`提交失败: ${submitResponse.status} - ${errorText}`);
    }
    
    const submitResult = await submitResponse.json();
    console.log('提交结果:', JSON.stringify(submitResult, null, 2));
    
    const taskId = submitResult.taskId;
    if (!taskId) {
      throw new Error('没有返回任务ID');
    }

    // 3. 立即检查任务状态
    console.log('\n🔍 步骤3: 立即检查任务状态...');
    
    const immediateStatusResponse = await fetch(`${BASE_URL}/api/tasks/status/${taskId}`);
    console.log('立即状态查询响应:', immediateStatusResponse.status);
    
    if (immediateStatusResponse.ok) {
      const immediateStatus = await immediateStatusResponse.json();
      console.log('立即状态:', JSON.stringify(immediateStatus, null, 2));
    } else {
      const errorText = await immediateStatusResponse.text();
      console.log('立即状态查询失败:', errorText);
    }

    // 4. 再次检查调试API
    console.log('\n📊 步骤4: 再次检查任务存储...');
    const debugResponse2 = await fetch(`${BASE_URL}/api/tasks/debug`);
    const debugData2 = await debugResponse2.json();
    console.log('更新后的调试信息:', JSON.stringify(debugData2, null, 2));

    // 5. 轮询几次
    console.log('\n🔄 步骤5: 开始轮询...');
    
    for (let i = 1; i <= 3; i++) {
      console.log(`\n📊 第${i}次轮询:`);
      
      const statusResponse = await fetch(`${BASE_URL}/api/tasks/status/${taskId}`);
      console.log(`状态查询响应: ${statusResponse.status}`);
      
      if (statusResponse.ok) {
        const statusResult = await statusResponse.json();
        console.log(`状态: ${statusResult.status}, 进度: ${statusResult.progress}%`);
        console.log(`消息: ${statusResult.message}`);
        
        if (statusResult.status === 'completed' || statusResult.status === 'failed') {
          console.log('任务已完成或失败，停止轮询');
          break;
        }
      } else {
        const errorText = await statusResponse.text();
        console.log('状态查询失败:', errorText);
      }
      
      if (i < 3) {
        console.log('等待5秒...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
  }
}

// 测试API可用性
async function testAPIAvailability() {
  console.log('🔍 测试API可用性...\n');
  
  const endpoints = [
    { name: '主页', url: `${BASE_URL}/` },
    { name: '任务提交API (GET)', url: `${BASE_URL}/api/tasks/submit` },
    { name: '调试API', url: `${BASE_URL}/api/tasks/debug` }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint.url);
      console.log(`✅ ${endpoint.name}: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log(`❌ ${endpoint.name}: ${error.message}`);
    }
  }
  
  console.log('');
}

async function main() {
  console.log('🚀 轮询系统完整测试\n');
  console.log('=' .repeat(50));
  
  await testAPIAvailability();
  await testCompleteFlow();
  
  console.log('\n' + '=' .repeat(50));
  console.log('🏁 测试完成！');
}

main().catch(console.error);
