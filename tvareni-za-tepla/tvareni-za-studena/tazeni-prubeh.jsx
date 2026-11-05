// tazeni-prubeh.jsx — osový řez hlubokým tažením: zdvih tažníku + vrstvy výkladu.
const { useState, useEffect, useRef } = React;
const SANS = "'IBM Plex Sans', system-ui, sans-serif";
const HEAD = "'Quicksand', system-ui, sans-serif";
const ACC = '#7ba3cc', WARM = '#eda962', RED = '#e0655a', GREEN = '#57b98a';

const CX = 420, TOP = 150, T = 14, PRM = 77, DIE = 86, MAXD = 210, R0 = 226;
// nástroj: PUN = poloviční šířka tažníku, RM = zaoblení tažnice, RP = zaoblení tažníku
const PUN = 70, RM = 40, RP = 28;
const XD = DIE + RM, YD = TOP + T + RM;   // střed zaoblení tažnice (vzdálenost od osy, y)

function flangeR(depth) {
  const h = depth * MAXD;
  return Math.max(XD, Math.sqrt(Math.max(0, R0 * R0 - 2 * PRM * h)));
}

// Střednice plechu: příruba → oblouk po zaoblení tažnice → volná stěna (společná tečna) → oblouk po zaoblení tažníku → dno.
function geometry(depth) {
  const ym = TOP + T / 2 + depth * MAXD;
  const yf = ym - T / 2;                       // čelo tažníku
  const xp = PUN - RP, yp = yf - RP;           // střed zaoblení tažníku
  const a = RM + T / 2, b = RP + T / 2;
  const Dx = xp - XD, Dy = yp - YD;
  const R = Math.hypot(Dx, Dy);
  let al = Math.atan2(Dx, Dy) + Math.acos(Math.max(-1, Math.min(1, -(a + b) / R)));
  al = Math.max(0, Math.min(Math.PI / 2, al));
  const sa = Math.sin(al), ca = Math.cos(al);
  return {
    ym, yf, xp, yp, a, b,
    td: [XD - a * sa, YD - a * ca],            // konec styku s tažnicí
    tp: [xp + b * sa, yp + b * ca]             // začátek styku s tažníkem
  };
}

function segments(depth) {
  const g = geometry(depth);
  const Rf = flangeR(depth);
  const yTop = TOP + T / 2;
  const out = { bottom: [], wall: [], flange: [] };
  [-1, 1].forEach(s => {
    const X = (x) => CX + s * x;
    out.flange.push(
      'M' + X(g.td[0]) + ' ' + g.td[1] +
      ' A' + g.a + ' ' + g.a + ' 0 0 ' + (s > 0 ? 1 : 0) + ' ' + X(XD) + ' ' + yTop +
      ' L' + X(Math.max(XD, Rf)) + ' ' + yTop);
    out.wall.push('M' + X(g.td[0]) + ' ' + g.td[1] + ' L' + X(g.tp[0]) + ' ' + g.tp[1]);
    out.bottom.push(
      'M' + CX + ' ' + g.ym +
      ' L' + X(g.xp) + ' ' + g.ym +
      ' A' + g.b + ' ' + g.b + ' 0 0 ' + (s > 0 ? 0 : 1) + ' ' + X(g.tp[0]) + ' ' + g.tp[1]);
  });
  return out;
}

function Arrow({ x1, y1, x2, y2, color, w }) {
  const a = Math.atan2(y2 - y1, x2 - x1), L = 9 + w * 2;
  const p = (ang) => (x2 - L * Math.cos(a + ang)) + ' ' + (y2 - L * Math.sin(a + ang));
  return (
    <g stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <path d={'M' + p(0.45) + ' L' + x2 + ' ' + y2 + ' L' + p(-0.45)} />
    </g>
  );
}

function Diagram({ depth, strain, thick, flow }) {
  const seg = segments(depth);
  const ym = TOP + T / 2 + depth * MAXD, yf = ym - T / 2;
  const Rf = flangeR(depth);
  const wBottom = T, wWall = T * (1 - 0.24 * depth), wFlange = T * (1 + 0.15 * depth);
  const cB = strain ? GREEN : '#c6d3de';
  const cW = strain ? WARM : '#c6d3de';
  const cF = strain ? RED : '#c6d3de';
  return (
    <svg viewBox="0 0 840 520" width="100%" style={{ display: 'block' }}>
      {/* tažnice — vstupní hrana zaoblená poloměrem RM */}
      {[-1, 1].map(s => {
        const X = (x) => CX + s * x, sw = s > 0 ? 1 : 0, yb = TOP + T + 300;
        return (
          <path key={s} d={'M' + X(DIE) + ' ' + yb + ' L' + X(DIE) + ' ' + YD +
            ' A' + RM + ' ' + RM + ' 0 0 ' + sw + ' ' + X(XD) + ' ' + (TOP + T) +
            ' L' + X(CX - 10) + ' ' + (TOP + T) + ' L' + X(CX - 10) + ' ' + yb + ' Z'}
            fill="#39434f" stroke="#5a6570" strokeWidth={1.6} strokeLinejoin="round" />
        );
      })}
      {[-1, 1].map(s => (
        <path key={'rm' + s} d={'M' + (CX + s * DIE + s * 3) + ' ' + YD +
          ' A' + (RM - 3) + ' ' + (RM - 3) + ' 0 0 ' + (s > 0 ? 1 : 0) + ' ' + (CX + s * XD) + ' ' + (TOP + T + 3)}
          fill="none" stroke={ACC} strokeWidth={5} strokeLinecap="round" />
      ))}
      <text x={26} y={TOP + T + 30} fontFamily={SANS} fontSize={14} fill="#93a2b2">tažnice</text>
      <line x1={274} y1={288} x2={CX - XD + (RM - 3) * 0.7071} y2={YD - (RM - 3) * 0.7071} stroke={ACC} strokeWidth={1.2} />
      <text x={270} y={306} textAnchor="end" fontFamily={SANS} fontSize={14} fill={ACC}>zaoblení tažnice</text>
      <text x={270} y={324} textAnchor="end" fontFamily={SANS} fontSize={12.5} fill="#8296a8">střižnice má ostrou hranu</text>

      {/* přidržovač — dosedá na přírubu za zaoblením tažnice */}
      {[-1, 1].map(s => (
        <rect key={s} x={s < 0 ? 10 : CX + XD + 4} y={TOP - 30} width={CX - XD - 14} height={28} rx={5}
          fill="#4a5563" stroke="#6d7986" strokeWidth={1.4} />
      ))}
      <text x={26} y={TOP - 40} fontFamily={SANS} fontSize={14} fill="#93a2b2">přidržovač</text>

      {/* tažník — hrana čela zaoblená poloměrem RP */}
      <path d={'M' + (CX - PUN) + ' ' + (yf - 320) + ' L' + (CX + PUN) + ' ' + (yf - 320) +
        ' L' + (CX + PUN) + ' ' + (yf - RP) + ' A' + RP + ' ' + RP + ' 0 0 1 ' + (CX + PUN - RP) + ' ' + yf +
        ' L' + (CX - PUN + RP) + ' ' + yf + ' A' + RP + ' ' + RP + ' 0 0 1 ' + (CX - PUN) + ' ' + (yf - RP) + ' Z'}
        fill="#4a5563" stroke="#6d7986" strokeWidth={1.6} strokeLinejoin="round" />
      {[-1, 1].map(s => (
        <path key={'rp' + s} d={'M' + (CX + s * (PUN - 3)) + ' ' + (yf - RP) +
          ' A' + (RP - 3) + ' ' + (RP - 3) + ' 0 0 ' + (s > 0 ? 1 : 0) + ' ' + (CX + s * (PUN - RP)) + ' ' + (yf - 3)}
          fill="none" stroke={ACC} strokeWidth={5} strokeLinecap="round" />
      ))}
      <text x={CX} y={Math.max(24, yf - 296)} textAnchor="middle" fontFamily={SANS} fontSize={14} fill="#c4d2de">tažník</text>
      <line x1={CX + 44} y1={yf - 36} x2={CX + PUN - RP + (RP - 3) * 0.7071} y2={yf - RP + (RP - 3) * 0.7071} stroke={ACC} strokeWidth={1.2} />
      <text x={CX} y={yf - 40} textAnchor="middle" fontFamily={SANS} fontSize={13} fill={ACC}>zaoblení tažníku</text>

      {/* plech */}
      {seg.flange.map((d, i) => <path key={'f' + i} d={d} fill="none" stroke={cF} strokeWidth={wFlange} strokeLinecap="butt" />)}
      {seg.wall.map((d, i) => <path key={'w' + i} d={d} fill="none" stroke={cW} strokeWidth={wWall} strokeLinecap="butt" />)}
      {seg.bottom.map((d, i) => <path key={'b' + i} d={d} fill="none" stroke={cB} strokeWidth={wBottom} strokeLinecap="butt" />)}

      {/* osa */}
      <line x1={CX} y1={60} x2={CX} y2={500} stroke="rgba(150,180,210,0.28)" strokeWidth={1.1} strokeDasharray="12 6 3 6" />

      {/* tok materiálu */}
      {flow && depth > 0.04 && (
        <g>
          {[0, 1].map(i => {
            const xo = DIE + 40 + i * 46;
            if (xo > Rf) return null;
            return (
              <g key={i}>
                <Arrow x1={CX - xo - 30} y1={TOP - 48} x2={CX - xo + 6} y2={TOP - 48} color={ACC} w={2.4} />
                <Arrow x1={CX + xo + 30} y1={TOP - 48} x2={CX + xo - 6} y2={TOP - 48} color={ACC} w={2.4} />
              </g>
            );
          })}
          <text x={CX} y={TOP - 62} textAnchor="middle" fontFamily={SANS} fontSize={14} fill={ACC}>příruba se vtahuje do tažnice</text>
          <Arrow x1={CX} y1={ym - 300} x2={CX} y2={ym - 250} color={WARM} w={2.6} />
        </g>
      )}

      {/* tloušťka */}
      {thick && (
        <g fontFamily="'IBM Plex Mono', monospace" fontSize={14}>
          <line x1={CX + 40} y1={ym} x2={CX + 190} y2={ym + 46} stroke="#8296a8" strokeWidth={1} />
          <text x={CX + 196} y={ym + 51} fill={GREEN}>dno 1,00 · t</text>
          <line x1={CX + PRM} y1={ym - 70} x2={CX + 190} y2={ym - 86} stroke="#8296a8" strokeWidth={1} />
          <text x={CX + 196} y={ym - 82} fill={WARM}>{'stěna ' + (1 - 0.24 * depth).toFixed(2).replace('.', ',') + ' · t'}</text>
          <line x1={CX - Rf + 6} y1={TOP + T / 2} x2={CX - Rf - 40} y2={TOP - 92} stroke="#8296a8" strokeWidth={1} />
          <text x={CX - Rf - 44} y={TOP - 96} textAnchor="end" fill={RED}>{'okraj příruby ' + (1 + 0.15 * depth).toFixed(2).replace('.', ',') + ' · t'}</text>
        </g>
      )}
    </svg>
  );
}

function Toggle({ on, set, label, color }) {
  return (
    <button onClick={() => set(!on)} style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 999, cursor: 'pointer',
      background: on ? 'rgba(123,163,204,0.16)' : 'rgba(120,150,180,0.06)',
      border: '1px solid ' + (on ? 'rgba(123,163,204,0.5)' : 'rgba(150,180,210,0.16)'),
      color: on ? '#eaf2fa' : '#8fa3b6', fontFamily: SANS, fontSize: 14, fontWeight: 500
    }}>
      <span style={{ width: 9, height: 9, borderRadius: 999, background: on ? color : '#4c5966' }}></span>{label}
    </button>
  );
}

function TazeniPrubeh() {
  const [depth, setDepth] = useState(0.35);
  const [play, setPlay] = useState(false);
  const [strain, setStrain] = useState(true);
  const [thick, setThick] = useState(false);
  const [flow, setFlow] = useState(false);
  const raf = useRef(0);

  useEffect(() => {
    if (!play) return;
    let last = performance.now();
    const tick = (now) => {
      const dt = (now - last) / 1000; last = now;
      setDepth(d => {
        const n = d + dt * 0.175;
        if (n >= 1) { setPlay(false); return 1; }
        return n;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [play]);

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: 20, boxSizing: 'border-box', fontFamily: SANS, color: '#eaf2fa' }}>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center' }}>
        <Diagram depth={depth} strain={strain} thick={thick} flow={flow} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '10px 0 12px' }}>
        <button onClick={() => { if (depth >= 0.999) setDepth(0); setPlay(p => !p); }} style={{
          padding: '10px 20px', borderRadius: 12, cursor: 'pointer', background: 'rgba(123,163,204,0.18)',
          border: '1px solid rgba(123,163,204,0.45)', color: '#eaf2fa', fontFamily: HEAD, fontWeight: 700, fontSize: 15
        }}>{play ? 'Pauza' : 'Přehrát'}</button>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 13, color: '#8296a8' }}>{'Zdvih tažníku — hloubka ' + Math.round(depth * 100) + ' %'}</div>
          <input type="range" min={0} max={1} step={0.005} value={depth}
            onChange={e => { setPlay(false); setDepth(parseFloat(e.target.value)); }}
            style={{ width: '100%', accentColor: ACC }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Toggle on={strain} set={setStrain} label="Přetvoření" color={RED} />
        <Toggle on={thick} set={setThick} label="Tloušťka stěny" color={WARM} />
        <Toggle on={flow} set={setFlow} label="Tok materiálu" color={ACC} />
        {strain && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 'auto', fontSize: 13.5, color: '#8fa3b6' }}>
            <span style={{ color: RED }}>■ příruba — stlačení po obvodu</span>
            <span style={{ color: WARM }}>■ stěna — tah</span>
            <span style={{ color: GREEN }}>■ dno — téměř bez deformace</span>
          </div>
        )}
      </div>
    </div>
  );
}
window.TazeniPrubeh = TazeniPrubeh;
