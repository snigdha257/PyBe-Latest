const http = require('http');
const PWD = require('./_pwd.js');

function rq(m, p, opts = {}) {
  return new Promise((res, rej) => {
    const data = opts.body ? JSON.stringify(opts.body) : null;
    const r = http.request(
      { host: '127.0.0.1', port: 5000, method: m, path: p,
        headers: { 'Content-Type': 'application/json',
                   'Content-Length': data ? Buffer.byteLength(data) : 0,
                   ...(opts.token ? { Authorization: 'Bearer ' + opts.token } : {}) } },
      (x) => { let s = ''; x.on('data', c => s += c); x.on('end', () => res({ status: x.statusCode, body: s ? JSON.parse(s) : null })); });
    r.on('error', rej);
    if (data) r.write(data);
    r.end();
  });
}

(async () => {
  const s = await rq('POST', '/api/auth/signup', {
    body: { email: 'summary-' + Date.now() + '@e.com', name: 'Sum', password: PWD },
  });
  console.log('signup status:', s.status, 'keys:', s.body && Object.keys(s.body));
  const tok = s.body.token;

  const u = await rq('GET', '/api/user/summary', { token: tok });
  console.log('summary (no modules complete yet):', JSON.stringify(u));

  const noAuth = await rq('GET', '/api/user/summary');
  console.log('summary no-token status:', noAuth.status);
})();