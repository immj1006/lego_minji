const https = require('https');
const url = 'https://lego-api-blue.vercel.app/sales?id=31218';
https.get(url, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2).slice(0, 2000));
    } catch (e) {
      console.error('parse error', e, data);
    }
  });
}).on('error', e => console.error('request error', e));
