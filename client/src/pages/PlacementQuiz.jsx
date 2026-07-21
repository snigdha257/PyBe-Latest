import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api';

function ProgressBar({ current, total }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="mb-6">
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>Question {current} of {total}</span><span>{pct}%</span>
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

export default function PlacementQuiz() {
  const { pathId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState(null);
  
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const pathName = location.state?.pathName || 'the next path';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getPlacementQuiz(pathId)
      .then((data) => {
        if (cancelled) return;
        setQuiz(data.quiz);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load placement quiz');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [pathId]);

  async function handleNext() {
    if (selected === null) return;
    
    const newAnswers = [...answers, selected];
    
    if (currentIndex < quiz.questions.length - 1) {
      setAnswers(newAnswers);
      setSelected(null);
      setCurrentIndex(currentIndex + 1);
    } else {
      setSubmitting(true);
      try {
        const res = await api.submitPlacementQuiz(pathId, newAnswers);
        setResult(res);
      } catch (err) {
        alert(err.message || 'Quiz submission failed');
      } finally {
        setSubmitting(false);
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="inline-block w-8 h-8 border-4 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-slate-500">{error || 'Placement quiz not found'}</p>
        <Link to="/dashboard" className="text-emerald-600 underline">Back to dashboard</Link>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center space-y-6">
          {result.passed ? (
            <>
              <div className="text-5xl">🎉</div>
              <h2 className="text-2xl font-bold text-slate-800">You passed!</h2>
              <p className="text-slate-500">Great work. You're ready for {pathName}.</p>
              <button
                onClick={() => {
                  if (result.firstModuleId) {
                    navigate(`/module/${result.firstModuleId}`);
                  } else {
                    navigate('/dashboard');
                  }
                }}
                className="w-full inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-3 rounded-xl transition"
              >
                Start {pathName}
              </button>
            </>
          ) : (
            <>
              <div className="text-5xl">📚</div>
              <h2 className="text-2xl font-bold text-slate-800">Keep Learning</h2>
              <p className="text-slate-500">
                You didn't quite pass the placement test for {pathName}. That's okay! We recommend reviewing the previous path first to build a stronger foundation.
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-xl transition"
              >
                Back to Dashboard
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const question = quiz.questions[currentIndex];
  const codeMatch = question.question.match(/```python\n([\s\S]*?)\n```/);
  let textPart = question.question;
  let codePart = null;
  if (codeMatch) {
    textPart = question.question.replace(/```python\n[\s\S]*?\n```/, '').trim();
    codePart = codeMatch[1];
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <Link to="/dashboard" className="text-xs text-slate-400 hover:text-slate-600 mb-0.5 block">← Dashboard</Link>
            <h1 className="text-lg font-bold text-slate-800">Placement Test</h1>
            <p className="text-xs text-slate-400">Testing into {pathName}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <ProgressBar current={currentIndex + 1} total={quiz.questions.length} />

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">Question {currentIndex + 1}</h2>
            <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed mb-4">{textPart}</p>
            {codePart && <CodeBlock code={codePart} />}
          </div>
          
          <div className="space-y-2">
            {question.choices.map((choice, i) => (
              <button
                key={i}
                onClick={() => setSelected(i)}
                className={[
                  'w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition font-mono',
                  i === selected
                    ? 'border-blue-500 bg-blue-50 text-blue-800'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600',
                ].join(' ') + (codePart ? ' font-mono' : '')}
              >
                <span className="font-semibold mr-2">{String.fromCharCode(97 + i)})</span>
                {choice}
              </button>
            ))}
          </div>
          
          <button
            onClick={handleNext}
            disabled={selected === null || submitting}
            className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting...
              </>
            ) : currentIndex === quiz.questions.length - 1 ? (
              'Submit test →'
            ) : (
              'Next question →'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
