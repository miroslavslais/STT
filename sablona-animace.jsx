// sablona-animace.jsx — VÝCHOZÍ ŠABLONA pro stránky typu "3D/2D animace na celou obrazovku"
// (jako Krychlová BCC/FCC mřížka, Šesterečná mřížka, Bodové poruchy, Hranová dislokace).
// Zkopíruj tento soubor i .dc.html dvojče, přejmenuj a uprav věci u "← uprav".
//
// Tyhle stránky NEPOTŘEBUJÍ ručně řešit výšku/scroll ani slidery — <Stage> ze
// animations.jsx se sám vždy přizpůsobí velikosti okna (žádné okraje mimo obrazovku).
// Jediné, na co si dát pozor:
//  - nadpis dávej na left:84 top:74 (ne výš) — tam nezasahuje tlačítko "Zpět na přehled"
//  - v .dc.html wrapperu se animations.jsx a tento soubor načítají SPOLEČNĚ přes
//    x-import (from="./animations.jsx ./sablona-animace.jsx") — to je v pořádku PRO ŽIVÉ
//    zobrazení. Pokud se to jednou bude znovu exportovat do offline ZIP, dej mi vědět —
//    offline export potřebuje tyhle dva soubory sloučit do jednoho (udělám to při exportu).

function fade(t, a, b, c, d) {
  if (t <= a || t >= d) return 0;
  if (t < b) return clamp((t - a) / (b - a), 0, 1);
  if (t < c) return 1;
  return 1 - clamp((t - c) / (d - c), 0, 1);
}

function Scene() {
  const t = useTime();
  const mono = "'IBM Plex Mono', monospace";
  const sans = "'IBM Plex Sans', system-ui, sans-serif";

  // ── ukázkové kroky animace (časová osa v sekundách) — uprav ← uprav ────────
  const steps = [
    { n: '01', txt: 'První krok vysvětlení', a: 1.0, b: 1.5, c: 3.0, d: 3.4 },
    { n: '02', txt: 'Druhý krok vysvětlení',  a: 3.3, b: 3.8, c: 5.3, d: 5.7 },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', inset: 0,
        background: 'radial-gradient(120% 90% at 50% 42%, rgba(30,52,80,0.55) 0%, rgba(9,13,20,0) 60%)' }} />

      {/* zde patří hlavní vizuál (SVG/3D projekce apod.) ← uprav */}
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <circle cx={960} cy={540} r={120} fill="none" stroke="#5fc0ef" strokeWidth={3}
          opacity={fade(t, 0.5, 1.2, 20, 21)} />
      </svg>

      {/* titulek — NEMĚNIT left:84 top:74 (bezpečná zóna pod tlačítkem Zpět) ← uprav text */}
      <div style={{ position: 'absolute', left: 84, top: 74, opacity: fade(t, 0.2, 0.9, 20, 21) }}>
        <div style={{ fontFamily: mono, fontSize: 18, letterSpacing: '0.28em', color: '#5fc0ef', textTransform: 'uppercase' }}>Sekce · Kategorie</div>
        <div style={{ fontFamily: sans, fontSize: 40, fontWeight: 600, color: '#eaf2fa', marginTop: 10, letterSpacing: '-0.01em' }}>Název animace</div>
      </div>

      {/* postupné popisky dole — vzor NEMĚNIT, jen text/časování ← uprav */}
      {steps.map((s, i) => {
        const o = fade(t, s.a, s.b, s.c, s.d);
        if (o < 0.001) return null;
        return (
          <div key={i} style={{ position: 'absolute', left: '50%', bottom: 96,
            transform: `translate(-50%, ${(1 - o) * 10}px)`, opacity: o, textAlign: 'center' }}>
            <div style={{ fontFamily: mono, fontSize: 16, letterSpacing: '0.24em', color: '#5fc0ef', marginBottom: 12 }}>{s.n}</div>
            <div style={{ fontFamily: sans, fontSize: 34, fontWeight: 500, color: '#eaf2fa', letterSpacing: '-0.005em' }}>{s.txt}</div>
          </div>
        );
      })}
    </div>
  );
}

function SablonaAnimace() {
  return (
    // persistKey musí být jedinečný na stránku (ukládá polohu přehrávání) ← uprav
    <Stage width={1920} height={1080} duration={22} background="#080b12" persistKey="sablona-animace" loop={false}>
      <Scene />
    </Stage>
  );
}

window.SablonaAnimace = SablonaAnimace;
