/**
 * End-to-end test of the dashboard data path, going through the Vite proxy
 * exactly like the browser would.
 *
 *   browser → :5173/api/auth/signup   →  Vite proxy  →  :5000/api/auth/signup
 *   browser → :5173/api/progress      →  Vite proxy  →  :5000/api/progress
 */
const http = require('http');

const PROXY_HOST = '127.0.0.1';
const PROXY_PORT = 5173;
const EMAIL = `e2edash+${Date.now()}@example.com`;
const PASSWORD = 'securepass1234';

function proxyRequest(method, path, { body, token } = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      { host: PROXY_HOST, port: PROXY_PORT, method, path,
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

(async () => {
  console.log('▶ Browser-equivalent: signup through Vite proxy');
  let r = await proxyRequest('POST', '/api/auth/signup', {
    body: { email: EMAIL, name: 'Dashboard E2E', password: PASSWORD },
  });
  console.log(`   ${r.status}`, JSON.stringify(r.body).slice(0, 80) + '…');
  if (r.status !== 201) {
    console.log('❌ Signup failed — aborting.');
    process.exit(1);
  }
  const token = r.body.token;

  console.log('\n▶ Browser-equivalent: GET /api/progress through proxy');
  r = await proxyRequest('GET', '/api/progress', { token });
  console.log(`   ${r.status}`);

  if (r.status !== 200) {
    console.log('❌ Progress fetch failed.');
    process.exit(1);
  }

  const paths = r.body.paths || [];
  console.log(`\nGot ${paths.length} paths:`);
  for (const p of paths) {
    console.log(`\n  ▸ ${p.name}  (${p.description})`);
    for (const m of p.modules) {
      const t = m.teaser.length > 60 ? m.teaser.slice(0, 60) + '…' : m.teaser;
      const linkable = m.status !== 'locked' ? `→ /module/${m.moduleId}` : '(locked)';
      console.log(`      ${m.order}. ${m.name.padEnd(13)} [${m.status.padEnd(9)}]  ${linkable}`);
      console.log(`         "${t}"`);
    }
  }

  // Mark one complete and re-fetch to confirm reactivity
  const mongoose = require('mongoose');
  require('dotenv').config();
  const { User, UserProgress } = require('../models');
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne({ email: EMAIL });
  const firstMod = paths[0].modules[0];
  await UserProgress.updateOne(
    { userId: user._id, moduleId: firstMod.moduleId },
    { $set: { status: 'completed', quizPassed: true, xpEarned: 100, completedAt: new Date() } }
  );

  console.log('\n▶ Marked first module "completed" — re-fetching progress…');
  r = await proxyRequest('GET', '/api/progress', { token });
  const refetched = r.body.paths[0].modules[0];
  console.log(`   first module status now: ${refetched.status}, xp=${refetched.xpEarned}`);
  if (refetched.status !== 'completed' || refetched.xpEarned !== 100) {
    console.log('❌ Status update did not propagate.');
    process.exit(1);
  }

  // cleanup
  await UserProgress.deleteMany({ userId: user._id });
  await User.deleteOne({ _id: user._id });
  await mongoose.disconnect();

  console.log('\n✅ E2E progress fetch through Vite proxy works.');
})();