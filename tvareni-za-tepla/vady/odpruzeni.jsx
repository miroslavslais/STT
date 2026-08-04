// odpruzeni.jsx — ohyb plechu v nástroji a částečný pružný návrat po odlehčení.
const { Stage, useTime, Easing, interpolate, clamp } = window;
const SANS = "'IBM Plex Sans', system-ui, sans-serif";
const HEAD = "'Quicksand', system-ui, sans-serif";
const ACC = '#7ba3cc', BAD = '#e0655a', GHOST = 'rgba(150,180,210,0.35)';

function fade(t, a, b, c, d) {
  if (t <= a || t >= d) return 0;
  if (t < b) return clamp((t - a) / (b - a), 0, 1);
  if (t > c) return clamp(1 - (t - c) / (d - c), 0, 1);
  return 1;
}

// plech: dvě ramena svírající úhel; alpha = úhel odklonu ramen od vodorovné (deg)
function sheet(cx, cy, alpha, len, th) {
  const a = alpha * Math.PI / 180;
  const dx = Math.cos(a), dy = -Math.sin(a);
  const pts = [];
  // vnější obrys: levé rameno konec → vrchol → pravé rameno konec, pak zpět o tloušťku
  const lx = cx - dx * len, ly = cy + dy * len;
  const rx = cx + dx * len, ry = cy + dy * len;
  return 'M' + lx.toFixed(1) + ' ' + ly.toFixed(1) +
    ' L' + cx + ' ' + cy +
    ' L' + rx.toFixed(1) + ' ' + ry.toFixed(1) +
    ' L' + rx.toFixed(1) + ' ' + (ry + th).toFixed(1) +
    ' L' + cx + ' ' + (cy + th / Math.cos(a)).toFixed(1) +
    ' L' + lx.toFixed(1) + ' ' + (ly + th).toFixed(1) + ' Z';
}

function Scene() {
  const t = useTime();
  const cx = 500, cy = 300, LEN = 250, TH = 18;
  const SY = cy + 40, SH = 92; // hrany ohybnice (rameno V-drážky)
  const vertexY = (a) => SY + SH * Math.tan(a * Math.PI / 180) - TH / Math.cos(a * Math.PI / 180); // plech leží na hranách ohybnice

  // fáze: 0–1 klid, 1–4 ohyb do 42°, 4–5.5 držení, 5.5–7 odjezd + návrat na 33°
  const bend = Easing.easeInOutCubic(clamp((t - 1) / 3, 0, 1));
  const release = Easing.easeOutCubic(clamp((t - 5.5) / 1.4, 0, 1));
  const alphaTool = 42;
  const alphaFinal = 33;
  const alpha = bend * alphaTool - release * (alphaTool - alphaFinal);

  const vy = vertexY(alpha);
  const approach = Easing.easeInOutCubic(clamp(t / 1, 0, 1));
  const punchY = vy - (1 - approach) * 170 - release * 200;

  const ghostOp = fade(t, 5.9, 6.5, 20, 20);
  const capt = [
    { txt: 'Plech leží na ohybnici', a: 0.2, b: 0.7, c: 1.1, d: 1.5 },
    { txt: 'Ohybník tvaruje plech — deformace je zčásti pružná', a: 1.4, b: 2.0, c: 4.6, d: 5.1 },
    { txt: 'Po odlehčení se pružná složka vrátí — úhel se rozevře', a: 5.6, b: 6.1, c: 8.6, d: 9.0 },
  ];

  const V = (a) => ({ x: Math.cos(a * Math.PI / 180), y: -Math.sin(a * Math.PI / 180) });
  const vT = V(alphaTool), vF = V(alphaFinal);
  const vyF = vertexY(alphaFinal);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <svg width={1000} height={560} style={{ position: 'absolute', inset: 0 }}>
        <text x={20} y={26} fontFamily={HEAD} fontWeight="700" fontSize={20} fill="#eaf2fa">Odpružení po ohybu</text>

        {/* ohybnice (V-matrice) se zaoblenými hranami */}
        <path d={'M' + (cx - 330) + ' ' + SY + ' L' + (cx - SH - 5) + ' ' + SY +
          ' A12 12 0 0 1 ' + (cx - SH + 3.5).toFixed(1) + ' ' + (SY + 3.5).toFixed(1) +
          ' L' + cx + ' ' + (cy + 132) + ' L' + (cx + SH - 3.5).toFixed(1) + ' ' + (SY - 3.5).toFixed(1) +
          ' A12 12 0 0 1 ' + (cx + SH + 5) + ' ' + SY +
          ' L' + (cx + 330) + ' ' + SY + ' L' + (cx + 330) + ' ' + (cy + 190) +
          ' L' + (cx - 330) + ' ' + (cy + 190) + ' Z'}
          fill="#39434f" stroke="#5a6570" strokeWidth={1.8} strokeLinejoin="round" />

        {/* ohybník se zaoblenou špičkou */}
        <path d={'M' + (cx - 42) + ' ' + (punchY - 210) + ' L' + (cx + 42) + ' ' + (punchY - 210) +
          ' L' + (cx + 42) + ' ' + (punchY - 40) + ' L' + (cx + 6.9) + ' ' + (punchY - 6.5) +
          ' A10 10 0 0 1 ' + (cx - 6.9) + ' ' + (punchY - 6.5) +
          ' L' + (cx - 42) + ' ' + (punchY - 40) + ' Z'}
          fill="#4a5563" stroke="#6d7986" strokeWidth={1.8} strokeLinejoin="round" />

        {/* duch tvaru nástroje */}
        <g opacity={ghostOp}>
          <line x1={cx} y1={vyF} x2={cx - vT.x * LEN} y2={vyF + vT.y * LEN} stroke={GHOST} strokeWidth={2} strokeDasharray="8 6" />
          <line x1={cx} y1={vyF} x2={cx + vT.x * LEN} y2={vyF + vT.y * LEN} stroke={GHOST} strokeWidth={2} strokeDasharray="8 6" />
          <text x={cx - vT.x * 200 - 10} y={vyF + vT.y * 200 - 10} textAnchor="end" fontFamily={SANS} fontSize={15} fill="#8296a8">úhel nástroje</text>
        </g>

        {/* plech */}
        <path d={sheet(cx, vy, alpha, LEN, TH)} fill="#c6d3de" stroke="#8fa2b3" strokeWidth={1.6} strokeLinejoin="round" />

        {/* rozdíl úhlů */}
        {ghostOp > 0.4 && (
          <g opacity={ghostOp}>
            <path d={'M' + (cx + vF.x * 230) + ' ' + (vyF + vF.y * 230) + ' A230 230 0 0 0 ' + (cx + vT.x * 230) + ' ' + (vyF + vT.y * 230)}
              fill="none" stroke={BAD} strokeWidth={2.6} />
            <text x={cx + vT.x * 230 + 14} y={vyF + vT.y * 230 - 46} fontFamily={SANS} fontWeight="600" fontSize={17} fill={BAD}>Δα — odpružení</text>
          </g>
        )}

        {/* R/t poznámka */}
        <g opacity={fade(t, 6.6, 7.1, 9.4, 9.8)}>
          <text x={40} y={64} fontFamily={SANS} fontSize={16} fill="#aebfcf">Odpružení roste s mezí kluzu materiálu a s poměrem R / t.</text>
        </g>

        {capt.map((s, i) => {
          const o = fade(t, s.a, s.b, s.c, s.d);
          if (o < 0.001) return null;
          return <text key={i} x={500} y={540} textAnchor="middle" opacity={o} fontFamily={SANS} fontSize={19} fontWeight="500" fill="#eaf2fa">{s.txt}</text>;
        })}
      </svg>
    </div>
  );
}

function Odpruzeni() {
  return (
    <Stage width={1000} height={560} duration={10} background="#080b12" persistKey="vady-odpruzeni" loop={true}>
      <Scene />
    </Stage>
  );
}
window.Odpruzeni = Odpruzeni;
