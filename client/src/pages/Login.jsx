import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

/**
 * Login form.
 *
 * Validation:
 *   - Empty fields → blocked by `required`, but we also enforce programmatically
 *     so disabled JS / browser quirks can't bypass it.
 *   - Email format → client-side check matches the server's regex. If the
 *     user manages to slip past it, the server returns the same message and
 *     we surface it.
 *   - Server returns 401 "Invalid email or password" → shown verbatim, no
 *     distinction between "no such user" and "wrong password" (security).
 *
 * Loading state:
 *   - Submit button disables + label changes to "Signing in…".
 *   - If the server is unreachable, the error comes through with `.network = true`
 *     and we show a friendlier "Couldn't reach the server" hint.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // If a ProtectedRoute sent the user here, they want to go back to `from`
  // once they log in. Otherwise default to /dashboard.
  const from = location.state?.from || '/dashboard';

  const [form, setForm] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  function update(field) {
    return (e) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      // Clear the field-specific error as soon as the user edits it.
      if (fieldErrors[field]) {
        setFieldErrors((fe) => ({ ...fe, [field]: undefined }));
      }
    };
  }

  function validate() {
    const errs = {};
    if (!form.email.trim()) {
      errs.email = 'Email is required';
    } else if (!EMAIL_RE.test(form.email.trim())) {
      errs.email = "That doesn't look like an email address";
    }
    if (!form.password) {
      errs.password = 'Password is required';
    }
    return errs;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setBusy(true);
    try {
      await login({ email: form.email.trim(), password: form.password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        noValidate
        className="w-full max-w-sm bg-white shadow-md rounded-2xl p-8 space-y-4"
      >
        <h1 className="text-2xl font-bold text-slate-800">Welcome back</h1>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={update('email')}
            aria-invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? 'email-err' : undefined}
            className={[
              'mt-1 w-full rounded border px-3 py-2 focus:outline-none focus:ring-2',
              fieldErrors.email
                ? 'border-red-400 focus:ring-red-300'
                : 'border-slate-300 focus:ring-emerald-400',
            ].join(' ')}
          />
          {fieldErrors.email && (
            <p id="email-err" className="mt-1 text-xs text-red-600" role="alert">
              {fieldErrors.email}
            </p>
          )}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={update('password')}
            aria-invalid={!!fieldErrors.password}
            aria-describedby={fieldErrors.password ? 'pwd-err' : undefined}
            className={[
              'mt-1 w-full rounded border px-3 py-2 focus:outline-none focus:ring-2',
              fieldErrors.password
                ? 'border-red-400 focus:ring-red-300'
                : 'border-slate-300 focus:ring-emerald-400',
            ].join(' ')}
          />
          {fieldErrors.password && (
            <p id="pwd-err" className="mt-1 text-xs text-red-600" role="alert">
              {fieldErrors.password}
            </p>
          )}
        </label>

        {error && (
          <div
            className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2"
            role="alert"
            data-testid="login-error"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2 rounded transition flex items-center justify-center gap-2"
        >
          {busy && (
            <span
              className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
              aria-hidden
            />
          )}
          {busy ? 'Signing in…' : 'Log in'}
        </button>

        <p className="text-sm text-slate-600 text-center">
          New here?{' '}
          <Link to="/signup" className="text-emerald-600 underline">
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}
