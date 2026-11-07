// metalizovani.jsx — plamenové stříkání kovu drátem (osový řez pistolí) a stavba stříkaného povlaku.
// MetalizovaniPistole: animovaný řez — posuv drátu, plamen, stlačený vzduch, let kapiček, růst povlaku.
// MetalizovaniPovlak: řez povlakem — zdrsněná ocel, lamely, póry, uzavírací nátěr.
(function () {
const { useState, useEffect, useRef } = React;
const SANS = "'IBM Plex Sans', system-ui, sans-serif";
const HL = 'oklch(0.78 0.16 35)';
const HL_FILL = 'oklch(0.72 0.16 35 / 0.32)';
const DECO = { pointerEvents: 'none' };
const nb = (t) => t.replace(/(?<=^|\s)([aikosuvzAIKOSUVZ]|[VvZzKk]e) /g, '$1 ');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, u) => a + (b - a) * u;

const STEEL = '#3a4756', STEEL_S = '#7d90a3';
const BODY = '#1a2430', BODY_S = '#7d90a3';
const GAS = 'oklch(0.80 0.14 85)';
const AIR = '#8fc1ea';
const ZINC = '#b9c4ce';
const SEAL = 'oklch(0.62 0.10 165)';

function useClock() {
  const [t, setT] = useState(0);
  const ref = useRef({ t: 0, last: null, raf: null });
  useEffect(() => {
    const r = ref.current;
    const tick = (now) => {
      const dt = r.last == null ? 0 : Math.min(0.05, (now - r.last) / 1000);
      r.last = now; r.t += dt; setT(r.t);
      r.raf = requestAnimationFrame(tick);
    };
    r.raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(r.raf);
  }, []);
  return t;
}

function Hatch({ id, color }) {
  return (
    <pattern id={id} patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="7" stroke={color} strokeWidth="1.2" />
    </pattern>
  );
}

function Label({ id, x, y, text, to, act, toggle, anchor }) {
  const on = act === id;
  const w = text.length * 7.1 + 12;
  const x0 = anchor === 'end' ? x - w + 5 : x - 5;
  return (
    <g>
      {to && (
        <g style={DECO}>
          <line x1={to[2]} y1={to[3]} x2={to[0]} y2={to[1]} stroke={on ? HL : '#5d7085'} strokeWidth="1" />
          <circle cx={to[0]} cy={to[1]} r="2" fill={on ? HL : '#8296a8'} />
        </g>
      )}
      <g onClick={() => toggle(id)} style={{ cursor: 'pointer' }}>
        <rect x={x0} y={y - 15} width={w} height="21" rx="4" fill={on ? 'oklch(0.72 0.16 35 / 0.14)' : 'transparent'} />
        <text x={x} y={y} textAnchor={anchor || 'start'} fontFamily={SANS} fontSize="13" fontWeight={on ? 600 : 500} fill={on ? HL : '#c4d2de'}>{text}</text>
      </g>
    </g>
  );
}

function InfoBox({ part, empty }) {
  return (
    <div style={{ flex: 'none', minHeight: 62, marginTop: 6, padding: '10px 14px', boxSizing: 'border-box', background: 'rgba(120,180,230,0.05)', border: '1px solid rgba(120,180,230,0.16)', borderRadius: 10 }}>
      {part ? (
        <div style={{ fontSize: 13.5, lineHeight: 1.5, color: '#d3dfea' }}>
          <span style={{ fontWeight: 600, color: HL }}>{part.name}: </span>{nb(part.desc)}
        </div>
      ) : (
        <div style={{ fontSize: 13.5, lineHeight: 1.5, color: '#8296a8' }}>{nb(empty)}</div>
      )}
    </div>
  );
}

// ── Pistole ───────────────────────────────────────────────────────────
const AX = 210;            // osa pistole
const FACE = 92;           // čelo pokovovaného předmětu
const TIP = 178;           // konec drátu (místo tavení)
const BODY_END = 600;
const P1 = {
  drat: { name: 'Drát', desc: 'Nanášený kov ve formě drátu. Posouvá se osou pistole stejnou rychlostí, jakou se jeho konec v plameni taví.' },
  plyn: { name: 'Acetylén + kyslík', desc: 'Směs hoří na ústí hubice. Plamen obklopuje konec drátu a taví ho.' },
  vzduch: { name: 'Stlačený vzduch', desc: 'Vnějším kanálem proudí ke konci drátu. Strhává roztavený kov, rozpráší ho na kapičky a urychlí je proti povrchu předmětu.' },
  hubice: { name: 'Hubice pistole', desc: 'Soustředné kanály vedou drát, hořlavou směs a vzduch odděleně až k ústí.' },
  kapky: { name: 'Kapičky kovu', desc: 'Letí v kuželu od konce drátu k předmětu. Za letu se ochlazují, při dopadu jsou stále plastické a zploští se.' },
  predmet: { name: 'Pokovovaný předmět', desc: 'Povrch je před nástřikem otryskaný. Zploštělé kapičky se zachytí na nerovnostech a vrstva po vrstvě tvoří povlak. Předmět se ohřeje jen málo.' },
};
// horní polovina; dolní je zrcadlová podle osy
const mir = (pts) => pts.map(([x, y]) => [x, 2 * AX - y]);
const poly = (pts) => pts.map((p) => p.join(',')).join(' ');
const G_TUBE = [[250, 195], [BODY_END, 195], [BODY_END, 203], [250, 203]];
const G_GAS = [[262, 178], [BODY_END, 178], [BODY_END, 195], [250, 195]];
const G_WALL = [[274, 168], [BODY_END, 168], [BODY_END, 178], [262, 178]];
const G_AIR = [[318, 140], [BODY_END, 140], [BODY_END, 168], [274, 168], [286, 160]];
const G_CAP = [[330, 118], [BODY_END, 118], [BODY_END, 140], [318, 140], [286, 160], [278, 156]];

function MetalizovaniPistole() {
  const t = useClock();
  const [act, setAct] = useState(null);
  const toggle = (id) => setAct((a) => (a === id ? null : id));
  const on = (id) => act === id;
  const coat = Math.min(7, 1 + t * 0.3);
  const face = FACE + coat;
  // kapičky
  const drops = [];
  const N = 46;
  for (let i = 0; i < N; i++) {
    const h = Math.sin(i * 12.9898) * 43758.5453;
    const rnd = h - Math.floor(h);
    const s = ((t / 0.9) + i / N) % 1;
    const yEnd = AX + (rnd * 2 - 1) * 88;
    const x = lerp(TIP - 2, face + 2, s);
    const y = lerp(AX, yEnd, s);
    const hot = 1 - s;
    drops.push(<circle key={i} cx={x} cy={y} r={lerp(2.6, 1.8, s)} fill={`oklch(${0.62 + 0.18 * hot} ${0.04 + 0.14 * hot} ${40 + 30 * hot})`} />);
  }
  // posuv drátu — značky
  const feed = (t * 18) % 24;
  const wireMarks = [];
  for (let x = TIP + 20 - feed; x < 640; x += 24) if (x > TIP + 4) wireMarks.push(<line key={x} x1={x} y1={AX - 6} x2={x} y2={AX + 6} stroke="#8a96a3" strokeWidth="1" />);
  const flick = 0.85 + 0.15 * Math.sin(t * 23) * Math.sin(t * 7.3);
  const dash = -(t * 60) % 20;
  const coatPts = [];
  for (let y = 108; y <= 312; y += 4) coatPts.push([FACE + coat + 1.2 * Math.sin(y * 0.9) + 0.8 * Math.sin(y * 0.37), y]);
  const coatPoly = [[FACE, 108]].concat(coatPts).concat([[FACE, 312]]);
  const sel = (id, base) => (on(id) ? HL_FILL : base);
  const stk = (id, base) => (on(id) ? HL : base);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: 14, boxSizing: 'border-box', fontFamily: SANS }}>
      <svg viewBox="0 30 760 360" style={{ flex: 1, minHeight: 0, width: '100%' }}>
        <defs>
          <Hatch id="mz-h-steel" color="#566576" />
          <Hatch id="mz-h-body" color="#3c4c5e" />
        </defs>
        {/* kužel nástřiku */}
        <polygon points={`${TIP},${AX} ${face},${AX - 92} ${face},${AX + 92}`} fill="rgba(143,193,234,0.07)" style={DECO} />
        {/* předmět + povlak */}
        <g onClick={() => toggle('predmet')} style={{ cursor: 'pointer' }}>
          <rect x="30" y="100" width={FACE - 30} height="220" fill={on('predmet') ? HL_FILL : STEEL} stroke={stk('predmet', STEEL_S)} strokeWidth={on('predmet') ? 2 : 1.2} />
          <rect x="30" y="100" width={FACE - 30} height="220" fill="url(#mz-h-steel)" style={DECO} />
          <polygon points={poly(coatPoly)} fill={on('predmet') ? HL : ZINC} stroke={on('predmet') ? HL : '#dbe3ea'} strokeWidth="0.8" />
        </g>
        {/* hubice */}
        <g onClick={() => toggle('hubice')} style={{ cursor: 'pointer' }}>
          {[G_TUBE, G_WALL, G_CAP].map((g, i) => (
            <g key={i}>
              <polygon points={poly(g)} fill={sel('hubice', BODY)} stroke={stk('hubice', BODY_S)} strokeWidth={on('hubice') ? 2 : 1.2} />
              <polygon points={poly(mir(g))} fill={sel('hubice', BODY)} stroke={stk('hubice', BODY_S)} strokeWidth={on('hubice') ? 2 : 1.2} />
            </g>
          ))}
        </g>
        <g style={DECO}>
          {[G_TUBE, G_WALL, G_CAP].map((g, i) => (
            <g key={i}><polygon points={poly(g)} fill="url(#mz-h-body)" /><polygon points={poly(mir(g))} fill="url(#mz-h-body)" /></g>
          ))}
        </g>
        {/* plyn — kanál a plamen */}
        <g onClick={() => toggle('plyn')} style={{ cursor: 'pointer' }}>
          <polygon points={poly(G_GAS)} fill={on('plyn') ? HL : GAS} opacity={on('plyn') ? 0.9 : 0.55} stroke={stk('plyn', 'none')} strokeWidth="1.5" />
          <polygon points={poly(mir(G_GAS))} fill={on('plyn') ? HL : GAS} opacity={on('plyn') ? 0.9 : 0.55} stroke={stk('plyn', 'none')} strokeWidth="1.5" />
          <path d={`M262,178 Q215,186 ${TIP - 6},${AX} Q215,${2 * AX - 186} 262,${2 * AX - 178} L250,${2 * AX - 195} L250,195 Z`} fill={on('plyn') ? HL : 'oklch(0.80 0.16 70)'} opacity={0.75 * flick} stroke={stk('plyn', 'none')} strokeWidth="1.5" />
        </g>
        {/* vzduch — kanál a proud */}
        <g onClick={() => toggle('vzduch')} style={{ cursor: 'pointer' }}>
          <polygon points={poly(G_AIR)} fill={on('vzduch') ? HL_FILL : 'rgba(143,193,234,0.22)'} stroke={stk('vzduch', 'none')} strokeWidth="1.5" />
          <polygon points={poly(mir(G_AIR))} fill={on('vzduch') ? HL_FILL : 'rgba(143,193,234,0.22)'} stroke={stk('vzduch', 'none')} strokeWidth="1.5" />
        </g>
        <g style={DECO}>
          {[150, 156, 162].map((y) => (
            <g key={y}>
              <line x1={BODY_END - 4} y1={y} x2="330" y2={y} stroke={on('vzduch') ? HL : AIR} strokeWidth="1.3" strokeDasharray="8 12" strokeDashoffset={dash} opacity="0.8" />
              <line x1={BODY_END - 4} y1={2 * AX - y} x2="330" y2={2 * AX - y} stroke={on('vzduch') ? HL : AIR} strokeWidth="1.3" strokeDasharray="8 12" strokeDashoffset={dash} opacity="0.8" />
            </g>
          ))}
          <path d={`M282,163 Q230,180 ${TIP - 12},${AX - 2}`} fill="none" stroke={on('vzduch') ? HL : AIR} strokeWidth="1.5" strokeDasharray="8 12" strokeDashoffset={dash} />
          <path d={`M282,${2 * AX - 163} Q230,${2 * AX - 180} ${TIP - 12},${AX + 2}`} fill="none" stroke={on('vzduch') ? HL : AIR} strokeWidth="1.5" strokeDasharray="8 12" strokeDashoffset={dash} />
        </g>
        {/* drát */}
        <g onClick={() => toggle('drat')} style={{ cursor: 'pointer' }}>
          <path d={`M640,${AX - 7} L${TIP + 8},${AX - 7} Q${TIP},${AX - 6} ${TIP},${AX} Q${TIP},${AX + 6} ${TIP + 8},${AX + 7} L640,${AX + 7} Z`} fill={on('drat') ? HL : '#a9d2ec'} stroke={on('drat') ? HL : '#d7ecf8'} strokeWidth="1" />
        </g>
        <g style={DECO}>{wireMarks}</g>
        {/* kapičky */}
        <g onClick={() => toggle('kapky')} style={{ cursor: 'pointer' }}>
          <polygon points={`${TIP - 4},${AX} ${face + 2},${AX - 92} ${face + 2},${AX + 92}`} fill="transparent" />
          {act === 'kapky' ? drops.map((d) => React.cloneElement(d, { fill: HL })) : drops}
        </g>
        {/* popisky */}
        <Label id="vzduch" x={614} y={128} text="Stlačený vzduch" to={[590, 152, 608, 124]} act={act} toggle={toggle} />
        <Label id="plyn" x={614} y={176} text="Acetylén + kyslík" to={[590, 186, 608, 172]} act={act} toggle={toggle} />
        <Label id="drat" x={650} y={AX + 5} text="Drát" act={act} toggle={toggle} />
        <Label id="hubice" x={614} y={322} text="Hubice pistole" to={[590, 292, 608, 318]} act={act} toggle={toggle} />
        <Label id="kapky" x={150} y={66} text="Kapičky kovu" to={[150, 172, 168, 72]} act={act} toggle={toggle} />
        <Label id="predmet" x={26} y={354} text="Pokovovaný předmět" to={[60, 318, 60, 340]} act={act} toggle={toggle} />
      </svg>
      <InfoBox part={act ? P1[act] : null} empty="Klikni na část schématu nebo na její popisek." />
    </div>
  );
}

// ── Povlak ────────────────────────────────────────────────────────────
const P2 = {
  natur: { name: 'Uzavírací nátěr', desc: 'Vnikne do pórů a uzavře je. Vlhkost a soli se pak k oceli nedostanou ani pórovitým povlakem.' },
  lamely: { name: 'Lamely povlaku', desc: 'Každá lamela je jedna zploštělá kapička. Lamely se překrývají jako šupiny a drží na sobě i na podkladu hlavně mechanicky.' },
  pory: { name: 'Póry', desc: 'Dutinky mezi lamelami, které kapičky nevyplnily. Bez utěsnění jimi proniká vlhkost až k oceli.' },
  ocel: { name: 'Zdrsněná ocel', desc: 'Otryskaný povrch má ostré nerovnosti. Do nich se zploštělé kapičky zaklesnou — na hladkém povrchu by povlak nedržel.' },
};
const X0 = 20, X1 = 560;
const rough = () => {
  const pts = [];
  for (let i = 0, x = X0; x <= X1; i++, x += 14) pts.push([x, i % 2 ? 156 : 146 + ((i * 7) % 5)]);
  return pts;
};
const ROUGH = rough();
// lamely: [cx, cy, rx, ry]
const LAM = [];
(function () {
  const rows = [[129, 22], [117, 8], [105, 30]];
  rows.forEach(([cy, off], r) => {
    for (let x = X0 + 10 - off; x < X1 + 20; x += 74) {
      const k = Math.sin((x + r * 31) * 0.21);
      LAM.push([x + 30, cy + k * 1.5, 34 + 6 * k, 5.8]);
    }
  });
})();
// první vrstva vyplní nerovnosti zdrsněného povrchu
const BASE_LAYER = ROUGH.concat(Array.from({ length: 28 }, (_, i) => { const x = X1 - i * 20; return [Math.max(X0, x), 136 + 1.6 * Math.sin(x * 0.13)]; }).concat([[X0, 136]]));
const PORES = [[84, 135], [190, 123], [262, 136], [330, 111], [414, 124], [478, 111], [536, 136], [132, 112], [380, 136]];

function MetalizovaniPovlak() {
  const [act, setAct] = useState(null);
  const toggle = (id) => setAct((a) => (a === id ? null : id));
  const on = (id) => act === id;
  const clipRect = <rect x={X0} y={60} width={X1 - X0} height={110} />;
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: 14, boxSizing: 'border-box', fontFamily: SANS }}>
      <svg viewBox="0 64 760 130" style={{ flex: 1, minHeight: 0, width: '100%' }}>
        <defs>
          <Hatch id="mz-h-steel2" color="#566576" />
          <clipPath id="mz-clip">{clipRect}</clipPath>
        </defs>
        <g clipPath="url(#mz-clip)">
          <g onClick={() => toggle('ocel')} style={{ cursor: 'pointer' }}>
            <polygon points={poly(ROUGH.concat([[X1, 178], [X0, 178]]))} fill={on('ocel') ? HL_FILL : STEEL} stroke={on('ocel') ? HL : STEEL_S} strokeWidth={on('ocel') ? 2 : 1.2} />
          </g>
          <polygon points={poly(ROUGH.concat([[X1, 178], [X0, 178]]))} fill="url(#mz-h-steel2)" style={DECO} />
          <g onClick={() => toggle('lamely')} style={{ cursor: 'pointer' }}>
            <polygon points={poly(BASE_LAYER)} fill={on('lamely') ? HL_FILL : ZINC} stroke={on('lamely') ? HL : '#7f8b97'} strokeWidth="1" />
            {LAM.map(([cx, cy, rx, ry], i) => (
              <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill={on('lamely') ? HL_FILL : ZINC} stroke={on('lamely') ? HL : '#7f8b97'} strokeWidth="1" />
            ))}
          </g>
          <g onClick={() => toggle('pory')} style={{ cursor: 'pointer' }}>
            {PORES.map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="5" ry="2.6" fill={on('pory') ? HL : '#080b12'} stroke={on('pory') ? HL : 'none'} />)}
          </g>
          <g onClick={() => toggle('natur')} style={{ cursor: 'pointer' }}>
            <path d={`M${X0},92 ${Array.from({ length: 28 }, (_, i) => `L${X0 + i * 20 + 10},${90 + 2 * Math.sin(i * 1.7)}`).join(' ')} L${X1},92 L${X1},101 L${X0},101 Z`} fill={on('natur') ? HL : SEAL} opacity={on('natur') ? 0.9 : 0.75} />
          </g>
        </g>
        <Label id="natur" x={590} y={98} text="Uzavírací nátěr" to={[556, 96, 584, 94]} act={act} toggle={toggle} />
        <Label id="lamely" x={590} y={122} text="Lamely povlaku" to={[556, 117, 584, 118]} act={act} toggle={toggle} />
        <Label id="pory" x={590} y={146} text="Póry" to={[536, 136, 584, 142]} act={act} toggle={toggle} />
        <Label id="ocel" x={590} y={170} text="Zdrsněná ocel" to={[556, 162, 584, 166]} act={act} toggle={toggle} />
      </svg>
      <InfoBox part={act ? P2[act] : null} empty="Klikni na vrstvu nebo na její popisek." />
    </div>
  );
}

window.MetalizovaniPistole = MetalizovaniPistole;
window.MetalizovaniPovlak = MetalizovaniPovlak;
})();
