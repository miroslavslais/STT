// tazeni-komplet.jsx — součinitel tažení, sled tahů a zpevnění v jedné kalkulačce.
const { useState, useEffect } = React;
const SANS = "'IBM Plex Sans', system-ui, sans-serif";
const HEAD = "'Quicksand', system-ui, sans-serif";
const MONO = "'IBM Plex Mono', monospace";
const ACC = '#7ba3cc', GREEN = '#57b98a', RED = '#e0655a', WARM = '#eda962';

const MAT = {
  ocel: {
    name: 'Hlubokotažná ocel DC04',
    tab: [
      { r: 0.15, m1: 0.60, m2: 0.80 }, { r: 0.30, m1: 0.58, m2: 0.79 },
      { r: 0.60, m1: 0.55, m2: 0.78 }, { r: 1.00, m1: 0.53, m2: 0.76 },
      { r: 1.50, m1: 0.50, m2: 0.75 }, { r: 2.00, m1: 0.48, m2: 0.73 },
      { r: 2.50, m1: 0.47, m2: 0.72 },
    ],
    Re0: 280, C: 450, mez: 520, reMax: 700,
    note: 'Nízká mez kluzu, vysoká tažnost a malá anizotropie — nejlepší tažitelnost běžných plechů.',
  },
  al: {
    name: 'Slitina hliníku EN AW-5754',
    tab: [
      { r: 0.15, m1: 0.65, m2: 0.83 }, { r: 0.30, m1: 0.63, m2: 0.82 },
      { r: 0.60, m1: 0.60, m2: 0.81 }, { r: 1.00, m1: 0.58, m2: 0.79 },
      { r: 1.50, m1: 0.56, m2: 0.78 }, { r: 2.00, m1: 0.54, m2: 0.77 },
      { r: 2.50, m1: 0.53, m2: 0.76 },
    ],
    Re0: 110, C: 260, mez: 240, reMax: 320,
    note: 'Menší tažnost než ocel, takže mezní součinitel je vyšší a stejný výtažek potřebuje víc tahů. Zpevňuje ale pomaleji.',
  },
};

function lim(mat, rel, key) {
  const T = MAT[mat].tab;
  if (rel <= T[0].r) return T[0][key];
  if (rel >= T[T.length - 1].r) return T[T.length - 1][key];
  for (let i = 1; i < T.length; i++) {
    if (rel <= T[i].r) {
      const a = T[i - 1], b = T[i], f = (rel - a.r) / (b.r - a.r);
      return a[key] + f * (b[key] - a[key]);
    }
  }
  return T[T.length - 1][key];
}

const num = (v, d) => v.toFixed(d).replace('.', ',');
const vyska = (D, d) => (D * D - d * d) / (4 * d);

function plan(mat, D, d, s) {
  const rel = (s / D) * 100;
  const m1l = lim(mat, rel, 'm1'), m2l = lim(mat, rel, 'm2');
  const prum = [D];
  if (d >= D) return { rel, m1l, m2l, prum };
  let cur = D * m1l;
  if (cur <= d) prum.push(d);
  else {
    prum.push(cur);
    for (let i = 0; i < 6 && cur > d; i++) {
      const nxt = cur * m2l;
      if (nxt <= d) { prum.push(d); break; }
      prum.push(nxt); cur = nxt;
    }
  }
  return { rel, m1l, m2l, prum };
}

function Field({ label, unit, value, set, step, min, max }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: SANS, fontSize: 14.5, color: '#c4d2de' }}>
      <span style={{ width: 148 }}>{label}</span>
      <input type="number" value={value} step={step} min={min} max={max}
        onChange={e => set(Math.max(min, Math.min(max, parseFloat(e.target.value) || min)))}
        style={{
          width: 90, padding: '8px 10px', borderRadius: 10, background: 'rgba(120,150,180,0.08)',
          border: '1px solid rgba(150,180,210,0.22)', color: '#eaf2fa', fontFamily: MONO, fontSize: 15
        }} />
      <span style={{ fontFamily: MONO, fontSize: 13.5, color: '#8296a8' }}>{unit}</span>
    </label>
  );
}

function Graph({ mat, rel, m1 }) {
  const X = v => 62 + (Math.min(v, 2.5) / 2.5) * 368;
  const Y = m => 250 - ((Math.min(0.9, Math.max(0.4, m)) - 0.4) / 0.5) * 220;
  const T = MAT[mat].tab;
  const path = key => T.map((p, i) => (i ? 'L' : 'M') + X(p.r) + ' ' + Y(p[key])).join(' ');
  const ok = m1 >= lim(mat, rel, 'm1');
  return (
    <svg viewBox="0 0 460 300" width="100%" style={{ display: 'block', maxWidth: 470 }}>
      <path d={path('m1') + ' L' + X(2.5) + ' 30 L' + X(0.15) + ' 30 Z'} fill="rgba(87,185,138,0.10)" />
      {[0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map(m => (
        <g key={m}>
          <line x1={62} y1={Y(m)} x2={430} y2={Y(m)} stroke="rgba(150,180,210,0.13)" strokeWidth={1} />
          <text x={54} y={Y(m) + 5} textAnchor="end" fontFamily={MONO} fontSize={12} fill="#8296a8">{num(m, 2)}</text>
        </g>
      ))}
      {[0.5, 1, 1.5, 2, 2.5].map(r => (
        <text key={r} x={X(r)} y={272} textAnchor="middle" fontFamily={MONO} fontSize={12} fill="#8296a8">{num(r, 1)}</text>
      ))}
      <line x1={62} y1={30} x2={62} y2={250} stroke="rgba(150,180,210,0.35)" strokeWidth={1.2} />
      <line x1={62} y1={250} x2={430} y2={250} stroke="rgba(150,180,210,0.35)" strokeWidth={1.2} />
      <text x={62} y={20} fontFamily={SANS} fontSize={12.5} fill="#8296a8">mezní m</text>
      <text x={430} y={292} textAnchor="end" fontFamily={SANS} fontSize={12.5} fill="#8296a8">relativní tloušťka s/D · 100</text>
      <path d={path('m2')} fill="none" stroke={WARM} strokeWidth={2.2} />
      <path d={path('m1')} fill="none" stroke={ACC} strokeWidth={2.4} />
      <text x={X(2.5) - 4} y={Y(T[6].m2) - 10} textAnchor="end" fontFamily={SANS} fontSize={13} fill={WARM}>2. a další tahy</text>
      <text x={X(2.5) - 4} y={Y(T[6].m1) - 10} textAnchor="end" fontFamily={SANS} fontSize={13} fill={ACC}>1. tah</text>
      <circle cx={X(rel)} cy={Y(m1)} r={6} fill={ok ? GREEN : RED} stroke="#080b12" strokeWidth={2} />
      <text x={X(rel) + 12} y={Y(m1) + 5} fontFamily={MONO} fontSize={13} fill={ok ? GREEN : RED}>{'m = ' + num(m1, 2)}</text>
    </svg>
  );
}

function Cup({ w, h, active, dim, flat }) {
  const t = 5, H = 130, base = H - 4, pad = 12;
  const ww = Math.max(14, w), hh = Math.min(base - 8, h);
  if (flat) {
    return (
      <svg viewBox={'0 0 ' + (ww + 2 * pad) + ' ' + (H + 4)} width={ww + 2 * pad} height={H + 4} style={{ opacity: dim ? 0.3 : 1 }}>
        <rect x={pad} y={base - t} width={ww} height={t} rx={1} fill={active ? '#dfe9f2' : '#9aabbb'} />
      </svg>
    );
  }
  const L = pad, R = pad + ww, top = base - hh;
  return (
    <svg viewBox={'0 0 ' + (ww + 2 * pad) + ' ' + (H + 4)} width={ww + 2 * pad} height={H + 4} style={{ opacity: dim ? 0.3 : 1 }}>
      <path d={'M' + L + ' ' + top + ' L' + L + ' ' + (base - 6) + ' Q' + L + ' ' + base + ' ' + (L + 6) + ' ' + base +
        ' L' + (R - 6) + ' ' + base + ' Q' + R + ' ' + base + ' ' + R + ' ' + (base - 6) + ' L' + R + ' ' + top +
        ' L' + (R - t) + ' ' + top + ' L' + (R - t) + ' ' + (base - 6) + ' Q' + (R - t) + ' ' + (base - t) + ' ' + (R - 2 * t) + ' ' + (base - t) +
        ' L' + (L + 2 * t) + ' ' + (base - t) + ' Q' + (L + t) + ' ' + (base - t) + ' ' + (L + t) + ' ' + (base - 6) + ' L' + (L + t) + ' ' + top + ' Z'}
        fill={active ? '#dfe9f2' : '#9aabbb'} stroke={active ? '#8fa2b3' : '#6c7d8d'} strokeWidth={1.1} strokeLinejoin="round" />
    </svg>
  );
}

function Bars({ mat, entries, active }) {
  const M = MAT[mat];
  const n = entries.length;
  const W = 470, H = 215, base = 150, Y0 = Math.max(0, M.Re0 - 80);
  const top = Math.max(M.reMax, ...entries.map(e => e.v)) * 1.04;
  const SC = 110 / (top - Y0);
  const yv = v => base - (v - Y0) * SC;
  const rawStep = (top - Y0) / 4;
  const stepN = [10, 20, 25, 50, 100, 200, 250, 500, 1000].find(x => x >= rawStep) || 1000;
  const ticks = [];
  for (let v = Math.ceil(Y0 / stepN) * stepN; v <= top; v += stepN) ticks.push(v);
  const bw = Math.min(58, 340 / n), gap = Math.min(30, 400 / n - bw);
  const x0 = 66;
  return (
    <svg viewBox={'0 0 ' + W + ' ' + H} width="100%" style={{ display: 'block', maxWidth: 470 }} preserveAspectRatio="xMidYMid meet">
      {ticks.map(v => (
        <g key={v}>
          <line x1={46} y1={yv(v)} x2={W - 10} y2={yv(v)} stroke="rgba(150,180,210,0.12)" strokeWidth={1} />
          <text x={40} y={yv(v) + 4} textAnchor="end" fontFamily={MONO} fontSize={11.5} fill="#8296a8">{v}</text>
        </g>
      ))}
      <line x1={46} y1={base} x2={W - 10} y2={base} stroke="rgba(150,180,210,0.35)" strokeWidth={1.2} />
      <line x1={46} y1={yv(M.mez)} x2={W - 10} y2={yv(M.mez)} stroke={RED} strokeWidth={1.4} strokeDasharray="6 5" />
      <text x={W - 12} y={yv(M.mez) - 7} textAnchor="end" fontFamily={SANS} fontSize={12.5} fill={RED}>mez tvárnosti</text>
      {entries.map((e, i) => {
        const x = x0 + i * (bw + gap), hh = Math.max(2, (e.v - Y0) * SC), over = e.v > M.mez;
        const fill = over ? RED : e.a ? 'rgba(87,185,138,0.55)' : (i === active ? ACC : 'rgba(123,163,204,0.42)');
        return (
          <g key={i}>
            <rect x={x} y={base - hh} width={bw} height={hh} rx={5} fill={fill} />
            <text x={x + bw / 2} y={base - hh - 8} textAnchor="middle" fontFamily={MONO} fontSize={11.5} fill="#c4d2de">{Math.round(e.v)}</text>
            <text x={x + bw / 2} y={base + 14} textAnchor="end" transform={'rotate(-45 ' + (x + bw / 2) + ' ' + (base + 14) + ')'} fontFamily={SANS} fontSize={11} fill={e.a ? GREEN : '#8296a8'}>{e.l}</text>
          </g>
        );
      })}
      <text x={10} y={20} fontFamily={SANS} fontSize={12.5} fill="#8296a8">mez kluzu R<tspan baselineShift="sub" fontSize="9">e</tspan> [MPa]</text>
    </svg>
  );
}

function TazeniKomplet() {
  const [mat, setMat] = useState('ocel');
  const [D, setD] = useState(120);
  const [d, setD2] = useState(60);
  const [s, setS] = useState(1);
  const [zihani, setZihani] = useState(true);
  const [step, setStep] = useState(1);

  const { rel, m1l, m2l, prum } = plan(mat, D, d, s);
  const m1 = d / D;
  const ok = m1 >= m1l;
  const nTahu = prum.length - 1;
  useEffect(() => { setStep(Math.min(Math.max(1, step), nTahu)); }, [nTahu]);
  const cur = Math.min(step, nTahu);

  const M = MAT[mat];
  const entries = [{ l: 'výchozí', v: M.Re0, a: false }];
  const idxTahu = {};
  let prev = M.Re0;
  for (let i = 1; i < prum.length; i++) {
    const delta = M.C * (1 - prum[i] / prum[i - 1]);
    if (zihani && i > 1 && prev + delta > M.mez) {
      entries.push({ l: 'žíhání', v: M.Re0 + 10, a: true });
      prev = M.Re0 + 10;
    }
    prev = prev + delta;
    idxTahu[i] = entries.length;
    entries.push({ l: 'po ' + i + '. tahu', v: prev, a: false });
  }
  const active = idxTahu[cur] || 0;
  const pocetZihani = entries.filter(e => e.a).length;

  const scale = 132 / D;
  const btn = (on) => ({
    padding: '9px 16px', borderRadius: 12, cursor: on ? 'pointer' : 'default',
    background: on ? 'rgba(123,163,204,0.18)' : 'rgba(120,150,180,0.04)',
    border: '1px solid ' + (on ? 'rgba(123,163,204,0.45)' : 'rgba(150,180,210,0.12)'),
    color: on ? '#eaf2fa' : '#55636f', fontFamily: HEAD, fontWeight: 700, fontSize: 14.5
  });
  const tab = (k) => ({
    padding: '9px 16px', borderRadius: 999, cursor: 'pointer', fontFamily: SANS, fontSize: 14, fontWeight: 500,
    background: mat === k ? 'rgba(123,163,204,0.18)' : 'rgba(120,150,180,0.05)',
    border: '1px solid ' + (mat === k ? 'rgba(123,163,204,0.5)' : 'rgba(150,180,210,0.16)'),
    color: mat === k ? '#eaf2fa' : '#8fa3b6'
  });

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', padding: 22, boxSizing: 'border-box', fontFamily: SANS, color: '#eaf2fa' }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <button onClick={() => setMat('ocel')} style={tab('ocel')}>{MAT.ocel.name}</button>
        <button onClick={() => setMat('al')} style={tab('al')}>{MAT.al.name}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13, minWidth: 0 }}>
          <Field label="Průměr přístřihu D" unit="mm" value={D} set={v => { setD(v); if (d > v - 5) setD2(Math.max(10, v - 5)); }} step={5} min={20} max={600} />
          <Field label="Průměr výtažku d" unit="mm" value={d} set={v => setD2(Math.min(v, D - 5))} step={5} min={10} max={590} />
          <Field label="Tloušťka plechu s" unit="mm" value={s} set={setS} step={0.1} min={0.2} max={6} />
          <div style={{ height: 1, background: 'rgba(150,180,210,0.16)' }}></div>
          <div style={{ fontFamily: MONO, fontSize: 14.5, lineHeight: 1.85, color: '#c4d2de' }}>
            <div>{'m = d / D = ' + num(d, 0) + ' / ' + num(D, 0) + ' = '}<span style={{ color: '#eaf2fa' }}>{num(m1, 3)}</span></div>
            <div>{'s / D · 100 = ' + num(rel, 2)}</div>
            <div>{'mezní m₁ = ' + num(m1l, 2) + '   ·   mezní m₂ = ' + num(m2l, 2)}</div>
            <div>{'výška výtažku h ≈ ' + num(vyska(D, d), 0) + ' mm'}</div>
          </div>
          <div style={{
            background: 'rgba(120,150,180,0.06)', borderRadius: 14, padding: '13px 17px',
            border: '1px solid ' + (ok ? 'rgba(87,185,138,0.35)' : 'rgba(224,101,90,0.35)')
          }}>
            <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 15.5, color: ok ? GREEN : RED, marginBottom: 5 }}>
              {ok ? 'Stačí jeden tah' : 'Nutné vícenásobné tažení — ' + nTahu + (nTahu >= 5 ? ' tahů' : ' tahy')}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.55, color: '#c4d2de' }}>{M.note}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
          <Graph mat={mat} rel={rel} m1={m1} />
          <div style={{ fontSize: 12.5, color: '#8296a8', lineHeight: 1.6, marginTop: 4 }}>
            Bod nad modrou křivkou znamená, že první tah vyjde. Pod křivkou je nutné táhnout na víc operací, pro každou další platí mírnější mezní hodnota.
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: 'rgba(150,180,210,0.16)', margin: '22px 0 18px' }}></div>
      <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 17, marginBottom: 12 }}>Sled tahů</div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 20, flexWrap: 'wrap', minHeight: 140 }}>
        {prum.map((p, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            <Cup w={p * scale} h={(i === 0 ? 0 : vyska(D, p)) * scale} flat={i === 0} active={i === cur} dim={i > cur} />
            <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 13.5, color: i === cur ? '#eaf2fa' : '#6f8093' }}>{i === 0 ? 'Přístřih' : i + '. tah'}</div>
            <div style={{ fontFamily: MONO, fontSize: 12, color: i === cur ? ACC : '#5c6b7a' }}>{'⌀ ' + num(p, 0) + ' mm'}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '14px 0 12px', flexWrap: 'wrap' }}>
        <button onClick={() => setStep(Math.max(1, cur - 1))} style={btn(cur > 1)}>◀ Zpět</button>
        <button onClick={() => setStep(Math.min(nTahu, cur + 1))} style={btn(cur < nTahu)}>Další tah ▶</button>
        <div style={{ fontFamily: MONO, fontSize: 13.5, color: '#8296a8' }}>
          {'m' + cur + ' = ' + num(prum[cur] / prum[cur - 1], 2)}
        </div>
        <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#c4d2de', cursor: 'pointer' }}>
          <input type="checkbox" checked={zihani} onChange={e => setZihani(e.target.checked)} style={{ accentColor: GREEN, width: 16, height: 16 }} />
          Mezioperační žíhání, když je potřeba
        </label>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Bars mat={mat} entries={entries} active={active} />
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.6, color: zihani ? GREEN : WARM, marginTop: 6 }}>
        {zihani
          ? (pocetZihani === 0
            ? 'Zpevnění zůstává pod mezí tvárnosti, rekrystalizační žíhání mezi tahy tedy není potřeba.'
            : 'Rekrystalizační žíhání se zařadí jen tam, kde by zpevnění překročilo mez tvárnosti — zde ' + pocetZihani + '× — a vrátí mez kluzu na výchozí hodnotu.')
          : 'Bez žíhání zpevnění narůstá. Jakmile sloupec překročí mez tvárnosti, výtažek při dalším tahu praskne.'}
      </div>
    </div>
  );
}
window.TazeniKomplet = TazeniKomplet;
