// austenitizace-interaktivni.jsx — Fe–C: heat to austenitize, or cool to form pearlite / bainite / martensite.
// Reusable React component (mounted by the DC). React is provided globally.
const { useState, useRef, useEffect } = React;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ── deterministic RNG ───────────────────────────────────────────────────────
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── micrograph field: jittered quad mosaic = grains ─────────────────────────
const FX = 300, FY = 250, FW = 1180, FH = 620;
const NX = 8, NY = 6;
const rnd = mulberry32(20240607);

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
    CELLS.push({
      pts, cx: cxp, cy: cyp,
      rank: rnd(),            // ferrite/pearlite selection threshold
      rank2: rnd(),           // transformation-temperature spread
      pxRand: rnd(),          // pearlite transformation-temperature jitter
      lamAng: rnd() * Math.PI,
      texAng: rnd() * Math.PI, // bainite / martensite needle orientation
    });
  }
}

// internal grain-boundary edges (host the secondary-cementite network)
const BEDGES = [];
for (let j = 1; j < NY; j++) for (let i = 0; i < NX; i++) BEDGES.push({ a: verts[j][i], b: verts[j][i + 1], rank: rnd() });
for (let i = 1; i < NX; i++) for (let j = 0; j < NY; j++) BEDGES.push({ a: verts[j][i], b: verts[j + 1][i], rank: rnd() });

// ── colours ─────────────────────────────────────────────────────────────────
const FERRITE = [120, 180, 232, 0.16];
const PEARLITE = [44, 72, 106, 0.60];
const BAINITE = [40, 104, 96, 0.60];
const MART = [122, 120, 185, 0.44];
const AUST = [239, 171, 84, 0.26];
const rgba = (c) => `rgba(${c[0]},${c[1]},${c[2]},${c[3]})`;
const lerpC = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t,
];

// ── Fe–C constants ──────────────────────────────────────────────────────────
const FEC = window.FEC;   // vnitrni-stavba-kovu-a-tz/fe-c-konstanty.js
const T_MIN = -80, T_MAX = 1050, A1 = FEC.T_A1;
const C_EUT = FEC.C_S, C_FMAX = FEC.C_P, C_CEM = FEC.C_CEM;
const EUT_LO = C_EUT - FEC.EUT_TOL, EUT_HI = C_EUT + FEC.EUT_TOL;
const C_MIN = 0.05, C_MAX = 1.40;
const sans = "'IBM Plex Sans', system-ui, sans-serif";
const mono = "'IBM Plex Mono', ui-monospace, monospace";
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

// texture line elements for a given constituent (drawn inside a clip by the caller)
function texLines(c, kind, kp) {
  const lines = [];
  if (kind === 'lam') {
    const dx = Math.cos(c.lamAng), dy = Math.sin(c.lamAng), nx = -dy, ny = dx;
    for (let k = -150; k <= 150; k += 9) { const mx = c.cx + nx * k, my = c.cy + ny * k;
      lines.push(<line key={kp + k} x1={mx - dx * 120} y1={my - dy * 120} x2={mx + dx * 120} y2={my + dy * 120} stroke="rgba(150,196,236,0.55)" strokeWidth={2.4} />); }
  } else if (kind === 'acic') {
    const dx = Math.cos(c.texAng), dy = Math.sin(c.texAng), nx = -dy, ny = dx;
    for (let k = -150; k <= 150; k += 13) { const mx = c.cx + nx * k, my = c.cy + ny * k;
      lines.push(<line key={kp + k} x1={mx - dx * 130} y1={my - dy * 130} x2={mx + dx * 130} y2={my + dy * 130} stroke="rgba(150,222,206,0.6)" strokeWidth={3} strokeDasharray="9 13" />); }
  } else if (kind === 'needle') {
    [-1, 1].forEach((sgn, fi) => { const ang = c.texAng + sgn * 0.62, dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
      for (let k = -150; k <= 150; k += 15) { const mx = c.cx + nx * k, my = c.cy + ny * k;
        lines.push(<line key={kp + fi + '_' + k} x1={mx - dx * 130} y1={my - dy * 130} x2={mx + dx * 130} y2={my + dy * 130} stroke="rgba(198,202,242,0.7)" strokeWidth={2} strokeDasharray="5 15" />); } });
  }
  return lines;
}

function AustenitizaceInteraktivni() {
  const [mode, setMode] = useState('heat');       // 'heat' | 'cool'
  const [T, setT] = useState(20);
  const [C, setC] = useState(0.45);
  const [coolKind, setCoolKind] = useState('ARA'); // 'pomala' | 'IRA' | 'ARA'
  const [playing, setPlaying] = useState(false);
  const trackRef = useRef(null);
  const tRef = useRef(T); tRef.current = T;
  const cool = mode === 'cool';

  // viewport width → responsive (mobile) layout
  const [vw, setVw] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const onR = () => setVw(window.innerWidth);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);
  const mobile = vw < 760;

  const stop = () => setPlaying(false);

  const switchMode = (m) => {
    stop();
    setMode(m);
    setT(m === 'cool' ? 900 : 20);                 // cool: start from austenite and drop; heat: start cold
  };

  const setFromClientY = (clientY) => {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const f = clamp((clientY - r.top) / r.height, 0, 1);
    setT(Math.round(T_MAX - (T_MAX - T_MIN) * f));
  };
  const onDown = (e) => { stop(); e.currentTarget.setPointerCapture(e.pointerId); setFromClientY(e.clientY); };
  const onMove = (e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) setFromClientY(e.clientY); };

  // ── composition-derived ───────────────────────────────────────────────────
  const hyper = C > C_EUT;
  const regime = C < EUT_LO ? 'podeutektoidní' : C <= EUT_HI ? 'eutektoidní' : 'nadeutektoidní';
  const Wp_hypo = clamp((C - C_FMAX) / (C_EUT - C_FMAX), 0, 1);
  const Wcem = hyper ? clamp((C - C_EUT) / (C_CEM - C_EUT), 0, 1) : 0;
  const A3 = FEC.T_G - (FEC.T_G - A1) * clamp(C / C_EUT, 0, 1);
  const Acm = A1 + (C - C_EUT) * 312;
  const UC = hyper ? Acm : A3;
  const ucLabel = hyper ? <span>A<sub>cm</sub></span> : 'A₃';
  const netFrac = hyper ? clamp((C - C_EUT) / (C_MAX - C_EUT), 0, 1) : 0;
  const coverage = clamp(netFrac * 1.7, 0, 1);
  const cemRemain = hyper ? clamp(1 - (T - A1) / Math.max(1, Acm - A1), 0, 1) : 0;

  const Ms = Math.round(539 - 423 * C);            // Andrews (approx)
  const Mf = Ms - 180;

  // active cooling product from the selected cooling kind
  const product = !cool ? null
    : coolKind === 'pomala' ? { key: 'perlit', name: 'Perlit', fill: PEARLITE, start: 700, finish: 560, tex: 'lam',
        note: 'Pomalé ochlazování · difuzní přeměna', startLabel: 'Ps', finishLabel: 'Pf' }
    : coolKind === 'IRA' ? { key: 'bainit', name: 'Bainit', fill: BAINITE, start: 555, finish: 260, tex: 'acic',
        note: 'Izotermické kalení · izotermická přeměna v bainitické oblasti', startLabel: 'Bs', finishLabel: 'Bf' }
    : { key: 'martenzit', name: 'Martenzit', fill: MART, start: Ms, finish: Mf, tex: 'needle',
        note: 'Kalení na martenzit · bezdifuzní přeměna', startLabel: 'Ms', finishLabel: 'Mf' };

  // ── per-cell transformation ───────────────────────────────────────────────
  const cellState = CELLS.map((c) => {
    if (!cool) {
      const isPearlite = hyper ? true : c.rank < Wp_hypo;
      const Tx = isPearlite ? 728 + c.pxRand * 20 : (A1 + 8) + c.rank2 * Math.max(6, A3 - (A1 + 8));
      return { p: clamp((T - Tx) / 17, 0, 1), isPearlite };
    }
    // cooling: austenite → product as T drops below the product's start temperature
    const span = product.start - product.finish;
    const startEff = product.start - c.rank2 * 0.18 * span;
    const p = clamp((startEff - T) / Math.max(8, startEff - product.finish), 0, 1);
    return { p, isPearlite: false };
  });
  const meanP = cellState.reduce((s, x) => s + x.p, 0) / cellState.length;

  // ── heat-mode aggregates ──────────────────────────────────────────────────
  const austFrac = meanP * (1 - Wcem) + (1 - cemRemain) * Wcem;
  const austPct = Math.round(austFrac * 100);
  const startName = hyper ? 'Perlit + sekundární cementit' : regime === 'eutektoidní' ? 'Perlit' : 'Ferit + perlit';
  const heatPhase = austPct < 1 ? startName : austPct > 99 ? 'Austenit (γ)' : 'Přeměna → austenit';
  const heatNote = T < A1 ? `Pod A₁ — ${regime} struktura`
    : T < UC ? <React.Fragment>Mezi A₁ a {ucLabel} — probíhá přeměna</React.Fragment>
    : <React.Fragment>Nad {ucLabel} — plně austenitická</React.Fragment>;

  // ── cool-mode aggregates ──────────────────────────────────────────────────
  const transformedPct = Math.round(meanP * 100);
  const retainedPct = 100 - transformedPct;
  const coolPhase = meanP < 0.01 ? 'Austenit (γ)'
    : (product && product.key === 'martenzit' && retainedPct > 3)
      ? `${product.name} + zbytkový austenit` : (product ? product.name : '');
  const coolNote = product
    ? (meanP < 0.01
        ? `Nad ${product.startLabel} — zatím austenit`
        : product.note + (product.key === 'martenzit' && retainedPct > 3 ? ` · zbytkový austenit ${retainedPct} %` : ''))
    : '';

  // ── shared readout selection ──────────────────────────────────────────────
  const barPct = cool ? transformedPct : austPct;
  const barGrad = cool
    ? (product.key === 'perlit' ? 'linear-gradient(to right,#4f7fb0,#2c486a)'
      : product.key === 'bainit' ? 'linear-gradient(to right,#3fbfa8,#28685f)'
      : 'linear-gradient(to right,#b9bdf0,#7a78b8)')
    : 'linear-gradient(to right,#efab54,#e5703b)';
  const barLabel = cool ? 'Přeměněno' : 'Podíl austenitu';
  const phase = cool ? coolPhase : heatPhase;
  const phaseNote = cool ? coolNote : heatNote;

  const boundary = cool
    ? rgba(lerpC([240, 190, 130, 0.5], [200, 210, 230, 0.4], meanP))
    : rgba(lerpC([150, 196, 236, 0.5], [240, 190, 130, 0.55], meanP));

  const tempFrac = (T - T_MIN) / (T_MAX - T_MIN);
  const pct = (temp) => ((temp - T_MIN) / (T_MAX - T_MIN)) * 100;
  const ucClamped = clamp(UC, T_MIN, T_MAX);
  const prodStartClamped = product ? clamp(product.start, T_MIN, T_MAX) : 0;
  const prodFinishClamped = product ? clamp(product.finish, T_MIN, T_MAX) : 0;

  // ── animation bounds (for the Play button) ────────────────────────────────
  const heatStart = 20, heatEnd = 1000, coolStart = 900;
  const coolEnd = Math.max(T_MIN, (product ? product.finish : 0) - 40);

  // auto-play: sweep temperature over ~7 s; any manual input stops it
  useEffect(() => {
    if (!playing) return;
    let raf, last = performance.now();
    const range = cool ? (coolStart - coolEnd) : (heatEnd - heatStart);
    // transformation band — playback slows to ¼ inside it so the change is visible
    let bandLo, bandHi;
    if (cool) {
      const MsL = 539 - 423 * C, MfL = MsL - 180;
      bandHi = coolKind === 'pomala' ? 700 : coolKind === 'IRA' ? 555 : MsL;
      bandLo = coolKind === 'pomala' ? 560 : coolKind === 'IRA' ? 260 : MfL;
    } else {
      const A3L = FEC.T_G - (FEC.T_G - A1) * clamp(C / C_EUT, 0, 1);
      const AcmL = A1 + (C - C_EUT) * 312;
      // cell Tx values run up to ~748 °C (728 + up to 20) and each cell's own front then
      // ramps over another 17 °C, so the eutectoid/near-eutectoid band needs a floor width
      // (A3L collapses to A1 exactly at C_EUT, which used to leave a near-zero-width band).
      bandLo = A1; bandHi = C > C_EUT ? AcmL : Math.max(A3L, A1 + 38);
    }
    const bandWidth = Math.max(1, bandHi - bandLo);
    const outDist = Math.max(1, range - bandWidth);
    // Pace the band crossing off max(bandWidth, 15) rather than the raw width: a normal
    // ~38°+ band still takes its intended ~7 s, but a near-eutectoid composition just
    // above C_EUT collapses Acm-A1 to a sliver (sometimes <2°) — without this floor the
    // temperature would crawl at 1°/7s for ages after the structure has already finished
    // transforming, reading as a stuck/very-slow animation.
    const bandPaceWidth = Math.max(bandWidth, 15);
    const step = (now) => {
      const dt = now - last; last = now;
      const inBand = tRef.current >= bandLo - 8 && tRef.current <= bandHi + 8;
      // transformation band always takes ~7 s (for a normal-width band); the rest is
      // traversed quickly (~1.2 s)
      const dv = inBand ? (bandPaceWidth / 7000) * dt : (outDist / 1200) * dt;
      let nx = cool ? tRef.current - dv : tRef.current + dv;
      let done = false;
      if (cool && nx <= coolEnd) { nx = coolEnd; done = true; }
      if (!cool && nx >= heatEnd) { nx = heatEnd; done = true; }
      tRef.current = nx; setT(Math.round(nx));
      if (done) { setPlaying(false); return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, cool, coolKind, C]);

  const togglePlay = () => {
    if (playing) { setPlaying(false); return; }
    if (cool) { if (tRef.current <= coolEnd + 6) { tRef.current = coolStart; setT(coolStart); } }
    else { if (tRef.current >= heatEnd - 6) { tRef.current = heatStart; setT(heatStart); } }
    setPlaying(true);
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#080b12', color: '#eaf2fa',
      boxSizing: 'border-box', padding: mobile ? '40px 14px 20px' : '58px 52px 20px', display: 'flex', flexDirection: 'column',
      fontFamily: sans, position: 'relative', overflow: mobile ? 'visible' : 'hidden' }}>

      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(120% 90% at 42% 44%, rgba(30,52,80,0.45) 0%, rgba(9,13,20,0) 62%)' }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', transition: 'opacity .2s',
        opacity: clamp((T - 500) / 450, 0, 1),
        background: 'radial-gradient(80% 70% at 40% 55%, rgba(229,112,59,0.16) 0%, rgba(9,13,20,0) 60%)' }} />

      {/* header + mode switch */}
      <div style={{ position: 'relative', flex: '0 0 auto', display: 'flex', flexDirection: mobile ? 'column' : 'row', gap: mobile ? 12 : 0, justifyContent: 'space-between', alignItems: mobile ? 'stretch' : 'flex-start' }}>
        <div>
          <div style={{ fontFamily: mono, fontSize: mobile ? 13 : 16, letterSpacing: '0.24em', color: '#5fc0ef', textTransform: 'uppercase' }}>Tepelné zpracování oceli</div>
          <div style={{ fontSize: mobile ? 24 : 32, fontWeight: 600, marginTop: 6, letterSpacing: '-0.01em' }}>{cool ? 'Ochlazování austenitu' : 'Austenitizace'}</div>
        </div>
        <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: 'rgba(120,150,180,0.1)',
          border: '1px solid rgba(150,180,210,0.2)', fontFamily: mono, fontSize: 14 }}>
          {[['heat', 'Ohřev'], ['cool', 'Ochlazování']].map(([m, lab]) => (
            <button key={m} onClick={() => switchMode(m)} style={{
              flex: mobile ? '1 1 0' : '0 0 auto',
              padding: '9px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontFamily: mono, fontSize: 14, letterSpacing: '0.04em',
              background: mode === m ? (m === 'cool' ? 'rgba(120,140,210,0.9)' : 'rgba(239,171,84,0.9)') : 'transparent',
              color: mode === m ? '#0b0e15' : '#aebfcf', fontWeight: mode === m ? 600 : 400, transition: 'background .15s',
              animation: 'pulseBtn 1.8s ease-in-out infinite' }}>{lab}</button>
          ))}
        </div>
      </div>

      {/* legend */}
      <div style={{ position: 'relative', flex: '0 0 auto', marginTop: 8, display: 'flex', gap: 24,
        flexWrap: 'wrap', fontFamily: mono, fontSize: 14.5, color: '#aebfcf' }}>
        {!cool ? (
          <React.Fragment>
            <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(120,180,232,0.5)', border: '1px solid rgba(150,196,236,0.7)' }} />
              ferit
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, background: 'repeating-linear-gradient(45deg,#2c486a,#2c486a 2px,#96c4ec 2px,#96c4ec 4px)' }} />
              perlit
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, background: '#c95bff', border: '1px solid rgba(213,130,255,0.95)' }} />
              sek. cementit <span style={{ color: '#c98bff' }}>· Fe₃C</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(239,171,84,0.7)', border: '1px solid rgba(240,190,130,0.8)' }} />
              austenit
            </span>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(239,171,84,0.7)', border: '1px solid rgba(240,190,130,0.8)' }} />
              austenit <span style={{ color: '#efab54' }}>· výchozí</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, background: 'repeating-linear-gradient(45deg,#2c486a,#2c486a 2px,#96c4ec 2px,#96c4ec 4px)' }} />
              perlit <span style={{ color: '#8296a8' }}>· pomalé</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, background: 'repeating-linear-gradient(45deg,#28685f,#28685f 2px,#96dece 2px,#96dece 4px)' }} />
              bainit <span style={{ color: '#8296a8' }}>· izotermické kalení</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, background: 'repeating-linear-gradient(45deg,#7a78b8,#7a78b8 2px,#c6caf2 2px,#c6caf2 4px)' }} />
              martenzit <span style={{ color: '#8296a8' }}>· kalení na martenzit</span>
            </span>
          </React.Fragment>
        )}
      </div>

      {/* main */}
      <div style={{ position: 'relative', flex: '1 1 auto', display: 'flex', flexDirection: mobile ? 'column' : 'row', gap: mobile ? 18 : 40, alignItems: 'stretch', marginTop: 10, minHeight: mobile ? 'auto' : 440 }}>

        {/* microstructure */}
        <div style={{ flex: mobile ? '0 0 300px' : '1 1 auto', position: 'relative', borderRadius: 16,
          border: '1px solid rgba(120,180,230,0.14)', background: 'rgba(120,180,230,0.03)', minHeight: mobile ? 260 : 440 }}>
          <svg viewBox="284 236 1212 648" preserveAspectRatio="xMidYMid meet"
               style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
            <defs>
              {CELLS.map((c, idx) => (
                <clipPath key={idx} id={`iclip${idx}`}><path d={cellPath(c)} /></clipPath>
              ))}
              {CELLS.map((c, idx) => {
                const s = nucSeed(c);
                const R = s.maxR * Math.sqrt(clamp(cellState[idx].p, 0, 1));
                return <clipPath key={'g' + idx} id={`grow${idx}`}><circle cx={s.x} cy={s.y} r={R} /></clipPath>;
              })}
            </defs>

            {/* base: original constituent across the whole grain */}
            {CELLS.map((c, idx) => {
              const { isPearlite } = cellState[idx];
              const orig = cool ? AUST : (isPearlite ? PEARLITE : FERRITE);
              return <path key={'bf' + idx} d={cellPath(c)} fill={rgba(orig)} />;
            })}
            {/* base texture (pearlite lamellae in heat mode) */}
            {!cool && CELLS.map((c, idx) => {
              if (!cellState[idx].isPearlite) return null;
              return <g key={'bt' + idx} clipPath={`url(#iclip${idx})`}>{texLines(c, 'lam', 'bl')}</g>;
            })}

            {/* transformed region: grows from the nucleation seed (grain ∩ front circle) */}
            {CELLS.map((c, idx) => {
              const { p } = cellState[idx];
              if (p <= 0.004) return null;
              const newFill = cool ? product.fill : AUST;
              const kind = cool ? product.tex : null;
              return (
                <g key={'nf' + idx} clipPath={`url(#iclip${idx})`}>
                  <g clipPath={`url(#grow${idx})`}>
                    <path d={cellPath(c)} fill="#0b0e15" />
                    <path d={cellPath(c)} fill={rgba(newFill)} />
                    {kind && texLines(c, kind, 'nl')}
                  </g>
                </g>
              );
            })}

            {/* grain boundaries */}
            {CELLS.map((c, idx) => (
              <path key={'b' + idx} d={cellPath(c)} fill="none" stroke={boundary} strokeWidth={2} strokeLinejoin="round" />
            ))}

            {/* secondary cementite network (heat, hypereutectoid) */}
            {!cool && cemRemain > 0.01 && BEDGES.map((e, idx) => {
              if (e.rank >= coverage) return null;
              const op = cemRemain * 0.92;
              return (
                <g key={'c' + idx}>
                  <line x1={e.a[0]} y1={e.a[1]} x2={e.b[0]} y2={e.b[1]} stroke="rgba(201,91,255,0.35)" strokeWidth={4 + netFrac * 4} strokeLinecap="round" opacity={op} />
                  <line x1={e.a[0]} y1={e.a[1]} x2={e.b[0]} y2={e.b[1]} stroke="#d67bff" strokeWidth={2 + netFrac * 1.6} strokeLinecap="round" opacity={op} />
                </g>
              );
            })}

            {/* moving transformation front */}
            {CELLS.map((c, idx) => {
              const { p } = cellState[idx];
              if (p <= 0.02 || p >= 0.992) return null;
              const s = nucSeed(c);
              const R = s.maxR * Math.sqrt(p);
              const rc = cool ? (product.key === 'martenzit' ? 'rgba(198,202,242,0.85)' : product.key === 'bainit' ? 'rgba(150,222,206,0.8)' : 'rgba(150,196,236,0.75)') : 'rgba(240,180,110,0.8)';
              return (
                <g key={'r' + idx} clipPath={`url(#iclip${idx})`}>
                  <circle cx={s.x} cy={s.y} r={R} fill="none" stroke={rc} strokeWidth={2.2} opacity={0.85} />
                </g>
              );
            })}
          </svg>
        </div>

        {/* control panel */}
        <div style={{ flex: mobile ? '0 0 auto' : '0 0 372px', display: 'flex', gap: 26, minHeight: mobile ? 300 : 'auto' }}>
          {/* draggable thermometer */}
          <div ref={trackRef} onPointerDown={onDown} onPointerMove={onMove}
               style={{ position: 'relative', width: 150, cursor: 'ns-resize', touchAction: 'none', flex: '0 0 auto' }}>
            <div style={{ position: 'absolute', left: 70, top: 0, bottom: 0, width: 22, borderRadius: 11,
              background: 'rgba(120,150,180,0.1)', border: '1px solid rgba(150,180,210,0.35)', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${clamp(tempFrac, 0, 1) * 100}%`,
                background: 'linear-gradient(to top,#4f93c7,#8fb56b 45%,#efab54 72%,#e5703b)' }} />
            </div>

            {/* equilibrium critical temperatures — LEFT of the tube */}
            <div style={{ position: 'absolute', left: 4, right: 82, bottom: `calc(${pct(A1)}% - 1px)`, borderTop: '1px dashed rgba(190,210,230,0.55)' }}>
              <span style={{ position: 'absolute', left: 0, top: -18, fontFamily: mono, fontSize: 13, color: '#aebfcf', whiteSpace: 'nowrap' }}>A₁ 727</span>
            </div>
            <div style={{ position: 'absolute', left: 4, right: 82, bottom: `calc(${pct(ucClamped)}% - 1px)`, borderTop: '1px dashed rgba(240,190,130,0.7)' }}>
              <span style={{ position: 'absolute', left: 0, top: -18, fontFamily: mono, fontSize: 13, color: '#efc089', whiteSpace: 'nowrap' }}>{ucLabel} {Math.round(UC)}</span>
            </div>
            {/* 0 °C reference — LEFT */}
            <div style={{ position: 'absolute', left: 4, right: 82, bottom: `calc(${pct(0)}% - 1px)`, borderTop: '2px solid rgba(120,200,255,0.9)' }}>
              <span style={{ position: 'absolute', left: 0, top: -18, fontFamily: mono, fontSize: 13, fontWeight: 600, color: '#7fd4ff', whiteSpace: 'nowrap' }}>0 °C</span>
            </div>

            {/* transformation product temperatures — RIGHT of the tube */}
            {cool && (
              <React.Fragment>
                <div style={{ position: 'absolute', left: 92, right: 4, bottom: `calc(${pct(prodStartClamped)}% - 1px)`, borderTop: '1px dashed rgba(198,202,242,0.8)' }}>
                  <span style={{ position: 'absolute', right: 0, top: -18, fontFamily: mono, fontSize: 13, color: '#c6caf2', whiteSpace: 'nowrap' }}>{product.startLabel} {Math.round(product.start)}</span>
                </div>
                <div style={{ position: 'absolute', left: 92, right: 4, bottom: `calc(${pct(prodFinishClamped)}% - 1px)`, borderTop: '1px dashed rgba(198,202,242,0.55)' }}>
                  <span style={{ position: 'absolute', right: 0, top: -18, fontFamily: mono, fontSize: 13, color: '#a9adde', whiteSpace: 'nowrap' }}>{product.finishLabel} {Math.round(product.finish)}</span>
                </div>
              </React.Fragment>
            )}

            <div style={{ position: 'absolute', left: 64, width: 34, bottom: `calc(${clamp(tempFrac, 0, 1) * 100}% - 8px)`, height: 16 }}>
              <div style={{ height: 16, borderRadius: 8, background: '#eaf2fa', boxShadow: '0 0 0 3px rgba(95,192,239,0.35)', transformBox: 'fill-box', transformOrigin: 'center', animation: 'pulseHandle 1.7s ease-in-out infinite' }} />
            </div>
          </div>

          {/* readouts */}
          <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: 15, paddingTop: 4 }}>
            <div>
              <div style={{ fontFamily: mono, fontSize: 13, letterSpacing: '0.2em', color: '#7fb4d6', textTransform: 'uppercase' }}>Teplota</div>
              <div style={{ fontSize: 44, fontWeight: 600, fontFamily: mono, lineHeight: 1.05, marginTop: 2 }}>{T}<span style={{ fontSize: 23, color: '#aebfcf' }}> °C</span></div>
            </div>

            <div>
              <div style={{ fontFamily: mono, fontSize: 13, letterSpacing: '0.2em', color: '#7fb4d6', textTransform: 'uppercase', marginBottom: 7 }}>{barLabel}</div>
              <div style={{ height: 12, borderRadius: 6, background: 'rgba(120,150,180,0.12)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${barPct}%`, borderRadius: 6, background: barGrad, transition: 'width .12s' }} />
              </div>
              <div style={{ fontFamily: mono, fontSize: 20, marginTop: 6 }}>{barPct}<span style={{ color: '#aebfcf', fontSize: 15 }}> %</span></div>
            </div>

            <div style={{ padding: '13px 16px', borderRadius: 12, background: 'rgba(120,180,230,0.05)',
              border: '1px solid rgba(120,180,230,0.16)' }}>
              <div style={{ fontSize: 19, fontWeight: 600 }}>{phase}</div>
              <div style={{ fontSize: 13.5, color: '#aebfcf', marginTop: 4, lineHeight: 1.4 }}>{phaseNote}</div>
            </div>

            <div style={{ fontFamily: mono, fontSize: 12.5, color: '#8296a8', lineHeight: 1.5 }}>
            </div>
          </div>
        </div>
      </div>

      {/* bottom sliders */}
      <div style={{ position: 'relative', flex: '0 0 auto', marginTop: 10, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', alignItems: mobile ? 'stretch' : 'center', gap: mobile ? 6 : 18 }}>
          <div style={{ flex: mobile ? '0 0 auto' : '0 0 150px', fontFamily: mono, fontSize: 14, color: '#aebfcf' }}>Uhlík
            <span style={{ color: '#eaf2fa', fontSize: 17, marginLeft: 8 }}>{C.toFixed(2)} %</span>
          </div>
          <div style={{ flex: '1 1 auto', position: 'relative', height: 16, display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, height: 6, borderRadius: 3, background: 'rgba(120,180,230,0.18)' }} />
            <div style={{ position: 'absolute', left: 0, height: 6, borderRadius: 3, width: `${((C - C_MIN) / (C_MAX - C_MIN)) * 100}%`, background: '#5fc0ef' }} />
            <div style={{ position: 'absolute', left: `${((C_EUT - C_MIN) / (C_MAX - C_MIN)) * 100}%`, top: '50%',
              width: 3, height: 14, borderRadius: 2, background: '#5fc0ef', boxShadow: '0 0 0 3px rgba(95,192,239,0.25)',
              transform: 'translate(-50%, -50%)', pointerEvents: 'none', animation: 'pulseHandle 1.7s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', left: `${((C - C_MIN) / (C_MAX - C_MIN)) * 100}%`, top: '50%', width: 16, height: 16, borderRadius: '50%',
              background: '#5fc0ef', border: '2px solid #0b0e15', transform: 'translate(-50%, -50%)', pointerEvents: 'none',
              animation: 'pulseThumb 1.7s ease-in-out infinite' }} />
            <input type="range" min={C_MIN} max={C_MAX} value={C} step={0.01}
                   onChange={(e) => { const v = Number(e.target.value); setC(Math.abs(v - C_EUT) < 0.015 ? C_EUT : v); }}
                   style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', margin: 0, opacity: 0, cursor: 'pointer' }} />
          </div>
          <div style={{ flex: mobile ? '0 0 auto' : '0 0 178px', textAlign: mobile ? 'left' : 'right', fontFamily: mono, fontSize: 13.5,
            color: hyper ? '#efc089' : regime === 'eutektoidní' ? '#cdd8e2' : '#7fb4d6' }}>{cool ? `Ms ${Ms} °C` : regime}</div>
        </div>

        {cool && (
          <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', alignItems: mobile ? 'stretch' : 'center', gap: mobile ? 6 : 18 }}>
            <div style={{ flex: mobile ? '0 0 auto' : '0 0 150px', fontFamily: mono, fontSize: 14, color: '#aebfcf' }}>Způsob chlazení</div>
            <div style={{ flex: '1 1 auto', display: 'flex', gap: 8 }}>
              {[['pomala', 'Pomalé', '#4f7fb0'], ['IRA', 'izotermické kalení', '#3fbfa8'], ['ARA', 'kalení na martenzit', '#b9bdf0']].map(([k, lab, col]) => (
                <button key={k} onClick={() => setCoolKind(k)} style={{
                  flex: '1 1 0', padding: '11px 10px', borderRadius: 10, cursor: 'pointer',
                  fontFamily: mono, fontSize: 14, letterSpacing: '0.03em',
                  border: coolKind === k ? `1px solid ${col}` : '1px solid rgba(150,180,210,0.2)',
                  background: coolKind === k ? col : 'rgba(120,150,180,0.08)',
                  color: coolKind === k ? '#0b0e15' : '#aebfcf', fontWeight: coolKind === k ? 600 : 400,
                  transition: 'background .15s', animation: 'pulseBtn 1.8s ease-in-out infinite' }}>{lab}</button>
              ))}
            </div>
            <div style={{ flex: mobile ? '0 0 auto' : '0 0 178px', textAlign: mobile ? 'left' : 'right', fontFamily: mono, fontSize: 13.5, fontWeight: 600,
              color: product.key === 'martenzit' ? '#c6caf2' : product.key === 'bainit' ? '#7fe0cc' : '#8fb9e6' }}>→ {product.name.toLowerCase()}</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', alignItems: mobile ? 'stretch' : 'center', gap: mobile ? 6 : 18 }}>
          <div style={{ flex: mobile ? '0 0 auto' : '0 0 150px', fontFamily: mono, fontSize: 14, color: '#aebfcf' }}>Teplota
            <span style={{ color: '#eaf2fa', fontSize: 17, marginLeft: 8 }}>{T} °C</span>
          </div>
          <div style={{ flex: '1 1 auto', position: 'relative', height: 16, display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, height: 6, borderRadius: 3, background: 'rgba(120,180,230,0.18)' }} />
            <div style={{ position: 'absolute', left: 0, height: 6, borderRadius: 3, width: `${((T - T_MIN) / (T_MAX - T_MIN)) * 100}%`, background: '#efab54' }} />
            <div style={{ position: 'absolute', left: `${((T - T_MIN) / (T_MAX - T_MIN)) * 100}%`, top: '50%', width: 16, height: 16, borderRadius: '50%',
              background: '#efab54', border: '2px solid #0b0e15', transform: 'translate(-50%, -50%)', pointerEvents: 'none',
              animation: 'pulseThumb 1.7s ease-in-out infinite' }} />
            <input type="range" min={T_MIN} max={T_MAX} value={T} step={1}
                   onChange={(e) => { stop(); setT(Number(e.target.value)); }}
                   style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', margin: 0, opacity: 0, cursor: 'pointer' }} />
          </div>
          <button onClick={togglePlay} style={{
            flex: mobile ? '0 0 auto' : '0 0 178px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
            padding: mobile ? '13px 14px' : '11px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: mono, fontSize: 14, fontWeight: 600,
            border: 'none', color: '#0b0e15', letterSpacing: '0.03em', animation: 'pulseBtn 1.8s ease-in-out infinite',
            background: playing ? '#e5703b' : (cool ? '#b9bdf0' : '#efab54') }}>
            {playing
              ? (<React.Fragment><svg width="12" height="13" viewBox="0 0 12 13"><rect x="1" y="1" width="3.4" height="11" fill="#0b0e15" /><rect x="7.6" y="1" width="3.4" height="11" fill="#0b0e15" /></svg>Pauza</React.Fragment>)
              : (<React.Fragment><svg width="12" height="13" viewBox="0 0 12 13"><path d="M1 1 L11 6.5 L1 12 Z" fill="#0b0e15" /></svg>Přehrát</React.Fragment>)}
          </button>
        </div>
      </div>
    </div>
  );
}

window.AustenitizaceInteraktivni = AustenitizaceInteraktivni;
