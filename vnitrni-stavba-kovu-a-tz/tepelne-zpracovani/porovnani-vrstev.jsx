// porovnani-vrstev.jsx — Porovnání povrchového zpracování: cementace, nitridace,
// povrchové kalení a nitrocementace. Čtyři panely vedle sebe (řez vrstvou + parametry)
// a společný graf tvrdost × hloubka. Každá metoda si nese vlastní mez hloubky vrstvy.
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
const FEC = window.FEC || {   // vnitrni-stavba-kovu-a-tz/fe-c-konstanty.js (záložní kopie, kdyby se soubor nenačetl)
  C_P: 0.018, C_S: 0.765, C_E: 2.14, C_C: 4.3, C_CEM: 6.68, EUT_TOL: 0.02,
  T_A: 1538, T_G: 911, T_EUT: 1147, T_A1: 727, T_D: 1380,
  CEM: { HV_SURFACE: 690, HRC_SURFACE: 60, HV_CORE: 165, C_CORE: 0.17 },
  cz: function (v, dec) { return (dec == null ? String(v) : v.toFixed(dec)).replace('.', ','); },
};
const DEPTH_MAX = 4;      // mm, společné měřítko
const HV_MAX = 1200;
const CEM_C_CORE = FEC.cz(FEC.CEM.C_CORE, 2);

const METHODS = [
  {
    key: 'cem', n: '01', name: 'Cementace', sub: '~930 °C · CO / CH₄',
    acc: [239, 171, 84], hex: '#efab54',
    core: FEC.CEM.HV_CORE,
    hvF: (d) => FEC.CEM.HV_CORE + (FEC.CEM.HV_SURFACE - FEC.CEM.HV_CORE) * Math.exp(-Math.pow(d / 0.85, 2.4)),
    t0: 0, t1: 8,
    pStart: 1.2, pDur: 5.5, revStart: 2.2, revDur: 5,
    facts: [
      ['teplota', '~930 °C'],
      ['prostředí', 'CO / CH₄ (uhlík)'],
      ['povrch', '~690 HV (≈60 HRC)'],
      ['hloubka', '0,5–1,5 mm'],
      ['ocel', 'nízkouhlíková ~' + CEM_C_CORE + ' % C'],
    ],
    note: 'mění se složení povrchu · nutné kalení a popuštění',
    abbr: 'CHD', norm: 'ISO 2639', labelD: 2.62, labelDy: -8,
    // mez CHD: pevných 550 HV
    limitF: () => 550,
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
    abbr: 'Nht', norm: 'DIN 50190-3', labelD: 0.95, labelDy: -8,
    // mez Nht: tvrdost jádra + 50 HV
    limitF: (m) => m.core + 50,
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
    abbr: 'DS', norm: 'ISO 3754', labelD: 1.9, labelDy: 20,
    // mez DS (Rht): 0,8 × povrchová tvrdost
    limitF: (m) => 0.8 * m.hvF(0),
  },
  {
    key: 'nitcem', n: '04', name: 'Nitrocementace', sub: '820–880 °C · CO + NH₃',
    acc: [232, 143, 192], hex: '#e88fc0',
    core: FEC.CEM.HV_CORE,
    hvF: (d) => FEC.CEM.HV_CORE + (750 - FEC.CEM.HV_CORE) * Math.exp(-Math.pow(d / 0.35, 2.4)),
    t0: 24, t1: 30,
    pStart: 25, pDur: 4, revStart: 25.6, revDur: 3.6,
    facts: [
      ['teplota', '820–880 °C'],
      ['prostředí', 'CO + NH₃ (uhlík i dusík)'],
      ['povrch', '~750 HV (≈62 HRC)'],
      ['hloubka', '0,1–0,8 mm'],
      ['ocel', 'nízkouhlíková, i neušlechtilá'],
    ],
    note: 'levnější a rychlejší než cementace · nižší teplota → menší deformace · vrstva je ale tenčí',
    abbr: 'CHD', norm: 'ISO 2639',
    limitF: () => 550,
  },
];

// mez hloubky vrstvy a hloubka, kde tvrdost klesne pod tuto mez — pro každou metodu vlastní
METHODS.forEach((m) => {
  m.hvLimit = m.limitF(m);
  let dLimit = 0;
  for (let i = 0; i <= 600; i++) { const d = (DEPTH_MAX * i) / 600; if (m.hvF(d) >= m.hvLimit) dLimit = d; else break; }
  m.dLimit = dLimit;
  m.depthNote = m.abbr + ' (' + Math.round(m.hvLimit) + ' HV)';
});

// mezní čáry v grafu — metody se stejnou mezí dostanou jednu čáru
const LIMIT_LINES = [];
METHODS.forEach((m) => {
  const hv = Math.round(m.hvLimit);
  const g = LIMIT_LINES.find((l) => Math.abs(l.hv - hv) < 6);
  if (g) { if (g.abbrs.indexOf(m.abbr) < 0) g.abbrs.push(m.abbr); }
  else LIMIT_LINES.push({ hv, hex: m.hex, acc: m.acc, abbrs: [m.abbr], labelD: m.labelD, labelDy: m.labelDy });
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
  { x: 84, y: 208, w: 402, h: 470 },
  { x: 534, y: 208, w: 402, h: 470 },
  { x: 984, y: 208, w: 402, h: 470 },
  { x: 1434, y: 208, w: 402, h: 470 },
];
const ST = { x: 24, y: 118, w: 86, h: 312 };    // řez vrstvou uvnitř panelu
const FX = 150;                                  // sloupec parametrů uvnitř panelu
const CH = { x: 84, y: 702, w: 1752, h: 262, padL: 96, padR: 30, padT: 44, padB: 46 };

const chX = (d) => CH.x + CH.padL + (clamp(d, 0, DEPTH_MAX) / DEPTH_MAX) * (CH.w - CH.padL - CH.padR);
const chY = (hv) => CH.y + CH.padT + (1 - clamp(hv, 0, HV_MAX) / HV_MAX) * (CH.h - CH.padT - CH.padB);
const stY = (d) => ST.y + (clamp(d, 0, DEPTH_MAX) / DEPTH_MAX) * ST.h;

const DUR = 44;
const T_CMP = 30;   // začátek závěrečného porovnání
const PHASES = [
  { t0: 0, t1: 8, n: '01', lab: 'Cementace' },
  { t0: 8, t1: 16, n: '02', lab: 'Nitridace' },
  { t0: 16, t1: 24, n: '03', lab: 'Povrchové kalení' },
  { t0: 24, t1: 30, n: '04', lab: 'Nitrocementace' },
  { t0: 30, t1: DUR, n: '05', lab: 'Porovnání' },
];

// částice pro sytící atmosféry
const PARTS = [];
for (let i = 0; i < 12; i++) PARTS.push({ x: ST.x + 6 + ((i * 29) % (ST.w - 12)), delay: (i * 0.61) % 2.0, r: 1.8 + (i % 3) * 0.6 });

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
      if (doJump) setTime(DUR);   // po 01–04 skoč rovnou na porovnání
    }
  }, [t, setPlaying, setTime]);

  const playPhase = (p) => {
    setManualDepth(null);
    if (p.n === '05') {
      // porovnání se nepřehrává – rovnou interaktivní odečet
      segEndRef.current = null;
      jumpRef.current = false;
      setPlaying(false);
      setTime(DUR);
      return;
    }
    segEndRef.current = p.t1;
    jumpRef.current = false;
    setTime(p.t0);
    setPlaying(true);
  };
  const playAll = () => {
    segEndRef.current = T_CMP;   // přehraje 01–04…
    jumpRef.current = true;      // …a pak skočí na porovnání
    setManualDepth(null);
    setTime(0);
    setPlaying(true);
  };

  // ── odečtová čára ──
  const scanOp = fade(t, T_CMP + 0.3, T_CMP + 1, DUR, DUR + 1);
  const autoDepth = interpolate([T_CMP + 1.2, T_CMP + 6.5, T_CMP + 9, DUR], [0.05, DEPTH_MAX, 0.8, 0.8], Easing.easeInOutCubic)(clamp(t, T_CMP + 1.2, DUR));
  const scanDepth = manualDepth != null ? manualDepth : autoDepth;
  const dragActive = t >= T_CMP;
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
    { txt: 'Cementace: povrch se sytí uhlíkem (~930 °C), pak se kalí a popouští · tvrdá vrstva ~690 HV do ~0,5 mm', a: 0.3, b: 1, c: 7.4, d: 8.2 },
    { txt: 'Nitridace: povrch se sytí dusíkem (500–550 °C) bez kalení · nejtvrdší, ale tenká vrstva ~1100 HV do ~0,4 mm', a: 8.1, b: 8.8, c: 15.4, d: 16.2 },
    { txt: 'Povrchové kalení: indukční ohřev povrchu a sprcha · složení se nemění, prokalí se až několik mm', a: 16.1, b: 16.8, c: 23.4, d: 24.2 },
    { txt: 'Nitrocementace: uhlík i dusík současně (820–880 °C) · nejrozšířenější v sériové výrobě, tenčí vrstva ~750 HV', a: 24.1, b: 24.8, c: 29.4, d: 30.2 },
    { txt: 'Porovnání: táhněte čáru v grafu · nitridace = nejtvrdší povrch, povrchové kalení = největší hloubka, nitrocementace = kompromis mezi nimi (levná, ale tenká vrstva)', a: 30.1, b: 30.8, c: DUR, d: DUR + 1 },
  ];

  // ── panely metod ──
  const panels = METHODS.map((m, mi) => {
    const C = COLS[mi];
    const p = progressOf(m, t);
    const active = t >= m.t0 && t < m.t1;
    const factsOp = 0.3 + 0.7 * clamp((t - m.t0 - 0.5) / 0.8, 0, 1);
    const partsOp = m.key === 'cem' ? fade(t, 1, 1.6, 6.4, 7.4)
      : m.key === 'nit' ? fade(t, 9, 9.6, 14.4, 15.4)
        : m.key === 'nitcem' ? fade(t, 24.8, 25.4, 29.2, 29.9) : 0;

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
        <text x={20} y={42} fontFamily={mono} fontSize={16} fontWeight={600} fill={active ? m.hex : '#7d8ea0'}>{m.n}</text>
        <text x={52} y={42} fontFamily={sans} fontSize={21} fontWeight={600} fill="#eaf2fa">{m.name}</text>
        <text x={52} y={68} fontFamily={mono} fontSize={13} fill={m.hex}>{m.sub}</text>
        <path d={`M${C.w - 34},${30} l10,6.5 l-10,6.5 Z`} fill={active ? accStr + '0.85)' : 'rgba(150,180,210,0.55)'}
          style={{ animation: 'pvPulse 1.8s ease-in-out infinite' }} />

        {/* atmosféra / ohřev nad povrchem */}
        {m.key !== 'pk' && (
          <g opacity={partsOp}>
            <text x={ST.x} y={ST.y - 22} fontFamily={mono} fontSize={13} fill={m.hex}>
              {m.key === 'cem' ? 'C ↓' : m.key === 'nit' ? 'N ↓' : 'C + N ↓'}
            </text>
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
              <text x={ST.x + ST.w + 10} y={ST.y - 5} fontFamily={mono} fontSize={12.5} fill="#eb6a3c">indukční ohřev</text>
            </g>
            <g opacity={quenchFlash}>
              <text x={ST.x + ST.w + 10} y={ST.y - 5} fontFamily={mono} fontSize={12.5} fill="#5fc0ef">sprcha ❄</text>
            </g>
          </g>
        )}

        {/* řez vrstvou */}
        {slices}
        <rect x={ST.x} y={ST.y} width={ST.w} height={ST.h} fill="#eb6a3c" opacity={m.key === 'pk' ? heatGlow * 0.18 : 0} />
        <rect x={ST.x} y={ST.y} width={ST.w} height={ST.h} fill="#5fc0ef" opacity={m.key === 'pk' ? quenchFlash * 0.15 : 0} />
        <rect x={ST.x} y={ST.y} width={ST.w} height={ST.h} fill="none" stroke="rgba(150,196,236,0.35)" strokeWidth={1.3} />
        <line x1={ST.x} y1={ST.y} x2={ST.x + ST.w} y2={ST.y} stroke={accStr + (0.4 + 0.5 * p).toFixed(2) + ')'} strokeWidth={2.2} />
        <text x={ST.x} y={ST.y - 34} fontFamily={mono} fontSize={12.5} letterSpacing="0.18em" fill="#aebfcf">POVRCH</text>
        <text x={ST.x} y={ST.y + ST.h + 20} fontFamily={mono} fontSize={12.5} letterSpacing="0.18em" fill="#7d8ea0">JÁDRO</text>

        {/* hloubková osa */}
        {[0, 1, 2, 3, 4].map((d) => (
          <g key={'d' + d}>
            <line x1={ST.x - 6} y1={stY(d)} x2={ST.x} y2={stY(d)} stroke="rgba(150,180,210,0.4)" strokeWidth={1.1} />
            <text x={ST.x - 10} y={stY(d) + 4} fontFamily={mono} fontSize={12} fill="#7d8ea0" textAnchor="end">{d}</text>
          </g>
        ))}

        {/* značka hloubky vrstvy — vlastní mez metody */}
        <g opacity={depthMarkOp}>
          <line x1={ST.x - 4} y1={stY(m.dLimit)} x2={ST.x + ST.w + 4} y2={stY(m.dLimit)} stroke={m.hex} strokeWidth={1.6} strokeDasharray="6 5" />
          <rect x={ST.x - 2} y={stY(m.dLimit) + 6} width={116} height={38} rx={6} fill="rgba(8,11,18,0.7)" />
          <text x={ST.x + 56} y={stY(m.dLimit) + 21} fontFamily={mono} fontSize={12.5} fontWeight={600} fill={m.hex} textAnchor="middle">{m.depthNote}</text>
          <text x={ST.x + 56} y={stY(m.dLimit) + 37} fontFamily={mono} fontSize={13.5} fontWeight={600} fill={m.hex} textAnchor="middle">≈ {czNum(m.dLimit, 2)} mm</text>
        </g>

        {/* parametry */}
        <g opacity={factsOp}>
          {m.facts.map(([lab, val], fi) => (
            <g key={fi}>
              <text x={FX} y={126 + fi * 52} fontFamily={mono} fontSize={12.5} letterSpacing="0.06em" fill="#7d8ea0">{lab}</text>
              <text x={FX} y={148 + fi * 52} fontFamily={mono} fontSize={13.5} fontWeight={500} fill="#dbe6f0">{val}</text>
            </g>
          ))}
          <foreignObject x={FX} y={378} width={C.w - FX - 22} height={88}>
            <div style={{ fontFamily: sans, fontSize: 13.5, lineHeight: 1.45, color: '#9fb0c0' }}>{m.note}</div>
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
        <text x={CH.x + 24} y={CH.y + 28} fontFamily={mono} fontSize={17} letterSpacing="0.18em" fill="#7fb4d6">TVRDOST × HLOUBKA</text>
        {METHODS.map((m, i) => (
          <g key={'lg' + m.key}>
            <rect x={CH.x + 380 + i * 250} y={CH.y + 16} width={22} height={4} rx={2} fill={m.hex} />
            <text x={CH.x + 410 + i * 250} y={CH.y + 24} fontFamily={mono} fontSize={14.5} fill="#c9d6e2">{m.name.toLowerCase()}</text>
          </g>
        ))}
        {[0, 1, 2, 3, 4].map((d) => (
          <g key={'gx' + d}>
            <line x1={chX(d)} y1={CH.y + CH.padT} x2={chX(d)} y2={CH.y + CH.h - CH.padB} stroke="rgba(150,180,210,0.08)" />
            <text x={chX(d)} y={CH.y + CH.h - CH.padB + 20} fontFamily={mono} fontSize={15} fill="#7d8ea0" textAnchor="middle">{d}</text>
          </g>
        ))}
        {[0, 300, 600, 900, 1200].map((v) => (
          <g key={'gy' + v}>
            <line x1={CH.x + CH.padL} y1={chY(v)} x2={CH.x + CH.w - CH.padR} y2={chY(v)} stroke="rgba(150,180,210,0.08)" />
            <text x={CH.x + CH.padL - 10} y={chY(v) + 4} fontFamily={mono} fontSize={15} fill="#7d8ea0" textAnchor="end">{v}</text>
          </g>
        ))}

        {/* mezní čáry hloubky vrstvy — každá metoda má vlastní mez */}
        {LIMIT_LINES.map((l) => (
          <g key={'lim' + l.hv}>
            <line x1={CH.x + CH.padL} y1={chY(l.hv)} x2={CH.x + CH.w - CH.padR} y2={chY(l.hv)}
              stroke={`rgba(${l.acc[0]},${l.acc[1]},${l.acc[2]},0.45)`} strokeWidth={1.3} strokeDasharray="7 6" />
            <text x={chX(l.labelD)} y={chY(l.hv) + l.labelDy} fontFamily={mono} fontSize={14} fontWeight={600} fill={l.hex}>
              {l.abbrs.join(' / ')} — mez {l.hv} HV
            </text>
          </g>
        ))}

        <text x={CH.x + 30} y={CH.y + (CH.padT + CH.h - CH.padB) / 2} fontFamily={mono} fontSize={16} fill="#aebfcf" textAnchor="middle"
          transform={`rotate(-90 ${CH.x + 30} ${CH.y + (CH.padT + CH.h - CH.padB) / 2})`}>tvrdost [HV]</text>
        <text x={CH.x + CH.w / 2} y={CH.y + CH.h - 8} fontFamily={mono} fontSize={16} fill="#aebfcf" textAnchor="middle">hloubka pod povrchem [mm]</text>

        {/* tlačítko nápovědy k mezím */}
        <g onClick={() => setShowHelp(true)} style={{ cursor: 'pointer' }}>
          <rect x={CH.x + CH.w - 172} y={CH.y + 12} width={140} height={32} rx={8}
            fill="rgba(244,197,66,0.12)" stroke="rgba(244,197,66,0.6)" strokeWidth={1.4}
            style={{ animation: 'pvPulse 1.8s ease-in-out infinite' }} />
          <text x={CH.x + CH.w - 102} y={CH.y + 33} fontFamily={mono} fontSize={14.5} fontWeight={600} fill="#f4c542" textAnchor="middle">mez vrstvy ?</text>
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
            <circle key={'sc' + m.key} cx={chX(scanDepth)} cy={chY(m.hvF(scanDepth))} r={5.5} fill={m.hex} stroke="#0b0e15" strokeWidth={1.5} />
          ))}
          {/* odečtový box */}
          <g transform={`translate(${scanDepth < 3 ? CH.x + CH.w - 330 : CH.x + CH.padL + 26},${CH.y + 52})`}>
            <rect x={0} y={0} width={296} height={146} rx={10} fill="rgba(10,16,24,0.88)" stroke="rgba(120,180,230,0.25)" />
            {METHODS.map((m, i) => (
              <g key={'ro' + m.key}>
                <circle cx={20} cy={26 + i * 32} r={5} fill={m.hex} />
                <text x={36} y={31 + i * 32} fontFamily={mono} fontSize={14.5} fill="#c9d6e2">{m.name.toLowerCase()}</text>
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

      {/* legenda zkratek pod grafem */}
      <div style={{ position: 'absolute', left: 84, top: 968, width: 1752, fontFamily: mono, fontSize: 13.5, color: '#7d8ea0' }}>
        CHD / Eht — hloubka cementované vrstvy · Nht — hloubka nitridované vrstvy · DS / Rht — hloubka zakalené vrstvy
      </div>

      {/* nápověda k mezím hloubky */}
      {showHelp && (
        <div onClick={() => setShowHelp(false)} style={{ position: 'absolute', inset: 0, zIndex: 20,
          background: 'rgba(5,8,13,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 760, background: '#0e1522', borderRadius: 16,
            border: '1.4px solid rgba(244,197,66,0.4)', padding: '30px 36px 32px', position: 'relative',
            boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <button onClick={() => setShowHelp(false)} style={{ position: 'absolute', top: 14, right: 14, width: 34, height: 34,
              borderRadius: 8, border: '1px solid rgba(120,180,230,0.25)', background: 'rgba(120,180,230,0.06)',
              color: '#c9d6e2', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
            <div style={{ fontFamily: mono, fontSize: 15, letterSpacing: '0.2em', color: '#f4c542', marginBottom: 10 }}>KDE VRSTVA „KONČÍ“?</div>
            <div style={{ fontFamily: sans, fontSize: 17, lineHeight: 1.6, color: '#dbe6f0', marginBottom: 18 }}>
              Hloubka vrstvy je vzdálenost od povrchu k místu, kde tvrdost klesne na smluvní mez. Tato mez
              není pro všechny metody stejná — každá technologie má vlastní normu, protože se liší jak tvrdost
              povrchu, tak tvrdost jádra. V grafu je proto ke každé metodě vodorovná čára v její barvě.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '108px 1fr', rowGap: 12, columnGap: 18,
              fontFamily: sans, fontSize: 16, lineHeight: 1.55, color: '#b8c6d4' }}>
              <div style={{ fontFamily: mono, fontWeight: 600, color: '#efab54' }}>CHD / Eht</div>
              <div><b style={{ color: '#dbe6f0' }}>hloubka cementované vrstvy</b> (ISO 2639) — mez <b style={{ color: '#dbe6f0' }}>550 HV</b>, pevná hodnota. Stejná norma platí i pro nitrocementaci.</div>
              <div style={{ fontFamily: mono, fontWeight: 600, color: '#58d0a8' }}>Nht</div>
              <div><b style={{ color: '#dbe6f0' }}>hloubka nitridované vrstvy</b> (DIN 50190-3) — mez je <b style={{ color: '#dbe6f0' }}>tvrdost jádra + 50 HV</b>; při jádru 280 HV tedy 330 HV.</div>
              <div style={{ fontFamily: mono, fontWeight: 600, color: '#8fa4f0' }}>DS / Rht</div>
              <div><b style={{ color: '#dbe6f0' }}>hloubka zakalené vrstvy</b> (ISO 3754) — mez je <b style={{ color: '#dbe6f0' }}>0,8 × povrchová tvrdost</b>; při 650 HV na povrchu tedy 520 HV.</div>
            </div>
          </div>
        </div>
      )}

      {/* titul */}
      <div style={{ position: 'absolute', left: 84, top: 74 }}>
        <div style={{ fontFamily: mono, fontSize: 17, letterSpacing: '0.28em', color: '#5fc0ef', textTransform: 'uppercase' }}>Povrchové zpracování oceli</div>
        <div style={{ fontFamily: sans, fontSize: 34, fontWeight: 600, color: '#eaf2fa', marginTop: 8, letterSpacing: '-0.01em' }}>Cementace × nitridace × povrchové kalení × nitrocementace</div>
      </div>

      {/* popisky fází */}
      {captions.map((s, i) => (
        <div key={'cap' + i} style={{ position: 'absolute', left: 84, top: 164, width: 1660, opacity: fade(t, s.a, s.b, s.c, s.d),
          fontFamily: sans, fontSize: 19, color: '#c9d6e2' }}>{s.txt}</div>
      ))}

      {/* spodní ovládání */}
      <div style={{ position: 'absolute', left: 84, top: 1002, right: 84, display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={playAll} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '11px 20px', borderRadius: 10, cursor: 'pointer',
          fontFamily: mono, fontSize: 15, fontWeight: 600, border: 'none', color: '#0b0e15', letterSpacing: '0.03em',
          background: '#f4c542', flexShrink: 0, animation: 'pvRing 1.8s ease-in-out infinite' }}>
          <svg width="12" height="13" viewBox="0 0 12 13"><path d="M1 1 L11 6.5 L1 12 Z" fill="#0b0e15" /></svg>
          Přehrát vše od začátku
        </button>
        <div style={{ display: 'flex', gap: 9, flex: 1 }}>
          {PHASES.map((p, i) => {
            const active = t >= p.t0 && (t < p.t1 || i === PHASES.length - 1);
            const prog = clamp((t - p.t0) / (p.t1 - p.t0), 0, 1);
            return (
              <button key={i} onClick={() => playPhase(p)} style={{
                position: 'relative', flex: 1, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                fontFamily: mono, fontSize: 14, fontWeight: 600, overflow: 'hidden',
                border: active ? '1.4px solid rgba(244,197,66,0.55)' : '1.4px solid rgba(120,180,230,0.18)',
                background: active ? 'rgba(244,197,66,0.1)' : 'rgba(120,180,230,0.04)',
                color: active ? '#eaf2fa' : '#93a5b6', animation: active ? 'none' : 'pvRing 1.8s ease-in-out infinite' }}>
                <span style={{ color: active ? '#f4c542' : '#7d8ea0', marginRight: 8 }}>{p.n}</span>{p.lab}
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
    <Stage width={1920} height={1080} duration={DUR} background="#080b12" persistKey="porovnani-vrstev" loop={false} autoplay={false}>
      <Scene />
    </Stage>
  );
}

window.PorovnaniVrstevAnimation = PorovnaniVrstevAnimation;
