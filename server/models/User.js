const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    xp: { type: Number, default: 0 },
    storyWorldId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StoryWorld',
      default: null,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

module.exports = mongoose.model('User', userSchema);
