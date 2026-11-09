/* ═══ moves-plus-h.js — بنك الحركات 307–328 (I/O Studio) · باقة «مراجع الريلز» (الجزء الثاني) ═══
   نفس العقد: FX.<اسم>(ctx, t, o) بإحداثيات 1080×1920، كل شي من t، الألوان من ctx.P، والأدوات من moves-plus-g.js (FX._g · FX.placeAt · FX.trackAt · FX.faceAt · FX.icon · FX.warpQuad).
   التتبّع: أي حركة تاخذ o.quad / o.anchor / o.box / o.face تقبلها ثابتة أو دالة t، أو o.track (ملف .io: {frames:[{t, quad|box|points}]}).
     307 linkCard · 308 editorMonitor · 309 neonIcon · 310 iconCarousel · 311 surfaceText · 312 objectRing · 313 eyeGlow · 314 objectGlow · 315 holoPanel
     316 photoStackCard · 317 faceLock · 318 glitterTitle · 319 viewfinderZoom · 320 halftoneSubject · 321 thumbWall · 322 monoPoster · 323 moodGrade
     324 flipClock · 325 cardFan · 326 giantPair · 327 gradHeadline · 328 stageCones
   الكتالوج: motion/moves/catalog-plus-h.json · المعاينات: previews/307–328.mp4 (render-preview-h.js) · لازم ينحمّل بعد moves-plus-g.js. */
(function () {
  const G = typeof window !== 'undefined' ? window : globalThis;
  const FX = (G.FX = G.FX || {});
  const U = FX._g; if (!U) return;
  const { cl, pr, lerp, pick, cOut, cIn, ioC, eOut, bOut, h2, fbm, rgba, mixC, lum, hueRot, isAr, pal, fam, T, tw, rr, shd, noShd, env, withE, imgOf, drawCover, drawSrc, off, sample, typed, rich, ptOf, cueT, cuesOf, TAU, ON, FAM, fakeSrc } = U;
  const neonCore = c => mixC(c.acc, '#FFFFFF', 0.65);
  const glowStroke = (X, col, core, lw, blur) => { X.save(); X.shadowColor = col; X.shadowBlur = blur || 24; X.strokeStyle = col; X.lineWidth = lw * 1.8; X.stroke(); X.shadowBlur = 0; X.strokeStyle = core; X.lineWidth = lw; X.stroke(); X.restore(); };
  // نص مجسّم (طبقات مزاحة) — face لون الوجه، depth بالبكسل
  const extruded = (ctx, X, s, x, y, size, o) => { const d = Math.round(pick(o, 'depth', 14)), f = o.family || FAM, side = o.side || mixC(o.color, '#000000', 0.38);
    for (let i = d; i >= 1; i--) T(ctx, X, s, x + i * (o.dx == null ? 0.35 : o.dx), y + i * (o.dy == null ? 0.9 : o.dy), size, { family: f, weight: 900, color: side, scaleX: o.scaleX });
    T(ctx, X, s, x, y, size, { family: f, weight: 900, color: o.color, scaleX: o.scaleX, shadow: o.glow ? { color: o.glow, blur: 30, y: 0 } : null });
    if (o.hiEdge !== false) T(ctx, X, s, x, y - size * 0.012, size, { family: f, weight: 900, color: rgba('#FFFFFF', 0.18), scaleX: o.scaleX }); };

  /* 307 كرت الروابط — آخر الفيديو: صورتك بدايرة بحلقة، الاسم، سطر لاتيني صغير، جملة تعريف تنكتب، وقائمة روابط بأيقونات عامة (بلا شعارات منصات) تطلع وحدة وحدة.
     o: {s, out, name, sub, tagline ('*كلمة*' مميزة), img (صورتك), links:[{icon:'globe'|'play'|'camera'|'music'|'mail'|'link'|'chat', label, url}]} */
  FX.linkCard = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), f = fam(o), s = pick(o, 's', 0), name = o.name || 'اسمك هنا', ar = isAr(name + (o.tagline || ''));
    const ko = o.out != null ? 1 - cOut(pr(t, o.out, o.out + 0.3)) : 1; if (ko <= ON) return; X.save(); X.globalAlpha *= ko;
    const ka = bOut(pr(t, s, s + 0.3), 1.8), cy = 520; if (ka > ON) { X.save(); X.translate(540, cy); X.scale(ka, ka); X.strokeStyle = c.acc; X.lineWidth = 6; X.beginPath(); X.arc(0, 0, 112, 0, TAU); X.stroke(); X.save(); X.beginPath(); X.arc(0, 0, 100, 0, TAU); X.clip();
      const im = imgOf(ctx, o.img); if (im) drawCover(X, im, -100, -100, 200, 200); else { X.fillStyle = mixC(c.acc, c.inkD, 0.3); X.fillRect(-100, -100, 200, 200); T(ctx, X, [...name][0] || '?', 0, 36, 100, { family: f, weight: 800, color: '#FFFFFF' }); } X.restore(); X.restore(); }
    const kn = cOut(pr(t, s + 0.15, s + 0.45)); if (kn > ON) withE(X, { o: kn, b: 12 * (1 - kn), y: 14 * (1 - kn), s: 1 }, 540, 720, () => T(ctx, X, name, 540, 720, 76, { family: f, weight: 800, color: c.ink }));
    if (o.sub !== false) T(ctx, X, String(o.sub || 'YOUR NAME · CREATOR').toUpperCase(), 540, 770, 20, { family: 'num', weight: 600, color: c.mut, alpha: kn, letterSpacing: 5 });
    if (o.tagline !== false) { const tg = o.tagline || (ar ? 'أعلّمك *خطوة بخطوة*' : 'I teach you *step by step*'), kt = pr(t, s + 0.45, s + 0.45 + String(tg).length / 30); if (kt > 0) rich(ctx, X, typed(tg.replace(/\*/g, '\u0001'), kt).replace(/\u0001/g, '*'), 540, 850, 40, { color: c.ink, hi: c.acc, weight: 600, family: f }); }
    const L = o.links || [{ icon: 'camera', label: 'Photos', url: 'example.com/you' }, { icon: 'play', label: 'Videos', url: 'example.com/you' }, { icon: 'music', label: 'Shorts', url: 'example.com/you' }, { icon: 'globe', label: 'Website', url: 'yoursite.com' }];
    const t0 = s + 0.6 + String(o.tagline || '').length / 30; L.forEach((l, i) => { const k = cOut(pr(t, t0 + i * 0.25, t0 + 0.3 + i * 0.25)); if (k <= ON) return; const y = 980 + i * 150, x = ar ? 820 : 260, dx = 60 * (1 - k) * (ar ? -1 : 1);
      X.save(); X.globalAlpha *= k; X.translate(dx, 0); X.fillStyle = c.inkD === c.ink ? c.ink : mixC(c.inkD, '#FFFFFF', 0.08); rr(X, x - 42, y - 42, 84, 84, 22); X.fill(); FX.icon(X, l.icon || 'link', x, y, 46, { fill: c.inkD === c.ink ? c.bg : '#FFFFFF' });
      const tx = ar ? x - 72 : x + 72, al = ar ? 'right' : 'left'; T(ctx, X, l.label || '', tx, y - 10, 26, { family: f, weight: 600, color: c.mut, align: al }); T(ctx, X, l.url || '', tx, y + 30, 36, { family: 'num', weight: 600, color: c.acc, align: al }); X.restore(); });
    X.restore(); };

  /* 308 الفيديو على شاشة — المونتاج يشتغل على شاشة كمبيوتر مايلة بإطار برنامج مونتاج عام، ضوء الغرفة ورا، والكاميرا تتمايل كأنها بالإيد؛ ودخول/طلوع بسحبة من لقطة سيلفي (o.selfie).
     o: {s, out, draw (Y) المونتاج, selfie (Y) اختياري, tilt=1, ui=true} */
  FX.editorMonitor = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), z = o.out, src = o.draw || fakeSrc(P, 3), sf = o.selfie;
    const scene = Y => { const g = Y.createRadialGradient(540, 760, 120, 540, 900, 1300); g.addColorStop(0, mixC(c.acc, c.night, 0.35)); g.addColorStop(1, mixC(c.night, '#000000', 0.4)); Y.fillStyle = g; Y.fillRect(0, 0, 1080, 1920);
      const hx = 10 * Math.sin(t * 0.9) + 6 * Math.sin(t * 2.3 + 1), hy = 8 * Math.sin(t * 1.1 + 2), hr = 0.006 * Math.sin(t * 0.7) - 0.02 * pick(o, 'tilt', 1);
      Y.save(); Y.translate(540 + hx, 900 + hy); Y.rotate(hr); Y.transform(1, -0.03 * pick(o, 'tilt', 1), 0.02, 1, 0, 0);
      const W = 900, H = 1600; shd(Y, 80, 30, 0.6); Y.fillStyle = '#0D0D0E'; rr(Y, -W / 2 - 24, -H / 2 - 24, W + 48, H + 48, 24); Y.fill(); noShd(Y);
      if (o.ui !== false) { Y.fillStyle = '#1B1C1F'; Y.fillRect(-W / 2, -H / 2, W, 70); Y.fillRect(-W / 2, H / 2 - 70, W, 70); for (let i = 0; i < 4; i++) { Y.fillStyle = '#2C2E33'; rr(Y, W / 2 - 60 - i * 70, -H / 2 + 20, 50, 30, 6); Y.fill(); }
        Y.fillStyle = c.acc; rr(Y, W / 2 - 340, -H / 2 + 20, 70, 30, 6); Y.fill(); Y.fillStyle = '#2C2E33'; Y.fillRect(-W / 2 + 20, H / 2 - 40, W - 40, 4); Y.fillStyle = c.acc; Y.fillRect(-W / 2 + 20, H / 2 - 40, (W - 40) * (((t - s) * 0.05) % 1), 4); }
      Y.save(); Y.beginPath(); Y.rect(-W / 2, -H / 2 + 70, W, H - 140); Y.clip(); Y.translate(-W / 2, -H / 2 + 70); Y.scale(W / 1080, (H - 140) / 1920); src(Y); Y.restore();
      Y.globalAlpha = 0.06; for (let yy = -H / 2; yy < H / 2; yy += 6) { Y.fillStyle = '#000000'; Y.fillRect(-W / 2, yy, W, 2); } Y.restore();
      const gl = Y.createRadialGradient(540, 1880, 50, 540, 1880, 500); gl.addColorStop(0, rgba(c.acc, 0.35)); gl.addColorStop(1, rgba(c.acc, 0)); Y.fillStyle = gl; Y.fillRect(0, 1300, 1080, 620); };
    const whip = (A, B, k) => { const e = ioC(k), bl = Math.sin(Math.PI * k) * 60; X.save(); if (bl > 1) X.filter = `blur(${bl.toFixed(0)}px)`; X.translate(-1080 * e, 0); A(X); X.translate(1080, 0); B(X); X.restore(); };
    if (sf && t < s + 0.13) { if (t < s - 0.13) { sf(X); return; } whip(sf, scene, pr(t, s - 0.13, s + 0.13)); return; }
    if (sf && z != null && t >= z - 0.13) { if (t > z + 0.13) { sf(X); return; } whip(scene, sf, pr(t, z - 0.13, z + 0.13)); return; }
    scene(X); };

  /* 309 أيقونة نيون — أيقونات خطية داخل دواير زجاج غامقة بحلقة مضيئة، تولّع برمشات ثلاث ثم «طنين» خفيف.
     o: {s, out, icons:[{name, x, y, size}] (أسماء FX.icon) أو name + x + y + size, ring=true, every=0.12} */
  const neonBadge = (ctx, X, c, name, x, y, size, k, t, i, ring) => { const blink = k < 1 ? (Math.floor(k * 6) % 2 ? 0.25 : 1) : 0.94 + 0.06 * Math.sin(t * 44 + i * 2);
    X.save(); X.globalAlpha *= cl(k * 3) * blink; X.translate(x, y); if (ring !== false) { X.fillStyle = rgba(c.night, 0.7); X.beginPath(); X.arc(0, 0, size / 2, 0, TAU); X.fill(); X.beginPath(); X.arc(0, 0, size / 2 - 3, 0, TAU); glowStroke(X, c.acc, neonCore(c), 3, 22); }
    FX.icon(X, name, 0, 0, size * 0.48, { fill: false, stroke: c.acc, lw: 7 }); FX.icon(X, name, 0, 0, size * 0.48, { fill: false, stroke: neonCore(c), lw: 2.5 });
    X.globalCompositeOperation = 'lighter'; X.globalAlpha *= 0.35; X.filter = 'blur(8px)'; FX.icon(X, name, 0, 0, size * 0.5, { fill: false, stroke: c.acc, lw: 10 }); X.restore(); };
  FX.neonIcon = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), list = o.icons || [{ name: o.name || 'bolt', x: pick(o, 'x', 540), y: pick(o, 'y', 960), size: o.size || 220 }];
    const ko = o.out != null ? 1 - cOut(pr(t, o.out, o.out + 0.25)) : 1; if (ko <= ON) return; X.save(); X.globalAlpha *= ko;
    list.forEach((it, i) => { const t0 = s + i * pick(o, 'every', 0.12), k = pr(t, t0, t0 + 0.15); if (t < t0) return; neonBadge(ctx, X, c, it.name, it.x, it.y, it.size || 200, k, t, i, o.ring); }); X.restore(); };

  /* 310 أيقونات تدور — (orbit) شارات نيون تلف على قطع ناقص حول رقم كبير، اللي ورا أصغر وأبهت؛ أو (wheel) عجلة أيقونات تحت تلف خانة مع كل بند والحالية تكبر.
     o: {s, out, mode='orbit'|'wheel', icons:[...], number='5', label, x=540, y=900, rx=300, ry=100, cues (للعجلة) أو every=1.2} */
  FX.iconCarousel = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), icons = o.icons || ['spring', 'wheel', 'bike', 'battery', 'bolt'], n = icons.length;
    const ko = o.out != null ? 1 - cOut(pr(t, o.out, o.out + 0.25)) : 1, ki = cOut(pr(t, s, s + 0.35)); if (ko <= ON || ki <= ON) return; X.save(); X.globalAlpha *= ko * ki;
    if ((o.mode || 'orbit') === 'orbit') { const x = pick(o, 'x', 540), y = pick(o, 'y', 900), rx = o.rx || 300, ry = o.ry || 100, tl = -10 * Math.PI / 180, rot = (t - s) * TAU * pick(o, 'speed', 0.25);
      const it = icons.map((nm, i) => { const a = rot + i * TAU / n, px = Math.cos(a) * rx, py = Math.sin(a) * ry; return { nm, i, z: Math.sin(a), x: x + px * Math.cos(tl) - py * Math.sin(tl), y: y + px * Math.sin(tl) + py * Math.cos(tl) }; });
      const draw = q => { const sc = q.z < 0 ? 0.8 : 1; X.save(); X.globalAlpha *= q.z < 0 ? 0.5 : 1; neonBadge(ctx, X, c, q.nm, q.x, q.y, 120 * sc, 1, t, q.i, true); X.restore(); };
      it.filter(q => q.z < 0).forEach(draw); if (o.number != null || o.mode == null) extruded(ctx, X, String(pick(o, 'number', 5)), x, y + 90, 300, { color: c.acc, depth: 12, glow: rgba(c.acc, 0.6) });
      it.filter(q => q.z >= 0).forEach(draw); }
    else { const cues = cuesOf(o, n, 1.2), cur = Math.max(0, FX.cueIndex(cues, t)), kk = ioC(pr(t, cues[cur] || 0, (cues[cur] || 0) + 0.35)), pos = Math.max(0, cur - 1) + (cur > 0 ? kk : 0);
      const cx = pick(o, 'x', 540), cy = pick(o, 'y', 2150), R = o.r || 620, step = 0.42;
      icons.forEach((nm, i) => { const a = -Math.PI / 2 + (i - pos) * step; if (Math.abs(i - pos) > 2.6) return; const px = cx + Math.cos(a) * R, py = cy + Math.sin(a) * R, act = Math.max(0, 1 - Math.abs(i - pos)), sc = 1 + 0.25 * act;
        X.save(); X.globalAlpha *= lerp(0.55, 1, act); neonBadge(ctx, X, c, nm, px, py, 150 * sc, 1, t, i, true); X.restore(); });
      const vg = X.createLinearGradient(0, 1300, 0, 1920); vg.addColorStop(0, rgba(c.night, 0)); vg.addColorStop(1, rgba(c.night, 0.35)); X.globalCompositeOperation = 'destination-over'; X.fillStyle = vg; X.fillRect(0, 1300, 1080, 620); }
    X.restore(); };

  /* 311 كلام مجسّم على سطح — نص مجسّم (بعمق وتوهج) ينحط بمنظور على جدار أو أرض: o.quad (4 زوايا، ثابتة أو دالة t) أو o.track من التتبّع. الكلمات تطلع من السطح بالتتابع.
     o: {s, out, text='2500 W', quad:[[x,y]×4] (فوق يسار، فوق يمين، تحت يمين، تحت يسار), track, depth=14, size=220, color=P.acc, glow=true} */
  FX.surfaceText = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), f = fam(o), str = String(o.text || '2500 W'), size = o.size || 220;
    const q = FX.placeAt(o, t, 'quad', [[250, 1300], [830, 1300], [1000, 1680], [80, 1680]]).map(ptOf); const e = env(t, s, o.out, { din: 0.35, bIn: 0, yIn: 0, sIn: 1 }); if (e.o <= ON) return;
    const W0 = Math.max(400, tw(ctx, X, str, size, 900, f) * 1.12 + 60), H0 = size * 1.5, { c: tc, Y } = off('surf_txt', W0, H0), words = str.split(/\s+/), rtl = isAr(str), d = pick(o, 'depth', 14), col = o.color || c.acc;
    const ws = words.map(w => tw(ctx, Y, w + ' ', size, 900, f)), tot = ws.reduce((a, b) => a + b, 0); let cx = rtl ? W0 / 2 + tot / 2 : W0 / 2 - tot / 2;
    words.forEach((w, i) => { const k = bOut(pr(t, s + i * 0.12, s + 0.4 + i * 0.12), 1.6), ww = ws[i], x = rtl ? cx - ww / 2 : cx + ww / 2; cx += rtl ? -ww : ww; if (k <= ON) return;
      Y.save(); Y.translate(x, size * 1.15); Y.scale(1, cl(k, 0, 1.2)); Y.translate(-x, -size * 1.15); extruded(ctx, Y, w, x, size * 1.05, size, { color: col, depth: d * cl(k), family: f }); Y.restore(); });
    X.save(); X.globalAlpha *= e.o; if (o.glow !== false) { X.shadowColor = rgba(col, 0.75); X.shadowBlur = 40; } FX.warpQuad(X, tc, q, 10); X.restore(); };

  /* 312 حلقة حول الشي — قوس مضيء يلف حول جسم (عجلة، منتج) بقطع ناقص على مستواه، رأسه يلمع، وبالنص رقم مجسّم يعدّ.
     o: {s, out, center:[x,y] | anchor (ثابت/دالة t) | track, radius=300, tilt=0.45 (ry/rx), angle=-15, value=40, unit='KM', label, from=0, decimals=0} */
  FX.objectRing = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), f = fam(o), cen = ptOf(FX.placeAt(o, t, 'center', null) || FX.placeAt(o, t, 'anchor', [540, 1150]));
    const R = o.radius || 300, ry = R * pick(o, 'tilt', 0.45), an = (pick(o, 'angle', -15)) * Math.PI / 180, ko = o.out != null ? 1 - cOut(pr(t, o.out, o.out + 0.3)) : 1, k = cOut(pr(t, s, s + 0.6)); if (k <= ON || ko <= ON) return;
    X.save(); X.globalAlpha *= ko; X.save(); X.translate(cen[0], cen[1]); X.rotate(an); const a0 = -Math.PI * 0.7, a1 = a0 + Math.PI * 2 * (300 / 360) * k; X.beginPath(); X.ellipse(0, 0, R, ry, 0, a0, a1); X.lineCap = 'round'; glowStroke(X, c.acc, neonCore(c), 10, 30);
    const hx = Math.cos(a1) * R, hy = Math.sin(a1) * ry, g = X.createRadialGradient(hx, hy, 0, hx, hy, 40); g.addColorStop(0, rgba('#FFFFFF', 0.95)); g.addColorStop(1, rgba(c.acc, 0)); X.fillStyle = g; X.beginPath(); X.arc(hx, hy, 40, 0, TAU); X.fill(); X.restore();
    const kv = eOut(pr(t, s + 0.1, s + 0.9)), v = lerp(pick(o, 'from', 0), pick(o, 'value', 40), kv), str = v.toFixed(pick(o, 'decimals', 0)), sz = o.size || R * 0.85;
    extruded(ctx, X, str, cen[0], cen[1] + sz * 0.35, sz, { color: c.acc, depth: 12, family: 'num', glow: rgba(c.acc, 0.55) });
    if (o.unit !== false) T(ctx, X, o.unit || 'KM', cen[0] + tw(ctx, X, str, sz, 900, 'num') / 2 + 10, cen[1] + sz * 0.35, sz * 0.25, { family: 'num', weight: 900, color: neonCore(c), align: 'left' });
    if (o.label) T(ctx, X, o.label, cen[0], cen[1] + sz * 0.35 + sz * 0.35, sz * 0.2, { family: f, weight: 800, color: c.acc }); X.restore(); };

  /* 313 عيون تولّع — قرص توهج على كل عين (قلب أبيض حار → لون → شفاف) مع خط ضوء أفقي، ينط وينبض. يحتاج مكان العيون: o.face (MV.faceAt) أو o.track أو o.eyes.
     o: {s, out, face | track | eyes:[[x,y],[x,y]], color=P.acc, size=70, tint=0.12} */
  FX.eyeGlow = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), fc = FX.faceAt(o, t, null), eyes = o.eyes || (fc ? fc.eyes : [[470, 700], [610, 700]]), col = o.color || c.acc;
    const ko = o.out != null ? 1 - cOut(pr(t, o.out, o.out + 0.2)) : 1, k = pr(t, s, s + 0.2), pop = k < 1 ? (k < 0.7 ? lerp(0, 1.15, k / 0.7) : lerp(1.15, 1, (k - 0.7) / 0.3)) : 1 + 0.08 * Math.sin((t - s) * TAU * 6); if (t < s || ko <= ON) return;
    const S = (o.size || (fc ? fc.w * 0.24 : 70)) * pop; X.save(); X.globalAlpha *= ko;
    if (fc && pick(o, 'tint', 0.12) > 0) { const g = X.createRadialGradient(fc.cx, fc.cy, 10, fc.cx, fc.cy, fc.w); g.addColorStop(0, rgba(col, pick(o, 'tint', 0.12))); g.addColorStop(1, rgba(col, 0)); X.fillStyle = g; X.fillRect(fc.x - fc.w / 2, fc.y - fc.h / 2, fc.w * 2, fc.h * 2); }
    X.globalCompositeOperation = 'lighter'; eyes.map(ptOf).forEach(([x, y]) => { const g = X.createRadialGradient(x, y, 0, x, y, S); g.addColorStop(0, rgba('#FFFFFF', 0.95)); g.addColorStop(0.25, rgba(mixC(col, '#FFFFFF', 0.4), 0.9)); g.addColorStop(0.6, rgba(col, 0.55)); g.addColorStop(1, rgba(col, 0));
      X.fillStyle = g; X.beginPath(); X.arc(x, y, S, 0, TAU); X.fill(); const st = X.createLinearGradient(x - S * 3.4, y, x + S * 3.4, y); st.addColorStop(0, rgba(col, 0)); st.addColorStop(0.5, rgba('#FFFFFF', 0.7)); st.addColorStop(1, rgba(col, 0)); X.fillStyle = st; X.fillRect(x - S * 3.4, y - 3, S * 6.8, 6); });
    X.restore(); };

  /* 314 لمعة على المنتج — شريط لون (من اللون المميز) يمسح شكل المنتج بس (قناع)، وبعده المنتج يبقى متوهج شوي.
     o: {s, out, mask:(Y)=>{يرسم شكل المنتج بأي لون} | box:{x,y,w,h,r} | track, colors:[P.acc, …], band=300, speed=700, hold=1.2, draw (Y) اختياري تحت} */
  FX.objectGlow = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0); if (o.draw) o.draw(X); if (t < s) return;
    const bx = FX.placeAt(o, t, 'box', [300, 1200, 480, 300]), B = Array.isArray(bx) ? { x: bx[0], y: bx[1], w: bx[2], h: bx[3], r: 24 } : bx, maskFn = o.mask || (Y => { Y.fillStyle = '#FFFFFF'; rr(Y, B.x, B.y, B.w, B.h, B.r == null ? 24 : B.r); Y.fill(); });
    const hold = pick(o, 'hold', 1.2), sp = o.speed || 700, band = o.band || 300, bxp = B.x - band + (t - s) * sp, sweepOn = bxp < B.x + B.w + band, kg = cOut(pr(t, s, s + 0.3)) * (1 - cOut(pr(t, s + (B.w + band * 2) / sp + hold, s + (B.w + band * 2) / sp + hold + 0.3))); if (kg <= ON && !sweepOn) return;
    const { c: mc, Y } = off('oglow', 540, 960); Y.save(); Y.scale(0.5, 0.5); maskFn(Y); Y.globalCompositeOperation = 'source-in'; const cols = o.colors || [c.acc, c.acc2];
    const g = Y.createLinearGradient(bxp, 0, bxp + band, 0); g.addColorStop(0, rgba(cols[0], 0)); g.addColorStop(0.3, rgba(cols[0], 0.95)); g.addColorStop(0.7, rgba(cols[1] || cols[0], 0.95)); g.addColorStop(1, rgba(cols[1] || cols[0], 0));
    Y.fillStyle = rgba(cols[0], 0.28 * kg); Y.fillRect(0, 0, 1080, 1920); if (sweepOn) { Y.fillStyle = g; Y.fillRect(bxp, 0, band, 1920); } Y.restore();
    X.save(); X.globalCompositeOperation = 'screen'; X.globalAlpha = 0.85; X.drawImage(mc, 0, 0, 1080, 1920); X.globalCompositeOperation = 'lighter'; X.globalAlpha = 0.5 * kg; X.filter = 'blur(18px)'; X.drawImage(mc, 0, 0, 1080, 1920); X.restore(); };

  /* 315 لوحة زجاج مثبّتة — لوح زجاج بحد نيون بمنظور جنب الشي (o.anchor/o.quad/o.track)، خط قائد له، وسطور المواصفات تنكتب (العنوان ثم القيم الكبيرة).
     o: {s, out, anchor:[x,y] (النقطة اللي يأشر عليها), at:[x,y] (مكان اللوح), quad (بدل at), track, title='Lithium Battery', lines:['60V','27Ah'], w=440, h=320, rotY=20} */
  FX.holoPanel = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), f = fam(o), W = o.w || 540, H = o.h || 380, e = env(t, s, o.out, { din: 0.2, bIn: 0, yIn: 0, sIn: 1 }); if (e.o <= ON) return;
    const at = ptOf(pick(o, 'at', [300, 900])), ry = (pick(o, 'rotY', 20)) * Math.PI / 180, sk = Math.sin(ry) * 0.3;
    const q = FX.placeAt(o, t, 'quad', null) ? FX.placeAt(o, t, 'quad').map(ptOf) : [[at[0] - W / 2, at[1] - H / 2], [at[0] + W / 2 * Math.cos(ry), at[1] - H / 2 * (1 - sk)], [at[0] + W / 2 * Math.cos(ry), at[1] + H / 2 * (1 - sk)], [at[0] - W / 2, at[1] + H / 2]];
    const anc = FX.placeAt(o, t, 'anchor', null); const { c: pc, Y } = off('holo', W, H), kb = cOut(pr(t, s, s + 0.3)), kf = cOut(pr(t, s + 0.2, s + 0.45));
    Y.fillStyle = rgba('#FFFFFF', 0.1 * kf); rr(Y, 4, 4, W - 8, H - 8, 18); Y.fill(); const per = 2 * (W + H); Y.setLineDash && Y.setLineDash([per * kb, per]); rr(Y, 4, 4, W - 8, H - 8, 18); glowStroke(Y, c.acc, neonCore(c), 3, 14); Y.setLineDash && Y.setLineDash([]);
    const title = o.title || 'Lithium Battery', lines = o.lines || ['60V', '27Ah'], rate = 20; let tt = s + 0.45; const ar = isAr(title), al = ar ? 'right' : 'left', lx = ar ? W - 34 : 34;
    const kt = pr(t, tt, tt + title.length / rate); tt += title.length / rate + 0.1; if (kt > 0) { Y.fillStyle = c.acc; Y.beginPath(); Y.arc(ar ? W - 30 : 30, 52, 6, 0, TAU); Y.fill(); T(ctx, Y, typed(title, kt), ar ? lx - 20 : lx + 20, 64, 36, { family: f, weight: 700, color: neonCore(c), align: al }); }
    lines.forEach((ln, i) => { const k = pr(t, tt, tt + String(ln).length / rate); tt += String(ln).length / rate + 0.1; if (k <= 0) return; const y = 145 + i * (H - 170) / Math.max(1, lines.length - 0.2);
      Y.fillStyle = c.acc; Y.beginPath(); Y.arc(ar ? W - 30 : 30, y - 22, 6, 0, TAU); Y.fill(); T(ctx, Y, typed(ln, k), ar ? lx - 20 : lx + 20, y, 74, { family: 'num', weight: 900, color: neonCore(c), align: al, shadow: { color: rgba(c.acc, 0.9), blur: 18, y: 0 } }); });
    X.save(); X.globalAlpha *= e.o; if (anc) { const a = ptOf(anc), ed = [lerp(q[0][0], q[3][0], 0.5), lerp(q[0][1], q[3][1], 0.5)], kl = cOut(pr(t, s, s + 0.25)); X.beginPath(); X.moveTo(a[0], a[1]); X.lineTo(lerp(a[0], ed[0], kl), lerp(a[1], ed[1], kl)); X.lineCap = 'round'; glowStroke(X, c.acc, neonCore(c), 2.5, 14);
      X.fillStyle = neonCore(c); X.beginPath(); X.arc(a[0], a[1], 7, 0, TAU); X.fill(); }
    X.shadowColor = rgba(c.acc, 0.45); X.shadowBlur = 30; FX.warpQuad(X, pc, q, 6); X.restore(); };

  /* 316 كرت صور يتقلّب — كرت أبيض بعنوان، صوره مكدّسة وراه وكل شوي الصورة اللي فوق تنسحب للجنب وترجع ورا، وبالآخر الكرت يطير مايل بسحبة.
     o: {s, out, title='Dirt Bike', imgs:[img | (Y)=>{}], every=0.5, anchor=[540,1150] (أو track), w=380, h=460} */
  FX.photoStackCard = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), f = fam(o), z = pick(o, 'out', s + 2.6), W = o.w || 380, H = o.h || 460, an = ptOf(FX.placeAt(o, t, 'anchor', [540, 1150]));
    const imgs = o.imgs || [fakeSrc(P, 1), fakeSrc(P, 4), fakeSrc(P, 7), fakeSrc(P, 10)], n = imgs.length, ev = o.every || 0.5; if (t < s || t > z + 0.3) return;
    const ki = bOut(pr(t, s, s + 0.3), 1.5), kx = cIn(pr(t, z, z + 0.25)), sh = Math.max(0, Math.floor((t - s - 0.4) / ev)), kp = ioC(pr(t, s + 0.4 + sh * ev, s + 0.4 + sh * ev + 0.2));
    X.save(); X.translate(an[0] - 700 * kx, an[1] + 400 * kx); X.rotate(-0.44 * kx); X.scale(ki, ki); X.globalAlpha *= cl(ki * 2) * (1 - kx); if (kx > 0) X.filter = `blur(${(20 * kx).toFixed(1)}px)`;
    for (let j = Math.min(3, n - 1); j >= 0; j--) { const idx = (sh + j) % n, top = j === 0, slide = top ? (kp < 0.5 ? kp * 2 : (1 - kp) * 2) : 0, rot = (h2(idx, 2) - 0.5) * 0.14 + (top ? 0.18 * slide : 0);
      X.save(); X.translate(top ? 420 * slide : j * 6, -40 + j * 8); X.rotate(rot); shd(X, 18, 8, 0.25); X.fillStyle = '#FFFFFF'; rr(X, -W / 2 + 14, -H / 2 + 50, W - 28, H - 70, 12); X.fill(); noShd(X);
      X.save(); rr(X, -W / 2 + 22, -H / 2 + 58, W - 44, H - 86, 8); X.clip(); drawSrc(ctx, X, imgs[idx], -W / 2 + 22, -H / 2 + 58, W - 44, H - 86); X.restore(); X.restore(); }
    shd(X, 22, 8, 0.25); X.fillStyle = '#FFFFFF'; rr(X, -W / 2, -H / 2 - 40, W, 56, 14); X.fill(); noShd(X); T(ctx, X, o.title || 'Dirt Bike', 0, -H / 2 - 3, 28, { family: f, weight: 700, color: '#161616' }); X.restore(); };

  /* 317 قفل على الوجه — أربع زوايا تنقفل على الوجه (تنط من حجم أكبر وتلحق الوجه بتأخير بسيط) وشارة «LOCKED» ترمش فوق. o.face (MV.faceAt) أو o.track — بلاه مكان افتراضي.
     o: {s, out, face | track, tag='TARGET LOCKED', tagColor=P.acc, pad=0.18, push=1.06, draw (Y) = الفيديو (للدخلة)} */
  FX.faceLock = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), f = fam(o), push = pick(o, 'push', 1.06);
    const avg = [0, 0.05, 0.1].map(d => FX.faceAt(o, t - d, { x: 390, y: 520, w: 300, h: 370 })), fc = { x: avg.reduce((a, q) => a + q.x, 0) / 3, y: avg.reduce((a, q) => a + q.y, 0) / 3, w: avg[0].w, h: avg[0].h };
    const k = cOut(pr(t, s, s + 0.15)), ko = o.out != null ? 1 - cOut(pr(t, o.out, o.out + 0.2)) : 1, kz = ioC(pr(t, s, s + 0.6)) * ko;
    if (o.draw) { X.save(); const cx = fc.x + fc.w / 2, cy = fc.y + fc.h / 2, z = lerp(1, push, kz); X.translate(cx, cy); X.scale(z, z); X.translate(-cx, -cy); o.draw(X); X.restore(); } if (t < s || ko <= ON) return;
    const pad = pick(o, 'pad', 0.18), sc = lerp(1.3, 1, k), cx = fc.x + fc.w / 2, cy = fc.y + fc.h / 2, hw = fc.w * (0.5 + pad) * sc, hh = fc.h * (0.5 + pad) * sc, arm = 46;
    X.save(); X.globalAlpha *= k * ko; X.strokeStyle = '#FFFFFF'; X.lineWidth = 5; X.lineCap = 'square'; shd(X, 8, 0, 0.4);
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => { const x = cx + sx * hw, y = cy + sy * hh; X.beginPath(); X.moveTo(x - sx * arm, y); X.lineTo(x, y); X.lineTo(x, y - sy * arm); X.stroke(); }); noShd(X);
    const bl = t - s < 0.6 ? (Math.floor((t - s) / 0.1) % 2 === 0 ? 1 : 0.15) : 1, tag = o.tag || 'TARGET LOCKED', tw0 = tw(ctx, X, tag, 22, 800, isAr(tag) ? f : 'num') + 24;
    X.globalAlpha *= bl; X.fillStyle = o.tagColor || c.acc; rr(X, cx - hw, cy - hh - 46, tw0, 36, 6); X.fill(); T(ctx, X, tag, cx - hw + tw0 / 2, cy - hh - 20, 22, { family: isAr(tag) ? f : 'num', weight: 800, color: c.on }); X.restore(); };

  /* 318 عنوان بريق — الشاشة تظلم إلا بقعة ضوء على الشخص، وكلمة كبيرة بخط مزخرف ولون معدني (من اللون المميز) فوقه، ولمعة تعبرها وبريق يتساقط ويرمش.
     o: {s, out, text='Shine', y=430, size=170, family='Aref Ruqaa', spot:[x,y,rx,ry], colors:[فاتح, وسط, غامق] (افتراضي من P.acc), n=120} */
  FX.glitterTitle = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), f = o.family || 'Aref Ruqaa', y = pick(o, 'y', 430), size = o.size || 170, str = o.text || 'Shine';
    const e = env(t, s, o.out, { din: 0.35, bIn: 20, yIn: 0, sIn: 0.95 }); if (e.o <= ON) return; const sp = o.spot || [540, 1050, 420, 640];
    X.save(); X.globalAlpha *= e.o; const g = X.createRadialGradient(sp[0], sp[1], sp[2] * 0.5, sp[0], sp[1], sp[3] * 1.2); g.addColorStop(0, rgba('#000000', 0)); g.addColorStop(1, rgba('#000000', 0.75)); X.fillStyle = g; X.fillRect(0, 0, 1080, 1920); X.restore();
    const cols = o.colors || [mixC(c.acc, '#FFFFFF', 0.75), c.acc, mixC(c.acc, '#000000', 0.55)];
    withE(X, e, 540, y, () => { const w = tw(ctx, X, str, size, 700, f) + 40, { c: tc, Y } = off('glit_t', w, size * 1.6); T(ctx, Y, str, w / 2, size * 1.15, size, { family: f, weight: 700, color: '#FFFFFF' }); Y.globalCompositeOperation = 'source-in';
      const gr = Y.createLinearGradient(0, size * 0.2, 0, size * 1.3); gr.addColorStop(0, cols[0]); gr.addColorStop(0.45, cols[1]); gr.addColorStop(0.55, cols[2]); gr.addColorStop(1, cols[0]); Y.fillStyle = gr; Y.fillRect(0, 0, w, size * 1.6);
      const sx = ((t - s) / 0.8 % 1.6) * (w + 300) - 300; const sg = Y.createLinearGradient(sx, 0, sx + 140, size); sg.addColorStop(0, rgba('#FFFFFF', 0)); sg.addColorStop(0.5, rgba('#FFFFFF', 0.85)); sg.addColorStop(1, rgba('#FFFFFF', 0)); Y.fillStyle = sg; Y.fillRect(0, 0, w, size * 1.6);
      X.save(); X.shadowColor = 'rgba(0,0,0,.55)'; X.shadowBlur = 18; X.shadowOffsetY = 6; X.drawImage(tc, 540 - w / 2, y - size * 1.15); X.shadowColor = rgba(cols[1], 0.7); X.shadowBlur = 36; X.shadowOffsetY = 0; X.drawImage(tc, 540 - w / 2, y - size * 1.15); X.restore(); });
    const n = o.n || 120; X.save(); X.globalAlpha *= e.o; for (let i = 0; i < n; i++) { const x0 = 540 + (h2(i, 1) - 0.5) * 900, sp2 = 20 + 20 * h2(i, 2), py = ((y - 200 + h2(i, 3) * 900 + (t - s) * sp2) % 1100) + y - 260, px = x0 + 20 * Math.sin(t * 1.3 + i);
      const tw2 = Math.abs(Math.sin(t * (3 + 3 * h2(i, 4)) + i)), r = 1 + 2 * h2(i, 5); X.globalAlpha = e.o * tw2; X.fillStyle = i % 3 ? cols[0] : '#FFFFFF';
      if (i % 7 === 0) FX.icon(X, 'spark', px, py, 14 + 10 * tw2, { fill: '#FFFFFF' }); else { X.beginPath(); X.arc(px, py, r, 0, TAU); X.fill(); } } X.restore(); };

  /* 319 عدسة كاميرا فيديو — إطار كاميرا (زوايا، ● REC يرمش، وقت، ×التكبير) والصورة تقرّب على الوجه بخطوات (كل خطوة بارتداد خفيف).
     o: {s, out, draw (Y) الفيديو, face | track, steps=[1,1.4,1.9,2.2], every=0.25 أو cues, recColor=P.acc, tc0=0 (بداية الوقت)} */
  FX.viewfinderZoom = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), src = o.draw || fakeSrc(P, 5), steps = o.steps || [1, 1.4, 1.9, 2.2], cues = cuesOf(o, steps.length, 0.25);
    const i = FX.cueIndex(cues, t), zPrev = i > 0 ? steps[i - 1] : 1, zc = i >= 0 ? steps[i] : 1, kk = i >= 0 ? bOut(pr(t, cues[i], cues[i] + 0.18), 1.2) : 0, ko = o.out != null ? 1 - cOut(pr(t, o.out, o.out + 0.25)) : 1, z = lerp(1, lerp(zPrev, zc, kk), ko);
    const fc = FX.faceAt(o, t, { x: 390, y: 520, w: 300, h: 370 }), fx = fc.cx, fy = fc.cy; X.save(); X.translate(540, 960); X.scale(z, z); X.translate(-lerp(540, fx, cl((z - 1) / 0.6)), -lerp(960, fy, cl((z - 1) / 0.6))); if (z > 1.3) X.filter = `blur(${(0.5 * (z - 1.3)).toFixed(2)}px)`; src(X); X.restore();
    if (t < s || ko <= ON) return; X.save(); X.globalAlpha *= ko * cOut(pr(t, s, s + 0.15)); X.strokeStyle = '#FFFFFF'; X.lineWidth = 5; const m = 60, arm = 90;
    [[m, m, 1, 1], [1080 - m, m, -1, 1], [1080 - m, 1920 - m - 120, -1, -1], [m, 1920 - m - 120, 1, -1]].forEach(([x, y, sx, sy]) => { X.beginPath(); X.moveTo(x + sx * arm, y); X.lineTo(x, y); X.lineTo(x, y + sy * arm); X.stroke(); });
    if (Math.floor(t * 2) % 2 === 0) { X.fillStyle = o.recColor || c.acc; X.beginPath(); X.arc(870, 128, 12, 0, TAU); X.fill(); } T(ctx, X, 'REC', 900, 140, 34, { family: 'num', weight: 700, color: '#FFFFFF', align: 'left' });
    const tt = Math.max(0, t - s + pick(o, 'tc0', 0)), fr = Math.floor((tt % 1) * 30), pad = v => String(Math.floor(v)).padStart(2, '0'); T(ctx, X, `${pad(tt / 3600)}:${pad(tt / 60 % 60)}:${pad(tt % 60)}:${pad(fr)}`, 90, 1700, 30, { family: 'num', weight: 500, color: '#FFFFFF', align: 'left' });
    T(ctx, X, '×' + z.toFixed(1), 990, 1700, 34, { family: 'num', weight: 600, color: '#FFFFFF', align: 'right' }); X.restore(); };

  /* 320 الشخص نقاط — الإطار يسود والموضوع يصير شبكة نقاط هافتون (حجم النقطة من الإضاءة) باللون المميز، وبالآخر يرجع للفيديو والنقاط تصغر.
     o: {s, out (افتراضي s+1), draw (Y), person (Y) اختياري, cell=14, dotColor=P.acc, invert=false (للموضوع الغامق على خلفية فاتحة)} */
  FX.halftoneSubject = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), z = pick(o, 'out', s + 1), src = o.draw || fakeSrc(P, 2); if (t < s || t >= z + 0.25) { src(X); return; }
    const ko = pr(t, z, z + 0.25), cell = Math.max(4, Math.round(lerp(o.cell || 14, 4, ko))), gw = Math.round(1080 / cell), gh = Math.round(1920 / cell), subj = typeof o.person === 'function' ? o.person : src, smp = sample('half_src', subj, gw, gh, ctx);
    X.fillStyle = mixC(c.inkD, '#000000', 0.8); X.fillRect(0, 0, 1080, 1920); const kg = cOut(pr(t, s + 0.1, s + 0.35)); if (smp.d && t >= s + 0.1) { const D = smp.d; X.fillStyle = o.dotColor || c.acc;
      for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) { const i = (y * gw + x) * 4; if (D[i + 3] < 30) continue; let l = (0.2126 * D[i] + 0.7152 * D[i + 1] + 0.0722 * D[i + 2]) / 255; if (o.invert) l = 1 - l; const r = cell * 0.5 * Math.pow(l, 0.8) * kg; if (r < 0.6) continue;
        X.beginPath(); X.arc(x * cell + cell / 2, y * cell + cell / 2, r, 0, TAU); X.fill(); } }
    if (ko > 0) { X.save(); X.globalAlpha = cOut(ko); src(X); X.restore(); } };

  /* 321 جدار المقاطع — شبكة صور مقاطع (مصغّرات) تتحرك لفوق: (behind) تنزل ورا الشخص مع كرت متابعين يعدّ، أو (pullback) الفيديو يصغر ويصير منشور داخل الجدار.
     o: {s, out, mode='behind'|'pullback', thumbs:[img | (Y)=>{}], cols=3, draw (Y) الفيديو, person (Y), from=14615, to=34250, label='followers'} */
  FX.thumbWall = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), f = fam(o), mode = o.mode || 'behind', src = o.draw || fakeSrc(P, 3), cols = o.cols || 3, gap = 8;
    const ko = o.out != null ? 1 - cOut(pr(t, o.out, o.out + 0.3)) : 1, thumbs = o.thumbs || Array.from({ length: 12 }, (_, i) => fakeSrc(P, 20 + i)); if (t < s || ko <= ON) { src(X); return; }
    const cw = (1080 - gap * (cols + 1)) / cols, ch = cw * 1.33, scroll = (t - s) * 40, k = cOut(pr(t, s, s + 0.35)) * ko;
    const wall = (Y, dy) => { Y.fillStyle = c.night; Y.fillRect(0, 0, 1080, 1920); for (let r = -1; r < 7; r++) for (let q = 0; q < cols; q++) { const i = ((r + 40) * cols + q) % thumbs.length, x = gap + q * (cw + gap), y = gap + r * (ch + gap) - (scroll % (ch + gap)) + dy;
      Y.save(); rr(Y, x, y, cw, ch, 10); Y.clip(); drawSrc(ctx, Y, thumbs[i], x, y, cw, ch); Y.fillStyle = rgba('#000000', 0.35); Y.fillRect(x, y + ch - 70, cw, 70); Y.fillStyle = rgba('#FFFFFF', 0.85); Y.fillRect(x + 14, y + ch - 44, cw * 0.4, 12); Y.restore(); } };
    if (mode === 'pullback') { wall(X, 0); const sc = lerp(1, 0.72, ioC(pr(t, s, s + 0.3)) * ko), r = lerp(0, 28, ioC(pr(t, s, s + 0.3))), w = 1080 * sc, h = 1920 * sc, x = 540 - w / 2, y = 960 - h / 2;
      X.save(); shd(X, 50, 16, 0.5); X.fillStyle = c.night; rr(X, x - 10, y - 60, w + 20, h + 160, r + 8); X.fill(); noShd(X); X.save(); rr(X, x, y, w, h, r); X.clip(); X.translate(x, y); X.scale(sc, sc); src(X); X.restore();
      X.globalAlpha *= cl((1 - sc) / 0.28); X.fillStyle = c.acc; X.beginPath(); X.arc(x + 24, y - 30, 16, 0, TAU); X.fill(); X.fillStyle = rgba('#FFFFFF', 0.8); X.fillRect(x + 50, y - 36, 160, 12); ['heart', 'chat', 'play'].forEach((nm, i) => FX.icon(X, nm, x + 30 + i * 60, y + h + 46, 34, { fill: '#FFFFFF' })); X.restore(); return; }
    src(X); X.save(); X.globalAlpha *= k; X.translate(0, -1920 * (1 - k)); wall(X, 0); X.restore(); if (typeof o.person === 'function') o.person(X);
    const kc = cOut(pr(t, s + 0.3, s + 0.6)) * ko; if (kc > ON) { const v = Math.round(lerp(pick(o, 'from', 14615), pick(o, 'to', 34250), eOut(pr(t, s + 0.4, s + 1.2)))), y = 1080;
      X.save(); X.globalAlpha *= kc; X.fillStyle = rgba('#FFFFFF', 0.16); rr(X, 60, y, 560, 110, 28); X.fill(); X.strokeStyle = rgba('#FFFFFF', 0.3); X.lineWidth = 2; X.stroke(); X.fillStyle = c.acc; X.beginPath(); X.arc(115, y + 55, 32, 0, TAU); X.fill();
      T(ctx, X, ctx.num ? ctx.num(v) : String(v), 165, y + 58, 44, { family: 'num', weight: 800, color: '#FFFFFF', align: 'left' }); T(ctx, X, o.label || 'followers', 165, y + 90, 20, { family: f, weight: 500, color: rgba('#FFFFFF', 0.8), align: 'left' });
      X.fillStyle = rgba('#FFFFFF', 0.92); rr(X, 460, y + 34, 140, 44, 12); X.fill(); T(ctx, X, o.button || 'Following', 530, y + 64, 20, { family: f, weight: 700, color: '#151515' }); X.restore(); } };

  /* 322 بوستر أبيض وأسود — الفيديو يصير أبيض وأسود بتباين عالي، كلمة ضخمة باللون المميز ورا الشخص، وثلاث سطور مكدّسة تحت (الوسطى ملوّنة) تطلع بالتتابع.
     o: {s, out, draw (Y), person (Y), word='FREE', lines:['ONE CLIP.','24 EFFECTS.','ZERO APPS.'], color=P.acc, tag='● REC'} */
  FX.monoPoster = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), f = fam(o), src = o.draw || fakeSrc(P, 2), z = o.out; if (t < s || (z != null && t >= z)) { src(X); return; }
    const col = o.color || c.acc, word = o.word || 'FREE', hasP = typeof o.person === 'function';
    X.save(); X.filter = 'grayscale(1) contrast(1.35) brightness(0.85)'; src(X); X.restore(); const g = X.createLinearGradient(0, 1100, 0, 1920); g.addColorStop(0, rgba('#000000', 0)); g.addColorStop(1, rgba('#000000', 0.6)); X.fillStyle = g; X.fillRect(0, 1100, 1080, 820);
    const ww = tw(ctx, X, word, 300, 900, f), sx = Math.min(1, 980 / ww) * 0.95; T(ctx, X, word, 540, hasP ? 560 : 420, 300, { family: f, weight: 900, color: col, scaleX: sx * 0.86 });
    if (hasP) { X.save(); X.filter = 'grayscale(1) contrast(1.35) brightness(0.85)'; o.person(X); X.restore(); }
    const lines = o.lines || ['ONE CLIP.', '24 EFFECTS.', 'ZERO APPS.'], ar = isAr(lines.join(''));
    lines.forEach((ln, i) => { const k = cOut(pr(t, s + 0.15 + i * 0.15, s + 0.4 + i * 0.15)); if (k <= ON) return; T(ctx, X, ln, ar ? 1010 : 70, 1340 + i * 108 + 20 * (1 - k), 88, { family: f, weight: 900, color: i === 1 ? col : '#FFFFFF', align: ar ? 'right' : 'left', alpha: k, scaleX: 0.86 }); });
    T(ctx, X, o.tag || '● REC', ar ? 1010 : 70, 1800, 18, { family: 'num', weight: 700, color: col, align: ar ? 'right' : 'left' }); };

  /* 323 مزاج اللون — تدريج لوني للفيديو: moody (أغمق، ألوان أقل، ظلال باردة، فينيت ثقيل) · warm · bw · cool، يدخل ويطلع بنعومة.
     o: {s, out, draw (Y), look='moody'|'warm'|'bw'|'cool', amount=1, dur=0.2} */
  FX.moodGrade = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), d = o.dur || 0.2, src = o.draw || fakeSrc(P, 3);
    const k = cOut(pr(t, s, s + d)) * (o.out != null ? 1 - cOut(pr(t, o.out, o.out + d)) : 1) * pick(o, 'amount', 1), look = o.look || 'moody'; if (k <= ON) { src(X); return; }
    const L = { moody: { b: -0.35, sat: -0.4, con: 0.08, tint: mixC(c.night, c.acc, 0.1), ta: 0.15, vig: 0.55 }, warm: { b: 0.02, sat: 0.1, con: 0.05, tint: c.acc, ta: 0.12, vig: 0.25, sep: 0.3 }, bw: { b: -0.05, sat: -1, con: 0.25, ta: 0, vig: 0.35 }, cool: { b: -0.1, sat: -0.2, con: 0.05, tint: hueRot(c.acc, 180), ta: 0.14, vig: 0.3 } }[look] || {};
    X.save(); X.filter = `brightness(${(1 + (L.b || 0) * k).toFixed(3)}) saturate(${(1 + (L.sat || 0) * k).toFixed(3)}) contrast(${(1 + (L.con || 0) * k).toFixed(3)})${L.sep ? ` sepia(${(L.sep * k).toFixed(2)})` : ''}`; src(X); X.restore();
    if (L.ta) { X.save(); X.globalCompositeOperation = look === 'warm' ? 'soft-light' : 'multiply'; X.globalAlpha = L.ta * k * (look === 'warm' ? 2 : 1); X.fillStyle = L.tint; X.fillRect(0, 0, 1080, 1920); X.restore(); }
    const v = X.createRadialGradient(540, 860, 300, 540, 960, 1250); v.addColorStop(0, rgba('#000000', 0)); v.addColorStop(1, rgba('#000000', (L.vig || 0.3) * k)); X.fillStyle = v; X.fillRect(0, 0, 1080, 1920); };

  /* 324 ساعة قلابة — ساعة HH:MM بلاطتين غامقة بخط فاصل، كل نبضة الرقم ينقلب (النص الفوقاني ينطوي وبعده التحتاني) ويعدّ تنازلي أو تصاعدي.
     o: {s, out, from=[2,20] (ساعات، دقايق) أو seconds, step=0.25, dir=-1, labels=['HRS','MIN'], y=330, size=230} */
  FX.flipClock = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), f = fam(o), st = o.step || 0.25, dir = pick(o, 'dir', -1), y = pick(o, 'y', 330), sz = o.size || 230;
    const fr = o.from || [2, 20], base = fr[0] * 60 + fr[1], ko = o.out != null ? 1 - cOut(pr(t, o.out, o.out + 0.25)) : 1, ki = cOut(pr(t, s, s + 0.3)); if (ki * ko <= ON) return;
    const i = Math.max(0, Math.floor((t - s) / st)), kf = pr(t, s + i * st, s + i * st + 0.16), vNow = Math.max(0, base + dir * i), vPrev = Math.max(0, base + dir * (i - 1));
    const tile = (cx, now, prev, label) => { const W = 380, H = 300, tx = cx - W / 2, ty = y - H / 2, fill = c.dark ? mixC(c.bg, c.ink, 0.12) : mixC(c.inkD, '#000000', 0.15), ink = '#F5F5F5';
      const half = (top, txt) => { X.save(); X.beginPath(); X.rect(tx, top ? ty : y, W, H / 2); X.clip(); X.fillStyle = fill; rr(X, tx, ty, W, H, 22); X.fill(); T(ctx, X, txt, cx, y + sz * 0.36, sz, { family: 'num', weight: 900, color: ink }); X.restore(); };
      shd(X, 30, 12, 0.4); X.fillStyle = fill; rr(X, tx, ty, W, H, 22); X.fill(); noShd(X);
      if (kf < 1 && i > 0 && now !== prev) { half(true, now); half(false, prev); const ph = kf < 0.5 ? kf * 2 : (kf - 0.5) * 2;
        X.save(); if (kf < 0.5) { X.translate(0, y); X.scale(1, 1 - ph); X.translate(0, -y); half(true, prev); } else { X.translate(0, y); X.scale(1, ph); X.translate(0, -y); half(false, now); } X.restore(); }
      else { half(true, now); half(false, now); }
      X.fillStyle = c.dark ? c.bg : mixC(c.inkD, '#000000', 0.5); X.fillRect(tx, y - 2, W, 4); if (label) T(ctx, X, label, cx, ty + H + 44, 26, { family: isAr(label) ? f : 'num', weight: 700, color: c.mut, letterSpacing: 4 }); };
    const p2 = v => String(v).padStart(2, '0'), labs = o.labels || ['HRS', 'MIN']; X.save(); X.globalAlpha *= ki * ko;
    tile(320, p2(Math.floor(vNow / 60)), p2(Math.floor(vPrev / 60)), labs[0]); tile(760, p2(vNow % 60), p2(vPrev % 60), labs[1]); T(ctx, X, ':', 540, y + 40, 140, { family: 'num', weight: 900, color: c.ink }); X.restore(); };

  /* 325 مروحة كروت — (strip) كروت صغيرة على قوس تحت تطلع بالتتابع وتتمايل؛ أو (behind) كروت جوال كبيرة تنفتح مثل المروحة ورا راس الشخص (تحت القصّ).
     o: {s, out, mode='strip'|'behind', cards:[img | (Y)=>{}], n=10, y, person (Y) لوضع behind, spread=35 (درجة)} */
  FX.cardFan = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), mode = o.mode || 'strip', n = (o.cards || []).length || o.n || (mode === 'strip' ? 10 : 6);
    const card = i => (o.cards && o.cards[i]) || fakeSrc(P, 30 + i), ko = o.out != null ? 1 - cOut(pr(t, o.out, o.out + 0.3)) : 1; if (ko <= ON || t < s) { if (mode === 'behind' && typeof o.person === 'function') o.person(X); return; }
    X.save(); X.globalAlpha *= ko;
    if (mode === 'strip') { const y = pick(o, 'y', 1690), w = 104, h = 156, sp = 86;
      for (let i = 0; i < n; i++) { const k = cOut(pr(t, s + i * 0.03, s + 0.3 + i * 0.03)); if (k <= ON) continue; const u = n > 1 ? i / (n - 1) - 0.5 : 0, x = 540 + u * sp * (n - 1), yy = y + 60 * u * u * 4 + 40 * (1 - k) + 4 * Math.sin(t * 2.5 + i), a = u * 0.35;
        X.save(); X.globalAlpha *= k; X.translate(x, yy); X.rotate(a); shd(X, 12, 5, 0.35); X.fillStyle = '#FFFFFF'; rr(X, -w / 2 - 3, -h / 2 - 3, w + 6, h + 6, 10); X.fill(); noShd(X); X.save(); rr(X, -w / 2, -h / 2, w, h, 8); X.clip(); drawSrc(ctx, X, card(i), -w / 2, -h / 2, w, h); X.restore(); X.restore(); } }
    else { const piv = [pick(o, 'x', 540), pick(o, 'y', 1150)], k = bOut(pr(t, s, s + 0.3), 1.6), spr = (pick(o, 'spread', 35)) * Math.PI / 180, w = 300, h = 560;
      for (let i = 0; i < n; i++) { const u = n > 1 ? i / (n - 1) - 0.5 : 0, a = u * 2 * spr * k; X.save(); X.translate(piv[0], piv[1]); X.rotate(a); X.translate(0, -560); shd(X, 20, 8, 0.4); X.fillStyle = '#0B0B0B'; rr(X, -w / 2 - 8, -h / 2 - 8, w + 16, h + 16, 34); X.fill(); noShd(X);
        X.save(); rr(X, -w / 2, -h / 2, w, h, 28); X.clip(); drawSrc(ctx, X, card(i), -w / 2, -h / 2, w, h); X.restore(); X.restore(); }
      if (typeof o.person === 'function') o.person(X); }
    X.restore(); };

  /* 326 كلمة ضخمة وكلمة صغيرة — كلمة عريضة ضخمة باللون المميز تنكشف بقناع يمسح (يمين→يسار بالعربي)، وتحتها كلمة صغيرة بخط مزخرف.
     o: {s, out, a='GIANT', b='captions', colorA=P.acc, yA=330, yB=1200, person (Y) = الكلمة الضخمة ورا الشخص, scaleX=0.78} */
  FX.giantPair = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), f = fam(o), a = o.a || 'GIANT', b = o.b || 'captions', ar = isAr(a), ko = o.out != null ? 1 - cOut(pr(t, o.out, o.out + 0.25)) : 1; if (t < s || ko <= ON) { if (typeof o.person === 'function') o.person(X); return; }
    const sxA = pick(o, 'scaleX', 0.78), wA = tw(ctx, X, a, 300, 900, f) * sxA, size = Math.min(380, 300 * 1020 / Math.max(1, wA)), W = 1080, H = size * 1.4, { c: tc, Y } = off('giant', W, H);
    T(ctx, Y, a, 540, size * 1.08, size, { family: f, weight: 900, color: o.colorA || c.acc, scaleX: sxA }); const k = cOut(pr(t, s, s + 0.2)), fe = 30;
    Y.globalCompositeOperation = 'destination-in'; const edge = ar ? lerp(W + fe, -fe, k) : lerp(-fe, W + fe, k), g = Y.createLinearGradient(edge - fe, 0, edge + fe, 0);
    if (ar) { g.addColorStop(0, rgba('#000000', 0)); g.addColorStop(1, rgba('#000000', 1)); } else { g.addColorStop(0, rgba('#000000', 1)); g.addColorStop(1, rgba('#000000', 0)); } Y.fillStyle = g; Y.fillRect(0, 0, W, H);
    X.save(); X.globalAlpha *= ko; X.drawImage(tc, 0, pick(o, 'yA', 330) - size * 1.08); X.restore(); if (typeof o.person === 'function') o.person(X);
    const kb = cOut(pr(t, s + 0.08, s + 0.35)) * ko; if (kb > ON) T(ctx, X, b, 540, pick(o, 'yB', 1200), o.sizeB || 90, { family: o.familyB || 'Aref Ruqaa', weight: 400, color: '#FFFFFF', alpha: kb, shadow: { color: 'rgba(0,0,0,.4)', blur: 12, y: 3 } }); };

  /* 327 عنوان بلونين — كلمات العنوان الكبيرة: المميزة بتدرّج عمودي من اللون المميز (فاتح→غامق) وتوهج، والباقي أبيض→رمادي، وتحته سطر فيه أيقونات {اسم}.
     o: {s, out, text='*Viral* Videos' ('*كلمة*' = ملوّنة), sub='With one prompt in {spark} any app', size=128, y=260, icons:{اسم: img}} */
  FX.gradHeadline = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), f = fam(o), str = o.text || '*Viral* Videos', size = o.size || 128, y = pick(o, 'y', 260);
    const e = env(t, s, o.out, { din: 0.4 }); if (e.o <= ON) return; const parts = String(str).split(/\s+/).map(w => ({ w: w.replace(/\*/g, ''), hi: /\*/.test(w) })), rtl = isAr(str), sp = size * 0.25;
    withE(X, e, 540, y - size * 0.35, () => { const W = parts.map(p => tw(ctx, X, p.w, size, 900, f)), tot = W.reduce((a, b) => a + b, 0) + sp * (parts.length - 1), sc = Math.min(1, 1000 / tot); X.save(); X.translate(540, y); X.scale(sc, sc); let cx = rtl ? tot / 2 : -tot / 2;
      parts.forEach((p, i) => { const w = W[i], x = rtl ? cx - w / 2 : cx + w / 2; cx += (rtl ? -1 : 1) * (w + sp); const g = X.createLinearGradient(0, -size * 0.85, 0, size * 0.1);
        if (p.hi) { g.addColorStop(0, mixC(c.acc, '#FFFFFF', 0.45)); g.addColorStop(0.6, c.acc); g.addColorStop(1, mixC(c.acc, '#000000', 0.12)); } else { g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, mixC('#FFFFFF', c.mut, 0.45)); }
        T(ctx, X, p.w, x, 0, size, { family: f, weight: 900, color: g, shadow: p.hi ? { color: rgba(c.acc, 0.45), blur: 30, y: 0 } : { color: 'rgba(0,0,0,.35)', blur: 14, y: 4 } }); }); X.restore();
      if (o.sub !== false) { const sub = o.sub || 'With one prompt in {spark} any app', toks = sub.split(/(\{\w+\})/).filter(Boolean), ss = size * 0.32, ws = toks.map(tk => (/^\{\w+\}$/.test(tk) ? ss * 1.2 : tw(ctx, X, tk, ss, 600, f))), tt = ws.reduce((a, b) => a + b, 0), r2 = isAr(sub); let x2 = r2 ? 540 + tt / 2 : 540 - tt / 2;
        toks.forEach((tk, i) => { const w = ws[i], mx = r2 ? x2 - w / 2 : x2 + w / 2; x2 += r2 ? -w : w; const m = /^\{(\w+)\}$/.exec(tk), yy = y + size * 0.62;
          if (m) { const im = o.icons && imgOf(ctx, o.icons[m[1]]); if (im) X.drawImage(im, mx - ss * 0.45, yy - ss * 0.85, ss * 0.9, ss * 0.9); else FX.icon(X, m[1], mx, yy - ss * 0.35, ss * 0.85, { fill: c.acc }); }
          else T(ctx, X, tk, mx, yy, ss, { family: f, weight: 600, color: mixC('#FFFFFF', c.mut, 0.25) }); }); } }); };

  /* 328 مسرح بأشعة — خلفية غامقة بشبكة خفيفة، أشعة ضوء نازلة من فوق تتنفس، وتوهج ورا العنصر البطل وفينيت.
     o: {s, n=3, grid=true, hero:{x,y,w,h} (التوهج وراه), color (لون الأشعة), breathe=true} */
  FX.stageCones = (ctx, t, o) => { o = o || {}; const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), k = cOut(pr(t, s - 0.001, s + 0.6)), base = c.dark ? c.bg : mixC(c.inkD, '#000000', 0.35);
    X.fillStyle = base; X.fillRect(0, 0, 1080, 1920); if (o.grid !== false) { X.fillStyle = rgba('#FFFFFF', 0.04 * k); for (let x = 0; x < 1080; x += 60) X.fillRect(x, 0, 1, 1920); for (let y = 0; y < 1920; y += 60) X.fillRect(0, y, 1080, 1); }
    const n = o.n || 3, col = o.color || mixC(c.acc, '#FFFFFF', 0.6); X.save(); X.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) { const cx = 1080 * (n === 1 ? 0.5 : 0.2 + 0.6 * i / (n - 1)), br = o.breathe === false ? 1 : 1 + 0.15 * Math.sin(t * TAU * 0.15 + i * 2), half = Math.tan(9 * Math.PI / 180) * 1340;
      const g = X.createLinearGradient(0, -40, 0, 1300); g.addColorStop(0, rgba(col, 0.13 * k * br)); g.addColorStop(1, rgba(col, 0)); X.fillStyle = g; X.beginPath(); X.moveTo(cx - 30, -40); X.lineTo(cx + 30, -40); X.lineTo(cx + half, 1300); X.lineTo(cx - half, 1300); X.closePath(); X.fill(); }
    X.restore(); const h = o.hero || { x: 560, y: 520, w: 400, h: 760 }, gx = h.x + h.w / 2, gy = h.y + h.h / 2, hg = X.createRadialGradient(gx, gy, 50, gx, gy, Math.max(h.w, h.h) * 0.8);
    hg.addColorStop(0, rgba(c.acc, 0.28 * k)); hg.addColorStop(1, rgba(c.acc, 0)); X.fillStyle = hg; X.fillRect(0, 0, 1080, 1920);
    const v = X.createRadialGradient(540, 900, 400, 540, 960, 1250); v.addColorStop(0, rgba('#000000', 0)); v.addColorStop(1, rgba('#000000', 0.35)); X.fillStyle = v; X.fillRect(0, 0, 1080, 1920); };
})();
