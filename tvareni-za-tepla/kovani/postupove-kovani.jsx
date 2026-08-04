// postupove-kovani.jsx — Postupové kování klíče, pohled shora na spodní zápustku.
// Tři dutiny na jedné licí ploše: 1 předkovací (vlevo), 2 kovací (vpravo),
// 3 dokončovací (UPROSTŘED — max. síla musí ležet v ose beranu, jinak klopení).
// Hot polotovar postupuje 1 → 2 → 3; při každém úderu se přetváří na další tvar,
// v dokončovací dutině vzniká po obvodu výronek v dělicí rovině.
const { Stage, useTime, Easing, interpolate, clamp } = window;

const SANS = "'IBM Plex Sans', system-ui, sans-serif";
const HEAD = "'Quicksand', system-ui, sans-serif";
const MONO = "'IBM Plex Mono', ui-monospace, monospace";

const W = 1180, H = 720;
const CX1 = 300, CX2 = 900, CX3 = 590;   // předkovací / kovací / dokončovací
const AXIS = 420;                         // podélná osa symetrie (y)

function fade(t, a, b, c, d) {
  if (t <= a || t >= d) return 0;
  if (t < b) return clamp((t - a) / (b - a), 0, 1);
  if (t < c) return 1;
  return 1 - clamp((t - c) / (d - c), 0, 1);
}

// ── obrysy tvarů (svisle: očko nahoře, čelist dole) ──────────────────────────
function Bar({ cx, fill, stroke }) {
  return <rect x={cx - 30} y={258} width={60} height={324} rx={30} fill={fill} stroke={stroke} strokeWidth={2.4} />;
}
function Preform({ cx, fill, stroke }) {  // hrubý předkovek — oblý, přebytek objemu
  return (
    <g fill={fill} stroke={stroke} strokeWidth={2.6}>
      <ellipse cx={cx} cy={250} rx={78} ry={72} />
      <rect x={cx - 52} y={272} width={104} height={230} rx={46} />
      <rect x={cx - 86} y={472} width={172} height={118} rx={52} />
    </g>
  );
}
function Rough({ cx, fill, stroke, face }) {  // kovací — základní tvar, velké rádiusy
  return (
    <g>
      <g fill={fill} stroke={stroke} strokeWidth={2.6}>
        <circle cx={cx} cy={240} r={64} />
        <rect x={cx - 34} y={280} width={68} height={196} rx={26} />
        <rect x={cx - 78} y={454} width={156} height={132} rx={30} />
      </g>
      <circle cx={cx} cy={240} r={30} fill={face} stroke={stroke} strokeWidth={2} />
      <rect x={cx - 22} y={514} width={44} height={78} rx={14} fill={face} stroke={stroke} strokeWidth={2} />
    </g>
  );
}
function Finished({ cx, fill, stroke, face }) {  // dokončovací — přesný tvar, ostrá čelist
  return (
    <g>
      <g fill={fill} stroke={stroke} strokeWidth={2.8}>
        <circle cx={cx} cy={234} r={62} />
        <rect x={cx - 28} y={274} width={56} height={196} rx={12} />
        <rect x={cx - 76} y={450} width={152} height={146} rx={16} />
      </g>
      <circle cx={cx} cy={234} r={34} fill={face} stroke={stroke} strokeWidth={2.2} />
      <rect x={cx - 20} y={472} width={40} height={126} rx={8} fill={face} stroke={stroke} strokeWidth={2.4} />
    </g>
  );
}
// prázdný otisk dutiny (recess) — vždy viditelný v zápustce
function Recess({ children, dim }) {
  return <g opacity={dim ? 0.55 : 1}>{children}</g>;
}

function Scene() {
  const t = useTime();

  // ── časová osa přetváření ───────────────────────────────────────────────
  const barX  = interpolate([0, 1.1], [110, CX1], Easing.easeOutCubic)(t);
  const preCx = interpolate([3.5, 4.6], [CX1, CX2], Easing.easeInOutCubic)(t);
  const rghCx = interpolate([6.9, 8.0], [CX2, CX3], Easing.easeInOutCubic)(t);

  const barOn = fade(t, 0.0, 0.4, 1.6, 1.9);
  const preOn = fade(t, 1.7, 2.1, 5.0, 5.4);
  const rghOn = fade(t, 5.1, 5.5, 8.4, 8.8);
  const finOn = fade(t, 8.5, 9.0, 30, 31);

  const strike1 = fade(t, 1.35, 1.5, 1.7, 2.05);
  const strike2 = fade(t, 4.75, 4.9, 5.1, 5.45);
  const strike3 = fade(t, 8.25, 8.4, 8.6, 8.95);

  const flashOn = fade(t, 9.0, 9.6, 30, 31);   // výronek v dokončovací dutině
  const transfer1 = fade(t, 3.5, 3.9, 4.3, 4.7);
  const transfer2 = fade(t, 6.9, 7.3, 7.7, 8.1);

  const activeCx = t < 3.3 ? CX1 : t < 6.7 ? CX2 : CX3;
  const impact = Math.max(strike1, strike2, strike3);

  const caps = [
    { n: '01', txt: 'Rovný polotovar vložen do předkovací dutiny', a: 0.3, b: 0.8, c: 1.7, d: 2.0 },
    { n: '02', txt: 'Úder → materiál přerozdělen (předkovek)', a: 2.0, b: 2.5, c: 3.3, d: 3.6 },
    { n: '03', txt: 'Přenos do kovací dutiny', a: 3.6, b: 4.0, c: 4.6, d: 4.9 },
    { n: '04', txt: 'Úder → základní tvar klíče (velké rádiusy)', a: 5.1, b: 5.6, c: 6.6, d: 6.9 },
    { n: '05', txt: 'Přenos do dokončovací dutiny — uprostřed, v ose síly', a: 7.0, b: 7.4, c: 8.0, d: 8.3 },
    { n: '06', txt: 'Úder → přesný tvar + výronek v dělicí rovině', a: 8.6, b: 9.1, c: 10.4, d: 10.7 },
    { n: '07', txt: 'Hotový výkovek — výronek se pak ostřihne', a: 10.8, b: 11.3, c: 12.6, d: 12.9 },
  ];

  const FACE = 'url(#face)';
  const HOT = 'url(#hot)', HOT_E = '#b4470f';
  const REC = 'url(#recess)', REC_E = '#69747f';

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 90% at 50% 44%, rgba(58,40,22,0.30) 0%, rgba(9,13,20,0) 62%)' }} />

      <div style={{ position: 'absolute', left: 40, top: 26 }}>
        <div style={{ fontFamily: MONO, fontSize: 13, letterSpacing: '0.24em', color: '#e6a94a', textTransform: 'uppercase' }}>Postupové kování</div>
        <div style={{ fontFamily: HEAD, fontSize: 27, fontWeight: 700, color: '#eaf2fa', letterSpacing: '-0.01em', marginTop: 6 }}>Klíč — spodní zápustka shora</div>
      </div>

      <svg width={W} height={H} viewBox={'0 0 ' + W + ' ' + H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <defs>
          <linearGradient id="face" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5b6672" /><stop offset="1" stopColor="#454e58" /></linearGradient>
          <radialGradient id="recess" cx="50%" cy="40%" r="72%"><stop offset="0" stopColor="#20262d" /><stop offset="1" stopColor="#12161d" /></radialGradient>
          <linearGradient id="hot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe08a" /><stop offset="0.5" stopColor="#f7c948" /><stop offset="1" stopColor="#f0932b" /></linearGradient>
          <linearGradient id="flash" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c62a44" /><stop offset="1" stopColor="#7d1226" /></linearGradient>
          <pattern id="dots" width="13" height="13" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.4" fill="#2c3540" /></pattern>
          <marker id="ar" markerWidth="10" markerHeight="10" refX="4.5" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#e6a94a" /></marker>
        </defs>

        {/* blok zápustky */}
        <rect x={54} y={150} width={1072} height={540} rx={18} fill="url(#face)" stroke="#6c7885" strokeWidth={2} />
        {[[104,196],[1076,196],[104,644],[1076,644]].map((p,i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={12} fill="#2b323b" stroke="#727f8c" strokeWidth={1.5} />
        ))}

        {/* osa symetrie + osa beranu */}
        <line x1={54} y1={AXIS} x2={1126} y2={AXIS} stroke="#5fc0ef" strokeWidth={1.2} strokeDasharray="10 8" opacity={0.4} />
        <line x1={CX3} y1={150} x2={CX3} y2={690} stroke="#e6a94a" strokeWidth={1.3} strokeDasharray="6 6" opacity={0.55} />
        <text x={CX3 + 12} y={170} fontFamily={MONO} fontSize={12} fill="#e6a94a">osa beranu · max. síla</text>

        {/* prázdné otisky dutin (recess) — ztmavené, dokud v nich není horký kov */}
        <Recess dim={activeCx !== CX1}><g>
          <ellipse cx={CX1} cy={250} rx={78} ry={72} fill={REC} stroke={REC_E} strokeWidth={2} />
          <rect x={CX1 - 52} y={272} width={104} height={230} rx={46} fill={REC} stroke={REC_E} strokeWidth={2} />
          <rect x={CX1 - 86} y={472} width={172} height={118} rx={52} fill={REC} stroke={REC_E} strokeWidth={2} />
        </g></Recess>
        <Recess dim={activeCx !== CX2}><g>
          <circle cx={CX2} cy={240} r={64} fill={REC} stroke={REC_E} strokeWidth={2} />
          <circle cx={CX2} cy={240} r={30} fill="url(#face)" stroke={REC_E} strokeWidth={1.6} />
          <rect x={CX2 - 34} y={280} width={68} height={196} rx={26} fill={REC} stroke={REC_E} strokeWidth={2} />
          <rect x={CX2 - 78} y={454} width={156} height={132} rx={30} fill={REC} stroke={REC_E} strokeWidth={2} />
          <rect x={CX2 - 22} y={514} width={44} height={78} rx={14} fill="url(#face)" stroke={REC_E} strokeWidth={1.6} />
        </g></Recess>
        <Recess dim={activeCx !== CX3}><g>
          {/* výronková drážka kolem dokončovací dutiny */}
          <g fill="none" stroke="#e6a94a" strokeWidth={2} strokeDasharray="7 6" opacity={0.7}>
            <circle cx={CX3} cy={234} r={76} />
            <rect x={CX3 - 42} y={272} width={84} height={212} rx={18} />
            <rect x={CX3 - 92} y={452} width={184} height={146} rx={20} />
          </g>
          <circle cx={CX3} cy={234} r={62} fill={REC} stroke={REC_E} strokeWidth={2} />
          <circle cx={CX3} cy={234} r={34} fill="url(#face)" stroke={REC_E} strokeWidth={1.8} />
          <rect x={CX3 - 28} y={274} width={56} height={196} rx={12} fill={REC} stroke={REC_E} strokeWidth={2} />
          <rect x={CX3 - 76} y={450} width={152} height={146} rx={16} fill={REC} stroke={REC_E} strokeWidth={2} />
          <rect x={CX3 - 20} y={472} width={40} height={126} rx={8} fill="url(#face)" stroke={REC_E} strokeWidth={1.8} />
        </g></Recess>

        {/* badge pořadí */}
        {[[CX1,150,'1',false],[CX2,150,'2',false],[CX3,150,'3',true]].map((p,i) => (
          <g key={i}>
            <circle cx={p[0]} cy={p[1]} r={p[3] ? 21 : 19} fill={p[3] ? '#e6a94a' : '#12161d'} stroke="#e6a94a" strokeWidth={2} />
            <text x={p[0]} y={p[1] + (p[3] ? 8 : 7)} textAnchor="middle" fontFamily={HEAD} fontWeight={700} fontSize={p[3] ? 22 : 20} fill={p[3] ? '#12161d' : '#e6a94a'}>{p[2]}</text>
          </g>
        ))}

        {/* horký polotovar — postupně přetvářen */}
        <g opacity={barOn}><Bar cx={barX} fill={HOT} stroke="#ffdd7a" /></g>
        <g opacity={preOn}><Preform cx={preCx} fill={HOT} stroke="#ffdd7a" /></g>
        <g opacity={rghOn}><Rough cx={rghCx} fill={HOT} stroke="#ffdd7a" face={FACE} /></g>

        {/* výronek — spojitý lem po celém vnějším obvodu, spojený s výkovkem;
            karmínový, protože tenký výronek chladne rychleji než samotný díl.
            Kreslen POD horkým výkovkem → karmín vykukuje jen po vnějším obrysu. */}
        <g opacity={flashOn} fill="url(#flash)" stroke="#5e0d1e" strokeWidth={1.5} strokeLinejoin="round">
          <circle cx={CX3} cy={234} r={74} />
          <rect x={CX3 - 40} y={264} width={80} height={214} rx={16} />
          <rect x={CX3 - 88} y={440} width={176} height={162} rx={20} />
        </g>
        <g opacity={finOn}><Finished cx={CX3} fill={HOT} stroke="#ffdd7a" face={FACE} /></g>
        <g opacity={flashOn}>
          <text x={CX3 + 100} y={330} fontFamily={SANS} fontSize={14} fontWeight={600} fill="#ffd98a">výronek</text>
          <line x1={CX3 + 96} y1={325} x2={CX3 + 78} y2={318} stroke="#ffd98a" strokeWidth={1.6} />
        </g>

        {/* úder — impaktní kruh + šipky síly + popisek nad aktivní dutinou */}
        {impact > 0.01 && (
          <g opacity={impact}>
            <circle cx={activeCx} cy={AXIS} r={70 + (1 - impact) * 90} fill="none" stroke="#ffe08a" strokeWidth={3} opacity={impact * 0.8} />
            {[-70, 0, 70].map((dx, i) => (
              <line key={i} x1={activeCx + dx} y1={150} x2={activeCx + dx} y2={185} stroke="#ffe08a" strokeWidth={3} markerEnd="url(#ar)" />
            ))}
            <text x={activeCx} y={140} textAnchor="middle" fontFamily={MONO} fontSize={14} fontWeight={500} fill="#ffe08a" letterSpacing="0.2em">ÚDER</text>
          </g>
        )}

        {/* šipky přenosu */}
        <g opacity={transfer1} stroke="#e6a94a" strokeWidth={2.6} fill="none" strokeDasharray="2 8" strokeLinecap="round">
          <path d={'M' + (CX1 + 96) + ' 636 C 470 700, 720 700, ' + (CX2 - 96) + ' 636'} markerEnd="url(#ar)" />
        </g>
        <g opacity={transfer2} stroke="#e6a94a" strokeWidth={2.6} fill="none" strokeDasharray="2 8" strokeLinecap="round">
          <path d={'M' + (CX2 - 96) + ' 610 C ' + CX2 + ' 672, ' + (CX3 + 120) + ' 668, ' + (CX3 + 96) + ' 620'} markerEnd="url(#ar)" />
        </g>

        {/* názvy dutin */}
        <g fontFamily={SANS} textAnchor="middle">
          <text x={CX1} y={634} fontSize={16} fontWeight={600} fill="#eaf2fa">Předkovací</text>
          <text x={CX2} y={628} fontSize={16} fontWeight={600} fill="#eaf2fa">Kovací</text>
          <text x={CX3} y={640} fontSize={16} fontWeight={600} fill="#ffd98a">Dokončovací</text>
        </g>

        {/* popisky fází */}
        {caps.map((s, i) => {
          const o = fade(t, s.a, s.b, s.c, s.d);
          if (o < 0.001) return null;
          return (
            <g key={i} opacity={o}>
              <text x={W / 2} y={H - 48} textAnchor="middle" fontFamily={MONO} fontSize={13} letterSpacing="0.22em" fill="#e6a94a">{s.n}</text>
              <text x={W / 2} y={H - 20} textAnchor="middle" fontFamily={SANS} fontSize={20} fontWeight={500} fill="#eaf2fa">{s.txt}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function PostupoveKovani() {
  return (
    <Stage width={W} height={H} duration={13.5} background="#080b12" persistKey="postupove-kovani" loop={true}>
      <Scene />
    </Stage>
  );
}

window.PostupoveKovani = PostupoveKovani;
