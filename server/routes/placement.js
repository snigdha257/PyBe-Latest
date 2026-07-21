const express = require('express');
const { PlacementQuiz, PlacementAttempt, LearningPath, Module, UserProgress } = require('../models');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/placement/:pathId', authRequired, async (req, res) => {
  try {
    const quiz = await PlacementQuiz.findOne({ pathId: req.params.pathId }).lean();
    
    if (!quiz) {
      return res.status(404).json({ error: 'No placement quiz found for this path' });
    }

    const safeQuestions = quiz.questions.map(q => ({
      _id: q._id,
      question: q.question,
      choices: q.choices,
    }));

    res.json({
      quiz: {
        _id: quiz._id,
        pathId: quiz.pathId,
        passingScore: quiz.passingScore,
        questions: safeQuestions
      }
    });
  } catch (err) {
    console.error('GET placement route error:', err);
    res.status(500).json({ error: 'Failed to load placement quiz' });
  }
});

router.post('/placement/:pathId/submit', authRequired, async (req, res) => {
  try {
    const { answers } = req.body;
    
    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: 'Answers must be an array' });
    }

    const quiz = await PlacementQuiz.findOne({ pathId: req.params.pathId }).lean();
    if (!quiz) {
      return res.status(404).json({ error: 'No placement quiz found for this path' });
    }

    let score = 0;
    quiz.questions.forEach((q, index) => {
      if (answers[index] === q.correctIndex) {
        score++;
      }
    });

    const passed = score >= quiz.passingScore;

    await PlacementAttempt.create({
      userId: req.userId,
      pathId: req.params.pathId,
      score,
      passed
    });

    let firstModuleId = null;

    if (passed) {
      const targetPath = await LearningPath.findById(req.params.pathId).lean();
      if (targetPath) {
        const firstModule = await Module.findOne({ pathId: targetPath._id }).sort({ order: 1 }).lean();
        if (firstModule) {
          firstModuleId = firstModule._id;
        }

        const prevPath = await LearningPath.findOne({ order: targetPath.order - 1 }).lean();
        
        if (prevPath) {
          const prevModules = await Module.find({ pathId: prevPath._id }).lean();
          
          if (prevModules.length > 0) {
            const moduleIds = prevModules.map(m => m._id);
            const existingProgress = await UserProgress.find({
              userId: req.userId,
              moduleId: { $in: moduleIds }
            }).lean();
            
            const existingMap = new Map(existingProgress.map(p => [String(p.moduleId), p]));
            const bulkOps = [];
            
            for (const m of prevModules) {
              const existing = existingMap.get(String(m._id));
              if (existing) {
                if (existing.status !== 'completed' && existing.status !== 'completed_via_placement') {
                  bulkOps.push({
                    updateOne: {
                      filter: { _id: existing._id },
                      update: { $set: { status: 'completed_via_placement', updatedAt: new Date() } }
                    }
                  });
                }
              } else {
                bulkOps.push({
                  insertOne: {
                    document: {
                      userId: req.userId,
                      moduleId: m._id,
                      status: 'completed_via_placement',
                      updatedAt: new Date()
                    }
                  }
                });
              }
            }
            
            if (bulkOps.length > 0) {
              await UserProgress.bulkWrite(bulkOps);
            }
          }
        }
      }
    }

    res.json({ passed, score, total: quiz.questions.length, firstModuleId });
  } catch (err) {
    console.error('POST placement submit route error:', err);
    res.status(500).json({ error: 'Failed to submit placement quiz' });
  }
});

module.exports = router;
