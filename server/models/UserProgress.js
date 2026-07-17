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
  },
  { timestamps: false }
);

// One progress record per (user, module).
userProgressSchema.index({ userId: 1, moduleId: 1 }, { unique: true });

userProgressSchema.statics.STATUS = STATUS;

module.exports = mongoose.model('UserProgress', userProgressSchema);
module.exports.STATUS = STATUS;
