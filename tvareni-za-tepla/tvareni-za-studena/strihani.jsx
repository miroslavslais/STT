// strihani.jsx — vliv střižné vůle na kvalitu střižné plochy.
// t = 3 mm pevně, táhlo vůle z (mm na stranu) + táhlo zdvihu nože.
const { useState, useEffect, useRef } = React;
const SANS = "'IBM Plex Sans', system-ui, sans-serif";
const HEAD = "'Quicksand', system-ui, sans-serif";
const MONO = "'IBM Plex Mono', ui-monospace, monospace";
const ACC = '#7ba3cc', GOOD = '#57b98a', BAD = '#e0655a', WARN = '#eda962';
const STEEL = '#c6d3de', STEEL_E = '#8fa2b3', TOOL = '#4a5563', TOOL_E = '#6d7986';

const T = 3;              // tloušťka plechu [mm]
const PXMM = 34;          // měřítko svislé
const GAPX = 3;           // vodorovné zvětšení vůle v hlavním schématu

function model(z) {
  const zr = z / T;
  let roll = Math.min(0.34, 0.03 + 1.5 * zr);
  let smooth = Math.max(0.10, 0.60 - 2.1 * zr);
  let frac = Math.max(0.10, 1 - roll - smooth);
  const sum = roll + smooth + frac;
  roll /= sum; smooth /= sum; frac /= sum;
  let burr = 0.03 + 2.2 * Math.max(0, zr - 0.085);
  if (zr < 0.03) burr += (0.03 - zr) * 3.0;
  burr = Math.min(0.30, burr);
  const hf = roll + smooth;               // relativní vniknutí do lomu
  const fmax = 1.16 - 1.0 * zr;           // relativní max. střižná síla
  const secondary = zr < 0.03;
  const kind = zr < 0.03 ? 'small' : zr > 0.10 ? 'big' : 'ok';
  return { zr, roll, smooth, frac, burr, hf, fmax, secondary, kind };
}

function forceAt(u, m) {          // u = vniknutí / t
  if (u <= 0 || u >= m.hf) return 0;
  const x = u / m.hf;
  const g = Math.pow(x, 0.4) * Math.pow(1 - x, 0.5);
  const gmax = Math.pow(0.444, 0.4) * Math.pow(0.556, 0.5);
  let f = m.fmax * g / gmax;
  if (m.secondary && x > 0.55) f += m.fmax * 0.22 * Math.sin((x - 0.55) / 0.45 * Math.PI);
  return f;
}

function Scene({ z, stroke, m }) {
  const y0 = 92, h = T * PXMM, y1 = y0 + h;
  const XP = 190, gap = Math.max(1.2, z * PXMM * GAPX), XD = XP + gap;
  const trav = stroke * 1.25 * h;                 // dráha nože
  const cut = trav / h >= m.hf;                   // došlo k oddělení
  const d = trav;

  return (
    <svg viewBox="0 0 470 430" width="100%" style={{ display: 'block' }}>
      {/* střižník */}
      <rect x={18} y={y0 - 200 + d} width={XP - 18} height={200} rx={3} fill={TOOL} stroke={TOOL_E} strokeWidth={1.6} />
      <text x={104} y={Math.max(22, y0 - 168 + d)} textAnchor="middle" fontFamily={SANS} fontSize={13} fill="#aebfcf">střižník</text>
      {/* střižnice */}
      <rect x={XD} y={y1} width={380 - XD} height={120} rx={3} fill="#39434f" stroke={TOOL_E} strokeWidth={1.6} />
      <rect x={XD} y={y0 - 200} width={380 - XD} height={200} rx={3} fill={TOOL} stroke={TOOL_E} strokeWidth={1.6} opacity={0.55} />
      <text x={320} y={y1 + 34} textAnchor="middle" fontFamily={SANS} fontSize={13} fill="#aebfcf">střižnice</text>

      {/* pevná část plechu */}
      <rect x={XD} y={y0} width={380 - XD} height={h} fill={STEEL} stroke={STEEL_E} strokeWidth={1.4} />
      {/* výstřižek */}
      <rect x={18} y={y0 + d} width={XP - 18} height={h} fill={STEEL} stroke={STEEL_E} strokeWidth={1.4} />
      {/* smyková zóna */}
      {!cut && (() => {
        const u = trav / h, hf = m.hf;
        const phase = u < 0.12 * hf ? 'elastic' : u < 0.7 * hf ? 'plastic' : 'crack';
        const cp = phase === 'crack' ? Math.min(1, (u - 0.7 * hf) / (0.3 * hf)) : 0;
        const zoneFill = phase === 'elastic' ? '#7f9ec4' : '#a9bccc';
        // trhliny: od břitu střižníku a od břitu střižnice proti sobě
        const P0 = [XP, y0 + d], P1 = [XD, y1];
        const vx = P1[0] - P0[0], vy = P1[1] - P0[1];
        const len = Math.hypot(vx, vy) || 1;
        const meet = m.kind === 'ok';
        const a = meet ? 0 : (m.kind === 'small' ? -0.55 : 0.45);
        const rot = (dx, dy, ang) => [dx * Math.cos(ang) - dy * Math.sin(ang), dx * Math.sin(ang) + dy * Math.cos(ang)];
        const L = len * (meet ? 0.52 : 0.42) * (0.28 + 0.72 * cp);
        const dA = rot(vx / len, vy / len, a), dB = rot(-vx / len, -vy / len, a);
        const A1 = [P0[0] + dA[0] * L, P0[1] + dA[1] * L];
        const B1 = [P1[0] + dB[0] * L, P1[1] + dB[1] * L];
        const note = phase === 'elastic'
          ? { t: 'pružná deformace v celém objemu', c: '#9ec3e8' }
          : phase === 'plastic'
            ? { t: 'plastická deformace — smyk', c: '#c4d2de' }
            : meet
              ? { t: 'trhliny míří proti sobě a potkají se', c: GOOD }
              : m.kind === 'small'
                ? { t: 'trhliny se míjejí → druhý střih', c: BAD }
                : { t: 'trhliny se míjejí → šikmý, roztržený lom', c: WARN };
        return (
          <g>
            <path d={`M${XP} ${y0 + d} L${XD} ${y0} L${XD} ${y1} L${XP} ${y1 + d} Z`} fill={zoneFill} stroke={STEEL_E} strokeWidth={1.2} />
            {[0.25, 0.5, 0.75].map((k, i) => (
              <line key={i} x1={XP + (XD - XP) * k} y1={y0 + d * (1 - k)} x2={XP + (XD - XP) * k} y2={y1 + d * (1 - k)}
                stroke={phase === 'elastic' ? '#c8ddf2' : '#7d8ea0'} strokeWidth={0.9} opacity={0.75} />
            ))}
            {phase === 'crack' && (
              <g>
                <line x1={P0[0]} y1={P0[1]} x2={A1[0]} y2={A1[1]} stroke={note.c} strokeWidth={2.4} strokeLinecap="round" />
                <line x1={P1[0]} y1={P1[1]} x2={B1[0]} y2={B1[1]} stroke={note.c} strokeWidth={2.4} strokeLinecap="round" />
                {meet && cp > 0.92 && <circle cx={(P0[0] + P1[0]) / 2} cy={(P0[1] + P1[1]) / 2} r={4} fill={GOOD} />}
              </g>
            )}
            <text x={18} y={y1 + 212} fontFamily={SANS} fontWeight="600" fontSize={14} fill={note.c}>{note.t}</text>
          </g>
        );
      })()}
      {cut && (
        <text x={18} y={y1 + 212} fontFamily={SANS} fontWeight="600" fontSize={14} fill={ACC}>oddělený výstřižek</text>
      )}

      {/* kóta vůle */}
      <g>
        <line x1={XP} y1={y1 + 4} x2={XP} y2={y1 + 190} strokeDasharray="3 4" stroke={WARN} strokeWidth={1} />
        <line x1={XD} y1={y1 + 122} x2={XD} y2={y1 + 190} strokeDasharray="3 4" stroke={WARN} strokeWidth={1} />
        <line x1={XP - 26} y1={y1 + 178} x2={XD + 10} y2={y1 + 178} stroke={WARN} strokeWidth={1.2} />
        <text x={XP - 32} y={y1 + 174} textAnchor="end" fontFamily={MONO} fontSize={13} fill={WARN}>z = {z.toFixed(2)} mm</text>
        <text x={XP - 32} y={y1 + 192} textAnchor="end" fontFamily={SANS} fontSize={11.5} fill="#8296a8">({GAPX}× zvětšeno)</text>
      </g>
      {/* kóta tloušťky */}
      <g>
        <line x1={396} y1={y0} x2={396} y2={y1} stroke="#8296a8" strokeWidth={1} />
        <line x1={390} y1={y0} x2={402} y2={y0} stroke="#8296a8" strokeWidth={1} />
        <line x1={390} y1={y1} x2={402} y2={y1} stroke="#8296a8" strokeWidth={1} />
        <text x={406} y={(y0 + y1) / 2 + 4} fontFamily={MONO} fontSize={12.5} fill="#c4d2de">t = 3 mm</text>
      </g>
    </svg>
  );
}

function Surface({ m, z }) {
  const H = 230, W = 150, x0 = 96, y0 = 34;
  const hRoll = m.roll * H, hSm = m.smooth * H, hFr = m.frac * H;
  const yA = y0, yB = y0 + hRoll, yC = yB + hSm, yD = yC + hFr;
  const skew = 6 + m.zr * 150;              // sklon lomové plochy
  const burrH = m.burr * 46;
  const edge = `M${x0 + W} ${yA} C${x0 + W - 26} ${yA + 2} ${x0 + W - 30} ${yB - hRoll * 0.3} ${x0 + W - 30} ${yB}`
    + ` L${x0 + W - 30} ${yC} L${x0 + W - 30 + skew} ${yD} L${x0 + W - 30 + skew} ${yD}`;
  const body = edge + ` L${x0} ${yD} L${x0} ${yA} Z`;

  const bands = [
    { y: yA, h: hRoll, c: '#9fb3c4', label: 'vtažení', pct: m.roll },
    { y: yB, h: hSm, c: '#dbe6ef', label: 'plastické (hladké) pásmo', pct: m.smooth },
    { y: yC, h: hFr, c: '#8b9bab', label: 'lomová plocha', pct: m.frac },
  ];

  return (
    <svg viewBox="0 0 430 330" width="100%" style={{ display: 'block' }}>
      <defs>
        <pattern id="rough" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#5d6b79" strokeWidth="1.6" />
        </pattern>
        <clipPath id="edgeclip"><path d={body} /></clipPath>
      </defs>
      <text x={x0} y={18} fontFamily={HEAD} fontWeight="700" fontSize={14} fill="#eaf2fa">Řez střižnou plochou</text>

      <path d={body} fill={STEEL} stroke={STEEL_E} strokeWidth={1.3} />
      {/* pásma jako barevné proužky u hrany */}
      {bands.map((b, i) => (
        <rect key={i} x={x0 + W - 30} y={b.y} width={26} height={b.h} fill={b.c} opacity={0.9} />
      ))}
      <rect x={x0 + W - 30} y={yC} width={Math.min(26 + skew, W - 30)} height={hFr} fill="url(#rough)" opacity={0.55} clipPath="url(#edgeclip)" />
      <path d={edge} fill="none" stroke="#eaf2fa" strokeWidth={1.8} />

      {/* otřep */}
      <path d={`M${x0 + W - 30 + skew} ${yD} l${4 + burrH * 0.5} ${burrH} l${-6 - burrH * 0.2} ${-burrH * 0.45} Z`}
        fill={m.burr > 0.12 ? BAD : STEEL} stroke={m.burr > 0.12 ? BAD : STEEL_E} strokeWidth={1.2} />

      {/* popisky pásem */}
      {bands.map((b, i) => (
        <g key={'l' + i}>
          <line x1={x0 + W + 2} y1={b.y + b.h / 2} x2={x0 + W + 26} y2={b.y + b.h / 2} stroke="#5d6b79" strokeWidth={1} />
          <text x={x0 + W + 32} y={b.y + b.h / 2 - 2} fontFamily={SANS} fontSize={13} fill="#c4d2de">{b.label}</text>
          <text x={x0 + W + 32} y={b.y + b.h / 2 + 14} fontFamily={MONO} fontSize={12} fill="#8296a8">{Math.round(b.pct * 100)} % t</text>
        </g>
      ))}
      <g>
        <line x1={x0 + W + 2} y1={yD + burrH * 0.6} x2={x0 + W + 26} y2={yD + burrH * 0.6} stroke="#5d6b79" strokeWidth={1} />
        <text x={x0 + W + 32} y={yD + burrH * 0.6 - 2} fontFamily={SANS} fontSize={13} fill={m.burr > 0.12 ? BAD : '#c4d2de'}>otřep</text>
        <text x={x0 + W + 32} y={yD + burrH * 0.6 + 14} fontFamily={MONO} fontSize={12} fill="#8296a8">{(m.burr * T).toFixed(2)} mm</text>
      </g>
      {/* strana nástroje */}
      <text x={x0 - 6} y={yA + 12} textAnchor="end" fontFamily={SANS} fontSize={12} fill="#66788a">strana</text>
      <text x={x0 - 6} y={yA + 26} textAnchor="end" fontFamily={SANS} fontSize={12} fill="#66788a">střižníku</text>
      <text x={x0 - 6} y={yD - 6} textAnchor="end" fontFamily={SANS} fontSize={12} fill="#66788a">strana střižnice</text>
    </svg>
  );
}

function ForceGraph({ m, stroke }) {
  const W = 400, H = 165, L = 46, B = H - 34;
  const u = stroke * 1.25;
  const pts = [];
  for (let i = 0; i <= 120; i++) {
    const x = (i / 120) * 1.25;
    pts.push([L + (x / 1.25) * (W - L - 12), B - forceAt(x, m) / 1.2 * (B - 16)]);
  }
  const dPath = 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
  const mx = L + (u / 1.25) * (W - L - 12);
  const my = B - forceAt(u, m) / 1.2 * (B - 16);
  const fx = L + (m.hf / 1.25) * (W - L - 12);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      <line x1={L} y1={16} x2={L} y2={B} stroke="#5d6b79" strokeWidth={1.2} />
      <line x1={L} y1={B} x2={W - 8} y2={B} stroke="#5d6b79" strokeWidth={1.2} />
      <text x={L - 8} y={24} textAnchor="end" fontFamily={SANS} fontSize={15} fill="#aebfcf">F</text>
      <text x={W - 8} y={B + 22} textAnchor="end" fontFamily={SANS} fontSize={15} fill="#aebfcf">vniknutí střižníku</text>
      <line x1={fx} y1={16} x2={fx} y2={B} stroke={ACC} strokeWidth={1} strokeDasharray="4 4" opacity={0.7} />
      <text x={fx + 7} y={28} fontFamily={SANS} fontSize={15} fill={ACC}>lom</text>
      <path d={dPath} fill="none" stroke={WARN} strokeWidth={2.2} strokeLinejoin="round" />
      <circle cx={mx} cy={my} r={4.5} fill={WARN} stroke="#080b12" strokeWidth={1.5} />
      <text x={L + 8} y={18} fontFamily={MONO} fontSize={14} fill="#aebfcf">F max ≈ {(m.fmax * 100 / 1.16).toFixed(0)} %</text>
    </svg>
  );
}

const VERDICT = {
  small: { c: BAD, t: 'Vůle je malá', d: 'Trhliny od střižníku a od střižnice se míjejí — materiál mezi nimi se stříhá podruhé. Na ploše vzniká druhý pás lomu, střižná síla je nejvyšší a nástroj se rychle opotřebovává.' },
  ok: { c: GOOD, t: 'Vůle je správná', d: 'Trhliny se potkají v jedné rovině: plocha má jedno souvislé plastické pásmo, jednu lomovou plochu a minimální otřep. Pro ocel odpovídá 5–8 % tloušťky, tedy 0,15–0,24 mm.' },
  big: { c: WARN, t: 'Vůle je velká', d: 'Materiál se před střihem vtahuje a ohýbá — roste vtažení i otřep, lomová plocha je šikmá a rozměr výstřižku nesedí. Střižná síla sice klesá, kvalita ale s ní.' },
};

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

function PlayControl({ stroke, setStroke, playing, setPlaying }) {
  const raf = useRef(0);
  useEffect(() => {
    if (!playing) return;
    let t0 = null;
    const step = (t) => {
      if (t0 === null) t0 = t;
      const p = Math.min(1, (t - t0) / 8800);
      setStroke(p);
      if (p < 1) raf.current = requestAnimationFrame(step);
      else setPlaying(false);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [playing]);

  const done = stroke >= 1 && !playing;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 14, color: '#eaf2fa' }}>Zdvih střižníku</span>
        <span style={{ fontFamily: MONO, fontSize: 13, color: ACC }}>{Math.round(stroke * 100)} %</span>
      </div>
      <button type="button"
        onClick={() => { if (playing) { setPlaying(false); return; } setStroke(0); setPlaying(true); }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, height: 42, borderRadius: 12,
          background: playing ? 'rgba(123,163,204,0.14)' : ACC, color: playing ? ACC : '#0b1017',
          border: '1px solid rgba(123,163,204,0.5)', fontFamily: HEAD, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
        {playing
          ? <svg width="14" height="14" viewBox="0 0 14 14"><rect x="2" y="2" width="3.6" height="10" fill="currentColor"/><rect x="8.4" y="2" width="3.6" height="10" fill="currentColor"/></svg>
          : <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 2l9 5-9 5z" fill="currentColor"/></svg>}
        {playing ? 'Zastavit' : done ? 'Přehrát znovu' : 'Přehrát střih'}
      </button>
      <input type="range" min={0} max={1} step={0.01} value={stroke}
        onChange={e => { setPlaying(false); setStroke(parseFloat(e.target.value)); }}
        style={{ width: '100%', accentColor: ACC, cursor: 'pointer' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: SANS, fontSize: 12.5, color: '#8296a8' }}>
        <span>před dosednutím</span><span>po oddělení</span>
      </div>
    </div>
  );
}

function Strihani() {
  const [z, setZ] = useState(0.20);
  const [stroke, setStroke] = useState(0.35);
  const [playing, setPlaying] = useState(false);
  const m = model(z);
  const v = VERDICT[m.kind];

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: 20, boxSizing: 'border-box', fontFamily: SANS, color: '#eaf2fa', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 16, alignItems: 'center' }}>
        <Scene z={z} stroke={stroke} m={m} />
        <Surface m={m} z={z} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 26, margin: '4px 0 14px' }}>
        <Slider label="Střižná vůle z (na stranu)" value={z} min={0.03} max={0.60} step={0.01} onChange={setZ}
          left="0,03 mm" right="0,60 mm" color={WARN} readout={`${z.toFixed(2)} mm = ${(z / T * 100).toFixed(1)} % t`}
          zone={{ from: 0.15, to: 0.24, label: 'správná vůle 5–8 % t' }} />
        <PlayControl stroke={stroke} setStroke={setStroke} playing={playing} setPlaying={setPlaying} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.05fr', gap: 16, alignItems: 'center' }}>
        <ForceGraph m={m} stroke={stroke} />
        <div style={{ background: 'rgba(120,150,180,0.06)', border: '1px solid rgba(150,180,210,0.16)', borderRadius: 14, padding: '16px 20px' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 18, color: v.c, marginBottom: 6 }}>{v.t}</div>
          <div style={{ fontSize: 15.5, lineHeight: 1.6, color: '#d3dfea' }}>{v.d}</div>
        </div>
      </div>
    </div>
  );
}
window.Strihani = Strihani;
