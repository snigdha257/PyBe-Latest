/**
 * Substitutes `{learner}` (case-insensitive) with the given name in a string.
 * Used server-side so the client doesn't need to know about the placeholder.
 *
 * If `name` is missing/blank, the placeholder is just removed (better than
 * showing literal `{learner}` in the UI).
 */
function substituteLearner(text, name) {
  if (!text) return text;
  const safe = (name || '').trim() || 'learner';
  return text.replace(/\{learner\}/gi, safe);
}

module.exports = { substituteLearner };
