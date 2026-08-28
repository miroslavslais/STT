// zihani.jsx — Žíhání oceli: 5 metod (ke snížení pnutí, rekrystalizační, na měkko, normalizační, homogenizační).
// Panely v posuvném okně (3 ze 5 viditelné) + společný Fe–Fe3C diagram s teplotními pásy.
const { Stage, useTime, useTimeline, Easing, interpolate, clamp } = window;

const sans = "'IBM Plex Sans', system-ui, sans-serif";
const mono = "'IBM Plex Mono', ui-monospace, monospace";

function fade(t, a, b, c, d) {
  if (t <= a || t >= d) return 0;
  if (t < b) return clamp((t - a) / (b - a), 0, 1);
  if (t > c) return clamp(1 - (t - c) / (d - c), 0, 1);
  return 1;
}
const lerp = (a, b, u) => a + (b - a) * u;
const rnd = (seed) => { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); };

// ── hexagonální síť zrn (deterministická, žádné externí knihovny) ──────────
function hexGrid(w, h, size, jitter) {
  const cells = [];
  const hSpace = size * Math.sqrt(3);
  const vSpace = size * 1.5;
  let row = 0;
  for (let y = size * 0.7; y < h + size * 0.4; y += vSpace) {
    const offset = row % 2 === 0 ? 0 : hSpace / 2;
    for (let x = size * 0.7; x < w + size * 0.4; x += hSpace) {
      const cx = x + offset, cy = y;
      const seed = row * 131.7 + Math.round(cx) * 0.7 + Math.round(cy) * 1.3;
      const jx = (rnd(seed) - 0.5) * jitter, jy = (rnd(seed + 3.1) - 0.5) * jitter;
      cells.push({ cx: cx + jx, cy: cy + jy, seed });
    }
    row++;
  }
  return cells;
}
function hexPts(cx, cy, size, seed, vertJitter) {
  const pts = [];
  for (let k = 0; k < 6; k++) {
    const ang = (Math.PI / 180) * (60 * k + 30);
    const jr = 1 + (rnd(seed + k * 13.7) - 0.5) * vertJitter;
    pts.push(`${(cx + Math.cos(ang) * size * jr).toFixed(1)},${(cy + Math.sin(ang) * size * jr).toFixed(1)}`);
  }
  return pts.join(' ');
}

const STR = { x: 40, y: 92, w: 472, h: 190 };
const GRID_FINE = hexGrid(STR.w, STR.h, 25, 0.22).map((c) => ({ ...c, pts: hexPts(c.cx, c.cy, 25, c.seed, 0.22) }));
const GRID_COARSE = hexGrid(STR.w, STR.h, 50, 0.55).map((c) => ({ ...c, pts: hexPts(c.cx, c.cy, 50, c.seed, 0.55) }));
const GRID_MED = hexGrid(STR.w, STR.h, 34, 0.3).map((c) => ({ ...c, pts: hexPts(c.cx, c.cy, 34, c.seed, 0.3) }));
const CORE_C = [34, 56, 82];

// ── metody (v pořadí rostoucí teploty) ──────────────────────────────────────
const METHODS = [
  {
    key: 'stress', n: '01', name: 'Žíhání ke snížení pnutí', sub: '500–650 °C · pod Ac1',
    acc: [140, 150, 255], hex: '#8c96ff',
    t0: 0, t1: 8, pStart: 1.0, pDur: 6.4, revStart: 2, revDur: 5,
    facts: [
      ['teplota', '500–650 °C'],
      ['chlazení', 'pomalé, na vzduchu'],
      ['výdrž', '1–3 h'],
      ['výsledek', 'sníženo vnitřní pnutí, zrno beze změny'],
    ],
    note: 'odstraňuje vnitřní pnutí po svařování, obrábění či odlévání — bez fázové přeměny',
    band: 'Pod teplotou rekrystalizace — jen relaxace napětí difuzí a pohybem dislokací, zrna se nemění.',
  },
  {
    key: 'recryst', n: '02', name: 'Rekrystalizační žíhání', sub: '550–700 °C · pod Ac1',
    acc: [120, 214, 160], hex: '#78d6a0',
    t0: 8, t1: 16, pStart: 9.0, pDur: 5.6, revStart: 10, revDur: 5,
    facts: [
      ['teplota', '550–700 °C'],
      ['chlazení', 'na vzduchu'],
      ['výdrž', '1–2 h'],
      ['výsledek', 'nová jemná, rovnoměrná zrna'],
    ],
    note: 'obnovuje tvárnost po tváření za studena — nahrazuje deformovaná zrna novými',
    band: 'Nad teplotou rekrystalizace, ale pod Ac1 — nedochází k fázové přeměně, jen ke vzniku nových zrn.',
  },
  {
    key: 'soft', n: '03', name: 'Žíhání na měkko', sub: '~Ac1 · velmi pomalé chlazení',
    acc: [201, 143, 224], hex: '#c98fe0',
    t0: 16, t1: 24, pStart: 17.0, pDur: 6.0, revStart: 18, revDur: 5,
    facts: [
      ['teplota', 'kolem Ac1 (680–750 °C)'],
      ['chlazení', 'velmi pomalé'],
      ['výdrž', 'několik hodin'],
      ['výsledek', 'globulární (kulovitý) cementit'],
    ],
    note: 'zlepšuje obrobitelnost a tažnost před tvářením za studena',
    band: 'Kolem Ac1 — kolísání mezi austenitem a feritem/cementitem pohání sferoidizaci lamel.',
  },
  {
    key: 'norm', n: '04', name: 'Normalizační žíhání', sub: 'Ac3(Acm) + 30–50 °C · vzduch',
    acc: [111, 194, 232], hex: '#6fc2e8',
    t0: 24, t1: 32, pStart: 25.0, pDur: 5.6, revStart: 26, revDur: 5,
    facts: [
      ['teplota', 'Ac3(Acm) + 30–50 °C'],
      ['chlazení', 'na vzduchu'],
      ['výdrž', 'krátká (dle průřezu)'],
      ['výsledek', 'jemné, rovnoměrné zrno'],
    ],
    note: 'odstraňuje hrubé a nerovnoměrné zrno po lití, kování či svařování',
    band: 'Těsně nad Ac3 (hypoeutektoidní) nebo Acm (hypereutektoidní oceli) — struktura celá zaustenitizuje.',
  },
  {
    key: 'hom', n: '05', name: 'Homogenizační žíhání', sub: '1050–1150 °C · dlouhá výdrž',
    acc: [227, 164, 88], hex: '#e3a458',
    t0: 32, t1: 40, pStart: 33.0, pDur: 6.4, revStart: 34, revDur: 5,
    facts: [
      ['teplota', '1050–1150 °C'],
      ['chlazení', 'pomalé, v peci'],
      ['výdrž', '10–20 h'],
      ['výsledek', 'stejnorodé složení, hrubší zrno'],
    ],
    note: 'odstraňuje odlévací (dendritickou) segregaci — zrno je nutné později zjemnit',
    band: 'Vysoko nad Ac3/Acm, bez ohledu na obsah uhlíku — cílem je difuze, ne fázová přeměna.',
  },
];

const DUR = 52;
const PHASES = [
  { t0: 0, t1: 8, n: '01', lab: 'Ke snížení pnutí' },
  { t0: 8, t1: 16, n: '02', lab: 'Rekrystalizační' },
  { t0: 16, t1: 24, n: '03', lab: 'Na měkko' },
  { t0: 24, t1: 32, n: '04', lab: 'Normalizační' },
  { t0: 32, t1: 40, n: '05', lab: 'Homogenizační' },
  { t0: 40, t1: 52, n: '06', lab: 'Porovnání' },
];

const COLS = [
  { x: 84, y: 200, w: 552, h: 500 },
  { x: 684, y: 200, w: 552, h: 500 },
  { x: 1284, y: 200, w: 552, h: 500 },
];
const CH = { x: 84, y: 722, w: 1752, h: 260, padL: 96, padR: 30, padT: 70, padB: 46 };
const CMAX = 2, TMIN = 480, TMAX = 1200;
const chX = (c) => CH.x + CH.padL + (clamp(c, 0, CMAX) / CMAX) * (CH.w - CH.padL - CH.padR);
const chY = (temp) => CH.y + CH.padT + (1 - (clamp(temp, TMIN, TMAX) - TMIN) / (TMAX - TMIN)) * (CH.h - CH.padT - CH.padB);
const FEC = window.FEC || {   // vnitrni-stavba-kovu-a-tz/fe-c-konstanty.js (záložní kopie, kdyby se soubor nenačetl)
  C_P: 0.018, C_S: 0.765, C_E: 2.14, C_C: 4.3, C_CEM: 6.68, EUT_TOL: 0.02,
  T_A: 1538, T_G: 911, T_EUT: 1147, T_A1: 727, T_D: 1380,
  CEM: { HV_SURFACE: 690, HRC_SURFACE: 60, HV_CORE: 165, C_CORE: 0.17 },
  cz: function (v, dec) { return (dec == null ? String(v) : v.toFixed(dec)).replace('.', ','); },
};
const upperCrit = (c) => (c <= FEC.C_S
  ? FEC.T_G - (FEC.T_G - FEC.T_A1) * (c / FEC.C_S)
  : FEC.T_A1 + (FEC.T_EUT - FEC.T_A1) * ((c - FEC.C_S) / (FEC.C_E - FEC.C_S)));

// ── struktura: ke snížení pnutí (stress lines fading, zrna beze změny) ─────
function StressStructure({ m, p }) {
  const grains = GRID_MED.map((cell, i) => (
    <polygon key={'g' + i} points={cell.pts} fill="rgba(58,72,92,0.5)" stroke="rgba(150,180,210,0.3)" strokeWidth={1.3} />
  ));
  const stressOp = clamp(1 - p, 0, 1);
  const lines = GRID_MED.map((cell, i) => {
    const ang = rnd(cell.seed + 4) * 180;
    const len = lerp(20, 6, p);
    const rad = (ang * Math.PI) / 180;
    const x1 = cell.cx - Math.cos(rad) * len / 2, y1 = cell.cy - Math.sin(rad) * len / 2;
    const x2 = cell.cx + Math.cos(rad) * len / 2, y2 = cell.cy + Math.sin(rad) * len / 2;
    return <line key={'s' + i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={m.hex} strokeWidth={2.2} opacity={stressOp * 0.75} strokeLinecap="round" />;
  });
  return <g>{grains}{lines}</g>;
}

// ── struktura: rekrystalizační (deformovaná/protažená zrna → nová jemná zrna) ─
function RecrystStructure({ m, p }) {
  const deformedOp = clamp(1 - p * 1.15, 0, 1);
  const newOp = clamp((p - 0.15) / 0.6, 0, 1);
  const deformed = GRID_COARSE.map((cell, i) => (
    <g key={'d' + i} transform={`translate(${cell.cx},${cell.cy}) scale(1.9,0.5) translate(${-cell.cx},${-cell.cy})`}>
      <polygon points={cell.pts} fill="rgba(70,84,102,0.5)" stroke="rgba(150,180,210,0.32)" strokeWidth={1.6} />
      <line x1={cell.cx - 20} y1={cell.cy - 6} x2={cell.cx + 20} y2={cell.cy - 6} stroke="rgba(150,180,210,0.3)" strokeWidth={1.1} />
      <line x1={cell.cx - 20} y1={cell.cy + 6} x2={cell.cx + 20} y2={cell.cy + 6} stroke="rgba(150,180,210,0.3)" strokeWidth={1.1} />
    </g>
  ));
  const fresh = GRID_FINE.map((cell, i) => {
    const u = 0.4 + 0.25 * rnd(cell.seed);
    const r = lerp(CORE_C[0], m.acc[0], u), g = lerp(CORE_C[1], m.acc[1], u), b = lerp(CORE_C[2], m.acc[2], u);
    return <polygon key={'f' + i} points={cell.pts} fill={`rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`}
      stroke="rgba(10,14,20,0.4)" strokeWidth={1.1} />;
  });
  return <g><g opacity={deformedOp}>{deformed}</g><g opacity={newOp}>{fresh}</g></g>;
}

// ── struktura: homogenizační (difuze segregace) ─────────────────────────────
function HomStructure({ m, p }) {
  const cells = GRID_MED.map((cell, i) => {
    const band = Math.sin(cell.cx * 0.045 + cell.cy * 0.09 + 1.3) * 0.5 + 0.5;
    const richU = clamp(band, 0, 1);
    const r0 = lerp(CORE_C[0], m.acc[0], richU * 0.85), g0 = lerp(CORE_C[1], m.acc[1], richU * 0.85), b0 = lerp(CORE_C[2], m.acc[2], richU * 0.85);
    const uniformU = 0.5;
    const r1 = lerp(CORE_C[0], m.acc[0], uniformU), g1 = lerp(CORE_C[1], m.acc[1], uniformU), b1 = lerp(CORE_C[2], m.acc[2], uniformU);
    const r = lerp(r0, r1, p), g = lerp(g0, g1, p), b = lerp(b0, b1, p);
    return (
      <polygon key={i} points={cell.pts} fill={`rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`}
        stroke={`rgba(10,14,20,${(0.5 - p * 0.25).toFixed(2)})`} strokeWidth={1.4} />
    );
  });
  return <g>{cells}</g>;
}

// ── struktura: normalizační (hrubé/jehlicovité → jemné rovnoměrné) ─────────
function NormStructure({ m, p, t, phaseT }) {
  const heat = fade(phaseT, 0.55, 1.0, 2.0, 2.5);
  const coarseOp = clamp(1 - p * 1.15, 0, 1);
  const fineOp = clamp((p - 0.15) / 0.6, 0, 1);
  const needleOp = clamp(1 - p * 2.2, 0, 1);
  const coarse = GRID_COARSE.map((cell, i) => (
    <polygon key={'c' + i} points={cell.pts} fill="rgba(64,78,96,0.42)" stroke="rgba(150,180,210,0.3)" strokeWidth={1.6} />
  ));
  const needles = GRID_COARSE.map((cell, i) => {
    const ang = rnd(cell.seed + 5) * 60 - 30;
    return (
      <line key={'n' + i} x1={cell.cx - 16} y1={cell.cy} x2={cell.cx + 16} y2={cell.cy}
        stroke={m.hex} strokeWidth={1.6} opacity={0.55}
        transform={`rotate(${ang} ${cell.cx} ${cell.cy})`} />
    );
  });
  const fine = GRID_FINE.map((cell, i) => {
    const u = 0.35 + 0.25 * rnd(cell.seed);
    const r = lerp(CORE_C[0], m.acc[0], u), g = lerp(CORE_C[1], m.acc[1], u), b = lerp(CORE_C[2], m.acc[2], u);
    return <polygon key={'f' + i} points={cell.pts} fill={`rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`}
      stroke="rgba(10,14,20,0.4)" strokeWidth={1.1} />;
  });
  return (
    <g>
      <g opacity={coarseOp}>{coarse}<g opacity={needleOp}>{needles}</g></g>
      <g opacity={fineOp}>{fine}</g>
      <rect x={0} y={0} width={STR.w} height={STR.h} fill="rgba(235,120,60,0.55)" opacity={heat * 0.28} />
    </g>
  );
}

// ── struktura: na měkko (lamely cementitu → globule) ────────────────────────
function SoftStructure({ m, p }) {
  const grains = GRID_MED.map((cell, i) => (
    <polygon key={'g' + i} points={cell.pts} fill="rgba(56,72,92,0.4)" stroke="rgba(150,180,210,0.28)" strokeWidth={1.4} />
  ));
  const carbides = [];
  GRID_MED.forEach((cell, ci) => {
    const ang = rnd(cell.seed + 2) * 40 - 20;
    for (let k = -1; k <= 1; k++) {
      const L = lerp(26, 11, p);
      const W = lerp(5.5, 11, p);
      const off = k * lerp(9, 13, p);
      const dx = Math.cos((ang * Math.PI) / 180), dy = Math.sin((ang * Math.PI) / 180);
      const px = cell.cx - dy * off, py = cell.cy + dx * off;
      carbides.push(
        <rect key={ci + '_' + k} x={px - L / 2} y={py - W / 2} width={L} height={W} rx={W / 2}
          transform={`rotate(${ang} ${px} ${py})`} fill={m.hex} opacity={0.82} />
      );
    }
  });
  return <g>{grains}{carbides}</g>;
}

function progressOf(m, t) { return clamp((t - m.pStart) / m.pDur, 0, 1); }

function Scene() {
  const t = useTime();
  const { setTime, setPlaying } = useTimeline();
  const [selBand, setSelBand] = React.useState(null);
  const [windowStart, setWindowStart] = React.useState(0);
  const [selectedPhase, setSelectedPhase] = React.useState(0);
  const loopRef = React.useRef(null);

  React.useEffect(() => {
    if (loopRef.current != null && t >= loopRef.current.t1 - 0.02) {
      setTime(loopRef.current.t0);
    }
  }, [t, setTime]);

  const playPhase = (ph, idx) => {
    setSelBand(null);
    setSelectedPhase(idx);
    if (idx === 5) {
      loopRef.current = null;
      setPlaying(false); setTime(52);
      return;
    }
    setWindowStart(clamp(idx - 1, 0, 2));
    loopRef.current = { t0: ph.t0, t1: ph.t1 };
    setTime(ph.t0); setPlaying(true);
  };

  const captions = [
    { txt: 'Žíhání ke snížení pnutí: pod teplotou rekrystalizace se difuzí a pohybem dislokací uvolní vnitřní pnutí, zrna se nemění', a: 0.3, b: 1, c: 7.4, d: 8.2 },
    { txt: 'Rekrystalizační žíhání: deformovaná (protažená) zrna po tváření za studena nahradí nová jemná, nedeformovaná zrna', a: 8.1, b: 8.8, c: 15.4, d: 16.2 },
    { txt: 'Žíhání na měkko: dlouhá výdrž u Ac1 a velmi pomalé chladnutí přemění lamely cementitu na kulovité částice', a: 16.1, b: 16.8, c: 23.4, d: 24.2 },
    { txt: 'Normalizační žíhání: ohřev nad Ac3(Acm), krátká výdrž, chladnutí na vzduchu — vzniká jemné a rovnoměrné zrno', a: 24.1, b: 24.8, c: 31.4, d: 32.2 },
    { txt: 'Homogenizační žíhání: dlouhá výdrž při vysoké teplotě sjednotí chemické složení odlitku difuzí — zrno přitom zhrubne', a: 32.1, b: 32.8, c: 39.4, d: 40.2 },
    { txt: 'Porovnání: klikněte na žíhání v legendě — v diagramu vidíte, kde v Fe–Fe3C soustavě jeho teplotní rozsah leží', a: 40.1, b: 40.8, c: 52, d: 53 },
  ];

  const panels = METHODS.map((m, mi) => {
    const rel = mi - windowStart;
    if (rel < 0 || rel > 2) return null;
    const C = COLS[rel];
    const p = progressOf(m, t);
    const active = mi === selectedPhase;
    const factsOp = 0.3 + 0.7 * clamp((t - m.t0 - 0.5) / 0.8, 0, 1);
    const accStr = `rgba(${m.acc[0]},${m.acc[1]},${m.acc[2]},`;
    const phaseT = t - m.pStart;

    let vis;
    if (m.key === 'stress') vis = <StressStructure m={m} p={p} />;
    else if (m.key === 'recryst') vis = <RecrystStructure m={m} p={p} />;
    else if (m.key === 'hom') vis = <HomStructure m={m} p={p} />;
    else if (m.key === 'norm') vis = <NormStructure m={m} p={p} t={t} phaseT={phaseT} />;
    else vis = <SoftStructure m={m} p={p} />;

    return (
      <g key={m.key} transform={`translate(${C.x},${C.y})`} onClick={() => playPhase(PHASES[mi], mi)} style={{ cursor: 'pointer' }}>
        <rect x={0} y={0} width={C.w} height={C.h} rx={16}
          fill={active ? accStr + '0.05)' : 'rgba(120,180,230,0.03)'}
          stroke={active ? accStr + '0.55)' : 'rgba(120,180,230,0.14)'} strokeWidth={1.4} />

        <text x={28} y={46} fontFamily={mono} fontSize={18} fontWeight={600} fill={active ? m.hex : '#7d8ea0'}>{m.n}</text>
        <text x={64} y={46} fontFamily={sans} fontSize={23} fontWeight={600} fill="#eaf2fa">{m.name}</text>
        <text x={64} y={75} fontFamily={mono} fontSize={15.5} fill={m.hex}>{m.sub}</text>
        <path d={`M${C.w - 40},${34} l11,7 l-11,7 Z`} fill={active ? accStr + '0.85)' : 'rgba(150,180,210,0.55)'}
          style={{ animation: 'zhPulse 1.8s ease-in-out infinite' }} />

        <g transform={`translate(${STR.x},${STR.y})`}>
          <clipPath id={`strclip-${m.key}`}><rect x={0} y={0} width={STR.w} height={STR.h} rx={10} /></clipPath>
          <g clipPath={`url(#strclip-${m.key})`}>
            <rect x={0} y={0} width={STR.w} height={STR.h} fill="rgba(8,12,18,0.4)" />
            {vis}
          </g>
          <rect x={0} y={0} width={STR.w} height={STR.h} rx={10} fill="none" stroke="rgba(150,196,236,0.3)" strokeWidth={1.3} />
        </g>

        <g opacity={factsOp}>
          {m.facts.map(([lab, val], fi) => (
            <g key={fi}>
              <text x={40} y={332 + fi * 27} fontFamily={mono} fontSize={14.5} fill="#7d8ea0">{lab}</text>
              <text x={172} y={332 + fi * 27} fontFamily={mono} fontSize={15} fontWeight={500} fill="#dbe6f0">{val}</text>
            </g>
          ))}
          <foreignObject x={40} y={438} width={C.w - 68} height={56}>
            <div style={{ fontFamily: sans, fontSize: 15, lineHeight: 1.4, color: '#9fb0c0' }}>{m.note}</div>
          </foreignObject>
        </g>
      </g>
    );
  });

  // ── Fe–Fe3C diagram ──
  const upperPts = [];
  for (let i = 0; i <= 100; i++) { const c = (CMAX * i) / 100; upperPts.push(`${chX(c).toFixed(1)},${chY(upperCrit(c)).toFixed(1)}`); }
  const normBandPts = [];
  for (let i = 0; i <= 100; i++) { const c = (CMAX * i) / 100; normBandPts.push(`${chX(c).toFixed(1)},${chY(upperCrit(c) + 45).toFixed(1)}`); }
  for (let i = 100; i >= 0; i--) { const c = (CMAX * i) / 100; normBandPts.push(`${chX(c).toFixed(1)},${chY(upperCrit(c)).toFixed(1)}`); }

  const revOf = (m) => clamp((t - m.revStart) / m.revDur, 0, 1);
  const dimmed = (key) => (selBand && selBand !== key ? 0.12 : 1);
  const activeCaption = selBand ? METHODS.find((m) => m.key === selBand) : null;

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <style>{`
        @keyframes zhPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        @keyframes zhRing { 0%, 100% { box-shadow: 0 0 0 0 rgba(244,197,66,0); } 50% { box-shadow: 0 0 0 4px rgba(244,197,66,0.18); } }
      `}</style>
      <div style={{ position: 'absolute', inset: 0,
        background: 'radial-gradient(120% 90% at 40% 44%, rgba(30,52,80,0.45) 0%, rgba(9,13,20,0) 62%)' }} />

      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        {panels}

        {/* ══ Fe–Fe3C diagram ══ */}
        <rect x={CH.x} y={CH.y} width={CH.w} height={CH.h} rx={16} fill="rgba(120,180,230,0.03)" stroke="rgba(120,180,230,0.14)" />
        <text x={CH.x + 24} y={CH.y + 28} fontFamily={mono} fontSize={19} letterSpacing="0.18em" fill="#7fb4d6">FE–FE₃C DIAGRAM · TEPLOTNÍ ROZSAHY ŽÍHÁNÍ</text>

        {[0, 0.4, 0.8, 1.2, 1.6, 2.0].map((c) => (
          <g key={'gx' + c}>
            <line x1={chX(c)} y1={CH.y + CH.padT} x2={chX(c)} y2={CH.y + CH.h - CH.padB} stroke="rgba(150,180,210,0.08)" />
            <text x={chX(c)} y={CH.y + CH.h - CH.padB + 20} fontFamily={mono} fontSize={14.5} fill="#7d8ea0" textAnchor="middle">{c.toFixed(1)}</text>
          </g>
        ))}
        {[500, 600, 727, 800, 900, 1000, 1100, 1200].map((v) => {
          const major = v === 500 || v === 1000;
          return (
            <g key={'gy' + v}>
              {major || v === 727 ? (
                <line x1={CH.x + CH.padL} y1={chY(v)} x2={CH.x + CH.w - CH.padR} y2={chY(v)}
                  stroke={v === 727 ? 'rgba(244,197,66,0.25)' : 'rgba(150,180,210,0.1)'} strokeDasharray={v === 727 ? '6 6' : 'none'} />
              ) : (
                <line x1={CH.x + CH.padL - 6} y1={chY(v)} x2={CH.x + CH.padL} y2={chY(v)} stroke="rgba(150,180,210,0.4)" strokeWidth={1.4} />
              )}
              {(major || v === 727) && (
                <text x={CH.x + CH.padL - 10} y={chY(v) + 4} fontFamily={mono} fontSize={14} fill={v === 727 ? '#d3ad55' : '#7d8ea0'} textAnchor="end">{v}</text>
              )}
            </g>
          );
        })}
        <text x={CH.x + 30} y={CH.y + (CH.padT + CH.h - CH.padB) / 2} fontFamily={mono} fontSize={15.5} fill="#aebfcf" textAnchor="middle"
          transform={`rotate(-90 ${CH.x + 30} ${CH.y + (CH.padT + CH.h - CH.padB) / 2})`}>teplota [°C]</text>
        <text x={CH.x + CH.w / 2} y={CH.y + CH.h - 8} fontFamily={mono} fontSize={15.5} fill="#aebfcf" textAnchor="middle">obsah uhlíku [% C]</text>

        {/* pásy žíhání */}
        <g opacity={dimmed('stress')}>
          <clipPath id="revstress"><rect x={CH.x} y={CH.y} width={(CH.w) * revOf(METHODS[0])} height={CH.h} /></clipPath>
          <rect x={chX(0)} y={chY(650)} width={chX(2) - chX(0)} height={chY(500) - chY(650)}
            fill={METHODS[0].hex} opacity={0.24} clipPath="url(#revstress)" />
        </g>
        <g opacity={dimmed('recryst')}>
          <clipPath id="revrecryst"><rect x={CH.x} y={CH.y} width={(CH.w) * revOf(METHODS[1])} height={CH.h} /></clipPath>
          <rect x={chX(0)} y={chY(700)} width={chX(2) - chX(0)} height={chY(550) - chY(700)}
            fill={METHODS[1].hex} opacity={0.24} clipPath="url(#revrecryst)" />
        </g>
        <g opacity={dimmed('soft')}>
          <clipPath id="revsoft"><rect x={CH.x} y={CH.y} width={(CH.w) * revOf(METHODS[2])} height={CH.h} /></clipPath>
          <rect x={chX(0)} y={chY(752)} width={chX(2) - chX(0)} height={chY(690) - chY(752)}
            fill={METHODS[2].hex} opacity={0.3} clipPath="url(#revsoft)" />
        </g>
        <g opacity={dimmed('norm')}>
          <clipPath id="revnorm"><rect x={CH.x} y={CH.y} width={(CH.w) * revOf(METHODS[3])} height={CH.h} /></clipPath>
          <polygon points={normBandPts} fill={METHODS[3].hex} opacity={0.24} clipPath="url(#revnorm)" />
        </g>
        <g opacity={dimmed('hom')}>
          <clipPath id="revhom"><rect x={CH.x} y={CH.y} width={(CH.w) * revOf(METHODS[4])} height={CH.h} /></clipPath>
          <rect x={chX(0)} y={chY(1150)} width={chX(2) - chX(0)} height={chY(1050) - chY(1150)}
            fill={METHODS[4].hex} opacity={0.22} clipPath="url(#revhom)" />
        </g>

        {/* kritické křivky */}
        <path d={'M' + upperPts.join(' L')} fill="none" stroke="#c9d6e2" strokeWidth={2} />
        <text x={chX(0.05)} y={chY(upperCrit(0.05)) - 8} fontFamily={mono} fontSize={14.5} fill="#c9d6e2">Ac3</text>
        <text x={chX(1.7)} y={chY(upperCrit(1.7)) - 8} fontFamily={mono} fontSize={14.5} fill="#c9d6e2">Acm</text>
        <line x1={chX(0.02)} y1={chY(727)} x2={chX(2)} y2={chY(727)} stroke="#d3ad55" strokeWidth={2} strokeDasharray="7 5" />
        <text x={CH.x + CH.w - CH.padR - 8} y={chY(727) - 8} fontFamily={mono} fontSize={14.5} fill="#d3ad55" textAnchor="end">A₁ = 727 °C</text>
        <circle cx={chX(FEC.C_S)} cy={chY(FEC.T_A1)} r={4.5} fill="#eaf2fa" />
        <text x={chX(FEC.C_S) + 8} y={chY(FEC.T_A1) + 18} fontFamily={mono} fontSize={13.5} fill="#93a5b6">S ({FEC.cz(FEC.C_S)} % C)</text>

        {/* legenda */}
        {METHODS.map((m, i) => (
          <g key={'lg' + m.key} onClick={() => setSelBand(selBand === m.key ? null : m.key)} style={{ cursor: 'pointer' }}>
            <rect x={CH.x + 24 + i * 340} y={CH.y + 38} width={320} height={30} rx={8}
              fill={selBand === m.key ? `rgba(${m.acc[0]},${m.acc[1]},${m.acc[2]},0.14)` : 'transparent'}
              stroke={selBand === m.key ? m.hex : 'transparent'} strokeWidth={1.2} />
            <rect x={CH.x + 40 + i * 340} y={CH.y + 48} width={20} height={4} rx={2} fill={m.hex} />
            <text x={CH.x + 68 + i * 340} y={CH.y + 56} fontFamily={mono} fontSize={15.5} fill="#c9d6e2">{m.name.toLowerCase()}</text>
          </g>
        ))}

        {!selBand && t >= 40 && (
          <text x={CH.x + 24} y={CH.y + CH.h - 16} fontFamily={mono} fontSize={14} fill="#5c6b7c"
            style={{ animation: 'zhPulse 1.8s ease-in-out infinite' }}>klikněte na žíhání v legendě pro popis pásu</text>
        )}
      </svg>

      {/* titul */}
      <div style={{ position: 'absolute', left: 84, top: 74, right: 200 }}>
        <div style={{ fontFamily: mono, fontSize: 17, letterSpacing: '0.28em', color: '#5fc0ef', textTransform: 'uppercase' }}>Žíhání oceli</div>
        <div style={{ fontFamily: sans, fontSize: 36, fontWeight: 600, color: '#eaf2fa', marginTop: 8, letterSpacing: '-0.01em' }}>5 metod žíhání — co se děje se strukturou</div>
      </div>

      {/* indikátor okna panelů */}
      <div style={{ position: 'absolute', right: 84, top: 92, display: 'flex', gap: 7 }}>
        {METHODS.map((m, i) => (
          <div key={'dot' + i} style={{ width: 8, height: 8, borderRadius: '50%',
            background: i >= windowStart && i <= windowStart + 2 ? m.hex : 'rgba(120,180,230,0.2)' }} />
        ))}
      </div>

      {/* posuv okna panelů — vedle oken se strukturou */}
      <button onClick={() => setWindowStart((w) => clamp(w - 1, 0, 2))} disabled={windowStart === 0} style={{
        position: 'absolute', left: 30, top: 450 - 19, width: 40, height: 40, borderRadius: 10,
        cursor: windowStart === 0 ? 'default' : 'pointer', border: '1.4px solid rgba(120,180,230,0.25)',
        background: 'rgba(120,180,230,0.08)', color: windowStart === 0 ? '#3d4855' : '#c9d6e2', fontSize: 19, lineHeight: 1, zIndex: 5 }}>‹</button>
      <button onClick={() => setWindowStart((w) => clamp(w + 1, 0, 2))} disabled={windowStart === 2} style={{
        position: 'absolute', right: 30, top: 450 - 19, width: 40, height: 40, borderRadius: 10,
        cursor: windowStart === 2 ? 'default' : 'pointer', border: '1.4px solid rgba(120,180,230,0.25)',
        background: 'rgba(120,180,230,0.08)', color: windowStart === 2 ? '#3d4855' : '#c9d6e2', fontSize: 19, lineHeight: 1, zIndex: 5 }}>›</button>

      {activeCaption ? (
        <div style={{ position: 'absolute', left: 84, top: 160, right: 84, fontFamily: sans, fontSize: 21, color: activeCaption.hex }}>{activeCaption.band}</div>
      ) : (
        captions.map((s, i) => (
          <div key={'cap' + i} style={{ position: 'absolute', left: 84, top: 160, right: 84, opacity: fade(t, s.a, s.b, s.c, s.d),
            fontFamily: sans, fontSize: 21, color: '#c9d6e2' }}>{s.txt}</div>
        ))
      )}

      <div style={{ position: 'absolute', left: 84, top: 1002, right: 84, display: 'flex', gap: 10 }}>
        {PHASES.map((p, i) => {
          const active = i === selectedPhase;
          return (
            <button key={i} onClick={() => playPhase(p, i)} style={{
              position: 'relative', flex: 1, padding: '10px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
              fontFamily: mono, fontSize: 15.5, fontWeight: 600, overflow: 'hidden',
              border: active ? '1.4px solid rgba(244,197,66,0.55)' : '1.4px solid rgba(120,180,230,0.18)',
              background: active ? 'rgba(244,197,66,0.1)' : 'rgba(120,180,230,0.04)',
              color: active ? '#eaf2fa' : '#93a5b6' }}>
              {p.lab}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ZihaniAnimation() {
  return (
    <Stage width={1920} height={1080} duration={52} background="#080b12" persistKey="zihani" loop={false} autoplay={false}>
      <Scene />
    </Stage>
  );
}

window.ZihaniAnimation = ZihaniAnimation;
