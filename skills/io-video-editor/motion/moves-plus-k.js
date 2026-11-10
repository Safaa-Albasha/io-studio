/* ═══ moves-plus-k.js — بنك الحركات 355–358 (I/O Studio) · باقة «ريلز الأدوات والبودكاست» ═══
   نفس العقد: FX.<اسم>(ctx, t, o) بإحداثيات 1080×1920، كل شي من t، الألوان من ctx.P، والأدوات من moves-plus-g.js (FX._g). لازم ينحمّل بعد moves-plus-i.js.
   تقنيات عامة (كود آي أو استوديو الأصلي، بلا نسخ من أي أداة):
     355 speakerTag   — اسم المتكلم فوق مقطع البودكاست: كبسولة بنقطة «مباشر» تنزلق وتقعد، وسطر صغير تحتها (الحلقة/المنصب)
     356 scoreRing    — حلقة تقييم تعبّي من 0 للرقم (لون الحلقة يتغيّر حسب الدرجة) وجنبها أسباب الدرجة كرقاقات تطلع وحدة وحدة
     357 seriesDayTag — شارة «اليوم N في سلسلة …» فوق الراس بخط عريض وحد، والرقم يعدّ لين يوقف (تربط مع engine/series.js)
     358 commandCallout — سطر صغير «الأمر كامل 👇» وتحته كبسولة بلون الهوية فيها الأمر نفسه ينكتب (اللاتيني حرف حرف، العربي كلمة كلمة)
   الكتالوج: motion/moves/catalog-plus-k.json · المعاينات: previews/355–358.mp4 (render-preview-k.js). */
(function () {
  const G = typeof window !== 'undefined' ? window : globalThis;
  const FX = (G.FX = G.FX || {});
  const U = FX._g; if (!U) return;
  const { cl, pr, lerp, pick, cOut, ioC, bOut, rgba, mixC, lum, isAr, pal, fam, T, tw, rr, shd, noShd, env, withE, typed, TAU, ON } = U;
  const num = n => String(Math.round(n));
  const cue = (ctx, k, t, id) => { if (ctx.cue) ctx.cue(k, t, { id }); };

  /* 355 اسم المتكلم — كبسولة فوق المقطع (تحت منطقة أزرار المنصة) فيها نقطة بلون الهوية تنبض واسم المتكلم، وتحتها سطر صغير اختياري.
     o: {s, out, name='اسم الضيف', sub (سطر صغير: الحلقة/المنصب), y=230, size=46, side:'center'|'right'|'left', live=true (النقطة), dark (كبسولة غامقة)} */
  FX.speakerTag = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), f = fam(o), s = pick(o, 's', 0), size = o.size || 46, y = pick(o, 'y', 230);
    const name = String(o.name || 'اسم الضيف'), e = env(t, s, o.out, { din: 0.35, yIn: -26, bIn: 10 }); if (e.o <= ON) return;
    const dot = o.live !== false, pad = size * 0.62, w = tw(ctx, X, name, size, 800, f) + pad * 2 + (dot ? size * 0.7 : 0), h = size * 1.62;
    const side = o.side || 'center', x = side === 'right' ? 1080 - 60 - w : side === 'left' ? 60 : 540 - w / 2;
    const bg = o.dark === false ? c.card : rgba(c.night, 0.78), ink = o.dark === false ? c.ink : '#FFFFFF';
    if (t >= s) cue(ctx, 'swish', s, 'spk@' + s);
    withE(X, e, x + w / 2, y + h / 2, () => {
      X.save(); shd(X, 24, 8, 0.28); X.fillStyle = bg; rr(X, x, y, w, h, h / 2); X.fill(); noShd(X);
      X.strokeStyle = rgba('#FFFFFF', 0.14); X.lineWidth = 2; rr(X, x + 1, y + 1, w - 2, h - 2, h / 2); X.stroke(); X.restore();
      const kw = cOut(pr(t, s + 0.12, s + 0.5)), rtl = isAr(name);   // الاسم يتكشف بمسحة من جهة القراءة
      X.save(); X.beginPath(); const cw = w * kw; X.rect(rtl ? x + w - cw : x, y - 4, cw, h + 8); X.clip();
      T(ctx, X, name, x + w / 2 - (dot ? (rtl ? size * 0.35 : -size * 0.35) : 0), y + h * 0.68, size, { family: f, weight: 800, color: ink }); X.restore();
      if (dot) { const dx = rtl ? x + w - pad * 0.75 : x + pad * 0.75, dy = y + h / 2, ph = (t - s) * 2.2, r = size * 0.16;
        X.save(); X.fillStyle = c.acc; X.globalAlpha *= 0.35 * (1 - (ph % 1)); X.beginPath(); X.arc(dx, dy, r * (1 + 1.6 * (ph % 1)), 0, TAU); X.fill(); X.restore();
        X.fillStyle = c.acc; X.beginPath(); X.arc(dx, dy, r, 0, TAU); X.fill(); }
      if (o.sub) { const ks = cOut(pr(t, s + 0.35, s + 0.7)); if (ks > ON) { const ss = size * 0.6, sw2 = tw(ctx, X, o.sub, ss, 600, f) + ss * 1.4, sh = ss * 1.6, sy = y + h + 12;
        X.save(); X.globalAlpha *= ks; X.fillStyle = rgba(c.night, 0.6); rr(X, x + w / 2 - sw2 / 2, sy, sw2, sh, sh / 2); X.fill();
        T(ctx, X, o.sub, x + w / 2, sy + sh * 0.68, ss, { family: f, weight: 600, color: '#FFFFFF' }); X.restore(); } }
    }); };

  /* 356 حلقة التقييم — دايرة تعبّي من 0 للدرجة (العدّاد يمشي معها) بلون يتدرج حسب الدرجة (ضعيف ← اللون الثانوي، قوي ← لون الهوية)،
     وجنبها عنوان وأسباب الدرجة كرقاقات تطلع وحدة وحدة — لمقارنة لقطات، تقييم منتج، «كم تعطيها؟».
     o: {s, out, value=94 (0..max), max=100, label (عنوان جنب الحلقة), reasons:['يبدأ بسؤال', …], x=540, y=820, r=150, every=0.35, suffix (مثل '%')} */
  FX.scoreRing = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), f = fam(o), s = pick(o, 's', 0), R = o.r || 150, cx = pick(o, 'x', 540), cy = pick(o, 'y', 820);
    const e = env(t, s, o.out, { din: 0.3 }); if (e.o <= ON) return; const max = o.max || 100, v = cl(pick(o, 'value', 94) / max), kf = ioC(pr(t, s + 0.15, s + 1.25)), cur = v * kf;
    const col = cur >= 0.8 ? c.acc : cur >= 0.5 ? mixC(c.acc2, c.acc, (cur - 0.5) / 0.3) : c.acc2, lw = R * 0.16;
    if (t >= s + 1.25) cue(ctx, 'ding', s + 1.25, 'ring@' + s);
    withE(X, e, cx, cy, () => {
      X.save(); shd(X, 30, 10, 0.22); X.fillStyle = c.card; X.beginPath(); X.arc(cx, cy, R + lw, 0, TAU); X.fill(); noShd(X);
      X.lineCap = 'round'; X.lineWidth = lw; X.strokeStyle = c.line; X.beginPath(); X.arc(cx, cy, R, 0, TAU); X.stroke();
      if (cur > 0.002) { X.strokeStyle = col; X.beginPath(); X.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + TAU * cur); X.stroke();
        const a = -Math.PI / 2 + TAU * cur; X.fillStyle = mixC(col, '#FFFFFF', 0.5); X.beginPath(); X.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, lw * 0.28, 0, TAU); X.fill(); }
      T(ctx, X, num(cur * max) + (o.suffix || ''), cx, cy + R * 0.22, R * 0.62, { family: f, weight: 900, color: c.ink }); X.restore();
      const reasons = o.reasons || ['يبدأ بسؤال', 'فيه كلمة تشد', 'فكرة كاملة'];
      if (o.label) { const kl = cOut(pr(t, s + 0.3, s + 0.7)); if (kl > ON) { X.save(); X.globalAlpha *= kl; T(ctx, X, o.label, 540, cy + R + lw + 110, 58, { family: f, weight: 800, color: c.ink, maxWidth: 940 }); X.restore(); } }
      let yy = cy + R + lw + (o.label ? 200 : 120);
      reasons.slice(0, 4).forEach((q, i) => { const at = s + 0.9 + i * pick(o, 'every', 0.35), k = bOut(pr(t, at, at + 0.28), 1.6); if (t < at || k <= ON) return; cue(ctx, 'tick', at, 'rr' + i + '@' + s);
        const size = 40, w = tw(ctx, X, q, size, 700, f) + 70, h = 72, x = 540 - w / 2;
        X.save(); X.globalAlpha *= cl(k * 2); X.translate(540, yy + h / 2); X.scale(k, k); X.translate(-540, -(yy + h / 2));
        X.fillStyle = rgba(c.acc, c.dark ? 0.22 : 0.14); rr(X, x, yy, w, h, h / 2); X.fill(); X.strokeStyle = rgba(c.acc, 0.55); X.lineWidth = 2; X.stroke();
        T(ctx, X, q, 540, yy + h * 0.66, size, { family: f, weight: 700, color: c.ink }); X.restore(); yy += h + 20; });
    }); };

  /* 357 شارة اليوم بالسلسلة — سطرين فوق الراس: «اليوم N» والرقم يعدّ لين يوقف بنطّة، وتحتها «في سلسلة …» — خط عريض بحد غامق يبين فوق أي فيديو.
     o: {s, out, day=3, series='سلسلة كلود', prefix='اليوم', y=150, size=64, color (لون السطر الأول — الافتراضي لون الهوية), count=true (العدّ من 1)}
     من ملف السلسلة: day = رقم الحلقة (engine/series.js) و series = اسمها. */
  FX.seriesDayTag = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), f = fam(o), s = pick(o, 's', 0), size = o.size || 64, y = pick(o, 'y', 150);
    const e = env(t, s, o.out, { din: 0.3, yIn: -20 }); if (e.o <= ON) return; const day = Math.max(1, Math.round(pick(o, 'day', 3)));
    const kc = o.count === false ? 1 : cOut(pr(t, s, s + 0.25 + Math.min(day, 30) * 0.03)), d = Math.max(1, Math.round(lerp(1, day, kc))), kb = bOut(pr(t, s + 0.25 + Math.min(day, 30) * 0.03, s + 0.55 + Math.min(day, 30) * 0.03), 2.2);
    const line1 = (o.prefix || 'اليوم') + ' ' + d, line2 = 'في ' + (o.series || 'سلسلة كلود'), stroke = { color: rgba(c.night, 0.95), width: size * 0.16 };
    withE(X, e, 540, y, () => {
      X.save(); X.translate(540, y); const sc = kc < 1 ? 1 : lerp(1.18, 1, cl(kb)); X.scale(sc, sc);
      T(ctx, X, line1, 0, 0, size, { family: f, weight: 900, color: o.color || c.acc, stroke, shadow: { color: 'rgba(0,0,0,.45)', blur: 12, y: 3 } }); X.restore();
      T(ctx, X, line2, 540, y + size * 1.05, size * 0.92, { family: f, weight: 900, color: o.color2 || o.color || c.acc, stroke, shadow: { color: 'rgba(0,0,0,.45)', blur: 12, y: 3 } });
    }); };

  /* 358 الأمر كامل — سطر صغير بكبسولة فاتحة («الأمر كامل 👇» أو o.label) وتحته كبسولة بلون الهوية فيها الأمر نفسه ينكتب، ومؤشر يرمش لين يكمل —
     لريل يشرح أداة: «اكتب هالأمر» (غير slashCommand 294 اللي يرسم قائمة أوامر).
     o: {s, out, label='الأمر كامل 👇', cmd='/io-start شغّل البرنامج', y=1380, size=48, rate=0.045 (ثانية للحرف اللاتيني؛ العربي كلمة كل 0.12)} */
  FX.commandCallout = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), f = fam(o), s = pick(o, 's', 0), size = o.size || 48, y = pick(o, 'y', 1380);
    const e = env(t, s, o.out, { din: 0.3, yIn: 24 }); if (e.o <= ON) return; const label = o.label == null ? 'الأمر كامل 👇' : String(o.label), cmd = String(o.cmd || '/io-start شغّل البرنامج');
    const nW = cmd.split(/\s+/).length, dur = isAr(cmd) ? nW * 0.12 + cmd.replace(/[^\x20-\x7E]/g, '').length * 0.02 : cmd.length * pick(o, 'rate', 0.045);
    const t0 = s + 0.35, k = cl((t - t0) / Math.max(0.2, dur));
    if (t >= t0) cue(ctx, 'pen', t0, 'cmd@' + s);
    withE(X, e, 540, y, () => {
      if (label) { const ls = size * 0.72, lw = tw(ctx, X, label, ls, 700, f) + 56, lh = ls * 1.7; X.save(); X.fillStyle = rgba(c.inkL, 0.9); rr(X, 540 - lw / 2, y - lh - 22, lw, lh, 14); X.fill();
        T(ctx, X, label, 540, y - 22 - lh * 0.32, ls, { family: f, weight: 700, color: c.inkD }); X.restore(); }
      const full = tw(ctx, X, cmd, size, 800, f), w = Math.min(1000, full + 80), h = size * 1.75, x = 540 - w / 2;
      X.save(); shd(X, 26, 8, 0.3); X.fillStyle = mixC(c.acc, c.night, 0.55); rr(X, x, y, w, h, 16); X.fill(); noShd(X);
      X.strokeStyle = c.acc; X.lineWidth = 3; rr(X, x + 1.5, y + 1.5, w - 3, h - 3, 15); X.stroke();
      // الأمر (/…) جزء لاتيني يسار، والكلام العربي بعده — كل جزء يترسم لحاله عشان اتجاه النص ما يقلب ترتيبهم
      const m = cmd.match(/^(\S*[\x21-\x7E]\S*)\s+(.*)$/), lat = m && /^[\x21-\x7E]+$/.test(m[1]) ? m[1] : (/^[\x21-\x7E\s]+$/.test(cmd) ? cmd : ''), rest = lat ? (m ? m[2] : '') : cmd;
      const gap = size * 0.35, wl = lat ? tw(ctx, X, lat, size, 800, f) : 0, wr = rest ? tw(ctx, X, rest, size, 800, f) : 0, tot = wl + (lat && rest ? gap : 0) + wr, x0 = 540 - tot / 2, by = y + h * 0.66;
      const nL = lat.length, kl = nL ? cl(k * (nL + (rest ? rest.length : 0)) / nL) : 1, kr = rest ? cl((k * (nL + rest.length) - nL) / Math.max(1, rest.length)) : 1;
      let cur = x0;
      if (lat) { const sL = lat.slice(0, Math.round(kl * nL)), w = tw(ctx, X, sL, size, 800, f); X.save(); X.font = ctx.font(f, 800, size); X.fillStyle = '#FFFFFF'; X.textAlign = 'left'; X.direction = 'ltr'; X.fillText('\u200E' + sL + '\u200E', x0, by); X.restore(); cur = x0 + w; }
      if (rest && kr > 0) { const sR = typed(rest, kr), w = tw(ctx, X, sR, size, 800, f), xr = x0 + wl + (lat ? gap : 0); T(ctx, X, sR, xr + w / 2, by, size, { family: f, weight: 800, color: '#FFFFFF' }); cur = xr + w; }
      if (k < 1 || Math.floor((t - t0) * 2) % 2 === 0) { X.fillStyle = '#FFFFFF'; X.fillRect(cur + 6, y + h * 0.24, 4, h * 0.52); }
      X.restore();
    }); };
  void lum; void typed;
})();
