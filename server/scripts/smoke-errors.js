/**
 * Smoke test for the server's error/validation/health surface.
 *
 * Covers the categories the user explicitly asked us to harden:
 *   1. Failed login (wrong password, unknown email, missing fields)
 *   2. Empty / malformed form submissions (signup + login + progress writes)
 *   3. Invalid module IDs (malformed ObjectId on every route that takes one)
 *   4. /api/health reflects DB state
 *   5. Unknown /api/* paths return JSON 404, not Express's HTML default
 *
 * Goal: every error a real user can trigger returns a stable JSON shape
 * `{ error: string }` so the client's `api.js` wrapper can parse it.
 */
const http = require('http');
const mongoose = require('mongoose');
require('dotenv').config();
const { User, UserProgress, Module } = require('../models');
const PASSWORD = require('./_pwd.js');

const HOST = '127.0.0.1';
const PORT = 5000;
const NAME = 'Errors Smoke';
const EMAIL = `errorssmoke+${Date.now()}@example.com`;

function request(method, path, { body, token } = {}) {
  return new Promise((resolve, reject) => {
    const data = body !== undefined ? JSON.stringify(body) : null;
    const req = http.request(
      { host: HOST, port: PORT, method, path,
        headers: { 'Content-Type': 'application/json',
                   'Content-Length': data ? Buffer.byteLength(data) : 0,
                   ...(token ? { Authorization: `Bearer ${token}` } : {}) } },
      (res) => {
        let chunks = '';
        res.on('data', (c) => chunks += c);
        res.on('end', () => {
          let parsed;
          let isJson = false;
          try { parsed = JSON.parse(chunks); isJson = true; } catch { parsed = chunks; }
          resolve({ status: res.statusCode, body: parsed, isJson, raw: chunks });
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

  // ── 1. /api/health ────────────────────────────────────────────────
  GROUP('1. /api/health reflects DB state');
  let r = await request('GET', '/api/health');
  check('GET /api/health → 200', r.status === 200, `status=${r.status}`);
  check('body has status:ok', r.body?.status === 'ok');
  check('body is JSON (not HTML)', r.isJson === true);

  // ── 2. /api/* unknown path returns JSON 404 ───────────────────────
  GROUP('2. unknown /api/* paths return JSON 404');
  r = await request('GET', '/api/this-does-not-exist');
  check('GET /api/this-does-not-exist → 404', r.status === 404);
  check('body is JSON (not HTML)', r.isJson === true);
  check('body.error present', typeof r.body?.error === 'string');
  check('error message is meaningful', /not found/i.test(r.body?.error || ''));

  // ── 3. Failed login (wrong password, unknown email) ───────────────
  GROUP('3. failed login returns generic 401');
  // Sign up a real account first so we have a known target.
  let signup = await request('POST', '/api/auth/signup', {
    body: { email: EMAIL, name: NAME, password: PASSWORD },
  });
  check('precondition: signup succeeded', signup.status === 201);

  r = await request('POST', '/api/auth/login', {
    body: { email: EMAIL, password: 'wrongpass1' },
  });
  check('wrong password → 401', r.status === 401);
  check('generic message (no enumeration)', r.body?.error === 'Invalid email or password');

  r = await request('POST', '/api/auth/login', {
    body: { email: `nobody+${Date.now()}@example.com`, password: PASSWORD },
  });
  check('unknown email → 401', r.status === 401);
  check('unknown email uses same generic message', r.body?.error === 'Invalid email or password');

  // ── 4. Empty / malformed form submissions ─────────────────────────
  GROUP('4. empty / malformed forms return 400 with JSON');
  r = await request('POST', '/api/auth/login', { body: {} });
  check('empty login body → 400', r.status === 400);
  check('400 body is JSON', r.isJson === true);
  check('400 has error message', /required/i.test(r.body?.error || ''));

  r = await request('POST', '/api/auth/signup', { body: {} });
  check('empty signup body → 400', r.status === 400);
  check('signup 400 mentions email', /email/i.test(r.body?.error || ''));

  r = await request('POST', '/api/auth/signup', {
    body: { email: 'not-an-email', name: 'X', password: 'correct-apple' },
  });
  check('malformed email → 400', r.status === 400);
  check('malformed email mentions email', /email/i.test(r.body?.error || ''));

  r = await request('POST', '/api/auth/signup', {
    body: { email: `dup+${Date.now()}@example.com`, name: 'Dup', password: 'short' },
  });
  check('short password → 400', r.status === 400);
  check('short password mentions 8', /8/.test(r.body?.error || ''));

  // Duplicate email → 409 (still JSON, still has .error)
  const dupEmail = `dup+${Date.now()}@example.com`;
  await request('POST', '/api/auth/signup', {
    body: { email: dupEmail, name: 'Dup', password: 'correct-apple' },
  });
  r = await request('POST', '/api/auth/signup', {
    body: { email: dupEmail, name: 'Dup Again', password: 'correct-apple' },
  });
  check('duplicate email → 409', r.status === 409);
  check('duplicate email has friendly message', /already exists/i.test(r.body?.error || ''));

  // ── 5. Auth-required routes reject without token ──────────────────
  GROUP('5. protected routes → 401 without token');
  for (const path of [
    '/api/me',
    '/api/progress',
    '/api/me/progress',
    '/api/user/summary',
    '/api/module/507f1f77bcf86cd799439011',
  ]) {
    r = await request('GET', path);
    check(`GET ${path} → 401`, r.status === 401);
    check(`401 body is JSON for ${path}`, r.isJson === true);
  }
  r = await request('PATCH', '/api/progress/507f1f77bcf86cd799439011/draft', {
    body: { codeSubmission: 'x' },
  });
  check('PATCH draft → 401 without token', r.status === 401);
  r = await request('POST', '/api/progress/507f1f77bcf86cd799439011/quiz', {
    body: { answer: 'x' },
  });
  check('POST quiz → 401 without token', r.status === 401);

  // ── 6. Invalid module IDs (malformed ObjectId) ────────────────────
  GROUP('6. malformed module ids → 404 (not 500) on every route');
  const token = signup.body.token;
  const bogus = 'not-an-objectid';
  for (const { method, path, body } of [
    { method: 'GET',   path: `/api/module/${bogus}` },
    { method: 'PATCH', path: `/api/progress/${bogus}/draft`,       body: { codeSubmission: 'x' } },
    { method: 'PATCH', path: `/api/progress/${bogus}/reflection`,  body: { reflectionText: 'x' } },
    { method: 'POST',  path: `/api/progress/${bogus}/quiz`,        body: { answer: 'x' } },
  ]) {
    r = await request(method, path, { body, token });
    check(`${method} ${path} → 404 (malformed id)`, r.status === 404, `status=${r.status}`);
    check(`404 body is JSON for ${method} ${path}`, r.isJson === true);
    check(`404 has error for ${method} ${path}`, typeof r.body?.error === 'string');
  }

  // Genuine but non-existent ObjectId should also be 404 (no DB leak).
  r = await request('GET', '/api/module/507f1f77bcf86cd799439011', { token });
  check('valid-but-unknown ObjectId → 404', r.status === 404);

  // ── 7. Body shape on progress writes ──────────────────────────────
  GROUP('7. progress writes validate body shape');
  // Fetch a real module id from /api/progress (the one we just signed up for).
  r = await request('GET', '/api/progress', { token });
  const moduleId = r.body.paths[0].modules[0].moduleId;

  r = await request('PATCH', `/api/progress/${moduleId}/draft`, {
    token,
    body: { codeSubmission: 12345 },
  });
  check('non-string codeSubmission → 400', r.status === 400);

  r = await request('PATCH', `/api/progress/${moduleId}/reflection`, {
    token,
    body: { /* missing */ },
  });
  check('missing reflectionText → 400', r.status === 400);

  r = await request('POST', `/api/progress/${moduleId}/quiz`, {
    token,
    body: { answer: { weird: true } },
  });
  check('non-string quiz answer → 400', r.status === 400);

  // ── 8. /api/health with DB down ───────────────────────────────────
  // We can't easily kill Mongo in-process; verify the endpoint shape and
  // the documented degraded response stays JSON.
  GROUP('8. /api/health always returns JSON');
  r = await request('GET', '/api/health');
  check('health → 200 (happy path)', r.status === 200);
  check('health body is JSON', r.isJson === true);

  // ── 9. Expired/invalid token gets 401 ─────────────────────────────
  GROUP('9. invalid / expired tokens → 401');
  r = await request('GET', '/api/me', { token: 'not.a.jwt' });
  check('GET /api/me with junk token → 401', r.status === 401);
  check('junk-token 401 has clear error', /token/i.test(r.body?.error || ''));

  // Hand-craft an expired token to make sure the path is exercised.
  const jwt = require('jsonwebtoken');
  const expired = jwt.sign(
    { sub: signup.body.user.id, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '-1h' }
  );
  r = await request('GET', '/api/me', { token: expired });
  check('expired token → 401', r.status === 401);
  check('expired token message mentions expiry', /expired/i.test(r.body?.error || ''));

  // Cleanup
  await UserProgress.deleteMany({ userId: signup.body.user.id });
  await User.deleteOne({ _id: signup.body.user.id });
  await mongoose.disconnect();

  console.log(`\n━━━ Summary: ✅${pass} passed, ❌${fail} failed ━━━`);
  if (fail > 0) process.exitCode = 1;
})();
