const mongoose = require('mongoose');

const storyWorldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    tagline: { type: String, required: true },
    description: { type: String, required: true },
    flavorText: { type: String, required: true },
    icon: { type: String, required: true },
    colors: {
      primary: { type: String, required: true },
      accent: { type: String, required: true },
    },
  },
  { timestamps: false }
);

module.exports = mongoose.model('StoryWorld', storyWorldSchema);
