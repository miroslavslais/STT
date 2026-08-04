// kovaci-teploty-diagram.jsx — interaktivní diagram kovacích teplot ocelí
// odvozeno z fe-fe3c-diagram.jsx (tvary křivek A3/Acm), pásmo kovacích teplot podle schématu (A3/Acm +50 až +200 °C).
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
const C_P = 0.018, C_S = 0.77, C_E = 2.14;
const T_A1 = 727, T_G = 911, T_EUT = 1147, T_MIN = 600, T_MAX = 1400;

function a3(x) { const t = clamp(x / C_S, 0, 1); return T_A1 + (T_G - T_A1) * Math.pow(clamp(1 - t, 0, 1), 1.4); }
function acm(x) { const t = clamp((x - C_S) / (C_E - C_S), 0, 1); return T_A1 + (T_EUT - T_A1) * Math.pow(t, 1.15); }
function boundaryLine(x) { return x <= C_S ? a3(x) : acm(x); }
const C_CUTOFF = 1.9; // kovací pásmo se schématicky nekreslí až k bodu E
// horní mez: schématicky sleduje solidus (klesá s rostoucím %C, ~150 °C pod ním)
function upperLimit(x) { const xc = clamp(x, 0, C_CUTOFF); return 1300 - 90 * xc; }
// dolní mez: pro podeutektoidní oceli A3 + 50 °C, pro nadeutektoidní nad A1 (A1 + 50 °C) — nekopíruje Acm!
function lowerLimit(x) { return x <= C_S ? a3(x) + 50 : T_A1 + 50; }
function liquidusHint(x) { return T_EUT + Math.pow(C_E - x, 1.15) * 150; } // dekorativní náznak likvidu, vychází z bodu E

function sampX(fn, x0, x1, n) { const p = []; for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n; p.push([x, fn(x)]); } return p; }
const A3_PTS = sampX(a3, 0, C_S, 80);
const ACM_PTS = sampX(acm, C_S, C_E, 60);
const UPPER_PTS = sampX(upperLimit, 0.05, C_CUTOFF, 60);
const LOWER_PTS = sampX(lowerLimit, 0.05, C_CUTOFF, 60);
const LIQ_PTS = sampX(liquidusHint, C_E, 0.35, 30);

// ── krychlová (kubická) mřížka — izometrická skica, BCC vs FCC ─────────────
function CubeLattice({ size = 72, active, kind, color }) {
  const FBL = [16, 50], FBR = [48, 50], FTL = [16, 18], FTR = [48, 18];
  const BBL = [30, 36], BBR = [62, 36], BTL = [30, 4], BTR = [62, 4];
  const edges = [
    [FBL, FBR], [FBR, FTR], [FTR, FTL], [FTL, FBL],
    [BBL, BBR], [BBR, BTR], [BTR, BTL], [BTL, BBL],
    [FBL, BBL], [FBR, BBR], [FTL, BTL], [FTR, BTR],
  ];
  const corners = [FBL, FBR, FTL, FTR, BBL, BBR, BTL, BTR];
  const center = [(FBL[0] + BTR[0]) / 2, (FBL[1] + BTR[1]) / 2];
  const frontFaceCenter = [(FBL[0] + FTR[0]) / 2, (FBL[1] + FTR[1]) / 2];
  const topFaceCenter = [(FTL[0] + BTR[0]) / 2, (FTL[1] + BTR[1]) / 2];
  const rightFaceCenter = [(FBR[0] + BTR[0]) / 2, (FBR[1] + BTR[1]) / 2];
  return (<svg width={size} height={size} viewBox="0 0 78 60" style={{ opacity: active ? 1 : 0.3, transition: 'opacity .2s' }}>
    <g style={{ animation: active ? 'spinSlow 8s linear infinite' : 'none', transformOrigin: '39px 27px' }}>
      {edges.map((e, i) => <line key={i} x1={e[0][0]} y1={e[0][1]} x2={e[1][0]} y2={e[1][1]} stroke={color} strokeWidth="1.4" />)}
      {corners.map((c, i) => <circle key={i} cx={c[0]} cy={c[1]} r="3" fill={color} />)}
      {kind === 'bcc' && <circle cx={center[0]} cy={center[1]} r="4" fill={color} opacity="0.9" />}
      {kind === 'fcc' && [frontFaceCenter, topFaceCenter, rightFaceCenter].map((p, i) => <circle key={'f' + i} cx={p[0]} cy={p[1]} r="3.4" fill={color} opacity="0.85" />)}
    </g>
  </svg>);
}

function KovaciTeplotyDiagram() {
  const mono = "'IBM Plex Mono', monospace";
  const sans = "'IBM Plex Sans', sans-serif";
  const [C, setC] = React.useState(0.45);
  const [T, setT] = React.useState(1000);

  const W = 660, H = 440, x0 = 68, x1 = 615, y0 = 26, y1 = 350;
  const xPix = (c) => x0 + (c / 2.3) * (x1 - x0);
  const yPix = (t) => y1 - ((t - T_MIN) / (T_MAX - T_MIN)) * (y1 - y0);
  const dPath = (pts) => 'M' + pts.map(([c, t]) => `${xPix(c).toFixed(1)},${yPix(t).toFixed(1)}`).join(' L');
  const areaPath = (top, bot) => dPath(top) + ' L' + bot.slice().reverse().map(([c, t]) => `${xPix(c).toFixed(1)},${yPix(t).toFixed(1)}`).join(' L') + ' Z';

  const boundary = boundaryLine(C);
  const upper = upperLimit(Math.min(C, C_CUTOFF));
  const lower = lowerLimit(C);
  const isAustenite = T > boundary;
  const isFerritePearlite = T <= T_A1;
  const isMixed = !isAustenite && !isFerritePearlite;
  const hypereutectoid = C > C_S;

  let verdict, verdictColor;
  if (C > C_CUTOFF) { verdict = 'Mimo schématické pásmo (vysoký %C)'; verdictColor = '#8296a8'; }
  else if (T > upper) { verdict = 'Příliš horké — riziko přehřátí / spálení'; verdictColor = 'oklch(0.65 0.2 25)'; }
  else if (T < lower) { verdict = 'Příliš studené — mimo teplotní interval tváření'; verdictColor = 'oklch(0.7 0.15 230)'; }
  else { verdict = 'V teplotním intervalu tváření'; verdictColor = 'oklch(0.72 0.16 60)'; }

  let phase, phaseColor;
  if (isAustenite) { phase = 'Austenit — mřížka FCC'; phaseColor = 'oklch(0.72 0.16 60)'; }
  else if (isFerritePearlite) { phase = hypereutectoid ? 'Perlit + cementit' : 'Ferit + perlit'; phaseColor = 'oklch(0.7 0.15 230)'; }
  else { phase = hypereutectoid ? 'Austenit + sekundární cementit — mřížka FCC' : 'Austenit + ferit (přechod FCC → BCC)'; phaseColor = '#c8b8e8'; }

  const mx = xPix(C), my = yPix(T);

  return (<div style={{ width: '100%', color: '#eaf2fa', fontFamily: sans, boxSizing: 'border-box' }}>
    <style>{`@keyframes spinSlow { from { transform: rotateY(0deg); } to { transform: rotateY(360deg); } }`}</style>
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div style={{ flex: '1 1 520px', minWidth: 340, borderRadius: 16, border: '1px solid rgba(150,180,210,0.16)', background: 'rgba(120,150,180,0.04)', padding: 12, boxSizing: 'border-box' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
          <line x1={x0} y1={y0} x2={x0} y2={y1} stroke="rgba(174,191,207,0.4)" strokeWidth="1.5" />
          <line x1={x0} y1={y1} x2={x1} y2={y1} stroke="rgba(174,191,207,0.4)" strokeWidth="1.5" />
          <text x={x0 - 10} y={16} textAnchor="middle" fontFamily={mono} fontSize="15" fill="#a8b6c4">T [°C]</text>
          <text x={x1 + 10} y={y1 + 30} textAnchor="end" fontFamily={mono} fontSize="15" fill="#a8b6c4">% C</text>
          {[600, 800, 1000, 1200, 1400].map(t => (<g key={t}>
            <line x1={x0} y1={yPix(t)} x2={x1} y2={yPix(t)} stroke="rgba(174,191,207,0.08)" />
            <text x={x0 - 8} y={yPix(t) + 5} textAnchor="end" fontFamily={mono} fontSize="13" fill="#8296a8">{t}</text>
          </g>))}
          {[0.4, 0.77, 1.2, 1.6, 2.14].map(c => (<text key={c} x={xPix(c)} y={y1 + 20} textAnchor="middle" fontFamily={mono} fontSize="13" fill="#8296a8">{c.toFixed(2).replace(/0$/, '').replace('.', ',')}</text>))}

          <path d={areaPath(UPPER_PTS, LOWER_PTS)} fill="oklch(0.55 0.22 20 / 0.55)" stroke="none" />
          <path d={dPath(UPPER_PTS)} fill="none" stroke="oklch(0.5 0.22 20)" strokeWidth="2.2" />
          <path d={dPath(LOWER_PTS)} fill="none" stroke="oklch(0.5 0.22 20)" strokeWidth="2.2" />
          <path d={dPath(LIQ_PTS)} fill="none" stroke="#eaf2fa" strokeWidth="1.6" strokeDasharray="5 4" opacity="0.75" />
          <text x={xPix(1.0)} y={yPix(upperLimit(1.0)) - 10} textAnchor="middle" fontFamily={sans} fontWeight="700" fontSize="14" fill="#eaf2fa">teplotní interval tváření</text>

          <path d={dPath(A3_PTS)} fill="none" stroke="oklch(0.7 0.15 230)" strokeWidth="1.8" />
          <path d={dPath(ACM_PTS)} fill="none" stroke="oklch(0.7 0.15 230)" strokeWidth="1.8" />
          <line x1={xPix(0)} y1={yPix(T_A1)} x2={xPix(C_E)} y2={yPix(T_A1)} stroke="oklch(0.7 0.15 230)" strokeWidth="1.8" />
          <line x1={xPix(C_E)} y1={yPix(T_EUT)} x2={xPix(C_E)} y2={yPix(T_A1)} stroke="#8296a8" strokeWidth="1.2" strokeDasharray="2 3" />
          <line x1={xPix(0.05)} y1={yPix(T_EUT)} x2={xPix(C_E)} y2={yPix(T_EUT)} stroke="#8296a8" strokeWidth="1.2" strokeDasharray="2 3" />
          <text x={xPix(C_E) + 6} y={yPix(T_EUT) + 5} fontFamily={mono} fontSize="14" fontWeight="700" fill="#eaf2fa">1147 °C</text>
          <text x={xPix(C_E) + 6} y={yPix(T_A1) + 5} fontFamily={mono} fontSize="14" fontWeight="700" fill="#eaf2fa">727 °C</text>
          <text x={xPix(C_E) - 4} y={yPix(T_EUT) - 10} textAnchor="end" fontFamily={mono} fontSize="15" fontWeight="700" fill="#eaf2fa">E</text>
          <text x={xPix(C_S) + 6} y={yPix(T_A1) + 20} fontFamily={mono} fontSize="15" fontWeight="700" fill="#eaf2fa">S</text>
          <text x={xPix(0.12)} y={yPix(a3(0.12)) - 10} fontFamily={mono} fontSize="14" fill="#8296a8">A₃</text>
          <text x={xPix(1.55)} y={yPix(acm(1.55)) - 10} fontFamily={mono} fontSize="14" fill="#8296a8">Acm</text>
          <text x={xPix(1.9)} y={yPix(T_A1) - 8} fontFamily={mono} fontSize="14" fill="#8296a8">A₁</text>

          <circle cx={mx} cy={my} r="7" fill={verdictColor} stroke="#080b12" strokeWidth="1.5" />
        </svg>
      </div>

      <div style={{ flex: '1 1 220px', minWidth: 220, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ fontFamily: mono, fontSize: 12, letterSpacing: '0.1em', color: '#8296a8', textTransform: 'uppercase', marginBottom: 6 }}>Obsah uhlíku</div>
          <input type="range" min="0.05" max="2.3" step="0.01" value={C} onChange={(e) => setC(Number(e.target.value))} style={{ width: '100%', accentColor: 'oklch(0.72 0.16 60)' }} />
          <div style={{ fontFamily: mono, fontSize: 16, fontWeight: 700 }}>{C.toFixed(2)} % C</div>
        </div>
        <div>
          <div style={{ fontFamily: mono, fontSize: 12, letterSpacing: '0.1em', color: '#8296a8', textTransform: 'uppercase', marginBottom: 6 }}>Teplota</div>
          <input type="range" min={T_MIN} max={T_MAX} step="5" value={T} onChange={(e) => setT(Number(e.target.value))} style={{ width: '100%', accentColor: 'oklch(0.7 0.15 230)' }} />
          <div style={{ fontFamily: mono, fontSize: 16, fontWeight: 700 }}>{T} °C</div>
        </div>

        <div style={{ borderRadius: 12, border: '1px solid rgba(150,180,210,0.16)', background: 'rgba(120,150,180,0.05)', padding: '12px 14px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: verdictColor, marginBottom: 4 }}>{verdict}</div>
          <div style={{ fontSize: 13, color: '#8296a8' }}>{phase}</div>
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'center', padding: '4px 0' }}>
          <div style={{ textAlign: 'center' }}>
            <CubeLattice kind="bcc" color="oklch(0.7 0.15 230)" active={isFerritePearlite || isMixed} />
            <div style={{ fontSize: 12, color: '#8296a8', marginTop: 2 }}>BCC (α) — prostorově středěná</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <CubeLattice kind="fcc" color="oklch(0.72 0.16 60)" active={isAustenite || isMixed} />
            <div style={{ fontSize: 12, color: '#8296a8', marginTop: 2 }}>FCC (γ) — plošně středěná</div>
          </div>
        </div>
      </div>
    </div>
  </div>);
}
window.KovaciTeplotyDiagram = KovaciTeplotyDiagram;
