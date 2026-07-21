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
  { x: 80, y: 40 },
  { x: 290, y: 160 },
  { x: 510, y: 40 },
  { x: 720, y: 160 },
];

// Two cubic Bézier segments chained: top-left → bottom-middle → top-right -> bottom-right
const TRAIL_D = [
  `M ${NODES[0].x},${NODES[0].y}`,
  `C 180,40 180,160 ${NODES[1].x},${NODES[1].y}`,
  `C 400,160 400,40 ${NODES[2].x},${NODES[2].y}`,
  `C 620,40 620,160 ${NODES[3].x},${NODES[3].y}`,
].join(' ');

function Node({ status, label, to, isCaseStudy }) {
  const r = 28;

  let fill = '#ffffff';
  let stroke = '#cbd5e1';       // slate-300
  let strokeWidth = 2;
  let dash = '4 4';
  let cursor = 'cursor-not-allowed';
  let inner = isCaseStudy ? (
    <text
      textAnchor="middle"
      dominantBaseline="central"
      className="select-none"
      style={{ fontSize: '20px' }}
    >
      🔍
    </text>
  ) : (
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
    inner = isCaseStudy ? (
      <text
        textAnchor="middle"
        dominantBaseline="central"
        className="select-none"
        style={{ fontSize: '20px' }}
      >
        🔍
      </text>
    ) : (
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

export default function PathTrail({ pathId, pathName, pathDescription, modules, caseStudy, isPrevPathCompleted }) {
  if (!modules?.length) return null;

  const isCaseStudyUnlocked = modules.every(m => m.status === 'completed' || m.status === 'completed_via_placement');
  const csStatus = caseStudy?.status === 'completed' ? 'completed' : (isCaseStudyUnlocked ? 'unlocked' : 'locked');

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
          {modules.map((m, i) => {
            const isFirstModule = m.order === 1;
            const needsPlacement = isFirstModule && !isPrevPathCompleted && m.status === 'unlocked';
            const toUrl = needsPlacement ? `/placement/${pathId}` : `/module/${m.moduleId}`;

            return (
              <g key={m.moduleId} transform={`translate(${NODES[i].x},${NODES[i].y})`}>
                <Node
                  status={m.status}
                  label={String(m.order)}
                  sub={m.name}
                  to={toUrl}
                />
              </g>
            );
          })}
          
          {caseStudy && (
            <g transform={`translate(${NODES[3].x},${NODES[3].y})`}>
              <Node
                status={csStatus}
                isCaseStudy={true}
                to={`/case-study/${pathId}`}
                label="CS"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Module list — name + teaser under each node */}
      <ol className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        {modules.map((m) => {
          const isFirstModule = m.order === 1;
          const needsPlacement = isFirstModule && !isPrevPathCompleted && m.status === 'unlocked';
          const clickable = m.status !== 'locked';
          const Comp = clickable ? Link : 'div';
          
          let toUrl = `/module/${m.moduleId}`;
          let compState = {};
          
          if (needsPlacement) {
            toUrl = `/placement/${pathId}`;
            compState = { pathName };
          }
          
          const compProps = clickable ? { to: toUrl, state: compState } : {};
          
          return (
            <li key={m.moduleId}>
              <Comp
                {...compProps}
                className={[
                  'block rounded-lg border p-3 h-full',
                  m.status === 'locked'
                    ? 'border-slate-200 bg-slate-50'
                    : m.status === 'completed' || m.status === 'completed_via_placement'
                    ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100 transition'
                    : needsPlacement
                    ? 'border-blue-400 bg-white hover:bg-blue-50 transition'
                    : 'border-emerald-400 bg-white hover:bg-emerald-50 transition',
                ].join(' ')}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">
                    {m.order}. {m.name}
                  </span>
                  <StatusBadge status={m.status} needsPlacement={needsPlacement} />
                </div>
                <p className="text-slate-500 mt-1 leading-snug">{m.teaser}</p>
              </Comp>
            </li>
          );
        })}
      </ol>
      
      {caseStudy && (
        <div className="mt-3 text-sm">
          {csStatus !== 'locked' ? (
            <Link
              to={`/case-study/${pathId}`}
              className={`block rounded-lg border p-3 w-full text-left transition ${
                csStatus === 'completed' 
                  ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100' 
                  : 'border-indigo-300 bg-indigo-50 hover:bg-indigo-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">
                  Case Study: {caseStudy.title}
                </span>
                <StatusBadge status={csStatus} needsPlacement={false} />
              </div>
            </Link>
          ) : (
            <div className="block rounded-lg border p-3 w-full text-left border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">
                  Case Study: {caseStudy.title}
                </span>
                <StatusBadge status="locked" needsPlacement={false} />
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status, needsPlacement }) {
  if (needsPlacement) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium whitespace-nowrap shrink-0 ml-2">
        Take placement
      </span>
    );
  }
  if (status === 'completed' || status === 'completed_via_placement') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500 text-white font-medium">
        ✓ Done
      </span>
    );
  }
  if (status === 'unlocked') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--world-accent)] text-white font-medium shadow-sm">
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