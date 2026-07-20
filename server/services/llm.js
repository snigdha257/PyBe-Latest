/**
 * llm.js — Groq-powered story generation + solution evaluation
 *
 * Story generation:
 *   Uses the learner's chosen theme to tell a narrative, then derives
 *   task/quiz/reflection from the same story world.
 *   → generateModuleContent(moduleName, learnerName, theme) → ModuleCacheEntry
 *
 * Solution evaluation:
 *   Reads the learner's self-reported approach, evaluates it against
 *   the module's criteria, and gives honest specific feedback.
 *   → evaluateSolution(module, learnerAnswer) → EvaluationResult
 */

const OpenAI = require('openai');

// ── Groq client ───────────────────────────────────────────────────────────────

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

let client = null;

function getClient() {
  if (!client) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not set in server/.env');
    }
    client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: GROQ_BASE_URL,
    });
  }
  return client;
}

// ── Theme → narrative frames ─────────────────────────────────────────────────

const VALID_THEMES = ['detective', 'scholar', 'space', 'courtroom'];

/**
 * Maps a theme to its narrative frames per module.
 * Each module has 4 frames (one per theme).  Index 0=det, 1=sch, 2=sp, 3=court.
 */
const MODULE_NARRATIVE_FRAMES = {
  Variables: [
    `A detective in 1940s London maps pseudonyms back to their real identities — the same person, different names.`,
    `Two scholars in a vast ancient library discover that the same text appears under different titles across different wings.`,
    `A space mission where a signal from Earth is received under two different code names at mission control, pointing to the same data.`,
    `A courtroom where a witness gives two different testimonies under two different aliases, both pointing to the same event.`,
  ],
  Conditionals: [
    `A lighthouse keeper must choose exactly one action each night based on the weather patterns observed through the window.`,
    `A cartographer mapping an island must classify each terrain feature into exactly one category — never two, never none.`,
    `A chess player evaluating a position where only one move is truly sound after analyzing all alternatives.`,
    `A judge reviewing evidence that points in exactly one direction, rejecting all other possible interpretations.`,
  ],
  Loops: [
    `A marathon runner training on a track that gets shorter each lap, but the finish line keeps retreating just out of reach.`,
    `A music composer transcribing an infinite melody, notating each phrase until silence finally falls below the threshold of hearing.`,
    `An explorer charting a cave system that seems to shrink by half with every expedition, yet never quite ends.`,
    `A mathematician at a chalkboard proving that Achilles will catch the tortoise by actually running the numbers step by step.`,
  ],
  Lists: [
    `A museum curator arranging artifacts in chronological order, leaving gaps for objects not yet discovered or donated.`,
    `A mapmaker plotting cities along a trade route, some entries blank because the cities haven't been visited yet.`,
    `A recipe developer organizing ingredients by the step at which they're added, with placeholders for steps yet to be determined.`,
    `A music teacher cataloguing an orchestra roster, with some chairs empty and marked "to be announced."`,
  ],
  Dictionaries: [
    `A cryptographer decoding a message by matching cipher symbols to their plain-text equivalents, one-to-one.`,
    `An archivist in a vast library who can fetch any book's location instantly by its title, without scanning shelves.`,
    `A chef who keeps a personal glossary of flavor pairings — lookup a base ingredient, instantly get its best companions.`,
    `A customs officer at a border crossing who checks a traveller's document ID against a master registry of approved names.`,
  ],
  Functions: [
    `A master watchmaker who designs a single mechanism that accepts any gear size and returns a calibrated timepiece.`,
    `A translator at the United Nations who receives any sentence in one language and returns its exact equivalent in another.`,
    `A single musical score that, when performed with any lead instrument, adapts and returns a complete arrangement.`,
    `An alchemist's formula that accepts any base metal and returns its transformed equivalent — the same process, every time.`,
  ],
  Exceptions: [
    `A ship captain who has prepared for every weather condition except the fog bank that materialised at dawn from nowhere.`,
    `A city planner who designed bridges for every flood level recorded in history, only for an unprecedented surge to test them.`,
    `A doctor who has studied every known illness but faces a patient whose symptoms don't match any textbook case.`,
    `An astronaut who trained for every malfunction on the checklist, and then the computer displayed an error code that wasn't there.`,
  ],
  Classes: [
    `An architect who draws the same blueprint for a library in Paris, one in Kyoto, and one in Cairo — the essence unchanged, the details unique to each.`,
    `A sculptor explaining that the marble block contains the statue already; the work is in removing everything that isn't it.`,
    `A biologist classifying a newly discovered species — defining what makes it a chair is the genus, the individual markings are its accidents.`,
    `A playwright who gives the same core script to three different directors and gets three entirely different productions, all faithful to the play.`,
  ],
  Decorators: [
    `A master painter who frames canvases — adding a border and protection — without touching a single brushstroke of the original art.`,
    `A translator who adds footnotes to a foreign text, enriching it for a new audience while leaving the original prose untouched.`,
    `A royal herald who announces a knight's arrival at each castle gate, adding context about their deeds without changing who they are.`,
    `A luthier who adds resonance to a violin's sound by subtly adjusting the bridge, improving its voice without altering the instrument itself.`,
  ],
};

/**
 * Select a narrative frame by module name + user theme.
 */
function selectFrame(moduleName, theme) {
  const frames = MODULE_NARRATIVE_FRAMES[moduleName];
  if (!frames) return null;
  const themeIndex = VALID_THEMES.indexOf(theme);
  return frames[themeIndex === -1 ? 0 : themeIndex];
}

// ── Story generation ──────────────────────────────────────────────────────────

const STORY_SYSTEM_PROMPT =
  'You are a creative short-story writer and programming educator. You weave Python programming concepts into compelling human narratives, then derive the learning exercise, quiz, and reflection from the same narrative.';

function buildStoryPrompt(moduleName, learnerName, theme) {
  const template = {
    pythonConcept: {
      Variables: 'Variables in Python: a name bound to a value, where the same value can have multiple names.',
      Conditionals: "If/elif/else in Python: exactly one branch executes, reflecting Aristotle's law of non-contradiction.",
      Loops: "While loops in Python: repeated action with a halting condition, resolving Zeno's paradox mechanically.",
      Lists: "Lists in Python: ordered, indexed, mutable sequences where position carries meaning, like Mendeleev's periodic table.",
      Dictionaries: 'Dictionaries in Python: key-value lookup by meaning, not position — a translation table in constant time.',
      Functions: 'Functions in Python: self-contained machines that take input and return output, inspired by Alonzo Church\'s lambda calculus.',
      Exceptions: 'Try/except in Python: handling the unexpected gracefully, inspired by Taleb\'s Black Swan — plan for the case you didn\'t anticipate.',
      Classes: 'Classes in Python: blueprints defining essential attributes and behaviours, echoing Aristotle\'s substance vs. accident.',
      Decorators: 'Decorators in Python: functions that wrap other functions, adding behaviour without modifying the inner function — a Hofstadter strange loop.',
    }[moduleName] || moduleName,
    narrativeFrame: selectFrame(moduleName, theme),
  };

  return `You are writing a complete, self-contained learning module for a learner named "${learnerName}".

STORY PREMISE (USE THIS EXACT SETTING):
${template.narrativeFrame}

PYTHON CONCEPT: "${template.pythonConcept}"

Your job — write ALL SIX parts below, all grounded in the same story premise above:

1. STORY (~200 words): A vivid, self-contained narrative where "${template.pythonConcept}" feels inevitable. The learner (${learnerName}) is a character. No mention of Python, programming, or code. End with a sentence connecting the story back to the concept.

2. WHY THIS PAIRING (50–80 words): How the narrative illuminates the Python concept from a computer science perspective.

3. PRACTICAL TASK (60–100 words): A concrete coding exercise the learner can attempt. Ground it in the SAME story world — the character needs to solve a problem that maps directly to ${template.pythonConcept} in Python.

4. QUIZ QUESTION (1 sentence, no mention of Python): A single multiple-choice question the learner can only answer correctly if they understood the story's connection to ${template.pythonConcept}.

5. QUIZ CHOICES (4 options, a/b/c/d): Four plausible but distinct answers. One is clearly correct given the story. Three are wrong but sound plausible. Label each as "a)", "b)", "c)", "d)". Include a "correctAnswer" field with the letter of the correct choice.

6. REFLECTION PROMPT (1–2 sentences): An open-ended question inviting the learner to connect the story to their own thinking or experience.

Return ONLY valid JSON in this exact format, no markdown, no explanation:
{
  "story": "...",
  "whyPairing": "...",
  "practicalTask": "...",
  "quizQuestion": "...",
  "quizChoices": ["a) ...", "b) ...", "c) ...", "d) ..."],
  "correctAnswer": "c",
  "reflectionPrompt": "..."
}`;
}

/**
 * Generate story + quiz + task for a module, themed to the user's preference.
 * storyRound 0 = seeded DB content (not this function).
 *
 * @param {string} moduleName  - e.g. "Variables", "Conditionals"
 * @param {string} learnerName - the user's display name
 * @param {string} theme       - 'detective' | 'scholar' | 'space' | 'courtroom'
 * @returns {Promise<ModuleCacheEntry>}
 */
async function generateModuleContent(moduleName, learnerName, theme) {
  if (!theme) {
    throw new Error('theme is required to generate module content');
  }

  const frames = MODULE_NARRATIVE_FRAMES[moduleName];
  if (!frames) {
    throw new Error(`No prompt template found for module: "${moduleName}"`);
  }

  const userPrompt = buildStoryPrompt(moduleName, learnerName, theme);
  const openai = getClient();

  const response = await openai.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: STORY_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 1.0,
    max_tokens: 1200,
    response_format: { type: 'json_object' },
  });

  const raw = response.choices[0].message.content.trim();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`LLM returned non-JSON response: ${raw.slice(0, 300)}`);
  }

  if (!Array.isArray(parsed.quizChoices) || parsed.quizChoices.length !== 4) {
    throw new Error(`LLM returned invalid quizChoices: ${JSON.stringify(parsed.quizChoices)}`);
  }

  const rawAnswer = parsed.correctAnswer || parsed.quizAnswer || 'a';
  const quizAnswer = String(rawAnswer).trim().toLowerCase().replace(/^([a-d])\s*\)/i, '$1');

  return {
    story: (parsed.story || '').trim(),
    whyPairing: (parsed.whyPairing || '').trim(),
    practicalTask: (parsed.practicalTask || '').trim(),
    quizQuestion: (parsed.quizQuestion || '').trim(),
    quizChoices: parsed.quizChoices.map(String),
    quizAnswer,
    reflectionPrompt: (parsed.reflectionPrompt || '').trim(),
    generatedAt: new Date(),
  };
}

// ── Solution evaluation ───────────────────────────────────────────────────────

const EVAL_SYSTEM_PROMPT = `You are a thoughtful programming instructor who has just watched a learner attempt to solve a real-world problem in their own words, before they've seen any Python code.

Your job is to:
1. Read the learner's approach carefully
2. Evaluate it honestly against the module's criteria
3. Give specific, encouraging feedback that addresses BOTH what they got right AND where their thinking could deepen
4. Identify the key gap between their intuition and how Python actually solves the problem
5. Prepare them for the Python reveal by naming what to watch for

Be direct but warm. A learner who says "I'd write down the numbers and compare them" is on the right track — tell them that, then show them how variables make that effortless.

Respond ONLY with valid JSON:
{
  "score": 0-100,
  "summary": "1-sentence verdict on their approach",
  "strengths": ["what they got right"],
  "gaps": ["what's missing or could be sharper"],
  "gapBridge": "plain-English explanation of the key conceptual leap Python makes for this problem",
  "readyForReveal": true/false,
  "remedialHint": "if readyForReveal is false, a 1-sentence nudge toward the right thinking"
}`;

/**
 * Evaluate a learner's self-reported solution approach.
 *
 * @param {object} module          - Module document (problem, evaluationCriteria, pythonSolution)
 * @param {string} learnerAnswer   - What the learner wrote in the "Think" step
 * @returns {Promise<EvaluationResult>}
 */
async function evaluateSolution(module, learnerAnswer) {
  const openai = getClient();

  const criteriaList =
    module.evaluationCriteria?.length > 0
      ? module.evaluationCriteria.map((c, i) => `  ${i + 1}. ${c}`).join('\n')
      : '  (no explicit criteria provided)';

  const userPrompt = `EVALUATION CRITERIA (what a good solution should show):
${criteriaList}

THE PROBLEM THE LEARNER WAS GIVEN:
${module.problem}

THE LEARNER'S SELF-REPORTED APPROACH:
${learnerAnswer}

After reading the learner's approach, produce your evaluation JSON.`;

  const response = await openai.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: EVAL_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.4,
    max_tokens: 600,
    response_format: { type: 'json_object' },
  });

  const raw = response.choices[0].message.content.trim();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Evaluation LLM returned non-JSON: ${raw.slice(0, 300)}`);
  }

  return {
    score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
    summary: String(parsed.summary || '').trim(),
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
    gapBridge: String(parsed.gapBridge || '').trim(),
    readyForReveal: Boolean(parsed.readyForReveal),
    remedialHint: parsed.remedialHint ? String(parsed.remedialHint).trim() : null,
  };
}

module.exports = {
  generateModuleContent,
  evaluateSolution,
  PROMPT_TEMPLATES: MODULE_NARRATIVE_FRAMES, // legacy alias
  VALID_THEMES,
};