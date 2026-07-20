require('dotenv').config();
const mongoose = require('mongoose');
const { User, Module, UserProgress } = require('../models');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const users = await User.find().lean();
  console.log('Users:', users.length, users.map(u => u.email));

  const mods = await Module.find().lean();
  console.log('Modules:', mods.length, mods.map(m => ({ id: m._id, name: m.name, order: m.order })));

  const up = await UserProgress.find().lean();
  console.log('UserProgress docs:', up.length);
  console.log('Sample:', JSON.stringify(up.slice(0, 3), null, 2));

  const locked = up.filter(p => p.status === 'locked').length;
  const unlocked = up.filter(p => p.status === 'unlocked').length;
  const completed = up.filter(p => p.status === 'completed').length;
  console.log('Locked:', locked, '| Unlocked:', unlocked, '| Completed:', completed);

  await mongoose.disconnect();
})();