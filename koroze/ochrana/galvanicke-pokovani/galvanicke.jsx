// galvanicke.jsx — Galvanické pokovení (lis na česnek: Cu → Ni → Cr)
// Vícevrstvý systém: měď vyrovná nerovnosti a dá lesk, nikl dodá tvrdost
// a antikorozní bariéru, chrom (0,2–0,5 µm) zajistí zrcadlový lesk a
// chemickou stálost. Vlevo elektrolytická lázeň (anoda → katoda = díl),
// vpravo zvětšený řez nabíhajícími vrstvami.
// Načítá se společně s ../../../animations.jsx (Stage, useTime, clamp).

const easeIO = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
function fade(t, a, b, c, d) {
  if (t <= a || t >= d) return 0;
  if (t < b) return clamp((t - a) / (b - a), 0, 1);
  if (t < c) return 1;
  return 1 - clamp((t - c) / (d - c), 0, 1);
}
function prog(t, a, b) { return easeIO(clamp((t - a) / (b - a), 0, 1)); }

const DURATION = 30;

const BASE = 'oklch(0.55 0.02 250)';
const CU = 'oklch(0.62 0.15 40)';
const NI = 'oklch(0.72 0.02 250)';
const CR = 'oklch(0.94 0.01 250)';
const MUTE = '#8296a8';
const CURR = 'oklch(0.8 0.13 235)';

// bath geometry
const TANK_X0 = 140, TANK_X1 = 820, TANK_TOP = 460, TANK_BOT = 880;
const ANODE_X = 240, WORK_X = 640, WORK_Y = 640;

// cross-section stack geometry
const STACK_X = 1300, STACK_W = 260, STACK_BASE_Y = 900, BASE_H = 130;
const CU_MAX = 110, NI_MAX = 150, CR_MAX = 22;

function stagePhase(t) {
  if (t < 12.2) return 0; // Cu
  if (t < 18.6) return 1; // Ni
  return 2; // Cr
}

function Scene() {
  const t = useTime();
  const mono = "'IBM Plex Mono', monospace";
  const sans = "'IBM Plex Sans', system-ui, sans-serif";

  const appear = prog(t, 0.4, 1.4);
  const bathOn = prog(t, 1.0, 1.8);
  const dipOn = prog(t, 1.8, 2.4);

  const progCu = prog(t, 2.4, 11.0);
  const progNi = prog(t, 12.6, 19.0);
  const progCr = prog(t, 19.4, 24.4);
  const finalOn = prog(t, 24.6, 25.6);

  const phase = stagePhase(t);
  const anodeColor = phase === 0 ? CU : phase === 1 ? NI : CR;
  const anodeLabel = phase === 0 ? 'Anoda: Cu' : phase === 1 ? 'Anoda: Ni' : 'Anoda: Cr';

  const ionOff = -(t * 46);
  const wireOff = -(t * 60);

  // workpiece tint follows topmost applied layer
  const workTint = progCr > 0.02 ? CR : progNi > 0.02 ? NI : progCu > 0.02 ? CU : BASE;
  const workGlow = 0.4 + progCr * 0.6;

  const cuH = CU_MAX * progCu;
  const niH = NI_MAX * progNi;
  const crH = CR_MAX * progCr;
  const cuY = STACK_BASE_Y - BASE_H - cuH;
  const niY = cuY - niH;
  const crY = niY - crH;

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', inset: 0,
        background: 'radial-gradient(120% 90% at 50% 40%, rgba(30,52,80,0.35) 0%, rgba(9,13,20,0) 62%)' }} />
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <linearGradient id="electrolyte" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="oklch(0.32 0.05 235)" stopOpacity="0.35" />
            <stop offset="1" stopColor="oklch(0.2 0.04 235)" stopOpacity="0.55" />
          </linearGradient>
          <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <g opacity={appear}>
          {/* ── left: elektrolytická lázeň ── */}
          {bathOn > 0.001 ? (
            <g opacity={bathOn}>
              <rect x={TANK_X0} y={TANK_TOP} width={TANK_X1 - TANK_X0} height={TANK_BOT - TANK_TOP} fill="url(#electrolyte)" stroke="oklch(0.4 0.04 235)" strokeWidth={2} rx={6} />
              {/* zdroj napětí */}
              <rect x={380} y={330} width={120} height={54} rx={8} fill="none" stroke={CURR} strokeWidth={2} />
              <text x={440} y={362} textAnchor="middle" fontFamily={mono} fontSize={16} fill={CURR}>DC zdroj</text>
              <path d={`M440 384 L440 420 L${ANODE_X} 420 L${ANODE_X} ${TANK_TOP}`} fill="none" stroke={CURR} strokeWidth={2.5} strokeDasharray="9 8" strokeDashoffset={wireOff} strokeLinecap="round" />
              <path d={`M440 384 L440 420 L${WORK_X} 420 L${WORK_X} ${TANK_TOP}`} fill="none" stroke={CURR} strokeWidth={2.5} strokeDasharray="9 8" strokeDashoffset={-wireOff} strokeLinecap="round" />
              <text x={ANODE_X - 30} y={402} fontFamily={mono} fontSize={16} fontWeight={700} fill="#e5484d">+</text>
              <text x={WORK_X + 14} y={402} fontFamily={mono} fontSize={16} fontWeight={700} fill="#fff">−</text>

              {/* anoda */}
              <rect x={ANODE_X - 22} y={TANK_TOP + 20} width={44} height={TANK_BOT - TANK_TOP - 60} fill={anodeColor} rx={4} filter="url(#glow)" />
              <text x={ANODE_X} y={TANK_BOT - 24} textAnchor="middle" fontFamily={mono} fontSize={15} fill={MUTE}>{anodeLabel}</text>

              {/* iontový proud anoda → díl */}
              {dipOn > 0.001 ? (
                <path d={`M${ANODE_X + 24} ${WORK_Y} L${WORK_X - 72} ${WORK_Y}`} fill="none" stroke={anodeColor} strokeWidth={2.4} strokeDasharray="7 7" strokeDashoffset={ionOff} opacity={dipOn * 0.85} strokeLinecap="round" />
              ) : null}

              {/* díl (lis na česnek) jako katoda — schematický profil */}
              {dipOn > 0.001 ? (
                <g opacity={dipOn} filter="url(#glow)" transform={`translate(${WORK_X - 70} ${WORK_Y - 40}) scale(0.7)`}>
                  <path d="M0,26 C20,4 90,0 160,4 C220,7 248,14 258,22 C248,30 210,34 150,32 C90,30 30,32 0,40 Z" fill={workTint} fillOpacity={0.18} stroke={workTint} strokeWidth={3.4} strokeLinejoin="round" />
                  <path d="M30,46 C60,42 110,40 160,42 C195,43 215,47 222,52 C210,58 175,60 130,59 C85,58 45,58 20,60 C15,55 20,50 30,46 Z" fill={workTint} fillOpacity={0.18} stroke={workTint} strokeWidth={3} strokeLinejoin="round" />
                  <path d="M2,40 L2,64 C2,70 8,74 16,74 L26,74 C30,74 32,70 30,64 L24,50 Z" fill={workTint} fillOpacity={0.18} stroke={workTint} strokeWidth={2.6} strokeLinejoin="round" />
                  <circle cx={18} cy={14} r={3} fill="none" stroke={workTint} strokeWidth={2} />
                  <circle cx={36} cy={20} r={2.5} fill="none" stroke={workTint} strokeWidth={2} />
                </g>
              ) : null}
              <text x={WORK_X} y={WORK_Y + 56} textAnchor="middle" fontFamily={mono} fontSize={15} fill={MUTE}>díl — katoda</text>
            </g>
          ) : null}

          {/* ── right: zvětšený řez nabíhajícími vrstvami ── */}
          <text x={STACK_X} y={STACK_BASE_Y - BASE_H - NI_MAX - CR_MAX - 130} fontFamily={mono} fontSize={19} fill={MUTE}>Detail vrstev (řez, zvětšeno)</text>

          <rect x={STACK_X} y={STACK_BASE_Y - BASE_H} width={STACK_W} height={BASE_H} fill={BASE} stroke="oklch(0.3 0.02 250)" strokeWidth={1.5} />
          <text x={STACK_X + STACK_W + 18} y={STACK_BASE_Y - BASE_H / 2 + 5} fontFamily={mono} fontSize={15} fill={MUTE}>základní kov (zinková slitina)</text>

          {cuH > 0.5 ? (
            <g>
              <rect x={STACK_X} y={cuY} width={STACK_W} height={cuH} fill={CU} />
              <text x={STACK_X + STACK_W + 18} y={cuY + cuH / 2 + 5} fontFamily={mono} fontSize={15} fill={CU} opacity={progCu}>Cu — vyrovnání, lesk</text>
            </g>
          ) : null}

          {niH > 0.5 ? (
            <g>
              <rect x={STACK_X} y={niY} width={STACK_W} height={niH} fill={NI} />
              <text x={STACK_X + STACK_W + 18} y={niY + niH / 2 + 5} fontFamily={mono} fontSize={15} fill={NI} opacity={progNi}>Ni — tvrdost, bariéra</text>
            </g>
          ) : null}

          {crH > 0.5 ? (
            <g filter="url(#glow)">
              <rect x={STACK_X} y={crY} width={STACK_W} height={crH} fill={CR} />
              <text x={STACK_X + STACK_W + 18} y={crY + crH / 2 + 5} fontFamily={mono} fontSize={15} fill={CR} opacity={progCr}>Cr — 0,2–0,5 μm, zrcadlový lesk</text>
            </g>
          ) : null}

          {/* propojovací linka mezi dílem v lázni a detailem */}
          {dipOn > 0.001 ? (
            <path d={`M${WORK_X + 110} ${WORK_Y} L${STACK_X - 20} ${STACK_BASE_Y - BASE_H / 2}`} fill="none" stroke={MUTE} strokeWidth={1.2} strokeDasharray="4 6" opacity={0.4 * dipOn} />
          ) : null}
        </g>
      </svg>

      <div style={{ position: 'absolute', left: 84, top: 74, opacity: fade(t, 0.2, 0.9, 400, 401) }}>
        <div style={{ fontFamily: mono, fontSize: 18, letterSpacing: '0.28em', color: CU, textTransform: 'uppercase' }}>Protikorozní ochrana</div>
        <div style={{ fontFamily: sans, fontSize: 40, fontWeight: 600, color: '#eaf2fa', marginTop: 10, letterSpacing: '-0.01em' }}>Galvanické pokovení — lis na česnek</div>
      </div>

      {[
        { n: '01', txt: 'Základní kov (zinková slitina) se ponoří do elektrolytu jako katoda', a: 0.4, b: 1.0, c: 6.0, d: 6.6 },
        { n: '02', txt: 'Měděná vrstva (Cu) vyrovná nerovnosti a dá dílu lesk a přilnavost', a: 6.4, b: 7.0, c: 12.0, d: 12.6 },
        { n: '03', txt: 'Niklová vrstva (Ni) — tvrdý kov odolný proti otěru, antikorozní bariéra', a: 12.4, b: 13.0, c: 18.0, d: 18.6 },
        { n: '04', txt: 'Chromová vrstva (Cr), jen 0,2–0,5 μm — odolná proti poškrábání a chemikáliím, lesklá', a: 18.4, b: 19.0, c: 24.0, d: 24.6 },
        { n: '05', txt: 'Výsledek: tvrdý, korozivzdorný a lesklý povlak Cu–Ni–Cr', a: 24.4, b: 25.0, c: 200, d: 201 },
      ].map((s, i) => {
        const o = fade(t, s.a, s.b, s.c, s.d);
        if (o < 0.001) return null;
        return (
          <div key={i} style={{ position: 'absolute', left: '50%', bottom: 88,
            transform: `translate(-50%, ${(1 - o) * 10}px)`, opacity: o, textAlign: 'center', width: 1300 }}>
            <div style={{ fontFamily: mono, fontSize: 16, letterSpacing: '0.24em', color: CU, marginBottom: 12 }}>{s.n}</div>
            <div style={{ fontFamily: sans, fontSize: 32, fontWeight: 500, color: '#eaf2fa', letterSpacing: '-0.005em' }}>{s.txt}</div>
          </div>
        );
      })}
    </div>
  );
}

function GalvanickeAnimation() {
  return (
    <Stage width={1920} height={1080} duration={DURATION} background="#080b12" persistKey="galvanicke-pokovani" loop={false}>
      <Scene />
    </Stage>
  );
}

window.GalvanickeAnimation = GalvanickeAnimation;
