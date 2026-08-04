// scc.jsx — Koroze pod napětím (stress corrosion cracking, SCC)
// Vizuál: kovová součást se zrnitou strukturou, vystavená koroznímu prostředí
// a současně tahovému napětí. Trhliny se iniciují na povrchu a šíří se po
// hranicích zrn do hloubky až ke křehkému lomu.
// Načítá se společně s ../../animations.jsx (Stage, useTime, clamp).

const BX = 560, BY = 340, BW = 800, BH = 420;
const COLS = 8, ROWS = 5;
const CX = BX + BW / 2;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260716);

// zrnitá mřížka — jitterovaná mřížka bodů; okrajové řady/sloupce přisazené k hraně bloku
const P = [];
for (let r = 0; r < ROWS; r++) {
  const row = [];
  for (let c = 0; c < COLS; c++) {
    let x = BX + c * (BW / (COLS - 1));
    let y = BY + r * (BH / (ROWS - 1));
    if (c !== 0 && c !== COLS - 1) x += (rng() * 2 - 1) * 34;
    if (r !== 0 && r !== ROWS - 1) y += (rng() * 2 - 1) * 30;
    row.push({ x, y });
  }
  P.push(row);
}

// hranice zrn: vodorovné + svislé spojnice sousedů + diagonály přes vybrané buňky
const GRAIN_SEGS = [];
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    if (c < COLS - 1) GRAIN_SEGS.push([P[r][c], P[r][c + 1]]);
    if (r < ROWS - 1) GRAIN_SEGS.push([P[r][c], P[r + 1][c]]);
    if (r < ROWS - 1 && c < COLS - 1 && (r + c) % 2 === 0) GRAIN_SEGS.push([P[r][c], P[r + 1][c + 1]]);
  }
}

// trhlina se šíří po reálných hranicích (svisle dolů + občasný vodorovný úkrok)
function buildCrack(startCol, targetRow) {
  let c = startCol, r = 0;
  const idx = [[r, c]];
  while (r < targetRow) {
    r++; idx.push([r, c]);
    if (rng() < 0.6 && r < targetRow) {
      const dc = rng() < 0.5 ? -1 : 1;
      const nc = clamp(c + dc, 1, COLS - 2);
      if (nc !== c) { c = nc; idx.push([r, c]); }
    }
  }
  return idx.map(([rr, cc]) => P[rr][cc]);
}
const CRACKS = [buildCrack(2, 2), buildCrack(4, 3), buildCrack(6, 2)];
const toPath = (pts) => pts.map((p, i) => (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' ');
const CRACK_DS = CRACKS.map(toPath);
const CRACK_TIPS = CRACKS.map((p) => p[p.length - 1]);
// dohašení lomu: střední trhlina se rychle dolomí až k dolní hraně
const midTip = CRACK_TIPS[1];
const FRACTURE_D = `M${midTip.x} ${midTip.y} L${(midTip.x + 20).toFixed(1)} ${((midTip.y + 760) / 2).toFixed(1)} L${(midTip.x - 8).toFixed(1)} 760`;

const easeIO = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
function fade(t, a, b, c, d) {
  if (t <= a || t >= d) return 0;
  if (t < b) return clamp((t - a) / (b - a), 0, 1);
  if (t < c) return 1;
  return 1 - clamp((t - c) / (d - c), 0, 1);
}
// lineární postup 0→1 mezi a a b, s easingem
function prog(t, a, b) { return easeIO(clamp((t - a) / (b - a), 0, 1)); }

const TEMPO_DUR = { 'Klidné': 34, 'Standardní': 26, 'Rychlé': 20 };

function Scene({ tempo = 'Standardní' } = {}) {
  const t = useTime();
  const mono = "'IBM Plex Mono', monospace";
  const sans = "'IBM Plex Sans', system-ui, sans-serif";
  const k = (TEMPO_DUR[tempo] || 26) / 26;
  const T = (x) => x * k;

  const CRACK = 'oklch(0.62 0.14 245)';
  const CRACK_HI = 'oklch(0.8 0.13 240)';
  const WARM = 'oklch(0.72 0.16 35)';
  const MEDIUM = 'oklch(0.68 0.12 235)';

  const appear = prog(t, T(0.4), T(1.6));
  const stress = prog(t, T(6.2), T(7.6));
  const stressOp = fade(t, T(6.0), T(6.8), 100, 101);
  const mediumOp = fade(t, T(2.0), T(2.8), 100, 101);
  const nucleus = prog(t, T(8.0), T(9.2));

  // postup šíření jednotlivých trhlin
  const crackP = [prog(t, T(9.5), T(14)), prog(t, T(10.5), T(16)), prog(t, T(10.2), T(14.6))];
  const fractureP = prog(t, T(18.2), T(19.8));
  const flash = fade(t, T(18.2), T(18.6), T(19.6), T(20.4));

  // tahové protažení bloku
  const elong = 1 + 0.02 * stress;

  // padající kapky (spojité od okamžiku expozice)
  const drops = [
    { x: 700, phase: 0.0, sp: 150 },
    { x: 960, phase: 0.7, sp: 135 },
    { x: 1210, phase: 0.35, sp: 160 },
  ];
  const dropTop = 200;
  const dropRange = BY - dropTop - 6;

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', inset: 0,
        background: 'radial-gradient(120% 90% at 50% 44%, rgba(30,52,80,0.5) 0%, rgba(9,13,20,0) 60%)' }} />

      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="oklch(0.32 0.02 250)" />
            <stop offset="1" stopColor="oklch(0.19 0.015 250)" />
          </linearGradient>
          <filter id="crackGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* korozní prostředí — padající kapky */}
        <g opacity={mediumOp}>
          {drops.map((d, i) => {
            const y = dropTop + ((t * d.sp + d.phase * dropRange) % dropRange);
            return (
              <path key={i}
                d={`M${d.x} ${y - 12} C ${d.x + 8} ${y - 2}, ${d.x + 7} ${y + 8}, ${d.x} ${y + 9} C ${d.x - 7} ${y + 8}, ${d.x - 8} ${y - 2}, ${d.x} ${y - 12} Z`}
                fill={MEDIUM} opacity={0.85} />
            );
          })}
          <text x={CX} y={168} textAnchor="middle" fontFamily={mono} fontSize={20}
            fill={MEDIUM} letterSpacing="0.12em">korozní prostředí</text>
        </g>

        {/* blok kovu se zrnitou strukturou (protahuje se tahem) */}
        <g transform={`translate(${CX} 0) scale(${elong} 1) translate(${-CX} 0)`} opacity={appear}>
          <rect x={BX} y={BY} width={BW} height={BH} fill="url(#metal)"
            stroke="oklch(0.72 0.03 250 / 0.7)" strokeWidth={2.5} rx={2} />

          {/* hranice zrn */}
          <g stroke="oklch(0.55 0.03 250 / 0.5)" strokeWidth={1.3} strokeLinecap="round">
            {GRAIN_SEGS.map((s, i) => (
              <line key={i} x1={s[0].x} y1={s[0].y} x2={s[1].x} y2={s[1].y} />
            ))}
          </g>

          {/* nukleační body trhlin na povrchu */}
          {CRACKS.map((p, i) => (
            <circle key={i} cx={p[0].x} cy={p[0].y} r={4.5 * nucleus}
              fill={CRACK_HI} opacity={nucleus * (1 - crackP[i] * 0.4)} />
          ))}

          {/* šířící se trhliny po hranicích zrn */}
          {CRACK_DS.map((d, i) => (
            crackP[i] > 0.001 ? (
              <path key={i} d={d} fill="none" stroke={CRACK} strokeWidth={5}
                strokeLinecap="round" strokeLinejoin="round"
                pathLength={1} strokeDasharray={1} strokeDashoffset={1 - crackP[i]}
                filter="url(#crackGlow)" />
            ) : null
          ))}

          {/* dolomení — křehký lom střední trhliny až k dolní hraně */}
          {fractureP > 0.001 ? (
            <path d={FRACTURE_D} fill="none" stroke={flash > 0.3 ? CRACK_HI : CRACK}
              strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round"
              pathLength={1} strokeDasharray={1} strokeDashoffset={1 - fractureP}
              filter="url(#crackGlow)" />
          ) : null}
        </g>

        {/* záblesk lomu */}
        <rect x={BX} y={BY} width={BW} height={BH} fill={CRACK_HI} opacity={flash * 0.12} rx={2} />

        {/* tahové napětí — šipky F */}
        <g opacity={stressOp} stroke={WARM} strokeWidth={4} strokeLinecap="round" fill={WARM}>
          {[430, 550, 670].map((y, i) => {
            const push = stress * (10 + 4 * Math.sin(t * 3 + i));
            return (
              <g key={'r' + i}>
                <line x1={1385} y1={y} x2={1470 + push} y2={y} />
                <path d={`M${1470 + push} ${y - 9} L${1490 + push} ${y} L${1470 + push} ${y + 9} Z`} stroke="none" />
              </g>
            );
          })}
          {[430, 550, 670].map((y, i) => {
            const push = stress * (10 + 4 * Math.sin(t * 3 + i));
            return (
              <g key={'l' + i}>
                <line x1={535} y1={y} x2={450 - push} y2={y} />
                <path d={`M${450 - push} ${y - 9} L${430 - push} ${y} L${450 - push} ${y + 9} Z`} stroke="none" />
              </g>
            );
          })}
          <text x={1520} y={556} fontFamily={mono} fontSize={38} fontWeight="600" fill={WARM} stroke="none">F</text>
          <text x={400} y={556} textAnchor="end" fontFamily={mono} fontSize={38} fontWeight="600" fill={WARM} stroke="none">F</text>
        </g>
      </svg>

      {/* titulek — bezpečná zóna pod tlačítkem Zpět */}
      <div style={{ position: 'absolute', left: 84, top: 74, opacity: fade(t, T(0.2), T(0.9), 200, 201) }}>
        <div style={{ fontFamily: mono, fontSize: 18, letterSpacing: '0.28em', color: '#5fc0ef', textTransform: 'uppercase' }}>Koroze · Faktory</div>
        <div style={{ fontFamily: sans, fontSize: 40, fontWeight: 600, color: '#eaf2fa', marginTop: 10, letterSpacing: '-0.01em' }}>Koroze pod napětím (SCC)</div>
      </div>

      {/* postupné popisky dole */}
      {[
        { n: '01', txt: 'Součást je vystavena koroznímu prostředí', a: T(2.2), b: T(2.9), c: T(5.8), d: T(6.3) },
        { n: '02', txt: 'a současně stálému tahovému napětí (F)', a: T(6.3), b: T(7.0), c: T(9.2), d: T(9.7) },
        { n: '03', txt: 'Trhliny se iniciují na povrchu a šíří se po hranicích zrn', a: T(9.9), b: T(10.6), c: T(17.4), d: T(17.9) },
        { n: '04', txt: 'Náhlý křehký lom — bez viditelného úbytku materiálu', a: T(18.4), b: T(19.1), c: T(100), d: T(101) },
      ].map((s, i) => {
        const o = fade(t, s.a, s.b, s.c, s.d);
        if (o < 0.001) return null;
        return (
          <div key={i} style={{ position: 'absolute', left: '50%', bottom: 96,
            transform: `translate(-50%, ${(1 - o) * 10}px)`, opacity: o, textAlign: 'center', width: 1100 }}>
            <div style={{ fontFamily: mono, fontSize: 16, letterSpacing: '0.24em', color: '#5fc0ef', marginBottom: 12 }}>{s.n}</div>
            <div style={{ fontFamily: sans, fontSize: 34, fontWeight: 500, color: '#eaf2fa', letterSpacing: '-0.005em' }}>{s.txt}</div>
          </div>
        );
      })}
    </div>
  );
}

function SccAnimation(props) {
  props = props || {};
  const tempo = props.tempo || 'Standardní';
  return (
    <Stage width={1920} height={1080} duration={TEMPO_DUR[tempo] || 26} background="#080b12" persistKey="scc-koroze-pod-napetim" loop={false}>
      <Scene tempo={tempo} />
    </Stage>
  );
}

window.SccAnimation = SccAnimation;
