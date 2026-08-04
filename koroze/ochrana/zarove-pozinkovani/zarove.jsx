// zarove.jsx — Žárové zinkování: moření → tavidlo → zinková lázeň (~450 °C).
// Vlevo schematický proces (díl putuje třemi lázněmi), vpravo zvětšený řez
// povrchem: vrstvy Fe–Zn a čistý zinek, atmosféra (O2/H2O/CO2) a nakonec
// katodová (obětovaná) ochrana — zinek přemostí solemi i poškozené místo.
// Načítá se společně s ../../../animations.jsx (Stage, useTime, clamp).

const easeIO = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
function fade(t, a, b, c, d) {
  if (t <= a || t >= d) return 0;
  if (t < b) return clamp((t - a) / (b - a), 0, 1);
  if (t < c) return 1;
  return 1 - clamp((t - c) / (d - c), 0, 1);
}
function prog(t, a, b) { return easeIO(clamp((t - a) / (b - a), 0, 1)); }
function lerp(a, b, u) { return a + (b - a) * u; }

const DURATION = 34;

const STEEL = 'oklch(0.5 0.015 250)';
const RUST = 'oklch(0.5 0.13 40)';
const ALLOY = 'oklch(0.66 0.03 250)';
const ZINC = 'oklch(0.85 0.015 250)';
const ACID = 'oklch(0.42 0.1 30)';
const FLUX = 'oklch(0.82 0.05 210)';
const MOLTEN = 'oklch(0.72 0.12 65)';
const MUTE = '#8296a8';
const ACC = 'oklch(0.72 0.16 35)';

// ── left process geometry ──
const T1_X0 = 60, T2_X0 = 300, T3_X0 = 540, TANK_W = 200;
const TANK_TOP = 560, TANK_BOT = 860;
const RAIL_Y = 380, ABOVE_Y = 480, DIP_Y = 760, FINISH_X = 800;

// piece keyframes: [time, x, y]
const KF = [
  [1.2, 60, ABOVE_Y], [2.0, 160, ABOVE_Y], [2.6, 160, DIP_Y], [6.6, 160, DIP_Y],
  [7.2, 160, ABOVE_Y], [8.0, 400, ABOVE_Y], [8.6, 400, DIP_Y], [11.6, 400, DIP_Y],
  [12.2, 400, ABOVE_Y], [13.0, 640, ABOVE_Y], [13.6, 640, DIP_Y], [20.6, 640, DIP_Y],
  [21.2, 640, ABOVE_Y], [22.0, FINISH_X, ABOVE_Y], [34, FINISH_X, ABOVE_Y],
];
function pieceAt(t) {
  if (t <= KF[0][0]) return { x: KF[0][1], y: KF[0][2] };
  for (let i = 1; i < KF.length; i++) {
    if (t <= KF[i][0]) {
      const [t0, x0, y0] = KF[i - 1], [t1, x1, y1] = KF[i];
      const u = easeIO(clamp((t - t0) / Math.max(t1 - t0, 0.001), 0, 1));
      return { x: lerp(x0, x1, u), y: lerp(y0, y1, u) };
    }
  }
  return { x: FINISH_X, y: ABOVE_Y };
}

// ── right detail geometry ──
const DX0 = 1000, DW = 760;
const ZN_TOP_FLAT = 700, ALLOY_THICK = 46, ZN_THICK = 64;
const STEEL_FLAT = ZN_TOP_FLAT + ALLOY_THICK + ZN_THICK; // = 810, undamaged steel surface
const STEEL_BOT = 960;
const NX = DX0 + DW / 2, SIGMA = 95, STEEL_DIMPLE = 34;

function notchFactor(x, notchProg) {
  return Math.exp(-Math.pow((x - NX) / SIGMA, 2)) * notchProg;
}
function steelTopAt(x, notchProg) { return STEEL_FLAT + notchFactor(x, notchProg) * STEEL_DIMPLE; }
function bandTopAt(x, notchProg, baseTop, thick, progGrow) {
  return baseTop - thick * (1 - notchFactor(x, notchProg)) * progGrow;
  // baseTop is the layer's *bottom-most* boundary; the layer grows upward (smaller y) from it
}

function sampleXs(n) {
  return Array.from({ length: n + 1 }, (_, i) => DX0 + (DW * i) / n);
}

function polyPath(topFn, botFn, xs) {
  let d = `M${xs[0]},${topFn(xs[0])}`;
  for (let i = 1; i < xs.length; i++) d += ` L${xs[i]},${topFn(xs[i])}`;
  for (let i = xs.length - 1; i >= 0; i--) d += ` L${xs[i]},${botFn(xs[i])}`;
  return d + ' Z';
}

function Scene() {
  const t = useTime();
  const mono = "'IBM Plex Mono', monospace";
  const sans = "'IBM Plex Sans', system-ui, sans-serif";

  const appear = prog(t, 0.3, 1.1);
  const piece = pieceAt(t);

  const inTank1 = prog(t, 2.2, 2.7) - prog(t, 6.5, 7.3);
  const inTank2 = prog(t, 8.2, 8.7) - prog(t, 11.5, 12.3);
  const inTank3 = prog(t, 13.2, 13.7) - prog(t, 20.5, 21.3);

  const fluxOpacity = prog(t, 8.8, 9.6) - prog(t, 20.8, 21.6) * 0;
  const znTint = prog(t, 13.8, 20.4);
  const pieceFill = znTint > 0.02
    ? `color-mix(in oklch, ${STEEL} ${(1 - znTint) * 100}%, ${ZINC} ${znTint * 100}%)`
    : STEEL;

  // right-side timings
  const progAlloy = prog(t, 14.0, 18.0);
  const progZn = prog(t, 17.0, 21.2);
  const atmosOn = prog(t, 21.8, 22.8);
  const notchProg = prog(t, 24.8, 26.6);
  const fillProg = prog(t, 27.0, 30.8);

  const xs = sampleXs(48);
  const steelTop = (x) => steelTopAt(x, notchProg);
  const alloyTop = (x) => bandTopAt(x, notchProg, steelTop(x), ALLOY_THICK, progAlloy);
  const zincTop = (x) => bandTopAt(x, notchProg, alloyTop(x), ZN_THICK, progZn);

  const steelPath = polyPath(steelTop, () => STEEL_BOT, xs);
  const alloyPath = progAlloy > 0.01 ? polyPath(alloyTop, steelTop, xs) : null;
  const zincPath = progZn > 0.01 ? polyPath(zincTop, alloyTop, xs) : null;

  const bowlMaxY = steelTop(NX);
  const waterY = bowlMaxY - fillProg * (bowlMaxY - ZN_TOP_FLAT);
  const salts = [];
  if (notchProg > 0.15) {
    const cols = 22, rows = 16;
    for (let ci = 0; ci <= cols; ci++) {
      const x = NX - SIGMA * 2.6 + (SIGMA * 5.2 * ci) / cols;
      const jx = Math.sin(ci * 12.9) * 4;
      for (let ri = 0; ri <= rows; ri++) {
        const y = ZN_TOP_FLAT + ((STEEL_FLAT - ZN_TOP_FLAT) * ri) / rows;
        const jy = Math.cos(ri * 7.3 + ci) * 3;
        const px = x + jx, py = y + jy;
        if (py >= waterY && py <= steelTop(px) + 2 && py >= ZN_TOP_FLAT - 2) {
          salts.push({ x: px, y: py, r: 5.5 + Math.abs(Math.sin(ci * 3 + ri * 5)) * 3 });
        }
      }
    }
  }

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', inset: 0,
        background: 'radial-gradient(120% 90% at 50% 30%, rgba(30,52,80,0.32) 0%, rgba(9,13,20,0) 60%)' }} />

      <div style={{ position: 'absolute', left: 84, top: 66, opacity: fade(t, 0.15, 0.8, 400, 401) }}>
        <div style={{ fontFamily: mono, fontSize: 18, letterSpacing: '0.28em', color: ACC, textTransform: 'uppercase' }}>Protikorozní ochrana</div>
        <div style={{ fontFamily: sans, fontSize: 40, fontWeight: 600, color: '#eaf2fa', marginTop: 10, letterSpacing: '-0.01em' }}>Žárové zinkování</div>
      </div>

      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <filter id="zglow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="acidGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={ACID} stopOpacity="0.55" />
            <stop offset="1" stopColor={ACID} stopOpacity="0.75" />
          </linearGradient>
          <linearGradient id="fluxGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={FLUX} stopOpacity="0.4" />
            <stop offset="1" stopColor={FLUX} stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="molGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={MOLTEN} stopOpacity="0.75" />
            <stop offset="1" stopColor="oklch(0.6 0.1 55)" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        <g opacity={appear}>
          {/* rail */}
          <line x1={40} y1={RAIL_Y} x2={860} y2={RAIL_Y} stroke={MUTE} strokeWidth={5} strokeLinecap="round" opacity={0.5} />

          {/* tanks */}
          {[
            { x0: T1_X0, grad: 'acidGrad', label: 'Moření (kyselina)', active: inTank1 },
            { x0: T2_X0, grad: 'fluxGrad', label: 'Tavidlo', active: inTank2 },
            { x0: T3_X0, grad: 'molGrad', label: 'Zinková lázeň ~450 °C', active: inTank3 },
          ].map((tk, i) => (
            <g key={i}>
              <rect x={tk.x0} y={TANK_TOP} width={TANK_W} height={TANK_BOT - TANK_TOP} fill={`url(#${tk.grad})`} stroke="oklch(0.4 0.03 240)" strokeWidth={2} rx={6} />
              <rect x={tk.x0 - 8} y={TANK_BOT} width={TANK_W + 16} height={14} fill="oklch(0.32 0.02 240)" rx={3} />
              <text x={tk.x0 + TANK_W / 2} y={TANK_BOT + 42} textAnchor="middle" fontFamily={mono} fontSize={14.5} fill={MUTE}>{tk.label}</text>
              {tk.active > 0.02 ? Array.from({ length: 7 }).map((_, bi) => {
                const bx = tk.x0 + 18 + ((TANK_W - 36) * ((bi * 37) % 100)) / 100;
                const rise = ((t * (i === 2 ? 90 : 55) + bi * 27) % 130);
                const by = TANK_BOT - 20 - rise;
                if (by < TANK_TOP + 10) return null;
                return <circle key={bi} cx={bx} cy={by} r={i === 2 ? 4.5 : 3} fill={i === 2 ? MOLTEN : (i === 0 ? '#e8ecf3' : FLUX)} opacity={tk.active * 0.65} />;
              }) : null}
            </g>
          ))}

          {/* finish rack */}
          <line x1={FINISH_X} y1={RAIL_Y} x2={FINISH_X} y2={ABOVE_Y - 44} stroke={MUTE} strokeWidth={3} opacity={fade(t, 21.6, 22.4, 400, 401)} />

          {/* hook + piece */}
          <g opacity={appear}>
            <line x1={piece.x} y1={RAIL_Y} x2={piece.x} y2={piece.y - 60} stroke={MUTE} strokeWidth={3} />
            <g transform={`translate(${piece.x} ${piece.y})`} filter={znTint > 0.3 ? 'url(#zglow)' : undefined}>
              <rect x={-46} y={-60} width={92} height={120} rx={10} fill={pieceFill} stroke="oklch(0.3 0.02 250)" strokeWidth={2} />
              <circle cx={0} cy={-40} r={8} fill="oklch(0.18 0.02 250)" opacity={0.5} />
              {[[-24,-30],[18,-14],[-14,10],[22,28],[-2,-2],[10,44]].map((p, ri) => {
                const a = 2.9 + ri * 0.24, b = a + 1.0;
                const rp = prog(t, a, b);
                if (rp >= 0.999) return null;
                return <circle key={ri} cx={p[0]} cy={p[1] + rp * (46 + ri * 6)} r={5} fill={RUST} opacity={1 - rp} />;
              })}
              {fluxOpacity > 0.02 ? <rect x={-46} y={-60} width={92} height={120} rx={10} fill={FLUX} opacity={fluxOpacity * 0.28} /> : null}
            </g>
          </g>
        </g>

        {/* divider */}
        <line x1={920} y1={140} x2={920} y2={960} stroke={MUTE} strokeWidth={1} opacity={0.25 * appear} />
        <text x={NX} y={140} textAnchor="middle" fontFamily={mono} fontSize={19} fill={MUTE} opacity={appear}>Detail povrchu (řez, zvětšeno)</text>

        {/* atmosphere */}
        <g opacity={atmosOn}>
          <rect x={DX0 - 20} y={200} width={DW + 40} height={ZN_TOP_FLAT - 200} fill="oklch(0.3 0.05 235)" opacity={0.18} />
          {[
            { x: NX - 220, label: 'Kyslík (O₂)' },
            { x: NX, label: 'Voda (H₂O)' },
            { x: NX + 220, label: 'CO₂' },
          ].map((a, i) => (
            <g key={i}>
              <line x1={a.x} y1={230} x2={a.x} y2={ZN_TOP_FLAT - 20} stroke="oklch(0.7 0.1 220)" strokeWidth={2.5} strokeDasharray="6 6" opacity={0.75} />
              <path d={`M${a.x - 8} ${ZN_TOP_FLAT - 30} L${a.x} ${ZN_TOP_FLAT - 16} L${a.x + 8} ${ZN_TOP_FLAT - 30}`} fill="none" stroke="oklch(0.7 0.1 220)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              <text x={a.x} y={214} textAnchor="middle" fontFamily={mono} fontSize={15} fill="oklch(0.75 0.1 220)">{a.label}</text>
            </g>
          ))}
        </g>

        {/* layered cross-section */}
        <path d={steelPath} fill={STEEL} stroke="oklch(0.32 0.02 250)" strokeWidth={1.5} />
        {alloyPath ? <path d={alloyPath} fill={ALLOY} stroke="oklch(0.4 0.03 250)" strokeWidth={1} /> : null}
        {zincPath ? <path d={zincPath} fill={ZINC} stroke="oklch(0.55 0.02 250)" strokeWidth={1} filter={progZn > 0.4 ? 'url(#zglow)' : undefined} /> : null}

        {/* zinc-salt bridging in the damaged pit */}
        {salts.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#eef3f8" stroke="oklch(0.75 0.02 250)" strokeWidth={1} opacity={0.92} />
        ))}

        {progZn > 0.05 ? (
          <>
            <text x={DX0 + DW + 24} y={STEEL_FLAT + (STEEL_BOT - STEEL_FLAT) / 2} fontFamily={mono} fontSize={15} fill={MUTE}>ocelový základ</text>
            <text x={DX0 + DW + 24} y={(alloyTop(DX0 + DW - 40) + steelTop(DX0 + DW - 40)) / 2 + 5} fontFamily={mono} fontSize={15} fill={ALLOY} opacity={progAlloy}>slitinové vrstvy Fe–Zn</text>
            <text x={DX0 + DW + 24} y={(zincTop(DX0 + DW - 40) + alloyTop(DX0 + DW - 40)) / 2 + 5} fontFamily={mono} fontSize={15} fill="oklch(0.6 0.02 250)" opacity={progZn}>čistý zinek</text>
          </>
        ) : null}

        {notchProg > 0.3 ? (
          <g opacity={notchProg}>
            <path d={`M${NX + 60} ${ZN_TOP_FLAT - 20} L${NX + 12} ${steelTop(NX) - 6}`} stroke={ACC} strokeWidth={1.6} strokeDasharray="4 5" opacity={0.7} />
            <text x={NX + 66} y={ZN_TOP_FLAT - 24} fontFamily={mono} fontSize={15} fill={ACC}>poškozené místo (bez zinku)</text>
          </g>
        ) : null}

      </svg>

      {[
        { n: '01', txt: 'Moření – kyselina odstraní nečistoty a rez z povrchu oceli', a: 1.2, b: 1.8, c: 6.6, d: 7.2 },
        { n: '02', txt: 'Tavidlo připraví povrch pro spojení se zinkem', a: 7.0, b: 7.6, c: 11.6, d: 12.2 },
        { n: '03', txt: 'Žárové zinkování (~450 °C) – zinek reaguje se železem, vznikají vrstvy Fe–Zn', a: 12.0, b: 12.6, c: 20.6, d: 21.2 },
        { n: '04', txt: 'Výsledek: vrstva čistého zinku nad slitinovými vrstvami – bariéra proti atmosféře', a: 21.2, b: 21.8, c: 24.4, d: 25.0 },
        { n: '05', txt: 'Katodová ochrana: i v poškozeném místě zinek koroduje přednostně a solemi přemostí vryp a chrání ocel', a: 24.8, b: 25.4, c: 200, d: 201 },
      ].map((s, i) => {
        const o = fade(t, s.a, s.b, s.c, s.d);
        if (o < 0.001) return null;
        return (
          <div key={i} style={{ position: 'absolute', left: '50%', bottom: 60,
            transform: `translate(-50%, ${(1 - o) * 10}px)`, opacity: o, textAlign: 'center', width: 1400 }}>
            <div style={{ fontFamily: mono, fontSize: 16, letterSpacing: '0.24em', color: ACC, marginBottom: 12 }}>{s.n}</div>
            <div style={{ fontFamily: sans, fontSize: 28, fontWeight: 500, color: '#eaf2fa', letterSpacing: '-0.005em', lineHeight: 1.35 }}>{s.txt}</div>
          </div>
        );
      })}
    </div>
  );
}

function ZaroveAnimation() {
  return (
    <Stage width={1920} height={1080} duration={DURATION} background="#080b12" persistKey="zarove-pozinkovani" loop={false}>
      <Scene />
    </Stage>
  );
}

window.ZaroveAnimation = ZaroveAnimation;
