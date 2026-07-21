const mongoose = require('mongoose');

const placementQuizSchema = new mongoose.Schema(
  {
    pathId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LearningPath',
      required: true,
    },
    questions: [
      {
        question: { type: String, required: true },
        choices: [{ type: String, required: true }],
        correctIndex: { type: Number, required: true },
      },
    ],
    passingScore: {
      type: Number,
      default: 4,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PlacementQuiz', placementQuizSchema);
