/* ═══ moves-plus-a.js — بنك الحركات 101–150 (يمدّ نفس FX حق motion/moves.js) ═══
   نفس العقد بالضبط: FX.<id>(ctx, t, o) ترسم على ctx.X بإحداثيات التصميم 1080×1920. t = الوقت العام، o.s = بداية الحركة.
   الألوان من ctx.P (bg ink acc clay hi mut onAcc) · التسهيل ctx.E / ctx.at · النص ctx.text (عربي RTL، الكلمة كاملة — ما نقسم الحروف).
   يشتغل بمحرّك الموشن (ctx) وبريل الكلام (MV من scripts/moves-compose.js) — يستخدم بس اللي موجود بالاثنين:
     X P E at text text.layout text.drawLayout text.typeSub font num drawPath hash01 noise1 wordTime lineSpan.
   ما يحتاج قصّ الشخص ولا الوجه ولا الكف. الانتقالات تاخذ o.A / o.B (دوال ترسم الإطار كامل)، والكاميرا تاخذ o.draw.
   الكتالوج: motion/moves/catalog-plus-a.json · المعاينات: motion/moves/previews/101.mp4…150.mp4 · الدليل: references/moves.md
   التحميل: بعد moves.js (engine.html · compose.REFERENCE.html · 04_render_frames.js · 08_safe_check.js). لو انحمّل قبله يشتغل بعد — نفس الكائن. */
(function () {
  const G = typeof window !== 'undefined' ? window : globalThis;
  const FX = (G.FX = G.FX || {});
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const pr = (t, a, b) => cl((t - a) / (b - a));
  const lerp = (a, b, k) => a + (b - a) * k;
  const pick = (o, k, d) => (o[k] === undefined ? d : o[k]);
  const ON = 0.01;
  const TAU = Math.PI * 2;
  const hexRGB = h => { const c = String(h || '#808080').replace('#', ''); if (!/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(c)) return [128, 128, 128]; const f = c.length === 3 ? c.split('').map(x => x + x).join('') : c; return [0, 2, 4].map(j => parseInt(f.slice(j, j + 2), 16)); };
  const rgba = (h, a) => `rgba(${hexRGB(h).join(',')},${a})`;
  const lum = h => hexRGB(h).reduce((a, v, n) => a + [0.2126, 0.7152, 0.0722][n] * v, 0);
  const darker = (a, b) => (lum(a) <= lum(b) ? a : b);
  const lighter = (a, b) => (lum(a) >= lum(b) ? a : b);
  const mix = (a, b, k) => { const A = hexRGB(a), B = hexRGB(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], k)).toString(16).padStart(2, '0')).join(''); };
  const onAcc = P => P.onAcc || '#FFFFFF';
  const card = P => mix(lighter(P.bg, '#FFFFFF'), '#FFFFFF', 0.55);          // كرت فاتح من الثيم
  const deep = P => darker(P.ink, P.bg);                                       // الأغمق (للحدّ واللوحات الغامقة)
  const wt = (ctx, o, i, step) => (o.line != null ? ctx.wordTime(o.line, i).s : o.s + i * step);
  const outK = (ctx, t, o, d) => (o.out != null ? ctx.at(t, o.out, o.out + (d || 0.45), 'cubicIn') : 0);
  const boxesOf = (ctx, str, x, y, o) => {
    const L = ctx.text.layout(ctx.X, str, { family: o.family || 'display', weight: o.weight || 400, size: o.size, maxWidth: o.maxWidth || 900, lineHeight: o.lineHeight || 1.25 });
    return { L, B: ctx.text.drawLayout(ctx.X, L, x, y, { align: o.align, perWord: () => ({ skip: true }) }) };
  };
  const tw = (ctx, X, s, fam, w, size) => { X.save(); X.font = ctx.font(fam, w, size); const v = X.measureText(String(s)).width; X.restore(); return v; };
  const wordAt = (ctx, X, b, size, col, fam, w) => ctx.text(X, b.text, b.x + b.w, b.base, { family: fam || 'display', weight: w || 400, size, align: 'right', color: col });
  const shd = (X, b, y, a) => { X.shadowColor = 'rgba(0,0,0,' + (a == null ? 0.22 : a) + ')'; X.shadowBlur = b; X.shadowOffsetY = y; };
  const noShd = X => { X.shadowColor = 'transparent'; X.shadowBlur = 0; X.shadowOffsetY = 0; X.shadowOffsetX = 0; };
  const zoomAt = (X, f, z) => { X.translate(f[0], f[1]); X.scale(z, z); X.translate(-f[0], -f[1]); };
  const offC = (X, slot) => {
    const me = FX['_pa_' + slot] || (FX['_pa_' + slot] = { c: document.createElement('canvas') }), c = me.c;
    if (c.width !== X.canvas.width || c.height !== X.canvas.height) { c.width = X.canvas.width; c.height = X.canvas.height; }
    const Y = c.getContext('2d'); Y.setTransform(1, 0, 0, 1, 0, 0); Y.globalAlpha = 1; Y.globalCompositeOperation = 'source-over'; Y.filter = 'none';
    Y.clearRect(0, 0, c.width, c.height); Y.setTransform(X.getTransform()); return { c, Y };
  };
  const putC = (X, c, a, dx, dy) => { X.save(); X.setTransform(1, 0, 0, 1, 0, 0); if (a != null) X.globalAlpha *= a; X.drawImage(c, dx || 0, dy || 0); X.restore(); };
  // جزء من كانفس جانبي (إحداثيات التصميم) → مستطيل وجهة (إحداثيات التصميم)
  const blit = (X, c, sx, sy, sw, sh, dx, dy, dw, dh) => {
    const m = X.getTransform(); if (sw <= 0 || sh <= 0) return;
    X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
    X.drawImage(c, m.a * sx + m.e, m.d * sy + m.f, m.a * sw, m.d * sh, m.a * dx + m.e, m.d * dy + m.f, m.a * dw, m.d * dh); X.restore();
  };
  const fontOK = f => { try { return document.fonts.check(f, 'ابت'); } catch (e) { return false; } };
  const handFam = ctx => (fontOK('700 40px "Aref Ruqaa"') ? 'Aref Ruqaa' : 'display');   // خط يد لو موجود (محرّك الموشن)، وإلا خط الثيم
  const sp = (ctx, k, s, d) => ctx.E.spring({ stiffness: s || 260, damping: d || 14 })(Math.max(0, k));
  const one = (L, ln) => Object.assign({}, L, { lines: [ln] });

  /* ── أيقونات (مسارات حول 0,0 بحجم s) ── */
  const IC = {
    heart(X, s) { X.beginPath(); X.moveTo(0, s * 0.35); X.bezierCurveTo(-s * 0.55, -s * 0.02, -s * 0.5, -s * 0.5, -s * 0.24, -s * 0.5); X.bezierCurveTo(-s * 0.08, -s * 0.5, 0, -s * 0.38, 0, -s * 0.28);
      X.bezierCurveTo(0, -s * 0.38, s * 0.08, -s * 0.5, s * 0.24, -s * 0.5); X.bezierCurveTo(s * 0.5, -s * 0.5, s * 0.55, -s * 0.02, 0, s * 0.35); X.closePath(); },
    star(X, s, n, inner, rot) { n = n || 5; X.beginPath(); for (let i = 0; i < n * 2; i++) { const r = i % 2 ? s * 0.5 * (inner || 0.45) : s * 0.5, a = -Math.PI / 2 + (rot || 0) + i * Math.PI / n; X.lineTo(Math.cos(a) * r, Math.sin(a) * r); } X.closePath(); },
    bolt(X, s) { const p = [[0.12, -0.5], [-0.28, 0.05], [-0.02, 0.05], [-0.12, 0.5], [0.28, -0.08], [0.02, -0.08]]; X.beginPath(); p.forEach(([x, y]) => X.lineTo(x * s, y * s)); X.closePath(); },
    sparkle(X, s) { X.beginPath(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 - Math.PI / 2, b = a + Math.PI / 4; X.lineTo(Math.cos(a) * s * 0.5, Math.sin(a) * s * 0.5); X.quadraticCurveTo(0, 0, Math.cos(a + Math.PI / 2) * s * 0.5, Math.sin(a + Math.PI / 2) * s * 0.5); void b; } X.closePath(); },
    fire(X, s) { X.beginPath(); X.moveTo(0, -s * 0.5); X.bezierCurveTo(s * 0.12, -s * 0.28, s * 0.42, -s * 0.12, s * 0.38, s * 0.14); X.bezierCurveTo(s * 0.34, s * 0.4, s * 0.14, s * 0.5, 0, s * 0.5);
      X.bezierCurveTo(-s * 0.2, s * 0.5, -s * 0.4, s * 0.36, -s * 0.38, s * 0.1); X.bezierCurveTo(-s * 0.36, -s * 0.1, -s * 0.2, -s * 0.14, -s * 0.16, -s * 0.3); X.bezierCurveTo(-s * 0.06, -s * 0.18, -s * 0.02, -s * 0.3, 0, -s * 0.5); X.closePath(); },
    circle(X, s) { X.beginPath(); X.arc(0, 0, s * 0.5, 0, TAU); },
    bubble(X, s) { X.beginPath(); X.ellipse(0, -s * 0.04, s * 0.46, s * 0.38, 0, 0, TAU); X.moveTo(-s * 0.26, s * 0.24); X.lineTo(-s * 0.36, s * 0.48); X.lineTo(-s * 0.04, s * 0.32); },
    share(X, s) { X.beginPath(); X.moveTo(s * 0.46, -s * 0.06); X.lineTo(s * 0.02, -s * 0.44); X.lineTo(s * 0.02, -s * 0.22); X.bezierCurveTo(-s * 0.32, -s * 0.2, -s * 0.46, s * 0.06, -s * 0.46, s * 0.42);
      X.bezierCurveTo(-s * 0.3, s * 0.16, -s * 0.12, s * 0.1, s * 0.02, s * 0.1); X.lineTo(s * 0.02, s * 0.32); X.closePath(); },
    bookmark(X, s) { X.beginPath(); X.moveTo(-s * 0.3, -s * 0.46); X.lineTo(s * 0.3, -s * 0.46); X.lineTo(s * 0.3, s * 0.48); X.lineTo(0, s * 0.24); X.lineTo(-s * 0.3, s * 0.48); X.closePath(); },
    bell(X, s) { X.beginPath(); X.moveTo(-s * 0.4, s * 0.26); X.bezierCurveTo(-s * 0.28, s * 0.1, -s * 0.3, -s * 0.04, -s * 0.3, -s * 0.12); X.bezierCurveTo(-s * 0.3, -s * 0.34, -s * 0.16, -s * 0.44, 0, -s * 0.44);
      X.bezierCurveTo(s * 0.16, -s * 0.44, s * 0.3, -s * 0.34, s * 0.3, -s * 0.12); X.bezierCurveTo(s * 0.3, -s * 0.04, s * 0.28, s * 0.1, s * 0.4, s * 0.26); X.closePath(); },
    person(X, s) { X.beginPath(); X.arc(0, -s * 0.24, s * 0.2, 0, TAU); X.moveTo(-s * 0.34, s * 0.5); X.lineTo(-s * 0.34, s * 0.28); X.bezierCurveTo(-s * 0.34, s * 0.06, -s * 0.18, -s * 0.0, 0, -s * 0.0);
      X.bezierCurveTo(s * 0.18, -s * 0.0, s * 0.34, s * 0.06, s * 0.34, s * 0.28); X.lineTo(s * 0.34, s * 0.5); X.closePath(); },
    pin(X, s) { X.beginPath(); X.moveTo(0, s * 0.5); X.bezierCurveTo(-s * 0.12, s * 0.22, -s * 0.36, s * 0.02, -s * 0.36, -s * 0.16); X.arc(0, -s * 0.16, s * 0.36, Math.PI, 0); X.bezierCurveTo(s * 0.36, s * 0.02, s * 0.12, s * 0.22, 0, s * 0.5); X.closePath(); },
    star8(X, s) { const R = s * 0.5, r = R * 0.7654; X.beginPath(); for (let i = 0; i < 16; i++) { const a = -Math.PI / 2 + i * Math.PI / 8, q = i % 2 ? r : R; X.lineTo(Math.cos(a) * q, Math.sin(a) * q); } X.closePath(); },
    square(X, s) { X.beginPath(); X.roundRect(-s * 0.5, -s * 0.5, s, s, s * 0.16); },
    diamond(X, s) { X.beginPath(); X.moveTo(0, -s * 0.5); X.lineTo(s * 0.5, 0); X.lineTo(0, s * 0.5); X.lineTo(-s * 0.5, 0); X.closePath(); },
    hex(X, s) { X.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; X.lineTo(Math.cos(a) * s * 0.5, Math.sin(a) * s * 0.5); } X.closePath(); },
  };
  const icon = (X, name, x, y, s, rot, fn) => { X.save(); X.translate(x, y); if (rot) X.rotate(rot); (IC[name] || IC.circle)(X, s); fn(X); X.restore(); };
  const check = (ctx, X, x, y, s, k, col, w) => { if (k > 0) ctx.drawPath(X, [[x - s * 0.45, y + s * 0.02], [x - s * 0.12, y + s * 0.34], [x + s * 0.5, y - s * 0.34]], k, { width: w || s * 0.18, color: col, cap: 'round', smooth: false }); };
  const finger = (X, P, x, y, press, a) => { if (a <= 0) return; X.save(); X.globalAlpha *= a; X.fillStyle = P.ink; X.strokeStyle = P.bg; X.lineWidth = 8; X.beginPath(); X.arc(x, y, 38 * (1 - 0.15 * press), 0, TAU); X.fill(); X.stroke(); X.restore(); };
  // رقم مختصر للعدّادات (12.4K)
  const compact = (ctx, v) => (v >= 1e6 ? ctx.num(v / 1e6, v < 1e7 ? 1 : 0) + 'M' : v >= 1e4 ? ctx.num(v / 1e3, v < 1e5 ? 1 : 0) + 'K' : ctx.num(Math.round(v)));

  /* ═══ أ) حركات كلام 101–110 ═══ */

  /* 101 حبر الفرشاة — فرشاة حبر تمشي من اليمين وتكشف السطر بحافة خشنة، ورا رأسها شعيرات ونقط حبر، وتحته ضربة فرشاة بلون الهوية.
     o: {text, s, dur=.9 (لكل سطر), x=540, y=900, size=170, accent:[i], color=P.ink, brush=true, out} */
  FX.inkBrush = (ctx, t, o) => {
    const { X, P, E } = ctx, size = o.size || 170, x = pick(o, 'x', 540), y = pick(o, 'y', 900), per = o.dur || 0.9, ink = o.color || P.ink;
    if (t < o.s) return; const fade = outK(ctx, t, o, 0.5); if (fade >= 1) return;
    const L = ctx.text.layout(X, o.text, { family: 'display', size, maxWidth: o.maxWidth || 900, lineHeight: 1.22 });
    X.save(); X.globalAlpha *= 1 - fade;
    L.lines.forEach((ln, li) => {
      const t0 = o.s + li * per * 0.8, k = E.cubicInOut(pr(t, t0, t0 + per)); if (k <= 0) return;
      const right = x + ln.width / 2 + 36, left = x - ln.width / 2 - 36, base = y + ln.y, top = base - size * 1.0, bot = base + size * 0.42, ex = lerp(right, left, k);
      X.save(); X.beginPath(); X.moveTo(right + 30, top - 10);
      for (let j = 0; j <= 16; j++) { const yy = lerp(top - 10, bot + 10, j / 16); X.lineTo(ex - (k < 1 ? 30 * ctx.noise1(j * 0.8 + li * 9, 31) + 26 : -60), yy); }
      X.lineTo(right + 30, bot + 10); X.closePath(); X.clip();
      ctx.text.drawLayout(X, one(L, ln), x, y, { perWord: i => ({ color: (o.accent || []).includes(i) ? P.acc : ink }) });
      X.restore();
      if (k > 0 && k < 1) {                                            // رأس الفرشاة: شعيرات + نقطة حبر
        for (let b = 0; b < 9; b++) { const yy = lerp(top + size * 0.1, bot - size * 0.05, (b + 0.5) / 9), ln2 = 40 + 70 * ctx.hash01(b, li, 4);
          X.save(); X.globalAlpha *= 0.55; X.strokeStyle = ink; X.lineCap = 'round'; X.lineWidth = 5 + 7 * ctx.hash01(b, li, 5); X.beginPath(); X.moveTo(ex - 20, yy); X.lineTo(ex - 20 + ln2, yy + 4 * ctx.noise1(b, 2)); X.stroke(); X.restore(); }
      }
      for (let d = 0; d < 7; d++) {                                    // نقط حبر طايرة من بداية الضربة
        const dt = t - t0 - 0.05 * d; if (dt <= 0) continue; const r = 3 + 9 * ctx.hash01(d, li, 7), ang = -2.6 + 1.6 * ctx.hash01(d, li, 8), dist = 60 + 120 * ctx.hash01(d, li, 9);
        const kk = E.expoOut(cl(dt / 0.25)); X.fillStyle = ink; X.beginPath(); X.arc(right - 10 + Math.cos(ang) * dist * kk, base - size * 0.3 + Math.sin(ang) * dist * kk, r, 0, TAU); X.fill();
      }
    });
    if (o.brush !== false) {                                           // ضربة فرشاة مسننة تحت آخر سطر (يمين ← يسار)
      const ln = L.lines[L.lines.length - 1], t0 = o.s + (L.lines.length - 1) * per * 0.8 + per * 0.6, k = E.cubicOut(pr(t, t0, t0 + 0.55));
      if (k > 0) { const xr = x + ln.width / 2 + 20, xl = x - ln.width / 2 - 20, by = y + ln.y + size * 0.3, N = 40, top2 = [], bot2 = [];
        for (let j = 0; j <= N; j++) { const u = j / N * k, xx = lerp(xr, xl, u), w = (6 + 20 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.05)), 0.6)) * (1 + 0.25 * ctx.noise1(j * 0.7, 12));
          top2.push([xx, by - w / 2 + 3 * ctx.noise1(j * 0.4, 3)]); bot2.push([xx, by + w / 2 + 3 * ctx.noise1(j * 0.4, 3)]); }
        X.fillStyle = P.acc; X.beginPath(); top2.forEach(p => X.lineTo(p[0], p[1])); bot2.reverse().forEach(p => X.lineTo(p[0], p[1])); X.closePath(); X.fill(); }
    }
    X.restore();
  };

  /* 102 ختم — الكلمة تنزل من فوق كبيرة وتنطبع بضربة: إطار ختم مزدوج، حبر مو كامل (ملمس)، موجة صدمة وغبار. o: {text, s, x=540, y=920, size=190, rot=-.07, color=P.acc, box=true, out} */
  FX.stampSlam = (ctx, t, o) => {
    const { X, P, E } = ctx, size = o.size || 190, x = pick(o, 'x', 540), y = pick(o, 'y', 920), rot = pick(o, 'rot', -0.07), col = o.color || P.acc, d = 0.2;
    if (t < o.s) return; const fade = outK(ctx, t, o, 0.4); if (fade >= 1) return;
    const k = pr(t, o.s, o.s + d), it = t - o.s - d;
    const z = k < 1 ? lerp(3.4, 1, E.expoIn(k)) : 1 + 0.06 * Math.exp(-it * 12) * Math.cos(it * 42), a = k < 1 ? E.cubicOut(k) : 1;
    const w = Math.min(820, tw(ctx, X, o.text, 'display', 400, size)), bw = w + size * 0.75, bh = size * 1.45;
    if (it > 0 && it < 0.7) { const q = it / 0.7; X.save(); X.globalAlpha *= (1 - q) * 0.55 * (1 - fade); X.strokeStyle = col; X.lineWidth = 14 * (1 - q) + 2; X.beginPath(); X.ellipse(x, y, bw * (0.55 + 0.5 * E.expoOut(q)), bh * (0.55 + 0.6 * E.expoOut(q)), rot, 0, TAU); X.stroke(); X.restore(); }
    if (it > 0) for (let i = 0; i < 16; i++) { const q = cl(it / (0.5 + 0.3 * ctx.hash01(i, 1))); if (q >= 1) continue; const side = i % 2 ? 1 : -1, ang = (side > 0 ? 0 : Math.PI) + (ctx.hash01(i, 2) - 0.5) * 1.4;
      const dist = (60 + 140 * ctx.hash01(i, 3)) * E.expoOut(q), px = x + side * bw * 0.45 + Math.cos(ang) * dist, py = y + bh * 0.3 * (ctx.hash01(i, 4) - 0.2) + Math.sin(ang) * dist * 0.6;
      X.save(); X.globalAlpha *= (1 - q) * 0.6; X.fillStyle = col; X.beginPath(); X.arc(px, py, 4 + 8 * ctx.hash01(i, 5), 0, TAU); X.fill(); X.restore(); }
    const C = offC(X, 'stamp'), Y = C.Y;
    Y.translate(x, y); Y.rotate(rot * (k < 1 ? 1.8 - 0.8 * k : 1)); Y.scale(z, z);
    if (o.box !== false) { Y.strokeStyle = col; Y.lineWidth = 14; Y.beginPath(); Y.roundRect(-bw / 2, -bh / 2, bw, bh, 22); Y.stroke(); Y.lineWidth = 5; Y.beginPath(); Y.roundRect(-bw / 2 + 22, -bh / 2 + 22, bw - 44, bh - 44, 12); Y.stroke(); }
    ctx.text(Y, o.text, 0, size * 0.34, { family: 'display', size, color: col, maxWidth: 820 });
    Y.globalCompositeOperation = 'destination-out';                   // حبر الختم مو كامل
    for (let i = 0; i < 140; i++) { const px = (ctx.hash01(i, 11) - 0.5) * bw, py = (ctx.hash01(i, 12) - 0.5) * bh, r = 1.5 + 5 * Math.pow(ctx.hash01(i, 13), 2); Y.globalAlpha = 0.5 + 0.5 * ctx.hash01(i, 14); Y.beginPath(); Y.arc(px, py, r, 0, TAU); Y.fill(); }
    putC(X, C.c, a * (1 - fade));
  };

  /* 103 لوحة المطار — كل كلمة على بلاطة تقلب (سبليت فلاب) كم مرة بكلمات ثانية من الجملة وتوقف على كلمتها. الكلمة كاملة دايماً.
     o: {text, s, x=540, y=860, size=110, flips=4, flipDur=.11, stagger=.12, accent:[i], tile=الأغمق, out} */
  FX.splitFlap = (ctx, t, o) => {
    const { X, P, E } = ctx, size = o.size || 110, fd = o.flipDur || 0.11, st = pick(o, 'stagger', 0.12), tile = o.tile || deep(P), fg = lighter(P.ink, P.bg);
    if (t < o.s - 0.2) return; const fade = outK(ctx, t, o, 0.4); if (fade >= 1) return;
    const words = o.text.split(/\s+/).filter(Boolean);
    const spW = Math.max(1, tw(ctx, X, ' ', 'display', 400, size));          // فراغ بين البلاطات (البلاطة أعرض من الكلمة)
    const L = ctx.text.layout(X, o.text, { family: 'display', size, maxWidth: o.maxWidth || 820, lineHeight: 1.6, wordSpacing: (size * 0.6 + 22) / spW });
    const B = ctx.text.drawLayout(X, L, pick(o, 'x', 540), pick(o, 'y', 860), { perWord: () => ({ skip: true }) });
    X.save(); X.globalAlpha *= 1 - fade;
    B.forEach((b, i) => {
      const pad = size * 0.3, R = { x: b.x - pad, y: b.base - size * 1.0, w: b.w + pad * 2, h: size * 1.36 }, mid = R.y + R.h / 2, t0 = o.s + i * st, n = (o.flips || 4) + (i % 3);
      const intro = E.cubicOut(pr(t, t0 - 0.2, t0)); if (intro <= 0) return;
      const seq = j => (j >= n ? b.text : j === 0 || words.length < 2 ? '' : words[(i + j * 3 + 1) % words.length]);
      const f = (t - t0) / fd, idx = f < 0 ? 0 : Math.min(n, Math.floor(f)), u = f < 0 || f >= n ? 0 : f - idx, prev = seq(idx), next = seq(Math.min(n, idx + 1));
      const col = idx >= n && (o.accent || []).includes(i) ? P.acc : fg;
      const half = (str, top, sy, c2) => { X.save(); X.beginPath(); X.rect(R.x - 2, top ? R.y - 2 : mid, R.w + 4, R.h / 2 + 2); X.clip();
        X.translate(0, mid); X.scale(1, Math.max(0.001, sy)); X.translate(0, -mid);
        X.fillStyle = tile; X.beginPath(); X.roundRect(R.x, R.y, R.w, R.h, 14); X.fill();
        if (sy < 0.999) { X.fillStyle = 'rgba(0,0,0,' + (0.35 * (1 - sy)).toFixed(3) + ')'; X.fillRect(R.x, R.y, R.w, R.h); }
        if (str) ctx.text(X, str, b.cx, b.base, { family: 'display', size, color: c2 || fg, maxWidth: R.w - pad }); X.restore(); };
      X.save(); X.globalAlpha *= intro; X.translate(0, 30 * (1 - intro));
      shd(X, 24, 10, 0.25); X.fillStyle = tile; X.beginPath(); X.roundRect(R.x, R.y, R.w, R.h, 14); X.fill(); noShd(X);
      const ink2 = idx >= n ? col : fg;
      half(u > 0 ? next : prev, true, 1, u > 0 && idx + 1 >= n ? col : ink2); half(prev, false, 1, ink2);
      if (u > 0 && u < 0.5) half(prev, true, 1 - 2 * u, ink2);
      else if (u >= 0.5) half(next, false, 2 * u - 1, idx + 1 >= n ? col : fg);
      X.fillStyle = 'rgba(0,0,0,.45)'; X.fillRect(R.x, mid - 2, R.w, 4);
      X.fillStyle = rgba(fg, 0.25); X.fillRect(R.x + 6, mid - 7, 6, 14); X.fillRect(R.x + R.w - 12, mid - 7, 6, 14);
      X.restore();
    });
    X.restore();
  };

  /* 104 نيون — الكلام أنبوب نيون: يرمش ويولّع (رمشات ثابتة)، وهج بلون الهوية فوق لوحة غامقة، والسطر الثاني يولّع بعده. o: {text, sub, s, x=540, y=880, size=170, color=P.acc, panel=true, out} */
  FX.neonSign = (ctx, t, o) => {
    const { X, P, at } = ctx, size = o.size || 170, x = pick(o, 'x', 540), y = pick(o, 'y', 880), col = o.color || P.acc;
    if (t < o.s - 0.3) return; const fade = outK(ctx, t, o, 0.4); if (fade >= 1) return;
    const FL = [[0, 0], [0.06, 1], [0.1, 0], [0.2, 0.8], [0.24, 0], [0.34, 1], [0.38, 0.25], [0.46, 1]];
    const lit = (u) => { if (u < 0) return 0; let v = 0; for (const [a, b] of FL) if (u >= a) v = b; return u > 0.5 ? 0.92 + 0.08 * ctx.noise1(u * 9, 4) : v; };
    const on1 = lit(t - o.s), on2 = o.sub ? lit(t - o.s - 0.75) : 0, w = Math.min(900, tw(ctx, X, o.text, 'display', 400, size));
    X.save(); X.globalAlpha *= 1 - fade;
    if (o.panel !== false) { const pa = at(t, o.s - 0.3, o.s, 'cubicOut'), ph = size * 1.7 + (o.sub ? size * 0.75 : 0);
      X.save(); X.globalAlpha *= pa; shd(X, 50, 20, 0.35); X.fillStyle = mix(deep(P), '#000000', 0.35); X.beginPath(); X.roundRect(x - w / 2 - 90, y - size * 1.1, w + 180, ph, 40); X.fill(); noShd(X);
      const g = X.createRadialGradient(x, y - size * 0.3, 10, x, y - size * 0.3, w * 0.75); g.addColorStop(0, rgba(col, 0.28 * on1)); g.addColorStop(1, rgba(col, 0)); X.fillStyle = g; X.fillRect(x - w / 2 - 90, y - size * 1.1, w + 180, ph); X.restore(); }
    const tube = (str, yy, sz, c, on) => {
      ctx.text(X, str, x, yy, { family: 'display', size: sz, color: null, maxWidth: 900, stroke: { width: sz * 0.05, color: rgba(c, 0.22) } });
      if (on <= 0) return;
      X.save(); X.globalAlpha *= on;
      ctx.text(X, str, x, yy, { family: 'display', size: sz, color: null, maxWidth: 900, stroke: { width: sz * 0.075, color: c }, shadow: { blur: 46, y: 0, color: c } });
      ctx.text(X, str, x, yy, { family: 'display', size: sz, color: null, maxWidth: 900, stroke: { width: sz * 0.05, color: c }, shadow: { blur: 16, y: 0, color: c } });
      ctx.text(X, str, x, yy, { family: 'display', size: sz, color: null, maxWidth: 900, stroke: { width: sz * 0.022, color: mix(c, '#FFFFFF', 0.75) } });
      X.restore(); };
    tube(o.text, y, size, col, on1);
    if (o.sub) tube(o.sub, y + size * 0.85, size * 0.42, '#FFFFFF', on2);
    X.restore();
  };

  /* 105 بوستر كلمات — كل كلمة سطر بعرض واحد (الصغيرة تكبر)، تدخل من جهة وعكسها بميلة، والكتلة تتوسّط وهي تكبر. o: {text | lines:[…], s, stagger=.3, y=960 (المركز), w=860, max=300, accent:[i] (رقم السطر), out} */
  FX.wordStack = (ctx, t, o) => {
    const { X, P, E } = ctx, W = o.w || 860, mx = o.max || 300, st = pick(o, 'stagger', 0.3), cy = pick(o, 'y', 960);
    if (t < o.s) return; const fade = outK(ctx, t, o, 0.45); if (fade >= 1) return;
    const lines = o.lines || o.text.split(/\s+/).filter(Boolean);
    const S = lines.map(s => Math.min(mx, (W / tw(ctx, X, s, 'display', 400, 100)) * 100)), Hh = S.map(s => s * 0.9), K = lines.map((_, i) => E.expoOut(pr(t, o.s + i * st, o.s + i * st + 0.55)));
    const total = Hh.reduce((a, h, i) => a + h * K[i], 0); let yy = cy - total / 2;
    X.save(); X.globalAlpha *= 1 - fade; zoomAt(X, [540, cy], 1 + 0.15 * fade);
    lines.forEach((s, i) => { const k = K[i]; if (k <= 0) return;
      const dir = i % 2 ? -1 : 1, base = yy + Hh[i] * 0.86;
      X.save(); X.translate(540 + dir * (1 - k) * 1100, base); X.transform(1, 0, -0.35 * dir * (1 - k), 1, 0, 0);
      ctx.text(X, s, 0, 0, { family: 'display', size: S[i], color: (o.accent ? o.accent.includes(i) : i % 2 === 1) ? P.acc : P.ink }); X.restore();
      yy += Hh[i] * k; });
    X.restore();
  };

  /* 106 كلمات من العمق — كل كلمة تجي من بعيد (صغيرة مغبّشة) لين تصير بوجهك، وتعدّي الكاميرا لما تجي اللي بعدها؛ خطوط سرعة من المركز. o: {text, s, step=.55, x=540, y=900, size=230, streaks=true, accent:[i], out} */
  FX.zoomThrough = (ctx, t, o) => {
    const { X, P, E } = ctx, size = o.size || 230, step = o.step || 0.55, x = pick(o, 'x', 540), y = pick(o, 'y', 900);
    if (t < o.s - 0.4) return; const fade = outK(ctx, t, o, 0.4); if (fade >= 1) return;
    const W = (o.text || '').split(/\s+/).filter(Boolean), n = W.length, endT = o.s + (n - 1) * step;
    X.save(); X.globalAlpha *= 1 - fade;
    if (o.streaks !== false) { const inten = pr(t, o.s - 0.4, o.s) * (1 - pr(t, endT + 0.1, endT + 0.6));
      if (inten > 0) for (let j = 0; j < 36; j++) { const a = ctx.hash01(j, 1) * TAU, d = ((t * (1.2 + ctx.hash01(j, 2))) + ctx.hash01(j, 3)) % 1, r0 = 90 + 1100 * d * d, len = 40 + 260 * d * d;
        X.save(); X.globalAlpha *= 0.4 * d * inten; X.strokeStyle = j % 3 ? P.mut : P.acc; X.lineWidth = 3 + 5 * d; X.lineCap = 'round'; X.beginPath(); X.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); X.lineTo(x + Math.cos(a) * (r0 + len), y + Math.sin(a) * (r0 + len)); X.stroke(); X.restore(); } }
    W.forEach((w, i) => { const p = (t - (o.s + i * step)) / step, k = E.expoOut(cl((p + 0.6) / 0.6)); if (k <= 0) return;
      const q = i < n - 1 ? E.expoIn(cl((p - 0.55) / 0.45)) : 0; if (q >= 1) return;
      const sc = lerp(0.08, 1, k) * (1 + 6 * q), al = k * (1 - q), bl = 14 * (1 - k) + 10 * q;
      X.save(); X.globalAlpha *= al; if (bl > 0.6) X.filter = `blur(${bl.toFixed(1)}px)`; X.translate(x, y); X.scale(sc, sc);
      ctx.text(X, w, 0, size * 0.34, { family: 'display', size, color: (o.accent || [n - 1]).includes(i) ? P.acc : P.ink, maxWidth: 900 }); X.restore(); });
    X.restore();
  };

  /* 107 نص قلتش — النص يرجف بانقسام ألوان (RGB) وشرايح تنزاح بدفعات قصيرة، ويستقر نظيف. للتقنية والضربة. o: {text, s, x=540, y=900, size=170, dur=2.4 (مدة الدفعات), amp=40, colors=[P.acc, '#22D3EE'], out} */
  FX.glitchText = (ctx, t, o) => {
    const { X, P, E } = ctx, size = o.size || 170, x = pick(o, 'x', 540), y = pick(o, 'y', 900), amp = o.amp || 40, cols = o.colors || [P.acc, '#22D3EE'];
    if (t < o.s) return; const fade = outK(ctx, t, o, 0.25);
    const fr = Math.floor(t * 24), intro = 1 - E.cubicOut(pr(t, o.s, o.s + 0.45)), live = t < o.s + (o.dur || 2.4) ? 1 : 0;
    const burst = live && ctx.hash01(fr, 7) < 0.14 ? 0.5 + 0.5 * ctx.hash01(fr, 8) : 0, g = Math.max(intro, burst, fade);
    if (fade >= 1) return;
    const T = (Y, dx, c, a) => ctx.text(Y, o.text, x + dx, y, { family: 'display', size, color: c, alpha: a, maxWidth: 900 });
    X.save(); X.globalAlpha *= (1 - fade) * (t < o.s + 0.04 ? 0.5 : 1);
    if (g < 0.03) { T(X, 0, o.color || P.ink); X.restore(); return; }
    const dx = (ctx.hash01(fr, 1) - 0.3) * amp * g;
    T(X, -dx - 6 * g, cols[0], 0.9); T(X, dx + 6 * g, cols[1], 0.85);
    const C = offC(X, 'gt'); T(C.Y, 0, o.color || P.ink);
    let yy = y - size * 1.05, j = 0;
    while (yy < y + size * 0.45) { const h = 10 + 36 * ctx.hash01(fr, j, 3), sh = ctx.hash01(fr, j, 4) < 0.5 * g ? (ctx.hash01(fr, j, 5) - 0.5) * 2 * amp * g : 0;
      blit(X, C.c, 0, yy, 1080, h, sh, yy, 1080, h); yy += h; j++; }
    if (g > 0.3) for (let b = 0; b < 3; b++) if (ctx.hash01(fr, b, 9) < 0.5) { X.fillStyle = b % 2 ? cols[0] : cols[1]; X.fillRect(x - 450 + 900 * ctx.hash01(fr, b, 10), y - size * (0.2 + 0.7 * ctx.hash01(fr, b, 11)), 60 + 160 * ctx.hash01(fr, b, 12), 8); }
    X.restore();
  };

  /* 108 تصحيح — كلمة بالجملة تنشطب بخربشة، وفوقها تطلع الكلمة الصح بخط اليد مع علامة إضافة. o: {text, word (رقم الكلمة), with (الكلمة الجديدة), s, x=540, y=980, size=120, color=P.acc, out} */
  FX.strikeReplace = (ctx, t, o) => {
    const { X, P, at } = ctx, size = o.size || 120, col = o.color || P.acc, wi = o.word || 0;
    if (t < o.s - 0.4) return; const fade = outK(ctx, t, o, 0.4); if (fade >= 1) return;
    const intro = at(t, o.s - 0.4, o.s, 'cubicOut'), k1 = at(t, o.s + 0.3, o.s + 0.75, 'cubicInOut'), k2 = at(t, o.s + 0.7, o.s + 1.1, 'backOut'), k3 = at(t, o.s + 0.95, o.s + 1.2, 'cubicOut');
    X.save(); X.globalAlpha *= intro * (1 - fade);
    const L = ctx.text.layout(X, o.text, { family: 'display', size, maxWidth: o.maxWidth || 900, lineHeight: 1.9 });
    const B = ctx.text.drawLayout(X, L, pick(o, 'x', 540), pick(o, 'y', 980), { perWord: i => ({ color: i === wi && k1 > 0.5 ? P.mut : P.ink }) });
    const b = B[wi]; if (!b) { X.restore(); return; }
    const pts = []; for (let j = 0; j <= 7; j++) { const u = j / 7; pts.push([b.x + b.w + 14 - (b.w + 28) * u, b.cy + 6 + (j % 2 ? -1 : 1) * size * 0.12 + 4 * ctx.noise1(j, 3)]); }
    if (k1 > 0) ctx.drawPath(X, pts, k1, { width: size * 0.1, color: col, cap: 'round', smooth: false });
    const fam = handFam(ctx), ns = fam === 'display' ? size * 0.95 : size * 1.45, nx = b.cx, ny = b.y - size * 0.2;
    if (k3 > 0) { X.save(); X.strokeStyle = col; X.lineWidth = 8; X.lineCap = 'round'; X.lineJoin = 'round'; X.globalAlpha *= k3;
      X.beginPath(); X.moveTo(nx - 28, b.y + size * 0.16); X.lineTo(nx, b.y - size * 0.04); X.lineTo(nx + 28, b.y + size * 0.16); X.stroke(); X.restore(); }
    if (k2 > ON) { X.save(); X.translate(nx, ny); X.rotate(-0.06); X.scale(k2, k2); ctx.text(X, o.with || '', 0, 0, { family: fam, weight: 700, size: ns, color: col, maxWidth: 800 }); X.restore(); }
    X.restore();
  };

  /* 109 شرائح النص — السطر ينفتح من شرائح أفقية (مثل الستارة الفينيسية) تلف بالتتابع من فوق لتحت. o: {text, s, n=7 (شرائح لكل سطر), dur=.7, x=540, y=900, size=180, accent:[i], out} */
  FX.blindsText = (ctx, t, o) => {
    const { X, P, E } = ctx, size = o.size || 180, n = o.n || 7, du = o.dur || 0.7, x = pick(o, 'x', 540), y = pick(o, 'y', 900);
    if (t < o.s) return;
    const L = ctx.text.layout(X, o.text, { family: 'display', size, maxWidth: o.maxWidth || 900, lineHeight: 1.2 });
    L.lines.forEach((ln, li) => {
      const top = y + ln.y - size * 0.98, Hh = size * 1.36, h = Hh / n;
      for (let j = 0; j < n; j++) {
        const t0 = o.s + li * 0.18 + j * 0.05, kin = E.expoOut(pr(t, t0, t0 + du)), kout = o.out != null ? E.expoIn(pr(t, o.out + j * 0.04, o.out + j * 0.04 + 0.4)) : 0, k = kin * (1 - kout);
        if (k <= 0.002) continue; const cy = top + (j + 0.5) * h;
        X.save(); X.beginPath(); X.rect(0, top + j * h - 0.5, 1080, h + 1); X.clip(); X.translate(0, cy); X.scale(1, k); X.translate(0, -cy);
        ctx.text.drawLayout(X, one(L, ln), x, y, { perWord: i => ({ color: (o.accent || []).includes(i) ? P.acc : P.ink }) }); X.restore();
        if (k < 0.98) { X.fillStyle = rgba(P.acc, 0.5 * (1 - k)); X.fillRect(x - ln.width / 2 - 20, cy - 2, ln.width + 40, 4); }
      }
    });
  };

  /* 110 شريط يلف — شريطين متقاطعين (لون الهوية والحبر) يدخلون من الجهتين ويمشي عليهم الكلام بلا وقفة (يمين ← يسار). o: {text, text2, s, y=960, size=96, speed=200 (بكسل/ث), angle=.09, out} */
  FX.marquee = (ctx, t, o) => {
    const { X, P, E } = ctx, size = o.size || 96, y = pick(o, 'y', 960), sp2 = o.speed || 200, ang = pick(o, 'angle', 0.09);
    if (t < o.s) return; const fade = outK(ctx, t, o, 0.5);
    const tape = (str, a, bg, fg, dir, delay) => {
      const k = E.expoOut(pr(t, o.s + delay, o.s + delay + 0.7)) * (1 - E.expoIn(fade)); if (k <= 0) return;
      const hh = size * 1.7, unit = tw(ctx, X, str, 'display', 400, size) + 150, off = ((t - o.s) * sp2 * (dir > 0 ? 1 : 0.85)) % unit;
      X.save(); X.translate(540 + dir * (1 - k) * 1500, y); X.rotate(a);
      shd(X, 30, 12, 0.25); X.fillStyle = bg; X.fillRect(-1300, -hh / 2, 2600, hh); noShd(X);
      X.beginPath(); X.rect(-1300, -hh / 2, 2600, hh); X.clip();
      for (let xx = -1400 - unit + off; xx < 1400; xx += unit) {
        ctx.text(X, str, xx + (unit - 150) / 2, size * 0.34, { family: 'display', size, color: fg });
        X.save(); X.translate(xx + unit - 75, 0); X.rotate(Math.PI / 4); X.fillStyle = fg; X.fillRect(-11, -11, 22, 22); X.restore(); }
      X.restore(); };
    tape(o.text2 || o.text, ang, deep(P), lighter(P.ink, P.bg), -1, 0.12);
    tape(o.text, -ang, P.acc, onAcc(P), 1, 0);
  };

  /* ═══ ب) كابشن 111–112 ═══ */

  /* 111 كلمة وحدة — كابشن كلمة كلمة بنص الشاشة: كل كلمة تفرقع لحالها بميلة خفيفة، والمهمة بلون الهوية. o: {text|line, s, step=.38, x=540, y=1150, size=150, accent:[i], out, stroke (لون أو null)} */
  FX.wordPop = (ctx, t, o) => {
    const { X, P } = ctx, size = o.size || 150, step = o.step || 0.38, x = pick(o, 'x', 540), y = pick(o, 'y', 1150);
    const words = (o.text || ctx.lineSpan(o.line).text).split(/\s+/).filter(Boolean);
    let cur = -1; for (let i = 0; i < words.length; i++) if (t >= wt(ctx, o, i, step)) cur = i;
    if (cur < 0) return; const fade = outK(ctx, t, o, 0.3); if (fade >= 1) return;
    const dt = t - wt(ctx, o, cur, step), k = Math.min(1.12, sp(ctx, dt, 520, 20)), w = words[cur], ww = tw(ctx, X, w, 'display', 400, size), fit = Math.min(1, 900 / Math.max(1, ww));
    const isA = (o.accent || []).includes(cur), stroke = o.stroke === null ? null : { width: size * 0.14, color: typeof o.stroke === 'string' ? o.stroke : deep(P) };
    if (cur > 0 && dt < 0.1) { X.save(); X.globalAlpha *= 1 - dt / 0.1; X.translate(x, y); X.scale(0.9, 0.9); ctx.text(X, words[cur - 1], 0, size * 0.34, { family: 'display', size: size * Math.min(1, 900 / tw(ctx, X, words[cur - 1], 'display', 400, size)), color: '#FFFFFF', stroke }); X.restore(); }
    X.save(); X.globalAlpha *= 1 - fade; X.translate(x, y); X.rotate((ctx.hash01(cur, 3) - 0.5) * 0.07); const s = (0.5 + 0.5 * k) * fit; X.scale(s, s);
    if (isA) { X.fillStyle = P.acc; X.beginPath(); X.roundRect(-ww / 2 - 34, -size * 0.72, ww + 68, size * 1.32, size * 0.24); X.fill(); }
    ctx.text(X, w, 0, size * 0.34, { family: 'display', size, color: isA ? onAcc(P) : '#FFFFFF', stroke: isA ? null : stroke });
    X.restore();
  };

  /* 112 كابشن عريض — مقاطع من 2–3 كلمات بخط عريض وحدّ غامق وظل؛ الكلمة الحالية تكبر وتلوّن، وكل مقطع يطلع من تحت. o: {text|line, s, step=.32, chunk=3, x=540, y=1180, size=110, accent:[i], out} */
  FX.boldCaption = (ctx, t, o) => {
    const { X, P, E } = ctx, size = o.size || 110, step = o.step || 0.32, ch = o.chunk || 3, x = pick(o, 'x', 540), y = pick(o, 'y', 1180);
    const words = (o.text || ctx.lineSpan(o.line).text).split(/\s+/).filter(Boolean);
    let cur = -1; for (let i = 0; i < words.length; i++) if (t >= wt(ctx, o, i - 0.0, step) - 0.02) cur = i;
    if (cur < 0) return; const fade = outK(ctx, t, o, 0.3); if (fade >= 1) return;
    const g = Math.floor(cur / ch), g0 = g * ch, part = words.slice(g0, g0 + ch), gs = wt(ctx, o, g0, step), kin = E.expoOut(pr(t, gs - 0.02, gs + 0.2));
    const L = ctx.text.layout(X, part.join(' '), { family: 'display', size, maxWidth: o.maxWidth || 920, lineHeight: 1.15 });
    X.save(); X.globalAlpha *= (1 - fade) * kin; X.translate(0, 50 * (1 - kin));
    ctx.text.drawLayout(X, L, x, y, { perWord: i => { const gi = g0 + i, on = gi <= cur, isCur = gi === cur, pk = isCur ? E.backOut(pr(t, wt(ctx, o, gi, step), wt(ctx, o, gi, step) + 0.16)) : 1;
      return { alpha: on ? 1 : 0.0, scale: isCur ? 1 + 0.12 * pk : 1, color: isCur || (o.accent || []).includes(gi) ? P.acc : '#FFFFFF', stroke: { width: size * 0.18, color: deep(P) }, shadow: { blur: 0, y: size * 0.07, color: deep(P) } }; } });
    X.restore();
  };

  /* ═══ ج) تمييز الكلام 113–116 ═══ */

  /* 113 دائرة بالقلم — دائرة بخط اليد ترتسم حول كلمة (لفّة وشوي زيادة)، وثلاث شرطات تنبيه تطلع جنبها. o: {text, mark (رقم الكلمة), s, x=540, y=900, size=140, color=P.acc, out} */
  FX.markerCircle = (ctx, t, o) => {
    const { X, P, at } = ctx, size = o.size || 140, col = o.color || P.acc, mi = o.mark || 0;
    if (t < o.s - 0.4) return; const fade = outK(ctx, t, o, 0.4); if (fade >= 1) return;
    const intro = at(t, o.s - 0.4, o.s, 'cubicOut'), k = at(t, o.s + 0.35, o.s + 1.0, 'cubicInOut'), k2 = at(t, o.s + 1.0, o.s + 1.3, 'expoOut');
    X.save(); X.globalAlpha *= intro * (1 - fade);
    const L = ctx.text.layout(X, o.text, { family: 'display', size, maxWidth: o.maxWidth || 880, lineHeight: 1.5 });
    const B = ctx.text.drawLayout(X, L, pick(o, 'x', 540), pick(o, 'y', 900), { perWord: i => ({ color: i === mi && k > 0.6 ? col : P.ink }) });
    const b = B[mi]; if (b && k > 0) {
      const rx = b.w / 2 + size * 0.38, ry = size * 0.74, cx = b.cx, cy = b.cy + size * 0.05, pts = [];
      for (let j = 0; j <= 56; j++) { const u = j / 56, a = -2.3 + u * TAU * 1.12, gr = 1 + 0.07 * u + 0.05 * ctx.noise1(j * 0.35, 5);
        pts.push([cx + Math.cos(a) * rx * gr, cy + Math.sin(a) * ry * gr]); }
      ctx.drawPath(X, pts, k, { width: 9, color: col, cap: 'round' });
      if (k2 > 0) for (let j = 0; j < 3; j++) { const a = -1.15 + j * 0.42, r0 = rx * 1.12, x0 = cx + Math.cos(a) * r0 * 0.98, y0 = cy + Math.sin(a) * ry * 1.25;
        ctx.drawPath(X, [[x0, y0], [x0 + Math.cos(a) * 44, y0 + Math.sin(a) * 44]], k2, { width: 8, color: col, cap: 'round', smooth: false }); }
    }
    X.restore();
  };

  /* 114 خط تحت — خط تحت كلمة (أو كلمات) يرتسم من اليمين، بستايل تختاره: موجة · مزدوج · فرشاة · زقزاق · نقاط. o: {text, under (رقم أو [أرقام]), style='wave'|'double'|'brush'|'zigzag'|'dots', s, x=540, y=900, size=140, color=P.acc, out} */
  FX.underlineStyles = (ctx, t, o) => {
    const { X, P, at } = ctx, size = o.size || 140, col = o.color || P.acc, st = o.style || 'wave', U = [].concat(o.under == null ? 0 : o.under);
    if (t < o.s - 0.4) return; const fade = outK(ctx, t, o, 0.4); if (fade >= 1) return;
    X.save(); X.globalAlpha *= at(t, o.s - 0.4, o.s, 'cubicOut') * (1 - fade);
    const L = ctx.text.layout(X, o.text, { family: 'display', size, maxWidth: o.maxWidth || 880, lineHeight: 1.45 });
    const B = ctx.text.drawLayout(X, L, pick(o, 'x', 540), pick(o, 'y', 900), { perWord: i => ({ color: U.includes(i) && t > o.s + 0.3 ? col : P.ink }) });
    U.forEach((wi, n) => { const b = B[wi]; if (!b) return; const t0 = o.s + 0.25 + n * 0.3, k = at(t, t0, t0 + 0.6, 'cubicInOut'); if (k <= 0) return;
      const xr = b.x + b.w + 12, xl = b.x - 12, y0 = b.base + size * 0.24, w = xr - xl, N = Math.max(12, Math.round(w / 12)), line = f => { const p = []; for (let j = 0; j <= N; j++) { const u = j / N; p.push([lerp(xr, xl, u), y0 + f(u)]); } return p; };
      if (st === 'double') { ctx.drawPath(X, line(() => 0), k, { width: 8, color: col, cap: 'round', smooth: false }); const k2 = at(t, t0 + 0.2, t0 + 0.75, 'cubicInOut'); if (k2 > 0) ctx.drawPath(X, line(() => 18), k2, { width: 8, color: col, cap: 'round', smooth: false }); }
      else if (st === 'zigzag') { const zz = Math.max(3, Math.round(w / 46)); ctx.drawPath(X, Array.from({ length: zz * 2 + 1 }, (_, j) => [lerp(xr, xl, j / (zz * 2)), y0 + (j % 2 ? 14 : -6)]), k, { width: 8, color: col, cap: 'round', smooth: false }); }
      else if (st === 'dots') { const nd = Math.max(4, Math.round(w / 34)); for (let j = 0; j < nd; j++) { const q = at(t, t0 + j * 0.04, t0 + j * 0.04 + 0.2, 'backOut'); if (q > ON) { X.fillStyle = col; X.beginPath(); X.arc(lerp(xr - 8, xl + 8, j / (nd - 1)), y0 + 4, 8 * q, 0, TAU); X.fill(); } } }
      else if (st === 'brush') { const top = [], bot = []; for (let j = 0; j <= 30; j++) { const u = j / 30 * k, xx = lerp(xr, xl, u), ww = 6 + 18 * Math.pow(Math.sin(Math.PI * Math.min(1, u)), 0.5); top.push([xx, y0 + 4 - ww / 2 - 2 * u]); bot.push([xx, y0 + 4 + ww / 2 - 2 * u]); }
        X.fillStyle = col; X.beginPath(); top.forEach(p => X.lineTo(p[0], p[1])); bot.reverse().forEach(p => X.lineTo(p[0], p[1])); X.closePath(); X.fill(); }
      else { const waves = Math.max(2, w / 70); ctx.drawPath(X, line(u => Math.sin(u * waves * TAU) * size * 0.06), k, { width: 8, color: col, cap: 'round' }); }
    });
    X.restore();
  };

  /* 115 صندوق يقلب — صندوق بلون الهوية يمسح الكلمة من اليمين، والكلمة داخله تنقلب لونها، ونبضة صغيرة لما يكمل. o: {text, word (رقم أو [أرقام]), s, x=540, y=900, size=140, color=P.acc, out} */
  FX.boxInvert = (ctx, t, o) => {
    const { X, P, at, E } = ctx, size = o.size || 140, col = o.color || P.acc, Wd = [].concat(o.word == null ? 0 : o.word);
    if (t < o.s - 0.4) return; const fade = outK(ctx, t, o, 0.4); if (fade >= 1) return;
    X.save(); X.globalAlpha *= at(t, o.s - 0.4, o.s, 'cubicOut') * (1 - fade);
    const L = ctx.text.layout(X, o.text, { family: 'display', size, maxWidth: o.maxWidth || 880, lineHeight: 1.45 });
    const B = ctx.text.drawLayout(X, L, pick(o, 'x', 540), pick(o, 'y', 900), { color: P.ink });
    Wd.forEach((wi, n) => { const b = B[wi]; if (!b) return; const t0 = o.s + 0.3 + n * 0.35, k = E.expoInOut(pr(t, t0, t0 + 0.5)); if (k <= 0) return;
      const pop = 1 + 0.06 * Math.sin(Math.PI * pr(t, t0 + 0.5, t0 + 0.75)), pad = size * 0.16, R = { x: b.x - pad, y: b.base - size * 0.92, w: b.w + pad * 2, h: size * 1.24 };
      X.save(); X.translate(b.cx, b.cy); X.scale(pop, pop); X.rotate(-0.02 * pop); X.translate(-b.cx, -b.cy);
      X.beginPath(); X.rect(R.x + R.w * (1 - k), R.y, R.w * k, R.h); X.clip();
      X.fillStyle = col; X.fillRect(R.x - 2, R.y, R.w + 4, R.h); wordAt(ctx, X, b, size, onAcc(P)); X.restore(); });
    X.restore();
  };

  /* 116 سهم يأشر — تعليق صغير يطلع، ومنه سهم بخط اليد ينحني لين يوصل نقطة، وحولها دائرة تنبض. o: {label, s, from=[760,560], to=[440,1000], curve=.35, size=64, color=P.acc, ring=true, out} */
  FX.arrowPoint = (ctx, t, o) => {
    const { X, P, at } = ctx, A = o.from || [760, 560], Bp = o.to || [440, 1000], col = o.color || P.acc, size = o.size || 64, cv = pick(o, 'curve', 0.35);
    if (t < o.s) return; const fade = outK(ctx, t, o, 0.4); if (fade >= 1) return;
    const k0 = at(t, o.s, o.s + 0.35, 'backOut'), k1 = at(t, o.s + 0.25, o.s + 0.85, 'cubicInOut'), k2 = at(t, o.s + 0.82, o.s + 1.0, 'cubicOut'), k3 = at(t, o.s + 0.9, o.s + 1.3, 'cubicOut');
    X.save(); X.globalAlpha *= 1 - fade;
    const fam = handFam(ctx), lsz = fam === 'display' ? size : size * 1.4;
    if (k0 > ON && o.label) { X.save(); X.translate(A[0], A[1]); X.rotate(-0.05); X.scale(k0, k0); ctx.text(X, o.label, 0, 0, { family: fam, weight: 700, size: lsz, color: col, maxWidth: 520 }); X.restore(); }
    const s0 = [A[0], A[1] + size * 0.45], e0 = [Bp[0], Bp[1]], dx = e0[0] - s0[0], dy = e0[1] - s0[1], d = Math.hypot(dx, dy), nx = -dy / d, ny = dx / d;
    const c = [(s0[0] + e0[0]) / 2 + nx * d * cv, (s0[1] + e0[1]) / 2 + ny * d * cv], end = 1 - 70 / d, pts = [];
    for (let j = 0; j <= 40; j++) { const u = j / 40 * end, q = 1 - u; pts.push([q * q * s0[0] + 2 * q * u * c[0] + u * u * e0[0] + 3 * ctx.noise1(j * 0.5, 2), q * q * s0[1] + 2 * q * u * c[1] + u * u * e0[1] + 3 * ctx.noise1(j * 0.5, 3)]); }
    if (k1 > 0) ctx.drawPath(X, pts, k1, { width: 10, color: col, cap: 'round' });
    if (k2 > 0) { const p1 = pts[pts.length - 1], p0 = pts[pts.length - 4], a = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
      [0.6, -0.6].forEach(da => ctx.drawPath(X, [p1, [p1[0] - Math.cos(a + da) * 48, p1[1] - Math.sin(a + da) * 48]], k2, { width: 10, color: col, cap: 'round', smooth: false })); }
    if (o.ring !== false && k3 > 0) { const rp = []; for (let j = 0; j <= 30; j++) { const a = -1.6 + j / 30 * TAU * 1.05; rp.push([e0[0] + Math.cos(a) * 58 * (1 + 0.05 * ctx.noise1(j, 8)), e0[1] + Math.sin(a) * 58]); }
      ctx.drawPath(X, rp, k3, { width: 7, color: col, cap: 'round' });
      const ph = ((t - o.s - 1.3) / 1.1) % 1; if (t > o.s + 1.3) { X.save(); X.globalAlpha *= 0.5 * (1 - ph); X.strokeStyle = col; X.lineWidth = 5; X.beginPath(); X.arc(e0[0], e0[1], 58 + 70 * ph, 0, TAU); X.stroke(); X.restore(); } }
    X.restore();
  };

  /* ═══ د) دعوة ومنصات 117–124 (أشكال عامة — بلا شعار أي منصة) ═══ */

  /* 117 زر المتابعة — كرت حساب (صورة دائرية + اسم + معرّف) وزر «متابعة» ينضغط ويتحول «تتابعه ✓» والعدد يزيد واحد. o: {name, handle, s, tap=s+1.4, y=1250, count, label='متابعة', done='تتابعه', avatar:(Y,r)=>{} (اختياري), out} */
  FX.followButton = (ctx, t, o) => {
    const { X, P, at, E } = ctx, y = pick(o, 'y', 1250), tap = o.tap != null ? o.tap : o.s + 1.4;
    if (t < o.s) return; const fade = outK(ctx, t, o, 0.4); if (fade >= 1) return;
    const k = sp(ctx, t - o.s, 300, 22), dn = at(t, tap + 0.05, tap + 0.35, 'expoOut'), press = Math.sin(Math.PI * pr(t, tap - 0.05, tap + 0.15));
    X.save(); X.globalAlpha *= cl(k * 1.4) * (1 - fade); X.translate(0, (1 - Math.min(1, k)) * 160);
    const x0 = 140, x1 = 930, h = 210; shd(X, 40, 14, 0.16); X.fillStyle = card(P); X.beginPath(); X.roundRect(x0, y - h / 2, x1 - x0, h, 44); X.fill(); noShd(X);
    const ax = x1 - 100, r = 62; X.save(); X.beginPath(); X.arc(ax, y, r, 0, TAU); X.clip();
    if (o.avatar) o.avatar(X, { x: ax - r, y: y - r, w: r * 2, h: r * 2 }); else { const g = X.createLinearGradient(ax - r, y - r, ax + r, y + r); g.addColorStop(0, P.acc); g.addColorStop(1, P.hi || P.acc); X.fillStyle = g; X.fillRect(ax - r, y - r, r * 2, r * 2);
      ctx.text(X, [...(o.name || '؟')][0], ax, y + 24, { family: 'display', size: 70, color: onAcc(P) }); } X.restore();
    X.strokeStyle = P.acc; X.lineWidth = 5; X.beginPath(); X.arc(ax, y, r + 8, 0, TAU); X.stroke();
    const cnt = o.count != null ? ctx.num(+o.count + (t > tap + 0.1 ? 1 : 0)) + ' متابع' : '', ny = cnt && o.handle ? -34 : -10;
    ctx.text(X, o.name || '', ax - 95, y + ny, { family: 'body', weight: 700, size: 48, align: 'right', color: P.ink, maxWidth: 330 });
    if (o.handle) ctx.text(X, o.handle, ax - 95, y + ny + 46, { family: 'body', weight: 400, size: 32, align: 'right', dir: 'ltr', color: P.mut, maxWidth: 330 });   // المعرّف لاتيني: LTR عشان @ تبقى بمكانها
    if (cnt) ctx.text(X, cnt, ax - 95, y + ny + (o.handle ? 90 : 52), { family: 'body', weight: 700, size: 32, align: 'right', color: t > tap + 0.1 && t < tap + 0.6 ? P.acc : P.mut, maxWidth: 330 });
    if (o.count != null && t > tap + 0.1 && t < tap + 1.1) { const q = pr(t, tap + 0.1, tap + 1.1); ctx.text(X, '+1', ax - 330, y + 40 - 80 * E.cubicOut(q), { family: 'num', weight: 800, size: 40, color: P.acc, alpha: 1 - q, dir: 'ltr' }); }
    const bw = lerp(250, 290, dn), bh = 92, bx = x0 + 40, s2 = 1 - 0.08 * press;
    X.save(); X.translate(bx + bw / 2, y); X.scale(s2, s2);
    X.fillStyle = dn < 0.5 ? P.acc : 'rgba(128,128,128,.16)'; X.beginPath(); X.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2); X.fill();
    if (dn < 0.5) ctx.text(X, '+ ' + (o.label || 'متابعة'), 0, 15, { family: 'body', weight: 700, size: 42, color: onAcc(P), alpha: 1 - dn * 2, maxWidth: bw - 30 });
    else { ctx.text(X, o.done || 'تتابعه', 18, 15, { family: 'body', weight: 700, size: 42, color: P.ink, alpha: dn * 2 - 1, maxWidth: bw - 90 }); check(ctx, X, -bw / 2 + 44, 0, 34, at(t, tap + 0.2, tap + 0.45), P.acc, 7); }
    X.restore();
    finger(X, P, bx + bw * 0.6 + 120 * (1 - at(t, tap - 0.5, tap - 0.05, 'cubicOut')), y + 30 + 200 * (1 - at(t, tap - 0.5, tap - 0.05, 'cubicOut')) + 160 * at(t, tap + 0.3, tap + 0.7, 'cubicIn'), press, at(t, tap - 0.5, tap - 0.3) * (1 - at(t, tap + 0.4, tap + 0.7)));
    X.restore();
  };

  /* 118 اشترك والجرس — زر «اشترك» ينضغط ويصير «مشترك ✓»، وجنبه جرس يرن بموجات صوت ونقطة تنبيه. o: {text='اشترك', done='مشترك', s, tap=s+1.2, y=1250, out} */
  FX.subscribeBell = (ctx, t, o) => {
    const { X, P, at } = ctx, y = pick(o, 'y', 1250), tap = o.tap != null ? o.tap : o.s + 1.2;
    if (t < o.s) return; const fade = outK(ctx, t, o, 0.4); if (fade >= 1) return;
    const k = at(t, o.s, o.s + 0.45, 'backOut'), dn = at(t, tap + 0.05, tap + 0.3, 'expoOut'), press = Math.sin(Math.PI * pr(t, tap - 0.05, tap + 0.15)), bw = 470, bh = 130, bx = 640;
    X.save(); X.globalAlpha *= 1 - fade; X.translate(540, y); X.scale(Math.max(0, k), Math.max(0, k)); X.translate(-540, -y);
    X.save(); X.translate(bx, y); X.scale(1 - 0.07 * press, 1 - 0.07 * press);
    shd(X, 30, 12, 0.18); X.fillStyle = dn < 0.5 ? P.acc : mix(P.bg, P.mut, 0.35); X.beginPath(); X.roundRect(-bw / 2, -bh / 2, bw, bh, 26); X.fill(); noShd(X);
    if (dn < 0.5) ctx.text(X, o.text || 'اشترك', 0, 22, { family: 'display', size: 72, color: onAcc(P), alpha: 1 - 2 * dn });
    else { ctx.text(X, o.done || 'مشترك', 30, 22, { family: 'display', size: 66, color: P.ink, alpha: 2 * dn - 1 }); check(ctx, X, -bw / 2 + 70, 0, 44, at(t, tap + 0.2, tap + 0.45), P.ink, 9); }
    X.restore();
    const gx = 260, ring = t > tap + 0.25 ? Math.sin((t - tap - 0.25) * 30) * 0.5 * Math.exp(-(t - tap - 0.25) * 3.2) : 0, bk = at(t, o.s + 0.25, o.s + 0.6, 'backOut');
    X.save(); X.translate(gx, y); X.scale(bk, bk);
    X.fillStyle = card(P); shd(X, 24, 8, 0.15); X.beginPath(); X.arc(0, 0, 80, 0, TAU); X.fill(); noShd(X);
    X.save(); X.translate(0, -44); X.rotate(ring); X.translate(0, 44);
    icon(X, 'bell', 0, -4, 100, 0, Y => { Y.fillStyle = dn > 0.5 ? P.acc : P.ink; Y.fill(); });
    X.fillStyle = dn > 0.5 ? P.acc : P.ink; X.beginPath(); X.arc(0, 40, 11, 0, TAU); X.fill(); X.fillRect(-5, -60, 10, 14); X.restore();
    const wv = Math.abs(ring) > 0.05 ? cl(Math.abs(ring) * 2) : 0;
    if (wv > 0) [1, -1].forEach(sd => [0, 1].forEach(j => { X.save(); X.globalAlpha *= wv; X.strokeStyle = P.acc; X.lineWidth = 7; X.lineCap = 'round'; X.beginPath(); X.arc(0, -6, 66 + j * 22, sd > 0 ? -0.5 : Math.PI - 0.5, sd > 0 ? 0.5 : Math.PI + 0.5); X.stroke(); X.restore(); }));
    const dk = at(t, tap + 0.35, tap + 0.6, 'backOut'); if (dk > ON) { X.fillStyle = P.acc; X.strokeStyle = card(P); X.lineWidth = 6; X.beginPath(); X.arc(44, -48, 20 * dk, 0, TAU); X.fill(); X.stroke(); }
    X.restore();
    finger(X, P, bx + 80 + 140 * (1 - at(t, tap - 0.5, tap - 0.05, 'cubicOut')), y + 30 + 200 * (1 - at(t, tap - 0.5, tap - 0.05, 'cubicOut')) + 160 * at(t, tap + 0.3, tap + 0.7, 'cubicIn'), press, at(t, tap - 0.5, tap - 0.3) * (1 - at(t, tap + 0.4, tap + 0.7)));
    X.restore();
  };

  /* 119 لايك وتعليق وحفظ — صف أيقونات (قلب · تعليق · مشاركة · حفظ) على لوح زجاجي، كل وحدة تفرقع وتتلوّن والعدّاد يعد. o: {s, every=.4, counts=[12400,860,1200,3100], y=1380, labels, out} */
  FX.actionRow = (ctx, t, o) => {
    const { X, P, at, E } = ctx, y = pick(o, 'y', 1380), ev = o.every || 0.4, C = o.counts || [12400, 860, 1200, 3100], names = ['heart', 'bubble', 'share', 'bookmark'];
    if (t < o.s - 0.3) return; const fade = outK(ctx, t, o, 0.4); if (fade >= 1) return;
    const pk = at(t, o.s - 0.3, o.s + 0.1, 'cubicOut');
    X.save(); X.globalAlpha *= pk * (1 - fade); X.translate(0, 60 * (1 - pk));
    shd(X, 40, 14, 0.18); X.fillStyle = rgba(card(P), 0.94); X.beginPath(); X.roundRect(120, y - 115, 820, 230, 60); X.fill(); noShd(X);
    names.forEach((nm, i) => { const x = 840 - i * 200, t0 = o.s + i * ev, k = at(t, t0, t0 + 0.35, 'backOut'), on = at(t, t0 + 0.12, t0 + 0.3), s2 = 1 + 0.25 * Math.sin(Math.PI * pr(t, t0 + 0.12, t0 + 0.42));
      X.save(); X.translate(x, y - 22); X.scale(s2, s2);
      (IC[nm])(X, 76); X.lineWidth = 8; X.lineJoin = 'round'; X.strokeStyle = on > 0.5 ? P.acc : P.ink; X.stroke(); if (on > 0.5 && (nm === 'heart' || nm === 'bookmark')) { X.fillStyle = P.acc; X.fill(); }
      X.restore();
      if (nm === 'heart' && t > t0 + 0.12) { const q = pr(t, t0 + 0.12, t0 + 0.6); if (q < 1) for (let j = 0; j < 8; j++) { const a = j / 8 * TAU, r = 50 + 50 * E.cubicOut(q); X.fillStyle = j % 2 ? P.acc : (P.hi || P.acc); X.globalAlpha = (1 - q) * pk * (1 - fade); X.beginPath(); X.arc(x + Math.cos(a) * r, y - 22 + Math.sin(a) * r, 7 * (1 - q) + 2, 0, TAU); X.fill(); } X.globalAlpha = pk * (1 - fade); }
      const v = (C[i] || 0) * lerp(0.82, 1, at(t, t0, t0 + 0.9, 'expoOut'));
      ctx.text(X, (o.labels && o.labels[i]) || compact(ctx, v), x, y + 72, { family: 'num', weight: 700, size: 36, color: on > 0.5 ? P.acc : P.mut, dir: 'ltr', alpha: cl(k) }); });
    X.restore();
  };

  /* 120 الرابط بالبايو — كبسولة «الرابط بالبايو» بأيقونة سلسلة ولمعة تمر، وفوقها أسهم تنط لفوق (للبروفايل). o: {text='الرابط بالبايو', s, y=1150, out} */
  FX.linkInBio = (ctx, t, o) => {
    const { X, P, at } = ctx, y = pick(o, 'y', 1150), str = o.text || 'الرابط بالبايو';
    if (t < o.s) return; const fade = outK(ctx, t, o, 0.4); if (fade >= 1) return;
    const k = at(t, o.s, o.s + 0.45, 'backOut'), w = tw(ctx, X, str, 'display', 400, 74) + 200, h = 140;
    X.save(); X.globalAlpha *= 1 - fade;
    for (let j = 0; j < 3; j++) { const a = at(t, o.s + 0.3 + j * 0.12, o.s + 0.6 + j * 0.12), bob = Math.sin((t - o.s) * 5 - j * 0.9) * 12; if (a <= 0) continue;
      X.save(); X.globalAlpha *= a * (1 - j * 0.28); X.strokeStyle = P.acc; X.lineWidth = 16; X.lineCap = 'round'; X.lineJoin = 'round'; const yy = y - 150 - j * 70 + bob;
      X.beginPath(); X.moveTo(540 - 50, yy + 30); X.lineTo(540, yy - 16); X.lineTo(540 + 50, yy + 30); X.stroke(); X.restore(); }
    X.save(); X.translate(540, y); X.scale(Math.max(0, k), Math.max(0, k));
    shd(X, 36, 14, 0.22); X.fillStyle = P.acc; X.beginPath(); X.roundRect(-w / 2, -h / 2, w, h, h / 2); X.fill(); noShd(X);
    X.save(); X.beginPath(); X.roundRect(-w / 2, -h / 2, w, h, h / 2); X.clip(); const ph = ((t - o.s - 0.6) / 1.6) % 1;
    if (t > o.s + 0.6) { const sx = lerp(w / 2 + 100, -w / 2 - 100, ph), g = X.createLinearGradient(sx - 80, 0, sx + 80, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      X.fillStyle = g; X.save(); X.transform(1, 0, -0.4, 1, 0, 0); X.fillRect(sx - 80, -h, 160, h * 2); X.restore(); } X.restore();
    X.save(); X.translate(w / 2 - 80, 0); X.rotate(-Math.PI / 4); X.strokeStyle = onAcc(P); X.lineWidth = 9;
    X.beginPath(); X.roundRect(-34, -14, 40, 28, 14); X.stroke(); X.beginPath(); X.roundRect(-6, -14, 40, 28, 14); X.stroke(); X.restore();
    ctx.text(X, str, -30, 26, { family: 'display', size: 74, color: onAcc(P), maxWidth: w - 190 });
    X.restore(); X.restore();
  };

  /* 121 اكتب بالتعليقات — عنوان، تحته خانة تعليق تنكتب فيها الكلمة، زر الإرسال ينضغط، والتعليق ينزل فوقها بقلب. o: {label='اكتب بالتعليقات', word='أبي', s, y=1250, out} */
  FX.commentPrompt = (ctx, t, o) => {
    const { X, P, at } = ctx, y = pick(o, 'y', 1250), word = o.word || 'أبي', label = o.label === undefined ? 'اكتب بالتعليقات' : o.label;
    if (t < o.s) return; const fade = outK(ctx, t, o, 0.4); if (fade >= 1) return;
    const ty0 = o.s + 0.55, ty1 = ty0 + 0.16 * [...word].length + 0.1, send = ty1 + 0.25, posted = at(t, send + 0.1, send + 0.45, 'backOut');
    X.save(); X.globalAlpha *= 1 - fade;
    if (label) { const lk = at(t, o.s, o.s + 0.5, 'expoOut'); ctx.text(X, label, 540, y - 360 + 40 * (1 - lk), { family: 'display', size: 96, color: P.ink, alpha: lk, maxWidth: 880 }); }
    const k = at(t, o.s + 0.1, o.s + 0.5, 'expoOut'); X.save(); X.globalAlpha *= k; X.translate(0, 50 * (1 - k));
    shd(X, 30, 10, 0.14); X.fillStyle = card(P); X.beginPath(); X.roundRect(130, y - 62, 820, 124, 62); X.fill(); noShd(X);
    X.fillStyle = P.hi || P.acc; X.beginPath(); X.arc(880, y, 38, 0, TAU); X.fill();
    const sub = ctx.text.typeSub(word, pr(t, ty0, ty1));
    if (t < ty0) ctx.text(X, 'أضف تعليق…', 820, y + 14, { family: 'body', weight: 400, size: 42, align: 'right', color: P.mut });
    else if (t < send + 0.1) { ctx.text(X, sub, 820, y + 16, { family: 'body', weight: 700, size: 50, align: 'right', color: P.ink });
      if (Math.floor(t * 3) % 2 === 0 || t < ty1) { X.fillStyle = P.acc; X.fillRect(810 - tw(ctx, X, sub, 'body', 700, 50) - 14, y - 32, 5, 60); } }
    else ctx.text(X, 'أضف تعليق…', 820, y + 14, { family: 'body', weight: 400, size: 42, align: 'right', color: P.mut });
    const pr2 = Math.sin(Math.PI * pr(t, send - 0.05, send + 0.15)), sk = t >= ty1 ? 1 : 0.4;
    X.save(); X.translate(200, y); X.scale(1 - 0.12 * pr2, 1 - 0.12 * pr2); X.globalAlpha *= sk; X.fillStyle = P.acc; X.beginPath(); X.arc(0, 0, 44, 0, TAU); X.fill();
    X.fillStyle = onAcc(P); X.beginPath(); X.moveTo(-18, -18); X.lineTo(22, 0); X.lineTo(-18, 18); X.lineTo(-10, 0); X.closePath(); X.fill(); X.restore();
    X.restore();
    if (posted > ON) { const by = y - 170; X.save(); X.translate(820, by); X.scale(posted, posted); X.translate(-820, -by);
      const bw2 = tw(ctx, X, word, 'body', 700, 50) + 230; shd(X, 24, 8, 0.12); X.fillStyle = card(P); X.beginPath(); X.roundRect(930 - bw2, by - 52, bw2, 104, 30); X.fill(); noShd(X);
      X.fillStyle = P.hi || P.acc; X.beginPath(); X.arc(880, by, 30, 0, TAU); X.fill();
      ctx.text(X, word, 830, by + 17, { family: 'body', weight: 700, size: 50, align: 'right', color: P.ink });
      const hk = at(t, send + 0.6, send + 0.9, 'backOut'); icon(X, 'heart', 930 - bw2 + 50, by + 2, 46 * (0.6 + 0.4 * hk), 0, Y => { if (hk > 0.5) { Y.fillStyle = P.acc; Y.fill(); } else { Y.strokeStyle = P.mut; Y.lineWidth = 5; Y.stroke(); } });
      X.restore(); }
    X.restore();
  };

  /* 122 ستيكرات تفرقع — ستيكرات مرسومة (قلب · نجمة · نار · وجه مبتسم · برق · لمعة، أو كلمة) بإطار أبيض تفرقع حول الكلام بالتتابع. o: {items=['heart','star','fire','smile','bolt','sparkle'] (أو كلمة), s, every=.16, at:[[x,y]…], size=150, colors, out} */
  FX.stickerPop = (ctx, t, o) => {
    const { X, P } = ctx, items = o.items || ['heart', 'star', 'fire', 'smile', 'bolt', 'sparkle'], ev = o.every || 0.16, size = o.size || 150;
    const pos = o.at || [[790, 620], [270, 560], [830, 1160], [250, 1200], [560, 430], [600, 1330], [420, 860], [860, 880]];
    const cols = o.colors || [P.acc, P.hi || P.acc, P.clay || P.acc, P.ink];
    if (t < o.s) return; const fade = outK(ctx, t, o, 0.35); if (fade >= 1) return;
    items.forEach((it, i) => { const t0 = o.s + i * ev, dt = t - t0; if (dt <= 0) return;
      const k = sp(ctx, dt, 380, 13), p = pos[i % pos.length], rot = (ctx.hash01(i, 4) - 0.5) * 0.5 + (1 - Math.min(1, k)) * -0.8 + 0.04 * Math.sin(dt * 5 + i), s2 = size * (0.85 + 0.3 * ctx.hash01(i, 5)) * Math.max(0, k) * (1 - 0.6 * fade);
      if (s2 < 1) return; const col = cols[i % cols.length];
      X.save(); X.translate(p[0], p[1]); X.rotate(rot); X.globalAlpha *= 1 - fade;
      if (IC[it] || it === 'smile') {
        const shape = it === 'smile' ? 'circle' : it; shd(X, 22, 10, 0.25); X.lineJoin = 'round';
        (IC[shape])(X, s2); X.strokeStyle = '#FFFFFF'; X.lineWidth = s2 * 0.16; X.stroke(); X.fillStyle = '#FFFFFF'; X.fill(); noShd(X);
        (IC[shape])(X, s2); X.fillStyle = it === 'smile' ? (P.hi || P.acc) : col; X.fill();
        if (it === 'fire') { X.save(); X.scale(0.55, 0.55); X.translate(0, s2 * 0.25); IC.fire(X, s2); X.fillStyle = mix(P.hi || P.acc, '#FFFFFF', 0.35); X.fill(); X.restore(); }
        if (it === 'smile') { X.fillStyle = P.ink; [-1, 1].forEach(sd => { X.beginPath(); X.ellipse(sd * s2 * 0.15, -s2 * 0.08, s2 * 0.045, s2 * 0.075, 0, 0, TAU); X.fill(); });
          X.strokeStyle = P.ink; X.lineWidth = s2 * 0.05; X.lineCap = 'round'; X.beginPath(); X.arc(0, s2 * 0.02, s2 * 0.24, 0.35, Math.PI - 0.35); X.stroke(); }
        if (it === 'heart' || it === 'star') { X.fillStyle = 'rgba(255,255,255,.45)'; X.beginPath(); X.ellipse(-s2 * 0.14, -s2 * 0.2, s2 * 0.08, s2 * 0.045, -0.6, 0, TAU); X.fill(); }
      } else { const fsz = s2 * 0.56, w = tw(ctx, X, it, 'display', 400, fsz) + fsz * 0.8; shd(X, 22, 10, 0.25); X.fillStyle = '#FFFFFF'; X.beginPath(); X.roundRect(-w / 2 - 12, -fsz * 0.85, w + 24, fsz * 1.7, fsz * 0.5); X.fill(); noShd(X);
        X.fillStyle = col; X.beginPath(); X.roundRect(-w / 2, -fsz * 0.73, w, fsz * 1.46, fsz * 0.42); X.fill(); ctx.text(X, it, 0, fsz * 0.34, { family: 'display', size: fsz, color: col === P.ink ? P.bg : onAcc(P) }); }
      X.restore(); });
  };

  /* 123 قلوب تطير — قلوب تطلع من نقطة وتتمايل لفوق وتختفي (مثل البث المباشر). o: {s, dur=3, rate=7 (بالثانية), x=780, y=1500, rise=900, size=64, colors, out} */
  FX.heartsFloat = (ctx, t, o) => {
    const { X, P, E } = ctx, du = o.dur || 3, rate = o.rate || 7, x0 = pick(o, 'x', 780), y0 = pick(o, 'y', 1500), rise = o.rise || 900, size = o.size || 64, cols = o.colors || [P.acc, P.hi || P.acc, P.clay || P.acc];
    if (t < o.s) return; const n = Math.floor(du * rate), fade = outK(ctx, t, o, 0.5);
    for (let i = 0; i < n; i++) { const ti = o.s + i / rate + 0.08 * ctx.hash01(i, 1), life = 1.7 + 0.6 * ctx.hash01(i, 2), u = (t - ti) / life; if (u < 0 || u > 1) continue;
      const h = ctx.hash01(i, 3), yy = y0 - rise * E.cubicOut(u) * (0.75 + 0.35 * h), xx = x0 + Math.sin(u * Math.PI * (1.2 + h) + h * 6) * 60 * u + (ctx.hash01(i, 4) - 0.5) * 140 * u;
      const sc = E.backOut(cl(u / 0.15)) * (0.7 + 0.5 * ctx.hash01(i, 5)), al = (1 - cl((u - 0.6) / 0.4)) * (1 - fade);
      X.save(); X.globalAlpha *= al; X.translate(xx, yy); X.rotate(Math.sin(u * 6 + h * 9) * 0.25);
      icon(X, 'heart', 0, 0, size * sc, 0, Y => { Y.fillStyle = cols[i % cols.length]; Y.fill(); Y.strokeStyle = 'rgba(255,255,255,.85)'; Y.lineWidth = 4; Y.stroke(); }); X.restore(); }
  };

  /* 124 كونفيتي — انفجار قصاصات ملوّنة من نقطة (أو مدفعين من تحت) بجاذبية ومقاومة هوا ودوران. o: {s, at=[540,820], n=110, power=1, cannons=false, colors, out} */
  FX.confetti = (ctx, t, o) => {
    const { X, P } = ctx, n = o.n || 110, pw = o.power || 1, cols = o.colors || [P.acc, P.hi || P.acc, P.ink, P.clay || P.acc, '#FFFFFF'], g = 700, c = 2.0;
    if (t < o.s) return; const fade = outK(ctx, t, o, 0.5);
    const src = o.cannons ? [[150, 1560, -1.05], [930, 1560, -2.09]] : [[(o.at || [540, 820])[0], (o.at || [540, 820])[1], null]];
    for (let i = 0; i < n; i++) { const S = src[i % src.length], tau = t - o.s - 0.06 * ctx.hash01(i, 1); if (tau <= 0) continue;
      const a = S[2] == null ? -Math.PI / 2 + (ctx.hash01(i, 2) - 0.5) * 3.6 : S[2] + (ctx.hash01(i, 2) - 0.5) * 0.7, v = (S[2] == null ? 500 + 1000 * ctx.hash01(i, 3) : 1250 + 700 * ctx.hash01(i, 3)) * pw;
      const e = (1 - Math.exp(-c * tau)) / c, xx = S[0] + Math.cos(a) * v * e, yy = S[1] + (Math.sin(a) * v + g / c) * e - g * tau / c;
      const life = 2.6 + ctx.hash01(i, 4), al = (1 - cl((tau - life + 0.6) / 0.6)) * (1 - fade); if (al <= 0 || yy > 2000) continue;
      X.save(); X.globalAlpha *= al; X.translate(xx, yy); X.rotate(tau * (4 + 8 * ctx.hash01(i, 5)) * (ctx.hash01(i, 6) < 0.5 ? -1 : 1)); X.scale(1, Math.cos(tau * (6 + 6 * ctx.hash01(i, 7))));
      X.fillStyle = cols[i % cols.length]; if (ctx.hash01(i, 8) < 0.7) X.fillRect(-12, -7, 24, 14); else { X.beginPath(); X.arc(0, 0, 9, 0, TAU); X.fill(); } X.restore(); }
  };

  /* ═══ هـ) أرقام وبيانات 125–131 ═══ */

  /* 125 عد تنازلي — ٣ ٢ ١ كل رقم داخل حلقة تنقص مع الثانية، والرقم يفرقع، وبالآخر الكلمة تطلع بحلقة صدمة. o: {from=3, s, every=1, end='يلا!', y=920, r=250, out} */
  FX.countdown = (ctx, t, o) => {
    const { X, P, E } = ctx, from = o.from || 3, ev = o.every || 1, y = pick(o, 'y', 920), r = o.r || 250;
    if (t < o.s) return; const fade = outK(ctx, t, o, 0.35); if (fade >= 1) return;
    const idx = Math.floor((t - o.s) / ev), u = (t - o.s) / ev - idx;
    X.save(); X.globalAlpha *= 1 - fade;
    if (idx < from) { const num = from - idx, pop = E.expoOut(cl(u / 0.25)), outk = E.cubicIn(cl((u - 0.82) / 0.18));
      X.lineCap = 'round'; X.lineWidth = 34; X.strokeStyle = 'rgba(128,128,128,.2)'; X.beginPath(); X.arc(540, y, r, 0, TAU); X.stroke();
      X.strokeStyle = P.acc; X.beginPath(); X.arc(540, y, r, -Math.PI / 2, -Math.PI / 2 - TAU * (1 - u), true); X.stroke();
      for (let j = 0; j < 12; j++) { const a = j / 12 * TAU; X.fillStyle = P.mut; X.beginPath(); X.arc(540 + Math.cos(a) * (r - 60), y + Math.sin(a) * (r - 60), 5, 0, TAU); X.fill(); }
      X.save(); X.translate(540, y); const s2 = lerp(1.6, 1, pop) * (1 - 0.4 * outk); X.scale(s2, s2); ctx.text(X, String(num), 0, 95, { family: 'num', weight: 900, size: 270, color: P.ink, alpha: pop * (1 - outk), dir: 'ltr' }); X.restore();
    } else { const q = t - o.s - from * ev, k = E.backOut(cl(q / 0.35)), ring = cl(q / 0.6);
      if (ring < 1) { X.save(); X.globalAlpha *= 1 - ring; X.strokeStyle = P.acc; X.lineWidth = 30 * (1 - ring) + 4; X.beginPath(); X.arc(540, y, r * (0.9 + 0.8 * E.expoOut(ring)), 0, TAU); X.stroke(); X.restore();
        for (let j = 0; j < 12; j++) { const a = j / 12 * TAU + 0.13, r0 = r * (0.8 + 0.9 * E.expoOut(ring)); X.save(); X.globalAlpha *= 1 - ring; X.strokeStyle = j % 2 ? P.acc : P.ink; X.lineWidth = 10; X.lineCap = 'round'; X.beginPath(); X.moveTo(540 + Math.cos(a) * r0, y + Math.sin(a) * r0); X.lineTo(540 + Math.cos(a) * (r0 + 60), y + Math.sin(a) * (r0 + 60)); X.stroke(); X.restore(); } }
      X.save(); X.translate(540, y); X.scale(Math.max(0, k), Math.max(0, k)); ctx.text(X, o.end == null ? 'يلا!' : o.end, 0, 70, { family: 'display', size: 230, color: P.acc, maxWidth: 900 }); X.restore(); }
    X.restore();
  };

  /* 126 دائرة النسب — دونات تتعبّى قطعة قطعة (بالترتيب)، ولكل قطعة خط وتسمية ونسبتها، وبالنص رقم أو كلمة. o: {data:[[اسم, قيمة]], s, y=900, r=250, w=110, center, sub, colors, out} */
  FX.pieChart = (ctx, t, o) => {
    const { X, P, at } = ctx, D = o.data || [['أ', 50], ['ب', 30], ['ج', 20]], y = pick(o, 'y', 900), r = o.r || 220, wd = o.w || 100, cols = o.colors || [P.acc, P.ink, P.hi || P.mut, P.mut, P.clay || P.acc];
    if (t < o.s - 0.3) return; const fade = outK(ctx, t, o, 0.4); if (fade >= 1) return;
    const tot = D.reduce((a, d) => a + +d[1], 0) || 1, intro = at(t, o.s - 0.3, o.s, 'cubicOut');
    X.save(); X.globalAlpha *= intro * (1 - fade);
    X.lineWidth = wd; X.strokeStyle = 'rgba(128,128,128,.14)'; X.beginPath(); X.arc(540, y, r, 0, TAU); X.stroke();
    let a0 = -Math.PI / 2;
    D.forEach(([lab, v], i) => { const span = (+v / tot) * TAU, t0 = o.s + i * 0.35, k = at(t, t0, t0 + 0.6, 'cubicInOut'), g = D.length > 1 ? 0.025 : 0;
      if (k > 0) { X.strokeStyle = cols[i % cols.length]; X.lineWidth = wd * (1 + 0.08 * Math.sin(Math.PI * k)); X.beginPath(); X.arc(540, y, r, a0 + g, a0 + g + Math.max(0.001, (span - 2 * g) * k)); X.stroke();
        const la = at(t, t0 + 0.4, t0 + 0.8, 'expoOut'); if (la > 0) { const am = a0 + span / 2, ca = Math.cos(am), sa = Math.sin(am), r1 = r + wd / 2 + 16, r2 = r + wd / 2 + 70, side = ca >= 0 ? 1 : -1;
          const px = 540 + ca * r2, py = y + sa * r2, lw = Math.max(tw(ctx, X, ctx.num(Math.round(100 * v / tot)) + '%', 'num', 800, 54), Math.min(260, tw(ctx, X, lab, 'body', 700, 36))), ex = side > 0 ? Math.min(px + side * 40, 1020 - lw - 10) : Math.max(px + side * 40, 60 + lw + 10);
          X.save(); X.globalAlpha *= la; X.strokeStyle = P.mut; X.lineWidth = 4; X.beginPath(); X.moveTo(540 + ca * r1, y + sa * r1); X.lineTo(px, py); X.lineTo(ex, py); X.stroke();
          ctx.text(X, ctx.num(Math.round(100 * v / tot)) + '%', ex + side * 10, py + 4, { family: 'num', weight: 800, size: 54, align: side > 0 ? 'left' : 'right', color: cols[i % cols.length] === P.mut ? P.ink : cols[i % cols.length], dir: 'ltr' });
          ctx.text(X, lab, ex + side * 10, py + 52, { family: 'body', weight: 700, size: 36, align: side > 0 ? 'left' : 'right', color: P.ink, maxWidth: 260 }); X.restore(); } }
      a0 += span; });
    if (o.center != null) { const ck = at(t, o.s + 0.2, o.s + 0.7, 'backOut'); X.save(); X.translate(540, y); X.scale(Math.max(0, ck), Math.max(0, ck)); ctx.text(X, String(o.center), 0, o.sub ? 10 : 30, { family: 'display', size: 96, color: P.ink, maxWidth: r * 1.4 });
      if (o.sub) ctx.text(X, o.sub, 0, 70, { family: 'body', weight: 700, size: 38, color: P.mut, maxWidth: r * 1.4 }); X.restore(); }
    X.restore();
  };

  /* 127 مقارنة أعمدة — أعمدة أفقية تكبر من اليمين وأرقامها تعد، الفايز بلون الهوية، وبالآخر شارة الفرق (مثلاً ×3). o: {data:[[اسم, رقم]], s, y=760, gap=230, w=760, unit='', hi (الفايز), badge, out} */
  FX.compareBars = (ctx, t, o) => {
    const { X, P, at, E } = ctx, D = o.data || [['قبل', 20], ['بعد', 60]], y0 = pick(o, 'y', 760), gap = o.gap || 230, Wd = o.w || 760, mx = Math.max(...D.map(d => +d[1])) || 1;
    const hi = o.hi != null ? o.hi : D.findIndex(d => +d[1] === mx), xr = 920;
    if (t < o.s - 0.3) return; const fade = outK(ctx, t, o, 0.4); if (fade >= 1) return;
    X.save(); X.globalAlpha *= at(t, o.s - 0.3, o.s, 'cubicOut') * (1 - fade);
    D.forEach(([lab, v], i) => { const yy = y0 + i * gap, t0 = o.s + i * 0.3, k = E.quartOut(pr(t, t0, t0 + 1.1)), L = Wd * (+v / mx) * k, isH = i === hi;
      ctx.text(X, lab, xr, yy - 30, { family: 'body', weight: 700, size: 46, align: 'right', color: P.ink, maxWidth: 600 });
      X.fillStyle = 'rgba(128,128,128,.13)'; X.beginPath(); X.roundRect(xr - Wd, yy, Wd, 96, 48); X.fill();
      if (L > 1) { X.fillStyle = isH ? P.acc : P.mut; X.beginPath(); X.roundRect(xr - Math.max(L, 96), yy, Math.max(L, 96), 96, 48); X.fill(); }
      const val = ctx.num(Math.round(+v * k)) + (o.unit || ''), vw = tw(ctx, X, val, 'num', 800, 54), inside = L > vw + 80;
      ctx.text(X, val, inside ? xr - L + 40 : xr - Math.max(L, 96) - 24, yy + 67, { family: 'num', weight: 800, size: 54, align: inside ? 'left' : 'right', color: inside ? (isH ? onAcc(P) : '#FFFFFF') : P.ink, dir: 'ltr' }); });
    if (o.badge) { const t1 = o.s + D.length * 0.3 + 0.9, bk = at(t, t1, t1 + 0.4, 'backOut'); if (bk > ON) { X.save(); X.translate(220, y0 - 140); X.rotate(-0.12 + 0.12 * bk); X.scale(bk, bk);
      shd(X, 20, 8, 0.2); X.fillStyle = P.ink; IC.star8(X, 210); X.fill(); noShd(X); ctx.text(X, String(o.badge), 0, 24, { family: 'num', weight: 900, size: 68, color: P.bg, dir: 'ltr', maxWidth: 150 }); X.restore(); } }
    X.restore();
  };

  /* 128 ٧ من ١٠ — صفوف أشخاص (أيقونات)، أول k تتلوّن بالتتابع، وتحتها «٧ من ١٠» وتعريف. o: {k=7, n=10, s, cols=5, y=760, size=130, every=.12, label, out} */
  FX.iconArray = (ctx, t, o) => {
    const { X, P, at } = ctx, n = o.n || 10, kk = o.k == null ? 7 : o.k, cols = o.cols || 5, size = o.size || 130, y = pick(o, 'y', 760), ev = o.every || 0.12, cell = size * 1.25, rows = Math.ceil(n / cols);
    if (t < o.s - 0.4) return; const fade = outK(ctx, t, o, 0.4); if (fade >= 1) return;
    X.save(); X.globalAlpha *= 1 - fade;
    for (let i = 0; i < n; i++) { const c = i % cols, r = Math.floor(i / cols), x = 540 + ((cols - 1) / 2 - c) * cell, yy = y + (r - (rows - 1) / 2) * cell * 1.15;
      const ia = at(t, o.s - 0.4 + i * 0.02, o.s - 0.1 + i * 0.02, 'cubicOut'), on = i < kk ? at(t, o.s + 0.2 + i * ev, o.s + 0.45 + i * ev, 'backOut') : 0;
      X.save(); X.globalAlpha *= ia; X.translate(x, yy); X.scale(1 + 0.15 * Math.sin(Math.PI * cl(on)), 1 + 0.15 * Math.sin(Math.PI * cl(on)));
      IC.person(X, size); X.fillStyle = on > 0.5 ? P.acc : 'rgba(128,128,128,.28)'; X.fill(); X.restore(); }
    const lk = at(t, o.s + 0.3 + kk * ev, o.s + 0.8 + kk * ev, 'expoOut'), ly = y + rows * cell * 0.58 + 170;
    if (lk > 0) { ctx.text(X, ctx.num(kk) + ' من ' + ctx.num(n), 540, ly + 30 * (1 - lk), { family: 'display', size: 150, color: P.acc, alpha: lk });
      if (o.label) ctx.text(X, o.label, 540, ly + 100 + 30 * (1 - lk), { family: 'body', weight: 700, size: 56, color: P.ink, alpha: lk, maxWidth: 900 }); }
    X.restore();
  };

  /* 129 عداد سرعة — نص دائرة بشرطات، والإبرة تطير للقيمة بنطّة سبرنق، والقوس يتلوّن والرقم يعد. o: {value=82, max=100, s, y=1000, r=330, label, suffix='%', out} */
  FX.gauge = (ctx, t, o) => {
    const { X, P, at } = ctx, v = o.value == null ? 82 : +o.value, mx = o.max || 100, y = pick(o, 'y', 1000), r = o.r || 330;
    if (t < o.s - 0.3) return; const fade = outK(ctx, t, o, 0.4); if (fade >= 1) return;
    const intro = at(t, o.s - 0.3, o.s, 'cubicOut'), f = cl(v / mx) * Math.min(1.08, sp(ctx, t - o.s, 70, 7)), a = Math.PI + Math.PI * cl(f, 0, 1.04);
    X.save(); X.globalAlpha *= intro * (1 - fade);
    X.lineCap = 'round'; X.lineWidth = 50; X.strokeStyle = 'rgba(128,128,128,.16)'; X.beginPath(); X.arc(540, y, r, Math.PI, TAU); X.stroke();
    if (f > 0.003) { X.strokeStyle = P.acc; X.beginPath(); X.arc(540, y, r, Math.PI, Math.min(TAU, a)); X.stroke(); }
    for (let j = 0; j <= 10; j++) { const aa = Math.PI + Math.PI * j / 10, r0 = r - 60, r1 = r0 - (j % 5 ? 22 : 40); X.strokeStyle = j / 10 <= f ? P.ink : P.mut; X.lineWidth = j % 5 ? 5 : 9; X.beginPath(); X.moveTo(540 + Math.cos(aa) * r0, y + Math.sin(aa) * r0); X.lineTo(540 + Math.cos(aa) * r1, y + Math.sin(aa) * r1); X.stroke(); }
    X.save(); X.translate(540, y); X.rotate(a); X.fillStyle = P.ink; X.beginPath(); X.moveTo(0, -16); X.lineTo(r - 95, 0); X.lineTo(0, 16); X.closePath(); X.fill(); X.restore();
    X.fillStyle = P.ink; X.beginPath(); X.arc(540, y, 34, 0, TAU); X.fill(); X.fillStyle = P.acc; X.beginPath(); X.arc(540, y, 14, 0, TAU); X.fill();
    const suf = o.suffix === undefined ? '%' : o.suffix; ctx.text(X, ctx.num(Math.round(v * cl(f / (v / mx || 1)))) + suf, 540, y + 170, { family: 'num', weight: 900, size: 130, color: P.ink, dir: 'ltr' });
    if (o.label) ctx.text(X, o.label, 540, y + 260, { family: 'body', weight: 700, size: 56, color: P.mut, maxWidth: 900, alpha: at(t, o.s + 0.6, o.s + 1.1) });
    X.restore();
  };

  /* 130 ترتيب يتبدل — قائمة مرتبة (١، ٢، ٣…) وبعدين عنصر يطلع ويتخطى اللي فوقه لمكانه الجديد، بسهم «+٣». o: {items:[[اسم, قيمة]], move:[من, إلى], s, at=s+1.2, y=560, gap=160, out} */
  FX.rankSwap = (ctx, t, o) => {
    const { X, P, at, E } = ctx, I = o.items || [['أ', 90], ['ب', 80], ['ج', 70], ['د', 60]], n = I.length, mv = o.move || [n - 1, 0], ta = o.at != null ? o.at : o.s + 1.2, y0 = pick(o, 'y', 560), gap = o.gap || 160;
    if (t < o.s - 0.2) return; const fade = outK(ctx, t, o, 0.4); if (fade >= 1) return;
    const fin = [...Array(n).keys()]; fin.splice(mv[0], 1); fin.splice(mv[1], 0, mv[0]);
    const k = E.cubicInOut(pr(t, ta, ta + 0.9)), lift = Math.sin(Math.PI * k);
    X.save(); X.globalAlpha *= 1 - fade;
    for (let s2 = 0; s2 < n; s2++) { const yy = y0 + s2 * gap, a = at(t, o.s - 0.2 + s2 * 0.08, o.s + 0.2 + s2 * 0.08, 'cubicOut'); X.save(); X.globalAlpha *= a;
      X.fillStyle = s2 === 0 ? P.acc : P.ink; X.beginPath(); X.arc(880, yy, 44, 0, TAU); X.fill(); ctx.text(X, String(s2 + 1), 880, yy + 18, { family: 'num', weight: 800, size: 50, color: s2 === 0 ? onAcc(P) : P.bg, dir: 'ltr' }); X.restore(); }
    const order = [...Array(n).keys()].sort((a, b) => (a === mv[0]) - (b === mv[0]));
    order.forEach(i => { const p0 = i, p1 = fin.indexOf(i), isM = i === mv[0], yy = y0 + lerp(p0, p1, k) * gap, a = E.expoOut(pr(t, o.s - 0.2 + i * 0.08, o.s + 0.4 + i * 0.08));
      X.save(); X.globalAlpha *= cl(a); X.translate((1 - a) * 300 - (isM ? 50 * lift : 0), yy); if (isM) X.scale(1 + 0.05 * lift, 1 + 0.05 * lift);
      shd(X, isM ? 40 * lift + 10 : 10, isM ? 18 * lift + 4 : 4, 0.16); X.fillStyle = isM && t > ta - 0.3 ? P.acc : card(P); X.beginPath(); X.roundRect(200, -56, 620, 112, 30); X.fill(); noShd(X);
      const fg = isM && t > ta - 0.3 ? onAcc(P) : P.ink;
      ctx.text(X, I[i][0], 780, 16, { family: 'body', weight: 700, size: 48, align: 'right', color: fg, maxWidth: 420 });
      if (I[i][1] != null) ctx.text(X, String(I[i][1]), 240, 16, { family: 'num', weight: 800, size: 44, align: 'left', color: fg, dir: 'ltr' });
      X.restore(); });
    const bk = at(t, ta + 0.85, ta + 1.2, 'backOut'); if (bk > ON) { const yy = y0 + mv[1] * gap, d = mv[0] - mv[1]; X.save(); X.translate(135, yy - 6); X.scale(bk, bk);
      X.fillStyle = P.acc; X.beginPath(); X.moveTo(-28, 0); X.lineTo(0, -40); X.lineTo(28, 0); X.closePath(); X.fill(); ctx.text(X, (d > 0 ? '+' : '') + d, 0, 50, { family: 'num', weight: 800, size: 40, color: P.acc, dir: 'ltr' }); X.restore(); }
    X.restore();
  };

  /* 131 تحميل — شريط تحميل يتعبّى من اليمين بخطوط تمشي، يعلق على ٩٩٪ ويرجف، ثم يكمل ويطلع «تم ✓». o: {label='جاري التحميل…', done='تم!', s, dur=2.2, y=960, stall=true, out} */
  FX.loadingBar = (ctx, t, o) => {
    const { X, P, at, E } = ctx, du = o.dur || 2.2, y = pick(o, 'y', 960), Wd = 760, h = 56, xr = 540 + Wd / 2;
    if (t < o.s - 0.3) return; const fade = outK(ctx, t, o, 0.4); if (fade >= 1) return;
    const stall = o.stall !== false, p = stall ? (t < o.s + du ? 0.99 * E.expoOut(pr(t, o.s, o.s + du * 0.6)) : lerp(0.99, 1, pr(t, o.s + du, o.s + du + 0.12))) : E.cubicInOut(pr(t, o.s, o.s + du));
    const done = at(t, o.s + du + 0.15, o.s + du + 0.5, 'backOut'), bar = 1 - at(t, o.s + du + 0.1, o.s + du + 0.35), shake = stall && t > o.s + du * 0.62 && t < o.s + du ? 6 * Math.sin(t * 70) * pr(t, o.s + du * 0.62, o.s + du) : 0;
    X.save(); X.globalAlpha *= at(t, o.s - 0.3, o.s, 'cubicOut') * (1 - fade);
    if (bar > 0) { X.save(); X.globalAlpha *= bar; X.translate(shake, 0);
      ctx.text(X, o.label || 'جاري التحميل…', xr, y - 60, { family: 'body', weight: 700, size: 50, align: 'right', color: P.ink });
      ctx.text(X, ctx.num(Math.floor(p * 100)) + '%', xr - Wd, y - 60, { family: 'num', weight: 800, size: 50, align: 'left', color: p >= 0.99 && p < 1 ? P.acc : P.ink, dir: 'ltr' });
      X.fillStyle = 'rgba(128,128,128,.18)'; X.beginPath(); X.roundRect(xr - Wd, y, Wd, h, h / 2); X.fill();
      const fw = Math.max(h, Wd * p); X.save(); X.beginPath(); X.roundRect(xr - fw, y, fw, h, h / 2); X.clip(); X.fillStyle = P.acc; X.fillRect(xr - fw, y, fw, h);
      X.fillStyle = 'rgba(255,255,255,.22)'; for (let s2 = -2; s2 < 30; s2++) { const xx = xr - fw + ((s2 * 60 + (t * 120) % 60)); X.beginPath(); X.moveTo(xx, y); X.lineTo(xx + 30, y); X.lineTo(xx + 10, y + h); X.lineTo(xx - 20, y + h); X.closePath(); X.fill(); } X.restore();
      X.restore(); }
    if (done > ON) { X.save(); X.translate(540, y + 20); X.scale(done, done); X.fillStyle = P.acc; X.beginPath(); X.arc(0, -40, 90, 0, TAU); X.fill(); check(ctx, X, 0, -40, 80, at(t, o.s + du + 0.3, o.s + du + 0.6), onAcc(P), 14);
      ctx.text(X, o.done || 'تم!', 0, 150, { family: 'display', size: 110, color: P.ink }); X.restore(); }
    X.restore();
  };

  /* ═══ و) كروت ومعلومة 132–141 ═══ */

  /* 132 قائمة مرقمة — كل نقطة تطلع برقم كبير مفرّغ يتعبّى، والنقطة الحالية واضحة واللي قبلها تخف، وخط فاصل يرتسم. o: {items[], s, every=.9, at:[t…], x=920 (حافة اليمين), y=520, gap=210, size=64, out} */
  FX.numberedList = (ctx, t, o) => {
    const { X, P, at } = ctx, N = o.items || [], ev = o.every || 0.9, xr = pick(o, 'x', 920), y0 = pick(o, 'y', 520), gap = o.gap || 210, size = o.size || 64;
    const T = i => (o.at ? o.at[i] : o.s + i * ev); if (t < T(0) - 0.1) return; const fade = outK(ctx, t, o, 0.4); if (fade >= 1) return;
    let cur = -1; N.forEach((_, i) => { if (t >= T(i)) cur = i; });
    X.save(); X.globalAlpha *= 1 - fade;
    N.forEach((it, i) => { const t0 = T(i), k = at(t, t0, t0 + 0.5, 'expoOut'); if (k <= 0) return;
      const yy = y0 + i * gap, dim = i < cur ? 0.45 + 0.55 * (1 - at(t, T(cur), T(cur) + 0.3)) : 1, fill = at(t, t0 + 0.15, t0 + 0.45);
      X.save(); X.globalAlpha *= dim * k;
      const ns = String(i + 1); ctx.text(X, ns, xr - 40, yy + 46 - 40 * (1 - k), { family: 'num', weight: 900, size: 140, align: 'right', dir: 'ltr', color: fill > 0.5 && i === cur ? P.acc : null, stroke: { width: 5, color: P.acc } });
      ctx.text(X, it, xr - 170 + 60 * (1 - k), yy + 20, { family: 'body', weight: 700, size, align: 'right', color: P.ink, maxWidth: xr - 170 - 140 });
      const lk = at(t, t0 + 0.2, t0 + 0.7, 'cubicInOut'); X.fillStyle = rgba(P.ink, 0.15); X.fillRect(xr - (xr - 140) * lk, yy + 85, (xr - 140) * lk, 3);
      X.restore(); });
    X.restore();
  };

  /* 133 اقتباس — كرت باقتباس: علامات تنصيص كبيرة تفرقع، الكلام يطلع كلمة كلمة، وخط جانبي بلون الهوية، واسم القائل تحت. o: {text, author, s, step=.11, y=960, size=74, out} */
  FX.quoteCard = (ctx, t, o) => {
    const { X, P, at, E } = ctx, size = o.size || 74, step = o.step || 0.11, cy = pick(o, 'y', 960);
    if (t < o.s) return; const fade = outK(ctx, t, o, 0.4); if (fade >= 1) return;
    const L = ctx.text.layout(X, o.text || '', { family: 'body', weight: 700, size, maxWidth: 740, lineHeight: 1.45 }), h = L.height + (o.author ? 330 : 260), top = cy - h / 2;
    const k = E.expoOut(pr(t, o.s, o.s + 0.6));
    X.save(); X.globalAlpha *= k * (1 - fade); X.translate(0, 80 * (1 - k));
    shd(X, 50, 18, 0.18); X.fillStyle = card(P); X.beginPath(); X.roundRect(100, top, 880, h, 44); X.fill(); noShd(X);
    const bar = at(t, o.s + 0.2, o.s + 0.8, 'expoOut'); X.fillStyle = P.acc; X.beginPath(); X.roundRect(950, top + 50, 12, (h - 100) * bar, 6); X.fill();
    const qk = at(t, o.s + 0.2, o.s + 0.55, 'backOut'); if (qk > ON) { X.save(); X.translate(860, top + 64); X.rotate(-0.15 * (1 - qk)); X.scale(qk, qk); X.fillStyle = P.acc;
      [0, -66].forEach(dx => { X.beginPath(); X.arc(dx, 0, 26, 0, TAU); X.fill(); X.beginPath(); X.moveTo(dx + 26, 0); X.quadraticCurveTo(dx + 26, 50, dx - 14, 64); X.quadraticCurveTo(dx + 6, 40, dx - 2, 24); X.closePath(); X.fill(); }); X.restore(); }
    ctx.text.drawLayout(X, L, 900, top + 150 + size * 0.5, { align: 'right', perWord: i => { const q = E.cubicOut(pr(t, o.s + 0.45 + i * step, o.s + 0.75 + i * step)); return { alpha: q, dy: 20 * (1 - q), color: P.ink }; } });
    if (o.author) { const ak = at(t, o.s + 0.6 + L.words.length * step, o.s + 1.0 + L.words.length * step, 'expoOut');
      ctx.text(X, '— ' + o.author, 900 - 30 * (1 - ak), top + h - 70, { family: 'body', weight: 700, size: 44, align: 'right', color: P.mut, alpha: ak }); }
    X.restore();
  };

  /* 134 دبوس الخريطة — خريطة مرسومة (شوارع وحدايق ونهر) تقرّب شوي، الدبوس يطيح وينط مع ظله وموجات، وفوقه كرت المكان. o: {place, sub, s, at=[540,880], out} */
  FX.mapPin = (ctx, t, o) => {
    const { X, P, at, E } = ctx, pp = o.at || [540, 880], R = { x: 60, y: 400, w: 960, h: 1000 };
    if (t < o.s - 0.4) return; const fade = outK(ctx, t, o, 0.4); if (fade >= 1) return;
    const mk = at(t, o.s - 0.4, o.s + 0.1, 'cubicOut'), z = 1 + 0.12 * at(t, o.s, o.s + 3.5, 'sineInOut');
    X.save(); X.globalAlpha *= mk * (1 - fade);
    X.save(); shd(X, 40, 16, 0.18); X.fillStyle = mix(P.bg, '#FFFFFF', 0.5); X.beginPath(); X.roundRect(R.x, R.y, R.w, R.h, 48); X.fill(); noShd(X);
    X.beginPath(); X.roundRect(R.x, R.y, R.w, R.h, 48); X.clip(); zoomAt(X, pp, z);
    for (let i = 0; i < 9; i++) { X.fillStyle = rgba(P.hi || P.acc, 0.2); const bx = R.x + 60 + ctx.hash01(i, 1) * 820, by = R.y + 60 + ctx.hash01(i, 2) * 860; X.beginPath(); X.roundRect(bx, by, 80 + 100 * ctx.hash01(i, 3), 60 + 90 * ctx.hash01(i, 4), 16); X.fill(); }
    X.strokeStyle = rgba(P.mut, 0.35); X.lineWidth = 60; X.beginPath(); X.moveTo(R.x - 50, R.y + 760); X.bezierCurveTo(R.x + 300, R.y + 620, R.x + 600, R.y + 980, R.x + 1010, R.y + 820); X.stroke();
    X.strokeStyle = '#FFFFFF'; X.lineCap = 'round';
    for (let i = 0; i < 7; i++) { X.lineWidth = i % 3 ? 10 : 22; const xx = R.x + 40 + i * 150 + 20 * ctx.noise1(i, 3); X.beginPath(); X.moveTo(xx, R.y - 20); X.lineTo(xx + 60 * ctx.noise1(i, 4), R.y + R.h + 20); X.stroke(); }
    for (let i = 0; i < 7; i++) { X.lineWidth = i % 3 ? 10 : 22; const yy = R.y + 60 + i * 150 + 20 * ctx.noise1(i, 5); X.beginPath(); X.moveTo(R.x - 20, yy); X.lineTo(R.x + R.w + 20, yy + 80 * ctx.noise1(i, 6)); X.stroke(); }
    X.restore();
    const dt = t - o.s - 0.2, land = 0.35, dropK = E.cubicIn(cl(dt / land)), bounce = dt > land ? -60 * Math.exp(-(dt - land) * 7) * Math.abs(Math.sin((dt - land) * 14)) : 0, hy = dt < land ? -520 * (1 - dropK) : bounce;
    if (dt > 0) { const ps = 110;
      X.fillStyle = 'rgba(0,0,0,' + (0.25 * (1 - Math.min(1, -hy / 520))).toFixed(3) + ')'; X.beginPath(); X.ellipse(pp[0], pp[1], 34 * (1 - 0.5 * Math.min(1, -hy / 520)), 12, 0, 0, TAU); X.fill();
      if (dt > land) for (let j = 0; j < 2; j++) { const q = ((dt - land) / 1.4 + j * 0.5) % 1; X.save(); X.globalAlpha *= (1 - q) * 0.7; X.strokeStyle = P.acc; X.lineWidth = 6; X.beginPath(); X.ellipse(pp[0], pp[1], 40 + 120 * q, (40 + 120 * q) * 0.38, 0, 0, TAU); X.stroke(); X.restore(); }
      X.save(); X.translate(pp[0], pp[1] + hy - ps * 0.5); const sq = dt > land && dt < land + 0.12 ? 1 - 0.15 * Math.sin(Math.PI * (dt - land) / 0.12) : 1; X.scale(2 - sq, sq);
      shd(X, 16, 8, 0.25); IC.pin(X, ps); X.fillStyle = P.acc; X.fill(); noShd(X); X.fillStyle = '#FFFFFF'; X.beginPath(); X.arc(0, -ps * 0.16, ps * 0.14, 0, TAU); X.fill(); X.restore(); }
    const ck = at(t, o.s + 0.75, o.s + 1.1, 'backOut'); if (ck > ON && o.place) { const w = Math.max(tw(ctx, X, o.place, 'body', 700, 54), o.sub ? tw(ctx, X, o.sub, 'body', 400, 36) : 0) + 80, h = o.sub ? 150 : 100, cy = pp[1] - 190 - h / 2;
      X.save(); X.translate(pp[0], cy + h / 2); X.scale(ck, ck); X.translate(-pp[0], -(cy + h / 2)); shd(X, 30, 10, 0.2); X.fillStyle = card(P); X.beginPath(); X.roundRect(pp[0] - w / 2, cy, w, h, 28); X.fill();
      X.beginPath(); X.moveTo(pp[0] - 18, cy + h - 1); X.lineTo(pp[0], cy + h + 20); X.lineTo(pp[0] + 18, cy + h - 1); X.fill(); noShd(X);
      ctx.text(X, o.place, pp[0], cy + (o.sub ? 66 : 66), { family: 'body', weight: 700, size: 54, color: P.ink, maxWidth: 860 });
      if (o.sub) ctx.text(X, o.sub, pp[0], cy + 118, { family: 'body', weight: 400, size: 36, color: P.mut, maxWidth: 860 }); X.restore(); }
    X.restore();
  };

  /* 135 محادثة — فقاعات رسايل تطلع وحدة وحدة (قبل ردّهم «يكتب…» بثلاث نقاط)، والقديمة تنزاح لفوق. اتجاه عربي: رسايلك يسار بلون الهوية، ردّهم يمين.
     o: {msgs:[['me'|'them', نص]], s, every=1, at:[t…], y=1380 (أسفل المحادثة), w=680, size=56, out} */
  FX.chatThread = (ctx, t, o) => {
    const { X, P, E } = ctx, M = o.msgs || [], ev = o.every || 1, yb = pick(o, 'y', 1380), Wd = o.w || 680, size = o.size || 56;
    const T = i => (o.at ? o.at[i] : o.s + i * ev); if (t < T(0) - 0.8) return; const fade = outK(ctx, t, o, 0.4); if (fade >= 1) return;
    const items = M.map(([who, str], i) => { const L = ctx.text.layout(X, str, { family: 'body', weight: 700, size, maxWidth: Wd - 70, lineHeight: 1.35 }); return { who, L, w: L.width + 70, h: L.height + 52, t0: T(i) }; });
    const typing = items.findIndex((m, i) => m.who !== 'me' && t >= m.t0 - 0.75 && t < m.t0);
    X.save(); X.globalAlpha *= 1 - fade;
    let yy = yb;
    if (typing >= 0) { const q = E.backOut(pr(t, items[typing].t0 - 0.75, items[typing].t0 - 0.55)); yy -= 110 * q;
      X.save(); X.translate(900 - 80, yb - 50); X.scale(q, q); X.fillStyle = card(P); shd(X, 20, 6, 0.12); X.beginPath(); X.roundRect(-80, -45, 160, 90, 45); X.fill(); noShd(X);
      for (let j = 0; j < 3; j++) { const b = Math.sin(t * 9 - j * 0.9); X.fillStyle = P.mut; X.beginPath(); X.arc(-36 + j * 36, -4 * Math.max(0, b), 11, 0, TAU); X.fill(); } X.restore(); }
    for (let i = items.length - 1; i >= 0; i--) { const m = items[i], k = E.backOut(pr(t, m.t0, m.t0 + 0.35)), kk = E.expoOut(pr(t, m.t0, m.t0 + 0.3)); if (t < m.t0) continue;
      const me = m.who === 'me', x0 = me ? 180 : 900 - m.w, top = yy - m.h * kk - 24 * kk; yy = top;
      if (top + m.h < 260) continue; const ax = me ? x0 : x0 + m.w, ay = top + m.h;
      X.save(); X.globalAlpha *= cl(kk) * cl((top + m.h - 260) / 120); X.translate(ax, ay); X.scale(Math.max(0, k), Math.max(0, k)); X.translate(-ax, -ay);
      shd(X, 20, 6, 0.12); X.fillStyle = me ? P.acc : card(P); X.beginPath(); X.roundRect(x0, top, m.w, m.h, [34, 34, me ? 34 : 8, me ? 8 : 34]); X.fill(); noShd(X);
      ctx.text.drawLayout(X, m.L, x0 + m.w - 35, top + 26 + size * 0.95, { align: 'right', color: me ? onAcc(P) : P.ink }); X.restore(); }
    X.restore();
  };

  /* 136 مكالمة واردة — شاشة مكالمة (صورة بحلقات نبض، اسم، «مكالمة واردة…»، زرين) والقبول يتهزهز؛ وقت answer يرد وتتقلص لكبسولة فوق بعدّاد. o: {name, sub='مكالمة واردة…', s, answer, y=700, out} */
  FX.incomingCall = (ctx, t, o) => {
    const { X, P, at, E } = ctx, y = pick(o, 'y', 700), ans = o.answer;
    if (t < o.s) return; const fade = outK(ctx, t, o, 0.4); if (fade >= 1) return;
    const k = sp(ctx, t - o.s, 200, 22), sh = ans != null ? E.expoInOut(pr(t, ans + 0.2, ans + 0.75)) : 0, dark = mix(deep(P), '#000000', 0.3), lite = lighter(P.ink, P.bg);
    X.save(); X.globalAlpha *= 1 - fade;
    if (sh < 1) { X.save(); X.globalAlpha *= cl(k) * (1 - sh); X.fillStyle = 'rgba(0,0,0,.35)'; X.fillRect(0, 0, 1080, 1920); X.restore(); }
    const R = { x: lerp(90, 270, sh), y: lerp(y - 360, 200, sh) - (1 - Math.min(1, k)) * 900, w: lerp(900, 540, sh), h: lerp(1080, 110, sh) };
    shd(X, 50, 20, 0.35); X.fillStyle = dark; X.beginPath(); X.roundRect(R.x, R.y, R.w, R.h, lerp(64, 55, sh)); X.fill(); noShd(X);
    if (sh < 0.5) { const a = 1 - sh * 2, cx = 540, cy = R.y + 330; X.save(); X.globalAlpha *= a;
      for (let j = 0; j < 3; j++) { const q = ((t - o.s) / 1.6 + j / 3) % 1; X.strokeStyle = rgba(P.acc, 0.6 * (1 - q)); X.lineWidth = 6; X.beginPath(); X.arc(cx, cy, 120 + 110 * q, 0, TAU); X.stroke(); }
      const g = X.createLinearGradient(cx - 120, cy - 120, cx + 120, cy + 120); g.addColorStop(0, P.acc); g.addColorStop(1, P.hi || P.acc); X.fillStyle = g; X.beginPath(); X.arc(cx, cy, 120, 0, TAU); X.fill();
      ctx.text(X, [...(o.name || '؟')][0], cx, cy + 40, { family: 'display', size: 130, color: onAcc(P) });
      ctx.text(X, o.name || '', cx, cy + 250, { family: 'display', size: 88, color: lite, maxWidth: 760 });
      ctx.text(X, o.sub || 'مكالمة واردة…', cx, cy + 320, { family: 'body', weight: 400, size: 42, color: rgba(lite, 0.6) });
      const by = R.y + R.h - 170, press = ans != null ? Math.sin(Math.PI * pr(t, ans - 0.05, ans + 0.2)) : 0;
      X.save(); X.translate(330, by); X.fillStyle = mix(P.mut, dark, 0.3); X.beginPath(); X.arc(0, 0, 78, 0, TAU); X.fill(); X.rotate(Math.PI * 0.75); X.strokeStyle = lite; X.lineWidth = 16; X.lineCap = 'round'; X.beginPath(); X.arc(0, 12, 34, Math.PI * 1.15, Math.PI * 1.85); X.stroke(); X.restore();
      X.save(); X.translate(750, by); X.rotate(ans != null && t > ans - 0.1 ? 0 : 0.25 * Math.sin((t - o.s) * 18) * (Math.sin((t - o.s) * 3) > 0 ? 1 : 0)); X.scale(1 - 0.1 * press, 1 - 0.1 * press);
      X.fillStyle = P.acc; X.beginPath(); X.arc(0, 0, 78, 0, TAU); X.fill(); X.rotate(-Math.PI * 0.25); X.strokeStyle = onAcc(P); X.lineWidth = 16; X.lineCap = 'round'; X.beginPath(); X.arc(0, 12, 34, Math.PI * 1.15, Math.PI * 1.85); X.stroke(); X.restore();
      ctx.text(X, 'رفض', 330, by + 130, { family: 'body', weight: 700, size: 36, color: rgba(lite, 0.7) }); ctx.text(X, 'رد', 750, by + 130, { family: 'body', weight: 700, size: 36, color: rgba(lite, 0.7) });
      X.restore(); }
    if (sh > 0.6) { const a = (sh - 0.6) / 0.4, secs = Math.max(0, Math.floor(t - ans - 0.6)); X.save(); X.globalAlpha *= a;
      X.fillStyle = P.acc; X.beginPath(); X.arc(R.x + R.w - 55, R.y + 55, 16 + 3 * Math.sin(t * 6), 0, TAU); X.fill();
      ctx.text(X, o.name || '', R.x + R.w - 95, R.y + 70, { family: 'body', weight: 700, size: 42, align: 'right', color: lite, maxWidth: 260 });
      ctx.text(X, '00:' + String(secs).padStart(2, '0'), R.x + 50, R.y + 70, { family: 'num', weight: 700, size: 42, align: 'left', color: lite, dir: 'ltr' }); X.restore(); }
    X.restore();
  };

  /* 137 تعريف بكبسولة — كبسولة زجاجية فيها صورة دائرية ثم تتمدد للاسم والمعرّف وشارة نجمة صغيرة (تحت يمين، داخل المنطقة الآمنة). o: {name, handle, s, out, y=1430, x=920, badge=true, avatar:(Y,R)=>{}} */
  FX.handleTag = (ctx, t, o) => {
    const { X, P, at, E } = ctx, y = pick(o, 'y', 1430), xr = pick(o, 'x', 920), h = 150;
    if (t < o.s) return; const ko = o.out != null ? E.expoIn(pr(t, o.out, o.out + 0.5)) : 0; if (ko >= 1) return;
    const k0 = at(t, o.s, o.s + 0.35, 'backOut') * (1 - (o.out != null ? E.expoIn(pr(t, o.out + 0.3, o.out + 0.6)) : 0)), kw = E.expoOut(pr(t, o.s + 0.25, o.s + 0.85)) * (1 - ko);
    const tw1 = Math.max(tw(ctx, X, o.name || '', 'body', 700, 52), o.handle ? tw(ctx, X, o.handle, 'body', 400, 34) : 0) + (o.badge !== false ? 70 : 0), full = Math.min(800, h + tw1 + 70), w = lerp(h, full, kw);
    X.save(); X.translate(xr - h / 2, y); X.scale(Math.max(0, k0), Math.max(0, k0)); X.translate(-(xr - h / 2), -y);
    shd(X, 36, 12, 0.22); X.fillStyle = rgba(card(P), 0.95); X.beginPath(); X.roundRect(xr - w, y - h / 2, w, h, h / 2); X.fill(); noShd(X);
    const ax = xr - h / 2, r = 56; X.save(); X.beginPath(); X.arc(ax, y, r, 0, TAU); X.clip();
    if (o.avatar) o.avatar(X, { x: ax - r, y: y - r, w: r * 2, h: r * 2 }); else { X.fillStyle = P.acc; X.fillRect(ax - r, y - r, r * 2, r * 2); ctx.text(X, [...(o.name || '؟')][0], ax, y + 24, { family: 'display', size: 64, color: onAcc(P) }); } X.restore();
    X.save(); X.beginPath(); X.rect(xr - w + 20, y - h / 2, w - h - 10, h); X.clip(); const tx = xr - h - 10 + 40 * (1 - kw);
    ctx.text(X, o.name || '', tx, y + (o.handle ? -6 : 16), { family: 'body', weight: 700, size: 52, align: 'right', color: P.ink });
    if (o.handle) ctx.text(X, o.handle, tx, y + 44, { family: 'body', weight: 400, size: 34, align: 'right', dir: 'ltr', color: P.mut });
    if (o.badge !== false) { const bx = tx - tw(ctx, X, o.name || '', 'body', 700, 52) - 34, bk = at(t, o.s + 0.7, o.s + 1.0, 'backOut'); X.save(); X.translate(bx, y - 22); X.scale(bk, bk); X.rotate(t * 0.6);
      IC.star(X, 46, 10, 0.78); X.fillStyle = P.acc; X.fill(); X.restore(); if (bk > 0.5) check(ctx, X, bx, y - 22, 20, at(t, o.s + 0.85, o.s + 1.05), onAcc(P), 5); }
    X.restore(); X.restore();
  };

  /* 138 مفاتيح تشتغل — قائمة إعدادات: كل سطر مفتاح يتحول من «طافي» لـ«شغّال» بسبرنق ولون الهوية (اتجاه عربي: الشغّال يسار). o: {items[], s, every=.5, y=700, gap=170, off:[i] (تبقى طافية), out} */
  FX.toggleSwitch = (ctx, t, o) => {
    const { X, P, at } = ctx, N = o.items || [], ev = o.every || 0.5, y0 = pick(o, 'y', 700), gap = o.gap || 170;
    if (t < o.s - 0.4) return; const fade = outK(ctx, t, o, 0.4); if (fade >= 1) return;
    X.save(); X.globalAlpha *= 1 - fade;
    N.forEach((it, i) => { const yy = y0 + i * gap, a = at(t, o.s - 0.4 + i * 0.08, o.s + i * 0.08, 'cubicOut'), t0 = o.s + 0.3 + i * ev, on = (o.off || []).includes(i) ? 0 : Math.min(1.1, sp(ctx, t - t0, 300, 18));
      X.save(); X.globalAlpha *= a; X.translate(60 * (1 - a), 0);
      shd(X, 24, 8, 0.12); X.fillStyle = card(P); X.beginPath(); X.roundRect(140, yy - 66, 800, 132, 36); X.fill(); noShd(X);
      ctx.text(X, it, 880, yy + 18, { family: 'body', weight: 700, size: 50, align: 'right', color: P.ink, maxWidth: 520 });
      const tx = 200, tw2 = 150, th = 84, kk = cl(on); X.fillStyle = kk > 0.5 ? P.acc : 'rgba(128,128,128,.3)'; X.beginPath(); X.roundRect(tx, yy - th / 2, tw2, th, th / 2); X.fill();
      const kx = lerp(tx + tw2 - th / 2, tx + th / 2, on); shd(X, 10, 4, 0.2); X.fillStyle = '#FFFFFF'; X.beginPath(); X.ellipse(kx, yy, th / 2 - 7 + 6 * Math.sin(Math.PI * kk), th / 2 - 7, 0, 0, TAU); X.fill(); noShd(X);
      X.restore(); });
    X.restore();
  };

  /* 139 خرافة وحقيقة — كرت «خرافة» عليه الجملة الغلط وتنشطب بـ✗، ثم الكرت يقلب ويطلع «حقيقة» بالجملة الصح و✓. o: {myth, fact, s, flip=s+1.6, labels=['خرافة','حقيقة'], y=920, out} */
  FX.mythFact = (ctx, t, o) => {
    const { X, P, at, E } = ctx, y = pick(o, 'y', 920), fl = o.flip != null ? o.flip : o.s + 1.6, lb = o.labels || ['خرافة', 'حقيقة'], W = 820, Hh = 560;
    if (t < o.s) return; const fade = outK(ctx, t, o, 0.4); if (fade >= 1) return;
    const k = E.backOut(pr(t, o.s, o.s + 0.45)), f = E.cubicInOut(pr(t, fl, fl + 0.6)), back = f > 0.5, sx = Math.abs(Math.cos(Math.PI * f));
    X.save(); X.globalAlpha *= 1 - fade; X.translate(540, y); X.scale(Math.max(0, k) * Math.max(0.01, sx), Math.max(0, k)); X.translate(-540, -y);
    shd(X, 50, 18, 0.2); X.fillStyle = card(P); X.beginPath(); X.roundRect(540 - W / 2, y - Hh / 2, W, Hh, 48); X.fill(); noShd(X);
    const lab = back ? lb[1] : lb[0], lw = tw(ctx, X, lab, 'display', 400, 60) + 70; X.fillStyle = back ? P.acc : P.ink; X.beginPath(); X.roundRect(540 + W / 2 - 50 - lw, y - Hh / 2 + 50, lw, 96, 48); X.fill();
    ctx.text(X, lab, 540 + W / 2 - 50 - lw / 2, y - Hh / 2 + 120, { family: 'display', size: 60, color: back ? onAcc(P) : P.bg });
    const L = ctx.text.layout(X, (back ? o.fact : o.myth) || '', { family: 'body', weight: 700, size: 60, maxWidth: W - 140, lineHeight: 1.4 });
    const B = ctx.text.drawLayout(X, L, 540, y + 20 - (L.height - 60) / 2, { color: back ? P.ink : P.ink });
    if (!back) { const kx = at(t, o.s + 0.7, o.s + 1.1, 'cubicInOut'), xs = Math.min(...B.map(b => b.x)) - 10, xe = Math.max(...B.map(b => b.x + b.w)) + 10;
      if (kx > 0 && B.length) { const ys = Math.min(...B.map(b => b.cy)), ye = Math.max(...B.map(b => b.cy)); X.globalAlpha *= 0.9;
        ctx.drawPath(X, [[xe, ys - 70], [xs, ye + 70]], kx, { width: 14, color: P.acc, cap: 'round', smooth: false });
        ctx.drawPath(X, [[xs, ys - 70], [xe, ye + 70]], at(t, o.s + 0.95, o.s + 1.3, 'cubicInOut'), { width: 14, color: P.acc, cap: 'round', smooth: false }); } }
    else check(ctx, X, 540 - W / 2 + 110, y - Hh / 2 + 98, 60, at(t, fl + 0.6, fl + 0.9), P.acc, 14);
    X.restore();
  };

  /* 140 تصويت — كرت سؤال بخيارات؛ نقرة على خيار، والأعمدة تتعبّى بالنسب (اختيارك بلون الهوية و✓). o: {q, options:[[نص, نسبة]], vote=0, s, tap=s+1, y=820, out} */
  FX.pollVote = (ctx, t, o) => {
    const { X, P, at, E } = ctx, Op = o.options || [['نعم', 70], ['لا', 30]], v = o.vote || 0, tap = o.tap != null ? o.tap : o.s + 1, y = pick(o, 'y', 820), W = 820, rowH = 110, gap = 30;
    if (t < o.s) return; const fade = outK(ctx, t, o, 0.4); if (fade >= 1) return;
    const k = E.expoOut(pr(t, o.s, o.s + 0.5)), qL = ctx.text.layout(X, o.q || '', { family: 'display', size: 70, maxWidth: W - 100, lineHeight: 1.25 }), top = y - 40, hh = qL.height + 120 + Op.length * (rowH + gap);
    X.save(); X.globalAlpha *= k * (1 - fade); X.translate(0, 60 * (1 - k));
    shd(X, 50, 18, 0.18); X.fillStyle = card(P); X.beginPath(); X.roundRect(540 - W / 2, top, W, hh, 48); X.fill(); noShd(X);
    ctx.text.drawLayout(X, qL, 540 + W / 2 - 50, top + 50 + 70 * 0.95, { align: 'right', color: P.ink });
    const fill = E.cubicOut(pr(t, tap + 0.1, tap + 0.9)), press = Math.sin(Math.PI * pr(t, tap - 0.05, tap + 0.15));
    Op.forEach(([lab, pct], i) => { const ry = top + qL.height + 90 + i * (rowH + gap), x0 = 540 - W / 2 + 50, w = W - 100, me = i === v, s2 = me ? 1 - 0.04 * press : 1;
      X.save(); X.translate(540, ry + rowH / 2); X.scale(s2, s2); X.translate(-540, -(ry + rowH / 2));
      X.strokeStyle = fill > 0 ? 'transparent' : rgba(P.ink, 0.2); X.lineWidth = 4; X.fillStyle = rgba(P.ink, 0.06); X.beginPath(); X.roundRect(x0, ry, w, rowH, 30); X.fill(); X.stroke();
      if (fill > 0) { const fw = Math.max(0, w * (+pct / 100) * fill); X.save(); X.beginPath(); X.roundRect(x0, ry, w, rowH, 30); X.clip(); X.fillStyle = me ? P.acc : rgba(P.mut, 0.45); X.fillRect(x0 + w - fw, ry, fw, rowH); X.restore(); }
      const onBar = fill > 0 && me && (+pct / 100) * fill > 0.4; ctx.text(X, lab, x0 + w - 40, ry + rowH / 2 + 18, { family: 'body', weight: 700, size: 50, align: 'right', color: onBar ? onAcc(P) : P.ink, maxWidth: w - 220 });
      if (fill > 0) ctx.text(X, ctx.num(Math.round(+pct * fill)) + '%', x0 + 36, ry + rowH / 2 + 18, { family: 'num', weight: 800, size: 46, align: 'left', color: me ? P.acc : P.mut, dir: 'ltr', alpha: cl(fill * 3) });
      if (me && fill > 0) check(ctx, X, x0 + w - 40 - tw(ctx, X, lab, 'body', 700, 50) - 40, ry + rowH / 2, 30, at(t, tap + 0.2, tap + 0.45), onBar ? onAcc(P) : P.acc, 7);
      X.restore(); });
    const ry = top + qL.height + 90 + v * (rowH + gap) + rowH / 2, fi = at(t, tap - 0.5, tap - 0.05, 'cubicOut');
    finger(X, P, 640 + 120 * (1 - fi), ry + 20 + 220 * (1 - fi) + 180 * at(t, tap + 0.3, tap + 0.7, 'cubicIn'), press, at(t, tap - 0.5, tap - 0.3) * (1 - at(t, tap + 0.4, tap + 0.7)) * k);
    X.restore();
  };

  /* 141 كروت بعمق — ثلاث كروت على أعماق مختلفة تطفو وتتحرك بسرعات مختلفة (بارالاكس) بميلة خفيفة، اللي ورا مغبّش. o: {cards:[[عنوان, سطر]], s, y=960, out} */
  FX.parallaxCards = (ctx, t, o) => {
    const { X, P, E } = ctx, C = (o.cards || [['١', ''], ['٢', ''], ['٣', '']]).slice(0, 3), y = pick(o, 'y', 960);
    if (t < o.s) return; const fade = outK(ctx, t, o, 0.4); if (fade >= 1) return;
    const slots = [[-170, -330, 0.35], [190, -40, 0.65], [-40, 300, 1]], fills = [P.ink, P.acc, card(P)], fgs = [P.bg, onAcc(P), P.ink];
    X.save(); X.globalAlpha *= 1 - fade;
    C.forEach((c, i) => { const [ox, oy, d] = slots[i], k = E.expoOut(pr(t, o.s + i * 0.18, o.s + 0.8 + i * 0.18)); if (k <= 0) return;
      const u = t - o.s, px = Math.sin(u * 0.7 + i) * 50 * d - u * 30 * d, py = Math.sin(u * 1.1 + i * 2) * 16 * d, w = 600 * (0.72 + 0.28 * d), h = w * 0.62;
      X.save(); X.globalAlpha *= k; X.translate(540 + ox + px, y + oy + py + (1 - k) * 500 * d); X.transform(1, 0.05 * Math.sin(u * 0.8 + i), -0.06 * Math.cos(u * 0.6 + i), 1, 0, 0);
      if (d < 0.9) X.filter = `blur(${(3 * (1 - d)).toFixed(1)}px)`;
      shd(X, 50 * d, 24 * d, 0.25); X.fillStyle = fills[i % 3]; X.beginPath(); X.roundRect(-w / 2, -h / 2, w, h, 40 * d + 10); X.fill(); noShd(X);
      ctx.text(X, c[0], w / 2 - 50, -h / 2 + 50 + 64 * d + 20, { family: 'display', size: 64 * d + 26, align: 'right', color: fgs[i % 3], maxWidth: w - 100 });
      if (c[1]) ctx.text(X, c[1], w / 2 - 50, h / 2 - 50, { family: 'body', weight: 700, size: 30 * d + 14, align: 'right', color: fgs[i % 3], alpha: 0.75, maxWidth: w - 100 });
      X.restore(); });
    X.restore();
  };

  /* ═══ ز) انتقالات 142–147 (o.A و o.B يرسمون الإطار كامل) ═══ */

  /* 142 شاشة مقسومة — A يتقلص لنص الشاشة وB يدخل للنص الثاني (فوق/تحت أو يمين/يسار) بفاصل ولافتات؛ وبـout B ياخذ الشاشة كلها. o: {s, dur=.8, A, B, dir='v'|'h', labels=['قبل','بعد'], gap=14, out} */
  FX.splitScreen = (ctx, t, o) => {
    const { X, P, E } = ctx, d = o.dur || 0.8, k = E.expoInOut(pr(t, o.s, o.s + d)), m = o.out != null ? E.expoInOut(pr(t, o.out, o.out + d)) : 0, g = pick(o, 'gap', 14), v = o.dir !== 'h';
    if (k <= 0) { o.A(X); return; } if (m >= 1) { o.B(X); return; }
    const half = (v ? 1920 : 1080) / 2, Ra = v ? { x: 0, y: lerp(0, -half, m), w: 1080, h: lerp(1920, half - g / 2, k) } : { x: lerp(0, half + g / 2, k) + lerp(0, half, m), y: 0, w: lerp(1080, half - g / 2, k), h: 1920 };
    const Rb = v ? { x: 0, y: lerp(1920, half + g / 2, k) - lerp(0, half + g / 2, m), w: 1080, h: lerp(half - g / 2, 1920, m) } : { x: lerp(-half, 0, k), y: 0, w: lerp(half - g / 2, 1080, m), h: 1920 };
    const put = (fn, R) => { if (R.w <= 1 || R.h <= 1) return; X.save(); X.beginPath(); X.rect(R.x, R.y, R.w, R.h); X.clip(); X.translate(R.x + R.w / 2 - 540, R.y + R.h / 2 - 960); fn(X); X.restore(); };
    X.fillStyle = deep(P); X.fillRect(0, 0, 1080, 1920);
    put(o.A, Ra); put(o.B, Rb);
    if (o.labels !== null) { const lb = o.labels || ['قبل', 'بعد'], la = cl(k * 2 - 1) * (1 - m);
      const chip = (s, x, y, bg, fg) => { const w = tw(ctx, X, s, 'body', 700, 44) + 56; X.save(); X.globalAlpha *= la; X.fillStyle = bg; X.beginPath(); X.roundRect(x - w, y, w, 80, 40); X.fill(); ctx.text(X, s, x - w / 2, y + 55, { family: 'body', weight: 700, size: 44, color: fg }); X.restore(); };
      if (v) { chip(lb[0], 900, Ra.y + 190, P.ink, P.bg); chip(lb[1], 900, Rb.y + 40, P.bg, P.ink); } else { chip(lb[0], Ra.x + Ra.w - 30, 220, P.ink, P.bg); chip(lb[1], Rb.x + Rb.w - 30, 220, P.bg, P.ink); } }
  };

  /* 143 ورق ينشق — المشهد ورقة تنشق نصين بحافة مسننة (ألياف بيضا) والنصين يطيرون للجهتين ويكشفون B. o: {s, dur=.9, A, B, seed=3} */
  FX.tornPaper = (ctx, t, o) => {
    const { X, E } = ctx, p = pr(t, o.s, o.s + (o.dur || 0.9)), sd = o.seed || 3; if (p <= 0) { o.A(X); return; } if (p >= 1) { o.B(X); return; }
    o.B(X); const e = E.cubicIn(p), tear = []; for (let j = 0; j <= 60; j++) { const yy = -40 + j * 2000 / 60; tear.push([540 + 80 * ctx.noise1(j * 0.3, sd) + 22 * (ctx.hash01(j, sd) - 0.5), yy]); }
    const piece = (side) => { const dx = side * (760 * e), dy = side * (side > 0 ? -60 : 110) * e, rot = side * 0.16 * e;
      X.save(); X.translate(540 + dx, 960 + dy); X.rotate(rot); X.translate(-540, -960);
      X.beginPath(); if (side < 0) { X.moveTo(-200, -60); tear.forEach(q => X.lineTo(q[0], q[1])); X.lineTo(-200, 2000); } else { X.moveTo(1300, -60); tear.forEach(q => X.lineTo(q[0], q[1])); X.lineTo(1300, 2000); } X.closePath();
      shd(X, 40, 0, 0.35); X.fillStyle = '#FFFFFF'; X.fill(); noShd(X); X.save(); X.clip(); o.A(X); X.restore();
      X.strokeStyle = '#FFFFFF'; X.lineWidth = 12 + 6 * Math.abs(side); X.lineJoin = 'round'; X.beginPath(); tear.forEach((q, j) => X.lineTo(q[0] + side * 3 * ctx.hash01(j, sd + side), q[1])); X.stroke();
      X.strokeStyle = 'rgba(0,0,0,.12)'; X.lineWidth = 3; X.beginPath(); tear.forEach((q, j) => X.lineTo(q[0] - side * 8, q[1])); X.stroke();
      X.restore(); };
    piece(-1); piece(1);
  };

  /* 144 سحبة لفوق — المشهد ينسحب لفوق بسرعة مع غباش حركة وخطوط، والجديد يطلع من تحت. o: {s, dur=.6, A, B} */
  FX.whipUp = (ctx, t, o) => {
    const { X, P, E } = ctx, d = o.dur || 0.6, pos = tt => E.expoInOut(pr(tt, o.s, o.s + d)), k = pos(t);
    if (k <= 0) { o.A(X); return; } if (k >= 1) { o.B(X); return; }
    const v = Math.abs(pos(t + 0.008) - pos(t - 0.008)) / 0.016, bl = Math.min(36, v * 8 * (0.6 / d));
    X.save(); if (bl > 1) X.filter = `blur(${(bl / 2.5).toFixed(1)}px)`;
    X.save(); X.translate(0, -1920 * k); o.A(X); X.restore(); X.save(); X.translate(0, 1920 * (1 - k)); o.B(X); X.restore(); X.restore();
    if (bl > 2) for (let j = 0; j < 22; j++) { const x = ctx.hash01(j, 1) * 1080, len = 300 + 900 * ctx.hash01(j, 2), yy = (ctx.hash01(j, 3) * 2400 - 1920 * k * 2) % 2400; X.save(); X.globalAlpha *= 0.35 * cl(bl / 36); X.fillStyle = j % 3 ? '#FFFFFF' : P.acc; X.fillRect(x, (yy + 2400) % 2400 - 240, 4 + 6 * ctx.hash01(j, 4), len); X.restore(); }
  };

  /* 145 مسحة أشكال — شبكة أشكال (دواير/معيّنات/مربعات/سداسي) تكبر بالتتابع من زاوية فوق يمين وتكشف B، وحوافها بلون الهوية. o: {s, dur=1.1, A, B, shape='circle'|'diamond'|'square'|'hex', cols=6, edge=P.acc} */
  FX.shapeWipe = (ctx, t, o) => {
    const { X, P, E } = ctx, p = pr(t, o.s, o.s + (o.dur || 1.1)); if (p <= 0) { o.A(X); return; } if (p >= 1) { o.B(X); return; }
    const cols = o.cols || 6, cell = 1080 / cols, rows = Math.ceil(1920 / cell) + 1, sh = o.shape || 'circle', spread = 0.6, maxD = Math.hypot(1080, 1920), cells = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c <= cols; c++) { const cx = 1080 - (c + 0.5) * cell + (r % 2 && sh !== 'square' ? cell / 2 : 0), cy = (r + 0.5) * cell, dd = Math.hypot(1080 - cx, cy) / maxD, k = E.cubicInOut(cl((p * (1 + spread) - dd * spread) / 1));
      if (k > 0) cells.push([cx, cy, k]); }
    o.A(X); const sz = cell * (sh === 'circle' ? 1.5 : sh === 'diamond' ? 2.05 : sh === 'hex' ? 1.55 : 1.02);
    X.save(); X.beginPath(); cells.forEach(([cx, cy, k]) => { X.save(); X.translate(cx, cy); if (sh === 'square') X.rotate((1 - k) * 0.8); const S = sz * k;
      if (sh === 'circle') { X.moveTo(S / 2, 0); X.arc(0, 0, S / 2, 0, TAU); } else { const pts = sh === 'diamond' ? [[0, -0.5], [0.5, 0], [0, 0.5], [-0.5, 0]] : sh === 'hex' ? [0, 1, 2, 3, 4, 5].map(i => [Math.cos(i * Math.PI / 3 + Math.PI / 6) / 2, Math.sin(i * Math.PI / 3 + Math.PI / 6) / 2]) : [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]];
        pts.forEach(([a, b], j) => (j ? X.lineTo : X.moveTo).call(X, a * S, b * S)); X.closePath(); }
      X.restore(); }); X.clip(); o.B(X); X.restore();
    if (o.edge !== null) { X.save(); X.strokeStyle = o.edge || P.acc; X.lineWidth = 8; cells.forEach(([cx, cy, k]) => { if (k >= 0.98) return; X.save(); X.globalAlpha *= 1 - k; X.translate(cx, cy); if (sh === 'square') X.rotate((1 - k) * 0.8); const S = sz * k;
      if (sh === 'circle') { X.beginPath(); X.arc(0, 0, S / 2, 0, TAU); } else if (sh === 'square') { X.beginPath(); X.rect(-S / 2, -S / 2, S, S); } else if (sh === 'diamond') { X.beginPath(); IC.diamond(X, S); } else IC.hex(X, S); X.stroke(); X.restore(); }); X.restore(); }
  };

  /* 146 فتحة نجمة — نجمة ثمانية (أو قلب/مربع/دائرة) تطلع صغيرة وتلف وتكبر لين تبلع الشاشة وتكشف B، بحافة بلون الهوية. o: {s, dur=1, A, B, shape='star8'|'heart'|'square'|'circle', at=[540,960], color=P.acc, spin=.6} */
  FX.starIris = (ctx, t, o) => {
    const { X, P, at } = ctx, c = o.at || [540, 960], d = o.dur || 1, sh = o.shape || 'star8', col = o.color || P.acc;
    if (t >= o.s + d) { o.B(X); return; }
    o.A(X); const pre = at(t, o.s - 0.45, o.s - 0.05, 'backOut'), k = at(t, o.s, o.s + d, 'expoIn'), S = 90 * pre + 4600 * k, rot = (o.spin == null ? 0.6 : o.spin) * (at(t, o.s - 0.45, o.s + d, 'cubicOut') - 1);
    if (S < 2) return;
    const path = s2 => { X.save(); X.translate(c[0], c[1]); X.rotate(rot); (IC[sh] || IC.star8)(X, s2); X.restore(); };
    X.save(); path(S + 40); X.fillStyle = col; X.fill(); X.restore();
    if (S > 60) { X.save(); path(S); X.clip(); const z = 1.2 - 0.2 * k; zoomAt(X, c, z); o.B(X); X.restore(); }
  };

  /* 147 حبر ينتشر — بقع حبر تكبر وتتلاصق بحواف متموّجة، والمشهد الجديد يطلع من داخلها ورا حافة الحبر. o: {s, dur=1.3, A, B, seeds:[[x,y]…], color=P.ink} */
  FX.inkBleed = (ctx, t, o) => {
    const { X, P, E } = ctx, d = o.dur || 1.3, p = pr(t, o.s, o.s + d); if (p <= 0) { o.A(X); return; } if (p >= 1) { o.B(X); return; }
    const S = o.seeds || [[760, 640], [300, 1240], [620, 1600]], col = o.color || P.ink;
    const blob = (R, band) => { X.beginPath(); S.forEach(([cx, cy], i) => { const r = R(i); if (r <= band) return; for (let j = 0; j <= 72; j++) { const a = j / 72 * TAU, n = 1 + 0.18 * ctx.noise1(a * 2.2 + i * 10, 5) + 0.08 * ctx.noise1(a * 7 + i * 3 + p * 2, 6), rr = (r - band) * n;
      (j ? X.lineTo : X.moveTo).call(X, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } X.closePath(); }); };
    const R = i => 2300 * E.cubicIn(pr(t, o.s + i * 0.12, o.s + d));
    o.A(X); X.save(); blob(R, 0); X.fillStyle = col; X.fill(); X.restore();
    for (let j = 0; j < 14; j++) { const [cx, cy] = S[j % S.length], a = ctx.hash01(j, 1) * TAU, r0 = R(j % S.length) * (1.05 + 0.3 * ctx.hash01(j, 2)) + 30; if (R(j % S.length) <= 0) continue;
      X.fillStyle = col; X.beginPath(); X.arc(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, 6 + 14 * ctx.hash01(j, 3), 0, TAU); X.fill(); }
    X.save(); blob(R, 110 * (1 - p) + 40); X.clip(); o.B(X); X.restore();
  };

  /* ═══ ح) كاميرا 148–150 (o.draw = (Y) => {...} يرسم الإطار كامل) ═══ */

  /* 148 انقسام الألوان — على الضربة الصورة تنقسم لقنواتها (أحمر/أخضر/أزرق) وتنزاح، مع نفضة زوم، وترجع. o: {s, dur=.45, draw, amt=26, zoom=1.06} */
  FX.rgbSplit = (ctx, t, o) => {
    const { X } = ctx, d = o.dur || 0.45, e = t < o.s || t > o.s + d ? 0 : Math.pow(1 - (t - o.s) / d, 2);
    if (e < 0.02) { o.draw(X); return; }
    const src = offC(X, 'rgbSrc'); src.Y.save(); zoomAt(src.Y, [540, 960], 1 + ((o.zoom || 1.06) - 1) * e); o.draw(src.Y); src.Y.restore();
    const m = X.getTransform(), amt = (o.amt || 26) * e * m.a, fr = Math.floor(t * 30), jy = (ctx.hash01(fr, 2) - 0.5) * 8 * e * m.a;
    const ch = (slot, col) => { const C = offC(X, slot), Y = C.Y; Y.setTransform(1, 0, 0, 1, 0, 0); Y.drawImage(src.c, 0, 0); Y.globalCompositeOperation = 'multiply'; Y.fillStyle = col; Y.fillRect(0, 0, C.c.width, C.c.height); Y.globalCompositeOperation = 'destination-in'; Y.drawImage(src.c, 0, 0); return C.c; };
    const R = ch('rgbR', '#FF0000'), Gc = ch('rgbG', '#00FF00'), Bc = ch('rgbB', '#0000FF');
    X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.fillStyle = '#000'; X.fillRect(0, 0, X.canvas.width, X.canvas.height);
    X.globalCompositeOperation = 'lighter'; X.drawImage(R, -amt, jy); X.drawImage(Gc, 0, 0); X.drawImage(Bc, amt, -jy); X.restore();
  };

  /* 149 فلاش — ومضة بيضا (أو بلون) على الضربة: الصورة تولّع (سطوع) وتنفض زوم وترجع بنعومة. o: {s, dur=.5, draw, color='#FFFFFF', zoom=1.05, peak=.85} */
  FX.flashFrame = (ctx, t, o) => {
    const { X } = ctx, d = o.dur || 0.5, e = t < o.s - 0.04 ? 0 : t < o.s ? (t - o.s + 0.04) / 0.04 : Math.pow(cl(1 - (t - o.s) / d), 2);
    X.save(); if (e > 0.01) { zoomAt(X, [540, 960], 1 + ((o.zoom || 1.05) - 1) * e); X.filter = `brightness(${(1 + 1.3 * e).toFixed(2)}) saturate(${(1 - 0.4 * e).toFixed(2)})`; }
    o.draw(X); X.restore();
    if (e > 0.01) { X.save(); X.globalAlpha *= (o.peak || 0.85) * e; X.fillStyle = o.color || '#FFFFFF'; X.fillRect(0, 0, 1080, 1920); X.restore(); }
  };

  /* 150 شريط سينمائي — شريطين أسود يدخلون من فوق وتحت (لقطة سينمائية) والصورة تقرب شوي؛ عنوان اختياري بالشريط اللي فوق. o: {s, dur=.6, draw, h=1180 (الجزء الظاهر), out, color='#000', zoom=1.06, title} */
  FX.letterbox = (ctx, t, o) => {
    const { X, E } = ctx, d = o.dur || 0.6, k = E.expoInOut(pr(t, o.s, o.s + d)) * (o.out != null ? 1 - E.expoInOut(pr(t, o.out, o.out + d)) : 1), bar = (1920 - (o.h || 1180)) / 2 * k;
    X.save(); zoomAt(X, [540, 960], 1 + ((o.zoom || 1.06) - 1) * k); o.draw(X); X.restore();
    if (bar < 0.5) return; X.fillStyle = o.color || '#000000'; X.fillRect(0, 0, 1080, bar); X.fillRect(0, 1920 - bar, 1080, bar);
    if (o.title) { const a = cl((k - 0.6) / 0.4); ctx.text(X, o.title, 540, bar - 70, { family: 'body', weight: 700, size: 46, color: '#FFFFFF', alpha: a, maxWidth: 900, letterSpacing: 2 }); }
  };

})();
