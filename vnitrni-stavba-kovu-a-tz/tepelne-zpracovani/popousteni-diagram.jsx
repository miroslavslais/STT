// popousteni-diagram.jsx — Popouštěcí diagram (popouštění po kalení): teplota popouštění × tvrdost,
// přechod martenzit → popuštěný martenzit → sorbit. Stejný vizuální jazyk jako ARA/IRA diagram.
const { useState, useRef, useEffect } = React;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sans = "'IBM Plex Sans', system-ui, sans-serif";
const mono = "'IBM Plex Mono', ui-monospace, monospace";

// ── deterministic RNG (same recipe as the ARA/IRA diagrams) ─────────────────
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260712);

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
    CELLS.push({ pts, cx: cxp, cy: cyp, rank: rnd(), rank2: rnd(), texAng: rnd() * Math.PI });
  }
}
const cellPath = (c) => 'M' + c.pts.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' L') + ' Z';

// per-cell globular-carbide dots (precomputed; revealed as tempering progresses)
const CELL_DOTS = CELLS.map((c) => {
  const dots = [];
  const n = 13;
  for (let d = 0; d < n; d++) {
    // random point as a convex mix of the 4 corners → always inside the quad
    let w = [rnd(), rnd(), rnd(), rnd()];
    const sum = w[0] + w[1] + w[2] + w[3];
    w = w.map((x) => x / sum);
    const x = w[0] * c.pts[0][0] + w[1] * c.pts[1][0] + w[2] * c.pts[2][0] + w[3] * c.pts[3][0];
    const y = w[0] * c.pts[0][1] + w[1] * c.pts[1][1] + w[2] * c.pts[2][1] + w[3] * c.pts[3][1];
    dots.push({ x, y, r: 2.2 + rnd() * 2.6, order: rnd() });
  }
  return dots;
});

// martensite needle texture (same family as the ARA "needle" texture)
function needleLines(c, kp, opacity) {
  const lines = [];
  [-1, 1].forEach((sgn, fi) => {
    const ang = c.texAng + sgn * 0.62, dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
    for (let k = -70; k <= 70; k += 12) {
      const mx = c.cx + nx * k, my = c.cy + ny * k;
      lines.push(<line key={kp + fi + '_' + k} x1={mx - dx * 62} y1={my - dy * 62} x2={mx + dx * 62} y2={my + dy * 62}
        stroke={`rgba(198,202,242,${(0.75 * opacity).toFixed(3)})`} strokeWidth={1.6} strokeDasharray="4 10" />);
    }
  });
  return lines;
}

const MART = [122, 120, 185, 0.68];   // martenzit (jako v ARA)
const SORB = [120, 180, 232, 0.5];    // sorbit — feritická matrice (jako ferit v ARA)
const lerpC = (a, b, t) => [0, 1, 2, 3].map((i) => a[i] + (b[i] - a[i]) * t);
const rgba = (c) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${c[3].toFixed(3)})`;

// ── model ───────────────────────────────────────────────────────────────────
const T_MIN = 20, T_MAX = 650;
const T_BOUNDARY = 400; // hranice nízko/vysokoteplotního popouštění
// pásmo nízké popouštěcí křehkosti (propad houževnatosti)
const BRIT_MIN = 250, BRIT_MAX = 400, BRIT_PEAK = 300;

function hrc0(C) { return clamp(20 + 58 * Math.sqrt(C), 20, 67); } // tvrdost martenzitu po zakalení
function hrcMin(C) { return 17 + 10 * C; }                          // sorbit při ~700 °C
function hardnessAt(T, C) {
  const p = clamp((T - 100) / (680 - 100), 0, 1);
  return hrc0(C) - (hrc0(C) - hrcMin(C)) * Math.pow(p, 1.35);
}

// mikrostruktura: 0 = čistý martenzit … 1 = sorbit
const structProg = (T) => clamp((T - 130) / (650 - 130), 0, 1);

function PopousteniDiagram() {
  const [C, setC] = useState(0.6);
  const [Tt, setTt] = useState(20); // teplota popouštění
  const [playing, setPlaying] = useState(false);
  const TtRef = useRef(20);
  TtRef.current = Tt;
  const plotRef = useRef(null);
  const [vw, setVw] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => { const onR = () => setVw(window.innerWidth); window.addEventListener('resize', onR); return () => window.removeEventListener('resize', onR); }, []);
  const mobile = vw < 860;

  // ── plot geometry ──
  const PW = 760, PH = 560, PAD_L = 78, PAD_R = 72, PAD_T = 26, PAD_B = 46;
  const plotW = PW - PAD_L - PAD_R, plotH = PH - PAD_T - PAD_B;
  const H_TOP = 70, H_BOT = 0;
  const K_TOP = 140, K_BOT = 0; // houževnatost [J·cm⁻²], vedlejší osa
  const xOf = (T) => PAD_L + ((clamp(T, T_MIN, T_MAX) - T_MIN) / (T_MAX - T_MIN)) * plotW;
  const yOf = (H) => PAD_T + ((H_TOP - clamp(H, H_BOT, H_TOP)) / (H_TOP - H_BOT)) * plotH;
  const yKOf = (K) => PAD_T + ((K_TOP - clamp(K, K_BOT, K_TOP)) / (K_TOP - K_BOT)) * plotH;

  const curvePts = [];
  for (let i = 0; i <= 120; i++) { const T = T_MIN + ((T_MAX - T_MIN) * i) / 120; curvePts.push([T, hardnessAt(T, C)]); }
  const curvePath = 'M' + curvePts.map(([T, H]) => `${xOf(T).toFixed(1)},${yOf(H).toFixed(1)}`).join(' L');
  const areaPath = curvePath + ` L${xOf(T_MAX).toFixed(1)},${(PAD_T + plotH).toFixed(1)} L${xOf(T_MIN).toFixed(1)},${(PAD_T + plotH).toFixed(1)} Z`;

  // houževnatost: nízká u martenzitu, roste hlavně nad hranicí vysokoteplotního popouštění
  // …ale v pásmu nízké popouštěcí křehkosti (~250–400 °C) do ní zasahuje hladký gaussovský propad
  const toughAt = (T) => {
    const p = clamp((T - T_MIN) / (T_MAX - T_MIN), 0, 1);
    const base = 12 + 114 * Math.pow(p, 2.2);
    const dip = 1 - 0.5 * Math.exp(-Math.pow((clamp(T, T_MIN, T_MAX) - BRIT_PEAK) / 50, 2));
    return base * dip * (1.15 - 0.4 * C);
  };
  const toughEnd = playing ? Tt : T_MAX; // při přehrávání se křivka vykresluje postupně
  const toughPts = [];
  for (let i = 0; i <= 120; i++) {
    const T = T_MIN + ((T_MAX - T_MIN) * i) / 120;
    if (T > toughEnd) break;
    toughPts.push([T, toughAt(T)]);
  }
  const toughPath = toughPts.length > 1 ? 'M' + toughPts.map(([T, K]) => `${xOf(T).toFixed(1)},${yKOf(K).toFixed(1)}`).join(' L') : '';

  const H = hardnessAt(Tt, C);
  const g = structProg(Tt);

  // ── struktura + popis ──
  let structName, structColor, note;
  const inBrittle = Tt >= BRIT_MIN && Tt <= BRIT_MAX;
  const britNote = ' Pozor: v tomto pásmu klesá houževnatost — popouštěcí křehkost. Tyto teploty se v praxi vynechávají.';
  if (Tt < 130) {
    structName = 'Martenzit (zakaleno)'; structColor = '#c6caf2';
    note = 'Popouštění zatím jen uvolňuje vnitřní pnutí — jehlicová struktura i tvrdost zůstávají.';
  } else if (Tt < T_BOUNDARY) {
    structName = 'Popuštěný martenzit'; structColor = '#c6caf2';
    note = `Nízkoteplotní popouštění (${Math.round(Tt)} °C): z martenzitu se vylučují jemné karbidy, klesá pnutí a křehkost, tvrdost zůstává vysoká.`;
    if (inBrittle) note += britNote;
  } else {
    structName = 'Sorbit'; structColor = '#8fb9e6';
    note = `Vysokoteplotní popouštění (${Math.round(Tt)} °C): jehlice mizí, vzniká feritická matrice s globulárním cementitem — houževnatá struktura (zušlechťování).`;
    if (inBrittle) note += britNote;
  }

  // ── mikrostruktura: per-cell staggered progress ──
  const spread = 0.35;
  const cellProg = CELLS.map((c) => clamp((g - c.rank2 * spread) / Math.max(0.05, 1 - c.rank2 * spread), 0, 1));

  const legendItems = [
    ['martenzit', 'repeating-linear-gradient(45deg,#7a78b8,#7a78b8 2px,#c6caf2 2px,#c6caf2 4px)'],
    ['popuštěný martenzit', 'repeating-linear-gradient(45deg,#8a88c0,#8a88c0 3px,#a9b4d8 3px,#a9b4d8 6px)'],
    ['sorbit (ferit + glob. cementit)', 'radial-gradient(circle at 30% 40%, #24425f 0 2px, rgba(120,180,232,0.6) 2.5px)'],
  ];

  const setFromClientX = (clientX) => {
    const el = plotRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const scale = PW / r.width;
    const xLocal = (clientX - r.left) * scale;
    setTt(clamp(T_MIN + ((xLocal - PAD_L) / plotW) * (T_MAX - T_MIN), T_MIN, T_MAX));
  };
  const onMarkerDown = (e) => { e.stopPropagation(); setPlaying(false); setGhostT(null); e.currentTarget.setPointerCapture(e.pointerId); setFromClientX(e.clientX); };
  const onMarkerMove = (e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) setFromClientX(e.clientX); };

  // auto-play: sweep 20 → 700 °C
  const SWEEP_MS = 9000;
  useEffect(() => {
    if (!playing) return;
    let raf, last = performance.now();
    const rate = (T_MAX - T_MIN) / SWEEP_MS;
    const step = (now) => {
      const dt = now - last; last = now;
      let nv = TtRef.current + rate * dt;
      let done = false;
      const target = playTargetRef.current;
      if (nv >= target) { nv = target; done = true; }
      TtRef.current = nv; setTt(nv);
      if (done) { setPlaying(false); setGhostT(null); return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
  const playTargetRef = useRef(T_MAX);
  const [ghostT, setGhostT] = useState(null);
  const [toughShown, setToughShown] = useState(false);
  const togglePlay = () => {
    if (playing) { setPlaying(false); setGhostT(null); return; }
    // přehraje od začátku do aktuálně nastavené teploty; je-li marker na začátku, jede až do konce
    playTargetRef.current = TtRef.current > T_MIN + 5 ? TtRef.current : T_MAX;
    setGhostT(playTargetRef.current);
    setToughShown(true);
    TtRef.current = T_MIN; setTt(T_MIN);
    setPlaying(true);
  };

  const zoneLabel = Tt < T_BOUNDARY ? 'nízkoteplotní popouštění' : 'vysokoteplotní popouštění';

  return (
    <div style={{ width: '100%', height: mobile ? 'auto' : '100vh', minHeight: '100vh', background: '#080b12', color: '#eaf2fa', boxSizing: 'border-box',
      padding: mobile ? '40px 14px 20px' : '58px 52px 20px', display: 'flex', flexDirection: 'column', fontFamily: sans, position: 'relative', overflow: mobile ? 'visible' : 'hidden' }}>

      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(120% 90% at 42% 44%, rgba(30,52,80,0.45) 0%, rgba(9,13,20,0) 62%)' }} />

      {/* header */}
      <div style={{ position: 'relative', flex: '0 0 auto' }}>
        <div style={{ fontFamily: mono, fontSize: mobile ? 13 : 16, letterSpacing: '0.24em', color: '#5fc0ef', textTransform: 'uppercase' }}>Tepelné zpracování oceli · Popouštěcí diagram</div>
        <div style={{ fontSize: mobile ? 24 : 32, fontWeight: 600, marginTop: 6, letterSpacing: '-0.01em' }}>Popouštění po kalení</div>
      </div>

      {/* legend */}
      <div style={{ position: 'relative', flex: '0 0 auto', marginTop: 8, display: 'flex', gap: 24, flexWrap: 'wrap', fontFamily: mono, fontSize: 14.5, color: '#aebfcf' }}>
        {legendItems.map(([lab, bg]) => (
          <span key={lab} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ width: 14, height: 14, borderRadius: 3, background: bg }} />
            {lab}
          </span>
        ))}
      </div>

      {/* main */}
      <div style={{ position: 'relative', flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: mobile ? 'column' : 'row', gap: mobile ? 20 : 32, marginTop: 10 }}>

        {/* plot */}
        <div style={{ flex: mobile ? '0 0 auto' : '1 1 auto', minWidth: 0, minHeight: mobile ? 320 : 0, display: 'flex', borderRadius: 16, border: '1px solid rgba(120,180,230,0.14)', background: 'rgba(120,180,230,0.03)', padding: 10, boxSizing: 'border-box' }}>
          <svg ref={plotRef} viewBox={`0 0 ${PW} ${PH}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: mobile ? 'auto' : '100%', display: 'block' }}>
            {/* zone tints: nízko / vysokoteplotní popouštění */}
            <rect x={PAD_L} y={PAD_T} width={xOf(T_BOUNDARY) - PAD_L} height={plotH} fill="rgba(122,120,185,0.07)" />
            <rect x={xOf(T_BOUNDARY)} y={PAD_T} width={PAD_L + plotW - xOf(T_BOUNDARY)} height={plotH} fill="rgba(120,180,232,0.06)" />

            {/* pásmo popouštěcí křehkosti */}
            <defs>
              <pattern id="britHatch" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(224,123,168,0.45)" strokeWidth="1.6" />
              </pattern>
            </defs>
            <rect x={xOf(BRIT_MIN)} y={PAD_T} width={xOf(BRIT_MAX) - xOf(BRIT_MIN)} height={plotH} fill="url(#britHatch)" />
            <line x1={xOf(BRIT_MIN)} y1={PAD_T} x2={xOf(BRIT_MIN)} y2={PAD_T + plotH} stroke="rgba(224,123,168,0.5)" strokeWidth={1.2} />
            <text x={xOf(BRIT_PEAK) + 4} y={PAD_T + plotH - 14} fontFamily={mono} fontSize={12.5} fontWeight={700} fill="#e07ba8" textAnchor="start"
                  transform={`rotate(-90 ${(xOf(BRIT_PEAK) + 4).toFixed(1)} ${(PAD_T + plotH - 14).toFixed(1)})`}>popouštěcí křehkost</text>

            {/* grid */}
            {[100, 200, 300, 400, 500, 600].map((T) => (
              <g key={'gx' + T}>
                <line x1={xOf(T)} y1={PAD_T} x2={xOf(T)} y2={PAD_T + plotH} stroke="rgba(150,180,210,0.1)" strokeWidth={1} />
                <text x={xOf(T)} y={PAD_T + plotH + 20} fontFamily={mono} fontSize={12} fill="#7d8ea0" textAnchor="middle">{T}</text>
              </g>
            ))}
            <text x={PAD_L + plotW / 2} y={PH - 4} fontFamily={mono} fontSize={12.5} fill="#aebfcf" textAnchor="middle">teplota popouštění [°C]</text>
            {[0, 10, 20, 30, 40, 50, 60, 70].map((Hv) => (
              <g key={'gy' + Hv}>
                <line x1={PAD_L} y1={yOf(Hv)} x2={PAD_L + plotW} y2={yOf(Hv)} stroke="rgba(150,180,210,0.08)" strokeWidth={1} />
                <text x={PAD_L - 10} y={yOf(Hv) + 4} fontFamily={mono} fontSize={12} fill="#7d8ea0" textAnchor="end">{Hv}</text>
              </g>
            ))}
            <text x={16} y={PAD_T + plotH / 2} fontFamily={mono} fontSize={12.5} fill="#e5703b" textAnchor="middle" transform={`rotate(-90 16 ${PAD_T + plotH / 2})`}>tvrdost [HRC]</text>

            {/* vedlejší osa: houževnatost */}
            {[0, 20, 40, 60, 80, 100, 120, 140].map((Kv) => (
              <text key={'ky' + Kv} x={PAD_L + plotW + 10} y={yKOf(Kv) + 4} fontFamily={mono} fontSize={12} fill={toughShown ? '#6fbf8a' : '#44534a'} textAnchor="start">{Kv}</text>
            ))}
            <text x={PW - 14} y={PAD_T + plotH / 2} fontFamily={mono} fontSize={12.5} fill={toughShown ? '#6fbf8a' : '#44534a'} textAnchor="middle" transform={`rotate(-90 ${PW - 14} ${PAD_T + plotH / 2})`}>houževnatost KCU [J·cm⁻²]</text>

            {/* hranice nízko / vysokoteplotního popouštění */}
            <line x1={xOf(T_BOUNDARY)} y1={PAD_T} x2={xOf(T_BOUNDARY)} y2={PAD_T + plotH} stroke="rgba(244,197,66,0.55)" strokeDasharray="6 6" strokeWidth={1.6} />
            <text x={xOf(T_BOUNDARY) - 8} y={PAD_T + 16} fontFamily={mono} fontSize={12.5} fontWeight={700} fill="#c6caf2" textAnchor="end">nízkoteplotní</text>
            <text x={xOf(T_BOUNDARY) - 8} y={PAD_T + 32} fontFamily={mono} fontSize={12.5} fontWeight={700} fill="#c6caf2" textAnchor="end">popouštění (do ~400 °C)</text>
            <text x={xOf(T_BOUNDARY) + 8} y={PAD_T + 16} fontFamily={mono} fontSize={12.5} fontWeight={700} fill="#8fb9e6">vysokoteplotní</text>
            <text x={xOf(T_BOUNDARY) + 8} y={PAD_T + 32} fontFamily={mono} fontSize={12.5} fontWeight={700} fill="#8fb9e6">popouštění (zušlechťování)</text>

            {/* hardness curve */}
            <path d={areaPath} fill="rgba(229,112,59,0.08)" />
            <path d={curvePath} fill="none" stroke="#e5703b" strokeWidth={2.8} strokeLinecap="round" />

            {/* toughness curve — objeví se až po stisknutí Přehrát */}
            {toughShown && toughPath && (
              <path d={toughPath} fill="none" stroke="#6fbf8a" strokeWidth={2.6} strokeLinecap="round" strokeDasharray="7 5" />
            )}

            {/* structure labels along the curve */}
            <text x={xOf(80)} y={yOf(hardnessAt(80, C)) - 14} fontFamily={mono} fontSize={13} fill="#c6caf2">martenzit</text>
            <text x={xOf(255)} y={yOf(hardnessAt(255, C)) - 14} fontFamily={mono} fontSize={13} fill="#c6caf2" textAnchor="middle">popuštěný martenzit</text>
            <text x={xOf(570)} y={yOf(hardnessAt(570, C)) - 16} fontFamily={mono} fontSize={13} fill="#8fb9e6" textAnchor="middle">sorbit</text>

            {/* drop lines from the marker (skryté během pac-man jízdy) */}
            {!playing && (<React.Fragment>
            <line x1={xOf(Tt)} y1={yOf(H)} x2={xOf(Tt)} y2={PAD_T + plotH} stroke="rgba(244,197,66,0.35)" strokeDasharray="3 4" strokeWidth={1.2} />
            <line x1={PAD_L} y1={yOf(H)} x2={xOf(Tt)} y2={yOf(H)} stroke="rgba(244,197,66,0.35)" strokeDasharray="3 4" strokeWidth={1.2} />
            </React.Fragment>)}

            {/* 🥚 easter egg: duch zůstává na původním místě, žlutá tečka jede jako Pac-Man */}
            {playing && ghostT != null && (() => {
              const gx = xOf(ghostT), gy = yOf(hardnessAt(ghostT, C));
              return (
                <g transform={`translate(${gx.toFixed(1)},${gy.toFixed(1)})`}>
                  <path d="M-9,5 L-9,-1 A9,9 0 0 1 9,-1 L9,5 L6,2.6 L3,5 L0,2.6 L-3,5 L-6,2.6 Z" fill="#ff5d5d" stroke="#0b0e15" strokeWidth={1.2} />
                  <circle cx={-3.2} cy={-2} r={2.4} fill="#fff" />
                  <circle cx={3.2} cy={-2} r={2.4} fill="#fff" />
                  <circle cx={-4.1} cy={-2} r={1.2} fill="#22335c" />
                  <circle cx={2.3} cy={-2} r={1.2} fill="#22335c" />
                </g>
              );
            })()}

            {/* yellow draggable marker / Pac-Man during play */}
            {playing ? (() => {
              const r = 12;
              const open = Math.floor(Tt / 24) % 2 === 0; // střídání dvou snímků: plný kruh / kruh s výsečí
              return (
                <g transform={`translate(${xOf(Tt).toFixed(1)},${yOf(H).toFixed(1)})`}>
                  <defs>
                    <mask id="pacMouthMask">
                      <rect x={-14} y={-14} width={28} height={28} fill="#fff" />
                      <path d="M0,0 L16,-11 L16,11 Z" fill="#000" />
                    </mask>
                  </defs>
                  <circle cx={0} cy={0} r={r} fill="#f4c542" mask={open ? 'url(#pacMouthMask)' : undefined} />
                  <circle cx={2.4} cy={-6.4} r={1.8} fill="#0b0e15" />
                </g>
              );
            })() : (
              <g onPointerDown={onMarkerDown} onPointerMove={onMarkerMove} style={{ cursor: 'ew-resize', touchAction: 'none' }}>
                <circle cx={xOf(Tt)} cy={yOf(H)} r={14} fill="transparent" />
                <circle cx={xOf(Tt)} cy={yOf(H)} r={7.5} fill="#f4c542" stroke="#0b0e15" strokeWidth={2} style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'pulseDot 1.7s ease-in-out infinite' }} />
              </g>
            )}
          </svg>
        </div>

        {/* result panel */}
        <div style={{ flex: mobile ? '0 0 auto' : '0 0 300px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ borderRadius: 16, border: '1px solid rgba(120,180,230,0.14)', background: 'rgba(120,180,230,0.03)', aspectRatio: '600/500', position: 'relative', overflow: 'hidden' }}>
            <svg viewBox="0 0 600 500" style={{ width: '100%', height: '100%', display: 'block' }}>
              {CELLS.map((c, idx) => {
                const p = cellProg[idx];
                const base = lerpC(MART, SORB, p);
                return (
                  <g key={'cell' + idx} clipPath={`url(#pclip${idx})`}>
                    <path d={cellPath(c)} fill={rgba(base)} />
                    {p < 0.97 && needleLines(c, 'nl' + idx, 1 - p)}
                    {CELL_DOTS[idx].map((d, di) => d.order < p && (
                      <circle key={'d' + di} cx={d.x} cy={d.y} r={d.r * (0.5 + 0.5 * p)} fill="#24425f" stroke="rgba(150,196,236,0.5)" strokeWidth={0.8} />
                    ))}
                  </g>
                );
              })}
              <defs>
                {CELLS.map((c, idx) => <clipPath key={'cp' + idx} id={`pclip${idx}`}><path d={cellPath(c)} /></clipPath>)}
              </defs>
              {CELLS.map((c, idx) => <path key={'b' + idx} d={cellPath(c)} fill="none" stroke="rgba(160,190,220,0.35)" strokeWidth={1.4} strokeLinejoin="round" />)}
            </svg>
          </div>

          <div style={{ padding: '13px 16px', borderRadius: 12, background: 'rgba(120,180,230,0.05)', border: '1px solid rgba(120,180,230,0.16)', minHeight: 128, boxSizing: 'border-box' }}>
            <div style={{ fontFamily: mono, fontSize: 12, letterSpacing: '0.18em', color: '#7fb4d6', textTransform: 'uppercase' }}>Struktura v bodě</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4, lineHeight: 1.3, color: structColor }}>{structName}</div>
            <div style={{ fontSize: 13.5, color: '#aebfcf', marginTop: 4, lineHeight: 1.4 }}>{note}</div>
          </div>

          <div style={{ fontFamily: mono, fontSize: 12.5, color: '#8296a8', lineHeight: 1.7 }}>
            <div>{C.toFixed(2)} % C · po zakalení {Math.round(hrc0(C))} HRC</div>
            <div>popouštění {Math.round(Tt)} °C</div>
            <div style={{ color: '#e5703b', fontWeight: 600 }}>tvrdost ≈ {Math.round(H)} HRC</div>
            <div style={{ color: '#6fbf8a', fontWeight: 600 }}>houževnatost ≈ {Math.round(toughAt(Tt))} J·cm⁻²</div>
            <div>{zoneLabel}</div>
          </div>
        </div>
      </div>

      {/* bottom sliders */}
      <div style={{ position: 'relative', flex: '0 0 auto', marginTop: 10, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', alignItems: mobile ? 'stretch' : 'center', gap: mobile ? 6 : 18 }}>
          <div style={{ flex: mobile ? '0 0 auto' : '0 0 235px', whiteSpace: 'nowrap', fontFamily: mono, fontSize: 14, color: '#aebfcf' }}>Obsah uhlíku
            <span style={{ color: '#eaf2fa', fontSize: 17, marginLeft: 8 }}>{C.toFixed(2)} %</span>
          </div>
          <div style={{ flex: '1 1 auto', position: 'relative', height: 16, display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, height: 6, borderRadius: 3, background: 'rgba(120,180,230,0.18)' }} />
            <div style={{ position: 'absolute', left: 0, height: 6, borderRadius: 3, width: `${((C - 0.3) / (0.9 - 0.3)) * 100}%`, background: '#5fc0ef' }} />
            <div style={{ position: 'absolute', left: `${((C - 0.3) / (0.9 - 0.3)) * 100}%`, top: '50%', width: 16, height: 16, borderRadius: '50%',
              background: '#5fc0ef', border: '2px solid #0b0e15', transform: 'translate(-50%, -50%)', pointerEvents: 'none',
              animation: 'pulseThumb 1.7s ease-in-out infinite' }} />
            <input type="range" min={0.3} max={0.9} value={C} step={0.01}
                   onChange={(e) => setC(Number(e.target.value))}
                   style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', margin: 0, opacity: 0, cursor: 'pointer' }} />
          </div>
          <div style={{ flex: mobile ? '0 0 auto' : '0 0 178px', textAlign: mobile ? 'left' : 'right', fontFamily: mono, fontSize: 13.5, color: '#7fb4d6' }}>po zakalení {Math.round(hrc0(C))} HRC</div>
        </div>

        <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', alignItems: mobile ? 'stretch' : 'center', gap: mobile ? 6 : 18 }}>
          <div style={{ flex: mobile ? '0 0 auto' : '0 0 235px', whiteSpace: 'nowrap', fontFamily: mono, fontSize: 14, color: '#aebfcf' }}>Teplota popouštění
            <span style={{ color: '#eaf2fa', fontSize: 17, marginLeft: 8 }}>{Math.round(Tt)} °C</span>
          </div>
          <div style={{ flex: '1 1 auto', position: 'relative', height: 16, display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, height: 6, borderRadius: 3, background: 'rgba(120,180,230,0.18)' }} />
            <div style={{ position: 'absolute', left: 0, height: 6, borderRadius: 3, width: `${((Tt - T_MIN) / (T_MAX - T_MIN)) * 100}%`, background: '#e5703b' }} />
            <div style={{ position: 'absolute', left: `${((T_BOUNDARY - T_MIN) / (T_MAX - T_MIN)) * 100}%`, top: '50%',
              width: 3, height: 14, borderRadius: 2, background: '#f4c542', boxShadow: '0 0 0 3px rgba(244,197,66,0.25)',
              transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', left: `${((Tt - T_MIN) / (T_MAX - T_MIN)) * 100}%`, top: '50%', width: 16, height: 16, borderRadius: '50%',
              background: '#e5703b', border: '2px solid #0b0e15', transform: 'translate(-50%, -50%)', pointerEvents: 'none',
              animation: 'pulseThumb 1.7s ease-in-out infinite' }} />
            <input type="range" min={T_MIN} max={T_MAX} value={Tt} step={1}
                   onChange={(e) => { setPlaying(false); setGhostT(null); setTt(Number(e.target.value)); }}
                   style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', margin: 0, opacity: 0, cursor: 'pointer' }} />
          </div>
          <div style={{ flex: mobile ? '0 0 auto' : '0 0 178px', textAlign: mobile ? 'left' : 'right', fontFamily: mono, fontSize: 13.5, fontWeight: 600, color: Tt < T_BOUNDARY ? '#c6caf2' : '#8fb9e6' }}>{zoneLabel}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', alignItems: mobile ? 'stretch' : 'center', gap: mobile ? 6 : 18 }}>
          <div style={{ flex: '1 1 auto' }} />
          <button onClick={togglePlay} style={{
            flex: mobile ? '0 0 auto' : '0 0 178px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
            padding: mobile ? '13px 14px' : '11px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: mono, fontSize: 14, fontWeight: 600,
            border: 'none', color: '#0b0e15', letterSpacing: '0.03em',
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

window.PopousteniDiagram = PopousteniDiagram;
