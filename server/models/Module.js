/**
 * Module.js — Updated schema for problem-first teaching:
 *
 *   problem         → Real-world scenario that demands this concept
 *   pythonConcept   → The Python concept name (e.g. "Variables", "Conditionals")
 *   evaluationCriteria → Array of "good properties" the LLM uses to grade
 *   solutionGuide   → What a correct approach looks like (for LLM reference)
 *   pythonSolution  → Clean code + plain-English explanation of the Python answer
 *
 * The `content` block (story, quiz, etc.) is retired — replaced by
 * problem-first fields above. storyRound and storyCache on UserProgress
 * are now unused but kept for migration safety.
 */
const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    pathId: { type: mongoose.Schema.Types.ObjectId, ref: 'LearningPath', required: true },
    order: { type: Number, required: true },

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

    // ── Legacy fields (seeded content, unused in new flow) ───────
    story: { type: String, default: '' },
    whyPairing: { type: String, default: '' },
    practicalTask: { type: String, default: '' },
    quizQuestion: { type: String, default: '' },
    quizChoices: { type: [String], default: () => [] },
    quizAnswer: { type: String, default: 'a' },
    reflectionPrompt: { type: String, default: '' },
  },
  { timestamps: false }
);

// Unique (pathId, order) pair
moduleSchema.index({ pathId: 1, order: 1 }, { unique: true });

module.exports = mongoose.model('Module', moduleSchema);