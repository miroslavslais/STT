// nekonvencni-metody.jsx — klikací schémata nekonvenčních metod tváření.
// Jedna komponenta, metoda se volí atributem metoda="…" na <x-import>.
// Schémata s phases: true mají přepínač Začátek / Konec (f = 'pred' | 'po').
const { useState } = React;
const SANS = "'IBM Plex Sans', system-ui, sans-serif";
const HEAD = "'Quicksand', system-ui, sans-serif";
const WARN = '#eda962';

// Pevná mezera za jednopísmennými předložkami a spojkami a za ve/ze/ke.
const nb = (t) => t.replace(/(?<=^|\s)([aikosuvzAIKOSUVZ]|[VvZzKk]e) /g, '$1 ');

const KIND = {
  steel: { fill: '#1a2430', stroke: '#7d90a3', strokeWidth: 1.5 },
  sheet: { fill: '#c4d2de', stroke: '#eaf2fa', strokeWidth: 1 },
  sheetLine: { fill: 'none', stroke: '#c4d2de', strokeWidth: 5, strokeLinejoin: 'round' },
  water: { fill: 'rgba(63,169,245,0.16)', stroke: '#3fa9f5', strokeWidth: 1.2, fillRule: 'evenodd' },
  rubber: { fill: '#3b3122', stroke: '#c49a5a', strokeWidth: 1.5 },
  charge: { fill: '#e0655a', stroke: '#ff8a4c', strokeWidth: 1.5 },
  vacuum: { fill: 'rgba(150,180,210,0.06)', stroke: '#5d7085', strokeWidth: 1.2, strokeDasharray: '4 3' },
  copper: { fill: '#7a4f26', stroke: '#e0a06a', strokeWidth: 1.5 },
  toolPath: { fill: 'none', stroke: '#57b98a', strokeWidth: 2, strokeDasharray: '6 4' },
};
function look(kind, on) {
  const b = KIND[kind];
  if (!on) return b;
  if (b.fill === 'none') return { ...b, stroke: WARN };
  return { ...b, fill: kind === 'sheet' ? WARN : 'rgba(237,169,98,0.34)', stroke: WARN, strokeWidth: 2 };
}
const DECO = { pointerEvents: 'none' };
const wave = (d) => <path key={d} d={d} fill="none" stroke="#ff8a4c" strokeWidth="1.3" strokeDasharray="3 4" opacity="0.8" style={DECO} />;
const wire = (pts) => <polyline key={pts} points={pts} fill="none" stroke="#8296a8" strokeWidth="1.5" style={DECO} />;
const arrow = (x1, y1, x2, y2, c = '#8296a8') => {
  const a = Math.atan2(y2 - y1, x2 - x1), s = 6;
  const p1 = [x2 - s * Math.cos(a - 0.45), y2 - s * Math.sin(a - 0.45)];
  const p2 = [x2 - s * Math.cos(a + 0.45), y2 - s * Math.sin(a + 0.45)];
  return (
    <g key={`${x1},${y1},${x2},${y2}`} style={DECO}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth="1.6" />
      <polygon points={`${x2},${y2} ${p1[0]},${p1[1]} ${p2[0]},${p2[1]}`} fill={c} />
    </g>
  );
};
// Hodnota závislá na fázi: buď přímo, nebo { pred, po }.
const byPhase = (v, f) => (v && !Array.isArray(v) && typeof v === 'object' && 'pred' in v ? v[f] : v);

// Každá část: id, name (= popisek), desc, kind, draw(on, f), label {x, y, from?}, to (konec odkazové čáry),
// only (část existuje jen v jedné fázi).
const SCHEMATA = {
  vybuch: {
    vb: '0 0 500 290',
    phases: true,
    under: () => [<line key="zaves" x1="170" y1="30" x2="170" y2="85" stroke="#8296a8" strokeWidth="1.5" style={DECO} />],
    over: (f) => (f === 'pred' ? [wave('M148,95 A22,22 0 0,0 192,95'), wave('M136,95 A34,34 0 0,0 204,95')] : []),
    parts: [
      { id: 'voda', name: 'Voda v nádrži', desc: 'Přenáší rázovou vlnu z nálože na plech. Na začátku čárkované oblouky znázorňují šíření vlny.',
        label: { x: 330, y: 60 }, to: [280, 62],
        draw: (on, f) => [
          <path key="v" d={f === 'pred'
            ? 'M50,50 H290 V136 H250 V148 H90 V136 H50 Z M160,95 A10,10 0 1,0 180,95 A10,10 0 1,0 160,95 Z'
            : 'M50,50 H290 V136 H250 V148 H244 V154 Q244,209 173,209 H167 Q96,209 96,154 V148 H90 V136 H50 Z'} {...look('water', on)} />,
          <rect key="s1" x="40" y="40" width="10" height="96" {...look('steel', on)} />,
          <rect key="s2" x="290" y="40" width="10" height="96" {...look('steel', on)} />,
        ] },
      { id: 'naloz', name: 'Nálož', only: 'pred', desc: 'Nálož trhaviny visí ve vodě nad středem plechu. Po odpálení vytvoří rázovou vlnu.',
        label: { x: 330, y: 92 }, to: [180, 95],
        draw: (on) => [<circle key="n" cx="170" cy="95" r="10" {...look('charge', on)} />] },
      { id: 'pridrzovac', name: 'Přidržovač', desc: 'Svírá okraj plechu na matrici a brání jeho zvlnění.',
        label: { x: 330, y: 128 }, to: [300, 142],
        draw: (on) => [
          <rect key="a" x="40" y="136" width="50" height="12" {...look('steel', on)} />,
          <rect key="b" x="250" y="136" width="50" height="12" {...look('steel', on)} />,
        ] },
      { id: 'plech', name: 'Plech', desc: 'Rázová vlna ho vtlačí do dutiny matrice. Plech dosedne na její povrch a převezme její tvar.',
        label: { x: 330, y: 160 }, to: [300, 151],
        draw: (on, f) => [f === 'pred'
          ? <rect key="p" x="40" y="148" width="260" height="6" {...look('sheet', on)} />
          : <path key="p" d="M40,148 H96 V154 Q96,209 167,209 H173 Q244,209 244,154 V148 H300 V154 H250 Q250,215 173,215 H167 Q90,215 90,154 H40 Z" {...look('sheet', on)} />] },
      { id: 'matrice', name: 'Matrice', desc: 'Jediný tvarový nástroj. Razník nahrazuje rázová vlna ve vodě.',
        label: { x: 330, y: 205 }, to: [300, 205],
        draw: (on) => [
          <path key="l" d="M40,154 H90 Q90,215 167,215 V240 H40 Z" {...look('steel', on)} />,
          <path key="r" d="M300,154 H250 Q250,215 173,215 V240 H300 Z" {...look('steel', on)} />,
        ] },
      { id: 'vakuum', name: 'Vakuum v dutině', desc: 'Před výbuchem se z dutiny odsaje vzduch kanálem ve dně matrice. Stlačený vzduch by bránil dosednutí plechu.',
        label: { x: 330, y: 272 }, to: [173, 265],
        draw: (on, f) => [<path key="d" d={f === 'pred'
          ? 'M90,154 Q90,215 167,215 V272 H173 V215 Q250,215 250,154'
          : 'M167,215 V272 H173 V215'} {...look('vacuum', on)} />] },
    ],
  },

  elektrohydraulicke: {
    vb: '0 -14 500 274',
    phases: true,
    under: (f) => [
      ...(f === 'pred' ? [<path key="dutina" d="M110,156 Q110,215 180,215 Q250,215 250,156" fill="rgba(150,180,210,0.04)" stroke="#5d7085" strokeWidth="1" strokeDasharray="4 3" style={DECO} />] : []),
      wire('150,40 150,20 162,20'), wire('178,20 190,20'), wire('190,20 201,13'), wire('204,20 210,20 210,40'),
    ],
    over: (f) => (f === 'pred' ? [wave('M200.8,117 A24,24 0 0,1 159.2,117'), wave('M212.9,124 A38,38 0 0,1 147.1,124')] : []),
    parts: [
      { id: 'baterie', name: 'Kondenzátorová baterie', desc: 'Nabije se a přes spínač se náhle vybije do elektrod. Nabíjecím napětím se nastavuje energie výboje.',
        label: { x: 330, y: 0 }, to: [176, 8],
        draw: (on) => [
          <rect key="a" x="162" y="8" width="4" height="24" {...look('copper', on)} />,
          <rect key="b" x="174" y="8" width="4" height="24" {...look('copper', on)} />,
        ] },
      { id: 'elektrody', name: 'Elektrody', desc: 'Přivádějí proud do kapaliny. Mezi jejich konci je úzká mezera, ve které vznikne výboj.',
        label: { x: 330, y: 48 }, to: [213, 48],
        draw: (on) => [
          <path key="a" d="M147,40 H153 V102 H172 V108 H147 Z" {...look('steel', on)} />,
          <path key="b" d="M213,40 H207 V102 H188 V108 H213 Z" {...look('steel', on)} />,
        ] },
      { id: 'kapalina', name: 'Kapalina v komoře', desc: 'Přenáší tlakovou vlnu z místa výboje na plech. Stěny komory zároveň svírají okraj plechu.',
        label: { x: 330, y: 84 }, to: [282, 84],
        draw: (on, f) => [
          <path key="k" d={(f === 'pred'
            ? 'M70,60 H290 V150 H70 Z M172,105 A8,6 0 1,0 188,105 A8,6 0 1,0 172,105 Z'
            : 'M70,60 H290 V150 H244 V156 Q244,209 180,209 Q116,209 116,156 V150 H70 Z')
            + ' M147,60 H153 V102 H172 V108 H147 Z M213,60 H207 V102 H188 V108 H213 Z'} {...look('water', on)} />,
          <rect key="s1" x="60" y="50" width="10" height="100" {...look('steel', on)} />,
          <rect key="s2" x="290" y="50" width="10" height="100" {...look('steel', on)} />,
        ] },
      { id: 'vyboj', name: 'Výboj', only: 'pred', desc: 'Proud projde mezerou mezi elektrodami a odpaří kapalinu v úzkém kanálu. Rozpínající se pára vytvoří tlakovou vlnu (čárkované oblouky).',
        label: { x: 330, y: 128 }, to: [186, 110],
        draw: (on) => [<ellipse key="e" cx="180" cy="105" rx="8" ry="6" {...look('charge', on)} />] },
      { id: 'plech', name: 'Plech', desc: 'Tlaková vlna ho vtlačí do dutiny matrice. Výboj lze opakovat, dokud plech na matrici plně nedosedne.',
        label: { x: 330, y: 162 }, to: [300, 153],
        draw: (on, f) => [f === 'pred'
          ? <rect key="p" x="60" y="150" width="240" height="6" {...look('sheet', on)} />
          : <path key="p" d="M60,150 H116 V156 Q116,209 180,209 Q244,209 244,156 V150 H300 V156 H250 Q250,215 180,215 Q110,215 110,156 H60 Z" {...look('sheet', on)} />] },
      { id: 'matrice', name: 'Matrice', desc: 'Jediný tvarový nástroj. Dutina v ní určuje tvar dílu.',
        label: { x: 330, y: 210 }, to: [300, 210],
        draw: (on) => [<path key="m" d="M60,156 H110 Q110,215 180,215 Q250,215 250,156 H300 V240 H60 Z" {...look('steel', on)} />] },
    ],
  },

  elektromagneticke: {
    vb: '0 0 500 245',
    phases: true,
    under: () => [wire('96,45 179,45 179,88'), wire('80,45 50,45 50,225 179,225 179,212')],
    over: () => [],
    parts: [
      { id: 'baterie', name: 'Kondenzátorová baterie', desc: 'Vybije se do cívky. V obvodu vznikne krátký proudový impulz.',
        label: { x: 336, y: 22 }, to: [97, 32],
        draw: (on) => [
          <rect key="a" x="80" y="30" width="4" height="30" {...look('copper', on)} />,
          <rect key="b" x="92" y="30" width="4" height="30" {...look('copper', on)} />,
        ] },
      { id: 'civka', name: 'Cívka', desc: 'Obepíná trubku po celém obvodu, ve schématu jsou vidět průřezy závitů. Proudový impulz v ní vytvoří silné proměnné magnetické pole. Cívka se trubky nedotýká.',
        label: { x: 336, y: 80 }, to: [266, 88],
        draw: (on) => [0, 1, 2, 3, 4].flatMap((i) => [
          <rect key={`t${i}`} x={172 + 20 * i} y="88" width="14" height="14" {...look('copper', on)} />,
          <rect key={`b${i}`} x={172 + 20 * i} y="198" width="14" height="14" {...look('copper', on)} />,
        ]) },
      { id: 'trubka', name: 'Trubka', desc: 'Magnetické pole v ní indukuje vířivé proudy opačného směru, než má proud v cívce. Cívka a trubka se odpuzují, trubka se zúží a vtlačí do drážky vnitřního dílu.',
        label: { x: 336, y: 120 }, to: [320, 116],
        draw: (on, f) => (f === 'pred' ? [
          <rect key="a" x="140" y="112" width="180" height="8" {...look('sheet', on)} />,
          <rect key="b" x="140" y="180" width="180" height="8" {...look('sheet', on)} />,
        ] : [
          <path key="a" d="M140,112 H160 L170,122 H196 L204,130 H236 L244,122 H270 L280,112 H320 V120 H283 L273,130 H240 V138 H200 V130 H167 L157,120 H140 Z" {...look('sheet', on)} />,
          <path key="b" d="M140,188 H160 L170,178 H196 L204,170 H236 L244,178 H270 L280,188 H320 V180 H283 L273,170 H240 V162 H200 V170 H167 L157,180 H140 Z" {...look('sheet', on)} />,
        ]) },
      { id: 'vnitrni', name: 'Vnitřní díl', desc: 'Čep, koncovka nebo jiná trubka. Trubka se vtlačí do jeho drážky a vznikne tvarový spoj.',
        label: { x: 336, y: 156 }, to: [280, 152],
        draw: (on) => [<path key="d" d="M70,130 H200 V138 H240 V130 H280 V170 H240 V162 H200 V170 H70 Z" {...look('steel', on)} />] },
    ],
  },

  hydroforming: {
    vb: '0 0 500 265',
    phases: true,
    under: (f) => (f === 'pred' ? [
      <path key="c1" d="M140,110 L150,80 H200 L210,110 Z" fill="rgba(150,180,210,0.04)" style={DECO} />,
      <path key="c2" d="M140,190 L150,220 H200 L210,190 Z" fill="rgba(150,180,210,0.04)" style={DECO} />,
    ] : []),
    over: (f) => [
      arrow(175, 142, 175, 122, '#3fa9f5'), arrow(175, 158, 175, 178, '#3fa9f5'),
      ...(f === 'pred' ? [arrow(14, 218, 46, 218), arrow(336, 218, 304, 218)] : [arrow(26, 218, 58, 218), arrow(324, 218, 292, 218)]),
    ],
    parts: [
      { id: 'forma', name: 'Dělená forma', desc: 'Horní a dolní polovina. Dutina nad trubkou a pod ní určuje tvar, do kterého se trubka rozepne.',
        label: { x: 352, y: 60 }, to: [260, 60],
        draw: (on) => [
          <path key="h" d="M90,50 H260 V110 H210 L200,80 H150 L140,110 H90 Z" {...look('steel', on)} />,
          <path key="d" d="M90,250 H260 V190 H210 L200,220 H150 L140,190 H90 Z" {...look('steel', on)} />,
        ] },
      { id: 'pisty', name: 'Axiální písty', desc: 'Utěsní konce trubky. Při zvyšování tlaku posouvají konce trubky dovnitř (šipky dole) a doplňují materiál do místa rozšíření. Levým pístem se přivádí kapalina.',
        label: { x: 352, y: 92 }, to: { pred: [340, 104], po: [328, 104] },
        draw: (on, f) => (f === 'pred' ? [
          <path key="l1" d="M10,100 H50 V116 H70 V147 H10 Z" {...look('steel', on)} />,
          <path key="l2" d="M10,153 H70 V184 H50 V200 H10 Z" {...look('steel', on)} />,
          <path key="r" d="M340,100 H300 V116 H280 V184 H300 V200 H340 Z" {...look('steel', on)} />,
        ] : [
          <path key="l1" d="M22,100 H62 V116 H82 V147 H22 Z" {...look('steel', on)} />,
          <path key="l2" d="M22,153 H82 V184 H62 V200 H22 Z" {...look('steel', on)} />,
          <path key="r" d="M328,100 H288 V116 H268 V184 H288 V200 H328 Z" {...look('steel', on)} />,
        ]) },
      { id: 'trubka', name: 'Trubka', desc: 'Tlak kapaliny ji rozepne do dutiny formy. Konce trubky se přitom posunou dovnitř.',
        label: { x: 352, y: 124 }, to: [280, 113],
        draw: (on, f) => (f === 'pred' ? [
          <rect key="a" x="50" y="110" width="250" height="6" {...look('sheet', on)} />,
          <rect key="b" x="50" y="184" width="250" height="6" {...look('sheet', on)} />,
        ] : [
          <path key="a" d="M62,110 H140 L150,80 H200 L210,110 H288 V116 H205.7 L195.7,86 H154.3 L144.3,116 H62 Z" {...look('sheet', on)} />,
          <path key="b" d="M62,190 H140 L150,220 H200 L210,190 H288 V184 H205.7 L195.7,214 H154.3 L144.3,184 H62 Z" {...look('sheet', on)} />,
        ]) },
      { id: 'kapalina', name: 'Kapalina pod tlakem', desc: 'Plní trubku a tlačí na její stěnu zevnitř ve všech směrech (modré šipky). Nahrazuje razník.',
        label: { x: 352, y: 156 }, to: [260, 150],
        draw: (on, f) => [<path key="k" d={f === 'pred'
          ? 'M10,147 H70 V116 H280 V184 H70 V153 H10 Z'
          : 'M22,147 H82 V116 H144.3 L154.3,86 H195.7 L205.7,116 H268 V184 H205.7 L195.7,214 H154.3 L144.3,184 H82 V153 H22 Z'} {...look('water', on)} />] },
    ],
  },

  guerin: {
    vb: '0 -36 500 300',
    phases: true,
    under: () => [],
    over: (f) => [f === 'pred' ? arrow(240, -28, 240, -6) : arrow(240, 62, 240, 84)],
    parts: [
      { id: 'kontejner', name: 'Kontejner s beranem', desc: 'Ocelový kontejner upevněný na beranu lisu. Drží pryž a brání jejímu vytlačení do stran.',
        label: { x: 352, y: 60 }, to: { pred: [320, 40], po: [320, 120] },
        draw: (on, f) => (f === 'pred' ? [
          <rect key="b" x="150" y="-32" width="60" height="32" {...look('steel', on)} />,
          <path key="k" d="M40,0 H320 V138 H300 V20 H60 V138 H40 Z" {...look('steel', on)} />,
        ] : [
          <rect key="b" x="150" y="58" width="60" height="32" {...look('steel', on)} />,
          <path key="k" d="M40,90 H320 V228 H300 V110 H60 V228 H40 Z" {...look('steel', on)} />,
        ]) },
      { id: 'pryz', name: 'Pryžový polštář', desc: 'Při stlačení se chová podobně jako kapalina. Obklopí tvárník a přitlačí plech na jeho tvar ze všech stran. Nahrazuje matrici.',
        label: { x: 352, y: 118 }, to: { pred: [295, 80], po: [295, 150] },
        draw: (on, f) => [<path key="p" d={f === 'pred'
          ? 'M60,20 H300 V140 H60 Z'
          : 'M60,110 H300 V230 H246.2 L224.5,154 H135.5 L113.8,230 H60 Z'} {...look('rubber', on)} />] },
      { id: 'plech', name: 'Plech', desc: 'Leží na tvárníku. Pryž ho ohne kolem tvárníku a přitlačí na jeho povrch.',
        label: { x: 352, y: 152 }, to: { pred: [298, 157], po: [224.5, 154] },
        draw: (on, f) => [f === 'pred'
          ? <rect key="p" x="62" y="154" width="236" height="6" {...look('sheet', on)} />
          : <path key="p" d="M113.8,230 L135.5,154 H224.5 L246.2,230 H240 L220,160 H140 L120,230 Z" {...look('sheet', on)} />] },
      { id: 'tvarnik', name: 'Tvárník', desc: 'Jediný tuhý tvarový nástroj. Určuje tvar dílu.',
        label: { x: 352, y: 194 }, to: [229, 195],
        draw: (on) => [<path key="t" d="M120,230 L140,160 H220 L240,230 Z" {...look('steel', on)} />] },
      { id: 'stul', name: 'Stůl lisu', desc: 'Nese tvárník. Zachycuje sílu beranu.',
        label: { x: 352, y: 248 }, to: [340, 244],
        draw: (on) => [<rect key="s" x="20" y="230" width="320" height="28" {...look('steel', on)} />] },
    ],
  },

  kovotlaceni: {
    vb: '0 0 500 300',
    under: () => [],
    over: () => [<line key="osa" x1="0" y1="150" x2="320" y2="150" stroke="#5d7085" strokeWidth="1" strokeDasharray="14 4 3 4" style={DECO} />],
    parts: [
      { id: 'vreteno', name: 'Vřeteno', desc: 'Otáčí šablonou i upnutým plechem.',
        label: { x: 10, y: 290, from: [30, 276] }, to: [30, 230],
        draw: (on) => [<rect key="v" x="10" y="70" width="40" height="160" {...look('steel', on)} />] },
      { id: 'sablona', name: 'Šablona', desc: 'Má tvar vnitřního povrchu hotového dílu. Plech na ni postupně dosedá.',
        label: { x: 330, y: 212 }, to: [110, 198],
        draw: (on) => [<path key="s" d="M50,90 H80 L200,125 V175 L80,210 H50 Z" {...look('steel', on)} />] },
      { id: 'plech', name: 'Plech', desc: 'Kruhový přístřih. Část u přítlaku už dosedla na šablonu, okraj ještě odstává.',
        label: { x: 330, y: 258 }, to: [184, 255],
        draw: (on) => [<path key="p" d="M185,40 L150.7,108 L202.5,123.1 V176.9 L150.7,192 L185,260" {...look('sheetLine', on)} />] },
      { id: 'konik', name: 'Přítlak koníku', desc: 'Tlačí plech na čelo šablony, takže se plech otáčí spolu s ní.',
        label: { x: 330, y: 150 }, to: [300, 150],
        draw: (on) => [<path key="k" d="M205,130 H260 V115 H300 V185 H260 V170 H205 Z" {...look('steel', on)} />] },
      { id: 'kladka', name: 'Tlačná kladka', desc: 'Otáčí se kolem vlastní osy a tlačí plech na šablonu. Posouvá se v několika přechodech od přítlaku k okraji.',
        label: { x: 330, y: 40 }, to: [233, 40],
        draw: (on) => [
          <path key="r" d="M180.1,99.2 L174.3,93.8 L227.1,37.3 L232.9,42.7 Z" {...look('steel', on)} />,
          <circle key="c" cx="177.2" cy="96.5" r="16" {...look('steel', on)} />,
        ] },
    ],
  },

  inkrementalni: {
    vb: '0 0 500 260',
    under: () => [],
    over: () => [],
    parts: [
      { id: 'nastroj', name: 'Nástroj', desc: 'Nástroj s kulovým koncem je upnutý ve vřetenu CNC stroje nebo v robotu. Tlačí na plech jen v malé oblasti.',
        label: { x: 345, y: 26 }, to: [143.4, 26],
        draw: (on) => [
          <rect key="s" x="135.4" y="20" width="8" height="115.3" {...look('steel', on)} />,
          <circle key="k" cx="139.4" cy="135.3" r="8" {...look('steel', on)} />,
        ] },
      { id: 'pridrzovac', name: 'Přidržovač', desc: 'Svírá plech po obvodu na rámu. Plech se neposouvá, stěna vzniká jeho ztenčením.',
        label: { x: 345, y: 62 }, to: [330, 68],
        draw: (on) => [
          <rect key="a" x="30" y="60" width="50" height="17.5" {...look('steel', on)} />,
          <rect key="b" x="280" y="60" width="50" height="17.5" {...look('steel', on)} />,
        ] },
      { id: 'plech', name: 'Plech', desc: 'Stěna vytvarovaného kužele je tenčí než výchozí plech. Ve schématu má pro čitelnost stejnou tloušťku.',
        label: { x: 345, y: 94 }, to: [305, 80],
        draw: (on) => [<path key="p" d="M30,80 H100 L135,150 H225 L260,80 H330" {...look('sheetLine', on)} />] },
      { id: 'draha', name: 'Dráha nástroje', desc: 'Nástroj obkrouží obrys na jedné hladině a posune se o malý krok do hloubky. Dráhu vytváří CAM program.',
        label: { x: 345, y: 126 }, to: [229.4, 117.65],
        draw: (on) => [<path key="d" d="M150,100 H238.3 M150,117.65 H229.4 M150,135.3 H220.6" {...look('toolPath', on)} />] },
      { id: 'ram', name: 'Rám', desc: 'Nese upnutý plech. Pod plechem není matrice, tvar určuje jen dráha nástroje.',
        label: { x: 345, y: 200 }, to: [330, 200],
        draw: (on) => [
          <rect key="a" x="30" y="82.5" width="50" height="167.5" {...look('steel', on)} />,
          <rect key="b" x="280" y="82.5" width="50" height="167.5" {...look('steel', on)} />,
        ] },
    ],
  },
};

const labelW = (name) => name.length * 6.8 + 10;
const PHASES = [{ id: 'pred', t: 'Začátek' }, { id: 'po', t: 'Konec' }];

function NekonvencniSchema({ metoda }) {
  const S = SCHEMATA[metoda];
  const [act, setAct] = useState(null);
  const [f, setF] = useState('pred');
  if (!S) return null;
  const parts = S.parts.filter((p) => !p.only || p.only === f);
  const toggle = (id) => setAct((a) => (a === id ? null : id));
  const ap = parts.find((p) => p.id === act);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '14px 16px', boxSizing: 'border-box', fontFamily: SANS, color: '#eaf2fa' }}>
      {S.phases && (
        <div style={{ flex: 'none', display: 'flex', gap: 6, marginBottom: 6 }}>
          {PHASES.map((ph) => {
            const on = f === ph.id;
            return (
              <button key={ph.id} onClick={() => setF(ph.id)} style={{ padding: '6px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: SANS, fontSize: 13, fontWeight: 600, border: `1px solid ${on ? WARN : 'rgba(150,180,210,0.25)'}`, background: on ? 'rgba(237,169,98,0.14)' : 'transparent', color: on ? WARN : '#aebfcf' }}>{ph.t}</button>
            );
          })}
        </div>
      )}
      <svg viewBox={S.vb} style={{ width: '100%', flex: '1 1 auto', minHeight: 0, display: 'block' }}>
        {S.under(f)}
        {parts.map((p) => (
          <g key={p.id} onClick={() => toggle(p.id)} style={{ cursor: 'pointer' }}>{p.draw(act === p.id, f)}</g>
        ))}
        {S.over(f)}
        {parts.map((p) => {
          const on = act === p.id;
          const fr = p.label.from || [p.label.x - 6, p.label.y - 4];
          const to = byPhase(p.to, f);
          return (
            <g key={`l-${p.id}`} style={DECO}>
              <line x1={fr[0]} y1={fr[1]} x2={to[0]} y2={to[1]} stroke={on ? WARN : '#5d7085'} strokeWidth="1" />
              <circle cx={to[0]} cy={to[1]} r="2" fill={on ? WARN : '#8296a8'} />
            </g>
          );
        })}
        {parts.map((p) => {
          const on = act === p.id;
          return (
            <g key={`t-${p.id}`} onClick={() => toggle(p.id)} style={{ cursor: 'pointer' }}>
              <rect x={p.label.x - 5} y={p.label.y - 15} width={labelW(p.name)} height="21" rx="4" fill={on ? 'rgba(237,169,98,0.12)' : 'transparent'} />
              <text x={p.label.x} y={p.label.y} fontFamily={SANS} fontSize="12.5" fontWeight={on ? 600 : 500} fill={on ? WARN : '#c4d2de'}>{p.name}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ flex: 'none', height: 84, marginTop: 8, padding: '10px 14px', boxSizing: 'border-box', background: 'rgba(120,150,180,0.06)', border: '1px solid rgba(150,180,210,0.16)', borderRadius: 10 }}>
        {ap ? (
          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: '#d3dfea' }}>
            <span style={{ fontFamily: HEAD, fontWeight: 700, color: WARN }}>{ap.name}: </span>{nb(ap.desc)}
          </div>
        ) : (
          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: '#8296a8' }}>{nb('Klikni na část schématu nebo na její popisek.')}</div>
        )}
      </div>
    </div>
  );
}
window.NekonvencniSchema = NekonvencniSchema;
