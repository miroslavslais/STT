// pechovani-pasma.jsx — interaktivní: rozložení deformace při pěchování.
// Pásma ztížené deformace u čel, intenzivní deformace ve středu, soudkovitost boku.
const { useState } = React;
const SANS = "'IBM Plex Sans', system-ui, sans-serif";
const HEAD = "'Quicksand', system-ui, sans-serif";
const DEAD = '#5c7186', MID = '#eda962', HIGH = '#e0655a';

const CX = 330, CY = 210, H0 = 240, R0 = 78;

function Diagram({ p }) {
  // p = 0..1 stupeň pěchování
  const h = H0 * (1 - 0.52 * p);
  const rMid = R0 / Math.sqrt(1 - 0.52 * p) * (1 + 0.20 * p);
  const rEnd = R0 / Math.sqrt(1 - 0.52 * p) * (1 - 0.06 * p);
  const yBot = CY + H0 / 2, yTop = yBot - h, cy = (yTop + yBot) / 2;

  const side = (s) => {
    let d = 'M' + (CX + s * rEnd).toFixed(1) + ' ' + yTop.toFixed(1);
    for (let i = 0; i <= 20; i++) {
      const u = i / 20;
      const r = rEnd + (rMid - rEnd) * Math.sin(u * Math.PI);
      d += ' L' + (CX + s * r).toFixed(1) + ' ' + (yTop + u * h).toFixed(1);
    }
    return d;
  };
  const body = side(-1).replace('M', 'M') + ' L' + (CX + rEnd).toFixed(1) + ' ' + yBot.toFixed(1) + ' ' +
    side(1).slice(1).split(' L').reverse().join(' L').replace(/^/, 'L') + ' Z';

  const outline = (() => {
    let d = 'M' + (CX - rEnd).toFixed(1) + ' ' + yTop.toFixed(1);
    for (let i = 0; i <= 20; i++) { const u = i / 20; const r = rEnd + (rMid - rEnd) * Math.sin(u * Math.PI); d += ' L' + (CX - r).toFixed(1) + ' ' + (yTop + u * h).toFixed(1); }
    for (let i = 20; i >= 0; i--) { const u = i / 20; const r = rEnd + (rMid - rEnd) * Math.sin(u * Math.PI); d += ' L' + (CX + r).toFixed(1) + ' ' + (yTop + u * h).toFixed(1); }
    return d + ' Z';
  })();

  const ramp = (a, b) => Math.max(0, Math.min(1, (p - a) / (b - a)));
  const oDead = ramp(0.04, 0.22), oMid = ramp(0.14, 0.34), oHigh = ramp(0.3, 0.55);
  const crack = p > 0.72;

  return (
    <svg viewBox="0 0 700 440" width="100%" style={{ display: 'block' }}>
      <defs>
        <clipPath id="pechClip"><path d={outline} /></clipPath>
      </defs>
      {/* kovadla */}
      <rect x={CX - 150} y={yTop - 40} width={300} height={38} rx={5} fill="#4a5563" stroke="#6d7986" strokeWidth={1.5} />
      <rect x={CX - 150} y={yBot + 2} width={300} height={38} rx={5} fill="#4a5563" stroke="#6d7986" strokeWidth={1.5} />

      <path d={outline} fill="#8b97a3" stroke="#5a6570" strokeWidth={1.8} />
      <g clipPath="url(#pechClip)">
        {/* pásma ztížené deformace — kužely u čel */}
        <path d={'M' + (CX - rEnd) + ' ' + yTop + ' L' + (CX + rEnd) + ' ' + yTop + ' L' + CX + ' ' + (yTop + h * 0.34) + ' Z'} fill={DEAD} opacity={0.9 * oDead} />
        <path d={'M' + (CX - rEnd) + ' ' + yBot + ' L' + (CX + rEnd) + ' ' + yBot + ' L' + CX + ' ' + (yBot - h * 0.34) + ' Z'} fill={DEAD} opacity={0.9 * oDead} />
        {/* střední zóna */}
        <ellipse cx={CX} cy={cy} rx={rMid * 0.72} ry={h * 0.3} fill={HIGH} opacity={0.75 * oHigh} />
        <ellipse cx={CX} cy={cy} rx={rMid * 1.05} ry={h * 0.42} fill={MID} opacity={0.3 * oMid} />
      </g>

      {crack && (
        <g>
          <path d={'M' + (CX + rMid - 3) + ' ' + (cy - 20) + ' L' + (CX + rMid - 16) + ' ' + cy + ' L' + (CX + rMid - 4) + ' ' + (cy + 22)} stroke={HIGH} strokeWidth={4} fill="none" strokeLinecap="round" />
          <line x1={CX + rMid + 6} y1={cy} x2={CX + 200} y2={cy + 40} stroke={HIGH} strokeWidth={1.3} />
          <text x={CX + 208} y={cy + 46} fontFamily={SANS} fontWeight="600" fontSize={16} fill={HIGH}>podélná trhlina<tspan x={CX + 208} dy={19}>na boku</tspan></text>
        </g>
      )}

      {/* legenda */}
      <g fontFamily={SANS} fontSize={13.5} fill="#c4d2de">
        <g opacity={0.25 + 0.75 * oDead}>
          <rect x={500} y={70} width={18} height={18} rx={4} fill={DEAD} />
          <text x={528} y={80}>pásmo ztížené deformace<tspan x={528} dy={17}>— hrubé zrno</tspan></text>
        </g>
        <g opacity={0.25 + 0.75 * oMid}>
          <rect x={500} y={124} width={18} height={18} rx={4} fill={MID} opacity={0.55} />
          <text x={528} y={138}>mírná deformace</text>
        </g>
        <g opacity={0.25 + 0.75 * oHigh}>
          <rect x={500} y={160} width={18} height={18} rx={4} fill={HIGH} opacity={0.8} />
          <text x={528} y={174}>intenzivní deformace</text>
        </g>
      </g>
      <text x={CX} y={412} textAnchor="middle" fontFamily={SANS} fontSize={15} fill="#8296a8">
        {'výška ' + Math.round(h / H0 * 100) + ' % původní'}
      </text>
    </svg>
  );
}

function PechovaniPasma() {
  const [p, setP] = useState(0.45);
  const msg = p < 0.12
    ? { t: 'Výchozí stav', d: 'Polotovar má po celém průřezu stejnou, hrubou licí strukturu.' }
    : p < 0.4
      ? { t: 'Kritická oblast deformace', d: 'Malá deformace vytvoří jen málo rekrystalizačních zárodků — vzniklé zrno je hrubší než původní. Této oblasti se vyplatí vyhnout.' }
      : p < 0.72
        ? { t: 'Účinné pěchování', d: 'Střed průřezu je dobře prokován a rekrystalizuje na jemné zrno. U čel ale tření drží materiál na místě — vzniká pásmo ztížené deformace.' }
        : { t: 'Přepěchováno', d: 'Bok je vyklenutý a namáhaný tahem, což vede k podélné trhlině. V pásmech ztížené deformace zůstává hrubé zrno.' };

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: 20, boxSizing: 'border-box', fontFamily: SANS, color: '#eaf2fa' }}>
      <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 20, marginBottom: 4 }}>Rozložení deformace při pěchování</div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center' }}>
        <Diagram p={p} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '4px 0 14px' }}>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 14 }}>Stupeň pěchování</div>
        <input type="range" min={0} max={1} step={0.01} value={p} onChange={e => setP(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: '#eda962' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#8296a8' }}><span>bez deformace</span><span>silné pěchování</span></div>
      </div>
      <div style={{ background: 'rgba(120,150,180,0.06)', border: '1px solid rgba(150,180,210,0.16)', borderRadius: 14, padding: '14px 18px', minHeight: 104, boxSizing: 'border-box' }}>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 16, color: '#eda962', marginBottom: 4 }}>{msg.t}</div>
        <div style={{ fontSize: 14.5, lineHeight: 1.55, color: '#c4d2de' }}>{msg.d}</div>
      </div>
    </div>
  );
}
window.PechovaniPasma = PechovaniPasma;
