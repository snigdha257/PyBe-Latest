/**
 * Module completion helper.
 *
 * The rules from the product spec:
 *
 *   Whenever both a non-empty reflectionText AND quizPassed=true exist
 *   for a UserProgress document:
 *     - mark it "completed"
 *     - set the NEXT module (by order, same path) to "unlocked"
 *     - award 15 XP to the User: 10 for the passed quiz, 5 for the
 *       written reflection
 *   If it's the last module in its path, the unlock step is a no-op.
 *
 * `tryCompleteAndUnlock` is the single source of truth for that rule.
 * Both /reflection and /quiz routes call it after they persist, so the
 * behaviour stays consistent regardless of which input triggered it.
 *
 * Sticky semantics:
 *   - once status='completed', it stays completed (never un-completed)
 *   - once quizPassed=true, it stays true (the user has already
 *     demonstrated they know it; re-submitting a wrong answer doesn't
 *     "un-pass" them)
 *   - reflectionText can be edited freely; we don't strip a non-empty
 *     reflection once it's saved (the user might want to revise), but
 *     completion never regresses
 *   - XP is awarded exactly once per module — the early-return on
 *     already-completed prevents double-award if /reflection or /quiz
 *     gets called again on a finished module
 */

const { Module, UserProgress, LearningPath, User } = require('../models');

// XP breakdown per spec: 10 for the passed quiz + 5 for the reflection.
const XP_QUIZ_PASS = 10;
const XP_REFLECTION = 5;
const XP_PER_MODULE = XP_QUIZ_PASS + XP_REFLECTION; // 15

/**
 * @param {ObjectId|String} userId
 * @param {Object} moduleDoc  the Module document (lean or full)
 * @param {Object} progress   the UserProgress document (mutable, not saved yet)
 * @returns {Promise<{
 *   completed: boolean,         // true if THIS call just flipped to completed
 *   alreadyCompleted: boolean,  // true if was already completed before
 *   unlockedNext: null | {
 *     moduleId: String,
 *     name: String,
 *     order: Number,
 *     pathName: String | null,
 *   },
 *   xpAwarded: number           // XP credited to the User on this call (0 if not a completion)
 * }>}
 */
async function tryCompleteAndUnlock(userId, moduleDoc, progress) {
  // Already done — short-circuit so we never re-fire downstream effects
  // (and crucially so we don't double-award XP).
  if (progress.status === 'completed') {
    return {
      completed: false,
      alreadyCompleted: true,
      unlockedNext: null,
      xpAwarded: 0,
    };
  }

  const hasReflection =
    typeof progress.reflectionText === 'string' &&
    progress.reflectionText.trim().length > 0;

  if (!hasReflection || !progress.quizPassed) {
    return {
      completed: false,
      alreadyCompleted: false,
      unlockedNext: null,
      xpAwarded: 0,
    };
  }

  // ── Mark this module complete ─────────────────────────────────────
  progress.status = 'completed';
  progress.completedAt = new Date();
  progress.xpEarned = (progress.xpEarned || 0) + XP_PER_MODULE;
  progress.updatedAt = new Date();
  await progress.save();

  // ── Award XP to the User (15 = 10 quiz + 5 reflection) ───────────
  // $inc is atomic on MongoDB, so even if two completion calls race
  // (they shouldn't, given the early return) the totals stay consistent.
  await User.findByIdAndUpdate(userId, { $inc: { xp: XP_PER_MODULE } });

  // ── Find + unlock the next module in the same path ───────────────
  const nextModule = await Module.findOne({
    pathId: moduleDoc.pathId,
    order: moduleDoc.order + 1,
  }).lean();

  if (!nextModule) {
    return {
      completed: true,
      alreadyCompleted: false,
      unlockedNext: null,
      xpAwarded: XP_PER_MODULE,
    };
  }

  // UserProgress for the next module was seeded at signup. Flip it
  // from 'locked' to 'unlocked'. We deliberately don't upsert — if
  // the doc is missing for some reason, something upstream is wrong
  // and silent creation would mask it.
  const updated = await UserProgress.findOneAndUpdate(
    { userId, moduleId: nextModule._id },
    { $set: { status: 'unlocked', updatedAt: new Date() } },
    { new: true }
  ).lean();

  // Path name is just for the celebration UI on the client.
  const pathDoc = await LearningPath.findById(moduleDoc.pathId)
    .select('name')
    .lean();

  return {
    completed: true,
    alreadyCompleted: false,
    unlockedNext: {
      moduleId: String(nextModule._id),
      name: nextModule.name,
      order: nextModule.order,
      pathName: pathDoc?.name || null,
      // Helpful flag for client: was the next doc actually found/updated?
      persisted: !!updated,
    },
    xpAwarded: XP_PER_MODULE,
  };
}

/**
 * Checks if a user has completed all modules in a given learning path.
 * A module is considered completed if its status is 'completed' or 'completed_via_placement'.
 * 
 * @param {ObjectId|String} userId 
 * @param {ObjectId|String} pathId 
 * @returns {Promise<boolean>}
 */
async function isPathCompleted(userId, pathId) {
  const modules = await Module.find({ pathId }).select('_id').lean();
  if (!modules || modules.length === 0) return false;

  const moduleIds = modules.map(m => m._id);
  const progressDocs = await UserProgress.find({
    userId,
    moduleId: { $in: moduleIds }
  }).select('status').lean();

  if (progressDocs.length !== moduleIds.length) return false;

  return progressDocs.every(
    p => p.status === 'completed' || p.status === 'completed_via_placement'
  );
}

async function checkPathCaseStudyUnlock(userId, pathId) {
  return await isPathCompleted(userId, pathId);
}

module.exports = {
  tryCompleteAndUnlock,
  isPathCompleted,
  checkPathCaseStudyUnlock,
  XP_QUIZ_PASS,
  XP_REFLECTION,
  XP_PER_MODULE,
};