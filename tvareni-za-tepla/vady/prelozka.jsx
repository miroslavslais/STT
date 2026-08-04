// prelozka.jsx — vznik přeložky v zápustce: vlevo ostrý přechod (vada),
// vpravo zaoblený (v pořádku). Materiál teče do dutiny dvěma proudy.
const { Stage, useTime, Easing, interpolate, clamp } = window;

const SANS = "'IBM Plex Sans', system-ui, sans-serif";
const HEAD = "'Quicksand', system-ui, sans-serif";
const BAD = '#e0655a', GOOD = '#57b98a', HOT = '#f0a94a';

function fade(t, a, b, c, d) {
  if (t <= a || t >= d) return 0;
  if (t < b) return clamp((t - a) / (b - a), 0, 1);
  if (t > c) return clamp(1 - (t - c) / (d - c), 0, 1);
  return 1;
}

// dutina zápustky: šířka half-width w(y) pro y od 0 (dělicí rovina) po 210 (dno)
function cavity(y, sharp) {
  // horní široká část do y=90, pak přechod na užší nožku
  if (y < 88) return 150;
  if (y < 118) {
    const u = (y - 88) / 30;
    if (sharp) return y < 90 ? 150 : 62;      // ostrý schod
    return 150 + (62 - 150) * Easing.easeInOutCubic(u); // zaoblený přechod
  }
  return 62;
}

function Half({ x0, sharp, t }) {
  const cx = x0 + 250, yTop = 190;
  const YS = [];
  for (let y = 0; y <= 210; y += 3) YS.push(y);

  const dieD = (side) => {
    let d = 'M' + (cx + side * 180) + ' ' + yTop;
    for (const y of YS) d += ' L' + (cx + side * cavity(y, sharp)).toFixed(1) + ' ' + (yTop + y);
    d += ' L' + (cx + side * 180) + ' ' + (yTop + 210);
    d += ' L' + (cx + side * 180) + ' ' + (yTop + 262) + ' L' + (cx - side * 180) + ' ' + (yTop + 262);
    d += ' L' + (cx - side * 180) + ' ' + yTop + ' Z';
    return d;
  };
  // spodní zápustka jako jeden tvar
  let dieBottom = 'M' + (cx - 210) + ' ' + yTop;
  for (const y of YS) dieBottom += ' L' + (cx - cavity(y, sharp)).toFixed(1) + ' ' + (yTop + y);
  dieBottom += ' L' + (cx - 62) + ' ' + (yTop + 214);
  dieBottom += ' L' + (cx + 62) + ' ' + (yTop + 214);
  for (let i = YS.length - 1; i >= 0; i--) dieBottom += ' L' + (cx + cavity(YS[i], sharp)).toFixed(1) + ' ' + (yTop + YS[i]);
  dieBottom += ' L' + (cx + 210) + ' ' + yTop + ' L' + (cx + 210) + ' ' + (yTop + 250) + ' L' + (cx - 210) + ' ' + (yTop + 250) + ' Z';

  // fáze: 0–1.4 klid, 1.4–5.6 pěchování, 5.6–8 dokončení
  const prog = Easing.easeInOutCubic(clamp((t - 1.4) / 4.6, 0, 1));
  const punchY = yTop - 38 + prog * 38;

  // výška materiálu v široké části a naplnění nožky
  const fillDeep = clamp((prog - 0.12) / 0.42, 0, 1);   // střed nožky se plní nejdřív
  const fillSide = clamp((prog - 0.34) / 0.62, 0, 1);   // rohy pod hranou zaostávají
  const legC = yTop + 88 + fillDeep * 126;   // čelo proudu ve středu nožky
  const legS = yTop + 88 + (sharp ? fillSide : fillDeep) * 126;
  const legTop = legC;
  const topY = punchY + 2;                               // materiál je stále v kontaktu s beranem

  const foldP = clamp((t - 7.0) / 0.8, 0, 1) * (fillSide > 0.98 ? 1 : 0);  // přeložka až po uzavření dutiny
  const showFold = sharp && foldP > 0.02;

  // tvar materiálu
  // polotovar je jen obdélník nad dutinou; u zaoblené dutiny se rameno zaplňuje shora dolů
  const conform = clamp(prog / 0.45, 0, 1);
  const legSoff = legS - yTop;
  const cf = Math.min(88 + (sharp ? 0 : conform * 30), legSoff);
  const yEnd = Math.min(118, legSoff);
  const matW = (y) => (sharp ? (y < 89 ? 150 : 62) : (y <= cf ? cavity(y, false) : 62));
  let mat = 'M' + (cx - 150) + ' ' + topY + ' L' + (cx - 150) + ' ' + (yTop + 88);
  for (let y = 88; y <= yEnd; y += 3) mat += ' L' + (cx - matW(y)).toFixed(1) + ' ' + (yTop + y);
  mat += ' L' + (cx - 62) + ' ' + legS.toFixed(1);
  mat += ' L' + (cx - 34) + ' ' + legC.toFixed(1);
  mat += ' L' + (cx + 34) + ' ' + legC.toFixed(1);
  mat += ' L' + (cx + 62) + ' ' + legS.toFixed(1);
  for (let y = yEnd; y >= 88; y -= 3) mat += ' L' + (cx + matW(y)).toFixed(1) + ' ' + (yTop + y);
  mat += ' L' + (cx + 150) + ' ' + topY + ' Z';

  const arrowOp = fade(t, 1.9, 2.4, 5.2, 5.8);
  const voidOp = sharp ? fade(t, 2.6, 3.1, 6.8, 7.3) : 0;
  const label = sharp
    ? [{ txt: 'Kov přemostí ostrou hranu — pod ní zůstane dutina', a: 2.8, b: 3.3, c: 6.6, d: 7.1 },
       { txt: 'Dutina se uzavře, ale povrchy se už nespojí — přeložka', a: 7.2, b: 7.6, c: 8.8, d: 9.3 }]
    : [{ txt: 'Zaoblený přechod — kov teče plynule, dutina nevzniká', a: 3.4, b: 4.0, c: 8.6, d: 9.2 }];

  return (
    <g>
      <rect x={x0 + 10} y={30} width={480} height={470} rx={20}
        fill="rgba(120,150,180,0.045)" stroke="rgba(150,180,210,0.16)" strokeWidth={1.5} />
      <rect x={x0 + 10} y={30} width={480} height={46} rx={20} fill={sharp ? 'rgba(214,110,80,0.16)' : 'rgba(90,180,140,0.16)'} />
      <rect x={x0 + 10} y={56} width={480} height={20} fill={sharp ? 'rgba(214,110,80,0.16)' : 'rgba(90,180,140,0.16)'} />
      <text x={x0 + 32} y={60} fontFamily={HEAD} fontWeight="700" fontSize={20} fill="#eaf2fa">{sharp ? 'Ostrý přechod' : 'Zaoblený přechod'}</text>
      <text x={x0 + 470} y={60} textAnchor="end" fontFamily={HEAD} fontWeight="700" fontSize={15} fill={sharp ? BAD : GOOD} letterSpacing="0.06em">{sharp ? 'PŘELOŽKA' : 'V POŘÁDKU'}</text>

      {/* spodní zápustka */}
      <path d={dieBottom} fill="#39434f" stroke="#5a6570" strokeWidth={1.6} />

      {/* materiál — nikdy nesmí přetéct mimo dutinu */}
      <defs>
        <clipPath id={'cav' + x0}>
          <path d={'M' + (cx - 150) + ' ' + (yTop - 200) + ' L' + (cx - 150) + ' ' + (yTop + 87) +
            YS.filter((y) => y >= 87).map((y) => ' L' + (cx - cavity(y, sharp)).toFixed(1) + ' ' + (yTop + y)).join('') +
            ' L' + (cx - 62) + ' ' + (yTop + 214) + ' L' + (cx + 62) + ' ' + (yTop + 214) +
            YS.filter((y) => y >= 87).reverse().map((y) => ' L' + (cx + cavity(y, sharp)).toFixed(1) + ' ' + (yTop + y)).join('') +
            ' L' + (cx + 150) + ' ' + (yTop + 87) + ' L' + (cx + 150) + ' ' + (yTop - 200) + ' Z'} />
        </clipPath>
      </defs>
      <path clipPath={'url(#cav' + x0 + ')'} d={mat} fill={HOT} stroke="#8a5a10" strokeWidth={1.6} strokeLinejoin="round" opacity={0.95} />

      {/* proudové šipky */}
      <g opacity={arrowOp} stroke={sharp ? BAD : GOOD} strokeWidth={2.4} fill="none" strokeLinecap="round">
        <path d={'M' + (cx - 110) + ' ' + (yTop + 40) + ' L' + (cx - 84) + ' ' + (yTop + 96) + ' L' + (cx - 40) + ' ' + (yTop + 150)} markerEnd={sharp ? 'url(#arBad)' : 'url(#arGood)'} />
        <path d={'M' + (cx + 110) + ' ' + (yTop + 40) + ' L' + (cx + 84) + ' ' + (yTop + 96) + ' L' + (cx + 40) + ' ' + (yTop + 150)} markerEnd={sharp ? 'url(#arBad)' : 'url(#arGood)'} />
      </g>

      {/* dutina pod ostrou hranou */}
      {voidOp > 0.01 && legC > legS + 4 && (
        <g opacity={voidOp}>
          <path d={'M' + (cx - 62) + ' ' + legS.toFixed(1) + ' L' + (cx - 62) + ' ' + legC.toFixed(1) + ' L' + (cx - 34) + ' ' + legC.toFixed(1) + ' Z'}
            fill="none" stroke={BAD} strokeWidth={2} strokeDasharray="5 4" />
          <path d={'M' + (cx + 62) + ' ' + legS.toFixed(1) + ' L' + (cx + 62) + ' ' + legC.toFixed(1) + ' L' + (cx + 34) + ' ' + legC.toFixed(1) + ' Z'}
            fill="none" stroke={BAD} strokeWidth={2} strokeDasharray="5 4" />
          <line x1={cx + 70} y1={(legS + legC) / 2} x2={cx + 144} y2={(legS + legC) / 2} stroke={BAD} strokeWidth={1.2} />
          <text x={cx + 150} y={(legS + legC) / 2 + 5} fontFamily={SANS} fontSize={15} fontWeight="600" fill={BAD}>dutina</text>
        </g>
      )}

      {/* přeložka */}
      {sharp && (() => {
        const op = fade(t, 3.4, 3.9, 100, 100);
        if (op < 0.01) return null;
        const yb = Math.min(legC - 10, yTop + 204);
        const yu = yb - 62;
        const sweep = (t % 1.1) / 1.1;
        const dash = { pathLength: 100, strokeDasharray: '100 100', strokeDashoffset: 100 * (1 - sweep) };
        const head = sweep > 0.78 ? 'url(#arBad)' : undefined;
        const dL = 'M' + (cx - 14) + ' ' + (yb - 14) + ' Q' + (cx - 52) + ' ' + (yb + 6) + ' ' + (cx - 48) + ' ' + yu;
        const dR = 'M' + (cx + 14) + ' ' + (yb - 14) + ' Q' + (cx + 52) + ' ' + (yb + 6) + ' ' + (cx + 48) + ' ' + yu;
        return (
          <g opacity={op} stroke={BAD} strokeWidth={2.6} fill="none" strokeLinecap="round">
            <g opacity={0.5}>
              <path d={dL} markerEnd="url(#arBad)" />
              <path d={dR} markerEnd="url(#arBad)" />
            </g>
            <path {...dash} d={dL} markerEnd={head} />
            <path {...dash} d={dR} markerEnd={head} />
          </g>
        );
      })()}

      {showFold && (
        <g opacity={foldP}>
          <path d={'M' + (cx - 62) + ' ' + (yTop + 89) + ' L' + (cx - 34) + ' ' + (yTop + 128)} stroke={BAD} strokeWidth={3.4} strokeLinecap="round" />
          <path d={'M' + (cx + 62) + ' ' + (yTop + 89) + ' L' + (cx + 34) + ' ' + (yTop + 128)} stroke={BAD} strokeWidth={3.4} strokeLinecap="round" />
          {foldP > 0.7 && (
            <g>
              <line x1={cx + 34} y1={yTop + 128} x2={cx + 150} y2={yTop + 178} stroke={BAD} strokeWidth={1.3} />
              <text x={cx + 156} y={yTop + 182} fontFamily={SANS} fontSize={16} fontWeight="600" fill={BAD}>přeložka</text>
            </g>
          )}
        </g>
      )}

      {/* horní zápustka / beran */}
      <defs>
        <clipPath id={'tool' + x0}>
          <rect x={x0 + 10} y={80} width={480} height={420} />
        </clipPath>
      </defs>
      <g clipPath={'url(#tool' + x0 + ')'}>
        <rect x={cx - 210} y={punchY - 150} width={420} height={150} rx={6} fill="#4a5563" stroke="#6d7986" strokeWidth={1.6} />
        <rect x={cx - 152} y={punchY - 22} width={304} height={24} fill="#4a5563" stroke="#6d7986" strokeWidth={1.4} />
      </g>

      {label.map((s, i) => {
        const o = fade(t, s.a, s.b, s.c, s.d);
        if (o < 0.001) return null;
        return <text key={i} x={x0 + 250} y={478} textAnchor="middle" opacity={o} fontFamily={SANS} fontSize={17} fontWeight="500" fill="#eaf2fa">{s.txt}</text>;
      })}
    </g>
  );
}

function Scene() {
  const t = useTime();
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <svg width={1000} height={540} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <marker id="arBad" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0.4 L5.6,3 L0,5.6 Z" fill={BAD} />
          </marker>
          <marker id="arGood" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0.4 L5.6,3 L0,5.6 Z" fill={GOOD} />
          </marker>
        </defs>
        <text x={20} y={22} fontFamily={HEAD} fontWeight="700" fontSize={20} fill="#eaf2fa">Vznik přeložky v dutině zápustky</text>
        <Half x0={0} sharp={true} t={t / 1.3} />
        <Half x0={500} sharp={false} t={(t - 11.5) / 1.3} />
      </svg>
    </div>
  );
}

function Prelozka() {
  return (
    <Stage width={1000} height={540} duration={24} background="#080b12" persistKey="vady-prelozka" loop={true}>
      <Scene />
    </Stage>
  );
}
window.Prelozka = Prelozka;
