// protlacovani.jsx — klikací schémata protlačování (osový řez) s přepínačem Začátek / Konec.
// Jedna komponenta, způsob se volí atributem zpusob="…" na <x-import>.
// Rozměry přířezu a výlisku jsou voleny tak, aby se objem materiálu zachoval (V = π·r²·h po úsecích).
const { useState } = React;
const SANS = "'IBM Plex Sans', system-ui, sans-serif";
const HEAD = "'Quicksand', system-ui, sans-serif";
const WARN = '#eda962';
const FLOW = '#57b98a';

// Pevná mezera za jednopísmennými předložkami a spojkami a za ve/ze/ke.
const nb = (t) => t.replace(/(?<=^|\s)([aikosuvzAIKOSUVZ]|[VvZzKk]e) /g, '$1 ');

const KIND = {
  steel: { fill: '#1a2430', stroke: '#7d90a3', strokeWidth: 1.5 },
  work: { fill: '#c4d2de', stroke: '#eaf2fa', strokeWidth: 1 },
};
function look(kind, on) {
  const b = KIND[kind];
  if (!on) return b;
  return { ...b, fill: kind === 'work' ? WARN : 'rgba(237,169,98,0.34)', stroke: WARN, strokeWidth: 2 };
}
const DECO = { pointerEvents: 'none' };
const arrow = (x1, y1, x2, y2, c = '#8296a8') => {
  const a = Math.atan2(y2 - y1, x2 - x1), s = 7;
  const p1 = [x2 - s * Math.cos(a - 0.45), y2 - s * Math.sin(a - 0.45)];
  const p2 = [x2 - s * Math.cos(a + 0.45), y2 - s * Math.sin(a + 0.45)];
  return (
    <g key={`${x1},${y1},${x2},${y2}`} style={DECO}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth="2" />
      <polygon points={`${x2},${y2} ${p1[0]},${p1[1]} ${p2[0]},${p2[1]}`} fill={c} />
    </g>
  );
};
const axis = (x, y1, y2) => <line key="osa" x1={x} y1={y1} x2={x} y2={y2} stroke="#5d7085" strokeWidth="1" strokeDasharray="14 4 3 4" style={DECO} />;
const byPhase = (v, f) => (v && !Array.isArray(v) && typeof v === 'object' && 'pred' in v ? v[f] : v);

// Části: id, name (může záviset na fázi), desc (může záviset na fázi), draw(on, f), label {x, y}, to.
const SCHEMATA = {
  // Přířez r 40, h 60 → hlava r 40, h 30 + kužel (r 40 → 20, h 15) + dřík r 20, h 85.
  dopredne: {
    vb: '0 0 500 300',
    over: (f) => [
      axis(170, 20, 298),
      f === 'pred' ? arrow(245, 30, 245, 66) : arrow(245, 60, 245, 96),
      ...(f === 'po' ? [arrow(170, 222, 170, 270, FLOW)] : []),
    ],
    parts: [
      { id: 'prutlacnik', name: 'Průtlačník', desc: 'Tlačí na přířez ve směru osy (šedá šipka). Sílu přenáší čelem na materiál.',
        label: { x: 320, y: 50 }, to: { pred: [210, 50], po: [210, 80] },
        draw: (on, f) => [<rect key="p" x="130" y={f === 'pred' ? 30 : 60} width="80" height="100" {...look('steel', on)} />] },
      { id: 'prutlacnice', name: 'Průtlačnice', desc: 'Uzavírá přířez ze stran. Ve dně má zúžený výstupní otvor, jeho tvar určuje průřez dříku.',
        label: { x: 320, y: 200 }, to: [280, 200],
        draw: (on) => [
          <path key="l" d="M60,80 H130 V190 L150,205 V260 H60 Z" {...look('steel', on)} />,
          <path key="r" d="M280,80 H210 V190 L190,205 V260 H280 Z" {...look('steel', on)} />,
        ] },
      { id: 'material', name: { pred: 'Přířez', po: 'Výlisek' },
        desc: { pred: 'Válcový špalík vložený do průtlačnice. Povrch je pokrytý mazivem.',
          po: 'Materiál vytekl otvorem ve směru pohybu průtlačníku (zelená šipka). V dutině zůstala hlava, pod ní vznikl dřík.' },
        label: { x: 320, y: 275 }, to: { pred: [196, 175], po: [190, 280] },
        draw: (on, f) => [f === 'pred'
          ? <rect key="m" x="130" y="130" width="80" height="60" {...look('work', on)} />
          : <path key="m" d="M130,160 H210 V190 L190,205 V290 H150 V205 L130,190 Z" {...look('work', on)} />] },
    ],
  },

  // Rondel r 50, h 40 → dno r 50, h 10 + stěna mezikruží r 40–50, h 83,3.
  zpetne: {
    vb: '0 0 500 300',
    over: (f) => [
      axis(170, 20, 280),
      f === 'pred' ? arrow(250, 40, 250, 76) : arrow(250, 70, 250, 106),
      ...(f === 'po' ? [arrow(125, 195, 125, 145, FLOW), arrow(215, 195, 215, 145, FLOW)] : []),
    ],
    parts: [
      { id: 'prutlacnik', name: 'Průtlačník', desc: 'Má menší průměr než dutina průtlačnice a vniká do přířezu. Jeho konečná poloha určuje tloušťku dna.',
        label: { x: 320, y: 50 }, to: { pred: [210, 60], po: [210, 100] },
        draw: (on, f) => [<rect key="p" x="130" y={f === 'pred' ? 40 : 70} width="80" height="140" {...look('steel', on)} />] },
      { id: 'prutlacnice', name: 'Průtlačnice', desc: 'Dutina se dnem. Mezera mezi stěnou dutiny a průtlačníkem určuje tloušťku stěny výlisku.',
        label: { x: 320, y: 150 }, to: [290, 150],
        draw: (on) => [
          <path key="l" d="M50,90 H120 V220 H140 V260 H50 Z" {...look('steel', on)} />,
          <path key="r" d="M290,90 H220 V220 H200 V260 H290 Z" {...look('steel', on)} />,
        ] },
      { id: 'material', name: { pred: 'Přířez', po: 'Výlisek' },
        desc: { pred: 'Plochý kotouč (rondel) na dně průtlačnice.',
          po: 'Materiál vytekl mezerou proti pohybu průtlačníku (zelené šipky). Vznikl dutý díl s dnem.' },
        label: { x: 320, y: 205 }, to: { pred: [218, 200], po: [218, 175] },
        draw: (on, f) => [f === 'pred'
          ? <rect key="m" x="120" y="180" width="100" height="40" {...look('work', on)} />
          : <path key="m" d="M120,126.7 H130 V210 H210 V126.7 H220 V220 H120 Z" {...look('work', on)} />] },
      { id: 'vyhazovac', name: 'Vyhazovač', desc: 'Tvoří střed dna dutiny. Po zpětném zdvihu průtlačníku vysune výlisek z průtlačnice.',
        label: { x: 320, y: 265 }, to: [200, 262],
        draw: (on) => [<rect key="v" x="140" y="220" width="60" height="50" {...look('steel', on)} />] },
    ],
  },

  // Přířez r 30, h 120 → spodní část r 30, h 40 + příruba r 60, h 20.
  stranove: {
    vb: '0 0 500 300',
    over: (f) => [
      axis(170, 5, 260),
      f === 'pred' ? arrow(245, 14, 245, 50) : arrow(245, 74, 245, 110),
      ...(f === 'po' ? [arrow(192, 180, 226, 180, FLOW), arrow(148, 180, 114, 180, FLOW)] : []),
    ],
    parts: [
      { id: 'prutlacnik', name: 'Průtlačník', desc: 'Tlačí ve směru osy přířezu (šedá šipka).',
        label: { x: 320, y: 40 }, to: { pred: [200, 40], po: [200, 100] },
        draw: (on, f) => [<rect key="p" x="140" y={f === 'pred' ? 10 : 70} width="60" height="100" {...look('steel', on)} />] },
      { id: 'prutlacnice', name: 'Dělená průtlačnice', desc: 'Horní a dolní díl. V dělicí rovině je boční dutina pro přírubu. Po rozevření dílů jde výlisek vyjmout.',
        label: { x: 320, y: 130 }, to: [300, 130],
        draw: (on) => [
          <path key="hl" d="M40,60 H140 V170 H40 Z" {...look('steel', on)} />,
          <path key="hr" d="M300,60 H200 V170 H300 Z" {...look('steel', on)} />,
          <path key="d" d="M40,170 H110 V190 H140 V230 H200 V190 H230 V170 H300 V250 H40 Z" {...look('steel', on)} />,
        ] },
      { id: 'material', name: { pred: 'Přířez', po: 'Výlisek' },
        desc: { pred: 'Válcový přířez v otvoru průtlačnice.',
          po: 'Materiál vytekl do boční dutiny kolmo na pohyb průtlačníku (zelené šipky) a vytvořil přírubu.' },
        label: { x: 320, y: 215 }, to: { pred: [196, 205], po: [228, 186] },
        draw: (on, f) => [f === 'pred'
          ? <rect key="m" x="140" y="110" width="60" height="120" {...look('work', on)} />
          : <path key="m" d="M110,170 H230 V190 H200 V230 H140 V190 H110 Z" {...look('work', on)} />] },
    ],
  },
};

const labelW = (name) => name.length * 6.8 + 10;
const PHASES = [{ id: 'pred', t: 'Začátek' }, { id: 'po', t: 'Konec' }];

function ProtlacovaniSchema({ zpusob }) {
  const S = SCHEMATA[zpusob];
  const [act, setAct] = useState(null);
  const [f, setF] = useState('pred');
  if (!S) return null;
  const toggle = (id) => setAct((a) => (a === id ? null : id));
  const ap = S.parts.find((p) => p.id === act);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '14px 16px', boxSizing: 'border-box', fontFamily: SANS, color: '#eaf2fa' }}>
      <div style={{ flex: 'none', display: 'flex', gap: 6, marginBottom: 6 }}>
        {PHASES.map((ph) => {
          const on = f === ph.id;
          return (
            <button key={ph.id} onClick={() => setF(ph.id)} style={{ padding: '6px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: SANS, fontSize: 13, fontWeight: 600, border: `1px solid ${on ? WARN : 'rgba(150,180,210,0.25)'}`, background: on ? 'rgba(237,169,98,0.14)' : 'transparent', color: on ? WARN : '#aebfcf' }}>{ph.t}</button>
          );
        })}
      </div>
      <svg viewBox={S.vb} style={{ width: '100%', flex: '1 1 auto', minHeight: 0, display: 'block' }}>
        {S.parts.map((p) => (
          <g key={p.id} onClick={() => toggle(p.id)} style={{ cursor: 'pointer' }}>{p.draw(act === p.id, f)}</g>
        ))}
        {S.over(f)}
        {S.parts.map((p) => {
          const on = act === p.id;
          const fr = [p.label.x - 6, p.label.y - 4];
          const to = byPhase(p.to, f);
          return (
            <g key={`l-${p.id}`} style={DECO}>
              <line x1={fr[0]} y1={fr[1]} x2={to[0]} y2={to[1]} stroke={on ? WARN : '#5d7085'} strokeWidth="1" />
              <circle cx={to[0]} cy={to[1]} r="2" fill={on ? WARN : '#8296a8'} />
            </g>
          );
        })}
        {S.parts.map((p) => {
          const on = act === p.id;
          const name = byPhase(p.name, f);
          return (
            <g key={`t-${p.id}`} onClick={() => toggle(p.id)} style={{ cursor: 'pointer' }}>
              <rect x={p.label.x - 5} y={p.label.y - 15} width={labelW(name)} height="21" rx="4" fill={on ? 'rgba(237,169,98,0.12)' : 'transparent'} />
              <text x={p.label.x} y={p.label.y} fontFamily={SANS} fontSize="12.5" fontWeight={on ? 600 : 500} fill={on ? WARN : '#c4d2de'}>{name}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ flex: 'none', height: 84, marginTop: 8, padding: '10px 14px', boxSizing: 'border-box', background: 'rgba(120,150,180,0.06)', border: '1px solid rgba(150,180,210,0.16)', borderRadius: 10 }}>
        {ap ? (
          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: '#d3dfea' }}>
            <span style={{ fontFamily: HEAD, fontWeight: 700, color: WARN }}>{byPhase(ap.name, f)}: </span>{nb(byPhase(ap.desc, f))}
          </div>
        ) : (
          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: '#8296a8' }}>{nb('Klikni na část schématu nebo na její popisek.')}</div>
        )}
      </div>
    </div>
  );
}
window.ProtlacovaniSchema = ProtlacovaniSchema;
