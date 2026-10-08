(function () {
  if (customElements.get('nastroje-3d')) return;
  let threeP = null;
  const loadThree = () => threeP || (threeP = import('https://esm.sh/three@0.160.0'));

  function build(T, key) {
    const steel = new T.MeshStandardMaterial({ color: 0xb9c4cf, metalness: 0.45, roughness: 0.38 });
    const wood = new T.MeshStandardMaterial({ color: 0x9a6a42, metalness: 0, roughness: 0.75 });
    const g = new T.Group();
    const add = (geo, mat, x, y, z) => { const m = new T.Mesh(geo, mat || steel); m.position.set(x || 0, y || 0, z || 0); g.add(m); return m; };
    const taper = (len, h0, t0, h1, t1) => {
      const geo = new T.BoxGeometry(len, 1, 1);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const back = p.getX(i) > 0;
        p.setY(i, p.getY(i) * (back ? h1 : h0));
        p.setZ(i, p.getZ(i) * (back ? t1 : t0));
      }
      geo.computeVertexNormals();
      return geo;
    };
    const cylX = (r0, r1, len) => { const c = new T.CylinderGeometry(r1, r0, len, 32); c.rotateZ(-Math.PI / 2); return c; };
    const rod = (a, b, r) => {
      const A = new T.Vector3(...a), B = new T.Vector3(...b);
      const d = B.clone().sub(A);
      const m = add(new T.CylinderGeometry(r, r, d.length(), 20), steel);
      m.position.copy(A).add(B).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
      add(new T.SphereGeometry(r, 20, 12), steel, b[0], b[1], b[2]);
      return m;
    };
    const flat = (shape, depth, y, opts) => {
      const geo = new T.ExtrudeGeometry(shape, Object.assign({ depth: depth, bevelEnabled: false, curveSegments: 24 }, opts || {}));
      geo.rotateX(-Math.PI / 2);
      return add(geo, steel, 0, y, 0);
    };
    const roundRect = (x0, x1, w, r) => {
      const s = new T.Shape(), h = w / 2;
      s.moveTo(x0 + r, -h); s.lineTo(x1 - r, -h); s.quadraticCurveTo(x1, -h, x1, -h + r);
      s.lineTo(x1, h - r); s.quadraticCurveTo(x1, h, x1 - r, h); s.lineTo(x0 + r, h);
      s.quadraticCurveTo(x0, h, x0, h - r); s.lineTo(x0, -h + r); s.quadraticCurveTo(x0, -h, x0 + r, -h);
      return s;
    };

    if (key === 'pechovacka') {
      add(taper(1.8, 1.0, 0.05, 1.0, 0.32), steel, 0.9, 0, 0);
      add(taper(0.5, 1.0, 0.32, 0.26, 0.26), steel, 2.05, 0, 0);
      add(cylX(0.12, 0.12, 6.6), steel, 5.6, 0, 0);
      add(cylX(0.12, 0.22, 0.25), steel, 9.0, 0, 0);
      add(cylX(0.52, 0.52, 0.34), steel, 9.29, 0, 0);
    }

    if (key === 'lancetka') {
      const leaf = new T.Shape();
      leaf.moveTo(0, 0);
      leaf.quadraticCurveTo(0.7, 0.34, 1.9, 0.05);
      leaf.lineTo(1.9, -0.05);
      leaf.quadraticCurveTo(0.7, -0.34, 0, 0);
      flat(leaf, 0.04, -0.02);
      rod([1.85, 0, 0], [2.6, 0, 0], 0.07);
      rod([2.6, 0, 0], [7.3, 1.7, 0], 0.07);
      rod([7.3, 1.7, 0], [7.6, 1.7, 0], 0.07);
      flat(roundRect(7.55, 9.6, 0.6, 0.12), 0.05, 1.68);
    }

    if (key === 'hladitka') {
      // hladítko se zalomeným krčkem
      flat(roundRect(0, 3.0, 1.15, 0.35), 0.05, 0, { });
      g.children[g.children.length - 1].position.z = -1.6;
      rod([2.9, 0.05, -1.6], [3.15, 0.75, -1.6], 0.07);
      rod([3.15, 0.75, -1.6], [3.55, 0.95, -1.6], 0.07);
      const dir = new T.Vector3(1, 0.75, 0).normalize();
      const base = new T.Vector3(3.55, 0.95, -1.6);
      const fer = new T.Mesh(new T.CylinderGeometry(0.13, 0.11, 0.3, 24), steel);
      fer.position.copy(base).addScaledVector(dir, 0.15);
      fer.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
      g.add(fer);
      const prof = [[0.001, 0], [0.13, 0], [0.16, 0.25], [0.24, 0.7], [0.33, 1.25], [0.34, 1.55], [0.25, 1.85], [0.001, 1.95]].map(p => new T.Vector2(p[0], p[1]));
      const han = new T.Mesh(new T.LatheGeometry(prof, 32), wood);
      han.position.copy(base).addScaledVector(dir, 0.3);
      han.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
      g.add(han);
      // ploché hladítko s držadlem
      const s = new T.Shape();
      s.moveTo(0.4, -0.65); s.lineTo(2.1, -0.65); s.absarc(2.1, 0, 0.65, -Math.PI / 2, Math.PI / 2, false);
      s.lineTo(0.4, 0.65); s.lineTo(0.4, -0.65);
      const body = flat(s, 0.22, 0.08, { bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 4 });
      body.position.z = 1.6;
      add(new T.BoxGeometry(1.5, 0.3, 0.3), steel, 1.55, 0.53, 1.6);
    }
    if (key === 'sablonovani') {
      const sand = new T.MeshStandardMaterial({ color: 0xc9b48a, roughness: 1, metalness: 0, side: T.DoubleSide });
      const frame = new T.MeshStandardMaterial({ color: 0x6f7a86, metalness: 0.5, roughness: 0.5 });
      const W = 6.8, D = 6.4, t = 0.15, y0 = -3.05, y1 = 0.15, h = y1 - y0;
      add(new T.BoxGeometry(W + 2 * t, h, t), frame, 0, y0 + h / 2, D / 2 + t / 2);
      add(new T.BoxGeometry(W + 2 * t, h, t), frame, 0, y0 + h / 2, -D / 2 - t / 2);
      add(new T.BoxGeometry(t, h, D), frame, W / 2 + t / 2, y0 + h / 2, 0);
      add(new T.BoxGeometry(t, h, D), frame, -W / 2 - t / 2, y0 + h / 2, 0);
      [1, -1].forEach(sx => {
        const ear = new T.Shape();
        ear.moveTo(0, -0.35); ear.lineTo(0.7, -0.35); ear.lineTo(0.7, 0.35); ear.lineTo(0, 0.35); ear.lineTo(0, -0.35);
        const hole = new T.Path(); hole.absarc(0.42, 0, 0.14, 0, Math.PI * 2, true); ear.holes.push(hole);
        const geo = new T.ExtrudeGeometry(ear, { depth: 0.12, bevelEnabled: false, curveSegments: 20 });
        geo.rotateX(-Math.PI / 2);
        const m = new T.Mesh(geo, frame);
        m.position.set(sx * (W / 2 + t), y1 - 0.4, 0);
        if (sx < 0) m.rotation.y = Math.PI;
        g.add(m);
      });
      add(new T.BoxGeometry(W + 2 * t + 0.4, 0.12, D + 2 * t + 0.4), new T.MeshStandardMaterial({ color: 0x8a5a36, metalness: 0, roughness: 0.8 }), 0, y0 - 0.06, 0);
      const prof = [[2.7, 0], [2.3, -0.35], [1.5, -2.2], [1.2, -2.2], [1.2, -2.35], [0, -2.35]];
      const top = new T.Shape();
      top.moveTo(-W / 2, -D / 2); top.lineTo(W / 2, -D / 2); top.lineTo(W / 2, D / 2); top.lineTo(-W / 2, D / 2); top.lineTo(-W / 2, -D / 2);
      const rim = new T.Path(); rim.absarc(0, 0, prof[0][0], 0, Math.PI * 2, true); top.holes.push(rim);
      const topGeo = new T.ShapeGeometry(top, 64); topGeo.rotateX(-Math.PI / 2);
      add(topGeo, sand, 0, 0, 0);
      const lathe = new T.LatheGeometry(prof.map(p => new T.Vector2(p[0], p[1])), 64);
      add(lathe, sand, 0, 0, 0);
      add(new T.CylinderGeometry(0.1, 0.1, 4.8, 20), steel, 0, y0 + 2.4, 0);
      add(new T.CylinderGeometry(0.24, 0.24, 1.0, 24), steel, 0, 0.75, 0);
      const plate = new T.Shape();
      const edge = [[0.12, 1.1], [3.1, 1.1], [3.1, 0.02]].concat(prof.slice(0, -1).map(p => [p[0], p[1] + 0.02])).concat([[0.12, prof[prof.length - 1][1] + 0.02]]);
      plate.moveTo(edge[0][0], edge[0][1]);
      edge.slice(1).forEach(p => plate.lineTo(p[0], p[1]));
      plate.lineTo(edge[0][0], edge[0][1]);
      const pg = new T.ExtrudeGeometry(plate, { depth: 0.08, bevelEnabled: false });
      pg.translate(0, 0, -0.04);
      const tpl = new T.Group();
      tpl.add(new T.Mesh(pg, wood));
      g.add(tpl);
      g.userData.spin = tpl;
    }
    return g;
  }

  class Nastroje3D extends HTMLElement {
    static get observedAttributes() { return ['model']; }
    set model(v) { this._model = v; this._show(); }
    get model() { return this._model; }
    attributeChangedCallback(n, o, v) { if (n === 'model') this.model = v; }
    connectedCallback() {
      if (this._init) return;
      this._init = true;
      this.style.display = 'block';
      this.style.width = '100%';
      this.style.height = '100%';
      this.style.position = 'relative';
      this.style.cursor = 'grab';
      this.style.touchAction = 'none';
      loadThree().then(T => {
        this.T = T;
        const r = this.renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
        r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        r.domElement.style.display = 'block';
        r.domElement.style.width = '100%';
        r.domElement.style.height = '100%';
        this.appendChild(r.domElement);
        this.scene = new T.Scene();
        this.scene.add(new T.HemisphereLight(0xe8f0ff, 0x2a2420, 1.6));
        const d1 = new T.DirectionalLight(0xffffff, 2.2); d1.position.set(4, 8, 6); this.scene.add(d1);
        const d2 = new T.DirectionalLight(0xbcd0ff, 0.9); d2.position.set(-6, 3, -4); this.scene.add(d2);
        this.camera = new T.PerspectiveCamera(30, 1, 0.1, 200);
        this.pivot = new T.Group();
        this.scene.add(this.pivot);
        this.zoom = 1;
        this._bind();
        new ResizeObserver(es => { const b = es[0].contentRect; this._resize(b.width, b.height); }).observe(this);
        window.addEventListener('resize', () => this._resize());
        this._show();
        let tries = 0;
        const retry = () => { if (!this._resize() && tries++ < 100) setTimeout(retry, 100); };
        retry();
        new IntersectionObserver(() => this._resize()).observe(this);
      });
    }
    _bind() {
      let drag = null;
      this.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; this.setPointerCapture(e.pointerId); this.style.cursor = 'grabbing'; });
      this.addEventListener('pointermove', e => {
        if (!drag) return;
        this.pivot.rotation.y += (e.clientX - drag.x) * 0.01;
        this.pivot.rotation.x = Math.max(-1.4, Math.min(1.4, this.pivot.rotation.x + (e.clientY - drag.y) * 0.01));
        drag = { x: e.clientX, y: e.clientY };
        this._render();
      });
      const end = () => { drag = null; this.style.cursor = 'grab'; };
      this.addEventListener('pointerup', end);
      this.addEventListener('pointercancel', end);
      this.addEventListener('wheel', e => {
        e.preventDefault();
        this.zoom = Math.max(0.4, Math.min(2.5, this.zoom * (e.deltaY > 0 ? 1.1 : 0.9)));
        this._place();
      }, { passive: false });
    }
    _show() {
      if (!this.T || !this.pivot) return;
      const key = this._model || this.getAttribute('model') || 'pechovacka';
      if (key === this._shown) return;
      this._shown = key;
      this.pivot.clear();
      const obj = build(this.T, key);
      this._spin = obj.userData.spin || null;
      if (this._spin && !this._raf) {
        const tick = () => {
          if (!this._spin || !this.isConnected) { this._raf = null; return; }
          this._spin.rotation.y += 0.01;
          this._render();
          this._raf = requestAnimationFrame(tick);
        };
        this._raf = requestAnimationFrame(tick);
      }
      const box = new this.T.Box3().setFromObject(obj);
      obj.position.sub(box.getCenter(new this.T.Vector3()));
      this.pivot.add(obj);
      this.radius = box.getBoundingSphere(new this.T.Sphere()).radius;
      this.pivot.rotation.set(0.45, -0.55, 0);
      this.zoom = 1;
      this._place();
    }
    _place() {
      if (!this.camera || !this.radius) return;
      const dist = this.radius / Math.sin((this.camera.fov * Math.PI) / 360) * 1.05 * this.zoom;
      this.camera.position.set(0, 0, Math.max(dist, this.radius * 1.2 / Math.max(0.6, this.camera.aspect)));
      this.camera.lookAt(0, 0, 0);
      this._render();
    }
    _resize(w, h) {
      if (!this.renderer) return false;
      w = Math.round(w || this.clientWidth); h = Math.round(h || this.clientHeight);
      if (!w || !h) return false;
      if (w === this._w && h === this._h) return true;
      this._w = w; this._h = h;
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this._place();
      return true;
    }
    _render() {
      if (!this.renderer) return;
      if (this.clientWidth !== this._w || this.clientHeight !== this._h) { if (this._resize()) return; }
      this.renderer.render(this.scene, this.camera);
    }
  }
  customElements.define('nastroje-3d', Nastroje3D);
})();
