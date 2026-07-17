import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

/**
 * Wraps a route that requires a logged-in user.
 *
 *   - While we're still checking a stored token, render a tiny loader
 *     (avoids redirecting to /login on every page refresh).
 *   - If not authenticated, send to /login and remember where they came from
 *     so we can bounce back after they log in.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, authReady } = useAuth();
  const location = useLocation();

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
