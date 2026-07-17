/**
 * Smoke test for /reflection + /quiz + completion flow.
 *
 * Validates the entire spec:
 *   - patch reflection saves reflectionText (no completion on its own)
 *   - post wrong quiz answer → correct:false, quizPassed:false, no completion
 *   - post correct quiz → correct:true, quizPassed:true, completion fires
 *   - progress.xpEarned bumps by 15 (10 for quiz + 5 for reflection)
 *   - User.xp bumps by 15 on each completion
 *   - /api/user/summary reflects the latest XP and completedCount
 *   - next module in same path is unlocked; further modules stay locked
 *   - completing the LAST module in a path returns unlockedNext: null
 *   - completion is sticky (re-completing doesn't re-fire / no double-XP)
 *   - quizPassed is sticky-once-true (correct answer doesn't go back to false)
 *   - reflection on locked module → 403
 *   - quiz on bogus id → 404
 *   - unauthenticated → 401
 */
const http = require('http');
const mongoose = require('mongoose');
require('dotenv').config();
const { User, UserProgress, Module } = require('../models');

const HOST = '127.0.0.1';
const PORT = 5000;
const NAME = 'Completion Smoke';
const EMAIL = `complsmoke+${Date.now()}@example.com`;
const PASSWORD = 'correctpw12';

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

  let signup = await request('POST', '/api/auth/signup', { body: { email: EMAIL, name: NAME, password: PASSWORD } });
  check('Signup → 201', signup.status === 201, `status=${signup.status}`);
  const token = signup.body.token;
  const userId = signup.body.user.id;

  // ── Initial summary state: nothing completed yet ──────────────────────
  GROUP('Initial /api/user/summary (fresh account)');
  let sum = await request('GET', '/api/user/summary', { token });
  check('→ 200', sum.status === 200);
  check('totalXP=0 (fresh account)', sum.body?.totalXP === 0, `totalXP=${sum.body?.totalXP}`);
  check('completedCount=0', sum.body?.completedCount === 0);
  check('total=9 (curriculum size)', sum.body?.total === 9);
  check('user.name echoes signup', sum.body?.user?.name === NAME);

  // Pull the seed snapshot
  const prog = await request('GET', '/api/progress', { token });
  const foundations = prog.body.paths.find((p) => p.name === 'Foundations');
  const module1 = foundations.modules.find((m) => m.order === 1); // unlocked, "Variables"
  const module2 = foundations.modules.find((m) => m.order === 2); // locked,  "Conditionals"
  const module3 = foundations.modules.find((m) => m.order === 3); // locked,  "Loops"
  const module1Doc = await Module.findOne({ pathId: foundations.pathId, order: 1 }).lean();
  const module2Doc = await Module.findOne({ pathId: foundations.pathId, order: 2 }).lean();
  const module3Doc = await Module.findOne({ pathId: foundations.pathId, order: 3 }).lean();
  check('Setup: module1 unlocked', module1.status === 'unlocked');
  check('Setup: module2 locked', module2.status === 'locked');
  check('Setup: module3 locked', module3.status === 'locked');

  GROUP('Step 1: save reflection alone (no quiz yet) → no completion');
  const reflection = 'A variable is a name that has both a sense and a reference. Frege would approve.';
  let r = await request('PATCH', `/api/progress/${module1.moduleId}/reflection`, {
    token,
    body: { reflectionText: reflection },
  });
  check('Reflection → 200', r.status === 200, `status=${r.status}`);
  check(
    'progress.reflectionText saved',
    r.body?.progress?.reflectionText === reflection
  );
  check('completed=false (quiz hasn\'t passed yet)', r.body?.completed === false);
  check('alreadyCompleted=false', r.body?.alreadyCompleted === false);
  check('unlockedNext=null', r.body?.unlockedNext === null);
  check('progress.status still unlocked', r.body?.progress?.status === 'unlocked');

  // Reflection alone must NOT award XP
  sum = await request('GET', '/api/user/summary', { token });
  check(
    'Reflection alone: totalXP still 0',
    sum.body?.totalXP === 0,
    `totalXP=${sum.body?.totalXP}`
  );

  GROUP('Step 2: submit WRONG quiz answer → no completion, correct=false');
  r = await request('POST', `/api/progress/${module1.moduleId}/quiz`, {
    token,
    body: { answer: 'this is definitely not the right answer' },
  });
  check('Wrong quiz → 200', r.status === 200, `status=${r.status}`);
  check('correct=false', r.body?.correct === false);
  check('quizPassed=false', r.body?.progress?.quizPassed === false);
  check('completed=false', r.body?.completed === false);
  check('unlockedNext=null', r.body?.unlockedNext === null);

  // Wrong quiz alone also must NOT award XP
  sum = await request('GET', '/api/user/summary', { token });
  check(
    'Wrong quiz: totalXP still 0',
    sum.body?.totalXP === 0,
    `totalXP=${sum.body?.totalXP}`
  );

  GROUP('Step 3: submit CORRECT quiz answer → completion fires');
  const correctAnswer = module1Doc.quizAnswer;
  r = await request('POST', `/api/progress/${module1.moduleId}/quiz`, {
    token,
    body: { answer: correctAnswer },
  });
  check('Correct quiz → 200', r.status === 200, `status=${r.status}`);
  check('correct=true', r.body?.correct === true);
  check('quizPassed=true', r.body?.progress?.quizPassed === true);
  check('completed=true (this is the trigger)', r.body?.completed === true);
  check('progress.status=completed', r.body?.progress?.status === 'completed');
  check(
    'progress.xpEarned=15 (10 quiz + 5 reflection)',
    r.body?.progress?.xpEarned === 15,
    `xpEarned=${r.body?.progress?.xpEarned}`
  );
  check('completedAt is set', !!r.body?.progress?.completedAt);
  check(
    'unlockedNext = next module (Conditionals) in same path',
    r.body?.unlockedNext?.name === module2Doc.name &&
      r.body?.unlockedNext?.order === 2 &&
      r.body?.unlockedNext?.pathName === 'Foundations' &&
      r.body?.unlockedNext?.persisted === true,
    JSON.stringify(r.body?.unlockedNext)
  );

  GROUP('Step 3a: XP awarded to User.xp and visible via /summary');
  sum = await request('GET', '/api/user/summary', { token });
  check(
    'totalXP=15 after one completion',
    sum.body?.totalXP === 15,
    `totalXP=${sum.body?.totalXP}`
  );
  check('completedCount=1', sum.body?.completedCount === 1);

  GROUP('Step 4: DB state reflects unlock + XP');
  const fresh1 = await UserProgress.findOne({ userId, moduleId: module1.moduleId }).lean();
  const fresh2 = await UserProgress.findOne({ userId, moduleId: module2.moduleId }).lean();
  const fresh3 = await UserProgress.findOne({ userId, moduleId: module3.moduleId }).lean();
  const userAfterM1 = await User.findById(userId).lean();
  check('module1 → status=completed', fresh1.status === 'completed');
  check('module1 → xpEarned=15', fresh1.xpEarned === 15);
  check('module1 → completedAt set', !!fresh1.completedAt);
  check('module2 → status=unlocked', fresh2.status === 'unlocked');
  check('module3 → status=locked', fresh3.status === 'locked');
  check('User.xp=15', userAfterM1.xp === 15, `User.xp=${userAfterM1.xp}`);

  GROUP('Step 5: complete module 2 — XP bumps to 30');
  r = await request('PATCH', `/api/progress/${module2.moduleId}/reflection`, {
    token,
    body: { reflectionText: 'Binary decisions leave little room for ambiguity.' },
  });
  r = await request('POST', `/api/progress/${module2.moduleId}/quiz`, {
    token,
    body: { answer: module2Doc.quizAnswer },
  });
  check('module2 correct=true', r.body?.correct === true);
  check('module2 completed=true', r.body?.completed === true);
  check('module2 progress.xpEarned=15', r.body?.progress?.xpEarned === 15);
  check(
    'module2 unlockedNext = Loops',
    r.body?.unlockedNext?.name === module3Doc.name
  );
  const fresh2b = await UserProgress.findOne({ userId, moduleId: module2.moduleId }).lean();
  const fresh3b = await UserProgress.findOne({ userId, moduleId: module3.moduleId }).lean();
  check('module2 status=completed', fresh2b.status === 'completed');
  check('module2 xpEarned=15', fresh2b.xpEarned === 15);
  check('module3 status=unlocked', fresh3b.status === 'unlocked');

  sum = await request('GET', '/api/user/summary', { token });
  check(
    'summary totalXP=30 after two completions',
    sum.body?.totalXP === 30,
    `totalXP=${sum.body?.totalXP}`
  );
  check('summary completedCount=2', sum.body?.completedCount === 2);

  GROUP('Step 6: complete LAST module in path → unlockedNext=null, XP=45');
  r = await request('PATCH', `/api/progress/${module3.moduleId}/reflection`, {
    token,
    body: { reflectionText: 'Zeno\'s paradox resolves only when the machine halts.' },
  });
  r = await request('POST', `/api/progress/${module3.moduleId}/quiz`, {
    token,
    body: { answer: module3Doc.quizAnswer },
  });
  check('module3 correct=true', r.body?.correct === true);
  check('module3 completed=true', r.body?.completed === true);
  check('module3 progress.xpEarned=15', r.body?.progress?.xpEarned === 15);
  check(
    'Last module: unlockedNext=null',
    r.body?.unlockedNext === null,
    JSON.stringify(r.body?.unlockedNext)
  );
  const fresh3c = await UserProgress.findOne({ userId, moduleId: module3.moduleId }).lean();
  check('module3 status=completed', fresh3c.status === 'completed');

  // Re-fetch so all three rows have the latest xpEarned.
  const freshFinal = await Promise.all([
    UserProgress.findOne({ userId, moduleId: module1.moduleId }).lean(),
    UserProgress.findOne({ userId, moduleId: module2.moduleId }).lean(),
    UserProgress.findOne({ userId, moduleId: module3.moduleId }).lean(),
  ]);
  check(
    'Foundations path modules all completed; per-module xp = 15 each',
    freshFinal.every((p) => p?.xpEarned === 15),
    `m1=${freshFinal[0]?.xpEarned} m2=${freshFinal[1]?.xpEarned} m3=${freshFinal[2]?.xpEarned}`
  );
  const userAfterPath = await User.findById(userId).lean();
  check(
    'User.xp=45 after completing Foundations path',
    userAfterPath.xp === 45,
    `User.xp=${userAfterPath.xp}`
  );

  sum = await request('GET', '/api/user/summary', { token });
  check(
    'summary totalXP=45 after completing Foundations',
    sum.body?.totalXP === 45,
    `totalXP=${sum.body?.totalXP}`
  );
  check('summary completedCount=3 (only Foundations done)', sum.body?.completedCount === 3);
  check('summary total=9 (curriculum never changes)', sum.body?.total === 9);

  GROUP('Step 7: completion is sticky — re-submit doesn\'t re-fire / no double-XP');
  sum = await request('GET', '/api/user/summary', { token });
  const xpBeforeReSubmit = sum.body?.totalXP;

  r = await request('PATCH', `/api/progress/${module1.moduleId}/reflection`, {
    token,
    body: { reflectionText: 'Edited after completion.' },
  });
  check('Reflection on completed module → 200', r.status === 200);
  check('completed=false', r.body?.completed === false);
  check('alreadyCompleted=true', r.body?.alreadyCompleted === true);
  check('unlockedNext=null (no re-fire)', r.body?.unlockedNext === null);

  r = await request('POST', `/api/progress/${module1.moduleId}/quiz`, {
    token,
    body: { answer: 'this answer would normally be wrong' },
  });
  check('Wrong answer on passed quiz → 200', r.status === 200);
  check('correct=false on this submission', r.body?.correct === false);
  check('quizPassed STAYS true (sticky-once-true)', r.body?.progress?.quizPassed === true);
  check('status stays completed', r.body?.progress?.status === 'completed');

  sum = await request('GET', '/api/user/summary', { token });
  check(
    'No double-XP: totalXP unchanged after re-submits',
    sum.body?.totalXP === xpBeforeReSubmit,
    `before=${xpBeforeReSubmit} after=${sum.body?.totalXP}`
  );

  GROUP('Step 8: error cases');
  // Get a still-locked module from a different path (Structures/2)
  const structures = prog.body.paths.find((p) => p.name === 'Structures');
  const stillLocked = structures.modules.find((m) => m.status === 'locked');
  r = await request('PATCH', `/api/progress/${stillLocked.moduleId}/reflection`, {
    token,
    body: { reflectionText: 'hi' },
  });
  check('Reflection on locked module → 403', r.status === 403);

  r = await request('POST', `/api/progress/${stillLocked.moduleId}/quiz`, {
    token,
    body: { answer: 'whatever' },
  });
  check('Quiz on locked module → 403', r.status === 403);

  r = await request('PATCH', `/api/progress/${module1.moduleId}/reflection`, {
    token,
    body: { /* reflectionText missing */ },
  });
  check('Reflection with no body → 400', r.status === 400);

  r = await request('POST', `/api/progress/${module1.moduleId}/quiz`, {
    token,
    body: { answer: 12345 },
  });
  check('Quiz with non-string answer → 400', r.status === 400);

  r = await request('PATCH', '/api/progress/not-an-objectid/reflection', {
    token,
    body: { reflectionText: 'x' },
  });
  check('Reflection malformed moduleId → 404', r.status === 404);

  r = await request('PATCH', `/api/progress/${module1.moduleId}/reflection`, {
    /* no token */
    body: { reflectionText: 'x' },
  });
  check('Reflection without token → 401', r.status === 401);

  r = await request('POST', `/api/progress/${module1.moduleId}/quiz`, {
    /* no token */
    body: { answer: 'x' },
  });
  check('Quiz without token → 401', r.status === 401);

  r = await request('GET', '/api/user/summary');
  check('Summary without token → 401', r.status === 401);

  // Cleanup
  await UserProgress.deleteMany({ userId });
  await User.deleteOne({ _id: userId });
  await mongoose.disconnect();

  console.log(`\n━━━ Summary: ✅${pass} passed, ❌${fail} failed ━━━`);
  if (fail > 0) process.exitCode = 1;
})();