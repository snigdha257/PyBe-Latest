const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema(
  {
    pathId: { type: mongoose.Schema.Types.ObjectId, ref: 'LearningPath', required: true, index: true },
    name: { type: String, required: true, trim: true },
    order: { type: Number, required: true },
<<<<<<< Updated upstream
=======

    // ── Problem-first content ────────────────────────────────────
    problem: {
      type: String,
      required: true,
      // A vivid, specific real-world scenario that makes the learner
      // think "I'd love a better way to do this" before they've seen
      // the Python concept.
    },

    // What the LLM uses to evaluate a learner's self-reported solution.
    // Each string is one positive evaluation criterion.
    evaluationCriteria: {
      type: [String],
      required: true,
    },

    // The canonical Python solution for this problem.
    pythonSolution: {
      explanation: { type: String, required: true }, // plain-English walkthrough
      code: { type: String, required: true },        // clean, runnable Python
    },

    // An optional second example for learners who need another perspective
    altExample: {
      explanation: { type: String },
      code: { type: String },
    },

    // ── Legacy fields (seeded content, unused in new flow) ───────
>>>>>>> Stashed changes
    story: { type: String, default: '' },
    whyPairing: { type: String, default: '' },
    practicalTask: { type: String, default: '' },
    reflectionPrompt: { type: String, default: '' },
    quizQuestion: { type: String, default: '' },
    quizChoices: { type: [String], default: [] },
    quizAnswer: { type: String, default: '' },
  },
  { timestamps: false }
);

// A module is unique within its path by (pathId, name) and by (pathId, order).
moduleSchema.index({ pathId: 1, name: 1 }, { unique: true });
moduleSchema.index({ pathId: 1, order: 1 }, { unique: true });

module.exports = mongoose.model('Module', moduleSchema);
