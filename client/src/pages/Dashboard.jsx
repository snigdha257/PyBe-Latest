import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api';
import PathTrail from '../components/PathTrail';
import Skeleton from '../components/Skeleton';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [paths, setPaths] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Run both fetches in parallel — summary + progress are independent.
      const [summaryRes, progressRes] = await Promise.all([
        api.getUserSummary(),
        api.getProgress(),
      ]);
      setSummary(summaryRes);
      setPaths(progressRes.paths || []);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // The summary endpoint is the source of truth for the header counter.
  // (Defensive fallbacks: if the fetch hasn't returned yet, defaults.)
  const totalXP = summary?.totalXP ?? 0;
  const completedCount = summary?.completedCount ?? 0;
  const curriculumTotal = summary?.total ?? 9;
  const pctComplete =
    curriculumTotal > 0
      ? Math.round((completedCount / curriculumTotal) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="bg-white shadow-sm rounded-2xl p-6 space-y-4">
          {/* Top row: greeting + XP counter + nav buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Hey, {user?.name || 'there'} 👋
              </h1>
              <p className="text-sm text-slate-500">
                {completedCount} of {curriculumTotal} modules complete
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Total XP counter — supplied by /api/user/summary */}
              <div
                className="text-center px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl"
                data-testid="total-xp"
              >
                <div className="text-[10px] uppercase tracking-wide text-emerald-700 font-semibold">
                  Total XP
                </div>
                <div className="text-2xl font-bold text-emerald-700 tabular-nums">
                  {totalXP}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <button
                  onClick={load}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded transition"
                  aria-label="Refresh dashboard"
                >
                  Refresh
                </button>
                <button
                  onClick={() => {
                    logout();
                    navigate('/login', { replace: true });
                  }}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded transition"
                >
                  Log out
                </button>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div data-testid="progress-bar">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Progress across all paths</span>
              <span className="tabular-nums">
                {completedCount}/{curriculumTotal} ·{' '}
                <span className="font-semibold text-emerald-700">
                  {pctComplete}%
                </span>
              </span>
            </div>
            <div
              className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={completedCount}
              aria-valuemin={0}
              aria-valuemax={curriculumTotal}
              aria-label="Modules completed"
            >
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${pctComplete}%` }}
              />
            </div>
          </div>
        </header>

        {loading && (
          <div
            className="space-y-6"
            data-testid="dashboard-loading"
            role="status"
            aria-label="Loading your dashboard"
          >
            <Skeleton.Trail />
            <Skeleton.Trail />
            <Skeleton.Trail />
          </div>
        )}

        {error && !loading && (
          <div
            className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm"
            role="alert"
            data-testid="dashboard-error"
          >
            <strong className="block mb-1">Couldn't load your dashboard.</strong>
            {error}
            <button onClick={load} className="underline ml-2">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && paths && (
          <div className="space-y-6">
            {paths.map((p) => (
              <PathTrail
                key={p.pathId}
                pathName={p.name}
                pathDescription={p.description}
                modules={p.modules}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}