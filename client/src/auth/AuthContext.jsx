import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, clearSession, getStoredUser, getToken, setSession } from '../api';

/**
 * AuthContext
 * -----------
 * Token lives in BOTH memory (for fast synchronous checks in render) and
 * localStorage (so it survives refresh). The two are kept in sync.
 *
 * Listens for the global `pybe:auth:logout` event from api.js so that any
 * 401 returned mid-session automatically:
 *   - clears the stored session,
 *   - drops in-memory state,
 *   - redirects the user to /login (without using stale cached routes).
 *
 * Most renders only need `user` / `isAuthenticated` / `authReady` —
 * the raw token is rarely needed by components.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();

  // Boot in "loading" state so ProtectedRoute doesn't bounce on first paint.
  const [user, setUser] = useState(getStoredUser());
  const [token, setToken] = useState(getToken());
  const [authReady, setAuthReady] = useState(false);

  // On first mount, if we have a stored token, verify it against /api/me.
  // If it fails (expired, deleted user), drop the stale session.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setAuthReady(true);
        return;
      }
      try {
        const { user: fresh } = await api.me();
        if (!cancelled) {
          setUser(fresh);
          setSession({ user: fresh });
        }
      } catch {
        if (!cancelled) {
          clearSession();
          setUser(null);
          setToken(null);
        }
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for global 401 from api.js — drop session and send to /login.
  useEffect(() => {
    function onForcedLogout() {
      clearSession();
      setToken(null);
      setUser(null);
      // Avoid piling up navigation calls if multiple 401s fire.
      navigate('/login', { replace: true });
    }
    window.addEventListener('pybe:auth:logout', onForcedLogout);
    return () => window.removeEventListener('pybe:auth:logout', onForcedLogout);
  }, [navigate]);

  const handleAuthSuccess = useCallback(({ token: newToken, user: newUser }) => {
    setSession({ token: newToken, user: newUser });
    setToken(newToken);
    setUser(newUser);
  }, []);

  const signup = useCallback(
    async (form) => {
      const res = await api.signup(form);
      handleAuthSuccess(res);
      return res;
    },
    [handleAuthSuccess]
  );

  const login = useCallback(
    async (form) => {
      const res = await api.login(form);
      handleAuthSuccess(res);
      return res;
    },
    [handleAuthSuccess]
  );

  const logout = useCallback(() => {
    clearSession();
    setToken(null);
    setUser(null);
  }, []);

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    authReady,
    signup,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
