/**
 * Module routes (protected)
 *
 *   GET /api/module/:id
 *
 * Returns the requested module's content + the user's UserProgress for it.
 * Story / whyPairing / practicalTask / reflectionPrompt get `{learner}`
 * substituted with the logged-in user's name on the server so the client
 * doesn't need to know about the placeholder.
 *
 * Responses:
 *   200 →  { module: {...}, progress: {...}, path: {...} }
 *   403 →  { error: "This module is locked for your account." }
 *   404 →  { error: "Module not found" }
 */
const express = require('express');
const { LearningPath, Module, UserProgress } = require('../models');
const { authRequired } = require('../middleware/auth');
<<<<<<< Updated upstream
const { substituteLearner } = require('../utils/learner');
=======
const { isPathCompleted } = require('../utils/completion');
>>>>>>> Stashed changes

const router = express.Router();

router.get('/module/:id', authRequired, async (req, res) => {
  try {
    let moduleDoc;
    try {
      moduleDoc = await Module.findById(req.params.id).lean();
    } catch (e) {
      return res.status(404).json({ error: 'Module not found' });
    }
    if (!moduleDoc) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const pathDoc = await LearningPath.findById(moduleDoc.pathId).lean();

    if (pathDoc && pathDoc.order > 1) {
      const prevPath = await LearningPath.findOne({ order: pathDoc.order - 1 }).lean();
      if (prevPath) {
        const pathIsCompleted = await isPathCompleted(req.userId, prevPath._id);
        if (!pathIsCompleted) {
          return res.status(403).json({
            error: 'placement_required',
            pathId: prevPath._id,
            pathName: prevPath.name
          });
        }
      }
    }

    const progress = await UserProgress.findOne({
      userId: req.userId,
      moduleId: moduleDoc._id,
    }).lean();

    // If the user has no progress row at all (shouldn't normally happen —
    // signup seeds 9 progress docs), treat it as locked.
    const status = progress?.status || 'locked';
    if (status === 'locked') {
      return res
        .status(403)
        .json({ error: 'This module is locked for your account.' });
    }

    const learnerName = req.user?.name || 'learner';

    res.json({
      module: {
        id: String(moduleDoc._id),
        order: moduleDoc.order,
        name: moduleDoc.name,
        story: substituteLearner(moduleDoc.story, learnerName),
        whyPairing: substituteLearner(moduleDoc.whyPairing, learnerName),
        practicalTask: substituteLearner(moduleDoc.practicalTask, learnerName),
        reflectionPrompt: substituteLearner(
          moduleDoc.reflectionPrompt,
          learnerName
        ),
        quizQuestion: moduleDoc.quizQuestion,
        quizChoices: moduleDoc.quizChoices,
      },
      progress: {
        status,
        reflectionText: progress.reflectionText || '',
        codeSubmission: progress.codeSubmission || '',
        quizPassed: !!progress.quizPassed,
        xpEarned: progress.xpEarned ?? 0,
        completedAt: progress.completedAt ?? null,
        updatedAt: progress.updatedAt ?? null,
      },
      path: pathDoc
        ? {
            id: String(pathDoc._id),
            name: pathDoc.name,
            order: pathDoc.order,
          }
        : null,
    });
  } catch (err) {
    console.error('module route error:', err);
    res.status(500).json({ error: 'Failed to load module' });
  }
});

module.exports = router;
