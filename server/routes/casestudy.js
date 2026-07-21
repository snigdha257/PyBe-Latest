const express = require('express');
const { CaseStudy, UserProgress, User } = require('../models');
const { authRequired } = require('../middleware/auth');
const { checkPathCaseStudyUnlock } = require('../utils/completion');

const router = express.Router();
const CASE_STUDY_XP = 25;

router.get('/casestudy/:pathId', authRequired, async (req, res) => {
  try {
    const isUnlocked = await checkPathCaseStudyUnlock(req.userId, req.params.pathId);
    if (!isUnlocked) {
      return res.status(403).json({ error: "Complete this layer first" });
    }

    const caseStudy = await CaseStudy.findOne({ pathId: req.params.pathId }).lean();
    if (!caseStudy) {
      return res.status(404).json({ error: "No case study found for this path" });
    }

    let progress = await UserProgress.findOne({
      userId: req.userId,
      caseStudyId: caseStudy._id
    });

    if (!progress) {
      progress = await UserProgress.create({
        userId: req.userId,
        caseStudyId: caseStudy._id,
        status: 'in_progress'
      });
    }

    res.json({
      caseStudy: {
        _id: caseStudy._id,
        pathId: caseStudy.pathId,
        title: caseStudy.title,
        scenario: caseStudy.scenario,
        buggyCode: caseStudy.buggyCode,
        hints: caseStudy.hints,
        reflectionPrompt: caseStudy.reflectionPrompt
      },
      progress
    });
  } catch (err) {
    console.error('GET casestudy error:', err);
    res.status(500).json({ error: 'Failed to load case study' });
  }
});

router.patch('/casestudy/:progressId/submit', authRequired, async (req, res) => {
  try {
    const { codeSubmission, reflectionText, actualOutput } = req.body;
    
    const progress = await UserProgress.findOne({
      _id: req.params.progressId,
      userId: req.userId,
      caseStudyId: { $ne: null }
    });

    if (!progress) {
      return res.status(404).json({ error: "Progress record not found" });
    }

    const caseStudy = await CaseStudy.findById(progress.caseStudyId).lean();
    if (!caseStudy) {
      return res.status(404).json({ error: "Case study not found" });
    }

    const expected = (caseStudy.expectedOutput || '').trim();
    const actual = (actualOutput || '').trim();

    progress.codeSubmission = codeSubmission;
    progress.reflectionText = reflectionText;
    progress.updatedAt = new Date();

    if (expected === actual && expected !== '') {
      if (progress.status !== 'completed') {
        progress.status = 'completed';
        progress.completedAt = new Date();
        progress.xpEarned = (progress.xpEarned || 0) + CASE_STUDY_XP;
        await User.findByIdAndUpdate(req.userId, { $inc: { xp: CASE_STUDY_XP } });
      }
      await progress.save();
      return res.json({ passed: true, progress });
    } else {
      progress.status = 'in_progress';
      await progress.save();
      return res.json({ passed: false, progress });
    }

  } catch (err) {
    console.error('PATCH casestudy submit error:', err);
    res.status(500).json({ error: 'Failed to submit case study' });
  }
});

module.exports = router;
