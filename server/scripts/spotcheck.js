/**
 * Spot-check the seed output.
 *
 * Confirms:
 *   • counts (3 paths, 9 modules)
 *   • 2–3 full modules printed so the user can compare against the source markdown
 *   • every module's quizChoices + quizAnswer pair is present and the answer is
 *     actually inside the choices array (otherwise the quiz is unwinnable)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { LearningPath, Module } = require('../models');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const pathCount = await LearningPath.countDocuments();
  const moduleCount = await Module.countDocuments();
  console.log(`Collection counts:  learningpaths=${pathCount}  modules=${moduleCount}`);

  // 1) Print all three paths
  console.log('\n--- All LearningPaths ---');
  const paths = await LearningPath.find().sort({ order: 1 }).lean();
  for (const p of paths) {
    console.log(`  ${p.order}. ${p.name} — ${p.description}`);
  }

  // 2) Print 3 representative modules end-to-end so the user can eyeball them
  const samples = ['Variables', 'Dictionaries', 'Decorators'];
  console.log('\n--- Spot-check (3 modules, full content) ---');
  for (const name of samples) {
    const m = await Module.findOne({ name })
      .populate('pathId', 'name order')
      .lean();
    if (!m) {
      console.log(`  ❌ Could not find module "${name}"`);
      continue;
    }
    console.log(`\n  ▸ [${m.pathId.name}] ${m.order}. ${m.name}`);
    console.log(`    story:            ${m.story}`);
    console.log(`    whyPairing:       ${m.whyPairing}`);
    console.log(`    practicalTask:    ${m.practicalTask}`);
    console.log(`    reflectionPrompt: ${m.reflectionPrompt}`);
    console.log(`    quizQuestion:     ${m.quizQuestion}`);
    console.log(`    quizChoices:      [${m.quizChoices.map((c) => `"${c}"`).join(', ')}]`);
    console.log(`    quizAnswer:       "${m.quizAnswer}"`);
    console.log(
      `    ✓ quizAnswer in quizChoices? ${m.quizChoices.includes(m.quizAnswer)}`
    );
  }

  // 3) Sweep every module to make sure answer is a member of choices
  console.log('\n--- Quiz integrity sweep (all 9 modules) ---');
  const all = await Module.find().populate('pathId', 'name').lean();
  let bad = 0;
  for (const m of all) {
    const inChoices = m.quizChoices.includes(m.quizAnswer);
    const status = inChoices ? '✅' : '❌';
    console.log(
      `  ${status} ${m.pathId.name.padEnd(11)}/${m.name.padEnd(13)} ` +
      `answer in ${m.quizChoices.length} choices`
    );
    if (!inChoices) bad++;
  }
  if (bad === 0) console.log('\n✅ Every module has a quiz whose answer is one of its choices.');
  else console.log(`\n❌ ${bad} module(s) have an answer not present in quizChoices.`);

  await mongoose.disconnect();
})();