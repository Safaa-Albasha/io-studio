/* ── المشهد 9 · الختام + فكرة جديدة تولد (ترجع للبداية) ─────────────────────── */
MOTION.scene({
  id: 's9_end',
  draw(t, lt, ctx) {
    const { X } = ctx, D = D3;
    D.bg(X, ctx);
    const a1 = ctx.at(lt, 0.1, 0.7, 'expoOut');
    // Claude × I/O Studio
    X.save(); X.globalAlpha = a1;
    const y = 640 + (1 - a1) * 40;
    const f1 = ctx.font('AlexLatin', 800, 92), f2 = ctx.font('AlexLatin', 400, 80);
    X.font = f1; const w1 = X.measureText('Claude').width, w3 = X.measureText('I/O Studio').width;
    X.font = f2; const w2 = X.measureText('×').width;
    const gap = 30, tot = w1 + w2 + w3 + gap * 2; let x0 = 540 - tot / 2;
    ctx.text(X, 'Claude', x0, y, { family: 'AlexLatin', weight: 800, size: 92, color: D.INK, dir: 'ltr', align: 'left' }); x0 += w1 + gap;
    ctx.text(X, '×', x0, y, { family: 'AlexLatin', weight: 400, size: 80, color: D.SKY, dir: 'ltr', align: 'left' }); x0 += w2 + gap;
    ctx.text(X, 'I/O Studio', x0, y, { family: 'AlexLatin', weight: 800, size: 92, color: D.INK, dir: 'ltr', align: 'left' });
    X.restore();
    // صُنع بـ Fable 5.2
    const a2 = ctx.at(lt, 0.6, 1.1, 'cubicOut');
    X.save(); X.globalAlpha = a2;
    X.fillStyle = 'rgba(46,196,240,0.12)'; X.beginPath(); X.roundRect(330, 728, 420, 66, 33); X.fill();
    ctx.text(X, 'صُنع بـ Fable 5.2', 540, 772, { family: 'body', weight: 500, size: 34, color: D.SKY });
    X.restore();
    // السؤال
    D.line(X, ctx, 'شنو فكرتك اللي صار لها سنة؟', 540, 1060, 1.1, { t: lt, size: 58, weight: 800, maxWidth: 880 });
    D.line(X, ctx, 'اكتبها بالتعليقات', 540, 1170, 1.9, { t: lt, size: 50, weight: 500, color: D.SKY });
    // فكرة جديدة تولد
    const b = ctx.at(lt, 2.5, 3.0, 'expoOut'), hb = D.heart(lt, 1.0, 2.6);
    D.dot(X, 540, 1320, (6 + 7 * b + 4 * hb) * b, b * (0.7 + 0.3 * hb));
    // التوقيع
    const a3 = ctx.at(lt, 1.2, 1.8);
    ctx.text(X, 'صفاء', 620, 1480, { family: 'display', weight: 800, size: 46, color: D.INK, alpha: a3 });
    ctx.text(X, 'SAFAA.IO', 455, 1476, { family: 'num', weight: 500, size: 24, color: D.MUT, dir: 'ltr', alpha: a3, letterSpacing: 4 });
  },
});
