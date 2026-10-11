// strizne-nastroje-animace.jsx — jednoduchý a postupový střižný nástroj (bokorys v řezu, půdorys pásu).
(function () {
const { useState, useEffect, useRef } = React;
const SANS = "'IBM Plex Sans', system-ui, sans-serif";
const HEAD = "'Quicksand', system-ui, sans-serif";
const MONO = "'IBM Plex Mono', ui-monospace, monospace";
const ACC = '#7ba3cc', HL = '#eda962';
const STEEL = '#c6d3de', STEEL_E = '#8fa2b3', TOOL = '#4a5563', PUNCH = '#5b6776', TOOL_E = '#6d7986', DIE = '#39434f', BG = '#080b12', LEAD = '#5d6b79';
const NB = '\u00a0';
const KC = { knife: ['#a98bd6', 'rgba(169,139,214,0.30)'], pierce: ['#4fb59c', 'rgba(79,181,156,0.26)'], blank: ['#d98aa8', 'rgba(217,138,168,0.26)'] };
const KPX = 132;          // krok k = 33 mm v měřítku 4 px/mm
const STROKE_MS = 3400;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
// fáze zdvihu: 0–0,3 sjezd · 0,3–0,45 propad · 0,45–0,7 výjezd · 0,74–0,96 posuv
const ramOf = fr => fr < 0.3 ? ease(fr / 0.3) : fr < 0.45 ? 1 : fr < 0.7 ? 1 - ease((fr - 0.45) / 0.25) : 0;
const feedOf = fr => ease(clamp((fr - 0.74) / 0.22, 0, 1));
const fallOf = fr => clamp((fr - 0.3) / 0.15, 0, 1);
const pinOf = fr => fr < 0.7 ? 0 : fr < 0.74 ? (fr - 0.7) / 0.04 : fr < 0.96 ? 1 : 1 - (fr - 0.96) / 0.04;

function split(T) { const i = Math.floor(T + 1e-9); return { i, fr: Math.max(0, T - i) }; }

function segs(L, R, holes, lo, hi) {
  const hs = holes.slice().sort((a, b) => a[0] - b[0]);
  const out = []; let x = L;
  for (const [a, b] of hs) {
    if (b <= x) continue;
    if (a > x) out.push([x, Math.min(a, R)]);
    x = Math.max(x, b);
    if (x >= R) break;
  }
  if (x < R) out.push([x, R]);
  return out.map(([a, b]) => [Math.max(a, lo), Math.min(b, hi)]).filter(([a, b]) => b - a > 0.5);
}

const look = (id, sel, fill) => ({ fill, stroke: sel === id ? HL : TOOL_E, strokeWidth: sel === id ? 2.6 : 1.3 });
const Hit = ({ id, onSel, children }) => <g onClick={() => onSel(id)} style={{ cursor: 'pointer' }}>{children}</g>;

function Label({ id, x, y, end, text, to, sel, onSel }) {
  const on = sel === id;
  const w = text.length * 6.9 + 10;
  const rx = end ? x - w + 5 : x - 5;
  const lx = end ? x + 6 : x - 6;
  return (
    <g>
      {to && <line x1={lx} y1={y - 4} x2={to[0]} y2={to[1]} stroke={on ? HL : LEAD} strokeWidth={1} pointerEvents="none" />}
      {to && <circle cx={to[0]} cy={to[1]} r={2.4} fill={on ? HL : '#8296a8'} pointerEvents="none" />}
      <g onClick={() => onSel(id)} style={{ cursor: 'pointer' }}>
        <rect x={rx} y={y - 15} width={w} height={21} rx={5} fill={on ? 'rgba(237,169,98,0.16)' : 'rgba(0,0,0,0)'} />
        <text x={x} y={y} textAnchor={end ? 'end' : 'start'} fontFamily={SANS} fontSize={13} fill={on ? HL : '#c4d2de'}>{text}</text>
      </g>
    </g>
  );
}

function SingleView({ T, sel, onSel }) {
  const { i, fr } = split(T);
  const d = 46 * ramOf(fr), p = i + feedOf(fr), fall = fallOf(fr), pin = pinOf(fr);
  const cut = fr >= 0.3 || d >= 26;
  const nCut = i + (cut ? 1 : 0);
  const lift = fr > 0.45 && fr < 0.6 ? 4 * Math.sin(Math.PI * (fr - 0.45) / 0.15) : 0;
  const F = 502 + KPX * p;
  const holes = [];
  for (let j = 1; j <= nCut; j++) { const c = 430 + KPX * (p - j + 1); holes.push([c - 60, c + 60]); }
  const strip = segs(170, F, holes, 170, 880);
  const sy = 226 - lift;
  const slug = cut && fr < 0.45;
  const slugY = 200 + d + fall * 170;
  const sOn = sel === 'strip';
  const L = (id, x, y, end, text, to) => <Label id={id} x={x} y={y} end={end} text={text} to={to} sel={sel} onSel={onSel} />;
  return (
    <svg viewBox="0 0 900 420" width="100%" style={{ display: 'block' }}>
      <Hit id="stop" onSel={onSel}><rect x={502} y={226 + 12 * pin} width={10} height={12} {...look('stop', sel, '#9aa7b4')} /></Hit>
      <Hit id="strip" onSel={onSel}>
        {strip.map(([a, b], k) => <rect key={k} x={a} y={sy} width={b - a} height={12} fill={STEEL} stroke={sOn ? HL : STEEL_E} strokeWidth={sOn ? 2.4 : 1.2} />)}
      </Hit>
      {slug && <rect x={370} y={slugY} width={120} height={12} fill={STEEL} stroke={STEEL_E} strokeWidth={1.2} opacity={1 - fall} pointerEvents="none" />}
      <Hit id="die" onSel={onSel}>
        <rect x={200} y={238} width={170} height={62} {...look('die', sel, DIE)} />
        <rect x={490} y={238} width={170} height={62} {...look('die', sel, DIE)} />
      </Hit>
      <Hit id="base" onSel={onSel}>
        <rect x={160} y={300} width={210} height={40} {...look('base', sel, TOOL)} />
        <rect x={490} y={300} width={210} height={40} {...look('base', sel, TOOL)} />
      </Hit>
      <Hit id="stripper" onSel={onSel}>
        <rect x={200} y={190} width={170} height={32} {...look('stripper', sel, TOOL)} />
        <rect x={490} y={190} width={170} height={32} {...look('stripper', sel, TOOL)} />
      </Hit>
      <Hit id="punch" onSel={onSel}><rect x={370} y={100 + d} width={120} height={100} {...look('punch', sel, PUNCH)} /></Hit>
      <Hit id="plate" onSel={onSel}><rect x={250} y={60 + d} width={360} height={40} {...look('plate', sel, TOOL)} /></Hit>
      <Hit id="shank" onSel={onSel}><rect x={410} y={20 + d} width={40} height={40} {...look('shank', sel, PUNCH)} /></Hit>
      {L('shank', 150, 40, true, 'stopka', [410, 40 + d])}
      {L('plate', 150, 80, true, 'horní deska', [250, 80 + d])}
      {L('punch', 150, 150, true, 'střižník', [370, 150 + d])}
      {L('stripper', 150, 206, true, 'vodicí deska (stírač)', [200, 206])}
      {L('strip', 150, 232, true, 'pás plechu', [172, 232 - lift])}
      {L('die', 150, 270, true, 'střižnice', [200, 270])}
      {L('base', 150, 320, true, 'spodní deska', [160, 320])}
      {L('stop', 712, 176, false, 'doraz', [510, 227 + 12 * pin])}
    </svg>
  );
}

function progGeom(T) {
  const { i, fr } = split(T);
  const d = 38 * ramOf(fr), p = i + feedOf(fr), fall = fallOf(fr);
  const cut = fr >= 0.3 || d >= 20;
  const nCut = i + (cut ? 1 : 0);
  const F = 446 + KPX * p;
  const pierce = [], blank = [];
  for (let j = 1; j <= nCut; j++) {
    const s = KPX * (p - j + 1);
    pierce.push(380 + s);
    if (j >= 2) blank.push(512 + s);
  }
  const slug = cut && fr < 0.45;
  const washer = slug && i + 1 >= 2;
  return { i, fr, d, p, fall, nCut, F, pierce, blank, slug, washer };
}

function ProgSide({ T, sel, onSel }) {
  const g = progGeom(T), d = g.d;
  const holes = g.pierce.map(c => [c - 24, c + 24]).concat(g.blank.map(c => [c - 60, c + 60]));
  const strip = segs(150, g.F, holes, 150, 860);
  const slugY = 136 + d + g.fall * 150;
  const sOn = sel === 'strip', kOn = sel === 'knife';
  const L = (id, x, y, end, text, to) => <Label id={id} x={x} y={y} end={end} text={text} to={to} sel={sel} onSel={onSel} />;
  const pilot = `M488 ${136 + d} L536 ${136 + d} L536 ${144 + d} Q536 ${150 + d} 530 ${150 + d} L494 ${150 + d} Q488 ${150 + d} 488 ${144 + d} Z`;
  const three = (id, y, h, fill) => (
    <Hit id={id} onSel={onSel}>
      <rect x={150} y={y} width={206} height={h} {...look(id, sel, fill)} />
      <rect x={404} y={y} width={48} height={h} {...look(id, sel, fill)} />
      <rect x={572} y={y} width={128} height={h} {...look(id, sel, fill)} />
    </Hit>
  );
  return (
    <svg viewBox="0 0 900 300" width="100%" style={{ display: 'block' }}>
      <Hit id="knife" onSel={onSel}>
        <rect x={314} y={70 + d} width={132} height={66} fill={KC.knife[1]} stroke={kOn ? HL : KC.knife[0]} strokeWidth={kOn ? 2.4 : 1.2} strokeDasharray="5 4" />
      </Hit>
      <Hit id="strip" onSel={onSel}>
        {strip.map(([a, b], k) => <rect key={k} x={a} y={156} width={b - a} height={12} fill={STEEL} stroke={sOn ? HL : STEEL_E} strokeWidth={sOn ? 2.4 : 1.2} />)}
      </Hit>
      {g.slug && (
        <g opacity={1 - g.fall} pointerEvents="none">
          <rect x={356} y={slugY} width={48} height={12} fill={STEEL} stroke={STEEL_E} strokeWidth={1.2} />
          {g.washer && <rect x={452} y={slugY} width={36} height={12} fill={STEEL} stroke={STEEL_E} strokeWidth={1.2} />}
          {g.washer && <rect x={536} y={slugY} width={36} height={12} fill={STEEL} stroke={STEEL_E} strokeWidth={1.2} />}
        </g>
      )}
      {three('die', 168, 42, DIE)}
      {three('base', 210, 30, TOOL)}
      {three('stripper', 120, 32, TOOL)}
      <Hit id="pierce" onSel={onSel}><rect x={356} y={70 + d} width={48} height={66} {...look('pierce', sel, KC.pierce[0])} /></Hit>
      <Hit id="blank" onSel={onSel}><rect x={452} y={70 + d} width={120} height={66} {...look('blank', sel, KC.blank[0])} /></Hit>
      <Hit id="pilot" onSel={onSel}><path d={pilot} {...look('pilot', sel, '#7d8a98')} /></Hit>
      <Hit id="plate" onSel={onSel}><rect x={150} y={40 + d} width={550} height={30} {...look('plate', sel, TOOL)} /></Hit>
      <Hit id="shank" onSel={onSel}><rect x={426} y={6 + d} width={40} height={34} {...look('shank', sel, PUNCH)} /></Hit>
      {L('shank', 128, 23, true, 'stopka', [426, 23 + d])}
      {L('plate', 128, 55, true, 'horní deska', [150, 55 + d])}
      {L('knife', 128, 82, true, 'boční nůž', [314, 82 + d])}
      {L('pierce', 128, 106, true, 'děrovací střižník (1)', [356, 106 + d])}
      {L('stripper', 128, 136, true, 'vodicí deska (stírač)', [150, 136])}
      {L('strip', 128, 162, true, 'pás plechu', [152, 162])}
      {L('die', 128, 189, true, 'střižnice', [150, 189])}
      {L('base', 128, 225, true, 'spodní deska', [150, 225])}
      {L('blank', 716, 95, false, 'vystřihovací střižník (2)', [572, 95 + d])}
      {L('pilot', 716, 143, false, 'hledáček', [536, 143 + d])}
    </svg>
  );
}

function ProgPlan({ T, sel, onSel }) {
  const g = progGeom(T);
  const shoulder = g.nCut >= 1 ? 314 + KPX * (g.p - g.nCut + 1) : g.F;
  const outline = shoulder < g.F
    ? `M150 30 H${shoulder} V40 H${g.F} V196 H150 Z`
    : `M150 30 H${g.F} V196 H150 Z`;
  const sOn = sel === 'strip';
  const fp = id => sel === id
    ? { fill: KC[id] ? KC[id][1] : 'rgba(237,169,98,0.22)', stroke: HL, strokeWidth: 2.4 }
    : KC[id] ? { fill: KC[id][1], stroke: KC[id][0], strokeWidth: 1.6 } : { fill: 'rgba(91,103,118,0.18)', stroke: '#8296a8', strokeWidth: 1.2 };
  const ring = (cx, cy) => `M${cx - 60} ${cy} a60 60 0 1 0 120 0 a60 60 0 1 0 -120 0 Z M${cx - 24} ${cy} a24 24 0 1 0 48 0 a24 24 0 1 0 -48 0 Z`;
  const L = (id, x, y, end, text, to) => <Label id={id} x={x} y={y} end={end} text={text} to={to} sel={sel} onSel={onSel} />;
  return (
    <svg viewBox="0 0 900 244" width="100%" style={{ display: 'block' }}>
      <defs><clipPath id="snPlanClip"><rect x={150} y={0} width={710} height={244} /></clipPath></defs>
      <g clipPath="url(#snPlanClip)" pointerEvents="none">
        <path d={outline} fill={STEEL} stroke={sOn ? HL : STEEL_E} strokeWidth={sOn ? 2.4 : 1.2} />
        {g.blank.map((c, k) => <circle key={'b' + k} cx={c} cy={118} r={60} fill={BG} stroke={STEEL_E} strokeWidth={1.2} />)}
        {g.pierce.map((c, k) => <circle key={'p' + k} cx={c} cy={118} r={24} fill={BG} stroke={STEEL_E} strokeWidth={1.2} />)}
        {g.slug && <circle cx={380} cy={118} r={24} fill={STEEL} opacity={1 - g.fall} />}
        {g.washer && <path d={ring(512, 118)} fillRule="evenodd" fill={STEEL} opacity={1 - g.fall} />}
      </g>
      <g pointerEvents="none" strokeDasharray="5 4">
        <rect x={314} y={22} width={132} height={18} {...fp('knife')} />
        <circle cx={380} cy={118} r={24} {...fp('pierce')} />
        <path d={ring(512, 118)} fillRule="evenodd" {...fp('blank')} />
        <circle cx={512} cy={118} r={24} {...fp('pilot')} />
      </g>
      <rect x={446} y={22} width={12} height={18} fill={KC.knife[0]} stroke={sel === 'knife' ? HL : KC.knife[0]} strokeWidth={sel === 'knife' ? 2.4 : 1.2} pointerEvents="none" />
      <g stroke={ACC} strokeWidth={1.1} pointerEvents="none">
        <line x1={380} y1={200} x2={380} y2={222} strokeDasharray="3 3" />
        <line x1={512} y1={200} x2={512} y2={222} strokeDasharray="3 3" />
        <line x1={380} y1={216} x2={512} y2={216} />
        <line x1={376} y1={220} x2={384} y2={212} />
        <line x1={508} y1={220} x2={516} y2={212} />
      </g>
      <text x={446} y={236} textAnchor="middle" fontFamily={MONO} fontSize={12.5} fill="#d3dfea" pointerEvents="none">{'k = 33' + NB + 'mm'}</text>
      {L('knife', 300, 26, true, 'boční nůž', null)}
      {L('pierce', 372, 236, true, 'stanice 1', null)}
      {L('blank', 520, 236, false, 'stanice 2', null)}
    </svg>
  );
}

function statusText(mode, T, running) {
  const { i, fr } = split(T);
  const first = i === 0;
  if (T === 0) return mode === 's' ? 'Pás je založený, čelo pásu je u' + NB + 'dorazu.' : 'Pás je založený, čelo pásu je u' + NB + 'dorazu bočního nože.';
  if (!running && fr === 0) return mode === 's' ? 'Zdvih dokončen, pás je posunutý k' + NB + 'dorazu.' : 'Zdvih dokončen, pás je posunutý o' + NB + 'krok k = 33' + NB + 'mm.';
  if (mode === 's') {
    if (fr < 0.3) return 'Střižník sjíždí a' + NB + 'prostřihne pás.';
    if (fr < 0.45) return 'Kruhový výstřižek ⌀' + NB + '30' + NB + 'mm propadá otvorem střižnice.';
    if (fr < 0.7) return 'Střižník vyjíždí, stírač strhne pás ze' + NB + 'střižníku.';
    return 'Pás se posouvá k' + NB + 'dorazu o' + NB + 'jeden krok.';
  }
  const d = 38 * ramOf(fr);
  if (fr < 0.3 && d < 20) return first ? 'Střižníky sjíždějí. Pod hledáčkem ještě není díra.' : 'Hledáček vniká do díry ⌀' + NB + '12' + NB + 'mm a' + NB + 'srovná pás.';
  if (fr < 0.3) return first
    ? 'Stanice 1 děruje díru ⌀' + NB + '12' + NB + 'mm, boční nůž odstřihne okraj pásu. Pod stanicí 2 ještě není materiál.'
    : 'Stanice 1 děruje díru, stanice 2 vystřihuje obrys ⌀' + NB + '30' + NB + 'mm, boční nůž odstřihuje okraj pásu.';
  if (fr < 0.45) return first ? 'Odpad z' + NB + 'díry propadá stanicí 1. Hotová podložka zatím nevznikla.' : 'Odpad z' + NB + 'díry propadá stanicí 1, hotová podložka stanicí 2.';
  if (fr < 0.7) return 'Střižníky vyjíždějí, stírač strhne pás ze' + NB + 'střižníků.';
  return 'Pás se posouvá o' + NB + 'krok k = 33' + NB + 'mm, dokud osazení po bočním noži nedosedne na doraz.';
}

const btn = primary => ({
  height: 36, padding: '0 16px', borderRadius: 10, cursor: 'pointer', fontFamily: HEAD, fontWeight: 700, fontSize: 14,
  background: primary ? ACC : 'rgba(120,150,180,0.06)', color: primary ? '#0b1017' : '#c4d2de',
  border: primary ? '1px solid rgba(123,163,204,0.5)' : '1px solid rgba(150,180,210,0.2)',
});
const caption = { fontFamily: HEAD, fontWeight: 700, fontSize: 12, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#7ba3cc', marginBottom: 2 };

function StrizneNastrojeAnimace() {
  const [mode, setMode] = useState('s');
  const [T, setT] = useState(0);
  const [run, setRun] = useState(null);
  const [sel, setSel] = useState(null);
  const tRef = useRef(0);

  useEffect(() => {
    if (run === null) return;
    let last = null, id;
    const tick = now => {
      if (last === null) last = now;
      const nt = tRef.current + (now - last) / STROKE_MS; last = now;
      if (run !== 'play' && nt >= run) { tRef.current = run; setT(run); setRun(null); return; }
      tRef.current = nt; setT(nt); id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [run]);

  const reset = () => { setRun(null); tRef.current = 0; setT(0); };
  const switchMode = m => { reset(); setMode(m); setSel(null); };
  const onSel = id => setSel(s => s === id ? null : id);
  const { i, fr } = split(T);
  const strokes = i + (fr >= 0.3 ? 1 : 0);
  const done = i + (fr >= 0.45 ? 1 : 0);
  const pieces = mode === 's' ? done : Math.max(0, done - 1);
  const segBtn = (m, label) => (
    <button type="button" onClick={() => switchMode(m)} style={{
      height: 32, padding: '0 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: HEAD, fontWeight: 700, fontSize: 14,
      background: mode === m ? 'rgba(123,163,204,0.22)' : 'transparent', color: mode === m ? '#eaf2fa' : '#8296a8',
    }}>{label}</button>
  );

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', gap: 10, padding: 20, boxSizing: 'border-box', fontFamily: SANS, color: '#eaf2fa', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', gap: 2, padding: 2, borderRadius: 10, border: '1px solid rgba(150,180,210,0.2)', background: 'rgba(120,150,180,0.05)' }}>
          {segBtn('s', 'Jednoduchý')}
          {segBtn('p', 'Postupový')}
        </div>
        <div style={{ width: 1, height: 26, background: 'rgba(150,180,210,0.2)', margin: '0 4px' }}></div>
        <button type="button" style={btn(true)} onClick={() => setRun(r => r === 'play' ? null : 'play')}>{run === 'play' ? 'Pauza' : 'Přehrát'}</button>
        <button type="button" style={btn(false)} onClick={() => setRun(Math.floor(tRef.current + 1e-9) + 1)}>Krok</button>
        <button type="button" style={btn(false)} onClick={reset}>Reset</button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 18, fontSize: 14, color: '#aebfcf' }}>
          <span>zdvihy <span style={{ fontFamily: MONO, color: '#eaf2fa', fontSize: 15 }}>{strokes}</span></span>
          <span>hotové kusy <span style={{ fontFamily: MONO, color: '#57b98a', fontSize: 15 }}>{pieces}</span></span>
        </div>
      </div>
      {mode === 's' ? (
        <div>
          <div style={caption}>Bokorys v řezu</div>
          <SingleView T={T} sel={sel} onSel={onSel} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div>
            <div style={caption}>Bokorys v řezu</div>
            <ProgSide T={T} sel={sel} onSel={onSel} />
          </div>
          <div>
            <div style={caption}>Půdorys pásu</div>
            <ProgPlan T={T} sel={sel} onSel={onSel} />
          </div>
        </div>
      )}
      <div style={{ marginTop: 'auto', background: 'rgba(120,150,180,0.06)', border: '1px solid rgba(150,180,210,0.16)', borderRadius: 12, padding: '12px 16px', fontSize: 15, lineHeight: 1.5, color: '#d3dfea', minHeight: 48, boxSizing: 'border-box' }}>
        {statusText(mode, T, run !== null)}
      </div>
    </div>
  );
}
window.StrizneNastrojeAnimace = StrizneNastrojeAnimace;
})();
