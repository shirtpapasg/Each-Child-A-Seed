/* <growseed-scene> — the 3D bench for ECAS Sim 1 Grow a Seed. Built on the P6 lab scene kit (first half, unchanged) and this sim's own bench (second half).
   Attributes (strings): plant (basil|kangkong|bayam), water (none|day|hour), light (dark|shade|sun), depth (shallow|deep), net (on|off),
   day (0-21), height (cm above soil), stage (seed|young|adult), outcome (healthy|dry|deep|drowned|pale|slow|eaten), sprout (day it breaks the soil), running (yes|no). */
(() => {
  if (window.__growseedScene) return;
  window.__growseedScene = true;
  /* ================= P6 lab scene kit: the same in every Primary 6 lab =================
     LabScene is the base element. A lab's own scene extends it and writes three things:
       build()            make the bench once (this.T is three.js, this.s the scene)
       update(dt, now)    every frame: move things from this.exp, this.setting, this.k …
       views              { intro: {x,y,z,hw,hh}, <part id>: {…} } where the camera looks
     What the page sends in (attributes) and what the kit keeps ready:
       experiment → this.exp      the part id, or 'intro'
       setting    → this.setting  the value being tested, as a string (this.num is it as a number)
       running    → this.running  true while a run plays; this.k goes 0 → 1 over `seconds`,
                                  and stays at 1 after the run until the setting changes
       reading    → this.reading  the number this run ends on (NaN when there is none)
       placed     → this.placed   cards placed so far in a hand-done task
       tested     → this.tested   settings that already have a run
       theme      → dark | light
     What it sends out: <EV>-cue { kind } for sounds, <EV>-pick { setting } when something is tapped. */
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = (k) => k * k * (3 - 2 * k);

  class LabScene extends HTMLElement {
    static get observedAttributes() { return ['experiment', 'setting', 'running', 'reading', 'seconds', 'placed', 'tested', 'theme', 'demo']; }

    constructor() {
      super();
      this.cfg = { experiment: 'intro', setting: '', running: 'no', reading: '', seconds: '3', placed: '', tested: '', theme: 'dark', demo: '' };
      this.demoK = 0;
      this.cam = { az: 0.35, el: 0.5, dist: 1 };
      this.look = {}; this.last = 0; this.k = 0; this.runT = 0;
      this.ptr = { x: 0.5, y: 0.5, in: false };
      this.pickables = [];
      this.labels = [];   /* every word label on the bench, for the explore mode */
      this.sync();
    }

    sync() {
      const c = this.cfg;
      this.exp = c.experiment || 'intro';
      this.setting = c.setting || '';
      this.num = parseFloat(c.setting);
      this.running = c.running === 'yes';
      this.reading = c.reading === '' ? NaN : parseFloat(c.reading);
      this.seconds = Math.max(0.5, parseFloat(c.seconds) || 3);
      this.placed = (c.placed || '').split(',').filter(Boolean);
      this.tested = (c.tested || '').split(',').filter(Boolean);
      this.demo = c.demo || '';   /* the tour's scene, while the welcome tour plays */
    }

    attributeChangedCallback(n, o, v) {
      if (o === v) return;
      this.cfg[n] = (v === null || v === undefined) ? '' : v;
      if (n === 'running' && v === 'yes') { this.runT = 0; this.k = 0; this.runAt = performance.now(); }
      if (n === 'running' && v !== 'yes' && o === 'yes') this.k = 1;   /* the run is over: hold its last picture */
      if ((n === 'setting' || n === 'experiment') && this.cfg.running !== 'yes') { this.runT = 0; this.k = 0; }
      this.sync();
      this.kick();
    }

    /* a hidden tab gets no frames: run a few steps by hand so the picture is never stale */
    kick() {
      if (!this.r) return;
      clearTimeout(this._kt);
      this._kt = setTimeout(() => {
        if (performance.now() - (this._tick || 0) < 300) return;
        let t = Math.max(this.last * 1000, 1);
        for (let i = 0; i < 30; i++) { t += 26; this.step(t); }
      }, 70);
    }

    connectedCallback() {
      if (this._booted) return;
      this._booted = true;
      Object.assign(this.style, { display: 'block', position: 'relative', width: '100%', height: '100%', background: '#08131f' });
      this.boot();
    }

    async boot() {
      const T = await import('https://unpkg.com/three@0.184.0/build/three.module.js');
      this.T = T;
      const r = new T.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
      r.setPixelRatio(Math.min(devicePixelRatio, 2));
      r.outputColorSpace = T.SRGBColorSpace;
      r.toneMapping = T.ACESFilmicToneMapping;
      r.toneMappingExposure = 1.25;
      r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap;
      r.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
      this.appendChild(r.domElement);
      this.r = r;
      const s = new T.Scene(); this.s = s;
      this.bgDark = new T.Color(0x10233a); this.bgLight = new T.Color(0xcfe3f2); this.bg = this.bgDark.clone();
      s.background = this.bg; s.fog = new T.Fog(this.bg, 9, 20);
      this.hemi = new T.HemisphereLight(0xbfd8ff, 0x3a3020, 1.7); s.add(this.hemi);
      this.key = new T.DirectionalLight(0xfff2dc, 2.2); this.key.position.set(2.4, 4.2, 2.6);
      this.key.castShadow = true; this.key.shadow.mapSize.set(1536, 1536);
      Object.assign(this.key.shadow.camera, { left: -3.4, right: 3.4, top: 3.4, bottom: -3.4, near: 0.5, far: 12 });
      this.key.shadow.bias = -0.0006; this.key.shadow.radius = 4;
      s.add(this.key);
      this.themeK = 0;
      this.build();
      this.cm = new T.PerspectiveCamera(36, 1, 0.01, 30);
      this.ray = new T.Raycaster(); this.ndc = new T.Vector2();
      this.bindPointer();
      new ResizeObserver(() => this.resize()).observe(this);
      this.resize();
      r.setAnimationLoop((ms) => { this._tick = performance.now(); this.step(ms); });
      this.kick();
    }

    /* ---------- making things ---------- */
    mat(color, extra) { return new this.T.MeshStandardMaterial(Object.assign({ color, roughness: 0.75 }, extra || {})); }
    mesh(geo, color, o) {
      o = o || {};
      const m = new this.T.Mesh(geo, color && color.isMaterial ? color : this.mat(color, o.mat));
      if (o.pos) m.position.set(o.pos[0], o.pos[1], o.pos[2]);
      if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
      if (o.scale) { if (o.scale.length) m.scale.set(o.scale[0], o.scale[1], o.scale[2]); else m.scale.setScalar(o.scale); }
      m.castShadow = o.cast !== false; m.receiveShadow = o.receive !== false;
      if (o.name) m.name = o.name;
      (o.parent || this.s).add(m);
      return m;
    }
    box(w, h, d, color, o) { return this.mesh(new this.T.BoxGeometry(w, h, d), color, o); }
    cyl(rt, rb, h, color, o) { return this.mesh(new this.T.CylinderGeometry(rt, rb, h, (o && o.seg) || 24), color, o); }
    sph(r, color, o) { return this.mesh(new this.T.SphereGeometry(r, (o && o.seg) || 20, 14), color, o); }
    cone(r, h, color, o) { return this.mesh(new this.T.ConeGeometry(r, h, (o && o.seg) || 20), color, o); }
    torus(r, tube, color, o) { return this.mesh(new this.T.TorusGeometry(r, tube, 10, (o && o.seg) || 36), color, o); }
    group(parent, pos, name) { const g = new this.T.Group(); if (pos) g.position.set(pos[0], pos[1], pos[2]); if (name) g.name = name; (parent || this.s).add(g); return g; }

    /* the room: a floor and a wooden bench top at y = 0 */
    table(w, d) {
      w = w || 4.2; d = d || 2.2;
      this.box(40, 0.02, 40, 0x0c1a2b, { pos: [0, -0.92, 0], cast: false, mat: { roughness: 1 } });
      this.box(w, 0.09, d, 0x8a5a34, { pos: [0, -0.045, 0], mat: { roughness: 0.62 }, name: 'bench_top' });
      this.box(w - 0.2, 0.05, d - 0.2, 0x6f4526, { pos: [0, -0.115, 0] });
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(p => this.box(0.1, 0.84, 0.1, 0x5a3820, { pos: [p[0] * (w / 2 - 0.14), -0.5, p[1] * (d / 2 - 0.14)] }));
    }

    /* a word label that always faces the camera: label('MOUSE', '#ffb627') */
    label(text, css, unit) {
      const T = this.T, cv = document.createElement('canvas');
      const W = 768, LH = 74, H = LH + 60;
      cv.width = W; cv.height = H;
      const cx = cv.getContext('2d');
      cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.font = '900 54px Nunito, system-ui, sans-serif';
      const tw = cx.measureText(text).width;
      const pw = Math.min(W - 10, tw + 80), ph = LH + 26, x0 = (W - pw) / 2, y0 = (H - ph) / 2, rr = Math.min(ph / 2, 40);
      cx.beginPath(); cx.moveTo(x0 + rr, y0);
      cx.arcTo(x0 + pw, y0, x0 + pw, y0 + ph, rr); cx.arcTo(x0 + pw, y0 + ph, x0, y0 + ph, rr);
      cx.arcTo(x0, y0 + ph, x0, y0, rr); cx.arcTo(x0, y0, x0 + pw, y0, rr); cx.closePath();
      cx.fillStyle = 'rgba(9,16,26,.92)'; cx.fill();
      cx.lineWidth = 5; cx.strokeStyle = css || '#ffb627'; cx.stroke();
      cx.fillStyle = css || '#ffb627'; cx.fillText(text, W / 2, H / 2);
      const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace;
      const sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
      sp.renderOrder = 40;
      const kk = (unit || 0.13) / 100;
      sp.scale.set(pw * kk, ph * kk, 1);
      sp.userData.redraw = null;
      sp.userData.text = text; this.labels.push(sp);
      return sp;
    }

    /* a flat card with a picture (an emoji) and words on it, e.g. a label card or a food-chain card.
       card({ w, h, glyph: '🐸', title: 'FROG', lines: ['…'], bg: '#f4efe2', ink: '#1b2633' }) → Mesh;
       mesh.userData.paint({ … }) redraws it with new words. */
    card(o) {
      const T = this.T, cv = document.createElement('canvas');
      const w = o.w || 0.4, h = o.h || 0.5;
      cv.width = 512; cv.height = Math.round(512 * h / w);
      const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
      const paint = (p) => {
        const cx = cv.getContext('2d'), W = cv.width, H = cv.height;
        cx.clearRect(0, 0, W, H);
        cx.fillStyle = p.bg || '#f4efe2';
        const rr = 34; cx.beginPath(); cx.moveTo(rr, 0); cx.arcTo(W, 0, W, H, rr); cx.arcTo(W, H, 0, H, rr); cx.arcTo(0, H, 0, 0, rr); cx.arcTo(0, 0, W, 0, rr); cx.closePath(); cx.fill();
        cx.lineWidth = 12; cx.strokeStyle = p.edge || '#1b2633'; cx.stroke();
        cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillStyle = p.ink || '#1b2633';
        let y = 40;
        if (p.glyph) { const gs = Math.min(W * 0.52, H * 0.42); cx.font = gs + 'px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif'; cx.fillText(p.glyph, W / 2, y + gs * 0.56); y += gs * 1.12; }
        if (p.title) { let fs = 64; cx.font = '900 ' + fs + 'px Nunito, system-ui, sans-serif'; while (cx.measureText(p.title).width > W - 50 && fs > 26) { fs -= 4; cx.font = '900 ' + fs + 'px Nunito, system-ui, sans-serif'; } cx.fillText(p.title, W / 2, y + 36); y += 84; }
        (p.lines || []).forEach((ln, i) => { let fs = p.big && i === 0 ? 92 : 44; cx.fillStyle = i === 0 && p.accent ? p.accent : (p.ink || '#1b2633'); cx.font = '900 ' + fs + 'px Nunito, system-ui, sans-serif'; while (cx.measureText(ln).width > W - 50 && fs > 22) { fs -= 4; cx.font = '900 ' + fs + 'px Nunito, system-ui, sans-serif'; } cx.fillText(ln, W / 2, y + fs * 0.6); y += fs * 1.2; });
        tex.needsUpdate = true;
      };
      paint(o);
      const front = new T.MeshStandardMaterial({ map: tex, roughness: 0.8 });
      const side = this.mat(0x1b2633), back = this.mat(o.back || 0x2f6fd6, { roughness: 0.6 });
      const m = new T.Mesh(new T.BoxGeometry(w, h, 0.012), [side, side, side, side, front, back]);
      m.castShadow = true; m.receiveShadow = true;
      m.userData.paint = (p) => { paint(Object.assign({}, o, p)); if (p && p.title) m.userData.text = String(p.title); };   /* a repainted card keeps its name for the explore mode */
      if (o.title) { m.userData.text = String(o.title); this.labels.push(m); }   /* a card with a title is a named thing for the explore mode */
      (o.parent || this.s).add(m);
      if (o.pos) m.position.set(o.pos[0], o.pos[1], o.pos[2]);
      return m;
    }

    /* a standing bar that fills: const m = this.meter({ h: 0.6, color: 0x5ee07a, pos: [x, 0, z] }); m.set(0.4) */
    meter(o) {
      const g = this.group(o.parent, o.pos), h = o.h || 0.6, w = o.w || 0.09;
      this.box(w + 0.03, h + 0.03, 0.03, 0x0e1925, { parent: g, pos: [0, h / 2, -0.012] });
      const fill = this.box(w, h, 0.03, o.color || 0x5ee07a, { parent: g, pos: [0, h / 2, 0.006], mat: { emissive: o.color || 0x5ee07a, emissiveIntensity: 0.45 }, cast: false });
      fill.scale.y = 0.001; fill.position.y = 0;
      g.userData.v = 0;
      g.userData.set = (f, k) => { g.userData.v = lerp(g.userData.v, clamp(f, 0, 1), k === undefined ? 1 : k); const v = Math.max(0.001, g.userData.v); fill.scale.y = v; fill.position.y = h * v / 2; };
      return g;
    }

    /* ---------- things many labs share ---------- */
    /* a small rodent, about 0.3 long, facing +x; parts are returned for animating */
    rodent(color, parent, pos) {
      const g = this.group(parent, pos), fur = this.mat(color || 0xb98a5e, { roughness: 0.9 }), pink = this.mat(0xf2a6a0);
      const body = this.sph(0.11, fur, { parent: g, pos: [0, 0.1, 0], scale: [1.35, 0.95, 0.95] });
      const head = this.sph(0.07, fur, { parent: g, pos: [0.15, 0.13, 0], scale: [1.1, 0.95, 0.95] });
      this.sph(0.018, pink, { parent: g, pos: [0.225, 0.125, 0] });
      [-1, 1].forEach(sd => { this.sph(0.028, pink, { parent: g, pos: [0.13, 0.2, sd * 0.045], scale: [0.5, 1, 1] }); this.sph(0.012, 0x101418, { parent: g, pos: [0.19, 0.15, sd * 0.034], mat: { roughness: 0.2 } }); });
      const legs = [[0.07, 1], [0.07, -1], [-0.07, 1], [-0.07, -1]].map(p => this.sph(0.026, pink, { parent: g, pos: [p[0], 0.02, p[1] * 0.06], scale: [1.3, 0.7, 1] }));
      const tail = this.cyl(0.006, 0.012, 0.2, pink, { parent: g, pos: [-0.22, 0.07, 0], rot: [0, 0, 1.2] });
      return { g, body, head, legs, tail };
    }
    /* a running wheel standing on the bench; spin wheel.rim.rotation.z */
    wheel(parent, pos, r) {
      r = r || 0.3;
      const g = this.group(parent, pos), metal = this.mat(0x9fb4c8, { metalness: 0.5, roughness: 0.35 });
      const rim = this.group(g, [0, r + 0.06, 0]);
      [-0.09, 0.09].forEach(z => this.torus(r, 0.012, metal, { parent: rim, pos: [0, 0, z] }));
      for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; this.cyl(0.006, 0.006, 0.18, metal, { parent: rim, pos: [Math.cos(a) * r, Math.sin(a) * r, 0], rot: [Math.PI / 2, 0, 0], seg: 6 }); }
      this.box(0.03, r + 0.1, 0.03, 0x5a6775, { parent: g, pos: [0, (r + 0.1) / 2, -0.13] });
      this.cyl(0.012, 0.012, 0.28, 0x5a6775, { parent: g, pos: [0, r + 0.06, -0.02], rot: [Math.PI / 2, 0, 0], seg: 8 });
      this.box(0.3, 0.02, 0.2, 0x5a6775, { parent: g, pos: [0, 0.01, -0.08] });
      return { g, rim, r };
    }
    /* a desk lamp with a light inside: lamp.bulb (material to glow), lamp.light (PointLight) */
    lamp(parent, pos, h) {
      h = h || 0.9;
      const g = this.group(parent, pos), metal = this.mat(0x3a4452, { metalness: 0.4, roughness: 0.4 });
      this.cyl(0.13, 0.15, 0.03, metal, { parent: g, pos: [0, 0.015, 0] });
      this.cyl(0.014, 0.014, h, metal, { parent: g, pos: [0, h / 2, 0], seg: 8 });
      const head = this.group(g, [0, h, 0]);
      this.cyl(0.014, 0.014, 0.34, metal, { parent: head, pos: [0.15, 0, 0], rot: [0, 0, Math.PI / 2], seg: 8 });
      this.cone(0.12, 0.16, 0xffb627, { parent: head, pos: [0.32, -0.02, 0], mat: { roughness: 0.4, side: this.T.DoubleSide } });
      const bulbM = this.mat(0xfff3c4, { emissive: 0xffe9a0, emissiveIntensity: 0 });
      this.sph(0.05, bulbM, { parent: head, pos: [0.32, -0.08, 0], cast: false });
      const light = new this.T.PointLight(0xffe2a0, 0, 4, 1.6); light.position.set(0.32, -0.12, 0); head.add(light);
      return { g, head, bulb: bulbM, light };
    }
    /* a glass beaker; beaker.water is the liquid mesh (scale.y to fill) */
    beaker(parent, pos, r, h, liquid) {
      r = r || 0.18; h = h || 0.36;
      const g = this.group(parent, pos), T = this.T;
      const glass = new T.MeshPhysicalMaterial({ color: 0xcfe8ff, roughness: 0.08, transmission: 0.9, transparent: true, opacity: 0.32, thickness: 0.02, side: T.DoubleSide, depthWrite: false });
      this.mesh(new T.CylinderGeometry(r, r, h, 32, 1, true), glass, { parent: g, pos: [0, h / 2, 0], cast: false });
      this.cyl(r, r, 0.012, glass, { parent: g, pos: [0, 0.006, 0], cast: false });
      const water = this.cyl(r * 0.96, r * 0.96, h * 0.8, new T.MeshStandardMaterial({ color: liquid || 0x5fb8ff, transparent: true, opacity: 0.38, roughness: 0.1, depthWrite: false }), { parent: g, pos: [0, h * 0.4 + 0.01, 0], cast: false });
      return { g, water, r, h };
    }
    /* a potted plant with n broad leaves; plant.leaves are the leaf meshes, plant.leafM their material */
    potPlant(parent, pos, n, height) {
      n = n || 6; height = height || 0.42;
      const g = this.group(parent, pos);
      this.cyl(0.13, 0.1, 0.16, 0xb5651d, { parent: g, pos: [0, 0.08, 0] });
      this.cyl(0.12, 0.12, 0.02, 0x3b2a1a, { parent: g, pos: [0, 0.16, 0], cast: false });
      const stemM = this.mat(0x5aa64e), leafM = this.mat(0x3fae4d, { roughness: 0.6, side: this.T.DoubleSide });
      this.cyl(0.012, 0.018, height, stemM, { parent: g, pos: [0, 0.16 + height / 2, 0], seg: 8 });
      const leaves = [];
      for (let i = 0; i < n; i++) {
        const a = i * 2.4, y = 0.2 + height * (0.25 + 0.75 * i / n), L = 0.13 - i * 0.008;
        const lf = this.sph(L, leafM, { parent: g, pos: [Math.cos(a) * L * 0.9, y, Math.sin(a) * L * 0.9], rot: [0.5 * Math.sin(a), -a, 0.5 * Math.cos(a)], scale: [1, 0.12, 0.55] });
        leaves.push(lf);
      }
      return { g, leaves, leafM, stemM };
    }

    /* ---------- pointer: drag to orbit, wheel to zoom, tap to pick ---------- */
    bindPointer() {
      const el = this.r.domElement;
      let drag = null, moved = 0;
      el.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; moved = 0; try { el.setPointerCapture(e.pointerId); } catch (x) {} });
      el.addEventListener('pointermove', (e) => {
        if (!drag) return;
        moved += Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y);
        if (moved > 6) { this.cam.az -= (e.clientX - drag.x) * 0.006; this.cam.el = clamp(this.cam.el + (e.clientY - drag.y) * 0.004, 0.08, 1.3); }
        drag = { x: e.clientX, y: e.clientY };
      });
      el.addEventListener('pointerup', (e) => { if (drag && moved < 6) this.tap(e); drag = null; });
      el.addEventListener('wheel', (e) => { e.preventDefault(); this.cam.dist = clamp(this.cam.dist * (1 + Math.sign(e.deltaY) * 0.08), 0.5, 2.2); }, { passive: false });
    }
    /* anything in this.pickables with userData.setting chooses that setting when tapped */
    /* explore mode (demo="show"): tap anything on the bench and the nearest word label names it */
    explore(e) {
      const r = this.getBoundingClientRect();
      this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
      this.ray.setFromCamera(this.ndc, this.cm);
      const things = []; this.s.traverse(o => { if (o.isMesh && o.visible && o.name !== 'bench_top' && !(o.geometry && o.geometry.parameters && o.geometry.parameters.width >= 20)) things.push(o); });
      const hit = this.ray.intersectObjects(things, false).find(h => h.point.y > -0.2);
      if (!hit) return;
      const p = hit.point, wp = new this.T.Vector3();
      let best = null, bd = 1.5;
      this.labels.forEach(sp => { if (!sp.visible) return; sp.getWorldPosition(wp); const d = Math.hypot(wp.x - p.x, (wp.y - p.y) * 0.5, wp.z - p.z); if (d < bd) { bd = d; best = sp; } });
      if (!best) { window.dispatchEvent(new CustomEvent(this.constructor.EV + '-info', { detail: { name: '' } })); return; }
      best.userData.pulse = performance.now();
      window.dispatchEvent(new CustomEvent(this.constructor.EV + '-info', { detail: { name: best.userData.text } }));
    }
    tap(e) {
      if (this.cm && this.demo === 'show') { this.explore(e); return; }
      if (!this.cm || !this.pickables.length) return;
      const r = this.getBoundingClientRect();
      this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
      this.ray.setFromCamera(this.ndc, this.cm);
      const hit = this.ray.intersectObjects(this.pickables.filter(o => o.visible), true)[0];
      if (!hit) return;
      let o = hit.object; while (o && o.userData.setting === undefined) o = o.parent;
      if (o && (!o.userData.exp || o.userData.exp === this.exp)) this.pick(o.userData.setting);
    }
    pickable(obj, setting, exp) { obj.userData.setting = String(setting); if (exp) obj.userData.exp = exp; this.pickables.push(obj); return obj; }
    pick(setting) { window.dispatchEvent(new CustomEvent(this.constructor.EV + '-pick', { detail: { setting: String(setting) } })); }
    cue(kind) { window.dispatchEvent(new CustomEvent(this.constructor.EV + '-cue', { detail: { kind } })); }

    resize() {
      if (!this.r) return;
      const w = this.clientWidth || 800, h = this.clientHeight || 500;
      this.r.setSize(w, h, false); this.vw = w; this.vh = h;
    }

    step(ms) {
      const now = ms / 1000, dt = Math.min(0.05, Math.max(0, this.last ? now - this.last : 0.016));
      this.last = now;
      if (this.running) { this.runT = (performance.now() - (this.runAt || performance.now())) / 1000; this.k = clamp(this.runT / this.seconds, 0, 1); }
      this.ease = (k) => 1 - Math.exp(-dt * k);
      /* light and dark */
      this.themeK = lerp(this.themeK, this.cfg.theme === 'light' ? 1 : 0, this.ease(6));
      this.bg.copy(this.bgDark).lerp(this.bgLight, this.themeK); this.s.fog.color.copy(this.bg);
      this.hemi.intensity = 1.7 + 0.5 * this.themeK;
      try { this.update(dt, now); } catch (e) { if (!this._warned) { this._warned = true; console.error('[scene] update failed', e); } }
      this.draw(dt);
    }

    /* a close look at whatever the pupil has chosen: a tappable thing with that id on the bench, else the step's own
       close-up (this.closeups[exp]), else the step's view pulled in to 62%. Nothing chosen: the step's full view. */
    autoFocus() {
      if (this.autoZoom === false || !this.setting || this.setting === 'act' || this.demo || this.exp === 'intro') return null;
      const obj = this.pickables.find(o => o.userData.setting === this.setting && !o.userData.noZoom && (!o.userData.exp || o.userData.exp === this.exp) && o.visible && o.scale.x > 0.01);
      if (obj) {
        const box = new this.T.Box3().setFromObject(obj);
        if (!box.isEmpty()) {
          const size = box.getSize(new this.T.Vector3()), c = box.getCenter(new this.T.Vector3());
          if (Math.max(size.x, size.z) <= 1.6) return { x: c.x, y: c.y, z: c.z, hw: Math.max(size.x, size.z) * 0.8 + 0.3, hh: size.y * 0.7 + 0.2 };
        }
      }
      const c = this.closeups && this.closeups[this.exp]; if (c) return c;
      const b = this.views && this.views[this.exp]; if (!b) return null;
      return { x: b.x, y: b.y, z: b.z, hw: b.hw * 0.62, hh: b.hh * 0.62, az: b.az, el: b.el };
    }

    draw(dt) {
      const c = this.cm, cd = this.cam, W = this.vw || 800, H = this.vh || 500, aspect = W / H, e = 1 - Math.exp(-dt * 4);
      /* a close look: a scene may set this.zoomTo = { x, y, z, hw, hh }; otherwise the camera moves in on whichever tappable thing
         is chosen (its id in the setting attribute), and comes back out when nothing is chosen. this.autoZoom = false switches that off. */
      if (this.demo === 'show') this.labels.forEach(sp => { if (!sp.isSprite) return; const t = sp.userData.pulse ? (performance.now() - sp.userData.pulse) / 600 : 2; const k = t < 1 ? 1 + 0.35 * Math.sin(t * Math.PI) : 1; if (!sp.userData.base) sp.userData.base = sp.scale.clone(); sp.scale.copy(sp.userData.base).multiplyScalar(k); });
      const V = this.zoomTo || (this.demo === 'show' && this.views && this.views.intro) || this.autoFocus() || (this.views && (this.views[this.exp] || this.views.intro)) || { x: 0, y: 0.25, z: 0, hw: 1.9, hh: 0.9 };
      const L = this.look;
      ['x', 'y', 'z', 'hw', 'hh'].forEach(k => { L[k] = L[k] === undefined ? V[k] : lerp(L[k], V[k], e); });
      const tanH = Math.tan(18 * Math.PI / 180);
      const d = cd.dist * Math.max(L.hh / tanH, L.hw / (tanH * Math.max(aspect, 0.45)));
      c.aspect = aspect; c.updateProjectionMatrix();
      /* the welcome tour's first scene: the bench turns a quarter and comes back */
      this.demoK = lerp(this.demoK, this.demo === 'bench' ? 1 : 0, e);
      const az = cd.az + (V.az || 0) + Math.sin(this.last * 1.1) * 0.45 * this.demoK, el = clamp(cd.el + (V.el || 0), 0.08, 1.35);
      c.position.set(L.x + Math.sin(az) * Math.cos(el) * d, L.y + Math.sin(el) * d, L.z + Math.cos(az) * Math.cos(el) * d);
      c.lookAt(L.x, L.y, L.z);
      this.r.setViewport(0, 0, W, H);
      this.r.render(this.s, c);
    }
  }


  const PL = {
    basil:    { stem: 0x7a4a8a, leaf: 0x3d9a45, shape: [1.0, 0.12, 0.62], flower: 'spike', fcol: 0xb48ad6, tag: 'THAI BASIL' },
    kangkong: { stem: 0x8fc46a, leaf: 0x4fae4a, shape: [1.7, 0.1, 0.42], flower: 'trumpet', fcol: 0xf6eaf2, tag: 'KANG KONG' },
    bayam:    { stem: 0xc0405a, leaf: 0x6aa83e, shape: [1.1, 0.12, 0.85], flower: 'tassel', fcol: 0xc23a5a, tag: 'BAYAM' }
  };
  class GrowSeedScene extends LabScene {
    static get EV() { return 'growseed'; }
    static get observedAttributes() { return LabScene.observedAttributes.concat(['plant', 'water', 'light', 'depth', 'net', 'pot', 'day', 'height', 'stage', 'outcome', 'sprout']); }
    build() {
      const T = this.T;
      this.autoZoom = false;
      this.table(3.2, 2.0);
      this.views = { intro: { x: 0.05, y: 0.62, z: 0, hw: 1.2, hh: 0.85 } };
      this.cam.az = 0.28; this.cam.el = 0.32;
      /* window and sun */
      this.box(2.4, 1.6, 0.04, 0x9fd4ff, { pos: [0, 1.0, -0.85], mat: { roughness: 0.1, transparent: true, opacity: 0.45 }, cast: false });
      [[-1.2], [1.2], [0]].forEach(p => this.box(0.06, 1.66, 0.08, 0xf4efe2, { pos: [p[0], 1.0, -0.85] }));
      this.box(2.46, 0.06, 0.08, 0xf4efe2, { pos: [0, 1.83, -0.85] }); this.box(2.46, 0.06, 0.08, 0xf4efe2, { pos: [0, 0.2, -0.85] });
      this.sunG = this.group(null, [0.85, 1.42, -0.75]);
      this.sunCore = this.sph(0.13, 0xffe08a, { parent: this.sunG, mat: { emissive: 0xffd24a, emissiveIntensity: 1.6 }, cast: false });
      this.rays = this.group(this.sunG);
      const rayM = new T.MeshBasicMaterial({ color: 0xffd86b, transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const m = new T.Mesh(new T.PlaneGeometry(0.035, 0.22), rayM); m.position.set(Math.cos(a) * 0.25, Math.sin(a) * 0.25, 0); m.rotation.z = a - Math.PI / 2; this.rays.add(m); }
      this.rayM = rayM;
      this.beamM = new T.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.12, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
      const beam = new T.Mesh(new T.CylinderGeometry(0.06, 0.42, 1.5, 24, 1, true), this.beamM);
      beam.position.set(0.42, 0.95, -0.38); beam.lookAt(0, 0.4, 0); beam.rotateX(Math.PI / 2); this.s.add(beam); this.beam = beam;
      { const t = this.label('SUN', '#ffb627', 0.07); t.position.set(0.85, 1.72, -0.75); this.s.add(t); }
      /* the pot: clear plastic, so we can see the seed and roots in the soil */
      this.SOIL = 0.42;
      const clear = new T.MeshPhysicalMaterial({ color: 0xdff2ff, roughness: 0.15, transmission: 0.6, transparent: true, opacity: 0.28, side: T.DoubleSide, depthWrite: false });
      this.mesh(new T.CylinderGeometry(0.3, 0.24, 0.46, 40, 1, true), clear, { pos: [0, 0.23, 0], cast: false });
      this.torus(0.3, 0.012, 0xe8f4ff, { pos: [0, 0.46, 0], rot: [Math.PI / 2, 0, 0], mat: { transparent: true, opacity: 0.6 } });
      this.soilM = this.mat(0x4a3220, { roughness: 1, transparent: true, opacity: 0.78, depthWrite: false });
      this.soil = this.mesh(new T.CylinderGeometry(0.288, 0.235, this.SOIL, 40), this.soilM, { pos: [0, this.SOIL / 2 + 0.005, 0], cast: false });
      this.soil.renderOrder = 2;
      this.topM = this.mat(0x3b2716, { roughness: 1 });
      this.soilTop = this.cyl(0.286, 0.286, 0.012, this.topM, { pos: [0, this.SOIL, 0], seg: 40, cast: false });
      for (let i = 0; i < 40; i++) { const a = Math.random() * 6.28, r = Math.random() * 0.26; this.sph(0.008 + Math.random() * 0.008, 0xf2efe6, { pos: [Math.cos(a) * r, this.SOIL + 0.008, Math.sin(a) * r], cast: false, seg: 6 }); }
      this.puddleM = new T.MeshStandardMaterial({ color: 0x5fb8ff, transparent: true, opacity: 0, roughness: 0.05, metalness: 0.2 });
      this.puddle = this.cyl(0.284, 0.284, 0.02, this.puddleM, { pos: [0, this.SOIL + 0.012, 0], seg: 40, cast: false });
      /* plant name label stuck on the front of the pot */
      this.potLabel = this.card({ w: 0.3, h: 0.1, title: 'KANG KONG', bg: '#f4efe2', ink: '#1b2633', edge: '#3fae4d', pos: [0, 0.27, 0.272] });
      this.potLabel.rotation.x = -0.13; this.potLabel.castShadow = false;
      /* drainage: a saucer under the pot, holes in the base, and water that collects when there are no holes */
      this.saucerM = new T.MeshStandardMaterial({ color: 0x5fb8ff, transparent: true, opacity: 0, roughness: 0.05 });
      this.cyl(0.36, 0.33, 0.035, 0xd8dee6, { pos: [0, -0.002, 0], seg: 40, mat: { roughness: 0.5 } });
      this.saucerW = this.cyl(0.33, 0.33, 0.012, this.saucerM, { pos: [0, 0.02, 0], seg: 40, cast: false });
      this.holes = [0, 1, 2, 3, 4].map(i => { const a = i / 5 * Math.PI * 2; return this.cyl(0.022, 0.022, 0.03, 0x10161f, { pos: [Math.cos(a) * 0.235, 0.03, Math.sin(a) * 0.235], rot: [0, 0, 0], seg: 12, cast: false }); });
      this.logM = new T.MeshStandardMaterial({ color: 0x3f8fd6, transparent: true, opacity: 0.55, roughness: 0.1, depthWrite: false });
      this.logW = this.mesh(new T.CylinderGeometry(0.292, 0.242, 1, 40, 1, true), this.logM, { pos: [0, 0.01, 0], cast: false }); this.logW.renderOrder = 4; this.logW.scale.y = 0.001;
      this.drain = [0, 1, 2, 3, 4, 5].map(i => { const d = this.sph(0.01, this.dropM || this.mat(0x8fd4ff), { scale: [0.8, 1.4, 0.8], cast: false, seg: 8 }); d.visible = false; d.userData = { t: i / 6, a: (i % 5) / 5 * Math.PI * 2 }; return d; });
      this.holeTag = this.label('HOLES', '#ff9f5a', 0.06); this.holeTag.position.set(0.32, 0.1, 0.32); this.s.add(this.holeTag);
      this.noHoleTag = this.label('NO HOLES', '#ff6a5e', 0.06); this.noHoleTag.position.set(0.32, 0.1, 0.32); this.s.add(this.noHoleTag);
      this.cur0 = true;
      /* seed, root and shoot */
      this.seed = this.sph(0.026, 0x8a5a2a, { pos: [0, 0.38, 0], scale: [1.3, 0.85, 1], mat: { roughness: 0.6 } }); this.seed.renderOrder = 3;
      this.rootM = this.mat(0xf2ead2); this.root = this.cyl(0.005, 0.009, 1, this.rootM, { pos: [0, 0.3, 0], seg: 8 }); this.root.renderOrder = 3;
      this.hairs = [0, 1, 2, 3].map(i => { const h = this.cyl(0.003, 0.004, 1, this.rootM, { seg: 6 }); h.renderOrder = 3; h.userData.a = i * 1.7; return h; });
      this.stemM = this.mat(0x8fc46a); this.stem = this.cyl(0.009, 0.013, 1, this.stemM, { seg: 10 }); this.stem.renderOrder = 3;
      this.leafM = this.mat(0x4fae4a, { roughness: 0.55, side: T.DoubleSide });
      this.seedLeafM = this.mat(0x9fd46a, { roughness: 0.55, side: T.DoubleSide });
      this.seedLeaves = [-1, 1].map(sd => { const l = this.sph(0.05, this.seedLeafM, { scale: [1.2, 0.12, 0.75] }); l.userData.sd = sd; return l; });
      this.leaves = [];
      for (let i = 0; i < 12; i++) { const l = this.sph(0.075, this.leafM); l.userData.i = i; l.scale.setScalar(0.001); this.leaves.push(l); }
      /* flowers (one kind shows, matched to the plant) */
      this.flowers = {};
      { const g = this.group(); [0, 1, 2, 3, 4, 5].forEach(i => this.cone(0.018, 0.04, 0xb48ad6, { parent: g, pos: [0, i * 0.028, 0], rot: [Math.PI, i, 0] })); this.flowers.spike = g; }
      { const g = this.group(); this.cone(0.06, 0.08, 0xf6eaf2, { parent: g, pos: [0, 0.03, 0], rot: [Math.PI, 0, 0], mat: { side: T.DoubleSide } }); this.sph(0.015, 0xd477b0, { parent: g, pos: [0, 0, 0] }); this.flowers.trumpet = g; }
      { const g = this.group(); for (let i = 0; i < 14; i++) this.sph(0.016, 0xc23a5a, { parent: g, pos: [Math.sin(i) * 0.02, i * 0.012, Math.cos(i) * 0.02] }); this.flowers.tassel = g; }
      Object.values(this.flowers).forEach(f => f.scale.setScalar(0.001));
      /* net, shade cloth, dark box */
      this.netM = new T.MeshBasicMaterial({ color: 0xe6f7ff, wireframe: true, transparent: true, opacity: 0.55 });
      this.netG = this.mesh(new T.SphereGeometry(0.36, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), this.netM, { pos: [0, this.SOIL + 0.04, 0], scale: [1, 2.1, 1], cast: false });
      this.shade = this.box(0.9, 0.012, 0.9, 0x2f5a3a, { pos: [0, 1.25, 0], mat: { transparent: true, opacity: 0 } });
      this.shadePoles = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(p => this.cyl(0.008, 0.008, 1.25, 0x9fb4c8, { pos: [p[0] * 0.42, 0.625, p[1] * 0.42], seg: 6 }));
      this.darkM = this.mat(0x10161f, { roughness: 0.95, transparent: true, opacity: 0 });
      this.darkBox = this.box(0.82, 1.4, 0.82, this.darkM, { pos: [0, 0.7, 0] });
      this.darkTag = this.label('DARK BOX', '#8a98a6', 0.07); this.darkTag.position.set(0, 1.5, 0.42); this.s.add(this.darkTag);
      this.shadeTag = this.label('SHADE CLOTH', '#5ee07a', 0.07); this.shadeTag.position.set(0, 1.36, 0.42); this.s.add(this.shadeTag);
      this.netTag = this.label('NET', '#e6f7ff', 0.07); this.netTag.position.set(-0.36, 0.95, 0.2); this.s.add(this.netTag);
      /* watering can */
      this.can = this.group(null, [-0.62, 0.78, 0.05]);
      this.cyl(0.11, 0.12, 0.2, 0x4a90e2, { parent: this.can, mat: { metalness: 0.3, roughness: 0.4 } });
      this.cyl(0.012, 0.02, 0.34, 0x4a90e2, { parent: this.can, pos: [0.2, 0.02, 0], rot: [0, 0, -1.0], mat: { metalness: 0.3, roughness: 0.4 } });
      this.cyl(0.035, 0.02, 0.03, 0x2f6fd6, { parent: this.can, pos: [0.345, 0.1, 0], rot: [0, 0, -1.0] });
      this.torus(0.07, 0.01, 0x2f6fd6, { parent: this.can, pos: [-0.04, 0.14, 0], rot: [0, 0, 0.3] });
      this.dropM = new T.MeshStandardMaterial({ color: 0x8fd4ff, emissive: 0x2f6fd6, emissiveIntensity: 0.5, roughness: 0.1, transparent: true, opacity: 0.9 });
      this.drops = [];
      for (let i = 0; i < 26; i++) { const d = this.sph(0.011, this.dropM, { scale: [0.8, 1.4, 0.8], cast: false, seg: 8 }); d.visible = false; d.userData = { t: Math.random(), x: 0, z: 0 }; this.drops.push(d); }
      /* ruler */
      this.box(0.05, 0.75, 0.016, 0xf4efe2, { pos: [0.4, this.SOIL + 0.375, 0.12], mat: { roughness: 0.9 } });
      [0, 5, 10, 15, 20, 25].forEach(cm => { this.box(0.05, 0.004, 0.018, 0x1b2633, { pos: [0.4, this.SOIL + cm * 0.03, 0.12], cast: false }); const t = this.label(cm + '', '#ffb627', 0.05); t.position.set(0.47, this.SOIL + cm * 0.03, 0.12); this.s.add(t); });
      { const t = this.label('cm', '#ffb627', 0.05); t.position.set(0.4, this.SOIL + 0.82, 0.12); this.s.add(t); }
      this.marker = this.box(0.08, 0.008, 0.03, 0x5ee07a, { pos: [0.4, this.SOIL, 0.13], mat: { emissive: 0x5ee07a, emissiveIntensity: 0.8 }, cast: false });
      /* grasshopper */
      const gh = this.group(); this.hopper = gh; const gm = this.mat(0x7fbf3a, { roughness: 0.6 });
      this.sph(0.03, gm, { parent: gh, scale: [2.0, 0.9, 0.9] }); this.sph(0.022, gm, { parent: gh, pos: [0.06, 0.01, 0] });
      [-1, 1].forEach(sd => { this.cyl(0.004, 0.006, 0.09, 0x5a8a2a, { parent: gh, pos: [-0.01, 0.02, sd * 0.025], rot: [sd * 0.3, 0, 0.9], seg: 5 }); this.sph(0.006, 0x101418, { parent: gh, pos: [0.075, 0.02, sd * 0.012] }); });
      gh.scale.setScalar(0.001);
      /* day card and stage tag */
      this.dayCard = this.card({ w: 0.34, h: 0.16, title: 'DAY 0', bg: '#0e1925', ink: '#ffb627', edge: '#ffb627', pos: [0.62, 0.12, 0.45] }); this.dayCard.rotation.x = -0.5;
      this.stageTag = this.label('SEED', '#ffb627', 0.08); this.s.add(this.stageTag);
      this.stageNow = ''; this.dayNow = -1; this.plantNow = '';
      this.cur = { log: 0, saucer: 0, root: 0, shoot: 0, h: 0, seed: 1, light: 1, dark: 0, shade: 0, puddle: 0, droop: 0, pale: 0, yellow: 0, eat: 0, flower: 0, net: 1, dry: 0 };
    }
    update(dt, now) {
      const T = this.T, c = this.cfg, e = this.ease, C = this.cur;
      const plant = PL[c.plant] ? c.plant : 'kangkong', P = PL[plant];
      const day = parseFloat(c.day) || 0, h = parseFloat(c.height) || 0, sprout = parseFloat(c.sprout) || 5;
      const out = c.outcome || 'healthy', stage = c.stage || 'seed', running = c.running === 'yes';
      const seedY = c.depth === 'deep' ? 0.07 : 0.375;
      this.seed.position.y = lerp(this.seed.position.y, seedY, e(6));
      const sy = this.seed.position.y;
      if (plant !== this.plantNow) { this.plantNow = plant; this.potLabel.userData.paint({ title: P.tag }); this.stemM.color.setHex(P.stem); Object.keys(this.flowers).forEach(k => this.flowers[k].visible = k === P.flower); }
      /* germination: the root starts two days before the shoot breaks the soil */
      const g = clamp((day - (sprout - 2)) / 2, 0, 1);
      let root = 0, shoot = 0, seedS = 1;
      if (out !== 'dry') {
        root = g * 0.09 + (h > 0 ? Math.min(0.12, h * 0.008) : 0);
        if (out === 'deep') { shoot = Math.min(g, 0.55) * (this.SOIL - sy); seedS = 1 - 0.6 * g; }
        else { shoot = g * (this.SOIL - sy); seedS = 1 - 0.5 * g; }
      }
      root = Math.min(root, sy - 0.02);
      C.root = lerp(C.root, root, e(4)); C.shoot = lerp(C.shoot, shoot, e(4)); C.h = lerp(C.h, h * 0.03, e(4)); C.seed = lerp(C.seed, seedS, e(3));
      this.seed.scale.set(1.3 * C.seed, 0.85 * C.seed, C.seed);
      this.root.scale.y = Math.max(0.001, C.root); this.root.position.y = sy - C.root / 2;
      this.hairs.forEach((hr, i) => { const L = Math.max(0.001, C.root * 0.45); hr.scale.y = L; const y = sy - C.root * (0.4 + i * 0.15); const a = hr.userData.a; hr.position.set(Math.cos(a) * L * 0.4, y - L * 0.2, Math.sin(a) * L * 0.4); hr.rotation.set(Math.sin(a) * 0.9, 0, Math.cos(a) * 0.9); });
      const topY = sy + C.shoot + C.h, stemL = Math.max(0.001, C.shoot + C.h);
      const droopT = out === 'drowned' && day >= sprout + 3 ? 0.5 : out === 'nohole' && day >= sprout + 6 ? 0.45 : out === 'pale' && day > sprout + 5 ? 0.25 : 0;
      C.droop = lerp(C.droop, droopT, e(2));
      this.stem.scale.y = stemL; this.stem.position.set(Math.sin(C.droop) * stemL * 0.5 * 0.4, sy + stemL / 2, 0); this.stem.rotation.z = -C.droop * 0.4;
      const tipX = Math.sin(C.droop) * stemL * 0.4;
      const above = C.h > 0.004 || (out !== 'deep' && out !== 'dry' && g >= 1);
      /* colours: pale in the dark, yellow when drowned */
      C.pale = lerp(C.pale, out === 'pale' && day >= sprout ? 1 : 0, e(1.5));
      C.yellow = lerp(C.yellow, (out === 'drowned' && day >= sprout + 3) || (out === 'nohole' && day >= sprout + 6) ? 1 : 0, e(1.5));
      const lc = new T.Color(P.leaf).lerp(new T.Color(0xe9e4ad), C.pale).lerp(new T.Color(0xc9a43a), C.yellow);
      this.leafM.color.copy(lc); this.seedLeafM.color.copy(new T.Color(0x9fd46a).lerp(new T.Color(0xeeeac0), C.pale).lerp(new T.Color(0xcfae4a), C.yellow));
      /* seed leaves open first, then true leaves along the stem */
      this.seedLeaves.forEach(l => { const k = above ? 1 : 0.001; const sd = l.userData.sd; const y = sy + C.shoot + Math.min(C.h, 0.05) * 0.6 + 0.006; l.scale.set(lerp(l.scale.x, 1.2 * k, e(4)), lerp(l.scale.y, 0.12 * k, e(4)), lerp(l.scale.z, 0.75 * k, e(4))); l.position.set(sd * 0.055 * Math.max(k, 0.01) + tipX * 0.2, y, 0); l.rotation.z = sd * (0.25 + C.droop); });
      C.eat = lerp(C.eat, out === 'eaten' && day >= 12 ? 1 : 0, e(1.2));
      const n = Math.min(12, Math.floor((h / 22) * 12 + (h > 1.5 ? 1 : 0)));
      this.leaves.forEach((l, i) => {
        const on = above && i < n, k = on ? (1 - (i % 2 === 0 ? 0.55 : 0.3) * C.eat) * (1 - 0.45 * C.pale) : 0.001;
        const f = (i + 1) / (n + 1), y = sy + C.shoot + C.h * (0.18 + 0.8 * f), a = i * 2.4;
        const L = 0.075 * (1 - i * 0.025);
        l.scale.set(lerp(l.scale.x, P.shape[0] * k, e(3)), lerp(l.scale.y, P.shape[1] * k, e(3)), lerp(l.scale.z, P.shape[2] * k, e(3)));
        l.position.set(tipX * f + Math.cos(a) * L * 0.9 * Math.max(k, .01), y, Math.sin(a) * L * 0.9 * Math.max(k, .01));
        l.rotation.set(0, -a, -(0.15 + C.droop * 1.6));
        l.material = this.leafM; l.scale.multiplyScalar(1);
        void L;
      });
      /* flowers when adult near the end */
      C.flower = lerp(C.flower, stage === 'adult' && day >= 18 ? 1 : 0, e(2));
      const F = this.flowers[P.flower]; F.position.set(tipX, topY, 0); F.scale.setScalar(Math.max(0.001, C.flower));
      /* stage tag rides above the plant */
      const tagTxt = stage === 'seed' ? 'SEED' : stage === 'young' ? 'YOUNG PLANT' : 'ADULT PLANT';
      if (tagTxt !== this.stageNow) { this.stageNow = tagTxt; this.s.remove(this.stageTag); this.stageTag = this.label(tagTxt, stage === 'seed' ? '#ffb627' : stage === 'young' ? '#5ee07a' : '#cd7bf5', 0.08); this.s.add(this.stageTag); }
      this.stageTag.position.set(-0.05, Math.max(this.SOIL + 0.2, topY + 0.16), 0.3);
      /* the ruler marker follows the height */
      this.marker.position.y = lerp(this.marker.position.y, this.SOIL + C.h, e(5));
      /* day card */
      const dd = Math.round(day); if (dd !== this.dayNow) { this.dayNow = dd; this.dayCard.userData.paint({ title: 'DAY ' + dd }); }
      /* light: sun, shade cloth or dark box */
      const lt = c.light === 'dark' ? 0.08 : c.light === 'shade' ? 0.45 : 1;
      C.light = lerp(C.light, lt, e(3)); C.dark = lerp(C.dark, c.light === 'dark' ? 0.9 : 0, e(4)); C.shade = lerp(C.shade, c.light === 'shade' ? 0.75 : 0, e(4));
      this.key.intensity = 0.5 + 1.9 * C.light; this.hemi.intensity = 0.9 + 0.8 * C.light;
      this.sunCore.material.emissiveIntensity = (1.2 + Math.sin(now * 2) * 0.25) * (0.3 + 0.7 * C.light);
      this.rays.rotation.z = now * 0.35; this.rays.scale.setScalar(1 + Math.sin(now * 2.2) * 0.08);
      this.rayM.opacity = 0.6 * C.light; this.beamM.opacity = (0.1 + Math.sin(now * 1.7) * 0.03) * C.light;
      this.darkM.opacity = C.dark; this.darkBox.visible = C.dark > 0.02; this.darkTag.visible = C.dark > 0.3;
      this.shade.material.opacity = C.shade; this.shade.visible = C.shade > 0.02; this.shadePoles.forEach(p => p.visible = C.shade > 0.02); this.shadeTag.visible = C.shade > 0.3;
      /* net */
      C.net = lerp(C.net, c.net === 'off' ? 0 : 1, e(4)); this.netM.opacity = 0.55 * C.net; this.netG.visible = C.net > 0.02; this.netTag.visible = C.net > 0.5;
      /* water: the can tips and drops fall while the days run */
      const pour = running && c.water !== 'none', heavy = c.water === 'hour';
      this.can.rotation.z = lerp(this.can.rotation.z, pour ? -0.55 : 0, e(4));
      const tip = new T.Vector3(0.345, 0.1, 0); this.can.localToWorld(tip);
      const want = pour ? (heavy ? 26 : 7) : 0;
      this.drops.forEach((d, i) => {
        const u = d.userData;
        if (i >= want) { d.visible = false; return; }
        u.t += dt * (heavy ? 2.6 : 1.4);
        if (u.t >= 1 || !d.visible) { u.t = d.visible ? 0 : Math.random(); u.x = (Math.random() - 0.5) * (heavy ? 0.3 : 0.08); u.z = (Math.random() - 0.5) * (heavy ? 0.3 : 0.08); d.visible = true; }
        const k = u.t; d.position.set(lerp(tip.x, 0.02 + u.x, k), lerp(tip.y, this.SOIL + 0.02, k * k), lerp(tip.z, u.z, k));
      });
      /* drainage: with holes the extra water drips into the saucer; without holes it rises inside the pot */
      const closed = c.pot === 'closed', wet = c.water !== 'none';
      this.holes.forEach(o => o.visible = !closed); this.holeTag.visible = !closed; this.noHoleTag.visible = closed;
      const logT = closed && wet ? clamp(day / (heavy ? 7 : 16), 0, 1) * (heavy ? 0.95 : 0.85) : 0;
      C.log = lerp(C.log, logT, e(1.5));
      this.logW.visible = C.log > 0.01; this.logW.scale.y = Math.max(0.001, C.log * this.SOIL); this.logW.position.y = 0.01 + C.log * this.SOIL / 2;
      C.saucer = lerp(C.saucer, !closed && wet && day > 0 ? (heavy ? 0.75 : 0.4) : 0, e(1));
      this.saucerM.opacity = C.saucer; this.saucerW.visible = C.saucer > 0.02;
      this.drain.forEach(d => { const on = pour && !closed; d.visible = on; if (!on) return; const u = d.userData; u.t = (u.t + dt * (heavy ? 1.6 : 0.8)) % 1; d.position.set(Math.cos(u.a) * 0.235, 0.03 - u.t * 0.03, Math.sin(u.a) * 0.235); d.scale.set(0.8, 1.4 * (1 - u.t), 0.8); });
      /* soil: pale when dry, a puddle when there is too much water */
      C.dry = lerp(C.dry, c.water === 'none' && day > 1 ? 1 : 0, e(1.5));
      C.puddle = lerp(C.puddle, (heavy && day > 2) || (closed && wet && day > 12) ? 0.7 : 0, e(1.2));
      this.topM.color.copy(new T.Color(0x3b2716).lerp(new T.Color(0x9a7650), C.dry).lerp(new T.Color(0x22160c), C.puddle * 0.6));
      this.puddleM.opacity = C.puddle; this.puddle.visible = C.puddle > 0.02;
      /* grasshopper hops between the leaves */
      const bug = out === 'eaten' && day >= 12;
      const hs = lerp(this.hopper.scale.x, bug ? 1 : 0.001, e(4)); this.hopper.scale.setScalar(hs);
      const hop = Math.abs(Math.sin(now * 3.2));
      this.hopper.position.set(0.1 + Math.sin(now * 0.8) * 0.06, sy + C.shoot + C.h * 0.6 + 0.05 + hop * 0.06, 0.08 + Math.cos(now * 0.8) * 0.05);
      this.hopper.rotation.y = now * 0.8 + Math.PI / 2;
    }
  }
  customElements.define('growseed-scene', GrowSeedScene);
})();
