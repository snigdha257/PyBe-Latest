import { useRef, useEffect } from 'react';

export default function CodeEditor({ 
  value = '', 
  onChange, 
  readOnly = false, 
  highlightLine = null,
  rows = 10,
  placeholder = '',
  className = ''
}) {
  const textareaRef = useRef(null);
  const gutterRef = useRef(null);
  const highlightRef = useRef(null);

  const handleScroll = (e) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.target.scrollTop;
    }
    if (highlightRef.current) {
      highlightRef.current.scrollTop = e.target.scrollTop;
      // also sync horizontal scroll for highlight if needed, though highlight spans full width
      highlightRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  const lines = value.split('\n');
  const LINE_HEIGHT = 24; // 24px = 1.5rem (matches text-sm standard line height)
  const PADDING_Y = 16;   // py-4 = 16px

  return (
    <div className={`relative flex w-full bg-slate-900 text-slate-100 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-400 border border-slate-700 ${className}`}>
      
      {/* Background highlight container - syncs scroll with textarea */}
      {highlightLine && (
        <div 
          ref={highlightRef}
          className="absolute inset-0 pointer-events-none overflow-hidden z-0"
          aria-hidden="true"
        >
          <div 
            className="absolute left-0 w-[200%] bg-amber-500/20 border-y border-amber-500/30"
            style={{
              top: `${PADDING_Y + (highlightLine - 1) * LINE_HEIGHT}px`,
              height: `${LINE_HEIGHT}px`
            }}
          />
        </div>
      )}

      {/* Gutter */}
      <div 
        ref={gutterRef}
        className="absolute left-0 top-0 bottom-0 w-12 overflow-hidden bg-slate-800/80 border-r border-slate-700 pointer-events-none z-10"
        aria-hidden="true"
      >
        <div style={{ paddingTop: `${PADDING_Y}px`, paddingBottom: `${PADDING_Y}px` }}>
          {Array.from({ length: lines.length }).map((_, i) => (
            <div 
              key={i} 
              className={`text-right pr-3 font-mono text-sm select-none
                ${highlightLine === i + 1 ? 'text-amber-300 font-bold' : 'text-slate-500'}
              `}
              style={{ height: `${LINE_HEIGHT}px`, lineHeight: `${LINE_HEIGHT}px` }}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        onScroll={handleScroll}
        readOnly={readOnly}
        rows={rows}
        placeholder={placeholder}
        spellCheck={false}
        wrap="off"
        className="w-full pl-[3.5rem] pr-4 py-4 font-mono text-sm bg-transparent outline-none resize-none relative z-20"
        style={{ 
          lineHeight: `${LINE_HEIGHT}px`,
          whiteSpace: 'pre',
        }}
      />
    </div>
  );
}
