import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';

/**
 * Module.jsx — Problem-first teaching flow
 *
 * Steps:
 *   problem    → Read the real-world scenario
 *   think      → Type how you'd solve it in your own words
 *   evaluated  → Read AI feedback on your approach
 *   reveal     → See how Python solves the same problem
 *   applied    → Try a coding exercise
 *   quiz       → Quick comprehension check
 *   done       → Completion screen
 */
const STEP_ORDER = ['problem', 'think', 'evaluated', 'reveal', 'applied', 'quiz', 'done'];

// ── Sub-components ──────────────────────────────────────────────────────────

function StepBadge({ step }) {
  const labels = {
    problem:   { text: 'Step 1 — The Problem',    color: 'bg-rose-100 text-rose-700' },
    think:     { text: 'Step 2 — Your Take',      color: 'bg-amber-100 text-amber-700' },
    evaluated: { text: 'Step 3 — Your Feedback',  color: 'bg-violet-100 text-violet-700' },
    reveal:    { text: 'Step 4 — Python\'s Way',  color: 'bg-blue-100 text-blue-700' },
    applied:   { text: 'Step 5 — Try It',         color: 'bg-emerald-100 text-emerald-700' },
    quiz:      { text: 'Step 6 — Quick Check',    color: 'bg-sky-100 text-sky-700' },
    done:      { text: 'Completed',               color: 'bg-green-100 text-green-700' },
  };
  const { text, color } = labels[step] || { text: step, color: 'bg-slate-100 text-slate-700' };
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${color}`}>
      {text}
    </span>
  );
}

function ProgressBar({ currentStep }) {
  const idx = STEP_ORDER.indexOf(currentStep === 'done' ? 'done' : currentStep);
  const total = STEP_ORDER.filter((s) => s !== 'done').length;
  const pct = Math.round((idx / total) * 100);
  return (
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

function ThinkPanel({ initialAnswer, onSubmit, busy }) {
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
      <button
        onClick={() => onSubmit(answer)}
        disabled={!answer.trim() || busy}
        className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
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
  );
}

function EvaluatedPanel({ evaluation, onNext }) {
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

      <button
        onClick={onNext}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition"
      >
        {readyForReveal ? "Now show me how Python does it →" : "Continue anyway →"}
      </button>
    </div>
  );
}

function RevealPanel({ pythonSolution, onNext }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-1">This is how Python solves it</h2>
        <p className="text-slate-500 text-sm leading-relaxed">{pythonSolution.explanation}</p>
      </div>
      <CodeBlock code={pythonSolution.code} />
      <button
        onClick={onNext}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition"
      >
        Time to try it myself →
      </button>
    </div>
  );
}

function AppliedPanel({ practicalTask, onNext, moduleId, learnerAnswer, evaluationResult }) {
  const [code, setCode] = useState('');
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
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        rows={10}
        placeholder="Type your Python code here..."
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none font-mono text-sm leading-relaxed"
      />
      <button
        onClick={handleSubmit}
        disabled={!code.trim() || busy}
        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
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
  );
}

function QuizPanel({ quizQuestion, quizChoices, onSubmit, busy }) {
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
        <button
          onClick={handleSubmit}
          disabled={!selected || busy}
          className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition"
        >
          Submit answer
        </button>
      )}
      {submitted && (
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition"
        >
          Continue →
        </button>
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
      .catch(() => {
        if (!cancelled) setError('Failed to load module');
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
              busy={evaluating}
            />
          )}

          {step === 'evaluated' && progress?.evaluationResult && (
            <EvaluatedPanel
              evaluation={progress.evaluationResult}
              onNext={handleReveal}
            />
          )}

          {step === 'reveal' && pythonSolution?.code && (
            <RevealPanel
              pythonSolution={pythonSolution}
              onNext={() => goToStep('applied')}
            />
          )}

          {step === 'applied' && (
            <AppliedPanel
              practicalTask="Adapt the Python solution above to a new scenario. Try writing your own version from scratch — or modify the example and see what happens when you run it."
              onNext={() => goToStep('quiz')}
              moduleId={id}
              learnerAnswer={progress?.learnerAnswer || ''}
              evaluationResult={progress?.evaluationResult || null}
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