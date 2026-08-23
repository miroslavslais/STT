// zpevneni-krivka.jsx — křivka zpevnění: odlehčení a nové zatížení po deformaci za studena.
// Model: hlubokotažná ocel, přirozený přetvárný odpor sigma = K * fi^n.
const { useState } = React;
const SANS = "'IBM Plex Sans', system-ui, sans-serif";
const HEAD = "'Quicksand', system-ui, sans-serif";
const MONO = "'IBM Plex Mono', ui-monospace, monospace";
const ACC = '#7ba3cc', GOOD = '#57b98a', BAD = '#e0655a', WARN = '#eda962';

const K = 530, N = 0.22, E = 210000, RE0 = 180, RM0 = 320, A0 = 40;
const FIMAX = 0.8;

function flow(fi) { return fi <= 0 ? RE0 : Math.max(RE0, K * Math.pow(fi, N)); }
function model(fi) {
  const Re = flow(fi);
  const Rm = Math.max(RM0, Re * 1.04);
  const A = A0 * Math.exp(-3.3 * fi);
  const HB = Rm / 3.5;
  return { Re, Rm, A, HB, red: 100 * (1 - Math.exp(-fi)) };
}

const W = 430, H = 310, L = 52, R = 16, T = 34, B = 44;
const RES = 92;                            // rezerva vpravo na pružnou část křivky
const px = fi => L + (fi / FIMAX) * (W - L - RES);
const py = s => H - B - (s / 600) * (H - T - B);
const KE = 26 / RE0;                       // px na MPa — pružná část, zvětšeno pro čitelnost
const X = fi => px(fi) + KE * flow(fi);    // vodorovná poloha = trvalá + pružná deformace

function Chart({ fi, m }) {
  const path = n => {
    const a = [];
    for (let i = 0; i <= 120; i++) { const f = (i / 120) * n; a.push(`${X(f).toFixed(1)},${py(flow(f)).toFixed(1)}`); }
    return a.join(' ');
  };
  const active = fi > 0.02;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      <defs>
        <marker id="zar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 1 L10 5 L0 9 z" fill="#8296a8" />
        </marker>
      </defs>
      <text x={L - 44} y={16} fontFamily={SANS} fontSize="12.5" fill="#8296a8">σ [MPa]</text>
      {[0, 150, 300, 450, 600].map(s => (
        <g key={s}>
          <line x1={L} y1={py(s)} x2={W - R} y2={py(s)} stroke="rgba(150,180,210,0.13)" strokeWidth="1" />
          <text x={L - 8} y={py(s) + 4} textAnchor="end" fontFamily={MONO} fontSize="11.5" fill="#66788a">{s}</text>
        </g>
      ))}
      <line x1={L} y1={H - B} x2={W - R} y2={H - B} stroke="#8296a8" strokeWidth="1.2" markerEnd="url(#zar)" />
      <line x1={L} y1={H - B} x2={L} y2={T - 6} stroke="#8296a8" strokeWidth="1.2" markerEnd="url(#zar)" />
      <text x={W - R} y={H - B + 32} textAnchor="end" fontFamily={SANS} fontSize="12.5" fill="#8296a8">trvalá deformace ε [–]</text>
      {[0, 0.2, 0.4, 0.6, 0.8].map(f => (
        <text key={f} x={px(f)} y={H - B + 17} textAnchor="middle" fontFamily={MONO} fontSize="11.5" fill="#66788a">{f.toFixed(1).replace('.', ',')}</text>
      ))}

      <polyline points={path(FIMAX)} fill="none" stroke="rgba(123,163,204,0.3)" strokeWidth="2" strokeDasharray="5 4" />
      <line x1={L} y1={py(0)} x2={X(0)} y2={py(RE0)} stroke="rgba(123,163,204,0.5)" strokeWidth="2" />
      <polyline points={path(fi)} fill="none" stroke={ACC} strokeWidth="2.6" strokeLinecap="round" />

      <line x1={L} y1={py(RE0)} x2={W - R} y2={py(RE0)} stroke={GOOD} strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
      <text x={W - R} y={py(RE0) - 7} textAnchor="end" fontFamily={SANS} fontSize="12" fill={GOOD}>původní mez kluzu 180</text>

      {active && (
        <g>
          <line x1={X(fi)} y1={py(m.Re)} x2={px(fi)} y2={py(0)} stroke={WARN} strokeWidth="2.2" />
          <line x1={L} y1={py(m.Re)} x2={X(fi)} y2={py(m.Re)} stroke={WARN} strokeWidth="1" strokeDasharray="3 3" opacity="0.75" />
          <text x={L + 6} y={py(m.Re) - 8} fontFamily={SANS} fontSize="12.5" fill={WARN}>nová mez kluzu {Math.round(m.Re)} MPa</text>
          <circle cx={X(fi)} cy={py(m.Re)} r="5" fill={WARN} stroke="#0b1017" strokeWidth="1.5" />
          <circle cx={px(fi)} cy={py(0)} r="4" fill="none" stroke={WARN} strokeWidth="1.6" />
        </g>
      )}
      <text x={X(0.66)} y={py(flow(0.66)) - 12} textAnchor="middle" fontFamily={SANS} fontSize="12.5" fill="rgba(123,163,204,0.7)">křivka zpevnění</text>
    </svg>
  );
}

function Bar({ label, value, unit, frac, color, note }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontFamily: SANS, fontSize: 14, color: '#aebfcf' }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 15, color }}>{value}<span style={{ fontSize: 12, color: '#8296a8' }}> {unit}</span></span>
      </div>
      <div style={{ height: 7, borderRadius: 4, background: 'rgba(150,180,210,0.12)', overflow: 'hidden' }}>
        <div style={{ width: `${Math.max(2, Math.min(100, frac * 100))}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.15s linear' }}></div>
      </div>
      {note && <div style={{ fontFamily: SANS, fontSize: 12, color: '#66788a' }}>{note}</div>}
    </div>
  );
}

function Zpevneni() {
  const [fi, setFi] = useState(0.3);
  const m = model(fi);
  const spent = 1 - m.A / A0;
  const stav = m.A > 20 ? { c: GOOD, t: 'Zásoba tvárnosti je dostatečná', d: 'Materiál snese další tvářecí operaci bez mezioperačního žíhání.' }
    : m.A > 8 ? { c: WARN, t: 'Tvárnost se vyčerpává', d: 'Další tah už je na hraně. Nástroje musí překonat vyšší mez kluzu a roste odpružení.' }
    : { c: BAD, t: 'Tvárnost je vyčerpaná', d: 'Materiál praská při další deformaci. Před dalším tvářením je nutné rekrystalizační žíhání.' };

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 20, padding: 20, boxSizing: 'border-box', fontFamily: SANS, color: '#eaf2fa', overflow: 'hidden' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
        <Chart fi={fi} m={m} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 14.5, color: '#c4d2de' }}>Míra deformace za studena</span>
            <span style={{ fontFamily: MONO, fontSize: 14.5, color: ACC }}>ε = {fi.toFixed(2).replace('.', ',')} · úběr {Math.round(m.red)} %</span>
          </div>
          <input type="range" min={0} max={80} step={1} value={Math.round(fi * 100)}
            onChange={e => setFi(parseInt(e.target.value, 10) / 100)}
            style={{ width: '100%', accentColor: ACC, cursor: 'pointer' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#8296a8' }}>
            <span>žíhaný stav</span><span>silně protažený drát</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: 'rgba(120,150,180,0.06)', border: '1px solid rgba(150,180,210,0.16)', borderRadius: 14, padding: '16px 18px' }}>
          <Bar label="Mez kluzu Re" value={Math.round(m.Re)} unit="MPa" frac={m.Re / 550} color={ACC} note={`z původních 180 MPa · ${(m.Re / RE0).toFixed(1).replace('.', ',')}×`} />
          <Bar label="Mez pevnosti Rm" value={Math.round(m.Rm)} unit="MPa" frac={m.Rm / 550} color="#9fb8d0" />
          <Bar label="Tvrdost" value={Math.round(m.HB)} unit="HB" frac={m.HB / 160} color="#c4a86a" />
          <div style={{ height: 1, background: 'rgba(150,180,210,0.16)' }}></div>
          <Bar label="Tažnost A" value={m.A.toFixed(1).replace('.', ',')} unit="%" frac={m.A / A0} color={m.A > 20 ? GOOD : m.A > 8 ? WARN : BAD} note={`vyčerpáno ${Math.round(spent * 100)} % zásoby tvárnosti`} />
        </div>
        <div style={{ background: 'rgba(120,150,180,0.06)', border: '1px solid rgba(150,180,210,0.16)', borderRadius: 14, padding: '14px 18px' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 16, color: stav.c, marginBottom: 4 }}>{stav.t}</div>
          <div style={{ fontSize: 14, lineHeight: 1.55, color: '#d3dfea' }}>{stav.d}</div>
        </div>
      </div>
    </div>
  );
}
window.Zpevneni = Zpevneni;
