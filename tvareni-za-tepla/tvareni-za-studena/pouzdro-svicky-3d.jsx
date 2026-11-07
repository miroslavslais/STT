// pouzdro-svicky-3d.jsx — postup tváření pouzdra zapalovací svíčky za studena (three.js).
// Dva postupy: 1) šestihran vzniká ostřižením nákružku, 2) šestihran se napěchuje do šestihranné dutiny.
// Rotační tvar se mezi operacemi plynule mění (lineární přechod obrysu), šestihran je hranol
// s průřezem, který přechází z kruhu do šestiúhelníku. Model je zjednodušený a ukazuje změnu tvaru, ne skutečné rozměry.
(function () {
const { useState, useEffect, useRef } = React;
const SANS = "'IBM Plex Sans', system-ui, sans-serif";
const HEAD = "'Quicksand', system-ui, sans-serif";
const MONO = "'IBM Plex Mono', ui-monospace, monospace";
const ACC = '#7ba3cc', HL = '#eda962';
const NB = ' ';
const nb = (t) => t.replace(/(?<=^|\s)([aikosuvzAIKOSUVZ]|[VvZzKk]e) /g, '$1 ');
const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const ORBIT_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
const loadScript = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
const ensureThree = () => window.__sn3dP || (window.__sn3dP = (window.THREE ? Promise.resolve() : loadScript(THREE_URL)).then(() => (window.THREE.OrbitControls ? null : loadScript(ORBIT_URL))));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const lerpProf = (A, B, u) => A.map((p, k) => [p[0] + (B[k][0] - p[0]) * u, p[1] + (B[k][1] - p[1]) * u]);
const profAt = (PROF, v) => {
  const n = PROF.length - 1, i = Math.min(n - 1, Math.floor(v)), u = ease(clamp(v - i, 0, 1));
  return v >= n ? PROF[n] : lerpProf(PROF[i], PROF[i + 1], u);
};
const RC = 12.5; // opsaná kružnice šestihranu

// ── Postup 1: nákružek → ostřižení šestihranu ─────────────────────────
// Obrys (r, y): osa dole, vnější hrana dole, 4 body nákružku, vnější hrana nahoře, vnitřní hrana nahoře, dno dutiny u stěny, dno v ose.
const RO = 10, RI = 6.5, RF = 14, F0 = 17, F1 = 22;
const PROF1 = [
  [[0, -0.3], [9.6, 0.4], [RO, 13.4], [RO, 13.4], [RO, 17.3], [RO, 17.3], [9.6, 21.6], [RI, 22.1], [RI, 22.1], [0, 22.3]],
  [[0, 0], [RO, 0], [RO, 13.1], [RO, 13.1], [RO, 17], [RO, 17], [RO, 21.6], [RI, 21.6], [RI, 21.6], [0, 21.6]],
  [[0, 0], [RO, 0], [RO, 15.8], [RO, 15.8], [RO, 20.4], [RO, 20.4], [RO, 26], [RI, 26], [RI, 17], [0, 17]],
  [[0, 0], [RO, 0], [RO, 21.9], [RO, 21.9], [RO, 28.3], [RO, 28.3], [RO, 36], [RI, 36], [RI, 2.4], [0, 2.4]],
  [[0, 0], [RO, 0], [RO, F0], [RF, F0], [RF, F1], [RO, F1], [RO, 28], [RI, 28], [RI, 2.4], [0, 2.4]],
  [[0, 0], [RO, 0], [RO, F0], [RO, F0], [RO, F1], [RO, F1], [RO, 28], [RI, 28], [RI, 2.4], [0, 2.4]],
];
const V1 = {
  steps: [
    { name: 'Ustřižení', op: 'stříhání', text: 'Přířez se ustřihne z drátu. Jeho objem odpovídá objemu hotového výlisku. Čela po střihu nejsou rovná.' },
    { name: 'Zarovnání čel', op: 'pěchování', text: 'Přířez se v průtlačnici stlačí mezi rovnými čely nástroje. Čela se srovnají a jsou kolmá k ose. Přířez vyplní dutinu průtlačnice.' },
    { name: 'Protlačení', op: 'zpětné protlačování', text: 'Průtlačník vnikne do čela přířezu. Materiál teče podél průtlačníku proti směru jeho pohybu a vznikne dutina se dnem. Výlisek se prodlouží.' },
    { name: 'Druhé protlačení', op: 'zpětné protlačování', text: 'Delší průtlačník dutinu prohloubí. Stěna se prodlouží a dno se ztenčí. Vnější průměr drží průtlačnice.' },
    { name: 'Pěchování', op: 'pěchování', text: 'Osová síla stlačí výlisek. Materiál stěny vyteče do volného prostoru v nástroji a vznikne nákružek. Výlisek se zkrátí.' },
    { name: 'Ostřižení', op: 'ostřihování', text: 'Nákružek se protlačí ostřihovací střižnicí se šestihranným otvorem. Z nákružku zůstane šestihran pro klíč.' },
    { name: 'Odpad', op: 'kroužek z ostřižení', text: 'Kroužek se šestihranným otvorem je jediný odpad celého postupu. Ostatní operace materiál jen přemísťují.' },
  ],
  profile: (v) => (v > 4 + 1e-6 ? PROF1[5] : profAt(PROF1.slice(0, 5), v)),
  prism: (v) => (v > 4 + 1e-6 ? { y0: F0, y1: F1, u: 1, r0: RC, core: RO } : null),
  ring: (v) => {
    if (v <= 4 + 1e-6) return null;
    // kroužek vyjede nahoru přes horní část výlisku, odsune se stranou a klesne
    const u = clamp(v - 4, 0, 1);
    const up = ease(clamp(u / 0.35, 0, 1)), side = ease(clamp((u - 0.35) / 0.35, 0, 1)), down = ease(clamp((u - 0.7) / 0.3, 0, 1));
    return { u: 1, r0: RC, outer: RF, h: F1 - F0, x: 30 * side, y: (F0 + F1) / 2 + 14 * up - 31 * down, waste: v > 5 + 1e-6 ? ease(clamp(v - 5, 0, 1)) : 0 };
  },
};

// ── Postup 2: dřík + pěchování šestihranu ─────────────────────────────
// Obrys (r, y): osa dole, vnější hrana dole, horní hrana spodní části, zaoblení, začátek dříku, vrchol dříku, okraj dutiny, dno dutiny u stěny, dno v ose.
const HX = 8, CORE2 = 6;
const PROF2 = [
  [[0, -0.3], [8, 0], [8, 8], [8, 12], [8, 14], [7.7, 23.7], [4.5, 24.1], [4.5, 24.1], [0, 24.3]],
  [[0, 0], [10.5, 0], [10.5, 8], [9, 10.2], [7, 11.2], [7, 20], [4.5, 20], [4.5, 20], [0, 20]],
  [[0, 0], [CORE2, 0], [10, HX], [9.2, 11], [7.5, 13], [7.5, 22], [2.2, 22], [2.2, 21.6], [0, 21.6]],
  [[0, 0], [CORE2, 0], [9.8, HX], [9.8, 17], [7.5, 18.2], [7.5, 30], [5, 30], [5, 12], [0, 12]],
  [[0, 0], [CORE2, 0], [9.8, HX], [9.8, 16], [7.5, 17], [7.5, 35], [5, 35], [5, 10], [0, 10]],
];
const V2 = {
  steps: [
    { name: 'Ustřižení', op: 'stříhání', text: 'Přířez se ustřihne z drátu. Čela po střihu nejsou rovná.' },
    { name: 'Dřík a pěchování', op: 'dopředné protlačování a pěchování', text: 'Horní část přířezu se protlačí zúženým otvorem nástroje a vznikne tenčí dřík. Spodní část se zároveň napěchuje na větší průměr.' },
    { name: 'Pěchování šestihranu', op: 'pěchování', text: 'Spodní část se napěchuje do šestihranné dutiny nástroje a šestihran vznikne přímo, bez ostřihování. Přechod k dříku se zaoblí.' },
    { name: 'Protlačení dutiny', op: 'zpětné protlačování', text: 'Průtlačník vnikne do dříku a vytvoří dutinu. Stěna teče proti pohybu průtlačníku. Nad šestihranem vznikne válcová část s osazením.' },
    { name: 'Druhé protlačení', op: 'zpětné protlačování', text: 'Další průtlačník dutinu prohloubí a trubková část se prodlouží. Šestihran a osazení zůstávají beze změny.' },
  ],
  profile: (v) => profAt(PROF2, v),
  prism: (v) => (v > 1 + 1e-6 ? { y0: 0, y1: HX, u: ease(clamp(v - 1, 0, 1)), r0: 10.55, core: CORE2 } : null),
  ring: () => null,
};
const VARIANTS = [V1, V2];

function build(host) {
  const T = window.THREE, TAU = Math.PI * 2, SEG = 72;
  const W = () => Math.max(1, host.clientWidth), H = () => Math.max(1, host.clientHeight);
  const renderer = new T.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(W(), H());
  renderer.setClearColor(0x0a0e15);
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.localClippingEnabled = true;
  const cv = renderer.domElement; cv.style.display = 'block';
  host.appendChild(cv);
  const scene = new T.Scene();
  const cam = new T.PerspectiveCamera(32, W() / H(), 1, 2000);
  scene.add(new T.HemisphereLight(0xffffff, 0x55647a, 0.75));
  const d1 = new T.DirectionalLight(0xffffff, 0.75); d1.position.set(-60, 120, 90); scene.add(d1);
  const d2 = new T.DirectionalLight(0xb8d4ff, 0.3); d2.position.set(80, -40, -80); scene.add(d2);
  const clip = new T.Plane(new T.Vector3(0, 0, -1), 0);
  const mk = (color) => new T.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.35, side: T.DoubleSide });
  const mBody = mk(0xbac6d0), mHex = mk(0xbac6d0), mRing = mk(0xbac6d0);
  const mCap = new T.MeshBasicMaterial({ color: 0x1a222c, side: T.DoubleSide });
  const mCapR = new T.MeshBasicMaterial({ color: 0x1a222c, side: T.DoubleSide });
  const lMat = new T.LineBasicMaterial({ color: 0x2c3540 });
  const lMatR = new T.LineBasicMaterial({ color: 0x2c3540 });
  const root = new T.Group(); scene.add(root);

  // rotační plocha z obrysu — každý úsek vlastní pás s přesnými normálami (ostré hrany)
  const latheGeo = (pts) => {
    const pos = [], nor = [], idx = [];
    for (let s = 0; s < pts.length - 1; s++) {
      const a = pts[s], b = pts[s + 1];
      const dr = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dr, dy);
      if (L < 1e-4) continue;
      const nr = dy / L, ny = -dr / L;
      const base = pos.length / 3;
      for (let j = 0; j <= SEG; j++) {
        const f = (j / SEG) * TAU, c = Math.cos(f), sn = Math.sin(f);
        pos.push(a[0] * c, a[1], a[0] * sn, b[0] * c, b[1], b[0] * sn);
        nor.push(nr * c, ny, nr * sn, nr * c, ny, nr * sn);
      }
      for (let j = 0; j < SEG; j++) {
        const i0 = base + 2 * j;
        idx.push(i0, i0 + 1, i0 + 2, i0 + 1, i0 + 3, i0 + 2);
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    g.setIndex(idx);
    return g;
  };
  const dedupe = (pts) => pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 0.02);
  const shapeOf = (pts) => { const s = new T.Shape(); s.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach((q) => s.lineTo(q[0], q[1])); s.closePath(); return s; };
  const capGeo = (polys) => new T.ShapeGeometry(polys.map(shapeOf));
  const both = (pts) => [pts, pts.map((q) => [-q[0], q[1]]).reverse()];
  const rect = (x0, x1, y0, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  // průřez přecházející z kruhu (u = 0) do šestihranu (u = 1); vrchol šestihranu leží na ose x
  const AP = RC * Math.cos(Math.PI / 6);
  const hexR = (f) => { const a = ((f % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3) - Math.PI / 6; return AP / Math.cos(a); };
  const morphPts = (r0, u, n) => {
    const out = [];
    for (let k = 0; k < n; k++) { const f = (k / n) * TAU, r = r0 + (hexR(f) - r0) * u; out.push(new T.Vector2(r * Math.cos(f), r * Math.sin(f))); }
    return out;
  };
  const extrudeY = (shape, y0, h) => {
    const g = new T.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 48 });
    g.rotateX(-Math.PI / 2); g.translate(0, y0, 0); return g;
  };
  const prismGeo = (p) => {
    const s = new T.Shape(morphPts(p.r0, p.u, 72));
    const hole = new T.Path(); hole.absarc(0, 0, p.core, 0, TAU, true); s.holes.push(hole);
    return extrudeY(s, p.y0, p.y1 - p.y0);
  };
  const ringGeo = (r) => {
    const s = new T.Shape(); s.absarc(0, 0, r.outer, 0, TAU, false);
    const hp = morphPts(r.r0, r.u, 72).reverse(); s.holes.push(new T.Path(hp));
    return extrudeY(s, -r.h / 2, r.h);
  };

  const mkMesh = (mat, lm, parent) => { const m = new T.Mesh(new T.BufferGeometry(), mat); m.add(new T.LineSegments(new T.BufferGeometry(), lm)); parent.add(m); return m; };
  const setGeo = (m, g) => { m.geometry.dispose(); m.geometry = g; if (m.children[0]) { m.children[0].geometry.dispose(); m.children[0].geometry = new T.EdgesGeometry(g, 25); } };
  const body = mkMesh(mBody, lMat, root);
  const bodyCap = new T.Mesh(new T.BufferGeometry(), mCap); root.add(bodyCap);
  const hex = mkMesh(mHex, lMat, root);
  const hexCap = new T.Mesh(new T.BufferGeometry(), mCap); root.add(hexCap);
  const ring = new T.Group(); root.add(ring);
  const ringMesh = mkMesh(mRing, lMatR, ring);
  const ringCap = new T.Mesh(new T.BufferGeometry(), mCapR); ring.add(ringCap);

  // pohled
  const DEF_T = new T.Vector3(9, 13, 0);
  const DEF_P = new T.Vector3(0.55, 0.42, 1).normalize().multiplyScalar(124).add(DEF_T);
  cam.position.copy(DEF_P);
  const controls = new T.OrbitControls(cam, cv);
  controls.target.copy(DEF_T); controls.enableDamping = true; controls.dampingFactor = 0.12;
  controls.minDistance = 50; controls.maxDistance = 260; controls.autoRotateSpeed = 1.2;
  controls.update();

  const st = { V: V1, v: 0, target: 0, cut: false, rot: true, kBody: '', kHex: '', kRing: '' };
  let raf = null, last = null, visible = true;
  const f3 = (x) => x.toFixed(3);
  const tick = (now) => {
    raf = null;
    const dt = last == null ? 0 : Math.min(0.05, (now - last) / 1000); last = now;
    if (st.v !== st.target) {
      const sp = dt / 1.5;
      st.v = st.target > st.v ? Math.min(st.target, st.v + sp) : Math.max(st.target, st.v - sp);
    }
    const v = st.v, V = st.V;
    // tělo
    const pts = dedupe(V.profile(v));
    const kb = pts.map((p) => f3(p[0]) + ',' + f3(p[1])).join(';');
    if (kb !== st.kBody) { st.kBody = kb; setGeo(body, latheGeo(pts)); bodyCap.geometry.dispose(); bodyCap.geometry = capGeo(both(pts)); }
    // šestihran
    const pr = V.prism(v);
    hex.visible = !!pr;
    if (pr) {
      const kh = [pr.y0, pr.y1, pr.r0, pr.core, pr.u].map(f3).join(',');
      if (kh !== st.kHex) {
        st.kHex = kh; setGeo(hex, prismGeo(pr));
        hexCap.geometry.dispose(); hexCap.geometry = capGeo(both(rect(pr.core, pr.r0 + (RC - pr.r0) * pr.u, pr.y0, pr.y1)));
      }
    }
    hexCap.visible = !!pr && st.cut;
    // kroužek (odpad z ostřižení, jen postup 1)
    const rg = V.ring(v);
    ring.visible = !!rg;
    if (rg) {
      const kr = [rg.r0, rg.u, rg.outer, rg.h].map(f3).join(',');
      if (kr !== st.kRing) {
        st.kRing = kr; setGeo(ringMesh, ringGeo(rg));
        ringCap.geometry.dispose(); ringCap.geometry = capGeo(both(rect(rg.r0 + (RC - rg.r0) * rg.u, rg.outer, -rg.h / 2, rg.h / 2)));
      }
      ring.position.set(rg.x, rg.y, 0);
      const w = rg.waste;
      mRing.color.setRGB(0.729 + (0.929 - 0.729) * w, 0.776 + (0.663 - 0.776) * w, 0.816 + (0.384 - 0.816) * w);
      mCapR.color.setRGB(0.102 + (0.55 - 0.102) * w, 0.133 + (0.25 - 0.133) * w, 0.171 + (0.07 - 0.171) * w);
    }
    bodyCap.visible = st.cut; ringCap.visible = st.cut;
    [mBody, mHex, mRing, lMat, lMatR].forEach((m) => { m.clippingPlanes = st.cut ? [clip] : []; });
    controls.autoRotate = st.rot && !st.cut;
    controls.update();
    const cw = W(), ch = H(), sz = renderer.getSize(new T.Vector2());
    if (sz.x !== cw || sz.y !== ch) { renderer.setSize(cw, ch); cam.aspect = cw / ch; cam.updateProjectionMatrix(); }
    renderer.render(scene, cam);
    if (visible) raf = requestAnimationFrame(tick);
  };
  const kick = () => { if (!raf && visible) { last = null; raf = requestAnimationFrame(tick); } };
  const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) kick(); });
  io.observe(host);
  kick();
  return {
    goTo: (i) => { st.target = clamp(i, 0, st.V.steps.length - 1); kick(); },
    setVariant: (k) => { if (st.V !== VARIANTS[k]) { st.V = VARIANTS[k]; st.v = 0; st.target = 0; st.kBody = st.kHex = st.kRing = ''; kick(); } },
    setCut: (c) => { st.cut = c; if (c) { cam.position.copy(DEF_P); controls.target.copy(DEF_T); } kick(); },
    setRot: (r) => { st.rot = r; kick(); },
    resetView: () => { cam.position.copy(DEF_P); controls.target.copy(DEF_T); controls.update(); kick(); },
    dispose: () => {
      if (raf) cancelAnimationFrame(raf); io.disconnect(); controls.dispose();
      [body, bodyCap, hex, hexCap, ringMesh, ringCap].forEach((m) => { m.geometry.dispose(); if (m.children[0]) m.children[0].geometry.dispose(); });
      [mBody, mHex, mRing, mCap, mCapR, lMat, lMatR].forEach((m) => m.dispose());
      renderer.dispose(); if (cv.parentNode) cv.parentNode.removeChild(cv);
    },
  };
}

const btn = (primary, on, disabled) => ({
  height: 34, padding: '0 14px', borderRadius: 10, fontFamily: HEAD, fontWeight: 700, fontSize: 13.5,
  cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1,
  background: primary ? ACC : (on ? 'rgba(123,163,204,0.22)' : 'rgba(120,150,180,0.06)'),
  color: primary ? '#0b1017' : (on ? '#eaf2fa' : '#c4d2de'),
  border: primary ? '1px solid rgba(123,163,204,0.5)' : (on ? '1px solid rgba(123,163,204,0.55)' : '1px solid rgba(150,180,210,0.2)'),
});

function PouzdroSvicky3D() {
  const hostRef = useRef(null), api = useRef(null), playT = useRef(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState(false);
  const [variant, setVariant] = useState(0);
  const [step, setStep] = useState(0);
  const [cut, setCut] = useState(false);
  const [rot, setRot] = useState(true);
  const [playing, setPlaying] = useState(false);
  const STEPS = VARIANTS[variant].steps, LAST = STEPS.length - 1;
  useEffect(() => {
    let alive = true;
    ensureThree().then(() => {
      if (!alive || !hostRef.current) return;
      api.current = build(hostRef.current);
      setReady(true);
    }).catch(() => { if (alive) setErr(true); });
    return () => { alive = false; clearTimeout(playT.current); if (api.current) api.current.dispose(); api.current = null; };
  }, []);
  useEffect(() => { if (api.current) { api.current.setVariant(variant); api.current.goTo(step); } }, [ready, variant, step]);
  useEffect(() => { if (api.current) api.current.setCut(cut); }, [ready, cut]);
  useEffect(() => { if (api.current) api.current.setRot(rot); }, [ready, rot]);
  useEffect(() => {
    clearTimeout(playT.current);
    if (!playing) return;
    if (step >= LAST) { setPlaying(false); return; }
    playT.current = setTimeout(() => setStep((s) => Math.min(LAST, s + 1)), 2600);
  }, [playing, step, LAST]);
  const go = (i) => { setPlaying(false); setStep(clamp(i, 0, LAST)); };
  const play = () => { if (playing) { setPlaying(false); return; } if (step >= LAST) setStep(0); setPlaying(true); };
  const pickVariant = (k) => { if (k === variant) return; setPlaying(false); setStep(0); setVariant(k); };
  const S = STEPS[step];
  const seg = (on, label, fn) => (
    <button type="button" onClick={fn} style={{
      flex: 1, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: HEAD, fontWeight: 700, fontSize: 13.5,
      background: on ? 'rgba(123,163,204,0.22)' : 'transparent', color: on ? '#eaf2fa' : '#8296a8',
    }}>{label}</button>
  );
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 14, padding: 16, boxSizing: 'border-box', fontFamily: SANS, color: '#eaf2fa' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0, minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" style={btn(false, false, !ready || step === 0)} disabled={!ready || step === 0} onClick={() => go(step - 1)}>← Předchozí</button>
          <button type="button" style={btn(true, false, !ready || step === LAST)} disabled={!ready || step === LAST} onClick={() => go(step + 1)}>Další →</button>
          <button type="button" style={btn(false, playing, !ready)} disabled={!ready} onClick={play}>{playing ? 'Zastavit' : 'Přehrát postup'}</button>
          <div style={{ width: 1, height: 24, background: 'rgba(150,180,210,0.2)', margin: '0 4px' }}></div>
          <button type="button" style={btn(false, cut, !ready)} disabled={!ready} onClick={() => setCut((c) => !c)}>Řez</button>
          <button type="button" style={btn(false, rot && !cut, !ready || cut)} disabled={!ready || cut} onClick={() => setRot((r) => !r)}>Otáčení</button>
          <button type="button" style={btn(false, false, !ready)} disabled={!ready} onClick={() => api.current && api.current.resetView()}>Výchozí pohled</button>
        </div>
        <div style={{ position: 'relative', flex: 1, minHeight: 0, background: '#0a0e15', border: '1px solid rgba(150,180,210,0.16)', borderRadius: 12, overflow: 'hidden' }}>
          <div ref={hostRef} style={{ position: 'absolute', inset: 0, cursor: 'grab', touchAction: 'none' }}></div>
          {!ready && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#8296a8' }}>
              {err ? '3D model se' + NB + 'nepodařilo načíst.' : 'Načítám 3D model…'}
            </div>
          )}
          <div style={{ position: 'absolute', left: 14, bottom: 12, fontSize: 12.5, color: '#66788a', pointerEvents: 'none' }}>{nb('Tažením myší model otočíš, kolečkem přiblížíš.')}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
        <div style={{ display: 'flex', gap: 2, padding: 2, borderRadius: 10, border: '1px solid rgba(150,180,210,0.2)', background: 'rgba(120,150,180,0.05)', flex: 'none' }}>
          {seg(variant === 0, 'Postup 1', () => pickVariant(0))}
          {seg(variant === 1, 'Postup 2', () => pickVariant(1))}
        </div>
        <div style={{ background: 'rgba(120,150,180,0.06)', border: '1px solid ' + HL, borderRadius: 12, padding: '12px 14px', minHeight: 150, boxSizing: 'border-box', flex: 'none' }}>
          <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.06em', color: '#8296a8', marginBottom: 4 }}>KROK {step + 1} / {STEPS.length}</div>
          <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 17, color: HL, marginBottom: 2 }}>{S.name}</div>
          <div style={{ fontSize: 13, color: ACC, marginBottom: 8 }}>{variant === 0 && step === LAST ? S.op : 'operace: ' + S.op}</div>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: '#d3dfea', textWrap: 'pretty' }}>{nb(S.text)}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', minHeight: 0 }}>
          {STEPS.map((s, i) => {
            const on = i === step;
            return (
              <button key={variant + '-' + i} type="button" onClick={() => go(i)} style={{
                display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', padding: '4px 10px', borderRadius: 8, cursor: 'pointer',
                border: '1px solid ' + (on ? 'rgba(237,169,98,0.55)' : 'transparent'),
                background: on ? 'rgba(237,169,98,0.12)' : 'transparent', fontFamily: SANS,
              }}>
                <span style={{ flex: 'none', width: 22, height: 22, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 12, background: on ? HL : 'rgba(120,150,180,0.12)', color: on ? '#0b1017' : '#aebfcf' }}>{i + 1}</span>
                <span style={{ fontSize: 14, fontWeight: on ? 600 : 500, color: on ? '#eaf2fa' : '#c4d2de' }}>{s.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
window.PouzdroSvicky3D = PouzdroSvicky3D;
})();
