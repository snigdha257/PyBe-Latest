import { X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { usePyodideRunner } from '../pyodide/usePyodideRunner';
import ScopeVisualizer from './ScopeVisualizer';
import ExecutionTrail from './ExecutionTrail';
import CodeEditor from './CodeEditor';

const DEFAULT_CODE = `def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

result = factorial(4)
print(f"Result: {result}")`;

export default function SandboxOverlay({ isOpen, onClose }) {
  const [code, setCode] = useState(DEFAULT_CODE);
  const { runCode, isLoading, isRunning } = usePyodideRunner();
  
  const [output, setOutput] = useState(null);
  const [error, setError] = useState(null);
  const [trace, setTrace] = useState(null);
  const [traceIndex, setTraceIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const timerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    if (isPlaying && trace && traceIndex < trace.length - 1) {
      timerRef.current = setTimeout(() => {
        setTraceIndex(prev => prev + 1);
      }, 800);
    } else if (traceIndex >= (trace?.length || 0) - 1) {
      setIsPlaying(false);
    }
    
    return () => clearTimeout(timerRef.current);
  }, [isPlaying, traceIndex, trace, isOpen]);

  async function handleRun() {
    setIsPlaying(false);
    setTrace(null);
    setOutput(null);
    setError(null);
    
    const result = await runCode(code);
    
    setOutput(result.stdout || '');
    if (!result.success) {
      setError(result.error);
    }
    
    if (result.trace && result.trace.length > 0) {
      setTrace(result.trace);
      setTraceIndex(0);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/60 flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm">
      <div className="bg-white w-full max-w-7xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              Python Sandbox
            </h2>
            {trace && trace.length > 0 && (
              <div className="flex items-center gap-4 ml-4 pl-4 border-l border-slate-300">
                <span className="text-xs text-slate-500 font-medium">
                  Step {traceIndex + 1} of {trace.length}
                </span>
                <div className="flex bg-slate-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => { setIsPlaying(false); setTraceIndex(Math.max(0, traceIndex - 1)); }}
                    disabled={traceIndex === 0}
                    className="px-3 py-1.5 hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 text-xs font-bold transition"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    disabled={traceIndex === trace.length - 1}
                    className="px-3 py-1.5 border-l border-r border-slate-300 hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed text-emerald-700 text-xs font-bold transition"
                  >
                    {isPlaying ? 'Pause' : 'Play'}
                  </button>
                  <button
                    onClick={() => { setIsPlaying(false); setTraceIndex(Math.min(trace.length - 1, traceIndex + 1)); }}
                    disabled={traceIndex === trace.length - 1}
                    className="px-3 py-1.5 hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 text-xs font-bold transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition"
            aria-label="Close Sandbox"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-200 bg-slate-50">
          
          {/* Left Column: Code & Output */}
          <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-4">
            {trace && trace.length > 0 && (
              <ExecutionTrail 
                trace={trace} 
                currentStep={traceIndex} 
                onStepSelect={(idx) => {
                  setIsPlaying(false);
                  setTraceIndex(idx);
                }} 
              />
            )}
            
            <CodeEditor
              value={code}
              onChange={setCode}
              rows={12}
            />
            
            <button
              onClick={handleRun}
              disabled={isLoading || isRunning || !code.trim()}
              className="w-full shrink-0 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
            >
              {(isLoading || isRunning) && (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {isLoading ? 'Downloading Python (once)...' : isRunning ? 'Running...' : 'Run Code'}
            </button>

            {(output !== null || error !== null) && (
              <div className={`p-4 rounded-xl text-sm font-mono whitespace-pre-wrap overflow-x-auto ${error ? 'bg-rose-50 border border-rose-200 text-rose-800' : 'bg-slate-900 text-slate-100'}`}>
                {output && <div>{output}</div>}
                {error && <div className={output ? "mt-4 border-t border-rose-200 pt-4" : ""}>{error}</div>}
                {!output && !error && <span className="text-slate-500 italic">No output</span>}
              </div>
            )}
          </div>

          {/* Right Column: Visualization */}
          <div className="flex-1 p-6 bg-slate-100 flex flex-col h-full overflow-hidden">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 shrink-0">Memory & Scope Visualization</div>
            <div className="flex-1 flex flex-col min-h-0">
              {trace && trace.length > 0 ? (
                <ScopeVisualizer frames={trace[traceIndex].frames || []} />
              ) : (
                <div className="flex-1 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 font-medium bg-slate-50/50">
                  Run code to visualize memory
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
