// zapustkove-kovani.jsx — Zápustkové kování ojnice, řez A–A (dělicí rovina vodorovná).
// Horní zápustka je tuhý blok a klesá SPOLU s tvářecí silou (beran). Klíny (trny) v obou
// dílech jsou od začátku součástí zápustky a vytvářejí v otvorech ojnice BLÁNU. Do dutiny
// je vložen dlouhý plochý polotovar o výšce rozevření zápustky; po stlačení se kov roztéká,
// obtéká klíny (blána) a přebytek jde do výronku. Přepínač: ZAP = úzký můstek (protitlak,
// dolití rohů, souvislý výronek). VYP = široký "most" — část kovu do něj snadno odteče,
// tlak nenaroste a rohy oka zůstanou nedolité; kov se nikde neodděluje (stále tváření).
const { Stage, useTime, Easing, interpolate, clamp } = window;

const SANS = "'IBM Plex Sans', system-ui, sans-serif";
const HEAD = "'Quicksand', system-ui, sans-serif";
const MONO = "'IBM Plex Mono', ui-monospace, monospace";

// ── geometrie ────────────────────────────────────────────────────────────────
const W = 1040, H = 560;
const yc = 278;                       // dělicí rovina
const xL = 46, xR = 978;              // okraje bloku zápustky
const topY = 120, botY = 436;         // horní / dolní hrana bloků

const rodL = 190, rodR = 852;         // cípy ojnice u dělicí roviny
const cxB = 320, cxS = 728;           // střed velkého / malého oka
const cxMid = (xL + xR) / 2;

// otvory (bore) + blána
const bwB = 48, bwS = 34;             // poloviční šířka blány (otvoru)
const blana = 8;                      // poloviční tloušťka blány
const eyeHB = 60, eyeHS = 52;         // poloviční výška oka (= licí plocha)
const draft = 8, chf = 6, fil = 8;    // úkos, chamfer 45°, rádius (zaoblené přechody)

// výronkový kanál (dělicí rovina): ZAP otevřená drážka pro lis; VYP široký "most"
const mbLen = 48, mbH = 5, gutH = 22;
const xEdgeL = xL, xEdgeR = xR;   // otevřená drážka až po okraj zápustky
const mostLen = 120, mostH = 18;

function capsule(x, cx, halfLen, halfH) {
  const d = Math.abs(x - cx);
  if (d <= halfLen) return halfH;
  const dd = d - halfLen;
  return dd < halfH ? Math.sqrt(halfH * halfH - dd * dd) : 0;
}
// poloviční výška obrysu ojnice (plochý profil: velké oko + dřík + malé oko)
function hp(x) {
  return Math.max(
    capsule(x, cxB, 70, 60),   // velké oko
    capsule(x, 521, 290, 38),  // dřík (flanges)
    capsule(x, cxS, 72, 52)    // malé oko
  );
}

const XS = [];
for (let x = rodL; x <= rodR; x += 5) XS.push(x);
if (XS[XS.length - 1] !== rodR) XS.push(rodR);

// poloviny obrysu — horní se hýbe s horní zápustkou, dolní je pevná
function outlineHalf(sign) {
  let d = 'M' + rodL.toFixed(1) + ' ' + yc.toFixed(1);
  for (const x of XS) d += ' L' + x.toFixed(1) + ' ' + (yc + sign * hp(x)).toFixed(1);
  d += ' L' + rodR.toFixed(1) + ' ' + yc.toFixed(1) + ' Z';
  return d;
}
const OUT_UP = outlineHalf(-1), OUT_LO = outlineHalf(1);

function outlinePath() {
  let d = 'M' + rodL.toFixed(1) + ' ' + yc.toFixed(1);
  for (const x of XS) d += ' L' + x.toFixed(1) + ' ' + (yc - hp(x)).toFixed(1);
  d += ' L' + rodR.toFixed(1) + ' ' + yc.toFixed(1);
  for (let i = XS.length - 1; i >= 0; i--) d += ' L' + XS[i].toFixed(1) + ' ' + (yc + hp(XS[i])).toFixed(1);
  return d + ' Z';
}
const OUTLINE = outlinePath();

function rrect(x0, y0, x1, y1, r) {
  return 'M' + (x0 + r) + ' ' + y0 + ' L' + (x1 - r) + ' ' + y0 + ' Q' + x1 + ' ' + y0 + ' ' + x1 + ' ' + (y0 + r) +
    ' L' + x1 + ' ' + (y1 - r) + ' Q' + x1 + ' ' + y1 + ' ' + (x1 - r) + ' ' + y1 +
    ' L' + (x0 + r) + ' ' + y1 + ' Q' + x0 + ' ' + y1 + ' ' + x0 + ' ' + (y1 - r) +
    ' L' + x0 + ' ' + (y0 + r) + ' Q' + x0 + ' ' + y0 + ' ' + (x0 + r) + ' ' + y0 + ' Z';
}
// klín (trn) tvořící otvor + blánu: širší u licí plochy, úkos, chamfer u ústí, rádius u blány.
function borePocket(cx, bw, yOuter, yInner) {
  const owl = cx - (bw + draft), owr = cx + (bw + draft);
  const inl = cx - bw, inr = cx + bw;
  const dir = yInner > yOuter ? 1 : -1;
  return 'M' + (owl + chf) + ' ' + yOuter + ' L' + (owr - chf) + ' ' + yOuter +
    ' Q' + owr + ' ' + yOuter + ' ' + owr + ' ' + (yOuter + dir * chf) +
    ' L' + inr + ' ' + (yInner - dir * fil) + ' Q' + inr + ' ' + yInner + ' ' + (inr - fil) + ' ' + yInner +
    ' L' + (inl + fil) + ' ' + yInner + ' Q' + inl + ' ' + yInner + ' ' + inl + ' ' + (yInner - dir * fil) +
    ' L' + owl + ' ' + (yOuter + dir * chf) +
    ' Q' + owl + ' ' + yOuter + ' ' + (owl + chf) + ' ' + yOuter + ' Z';
}
const boreBT = borePocket(cxB, bwB, yc - eyeHB, yc - blana);   // horní klín, velké oko
const boreBB = borePocket(cxB, bwB, yc + eyeHB, yc + blana);   // dolní klín, velké oko
const boreST = borePocket(cxS, bwS, yc - eyeHS, yc - blana);   // horní klín, malé oko
const boreSB = borePocket(cxS, bwS, yc + eyeHS, yc + blana);   // dolní klín, malé oko
const CAVITY = OUTLINE + ' ' + boreBT + ' ' + boreBB + ' ' + boreST + ' ' + boreSB;
const CAV_UP = OUT_UP + ' ' + boreBT + ' ' + boreST;
const CAV_LO = OUT_LO + ' ' + boreBB + ' ' + boreSB;

function channelGroove(side) {  // otevřená výronková drážka pro lis (můstek → ústí u hrany)
  const s = side, tip = s < 0 ? rodL : rodR;
  const x1 = tip + s * mbLen;              // konec můstku
  const xe = s < 0 ? xEdgeL : xEdgeR;      // otevřené ústí u hrany zápustky
  const r = 7 * s;
  return 'M' + tip + ' ' + (yc - mbH) +
    ' L' + (x1 - r) + ' ' + (yc - mbH) + ' Q' + x1 + ' ' + (yc - mbH) + ' ' + x1 + ' ' + (yc - mbH - 7) +
    ' L' + x1 + ' ' + (yc - gutH + 7) + ' Q' + x1 + ' ' + (yc - gutH) + ' ' + (x1 + r) + ' ' + (yc - gutH) +
    ' L' + xe + ' ' + (yc - gutH) +
    ' L' + xe + ' ' + (yc + gutH) +
    ' L' + (x1 + r) + ' ' + (yc + gutH) + ' Q' + x1 + ' ' + (yc + gutH) + ' ' + x1 + ' ' + (yc + gutH - 7) +
    ' L' + x1 + ' ' + (yc + mbH + 7) + ' Q' + x1 + ' ' + (yc + mbH) + ' ' + (x1 - r) + ' ' + (yc + mbH) +
    ' L' + tip + ' ' + (yc + mbH) + ' Z';
}
function channelMost(side) {   // široký "most" — otevřený přechod bez můstku
  const s = side, tip = s < 0 ? rodL : rodR;
  const x2 = tip + s * mostLen, r = 8 * s;
  return 'M' + tip + ' ' + (yc - mostH) + ' L' + (x2 - r) + ' ' + (yc - mostH) +
    ' Q' + x2 + ' ' + (yc - mostH) + ' ' + x2 + ' ' + (yc - mostH + 8) +
    ' L' + x2 + ' ' + (yc + mostH - 8) + ' Q' + x2 + ' ' + (yc + mostH) + ' ' + (x2 - r) + ' ' + (yc + mostH) +
    ' L' + tip + ' ' + (yc + mostH) + ' Z';
}
const CHG_L = channelGroove(-1), CHG_R = channelGroove(1);
const CHM_L = channelMost(-1), CHM_R = channelMost(1);

function fade(t, a, b, c, d) {
  if (t <= a || t >= d) return 0;
  if (t < b) return clamp((t - a) / (b - a), 0, 1);
  if (t > c) return clamp(1 - (t - c) / (d - c), 0, 1);
  return 1;
}

const DIE_TOP = '#454e58', DIE_BOT = '#2b323b', DIE_EDGE = '#5c6773';
const VOID = '#0a0d13';
const M_MID = '#f0932b', M_EDGE = '#b4470f';
const KLIN = '#3b444f', KLIN_HI = '#8fa0b3';

function Scene() {
  const t = useTime();
  const [groove, setGroove] = React.useState(true);

  // horní zápustka + beran klesají jako jeden tuhý celek se silou; v dolní úvrati zůstanou
  const openGap = 92;
  const ramY = interpolate([0, 0.5, 2.4], [-openGap, -openGap, 0], Easing.easeInOutCubic)(t);
  const ramT = 'translate(0 ' + ramY.toFixed(2) + ')';

  // polotovar: dlouhý plochý obdélník ~80 % šířky zápustky, výška = rozevření.
  // Tváří se OD OKAMŽIKU, kdy zápustka začne klesat: stlačuje se (výška = gap)
  // a zároveň se rozšiřuje (zachování objemu), pak plynule přechází v kov v dutině.
  const halfBW = 0.5 * 0.64 * (xR - xL);
  const gap = Math.max(0.2, -ramY);
  const halfBWd = Math.min(cxMid - rodL, halfBW * Math.sqrt(openGap / Math.max(gap, 6)));
  const slugL = cxMid - halfBWd, slugR = cxMid + halfBWd;
  const billetOn = fade(t, 0.0, 0.25, 0.9, 1.5);

  // stlačení: kov se roztéká svisle do ok už během sjíždění zápustky (obtéká klíny → blána)
  const bandFull = groove ? 62 : 47;
  const bandHalf = interpolate([0.9, 2.4, 7.5], [gap / 2 + 4, 38, bandFull], Easing.easeInOutCubic)(t);
  const metalOn = fade(t, 0.9, 1.4, 20, 21);

  // výronek / most — narůstá ven; VYP dřív a jen částečně (bez protitlaku)
  const chH = groove ? gutH : mostH;
  const grooveLen = xEdgeR - rodR;
  const fStart = groove ? 4.6 : 3.4;
  const fEnd = groove ? 9.2 : 6.8;
  const fExt = clamp((t - fStart) / (fEnd - fStart), 0, 1);
  const reach = (groove ? grooveLen : 0.5 * mostLen) * fExt;
  const revL = rodL - reach, revR = rodR + reach;
  const CH_L = groove ? CHG_L : CHM_L;
  const CH_R = groove ? CHG_R : CHM_R;

  const cornersOn = groove ? fade(t, 6.8, 7.5, 13.4, 14.2) : 0;
  const defectOn = groove ? 0 : fade(t, 6.0, 6.8, 13.6, 14.4);
  const flowOn = fade(t, 2.4, 3.0, 7.0, 7.8);
  const ramOn = fade(t, 0.3, 0.9, 20, 21);
  const blanaOn = fade(t, 3.2, 4.0, 20, 21);
  const klinOn = fade(t, 0.0, 0.35, 20, 21);

  const caps = [
    { txt: 'Dlouhý plochý polotovar (výška = rozevření) vložen do zápustky', a: 0.2, b: 0.9, c: 1.9, d: 2.5, both: true },
    { txt: 'Horní zápustka klesá se silou → polotovar se stlačuje', a: 1.0, b: 1.6, c: 2.4, d: 3.0, both: true },
    { txt: 'Kov se roztéká, obtéká klíny → v otvorech vzniká blána', a: 2.2, b: 2.8, c: 4.8, d: 5.4, both: true },
    { txt: 'Úzký můstek brzdí únik → protitlak dotlačí kov do rohů oka', a: 6.9, b: 7.5, c: 9.2, d: 9.8, groove: true },
    { txt: 'Dutina úplně vyplněna — po obvodu dělicí roviny souvislý výronek', a: 9.6, b: 10.2, c: 14.4, d: 15.0, groove: true },
    { txt: 'Široký most odvede část kovu bez odporu → tlak nenaroste', a: 4.0, b: 4.6, c: 6.6, d: 7.2, nogroove: true },
    { txt: 'Rohy oka zůstávají nedolité (kov se nikde neodděluje)', a: 7.2, b: 7.8, c: 14.4, d: 15.0, nogroove: true },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 85% at 50% 46%, rgba(58,40,22,0.32) 0%, rgba(9,13,20,0) 62%)' }} />

      <div style={{ position: 'absolute', left: 40, top: 26 }}>
        <div style={{ fontFamily: HEAD, fontSize: 29, fontWeight: 700, color: '#eaf2fa', letterSpacing: '-0.01em' }}>Schéma kování ojnice</div>
      </div>

      <button onClick={() => setGroove(g => !g)}
        style={{ position: 'absolute', right: 30, top: 28, display: 'flex', alignItems: 'center', gap: 10, padding: '9px 15px', borderRadius: 999, cursor: 'pointer',
          background: groove ? 'rgba(230,169,74,0.14)' : 'rgba(214,80,60,0.14)', border: '1px solid ' + (groove ? 'rgba(230,169,74,0.5)' : 'rgba(214,80,60,0.5)'),
          fontFamily: SANS, fontSize: 13.5, fontWeight: 600, color: '#eaf2fa' }}>
        <span style={{ width: 34, height: 18, borderRadius: 999, background: groove ? '#e6a94a' : 'rgba(255,255,255,0.14)', position: 'relative', transition: 'background .2s' }}>
          <span style={{ position: 'absolute', top: 2, left: groove ? 18 : 2, width: 14, height: 14, borderRadius: 999, background: '#12161d', transition: 'left .2s' }} />
        </span>
        Výronková drážka: {groove ? 'ZAP' : 'VYP'}
      </button>

      <svg width={W} height={H} viewBox={'0 0 ' + W + ' ' + H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <defs>
          <linearGradient id="dieTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#525c67" /><stop offset="1" stopColor={DIE_TOP} /></linearGradient>
          <linearGradient id="dieBot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={DIE_BOT} /><stop offset="1" stopColor="#20262d" /></linearGradient>
          <linearGradient id="klin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4a5461" /><stop offset="1" stopColor={KLIN} /></linearGradient>
          <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe08a" /><stop offset="0.5" stopColor="#f7c948" /><stop offset="1" stopColor={M_MID} /></linearGradient>
          <pattern id="dots" width="13" height="13" patternUnits="userSpaceOnUse"><rect width="13" height="13" fill="none" /><circle cx="3" cy="3" r="1.5" fill="#2a3340" /></pattern>
          <clipPath id="cav" clipRule="evenodd"><path d={CAVITY} clipRule="evenodd" /></clipPath>
          <clipPath id="chL"><rect x={revL} y={yc - chH - 2} width={Math.max(0, rodL - revL) + 3} height={2 * chH + 4} /></clipPath>
          <clipPath id="chR"><rect x={rodR - 3} y={yc - chH - 2} width={Math.max(0, revR - rodR) + 3} height={2 * chH + 4} /></clipPath>
          <marker id="ar" markerWidth="9" markerHeight="9" refX="4" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#e6a94a" /></marker>
          <marker id="arw" markerWidth="9" markerHeight="9" refX="4" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#9fb2c4" /></marker>
        </defs>

        {/* dolní zápustka (pevná) */}
        <rect x={xL} y={yc} width={xR - xL} height={botY - yc} rx={10} fill="url(#dieBot)" stroke={DIE_EDGE} strokeWidth={1.5} />

        {/* horní zápustka + beran — klesá SPOLU s tvářecí silou */}
        <g transform={ramT}>
          <rect x={xL} y={topY} width={xR - xL} height={yc - topY} rx={10} fill="url(#dieTop)" stroke={DIE_EDGE} strokeWidth={1.5} />
          <rect x={392} y={topY - 40} width={452} height={28} rx={5} fill="#1b2027" stroke="#39424d" strokeWidth={1.4} />
          {[470, 560, 660, 770].map((x, i) => (
            <line key={i} x1={x} y1={topY - 10} x2={x} y2={topY - 3} stroke="#6c7a88" strokeWidth={2} markerEnd="url(#arw)" opacity={ramOn} />
          ))}
          <text x={418} y={topY - 22} fontFamily={MONO} fontSize={12.5} fill="#9fb2c4" letterSpacing="0.18em">LIS · TVÁŘECÍ SÍLA</text>
        </g>

        {/* dutina — dolní část pevná, horní klesá se zápustkou */}
        <path d={OUT_LO} fill={VOID} />
        <path d={OUT_UP} fill={VOID} transform={ramT} />
        <path d={CAV_LO} fillRule="evenodd" fill="url(#dots)" />
        <path d={CAV_UP} fillRule="evenodd" fill="url(#dots)" transform={ramT} />

        {/* kanál / most (dělicí rovina) */}
        <path d={CH_L} fill={VOID} />
        <path d={CH_R} fill={VOID} />

        {/* polotovar mezi rozevřenými zápustkami */}
        <g opacity={billetOn}>
          <path d={rrect(slugL, yc - gap, slugR, yc, Math.max(0.5, Math.min(18, gap / 2)))} fill="url(#metal)" stroke="#ffdd7a" strokeWidth={2} />
        </g>

        {/* kov v dutině — stlačením se roztéká svisle, obtéká klíny (blána zůstává) */}
        <g clipPath="url(#cav)" opacity={metalOn}>
          <rect x={xL} y={yc - bandHalf} width={xR - xL} height={2 * bandHalf} fill="url(#metal)" />
        </g>

        {/* výronek / most — kov protéká do kanálu (stále spojený s tělesem) */}
        <g clipPath="url(#chL)"><path d={CH_L} fill="url(#metal)" stroke={M_EDGE} strokeWidth={1.2} /></g>
        <g clipPath="url(#chR)"><path d={CH_R} fill="url(#metal)" stroke={M_EDGE} strokeWidth={1.2} /></g>

        {/* KLÍNY — od začátku součást zápustky, vytvářejí blánu; horní klesají se silou */}
        <g opacity={klinOn}>
          <path d={boreBB} fill="url(#klin)" stroke={KLIN_HI} strokeWidth={1.4} />
          <path d={boreSB} fill="url(#klin)" stroke={KLIN_HI} strokeWidth={1.4} />
        </g>
        <g opacity={klinOn} transform={ramT}>
          <path d={boreBT} fill="url(#klin)" stroke={KLIN_HI} strokeWidth={1.4} />
          <path d={boreST} fill="url(#klin)" stroke={KLIN_HI} strokeWidth={1.4} />
        </g>

        {/* strojní hrany */}
        <path d={CAV_LO} fillRule="evenodd" fill="none" stroke="#161c24" strokeWidth={2.2} />
        <path d={CAV_UP} fillRule="evenodd" fill="none" stroke="#161c24" strokeWidth={2.2} transform={ramT} />
        <path d={CH_L} fill="none" stroke="#161c24" strokeWidth={1.5} />
        <path d={CH_R} fill="none" stroke="#161c24" strokeWidth={1.5} />

        {/* dělicí rovina */}
        <line x1={xL} y1={yc} x2={xR} y2={yc} stroke="#5fc0ef" strokeWidth={1.4} strokeDasharray="9 7" opacity={0.72} />
        <text x={xL + 8} y={yc - 8} fontFamily={MONO} fontSize={12} fill="#5fc0ef" opacity={0.85}>dělicí rovina</text>

        {/* klín popisek */}
        <g opacity={klinOn * 0.9}>
          <text x={cxB} y={topY - 6} textAnchor="middle" fontFamily={MONO} fontSize={11.5} fill={KLIN_HI}>klín zápustky → blána</text>
        </g>

        {/* blána v otvorech */}
        <g opacity={blanaOn}>
          {[cxB, cxS].map((cx, i) => (
            <g key={i}>
              <line x1={cx} y1={yc} x2={cx} y2={botY + 20} stroke="#7be0a0" strokeWidth={1.4} strokeDasharray="3 3" />
              <circle cx={cx} cy={yc} r={4} fill="none" stroke="#7be0a0" strokeWidth={1.6} />
            </g>
          ))}
          <text x={cxB} y={botY + 34} textAnchor="middle" fontFamily={SANS} fontSize={13} fontWeight={600} fill="#7be0a0">blána (v otvoru zůstává)</text>
          <text x={cxS} y={botY + 34} textAnchor="middle" fontFamily={SANS} fontSize={13} fontWeight={600} fill="#7be0a0">blána</text>
        </g>

        {/* šipky toku materiálu */}
        <g opacity={flowOn}>
          <line x1={rodL + 12} y1={yc} x2={rodL - 40} y2={yc} stroke="#e6a94a" strokeWidth={2.4} markerEnd="url(#ar)" />
          <line x1={rodR - 12} y1={yc} x2={rodR + 40} y2={yc} stroke="#e6a94a" strokeWidth={2.4} markerEnd="url(#ar)" />
        </g>

        {/* protitlak — rohy dolity (s drážkou) */}
        <g opacity={cornersOn}>
          {[[cxB - 48, yc - 46], [cxB - 48, yc + 46], [cxS + 48, yc - 42], [cxS + 48, yc + 42]].map((p, i) => (
            <circle key={i} cx={p[0]} cy={p[1]} r={11} fill="none" stroke="#7be0a0" strokeWidth={2.2} />
          ))}
        </g>

        {/* nedolití rohů (bez drážky) — anotace, kov je stále spojitý */}
        <g opacity={defectOn}>
          {[[cxB - 48, yc - 46], [cxB - 48, yc + 46], [cxS + 48, yc - 42], [cxS + 48, yc + 42]].map((p, i) => (
            <circle key={i} cx={p[0]} cy={p[1]} r={12} fill="none" stroke="#ff6b57" strokeWidth={2.2} strokeDasharray="4 4" />
          ))}
        </g>

        {/* popisky kanálu */}
        {groove ? (
          <g fontFamily={MONO} fontSize={11.5} fill="#8ea2b6" opacity={0.9}>
            <text x={rodR + mbLen / 2} y={yc - gutH - 8} textAnchor="middle">můstek</text>
            <text x={xEdgeR - 6} y={yc - gutH - 24} textAnchor="end">otevřená drážka (lis)</text>
          </g>
        ) : (
          <g fontFamily={MONO} fontSize={11.5} fill="#ff9b7a" opacity={0.95}>
            <text x={rodR + mostLen / 2} y={yc - mostH - 8} textAnchor="middle">široký „most“ — bez odporu</text>
          </g>
        )}

        {/* popisky fází */}
        {caps.map((s2, i) => {
          if (s2.groove && !groove) return null;
          if (s2.nogroove && groove) return null;
          const o = fade(t, s2.a, s2.b, s2.c, s2.d);
          if (o < 0.001) return null;
          return <text key={i} x={W / 2} y={H - 54} textAnchor="middle" opacity={o} fontFamily={SANS} fontSize={19} fontWeight={500} fill="#eaf2fa">{s2.txt}</text>;
        })}
      </svg>
    </div>
  );
}

function ZapustkoveKovani() {
  return (
    <Stage width={W} height={H} duration={15} background="#080b12" persistKey="zapustkove-kovani" loop={true}>
      <Scene />
    </Stage>
  );
}

window.ZapustkoveKovani = ZapustkoveKovani;
