import { useState } from 'react';
import { Terminal } from 'lucide-react';
import SandboxOverlay from './SandboxOverlay';

export default function SandboxButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[50] bg-slate-800 hover:bg-slate-900 text-emerald-400 p-3 rounded-xl shadow-xl transition-transform hover:-translate-y-0.5 flex items-center gap-2 border border-slate-700 group"
        aria-label="Open Sandbox"
        title="Open Python Sandbox"
      >
        <Terminal className="w-5 h-5" />
        <span className="text-sm font-semibold hidden md:inline-block text-white">Sandbox</span>
      </button>
      
      <SandboxOverlay isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
