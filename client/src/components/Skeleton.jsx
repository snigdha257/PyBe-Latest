/**
 * Tiny Tailwind-only skeleton primitives.
 *
 * Use these while data is fetching so the layout doesn't pop in/out as
 * content arrives. They're plain divs with `animate-pulse` + a neutral
 * slate colour — same visual language as Tailwind's own example skeletons.
 *
 * Variants:
 *   <SkeletonBlock />       — single rectangular block, custom width/height
 *   <SkeletonLine />        — single line of text (h-3 by default)
 *   <SkeletonCard>          — a card-shaped container with block + lines
 *   <SkeletonTrail />       — mimics the SVG trail of PathTrail
 */
function SkeletonBlock({ className = '' }) {
  return (
    <div
      className={[
        'animate-pulse bg-slate-200 rounded',
        className,
      ].join(' ')}
      aria-hidden
    />
  );
}

function SkeletonLine({ className = '' }) {
  return <SkeletonBlock className={['h-3 w-full', className].join(' ')} />;
}

function SkeletonCard({ lines = 3, className = '' }) {
  return (
    <div
      className={[
        'bg-white rounded-2xl shadow-sm p-6 space-y-3',
        className,
      ].join(' ')}
      role="status"
      aria-label="Loading…"
    >
      <SkeletonBlock className="h-5 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} className={i === lines - 1 ? 'w-2/3' : ''} />
      ))}
    </div>
  );
}

/**
 * Mimics the PathTrail SVG dimensions (viewBox 800×200) so the layout
 * doesn't shift when the real data arrives.
 */
function SkeletonTrail() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
      <SkeletonBlock className="h-5 w-1/3" />
      <SkeletonBlock className="h-4 w-2/3" />
      <div className="w-full">
        <div className="w-full h-32 sm:h-40 bg-slate-100 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="border border-slate-200 rounded-lg p-3 space-y-2">
            <SkeletonBlock className="h-3 w-2/3" />
            <SkeletonLine className="w-full" />
            <SkeletonLine className="w-5/6" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default {
  Block: SkeletonBlock,
  Line: SkeletonLine,
  Card: SkeletonCard,
  Trail: SkeletonTrail,
};