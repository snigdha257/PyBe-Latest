import { useState, useEffect, useRef } from 'react';
import { usePyodideRunner } from '../pyodide/usePyodideRunner';
import CodeEditor from './CodeEditor';

export default function CodeRunner({ initialCode = '', onOutputChange, onCodeChange }) {
  const [code, setCode] = useState(initialCode);
  const { runCode, isLoading, isRunning } = usePyodideRunner();
  
  const [output, setOutput] = useState(null);
  const [error, setError] = useState(null);
  const [trace, setTrace] = useState(null);
  const [traceIndex, setTraceIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const timerRef = useRef(null);

  useEffect(() => {
    if (isPlaying && trace && traceIndex < trace.length - 1) {
      timerRef.current = setTimeout(() => {
        setTraceIndex(prev => prev + 1);
      }, 800);
    } else if (traceIndex >= (trace?.length || 0) - 1) {
      setIsPlaying(false);
    }
    
    return () => clearTimeout(timerRef.current);
  }, [isPlaying, traceIndex, trace]);

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
    
    if (onOutputChange) {
      onOutputChange(result, code);
    }
  }

  return (
    <div className="space-y-4">
      <CodeEditor
        value={code}
        onChange={(val) => {
          setCode(val);
          if (onCodeChange) onCodeChange(val);
        }}
        rows={10}
      />
      
      <button
        onClick={handleRun}
        disabled={isLoading || isRunning || !code.trim()}
        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
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

      {trace && trace.length > 0 && (
        <div className="mt-8 border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
          <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between">
            <div className="font-semibold text-slate-700 text-sm">Execution Trace</div>
            <div className="flex items-center gap-4">
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
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
            <div className="md:col-span-2 p-4 bg-slate-50 overflow-x-auto">
              <CodeEditor
                value={code}
                readOnly={true}
                highlightLine={trace[traceIndex].line}
                rows={code.split('\n').length}
              />
            </div>
            
            <div className="p-4 bg-white">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Variables</div>
              <div className="space-y-2">
                {Object.keys(trace[traceIndex].locals).length === 0 ? (
                  <div className="text-sm text-slate-400 italic">No local variables</div>
                ) : (
                  Object.entries(trace[traceIndex].locals).map(([k, v]) => (
                    <div key={k} className="flex flex-col text-sm font-mono border border-slate-100 rounded-md p-2 bg-slate-50">
                      <span className="font-bold text-slate-700">{k}</span>
                      <span className="text-emerald-700 break-all">{v}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
