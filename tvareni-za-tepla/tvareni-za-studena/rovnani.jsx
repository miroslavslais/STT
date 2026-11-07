// rovnani.jsx — válcová rovnačka: pás prochází mezi dvěma řadami válců a střídavě se ohýbá.
// Přítlak horních válců ve směru průchodu klesá; pás vystupuje rovný.
// Přepínač „Válce v záběru / rozevřené“ ukazuje, že bez ohybu zvlnění projde beze změny.
(function () {
const { useState, useEffect, useRef } = React;
const SANS = "'IBM Plex Sans', system-ui, sans-serif";
const HEAD = "'Quicksand', system-ui, sans-serif";
const WARN = '#eda962';
const ELAS = '#7ba3cc';
const DECO = { pointerEvents: 'none' };
const nb = (t) => t.replace(/(?<=^|\s)([aikosuvzAIKOSUVZ]|[VvZzKk]e) /g, '$1 ');

// Geometrie (jednotky viewBoxu)
const R = 46;            // poloměr válce
const HT = 5;            // polovina tloušťky pásu
const Y0 = 184;          // osa pásu nad spodními válci
const CYB = Y0 + HT + R; // střed spodního válce v záběru
const CYT = Y0 - HT - R; // střed horního válce, který se pásu jen dotýká
const OPEN = 16;         // o kolik se řady válců při rozevření vzdálí
const X_IN = 200, X_OUT = 650;
// Válce v pořadí průchodu: B = spodní, T = horní; d = zatlačení horního válce pod osu pásu.
const ROLLS = [
  { k: 'B', x: 200 }, { k: 'T', x: 290, d: 24 },
  { k: 'B', x: 380 }, { k: 'T', x: 470, d: 12 },
  { k: 'B', x: 560 }, { k: 'T', x: 650, d: 3 },
];
const V = 55;            // rychlost pásu
const KAPPA_Y = 10;      // mez kluzu v jednotkách diskrétního ohybu
const BAR_K = 1, BASE = 348;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
// Zvlnění pásu před rovnáním (souřadnice materiálu s)
const wave = (s) => 8 * Math.sin((2 * Math.PI * s) / 170) + 4 * Math.sin((2 * Math.PI * s) / 67 + 1.3);

// Body osy pásu v místech válců při přítlaku p
function contacts(p) {
  return ROLLS.map((r) => ({ x: r.x, y: r.k === 'T' ? Y0 + p * r.d : Y0 }));
}
function shapeAt(x, pts) {
  if (x <= pts[0].x) return pts[0].y;
  const last = pts[pts.length - 1];
  if (x >= last.x) return last.y;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (x <= b.x) {
      const u = (x - a.x) / (b.x - a.x);
      return a.y + ((b.y - a.y) * (1 - Math.cos(Math.PI * u))) / 2;
    }
  }
  return last.y;
}
// Diskrétní ohyb u každého válce: y(i-1) − 2·y(i) + y(i+1)
function bends(p) {
  const pts = contacts(p);
  return pts.map((c, i) => {
    const prev = i === 0 ? Y0 : pts[i - 1].y;
    const next = i === pts.length - 1 ? c.y : pts[i + 1].y;
    return prev - 2 * c.y + next;
  });
}

const PARTS = {
  horni: { name: 'Horní válce', desc: 'Zatlačují pás mezi spodní válce. Přítlak ve směru průchodu klesá — první horní válec ohýbá pás nejvíc, poslední nejméně.' },
  spodni: { name: 'Spodní válce', desc: 'Leží v jedné rovině. Pás se přes ně ohýbá na opačnou stranu než pod horními válci.' },
  pas: { name: 'Rovnaný pás', desc: 'Na vstupu je zvlněný. Mezi válci se střídavě ohýbá na obě strany a vystupuje rovný.' },
  plast: { name: 'Plastický ohyb', desc: 'Přetvoření překročí mez kluzu. Zakřivení, které pás měl před válcem, se přepíše novým ohybem.' },
  pruz: { name: 'Pružný ohyb', desc: 'Přetvoření zůstane pod mezí kluzu. Za válcem se pás pružně vrátí a trvalý ohyb nevznikne.' },
};

function Roll({ x, cy, ang, on, k }) {
  const fill = on ? 'rgba(237,169,98,0.34)' : '#1a2430';
  const stroke = on ? WARN : '#7d90a3';
  const a = (ang * 180) / Math.PI;
  // šipka směru otáčení: horní válce proti směru hodinových ručiček, spodní po směru
  const dir = k === 'T' ? -1 : 1;
  const rr = 26, a0 = -2.2 * dir, a1 = 1.2 * dir;
  const p0 = [x + rr * Math.cos(a0), cy + rr * Math.sin(a0)];
  const p1 = [x + rr * Math.cos(a1), cy + rr * Math.sin(a1)];
  const t = [-Math.sin(a1) * dir, Math.cos(a1) * dir];
  const n = [Math.cos(a1), Math.sin(a1)];
  const tip = [p1[0] + 7 * t[0], p1[1] + 7 * t[1]];
  return (
    <g>
      <circle cx={x} cy={cy} r={R} fill={fill} stroke={stroke} strokeWidth={on ? 2 : 1.5} />
      <g transform={`rotate(${a} ${x} ${cy})`} style={DECO}>
        <line x1={x - R + 8} y1={cy} x2={x + R - 8} y2={cy} stroke="#3c4c5e" strokeWidth="1" strokeDasharray="5 4" />
        <line x1={x} y1={cy - R + 8} x2={x} y2={cy + R - 8} stroke="#3c4c5e" strokeWidth="1" strokeDasharray="5 4" />
      </g>
      <g style={DECO}>
        <path d={`M${p0[0]},${p0[1]} A${rr},${rr} 0 1 ${dir > 0 ? 1 : 0} ${p1[0]},${p1[1]}`} fill="none" stroke="#8296a8" strokeWidth="2" />
        <polygon points={`${tip[0]},${tip[1]} ${p1[0] + 4.5 * n[0]},${p1[1] + 4.5 * n[1]} ${p1[0] - 4.5 * n[0]},${p1[1] - 4.5 * n[1]}`} fill="#8296a8" />
      </g>
    </g>
  );
}

function RovnaniValcove() {
  const [act, setAct] = useState(null);
  const [run, setRun] = useState(true);
  const [closed, setClosed] = useState(true);
  const [t, setT] = useState(0);
  const pRef = useRef(1);
  const [p, setP] = useState(1);
  const raf = useRef(null), last = useRef(null), st = useRef({ run: true, closed: true, t: 0 });
  st.current.run = run; st.current.closed = closed;
  useEffect(() => {
    const tick = (now) => {
      const dt = last.current == null ? 0 : Math.min(0.05, (now - last.current) / 1000);
      last.current = now;
      const s = st.current;
      if (s.run) { s.t += dt; setT(s.t); }
      const tgt = s.closed ? 1 : 0;
      if (pRef.current !== tgt) {
        pRef.current = tgt > pRef.current ? Math.min(1, pRef.current + dt / 0.8) : Math.max(0, pRef.current - dt / 0.8);
        setP(pRef.current);
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, []);
  const toggle = (id) => setAct((a) => (a === id ? null : id));
  const pe = ease(p);
  const shift = V * t;
  const pts = contacts(pe);
  const ramp = (x) => clamp((X_IN - x) / 70, 0, 1);
  const yAt = (x) => {
    const w = wave(x - shift);
    const fixed = shapeAt(x, pts);
    return fixed + w * ((1 - pe) + pe * ramp(x));
  };
  // obrys pásu
  const xs = [];
  for (let x = 10; x <= 950; x += 4) xs.push(x);
  const top = xs.map((x) => `${x},${(yAt(x) - HT).toFixed(2)}`);
  const bot = xs.slice().reverse().map((x) => `${x},${(yAt(x) + HT).toFixed(2)}`);
  const stripPts = top.concat(bot).join(' ');
  // značky na materiálu (pohybují se s pásem)
  const marks = [];
  for (let k = 0; k < 32; k++) {
    const x = ((k * 30 + shift) % 960 + 960) % 960;
    if (x < 14 || x > 946) continue;
    const y = yAt(x);
    marks.push(<line key={k} x1={x} y1={y - HT + 1} x2={x} y2={y + HT - 1} stroke="#5d7085" strokeWidth="1" />);
  }
  const ang = shift / R;
  const cyB = CYB + OPEN * (1 - pe);
  const cyT = (r) => CYT - OPEN * (1 - pe) + pe * r.d;
  const bk = bends(pe);
  const onPas = act === 'pas';
  const legend = (id, y, color, label) => {
    const on = act === id;
    return (
      <g key={id} onClick={() => toggle(id)} style={{ cursor: 'pointer' }}>
        <rect x={746} y={y - 15} width={150} height={22} rx="4" fill={on ? 'rgba(237,169,98,0.12)' : 'transparent'} />
        <rect x={752} y={y - 9} width={12} height={12} rx="2" fill={color} />
        <text x={772} y={y + 1} fontFamily={SANS} fontSize="13" fontWeight={on ? 600 : 500} fill={on ? WARN : '#c4d2de'}>{label}</text>
      </g>
    );
  };
  const label = (id, x, y, w, to) => {
    const on = act === id;
    return (
      <g key={'l-' + id}>
        <g style={DECO}>
          <line x1={to[2]} y1={to[3]} x2={to[0]} y2={to[1]} stroke={on ? WARN : '#5d7085'} strokeWidth="1" />
          <circle cx={to[0]} cy={to[1]} r="2" fill={on ? WARN : '#8296a8'} />
        </g>
        <g onClick={() => toggle(id)} style={{ cursor: 'pointer' }}>
          <rect x={x - 5} y={y - 15} width={w} height="21" rx="4" fill={on ? 'rgba(237,169,98,0.12)' : 'transparent'} />
          <text x={x} y={y} fontFamily={SANS} fontSize="13" fontWeight={on ? 600 : 500} fill={on ? WARN : '#c4d2de'}>{PARTS[id].name}</text>
        </g>
      </g>
    );
  };
  const ap = act ? PARTS[act] : null;
  const btn = (on) => ({
    height: 34, padding: '0 14px', borderRadius: 10, fontFamily: HEAD, fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
    background: on ? 'rgba(123,163,204,0.22)' : 'rgba(120,150,180,0.06)', color: on ? '#eaf2fa' : '#c4d2de',
    border: on ? '1px solid rgba(123,163,204,0.55)' : '1px solid rgba(150,180,210,0.2)',
  });
  const exitY = pts[pts.length - 1].y;
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: 14, boxSizing: 'border-box', fontFamily: SANS }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 'none' }}>
        <button type="button" style={btn(false)} onClick={() => setRun((r) => !r)}>{run ? 'Pozastavit' : 'Přehrát'}</button>
        <div style={{ width: 1, height: 24, background: 'rgba(150,180,210,0.2)', margin: '0 4px' }}></div>
        <button type="button" style={btn(closed)} onClick={() => setClosed(true)}>Válce v{' '}záběru</button>
        <button type="button" style={btn(!closed)} onClick={() => setClosed(false)}>Válce rozevřené</button>
      </div>
      <svg viewBox="0 44 960 352" style={{ flex: 1, minHeight: 0, width: '100%', marginTop: 8 }}>
        {/* vstupní šipka */}
        <g style={DECO}>
          <line x1="40" y1="120" x2="120" y2="120" stroke="#8296a8" strokeWidth="2.5" />
          <polygon points="132,120 118,113 118,127" fill="#8296a8" />
        </g>
        {/* spodní válce */}
        <g onClick={() => toggle('spodni')} style={{ cursor: 'pointer' }}>
          {ROLLS.filter((r) => r.k === 'B').map((r) => <Roll key={r.x} x={r.x} cy={cyB} ang={ang} on={act === 'spodni'} k="B" />)}
        </g>
        {/* horní válce */}
        <g onClick={() => toggle('horni')} style={{ cursor: 'pointer' }}>
          {ROLLS.filter((r) => r.k === 'T').map((r) => <Roll key={r.x} x={r.x} cy={cyT(r)} ang={-ang} on={act === 'horni'} k="T" />)}
        </g>
        {/* pás */}
        <g onClick={() => toggle('pas')} style={{ cursor: 'pointer' }}>
          <polygon points={stripPts} fill={onPas ? WARN : '#c4d2de'} stroke={onPas ? WARN : '#eaf2fa'} strokeWidth="1" />
        </g>
        <g style={DECO}>{marks}</g>
        {/* rovná referenční čára na výstupu */}
        <line x1={X_OUT + 60} y1={exitY} x2="950" y2={exitY} stroke="#57b98a" strokeWidth="1" strokeDasharray="6 5" opacity={0.35 + 0.5 * pe} style={DECO} />
        {label('horni', 742, 58, 104, [650 + 33, cyT(ROLLS[5]) - 33, 742 - 6, 54])}
        {label('spodni', 742, 286, 112, [560 + 33, cyB + 33, 742 - 6, 282])}
        {label('pas', 802, 150, 104, [850, yAt(850) - HT, 850, 156])}
        {/* ohyb u jednotlivých válců */}
        <line x1={150} y1={BASE} x2={700} y2={BASE} stroke="#3c4c5e" strokeWidth="1" style={DECO} />
        <line x1={150} y1={BASE - KAPPA_Y * BAR_K} x2={700} y2={BASE - KAPPA_Y * BAR_K} stroke="#5d7085" strokeWidth="1" strokeDasharray="4 4" style={DECO} />
        <line x1={150} y1={BASE + KAPPA_Y * BAR_K} x2={700} y2={BASE + KAPPA_Y * BAR_K} stroke="#5d7085" strokeWidth="1" strokeDasharray="4 4" style={DECO} />
        {ROLLS.map((r, i) => {
          const k = bk[i];
          const plast = Math.abs(k) > KAPPA_Y;
          const id = plast ? 'plast' : 'pruz';
          const on = act === id;
          const h = Math.abs(k) * BAR_K;
          const y = k < 0 ? BASE - h : BASE;
          return (
            <g key={'b' + i} onClick={() => toggle(id)} style={{ cursor: 'pointer' }}>
              <rect x={r.x - 12} y={y} width="24" height={Math.max(0.5, h)} rx="2" fill={plast ? WARN : ELAS} opacity={act && !on ? 0.35 : 1} stroke={on ? '#eaf2fa' : 'none'} strokeWidth="1" />
            </g>
          );
        })}
        {legend('plast', 336, WARN, 'Plastický ohyb')}
        {legend('pruz', 364, ELAS, 'Pružný ohyb')}
      </svg>
      <div style={{ flex: 'none', height: 64, marginTop: 6, padding: '10px 14px', boxSizing: 'border-box', background: 'rgba(120,150,180,0.06)', border: '1px solid rgba(150,180,210,0.16)', borderRadius: 10 }}>
        {ap ? (
          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: '#d3dfea' }}>
            <span style={{ fontFamily: HEAD, fontWeight: 700, color: WARN }}>{ap.name}: </span>{nb(ap.desc)}
          </div>
        ) : (
          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: '#8296a8' }}>{nb('Klikni na část schématu nebo na její popisek. Sloupce pod válci ukazují velikost a směr ohybu pásu u každého válce.')}</div>
        )}
      </div>
    </div>
  );
}
window.RovnaniValcove = RovnaniValcove;
})();
