// cementace.jsx — Cementace: řez cementovanou vrstvou od výchozí struktury po výslednou tvrdost.
// Fáze: ferit+perlit → austenitizace → sycení povrchu uhlíkem → kalení (přímé / s přichlazením)
// → popouštění → průběh tvrdosti. Interaktivní: karty fází, přehrát vše, tažení odečtové čáry.
const { Stage, useTime, useTimeline, Easing, interpolate, clamp } = window;

const sans = "'IBM Plex Sans', system-ui, sans-serif";
const mono = "'IBM Plex Mono', ui-monospace, monospace";

// ── deterministic RNG ───────────────────────────────────────────────────────
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260713);

// ── řez vrstvou: mozaika zrn (povrch nahoře, jádro dole) ────────────────────
const FX = 78, FY = 66, FW = 588, FH = 536;   // uvnitř viewBoxu 690×660
const NX = 6, NY = 8;
const DEPTH_MAX = 2.5;                          // mm
const verts = [];
for (let j = 0; j <= NY; j++) {
  verts[j] = [];
  for (let i = 0; i <= NX; i++) {
    const edge = i === 0 || i === NX || j === 0 || j === NY;
    const jx = edge ? 0 : (rnd() - 0.5) * (FW / NX) * 0.6;
    const jy = edge ? 0 : (rnd() - 0.5) * (FH / NY) * 0.6;
    verts[j][i] = [FX + (FW * i) / NX + jx, FY + (FH * j) / NY + jy];
  }
}
const CELLS = [];
for (let j = 0; j < NY; j++) {
  for (let i = 0; i < NX; i++) {
    const pts = [verts[j][i], verts[j][i + 1], verts[j + 1][i + 1], verts[j + 1][i]];
    const cx = (pts[0][0] + pts[1][0] + pts[2][0] + pts[3][0]) / 4;
    const cy = (pts[0][1] + pts[1][1] + pts[2][1] + pts[3][1]) / 4;
    CELLS.push({
      pts, cx, cy,
      isPearlite: rnd() < 0.3,
      Tx: 745 + rnd() * 140,          // teplota přeměny na austenit
      lamAng: rnd() * Math.PI,
      texAng: rnd() * Math.PI,
      rank: rnd(),
      depth: ((cy - FY) / FH) * DEPTH_MAX,
    });
  }
}
const cellPath = (c) => 'M' + c.pts.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' L') + ' Z';

const randInCell = (c) => {
  let w = [rnd(), rnd(), rnd(), rnd()];
  const s = w[0] + w[1] + w[2] + w[3];
  w = w.map((x) => x / s);
  return [
    w[0] * c.pts[0][0] + w[1] * c.pts[1][0] + w[2] * c.pts[2][0] + w[3] * c.pts[3][0],
    w[0] * c.pts[0][1] + w[1] * c.pts[1][1] + w[2] * c.pts[2][1] + w[3] * c.pts[3][1],
  ];
};

// karbidické tečky pro popouštění
const CELL_DOTS = CELLS.map((c) => {
  const dots = [];
  for (let d = 0; d < 8; d++) {
    const [x, y] = randInCell(c);
    dots.push({ x, y, r: 1.8 + rnd() * 1.9, order: rnd() });
  }
  return dots;
});

// ostrůvky zbytkového austenitu (přímé kalení, povrchová zrna)
const CELL_RA = CELLS.map((c) => {
  const blobs = [];
  for (let d = 0; d < 3; d++) {
    const [x, y] = randInCell(c);
    blobs.push({ x, y, r: 7 + rnd() * 9 });
  }
  return blobs;
});

// částice uhlíku nad povrchem (cementace)
const PARTS = [];
for (let i = 0; i < 36; i++) PARTS.push({ x: FX + rnd() * (FW - 140), delay: rnd() * 2.2, r: 2 + rnd() * 1.4 });

// ── barvy ───────────────────────────────────────────────────────────────────
const FERRITE = [120, 180, 232, 0.16];
const PEARLITE = [44, 72, 106, 0.60];
const AUST = [239, 171, 84, 0.26];
const RICH = [222, 106, 52, 0.58];     // austenit nasycený uhlíkem
const MART = [122, 120, 185, 0.68];    // martenzit
const TMART = [108, 114, 166, 0.60];   // popuštěný martenzit
const rgba = (c) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${c[3].toFixed(3)})`;
const lerpC = (a, b, t) => [0, 1, 2, 3].map((i) => a[i] + (b[i] - a[i]) * t);

function fade(t, a, b, c, d) {
  if (t <= a || t >= d) return 0;
  if (t < b) return clamp((t - a) / (b - a), 0, 1);
  if (t > c) return clamp(1 - (t - c) / (d - c), 0, 1);
  return 1;
}
const czNum = (v, dec) => v.toFixed(dec).replace('.', ',');

// ── model difuze uhlíku a tvrdosti ──────────────────────────────────────────
const FEC = window.FEC || {   // vnitrni-stavba-kovu-a-tz/fe-c-konstanty.js (záložní kopie, kdyby se soubor nenačetl)
  C_P: 0.018, C_S: 0.765, C_E: 2.14, C_C: 4.3, C_CEM: 6.68, EUT_TOL: 0.02,
  T_A: 1538, T_G: 911, T_EUT: 1147, T_A1: 727, T_D: 1380,
  CEM: { HV_SURFACE: 690, HRC_SURFACE: 60, HV_CORE: 165, C_CORE: 0.17 },
  cz: function (v, dec) { return (dec == null ? String(v) : v.toFixed(dec)).replace('.', ','); },
};
const C0 = FEC.CEM.C_CORE, CS = 0.85;
const T_CEM0 = 11, T_CEM1 = 23;                          // časové okno cementace
function concAt(depth, t) {
  const u = clamp((t - T_CEM0) / (T_CEM1 - T_CEM0), 0, 1);
  if (u <= 0) return C0;
  const s = clamp(u * 4, 0, 1);                          // povrch se nasytí brzy
  const d = 0.18 + 1.02 * u;                             // difuzní hloubka roste s časem
  return C0 + (CS - C0) * s * Math.exp(-Math.pow(depth / d, 1.7));
}
const concFinal = (depth) => concAt(depth, T_CEM1);
const martFrac = (depth) => clamp((concFinal(depth) - 0.28) / 0.22, 0, 1);
const raFrac = (depth) => clamp((concFinal(depth) - 0.68) / 0.15, 0, 1);   // sklon ke zbytk. austenitu
function hvAt(depth, r, direct) {                        // r = pokrok popouštění, direct = přímé kalení
  const m = martFrac(depth);
  const raPen = direct ? 55 * raFrac(depth) : 0;         // zbytkový austenit snižuje tvrdost povrchu
  // amplituda je odvozená tak, aby povrch po popuštění (m = 1, r = 1) vyšel na FEC.CEM.HV_SURFACE
  const amp = (FEC.CEM.HV_SURFACE - FEC.CEM.HV_CORE) / 0.88;
  return FEC.CEM.HV_CORE + (amp * Math.pow(m, 0.9) - raPen * m) * (1 - 0.12 * r);
}

// jehlicová textura martenzitu (coarse = hrubší jehlice při přímém kalení)
function needleLines(c, kp, opacity, coarse) {
  const lines = [];
  const step = coarse ? 14 : 9, len = coarse ? 56 : 38, sw = coarse ? 1.8 : 1.15;
  [-1, 1].forEach((sgn, fi) => {
    const ang = c.texAng + sgn * 0.62, dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
    for (let k = -50; k <= 50; k += step) {
      const mx = c.cx + nx * k, my = c.cy + ny * k;
      lines.push(<line key={kp + fi + '_' + k} x1={mx - dx * len} y1={my - dy * len} x2={mx + dx * len} y2={my + dy * len}
        stroke={`rgba(198,202,242,${(0.8 * opacity).toFixed(3)})`} strokeWidth={sw} strokeDasharray="4 9" />);
    }
  });
  return lines;
}

// ── layout ──────────────────────────────────────────────────────────────────
const SEC = { x: 84, y: 208, w: 690, h: 660 };           // řez vrstvou
const CH1 = { x: 828, y: 208, w: 1008, h: 312, padL: 100, padR: 30, padT: 42, padB: 46 };  // % C
const CH2 = { x: 828, y: 552, w: 1008, h: 316, padL: 100, padR: 30, padT: 42, padB: 46 };  // HV
const BAR = { x: 84, y: 918, w: 1752, h: 66 };

const chX = (ch, depth) => ch.x + ch.padL + (clamp(depth, 0, DEPTH_MAX) / DEPTH_MAX) * (ch.w - ch.padL - ch.padR);
const c1Y = (v) => CH1.y + CH1.padT + (1 - clamp(v, 0, 1) / 1) * (CH1.h - CH1.padT - CH1.padB);
const c2Y = (hv) => CH2.y + CH2.padT + (1 - clamp(hv, 0, 900) / 900) * (CH2.h - CH2.padT - CH2.padB);
const yOfDepth = (d) => FY + (clamp(d, 0, DEPTH_MAX) / DEPTH_MAX) * FH;

const DUR = 46;
const PHASES = [
  { t0: 0,    t1: 5,    n: '01', lab: 'Výchozí struktura' },
  { t0: 5,    t1: 11,   n: '02', lab: 'Austenitizace' },
  { t0: 11,   t1: 23,   n: '03', lab: 'Cementace ~930 °C' },
  { t0: 23,   t1: 28.5, n: '04', lab: 'Kalení' },
  { t0: 28.5, t1: 34,   n: '05', lab: 'Popouštění ~180 °C' },
  { t0: 34,   t1: 46,   n: '06', lab: 'Výsledná tvrdost' },
];

function Scene() {
  const t = useTime();
  const { setTime, setPlaying, playing } = useTimeline();

  const [direct, setDirect] = React.useState(true);        // true = přímé kalení, false = s přichlazením
  const [manualDepth, setManualDepth] = React.useState(null);
  const segEndRef = React.useRef(null);

  // zastavení na konci vybrané fáze
  React.useEffect(() => {
    if (segEndRef.current != null && t >= segEndRef.current - 0.02) {
      segEndRef.current = null;
      setPlaying(false);
    }
  }, [t, setPlaying]);

  const playPhase = (p) => {
    segEndRef.current = p.t1;
    setManualDepth(null);
    setTime(p.t0);
    setPlaying(true);
  };
  const playAll = () => {
    segEndRef.current = null;
    setManualDepth(null);
    setTime(0);
    setPlaying(true);
  };

  // teplota — průběh kalení podle varianty
  const T = direct
    ? interpolate(
        [0, 5, 7, 11, 23, 24, 26.5, 28.8, 30, 33.5, 35, 46],
        [20, 20, 780, 930, 930, 200, 60, 60, 180, 180, 25, 25], Easing.easeInOutCubic)(t)
    : interpolate(
        [0, 5, 7, 11, 23, 24.4, 25.2, 26.2, 27.5, 28.8, 30, 33.5, 35, 46],
        [20, 20, 780, 930, 930, 845, 845, 180, 60, 60, 180, 180, 25, 25], Easing.easeInOutCubic)(t);

  const cemAct = fade(t, 11.2, 12, 21.8, 23.2);
  const quenchFlash = direct ? fade(t, 23, 23.4, 24.8, 25.8) : fade(t, 25.1, 25.5, 26.6, 27.6);
  const r = clamp((t - 29.2) / 3.6, 0, 1);                 // popouštění

  // ── zrna ──
  const heatMix = clamp((T - 400) / 500, 0, 1);
  const boundary = rgba(lerpC([150, 196, 236, 0.45], [240, 190, 130, 0.5], heatMix));
  const qStart = direct ? 23.2 : 25.3;                     // začátek přeměny při kalení

  const grains = CELLS.map((c, idx) => {
    const base0 = c.isPearlite ? PEARLITE : FERRITE;
    const pA = clamp((T - c.Tx) / 20, 0, 1);
    const conc = concAt(c.depth, t);
    const concN = clamp((conc - C0) / (CS - C0), 0, 1);
    const fillAust = lerpC(AUST, RICH, concN);
    const m = martFrac(c.depth);
    const qg = clamp((t - (qStart + c.rank * 1.4)) / 1.1, 0, 1);
    const fillFinal = lerpC(base0, lerpC(MART, TMART, r), m);
    const heated = lerpC(base0, fillAust, pA);
    const fill = rgba(lerpC(heated, fillFinal, qg));

    const lamOp = c.isPearlite ? Math.max(1 - pA, qg * (1 - m)) : 0;
    const needleOp = m * qg * (1 - 0.38 * r);
    const raOp = direct ? raFrac(c.depth) * qg * (1 - 0.25 * r) : 0;

    let lamella = null;
    if (lamOp > 0.01) {
      const lines = [];
      const dx = Math.cos(c.lamAng), dy = Math.sin(c.lamAng), nx = -dy, ny = dx;
      for (let k = -70; k <= 70; k += 8) {
        const mx = c.cx + nx * k, my = c.cy + ny * k;
        lines.push(<line key={k} x1={mx - dx * 62} y1={my - dy * 62} x2={mx + dx * 62} y2={my + dy * 62}
          stroke="rgba(150,196,236,0.5)" strokeWidth={1.8} />);
      }
      lamella = <g clipPath={`url(#cclip${idx})`} opacity={lamOp}>{lines}</g>;
    }

    return (
      <g key={'g' + idx}>
        <path d={cellPath(c)} fill={fill} />
        {lamella}
        {raOp > 0.02 && (
          <g clipPath={`url(#cclip${idx})`} opacity={raOp}>
            {CELL_RA[idx].map((b, bi) => (
              <circle key={'ra' + bi} cx={b.x} cy={b.y} r={b.r} fill="rgba(239,171,84,0.5)" stroke="rgba(240,190,130,0.5)" strokeWidth={1} />
            ))}
          </g>
        )}
        {needleOp > 0.01 && <g clipPath={`url(#cclip${idx})`}>{needleLines(c, 'n' + idx, needleOp, direct)}</g>}
        {m > 0.35 && r > 0 && (
          <g clipPath={`url(#cclip${idx})`}>
            {CELL_DOTS[idx].map((d, di) => d.order < r && (
              <circle key={'d' + di} cx={d.x} cy={d.y} r={d.r} fill="#24425f" stroke="rgba(150,196,236,0.45)" strokeWidth={0.7} />
            ))}
          </g>
        )}
      </g>
    );
  });

  // ── % C křivka ──
  const cPts = [];
  for (let i = 0; i <= 90; i++) {
    const d = (DEPTH_MAX * i) / 90;
    cPts.push(`${chX(CH1, d).toFixed(1)},${c1Y(concAt(d, t)).toFixed(1)}`);
  }
  const cPath = 'M' + cPts.join(' L');

  // ── tvrdost ──
  const hvReveal = clamp((t - (qStart + 0.4)) / 3.6, 0, 1);
  const hvPath = (rr) => {
    const p = [];
    for (let i = 0; i <= 90; i++) {
      const d = (DEPTH_MAX * i) / 90;
      p.push(`${chX(CH2, d).toFixed(1)},${c2Y(hvAt(d, rr, direct)).toFixed(1)}`);
    }
    return 'M' + p.join(' L');
  };
  let chd = 0;
  for (let i = 0; i <= 400; i++) { const d = (DEPTH_MAX * i) / 400; if (hvAt(d, r, direct) >= 550) chd = d; else break; }
  const chdOp = fade(t, 28, 28.8, 46, 47) * (chd > 0.05 ? 1 : 0);

  // ── odečtová čára (fáze 06): automatický přejezd, nebo ruční tažení ──
  const scanOp = fade(t, 34.3, 35, 46, 47);
  const autoDepth = interpolate([35.2, 41, 43.5, 46], [0.02, DEPTH_MAX, chd > 0.05 ? chd : 1, chd > 0.05 ? chd : 1], Easing.easeInOutCubic)(clamp(t, 35.2, 46));
  const scanDepth = manualDepth != null ? manualDepth : autoDepth;
  const scanConc = concAt(scanDepth, t);
  const scanHV = hvAt(scanDepth, r, direct);
  const yScan = yOfDepth(scanDepth);
  const dragActive = t >= 34;

  const depthFromEvent = (e) => {
    const rBox = e.currentTarget.getBoundingClientRect();
    return clamp(((e.clientY - rBox.top) / rBox.height) * DEPTH_MAX, 0, DEPTH_MAX);
  };
  const onScanDown = (e) => {
    if (!dragActive) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setPlaying(false);
    setManualDepth(depthFromEvent(e));
  };
  const onScanMove = (e) => {
    if (!dragActive || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    setManualDepth(depthFromEvent(e));
  };

  const surfGlow = cemAct;
  const capQuench = direct
    ? 'Přímé kalení z cementační teploty · hrubší martenzit, na povrchu zbytkový austenit'
    : 'Kalení s přichlazením na ~845 °C · jemnější martenzit, menší pnutí a deformace';
  const captions = [
    { txt: `Nízkouhlíková ocel (~${FEC.cz(C0, 2)} % C) · ferit + perlit v celém průřezu`, a: 0.4, b: 1.1, c: 4.6, d: 5.2 },
    { txt: 'Ohřev nad A₃ · ferit i perlit se mění na austenit', a: 5.1, b: 5.7, c: 10.5, d: 11.2 },
    { txt: 'Povrch se sytí uhlíkem z nauhličující atmosféry · koncentrace klesá směrem k jádru', a: 11.1, b: 11.7, c: 22.4, d: 23.2 },
    { txt: capQuench, a: 23.1, b: 23.7, c: 27.9, d: 28.7 },
    { txt: 'Nízkoteplotní popouštění · uvolnění pnutí, jemné karbidy, tvrdost klesá jen mírně', a: 28.6, b: 29.2, c: 33.4, d: 34.2 },
    { txt: 'Tvrdý povrch ~690 HV (≈60 HRC) a měkké jádro · táhněte čáru na struktuře a odečtěte % C a tvrdost', a: 34.1, b: 34.8, c: 46, d: 47 },
  ];

  const legendItems = [
    ['ferit', 'rgba(120,180,232,0.45)', '1px solid rgba(150,196,236,0.7)'],
    ['perlit', 'repeating-linear-gradient(45deg,#2c486a,#2c486a 2px,#96c4ec 2px,#96c4ec 4px)', 'none'],
    ['austenit', 'rgba(239,171,84,0.7)', 'none'],
    ['austenit sycený C / zbytkový austenit', 'rgba(222,106,52,0.85)', 'none'],
    ['martenzit', 'repeating-linear-gradient(45deg,#7a78b8,#7a78b8 2px,#c6caf2 2px,#c6caf2 4px)', 'none'],
    ['popuštěný martenzit', 'radial-gradient(circle at 35% 40%, #24425f 0 2px, rgba(138,136,192,0.7) 2.5px)', 'none'],
  ];

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <style>{`
        @keyframes pulseBtn { 0%, 100% { box-shadow: 0 0 0 0 rgba(244,197,66,0.4); } 50% { box-shadow: 0 0 0 7px rgba(244,197,66,0); } }
        @keyframes pulseBtnBlue { 0%, 100% { box-shadow: 0 0 0 0 rgba(95,192,239,0.4); } 50% { box-shadow: 0 0 0 7px rgba(95,192,239,0); } }
        @keyframes pulseCard { 0%, 100% { filter: drop-shadow(0 0 0px rgba(244,197,66,0)); } 50% { filter: drop-shadow(0 0 7px rgba(244,197,66,0.7)); } }
        @keyframes pulseDot { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.55; } }
        @keyframes pulseBtnText { 0%, 100% { opacity: 0.85; } 50% { opacity: 0.35; } }
      `}</style>
      <div style={{ position: 'absolute', inset: 0,
        background: 'radial-gradient(120% 90% at 40% 44%, rgba(30,52,80,0.45) 0%, rgba(9,13,20,0) 62%)' }} />

      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          {CELLS.map((c, idx) => <clipPath key={'cp' + idx} id={`cclip${idx}`}><path d={cellPath(c)} /></clipPath>)}
          <clipPath id="hvClip">
            <rect x={CH2.x + CH2.padL} y={CH2.y} width={(CH2.w - CH2.padL - CH2.padR) * hvReveal} height={CH2.h} />
          </clipPath>
        </defs>

        {/* ══ panel: řez vrstvou ══ */}
        <rect x={SEC.x} y={SEC.y} width={SEC.w} height={SEC.h} rx={16} fill="rgba(120,180,230,0.03)" stroke="rgba(120,180,230,0.14)" />
        <g transform={`translate(${SEC.x},${SEC.y})`}>
          {/* nauhličující atmosféra */}
          <g opacity={cemAct}>
            <rect x={FX} y={FY - 40} width={FW - 130} height={32} rx={6} fill="rgba(239,171,84,0.08)" stroke="rgba(240,190,130,0.3)" strokeDasharray="5 6" />
            <text x={FX + 10} y={FY - 47} fontFamily={mono} fontSize={15} fill="#f0b46e">nauhličující atmosféra (CO / CH₄)</text>
            {PARTS.map((p, i) => {
              const local = ((t + p.delay) % 2.2) / 2.2;
              const py = (FY - 34) + local * 54;
              const op = Math.sin(Math.PI * local) * cemAct;
              return <circle key={'pt' + i} cx={p.x} cy={py} r={p.r} fill="#f0b46e" opacity={op * 0.9} />;
            })}
          </g>
          <text x={FX} y={FY - 10} fontFamily={mono} fontSize={15} letterSpacing="0.2em" fill="#aebfcf">POVRCH</text>
          <text x={FX + FW} y={44} fontFamily={mono} fontSize={27} fontWeight={500} textAnchor="end"
                fill={T > 500 ? '#f0b46e' : '#8fb9e6'}>{Math.round(T)} °C</text>
          <text x={FX} y={FY + FH + 26} fontFamily={mono} fontSize={15} letterSpacing="0.2em" fill="#7d8ea0">JÁDRO</text>

          {/* hloubková osa */}
          {[0, 0.5, 1, 1.5, 2, 2.5].map((d) => (
            <g key={'dep' + d}>
              <line x1={FX - 8} y1={yOfDepth(d)} x2={FX} y2={yOfDepth(d)} stroke="rgba(150,180,210,0.4)" strokeWidth={1.2} />
              <text x={FX - 14} y={yOfDepth(d) + 4} fontFamily={mono} fontSize={15} fill="#7d8ea0" textAnchor="end">{czNum(d, 1)}</text>
            </g>
          ))}
          <text x={22} y={FY + FH / 2} fontFamily={mono} fontSize={15.5} fill="#aebfcf" textAnchor="middle"
                transform={`rotate(-90 22 ${FY + FH / 2})`}>hloubka pod povrchem [mm]</text>

          {/* zrna */}
          {grains}
          {CELLS.map((c, idx) => <path key={'b' + idx} d={cellPath(c)} fill="none" stroke={boundary} strokeWidth={1.5} strokeLinejoin="round" />)}

          {/* povrchová linie + záblesk kalení */}
          <line x1={FX} y1={FY} x2={FX + FW} y2={FY} stroke={`rgba(240,180,110,${(0.25 + 0.6 * surfGlow).toFixed(2)})`} strokeWidth={2.2} />
          <rect x={FX} y={FY} width={FW} height={FH} fill="#5fc0ef" opacity={quenchFlash * 0.13} />

          {/* odečtová čára hloubky (tažení) */}
          <g opacity={scanOp}>
            <line x1={FX} y1={yScan} x2={FX + FW} y2={yScan} stroke="#58f58b" strokeWidth={1.8} strokeDasharray="7 6" />
            <circle cx={FX + FW - 12} cy={yScan} r={4.5} fill="#58f58b" style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'pulseDot 1.7s ease-in-out infinite' }} />
            <text x={FX + FW - 8} y={yScan - 10} fontFamily={mono} fontSize={17} fontWeight={600} fill="#58f58b" textAnchor="end">
              {czNum(scanDepth, 2)} mm · {czNum(scanConc, 2)} % C · {Math.round(scanHV)} HV
            </text>
            {manualDepth == null && (
              <text x={FX + 8} y={FY + FH - 12} fontFamily={mono} fontSize={14} fill="#58f58b" opacity={0.85} style={{ animation: 'pulseBtnText 1.7s ease-in-out infinite' }}>⇕ táhněte čáru pro odečet hodnot</text>
            )}
          </g>
          {/* neviditelná plocha pro tažení */}
          {dragActive && (
            <rect x={FX} y={FY} width={FW} height={FH} fill="transparent"
                  style={{ cursor: 'ns-resize', touchAction: 'none' }}
                  onPointerDown={onScanDown} onPointerMove={onScanMove} />
          )}
        </g>

        {/* ══ graf 1: obsah uhlíku × hloubka ══ */}
        <rect x={CH1.x} y={CH1.y} width={CH1.w} height={CH1.h} rx={16} fill="rgba(120,180,230,0.03)" stroke="rgba(120,180,230,0.14)" />
        <text x={CH1.x + 24} y={CH1.y + 28} fontFamily={mono} fontSize={18} letterSpacing="0.18em" fill="#7fb4d6">OBSAH UHLÍKU × HLOUBKA</text>
        {[0, 0.5, 1, 1.5, 2, 2.5].map((d) => (
          <g key={'c1x' + d}>
            <line x1={chX(CH1, d)} y1={CH1.y + CH1.padT} x2={chX(CH1, d)} y2={CH1.y + CH1.h - CH1.padB} stroke="rgba(150,180,210,0.08)" />
            <text x={chX(CH1, d)} y={CH1.y + CH1.h - CH1.padB + 20} fontFamily={mono} fontSize={15} fill="#7d8ea0" textAnchor="middle">{czNum(d, 1)}</text>
          </g>
        ))}
        {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((v) => (
          <g key={'c1y' + v}>
            <line x1={CH1.x + CH1.padL} y1={c1Y(v)} x2={CH1.x + CH1.w - CH1.padR} y2={c1Y(v)} stroke="rgba(150,180,210,0.08)" />
            <text x={CH1.x + CH1.padL - 10} y={c1Y(v) + 4} fontFamily={mono} fontSize={15} fill="#7d8ea0" textAnchor="end">{v.toFixed(1).replace('.', ',')}</text>
          </g>
        ))}
        <text x={CH1.x + 32} y={CH1.y + (CH1.padT + CH1.h - CH1.padB) / 2} fontFamily={mono} fontSize={16} fill="#aebfcf" textAnchor="middle"
              transform={`rotate(-90 ${CH1.x + 32} ${CH1.y + (CH1.padT + CH1.h - CH1.padB) / 2})`}>% C</text>
        <text x={CH1.x + CH1.w / 2} y={CH1.y + CH1.h - 8} fontFamily={mono} fontSize={16} fill="#aebfcf" textAnchor="middle">hloubka pod povrchem [mm]</text>
        <line x1={chX(CH1, 0)} y1={c1Y(FEC.C_S)} x2={chX(CH1, DEPTH_MAX)} y2={c1Y(FEC.C_S)} stroke="rgba(240,190,130,0.4)" strokeDasharray="6 6" />
        <text x={CH1.x + CH1.w - CH1.padR - 8} y={c1Y(FEC.C_S) - 8} fontFamily={mono} fontSize={15.5} fill="#f0b46e" textAnchor="end">eutektoidní {FEC.cz(FEC.C_S)} % C</text>
        <text x={CH1.x + CH1.w - CH1.padR - 8} y={c1Y(C0) + 20} fontFamily={mono} fontSize={15.5} fill="#8fb9e6" textAnchor="end">jádro {FEC.cz(C0, 2)} % C</text>
        <path d={cPath} fill="none" stroke="#efab54" strokeWidth={2.8} strokeLinecap="round" />

        {/* ══ graf 2: tvrdost × hloubka ══ */}
        <rect x={CH2.x} y={CH2.y} width={CH2.w} height={CH2.h} rx={16} fill="rgba(120,180,230,0.03)" stroke="rgba(120,180,230,0.14)" />
        <text x={CH2.x + 24} y={CH2.y + 28} fontFamily={mono} fontSize={18} letterSpacing="0.18em" fill="#7fb4d6">TVRDOST × HLOUBKA</text>
        {[0, 0.5, 1, 1.5, 2, 2.5].map((d) => (
          <g key={'c2x' + d}>
            <line x1={chX(CH2, d)} y1={CH2.y + CH2.padT} x2={chX(CH2, d)} y2={CH2.y + CH2.h - CH2.padB} stroke="rgba(150,180,210,0.08)" />
            <text x={chX(CH2, d)} y={CH2.y + CH2.h - CH2.padB + 20} fontFamily={mono} fontSize={15} fill="#7d8ea0" textAnchor="middle">{czNum(d, 1)}</text>
          </g>
        ))}
        {[0, 300, 550, 750, 900].map((v) => (
          <g key={'c2y' + v}>
            <line x1={CH2.x + CH2.padL} y1={c2Y(v)} x2={CH2.x + CH2.w - CH2.padR} y2={c2Y(v)} stroke="rgba(150,180,210,0.08)" />
            <text x={CH2.x + CH2.padL - 10} y={c2Y(v) + 4} fontFamily={mono} fontSize={15} fill="#7d8ea0" textAnchor="end">{v}</text>
          </g>
        ))}
        <text x={CH2.x + 32} y={CH2.y + (CH2.padT + CH2.h - CH2.padB) / 2} fontFamily={mono} fontSize={16} fill="#aebfcf" textAnchor="middle"
              transform={`rotate(-90 ${CH2.x + 32} ${CH2.y + (CH2.padT + CH2.h - CH2.padB) / 2})`}>tvrdost [HV]</text>
        <text x={CH2.x + CH2.w / 2} y={CH2.y + CH2.h - 8} fontFamily={mono} fontSize={16} fill="#aebfcf" textAnchor="middle">hloubka pod povrchem [mm]</text>
        {hvReveal < 0.02 && (
          <text x={CH2.x + CH2.padL + (CH2.w - CH2.padL - CH2.padR) / 2} y={(c2Y(0) + c2Y(900)) / 2}
                fontFamily={mono} fontSize={17} fill="#5c6b7c" textAnchor="middle">průběh tvrdosti se vykreslí po kalení</text>
        )}
        <g clipPath="url(#hvClip)">
          {r > 0.02 && <path d={hvPath(0)} fill="none" stroke="rgba(198,202,242,0.35)" strokeWidth={2} strokeDasharray="6 7" />}
          <path d={hvPath(r)} fill="none" stroke="#e5703b" strokeWidth={2.8} strokeLinecap="round" />
        </g>
        {r > 0.4 && <text x={chX(CH2, 0.12)} y={c2Y(hvAt(0.12, 0, direct)) - 12} fontFamily={mono} fontSize={15.5} fill="#c6caf2" opacity={clamp((r - 0.4) / 0.4, 0, 1)}>po kalení</text>}
        <g opacity={chdOp}>
          <line x1={chX(CH2, 0)} y1={c2Y(550)} x2={chX(CH2, DEPTH_MAX)} y2={c2Y(550)} stroke="rgba(244,197,66,0.4)" strokeDasharray="6 6" />
          <line x1={chX(CH2, chd)} y1={c2Y(550)} x2={chX(CH2, chd)} y2={c2Y(0)} stroke="rgba(244,197,66,0.4)" strokeDasharray="4 5" />
          <circle cx={chX(CH2, chd)} cy={c2Y(550)} r={5} fill="#f4c542" />
          <text x={chX(CH2, chd) + 12} y={c2Y(230)} fontFamily={mono} fontSize={17} fontWeight={600} fill="#f4c542">
            CHD ≈ {czNum(chd, 2)} mm (550 HV)
          </text>
        </g>
        {/* odečtové značky v grafech */}
        <g opacity={scanOp}>
          <line x1={chX(CH1, scanDepth)} y1={CH1.y + CH1.padT} x2={chX(CH1, scanDepth)} y2={CH1.y + CH1.h - CH1.padB} stroke="rgba(88,245,139,0.55)" strokeWidth={1.4} strokeDasharray="5 5" />
          <circle cx={chX(CH1, scanDepth)} cy={c1Y(scanConc)} r={5} fill="#58f58b" stroke="#0b0e15" strokeWidth={1.5} />
          <text x={chX(CH1, scanDepth) + 10} y={c1Y(scanConc) - 10} fontFamily={mono} fontSize={16} fontWeight={600} fill="#58f58b">{czNum(scanConc, 2)} % C</text>
          <line x1={chX(CH2, scanDepth)} y1={CH2.y + CH2.padT} x2={chX(CH2, scanDepth)} y2={CH2.y + CH2.h - CH2.padB} stroke="rgba(88,245,139,0.55)" strokeWidth={1.4} strokeDasharray="5 5" />
          <circle cx={chX(CH2, scanDepth)} cy={c2Y(scanHV)} r={5} fill="#58f58b" stroke="#0b0e15" strokeWidth={1.5} />
          <text x={chX(CH2, scanDepth) + 10} y={c2Y(scanHV) - 10} fontFamily={mono} fontSize={16} fontWeight={600} fill="#58f58b">{Math.round(scanHV)} HV</text>
        </g>

        {/* ══ fázové karty (klik = přehrát fázi) ══ */}
        {PHASES.map((p, i) => {
          const segW = BAR.w / PHASES.length;
          const x0 = BAR.x + i * segW;
          const active = t >= p.t0 && (t < p.t1 || i === PHASES.length - 1);
          const prog = clamp((t - p.t0) / (p.t1 - p.t0), 0, 1);
          return (
            <g key={'ph' + i} onClick={() => playPhase(p)} style={{ cursor: 'pointer', animation: 'pulseCard 1.8s ease-in-out infinite' }}>
              <rect x={x0 + 4} y={BAR.y} width={segW - 8} height={BAR.h} rx={11}
                    fill={active ? 'rgba(244,197,66,0.1)' : 'rgba(120,180,230,0.04)'}
                    stroke={active ? 'rgba(244,197,66,0.55)' : 'rgba(120,180,230,0.18)'} strokeWidth={1.4} />
              {prog > 0 && <rect x={x0 + 4} y={BAR.y + BAR.h - 5} width={(segW - 8) * prog} height={3} rx={1.5} fill="rgba(244,197,66,0.7)" />}
              <text x={x0 + 20} y={BAR.y + 28} fontFamily={mono} fontSize={17} fontWeight={600}
                    fill={active ? '#f4c542' : '#7d8ea0'}>{p.n}</text>
              <text x={x0 + 20} y={BAR.y + 51} fontFamily={mono} fontSize={16}
                    fill={active ? '#eaf2fa' : '#93a5b6'}>{p.lab}</text>
              <path d={`M${x0 + segW - 30},${BAR.y + 26} l11,7 l-11,7 Z`} fill={active ? 'rgba(244,197,66,0.8)' : 'rgba(150,180,210,0.35)'} />
            </g>
          );
        })}
      </svg>

      {/* titul */}
      <div style={{ position: 'absolute', left: 84, top: 74 }}>
        <div style={{ fontFamily: mono, fontSize: 17, letterSpacing: '0.28em', color: '#5fc0ef', textTransform: 'uppercase' }}>Chemicko-tepelné zpracování oceli</div>
        <div style={{ fontFamily: sans, fontSize: 36, fontWeight: 600, color: '#eaf2fa', marginTop: 8, letterSpacing: '-0.01em' }}>Cementace · řez vrstvou</div>
      </div>

      {/* popisky fází */}
      {captions.map((s, i) => (
        <div key={'cap' + i} style={{ position: 'absolute', left: 84, top: 164, width: 1400, opacity: fade(t, s.a, s.b, s.c, s.d),
          fontFamily: sans, fontSize: 20, color: '#c9d6e2' }}>{s.txt}</div>
      ))}

      {/* legenda struktur — nad kartami fází */}
      <div style={{ position: 'absolute', left: 84, top: 884, display: 'flex', gap: 22, alignItems: 'center',
        fontFamily: mono, fontSize: 14.5, color: '#aebfcf' }}>
        {legendItems.map(([lab, bg, border]) => (
          <span key={lab} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 13, height: 13, borderRadius: 3, background: bg, border }} />{lab}
          </span>
        ))}
      </div>

      {/* spodní ovládání: přehrát vše + varianta kalení */}
      <div style={{ position: 'absolute', left: 84, top: 1002, right: 84, display: 'flex', alignItems: 'center', gap: 28 }}>
        <button onClick={playAll} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '11px 22px', borderRadius: 10, cursor: 'pointer',
          fontFamily: mono, fontSize: 15.5, fontWeight: 600, border: 'none', color: '#0b0e15', letterSpacing: '0.03em',
          animation: 'pulseBtn 1.8s ease-in-out infinite',
          background: '#f4c542' }}>
          <svg width="12" height="13" viewBox="0 0 12 13"><path d="M1 1 L11 6.5 L1 12 Z" fill="#0b0e15" /></svg>
          Přehrát vše od začátku
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: mono, fontSize: 14, color: '#7d8ea0', letterSpacing: '0.1em', textTransform: 'uppercase' }}>varianta kalení:</span>
          <div style={{ display: 'flex', borderRadius: 10, border: '1px solid rgba(120,180,230,0.25)', overflow: 'hidden' }}>
            <button onClick={() => setDirect(true)} style={{
              padding: '10px 18px', border: 'none', cursor: 'pointer', fontFamily: mono, fontSize: 14.5, fontWeight: 600,
              animation: 'pulseBtnBlue 1.8s ease-in-out infinite',
              background: direct ? 'rgba(95,192,239,0.22)' : 'transparent', color: direct ? '#eaf2fa' : '#7d8ea0' }}>přímé kalení</button>
            <button onClick={() => setDirect(false)} style={{
              padding: '10px 18px', border: 'none', borderLeft: '1px solid rgba(120,180,230,0.25)', cursor: 'pointer', fontFamily: mono, fontSize: 14.5, fontWeight: 600,
              animation: 'pulseBtnBlue 1.8s ease-in-out infinite',
              background: !direct ? 'rgba(95,192,239,0.22)' : 'transparent', color: !direct ? '#eaf2fa' : '#7d8ea0' }}>s přichlazením (~845 °C)</button>
          </div>
          <span style={{ fontFamily: mono, fontSize: 16, color: '#c9d6e2' }}>
            {direct ? 'hrubší martenzit · zbytkový austenit na povrchu · nižší tvrdost povrchu' : 'jemnější martenzit · menší deformace a pnutí'}
          </span>
        </div>
      </div>
    </div>
  );
}

function CementaceAnimation() {
  return (
    <Stage width={1920} height={1080} duration={46} background="#080b12" persistKey="cementace" loop={false} autoplay={false}>
      <Scene />
    </Stage>
  );
}

window.CementaceAnimation = CementaceAnimation;
