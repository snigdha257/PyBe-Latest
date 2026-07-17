/**
 * Hardcoded-secret scanner.
 *
 * Walks every .js / .jsx / .ts / .tsx file in server/ and client/src/ and
 * flags anything that looks like a literal JWT secret, a MongoDB connection
 * string with embedded credentials, a Slack/Google/AWS-style API key, or a
 * plaintext password assignment outside of /scripts/.
 *
 * Run: `node scripts/_scan-secrets.js`
 * Exit code 1 if anything is flagged.
 */
const fs = require('fs');
const path = require('path');

const ROOTS = [
  path.join(__dirname, '..'),
  path.join(__dirname, '..', '..', 'client', 'src'),
];

const EXTS = new Set(['.js', '.jsx', '.ts', '.tsx']);

const PATTERNS = [
  { name: 'mongodb URI with credentials',
    re: /mongodb(?:\+srv)?:\/\/[^/\s]*:[^/\s]*@/ },
  { name: 'JWT_SECRET literal assignment',
    re: /JWT_SECRET\s*[:=]\s*['"][^'"]{6,}['"]/ },
  { name: 'AWS Access Key ID',
    re: /AKIA[0-9A-Z]{16}/ },
  { name: 'Google API key',
    re: /AIza[0-9A-Za-z\-_]{35}/ },
  { name: 'Slack token',
    re: /xox[abposr]-[0-9A-Za-z\-]{10,}/ },
  { name: 'plaintext "password = ..." literal',
    re: /['"]password['"]\s*[:=]\s*['"](?!\$|process\.env|require)[^'"]{4,}['"]/i },
  { name: 'private key block (PEM)',
    re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/ },
];

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'dist-ssr', 'build', 'coverage', '.next',
]);

function* walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return; }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      yield* walk(path.join(dir, e.name));
    } else if (EXTS.has(path.extname(e.name))) {
      yield path.join(dir, e.name);
    }
  }
}

let hits = 0;
for (const root of ROOTS) {
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root)) {
    const src = fs.readFileSync(file, 'utf8');
    const lines = src.split(/\r?\n/);
    for (const { name, re } of PATTERNS) {
      for (let i = 0; i < lines.length; i++) {
        if (re.test(lines[i])) {
          // Skip the _pwd.js fixture file — that's a deliberate test password
          // for scripts, not a real secret.
          if (/_pwd(|-source)?\.js$/.test(file)) continue;
          // Skip comments that reference these patterns in docs/test code.
          if (/^\s*(\/\/|\*|\#)/.test(lines[i])) continue;
          hits++;
          console.log(`❌ ${file}:${i + 1}  [${name}]`);
          console.log(`     ${lines[i].trim()}`);
        }
      }
    }
  }
}

if (hits === 0) {
  console.log('✅ No hardcoded secrets detected in server/ or client/src/.');
} else {
  console.log(`\n⚠️  ${hits} hardcoded-secret candidate(s) found.`);
  process.exitCode = 1;
}
