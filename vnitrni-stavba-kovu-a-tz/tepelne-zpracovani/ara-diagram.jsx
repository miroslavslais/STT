// ara-diagram.jsx — ARA (anizotermický rozpad austenitu / CCT) diagram: carbon-content + cooling-rate
// interactive continuous-cooling chart with resulting microstructure. Reusable React component.
const { useState, useRef, useEffect } = React;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sans = "'IBM Plex Sans', system-ui, sans-serif";
const mono = "'IBM Plex Mono', ui-monospace, monospace";

// ── deterministic RNG (same recipe as the IRA diagram) ─────────────────────
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260419);

// ── microstructure grain mosaic (result panel) ──────────────────────────────
const FX = 20, FY = 20, FW = 560, FH = 460;
const NX = 7, NY = 6;
const verts = [];
for (let j = 0; j <= NY; j++) {
  verts[j] = [];
  for (let i = 0; i <= NX; i++) {
    const edge = i === 0 || i === NX || j === 0 || j === NY;
    const jx = edge ? 0 : (rnd() - 0.5) * (FW / NX) * 0.62;
    const jy = edge ? 0 : (rnd() - 0.5) * (FH / NY) * 0.62;
    verts[j][i] = [FX + (FW * i) / NX + jx, FY + (FH * j) / NY + jy];
  }
}
const CELLS = [];
for (let j = 0; j < NY; j++) {
  for (let i = 0; i < NX; i++) {
    const pts = [verts[j][i], verts[j][i + 1], verts[j + 1][i + 1], verts[j + 1][i]];
    const cxp = (pts[0][0] + pts[1][0] + pts[2][0] + pts[3][0]) / 4;
    const cyp = (pts[0][1] + pts[1][1] + pts[2][1] + pts[3][1]) / 4;
    CELLS.push({ pts, cx: cxp, cy: cyp, rank: rnd(), rank2: rnd(), lamAng: rnd() * Math.PI, texAng: rnd() * Math.PI });
  }
}
const BEDGES = [];
for (let j = 1; j < NY; j++) for (let i = 0; i < NX; i++) BEDGES.push({ a: verts[j][i], b: verts[j][i + 1], rank: rnd() });
for (let i = 1; i < NX; i++) for (let j = 0; j < NY; j++) BEDGES.push({ a: verts[j][i], b: verts[j + 1][i], rank: rnd() });
const cellPath = (c) => 'M' + c.pts.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' L') + ' Z';

// nucleation seed (offset toward a random corner) + radius that covers the whole grain
function nucSeed(c) {
  const k = Math.floor(c.rank * 3.999);
  const corner = c.pts[k];
  const x = c.cx * 0.55 + corner[0] * 0.45;
  const y = c.cy * 0.55 + corner[1] * 0.45;
  let maxR = 0;
  for (const q of c.pts) { const d = Math.hypot(q[0] - x, q[1] - y); if (d > maxR) maxR = d; }
  return { x, y, maxR: maxR + 8 };
}

function texLines(c, kind, kp) {
  const lines = [];
  if (kind === 'lam') {
    const dx = Math.cos(c.lamAng), dy = Math.sin(c.lamAng), nx = -dy, ny = dx;
    for (let k = -70; k <= 70; k += 8) { const mx = c.cx + nx * k, my = c.cy + ny * k;
      lines.push(<line key={kp + k} x1={mx - dx * 60} y1={my - dy * 60} x2={mx + dx * 60} y2={my + dy * 60} stroke="rgba(150,196,236,0.55)" strokeWidth={1.6} />); }
  } else if (kind === 'acic') {
    const dx = Math.cos(c.texAng), dy = Math.sin(c.texAng), nx = -dy, ny = dx;
    for (let k = -70; k <= 70; k += 11) { const mx = c.cx + nx * k, my = c.cy + ny * k;
      lines.push(<line key={kp + k} x1={mx - dx * 62} y1={my - dy * 62} x2={mx + dx * 62} y2={my + dy * 62} stroke="rgba(150,222,206,0.6)" strokeWidth={2} strokeDasharray="6 9" />); }
  } else if (kind === 'needle') {
    [-1, 1].forEach((sgn, fi) => { const ang = c.texAng + sgn * 0.62, dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
      for (let k = -70; k <= 70; k += 12) { const mx = c.cx + nx * k, my = c.cy + ny * k;
        lines.push(<line key={kp + fi + '_' + k} x1={mx - dx * 62} y1={my - dy * 62} x2={mx + dx * 62} y2={my + dy * 62} stroke="rgba(198,202,242,0.75)" strokeWidth={1.6} strokeDasharray="4 10" />); } });
  }
  return lines;
}

const FERRITE = [120, 180, 232, 0.5];
const PEARLITE = [44, 72, 106, 0.9];
const BAINITE = [40, 104, 96, 0.9];
const MART = [122, 120, 185, 0.68];
const AUST = [239, 171, 84, 0.55];
const rgba = (c) => `rgba(${c[0]},${c[1]},${c[2]},${c[3]})`;

// ── Fe–C constants (same transformation-curve family as the IRA diagram) ───
const C_EUT = 0.76, C_FMAX = 0.022, C_CEM = 6.67, A1 = 727;
const T_TOP = 850, T_BOT = -60;
const BS_HANDOFF = 550;
const T_LOG_MIN = -1.7, T_LOG_MAX = 4.5;

function diagramConsts(C) {
  const hypo = C < C_EUT - 0.002, hyper = C > C_EUT + 0.002;
  const A3 = 910 - (910 - A1) * clamp(C / C_EUT, 0, 1);
  const Acm = A1 + (C - C_EUT) * 312;
  const UC = hyper ? Acm : hypo ? A3 : A1;
  const Ms = Math.round(539 - 423 * C);
  const Mf = Ms - 180;
  const maxFerrite = hypo ? clamp((C_EUT - C) / (C_EUT - C_FMAX), 0, 1) : 0;
  const maxCem = hyper ? clamp((C - C_EUT) / (C_CEM - C_EUT), 0, 1) : 0;
  const dEut = Math.abs(C - C_EUT);
  const Tnose_p = 550, tNose_p = Math.pow(10, 0.15 + 1.7 * dEut), hw_p = 120;
  const Tnose_b = 415 - 25 * ((C - 0.4) / 0.5), tNose_b = Math.pow(10, 0.55 + 1.25 * (C - 0.4)), hw_b = 145;
  return { hypo, hyper, A3, Acm, UC, Ms, Mf, maxFerrite, maxCem, Tnose_p, tNose_p, hw_p, Tnose_b, tNose_b, hw_b };
}

function Ps(T, k) { return k.tNose_p * Math.pow(10, Math.pow((T - k.Tnose_p) / k.hw_p, 2)); }
function Pf(T, k) { return Ps(T, k) * 3.1; }
function Bs(T, k) {
  const anchor = Ps(BS_HANDOFF, k);
  const boundaryVal = Math.pow((BS_HANDOFF - k.Tnose_b) / k.hw_b, 2);
  const thisVal = Math.pow((T - k.Tnose_b) / k.hw_b, 2);
  return anchor * Math.pow(10, thisVal - boundaryVal);
}
function Bf(T, k) { return Bs(T, k) * 3.1; }
function Fs(T, k) { return 0.35 + 1.1 * clamp((T - A1) / Math.max(1, k.A3 - A1), 0, 1); }
function Cs(T, k) { return 0.6 + 1.6 * clamp((T - A1) / Math.max(1, k.Acm - A1), 0, 1); }

function sample(fn, k, Tlo, Thi, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const T = Tlo + ((Thi - Tlo) * i) / n; pts.push([clamp(fn(T, k), Math.pow(10, T_LOG_MIN), Math.pow(10, T_LOG_MAX)), T]); }
  return pts;
}

// find the temperature (scanning Thi → Tlo) where lineTimeFn(T) first exceeds curveFn(T,k)
function scanCrossing(curveFn, k, Thi, Tlo, lineTimeFn, n) {
  n = n || 240;
  let prevT = Thi, prevDiff = lineTimeFn(Thi) - curveFn(Thi, k);
  if (prevDiff > 0) return Thi;
  for (let i = 1; i <= n; i++) {
    const T = Thi - ((Thi - Tlo) * i) / n;
    const diff = lineTimeFn(T) - curveFn(T, k);
    if (prevDiff <= 0 && diff > 0) {
      const frac = prevDiff === diff ? 0 : (-prevDiff) / (diff - prevDiff);
      return prevT + (T - prevT) * frac;
    }
    prevT = T; prevDiff = diff;
  }
  return null;
}

// monotonically non-decreasing transformation progress within a band: once a fraction has formed it never
// reverts, even where the C-curve's own shape (e.g. bainite's rising branch back toward Ms) would otherwise
// make a naive instantaneous ratio dip back down as cooling continues
function bandMonotoneProgress(curveStart, curveFinish, crossStartT, crossFinishT, bandBottomT, Tm, k, lineTimeFn, nSamples) {
  if (crossStartT == null || Tm > crossStartT) return 0;
  if (crossFinishT != null && Tm <= crossFinishT) return 1;
  const lo = Math.max(Tm, bandBottomT);
  let maxFrac = 0;
  const n = nSamples || 70;
  for (let i = 0; i <= n; i++) {
    const T = crossStartT - ((crossStartT - lo) * i) / n;
    const cs = curveStart(T, k), cf = curveFinish(T, k);
    const f = clamp((lineTimeFn(T) - cs) / Math.max(1e-9, cf - cs), 0, 1);
    if (f > maxFrac) maxFrac = f;
  }
  return maxFrac;
}

function AraDiagram() {
  const [C, setC] = useState(0.6);
  const [coolLogEnd, setCoolLogEnd] = useState(2); // log10(seconds) for the cooling line's bottom end
  const [TmFrac, setTmFrac] = useState(1); // 0 = top (austenite) .. 1 = fully cooled
  const [playing, setPlaying] = useState(false);
  const TmFracRef = useRef(1);
  TmFracRef.current = TmFrac;
  const plotRef = useRef(null);
  const [vw, setVw] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => { const onR = () => setVw(window.innerWidth); window.addEventListener('resize', onR); return () => window.removeEventListener('resize', onR); }, []);
  const mobile = vw < 860;

  const k = diagramConsts(C);
  const regime = k.hyper ? 'nadeutektoidní' : k.hypo ? 'podeutektoidní' : 'eutektoidní';

  // ── plot geometry (nonlinear axis: front segment stretched so the bainite nose lands on the first gridline).
  // Uses a C1-smooth 2-segment Hermite spline (not a hard piecewise-linear join) so curves — and the cooling
  // line, drawn straight in this same warped space — never show a kink at the pivot, for any carbon content. ──
  const PW = 760, PH = 560, PAD_L = 78, PAD_R = 26, PAD_T = 26, PAD_B = 46;
  const plotW = PW - PAD_L - PAD_R, plotH = PH - PAD_T - PAD_B;
  const bsNoseSample = sample(Bs, k, k.Ms, BS_HANDOFF, 60);
  const bsNoseTime = Math.min(...bsNoseSample.map((p) => p[0]));
  const pivotLogT = clamp(Math.log10(bsNoseTime), T_LOG_MIN + 0.7, T_LOG_MAX - 0.7);
  const X0 = PAD_L + 0.35 * plotW; // a dedicated, generous share of the width for the fast (pre-nose) region
  const slopeA = (X0 - PAD_L) / (pivotLogT - T_LOG_MIN);
  const slopeB = (PAD_L + plotW - X0) / (T_LOG_MAX - pivotLogT);
  const midSlope = (slopeA + slopeB) / 2;
  const hermite = (x, x0, y0, m0, x1, y1, m1) => {
    const h = x1 - x0, t = clamp((x - x0) / h, 0, 1);
    const t2 = t * t, t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
    return h00 * y0 + h10 * h * m0 + h01 * y1 + h11 * h * m1;
  };
  const xOf = (tRaw) => {
    const t = clamp(tRaw, Math.pow(10, T_LOG_MIN), Math.pow(10, T_LOG_MAX));
    const logt = Math.log10(t);
    if (logt <= pivotLogT) return hermite(logt, T_LOG_MIN, PAD_L, slopeA, pivotLogT, X0, midSlope);
    return hermite(logt, pivotLogT, X0, midSlope, T_LOG_MAX, PAD_L + plotW, slopeB);
  };
  const invXOf = (pixelX) => {
    let lo = T_LOG_MIN, hi = T_LOG_MAX;
    for (let i = 0; i < 26; i++) { const mid = (lo + hi) / 2; if (xOf(Math.pow(10, mid)) < pixelX) lo = mid; else hi = mid; }
    return Math.pow(10, (lo + hi) / 2);
  };
  const yOf = (T) => PAD_T + ((T_TOP - clamp(T, T_BOT, T_TOP)) / (T_TOP - T_BOT)) * plotH;
  const pathFrom = (pts) => 'M' + pts.map(([t, T]) => `${xOf(t).toFixed(1)},${yOf(T).toFixed(1)}`).join(' L');

  // ── the cooling curve: drawn as an actual straight line in this (warped) plot — always a single "\", never
  // a kinked pair of segments — with its "time at temperature T" derived by inverting the warp back from
  // that straight line's pixel position, so the crossing/marker physics stay consistent with what's drawn ──
  const tA = Math.pow(10, T_LOG_MIN);
  const t0 = tA;
  const tEnd = Math.pow(10, coolLogEnd);
  const X_top = xOf(t0), X_bot = xOf(tEnd);
  const pixelXAt = (T) => X_top + ((T_TOP - clamp(T, T_BOT, T_TOP)) / (T_TOP - T_BOT)) * (X_bot - X_top);
  const lineTime = (T) => invXOf(pixelXAt(T));

  // ── crossing analysis: does the cooling curve dip into each C-curve's belly, and where? ──
  const psStartT = scanCrossing(Ps, k, A1, BS_HANDOFF, lineTime);
  const psFinishT = psStartT != null ? scanCrossing(Pf, k, A1, BS_HANDOFF, lineTime) : null;
  const bsStartT = scanCrossing(Bs, k, BS_HANDOFF, k.Ms, lineTime);
  const bsFinishT = bsStartT != null ? scanCrossing(Bf, k, BS_HANDOFF, k.Ms, lineTime) : null;
  const proFerriteOccurs = k.hypo && lineTime(A1) > Fs(A1, k);
  const proCemOccurs = k.hyper && lineTime(A1) > Cs(A1, k);

  const Tm = T_TOP - TmFrac * (T_TOP - T_BOT);

  // ── structure at any given temperature along the (fixed) cooling line — sequential bands, remaining-austenite bookkeeping ──
  function structureAt(TmAt) {
    let R = 1, frFerrite = 0, frCem = 0, frPearlite = 0, frBainite = 0, frMartensite = 0;
    if (TmAt <= A1) {
      if (proFerriteOccurs) { frFerrite = k.maxFerrite; R -= frFerrite; }
      else if (proCemOccurs) { frCem = k.maxCem; R -= frCem; }
    }
    const pProg = bandMonotoneProgress(Ps, Pf, psStartT, psFinishT, BS_HANDOFF, TmAt, k, lineTime);
    frPearlite = R * pProg; R -= frPearlite;
    const bProg = TmAt <= BS_HANDOFF ? bandMonotoneProgress(Bs, Bf, bsStartT, bsFinishT, k.Ms, TmAt, k, lineTime) : 0;
    frBainite = R * bProg; R -= frBainite;
    let mProg = 0;
    if (TmAt <= k.Ms) mProg = clamp(1 - Math.exp(-0.011 * (k.Ms - TmAt)), 0, 1);
    frMartensite = R * mProg;
    const frAustenite = R * (1 - mProg);
    return { ferrite: frFerrite, cementite: frCem, pearlite: frPearlite, bainite: frBainite, martensite: frMartensite, austenite: frAustenite };
  }
  const fr = structureAt(Tm);
  const { ferrite: frFerrite, cementite: frCem, pearlite: frPearlite, bainite: frBainite, martensite: frMartensite, austenite: frAustenite } = fr;
  const finalFr = structureAt(T_BOT);

  // ── label for what's currently forming / has formed ──
  let labelLines, note, resultColor;
  if (Tm > A1 || (frFerrite + frCem + frPearlite + frBainite + frMartensite) < 0.01) {
    labelLines = [['Austenit', '#efab54']]; note = 'Ještě neochlazeno pod A₁ — beze změny.'; resultColor = '#efab54';
  } else {
    const parts = [];
    if (frFerrite > 0.01) parts.push(['Ferit', frFerrite, '#8fb9e6']);
    if (frCem > 0.01) parts.push(['Sek. cementit', frCem, '#d67bff']);
    if (frPearlite > 0.005) parts.push(['Perlit', frPearlite, '#8fb9e6']);
    if (frAustenite > 0.02) parts.push(['Austenit', frAustenite, '#efab54']);
    if (frBainite > 0.005) parts.push(['Bainit', frBainite, '#7fe0cc']);
    if (frMartensite > 0.005) parts.push(['Martenzit', frMartensite, '#c6caf2']);
    const sorted = [...parts].sort((a, b) => b[1] - a[1]);
    labelLines = parts.length ? parts.map(([n, f, col]) => [`${n} (${Math.round(f * 100)} %)`, col]) : [['Austenit', '#efab54']];
    resultColor = sorted.length ? sorted[0][2] : '#efab54';
    note = `Ochlazeno na ${Math.round(Tm)} °C, t ≈ ${lineTime(Tm) < 1 ? lineTime(Tm).toFixed(2) : Math.round(lineTime(Tm))} s.`;
  }

  // ── microstructure fill: cell PHASE ASSIGNMENT uses the final (fully-cooled) composition so cells never
  // reassign mid-animation; per-cell nucleation-and-growth progress tracks each phase's own current share of
  // its final bucket, staggered by rank2 so grains don't all flip at once — mirrors austenitizace-interaktivni.jsx.
  const order = ['ferrite', 'pearlite', 'bainite', 'martensite', 'austenite'].filter((key) => finalFr[key] > 0.001);
  let acc = 0;
  const bounds = order.map((key) => { const lo = acc; acc += finalFr[key]; return [key, lo, acc]; });
  const finalCellPhase = CELLS.map((c) => (bounds.find(([, lo, hi]) => c.rank >= lo && c.rank < hi) || bounds[bounds.length - 1] || ['austenite', 0, 1])[0]);
  const phaseColor = { ferrite: FERRITE, pearlite: PEARLITE, bainite: BAINITE, martensite: MART, austenite: AUST };
  const phaseTex = { pearlite: 'lam', bainite: 'acic', martensite: 'needle' };
  const netCoverage = clamp((fr.cementite || 0) * 1.8, 0, 1);
  const cellProgress = CELLS.map((c, idx) => {
    const ph = finalCellPhase[idx];
    if (ph === 'austenite' || ph === 'ferrite') return ph === 'ferrite' ? 1 : 0;
    const finalShare = finalFr[ph] || 0;
    const globalProg = finalShare > 0.001 ? clamp(fr[ph] / finalShare, 0, 1) : (ph === 'martensite' ? 1 : 0);
    if (ph === 'martensite') return globalProg; // athermal — no staggered nucleation needed
    const spread = 0.4;
    const startOffset = c.rank2 * spread;
    return clamp((globalProg - startOffset) / Math.max(0.05, 1 - startOffset), 0, 1);
  });

  const legendItems = [
    ['austenit', 'rgba(239,171,84,0.7)'],
    ['perlit', 'repeating-linear-gradient(45deg,#2c486a,#2c486a 2px,#96c4ec 2px,#96c4ec 4px)'],
    ['bainit', 'repeating-linear-gradient(45deg,#28685f,#28685f 2px,#96dece 2px,#96dece 4px)'],
    ['martenzit', 'repeating-linear-gradient(45deg,#7a78b8,#7a78b8 2px,#c6caf2 2px,#c6caf2 4px)'],
    ['ferit', 'rgba(120,180,232,0.6)'],
    ['sek. cementit', '#d67bff'],
  ];

  // ── curve sample arrays (rendered through the same warped xOf) ──
  const psPts = sample(Ps, k, BS_HANDOFF, A1, 40);
  const pfPts = sample(Pf, k, BS_HANDOFF, A1, 40);
  const bsPts = sample(Bs, k, k.Ms, BS_HANDOFF, 40);
  const bfPts = sample(Bf, k, k.Ms, BS_HANDOFF, 40);
  const fsPts = k.hypo ? sample(Fs, k, A1, k.A3, 24) : null;
  const csPts = k.hyper ? sample(Cs, k, A1, k.Acm, 24) : null;

  const gridDecades = []; for (let e = Math.ceil(T_LOG_MIN); e <= Math.floor(T_LOG_MAX); e++) gridDecades.push(e);

  const setFromClientY = (clientY) => {
    const el = plotRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const scale = PH / r.height;
    const yLocal = (clientY - r.top) * scale;
    setTmFrac(clamp((yLocal - PAD_T) / plotH, 0, 1));
  };
  const onMarkerDown = (e) => { e.stopPropagation(); setPlaying(false); e.currentTarget.setPointerCapture(e.pointerId); setFromClientY(e.clientY); };
  const onMarkerMove = (e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) setFromClientY(e.clientY); };

  // auto-play: sweep the marker from 0 to 1. The active transformation band (from whichever curve the cooling
  // line first crosses, down to the lowest finish point it reaches — including martensite down to Mf) runs at
  // a fixed ~7s pace matching austenitizace-interaktivni.jsx; the austenite-only stretches before/after it sweep fast.
  const fracOfT = (T) => clamp((T_TOP - T) / (T_TOP - T_BOT), 0, 1);
  const zoneStartTs = []; const zoneFinishTs = [];
  if (psStartT != null) zoneStartTs.push(psStartT);
  if (bsStartT != null) zoneStartTs.push(bsStartT);
  if (finalFr.martensite > 0.001) zoneStartTs.push(k.Ms);
  if (psFinishT != null) zoneFinishTs.push(psFinishT);
  if (bsFinishT != null) zoneFinishTs.push(bsFinishT);
  if (finalFr.martensite > 0.001) zoneFinishTs.push(k.Mf);
  const zoneStart = zoneStartTs.length ? fracOfT(Math.max(...zoneStartTs)) : 0;
  const zoneEnd = zoneFinishTs.length ? Math.max(fracOfT(Math.min(...zoneFinishTs)), zoneStart) : 1;
  const TRANSFORM_MS = 7000;
  const FAST_MS = 1400;
  useEffect(() => {
    if (!playing) return;
    let raf, last = performance.now();
    const zoneW = Math.max(zoneEnd - zoneStart, 0.001);
    const outW = Math.max(1 - zoneW, 0.001);
    const rateIn = zoneW / TRANSFORM_MS;
    const rateOut = outW / FAST_MS;
    const step = (now) => {
      const dt = now - last; last = now;
      const cur = TmFracRef.current;
      const rate = (cur >= zoneStart && cur <= zoneEnd) ? rateIn : rateOut;
      let nv = cur + rate * dt;
      let done = false;
      if (nv >= 1) { nv = 1; done = true; }
      TmFracRef.current = nv; setTmFrac(nv);
      if (done) { setPlaying(false); return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, zoneStart, zoneEnd]);
  const togglePlay = () => {
    if (playing) { setPlaying(false); return; }
    if (TmFracRef.current >= 0.98) { TmFracRef.current = 0; setTmFrac(0); }
    setPlaying(true);
  };

  const coolRateLabel = coolLogEnd < -0.5 ? 'velmi rychlé (kalení)' : coolLogEnd < 1.5 ? 'rychlé' : coolLogEnd < 3 ? 'střední' : 'pomalé (žíhání)';

  return (
    <div style={{ width: '100%', height: mobile ? 'auto' : '100vh', minHeight: '100vh', background: '#080b12', color: '#eaf2fa', boxSizing: 'border-box',
      padding: mobile ? '40px 14px 20px' : '58px 52px 20px', display: 'flex', flexDirection: 'column', fontFamily: sans, position: 'relative', overflow: mobile ? 'visible' : 'hidden' }}>

      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(120% 90% at 42% 44%, rgba(30,52,80,0.45) 0%, rgba(9,13,20,0) 62%)' }} />

      {/* header */}
      <div style={{ position: 'relative', flex: '0 0 auto' }}>
        <div style={{ fontFamily: mono, fontSize: mobile ? 13 : 16, letterSpacing: '0.24em', color: '#5fc0ef', textTransform: 'uppercase' }}>Tepelné zpracování oceli · ARA diagram</div>
        <div style={{ fontSize: mobile ? 24 : 32, fontWeight: 600, marginTop: 6, letterSpacing: '-0.01em' }}>Anizotermický rozpad austenitu</div>
      </div>

      {/* legend */}
      <div style={{ position: 'relative', flex: '0 0 auto', marginTop: 8, display: 'flex', gap: 24, flexWrap: 'wrap', fontFamily: mono, fontSize: 14.5, color: '#aebfcf' }}>
        {legendItems.map(([lab, bg]) => (
          <span key={lab} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ width: 14, height: 14, borderRadius: 3, background: bg, border: lab === 'sek. cementit' ? '1px solid rgba(213,130,255,0.95)' : 'none' }} />
            {lab}
          </span>
        ))}
      </div>

      {/* main */}
      <div style={{ position: 'relative', flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: mobile ? 'column' : 'row', gap: mobile ? 20 : 32, marginTop: 10 }}>

        {/* ARA plot */}
        <div style={{ flex: mobile ? '0 0 auto' : '1 1 auto', minWidth: 0, minHeight: mobile ? 320 : 0, display: 'flex', borderRadius: 16, border: '1px solid rgba(120,180,230,0.14)', background: 'rgba(120,180,230,0.03)', padding: 10, boxSizing: 'border-box' }}>
          <svg ref={plotRef} viewBox={`0 0 ${PW} ${PH}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: mobile ? 'auto' : '100%', display: 'block' }}>
            {gridDecades.map((e) => (
              <g key={'gx' + e}>
                <line x1={xOf(Math.pow(10, e))} y1={PAD_T} x2={xOf(Math.pow(10, e))} y2={PAD_T + plotH} stroke="rgba(150,180,210,0.1)" strokeWidth={1} />
                <text x={xOf(Math.pow(10, e))} y={PAD_T + plotH + 20} fontFamily={mono} fontSize={12} fill="#7d8ea0" textAnchor="middle">{e < 0 ? `${Math.pow(10, e)}` : `10${e === 0 ? '⁰' : e === 1 ? '¹' : e === 2 ? '²' : e === 3 ? '³' : e === 4 ? '⁴' : e === 5 ? '⁵' : '⁶'}`}</text>
              </g>
            ))}
            <text x={PAD_L + plotW / 2} y={PH - 4} fontFamily={mono} fontSize={12.5} fill="#aebfcf" textAnchor="middle">čas [s], log. měřítko</text>
            {[0, 200, 400, 600, 800].map((T) => (
              <g key={'gy' + T}>
                <line x1={PAD_L} y1={yOf(T)} x2={PAD_L + plotW} y2={yOf(T)} stroke="rgba(150,180,210,0.08)" strokeWidth={1} />
                <text x={PAD_L - 10} y={yOf(T) + 4} fontFamily={mono} fontSize={12} fill="#7d8ea0" textAnchor="end">{T}</text>
              </g>
            ))}
            <text x={16} y={PAD_T + plotH / 2} fontFamily={mono} fontSize={12.5} fill="#aebfcf" textAnchor="middle" transform={`rotate(-90 16 ${PAD_T + plotH / 2})`}>teplota [°C]</text>

            <line x1={PAD_L} y1={yOf(A1)} x2={PAD_L + plotW} y2={yOf(A1)} stroke="rgba(190,210,230,0.55)" strokeDasharray="5 5" strokeWidth={1.3} />
            <text x={PAD_L + plotW + 4} y={yOf(A1) + 4} fontFamily={mono} fontSize={12} fill="#cdd8e2">A₁ 727</text>
            {k.hypo && (<React.Fragment>
              <line x1={PAD_L} y1={yOf(k.A3)} x2={PAD_L + plotW} y2={yOf(k.A3)} stroke="rgba(143,185,230,0.5)" strokeDasharray="5 5" strokeWidth={1.3} />
              <text x={PAD_L + plotW + 4} y={yOf(k.A3) + 4} fontFamily={mono} fontSize={12} fill="#8fb9e6">A₃ {Math.round(k.A3)}</text>
            </React.Fragment>)}
            {k.hyper && (<React.Fragment>
              <line x1={PAD_L} y1={yOf(k.Acm)} x2={PAD_L + plotW} y2={yOf(k.Acm)} stroke="rgba(214,123,255,0.5)" strokeDasharray="5 5" strokeWidth={1.3} />
              <text x={PAD_L + plotW + 4} y={yOf(k.Acm) + 4} fontFamily={mono} fontSize={12} fill="#d67bff">A_cm {Math.round(k.Acm)}</text>
            </React.Fragment>)}
            <line x1={PAD_L} y1={yOf(k.Ms)} x2={PAD_L + plotW} y2={yOf(k.Ms)} stroke="rgba(198,202,242,0.75)" strokeWidth={1.6} />
            <text x={PAD_L + plotW + 4} y={yOf(k.Ms) + 4} fontFamily={mono} fontSize={12} fill="#c6caf2">Ms {k.Ms}</text>
            <line x1={PAD_L} y1={yOf(k.Mf)} x2={PAD_L + plotW} y2={yOf(k.Mf)} stroke="rgba(198,202,242,0.45)" strokeDasharray="2 4" strokeWidth={1.3} />
            <text x={PAD_L + plotW + 4} y={yOf(k.Mf) + 4} fontFamily={mono} fontSize={12} fill="#a9adde">Mf {k.Mf}</text>

            {fsPts && <path d={pathFrom(fsPts)} fill="none" stroke="#8fb9e6" strokeWidth={2} />}
            {csPts && <path d={pathFrom(csPts)} fill="none" stroke="#d67bff" strokeWidth={2} />}
            <path d={pathFrom(psPts)} fill="none" stroke="#96c4ec" strokeWidth={2.4} />
            <path d={pathFrom(pfPts)} fill="none" stroke="#5f88ac" strokeWidth={2} strokeDasharray="7 6" />
            <path d={pathFrom(bsPts)} fill="none" stroke="#7fe0cc" strokeWidth={2.4} />
            <path d={pathFrom(bfPts)} fill="none" stroke="#3f8f80" strokeWidth={2} strokeDasharray="7 6" />

            {/* curve labels */}
            <text x={xOf(Ps(A1 - (A1 - BS_HANDOFF) * 0.42, k))} y={yOf(A1 - (A1 - BS_HANDOFF) * 0.42) - 9} fontFamily={mono} fontSize={13} fill="#96c4ec" textAnchor="middle">Ps</text>
            <text x={xOf(Pf(BS_HANDOFF + (A1 - BS_HANDOFF) * 0.16, k)) + 8} y={yOf(BS_HANDOFF + (A1 - BS_HANDOFF) * 0.16) + 4} fontFamily={mono} fontSize={13} fill="#5f88ac">Pf</text>
            <text x={xOf(Bs(k.Tnose_b + (BS_HANDOFF - k.Tnose_b) * 0.55, k)) - 10} y={yOf(k.Tnose_b + (BS_HANDOFF - k.Tnose_b) * 0.55) - 6} fontFamily={mono} fontSize={13} fill="#7fe0cc" textAnchor="end">Bs</text>
            <text x={xOf(Bf(k.Tnose_b + (BS_HANDOFF - k.Tnose_b) * 0.3, k)) + 8} y={yOf(k.Tnose_b + (BS_HANDOFF - k.Tnose_b) * 0.3) + 4} fontFamily={mono} fontSize={13} fill="#3f8f80">Bf</text>
            {fsPts && <text x={xOf(Fs(k.A3 - (k.A3 - A1) * 0.35, k)) + 6} y={yOf(k.A3 - (k.A3 - A1) * 0.35) - 8} fontFamily={mono} fontSize={13} fill="#8fb9e6">Fs</text>}
            {csPts && <text x={xOf(Cs(k.Acm - (k.Acm - A1) * 0.35, k)) + 6} y={yOf(k.Acm - (k.Acm - A1) * 0.35) - 8} fontFamily={mono} fontSize={13} fill="#d67bff">Cs</text>}

            {/* the continuous cooling curve — drawn as an actual straight line — always a single "\", ending well past Mf */}
            <line x1={X_top} y1={yOf(T_TOP)} x2={X_bot} y2={yOf(T_BOT)} stroke="#e5703b" strokeWidth={2.8} strokeLinecap="round" />
            <circle cx={X_top} cy={yOf(T_TOP)} r={4} fill="#eaf2fa" />

            {/* yellow draggable point: observe the microstructure at any point along the cooling path */}
            <g onPointerDown={onMarkerDown} onPointerMove={onMarkerMove} style={{ cursor: 'ns-resize', touchAction: 'none' }}>
              <circle cx={pixelXAt(Tm)} cy={yOf(Tm)} r={14} fill="transparent" />
              <circle cx={pixelXAt(Tm)} cy={yOf(Tm)} r={7.5} fill="#f4c542" stroke="#0b0e15" strokeWidth={2} style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'pulseDot 1.7s ease-in-out infinite' }} />
            </g>
          </svg>
        </div>

        {/* result panel */}
        <div style={{ flex: mobile ? '0 0 auto' : '0 0 300px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ borderRadius: 16, border: '1px solid rgba(120,180,230,0.14)', background: 'rgba(120,180,230,0.03)', aspectRatio: '600/500', position: 'relative', overflow: 'hidden' }}>
            <svg viewBox="0 0 600 500" style={{ width: '100%', height: '100%', display: 'block' }}>
              {/* base: austenite everywhere, then each transforming cell grows its product from a nucleation seed */}
              {CELLS.map((c, idx) => <path key={'f' + idx} d={cellPath(c)} fill={rgba(AUST)} />)}
              <defs>
                {CELLS.map((c, idx) => <clipPath key={'cp' + idx} id={`rclip${idx}`}><path d={cellPath(c)} /></clipPath>)}
                {CELLS.map((c, idx) => {
                  const s = nucSeed(c);
                  const R = s.maxR * Math.sqrt(clamp(cellProgress[idx], 0, 1));
                  return <clipPath key={'g' + idx} id={`rgrow${idx}`}><circle cx={s.x} cy={s.y} r={R} /></clipPath>;
                })}
              </defs>
              {CELLS.map((c, idx) => {
                const ph = finalCellPhase[idx];
                if (ph === 'austenite' || cellProgress[idx] <= 0.004) return null;
                const tex = phaseTex[ph];
                return (
                  <g key={'n' + idx} clipPath={`url(#rclip${idx})`}>
                    <g clipPath={`url(#rgrow${idx})`}>
                      <path d={cellPath(c)} fill={rgba(phaseColor[ph])} />
                      {tex && texLines(c, tex, 'rl' + idx)}
                    </g>
                  </g>
                );
              })}
              {netCoverage > 0.01 && BEDGES.map((e, idx) => e.rank < netCoverage && (
                <g key={'c' + idx}>
                  <line x1={e.a[0]} y1={e.a[1]} x2={e.b[0]} y2={e.b[1]} stroke="rgba(201,91,255,0.35)" strokeWidth={4} strokeLinecap="round" />
                  <line x1={e.a[0]} y1={e.a[1]} x2={e.b[0]} y2={e.b[1]} stroke="#d67bff" strokeWidth={2} strokeLinecap="round" />
                </g>
              ))}
              {CELLS.map((c, idx) => <path key={'b' + idx} d={cellPath(c)} fill="none" stroke="rgba(160,190,220,0.35)" strokeWidth={1.4} strokeLinejoin="round" />)}
            </svg>
          </div>

          <div style={{ padding: '13px 16px', borderRadius: 12, background: 'rgba(120,180,230,0.05)', border: '1px solid rgba(120,180,230,0.16)', minHeight: 128, boxSizing: 'border-box' }}>
            <div style={{ fontFamily: mono, fontSize: 12, letterSpacing: '0.18em', color: '#7fb4d6', textTransform: 'uppercase' }}>Struktura v bodě</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4, lineHeight: 1.3, minHeight: 47 }}>
              {labelLines.map(([line, col], i) => <div key={i} style={{ color: col }}>{line}</div>)}
            </div>
            <div style={{ fontSize: 13.5, color: '#aebfcf', marginTop: 4, lineHeight: 1.4, minHeight: 19 }}>{note}</div>
          </div>

          <div style={{ fontFamily: mono, fontSize: 12.5, color: '#8296a8', lineHeight: 1.7 }}>
            <div>{regime} ocel</div>
            <div>{C.toFixed(2)} % C</div>
            <div>Ms {k.Ms} °C</div>
            <div>{coolRateLabel}</div>
          </div>
        </div>
      </div>

      {/* bottom sliders */}
      <div style={{ position: 'relative', flex: '0 0 auto', marginTop: 10, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', alignItems: mobile ? 'stretch' : 'center', gap: mobile ? 6 : 18 }}>
          <div style={{ flex: mobile ? '0 0 auto' : '0 0 190px', fontFamily: mono, fontSize: 14, color: '#aebfcf' }}>Obsah uhlíku
            <span style={{ color: '#eaf2fa', fontSize: 17, marginLeft: 8 }}>{C.toFixed(2)} %</span>
          </div>
          <div style={{ flex: '1 1 auto', position: 'relative', height: 16, display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, height: 6, borderRadius: 3, background: 'rgba(120,180,230,0.18)' }} />
            <div style={{ position: 'absolute', left: 0, height: 6, borderRadius: 3, width: `${((C - 0.4) / (0.9 - 0.4)) * 100}%`, background: '#5fc0ef' }} />
            <div style={{ position: 'absolute', left: `${((0.76 - 0.4) / (0.9 - 0.4)) * 100}%`, top: '50%',
              width: 3, height: 14, borderRadius: 2, background: '#5fc0ef', boxShadow: '0 0 0 3px rgba(95,192,239,0.25)',
              transform: 'translate(-50%, -50%)', pointerEvents: 'none', animation: 'pulseHandle 1.7s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', left: `${((C - 0.4) / (0.9 - 0.4)) * 100}%`, top: '50%', width: 16, height: 16, borderRadius: '50%',
              background: '#5fc0ef', border: '2px solid #0b0e15', transform: 'translate(-50%, -50%)', pointerEvents: 'none',
              animation: 'pulseThumb 1.7s ease-in-out infinite' }} />
            <input type="range" min={0.4} max={0.9} value={C} step={0.01}
                   onChange={(e) => { const v = Number(e.target.value); setC(Math.abs(v - 0.76) < 0.018 ? 0.76 : v); }}
                   style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', margin: 0, opacity: 0, cursor: 'pointer' }} />
          </div>
          <div style={{ flex: mobile ? '0 0 auto' : '0 0 178px', textAlign: mobile ? 'left' : 'right', fontFamily: mono, fontSize: 13.5, color: k.hyper ? '#d67bff' : k.hypo ? '#7fb4d6' : '#cdd8e2' }}>{regime}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', alignItems: mobile ? 'stretch' : 'center', gap: mobile ? 6 : 18 }}>
          <div style={{ flex: mobile ? '0 0 auto' : '0 0 190px', fontFamily: mono, fontSize: 14, color: '#aebfcf' }}>Rychlost ochlazování</div>
          <div style={{ flex: '1 1 auto', position: 'relative', height: 16, display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, height: 6, borderRadius: 3, background: 'rgba(120,180,230,0.18)' }} />
            <div style={{ position: 'absolute', left: 0, height: 6, borderRadius: 3, width: `${(((T_LOG_MIN + T_LOG_MAX - coolLogEnd) - T_LOG_MIN) / (T_LOG_MAX - T_LOG_MIN)) * 100}%`, background: '#e5703b' }} />
            <div style={{ position: 'absolute', left: `${(((T_LOG_MIN + T_LOG_MAX - coolLogEnd) - T_LOG_MIN) / (T_LOG_MAX - T_LOG_MIN)) * 100}%`, top: '50%', width: 16, height: 16, borderRadius: '50%',
              background: '#e5703b', border: '2px solid #0b0e15', transform: 'translate(-50%, -50%)', pointerEvents: 'none',
              animation: 'pulseThumb 1.7s ease-in-out infinite' }} />
            <input type="range" min={T_LOG_MIN} max={T_LOG_MAX} value={T_LOG_MIN + T_LOG_MAX - coolLogEnd} step={0.02}
                   onChange={(e) => setCoolLogEnd(T_LOG_MIN + T_LOG_MAX - Number(e.target.value))}
                   style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', margin: 0, opacity: 0, cursor: 'pointer' }} />
          </div>
          <div style={{ flex: mobile ? '0 0 auto' : '0 0 178px', textAlign: mobile ? 'left' : 'right', fontFamily: mono, fontSize: 13.5, fontWeight: 600, color: '#e5703b' }}>{coolRateLabel}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', alignItems: mobile ? 'stretch' : 'center', gap: mobile ? 6 : 18 }}>
          <div style={{ flex: '1 1 auto' }} />
          <button onClick={togglePlay} style={{
            flex: mobile ? '0 0 auto' : '0 0 178px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
            padding: mobile ? '13px 14px' : '11px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: mono, fontSize: 14, fontWeight: 600,
            border: 'none', color: '#0b0e15', letterSpacing: '0.03em', animation: 'pulseBtn 1.8s ease-in-out infinite',
            background: playing ? '#e5703b' : '#f4c542' }}>
            {playing
              ? (<React.Fragment><svg width="12" height="13" viewBox="0 0 12 13"><rect x="1" y="1" width="3.4" height="11" fill="#0b0e15" /><rect x="7.6" y="1" width="3.4" height="11" fill="#0b0e15" /></svg>Pauza</React.Fragment>)
              : (<React.Fragment><svg width="12" height="13" viewBox="0 0 12 13"><path d="M1 1 L11 6.5 L1 12 Z" fill="#0b0e15" /></svg>Přehrát</React.Fragment>)}
          </button>
        </div>
      </div>
    </div>
  );
}

window.AraDiagram = AraDiagram;
