/**
 * Progress routes (protected)
 *
 *   GET   /api/progress
 *   PATCH /api/progress/:moduleId/draft
 *   PATCH /api/progress/:moduleId/reflection
 *   POST  /api/progress/:moduleId/quiz
 *   POST /api/progress/:moduleId/story/regenerate
 *
 * GET returns the logged-in user's UserProgress for every module, grouped by
 * LearningPath.
 *
 * The two write routes share a single completion rule (see utils/completion.js):
 * whenever both a non-empty reflectionText AND quizPassed=true exist for a
 * UserProgress document, the doc is flipped to status='completed' and the next
 * module in the same path is unlocked. Last module in a path → nothing further.
 *
 * POST /story/regenerate generates a new AI story for the next storyRound,
 * caches it in UserProgress.storyCache, and returns the personalised result.
 */
const express = require('express');
const { LearningPath, Module, User, UserProgress } = require('../models');
const { authRequired } = require('../middleware/auth');
const { tryCompleteAndUnlock } = require('../utils/completion');
const { generateModuleContent, evaluateSolution } = require('../services/llm');

const router = express.Router();

function firstSentence(text, maxLen = 110) {
  if (!text) return '';
  // Pull everything up to (but not including) the first ". " that's followed by a capital.
  const m = text.match(/^[^.]+\./);
  const sentence = (m ? m[0] : text).trim();
  if (sentence.length <= maxLen) return sentence;
  return sentence.slice(0, maxLen - 1).trimEnd() + '…';
}

router.get('/progress', authRequired, async (req, res) => {
  try {
    const [paths, modules, progress] = await Promise.all([
      LearningPath.find().sort({ order: 1 }).lean(),
      Module.find().lean(),
      UserProgress.find({ userId: req.userId }).lean(),
    ]);

    const progressByModuleId = new Map(
      progress.map((p) => [String(p.moduleId), p])
    );

    const out = paths.map((path) => {
      const pathModules = modules
        .filter((m) => String(m.pathId) === String(path._id))
        .sort((a, b) => a.order - b.order)
        .map((m) => {
          const p = progressByModuleId.get(String(m._id));
          return {
            moduleId: String(m._id),
            order: m.order,
            name: m.name,
            teaser: firstSentence(m.story),
            status: p?.status || 'locked',
            quizPassed: !!p?.quizPassed,
            xpEarned: p?.xpEarned ?? 0,
            completedAt: p?.completedAt ?? null,
          };
        });

      return {
        pathId: String(path._id),
        name: path.name,
        description: path.description,
        order: path.order,
        modules: pathModules,
      };
    });

    res.json({ paths: out });
  } catch (err) {
    console.error('progress route error:', err);
    res.status(500).json({ error: 'Failed to load progress' });
  }
});

/**
 * PATCH /api/progress/:moduleId/draft
 *
 * Saves the user's code draft without marking the module complete.
 * Body: { codeSubmission: string }
 *
 *   200 → { progress: { codeSubmission, status, quizPassed, xpEarned, completedAt, updatedAt } }
 *   400 → { error: "codeSubmission must be a string" }
 *   403 → { error: "This module is locked for your account." }
 *   404 → { error: "Module not found" }
 */
router.patch('/progress/:moduleId/draft', authRequired, async (req, res) => {
  try {
    const { codeSubmission } = req.body || {};
    if (typeof codeSubmission !== 'string') {
      return res
        .status(400)
        .json({ error: 'codeSubmission must be a string' });
    }
    if (codeSubmission.length > 50_000) {
      return res
        .status(400)
        .json({ error: 'codeSubmission too large (max 50000 chars)' });
    }

    let moduleDoc;
    try {
      moduleDoc = await Module.findById(req.params.moduleId).lean();
    } catch (e) {
      // Malformed ObjectId — treat as not found rather than 500.
      return res.status(404).json({ error: 'Module not found' });
    }
    if (!moduleDoc) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const progress = await UserProgress.findOne({
      userId: req.userId,
      moduleId: moduleDoc._id,
    });
    if (!progress || progress.status === 'locked') {
      return res
        .status(403)
        .json({ error: 'This module is locked for your account.' });
    }

    progress.codeSubmission = codeSubmission;
    // Touch updatedAt so the client can show "Saved 5s ago".
    progress.updatedAt = new Date();
    await progress.save();

    res.json({
      progress: {
        codeSubmission: progress.codeSubmission,
        status: progress.status,
        quizPassed: progress.quizPassed,
        xpEarned: progress.xpEarned,
        completedAt: progress.completedAt,
        updatedAt: progress.updatedAt,
      },
    });
  } catch (err) {
    console.error('draft route error:', err);
    res.status(500).json({ error: 'Failed to save draft' });
  }
});

// ── Shared helpers ─────────────────────────────────────────────────────────

/**
 * Look up a Module + the user's UserProgress in one place.
 * Sends the appropriate error response and returns null on failure.
 * On success, returns { moduleDoc, progress }.
 */
async function locateModuleAndProgress(req, res) {
  let moduleDoc;
  try {
    moduleDoc = await Module.findById(req.params.moduleId).lean();
  } catch (e) {
    res.status(404).json({ error: 'Module not found' });
    return null;
  }
  if (!moduleDoc) {
    res.status(404).json({ error: 'Module not found' });
    return null;
  }
  const progress = await UserProgress.findOne({
    userId: req.userId,
    moduleId: moduleDoc._id,
  });
  if (!progress || progress.status === 'locked') {
    res
      .status(403)
      .json({ error: 'This module is locked for your account.' });
    return null;
  }

  // When storyRound > 0, use the cached quizAnswer from the generated content
  // instead of the seeded module.quizAnswer, so the quiz is consistent with
  // the narrative the learner actually read.
  const storyRound = progress.storyRound ?? 0;
  const cachedAnswer =
    storyRound > 0
      ? progress.storyCache?.get(String(storyRound))?.quizAnswer
      : null;
  const effectiveAnswer = cachedAnswer ?? moduleDoc.quizAnswer;

  return { moduleDoc, progress, effectiveAnswer };
}

function publicProgress(p) {
  return {
    status: p.status,
    reflectionText: p.reflectionText,
    codeSubmission: p.codeSubmission,
    quizPassed: p.quizPassed,
    xpEarned: p.xpEarned,
    completedAt: p.completedAt,
    updatedAt: p.updatedAt,
  };
}

// ── /reflection ────────────────────────────────────────────────────────────

/**
 * PATCH /api/progress/:moduleId/reflection
 *
 * Saves the user's reflectionText. Triggers the completion rule:
 * if (after save) reflectionText is non-empty AND quizPassed=true,
 * the module is marked complete and the next module (if any) unlocked.
 *
 * Body: { reflectionText: string }
 *
 *   200 → {
 *     progress: { ...publicProgress },
 *     completed: boolean,         // true if THIS call just completed the module
 *     alreadyCompleted: boolean,  // true if it was already completed
 *     unlockedNext: null | { moduleId, name, order, pathName, persisted }
 *   }
 *   400 → { error: "reflectionText must be a string" }
 *   403 → { error: "This module is locked for your account." }
 *   404 → { error: "Module not found" }
 */
router.patch(
  '/progress/:moduleId/reflection',
  authRequired,
  async (req, res) => {
    try {
      const { reflectionText } = req.body || {};
      if (typeof reflectionText !== 'string') {
        return res
          .status(400)
          .json({ error: 'reflectionText must be a string' });
      }
      if (reflectionText.length > 5_000) {
        return res
          .status(400)
          .json({ error: 'reflectionText too large (max 5000 chars)' });
      }

      const located = await locateModuleAndProgress(req, res);
      if (!located) return; // error already sent
      const { moduleDoc, progress } = located;

      progress.reflectionText = reflectionText;
      progress.updatedAt = new Date();
      await progress.save();

      const result = await tryCompleteAndUnlock(
        req.userId,
        moduleDoc,
        progress
      );

      res.json({
        progress: publicProgress(progress),
        completed: result.completed,
        alreadyCompleted: result.alreadyCompleted,
        unlockedNext: result.unlockedNext,
      });
    } catch (err) {
      console.error('reflection route error:', err);
      res.status(500).json({ error: 'Failed to save reflection' });
    }
  }
);

// ── /quiz ──────────────────────────────────────────────────────────────────

/**
 * POST /api/progress/:moduleId/quiz
 *
 * Submits the user's quiz answer and stores whether it's correct as
 * `quizPassed`. Triggers the same completion rule as /reflection.
 *
 * Quiz comparison: trimmed + case-insensitive against module.quizAnswer.
 *
 * Body: { answer: string }
 *
 *   200 → {
 *     correct: boolean,          // was THIS submission correct?
 *     progress: { ...publicProgress },
 *     completed: boolean,
 *     alreadyCompleted: boolean,
 *     unlockedNext: null | { moduleId, name, order, pathName, persisted }
 *   }
 *   400 → { error: "answer must be a string" }
 *   403 → { error: "This module is locked for your account." }
 *   404 → { error: "Module not found" }
 */
router.post('/progress/:moduleId/quiz', authRequired, async (req, res) => {
  try {
    const { answer } = req.body || {};
    if (typeof answer !== 'string') {
      return res
        .status(400)
        .json({ error: 'answer must be a string' });
    }
    if (answer.length > 1_000) {
      return res
        .status(400)
        .json({ error: 'answer too long (max 1000 chars)' });
    }

    const located = await locateModuleAndProgress(req, res);
    if (!located) return;
    const { moduleDoc, progress, effectiveAnswer } = located;

    const expected = String(effectiveAnswer || '').trim().toLowerCase();
    const submitted = String(answer).trim().toLowerCase();
    const correct = expected.length > 0 && expected === submitted;

    // Sticky-once-true: passing the quiz never goes back to false.
    const wasPassed = !!progress.quizPassed;
    progress.quizPassed = wasPassed || correct;
    progress.updatedAt = new Date();
    await progress.save();

    const result = await tryCompleteAndUnlock(
      req.userId,
      moduleDoc,
      progress
    );

    res.json({
      correct,
      progress: publicProgress(progress),
      completed: result.completed,
      alreadyCompleted: result.alreadyCompleted,
      unlockedNext: result.unlockedNext,
    });
  } catch (err) {
    console.error('quiz route error:', err);
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
});

// ── /story/regenerate ─────────────────────────────────────────────────────

/**
 * POST /api/progress/:moduleId/story/regenerate
 *
 * Generates a new AI story for the next storyRound and caches it.
 * The user's progress record is loaded and updated within a MongoDB
 * transaction so storyRound and storyCache stay in sync.
 *
 * Responses:
 *   200 → { storyRound: number, story: string, whyPairing: string }
 *   400 → { error: "Story regeneration is already in progress." }
 *   403 → { error: "This module is locked for your account." }
 *   404 → { error: "Module not found" }
 *   503 → { error: "Story generation unavailable (LLM service not configured)." }
 */
router.post('/progress/:moduleId/story/regenerate', authRequired, async (req, res) => {
  try {
    let moduleDoc;
    try {
      moduleDoc = await Module.findById(req.params.moduleId).lean();
    } catch (e) {
      return res.status(404).json({ error: 'Module not found' });
    }
    if (!moduleDoc) return res.status(404).json({ error: 'Module not found' });

    const progress = await UserProgress.findOne({
      userId: req.userId,
      moduleId: moduleDoc._id,
    });

    if (!progress || progress.status === 'locked') {
      return res.status(403).json({ error: 'This module is locked for your account.' });
    }

    const nextRound = (progress.storyRound || 0) + 1;

    // Look up the user's chosen theme (set at signup) to select the narrative frame
    const user = await User.findById(req.userId).lean();
    const theme = user?.theme || 'detective';

    const learnerName = req.user?.name || 'learner';

    let generated;
    try {
      generated = await generateModuleContent(moduleDoc.name, learnerName, theme);
    } catch (llmErr) {
      console.error('[story-regenerate] LLM error:', llmErr.message);
      if (llmErr.message.includes('GROQ_API_KEY') || llmErr.message.includes('not set')) {
        return res.status(503).json({ error: 'Story generation unavailable (GROQ_API_KEY not set in server/.env). Get a free key at https://console.groq.com/keys' });
      }
      return res.status(503).json({ error: 'Story generation failed: ' + llmErr.message });
    }

    // Persist: increment round + cache the full module content
    // storyRound is only for caching history; the theme is static per user
    progress.storyRound = nextRound;
    if (!progress.storyCache) progress.storyCache = {};
    progress.storyCache.set(String(nextRound), generated);
    progress.updatedAt = new Date();
    await progress.save();

    res.json({
      storyRound: nextRound,
      story: generated.story,
      whyPairing: generated.whyPairing,
      practicalTask: generated.practicalTask,
      quizQuestion: generated.quizQuestion,
      quizChoices: generated.quizChoices,
      reflectionPrompt: generated.reflectionPrompt,
    });
  } catch (err) {
    console.error('[story-regenerate] route error:', err);
    res.status(500).json({ error: 'Failed to generate story' });
  }
});

// ── /evaluate ────────────────────────────────────────────────────────────────

/**
 * POST /api/progress/:moduleId/evaluate
 *
 * Step 2 → 3 of the problem-first flow:
 *   1. Learner reads the problem (problem step)
 *   2. Learner writes how they'd solve it (think step) — saved via this endpoint
 *   3. AI evaluates their answer and returns detailed feedback
 *
 * Body: { learnerAnswer: string }
 *
 *   200 → { evaluationResult: EvaluationResult, currentStep: string }
 *   400 → { error: "learnerAnswer is required" }
 *   403 → { error: "Module is locked" }
 *   404 → { error: "Module not found" }
 *   503 → { error: "LLM unavailable" }
 */
router.post('/progress/:moduleId/evaluate', authRequired, async (req, res) => {
  try {
    const { learnerAnswer } = req.body || {};
    if (!learnerAnswer || typeof learnerAnswer !== 'string' || !learnerAnswer.trim()) {
      return res.status(400).json({ error: 'learnerAnswer is required' });
    }
    const trimmed = learnerAnswer.trim();
    if (trimmed.length > 2000) {
      return res.status(400).json({ error: 'learnerAnswer must be under 2000 characters' });
    }

    const moduleDoc = await Module.findById(req.params.moduleId).lean();
    if (!moduleDoc) return res.status(404).json({ error: 'Module not found' });

    const progress = await UserProgress.findOne({
      userId: req.userId,
      moduleId: moduleDoc._id,
    });
    if (!progress || progress.status === 'locked') {
      return res.status(403).json({ error: 'Module is locked' });
    }

    let evaluation;
    try {
      evaluation = await evaluateSolution(moduleDoc, trimmed);
    } catch (llmErr) {
      console.error('[evaluate] LLM error:', llmErr.message);
      if (llmErr.message.includes('GROQ_API_KEY') || llmErr.message.includes('not set')) {
        return res.status(503).json({ error: 'Evaluation unavailable (GROQ_API_KEY not set). Get a free key at https://console.groq.com/keys' });
      }
      return res.status(503).json({ error: 'Evaluation failed: ' + llmErr.message });
    }

    // Persist the learner's answer + evaluation result
    progress.learnerAnswer = trimmed;
    progress.evaluationResult = evaluation;
    progress.currentStep = 'evaluated';
    progress.updatedAt = new Date();
    await progress.save();

    res.json({ evaluationResult: evaluation, currentStep: 'evaluated' });
  } catch (err) {
    console.error('[evaluate] route error:', err);
    res.status(500).json({ error: 'Failed to evaluate answer' });
  }
});

// ── /reveal ──────────────────────────────────────────────────────────────────

/**
 * POST /api/progress/:moduleId/reveal
 *
 * Step 3 → 4: Marks that the learner has seen the Python solution.
 *
 *   200 → { pythonSolution: {...}, currentStep: 'reveal' }
 *   403 → { error: "Module is locked" }
 *   404 → { error: "Module not found" }
 */
router.post('/progress/:moduleId/reveal', authRequired, async (req, res) => {
  try {
    const moduleDoc = await Module.findById(req.params.moduleId).lean();
    if (!moduleDoc) return res.status(404).json({ error: 'Module not found' });

    const progress = await UserProgress.findOne({
      userId: req.userId,
      moduleId: moduleDoc._id,
    });
    if (!progress || progress.status === 'locked') {
      return res.status(403).json({ error: 'Module is locked' });
    }

    progress.pythonSolutionViewed = true;
    progress.currentStep = 'reveal';
    progress.updatedAt = new Date();
    await progress.save();

    res.json({
      pythonSolution: moduleDoc.pythonSolution,
      currentStep: 'reveal',
    });
  } catch (err) {
    console.error('[reveal] route error:', err);
    res.status(500).json({ error: 'Failed to mark solution as viewed' });
  }
});

module.exports = router;
