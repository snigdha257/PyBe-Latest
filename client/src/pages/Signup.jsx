import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

/**
 * Signup form — 2 steps:
 *   Step 1 · Choose your story theme
 *   Step 2 · Account details
 *
 * Validation mirrors the server-side checks so errors surface before submit.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const THEMES = [
  {
    id: 'detective',
    label: 'The Detective',
    tagline: 'Solve puzzles. Connect the dots.',
    description:
      'You are a sharp-eyed investigator piecing together clues in dimly lit rooms. Every variable is an alias — the same person wearing different names. Track them down, one clue at a time.',
    metaphor: 'A 1940s private eye maps pseudonyms to their real identities.',
    color: 'from-slate-700 to-slate-900',
    accent: 'bg-slate-700',
  },
  {
    id: 'scholar',
    label: 'The Scholar',
    tagline: 'Seek patterns across time and texts.',
    description:
      'You are a deep reader in a vast library where the same ancient truth hides under many titles. Your job is to trace connections, find the one essence beneath many surfaces.',
    metaphor: 'Two scholars discover the same text filed under different names across library wings.',
    color: 'from-amber-600 to-amber-800',
    accent: 'bg-amber-600',
  },
  {
    id: 'space',
    label: 'The Space Explorer',
    tagline: 'Navigate the unknown with clarity.',
    description:
      'You are a mission controller receiving signals from deep space. The same data arrives under different code names — your task is to recognise what\'s really being said, despite the noise.',
    metaphor: 'A deep-space probe transmits the same data under multiple call signs.',
    color: 'from-indigo-600 to-indigo-900',
    accent: 'bg-indigo-600',
  },
  {
    id: 'courtroom',
    label: 'The Advocate',
    tagline: 'Make the case. Build the argument.',
    description:
      'You are a sharp advocate presenting evidence before a sceptical judge. Every alias hides a fact; your job is to build a watertight argument that leads to one undeniable conclusion.',
    metaphor: 'A witness gives two testimonies under different names, pointing to the same event.',
    color: 'from-emerald-600 to-emerald-800',
    accent: 'bg-emerald-600',
  },
];

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [step, setStep] = useState(1);
  const [selectedTheme, setSelectedTheme] = useState(null);
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
    setBusy(true);
    try {
      await signup({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        theme: selectedTheme,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err.status === 409) {
        setFieldErrors({ email: err.message });
      } else {
        setError(err.message || 'Signup failed');
      }
    } finally {
      setBusy(false);
    }
  }

  // ── Step 1: Theme selection ────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              Choose your story world
            </h1>
            <p className="text-slate-500 text-base">
              Pick the universe your Python stories live in. You can always explore
              others on a fresh account — but your theme stays with you across all 9
              modules.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {THEMES.map((theme) => {
              const isSelected = selectedTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setSelectedTheme(theme.id)}
                  aria-pressed={isSelected}
                  className={[
                    'text-left rounded-2xl p-5 border-2 transition-all duration-150',
                    'shadow-sm hover:shadow-md hover:-translate-y-0.5',
                    isSelected
                      ? `border-transparent ring-2 ring-offset-2 ring-${theme.accent.replace('bg-', '')}`
                      : 'border-slate-200 bg-white hover:border-slate-300',
                  ].join(' ')}
                  style={
                    isSelected
                      ? {
                          backgroundImage: `linear-gradient(135deg, var(--tw-gradient-from, white), var(--tw-gradient-to, white)), linear-gradient(135deg, ${theme.color.replace('from-', '#').replace(' to-', '/')})`,
                          backgroundBlendMode: 'overlay',
                        }
                      : {}
                  }
                >
                  {/* Theme card header */}
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className={`w-10 h-10 rounded-xl ${theme.accent} flex items-center justify-center text-white font-bold text-lg`}
                    >
                      {theme.id === 'detective' && '🔍'}
                      {theme.id === 'scholar' && '📚'}
                      {theme.id === 'space' && '🚀'}
                      {theme.id === 'courtroom' && '⚖️'}
                    </div>
                    {isSelected && (
                      <span className="text-emerald-500 font-bold text-sm">✓ Selected</span>
                    )}
                  </div>

                  <h2 className="text-lg font-bold text-slate-800 mb-0.5">{theme.label}</h2>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
                    {theme.tagline}
                  </p>
                  <p className="text-sm text-slate-600 leading-relaxed mb-3">
                    {theme.description}
                  </p>
                  <p className="text-xs italic text-slate-400 leading-snug">
                    {theme.metaphor}
                  </p>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={!selectedTheme}
            onClick={() => setStep(2)}
            className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition"
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  // ── Step 2: Account details ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        noValidate
        className="w-full max-w-sm bg-white shadow-md rounded-2xl p-8 space-y-4"
      >
        {/* Theme badge + back button */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {THEMES.find((t) => t.id === selectedTheme) && (
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold text-white px-2.5 py-1 rounded-full ${THEMES.find((t) => t.id === selectedTheme).accent}`}>
                {THEMES.find((t) => t.id === selectedTheme).label}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="text-xs text-slate-400 hover:text-slate-600 transition"
          >
            ← Change theme
          </button>
        </div>

        <h1 className="text-2xl font-bold text-slate-800">Create your account</h1>
        <p className="text-sm text-slate-500 -mt-1">
          All 9 modules will be told through your chosen story world.
        </p>

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
          {busy ? 'Creating…' : 'Create account'}
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