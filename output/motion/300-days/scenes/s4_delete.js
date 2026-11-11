/* ── المشهد 4 · وچانت راح تنحذف… ───────────────────────────────────────────────
   الكرت قريب، الإصبع يسحبه ← يطلع زر «حذف»، والنقطة ترجف مثل لمبة تموت. */
MOTION.scene({
  id: 's4_delete',
  draw(t, lt, ctx) {
    const { X } = ctx, D = D3;
    D.bg(X, ctx);
    const S = 1.18, CW = 860, CH = 170;
    const swipe = ctx.at(lt, 1.3, 2.5, 'cubicInOut') * 0.75 + ctx.at(lt, 3.3, 4.2, 'cubicInOut') * 0.25;
    const dx = -300 * swipe;
    // ارتجاف النقطة
    const fl = 0.5 + 0.5 * ctx.noise1(lt * (6 + 10 * ctx.at(lt, 3, 5)), 3);
    const die = ctx.at(lt, 4.3, 5.2, 'cubicIn');
    const k = Math.max(0.03, (0.14 + 0.16 * fl * (fl > 0.35 ? 1 : 0.2)) * (1 - 0.8 * die));

    X.save(); X.translate(540, 900); X.scale(S, S); X.translate(-540, -900);
    // زر الحذف وراه
    const delW = 300 * swipe, cx = 540 + dx;
    if (delW > 2) {
      const pulse = 0.85 + 0.15 * Math.sin(lt * 7);
      X.save(); X.fillStyle = D.EMBER; X.globalAlpha = 0.9 * pulse;
      X.beginPath(); X.roundRect(540 + CW / 2 - delW - 10, 900 - CH / 2, delW + 10, CH, 34); X.fill(); X.restore();
      ctx.text(X, 'حذف', 540 + CW / 2 - delW / 2, 916, { family: 'display', weight: 700, size: 46, color: '#FFFFFF', alpha: ctx.clamp((delW - 120) / 120, 0, 1) });
    }
    D.card(X, ctx, cx, 900, CW, CH, { title: 'فكرة فيديو', date: 'قبل 300 يوم', dotK: k });
    // الإصبع (دايرة لمس)
    const ta = ctx.at(lt, 1.0, 1.3) * (1 - ctx.at(lt, 4.5, 4.8));
    if (ta > 0.01) {
      const tx = ctx.lerp(820, 520, ctx.at(lt, 1.3, 2.5, 'cubicInOut')) + ctx.lerp(0, 330, ctx.at(lt, 3.0, 4.3, 'cubicInOut'));
      const ty = 900 + ctx.lerp(0, 0, 1);
      X.save(); X.globalAlpha = 0.55 * ta; X.fillStyle = '#FFFFFF';
      X.beginPath(); X.arc(tx, ty, 34 * (1 - 0.15 * ctx.at(lt, 4.2, 4.4)), 0, Math.PI * 2); X.fill(); X.restore();
    }
    X.restore();
    D.line(X, ctx, 'وچانت راح تنحذف…', 540, 1340, 0.35, { t: lt, size: 70 });
  },
});
