// inhibitory.jsx — Inhibitory koroze
// Kovový vzorek v agresivním elektrolytu: bez ochrany vznikají korozní jamky.
// Po přidání inhibitoru se molekuly rozptýlí a adsorbují na povrchu kovu,
// vytvoří tenkou ochrannou vrstvu a další růst koroze se zastaví.
// Načítá se společně s ../../../animations.jsx (Stage, useTime, clamp).

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makePits(seed, count, x0, x1) {
  const r = mulberry32(seed);
  return Array.from({ length: count }, () => ({
    x: x0 + r() * (x1 - x0),
    rr: 6 + r() * 8,
    ph: r(),
  }));
}
const TOP_PITS = makePits(7, 6, 875, 1045);

function makeDots(seed, count, x0, x1, y0, y1) {
  const r = mulberry32(seed);
  return Array.from({ length: count }, () => ({ x: x0 + r() * (x1 - x0), y: y0 + r() * (y1 - y0), ph: r() }));
}
const MOLECULES = makeDots(31, 22, 640, 1280, 360, 860);

const easeIO = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
function fade(t, a, b, c, d) {
  if (t <= a || t >= d) return 0;
  if (t < b) return clamp((t - a) / (b - a), 0, 1);
  if (t < c) return 1;
  return 1 - clamp((t - c) / (d - c), 0, 1);
}
function prog(t, a, b) { return easeIO(clamp((t - a) / (b - a), 0, 1)); }

const DURATION = 23;

function Scene() {
  const t = useTime();
  const mono = "'IBM Plex Mono', monospace";
  const sans = "'IBM Plex Sans', system-ui, sans-serif";

  const ACID = 'oklch(0.7 0.13 195)';
  const WARM = 'oklch(0.7 0.18 32)';
  const INHIB = 'oklch(0.8 0.14 145)';
  const MUTE = '#8296a8';

  const appear = prog(t, 0.4, 1.6);
  const pitGrow = prog(t, 2.5, 8.5);
  const ionsOn = fade(t, 2.2, 3.0, 12.5, 14.5);
  const dropY = prog(t, 9.5, 11.2);
  const rippleP = prog(t, 11.2, 12.6);
  const dispP = prog(t, 11.4, 14.5);
  const filmP = prog(t, 13.5, 16.5);
  const glow = 0.55 + 0.45 * Math.sin(t * 2.6);

  const TX0 = 620, TX1 = 1300, TY0 = 340, TY1 = 880;
  const CX0 = 860, CX1 = 1060, CY0 = 500, CY1 = 760;
  const dropperY = 200 + dropY * (TY0 + 5 - 200);
  const splashX = 960, splashY = TY0 + 5;

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
          {/* nadoba s elektrolytem */}
          <rect x={TX0} y={TY0} width={TX1 - TX0} height={TY1 - TY0} rx={10}
            fill="oklch(0.4 0.09 195 / 0.16)" stroke="oklch(0.55 0.03 250 / 0.6)" strokeWidth={2.5} />
          <text x={(TX0 + TX1) / 2} y={TY0 - 20} textAnchor="middle" fontFamily={mono} fontSize={19}
            fill={ACID} letterSpacing="0.1em">agresivní elektrolyt</text>

          {/* kovový vzorek */}
          <rect x={CX0} y={CY0} width={CX1 - CX0} height={CY1 - CY0} fill="url(#steel)"
            stroke="oklch(0.72 0.02 250 / 0.7)" strokeWidth={2} />
          <text x={(CX0 + CX1) / 2} y={CY1 + 34} textAnchor="middle" fontFamily={mono} fontSize={16}
            fill={MUTE}>kovový vzorek</text>

          {/* ionty útočící na povrch */}
          <g opacity={ionsOn}>
            {TOP_PITS.map((p, i) => {
              const ph = ((t / 1.3) + p.ph) % 1;
              const y = CY0 - ph * 60;
              return <circle key={i} cx={p.x + Math.sin(t * 2 + i) * 6} cy={y} r={3} fill={WARM} opacity={(1 - ph) * 0.8} />;
            })}
          </g>

          {/* korozní jamky na povrchu vzorku */}
          <g filter="url(#glow)">
            {TOP_PITS.map((p, i) => (
              <circle key={i} cx={p.x} cy={CY0} r={p.rr * pitGrow} fill="oklch(0.13 0.012 250)"
                stroke={WARM} strokeWidth={1.6} opacity={pitGrow} />
            ))}
          </g>
          <circle cx={(CX0 + CX1) / 2} cy={CY0} r={90 * pitGrow} fill={WARM} opacity={pitGrow * glow * 0.1} />

          {/* kapátko s inhibitorem */}
          {dropY > 0.001 && dropY < 1 ? (
            <g transform={`translate(${splashX} ${dropperY})`}>
              <path d="M-7 -12 C-7 -4 -6 4 0 9 C6 4 7 -4 7 -12 Z" fill={INHIB} />
            </g>
          ) : null}

          {/* rozstřik na hladině */}
          {rippleP > 0.001 ? (
            <circle cx={splashX} cy={splashY} r={14 + rippleP * 46} fill="none"
              stroke={INHIB} strokeWidth={2.5} opacity={(1 - rippleP) * 0.9} />
          ) : null}

          {/* rozptýlené molekuly inhibitoru */}
          {dispP > 0.001 ? MOLECULES.map((m, i) => {
            const local = clamp((dispP - m.ph * 0.3) / 0.7, 0, 1);
            return <circle key={i} cx={m.x} cy={m.y} r={2.6} fill={INHIB} opacity={local * 0.75} />;
          }) : null}

          {/* ochranná vrstva na povrchu vzorku */}
          {filmP > 0.001 ? (
            <rect x={CX0 - 6} y={CY0 - 6} width={CX1 - CX0 + 12} height={CY1 - CY0 + 12}
              fill="none" stroke={INHIB} strokeWidth={4} opacity={filmP} filter="url(#glow)" />
          ) : null}
          {filmP > 0.3 ? (
            <text x={(CX0 + CX1) / 2} y={CY0 - 22} textAnchor="middle" fontFamily={mono} fontSize={15}
              fill={INHIB} opacity={filmP}>ochranná vrstva</text>
          ) : null}
        </g>
      </svg>

      <div style={{ position: 'absolute', left: 84, top: 74, opacity: fade(t, 0.2, 0.9, 400, 401) }}>
        <div style={{ fontFamily: mono, fontSize: 18, letterSpacing: '0.28em', color: INHIB, textTransform: 'uppercase' }}>Protikorozní ochrana</div>
        <div style={{ fontFamily: sans, fontSize: 40, fontWeight: 600, color: '#eaf2fa', marginTop: 10, letterSpacing: '-0.01em' }}>Inhibitory koroze</div>
      </div>

      {[
        { n: '01', txt: 'Kov je ponořen v agresivním elektrolytu', a: 1.2, b: 1.9, c: 5.4, d: 5.9 },
        { n: '02', txt: 'Ionty prostředí napadají povrch — vznikají korozní jamky', a: 5.9, b: 6.6, c: 9.0, d: 9.5 },
        { n: '03', txt: 'Do prostředí přidáme inhibitor koroze', a: 9.5, b: 10.2, c: 11.6, d: 12.1 },
        { n: '04', txt: 'Molekuly inhibitoru se rozptýlí k povrchu kovu', a: 12.1, b: 12.8, c: 14.6, d: 15.1 },
        { n: '05', txt: 'Adsorbují se na povrchu a vytvoří tenkou ochrannou vrstvu', a: 15.1, b: 15.8, c: 19.5, d: 20.0 },
        { n: '06', txt: 'Další koroze je zablokována — růst jamek se zastavil', a: 20.0, b: 20.7, c: 200, d: 201 },
      ].map((s, i) => {
        const o = fade(t, s.a, s.b, s.c, s.d);
        if (o < 0.001) return null;
        return (
          <div key={i} style={{ position: 'absolute', left: '50%', bottom: 88,
            transform: `translate(-50%, ${(1 - o) * 10}px)`, opacity: o, textAlign: 'center', width: 1200 }}>
            <div style={{ fontFamily: mono, fontSize: 16, letterSpacing: '0.24em', color: INHIB, marginBottom: 12 }}>{s.n}</div>
            <div style={{ fontFamily: sans, fontSize: 33, fontWeight: 500, color: '#eaf2fa', letterSpacing: '-0.005em' }}>{s.txt}</div>
          </div>
        );
      })}
    </div>
  );
}

function InhibitoryAnimation() {
  return (
    <Stage width={1920} height={1080} duration={DURATION} background="#080b12" persistKey="inhibitory-koroze" loop={false}>
      <Scene />
    </Stage>
  );
}

window.InhibitoryAnimation = InhibitoryAnimation;
