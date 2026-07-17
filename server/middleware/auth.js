/**
 * JWT auth middleware.
 *
 * Looks for a Bearer token in the Authorization header, verifies it with
 * JWT_SECRET, and attaches the matching User document to req.user.
 *
 * On any failure, responds 401 with a small JSON error and does NOT call next().
 */
const jwt = require('jsonwebtoken');
const { User } = require('../models');

async function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    if (!process.env.JWT_SECRET) {
      // Misconfigured server — fail loudly rather than silently letting traffic through.
      console.error('JWT_SECRET is not set in .env');
      return res.status(500).json({ error: 'Server auth misconfigured' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.type !== 'access') {
      return res.status(401).json({ error: 'Wrong token type' });
    }

    const user = await User.findById(payload.sub).lean();
    if (!user) return res.status(401).json({ error: 'User no longer exists' });

    req.user = user;
    req.userId = String(user._id);
    return next();
  } catch (err) {
    const msg =
      err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return res.status(401).json({ error: msg });
  }
}

module.exports = { authRequired };
