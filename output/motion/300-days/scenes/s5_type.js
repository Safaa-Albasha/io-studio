/* ── المشهد 5 · السكوت… «سوّي منها فيلم.» ↵ ──────────────────────────────────
   D3.typeFrame(X, ctx, lt) ترسم المشهد بدون حالة — المشهد 6 يستخدمها كـA بتموّج الماي. */
(function () {
  const D = D3;
  const WORDS = ['سوّي', 'منها', 'فيلم.'];
  const WT = [1.1, 1.55, 2.0];
  const ENTER = 3.75;
  D.typeFrame = (X, ctx, lt) => {
    D.bg(X, ctx);
    const show = ctx.at(lt, 0.5, 1.0, 'cubicOut');
    // النقطة: باهتة فوق، وتشتعل وقت الإنتر
    const ign = ctx.at(lt, ENTER + 0.05, ENTER + 0.5, 'expoOut');
    const hb = D.heart(lt, 1.4, 0.3);
    const k = 0.07 + 0.05 * hb + 0.93 * ign;
    D.dot(X, 540, 960, 13 + 9 * ign + 3 * hb * ign, k, 1 + 0.8 * ign);
    // خانة الكتابة
    const bx = 90, by = 1180, bw = 900, bh = 150;
    X.save(); X.globalAlpha = show;
    X.fillStyle = D.SURF; X.strokeStyle = ign > 0.01 ? `rgba(46,196,240,${0.3 + 0.7 * (1 - ign) * ctx.at(lt, ENTER, ENTER + 0.05)})` : D.LINE; X.lineWidth = 3;
    X.beginPath(); X.roundRect(bx, by, bw, bh, 40); X.fill(); X.stroke();
    // شريحة الموديل
    X.fillStyle = 'rgba(46,196,240,0.12)'; X.beginPath(); X.roundRect(bx, by - 78, 230, 56, 28); X.fill();
    X.fillStyle = D.SKY; X.beginPath(); X.arc(bx + 32, by - 50, 7, 0, Math.PI * 2); X.fill();
    ctx.text(X, 'Fable 5.2', bx + 52, by - 40, { family: 'num', weight: 600, size: 28, color: D.SKY, dir: 'ltr', align: 'left' });
    // زر الإرسال
    const press = Math.exp(-Math.max(0, lt - ENTER) * 10) * (lt >= ENTER ? 1 : 0);
    const typed = ctx.at(lt, WT[2], WT[2] + 0.3);
    const sx = bx + 80, sy = by + bh / 2, sr = 42 * (1 - 0.12 * press);
    X.fillStyle = typed > 0.5 ? D.SKY : D.LINE; X.beginPath(); X.arc(sx, sy, sr, 0, Math.PI * 2); X.fill();
    X.strokeStyle = typed > 0.5 ? D.NIGHT : D.MUT; X.lineWidth = 6; X.lineCap = 'round'; X.lineJoin = 'round';
    X.beginPath(); X.moveTo(sx, sy + 16); X.lineTo(sx, sy - 16); X.moveTo(sx - 13, sy - 3); X.lineTo(sx, sy - 16); X.lineTo(sx + 13, sy - 3); X.stroke();
    // الكلام كلمة كلمة (الحروف تبقى متصلة)
    const L = ctx.text.layout(X, WORDS.join(' '), { family: 'display', weight: 700, size: 56 });
    const boxes = ctx.text.drawLayout(X, L, bx + bw - 50, sy + 20, { align: 'right', perWord: (i) => {
      const s = WT[i], kk = ctx.at(lt, s, s + 0.12, 'linear');
      return kk <= 0 ? { skip: true } : { reveal: kk, color: D.INK, alpha: lt > ENTER + 0.2 ? 1 - ctx.at(lt, ENTER + 0.2, ENTER + 0.6) : 1 };
    } });
    // مؤشر يرمش
    let cxp = bx + bw - 50; WORDS.forEach((w, i) => { if (lt >= WT[i] + 0.12 && boxes && boxes[i]) cxp = boxes[i].x - 10; });
    const blink = (Math.floor(lt * 2.2) % 2 === 0 || (lt > WT[0] - 0.1 && lt < WT[2] + 0.4)) ? 1 : 0;
    if (lt < ENTER) { X.fillStyle = D.SKY; X.globalAlpha = show * blink; X.fillRect(cxp - 5, sy - 32, 5, 60); }
    X.restore();
    // ومضة الإرسال
    const fl = Math.exp(-Math.max(0, lt - ENTER) * 6) * (lt >= ENTER ? 1 : 0);
    if (fl > 0.01) { X.save(); X.globalCompositeOperation = 'lighter'; X.fillStyle = `rgba(46,196,240,${(0.12 * fl).toFixed(3)})`; X.fillRect(0, 0, 1080, 1920); X.restore(); }
  };
  MOTION.scene({ id: 's5_type', draw(t, lt, ctx) { D.typeFrame(ctx.X, ctx, lt); } });
})();
