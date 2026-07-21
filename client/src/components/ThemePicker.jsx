import { useState } from 'react';
import { api } from '../api';

export const THEMES = [
  {
    id: 'detective',
    label: 'The Detective',
    tagline: 'Solve puzzles. Connect the dots.',
    description:
      "You are a sharp-eyed investigator piecing together clues in dimly lit rooms. Every variable is an alias — the same person wearing different names. Track them down, one clue at a time.",
    metaphor: "A 1940s private eye maps pseudonyms to their real identities.",
    color: 'from-slate-700 to-slate-900',
    accent: 'bg-slate-700',
  },
  {
    id: 'scholar',
    label: 'The Scholar',
    tagline: 'Seek patterns across time and texts.',
    description:
      "You are a deep reader in a vast library where the same ancient truth hides under many titles. Your job is to trace connections, find the one essence beneath many surfaces.",
    metaphor: "Two scholars discover the same text filed under different names across library wings.",
    color: 'from-amber-600 to-amber-800',
    accent: 'bg-amber-600',
  },
  {
    id: 'space',
    label: 'The Space Explorer',
    tagline: 'Navigate the unknown with clarity.',
    description:
      "You are a mission controller receiving signals from deep space. The same data arrives under different code names — your task is to recognise what's really being said, despite the noise.",
    metaphor: "A deep-space probe transmits the same data under multiple call signs.",
    color: 'from-indigo-600 to-indigo-900',
    accent: 'bg-indigo-600',
  },
  {
    id: 'courtroom',
    label: 'The Advocate',
    tagline: 'Make the case. Build the argument.',
    description:
      "You are a sharp advocate presenting evidence before a sceptical judge. Every alias hides a fact; your job is to build a watertight argument that leads to one undeniable conclusion.",
    metaphor: "A witness gives two testimonies under different names, pointing to the same event.",
    color: 'from-emerald-600 to-emerald-800',
    accent: 'bg-emerald-600',
  },
];

export default function ThemePicker({ mode = 'signup', initialTheme = null, onComplete, onCancel }) {
  const [selectedTheme, setSelectedTheme] = useState(initialTheme);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleContinue() {
    if (mode === 'signup') {
      onComplete(selectedTheme);
      return;
    }
    
    setBusy(true);
    setError(null);
    try {
      const res = await api.updatePreferences({ theme: selectedTheme });
      onComplete(res.user);
    } catch (err) {
      setError(err.message || 'Failed to update preferences');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          Choose your story world
        </h1>
        <p className="text-slate-500 text-base">
          {mode === 'signup' 
            ? 'Pick the universe your Python stories live in. You can always explore others on a fresh account — but your theme stays with you across all 9 modules.'
            : 'Change the universe your Python stories live in. This will update the theme for all future modules.'}
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

      {error && <div className="text-red-500 text-sm mb-4 text-center">{error}</div>}

      <div className="flex gap-3">
        {mode === 'settings' && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="w-1/3 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-semibold py-3 rounded-xl transition"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          disabled={!selectedTheme || busy}
          onClick={handleContinue}
          className={`${mode === 'settings' && onCancel ? 'w-2/3' : 'w-full'} bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition flex justify-center items-center gap-2`}
        >
          {busy ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : mode === 'settings' ? (
            'Save Changes'
          ) : (
            'Continue →'
          )}
        </button>
      </div>
    </div>
  );
}
