// rekrystalizace-valcovani.jsx — dynamická rekrystalizace při válcování za tepla.
// Materiál vstupuje mezi dva válce, zrna se protáhnou (deformovaná textura),
// na hranicích vznikají zárodky a z nich nová jemná rovnoosá zrna.
// Barvy dle přiložené předlohy: oranžová (horký kov) → žlutá (deformace) →
// zelená (nová rekrystalizovaná zrna). Bez popisků z předlohy.
const { Stage, useTime, Easing, interpolate, clamp } = window;

const SANS = "'IBM Plex Sans', system-ui, sans-serif";
const HEAD = "'Quicksand', system-ui, sans-serif";

// ── geometrie ────────────────────────────────────────────────────────────────
const W = 1040, H = 664, yc = 300;
const X0 = 60, X1 = 980, XR = 430;      // vstup, výstup, osa válců
const H1 = 152, H2 = 92;                 // tloušťka před / za válci
const RR = 130;                          // poloměr válce

// tvar pásu: horní plocha kopíruje oblouk válce a od osy válců dál pokračuje
// vodorovně (materiál vystupuje tečně, ve vodorovném směru)
const CY_TOP = yc - H2 / 2 - RR;
function topSurf(x) {
  if (x >= XR) return yc - H2 / 2;
  const dx = x - XR, inr = RR * RR - dx * dx;
  const arc = CY_TOP + (inr > 0 ? Math.sqrt(inr) : 0);
  return Math.max(yc - H1 / 2, arc);
}
function hAt(x) { return 2 * (yc - topSurf(x)); }
const XS = [];
for (let x = X0; x <= X1; x += 8) XS.push(x);
function stripPath() {
  let d = 'M' + X0 + ' ' + (yc - hAt(X0) / 2).toFixed(1);
  for (const x of XS) d += ' L' + x + ' ' + (yc - hAt(x) / 2).toFixed(1);
  for (let i = XS.length - 1; i >= 0; i--) d += ' L' + XS[i] + ' ' + (yc + hAt(XS[i]) / 2).toFixed(1);
  return d + ' Z';
}
const STRIP = stripPath();

// ── barvy ────────────────────────────────────────────────────────────────────
const ORANGE = ['#efa13a', '#ea8a26', '#e67a1c', '#f2b048', '#e88420'];
const OR_STROKE = '#b4470f';
const HOT = ['#f6d21e', '#f3c518', '#f7dd3a', '#efc70f', '#f5cf22'];
const HOT_STROKE = '#c9960c';
const GREEN = ['#9cc63c', '#8bbf34', '#accf4e', '#7fb52c', '#93c23a'];
const GR_STROKE = '#5c8a22';
const pick = (arr, r) => arr[Math.floor(r * arr.length) % arr.length];

// ── generátor zrn (deformovatelná síť) ───────────────────────────────────────
function makeGrid(x0, x1, cols, rows, seed) {
  let r = seed;
  const rnd = () => { r = (r * 1103515245 + 12345) & 0x7fffffff; return r / 0x7fffffff; };
  const P = [];
  for (let i = 0; i <= rows; i++) {
    const row = [];
    for (let j = 0; j <= cols; j++) {
      const u = j / cols, v = i / rows;
      const x = x0 + u * (x1 - x0);
      const h = hAt(x);
      const jx = (j > 0 && j < cols) ? (rnd() - 0.5) * ((x1 - x0) / cols) * 0.55 : 0;
      const jy = (i > 0 && i < rows) ? (rnd() - 0.5) * (h / rows) * 0.55 : 0;
      row.push([x + jx, yc + (v - 0.5) * h + jy]);
    }
    P.push(row);
  }
  const cells = [];
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const pts = [P[i][j], P[i][j + 1], P[i + 1][j + 1], P[i + 1][j]];
    cells.push({ pts, cx: (pts[0][0] + pts[2][0]) / 2, cy: (pts[0][1] + pts[2][1]) / 2, rr: rnd() });
  }
  return cells;
}
const cellPath = (pts) => 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L') + ' Z';

// zrna: A = hrubá výchozí (vlevo), B = deformovaná textura (krček), C = nová jemná (vpravo)
const GRID_A = makeGrid(X0, 368, 6, 5, 12345);
const GRID_B = makeGrid(356, X1, 13, 9, 6789);
const GRID_C = makeGrid(748, X1, 12, 6, 424242);

// zárodky — body v pásu těsně za válci (neposouvají se až na konec)
function makeNuclei(x0, x1, cols, rows, seed) {
  let r = seed;
  const rnd = () => { r = (r * 1103515245 + 12345) & 0x7fffffff; return r / 0x7fffffff; };
  const out = [];
  for (let i = 1; i < rows; i++) for (let j = 1; j < cols; j++) {
    const u = j / cols, v = i / rows, x = x0 + u * (x1 - x0), h = hAt(x);
    out.push({ x: x + (rnd() - 0.5) * ((x1 - x0) / cols) * 0.7, y: yc + (v - 0.5) * h + (rnd() - 0.5) * (h / rows) * 0.7 });
  }
  return out;
}
const NUC = makeNuclei(474, 742, 13, 5, 999);

function fade(t, a, b, c, d) {
  if (t <= a || t >= d) return 0;
  if (t < b) return clamp((t - a) / (b - a), 0, 1);
  if (t > c) return clamp(1 - (t - c) / (d - c), 0, 1);
  return 1;
}
const prog = (t, a, b) => clamp((t - a) / (b - a), 0, 1);

function Roll({ cy, ang }) {
  const spokes = [];
  for (let k = 0; k < 10; k++) {
    const th = (k / 10) * Math.PI * 2;
    spokes.push(<line key={k} x1={XR} y1={cy} x2={XR + Math.cos(th) * (RR - 10)} y2={cy + Math.sin(th) * (RR - 10)}
      stroke="rgba(60,66,74,0.45)" strokeWidth={1.4} />);
  }
  return (
    <g>
      <circle cx={XR} cy={cy} r={RR} fill="url(#rollg)" stroke="#3f464f" strokeWidth={2} />
      <g transform={'rotate(' + ang + ' ' + XR + ' ' + cy + ')'}>
        {spokes}
        <circle cx={XR} cy={cy} r={17} fill="#8a949e" stroke="#3f464f" strokeWidth={1.5} />
        <circle cx={XR} cy={cy} r={6} fill="#4a525c" />
      </g>
    </g>
  );
}

function Scene() {
  const t = useTime() * 0.7;
  const ang = t * 66;

  // nová struktura roste jen v poslední čtvrtině vpravo
  const frontGr = 748 + (X1 - 748) * prog(t, 6.6, 11.5);

  const caps = [
    { txt: 'Hrubá výchozí struktura', a: 0.4, b: 1.0, c: 2.4, d: 3.0 },
    { txt: 'Deformace mezi válci — zrna se protahují', a: 2.6, b: 3.2, c: 4.2, d: 4.8 },
    { txt: 'Na hranicích vznikají zárodky nových zrn', a: 4.4, b: 5.0, c: 6.6, d: 7.2 },
    { txt: 'Nová jemnozrnná rekrystalizovaná struktura', a: 6.8, b: 7.4, c: 13.6, d: 14 },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', inset: 0,
        background: 'radial-gradient(120% 80% at 50% 42%, rgba(50,34,20,0.35) 0%, rgba(9,13,20,0) 62%)' }} />
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }} viewBox={'0 0 ' + W + ' ' + H}>
        <defs>
          <clipPath id="stripClip"><path d={STRIP} /></clipPath>
          <radialGradient id="rollg" cx="38%" cy="34%" r="72%">
            <stop offset="0%" stopColor="#e6ecf2" />
            <stop offset="46%" stopColor="#aeb8c2" />
            <stop offset="100%" stopColor="#6d7883" />
          </radialGradient>
        </defs>

        <text x={40} y={40} fontFamily={HEAD} fontWeight="700" fontSize={25} fill="#eaf2fa" opacity={0}></text>

        <g clipPath="url(#stripClip)">
          {/* výplň pásu */}
          <path d={STRIP} fill="#3a2a1c" />

          {/* A — hrubá výchozí zrna (vlevo) */}
          {GRID_A.map((c, i) => {
            const op = prog(t, 0.4 + (c.cx - X0) / (368 - X0) * 1.3, 1.1 + (c.cx - X0) / (368 - X0) * 1.3);
            if (op < 0.01) return null;
            return <path key={'a' + i} d={cellPath(c.pts)} fill={pick(ORANGE, c.rr)} stroke={OR_STROKE} strokeWidth={1.6} opacity={op} />;
          })}

          {/* B — deformovaná textura (krček + před rekrystalizací) */}
          {GRID_B.map((c, i) => {
            const op = prog(t, 2.6 + (c.cx - 356) / (X1 - 356) * 1.4, 3.2 + (c.cx - 356) / (X1 - 356) * 1.4);
            if (op < 0.01) return null;
            const hot = c.cx < XR + 150;
            return <path key={'b' + i} d={cellPath(c.pts)}
              fill={hot ? pick(HOT, c.rr) : pick(ORANGE, c.rr)}
              stroke={hot ? HOT_STROKE : OR_STROKE} strokeWidth={1.4} opacity={op} />;
          })}

          {/* C — nová jemná rovnoosá zrna (rekrystalizace) */}
          {GRID_C.map((c, i) => {
            const s = clamp((frontGr - c.cx) / 42, 0, 1);
            if (s < 0.02) return null;
            const eased = Easing.easeOutCubic ? Easing.easeOutCubic(s) : s;
            const green = c.rr > 0.34;
            return <path key={'c' + i} d={cellPath(c.pts)}
              fill={green ? pick(GREEN, c.rr) : pick(ORANGE, c.rr)}
              stroke={green ? GR_STROKE : OR_STROKE} strokeWidth={1.2}
              transform={'translate(' + c.cx + ' ' + c.cy + ') scale(' + eased + ') translate(' + (-c.cx) + ' ' + (-c.cy) + ')'} />;
          })}

          {/* zárodky — zelené tečky v pásu těsně za válci (objeví se nejdříve, zůstávají) */}
          {NUC.map((n, i) => {
            const on = clamp((t - (3.4 + (n.x - 474) / (742 - 474) * 1.6)) / 0.5, 0, 1);
            if (on < 0.02) return null;
            return <circle key={'n' + i} cx={n.x} cy={n.y} r={on * 3.3} fill="#a6d24a" stroke={GR_STROKE} strokeWidth={0.8} />;
          })}
        </g>

        {/* obrys pásu */}
        <path d={STRIP} fill="none" stroke="#5a6570" strokeWidth={2.4} strokeLinejoin="round" />

        {/* válce — oba točí opačně (vtáhnou materiál doprava) */}
        <Roll cy={yc - H2 / 2 - RR} ang={-ang} />
        <Roll cy={yc + H2 / 2 + RR} ang={ang} />

        {/* šipky vstup / výstup */}
        <g opacity={0.6}>
          <line x1={X0 - 34} y1={yc} x2={X0 - 8} y2={yc} stroke="#8296a8" strokeWidth={2.2} markerEnd="url(#fa)" />
          <line x1={X1 + 8} y1={yc} x2={X1 + 34} y2={yc} stroke="#8296a8" strokeWidth={2.2} markerEnd="url(#fa)" />
          <defs><marker id="fa" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#8296a8" /></marker></defs>
        </g>

        {/* popisky fází */}
        {caps.map((s, i) => {
          const o = fade(t, s.a, s.b, s.c, s.d);
          if (o < 0.001) return null;
          return <text key={'cap' + i} x={W / 2} y={H - 20} textAnchor="middle" opacity={o}
            fontFamily={SANS} fontSize={22} fontWeight="500" fill="#eaf2fa">{s.txt}</text>;
        })}
      </svg>
    </div>
  );
}

function RekrystalizaceValcovani() {
  return (
    <Stage width={W} height={H} duration={20} background="#080b12" persistKey="rekrystalizace-valcovani" loop={true}>
      <Scene />
    </Stage>
  );
}

window.RekrystalizaceValcovani = RekrystalizaceValcovani;
