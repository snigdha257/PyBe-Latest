require('dotenv').config();
const mongoose = require('mongoose');
const { LearningPath, Module } = require('../models');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const paths = await LearningPath.find().sort({ order: 1 }).lean();
  const modules = await Module.find()
    .populate('pathId', 'name order')
    .sort({ 'pathId.order': 1, order: 1 })
    .lean();

  console.log(`--- PATHS (${paths.length}) ---`);
  for (const p of paths) {
    console.log(`  ${p.order}. ${p.name} — ${p.description}`);
  }

  console.log(`\n--- MODULES (${modules.length}) ---`);
  for (const m of modules) {
    console.log(
      `  [${m.pathId.name.padEnd(11)}] ${m.order}. ${m.name.padEnd(13)} ` +
      `(story: ${m.story.length}c, practicalTask: ${m.practicalTask.length}c, ` +
      `reflection: ${m.reflectionPrompt.length}c, quiz: ${m.quizChoices.length} choices, ` +
      `answer="${m.quizAnswer}")`
    );
  }

  // sanity: field-presence smoke test
  const required = ['story', 'whyPairing', 'practicalTask', 'reflectionPrompt', 'quizQuestion', 'quizChoices', 'quizAnswer'];
  let bad = 0;
  for (const m of modules) {
    for (const f of required) {
      const v = m[f];
      const empty = Array.isArray(v) ? v.length === 0 : !v;
      if (empty) {
        console.log(`  ⚠️  [${m.pathId.name}/${m.name}] missing ${f}`);
        bad++;
      }
    }
  }
  if (bad === 0) console.log('\n✅ All module fields populated.');
  else console.log(`\n❌ ${bad} missing fields.`);

  await mongoose.disconnect();
})();
