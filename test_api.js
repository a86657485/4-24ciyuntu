const https = require('https');

const data = JSON.stringify({
  model: 'qwen3.6-plus',
  messages: [{ role: 'user', content: 'hello' }]
});

const options = {
  hostname: 'dashscope.aliyuncs.com',
  port: 443,
  path: '/compatible-mode/v1/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sk-a6ba686f91e34fe087240b3043041e51',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let responseData = '';
  res.on('data', (d) => {
    responseData += d;
  });
  
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', responseData);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();
