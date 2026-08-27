// ira-diagram.jsx — IRA (izotermický rozpad austenitu) diagram: carbon-content + quenching-temperature
// interactive TTT-style chart with resulting quenched microstructure. Reusable React component.
const { useState, useRef, useEffect } = React;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sans = "'IBM Plex Sans', system-ui, sans-serif";
const mono = "'IBM Plex Mono', ui-monospace, monospace";

// ── deterministic RNG (same recipe as austenitizace-interaktivni.jsx) ───────
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(19740312);

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

// ── Fe–C constants ──────────────────────────────────────────────────────────
const FEC = window.FEC;   // vnitrni-stavba-kovu-a-tz/fe-c-konstanty.js
const C_EUT = FEC.C_S, C_FMAX = FEC.C_P, C_CEM = FEC.C_CEM, A1 = FEC.T_A1;
const T_TOP = 850, T_BOT = -60;
const BS_HANDOFF = 550;           // schematic pearlite/bainite domain boundary
const T_LOG_MIN = -1, T_LOG_MAX = 3; // 0.1 s .. 1e3 s

function diagramConsts(C) {
  const hypo = C < C_EUT - 0.002, hyper = C > C_EUT + 0.002;
  const A3 = FEC.T_G - (FEC.T_G - A1) * clamp(C / C_EUT, 0, 1);
  const Acm = A1 + (C - C_EUT) * 312;
  const UC = hyper ? Acm : hypo ? A3 : A1;
  const Ms = Math.round(539 - 423 * C);
  // Mf odpovídá Koistinen–Marburgerově rovnici (α = 0,011): při ΔT = 320 °C dosahuje ~97 % martenzitu
  const Mf = Ms - 320;
  const maxFerrite = hypo ? clamp((C_EUT - C) / (C_EUT - C_FMAX), 0, 1) : 0;
  const maxCem = hyper ? clamp((C - C_EUT) / (C_CEM - C_EUT), 0, 1) : 0;
  // pearlite nose: fastest at eutectoid composition, slower away from it
  const dEut = Math.abs(C - C_EUT);
  const Tnose_p = 550, tNose_p = Math.pow(10, 0.15 + 1.7 * dEut), hw_p = 120;
  // bainite nose: slows slightly with more carbon
  const Tnose_b = 415 - 25 * ((C - 0.4) / 0.5), tNose_b = Math.pow(10, 0.55 + 1.25 * (C - 0.4)), hw_b = 145;
  return { hypo, hyper, A3, Acm, UC, Ms, Mf, maxFerrite, maxCem, Tnose_p, tNose_p, hw_p, Tnose_b, tNose_b, hw_b };
}

function Ps(T, k) { return k.tNose_p * Math.pow(10, Math.pow((T - k.Tnose_p) / k.hw_p, 2)); }
function Pf(T, k) { return Ps(T, k) * 3.1; }
// bainite start is anchored to meet the pearlite-start curve exactly at BS_HANDOFF (same for the finish pair)
function Bs(T, k) {
  const anchor = Ps(BS_HANDOFF, k);
  const boundaryVal = Math.pow((BS_HANDOFF - k.Tnose_b) / k.hw_b, 2);
  const thisVal = Math.pow((T - k.Tnose_b) / k.hw_b, 2);
  return anchor * Math.pow(10, thisVal - boundaryVal);
}
function Bf(T, k) { return Bs(T, k) * 3.1; }
function Fs(T, k) { return 0.35 + 1.1 * clamp((T - A1) / Math.max(1, k.A3 - A1), 0, 1); }   // proeutectoid ferrite
function Cs(T, k) { return 0.6 + 1.6 * clamp((T - A1) / Math.max(1, k.Acm - A1), 0, 1); }  // secondary cementite

function sample(fn, k, Tlo, Thi, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const T = Tlo + ((Thi - Tlo) * i) / n; pts.push([clamp(fn(T, k), Math.pow(10, T_LOG_MIN), Math.pow(10, T_LOG_MAX)), T]); }
  return pts;
}

function resultAt(Tq, C, k) {
  const { UC, Ms, Mf, maxFerrite, maxCem, hypo, hyper } = k;
  if (Tq > UC + 0.5) return { kind: 'austenit', label: 'Austenit', note: `Drženo nad ${hyper ? 'Acm' : hypo ? 'A₃' : 'A₁'} — bez přeměny.`, fr: { austenite: 1 } };
  if (Tq >= A1 - 0.5 && UC > A1 + 0.5) {
    const f = clamp((UC - Tq) / (UC - A1), 0, 1);
    if (hypo) { const ff = maxFerrite * f; return { kind: 'ferit+austenit', label: 'Ferit + austenit', note: `Částečná proeutektoidní přeměna (${Math.round(ff * 100)} % feritu), zbytek austenit.`, fr: { ferrite: ff, austenite: 1 - ff } }; }
    const fc = maxCem * f; return { kind: 'cementit+austenit', label: 'Sekundární cementit + austenit', note: `Částečná proeutektoidní přeměna (${Math.round(fc * 100)} % cementitu), zbytek austenit.`, fr: { cementite: fc, austenite: 1 - fc } };
  }
  if (Tq >= BS_HANDOFF) return { kind: 'perlit', label: (Tq > 640 ? 'Perlit (hrubý)' : 'Perlit (jemný)'), note: `Izotermický rozpad na perlit při ${Math.round(Tq)} °C.`, fr: { pearlite: 1 } };
  if (Tq >= Ms) { const upper = Tq > (Ms + BS_HANDOFF) / 2; return { kind: 'bainit', label: upper ? 'Bainit (horní)' : 'Bainit (dolní)', note: `Izotermický rozpad na ${upper ? 'horní' : 'dolní'} bainit při ${Math.round(Tq)} °C.`, fr: { bainite: 1 } }; }
  const f = Tq <= Mf ? 1 : clamp(1 - Math.exp(-0.011 * (Ms - Tq)), 0, 1);
  return { kind: f > 0.97 ? 'martenzit' : 'martenzit+austenit', label: f > 0.97 ? 'Martenzit' : 'Martenzit + zbytkový austenit', note: `Přímé prokalení pod Ms — ${Math.round(f * 100)} % martenzitu${f < 0.97 ? `, ${Math.round((1 - f) * 100)} % zbytkového austenitu` : ''}.`, fr: { martensite: f, austenite: 1 - f } };
}

function IraDiagram() {
  const [C, setC] = useState(0.6);
  const [Tq, setTq] = useState(300);
  const [holdTimeFrac, setHoldTimeFrac] = useState(1);
  const [playing, setPlaying] = useState(false);
  const holdTimeFracRef = useRef(1);
  holdTimeFracRef.current = holdTimeFrac;
  const plotRef = useRef(null);
  const [vw, setVw] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => { const onR = () => setVw(window.innerWidth); window.addEventListener('resize', onR); return () => window.removeEventListener('resize', onR); }, []);
  const mobile = vw < 860;

  const k = diagramConsts(C);
  const MfLim = Math.max(k.Mf, T_BOT);   // dosažitelné dno stupnice — u vyšších obsahů C leží Mf pod ní
  const TqClamped = Math.max(Tq, MfLim);
  useEffect(() => { if (Tq < MfLim) setTq(MfLim); }, [C]);
  const result = resultAt(TqClamped, C, k);

  // ── plot geometry ─────────────────────────────────────────────────────────
  const PW = 760, PH = 560, PAD_L = 78, PAD_R = 26, PAD_T = 26, PAD_B = 46;
  const plotW = PW - PAD_L - PAD_R, plotH = PH - PAD_T - PAD_B;
  const yOf = (T) => PAD_T + ((T_TOP - clamp(T, T_BOT, T_TOP)) / (T_TOP - T_BOT)) * plotH;

  const psPts = sample(Ps, k, BS_HANDOFF, A1, 40);
  const pfPts = sample(Pf, k, BS_HANDOFF, A1, 40);
  const bsPts = sample(Bs, k, k.Ms, BS_HANDOFF, 40);
  const bfPts = sample(Bf, k, k.Ms, BS_HANDOFF, 40);
  const fsPts = k.hypo ? sample(Fs, k, A1, k.A3, 24) : null;
  const csPts = k.hyper ? sample(Cs, k, A1, k.Acm, 24) : null;

  // finish-crossing time for the quench line (visual only)
  let crossT = null;
  if (result.kind === 'perlit') crossT = Pf(TqClamped, k);
  else if (result.kind === 'bainit') crossT = Bf(TqClamped, k);
  const canTimeSweep = crossT != null;
  useEffect(() => { setHoldTimeFrac(1); setPlaying(false); }, [result.kind, C]);

  const togglePlay = () => {
    if (playing) { setPlaying(false); return; }
    if (holdTimeFracRef.current >= 0.98) { holdTimeFracRef.current = 0; setHoldTimeFrac(0); }
    setPlaying(true);
  };

  // schematic quench-path anchors: \ (cooling from austenite), - (isothermal hold, ALWAYS drawn), \ (final cooling — only above Ms)
  const tA = Math.pow(10, T_LOG_MIN);
  const tMaxV = Math.pow(10, T_LOG_MAX);
  const hasFinalDrop = TqClamped > k.Ms + 0.5;
  // the initial drop must stay LEFT of both C-curves for its entire length — anchoring the squeeze boundary
  // at a fixed ratio below the curves' true sampled minimum guarantees this, since both curves only widen
  // away from their nose. holdStartTime is then placed well inside that safe squeeze zone (not tied tightly to
  // minStartTime) so the schematic diagonal always keeps a visible run — for eutectoid/near-eutectoid steel the
  // bainite nose sits so close to the plot's left edge that anchoring holdStartTime near minStartTime pushed it
  // below the plot's own minimum displayable time, collapsing the diagonal into a vertical stub.
  const minStartTime = Math.min(Math.min(...psPts.map((p) => p[0])), Math.min(...bsPts.map((p) => p[0])));
  const squeezeEndTime = Math.max(minStartTime * 0.72, tA * 1.02);
  const holdStartTime = Math.pow(10, T_LOG_MIN + 0.65 * (Math.log10(squeezeEndTime) - T_LOG_MIN));
  // final descent must clear the whole bainite dome so it crosses only Ms/Mf, never re-entering the bainite region
  const domeRight = Math.max(Bf(k.Ms, k), Bf(BS_HANDOFF, k));
  const holdEnd = crossT || (hasFinalDrop ? holdStartTime * 60 : holdStartTime * 2.4);
  const turnDownT = hasFinalDrop ? clamp(Math.max(holdEnd, domeRight * 1.18), holdStartTime * 1.15, tMaxV) : clamp(holdEnd, holdStartTime * 1.15, tMaxV);
  const finalEndT = hasFinalDrop ? clamp(turnDownT * 3.2, turnDownT * 1.15, tMaxV) : null;

  // non-uniform time axis: the pre-hold quench (tA → holdStartTime) is squeezed into a narrow band on the
  // left (INIT_FRAC of the plot width) so the sloped drop is always short and steep — it can never wander
  // rightward into the C-curve nose before the horizontal hold segment does, regardless of C or Tq.
  // The squeeze boundary (squeezeEndTime, above) sits below the curves' true sampled minimum so no curve
  // point ever lands at/near the seam — that was clipping the Bs nose into a sharp corner before.
  const INIT_FRAC = 0.12;
  const logHoldStart = Math.log10(squeezeEndTime);
  const preSpan = Math.max(logHoldStart - T_LOG_MIN, 0.001);
  const postSpan = Math.max(T_LOG_MAX - logHoldStart, 0.001);
  const xOf = (t) => {
    const tc = clamp(t, tA, tMaxV);
    const logT = Math.log10(tc);
    if (logT <= logHoldStart) return PAD_L + ((logT - T_LOG_MIN) / preSpan) * INIT_FRAC * plotW;
    return PAD_L + INIT_FRAC * plotW + ((logT - logHoldStart) / postSpan) * (1 - INIT_FRAC) * plotW;
  };
  const timeFromXFrac = (frac) => {
    if (frac <= INIT_FRAC) return Math.pow(10, T_LOG_MIN + (frac / INIT_FRAC) * preSpan);
    return Math.pow(10, logHoldStart + ((frac - INIT_FRAC) / (1 - INIT_FRAC)) * postSpan);
  };
  const pathFrom = (pts) => 'M' + pts.map(([t, T]) => `${xOf(t).toFixed(1)},${yOf(T).toFixed(1)}`).join(' L');

  // yellow draggable point: always sweeps the FULL horizontal hold segment [holdStartTime, turnDownT], so it can be
  // parked anywhere along the isothermal hold — not just within the active transformation's start/finish window.
  // Transformation itself only progresses between the true start curve (Ps/Bs) and finish curve (Pf/Bf); before that
  // window the structure reads as austenite, after it as fully transformed — regardless of where the marker sits.
  const markerTime = Math.pow(10, Math.log10(holdStartTime) + holdTimeFrac * (Math.log10(turnDownT) - Math.log10(holdStartTime)));
  const startCurveT = TqClamped > BS_HANDOFF ? Ps(TqClamped, k) : Bs(TqClamped, k);
  const transformedFrac = canTimeSweep ? clamp((Math.log10(markerTime) - Math.log10(startCurveT)) / (Math.log10(crossT) - Math.log10(startCurveT)), 0, 1) : 1;

  // auto-play: sweep the hold-time marker from 0 to 1. The actual phase transformation (Ps/Bs \u2192 Pf/Bf) runs
  // at a fixed ~7s pace (matching austenitizace-interaktivni.jsx); the "nothing happening yet" and
  // "already finished" stretches before/after it are swept much faster so the user isn't stuck watching austenite.
  const TRANSFORM_MS = 7000;
  const FAST_MS = 1400;
  const zoneStart = canTimeSweep ? clamp((Math.log10(startCurveT) - Math.log10(holdStartTime)) / (Math.log10(turnDownT) - Math.log10(holdStartTime)), 0, 1) : 0;
  const zoneEnd = canTimeSweep ? clamp((Math.log10(crossT) - Math.log10(holdStartTime)) / (Math.log10(turnDownT) - Math.log10(holdStartTime)), zoneStart, 1) : 1;
  useEffect(() => {
    if (!playing) return;
    let raf, last = performance.now();
    const zoneW = Math.max(zoneEnd - zoneStart, 0.001);
    const outW = Math.max(1 - zoneW, 0.001);
    const rateIn = zoneW / TRANSFORM_MS;      // frac per ms while inside the transformation window
    const rateOut = outW / FAST_MS;           // frac per ms outside it (fast)
    const step = (now) => {
      const dt = now - last; last = now;
      const cur = holdTimeFracRef.current;
      const rate = (cur >= zoneStart && cur <= zoneEnd) ? rateIn : rateOut;
      let nv = cur + rate * dt;
      let done = false;
      if (nv >= 1) { nv = 1; done = true; }
      holdTimeFracRef.current = nv; setHoldTimeFrac(nv);
      if (done) { setPlaying(false); return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, zoneStart, zoneEnd]);

  const setFromClientY = (clientY) => {
    const el = plotRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const scale = PH / r.height;
    const yLocal = (clientY - r.top) * scale;
    const f = clamp((yLocal - PAD_T) / plotH, 0, 1);
    setTq(Math.max(MfLim, Math.round(T_TOP - (T_TOP - T_BOT) * f)));
  };
  const onDown = (e) => { e.currentTarget.setPointerCapture(e.pointerId); setFromClientY(e.clientY); };
  const onMove = (e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) setFromClientY(e.clientY); };

  const setFracFromClientX = (clientX) => {
    const el = plotRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const scale = PW / r.width;
    const xLocal = (clientX - r.left) * scale;
    const frac = clamp((xLocal - PAD_L) / plotW, 0, 1);
    const time = timeFromXFrac(frac);
    setHoldTimeFrac(clamp((Math.log10(time) - Math.log10(holdStartTime)) / (Math.log10(turnDownT) - Math.log10(holdStartTime)), 0, 1));
  };
  const onMarkerDown = (e) => { e.stopPropagation(); setPlaying(false); e.currentTarget.setPointerCapture(e.pointerId); setFracFromClientX(e.clientX); };
  const onMarkerMove = (e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) { e.stopPropagation(); setFracFromClientX(e.clientX); } };

  // ── result microstructure fill (accounts for partial hold time via the yellow drag point) ──
  const partialKey = result.kind === 'perlit' ? 'pearlite' : result.kind === 'bainit' ? 'bainite' : null;
  const fr = (canTimeSweep && partialKey) ? { [partialKey]: transformedFrac, austenite: 1 - transformedFrac } : result.fr;
  const displayLines = !canTimeSweep
    ? (result.kind === 'martenzit+austenit'
        ? [`Austenit (${Math.round(result.fr.austenite * 100)} %)`, `Martenzit (${Math.round(result.fr.martensite * 100)} %)`]
        : [result.label])
    : transformedFrac < 0.02 ? ['Austenit (dr\u017eeno)']
    : transformedFrac < 0.97 ? [`Austenit (${Math.round((1 - transformedFrac) * 100)} %)`, `${result.label} (${Math.round(transformedFrac * 100)} %)`]
    : [result.label];
  const displayNote = !canTimeSweep ? result.note
    : transformedFrac < 0.02 ? `Dr\u017eeno do t \u2248 ${markerTime < 1 ? markerTime.toFixed(2) : Math.round(markerTime)} s \u2014 je\u0161t\u011b p\u0159ed ${result.kind === 'perlit' ? 'Ps' : 'Bs'}, p\u0159em\u011bna nezapo\u010dala (0 %).`
    : transformedFrac < 0.97 ? `Dr\u017eeno do t \u2248 ${markerTime < 1 ? markerTime.toFixed(2) : Math.round(markerTime)} s \u2014 ${Math.round(transformedFrac * 100)} % p\u0159em\u011bn\u011bno, zbytek austenit.`
    : result.note;
  const order = ['ferrite', 'pearlite', 'bainite', 'martensite', 'austenite'].filter((key) => result.fr[key] > 0.001);
  let acc = 0;
  const bounds = order.map((key) => { const lo = acc; acc += result.fr[key]; return [key, lo, acc]; });
  const finalCellPhase = CELLS.map((c) => (bounds.find(([, lo, hi]) => c.rank >= lo && c.rank < hi) || bounds[bounds.length - 1] || ['austenite', 0, 1])[0]);
  const phaseColor = { ferrite: FERRITE, pearlite: PEARLITE, bainite: BAINITE, martensite: MART, austenite: AUST };
  const phaseTex = { pearlite: 'lam', bainite: 'acic', martensite: 'needle' };
  const cemFrac = fr.cementite || 0;
  const netCoverage = clamp(cemFrac * 1.8, 0, 1);

  // per-cell nucleation-and-growth progress: cells assigned to the actively-tracked phase (pearlite/bainite)
  // nucleate at slightly staggered moments (via rank2) and grow via an expanding circle, mirroring
  // austenitizace-interaktivni.jsx; proeutectoid ferrite/cementite and martensite are treated as already formed.
  const globalProg = canTimeSweep ? transformedFrac : 1;
  const cellProgress = CELLS.map((c, idx) => {
    const ph = finalCellPhase[idx];
    if (ph === 'austenite') return 0;
    if (ph === 'ferrite' || ph === 'martensite') return 1;
    const spread = 0.4;
    const startOffset = c.rank2 * spread;
    return clamp((globalProg - startOffset) / Math.max(0.05, 1 - startOffset), 0, 1);
  });

  const legendItems = [
    ['austenit', 'rgba(239,171,84,0.7)', null],
    ['perlit', 'repeating-linear-gradient(45deg,#2c486a,#2c486a 2px,#96c4ec 2px,#96c4ec 4px)', null],
    ['bainit', 'repeating-linear-gradient(45deg,#28685f,#28685f 2px,#96dece 2px,#96dece 4px)', null],
    ['martenzit', 'repeating-linear-gradient(45deg,#7a78b8,#7a78b8 2px,#c6caf2 2px,#c6caf2 4px)', null],
    ['ferit', 'rgba(120,180,232,0.6)', null],
    ['sek. cementit', '#d67bff', null],
  ];

  const regime = k.hyper ? 'nadeutektoidní' : k.hypo ? 'podeutektoidní' : 'eutektoidní';
  const resultColor = result.kind === 'austenit' ? '#efab54'
    : result.kind.startsWith('ferit') ? '#8fb9e6'
    : result.kind.startsWith('cementit') ? '#d67bff'
    : result.kind === 'perlit' ? '#8fb9e6'
    : result.kind === 'bainit' ? '#7fe0cc'
    : '#c6caf2';

  const gridDecades = []; for (let e = T_LOG_MIN; e <= T_LOG_MAX; e++) gridDecades.push(e);

  return (
    <div style={{ width: '100%', height: mobile ? 'auto' : '100vh', minHeight: '100vh', background: '#080b12', color: '#eaf2fa', boxSizing: 'border-box',
      padding: mobile ? '40px 14px 20px' : '58px 52px 20px', display: 'flex', flexDirection: 'column', fontFamily: sans, position: 'relative', overflow: mobile ? 'visible' : 'hidden' }}>

      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(120% 90% at 42% 44%, rgba(30,52,80,0.45) 0%, rgba(9,13,20,0) 62%)' }} />

      {/* header */}
      <div style={{ position: 'relative', flex: '0 0 auto' }}>
        <div style={{ fontFamily: mono, fontSize: mobile ? 13 : 16, letterSpacing: '0.24em', color: '#5fc0ef', textTransform: 'uppercase' }}>Tepelné zpracování oceli · IRA diagram</div>
        <div style={{ fontSize: mobile ? 24 : 32, fontWeight: 600, marginTop: 6, letterSpacing: '-0.01em' }}>Izotermický rozpad austenitu</div>
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

        {/* IRA plot */}
        <div style={{ flex: mobile ? '0 0 auto' : '1 1 auto', minWidth: 0, minHeight: mobile ? 320 : 0, display: 'flex', borderRadius: 16, border: '1px solid rgba(120,180,230,0.14)', background: 'rgba(120,180,230,0.03)', padding: 10, boxSizing: 'border-box' }}>
          <svg ref={plotRef} viewBox={`0 0 ${PW} ${PH}`} preserveAspectRatio="xMidYMid meet" onPointerDown={onDown} onPointerMove={onMove}
               style={{ width: '100%', height: mobile ? 'auto' : '100%', display: 'block', cursor: 'ns-resize', touchAction: 'none' }}>
            {/* gridlines: time decades */}
            {gridDecades.map((e) => (
              <g key={'gx' + e}>
                <line x1={xOf(Math.pow(10, e))} y1={PAD_T} x2={xOf(Math.pow(10, e))} y2={PAD_T + plotH} stroke="rgba(150,180,210,0.1)" strokeWidth={1} />
                <text x={xOf(Math.pow(10, e))} y={PAD_T + plotH + 20} fontFamily={mono} fontSize={12} fill="#7d8ea0" textAnchor="middle">{e < 0 ? `${Math.pow(10, e)}` : `10${e === 0 ? '⁰' : e === 1 ? '¹' : e === 2 ? '²' : e === 3 ? '³' : e === 4 ? '⁴' : e === 5 ? '⁵' : '⁶'}`}</text>
              </g>
            ))}
            <text x={PAD_L + plotW / 2} y={PH - 4} fontFamily={mono} fontSize={12.5} fill="#aebfcf" textAnchor="middle">čas [s], log. měřítko</text>
            {/* y axis temp gridlines */}
            {[0, 200, 400, 600, 800].map((T) => (
              <g key={'gy' + T}>
                <line x1={PAD_L} y1={yOf(T)} x2={PAD_L + plotW} y2={yOf(T)} stroke="rgba(150,180,210,0.08)" strokeWidth={1} />
                <text x={PAD_L - 10} y={yOf(T) + 4} fontFamily={mono} fontSize={12} fill="#7d8ea0" textAnchor="end">{T}</text>
              </g>
            ))}
            <text x={16} y={PAD_T + plotH / 2} fontFamily={mono} fontSize={12.5} fill="#aebfcf" textAnchor="middle" transform={`rotate(-90 16 ${PAD_T + plotH / 2})`}>teplota [°C]</text>

            {/* reference temperature lines */}
            <line x1={PAD_L} y1={yOf(A1)} x2={PAD_L + plotW} y2={yOf(A1)} stroke="rgba(190,210,230,0.55)" strokeDasharray="5 5" strokeWidth={1.3} />
            <text x={PAD_L + plotW + 4} y={yOf(A1) + 4} fontFamily={mono} fontSize={12} fill="#cdd8e2">A₁ 727</text>
            {k.hypo && (<React.Fragment>
              <line x1={PAD_L} y1={yOf(k.A3)} x2={PAD_L + plotW} y2={yOf(k.A3)} stroke="rgba(143,185,230,0.5)" strokeDasharray="5 5" strokeWidth={1.3} />
              <text x={PAD_L + plotW + 4} y={yOf(k.A3) + 4} fontFamily={mono} fontSize={12} fill="#8fb9e6">A₃ {Math.round(k.A3)}</text>
            </React.Fragment>)}
            {k.hyper && (<React.Fragment>
              <line x1={PAD_L} y1={yOf(k.Acm)} x2={PAD_L + plotW} y2={yOf(k.Acm)} stroke="rgba(214,123,255,0.5)" strokeDasharray="5 5" strokeWidth={1.3} />
              <text x={PAD_L + plotW + 4} y={yOf(k.Acm) + 4} fontFamily={mono} fontSize={12} fill="#d67bff">A<tspan fontSize={9} dy={3}>cm</tspan><tspan dy={-3}> {Math.round(k.Acm)}</tspan></text>
            </React.Fragment>)}
            <line x1={PAD_L} y1={yOf(k.Ms)} x2={PAD_L + plotW} y2={yOf(k.Ms)} stroke="rgba(198,202,242,0.75)" strokeWidth={1.6} />
            <text x={PAD_L + plotW + 4} y={yOf(k.Ms) + 4} fontFamily={mono} fontSize={12} fill="#c6caf2">Ms {k.Ms}</text>
            {k.Mf > T_BOT + 8 ? (<React.Fragment>
              <line x1={PAD_L} y1={yOf(k.Mf)} x2={PAD_L + plotW} y2={yOf(k.Mf)} stroke="rgba(198,202,242,0.45)" strokeDasharray="2 4" strokeWidth={1.3} />
              <text x={PAD_L + plotW + 4} y={yOf(k.Mf) + 4} fontFamily={mono} fontSize={12} fill="#a9adde">Mf {k.Mf}</text>
            </React.Fragment>) : (
              <text x={PAD_L + 8} y={yOf(T_BOT) - 24} fontFamily={mono} fontSize={12} fill="#a9adde">Mf {k.Mf} °C — pod dosažitelnou teplotou</text>
            )}

            {/* transformation curves */}
            {fsPts && <path d={pathFrom(fsPts)} fill="none" stroke="#8fb9e6" strokeWidth={2} />}
            {csPts && <path d={pathFrom(csPts)} fill="none" stroke="#d67bff" strokeWidth={2} />}
            <path d={pathFrom(psPts)} fill="none" stroke="#96c4ec" strokeWidth={2.4} />
            <path d={pathFrom(pfPts)} fill="none" stroke="#5f88ac" strokeWidth={2} strokeDasharray="7 6" />
            <path d={pathFrom(bsPts)} fill="none" stroke="#7fe0cc" strokeWidth={2.4} />
            <path d={pathFrom(bfPts)} fill="none" stroke="#3f8f80" strokeWidth={2} strokeDasharray="7 6" />

            {/* curve labels — placed along each curve's own path, away from axis clutter */}
            <text x={xOf(Ps(A1 - (A1 - BS_HANDOFF) * 0.42, k))} y={yOf(A1 - (A1 - BS_HANDOFF) * 0.42) - 9} fontFamily={mono} fontSize={13} fill="#96c4ec" textAnchor="middle">Ps</text>
            <text x={xOf(Pf(BS_HANDOFF + (A1 - BS_HANDOFF) * 0.16, k)) + 8} y={yOf(BS_HANDOFF + (A1 - BS_HANDOFF) * 0.16) + 4} fontFamily={mono} fontSize={13} fill="#5f88ac">Pf</text>
            <text x={xOf(Bs(k.Tnose_b + (BS_HANDOFF - k.Tnose_b) * 0.55, k)) - 10} y={yOf(k.Tnose_b + (BS_HANDOFF - k.Tnose_b) * 0.55) - 6} fontFamily={mono} fontSize={13} fill="#7fe0cc" textAnchor="end">Bs</text>
            <text x={xOf(Bf(k.Tnose_b + (BS_HANDOFF - k.Tnose_b) * 0.3, k)) + 8} y={yOf(k.Tnose_b + (BS_HANDOFF - k.Tnose_b) * 0.3) + 4} fontFamily={mono} fontSize={13} fill="#3f8f80">Bf</text>
            {fsPts && <text x={xOf(Fs(k.A3 - (k.A3 - A1) * 0.35, k)) + 6} y={yOf(k.A3 - (k.A3 - A1) * 0.35) - 8} fontFamily={mono} fontSize={13} fill="#8fb9e6">Fs</text>}
            {csPts && <text x={xOf(Cs(k.Acm - (k.Acm - A1) * 0.35, k)) + 6} y={yOf(k.Acm - (k.Acm - A1) * 0.35) - 8} fontFamily={mono} fontSize={13} fill="#d67bff">Cs</text>}

            {/* quench path: \ cooling from austenite · - isothermal hold (always drawn) · \ final cooling (only when the hold happens above Ms) */}
            <path d={`M${xOf(tA).toFixed(1)},${yOf(T_TOP).toFixed(1)} L${xOf(holdStartTime).toFixed(1)},${yOf(TqClamped).toFixed(1)}`} fill="none" stroke="#e5703b" strokeWidth={2.6} strokeLinecap="round" />
            <path d={`M${xOf(holdStartTime).toFixed(1)},${yOf(TqClamped).toFixed(1)} L${xOf(turnDownT).toFixed(1)},${yOf(TqClamped).toFixed(1)}`} fill="none" stroke="#e5703b" strokeWidth={2.6} strokeLinecap="round" />
            {hasFinalDrop && <path d={`M${xOf(turnDownT).toFixed(1)},${yOf(TqClamped).toFixed(1)} L${xOf(finalEndT).toFixed(1)},${yOf(T_BOT).toFixed(1)}`} fill="none" stroke="#e5703b" strokeWidth={2.6} strokeLinecap="round" />}
            {crossT && <circle cx={xOf(crossT)} cy={yOf(TqClamped)} r={5} fill="#e5703b" stroke="#0b0e15" strokeWidth={1.5} />}
            <circle cx={xOf(holdStartTime)} cy={yOf(TqClamped)} r={5.5} fill="#eaf2fa" stroke="#e5703b" strokeWidth={2} style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'pulseDot 1.7s ease-in-out infinite' }} />
            <circle cx={xOf(tA)} cy={yOf(T_TOP)} r={4} fill="#eaf2fa" />

            {/* yellow draggable point: sweeps the full isothermal-hold segment to observe the transformation's progress */}
            <g onPointerDown={onMarkerDown} onPointerMove={onMarkerMove} style={{ cursor: 'ew-resize', touchAction: 'none' }}>
                <circle cx={xOf(markerTime)} cy={yOf(TqClamped)} r={13} fill="transparent" />
                <circle cx={xOf(markerTime)} cy={yOf(TqClamped)} r={7.5} fill="#f4c542" stroke="#0b0e15" strokeWidth={2} style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'pulseDot 1.7s ease-in-out infinite' }} />
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

          <div style={{ padding: '13px 16px', borderRadius: 12, background: 'rgba(120,180,230,0.05)', border: '1px solid rgba(120,180,230,0.16)', minHeight: 118, boxSizing: 'border-box' }}>
            <div style={{ fontFamily: mono, fontSize: 12, letterSpacing: '0.18em', color: '#7fb4d6', textTransform: 'uppercase' }}>Výsledná struktura</div>
            <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4, color: resultColor, lineHeight: 1.3, minHeight: 26 }}>
              {displayLines.map((line, i) => <div key={i}>{line}</div>)}
            </div>
            <div style={{ fontSize: 13.5, color: '#aebfcf', marginTop: 4, lineHeight: 1.4, minHeight: 38 }}>{displayNote}</div>
          </div>

          <div style={{ fontFamily: mono, fontSize: 12.5, color: '#8296a8', lineHeight: 1.7 }}>
            <div>{regime} ocel</div>
            <div>{C.toFixed(2)} % C</div>
            <div>Ms {k.Ms} °C</div>
          </div>
        </div>
      </div>

      {/* poznámka pod grafem */}
      <div style={{ position: 'relative', flex: '0 0 auto', marginTop: 10, fontSize: 13.5, color: '#8296a8', lineHeight: 1.55, maxWidth: 1000 }}>
        Z IRA diagramu nelze odečítat plynulé ochlazování — platí jen pro rychlé zchlazení na danou teplotu a&nbsp;výdrž na ní.
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
          <div style={{ flex: mobile ? '0 0 auto' : '0 0 190px', fontFamily: mono, fontSize: 14, color: '#aebfcf' }}>Teplota kalení
            <span style={{ color: '#eaf2fa', fontSize: 17, marginLeft: 8 }}>{TqClamped} °C</span>
          </div>
          <div style={{ flex: '1 1 auto', position: 'relative', height: 16, display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, height: 6, borderRadius: 3, background: 'rgba(120,180,230,0.18)' }} />
            <div style={{ position: 'absolute', left: 0, height: 6, borderRadius: 3, width: `${((TqClamped - MfLim) / (T_TOP - MfLim)) * 100}%`, background: '#e5703b' }} />
            <div style={{ position: 'absolute', left: `${((TqClamped - MfLim) / (T_TOP - MfLim)) * 100}%`, top: '50%', width: 16, height: 16, borderRadius: '50%',
              background: '#e5703b', border: '2px solid #0b0e15', transform: 'translate(-50%, -50%)', pointerEvents: 'none',
              animation: 'pulseThumb 1.7s ease-in-out infinite' }} />
            <input type="range" min={MfLim} max={T_TOP} value={TqClamped} step={2}
                   onChange={(e) => setTq(Math.max(MfLim, Number(e.target.value)))}
                   style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', margin: 0, opacity: 0, cursor: 'pointer' }} />
          </div>
          <div style={{ flex: mobile ? '0 0 auto' : '0 0 178px' }} />
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

window.IraDiagram = IraDiagram;
