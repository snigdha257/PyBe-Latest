const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    xp: { type: Number, default: 0 },
    theme: {
      type: String,
      enum: ['detective', 'scholar', 'space', 'courtroom'],
      default: null,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

module.exports = mongoose.model('User', userSchema);
