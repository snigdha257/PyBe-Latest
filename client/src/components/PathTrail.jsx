import { Link } from 'react-router-dom';

/**
 * PathTrail — renders one learning path as a winding SVG trail of 3 nodes.
 *
 * Geometry (viewBox 0 0 800 200):
 *   • Node 1  → ( 90,  40)   top-left
 *   • Node 2  → (400, 160)   bottom-middle
 *   • Node 3  → (710,  40)   top-right
 *
 * The connecting path is two cubic Bézier segments forming a smooth S-curve
 * — the classic "snake" / game-board trail look.
 *
 * Each node renders as either:
 *   • locked    — grey, dashed stroke, no link
 *   • unlocked  — emerald fill, glowing ring, links to /module/:id
 *   • completed — white fill, emerald ring, check mark inside, links to /module/:id
 */
const VB_W = 800;
const VB_H = 200;

// (x, y) positions for the three nodes
const NODES = [
  { x: 90, y: 40 },
  { x: 400, y: 160 },
  { x: 710, y: 40 },
];

// Two cubic Bézier segments chained: top-left → bottom-middle → top-right
const TRAIL_D = [
  `M ${NODES[0].x},${NODES[0].y}`,
  `C 250,40 250,160 ${NODES[1].x},${NODES[1].y}`,
  `C 550,160 550,40 ${NODES[2].x},${NODES[2].y}`,
].join(' ');

function Node({ status, label, to }) {
  const r = 28;

  let fill = '#ffffff';
  let stroke = '#cbd5e1';       // slate-300
  let strokeWidth = 2;
  let dash = '4 4';
  let cursor = 'cursor-not-allowed';
  let inner = (
    <text
      textAnchor="middle"
      dominantBaseline="central"
      className="fill-slate-400 select-none"
      style={{ font: 'bold 14px ui-sans-serif, system-ui, sans-serif' }}
    >
      {label}
    </text>
  );

  if (status === 'unlocked') {
    fill = '#10b981';          // emerald-500
    stroke = '#047857';        // emerald-700
    strokeWidth = 3;
    dash = '0';
    cursor = 'cursor-pointer';
    inner = (
      <text
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-white select-none"
        style={{ font: 'bold 14px ui-sans-serif, system-ui, sans-serif' }}
      >
        {label}
      </text>
    );
  } else if (status === 'completed') {
    fill = '#ffffff';
    stroke = '#10b981';        // emerald-500
    strokeWidth = 3;
    dash = '0';
    cursor = 'cursor-pointer';
    inner = (
      <path
        d="M -10,0 L -3,8 L 11,-8"
        fill="none"
        stroke="#10b981"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }

  const artwork = (
    <g>
      <circle
        cx={0}
        cy={0}
        r={r}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dash}
        className="drop-shadow-sm"
      />
      {inner}
    </g>
  );

  if (status === 'locked') {
    return <g className={cursor}>{artwork}</g>;
  }

  return (
    <Link
      to={to}
      className={`group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-full ${cursor}`}
      aria-label={`${label}: ${status} module`}
    >
      <g className="transition-transform group-hover:scale-105 origin-center">
        {artwork}
      </g>
    </Link>
  );
}

export default function PathTrail({ pathName, pathDescription, modules }) {
  if (!modules?.length) return null;

  return (
    <section
      aria-label={`${pathName} path`}
      className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm"
    >
      <header className="mb-2">
        <h2 className="text-lg font-bold text-slate-800">{pathName}</h2>
        <p className="text-sm text-slate-500">{pathDescription}</p>
      </header>

      <div className="w-full">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          role="img"
          aria-label={`${pathName} learning trail`}
          className="w-full h-auto max-w-full block"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Winding trail line — drawn once, behind the nodes.
              Use a softer stroke + dashed pattern to evoke "path." */}
          <path
            d={TRAIL_D}
            fill="none"
            stroke="#e2e8f0"          // slate-200
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d={TRAIL_D}
            fill="none"
            stroke="#cbd5e1"          // slate-300 dashed on top
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="2 8"
          />

          {/* Nodes, placed at the trail's anchor points */}
          {modules.map((m, i) => (
            <g key={m.moduleId} transform={`translate(${NODES[i].x},${NODES[i].y})`}>
              <Node
                status={m.status}
                label={String(m.order)}
                sub={m.name}
                to={`/module/${m.moduleId}`}
              />
            </g>
          ))}
        </svg>
      </div>

      {/* Module list — name + teaser under each node */}
      <ol className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        {modules.map((m) => {
          const clickable = m.status !== 'locked';
          const Comp = clickable ? Link : 'div';
          const compProps = clickable ? { to: `/module/${m.moduleId}` } : {};
          return (
            <li key={m.moduleId}>
              <Comp
                {...compProps}
                className={[
                  'block rounded-lg border p-3 h-full',
                  m.status === 'locked'
                    ? 'border-slate-200 bg-slate-50'
                    : m.status === 'completed'
                    ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100 transition'
                    : 'border-emerald-400 bg-white hover:bg-emerald-50 transition',
                ].join(' ')}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">
                    {m.order}. {m.name}
                  </span>
                  <StatusBadge status={m.status} />
                </div>
                <p className="text-slate-500 mt-1 leading-snug">{m.teaser}</p>
              </Comp>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function StatusBadge({ status }) {
  if (status === 'completed') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500 text-white font-medium">
        ✓ Done
      </span>
    );
  }
  if (status === 'unlocked') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
        Ready
      </span>
    );
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 font-medium">
      🔒 Locked
    </span>
  );
}