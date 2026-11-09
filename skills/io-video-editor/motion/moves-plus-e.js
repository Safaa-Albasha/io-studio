/* ═══ moves-plus-e.js — بنك الحركات 243–264 (I/O Studio) · باقة «أنمي وكرتون» ═══
   نفس عقد motion/moves.js: كل حركة = FX.<اسم>(ctx, t, o) ترسم على ctx.X بإحداثيات التصميم (1080×1920)، كل خاصية من t (بلا تراكم ولا Math.random).
   o.s = بداية الحركة · o.out = بداية الطلعة (اختياري) · الألوان من ctx.P (bg ink acc clay hi mut) إلا لو مرّرت غيرها · الخط Cairo (family 'cairo').
   الكتالوج: motion/moves/catalog-plus-e.json · المعاينات: previews/243–264.mp4 (motion/moves/render-preview-e.js) · الشرح: references/moves.md
   ⚠ تصميم أصلي بكودنا: أدوات النوع العامة (خطوط السرعة، خطوط التركيز، فريم الضربة، علامة الزعل، العرق، الدخان، الفقاعات، الألواح…)
     بلا أي شخصية أو شعار أو تصميم من أنمي أو سلسلة موجودة. الشخصية «تشيبي» مرسومة هني من الصفر.
     243–246 كاميرا وضربات: speedLines · focusBurst · impactFrame · dramaZoom
     247–252 علامات فوق نقطة (راس/وجه): twinkleStars · sweatDrop · angerMark · shockMarks · questionPop · exclaimPop
     253–257 دخول وطلعة ونص: entranceShine · poofSmoke · boldShout · onoBurst · comicBubble
     258–261 تشيبي ونجوم وخلفية: chibiReact · chibiPhoto · starBurst · halftoneBg
     262–264 انتقالات (o.A → o.B): mangaPanels · brushWipe · spiralWipe
   أدوات للمشاهد: FX.chibiHead(ctx, X, x, y, R, mood, o) يرسم راس التشيبي (أو صورة الوجه + تعابيرها) بأي مكان. */
(function () {
  const G = typeof window !== 'undefined' ? window : globalThis;
  const FX = (G.FX = G.FX || {});
  const TAU = Math.PI * 2, ON = 0.01, FAM = 'cairo';
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const pr = (t, a, b) => (b === a ? (t >= b ? 1 : 0) : cl((t - a) / (b - a)));
  const lerp = (a, b, k) => a + (b - a) * k;
  const pick = (o, k, d) => (o && o[k] !== undefined ? o[k] : d);
  const bOut = k => { k = cl(k); const s = 1.70158; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); };
  const cOut = k => 1 - Math.pow(1 - cl(k), 3);
  const cIn = k => Math.pow(cl(k), 3);
  const ioC = k => { k = cl(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
  const frac = v => v - Math.floor(v);
  const h2 = (a, b) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const hexRGB = h => { const c = String(h || '#000').replace('#', ''), f = c.length === 3 ? c.split('').map(x => x + x).join('') : c; return [0, 2, 4].map(j => parseInt(f.slice(j, j + 2), 16) || 0); };
  const rgba = (h, a) => { if (!/^#/.test(String(h))) return h; const [r, g, b] = hexRGB(h); return `rgba(${r},${g},${b},${a})`; };
  const mixC = (a, b, k) => { if (!/^#/.test(String(a)) || !/^#/.test(String(b))) return a; const A = hexRGB(a), B = hexRGB(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], cl(k))).toString(16).padStart(2, '0')).join(''); };
  const lum = h => { if (!/^#/.test(String(h))) return 128; const c = hexRGB(h); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const fout = (ctx, t, o, d = 0.4) => (o.out != null ? cIn(pr(t, o.out, o.out + d)) : 0);
  const rr = (X, x, y, w, h, r) => { X.beginPath(); X.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); };
  const T = (ctx, X, s, x, y, size, opt) => ctx.text(X, String(s), x, y, Object.assign({ family: FAM, weight: 700, size }, opt || {}));
  const tw = (ctx, X, s, size, w) => { X.save(); X.font = ctx.font(FAM, w || 700, size); const v = X.measureText(String(s)).width; X.restore(); return v; };
  const wrap = (ctx, X, str, size, w, maxW) => { X.save(); X.font = ctx.font(FAM, w, size); const out = [];
    String(str || '').split('\n').forEach(par => { let line = ''; par.split(/\s+/).filter(Boolean).forEach(word => { const tr = line ? line + ' ' + word : word; if (line && X.measureText(tr).width > maxW) { out.push(line); line = word; } else line = tr; }); out.push(line); });
    X.restore(); return out; };
  const drawWords = (ctx, X, lines, n, x, y, lh, size, w, color) => { let c = 0;
    lines.forEach((ln, i) => { const ws = ln.split(' ').filter(Boolean), k = Math.max(0, Math.min(ws.length, n - c)); c += ws.length; if (k > 0) T(ctx, X, ws.slice(0, k).join(' '), x, y + i * lh, size, { weight: w, color }); }); };
  // خط الحدود الكرتوني: حبر الثيم لو غامق، وإلا أسود دافي (بالثيم الغامق الحبر أبيض)
  const LINE = (P, o) => (o && o.outline) || (lum(P.ink) < 110 ? P.ink : '#1A1716');
  const TEAR = '#8FD0F5', BLUSH = 'rgba(255,110,130,.42)', SKIN = '#F4CDAE', HAIR = '#2E2433', CLOUD = '#FFFFFF';
  // ارتجاف على «اثنين» (12 أو 24 فريم): [dx, dy]
  const jit = (t, amp, seed, fps) => { const f = Math.floor(t * (fps || 24)); return [(h2(f, seed) - 0.5) * 2 * amp, (h2(f, seed + 7) - 0.5) * 2 * amp]; };
  // نص بحد عريض: حد الخط + (حد داخلي اختياري) + تعبئة — ونسخة ظل قاسي اختيارية
  const outlined = (ctx, X, s, x, y, size, o) => {
    const lw = o.lw || size * 0.13, w = o.weight || 900, mw = o.maxWidth;
    if (o.shadow) T(ctx, X, s, x + size * 0.05, y + size * 0.06, size, { weight: w, color: o.shadow, stroke: { width: lw * 2 + (o.inner ? lw : 0), color: o.shadow }, maxWidth: mw });
    T(ctx, X, s, x, y, size, { weight: w, color: o.line, stroke: { width: lw * 2 + (o.inner ? lw : 0), color: o.line }, maxWidth: mw });
    T(ctx, X, s, x, y, size, o.inner ? { weight: w, color: o.fill, stroke: { width: lw, color: o.inner }, maxWidth: mw } : { weight: w, color: o.fill, maxWidth: mw });
  };

  /* ── أشكال مرسومة ── */
  const spark4 = (X, x, y, r, rot) => { const c = Math.cos(rot || 0), s = Math.sin(rot || 0), p = (a, b) => [x + a * c - b * s, y + a * s + b * c];
    const q = r * 0.13, pts = [[0, -r], [q, -q], [r, 0], [q, q], [0, r], [-q, q], [-r, 0], [-q, -q]].map(([a, b]) => p(a, b));
    X.beginPath(); X.moveTo(pts[0][0], pts[0][1]); for (let i = 0; i < 4; i++) { const cp = pts[i * 2 + 1], nx = pts[(i * 2 + 2) % 8]; X.quadraticCurveTo(cp[0], cp[1], nx[0], nx[1]); } X.closePath(); };
  const star5 = (X, x, y, r, rot, inner) => { X.beginPath(); for (let i = 0; i < 10; i++) { const a = (rot || 0) - Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * (inner || 0.46) : r; i ? X.lineTo(x + q * Math.cos(a), y + q * Math.sin(a)) : X.moveTo(x + q * Math.cos(a), y + q * Math.sin(a)); } X.closePath(); };
  // قطرة: الراس فوق (x, y-s) والبطن تحت
  const dropPath = (X, x, y, s) => { X.beginPath(); X.moveTo(x, y - s); X.quadraticCurveTo(x + s * 0.52, y - s * 0.2, x + s * 0.48, y + s * 0.28); X.arc(x, y + s * 0.28, s * 0.48, 0, Math.PI); X.quadraticCurveTo(x - s * 0.52, y - s * 0.2, x, y - s); X.closePath(); };
  // نجمة بريق ملوّنة الحافة (بيضا من جوّا)
  const sparkle = (X, x, y, r, rot, rim, line) => { if (r < 0.5) return; X.save(); if (line) { spark4(X, x, y, r * 1.18, rot); X.fillStyle = line; X.fill(); }
    spark4(X, x, y, r * (line ? 1.0 : 1.12), rot); X.fillStyle = rim; X.fill(); spark4(X, x, y, r * 0.62, rot); X.fillStyle = '#FFFFFF'; X.fill(); X.restore(); };
  // دوائر متداخلة بحد واحد (غيمة/دخان): كل الحدود أول، بعدين التعبئة
  const blobs = (X, cs, fill, line, lw, shade) => {
    X.fillStyle = line; cs.forEach(c => { X.beginPath(); X.arc(c[0], c[1], c[2] + lw, 0, TAU); X.fill(); });
    X.fillStyle = shade || fill; cs.forEach(c => { X.beginPath(); X.arc(c[0], c[1], c[2], 0, TAU); X.fill(); });
    if (shade) { X.fillStyle = fill; cs.forEach(c => { X.beginPath(); X.arc(c[0] - c[2] * 0.07, c[1] - c[2] * 0.09, c[2] * 0.9, 0, TAU); X.fill(); }); } };
  // شعاع مدبب: من (r0) إلى (r1) بزاوية a، عرض القاعدة w
  const wedge = (X, cx, cy, a, r0, r1, w) => { const c = Math.cos(a), s = Math.sin(a), nx = -s * w / 2, ny = c * w / 2;
    X.beginPath(); X.moveTo(cx + c * r0 + nx, cy + s * r0 + ny); X.lineTo(cx + c * r1, cy + s * r1); X.lineTo(cx + c * r0 - nx, cy + s * r0 - ny); X.closePath(); };
  const polyPath = (X, pts) => { X.beginPath(); pts.forEach((p, i) => (i ? X.lineTo(p[0], p[1]) : X.moveTo(p[0], p[1]))); X.closePath(); };

  /* ── علامات قابلة لإعادة الاستخدام (ترسم بمكانها، k = تقدّم الدخول) ── */
  const MARK = {
    sweat(X, x, y, S, k, side, line, col) { if (k <= ON) return; X.save(); X.translate(x, y); X.rotate(side * 0.38); X.scale(k, k);
      dropPath(X, 0, 0, S); X.fillStyle = col || TEAR; X.fill(); X.lineWidth = S * 0.08; X.strokeStyle = line; X.lineJoin = 'round'; X.stroke();
      X.fillStyle = 'rgba(255,255,255,.85)'; X.beginPath(); X.ellipse(-S * 0.18, S * 0.3, S * 0.09, S * 0.17, 0.35, 0, TAU); X.fill(); X.restore(); },
    anger(X, x, y, S, k, col, line, rot) { if (k <= ON) return; X.save(); X.translate(x, y); X.rotate(rot || 0); X.scale(k, k); X.lineCap = 'round';
      const arm = (lw, c) => { for (let q = 0; q < 4; q++) { X.save(); X.rotate(q * Math.PI / 2); X.beginPath(); X.moveTo(S * 0.48, S * 0.11); X.quadraticCurveTo(S * 0.13, S * 0.13, S * 0.11, S * 0.48); X.lineWidth = lw; X.strokeStyle = c; X.stroke(); X.restore(); } };
      arm(S * 0.27, line); arm(S * 0.15, col); X.restore(); },
    shock(X, x, y, S, k, line, n, spread) { if (k <= ON) return; n = n || 5; const sp = spread || 1.9; X.save(); X.fillStyle = line;
      for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (n === 1 ? 0 : (i / (n - 1) - 0.5) * sp), r0 = S * 0.3 + S * 0.25 * (1 - k), L = S * (i % 2 ? 0.5 : 0.68) * cOut(k);
        wedge(X, x, y, a, r0 + L, r0, S * 0.13); X.fill(); } X.restore(); },
    dots(ctx, X, x, y, S, lt, line) { for (let i = 0; i < 3; i++) { const k = bOut(pr(frac(lt / 1.6) * 1.6, i * 0.28, i * 0.28 + 0.25)); if (k <= ON) continue;
      X.save(); X.translate(x + i * S * 0.42 - S * 0.42, y - i * S * 0.18); X.scale(k, k); X.beginPath(); X.arc(0, 0, S * (0.14 + i * 0.03), 0, TAU); X.fillStyle = '#FFFFFF'; X.fill(); X.lineWidth = S * 0.05; X.strokeStyle = line; X.stroke(); X.restore(); } },
    tears(X, x, y, R, side, lt, line) { for (let j = 0; j < 6; j++) { const p = frac(lt * 1.5 + j / 6), px = x + side * p * R * 0.95, py = y - Math.sin(p * Math.PI) * R * 0.38 + p * p * R * 0.9, s = R * 0.11 * (1 - p * 0.35);
      X.save(); X.globalAlpha *= 1 - pr(p, 0.75, 1); dropPath(X, px, py, s); X.fillStyle = TEAR; X.fill(); X.lineWidth = R * 0.02; X.strokeStyle = line; X.stroke(); X.restore(); } },
  };

  /* ═════════ أ) كاميرا وضربات ═════════ */

  /* 243 خطوط السرعة — خطوط أكشن مدببة ترتجف على 12 فريم: شعاعية حوالين نقطة (mode 'radial') أو متوازية عبر الشاشة ('parallel').
     o: {mode='radial'|'parallel', x=540, y=960, inner=380 (نص قطر الفراغ بالنص), rx, ry, angle=0 (درجات، للمتوازية), clear=0 (فراغ وسط المتوازية),
         count, color=حبر الحدود, alpha=1, fps=12, s, e (نهاية اختيارية), out} — ارسم الكلام فوقها */
  FX.speedLines = (ctx, t, o) => {
    o = o || {}; const { X, P } = ctx, s0 = o.s || 0; if (t < s0 || (o.e != null && t > o.e)) return;
    const a = cOut(pr(t, s0, s0 + 0.15)) * (1 - fout(ctx, t, o, 0.25)) * pick(o, 'alpha', 1); if (a <= ON) return;
    const par = o.mode === 'parallel', N = o.count || (par ? 48 : 96), f = Math.floor((t - s0) * (o.fps || 12));
    X.save(); X.globalAlpha *= a; X.fillStyle = o.color || LINE(P, o);
    if (par) {
      X.translate(pick(o, 'x', 540), pick(o, 'y', 960)); X.rotate((o.angle || 0) * Math.PI / 180); const clear = o.clear || 0;
      for (let i = 0; i < N; i++) { const y = -1150 + 2300 * ((i + 0.9 * h2(i, f)) / N); if (Math.abs(y) < clear) continue;
        const len = 260 + 900 * h2(i + 99, f), x0 = -1200 + 2400 * h2(i + 7, f * 3 + 1) - len / 2, w = 3 + 12 * h2(i, 5);
        X.beginPath(); X.moveTo(x0, y); X.lineTo(x0 + len * 0.62, y - w / 2); X.lineTo(x0 + len, y); X.lineTo(x0 + len * 0.62, y + w / 2); X.closePath(); X.fill(); }
    } else {
      const cx = pick(o, 'x', 540), cy = pick(o, 'y', 960), inner = pick(o, 'inner', 380), rx = pick(o, 'rx', inner), ry = pick(o, 'ry', inner * 1.25), R = 2300;
      for (let i = 0; i < N; i++) { const ang = (i + 0.85 * h2(i, f)) / N * TAU, j = 0.82 + 0.55 * h2(i + 5, f), w = 0.004 + 0.02 * h2(i + 31, f);
        const x0 = cx + Math.cos(ang) * rx * j, y0 = cy + Math.sin(ang) * ry * j;
        X.beginPath(); X.moveTo(x0, y0); X.lineTo(cx + Math.cos(ang - w) * R, cy + Math.sin(ang - w) * R); X.lineTo(cx + Math.cos(ang + w) * R, cy + Math.sin(ang + w) * R); X.closePath(); X.fill(); }
    }
    X.restore();
  };

  /* 244 خطوط التركيز — خطوط مانغا تتجمع حوالين كلمة (فراغ بيضاوي على قدّها)، والكلمة تنضرب بحد عريض وتنبض.
     o: {text='فجأة!', x=540, y=900, size=170, color=acc, glow=true, count=120, s, out} */
  FX.focusBurst = (ctx, t, o) => {
    o = o || {}; const { X, P } = ctx, s0 = o.s || 0; if (t < s0) return; const ko = fout(ctx, t, o), line = LINE(P, o);
    const text = o.text || 'فجأة!', x = pick(o, 'x', 540), y = pick(o, 'y', 900), size0 = o.size || 170, fs = Math.min(size0, size0 * 860 / Math.max(1, tw(ctx, X, text, size0, 900)));
    const w = tw(ctx, X, text, fs, 900), rx = Math.max(w / 2 + 110, 260), ry = fs * 0.95 + 120;
    X.save(); X.globalAlpha *= 1 - ko;
    if (o.glow !== false) { const k = cOut(pr(t, s0, s0 + 0.25)), g = X.createRadialGradient(x, y - fs * 0.3, 10, x, y - fs * 0.3, rx * 1.7); g.addColorStop(0, `rgba(255,255,255,${0.85 * k})`); g.addColorStop(0.6, `rgba(255,255,255,${0.35 * k})`); g.addColorStop(1, 'rgba(255,255,255,0)'); X.fillStyle = g; X.fillRect(0, 0, 1080, 1920); }
    FX.speedLines(ctx, t, { s: s0, x, y: y - fs * 0.32, rx: rx * 1.08, ry: ry * 1.08, count: o.count || 120, color: o.lineColor || line, fps: 12 });
    const k = pr(t, s0 + 0.08, s0 + 0.36), sc = lerp(1.7, 1, bOut(k)) * (1 + 0.025 * Math.sin((t - s0) * 7)) * (1 + 0.04 * Math.sin(k * Math.PI));
    if (k > 0) { X.save(); X.globalAlpha *= cl(k * 3); X.translate(x, y - fs * 0.32); X.scale(sc, sc); X.rotate(-0.04); X.translate(-x, -(y - fs * 0.32));
      outlined(ctx, X, text, x, y, fs, { fill: o.color || P.acc, line, inner: '#FFFFFF', shadow: line }); X.restore(); }
    X.restore();
  };

  /* 245 فريم الضربة — لحظة الصدمة: المشهد ينقلب سلبي بتباين عالي، فريم بلون الهوية، خطوط سرعة بيضا، ورجّة — وبعدها يرجع طبيعي.
     o: {draw: Y => المشهد (الحركة ترسمه قبل وبعد), s, dur=.45, at=[540,820] (مركز الخطوط), text (كلمة على الضربة، تبقى لين out), size=260, ty (ارتفاع الكلمة), out} */
  FX.impactFrame = (ctx, t, o) => {
    o = o || {}; const { X, P } = ctx, s0 = o.s || 0, d = o.dur || 0.45, line = LINE(P, o), at = o.at || [540, 820];
    const draw = o.draw || (Y => { Y.fillStyle = P.bg; Y.fillRect(0, 0, 1080, 1920); }), k = (t - s0) / d;
    const word = (fill, inner) => { if (!o.text) return; const fs0 = o.size || 260, fs = Math.min(fs0, fs0 * 900 / Math.max(1, tw(ctx, X, o.text, fs0, 900)));
      const kk = bOut(pr(t, s0, s0 + 0.18)), ko = fout(ctx, t, o); if (kk <= ON || ko >= 1) return; X.save(); X.globalAlpha *= 1 - ko; X.translate(540, pick(o, 'ty', Math.min(1700, at[1] + 560))); X.scale(kk, kk); X.rotate(-0.05);
      outlined(ctx, X, o.text, 0, 0, fs, { fill, line, inner }); X.restore(); };
    if (t < s0) { draw(X); return; }
    if (k >= 1) { const sh = (1 - pr(t, s0 + d, s0 + d + 0.4)) * 16, j = jit(t, sh, 3); X.save(); X.translate(j[0], j[1]); if (sh > 0.1) { X.translate(540, 960); X.scale(1.03, 1.03); X.translate(-540, -960); } draw(X); X.restore(); word(P.acc, '#FFFFFF'); return; }
    const ph = Math.min(4, Math.floor(k * 5)), j = jit(t, 22, 11), z = 1.08 - 0.05 * k;
    X.save(); X.translate(at[0] + j[0], at[1] + j[1]); X.scale(z, z); X.translate(-at[0], -at[1]);
    if (ph === 1) { X.fillStyle = line; X.fillRect(-60, -60, 1200, 2040); X.filter = 'grayscale(1) contrast(4) brightness(1.6)'; X.globalAlpha *= 0.28; draw(X); X.filter = 'none'; }
    else if (ph === 3) { X.filter = 'grayscale(1) contrast(3.2)'; draw(X); X.filter = 'none'; X.globalCompositeOperation = 'multiply'; X.fillStyle = P.acc; X.fillRect(-60, -60, 1200, 2040); }
    else { X.filter = 'grayscale(1) contrast(3.4) invert(1)'; draw(X); X.filter = 'none'; if (ph === 4) { X.globalAlpha *= pr(k, 0.8, 1); draw(X); } }
    X.restore();
    FX.speedLines(ctx, s0 + 1 + ph * 0.09, { s: s0, x: at[0], y: at[1], inner: 300, count: 80, color: ph === 3 ? line : '#FFFFFF', alpha: ph === 4 ? 1 - pr(k, 0.8, 1) : 1 });
    word(ph === 3 ? '#FFFFFF' : line, ph === 3 ? null : '#FFFFFF');
  };

  /* 246 زووم الدراما — ثلاث ضربات زووم سريعة على الوجه/النقطة، كل ضربة برجّة وخطوط سرعة، وإطار يغمق — لحظة «الحقيقة».
     o: {draw: Y => المشهد, at=[540,780], zoom=1.7, steps=3, step=.16, hold=.8 (بقاء الخطوط), lines=true, lineColor='#FFFFFF', vignette=.55, s, out (يرجع للزوم 1)} */
  FX.dramaZoom = (ctx, t, o) => {
    o = o || {}; const { X, P } = ctx, s0 = o.s || 0, draw = o.draw || (Y => { Y.fillStyle = P.bg; Y.fillRect(0, 0, 1080, 1920); });
    const at = o.at || [540, 780], Z = o.zoom || 1.7, n = o.steps || 3, st = o.step || 0.16;
    let z = 1, sh = 0; for (let i = 0; i < n; i++) { const ti = s0 + i * st; z += (Z - 1) / n * cOut(pr(t, ti, ti + 0.06)); const dt = t - ti; if (dt >= 0 && dt < 0.14) sh = Math.max(sh, (1 - dt / 0.14) * 20); }
    if (o.out != null) z = lerp(z, 1, ioC(pr(t, o.out, o.out + 0.45)));
    const j = jit(t, sh, 17); X.save(); X.translate(at[0] + j[0], at[1] + j[1]); X.scale(z, z); X.translate(-at[0], -at[1]); draw(X); X.restore();
    if (t < s0) return;
    const endL = s0 + (n - 1) * st + (o.hold == null ? 0.8 : o.hold), la = 1 - pr(t, endL, endL + 0.3), vk = cOut(pr(t, s0, s0 + 0.2)) * (o.out != null ? 1 - pr(t, o.out, o.out + 0.45) : 1);
    if (vk > ON) { const g = X.createRadialGradient(at[0], at[1], 240, at[0], at[1], 1250); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${(o.vignette == null ? 0.55 : o.vignette) * vk})`); X.fillStyle = g; X.fillRect(0, 0, 1080, 1920); }
    if (o.lines !== false && la > ON) FX.speedLines(ctx, t, { s: s0, x: at[0], y: at[1], inner: 420, count: 72, color: o.lineColor || '#FFFFFF', alpha: la * 0.9 });
  };

  /* ═════════ ب) علامات فوق نقطة ═════════ */

  /* 247 نجوم تلمع — نجوم بريق رباعية بيضا بحافة لون الهوية تومض حوالين نقطة (منتج، عيون، كلمة).
     o.eyes=[[x,y],[x,y]] = لمعة «عيون تلمع» كبيرة على العيون. o: {x=540, y=900, r=320 (الانتشار), count=9, size=72, color (الحافة)=hi, outline (false = بلا حد أسود), eyes, eyeSize=70, s, out} */
  FX.twinkleStars = (ctx, t, o) => {
    o = o || {}; const { X, P } = ctx, s0 = o.s || 0; if (t < s0) return; const ko = fout(ctx, t, o), rim = o.color || P.hi || P.acc, lt = t - s0;
    const cx = pick(o, 'x', 540), cy = pick(o, 'y', 900), R = o.r || 320, N = o.count == null ? 9 : o.count, S = o.size || 72, line = o.outline === false ? null : LINE(P, o);
    X.save(); X.globalAlpha *= 1 - ko;
    (o.eyes || []).forEach((e, i) => { const k = bOut(pr(lt, i * 0.06, i * 0.06 + 0.3)), pulse = 0.85 + 0.15 * Math.sin(lt * 6 + i), r = (o.eyeSize || 70) * k * pulse;
      sparkle(X, e[0], e[1], r, 0.2 * Math.sin(lt * 2), rim, line); sparkle(X, e[0] + r * 0.55, e[1] + r * 0.5, r * 0.35 * pulse, 0.6, rim, line); });
    for (let i = 0; i < N; i++) { const st = i * 0.07; if (lt < st) continue;
      const a = i * 2.39996 + h2(i, 3) * 0.7, dd = R * (0.35 + 0.65 * Math.sqrt((i + 0.5) / Math.max(1, N)) * (0.8 + 0.4 * h2(i, 4))), x = cx + Math.cos(a) * dd, y = cy + Math.sin(a) * dd * 0.8, per = 0.8 + 0.7 * h2(i, 11);
      const tk = Math.pow(Math.sin(frac((lt - st) / per + h2(i, 9) * 0.5) * Math.PI), 1.4), pop = bOut(pr(lt, st, st + 0.3)), r = S * (0.45 + 0.75 * h2(i, 2)) * Math.max(0.3 + 0.7 * tk, 1 - pr(lt, st + 0.3, st + 0.6)) * pop;
      sparkle(X, x, y, r, lt * 0.8 * (h2(i, 8) > 0.5 ? 1 : -1), rim, line);
      if (h2(i, 13) > 0.5) { X.fillStyle = rim; X.beginPath(); X.arc(x + S * 0.9, y - S * 0.6, S * 0.09 * tk * pop, 0, TAU); X.fill(); } }
    X.restore();
  };

  /* 248 قطرة عرق — قطرة زرقا كبيرة تنبثق جنب الراس وتنزلق ببطء (حرج، توتر، «أوبس») + قطرتين صغار.
     o: {x=700, y=600, size=110, side=1 (1 = يمين الراس، -1 = يسار), color, s, out} */
  FX.sweatDrop = (ctx, t, o) => {
    o = o || {}; const { X, P } = ctx, s0 = o.s || 0; if (t < s0) return; const ko = fout(ctx, t, o), line = LINE(P, o), sd = o.side === -1 ? -1 : 1;
    const x = pick(o, 'x', 700), y = pick(o, 'y', 600), S = o.size || 110, slide = cOut(pr(t, s0 + 0.35, s0 + 2.2)) * S * 0.55;
    X.save(); X.globalAlpha *= 1 - ko;
    MARK.sweat(X, x + sd * S * 0.62, y - S * 0.35, S * 0.32, bOut(pr(t, s0 + 0.18, s0 + 0.4)), sd, line, o.color);
    MARK.sweat(X, x + sd * S * 0.95, y + S * 0.05, S * 0.22, bOut(pr(t, s0 + 0.26, s0 + 0.48)), sd, line, o.color);
    MARK.sweat(X, x, y + slide, S, bOut(pr(t, s0, s0 + 0.32)), sd, line, o.color);
    X.restore();
  };

  /* 249 علامة الزعل — علامة «العرق المنفوخ» المتقاطعة تنبثق فوق الراس وتنبض (زعل، قهر، «جد؟»).
     o: {x=690, y=560, size=130, color=acc, s, out} */
  FX.angerMark = (ctx, t, o) => {
    o = o || {}; const { X, P } = ctx, s0 = o.s || 0; if (t < s0) return; const ko = fout(ctx, t, o), lt = t - s0;
    const k = bOut(pr(lt, 0, 0.3)) * (1 + 0.14 * Math.max(0, Math.sin((lt - 0.3) * TAU * 2.2)) * (lt > 0.3 ? 1 : 0));
    X.save(); X.globalAlpha *= 1 - ko; MARK.anger(X, pick(o, 'x', 690), pick(o, 'y', 560), o.size || 130, k, o.color || P.acc, LINE(P, o), -0.18 + 0.06 * Math.sin(lt * 5));
    if (o.second !== false) MARK.anger(X, pick(o, 'x', 690) + (o.size || 130) * 0.75, pick(o, 'y', 560) + (o.size || 130) * 0.55, (o.size || 130) * 0.5, bOut(pr(lt, 0.25, 0.5)) * (1 + 0.14 * Math.max(0, Math.sin((lt - 0.5) * TAU * 2.2 + 1)) * (lt > 0.5 ? 1 : 0)), o.color || P.acc, LINE(P, o), 0.3);
    X.restore();
  };

  /* 250 خطوط الصدمة — خطوط قصيرة مدببة تطلق من فوق الراس على شكل مروحة وترتجف (صدمة، «إيش؟!»)، وتتكرر.
     o: {x=540, y=560 (فوق الراس), size=160, count=5, spread=1.9 (زاوية المروحة)، repeat=2, color, s, out} */
  FX.shockMarks = (ctx, t, o) => {
    o = o || {}; const { X, P } = ctx, s0 = o.s || 0; if (t < s0) return; const ko = fout(ctx, t, o), line = o.color || LINE(P, o), rep = o.repeat || 2;
    const x = pick(o, 'x', 540), y = pick(o, 'y', 560), S = o.size || 160, j = jit(t, 4, 23);
    X.save(); X.globalAlpha *= 1 - ko;
    for (let b = 0; b < rep; b++) { const tb = s0 + b * 0.55, k = pr(t, tb, tb + 0.2); if (k <= 0) continue; const a = b < rep - 1 ? 1 - pr(t, tb + 0.35, tb + 0.55) : 1; if (a <= ON) continue;
      X.save(); X.globalAlpha *= a; MARK.shock(X, x + j[0], y + j[1], S, k, line, o.count || 5, o.spread); X.restore(); }
    X.restore();
  };

  // علامة حرف (؟ أو !) تنط وتتمايل بحد عريض وظل قاسي
  const glyphPop = (ctx, X, g, x, y, S, k, lt, rot, fill, line) => { if (k <= ON) return; const hop = -Math.abs(Math.sin(lt * 4.2)) * S * 0.08;
    X.save(); X.translate(x, y + hop); X.rotate(rot + 0.08 * Math.sin(lt * 3.3)); X.scale(k, k); outlined(ctx, X, g, 0, S * 0.36, S, { fill, line, inner: '#FFFFFF', shadow: line, lw: S * 0.08 }); X.restore(); };

  /* 251 علامة استفهام — «؟» كبيرة بحد عريض تنبثق فوق الراس وتتمايل، ووراها وحدة أصغر (حيرة، سؤال). غير iconPop 229 (فقاعة هادية).
     o: {x=700, y=520, size=180, color=acc, count=2, s, out} */
  FX.questionPop = (ctx, t, o) => {
    o = o || {}; const { X, P } = ctx, s0 = o.s || 0; if (t < s0) return; const ko = fout(ctx, t, o), lt = t - s0, line = LINE(P, o), S = o.size || 180, x = pick(o, 'x', 700), y = pick(o, 'y', 520);
    X.save(); X.globalAlpha *= 1 - ko;
    if ((o.count || 2) > 1) glyphPop(ctx, X, '؟', x + S * 0.62, y + S * 0.28, S * 0.55, bOut(pr(lt, 0.22, 0.5)), lt + 0.7, 0.28, o.color2 || P.hi || P.acc, line);
    glyphPop(ctx, X, '؟', x, y, S, bOut(pr(lt, 0, 0.32)), lt, -0.12, o.color || P.acc, line);
    X.restore();
  };

  /* 252 علامة تعجب — «!» تنط فوق الراس مع خطوط تأكيد على الجنبين، وتنط مرة ثانية كل every ث (انتباه، اكتشاف).
     o: {x=540, y=520, size=200, color=acc, count=1|2 («!!»)، every=1.4, s, out} */
  FX.exclaimPop = (ctx, t, o) => {
    o = o || {}; const { X, P } = ctx, s0 = o.s || 0; if (t < s0) return; const ko = fout(ctx, t, o), lt = t - s0, line = LINE(P, o), S = o.size || 200, x = pick(o, 'x', 540), y = pick(o, 'y', 520);
    const ev = o.every || 1.4, lp = lt % ev, k = lt < ev ? bOut(pr(lt, 0, 0.3)) : 1 + 0.18 * Math.sin(pr(lp, 0, 0.25) * Math.PI);
    X.save(); X.globalAlpha *= 1 - ko;
    const tk = 1 - pr(lp, 0.15, 0.6); if (tk > ON) { X.save(); X.fillStyle = line; X.globalAlpha *= tk; [-1, 1].forEach(sd => [-0.35, 0, 0.35].forEach((da, i) => { const a = (sd > 0 ? 0 : Math.PI) + sd * da;
      wedge(X, x, y - S * 0.05, a, S * (0.62 + 0.25 * cOut(pr(lp, 0, 0.3))) + S * 0.32, S * (0.62 + 0.25 * cOut(pr(lp, 0, 0.3))), S * 0.09); X.fill(); })); X.restore(); }
    const g = (o.count || 1) > 1 ? '!!' : '!'; glyphPop(ctx, X, g, x, y, S, k, 0, -0.06, o.color || P.acc, line);
    X.restore();
  };

  /* ═════════ ج) دخول وطلعة ونص ═════════ */

  /* 253 لمعة الدخول — العنصر يطلع، وتمرّ عليه لمعة مايلة (على بكسلاته بس) من اليمين لليسار، وبآخرها نجمة بريق تومض.
     o: {text='جديد', size=130, pill=true (كبسولة بلون الهوية), x=540, y=900, draw: Y => عنصرك بداله, box:{x,y,w,h} (حدود عنصرك), delay=.4, dur=.55, again (تتكرر كل كم ث), s, out} */
  FX.entranceShine = (ctx, t, o) => {
    o = o || {}; const { X, P } = ctx, s0 = o.s || 0; if (t < s0) return; const ko = fout(ctx, t, o), x = pick(o, 'x', 540), y = pick(o, 'y', 900);
    const text = o.text == null ? 'جديد' : o.text, fs = o.size || 130, pill = o.pill !== false && !o.draw;
    const tW = o.draw ? 0 : tw(ctx, X, text, fs, 900), pw = tW + fs * 1.2, ph = fs * 1.8;
    const box = o.box || (o.draw ? { x: 140, y: y - 200, w: 800, h: 400 } : { x: x - pw / 2, y: y - ph / 2 - fs * 0.16, w: pw, h: ph });
    const el = Y => { if (o.draw) return o.draw(Y);
      if (pill) { Y.fillStyle = LINE(P, o); rr(Y, box.x + 10, box.y + 14, box.w, box.h, box.h / 2); Y.fill(); Y.fillStyle = P.acc; rr(Y, box.x, box.y, box.w, box.h, box.h / 2); Y.fill(); Y.lineWidth = 8; Y.strokeStyle = LINE(P, o); Y.stroke(); }
      T(ctx, Y, text, x, y, fs, { weight: 900, color: pill ? (P.onAcc || (lum(P.acc) > 165 ? '#16171A' : '#FFFFFF')) : P.ink, maxWidth: 960 }); };
    const ki = pr(t, s0, s0 + 0.45), sc = lerp(0.82, 1, bOut(ki)), cy = box.y + box.h / 2;
    X.save(); X.globalAlpha *= cl(ki * 2.5) * (1 - ko); X.translate(x, cy + (1 - cOut(ki)) * 60); X.scale(sc, sc); X.translate(-x, -cy);
    el(X);
    const ev = o.again, lt0 = t - s0 - (o.delay == null ? 0.4 : o.delay), lt = ev && lt0 > 0 ? lt0 % ev : lt0, kd = pr(lt, 0, o.dur || 0.55);
    if (kd > 0 && kd < 1) { const bx = lerp(box.x + box.w + 160, box.x - 160, ioC(kd)), sl = 140;
      [[110, 0.85], [44, 1], [210, 0.3]].forEach(([bw, a], i) => { X.save(); X.beginPath(); const cx2 = bx + (i === 1 ? 70 : 0);
        X.moveTo(cx2 - bw / 2 + sl, box.y - 20); X.lineTo(cx2 + bw / 2 + sl, box.y - 20); X.lineTo(cx2 + bw / 2 - sl, box.y + box.h + 20); X.lineTo(cx2 - bw / 2 - sl, box.y + box.h + 20); X.closePath(); X.clip();
        X.globalAlpha *= a; X.filter = 'brightness(0) invert(1)'; el(X); X.filter = 'none'; X.restore(); }); }
    const kg = pr(lt, (o.dur || 0.55) * 0.75, (o.dur || 0.55) * 0.75 + 0.5); if (kg > 0 && kg < 1) { const r = 56 * Math.sin(kg * Math.PI); sparkle(X, box.x + 18, box.y + 12, r, kg * 1.4, P.hi || P.acc); sparkle(X, box.x + 80, box.y - 30, r * 0.4, -kg, P.hi || P.acc); }
    X.restore();
  };

  /* 254 بوف! دخان الاختفاء — العنصر ينكمش ويختفي بغيمة كرتونية بحد أسود، الغيمة تتفرّق وتتلاشى مع نجوم صغار (o.word = كلمة صغيرة فوقها).
     o: {draw: Y => العنصر اللي يختفي (اختياري), x=540, y=900 (مركز الغيمة), size=340, word, color (الغيمة), s (لحظة البوف), out} */
  FX.poofSmoke = (ctx, t, o) => {
    o = o || {}; const { X, P } = ctx, s0 = o.s || 0, x = pick(o, 'x', 540), y = pick(o, 'y', 900), S = o.size || 340, line = LINE(P, o);
    if (o.draw && t < s0 + 0.12) { const k = 1 - cIn(pr(t, s0, s0 + 0.12)), sq = t < s0 ? 1 + 0.03 * Math.sin(t * 9) : 1; X.save(); X.translate(x, y); X.scale(k * sq, k * (2 - sq)); X.translate(-x, -y); o.draw(X); X.restore(); }
    if (t < s0) return; const lt = t - s0, grow = cOut(pr(lt, 0, 0.2)), fade = pr(lt, 0.45, 1.15); if (fade >= 1) return;
    const cs = [[x, y - lt * 40, S * 0.55 * grow * (1 - cOut(pr(lt, 0.3, 0.95)))]]; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + h2(i, 1) * 0.4, d = S * 0.42 * (0.8 + 0.3 * h2(i, 2)) + S * 0.45 * cOut(pr(lt, 0.15, 1.1)), r = S * 0.36 * (0.75 + 0.45 * h2(i, 3)) * grow * (1 - cOut(fade) * (0.9 + 0.1 * h2(i, 5)));
      cs.push([x + Math.cos(a) * d * 1.1, y + Math.sin(a) * d * 0.75 - lt * 60, r]); }
    X.save(); const cloud = o.color || CLOUD; blobs(X, cs.filter(c => c[2] > 1), cloud, line, 7 * (1 - fade * 0.6), mixC(cloud, P.mut || '#8A847A', 0.35)); X.globalAlpha *= 1 - fade;
    for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.55, kk = pr(lt, 0.08, 0.7), d = S * (0.6 + 0.6 * cOut(kk)); sparkle(X, x + Math.cos(a) * d, y + Math.sin(a) * d, 40 * Math.sin(kk * Math.PI), kk * 3, P.hi || P.acc, line); }
    if (o.word) { const kw = bOut(pr(lt, 0.1, 0.35)); X.save(); X.translate(x + S * 0.2, y - S * 0.85); X.scale(kw, kw); X.rotate(-0.12); outlined(ctx, X, o.word, 0, 0, 120, { fill: P.acc, line, inner: '#FFFFFF', shadow: line }); X.restore(); }
    X.restore();
  };

  /* 255 صرخة مانغا — كلمة ضخمة مايلة بحد أسود عريض وحد أبيض داخلي وظل قاسي، تنضرب من كبير لمكانها وترتجف، وخطوط تأكيد حوالينها.
     o: {text='مستحيل!' (\n = سطر), x=540, y=900, size=170, color=acc, shake=1, s, out} */
  FX.boldShout = (ctx, t, o) => {
    o = o || {}; const { X, P } = ctx, s0 = o.s || 0; if (t < s0) return; const ko = fout(ctx, t, o, 0.3), line = LINE(P, o), lt = t - s0;
    const lines = String(o.text || 'مستحيل!').split('\n'), size0 = o.size || 170, x = pick(o, 'x', 540), y = pick(o, 'y', 900);
    const fss = lines.map(l => Math.min(size0, size0 * 900 / Math.max(1, tw(ctx, X, l, size0, 900)))), lh = Math.max(...fss) * 1.12, y0 = y - (lines.length - 1) * lh / 2;
    const ki = pr(lt, 0, 0.2), sc = lerp(2.6, 1, cOut(ki)), amp = (lt < 0.2 ? 0 : 3 + 14 * (1 - pr(lt, 0.2, 0.6))) * pick(o, 'shake', 1), j = jit(t, amp, 41, 24);
    X.save(); X.globalAlpha *= cl(ki * 3) * (1 - ko);
    const ke = pr(lt, 0.18, 0.7); if (ke > 0 && ke < 1) { const W = Math.max(...lines.map((l, i) => tw(ctx, X, l, fss[i], 900))); X.fillStyle = line; X.save(); X.globalAlpha *= 1 - ke;
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + 0.2, rx = W * 0.62 + 40, ry = lh * lines.length * 0.62 + 60, r0 = 1 + 0.25 * cOut(ke); const px = x + Math.cos(a) * rx * r0, py = y - lh * 0.3 + Math.sin(a) * ry * r0;
        wedge(X, px, py, a, 90 * (1 - ke) + 20, 0, 16); X.fill(); } X.restore(); }
    X.translate(x + j[0], y - lh * 0.3 + j[1]); X.scale(sc, sc); X.transform(1, 0, -0.12, 1, 0, 0); X.rotate(-0.05); X.translate(-x, -(y - lh * 0.3));
    lines.forEach((l, i) => outlined(ctx, X, l, x, y0 + i * lh, fss[i], { fill: o.color || P.acc, line, inner: '#FFFFFF', shadow: line, lw: fss[i] * 0.11 }));
    X.restore();
  };

  /* 256 انفجار صوتي — كلمة صوت عربية («بووم» «ووش» «طاخ») على انفجار مسنّن بنقاط هافتون، تنضرب وترتجف مع خطوط أكشن. words = سلسلة كلمات كل every ث.
     o: {text='بووم', words:[…], every=1.2, at:[[x,y],…], size=180, color (الانفجار)=hi, dots=acc, s, out} */
  FX.onoBurst = (ctx, t, o) => {
    o = o || {}; const { X, P } = ctx, s0 = o.s || 0; if (t < s0) return; const ko = fout(ctx, t, o, 0.3), line = LINE(P, o);
    const words = o.words || [o.text || 'بووم'], ev = o.every || 1.2, idx = Math.min(words.length - 1, Math.floor((t - s0) / ev)), lt = t - s0 - idx * ev;
    const ats = o.at || [[540, 880], [460, 1120], [620, 700]], at = Array.isArray(ats[0]) ? ats[idx % ats.length] : ats, word = words[idx], size0 = o.size || 180;
    const fs = Math.min(size0, size0 * 820 / Math.max(1, tw(ctx, X, word, size0, 900))), W = tw(ctx, X, word, fs, 900), R = Math.max(W * 0.6 + 70, fs * 1.25), ex = cl(W * 0.62 / R + 0.45, 1, 1.45);
    const ax = cl(at[0], R * ex * 1.2 + 30, 1050 - R * ex * 1.2), ay = cl(at[1], R * 1.3 + 120, 1800 - R * 1.3);
    const k = bOut(pr(lt, 0, 0.24)), j = jit(t, lt < 0.45 ? 12 * (1 - lt / 0.45) : 0, 61), rot = o.rot == null ? (idx % 2 ? 0.1 : -0.08) : o.rot, f12 = Math.floor(t * 12);
    if (k <= ON) return;
    X.save(); X.globalAlpha *= 1 - ko; X.translate(ax + j[0], ay + j[1]); X.rotate(rot); X.scale(k, k);
    const M = 14, pts = []; for (let i = 0; i < M * 2; i++) { const a = i / (M * 2) * TAU + h2(idx, 4), q = i % 2 ? 0.7 + 0.08 * h2(i, idx) : 1 + 0.28 * h2(i, idx + 9) + 0.04 * h2(i, f12); pts.push([Math.cos(a) * R * q * ex, Math.sin(a) * R * q]); }
    X.fillStyle = line; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU + 0.1, r0 = R * 1.4 + 30 * h2(i, f12); X.save(); X.scale(ex, 1); wedge(X, 0, 0, a, r0, r0 + R * 0.4 * (1 - pr(lt, 0.2, 0.9)), 14); X.restore(); X.fill(); }
    polyPath(X, pts); X.lineJoin = 'round'; X.lineWidth = 22; X.strokeStyle = line; X.stroke(); X.fillStyle = o.color || P.hi || P.acc; X.fill();
    X.save(); polyPath(X, pts); X.clip(); X.fillStyle = o.dots || P.acc; const cell = 30;
    for (let yy = -R * 1.4; yy < R * 1.4; yy += cell * 0.866) for (let xx = -R * 1.9 + ((Math.round(yy / (cell * 0.866)) & 1) ? cell / 2 : 0); xx < R * 1.9; xx += cell) {
      const d = Math.hypot(xx / ex, yy) / R, rd = cell * 0.48 * cl((d - 0.35) / 0.75); if (rd < 0.8) continue; X.beginPath(); X.arc(xx, yy, rd, 0, TAU); X.fill(); }
    X.restore();
    outlined(ctx, X, word, 0, fs * 0.34, fs, { fill: '#FFFFFF', line, shadow: line, lw: fs * 0.12 });
    X.restore();
  };

  /* 257 فقاعة كوميك — فقاعة كلام بحد أسود: دائرية (كلام)، مسننة (صراخ، ترتجف)، أو غيمة تفكير بدوائر صغار — والكلام يطلع كلمة كلمة.
     o: {text, shape='round'|'spiky'|'thought', x=540, y=640, tail=[x,y] (وين تأشّر), size=62, maxW=680, step=.12, from (اسم المتكلم فوقها؛ true = ctx.P.handle), s, out} */
  FX.comicBubble = (ctx, t, o) => {
    o = o || {}; const { X, P } = ctx, s0 = o.s || 0; if (t < s0) return; const ko = fout(ctx, t, o, 0.25), line = LINE(P, o), shape = o.shape || 'round';
    const fs = o.size || 62, ls = wrap(ctx, X, o.text || 'هلا والله!', fs, 800, o.maxW || 680), lh = fs * 1.4, W = Math.max(...ls.map(l => tw(ctx, X, l, fs, 800)));
    const x = pick(o, 'x', 540), y = pick(o, 'y', 640), sp = shape === 'round' ? 1 : 1.12, rx = (W / 2 + fs * 1.3) * sp, ry = (ls.length * lh / 2 + fs * 1.25) * sp, tail = o.tail || [x - rx * 0.3, y + ry + 190];
    const k = bOut(pr(t, s0, s0 + 0.32)); if (k <= ON) return; const f12 = Math.floor(t * 12), fill = o.fill || '#FFFFFF';
    X.save(); X.globalAlpha *= cl(k * 2) * (1 - ko); X.translate(tail[0], tail[1]); X.scale(k, k); X.translate(-tail[0], -tail[1]); X.lineJoin = 'round';
    const ta = Math.atan2(tail[1] - y, tail[0] - x);
    if (shape === 'thought') {
      const cs = [[x, y, Math.min(rx, ry) * 0.9]]; const M = Math.max(9, Math.round((rx + ry) / 48));
      for (let i = 0; i < M; i++) { const a = i / M * TAU + 0.2; cs.push([x + Math.cos(a) * rx * 0.88, y + Math.sin(a) * ry * 0.84, (rx + ry) * (0.17 + 0.03 * h2(i, 5))]); }
      const inner = []; for (let i = 0; i < 5; i++) for (let jj = 0; jj < 3; jj++) inner.push([x + (i - 2) * rx * 0.33, y + (jj - 1) * ry * 0.45, Math.min(rx, ry) * 0.45]);
      const tl = [0.35, 0.62, 0.86].map((q, i) => [lerp(x + Math.cos(ta) * rx * 0.9, tail[0], q), lerp(y + Math.sin(ta) * ry * 0.9, tail[1], q), fs * (0.5 - i * 0.13)]);
      blobs(X, tl, fill, line, 6); blobs(X, cs.concat(inner), fill, line, 7);
    } else {
      let pts = [];
      if (shape === 'spiky') { const M = 22; for (let i = 0; i < M * 2; i++) { const a = i / (M * 2) * TAU, q = i % 2 ? 0.97 : 1.16 + 0.1 * h2(i, f12 % 3); pts.push([x + Math.cos(a) * rx * q, y + Math.sin(a) * ry * q, a]); }
        let bi = 0, bd = 9; pts.forEach((p, i) => { if (i % 2) return; const d = Math.abs(Math.atan2(Math.sin(p[2] - ta), Math.cos(p[2] - ta))); if (d < bd) { bd = d; bi = i; } }); pts[bi] = [tail[0], tail[1]];
        polyPath(X, pts); X.fillStyle = fill; X.fill(); X.lineWidth = 7; X.strokeStyle = line; X.stroke();
      } else {
        const b1 = ta - 0.22, b2 = ta + 0.22, A = [x + Math.cos(b1) * rx * 0.8, y + Math.sin(b1) * ry * 0.8], B = [x + Math.cos(b2) * rx * 0.8, y + Math.sin(b2) * ry * 0.8], mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
        const tailP = Y => { Y.beginPath(); Y.moveTo(A[0], A[1]); Y.quadraticCurveTo(lerp(mid[0], tail[0], 0.55) + 20, lerp(mid[1], tail[1], 0.55), tail[0], tail[1]); Y.quadraticCurveTo(lerp(mid[0], tail[0], 0.5) - 10, lerp(mid[1], tail[1], 0.5), B[0], B[1]); Y.closePath(); };
        tailP(X); X.fillStyle = fill; X.fill(); X.lineWidth = 14; X.strokeStyle = line; X.stroke();
        X.beginPath(); X.ellipse(x, y, rx, ry, 0, 0, TAU); X.fill(); X.lineWidth = 7; X.stroke(); tailP(X); X.fill();
      }
    }
    if (o.from) { const nm = o.from === true ? (P.handle || '') : o.from; if (nm) { const nw = tw(ctx, X, nm, 34, 800) + 50; X.fillStyle = line; rr(X, x + rx * 0.55 - nw, y - ry - 26, nw, 56, 28); X.fill(); T(ctx, X, nm, x + rx * 0.55 - nw / 2, y - ry + 12, 34, { weight: 800, color: '#FFFFFF', dir: /[؀-ۿ]/.test(nm) ? undefined : 'ltr' }); } }
    const n = Math.floor((t - s0 - 0.25) / (o.step || 0.12)) + 1, j = shape === 'spiky' ? jit(t, 2.5, 5, 12) : [0, 0];
    drawWords(ctx, X, ls, n, x + j[0], y - (ls.length - 1) * lh / 2 + fs * 0.36 + j[1], lh, fs, 800, '#16171A');
    X.restore();
  };

  /* ═════════ د) تشيبي ═════════ */
  const MOODS = ['happy', 'shocked', 'thinking', 'crying', 'angry'];
  // راس التشيبي المرسوم (الوجه بنص الإحداثيات 0,0 ونص القطر R)
  function chibiFace(X, R, mood, lt, o, P) {
    const line = LINE(P, o), lw = R * 0.05, skin = o.skin || SKIN, hair = o.hair || HAIR, fem = o.gender !== 'male';
    X.save(); X.lineJoin = 'round'; X.lineCap = 'round'; X.strokeStyle = line; X.lineWidth = lw;
    if (fem) { X.beginPath(); X.moveTo(-R * 1.1, -R * 0.1); X.bezierCurveTo(-R * 1.28, R * 0.8, -R * 1.1, R * 1.18, -R * 0.72, R * 1.22); X.lineTo(R * 0.72, R * 1.22); X.bezierCurveTo(R * 1.1, R * 1.18, R * 1.28, R * 0.8, R * 1.1, -R * 0.1);
      X.bezierCurveTo(R * 1.12, -R * 1.32, -R * 1.12, -R * 1.32, -R * 1.1, -R * 0.1); X.closePath(); X.fillStyle = hair; X.fill(); X.stroke(); }
    X.beginPath(); X.ellipse(0, R * 0.06, R, R * 0.93, 0, 0, TAU); X.fillStyle = skin; X.fill(); X.stroke();
    X.beginPath();
    if (fem) { X.moveTo(-R * 1.05, R * 0.3); X.bezierCurveTo(-R * 1.16, -R * 1.22, R * 1.16, -R * 1.22, R * 1.05, R * 0.3); X.quadraticCurveTo(R * 0.92, -R * 0.18, R * 0.56, -R * 0.3); X.quadraticCurveTo(R * 0.32, -R * 0.06, R * 0.12, -R * 0.36);
      X.quadraticCurveTo(-R * 0.22, -R * 0.08, -R * 0.52, -R * 0.34); X.quadraticCurveTo(-R * 0.88, -R * 0.18, -R * 1.05, R * 0.3); }
    else { X.moveTo(-R * 1.03, R * 0.08); X.bezierCurveTo(-R * 1.16, -R * 1.26, R * 1.16, -R * 1.26, R * 1.03, R * 0.08);
      [[0.86, -0.28], [0.66, -0.1], [0.45, -0.4], [0.2, -0.16], [-0.05, -0.44], [-0.3, -0.18], [-0.55, -0.42], [-0.75, -0.14], [-0.92, -0.3]].forEach(([a, b]) => X.lineTo(R * a, R * b)); }
    X.closePath(); X.fillStyle = hair; X.fill(); X.stroke();
    X.save(); X.strokeStyle = 'rgba(255,255,255,.32)'; X.lineWidth = R * 0.07; X.beginPath(); X.arc(0, -R * 0.05, R * 0.82, -2.35, -1.95); X.stroke(); X.restore();
    if (fem) { sparkle(X, R * 0.78, -R * 0.62, R * 0.17, 0.3, o.clip || P.acc, line); }
    const ex = R * 0.42, ey = R * 0.22, by = ey - R * 0.27;
    const brow = (sd, tilt, dy) => { X.beginPath(); X.moveTo(sd * (ex - R * 0.13), by + dy + sd * 0 + tilt * R * 0.06); X.quadraticCurveTo(sd * ex, by + dy - R * 0.05, sd * (ex + R * 0.13), by + dy - tilt * R * 0.06); X.stroke(); };
    const blush = () => { X.fillStyle = BLUSH; [-1, 1].forEach(sd => { X.beginPath(); X.ellipse(sd * R * 0.62, R * 0.45, R * 0.15, R * 0.08, 0, 0, TAU); X.fill(); }); };
    const bigEye = (sd, dx, dy) => { X.save(); X.beginPath(); X.ellipse(sd * ex, ey, R * 0.14, R * 0.2, 0, 0, TAU); X.fillStyle = '#FFFFFF'; X.fill(); X.clip();
      X.fillStyle = '#2A2030'; X.beginPath(); X.ellipse(sd * ex + dx, ey + dy, R * 0.12, R * 0.17, 0, 0, TAU); X.fill();
      X.fillStyle = mixC(P.acc, '#2A2030', 0.35); X.beginPath(); X.ellipse(sd * ex + dx, ey + dy + R * 0.07, R * 0.09, R * 0.08, 0, 0, TAU); X.fill();
      X.fillStyle = '#FFFFFF'; X.beginPath(); X.arc(sd * ex + dx + R * 0.04, ey + dy - R * 0.06, R * 0.05, 0, TAU); X.fill(); X.beginPath(); X.arc(sd * ex + dx - R * 0.04, ey + dy + R * 0.06, R * 0.022, 0, TAU); X.fill(); X.restore();
      X.beginPath(); X.ellipse(sd * ex, ey, R * 0.14, R * 0.2, 0, 0, TAU); X.stroke(); X.lineWidth = lw * 1.5; X.beginPath(); X.arc(sd * ex, ey + R * 0.04, R * 0.17, -Math.PI * 0.85, -Math.PI * 0.15); X.stroke(); X.lineWidth = lw; };
    const mouthO = (my, w, h) => { X.beginPath(); X.ellipse(0, my, w, h, 0, 0, TAU); X.fillStyle = '#6B2430'; X.fill(); X.stroke(); X.save(); X.clip(); X.fillStyle = '#E8747C'; X.beginPath(); X.ellipse(0, my + h * 0.75, w * 0.7, h * 0.5, 0, 0, TAU); X.fill(); X.restore(); };
    if (mood === 'happy') {
      X.lineWidth = lw * 1.4; [-1, 1].forEach(sd => { X.beginPath(); X.arc(sd * ex, ey + R * 0.08, R * 0.15, Math.PI * 1.12, Math.PI * 1.88); X.stroke(); }); X.lineWidth = lw;
      [-1, 1].forEach(sd => brow(sd, 0, -R * 0.05)); blush();
      X.beginPath(); X.moveTo(-R * 0.2, R * 0.47); X.quadraticCurveTo(0, R * 0.9, R * 0.2, R * 0.47); X.closePath(); X.fillStyle = '#6B2430'; X.fill(); X.stroke();
      X.save(); X.clip(); X.fillStyle = '#E8747C'; X.beginPath(); X.ellipse(0, R * 0.72, R * 0.12, R * 0.08, 0, 0, TAU); X.fill(); X.restore();
    } else if (mood === 'shocked') {
      X.save(); X.beginPath(); X.ellipse(0, R * 0.06, R, R * 0.93, 0, 0, TAU); X.clip(); X.strokeStyle = 'rgba(70,100,210,.55)'; X.lineWidth = R * 0.045;
      for (let i = 0; i < 7; i++) { const xx = (i - 3) * R * 0.14; X.beginPath(); X.moveTo(xx, -R * 0.9); X.lineTo(xx, -R * (0.25 - 0.1 * (i % 2))); X.stroke(); } X.restore();
      const jj = jit(lt, R * 0.02, 3); [-1, 1].forEach(sd => { X.beginPath(); X.arc(sd * ex, ey, R * 0.19, 0, TAU); X.fillStyle = '#FFFFFF'; X.fill(); X.stroke(); X.fillStyle = '#16171A'; X.beginPath(); X.arc(sd * ex + jj[0], ey + jj[1], R * 0.045, 0, TAU); X.fill(); });
      [-1, 1].forEach(sd => brow(sd, -0.5, -R * 0.12)); mouthO(R * 0.6, R * 0.12, R * 0.18);
    } else if (mood === 'thinking') {
      bigEye(-1, -R * 0.035, -R * 0.04); bigEye(1, -R * 0.035, -R * 0.04); brow(-1, 0.3, -R * 0.02); brow(1, -0.6, -R * 0.1);
      X.lineWidth = lw * 1.2; X.beginPath(); X.moveTo(-R * 0.02, R * 0.58); X.quadraticCurveTo(R * 0.08, R * 0.52, R * 0.14, R * 0.58); X.quadraticCurveTo(R * 0.2, R * 0.64, R * 0.27, R * 0.57); X.stroke(); X.lineWidth = lw;
    } else if (mood === 'crying') {
      X.save(); X.fillStyle = rgba(TEAR, 0.75); [-1, 1].forEach(sd => { rr(X, sd * ex - R * 0.07, ey + R * 0.1, R * 0.14, R * 0.62, R * 0.07); X.fill(); }); X.restore();
      X.lineWidth = lw * 1.5; [-1, 1].forEach(sd => { X.beginPath(); X.moveTo(sd * (ex + R * 0.13), ey - R * 0.12); X.lineTo(sd * (ex - R * 0.1), ey); X.lineTo(sd * (ex + R * 0.13), ey + R * 0.12); X.stroke(); }); X.lineWidth = lw;
      [-1, 1].forEach(sd => brow(sd, 0.9, -R * 0.02)); blush(); mouthO(R * 0.62, R * 0.24, R * (0.13 + 0.03 * Math.sin(lt * 22)));
      [-1, 1].forEach(sd => MARK.tears(X, sd * (ex + R * 0.12), ey + R * 0.05, R, sd, lt, line));
    } else if (mood === 'angry') {
      X.lineWidth = lw * 1.4; [-1, 1].forEach(sd => { X.beginPath(); X.moveTo(sd * (ex + R * 0.15), ey - R * 0.02); X.lineTo(sd * (ex - R * 0.15), ey + R * 0.04); X.stroke(); X.fillStyle = '#16171A'; X.beginPath(); X.arc(sd * ex, ey + R * 0.08, R * 0.05, 0, TAU); X.fill(); });
      X.lineWidth = lw * 1.6; [-1, 1].forEach(sd => { X.beginPath(); X.moveTo(sd * (ex + R * 0.17), by - R * 0.06); X.lineTo(sd * (ex - R * 0.17), by + R * 0.07); X.stroke(); }); X.lineWidth = lw;
      rr(X, -R * 0.2, R * 0.5, R * 0.4, R * 0.16, R * 0.05); X.fillStyle = '#FFFFFF'; X.fill(); X.stroke(); X.beginPath(); X.moveTo(-R * 0.2, R * 0.58); X.lineTo(R * 0.2, R * 0.58); [-0.1, 0, 0.1].forEach(q => { X.moveTo(R * q, R * 0.5); X.lineTo(R * q, R * 0.66); }); X.stroke();
    }
    X.restore();
  }
  // تعابير فوق صورة الوجه (دموع، خدود، كآبة، …) — eyes = مكان العيون بنسبة R
  function photoMood(X, R, mood, lt, o, P) {
    const line = LINE(P, o), eyes = o.eyes || [[-0.32, -0.08], [0.32, -0.08]];
    if (mood === 'happy' || mood === 'crying') { X.save(); X.beginPath(); X.arc(0, 0, R, 0, TAU); X.clip(); X.fillStyle = BLUSH; eyes.forEach(e => { X.beginPath(); X.ellipse(e[0] * R * 1.35, R * 0.3, R * 0.17, R * 0.09, 0, 0, TAU); X.fill(); }); X.restore(); }
    if (mood === 'shocked') { X.save(); X.beginPath(); X.arc(0, 0, R, 0, TAU); X.clip(); const g = X.createLinearGradient(0, -R, 0, 0); g.addColorStop(0, 'rgba(60,80,190,.55)'); g.addColorStop(1, 'rgba(60,80,190,0)'); X.fillStyle = g; X.fillRect(-R, -R, 2 * R, R);
      X.strokeStyle = 'rgba(40,60,170,.6)'; X.lineWidth = R * 0.035; for (let i = 0; i < 7; i++) { const xx = (i - 3) * R * 0.15; X.beginPath(); X.moveTo(xx, -R); X.lineTo(xx, -R * (0.45 - 0.12 * (i % 2))); X.stroke(); } X.restore(); }
    if (mood === 'crying') eyes.forEach(e => { X.save(); X.fillStyle = rgba(TEAR, 0.7); rr(X, e[0] * R - R * 0.06, e[1] * R + R * 0.08, R * 0.12, R * 0.6, R * 0.06); X.fill(); X.restore(); MARK.tears(X, e[0] * R + Math.sign(e[0]) * R * 0.08, e[1] * R + R * 0.08, R, Math.sign(e[0]) || 1, lt, line); });
  }
  // علامات حوالين الراس حسب المزاج
  function moodMarks(ctx, X, R, mood, lt, o, P) {
    const line = LINE(P, o), k = bOut(pr(lt, 0.05, 0.35));
    if (mood === 'happy') [[1.3, -0.65, 0.28], [-1.25, -0.75, 0.22], [1.0, -1.2, 0.17]].forEach(([a, b, s], i) => sparkle(X, R * a, R * b, R * s * k * (0.75 + 0.25 * Math.sin(lt * 7 + i * 2)), lt * (i % 2 ? 1 : -1), P.hi || P.acc, line));
    if (mood === 'shocked') { MARK.shock(X, 0, -R * 0.95, R * 1.1, pr(lt, 0, 0.18), line, 5); MARK.sweat(X, R * 1.08, -R * 0.25 + cOut(pr(lt, 0.3, 1.5)) * R * 0.2, R * 0.3, bOut(pr(lt, 0.15, 0.4)), 1, line); }
    if (mood === 'thinking') { MARK.dots(ctx, X, R * 1.05, -R * 0.95, R * 0.75, lt, line); glyphPop(ctx, X, '؟', -R * 1.05, -R * 0.85, R * 0.5, bOut(pr(lt, 0.4, 0.7)), lt, -0.2, P.acc, line); }
    if (mood === 'angry') MARK.anger(X, R * 0.78, -R * 0.82, R * 0.5, k * (1 + 0.14 * Math.max(0, Math.sin(lt * TAU * 2.2))), P.acc, line, -0.2);
  }
  /* أداة: راس التشيبي بأي مكان — مرسوم، أو صورة الوجه (o.photo) بدائرة مع تعابيرها. mood: happy|shocked|thinking|crying|angry */
  FX.chibiHead = (ctx, X, x, y, R, mood, o) => {
    o = o || {}; const P = ctx.P, lt = o.lt || 0; X.save(); X.translate(x, y);
    const photo = o.photo && FX.toonPhoto ? o.photo : null;
    if (photo) { FX.toonPhoto(ctx, X, photo, 0, 0, R, { focus: o.focus, outline: LINE(P, o), ring: o.ring }); photoMood(X, R, mood, lt, o, P); }
    else chibiFace(X, R, mood, lt, o, P);
    if (o.marks !== false) moodMarks(ctx, X, R, mood, lt, o, P);
    X.restore();
  };
  // جسم التشيبي الصغير (تحت الراس؛ الراس عند 0,0)
  function chibiBody(X, R, mood, lt, o, P, front) {
    const line = LINE(P, o), lw = R * 0.05, skin = o.skin || SKIN, shirt = o.shirt || P.acc, pants = o.pants || mixC(P.ink, '#33405A', 0.4), fem = o.gender !== 'male', by = R * 0.86;
    X.save(); X.lineJoin = 'round'; X.lineCap = 'round'; X.strokeStyle = line; X.lineWidth = lw;
    const sh = [[-R * 0.36, by + R * 0.2], [R * 0.36, by + R * 0.2]];
    const hand = sd => { const w = Math.sin(lt * 10);
      if (mood === 'happy') return [sd * R * 1.35, by - R * 0.55 + (sd > 0 ? w : -w) * R * 0.08];
      if (mood === 'shocked') { const j = jit(lt, R * 0.03, 9 + sd); return [sd * R * 1.3 + j[0], by - R * 0.1 + j[1]]; }
      if (mood === 'thinking') return sd > 0 ? [R * 0.28, R * 0.84] : [-R * 0.66, by + R * 0.6];
      if (mood === 'angry') return [sd * R * 0.7, by + R * 0.45 + Math.abs(w) * R * 0.04];
      return [sd * R * 0.5, by + R * 0.78 + Math.sin(lt * 6 + sd) * R * 0.03]; };
    const arm = sd => { const s = sh[sd > 0 ? 1 : 0], h = hand(sd); X.save(); X.beginPath(); X.moveTo(s[0], s[1]); X.lineTo(h[0], h[1]); X.lineWidth = R * 0.2 + lw * 2; X.strokeStyle = line; X.stroke(); X.lineWidth = R * 0.2; X.strokeStyle = shirt; X.stroke(); X.restore();
      X.beginPath(); X.arc(h[0], h[1], R * 0.12, 0, TAU); X.fillStyle = skin; X.fill(); X.stroke(); };
    const inFront = sd => (mood === 'thinking' && sd > 0) || mood === 'happy' || mood === 'shocked';
    if (front) { [-1, 1].forEach(sd => { if (inFront(sd)) arm(sd); }); X.restore(); return; }
    [-1, 1].forEach(sd => { rr(X, sd * R * 0.22 - R * 0.12, by + R * 0.7, R * 0.24, R * 0.4, R * 0.1); X.fillStyle = fem ? skin : pants; X.fill(); X.stroke();
      X.beginPath(); X.ellipse(sd * R * 0.26, by + R * 1.12, R * 0.2, R * 0.1, 0, 0, TAU); X.fillStyle = line; X.fill(); });
    if (fem) { X.beginPath(); X.moveTo(-R * 0.36, by); X.lineTo(R * 0.36, by); X.quadraticCurveTo(R * 0.48, by + R * 0.42, R * 0.7, by + R * 0.86); X.quadraticCurveTo(0, by + R * 0.98, -R * 0.7, by + R * 0.86); X.quadraticCurveTo(-R * 0.48, by + R * 0.42, -R * 0.36, by); X.closePath(); X.fillStyle = shirt; X.fill(); X.stroke(); }
    else { rr(X, -R * 0.46, by - R * 0.02, R * 0.92, R * 0.62, R * 0.24); X.fillStyle = shirt; X.fill(); X.stroke(); rr(X, -R * 0.44, by + R * 0.5, R * 0.88, R * 0.3, R * 0.1); X.fillStyle = pants; X.fill(); X.stroke(); }
    X.fillStyle = mixC(shirt, '#FFFFFF', 0.6); X.beginPath(); X.moveTo(-R * 0.18, by); X.lineTo(0, by + R * 0.14); X.lineTo(R * 0.18, by); X.closePath(); X.fill(); X.stroke();
    [-1, 1].forEach(sd => { if (!inFront(sd)) arm(sd); });
    X.restore();
  }
  const moodAt = (o, lt) => { const ms = (Array.isArray(o.moods) && o.moods.length ? o.moods : [o.mood || 'happy']).map(m => (MOODS.includes(m) ? m : 'happy')), ev = o.every || 1.0, i = Math.max(0, Math.floor(lt / ev));
    return { mood: ms[Math.min(i, ms.length - 1) % ms.length], ml: lt - Math.min(i, ms.length - 1) * ev, changed: i > 0 && i < ms.length }; };

  /* 258 وجه تشيبي — راس كرتوني دائري كبير (تصميمنا) بتعبير: مبسوط، مصدوم، يفكر، يبكي، زعلان — يتبدّل بنطّة. o.photo = وجهك بدال الرسم (نفس صورة photoToon) مع التعابير فوقه.
     o: {mood='happy', moods:[…] (تتبدّل كل every ث), every=1, gender='female'|'male', x=540, y=860, size=210 (نص قطر الراس), body=false (جسم صغير), photo, focus, eyes, hair, skin, shirt, s, out} */
  FX.chibiReact = (ctx, t, o) => {
    o = o || {}; const { X, P } = ctx, s0 = o.s || 0; if (t < s0) return; const ko = fout(ctx, t, o, 0.3), lt = t - s0, R = o.size || (o.body ? 150 : 210);
    const x = pick(o, 'x', 540), y = pick(o, 'y', 860), { mood, ml, changed } = moodAt(o, lt), ki = bOut(pr(lt, 0, 0.4)), hop = changed ? Math.sin(pr(ml, 0, 0.3) * Math.PI) : 0;
    const sq = changed ? 0.08 * Math.sin(pr(ml, 0, 0.3) * TAU) : 0, bob = Math.sin(lt * 3) * R * 0.02;
    X.save(); X.globalAlpha *= cl(ki * 2) * (1 - ko); X.translate(x, y + R * (o.body ? 1.95 : 0.95) - hop * R * 0.25 + bob); X.scale(ki * (1 + sq), ki * (1 - sq)); X.translate(0, -R * (o.body ? 1.95 : 0.95));
    X.fillStyle = 'rgba(0,0,0,.12)'; X.beginPath(); X.ellipse(0, R * (o.body ? 2.0 : 1.12) + hop * R * 0.25, R * 0.8 * (1 - hop * 0.3), R * 0.1, 0, 0, TAU); X.fill();
    if (o.body) chibiBody(X, R, mood, ml, o, P);
    FX.chibiHead(ctx, X, 0, 0, R, mood, Object.assign({}, o, { lt: ml }));
    if (o.body) chibiBody(X, R, mood, ml, o, P, true);
    X.restore();
  };

  /* 259 شخصيتك تشيبي — صورة وجهك (o.photo) راس كبير على جسم تشيبي صغير (ذكر/أنثى) يتنطط ويتبدّل مزاجه: دموع، خدود، كآبة، بريق، علامة زعل…
     نفس صورة photoToon 233 (FX.toonPhoto من moves-plus-d.js)، وبلا صورة يرسم وجه تشيبي. o: {photo, gender, moods:['happy','shocked','thinking','crying'] , mood, every=1, name, x=540, y=760, size=200, focus, eyes:[[x,y]…] (نسبة R), shirt, s, out} */
  FX.chibiPhoto = (ctx, t, o) => {
    o = o || {}; const { X, P } = ctx, s0 = o.s || 0; if (t < s0) return; const ko = fout(ctx, t, o, 0.3), lt = t - s0, R = o.size || 200, line = LINE(P, o);
    const x = pick(o, 'x', 540), y = pick(o, 'y', 760), { mood, ml, changed } = moodAt(Object.assign({ moods: o.mood ? null : ['happy', 'shocked', 'thinking', 'crying'] }, o), lt);
    const ki = bOut(pr(lt, 0, 0.45)), jump = mood === 'happy' ? Math.abs(Math.sin(ml * 6)) * R * 0.22 : mood === 'shocked' ? Math.sin(pr(ml, 0, 0.3) * Math.PI) * R * 0.45 : 0, sq = changed ? 0.07 * Math.sin(pr(ml, 0, 0.3) * TAU) : 0;
    const tilt = mood === 'thinking' ? -0.12 : mood === 'crying' ? 0.05 * Math.sin(ml * 8) : 0, foot = R * 2.05;
    X.save(); X.globalAlpha *= cl(ki * 2) * (1 - ko);
    X.fillStyle = 'rgba(0,0,0,.13)'; X.beginPath(); X.ellipse(x, y + foot, R * 0.85 * (1 - jump / R * 0.5), R * 0.12, 0, 0, TAU); X.fill();
    X.translate(x, y + foot - jump + (1 - ki) * 200); X.scale(1 + sq, 1 - sq); X.translate(0, -foot);
    chibiBody(X, R, mood, ml, o, P);
    X.save(); X.translate(0, R * 0.8); X.rotate(tilt); X.translate(0, -R * 0.8); FX.chibiHead(ctx, X, 0, 0, R, mood, Object.assign({}, o, { lt: ml })); X.restore();
    chibiBody(X, R, mood, ml, o, P, true);
    const nm = o.name === true ? P.handle : o.name; if (nm) { const kn = cOut(pr(lt, 0.4, 0.8)), fs = R * 0.24, w = tw(ctx, X, nm, fs, 800) + R * 0.5;
      X.save(); X.globalAlpha *= kn; X.translate(0, foot + R * 0.38); X.fillStyle = line; rr(X, -w / 2, -fs * 0.85, w, fs * 1.7, fs * 0.85); X.fill(); T(ctx, X, nm, 0, fs * 0.36, fs, { weight: 800, color: '#FFFFFF', dir: /[؀-ۿ]/.test(nm) ? undefined : 'ltr' }); X.restore(); }
    X.restore();
  };

  /* 260 انفجار نجوم — ومضة بالنص ثم نجوم خماسية ورباعية ونقاط بألوان الثيم بحد أسود تنطلق وتدور وتطيح بجاذبية (فوز، رقم، شكر).
     o: {x=540, y=900, count=30, size=54, spread=1, gravity=900, s, out} */
  FX.starBurst = (ctx, t, o) => {
    o = o || {}; const { X, P } = ctx, s0 = o.s || 0; if (t < s0) return; const ko = fout(ctx, t, o), lt = t - s0, line = LINE(P, o);
    const x = pick(o, 'x', 540), y = pick(o, 'y', 900), N = o.count || 30, S = o.size || 54, cols = [P.acc, P.hi || P.acc, P.clay || P.acc, '#FFFFFF'], g = o.gravity == null ? 900 : o.gravity;
    X.save(); X.globalAlpha *= 1 - ko;
    const kr = pr(lt, 0, 0.45); if (kr < 1) { X.save(); X.globalAlpha *= 1 - kr; X.strokeStyle = P.acc; X.lineWidth = 26 * (1 - kr) + 2; X.beginPath(); X.arc(x, y, 60 + 420 * cOut(kr), 0, TAU); X.stroke(); X.restore(); }
    const kf = pr(lt, 0, 0.35); if (kf < 1) sparkle(X, x, y, 190 * Math.sin(kf * Math.PI), kf, P.hi || P.acc, line);
    for (let i = 0; i < N; i++) { const l = lt - h2(i, 1) * 0.08; if (l <= 0) continue;
      const a = i / N * TAU + h2(i, 2) * 0.4, v = (1100 + 1300 * h2(i, 3)) * pick(o, 'spread', 1), d = v * (1 - Math.exp(-3.2 * l)) / 3.2, px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.9 + g * 0.5 * l * l * 0.6;
      const r = S * (0.55 + 0.8 * h2(i, 4)) * bOut(pr(l, 0, 0.15)) * (1 - pr(l, 1.8 + 0.6 * h2(i, 7), 2.8 + 0.6 * h2(i, 7))); if (r < 1) continue; const rot = l * (2 + 5 * h2(i, 5)) * (h2(i, 6) > 0.5 ? 1 : -1), c = cols[i % cols.length], kind = i % 3;
      X.lineJoin = 'round'; X.lineWidth = 5; X.strokeStyle = line; X.fillStyle = c;
      if (kind === 0) { star5(X, px, py, r, rot); X.fill(); X.stroke(); } else if (kind === 1) sparkle(X, px, py, r * 1.1, rot, c === '#FFFFFF' ? (P.hi || P.acc) : c, line); else { X.beginPath(); X.arc(px, py, r * 0.4, 0, TAU); X.fill(); X.stroke(); } }
    X.restore();
  };

  /* 261 خلفية هافتون — خلفية نقاط طباعة كوميك بلون الهوية: النقاط تكبر للأطراف وتفضى بالنص للكلام، تنبت من النص وتنزلق ببطء. rays = أشعة ورا.
     o: {mode='radial'|'diagonal', x=540, y=820, cell=40, color=acc, bg=P.bg, rays=false, speed=14, fill=true, s, out} */
  FX.halftoneBg = (ctx, t, o) => {
    o = o || {}; const { X, P } = ctx, s0 = o.s || 0, lt = Math.max(0, t - s0), ko = fout(ctx, t, o), cell = o.cell || 40, cx = pick(o, 'x', 540), cy = pick(o, 'y', 820), col = o.color || P.acc;
    if (o.fill !== false) { X.fillStyle = o.bg || P.bg; X.fillRect(0, 0, 1080, 1920); } if (t < s0) return;
    X.save(); X.globalAlpha *= 1 - ko;
    if (o.rays) { X.fillStyle = rgba(col, 0.1); const rot = lt * 0.08; for (let i = 0; i < 18; i++) { const a = rot + i / 18 * TAU; X.beginPath(); X.moveTo(cx, cy); X.arc(cx, cy, 2300, a, a + TAU / 36); X.closePath(); X.fill(); } }
    const dr = lt * (o.speed == null ? 14 : o.speed), rh = cell * 0.866; X.fillStyle = col;
    for (let r = -1, yy = -rh + (dr % rh); yy < 1920 + rh; r++, yy += rh) for (let xx = -cell + ((r & 1) ? cell / 2 : 0) + (dr * 0.5 % cell); xx < 1080 + cell; xx += cell) {
      const dd = o.mode === 'diagonal' ? cl((xx * 0.45 + yy) / 2100) : cl((Math.hypot(xx - cx, (yy - cy) * 0.72) - 230) / 900), kk = cOut(pr(lt, dd * 0.5, dd * 0.5 + 0.45)), rd = cell * 0.47 * Math.pow(dd, 1.1) * kk;
      if (rd < 0.7) continue; X.beginPath(); X.arc(xx, yy, rd, 0, TAU); X.fill(); }
    X.restore();
  };

  /* ═════════ هـ) انتقالات (o.A = القديم، o.B = الجديد) ═════════ */

  /* 262 ألواح مانغا — الشاشة تنقسم ألواح مايلة بفواصل بيضا وحد أسود، وكل لوح يقلب للمشهد الجديد بالترتيب العربي (يمين ← يسار، فوق ← تحت) بزاوية مختلفة، وبعدين الفواصل تنسحب.
     o: {s, dur=1.1, A, B, gutter=26} */
  FX.mangaPanels = (ctx, t, o) => {
    o = o || {}; const { X, P } = ctx, A = o.A || (() => {}), B = o.B || (() => {}), k = pr(t, o.s || 0, (o.s || 0) + (o.dur || 1.1)), line = LINE(P, o);
    if (k <= 0) { A(X); return; } if (k >= 1) { B(X); return; }
    const L1 = [[-20, 650], [1100, 515]], L2 = [[-20, 1372], [1100, 1255]], yAt = (L, x) => lerp(L[0][1], L[1][1], (x - L[0][0]) / (L[1][0] - L[0][0]));
    const L3 = [[610, yAt(L1, 610)], [470, yAt(L2, 470)]];
    const panels = [[[-20, -20], [1100, -20], L1[1], L1[0]], [L3[0], L1[1], L2[1], L3[1]], [L1[0], L3[0], L3[1], L2[0]], [L2[0], L2[1], [1100, 1940], [-20, 1940]]];
    panels.forEach((pg, i) => { const ti = 0.14 + i * 0.13, e = cOut(pr(k, ti, ti + 0.24)), cx = pg.reduce((a, p) => a + p[0], 0) / 4, cy = pg.reduce((a, p) => a + p[1], 0) / 4, zb = lerp(1.14 + 0.04 * i, 1, ioC(pr(k, ti + 0.2, 0.92)));
      X.save(); polyPath(X, pg); X.clip();
      if (e < 1) { X.save(); X.translate(-e * 260, 0); A(X); X.fillStyle = `rgba(0,0,0,${0.35 * e})`; X.fillRect(-20, -20, 1120, 1960); X.restore(); }
      if (e > 0) { X.save(); X.translate((1 - e) * 1100, 0); X.translate(cx, cy); X.scale(zb, zb); X.translate(-cx, -cy); B(X); X.restore();
        if (e < 1) { X.save(); X.globalAlpha *= 1 - e; X.fillStyle = '#FFFFFF'; X.fillRect(-20, -20, 1120, 1960); X.restore(); } }
      X.restore(); });
    const gw = (o.gutter || 26) * cOut(pr(k, 0, 0.12)) * (1 - ioC(pr(k, 0.86, 1))), dl = cOut(pr(k, 0, 0.16));
    if (gw > 0.5) { X.save(); X.lineCap = 'butt'; [[L1, 0], [L3, 0.2], [L2, 0.1]].forEach(([L, d]) => { const q = cl((dl - d) / (1 - d)); if (q <= 0) return; const p1 = [lerp(L[0][0], L[1][0], q), lerp(L[0][1], L[1][1], q)];
        X.beginPath(); X.moveTo(L[0][0], L[0][1]); X.lineTo(p1[0], p1[1]); X.lineWidth = gw * (1 + 14 / (o.gutter || 26)); X.strokeStyle = line; X.stroke(); });
      [[L1, 0], [L3, 0.2], [L2, 0.1]].forEach(([L, d]) => { const q = cl((dl - d) / (1 - d)); if (q <= 0) return; X.beginPath(); X.moveTo(L[0][0], L[0][1]); X.lineTo(lerp(L[0][0], L[1][0], q), lerp(L[0][1], L[1][1], q)); X.lineWidth = gw; X.strokeStyle = '#FFFFFF'; X.stroke(); });
      X.lineWidth = gw * 0.9; X.strokeStyle = '#FFFFFF'; X.strokeRect(0, 0, 1080, 1920); X.restore(); }
  };

  /* 263 مسحة فرشاة — ضربة فرشاة حبر عريضة (حبر الثيم، أو color) بحواف شعيرات تمسح الشاشة ثلاث مرات (يمين←يسار، يسار←يمين، يمين←يسار)، والمشهد الجديد يطلع وراها.
     o: {s, dur=.85, A, B, color=حبر الحدود, lag=.14} */
  FX.brushWipe = (ctx, t, o) => {
    o = o || {}; const { X, P } = ctx, A = o.A || (() => {}), B = o.B || (() => {}), k = pr(t, o.s || 0, (o.s || 0) + (o.dur || 0.85));
    if (k <= 0) { A(X); return; } if (k >= 1) { B(X); return; }
    const way = [[1260, 300], [-180, 400], [-180, 960], [1260, 900], [1260, 1560], [-180, 1660]], S = [], Rb = 390;
    for (let i = 0; i < way.length - 1; i++) { const a = way[i], b = way[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(L / 24); for (let j = 0; j < n; j++) { const q = j / n; S.push([lerp(a[0], b[0], q), lerp(a[1], b[1], q), (b[0] - a[0]) / L, (b[1] - a[1]) / L]); } }
    const path = (cnt, grow) => { X.beginPath(); const N = Math.min(S.length, cnt); for (let i = 0; i < N; i++) { const [x, y, dx, dy] = S[i], tip = cl((N - i) / 14), r = Rb * (0.9 + 0.08 * Math.sin(i * 0.37)) * (0.55 + 0.45 * tip) + grow;
      X.moveTo(x + r, y); X.arc(x, y, r, 0, TAU); [-1, 1].forEach(sd => { const br = Rb * 0.1 * (0.4 + h2(i, sd + 3)), off = r * 0.93 + br * 0.3; X.moveTo(x - dy * sd * off + br, y + dx * sd * off); X.arc(x - dy * sd * off, y + dx * sd * off, br, 0, TAU); }); } };
    const ep = ioC(k), eb = ioC(cl((k - (o.lag == null ? 0.14 : o.lag)) / (1 - (o.lag == null ? 0.14 : o.lag))));
    A(X);
    X.save(); path(Math.floor(S.length * ep), 0); X.fillStyle = o.color || LINE(P, o); X.fill(); X.restore();
    if (eb > 0) { X.save(); path(Math.floor(S.length * eb) + (eb >= 1 ? 99 : 0), eb >= 1 ? 400 : -8); X.clip(); B(X); X.restore(); }
  };

  /* 264 مسحة دوّامة — دوّامة بذراعين تلف من نص الشاشة وتتعرّض لين تغطيها، والمشهد الجديد داخلها، بحافة لون الهوية.
     o: {s, dur=.9, A, B, x=540, y=960, turns=2, color=acc} */
  FX.spiralWipe = (ctx, t, o) => {
    o = o || {}; const { X, P } = ctx, A = o.A || (() => {}), B = o.B || (() => {}), k = pr(t, o.s || 0, (o.s || 0) + (o.dur || 0.9));
    if (k <= 0) { A(X); return; } if (k >= 1) { B(X); return; }
    const cx = pick(o, 'x', 540), cy = pick(o, 'y', 960), turns = o.turns || 2, b = 1200 / (turns * TAU), full = b * Math.PI + 6, e = ioC(k), w = lerp(12, full, e), rot = -e * Math.PI * 1.3;
    const thMax = (1250 + w) / b, arms = [];
    for (let a = 0; a < 2; a++) { const out = [], inn = []; for (let th = 0; th <= thMax; th += 0.06) { const ang = th + rot + a * Math.PI, ro = b * th, ri = Math.max(0, ro - w); out.push([cx + Math.cos(ang) * ro, cy + Math.sin(ang) * ro]); inn.push([cx + Math.cos(ang) * ri, cy + Math.sin(ang) * ri]); }
      arms.push({ out, poly: out.concat(inn.reverse()) }); }
    const sgn = pts => { let s = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; s += p[0] * q[1] - q[0] * p[1]; } return s; };
    const disc = []; for (let i = 0; i < 48; i++) { const a = i / 48 * TAU; disc.push([cx + Math.cos(a) * w * 0.9, cy + Math.sin(a) * w * 0.9]); }
    const polys = arms.map(a => a.poly).concat([disc]).map(p => (sgn(p) < 0 ? p.slice().reverse() : p));
    A(X);
    X.save(); X.beginPath(); polys.forEach(p => { p.forEach((q, i) => (i ? X.lineTo(q[0], q[1]) : X.moveTo(q[0], q[1]))); X.closePath(); }); X.clip(); B(X); X.restore();
    X.save(); X.lineWidth = 16 * (1 - e) + 3; X.strokeStyle = o.color || P.acc; X.lineJoin = 'round'; arms.forEach(a => { X.beginPath(); a.out.forEach((q, i) => (i ? X.lineTo(q[0], q[1]) : X.moveTo(q[0], q[1]))); X.stroke(); }); X.restore();
  };
})();
