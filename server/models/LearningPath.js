const mongoose = require('mongoose');

const learningPathSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
    order: { type: Number, required: true, unique: true },
  },
  { timestamps: false }
);

module.exports = mongoose.model('LearningPath', learningPathSchema);
