// vlakna-kovano-vs-obrabeno.jsx — split-screen animace: průběh vláken u obráběné
// hřídele (z válcované tyče) vs. zápustkově kované hřídele, včetně šíření trhliny.
// Vkládá se do stránky "Vláknitá struktura a textura". Barvy dle předlohy:
// červená = obrábění (nevhodné), zelená = kování (ideální), oranžová = trhlina.
const { Stage, useTime, Easing, interpolate, clamp } = window;

const SANS = "'IBM Plex Sans', system-ui, sans-serif";
const HEAD = "'Quicksand', system-ui, sans-serif";
const RED = '#e0655a', GREEN = '#57b98a', CRACK = '#f2913c';

// ── geometrie hřídele: poloměr r(x) podél osy (x ∈ 150..900) ─────────────────
const X0 = 150, X1 = 900, RBILLET = 158;
function rAt(x) {
  const seg = (a, b, r0, r1) => r0 + (r1 - r0) * clamp((x - a) / (b - a), 0, 1);
  if (x < 250) return 66;                 // náboj
  if (x < 300) return seg(250, 300, 66, 150);
  if (x < 382) return 150;                // příruba (osazení)
  if (x < 430) return seg(382, 430, 150, 58); // ostrý přechod → kritické místo
  if (x < 860) return 58;                 // tenká část hřídele
  if (x < 900) return seg(860, 900, 58, 34);  // sražení
  return 34;
}
const XS = [];
for (let x = X0; x <= X1; x += 5) XS.push(x);

function outlinePath(yc) {
  let d = 'M' + X0 + ' ' + (yc - rAt(X0));
  for (const x of XS) d += ' L' + x + ' ' + (yc - rAt(x)).toFixed(1);
  for (let i = XS.length - 1; i >= 0; i--) d += ' L' + XS[i] + ' ' + (yc + rAt(XS[i])).toFixed(1);
  return d + ' Z';
}
// vodorovná (obráběná) vlákna
const FIBER_YS = [];
for (let k = -11; k <= 11; k++) FIBER_YS.push(k * 13.5);
// kovaná vlákna kopírují obrys (podíl f poloměru)
const FIBER_FS = [];
for (let k = -6; k <= 6; k++) FIBER_FS.push((k / 6) * 0.92);
function forgedFiber(yc, f) {
  let d = 'M' + X0 + ' ' + (yc + f * rAt(X0)).toFixed(1);
  for (const x of XS) d += ' L' + x + ' ' + (yc + f * rAt(x)).toFixed(1);
  return d;
}

// ── trhlina: body + délka pro postupné odkrytí (stroke-dashoffset) ───────────
function crackData(yc, pts) {
  const abs = pts.map(([x, dy]) => [x, yc + dy]);
  let d = 'M' + abs[0][0] + ' ' + abs[0][1], L = 0;
  for (let i = 1; i < abs.length; i++) {
    d += ' L' + abs[i][0] + ' ' + abs[i][1];
    L += Math.hypot(abs[i][0] - abs[i - 1][0], abs[i][1] - abs[i - 1][1]);
  }
  return { d, L };
}
// obráběná: dlouhá trhlina napříč (kolmo na vodorovná vlákna → snadno prochází)
const CRACK_M = [[430, -58], [405, -33], [395, -13], [370, 12], [360, 32], [335, 57]];
// kovaná: krátká, deflektovaná (naráží kolmo na vlákna → zastaví se)
const CRACK_F = [[430, -58], [418, -46], [411, -42], [402, -35], [398, -32]];
const XMARKS = [[498, -22], [542, -66], [472, 26], [520, 46]];

function fade(t, a, b, c, d) {
  if (t <= a || t >= d) return 0;
  if (t < b) return clamp((t - a) / (b - a), 0, 1);
  if (t > c) return clamp(1 - (t - c) / (d - c), 0, 1);
  return 1;
}

function Panel({ idx, yc, yTop, kind, t }) {
  const forged = kind === 'forged';
  const col = forged ? GREEN : RED;
  const pc = 'pc' + idx, met = 'met' + idx, bc = 'bc' + idx;

  const billetOp = fade(t, 0.1, 0.6, 2.2, 2.8);
  const partOp = clamp((t - 2.7) / 0.7, 0, 1);
  const wipeW = t < 3.2 ? 0 : interpolate([3.2, 6.4], [0, X1 + 20], Easing.easeInOutCubic)(t);
  const formOp = fade(t, 2.5, 3.1, 4.4, 5.0);
  const loadOp = fade(t, 7.3, 7.9, 12.3, 12.9);
  const crackP = Easing.easeInOutCubic(clamp((t - 8.2) / 3.4, 0, 1));
  const xOp = forged ? 0 : clamp((t - 9.6) / 0.8, 0, 1);

  const crk = crackData(yc, forged ? CRACK_F : CRACK_M);

  const caps = forged ? [
    { txt: 'Válcovaný polotovar — přímá vlákna', a: 0.4, b: 1.0, c: 2.4, d: 2.9 },
    { txt: 'Kování — materiál teče a plní zápustku', a: 2.7, b: 3.2, c: 4.5, d: 5.0 },
    { txt: 'Vlákna kopírují obrys součásti', a: 4.8, b: 5.3, c: 7.9, d: 8.4 },
    { txt: 'Trhlina naráží kolmo na vlákna → zastaví se', a: 8.3, b: 8.9, c: 12.3, d: 12.8 },
    { txt: 'Maximální pevnost a houževnatost', a: 12.7, b: 13.2, c: 15, d: 15.1 },
  ] : [
    { txt: 'Válcovaný polotovar — přímá vlákna', a: 0.4, b: 1.0, c: 2.4, d: 2.9 },
    { txt: 'Obrábění ubírá materiál', a: 2.7, b: 3.2, c: 4.5, d: 5.0 },
    { txt: 'Vlákna přeříznuta obrysem součásti', a: 4.8, b: 5.3, c: 7.9, d: 8.4 },
    { txt: 'Únavová trhlina se šíří podél vláken', a: 8.3, b: 8.9, c: 12.3, d: 12.8 },
    { txt: 'Nižší pevnost v kritických místech', a: 12.7, b: 13.2, c: 15, d: 15.1 },
  ];

  return (
    <g>
      <defs>
        <clipPath id={pc}><path d={outlinePath(yc)} /></clipPath>
        <clipPath id={bc}><rect x={X0} y={yc - RBILLET} width={X1 - X0} height={RBILLET * 2} rx={22} /></clipPath>
        <linearGradient id={met} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d3dce4" />
          <stop offset="48%" stopColor="#aab6c2" />
          <stop offset="100%" stopColor="#7c8894" />
        </linearGradient>
      </defs>

      {/* panel karta + header */}
      <rect x={40} y={yTop} width={960} height={512} rx={20}
        fill="rgba(120,150,180,0.045)" stroke="rgba(150,180,210,0.16)" strokeWidth={1.5} />
      <rect x={40} y={yTop} width={960} height={50} rx={20}
        fill={forged ? 'rgba(90,180,140,0.16)' : 'rgba(214,110,80,0.16)'} />
      <rect x={40} y={yTop + 30} width={960} height={20} fill={forged ? 'rgba(90,180,140,0.16)' : 'rgba(214,110,80,0.16)'} />
      <text x={64} y={yTop + 33} fontFamily={HEAD} fontWeight="700" fontSize={22} fill="#eaf2fa">
        {forged ? '2 · Zápustkové kování' : '1 · Obrábění z válcované tyče'}
      </text>
      <text x={976} y={yTop + 33} textAnchor="end" fontFamily={HEAD} fontWeight="700" fontSize={17}
        fill={col} letterSpacing="0.06em">{forged ? 'IDEÁLNÍ STAV' : 'NEVHODNÉ'}</text>

      {/* polotovar (válcovaná tyč) */}
      <g opacity={billetOp}>
        <rect x={X0} y={yc - RBILLET} width={X1 - X0} height={RBILLET * 2} rx={22}
          fill="url(#{met})" style={{ fill: 'url(#' + met + ')' }} stroke="#5a6570" strokeWidth={1.5} />
        <g clipPath={'url(#' + bc + ')'}>
          {FIBER_YS.map((dy, i) => (
            <line key={i} x1={X0} y1={yc + dy} x2={X1} y2={yc + dy} stroke={RED} strokeWidth={1.8} opacity={0.75} />
          ))}
        </g>
      </g>

      {/* hotová součást */}
      <g opacity={partOp}>
        {/* obráběná: obálka polotovaru (odebraný materiál) */}
        {!forged && (
          <rect x={X0} y={yc - RBILLET} width={X1 - X0} height={RBILLET * 2} rx={22}
            fill="none" stroke="rgba(150,180,210,0.3)" strokeWidth={1.4} strokeDasharray="7 7" opacity={0.6} />
        )}
        <path d={outlinePath(yc)} fill={'url(#' + met + ')'} stroke="#5a6570" strokeWidth={2} strokeLinejoin="round" />

        {/* vlákna, odkrývaná zleva doprava (wipe) */}
        <g clipPath={'url(#' + pc + ')'}>
          <g style={{ clipPath: 'inset(0 ' + (X1 + 20 - wipeW) + 'px 0 0)' }}>
            {forged
              ? FIBER_FS.map((f, i) => (
                  <path key={i} d={forgedFiber(yc, f)} fill="none" stroke={GREEN} strokeWidth={2.6} opacity={0.9} strokeLinecap="round" />
                ))
              : FIBER_YS.map((dy, i) => (
                  <line key={i} x1={X0} y1={yc + dy} x2={X1} y2={yc + dy} stroke={RED} strokeWidth={2} opacity={0.82} />
                ))}
          </g>
        </g>

        {/* osa */}
        <line x1={X0 - 10} y1={yc} x2={X1 + 14} y2={yc} stroke="rgba(150,180,210,0.35)" strokeWidth={1.2} strokeDasharray="14 6 3 6" />

        {/* zatížení v kritickém místě (osazení) */}
        <g opacity={loadOp}>
          <line x1={438} y1={yc - RBILLET + 30} x2={438} y2={yc - 62} stroke={CRACK} strokeWidth={2.4} markerEnd="url(#ld)" />
          <text x={438} y={yc - RBILLET + 18} textAnchor="middle" fontFamily={SANS} fontSize={16} fill={CRACK}>zatížení</text>
        </g>

        {/* trhlina */}
        <path d={crk.d} fill="none" stroke={CRACK} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={crk.L} strokeDashoffset={crk.L * (1 - crackP)} />
        {/* deflekce u kované: šipka podél vlákna */}
        {forged && crackP > 0.85 && (
          <g>
            <line x1={398} y1={yc - 34} x2={470} y2={yc - 100} stroke={GREEN} strokeWidth={1.4} opacity={0.7} />
            <text x={474} y={yc - 104} fontFamily={SANS} fontSize={17} fontWeight="600" fill={GREEN}>trhlina se zastaví o vlákna</text>
          </g>
        )}
        {/* křížky slabých míst u obráběné */}
        {XMARKS.map(([x, dy], i) => (
          <text key={i} x={x} y={yc + dy} textAnchor="middle" dominantBaseline="middle"
            fontFamily={SANS} fontWeight="700" fontSize={19} fill={RED} opacity={xOp}>✕</text>
        ))}
      </g>

      {/* forming cue */}
      {!forged && (
        <g opacity={formOp}>
          <polygon points={(interpolate([2.7, 4.4], [300, 780])(t)) + ',' + (yc - rAt(clamp(interpolate([2.7, 4.4], [300, 780])(t), X0, X1)) - 6) + ' ' +
            (interpolate([2.7, 4.4], [300, 780])(t) + 22) + ',' + (yc - rAt(clamp(interpolate([2.7, 4.4], [300, 780])(t), X0, X1)) - 40) + ' ' +
            (interpolate([2.7, 4.4], [300, 780])(t) - 22) + ',' + (yc - rAt(clamp(interpolate([2.7, 4.4], [300, 780])(t), X0, X1)) - 40)}
            fill="#f0a94a" stroke="#8a5a10" strokeWidth={1.5} />
        </g>
      )}
      {forged && (
        <g opacity={formOp}>
          <line x1={575} y1={yc - RBILLET - 30} x2={575} y2={yc - 156} stroke={GREEN} strokeWidth={3} markerEnd="url(#dieG)" />
          <line x1={575} y1={yc + RBILLET + 30} x2={575} y2={yc + 156} stroke={GREEN} strokeWidth={3} markerEnd="url(#dieG)" />
        </g>
      )}

      {/* popisek fáze */}
      {caps.map((s, i) => {
        const o = fade(t, s.a, s.b, s.c, s.d);
        if (o < 0.001) return null;
        return (
          <text key={i} x={520} y={yTop + 486} textAnchor="middle" opacity={o}
            fontFamily={SANS} fontSize={22} fontWeight="500" fill="#eaf2fa">{s.txt}</text>
        );
      })}
    </g>
  );
}

function Scene() {
  const t = useTime();
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', inset: 0,
        background: 'radial-gradient(120% 80% at 50% 40%, rgba(30,52,80,0.4) 0%, rgba(9,13,20,0) 62%)' }} />
      <svg width={1040} height={1240} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <marker id="ld" markerWidth="10" markerHeight="10" refX="5" refY="8" orient="auto">
            <path d="M0,0 L10,0 L5,9 Z" fill={CRACK} />
          </marker>
          <marker id="dieG" markerWidth="10" markerHeight="10" refX="5" refY="8" orient="auto">
            <path d="M0,0 L10,0 L5,9 Z" fill={GREEN} />
          </marker>
        </defs>

        {/* titulek */}
        <text x={40} y={40} fontFamily={HEAD} fontWeight="700" fontSize={26} fill="#eaf2fa">Průběh vláken: obráběno vs. kováno</text>

        <Panel idx="A" yc={356} yTop={74} kind="machined" t={Math.min(t, 15)} />
        <Panel idx="B" yc={932} yTop={650} kind="forged" t={t - 15} />
      </svg>
    </div>
  );
}

function VlaknaKovanoObrabeno() {
  return (
    <Stage width={1040} height={1240} duration={30} background="#080b12" persistKey="vlakna-kovano-obrabeno" loop={false}>
      <Scene />
    </Stage>
  );
}

window.VlaknaKovanoObrabeno = VlaknaKovanoObrabeno;
