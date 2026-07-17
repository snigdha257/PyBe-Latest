const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema(
  {
    pathId: { type: mongoose.Schema.Types.ObjectId, ref: 'LearningPath', required: true, index: true },
    name: { type: String, required: true, trim: true },
    order: { type: Number, required: true },
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
