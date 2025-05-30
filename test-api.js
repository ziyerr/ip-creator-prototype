// 测试API集成
const { generateImage } = require('./ip-creator-redesign/api.ts');

async function testAPI() {
  try {
    console.log('开始测试图片生成API...');
    
    const result = await generateImage({
      prompt: 'Q版可爱风格，卡通头像，圆润比例，大眼睛，明快配色',
      imageUrl: 'https://example.com/test-image.jpg' // 测试用的图片URL
    });
    
    console.log('API测试成功！生成的图片URL:', result);
  } catch (error) {
    console.error('API测试失败:', error.message);
  }
}

testAPI();
