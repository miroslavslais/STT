// line-dislocation.jsx — vznik hranové dislokace vsunutím další POLOROVINY atomů do mřížky.
// Bez smykového napětí: horní blok se pouze symetricky rozestoupí, aby polorovina měla místo.
// Atomy tvořící dislokaci (hrana vsunuté poloroviny = dislokační čára) jsou zvýrazněny zeleně.
const { Stage, useTime, Easing, interpolate, clamp } = window;

const COLS = [-4, -3, -2, -1, 0, 1, 2, 3, 4];   // 9 sloupců
const ROWS_TOP = [-3, -2, -1];                   // nad skluzovou rovinou
const ROWS_BOTTOM = [0, 1, 2];                   // pod skluzovou rovinou (pevné)
const ALL_ROWS = [...ROWS_TOP, ...ROWS_BOTTOM];
const TOP_J = ALL_ROWS[0];                       // -3, horní hrana boxu
const RIGHT_I = COLS[COLS.length - 1];           // 4, pravá hrana boxu
const DEPTH = [0, 1, 2, 3];                      // kroky do hloubky

const CORE_X = 0.5;    // pozice vsunuté poloroviny (mezi sloupci 0 a 1)
const WIDTH = 0.75;    // šířka přechodové zóny
const BULGE = 0.13;    // svislé zhuštění/roztažení kolem jádra

function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }
function gauss(x, w) { return Math.exp(-(x * x) / (2 * w * w)); }

// staggered build-in appear time — čelní plocha
const GRID = [];
{
  let idx = 0;
  for (const j of ALL_ROWS) for (const i of COLS) { GRID.push({ i, j, appear: 0.2 + idx * 0.028 }); idx++; }
}
// horní stěna boxu (hloubkové kroky 1..3 při j = TOP_J)
const TOP_FACE = [];
{
  let idx = 0;
  for (const d of DEPTH.slice(1)) for (const i of COLS) { TOP_FACE.push({ i, d, appear: 1.5 + idx * 0.05 }); idx++; }
}
// pravá stěna boxu (hloubkové kroky 1..3 při i = RIGHT_I)
const RIGHT_FACE = [];
{
  let idx = 0;
  for (const d of DEPTH.slice(1)) for (const j of ALL_ROWS) { RIGHT_FACE.push({ j, d, appear: 1.8 + idx * 0.05 }); idx++; }
}
// vsunutá POLOROVINA — čelní hrana (sloupec v horních řadách) …
const EXTRA_FRONT = ROWS_TOP.map((j) => ({ j }));
// … a její pokračování do hloubky po horní stěně boxu
const EXTRA_TOP = DEPTH.slice(1).map((d) => ({ d }));
// dislokační čára = spodní hrana vsunuté poloroviny, běží do hloubky
const CORE_LINE = DEPTH.map((d) => ({ d }));

function fade(t, a, b, c, d) {
  if (t <= a || t >= d) return 0;
  if (t < b) return clamp((t - a) / (b - a), 0, 1);
  if (t > c) return clamp(1 - (t - c) / (d - c), 0, 1);
  return 1;
}

// timeline
const T_BOX_END = 2.6;
const T_INSERT_START = 3.1;
const T_INSERT_END = 6.0;
const T_CORE = 5.6;
const T_FINAL = 6.6;
const T_END = 15;

const ALPHA = 0.64;
const COS_A = Math.cos(ALPHA), SIN_A = Math.sin(ALPHA);

function Scene() {
  const t = useTime();
  const tc = Math.min(T_END + 2, t * 0.72);

  const insertProgress = Easing.easeInOutCubic(clamp((tc - T_INSERT_START) / (T_INSERT_END - T_INSERT_START), 0, 1));
  const extraOp = clamp((tc - T_INSERT_START + 0.2) / 1.3, 0, 1);
  const extraGrow = Easing.easeOutBack(clamp((tc - T_INSERT_START - 0.1) / 1.1, 0, 1));
  const greenOp = clamp((tc - T_CORE) / 0.7, 0, 1);
  // posledních 8 s animace zelené atomy blikají (jako výstražná světla na dálnici)
  const blink = t > (T_END + 3) - 8 ? (Math.sin(t * Math.PI * 2 * 1.1) > 0 ? 1 : 0.15) : 1;

  // symetrické rozestoupení horního bloku kolem poloroviny — ŽÁDNÝ smyk:
  // atomy vlevo od jádra se posunou mírně doleva, vpravo mírně doprava
  const shiftX = (i) => insertProgress * (0.5 - sigmoid((CORE_X - i) / WIDTH));

  function nodePos(i, j) {
    let x = i, z = j, extraZ = 0;
    if (ROWS_TOP.includes(j)) {
      x += shiftX(i);
      if (j === -1) extraZ = -BULGE * gauss(i - CORE_X, 1.35) * insertProgress;
    } else {
      if (j === 0) extraZ = BULGE * gauss(i - CORE_X, 1.35) * insertProgress;
    }
    return { x, z: z + extraZ };
  }

  const K = interpolate([0, 2.2], [0, 0.5], Easing.easeOutCubic)(tc);

  const cx = 900, cy = 520;
  const S = 88;

  const project = (X, Y, Z) => {
    const sx = cx + S * X + S * K * Y * COS_A;
    const sy = cy + S * Z - S * K * Y * SIN_A;
    return { sx, sy, depth: -Y };
  };

  const dots = [];
  const lines = [];

  // ── čelní plocha ──
  const frontPos = {};
  GRID.forEach((g) => { frontPos[g.i + ',' + g.j] = nodePos(g.i, g.j); });
  const frontAppear = (i, j) => GRID.find((n) => n.i === i && n.j === j).appear;

  for (const j of ALL_ROWS) {
    for (const i of COLS) {
      const a1 = frontAppear(i, j);
      const rightIdx = COLS.indexOf(i) + 1;
      if (rightIdx < COLS.length) {
        const i2 = COLS[rightIdx];
        const a2 = frontAppear(i2, j);
        const local = tc - Math.max(a1, a2) - 0.05;
        if (local >= 0) {
          const p1w = frontPos[i + ',' + j], p2w = frontPos[i2 + ',' + j];
          const frac = Easing.easeOutCubic(clamp(local / 0.25, 0, 1));
          const tipx = p1w.x + (p2w.x - p1w.x) * frac, tipz = p1w.z + (p2w.z - p1w.z) * frac;
          const p1 = project(p1w.x, 0, p1w.z), p2 = project(tipx, 0, tipz);
          lines.push({ depth: p1.depth, x1: p1.sx, y1: p1.sy, x2: p2.sx, y2: p2.sy, op: clamp(local / 0.22, 0, 1) });
        }
      }
      const rowIdx = ALL_ROWS.indexOf(j) + 1;
      if (rowIdx < ALL_ROWS.length) {
        const j2 = ALL_ROWS[rowIdx];
        const a2 = frontAppear(i, j2);
        const local = tc - Math.max(a1, a2) - 0.05;
        if (local >= 0) {
          const p1w = frontPos[i + ',' + j], p2w = frontPos[i + ',' + j2];
          const frac = Easing.easeOutCubic(clamp(local / 0.25, 0, 1));
          const tipx = p1w.x + (p2w.x - p1w.x) * frac, tipz = p1w.z + (p2w.z - p1w.z) * frac;
          const p1 = project(p1w.x, 0, p1w.z), p2 = project(tipx, 0, tipz);
          lines.push({ depth: p1.depth, x1: p1.sx, y1: p1.sy, x2: p2.sx, y2: p2.sy, op: clamp(local / 0.22, 0, 1) });
        }
      }
    }
  }
  GRID.forEach((g) => {
    const local = tc - g.appear;
    if (local < 0) return;
    const pw = frontPos[g.i + ',' + g.j];
    const p = project(pw.x, 0, pw.z);
    const grow = Easing.easeOutBack(clamp(local / 0.4, 0, 1));
    dots.push({ depth: 0.01, sx: p.sx, sy: p.sy, r: 9 * grow, op: clamp(local / 0.3, 0, 1) });
  });

  // ── vsunutá polorovina — čelní hrana ──
  if (extraOp > 0.002) {
    const extraFrontPos = {};
    EXTRA_FRONT.forEach((e) => {
      let z = e.j;
      if (e.j === -1) z += -BULGE * insertProgress * 0.4;
      extraFrontPos[e.j] = { x: CORE_X, z };
    });
    // svislé spoje mezi atomy poloroviny (je to plocha, ne řada)
    for (let k = 0; k < ROWS_TOP.length - 1; k++) {
      const pa = extraFrontPos[ROWS_TOP[k]], pb = extraFrontPos[ROWS_TOP[k + 1]];
      const p1 = project(pa.x, 0, pa.z), p2 = project(pb.x, 0, pb.z);
      lines.push({ depth: 0.015, x1: p1.sx, y1: p1.sy, x2: p2.sx, y2: p2.sy, op: extraOp * 0.9, extra: true });
    }
    EXTRA_FRONT.forEach((e) => {
      const pw = extraFrontPos[e.j];
      const p = project(pw.x, 0, pw.z);
      const isCore = e.j === -1;
      dots.push({ depth: 0.02, sx: p.sx, sy: p.sy, r: 9 * extraGrow, op: extraOp, extra: true, green: isCore ? greenOp * blink : 0 });
      // vodorovné spoje k sousedům
      [0, 1].forEach((ni) => {
        const pn = frontPos[ni + ',' + e.j];
        const p1 = project(pw.x, 0, pw.z), p2 = project(pn.x, 0, pn.z);
        lines.push({ depth: 0.015, x1: p1.sx, y1: p1.sy, x2: p2.sx, y2: p2.sy, op: extraOp * 0.9, extra: true });
      });
    });

    // ── vsunutá polorovina — pokračování do hloubky po horní stěně ──
    EXTRA_TOP.forEach((e, k) => {
      const localOp = extraOp * clamp((tc - T_INSERT_START - 0.6 - k * 0.25) / 0.6, 0, 1);
      if (localOp < 0.002) return;
      const p = project(CORE_X, e.d, TOP_J);
      dots.push({ depth: -e.d + 0.005, sx: p.sx, sy: p.sy, r: 7 * extraGrow, op: localOp * 0.85, extra: true });
      // spoj podél hloubky
      const dPrev = e.d - 1;
      const pPrev = project(CORE_X, dPrev, TOP_J);
      lines.push({ depth: -e.d + 0.004, x1: pPrev.sx, y1: pPrev.sy, x2: p.sx, y2: p.sy, op: localOp * 0.8, extra: true });
      // vodorovné spoje k sousedním atomům horní stěny (posunutým)
      [0, 1].forEach((ni) => {
        const pn = project(ni + shiftX(ni), e.d, TOP_J);
        lines.push({ depth: -e.d + 0.004, x1: p.sx, y1: p.sy, x2: pn.sx, y2: pn.sy, op: localOp * 0.7, extra: true });
      });
    });

    // ── dislokační čára (zelená) — spodní hrana poloroviny, běží do hloubky ──
    if (greenOp > 0.002) {
      const zCore = -1 - BULGE * insertProgress * 0.4;
      for (let k = 1; k < CORE_LINE.length; k++) {
        const lop = greenOp * clamp((tc - T_CORE - 0.3 - k * 0.22) / 0.5, 0, 1);
        if (lop < 0.002) continue;
        const p = project(CORE_X, CORE_LINE[k].d, zCore);
        const pPrev = project(CORE_X, CORE_LINE[k - 1].d, zCore);
        lines.push({ depth: -CORE_LINE[k].d + 0.006, x1: pPrev.sx, y1: pPrev.sy, x2: p.sx, y2: p.sy, op: lop * 0.85 * blink, greenLine: true });
        dots.push({ depth: -CORE_LINE[k].d + 0.007, sx: p.sx, sy: p.sy, r: 7, op: lop * Math.max(0.35, 0.9 * blink), green: 1 });
      }
    }
  }

  // ── horní stěna boxu (posouvá se spolu s horním blokem — bez smyku, jen rozestoupení) ──
  const topX = (i) => i + shiftX(i);
  const topAppear = (i, d) => (d === 0 ? frontAppear(i, TOP_J) : TOP_FACE.find((n) => n.i === i && n.d === d).appear);
  for (const d of DEPTH) {
    for (const i of COLS) {
      const a1 = topAppear(i, d);
      const rightIdx = COLS.indexOf(i) + 1;
      if (rightIdx < COLS.length) {
        const i2 = COLS[rightIdx];
        const a2 = topAppear(i2, d);
        const local = tc - Math.max(a1, a2) - 0.05;
        if (local >= 0) {
          const p1 = project(topX(i), d, TOP_J), p2f = project(topX(i2), d, TOP_J);
          const frac = Easing.easeOutCubic(clamp(local / 0.22, 0, 1));
          const p2 = { sx: p1.sx + (p2f.sx - p1.sx) * frac, sy: p1.sy + (p2f.sy - p1.sy) * frac };
          lines.push({ depth: -d, x1: p1.sx, y1: p1.sy, x2: p2.sx, y2: p2.sy, op: clamp(local / 0.2, 0, 1) * 0.7 });
        }
      }
      const depthIdx = DEPTH.indexOf(d) + 1;
      if (depthIdx < DEPTH.length) {
        const d2 = DEPTH[depthIdx];
        const a2 = topAppear(i, d2);
        const local = tc - Math.max(a1, a2) - 0.05;
        if (local >= 0) {
          const p1 = project(topX(i), d, TOP_J), p2f = project(topX(i), d2, TOP_J);
          const frac = Easing.easeOutCubic(clamp(local / 0.22, 0, 1));
          const p2 = { sx: p1.sx + (p2f.sx - p1.sx) * frac, sy: p1.sy + (p2f.sy - p1.sy) * frac };
          lines.push({ depth: -d, x1: p1.sx, y1: p1.sy, x2: p2.sx, y2: p2.sy, op: clamp(local / 0.2, 0, 1) * 0.7 });
        }
      }
    }
  }
  TOP_FACE.forEach((g) => {
    const local = tc - g.appear;
    if (local < 0) return;
    const p = project(topX(g.i), g.d, TOP_J);
    const grow = Easing.easeOutBack(clamp(local / 0.35, 0, 1));
    dots.push({ depth: -g.d, sx: p.sx, sy: p.sy, r: 7 * grow, op: clamp(local / 0.28, 0, 1) * 0.75 });
  });

  // ── pravá stěna boxu (horní řady se posouvají s horním blokem) ──
  const rightX = (j) => (ROWS_TOP.includes(j) ? RIGHT_I + shiftX(RIGHT_I) : RIGHT_I);
  const rightAppear = (j, d) => (d === 0 ? frontAppear(RIGHT_I, j) : RIGHT_FACE.find((n) => n.j === j && n.d === d).appear);
  for (const d of DEPTH) {
    for (const j of ALL_ROWS) {
      const a1 = rightAppear(j, d);
      const rowIdx = ALL_ROWS.indexOf(j) + 1;
      if (rowIdx < ALL_ROWS.length) {
        const j2 = ALL_ROWS[rowIdx];
        const a2 = rightAppear(j2, d);
        const local = tc - Math.max(a1, a2) - 0.05;
        if (local >= 0) {
          const p1 = project(rightX(j), d, j), p2f = project(rightX(j2), d, j2);
          const frac = Easing.easeOutCubic(clamp(local / 0.22, 0, 1));
          const p2 = { sx: p1.sx + (p2f.sx - p1.sx) * frac, sy: p1.sy + (p2f.sy - p1.sy) * frac };
          lines.push({ depth: -d, x1: p1.sx, y1: p1.sy, x2: p2.sx, y2: p2.sy, op: clamp(local / 0.2, 0, 1) * 0.7 });
        }
      }
      const depthIdx = DEPTH.indexOf(d) + 1;
      if (depthIdx < DEPTH.length) {
        const d2 = DEPTH[depthIdx];
        const a2 = rightAppear(j, d2);
        const local = tc - Math.max(a1, a2) - 0.05;
        if (local >= 0) {
          const p1 = project(rightX(j), d, j), p2f = project(rightX(j), d2, j);
          const frac = Easing.easeOutCubic(clamp(local / 0.22, 0, 1));
          const p2 = { sx: p1.sx + (p2f.sx - p1.sx) * frac, sy: p1.sy + (p2f.sy - p1.sy) * frac };
          lines.push({ depth: -d, x1: p1.sx, y1: p1.sy, x2: p2.sx, y2: p2.sy, op: clamp(local / 0.2, 0, 1) * 0.7 });
        }
      }
    }
  }
  RIGHT_FACE.forEach((g) => {
    const local = tc - g.appear;
    if (local < 0) return;
    const p = project(rightX(g.j), g.d, g.j);
    const grow = Easing.easeOutBack(clamp(local / 0.35, 0, 1));
    dots.push({ depth: -g.d, sx: p.sx, sy: p.sy, r: 7 * grow, op: clamp(local / 0.28, 0, 1) * 0.75 });
  });

  lines.sort((m, n) => m.depth - n.depth);
  dots.sort((m, n) => m.depth - n.depth);

  const sans = "'IBM Plex Sans', system-ui, sans-serif";
  const mono = "'IBM Plex Mono', ui-monospace, monospace";

  // šipka u jádra dislokace
  const coreTip = project(CORE_X, 0, -0.1);
  const coreTail = project(CORE_X - 0.6, 0, -0.9);
  const coreOp = clamp((tc - T_CORE) / 0.5, 0, 1);

  const steps = [
    { n: '01', txt: 'Ideální krystalová mřížka — bez poruch', a: 0.3, b: 1.0, c: T_BOX_END + 0.2, d: T_BOX_END + 0.6 },
    { n: '02', txt: 'Vsunutí další poloroviny atomů do mřížky', a: T_INSERT_START, b: T_INSERT_START + 0.5, c: T_INSERT_END + 0.3, d: T_INSERT_END + 0.8 },
    { n: '03', txt: 'Hranová dislokace — čára na okraji vsunuté poloroviny', a: T_FINAL, b: T_FINAL + 0.6, c: T_FINAL + 7.5, d: T_FINAL + 8 },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 90% at 50% 48%, rgba(30,52,80,0.4) 0%, rgba(9,13,20,0) 60%)' }} />

      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id="gradAtom" cx="34%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#dcf1ff" /><stop offset="42%" stopColor="#5cb0e6" /><stop offset="100%" stopColor="#16405f" />
          </radialGradient>
          <radialGradient id="gradExtra" cx="34%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ffe8c4" /><stop offset="42%" stopColor="#efab54" /><stop offset="100%" stopColor="#7a3f14" />
          </radialGradient>
          <radialGradient id="gradGreen" cx="34%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#dcffe9" /><stop offset="42%" stopColor="#4ecf82" /><stop offset="100%" stopColor="#14522e" />
          </radialGradient>
        </defs>
        {lines.map((ln, idx) => (
          <g key={'l' + idx} opacity={ln.op}>
            <line x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2} stroke={ln.greenLine ? 'rgba(78,207,130,0.22)' : 'rgba(150,196,236,0.11)'} strokeWidth={ln.extra || ln.greenLine ? 7 : 6} strokeLinecap="round" />
            <line x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2} stroke={ln.greenLine ? 'rgba(78,207,130,0.85)' : ln.extra ? 'rgba(239,171,84,0.65)' : 'rgba(150,196,236,0.48)'} strokeWidth={ln.greenLine ? 2.8 : ln.extra ? 2.6 : 2} strokeLinecap="round" strokeDasharray={ln.greenLine ? '2 7' : 'none'} />
          </g>
        ))}
        {dots.map((d, idx) => (
          <g key={'d' + idx} opacity={d.op}>
            <circle cx={d.sx} cy={d.sy} r={d.r * 2.1} fill={d.green === 1 ? 'url(#gradGreen)' : d.extra ? 'url(#gradExtra)' : 'url(#gradAtom)'} opacity={0.35} />
            <circle cx={d.sx} cy={d.sy} r={d.r} fill={d.green === 1 ? 'url(#gradGreen)' : d.extra ? 'url(#gradExtra)' : 'url(#gradAtom)'} stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
            {d.green > 0 && d.green < 1 && (
              <circle cx={d.sx} cy={d.sy} r={d.r} fill="url(#gradGreen)" stroke="rgba(255,255,255,0.18)" strokeWidth={1} opacity={d.green} />
            )}
          </g>
        ))}

      </svg>

      {/* title */}
      <div style={{ position: 'absolute', left: 84, top: 74, opacity: fade(tc, 0.2, 0.9, T_END + 1.4, T_END + 2) }}>
        <div style={{ fontFamily: mono, fontSize: 18, letterSpacing: '0.28em', color: '#5fc0ef', textTransform: 'uppercase' }}>Krystalová struktura</div>
        <div style={{ fontFamily: sans, fontSize: 40, fontWeight: 600, color: '#eaf2fa', marginTop: 10, letterSpacing: '-0.01em' }}>Vznik hranové dislokace</div>
      </div>

      {/* legend */}
      <div style={{ position: 'absolute', left: 84, bottom: 76, display: 'flex', gap: 24, fontFamily: mono, fontSize: 16.5, color: '#aebfcf', opacity: fade(tc, 1.4, 2.0, T_END, T_END + 1) }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#5cb0e6' }} />atomy mřížky
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 9, opacity: fade(tc, T_INSERT_START, T_INSERT_START + 0.6, T_END, T_END + 1) }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#efab54' }} />vsunutá polorovina
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 9, opacity: fade(tc, T_CORE, T_CORE + 0.6, T_END, T_END + 1) }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#4ecf82' }} />atomy dislokace (dislokační čára)
        </span>
      </div>

      {/* step captions */}
      {steps.map((s, i) => {
        const o = fade(tc, s.a, s.b, s.c, s.d);
        if (o < 0.001) return null;
        return (
          <div key={i} style={{ position: 'absolute', left: '50%', bottom: 96, transform: `translate(-50%, ${(1 - o) * 10}px)`, opacity: o, textAlign: 'center' }}>
            <div style={{ fontFamily: mono, fontSize: 16, letterSpacing: '0.24em', color: '#5fc0ef', marginBottom: 12 }}>{s.n}</div>
            <div style={{ fontFamily: sans, fontSize: 32, fontWeight: 500, color: '#eaf2fa', letterSpacing: '-0.005em' }}>{s.txt}</div>
          </div>
        );
      })}
    </div>
  );
}

function LineDislocationAnimation() {
  return (
    <Stage width={1920} height={1080} duration={T_END + 3} background="#080b12" persistKey="line-dislocation-crystal-v4" loop={false}>
      <Scene />
    </Stage>
  );
}

window.LineDislocationAnimation = LineDislocationAnimation;
