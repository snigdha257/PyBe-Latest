/**
 * CodeBlock.jsx
 * Syntax-highlighted, line-numbered Python code block with copy-to-clipboard.
 * Uses Prism.js (client-side, no server needed).
 */
import { useEffect, useRef, useState } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';

export default function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef(null);

  // Highlight on mount or when code changes
  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const lines = code.split('\n');

  return (
    <div className="relative group rounded-2xl overflow-hidden bg-[#1e1e2e] shadow-lg">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#181825] border-b border-white/5">
        <div className="flex items-center gap-2">
          {/* macOS-style window dots */}
          <span className="w-3 h-3 rounded-full bg-red-500/70" />
          <span className="w-3 h-3 rounded-full bg-yellow-400/70" />
          <span className="w-3 h-3 rounded-full bg-green-500/70" />
          <span className="ml-2 text-xs text-slate-500 font-mono">python</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition opacity-0 group-hover:opacity-100 focus:opacity-100 px-2 py-1 rounded-md hover:bg-white/10"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code area */}
      <div className="flex overflow-x-auto">
        {/* Line numbers */}
        <div className="flex-shrink-0 py-3 pl-4 pr-3 text-right select-none border-r border-white/5">
          {lines.map((_, i) => (
            <div key={i} className="text-xs text-slate-600 leading-relaxed font-mono">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code */}
        <pre className="p-3 pt-3 m-0 flex-1 overflow-x-auto">
          <code ref={codeRef} className={`language-python text-sm font-mono leading-relaxed`}>
            {code}
          </code>
        </pre>
      </div>
    </div>
  );
}