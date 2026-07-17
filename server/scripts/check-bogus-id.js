// Quick verification that PATCH with malformed module id returns 404
const http = require('http');

function req(method, path, body, token) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': data ? Buffer.byteLength(data) : 0,
    };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const x = http.request(
      { host: '127.0.0.1', port: 5000, method, path, headers },
      (z) => {
        let s = '';
        z.on('data', (c) => (s += c));
        z.on('end', () => {
          try { resolve({ status: z.statusCode, body: JSON.parse(s) }); }
          catch { resolve({ status: z.statusCode, body: s }); }
        });
      }
    );
    if (data) x.write(data);
    x.end();
  });
}

(async () => {
  const ts = Date.now();
  const sig = await req('POST', '/api/auth/signup', {
    email: 'badid3+' + ts + '@example.com',
    name: 'BadId3',
    password: 'correctpassword',
  });
  console.log('signup status:', sig.status);
  const token = sig.body.token;
  console.log('token len:', token.length);

  const bogus = await req('PATCH', '/api/progress/not-a-real-id/draft', { codeSubmission: 'x' }, token);
  console.log('PATCH bogus:', bogus.status, JSON.stringify(bogus.body));

  // Cleanup
  const mongoose = require('mongoose');
  require('dotenv').config();
  const { User, UserProgress } = require('../models');
  await mongoose.connect(process.env.MONGO_URI);
  const u = await User.findOne({ email: 'badid3+' + ts + '@example.com' });
  if (u) {
    await UserProgress.deleteMany({ userId: u._id });
    await User.deleteOne({ _id: u._id });
  }
  await mongoose.disconnect();
})();