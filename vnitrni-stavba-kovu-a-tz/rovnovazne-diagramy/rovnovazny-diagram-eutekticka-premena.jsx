// rovnovazny-diagram-eutekticka-premena.jsx — binární rovnovážný diagram s eutektickou přeměnou
// a částečnou rozpustností v tuhém stavu (schéma typu Pb–Sn). Likvidus (dvě větve) klesá od bodů
// tání čistých kovů A a B k eutektickému bodu E. Solidus/solvus ohraničují tuhé roztoky α (bohatý
// na A) a β (bohatý na B); mezi nimi vzniká eutektikum α+β. Vedle diagramu je křivka tuhnutí měnící
// se podle složení (posouvá se přímo v hlavním diagramu) — bez pákového pravidla, bez auto-přehrávání.

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

// ── konstanty soustavy (ilustrační, kov A / kov B) ──────────────────────────
const T_A = 850, T_B = 650, T_E = 500;
const C_E = 55;              // eutektické složení, % kovu B
const C_ALPHA_E = 10;        // max. rozpustnost B v α při T_E
const C_BETA_E = 85;         // min. % B pro β při T_E (tj. rozpustnost A v β)
const T_DOM_MIN = 300, T_DOM_MAX = 900;
const C_ALPHA_ROOM = 3;      // solvus α na dolním okraji grafu
const C_BETA_ROOM = 96;      // solvus β na dolním okraji grafu

function liquidusAlpha(x) { const f = clamp(x / C_E, 0, 1); return T_A - (T_A - T_E) * Math.pow(f, 0.65); }
function liquidusBeta(x) { const f = clamp((100 - x) / (100 - C_E), 0, 1); return T_B - (T_B - T_E) * Math.pow(f, 0.65); }
function liquidusFull(x) { return x <= C_E ? liquidusAlpha(x) : liquidusBeta(x); }
function solidusAlpha(x) { const f = clamp(x / C_ALPHA_E, 0, 1); return T_A - (T_A - T_E) * Math.pow(f, 0.8); }
function solidusBeta(x) { const f = clamp((100 - x) / (100 - C_BETA_E), 0, 1); return T_B - (T_B - T_E) * Math.pow(f, 0.8); }
function solvusAlpha(T) { const f = clamp((T - T_DOM_MIN) / (T_E - T_DOM_MIN), 0, 1); return C_ALPHA_ROOM + (C_ALPHA_E - C_ALPHA_ROOM) * Math.pow(f, 0.55); }
function solvusBeta(T) { const f = clamp((T - T_DOM_MIN) / (T_E - T_DOM_MIN), 0, 1); return C_BETA_ROOM - (C_BETA_ROOM - C_BETA_E) * Math.pow(f, 0.55); }

function sampleX(fn, x0, x1, n) { const pts = []; for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * (i / n); pts.push([x, fn(x)]); } return pts; }
function sampleT(fn, T0, T1, n) { const pts = []; for (let i = 0; i <= n; i++) { const T = T0 + (T1 - T0) * (i / n); pts.push([fn(T), T]); } return pts; }

function RovnovaznyDiagramEutektickaPremena() {
  const mono = "'IBM Plex Mono', monospace";
  const sans = "'IBM Plex Sans', system-ui, sans-serif";

  const [vw, setVw] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  React.useEffect(() => { const onR = () => setVw(window.innerWidth); window.addEventListener('resize', onR); return () => window.removeEventListener('resize', onR); }, []);
  const mobile = vw < 860;

  const [C, setC] = React.useState(30); // složení: % kovu B
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

  // ── hlavní diagram geometrie ──────────────────────────────────────────────
  const PW = Math.round(mainSize.w), PH = Math.round(mainSize.h), PAD_L = 78, PAD_R = 30, PAD_T = 26, PAD_B = 46;
  const plotW = PW - PAD_L - PAD_R, plotH = PH - PAD_T - PAD_B;
  const T_MIN = T_DOM_MIN, T_MAX = T_DOM_MAX;
  const xOf = (x) => PAD_L + (x / 100) * plotW;
  const yOf = (T) => PAD_T + ((T_MAX - clamp(T, T_MIN, T_MAX)) / (T_MAX - T_MIN)) * plotH;
  const pt = (x, T) => `${xOf(x).toFixed(1)},${yOf(T).toFixed(1)}`;
  const seg = (arr) => arr.map(([x, T]) => pt(x, T)).join(' L');

  const liqAlphaPts = sampleX(liquidusAlpha, 0, C_E, 28);
  const liqBetaPts = sampleX(liquidusBeta, C_E, 100, 28);
  const solAlphaPts = sampleX(solidusAlpha, 0, C_ALPHA_E, 16);
  const solBetaPts = sampleX(solidusBeta, C_BETA_E, 100, 16);
  const solvAlphaPts = sampleT(solvusAlpha, T_DOM_MIN, T_E, 20); // ascending T
  const solvBetaPts = sampleT(solvusBeta, T_DOM_MIN, T_E, 20);

  // regiony
  const liquidRegion = `M${pt(0, T_MAX)} L${pt(100, T_MAX)} L` + seg([...liqAlphaPts, ...liqBetaPts].slice().reverse()) + ' Z';
  const lAlphaRegion = `M` + seg(liqAlphaPts) + ' L' + seg([...solAlphaPts, [C_ALPHA_E, T_E], [C_E, T_E]].slice().reverse()) + ' Z';
  const lBetaRegion = `M` + seg(liqBetaPts) + ' L' + seg([[C_E, T_E], [C_BETA_E, T_E], ...solBetaPts].slice().reverse()) + ' Z';
  const alphaRegion = `M${pt(0, T_A)} L` + seg(solAlphaPts) + ' L' + seg(solvAlphaPts.slice().reverse()) + ` L${pt(0, T_DOM_MIN)} Z`;
  const betaRegion = `M${pt(100, T_B)} L` + seg(solBetaPts.slice().reverse()) + ' L' + seg(solvBetaPts.slice().reverse()) + ` L${pt(100, T_DOM_MIN)} Z`;
  const abRegion = `M${pt(C_ALPHA_E, T_E)} L` + seg(solvAlphaPts.slice().reverse()) + ' L' + seg(solvBetaPts) + ` L${pt(C_BETA_E, T_E)} Z`;

  const T_liq = liquidusFull(C);
  const isAlphaOnly = C <= C_ALPHA_E;
  const isBetaOnly = C >= C_BETA_E;
  const T_solLocal = isAlphaOnly ? solidusAlpha(C) : isBetaOnly ? solidusBeta(C) : T_E;
  const isPureEnd = C < 0.5 || C > 99.5;

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

  // ── křivka tuhnutí (teplota/čas) ───────────────────────────────────────────
  const RATE_END = 130;      // °C/jednotka, strmé úseky (kapalina nahoře / tuhý roztok dole)
  const RATE_MUSH = 42;      // °C/jednotka, proeutektický růst α nebo β (mezi T_liq a T_E)
  const DUR_END = 1.3;
  const PLATEAU_MAX = 2.8;   // max. délka eutektické prodlevy (při C = C_E)

  let keypoints;
  if (isAlphaOnly || isBetaOnly) {
    const durMush = Math.max(0.12, Math.abs(T_liq - T_solLocal) / RATE_MUSH);
    const T_start = T_liq + RATE_END * DUR_END;
    const T_final = T_solLocal - RATE_END * DUR_END;
    const t0 = 0, t1 = DUR_END, t2 = DUR_END + durMush, t3 = DUR_END + durMush + DUR_END;
    keypoints = [[t0, T_start], [t1, T_liq], [t2, T_solLocal], [t3, T_final]];
  } else {
    const fracLiquid = C <= C_E
      ? clamp((C - C_ALPHA_E) / (C_E - C_ALPHA_E), 0, 1)
      : clamp((C_BETA_E - C) / (C_BETA_E - C_E), 0, 1);
    const durMush = Math.max(0.08, (T_liq - T_E) / RATE_MUSH);
    const durPlateau = Math.max(0.15, PLATEAU_MAX * fracLiquid);
    const T_start = T_liq + RATE_END * DUR_END;
    const T_final = T_E - RATE_END * DUR_END;
    const t0 = 0, t1 = DUR_END, t2 = DUR_END + durMush, t3 = t2 + durPlateau, t4 = t3 + DUR_END;
    keypoints = [[t0, T_start], [t1, T_liq], [t2, T_E], [t3, T_E], [t4, T_final]];
  }
  const ctTotal = keypoints[keypoints.length - 1][0];

  const PW2 = Math.round(coolSize.w), PH2 = Math.round(coolSize.h), PAD2_L = 58, PAD2_R = 18, PAD2_T = PAD_T, PAD2_B = PAD_B;
  const plotW2 = PW2 - PAD2_L - PAD2_R, plotH2 = PH2 - PAD2_T - PAD2_B;
  const xOf2 = (t) => PAD2_L + (t / ctTotal) * plotW2;
  const yOf2 = (T) => PAD2_T + ((T_MAX - clamp(T, T_MIN, T_MAX)) / (T_MAX - T_MIN)) * plotH2;
  const coolPath = 'M' + keypoints.map(([t, T]) => `${xOf2(t).toFixed(1)},${yOf2(T).toFixed(1)}`).join(' L');
  const kinkPts = keypoints.slice(1, -1); // vnitřní zlomové body (bez počátku/konce)

  return (
    <div style={{ width: '100%', height: mobile ? 'auto' : '100vh', minHeight: '100vh', background: '#080b12', color: '#eaf2fa', boxSizing: 'border-box',
      padding: mobile ? '40px 14px 20px' : '58px 52px 20px', display: 'flex', flexDirection: 'column', fontFamily: sans, position: 'relative', overflow: mobile ? 'visible' : 'hidden' }}>

      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(120% 90% at 42% 44%, rgba(60,32,80,0.4) 0%, rgba(9,13,20,0) 62%)' }} />

      {/* header */}
      <div style={{ position: 'relative', flex: '0 0 auto' }}>
        <div style={{ fontFamily: mono, fontSize: mobile ? 13 : 16, letterSpacing: '0.24em', color: '#d67bff', textTransform: 'uppercase' }}>Rovnovážné diagramy</div>
        <div style={{ fontSize: mobile ? 24 : 32, fontWeight: 600, marginTop: 6, letterSpacing: '-0.01em' }}>Diagram s eutektickou přeměnou</div>
      </div>

      {/* main */}
      <div style={{ position: 'relative', flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: mobile ? 'column' : 'row', gap: mobile ? 20 : 32, marginTop: 10 }}>

        {/* hlavní diagram */}
        <div style={{ flex: mobile ? '0 0 auto' : '1 1 auto', minWidth: 0, minHeight: mobile ? 320 : 0, display: 'flex', borderRadius: 16, border: '1px solid rgba(120,180,230,0.14)', background: 'rgba(120,180,230,0.03)', padding: 10, boxSizing: 'border-box' }}>
          <svg ref={plotRef} viewBox={`0 0 ${PW} ${PH}`} preserveAspectRatio="xMidYMid meet" onPointerDown={onDown} onPointerMove={onMove}
               style={{ width: '100%', height: mobile ? 'auto' : '100%', display: 'block', cursor: 'ew-resize', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>

            {/* oblasti */}
            <path d={liquidRegion} fill="rgba(150,196,236,0.1)" />
            <path d={lAlphaRegion} fill="rgba(214,123,255,0.09)" />
            <path d={lBetaRegion} fill="rgba(214,123,255,0.09)" />
            <path d={alphaRegion} fill="rgba(127,224,204,0.09)" />
            <path d={betaRegion} fill="rgba(127,224,204,0.09)" />
            <path d={abRegion} fill="rgba(229,112,59,0.08)" />

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
            {[350, 450, 550, 650, 750, 850].map((T) => (
              <g key={'gy' + T}>
                <line x1={PAD_L} y1={yOf(T)} x2={PAD_L + plotW} y2={yOf(T)} stroke="rgba(150,180,210,0.07)" strokeWidth={1} />
                <text x={PAD_L - 10} y={yOf(T) + 4} fontFamily={mono} fontSize={12} fill="#7d8ea0" textAnchor="end">{T}</text>
              </g>
            ))}
            <text x={16} y={PAD_T + plotH / 2} fontFamily={mono} fontSize={12.5} fill="#aebfcf" textAnchor="middle" transform={`rotate(-90 16 ${PAD_T + plotH / 2})`}>teplota [°C]</text>

            {/* likvidus / solidus / solvus */}
            <path d={'M' + seg(liqAlphaPts)} fill="none" stroke="#96c4ec" strokeWidth={2.6} />
            <path d={'M' + seg(liqBetaPts)} fill="none" stroke="#96c4ec" strokeWidth={2.6} />
            <path d={'M' + seg(solAlphaPts)} fill="none" stroke="#7fe0cc" strokeWidth={2.2} />
            <path d={'M' + seg(solBetaPts)} fill="none" stroke="#7fe0cc" strokeWidth={2.2} />
            <path d={'M' + seg(solvAlphaPts)} fill="none" stroke="#f0a742" strokeWidth={2.2} />
            <path d={'M' + seg(solvBetaPts)} fill="none" stroke="#f0a742" strokeWidth={2.2} />
            <line x1={xOf(C_ALPHA_E)} y1={yOf(T_E)} x2={xOf(C_BETA_E)} y2={yOf(T_E)} stroke="#e5703b" strokeWidth={2.2} />

            <rect x={xOf(42) - 32} y={yOf(liquidusAlpha(42)) - 34} width={64} height={18} rx={4} fill="#0b0e15" opacity={0.82} />
            <text x={xOf(42)} y={yOf(liquidusAlpha(42)) - 21} fontFamily={mono} fontSize={13} fill="#96c4ec" textAnchor="middle">likvidus</text>
            <rect x={xOf(75) - 32} y={yOf(liquidusBeta(75)) - 34} width={64} height={18} rx={4} fill="#0b0e15" opacity={0.82} />
            <text x={xOf(75)} y={yOf(liquidusBeta(75)) - 21} fontFamily={mono} fontSize={13} fill="#96c4ec" textAnchor="middle">likvidus</text>
            <rect x={xOf(4) - 4} y={yOf(solidusAlpha(4)) + 20} width={62} height={17} rx={4} fill="#0b0e15" opacity={0.82} />
            <text x={xOf(4)} y={yOf(solidusAlpha(4)) + 33} fontFamily={mono} fontSize={12.5} fill="#7fe0cc" textAnchor="start">solidus</text>
            <rect x={xOf(97) - 58} y={yOf(solidusBeta(97)) + 20} width={62} height={17} rx={4} fill="#0b0e15" opacity={0.82} />
            <text x={xOf(97)} y={yOf(solidusBeta(97)) + 33} fontFamily={mono} fontSize={12.5} fill="#7fe0cc" textAnchor="end">solidus</text>

            {/* eutektický bod */}
            <circle cx={xOf(C_E)} cy={yOf(T_E)} r={5} fill="#f4c542" stroke="#0b0e15" strokeWidth={1.4} />
            <text x={xOf(C_E)} y={yOf(T_E) + 22} fontFamily={mono} fontSize={12.5} fill="#f4c542" textAnchor="middle">E · {C_E} % B, {T_E} °C</text>

            {/* popisky oblastí */}
            <text x={xOf(C_E)} y={PAD_T + 22} fontFamily={mono} fontSize={13.5} fill="#96c4ec" textAnchor="middle" opacity={0.85}>T</text>
            <text x={xOf(18)} y={yOf(liquidusAlpha(18)) + (yOf(T_E) - yOf(liquidusAlpha(18))) * 0.42} fontFamily={mono} fontSize={13} fill="#d67bff" textAnchor="middle" opacity={0.9}>T + α</text>
            <text x={xOf(74)} y={yOf(liquidusBeta(74)) + (yOf(T_E) - yOf(liquidusBeta(74))) * 0.5} fontFamily={mono} fontSize={13} fill="#d67bff" textAnchor="middle" opacity={0.9}>T + β</text>
            <text x={xOf((C_ALPHA_E + C_BETA_E) / 2)} y={yOf(T_E) + 46} fontFamily={mono} fontSize={13.5} fill="#e5703b" textAnchor="middle" opacity={0.9}>α + β</text>

            {/* svislý marker aktuálního složení */}
            <line x1={xOf(C)} y1={PAD_T} x2={xOf(C)} y2={PAD_T + plotH} stroke="#e5703b" strokeWidth={2} strokeDasharray="6 5" />
            <circle cx={xOf(C)} cy={yOf(T_liq)} r={6} fill="#e5703b" stroke="#0b0e15" strokeWidth={1.6}
                    style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'pulseDot3 1.7s ease-in-out infinite' }} />
            <circle cx={xOf(C)} cy={yOf(T_solLocal)} r={6} fill="#e5703b" stroke="#0b0e15" strokeWidth={1.6}
                    style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'pulseDot3 1.7s ease-in-out infinite' }} />
            <g onPointerDown={onDown} onPointerMove={onMove} style={{ cursor: 'ew-resize', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
              <circle cx={xOf(C)} cy={PAD_T - 2} r={13} fill="transparent" />
              <circle cx={xOf(C)} cy={PAD_T - 2} r={7.5} fill="#f4c542" stroke="#0b0e15" strokeWidth={2}
                      style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'pulseThumb3 1.7s ease-in-out infinite' }} />
            </g>
          </svg>
        </div>

        {/* postranní panel — křivka tuhnutí */}
        <div style={{ flex: mobile ? '0 0 auto' : '0 0 300px', display: 'flex', flexDirection: 'column', gap: 14, minHeight: mobile ? 0 : '100%' }}>
          <div ref={coolBoxRef} style={{ flex: '1 1 auto', minHeight: mobile ? 320 : 0, borderRadius: 16, border: '1px solid rgba(120,180,230,0.14)', background: 'rgba(120,180,230,0.03)', position: 'relative', overflow: 'hidden', display: 'flex', padding: 10, boxSizing: 'border-box' }}>
            <svg viewBox={`0 0 ${PW2} ${PH2}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%', display: 'block' }}>
              <line x1={PAD2_L} y1={PAD2_T} x2={PAD2_L} y2={PAD2_T + plotH2} stroke="rgba(150,180,210,0.3)" strokeWidth={1.2} />
              <line x1={PAD2_L} y1={PAD2_T + plotH2} x2={PAD2_L + plotW2} y2={PAD2_T + plotH2} stroke="rgba(150,180,210,0.3)" strokeWidth={1.2} />
              <text x={PAD2_L + plotW2 / 2} y={PH2 - 4} fontFamily={mono} fontSize={12.5} fill="#aebfcf" textAnchor="middle">čas (schematicky)</text>
              <text x={16} y={PAD2_T + plotH2 / 2} fontFamily={mono} fontSize={12.5} fill="#aebfcf" textAnchor="middle" transform={`rotate(-90 16 ${PAD2_T + plotH2 / 2})`}>teplota</text>

              <line x1={PAD2_L} y1={yOf2(T_liq)} x2={PAD2_L + plotW2} y2={yOf2(T_liq)} stroke="rgba(150,196,236,0.25)" strokeDasharray="4 4" strokeWidth={1.1} />
              <line x1={PAD2_L} y1={yOf2(T_solLocal)} x2={PAD2_L + plotW2} y2={yOf2(T_solLocal)} stroke="rgba(127,224,204,0.25)" strokeDasharray="4 4" strokeWidth={1.1} />

              <path d={coolPath} fill="none" stroke="#e5703b" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
              {kinkPts.map(([t, T], i) => <circle key={i} cx={xOf2(t)} cy={yOf2(T)} r={4.5} fill="#e5703b" stroke="#0b0e15" strokeWidth={1.4} />)}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

window.RovnovaznyDiagramEutektickaPremena = RovnovaznyDiagramEutektickaPremena;
