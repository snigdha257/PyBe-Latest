// PyBe Latest — Express API
//
// Three boot-time guards before we accept any traffic:
//
//   1. JWT_SECRET must be set and (in production) not a known weak placeholder.
//   2. MongoDB connection must complete before listen().
//   3. A final error-handling middleware catches any uncaught route error
//      and returns a stable JSON {error} shape rather than an HTML stack trace.
//
// Order of middleware matters: the error handler MUST be registered LAST.
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRouter = require('./routes/auth').router;
const meRouter = require('./routes/me');
const progressRouter = require('./routes/progress');
const moduleRouter = require('./routes/module');
const userRouter = require('./routes/user');

const PORT = process.env.PORT || 5000;

// ── 1. Secret-config guard ──────────────────────────────────────────
//
// Without this, a fresh clone with the example `.env` placeholder would
// happily sign tokens with a publicly-known string. In production we
// hard-fail; in local dev the override lets the placeholder through.
//
// The placeholder values we recognise are exactly the strings that ship in
// .env.example. Updating either side requires updating the other.
const KNOWN_PLACEHOLDER_SECRETS = new Set([
  'replace-me-with-a-long-random-string',
  'changeme',
  'secret',
  'jwt_secret',
  'dev-secret',
]);
function validateJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.ALLOW_INSECURE_DEV === '1') {
      console.warn(
        '⚠️  JWT_SECRET is missing or too short. ALLOW_INSECURE_DEV=1 — proceeding for local dev only.'
      );
      return;
    }
    console.error(
      '❌ JWT_SECRET is missing or shorter than 32 chars. Refusing to boot.\n' +
        '   Generate one: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"\n' +
        '   For local dev without this check, set ALLOW_INSECURE_DEV=1.'
    );
    process.exit(1);
  }
  if (
    process.env.ALLOW_INSECURE_DEV !== '1' &&
    KNOWN_PLACEHOLDER_SECRETS.has(secret.toLowerCase())
  ) {
    console.error(
      '❌ JWT_SECRET is a known placeholder value. Refusing to boot.\n' +
        '   Replace it with a real secret. For local dev only, set ALLOW_INSECURE_DEV=1.'
    );
    process.exit(1);
  }
}
validateJwtSecret();

// ── Express ─────────────────────────────────────────────────────────
const app = express();
app.disable('x-powered-by'); // don't advertise the framework
app.use(cors());
app.use(express.json({ limit: '512kb' }));

// Public health route — also verifies Mongo is connected. If /api/health
// returns 200, the front-end can consider the server healthy enough to use.
app.get('/api/health', (req, res) => {
  const mongoReady = mongoose.connection.readyState === 1; // 1 == connected
  if (!mongoReady) {
    return res.status(503).json({
      status: 'degraded',
      error: 'Database not connected',
    });
  }
  res.json({ status: 'ok' });
});

// ── Routers ─────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api', meRouter);
app.use('/api', progressRouter);
app.use('/api', moduleRouter);
app.use('/api', userRouter);

// 404 fallback for unknown /api/* paths — return JSON, not Express's HTML.
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Final error handler ─────────────────────────────────────────────
//
// MUST be last. Catches anything uncaught in a route handler (e.g. an
// unhandled rejection inside an `async` handler that wasn't awaited).
// Without it, Express would return its default HTML error page — which
// the JSON-only `api.js` client cannot parse.
app.use((err, req, res, next) => {
  // CastError from mongoose.findById with a malformed id — give it the
  // same shape the per-route try/catch already produces. The per-route
  // guards handle "real" bad ids; this catches any that escape.
  if (err && err.name === 'CastError') {
    return res.status(404).json({ error: 'Not found' });
  }
  console.error('[uncaught]', err);
  // Don't echo the message back to the client (could leak DB schema details).
  res.status(500).json({ error: 'Internal server error' });
});

// ── 2. MongoDB connection ───────────────────────────────────────────
async function connectMongo() {
  if (!process.env.MONGO_URI) {
    if (process.env.ALLOW_INSECURE_DEV === '1') {
      console.warn(
        '⚠️  MONGO_URI is unset. ALLOW_INSECURE_DEV=1 — proceeding without DB.'
      );
      return;
    }
    console.error('❌ MONGO_URI is not set. Refusing to boot.');
    process.exit(1);
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
}

// ── 3. Start listening (only after Mongo is ready) ──────────────────
(async () => {
  await connectMongo();
  app.listen(PORT, () => {
    console.log(`🚀 Server listening on http://localhost:${PORT}`);
  });
})();

module.exports = app;
