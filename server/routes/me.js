/**
 * Protected user routes — demonstrates the authRequired middleware.
 *
 *   GET /api/me          → { user }
 *   GET /api/me/progress → list of progress docs for the current user
 */
const express = require('express');
const { UserProgress } = require('../models');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/me', authRequired, (req, res) => {
  res.json({
    user: {
      id: String(req.user._id),
      email: req.user.email,
      name: req.user.name,
      xp: req.user.xp,
    },
  });
});

router.get('/me/progress', authRequired, async (req, res) => {
  const docs = await UserProgress.find({ userId: req.userId })
    .populate('moduleId', 'name order pathId')
    .lean();
  res.json({ progress: docs });
});

module.exports = router;