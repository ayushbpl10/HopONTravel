const http = require('http');

function check(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, length: data.length, hasBase: data.includes('<base href="/" />') }));
    }).on('error', reject);
  });
}

(async () => {
  const r1 = await check('http://127.0.0.1:8080/vendor/sahyadri-trekkers');
  console.log('/vendor/sahyadri-trekkers ->', r1);
  const r2 = await check('http://127.0.0.1:8080/vendor/camp-wanderers');
  console.log('/vendor/camp-wanderers ->', r2);
  const r3 = await check('http://127.0.0.1:8080/v/demo');
  console.log('/v/demo ->', r3);
  const r4 = await check('http://127.0.0.1:8080/vendor');
  console.log('/vendor ->', r4);
  const r5 = await check('http://127.0.0.1:8080/trip/demo');
  console.log('/trip/demo ->', r5);
})();
