// hluboke-tazeni.jsx — interaktivní: síla přidržovače × hloubka tažení.
// Malá síla → zvlnění příruby, velká síla → utržení dna.
const { useState } = React;
const SANS = "'IBM Plex Sans', system-ui, sans-serif";
const HEAD = "'Quicksand', system-ui, sans-serif";
const BAD = '#e0655a', GOOD = '#57b98a', ACC = '#7ba3cc';

const CX = 420, TOP = 120, PUNCH_R = 70, DIE_R = 84, MAXD = 190;

function flange(depth, force) {
  // vlnitost roste, když je síla malá a hloubka velká
  const w = Math.max(0, (0.42 - force)) * 3.2 * (0.35 + depth * 0.65);
  return w;
}

function Wall({ side, depth, force }) {
  const thin = Math.min(0.62, (force * 0.5 + depth * 0.55) * 0.5);
  const x = CX + side * PUNCH_R;
  const yBot = TOP + 40 + depth * MAXD;
  const t0 = 16, t = t0 * (1 - thin * 0.55);
  return (
    <path d={'M' + x + ' ' + (TOP + 34) + ' L' + x + ' ' + yBot + ' L' + (x + side * t) + ' ' + yBot + ' L' + (x + side * t) + ' ' + (TOP + 34) + ' Z'}
      fill="#c6d3de" stroke="#8fa2b3" strokeWidth={1.4} />
  );
}

function Diagram({ force, depth }) {
  const w = flange(depth, force);
  const tear = force > 0.72 && depth > 0.62;
  const dEff = tear ? 0.62 : depth;      // po utržení se stěna dál neprodlužuje
  const yWall = TOP + 40 + dEff * MAXD;  // konec stěny
  const yBot = TOP + 40 + depth * MAXD;  // dno sleduje tažník
  const wrinkle = w > 0.35;

  // zvlněná příruba jako pilová čára; s hloubkou se vnější okraj vtahuje dovnitř
  const FL = 168 * (1 - 0.74 * dEff);
  const flangePath = (side) => {
    let d = 'M' + (CX + side * DIE_R) + ' ' + (TOP + 24);
    for (let i = 0; i <= 12; i++) {
      const x = CX + side * (DIE_R + (i / 12) * FL);
      const dy = Math.sin(i * 1.15) * w * 13;
      d += ' L' + x.toFixed(1) + ' ' + (TOP + 24 + dy).toFixed(1);
    }
    return d;
  };

  return (
    <svg viewBox="0 0 840 470" width="100%" style={{ display: 'block' }}>
      {/* tažnice */}
      <rect x={CX - 400} y={TOP + 30} width={400 - DIE_R} height={210} rx={6} fill="#39434f" stroke="#5a6570" strokeWidth={1.6} />
      <rect x={CX + DIE_R} y={TOP + 30} width={400 - DIE_R} height={210} rx={6} fill="#39434f" stroke="#5a6570" strokeWidth={1.6} />

      {/* přidržovač */}
      <rect x={CX - 400} y={TOP - 8 - w * 10} width={400 - DIE_R - 6} height={26} rx={4} fill="#4a5563" stroke="#6d7986" strokeWidth={1.4} />
      <rect x={CX + DIE_R + 6} y={TOP - 8 - w * 10} width={400 - DIE_R - 6} height={26} rx={4} fill="#4a5563" stroke="#6d7986" strokeWidth={1.4} />

      {/* síla přidržovače — intenzita šipek */}
      {(() => {
        const yTop = TOP - 8 - w * 10;
        const L = 16 + force * 48, sw = 1.4 + force * 3.2, op = 0.28 + force * 0.72;
        const xs = [80, 150, 220, 290, 560, 630, 700, 770];
        return (
          <g opacity={op}>
            {xs.map((x, i) => (
              <g key={i}>
                <line x1={x} y1={yTop - 8 - L} x2={x} y2={yTop - 8} stroke={ACC} strokeWidth={sw} strokeLinecap="round" />
                <path d={'M' + (x - 5 - sw) + ' ' + (yTop - 14) + ' L' + x + ' ' + (yTop - 5) + ' L' + (x + 5 + sw) + ' ' + (yTop - 14)}
                  fill="none" stroke={ACC} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
              </g>
            ))}
            <text x={820} y={Math.max(20, yTop - 22 - L)} textAnchor="end" fontFamily={SANS} fontSize={14} fill={ACC}>síla přidržovače</text>
          </g>
        );
      })()}

      {/* tažník */}
      <rect x={CX - PUNCH_R + 4} y={TOP + 40 + depth * MAXD - 250} width={2 * PUNCH_R - 8} height={250} rx={8} fill="#4a5563" stroke="#6d7986" strokeWidth={1.6} />

      {/* příruba */}
      <path d={flangePath(-1)} fill="none" stroke="#c6d3de" strokeWidth={13} strokeLinecap="round" />
      <path d={flangePath(1)} fill="none" stroke="#c6d3de" strokeWidth={13} strokeLinecap="round" />

      {/* stěny + dno */}
      <Wall side={-1} depth={dEff} force={force} />
      <Wall side={1} depth={dEff} force={force} />
      <rect x={CX - PUNCH_R} y={yBot} width={2 * PUNCH_R} height={15} fill="#c6d3de" stroke="#8fa2b3" strokeWidth={1.4} />

      {/* trhlina v přechodu dna */}
      {tear && (
        <g>
          <path d={'M' + (CX - PUNCH_R - 2) + ' ' + (yWall - 6) + ' L' + (CX - PUNCH_R + 16) + ' ' + (yWall + 4)} stroke={BAD} strokeWidth={5} strokeLinecap="round" />
          <path d={'M' + (CX + PUNCH_R + 2) + ' ' + (yWall - 6) + ' L' + (CX + PUNCH_R - 16) + ' ' + (yWall + 4)} stroke={BAD} strokeWidth={5} strokeLinecap="round" />
          <line x1={CX + PUNCH_R + 10} y1={yWall} x2={CX + 210} y2={yWall + 40} stroke={BAD} strokeWidth={1.3} />
          <text x={CX + 216} y={yWall + 45} fontFamily={SANS} fontWeight="600" fontSize={16} fill={BAD}>utržení dna</text>
        </g>
      )}
      {wrinkle && (
        <g>
          <line x1={CX - DIE_R - FL * 0.6} y1={TOP + 18} x2={CX - 250} y2={TOP - 44} stroke={ACC} strokeWidth={1.3} />
          <text x={CX - 256} y={TOP - 48} textAnchor="end" fontFamily={SANS} fontWeight="600" fontSize={16} fill={ACC}>zvlnění příruby</text>
        </g>
      )}
      <line x1={CX} y1={TOP - 60} x2={CX} y2={440} stroke="rgba(150,180,210,0.3)" strokeWidth={1.1} strokeDasharray="12 6 3 6" />
    </svg>
  );
}

function Slider({ label, value, onChange, left, right, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 14, color: '#eaf2fa' }}>{label}</div>
      <input type="range" min={0} max={1} step={0.01} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: color }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: SANS, fontSize: 12.5, color: '#8296a8' }}>
        <span>{left}</span><span>{right}</span>
      </div>
    </div>
  );
}

function HlubokeTazeni() {
  const [force, setForce] = useState(0.5);
  const [depth, setDepth] = useState(0.55);
  const wrinkle = flange(depth, force) > 0.35;
  const tear = force > 0.72 && depth > 0.62;
  const status = tear
    ? { c: BAD, t: 'Utržení dna', d: 'Přidržovač brzdí tok materiálu, tažná síla musí projít stěnou a přechod dna se utrhne.' }
    : wrinkle
      ? { c: ACC, t: 'Zvlnění příruby', d: 'Příruba se po obvodu stlačuje a bez dostatečného přítlaku ztratí stabilitu — zvlní se.' }
      : { c: GOOD, t: 'Výtažek v pořádku', d: 'Přidržovací síla je dost velká na potlačení vln a dost malá na to, aby materiál mohl téct.' };

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: 20, boxSizing: 'border-box', fontFamily: SANS, color: '#eaf2fa' }}>
      <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 20, marginBottom: 4 }}>Hluboké tažení — dvě vady proti sobě</div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center' }}>
        <Diagram force={force} depth={depth} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 26, marginBottom: 14 }}>
        <Slider label="Síla přidržovače" value={force} onChange={setForce} left="malá" right="velká" color={ACC} />
        <Slider label="Hloubka tažení" value={depth} onChange={setDepth} left="mělký" right="hluboký" color="#eda962" />
      </div>
      <div style={{ background: 'rgba(120,150,180,0.06)', border: '1px solid rgba(150,180,210,0.16)', borderRadius: 14, padding: '14px 18px' }}>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 16, color: status.c, marginBottom: 4 }}>{status.t}</div>
        <div style={{ fontSize: 14.5, lineHeight: 1.55, color: '#c4d2de' }}>{status.d}</div>
      </div>
    </div>
  );
}
window.HlubokeTazeni = HlubokeTazeni;
