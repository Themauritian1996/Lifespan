/* Lifespan — avatar holographique 3D (nuage de points en rotation).
   Silhouette : IMC, sexe, tour de taille. Posture : âge de risque. Organes : halos colorés selon les risques.
   Le cœur bat à la fréquence cardiaque de repos, la cage thoracique respire, les cheveux grisonnent avec l'âge.
   Glisser (souris ou doigt) pour faire tourner l'avatar. */
(function (root) {
  const LS = (root.LS = root.LS || {});
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  function token(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function rgb(c) {
    const ctx = rgb._c || (rgb._c = document.createElement('canvas').getContext('2d'));
    ctx.fillStyle = '#000'; ctx.fillStyle = c || '#fff';
    const s = ctx.fillStyle;
    if (s[0] === '#') return [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
    const m = s.match(/[\d.]+/g) || [255, 255, 255];
    return [+m[0], +m[1], +m[2]];
  }
  const css = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`;

  /* ---------- Modèle 3D (unités : hauteur de la figure ; y vers le bas, z vers l'observateur) ---------- */
  const PART = { head: 0, neck: 1, torso: 2, arm: 3, leg: 4, foot: 5 };
  function buildBody(p, sp) {
    const fat = clamp((p.bmi - 22) / 16, -0.35, 1.15), F = p.sex === 'F', we = p.waistExcess || 0;
    const pts = [];
    const push = (x, y, z, nx, ny, nz, part) => pts.push([x, y, z, nx, ny, nz, part]);
    // Tête (sphère de Fibonacci étirée)
    const hr = [0.057, 0.07, 0.063], hc = [0, 0.105, 0.004];
    const nH = Math.round(((4 * Math.PI * 0.063 * 0.063) / (sp * sp)) * 0.95);
    for (let i = 0; i < nH; i++) {
      const yy = 1 - (2 * (i + 0.5)) / nH, r = Math.sqrt(1 - yy * yy), th = i * 2.39996;
      const nx = Math.cos(th) * r, nz = Math.sin(th) * r;
      push(hc[0] + nx * hr[0], hc[1] - yy * hr[1], hc[2] + nz * hr[2], nx, -yy, nz, PART.head);
    }
    // Anneaux le long d'un segment (membres, cou)
    function tube(a, b, ra, rb, part, capEnd) {
      const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz);
      const n = Math.max(2, Math.round(L / sp));
      const tx = dx / L, ty = dy / L, tz = dz / L;
      let ux = 0, uy = 0, uz = 1; if (Math.abs(tz) > 0.9) { ux = 1; uz = 0; }
      let vx = ty * uz - tz * uy, vy = tz * ux - tx * uz, vz = tx * uy - ty * ux; const vl = Math.hypot(vx, vy, vz); vx /= vl; vy /= vl; vz /= vl;
      ux = vy * tz - vz * ty; uy = vz * tx - vx * tz; uz = vx * ty - vy * tx;
      for (let i = 0; i <= n; i++) {
        const t = i / n, r = ra + (rb - ra) * t, cx = a[0] + dx * t, cy = a[1] + dy * t, cz = a[2] + dz * t;
        const m = Math.max(6, Math.round((2 * Math.PI * r) / sp));
        for (let j = 0; j < m; j++) {
          const th = (j / m) * Math.PI * 2 + (i % 2) * (Math.PI / m);
          const nx = Math.cos(th) * ux + Math.sin(th) * vx, ny = Math.cos(th) * uy + Math.sin(th) * vy, nz = Math.cos(th) * uz + Math.sin(th) * vz;
          push(cx + nx * r, cy + ny * r, cz + nz * r, nx, ny, nz, part);
        }
      }
      if (capEnd) for (let j = 0; j < 6; j++) { const th = (j / 6) * Math.PI * 2; push(b[0] + Math.cos(th) * rb * 0.5, b[1] + rb * 0.6, b[2] + Math.sin(th) * rb * 0.5, 0, 1, 0, part); }
    }
    tube([0, 0.165, 0], [0, 0.215, 0], 0.025 + 0.006 * fat, 0.029 + 0.006 * fat, PART.neck);
    // Torse : tranches elliptiques
    const sw = (F ? 0.112 : 0.13) + 0.012 * fat, chest = (F ? 0.098 : 0.106) + 0.03 * fat;
    const waist = (F ? 0.074 : 0.086) + 0.075 * fat + 0.02 * we, hip = (F ? 0.108 : 0.095) + 0.045 * fat;
    const Wk = [[0.205, sw * 0.5], [0.235, sw], [0.3, chest], [0.41, waist], [0.54, hip]];
    const Dk = [[0.205, 0.035], [0.24, 0.055], [0.3, 0.07 + 0.025 * fat + (F ? 0.012 : 0)], [0.41, 0.058 + 0.06 * fat + 0.02 * we], [0.54, 0.066 + 0.03 * fat]];
    const knot = (K, y) => { for (let i = 1; i < K.length; i++) if (y <= K[i][0]) return K[i - 1][1] + (K[i][1] - K[i - 1][1]) * smooth(K[i - 1][0], K[i][0], y); return K[K.length - 1][1]; };
    let row = 0;
    for (let y = 0.205; y <= 0.545; y += sp * 0.92, row++) {
      const rx = knot(Wk, y), rz = knot(Dk, y), belly = y > 0.35 && y < 0.5 ? 0.012 * Math.max(0, fat) * Math.sin(((y - 0.35) / 0.15) * Math.PI) : 0;
      const per = 2 * Math.PI * Math.sqrt((rx * rx + rz * rz) / 2), m = Math.max(10, Math.round(per / sp));
      for (let j = 0; j < m; j++) {
        const th = (j / m) * Math.PI * 2 + (row % 2) * (Math.PI / m);
        const c = Math.cos(th), s = Math.sin(th), zb = s > 0 ? belly * s : 0;
        const nx = c * rz, nz = s * rx, nl = Math.hypot(nx, nz) || 1;
        push(c * rx, y, s * rz + zb, nx / nl, 0, nz / nl, PART.torso);
      }
    }
    // Bras et jambes
    const arm = 0.023 + 0.012 * fat, leg = 0.043 + 0.02 * fat;
    const sx = sw - 0.024, ex = sw + 0.014 + 0.02 * fat, wx = sw + 0.022 + 0.026 * fat;
    const hx = hip * 0.5, kx = hip * 0.43 + 0.004, ax = hip * 0.4;
    [-1, 1].forEach((s) => {
      tube([s * sx, 0.245, 0], [s * ex, 0.385, 0.01], arm, arm * 0.9, PART.arm);
      tube([s * ex, 0.385, 0.01], [s * wx, 0.515, 0.02], arm * 0.9, arm * 0.72, PART.arm);
      tube([s * wx, 0.515, 0.02], [s * (wx + 0.004), 0.56, 0.022], arm * 0.95, arm * 0.6, PART.arm, true);
      tube([s * hx, 0.5, 0], [s * kx, 0.735, 0.006], leg, leg * 0.72, PART.leg);
      tube([s * kx, 0.735, 0.006], [s * ax, 0.945, -0.004], leg * 0.72, 0.022, PART.leg);
      tube([s * ax, 0.955, -0.004], [s * (ax + 0.006), 0.972, 0.05], 0.017, 0.012, PART.foot);
    });
    return pts;
  }

  const ORGANS = [
    { id: 'brain', key: 'dem', label: 'Cerveau', p: [0, 0.098, 0.005], r: 0.05, side: -1 },
    { id: 'lung', key: 'lung', label: 'Poumons', p: [-0.05, 0.28, 0], r: 0.055, side: -1 },
    { id: 'heart', key: 'cvd', label: 'Cœur', p: [0.026, 0.292, 0.02], r: 0.04, side: 1 },
    { id: 'metab', key: 't2d', label: 'Diabète', p: [-0.018, 0.395, 0.02], r: 0.045, side: 1 }
  ];
  function organTone(rr) { return rr == null ? 'text' : rr < 0.9 ? 'good' : rr < 1.15 ? 'text' : rr < 1.5 ? 'warn' : 'bad'; }

  class Avatar {
    constructor(canvas, params) {
      this.c = canvas; this.ctx = canvas.getContext('2d');
      this.p = Object.assign({ sex: 'M', bmi: 23, waistExcess: 0, vitality: 0.8, age: 40, riskAge: 40, rhr: 66, score: 80, organs: {}, ring: true, callouts: false }, params || {});
      this.reduced = (root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches) || document.documentElement.getAttribute('data-motion') === 'reduce';
      this.drag = 0; this.last = 0;
      this.ro = new ResizeObserver(() => this.build()); this.ro.observe(canvas);
      this.bindDrag();
      this.readColors(); this.build(); this.start();
    }
    readColors() {
      this.col = { text: rgb(token('--text')), muted: rgb(token('--muted')), faint: rgb(token('--faint')), accent: rgb(token('--accent')), good: rgb(token('--good')), warn: rgb(token('--warn')), bad: rgb(token('--bad')) };
      const [r, g, b] = this.col.text; this.dark = 0.299 * r + 0.587 * g + 0.114 * b > 128;
      this.fontMono = token('--f-mono') || 'monospace';
    }
    set(params) { Object.assign(this.p, params); this.build(); }
    bindDrag() {
      let x0 = null, d0 = 0;
      this.c.style.touchAction = 'pan-y';
      this.c.style.cursor = 'grab';
      this.c.addEventListener('pointerdown', (e) => { x0 = e.clientX; d0 = this.drag; try { this.c.setPointerCapture(e.pointerId); } catch (_) {} });
      this.c.addEventListener('pointermove', (e) => { if (x0 == null) return; this.drag = d0 + (e.clientX - x0) / 90; if (this.reduced) this.draw(0); });
      const up = () => { x0 = null; };
      this.c.addEventListener('pointerup', up); this.c.addEventListener('pointercancel', up);
    }
    build() {
      const c = this.c, dpr = Math.min(2, root.devicePixelRatio || 1);
      const W = c.clientWidth || 300, H = c.clientHeight || 380;
      if (!W || !H) return;
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      Object.assign(this, { W, H, dpr });
      this.Hf = H * (this.p.callouts ? 0.7 : 0.74); this.top = H * 0.11; this.cx = W / 2;
      const sp = clamp(4.6 / this.Hf, 0.0105, 0.016);
      this.sp = sp;
      const raw = buildBody(this.p, sp);
      const n = raw.length, A = new Float32Array(n * 7);
      raw.forEach((q, i) => A.set(q, i * 7));
      this.pts = A; this.n = n; this._proj = new Float32Array(n * 4);
      const grey = clamp((Math.max(this.p.age, this.p.riskAge) - 45) / 35, 0, 0.85);
      this.flags = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        const y = A[i * 7 + 1], ny = A[i * 7 + 4], part = A[i * 7 + 6];
        let f = 0;
        if (part === PART.head && y < 0.095 && ny < -0.15 && hash(i) < grey) f |= 1; // cheveux gris
        if (hash(i * 3.1) > 0.25 + 0.75 * clamp(this.p.vitality, 0.15, 1)) f |= 2; // points éteints
        this.flags[i] = f;
      }
      if (this.reduced) this.draw(0);
    }
    start() {
      if (this.reduced) { this.draw(0); return; }
      const loop = (t) => {
        if (!this.c.isConnected) { this.ro.disconnect(); return; }
        if (t - this.last > 33) { this.draw(t); this.last = t; }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
    project(x, y, z, cosA, sinA) {
      const xr = x * cosA + z * sinA, zr = -x * sinA + z * cosA, s = 3.2 / (3.2 - zr);
      return [this.cx + xr * this.Hf * s, this.top + this.Hf * 0.5 + (y - 0.5) * this.Hf * s, zr, s];
    }
    draw(t) {
      const { ctx, dpr, W, H, col, p, n, pts, flags } = this;
      if (!W || !pts) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const yaw = (this.reduced ? 0.35 : Math.sin(t / 7000) * 0.55) + this.drag;
      const cosA = Math.cos(yaw), sinA = Math.sin(yaw);
      const breath = this.reduced ? 1 : 1 + 0.018 * Math.sin((t / 4200) * Math.PI * 2);
      const beat = p.rhr && !this.reduced ? Math.pow(Math.max(0, Math.sin((t / 60000) * p.rhr * Math.PI)), 10) : 0;
      const stoop = clamp((p.riskAge - 60) / 40, 0, 0.45);
      const vit = clamp(p.vitality, 0.15, 1);
      const r0 = Math.max(0.8, this.sp * this.Hf * 0.3);
      const cyBase = this.top + this.Hf * 1.0;

      // Halo de vitalité et faisceau du socle
      const g = ctx.createRadialGradient(this.cx, this.top + this.Hf * 0.45, 0, this.cx, this.top + this.Hf * 0.45, this.Hf * 0.55);
      g.addColorStop(0, css(col.text, 0.04 + 0.05 * vit)); g.addColorStop(1, css(col.text, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const beam = ctx.createLinearGradient(0, cyBase, 0, this.top);
      beam.addColorStop(0, css(col.accent, 0.09)); beam.addColorStop(1, css(col.accent, 0));
      ctx.fillStyle = beam;
      ctx.beginPath(); ctx.moveTo(this.cx - this.Hf * 0.2, cyBase); ctx.lineTo(this.cx + this.Hf * 0.2, cyBase); ctx.lineTo(this.cx + this.Hf * 0.27, this.top); ctx.lineTo(this.cx - this.Hf * 0.27, this.top); ctx.closePath(); ctx.fill();

      // Socle : anneaux + arc du score
      if (p.ring) {
        const rx = this.Hf * 0.22, ry = this.Hf * 0.04;
        ctx.lineWidth = 1;
        [1, 0.72].forEach((k, i) => { ctx.strokeStyle = css(col.text, i ? 0.12 : 0.22); ctx.beginPath(); ctx.ellipse(this.cx, cyBase, rx * k, ry * k, 0, 0, Math.PI * 2); ctx.stroke(); });
        const sc = clamp(p.score || 0, 0, 100) / 100, rot = this.reduced ? 0 : (t / 9000) % (Math.PI * 2);
        ctx.strokeStyle = css(col.accent, 0.95); ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.ellipse(this.cx, cyBase, rx, ry, 0, rot - Math.PI / 2, rot - Math.PI / 2 + sc * Math.PI * 2); ctx.stroke();
        ctx.fillStyle = css(col.text, 0.3);
        for (let k = 0; k < 60; k++) { const a = (k / 60) * Math.PI * 2; ctx.fillRect(this.cx + Math.cos(a) * rx * 1.14 - 0.5, cyBase + Math.sin(a) * ry * 1.14 - 0.5, 1, 1); }
      }

      // Projection
      const scanY = this.reduced ? -1e9 : this.top + ((t / 4600) % 1) * this.Hf * 1.05;
      const proj = this._proj;
      for (let i = 0; i < n; i++) {
        const o = i * 7, part = pts[o + 6];
        let x = pts[o], y = pts[o + 1], z = pts[o + 2];
        if (part === PART.torso && y > 0.22 && y < 0.46) { x *= breath; z *= breath; }
        if (y < 0.3) { const k = (0.3 - y) / 0.2; z += stoop * 0.05 * k; y += stoop * 0.012 * k; }
        const nzr = -pts[o + 3] * sinA + pts[o + 5] * cosA;
        const xr = x * cosA + z * sinA, zr = -x * sinA + z * cosA, s = 3.2 / (3.2 - zr);
        proj[i * 4] = this.cx + xr * this.Hf * s; proj[i * 4 + 1] = this.top + this.Hf * 0.5 + (y - 0.5) * this.Hf * s; proj[i * 4 + 2] = nzr; proj[i * 4 + 3] = s;
      }
      const ac = col.accent;
      const drawPass = (front) => {
        for (let i = 0; i < n; i++) {
          const nzr = proj[i * 4 + 2];
          if ((nzr >= 0) !== front) continue;
          const X = proj[i * 4], Y = proj[i * 4 + 1], s = proj[i * 4 + 3];
          let c = flags[i] & 1 ? col.muted : col.text;
          const rim = Math.pow(1 - Math.abs(nzr), 3);
          let a = front ? 0.26 + 0.48 * nzr + 0.6 * rim : 0.06 + 0.22 * rim;
          if (flags[i] & 2) a *= 0.3;
          const sd = Math.abs(Y - scanY);
          if (sd < 12) { const k = 1 - sd / 12; a = Math.min(1, a + 0.5 * k); c = [c[0] + (ac[0] - c[0]) * k * 0.75, c[1] + (ac[1] - c[1]) * k * 0.75, c[2] + (ac[2] - c[2]) * k * 0.75]; }
          ctx.fillStyle = css(c, clamp(a, 0, 1));
          const r = r0 * s * (front ? 0.72 + 0.4 * nzr : 0.6);
          ctx.beginPath(); ctx.arc(X, Y, r, 0, 6.2832); ctx.fill();
        }
      };
      drawPass(false);

      // Organes : halos
      ctx.globalCompositeOperation = this.dark ? 'lighter' : 'source-over';
      const org = ORGANS.map((o) => {
        const tone = organTone(p.organs[o.key]);
        const q = this.project(o.p[0], o.p[1], o.p[2], cosA, sinA);
        const cc = col[tone];
        const R = o.r * this.Hf * q[3] * (o.id === 'heart' ? 1 + 0.45 * beat : 1);
        const strong = tone === 'text' ? 0.14 : 0.5;
        const halo = (x, y, rr) => { const gr = ctx.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, css(cc, strong)); gr.addColorStop(0.55, css(cc, strong * 0.35)); gr.addColorStop(1, css(cc, 0)); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill(); };
        halo(q[0], q[1], R);
        if (o.id === 'lung') { const q2 = this.project(0.052, 0.272, 0, cosA, sinA); halo(q2[0], q2[1], R * 0.85); }
        return { o, q, tone };
      });
      ctx.globalCompositeOperation = 'source-over';
      drawPass(true);

      // Ligne de scan
      if (scanY > this.top && scanY < cyBase) {
        const lg = ctx.createLinearGradient(this.cx - this.Hf * 0.32, 0, this.cx + this.Hf * 0.32, 0);
        lg.addColorStop(0, css(ac, 0)); lg.addColorStop(0.5, css(ac, 0.5)); lg.addColorStop(1, css(ac, 0));
        ctx.fillStyle = lg; ctx.fillRect(this.cx - this.Hf * 0.32, scanY, this.Hf * 0.64, 1);
      }

      // Annotations reliées aux organes
      if (p.callouts && W > 280) {
        ctx.font = `500 10px ${this.fontMono}`; ctx.textBaseline = 'middle'; ctx.lineWidth = 1;
        org.forEach(({ o, q, tone }) => {
          const rr = p.organs[o.key];
          const left = o.side < 0, lx = left ? 16 : W - 16, ex = left ? this.cx - this.Hf * 0.21 : this.cx + this.Hf * 0.21;
          const ly = q[1] + (o.id === 'metab' ? 10 : 0);
          const cc = tone === 'text' ? col.muted : col[tone];
          ctx.strokeStyle = css(cc, 0.55);
          ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(ex, ly); ctx.lineTo(left ? lx + 64 : lx - 64, ly); ctx.stroke();
          ctx.fillStyle = css(cc, 1); ctx.beginPath(); ctx.arc(q[0], q[1], 2.4, 0, Math.PI * 2); ctx.fill();
          ctx.textAlign = left ? 'left' : 'right';
          ctx.fillStyle = css(col.muted, 1); ctx.fillText((LS.i18n ? LS.i18n.t(o.label) : o.label).toUpperCase(), lx, ly - 8);
          ctx.fillStyle = css(tone === 'text' ? col.text : col[tone], 1);
          ctx.fillText(rr == null ? '—' : '× ' + (LS.i18n && LS.i18n.lang === 'en' ? rr.toFixed(2) : rr.toFixed(2).replace('.', ',')), lx, ly + 6);
        });
      }
    }
  }
  Avatar.organTone = organTone;
  LS.Avatar = Avatar;
})(window);
