import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import CodeRunner from '../components/CodeRunner';

export default function CaseStudy() {
  const { pathId } = useParams();
  const navigate = useNavigate();

  const [caseStudy, setCaseStudy] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [code, setCode] = useState('');
  const [reflectionText, setReflectionText] = useState('');
  const [actualOutput, setActualOutput] = useState('');
  
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getCaseStudy(pathId)
      .then(data => {
        if (cancelled) return;
        setCaseStudy(data.caseStudy);
        setProgress(data.progress);
        setCode(data.progress?.codeSubmission || data.caseStudy.buggyCode);
        setReflectionText(data.progress?.reflectionText || '');
        if (data.progress?.status === 'completed') {
          setPassed(true);
        }
      })
      .catch(err => {
        if (!cancelled) {
          if (err.status === 403) {
            setError(err.body?.error || "Complete this layer first");
          } else {
            setError(err.message || "Failed to load case study");
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [pathId]);

  function handleOutputChange(result) {
    if (result.stdout !== undefined) {
      setActualOutput(result.stdout);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await api.submitCaseStudy(progress._id, {
        codeSubmission: code,
        reflectionText,
        actualOutput
      });
      setProgress(res.progress);
      if (res.passed) {
        setPassed(true);
      } else {
        setFeedback("Output doesn't match yet — try again");
      }
    } catch (err) {
      setFeedback(err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="inline-block w-8 h-8 border-4 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-slate-500 font-medium">{error}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2 rounded-xl transition"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (passed) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-md w-full text-center space-y-4">
          <div className="text-5xl">🎉</div>
          <h2 className="text-2xl font-bold text-slate-800">Case Study complete!</h2>
          <p className="text-slate-500">Great work debugging that scenario. You earned 25 XP!</p>
          <button
            onClick={() => navigate('/dashboard', { replace: true })}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <Link to="/dashboard" className="text-xs text-slate-400 hover:text-slate-600 mb-0.5 block">← Dashboard</Link>
            <h1 className="text-lg font-bold text-slate-800">{caseStudy.title}</h1>
          </div>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
            Case Study (25 XP)
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-800">The Scenario</h2>
          <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{caseStudy.scenario}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-800">Fix the Bug</h2>
          <CodeRunner
            initialCode={code}
            onCodeChange={setCode}
            onOutputChange={handleOutputChange}
          />
        </div>

        {caseStudy.hints && caseStudy.hints.length > 0 && (
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-amber-800">Need a hint?</h2>
              {hintsRevealed < caseStudy.hints.length && (
                <button
                  onClick={() => setHintsRevealed(r => r + 1)}
                  className="text-sm font-semibold text-amber-700 hover:text-amber-900 bg-amber-100 px-3 py-1.5 rounded-lg transition"
                >
                  Reveal Hint {hintsRevealed + 1}
                </button>
              )}
            </div>
            
            {hintsRevealed > 0 && (
              <ul className="space-y-3">
                {caseStudy.hints.slice(0, hintsRevealed).map((hint, i) => (
                  <li key={i} className="text-amber-900 text-sm flex gap-3 bg-amber-100/50 p-3 rounded-lg border border-amber-200/50">
                    <span className="font-bold opacity-50">#{i + 1}</span>
                    <span>{hint}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Reflection</h2>
            <p className="text-slate-500 text-sm">{caseStudy.reflectionPrompt}</p>
          </div>
          <textarea
            value={reflectionText}
            onChange={(e) => setReflectionText(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none font-sans text-sm leading-relaxed"
            placeholder="I found the bug by..."
          />
          
          {feedback && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm font-medium">
              {feedback}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || !code.trim() || !reflectionText.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 mt-4"
          >
            {submitting ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Fix'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
