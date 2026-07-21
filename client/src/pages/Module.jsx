import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api';
<<<<<<< Updated upstream
import Skeleton from '../components/Skeleton';
=======
import CodeRunner from '../components/CodeRunner';
>>>>>>> Stashed changes

/**
 * Module page — the full learning experience for a single module.
 *
 * Renders, in order:
 *   1. Module name + path breadcrumb + status badge
 *   2. The story (with {learner} already substituted by the server)
 *   3. The "why this pairing" explanation
 *   4. The practical task description
 *   5. A <textarea> for the user's code with a "Save Draft" button
 *   6. A <textarea> for the user's reflection (labelled with the
 *      module's reflectionPrompt) with a "Save Reflection" button
 *   7. A multiple-choice quiz (radio buttons) with a "Submit Answer"
 *      button — when both reflection AND quiz passed exist, the server
 *      auto-marks the module "completed" and unlocks the next one
 *   8. A celebration card (visible once status='completed') with a
 *      "Next Module →" link if the server reported one
 *
 * The server enforces a 403 if the module is locked for this user.
 * We surface that with a clear locked-state UI instead of a redirect
 * — the user might have bookmarked the URL or hit a stale tab.
 */
export default function Module() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [module, setModule] = useState(null);
  const [progress, setProgress] = useState(null);
  const [path, setPath] = useState(null);

  // ── Draft (code) state ──────────────────────────────────────────────
  const [code, setCode] = useState('');
  const [draftState, setDraftState] = useState('idle'); // idle | saving | saved | error
  const [draftSavedAt, setDraftSavedAt] = useState(null);

  // ── Reflection state ────────────────────────────────────────────────
  const [reflection, setReflection] = useState('');
  const [reflectionState, setReflectionState] = useState('idle');
  const [reflectionSavedAt, setReflectionSavedAt] = useState(null);

  // ── Quiz state ──────────────────────────────────────────────────────
  const [quizChoice, setQuizChoice] = useState('');
  const [quizState, setQuizState] = useState('idle'); // idle | submitting | right | wrong
  const [quizFeedback, setQuizFeedback] = useState('');

  // ── Completion state ────────────────────────────────────────────────
  const [unlockedNext, setUnlockedNext] = useState(null); // { moduleId, name, order, pathName }
  const [justCompleted, setJustCompleted] = useState(false); // true on the call that flipped it

  // ── Loading / error state ───────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locked, setLocked] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // ── Bootstrap ───────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLocked(false);
    setNotFound(false);
    setUnlockedNext(null);
    setJustCompleted(false);
    try {
      const res = await api.getModule(id);
      setModule(res.module);
      setProgress(res.progress);
      setPath(res.path);
      setCode(res.progress?.codeSubmission || '');
      setDraftSavedAt(res.progress?.updatedAt || null);
      setReflection(res.progress?.reflectionText || '');
      setReflectionSavedAt(null); // server doesn't currently echo reflection's updatedAt separately
      if (res.progress?.quizPassed) {
        setQuizState('right');
        // We don't know which choice the user originally picked; leave quizChoice blank
        // so the radios show as unselected on revisit. The "✓ Quiz passed" indicator
        // makes it clear they've already cleared it.
      }
    } catch (err) {
      // 401 is handled globally by api.js → AuthProvider (redirects to /login).
      // Don't label a 401 as "locked" — that would mislead the user.
      if (err.status === 403) setLocked(true);
      else if (err.status === 404) setNotFound(true);
      else setError(err.message || 'Failed to load module');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Mutators ────────────────────────────────────────────────────────

  const saveDraft = useCallback(async () => {
    setDraftState('saving');
    try {
      const res = await api.saveDraft(id, code);
      setProgress(res.progress);
      setDraftSavedAt(res.progress.updatedAt || new Date().toISOString());
      setDraftState('saved');
      setTimeout(
        () => setDraftState((s) => (s === 'saved' ? 'idle' : s)),
        2500
      );
    } catch (err) {
      if (err.status === 403) setLocked(true);
      // 401 → api.js already triggered a logout + redirect; surface a clear
      // "session expired" message rather than leaving stale state.
      setDraftState('error');
    }
  }, [id, code]);

  const saveReflection = useCallback(async () => {
    setReflectionState('saving');
    try {
      const res = await api.saveReflection(id, reflection);
      setProgress(res.progress);
      setReflectionSavedAt(new Date().toISOString());
      applyCompletionResult(res);
      setReflectionState('saved');
      setTimeout(
        () => setReflectionState((s) => (s === 'saved' ? 'idle' : s)),
        2500
      );
    } catch (err) {
      if (err.status === 403) setLocked(true);
      // 401 is handled globally — just stop and let the redirect happen.
      setReflectionState('error');
    }
  }, [id, reflection]);

  const submitQuiz = useCallback(async () => {
    if (!quizChoice) return;
    setQuizState('submitting');
    setQuizFeedback('');
    try {
      const res = await api.submitQuiz(id, quizChoice);
      setProgress(res.progress);
      if (res.correct) {
        setQuizState('right');
        setQuizFeedback('Nice — that\'s the pairing the story was building.');
      } else {
        setQuizState('wrong');
        setQuizFeedback('Not quite. Re-read the why-this-pairing section and try again.');
      }
      applyCompletionResult(res);
    } catch (err) {
      if (err.status === 403) setLocked(true);
      setQuizState('error');
      setQuizFeedback('Couldn\'t reach the server. Try again.');
    }
  }, [id, quizChoice]);

  const applyCompletionResult = useCallback((res) => {
    if (res.completed) {
      setJustCompleted(true);
      setUnlockedNext(res.unlockedNext || null);
    }
  }, []);

  // ── Derived UI bits ────────────────────────────────────────────────

  const savedLabel = (iso, justText = 'Saved') => {
    if (!iso) return null;
    const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60) return `${justText} ${s}s ago`;
    const m = Math.round(s / 60);
    if (m < 60) return `${justText} ${m}m ago`;
    return `${justText} ${new Date(iso).toLocaleTimeString()}`;
  };

  const draftLabel = savedLabel(draftSavedAt);
  const reflectionLabel = savedLabel(reflectionSavedAt);

  const isCompleted = progress?.status === 'completed';
  const isLast = isCompleted && unlockedNext === null;

  // ── Render branches ────────────────────────────────────────────────

  if (loading) {
    return (
      <Shell>
        <div
          className="space-y-6"
          data-testid="module-loading"
          role="status"
          aria-label="Loading module"
        >
          <Skeleton.Card lines={2} />
          <Skeleton.Card lines={4} />
          <Skeleton.Card lines={3} />
          <Skeleton.Card lines={2} />
          <Skeleton.Card lines={6} />
        </div>
      </Shell>
    );
  }

  if (notFound) {
    return (
      <Shell>
        <article className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <h1 className="text-xl font-bold text-slate-800 mb-2">Module not found</h1>
          <p className="text-slate-500 text-sm mb-4">No module with id <code>{id}</code>.</p>
          <Link to="/dashboard" className="text-emerald-700 underline">
            ← Back to dashboard
          </Link>
        </article>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <div
          className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm"
          role="alert"
          data-testid="module-error"
        >
          <strong className="block mb-1">Couldn't load this module.</strong>
          {error}
          <button onClick={load} className="underline ml-2">Retry</button>
        </div>
      </Shell>
    );
  }

  if (locked) {
    return (
      <Shell>
        <article className="bg-white rounded-2xl shadow-sm p-8 text-center space-y-3">
          <h1 className="text-xl font-bold text-slate-800">🔒 This module is locked</h1>
          <p className="text-slate-500 text-sm">
            Complete the previous module in this path to unlock it.
          </p>
          <Link
            to="/dashboard"
            className="inline-block mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg transition"
          >
            ← Back to dashboard
          </Link>
        </article>
      </Shell>
    );
  }

  // ── Main content ────────────────────────────────────────────────────
  return (
    <Shell>
      <article className="space-y-6">
        {/* Breadcrumb + title */}
        <header className="bg-white rounded-2xl shadow-sm p-6 space-y-2">
          {path && (
            <Link
              to="/dashboard"
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              ← {path.name}
            </Link>
          )}
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold text-slate-800">
              {path && (
                <span className="text-slate-400 mr-2">{module.order}.</span>
              )}
              {module.name}
            </h1>
            <StatusBadge status={progress?.status} />
          </div>
        </header>

        {/* Story */}
        <Section title="Story" eyebrow="The pairing">
          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
            {module.story}
          </p>
        </Section>

        {/* Why this pairing */}
        <Section title="Why this pairing" eyebrow="The idea">
          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
            {module.whyPairing}
          </p>
        </Section>

        {/* Practical task */}
        <Section title="Practical task" eyebrow="Try it">
          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
            {module.practicalTask}
          </p>
        </Section>

        {/* Code textarea + Save Draft */}
        <Section title="Your code" eyebrow="Draft">
          <textarea
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (draftState === 'saved') setDraftState('idle');
            }}
            placeholder={`# ${user?.name || 'you'} takes the stage...`}
            rows={10}
            className="w-full font-mono text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-y"
            spellCheck={false}
          />
          <SaveRow
            state={draftState}
            label={draftLabel}
            errorLabel="Save failed — try again"
            onCancel={() => navigate('/dashboard')}
            cancelLabel="Back"
            onSave={saveDraft}
            saveLabel="Save Draft"
          />
        </Section>

        {/* Reflection */}
        <Section
          title="Your reflection"
          eyebrow="Sit with it"
          prompt={module.reflectionPrompt}
        >
          <textarea
            value={reflection}
            onChange={(e) => {
              setReflection(e.target.value);
              if (reflectionState === 'saved') setReflectionState('idle');
            }}
            rows={4}
            className="w-full text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-y"
          />
          <SaveRow
            state={reflectionState}
            label={reflectionLabel}
            errorLabel="Save failed — try again"
            onCancel={() => setReflection('')}
            cancelLabel="Clear"
            onSave={saveReflection}
            saveLabel="Save Reflection"
            // Empty reflections are technically a save but a useless one.
            disableWhen={reflection.trim().length === 0}
            disableReason="Write a reflection first"
          />
        </Section>

        {/* Quiz */}
        <Section title="Quick check" eyebrow="One question">
          <p className="text-slate-800 font-medium mb-3">
            {module.quizQuestion}
          </p>
          <fieldset className="space-y-2">
            <legend className="sr-only">Quiz choices</legend>
            {(module.quizChoices || []).map((choice, i) => {
              const isPicked = quizChoice === choice;
              const lockedPassed =
                quizState === 'right' && progress?.quizPassed;
              return (
                <label
                  key={i}
                  className={[
                    'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition',
                    lockedPassed
                      ? 'border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed'
                      : isPicked
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 bg-white hover:border-slate-300',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="quiz"
                    value={choice}
                    checked={isPicked}
                    onChange={() => {
                      if (lockedPassed) return;
                      setQuizChoice(choice);
                      setQuizState('idle');
                      setQuizFeedback('');
                    }}
                    disabled={lockedPassed}
                    className="mt-1 accent-emerald-600"
                  />
                  <span className="text-sm text-slate-700">{choice}</span>
                </label>
              );
            })}
          </fieldset>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs min-h-[1.25rem]">
              {quizState === 'submitting' && (
                <span className="text-slate-500">Submitting…</span>
              )}
              {quizState === 'right' && (
                <span className="text-emerald-700">✓ Quiz passed</span>
              )}
              {quizState === 'wrong' && (
                <span className="text-red-600">{quizFeedback}</span>
              )}
              {quizState === 'error' && (
                <span className="text-red-600">{quizFeedback}</span>
              )}
            </span>
            <button
              type="button"
              onClick={submitQuiz}
              disabled={
                !quizChoice ||
                quizState === 'submitting' ||
                progress?.quizPassed
              }
              className={[
                'px-4 py-2 text-sm font-medium rounded-lg transition',
                !quizChoice || quizState === 'submitting' || progress?.quizPassed
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white',
              ].join(' ')}
            >
              {quizState === 'submitting' ? 'Submitting…' : 'Submit Answer'}
            </button>
          </div>
        </Section>

        {/* Celebration */}
        {isCompleted && (
          <Celebration
            justCompleted={justCompleted}
            module={module}
            path={path}
            unlockedNext={unlockedNext}
            isLast={isLast}
          />
        )}
      </article>
    </Shell>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">{children}</div>
    </div>
  );
}

function Center({ text }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-slate-500">
      {text}
    </div>
  );
}

function Section({ title, eyebrow, prompt, children }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm p-6 space-y-2">
      <header>
        {eyebrow && (
          <div className="text-xs uppercase tracking-wide text-emerald-700 font-semibold mb-1">
            {eyebrow}
          </div>
        )}
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
        {prompt && (
          <p className="text-sm text-slate-500 italic mt-1">{prompt}</p>
        )}
      </header>
      <div>{children}</div>
    </section>
  );
}

function SaveRow({
  state,
  label,
  errorLabel,
  onCancel,
  cancelLabel,
  onSave,
  saveLabel,
  disableWhen,
  disableReason,
}) {
  return (
    <div className="flex items-center justify-between mt-3">
      <span className="text-xs text-slate-500 min-h-[1.25rem]">
        {state === 'saving' && 'Saving…'}
        {state === 'saved' && (
          <span className="text-emerald-700">✓ {label}</span>
        )}
        {state === 'error' && (
          <span className="text-red-600">{errorLabel}</span>
        )}
        {state === 'idle' && label && (
          <span className="text-slate-400">{label}</span>
        )}
      </span>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 text-sm rounded-lg text-slate-600 hover:bg-slate-100 transition"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={state === 'saving' || disableWhen}
          title={disableWhen ? disableReason : undefined}
          className={[
            'px-4 py-2 text-sm font-medium rounded-lg transition',
            state === 'saving' || disableWhen
              ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white',
          ].join(' ')}
        >
          {state === 'saving' ? 'Saving…' : saveLabel}
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === 'completed') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500 text-white font-medium">
        ✓ Done
      </span>
    );
  }
  if (status === 'unlocked') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
        Ready
      </span>
    );
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 font-medium">
      🔒 Locked
    </span>
  );
}

function Celebration({ justCompleted, module, path, unlockedNext, isLast }) {
  return (
<<<<<<< Updated upstream
    <section
      data-testid="celebration"
      className={[
        'rounded-2xl shadow-sm p-8 text-center space-y-3',
        justCompleted
          ? 'bg-emerald-500 text-white animate-pulse-once'
          : 'bg-emerald-50 border border-emerald-200 text-emerald-900',
      ].join(' ')}
    >
      <div className="text-3xl">🎉</div>
      <h2 className="text-xl font-bold">
        {justCompleted ? 'Module complete!' : 'You\u2019ve completed this module'}
      </h2>
      <p className="text-sm opacity-90">
        <span className="font-semibold">{path?.name} · {module.name}</span>
        {'  ·  '}
        <span>+10 XP</span>
      </p>
      <div className="flex items-center justify-center gap-3 pt-2">
        <Link
          to="/dashboard"
          className={[
            'inline-block px-4 py-2 rounded-lg text-sm font-medium transition',
            justCompleted
              ? 'bg-white/20 hover:bg-white/30 text-white'
              : 'bg-white hover:bg-emerald-100 text-emerald-700 border border-emerald-300',
          ].join(' ')}
        >
          Dashboard
        </Link>
        {unlockedNext ? (
          <Link
            to={`/module/${unlockedNext.moduleId}`}
            className={[
              'inline-block px-4 py-2 rounded-lg text-sm font-medium transition',
              justCompleted
                ? 'bg-white text-emerald-700 hover:bg-slate-100'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white',
            ].join(' ')}
          >
            Next: {unlockedNext.name} →
          </Link>
        ) : isLast ? (
          <span
            className={[
              'inline-block px-4 py-2 rounded-lg text-sm font-medium',
              justCompleted
                ? 'bg-white/20 text-white'
                : 'bg-emerald-100 text-emerald-800',
            ].join(' ')}
          >
            🌟 You've finished this path!
          </span>
        ) : null}
      </div>
    </section>
  );
}
=======
    <div className="mb-6">
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>Progress</span><span>{pct}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full">
        <div
          className="h-2 bg-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function CodeBlock({ code }) {
  return (
    <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 text-sm overflow-x-auto font-mono leading-relaxed">
      <code>{code}</code>
    </pre>
  );
}

function ScoreBar({ score }) {
  const color = score >= 80 ? 'bg-emerald-500' : score >= 55 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-700`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-bold text-slate-700 w-10">{score}/100</span>
    </div>
  );
}

// ── Step panels ─────────────────────────────────────────────────────────────

function ProblemPanel({ problem, onNext }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-1">Here's a real situation...</h2>
        <p className="text-slate-600 leading-relaxed text-base">{problem}</p>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-amber-800 text-sm font-medium mb-2">Before you see any code:</p>
        <p className="text-amber-700 text-sm italic">How would <em>you</em> solve this problem in your head or on paper? Take a moment to think it through — there's no wrong answer here.</p>
      </div>
      <button
        onClick={onNext}
        className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-xl transition"
      >
        I've thought about it — now show me how I'd solve it →
      </button>
    </div>
  );
}

function ThinkPanel({ initialAnswer, onSubmit, onBack, busy }) {
  const [answer, setAnswer] = useState(initialAnswer || '');
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-1">How would you solve this?</h2>
        <p className="text-slate-500 text-sm">Be as specific as you like. There's no perfect answer — this is about how <em>you</em> think.</p>
      </div>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={7}
        placeholder="I'd... (describe your approach in plain English)"
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none leading-relaxed"
      />
      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={busy}
          className="px-4 py-3 text-slate-500 hover:bg-slate-100 rounded-xl font-medium transition"
        >
          ← Back
        </button>
        <button
          onClick={() => onSubmit(answer)}
          disabled={!answer.trim() || busy}
          className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
        >
          {busy ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Evaluating your answer...
            </>
          ) : (
            'Get my feedback →'
          )}
        </button>
      </div>
    </div>
  );
}

function EvaluatedPanel({ evaluation, onNext, onBack }) {
  const { score, summary, strengths, gaps, gapBridge, readyForReveal, remedialHint } = evaluation;
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-1">Here's what we think</h2>
        <p className="text-slate-500 text-sm italic">"{summary}"</p>
      </div>

      <ScoreBar score={score} />

      {strengths.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-emerald-700 mb-2">✓ What you got right</h3>
          <ul className="space-y-1">
            {strengths.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-600">
                <span className="text-emerald-500 mt-0.5">✓</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {gaps.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-amber-700 mb-2">Opportunities to deepen</h3>
          <ul className="space-y-1">
            {gaps.map((g, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-600">
                <span className="text-amber-500 mt-0.5">→</span>
                {g}
              </li>
            ))}
          </ul>
        </div>
      )}

      {gapBridge && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="text-sm font-bold text-blue-700 mb-1">The key insight</h3>
          <p className="text-blue-800 text-sm leading-relaxed">{gapBridge}</p>
        </div>
      )}

      {!readyForReveal && remedialHint && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-amber-800 text-sm italic">💡 {remedialHint}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-4 py-3 text-slate-500 hover:bg-slate-100 rounded-xl font-medium transition"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition"
        >
          {readyForReveal ? "Now show me how Python does it →" : "Continue anyway →"}
        </button>
      </div>
    </div>
  );
}

function RevealPanel({ pythonSolution, altExample, onNext, onBack }) {
  const [showAlt, setShowAlt] = useState(false);
  const currentExample = showAlt && altExample ? altExample : pythonSolution;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-1">
          {showAlt ? "Another way to look at it" : "This is how Python solves it"}
        </h2>
        <p className="text-slate-500 text-sm leading-relaxed">{currentExample.explanation}</p>
      </div>
      <CodeBlock code={currentExample.code} />
      
      {altExample && (
        <div className="text-center pt-2">
          <button
            onClick={() => setShowAlt(!showAlt)}
            className="text-slate-500 hover:text-slate-800 text-sm font-medium transition"
          >
            {showAlt ? "← Show first example" : "Still not clicking? Show me another example →"}
          </button>
        </div>
      )}

      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          className="px-4 py-3 text-slate-500 hover:bg-slate-100 rounded-xl font-medium transition"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition"
        >
          Time to try it myself →
        </button>
      </div>
    </div>
  );
}

function AppliedPanel({ practicalTask, onNext, onBack, moduleId, learnerAnswer, evaluationResult, initialCode }) {
  const [code, setCode] = useState(initialCode || '');
  const [busy, setBusy] = useState(false);

  function handleSubmit() {
    if (!code.trim()) return;
    setBusy(true);
    // Save code as draft in parallel with a reflection that captures
    // the learner's own thinking + the AI evaluation — satisfies the
    // completion rule (reflectionText non-empty + quizPassed=true).
    const reflectionParts = [
      learnerAnswer,
      evaluationResult?.gapBridge,
    ].filter(Boolean);
    Promise.all([
      api.saveDraft(moduleId, code),
      api.saveReflection(moduleId, reflectionParts.join('\n\n')),
    ]).finally(() => {
      setBusy(false);
      onNext();
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-1">Try it for real</h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-4">{practicalTask}</p>
      </div>
      
      <CodeRunner 
        initialCode={code} 
        onCodeChange={setCode} 
      />
      
      <div className="pt-4 mt-6 flex gap-3">
        <button
          onClick={onBack}
          disabled={busy}
          className="px-4 py-3 text-slate-500 hover:bg-slate-100 rounded-xl font-medium transition"
        >
          ← Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={!code.trim() || busy}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
        >
          {busy ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            'Submit & continue →'
          )}
        </button>
      </div>
    </div>
  );
}

function QuizPanel({ quizQuestion, quizChoices, onSubmit, onBack, busy }) {
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(null);

  function handleSubmit() {
    if (!selected || submitted) return;
    setSubmitted(true);
    onSubmit(selected, (isCorrect) => setCorrect(isCorrect));
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-1">Quick check</h2>
        <p className="text-slate-600 text-sm">{quizQuestion}</p>
      </div>
      <div className="space-y-2">
        {quizChoices.map((choice, i) => {
          const letter = String.fromCharCode(97 + i); // a, b, c, d
          return (
            <button
              key={i}
              onClick={() => !submitted && setSelected(letter)}
              disabled={submitted}
              className={[
                'w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition',
                submitted
                  ? letter === correct
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    : letter === selected
                    ? 'border-rose-400 bg-rose-50 text-rose-800'
                    : 'border-slate-200 text-slate-400'
                  : letter === selected
                  ? 'border-blue-500 bg-blue-50 text-blue-800'
                  : 'border-slate-200 hover:border-slate-300 text-slate-600',
              ].join(' ')}
            >
              <span className="font-semibold mr-2">{choice}</span>
            </button>
          );
        })}
      </div>
      {!submitted && (
        <div className="flex gap-3">
          <button
            onClick={onBack}
            disabled={busy}
            className="px-4 py-3 text-slate-500 hover:bg-slate-100 rounded-xl font-medium transition"
          >
            ← Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selected || busy}
            className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition"
          >
            Submit answer
          </button>
        </div>
      )}
      {submitted && (
        <div className="flex gap-3">
          <button
            onClick={onBack}
            disabled={busy}
            className="px-4 py-3 text-slate-500 hover:bg-slate-100 rounded-xl font-medium transition"
          >
            ← Back
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition"
          >
            Continue →
          </button>
        </div>
      )}
    </div>
  );
}

function DonePanel({ onDone }) {
  return (
    <div className="text-center py-8 space-y-4">
      <div className="text-5xl">🎉</div>
      <h2 className="text-2xl font-bold text-slate-800">Module complete!</h2>
      <p className="text-slate-500">Great work. You've worked through the problem from both sides — your intuition and Python's approach. That's how deep learning happens.</p>
      <button
        onClick={onDone}
        className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-3 rounded-xl transition"
      >
        Back to dashboard
      </button>
    </div>
  );
}

// ── Main Module component ───────────────────────────────────────────────────

export default function Module() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [moduleData, setModuleData] = useState(null);
  const [progress, setProgress] = useState(null);
  const [path, setPath] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);

  const step = progress?.currentStep || 'problem';

  // ── Load module data ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getModule(id)
      .then((data) => {
        if (cancelled) return;
        setModuleData(data.module);
        setProgress(data.progress);
        setPath(data.path);
      })
      .catch((err) => {
        if (!cancelled) {
          if (err.body?.error === 'placement_required') {
            navigate(`/placement/${err.body.pathId}`, { 
              state: { pathName: err.body.pathName }, 
              replace: true 
            });
          } else {
            setError(err.message || 'Failed to load module');
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  // ── Step transitions ──────────────────────────────────────────────────
  function goToStep(nextStep) {
    setProgress((p) => ({ ...p, currentStep: nextStep }));
  }

  function goBack() {
    const currentIndex = STEP_ORDER.indexOf(step);
    if (currentIndex > 0 && currentIndex < STEP_ORDER.length - 1) {
      goToStep(STEP_ORDER[currentIndex - 1]);
    }
  }

  async function handleThinkSubmit(answer) {
    setEvaluating(true);
    try {
      const res = await api.evaluateModule(id, answer);
      setProgress((p) => ({
        ...p,
        currentStep: 'evaluated',
        learnerAnswer: answer,
        evaluationResult: res.evaluationResult,
      }));
    } catch (err) {
      alert(err.message || 'Failed to evaluate answer');
    } finally {
      setEvaluating(false);
    }
  }

  async function handleReveal() {
    try {
      await api.markRevealed(id);
      goToStep('reveal');
    } catch (err) {
      alert(err.message || 'Failed');
    }
  }

  async function handleQuizSubmit(answer, onResult) {
    try {
      const res = await api.submitQuiz(id, answer);
      onResult(res.correct);
      goToStep('done');
    } catch (err) {
      alert(err.message || 'Quiz submission failed');
    }
  }

  // ── Render ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="inline-block w-8 h-8 border-4 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !moduleData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-slate-500">{error || 'Module not found'}</p>
        <Link to="/dashboard" className="text-emerald-600 underline">Back to dashboard</Link>
      </div>
    );
  }

  const { problem, pythonSolution, evaluationCriteria } = moduleData;

  // Determine which panel to show
  // Fallback for legacy modules (no problem field) — show a simple story view
  if (!problem) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <Link to="/dashboard" className="text-sm text-slate-400 hover:text-slate-600">← Dashboard</Link>
          <h1 className="text-2xl font-bold text-slate-800">{moduleData.name}</h1>
          <p className="text-slate-500">This module doesn't have problem-first content yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <Link to="/dashboard" className="text-xs text-slate-400 hover:text-slate-600 mb-0.5 block">← Dashboard</Link>
            <h1 className="text-lg font-bold text-slate-800">{moduleData.name}</h1>
            {path && <p className="text-xs text-slate-400">{path.name}</p>}
          </div>
          <StepBadge step={step} />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <ProgressBar currentStep={step} />

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          {step === 'problem' && (
            <ProblemPanel
              problem={problem}
              onNext={() => goToStep('think')}
            />
          )}

          {step === 'think' && (
            <ThinkPanel
              initialAnswer={progress?.learnerAnswer || ''}
              onSubmit={handleThinkSubmit}
              onBack={goBack}
              busy={evaluating}
            />
          )}

          {step === 'evaluated' && progress?.evaluationResult && (
            <EvaluatedPanel
              evaluation={progress.evaluationResult}
              onNext={handleReveal}
              onBack={goBack}
            />
          )}

          {step === 'reveal' && pythonSolution?.code && (
            <RevealPanel
              pythonSolution={pythonSolution}
              altExample={moduleData.altExample}
              onNext={() => goToStep('applied')}
              onBack={goBack}
            />
          )}

          {step === 'applied' && (
            <AppliedPanel
              practicalTask="Adapt the Python solution above to a new scenario. Try writing your own version from scratch — or modify the example and see what happens when you run it."
              onNext={() => goToStep('quiz')}
              onBack={goBack}
              moduleId={id}
              learnerAnswer={progress?.learnerAnswer || ''}
              evaluationResult={progress?.evaluationResult || null}
              initialCode={pythonSolution?.code || ''}
            />
          )}

          {step === 'quiz' && (
            <QuizPanel
              quizQuestion="Which of these best describes how the Python concept you just learned works?"
              quizChoices={[
                'a) You manually track everything with paper notes',
                'b) Python handles it automatically without your input',
                'c) The concept provides a structured way to solve the problem systematically',
                'd) You have to rewrite the same logic for every new situation',
              ]}
              onSubmit={handleQuizSubmit}
              onBack={goBack}
            />
          )}

          {step === 'done' && (
            <DonePanel
              onDone={() => {
                // Use replace:true so the back button doesn't return to the
                // completed module. Dashboard remounts on navigation, so
                // useEffect fires load() with the latest progress + XP.
                navigate('/dashboard', { replace: true });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
>>>>>>> Stashed changes
