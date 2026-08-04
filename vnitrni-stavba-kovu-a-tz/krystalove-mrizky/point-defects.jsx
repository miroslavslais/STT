// point-defects.jsx — bodové poruchy krystalové mřížky: vakance, intersticie, substituce.
// Same look & timeline family as crystal-bcc.jsx / crystal-fcc.jsx / crystal.jsx.
const { Stage, useTime, Easing, interpolate, clamp } = window;

const SP = 1;
const COLS = [-3, -2, -1, 0, 1, 2, 3];
const ROWS = [-2, -1, 0, 1, 2];
const VAC = { i: 0, j: 0 };
const SUB = { i: 2, j: -1 };
const GAP = { i: -2.5, j: 0.5 };

const VAC_NEIGH = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const GAP_NEIGH = [[-3, 0], [-2, 0], [-3, 1], [-2, 1]];
const SUB_NEIGH = [[3, -1], [1, -1], [2, 0], [2, -2]];

// base grid, staggered build-in order
const GRID = [];
{
  let idx = 0;
  for (const j of ROWS) for (const i of COLS) { GRID.push({ i, j, appear: 0.3 + idx * 0.045 }); idx++; }
}
const isVac = (i, j) => i === VAC.i && j === VAC.j;
const isSub = (i, j) => i === SUB.i && j === SUB.j;

const BONDS = [];
for (const j of ROWS) for (const i of COLS) {
  if (COLS.includes(i + 1)) BONDS.push({ a: { i, j }, b: { i: i + 1, j } });
  if (ROWS.includes(j + 1)) BONDS.push({ a: { i, j }, b: { i, j: j + 1 } });
}
function bondAppear(bd) {
  const ga = GRID.find((g) => g.i === bd.a.i && g.j === bd.a.j);
  const gb = GRID.find((g) => g.i === bd.b.i && g.j === bd.b.j);
  return Math.max(ga.appear, gb.appear) + 0.08;
}

function fade(t, a, b, c, d) {
  if (t <= a || t >= d) return 0;
  if (t < b) return clamp((t - a) / (b - a), 0, 1);
  if (t > c) return clamp(1 - (t - c) / (d - c), 0, 1);
  return 1;
}

// ── expressive tweaks: palette + pacing + camera behaviour ──
const THEMES = {
  'Oceán': {
    accent: '#5fc0ef',
    atom: ['#dcf1ff', '#5cb0e6', '#16405f'],
    int: ['#ffe8c4', '#efab54', '#7a3f14'],
    sub: ['#e7e4ff', '#8f89d9', '#332e63'],
    haloAtom: '90,175,235', haloInt: '240,175,90', haloSub: '143,137,217',
    ringAtom: 'rgba(150,205,245,0.6)', ringInt: 'rgba(240,175,90,0.6)', ringSub: 'rgba(160,150,235,0.6)',
  },
  'Žhnoucí': {
    accent: '#ff9d6a',
    atom: ['#fff0dc', '#f0975a', '#6b3413'],
    int: ['#ffd9d9', '#e2645a', '#6e1f1f'],
    sub: ['#ffe3f0', '#d97aa8', '#5c2540'],
    haloAtom: '240,151,90', haloInt: '226,100,90', haloSub: '217,122,168',
    ringAtom: 'rgba(250,190,140,0.6)', ringInt: 'rgba(230,120,110,0.6)', ringSub: 'rgba(220,140,180,0.6)',
  },
  'Ametyst': {
    accent: '#b79cff',
    atom: ['#eae6ff', '#8f89d9', '#332e63'],
    int: ['#d8f7ff', '#5cc9e6', '#124a5f'],
    sub: ['#ffe0f5', '#d972c0', '#5c1f4d'],
    haloAtom: '143,137,217', haloInt: '92,201,230', haloSub: '217,114,192',
    ringAtom: 'rgba(180,170,240,0.6)', ringInt: 'rgba(120,210,235,0.6)', ringSub: 'rgba(225,150,210,0.6)',
  },
};
const TEMPO = { 'Klidné': 0.45, 'Standardní': 0.62, 'Rychlé': 0.95 };
const TEMPO_DUR = { 'Klidné': 96, 'Standardní': 66, 'Rychlé': 48 };

function Scene({ colorTheme = 'Oceán', tempo = 'Standardní', cameraStyle = 'Orbitující' } = {}) {
  const t = useTime();
  const theme = THEMES[colorTheme] || THEMES['Oceán'];
  const tempoMult = TEMPO[tempo] || TEMPO['Standardní'];
  const tc = Math.min(39, t * tempoMult);

  // ── defect phase timings ──
  const T_VAC = 4.0, T_INT = 9.6, T_SUB = 15.8, T_FIN = 22.5, T_EX = 29.3, T_END = 39;
  const vacProg = clamp((tc - T_VAC) / 0.9, 0, 1);
  const relaxT = Easing.easeOutCubic(clamp((tc - T_VAC - 0.3) / 1.1, 0, 1));
  const intProg = Easing.easeOutBack(clamp((tc - T_INT) / 0.6, 0, 1));
  const intOpacity = clamp((tc - T_INT) / 0.45, 0, 1);
  const pushT = Easing.easeOutCubic(clamp((tc - T_INT - 0.1) / 1.0, 0, 1));
  const subProg = Easing.easeOutBack(clamp((tc - T_SUB) / 0.7, 0, 1));
  const subShown = clamp((tc - T_SUB) / 0.35, 0, 1);
  const bowT = Easing.easeOutCubic(clamp((tc - T_SUB - 0.1) / 1.0, 0, 1));

  const relaxAmt = relaxT * 0.15;
  const pushAmt = pushT * 0.12;
  const bowAmt = bowT * 0.16;

  function dispOf(i, j) {
    for (const [ni, nj] of VAC_NEIGH) if (i === ni && j === nj) return { dx: -ni * relaxAmt, dy: -nj * relaxAmt };
    for (const [ni, nj] of GAP_NEIGH) {
      if (i === ni && j === nj) {
        const dx = ni - GAP.i, dy = nj - GAP.j, len = Math.hypot(dx, dy);
        return { dx: (dx / len) * pushAmt, dy: (dy / len) * pushAmt };
      }
    }
    for (const [ni, nj] of SUB_NEIGH) if (i === ni && j === nj) return { dx: (ni - SUB.i) * bowAmt, dy: (nj - SUB.j) * bowAmt };
    return { dx: 0, dy: 0 };
  }

  // ── camera ──
  const cx = 960;
  const cy = 548 - interpolate([T_FIN, T_FIN + 1.6], [0, 92], Easing.easeInOutCubic)(tc);
  const theta = cameraStyle === 'Statická' ? 0.18 : 0.18 + 0.045 * t;
  const tilt = interpolate([0, 3, 22, 39], [1.05, 0.94, 0.8, 0.8], Easing.easeInOutCubic)(tc);
  const zoom = interpolate([0, 3, T_FIN, T_FIN + 1.8, 39], [0.9, 1.0, 1.0, 0.8, 0.8], Easing.easeInOutCubic)(tc);
  const S = 152 * zoom;

  const cosT = Math.cos(theta), sinT = Math.sin(theta);
  const cosP = Math.cos(tilt), sinP = Math.sin(tilt);
  const project = (x, y, z) => {
    const rx = x * cosT - y * sinT;
    const ry = x * sinT + y * cosT;
    const ry2 = ry * cosP - z * sinP;
    const rz2 = ry * sinP + z * cosP;
    return { sx: cx + S * rx, sy: cy - S * rz2, depth: ry2 };
  };

  const items = [];

  // bonds
  BONDS.forEach((bd, bi) => {
    const appear = bondAppear(bd);
    const local = tc - appear;
    if (local < 0) return;
    const da = dispOf(bd.a.i, bd.a.j), db = dispOf(bd.b.i, bd.b.j);
    const ax = bd.a.i * SP + da.dx, ay = bd.a.j * SP + da.dy;
    const bx = bd.b.i * SP + db.dx, by = bd.b.j * SP + db.dy;
    const frac = Easing.easeOutCubic(clamp(local / 0.3, 0, 1));
    const tipx = ax + (bx - ax) * frac, tipy = ay + (by - ay) * frac;
    const p1 = project(ax, ay, 0), p2f = project(bx, by, 0), p2 = project(tipx, tipy, 0);
    const touchesVac = isVac(bd.a.i, bd.a.j) || isVac(bd.b.i, bd.b.j);
    const op = clamp(local / 0.28, 0, 1) * (touchesVac ? (1 - vacProg) : 1);
    if (op <= 0.001) return;
    items.push({ kind: 'bond', depth: (p1.depth + p2f.depth) / 2 - 0.03, x1: p1.sx, y1: p1.sy, x2: p2.sx, y2: p2.sy, op });
  });

  // grid atoms
  GRID.forEach((g) => {
    const local = tc - g.appear;
    if (local < 0) return;
    const disp = dispOf(g.i, g.j);
    const vac = isVac(g.i, g.j), sub = isSub(g.i, g.j);
    const x = g.i * SP + disp.dx, y = g.j * SP + disp.dy;
    const pr = project(x, y, 0);
    let op = clamp(local / 0.35, 0, 1);
    let scaleGrow = Easing.easeOutBack(clamp(local / 0.55, 0, 1));
    let r = 30 * scaleGrow * (1 + pr.depth * 0.05);
    let grad = 'gradA';
    if (vac) { op *= (1 - vacProg); r *= (1 - 0.35 * vacProg); }
    if (sub) { r = r * (1 + 0.62 * subProg); if (subProg > 0.03) grad = 'gradC'; }
    if (op <= 0.002) return;
    items.push({ kind: 'atom', depth: pr.depth, sx: pr.sx, sy: pr.sy, r, op, grad, ring: local < 0.55 ? clamp(local / 0.55, 0, 1) : (sub && subProg < 1 ? subProg : 1) });
  });

  // interstitial atom (popped slightly out of plane)
  if (intOpacity > 0.002) {
    const gx = GAP.i * SP, gy = GAP.j * SP, gz = 0.34 * clamp(intProg, 0, 1);
    const pr = project(gx, gy, gz);
    const r = 22 * intProg * (1 + pr.depth * 0.05);
    items.push({ kind: 'atom', depth: pr.depth + 0.4, sx: pr.sx, sy: pr.sy, r, op: intOpacity, grad: 'gradB', ring: clamp((tc - T_INT) / 0.6, 0, 1) });
  }

  items.sort((m, n) => m.depth - n.depth);

  const els = items.map((it, idx) => {
    if (it.kind === 'bond') {
      return (
        <g key={idx} opacity={it.op}>
          <line x1={it.x1} y1={it.y1} x2={it.x2} y2={it.y2} stroke="rgba(150,196,236,0.11)" strokeWidth={9} strokeLinecap="round" />
          <line x1={it.x1} y1={it.y1} x2={it.x2} y2={it.y2} stroke="rgba(150,196,236,0.48)" strokeWidth={3} strokeLinecap="round" />
        </g>
      );
    }
    const haloId = it.grad === 'gradB' ? 'haloB' : it.grad === 'gradC' ? 'haloC' : 'haloA';
    const ringCol = it.grad === 'gradB' ? theme.ringInt : it.grad === 'gradC' ? theme.ringSub : theme.ringAtom;
    return (
      <g key={idx} opacity={it.op}>
        <circle cx={it.sx} cy={it.sy} r={it.r * 2.05} fill={`url(#${haloId})`} opacity={0.85} />
        {it.ring < 1 && (
          <circle cx={it.sx} cy={it.sy} r={it.r * (1 + it.ring * 1.4)} fill="none" stroke={ringCol} strokeWidth={2} opacity={(1 - it.ring) * 0.7} />
        )}
        <circle cx={it.sx} cy={it.sy} r={it.r} fill={`url(#${it.grad})`} stroke="rgba(255,255,255,0.16)" strokeWidth={1} />
      </g>
    );
  });

  // vacancy marker (empty node, dashed)
  const vacPr = project(VAC.i * SP, VAC.j * SP, 0);
  const vacMarkOp = clamp((vacProg - 0.15) / 0.5, 0, 1);

  const sans = "'IBM Plex Sans', system-ui, sans-serif";
  const mono = "'IBM Plex Mono', ui-monospace, monospace";
  const steps = [
    { n: '01', txt: 'Ideální mřížka - bez poruch', a: 0.3, b: 1.0, c: 3.6, d: 4.0 },
    { n: '02', txt: 'Vakance — chybějící atom v uzlu mřížky', a: 3.8, b: 4.3, c: 9.0, d: 9.4 },
    { n: '03', txt: 'Intersticie — cizí atom v meziuzlové poloze', a: 9.2, b: 9.7, c: 15.2, d: 15.6 },
    { n: '04', txt: 'Substituce — cizí atom nahrazuje mřížkový', a: 15.4, b: 15.9, c: 20.6, d: 21.0 },
    { n: '05', txt: 'Bodové poruchy krystalové mřížky', a: 21.1, b: 21.5, c: 21.9, d: 22.3 },
  ];

  const defects = [
    { icon: 'vac', name: 'Vakance', col: '#9fb2c4', part: 'Chybějící atom v mřížkovém uzlu — usnadňuje difuzi a zotavení' },
    { icon: 'int', name: 'Intersticie', col: theme.int[1], part: 'Cizí (obvykle malý) atom v meziuzlové mezeře — místní pnutí mřížky' },
    { icon: 'sub', name: 'Substituce', col: theme.sub[1], part: 'Cizí atom nahrazuje hostitelský ve stejném uzlu — mřížkové zpevnění' },
  ];

  const examples = [
    { name: 'Intersticiální', col: theme.int[1], els: 'C, N, H, B', part: 'Malé atomy vmezeřené mezi atomy Fe — uhlík rozpuštěný v austenitu/martenzitu je základ kalitelnosti oceli' },
    { name: 'Substituční', col: theme.sub[1], els: 'Cr, Ni, Mn, Mo, Si, V, W', part: 'Legující prvky podobné velikosti jako Fe, nahrazují jej v mřížce — zlepšují prokalitelnost, tvrdost a korozivzdornost' },
  ];
  const cardsWrapOp = fade(tc, T_FIN - 0.1, T_FIN + 0.3, T_EX - 0.9, T_EX - 0.3);
  const exWrapOp = fade(tc, T_EX - 0.2, T_EX + 0.4, T_END + 5, T_END + 6);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 90% at 50% 42%, rgba(30,52,80,0.55) 0%, rgba(9,13,20,0) 60%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(150% 120% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)' }} />

      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id="gradA" cx="34%" cy="30%" r="75%">
            <stop offset="0%" stopColor={theme.atom[0]} /><stop offset="42%" stopColor={theme.atom[1]} /><stop offset="100%" stopColor={theme.atom[2]} />
          </radialGradient>
          <radialGradient id="gradB" cx="34%" cy="30%" r="75%">
            <stop offset="0%" stopColor={theme.int[0]} /><stop offset="42%" stopColor={theme.int[1]} /><stop offset="100%" stopColor={theme.int[2]} />
          </radialGradient>
          <radialGradient id="gradC" cx="34%" cy="30%" r="75%">
            <stop offset="0%" stopColor={theme.sub[0]} /><stop offset="42%" stopColor={theme.sub[1]} /><stop offset="100%" stopColor={theme.sub[2]} />
          </radialGradient>
          <radialGradient id="haloA" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={`rgba(${theme.haloAtom},0.5)`} /><stop offset="100%" stopColor={`rgba(${theme.haloAtom},0)`} />
          </radialGradient>
          <radialGradient id="haloB" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={`rgba(${theme.haloInt},0.5)`} /><stop offset="100%" stopColor={`rgba(${theme.haloInt},0)`} />
          </radialGradient>
          <radialGradient id="haloC" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={`rgba(${theme.haloSub},0.5)`} /><stop offset="100%" stopColor={`rgba(${theme.haloSub},0)`} />
          </radialGradient>
        </defs>
        {els}
        {vacMarkOp > 0.002 && (
          <g opacity={vacMarkOp}>
            <circle cx={vacPr.sx} cy={vacPr.sy} r={22} fill="none" stroke="rgba(200,212,226,0.55)" strokeWidth={2} strokeDasharray="5 6" />
            <line x1={vacPr.sx - 8} y1={vacPr.sy - 8} x2={vacPr.sx + 8} y2={vacPr.sy + 8} stroke="rgba(200,212,226,0.5)" strokeWidth={1.6} />
            <line x1={vacPr.sx + 8} y1={vacPr.sy - 8} x2={vacPr.sx - 8} y2={vacPr.sy + 8} stroke="rgba(200,212,226,0.5)" strokeWidth={1.6} />
          </g>
        )}
      </svg>

      {/* title */}
      <div style={{ position: 'absolute', left: 84, top: 74, opacity: fade(tc, 0.2, 0.9, T_END, T_END + 0.6) }}>
        <div style={{ fontFamily: mono, fontSize: 18, letterSpacing: '0.28em', color: theme.accent, textTransform: 'uppercase' }}>Krystalová struktura</div>
        <div style={{ fontFamily: sans, fontSize: 40, fontWeight: 600, color: '#eaf2fa', marginTop: 10, letterSpacing: '-0.01em' }}>Bodové poruchy mřížky</div>
      </div>

      {/* small growing legend */}
      <div style={{ position: 'absolute', left: 84, bottom: 76, display: 'flex', gap: 24, fontFamily: mono, fontSize: 16.5, color: '#aebfcf', opacity: fade(tc, 1.6, 2.2, T_FIN - 0.3, T_FIN + 0.2) * (1 - clamp((tc - T_EX + 0.5) / 0.6, 0, 1)) }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 14, height: 14, borderRadius: '50%', background: theme.atom[1] }} />atomy mřížky
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 9, opacity: fade(tc, T_VAC, T_VAC + 0.6, T_FIN - 0.3, T_FIN + 0.2) }}>
          <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px dashed rgba(200,212,226,0.7)' }} />vakance
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 9, opacity: fade(tc, T_INT, T_INT + 0.6, T_FIN - 0.3, T_FIN + 0.2) }}>
          <span style={{ width: 14, height: 14, borderRadius: '50%', background: theme.int[1] }} />intersticie
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 9, opacity: fade(tc, T_SUB, T_SUB + 0.6, T_FIN - 0.3, T_FIN + 0.2) }}>
          <span style={{ width: 14, height: 14, borderRadius: '50%', background: theme.sub[1] }} />substituce
        </span>
      </div>

      {/* summary cards */}
      {cardsWrapOp > 0.002 && (
        <div style={{ position: 'absolute', left: '50%', bottom: 70, transform: 'translateX(-50%)', width: '100%', textAlign: 'center', opacity: cardsWrapOp }}>
          <div style={{ fontFamily: mono, fontSize: 16, letterSpacing: '0.24em', color: theme.accent, marginBottom: 26, opacity: fade(tc, T_FIN, T_FIN + 0.5, T_EX - 0.9, T_EX - 0.3) }}>Typy bodových poruch</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 18 }}>
            {defects.map((d, i) => {
              const o = fade(tc, T_FIN + 0.25 + i * 0.17, T_FIN + 0.75 + i * 0.17, T_EX - 0.9, T_EX - 0.3);
              return (
                <div key={i} style={{ width: 280, padding: '20px 20px', borderRadius: 12, background: 'rgba(120,180,230,0.05)', border: '1px solid rgba(120,180,230,0.16)', opacity: o, transform: `translateY(${(1 - o) * 14}px)`, textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 26, height: 26, borderRadius: '50%', flex: '0 0 auto', background: d.icon === 'vac' ? 'transparent' : d.col, border: d.icon === 'vac' ? `2px dashed ${d.col}` : 'none' }} />
                    <span style={{ fontFamily: sans, fontSize: 20, fontWeight: 600, color: '#eaf2fa' }}>{d.name}</span>
                  </div>
                  <div style={{ height: 1, background: 'rgba(120,180,230,0.16)', margin: '14px 0 12px' }} />
                  <div style={{ fontFamily: sans, fontSize: 15, fontWeight: 400, color: '#bdccd9', lineHeight: 1.4 }}>{d.part}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* steel examples */}
      {exWrapOp > 0.002 && (
        <div style={{ position: 'absolute', left: '50%', bottom: 70, transform: 'translateX(-50%)', width: '100%', textAlign: 'center', opacity: exWrapOp }}>
          <div style={{ fontFamily: mono, fontSize: 16, letterSpacing: '0.24em', color: theme.accent, marginBottom: 26 }}>Příklady u ocelí</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 18 }}>
            {examples.map((ex, i) => {
              const o = clamp((tc - (T_EX + 0.25 + i * 0.22)) / 0.5, 0, 1);
              return (
                <div key={i} style={{ width: 400, padding: '22px 24px', borderRadius: 12, background: 'rgba(120,180,230,0.05)', border: '1px solid rgba(120,180,230,0.16)', opacity: o, transform: `translateY(${(1 - o) * 14}px)`, textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 26, height: 26, borderRadius: '50%', flex: '0 0 auto', background: ex.col }} />
                    <span style={{ fontFamily: sans, fontSize: 20, fontWeight: 600, color: '#eaf2fa' }}>{ex.name}</span>
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 22, fontWeight: 600, color: ex.col, marginTop: 14, letterSpacing: '0.04em' }}>{ex.els}</div>
                  <div style={{ height: 1, background: 'rgba(120,180,230,0.16)', margin: '14px 0 12px' }} />
                  <div style={{ fontFamily: sans, fontSize: 15, fontWeight: 400, color: '#bdccd9', lineHeight: 1.4 }}>{ex.part}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* step captions */}
      {steps.map((s, i) => {
        const o = fade(tc, s.a, s.b, s.c, s.d);
        if (o < 0.001) return null;
        return (
          <div key={i} style={{ position: 'absolute', left: '50%', bottom: 96, transform: `translate(-50%, ${(1 - o) * 10}px)`, opacity: o, textAlign: 'center' }}>
            <div style={{ fontFamily: mono, fontSize: 16, letterSpacing: '0.24em', color: theme.accent, marginBottom: 12 }}>{s.n}</div>
            <div style={{ fontFamily: sans, fontSize: 32, fontWeight: 500, color: '#eaf2fa', letterSpacing: '-0.005em' }}>{s.txt}</div>
          </div>
        );
      })}
    </div>
  );
}

function PointDefectsAnimation(props = {}) {
  const tempo = props.tempo || 'Standardní';
  return (
    <Stage width={1920} height={1080} duration={TEMPO_DUR[tempo] || 66} background="#080b12" persistKey="point-defects-crystal" loop={false}>
      <Scene colorTheme={props.colorTheme} tempo={props.tempo} cameraStyle={props.cameraStyle} />
    </Stage>
  );
}

window.PointDefectsAnimation = PointDefectsAnimation;
