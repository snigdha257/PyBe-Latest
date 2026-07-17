/**
 * End-to-end smoke test for the auth flow.
 *
 *   1. /api/health           (public, sanity)
 *   2. /api/me WITHOUT token (should 401)
 *   3. /api/me WITH garbage  (should 401)
 *   4. POST /api/auth/signup (should 201, return token + user)
 *   5. POST /api/auth/signup same email (should 409)
 *   6. POST /api/auth/login  (should 200, return token)
 *   7. /api/me WITH token    (should 200)
 *   8. DB sanity: user has 9 UserProgress rows, 3 unlocked (first of each path)
 */

const http = require('http');
const mongoose = require('mongoose');
require('dotenv').config();

const { User, UserProgress } = require('../models');

const HOST = '127.0.0.1';
const PORT = 5000;
const TEST_EMAIL = `smoke+${Date.now()}@example.com`;
const TEST_PASSWORD = 'hunter22-test';

function request(method, path, { body, token } = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        host: HOST,
        port: PORT,
        method,
        path,
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
          try {
            parsed = chunks ? JSON.parse(chunks) : null;
          } catch {
            parsed = chunks;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function expect(label, condition, detail) {
  const mark = condition ? '✅' : '❌';
  console.log(`  ${mark} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!condition) process.exitCode = 1;
}

(async () => {
  console.log('▶ 1. health');
  let r = await request('GET', '/api/health');
  expect('GET /api/health → 200 ok', r.status === 200 && r.body?.status === 'ok', JSON.stringify(r.body));

  console.log('\n▶ 2. protected without token');
  r = await request('GET', '/api/me');
  expect('GET /api/me without token → 401', r.status === 401, JSON.stringify(r.body));

  console.log('\n▶ 3. protected with bad token');
  r = await request('GET', '/api/me', { token: 'not-a-real-jwt' });
  expect('GET /api/me with garbage token → 401', r.status === 401, JSON.stringify(r.body));

  console.log('\n▶ 4. signup');
  r = await request('POST', '/api/auth/signup', {
    body: { email: TEST_EMAIL, name: 'Smoke Test', password: TEST_PASSWORD },
  });
  expect(
    'POST /api/auth/signup → 201 + token + progressSeeded=9',
    r.status === 201 && r.body?.token && r.body?.progressSeeded === 9,
    JSON.stringify({ status: r.status, hasToken: !!r.body?.token, progressSeeded: r.body?.progressSeeded, user: r.body?.user })
  );
  const firstToken = r.body?.token;
  const newUserId = r.body?.user?.id;

  console.log('\n▶ 5. duplicate signup');
  r = await request('POST', '/api/auth/signup', {
    body: { email: TEST_EMAIL, name: 'Smoke Test', password: TEST_PASSWORD },
  });
  expect('POST /api/auth/signup (duplicate) → 409', r.status === 409, JSON.stringify(r.body));

  console.log('\n▶ 6. login');
  r = await request('POST', '/api/auth/login', {
    body: { email: TEST_EMAIL, password: TEST_PASSWORD },
  });
  expect(
    'POST /api/auth/login → 200 + token',
    r.status === 200 && r.body?.token,
    JSON.stringify({ status: r.status, hasToken: !!r.body?.token })
  );
  const loginToken = r.body?.token;

  console.log('\n▶ 7. protected with token');
  r = await request('GET', '/api/me', { token: firstToken });
  expect(
    'GET /api/me with valid token → 200',
    r.status === 200 && r.body?.user?.email === TEST_EMAIL,
    JSON.stringify(r.body)
  );

  console.log('\n▶ 8. login bad password');
  r = await request('POST', '/api/auth/login', {
    body: { email: TEST_EMAIL, password: 'wrong-pass' },
  });
  expect('POST /api/auth/login (wrong password) → 401', r.status === 401, JSON.stringify(r.body));

  console.log('\n▶ 9. DB sanity: progress records for the new user');
  await mongoose.connect(process.env.MONGO_URI);
  const all = await UserProgress.find({ userId: newUserId })
    .populate('moduleId', 'name order pathId')
    .lean();
  const unlocked = all.filter((p) => p.status === 'unlocked');
  expect(`UserProgress count = 9`, all.length === 9, `actual=${all.length}`);
  expect(`Exactly 3 unlocked (first module of each path)`, unlocked.length === 3, `actual=${unlocked.length}`);

  // Group unlocked by path to confirm exactly one per path
  const pathOrderOfUnlocked = unlocked.map((p) => p.moduleId.order).sort();
  expect(
    'Unlocked modules are all "order=1" in their respective paths',
    pathOrderOfUnlocked.every((o) => o === 1),
    `orders=${JSON.stringify(pathOrderOfUnlocked)}`
  );

  // Cleanup so re-runs stay tidy
  await UserProgress.deleteMany({ userId: newUserId });
  await User.deleteOne({ _id: newUserId });
  await mongoose.disconnect();

  console.log('\n✅ Smoke test complete.');
  if (process.exitCode === 1) console.log('(some checks failed)');
})();
