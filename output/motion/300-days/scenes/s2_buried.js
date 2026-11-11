/* ── المشهد 2 · انكتبت بليلة… وبعدها انطمرت ───────────────────────────────────
   الكاميرا ترجع من النقطة ← كرت «فكرة فيديو» بقائمة الملاحظات ← ملاحظات جديدة تنزل وتطمره. */
MOTION.scene({
  id: 's2_buried',
  draw(t, lt, ctx) {
    const { X } = ctx, D = D3;
    D.bg(X, ctx);
    const CW = 860, CH = 170, GAP = 196, TOP = 560, CLIP0 = 430, CLIP1 = 1360;
    const drops = [1.6, 2.15, 2.65, 3.05, 3.4, 3.72, 4.0];
    const titles = ['قائمة مشتريات', 'باسوورد الواي فاي', 'موعد الأسنان الخميس', 'ملاحظة بلا عنوان', 'سجّل فيديو؟ بعدين', 'أشياء لازم أخلصها', 'تذكير'];
    const dates = ['اليوم', 'أمس', 'قبل 3 أيام', 'قبل أسبوع', 'قبل شهر', 'قبل 3 أشهر', 'قبل 5 أشهر'];
    // كم ملاحظة نزلت (ناعم)
    let shift = 0; drops.forEach(d => { shift += ctx.at(lt, d, d + 0.42, 'cubicOut'); });
    const tgtY = TOP + shift * GAP;
    const buried = shift / drops.length;
    const hb = D.heart(lt, 1.0 + buried * 0.5, 0);
    const dotK = Math.max(0.2, 1 - 0.75 * buried) * (0.85 + 0.15 * hb);

    // الكاميرا: من داخل النقطة (×7) لين المشهد كامل
    const pull = ctx.at(lt, -0.3, 1.7, 'cubicInOut');
    const s = ctx.lerp(7, 1, pull);
    const dotX = 540 - CW / 2 + 92, dotY = tgtY;
    const fx = ctx.lerp(dotX, 540, pull), fy = ctx.lerp(dotY, 900, pull);
    X.save();
    X.translate(540, 960); X.scale(s, s); X.translate(-fx, -fy);

    // عنوان القائمة
    const ha = ctx.at(lt, 0.9, 1.6);
    ctx.text(X, 'الملاحظات', 540 + CW / 2, 360, { family: 'display', weight: 800, size: 64, color: D.INK, align: 'right', alpha: ha });
    ctx.text(X, String(1284 + Math.round(shift)) + ' ملاحظة', 540 + CW / 2, 410, { family: 'body', weight: 400, size: 30, color: D.MUT, align: 'right', alpha: ha });

    X.save(); X.beginPath(); X.rect(0, CLIP0, 1080, CLIP1 - CLIP0); X.clip();
    // ملاحظات قديمة تحت كرتنا
    for (let j = 1; j <= 4; j++) D.card(X, ctx, 540, tgtY + j * GAP, CW, CH, { title: ['أرقام مهمة', 'كتب أقراها', 'هدية عيد ميلاد', 'وصفة'][j - 1], date: 'قبل ' + (300 + j * 12) + ' يوم', alpha: 0.55 * ha });
    // كرت الفكرة
    D.card(X, ctx, 540, tgtY, CW, CH, { title: 'فكرة فيديو', date: 'قبل 300 يوم', dotK, border: pull < 0.98 ? D.LINE : D.LINE });
    // الملاحظات الجديدة تنزل من فوق
    drops.forEach((d, i) => {
      const k = ctx.at(lt, d, d + 0.42, 'cubicOut'); if (k <= 0) return;
      let below = 0; drops.forEach((d2, j) => { if (j > i) below += ctx.at(lt, d2, d2 + 0.42, 'cubicOut'); });
      const y = ctx.lerp(TOP - 260, TOP, k) + below * GAP;
      D.card(X, ctx, 540, y, CW, CH, { title: titles[i], date: dates[i], alpha: k });
    });
    X.restore();
    // ظلمة تحت = طمر
    const g = X.createLinearGradient(0, CLIP1 - 360, 0, CLIP1);
    g.addColorStop(0, 'rgba(14,16,20,0)'); g.addColorStop(1, 'rgba(14,16,20,0.96)');
    X.fillStyle = g; X.fillRect(0, CLIP1 - 360, 1080, 360);
    X.restore();

    // النص
    D.line(X, ctx, 'انكتبت بليلة…', 540, 1480, 0.7, { t: lt, size: 68, out: 3.2 });
    D.line(X, ctx, 'وبعدها انطمرت.', 540, 1480, 3.6, { t: lt, size: 68, accent: [1] });
  },
});
