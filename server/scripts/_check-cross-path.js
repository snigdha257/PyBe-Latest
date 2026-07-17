/**
 * Cross-path isolation spot-check.
 *
 * Completes all 3 modules in Foundations and confirms Structures + Design
 * were not touched. Pure /api/progress checks; pulls quizAnswer from DB.
 */
const http = require('http');
const mongoose = require('mongoose');
require('dotenv').config();
const { User, UserProgress, Module: ModuleModel } = require('../models');

const PORT = 5000;
const NAME = 'Cross-Path Probe';
const EMAIL = `xpath+${Date.now()}@example.com`;
const PASSWORD = 'correctpw12';
const myLog = (...a) => console.log(...a);

function rq(method, path, { body, token } = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      { host: '127.0.0.1', port: PORT, method, path,
        headers: { 'Content-Type': 'application/json',
                   'Content-Length': data ? Buffer.byteLength(data) : 0,
                   ...(token ? { Authorization: `Bearer ${token}` } : {}) } },
      (res) => {
        let chunks = ''; res.on('data', (c) => chunks += c);
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

let pass = 0, fail = 0;
const GROUP = (l) => myLog(`\n\u25b6 ${l}`);
function check(label, cond, detail = '') {
  if (cond) { myLog(`  \u2705 ${label}${detail ? ' \u2014 ' + detail : ''}`); pass++; }
  else      { myLog(`  \u274c ${label}${detail ? ' \u2014 ' + detail : ''}`); fail++; }
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  let r = await rq('POST', '/api/auth/signup', { body: { email: EMAIL, name: NAME, password: PASSWORD } });
  check('Signup \u2192 201', r.status === 201, `status=${r.status}`);
  const token = r.body.token;
  const userId = r.body.user.id;

  r = await rq('GET', '/api/progress', { token });
  const paths = r.body.paths;
  const foundations = paths.find((p) => p.name === 'Foundations');
  const structures = paths.find((p) => p.name === 'Structures');
  const design = paths.find((p) => p.name === 'Design');

  GROUP('Snapshot before any completion');
  check('Structures: 1 unlocked, 2 locked',
    structures.modules.find((m) => m.order === 1).status === 'unlocked' &&
    structures.modules.find((m) => m.order === 2).status === 'locked' &&
    structures.modules.find((m) => m.order === 3).status === 'locked');
  check('Design: 1 unlocked, 2 locked',
    design.modules.find((m) => m.order === 1).status === 'unlocked' &&
    design.modules.find((m) => m.order === 2).status === 'locked' &&
    design.modules.find((m) => m.order === 3).status === 'locked');

  GROUP('Complete all 3 Foundations modules');
  const fps = foundations.modules.sort((a, b) => a.order - b.order);
  for (const fm of fps) {
    const doc = await ModuleModel.findOne({ _id: fm.moduleId }).lean();
    await rq('PATCH', `/api/progress/${fm.moduleId}/reflection`, {
      token, body: { reflectionText: `Reflection for Foundations.${fm.order}.` },
    });
    await rq('POST', `/api/progress/${fm.moduleId}/quiz`, {
      token, body: { answer: doc.quizAnswer },
    });
  }
  myLog('  (3 Foundations modules submitted)');

  GROUP('After completing Foundations, Structures + Design must be untouched');
  r = await rq('GET', '/api/progress', { token });
  const structsAfter = r.body.paths.find((p) => p.name === 'Structures');
  const designAfter = r.body.paths.find((p) => p.name === 'Design');
  const foundAfter = r.body.paths.find((p) => p.name === 'Foundations');

  check('Foundations: 3/3 completed', foundAfter.modules.every((m) => m.status === 'completed'));
  check('Foundations XP total = 45 (3 modules × 15)', foundAfter.modules.reduce((s, m) => s + m.xpEarned, 0) === 45);

  // Structures should be untouched: only the seeded unlock pattern
  const s1 = structsAfter.modules.find((m) => m.order === 1);
  const s2 = structsAfter.modules.find((m) => m.order === 2);
  const s3 = structsAfter.modules.find((m) => m.order === 3);
  check('Structures.1 still unlocked (seeded)',
    s1.status === 'unlocked' && s1.xpEarned === 0 && s1.quizPassed === false,
    `status=${s1.status} xp=${s1.xpEarned} passed=${s1.quizPassed}`);
  check('Structures.2 still locked',
    s2.status === 'locked' && s2.xpEarned === 0,
    `status=${s2.status} xp=${s2.xpEarned}`);
  check('Structures.3 still locked',
    s3.status === 'locked' && s3.xpEarned === 0,
    `status=${s3.status} xp=${s3.xpEarned}`);
  check('Structures total XP = 0',
    structsAfter.modules.reduce((s, m) => s + m.xpEarned, 0) === 0);

  const d1 = designAfter.modules.find((m) => m.order === 1);
  const d2 = designAfter.modules.find((m) => m.order === 2);
  const d3 = designAfter.modules.find((m) => m.order === 3);
  check('Design.1 still unlocked (seeded)',
    d1.status === 'unlocked' && d1.xpEarned === 0 && d1.quizPassed === false,
    `status=${d1.status} xp=${d1.xpEarned} passed=${d1.quizPassed}`);
  check('Design.2 still locked',
    d2.status === 'locked' && d2.xpEarned === 0,
    `status=${d2.status} xp=${d2.xpEarned}`);
  check('Design.3 still locked',
    d3.status === 'locked' && d3.xpEarned === 0,
    `status=${d3.status} xp=${d3.xpEarned}`);
  check('Design total XP = 0',
    designAfter.modules.reduce((s, m) => s + m.xpEarned, 0) === 0);

  // Also confirm User.xp is exactly 45 (one path) and summary echoes it.
  const UserModel = require('../models').User;
  const userInDb = await UserModel.findById(userId).lean();
  check('User.xp in DB = 45 (only Foundations done)',
    userInDb.xp === 45, `User.xp=${userInDb.xp}`);

  r = await rq('GET', '/api/user/summary', { token });
  check('summary totalXP = 45', r.body?.totalXP === 45);
  check('summary completedCount = 3', r.body?.completedCount === 3);

  GROUP('No Structures/Design unlocks leaked');
  const sideEffects = await UserProgress.find({
    userId, status: 'unlocked', completed: { $ne: true },
  }).populate('moduleId').lean();
  const structuresUnlockedM2 = sideEffects.filter((s) =>
    String(s.moduleId?.pathId) === String(structsAfter.pathId)
    && s.moduleId?.order === 2);
  const designUnlockedM2 = sideEffects.filter((s) =>
    String(s.moduleId?.pathId) === String(designAfter.pathId)
    && s.moduleId?.order === 2);
  check('No Structures.2 unlock leaked',
    structuresUnlockedM2.length === 0,
    `count=${structuresUnlockedM2.length}`);
  check('No Design.2 unlock leaked',
    designUnlockedM2.length === 0,
    `count=${designUnlockedM2.length}`);

  await UserProgress.deleteMany({ userId });
  await User.deleteOne({ _id: userId });
  await mongoose.disconnect();

  console.log(`\n\u2501\u2501\u2501 Summary: \u2705${pass} passed, \u274c${fail} failed \u2501\u2501\u2501`);
  if (fail > 0) process.exitCode = 1;
})();
