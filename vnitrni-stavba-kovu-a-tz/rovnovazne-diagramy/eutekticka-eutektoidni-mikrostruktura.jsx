// eutekticka-eutektoidni-mikrostruktura.jsx — animace "co se děje uvnitř" při eutektické
// a eutektoidní přeměně. Dvě NEZÁVISLÉ animace vedle sebe (vlastní Stage + vlastní ovládání
// pro každou): vlevo eutektická (T → γ + Fe3C, ledeburit), vpravo eutektoidní (γ → α + Fe3C,
// perlit) se zdůrazněním polymorfní přeměny mřížky FCC → BCC.
const { Stage, useTime, useTimeline, Easing, clamp } = window;

function fade(t, a, b, c, d) {
  if (t <= a || t >= d) return 0;
  if (t < b) return clamp((t - a) / (b - a), 0, 1);
  if (t < c) return 1;
  return 1 - clamp((t - c) / (d - c), 0, 1);
}

function seeded(i, salt) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const VW = 640, VH = 460;

function makeLiquidDots(n) {
  const arr = [];
  for (let i = 0; i < n; i++) {
    arr.push({
      x: 20 + seeded(i, 1) * (VW - 40),
      y: 20 + seeded(i, 2) * (VH - 40),
      seed: seeded(i, 3) * 100,
      r: 2.6 + seeded(i, 4) * 1.6,
    });
  }
  return arr;
}
function makeLatticeDots() {
  const arr = [];
  const cols = 14, rows = 10;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      arr.push({ x: (c + 0.5) * (VW / cols), y: (r + 0.5) * (VH / rows), seed: (r * cols + c) * 3.1 });
    }
  }
  return arr;
}
const LIQUID_DOTS = makeLiquidDots(140);
const LATTICE_DOTS = makeLatticeDots();

// 5 zárodků — omezený poloměr, aby na konci zůstalo viditelných cca 5 samostatných zrn
const NUCLEI = [
  { x: 140, y: 130, rot: 12, delay: 0.0, maxR: 205 },
  { x: 500, y: 105, rot: -28, delay: 0.22, maxR: 195 },
  { x: 320, y: 260, rot: 55, delay: 0.44, maxR: 190 },
  { x: 115, y: 380, rot: -12, delay: 0.66, maxR: 200 },
  { x: 520, y: 390, rot: 34, delay: 0.88, maxR: 210 },
];

// hranice zrn — jen pro TUHÝ austenit (eutektoidní panel): uzavřená síť zrn,
// zárodky (NUCLEI) leží na trojném styku hranic
const GRAIN_LINES = [
  [0, 0, 140, 130], [140, 130, 320, 0], [320, 0, 500, 105], [500, 105, VW, 0],
  [140, 130, 0, 260], [0, 260, 115, 380], [140, 130, 320, 260],
  [500, 105, VW, 260], [500, 105, 320, 260], [320, 260, 115, 380],
  [320, 260, 520, 390], [115, 380, 0, 460], [115, 380, 320, 460],
  [520, 390, 320, 460], [520, 390, VW, 260], [520, 390, VW, 460],
];
// nečistoty/zárodková místa v TAVENINĚ — bez zrn, nukleace na cizích částicích
const IMPURITY_POINTS = [
  { x: 140, y: 130 }, { x: 500, y: 105 }, { x: 320, y: 260 }, { x: 115, y: 380 }, { x: 520, y: 390 },
  { x: 90, y: 80 }, { x: 560, y: 300 },
];

const STEP_TOP = 726; // pevná pozice postupného seznamu fází — pod schématem, bez překryvu

function PlayButton() {
  const { time, duration, playing, setTime, setPlaying } = useTimeline();
  const finished = !playing && time >= duration - 0.05;
  const label = playing ? 'Pauza' : finished ? '↻ Přehrát znovu' : '▶ Přehrát';
  const onClick = () => {
    if (finished) { setTime(0); setPlaying(true); }
    else setPlaying(p => !p);
  };
  return (
    <button onClick={onClick} style={{
      fontFamily: "'IBM Plex Sans', system-ui, sans-serif", fontSize: 16, fontWeight: 600,
      color: '#1a1406', background: '#f4c542', border: 'none', borderRadius: 10,
      padding: '12px 22px', cursor: 'pointer', letterSpacing: '0.01em',
    }}>{label}</button>
  );
}

function MicroPanel({ side, t, matrix, colorA, colorB, colorAName, colorBName,
                       stateLabel, nucleationStart, growthDur, sectionLabel, sectionSub,
                       resultLabel, showLatticeFlip, nucleationTitle, nucleationText }) {
  const mono = "'IBM Plex Mono', monospace";
  const sans = "'IBM Plex Sans', system-ui, sans-serif";
  const vy = 236;
  const clipId = `vp-${side}`;

  const oState = fade(t, 0.9, 1.4, nucleationStart - 0.2, nucleationStart + 0.2);
  const oLattice = showLatticeFlip ? fade(t, 1.4, 1.9, 999, 1000) : 0; // zůstává viditelné po celou dobu
  const growLblStart = nucleationStart + 2.4;
  const resultStart = growLblStart + growthDur;
  const oT = matrix === 'liquid' ? fade(t, 0.3, 0.8, nucleationStart + 0.5, nucleationStart + 1.2) : 0;

  const stepLit = (start) => clamp((t - start) / 0.45, 0, 1);
  const steps = [
    { start: nucleationStart, title: 'NUKLEACE', text: nucleationText },
    { start: growLblStart, title: 'RŮST', text: `${sectionLabel} — ${sectionSub}` },
    { start: resultStart, title: 'VÝSLEDEK', text: resultLabel, isResult: true },
  ];

  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: VW + 80, height: 1080 }}>
      <div style={{ position: 'absolute', left: 40, top: 66, opacity: fade(t, 0.15, 0.7, 999, 1000) }}>
        <div style={{ fontFamily: mono, fontSize: 17, letterSpacing: '0.26em', color: colorA, textTransform: 'uppercase' }}>{side === 'L' ? 'Eutektická přeměna' : 'Eutektoidní přeměna'}</div>
        <div style={{ fontFamily: sans, fontSize: 27, fontWeight: 600, color: '#eaf2fa', marginTop: 8, letterSpacing: '-0.005em', maxWidth: VW }}>
          {side === 'L' ? 'T → γ + Fe₃C' : 'γ → α + Fe₃C'}
        </div>
      </div>

      <div style={{ position: 'absolute', left: 40, top: 148, opacity: oState, fontFamily: mono, fontSize: 15.5, color: '#aebfcf' }}>{stateLabel}</div>

      {showLatticeFlip && (
        <div style={{ position: 'absolute', left: 40, top: 176, opacity: oLattice, display: 'flex', alignItems: 'center', gap: 10 }}>
          <LatticeIcon kind="fcc" color="#f0a742" size={36} />
          <span style={{ fontFamily: mono, fontSize: 16, color: '#7d8ea0' }}>→</span>
          <LatticeIcon kind="bcc" color="#5cb0e6" size={36} />
          <div style={{ fontFamily: mono, fontSize: 12.5, color: '#f4c542', whiteSpace: 'nowrap' }}>
            polymorfní přeměna — mění se typ mřížky
          </div>
        </div>
      )}

      <div style={{ position: 'absolute', left: 40, top: vy, width: VW, height: VH, borderRadius: 18,
        /* schéma */
        border: '1px solid rgba(120,180,230,0.18)', background: 'rgba(120,180,230,0.03)', overflow: 'hidden' }}>
        <svg width={VW} height={VH} style={{ display: 'block' }}>
          <defs>
            <clipPath id={clipId}><rect x={0} y={0} width={VW} height={VH} rx={18} /></clipPath>
            {NUCLEI.map((n, i) => (
              side === 'R' ? (
                /* perlit — lamely α : Fe₃C v poměru ≈ 7 : 1 (19 : 3 z 22 px) */
                <pattern key={i} id={`pat-${side}-${i}`} width={22} height={22} patternUnits="userSpaceOnUse" patternTransform={`rotate(${n.rot})`}>
                  <rect width={22} height={22} fill={colorB} />
                  <rect width={22} height={19} fill={colorA} />
                </pattern>
              ) : (
                /* ledeburit — cementitická matrice (colorB) s tyčinkami austenitu (colorA) */
                <pattern key={i} id={`pat-${side}-${i}`} width={26} height={26} patternUnits="userSpaceOnUse" patternTransform={`rotate(${n.rot})`}>
                  <rect width={26} height={26} fill={colorB} />
                  <rect x={3} y={4} width={13} height={4.4} rx={2.2} fill={colorA} />
                  <rect x={14} y={13} width={10} height={4.4} rx={2.2} fill={colorA} />
                  <rect x={2} y={19} width={11} height={4.4} rx={2.2} fill={colorA} />
                </pattern>
              )
            ))}
          </defs>
          <g clipPath={`url(#${clipId})`}>
            <rect x={0} y={0} width={VW} height={VH} fill="#0d1119" />

            {matrix === 'lattice' ? GRAIN_LINES.map((l, i) => (
              <line key={i} x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} stroke="rgba(160,190,220,0.4)" strokeWidth={1.5} />
            )) : IMPURITY_POINTS.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={3} fill="rgba(150,180,210,0.22)" />
            ))}

            {matrix === 'liquid' ? LIQUID_DOTS.map((d, i) => {
              const jx = Math.sin(t * 1.3 + d.seed) * 5.5;
              const jy = Math.cos(t * 1.1 + d.seed * 1.7) * 5.5;
              return <circle key={i} cx={d.x + jx} cy={d.y + jy} r={d.r} fill="rgba(140,170,205,0.4)" />;
            }) : LATTICE_DOTS.map((d, i) => {
              const jx = Math.sin(t * 2.2 + d.seed) * 1.1;
              const jy = Math.cos(t * 2.0 + d.seed) * 1.1;
              return <circle key={i} cx={d.x + jx} cy={d.y + jy} r={3.4} fill="rgba(240,167,66,0.32)" />;
            })}

            {NUCLEI.map((n, i) => {
              const start = nucleationStart + n.delay;
              const popT = clamp((t - start) / 0.4, 0, 1);
              if (popT <= 0) return null;
              const growStart = start + 0.15;
              const growEnd = growStart + growthDur;
              const gt = clamp((t - growStart) / (growEnd - growStart), 0, 1);
              const r = n.maxR * Easing.easeOutCubic(gt);
              const seedScale = Easing.easeOutBack(popT);
              return (
                <g key={i}>
                  <circle cx={n.x} cy={n.y} r={Math.max(r, 0.01)} fill={`url(#pat-${side}-${i})`} />
                  <circle cx={n.x} cy={n.y} r={Math.max(r, 0.01)} fill="none" stroke="#0d1119" strokeWidth={3} opacity={0.55} />
                  {gt < 0.12 && (
                    <circle cx={n.x} cy={n.y} r={7 * seedScale} fill={colorB} stroke="#f4c542" strokeWidth={2} opacity={popT} />
                  )}
                </g>
              );
            })}
          </g>
          <rect x={0} y={0} width={VW} height={VH} rx={18} fill="none" stroke="rgba(120,180,230,0.18)" strokeWidth={1} />
        </svg>

        {matrix === 'liquid' && oT > 0.001 && (
          <div style={{ position: 'absolute', left: 14, top: 12, opacity: oT, width: 30, height: 30, borderRadius: 8,
            background: 'rgba(140,170,205,0.18)', border: '1px solid rgba(140,170,205,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: mono, fontSize: 16, fontWeight: 600, color: '#cdd9e6' }}>T</div>
        )}
      </div>

      <div style={{ position: 'absolute', left: 40, top: vy + VH + 8, width: VW, display: 'flex', justifyContent: 'flex-end',
        gap: 20, opacity: stepLit(resultStart), fontFamily: mono, fontSize: 13, color: '#aebfcf' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ width: 11, height: 11, borderRadius: 3, background: colorA }} />{colorAName}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ width: 11, height: 11, borderRadius: 3, background: colorB }} />{colorBName}</span>
      </div>

      <div style={{ position: 'absolute', left: 40, top: STEP_TOP, width: VW }}>
        {steps.map((s, i) => {
          const lit = stepLit(s.start);
          const dotColor = `rgba(244,197,66,${0.25 + lit * 0.75})`;
          const titleColor = lit > 0.5 ? '#f4c542' : '#5b6b7c';
          const textColor = `rgba(234,242,250,${0.4 + lit * 0.6})`;
          return (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: dotColor, marginTop: 6, flexShrink: 0 }} />
              <div>
                <div style={{ fontFamily: mono, fontSize: 14, letterSpacing: '0.2em', color: titleColor }}>{s.title}</div>
                <div style={{ fontFamily: sans, fontSize: 19, fontWeight: 500, color: textColor, marginTop: 4, lineHeight: 1.3 }}>{s.text}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ position: 'absolute', left: 40, top: STEP_TOP + 240 }}>
        <PlayButton />
      </div>
    </div>
  );
}

function LatticeIcon({ kind, color, size }) {
  const S = size || 52;
  return (
    <svg width={S} height={S} style={{ flexShrink: 0 }}>
      <rect x={4} y={4} width={S - 8} height={S - 8} fill="none" stroke={color} strokeWidth={1.6} opacity={0.75} />
      <circle cx={4} cy={4} r={3.4} fill={color} />
      <circle cx={S - 4} cy={4} r={3.4} fill={color} />
      <circle cx={4} cy={S - 4} r={3.4} fill={color} />
      <circle cx={S - 4} cy={S - 4} r={3.4} fill={color} />
      {kind === 'fcc' ? (
        <>
          <circle cx={S / 2} cy={4} r={4} fill={color} opacity={0.75} />
          <circle cx={S / 2} cy={S - 4} r={4} fill={color} opacity={0.75} />
          <circle cx={4} cy={S / 2} r={4} fill={color} opacity={0.75} />
          <circle cx={S - 4} cy={S / 2} r={4} fill={color} opacity={0.75} />
        </>
      ) : (
        <circle cx={S / 2} cy={S / 2} r={4.6} fill={color} />
      )}
    </svg>
  );
}

function PanelBg({ t, mono }) {
  return (
    <div style={{ position: 'absolute', inset: 0,
      background: 'radial-gradient(160% 90% at 50% 42%, rgba(30,52,80,0.5) 0%, rgba(9,13,20,0) 60%)' }} />
  );
}

function EutektickaScene() {
  const t = useTime();
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <PanelBg t={t} />
      <MicroPanel side="L" t={t} matrix="liquid"
        colorA="#f0a742" colorB="#2f3b4a" colorAName="γ (austenit)" colorBName="Fe₃C (cementit)"
        stateLabel="Tavenina (T) — atomy bez pravidelného uspořádání"
        nucleationStart={4.2} growthDur={9}
        sectionLabel="Souběžný (kooperativní) růst dvou fází"
        sectionSub="γ a Fe₃C rostou společně ze zárodku ven"
        resultLabel="Ledeburit — eutektická směs γ + Fe₃C"
        showLatticeFlip={false}
        nucleationTitle="NUKLEACE"
        nucleationText="Zárodek vzniká v tavenině — na nečistotách či stěně formy"
      />
    </div>
  );
}

function EutektoidniScene() {
  const t = useTime();
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <PanelBg t={t} />
      <MicroPanel side="R" t={t} matrix="lattice"
        colorA="#5cb0e6" colorB="#2f3b4a" colorAName="α (ferit)" colorBName="Fe₃C (cementit)"
        stateLabel="Austenit γ — tuhý roztok, mřížka FCC"
        nucleationStart={4.2} growthDur={9}
        sectionLabel="Souběžný (kooperativní) růst dvou fází"
        sectionSub="z γ vznikají lamely α a Fe₃C — beze změny skupenství"
        resultLabel="Perlit — eutektoidní směs α + Fe₃C (≈88,5 % feritu, ≈11,5 % cementitu)"
        showLatticeFlip={true}
        nucleationTitle="NUKLEACE"
        nucleationText="Zárodek vzniká přednostně na hranici zrn austenitu"
      />
    </div>
  );
}

function EutektickaEutektoidniMikrostruktura() {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', height: '100%', background: '#080b12' }}>
      <div style={{ position: 'relative', flex: '1 1 0%', minWidth: 0, minHeight: 0, height: '100%', alignSelf: 'stretch' }}>
        <Stage width={720} height={1080} duration={26} background="#080b12" persistKey="eutekticka-mikrostruktura" loop={false} autoplay={false}>
          <EutektickaScene />
        </Stage>
      </div>
      <div style={{ width: 1, background: 'rgba(120,180,230,0.14)' }} />
      <div style={{ position: 'relative', flex: '1 1 0%', minWidth: 0, minHeight: 0, height: '100%', alignSelf: 'stretch' }}>
        <Stage width={720} height={1080} duration={26} background="#080b12" persistKey="eutektoidni-mikrostruktura" loop={false} autoplay={false}>
          <EutektoidniScene />
        </Stage>
      </div>
    </div>
  );
}

window.EutektickaEutektoidniMikrostruktura = EutektickaEutektoidniMikrostruktura;
