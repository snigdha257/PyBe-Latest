/**
 * Protected user routes — demonstrates the authRequired middleware.
 *
 *   GET /api/me          → { user }
 *   GET /api/me/progress → list of progress docs for the current user
 */
const express = require('express');
const { UserProgress, User, StoryWorld } = require('../models');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/me', authRequired, (req, res) => {
  res.json({
    user: {
      id: String(req.user._id),
      email: req.user.email,
      name: req.user.name,
      xp: req.user.xp,
      theme: req.user.storyWorldId ? req.user.storyWorldId.key : null,
    },
  });
});

router.patch('/me/preferences', authRequired, async (req, res) => {
  try {
    const { theme } = req.body;
    if (!theme) return res.status(400).json({ error: 'theme is required' });
    
    const world = await StoryWorld.findOne({ key: theme }).lean();
    if (!world) return res.status(404).json({ error: 'StoryWorld not found' });
    
    const user = await User.findByIdAndUpdate(req.userId, { storyWorldId: world._id }, { new: true }).populate('storyWorldId').lean();
    
    res.json({
      user: {
        id: String(user._id),
        email: user.email,
        name: user.name,
        xp: user.xp,
        theme: user.storyWorldId ? user.storyWorldId.key : null,
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

router.get('/me/progress', authRequired, async (req, res) => {
  const docs = await UserProgress.find({ userId: req.userId })
    .populate('moduleId', 'name order pathId')
    .lean();
  res.json({ progress: docs });
});

module.exports = router;