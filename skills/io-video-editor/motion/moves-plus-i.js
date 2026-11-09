/* ═══ moves-plus-i.js — بنك الحركات 329–352 (I/O Studio) · باقة «كولاج تحريري» ═══
   نفس العقد: FX.<اسم>(ctx, t, o) بإحداثيات 1080×1920، كل شي من t، الألوان من ctx.P، والأدوات من moves-plus-g.js (FX._g · FX.icon · FX.placeAt). لازم ينحمّل بعد moves-plus-h.js.
   أسلوب الكولاج التحريري: ورق فاتح بفينيت، خط سيرف كبير، لون مميز واحد، وأشياء مقصوصة — كلها مرسومة بالكود (الصور اختيارية).
     329 accentBeam · 330 sliceBand · 331 puzzleJoin · 332 editorialDecor · 333 trackedReveal · 334 showcaseGrid
     335 indexTable · 336 effectCard («N مؤثر»: فهرس بعمودين وكرت الفيديو بعدّاد واسم) · 337 pinnedKeyword (كلمة التعليق ثابتة والكلام فوقها يتبدّل)
     338 bilingualCaption · 339 glassTags · 340 sourceCard · 341 wordSlate (ريل المتكلم: كابشن بلغتين، وسوم زجاج، كرت المصدر، لوحات كلمة)
     342 iconJiggle · 343 colorSlider · 344 eyedropper (أدوات واجهة: أيقونات ترجف وتنحذف، سلايدر ألوان، قطّارة)
     345 hookBanner · 346 appBadge (بانر عنوان الهوك وشارة التطبيق)
     347 docuScene · 348 selectBox · 349 fadeNumber · 350 squareLabel · 351 showcaseFrame · 352 starSting («وثائقي مقصوص»)
   الكتالوج: motion/moves/catalog-plus-i.json · المعاينات: previews/329–352.mp4 (render-preview-i.js). */
(function () {
  const G = typeof window !== 'undefined' ? window : globalThis;
  const FX = (G.FX = G.FX || {});
  const U = FX._g; if (!U) return;
  const { cl, pr, lerp, pick, cOut, cIn, ioC, bOut, h2, rgba, mixC, lum, isAr, pal, fam, T, tw, rr, shd, noShd, env, withE, imgOf, drawSrc, off, TAU, ON, FAM, fakeSrc, ptOf, typed } = U;
  const SERIF = 'Aref Ruqaa';

  /* 329 شعاع اللون — دايرة بلون مميز تطلع من نقطة، ومنها شعاع (إسفين) مايل ينفتح لين يطلع برّا الإطار، وظل شخص صغير يمشي جوّا الدايرة (أو أي رسمة o.figure).
     o: {s, out, at:[x,y] (أو anchor/track), r=150, angle=-35 (درجة اتجاه الشعاع), spread=22 (عرض الإسفين بالدرجات), color=P.acc, figure:(X,x,y,size)=>{} | false} */
  FX.accentBeam = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), at = ptOf(FX.placeAt(o, t, 'at', null) || FX.placeAt(o, t, 'anchor', [300, 1500])), R = o.r || 150, col = o.color || c.acc;
    const ko = o.out != null ? 1 - cOut(pr(t, o.out, o.out + 0.3)) : 1, kc = bOut(pr(t, s, s + 0.35), 1.5), kb = ioC(pr(t, s + 0.2, s + 0.9)); if (kc <= ON || ko <= ON) return;
    const an = pick(o, 'angle', -35) * Math.PI / 180, sp = pick(o, 'spread', 22) * Math.PI / 180, L = 2600 * kb;
    X.save(); X.globalAlpha *= ko; X.fillStyle = col;
    if (kb > 0) { X.beginPath(); X.moveTo(at[0] + Math.cos(an + Math.PI / 2) * R * 0.9, at[1] + Math.sin(an + Math.PI / 2) * R * 0.9);
      X.lineTo(at[0] + Math.cos(an + sp / 2) * L, at[1] + Math.sin(an + sp / 2) * L); X.lineTo(at[0] + Math.cos(an - sp / 2) * L, at[1] + Math.sin(an - sp / 2) * L);
      X.lineTo(at[0] + Math.cos(an - Math.PI / 2) * R * 0.9, at[1] + Math.sin(an - Math.PI / 2) * R * 0.9); X.closePath(); X.fill(); }
    X.beginPath(); X.arc(at[0], at[1], R * kc, 0, TAU); X.fill();
    if (o.figure !== false) { const fx = at[0] + Math.sin((t - s) * 1.4) * R * 0.15, fy = at[1] + R * 0.35, sz = R * 0.9;
      if (typeof o.figure === 'function') o.figure(X, fx, fy, sz); else {   // ظل شخص يمشي (مرسوم)
        const ph = (t - s) * 6, ink = c.inkD; X.fillStyle = ink; X.strokeStyle = ink; X.lineCap = 'round';
        X.beginPath(); X.arc(fx, fy - sz * 0.78, sz * 0.09, 0, TAU); X.fill(); X.lineWidth = sz * 0.13; X.beginPath(); X.moveTo(fx, fy - sz * 0.66); X.lineTo(fx + sz * 0.03, fy - sz * 0.3); X.stroke();
        X.lineWidth = sz * 0.08; [1, -1].forEach(sg => { X.beginPath(); X.moveTo(fx + sz * 0.03, fy - sz * 0.3); X.lineTo(fx + sg * Math.sin(ph) * sz * 0.16, fy); X.stroke(); X.beginPath(); X.moveTo(fx, fy - sz * 0.6); X.lineTo(fx - sg * Math.sin(ph) * sz * 0.14, fy - sz * 0.35); X.stroke(); });
        X.globalAlpha *= 0.3; X.beginPath(); X.ellipse(fx + sz * 0.25, fy + 4, sz * 0.3, sz * 0.05, 0.3, 0, TAU); X.fill(); } }
    X.restore(); };

  /* 330 قطعة ملوّنة — الصورة (أو الرسمة o.draw) تنقص على خط مايل، النصين ينزاحون شوي على طول الخط، ويطلع بالشق شريط بلون مميز — للتناقض «غني أو فقير».
     o: {s, out, draw (Y)=>{} يرسم الشي بمكانه بالإطار, box:{x,y,w,h} (منطقة القص), angle=70 (درجة), gap=60, shift=40, color=P.acc, label (كلمة على الشريط), labelTop ('*كلمة*' فوق), labelBottom} */
  FX.sliceBand = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), f = fam(o), B = o.box || { x: 240, y: 560, w: 600, h: 780 }, col = o.color || c.acc;
    const draw = o.draw || (Y => { const g = Y.createLinearGradient(B.x, B.y, B.x + B.w, B.y + B.h); g.addColorStop(0, mixC(c.bg, '#FFFFFF', 0.5)); g.addColorStop(1, mixC(c.inkD, c.bg, 0.55)); Y.fillStyle = g;
      Y.beginPath(); Y.ellipse(B.x + B.w / 2, B.y + B.h * 0.38, B.w * 0.3, B.h * 0.33, 0, 0, TAU); Y.fill(); Y.beginPath(); Y.moveTo(B.x + B.w * 0.15, B.y + B.h); Y.quadraticCurveTo(B.x + B.w / 2, B.y + B.h * 0.55, B.x + B.w * 0.85, B.y + B.h); Y.fill(); });
    const e = env(t, s - 0.4, o.out, { din: 0.3 }); if (e.o <= ON) return; const k = ioC(pr(t, s, s + 0.5)), an = pick(o, 'angle', 70) * Math.PI / 180, gap = pick(o, 'gap', 90) * k, sh = pick(o, 'shift', 40) * k;
    const cx = B.x + B.w / 2, cy = B.y + B.h / 2, dx = Math.cos(an), dy = Math.sin(an), nx = -dy, ny = dx, Lx = 2000;
    withE(X, e, cx, cy, () => {
      const half = (sg) => { X.save(); X.beginPath(); X.moveTo(cx - dx * Lx, cy - dy * Lx); X.lineTo(cx + dx * Lx, cy + dy * Lx); X.lineTo(cx + dx * Lx + nx * Lx * sg, cy + dy * Lx + ny * Lx * sg); X.lineTo(cx - dx * Lx + nx * Lx * sg, cy - dy * Lx + ny * Lx * sg); X.closePath(); X.clip();
        X.translate(nx * gap / 2 * sg + dx * sh * sg, ny * gap / 2 * sg + dy * sh * sg); draw(X); X.restore(); };
      half(1); half(-1);
      if (gap > 1) { X.save(); X.fillStyle = col; X.beginPath(); const w = gap * 0.9; X.moveTo(cx - dx * B.h * 0.55 + nx * w / 2, cy - dy * B.h * 0.55 + ny * w / 2); X.lineTo(cx + dx * B.h * 0.55 + nx * w / 2, cy + dy * B.h * 0.55 + ny * w / 2);
        X.lineTo(cx + dx * B.h * 0.55 - nx * w / 2, cy + dy * B.h * 0.55 - ny * w / 2); X.lineTo(cx - dx * B.h * 0.55 - nx * w / 2, cy - dy * B.h * 0.55 - ny * w / 2); X.closePath(); X.fill(); X.restore(); }
      if (o.labelTop) { const kt = cOut(pr(t, s + 0.3, s + 0.6)); if (kt > ON) { const str = o.labelTop.replace(/\*/g, ''), w = tw(ctx, X, str, 48, 700, SERIF) + 50; X.save(); X.globalAlpha *= kt; X.fillStyle = col; rr(X, cx - w / 2, B.y - 30, w * kt, 70, 6); X.fill();
        T(ctx, X, str, cx, B.y + 20, 48, { family: SERIF, weight: 700, color: c.on }); X.restore(); } }
      if (o.labelBottom) { const kb2 = cOut(pr(t, s + 0.5, s + 0.8)); if (kb2 > ON) U.rich(ctx, X, o.labelBottom, cx, B.y + B.h + 70, 44, { color: c.ink, pill: c.inkD, onPill: c.bg, weight: 800, family: f, alpha: kb2 }); } }); };

  /* 331 قطعتين بزل يتركّبون — قطعة غامقة وقطعة باللون المميز (بلسان وتجويف) تدخل من الجنبين وتلزق ببعض بنطّة، ويطلع فوقها/تحتها كلام بإطار سطور.
     o: {s, out, x=540, y=960, size=260, colors:[غامق, مميز], top='Some *SPEND* it', bottom, gapOpen=420} */
  const piecePath = (X, S, tabR, tabL) => {   // مربع فيه لسان يمين (tabR=+1) أو تجويف (−1)، ونفس الشي يسار — والفوق/التحت ألسنة ثابتة
    const s2 = S / 2, n = S * 0.18; X.beginPath(); X.moveTo(-s2, -s2);
    X.lineTo(-n, -s2); X.arc(0, -s2, n, Math.PI, 0, false); X.lineTo(s2, -s2);
    X.lineTo(s2, -n); X.arc(s2, 0, n, -Math.PI / 2, Math.PI / 2, tabR < 0); X.lineTo(s2, s2);
    X.lineTo(n, s2); X.arc(0, s2, n, 0, Math.PI, true); X.lineTo(-s2, s2);
    X.lineTo(-s2, n); X.arc(-s2, 0, n, Math.PI / 2, -Math.PI / 2, tabL > 0); X.closePath(); };
  FX.puzzleJoin = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), f = fam(o), x = pick(o, 'x', 540), y = pick(o, 'y', 960), S = o.size || 260;
    const cols = o.colors || [c.inkD, c.acc], ko = o.out != null ? 1 - cOut(pr(t, o.out, o.out + 0.3)) : 1, ki = cOut(pr(t, s, s + 0.3)); if (ki * ko <= ON) return;
    const kj = bOut(pr(t, s + 0.3, s + 0.85), 1.6), gapO = pick(o, 'gapOpen', 420), dxp = lerp(gapO, 0, kj) / 2, hit = Math.exp(-((t - s - 0.75) ** 2) / 0.002);
    X.save(); X.globalAlpha *= ki * ko;
    [[-1, cols[0], 1, -1], [1, cols[1], 1, -1]].forEach(([sg, col, tr, tl], i) => { X.save(); X.translate(x + sg * (S / 2 + dxp + S * 0.02), y + (i ? -6 * hit : 6 * hit)); X.rotate(sg * 0.04 * (1 - kj));
      shd(X, 18, 8, 0.3); X.fillStyle = col; piecePath(X, S, i ? 1 : 1, i ? -1 : -1); X.fill(); noShd(X); X.restore(); });
    const label = (str, yy, kk) => { if (!str || kk <= ON) return; const plain = str.replace(/\*/g, ''), w = tw(ctx, X, plain, 40, 600, 'num') + 40, x0 = x - S * 0.5;
      X.save(); X.globalAlpha *= kk; X.strokeStyle = c.ink; X.lineWidth = 2; X.beginPath(); X.moveTo(x0 - 30, yy + 20); X.lineTo(x0 + w + 80, yy + 20); X.lineTo(x0 + w + 80, yy + (yy < y ? 110 : -90)); X.stroke();
      U.rich(ctx, X, str, x0 + w / 2 + 20, yy, 40, { color: c.ink, pill: c.acc, onPill: c.on, weight: 600, family: isAr(str) ? f : 'num' }); X.restore(); };
    label(o.top == null ? 'Some *SPEND* it' : o.top, y - S * 0.95, cOut(pr(t, s + 0.6, s + 0.9))); label(o.bottom, y + S * 1.05, cOut(pr(t, s + 0.8, s + 1.1)));
    X.restore(); };

  /* 332 زخرفة تحريرية — عدّة الكولاج: ورق بفينيت، شبكة نقاط/صلبان، باركود، علامات زوايا «+»، فقرة نص صغيرة، وأرقام مقاس — تطلع بالتتابع حول المحتوى.
     o: {s, out, paper=true, grid:{x,y,w,h,step}|false, barcode:{x,y,w,h}|false, marks=true, copy (نص الفقرة)|false, copyAt:[x,y], code='№ 07'} */
  FX.editorialDecor = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), f = fam(o), ko = o.out != null ? 1 - cOut(pr(t, o.out, o.out + 0.3)) : 1;
    const paper = c.dark ? mixC(c.bg, '#FFFFFF', 0.06) : mixC(c.bg, '#FFFFFF', 0.25), ink = c.dark ? c.ink : c.inkD;
    if (o.paper !== false) { X.fillStyle = paper; X.fillRect(0, 0, 1080, 1920); const v = X.createRadialGradient(540, 860, 300, 540, 960, 1250); v.addColorStop(0, rgba('#000000', 0)); v.addColorStop(1, rgba('#000000', c.dark ? 0.55 : 0.32)); X.fillStyle = v; X.fillRect(0, 0, 1080, 1920);
      for (let i = 0; i < 900; i++) { X.fillStyle = rgba(ink, 0.025 + 0.03 * h2(i, 9)); X.fillRect(h2(i, 1) * 1080, h2(i, 2) * 1920, 2, 2); } }
    if (ko <= ON) return; X.save(); X.globalAlpha *= ko; X.strokeStyle = rgba(ink, 0.35); X.fillStyle = rgba(ink, 0.35);
    const g = o.grid === false ? null : Object.assign({ x: 220, y: 760, w: 640, h: 520, step: 64 }, o.grid || {}), kg = cOut(pr(t, s, s + 0.6));
    if (g && kg > ON) { const cols = Math.floor(g.w / g.step), rows = Math.floor(g.h / g.step); X.lineWidth = 1.5;
      for (let i = 0; i <= cols; i++) for (let j = 0; j <= rows; j++) { const kk = cl(kg * (cols + rows) - (i + j) * 0.5); if (kk <= 0) continue; const px = g.x + i * g.step, py = g.y + j * g.step, a = 7 * kk; X.beginPath(); X.moveTo(px - a, py); X.lineTo(px + a, py); X.moveTo(px, py - a); X.lineTo(px, py + a); X.stroke(); } }
    const bc = o.barcode === false ? null : Object.assign({ x: 70, y: 70, w: 300, h: 90 }, o.barcode || {}), kb = cOut(pr(t, s + 0.15, s + 0.55));
    if (bc && kb > ON) { X.save(); X.beginPath(); X.rect(bc.x, bc.y, bc.w * kb, bc.h); X.clip(); X.fillStyle = ink; let px = bc.x; for (let i = 0; px < bc.x + bc.w; i++) { const w = 2 + Math.floor(h2(i, 4) * 3) * 2; if (h2(i, 5) > 0.35) X.fillRect(px, bc.y, w, bc.h); px += w + 3; }
      T(ctx, X, String(o.code || '№ 07  ·  2026'), bc.x, bc.y + bc.h + 30, 20, { family: 'num', weight: 600, color: ink, align: 'left', alpha: 0.7 }); X.restore(); }
    if (o.marks !== false) { const km = cOut(pr(t, s + 0.2, s + 0.5)); X.save(); X.globalAlpha *= km; X.strokeStyle = rgba(ink, 0.6); X.lineWidth = 2; [[70, 260], [1010, 260], [70, 1660], [1010, 1660]].forEach(([px, py]) => { X.beginPath(); X.moveTo(px - 14, py); X.lineTo(px + 14, py); X.moveTo(px, py - 14); X.lineTo(px, py + 14); X.stroke(); }); X.restore(); }
    if (o.copy !== false) { const at = o.copyAt || [220, 1380], copy = o.copy || 'The concept is simple to state and hard to master: one idea, one frame, one accent colour, and everything else gets out of the way.', kc = pr(t, s + 0.3, s + 1.1);
      const L = ctx.text.layout ? ctx.text.layout(X, copy, { family: isAr(copy) ? f : 'num', weight: 500, size: 22, maxWidth: 620, lineHeight: 1.35 }) : null, lines = L ? L.lines.map(l => l.words.map(w => w.text).join(' ')) : [copy];
      lines.forEach((ln, i) => { const kk = cl(kc * lines.length - i); if (kk <= 0) return; const ar = isAr(ln); T(ctx, X, ln, ar ? at[0] + 620 : at[0], at[1] + i * 30, 22, { family: ar ? f : 'num', weight: 500, color: ink, align: ar ? 'right' : 'left', alpha: 0.75 * kk }); }); }
    X.restore(); };

  /* 333 كلمة متباعدة — كلمة سيرف بحروف كبيرة متباعدة تنكشف (لاتيني: حرف حرف والتباعد ينضم شوي؛ عربي: الكلمة كاملة تنكشف بقناع من اليمين لأن الحروف ما تنفصل)، وتحتها كلمة ثانية بتباعد أوسع، وسطر صغير مايل فوق.
     o: {s, out, text='WAITS', sub='P A G E' أو 'RETURNS', subColor=P.acc, lead='It never', y=900, size=110, spacing=0.35 (من حجم الخط), rate=0.08} */
  FX.trackedReveal = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), f = fam(o), str = String(o.text || 'WAITS'), y = pick(o, 'y', 900), size = o.size || 110, sp = pick(o, 'spacing', 0.35), rate = o.rate || 0.08;
    const e = env(t, s, o.out, { din: 0.3, bIn: 0, yIn: 0, sIn: 1 }); if (e.o <= ON) return; const col = o.color || c.ink, fam2 = o.family || (isAr(str) ? f : SERIF);
    withE(X, e, 540, y, () => { if (o.lead) T(ctx, X, o.lead, 540, y - size * 1.1, size * 0.3, { family: SERIF, weight: 400, color: col, alpha: cOut(pr(t, s, s + 0.4)) });
      const line = (txt, yy, sz, spc, t0, colr) => { if (isAr(txt)) { const w = tw(ctx, X, txt, sz, 700, f), k = cOut(pr(t, t0, t0 + 0.5)); X.save(); X.beginPath(); X.rect(540 + w / 2 + 20 - (w + 40) * k, yy - sz, (w + 40) * k, sz * 1.4); X.clip(); T(ctx, X, txt, 540, yy, sz, { family: f, weight: 700, color: colr }); X.restore(); return; }
        const ch = [...txt], W = ch.map(q => tw(ctx, X, q, sz, 700, fam2)), gapF = sz * spc * lerp(1.4, 1, cOut(pr(t, t0, t0 + ch.length * rate + 0.4))), tot = W.reduce((a, b) => a + b, 0) + gapF * (ch.length - 1); let x = 540 - tot / 2;
        ch.forEach((q, i) => { const k = cOut(pr(t, t0 + i * rate, t0 + i * rate + 0.25)); if (k > ON) T(ctx, X, q, x + W[i] / 2, yy + 10 * (1 - k), sz, { family: fam2, weight: 700, color: colr, alpha: k }); x += W[i] + gapF; }); };
      line(str, y, size, sp, s + 0.1, col); if (o.sub) line(o.sub, y + size * 0.95, size * (/^(\S\s)+\S$/.test(o.sub) ? 0.32 : 0.75), o.sub.includes(' ') && !isAr(o.sub) ? 0.2 : sp, s + 0.1 + [...str].length * rate + 0.2, o.subColor || P.acc); }); };

  /* 334 شبكة عرض — كروت جوال (2 فوق وواحد تحت متداخل، أو صف) على أرضية غامقة، كل كرت يشغّل مقطعه، وفوقها عنوان بسطر مزخرف صغير وسطر عريض — للعرض «شوف الستايلات».
     o: {s, out, items:[(Y)=>{} | img], layout='stagger'|'row', lead='Premium', title='Motion Graphics', radius=34} */
  FX.showcaseGrid = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), f = fam(o), items = o.items || [fakeSrc(P, 41), fakeSrc(P, 42), fakeSrc(P, 43)], lay = o.layout || 'stagger', rad = pick(o, 'radius', 34);
    const ko = o.out != null ? 1 - cOut(pr(t, o.out, o.out + 0.3)) : 1; X.fillStyle = mixC(c.inkD, '#000000', 0.55); X.fillRect(0, 0, 1080, 1920); if (ko <= ON) return; X.save(); X.globalAlpha *= ko;
    const tk = cOut(pr(t, s, s + 0.4)), ar = isAr((o.title || '') + (o.lead || '')), tx = ar ? 960 : 120, al = ar ? 'right' : 'left';
    if (o.lead !== false) T(ctx, X, o.lead || 'Premium', tx, 240 - 20 * (1 - tk), 64, { family: SERIF, weight: 400, color: mixC(c.acc, '#FFFFFF', 0.55), align: al, alpha: tk });
    T(ctx, X, o.title || 'Motion Graphics', tx, 350 - 20 * (1 - tk), 104, { family: f, weight: 800, color: mixC(c.acc, '#FFFFFF', 0.55), align: al, alpha: tk });
    const R = lay === 'row' ? items.map((_, i) => ({ x: 60 + i * (960 / items.length), y: 520, w: 960 / items.length - 30, h: (960 / items.length - 30) * 16 / 9 }))
      : [{ x: 60, y: 470, w: 420, h: 746 }, { x: 560, y: 470, w: 420, h: 726 }, { x: 300, y: 1140, w: 400, h: 711 }].slice(0, items.length);
    items.forEach((src, i) => { const r = R[i]; if (!r) return; const k = cOut(pr(t, s + 0.15 + i * 0.08, s + 0.55 + i * 0.08)); if (k <= ON) return;
      X.save(); X.globalAlpha *= k; X.translate(r.x + r.w / 2, r.y + r.h / 2 + 40 * (1 - k)); X.scale(lerp(0.94, 1, k), lerp(0.94, 1, k)); if (k < 1) X.filter = `blur(${(10 * (1 - k)).toFixed(1)}px)`;
      shd(X, 40, 18, 0.55); X.fillStyle = '#000000'; rr(X, -r.w / 2, -r.h / 2, r.w, r.h, rad); X.fill(); noShd(X); X.save(); rr(X, -r.w / 2, -r.h / 2, r.w, r.h, rad); X.clip(); drawSrc(ctx, X, src, -r.w / 2, -r.h / 2, r.w, r.h);
      const v = X.createRadialGradient(0, 0, r.w * 0.3, 0, 0, r.h * 0.75); v.addColorStop(0, rgba('#000000', 0)); v.addColorStop(1, rgba('#000000', 0.35)); X.fillStyle = v; X.fillRect(-r.w / 2, -r.h / 2, r.w, r.h); X.restore(); X.restore(); });
    X.restore(); };
  /* 335 فهرس بعمودين — جدول مرقّم (01…N) بعمودين فوق الشاشة، والبند الحالي يتظلل بشريط لون يتزحلق له مع كل مقطع، واللي خلص تطلع جنبه ✓.
     o: {items:[…], cues:[t…] أو s + every, x=60, y=150, w=960, size=22, rows (افتراضي نص العدد), title, out} */
  FX.indexTable = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), f = fam(o), s = pick(o, 's', 0);
    const items = o.items || ['Orbit', 'Couch wall', 'UI world', 'Frame break', 'Digital zoom', 'Phone mock-up', 'Checklist', 'Headline wall', 'Zoom-through cut', 'Chart grow', 'Pull-back reveal', 'Green screen', 'Paper cut', 'Doodle boil', 'Vertigo', 'Cover story', 'Glass type'];
    const n = items.length, rows = o.rows || Math.ceil(n / 2), cues = U.cuesOf(o, n, 1.1), cur = FX.cueIndex(cues, t), e = env(t, s - 0.3, o.out, { din: 0.3 }); if (e.o <= ON) return;
    const rtl = isAr(items.join('')), x0 = pick(o, 'x', 60), y0 = pick(o, 'y', 150), W = o.w || 960, cw = W / 2, size = o.size || 30, rh = size * 1.45, ink = c.ink;
    const pos = i => { const col = Math.floor(i / rows), row = i % rows, cx = rtl ? x0 + W - (col + 1) * cw : x0 + col * cw; return [cx, y0 + row * rh]; };
    withE(X, e, x0 + W / 2, y0 + rows * rh / 2, () => {
      if (o.title) T(ctx, X, o.title, rtl ? x0 + W : x0, y0 - size * 1.2, size * 1.2, { family: f, weight: 800, color: ink, align: rtl ? 'right' : 'left' });
      if (cur >= 0) { const prv = pos(Math.max(0, cur - 1)), now = pos(cur), k = ioC(pr(t, cues[cur], cues[cur] + 0.25)), hx = cur ? lerp(prv[0], now[0], k) : now[0], hy = cur ? lerp(prv[1], now[1], k) : now[1];
        X.fillStyle = rgba(c.acc, 0.2); rr(X, hx, hy - size * 1.05, cw * 0.62, rh * 0.95, 4); X.fill(); X.fillStyle = c.acc; X.fillRect(rtl ? hx + cw * 0.62 - 4 : hx, hy - size * 1.05, 4, rh * 0.95); }
      items.forEach((it, i) => { const [px, py] = pos(i), act = i === cur, done = cur >= 0 && i < cur, al = rtl ? 'right' : 'left', bx = rtl ? px + cw * 0.62 - 10 : px + 10;
        T(ctx, X, String(i + 1).padStart(2, '0'), bx, py, size * 0.8, { family: 'num', weight: 600, color: act ? c.acc : c.mut, align: al });
        T(ctx, X, it + (done ? ' ✓' : ''), rtl ? bx - size * 1.6 : bx + size * 1.6, py, size, { family: f, weight: act ? 800 : 500, color: act ? ink : mixC(ink, c.bg, done ? 0.35 : 0.15), align: al }); }); }); };

  /* 336 كرت المؤثر — كرت فيديو بزوايا دائرية بالنص على ورق بشبكة خفيفة، فوق يساره شارة «NN/المجموع»، وتحته كبسولة باسم المؤثر، وصورة صغيرة بدايرة بالزاوية؛ مع كل مقطع الكليب يتبدّل بغباش.
     o: {clips:[(Y)=>{}|img], names:[…], cues:[t…] أو s + every, total, avatar (img), box:{x,y,w,h}, grid=true, out} */
  FX.effectCard = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), f = fam(o), s = pick(o, 's', 0), names = o.names || ['Orbit', 'Couch wall', 'UI world', 'Frame break'], n = names.length;
    const clips = o.clips || names.map((_, i) => fakeSrc(P, 50 + i)), cues = U.cuesOf(o, n, 1.1), cur = Math.max(0, FX.cueIndex(cues, t)), B = o.box || { x: 210, y: 620, w: 660, h: 1120 }, total = o.total || n;
    if (o.grid !== false) { const paper = c.dark ? c.bg : mixC(c.bg, '#FFFFFF', 0.7); X.fillStyle = paper; X.fillRect(0, 0, 1080, 1920); X.fillStyle = rgba(c.dark ? c.ink : c.inkD, 0.05); for (let x = 0; x < 1080; x += 40) X.fillRect(x, 0, 1, 1920); for (let y = 0; y < 1920; y += 40) X.fillRect(0, y, 1080, 1); }
    const e = env(t, s - 0.3, o.out, { din: 0.35 }); if (e.o <= ON) return; const kx = cur > 0 ? pr(t, cues[cur], cues[cur] + 0.3) : 1;
    withE(X, e, B.x + B.w / 2, B.y + B.h / 2, () => { shd(X, 40, 16, c.dark ? 0.5 : 0.18); X.fillStyle = '#FFFFFF'; rr(X, B.x - 10, B.y - 10, B.w + 20, B.h + 20, 40); X.fill(); noShd(X);
      X.save(); rr(X, B.x, B.y, B.w, B.h, 32); X.clip(); if (kx < 1 && cur > 0) { X.save(); X.filter = `blur(${(24 * kx).toFixed(1)}px)`; drawSrc(ctx, X, clips[(cur - 1) % clips.length], B.x, B.y, B.w, B.h); X.restore(); X.globalAlpha *= kx; if (kx < 1) X.filter = `blur(${(24 * (1 - kx)).toFixed(1)}px)`; }
      drawSrc(ctx, X, clips[cur % clips.length], B.x, B.y, B.w, B.h); X.restore();
      const num = `${String(cur + 1).padStart(2, '0')}/${total}`, nw = tw(ctx, X, num, 22, 700, 'num') + 26; X.fillStyle = rgba('#000000', 0.55); rr(X, B.x + 22, B.y + 22, nw, 40, 20); X.fill(); T(ctx, X, num, B.x + 22 + nw / 2, B.y + 49, 22, { family: 'num', weight: 700, color: '#FFFFFF' });
      const nm = names[cur] || '', kl = bOut(pr(t, cur > 0 ? cues[cur] : s, (cur > 0 ? cues[cur] : s) + 0.3), 1.6), lw = tw(ctx, X, nm, 30, 700, f) + 50; X.save(); X.translate(B.x + B.w / 2, B.y + B.h - 20); X.scale(kl, kl); X.fillStyle = c.acc; rr(X, -lw / 2, -24, lw, 52, 26); X.fill(); T(ctx, X, nm, 0, 12, 30, { family: f, weight: 700, color: c.on }); X.restore();
      const ax = B.x + B.w + 70, ay = B.y + B.h - 10, im = imgOf(ctx, o.avatar); X.fillStyle = '#FFFFFF'; X.beginPath(); X.arc(ax, ay, 40, 0, TAU); X.fill(); X.strokeStyle = c.line; X.lineWidth = 2; X.stroke();
      X.save(); X.beginPath(); X.arc(ax, ay, 34, 0, TAU); X.clip(); if (im) U.drawCover(X, im, ax - 34, ay - 34, 68, 68); else { X.fillStyle = mixC(c.acc, c.inkD, 0.3); X.fillRect(ax - 34, ay - 34, 68, 68); } X.restore(); }); };
  /* 337 كلمة التعليق ثابتة — كلمة كبيرة بتدرّج من اللون المميز ثابتة (الكلمة اللي يكتبونها بالتعليقات)، وفوقها مقطع كلام صغير يتبدّل مع الصوت (2–4 كلمات).
     o: {s, out, word='STYLE', chunks:[{text, at}] أو lines:[…] + every=0.6, y=1240, size=150, pill=false (كبسولة زجاج غامقة ورا الكلمة), rays=false (خطوط ضربة تطلع من جنبها)} */
  FX.pinnedKeyword = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), f = fam(o), y = pick(o, 'y', 1240), size = o.size || 150, word = String(o.word || 'STYLE');
    const ch = o.chunks || (o.lines || ['Comment', 'below', "and I'll send you", 'the full list', 'the prompts.']).map((tx, i) => ({ text: tx, at: s + i * (o.every || 0.6) }));
    const ko = o.out != null ? 1 - cOut(pr(t, o.out, o.out + 0.25)) : 1, kw = bOut(pr(t, s, s + 0.35), 1.6); if (kw <= ON || ko <= ON) return; X.save(); X.globalAlpha *= ko;
    const i = FX.cueIndex(ch.map(q => q.at), t); if (i >= 0) { const q = ch[i], k = cOut(pr(t, q.at, q.at + 0.12)); T(ctx, X, q.text, 540, y - size * (o.pill ? 1.2 : 0.95) + 8 * (1 - k), size * 0.34, { family: f, weight: 800, color: '#FFFFFF', alpha: k, shadow: { color: 'rgba(0,0,0,.45)', blur: 12, y: 3 }, maxWidth: 940 }); }
    const w = tw(ctx, X, word, size, 900, f) + 40, { c: tc, Y } = off('pinkw', w, size * 1.5); T(ctx, Y, word, w / 2, size * 1.1, size, { family: f, weight: 900, color: '#FFFFFF' }); Y.globalCompositeOperation = 'source-in';
    const g = Y.createLinearGradient(0, size * 0.25, 0, size * 1.25); g.addColorStop(0, mixC(c.acc, '#FFFFFF', 0.25)); g.addColorStop(1, c.acc); Y.fillStyle = g; Y.fillRect(0, 0, w, size * 1.5);
    X.save(); X.translate(540, y - size * 0.35); X.scale(kw, kw);
    if (o.pill) { X.save(); X.fillStyle = rgba('#000000', 0.55); rr(X, -w / 2 - 20, -size * 0.7, w + 40, size * 1.15, size * 0.58); X.fill(); X.strokeStyle = rgba('#FFFFFF', 0.35); X.lineWidth = 3; X.stroke(); X.restore(); }
    if (o.rays) { const kr = pr(t, s + 0.15, s + 0.6); if (kr > 0 && kr < 1) { X.save(); X.strokeStyle = c.acc; X.lineCap = 'round'; X.lineWidth = 7 * (1 - kr); for (let j = 0; j < 5; j++) { const an = -0.7 + j * 0.35, r0 = w / 2 + 40 + 40 * kr; X.beginPath(); X.moveTo(Math.cos(an) * r0, Math.sin(an) * r0 * 0.8); X.lineTo(Math.cos(an) * (r0 + 50), Math.sin(an) * (r0 + 50) * 0.8); X.stroke(); } X.restore(); } }
    X.shadowColor = 'rgba(0,0,0,.4)'; X.shadowBlur = 16; X.shadowOffsetY = 6; X.drawImage(tc, -w / 2, -size * 0.75); X.restore(); X.restore(); };
  /* 338 كابشن بلغتين — الكلمة اللي تنقال الحين كبيرة بالنص (عربي، والمهمة باللون المميز)، وتحتها سطر الترجمة صغير وكلمته الحالية ملوّنة، ووراها نجمة صغيرة تلف.
     o: {words:[{w, at, hot}] (الكلمة الكبيرة) أو text + s + every=0.4, sub:[{text, at, hi}] (سطور الترجمة، hi = الكلمة الملوّنة), y=1270, size=96, spark=true, out} */
  FX.bilingualCaption = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), f = fam(o), s = pick(o, 's', 0), y = pick(o, 'y', 1270), size = o.size || 130;
    const words = o.words || String(o.text || 'كل واحد قاعد يمنتج فيديوهاته').split(/\s+/).map((w, i) => ({ w, at: s + i * (o.every || 0.4), hot: i === 3 }));
    const ko = o.out != null ? 1 - cOut(pr(t, o.out, o.out + 0.2)) : 1, i = FX.cueIndex(words.map(q => q.at), t); if (i < 0 || ko <= ON) return; const q = words[i], k = bOut(pr(t, q.at, q.at + 0.18), 1.8);
    X.save(); X.globalAlpha *= ko;
    if (o.spark !== false) { X.save(); X.globalAlpha *= 0.85 * cl(k); X.translate(540 + tw(ctx, X, q.w, size, 900, f) * 0.5 + 10, y - size * 0.55); X.rotate((t - s) * 1.5); FX.icon(X, 'gear', 0, 0, size * 0.45, { fill: c.acc }); X.restore(); }
    X.save(); X.translate(540, y - size * 0.3); X.scale(k, k); T(ctx, X, q.w, 0, size * 0.3, size, { family: f, weight: 900, color: q.hot ? c.acc : '#FFFFFF', shadow: { color: 'rgba(0,0,0,.55)', blur: 18, y: 4 }, maxWidth: 1000 }); X.restore();
    const sub = o.sub || [{ text: "Everyone's editing their videos", at: s, hi: 'editing' }], j = FX.cueIndex(sub.map(z => z.at), t); if (j >= 0) { const z = sub[j], parts = String(z.text).split(/\s+/), ss = size * 0.3, sp = ss * 0.3;
      const W = parts.map(w => tw(ctx, X, w, ss, 700, SERIF)), tot = W.reduce((a, b) => a + b, 0) + sp * (parts.length - 1), rtl = isAr(z.text); let x = rtl ? 540 + tot / 2 : 540 - tot / 2;
      parts.forEach((w, n) => { const ww = W[n]; T(ctx, X, w, rtl ? x - ww / 2 : x + ww / 2, y + size * 0.55, ss, { family: rtl ? f : SERIF, weight: 700, color: z.hi && w.replace(/[^\w؀-ۿ]/g, '') === z.hi ? c.acc : '#FFFFFF', shadow: { color: 'rgba(0,0,0,.5)', blur: 8, y: 2 } }); x += (rtl ? -1 : 1) * (ww + sp); }); }
    X.restore(); };

  /* 339 وسوم زجاج — كبسولات زجاج صغيرة (تغبيش وحد أبيض شفاف) تفرقع فوق جنب الراس وحدة ورا وحدة، وتقعد لين الطلعة — للكلمات المفتاحية جنب المتكلم.
     o: {tags:[{text, at, x, y}] أو items:[…] + s + every=0.4, y=260, out, size=34} */
  FX.glassTags = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), f = fam(o), s = pick(o, 's', 0), size = o.size || 40;
    const tags = o.tags || (o.items || ['نفس المهارة', 'نفس الأداة', 'تتميز؟']).map((tx, i) => ({ text: tx, at: s + i * (o.every || 0.4) }));
    const ko = o.out != null ? 1 - cOut(pr(t, o.out, o.out + 0.25)) : 1; if (ko <= ON) return; const rtl = isAr(tags.map(q => q.text).join(''));
    let xr = rtl ? 1040 : 40; tags.forEach((q, i) => { const w = tw(ctx, X, q.text, size, 700, f) + size * 1.4, h = size * 1.7, x = q.x != null ? q.x : (rtl ? xr - w : xr), y = q.y != null ? q.y : pick(o, 'y', 260); xr += (rtl ? -1 : 1) * (w + 14);
      const k = bOut(pr(t, q.at, q.at + 0.25), 1.8); if (k <= ON || t < q.at) return; X.save(); X.globalAlpha *= ko * cl(k * 2); X.translate(x + w / 2, y + h / 2); X.scale(k, k);
      X.fillStyle = rgba('#000000', 0.32); rr(X, -w / 2, -h / 2, w, h, h / 2); X.fill(); X.fillStyle = rgba('#FFFFFF', 0.1); X.fill(); X.strokeStyle = rgba('#FFFFFF', 0.5); X.lineWidth = 2; X.stroke();
      T(ctx, X, q.text, 0, size * 0.36, size, { family: f, weight: 700, color: '#FFFFFF', shadow: { color: 'rgba(0,0,0,.35)', blur: 6, y: 1 } }); X.restore(); }); };

  /* 340 كرت المصدر — كرت شاشة فوق (ثلث الشاشة تقريباً) بزوايا دائرية، فوق يساره كبسولة اسم الأداة بنقطة ملوّنة وتحته رابط صغير، والمحتوى يتبدّل بغباش مع كل بند.
     o: {items:[{src:(Y)=>{}|img, name, url, at}] أو s + every, box:{x,y,w,h} (افتراضي فوق), out} */
  FX.sourceCard = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), f = fam(o), s = pick(o, 's', 0), B = o.box || { x: 24, y: 40, w: 1032, h: 560 };
    const items = o.items || [{ name: 'Tool one', url: 'example.com/tool-one' }, { name: 'Tool two', url: 'example.com/tool-two' }, { name: 'Tool three', url: 'example.com/tool-three' }].map((q, i) => Object.assign(q, { src: fakeSrc(P, 60 + i), at: s + i * (o.every || 1.6) }));
    const i = FX.cueIndex(items.map(q => q.at), t); if (i < 0) return; const q = items[i], ko = o.out != null ? 1 - cOut(pr(t, o.out, o.out + 0.3)) : 1, kin = cOut(pr(t, q.at, q.at + 0.3)), kb = i > 0 ? 1 - kin : 0; if (ko <= ON) return;
    X.save(); X.globalAlpha *= ko * (i === 0 ? kin : 1); shd(X, 30, 12, 0.45); X.fillStyle = '#FFFFFF'; rr(X, B.x, B.y, B.w, B.h, 28); X.fill(); noShd(X);
    X.save(); rr(X, B.x, B.y, B.w, B.h, 28); X.clip(); if (kb > 0.02) { X.save(); X.filter = `blur(${(30 * (1 - kb)).toFixed(1)}px)`; X.globalAlpha *= kb; drawSrc(ctx, X, items[i - 1].src, B.x, B.y, B.w, B.h); X.restore(); }
    X.save(); if (kin < 1) X.filter = `blur(${(30 * (1 - kin)).toFixed(1)}px)`; X.globalAlpha *= i ? kin : 1; drawSrc(ctx, X, q.src, B.x, B.y, B.w, B.h); X.restore(); X.restore();
    const nm = String(q.name || ''), nw = tw(ctx, X, nm, 26, 700, 'num') + 70; X.fillStyle = rgba('#000000', 0.6); rr(X, B.x + 20, B.y + 20, nw, 46, 23); X.fill(); X.fillStyle = c.acc; X.beginPath(); X.arc(B.x + 44, B.y + 43, 11, 0, TAU); X.fill();
    T(ctx, X, nm, B.x + 64, B.y + 52, 26, { family: isAr(nm) ? f : 'num', weight: 700, color: '#FFFFFF', align: 'left' });
    if (q.url) { const uw = tw(ctx, X, q.url, 20, 600, 'num') + 30; X.fillStyle = rgba('#000000', 0.55); rr(X, B.x + 20, B.y + B.h - 56, uw, 36, 18); X.fill(); T(ctx, X, q.url, B.x + 35, B.y + B.h - 31, 20, { family: 'num', weight: 600, color: '#FFFFFF', align: 'left' }); }
    X.restore(); };

  /* 341 لوحات كلمة — قطع لسلسلة لوحات ملء الشاشة (خلفيتين بالتناوب: فاتحة دافية وغامقة من اللون)، كل لوحة كلمة عربية كبيرة، وكلاكيت مرسوم بالزاوية يطقّ مع كل لوحة.
     o: {s, words:['هذي خمس','مهارات','مونتاج'], every=0.5, colors:[فاتح, غامق], clapper=true, size=200, out (افتراضي آخر لوحة + every)} */
  const clapper = (X, x, y, S, open, c) => { X.save(); X.translate(x, y); X.rotate(-0.12); X.fillStyle = '#2A2A2A'; rr(X, -S / 2, -S * 0.15, S, S * 0.62, S * 0.05); X.fill();
    X.fillStyle = '#F2F2F2'; X.fillRect(-S / 2 + S * 0.06, -S * 0.02, S * 0.88, S * 0.07); X.fillRect(-S / 2 + S * 0.06, S * 0.12, S * 0.88, S * 0.05);
    X.save(); X.translate(-S / 2, -S * 0.15); X.rotate(-open * 0.5); const band = (yy) => { X.fillStyle = '#2A2A2A'; X.fillRect(0, yy - S * 0.15, S, S * 0.15); X.fillStyle = '#F2F2F2'; for (let k = 0; k < 5; k++) { X.beginPath(); X.moveTo(k * S * 0.2 + S * 0.05, yy - S * 0.15); X.lineTo(k * S * 0.2 + S * 0.14, yy - S * 0.15); X.lineTo(k * S * 0.2 + S * 0.08, yy); X.lineTo(k * S * 0.2 - S * 0.01, yy); X.closePath(); X.fill(); } };
    band(0); X.restore(); X.restore(); };
  FX.wordSlate = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), f = fam(o), s = pick(o, 's', 0), words = o.words || ['هذي خمس', 'مهارات', 'مونتاج'], ev = o.every || 0.5, z = pick(o, 'out', s + words.length * ev);
    if (t < s || t >= z) return; const i = Math.min(words.length - 1, Math.floor((t - s) / ev)), cols = o.colors || [mixC(c.acc, '#FFFFFF', 0.72), mixC(c.acc2 || c.acc, c.night, 0.55)], bg = cols[i % 2], ink = lum(bg) > 140 ? mixC(c.inkD, c.acc, 0.25) : '#FFFFFF';
    const g = X.createRadialGradient(540, 760, 100, 540, 960, 1300); g.addColorStop(0, mixC(bg, '#FFFFFF', 0.15)); g.addColorStop(1, mixC(bg, '#000000', 0.25)); X.fillStyle = g; X.fillRect(0, 0, 1080, 1920);
    const kz = cOut(pr(t, s + i * ev, s + i * ev + 0.2)); T(ctx, X, words[i], 540, 1030, (o.size || 200) * lerp(1.06, 1, kz), { family: f, weight: 900, color: ink, maxWidth: 980 });
    if (o.clapper !== false) { const lt = (t - s) - i * ev, open = lt < 0.12 ? 1 - lt / 0.12 : 0; clapper(X, 820, 430, 250, open, c); } };
  /* 342 أيقونات ترجف — صف أيقونات تطبيقات عامة (مربعات دائرية بلون ورمز من FX.icon) يطلع، يرجف مثل وضع الحذف، وبعدين أيقونة (أو أكثر) تنشطب بخط أحمر وتختفي بنفخة والباقي يتقارب.
     o: {s, out, icons:[{name, color}] (أسماء FX.icon), remove:[رقم…]=[0], x=540, y=330, size=130, jiggleAt (افتراضي s+0.4), removeAt (افتراضي s+1.2)} */
  FX.iconJiggle = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), size = o.size || 130, gap = size * 0.25;
    const icons = o.icons || [{ name: 'gear', color: U.hueRot(c.acc, 200) }, { name: 'star', color: c.acc }, { name: 'play', color: U.hueRot(c.acc, 120) }], rem = o.remove || [0], n = icons.length;
    const ja = pick(o, 'jiggleAt', s + 0.4), ra = pick(o, 'removeAt', s + 1.2), ko = o.out != null ? 1 - cOut(pr(t, o.out, o.out + 0.25)) : 1; if (t < s || ko <= ON) return;
    const keep = icons.map((_, i) => !rem.includes(i)), kr = ioC(pr(t, ra + 0.35, ra + 0.65)); let slots = 0; const posIdx = icons.map((_, i) => { const before = slots; if (keep[i]) slots++; return before; });
    const nk = keep.filter(Boolean).length, x0 = pick(o, 'x', 540), tot = n * size + (n - 1) * gap, tot2 = nk * size + (nk - 1) * gap;
    X.save(); X.globalAlpha *= ko; icons.forEach((ic, i) => { const k = bOut(pr(t, s + i * 0.06, s + 0.3 + i * 0.06), 1.8); if (k <= ON) return;
      const xa = x0 - tot / 2 + i * (size + gap) + size / 2, xb = keep[i] ? x0 - tot2 / 2 + posIdx[i] * (size + gap) + size / 2 : xa, x = lerp(xa, xb, kr), y = pick(o, 'y', 330);
      const jg = t >= ja ? Math.sin((t - ja) * 28 + i * 1.7) * 0.05 : 0, gone = !keep[i] ? cIn(pr(t, ra + 0.3, ra + 0.5)) : 0; if (gone >= 1) return;
      X.save(); X.translate(x, y); X.rotate(jg); X.scale(k * (1 - gone * 0.6), k * (1 - gone * 0.6)); X.globalAlpha *= 1 - gone; shd(X, 14, 5, 0.35); X.fillStyle = ic.color || c.acc; rr(X, -size / 2, -size / 2, size, size, size * 0.24); X.fill(); noShd(X);
      FX.icon(X, ic.name || 'star', 0, 0, size * 0.55, { fill: lum(ic.color || c.acc) > 160 ? '#151515' : '#FFFFFF' });
      if (!keep[i]) { const ks = cOut(pr(t, ra, ra + 0.2)); if (ks > 0) { X.strokeStyle = 'hsl(358,75%,59%)'; X.lineWidth = size * 0.1; X.lineCap = 'round'; X.beginPath(); X.moveTo(-size * 0.45, -size * 0.45); X.lineTo(-size * 0.45 + size * 0.9 * ks, -size * 0.45 + size * 0.9 * ks); X.stroke(); } }
      if (t >= ja && keep[i] === false && t < ra) { X.fillStyle = '#6B6B6B'; X.beginPath(); X.arc(-size / 2 + 6, -size / 2 + 6, size * 0.13, 0, TAU); X.fill(); X.strokeStyle = '#FFFFFF'; X.lineWidth = 3; X.beginPath(); X.moveTo(-size / 2 + 6 - 7, -size / 2 + 6); X.lineTo(-size / 2 + 6 + 7, -size / 2 + 6); X.stroke(); }
      X.restore();
      if (gone > 0 && gone < 1) for (let j = 0; j < 8; j++) { const a = j * TAU / 8, d = size * (0.4 + 0.5 * gone); X.save(); X.globalAlpha *= (1 - gone) * 0.7; X.fillStyle = mixC(c.bg, '#FFFFFF', 0.6); X.beginPath(); X.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, size * 0.1 * (1 - gone), 0, TAU); X.fill(); X.restore(); } });
    X.restore(); };

  /* 343 سلايدر الألوان — شريط سلايدر بتدرّج الطيف، والمقبض يتزحلق، والفيديو (o.draw) يتلوّن حسب مكانه (تدوير الدرجة)، ويرجع بالآخر.
     o: {s, out, draw (Y), path:[0.05, 0.6, 0.95, 0.3] (أماكن المقبض 0..1 بالتتابع), every=0.6, y=1000, w=640, strength=0.55} */
  FX.colorSlider = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), src = o.draw || fakeSrc(P, 3), path = o.path || [0.05, 0.6, 0.95, 0.3], ev = o.every || 0.6, z = pick(o, 'out', s + path.length * ev + 0.4);
    if (t < s || t > z + 0.3) { src(X); return; } const seg = Math.min(path.length - 1, Math.floor((t - s) / ev)), kk = ioC(pr(t, s + seg * ev, s + seg * ev + ev * 0.8)), v = seg ? lerp(path[seg - 1], path[seg], kk) : path[0];
    const ko = 1 - cOut(pr(t, z, z + 0.3)), ki = cOut(pr(t, s, s + 0.25)), str = pick(o, 'strength', 0.55) * ki * ko, hue = Math.round(v * 360);
    X.save(); X.filter = `hue-rotate(${hue}deg) saturate(${(1 + 0.4 * str).toFixed(2)})`; X.globalAlpha = 1; src(X); X.restore();
    if (str < 1) { X.save(); X.globalAlpha = 1 - str; src(X); X.restore(); }
    const w = o.w || 640, y = pick(o, 'y', 1000), x0 = 540 - w / 2; X.save(); X.globalAlpha *= ki * ko; const g = X.createLinearGradient(x0, 0, x0 + w, 0); for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, `hsl(${i * 60},90%,62%)`);
    shd(X, 10, 3, 0.35); X.fillStyle = g; rr(X, x0, y - 9, w, 18, 9); X.fill(); X.fillStyle = '#FFFFFF'; X.beginPath(); X.arc(x0 + w * v, y, 24, 0, TAU); X.fill(); noShd(X); X.strokeStyle = rgba('#000000', 0.15); X.lineWidth = 2; X.stroke(); X.restore(); };

  /* 344 قطّارة اللون — قطّارة مرسومة تتحرك لنقطة (o.at أو o.anchor/track)، تنقر، وتطلع جنبها كبسولة فيها دايرة اللون ورمزه الست-عشري، والإطار يميل للون شوي.
     o: {s, out, at:[x,y], from:[x,y], color (اللون الملقوط، افتراضي P.acc), tint=0.18, draw (Y) اختياري} */
  FX.eyedropper = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0); if (o.draw) o.draw(X); const at = ptOf(FX.placeAt(o, t, 'at', null) || FX.placeAt(o, t, 'anchor', [620, 760])), fr = ptOf(o.from || [900, 1100]), col = o.color || P.acc;
    const ko = o.out != null ? 1 - cOut(pr(t, o.out, o.out + 0.25)) : 1; if (t < s || ko <= ON) return; const km = ioC(pr(t, s, s + 0.5)), x = lerp(fr[0], at[0], km), y = lerp(fr[1], at[1], km), tc = s + 0.55, kc = pr(t, tc, tc + 0.3);
    if (t >= tc) { X.save(); X.globalCompositeOperation = 'soft-light'; X.globalAlpha = pick(o, 'tint', 0.18) * cOut(kc) * 2 * ko; X.fillStyle = col; X.fillRect(0, 0, 1080, 1920); X.restore(); }
    X.save(); X.globalAlpha *= ko; if (kc > 0 && kc < 1) { X.strokeStyle = rgba('#FFFFFF', 1 - kc); X.lineWidth = 4; X.beginPath(); X.arc(at[0], at[1], 10 + 50 * kc, 0, TAU); X.stroke(); }
    X.save(); X.translate(x, y); X.rotate(-Math.PI / 4); const pr2 = t >= tc - 0.05 && t < tc + 0.1 ? 0.9 : 1; X.scale(pr2, pr2); shd(X, 10, 4, 0.4);
    X.fillStyle = '#FFFFFF'; X.beginPath(); X.moveTo(0, 0); X.lineTo(-7, -18); X.lineTo(7, -18); X.closePath(); X.fill(); X.fillRect(-7, -60, 14, 44); X.fillStyle = '#2A2A2A'; rr(X, -14, -100, 28, 40, 10); X.fill();
    if (t >= tc) { X.fillStyle = col; X.fillRect(-5, -55, 10, 36); } noShd(X); X.restore();
    const kp = bOut(pr(t, tc + 0.05, tc + 0.35), 1.8); if (kp > ON) { const hex = String(col).toUpperCase(), w = tw(ctx, X, hex, 26, 700, 'num') + 70; X.save(); X.translate(at[0] - 20, at[1] - 90); X.scale(kp, kp); X.fillStyle = rgba('#000000', 0.6); rr(X, -w / 2, -24, w, 48, 24); X.fill();
      X.fillStyle = col; X.beginPath(); X.arc(-w / 2 + 26, 0, 13, 0, TAU); X.fill(); X.strokeStyle = '#FFFFFF'; X.lineWidth = 2; X.stroke(); T(ctx, X, hex, -w / 2 + 50, 9, 26, { family: 'num', weight: 700, color: '#FFFFFF', align: 'left' }); X.restore(); }
    X.restore(); };
  /* 345 بانر الهوك — عنوان الريل فوق بسطرين أو ثلاثة، كل سطر بصندوق على قدّه (الصناديق تلتحم مثل كابشن التطبيقات)، باللون المميز ونص أبيض، يطلع أول ثانية ويقعد طول المقطع. الكلمة بين نجوم '*كلمة*' بلون o.hi (افتراضي نفس لون النص).
     o: {s, out, lines:['ميزة جديدة في *الأداة*','رهيبة وبتسهل عليك'], y=180, size=58, color=P.acc, ink='#FFFFFF', pad=22, radius=18} */
  FX.hookBanner = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), f = fam(o), size = o.size || 58, pad = pick(o, 'pad', 22), rad = pick(o, 'radius', 18);
    const lines = o.lines || ['ميزة جديدة في *الأداة*', 'رهيبة وبتسهل عليك'], col = o.color || c.acc, ink = o.ink || (lum(col) > 160 ? '#151515' : '#FFFFFF'), lh = size * 1.32;
    const ko = o.out != null ? 1 - cOut(pr(t, o.out, o.out + 0.25)) : 1, k = bOut(pr(t, s, s + 0.35), 1.5); if (k <= ON || ko <= ON) return; let y = pick(o, 'y', 180);
    const W = lines.map(l => tw(ctx, X, l.replace(/\*/g, ''), size, 800, f) + pad * 2); X.save(); X.globalAlpha *= ko * cl(k * 2); X.translate(540, y + lines.length * lh / 2); X.scale(lerp(0.9, 1, cl(k)), cl(k, 0, 1.2)); X.translate(-540, -(y + lines.length * lh / 2));
    shd(X, 18, 6, 0.3); X.fillStyle = col; lines.forEach((_, i) => { rr(X, 540 - W[i] / 2, y + i * lh - 2, W[i], lh + 4, rad); X.fill(); }); noShd(X);
    lines.forEach((l, i) => U.rich(ctx, X, l, 540, y + i * lh + lh * 0.72, size, { color: ink, hi: o.hi || ink, weight: 800, family: f })); X.restore(); };

  /* 346 شارة التطبيق — أيقونة تطبيق (صورتك o.img، وبلاها مربع دائري فيه خطوط ألوان مرسومة) واسمه تحتها بحد أبيض مثل الستيكر، تفرقع وتتمايل خفيف — لما تذكر أداة.
     o: {s, out, img, name='اسم الأداة', x=540, y=1150, size=260, stroke='#FFFFFF'} */
  FX.appBadge = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), f = fam(o), S = o.size || 260, x = pick(o, 'x', 540), y = pick(o, 'y', 1150);
    const ko = o.out != null ? 1 - cOut(pr(t, o.out, o.out + 0.25)) : 1, k = bOut(pr(t, s, s + 0.4), 1.8); if (k <= ON || ko <= ON) return; const bob = Math.sin((t - s) * 2.2) * 6, rot = Math.sin((t - s) * 1.6) * 0.03;
    X.save(); X.globalAlpha *= ko * cl(k * 2); X.translate(x, y + bob); X.rotate(rot); X.scale(k, k); shd(X, 30, 12, 0.35); X.fillStyle = '#111111'; rr(X, -S / 2, -S / 2, S, S, S * 0.23); X.fill(); noShd(X);
    const im = imgOf(ctx, o.img); if (im) { X.save(); rr(X, -S / 2, -S / 2, S, S, S * 0.23); X.clip(); U.drawCover(X, im, -S / 2, -S / 2, S, S); X.restore(); }
    else { const bars = 5, bh = S * 0.12; for (let i = 0; i < bars; i++) { X.fillStyle = U.hueRot(c.acc, i * 55 - 60); rr(X, -S * 0.3, -S * 0.34 + i * (bh + S * 0.025), S * (0.42 + 0.14 * (i % 2)), bh, bh / 2); X.fill(); }
      X.fillStyle = '#FFFFFF'; X.beginPath(); X.moveTo(-S * 0.04, S * 0.02); X.lineTo(S * 0.08, S * 0.08); X.lineTo(-S * 0.04, S * 0.14); X.closePath(); X.fill(); }
    const nm = o.name || 'اسم الأداة'; T(ctx, X, nm, 0, S / 2 + S * 0.32, S * 0.22, { family: f, weight: 900, color: '#151515', stroke: { width: S * 0.05, color: o.stroke || '#FFFFFF' } }); T(ctx, X, nm, 0, S / 2 + S * 0.32, S * 0.22, { family: f, weight: 900, color: '#151515' });
    X.restore(); };
  /* ── 347–352: «وثائقي مقصوص» — مشهد أحادي اللون: شي مقصوص (شخص/مجسّم) فوق خلفية رمادية تذوب للورق، عنوان فوق، والمشاهد تدخل من غباش وتطلع بسحبة ── */
  const paperOf = c => (c.dark ? mixC(c.bg, '#FFFFFF', 0.08) : mixC(c.bg, '#FFFFFF', 0.55));
  const defaultBg = (c) => Y0 => { const ink = mixC(c.inkD, '#FFFFFF', 0.35), { c: oc, Y } = off('docuBg', 1080, 1920); Y.save(); Y.fillStyle = ink;   // مبنى عام بطوابق وسقوف (رمادي)
    [[540, 980, 520, 120], [540, 860, 420, 110], [540, 750, 320, 100], [540, 650, 220, 90]].forEach(([x, y, w, h], i) => { Y.globalAlpha = 0.55 + 0.1 * i; Y.fillRect(x - w / 2, y - h, w, h);
      Y.beginPath(); Y.moveTo(x - w / 2 - 70, y - h); Y.quadraticCurveTo(x, y - h - 70, x + w / 2 + 70, y - h); Y.lineTo(x + w / 2 + 40, y - h + 22); Y.quadraticCurveTo(x, y - h - 38, x - w / 2 - 40, y - h + 22); Y.closePath(); Y.fill(); });
    Y.restore(); Y.globalCompositeOperation = 'destination-out'; const g = Y.createLinearGradient(0, 760, 0, 1060); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)'); Y.fillStyle = g; Y.fillRect(0, 760, 1080, 1160); Y.globalCompositeOperation = 'source-over'; Y0.drawImage(oc, 0, 0); };
  const defaultSubject = (c) => Y => { const k = c.inkD; Y.save(); Y.fillStyle = k; Y.strokeStyle = k; Y.lineCap = 'round'; Y.lineJoin = 'round';   // ظل شخص بوقفة قتالية
    Y.beginPath(); Y.arc(540, 820, 58, 0, TAU); Y.fill(); Y.beginPath(); Y.moveTo(470, 880); Y.lineTo(610, 880); Y.lineTo(640, 1080); Y.lineTo(440, 1080); Y.closePath(); Y.fill();
    Y.lineWidth = 56; Y.beginPath(); Y.moveTo(470, 1070); Y.lineTo(380, 1180); Y.lineTo(330, 1300); Y.moveTo(610, 1070); Y.lineTo(700, 1180); Y.lineTo(760, 1300); Y.stroke();
    Y.lineWidth = 40; Y.beginPath(); Y.moveTo(480, 910); Y.lineTo(390, 1000); Y.lineTo(420, 1060); Y.moveTo(600, 910); Y.lineTo(690, 980); Y.lineTo(740, 930); Y.stroke();
    Y.lineWidth = 8; Y.beginPath(); Y.moveTo(740, 930); Y.lineTo(900, 760); Y.stroke(); Y.globalAlpha = 0.18; Y.beginPath(); Y.ellipse(545, 1310, 260, 26, 0, 0, TAU); Y.fill(); Y.restore(); };
  const layer = (ctx, X, src, c, fb) => { if (typeof src === 'function') { src(X); return; } const im = imgOf(ctx, src); if (im) { X.drawImage(im, 0, 0, 1080, 1920); return; } fb(c)(X); };

  /* 347 مشهد وثائقي مقصوص — ورق فاتح، خلفية (مبنى/مكان) تذوب للورق، والشي المقصوص قدامها؛ المشهد يدخل من غباش قوي (تحويل فوكس) والكاميرا تقرّب ببطء، ويطلع بسحبة جانبية فيها الخلفية أبطأ من المقدمة (بارالاكس).
     o: {s, out, bg (Y)=>{} | img (طبقة الخلفية 1080×1920 شفافة), subject (Y) | img (المقصوص), title, kicker (سطر صغير مايل فوق/تحت العنوان), label (كلمة تحت), titleY=300, labelY=1440, push=0.05, dir='left'|'right', dark=false} */
  FX.docuScene = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), f = fam(o), z = o.out, dur = (z != null ? z : s + 4) - s;
    if (t < s || (z != null && t > z + 0.32)) return; const ki = cOut(pr(t, s, s + 0.5)), kz = z != null ? cIn(pr(t, z, z + 0.3)) : 0, dirx = (o.dir || 'left') === 'left' ? -1 : 1;
    const push = 1 + pick(o, 'push', 0.05) * ioC(pr(t, s, s + dur)), base = o.dark ? mixC(c.inkD, '#000000', 0.45) : paperOf(c), ink = o.dark ? '#F4F4F4' : c.inkD;
    X.fillStyle = base; X.fillRect(0, 0, 1080, 1920); const v = X.createRadialGradient(540, 900, 300, 540, 960, 1200); v.addColorStop(0, rgba('#000000', 0)); v.addColorStop(1, rgba('#000000', o.dark ? 0.45 : 0.12)); X.fillStyle = v; X.fillRect(0, 0, 1080, 1920);
    const blur = 26 * (1 - ki) + 30 * Math.sin(Math.PI * Math.min(1, kz * 1.2)), sc = lerp(1.08, 1, ki) * push;
    const drawL = (src, fb, par) => { X.save(); if (blur > 0.5) X.filter = `blur(${blur.toFixed(1)}px)`; X.translate(dirx * 1200 * kz * par, 0); X.translate(540, 1000); X.scale(sc, sc); X.translate(-540, -1000); layer(ctx, X, src, c, fb); X.restore(); };
    X.save(); X.globalAlpha *= 1 - kz * 0.6; drawL(o.bg, defaultBg, 0.6); drawL(o.subject, defaultSubject, 1); X.restore();
    const kt = cOut(pr(t, s + 0.15, s + 0.5)), tx = dirx * 1200 * kz * 0.8; X.save(); X.translate(tx, 0); X.globalAlpha *= 1 - kz;
    if (o.title !== false) { if (kt > ON) withE(X, { o: kt, b: 14 * (1 - kt), y: 14 * (1 - kt), s: 1 }, 540, pick(o, 'titleY', 300), () => T(ctx, X, o.title || 'الحكاية', 540, pick(o, 'titleY', 300), 96, { family: f, weight: 900, color: ink, maxWidth: 960 })); }
    if (o.kicker) { const ws = String(o.kicker).split(/\s+/), n = Math.min(ws.length, Math.floor((t - s - 0.4) / 0.18) + 1); if (n > 0) T(ctx, X, ws.slice(0, n).join(' '), 540, pick(o, 'titleY', 300) + 80, 52, { family: SERIF, weight: 400, color: mixC(ink, base, 0.25) }); }
    if (o.label) { const kl = cOut(pr(t, s + 0.6, s + 0.9)); if (kl > ON) T(ctx, X, o.label, 540, pick(o, 'labelY', 1440) + 16 * (1 - kl), 64, { family: f, weight: 800, color: ink, alpha: kl }); }
    X.restore(); };

  /* 348 كلمة بصندوق تحديد — كلمة عريضة كبيرة داخل إطار منقّط بمقابض بالزوايا (مثل تحديد عنصر ببرنامج تصميم): الإطار ينرسم، المقابض تنط، والكلمة تنكشف من جهة القراءة.
     o: {s, out, text='أسود', x=540, y=1300, size=150, color (الكلمة), pad=26} */
  FX.selectBox = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), f = fam(o), str = String(o.text || 'أسود'), size = o.size || 150, x = pick(o, 'x', 540), y = pick(o, 'y', 1300), pad = pick(o, 'pad', 26);
    const ko = o.out != null ? 1 - cOut(pr(t, o.out, o.out + 0.25)) : 1; if (t < s || ko <= ON) return; const w = tw(ctx, X, str, size, 900, f) + pad * 2, h = size * 1.15 + pad, bx = x - w / 2, by = y - size * 0.92 - pad / 2;
    const kb = cOut(pr(t, s, s + 0.25)), kw = cOut(pr(t, s + 0.12, s + 0.45)), ar = isAr(str), ink = o.color || c.inkD; X.save(); X.globalAlpha *= ko;
    X.strokeStyle = rgba(ink, 0.7); X.lineWidth = 2.5; X.setLineDash && X.setLineDash([9, 7]); X.beginPath(); const per = 2 * (w + h), L = per * kb; let rem = L;
    const pts = [[bx, by], [bx + w, by], [bx + w, by + h], [bx, by + h], [bx, by]]; X.moveTo(bx, by); for (let i = 1; i < 5 && rem > 0; i++) { const a = pts[i - 1], b = pts[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]), u = Math.min(1, rem / d); X.lineTo(lerp(a[0], b[0], u), lerp(a[1], b[1], u)); rem -= d; } X.stroke(); X.setLineDash && X.setLineDash([]);
    pts.slice(0, 4).forEach(([px, py], i) => { const kh = bOut(pr(t, s + 0.15 + i * 0.04, s + 0.35 + i * 0.04), 2); if (kh <= ON) return; const hs = 14 * kh; X.fillStyle = '#FFFFFF'; X.fillRect(px - hs / 2, py - hs / 2, hs, hs); X.strokeStyle = ink; X.lineWidth = 2; X.strokeRect(px - hs / 2, py - hs / 2, hs, hs); });
    if (kw > 0) { X.save(); X.beginPath(); if (ar) X.rect(bx + w - w * kw, by, w * kw, h); else X.rect(bx, by, w * kw, h); X.clip(); T(ctx, X, str, x, y, size, { family: f, weight: 900, color: ink }); X.restore(); }
    X.restore(); };

  /* 349 رقم يذوب — رقم ضخم بتدرّج عمودي (غامق فوق ← يختفي تحت)، كل خانة تطلع من تحت ومن غباش بالتتابع، وفوقه سطر صغير بخط مزخرف.
     o: {s, out, value='1801', kicker='عصر المسرح', y=520, size=300, color} */
  FX.fadeNumber = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), f = fam(o), str = String(pick(o, 'value', '1801')), size = o.size || 300, y = pick(o, 'y', 470), ink = o.color || c.inkD;
    const ko = o.out != null ? 1 - cOut(pr(t, o.out, o.out + 0.25)) : 1; if (t < s || ko <= ON) return; X.save(); X.globalAlpha *= ko;
    if (o.kicker !== false) { const kk = cOut(pr(t, s, s + 0.4)); T(ctx, X, o.kicker || 'عصر المسرح', 540, y - size * 0.86, size * 0.15, { family: SERIF, weight: 400, color: ink, alpha: kk, letterSpacing: isAr(o.kicker || 'ع') ? 0 : 2 }); }
    const ch = [...str], W = ch.map(q => tw(ctx, X, q, size, 900, 'num')), tot = W.reduce((a, b) => a + b, 0) - size * 0.04 * (ch.length - 1), { c: tc, Y } = off('fadeN', Math.ceil(tot + 40), Math.ceil(size * 1.2));
    let x = 20; ch.forEach((q, i) => { const k = cOut(pr(t, s + 0.1 + i * 0.07, s + 0.5 + i * 0.07)); if (k > ON) { Y.save(); Y.globalAlpha = k; if (k < 1) Y.filter = `blur(${(14 * (1 - k)).toFixed(1)}px)`; T(ctx, Y, q, x + W[i] / 2, size * 0.95 + size * 0.25 * (1 - k), size, { family: 'num', weight: 900, color: '#FFFFFF' }); Y.restore(); } x += W[i] - size * 0.04; });
    Y.globalCompositeOperation = 'source-in'; const g = Y.createLinearGradient(0, size * 0.25, 0, size * 1.0); g.addColorStop(0, ink); g.addColorStop(0.55, rgba(ink, 0.75)); g.addColorStop(1, rgba(ink, 0.05)); Y.fillStyle = g; Y.fillRect(0, 0, tc.width, tc.height);
    X.drawImage(tc, 540 - tc.width / 2, y - size * 0.95); X.restore(); };

  /* 350 مربع يصير ملصق — مربع صغير غامق ينط، يتمدد بالعرض على قد الكلمة، والكلمة تطلع جوّاه بالأبيض (وظل قاسي تحته).
     o: {s, out, text='للعالم', x=540, y=960, size=64, color (المربع، افتراضي الأغمق), ink='#FFFFFF'} */
  FX.squareLabel = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), f = fam(o), str = String(o.text || 'للعالم'), size = o.size || 92, x = pick(o, 'x', 540), y = pick(o, 'y', 960), col = o.color || c.inkD;
    const ko = o.out != null ? 1 - cOut(pr(t, o.out, o.out + 0.25)) : 1; if (t < s || ko <= ON) return; const h = size * 1.45, wF = tw(ctx, X, str, size, 800, f) + size, kp = bOut(pr(t, s, s + 0.25), 2), kw = ioC(pr(t, s + 0.25, s + 0.6)), w = lerp(h, wF, kw);
    X.save(); X.globalAlpha *= ko; X.translate(x, y); X.scale(kp, kp); X.fillStyle = rgba('#000000', 0.25); X.fillRect(-w / 2 + 8, -h / 2 + 10, w, h); X.fillStyle = col; X.fillRect(-w / 2, -h / 2, w, h);
    X.save(); X.beginPath(); X.rect(-w / 2, -h / 2, w, h); X.clip(); const ks = cOut(pr(t, s + 0.35, s + 0.7)); T(ctx, X, str, 0, size * 0.36 + 10 * (1 - ks), size, { family: f, weight: 800, color: o.ink || '#FFFFFF', alpha: ks }); X.restore(); X.restore(); };

  /* 351 إطار العرض — عرض ريلك كأنه مشروع جاهز: الفيديو بكرت بزوايا وظل فوق، تحته لوح مونتاج غامق (مسارات وكليبات)، وعليه سطرين: صغير فيه كلمة التعليق ملوّنة، وكبير مضيء بخط مزخرف؛ والخلفية فاتحة بخطوط ضوء مايلة.
     o: {s, out, draw (Y) الفيديو, lead='اكتب *نينجا* وخذ ملفات', caption='المشروع مجاناً', card:{x,y,w,h}} */
  FX.showcaseFrame = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), f = fam(o), C = o.card || { x: 200, y: 290, w: 680, h: 1180 }, src = o.draw || fakeSrc(P, 70);
    X.fillStyle = mixC(c.bg, '#FFFFFF', 0.82); X.fillRect(0, 0, 1080, 1920); X.save(); X.globalAlpha = 0.07; X.fillStyle = c.inkD; for (let i = -4; i < 8; i++) { X.beginPath(); X.moveTo(i * 300, 0); X.lineTo(i * 300 + 120, 0); X.lineTo(i * 300 + 120 + 700, 1920); X.lineTo(i * 300 + 700, 1920); X.closePath(); X.fill(); } X.restore();
    const kp = cOut(pr(t, s, s + 0.45)), py = 1340, pw = 900, ph = 520; X.save(); X.translate(0, 120 * (1 - kp)); X.globalAlpha *= kp; shd(X, 40, 18, 0.35); X.fillStyle = mixC(c.inkD, '#000000', 0.55); rr(X, 540 - pw / 2, py, pw, ph, 24); X.fill(); noShd(X);
    for (let r = 0; r < 14; r++) { const yy = py + 30 + r * 26; X.fillStyle = rgba('#FFFFFF', 0.05); X.fillRect(540 - pw / 2 + 20, yy, 140, 14); for (let k = 0; k < 3; k++) { const a = 180 + h2(r, k) * 520, w2 = 40 + h2(r, k + 9) * 160; X.fillStyle = rgba(k ? '#FFFFFF' : c.acc, k ? 0.08 : 0.35); X.fillRect(540 - pw / 2 + a, yy, w2, 14); } }
    X.restore(); const kc = cOut(pr(t, s + 0.1, s + 0.55)); X.save(); X.globalAlpha *= kc; X.translate(0, 60 * (1 - kc)); shd(X, 50, 24, 0.3); X.fillStyle = '#FFFFFF'; rr(X, C.x, C.y, C.w, C.h, 34); X.fill(); noShd(X);
    X.save(); rr(X, C.x, C.y, C.w, C.h, 34); X.clip(); X.translate(C.x, C.y); X.scale(C.w / 1080, C.h / 1920); src(X); X.restore(); X.restore();
    const kt = cOut(pr(t, s + 0.4, s + 0.8)); if (kt > ON) { X.save(); X.globalAlpha *= kt; U.rich(ctx, X, o.lead || 'اكتب *نينجا* وخذ ملفات', 540, 1590, 44, { color: '#FFFFFF', hi: mixC(c.acc, '#FFFFFF', 0.25), weight: 700, family: f });
      T(ctx, X, o.caption || 'المشروع مجاناً', 540, 1700, 92, { family: SERIF, weight: 400, color: '#FFFFFF', shadow: { color: rgba('#FFFFFF', 0.55), blur: 26, y: 0 } }); X.restore(); } };

  /* 352 ختام النجمة — نجمة رباعية مقعّرة بوجهين (فاتح وغامق مثل المجسّم) تلف من غباش وتستقر، وتحتها سطر «صُنع بـ…» ينكتب، وسطر حقوق صغير.
     o: {s, out, text='صُنع بواسطة اسمك', sub='© 2026', size=260, y=820, color} */
  FX.starSting = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), f = fam(o), S = o.size || 260, y = pick(o, 'y', 820), col = o.color || c.inkD;
    const ko = o.out != null ? 1 - cOut(pr(t, o.out, o.out + 0.3)) : 1; if (t < s || ko <= ON) return; const k = cOut(pr(t, s, s + 0.7)), rot = lerp(-Math.PI / 2, -0.35, k), sc = lerp(0.6, 1, k);
    X.save(); X.globalAlpha *= ko * cl(k * 1.5); X.translate(540, y); X.rotate(rot); X.scale(sc, sc); if (k < 1) X.filter = `blur(${(16 * (1 - k)).toFixed(1)}px)`;
    shd(X, 40, 22, 0.35); const R = S / 2, n = R * 0.18, half = (sg) => { X.beginPath(); X.moveTo(0, -R); X.quadraticCurveTo(n, -n, R, 0); X.quadraticCurveTo(n, n, 0, R); if (sg > 0) X.lineTo(0, -R); else { X.quadraticCurveTo(-n, n, -R, 0); X.quadraticCurveTo(-n, -n, 0, -R); } X.closePath(); };
    X.fillStyle = mixC(col, '#FFFFFF', 0.45); half(-1); X.fill(); noShd(X); X.fillStyle = col; half(1); X.fill(); X.restore();
    const tx = o.text || 'صُنع بواسطة اسمك', kt = pr(t, s + 0.5, s + 0.5 + tx.length / 28); if (kt > 0) T(ctx, X, typed(tx, kt), 540, y + S * 0.85, 40, { family: f, weight: 800, color: c.inkD, alpha: ko });
    if (o.sub !== false) T(ctx, X, o.sub || '© 2026', 540, y + S * 0.85 + 46, 20, { family: 'num', weight: 500, color: c.mut, alpha: ko * cOut(pr(t, s + 1, s + 1.3)) }); };
})();
