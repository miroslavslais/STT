// katodova.jsx — Katodová ochrana (obětovaná anoda)
// Uložené potrubí v půdě, chráněné obětovanou anodou (Zn/Mg) přes vodič.
// Elektrony proudí z anody do potrubí, anoda se pomalu spotřebovává
// (koroduje) místo potrubí, které zůstává katodou — bez úbytku kovu.
// Načítá se společně s ../../../animations.jsx (Stage, useTime, clamp).

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makePits(seed, count, spread, rmax) {
  const r = mulberry32(seed);
  return Array.from({ length: count }, () => ({ dx: (r() * 2 - 1) * spread, r: rmax * (0.5 + r() * 0.5), ph: r() }));
}
const ANODE_PITS = makePits(41, 6, 46, 9);
const GHOST_PITS = makePits(53, 5, 300, 10);

const easeIO = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
function fade(t, a, b, c, d) {
  if (t <= a || t >= d) return 0;
  if (t < b) return clamp((t - a) / (b - a), 0, 1);
  if (t < c) return 1;
  return 1 - clamp((t - c) / (d - c), 0, 1);
}
function prog(t, a, b) { return easeIO(clamp((t - a) / (b - a), 0, 1)); }

const DURATION = 24;
const DY = -160;
const GROUND_Y = 560;
const PIPE_X0 = 140, PIPE_X1 = 1780, PIPE_TOP = 660, PIPE_BOT = 720;
const ANODE_CX = 940, ANODE_TOP = 780, ANODE_H0 = 70, ANODE_W0 = 90;

function Scene() {
  const t = useTime();
  const mono = "'IBM Plex Mono', monospace";
  const sans = "'IBM Plex Sans', system-ui, sans-serif";

  const CURR = 'oklch(0.8 0.13 235)';
  const WARM = 'oklch(0.7 0.18 32)';
  const GOOD = 'oklch(0.75 0.13 155)';
  const ANODE_COLOR = 'oklch(0.78 0.14 95)';
  const MUTE = '#8296a8';

  const appear = prog(t, 0.4, 1.6);
  const ghostP = fade(t, 1.6, 2.3, 4.2, 5.0);
  const anodeAppear = prog(t, 5.0, 6.2);
  const wireOn = prog(t, 6.2, 7.4);
  const protectOn = prog(t, 7.4, 8.6);
  const consumeP = prog(t, 8.6, 21.0);
  const glow = 0.55 + 0.45 * Math.sin(t * 2.6);
  const replaceOp = prog(t, 20.0, 21.5);

  const anodeScale = 1 - 0.72 * consumeP;
  const anodeW = ANODE_W0 * anodeScale, anodeH = ANODE_H0 * anodeScale;
  const anodeTopY = ANODE_TOP + (ANODE_H0 - anodeH);

  const wireOff = -(t * 60);
  const ionOff = (t * 48);

  const P_WIRE = `M${ANODE_CX} ${anodeTopY} L${ANODE_CX} ${PIPE_TOP - 90} L900 ${PIPE_TOP - 90} L900 ${PIPE_TOP}`;
  const P_IONIC = `M${900} ${PIPE_BOT} L${900} ${(PIPE_BOT + ANODE_TOP + anodeH / 2) / 2} L${ANODE_CX} ${ANODE_TOP + anodeH / 2}`;

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', inset: 0,
        background: 'radial-gradient(120% 90% at 50% 40%, rgba(30,52,80,0.4) 0%, rgba(9,13,20,0) 62%)' }} />
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <linearGradient id="soil" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="oklch(0.27 0.018 250)" />
            <stop offset="1" stopColor="oklch(0.15 0.012 250)" />
          </linearGradient>
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

        <g opacity={appear} transform={`translate(0 ${DY})`}>
          {/* půda */}
          <rect x={0} y={GROUND_Y} width={1920} height={1080 - GROUND_Y} fill="url(#soil)" />
          <line x1={0} y1={GROUND_Y} x2={1920} y2={GROUND_Y} stroke="oklch(0.42 0.02 250)" strokeWidth={1.5} />
          <text x={40} y={GROUND_Y - 16} fontFamily={mono} fontSize={19} fill={MUTE}>Povrch terénu</text>

          {/* potrubí */}
          <rect x={PIPE_X0} y={PIPE_TOP} width={PIPE_X1 - PIPE_X0} height={PIPE_BOT - PIPE_TOP} fill="url(#steel)" />
          <text x={PIPE_X0} y={PIPE_TOP - 18} fontFamily={mono} fontSize={19} fill={MUTE}>Uložené potrubí</text>

          {/* přízračné jamky — jak by potrubí korodovalo bez ochrany */}
          <g opacity={ghostP}>
            {GHOST_PITS.map((p, i) => (
              <circle key={i} cx={900 + p.dx} cy={PIPE_BOT} r={p.r} fill="none" stroke={WARM} strokeWidth={1.4} />
            ))}
          </g>

          {/* obětovaná anoda */}
          {anodeAppear > 0.001 ? (
            <g opacity={anodeAppear} filter="url(#glow)">
              <rect x={ANODE_CX - anodeW / 2} y={anodeTopY} width={anodeW} height={anodeH}
                fill={ANODE_COLOR} stroke="oklch(0.5 0.1 90)" strokeWidth={2} rx={4} />
              {ANODE_PITS.map((p, i) => (
                <circle key={i} cx={ANODE_CX + p.dx * anodeScale} cy={anodeTopY + 6} r={p.r * consumeP}
                  fill="oklch(0.13 0.012 250)" stroke={WARM} strokeWidth={1.3} opacity={consumeP} />
              ))}
            </g>
          ) : null}
          <text x={ANODE_CX} y={ANODE_TOP + ANODE_H0 + 34} textAnchor="middle" fontFamily={mono} fontSize={16}
            fill={MUTE} opacity={anodeAppear}>obětovaná anoda (Zn/Mg)</text>

          {/* vodič + tok elektronů (anoda → potrubí) */}
          {wireOn > 0.001 ? (
            <g opacity={wireOn}>
              <path d={P_WIRE} fill="none" stroke={CURR} strokeWidth={3} strokeDasharray="10 9" strokeDashoffset={wireOff} strokeLinecap="round" />
              <text x={ANODE_CX + 20} y={PIPE_TOP - 100} fontFamily={mono} fontSize={15} fill={CURR}>e⁻</text>
            </g>
          ) : null}

          {/* iontový proud v půdě (potrubí → anoda, uzavírá obvod) */}
          {wireOn > 0.001 ? (
            <path d={P_IONIC} fill="none" stroke="oklch(0.7 0.12 40)" strokeWidth={2.4}
              strokeDasharray="8 8" strokeDashoffset={ionOff} opacity={wireOn * 0.7} strokeLinecap="round" />
          ) : null}

          {/* chráněné potrubí — katoda */}
          <g opacity={protectOn}>
            <circle cx={900} cy={PIPE_BOT + 10} r={12} fill="none" stroke={GOOD} strokeWidth={2.5} />
            <path d={`M894 ${PIPE_BOT + 10} l4 5 l9 -10`} stroke={GOOD} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <text x={924} y={PIPE_BOT + 16} fontFamily={mono} fontSize={15} fill={GOOD}>katoda — chráněno</text>
          </g>

          {replaceOp > 0.001 ? (
            <text x={ANODE_CX} y={anodeTopY - 16} textAnchor="middle" fontFamily={mono} fontSize={15}
              fill={WARM} opacity={replaceOp}>anoda spotřebována — vyměnit</text>
          ) : null}
        </g>
      </svg>

      <div style={{ position: 'absolute', left: 84, top: 74, opacity: fade(t, 0.2, 0.9, 400, 401) }}>
        <div style={{ fontFamily: mono, fontSize: 18, letterSpacing: '0.28em', color: GOOD, textTransform: 'uppercase' }}>Protikorozní ochrana</div>
        <div style={{ fontFamily: sans, fontSize: 40, fontWeight: 600, color: '#eaf2fa', marginTop: 10, letterSpacing: '-0.01em' }}>Katodová ochrana — obětovaná anoda</div>
      </div>

      {[
        { n: '01', txt: 'Bez ochrany by potrubí v půdě samo korodovalo (anoda)', a: 1.0, b: 1.7, c: 4.3, d: 4.8 },
        { n: '02', txt: 'Připojíme obětovanou anodu — zinek nebo hořčík', a: 5.0, b: 5.7, c: 7.0, d: 7.5 },
        { n: '03', txt: 'Připojený materiál se v obvodu stává anodou', a: 7.5, b: 8.2, c: 10.5, d: 11.0 },
        { n: '04', txt: 'Anoda se pomalu spotřebovává (koroduje) místo potrubí', a: 11.0, b: 11.7, c: 17.5, d: 18.0 },
        { n: '05', txt: 'Potrubí zůstává chráněno — bez úbytku kovu', a: 18.0, b: 18.7, c: 21.5, d: 22.0 },
        { n: '06', txt: 'Vyčerpanou anodu je nutné pravidelně vyměnit', a: 22.0, b: 22.7, c: 200, d: 201 },
      ].map((s, i) => {
        const o = fade(t, s.a, s.b, s.c, s.d);
        if (o < 0.001) return null;
        return (
          <div key={i} style={{ position: 'absolute', left: '50%', bottom: 88,
            transform: `translate(-50%, ${(1 - o) * 10}px)`, opacity: o, textAlign: 'center', width: 1200 }}>
            <div style={{ fontFamily: mono, fontSize: 16, letterSpacing: '0.24em', color: GOOD, marginBottom: 12 }}>{s.n}</div>
            <div style={{ fontFamily: sans, fontSize: 33, fontWeight: 500, color: '#eaf2fa', letterSpacing: '-0.005em' }}>{s.txt}</div>
          </div>
        );
      })}
    </div>
  );
}

function KatodovaAnimation() {
  return (
    <Stage width={1920} height={1080} duration={DURATION} background="#080b12" persistKey="katodova-ochrana" loop={false}>
      <Scene />
    </Stage>
  );
}

window.KatodovaAnimation = KatodovaAnimation;
