// crystal-fcc.jsx — 3D assembly of a face-centred cubic (FCC) unit cell.
// Same look & pacing as the HCP piece. Reads the timeline engine globals.
const { Stage, useTime, Easing, interpolate, clamp } = window;

const H = 0.5; // half edge (cube edge a = 1, centred on origin)

// 8 cube corners
const CORNERS = [];
for (const dx of [-H, H]) for (const dy of [-H, H]) for (const dz of [-H, H]) CORNERS.push([dx, dy, dz]);
const cornerAppear = (i) => 1.2 + i * 0.14;

// 6 face centres (one per cube face)
const FACES = [
  { c: [0, 0,  H], fix: 2, v:  H }, { c: [0, 0, -H], fix: 2, v: -H },
  { c: [0,  H, 0], fix: 1, v:  H }, { c: [0, -H, 0], fix: 1, v: -H },
  { c: [ H, 0, 0], fix: 0, v:  H }, { c: [-H, 0, 0], fix: 0, v: -H },
];
const faceAppear = (i) => 3.35 + i * 0.26;

const ATOMS = [];
CORNERS.forEach((p, i) => ATOMS.push({ p, layer: 'A', appear: cornerAppear(i) }));
FACES.forEach((f, i) => ATOMS.push({ p: f.c, layer: 'B', appear: faceAppear(i) }));

// Cube frame: the 12 edges (corner pairs one coord apart), grown as corners land.
const CUBE_EDGES = [];
for (let i = 0; i < 8; i++) {
  for (let j = i + 1; j < 8; j++) {
    let diff = 0;
    for (let k = 0; k < 3; k++) if (CORNERS[i][k] !== CORNERS[j][k]) diff++;
    if (diff === 1) {
      let lo = i, hi = j;
      if (cornerAppear(hi) < cornerAppear(lo)) { const t = lo; lo = hi; hi = t; }
      CUBE_EDGES.push({ from: CORNERS[lo], to: CORNERS[hi], appear: cornerAppear(hi) + 0.06 });
    }
  }
}

// Face bonds: each face centre to the 4 corners of its face (nearest neighbours, a/√2).
const BONDS = [];
FACES.forEach((f, fi) => {
  CORNERS.forEach((cn) => {
    if (cn[f.fix] === f.v) BONDS.push({ from: cn, to: f.c, appear: faceAppear(fi) + 0.05 });
  });
});

function fade(t, a, b, c, d) {
  if (t <= a || t >= d) return 0;
  if (t < b) return clamp((t - a) / (b - a), 0, 1);
  if (t > c) return clamp(1 - (t - c) / (d - c), 0, 1);
  return 1;
}

function Scene() {
  const t = useTime();

  // Reveal runs at half speed up to content-time 15, then holds; spin runs on real time.
  const tc = Math.min(10, t * 0.5);
  const cx = 960;
  const cy = 566 - interpolate([8.3, 9.6], [0, 104], Easing.easeInOutCubic)(tc);
  const theta = 0.42 + 0.13 * t;
  const tilt = interpolate([0, 2.5, 6, 20], [0.58, 0.52, 0.50, 0.50], Easing.easeInOutCubic)(tc);
  const zoom = interpolate([0, 5, 8, 8.3, 9.6, 20], [0.98, 1.0, 1.0, 1.02, 0.83, 0.83], Easing.easeInOutCubic)(tc);
  const S = 360 * zoom;

  const cosT = Math.cos(theta), sinT = Math.sin(theta);
  const cosP = Math.cos(tilt), sinP = Math.sin(tilt);
  const project = (p) => {
    const X = p[0], Y = p[1], Z = p[2];
    const rx = X * cosT - Y * sinT;
    const ry = X * sinT + Y * cosT;
    const ry2 = ry * cosP - Z * sinP;
    const rz2 = ry * sinP + Z * cosP;
    return { sx: cx + S * rx, sy: cy - S * rz2, depth: ry2 };
  };

  const items = [];

  const pushLine = (e, colFn, wMain, wUnder, ease, dur) => {
    const local = tc - e.appear;
    if (local < 0) return;
    const frac = ease(clamp(local / dur, 0, 1));
    const p1 = project(e.from);
    const pFull = project(e.to);
    const tip = [
      e.from[0] + (e.to[0] - e.from[0]) * frac,
      e.from[1] + (e.to[1] - e.from[1]) * frac,
      e.from[2] + (e.to[2] - e.from[2]) * frac,
    ];
    const p2 = project(tip);
    items.push({ kind: 'line', depth: (p1.depth + pFull.depth) / 2 - 0.03,
      x1: p1.sx, y1: p1.sy, x2: p2.sx, y2: p2.sy,
      op: clamp(local / (dur * 0.9), 0, 1), col: colFn, wMain, wUnder });
  };

  CUBE_EDGES.forEach((e) => pushLine(e, 'frame', 2.4, 8, Easing.easeOutCubic, 0.3));
  BONDS.forEach((e) => pushLine(e, 'bond', 4, 11, Easing.easeOutCubic, 0.32));

  ATOMS.forEach((a) => {
    const local = tc - a.appear;
    if (local < 0) return;
    const pr = project(a.p);
    const op = clamp(local / 0.35, 0, 1);
    const sc = Easing.easeOutBack(clamp(local / 0.55, 0, 1));
    const r = (a.layer === 'B' ? 33 : 30) * sc * (1 + pr.depth * 0.05);
    items.push({ kind: 'atom', depth: pr.depth, sx: pr.sx, sy: pr.sy, r, op, local, layer: a.layer });
  });

  items.sort((m, n) => m.depth - n.depth);

  const els = items.map((it, idx) => {
    if (it.kind === 'line') {
      const rgb = it.col === 'frame' ? '150,196,236' : '120,180,232';
      const baseOp = it.col === 'frame' ? 0.42 : 0.6;
      return (
        <g key={idx} opacity={it.op}>
          <line x1={it.x1} y1={it.y1} x2={it.x2} y2={it.y2}
                stroke={`rgba(${rgb},0.1)`} strokeWidth={it.wUnder} strokeLinecap="round" />
          <line x1={it.x1} y1={it.y1} x2={it.x2} y2={it.y2}
                stroke={`rgba(${rgb},${baseOp})`} strokeWidth={it.wMain} strokeLinecap="round" />
        </g>
      );
    }
    const g = it.layer === 'B' ? 'B' : 'A';
    const ringT = clamp(it.local / 0.55, 0, 1);
    return (
      <g key={idx} opacity={it.op}>
        <circle cx={it.sx} cy={it.sy} r={it.r * 2.05} fill={`url(#halo${g})`} opacity={0.85} />
        {ringT < 1 && (
          <circle cx={it.sx} cy={it.sy} r={it.r * (1 + ringT * 1.5)} fill="none"
                  stroke={g === 'B' ? 'rgba(240,180,110,0.6)' : 'rgba(150,205,245,0.6)'}
                  strokeWidth={2} opacity={(1 - ringT) * 0.7} />
        )}
        <circle cx={it.sx} cy={it.sy} r={it.r} fill={`url(#grad${g})`}
                stroke="rgba(255,255,255,0.16)" strokeWidth={1} />
      </g>
    );
  });

  const sans = "'IBM Plex Sans', system-ui, sans-serif";
  const mono = "'IBM Plex Mono', ui-monospace, monospace";
  const steps = [
    { n: '01', txt: '8 atomů ve vrcholech krychle', a: 1.2, b: 1.7, c: 3.1, d: 3.5 },
    { n: '02', txt: 'Atom uprostřed každé stěny', a: 3.35, b: 3.85, c: 4.7, d: 5.1 },
    { n: '—',  txt: 'Krychlová plošně středěná · FCC', a: 5.2, b: 5.7, c: 7.6, d: 8.0 },
  ];

  const metals = [
    { s: 'Al', name: 'Hliník', part: 'Drak letadla a profily' },
    { s: 'Cu', name: 'Měď',    part: 'Elektrické vodiče a vinutí' },
    { s: 'Ni', name: 'Nikl',   part: 'Žárupevné slitiny' },
    { s: 'Au', name: 'Zlato',  part: 'Pozlacené kontakty' },
    { s: 'Pb', name: 'Olovo',  part: 'Kompozice kluzných ložisek' },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', inset: 0,
        background: 'radial-gradient(120% 90% at 50% 42%, rgba(30,52,80,0.55) 0%, rgba(9,13,20,0) 60%)' }} />
      <div style={{ position: 'absolute', inset: 0,
        background: 'radial-gradient(150% 120% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)' }} />

      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id="gradA" cx="34%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#dcf1ff" /><stop offset="42%" stopColor="#5cb0e6" /><stop offset="100%" stopColor="#16405f" />
          </radialGradient>
          <radialGradient id="gradB" cx="34%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ffe8c4" /><stop offset="42%" stopColor="#efab54" /><stop offset="100%" stopColor="#7a3f14" />
          </radialGradient>
          <radialGradient id="haloA" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(90,175,235,0.5)" /><stop offset="100%" stopColor="rgba(90,175,235,0)" />
          </radialGradient>
          <radialGradient id="haloB" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(240,175,90,0.5)" /><stop offset="100%" stopColor="rgba(240,175,90,0)" />
          </radialGradient>
        </defs>
        {els}
      </svg>

      <div style={{ position: 'absolute', left: 84, top: 74, opacity: fade(tc, 0.2, 0.9, 20, 21) }}>
        <div style={{ fontFamily: mono, fontSize: 18, letterSpacing: '0.28em', color: '#5fc0ef', textTransform: 'uppercase' }}>Krystalová struktura</div>
        <div style={{ fontFamily: sans, fontSize: 40, fontWeight: 600, color: '#eaf2fa', marginTop: 10, letterSpacing: '-0.01em' }}>Krychlová plošně středěná</div>
      </div>

      <div style={{ position: 'absolute', left: 84, bottom: 76, display: 'flex', gap: 26,
        fontFamily: mono, fontSize: 17, color: '#aebfcf', opacity: fade(tc, 3.2, 3.8, 8.2, 8.6) }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 15, height: 15, borderRadius: '50%', background: '#5cb0e6' }} />vrcholy
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 15, height: 15, borderRadius: '50%', background: '#efab54' }} />středy stěn
        </span>
      </div>

      {tc > 8.15 && (
        <div style={{ position: 'absolute', left: '50%', bottom: 70, transform: 'translateX(-50%)', width: '100%', textAlign: 'center' }}>
          <div style={{ fontFamily: mono, fontSize: 16, letterSpacing: '0.24em', color: '#5fc0ef',
            marginBottom: 26, opacity: fade(tc, 8.2, 8.7, 20, 21) }}>Kovy s touto mřížkou</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 18 }}>
            {metals.map((m, i) => {
              const o = fade(tc, 8.45 + i * 0.17, 8.95 + i * 0.17, 20, 21);
              return (
                <div key={i} style={{ width: 214, padding: '20px 18px', borderRadius: 12,
                  background: 'rgba(120,180,230,0.05)', border: '1px solid rgba(120,180,230,0.16)',
                  opacity: o, transform: `translateY(${(1 - o) * 14}px)`, textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span style={{ fontFamily: sans, fontSize: 44, fontWeight: 600, color: '#eaf2fa', lineHeight: 1 }}>{m.s}</span>
                    <span style={{ fontFamily: mono, fontSize: 13, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7fb4d6' }}>{m.name}</span>
                  </div>
                  <div style={{ height: 1, background: 'rgba(120,180,230,0.16)', margin: '14px 0 12px' }} />
                  <div style={{ fontFamily: sans, fontSize: 16, fontWeight: 400, color: '#bdccd9', lineHeight: 1.35 }}>{m.part}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {steps.map((s, i) => {
        const o = fade(tc, s.a, s.b, s.c, s.d);
        if (o < 0.001) return null;
        return (
          <div key={i} style={{ position: 'absolute', left: '50%', bottom: 96,
            transform: `translate(-50%, ${(1 - o) * 10}px)`, opacity: o, textAlign: 'center' }}>
            <div style={{ fontFamily: mono, fontSize: 16, letterSpacing: '0.24em', color: '#5fc0ef', marginBottom: 12 }}>{s.n}</div>
            <div style={{ fontFamily: sans, fontSize: 34, fontWeight: 500, color: '#eaf2fa', letterSpacing: '-0.005em' }}>{s.txt}</div>
          </div>
        );
      })}
    </div>
  );
}

function FccAnimation() {
  return (
    <Stage width={1920} height={1080} duration={28} background="#080b12" persistKey="fcc-crystal" loop={false}>
      <Scene />
    </Stage>
  );
}

window.FccAnimation = FccAnimation;
