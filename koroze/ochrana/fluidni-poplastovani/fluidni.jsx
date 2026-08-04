// fluidni.jsx — Fluidní poplastování: předehřátý díl se ponoří do vířivého
// lože plastového prášku (vzduch prouděním "zkapalní" prášek), zrnka se
// dotykem horkého povrchu taví a spojují v souvislou vrstvu; po vytažení
// dohřev vrstvu vyhladí. Vpravo zvětšený řez povrchem.
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

const DURATION = 23;

const METAL_COLD = 'oklch(0.5 0.015 250)';
const METAL_HOT = 'oklch(0.62 0.16 45)';
const POWDER = 'oklch(0.6 0.14 250)';
const PLASTIC = 'oklch(0.42 0.1 250)';
const MUTE = '#8296a8';
const ACC = 'oklch(0.72 0.16 35)';

// ── left process geometry ──
const TANK_X0 = 260, TANK_W = 340, TANK_TOP = 420, TANK_BOT = 840, PLATE_Y = 840;
const TANK_CX = TANK_X0 + TANK_W / 2;
const RAIL_Y = 240, ABOVE_Y = 340, DIP_Y = 620, FINISH_X = 780;

const KF = [
  [1.0, TANK_CX, ABOVE_Y], [6.6, TANK_CX, ABOVE_Y], [7.2, TANK_CX, DIP_Y], [12.4, TANK_CX, DIP_Y],
  [13.0, TANK_CX, ABOVE_Y], [13.8, FINISH_X, ABOVE_Y], [23, FINISH_X, ABOVE_Y],
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
const BASE_FLAT = 760, FILM_MAX = 120;
const STEEL_BOT = 960;

function Scene() {
  const t = useTime();
  const mono = "'IBM Plex Mono', monospace";
  const sans = "'IBM Plex Sans', system-ui, sans-serif";

  const appear = prog(t, 0.3, 1.1);
  const piece = pieceAt(t);

  const dipped = prog(t, 7.0, 7.5) - prog(t, 12.3, 13.1);
  const hotGlow = 1 - prog(t, 14.0, 18.0);
  const filmProg = prog(t, 7.4, 12.4);

  const metalTint = `color-mix(in oklch, ${METAL_COLD} ${(1 - hotGlow) * 100}%, ${METAL_HOT} ${hotGlow * 100}%)`;
  const plasticFill = filmProg > 0.02
    ? `color-mix(in oklch, ${metalTint} ${(1 - filmProg) * 100}%, ${PLASTIC} ${filmProg * 100}%)`
    : metalTint;

  // right-side timings
  const progFilm = prog(t, 7.8, 12.4);
  const coalesce = prog(t, 10.8, 13.6);
  const atmosOn = prog(t, 19.0, 20.0);

  const filmTop = BASE_FLAT - FILM_MAX * progFilm;

  const grains = [];
  if (progFilm > 0.02 && coalesce < 0.98) {
    for (let i = 0; i < 26; i++) {
      const gx = DX0 + 20 + ((DW - 40) * ((i * 53) % 100)) / 100;
      const gy = filmTop + Math.sin(i * 3.1) * 10 + 8;
      grains.push({ x: gx, y: gy, r: 6 + (i % 3) });
    }
  }

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', inset: 0,
        background: 'radial-gradient(120% 90% at 50% 30%, rgba(30,52,80,0.32) 0%, rgba(9,13,20,0) 60%)' }} />

      <div style={{ position: 'absolute', left: 84, top: 66, opacity: fade(t, 0.15, 0.8, 400, 401) }}>
        <div style={{ fontFamily: mono, fontSize: 18, letterSpacing: '0.28em', color: ACC, textTransform: 'uppercase' }}>Protikorozní ochrana</div>
        <div style={{ fontFamily: sans, fontSize: 40, fontWeight: 600, color: '#eaf2fa', marginTop: 10, letterSpacing: '-0.01em' }}>Fluidní poplastování</div>
      </div>

      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <filter id="fglow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="powderGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={POWDER} stopOpacity="0.14" />
            <stop offset="1" stopColor={POWDER} stopOpacity="0.22" />
          </linearGradient>
        </defs>

        <g opacity={appear}>
          {/* rail */}
          <line x1={140} y1={RAIL_Y} x2={840} y2={RAIL_Y} stroke={MUTE} strokeWidth={5} strokeLinecap="round" opacity={0.5} />

          {/* fluidizing tank */}
          <rect x={TANK_X0} y={TANK_TOP} width={TANK_W} height={TANK_BOT - TANK_TOP} fill="url(#powderGrad)" stroke="oklch(0.4 0.03 240)" strokeWidth={2} rx={6} />
          <rect x={TANK_X0 - 8} y={PLATE_Y} width={TANK_W + 16} height={16} fill="oklch(0.32 0.02 240)" rx={3} />
          <text x={TANK_CX} y={PLATE_Y + 58} textAnchor="middle" fontFamily={mono} fontSize={14.5} fill={MUTE}>Fluidní vana (plastový prášek + vzduch)</text>
          <text x={TANK_CX} y={PLATE_Y + 80} textAnchor="middle" fontFamily={mono} fontSize={13} fill={MUTE} opacity={0.75}>porézní přepážka přivádí vzduch zdola</text>

          {/* air jets */}
          {Array.from({ length: 6 }).map((_, i) => {
            const ax = TANK_X0 + 28 + (i * (TANK_W - 56)) / 5;
            return <line key={i} x1={ax} y1={PLATE_Y} x2={ax} y2={PLATE_Y - 24} stroke="oklch(0.75 0.06 220)" strokeWidth={3} opacity={0.4} strokeLinecap="round" />;
          })}

          {/* swirling powder grains */}
          {Array.from({ length: 30 }).map((_, i) => {
            const seed = i * 37.7;
            const cx = TANK_X0 + 26 + ((TANK_W - 52) / 2) + Math.sin(t * (0.7 + (i % 5) * 0.13) + seed) * ((TANK_W - 70) / 2);
            const baseY = TANK_BOT - 30 - ((i * 71) % (TANK_BOT - TANK_TOP - 60));
            const cy = baseY - Math.abs(Math.sin(t * (0.9 + (i % 4) * 0.1) + seed)) * 40 - dipped * 10;
            return <circle key={i} cx={cx} cy={cy} r={5 + (i % 3) * 1.4} fill={POWDER} opacity={0.5 + dipped * 0.15} />;
          })}

          {/* finish stand */}
          <line x1={FINISH_X} y1={RAIL_Y} x2={FINISH_X} y2={ABOVE_Y - 40} stroke={MUTE} strokeWidth={3} opacity={fade(t, 13.6, 14.2, 400, 401)} />
          <text x={FINISH_X} y={ABOVE_Y + 130} textAnchor="middle" fontFamily={mono} fontSize={14.5} fill={MUTE} opacity={fade(t, 13.8, 14.4, 400, 401)}>dohřev — vrstva se vyhladí a vytvrdí</text>

          {/* hook + piece */}
          <g>
            <line x1={piece.x} y1={RAIL_Y} x2={piece.x} y2={piece.y - 60} stroke={MUTE} strokeWidth={3} />
            <g transform={`translate(${piece.x} ${piece.y})`} filter={hotGlow > 0.2 || filmProg > 0.3 ? 'url(#fglow)' : undefined}>
              <rect x={-46} y={-60} width={92} height={120} rx={10} fill={plasticFill} stroke="oklch(0.3 0.02 250)" strokeWidth={2} />
              <circle cx={0} cy={-40} r={8} fill="oklch(0.18 0.02 250)" opacity={0.4} />
            </g>
          </g>
        </g>

        {/* divider */}
        <line x1={920} y1={140} x2={920} y2={960} stroke={MUTE} strokeWidth={1} opacity={0.25 * appear} />
        <text x={DX0 + DW / 2} y={140} textAnchor="middle" fontFamily={mono} fontSize={19} fill={MUTE} opacity={appear}>Detail povrchu (řez, zvětšeno)</text>

        {/* moisture/chemicals blocked */}
        <g opacity={atmosOn}>
          {[
            { x: DX0 + DW / 2 - 200, label: 'Vlhkost' },
            { x: DX0 + DW / 2, label: 'Chemikálie' },
            { x: DX0 + DW / 2 + 200, label: 'Vzdušný kyslík' },
          ].map((a, i) => (
            <g key={i}>
              <line x1={a.x} y1={210} x2={a.x} y2={filmTop - 18} stroke="oklch(0.7 0.1 220)" strokeWidth={2.5} strokeDasharray="6 6" opacity={0.75} />
              <path d={`M${a.x - 8} ${filmTop - 28} L${a.x} ${filmTop - 14} L${a.x + 8} ${filmTop - 28}`} fill="none" stroke="oklch(0.7 0.1 220)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              <text x={a.x} y={194} textAnchor="middle" fontFamily={mono} fontSize={15} fill="oklch(0.75 0.1 220)">{a.label}</text>
            </g>
          ))}
        </g>

        {/* cross-section: metal base + plastic film */}
        <rect x={DX0} y={BASE_FLAT} width={DW} height={STEEL_BOT - BASE_FLAT} fill={METAL_COLD} stroke="oklch(0.32 0.02 250)" strokeWidth={1.5} />
        {progFilm > 0.01 ? (
          <rect x={DX0} y={filmTop} width={DW} height={BASE_FLAT - filmTop} fill={PLASTIC} stroke="oklch(0.3 0.05 250)" strokeWidth={1}
            opacity={coalesce > 0.05 ? 1 : 0.85} filter={coalesce > 0.4 ? 'url(#fglow)' : undefined} />
        ) : null}
        {grains.map((g, i) => (
          <circle key={i} cx={g.x} cy={g.y} r={g.r} fill={POWDER} opacity={0.85 * (1 - coalesce)} />
        ))}

        {progFilm > 0.05 ? (
          <>
            <text x={DX0 + DW + 24} y={BASE_FLAT + (STEEL_BOT - BASE_FLAT) / 2} fontFamily={mono} fontSize={15} fill={MUTE}>kovový základ</text>
            <text x={DX0 + DW + 24} y={(filmTop + BASE_FLAT) / 2 + 5} fontFamily={mono} fontSize={15} fill={PLASTIC} opacity={progFilm}>plastová vrstva</text>
          </>
        ) : null}
      </svg>

      {[
        { n: '01', txt: 'Díl je předehřátý nad teplotu tavení prášku (200 – 300 °C)', a: 1.0, b: 1.6, c: 6.8, d: 7.4 },
        { n: '02', txt: 'Ponoření do fluidní vany – proudící vzduch rozvíří prášek skoro jako kapalinu', a: 6.8, b: 7.4, c: 12.6, d: 13.2 },
        { n: '03', txt: 'Zrnka prášku se dotykem s horkým povrchem taví a spojují v souvislou vrstvu', a: 12.6, b: 13.2, c: 18.4, d: 19.0 },
        { n: '04', txt: 'Výsledek: hladký, neprodyšný plastový povlak – bariéra proti vlhkosti a chemikáliím', a: 18.4, b: 19.0, c: 200, d: 201 },
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

function FluidniAnimation() {
  return (
    <Stage width={1920} height={1080} duration={DURATION} background="#080b12" persistKey="fluidni-poplastovani" loop={false}>
      <Scene />
    </Stage>
  );
}

window.FluidniAnimation = FluidniAnimation;
