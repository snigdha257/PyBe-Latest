/**
 * Acceptance harness for the dashboard trail UI.
 *
 * Maps to the four checks:
 *
 *   1. All 3 paths render with 3 nodes each (9 total) on a fresh account.
 *   2. Exactly one node per path is clickable; the other two are visibly locked.
 *   3. Clicking an unlocked node navigates to a module route (404 OK for now).
 *   4. Resize the browser narrow — SVG paths don't overflow or break layout.
 *
 * Checks 1 and 2 use the real /api/progress endpoint through the Vite proxy.
 * Checks 3 and 4 mix live HTTP probes (does the route exist? does the SPA
 * shell render?) with source-file assertions (the actual logic the client
 * ships). Source assertions read files from disk so they're not fooled by
 * Vite's HMR/JSX transforms.
 */
const fs = require('fs');
const http = require('http');
const mongoose = require('mongoose');
require('dotenv').config();
const { User, UserProgress } = require('../models');

const PROXY_HOST = '127.0.0.1';
const PROXY_PORT = 5173;
const EMAIL = `trailcheck+${Date.now()}@example.com`;
const PASSWORD = 'correc…aple';

const APP_JSX      = 'C:\\Users\\avrao\\Projects\\PyBe-Latest\\client\\src\\App.jsx';
const PATHTRAIL    = 'C:\\Users\\avrao\\Projects\\PyBe-Latest\\client\\src\\components\\PathTrail.jsx';
const MODULE_JSX   = 'C:\\Users\\avrao\\Projects\\PyBe-Latest\\client\\src\\pages\\Module.jsx';

function get(path, token) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: PROXY_HOST, port: PROXY_PORT, method: 'GET', path,
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}),
                   'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } },
      (res) => {
        let chunks = ''; res.on('data', (c) => chunks += c);
        res.on('end', () => resolve({ status: res.statusCode, body: chunks }));
      }
    );
    req.on('error', reject);
    req.end();
  });
}

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      { host: PROXY_HOST, port: PROXY_PORT, method: 'POST', path,
        headers: { 'Content-Type': 'application/json',
                   'Content-Length': Buffer.byteLength(data),
                   'Cache-Control': 'no-cache' } },
      (res) => {
        let chunks = ''; res.on('data', (c) => chunks += c);
        res.on('end', () => {
          let parsed; try { parsed = JSON.parse(chunks); } catch { parsed = chunks; }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

let pass = 0, fail = 0;
const GROUP = (label) => console.log(`\n▶ ${label}`);
function check(label, cond, detail = '') {
  if (cond) { console.log(`  ✅ ${label}${detail ? ' — ' + detail : ''}`); pass++; }
  else      { console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`); fail++; }
}

(async () => {
  // ── Setup ─────────────────────────────────────────────────────────────
  GROUP('Setup: fresh account');
  let signup = await post('/api/auth/signup', { email: EMAIL, name: 'Trail Check', password: PASSWORD });
  check('Signup → 201', signup.status === 201, `status=${signup.status}`);
  const token = signup.body.token;

  // ── Check 1 ───────────────────────────────────────────────────────────
  GROUP('Check 1: 3 paths × 3 nodes = 9 modules on a fresh account');
  let progress = await get('/api/progress', token);
  let parsed = JSON.parse(progress.body);
  check('Progress endpoint → 200', progress.status === 200);
  check('Exactly 3 paths returned', parsed.paths.length === 3, `count=${parsed.paths.length}`);
  const all = parsed.paths.flatMap((p) => p.modules);
  check('Total of 9 modules across all paths', all.length === 9, `count=${all.length}`);
  check(
    'Every path has exactly 3 modules',
    parsed.paths.every((p) => p.modules.length === 3)
  );

  // ── Check 2 ───────────────────────────────────────────────────────────
  GROUP('Check 2: exactly 1 clickable node per path (others locked)');
  for (const p of parsed.paths) {
    const clickable = p.modules.filter((m) => m.status !== 'locked');
    const locked = p.modules.filter((m) => m.status === 'locked');
    check(
      `[${p.name}] has exactly 1 unlocked module`,
      clickable.length === 1,
      `unlocked=${clickable.length}, locked=${locked.length}, statuses=${p.modules.map((m) => m.status).join(',')}`
    );
  }
  const totalUnlocked = all.filter((m) => m.status !== 'locked').length;
  check('Across all 3 paths, exactly 3 unlocked total', totalUnlocked === 3, `actual=${totalUnlocked}`);

  // Source-level: PathTrail gates the Link wrapper on status.
  const ptSrc = fs.readFileSync(PATHTRAIL, 'utf8');
  check(
    'PathTrail: locked status renders a non-clickable <g> (not <Link>)',
    /status\s*===\s*'locked'\s*\)[\s\S]{0,80}return\s*<\s*g[\s>]/.test(ptSrc)
  );
  check(
    'PathTrail: non-locked statuses wrap the artwork in <Link to={to}>',
    /<Link\b[\s\S]{0,80}to=\{to\}/.test(ptSrc)
  );
  check(
    'PathTrail module-card list: locked entries render <div>, others render <Link>',
    ptSrc.includes("const Comp = clickable ? Link : 'div';") &&
      ptSrc.includes('...compProps')
  );
  check(
    'PathTrail points all clickable nodes at /module/:id',
    /to=\{`\/module\/\$\{m\.moduleId\}`\}/.test(ptSrc) ||
      /to=\{`\/module\/\$\{moduleId\}`\}/.test(ptSrc) ||
      /to=\{\s*`\/module\/\$\{m\.moduleId\}`\s*\}/.test(ptSrc)
  );

  // ── Check 3 ───────────────────────────────────────────────────────────
  GROUP('Check 3: clicking an unlocked node navigates to a /module/:id route');
  // (a) the SPA shell serves /module/<id>
  let moduleSpa = await get('/module/' + all[0].moduleId, null);
  check(
    'GET /module/<id> returns the SPA shell (route exists)',
    moduleSpa.status === 200 && moduleSpa.body.includes('<div id="root">')
  );

  // (b) App.jsx registers the route under ProtectedRoute
  const appSrc = fs.readFileSync(APP_JSX, 'utf8');
  check(
    'App.jsx registers a /module/:id Route element',
    appSrc.includes('path="/module/:id"') && appSrc.includes('<Module />')
  );
  check(
    'App.jsx wraps /module/:id in <ProtectedRoute>',
    /path="\/module\/:id"\s+element=\{[\s\S]{0,200}<ProtectedRoute>/.test(appSrc)
  );

  // (c) Module.jsx renders real content (not a 404 page) for a valid id.
  const moduleSrc = fs.readFileSync(MODULE_JSX, 'utf8');
  check('Module.jsx imports useParams', moduleSrc.includes('useParams'));
  check(
    'Module.jsx renders the requested module\'s name (full lesson page)',
    moduleSrc.includes('{module.name}') || moduleSrc.includes('{m.name}')
  );
  check(
    'Module.jsx renders the story section from /api/module/:id',
    moduleSrc.includes('{module.story}') &&
      moduleSrc.includes('Why this pairing')
  );
  check(
    'Module.jsx gracefully handles a bogus id (renders "Module not found", not crash)',
    moduleSrc.includes('Module not found')
  );

  // ── Check 4 ───────────────────────────────────────────────────────────
  GROUP('Check 4: narrow viewport — SVG paths don\'t overflow or break layout');
  check(
    'PathTrail SVG has no `minWidth` style that would force horizontal scroll',
    !/style=\{[^}]*minWidth/.test(ptSrc)
  );
  check(
    'PathTrail SVG uses preserveAspectRatio so it scales without overflowing',
    ptSrc.includes('preserveAspectRatio="xMidYMid meet"')
  );
  check(
    'PathTrail SVG has responsive Tailwind classes (w-full h-auto max-w-full block)',
    /className="w-full h-auto max-w-full block"/.test(ptSrc)
  );
  check(
    'PathTrail card wrapper is `w-full` (no fixed widths above)',
    /<div className="w-full">/.test(ptSrc)
  );

  // Live check: the built SPA shell still loads at /dashboard.
  const built = await get('/dashboard', token);
  check(
    'Built dashboard route still returns the SPA shell',
    built.status === 200 && built.body.includes('<div id="root">')
  );

  // ── Cleanup ───────────────────────────────────────────────────────────
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