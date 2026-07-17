import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

/**
 * Signup form.
 *
 * Validation:
 *   - Name, email, password all required.
 *   - Email format check (matches server's regex).
 *   - Password ≥ 8 chars (matches server's check).
 *   - On 409 ("An account with that email already exists"), we surface
 *     a friendly inline error on the email field.
 *
 * The server-side errors are still echoed if they slip past us (defense in
 * depth).
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  function update(field) {
    return (e) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      if (fieldErrors[field]) {
        setFieldErrors((fe) => ({ ...fe, [field]: undefined }));
      }
    };
  }

  function validate() {
    const errs = {};
    if (!form.name.trim()) {
      errs.name = 'Name is required';
    } else if (form.name.trim().length < 1) {
      errs.name = 'Name must not be empty';
    }
    if (!form.email.trim()) {
      errs.email = 'Email is required';
    } else if (!EMAIL_RE.test(form.email.trim())) {
      errs.email = "That doesn't look like an email address";
    }
    if (!form.password) {
      errs.password = 'Password is required';
    } else if (form.password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
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
      await signup({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      // 409 from server → point the user at the email field specifically.
      if (err.status === 409) {
        setFieldErrors({ email: err.message });
      } else {
        setError(err.message || 'Signup failed');
      }
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
        <h1 className="text-2xl font-bold text-slate-800">Create your account</h1>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Name</span>
          <input
            type="text"
            autoComplete="name"
            required
            value={form.name}
            onChange={update('name')}
            aria-invalid={!!fieldErrors.name}
            aria-describedby={fieldErrors.name ? 'name-err' : undefined}
            className={[
              'mt-1 w-full rounded border px-3 py-2 focus:outline-none focus:ring-2',
              fieldErrors.name
                ? 'border-red-400 focus:ring-red-300'
                : 'border-slate-300 focus:ring-emerald-400',
            ].join(' ')}
          />
          {fieldErrors.name && (
            <p id="name-err" className="mt-1 text-xs text-red-600" role="alert">
              {fieldErrors.name}
            </p>
          )}
        </label>

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
            autoComplete="new-password"
            required
            minLength={8}
            value={form.password}
            onChange={update('password')}
            aria-invalid={!!fieldErrors.password}
            aria-describedby={fieldErrors.password ? 'pwd-err' : 'pwd-hint'}
            className={[
              'mt-1 w-full rounded border px-3 py-2 focus:outline-none focus:ring-2',
              fieldErrors.password
                ? 'border-red-400 focus:ring-red-300'
                : 'border-slate-300 focus:ring-emerald-400',
            ].join(' ')}
          />
          {fieldErrors.password ? (
            <p id="pwd-err" className="mt-1 text-xs text-red-600" role="alert">
              {fieldErrors.password}
            </p>
          ) : (
            <p id="pwd-hint" className="mt-1 text-xs text-slate-500">
              At least 8 characters.
            </p>
          )}
        </label>

        {error && (
          <div
            className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2"
            role="alert"
            data-testid="signup-error"
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
          {busy ? 'Creating…' : 'Sign up'}
        </button>

        <p className="text-sm text-slate-600 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-emerald-600 underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
