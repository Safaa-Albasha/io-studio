/* ── المشهد 3 · الأعذار: كل عذر ضربة، وكل ضربة النقطة تخفت ─────────────────── */
MOTION.scene({
  id: 's3_excuses',
  draw(t, lt, ctx) {
    const { X, E } = ctx, D = D3;
    D.bg(X, ctx);
    const hits = [0.45, 2.05, 3.65, 5.25];
    const words = ['ما عندي كاميرا', 'ما أعرف مونتاج', 'ما عندي وقت', 'ما أحب أطلع بوجهي'];
    // اهتزاز الكاميرا بعد كل ضربة
    let sh = 0; hits.forEach((h, i) => { if (lt >= h) sh += Math.exp(-(lt - h) * 9) * (i === 3 ? 1.6 : 1); });
    const sx = 18 * sh * ctx.noise1(lt * 30, 1), sy = 18 * sh * ctx.noise1(lt * 30, 2);
    X.save(); X.translate(sx, sy);
    D.dust(X, ctx, t, 50, 0.18, 11);

    // النقطة تخفت درجة مع كل ضربة
    let n = 0; hits.forEach(h => { n += ctx.at(lt, h, h + 0.25, 'cubicOut'); });
    const end = ctx.at(lt, 6.4, 7.2, 'sineInOut');
    const hb = D.heart(lt, 1.25 + 0.15 * n, 0.2);
    const k = Math.max(0.06, (1 - n * 0.2) * (1 - 0.5 * end)) * (0.8 + 0.2 * hb);
    D.dot(X, 540, 1250, 13 + 2 * hb, k);
    // موجة صدمة توصل للنقطة
    hits.forEach(h => {
      const p = ctx.prog(lt, h, h + 0.7); if (p <= 0 || p >= 1) return;
      X.save(); X.strokeStyle = `rgba(173,179,189,${(0.35 * (1 - p)).toFixed(3)})`; X.lineWidth = 3;
      X.beginPath(); X.arc(540, 1250, 40 + 520 * E.cubicOut(p), 0, Math.PI * 2); X.stroke(); X.restore();
    });

    // الكلمات تضرب
    words.forEach((w, i) => {
      const h = hits[i], nxt = hits[i + 1] ?? 6.4;
      if (lt < h - 0.02) return;
      const kin = ctx.at(lt, h, h + 0.2, 'cubicOut');
      const kout = ctx.at(lt, nxt - 0.05, nxt + 0.3, 'cubicIn');
      if (kout >= 1) return;
      const sc = ctx.lerp(1.22, 1, kin), y = 780 - kout * 170;
      X.save();
      X.globalAlpha = Math.min(1, kin * 1.4) * (1 - kout);
      if (kout > 0.02) X.filter = `blur(${(kout * 10).toFixed(1)}px)`;
      X.translate(540, y); X.scale(sc, sc); X.translate(-540, -y);
      // العذر الأخير: صدى نسخ وراه
      if (i === 3) for (let j = 3; j >= 1; j--) {
        const e = ctx.at(lt, h + 0.02, h + 0.6, 'expoOut');
        ctx.text(X, w, 540, y - j * 120 * e, { family: 'display', weight: 800, size: 104, color: D.MUT, maxWidth: 940, alpha: 0.18 * (1 - j / 4) * e });
        ctx.text(X, w, 540, y + j * 120 * e, { family: 'display', weight: 800, size: 104, color: D.MUT, maxWidth: 940, alpha: 0.18 * (1 - j / 4) * e });
      }
      ctx.text(X, w, 540, y, { family: 'display', weight: 800, size: 104, color: D.INK, maxWidth: 940 });
      X.restore();
    });
    X.restore();
  },
});
