const https = require('https');

const prompt = `请摘录一段中国古典四大名著《西游记》原著中的经典片段（字数严格限制在300字到400字之间）。\n要求：\n1. 真实原文。\n2. 第一行必须是提炼出的题目。\n3. 第二行开始直接输出原文片段。\n4. 不要多余解释。`;

const data = JSON.stringify({
  model: 'qwen-max',
  messages: [{ role: 'user', content: prompt }]
});

const options = {
  hostname: 'dashscope.aliyuncs.com',
  port: 443,
  path: '/compatible-mode/v1/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sk-a6ba686f91e34fe087240b3043041e51',
    'Content-Length': Buffer.byteLength(data)
  }
};

const startTime = Date.now();
const req = https.request(options, (res) => {
  let responseData = '';
  res.on('data', (d) => {
    responseData += d;
  });
  
  res.on('end', () => {
    console.log('Time taken:', Date.now() - startTime, 'ms');
    console.log('Status Code:', res.statusCode);
    // console.log('Response:', responseData);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();
