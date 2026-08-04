// porovnani-vrstev.jsx — Porovnání povrchových úprav: cementace vs. nitridace vs. povrchové kalení.
// Tři panely vedle sebe (řez vrstvou + parametry) a společný graf tvrdost × hloubka.
// Interaktivní: klik na panel/kartu přehraje fázi, tažení odečtové čáry v grafu.
const { Stage, useTime, useTimeline, Easing, interpolate, clamp } = window;

const sans = "'IBM Plex Sans', system-ui, sans-serif";
const mono = "'IBM Plex Mono', ui-monospace, monospace";

const czNum = (v, dec) => v.toFixed(dec).replace('.', ',');
function fade(t, a, b, c, d) {
  if (t <= a || t >= d) return 0;
  if (t < b) return clamp((t - a) / (b - a), 0, 1);
  if (t > c) return clamp(1 - (t - c) / (d - c), 0, 1);
  return 1;
}
const lerp = (a, b, u) => a + (b - a) * u;

// ── metody ──────────────────────────────────────────────────────────────────
const DEPTH_MAX = 4;      // mm, společné měřítko
const HV_MAX = 1200;

const METHODS = [
  {
    key: 'cem', n: '01', name: 'Cementace', sub: '~930 °C · CO / CH₄',
    acc: [239, 171, 84], hex: '#efab54',
    core: 165,
    hvF: (d) => 165 + 585 * Math.exp(-Math.pow(d / 0.85, 2.4)),
    t0: 0, t1: 8,
    pStart: 1.2, pDur: 5.5, revStart: 2.2, revDur: 5,
    facts: [
      ['teplota', '~930 °C'],
      ['prostředí', 'CO / CH₄ (uhlík)'],
      ['povrch', '~750 HV (≈60 HRC)'],
      ['hloubka', '0,5–1,5 mm'],
      ['ocel', 'nízkouhlíková ~0,2 % C'],
    ],
    note: 'mění se složení povrchu · nutné kalení a popuštění',
    depthNote: 'CHD (550 HV)',
  },
  {
    key: 'nit', n: '02', name: 'Nitridace', sub: '500–550 °C · NH₃',
    acc: [88, 208, 168], hex: '#58d0a8',
    core: 280,
    hvF: (d) => 280 + 820 * Math.exp(-Math.pow(d / 0.28, 1.5)),
    t0: 8, t1: 16,
    pStart: 9.2, pDur: 5.5, revStart: 10.2, revDur: 5,
    facts: [
      ['teplota', '500–550 °C'],
      ['prostředí', 'NH₃ (dusík)'],
      ['povrch', '1000–1200 HV'],
      ['hloubka', '0,2–0,6 mm'],
      ['ocel', 'nitridační (Cr, Al, Mo)'],
    ],
    note: 'bez kalení → minimální deformace · tvrdost drží do ~500 °C',
    depthNote: 'Nht (550 HV)',
  },
  {
    key: 'pk', n: '03', name: 'Povrchové kalení', sub: '~900 °C jen povrch · indukce',
    acc: [143, 164, 240], hex: '#8fa4f0',
    core: 210,
    hvF: (d) => 210 + 440 / (1 + Math.exp((d - 2.8) / 0.3)),
    t0: 16, t1: 24,
    pStart: 20.3, pDur: 1.4, revStart: 20.4, revDur: 2.2,
    facts: [
      ['teplota', '~900 °C jen povrch'],
      ['ohřev', 'indukce / plamen'],
      ['povrch', '600–650 HV'],
      ['hloubka', '1–5 mm'],
      ['ocel', '~0,45 % C'],
    ],
    note: 'složení se nemění, jen struktura · rychlé, i velké součásti',
    depthNote: 'DS (550 HV)',
  },
];

// hloubka, kde tvrdost klesne pod 550 HV
METHODS.forEach((m) => {
  let d550 = 0;
  for (let i = 0; i <= 600; i++) { const d = (DEPTH_MAX * i) / 600; if (m.hvF(d) >= 550) d550 = d; else break; }
  m.d550 = d550;
});

// stav vrstvy v čase (růst do hloubky)
function progressOf(m, t) { return clamp((t - m.pStart) / m.pDur, 0, 1); }
function hvNow(m, d, p) {
  if (p <= 0) return m.core;
  const scale = 0.12 + 0.88 * Math.sqrt(p);
  const amp = clamp(p * 4, 0, 1);
  return m.core + (m.hvF(d / scale) - m.core) * amp;
}

// ── layout ──────────────────────────────────────────────────────────────────
const COLS = [
  { x: 84, y: 208, w: 552, h: 470 },
  { x: 684, y: 208, w: 552, h: 470 },
  { x: 1284, y: 208, w: 552, h: 470 },
];
const ST = { x: 42, y: 118, w: 118, h: 312 };   // řez vrstvou uvnitř panelu
const CH = { x: 84, y: 702, w: 1752, h: 280, padL: 96, padR: 30, padT: 44, padB: 46 };

const chX = (d) => CH.x + CH.padL + (clamp(d, 0, DEPTH_MAX) / DEPTH_MAX) * (CH.w - CH.padL - CH.padR);
const chY = (hv) => CH.y + CH.padT + (1 - clamp(hv, 0, HV_MAX) / HV_MAX) * (CH.h - CH.padT - CH.padB);
const stY = (d) => ST.y + (clamp(d, 0, DEPTH_MAX) / DEPTH_MAX) * ST.h;

const DUR = 36;
const PHASES = [
  { t0: 0, t1: 8, n: '01', lab: 'Cementace' },
  { t0: 8, t1: 16, n: '02', lab: 'Nitridace' },
  { t0: 16, t1: 24, n: '03', lab: 'Povrchové kalení' },
  { t0: 24, t1: 36, n: '04', lab: 'Porovnání' },
];

// částice pro cem/nit
const PARTS = [];
for (let i = 0; i < 16; i++) PARTS.push({ x: ST.x + 6 + ((i * 37) % (ST.w - 12)), delay: (i * 0.61) % 2.0, r: 1.8 + (i % 3) * 0.6 });

const CORE_C = [34, 56, 82];   // barva jádra (rgb)

function Scene() {
  const t = useTime();
  const { setTime, setPlaying } = useTimeline();
  const [manualDepth, setManualDepth] = React.useState(null);
  const [showHelp, setShowHelp] = React.useState(false);
  const segEndRef = React.useRef(null);
  const jumpRef = React.useRef(false);

  React.useEffect(() => {
    if (segEndRef.current != null && t >= segEndRef.current - 0.02) {
      const doJump = jumpRef.current;
      segEndRef.current = null;
      jumpRef.current = false;
      setPlaying(false);
      if (doJump) setTime(36);   // po 01–03 skoč rovnou na porovnání
    }
  }, [t, setPlaying, setTime]);

  const playPhase = (p) => {
    setManualDepth(null);
    if (p.n === '04') {
      // porovnání se nepřehrává – rovnou interaktivní slider
      segEndRef.current = null;
      jumpRef.current = false;
      setPlaying(false);
      setTime(36);
      return;
    }
    segEndRef.current = p.t1;
    jumpRef.current = false;
    setTime(p.t0);
    setPlaying(true);
  };
  const playAll = () => {
    segEndRef.current = 24;   // přehraje 01, 02, 03…
    jumpRef.current = true;   // …a pak skočí na porovnání
    setManualDepth(null);
    setTime(0);
    setPlaying(true);
  };

  // ── odečtová čára ──
  const scanOp = fade(t, 24.3, 25, 36, 37);
  const autoDepth = interpolate([25.2, 30.5, 33, 36], [0.05, DEPTH_MAX, 0.8, 0.8], Easing.easeInOutCubic)(clamp(t, 25.2, 36));
  const scanDepth = manualDepth != null ? manualDepth : autoDepth;
  const dragActive = t >= 24;
  const depthFromEvent = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    return clamp(((e.clientX - r.left) / r.width) * DEPTH_MAX, 0, DEPTH_MAX);
  };
  const onScanDown = (e) => {
    if (!dragActive) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setPlaying(false);
    setManualDepth(depthFromEvent(e));
  };
  const onScanMove = (e) => {
    if (!dragActive || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    setManualDepth(depthFromEvent(e));
  };

  // pk – žár a sprcha
  const heatGlow = fade(t, 16.8, 17.8, 19.6, 20.4);
  const quenchFlash = fade(t, 20.2, 20.5, 21.2, 22.2);

  const captions = [
    { txt: 'Cementace: povrch se sytí uhlíkem (~930 °C), pak se kalí a popouští · tvrdá vrstva ~750 HV do ~1 mm', a: 0.3, b: 1, c: 7.4, d: 8.2 },
    { txt: 'Nitridace: povrch se sytí dusíkem (500–550 °C) bez kalení · nejtvrdší, ale tenká vrstva ~1100 HV do ~0,4 mm', a: 8.1, b: 8.8, c: 15.4, d: 16.2 },
    { txt: 'Povrchové kalení: indukční ohřev povrchu a sprcha · složení se nemění, prokalí se až několik mm', a: 16.1, b: 16.8, c: 23.4, d: 24.2 },
    { txt: 'Porovnání: táhněte čáru v grafu · nitridace = nejtvrdší povrch, povrchové kalení = největší hloubka', a: 24.1, b: 24.8, c: 36, d: 37 },
  ];

  // ── panely metod ──
  const panels = METHODS.map((m, mi) => {
    const C = COLS[mi];
    const p = progressOf(m, t);
    const active = t >= m.t0 && t < m.t1;
    const factsOp = 0.3 + 0.7 * clamp((t - m.t0 - 0.5) / 0.8, 0, 1);
    const partsOp = m.key === 'cem' ? fade(t, 1, 1.6, 6.4, 7.4) : m.key === 'nit' ? fade(t, 9, 9.6, 14.4, 15.4) : 0;

    // řez: 52 vodorovných plátků obarvených podle aktuální tvrdosti
    const NSL = 52;
    const slices = [];
    for (let i = 0; i < NSL; i++) {
      const d = (DEPTH_MAX * (i + 0.5)) / NSL;
      const hv = hvNow(m, d, p);
      let u = clamp((hv - 150) / 950, 0, 1);
      u = Math.pow(u, 0.8);
      const rC = lerp(CORE_C[0], m.acc[0], u), gC = lerp(CORE_C[1], m.acc[1], u), bC = lerp(CORE_C[2], m.acc[2], u);
      const al = 0.22 + 0.6 * u;
      slices.push(<rect key={i} x={ST.x} y={ST.y + (ST.h * i) / NSL} width={ST.w} height={ST.h / NSL + 0.6}
        fill={`rgba(${Math.round(rC)},${Math.round(gC)},${Math.round(bC)},${al.toFixed(3)})`} />);
    }

    const depthMarkOp = clamp((p - 0.85) / 0.15, 0, 1);
    const accStr = `rgba(${m.acc[0]},${m.acc[1]},${m.acc[2]},`;

    return (
      <g key={m.key} transform={`translate(${C.x},${C.y})`} onClick={() => playPhase(PHASES[mi])} style={{ cursor: 'pointer' }}>
        <rect x={0} y={0} width={C.w} height={C.h} rx={16}
          fill={active ? accStr + '0.05)' : 'rgba(120,180,230,0.03)'}
          stroke={active ? accStr + '0.55)' : 'rgba(120,180,230,0.14)'} strokeWidth={1.4} />

        {/* hlavička */}
        <text x={28} y={44} fontFamily={mono} fontSize={17} fontWeight={600} fill={active ? m.hex : '#7d8ea0'}>{m.n}</text>
        <text x={64} y={44} fontFamily={sans} fontSize={24} fontWeight={600} fill="#eaf2fa">{m.name}</text>
        <text x={64} y={72} fontFamily={mono} fontSize={15} fill={m.hex}>{m.sub}</text>
        <path d={`M${C.w - 40},${32} l11,7 l-11,7 Z`} fill={active ? accStr + '0.85)' : 'rgba(150,180,210,0.55)'}
          style={{ animation: 'pvPulse 1.8s ease-in-out infinite' }} />

        {/* atmosféra / ohřev nad povrchem */}
        {m.key !== 'pk' && (
          <g opacity={partsOp}>
            <text x={ST.x} y={ST.y - 22} fontFamily={mono} fontSize={13.5} fill={m.hex}>{m.key === 'cem' ? 'C ↓' : 'N ↓'}</text>
            {PARTS.map((pt, i) => {
              const local = ((t + pt.delay) % 2.0) / 2.0;
              const py = (ST.y - 16) + local * 30;
              return <circle key={i} cx={pt.x} cy={py} r={pt.r} fill={m.hex} opacity={Math.sin(Math.PI * local) * 0.9} />;
            })}
          </g>
        )}
        {m.key === 'pk' && (
          <g>
            <g opacity={heatGlow}>
              <rect x={ST.x} y={ST.y - 14} width={ST.w} height={10} rx={4} fill="rgba(235,100,60,0.5)" />
              <text x={ST.x + ST.w + 10} y={ST.y - 5} fontFamily={mono} fontSize={13.5} fill="#eb6a3c">indukční ohřev</text>
            </g>
            <g opacity={quenchFlash}>
              <text x={ST.x + ST.w + 10} y={ST.y - 5} fontFamily={mono} fontSize={13.5} fill="#5fc0ef">sprcha ❄</text>
            </g>
          </g>
        )}

        {/* řez vrstvou */}
        {slices}
        <rect x={ST.x} y={ST.y} width={ST.w} height={ST.h} fill="#eb6a3c" opacity={m.key === 'pk' ? heatGlow * 0.18 * 1 : 0} />
        <rect x={ST.x} y={ST.y} width={ST.w} height={ST.h} fill="#5fc0ef" opacity={m.key === 'pk' ? quenchFlash * 0.15 : 0} />
        <rect x={ST.x} y={ST.y} width={ST.w} height={ST.h} fill="none" stroke="rgba(150,196,236,0.35)" strokeWidth={1.3} />
        <line x1={ST.x} y1={ST.y} x2={ST.x + ST.w} y2={ST.y} stroke={accStr + (0.4 + 0.5 * p).toFixed(2) + ')'} strokeWidth={2.2} />
        <text x={ST.x} y={ST.y - 34} fontFamily={mono} fontSize={13} letterSpacing="0.18em" fill="#aebfcf">POVRCH</text>
        <text x={ST.x} y={ST.y + ST.h + 20} fontFamily={mono} fontSize={13} letterSpacing="0.18em" fill="#7d8ea0">JÁDRO</text>

        {/* hloubková osa */}
        {[0, 1, 2, 3, 4].map((d) => (
          <g key={'d' + d}>
            <line x1={ST.x - 7} y1={stY(d)} x2={ST.x} y2={stY(d)} stroke="rgba(150,180,210,0.4)" strokeWidth={1.1} />
            <text x={ST.x - 11} y={stY(d) + 4} fontFamily={mono} fontSize={12.5} fill="#7d8ea0" textAnchor="end">{d}</text>
          </g>
        ))}

        {/* značka hloubky vrstvy */}
        <g opacity={depthMarkOp}>
          <line x1={ST.x - 4} y1={stY(m.d550)} x2={ST.x + ST.w + 4} y2={stY(m.d550)} stroke={m.hex} strokeWidth={1.6} strokeDasharray="6 5" />
          <rect x={ST.x + ST.w / 2 - 54} y={stY(m.d550) + 6} width={108} height={38} rx={6} fill="rgba(8,11,18,0.62)" />
          <text x={ST.x + ST.w / 2} y={stY(m.d550) + 21} fontFamily={mono} fontSize={12.5} fontWeight={600} fill={m.hex} textAnchor="middle">{m.depthNote}</text>
          <text x={ST.x + ST.w / 2} y={stY(m.d550) + 37} fontFamily={mono} fontSize={13.5} fontWeight={600} fill={m.hex} textAnchor="middle">≈ {czNum(m.d550, 2)} mm</text>
        </g>

        {/* parametry */}
        <g opacity={factsOp}>
          {m.facts.map(([lab, val], fi) => (
            <g key={fi}>
              <text x={228} y={140 + fi * 40} fontFamily={mono} fontSize={14} fill="#7d8ea0">{lab}</text>
              <text x={344} y={140 + fi * 40} fontFamily={mono} fontSize={15.5} fontWeight={500} fill="#dbe6f0">{val}</text>
            </g>
          ))}
          <foreignObject x={228} y={318} width={C.w - 256} height={110}>
            <div style={{ fontFamily: sans, fontSize: 15, lineHeight: 1.5, color: '#9fb0c0' }}>{m.note}</div>
          </foreignObject>
        </g>
      </g>
    );
  });

  // ── křivky v grafu ──
  const curves = METHODS.map((m) => {
    const rev = clamp((t - m.revStart) / m.revDur, 0, 1);
    if (rev <= 0.01) return null;
    const pts = [];
    for (let i = 0; i <= 120; i++) {
      const d = (DEPTH_MAX * i) / 120;
      pts.push(`${chX(d).toFixed(1)},${chY(m.hvF(d)).toFixed(1)}`);
    }
    return (
      <g key={'cv' + m.key}>
        <clipPath id={`crev-${m.key}`}>
          <rect x={CH.x + CH.padL} y={CH.y} width={(CH.w - CH.padL - CH.padR) * rev} height={CH.h} />
        </clipPath>
        <path d={'M' + pts.join(' L')} fill="none" stroke={m.hex} strokeWidth={3} strokeLinecap="round" clipPath={`url(#crev-${m.key})`} />
      </g>
    );
  });

  const anyCurve = t > METHODS[0].revStart + 0.3;

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <style>{`
        @keyframes pvPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        @keyframes pvRing { 0%, 100% { box-shadow: 0 0 0 0 rgba(244,197,66,0); } 50% { box-shadow: 0 0 0 4px rgba(244,197,66,0.18); } }
      `}</style>
      <div style={{ position: 'absolute', inset: 0,
        background: 'radial-gradient(120% 90% at 40% 44%, rgba(30,52,80,0.45) 0%, rgba(9,13,20,0) 62%)' }} />

      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        {panels}

        {/* ══ společný graf tvrdost × hloubka ══ */}
        <rect x={CH.x} y={CH.y} width={CH.w} height={CH.h} rx={16} fill="rgba(120,180,230,0.03)" stroke="rgba(120,180,230,0.14)" />
        <text x={CH.x + 24} y={CH.y + 28} fontFamily={mono} fontSize={18} letterSpacing="0.18em" fill="#7fb4d6">TVRDOST × HLOUBKA · SPOLEČNÉ MĚŘÍTKO</text>
        {METHODS.map((m, i) => (
          <g key={'lg' + m.key}>
            <rect x={CH.x + 560 + i * 240} y={CH.y + 16} width={22} height={4} rx={2} fill={m.hex} />
            <text x={CH.x + 590 + i * 240} y={CH.y + 24} fontFamily={mono} fontSize={15} fill="#c9d6e2">{m.name.toLowerCase()}</text>
          </g>
        ))}
        {[0, 1, 2, 3, 4].map((d) => (
          <g key={'gx' + d}>
            <line x1={chX(d)} y1={CH.y + CH.padT} x2={chX(d)} y2={CH.y + CH.h - CH.padB} stroke="rgba(150,180,210,0.08)" />
            <text x={chX(d)} y={CH.y + CH.h - CH.padB + 20} fontFamily={mono} fontSize={15} fill="#7d8ea0" textAnchor="middle">{d}</text>
          </g>
        ))}
        {[0, 300, 550, 900, 1200].map((v) => (
          <g key={'gy' + v}>
            <line x1={CH.x + CH.padL} y1={chY(v)} x2={CH.x + CH.w - CH.padR} y2={chY(v)}
              stroke={v === 550 ? 'rgba(244,197,66,0.28)' : 'rgba(150,180,210,0.08)'} strokeDasharray={v === 550 ? '6 6' : 'none'} />
            <text x={CH.x + CH.padL - 10} y={chY(v) + 4} fontFamily={mono} fontSize={15} fill={v === 550 ? '#d3ad55' : '#7d8ea0'} textAnchor="end">{v}</text>
          </g>
        ))}
        <text x={CH.x + 30} y={CH.y + (CH.padT + CH.h - CH.padB) / 2} fontFamily={mono} fontSize={16} fill="#aebfcf" textAnchor="middle"
          transform={`rotate(-90 ${CH.x + 30} ${CH.y + (CH.padT + CH.h - CH.padB) / 2})`}>tvrdost [HV]</text>
        <text x={CH.x + CH.w / 2} y={CH.y + CH.h - 8} fontFamily={mono} fontSize={16} fill="#aebfcf" textAnchor="middle">hloubka pod povrchem [mm]</text>
        <text x={CH.x + CH.w - CH.padR - 8} y={chY(550) - 8} fontFamily={mono} fontSize={14.5} fill="#d3ad55" textAnchor="end">mez tvrdé vrstvy</text>
        {/* tlačítko 550 HV – nápověda */}
        <g onClick={() => setShowHelp(true)} style={{ cursor: 'pointer' }}>
          <rect x={CH.x + CH.w - 150} y={CH.y + 12} width={118} height={32} rx={8}
            fill="rgba(244,197,66,0.12)" stroke="rgba(244,197,66,0.6)" strokeWidth={1.4}
            style={{ animation: 'pvPulse 1.8s ease-in-out infinite' }} />
          <text x={CH.x + CH.w - 91} y={CH.y + 33} fontFamily={mono} fontSize={15} fontWeight={600} fill="#f4c542" textAnchor="middle">550 HV ?</text>
        </g>
        {!anyCurve && (
          <text x={CH.x + CH.padL + (CH.w - CH.padL - CH.padR) / 2} y={(chY(0) + chY(HV_MAX)) / 2}
            fontFamily={mono} fontSize={17} fill="#5c6b7c" textAnchor="middle">křivky se vykreslí postupně u jednotlivých metod</text>
        )}
        {curves}

        {/* odečtová čára */}
        <g opacity={scanOp}>
          <line x1={chX(scanDepth)} y1={CH.y + CH.padT} x2={chX(scanDepth)} y2={CH.y + CH.h - CH.padB}
            stroke="#58f58b" strokeWidth={1.8} strokeDasharray="7 6" />
          <text x={chX(scanDepth)} y={CH.y + CH.padT + 18} fontFamily={mono} fontSize={16} fontWeight={600} fill="#58f58b" textAnchor={scanDepth < 1 ? 'start' : 'end'} dx={scanDepth < 1 ? 10 : -10}>
            {czNum(scanDepth, 2)} mm
          </text>
          {METHODS.map((m) => (
            <g key={'sc' + m.key}>
              <circle cx={chX(scanDepth)} cy={chY(m.hvF(scanDepth))} r={5.5} fill={m.hex} stroke="#0b0e15" strokeWidth={1.5} />
            </g>
          ))}
          {/* odečtový box */}
          <g transform={`translate(${scanDepth < 3 ? CH.x + CH.w - 330 : CH.x + CH.padL + 26},${CH.y + 48})`}>
            <rect x={0} y={0} width={296} height={118} rx={10} fill="rgba(10,16,24,0.88)" stroke="rgba(120,180,230,0.25)" />
            {METHODS.map((m, i) => (
              <g key={'ro' + m.key}>
                <circle cx={20} cy={26 + i * 32} r={5} fill={m.hex} />
                <text x={36} y={31 + i * 32} fontFamily={mono} fontSize={15} fill="#c9d6e2">{m.name.toLowerCase()}</text>
                <text x={276} y={31 + i * 32} fontFamily={mono} fontSize={16} fontWeight={600} fill={m.hex} textAnchor="end">
                  {Math.round(m.hvF(scanDepth))} HV
                </text>
              </g>
            ))}
          </g>
          {manualDepth == null && (
            <text x={CH.x + CH.padL + 8} y={CH.y + CH.h - CH.padB - 12} fontFamily={mono} fontSize={14} fill="#58f58b"
              style={{ animation: 'pvPulse 1.8s ease-in-out infinite' }}>⇔ táhněte čáru pro odečet tvrdostí</text>
          )}
        </g>
        {dragActive && (
          <rect x={CH.x + CH.padL} y={CH.y + CH.padT} width={CH.w - CH.padL - CH.padR} height={CH.h - CH.padT - CH.padB}
            fill="transparent" style={{ cursor: 'ew-resize', touchAction: 'none' }}
            onPointerDown={onScanDown} onPointerMove={onScanMove} />
        )}
      </svg>

      {/* nápověda 550 HV */}
      {showHelp && (
        <div onClick={() => setShowHelp(false)} style={{ position: 'absolute', inset: 0, zIndex: 20,
          background: 'rgba(5,8,13,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 720, background: '#0e1522', borderRadius: 16,
            border: '1.4px solid rgba(244,197,66,0.4)', padding: '30px 36px 32px', position: 'relative',
            boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <button onClick={() => setShowHelp(false)} style={{ position: 'absolute', top: 14, right: 14, width: 34, height: 34,
              borderRadius: 8, border: '1px solid rgba(120,180,230,0.25)', background: 'rgba(120,180,230,0.06)',
              color: '#c9d6e2', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
            <div style={{ fontFamily: mono, fontSize: 15, letterSpacing: '0.2em', color: '#f4c542', marginBottom: 10 }}>PROČ PRÁVĚ 550 HV?</div>
            <div style={{ fontFamily: sans, fontSize: 17, lineHeight: 1.6, color: '#dbe6f0', marginBottom: 18 }}>
              550 HV je smluvní hranice pro měření hloubky tvrdé vrstvy (dle norem, např. ISO 2639).
              Hloubka vrstvy = vzdálenost od povrchu, kde tvrdost klesne právě na 550 HV (≈ 52,3 HRC) —
              zhruba hranice, pod kterou už materiál nepovažujeme za „zakalený“. Díky společné mezi lze metody férově porovnat.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '96px 1fr', rowGap: 12, columnGap: 18,
              fontFamily: sans, fontSize: 16, lineHeight: 1.55, color: '#b8c6d4' }}>
              <div style={{ fontFamily: mono, fontWeight: 600, color: '#efab54' }}>CHD</div>
              <div><b style={{ color: '#dbe6f0' }}>Case Hardening Depth</b> — hloubka cementované vrstvy: vzdálenost od povrchu k místu s 550 HV.</div>
              <div style={{ fontFamily: mono, fontWeight: 600, color: '#58d0a8' }}>Nht</div>
              <div><b style={{ color: '#dbe6f0' }}>nitridační hloubka tvrdosti</b> — totéž pro nitridaci; v praxi se často měří k mezi „tvrdost jádra + 50 HV“, zde pro srovnání jednotně 550 HV.</div>
              <div style={{ fontFamily: mono, fontWeight: 600, color: '#8fa4f0' }}>DS</div>
              <div><b style={{ color: '#dbe6f0' }}>hloubka zakalené vrstvy</b> (Einhärtungstiefe) — u povrchového kalení hloubka, kde tvrdost klesne na 550 HV.</div>
            </div>
          </div>
        </div>
      )}

      {/* titul */}
      <div style={{ position: 'absolute', left: 84, top: 74 }}>
        <div style={{ fontFamily: mono, fontSize: 17, letterSpacing: '0.28em', color: '#5fc0ef', textTransform: 'uppercase' }}>Povrchové úpravy oceli</div>
        <div style={{ fontFamily: sans, fontSize: 36, fontWeight: 600, color: '#eaf2fa', marginTop: 8, letterSpacing: '-0.01em' }}>Cementace × nitridace × povrchové kalení</div>
      </div>

      {/* popisky fází */}
      {captions.map((s, i) => (
        <div key={'cap' + i} style={{ position: 'absolute', left: 84, top: 164, width: 1500, opacity: fade(t, s.a, s.b, s.c, s.d),
          fontFamily: sans, fontSize: 20, color: '#c9d6e2' }}>{s.txt}</div>
      ))}

      {/* spodní ovládání */}
      <div style={{ position: 'absolute', left: 84, top: 1002, right: 84, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={playAll} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '11px 22px', borderRadius: 10, cursor: 'pointer',
          fontFamily: mono, fontSize: 15.5, fontWeight: 600, border: 'none', color: '#0b0e15', letterSpacing: '0.03em',
          background: '#f4c542', flexShrink: 0, animation: 'pvRing 1.8s ease-in-out infinite' }}>
          <svg width="12" height="13" viewBox="0 0 12 13"><path d="M1 1 L11 6.5 L1 12 Z" fill="#0b0e15" /></svg>
          Přehrát vše od začátku
        </button>
        <div style={{ display: 'flex', gap: 10, flex: 1 }}>
          {PHASES.map((p, i) => {
            const active = t >= p.t0 && (t < p.t1 || i === PHASES.length - 1);
            const prog = clamp((t - p.t0) / (p.t1 - p.t0), 0, 1);
            return (
              <button key={i} onClick={() => playPhase(p)} style={{
                position: 'relative', flex: 1, padding: '10px 16px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                fontFamily: mono, fontSize: 15, fontWeight: 600, overflow: 'hidden',
                border: active ? '1.4px solid rgba(244,197,66,0.55)' : '1.4px solid rgba(120,180,230,0.18)',
                background: active ? 'rgba(244,197,66,0.1)' : 'rgba(120,180,230,0.04)',
                color: active ? '#eaf2fa' : '#93a5b6', animation: active ? 'none' : 'pvRing 1.8s ease-in-out infinite' }}>
                <span style={{ color: active ? '#f4c542' : '#7d8ea0', marginRight: 10 }}>{p.n}</span>{p.lab}
                {prog > 0 && <span style={{ position: 'absolute', left: 4, bottom: 3, height: 3, borderRadius: 1.5,
                  width: `calc(${(prog * 100).toFixed(1)}% - 8px)`, background: 'rgba(244,197,66,0.7)' }} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PorovnaniVrstevAnimation() {
  return (
    <Stage width={1920} height={1080} duration={36} background="#080b12" persistKey="porovnani-vrstev" loop={false} autoplay={false}>
      <Scene />
    </Stage>
  );
}

window.PorovnaniVrstevAnimation = PorovnaniVrstevAnimation;
