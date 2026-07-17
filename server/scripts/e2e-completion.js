/**
 * End-to-end test for the completion flow through the Vite proxy.
 *
 *   browser :5173 → :5000 proxy → :5000 server → :27017 MongoDB
 *
 * Walks the full flow: signup → getModule → saveReflection → submitQuiz →
 * verify completion propagates to the next module + verifies XP (15 per
 * module) is awarded to User.xp and visible via /api/user/summary.
 */
const http = require('http');
const mongoose = require('mongoose');
require('dotenv').config();
const { User, UserProgress } = require('../models');

const PROXY = '127.0.0.1';
const PROXY_PORT = 5173;
const NAME = 'E2E Completion User';
const EMAIL = `e2ecomp+${Date.now()}@example.com`;
const PASSWORD = 'correctpw12';

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
  GROUP('Setup: signup + locate modules through the proxy');
  let r = await proxy('POST', '/api/auth/signup', { body: { email: EMAIL, name: NAME, password: PASSWORD } });
  check('Signup → 201', r.status === 201, `status=${r.status}`);
  const token = r.body.token;
  const userId = r.body.user.id;

  r = await proxy('GET', '/api/progress', { token });
  const foundations = r.body.paths.find((p) => p.name === 'Foundations');
  const m1 = foundations.modules.find((m) => m.order === 1);
  const m2 = foundations.modules.find((m) => m.order === 2);
  const m3 = foundations.modules.find((m) => m.order === 3);
  check('m1 unlocked', m1.status === 'unlocked');
  check('m2 locked', m2.status === 'locked');
  check('m3 locked', m3.status === 'locked');

  // Pull quizAnswers straight from the DB — /api/module/:id deliberately
  // hides the answer so the client can't spoil the quiz.
  await mongoose.connect(process.env.MONGO_URI);
  const ModuleModel = require('../models').Module;
  const m1Doc = await ModuleModel.findOne({ _id: m1.moduleId }).lean();
  const m2Doc = await ModuleModel.findOne({ _id: m2.moduleId }).lean();
  const m3Doc = await ModuleModel.findOne({ _id: m3.moduleId }).lean();
  const m1QuizAnswer = m1Doc.quizAnswer;
  const m2QuizAnswer = m2Doc.quizAnswer;
  const m3QuizAnswer = m3Doc.quizAnswer;
  check('Pulled all 3 quizAnswers from DB', !!m1QuizAnswer && !!m2QuizAnswer && !!m3QuizAnswer);

  GROUP('Initial summary: totalXP=0, completedCount=0, total=9');
  r = await proxy('GET', '/api/user/summary', { token });
  check('→ 200', r.status === 200);
  check('totalXP=0', r.body?.totalXP === 0);
  check('completedCount=0', r.body?.completedCount === 0);
  check('total=9', r.body?.total === 9);
  check('user.name echoes signup', r.body?.user?.name === NAME);

  GROUP('Step 1: reflection alone → no completion, no XP');
  r = await proxy('PATCH', `/api/progress/${m1.moduleId}/reflection`, {
    token,
    body: { reflectionText: 'A variable is two names for one thing.' },
  });
  check('→ 200', r.status === 200, `status=${r.status}`);
  check('progress.reflectionText saved', r.body?.progress?.reflectionText?.length > 0);
  check('completed=false', r.body?.completed === false);
  check('unlockedNext=null', r.body?.unlockedNext === null);

  r = await proxy('GET', '/api/user/summary', { token });
  check('totalXP still 0 after reflection alone', r.body?.totalXP === 0);

  GROUP('Step 2: wrong quiz answer');
  r = await proxy('POST', `/api/progress/${m1.moduleId}/quiz`, {
    token,
    body: { answer: 'definitely wrong' },
  });
  check('→ 200', r.status === 200);
  check('correct=false', r.body?.correct === false);
  check('quizPassed=false', r.body?.progress?.quizPassed === false);
  check('completed=false', r.body?.completed === false);

  r = await proxy('GET', '/api/user/summary', { token });
  check('totalXP still 0 after wrong quiz', r.body?.totalXP === 0);

  GROUP('Step 3: correct quiz answer → completion + 15 XP');
  r = await proxy('POST', `/api/progress/${m1.moduleId}/quiz`, {
    token,
    body: { answer: m1QuizAnswer },
  });
  check('→ 200', r.status === 200);
  check('correct=true', r.body?.correct === true);
  check('quizPassed=true', r.body?.progress?.quizPassed === true);
  check('completed=true', r.body?.completed === true);
  check('status=completed', r.body?.progress?.status === 'completed');
  check('xpEarned=15', r.body?.progress?.xpEarned === 15, `xpEarned=${r.body?.progress?.xpEarned}`);
  check(
    'unlockedNext = m2 (Conditionals) in Foundations',
    r.body?.unlockedNext?.name === m2.name &&
      r.body?.unlockedNext?.order === 2 &&
      r.body?.unlockedNext?.pathName === 'Foundations'
  );

  r = await proxy('GET', '/api/user/summary', { token });
  check('totalXP=15 after first completion', r.body?.totalXP === 15);
  check('completedCount=1', r.body?.completedCount === 1);

  GROUP('Step 4: progress endpoint reflects the unlock');
  r = await proxy('GET', '/api/progress', { token });
  const foundAfter = r.body.paths.find((p) => p.name === 'Foundations');
  const m1After = foundAfter.modules.find((m) => m.order === 1);
  const m2After = foundAfter.modules.find((m) => m.order === 2);
  const m3After = foundAfter.modules.find((m) => m.order === 3);
  check('m1 dashboard status=completed', m1After.status === 'completed');
  check('m1 dashboard xpEarned=15', m1After.xpEarned === 15);
  check('m1 dashboard quizPassed=true', m1After.quizPassed === true);
  check('m2 dashboard status=unlocked', m2After.status === 'unlocked');
  check('m3 dashboard status=locked', m3After.status === 'locked');

  GROUP('Step 5: complete m2 → m3 unlocks, XP=30');
  await proxy('PATCH', `/api/progress/${m2.moduleId}/reflection`, {
    token,
    body: { reflectionText: 'Binary thinking is mostly a habit.' },
  });
  r = await proxy('POST', `/api/progress/${m2.moduleId}/quiz`, {
    token,
    body: { answer: m2QuizAnswer },
  });
  check('m2 completed=true', r.body?.completed === true);
  check('m2 xpEarned=15', r.body?.progress?.xpEarned === 15);
  check('m2 unlockedNext = m3', r.body?.unlockedNext?.name === m3.name);

  r = await proxy('GET', '/api/user/summary', { token });
  check('totalXP=30 after two completions', r.body?.totalXP === 30);
  check('completedCount=2', r.body?.completedCount === 2);

  GROUP('Step 6: complete LAST module (m3) → unlockedNext=null, XP=45');
  await proxy('PATCH', `/api/progress/${m3.moduleId}/reflection`, {
    token,
    body: { reflectionText: 'A loop is just a function that calls itself with a smaller argument.' },
  });
  r = await proxy('POST', `/api/progress/${m3.moduleId}/quiz`, {
    token,
    body: { answer: m3QuizAnswer },
  });
  check('m3 completed=true', r.body?.completed === true);
  check('m3 xpEarned=15', r.body?.progress?.xpEarned === 15);
  check('m3 unlockedNext=null (end of path)', r.body?.unlockedNext === null);

  r = await proxy('GET', '/api/user/summary', { token });
  check('totalXP=45 after Foundations complete', r.body?.totalXP === 45);
  check('completedCount=3', r.body?.completedCount === 3);
  check('total still 9', r.body?.total === 9);

  GROUP('Step 7: User.xp in DB matches summary totalXP');
  const userFromDb = await User.findById(userId).lean();
  check('User.xp in DB = 45', userFromDb.xp === 45, `User.xp=${userFromDb.xp}`);
  check(
    'Summary totalXP matches User.xp exactly',
    r.body?.totalXP === userFromDb.xp
  );

  GROUP('Step 8: dashboard-derived XP agrees with summary');
  r = await proxy('GET', '/api/progress', { token });
  const finalFoundations = r.body.paths.find((p) => p.name === 'Foundations');
  const completedCount = finalFoundations.modules.filter((m) => m.status === 'completed').length;
  const xpSum = finalFoundations.modules.reduce((s, m) => s + (m.xpEarned || 0), 0);
  check('Foundations has 3/3 completed', completedCount === 3, `count=${completedCount}`);
  check(
    'Sum of per-module xpEarned = 45',
    xpSum === 45,
    `xp=${xpSum}`
  );
  check(
    'Sum of per-module xp matches summary totalXP',
    xpSum === 45
  );

  GROUP('Step 9: error cases through proxy');
  r = await proxy('PATCH', `/api/progress/${m1.moduleId}/reflection`, {
    token,
    body: { reflectionText: 123 },
  });
  check('Non-string reflection → 400', r.status === 400);

  r = await proxy('POST', `/api/progress/${m1.moduleId}/quiz`, {
    token,
    body: { answer: ['array', 'of', 'answers'] },
  });
  check('Non-string quiz answer → 400', r.status === 400);

  r = await proxy('PATCH', `/api/progress/${m1.moduleId}/reflection`, {
    /* no token */
    body: { reflectionText: 'x' },
  });
  check('Reflection without token → 401', r.status === 401);

  r = await proxy('POST', `/api/progress/${m1.moduleId}/quiz`, {
    /* no token */
    body: { answer: 'x' },
  });
  check('Quiz without token → 401', r.status === 401);

  r = await proxy('GET', '/api/user/summary');
  check('Summary without token → 401', r.status === 401);

  // Cleanup
  await UserProgress.deleteMany({ userId });
  await User.deleteOne({ _id: userId });
  await mongoose.disconnect();

  console.log(`\n━━━ Summary: ✅${pass} passed, ❌${fail} failed ━━━`);
  if (fail > 0) process.exitCode = 1;
})();