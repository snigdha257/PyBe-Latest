require('dotenv').config();
const mongoose = require('mongoose');
const { User, LearningPath, Module, UserProgress } = require('../models');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  // Find the user by email
  const user = await User.findOne({ email: 'cherukuri.lohithkumar09@gmail.com' });
  if (!user) {
    console.error('User not found!');
    await mongoose.disconnect();
    return;
  }
  console.log('Found user:', user.email);

  // Check existing progress
  const existing = await UserProgress.find({ userId: user._id }).lean();
  console.log('Existing progress docs:', existing.length);

  if (existing.length > 0) {
    console.log('Progress already exists, nothing to do.');
    await mongoose.disconnect();
    return;
  }

  // Build initial progress (same logic as buildInitialProgress in auth.js)
  const paths = await LearningPath.find().lean();
  const modules = await Module.find().lean();

  const firstOrderByPath = new Map();
  for (const m of modules) {
    const key = String(m.pathId);
    const prev = firstOrderByPath.get(key);
    if (!prev || m.order < prev.order) {
      firstOrderByPath.set(key, m.order);
    }
  }

  const docs = modules.map((m) => {
    const isFirst = m.order === firstOrderByPath.get(String(m.pathId));
    return {
      userId: user._id,
      moduleId: m._id,
      status: isFirst ? 'unlocked' : 'locked',
    };
  });

  await UserProgress.insertMany(docs, { ordered: false });
  console.log('Seeded', docs.length, 'progress records.');
  console.log('Unlocked:', docs.filter(d => d.status === 'unlocked').map(d => {
    const m = modules.find(m => String(m._id) === String(d.moduleId));
    return m ? m.name : d.moduleId;
  }));

  await mongoose.disconnect();
})();