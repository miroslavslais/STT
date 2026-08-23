// sablona-diagram.jsx — VÝCHOZÍ ŠABLONA pro stránky typu "graf + postranní panel + posuvníky"
// (jako ARA diagram, IRA diagram, Popouštěcí diagram). Zkopíruj tento soubor i jeho .dc.html
// dvojče, přejmenuj, a uprav jen věci označené KOMENTÁŘEM "← uprav". Neměň rozměry/marže mimo
// vyznačená místa – jsou vyladěné, aby se stránka vešla na výšku obrazovky (100vh) bez scrollu
// a aby vypadala stejně jako ostatní diagramy.
//
// Struktura, kterou NEMĚNIT (jinak se rozjede vzhled oproti ostatním stránkám):
//  - outer div: height:'100vh' (desktop) / auto (mobil), padding-top 58px (aby nadpis nebyl
//    pod tlačítkem "Zpět na přehled", které je fixed top:16 left:16 v .dc.html wrapperu)
//  - "main" řádek: flex:1 1 auto, minHeight:0 → nechává grafu přesně tolik místa, kolik zbyde
//  - graf: <svg preserveAspectRatio="xMidYMid meet" width:100% height:100%> uvnitř
//    display:flex kontejneru s minHeight:0 → graf se NIKDY nepřetáhne mimo obrazovku,
//    ať je monitor jakkoli široký
//  - postranní panel: fixed 300px šířka (stejná na všech diagramech)
//  - slidery: vlastní divy (dráha/výplň/puntík) + skrytý <input type=range opacity:0> navrch.
//    NIKDY nestylovat nativní ::-webkit-slider-thumb / track — v různých prohlížečích/OS
//    vypadá jinak nebo se vůbec nezobrazí. Zkopíruj slider blok tak, jak je.

function SablonaDiagram(props) {
  const mono = "'IBM Plex Mono', monospace";
  const sans = "'IBM Plex Sans', system-ui, sans-serif";

  const [vw, setVw] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  React.useEffect(() => { const onR = () => setVw(window.innerWidth); window.addEventListener('resize', onR); return () => window.removeEventListener('resize', onR); }, []);
  const mobile = vw < 860;

  // ── DATA / STAV — uprav podle potřeby ← uprav ─────────────────────────────
  const [A, setA] = React.useState(0.5);   // 1. posuvník (0–1)
  const [B, setB] = React.useState(0.3);   // 2. posuvník (0–1)

  // ── legenda — uprav popisky/barvy ← uprav ─────────────────────────────────
  const legendItems = [
    ['fáze 1', '#5fc0ef'],
    ['fáze 2', '#7fe0cc'],
    ['fáze 3', '#c6caf2'],
  ];

  // ── geometrie grafu (viewBox) — poměr stran nech, hodnoty uprav ← uprav ────
  const PW = 760, PH = 560, PAD_L = 78, PAD_R = 26, PAD_T = 26, PAD_B = 46;
  const plotW = PW - PAD_L - PAD_R, plotH = PH - PAD_T - PAD_B;

  return (
    <div style={{ width: '100%', height: mobile ? 'auto' : '100vh', minHeight: '100vh', background: '#080b12', color: '#eaf2fa', boxSizing: 'border-box',
      padding: mobile ? '40px 14px 20px' : '58px 52px 20px', display: 'flex', flexDirection: 'column', fontFamily: sans, position: 'relative', overflow: mobile ? 'visible' : 'hidden' }}>

      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(120% 90% at 42% 44%, rgba(30,52,80,0.45) 0%, rgba(9,13,20,0) 62%)' }} />

      {/* header — uprav text ← uprav */}
      <div style={{ position: 'relative', flex: '0 0 auto' }}>
        <div style={{ fontFamily: mono, fontSize: mobile ? 13 : 16, letterSpacing: '0.24em', color: '#5fc0ef', textTransform: 'uppercase' }}>Sekce · Název šablony</div>
        <div style={{ fontSize: mobile ? 24 : 32, fontWeight: 600, marginTop: 6, letterSpacing: '-0.01em' }}>Titulek diagramu</div>
      </div>

      {/* legend — NEMĚNIT marginTop (8) */}
      <div style={{ position: 'relative', flex: '0 0 auto', marginTop: 8, display: 'flex', gap: 24, flexWrap: 'wrap', fontFamily: mono, fontSize: 14.5, color: '#aebfcf' }}>
        {legendItems.map(([lab, bg]) => (
          <span key={lab} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ width: 14, height: 14, borderRadius: 3, background: bg }} />
            {lab}
          </span>
        ))}
      </div>

      {/* main — NEMĚNIT flex/minHeight/marginTop */}
      <div style={{ position: 'relative', flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: mobile ? 'column' : 'row', gap: mobile ? 20 : 32, marginTop: 10 }}>

        {/* graf — NEMĚNIT display/flex/minHeight na wrapperu ani preserveAspectRatio na svg */}
        <div style={{ flex: mobile ? '0 0 auto' : '1 1 auto', minWidth: 0, minHeight: mobile ? 320 : 0, display: 'flex', borderRadius: 16, border: '1px solid rgba(120,180,230,0.14)', background: 'rgba(120,180,230,0.03)', padding: 10, boxSizing: 'border-box' }}>
          <svg viewBox={`0 0 ${PW} ${PH}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: mobile ? 'auto' : '100%', display: 'block' }}>
            {/* osy — placeholder, nahraď vlastní kresbou ← uprav */}
            <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + plotH} stroke="rgba(150,180,210,0.25)" strokeWidth={1.3} />
            <line x1={PAD_L} y1={PAD_T + plotH} x2={PAD_L + plotW} y2={PAD_T + plotH} stroke="rgba(150,180,210,0.25)" strokeWidth={1.3} />
            {/* ukázková křivka ← uprav */}
            <path d={`M ${PAD_L} ${PAD_T + plotH * (1 - A)} L ${PAD_L + plotW} ${PAD_T + plotH * (1 - B)}`} fill="none" stroke="#5fc0ef" strokeWidth={2.4} />
          </svg>
        </div>

        {/* postranní panel — NEMĚNIT šířku (300px) a strukturu, uprav jen obsah ← uprav */}
        <div style={{ flex: mobile ? '0 0 auto' : '0 0 300px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ borderRadius: 16, border: '1px solid rgba(120,180,230,0.14)', background: 'rgba(120,180,230,0.03)', aspectRatio: '600/500', position: 'relative', overflow: 'hidden' }}>
            <svg viewBox="0 0 600 500" style={{ width: '100%', height: '100%', display: 'block' }}>
              {/* náhled výsledné struktury — placeholder ← uprav */}
              <rect x="0" y="0" width="600" height="500" fill="rgba(120,180,230,0.08)" />
            </svg>
          </div>

          <div style={{ padding: '13px 16px', borderRadius: 12, background: 'rgba(120,180,230,0.05)', border: '1px solid rgba(120,180,230,0.16)', minHeight: 128, boxSizing: 'border-box' }}>
            <div style={{ fontFamily: mono, fontSize: 12, letterSpacing: '0.18em', color: '#7fb4d6', textTransform: 'uppercase' }}>Struktura v bodě</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4, lineHeight: 1.3 }}>Výsledek ← uprav</div>
            <div style={{ fontSize: 13.5, color: '#aebfcf', marginTop: 4, lineHeight: 1.4 }}>Popisek ← uprav</div>
          </div>
        </div>
      </div>

      {/* bottom sliders — NEMĚNIT marginTop(10)/gap(9) ani strukturu slideru */}
      <div style={{ position: 'relative', flex: '0 0 auto', marginTop: 10, display: 'flex', flexDirection: 'column', gap: 9 }}>

        {/* 1. posuvník — vzor NEMĚNIT, jen barvu/rozsah/label ← uprav */}
        <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', alignItems: mobile ? 'stretch' : 'center', gap: mobile ? 6 : 18 }}>
          <div style={{ flex: mobile ? '0 0 auto' : '0 0 190px', fontFamily: mono, fontSize: 14, color: '#aebfcf' }}>Popisek A
            <span style={{ color: '#eaf2fa', fontSize: 17, marginLeft: 8 }}>{A.toFixed(2)}</span>
          </div>
          <div style={{ flex: '1 1 auto', position: 'relative', height: 16, display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, height: 6, borderRadius: 3, background: 'rgba(120,180,230,0.18)' }} />
            <div style={{ position: 'absolute', left: 0, height: 6, borderRadius: 3, width: `${A * 100}%`, background: '#5fc0ef' }} />
            <div style={{ position: 'absolute', left: `${A * 100}%`, top: '50%', width: 16, height: 16, borderRadius: '50%',
              background: '#5fc0ef', border: '2px solid #0b0e15', transform: 'translate(-50%, -50%)', pointerEvents: 'none',
              animation: 'pulseThumb 1.7s ease-in-out infinite' }} />
            <input type="range" min={0} max={1} value={A} step={0.01}
                   onChange={(e) => setA(Number(e.target.value))}
                   style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', margin: 0, opacity: 0, cursor: 'pointer' }} />
          </div>
          <div style={{ flex: mobile ? '0 0 auto' : '0 0 178px', textAlign: mobile ? 'left' : 'right', fontFamily: mono, fontSize: 13.5, color: '#cdd8e2' }}>stav</div>
        </div>

        {/* 2. posuvník — stejný vzor ← uprav */}
        <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', alignItems: mobile ? 'stretch' : 'center', gap: mobile ? 6 : 18 }}>
          <div style={{ flex: mobile ? '0 0 auto' : '0 0 190px', fontFamily: mono, fontSize: 14, color: '#aebfcf' }}>Popisek B
            <span style={{ color: '#eaf2fa', fontSize: 17, marginLeft: 8 }}>{B.toFixed(2)}</span>
          </div>
          <div style={{ flex: '1 1 auto', position: 'relative', height: 16, display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, height: 6, borderRadius: 3, background: 'rgba(120,180,230,0.18)' }} />
            <div style={{ position: 'absolute', left: 0, height: 6, borderRadius: 3, width: `${B * 100}%`, background: '#e5703b' }} />
            <div style={{ position: 'absolute', left: `${B * 100}%`, top: '50%', width: 16, height: 16, borderRadius: '50%',
              background: '#e5703b', border: '2px solid #0b0e15', transform: 'translate(-50%, -50%)', pointerEvents: 'none',
              animation: 'pulseThumb 1.7s ease-in-out infinite' }} />
            <input type="range" min={0} max={1} value={B} step={0.01}
                   onChange={(e) => setB(Number(e.target.value))}
                   style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', margin: 0, opacity: 0, cursor: 'pointer' }} />
          </div>
          <div style={{ flex: mobile ? '0 0 auto' : '0 0 178px', textAlign: mobile ? 'left' : 'right', fontFamily: mono, fontSize: 13.5, color: '#cdd8e2' }}>stav</div>
        </div>

        {/* volitelně: tlačítko Přehrát — zkopíruj z ara-diagram.jsx pokud stránka potřebuje animaci v čase */}
      </div>
    </div>
  );
}

window.SablonaDiagram = SablonaDiagram;
