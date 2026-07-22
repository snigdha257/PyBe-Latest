import { useEffect, useState, useMemo } from 'react';

const COLORS = [
  'bg-rose-100 text-rose-800 border-rose-200',
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-violet-100 text-violet-800 border-violet-200',
  'bg-amber-100 text-amber-800 border-amber-200',
  'bg-emerald-100 text-emerald-800 border-emerald-200',
  'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
  'bg-cyan-100 text-cyan-800 border-cyan-200',
];

export default function ScopeVisualizer({ frames = [] }) {
  const [animatingFrames, setAnimatingFrames] = useState([]);

  // Compute color assignments globally across ALL current frames 
  // so the same objectId gets the exact same color everywhere.
  const objectColorMap = useMemo(() => {
    const map = new Map();
    let colorIndex = 0;
    frames.forEach(frame => {
      (frame.locals || []).forEach(local => {
        if (local.objectId && !map.has(local.objectId)) {
          map.set(local.objectId, {
            color: COLORS[colorIndex % COLORS.length],
            badgeId: `obj:${local.objectId.toString().slice(-3)}`
          });
          colorIndex++;
        }
      });
    });
    return map;
  }, [frames]);

  // Homebrew AnimatePresence logic to orchestrate frame slide in/out
  useEffect(() => {
    setAnimatingFrames(prev => {
      const activeIds = new Set(frames.map(f => `${f.name}-${f.depth}`));
      
      const next = frames.map(f => {
        const id = `${f.name}-${f.depth}`;
        const existing = prev.find(p => p.id === id);
        return {
          ...f,
          id,
          // If it didn't exist before, it's entering
          status: existing ? (existing.status === 'exiting' ? 'entering' : existing.status) : 'entering'
        };
      });

      prev.forEach(p => {
        if (!activeIds.has(p.id)) {
          next.push({ ...p, status: 'exiting' });
        }
      });
      
      // Keep them sorted by call stack depth so animations don't re-order the stack
      next.sort((a, b) => a.depth - b.depth);
      return next;
    });
  }, [frames]);

  useEffect(() => {
    const hasEntering = animatingFrames.some(f => f.status === 'entering');
    const hasExiting = animatingFrames.some(f => f.status === 'exiting');
    
    if (hasEntering) {
      // Next tick, switch entering -> active to trigger CSS transition
      const t = setTimeout(() => {
        setAnimatingFrames(prev => prev.map(f => f.status === 'entering' ? { ...f, status: 'active' } : f));
      }, 50);
      return () => clearTimeout(t);
    }
    
    if (hasExiting) {
      // Wait for exit transition to finish, then remove from DOM
      const t = setTimeout(() => {
        setAnimatingFrames(prev => prev.filter(f => f.status !== 'exiting'));
      }, 300);
      return () => clearTimeout(t);
    }
  }, [animatingFrames]);

  return (
    <div className="w-full h-full flex flex-col">
      {animatingFrames.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-slate-400 font-medium">
          No frames active
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto pr-2 pb-8">
        {animatingFrames.map(frame => {
          const isVisible = frame.status === 'active';
          
          return (
            <div 
              key={frame.id}
              className="transition-all duration-300 ease-in-out"
              style={{
                display: 'grid',
                gridTemplateRows: isVisible ? '1fr' : '0fr',
                opacity: isVisible ? 1 : 0,
                marginBottom: isVisible ? '1rem' : '0',
                transform: isVisible ? 'translateX(0)' : 'translateX(-10px)'
              }}
            >
              <div className="overflow-hidden">
                <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden">
                  <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
                    <h3 className="font-bold text-slate-700 text-sm font-mono">
                      {frame.name === 'global' ? 'Global Scope' : `${frame.name}()`}
                    </h3>
                    <span className="text-[10px] uppercase font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                      Depth {frame.depth}
                    </span>
                  </div>
                  <div className="p-4 flex flex-col gap-2">
                    {(!frame.locals || frame.locals.length === 0) ? (
                      <span className="text-slate-400 italic text-sm">No variables</span>
                    ) : (
                      frame.locals.map(local => {
                        const isObject = local.objectId !== null;
                        const objMeta = isObject ? objectColorMap.get(local.objectId) : null;
                        
                        return (
                          <div key={local.name} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 py-2 border-b border-slate-50 last:border-0">
                            <div className="flex flex-wrap items-center gap-2 sm:w-1/3 shrink-0">
                              <span className="font-mono font-bold text-slate-700 text-sm">
                                {local.name}
                              </span>
                              {isObject && objMeta && (
                                <span 
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${objMeta.color} shadow-sm cursor-help transition-transform hover:scale-110`}
                                  title={`Memory ID: ${local.objectId}`}
                                >
                                  {objMeta.badgeId}
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-emerald-700 text-sm break-all bg-slate-50 px-3 py-1.5 rounded-lg w-full border border-slate-100 shadow-inner">
                              {local.value}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
