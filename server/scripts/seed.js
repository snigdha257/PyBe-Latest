/**
 * PyBe Latest — seed script
 *
 * One-off script. Run with: `npm run seed`
 *
 * Connects to MongoDB using MONGO_URI from .env, then inserts
 *   • 3 LearningPaths:   Foundations, Structures, Design
 *   • 9 Modules:         one per file from pybe-mvp-case-studies.md
 *
 * Idempotency:
 *   • Wipes only LearningPath / Module collections before inserting
 *     (User / UserProgress are left untouched).
 *   • Will refuse to wipe if --keep is passed.
 *
 * The quiz* fields on Module are required by schema. The case-study
 * source doc doesn't ship quiz text, so the seed derives a small
 * multiple-choice question from each module's story so the modules
 * are usable immediately. Each is a single-correct-answer check
 * against the pairing concept.
 */

require('dotenv').config();

const mongoose = require('mongoose');
const { LearningPath, Module } = require('../models');

const KEEP_EXISTING = process.argv.includes('--keep');

const PATHS = [
  {
    name: 'Foundations',
    description: 'Variables → Conditionals → Loops',
    order: 1,
  },
  {
    name: 'Structures',
    description: 'Lists → Dictionaries → Functions',
    order: 2,
  },
  {
    name: 'Design',
    description: 'Exceptions → Classes → Decorators',
    order: 3,
  },
];

// 9 modules — verbatim content from pybe-mvp-case-studies.md,
// plus a short quiz derived from each module's pairing.
const MODULES = [
  // ── Path 1 · Foundations ───────────────────────────────────────
  {
    pathName: 'Foundations',
    name: 'Variables',
    order: 1,
    story:
      'In a quiet study, {learner} is handed two slips of paper. ' +
      'One reads "the morning star," the other "the evening star." ' +
      'A logician explains that both names point to the exact same object — ' +
      'the planet Venus — yet the mind holds them as two separate thoughts, ' +
      'because each name arrived by a different route.',
    whyPairing:
      'Frege split meaning into sense (the route to a thing) and reference ' +
      '(the thing itself). A variable works the same way — it\'s a label with ' +
      'its own sense, bound to a value that is its reference. Two variables ' +
      'can carry entirely different names while pointing at the identical piece of data.',
    practicalTask:
      'Assign the same list to two differently-named variables. Use `is` to show ' +
      'they reference the same object in memory, then reassign one variable to a new ' +
      'value and show the other is untouched.',
    reflectionPrompt:
      'Where in my life do two different names point to the exact same thing?',
    quizQuestion: 'Which philosopher\'s distinction does a Python variable most directly mirror?',
    quizChoices: [
      'Frege — sense vs. reference',
      'Aristotle — substance vs. accident',
      'Zeno — infinite subdivision',
      'Hofstadter — strange loops',
    ],
    quizAnswer: 'Frege — sense vs. reference',
  },
  {
    pathName: 'Foundations',
    name: 'Conditionals',
    order: 2,
    story:
      'In the Lyceum, Aristotle lays down a rule he considers the bedrock of all ' +
      'reasoning: a thing cannot both be and not be, in the same sense, at the same ' +
      'time. A statement is either true or it isn\'t — there is no third position to ' +
      'stand on. {learner} is asked to test this against a string of everyday claims, ' +
      'sorting each one into "holds" or "fails."',
    whyPairing:
      'An if/elif/else chain is Aristotle\'s law made executable — the program ' +
      'evaluates a condition and commits to exactly one branch, never both, never ' +
      'neither. Each elif is a new claim tested only once the one before it has failed.',
    practicalTask:
      'Write a grading function that takes a numeric score and returns a letter grade ' +
      'using an if/elif/else chain, then add a boundary case (e.g. exactly 90) to confirm ' +
      'only one branch ever fires.',
    reflectionPrompt:
      'What decision have I been treating as binary that might actually have a middle ground?',
    quizQuestion: 'In an `if/elif/else` chain, how many branches can fire for a single input?',
    quizChoices: ['Exactly one', 'As many as match', 'Either zero or one', 'At least two'],
    quizAnswer: 'Exactly one',
  },
  {
    pathName: 'Foundations',
    name: 'Loops',
    order: 3,
    story:
      'Achilles can never catch the tortoise, Zeno insists — for every gap he closes, ' +
      'a smaller one remains, forever. {learner} is asked to prove him wrong, one step ' +
      'at a time, by actually closing the distance rather than arguing about it.',
    whyPairing:
      'A loop is Zeno\'s paradox resolved in miniature: infinite subdivision becomes ' +
      'finite, mechanical repetition with a clear stopping point. It\'s also a ' +
      'plain-language Turing machine — a state, a rule for changing it, and a halt condition.',
    practicalTask:
      'Write a `while` loop that halves a distance each iteration until it falls below ' +
      'a small threshold, then print how many iterations it took to "catch the tortoise."',
    reflectionPrompt:
      'What tells my loop when to stop — and what would happen if it never did?',
    quizQuestion: 'A loop is described as which two ideas working together?',
    quizChoices: [
      'Zeno\'s paradox and a Turing machine',
      'Sense and reference',
      'Substance and accident',
      'The Rosetta Stone and lambda calculus',
    ],
    quizAnswer: 'Zeno\'s paradox and a Turing machine',
  },

  // ── Path 2 · Structures ────────────────────────────────────────
  {
    pathName: 'Structures',
    name: 'Lists',
    order: 1,
    story:
      'In 1869, Mendeleev arranges the known elements by atomic weight and notices ' +
      'something strange: the pattern only holds if he leaves some spaces blank. He ' +
      'predicts three elements that don\'t yet exist, trusting the order of the ' +
      'structure over what\'s currently known to fill it.',
    whyPairing:
      'A list is an ordered, indexed, mutable sequence — position carries meaning, ' +
      'just as it did on Mendeleev\'s table. A placeholder value (like None) can hold ' +
      'a seat for data that hasn\'t arrived yet, exactly as blank cells held space ' +
      'for undiscovered elements.',
    practicalTask:
      'Build a list of eight elements where three positions are None. Print the list, ' +
      'then "discover" each missing element by assigning a real value to its index, ' +
      'and print the list again to show the completed order.',
    reflectionPrompt:
      'What in my life is ordered but incomplete — arranged around a piece that hasn\'t arrived yet?',
    quizQuestion: 'Which historical structure does a Python list most closely mirror?',
    quizChoices: [
      'Mendeleev\'s periodic table',
      'The Rosetta Stone',
      'Lambda calculus',
      'A Bach fugue',
    ],
    quizAnswer: 'Mendeleev\'s periodic table',
  },
  {
    pathName: 'Structures',
    name: 'Dictionaries',
    order: 2,
    story:
      '1799, near the town of Rosetta. Napoleon\'s soldiers unearth a slab of black ' +
      'basalt carved with the same royal decree written three times — in hieroglyphic, ' +
      'in demotic script, and in Greek. Scholars realize that if they know one script, ' +
      'they can look up its meaning directly through the others, without reading the ' +
      'whole stone end to end.',
    whyPairing:
      'A dictionary is a translation table in the truest sense — each key points ' +
      'straight to its value, in constant time, without scanning every entry first. ' +
      'It\'s lookup by meaning, not by position.',
    practicalTask:
      'Build a dictionary mapping five English words to their French equivalents. ' +
      'Write a small translator function that takes a word and returns its translation, ' +
      'or a clear message if the word isn\'t in the table.',
    reflectionPrompt:
      'What single key, if I had it, would unlock something I\'m currently searching for the long way?',
    quizQuestion: 'A Python dictionary gives you lookup by what?',
    quizChoices: ['Position', 'Meaning (the key)', 'Type', 'Memory address'],
    quizAnswer: 'Meaning (the key)',
  },
  {
    pathName: 'Structures',
    name: 'Functions',
    order: 3,
    story:
      '{learner} is shown a single symbol, λ, and told it can build every computable ' +
      'thing there is — arithmetic, logic, even other functions — from nothing but ' +
      'naming an input and substituting it into an expression.',
    whyPairing:
      'Alonzo Church built an entire model of computation from functions that take an ' +
      'input and return an output, nothing more. A Python function is that same idea, ' +
      'made readable — a self-contained machine with one job.',
    practicalTask:
      'Define a small named function that doubles a number and adds one, then rewrite ' +
      'the same logic as a `lambda` to see the identical machine stripped down to its essence.',
    reflectionPrompt: 'What is the smallest version of this idea I could still call complete?',
    quizQuestion: 'The "λ" symbol in lambda calculus represents what?',
    quizChoices: ['A variable', 'A function', 'A loop', 'A type'],
    quizAnswer: 'A function',
  },

  // ── Path 3 · Design ────────────────────────────────────────────
  {
    pathName: 'Design',
    name: 'Exceptions',
    order: 1,
    story:
      'For centuries, every swan anyone in Europe had ever seen was white — so ' +
      '"all swans are white" was treated as settled fact. Then explorers reached ' +
      'Australia and found black ones. One counterexample was enough to collapse a ' +
      'belief built on a lifetime of consistent evidence.',
    whyPairing:
      'Code written only for the cases you expect is a flock of white swans — it works ' +
      'perfectly until the one case nobody planned for shows up. try/except is the ' +
      'deliberate assumption that a black swan is out there somewhere, and a plan for ' +
      'surviving it without the whole program going down.',
    practicalTask:
      'Write a function that divides 100 by each number in a list. Wrap the division ' +
      'in a try/except block so that a zero in the list prints a warning and continues, ' +
      'instead of crashing the whole loop.',
    reflectionPrompt:
      'What\'s the black swan in something I\'ve built or planned — the one case I haven\'t accounted for?',
    quizQuestion: 'Taleb\'s "Black Swan" best motivates which Python construct?',
    quizChoices: ['if/else', 'try/except', 'for-loop', 'class'],
    quizAnswer: 'try/except',
  },
  {
    pathName: 'Design',
    name: 'Classes',
    order: 2,
    story:
      'Aristotle asks {learner} to describe a chair without describing any single ' +
      'chair — no color, no scratches, no particular room. What\'s left once every ' +
      'specific detail is stripped away is the essence: something with legs, a seat, ' +
      'and a purpose. Everything else is accident, not substance.',
    whyPairing:
      'A class is a substance in Aristotle\'s sense — the essential attributes and ' +
      'behaviors that define a category of thing, defined once, before any particular ' +
      'instance exists. Every object you create from it shares the essence and differs ' +
      'only in its "accidental" details.',
    practicalTask:
      'Design a Chair class holding only essential attributes (e.g. legs, material) and ' +
      'one behavior (e.g. a sit() method). Create two instances that differ only in their ' +
      'accidental details (color, owner) and show both still behave identically.',
    reflectionPrompt: 'What\'s essential to this class, and what\'s just one instance\'s detail?',
    quizQuestion: 'A Python class corresponds to Aristotle\'s notion of…',
    quizChoices: ['Matter', 'Form / Substance', 'Accident', 'Energy'],
    quizAnswer: 'Form / Substance',
  },
  {
    pathName: 'Design',
    name: 'Decorators',
    order: 3,
    story:
      '{learner} studies an Escher staircase that climbs forever without ever rising, ' +
      'and a Bach fugue that folds back into its own opening line. Both are structures ' +
      'that curl around and reference themselves without breaking.',
    whyPairing:
      'Hofstadter\'s "strange loop" describes a system that wraps around its own ' +
      'structure and comes back changed. A decorator does exactly this in code — a ' +
      'function that wraps another function, adding behavior around it without ever ' +
      'touching what\'s inside.',
    practicalTask:
      'Write a decorator that prints how long a function takes to run, then apply it ' +
      'to an existing function using the @ syntax — without editing a single line ' +
      'inside that function\'s body.',
    reflectionPrompt: 'What did I add without changing what was already there?',
    quizQuestion: 'A decorator most closely mirrors which concept from Hofstadter?',
    quizChoices: ['Strange loop', 'Lambda', 'Periodic table', 'Substance'],
    quizAnswer: 'Strange loop',
  },
];

async function seed() {
  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI is not set. Add it to server/.env first.');
    process.exit(1);
  }

  console.log('🔌 Connecting to MongoDB…');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected.');

  try {
    if (!KEEP_EXISTING) {
      console.log('🧹 Clearing existing LearningPath / Module collections…');
      await Promise.all([LearningPath.deleteMany({}), Module.deleteMany({})]);
    } else {
      console.log('⚠️  --keep passed; leaving existing data in place.');
    }

    console.log('🌱 Inserting LearningPaths…');
    const insertedPaths = await LearningPath.insertMany(PATHS);
    const pathByName = Object.fromEntries(insertedPaths.map((p) => [p.name, p]));

    console.log('🌱 Inserting Modules…');
    const moduleDocs = MODULES.map((m) => ({
      ...m,
      pathId: pathByName[m.pathName]._id,
    }));
    // drop the temp helper field
    for (const doc of moduleDocs) delete doc.pathName;
    await Module.insertMany(moduleDocs);

    const pathCount = await LearningPath.countDocuments();
    const moduleCount = await Module.countDocuments();
    console.log(`✅ Done. ${pathCount} paths, ${moduleCount} modules in DB.`);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected.');
  }
}

seed();
