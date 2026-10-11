// strizny-nastroj-3d.jsx — jednoduchý střižný nástroj ve 3D (three.js, render on demand).
(function () {
const { useState, useEffect, useRef } = React;
const SANS = "'IBM Plex Sans', system-ui, sans-serif";
const HEAD = "'Quicksand', system-ui, sans-serif";
const MONO = "'IBM Plex Mono', ui-monospace, monospace";
const ACC = '#7ba3cc', HL = '#eda962';
const NB = '\u00a0';
const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const ORBIT_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';

const PARTS = [
  { id: 'stopka', g: 'h', name: 'Stopka', color: '#b0574f', exY: 140, text: 'Pro bezchybný chod nástroje je nutné stopku umístit do těžiště střižných sil.' },
  { id: 'upinaci', g: 'h', name: 'Upínací deska', color: '#8b8a52', exY: 110, text: 'Nese horní část nástroje, je v' + NB + 'ní upnutá stopka a' + NB + 'připevněna k' + NB + 'ní opěrná a' + NB + 'kotevní deska.' },
  { id: 'operna', g: 'h', name: 'Opěrná deska', color: '#80679c', exY: 80, text: 'Slouží k' + NB + 'podepření střižníků, aby nedocházelo k' + NB + 'jejich zamačkávání do upínací desky.' },
  { id: 'kotevni', g: 'h', name: 'Kotevní deska', color: '#5e985f', exY: 50, text: 'Slouží k' + NB + 'ukotvení střižníků.' },
  { id: 'striznik', g: 'h', name: 'Střižník', color: '#c7ad52', exY: 50, text: 'Jsou to pracovní části nástroje různých tvarů. Upínají se do kotevní desky mnoha způsoby, např. roznýtováním, osazením.' },
  { id: 'pouzdra', g: 'h', name: 'Vodicí pouzdra', color: '#435e8c', exY: 110, text: 'Zalisovaná v' + NB + 'upínací desce, kloužou po vodicích sloupcích.' },
  { id: 'vodicideska', g: 's', name: 'Vodicí deska', color: '#8c4b49', exY: 0, text: 'Slouží k' + NB + 'vedení střižníků. Při zpětném pohybu beranu slouží i' + NB + 'jako stírač výstřižků ze' + NB + 'střižníků.' },
  { id: 'listy', g: 's', name: 'Vodicí lišty', color: '#c4824d', exY: -30, text: 'Slouží k' + NB + 'vedení pásu materiálu prostorem pod střižníky. Jejich vzdálenost musí být volena tak, aby materiál mezi nimi volně procházel.' },
  { id: 'striznice', g: 's', name: 'Střižnice', color: '#4e9896', exY: -70, text: 'Je pracovním elementem střihadla.' },
  { id: 'zakladova', g: 's', name: 'Základová deska', color: '#7c8289', exY: -120, text: 'Slouží k' + NB + 'upínání nástroje na' + NB + 'stůl lisu.' },
  { id: 'sloupky', g: 's', name: 'Vodicí sloupky', color: '#5b84b6', exY: -120, text: 'Zalisované v' + NB + 'základové desce. Zajišťují přesnou polohu horní části vůči spodní, takže vůle je po celém obvodu stejná.' },
  { id: 'podpera', g: 's', name: 'Podpěrný plech', color: '#cb9459', exY: -70, text: 'Podpírá pás před vstupem do nástroje, aby se neprohýbal.' },
  { id: 'doraz', g: 's', name: 'Doraz', color: '#8f959b', exY: -70, text: 'Zastaví posuv pásu přesně o' + NB + 'jeden krok, zapadá do díry po předchozím výstřižku.' },
  { id: 'pas', g: 'm', name: 'Pás plechu', color: '#b7c2ca', exY: 0, text: 'Polotovar, ze' + NB + 'kterého se stříhá; šířka B = 39' + NB + 'mm, tloušťka t = 3' + NB + 'mm.' },
  { id: 'vystrizek', g: 'm', name: 'Výstřižek', color: '#c6cfd6', exY: 0, text: 'Užitečný díl ⌀ 30' + NB + 'mm; propadá otvorem střižnice a' + NB + 'základové desky.' },
];
const PBY = {}; PARTS.forEach(p => { PBY[p.id] = p; });
const GROUPS = [['h', 'Horní část'], ['s', 'Spodní část'], ['m', 'Materiál']];
const UPPER = ['stopka', 'upinaci', 'operna', 'kotevni', 'striznik', 'pouzdra'];
const EX_Z = 110;

const loadScript = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
const ensureThree = () => window.__sn3dP || (window.__sn3dP = (window.THREE ? Promise.resolve() : loadScript(THREE_URL)).then(() => (window.THREE.OrbitControls ? null : loadScript(ORBIT_URL))));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;

function build(host, cb) {
  const T = window.THREE, HP = Math.PI / 2, TAU = Math.PI * 2, G = 0.04, SEG = 64;
  const EDGE = 0x30363e;
  const W = () => Math.max(1, host.clientWidth), H = () => Math.max(1, host.clientHeight);
  const renderer = new T.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(W(), H());
  renderer.setClearColor(0x0a0e15);
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.localClippingEnabled = true;
  const cv = renderer.domElement; cv.style.display = 'block';
  host.appendChild(cv);
  const scene = new T.Scene();
  const cam = new T.PerspectiveCamera(35, W() / H(), 10, 6000);
  scene.add(new T.HemisphereLight(0xffffff, 0x6a7b90, 0.6));
  const d1 = new T.DirectionalLight(0xffffff, 0.6); d1.position.set(-300, 700, 500); scene.add(d1);
  const d2 = new T.DirectionalLight(0xb8d4ff, 0.25); d2.position.set(500, -200, -500); scene.add(d2);
  const d3 = new T.DirectionalLight(0xffffff, 0.25); d3.position.set(400, -300, 600); scene.add(d3);

  const P = {};
  PARTS.forEach(p => {
    const base = new T.Color(p.color);
    P[p.id] = {
      base, light: base.clone().lerp(new T.Color(0xffffff), 0.3), exY: p.exY, meshes: [],
      plane: new T.Plane(new T.Vector3(0, 0, -1), 0),
      mat: new T.MeshStandardMaterial({ color: base.clone(), roughness: 0.88, metalness: 0, side: T.DoubleSide }),
      lmat: new T.LineBasicMaterial({ color: EDGE, transparent: true, opacity: 1 }),
      cut: base.clone().multiplyScalar(0.8), cutL: base.clone().lerp(new T.Color(0xffffff), 0.3).multiplyScalar(0.85),
      cmat: new T.MeshStandardMaterial({ color: base.clone(), roughness: 0.92, metalness: 0, side: T.DoubleSide }),
      clmat: new T.LineBasicMaterial({ color: EDGE, transparent: true, opacity: 1 }),
    };
  });
  const all = [];
  const add = (id, geo, parent) => {
    const m = new T.Mesh(geo, P[id].mat);
    m.add(new T.LineSegments(new T.EdgesGeometry(geo, 25), P[id].lmat));
    m.userData.id = id;
    (parent || scene).add(m); P[id].meshes.push(m); all.push(m);
    return m;
  };
  const box = (x0, x1, y0, y1, z0, z1) => { const g = new T.BoxGeometry(x1 - x0 - 2 * G, y1 - y0 - 2 * G, z1 - z0 - 2 * G); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return g; };
  const cyl = (r, y0, y1, x, z, seg) => { const g = new T.CylinderGeometry(r - G, r - G, y1 - y0 - 2 * G, seg || SEG); g.translate(x, (y0 + y1) / 2, z); return g; };
  const lathe = (pts, x, z) => { const g = new T.LatheGeometry(pts.map(p => new T.Vector2(p[0], p[1])), SEG); g.translate(x, 0, z); return g; };
  // deska s otvory: horní a spodní plocha, čtyři boky, stěny otvorů (profil r–y zdola nahoru)
  const plate = (id, x0, x1, y0, y1, z0, z1, holes, parent) => {
    x0 += G; x1 -= G; y0 += G; y1 -= G; z0 += G; z1 -= G;
    const face = top => {
      const s = new T.Shape(), sg = top ? -1 : 1;
      s.moveTo(x0, sg * z0); s.lineTo(x1, sg * z0); s.lineTo(x1, sg * z1); s.lineTo(x0, sg * z1); s.lineTo(x0, sg * z0);
      holes.forEach(h => { const r = top ? h.p[h.p.length - 1][0] : h.p[0][0]; const pa = new T.Path(); pa.absarc(h.x, sg * h.z, r, 0, TAU, false); s.holes.push(pa); });
      const g = new T.ShapeGeometry(s, SEG / 2); g.rotateX(top ? -HP : HP); g.translate(0, top ? y1 : y0, 0); return g;
    };
    const w = x1 - x0, h = y1 - y0, d = z1 - z0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
    const pf = new T.PlaneGeometry(w, h); pf.translate(cx, cy, z1);
    const pb = new T.PlaneGeometry(w, h); pb.rotateY(Math.PI); pb.translate(cx, cy, z0);
    const pr = new T.PlaneGeometry(d, h); pr.rotateY(HP); pr.translate(x1, cy, cz);
    const pl = new T.PlaneGeometry(d, h); pl.rotateY(-HP); pl.translate(x0, cy, cz);
    const walls = holes.map(hh => { const pts = hh.p.map(q => q.slice()); pts[0][1] = y0; pts[pts.length - 1][1] = y1; return lathe(pts, hh.x, hh.z); });
    [face(true), face(false), pf, pb, pr, pl].concat(walls).forEach(g => add(id, g, parent));
  };
  // řezné plochy v rovině z = 0 (plný materiál)
  const caps = [];
  const shapeOf = pts => { const s = new T.Shape(); s.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(q => s.lineTo(q[0], q[1])); s.closePath(); return s; };
  const rect = (x0, x1, y0, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const mirror = pts => pts.map(q => [-q[0], q[1]]).reverse();
  const capGeo = polys => new T.ShapeGeometry(polys.map(shapeOf));
  const addCap = (id, polys, parent) => {
    const g = capGeo(polys), m = new T.Mesh(g, P[id].cmat);
    m.add(new T.LineSegments(new T.EdgesGeometry(g, 25), P[id].clmat));
    m.userData.id = id; m.visible = false; (parent || P[id].meshes[0]).add(m); caps.push(m); return m;
  };
  const setCap = (m, polys) => { const g = capGeo(polys), e = m.children[0]; m.geometry.dispose(); e.geometry.dispose(); m.geometry = g; e.geometry = new T.EdgesGeometry(g, 25); };
  const SL = [[-90, -50], [90, 50]];
  const hole = (x, z, p) => ({ x, z, p });
  const straight = (x, z, r, y0, y1) => hole(x, z, [[r, y0], [r, y1]]);

  // spodní část
  plate('zakladova', -110, 110, 0, 25, -70, 70, [straight(0, 0, 25, 0, 25)].concat(SL.map(s => straight(s[0], s[1], 10.1, 0, 25))));
  SL.forEach(s => add('sloupky', cyl(10, 0, 109, s[0], s[1])));
  plate('striznice', -70, 70, 25, 55, -50, 50, [hole(0, 0, [[18, 25], [15.12, 47], [15.12, 55]])]);
  add('listy', box(-70, 70, 55, 63, 20, 45));
  add('listy', box(-70, 70, 55, 63, -45, -20));
  plate('vodicideska', -70, 70, 63, 83, -50, 50, [straight(0, 0, 15.12, 63, 83)]);
  add('podpera', box(-130, -70, 52, 55, -30, 30));
  [-20, 20].forEach(z => add('podpera', cyl(4, 49, 52, -78, z, 32)));
  add('doraz', cyl(3, 55, 58, 21, 0, 32));
  // horní část
  const up = new T.Group(); scene.add(up);
  add('stopka', cyl(20, 164, 214, 0, 0), up);
  add('upinaci', box(-110, 110, 134, 164, -70, 70), up);
  add('operna', box(-70, 70, 128, 134, -50, 50), up);
  plate('kotevni', -70, 70, 108, 128, -50, 50, [hole(0, 0, [[15.12, 108], [15.12, 122.9], [18.12, 122.9], [18.12, 128]])], up);
  add('striznik', lathe([[0.01, 75], [15, 75], [15, 123], [18, 123], [18, 128 - G], [0.01, 128 - G]], 0, 0), up);
  SL.forEach(s => add('pouzdra', lathe([[10.12, 94 + G], [16 - G, 94 + G], [16 - G, 134 - G], [10.12, 134 - G], [10.12, 94 + G]], s[0], s[1]), up));
  const both = pts => [pts, mirror(pts)];
  addCap('zakladova', both(rect(-110, -25, 0, 25)));
  addCap('striznice', both([[-70, 25], [-18, 25], [-15.12, 47], [-15.12, 55], [-70, 55]]));
  addCap('vodicideska', both(rect(-70, -15.12, 63, 83)));
  addCap('podpera', [rect(-130, -70, 52, 55)]);
  addCap('doraz', [rect(18, 24, 55, 58)]);
  addCap('stopka', [rect(-20, 20, 164, 214)]);
  addCap('upinaci', [rect(-110, 110, 134, 164)]);
  addCap('operna', [rect(-70, 70, 128, 134)]);
  addCap('kotevni', both([[-70, 108], [-15.12, 108], [-15.12, 122.9], [-18.12, 122.9], [-18.12, 128], [-70, 128]]));
  addCap('striznik', [[[-15, 75], [15, 75], [15, 123], [18, 123], [18, 128], [-18, 128], [-18, 123], [-15, 123]]]);
  // materiál
  const R = 15, HW = 19.5, XL = -130, XR = 100;
  const stripGeo = hs => {
    const s = new T.Shape();
    s.moveTo(XL, -HW); s.lineTo(XR, -HW);
    const notch = hs.find(c => c + R >= XR - 0.01 && c - R < XR);
    if (notch != null) {
      const dx = XR - notch, zc = Math.sqrt(Math.max(0, R * R - dx * dx));
      s.lineTo(XR, -zc); s.absarc(notch, 0, R, Math.atan2(-zc, dx), Math.atan2(zc, dx), true);
    }
    s.lineTo(XR, HW); s.lineTo(XL, HW); s.lineTo(XL, -HW);
    hs.filter(c => c + R < XR - 0.01).forEach(c => { const pa = new T.Path(); pa.absarc(c, 0, R, 0, TAU, false); s.holes.push(pa); });
    const g = new T.ExtrudeGeometry(s, { depth: 3 - 2 * G, bevelEnabled: false, curveSegments: SEG / 2 });
    g.rotateX(-HP); g.translate(0, 55 + G, 0); return g;
  };
  const stripCap = hs => {
    const out = []; let x = XL;
    hs.slice().sort((a, b) => a - b).forEach(c => { if (c - R > x) out.push(rect(x, Math.min(XR, c - R), 55, 58)); x = Math.max(x, c + R); });
    if (x < XR) out.push(rect(x, XR, 55, 58));
    return out;
  };
  let holes = [33, 66];
  const strip = add('pas', stripGeo(holes));
  const stripC = addCap('pas', stripCap(holes), strip);
  const setStrip = hs => {
    const g = stripGeo(hs), e = strip.children[0];
    strip.geometry.dispose(); e.geometry.dispose();
    strip.geometry = g; e.geometry = new T.EdgesGeometry(g, 25);
    setCap(stripC, stripCap(hs));
  };
  const blank = add('vystrizek', cyl(15, -1.5, 1.5, 0, 0));
  addCap('vystrizek', [rect(-15, 15, -1.5, 1.5)], blank);
  blank.visible = false;

  // pohled
  const DEF_T = new T.Vector3(0, 105, 0), DEF_P = new T.Vector3(0.62, 0.45, 0.8).normalize().multiplyScalar(760).add(DEF_T);
  cam.position.copy(DEF_P);
  const controls = new T.OrbitControls(cam, cv);
  controls.target.copy(DEF_T); controls.enableDamping = false; controls.minDistance = 250; controls.maxDistance = 1600;
  controls.update();

  const view = { sel: null, ex: false, cut: false, cols: true };
  const cur = { ex: 0 };
  let stroke = null, feed = null, raf = null, last = null;
  const kick = () => { if (!raf) { last = null; raf = requestAnimationFrame(tick); } };
  controls.addEventListener('change', kick);

  const strokeD = u => u < 0.42 ? 23 * ease(u / 0.42) : u < 0.55 ? 23 : 23 * (1 - ease((u - 0.55) / 0.45));
  function tick(now) {
    raf = null;
    const dt = last == null ? 0 : Math.min(0.05, (now - last) / 1000); last = now;
    let active = false;
    const tgt = view.ex ? 1 : 0;
    if (cur.ex !== tgt) { cur.ex = tgt > cur.ex ? Math.min(tgt, cur.ex + dt / 0.9) : Math.max(tgt, cur.ex - dt / 0.9); active = true; }
    const e = ease(cur.ex);
    let d = 0, lift = 0;
    if (stroke) {
      active = true;
      stroke.u = Math.min(1, stroke.u + dt / 2.4);
      d = strokeD(stroke.u);
      if (!stroke.cut && stroke.u < 0.5 && d >= 17) {
        stroke.cut = true; holes = holes.concat([0]); setStrip(holes); blank.visible = true; cb.onCut();
      }
      if (stroke.cut && stroke.fall == null && stroke.u >= 0.5) stroke.fall = 0;
      if (stroke.fall != null && blank.visible) { stroke.fall += dt; blank.position.y = 50.5 - 300 * stroke.fall * stroke.fall; if (blank.position.y < -40) blank.visible = false; }
      else if (stroke.cut && blank.visible) blank.position.y = 75 - d - 1.5;
      if (stroke.u >= 1 && !blank.visible) { stroke = null; d = 0; cb.onDone('stroke'); }
    }
    if (feed) {
      active = true;
      feed.u = Math.min(1, feed.u + dt / 1.6);
      const u = feed.u;
      lift = u < 0.2 ? ease(u / 0.2) : u < 0.8 ? 1 : 1 - ease((u - 0.8) / 0.2);
      const mv = ease(clamp((u - 0.2) / 0.6, 0, 1));
      if (mv !== feed.mv) { feed.mv = mv; setStrip(feed.base.map(c => c + 33 * mv).filter(c => c - R < XR)); }
      if (u >= 1) { holes = feed.base.map(c => c + 33).filter(c => c - R < XR); feed = null; lift = 0; cb.onDone('feed'); }
    }
    up.position.y = -d;
    all.forEach(m => { const id = m.userData.id; if (id !== 'pas' && id !== 'vystrizek') m.position.y = P[id].exY * e; });
    strip.position.set(0, 4 * lift, EX_Z * e);
    if (!stroke) {
      blank.visible = e > 0;
      blank.position.set(0, 56.5 - 45 * e, EX_Z * e);
    } else blank.position.z = 0;
    P.pas.plane.constant = EX_Z * e; P.vystrizek.plane.constant = stroke ? 0 : EX_Z * e;
    const cw = W(), ch = H(), sz = renderer.getSize(new T.Vector2());
    if (sz.x !== cw || sz.y !== ch) { renderer.setSize(cw, ch); cam.aspect = cw / ch; cam.updateProjectionMatrix(); }
    renderer.render(scene, cam);
    if (active) raf = requestAnimationFrame(tick);
  }

  const applyView = () => {
    PARTS.forEach(p => {
      const Q = P[p.id], isSel = view.sel === p.id, dim = !!view.sel && !isSel;
      const op = dim ? 0.15 : 1;
      Q.mat.color.copy(isSel ? Q.light : Q.base);
      Q.mat.transparent = op < 1; Q.mat.opacity = op; Q.mat.depthWrite = op === 1;
      Q.mat.side = op < 1 ? T.FrontSide : T.DoubleSide;
      Q.mat.clippingPlanes = view.cut ? [Q.plane] : [];
      Q.lmat.clippingPlanes = view.cut ? [Q.plane] : [];
      Q.lmat.color.setHex(isSel ? 0xf2f5f8 : (dim ? 0x9aa6b2 : EDGE)); Q.lmat.opacity = dim ? 0.12 : 1;
      Q.cmat.color.copy(isSel ? Q.cutL : Q.cut);
      Q.cmat.transparent = op < 1; Q.cmat.opacity = op; Q.cmat.depthWrite = op === 1;
      Q.clmat.color.copy(Q.lmat.color); Q.clmat.opacity = Q.lmat.opacity;
      Q.mat.needsUpdate = true; Q.lmat.needsUpdate = true; Q.cmat.needsUpdate = true; Q.clmat.needsUpdate = true;
      Q.meshes.forEach(m => { m.renderOrder = isSel ? 2 : 0; m.children[0].renderOrder = isSel ? 3 : 1; });
    });
    caps.forEach(m => { m.visible = view.cut; });
    ['sloupky', 'pouzdra'].forEach(id => P[id].meshes.forEach(m => { m.visible = view.cols; }));
    kick();
  };

  const ray = new T.Raycaster(), mv = new T.Vector2();
  let down = null;
  const onDown = e => { down = { x: e.clientX, y: e.clientY }; };
  const onUp = e => {
    if (!down) return;
    const moved = Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y); down = null;
    if (moved > 5) return;
    const rc = cv.getBoundingClientRect();
    mv.set(((e.clientX - rc.left) / rc.width) * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
    ray.setFromCamera(mv, cam);
    const hits = ray.intersectObjects(all.filter(m => m.visible).concat(caps.filter(m => m.visible && m.parent.visible)), false)
      .filter(h => !view.cut || h.point.z <= P[h.object.userData.id].plane.constant + 0.01);
    const selHit = view.sel && hits.find(h => h.object.userData.id === view.sel);
    cb.onPick(selHit ? view.sel : (hits[0] ? hits[0].object.userData.id : null));
  };
  cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointerup', onUp);
  const ro = new ResizeObserver(kick); ro.observe(host);
  applyView();

  return {
    setView: v => { Object.assign(view, v); applyView(); },
    stroke: () => { if (stroke || feed) return; stroke = { u: 0, cut: false, fall: null }; blank.position.set(0, 0, 0); kick(); },
    feed: () => { if (stroke || feed) return; feed = { u: 0, mv: -1, base: holes.slice() }; kick(); },
    resetView: () => { cam.position.copy(DEF_P); controls.target.copy(DEF_T); controls.update(); kick(); },
    dispose: () => {
      if (raf) cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
      cv.removeEventListener('pointerdown', onDown); cv.removeEventListener('pointerup', onUp);
      all.concat(caps).forEach(m => { m.geometry.dispose(); m.children[0].geometry.dispose(); });
      PARTS.forEach(p => { ['mat', 'lmat', 'cmat', 'clmat'].forEach(k => P[p.id][k].dispose()); });
      renderer.dispose(); if (cv.parentNode) cv.parentNode.removeChild(cv);
    },
  };
}

const btn = (primary, on, disabled) => ({
  height: 36, padding: '0 16px', borderRadius: 10, fontFamily: HEAD, fontWeight: 700, fontSize: 14,
  cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1,
  background: primary ? ACC : (on ? 'rgba(123,163,204,0.22)' : 'rgba(120,150,180,0.06)'),
  color: primary ? '#0b1017' : (on ? '#eaf2fa' : '#c4d2de'),
  border: primary ? '1px solid rgba(123,163,204,0.5)' : (on ? '1px solid rgba(123,163,204,0.55)' : '1px solid rgba(150,180,210,0.2)'),
});
const caption = { fontFamily: HEAD, fontWeight: 700, fontSize: 11.5, letterSpacing: '0.07em', textTransform: 'uppercase', color: ACC, margin: '0 0 4px' };

function StriznyNastroj3D() {
  const hostRef = useRef(null), api = useRef(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState(false);
  const [sel, setSel] = useState(null);
  const [ex, setEx] = useState(false);
  const [cut, setCut] = useState(false);
  const [cols, setCols] = useState(true);
  const [next, setNext] = useState('stroke');
  const [busy, setBusy] = useState(false);
  const [strokes, setStrokes] = useState(0);
  const [blanks, setBlanks] = useState(0);

  useEffect(() => {
    let alive = true;
    ensureThree().then(() => {
      if (!alive || !hostRef.current) return;
      api.current = build(hostRef.current, {
        onPick: id => setSel(s => (id === null || s === id) ? null : id),
        onCut: () => setBlanks(b => b + 1),
        onDone: k => { setBusy(false); setNext(k === 'stroke' ? 'feed' : 'stroke'); },
      });
      setReady(true);
    }).catch(() => { if (alive) setErr(true); });
    return () => { alive = false; if (api.current) api.current.dispose(); api.current = null; };
  }, []);
  useEffect(() => { if (api.current) api.current.setView({ sel, ex, cut, cols }); }, [ready, sel, ex, cut, cols]);

  const canStroke = ready && !busy && !ex && next === 'stroke';
  const canFeed = ready && !busy && !ex && next === 'feed';
  const doStroke = () => { if (!canStroke) return; setBusy(true); setStrokes(s => s + 1); api.current.stroke(); };
  const doFeed = () => { if (!canFeed) return; setBusy(true); api.current.feed(); };
  const toggleEx = () => { if (ready && !busy) setEx(v => !v); };
  const info = sel ? PBY[sel] : null;
  const seg = (on, label, fn) => (
    <button type="button" onClick={fn} style={{
      height: 30, padding: '0 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: HEAD, fontWeight: 700, fontSize: 13.5,
      background: on ? 'rgba(123,163,204,0.22)' : 'transparent', color: on ? '#eaf2fa' : '#8296a8',
    }}>{label}</button>
  );

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 270px', gap: 14, padding: 16, boxSizing: 'border-box', fontFamily: SANS, color: '#eaf2fa' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0, minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" style={btn(true, false, !canStroke)} disabled={!canStroke} onClick={doStroke}>Zdvih</button>
          <button type="button" style={btn(true, false, !canFeed)} disabled={!canFeed} onClick={doFeed}>Posuv pásu</button>
          <div style={{ width: 1, height: 26, background: 'rgba(150,180,210,0.2)', margin: '0 4px' }}></div>
          <button type="button" style={btn(false, ex, !ready || busy)} disabled={!ready || busy} onClick={toggleEx}>{ex ? 'Složit' : 'Rozložit'}</button>
          <button type="button" style={btn(false, cut, !ready)} disabled={!ready} onClick={() => setCut(v => !v)}>Řez</button>
          <button type="button" style={btn(false, false, !ready)} disabled={!ready} onClick={() => api.current && api.current.resetView()}>Výchozí pohled</button>
        </div>
        <div style={{ position: 'relative', flex: 1, minHeight: 0, background: '#0a0e15', border: '1px solid rgba(150,180,210,0.16)', borderRadius: 12, overflow: 'hidden' }}>
          <div ref={hostRef} style={{ position: 'absolute', inset: 0, cursor: 'grab', touchAction: 'none' }}></div>
          {!ready && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#8296a8' }}>
              {err ? '3D model se' + NB + 'nepodařilo načíst.' : 'Načítám 3D model…'}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#aebfcf' }}>
          <span>Vodicí sloupky:</span>
          <div style={{ display: 'flex', gap: 2, padding: 2, borderRadius: 10, border: '1px solid rgba(150,180,210,0.2)', background: 'rgba(120,150,180,0.05)' }}>
            {seg(cols, 'zobrazit', () => setCols(true))}
            {seg(!cols, 'skrýt', () => setCols(false))}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 18 }}>
            <span>zdvihy <span style={{ fontFamily: MONO, color: '#eaf2fa', fontSize: 15 }}>{strokes}</span></span>
            <span>výstřižky <span style={{ fontFamily: MONO, color: '#57b98a', fontSize: 15 }}>{blanks}</span></span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
        <div style={{ background: 'rgba(120,150,180,0.06)', border: '1px solid ' + (info ? HL : 'rgba(150,180,210,0.16)'), borderRadius: 12, padding: '12px 14px', minHeight: 92, boxSizing: 'border-box', flex: 'none' }}>
          <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 16, color: info ? HL : '#eaf2fa', marginBottom: 4 }}>{info ? info.name : 'Díly nástroje'}</div>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: '#d3dfea', textWrap: 'pretty' }}>{info ? info.text : 'Klikni na' + NB + 'díl v' + NB + 'modelu nebo v' + NB + 'seznamu.'}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', minHeight: 0 }}>
          {GROUPS.map(([g, label]) => (
            <div key={g}>
              <div style={caption}>{label}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {PARTS.filter(p => p.g === g).map(p => {
                  const on = sel === p.id;
                  return (
                    <button key={p.id} type="button" onClick={() => setSel(s => s === p.id ? null : p.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 9, height: 26, padding: '0 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                      fontFamily: SANS, fontWeight: 500, fontSize: 13.5,
                      background: on ? 'rgba(237,169,98,0.12)' : 'rgba(120,150,180,0.04)', color: on ? HL : '#d3dfea',
                      border: '1px solid ' + (on ? HL : 'rgba(150,180,210,0.14)'),
                    }}>
                      <span style={{ width: 11, height: 11, borderRadius: 3, background: p.color, flex: 'none' }}></span>{p.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
window.StriznyNastroj3D = StriznyNastroj3D;
})();
