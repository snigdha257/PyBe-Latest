const mongoose = require('mongoose');

const STATUS = Object.freeze({
  LOCKED: 'locked',
  UNLOCKED: 'unlocked',
  COMPLETED: 'completed',
});

const userProgressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true, index: true },
    status: {
      type: String,
      enum: Object.values(STATUS),
      default: STATUS.LOCKED,
      required: true,
    },
    reflectionText: { type: String, default: '' },
    codeSubmission: { type: String, default: '' },
    quizPassed: { type: Boolean, default: false },
    xpEarned: { type: Number, default: 0, min: 0 },
    completedAt: { type: Date, default: null },
    updatedAt: { type: Date, default: null },
    // Story round: increments each time the user asks for a fresh story.
    // A positive value means the module has a cached generated story.
    storyRound: { type: Number, default: 0 },
    // Cached generated module content keyed by storyRound.
    // Stores full module content so the same round always returns the same
    // story, task, quiz, and reflection (persists, survives server restarts).
    storyCache: {
      type: Map,
      of: {
        story: String,
        whyPairing: String,
        practicalTask: String,
        quizQuestion: String,
        quizChoices: [String],
        quizAnswer: String,
        reflectionPrompt: String,
        generatedAt: Date,
      },
      default: {},
    },
    // ── Problem-first step tracking ──────────────────────────────
    // One of: 'problem' | 'think' | 'evaluated' | 'reveal' | 'applied' | 'quiz' | 'done'
    currentStep: {
      type: String,
      enum: ['problem', 'think', 'evaluated', 'reveal', 'applied', 'quiz', 'done'],
      default: 'problem',
    },
    // Step 2: what the learner typed as their own approach
    learnerAnswer: { type: String, default: '' },
    // Step 3: result of the AI evaluating learnerAnswer
    evaluationResult: {
      score: { type: Number, default: 0 },
      summary: { type: String, default: '' },
      strengths: { type: [String], default: () => [] },
      gaps: { type: [String], default: () => [] },
      gapBridge: { type: String, default: '' },
      readyForReveal: { type: Boolean, default: false },
      remedialHint: { type: String, default: '' },
    },
    // Step 4: user has viewed the pythonSolution
    pythonSolutionViewed: { type: Boolean, default: false },
  },
  { timestamps: false }
);

// One progress record per (user, module).
userProgressSchema.index({ userId: 1, moduleId: 1 }, { unique: true });

userProgressSchema.statics.STATUS = STATUS;

module.exports = mongoose.model('UserProgress', userProgressSchema);
module.exports.STATUS = STATUS;
