// nastrihovy-plan.jsx — čtyři varianty uspořádání výstřižků v pásu, t = 3 mm, e = 3 mm, a = 4,5 mm.
(function () {
const { useState } = React;
const SANS = "'IBM Plex Sans', system-ui, sans-serif";
const HEAD = "'Quicksand', system-ui, sans-serif";
const MONO = "'IBM Plex Mono', ui-monospace, monospace";
const ACC = '#7ba3cc', GOOD = '#57b98a';
const STEEL = '#c6d3de', STEEL_E = '#8fa2b3';
const WASTE = 'rgba(224,101,90,0.30)', WASTE_E = '#c9675d';
const NB = '\u00a0';
const E = 3, A = 4.5, SC = 3.1, VW = 900, VH = 330;

const VARIANTS = [
  { id: 'rp', label: 'Obdélník podélně', shape: 'rect', w: 40, h: 20, rows: 1 },
  { id: 'rq', label: 'Obdélník příčně', shape: 'rect', w: 20, h: 40, rows: 1 },
  { id: 'c1', label: 'Kruh jednořadě', shape: 'circle', D: 30, rows: 1 },
  { id: 'c2', label: 'Kruh dvouřadě přesazeně', shape: 'circle', D: 30, rows: 2 },
];

function calc(v) {
  if (v.shape === 'rect') { const k = v.w + E, B = v.h + 2 * A, S = v.w * v.h; return { k, B, n: 1, S, eta: S / (B * k) * 100 }; }
  const D = v.D, S = Math.PI * D * D / 4, k = D + E;
  if (v.rows === 1) { const B = D + 2 * A; return { k, B, n: 1, S, eta: S / (B * k) * 100 }; }
  const r = (D + E) * Math.sqrt(3) / 2, B = D + r + 2 * A;
  return { k, B, n: 2, S, r, eta: 2 * S / (B * k) * 100 };
}
const num = (x, dec) => x.toFixed(dec).replace('.', ',');
const auto = x => Number.isInteger(x) ? String(x) : num(x, 1);

function layout(v, c) {
  const hw = v.shape === 'rect' ? v.w / 2 : v.D / 2, hh = v.shape === 'rect' ? v.h / 2 : v.D / 2;
  const bl = [];
  if (v.rows === 2) {
    for (let i = 0; i < 3; i++) bl.push({ x: E + hw + i * c.k, y: A + hh, row: 0 });
    for (let i = 0; i < 3; i++) bl.push({ x: E + hw + c.k / 2 + i * c.k, y: A + hh + c.r, row: 1 });
  } else for (let i = 0; i < 5; i++) bl.push({ x: E + hw + i * c.k, y: A + hh, row: 0 });
  const L = Math.max(...bl.map(b => b.x)) + hw + E;
  return { hw, hh, bl, L };
}

const Tick = ({ x, y }) => <line x1={x - 4} y1={y + 4} x2={x + 4} y2={y - 4} />;

function PlanSvg({ v, c }) {
  const { hw, hh, bl, L } = layout(v, c);
  const W = L * SC, H = c.B * SC;
  const x0 = 110 + (680 - W) / 2, y0 = (VH - H) / 2 + 8;
  const X = mm => x0 + mm * SC, Y = mm => y0 + mm * SC;
  const rect = v.shape === 'rect';
  const top = bl.filter(b => b.row === 0);
  const bot = bl.filter(b => b.row === (v.rows === 2 ? 1 : 0));
  const k0 = X(top[1].x - hw), k1 = X(top[2].x - hw), yk = y0 - 20, kFrom = rect ? Y(top[1].y - hh) : Y(top[1].y);
  const ex1 = X(bot[1].x + hw), ex2 = X(bot[2].x - hw), eFrom = Y(bot[1].y + (rect ? hh : 0)), ye = y0 + H + 22;
  const lt = top[top.length - 1], aX = x0 + W + 22, aTop = Y(lt.y - hh), aFromX = rect ? X(lt.x + hw) : X(lt.x);
  const xB = x0 - 20;
  const txt = { fontFamily: MONO, fontSize: 12.5, fill: '#d3dfea' };
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" style={{ display: 'block' }}>
      <rect x={x0} y={y0} width={W} height={H} fill={WASTE} stroke={WASTE_E} strokeWidth={1.2} />
      {bl.map((b, i) => rect
        ? <rect key={i} x={X(b.x - hw)} y={Y(b.y - hh)} width={2 * hw * SC} height={2 * hh * SC} fill={STEEL} stroke={STEEL_E} strokeWidth={1.2} />
        : <circle key={i} cx={X(b.x)} cy={Y(b.y)} r={hw * SC} fill={STEEL} stroke={STEEL_E} strokeWidth={1.2} />)}
      <g stroke={ACC} strokeWidth={1.1} fill="none">
        <line x1={k0} y1={yk - 6} x2={k0} y2={kFrom} strokeDasharray="3 3" />
        <line x1={k1} y1={yk - 6} x2={k1} y2={kFrom} strokeDasharray="3 3" />
        <line x1={k0} y1={yk} x2={k1} y2={yk} /><Tick x={k0} y={yk} /><Tick x={k1} y={yk} />
        <line x1={x0 - 26} y1={y0} x2={x0} y2={y0} strokeDasharray="3 3" />
        <line x1={x0 - 26} y1={y0 + H} x2={x0} y2={y0 + H} strokeDasharray="3 3" />
        <line x1={xB} y1={y0} x2={xB} y2={y0 + H} /><Tick x={xB} y={y0} /><Tick x={xB} y={y0 + H} />
        <line x1={ex1} y1={eFrom} x2={ex1} y2={ye + 6} strokeDasharray="3 3" />
        <line x1={ex2} y1={eFrom} x2={ex2} y2={ye + 6} strokeDasharray="3 3" />
        <line x1={ex1 - 14} y1={ye} x2={ex2 + 14} y2={ye} /><Tick x={ex1} y={ye} /><Tick x={ex2} y={ye} />
        <line x1={x0 + W} y1={y0} x2={aX + 6} y2={y0} strokeDasharray="3 3" />
        <line x1={aFromX} y1={aTop} x2={aX + 6} y2={aTop} strokeDasharray="3 3" />
        <line x1={aX} y1={y0 - 12} x2={aX} y2={aTop + 12} /><Tick x={aX} y={y0} /><Tick x={aX} y={aTop} />
      </g>
      <text x={(k0 + k1) / 2} y={yk - 8} textAnchor="middle" {...txt}>{'k = ' + auto(c.k) + NB + 'mm'}</text>
      <text x={xB - 8} y={y0 + H / 2 + 4} textAnchor="end" {...txt}>{'B = ' + auto(c.B) + NB + 'mm'}</text>
      <text x={(ex1 + ex2) / 2} y={ye + 18} textAnchor="middle" {...txt}>{'e = ' + auto(E) + NB + 'mm'}</text>
      <text x={aX + 10} y={(y0 + aTop) / 2 + 4} {...txt}>{'a = ' + num(A, 1) + NB + 'mm'}</text>
    </svg>
  );
}

function NastrihovyPlan() {
  const [vid, setVid] = useState('rp');
  const v = VARIANTS.find(x => x.id === vid);
  const c = calc(v);
  const S = v.shape === 'rect' ? auto(c.S) : num(c.S, 1);
  const B = auto(c.B), eta = num(c.eta, 1);
  const cells = [
    ['k', 'krok', auto(c.k) + NB + 'mm', '#eaf2fa'],
    ['B', 'šířka pásu', B + NB + 'mm', '#eaf2fa'],
    ['n', 'výstřižků na krok', String(c.n), '#eaf2fa'],
    ['S', 'plocha výstřižku', S + NB + 'mm²', '#eaf2fa'],
    ['η', 'využití materiálu', eta + NB + '%', GOOD],
  ];
  const sw = (bg, bd) => ({ width: 14, height: 14, borderRadius: 3, background: bg, border: '1px solid ' + bd, boxSizing: 'border-box' });
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', gap: 12, padding: 20, boxSizing: 'border-box', fontFamily: SANS, color: '#eaf2fa', overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {VARIANTS.map(x => (
          <button key={x.id} type="button" onClick={() => setVid(x.id)} style={{
            height: 36, padding: '0 16px', borderRadius: 10, cursor: 'pointer', fontFamily: HEAD, fontWeight: 700, fontSize: 14,
            background: vid === x.id ? ACC : 'rgba(120,150,180,0.06)', color: vid === x.id ? '#0b1017' : '#c4d2de',
            border: vid === x.id ? '1px solid rgba(123,163,204,0.5)' : '1px solid rgba(150,180,210,0.2)',
          }}>{x.label}</button>
        ))}
      </div>
      <PlanSvg v={v} c={c} />
      <div style={{ display: 'flex', gap: 20, fontSize: 13.5, color: '#aebfcf' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={sw(STEEL, STEEL_E)}></span>výstřižek</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={sw(WASTE, WASTE_E)}></span>odpad</span>
        <span style={{ marginLeft: 'auto' }}>směr posuvu pásu →</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10 }}>
        {cells.map(([sym, name, val, col]) => (
          <div key={sym} style={{ background: 'rgba(120,150,180,0.06)', border: '1px solid rgba(150,180,210,0.16)', borderRadius: 12, padding: '10px 14px' }}>
            <div style={{ fontSize: 12.5, color: '#8296a8' }}><span style={{ fontFamily: MONO, color: '#c4d2de' }}>{sym}</span>{' — ' + name}</div>
            <div style={{ fontFamily: MONO, fontSize: 20, color: col, marginTop: 2 }}>{val}</div>
          </div>
        ))}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 14, color: '#aebfcf' }}>
        {'η = ' + c.n + ' · ' + S + ' / (' + B + ' · ' + auto(c.k) + ') · 100' + NB + '% = ' + eta + NB + '%'}
      </div>
    </div>
  );
}
window.NastrihovyPlan = NastrihovyPlan;
})();
