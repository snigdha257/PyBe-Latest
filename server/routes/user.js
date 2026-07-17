/**
 * User summary route — single source of truth for the dashboard's
 * XP counter and progress bar.
 *
 *   GET /api/user/summary  (Bearer JWT)
 *
 * Returns:
 *   {
 *     user: { id, email, name },
 *     totalXP: number,        // from User.xp (sum of every completed module)
 *     completedCount: number, // count of UserProgress docs with status='completed'
 *     total: number           // total modules in the curriculum (always 9 today)
 *   }
 */
const express = require('express');
const { Module, UserProgress } = require('../models');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/user/summary', authRequired, async (req, res) => {
  try {
    const [completedCount, totalModules] = await Promise.all([
      UserProgress.countDocuments({
        userId: req.userId,
        status: 'completed',
      }),
      Module.countDocuments(),
    ]);

    res.json({
      user: {
        id: String(req.user._id),
        email: req.user.email,
        name: req.user.name,
      },
      totalXP: req.user.xp || 0,
      completedCount,
      total: totalModules,
    });
  } catch (err) {
    console.error('user summary route error:', err);
    res.status(500).json({ error: 'Failed to load user summary' });
  }
});

module.exports = router;