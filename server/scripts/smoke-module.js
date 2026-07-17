/**
 * Smoke test for /api/module/:id and PATCH /api/progress/:moduleId/draft.
 *
 *   - GET locked module for the user → 403
 *   - GET unlocked module → 200 with story containing user's name (no {learner})
 *   - GET bogus id → 404
 *   - PATCH draft → 200; GET shows updated codeSubmission + updatedAt
 *   - PATCH draft on a locked module → 403
 *   - PATCH draft with bad body → 400
 *   - unauthenticated → 401
 */
const http = require('http');
const mongoose = require('mongoose');
require('dotenv').config();
const { User, UserProgress, Module } = require('../models');

const HOST = '127.0.0.1';
const PORT = 5000;
const NAME = 'Module Smoke';
const EMAIL = `modsmoke+${Date.now()}@example.com`;
const PASSWORD = 'correc�aple';

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
const GROUP = (l) => console.log(`\n▶ ${l}`);
function check(label, cond, detail = '') {
  if (cond) { console.log(`  ✅ ${label}${detail ? ' — ' + detail : ''}`); pass++; }
  else      { console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`); fail++; }
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  // Setup
  let signup = await request('POST', '/api/auth/signup', { body: { email: EMAIL, name: NAME, password: PASSWORD } });
  check('Signup → 201', signup.status === 201, `status=${signup.status}`);
  const token = signup.body.token;
  const userId = signup.body.user.id;

  // Grab all 3 paths × 3 modules so we can pick unlocked vs locked
  const progress = await request('GET', '/api/progress', { token });
  const all = progress.body.paths.flatMap((p) => p.modules);
  const unlockedModule = all.find((m) => m.status === 'unlocked');
  const lockedModule = all.find((m) => m.status === 'locked');
  check('Setup: found an unlocked module', !!unlockedModule);
  check('Setup: found a locked module', !!lockedModule);

  GROUP('GET /api/module/:id');
  let r = await request('GET', `/api/module/${unlockedModule.moduleId}`, { token });
  check('Unlocked module → 200', r.status === 200, `status=${r.status}`);
  check('Response has module.name', r.body?.module?.name === unlockedModule.name);
  check(
    'Story contains the user name (substituted from {learner})',
    typeof r.body?.module?.story === 'string' &&
      r.body.module.story.includes(NAME) &&
      !r.body.module.story.includes('{learner}'),
    `len=${r.body?.module?.story?.length}`
  );
  check(
    'All four content fields are populated and {learner}-free',
    ['story', 'whyPairing', 'practicalTask', 'reflectionPrompt']
      .every((k) => typeof r.body?.module?.[k] === 'string' &&
                   r.body.module[k].length > 0 &&
                   !r.body.module[k].includes('{learner}'))
  );
  check(
    'Response carries path info',
    r.body?.path?.name && r.body.path.order === 1 ||
      r.body?.path?.order === 2 || r.body?.path?.order === 3
  );
  check(
    'Response carries the user\'s progress for this module',
    r.body?.progress?.status === 'unlocked' &&
      typeof r.body.progress.codeSubmission === 'string'
  );

  r = await request('GET', `/api/module/${lockedModule.moduleId}`, { token });
  check('Locked module → 403', r.status === 403, `status=${r.status}, body=${JSON.stringify(r.body)}`);
  check('403 body has a clear error', r.body?.error?.toLowerCase().includes('locked'));

  r = await request('GET', '/api/module/000000000000000000000000', { token });
  check('Bogus module id → 404', r.status === 404);

  r = await request('GET', `/api/module/${unlockedModule.moduleId}`, { /* no token */ });
  check('No token → 401', r.status === 401);

  GROUP('PATCH /api/progress/:moduleId/draft');
  const draft = "def hello(name):\n    return f'Hello, {name}!'\n";
  r = await request('PATCH', `/api/progress/${unlockedModule.moduleId}/draft`, {
    token,
    body: { codeSubmission: draft },
  });
  check('Save draft → 200', r.status === 200, `status=${r.status}`);
  check(
    'Response echoes codeSubmission',
    r.body?.progress?.codeSubmission === draft
  );
  check('Response has updatedAt', !!r.body?.progress?.updatedAt);
  check(
    'Module is still NOT marked completed by draft save',
    r.body?.progress?.status === 'unlocked',
    `status=${r.body?.progress?.status}`
  );
  check(
    'XP is still 0 (draft doesn\'t earn XP)',
    r.body?.progress?.xpEarned === 0
  );

  // Confirm via direct DB read
  const fresh = await UserProgress.findOne({ userId, moduleId: unlockedModule.moduleId }).lean();
  check('DB row has the saved draft', fresh?.codeSubmission === draft);
  check('DB row is still status=unlocked', fresh?.status === 'unlocked');
  check('DB row has updatedAt populated', !!fresh?.updatedAt);

  // Re-fetch via GET to confirm round-trip
  r = await request('GET', `/api/module/${unlockedModule.moduleId}`, { token });
  check('After save, GET /api/module/:id echoes the draft', r.body?.progress?.codeSubmission === draft);

  GROUP('PATCH error cases');
  r = await request('PATCH', `/api/progress/${lockedModule.moduleId}/draft`, {
    token,
    body: { codeSubmission: 'no thanks' },
  });
  check('Draft on locked module → 403', r.status === 403);

  r = await request('PATCH', `/api/progress/${unlockedModule.moduleId}/draft`, {
    token,
    body: { codeSubmission: 12345 }, // wrong type
  });
  check('Non-string codeSubmission → 400', r.status === 400);

  r = await request('PATCH', `/api/progress/${unlockedModule.moduleId}/draft`, {
    token,
    body: {}, // missing field
  });
  check('Missing codeSubmission → 400', r.status === 400);

  r = await request('PATCH', '/api/progress/not-a-real-id/draft', {
    token,
    body: { codeSubmission: 'x' },
  });
  check('Malformed moduleId → 404', r.status === 404);

  r = await request('PATCH', `/api/progress/${unlockedModule.moduleId}/draft`, {
    /* no token */
    body: { codeSubmission: 'x' },
  });
  check('No token → 401', r.status === 401);

  // Cleanup
  await UserProgress.deleteMany({ userId });
  await User.deleteOne({ _id: userId });
  await mongoose.disconnect();

  console.log(`\n━━━ Summary: ✅${pass} passed, ❌${fail} failed ━━━`);
  if (fail > 0) process.exitCode = 1;
})();
