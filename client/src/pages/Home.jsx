import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white shadow-lg rounded-2xl p-8 space-y-4 text-center">
        <h1 className="text-3xl font-bold text-slate-800">PyBe Latest</h1>
        <p className="text-slate-600">
          Pair programming tutorials for thinkers — three paths, nine modules.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2 rounded transition"
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2 rounded transition"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded transition"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
