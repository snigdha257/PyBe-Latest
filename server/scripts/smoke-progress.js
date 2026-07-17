/**
 * Smoke test for /api/progress — creates a fresh user, hits the route with
 * the new token, validates the shape, then cleans up.
 */
const http = require('http');
const mongoose = require('mongoose');
require('dotenv').config();

const { User, UserProgress } = require('../models');

const HOST = '127.0.0.1';
const PORT = 5000;
const EMAIL = `progress+${Date.now()}@example.com`;
const PASSWORD = 'goodpass1234';

function request(method, path, { body, token } = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      { host: HOST, port: PORT, method, path,
        headers: { 'Content-Type': 'application/json',
                   'Content-Length': data ? Buffer.byteLength(data) : 0,
                   ...(token ? { Authorization: `Bearer ${token}` } : {}) } },
      (res) => {
        let chunks = ''; res.on('data', (c) => chunks += c);
        res.on('end', () => {
          let parsed; try { parsed = chunks ? JSON.parse(chunks) : null; } catch { parsed = chunks; }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

let pass = 0, fail = 0;
function check(label, cond, detail = '') {
  if (cond) { console.log(`  ✅ ${label}${detail ? ' — ' + detail : ''}`); pass++; }
  else      { console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`); fail++; }
}

(async () => {
  console.log('▶ Setup: create a fresh user');
  let r = await request('POST', '/api/auth/signup', { body: { email: EMAIL, name: 'Progress Smoke', password: PASSWORD } });
  check('Signup → 201', r.status === 201, `status=${r.status}`);
  const token = r.body.token;
  const userId = r.body.user.id;

  console.log('\n▶ /api/progress without token');
  r = await request('GET', '/api/progress');
  check('Unauthenticated → 401', r.status === 401);

  console.log('\n▶ /api/progress with token');
  r = await request('GET', '/api/progress', { token });
  check('Authenticated → 200', r.status === 200, JSON.stringify(r.body).slice(0, 60) + '…');

  const paths = r.body?.paths || [];
  check('Returns exactly 3 paths', paths.length === 3, `actual=${paths.length}`);
  check(
    'Paths in order 1,2,3',
    paths.map((p) => p.order).join(',') === '1,2,3',
    `orders=${paths.map((p) => p.order).join(',')}`
  );
  check('First path is Foundations', paths[0]?.name === 'Foundations', paths[0]?.name);
  check('Second path is Structures', paths[1]?.name === 'Structures', paths[1]?.name);
  check('Third path is Design', paths[2]?.name === 'Design', paths[2]?.name);

  for (const p of paths) {
    check(`[${p.name}] has 3 modules`, p.modules.length === 3, `actual=${p.modules.length}`);
    check(
      `[${p.name}] modules are sorted by order`,
      p.modules.map((m) => m.order).join(',') === '1,2,3'
    );
    check(
      `[${p.name}] each module has a non-empty teaser`,
      p.modules.every((m) => typeof m.teaser === 'string' && m.teaser.length > 0)
    );
  }

  const statuses = paths.flatMap((p) => p.modules.map((m) => `${p.name}/${m.name}=${m.status}`));
  console.log('  Status map:');
  for (const s of statuses) console.log('    • ' + s);
  const unlocked = statuses.filter((s) => s.endsWith('=unlocked'));
  const locked = statuses.filter((s) => s.endsWith('=locked'));
  check('Exactly 3 unlocked (one per path)', unlocked.length === 3, `unlocked=${unlocked.length}`);
  check('Exactly 6 locked', locked.length === 6, `locked=${locked.length}`);

  console.log('\n▶ Update one module to completed and re-fetch');
  const firstModule = paths[0].modules[0];
  const moduleId = firstModule.moduleId;
  await mongoose.connect(process.env.MONGO_URI);
  await UserProgress.updateOne(
    { userId, moduleId },
    { $set: { status: 'completed', quizPassed: true, xpEarned: 50, completedAt: new Date() } }
  );
  await mongoose.disconnect();

  r = await request('GET', '/api/progress', { token });
  const refetched = r.body.paths[0].modules[0];
  check(
    'After completion, status reflects as completed',
    refetched.status === 'completed' && refetched.quizPassed === true && refetched.xpEarned === 50,
    JSON.stringify(refetched)
  );

  // cleanup
  await mongoose.connect(process.env.MONGO_URI);
  await UserProgress.deleteMany({ userId });
  await User.deleteOne({ _id: userId });
  await mongoose.disconnect();

  console.log(`\n━━━ Summary: ✅${pass} passed, ❌${fail} failed ━━━`);
  if (fail > 0) process.exitCode = 1;
})();