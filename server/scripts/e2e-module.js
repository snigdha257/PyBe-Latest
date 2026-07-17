/**
 * End-to-end test through the Vite proxy.
 *
 *   browser :5173 → :5000 proxy → :5000 server → :27017 MongoDB
 *
 * Walks the whole /module/:id flow as the browser would.
 */
const http = require('http');
const mongoose = require('mongoose');
require('dotenv').config();
const { User, UserProgress } = require('../models');

const PROXY = '127.0.0.1';
const PROXY_PORT = 5173;
const NAME = 'E2E Module User';
const EMAIL = `e2emod+${Date.now()}@example.com`;
const PASSWORD = 'correctpassword';

function proxy(method, path, { body, token } = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      { host: PROXY, port: PROXY_PORT, method, path,
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
const GROUP = (l) => console.log(`\n▶ ${l}`);
function check(label, cond, detail = '') {
  if (cond) { console.log(`  ✅ ${label}${detail ? ' — ' + detail : ''}`); pass++; }
  else      { console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`); fail++; }
}

(async () => {
  GROUP('Setup: signup through proxy');
  let r = await proxy('POST', '/api/auth/signup', { body: { email: EMAIL, name: NAME, password: PASSWORD } });
  check('Signup → 201', r.status === 201, `status=${r.status}`);
  const token = r.body.token;
  const userId = r.body.user.id;

  GROUP('Pick unlocked + locked modules via /api/progress');
  r = await proxy('GET', '/api/progress', { token });
  const all = r.body.paths.flatMap((p) => p.modules);
  const unlocked = all.find((m) => m.status === 'unlocked');
  const locked = all.find((m) => m.status === 'locked');
  check('Got unlocked module', !!unlocked);
  check('Got locked module', !!locked);

  GROUP('GET /api/module/:id through proxy — unlocked');
  r = await proxy('GET', `/api/module/${unlocked.moduleId}`, { token });
  check('→ 200', r.status === 200, `status=${r.status}`);
  check(
    'Story contains the user name (learner substitution)',
    r.body?.module?.story?.includes(NAME) &&
      !r.body.module.story.includes('{learner}')
  );
  check(
    'Module has all four content fields populated',
    ['story', 'whyPairing', 'practicalTask', 'reflectionPrompt']
      .every((k) => typeof r.body?.module?.[k] === 'string' &&
                   r.body.module[k].length > 10)
  );
  check(
    'Response carries the user\'s progress (status=unlocked, codeSubmission="")',
    r.body?.progress?.status === 'unlocked' && r.body.progress.codeSubmission === ''
  );

  GROUP('GET /api/module/:id through proxy — locked');
  r = await proxy('GET', `/api/module/${locked.moduleId}`, { token });
  check('→ 403', r.status === 403, JSON.stringify(r.body));

  GROUP('PATCH /api/progress/:moduleId/draft through proxy');
  const draftV1 = `# ${NAME}'s first attempt\ndef hello(name):\n    return f"Hello, {name}!"\n`;
  r = await proxy('PATCH', `/api/progress/${unlocked.moduleId}/draft`, {
    token,
    body: { codeSubmission: draftV1 },
  });
  check('Save draft v1 → 200', r.status === 200, `status=${r.status}`);
  check('Response echoes codeSubmission', r.body?.progress?.codeSubmission === draftV1);
  check('status=unlocked (no accidental completion)', r.body?.progress?.status === 'unlocked');
  check('xpEarned=0 (draft earns no XP)', r.body?.progress?.xpEarned === 0);
  check('updatedAt is set', !!r.body?.progress?.updatedAt);

  // Update the draft
  await new Promise((resolve) => setTimeout(resolve, 1100)); // ensure updatedAt advances
  const draftV2 = `# ${NAME}'s second attempt\ndef greet():\n    print("Welcome.")\n`;
  r = await proxy('PATCH', `/api/progress/${unlocked.moduleId}/draft`, {
    token,
    body: { codeSubmission: draftV2 },
  });
  check('Save draft v2 → 200', r.status === 200);
  check('New codeSubmission saved', r.body?.progress?.codeSubmission === draftV2);

  GROUP('Round-trip: GET echoes the latest draft');
  r = await proxy('GET', `/api/module/${unlocked.moduleId}`, { token });
  check('GET shows draft v2', r.body?.progress?.codeSubmission === draftV2);
  check('GET status still unlocked', r.body?.progress?.status === 'unlocked');

  GROUP('Edge cases through proxy');
  r = await proxy('PATCH', `/api/progress/${locked.moduleId}/draft`, {
    token,
    body: { codeSubmission: 'x' },
  });
  check('Locked-module draft → 403', r.status === 403);

  r = await proxy('PATCH', `/api/progress/${unlocked.moduleId}/draft`, {
    token,
    body: { codeSubmission: 123 },
  });
  check('Non-string body → 400', r.status === 400);

  r = await proxy('GET', `/api/module/${unlocked.moduleId}`, { /* no token */ });
  check('GET /api/module/:id without token → 401', r.status === 401);

  // Cleanup
  await mongoose.connect(process.env.MONGO_URI);
  const u = await User.findOne({ email: EMAIL });
  if (u) {
    await UserProgress.deleteMany({ userId: u._id });
    await User.deleteOne({ _id: u._id });
  }
  await mongoose.disconnect();

  console.log(`\n━━━ Summary: ✅${pass} passed, ❌${fail} failed ━━━`);
  if (fail > 0) process.exitCode = 1;
})();