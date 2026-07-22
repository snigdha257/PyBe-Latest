import { useEffect, useRef } from 'react';

export default function ExecutionTrail({ trace = [], currentStep = 0, onStepSelect }) {
  const scrollRef = useRef(null);
  const activeRef = useRef(null);

  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [currentStep]);

  if (!trace || trace.length === 0) return null;

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl p-3 shrink-0 shadow-sm">
      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 flex justify-between items-center">
        <span>Execution Path (Line Numbers)</span>
        <span>{trace.length} steps</span>
      </div>
      <div 
        ref={scrollRef}
        className="flex items-center gap-1.5 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'thin' }}
      >
        {trace.map((step, index) => {
          const isActive = index === currentStep;
          return (
            <div key={index} className="flex items-center gap-1.5 shrink-0">
              <button
                ref={isActive ? activeRef : null}
                onClick={() => onStepSelect(index)}
                className={`
                  w-7 h-7 flex items-center justify-center rounded text-xs font-mono font-bold transition-all
                  ${isActive 
                    ? 'bg-emerald-500 text-white shadow-md scale-110 z-10' 
                    : 'bg-slate-100 border border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50'
                  }
                `}
                title={`Step ${index + 1}: Line ${step.line}`}
              >
                {step.line}
              </button>
              {index < trace.length - 1 && (
                <span className="text-slate-300 text-[10px] font-black shrink-0">→</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
