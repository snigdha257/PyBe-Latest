const mongoose = require('mongoose');

const caseStudySchema = new mongoose.Schema(
  {
    pathId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'LearningPath', 
      required: true 
    },
    title: { 
      type: String, 
      required: true 
    },
    scenario: { 
      type: String, 
      required: true 
      // Real-world narrative framing matching the storytelling tone of existing Module.story text
    },
    buggyCode: { 
      type: String, 
      required: true 
      // Code with a deliberate bug rooted in a misunderstanding of that layer's concepts
    },
    expectedOutput: { 
      type: String, 
      required: true 
      // What correct code should print, used for auto-validation
    },
    hints: { 
      type: [String], 
      default: [] 
      // Progressive hints (2-3), revealed one at a time if the learner asks
    },
    reflectionPrompt: { 
      type: String, 
      required: true 
      // Asks them to explain what was wrong and why
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('CaseStudy', caseStudySchema);
