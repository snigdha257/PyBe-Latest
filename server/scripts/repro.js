const http = require('http');
function request(host, port, method, url, { body, token } = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        host, port, method, path: url,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data ? Buffer.byteLength(data) : 0,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let chunks = '';
        res.on('data', (c) => (chunks += c));
        res.on('end', () => {
          let parsed;
          try { parsed = chunks ? JSON.parse(chunks) : null; } catch { parsed = chunks; }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  const TEST_EMAIL = `verify+${Date.now()}@example.com`;
  const TEST_PASSWORD = 'correct-horse-battery-staple';
  console.log('Email:', TEST_EMAIL, '(len', TEST_EMAIL.length, ')');
  let r = await request('127.0.0.1', 5000, 'POST', '/api/auth/signup', {
    body: { email: TEST_EMAIL, name: 'Verify User', password: TEST_PASSWORD },
  });
  console.log('STATUS:', r.status);
  console.log('BODY:', JSON.stringify(r.body));
})();