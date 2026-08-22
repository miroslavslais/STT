// ohybani.jsx — vliv poměru R/t a úhlu ohybu na neutrální osu, přetvoření a vznik trhliny.
// t = 3 mm pevně, táhlo R/t + táhlo úhlu ohybu s přehráváním.
const { useState, useEffect, useRef } = React;
const SANS = "'IBM Plex Sans', system-ui, sans-serif";
const HEAD = "'Quicksand', system-ui, sans-serif";
const MONO = "'IBM Plex Mono', ui-monospace, monospace";
const ACC = '#7ba3cc', GOOD = '#57b98a', BAD = '#e0655a', WARN = '#eda962';
const STEEL_E = '#8fa2b3', TENS = '#ff8a4c', COMP = '#3fa9f5';

const T = 3;      // tloušťka plechu [mm]
const PX = 11;    // px na mm
const RAD = Math.PI / 180;

function model(rt, ang) {
  const x = 0.5 - 0.2 * Math.exp(-0.5 * rt);      // součinitel posunutí neutrální osy
  const Ri = rt * T, Rn = Ri + x * T;
  const arc = Math.PI * Rn * ang / 180;           // délka oblouku neutrální osy [mm]
  // Přetvoření závisí na poměru R/t, ne na úhlu — jen se musí plech vůbec ohnout.
  const k = Math.min(1, ang / 10);
  const epsO = k * (Ri + T - Rn) / Rn, epsI = k * (Ri - Rn) / Rn;
  const thin = k * Math.min(24, 22 / (rt + 1));
  const kind = rt < 0.8 ? 'crack' : rt < 1.5 ? 'limit' : 'safe';
  const risk = kind === 'crack' ? Math.min(1, (0.8 - rt) / 0.6) * Math.min(1, ang / 45) : 0;
  return { x, Ri, Rn, arc, epsO, epsI, thin, kind, risk };
}

const VERDICT = {
  crack: { c: BAD, t: 'Poloměr je pod minimem', d: 'Přetvoření vnějších vláken překročilo tažnost materiálu — na vnějším povrchu vzniká trhlina. Pomůže větší poloměr, ohyb kolmo na směr vláken z válcování nebo měkčí, tvárnější materiál.' },
  limit: { c: WARN, t: 'Mezní poloměr', d: 'Ohyb projde, ale vnější vlákna jsou na hranici. Povrch se drsní (pomerančová kůra), materiál se v ohybu znatelně ztenčuje a při ohybu podél vláken hrozí prasknutí.' },
  safe: { c: GOOD, t: 'Bezpečný poloměr', d: 'Přetvoření vnějších vláken je nízké, ztenčení zanedbatelné. Neutrální osa leží blízko středu tloušťky, takže rozvinutá délka se počítá se součinitelem x kolem 0,5.' },
};

function Scene({ rt, ang, m }) {
  const t = T * PX, R = m.Ri * PX, Ro = R + t, Rn = m.Rn * PX, Rmid = R + t / 2;
  const CX = 210, SHY = 150, SW = 150, H = 120;
  const p = (ang / 2) * RAD;                       // náklon ramen od vodorovné
  const sp = Math.sin(p), cp = Math.cos(p);
  const CY = SHY - (Ro - SW * sp) / cp;            // střed zaoblení; plech dosedá na hrany ohybnice
  const P = (r, th) => [CX + r * Math.sin(th), CY + r * Math.cos(th)];
  const dR = [cp, -sp], dL = [-cp, -sp];
  // rameno musí přesáhnout hranu ohybnice, o kterou se plech opírá
  const arcEnd = [CX + Ro * sp, CY + Ro * cp];
  const reach = (CX + SW - arcEnd[0]) * dR[0] + (SHY - arcEnd[1]) * dR[1];
  const LEG = Math.max(110, Math.min(300, reach + 55));
  const RUN = 26;   // pásma napětí zasahují jen kousek za ohyb
  const off = (q, d, k) => [q[0] + d[0] * k, q[1] + d[1] * k];
  const f = n => n.toFixed(1);
  const pt = q => f(q[0]) + ' ' + f(q[1]);
  const bent = ang > 0.4;

  const band = (ra, rb, len) => {
    const LEG = len;
    const oL = P(rb, -p), oR = P(rb, p), iR = P(ra, p), iL = P(ra, -p);
    return 'M' + pt(off(oL, dL, LEG)) + ' L' + pt(oL)
      + (bent ? ' A' + f(rb) + ' ' + f(rb) + ' 0 0 0 ' + pt(oR) : ' L' + pt(oR))
      + ' L' + pt(off(oR, dR, LEG)) + ' L' + pt(off(iR, dR, LEG)) + ' L' + pt(iR)
      + (bent ? ' A' + f(ra) + ' ' + f(ra) + ' 0 0 1 ' + pt(iL) : ' L' + pt(iL))
      + ' L' + pt(off(iL, dL, LEG)) + ' Z';
  };

  // V rovných ramenech leží neutrální osa ve středu tloušťky, posouvá se až v oblouku.
  const tr = 20;
  const neutral = bent
    ? 'M' + pt(off(P(Rmid, -p), dL, LEG)) + ' L' + pt(off(P(Rmid, -p), dL, tr)) + ' L' + pt(P(Rn, -p))
      + ' A' + f(Rn) + ' ' + f(Rn) + ' 0 0 0 ' + pt(P(Rn, p))
      + ' L' + pt(off(P(Rmid, p), dR, tr)) + ' L' + pt(off(P(Rmid, p), dR, LEG))
    : 'M' + pt(off(P(Rmid, 0), dL, LEG)) + ' L' + pt(off(P(Rmid, 0), dR, LEG));

  const apexY = SHY + SW * Math.tan(p);
  const die = 'M-40 ' + SHY + ' L' + (CX - SW) + ' ' + SHY + ' L' + CX + ' ' + f(apexY)
    + ' L' + (CX + SW) + ' ' + SHY + ' L460 ' + SHY + ' L460 456 L-40 456 Z';

  const nL = P(R, -p), nR = P(R, p);
  const punch = 'M' + pt(off(nL, dL, H)) + ' L' + pt(nL)
    + (bent ? ' A' + f(R) + ' ' + f(R) + ' 0 0 0 ' + pt(nR) : ' L' + pt(nR))
    + ' L' + pt(off(nR, dR, H)) + ' Z';
  const shankY = Math.min(off(nL, dL, H)[1], off(nR, dR, H)[1]);

  // kóta tloušťky na konci levého ramene
  const tA = off(P(R, -p), dL, LEG + 16), tB = off(P(Ro, -p), dL, LEG + 16);
  const tMid = [(tA[0] + tB[0]) / 2, (tA[1] + tB[1]) / 2];
  const vertex = P(R, 0), crackR = m.risk;

  return (
    <svg viewBox="-46 0 506 460" width="100%" style={{ display: 'block' }}>
      <path d={die} fill="#2b333d" stroke="#5a6570" strokeWidth={1.6} strokeLinejoin="round" />
      <text x={432} y={SHY + 28} textAnchor="end" fontFamily={SANS} fontSize={18} fill="#8296a8">ohybnice</text>

      <path d={band(R, Ro, LEG)} fill="#77879a" stroke={STEEL_E} strokeWidth={1.3} strokeLinejoin="round" />
      {bent && <path d={band(Rn, Ro, RUN)} fill={TENS} fillOpacity={0.95} stroke="none" />}
      {bent && <path d={band(R, Rn, RUN)} fill={COMP} fillOpacity={0.95} stroke="none" />}
      {bent && [-1, 1].map(k => {
        const dir = k < 0 ? dL : dR, e1 = off(P(R, k * p), dir, RUN), e2 = off(P(Ro, k * p), dir, RUN);
        return <line key={k} x1={e1[0]} y1={e1[1]} x2={e2[0]} y2={e2[1]} stroke={STEEL_E} strokeWidth={1} opacity={0.6} />;
      })}
      <path d={neutral} fill="none" stroke="#ffffff" strokeWidth={1.8} strokeDasharray="8 5" />

      {bent && [-0.55, 0, 0.55].map((k, i) => {
        const th = p * k, q1 = P(R, th), q2 = P(Ro, th);
        return <line key={i} x1={q1[0]} y1={q1[1]} x2={q2[0]} y2={q2[1]} stroke="#e9f1f8" strokeWidth={0.9} opacity={0.45} />;
      })}

      {crackR > 0.05 && [-0.35, 0, 0.35].map((k, i) => {
        const th = Math.max(p, 0.08) * k, q1 = P(Ro, th), q2 = P(Ro - t * 0.55 * crackR, th);
        return <line key={i} x1={q1[0]} y1={q1[1]} x2={q2[0]} y2={q2[1]} stroke={BAD} strokeWidth={2.6 * (0.5 + crackR)} strokeLinecap="round" opacity={i === 1 ? 1 : 0.75} />;
      })}

      <g opacity={0.62}>
        {shankY > 16 && <rect x={CX - 26} y={12} width={52} height={shankY - 12} fill="#4a5563" stroke="#6d7986" strokeWidth={1.4} />}
        <path d={punch} fill="#4a5563" stroke="#6d7986" strokeWidth={1.5} strokeLinejoin="round" />
      </g>
      <text x={CX + 36} y={32} fontFamily={SANS} fontSize={18} fill="#8296a8">ohybník</text>

      {/* kóta poloměru — od středu zaoblení k vnitřnímu povrchu */}
      <g>
        <circle cx={CX} cy={CY} r={2.6} fill={ACC} />
        <line x1={CX} y1={CY} x2={vertex[0]} y2={vertex[1]} stroke={ACC} strokeWidth={1.2} strokeDasharray="5 4" />
        <line x1={CX} y1={CY} x2={-32} y2={30} stroke={ACC} strokeWidth={1} strokeDasharray="3 5" opacity={0.65} />
        <text x={-40} y={26} textAnchor="start" fontFamily={MONO} fontSize={17} fill={ACC}>R = {m.Ri.toFixed(2)} mm</text>
      </g>

      {/* kóta tloušťky */}
      <g stroke="#8296a8" strokeWidth={1.1}>
        <line x1={P(R, -p)[0]} y1={P(R, -p)[1]} x2={off(P(R, -p), dL, LEG + 22)[0]} y2={off(P(R, -p), dL, LEG + 22)[1]} strokeDasharray="3 4" opacity={0.55} />
        <line x1={P(Ro, -p)[0]} y1={P(Ro, -p)[1]} x2={off(P(Ro, -p), dL, LEG + 22)[0]} y2={off(P(Ro, -p), dL, LEG + 22)[1]} strokeDasharray="3 4" opacity={0.55} />
        <line x1={tA[0]} y1={tA[1]} x2={tB[0]} y2={tB[1]} />
        <line x1={tMid[0]} y1={tMid[1]} x2={-32} y2={tMid[1]} strokeDasharray="3 4" opacity={0.55} />
        <text x={-40} y={tMid[1] + 5} textAnchor="start" stroke="none" fontFamily={MONO} fontSize={17} fill="#c4d2de">t = 3</text>
      </g>
    </svg>
  );
}

function StrainChart({ m }) {
  const W = 340, H = 228, cx = 148, y0 = 52, h = 130, half = 104;
  const em = Math.max(0.35, Math.abs(m.epsO), Math.abs(m.epsI));
  const yN = y0 + m.x * h;                              // vnitřní povrch nahoře (jako ve schématu vlevo)
  const xo = cx + (m.epsO / em) * half, xi = cx + (m.epsI / em) * half;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      <text x={0} y={17} fontFamily={HEAD} fontWeight="700" fontSize={17} fill="#eaf2fa">Přetvoření po tloušťce</text>
      <line x1={cx} y1={y0 - 6} x2={cx} y2={y0 + h + 6} stroke="#5d6b79" strokeWidth={1.2} />
      <path d={`M${cx} ${yN} L${xi} ${y0} L${cx} ${y0} Z`} fill={COMP} fillOpacity={0.6} stroke={COMP} strokeWidth={1.2} />
      <path d={`M${cx} ${yN} L${xo} ${y0 + h} L${cx} ${y0 + h} Z`} fill={TENS} fillOpacity={0.6} stroke={TENS} strokeWidth={1.2} />
      <line x1={cx - half - 20} y1={yN} x2={cx + half + 6} y2={yN} stroke="#ffffff" strokeWidth={1.4} strokeDasharray="6 5" />
      <text x={cx + half + 10} y={y0 + 12} fontFamily={MONO} fontSize={15} fill="#6cc0ff">{(m.epsI * 100).toFixed(0)} %</text>
      <text x={cx + half + 10} y={y0 + h} fontFamily={MONO} fontSize={15} fill="#ff9d68">+{(m.epsO * 100).toFixed(0)} %</text>
      <text x={cx - half - 20} y={yN - 8} fontFamily={SANS} fontSize={15} fill="#eef3f8">neutrální osa</text>
      <text x={cx - half - 20} y={y0 - 8} fontFamily={SANS} fontSize={15} fill="#8296a8">vnitřní povrch</text>
      <text x={cx - half - 20} y={y0 + h + 18} fontFamily={SANS} fontSize={15} fill="#8296a8">vnější povrch</text>
    </svg>
  );
}

function Slider({ label, value, min, max, step, onChange, left, right, color, readout, zone }) {
  const pct = v => ((v - min) / (max - min)) * 100;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 14, color: '#eaf2fa' }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 13, color }}>{readout}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))} style={{ width: '100%', accentColor: color }} />
      {zone && (
        <div style={{ position: 'relative', height: 20, margin: '-2px 0 0' }}>
          <div style={{ position: 'absolute', left: 'calc(' + pct(zone.from) + '% + 7px)', width: 'calc(' + (pct(zone.to) - pct(zone.from)) + '% - 14px)', top: 0, height: 5, borderRadius: 3, background: GOOD }}></div>
          <div style={{ position: 'absolute', left: 'calc(' + pct(zone.from) + '% + 7px)', top: 7, fontFamily: SANS, fontSize: 12, color: GOOD, whiteSpace: 'nowrap' }}>{zone.label}</div>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: SANS, fontSize: 12.5, color: '#8296a8' }}>
        <span>{left}</span><span>{right}</span>
      </div>
    </div>
  );
}

function AngleControl({ ang, setAng, playing, setPlaying }) {
  const raf = useRef(0);
  useEffect(() => {
    if (!playing) return;
    let t0 = null;
    const step = (t) => {
      if (t0 === null) t0 = t;
      const p = Math.min(1, (t - t0) / 6000);
      setAng(Math.round(p * 120));
      if (p < 1) raf.current = requestAnimationFrame(step);
      else setPlaying(false);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [playing]);

  const done = ang >= 120 && !playing;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 14, color: '#eaf2fa' }}>Úhel ohybu α</span>
        <span style={{ fontFamily: MONO, fontSize: 13, color: ACC }}>{ang}°</span>
      </div>
      <button type="button"
        onClick={() => { if (playing) { setPlaying(false); return; } setAng(0); setPlaying(true); }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, height: 42, borderRadius: 12,
          background: playing ? 'rgba(123,163,204,0.14)' : ACC, color: playing ? ACC : '#0b1017',
          border: '1px solid rgba(123,163,204,0.5)', fontFamily: HEAD, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
        {playing
          ? <svg width="14" height="14" viewBox="0 0 14 14"><rect x="2" y="2" width="3.6" height="10" fill="currentColor"/><rect x="8.4" y="2" width="3.6" height="10" fill="currentColor"/></svg>
          : <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 2l9 5-9 5z" fill="currentColor"/></svg>}
        {playing ? 'Zastavit' : done ? 'Přehrát znovu' : 'Přehrát ohyb'}
      </button>
      <input type="range" min={0} max={120} step={1} value={ang}
        onChange={e => { setPlaying(false); setAng(parseInt(e.target.value, 10)); }}
        style={{ width: '100%', accentColor: ACC, cursor: 'pointer' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: SANS, fontSize: 12.5, color: '#8296a8' }}>
        <span>rovný plech</span><span>120° — přeohnutí</span>
      </div>
    </div>
  );
}

function Num({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
      <span style={{ fontFamily: SANS, fontSize: 14, color: '#aebfcf' }}>{label}</span>
      <span style={{ fontFamily: MONO, fontSize: 14.5, color: color || '#eaf2fa' }}>{value}</span>
    </div>
  );
}

function Ohybani() {
  const [rt, setRt] = useState(2.0);
  const [ang, setAng] = useState(60);
  const [playing, setPlaying] = useState(false);
  const m = model(rt, ang);
  const v = VERDICT[m.kind];

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', gap: 10, padding: 20, boxSizing: 'border-box', fontFamily: SANS, color: '#eaf2fa', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.05fr', gap: 18, alignItems: 'center', minHeight: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          <div style={{ width: 396, maxWidth: '100%' }}><Scene rt={rt} ang={ang} m={m} /></div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', fontSize: 12.5, whiteSpace: 'nowrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ff9d68' }}><span style={{ width: 16, height: 11, background: TENS, opacity: 0.85, borderRadius: 2 }}></span>tah — vnější</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6cc0ff' }}><span style={{ width: 16, height: 11, background: COMP, opacity: 0.85, borderRadius: 2 }}></span>tlak — vnitřní</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#eef3f8' }}><span style={{ width: 16, height: 0, borderTop: '2px dashed #ffffff' }}></span>neutrální osa</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ maxWidth: 340 }}><StrainChart m={m} /></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: 'rgba(120,150,180,0.06)', border: '1px solid rgba(150,180,210,0.16)', borderRadius: 14, padding: '12px 16px' }}>
            <Num label="Součinitel x" value={m.x.toFixed(2)} color={ACC} />
            <Num label="Poloměr neutrální osy ρ" value={`${m.Rn.toFixed(2)} mm`} />
            <Num label="Délka oblouku" value={`${m.arc.toFixed(2)} mm`} />
            <Num label="Ztenčení v ohybu" value={`${m.thin.toFixed(1)} %`} color={m.thin > 12 ? WARN : '#eaf2fa'} />
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.05fr', gap: 18, alignItems: 'start' }}>
        <div style={{ background: 'rgba(120,150,180,0.06)', border: '1px solid rgba(150,180,210,0.16)', borderRadius: 14, padding: '13px 16px' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 16.5, color: v.c, marginBottom: 4 }}>{v.t}</div>
          <div style={{ fontSize: 14.5, lineHeight: 1.5, color: '#d3dfea' }}>{v.d}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
          <Slider label="Poměr R/t" value={rt} min={0.2} max={4} step={0.1} onChange={setRt}
            left="0,2" right="4,0" color={WARN} readout={`R/t = ${rt.toFixed(1)}`}
            zone={{ from: 1.5, to: 4, label: 'bezpečné pro ocel' }} />
          <AngleControl ang={ang} setAng={setAng} playing={playing} setPlaying={setPlaying} />
        </div>
      </div>
    </div>
  );
}
window.Ohybani = Ohybani;
