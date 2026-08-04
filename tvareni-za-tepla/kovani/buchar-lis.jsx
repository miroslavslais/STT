// buchar-lis.jsx — Buchar × lis: rázové vs. klidné přetváření a hloubka prokování.
// Split-screen: vlevo buchar (opakované rázy → prokove jen povrch), vpravo lis
// (klidný tlak po celou dobu → přetvoření pronikne do jádra). Pod každým polotovarem
// kruhový detail-výřez ("lupa") se zrnovou strukturou: nahoře povrch, dole jádro;
// hrubá licí zrna se od povrchu nahrazují jemnými protvářenými.
const { Stage, useTime, Easing, interpolate, clamp } = window;

const SANS = "'IBM Plex Sans', system-ui, sans-serif";
const HEAD = "'Quicksand', system-ui, sans-serif";
const MONO = "'IBM Plex Mono', ui-monospace, monospace";

const W = 1180, H = 770;
const CXH = 290, CXP = 890;      // střed bucharu / lisu
const TAB = 440;                  // horní plocha kovadla/stolu
const H0 = 180, W0 = 70;          // výchozí výška / poloviční šířka polotovaru
const DH = 60;                    // celkové stlačení
const LIFT = 75, PLIFT = 40;
const LY = 595, LR = 76;          // lupy

function fade(t, a, b, c, d) {
  if (t <= a || t >= d) return 0;
  if (t < b) return clamp((t - a) / (b - a), 0, 1);
  if (t > c) return clamp(1 - (t - c) / (d - c), 0, 1);
  return 1;
}

// ── zrnová mozaika (jitterované šestiúhelníky) ──────────────────────────────
function rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function grains(size, jig, seed, ry) {
  const r = rng(seed); const out = [];
  const stepX = size * 1.66, stepY = size * 1.44; let row = 0;
  for (let y = -84; y <= 84; y += stepY, row++) {
    const off = (row % 2) * stepX / 2;
    for (let x = -88; x <= 88; x += stepX) {
      const cx = x + off + (r() - 0.5) * jig, cy = y + (r() - 0.5) * jig;
      let pts = '';
      for (let k = 0; k < 6; k++) {
        const a = Math.PI / 3 * k + (r() - 0.5) * 0.24;
        const rr = size * (0.88 + r() * 0.26);
        pts += (cx + rr * Math.cos(a)).toFixed(1) + ',' + (cy + rr * Math.sin(a) * ry).toFixed(1) + ' ';
      }
      out.push(pts);
    }
  }
  return out;
}
const COARSE = grains(27, 12, 7, 1);
const FINE = grains(11, 5, 13, 0.72);

// polotovar se soudkovitostí: bulge = vyboulení, topBias < 0.5 = boule blíž povrchu
function billetPath(cx, h, w, bulge, topBias) {
  const yT = TAB - h, cyq = yT + h * topBias, bl = w * bulge;
  return 'M' + (cx - w).toFixed(1) + ' ' + yT.toFixed(1) + ' L' + (cx + w).toFixed(1) + ' ' + yT.toFixed(1) +
    ' Q' + (cx + w + bl).toFixed(1) + ' ' + cyq.toFixed(1) + ' ' + (cx + w).toFixed(1) + ' ' + TAB +
    ' L' + (cx - w).toFixed(1) + ' ' + TAB +
    ' Q' + (cx - w - bl).toFixed(1) + ' ' + cyq.toFixed(1) + ' ' + (cx - w).toFixed(1) + ' ' + yT.toFixed(1) + ' Z';
}

function Loupe({ cx, frac, id, dimOp }) {
  const yTop = LY - LR, front = yTop + frac * 2 * LR;
  return (
    <g opacity={dimOp}>
      <circle cx={cx} cy={LY} r={LR} fill="#10151c" stroke="#5fc0ef" strokeWidth={2.2} />
      <g clipPath={'url(#' + id + ')'}>
        <g transform={'translate(' + cx + ' ' + LY + ')'}>
          {COARSE.map((p, i) => <polygon key={i} points={p} fill={i % 3 ? '#161c24' : '#1a212a'} stroke="#6c7885" strokeWidth={1.5} />)}
        </g>
        <g clipPath={'url(#' + id + 'f)'}>
          <rect x={cx - LR} y={yTop} width={2 * LR} height={2 * LR} fill="#101a15" />
          <g transform={'translate(' + cx + ' ' + LY + ')'}>
            {FINE.map((p, i) => <polygon key={i} points={p} fill="rgba(123,224,160,0.06)" stroke="#7be0a0" strokeWidth={0.9} opacity={0.75} />)}
          </g>
        </g>
        {frac > 0.02 && frac < 0.98 && (
          <line x1={cx - LR} y1={front} x2={cx + LR} y2={front} stroke="#7be0a0" strokeWidth={1.6} strokeDasharray="5 4" opacity={0.9} />
        )}
      </g>
      <circle cx={cx} cy={LY} r={LR} fill="none" stroke="#5fc0ef" strokeWidth={2.2} />
      <text x={cx} y={LY - LR + 16} textAnchor="middle" fontFamily={MONO} fontSize={10.5} fill="#9fb2c4">povrch</text>
      <text x={cx} y={LY + LR - 9} textAnchor="middle" fontFamily={MONO} fontSize={10.5} fill="#9fb2c4">jádro</text>
    </g>
  );
}

const BLOWS_FAST = { starts: [2.5, 3.6, 4.7, 5.8], dn: 0.14, hold: 0.12, up: 0.4, comp: 0.15 };
const BLOWS_SLOW = { starts: [2.8, 4.9], dn: 0.9, hold: 0.25, up: 0.7, comp: 0.5 };

function Scene() {
  const t = useTime();
  const [slow, setSlow] = React.useState(false);
  const B = slow ? BLOWS_SLOW : BLOWS_FAST;
  const hits = B.starts.map(s => s + B.dn);

  // beran bucharu — výška zdvihu nad polotovarem
  let offH = LIFT;
  for (const s of B.starts) {
    const e = s + B.dn + B.hold + B.up;
    if (t < s) break;
    if (t <= s + B.dn) { const p = (t - s) / B.dn; offH = LIFT * (1 - p * p); }
    else if (t <= s + B.dn + B.hold) offH = 0;
    else if (t <= e) { const p = (t - (s + B.dn + B.hold)) / B.up; offH = LIFT * (1 - (1 - p) * (1 - p)); }
    else offH = LIFT;
  }

  // stlačení: buchar po skocích, lis plynule
  let pH = 0;
  for (const h of hits) pH += clamp((t - h) / B.comp, 0, 1);
  pH = clamp(pH / hits.length, 0, 1);
  const liftP = interpolate([7.0, 8.2], [PLIFT, 0], Easing.easeInOutCubic)(t);
  const pP = interpolate([8.2, 11.2], [0, 1], Easing.easeInOutCubic)(t);

  const hH = H0 - DH * pH, hP = H0 - DH * pP;
  const wH = W0 * Math.sqrt(H0 / hH), wP = W0 * Math.sqrt(H0 / hP);
  const PATH_H = billetPath(CXH, hH, wH, 0.4 * pH, 0.36);
  const PATH_P = billetPath(CXP, hP, wP, 0.32 * pP, 0.5);
  const topH = TAB - hH, topP = TAB - hP;
  const ramBotH = topH - offH, ramBotP = topP - liftP;

  // ráz — poslední úder
  let imp = 0, prog = 1;
  for (const h of hits) {
    const o = fade(t, h - 0.02, h + 0.03, h + 0.1, h + (slow ? 0.9 : 0.55));
    if (o > imp) { imp = o; prog = clamp((t - h) / (slow ? 0.9 : 0.55), 0, 1); }
  }

  const dimH = interpolate([7.0, 7.5, 11.8, 12.3], [1, 0.4, 0.4, 1], Easing.linear)(t);
  const dimP = interpolate([2.2, 2.7, 7.0, 7.5], [1, 0.45, 0.45, 1], Easing.linear)(t);
  const arrOn = fade(t, 7.2, 7.8, 11.6, 12.2);
  const verdictOn = fade(t, 12.1, 12.8, 15.4, 16.1);
  const workHOn = clamp(pH * 1.2, 0, 1), workPOn = clamp(pP * 1.2, 0, 1);

  const caps = [
    { n: '01', txt: 'Stejný polotovar, stejná teplota — hrubá licí struktura v celém průřezu', a: 0.3, b: 0.9, c: 1.9, d: 2.4 },
    { n: '02', txt: 'Buchar: krátké rázy — energie se spotřebuje u povrchu, do jádra nepronikne', a: 2.5, b: 3.1, c: 6.5, d: 7.1 },
    { n: '03', txt: 'Lis: klidný tlak působí po celou dobu zdvihu — přetvoření pronikne až do jádra', a: 7.4, b: 8.0, c: 11.4, d: 11.9 },
    { n: '04', txt: 'Hloubka prokování: buchar prokove povrch, lis celý průřez', a: 12.2, b: 12.8, c: 15.3, d: 15.8 },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 85% at 50% 42%, rgba(58,40,22,0.30) 0%, rgba(9,13,20,0) 62%)' }} />
      <div style={{ position: 'absolute', left: 40, top: 26 }}>
        <div style={{ fontFamily: MONO, fontSize: 13, letterSpacing: '0.24em', color: '#e6a94a', textTransform: 'uppercase' }}>Buchar × lis</div>
        <div style={{ fontFamily: HEAD, fontSize: 27, fontWeight: 700, color: '#eaf2fa', letterSpacing: '-0.01em', marginTop: 6 }}>Hloubka prokování průřezu</div>
      </div>
      <button onClick={() => setSlow(s => !s)}
        style={{ position: 'absolute', right: 30, top: 28, display: 'flex', alignItems: 'center', gap: 10, padding: '9px 15px', borderRadius: 999, cursor: 'pointer',
          background: slow ? 'rgba(95,192,239,0.14)' : 'rgba(255,255,255,0.06)', border: '1px solid ' + (slow ? 'rgba(95,192,239,0.5)' : 'rgba(255,255,255,0.18)'),
          fontFamily: SANS, fontSize: 13.5, fontWeight: 600, color: '#eaf2fa' }}>
        <span style={{ width: 34, height: 18, borderRadius: 999, background: slow ? '#5fc0ef' : 'rgba(255,255,255,0.14)', position: 'relative', transition: 'background .2s' }}>
          <span style={{ position: 'absolute', top: 2, left: slow ? 18 : 2, width: 14, height: 14, borderRadius: 999, background: '#12161d', transition: 'left .2s' }} />
        </span>
        Zpomalený úder: {slow ? 'ZAP' : 'VYP'}
      </button>

      <svg width={W} height={H} viewBox={'0 0 ' + W + ' ' + H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <defs>
          <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe08a" /><stop offset="0.5" stopColor="#f7c948" /><stop offset="1" stopColor="#f0932b" /></linearGradient>
          <linearGradient id="ram" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#525c67" /><stop offset="1" stopColor="#3b444f" /></linearGradient>
          <linearGradient id="workH" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="rgba(123,224,160,0.6)" /><stop offset="0.4" stopColor="rgba(123,224,160,0.18)" /><stop offset="0.62" stopColor="rgba(123,224,160,0)" /></linearGradient>
          <linearGradient id="workP" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="rgba(123,224,160,0.5)" /><stop offset="1" stopColor="rgba(123,224,160,0.3)" /></linearGradient>
          <clipPath id="bilH"><path d={PATH_H} /></clipPath>
          <clipPath id="bilP"><path d={PATH_P} /></clipPath>
          <clipPath id="loH"><circle cx={CXH} cy={LY} r={LR - 1} /></clipPath>
          <clipPath id="loP"><circle cx={CXP} cy={LY} r={LR - 1} /></clipPath>
          <clipPath id="loHf"><rect x={CXH - LR} y={LY - LR} width={2 * LR} height={clamp(0.45 * pH, 0, 1) * 2 * LR} /></clipPath>
          <clipPath id="loPf"><rect x={CXP - LR} y={LY - LR} width={2 * LR} height={pP * 2 * LR} /></clipPath>
          <marker id="arw" markerWidth="9" markerHeight="9" refX="4" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#9fb2c4" /></marker>
        </defs>

        {/* ── BUCHAR (vlevo) ── */}
        <g opacity={dimH}>
          <text x={CXH} y={TAB + 37} textAnchor="middle" fontFamily={MONO} fontSize={13} letterSpacing="0.2em" fill="#9fb2c4">BUCHAR · OPAKOVANÉ RÁZY</text>
          <line x1={CXH - 100} y1={92} x2={CXH - 100} y2={TAB} stroke="#39424d" strokeWidth={4} />
          <line x1={CXH + 100} y1={92} x2={CXH + 100} y2={TAB} stroke="#39424d" strokeWidth={4} />
          <rect x={CXH - 85} y={ramBotH - 90} width={170} height={90} rx={6} fill="url(#ram)" stroke="#5c6773" strokeWidth={1.5} />
          <rect x={CXH - 150} y={TAB} width={300} height={58} rx={8} fill="#2b323b" stroke="#5c6773" strokeWidth={1.5} />
          <path d={PATH_H} fill="url(#metal)" stroke="#ffdd7a" strokeWidth={2.4} />
          <g clipPath="url(#bilH)">
            <rect x={CXH - 140} y={topH} width={280} height={hH} fill="url(#workH)" opacity={workHOn} />
            {imp > 0.01 && [0, 1, 2].map(i => {
              const rr = 16 + i * 20 + prog * 85;
              const op = imp * Math.max(0, 1 - rr / 150);
              return <path key={i} d={'M' + (CXH - rr) + ' ' + topH + ' A' + rr + ' ' + rr + ' 0 0 0 ' + (CXH + rr) + ' ' + topH} fill="none" stroke="#ffe08a" strokeWidth={2.4} opacity={op} />;
            })}
          </g>
          {imp > 0.01 && (
            <g opacity={imp}>
              <circle cx={CXH} cy={topH} r={30 + prog * 60} fill="none" stroke="#ffe08a" strokeWidth={2.5} opacity={0.8 * (1 - prog)} />
              <text x={CXH} y={ramBotH - 98} textAnchor="middle" fontFamily={MONO} fontSize={13} fill="#ffe08a" letterSpacing="0.2em">RÁZ</text>
            </g>
          )}
        </g>

        {/* ── LIS (vpravo) ── */}
        <g opacity={dimP}>
          <text x={CXP} y={TAB + 37} textAnchor="middle" fontFamily={MONO} fontSize={13} letterSpacing="0.2em" fill="#9fb2c4">LIS · KLIDNÝ TLAK</text>
          <rect x={CXP - 150} y={122} width={14} height={TAB - 122} fill="#242b33" stroke="#39424d" strokeWidth={1} />
          <rect x={CXP + 136} y={122} width={14} height={TAB - 122} fill="#242b33" stroke="#39424d" strokeWidth={1} />
          <rect x={CXP - 150} y={122} width={300} height={24} rx={4} fill="#1b2027" stroke="#39424d" strokeWidth={1.4} />
          <rect x={CXP - 15} y={146} width={30} height={Math.max(4, ramBotP - 70 - 146)} fill="#39424d" stroke="#4a5461" strokeWidth={1} />
          <rect x={CXP - 110} y={ramBotP - 70} width={220} height={70} rx={6} fill="url(#ram)" stroke="#5c6773" strokeWidth={1.5} />
          <g opacity={arrOn}>
            {[-62, 0, 62].map((dx, i) => (
              <line key={i} x1={CXP + dx} y1={ramBotP - 102} x2={CXP + dx} y2={ramBotP - 80} stroke="#9fb2c4" strokeWidth={2.6} markerEnd="url(#arw)" />
            ))}
            <text x={CXP} y={ramBotP - 110} textAnchor="middle" fontFamily={MONO} fontSize={12} fill="#9fb2c4">síla působí stále</text>
          </g>
          <rect x={CXP - 150} y={TAB} width={300} height={58} rx={8} fill="#2b323b" stroke="#5c6773" strokeWidth={1.5} />
          <path d={PATH_P} fill="url(#metal)" stroke="#ffdd7a" strokeWidth={2.4} />
          <g clipPath="url(#bilP)">
            <rect x={CXP - 140} y={topP} width={280} height={hP} fill="url(#workP)" opacity={workPOn} />
          </g>
        </g>

        {/* ── lupy — detail struktury v ose průřezu ── */}
        <g opacity={dimH}>
          <circle cx={CXH} cy={TAB - 46} r={11} fill="none" stroke="#5fc0ef" strokeWidth={1.6} opacity={0.75} />
          <line x1={CXH} y1={TAB - 35} x2={CXH} y2={LY - LR - 3} stroke="#5fc0ef" strokeWidth={1.3} strokeDasharray="4 4" opacity={0.55} />
        </g>
        <g opacity={dimP}>
          <circle cx={CXP} cy={TAB - 46} r={11} fill="none" stroke="#5fc0ef" strokeWidth={1.6} opacity={0.75} />
          <line x1={CXP} y1={TAB - 35} x2={CXP} y2={LY - LR - 3} stroke="#5fc0ef" strokeWidth={1.3} strokeDasharray="4 4" opacity={0.55} />
        </g>
        <Loupe cx={CXH} frac={clamp(0.45 * pH, 0, 1)} id="loH" dimOp={dimH} />
        <Loupe cx={CXP} frac={pP} id="loP" dimOp={dimP} />

        {/* verdikt pod lupami */}
        <g opacity={verdictOn} fontFamily={SANS} fontSize={14.5} fontWeight={600} textAnchor="middle">
          <text x={CXH} y={LY + LR + 26} fill="#ff9b7a">jádro zůstává hrubé — neprokované</text>
          <text x={CXP} y={LY + LR + 26} fill="#7be0a0">prokováno až do jádra</text>
        </g>

        {/* popisky fází */}
        {caps.map((s, i) => {
          const o = fade(t, s.a, s.b, s.c, s.d);
          if (o < 0.001) return null;
          return (
            <g key={i} opacity={o}>
              <text x={W / 2} y={H - 46} textAnchor="middle" fontFamily={MONO} fontSize={13} letterSpacing="0.22em" fill="#e6a94a">{s.n}</text>
              <text x={W / 2} y={H - 18} textAnchor="middle" fontFamily={SANS} fontSize={19} fontWeight={500} fill="#eaf2fa">{s.txt}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function BucharLis() {
  return (
    <Stage width={W} height={H} duration={16} background="#080b12" persistKey="buchar-lis" loop={true}>
      <Scene />
    </Stage>
  );
}

window.BucharLis = BucharLis;
