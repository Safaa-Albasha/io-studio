/* ── المشهد 7 · المفاجأة: الفيلم يصغر ويرجع لنفس الكرت بالملاحظات (قطع مطابق 9:16) ── */
MOTION.scene({
  id: 's7_reveal',
  setup(ctx) {
    // نفس «ص» نقاط، 2D، للصورة المصغرة
    const c = document.createElement('canvas'); c.width = 600; c.height = 600;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '800 520px "Alexandria"'; g.direction = 'rtl'; g.fillText('ص', 300, 270);
    const d = g.getImageData(0, 0, 600, 600).data; this.pts = [];
    for (let y = 0; y < 600; y += 9) for (let x = 0; x < 600; x += 9) if (d[(y * 600 + x) * 4 + 3] > 128) this.pts.push([x, y]);
  },
  // إطار «الفيلم» بأي مستطيل 9:16
  frame(X, ctx, x, y, w, h, lt) {
    const D = D3;
    X.save(); X.beginPath(); X.roundRect(x, y, w, h, Math.max(4, w * 0.03)); X.clip();
    X.fillStyle = D.NIGHT; X.fillRect(x, y, w, h);
    const s = w / 1080, cx = x + w / 2, cy = y + h * 0.5 - 92 * s;
    const glyphW = 1.27 * s;
    X.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.pts.length; i++) {
      const [px, py] = this.pts[i];
      const tw = 0.7 + 0.3 * Math.sin(lt * 3 + i);
      X.fillStyle = i % 5 === 0 ? `rgba(255,255,255,${0.9 * tw})` : `rgba(46,196,240,${0.85 * tw})`;
      X.beginPath(); X.arc(cx + (px - 300) * glyphW, cy + (py - 300) * glyphW, Math.max(0.6, 6 * s), 0, Math.PI * 2); X.fill();
    }
    X.globalCompositeOperation = 'source-over';
    // شريط تشغيل
    const p = ctx.clamp(0.62 + lt * 0.05, 0, 1);
    X.fillStyle = 'rgba(255,255,255,.25)'; X.fillRect(x + w * 0.08, y + h * 0.93, w * 0.84, Math.max(2, 8 * s * 3));
    X.fillStyle = D.SKY; X.fillRect(x + w * 0.08 + w * 0.84 * (1 - p), y + h * 0.93, w * 0.84 * p, Math.max(2, 8 * s * 3));
    X.restore();
  },
  draw(t, lt, ctx) {
    const { X, E } = ctx, D = D3, self = this;
    D.bg(X, ctx);
    const CW = 860, CH = 440, CX = 540, CY = 820;
    const th = { w: (CH - 68) * 9 / 16, h: CH - 68 };
    const tx = CX - CW / 2 + 34, ty = CY - CH / 2 + 34;
    const k = E.cubicInOut(ctx.prog(lt, 0.35, 2.3));
    const ka = ctx.at(lt, 1.4, 2.2);
    // قائمة الملاحظات حواليه
    ctx.text(X, 'الملاحظات', 540 + CW / 2, 360, { family: 'display', weight: 800, size: 64, color: D.INK, align: 'right', alpha: ka });
    D.card(X, ctx, 540, CY + CH / 2 + 130, CW, 170, { title: 'قائمة مشتريات', date: 'اليوم', alpha: 0.45 * ka * (1 - ctx.at(lt, 2.2, 2.7)) });
    D.card(X, ctx, 540, CY + CH / 2 + 326, CW, 170, { title: 'باسوورد الواي فاي', date: 'أمس', alpha: 0.3 * ka * (1 - ctx.at(lt, 2.2, 2.7)) });
    D.card(X, ctx, CX, CY, CW, CH, { title: 'فكرة فيديو', date: 'قبل 300 يوم', alpha: ka, check: ctx.at(lt, 2.4, 2.9, 'cubicOut'), border: ka > 0.9 ? 'rgba(46,196,240,.55)' : D.LINE,
      thumb: () => {} });
    // الفيلم يصغر من الشاشة كاملة للصورة المصغرة
    const fx = ctx.lerp(0, tx, k), fy = ctx.lerp(0, ty, k), fw = ctx.lerp(1080, th.w, k), fh = ctx.lerp(1920, th.h, k);
    self.frame(X, ctx, fx, fy, fw, fh, lt);
    // ومضة البداية تذوب
    const fl = 1 - ctx.at(lt, 0, 0.45, 'cubicOut');
    if (fl > 0.001) { X.save(); X.fillStyle = `rgba(214,244,253,${fl.toFixed(3)})`; X.fillRect(0, 0, 1080, 1920); X.restore(); }
    // النص
    D.line(X, ctx, 'الفيديو اللي شفته…', 540, 1300, 2.6, { t: lt, size: 68 });
    if (lt > 3.7) ctx.FX.decrypt(ctx, t, { text: 'كان هالفكرة.', s: ctx.scene.start + 3.7, per: 0.07, y: 1450, size: 92, bar: false });
  },
});
