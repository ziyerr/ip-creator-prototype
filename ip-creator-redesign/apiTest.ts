// 官方生图API图片上传与生成测试
// 请确保 test.png 已放在本文件同目录下

const fs = require('fs');
const path = require('path');
// const fetch = require('node-fetch'); // Node.js 18+无需此行

const API_URL = 'https://knowmyapi.com/v1/images/edits';
const API_KEY = 'sk-IaOsiwfirWd4pqvx92VnNlkIWph7u8KLJuSSLMfqigqAstdi';

async function testImageEdit() {
  const imagePath = path.join(__dirname, 'test.png');
  const imageBuffer = fs.readFileSync(imagePath);

  const formData = new FormData();
  formData.append('image', new Blob([imageBuffer]), 'test.png');
  formData.append('prompt', 'Q版可爱风，卡通头像，明快配色');
  formData.append('model', 'gpt-image-1');
  formData.append('n', '1');
  formData.append('size', '1024x1024');
  formData.append('quality', 'auto');

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: formData,
  });
  const data = await res.json();
  console.log('图片编辑API响应:', data);
}

testImageEdit(); 