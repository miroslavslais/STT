// crystal.jsx — 3D assembly of a hexagonal close-packed (HCP) unit cell.
// Reads the timeline engine globals set by animations.jsx.
const { Stage, useTime, Easing, interpolate, clamp } = window;

// ── Model geometry (atomic spacing a = 1) ──────────────────────────────────
const C = Math.sqrt(8 / 3);      // ideal c-axis height (c/a ≈ 1.633)
const R3 = 1 / Math.sqrt(3);     // radius of interstitial B atoms

function hexCorners(z) {
  const out = [];
  for (let k = 0; k < 6; k++) {
    const ang = k * Math.PI / 3;
    out.push([Math.cos(ang), Math.sin(ang), z]);
  }
  return out;
}

// Atoms, each with the moment it appears (seconds) and its stacking layer.
const ATOMS = [];
ATOMS.push({ p: [0, 0, 0], layer: 'A', appear: 1.25 });               // bottom centre
hexCorners(0).forEach((p, i) => ATOMS.push({ p, layer: 'A', appear: 1.55 + i * 0.17 }));
[30, 150, 270].forEach((deg, i) => {                                   // interstitial B layer
  const a = deg * Math.PI / 180;
  ATOMS.push({ p: [R3 * Math.cos(a), R3 * Math.sin(a), C / 2], layer: 'B', appear: 3.35 + i * 0.32 });
});
ATOMS.push({ p: [0, 0, C], layer: 'A', appear: 4.7 });                 // top centre
hexCorners(C).forEach((p, i) => ATOMS.push({ p, layer: 'A', appear: 5.0 + i * 0.17 }));

// Nearest-neighbour bonds (distance ≈ 1). Grow from the earlier atom to the later.
const BONDS = [];
for (let i = 0; i < ATOMS.length; i++) {
  for (let j = i + 1; j < ATOMS.length; j++) {
    const a = ATOMS[i].p, b = ATOMS[j].p;
    const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    if (Math.abs(d - 1) < 0.04) {
      let lo = ATOMS[i], hi = ATOMS[j];
      if (hi.appear < lo.appear) { const t = lo; lo = hi; hi = t; }
      BONDS.push({
        from: lo.p, to: hi.p,
        appear: hi.appear + 0.12,
        warm: lo.layer === 'B' || hi.layer === 'B',
      });
    }
  }
}

// Hexagonal-prism wireframe (the conventional unit cell outline).
const CELL_EDGES = [];
{
  const bot = hexCorners(0), top = hexCorners(C);
  for (let k = 0; k < 6; k++) {
    CELL_EDGES.push([bot[k], bot[(k + 1) % 6]]);
    CELL_EDGES.push([top[k], top[(k + 1) % 6]]);
    CELL_EDGES.push([bot[k], top[k]]);
  }
}

// ── Timing helper: trapezoidal fade (in a→b, hold b→c, out c→d) ─────────────
function fade(t, a, b, c, d) {
  if (t <= a || t >= d) return 0;
  if (t < b) return clamp((t - a) / (b - a), 0, 1);
  if (t > c) return clamp(1 - (t - c) / (d - c), 0, 1);
  return 1;
}

// ── The scene ───────────────────────────────────────────────────────────────
function Scene() {
  const t = useTime();

  // Reveal (atoms, bonds, captions, metals) runs at half speed up to content-time 15,
  // then holds — while the spin keeps running on real time so the end never freezes.
  const tc = Math.min(10.6, t * 0.5);
  const cx = 960;
  const cy = 566 - interpolate([9.1, 10.2], [0, 104], Easing.easeInOutCubic)(tc); // lift for the metals row
  const theta = -0.55 + 0.13 * t;                                      // continuous slow spin
  const tilt = interpolate([0, 2.7, 6.2, 20], [0.60, 0.50, 0.37, 0.31], Easing.easeInOutCubic)(tc);
  const zoom = interpolate([0, 6, 9.5, 9.1, 10.2, 20], [1.06, 1.0, 1.06, 1.1, 0.86, 0.86], Easing.easeInOutCubic)(tc);
  const S = 190 * zoom;

  const cosT = Math.cos(theta), sinT = Math.sin(theta);
  const cosP = Math.cos(tilt), sinP = Math.sin(tilt);
  const project = (p) => {
    const X = p[0], Y = p[1], Z = p[2] - C / 2;
    const rx = X * cosT - Y * sinT;
    const ry = X * sinT + Y * cosT;
    const ry2 = ry * cosP - Z * sinP;
    const rz2 = ry * sinP + Z * cosP;
    return { sx: cx + S * rx, sy: cy - S * rz2, depth: ry2 };
  };

  // Build draw list (atoms + bonds) with depth for painter's-algorithm sort.
  const items = [];

  BONDS.forEach((b) => {
    const local = tc - b.appear;
    if (local < 0) return;
    const frac = Easing.easeOutCubic(clamp(local / 0.32, 0, 1));
    const p1 = project(b.from);
    const p2full = project(b.to);
    const tip = [
      b.from[0] + (b.to[0] - b.from[0]) * frac,
      b.from[1] + (b.to[1] - b.from[1]) * frac,
      b.from[2] + (b.to[2] - b.from[2]) * frac,
    ];
    const p2 = project(tip);
    items.push({
      kind: 'bond',
      depth: (p1.depth + p2full.depth) / 2 - 0.03,
      x1: p1.sx, y1: p1.sy, x2: p2.sx, y2: p2.sy,
      op: clamp(local / 0.3, 0, 1), warm: b.warm,
    });
  });

  ATOMS.forEach((a) => {
    const local = tc - a.appear;
    if (local < 0) return;
    const pr = project(a.p);
    const op = clamp(local / 0.35, 0, 1);
    const sc = Easing.easeOutBack(clamp(local / 0.55, 0, 1));
    const r = (a.layer === 'B' ? 34 : 31) * sc * (1 + pr.depth * 0.05);
    items.push({
      kind: 'atom', depth: pr.depth, sx: pr.sx, sy: pr.sy,
      r, op, local, layer: a.layer,
    });
  });

  items.sort((m, n) => m.depth - n.depth);

  const els = items.map((it, idx) => {
    if (it.kind === 'bond') {
      const col = it.warm ? '235,178,110' : '135,188,232';
      return (
        <g key={idx} opacity={it.op}>
          <line x1={it.x1} y1={it.y1} x2={it.x2} y2={it.y2}
                stroke={`rgba(${col},0.12)`} strokeWidth={11} strokeLinecap="round" />
          <line x1={it.x1} y1={it.y1} x2={it.x2} y2={it.y2}
                stroke={`rgba(${col},0.62)`} strokeWidth={4} strokeLinecap="round" />
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

  // (unit-cell wireframe removed)
  const cellEls = null;

  // ── Captions ────────────────────────────────────────────────────────────
  const sans = "'IBM Plex Sans', system-ui, sans-serif";
  const mono = "'IBM Plex Mono', ui-monospace, monospace";
  const steps = [
    { n: '01', txt: 'Vrstva A · základní hexagonální rovina', a: 1.2, b: 1.7, c: 3.1, d: 3.5 },
    { n: '02', txt: 'Vrstva B · atomy zapadají do prohlubní', a: 3.35, b: 3.85, c: 4.5, d: 4.9 },
    { n: '03', txt: 'Vrstva A · stohování v sekvenci ABAB', a: 4.9, b: 5.4, c: 6.2, d: 6.6 },
    { n: '—',  txt: 'Šesterečná těsně uspořádaná – HCP', a: 6.7, b: 7.2, c: 8.7, d: 9.0 },
  ];

  const metals = [
    { s: 'Ti', name: 'Titan',     part: 'Lopatky leteckých turbín' },
    { s: 'Mg', name: 'Hořčík',    part: 'Odlehčené skříně převodovek' },
    { s: 'Zn', name: 'Zinek',     part: 'Antikorozní pozinkování' },
    { s: 'Zr', name: 'Zirkonium', part: 'Palivový proutek pro JE' },
    { s: 'Co', name: 'Kobalt',    part: 'Pojivo u slinutých karbidů' },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* soft vignette + core glow */}
      <div style={{ position: 'absolute', inset: 0,
        background: 'radial-gradient(120% 90% at 50% 42%, rgba(30,52,80,0.55) 0%, rgba(9,13,20,0) 60%)' }} />
      <div style={{ position: 'absolute', inset: 0,
        background: 'radial-gradient(150% 120% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)' }} />

      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id="gradA" cx="34%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#dcf1ff" />
            <stop offset="42%" stopColor="#5cb0e6" />
            <stop offset="100%" stopColor="#16405f" />
          </radialGradient>
          <radialGradient id="gradB" cx="34%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ffe8c4" />
            <stop offset="42%" stopColor="#efab54" />
            <stop offset="100%" stopColor="#7a3f14" />
          </radialGradient>
          <radialGradient id="haloA" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(90,175,235,0.5)" />
            <stop offset="100%" stopColor="rgba(90,175,235,0)" />
          </radialGradient>
          <radialGradient id="haloB" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(240,175,90,0.5)" />
            <stop offset="100%" stopColor="rgba(240,175,90,0)" />
          </radialGradient>
        </defs>
        {els}
        {cellEls && <g>{cellEls}</g>}
      </svg>

      {/* persistent title */}
      <div style={{ position: 'absolute', left: 84, top: 74, opacity: fade(tc, 0.2, 0.9, 20, 21) }}>
        <div style={{ fontFamily: mono, fontSize: 18, letterSpacing: '0.28em',
          color: '#5fc0ef', textTransform: 'uppercase' }}>Krystalová struktura</div>
        <div style={{ fontFamily: sans, fontSize: 40, fontWeight: 600, color: '#eaf2fa',
          marginTop: 10, letterSpacing: '-0.01em' }}>Šesterečná těsně uspořádaná – HCP</div>
      </div>

      {/* legend: A / B layers */}
      <div style={{ position: 'absolute', left: 84, bottom: 76, display: 'flex', gap: 26,
        fontFamily: mono, fontSize: 17, color: '#aebfcf', opacity: fade(tc, 3.2, 3.8, 9.1, 9.5) }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 15, height: 15, borderRadius: '50%', background: '#5cb0e6' }} />vrstva A
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 15, height: 15, borderRadius: '50%', background: '#efab54' }} />vrstva B
        </span>
      </div>

      {/* metals with the HCP lattice — reveal at the end */}
      {tc > 9.05 && (
        <div style={{ position: 'absolute', left: '50%', bottom: 70, transform: 'translateX(-50%)',
          width: '100%', textAlign: 'center' }}>
          <div style={{ fontFamily: mono, fontSize: 16, letterSpacing: '0.24em', color: '#5fc0ef',
            marginBottom: 26, opacity: fade(tc, 9.1, 9.6, 20, 21) }}>Kovy s touto mřížkou</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 18 }}>
            {metals.map((m, i) => {
              const o = fade(tc, 9.35 + i * 0.17, 9.85 + i * 0.17, 20, 21);
              return (
                <div key={i} style={{ width: 214, padding: '20px 18px', borderRadius: 12,
                  background: 'rgba(120,180,230,0.05)', border: '1px solid rgba(120,180,230,0.16)',
                  opacity: o, transform: `translateY(${(1 - o) * 14}px)`, textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span style={{ fontFamily: sans, fontSize: 44, fontWeight: 600, color: '#eaf2fa',
                      lineHeight: 1 }}>{m.s}</span>
                    <span style={{ fontFamily: mono, fontSize: 13, letterSpacing: '0.14em',
                      textTransform: 'uppercase', color: '#7fb4d6' }}>{m.name}</span>
                  </div>
                  <div style={{ height: 1, background: 'rgba(120,180,230,0.16)', margin: '14px 0 12px' }} />
                  <div style={{ fontFamily: sans, fontSize: 16, fontWeight: 400, color: '#bdccd9',
                    lineHeight: 1.35 }}>{m.part}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* step captions, bottom-centre */}
      {steps.map((s, i) => {
        const o = fade(tc, s.a, s.b, s.c, s.d);
        if (o < 0.001) return null;
        return (
          <div key={i} style={{ position: 'absolute', left: '50%', bottom: 96,
            transform: `translate(-50%, ${(1 - o) * 10}px)`, opacity: o, textAlign: 'center' }}>
            <div style={{ fontFamily: mono, fontSize: 16, letterSpacing: '0.24em',
              color: '#5fc0ef', marginBottom: 12 }}>{s.n}</div>
            <div style={{ fontFamily: sans, fontSize: 34, fontWeight: 500, color: '#eaf2fa',
              letterSpacing: '-0.005em' }}>{s.txt}</div>
          </div>
        );
      })}
    </div>
  );
}

function CrystalAnimation() {
  return (
    <Stage width={1920} height={1080} duration={28} background="#080b12" persistKey="hcp-crystal" loop={false}>
      <Scene />
    </Stage>
  );
}

window.CrystalAnimation = CrystalAnimation;
