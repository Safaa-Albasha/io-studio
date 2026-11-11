/* ── المشهد 8 · بلا كاميرا. بلا وجه. بلا مونتاج. ─────────────────────────────── */
MOTION.scene({
  id: 's8_without',
  draw(t, lt, ctx) {
    const { X } = ctx, D = D3;
    D.bg(X, ctx);
    D.dust(X, ctx, t, 40, 0.15, 21);
    const out = 3.1;
    D.line(X, ctx, 'بلا كاميرا.', 540, 780, 0.2, { t: lt, size: 104, weight: 800, out });
    D.line(X, ctx, 'بلا وجه.', 540, 920, 0.9, { t: lt, size: 104, weight: 800, out: out + 0.05 });
    D.line(X, ctx, 'بلا مونتاج.', 540, 1060, 1.6, { t: lt, size: 104, weight: 800, out: out + 0.1, accent: [1] });
  },
});
