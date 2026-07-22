/**
 * Auth routes
 *
 *   POST /api/auth/signup   { email, name, password }   → { token, user }
 *   POST /api/auth/login    { email, password }         → { token, user }
 *
 * The signup flow also seeds a UserProgress record for every module.
 * The first module (by order) of every path is created with status="unlocked";
 * everything else starts "locked".
 */
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { User, LearningPath, Module, UserProgress, StoryWorld } = require('../models');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_ROUNDS = 10;

// Token lifetime — short-lived access tokens; clients can refresh by logging in again.
const TOKEN_TTL = '7d';

function signAccessToken(userId) {
  return jwt.sign(
    { sub: String(userId), type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

function publicUser(user) {
  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    xp: user.xp,
    theme: user.storyWorldId ? (user.storyWorldId.key || user.storyWorldId) : null,
  };
}

/**
 * Build an initial UserProgress set for a freshly-created user.
 * Walks every path, picks the first module by `order`, and unlocks it.
 * Everything else (including all non-first modules) is locked.
 */
async function buildInitialProgress(userId) {
  const paths = await LearningPath.find().lean();
  const modules = await Module.find().lean();

  const firstModuleIdByPath = new Map();
  for (const m of modules) {
    const key = String(m.pathId);
    const prev = firstModuleIdByPath.get(key);
    if (!prev || m.order < prev.order) {
      firstModuleIdByPath.set(key, m.order);
    }
  }
  const firstOrderByPath = firstModuleIdByPath;

  const docs = modules.map((m) => {
    const isFirst = m.order === firstOrderByPath.get(String(m.pathId));
    return {
      userId,
      moduleId: m._id,
      status: isFirst ? 'unlocked' : 'locked',
    };
  });

  if (docs.length > 0) {
    await UserProgress.insertMany(docs, { ordered: false });
  }
  return docs.length;
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, name, password, theme } = req.body || {};

    if (!EMAIL_RE.test(email || '')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }
    if (!name || typeof name !== 'string' || name.trim().length < 1) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (!theme) {
      return res.status(400).json({ error: 'Theme is required' });
    }

    const world = await StoryWorld.findOne({ key: theme }).lean();
    if (!world) {
      return res.status(400).json({ error: 'Invalid theme' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await User.findOne({ email: normalizedEmail }).lean();
    if (existing) {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await User.create({
      email: normalizedEmail,
      name: name.trim(),
      passwordHash,
      storyWorldId: world._id,
    });
    user.storyWorldId = world; // populating manually for response

    const moduleCount = await buildInitialProgress(user._id);
    const token = signAccessToken(user._id);

    return res.status(201).json({
      token,
      user: publicUser(user),
      progressSeeded: moduleCount,
    });
  } catch (err) {
    console.error('signup error:', err);
    return res.status(500).json({ error: 'Signup failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).populate('storyWorldId');
    if (!user) {
      // Same generic message for unknown email vs bad password — don't leak which.
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signAccessToken(user._id);
    return res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = { router, buildInitialProgress, signAccessToken };
