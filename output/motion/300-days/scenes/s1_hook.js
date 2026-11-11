/* ── أدوات مشتركة لكل الفيلم (هذا أول ملف ينحمّل) ───────────────────────────── */
(function () {
  const TAU = Math.PI * 2;
  const D = (globalThis.D3 = {});
  D.SKY = '#2EC4F0'; D.NIGHT = '#0E1014'; D.SURF = '#161A21'; D.LINE = '#2A2F38'; D.EMBER = '#FF5A36'; D.SOFT = '#ADB3BD'; D.MUT = '#8A8F99'; D.INK = '#F7F8FA';

  D.bg = (X, ctx, c) => { X.fillStyle = c || D.NIGHT; X.fillRect(0, 0, ctx.W, ctx.H); };

  // دقة قلب «لب-دب»: 1 عالضربة وتخف. period = ثواني بين الدقات
  D.heart = (t, period = 1.0, t0 = 0) => {
    if (t < t0) return 0;
    const ph = ((t - t0) % period);
    return Math.exp(-ph * 16) + 0.6 * Math.exp(-Math.max(0, ph - 0.18) * 16) * (ph > 0.18 ? 1 : 0);
  };

  // نقطة الفكرة — قلب أبيض، هالة سماوية. k = الإضاءة 0..1
  D.dot = (X, x, y, r, k, halo = 1) => {
    if (k <= 0.001 || r <= 0.2) return;
    X.save();
    X.globalCompositeOperation = 'lighter';
    const R = r * (5 + 3 * k) * halo;
    let g = X.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, `rgba(46,196,240,${0.55 * k})`);
    g.addColorStop(0.25, `rgba(46,196,240,${0.18 * k})`);
    g.addColorStop(1, 'rgba(46,196,240,0)');
    X.fillStyle = g; X.beginPath(); X.arc(x, y, R, 0, TAU); X.fill();
    g = X.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${Math.min(1, 0.25 + k)})`);
    g.addColorStop(0.55, `rgba(160,232,252,${0.9 * k + 0.1})`);
    g.addColorStop(1, `rgba(46,196,240,${0.6 * k})`);
    X.fillStyle = g; X.beginPath(); X.arc(x, y, r, 0, TAU); X.fill();
    X.restore();
  };

  // غبار خفيف بالهوا («NOISE»)
  D.dust = (X, ctx, t, n = 70, alpha = 0.35, seed = 7) => {
    X.save();
    for (let i = 0; i < n; i++) {
      const bx = ctx.hash01(i, seed) * 1080, by = ctx.hash01(i, seed + 1) * 1920;
      const x = bx + 40 * ctx.noise1(t * 0.15 + i, seed), y = (by - t * (8 + 14 * ctx.hash01(i, seed + 2)) + 1920 * 4) % 1920;
      const a = alpha * (0.3 + 0.7 * ctx.hash01(i, seed + 3)) * (0.6 + 0.4 * Math.sin(t * 1.3 + i));
      X.fillStyle = `rgba(173,179,189,${a.toFixed(3)})`;
      X.beginPath(); X.arc(x, y, 1 + 2 * ctx.hash01(i, seed + 4), 0, TAU); X.fill();
    }
    X.restore();
  };

  // كرت ملاحظة — نفس الشكل بالمشهد 2 و4 و7 (القطع المطابق)
  // o: {title, date, dotK, t, alpha, thumb:(X,x,y,w,h)=>{}, check:0..1, h}
  D.card = (X, ctx, cx, cy, w, h, o = {}) => {
    const x = cx - w / 2, y = cy - h / 2, a = o.alpha ?? 1;
    if (a <= 0.003) return;
    X.save(); X.globalAlpha = a;
    X.fillStyle = D.SURF; X.strokeStyle = o.border || D.LINE; X.lineWidth = 3;
    X.beginPath(); X.roundRect(x, y, w, h, 34); X.fill(); X.stroke();
    const pad = 54, tx = x + w - pad;
    const ty = o.thumb ? y + 110 : cy - 16;
    ctx.text(X, o.title || '', tx, ty, { family: 'display', weight: 700, size: 54, color: D.INK, align: 'right' });
    ctx.text(X, o.date || '', tx, ty + 62, { family: 'body', weight: 400, size: 34, color: D.MUT, align: 'right' });
    if (o.thumb) o.thumb(X, x + 34, y + 34, (h - 68) * 9 / 16, h - 68);
    else if (o.dotK != null) D.dot(X, x + 92, cy, 15, o.dotK);
    if (o.check > 0.001) {
      const k = o.check, px = tx, py = ty + 150, bw = 330, bh = 70;
      X.globalAlpha = a * k;
      X.fillStyle = 'rgba(46,196,240,0.14)'; X.strokeStyle = D.SKY; X.lineWidth = 2;
      X.beginPath(); X.roundRect(px - bw, py - bh / 2 + (1 - k) * 20, bw, bh, 35); X.fill(); X.stroke();
      ctx.text(X, '✓ صارت فيلم', px - bw / 2, py + 12 + (1 - k) * 20, { family: 'display', weight: 700, size: 36, color: D.SKY });
    }
    X.restore();
  };

  // نص قصة: يطلع كلمة كلمة من خط القاعدة، ويقعد، ويطلع بهدوء
  D.line = (X, ctx, str, x, y, s, o = {}) => {
    const { t } = o, size = o.size || 66, out = o.out ?? 1e9;
    const L = ctx.text.layout(X, str, { family: 'display', weight: o.weight || 700, size, maxWidth: o.maxWidth || 900, lineHeight: 1.25 });
    const ko = ctx.at(t, out, out + 0.4, 'sineInOut');
    if (ko >= 1 || t < s - 0.05) return;
    ctx.text.drawLayout(X, L, x, y, { align: o.align || 'center', perWord: (i) => {
      const k = ctx.at(t, s + i * (o.stagger ?? 0.12), s + i * (o.stagger ?? 0.12) + 0.45, 'expoOut');
      return { clipUp: 1, dy: (1 - k) * size * 0.9 - ko * 30, alpha: (k > 0 ? 1 : 0) * (1 - ko), color: (o.accent || []).includes(i) ? D.SKY : (o.color || D.INK) };
    } });
  };
})();

/* ── المشهد 1 · الهوك: «هذي فكرة. عمرها 300 يوم.» ───────────────────────────── */
MOTION.scene({
  id: 's1_hook',
  draw(t, lt, ctx) {
    const { X } = ctx, D = D3;
    D.bg(X, ctx);
    D.dust(X, ctx, t, 60, 0.28);
    // الكاميرا تدخل بالنقطة بالآخر
    const push = ctx.at(lt, 2.9, 4.2, 'cubicIn');
    const hb = D.heart(lt, 1.0, 0.05);
    const r = (12 + 5 * hb) * (1 + 6.5 * push), k = Math.min(1, 0.55 + 0.45 * ctx.at(lt, 0, 0.8) + 0.25 * hb);
    const dy = ctx.lerp(1080, 960, push);
    D.dot(X, 540, dy, r, k);
    const fade = 1 - ctx.at(lt, 2.9, 3.5, 'cubicOut');
    X.save(); X.globalAlpha = fade;
    D.line(X, ctx, 'هذي فكرة.', 540, 700, 0.35, { t: lt, size: 92, weight: 800 });
    D.line(X, ctx, 'عمرها 300 يوم.', 540, 830, 1.35, { t: lt, size: 92, weight: 800, accent: [1] });
    X.restore();
    // ليبل تقني صغير مثل موقعك
    ctx.text(X, 't = 0', 150, 1480, { family: 'num', weight: 500, size: 26, color: D.MUT, dir: 'ltr', align: 'left', alpha: 0.7 * fade });
  },
});
