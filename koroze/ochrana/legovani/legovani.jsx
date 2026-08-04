// legovani.jsx — Legování (srovnání uhlíkové a korozivzdorné oceli)
// Dva panely se stejným agresivním prostředím: uhlíková ocel vytváří
// pórovitou, praskající vrstvu oxidů a koroze postupuje do hloubky.
// Korozivzdorná ocel (Cr, Ni) vytváří tenkou souvislou pasivní vrstvu, která
// další korozi zablokuje.
// Načítá se společně s ../../../animations.jsx (Stage, useTime, clamp).

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeAtoms(seed, x0, x1, y0, y1, cols, rows, alloyFrac) {
  const r = mulberry32(seed);
  const pts = [];
  for (let c = 0; c < cols; c++) {
    for (let row = 0; row < rows; row++) {
      const x = x0 + (c + 0.5) * (x1 - x0) / cols + (r() * 2 - 1) * 8;
      const y = y0 + (row + 0.5) * (y1 - y0) / rows + (r() * 2 - 1) * 8;
      pts.push({ x, y, alloy: r() < alloyFrac });
    }
  }
  return pts;
}

const easeIO = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
function fade(t, a, b, c, d) {
  if (t <= a || t >= d) return 0;
  if (t < b) return clamp((t - a) / (b - a), 0, 1);
  if (t < c) return 1;
  return 1 - clamp((t - c) / (d - c), 0, 1);
}
function prog(t, a, b) { return easeIO(clamp((t - a) / (b - a), 0, 1)); }

const DURATION = 24;
const LX0 = 160, LX1 = 900, RX0 = 1020, RX1 = 1760, PY0 = 400, PY1 = 900;
const LEFT_ATOMS = makeAtoms(11, LX0, LX1, PY0, PY1, 11, 8, 0);
const RIGHT_ATOMS = makeAtoms(23, RX0, RX1, PY0, PY1, 11, 8, 0.16);

function Scene() {
  const t = useTime();
  const mono = "'IBM Plex Mono', monospace";
  const sans = "'IBM Plex Sans', system-ui, sans-serif";

  const WARM = 'oklch(0.7 0.18 32)';
  const ENV = 'oklch(0.68 0.12 220)';
  const ALLOY = 'oklch(0.78 0.12 195)';
  const MUTE = '#8296a8';

  const appear = prog(t, 0.4, 1.6);
  const dropletsOn = fade(t, 1.6, 2.3, 100, 101);
  const oxideLeft = prog(t, 2.3, 4.0);
  const crackDepth = prog(t, 4.0, 16.0);
  const passiveRight = prog(t, 2.3, 3.6);

  const drops = [
    { x: LX0 + 130, phase: 0.0, sp: 130 }, { x: (LX0 + LX1) / 2, phase: 0.5, sp: 150 }, { x: LX1 - 130, phase: 0.25, sp: 140 },
    { x: RX0 + 130, phase: 0.4, sp: 145 }, { x: (RX0 + RX1) / 2, phase: 0.1, sp: 135 }, { x: RX1 - 130, phase: 0.7, sp: 150 },
  ];
  const dropTop = 220, dropRange = PY0 - dropTop - 6;

  const crackXs = [LX0 + 160, LX0 + 320, LX0 + 480, LX0 + 620];
  const crackDepthPx = 40 + crackDepth * 420;

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', inset: 0,
        background: 'radial-gradient(120% 90% at 50% 40%, rgba(30,52,80,0.4) 0%, rgba(9,13,20,0) 62%)' }} />
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <linearGradient id="steel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="oklch(0.5 0.02 250)" />
            <stop offset="0.5" stopColor="oklch(0.68 0.02 250)" />
            <stop offset="1" stopColor="oklch(0.4 0.02 250)" />
          </linearGradient>
          <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <g opacity={appear}>
          {/* panely */}
          <rect x={LX0} y={PY0} width={LX1 - LX0} height={PY1 - PY0} fill="url(#steel)" stroke="oklch(0.55 0.03 250 / 0.6)" strokeWidth={2} />
          <rect x={RX0} y={PY0} width={RX1 - RX0} height={PY1 - PY0} fill="url(#steel)" stroke="oklch(0.55 0.03 250 / 0.6)" strokeWidth={2} />
          <text x={(LX0 + LX1) / 2} y={PY0 - 20} textAnchor="middle" fontFamily={mono} fontSize={19} fill={MUTE} letterSpacing="0.08em">uhlíková ocel (Fe)</text>
          <text x={(RX0 + RX1) / 2} y={PY0 - 20} textAnchor="middle" fontFamily={mono} fontSize={19} fill={MUTE} letterSpacing="0.08em">korozivzdorná ocel (Fe · Cr · Ni)</text>
          <text x={(LX1 + RX0) / 2} y={(PY0 + PY1) / 2} textAnchor="middle" fontFamily={mono} fontSize={22} fontWeight="600" fill="#5a6b7a">VS</text>

          {/* atomová mřížka */}
          <g>
            {LEFT_ATOMS.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={5} fill="oklch(0.62 0.02 250)" opacity={0.85} />)}
            {RIGHT_ATOMS.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={5} fill={p.alloy ? ALLOY : 'oklch(0.62 0.02 250)'} opacity={0.85} />
            ))}
          </g>

          {/* padající prostředí */}
          <g opacity={dropletsOn}>
            {drops.map((d, i) => {
              const y = dropTop + ((t * d.sp + d.phase * dropRange) % dropRange);
              return (
                <path key={i}
                  d={`M${d.x} ${y - 11} C ${d.x + 7} ${y - 2}, ${d.x + 6} ${y + 7}, ${d.x} ${y + 8} C ${d.x - 6} ${y + 7}, ${d.x - 7} ${y - 2}, ${d.x} ${y - 11} Z`}
                  fill={ENV} opacity={0.8} />
              );
            })}
          </g>

          {/* levý panel: pórovitá vrstva oxidů s mezerami */}
          <g opacity={oxideLeft}>
            <path d={`M${LX0} ${PY0} l60 -6 l60 10 l60 -8 l60 6 l60 -10 l60 8 l60 -6 l60 10 l60 -8 l60 6 L${LX1} ${PY0} L${LX1} ${PY0 + 14} L${LX0} ${PY0 + 14} Z`}
              fill="oklch(0.55 0.15 40 / 0.55)" />
          </g>

          {/* trhliny pronikající do hloubky (uhlíková ocel) */}
          {crackDepth > 0.001 ? crackXs.map((x, i) => (
            <path key={i} d={`M${x} ${PY0 + 8} L${x + (i % 2 ? 14 : -14)} ${PY0 + crackDepthPx * (0.6 + 0.15 * (i % 3))}`}
              stroke={WARM} strokeWidth={3} strokeLinecap="round" fill="none" opacity={crackDepth} filter="url(#glow)" />
          )) : null}
          {crackDepth > 0.2 ? (
            <rect x={LX0} y={PY0 + 14} width={LX1 - LX0} height={crackDepthPx * 0.5} fill={WARM} opacity={crackDepth * 0.1} />
          ) : null}

          {/* pravý panel: tenká souvislá pasivní vrstva */}
          {passiveRight > 0.001 ? (
            <rect x={RX0} y={PY0} width={RX1 - RX0} height={10} fill={ALLOY} opacity={passiveRight} filter="url(#glow)" />
          ) : null}
          {passiveRight > 0.4 ? (
            <text x={(RX0 + RX1) / 2} y={PY0 + 34} textAnchor="middle" fontFamily={mono} fontSize={14}
              fill={ALLOY} opacity={passiveRight}>pasivní vrstva</text>
          ) : null}
        </g>
      </svg>

      <div style={{ position: 'absolute', left: 84, top: 74, opacity: fade(t, 0.2, 0.9, 400, 401) }}>
        <div style={{ fontFamily: mono, fontSize: 18, letterSpacing: '0.28em', color: ALLOY, textTransform: 'uppercase' }}>Protikorozní ochrana</div>
        <div style={{ fontFamily: sans, fontSize: 40, fontWeight: 600, color: '#eaf2fa', marginTop: 10, letterSpacing: '-0.01em' }}>Legování</div>
      </div>

      {[
        { n: '01', txt: 'Obě oceli ve stejném agresivním prostředí', a: 1.6, b: 2.3, c: 4.5, d: 5.0 },
        { n: '02', txt: 'Uhlíková ocel: vzniklá vrstva oxidů je pórovitá a praská', a: 5.0, b: 5.7, c: 9.0, d: 9.5 },
        { n: '03', txt: 'Trhlinami proniká prostředí dál — koroze postupuje do hloubky', a: 9.5, b: 10.2, c: 14.5, d: 15.0 },
        { n: '04', txt: 'Přidaný chrom (a nikl) vytváří u korozivzdorné oceli jinou vrstvu', a: 15.0, b: 15.7, c: 18.0, d: 18.5 },
        { n: '05', txt: 'Tenkou, souvislou a pevně přilnavou — pasivní vrstvu', a: 18.5, b: 19.2, c: 21.5, d: 22.0 },
        { n: '06', txt: 'Ta zablokuje další korozi — korozivzdorná ocel zůstává chráněná', a: 22.0, b: 22.7, c: 200, d: 201 },
      ].map((s, i) => {
        const o = fade(t, s.a, s.b, s.c, s.d);
        if (o < 0.001) return null;
        return (
          <div key={i} style={{ position: 'absolute', left: '50%', bottom: 88,
            transform: `translate(-50%, ${(1 - o) * 10}px)`, opacity: o, textAlign: 'center', width: 1300 }}>
            <div style={{ fontFamily: mono, fontSize: 16, letterSpacing: '0.24em', color: ALLOY, marginBottom: 12 }}>{s.n}</div>
            <div style={{ fontFamily: sans, fontSize: 33, fontWeight: 500, color: '#eaf2fa', letterSpacing: '-0.005em' }}>{s.txt}</div>
          </div>
        );
      })}
    </div>
  );
}

function LegovaniAnimation() {
  return (
    <Stage width={1920} height={1080} duration={DURATION} background="#080b12" persistKey="legovani-koroze" loop={false}>
      <Scene />
    </Stage>
  );
}

window.LegovaniAnimation = LegovaniAnimation;
