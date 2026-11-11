/* ── المشهد 6 · الانفجار: النقطة تتفجر جزيئات ← تتجمع حرف «ص» (NOISE → CLEAR) ← الكاميرا تعبر ── */
MOTION.scene({
  id: 's6_burst',
  setup(ctx) {
    const { THREE } = ctx, D = D3;
    this.st = ctx.stage3D({ fov: 35, camera: [0, 0, 10], lookAt: [0, 0, 0], background: null, tone: 'none',
      bloom: { strength: 0.85, radius: 0.55, threshold: 0.08 } });
    // عيّنات حرف «ص» من كانفس
    const c = document.createElement('canvas'); c.width = 600; c.height = 600;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '800 520px "Alexandria"'; g.direction = 'rtl'; g.fillText('ص', 300, 270);
    const data = g.getImageData(0, 0, 600, 600).data, pts = [];
    for (let y = 0; y < 600; y += 3) for (let x = 0; x < 600; x += 3) if (data[(y * 600 + x) * 4 + 3] > 128) pts.push([x, y]);
    const r = ctx.rng('glyph');
    const N = this.N = 7000;
    this.tgt = new Float32Array(N * 3); this.dir = new Float32Array(N * 3); this.rad = new Float32Array(N); this.del = new Float32Array(N);
    const col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const p = pts[Math.floor(r() * pts.length)];
      this.tgt[i * 3] = (p[0] - 300) / 300 * 1.25 + r.gauss() * 0.01;
      this.tgt[i * 3 + 1] = -(p[1] - 300) / 300 * 1.25 + 0.3 + r.gauss() * 0.01;
      this.tgt[i * 3 + 2] = r.gauss() * 0.06;
      // اتجاه عشوائي على كرة
      const u = r() * 2 - 1, th = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      this.dir[i * 3] = s * Math.cos(th); this.dir[i * 3 + 1] = u; this.dir[i * 3 + 2] = s * Math.sin(th) * 0.6;
      this.rad[i] = 1.2 + 4.8 * Math.pow(r(), 0.7);
      this.del[i] = r();
      const white = r() < 0.22;
      col[i * 3] = white ? 1.6 : 0.30; col[i * 3 + 1] = white ? 1.6 : 1.25; col[i * 3 + 2] = white ? 1.7 : 1.6;
    }
    this.pos = new Float32Array(N * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    // نقطة دايرية ناعمة
    const sc = document.createElement('canvas'); sc.width = sc.height = 64; const sg = sc.getContext('2d');
    const rg = sg.createRadialGradient(32, 32, 0, 32, 32, 32); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.4, 'rgba(255,255,255,.55)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    sg.fillStyle = rg; sg.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(sc);
    this.mat = new THREE.PointsMaterial({ size: 0.05, map: tex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    this.points = new THREE.Points(geo, this.mat);
    this.group = new THREE.Group(); this.group.add(this.points); this.st.add(this.group);
  },
  paint(X, t, lt, ctx) {
    const { E } = ctx, D = D3, N = this.N, P = this.pos;
    D.bg(X, ctx);
    const ex = E.expoOut(ctx.prog(lt, 0.15, 2.4));
    for (let i = 0; i < N; i++) {
      const i3 = i * 3, d = this.del[i];
      const k = E.cubicInOut(ctx.prog(lt, 2.3 + d * 1.5, 4.9 + d * 1.5));
      const rr = this.rad[i] * ex;
      const sw = 0.35 * ex * (1 - k);
      const nx = ctx.noise2(i * 0.13, lt * 0.6, 1) * sw, ny = ctx.noise2(i * 0.13, lt * 0.6, 2) * sw;
      const bx = this.dir[i3] * rr + nx, by = this.dir[i3 + 1] * rr + ny, bz = this.dir[i3 + 2] * rr;
      const br = 0.012 * Math.sin(lt * 2.2 + i * 0.7) * k;
      P[i3] = ctx.lerp(bx, this.tgt[i3], k) + br;
      P[i3 + 1] = ctx.lerp(by, this.tgt[i3 + 1], k) + br;
      P[i3 + 2] = ctx.lerp(bz, this.tgt[i3 + 2], k);
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    // الكاميرا: لفة خفيفة وقت الحرف، وبعدين تعبر من خلاله
    const hold = ctx.prog(lt, 6.2, 9.4);
    this.group.rotation.y = 0.32 * Math.sin(hold * Math.PI) * (1 - ctx.at(lt, 9.2, 10)) - 0.12 * (1 - ctx.at(lt, 2, 6));
    const thru = E.expoIn(ctx.prog(lt, 9.4, 11.9));
    const z = ctx.lerp(10, -0.6, thru);
    this.st.camera.position.set(0, 0.35 * thru, z); this.st.camera.lookAt(0, 0.35 * thru, z - 10);
    this.mat.size = 0.05 * (1 + 0.8 * (1 - ex) * (lt < 1 ? 1 : 0)) * (1 + 0.6 * thru);
    this.st.draw(X);
    // HUD تحت: NOISE ── CLEAR + t =
    const conv = E.cubicInOut(ctx.prog(lt, 2.3, 6.4));
    const ha = ctx.at(lt, 1.6, 2.2) * (1 - ctx.at(lt, 9.4, 9.9));
    if (ha > 0.01) {
      X.save(); X.globalAlpha = ha;
      X.fillStyle = D.LINE; X.fillRect(150, 1470, 780, 3);
      X.fillStyle = D.SKY; X.fillRect(150, 1470, 780 * conv, 3);
      ctx.text(X, 'NOISE', 150, 1440, { family: 'num', weight: 600, size: 24, color: D.MUT, dir: 'ltr', align: 'left' });
      ctx.text(X, 'CLEAR', 930, 1440, { family: 'num', weight: 600, size: 24, color: conv > 0.98 ? D.SKY : D.MUT, dir: 'ltr', align: 'right' });
      ctx.text(X, 't = ' + Math.round(1000 * conv), 540, 1440, { family: 'num', weight: 600, size: 30, color: D.SKY, dir: 'ltr' });
      X.restore();
    }
    // النص
    D.line(X, ctx, 'وصارت…', 540, 360, 1.0, { t: lt, size: 84, weight: 800, out: 5.6 });
    D.line(X, ctx, 'فيلم.', 540, 360, 6.0, { t: lt, size: 130, weight: 800, accent: [0], out: 9.3 });
    // ومضة العبور
    const fl = ctx.at(lt, 11.2, 12, 'cubicIn');
    if (fl > 0.001) { X.save(); X.fillStyle = `rgba(214,244,253,${fl.toFixed(3)})`; X.fillRect(0, 0, 1080, 1920); X.restore(); }
  },
  draw(t, lt, ctx) {
    const self = this;
    ctx.FX.rippleWater(ctx, t, { s: ctx.scene.start, dur: 1.1, at: [540, 960], amp: 0.03,
      A: Y => D3.typeFrame(Y, ctx, 5.4 + lt),
      B: Y => self.paint(Y, t, lt, ctx) });
  },
});
