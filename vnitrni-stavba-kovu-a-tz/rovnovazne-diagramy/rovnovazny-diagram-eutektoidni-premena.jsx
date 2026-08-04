// rovnovazny-diagram-eutektoidni-premena.jsx — binární rovnovážný diagram s eutektoidní přeměnou.
// Nahoře tavenina tuhne (přes úzké pásmo tav+γ) v jediný tuhý roztok γ, jehož pole sahá přes celé
// složení. Při dalším ochlazování se γ nejprve rozpadá na dvoufázová pole γ+α / γ+β a v samotném
// eutektoidním bodě E (na eutektoidále) rozpadá na směs α+β. Vedle diagramu je křivka chlazení
// vybrané slitiny; složení se nastavuje svislou čárou (posuvník) v hlavním diagramu.

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

// ── konstanty soustavy (ilustrační, obecný binární systém A–B) ─────────────
const T_A = 880, T_B = 900;              // teploty tání čistých složek
const T_PEAK_LIQ = 960, T_PEAK_SOL = 915; // vrchol likvidu / spodní hranice tání uprostřed složení
const T_ALLO_A = 680, T_ALLO_B = 700;     // alotropická přeměna γ→α (resp. γ→β) u čistých složek
const T_EUT = 480;                        // eutektoidní teplota
const C_E = 50;                           // eutektoidní složení, % složky B
const C_ALPHA_E = 18;                     // bod C — max. rozpustnost B v α při T_EUT
const C_BETA_E = 82;                      // bod D — min. % B pro β při T_EUT
const T_DOM_MIN = 260, T_DOM_MAX = 1060;
const C_ALPHA_ROOM = 3, C_BETA_ROOM = 96;

function liquidus(x) {
  if (x <= C_E) { const f = clamp(x / C_E, 0, 1); return T_A + (T_PEAK_LIQ - T_A) * Math.sin(f * Math.PI / 2); }
  const f = clamp((100 - x) / (100 - C_E), 0, 1); return T_B + (T_PEAK_LIQ - T_B) * Math.sin(f * Math.PI / 2);
}
function solidusG(x) {
  if (x <= C_E) { const f = clamp(x / C_E, 0, 1); return T_A + (T_PEAK_SOL - T_A) * Math.sin(f * Math.PI / 2); }
  const f = clamp((100 - x) / (100 - C_E), 0, 1); return T_B + (T_PEAK_SOL - T_B) * Math.sin(f * Math.PI / 2);
}
function gammaLowerAlpha(x) { const f = clamp(x / C_E, 0, 1); return T_ALLO_A - (T_ALLO_A - T_EUT) * Math.pow(f, 0.65); }
function gammaLowerBeta(x) { const f = clamp((100 - x) / (100 - C_E), 0, 1); return T_ALLO_B - (T_ALLO_B - T_EUT) * Math.pow(f, 0.65); }
function alphaUpper(x) { const f = clamp(x / C_ALPHA_E, 0, 1); return T_ALLO_A - (T_ALLO_A - T_EUT) * Math.pow(f, 0.8); }
function betaUpper(x) { const f = clamp((100 - x) / (100 - C_BETA_E), 0, 1); return T_ALLO_B - (T_ALLO_B - T_EUT) * Math.pow(f, 0.8); }
function solvusAlpha(T) { const f = clamp((T - T_DOM_MIN) / (T_EUT - T_DOM_MIN), 0, 1); return C_ALPHA_ROOM + (C_ALPHA_E - C_ALPHA_ROOM) * Math.pow(f, 0.55); }
function solvusBeta(T) { const f = clamp((T - T_DOM_MIN) / (T_EUT - T_DOM_MIN), 0, 1); return C_BETA_ROOM - (C_BETA_ROOM - C_BETA_E) * Math.pow(f, 0.55); }

function sampleX(fn, x0, x1, n) { const pts = []; for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * (i / n); pts.push([x, fn(x)]); } return pts; }
function sampleT(fn, T0, T1, n) { const pts = []; for (let i = 0; i <= n; i++) { const T = T0 + (T1 - T0) * (i / n); pts.push([fn(T), T]); } return pts; }

function RovnovaznyDiagramEutektoidniPremena() {
  const mono = "'IBM Plex Mono', monospace";
  const sans = "'IBM Plex Sans', system-ui, sans-serif";

  const [vw, setVw] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  React.useEffect(() => { const onR = () => setVw(window.innerWidth); window.addEventListener('resize', onR); return () => window.removeEventListener('resize', onR); }, []);
  const mobile = vw < 860;

  const [C, setC] = React.useState(30);
  const plotRef = React.useRef(null);
  const coolBoxRef = React.useRef(null);
  const [mainSize, setMainSize] = React.useState({ w: 760, h: 560 });
  const [coolSize, setCoolSize] = React.useState({ w: 300, h: 560 });
  React.useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const roMain = new ResizeObserver((entries) => { const e = entries[0]; if (!e) return; const w = e.contentRect.width, h = e.contentRect.height; if (w > 20 && h > 20) setMainSize({ w, h }); });
    if (plotRef.current) roMain.observe(plotRef.current);
    const roCool = new ResizeObserver((entries) => { const e = entries[0]; if (!e) return; const w = e.contentRect.width, h = e.contentRect.height; if (w > 20 && h > 20) setCoolSize({ w, h }); });
    if (coolBoxRef.current) roCool.observe(coolBoxRef.current);
    return () => { roMain.disconnect(); roCool.disconnect(); };
  }, []);

  const PW = Math.round(mainSize.w), PH = Math.round(mainSize.h), PAD_L = 78, PAD_R = 30, PAD_T = 26, PAD_B = 46;
  const plotW = PW - PAD_L - PAD_R, plotH = PH - PAD_T - PAD_B;
  const T_MIN = T_DOM_MIN, T_MAX = T_DOM_MAX;
  const xOf = (x) => PAD_L + (x / 100) * plotW;
  const yOf = (T) => PAD_T + ((T_MAX - clamp(T, T_MIN, T_MAX)) / (T_MAX - T_MIN)) * plotH;
  const pt = (x, T) => `${xOf(x).toFixed(1)},${yOf(T).toFixed(1)}`;
  const seg = (arr) => arr.map(([x, T]) => pt(x, T)).join(' L');

  const liqPts = sampleX(liquidus, 0, 100, 40);
  const solGPts = sampleX(solidusG, 0, 100, 40);
  const gLowAlphaPts = sampleX(gammaLowerAlpha, 0, C_E, 24);
  const gLowBetaPts = sampleX(gammaLowerBeta, C_E, 100, 24);
  const alphaUpperPts = sampleX(alphaUpper, 0, C_ALPHA_E, 16);
  const betaUpperPts = sampleX(betaUpper, C_BETA_E, 100, 16);
  const solvAlphaPts = sampleT(solvusAlpha, T_DOM_MIN, T_EUT, 20);
  const solvBetaPts = sampleT(solvusBeta, T_DOM_MIN, T_EUT, 20);

  // regiony
  const tavRegion = `M${pt(0, T_MAX)} L${pt(100, T_MAX)} L` + seg(liqPts.slice().reverse()) + ' Z';
  const mushRegion = `M` + seg(liqPts) + ' L' + seg(solGPts.slice().reverse()) + ' Z';
  const gammaRegion = `M` + seg(solGPts) + ' L' + seg([...gLowAlphaPts, ...gLowBetaPts].slice().reverse()) + ' Z';
  const gammaAlphaRegion = `M` + seg(gLowAlphaPts) + ' L' + seg([...alphaUpperPts, [C_ALPHA_E, T_EUT], [C_E, T_EUT]].slice().reverse()) + ' Z';
  const gammaBetaRegion = `M` + seg(gLowBetaPts) + ' L' + seg([[C_E, T_EUT], [C_BETA_E, T_EUT], ...betaUpperPts].slice().reverse()) + ' Z';
  const alphaRegion = `M${pt(0, T_ALLO_A)} L` + seg(alphaUpperPts) + ' L' + seg(solvAlphaPts.slice().reverse()) + ` L${pt(0, T_DOM_MIN)} Z`;
  const betaRegion = `M${pt(100, T_ALLO_B)} L` + seg(betaUpperPts.slice().reverse()) + ' L' + seg(solvBetaPts.slice().reverse()) + ` L${pt(100, T_DOM_MIN)} Z`;
  const eutRegion = `M${pt(C_ALPHA_E, T_EUT)} L` + seg(solvAlphaPts.slice().reverse()) + ' L' + seg(solvBetaPts) + ` L${pt(C_BETA_E, T_EUT)} Z`;

  const isAlphaOnly = C <= C_ALPHA_E;
  const isBetaOnly = C >= C_BETA_E;
  const T_liq = liquidus(C);
  const T_solG = solidusG(C);
  const T_gLow = C <= C_E ? gammaLowerAlpha(C) : gammaLowerBeta(C);
  const T_boundary = isAlphaOnly ? alphaUpper(C) : isBetaOnly ? betaUpper(C) : T_EUT;

  const setFromClientX = (clientX) => {
    const el = plotRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const scale = PW / r.width;
    const xLocal = (clientX - r.left) * scale;
    const frac = clamp((xLocal - PAD_L) / plotW, 0, 1);
    setC(Math.round(frac * 100));
  };
  const onDown = (e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); setFromClientX(e.clientX); };
  const onMove = (e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) setFromClientX(e.clientX); };

  // ── křivka chlazení (teplota/čas) ─────────────────────────────────────────
  const RATE_END = 130, RATE_MUSH = 42, DUR_END = 1.3, PLATEAU_MAX = 2.8;
  const durMush1 = Math.max(0.08, (T_liq - T_solG) / RATE_MUSH);
  const durGamma = Math.max(0.08, (T_solG - T_gLow) / RATE_END);
  const durMush2 = Math.max(0.08, (T_gLow - T_boundary) / RATE_MUSH);

  let keypoints;
  if (isAlphaOnly || isBetaOnly) {
    const T_start = T_liq + RATE_END * DUR_END;
    const T_final = T_boundary - RATE_END * DUR_END;
    const t0 = 0, t1 = DUR_END, t2 = t1 + durMush1, t3 = t2 + durGamma, t4 = t3 + durMush2, t5 = t4 + DUR_END;
    keypoints = [[t0, T_start], [t1, T_liq], [t2, T_solG], [t3, T_gLow], [t4, T_boundary], [t5, T_final]];
  } else {
    const fracGamma = C <= C_E ? clamp((C - C_ALPHA_E) / (C_E - C_ALPHA_E), 0, 1) : clamp((C_BETA_E - C) / (C_BETA_E - C_E), 0, 1);
    const durPlateau = Math.max(0.15, PLATEAU_MAX * fracGamma);
    const T_start = T_liq + RATE_END * DUR_END;
    const T_final = T_EUT - RATE_END * DUR_END;
    const t0 = 0, t1 = DUR_END, t2 = t1 + durMush1, t3 = t2 + durGamma, t4 = t3 + durMush2, t5 = t4 + durPlateau, t6 = t5 + DUR_END;
    keypoints = [[t0, T_start], [t1, T_liq], [t2, T_solG], [t3, T_gLow], [t4, T_EUT], [t5, T_EUT], [t6, T_final]];
  }
  const ctTotal = keypoints[keypoints.length - 1][0];

  const PW2 = Math.round(coolSize.w), PH2 = Math.round(coolSize.h), PAD2_L = 58, PAD2_R = 18, PAD2_T = PAD_T, PAD2_B = PAD_B;
  const plotW2 = PW2 - PAD2_L - PAD2_R, plotH2 = PH2 - PAD2_T - PAD2_B;
  const xOf2 = (t) => PAD2_L + (t / ctTotal) * plotW2;
  const yOf2 = (T) => PAD2_T + ((T_MAX - clamp(T, T_MIN, T_MAX)) / (T_MAX - T_MIN)) * plotH2;
  const coolPath = 'M' + keypoints.map(([t, T]) => `${xOf2(t).toFixed(1)},${yOf2(T).toFixed(1)}`).join(' L');
  const kinkPts = keypoints.slice(1, -1);

  return (
    <div style={{ width: '100%', height: mobile ? 'auto' : '100vh', minHeight: '100vh', background: '#080b12', color: '#eaf2fa', boxSizing: 'border-box',
      padding: mobile ? '40px 14px 20px' : '58px 52px 20px', display: 'flex', flexDirection: 'column', fontFamily: sans, position: 'relative', overflow: mobile ? 'visible' : 'hidden', userSelect: 'none', WebkitUserSelect: 'none' }}>

      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(120% 90% at 42% 44%, rgba(60,32,80,0.4) 0%, rgba(9,13,20,0) 62%)' }} />

      <div style={{ position: 'relative', flex: '0 0 auto' }}>
        <div style={{ fontFamily: mono, fontSize: mobile ? 13 : 16, letterSpacing: '0.24em', color: '#d67bff', textTransform: 'uppercase' }}>Rovnovážné diagramy</div>
        <div style={{ fontSize: mobile ? 24 : 32, fontWeight: 600, marginTop: 6, letterSpacing: '-0.01em' }}>Diagram s eutektoidní přeměnou</div>
        <div style={{ fontSize: mobile ? 13 : 14, marginTop: 4, color: '#9fb0c2', maxWidth: 680 }}>Tuhý roztok γ se v eutektoidálním bodě E rozpadá v tuhém stavu na směs α + β, beze změny skupenství.</div>
      </div>

      <div style={{ position: 'relative', flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: mobile ? 'column' : 'row', gap: mobile ? 20 : 32, marginTop: 10 }}>

        <div style={{ flex: mobile ? '0 0 auto' : '1 1 auto', minWidth: 0, minHeight: mobile ? 380 : 0, display: 'flex', borderRadius: 16, border: '1px solid rgba(120,180,230,0.14)', background: 'rgba(120,180,230,0.03)', padding: 10, boxSizing: 'border-box' }}>
          <svg ref={plotRef} viewBox={`0 0 ${PW} ${PH}`} preserveAspectRatio="xMidYMid meet" onPointerDown={onDown} onPointerMove={onMove}
               style={{ width: '100%', height: mobile ? 'auto' : '100%', display: 'block', cursor: 'ew-resize', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>

            {/* oblasti */}
            <path d={tavRegion} fill="rgba(150,196,236,0.1)" />
            <path d={mushRegion} fill="rgba(127,168,214,0.12)" />
            <path d={gammaRegion} fill="rgba(240,167,66,0.13)" />
            <path d={gammaAlphaRegion} fill="rgba(226,142,192,0.13)" />
            <path d={gammaBetaRegion} fill="rgba(159,212,176,0.13)" />
            <path d={alphaRegion} fill="rgba(214,123,255,0.13)" />
            <path d={betaRegion} fill="rgba(127,224,204,0.13)" />
            <path d={eutRegion} fill="rgba(229,112,59,0.13)" />

            {/* osy */}
            <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + plotH} stroke="rgba(150,180,210,0.3)" strokeWidth={1.3} />
            <line x1={PAD_L} y1={PAD_T + plotH} x2={PAD_L + plotW} y2={PAD_T + plotH} stroke="rgba(150,180,210,0.3)" strokeWidth={1.3} />
            {[0, 20, 40, 60, 80, 100].map((x) => (
              <g key={'gx' + x}>
                <line x1={xOf(x)} y1={PAD_T} x2={xOf(x)} y2={PAD_T + plotH} stroke="rgba(150,180,210,0.08)" strokeWidth={1} />
                <text x={xOf(x)} y={PAD_T + plotH + 20} fontFamily={mono} fontSize={12} fill="#7d8ea0" textAnchor="middle">{x}</text>
              </g>
            ))}
            <text x={PAD_L + plotW / 2} y={PH - 4} fontFamily={mono} fontSize={12.5} fill="#aebfcf" textAnchor="middle">složení: % kovu B (zbytek kov A)</text>
            {[300, 400, 500, 600, 700, 800, 900].map((T) => (
              <g key={'gy' + T}>
                <line x1={PAD_L} y1={yOf(T)} x2={PAD_L + plotW} y2={yOf(T)} stroke="rgba(150,180,210,0.07)" strokeWidth={1} />
                <text x={PAD_L - 10} y={yOf(T) + 4} fontFamily={mono} fontSize={12} fill="#7d8ea0" textAnchor="end">{T}</text>
              </g>
            ))}
            <text x={16} y={PAD_T + plotH / 2} fontFamily={mono} fontSize={12.5} fill="#aebfcf" textAnchor="middle" transform={`rotate(-90 16 ${PAD_T + plotH / 2})`}>teplota [°C]</text>

            {/* hraniční křivky */}
            <path d={'M' + seg(liqPts)} fill="none" stroke="#96c4ec" strokeWidth={2.6} />
            <path d={'M' + seg(solGPts)} fill="none" stroke="#7fa8d6" strokeWidth={2.2} />
            <path d={'M' + seg(gLowAlphaPts)} fill="none" stroke="#f0a742" strokeWidth={2.2} />
            <path d={'M' + seg(gLowBetaPts)} fill="none" stroke="#f0a742" strokeWidth={2.2} />
            <path d={'M' + seg(alphaUpperPts)} fill="none" stroke="#d67bff" strokeWidth={2.2} />
            <path d={'M' + seg(betaUpperPts)} fill="none" stroke="#7fe0cc" strokeWidth={2.2} />
            <path d={'M' + seg(solvAlphaPts)} fill="none" stroke="#d67bff" strokeWidth={2.2} />
            <path d={'M' + seg(solvBetaPts)} fill="none" stroke="#7fe0cc" strokeWidth={2.2} />
            <line x1={xOf(C_ALPHA_E)} y1={yOf(T_EUT)} x2={xOf(C_BETA_E)} y2={yOf(T_EUT)} stroke="#e5703b" strokeWidth={2.4} />

            {/* svislý posuvník složení */}
            <line x1={xOf(C)} y1={PAD_T} x2={xOf(C)} y2={PAD_T + plotH} stroke="#f4c542" strokeWidth={1.6} strokeDasharray="6 5" opacity={0.75} />

            {/* popisky křivek a oblastí */}
            <rect x={xOf(50) - 22} y={PAD_T + 4} width={44} height={19} fill="#0b0e15" opacity={0.72} rx={4} />
            <text x={xOf(50)} y={PAD_T + 18} fontFamily={mono} fontSize={13.5} fill="#96c4ec" textAnchor="middle">tav</text>

            <rect x={xOf(50) - 34} y={yOf((liquidus(50) + solidusG(50)) / 2) - 10} width={68} height={19} fill="#0b0e15" opacity={0.72} rx={4} />
            <text x={xOf(50)} y={yOf((liquidus(50) + solidusG(50)) / 2) + 4} fontFamily={mono} fontSize={12.5} fill="#7fa8d6" textAnchor="middle">tav + γ</text>

            <rect x={xOf(24) - 34} y={yOf(liquidus(24)) - 22} width={68} height={17} fill="#0b0e15" opacity={0.78} rx={4} />
            <text x={xOf(24)} y={yOf(liquidus(24)) - 9} fontFamily={mono} fontSize={12.5} fill="#96c4ec" textAnchor="middle">likvidus</text>

            <rect x={xOf(76) - 34} y={yOf(solidusG(76)) + 8} width={68} height={17} fill="#0b0e15" opacity={0.78} rx={4} />
            <text x={xOf(76)} y={yOf(solidusG(76)) + 21} fontFamily={mono} fontSize={12.5} fill="#7fa8d6" textAnchor="middle">solidus</text>

            <rect x={xOf(50) - 14} y={yOf(650) - 10} width={28} height={19} fill="#0b0e15" opacity={0.72} rx={4} />
            <text x={xOf(50)} y={yOf(650) + 4} fontFamily={mono} fontSize={14} fill="#f0a742" textAnchor="middle">γ</text>

            <rect x={xOf(9) - 30} y={yOf(600) - 10} width={60} height={19} fill="#0b0e15" opacity={0.72} rx={4} />
            <text x={xOf(9)} y={yOf(600) + 4} fontFamily={mono} fontSize={13} fill="#e28ec0" textAnchor="middle">γ + α</text>

            <rect x={xOf(91) - 30} y={yOf(620) - 10} width={60} height={19} fill="#0b0e15" opacity={0.72} rx={4} />
            <text x={xOf(91)} y={yOf(620) + 4} fontFamily={mono} fontSize={13} fill="#9fd4b0" textAnchor="middle">γ + β</text>

            <rect x={xOf(4) - 4} y={yOf(400) - 10} width={26} height={19} fill="#0b0e15" opacity={0.72} rx={4} />
            <text x={xOf(4)} y={yOf(400) + 4} fontFamily={mono} fontSize={14} fill="#d67bff" textAnchor="start">α</text>

            <rect x={xOf(96) - 22} y={yOf(420) - 10} width={26} height={19} fill="#0b0e15" opacity={0.72} rx={4} />
            <text x={xOf(96)} y={yOf(420) + 4} fontFamily={mono} fontSize={14} fill="#7fe0cc" textAnchor="end">β</text>

            <rect x={xOf((C_ALPHA_E + C_BETA_E) / 2) - 34} y={yOf(T_EUT) + 34} width={68} height={19} fill="#0b0e15" opacity={0.72} rx={4} />
            <text x={xOf((C_ALPHA_E + C_BETA_E) / 2)} y={yOf(T_EUT) + 48} fontFamily={mono} fontSize={13.5} fill="#e5703b" textAnchor="middle">α + β</text>

            {/* eutektoidní body C, E, D + svislé projekce na osu složení */}
            <line x1={xOf(C_ALPHA_E)} y1={yOf(T_EUT)} x2={xOf(C_ALPHA_E)} y2={PAD_T + plotH} stroke="rgba(244,197,66,0.35)" strokeDasharray="3 4" strokeWidth={1.1} />
            <line x1={xOf(C_E)} y1={yOf(T_EUT)} x2={xOf(C_E)} y2={PAD_T + plotH} stroke="rgba(244,197,66,0.35)" strokeDasharray="3 4" strokeWidth={1.1} />
            <line x1={xOf(C_BETA_E)} y1={yOf(T_EUT)} x2={xOf(C_BETA_E)} y2={PAD_T + plotH} stroke="rgba(244,197,66,0.35)" strokeDasharray="3 4" strokeWidth={1.1} />
            <circle cx={xOf(C_ALPHA_E)} cy={yOf(T_EUT)} r={4.5} fill="#f4c542" stroke="#0b0e15" strokeWidth={1.2} />
            <circle cx={xOf(C_E)} cy={yOf(T_EUT)} r={5.5} fill="#e5703b" stroke="#0b0e15" strokeWidth={1.4} />
            <circle cx={xOf(C_BETA_E)} cy={yOf(T_EUT)} r={4.5} fill="#f4c542" stroke="#0b0e15" strokeWidth={1.2} />
            <text x={xOf(C_ALPHA_E)} y={yOf(T_EUT) - 10} fontFamily={mono} fontSize={12} fill="#f4c542" textAnchor="middle">C</text>
            <text x={xOf(C_E)} y={yOf(T_EUT) - 12} fontFamily={mono} fontSize={12.5} fill="#e5703b" textAnchor="middle">E</text>
            <text x={xOf(C_BETA_E)} y={yOf(T_EUT) - 10} fontFamily={mono} fontSize={12} fill="#f4c542" textAnchor="middle">D</text>
            <text x={PAD_L + plotW + 6} y={yOf(T_EUT) + 4} fontFamily={mono} fontSize={12} fill="#e5703b" textAnchor="start">T_E</text>

            <circle cx={xOf(C)} cy={yOf(T_liq)} r={6} fill="#e5703b" stroke="#0b0e15" strokeWidth={1.6}
                    style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'pulseDotEutd 1.7s ease-in-out infinite' }} />
            <circle cx={xOf(C)} cy={yOf(T_boundary)} r={6} fill="#e5703b" stroke="#0b0e15" strokeWidth={1.6}
                    style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'pulseDotEutd 1.7s ease-in-out infinite' }} />

            {/* posuvník složení (nahoře na hraně diagramu) */}
            <g onPointerDown={onDown} onPointerMove={onMove} style={{ cursor: 'ew-resize', touchAction: 'none', userSelect: 'none' }}>
              <circle cx={xOf(C)} cy={PAD_T - 2} r={13} fill="transparent" />
              <circle cx={xOf(C)} cy={PAD_T - 2} r={7.5} fill="#f4c542" stroke="#0b0e15" strokeWidth={2}
                      style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'pulseThumbEutd 1.7s ease-in-out infinite' }} />
            </g>
          </svg>
        </div>

        {/* postranní panel — křivka chlazení */}
        <div style={{ flex: mobile ? '0 0 auto' : '0 0 300px', display: 'flex', flexDirection: 'column', gap: 14, minHeight: mobile ? 0 : '100%' }}>
          <div ref={coolBoxRef} style={{ flex: '1 1 auto', minHeight: mobile ? 320 : 0, borderRadius: 16, border: '1px solid rgba(120,180,230,0.14)', background: 'rgba(120,180,230,0.03)', position: 'relative', overflow: 'hidden', display: 'flex', padding: 10, boxSizing: 'border-box' }}>
            <svg viewBox={`0 0 ${PW2} ${PH2}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%', display: 'block' }}>
              <line x1={PAD2_L} y1={PAD2_T} x2={PAD2_L} y2={PAD2_T + plotH2} stroke="rgba(150,180,210,0.3)" strokeWidth={1.2} />
              <line x1={PAD2_L} y1={PAD2_T + plotH2} x2={PAD2_L + plotW2} y2={PAD2_T + plotH2} stroke="rgba(150,180,210,0.3)" strokeWidth={1.2} />
              <text x={PAD2_L + plotW2 / 2} y={PH2 - 4} fontFamily={mono} fontSize={12.5} fill="#aebfcf" textAnchor="middle">čas (schematicky)</text>
              <text x={16} y={PAD2_T + plotH2 / 2} fontFamily={mono} fontSize={12.5} fill="#aebfcf" textAnchor="middle" transform={`rotate(-90 16 ${PAD2_T + plotH2 / 2})`}>teplota</text>

              <line x1={PAD2_L} y1={yOf2(T_liq)} x2={PAD2_L + plotW2} y2={yOf2(T_liq)} stroke="rgba(150,196,236,0.25)" strokeDasharray="4 4" strokeWidth={1.1} />
              <line x1={PAD2_L} y1={yOf2(T_boundary)} x2={PAD2_L + plotW2} y2={yOf2(T_boundary)} stroke="rgba(240,167,66,0.25)" strokeDasharray="4 4" strokeWidth={1.1} />

              <path d={coolPath} fill="none" stroke="#e5703b" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
              {kinkPts.map(([t, T], i) => <circle key={i} cx={xOf2(t)} cy={yOf2(T)} r={4.5} fill="#e5703b" stroke="#0b0e15" strokeWidth={1.4} />)}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

window.RovnovaznyDiagramEutektoidniPremena = RovnovaznyDiagramEutektoidniPremena;
