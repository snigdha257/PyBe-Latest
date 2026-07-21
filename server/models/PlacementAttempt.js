const mongoose = require('mongoose');

const placementAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    pathId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LearningPath',
      required: true,
    },
    score: {
      type: Number,
      required: true,
    },
    passed: {
      type: Boolean,
      required: true,
    },
    attemptedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false } // Only attemptedAt is requested, standard createdAt/updatedAt are not explicitly requested.
);

module.exports = mongoose.model('PlacementAttempt', placementAttemptSchema);
