// rovnovazny-diagram-uplna-rozpustnost.jsx — binární rovnovážný diagram s úplnou rozpustností
// složek v tuhém i kapalném stavu (izomorfní systém, typu Cu–Ni). Hlavní diagram: teplota vs.
// složení, s likvidem a solidem tvořícími "čočku" mezi body tání čistých kovů A a B. Vedle diagramu
// je křivka tuhnutí (teplota/čas) pro aktuálně zvolené složení — mění se přetažením přímo v hlavním
// diagramu. Bez pákového pravidla, bez automatického přehrávání.

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

const T_A = 1450; // teplota tání čistého kovu A (0 % B)
const T_B = 950;  // teplota tání čistého kovu B (100 % B)
const LENS_DEPTH = 70; // hloubka "čočky" mezi likvidem a solidem uprostřed diagramu

function tmLinear(x) { return T_A + (T_B - T_A) * (x / 100); }
function liquidusT(x) { return tmLinear(x) + LENS_DEPTH * Math.sin(Math.PI * x / 100); }
function solidusT(x) { return tmLinear(x) - LENS_DEPTH * Math.sin(Math.PI * x / 100); }

function RovnovaznyDiagramUplnaRozpustnost() {
  const mono = "'IBM Plex Mono', monospace";
  const sans = "'IBM Plex Sans', system-ui, sans-serif";

  const [vw, setVw] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  React.useEffect(() => { const onR = () => setVw(window.innerWidth); window.addEventListener('resize', onR); return () => window.removeEventListener('resize', onR); }, []);
  const mobile = vw < 860;

  const [C, setC] = React.useState(50); // složení: % kovu B
  const plotRef = React.useRef(null);
  const coolBoxRef = React.useRef(null);
  const [mainSize, setMainSize] = React.useState({ w: 760, h: 560 });
  const [coolSize, setCoolSize] = React.useState({ w: 300, h: 560 });
  React.useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const roMain = new ResizeObserver((entries) => {
      const e = entries[0]; if (!e) return;
      const w = e.contentRect.width, h = e.contentRect.height;
      if (w > 20 && h > 20) setMainSize({ w, h });
    });
    if (plotRef.current) roMain.observe(plotRef.current);
    const roCool = new ResizeObserver((entries) => {
      const e = entries[0]; if (!e) return;
      const w = e.contentRect.width, h = e.contentRect.height;
      if (w > 20 && h > 20) setCoolSize({ w, h });
    });
    if (coolBoxRef.current) roCool.observe(coolBoxRef.current);
    return () => { roMain.disconnect(); roCool.disconnect(); };
  }, []);

  // ── hlavní diagram geometrie — PW/PH = skutečné rozměry panelu v px, aby text nikdy
  // neblil (bez hintingu jako HTML text) a aby se teploty daly zarovnat 1:1 s vedlejším panelem ──
  const PW = Math.round(mainSize.w), PH = Math.round(mainSize.h), PAD_L = 78, PAD_R = 30, PAD_T = 26, PAD_B = 46;
  const plotW = PW - PAD_L - PAD_R, plotH = PH - PAD_T - PAD_B;
  const T_MIN = 750, T_MAX = 1650;
  const xOf = (x) => PAD_L + (x / 100) * plotW;
  const yOf = (T) => PAD_T + ((T_MAX - clamp(T, T_MIN, T_MAX)) / (T_MAX - T_MIN)) * plotH;

  const N = 48;
  const liqPts = []; const solPts = [];
  for (let i = 0; i <= N; i++) { const x = (i / N) * 100; liqPts.push([x, liquidusT(x)]); solPts.push([x, solidusT(x)]); }
  const liqPath = 'M' + liqPts.map(([x, T]) => `${xOf(x).toFixed(1)},${yOf(T).toFixed(1)}`).join(' L');
  const solPath = 'M' + solPts.map(([x, T]) => `${xOf(x).toFixed(1)},${yOf(T).toFixed(1)}`).join(' L');

  const liquidRegion = `M${xOf(0)},${PAD_T} L${xOf(100)},${PAD_T} ` +
    liqPts.slice().reverse().map(([x, T]) => `L${xOf(x).toFixed(1)},${yOf(T).toFixed(1)}`).join(' ') + ' Z';
  const solidRegion = `M${xOf(0)},${PAD_T + plotH} L${xOf(100)},${PAD_T + plotH} ` +
    solPts.slice().reverse().map(([x, T]) => `L${xOf(x).toFixed(1)},${yOf(T).toFixed(1)}`).join(' ') + ' Z';
  const mushRegion = liqPts.map(([x, T]) => `${xOf(x).toFixed(1)},${yOf(T).toFixed(1)}`).join(' L') + ' L' +
    solPts.slice().reverse().map(([x, T]) => `${xOf(x).toFixed(1)},${yOf(T).toFixed(1)}`).join(' L');

  const T_liq = liquidusT(C), T_sol = solidusT(C);
  const isPure = C < 0.5 || C > 99.5;

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

  // ── křivka tuhnutí (teplota/čas), boční panel ─────────────────────────────
  const RATE = 130;       // °C na jednotku času, kapalná i tuhá fáze (pevné, ilustrační)
  const DUR_END = 1.4;    // délka úseku ochlazování kapaliny / tuhého roztoku (fixní)
  const DUR_MUSH = 2.6;   // délka intervalu tuhnutí (fixní množství uvolněného skupenského tepla)
  const cT_start = T_liq + RATE * DUR_END;
  const cT_final = T_sol - RATE * DUR_END;
  const ct0 = 0, ct1 = DUR_END, ct2 = DUR_END + DUR_MUSH, ct3 = DUR_END * 2 + DUR_MUSH;

  // viewBox rozměry = skutečné px panelu (1 jednotka = 1 px), aby se text nikdy nezvětšoval/zmenšoval
  // (jinak je SVG text při zmenšení rozmazaný — nemá hinting jako HTML text)
  // viewBox rozměry = skutečné px panelu (1 jednotka = 1 px), aby se text nikdy nezvětšoval/zmenšoval
  // (jinak je SVG text při zmenšení rozmazaný — nemá hinting jako HTML text). Stejné PAD_T/PAD_B a
  // stejná teplotní osa (T_MIN/T_MAX) jako hlavní diagram → shodné teploty vycházejí na stejné výšce.
  const PW2 = Math.round(coolSize.w), PH2 = Math.round(coolSize.h), PAD2_L = 58, PAD2_R = 18, PAD2_T = PAD_T, PAD2_B = PAD_B;
  const plotW2 = PW2 - PAD2_L - PAD2_R, plotH2 = PH2 - PAD2_T - PAD2_B;
  const xOf2 = (t) => PAD2_L + (t / ct3) * plotW2;
  const yOf2 = (T) => PAD2_T + ((T_MAX - clamp(T, T_MIN, T_MAX)) / (T_MAX - T_MIN)) * plotH2;
  const coolPath = `M${xOf2(ct0).toFixed(1)},${yOf2(cT_start).toFixed(1)} ` +
    `L${xOf2(ct1).toFixed(1)},${yOf2(T_liq).toFixed(1)} ` +
    `L${xOf2(ct2).toFixed(1)},${yOf2(T_sol).toFixed(1)} ` +
    `L${xOf2(ct3).toFixed(1)},${yOf2(cT_final).toFixed(1)}`;

  return (
    <div style={{ width: '100%', height: mobile ? 'auto' : '100vh', minHeight: '100vh', background: '#080b12', color: '#eaf2fa', boxSizing: 'border-box',
      padding: mobile ? '40px 14px 20px' : '58px 52px 20px', display: 'flex', flexDirection: 'column', fontFamily: sans, position: 'relative', overflow: mobile ? 'visible' : 'hidden' }}>

      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(120% 90% at 42% 44%, rgba(60,32,80,0.4) 0%, rgba(9,13,20,0) 62%)' }} />

      {/* header */}
      <div style={{ position: 'relative', flex: '0 0 auto' }}>
        <div style={{ fontFamily: mono, fontSize: mobile ? 13 : 16, letterSpacing: '0.24em', color: '#d67bff', textTransform: 'uppercase' }}>Rovnovážné diagramy</div>
        <div style={{ fontSize: mobile ? 24 : 32, fontWeight: 600, marginTop: 6, letterSpacing: '-0.01em' }}>Diagram s úplnou rozpustností</div>
      </div>

      {/* main */}
      <div style={{ position: 'relative', flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: mobile ? 'column' : 'row', gap: mobile ? 20 : 32, marginTop: 10 }}>

        {/* hlavní diagram */}
        <div style={{ flex: mobile ? '0 0 auto' : '1 1 auto', minWidth: 0, minHeight: mobile ? 320 : 0, display: 'flex', borderRadius: 16, border: '1px solid rgba(120,180,230,0.14)', background: 'rgba(120,180,230,0.03)', padding: 10, boxSizing: 'border-box' }}>
          <svg ref={plotRef} viewBox={`0 0 ${PW} ${PH}`} preserveAspectRatio="xMidYMid meet" onPointerDown={onDown} onPointerMove={onMove}
               style={{ width: '100%', height: mobile ? 'auto' : '100%', display: 'block', cursor: 'ew-resize', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>

            {/* oblasti */}
            <path d={liquidRegion} fill="rgba(150,196,236,0.1)" />
            <path d={`M${mushRegion} Z`} fill="rgba(214,123,255,0.1)" />
            <path d={solidRegion} fill="rgba(127,224,204,0.09)" />

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
            {[900, 1000, 1100, 1200, 1300, 1400].map((T) => (
              <g key={'gy' + T}>
                <line x1={PAD_L} y1={yOf(T)} x2={PAD_L + plotW} y2={yOf(T)} stroke="rgba(150,180,210,0.07)" strokeWidth={1} />
                <text x={PAD_L - 10} y={yOf(T) + 4} fontFamily={mono} fontSize={12} fill="#7d8ea0" textAnchor="end">{T}</text>
              </g>
            ))}
            <text x={16} y={PAD_T + plotH / 2} fontFamily={mono} fontSize={12.5} fill="#aebfcf" textAnchor="middle" transform={`rotate(-90 16 ${PAD_T + plotH / 2})`}>teplota [°C]</text>

            {/* likvidus / solidus */}
            <path d={liqPath} fill="none" stroke="#96c4ec" strokeWidth={2.6} />
            <path d={solPath} fill="none" stroke="#7fe0cc" strokeWidth={2.6} />
            <rect x={xOf(28) - 42} y={yOf(liquidusT(28)) - 24} width={84} height={19} fill="#0b0e15" opacity={0.72} rx={4} />
            <text x={xOf(28)} y={yOf(liquidusT(28)) - 10} fontFamily={mono} fontSize={14} fill="#96c4ec" textAnchor="middle">likvidus</text>
            <rect x={xOf(72) - 38} y={yOf(solidusT(72)) + 6} width={76} height={19} fill="#0b0e15" opacity={0.72} rx={4} />
            <text x={xOf(72)} y={yOf(solidusT(72)) + 20} fontFamily={mono} fontSize={14} fill="#7fe0cc" textAnchor="middle">solidus</text>

            {/* popisky oblastí */}
            <text x={xOf(50)} y={PAD_T + 22} fontFamily={mono} fontSize={13.5} fill="#96c4ec" textAnchor="middle" opacity={0.85}>T — tavenina</text>
            <text x={xOf(50)} y={yOf(tmLinear(50)) + 5} fontFamily={mono} fontSize={13.5} fill="#d67bff" textAnchor="middle" opacity={0.9}>T + α</text>
            <text x={xOf(50)} y={PAD_T + plotH - 12} fontFamily={mono} fontSize={13.5} fill="#7fe0cc" textAnchor="middle" opacity={0.85}>tuhý roztok α</text>

            {/* svislý marker aktuálního složení */}
            <line x1={xOf(C)} y1={PAD_T} x2={xOf(C)} y2={PAD_T + plotH} stroke="#e5703b" strokeWidth={2} strokeDasharray="6 5" />
            <circle cx={xOf(C)} cy={yOf(T_liq)} r={6} fill="#e5703b" stroke="#0b0e15" strokeWidth={1.6}
                    style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'pulseDot2 1.7s ease-in-out infinite' }} />
            <circle cx={xOf(C)} cy={yOf(T_sol)} r={6} fill="#e5703b" stroke="#0b0e15" strokeWidth={1.6}
                    style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'pulseDot2 1.7s ease-in-out infinite' }} />
            <g onPointerDown={onDown} onPointerMove={onMove} style={{ cursor: 'ew-resize', touchAction: 'none', userSelect: 'none' }}>
              <circle cx={xOf(C)} cy={PAD_T - 2} r={13} fill="transparent" />
              <circle cx={xOf(C)} cy={PAD_T - 2} r={7.5} fill="#f4c542" stroke="#0b0e15" strokeWidth={2}
                      style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'pulseThumb2 1.7s ease-in-out infinite' }} />
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
              <line x1={PAD2_L} y1={yOf2(T_sol)} x2={PAD2_L + plotW2} y2={yOf2(T_sol)} stroke="rgba(127,224,204,0.25)" strokeDasharray="4 4" strokeWidth={1.1} />

              <path d={coolPath} fill="none" stroke="#e5703b" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={xOf2(ct1)} cy={yOf2(T_liq)} r={4.5} fill="#e5703b" stroke="#0b0e15" strokeWidth={1.4} />
              <circle cx={xOf2(ct2)} cy={yOf2(T_sol)} r={4.5} fill="#e5703b" stroke="#0b0e15" strokeWidth={1.4} />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

window.RovnovaznyDiagramUplnaRozpustnost = RovnovaznyDiagramUplnaRozpustnost;
