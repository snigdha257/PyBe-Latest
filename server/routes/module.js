/**
 * Module routes (protected)
 *
 *   GET /api/module/:id
 *
 * Returns the module's problem-first content + user progress state.
 *
 * Content strategy:
 *   - Returns module-level content: name, problem, pythonSolution, evaluationCriteria
 *   - Returns progress-level state: currentStep, learnerAnswer, evaluationResult,
 *     pythonSolutionViewed, storyRound
 *   - The currentStep tells the client which panel to show:
 *       'problem'   → show the problem card
 *       'think'     → show the "how would you solve it?" textarea
 *       'evaluated' → show AI evaluation + "Show me how Python does it"
 *       'reveal'    → show pythonSolution + "Try it yourself"
 *       'applied'   → show practical task
 *       'quiz'      → show quiz
 *       'done'      → show completion
 *
 * Responses:
 *   200 →  { module: {...}, progress: {...}, path: {...} }
 *   403 →  { error: "This module is locked for your account." }
 *   404 →  { error: "Module not found" }
 */
const express = require('express');
const { LearningPath, Module, UserProgress } = require('../models');
const { authRequired } = require('../middleware/auth');

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

    const progress = await UserProgress.findOne({
      userId: req.userId,
      moduleId: moduleDoc._id,
    }).lean();

    // If the user has no progress row at all, treat it as locked.
    const status = progress?.status || 'locked';
    if (status === 'locked') {
      return res
        .status(403)
        .json({ error: 'This module is locked for your account.' });
    }

    // Serve problem-first fields (new modules)
    // Legacy fields are still returned for backwards compat with older modules
    res.json({
      module: {
        id: String(moduleDoc._id),
        order: moduleDoc.order,
        name: moduleDoc.name,
        // Problem-first content
        problem: moduleDoc.problem || '',
        evaluationCriteria: moduleDoc.evaluationCriteria || [],
        pythonSolution: moduleDoc.pythonSolution || { explanation: '', code: '' },
        // Legacy story fields (may be empty for new modules)
        story: moduleDoc.story || '',
        whyPairing: moduleDoc.whyPairing || '',
        practicalTask: moduleDoc.practicalTask || '',
        quizQuestion: moduleDoc.quizQuestion || '',
        quizChoices: moduleDoc.quizChoices || [],
        reflectionPrompt: moduleDoc.reflectionPrompt || '',
      },
      progress: {
        status,
        currentStep: progress?.currentStep || 'problem',
        learnerAnswer: progress?.learnerAnswer || '',
        evaluationResult: progress?.evaluationResult || null,
        pythonSolutionViewed: progress?.pythonSolutionViewed || false,
        storyRound: progress?.storyRound ?? 0,
        reflectionText: progress?.reflectionText || '',
        codeSubmission: progress?.codeSubmission || '',
        quizPassed: !!progress?.quizPassed,
        xpEarned: progress?.xpEarned ?? 0,
        completedAt: progress?.completedAt ?? null,
        updatedAt: progress?.updatedAt ?? null,
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