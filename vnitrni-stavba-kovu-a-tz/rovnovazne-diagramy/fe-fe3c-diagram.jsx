// fe-fe3c-diagram.jsx — interaktivní metastabilní diagram Fe–Fe3C.
// Režimy: Prozkoumat (táhlo %C + klikací oblasti), Vrstvy (postupné odkrývání), Kvíz.
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
const FEC = window.FEC;   // vnitrni-stavba-kovu-a-tz/fe-c-konstanty.js
const C_P = FEC.C_P, C_S = FEC.C_S, C_E = FEC.C_E, C_C = FEC.C_C, C_MAX = FEC.C_CEM;
const T_A = FEC.T_A, T_EUT = FEC.T_EUT, T_G = FEC.T_G, T_A1 = FEC.T_A1, T_D = FEC.T_D;
const EUT_LO = C_S - FEC.EUT_TOL, EUT_HI = C_S + FEC.EUT_TOL;   // pásmo eutektoidní oceli
const fecNum = (v) => FEC.cz(v);
const T_MIN = 400, T_MAX = 1600;
// stejné hladké prohnutí osy C jako na obrazovce (xWarp v komponentě) — žádný lom v datovém prostoru,
// takže z něj odvozené křivky (likvidus, solidus, A3) nemají falešné zlomy
const XW_A_M = 0.1402, XW_B_M = 0.0635, XW_T_M = 0.02;
const xWarpM = (x) => XW_A_M * x + XW_B_M * (1 - Math.exp(-x / XW_T_M));
const XWM_MAX = xWarpM(C_MAX);
const xFracM = (x) => xWarpM(x) / XWM_MAX;
const xInvM = (u) => { const target = u * XWM_MAX; let lo = 0, hi = C_MAX; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (xWarpM(m) < target) lo = m; else hi = m; } return (lo + hi) / 2; };

// tvary křivek v souřadnicích obrazovky — nerovnoměrná osa C nevytváří zlom
function liqL(x) { const t = clamp(x / C_C, 0, 1); return T_A - (T_A - T_EUT) * Math.pow(t, 1.08); }
function liqR(x) { return T_EUT + (T_D - T_EUT) * Math.pow((x - C_C) / (C_MAX - C_C), 1.25); }
function solAE(x) { const t = clamp(x / C_E, 0, 1); return T_A - (T_A - T_EUT) * Math.pow(t, 1.0); }
function a3(x) { const t = clamp(x / C_S, 0, 1); return T_A1 + (T_G - T_A1) * Math.pow(clamp(1 - t, 0, 1), 1.5); }
function gpX(T) { return C_P * Math.pow((T_G - T) / (T_G - T_A1), 1.6); }
function acm(x) { const t = clamp((x - C_S) / (C_E - C_S), 0, 1); return T_A1 + (T_EUT - T_A1) * Math.pow(t, 1.2); }
function pqX(T) { return 0.004 + (C_P - 0.004) * Math.pow((T - T_MIN) / (T_A1 - T_MIN), 1.4); }

function sampX(fn, x0, x1, n) { const p = []; for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n; p.push([x, fn(x)]); } return p; }
function sampXU(fn, x0, x1, n) { const u0 = xFracM(x0), u1 = xFracM(x1), p = []; for (let i = 0; i <= n; i++) { const x = xInvM(u0 + (u1 - u0) * i / n); p.push([x, fn(x)]); } return p; }
function sampT(fn, T0, T1, n) { const p = []; for (let i = 0; i <= n; i++) { const T = T0 + (T1 - T0) * i / n; p.push([fn(T), T]); } return p; }

const LIQ_L = sampXU(liqL, 0, C_C, 220), LIQ_R = sampX(liqR, C_C, C_MAX, 120);
const SOL_AE = sampXU(solAE, 0, C_E, 220), A3_PTS = sampXU(a3, 0, C_S, 160);
const GP_PTS = sampT(gpX, T_A1, T_G, 60), ACM_PTS = sampX(acm, C_S, C_E, 100), PQ_PTS = sampT(pqX, T_MIN, T_A1, 14);
const rev = (a) => a.slice().reverse();
const rectPts = (x0, x1, T0, T1) => [[x0, T1], [x1, T1], [x1, T0], [x0, T0]];

// ── struktury ────────────────────────────────────────────────────────────────
const STRUKTURY = {
  tavenina: { name: 'Tavenina (T)', color: '#ff8a5c', def: 'Roztavený kov — atomy železa a uhlíku bez pravidelného uspořádání. Existuje nad čarou likvidu; mezi likvidem a solidem je tavenina v rovnováze s tuhou fází.' },
  ferit: { name: 'Ferit (α)', color: '#8fc7ff', def: 'Intersticiální tuhý roztok uhlíku v železe α (mřížka BCC). Rozpouští max. 0,018 % C při 727 °C. Je měkký, dobře tvárný a feromagnetický.' },
  austenit: { name: 'Austenit (γ)', color: '#7ee0b8', def: 'Tuhý roztok uhlíku v železe γ (mřížka FCC). Rozpouští až 2,14 % C při 1147 °C. Je tvárný a nemagnetický; za normální teploty je u uhlíkových ocelí nestabilní — rozpadá se.' },
  cementit: { name: 'Cementit (Fe₃C)', color: '#e8ecf3', def: 'Karbid železa Fe₃C se 6,68 % C. Velmi tvrdý a křehký. Primární krystalizuje přímo z taveniny, sekundární se vylučuje z austenitu (pod Acm), terciární z feritu.' },
  perlit: { name: 'Perlit', color: '#f4c542', def: 'Eutektoidní směs feritu a cementitu (nejčastěji lamelární). Vzniká rozpadem austenitu na eutektoidní přímce (727 °C).' },
  ledeburit: { name: 'Ledeburit', color: '#d67bff', def: 'Eutektická směs austenitu a cementitu. Vzniká ztuhnutím taveniny o 4,3 % C při 1147 °C. Pod 727 °C se austenit v ledeburitu mění na perlit — mluvíme o rozpadlém ledeburitu.' },
};

// ── fázové oblasti ───────────────────────────────────────────────────────────
const REGIONS = [
  { id: 'tav', step: 0, name: 'Tavenina (T)', str: ['tavenina'], pts: [[0, T_A], ...LIQ_L.slice(1), ...LIQ_R.slice(1), [C_MAX, T_MAX], [0, T_MAX]], label: [4.35, 1480], lines: ['TAVENINA', '(T)'], fs: 1.25, desc: 'Nad likvidem je slitina zcela roztavená.' },
  { id: 'tg', step: 1, name: 'Tavenina + austenit', str: ['tavenina', 'austenit'], pts: [...LIQ_L, [C_E, T_EUT], ...rev(SOL_AE).slice(1)], label: [2.4, 1255], lines: ['TAVENINA', '+ AUSTENIT'], fs: 0.8, desc: 'Mezi likvidem a solidem z taveniny rostou krystaly austenitu; tavenina se obohacuje uhlíkem.' },
  { id: 'tc', step: 1, name: 'Tavenina + cementit', str: ['tavenina', 'cementit'], pts: [...LIQ_R, [C_MAX, T_EUT], [C_C, T_EUT]], label: [6.05, 1180], lines: ['TAVENINA', '+ CEMENTIT'], fs: 0.8, desc: 'Vpravo od bodu C se z taveniny vylučují hrubé krystaly primárního cementitu.' },
  { id: 'g', step: 3, name: 'Austenit (γ)', str: ['austenit'], pts: [...SOL_AE, ...rev(ACM_PTS).slice(1), ...rev(A3_PTS).slice(1)], label: [0.85, 1030], lines: ['AUSTENIT', '(γ)'], fs: 1.25, desc: 'Homogenní tuhý roztok — jediná tuhá fáze. Oblast tepelného zpracování ocelí (austenitizace).' },
  { id: 'gf', step: 3, name: 'Austenit + ferit', str: ['austenit', 'ferit'], pts: [...A3_PTS, [C_P, T_A1], ...rev(GP_PTS).slice(1)], label: [0.11, 758], lines: ['AUSTENIT', '+ FERIT'], fs: 0.55, desc: 'Pod čarou A3 se z austenitu vylučuje ferit; zbylý austenit se obohacuje uhlíkem směrem k bodu S.' },
  { id: 'f', step: 3, name: 'Ferit (α)', str: ['ferit'], pts: [[0, T_G], ...GP_PTS.slice().sort((a, b) => b[1] - a[1]).slice(1), ...rev(PQ_PTS).slice(1), [0, T_MIN]], label: null, lines: [], fs: 0.6, desc: 'Úzká oblast čistého feritu u levého okraje diagramu (do 0,018 % C).' },
  { id: 'gc2', step: 3, name: 'Austenit + sekundární cementit', str: ['austenit', 'cementit'], pts: [...ACM_PTS, [C_E, T_A1], [C_S, T_A1]], label: [1.68, 815], lines: ['AUSTENIT', '+ SEKUNDÁRNÍ', 'CEMENTIT'], fs: 0.72, desc: 'Pod čarou Acm klesá rozpustnost uhlíku v austenitu — přebytečný uhlík se vylučuje jako sekundární cementit (po hranicích zrn).' },
  { id: 'gcl', step: 2, name: 'Austenit + ledeburit', str: ['austenit', 'ledeburit'], pts: rectPts(C_E, C_C, T_A1, T_EUT), label: [3.2, 970], lines: ['AUSTENIT', '+ LEDEBURIT'], fs: 0.92, desc: 'Podeutektické litiny: austenit ztuhlý před eutektickou přímkou + ledeburit vzniklý při 1147 °C.' },
  { id: 'cl', step: 2, name: 'Cementit + ledeburit', str: ['cementit', 'ledeburit'], pts: rectPts(C_C, C_MAX, T_A1, T_EUT), label: [5.55, 970], lines: ['CEMENTIT', '+ LEDEBURIT'], fs: 0.85, desc: 'Nadeutektické litiny: hrubé desky primárního cementitu obklopené ledeburitem.' },
  { id: 'fc3', step: 4, name: 'Ferit + terciární cementit', str: ['ferit', 'cementit'], pts: [[C_P, T_A1], [C_P, T_MIN], ...PQ_PTS.slice(1)], label: null, lines: [], fs: 0.6, desc: 'Pod 727 °C klesá rozpustnost C ve feritu — vylučuje se nepatrné množství terciárního cementitu.' },
  { id: 'fp', step: 4, name: 'Ferit + perlit', str: ['ferit', 'perlit'], pts: rectPts(C_P, C_S, T_MIN, T_A1), label: [0.33, 565], lines: ['FERIT', '+', 'PERLIT'], fs: 1.0, desc: 'Struktura podeutektoidních ocelí: světlá zrna feritu + lamelární perlit. Čím více C, tím více perlitu (vyšší pevnost).' },
  { id: 'c2p', step: 4, name: 'Sekundární cementit + perlit', str: ['cementit', 'perlit'], pts: rectPts(C_S, C_E, T_MIN, T_A1), label: [1.44, 565], lines: ['SEKUNDÁRNÍ', 'CEMENTIT', '+ PERLIT'], fs: 0.85, desc: 'Struktura nadeutektoidních ocelí: perlit + síťoví sekundárního cementitu po hranicích zrn (tvrdé, méně houževnaté).' },
  { id: 'c2pl', step: 4, name: 'Perlit + rozpadlý ledeburit', str: ['perlit', 'ledeburit'], pts: rectPts(C_E, C_C, T_MIN, T_A1), label: [3.2, 565], lines: ['PERLIT', '+ ROZPADLÝ LEDEBURIT'], fs: 0.9, desc: 'Bílé podeutektické litiny za normální teploty: perlit (z austenitu) + rozpadlý ledeburit.' },
  { id: 'crl', step: 4, name: 'Cementit + rozpadlý ledeburit', str: ['cementit', 'ledeburit'], pts: rectPts(C_C, C_MAX, T_MIN, T_A1), label: [5.55, 565], lines: ['CEMENTIT', '+ ROZPADLÝ', 'LEDEBURIT'], fs: 0.85, desc: 'Bílé nadeutektické litiny: primární cementit + rozpadlý ledeburit. Velmi tvrdé a křehké.' },
];
const QUIZ_IDS = ['tav', 'tg', 'tc', 'g', 'gf', 'gc2', 'gcl', 'cl', 'fp', 'c2p', 'c2pl', 'crl'];

// ── konstrukce diagramu krok za krokem — přidávej sem další kroky podle pokynů v chatu ──
const KON_STEPS = [
  { t: 'Vynést důležité koncentrace a teploty', d: 'Na vodorovnou osu vyneseme klíčové koncentrace uhlíku (0,018 – 0,765 – 2,14 – 4,3 – 6,68 %), na svislou osu klíčové teploty (727 – 911 – 1147 – 1380 – 1538 °C).' },
  { t: 'Eutektoidní přímka a eutektoidní bod', d: 'Při 727 °C vedeme vodorovnou eutektoidní přímku a vyznačíme na ní eutektoidní bod (0,765 % C) — zatím jen jako bod, bez označení písmenem.' },
  { t: 'Eutektická přímka a eutektická koncentrace', d: 'Při 1147 °C vedeme vodorovnou eutektickou přímku a vyznačíme eutektickou koncentraci (4,3 % C).' },
  { t: 'Likvidus', d: 'Vedeme křivku likvidu — nad ní je slitina zcela roztavená, na ní začíná tuhnutí.' },
  { t: 'Solidus', d: 'Vedeme křivku solidu — pod ní je slitina (do eutektické koncentrace) zcela tuhá.' },
  { t: 'Uzavření oblasti austenitu', d: 'Vedeme křivky, které uzavírají oblast austenitu shora — hranici s feritem a hranici s cementitem.' },
  { t: 'Uzavření oblasti feritu', d: 'Vedeme křivku, která uzavírá oblast feritu — rozpustnost uhlíku ve feritu s klesající teplotou, včetně křivky od koncentrace dolů k bodu P.' },
  { t: 'Označení oblasti taveniny, austenitu a feritu', d: 'Popíšeme tři fáze, které jsme diagramem už ohraničili: taveninu nahoře, austenit uprostřed a úzkou oblast feritu u levého okraje.' },
  { t: 'Přeměny', d: 'Nad eutektickou přímku doplníme popisek tav → ledeburit (zeleně) a nad eutektoidní přímku austenit → perlit (žlutě).' },
  { t: 'Doplnění zbývajícího popisu', d: '' },
];
const KON_ALL_STEPS = KON_STEPS;
const konLabel = (i) => String(i + 1);

const POINTS = [
  { n: 'A', x: 0, T: T_A, tip: 'A — teplota tání čistého železa (1538 °C)' },
  { n: 'C', x: C_C, T: T_EUT, tip: 'C — eutektický bod (4,3 % C; 1147 °C): tavenina → ledeburit' },
  { n: 'D', x: C_MAX, T: T_D, tip: 'D — teplota tání cementitu (1380 °C; 6,68 % C)' },
  { n: 'E', x: C_E, T: T_EUT, tip: 'E — max. rozpustnost C v austenitu (2,14 % při 1147 °C)' },
  { n: 'F', x: C_MAX, T: T_EUT, tip: 'F — konec eutektické přímky (6,68 % C)' },
  { n: 'G', x: 0, T: T_G, tip: 'G — přeměna γ ↔ α u čistého železa (911 °C)' },
  { n: 'P', x: C_P, T: T_A1, tip: 'P — max. rozpustnost C ve feritu (0,018 % při 727 °C)' },
  { n: 'S', x: C_S, T: T_A1, tip: 'S — eutektoidní bod (0,765 % C; 727 °C): austenit → perlit' },
  { n: 'K', x: C_MAX, T: T_A1, tip: 'K — konec eutektoidní přímky' },
];
const PT_STEP = { A: 1, C: 1, D: 1, E: 2, F: 2, G: 3, S: 3, P: 4, K: 4 };
const PT_OFF = { A: [10, -6], C: [6, -10], D: [-16, -8], E: [8, -8], F: [-16, -8], G: [10, -8], P: [8, 16], S: [8, -8], K: [-16, -8] };

// ── křivky a body pro kvíz ───────────────────────────────────────────────────
const CURVES = [
  { id: 'likvidus', name: 'Likvidus', segs: [LIQ_L, LIQ_R] },
  { id: 'solidus', name: 'Solidus', segs: [SOL_AE] },
  { id: 'eutektikala', name: 'Eutektická přímka', segs: [[[C_E, T_EUT], [C_MAX, T_EUT]]] },
  { id: 'eutektoid', name: 'Eutektoidní přímka', segs: [[[C_P, T_A1], [C_MAX, T_A1]]] },
  { id: 'a3', name: 'Křivka A₃', segs: [A3_PTS] },
  { id: 'acm', name: 'Křivka Acm', segs: [ACM_PTS] },
];
const POINT_NAMES = {
  A: 'Bod tání čistého železa', C: 'Eutektický bod', D: 'Bod tání cementitu',
  E: 'Max. rozpustnost uhlíku v austenitu', F: 'Konec eutektické přímky',
  G: 'Přeměna γ↔α čistého železa', P: 'Max. rozpustnost uhlíku ve feritu',
  S: 'Eutektoidní bod', K: 'Konec eutektoidní přímky',
};
const BAND_POINTS = ['C', 'E', 'P', 'S'];

const STEPS = [
  { t: 'Osy diagramu', d: 'Vodorovná osa: obsah uhlíku 0–6,68 % (6,68 % C odpovídá čistému cementitu Fe₃C). Svislá osa: teplota. Za vysokých teplot je vše roztavené — tavenina (T).' },
  { t: 'Likvidus (A–C–D)', d: 'Nad likvidem je slitina zcela tekutá. Při ochlazení pod likvidus začíná tuhnutí: vlevo od bodu C se z taveniny vylučuje austenit, vpravo primární cementit.' },
  { t: 'Solidus a eutektická přímka (1147 °C)', d: 'Pod solidem (A–E) je slitina zcela tuhá. Na eutektické přímce (E–C–F) tuhne zbylá tavenina eutektickou přeměnou: v bodě C (4,3 % C) vzniká ledeburit — eutektická směs austenitu a cementitu.' },
  { t: 'Překrystalizace: A3 a Acm', d: 'Austenit se při dalším ochlazování rozpadá: pod čarou A3 (G–S) se vylučuje ferit, pod čarou Acm (S–E) sekundární cementit. Zbylý austenit míří složením k bodu S (0,765 % C).' },
  { t: 'Eutektoidní přímka A1 (727 °C)', d: 'Na přímce P–S–K se zbylý austenit (0,765 % C) rozpadá eutektoidní přeměnou na perlit. Austenit v ledeburitu se mění také — pod A1 mluvíme o rozpadlém ledeburitu.' },
  { t: 'Oceli a litiny', d: 'Slitiny do 2,14 % C jsou oceli (tuhnou bez eutektické přeměny, dají se tvářet), nad 2,14 % C litiny. Hranicí mezi pod- a nadeutektoidními ocelemi je bod S, mezi litinami bod C. Táhněte svislou čárou a sledujte, čím slitina při ochlazování prochází.' },
];

function classify(C) {
  if (C < C_P) return { n: 'technicky čisté železo', c: '#8fc7ff' };
  if (C < EUT_LO) return { n: 'podeutektoidní ocel', c: '#6db3ff' };
  if (C <= EUT_HI) return { n: 'eutektoidní ocel (perlitická)', c: '#f4c542' };
  if (C <= C_E) return { n: 'nadeutektoidní ocel', c: '#6db3ff' };
  if (C < 4.25) return { n: 'podeutektická litina', c: '#d67bff' };
  if (C <= 4.35) return { n: 'eutektická litina', c: '#f4c542' };
  return { n: 'nadeutektická litina', c: '#d67bff' };
}

function seqFor(C) {
  const r = [], f = (t) => Math.round(t);
  const liq = C <= C_C ? liqL(C) : liqR(C);
  r.push({ r: `nad ${f(liq)} °C`, l: 'tavenina (T)' });
  if (C <= C_E) {
    const sol = solAE(C);
    r.push({ r: `${f(liq)}–${f(sol)} °C`, l: 'tavenina + austenit' });
    if (C < EUT_LO) {
      r.push({ r: `${f(sol)}–${f(a3(C))} °C`, l: 'austenit (γ)' });
      r.push({ r: `${f(a3(C))}–727 °C`, l: 'austenit + ferit' });
      r.push({ r: '727 °C', l: 'zbylý austenit → perlit (eutektoidní přeměna)', ev: true, col: '#f4c542' });
      r.push({ r: 'pod 727 °C', l: 'ferit + perlit' });
    } else if (C <= EUT_HI) {
      r.push({ r: `${f(sol)}–727 °C`, l: 'austenit (γ)' });
      r.push({ r: '727 °C', l: 'austenit → perlit (eutektoidní přeměna)', ev: true });
      r.push({ r: 'pod 727 °C', l: 'perlit' });
    } else {
      r.push({ r: `${f(sol)}–${f(acm(C))} °C`, l: 'austenit (γ)' });
      r.push({ r: `${f(acm(C))}–727 °C`, l: 'austenit + sekundární cementit' });
      r.push({ r: '727 °C', l: 'austenit → perlit (eutektoidní přeměna)', ev: true, col: '#f4c542' });
      r.push({ r: 'pod 727 °C', l: 'sekundární cementit + perlit' });
    }
  } else if (C < 4.25) {
    r.push({ r: `${f(liq)}–1147 °C`, l: 'tavenina + austenit' });
    r.push({ r: '1147 °C', l: 'zbylá tavenina → ledeburit (eutektická přeměna)', ev: true, col: '#43e0a0' });
    r.push({ r: '1147–727 °C', l: 'austenit + ledeburit' });
    r.push({ r: '727 °C', l: 'austenit → perlit (eutektoidní přeměna)', ev: true, col: '#f4c542' });
    r.push({ r: 'pod 727 °C', l: 'perlit + rozpadlý ledeburit' });
  } else if (C <= 4.35) {
    r.length = 0;
    r.push({ r: 'nad 1147 °C', l: 'tavenina (T)' });
    r.push({ r: '1147 °C', l: 'tavenina → ledeburit (eutektická přeměna)', ev: true, col: '#43e0a0' });
    r.push({ r: '1147–727 °C', l: 'ledeburit' });
    r.push({ r: '727 °C', l: 'austenit v ledeburitu → perlit', ev: true, col: '#f4c542' });
    r.push({ r: 'pod 727 °C', l: 'rozpadlý ledeburit' });
  } else {
    r.push({ r: `${f(liq)}–1147 °C`, l: 'tavenina + cementit' });
    r.push({ r: '1147 °C', l: 'zbylá tavenina → ledeburit (eutektická přeměna)', ev: true, col: '#43e0a0' });
    r.push({ r: '1147–727 °C', l: 'cementit + ledeburit' });
    r.push({ r: '727 °C', l: 'austenit v ledeburitu → perlit', ev: true, col: '#f4c542' });
    r.push({ r: 'pod 727 °C', l: 'cementit + rozpadlý ledeburit' });
  }
  return r;
}

// ── schémata mikrostruktur ───────────────────────────────────────────────────
const GRAINS = [
  '0,0 55,0 42,38 0,30', '55,0 105,0 92,30 42,38', '105,0 150,0 150,45 92,30',
  '0,30 42,38 50,72 0,78', '42,38 92,30 100,68 50,72', '92,30 150,45 150,100 100,68',
  '0,78 50,72 45,100 0,100', '50,72 100,68 95,100 45,100', '100,68 150,100 95,100',
];
function StructSketch({ id }) {
  const w = 150, h = 100;
  let body = null;
  if (id === 'tavenina') {
    const dots = [[18, 22], [44, 12], [70, 30], [98, 15], [126, 26], [12, 52], [38, 44], [64, 58], [92, 46], [120, 60], [140, 44], [24, 78], [52, 86], [80, 74], [108, 88], [134, 78]];
    body = (<g><rect width={w} height={h} fill="#3a1c14" /><g fill="#ff8a5c" opacity="0.85">{dots.map((d, i) => <circle key={i} cx={d[0]} cy={d[1]} r={i % 3 === 0 ? 4 : 3} />)}</g></g>);
  } else if (id === 'ferit') {
    body = (<g><rect width={w} height={h} fill="#1a2431" />{GRAINS.map((g, i) => <polygon key={i} points={g} fill={i % 2 ? '#b8d8f5' : '#9cc4e8'} stroke="#5a7ea3" strokeWidth="1.5" />)}</g>);
  } else if (id === 'austenit') {
    body = (<g><rect width={w} height={h} fill="#14241c" />{GRAINS.map((g, i) => <polygon key={i} points={g} fill={i % 2 ? '#a8e2c6' : '#8ed4b4'} stroke="#4d8a6d" strokeWidth="1.5" />)}<path d="M60,8 L88,26 M52,50 L92,44 M18,84 L40,76" stroke="#4d8a6d" strokeWidth="1.2" opacity="0.7" /></g>);
  } else if (id === 'cementit') {
    body = (<g><rect width={w} height={h} fill="#2a2d33" /><g fill="#eef2f7"><rect x="14" y="12" width="58" height="9" rx="4" transform="rotate(12 43 16)" /><rect x="80" y="28" width="56" height="9" rx="4" transform="rotate(-9 108 32)" /><rect x="22" y="46" width="64" height="9" rx="4" transform="rotate(-6 54 50)" /><rect x="78" y="66" width="52" height="9" rx="4" transform="rotate(10 104 70)" /><rect x="12" y="76" width="46" height="9" rx="4" transform="rotate(7 35 80)" /></g></g>);
  } else if (id === 'perlit') {
    body = (<g><defs><pattern id="lamA" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><rect width="7" height="7" fill="#e9edf2" /><rect width="3.2" height="7" fill="#3c4654" /></pattern><pattern id="lamB" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(115)"><rect width="7" height="7" fill="#e9edf2" /><rect width="3.2" height="7" fill="#3c4654" /></pattern></defs><rect width={w} height={h} fill="#20262e" />{GRAINS.map((g, i) => <polygon key={i} points={g} fill={i % 2 ? 'url(#lamA)' : 'url(#lamB)'} stroke="#11151b" strokeWidth="2" />)}</g>);
  } else if (id === 'ledeburit') {
    const blobs = [[24, 20, 9], [58, 14, 7], [96, 22, 10], [132, 16, 6], [16, 52, 7], [46, 46, 10], [82, 52, 8], [116, 46, 9], [140, 58, 6], [30, 82, 9], [66, 80, 7], [100, 84, 9], [132, 82, 7]];
    body = (<g><rect width={w} height={h} fill="#e9edf2" />{blobs.map((b, i) => <circle key={i} cx={b[0]} cy={b[1]} r={b[2]} fill="#3c4654" />)}</g>);
  }
  return (<svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', borderRadius: 10, display: 'block', border: '1px solid rgba(255,255,255,0.12)' }}>{body}</svg>);
}

const CLASS_BANDS = [
  { id: 'podeutektoidni', name: 'Podeutektoidní oceli', x0: C_P, x1: C_S, l: 'PODEUTEKTOIDNÍ', c: '#6db3ff' },
  { id: 'nadeutektoidni', name: 'Nadeutektoidní oceli', x0: C_S, x1: C_E, l: 'NADEUTEKTOIDNÍ', c: '#6db3ff' },
  { id: 'podeutekticke_litiny', name: 'Podeutektické litiny', x0: C_E, x1: C_C, l: 'PODEUTEKTICKÉ LITINY', c: '#d67bff' },
  { id: 'nadeutekticke_litiny', name: 'Nadeutektické litiny', x0: C_C, x1: C_MAX, l: 'NADEUTEKTICKÉ LITINY', c: '#d67bff' },
];
const GROUP_BANDS = [
  { id: 'sk_oceli', name: 'Oceli', x0: 0, x1: C_E, l: 'SKUPINA OCELÍ', c: '#6db3ff' },
  { id: 'sk_litiny', name: 'Litiny', x0: C_E, x1: C_MAX, l: 'SKUPINA LITIN A SUROVÝCH ŽELEZ', c: '#d67bff' },
];
const QUIZ_BANK = REGIONS.map(r => ({ id: r.id, type: 'region', name: r.name }))
  .concat(CURVES.map(c => ({ id: c.id, type: 'curve', name: c.name })))
  .concat(CLASS_BANDS.map(b => ({ id: b.id, type: 'band', name: b.name })))
  .concat(GROUP_BANDS.map(b => ({ id: b.id, type: 'band', name: b.name })))
  .concat(POINTS.filter(p => BAND_POINTS.includes(p.n)).map(p => ({ id: p.n, type: 'point', name: POINT_NAMES[p.n] })));
const REGION_NAMES = REGIONS.map(r => r.name);
const CURVE_NAMES = CURVES.map(c => c.name);
const BAND_NAMES_ALL = CLASS_BANDS.concat(GROUP_BANDS).map(b => b.name);
const POINT_NAMES_REV = POINTS.filter(p => BAND_POINTS.includes(p.n)).map(p => POINT_NAMES[p.n]);
const REV_BANK = REGIONS.map(r => ({ id: r.id, type: 'region_r', name: r.name, pool: REGION_NAMES }))
  .concat(CURVES.map(c => ({ id: c.id, type: 'curve_r', name: c.name, pool: CURVE_NAMES })))
  .concat(CLASS_BANDS.concat(GROUP_BANDS).map(b => ({ id: b.id, type: 'band_r', name: b.name, pool: BAND_NAMES_ALL })))
  .concat(POINTS.filter(p => BAND_POINTS.includes(p.n)).map(p => ({ id: p.n, type: 'point_r', name: POINT_NAMES[p.n], pool: POINT_NAMES_REV })));

function shuffle(a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
const QUIZ_LEN = 8;
const COMP_VALS = [C_P, C_S, C_E, C_C, C_MAX].map(fecNum);
const TEMP_VALS = [T_A, T_EUT, T_D, T_G, T_A1].map(fecNum);
const NUM_BANK = [
  { id: 'num_p', type: 'num', name: 'Maximální rozpustnost uhlíku ve feritu (bod P)', correct: fecNum(C_P), pool: COMP_VALS },
  { id: 'num_s', type: 'num', name: 'Eutektoidní koncentrace uhlíku (bod S)', correct: fecNum(C_S), pool: COMP_VALS },
  { id: 'num_e', type: 'num', name: 'Maximální rozpustnost uhlíku v austenitu (bod E)', correct: fecNum(C_E), pool: COMP_VALS },
  { id: 'num_c', type: 'num', name: 'Eutektická koncentrace uhlíku (bod C)', correct: fecNum(C_C), pool: COMP_VALS },
  { id: 'num_cem', type: 'num', name: 'Obsah uhlíku v cementitu (Fe₃C)', correct: fecNum(C_MAX), pool: COMP_VALS },
  { id: 'num_a', type: 'num', name: 'Teplota tání čistého železa (bod A)', correct: fecNum(T_A), pool: TEMP_VALS },
  { id: 'num_eut', type: 'num', name: 'Eutektická teplota (přímka ECF)', correct: fecNum(T_EUT), pool: TEMP_VALS },
  { id: 'num_d', type: 'num', name: 'Teplota tání cementitu (bod D)', correct: fecNum(T_D), pool: TEMP_VALS },
  { id: 'num_g', type: 'num', name: 'Teplota přeměny γ↔α čistého železa (bod G)', correct: fecNum(T_G), pool: TEMP_VALS },
  { id: 'num_eutd', type: 'num', name: 'Eutektoidní teplota (přímka PSK)', correct: fecNum(T_A1), pool: TEMP_VALS },
];

// ── křivka chladnutí (čas schematicky, teplota ve měřítku diagramu) ─────────
function coolCurve(C) {
  const segs = []; let t = 0;
  const cool = (T0, T1, rate, lab) => { if (T0 - T1 < 1) return; const dt = Math.max(0.4, (T0 - T1) / (rate * 300)); segs.push({ kind: 'cool', t0: t, T0, t1: t + dt, T1, lab }); t += dt; };
  const halt = (T, frac, col, lab) => { if (frac < 0.03) return; const dt = 0.5 + 1.3 * clamp(frac, 0, 1); segs.push({ kind: 'halt', t0: t, T0: T, t1: t + dt, T1: T, col, lab }); t += dt; };
  const liq = C <= C_C ? liqL(C) : liqR(C);
  const start = Math.min(T_MAX, liq + 150);
  if (C >= 6.6) {
    // čistý cementit: prodleva tuhnutí u 1380 °C
    cool(start, T_D, 1.7, 'tavenina');
    halt(T_D, 0.9, '#ff8a5c', 'tavenina → cementit');
    cool(T_D, T_MIN, 1.2, 'cementit');
  } else if (C < C_P) {
    // technicky čisté železo: prodleva tuhnutí u 1538 a překrystalizace γ→α u 911
    const sol = solAE(C), A = a3(C);
    cool(start, liq, 1.7, 'tavenina');
    halt(liq, 0.9, '#ff8a5c', 'tavenina → Fe γ');
    if (liq - sol > 2) cool(liq, sol, 0.7, '');
    cool(sol, A, 1.1, 'Fe γ');
    halt(A, 0.7, '#8fc7ff', 'Fe γ → Fe α');
    cool(A, T_MIN, 1.2, 'Fe α');
  } else if (C <= C_E) {
    const sol = solAE(C);
    cool(start, liq, 1.7, 'tavenina');
    cool(liq, sol, 0.7, 'tav + austenit');
    if (C >= EUT_LO && C <= EUT_HI) { cool(sol, T_A1, 1.1, 'austenit'); halt(T_A1, 1, '#f4c542', 'austenit → perlit'); cool(T_A1, T_MIN, 1.2, 'perlit'); }
    else if (C < EUT_LO) { const A = a3(C); cool(sol, A, 1.1, 'austenit'); cool(A, T_A1, 0.75, 'austenit + ferit'); halt(T_A1, (C - C_P) / (C_S - C_P), '#f4c542', 'austenit → perlit'); cool(T_A1, T_MIN, 1.2, C < C_P ? 'ferit' : 'ferit + perlit'); }
    else { const A = acm(C); cool(sol, A, 1.1, 'austenit'); cool(A, T_A1, 0.75, 'austenit + Fe₃C II'); halt(T_A1, (C_MAX - C) / (C_MAX - C_S), '#f4c542', 'austenit → perlit'); cool(T_A1, T_MIN, 1.2, 'Fe₃C II + perlit'); }
  } else if (C >= 4.25 && C <= 4.35) {
    cool(start, T_EUT, 1.7, 'tavenina');
    halt(T_EUT, 1, '#43e0a0', 'tavenina → ledeburit');
    cool(T_EUT, T_A1, 1.0, 'ledeburit');
    halt(T_A1, 0.45, '#f4c542', 'austenit → perlit');
    cool(T_A1, T_MIN, 1.2, 'rozpadlý ledeburit');
  } else {
    const hypo = C < C_C;
    cool(start, liq, 1.7, 'tavenina');
    cool(liq, T_EUT, 0.7, hypo ? 'tav + austenit' : 'tav + Fe₃C I');
    halt(T_EUT, hypo ? (C - C_E) / (C_C - C_E) : (C_MAX - C) / (C_MAX - C_C), '#43e0a0', 'tavenina → ledeburit');
    cool(T_EUT, T_A1, 1.0, hypo ? 'austenit + ledeburit' : 'Fe₃C + ledeburit');
    halt(T_A1, hypo ? 0.55 : 0.4, '#f4c542', 'austenit → perlit');
    cool(T_A1, T_MIN, 1.2, hypo ? 'perlit + rozp. ledeburit' : 'Fe₃C + rozp. ledeburit');
  }
  return { segs, tot: t };
}

function FeFe3CDiagram() {
  const mono = "'IBM Plex Mono', monospace";
  const sans = "'IBM Plex Sans', system-ui, sans-serif";
  const [vw, setVw] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  React.useEffect(() => { const onR = () => setVw(window.innerWidth); window.addEventListener('resize', onR); return () => window.removeEventListener('resize', onR); }, []);
  const mobile = vw < 900;

  const [mode, setMode] = React.useState('explore');
  const [C, setC] = React.useState(0.45);
  const [sel, setSel] = React.useState(null);
  const [struct, setStruct] = React.useState(null);
  const [step, setStep] = React.useState(0);
  const [quiz, setQuiz] = React.useState(null);
  const [kStep, setKStep] = React.useState(0);
  const [eggVisible, setEggVisible] = React.useState(false);
  React.useEffect(() => {
    setEggVisible(false);
    if (kStep === KON_ALL_STEPS.length) {
      const id = setTimeout(() => setEggVisible(true), 10000);
      return () => clearTimeout(id);
    }
  }, [kStep]);

  const plotRef = React.useRef(null);
  const [size, setSize] = React.useState({ w: 860, h: 620 });
  React.useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((es) => { const e = es[0]; if (!e) return; const { width: w, height: h } = e.contentRect; if (w > 20 && h > 20) setSize({ w, h }); });
    if (plotRef.current) ro.observe(plotRef.current);
    return () => ro.disconnect();
  }, []);

  const PW = Math.round(size.w), PH = Math.round(size.h);
  const PAD_L = 62, PAD_R = 20, PAD_T = 18, PAD_B = 96;
  const plotW = PW - PAD_L - PAD_R, plotH = PH - PAD_T - PAD_B;
  const XW_A = 0.1402, XW_B = 0.0635, XW_T = 0.02;
  const xWarp = (x) => XW_A * x + XW_B * (1 - Math.exp(-x / XW_T));
  const xFrac = (x) => xWarp(x) / xWarp(C_MAX);
  const xOf = (x) => PAD_L + xFrac(clamp(x, 0, C_MAX)) * plotW;
  const yOf = (T) => PAD_T + ((T_MAX - clamp(T, T_MIN, T_MAX)) / (T_MAX - T_MIN)) * plotH;
  const y0 = yOf(T_MIN);
  const dPath = (pts) => 'M' + pts.map(([x, T]) => `${xOf(x).toFixed(1)},${yOf(T).toFixed(1)}`).join(' L');
  // hladká křivka (Catmull-Rom → bezier) — žádné zlomy mezi úseky
  const dPathSm = (pts) => {
    const p = pts.map(([x, T]) => [xOf(x), yOf(T)]);
    if (p.length < 3) return dPath(pts);
    let d = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[Math.max(0, i - 1)], p1 = p[i], p2 = p[i + 1], p3 = p[Math.min(p.length - 1, i + 2)];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d;
  };
  const rPath = (pts) => dPath(pts) + ' Z';
  const FSU = Math.min(plotW / 860, plotH / 560);

  const vis = (s) => mode !== 'layers' || s <= step;
  const grp = (s) => ({ opacity: vis(s) ? 1 : 0, transition: 'opacity 0.45s', pointerEvents: vis(s) ? undefined : 'none' });
  const konShow = (n) => mode !== 'konstrukce' || kStep >= n;
  const konOnly = (n) => mode === 'konstrukce' && kStep >= n;
  const showFull = mode !== 'konstrukce' || kStep >= KON_ALL_STEPS.length;

  // slider drag
  const dragging = React.useRef(false);
  // no-go zóny pro křivky chladnutí — zde křivka není korektní, slider je přeskakuje
  const NOGO = [[0.016, 0.10], [2.0, 2.2], [6.6, 6.68]];
  const setFromX = (clientX) => {
    const el = plotRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const target = clamp(((clientX - r.left) * (PW / r.width) - PAD_L) / plotW, 0, 1);
    let lo = 0, hi = C_MAX;
    for (let i = 0; i < 26; i++) { const m = (lo + hi) / 2; if (xFrac(m) < target) lo = m; else hi = m; }
    let c = (lo + hi) / 2;
    if (mode === 'chladnuti') { for (const [a, b] of NOGO) { if (c > a && c < b) { c = (c - a < b - c) ? a : b; break; } } }
    setC(c < 0.1 ? Math.round(c * 1000) / 1000 : Math.round(c * 100) / 100);
  };
  const sliderOn = mode === 'explore' || mode === 'chladnuti' || (mode === 'layers' && step >= 5);

  // quiz
  const isTextType = (t) => t === 'num' || (t && t.endsWith('_r'));
  const startQuiz = () => {
    const order = shuffle(QUIZ_BANK.concat(NUM_BANK).concat(REV_BANK)).slice(0, QUIZ_LEN).map(q => isTextType(q.type) ? { ...q, correct: q.correct ?? q.name, options: shuffle([q.correct ?? q.name, ...shuffle(q.pool.filter(v => v !== (q.correct ?? q.name))).slice(0, 2)]) } : q);
    setQuiz({ order, i: 0, score: 0, picked: null, done: false });
  };
  React.useEffect(() => { if (mode === 'quiz' && !quiz) startQuiz(); }, [mode]);
  const qCur = quiz && !quiz.done ? quiz.order[quiz.i] : null;
  const onAnswerClick = (type, id) => {
    if (mode !== 'quiz' || !quiz || quiz.done || quiz.picked) return;
    const correct = qCur && qCur.type === type && (isTextType(type) ? id === qCur.correct : id === qCur.id);
    setQuiz({ ...quiz, picked: { type, id }, score: quiz.score + (correct ? 1 : 0) });
  };
  const onRegionClick = (id) => {
    if (mode === 'quiz') { if (qCur && qCur.type === 'region') onAnswerClick('region', id); }
    else if (mode === 'explore') setSel(sel === id ? null : id);
  };
  const quizNext = () => {
    if (quiz.i + 1 >= quiz.order.length) setQuiz({ ...quiz, done: true, picked: null });
    else setQuiz({ ...quiz, i: quiz.i + 1, picked: null });
  };

  const cls = classify(C);
  const fmtC = (C < 0.1 ? C.toFixed(3) : C.toFixed(2)).replace('.', ',');
  const selRegion = REGIONS.find(r => r.id === sel);
  const seq = seqFor(C);

  const lineLabel = (fn, x1, x2, text, color, dy, s) => {
    if (mode === 'quiz') return null;
    const p1 = [xOf(x1), yOf(fn(x1))], p2 = [xOf(x2), yOf(fn(x2))];
    const ang = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * 180 / Math.PI;
    const mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2;
    return (<g style={grp(s)}><text x={mx} y={my + dy} transform={`rotate(${ang} ${mx} ${my})`} textAnchor="middle" fill={color} fontFamily={mono} fontSize={13 * FSU + 2} letterSpacing="0.14em" fontWeight="600">{text}</text></g>);
  };

  const regionFill = (r) => {
    if (mode === 'quiz' && quiz && quiz.picked) {
      if (qCur && qCur.type === 'region' && r.id === qCur.id) return 'rgba(67,224,160,0.30)';
      if (quiz.picked.type === 'region' && r.id === quiz.picked.id) return 'rgba(255,92,92,0.30)';
    }
    if (mode === 'quiz' && qCur && qCur.type === 'region_r' && r.id === qCur.id) return 'rgba(244,197,66,0.35)';
    if (mode === 'explore' && sel === r.id) return 'rgba(109,179,255,0.22)';
    return r.pts[0][1] > T_A1 && r.id !== 'f' && r.id !== 'fc3' && ['tav', 'tg', 'tc'].includes(r.id) ? 'rgba(255,138,92,0.05)' : 'rgba(109,179,255,0.05)';
  };

  const chip = (sid, key) => {
    const s = STRUKTURY[sid];
    return (<button key={key} onClick={() => setStruct(sid)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.05)', color: '#e8ecf3', fontFamily: sans, fontSize: 12.5, cursor: 'pointer' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />{s.name}
    </button>);
  };

  const modeBtn = (m, label) => (
    <button onClick={() => { setMode(m); setSel(null); if (m === 'quiz') startQuiz(); if (m === 'konstrukce') setKStep(0); }} style={{ padding: '7px 16px', borderRadius: 999, border: '1px solid ' + (mode === m ? 'rgba(109,179,255,0.6)' : 'rgba(255,255,255,0.14)'), background: mode === m ? 'rgba(109,179,255,0.18)' : 'rgba(255,255,255,0.04)', color: mode === m ? '#bcdcff' : '#9fb0c2', fontFamily: sans, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>{label}</button>
  );

  const yTicks = []; for (let T = 400; T <= 1600; T += 100) yTicks.push(T);
  const keyTemps = [T_A1, T_G, T_EUT, T_D, T_A];
  const keyTempCol = { [T_A]: '#8fc7ff', [T_D]: '#8fc7ff', [T_EUT]: '#43e0a0', [T_G]: '#8fc7ff', [T_A1]: '#f4c542' };
  const xKey = [C_P, C_S, C_E, C_C, C_MAX].map(x => [x, fecNum(x)]);

  return (
    <div style={{ width: '100%', minHeight: '100vh', height: mobile ? 'auto' : '100vh', background: '#080b12', color: '#eaf2fa', boxSizing: 'border-box', padding: mobile ? '54px 14px 20px' : '56px 44px 18px', display: 'flex', flexDirection: 'column', fontFamily: sans, position: 'relative', overflow: mobile ? 'visible' : 'hidden', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(120% 90% at 40% 40%, rgba(60,32,80,0.38) 0%, rgba(9,13,20,0) 60%)' }} />

      <div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 14, flex: '0 0 auto' }}>
        <div style={{ flex: '1 1 420px', minWidth: 280 }}>
          <div style={{ fontFamily: mono, fontSize: mobile ? 12 : 15, letterSpacing: '0.22em', color: '#d67bff', textTransform: 'uppercase' }}>Rovnovážné diagramy</div>
          <div style={{ fontSize: mobile ? 22 : 30, fontWeight: 600, marginTop: 4, letterSpacing: '-0.01em' }}>Metastabilní soustava Fe–Fe₃C</div>
        </div>
        <div style={{ display: 'flex', gap: 8, paddingBottom: 4, flexWrap: 'wrap' }}>{modeBtn('explore', 'Prozkoumat')}{modeBtn('layers', 'Vrstvy')}{modeBtn('konstrukce', 'Konstrukce')}{modeBtn('chladnuti', 'Křivky chladnutí')}{modeBtn('quiz', 'Kvíz')}</div>
      </div>

      <div style={{ position: 'relative', flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: mobile ? 'column' : 'row', gap: mobile ? 18 : 26, marginTop: 12 }}>

        {/* ── diagram ── */}
        <div style={{ flex: mobile ? '0 0 auto' : '1 1 auto', minWidth: 0, minHeight: mobile ? 420 : 0, display: 'flex', borderRadius: 16, border: '1px solid rgba(120,180,230,0.14)', background: 'rgba(120,180,230,0.03)', padding: 8, boxSizing: 'border-box' }}>
          <svg ref={plotRef} viewBox={`0 0 ${PW} ${PH}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%', touchAction: 'none' }}
            onPointerMove={(e) => { if (dragging.current) setFromX(e.clientX); }}
            onPointerUp={() => { dragging.current = false; }}>

            {/* mřížka + osy */}
            {konShow(1) && mode !== 'quiz' && (<React.Fragment>
              {yTicks.map(T => (<line key={T} x1={PAD_L} x2={PW - PAD_R} y1={yOf(T)} y2={yOf(T)} stroke="rgba(140,170,205,0.07)" />))}
              {keyTemps.map(T => <text key={T} x={PAD_L - 8} y={yOf(T) + 4} textAnchor="end" fill={keyTempCol[T]} fontFamily={mono} fontSize={11 * FSU + 1} fontWeight="700">{T}</text>)}
              {[1, 2, 3, 5, 6].map(x => (<line key={x} x1={xOf(x)} x2={xOf(x)} y1={PAD_T} y2={y0} stroke="rgba(140,170,205,0.05)" />))}
              {xKey.map(([x, l]) => (<text key={l} x={xOf(x)} y={y0 + 15} textAnchor={x > 6.2 ? 'end' : 'middle'} fill="#6db3ff" fontFamily={mono} fontSize={11 * FSU + 1} fontWeight="700">{l}</text>))}
            </React.Fragment>)}
            {konOnly(2) && (<React.Fragment>
              <line x1={xOf(C_P)} x2={xOf(C_MAX)} y1={yOf(T_A1)} y2={yOf(T_A1)} stroke="#f4c542" strokeWidth="2.5" />
              <circle cx={xOf(C_S)} cy={yOf(T_A1)} r={4.5} fill="#0e1520" stroke="#f4c542" strokeWidth="2" />
            </React.Fragment>)}
            {konOnly(3) && (<React.Fragment>
              <line x1={xOf(C_E)} x2={xOf(C_MAX)} y1={yOf(T_EUT)} y2={yOf(T_EUT)} stroke="#43e0a0" strokeWidth="2.5" />
              <circle cx={xOf(C_C)} cy={yOf(T_EUT)} r={4.5} fill="#0e1520" stroke="#43e0a0" strokeWidth="2" />
              <line x1={xOf(C_C)} x2={xOf(C_C)} y1={yOf(T_EUT)} y2={y0} stroke="rgba(67,224,160,0.4)" strokeWidth="1.2" strokeDasharray="4 4" />
            </React.Fragment>)}
            {konOnly(4) && (<React.Fragment>
              <path d={dPath(LIQ_L)} fill="none" stroke="#ff7a5c" strokeWidth="2.5" />
              <path d={dPath(LIQ_R)} fill="none" stroke="#ff7a5c" strokeWidth="2.5" />
              {lineLabel(liqL, 1.15, 1.85, 'LIKVIDUS', '#ff7a5c', -8, 4)}
              {lineLabel(liqR, 4.65, 5.25, 'LIKVIDUS', '#ff7a5c', -8, 4)}
            </React.Fragment>)}
            {konOnly(5) && (<React.Fragment>
              <path d={dPath(SOL_AE)} fill="none" stroke="#6db3ff" strokeWidth="2.5" />
              {lineLabel(solAE, 1.0, 1.6, 'SOLIDUS', '#6db3ff', -8, 5)}
            </React.Fragment>)}
            {konOnly(6) && (<React.Fragment>
              <path d={dPath(A3_PTS)} fill="none" stroke="#f4a742" strokeWidth="2.2" />
              <path d={dPath(ACM_PTS)} fill="none" stroke="#f4a742" strokeWidth="2.2" />
              <text x={xOf(0.3) + 7} y={yOf(850) - 4} fill="#f4a742" fontFamily={mono} fontSize={12 * FSU + 1} fontWeight="700">A₃</text>
              <text x={xOf(1.52) - 40} y={yOf(acm(1.52)) - 18} fill="#f4a742" fontFamily={mono} fontSize={12 * FSU + 1} fontWeight="700">A</text>
              <text x={xOf(1.52) - 40 + 11 * FSU} y={yOf(acm(1.52)) - 14} fill="#f4a742" fontFamily={mono} fontSize={9 * FSU + 1} fontWeight="700">CM</text>
            </React.Fragment>)}
            {konOnly(7) && (<React.Fragment>
              <path d={dPath(GP_PTS)} fill="none" stroke="#f4a742" strokeWidth="1.8" />
              <path d={dPath(PQ_PTS)} fill="none" stroke="#f4c542" strokeWidth="1.5" />
            </React.Fragment>)}
            {konOnly(8) && (<React.Fragment>
              {REGIONS.filter(r => ['tav', 'g'].includes(r.id)).map(r => (
                <text key={'A' + r.id} x={xOf(r.label[0])} y={yOf(r.label[1])} textAnchor="middle" fill="#dfe9f4" fontFamily={sans} fontWeight="600" fontSize={16 * r.fs * FSU + 2}>
                  {r.lines.map((ln, i) => <tspan key={i} x={xOf(r.label[0])} dy={i === 0 ? -(r.lines.length - 1) * 0.55 * (16 * r.fs * FSU + 2) / 1 * 0.62 : 16 * r.fs * FSU * 1.22 + 2}>{ln}</tspan>)}
                </text>
              ))}
              <text x={xOf(0.008)} y={yOf(610)} fill="#9fb0c2" fontFamily={sans} fontSize={9 * FSU + 1} transform={`rotate(-90 ${xOf(0.008)} ${yOf(610)})`}>FERIT</text>
            </React.Fragment>)}
            {konOnly(9) && (<React.Fragment>
              <text x={PW - PAD_R - 6} y={yOf(T_EUT) + 18} textAnchor="end" fill="#43e0a0" fontFamily={sans} fontWeight="600" fontSize={13 * FSU + 2}>tav → ledeburit</text>
              <text x={PW - PAD_R - 6} y={yOf(T_A1) + 18} textAnchor="end" fill="#f4c542" fontFamily={sans} fontWeight="600" fontSize={13 * FSU + 2}>austenit → perlit</text>
            </React.Fragment>)}
            <line x1={PAD_L} x2={PAD_L} y1={PAD_T} y2={y0} stroke="#8aa3bd" strokeWidth="1.5" />
            <line x1={PAD_L} x2={PW - PAD_R} y1={y0} y2={y0} stroke="#8aa3bd" strokeWidth="1.5" />
            <text x={PAD_L - 52} y={PAD_T + 12} fill="#8aa3bd" fontFamily={mono} fontSize={10 * FSU + 1} transform={`rotate(-90 ${PAD_L - 52} ${PAD_T + 12})`} textAnchor="end">TEPLOTA (°C)</text>
            <text x={PW - PAD_R} y={y0 - 10} textAnchor="end" fill="#8aa3bd" fontFamily={mono} fontSize={10 * FSU + 1}>KONCENTRACE UHLÍKU (hm. %)</text>

            {showFull && (<React.Fragment>
            {/* oblasti */}
            {REGIONS.map(r => (
              <path key={r.id} d={rPath(r.pts)} fill={regionFill(r)} stroke="none" style={{ ...grp(r.step), cursor: mode === 'layers' ? 'default' : 'pointer', transition: 'fill 0.2s, opacity 0.45s' }}
                onClick={() => onRegionClick(r.id)}
                onMouseEnter={(e) => { if (mode !== 'layers' && !(mode === 'quiz' && quiz && quiz.picked)) e.currentTarget.setAttribute('fill', 'rgba(109,179,255,0.16)'); }}
                onMouseLeave={(e) => e.currentTarget.setAttribute('fill', regionFill(r))} />
            ))}

            {mode !== 'quiz' && (<React.Fragment>
            {/* popisky oblastí */}
            {REGIONS.filter(r => r.label).map(r => (
              <text key={'l' + r.id} x={xOf(r.label[0])} y={yOf(r.label[1])} textAnchor="middle" fill="#dfe9f4" fontFamily={sans} fontWeight="600" fontSize={16 * r.fs * FSU + 2} style={{ ...grp(r.step), pointerEvents: 'none' }} opacity={vis(r.step) ? 0.92 : 0}>
                {r.lines.map((ln, i) => <tspan key={i} x={xOf(r.label[0])} dy={i === 0 ? -(r.lines.length - 1) * 0.55 * (16 * r.fs * FSU + 2) / 1 * 0.62 : 16 * r.fs * FSU * 1.22 + 2}>{ln}</tspan>)}
              </text>
            ))}
            <g style={grp(4)}><text x={xOf(0.008)} y={yOf(610)} fill="#9fb0c2" fontFamily={sans} fontSize={9 * FSU + 1} transform={`rotate(-90 ${xOf(0.008)} ${yOf(610)})`} style={{ pointerEvents: 'none' }}>FERIT</text></g>
            <g style={grp(4)}><text x={xOf(C_S) - 5} y={yOf(563.5)} fill="#dfe9f4" fontFamily={sans} fontWeight="600" fontSize={11 * FSU + 1} transform={`rotate(-90 ${xOf(C_S) - 5} ${yOf(563.5)})`} textAnchor="middle" style={{ pointerEvents: 'none' }} opacity="0.9">PERLIT</text></g>
            <g style={grp(2)}><text x={xOf(C_C) - 5} y={yOf(940)} fill="#dfe9f4" fontFamily={sans} fontWeight="600" fontSize={11 * FSU + 1} transform={`rotate(-90 ${xOf(C_C) - 5} ${yOf(940)})`} textAnchor="middle" style={{ pointerEvents: 'none' }} opacity="0.9">LEDEBURIT</text></g>
            </React.Fragment>)}

            {/* čáry */}
            <g style={grp(1)}>
              <path d={dPath(LIQ_L)} fill="none" stroke="#ff7a5c" strokeWidth="2.5" />
              <path d={dPath(LIQ_R)} fill="none" stroke="#ff7a5c" strokeWidth="2.5" />
            </g>
            {lineLabel(liqL, 1.15, 1.85, 'LIKVIDUS', '#ff7a5c', -8, 1)}
            {lineLabel(liqR, 4.65, 5.25, 'LIKVIDUS', '#ff7a5c', -8, 1)}
            <g style={grp(2)}>
              <path d={dPath(SOL_AE)} fill="none" stroke="#6db3ff" strokeWidth="2.5" />
              <line x1={xOf(C_E)} x2={xOf(C_MAX)} y1={yOf(T_EUT)} y2={yOf(T_EUT)} stroke="#43e0a0" strokeWidth="2.5" />
              {mode !== 'quiz' && (<React.Fragment>
                <text x={xOf(3.15)} y={yOf(T_EUT) - 7} textAnchor="middle" fill="#43e0a0" fontFamily={mono} fontSize={12 * FSU + 1} letterSpacing="0.12em" fontWeight="600">EUTEKTICKÁ PŘÍMKA (1147 °C)</text>
                <line x1={xOf(C_E)} x2={xOf(C_E)} y1={yOf(T_EUT)} y2={y0} stroke="rgba(109,179,255,0.35)" strokeWidth="1.2" strokeDasharray="4 4" />
                <line x1={xOf(C_C)} x2={xOf(C_C)} y1={yOf(T_EUT)} y2={y0} stroke="rgba(214,123,255,0.35)" strokeWidth="1.2" strokeDasharray="4 4" />
              </React.Fragment>)}
            </g>
            {lineLabel(solAE, 1.0, 1.6, 'SOLIDUS', '#6db3ff', -8, 2)}
            <g style={grp(3)}>
              <path d={dPath(A3_PTS)} fill="none" stroke="#f4a742" strokeWidth="2.2" />
              <path d={dPath(GP_PTS)} fill="none" stroke="#f4a742" strokeWidth="1.8" />
              <path d={dPath(ACM_PTS)} fill="none" stroke="#f4a742" strokeWidth="2.2" />
              {mode !== 'quiz' && (<React.Fragment>
                <text x={xOf(0.3) + 7} y={yOf(850) - 4} fill="#f4a742" fontFamily={mono} fontSize={12 * FSU + 1} fontWeight="700">A₃</text>
                <text x={xOf(1.52) - 40} y={yOf(acm(1.52)) - 18} fill="#f4a742" fontFamily={mono} fontSize={12 * FSU + 1} fontWeight="700">A</text>
                <text x={xOf(1.52) - 40 + 11 * FSU} y={yOf(acm(1.52)) - 14} fill="#f4a742" fontFamily={mono} fontSize={9 * FSU + 1} fontWeight="700">CM</text>
                <line x1={xOf(C_S)} x2={xOf(C_S)} y1={yOf(T_A1)} y2={y0} stroke="rgba(109,179,255,0.35)" strokeWidth="1.2" strokeDasharray="4 4" />
              </React.Fragment>)}
            </g>
            <g style={grp(4)}>
              <line x1={xOf(C_P)} x2={xOf(C_MAX)} y1={yOf(T_A1)} y2={yOf(T_A1)} stroke="#f4c542" strokeWidth="2.5" />
              <path d={dPath(PQ_PTS)} fill="none" stroke="#f4c542" strokeWidth="1.5" />
              {mode !== 'quiz' && (<text x={xOf(5.2)} y={yOf(T_A1) - 7} textAnchor="middle" fill="#f4c542" fontFamily={mono} fontSize={12 * FSU + 1} letterSpacing="0.12em" fontWeight="600">EUTEKTOIDNÍ PŘÍMKA A₁ (727 °C)</text>)}
            </g>

            {/* body */}
            {POINTS.map(p => (<g key={p.n} style={grp(PT_STEP[p.n])}>
              {mode !== 'quiz' && (<circle cx={xOf(p.x)} cy={yOf(p.T)} r={4.5} fill="#0e1520" stroke="#43e0a0" strokeWidth="2" style={{ cursor: 'help' }}><title>{p.tip}</title></circle>)}
              {(mode !== 'konstrukce' && mode !== 'chladnuti' && mode !== 'quiz') && (<text x={xOf(p.x) + PT_OFF[p.n][0]} y={yOf(p.T) + PT_OFF[p.n][1]} fill="#eaf2fa" fontFamily={mono} fontSize={13 * FSU + 1} fontWeight="700" style={{ pointerEvents: 'none' }}>{p.n}</text>)}
            </g>))}

            {/* klasifikační lišty */}
            {mode !== 'quiz' && (<g style={grp(5)}>
              {CLASS_BANDS.map((b, i) => {
                const hot = sliderOn && C >= b.x0 && C < b.x1;
                return (<g key={i}>
                  <rect x={xOf(b.x0)} y={y0 + 24} width={xOf(b.x1) - xOf(b.x0)} height={20} rx={4} fill={hot ? b.c : 'rgba(255,255,255,0.04)'} fillOpacity={hot ? 0.28 : 1} stroke={b.c} strokeOpacity={hot ? 0.9 : 0.35} />
                  <text x={(xOf(b.x0) + xOf(b.x1)) / 2} y={y0 + 38} textAnchor="middle" fill={hot ? '#eaf2fa' : b.c} fontFamily={mono} fontSize={9.5 * FSU + 1} letterSpacing="0.06em" fontWeight={hot ? 700 : 500}>{b.l}</text>
                </g>);
              })}
              {GROUP_BANDS.map((b, i) => {
                const hot = sliderOn && C >= b.x0 && C < b.x1;
                return (<g key={i}>
                  <rect x={xOf(b.x0)} y={y0 + 50} width={xOf(b.x1) - xOf(b.x0)} height={20} rx={4} fill={hot ? b.c : 'rgba(255,255,255,0.04)'} fillOpacity={hot ? 0.22 : 1} stroke={b.c} strokeOpacity={hot ? 0.8 : 0.3} />
                  <text x={(xOf(b.x0) + xOf(b.x1)) / 2} y={y0 + 64} textAnchor="middle" fill={hot ? '#eaf2fa' : b.c} fontFamily={mono} fontSize={10 * FSU + 1} letterSpacing="0.1em" fontWeight={hot ? 700 : 500}>{b.l}</text>
                </g>);
              })}
            </g>)}
            {mode === 'quiz' && (<React.Fragment>
              {CURVES.map(c => c.segs.map((seg, si) => {
                const isCorrect = qCur && qCur.type === 'curve' && c.id === qCur.id;
                const isWrongPick = quiz && quiz.picked && quiz.picked.type === 'curve' && c.id === quiz.picked.id;
                const show = quiz && quiz.picked && (isCorrect || isWrongPick);
                const revHi = qCur && qCur.type === 'curve_r' && c.id === qCur.id;
                return (<path key={c.id + si} d={dPath(seg)} fill="none" stroke={revHi ? '#f4c542' : show ? (isCorrect ? '#43e0a0' : '#ff5c5c') : 'transparent'} strokeWidth={revHi || show ? 6 : 18} strokeOpacity={revHi || show ? 0.85 : 0} style={{ pointerEvents: 'stroke', cursor: qCur && qCur.type === 'curve' ? 'pointer' : 'default' }} onClick={() => { if (qCur && qCur.type === 'curve') onAnswerClick('curve', c.id); }} />);
              }))}
              {POINTS.filter(p => BAND_POINTS.includes(p.n)).map(p => {
                const isCorrect = qCur && qCur.type === 'point' && p.n === qCur.id;
                const isWrongPick = quiz && quiz.picked && quiz.picked.type === 'point' && p.n === quiz.picked.id;
                const revHi = qCur && qCur.type === 'point_r' && p.n === qCur.id;
                return (<g key={'qp' + p.n}>
                  {(revHi || (quiz && quiz.picked && (isCorrect || isWrongPick))) && <circle cx={xOf(p.x)} cy={yOf(p.T)} r={7} fill={revHi ? '#f4c542' : isCorrect ? '#43e0a0' : '#ff5c5c'} opacity={0.9} />}
                  <circle cx={xOf(p.x)} cy={yOf(p.T)} r={16} fill="transparent" style={{ cursor: qCur && qCur.type === 'point' ? 'pointer' : 'default' }} onClick={() => { if (qCur && qCur.type === 'point') onAnswerClick('point', p.n); }} />
                </g>);
              })}
              {qCur && qCur.type === 'band' && (<g>
                {CLASS_BANDS.map((b, i) => {
                  const isCorrect = b.id === qCur.id;
                  const isWrongPick = quiz.picked && quiz.picked.type === 'band' && b.id === quiz.picked.id;
                  const show = quiz.picked && (isCorrect || isWrongPick);
                  return (<rect key={'qcb' + b.id} x={xOf(b.x0)} y={y0 + 24} width={xOf(b.x1) - xOf(b.x0)} height={20} rx={4} fill={show ? (isCorrect ? '#43e0a0' : '#ff5c5c') : 'rgba(255,255,255,0.04)'} fillOpacity={show ? 0.32 : 1} stroke={show ? (isCorrect ? '#43e0a0' : '#ff5c5c') : 'rgba(255,255,255,0.25)'} style={{ cursor: 'pointer' }} onClick={() => onAnswerClick('band', b.id)} />);
                })}
                {GROUP_BANDS.map((b, i) => {
                  const isCorrect = b.id === qCur.id;
                  const isWrongPick = quiz.picked && quiz.picked.type === 'band' && b.id === quiz.picked.id;
                  const show = quiz.picked && (isCorrect || isWrongPick);
                  return (<rect key={'qgb' + b.id} x={xOf(b.x0)} y={y0 + 50} width={xOf(b.x1) - xOf(b.x0)} height={20} rx={4} fill={show ? (isCorrect ? '#43e0a0' : '#ff5c5c') : 'rgba(255,255,255,0.04)'} fillOpacity={show ? 0.28 : 1} stroke={show ? (isCorrect ? '#43e0a0' : '#ff5c5c') : 'rgba(255,255,255,0.2)'} style={{ cursor: 'pointer' }} onClick={() => onAnswerClick('band', b.id)} />);
                })}
              </g>)}
              {qCur && qCur.type === 'band_r' && (<g>
                {CLASS_BANDS.concat(GROUP_BANDS).filter(b => b.id === qCur.id).map(b => (<rect key={'qrb' + b.id} x={xOf(b.x0)} y={y0 + 24} width={xOf(b.x1) - xOf(b.x0)} height={46} rx={4} fill="#f4c542" fillOpacity={0.3} stroke="#f4c542" />))}
              </g>)}
              {qCur && qCur.type === 'region_r' && (() => { const r = REGIONS.find(x => x.id === qCur.id); return r ? (<path d={rPath(r.pts)} fill="none" stroke="#f4c542" strokeWidth={3} strokeOpacity={0.9} style={{ pointerEvents: 'none' }} />) : null; })()}
            </React.Fragment>)}
            </React.Fragment>)}

            {/* táhlo složení */}
            {sliderOn && (<g>
              <line x1={xOf(C)} x2={xOf(C)} y1={PAD_T} y2={y0 + 70} stroke="#f4c542" strokeWidth="2" strokeDasharray="6 4" opacity="0.9" />
              <line x1={xOf(C)} x2={xOf(C)} y1={PAD_T} y2={y0 + 70} stroke="transparent" strokeWidth="22" style={{ cursor: 'ew-resize' }}
                onPointerDown={(e) => { e.preventDefault(); dragging.current = true; e.currentTarget.ownerSVGElement.setPointerCapture(e.pointerId); setFromX(e.clientX); }} />
              <g style={{ cursor: 'ew-resize' }} onPointerDown={(e) => { e.preventDefault(); dragging.current = true; e.currentTarget.ownerSVGElement.setPointerCapture(e.pointerId); }}>
                <rect x={xOf(C) - 33} y={PAD_T - 16} width={66} height={24} rx={12} fill="#f4c542" />
                <text x={xOf(C)} y={PAD_T + 1} textAnchor="middle" fill="#231d16" fontFamily={mono} fontSize="13" fontWeight="700">{fmtC} %</text>
              </g>
            </g>)}
          </svg>
        </div>

        {/* ── panel ── */}
        <div style={{ flex: mobile ? '0 0 auto' : '0 0 330px', width: mobile ? '100%' : 330, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, overflowY: mobile ? 'visible' : 'auto', paddingRight: 2 }}>

          {mode === 'explore' && (<React.Fragment>
            <div style={{ borderRadius: 14, border: '1px solid rgba(120,180,230,0.16)', background: 'rgba(120,180,230,0.05)', padding: '14px 16px' }}>
              <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.18em', color: '#9fb0c2', textTransform: 'uppercase' }}>Zvolená slitina</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
                <div style={{ fontFamily: mono, fontSize: 26, fontWeight: 700, color: '#f4c542' }}>{fmtC} % C</div>
              </div>
              <div style={{ marginTop: 2, fontSize: 14.5, fontWeight: 600, color: cls.c }}>{cls.n}</div>
            </div>
            <div style={{ borderRadius: 14, border: '1px solid rgba(120,180,230,0.16)', background: 'rgba(120,180,230,0.03)', padding: '14px 16px' }}>
              <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.18em', color: '#9fb0c2', textTransform: 'uppercase', marginBottom: 8 }}>Průběh ochlazování</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {seq.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '5px 0', borderTop: i ? '1px solid rgba(255,255,255,0.06)' : 'none', alignItems: 'baseline' }}>
                    <div style={{ fontFamily: mono, fontSize: 11.5, color: s.ev ? s.col : '#8aa3bd', flex: '0 0 96px' }}>{s.r}</div>
                    <div style={{ fontSize: 13, color: s.ev ? s.col : '#dfe9f4', fontWeight: s.ev ? 600 : 400, lineHeight: 1.35 }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ borderRadius: 14, border: '1px solid rgba(120,180,230,0.16)', background: 'rgba(120,180,230,0.03)', padding: '14px 16px' }}>
              <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.18em', color: '#9fb0c2', textTransform: 'uppercase', marginBottom: 8 }}>{selRegion ? 'Vybraná oblast' : 'Klikněte na oblast diagramu'}</div>
              {selRegion ? (<div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#bcdcff', marginBottom: 6 }}>{selRegion.name}</div>
                <div style={{ fontSize: 13.5, lineHeight: 1.5, color: '#c6d3e0', marginBottom: 10 }}>{selRegion.desc}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{selRegion.str.map((s, i) => chip(s, i))}</div>
              </div>) : (<div style={{ fontSize: 13, color: '#8aa3bd', lineHeight: 1.5 }}>Zobrazí se popis fázového pole. Kliknutím na název struktury otevřete nápovědu s jejím schématem.</div>)}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '2px 2px 8px' }}>
              {Object.keys(STRUKTURY).map((s, i) => chip(s, i))}
            </div>
          </React.Fragment>)}

          {mode === 'layers' && (<React.Fragment>
            <div style={{ borderRadius: 14, border: '1px solid rgba(120,180,230,0.16)', background: 'rgba(120,180,230,0.05)', padding: '16px 18px', flex: '0 0 auto' }}>
              <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.18em', color: '#9fb0c2', textTransform: 'uppercase' }}>Krok {step + 1} / {STEPS.length}</div>
              <div style={{ fontSize: 17, fontWeight: 600, color: '#bcdcff', margin: '6px 0 8px' }}>{STEPS[step].t}</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.55, color: '#c6d3e0' }}>{STEPS[step].d}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.05)', color: step === 0 ? '#5f7186' : '#e8ecf3', fontFamily: sans, fontSize: 13.5, fontWeight: 600, cursor: step === 0 ? 'default' : 'pointer' }}>← Předchozí</button>
                <button onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))} disabled={step === STEPS.length - 1} style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: '1px solid rgba(109,179,255,0.5)', background: step === STEPS.length - 1 ? 'rgba(255,255,255,0.04)' : 'rgba(109,179,255,0.2)', color: step === STEPS.length - 1 ? '#5f7186' : '#bcdcff', fontFamily: sans, fontSize: 13.5, fontWeight: 600, cursor: step === STEPS.length - 1 ? 'default' : 'pointer' }}>Další →</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              {STEPS.map((_, i) => <button key={i} onClick={() => setStep(i)} style={{ flex: 1, height: 6, borderRadius: 3, border: 'none', cursor: 'pointer', background: i <= step ? '#6db3ff' : 'rgba(255,255,255,0.1)' }} />)}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 2px' }}>
              {Object.keys(STRUKTURY).map((s, i) => chip(s, i))}
            </div>
          </React.Fragment>)}

          {mode === 'konstrukce' && (<React.Fragment>
            <div style={{ borderRadius: 14, border: '1px solid rgba(120,180,230,0.16)', background: 'rgba(120,180,230,0.05)', padding: '16px 18px', flex: '0 0 auto', display: 'flex', flexDirection: 'column', minHeight: 232 }}>
              <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.18em', color: '#9fb0c2', textTransform: 'uppercase' }}>{kStep === 0 ? 'Výchozí stav' : `Krok ${konLabel(kStep - 1)} / ${konLabel(KON_ALL_STEPS.length - 1)}`}</div>
              <div style={{ fontSize: 17, fontWeight: 600, color: '#bcdcff', margin: '6px 0 8px' }}>{kStep === 0 ? 'Prázdná plocha' : KON_ALL_STEPS[kStep - 1].t}</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.55, color: '#c6d3e0', flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: kStep === KON_ALL_STEPS.length && eggVisible ? 'center' : 'flex-start' }}>
                {kStep === 0 ? 'Na začátku je jen souřadnicová soustava: vodorovná osa (koncentrace uhlíku) a svislá osa (teplota).'
                  : kStep === KON_ALL_STEPS.length ? (eggVisible ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <div style={{ padding: '5px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)', fontSize: 13, fontWeight: 600, color: '#eaf2fa' }}>SKIBIDI :-)</div>
                      <style>{`@keyframes atomBounce { 0%,100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-7px) rotate(180deg); } }`}</style>
                      <svg width="56" height="56" viewBox="-26 -26 52 52" style={{ animation: 'atomBounce 1.6s ease-in-out infinite' }}>
                        <ellipse cx="0" cy="0" rx="22" ry="8" fill="none" stroke="#6db3ff" strokeWidth="1.6" />
                        <ellipse cx="0" cy="0" rx="22" ry="8" fill="none" stroke="#43e0a0" strokeWidth="1.6" transform="rotate(60)" />
                        <ellipse cx="0" cy="0" rx="22" ry="8" fill="none" stroke="#f4c542" strokeWidth="1.6" transform="rotate(120)" />
                        <circle cx="0" cy="0" r="7" fill="#f4a742" />
                      </svg>
                    </div>
                  ) : null) : KON_ALL_STEPS[kStep - 1].d}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button onClick={() => setKStep(Math.max(0, kStep - 1))} disabled={kStep === 0} style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.05)', color: kStep === 0 ? '#5f7186' : '#e8ecf3', fontFamily: sans, fontSize: 13.5, fontWeight: 600, cursor: kStep === 0 ? 'default' : 'pointer' }}>← Předchozí</button>
                <button onClick={() => setKStep(Math.min(KON_ALL_STEPS.length, kStep + 1))} disabled={kStep === KON_ALL_STEPS.length} style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: '1px solid rgba(109,179,255,0.5)', background: kStep === KON_ALL_STEPS.length ? 'rgba(255,255,255,0.04)' : 'rgba(109,179,255,0.2)', color: kStep === KON_ALL_STEPS.length ? '#5f7186' : '#bcdcff', fontFamily: sans, fontSize: 13.5, fontWeight: 600, cursor: kStep === KON_ALL_STEPS.length ? 'default' : 'pointer' }}>Další →</button>
              </div>
            </div>
            <div style={{ borderRadius: 14, border: '1px solid rgba(120,180,230,0.16)', background: 'rgba(120,180,230,0.03)', padding: '14px 16px' }}>
              <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.18em', color: '#9fb0c2', textTransform: 'uppercase', marginBottom: 8 }}>Postup</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {KON_ALL_STEPS.map((s, i) => (
                  <div key={i} onClick={() => setKStep(i + 1)} style={{ display: 'flex', gap: 10, padding: '7px 0', borderTop: i ? '1px solid rgba(255,255,255,0.06)' : 'none', alignItems: 'baseline', cursor: 'pointer' }}>
                    <div style={{ fontFamily: mono, fontSize: 12.5, color: '#6db3ff', flex: '0 0 20px' }}>{konLabel(i)}.</div>
                    <div style={{ fontSize: 13.5, color: i === kStep - 1 ? '#bcdcff' : '#c6d3e0', fontWeight: i === kStep - 1 ? 700 : 400, lineHeight: 1.35 }}>{s.t}</div>
                  </div>
                ))}
              </div>
            </div>
          </React.Fragment>)}
          {mode === 'chladnuti' && (() => {
            const PANW = 312, PL = 52, PR = 14;
            const cc = coolCurve(C);
            const tx = (t) => PL + (t / cc.tot) * (PANW - PL - PR);
            let d = '';
            cc.segs.forEach((s, i) => {
              const x0 = tx(s.t0), x1 = tx(s.t1), ya = yOf(s.T0), yb = yOf(s.T1);
              if (i === 0) d += `M${x0.toFixed(1)},${ya.toFixed(1)}`;
              d += ` L${x1.toFixed(1)},${yb.toFixed(1)}`;
            });
            const bts = [T_EUT, T_A1].filter(T => cc.segs.some(s => Math.abs(s.T0 - T) < 3 || Math.abs(s.T1 - T) < 3));
            cc.segs.forEach(s => { [s.T0, s.T1].forEach(T => { if (T < T_MAX - 5 && T > T_MIN + 5 && !bts.some(b => Math.abs(yOf(b) - yOf(T)) < 14)) bts.push(T); }); });
            const tCol = (T) => Math.abs(T - T_EUT) < 3 ? '#43e0a0' : Math.abs(T - T_A1) < 3 ? '#f4c542' : '#8fc7ff';
            return (<div style={{ flex: '1 1 auto', minHeight: mobile ? 420 : 0, display: 'flex', borderRadius: 16, border: '1px solid rgba(120,180,230,0.14)', background: 'rgba(120,180,230,0.03)', padding: 8, boxSizing: 'border-box' }}>
              <svg viewBox={`0 0 ${PANW} ${PH}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%' }}>
                <text x={PANW - PR} y={PAD_T - 4} textAnchor="end" fill="#8aa3bd" fontFamily={mono} fontSize="10" letterSpacing="0.16em">KŘIVKA CHLADNUTÍ</text>
                {bts.map((T, i) => (<g key={i}>
                  <line x1={PL} x2={PANW - PR} y1={yOf(T)} y2={yOf(T)} stroke={tCol(T)} strokeOpacity="0.18" strokeDasharray="3 4" />
                  <text x={PL - 5} y={yOf(T) + 3.5} textAnchor="end" fill={tCol(T)} fontFamily={mono} fontSize="10" fontWeight="700">{Math.round(T)}</text>
                </g>))}
                <line x1={PL} x2={PL} y1={PAD_T} y2={y0} stroke="#8aa3bd" strokeWidth="1.5" />
                <line x1={PL} x2={PANW - PR} y1={y0} y2={y0} stroke="#8aa3bd" strokeWidth="1.5" />
                <path d={`M${PANW - PR - 7},${y0 - 3.5} L${PANW - PR},${y0} L${PANW - PR - 7},${y0 + 3.5}`} fill="none" stroke="#8aa3bd" strokeWidth="1.5" />
                <text x={PANW - PR} y={y0 + 15} textAnchor="end" fill="#8aa3bd" fontFamily={mono} fontSize="9.5">ČAS (SCHEMATICKY)</text>
                <path d={d} fill="none" stroke="#eaf2fa" strokeWidth="2.2" strokeLinejoin="round" />
                {cc.segs.filter(s => s.kind === 'halt').map((s, i) => (<g key={'h' + i}>
                  <line x1={tx(s.t0)} x2={tx(s.t1)} y1={yOf(s.T0)} y2={yOf(s.T0)} stroke={s.col} strokeWidth="3.5" />
                  <text x={(tx(s.t0) + tx(s.t1)) / 2} y={yOf(s.T0) - 7} textAnchor="middle" fill={s.col} fontFamily={sans} fontSize="10.5" fontWeight="600">{s.lab}</text>
                </g>))}
                {cc.segs.map((s, i) => (i > 0 ? <circle key={'k' + i} cx={tx(s.t0)} cy={yOf(s.T0)} r="2.8" fill="#0e1520" stroke="#8fc7ff" strokeWidth="1.6" /> : null))}
                {cc.segs.filter(s => s.kind === 'cool' && (tx(s.t1) - tx(s.t0)) + Math.abs(yOf(s.T1) - yOf(s.T0)) > 34).map((s, i, arr) => {
                  const haltYs = cc.segs.filter(h => h.kind === 'halt').map(h => yOf(h.T0) - 7);
                  let fr = 0.5, my = (yOf(s.T0) + yOf(s.T1)) / 2;
                  if (haltYs.some(hy => Math.abs(my - hy) < 13)) { fr = 0.3; my = yOf(s.T0) + 0.3 * (yOf(s.T1) - yOf(s.T0)); }
                  const mx = tx(s.t0) + fr * (tx(s.t1) - tx(s.t0)), flip = mx + 7 + s.lab.length * 5.2 > PANW - PR;
                  return (<text key={'c' + i} x={flip ? mx - 7 : mx + 7} y={my + (flip ? -6 : 2)} textAnchor={flip ? 'end' : 'start'} fill="#9fb0c2" fontFamily={sans} fontSize="10">{s.lab}</text>);
                })}
                <text x={PL} y={y0 + 40} fill="#f4c542" fontFamily={mono} fontSize="15" fontWeight="700">{fmtC} % C</text>
                <text x={PL} y={y0 + 58} fill={cls.c} fontFamily={sans} fontSize="12" fontWeight="600">{cls.n}</text>
                <text x={PL} y={y0 + 76} fill="#8aa3bd" fontFamily={sans} fontSize="10.5">Táhněte žlutým táhlem v diagramu —</text>
                <text x={PL} y={y0 + 90} fill="#8aa3bd" fontFamily={sans} fontSize="10.5">křivka se mění podle % C.</text>
              </svg>
            </div>);
          })()}

          {mode === 'quiz' && quiz && (<React.Fragment>
            {!quiz.done ? (<div style={{ borderRadius: 14, border: '1px solid rgba(120,180,230,0.16)', background: 'rgba(120,180,230,0.05)', padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: 11, letterSpacing: '0.16em', color: '#9fb0c2', textTransform: 'uppercase' }}>
                <span>Otázka {quiz.i + 1} / {quiz.order.length}</span><span>Skóre {quiz.score}</span>
              </div>
              <div style={{ fontSize: 14, color: '#c6d3e0', margin: '12px 0 6px' }}>{qCur.type === 'region' ? 'Klikněte v diagramu na oblast:' : qCur.type === 'curve' ? 'Klikněte v diagramu na křivku:' : qCur.type === 'band' ? 'Klikněte v diagramu na pás složení:' : qCur.type === 'num' ? 'Vyberte správnou hodnotu:' : qCur.type.endsWith('_r') ? 'Co znázorňuje zvýrazněné místo v diagramu?' : 'Klikněte v diagramu na bod:'}</div>
              {!qCur.type.endsWith('_r') && (<div style={{ fontSize: 17, fontWeight: 700, color: '#f4c542', lineHeight: 1.4 }}>{qCur.name.toUpperCase()}</div>)}
              {(qCur.type === 'num' || qCur.type.endsWith('_r')) && (<div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {qCur.options.map(opt => {
                  const isCorrect = opt === qCur.correct;
                  const isPicked = quiz.picked && quiz.picked.id === opt;
                  const show = quiz.picked && (isCorrect || isPicked);
                  return (<button key={opt} disabled={!!quiz.picked} onClick={() => onAnswerClick(qCur.type, opt)} style={{ flex: qCur.type === 'num' ? 1 : '1 1 auto', padding: '10px 12px', borderRadius: 10, border: '1px solid ' + (show ? (isCorrect ? '#43e0a0' : '#ff5c5c') : 'rgba(120,180,230,0.35)'), background: show ? (isCorrect ? 'rgba(67,224,160,0.22)' : 'rgba(255,92,92,0.22)') : 'rgba(120,180,230,0.08)', color: show ? (isCorrect ? '#43e0a0' : '#ff5c5c') : '#eaf2fa', fontFamily: qCur.type === 'num' ? mono : sans, fontSize: qCur.type === 'num' ? 15 : 13, fontWeight: 700, cursor: quiz.picked ? 'default' : 'pointer' }}>{opt}</button>);
                })}
              </div>)}
              {quiz.picked && (<div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: (quiz.picked.type === qCur.type && (isTextType(qCur.type) ? quiz.picked.id === qCur.correct : quiz.picked.id === qCur.id)) ? '#43e0a0' : '#ff5c5c' }}>{(quiz.picked.type === qCur.type && (isTextType(qCur.type) ? quiz.picked.id === qCur.correct : quiz.picked.id === qCur.id)) ? '✓ Správně!' : '✗ Špatně — správná odpověď svítí zeleně.'}</div>
                <button onClick={quizNext} style={{ marginTop: 10, width: '100%', padding: '10px 0', borderRadius: 10, border: '1px solid rgba(109,179,255,0.5)', background: 'rgba(109,179,255,0.2)', color: '#bcdcff', fontFamily: sans, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{quiz.i + 1 >= quiz.order.length ? 'Vyhodnotit' : 'Další otázka →'}</button>
              </div>)}
            </div>) : (<div style={{ borderRadius: 14, border: '1px solid rgba(120,180,230,0.16)', background: 'rgba(120,180,230,0.05)', padding: '18px', textAlign: 'center' }}>
              <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.18em', color: '#9fb0c2', textTransform: 'uppercase' }}>Výsledek</div>
              <div style={{ fontSize: 34, fontWeight: 700, color: quiz.score >= 6 ? '#43e0a0' : quiz.score >= 4 ? '#f4c542' : '#ff8a5c', margin: '10px 0' }}>{quiz.score} / {quiz.order.length}</div>
              <div style={{ fontSize: 13.5, color: '#c6d3e0', marginBottom: 14 }}>{quiz.score >= 7 ? 'Výborně — diagram máte v malíku!' : quiz.score >= 4 ? 'Dobré — projděte si oblasti ještě v režimu Prozkoumat.' : 'Zkuste si diagram nejdřív projít ve Vrstvách.'}</div>
              <button onClick={startQuiz} style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: '1px solid rgba(109,179,255,0.5)', background: 'rgba(109,179,255,0.2)', color: '#bcdcff', fontFamily: sans, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Hrát znovu</button>
            </div>)}
            <div style={{ fontSize: 12.5, color: '#8aa3bd', lineHeight: 1.5, padding: '0 4px' }}>Tip: otázky se týkají oblastí, křivek i bodů diagramu.</div>
          </React.Fragment>)}
        </div>
      </div>

      {/* ── nápověda struktury ── */}
      {struct && (<div onClick={() => setStruct(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(4,6,10,0.66)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: 380, maxWidth: '92vw', borderRadius: 18, border: '1px solid rgba(120,180,230,0.25)', background: '#0e1520', padding: '20px 22px', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 18, fontWeight: 700, color: '#eaf2fa' }}>
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: STRUKTURY[struct].color }} />{STRUKTURY[struct].name}
            </div>
            <button onClick={() => setStruct(null)} style={{ border: 'none', background: 'rgba(255,255,255,0.08)', color: '#e8ecf3', width: 30, height: 30, borderRadius: '50%', fontSize: 15, cursor: 'pointer', lineHeight: 1 }}>✕</button>
          </div>
          <StructSketch id={struct} />
          <div style={{ fontSize: 14, lineHeight: 1.6, color: '#c6d3e0', marginTop: 12 }}>{STRUKTURY[struct].def}</div>
        </div>
      </div>)}
    </div>
  );
}
window.FeFe3CDiagram = FeFe3CDiagram;
