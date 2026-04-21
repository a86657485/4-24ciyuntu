const https = require('https');

const options = {
  hostname: 'dashscope.aliyuncs.com',
  port: 443,
  path: '/compatible-mode/v1/models',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer sk-a6ba686f91e34fe087240b3043041e51'
  }
};

const req = https.request(options, (res) => {
  let responseData = '';
  res.on('data', (d) => {
    responseData += d;
  });
  
  res.on('end', () => {
    try {
      const parsed = JSON.parse(responseData);
      console.log('Status Code:', res.statusCode);
      // Log model ids
      const modelIds = parsed.data.map(m => m.id);
      console.log(`Total models: ${modelIds.length}`);
      console.log('Available models:', modelIds.join(', '));
    } catch(e) {
      console.log('Response:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.end();
