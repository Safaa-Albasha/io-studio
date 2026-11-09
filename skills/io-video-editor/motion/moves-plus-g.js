/* ═══ moves-plus-g.js — بنك الحركات 284–306 (I/O Studio) · باقة «مراجع الريلز» (الجزء الأول) ═══
   نفس عقد motion/moves.js: كل حركة = FX.<اسم>(ctx, t, o) ترسم على ctx.X بإحداثيات التصميم (1080×1920)، كل خاصية من t (بلا تراكم ولا Math.random).
   o.s = بداية الحركة · o.out = بداية الطلعة (اختياري) · الألوان من ctx.P (bg ink acc mut …) · الخط Cairo (family 'cairo') أو o.family.
   الانتقالات تاخذ o.A و o.B (دوال ترسم الإطار كامل) · الكاميرا والمظاهر تاخذ o.draw (Y) => {...} · القصّ o.person(Y) · الوجه o.face.
   الكتالوج: motion/moves/catalog-plus-g.json · المعاينات: previews/284–306.mp4 (motion/moves/render-preview-g.js) · الشرح: references/moves.md
     284 sharedMorph · 285 ditherResolve · 286 explodedCallouts · 287 progressChip · 288 drosteTunnel · 289 wallShadows · 290 tierBoard
     291 weightMorph · 292 dustDissolve · 293 notesChecklist · 294 slashCommand · 295 cardExpand · 296 slotList · 297 ctaRetype
     298 headlineAccrue · 299 stepCard · 300 pipNote · 301 mirrorQuad · 302 proofAvatars · 303 measureRuler · 304 takeStrip · 305 laserSlice · 306 asciiSubject
   أدوات مشتركة (تستعملها moves-plus-h.js والمشاهد):
     FX.trackAt(track, t)        يقرا ملف تتبّع .io ({frames:[{t, quad:[[x,y]×4]} | {t, box:[x,y,w,h]} | {t, points:{…}}]}) ويرجع الفريم المُستكمل عند t
     FX.placeAt(o, t, key, def)  قيمة o[key] (ثابتة أو دالة t) — وإذا ما فيه وفيه o.track ياخذها من التتبّع (key: 'quad' | 'box' | 'face' | 'anchor' | اسم نقطة)
     FX.faceAt(o, t)             {x,y,w,h,cx,cy,eyes:[[x,y],[x,y]]} من o.face أو o.track أو null
     FX.cadence(t, o)            إيقاع ثابت: {i, t0, k, cues} لـ{s, every=0.85, n} (مونتاج «N مؤثر بكليب»)
     FX.cueIndex(cues, t)        رقم آخر لحظة ≤ t (cues = أرقام أو {t})
     FX.morphAt(keys, t, dur)    عنصر مشترك بين مشهدين: keys=[{t, rect:{x,y,w,h,r}}] → المستطيل عند t
     FX.icon(X, name, x, y, s)   أيقونة عامة مرسومة (heart star bolt play chat bulb gear wheel check camera music battery spring bike globe link mail phone key spark flag)
     FX.warpQuad(X, img, quad)   يرسم صورة/كانفس على رباعي بمنظور (تقسيم مثلثات) */
(function () {
  const G = typeof window !== 'undefined' ? window : globalThis;
  const FX = (G.FX = G.FX || {});
  const TAU = Math.PI * 2, ON = 0.01, FAM = 'cairo';
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const pr = (t, a, b) => (b === a ? (t >= b ? 1 : 0) : cl((t - a) / (b - a)));
  const lerp = (a, b, k) => a + (b - a) * k;
  const pick = (o, k, d) => (o && o[k] !== undefined && o[k] !== null ? o[k] : d);
  const cOut = k => 1 - Math.pow(1 - cl(k), 3);
  const cIn = k => Math.pow(cl(k), 3);
  const ioC = k => { k = cl(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
  const eOut = k => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * cl(k)));
  const bOut = (k, c1) => { k = cl(k); const a = c1 || 1.70158, c3 = a + 1; return 1 + c3 * Math.pow(k - 1, 3) + a * Math.pow(k - 1, 2); };
  const h2 = (a, b) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const vnoise = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = h2(xi + s * 131, yi), b = h2(xi + 1 + s * 131, yi), c = h2(xi + s * 131, yi + 1), d = h2(xi + 1 + s * 131, yi + 1); return lerp(lerp(a, b, u), lerp(c, d, u), v); };
  const fbm = (x, y, s) => vnoise(x, y, s) * 0.55 + vnoise(x * 2.1, y * 2.1, s + 7) * 0.3 + vnoise(x * 4.3, y * 4.3, s + 13) * 0.15;
  const hexRGB = h => { const c = String(h || '#000').replace('#', ''), f = c.length === 3 ? c.split('').map(x => x + x).join('') : c; return [0, 2, 4].map(j => parseInt(f.slice(j, j + 2), 16) || 0); };
  const isHex = h => /^#[0-9a-f]{3,8}$/i.test(String(h));
  const rgba = (h, a) => { if (!isHex(h)) return h; const [r, g, b] = hexRGB(h); return `rgba(${r},${g},${b},${cl(a)})`; };
  const mixC = (a, b, k) => { if (!isHex(a) || !isHex(b)) return a; const A = hexRGB(a), B = hexRGB(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], cl(k))).toString(16).padStart(2, '0')).join(''); };
  const lum = h => { if (!isHex(h)) return 128; const c = hexRGB(h); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  // تدوير الدرجة اللونية (لألوان صفوف قائمة التقييم من اللون المميز)
  const hueRot = (h, deg) => { const [r, g, b] = hexRGB(h).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let hh = 0, s = 0;
    if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh /= 6; }
    hh = ((hh + deg / 360) % 1 + 1) % 1; s = Math.max(s, 0.55); const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = t2 => { t2 = (t2 % 1 + 1) % 1; return t2 < 1 / 6 ? p + (q - p) * 6 * t2 : t2 < 0.5 ? q : t2 < 2 / 3 ? p + (q - p) * (2 / 3 - t2) * 6 : p; };
    return '#' + [f(hh + 1 / 3), f(hh), f(hh - 1 / 3)].map(v => Math.round(cl(v) * 255).toString(16).padStart(2, '0')).join(''); };
  const isAr = s => /[؀-ۿ]/.test(String(s));
  const pal = (P, o) => {
    const dark = lum(P.bg) < 110, ink = P.ink, bg = P.bg, acc = (o && o.color) || P.acc;
    const inkD = lum(ink) <= lum(bg) ? ink : bg, inkL = lum(ink) <= lum(bg) ? bg : ink;
    return { dark, ink, bg, acc, inkD, inkL, acc2: P.clay || P.hi || mixC(acc, inkD, 0.3),
      surf: dark ? mixC(bg, ink, 0.07) : mixC(bg, '#FFFFFF', 0.75), card: dark ? mixC(bg, ink, 0.1) : mixC(bg, '#FFFFFF', 0.88),
      line: mixC(bg, ink, dark ? 0.16 : 0.14), mut: P.mut || mixC(bg, ink, 0.55), soft: mixC(bg, ink, 0.72),
      on: P.onAcc || (lum(acc) > 150 ? mixC(inkD, '#000000', 0.2) : '#FFFFFF'),
      night: mixC(inkD, '#000000', 0.55), shadow: dark ? 'rgba(0,0,0,.55)' : rgba(inkD, 0.2) };
  };
  const fam = o => (o && o.family) || FAM;
  const T = (ctx, X, s, x, y, size, opt) => ctx.text(X, String(s), x, y, Object.assign({ family: FAM, weight: 700, size }, opt || {}));
  const tw = (ctx, X, s, size, w, f) => { X.save(); X.font = ctx.font(f || FAM, w || 700, size); const v = X.measureText(String(s)).width; X.restore(); return v || 0; };
  const rr = (X, x, y, w, h, r) => { X.beginPath(); if (X.roundRect) X.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); else X.rect(x, y, w, h); };
  const shd = (X, blur, y, a, col) => { X.shadowColor = col || `rgba(0,0,0,${a})`; X.shadowBlur = blur; X.shadowOffsetY = y; X.shadowOffsetX = 0; };
  const noShd = X => { X.shadowColor = 'rgba(0,0,0,0)'; X.shadowBlur = 0; X.shadowOffsetY = 0; X.shadowOffsetX = 0; };
  const env = (t, a, z, o) => { o = o || {}; const din = pick(o, 'din', 0.4), dout = pick(o, 'dout', 0.28);
    const pi = cOut(pr(t, a, a + din)), po = z == null ? 0 : cIn(pr(t, z, z + dout));
    return { o: pi * (1 - po), b: pick(o, 'bIn', 16) * (1 - pi) + pick(o, 'bOut', 14) * po, y: pick(o, 'yIn', 18) * (1 - pi), s: lerp(pick(o, 'sIn', 0.97), 1, pi) * lerp(1, pick(o, 'sOut', 0.97), po) }; };
  const withE = (X, e, cx, cy, fn) => { if (!e || e.o <= ON) return; X.save(); X.globalAlpha *= cl(e.o); if (e.b > 0.3) X.filter = `blur(${e.b.toFixed(1)}px)`;
    X.translate(cx + (e.x || 0), cy + (e.y || 0)); if (e.r) X.rotate(e.r); const s = e.s == null ? 1 : e.s; X.scale(s * (e.sx || 1), s * (e.sy || 1)); X.translate(-cx, -cy); fn(); X.restore(); };
  const imgOf = (ctx, v) => { if (!v) return null; const im = typeof v === 'string' ? (ctx.img ? ctx.img(v) : null) : v; return im && (im.width || im.naturalWidth) ? im : null; };
  const imW = im => im.naturalWidth || im.width, imH = im => im.naturalHeight || im.height;
  const drawCover = (X, im, x, y, w, h) => { const s = Math.max(w / imW(im), h / imH(im)), dw = imW(im) * s, dh = imH(im) * s; X.save(); X.beginPath(); X.rect(x, y, w, h); X.clip(); X.drawImage(im, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); X.restore(); };
  // مصدر = دالة ترسم الإطار كامل (1080×1920) أو صورة — يرسمه مغطّي داخل صندوق
  const drawSrc = (ctx, X, src, x, y, w, h) => { if (!src) return false; if (typeof src === 'function') { const s = Math.max(w / 1080, h / 1920); X.save(); X.beginPath(); X.rect(x, y, w, h); X.clip();
      X.translate(x + (w - 1080 * s) / 2, y + (h - 1920 * s) / 2); X.scale(s, s); src(X); X.restore(); return true; }
    const im = imgOf(ctx, src); if (im) { drawCover(X, im, x, y, w, h); return true; } return false; };
  const OFF = {};
  const off = (key, w, h) => { w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h)); let c = OFF[key]; if (!c) { c = OFF[key] = document.createElement('canvas'); } if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const Y = c.getContext('2d'); if (Y.setTransform) Y.setTransform(1, 0, 0, 1, 0, 0); if (Y.clearRect) Y.clearRect(0, 0, w, h); Y.globalAlpha = 1; Y.globalCompositeOperation = 'source-over'; Y.filter = 'none'; return { c, Y }; };
  // ارسم مصدر على كانفس صغير واقرا البكسلات (null لو المتصفح ما يدعم — مثلاً بالاختبار)
  const sample = (key, src, w, h, ctx) => { const { c, Y } = off(key, w, h); Y.save(); Y.scale(w / 1080, h / 1920); if (typeof src === 'function') src(Y); else { const im = imgOf(ctx, src); if (im) Y.drawImage(im, 0, 0, 1080, 1920); } Y.restore();
    let d = null; try { const id = Y.getImageData(0, 0, w, h); d = id && id.data ? id.data : null; } catch (e) { d = null; } return { c, Y, d }; };
  const typed = (s, k) => { s = String(s); if (isAr(s)) { const w = s.split(/\s+/).filter(Boolean); return w.slice(0, Math.round(cl(k) * w.length)).join(' '); } return s.slice(0, Math.round(cl(k) * s.length)); };
  // نص بمقاطع: '*كلمة*' = باللون المميز — يرسم المقاطع متجاورة (العربي من اليمين). align: 'center'|'left'|'right' حول x
  const segs = s => String(s).split(/(\*[^*]+\*)/).filter(Boolean).map(p => (/^\*.*\*$/.test(p) ? { s: p.slice(1, -1), hi: true } : { s: p, hi: false }));
  const rich = (ctx, X, str, x, y, size, o) => { o = o || {}; const f = o.family || FAM, wt = o.weight || 700, S = segs(str), rtl = o.rtl != null ? o.rtl : isAr(str);
    const W = S.map(p => tw(ctx, X, p.s, size, wt, f)), tot = W.reduce((a, b) => a + b, 0), al = o.align || 'center';
    let cur = al === 'center' ? (rtl ? x + tot / 2 : x - tot / 2) : al === 'right' ? (rtl ? x : x - tot) : (rtl ? x + tot : x);
    S.forEach((p, i) => { const w = W[i], left = rtl ? cur - w : cur; if (p.hi && o.pill) { X.save(); X.globalAlpha *= o.alpha == null ? 1 : o.alpha; X.fillStyle = o.pill; rr(X, left - size * 0.18, y - size * 0.86, w + size * 0.36, size * 1.12, size * 0.18); X.fill(); X.restore(); }
      T(ctx, X, p.s, left + w / 2, y, size, { family: f, weight: wt, color: p.hi ? (o.pill ? (o.onPill || '#FFFFFF') : (o.hi || ctx.P.acc)) : (o.color || ctx.P.ink), alpha: o.alpha, shadow: o.shadow });
      cur = rtl ? cur - w : cur + w; }); return tot; };

  /* ══════════ أدوات مشتركة ══════════ */
  const ptOf = p => (Array.isArray(p) ? [p[0], p[1]] : p && typeof p === 'object' ? [p.x, p.y] : [0, 0]);
  const lerpAny = (a, b, k) => { if (typeof a === 'number') return typeof b === 'number' ? lerp(a, b, k) : a; if (Array.isArray(a)) return a.map((v, i) => (b && b[i] !== undefined ? lerpAny(v, b[i], k) : v));
    if (a && typeof a === 'object') { const r = {}; for (const key in a) r[key] = b && b[key] !== undefined ? lerpAny(a[key], b[key], k) : a[key]; return r; } return a; };
  FX.trackAt = (track, t) => { if (!track) return null; const F = Array.isArray(track) ? track : track.frames; if (!F || !F.length) return null;
    if (t <= F[0].t) return F[0]; const L = F[F.length - 1]; if (t >= L.t) return L;
    let lo = 0, hi = F.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (F[m].t <= t) lo = m; else hi = m; }
    const a = F[lo], b = F[hi]; return lerpAny(a, b, (t - a.t) / ((b.t - a.t) || 1)); };
  const quadOfBox = b => [[b[0], b[1]], [b[0] + b[2], b[1]], [b[0] + b[2], b[1] + b[3]], [b[0], b[1] + b[3]]];
  const boxOfQuad = q => { const P2 = q.map(ptOf), xs = P2.map(p => p[0]), ys = P2.map(p => p[1]), x = Math.min(...xs), y = Math.min(...ys); return [x, y, Math.max(...xs) - x, Math.max(...ys) - y]; };
  const boxArr = b => (Array.isArray(b) ? b : b && typeof b === 'object' ? [b.x, b.y, b.w, b.h] : null);
  FX.placeAt = (o, t, key, def) => {
    let v = o ? o[key] : undefined; if (typeof v === 'function') v = v(t);
    if ((v == null) && o && o.track) { const f = FX.trackAt(o.track, t); if (f) {
      const box = f.box ? boxArr(f.box) : f.quad ? boxOfQuad(f.quad) : null, pts = f.points || null;
      if (key === 'quad') v = f.quad ? f.quad.map(ptOf) : box ? quadOfBox(box) : null;
      else if (key === 'box') v = box;
      else if (key === 'face') v = box ? Object.assign({ x: box[0], y: box[1], w: box[2], h: box[3] }, pts ? { points: pts } : {}) : null;
      else if (pts && pts[key]) v = ptOf(pts[key]);
      else if (box) v = [box[0] + box[2] / 2, box[1] + box[3] / 2];
      else if (f.quad) { const q = f.quad.map(ptOf); v = [q.reduce((a, p) => a + p[0], 0) / q.length, q.reduce((a, p) => a + p[1], 0) / q.length]; } } }
    return v == null ? def : v; };
  FX.faceAt = (o, t, def) => { let f = FX.placeAt(o, t, 'face', null); if (!f) f = def; if (!f) return null;
    if (Array.isArray(f)) f = f.length >= 4 ? { x: f[0], y: f[1], w: f[2], h: f[3] } : { x: f[0] - 150, y: f[1] - 185, w: 300, h: 370 };
    const pts = f.points || {}, cx = f.x + f.w / 2, cy = f.y + f.h / 2;
    const eyes = f.eyes || (pts.leftEye && pts.rightEye ? [ptOf(pts.leftEye), ptOf(pts.rightEye)] : [[cx - f.w * 0.2, f.y + f.h * 0.42], [cx + f.w * 0.2, f.y + f.h * 0.42]]);
    return { x: f.x, y: f.y, w: f.w, h: f.h, cx, cy, eyes }; };
  FX.cueIndex = (cues, t) => { let i = -1; (cues || []).forEach((c, j) => { if (t >= (typeof c === 'number' ? c : c.t)) i = j; }); return i; };
  const cueT = c => (typeof c === 'number' ? c : c.t);
  FX.cadence = (t, o) => { o = o || {}; const e = o.every || 0.85, s = o.s || 0, n = o.n || 0, raw = Math.floor((t - s) / e), i = n ? Math.min(raw, n - 1) : raw;
    return { i, t0: s + i * e, k: cl((t - s - i * e) / e), cues: Array.from({ length: n }, (_, j) => s + j * e) }; };
  const cuesOf = (o, n, every) => (o.cues ? o.cues.map(cueT) : Array.from({ length: n }, (_, j) => (o.s || 0) + j * (o.every || every)));
  FX.morphAt = (keys, t, dur) => { dur = dur || 0.32; if (!keys || !keys.length) return null; let i = FX.cueIndex(keys, t); if (i < 0) return Object.assign({ k: 0 }, keys[0].rect);
    const cur = keys[i].rect, prev = i ? keys[i - 1].rect : cur, k = ioC(pr(t, keys[i].t, keys[i].t + dur)), r = lerpAny(prev, cur, k); return Object.assign(r, { k, moving: k > 0 && k < 1 }); };
  // رسم صورة على رباعي (منظور تقريبي بتقسيم مثلثات أفيني)
  FX.warpQuad = (X, img, quad, sub) => { if (!img) return; const q = quad.map(ptOf), w = imW(img), h = imH(img), n = sub || 8;
    const at2 = (u, v) => { const top = [lerp(q[0][0], q[1][0], u), lerp(q[0][1], q[1][1], u)], bot = [lerp(q[3][0], q[2][0], u), lerp(q[3][1], q[2][1], u)]; return [lerp(top[0], bot[0], v), lerp(top[1], bot[1], v)]; };
    const tri = (s0, s1, s2, d0, d1, d2) => { const den = (s1[0] - s0[0]) * (s2[1] - s0[1]) - (s2[0] - s0[0]) * (s1[1] - s0[1]); if (!den) return;
      const a = ((d1[0] - d0[0]) * (s2[1] - s0[1]) - (d2[0] - d0[0]) * (s1[1] - s0[1])) / den, b = ((d1[1] - d0[1]) * (s2[1] - s0[1]) - (d2[1] - d0[1]) * (s1[1] - s0[1])) / den;
      const c = ((d2[0] - d0[0]) * (s1[0] - s0[0]) - (d1[0] - d0[0]) * (s2[0] - s0[0])) / den, d = ((d2[1] - d0[1]) * (s1[0] - s0[0]) - (d1[1] - d0[1]) * (s2[0] - s0[0])) / den;
      const e = d0[0] - a * s0[0] - c * s0[1], f = d0[1] - b * s0[0] - d * s0[1];
      const cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3, gx = k2 => [k2[0] + (k2[0] - cx) * 0.02 + Math.sign(k2[0] - cx) * 0.6, k2[1] + (k2[1] - cy) * 0.02 + Math.sign(k2[1] - cy) * 0.6];
      const e0 = gx(d0), e1 = gx(d1), e2 = gx(d2);
      X.save(); X.beginPath(); X.moveTo(e0[0], e0[1]); X.lineTo(e1[0], e1[1]); X.lineTo(e2[0], e2[1]); X.closePath(); X.clip(); X.transform(a, b, c, d, e, f); X.drawImage(img, 0, 0); X.restore(); };
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const u0 = i / n, u1 = (i + 1) / n, v0 = j / n, v1 = (j + 1) / n;
      const s00 = [u0 * w, v0 * h], s10 = [u1 * w, v0 * h], s01 = [u0 * w, v1 * h], s11 = [u1 * w, v1 * h], d00 = at2(u0, v0), d10 = at2(u1, v0), d01 = at2(u0, v1), d11 = at2(u1, v1);
      tri(s00, s10, s11, d00, d10, d11); tri(s00, s11, s01, d00, d11, d01); } };
  // أيقونات عامة مرسومة (بلا شعارات): مسار بمربع [-1,1] — FX.icon(X, name, x, y, size, {stroke, fill, lw})
  const ICON = {
    heart: X => { X.moveTo(0, 0.8); X.bezierCurveTo(-1.1, 0, -0.9, -0.95, 0, -0.45); X.bezierCurveTo(0.9, -0.95, 1.1, 0, 0, 0.8); X.closePath(); },
    star: X => { for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.42 : 0.95, a = -Math.PI / 2 + i * Math.PI / 5; i ? X.lineTo(Math.cos(a) * r, Math.sin(a) * r) : X.moveTo(Math.cos(a) * r, Math.sin(a) * r); } X.closePath(); },
    spark: X => { X.moveTo(0, -1); X.quadraticCurveTo(0.12, -0.12, 1, 0); X.quadraticCurveTo(0.12, 0.12, 0, 1); X.quadraticCurveTo(-0.12, 0.12, -1, 0); X.quadraticCurveTo(-0.12, -0.12, 0, -1); X.closePath(); },
    bolt: X => { X.moveTo(0.25, -1); X.lineTo(-0.55, 0.12); X.lineTo(-0.02, 0.12); X.lineTo(-0.25, 1); X.lineTo(0.55, -0.15); X.lineTo(0.02, -0.15); X.closePath(); },
    play: X => { X.moveTo(-0.5, -0.75); X.lineTo(0.8, 0); X.lineTo(-0.5, 0.75); X.closePath(); },
    chat: X => { X.moveTo(-0.9, -0.7); X.lineTo(0.9, -0.7); X.lineTo(0.9, 0.4); X.lineTo(-0.2, 0.4); X.lineTo(-0.6, 0.85); X.lineTo(-0.55, 0.4); X.lineTo(-0.9, 0.4); X.closePath(); },
    bulb: X => { X.arc(0, -0.25, 0.62, Math.PI * 0.8, Math.PI * 2.2); X.lineTo(0.28, 0.55); X.lineTo(-0.28, 0.55); X.closePath(); X.moveTo(-0.25, 0.72); X.lineTo(0.25, 0.72); X.lineTo(0.18, 0.92); X.lineTo(-0.18, 0.92); X.closePath(); },
    gear: X => { for (let i = 0; i < 16; i++) { const r = i % 2 ? 0.72 : 0.95, a0 = i * Math.PI / 8 - 0.12, a1 = i * Math.PI / 8 + 0.12; X.lineTo(Math.cos(a0) * r, Math.sin(a0) * r); X.lineTo(Math.cos(a1) * r, Math.sin(a1) * r); } X.closePath(); X.moveTo(0.32, 0); X.arc(0, 0, 0.32, 0, TAU, true); },
    wheel: X => { X.arc(0, 0, 0.95, 0, TAU); X.moveTo(0.7, 0); X.arc(0, 0, 0.7, 0, TAU, true); for (let i = 0; i < 6; i++) { const a = i * TAU / 6; X.moveTo(Math.cos(a) * 0.12, Math.sin(a) * 0.12); X.lineTo(Math.cos(a + 0.08) * 0.7, Math.sin(a + 0.08) * 0.7); X.lineTo(Math.cos(a - 0.08) * 0.7, Math.sin(a - 0.08) * 0.7); X.closePath(); } },
    check: X => { X.moveTo(-0.8, 0); X.lineTo(-0.25, 0.55); X.lineTo(0.85, -0.6); X.lineTo(0.7, -0.75); X.lineTo(-0.25, 0.25); X.lineTo(-0.65, -0.15); X.closePath(); },
    camera: X => { X.moveTo(-0.95, -0.45); X.lineTo(-0.35, -0.45); X.lineTo(-0.2, -0.7); X.lineTo(0.2, -0.7); X.lineTo(0.35, -0.45); X.lineTo(0.95, -0.45); X.lineTo(0.95, 0.7); X.lineTo(-0.95, 0.7); X.closePath(); X.moveTo(0.35, 0.1); X.arc(0, 0.1, 0.35, 0, TAU, true); },
    music: X => { X.moveTo(-0.2, 0.55); X.arc(-0.45, 0.55, 0.25, 0, TAU); X.moveTo(-0.2, 0.55); X.lineTo(-0.2, -0.8); X.lineTo(0.75, -0.95); X.lineTo(0.75, 0.35); X.arc(0.5, 0.35, 0.25, 0, TAU); X.lineTo(0.75, -0.55); X.lineTo(-0.05, -0.43); X.lineTo(-0.05, 0.55); X.closePath(); },
    battery: X => { X.rect(-0.9, -0.5, 1.65, 1); X.rect(0.75, -0.2, 0.2, 0.4); X.moveTo(0.05, -0.38); X.lineTo(-0.35, 0.05); X.lineTo(-0.05, 0.05); X.lineTo(-0.2, 0.38); X.lineTo(0.25, -0.08); X.lineTo(-0.05, -0.08); X.closePath(); },
    spring: X => { X.rect(-0.3, -1, 0.6, 0.18); X.rect(-0.3, 0.82, 0.6, 0.18); for (let i = 0; i < 5; i++) { const y = -0.75 + i * 0.32; X.moveTo(-0.5, y); X.lineTo(0.5, y + 0.16); X.lineTo(0.5, y + 0.26); X.lineTo(-0.5, y + 0.1); X.closePath(); } },
    bike: X => { [[-0.55, 0.3], [0.55, 0.3]].forEach(([x, y]) => { X.moveTo(x + 0.38, y); X.arc(x, y, 0.38, 0, TAU); X.moveTo(x + 0.3, y); X.arc(x, y, 0.3, 0, TAU, true); });
      X.moveTo(-0.55, 0.3); X.lineTo(-0.1, -0.35); X.lineTo(0.35, -0.35); X.lineTo(0.55, 0.3); X.lineTo(0.47, 0.32); X.lineTo(0.3, -0.27); X.lineTo(-0.05, -0.27); X.lineTo(-0.47, 0.32); X.closePath(); X.rect(0.25, -0.62, 0.4, 0.1); },
    globe: X => { X.arc(0, 0, 0.92, 0, TAU); X.moveTo(0.8, 0); X.arc(0, 0, 0.8, 0, TAU, true); X.rect(-0.85, -0.05, 1.7, 0.1); X.ellipse(0, 0, 0.42, 0.85, 0, 0, TAU); X.moveTo(0.32, 0); X.ellipse(0, 0, 0.32, 0.75, 0, 0, TAU, true); },
    link: X => { [[-0.35, 0.35], [0.35, -0.35]].forEach(([x, y]) => { X.save(); X.translate(x, y); X.rotate(-Math.PI / 4); X.moveTo(-0.55, -0.28); X.arcTo(0.55, -0.28, 0.55, 0.28, 0.28); X.arcTo(0.55, 0.28, -0.55, 0.28, 0.28); X.arcTo(-0.55, 0.28, -0.55, -0.28, 0.28); X.arcTo(-0.55, -0.28, 0.55, -0.28, 0.28); X.closePath(); X.moveTo(-0.4, -0.13); X.lineTo(-0.4, 0.13); X.lineTo(0.4, 0.13); X.lineTo(0.4, -0.13); X.closePath(); X.restore(); }); },
    mail: X => { X.rect(-0.9, -0.6, 1.8, 1.2); X.moveTo(-0.9, -0.6); X.lineTo(0, 0.12); X.lineTo(0.9, -0.6); X.lineTo(0.9, -0.42); X.lineTo(0, 0.3); X.lineTo(-0.9, -0.42); X.closePath(); },
    phone: X => { X.rect(-0.5, -0.95, 1, 1.9); X.moveTo(0.4, -0.75); X.lineTo(-0.4, -0.75); X.lineTo(-0.4, 0.7); X.lineTo(0.4, 0.7); X.closePath(); },
    key: X => { X.rect(-0.85, -0.85, 1.7, 1.7); },
    flag: X => { X.rect(-0.75, -0.95, 0.12, 1.9); X.moveTo(-0.63, -0.9); X.lineTo(0.85, -0.6); X.lineTo(-0.63, -0.25); X.closePath(); },
    speed: X => { X.arc(0, 0.25, 0.95, Math.PI, TAU); X.lineTo(0.75, 0.25); X.arc(0, 0.25, 0.75, TAU, Math.PI, true); X.closePath(); X.moveTo(-0.05, 0.25); X.lineTo(0.55, -0.4); X.lineTo(0.08, 0.32); X.closePath(); },
  };
  const ICON_NAMES = Object.keys(ICON);
  FX.icon = (X, name, x, y, s, o) => { o = o || {}; const f = ICON[name] || ICON.star; X.save(); X.translate(x, y); X.scale(s / 2, s / 2); X.beginPath(); f(X);
    if (o.fill !== false) { X.fillStyle = o.fill || '#FFFFFF'; X.fill('evenodd'); } if (o.stroke) { X.lineJoin = 'round'; X.lineWidth = (o.lw || 3) / (s / 2); X.strokeStyle = o.stroke; X.stroke(); } X.restore(); };
  FX.iconNames = ICON_NAMES.slice();
  // تصدير الأدوات لـmoves-plus-h.js
  FX._g = { cl, pr, lerp, pick, cOut, cIn, ioC, eOut, bOut, h2, vnoise, fbm, rgba, mixC, lum, hueRot, isAr, pal, fam, T, tw, rr, shd, noShd, env, withE, imgOf, drawCover, drawSrc, off, sample, typed, segs, rich, ptOf, cueT, cuesOf, quadOfBox, boxArr, TAU, ON, FAM };

  // كرت فيديو بديل لما ما فيه مصدر (تدرّج من الثيم + خطوط)
  const fakeSrc = (P, seed) => Y => { const g = Y.createLinearGradient(0, 0, 1080, 1920); g.addColorStop(0, mixC(P.acc, P.bg, 0.25 + 0.3 * h2(seed, 1))); g.addColorStop(1, mixC(P.ink, P.acc, 0.35 + 0.3 * h2(seed, 2)));
    Y.fillStyle = g; Y.fillRect(0, 0, 1080, 1920); Y.fillStyle = 'rgba(255,255,255,.16)'; Y.beginPath(); Y.arc(300 + 500 * h2(seed, 3), 700, 260, 0, TAU); Y.fill();
    Y.fillStyle = 'rgba(0,0,0,.22)'; Y.beginPath(); Y.ellipse(540, 1100, 230, 270, 0, 0, TAU); Y.fill(); Y.beginPath(); Y.moveTo(160, 1920); Y.bezierCurveTo(160, 1500, 330, 1380, 540, 1380); Y.bezierCurveTo(750, 1380, 920, 1500, 920, 1920); Y.fill(); };
  FX._g.fakeSrc = fakeSrc;

  /* 284 عنصر مشترك بين مشهدين — العنصر (كبسولة أو أي رسمة) يطير من مكانه بالمشهد القديم لمكانه بالجديد، والباقي قص حاد.
     o: {s, dur=0.32, from:{x,y,w,h,r}, to:{x,y,w,h,r}, keys:[{t, rect}] (بدل from/to — أي عدد مشاهد), text ('*كلمة*' مميزة), draw:(X, w, h, k)=>{} (رسمتك داخل المستطيل), out} */
  FX.sharedMorph = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), d = o.dur || 0.32;
    const keys = o.keys || [{ t: -1e9, rect: o.from || { x: 90, y: 1600, w: 900, h: 120, r: 60 } }, { t: s, rect: o.to || { x: 90, y: 380, w: 900, h: 120, r: 60 } }];
    const R = FX.morphAt(keys, t, d); if (!R) return; const k = R.k || 0, mid = Math.sin(Math.PI * k), os = o.overshoot === false ? 0 : 0.04 * Math.sin(Math.PI * cl(k * 1.15)) * (k < 1 ? 1 : 0);
    const e = env(t, pick(o, 'in', -1e9), o.out); if (e.o <= ON) return;
    withE(X, e, R.x + R.w / 2, R.y + R.h / 2, () => { X.save(); X.translate(R.x, R.y - os * R.h); shd(X, 12 + 14 * mid, 8 + 10 * mid, c.dark ? 0.5 : 0.22);
      if (o.draw) { o.draw(X, R.w, R.h, k); X.restore(); return; }
      X.fillStyle = c.surf; rr(X, 0, 0, R.w, R.h, R.r == null ? R.h / 2 : R.r); X.fill(); noShd(X); X.strokeStyle = c.line; X.lineWidth = 2; X.stroke();
      X.fillStyle = c.acc; X.beginPath(); X.arc(isAr(o.text || '') ? R.w - R.h / 2 : R.h / 2, R.h / 2, R.h * 0.28, 0, TAU); X.fill();
      rich(ctx, X, o.text || 'Comment *VIDEO* for the full guide', R.w / 2 + (isAr(o.text || '') ? -R.h * 0.2 : R.h * 0.2), R.h * 0.63, Math.min(R.h * 0.4, 46), { color: c.ink, hi: c.acc, weight: 800, family: fam(o) });
      X.restore(); }); };

  /* 285 نتيجة «تنرسم» — كرت ينملي نقش ديذر (نقط مربعة) بلون مميز ينتظر، وبعدين النقش يصغر ويصفى للصورة الحقيقية.
     o: {s (لحظة الوصول), dur=0.45, wait=1 (ثواني الانتظار قبل s), draw (Y)=>{} أو img = المصدر, box:{x,y,w,h,r} (افتراضي الشاشة كاملة), tint=P.acc, cell=10, out} */
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
  FX.ditherResolve = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 1), d = o.dur || 0.45, B = o.box || { x: 0, y: 0, w: 1080, h: 1920, r: 0 }, tint = o.tint || c.acc;
    const src = o.draw || o.img || fakeSrc(P, 3), wait = pick(o, 'wait', 1), k = pr(t, s, s + d); if (t < s - wait) return;
    const e = env(t, s - wait, o.out, { din: 0.25 }); if (e.o <= ON) return;
    withE(X, e, B.x + B.w / 2, B.y + B.h / 2, () => { X.save(); rr(X, B.x, B.y, B.w, B.h, B.r || 0); X.clip();
      const cell = lerp(pick(o, 'cell', 10), 1.5, cOut(k)), gw = Math.max(8, Math.round(B.w / cell)), gh = Math.max(8, Math.round(B.h / cell));
      if (k < 0.98) { const smp = t < s ? null : sample('dither_src', (Y) => { Y.save(); Y.scale(1080 / B.w, 1920 / B.h); drawSrc(ctx, Y, src, 0, 0, B.w, B.h); Y.restore(); }, gw, gh, ctx);
        const { c: oc, Y: OY } = off('dither_out', gw, gh); let img = null; try { img = OY.createImageData ? OY.createImageData(gw, gh) : null; } catch (er) { img = null; }
        const on = hexRGB(tint), offc = hexRGB(mixC(c.night, tint, 0.22)), scroll = Math.floor(t * 30);
        if (img && img.data) { const D = img.data; for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) { const i = (y * gw + x) * 4;
            let l = smp && smp.d ? (0.2126 * smp.d[i] + 0.7152 * smp.d[i + 1] + 0.0722 * smp.d[i + 2]) / 255 : fbm(x * 0.09, (y + scroll * 0.6) * 0.09, 5) * 0.9 + (((y + scroll) % 24) < 1 ? 0.3 : 0);
            l = lerp(l, 0.5, 0.15); const v = l > BAYER[(y & 3) * 4 + (x & 3)] ? on : offc; D[i] = v[0]; D[i + 1] = v[1]; D[i + 2] = v[2]; D[i + 3] = 255; }
          OY.putImageData(img, 0, 0); X.imageSmoothingEnabled = false; X.drawImage(oc, B.x, B.y, B.w, B.h); X.imageSmoothingEnabled = true; }
        else { X.fillStyle = tint; X.fillRect(B.x, B.y, B.w, B.h); } }
      const a = cOut(pr(k, 0.4, 1)); if (a > ON) { X.globalAlpha *= a; drawSrc(ctx, X, src, B.x, B.y, B.w, B.h); }
      X.restore(); }); };

  /* 286 قطع منفصلة وأسماء — الأجزاء تنفصل على محور مايل بالتتابع، وبعدين خط قائد ينرسم من كل جزء لعمود أسماء (رقم · اسم · سطر صغير).
     o: {s, out, parts:[{label, sub, img, draw:(X,w,h)=>{}}], axis=-60 (درجة), spread=150, cx=330, cy=980, colX=600, kicker, total} */
  FX.explodedCallouts = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), f = fam(o);
    const parts = o.parts || [{ label: 'Cap', sub: 'soft silicone' }, { label: 'Filter', sub: 'fine mesh' }, { label: 'Driver', sub: 'custom 11 mm' }, { label: 'Battery', sub: 'button cell' }, { label: 'Chip', sub: 'audio · ANC' }, { label: 'Shell', sub: 'gloss + stem' }];
    const n = parts.length, ax = (pick(o, 'axis', -60)) * Math.PI / 180, sp = pick(o, 'spread', 210), cx = pick(o, 'cx', 330), cy = pick(o, 'cy', 960), colX = pick(o, 'colX', parts.some(p => isAr(p.label)) ? 740 : 560);
    const e = env(t, s, o.out, { din: 0.3 }); if (e.o <= ON) return;
    withE(X, e, 540, 960, () => {
      const pos = parts.map((p, i) => { const kk = cOut(pr(t, s + 0.15 + i * 0.06, s + 0.65 + i * 0.06)), off2 = (i - (n - 1) / 2) * sp * kk; return { x: cx + Math.cos(ax) * off2, y: cy + Math.sin(ax) * off2, r: (1 - kk) * (h2(i, 4) - 0.5) * 0.2, kk }; });
      parts.forEach((p, i) => { const q = pos[i], w = 220 + 80 * h2(i, 1), h = 130 + 60 * h2(i, 2); X.save(); X.translate(q.x, q.y); X.rotate(q.r); shd(X, 30, 14, c.dark ? 0.5 : 0.2);
        const im = imgOf(ctx, p.img); if (p.draw) p.draw(X, w, h); else if (im) { X.drawImage(im, -w / 2, -h / 2, w, h); }
        else { const g = X.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); g.addColorStop(0, mixC(c.card, '#FFFFFF', 0.4)); g.addColorStop(1, mixC(c.card, c.inkD, 0.25)); X.fillStyle = g; rr(X, -w / 2, -h / 2, w, h, 26); X.fill(); noShd(X);
          X.strokeStyle = c.line; X.lineWidth = 2; X.stroke(); X.fillStyle = rgba(c.acc, 0.85); X.beginPath(); X.arc(-w * 0.2, 0, h * 0.18, 0, TAU); X.fill(); X.fillStyle = rgba(c.inkD, 0.25); X.fillRect(w * 0.02, -6, w * 0.32, 12); }
        X.restore(); noShd(X); });
      parts.forEach((p, i) => { const q = pos[i], t0 = s + 0.75 + i * 0.25, kl = cOut(pr(t, t0, t0 + 0.2)), kd = bOut(pr(t, t0 - 0.06, t0 + 0.12), 2), kt = cOut(pr(t, t0 + 0.15, t0 + 0.4)); if (kd <= ON) return;
        const ar = isAr(p.label), y = q.y; X.fillStyle = c.ink; X.beginPath(); X.arc(q.x + 120, y, 8 * kd, 0, TAU); X.fill();
        X.strokeStyle = c.mut; X.lineWidth = 3; X.beginPath(); X.moveTo(q.x + 120, y); X.lineTo(lerp(q.x + 120, colX, kl), y); X.stroke();
        if (kt <= ON) return; X.save(); X.globalAlpha *= kt; const lx = ar ? 1040 : colX + 18 + 12 * (1 - kt), al = ar ? 'right' : 'left';
        const num = String(i + 1).padStart(2, '0'); T(ctx, X, num, ar ? 1040 : lx, y - 14, 28, { family: 'num', weight: 700, color: c.acc, align: al });
        T(ctx, X, p.label, ar ? 1040 - 58 : lx + 52, y + 4, 50, { family: f, weight: 700, color: c.ink, align: al });
        if (p.sub) T(ctx, X, p.sub, ar ? 1040 - 58 : lx + 52, y + 44, 26, { family: ar ? f : 'num', weight: 500, color: c.mut, align: al }); X.restore(); });
      const kf = cOut(pr(t, s + 0.8 + n * 0.25, s + 1.2 + n * 0.25)); if (kf > ON) { const ar = isAr(o.total || ''), x = ar ? 1010 : 70, al = ar ? 'right' : 'left';
        if (o.kicker !== false) T(ctx, X, String(o.kicker || 'EXPLODED VIEW').toUpperCase(), x, 1740, 22, { family: 'num', weight: 700, color: c.acc, align: al, alpha: kf, letterSpacing: 3 });
        T(ctx, X, o.total || (n + ' parts, opened'), x, 1792, 40, { family: f, weight: 700, color: c.ink, align: al, alpha: kf }); } }); };

  /* 287 شارة التقدّم — كبسولة «NN/المجموع» باللون المميز وجنبها اسم المقطع، تتبدّل مع كل مقطع (الرقم يلف عمودياً). للمونتاج «24 مؤثر بكليب».
     o: {cues:[{t, name}] أو s + every=0.85 + names:[...], total, x, y=64, safe=false (ينزل لـ232 لمنطقة الأمان), out} */
  FX.progressChip = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), f = fam(o);
    const names = o.names || ['Glass widgets', 'Vertigo', 'Orbit', 'Locked on', 'Paper cut'], cues = o.cues ? o.cues : names.map((nm, j) => ({ t: pick(o, 's', 0) + j * (o.every || 0.85), name: nm }));
    const i = FX.cueIndex(cues, t); if (i < 0) return; const total = o.total || cues.length, cu = cues[i], k = cOut(pr(t, cueT(cu), cueT(cu) + 0.15)), ko = o.out != null ? 1 - cOut(pr(t, o.out, o.out + 0.25)) : 1; if (ko <= ON) return;
    const name = cu.name || names[i] || '', ar = isAr(name), y = pick(o, 'y', o.safe ? 232 : 64), sz = 26, num = `${String(i + 1).padStart(2, '0')}/${total}`;
    const pw = tw(ctx, X, num, 22, 800, 'num') + 32, ph = 40, x0 = ar ? pick(o, 'x', 1056) - pw : pick(o, 'x', 24);
    X.save(); X.globalAlpha *= ko; shd(X, 14, 4, 0.25); X.fillStyle = c.acc; rr(X, x0, y, pw, ph, ph / 2); X.fill(); noShd(X);
    X.save(); rr(X, x0, y, pw, ph, ph / 2); X.clip(); const prevNum = i ? `${String(i).padStart(2, '0')}/${total}` : '';
    if (k < 1 && prevNum) T(ctx, X, prevNum, x0 + pw / 2, y + 28 - 30 * k, 22, { family: 'num', weight: 800, color: c.on, alpha: 1 - k });
    T(ctx, X, num, x0 + pw / 2, y + 28 + 30 * (1 - k), 22, { family: 'num', weight: 800, color: c.on }); X.restore();
    const nx = ar ? x0 - 12 : x0 + pw + 12; T(ctx, X, name, nx, y + 29, sz, { family: f, weight: 700, color: '#FFFFFF', align: ar ? 'right' : 'left', alpha: lerp(0.3, 1, k), shadow: { color: 'rgba(0,0,0,.55)', blur: 10, y: 2 } });
    X.restore(); };

  /* 288 نفق متكرر — الإطار جوّا نفسه طبقات (كل طبقة أصغر وتلف)، والكاميرا تدخل للداخل بلا نهاية.
     o: {s, out, draw (Y)=>{} المصدر, depth=7, k=0.82, rot=7 (درجة لكل طبقة), speed=1.2 (طبقة/ث), border='#FFFFFF', bw=6} */
  FX.drosteTunnel = (ctx, t, o) => { const { X, P } = ctx, s = pick(o, 's', 0), src = o.draw || fakeSrc(P, 7); if (t < s || (o.out != null && t > o.out)) { src(X); return; }
    const depth = o.depth || 7, kk = o.k || 0.82, rot = (pick(o, 'rot', 7)) * Math.PI / 180, p = ((t - s) * pick(o, 'speed', 1.2)) % 1, a0 = cOut(pr(t, s, s + 0.15));
    const { c: fc, Y } = off('droste', 540, 960); Y.save(); Y.scale(0.5, 0.5); src(Y); Y.restore();
    src(X); for (let i = 0; i <= depth; i++) { const lv = i - p, sc = Math.pow(kk, lv) * lerp(1.6, 1, a0), r = rot * lv; if (sc > 3) continue;
      X.save(); X.translate(540, 960); X.rotate(r); X.scale(sc, sc); if (i) { shd(X, 30 / sc, 0, 0.45); X.fillStyle = '#000000'; X.fillRect(-540, -960, 1080, 1920); noShd(X); }
      X.drawImage(fc, -540, -960, 1080, 1920); X.strokeStyle = o.border || '#FFFFFF'; X.lineWidth = (o.bw || 6) / sc; X.strokeRect(-540, -960, 1080, 1920); X.restore(); } };

  /* 289 ظلال على الجدار — لون دافي (سيبيا) وظلال أيقونات تنعكس على الجدار ورا الشخص (يحتاج قصّ o.person — بلاه الظلال على أطراف الإطار بس وبشفافية أقل).
     o: {s, out, draw (Y) الفيديو, person (Y) القصّ, shapes:['play','heart','star','bolt','chat'] (أسماء FX.icon), grade=0.45} */
  FX.wallShadows = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), src = o.draw || fakeSrc(P, 2), hasP = typeof o.person === 'function';
    const k = cOut(pr(t, s, s + 0.3)) * (o.out != null ? 1 - cOut(pr(t, o.out, o.out + 0.3)) : 1); const gr = pick(o, 'grade', 0.45) * k;
    X.save(); X.filter = `sepia(${gr.toFixed(2)}) contrast(${(1 + 0.08 * k).toFixed(2)})`; src(X); X.restore(); if (k <= ON) return;
    X.save(); X.globalCompositeOperation = 'soft-light'; X.globalAlpha = 0.35 * k; X.fillStyle = c.acc; X.fillRect(0, 0, 1080, 1920); X.restore();
    const sh = o.shapes || ['play', 'heart', 'star', 'bolt', 'chat', 'camera'];
    sh.forEach((nm, i) => { const ka = cOut(pr(t, s + 0.1 + i * 0.06, s + 0.35 + i * 0.06)) * k; if (ka <= ON) return;
      let x = 140 + ((i * 0.618) % 1) * 800, y = 230 + (i % 3) * 210 + 40 * h2(i, 3); if (!hasP && x > 260 && x < 820) x = x < 540 ? 150 : 930;
      const z = 0.4 + 0.6 * h2(i, 5), sz = 150 + 170 * z; X.save(); X.globalAlpha = ka * (hasP ? 0.45 + 0.2 * z : 0.25); X.filter = `blur(${(2 + 5 * z).toFixed(1)}px)`;
      X.translate(x + 4 * Math.sin(t * 3.8 + i), y + 3 * Math.cos(t * 3.2 + i)); X.transform(1, 0, -0.14, 1, 0, 0); FX.icon(X, nm, 0, 0, sz, { fill: '#000000' }); X.restore(); });
    if (hasP) { X.save(); X.filter = `sepia(${gr.toFixed(2)}) contrast(${(1 + 0.08 * k).toFixed(2)})`; o.person(X); X.restore(); } };

  /* 290 قائمة تقييم — لوح صفوف S A B C D F بألوان مشتقة من اللون المميز ينزلق، والعناصر تطيح لصفوفها بارتداد.
     o: {s, out, rows:['S','A','B','C','D','F'], colors:[...], items:[{row, text, at}], x=40, y=1080, w=560, h=600} */
  FX.tierBoard = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), f = fam(o), rows = o.rows || ['S', 'A', 'B', 'C', 'D', 'F'], n = rows.length;
    const x = pick(o, 'x', 40), y = pick(o, 'y', 1080), w = o.w || 560, h = o.h || 600, rh = h / n, cols = o.colors || rows.map((_, i) => hueRot(c.acc, -i * 32));
    const kp = cOut(pr(t, s, s + 0.35)), ko = o.out != null ? cIn(pr(t, o.out, o.out + 0.3)) : 0; if (kp <= ON || ko >= 1) return;
    X.save(); X.translate(-(w + 60) * (1 - kp) - (w + 60) * ko, 0); shd(X, 30, 12, 0.35); X.fillStyle = rgba(c.dark ? c.surf : mixC(c.inkD, c.bg, 0.12), 0.92); rr(X, x, y, w, h, 18); X.fill(); noShd(X);
    rows.forEach((r, i) => { const kr = cOut(pr(t, s + 0.15 + i * 0.04, s + 0.4 + i * 0.04)); X.globalAlpha = kr; const ry = y + i * rh;
      X.fillStyle = cols[i % cols.length]; rr(X, x + 10, ry + 8, rh - 16, rh - 16, 12); X.fill(); T(ctx, X, r, x + 10 + (rh - 16) / 2, ry + rh / 2 + 13, 36, { family: 'num', weight: 900, color: lum(cols[i % cols.length]) > 140 ? '#151515' : '#FFFFFF' });
      if (i) { X.fillStyle = rgba('#FFFFFF', 0.08); X.fillRect(x + 10, ry, w - 20, 2); } X.globalAlpha = 1; });
    const items = o.items || [{ row: 0, text: o.item || 'Your pick', at: s + 0.7 }]; const per = {};
    items.forEach(it => { const ri = typeof it.row === 'number' ? it.row : Math.max(0, rows.indexOf(it.row)), j = (per[ri] = (per[ri] || 0) + 1) - 1, at = pick(it, 'at', s + 0.7), ki = pr(t, at, at + 0.3); if (ki <= 0) return;
      const label = it.text || '', iw = tw(ctx, X, label, 26, 700, f) + 40, ix = x + rh + 6 + j * (iw + 12), iy = y + ri * rh + rh / 2, dy = -80 * (1 - bOut(ki, 2)), sq = 1 - 0.12 * Math.sin(Math.PI * pr(t, at + 0.3, at + 0.42));
      X.save(); X.translate(ix + iw / 2, iy + dy); X.scale(1 / sq, sq); X.globalAlpha = cl(ki * 3); shd(X, 10, 4, 0.3); X.fillStyle = c.acc; rr(X, -iw / 2, -24, iw, 48, 10); X.fill(); noShd(X);
      T(ctx, X, label, 0, 9, 26, { family: f, weight: 700, color: c.on }); X.restore(); });
    X.restore(); };

  /* 291 الكلمة تثقل — نفس الكلمة تتحول من خط رفيع لأسود (خط Cairo متغيّر الوزن)، فوقها أسهم صغيرة تنط وتحتها خط ينحني كأنه يشيل ثقل.
     o: {s, dur=0.8, text='ثقيلة', lead (سطر صغير فوق), from=200, to=900, size=200, y=980, chevrons=true, underline=true, out} */
  FX.weightMorph = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), d = o.dur || 0.8, f = o.family || FAM, y = pick(o, 'y', 980), size = o.size || 200, str = o.text || 'ثقيلة';
    const e = env(t, s - 0.4, o.out, { din: 0.3 }); if (e.o <= ON) return; const k = ioC(pr(t, s, s + d)), wt = Math.round(lerp(pick(o, 'from', 200), pick(o, 'to', 900), k) / 10) * 10;
    withE(X, e, 540, y, () => { if (o.lead) T(ctx, X, o.lead, 540, y - size * 1.05, 52, { family: f, weight: 700, color: c.ink });
      T(ctx, X, str, 540, y, size, { family: f, weight: wt, color: mixC(c.mut, c.ink, k) });
      const w = tw(ctx, X, str, size, wt, f), uw = Math.max(w, tw(ctx, X, str, size, 900, f)) * 1.05;
      if (o.underline !== false) { const sag = 26 * k; X.strokeStyle = c.ink; X.lineWidth = 4 + 2 * k; X.lineCap = 'round'; X.beginPath(); X.moveTo(540 - uw / 2, y + 40); X.quadraticCurveTo(540, y + 40 + sag * 2, 540 + uw / 2, y + 40); X.stroke(); }
      if (o.chevrons !== false) for (let i = 0; i < 3; i++) { const kc = bOut(pr(t, s + 0.3 * d + i * 0.06, s + 0.3 * d + i * 0.06 + 0.2), 2.2); if (kc <= ON) continue;
        const cx = 540 + (i - 1) * 56, cy = y - size * 0.95 + 6 * Math.sin((t - s) * 7 + i); X.save(); X.globalAlpha *= cl(kc); X.translate(cx, cy); X.scale(kc, kc); X.strokeStyle = c.acc; X.lineWidth = 7; X.lineCap = 'round'; X.lineJoin = 'round';
          X.beginPath(); X.moveTo(-16, -9); X.lineTo(0, 7); X.lineTo(16, -9); X.stroke(); X.restore(); } }); };

  /* 292 يتفتت غبار — الموضوع (o.person أو المشهد A كامل) يتفكك لذرات تطير مع جبهة تمشي من اليمين لليسار، ويبين المشهد B مكانه.
     o: {s, dur=1, A (Y), B (Y), person (Y) اختياري = الشي اللي يتفتت فوق B, dir='rtl'|'ltr', cell=12} */
  FX.dustDissolve = (ctx, t, o) => { const { X, P } = ctx, s = pick(o, 's', 0), d = o.dur || 1, A = o.A || fakeSrc(P, 1), B = o.B || (Y => { Y.fillStyle = P.bg; Y.fillRect(0, 0, 1080, 1920); });
    const subj = typeof o.person === 'function' ? o.person : A; if (t < s) { if (subj !== A) B(X); subj(X); return; } B(X); if (t > s + d + 0.7) return;
    const rtl = (o.dir || 'rtl') === 'rtl', cell = o.cell || 12, gw = Math.round(1080 / cell), gh = Math.round(1920 / cell), smp = sample('dust_src', subj, gw, gh, ctx);
    const front = y => { const n = (fbm(y * 0.004, 3.3, 2) - 0.5) * 260, u = (t - s) / d; return rtl ? lerp(1200, -200, u) + n : lerp(-120, 1280, u) + n; };
    // الجزء اللي ما تفتت بعد: نقص المصدر بحافة الجبهة
    X.save(); X.beginPath(); if (rtl) { X.moveTo(-10, -10); for (let y = 0; y <= 1920; y += 40) X.lineTo(front(y), y); X.lineTo(-10, 1930); } else { X.moveTo(1090, -10); for (let y = 0; y <= 1920; y += 40) X.lineTo(front(y), y); X.lineTo(1090, 1930); } X.closePath(); X.clip(); subj(X); X.restore();
    if (!smp.d) return; const D = smp.d;
    for (let gy = 0; gy < gh; gy += 1) for (let gx = 0; gx < gw; gx += 1) { const i = (gy * gw + gx) * 4; if (D[i + 3] < 40) continue; const x = gx * cell + cell / 2, y = gy * cell + cell / 2;
      const fy = front(y), passed = rtl ? x > fy : x < fy; if (!passed) continue;
      const dist = Math.abs(x - fy), u = dist / (1400 / d) + 0.02 * h2(gx, gy); if (u > 0.65) continue;
      const vx = (rtl ? 1 : -1) * (80 + 140 * h2(gx, gy + 7)), vy = -(40 + 90 * h2(gx + 3, gy)), px = x + vx * u + 30 * Math.sin(u * 6 + gy * 0.3), py = y + vy * u + 18 * Math.cos(u * 5 + gx * 0.2);
      const a = (1 - u / 0.65), r = cell * 0.42 * (1 - u / 0.8); if (r <= 0.3) continue;
      X.fillStyle = `rgba(${D[i]},${D[i + 1]},${D[i + 2]},${(a * D[i + 3] / 255).toFixed(3)})`; X.fillRect(px - r, py - r, r * 2, r * 2); } };

  /* 293 ملاحظات «جرّب» — كرت ملاحظات صغير فيه قائمة مرقّمة: الحالي بدايرة فاضية وعريض، اللي خلص علامة صح ورمادي، والقائمة تنزلق سطر مع كل مقطع، وفوق عدّاد «NN/المجموع».
     o: {items:[...], cues:[t…] أو s + every=0.85, title='Effects to try', back='Notes', date, x=750, y=600, w=310, visible=10, out} */
  FX.notesChecklist = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), f = fam(o), s = pick(o, 's', 0);
    const items = o.items || ['/glass-widgets', '/vertigo', '/orbit', '/locked-on', '/paper-cut', '/glitter', '/backdrop-word', '/digital-zoom', '/rabbit-hole', '/shadow-puppet', '/countdown', '/pullback'];
    const n = items.length, cues = cuesOf(o, n, 0.85), cur = FX.cueIndex(cues, t), e = env(t, s - 0.3, o.out, { din: 0.3 }); if (e.o <= ON) return;
    const rtl = isAr(items.join('')), w = o.w || 310, x = pick(o, 'x', rtl ? 20 : 750), y = pick(o, 'y', 600), rh = 34, vis = o.visible || 10, hh = 88, h = hh + rh * vis + 14;
    const light = !c.dark || o.light, paper = light ? mixC(c.bg, '#FFFFFF', 0.9) : c.card, ink = light ? c.inkD : c.ink, mut = light ? mixC(c.inkD, '#FFFFFF', 0.55) : c.mut;
    withE(X, e, x + w / 2, y + h / 2, () => { shd(X, 24, 10, 0.3); X.fillStyle = paper; rr(X, x, y, w, h, 16); X.fill(); noShd(X);
      const L = v => (rtl ? x + w - v : x + v), al = rtl ? 'right' : 'left';
      T(ctx, X, '‹ ' + (o.back || 'Notes'), L(16), y + 24, 15, { family: f, weight: 700, color: c.acc, align: al });
      T(ctx, X, o.title || 'Effects to try', L(16), y + 54, 22, { family: f, weight: 800, color: ink, align: al });
      const badge = `${String(Math.max(0, cur) + 1).padStart(2, '0')}/${n}`, bw = tw(ctx, X, badge, 13, 800, 'num') + 16, tw0 = tw(ctx, X, o.title || 'Effects to try', 22, 800, f), bx = rtl ? x + w - 16 - tw0 - 10 - bw : x + 16 + tw0 + 10;
      X.fillStyle = ink; rr(X, bx, y + 38, bw, 22, 11); X.fill(); T(ctx, X, badge, bx + bw / 2, y + 54, 13, { family: 'num', weight: 800, color: paper });
      T(ctx, X, o.date || 'Today · 10:41', L(16), y + 76, 12, { family: f, weight: 500, color: mut, align: al });
      const prevI = Math.max(0, cur - 1), kS = cur >= 0 ? cOut(pr(t, cues[cur] + 0.1, cues[cur] + 0.3)) : 0, top = Math.max(0, lerp(prevI, Math.max(0, cur), kS) - 3) * rh;
      X.save(); X.beginPath(); X.rect(x, y + hh, w, rh * vis + 8); X.clip();
      items.forEach((it, i) => { const ry = y + hh + 8 + i * rh - top; if (ry < y + hh - rh || ry > y + h) return; const done = i < cur, now = i === cur, cx0 = L(26), cy0 = ry + rh / 2;
        if (done) { const kc = cOut(pr(t, cues[i + 1], cues[i + 1] + 0.12)); X.fillStyle = c.acc; X.beginPath(); X.arc(cx0, cy0, 9, 0, TAU); X.fill();
          X.strokeStyle = '#FFFFFF'; X.lineWidth = 2.4; X.lineCap = 'round'; X.beginPath(); X.moveTo(cx0 - 4, cy0); X.lineTo(cx0 - 4 + 3 * Math.min(1, kc * 2), cy0 + 3 * Math.min(1, kc * 2)); if (kc > 0.5) X.lineTo(cx0 - 1 + 5.5 * (kc - 0.5) * 2, cy0 + 3 - 7 * (kc - 0.5) * 2); X.stroke(); }
        else { X.strokeStyle = now ? ink : mut; X.lineWidth = now ? 2.4 : 1.4; X.beginPath(); X.arc(cx0, cy0, 9, 0, TAU); X.stroke(); }
        T(ctx, X, it, L(46), cy0 + 6, 17, { family: f, weight: now ? 800 : 500, color: done ? mut : ink, align: al, alpha: done ? 0.85 : 1 }); });
      X.restore(); }); };

  /* 294 أمر بالشات — تطبيق محادثة: يكتب «/» وتطلع قائمة اقتراح، الأمر ينكتب حرف حرف (والكيبورد تنط أزراره)، يرسل، الرسالة تطير كبسولة فوق، وسطر حالة بلمعة.
     o: {s, cmd='/teardown', desc='Exploded view, every part labelled', status='Animating with teardown', chip='Product · 7 parts', rate=10, kb=true, out} */
  FX.slashCommand = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), f = fam(o), cmd = o.cmd || '/teardown', rate = o.rate || 10, kbOn = o.kb !== false;
    const ko = o.out != null ? 1 - cOut(pr(t, o.out, o.out + 0.3)) : 1; if (t < s - 0.01 || ko <= ON) return;
    const tType = s + 0.3, nCh = cmd.length, tSend = tType + 0.15 + (nCh - 1) / rate + 0.25, kUp = cOut(pr(t, s + 0.05, s + 0.25)) * (1 - cOut(pr(t, tSend + 0.05, tSend + 0.3)));
    const dk = c.dark, base = dk ? c.bg : mixC(c.inkD, '#000000', 0.25), surf = mixC(base, '#FFFFFF', 0.08), line = mixC(base, '#FFFFFF', 0.16), ink = '#F4F4F5', mut = mixC(base, '#FFFFFF', 0.5);
    X.save(); X.globalAlpha *= ko; X.fillStyle = base; X.fillRect(0, 0, 1080, 1920);
    T(ctx, X, '✳', 50, 120, 34, { family: 'num', color: c.acc, align: 'left' }); X.fillStyle = surf; rr(X, 960, 88, 70, 46, 12); X.fill();
    const kbH = 640, cy = lerp(1720, 1920 - kbH - 170, kUp), typedN = t < tType ? 0 : Math.min(nCh, 1 + Math.floor((t - tType - 0.15) * rate) + (t >= tType + 0.15 ? 0 : 0));
    const cur = t >= tSend ? '' : cmd.slice(0, t < tType ? 0 : Math.max(1, typedN));
    // الرسالة بعد الإرسال
    if (t >= tSend) { const km = cOut(pr(t, tSend, tSend + 0.3)), mx = lerp(80, 1030, km), my = lerp(cy + 70, 230, km), mw = tw(ctx, X, cmd, 28, 700, 'num') + 40;
      X.save(); X.globalAlpha *= cl(km * 2); T(ctx, X, cmd, mx - (km > 0.5 ? 20 : -mw / 2 + 20), my, 28, { family: 'num', weight: 700, color: c.acc, align: km > 0.5 ? 'right' : 'center' }); X.restore();
      const ks = cOut(pr(t, tSend + 0.25, tSend + 0.5)); if (ks > ON) { X.save(); X.globalAlpha *= ks; T(ctx, X, '✳', 60, 320, 28, { family: 'num', color: c.acc, align: 'left' });
        const st = (o.status || ('Animating with ' + cmd.replace('/', ''))) + '…'; T(ctx, X, st, 100, 320, 26, { family: f, weight: 500, color: mut, align: 'left' });
        const sw = tw(ctx, X, st, 26, 500, f), sx = 100 + ((t - tSend) * 400 % (sw + 240)) - 120; X.beginPath(); X.rect(sx, 280, 90, 60); X.clip(); T(ctx, X, st, 100, 320, 26, { family: f, weight: 500, color: ink, align: 'left' }); X.restore(); } }
    // الكومبوزر
    X.fillStyle = surf; rr(X, 40, cy, 1000, 150, 34); X.fill(); X.strokeStyle = line; X.lineWidth = 2; X.stroke();
    if (o.chip !== false && t < tSend) { X.fillStyle = mixC(surf, '#FFFFFF', 0.06); rr(X, 64, cy - 92, 230, 76, 14); X.fill(); X.strokeStyle = line; X.stroke(); T(ctx, X, o.chip || 'Product · 7 parts', 84, cy - 46, 20, { family: f, weight: 600, color: mut, align: 'left', maxWidth: 190 }); }
    T(ctx, X, cur ? cur + (Math.floor(t * 2.4) % 2 ? '' : '|') : 'Reply…', 72, cy + 62, 34, { family: 'num', weight: 600, color: cur ? ink : mut, align: 'left' });
    T(ctx, X, '+', 76, cy + 125, 34, { family: 'num', color: mut, align: 'left' }); X.fillStyle = c.acc; X.beginPath(); X.arc(990, cy + 110, 26 * (t >= tSend - 0.12 && t < tSend ? 0.85 : 1), 0, TAU); X.fill(); T(ctx, X, '↑', 990, cy + 121, 30, { family: 'num', weight: 800, color: c.on });
    // قائمة الاقتراح
    const kp = cOut(pr(t, tType, tType + 0.15)) * (t < tSend ? 1 : 0); if (kp > ON) { X.save(); X.globalAlpha *= kp; X.translate(0, 12 * (1 - kp)); X.fillStyle = mixC(surf, '#FFFFFF', 0.05); rr(X, 40, cy - 200, 1000, 96, 18); X.fill(); X.strokeStyle = line; X.stroke();
      T(ctx, X, cmd, 72, cy - 158, 30, { family: 'num', weight: 700, color: ink, align: 'left' }); T(ctx, X, o.desc || 'Exploded view, every part labelled', 72, cy - 122, 20, { family: f, weight: 500, color: mut, align: 'left' }); X.restore(); }
    // الكيبورد
    if (kbOn && kUp > ON) { const ky = 1920 - kbH * kUp; X.fillStyle = mixC(base, '#FFFFFF', 0.05); X.fillRect(0, ky, 1080, kbH);
      const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'], kw = 96, kh = 120, pressIdx = t >= tType && t < tSend ? Math.floor((t - tType) * rate) : -1, pch = pressIdx >= 0 ? (pressIdx === 0 ? '/' : cmd[pressIdx]) : '', pk = pressIdx >= 0 ? 1 - pr(t, tType + pressIdx / rate, tType + pressIdx / rate + 0.12) : 0;
      rows.forEach((r, ri) => { const x0 = (1080 - r.length * (kw + 10) + 10) / 2; [...r].forEach((ch, j) => { const kx = x0 + j * (kw + 10), kyy = ky + 30 + ri * (kh + 20);
        X.fillStyle = mixC(base, '#FFFFFF', 0.2); rr(X, kx, kyy, kw, kh, 14); X.fill(); T(ctx, X, ch, kx + kw / 2, kyy + 78, 44, { family: 'num', weight: 500, color: ink });
        if (ch === pch && pk > 0) { X.save(); X.globalAlpha *= pk; X.fillStyle = mixC(base, '#FFFFFF', 0.32); rr(X, kx - 20, kyy - 150, kw + 40, 150, 18); X.fill(); T(ctx, X, ch, kx + kw / 2, kyy - 50, 80, { family: 'num', weight: 500, color: ink }); X.restore(); } }); });
      const by = ky + 30 + 3 * (kh + 20); X.fillStyle = mixC(base, '#FFFFFF', 0.12); rr(X, 40, by, 180, kh, 14); X.fill(); rr(X, 240, by, 600, kh, 14); X.fill(); rr(X, 860, by, 180, kh, 14); X.fill();
      T(ctx, X, '123', 130, by + 74, 36, { family: 'num', color: ink }); T(ctx, X, 'space', 540, by + 74, 36, { family: 'num', color: ink }); T(ctx, X, '/', 950, by + 76, 44, { family: 'num', color: ink });
      if (pch === '/' && pk > 0) { X.save(); X.globalAlpha *= pk; X.fillStyle = mixC(base, '#FFFFFF', 0.32); rr(X, 840, by - 150, 220, 150, 18); X.fill(); T(ctx, X, '/', 950, by - 50, 80, { family: 'num', color: ink }); X.restore(); } }
    X.restore(); };

  /* 295 كرت يكبر للشاشة — كرت داخل الواجهة (مشهد A) يكبر لين يغطي الشاشة ويصير المشهد B، والواجهة حوله تختفي.
     o: {s, dur=0.32, A (Y) الواجهة, B (Y) المحتوى, rect:{x,y,w,h,r} مكان الكرت بـA, overshoot=false} */
  FX.cardExpand = (ctx, t, o) => { const { X, P } = ctx, s = pick(o, 's', 0), d = o.dur || 0.32, R = o.rect || { x: 40, y: 600, w: 420, h: 746, r: 24 }, k = ioC(pr(t, s, s + d));
    const A = o.A || (Y => { Y.fillStyle = P.bg; Y.fillRect(0, 0, 1080, 1920); }), B = o.B || fakeSrc(P, 4);
    if (k <= 0) { A(X); X.save(); rr(X, R.x, R.y, R.w, R.h, R.r || 24); X.clip(); X.translate(R.x, R.y); X.scale(R.w / 1080, R.h / 1920); B(X); X.restore(); return; }
    if (k >= 1 && !o.overshoot) { B(X); return; }
    const fa = 1 - cOut(cl(k / 0.6)); if (fa > ON) { X.save(); X.globalAlpha *= fa; A(X); X.restore(); } else { X.fillStyle = '#000000'; X.fillRect(0, 0, 1080, 1920); }
    const os = o.overshoot ? 1 + 0.03 * Math.sin(Math.PI * pr(t, s + d * 0.8, s + d * 1.6)) : 1, x = lerp(R.x, 0, k), y = lerp(R.y, 0, k), w = lerp(R.w, 1080, k) * os, h = lerp(R.h, 1920, k) * os, r = lerp(R.r || 24, 0, k);
    X.save(); shd(X, 40 * (1 - k), 10, 0.35); X.fillStyle = '#000000'; rr(X, x - (os - 1) * 540, y - (os - 1) * 960, w, h, r); X.fill(); noShd(X); X.clip(); X.translate(x - (os - 1) * 540, y - (os - 1) * 960); X.scale(w / 1080, h / 1920); B(X); X.restore(); };

  /* 296 قائمة بخانات جاهزة — الأرقام 1..N ظاهرة من البداية باهتة، ومع كل بند ينقال يطلع اسمه جنب رقمه (قص حاد) والحالي باللون المميز.
     o: {n=10, items:[{label, at}] أو labels:[…] + s + every=1.2, x, y=560, pitch=86, size=52, enter='cut'|'fade', out} */
  FX.slotList = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), f = fam(o), s = pick(o, 's', 0);
    const items = o.items || (o.labels || ['Anime', 'Galaxy', '3D Isometric', 'Liquid Chrome', 'Neon', 'Graffiti', 'Hologram', 'Crystal', 'Steampunk', 'Oil Paint']).map((l, j) => ({ label: l, at: s + 0.3 + j * (o.every || 1.2) }));
    const n = o.n || Math.max(10, items.length), rtl = isAr(items.map(i => i.label).join('')), x = pick(o, 'x', rtl ? 1030 : 50), y = pick(o, 'y', 560), pitch = o.pitch || 86, size = o.size || 52;
    const e = env(t, s, o.out, { din: 0.3 }); if (e.o <= ON) return; const cur = FX.cueIndex(items.map(i => i.at), t);
    withE(X, e, 300, y + pitch * n / 2, () => { for (let i = 0; i < n; i++) { const yy = y + i * pitch, act = i === cur, it = items[i], shown = it && t >= it.at, kf = it ? (o.enter === 'fade' ? cOut(pr(t, it.at, it.at + 0.12)) : 1) : 0;
      T(ctx, X, rtl ? `.${i + 1}` : `${i + 1})`, x, yy, size * 0.8, { family: 'num', weight: 800, color: act ? c.acc : (shown ? c.ink : c.mut), align: rtl ? 'right' : 'left' });
      if (shown && kf > ON) T(ctx, X, it.label, rtl ? x - size * 1.5 : x + size * 1.5, yy, size, { family: f, weight: act ? 800 : 500, color: act ? c.acc : c.ink, align: rtl ? 'right' : 'left', alpha: kf }); } }); };

  /* 297 خانة تعليق تنكتب من جديد — شريط تعليق ثابت («اكتب الكلمة بالتعليقات»)، وكل شوي الكلمة تنمسح حرف حرف وترجع تنكتب بمؤشر.
     o: {s, out, text='Comment {kw} for the full guide' ({kw} = مكان الكلمة), kw='VIDEO', link='Post', every=6, at=2.2 (أول مسح داخل كل دورة), y=1620, w=920} */
  FX.ctaRetype = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), f = fam(o), s = pick(o, 's', 0), kw = String(o.kw || 'VIDEO'), str = o.text || 'Comment {kw} for the full guide', rtl = isAr(str + kw);
    const e = env(t, s, o.out, { din: 0.3 }); if (e.o <= ON) return; const ev = o.every || 6, cyc = ((t - s) % ev + ev) % ev, a0 = pick(o, 'at', 2.2), nk = [...kw].length;
    const tDel = a0, tEmpty = a0 + nk * 0.08, tRe = tEmpty + 0.25, tDone = tRe + nk * 0.12; let shown = nk, editing = false;
    if (t - s >= 0 && cyc >= tDel && cyc < tDone) { editing = true; shown = cyc < tEmpty ? nk - Math.floor((cyc - tDel) / 0.08) : cyc < tRe ? 0 : Math.min(nk, Math.floor((cyc - tRe) / 0.12) + 1); }
    const kwS = [...kw].slice(0, shown).join(''), parts = str.split('{kw}'), y = pick(o, 'y', 1620), w = o.w || 920, h = 96, x0 = 540 - w / 2, size = 38;
    withE(X, e, 540, y + h / 2, () => { X.fillStyle = rgba(c.dark ? c.surf : mixC(c.inkD, c.bg, 0.1), 0.94); rr(X, x0, y, w, h, h / 2); X.fill(); X.strokeStyle = rgba('#FFFFFF', 0.12); X.lineWidth = 2; X.stroke();
      const av = rtl ? x0 + w - 52 : x0 + 52; X.fillStyle = c.mut; X.beginPath(); X.arc(av, y + h / 2, 22, 0, TAU); X.fill(); X.fillStyle = mixC(c.mut, '#FFFFFF', 0.4); X.beginPath(); X.arc(av, y + h / 2 - 5, 8, 0, TAU); X.fill();
      const link = o.link == null ? (rtl ? 'نشر' : 'Post') : o.link, lw = tw(ctx, X, link, 30, 700, f), ink = c.dark ? c.ink : mixC(c.bg, '#FFFFFF', 0.85);
      T(ctx, X, link, rtl ? x0 + 36 + lw / 2 : x0 + w - 36 - lw / 2, y + h / 2 + 11, 30, { family: f, weight: 700, color: mixC(c.acc, ink, 0.25) });
      const W0 = tw(ctx, X, parts[0], size, 800, f), Wk = tw(ctx, X, kw, size, 800, f), W1 = tw(ctx, X, parts[1] || '', size, 800, f), tot = W0 + Wk + W1;
      let cx = rtl ? av - 46 : av + 46; const seg = (txt, ww, col) => { T(ctx, X, txt, rtl ? cx - ww / 2 : cx + ww / 2, y + h / 2 + 13, size, { family: f, weight: 800, color: col }); cx += rtl ? -ww : ww; };
      seg(parts[0], W0, ink); const kx = cx, kws = tw(ctx, X, kwS, size, 800, f);
      T(ctx, X, kwS, rtl ? kx - kws / 2 : kx + kws / 2, y + h / 2 + 13, size, { family: f, weight: 800, color: c.acc });
      if (editing && Math.floor(t * 4) % 2 === 0) { X.fillStyle = ink; X.fillRect(rtl ? kx - kws - 4 : kx + kws + 2, y + 24, 3, h - 48); }
      cx += rtl ? -Wk : Wk; seg(parts[1] || '', W1, ink); }); };

  /* 298 عنوان يكبر سطر سطر — العنوان فوق ويزيد سطر مع كل جملة (السطر الجديد يطلع من الضباب، والقديم ما يتحرك). الأحجام تتناوب كبير/صغير.
     o: {lines:[{text, at, size, color:'ink'|'acc'|'pale'}], y=200, x=540, gap=14, person (Y) = السطور ورا القصّ, out} */
  FX.headlineAccrue = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), f = fam(o), s = pick(o, 's', 0);
    const lines = o.lines || [{ text: '14K NEW FOLLOWERS', at: s }, { text: '1 REEL', at: s + 1.2, color: 'pale' }, { text: '6 STEPS', at: s + 2.4, size: 64 }];
    let y = pick(o, 'y', 200); const sh = { color: 'rgba(0,0,0,.35)', blur: 18, y: 6 };
    lines.forEach((L, i) => { const size = L.size || (i % 2 ? 140 : 110), col = L.color === 'acc' ? c.acc : L.color === 'pale' ? mixC(c.acc, '#FFFFFF', 0.6) : L.color === 'mut' ? c.mut : '#FFFFFF';
      y += size * 0.9; const e = env(t, pick(L, 'at', s + i), o.out, { din: 0.25, bIn: 12, yIn: 16, sIn: 0.96 }); const yy = y;
      withE(X, e, 540, yy - size * 0.35, () => T(ctx, X, L.text, pick(o, 'x', 540), yy, size, { family: f, weight: 900, color: col, shadow: sh, maxWidth: 1000 })); y += size * 0.34 + pick(o, 'gap', 14); });
    if (typeof o.person === 'function') o.person(X); };

  /* 299 كرت الخطوة — قطع لخلفية متدرّجة من اللون المميز بملمس ورق مجعّد، جوال كبير يصغر للنص وفوقه «STEP N» ينزل، وسطر صغير ينبني كلمة كلمة (كلمة بخط مختلف).
     o: {s, out, n=1, label='STEP' (أو 'الخطوة'), sub='post less content', script (كلمة بخط ثاني), clip (Y)=>{} أو img = داخل الجوال, overFootage=false (العنوان بس فوق o.draw)} */
  const crumple = (key, P) => { const { c, Y } = off('crumple_' + key, 270, 480); let img = null; try { img = Y.createImageData ? Y.createImageData(270, 480) : null; } catch (e) { img = null; } if (!img || !img.data) return null;
    const D = img.data; for (let y = 0; y < 480; y++) for (let x = 0; x < 270; x++) { const n1 = fbm(x * 0.025, y * 0.025, 3), n2 = fbm(x * 0.06 + 9, y * 0.06, 8), ridge = Math.abs(n2 - 0.5) * 2;
      const v = 128 + (n1 - 0.5) * 90 + (0.5 - ridge) * 50 + (Math.abs(((x + y * 0.6) * 0.03) % 1 - 0.5) < 0.01 ? -20 : 0), i = (y * 270 + x) * 4; D[i] = D[i + 1] = D[i + 2] = cl(v, 0, 255); D[i + 3] = 255; }
    Y.putImageData(img, 0, 0); return c; };
  FX.stepCard = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), f = fam(o), s = pick(o, 's', 0), z = o.out; if (t < s || (z != null && t >= z)) { if (o.overFootage && o.draw) o.draw(X); return; }
    const ar = isAr((o.label || '') + (o.sub || '')), label = (o.label || (ar ? 'الخطوة' : 'STEP')) + ' ' + pick(o, 'n', 1);
    if (o.overFootage) { if (o.draw) o.draw(X); } else {
      const g = X.createLinearGradient(0, 0, 1080, 1920); g.addColorStop(0, mixC(c.acc, '#FFFFFF', 0.45)); g.addColorStop(1, mixC(c.acc2, '#FFFFFF', 0.62)); X.fillStyle = g; X.fillRect(0, 0, 1080, 1920);
      const cr = crumple('a', P); if (cr) { X.save(); X.globalCompositeOperation = 'multiply'; X.globalAlpha = 0.18; X.drawImage(cr, 0, 0, 1080, 1920); X.globalCompositeOperation = 'screen'; X.globalAlpha = 0.1; X.drawImage(cr, 0, 0, 1080, 1920); X.restore(); }
      const vg = X.createRadialGradient(540, 960, 500, 540, 960, 1300); vg.addColorStop(0, rgba('#000000', 0)); vg.addColorStop(1, rgba('#000000', 0.15)); X.fillStyle = vg; X.fillRect(0, 0, 1080, 1920);
      const kz = ioC(pr(t, s, s + 0.4)), sc = lerp(1.15, 0.8, kz), cy = lerp(960, 1120, kz), pw = 600, ph = 1220; X.save(); X.translate(540, cy); X.scale(sc, sc); shd(X, 60, 30, 0.35);
      X.fillStyle = '#0A0A0A'; rr(X, -pw / 2, -ph / 2, pw, ph, 80); X.fill(); noShd(X); X.save(); rr(X, -pw / 2 + 16, -ph / 2 + 16, pw - 32, ph - 32, 66); X.clip();
      if (!drawSrc(ctx, X, o.clip || o.img, -pw / 2 + 16, -ph / 2 + 16, pw - 32, ph - 32)) drawSrc(ctx, X, fakeSrc(P, 9), -pw / 2 + 16, -ph / 2 + 16, pw - 32, ph - 32); X.restore();
      X.fillStyle = '#0A0A0A'; rr(X, -90, -ph / 2 + 30, 180, 44, 22); X.fill(); X.restore(); }
    const kt = cOut(pr(t, s + 0.2, s + 0.5)); if (kt > ON) T(ctx, X, label, 540, 300 - 30 * (1 - kt), 120, { family: f, weight: 900, color: '#FFFFFF', alpha: kt, shadow: { color: 'rgba(0,0,0,.25)', blur: 16, y: 6 } });
    if (o.sub) { const ws = String(o.sub).split(/\s+/), n = ws.length, shownN = Math.min(n, Math.floor((t - s - 0.5) / 0.25) + 1); if (shownN > 0) {
      const sc2 = o.script ? String(o.script) : null, part = ws.slice(0, shownN), sz = 54, Wd = part.map(w => tw(ctx, X, w, w === sc2 ? sz * 1.15 : sz, 700, w === sc2 ? 'Aref Ruqaa' : f)), sp = 16, tot = Wd.reduce((a, b) => a + b, 0) + sp * (part.length - 1);
      let cx = ar ? 540 + tot / 2 : 540 - tot / 2; part.forEach((w, j) => { const ww = Wd[j], x = ar ? cx - ww / 2 : cx + ww / 2; T(ctx, X, w, x, 390, w === sc2 ? sz * 1.15 : sz, { family: w === sc2 ? 'Aref Ruqaa' : f, weight: 700, color: '#FFFFFF', shadow: { color: 'rgba(0,0,0,.2)', blur: 10, y: 3 } }); cx += (ar ? -1 : 1) * (ww + sp); }); } } };

  /* 300 مثال بإطار وملاحظة — كليب مثال 9:16 صغير يطلع فوق، وتحته ملاحظة بخط اليد تنكتب، وسهم مرسوم باليد يأشّر عليه (يرجف شوي).
     o: {s, out, clip (Y) أو img, note='who you are', x=540, y=140, w=324, loopArrow=false} */
  FX.pipNote = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), w = o.w || 324, h = w * 16 / 9, cx = pick(o, 'x', 540), y = pick(o, 'y', 140), note = o.note || 'who you are', ar = isAr(note);
    const kc = bOut(pr(t, s, s + 0.3), 1.5), ko = o.out != null ? 1 - cOut(pr(t, o.out, o.out + 0.25)) : 1; if (kc <= ON || ko <= ON) return;
    X.save(); X.globalAlpha *= ko; X.save(); X.translate(cx, y + h / 2); X.scale(lerp(0.85, 1, kc), lerp(0.85, 1, kc)); X.globalAlpha *= cl(kc * 2); shd(X, 18, 8, 0.3); X.fillStyle = '#000000'; rr(X, -w / 2, -h / 2, w, h, 6); X.fill(); noShd(X);
    X.save(); rr(X, -w / 2, -h / 2, w, h, 6); X.clip(); if (!drawSrc(ctx, X, o.clip || o.img, -w / 2, -h / 2, w, h)) drawSrc(ctx, X, fakeSrc(P, 11), -w / 2, -h / 2, w, h); X.restore(); X.restore();
    const ny = y + h + 90, nk = pr(t, s + 0.3, s + 0.3 + [...note].length * 0.04), nw = tw(ctx, X, note, 46, 400, 'Aref Ruqaa');
    if (nk > 0) { X.save(); X.beginPath(); if (ar) X.rect(cx + nw / 2 + 10 - (nw + 20) * nk, ny - 60, (nw + 20) * nk, 90); else X.rect(cx - nw / 2 - 10, ny - 60, (nw + 20) * nk, 90); X.clip();
      T(ctx, X, note, cx, ny, 46, { family: 'Aref Ruqaa', weight: 400, color: '#FFFFFF', shadow: { color: 'rgba(0,0,0,.4)', blur: 8, y: 2 } }); X.restore(); }
    const ka = cOut(pr(t, s + 0.35, s + 0.65)); if (ka > ON) { const jit = Math.floor(t * 10), jx = i => (h2(i, jit) - 0.5) * 3;
      X.strokeStyle = '#FFFFFF'; X.lineWidth = 4; X.lineCap = 'round'; X.lineJoin = 'round';
      if (o.loopArrow) { X.beginPath(); const R = w * 0.75; for (let i = 0; i <= 40 * ka; i++) { const a = -Math.PI * 0.5 + i / 40 * TAU * 0.85, rx = R + jx(i), px = cx + Math.cos(a) * rx, py = y + h / 2 + Math.sin(a) * rx * 1.6; i ? X.lineTo(px, py) : X.moveTo(px, py); } X.stroke(); }
      else { const sx = ar ? cx + nw / 2 + 30 : cx - nw / 2 - 30, sy = ny - 20, ex = cx + (ar ? w / 2 - 10 : -w / 2 + 10) * 0.8, ey = y + h + 14, mx = sx + (ar ? 40 : -40), my = (sy + ey) / 2;
        const pts = []; for (let i = 0; i <= 20; i++) { const u = i / 20 * ka, a1 = (1 - u) * (1 - u), b1 = 2 * u * (1 - u), c1 = u * u; pts.push([a1 * sx + b1 * mx + c1 * ex + jx(i), a1 * sy + b1 * my + c1 * ey + jx(i + 50)]); }
        X.beginPath(); pts.forEach((p, i) => (i ? X.lineTo(p[0], p[1]) : X.moveTo(p[0], p[1]))); X.stroke();
        if (ka > 0.95) { const p1 = pts[pts.length - 1], p0 = pts[pts.length - 3], an = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]); X.beginPath(); X.moveTo(p1[0] - Math.cos(an - 0.5) * 22, p1[1] - Math.sin(an - 0.5) * 22); X.lineTo(p1[0], p1[1]); X.lineTo(p1[0] - Math.cos(an + 0.5) * 22, p1[1] - Math.sin(an + 0.5) * 22); X.stroke(); } } }
    X.restore(); };

  /* 301 أربع نسخ مرايا — الإطار ينقسم 2×2 وكل خانة نفس الفيديو مقلوب/معكوس مثل المشكال (الوجوه تتجه للنص)، ويدخل من غباش.
     o: {s, out, draw (Y)=>{} المصدر, dim=0.15 (تغميق النص عشان الكلام يبين)} */
  FX.mirrorQuad = (ctx, t, o) => { const { X, P } = ctx, s = pick(o, 's', 0), src = o.draw || fakeSrc(P, 5); if (t < s || (o.out != null && t >= o.out)) { src(X); return; }
    const k = cOut(pr(t, s, s + 0.4)), { c: fc, Y } = off('mquad', 540, 960); Y.save(); Y.scale(0.5, 0.5); src(Y); Y.restore();
    X.fillStyle = ctx.P.bg; X.fillRect(0, 0, 1080, 1920); X.save(); if (k < 1) X.filter = `blur(${(30 * (1 - k)).toFixed(1)}px)`;
    [[0, 0, -1, -1], [540, 0, 1, -1], [0, 960, 1, 1], [540, 960, -1, 1]].forEach(([x, y, sx, sy]) => { X.save(); X.beginPath(); X.rect(x, y, 540, 960); X.clip(); X.translate(x + 270, y + 480); const sc = lerp(0.9, 1, k); X.scale(sx * sc, sy * sc); X.drawImage(fc, -270, -480, 540, 960); X.restore(); });
    X.restore(); const dm = pick(o, 'dim', 0.15) * k; if (dm > 0) { const g = X.createRadialGradient(540, 960, 50, 540, 960, 700); g.addColorStop(0, rgba('#000000', dm)); g.addColorStop(1, rgba('#000000', 0)); X.fillStyle = g; X.fillRect(0, 0, 1080, 1920); } };

  /* 302 قائمة إثبات — صور حسابات بدواير وتحت كل وحدة كبسولة اسم، وجنبها شارة «+500K» تعدّ، تطلع وحدة ورا وحدة (أسماء وصور من عندك، بلاها حروف أولى).
     o: {s, out, items:[{img, name, delta:'+500K'}], x=640, y=520, gap=230, size=150, every=0.3} */
  FX.proofAvatars = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), f = fam(o), s = pick(o, 's', 0), ev = o.every || 0.3, size = o.size || 190;
    const items = o.items || [{ name: 'creator.one', delta: '+500K' }, { name: 'maker.two', delta: '+100K' }, { name: 'studio.three', delta: '+35K' }], x = pick(o, 'x', 600), y0 = pick(o, 'y', 520), gap = o.gap || 290;
    const ko = o.out != null ? 1 - cOut(pr(t, o.out, o.out + 0.25)) : 1; if (ko <= ON) return; X.save(); X.globalAlpha *= ko;
    items.forEach((it, i) => { const t0 = s + i * ev, ka = bOut(pr(t, t0, t0 + 0.25), 1.8); if (ka <= ON) return; const y = y0 + i * gap; X.save(); X.translate(x, y); X.scale(ka, ka);
      shd(X, 16, 6, 0.3); X.fillStyle = '#FFFFFF'; X.beginPath(); X.arc(0, 0, size / 2 + 5, 0, TAU); X.fill(); noShd(X); X.save(); X.beginPath(); X.arc(0, 0, size / 2, 0, TAU); X.clip();
      const im = imgOf(ctx, it.img); if (im) drawCover(X, im, -size / 2, -size / 2, size, size); else { const g = X.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2); g.addColorStop(0, hueRot(c.acc, i * 40)); g.addColorStop(1, mixC(hueRot(c.acc, i * 40), c.inkD, 0.4)); X.fillStyle = g; X.fillRect(-size / 2, -size / 2, size, size);
        T(ctx, X, String(it.name || '?').replace(/^@/, '').slice(0, 1).toUpperCase(), 0, size * 0.18, size * 0.5, { family: f, weight: 800, color: '#FFFFFF' }); } X.restore();
      const nm = String(it.name || ''), nw = tw(ctx, X, nm, 28, 700, 'num') + 56; X.fillStyle = '#FFFFFF'; rr(X, -nw / 2, size / 2 + 12, nw, 46, 23); X.fill();
      T(ctx, X, nm, -10, size / 2 + 45, 28, { family: 'num', weight: 700, color: '#151515' }); X.fillStyle = c.acc; X.beginPath(); X.arc(nw / 2 - 22, size / 2 + 35, 7, 0, TAU); X.fill(); X.restore();
      const kb = pr(t, t0 + 0.1, t0 + 0.6); if (kb > 0) { const m = /^([^\d]*)([\d.,]+)(.*)$/.exec(String(it.delta || '+0')), num = m ? parseFloat(m[2].replace(/,/g, '')) : 0, dec = m && m[2].includes('.') ? 1 : 0, val = (m ? m[1] : '') + (num * eOut(kb)).toFixed(dec) + (m ? m[3] : '');
        T(ctx, X, val, x + size / 2 + 30, y + 22, 64, { family: 'num', weight: 800, color: '#FFFFFF', align: 'left', alpha: cl(kb * 4), shadow: { color: 'rgba(0,0,0,.4)', blur: 12, y: 3 } }); } });
    X.restore(); };

  /* 303 مسطرة قياس — خط أبعاد تحت عنصر يتمدد، بأطراف قائمة ورقم «+235px» يعدّ مع العرض. لو أعطيته o.text يرسم الكلمة نفسها تتمدد بالكشيدة.
     o: {s, dur=0.9, text (كلمة تتمدد) | target:{x,y,w,h} (ثابت أو دالة t أو o.track), stretch=260, base, unit='px', y=1000, size=150, lead, out} */
  FX.measureRuler = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), f = fam(o), s = pick(o, 's', 0), d = o.dur || 0.9, k = ioC(pr(t, s, s + d)), e = env(t, s - 0.4, o.out, { din: 0.3 }); if (e.o <= ON) return;
    let box = FX.placeAt(o, t, 'target', null) || FX.placeAt(o, t, 'box', null), base = o.base; const y = pick(o, 'y', 1000), size = o.size || 150;
    withE(X, e, 540, y, () => { if (o.lead) T(ctx, X, o.lead, 540, y - size * 1.1, 50, { family: f, weight: 700, color: c.ink });
      if (o.text) { const w0 = tw(ctx, X, o.text, size, 900, f), W = w0 + pick(o, 'stretch', 260) * k; base = base == null ? w0 : base;
        if (ctx.text.drawKashida && isAr(o.text)) ctx.text.drawKashida(X, o.text, 540, y, w0 + pick(o, 'stretch', 260), { family: f, weight: 900, size, color: c.ink }, k);
        else T(ctx, X, o.text, 540, y, size, { family: f, weight: 900, color: c.ink, scaleX: W / w0 }); box = { x: 540 - W / 2, y: y - size * 0.8, w: W, h: size }; }
      if (!box) return; box = Array.isArray(box) ? { x: box[0], y: box[1], w: box[2], h: box[3] } : box; base = base == null ? box.w : base;
      const ka = cOut(pr(t, s, s + 0.15)) * (1 - cOut(pr(t, s + d + 0.4, s + d + 0.7))); if (ka <= ON) return;
      const ly = box.y + box.h + 34; X.save(); X.globalAlpha *= ka; X.strokeStyle = c.acc; X.lineWidth = 3; X.beginPath(); X.moveTo(box.x, ly); X.lineTo(box.x + box.w, ly); X.moveTo(box.x, ly - 12); X.lineTo(box.x, ly + 12); X.moveTo(box.x + box.w, ly - 12); X.lineTo(box.x + box.w, ly + 12); X.stroke();
      const dv = Math.round(box.w - base); T(ctx, X, (dv >= 0 ? '+' : '') + dv + (o.unit || 'px'), box.x + box.w / 2, ly + 44, 32, { family: 'num', weight: 700, color: c.acc }); X.restore(); }); };

  /* 304 شريط اللقطات — بطاقات لقطات بديلة (نفس المشهد بألوان مختلفة) تنزلق فوق على قوس، مؤشر ماوس يختار وحدة فتكبر بحلقة والباقي يخفت، وبعدين الشريط يطلع.
     o: {s, out (افتراضي s+1.6), takes:[(Y)=>{} | img], draw (Y) = مصدر واحد بدرجات مختلفة, n=5, pick=2, y=110} */
  FX.takeStrip = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), z = pick(o, 'out', s + 1.6), n = (o.takes || []).length || o.n || 5, pk = pick(o, 'pick', 2), y = pick(o, 'y', 110);
    if (t < s || t > z + 0.4) return; const cw = 170, ch = 214, gap = 18, tot = n * cw + (n - 1) * gap, x0 = 540 - tot / 2, kup = cIn(pr(t, z, z + 0.3)), tc = s + 0.85;
    for (let i = 0; i < n; i++) { const ki = bOut(pr(t, s + i * 0.05, s + 0.35 + i * 0.05), 1.4); if (ki <= ON) continue; const cx = x0 + i * (cw + gap) + cw / 2 + 700 * (1 - ki), cy = y + ch / 2 + 30 * Math.pow((i - (n - 1) / 2) / n, 2) * 4 - 340 * kup;
      const chosen = i === pk && t >= tc, kc = cOut(pr(t, tc, tc + 0.2)), sc = chosen ? 1 + 0.1 * kc : 1, al = t >= tc && i !== pk ? 1 - 0.6 * kc : 1;
      X.save(); X.globalAlpha *= al; X.translate(cx, cy); X.rotate((h2(i, 3) - 0.5) * 0.2); X.scale(sc, sc); shd(X, 18, 8, 0.35); X.fillStyle = '#FFFFFF'; rr(X, -cw / 2 - 5, -ch / 2 - 5, cw + 10, ch + 10, 12); X.fill(); noShd(X);
      X.save(); rr(X, -cw / 2, -ch / 2, cw, ch, 9); X.clip(); const tk = o.takes && o.takes[i]; if (!drawSrc(ctx, X, tk, -cw / 2, -ch / 2, cw, ch)) { drawSrc(ctx, X, o.draw || fakeSrc(P, 6), -cw / 2, -ch / 2, cw, ch); X.globalCompositeOperation = 'soft-light'; X.fillStyle = hueRot(c.acc, i * 60); X.globalAlpha = 0.6; X.fillRect(-cw / 2, -ch / 2, cw, ch); } X.restore();
      if (chosen) { X.strokeStyle = c.acc; X.lineWidth = 6; rr(X, -cw / 2 - 8, -ch / 2 - 8, cw + 16, ch + 16, 14); X.stroke(); } X.restore(); }
    const km = ioC(pr(t, s + 0.45, s + 0.8)); if (t < z) { const px = lerp(980, x0 + pk * (cw + gap) + cw * 0.65, km), py = lerp(520, y + ch * 0.7, km), press = t >= tc - 0.05 && t < tc + 0.12 ? 0.85 : 1;
      X.save(); X.translate(px, py); X.scale(press, press); shd(X, 8, 3, 0.4); X.fillStyle = '#FFFFFF'; X.beginPath(); X.moveTo(0, 0); X.lineTo(0, 46); X.lineTo(12, 35); X.lineTo(22, 56); X.lineTo(30, 52); X.lineTo(20, 32); X.lineTo(36, 32); X.closePath(); X.fill(); noShd(X); X.strokeStyle = '#111111'; X.lineWidth = 2.5; X.stroke(); X.restore();
      const kr = pr(t, tc, tc + 0.4); if (kr > 0 && kr < 1) { X.strokeStyle = rgba(c.acc, 1 - kr); X.lineWidth = 4; X.beginPath(); X.arc(px, py, 10 + 50 * kr, 0, TAU); X.stroke(); } } };

  /* 305 قطعة ليزر — خط ضوء مايل يعبر الإطار، وبعدين المشهد ينقسم على الخط والنصين ينفصلون ويكشفون المشهد الجاي.
     o: {s, dur=0.45, A (Y), B (Y), angle=-30 (درجة), color=P.acc} */
  FX.laserSlice = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), d = o.dur || 0.45, A = o.A || fakeSrc(P, 1), B = o.B || fakeSrc(P, 8);
    if (t < s) { A(X); return; } if (t >= s + d) { B(X); return; } const a = (pick(o, 'angle', -30)) * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx, L = 2400;
    const k1 = pr(t, s, s + d * 0.3), k2 = cIn(pr(t, s + d * 0.3, s + d)), sep = 1300 * k2;
    B(X); [1, -1].forEach(sg => { X.save(); X.translate(nx * sep * sg, ny * sep * sg); X.beginPath(); X.moveTo(540 - dx * L, 960 - dy * L); X.lineTo(540 + dx * L, 960 + dy * L); X.lineTo(540 + dx * L + nx * L * sg, 960 + dy * L + ny * L * sg); X.lineTo(540 - dx * L + nx * L * sg, 960 - dy * L + ny * L * sg); X.closePath(); X.clip(); A(X);
      if (k2 > 0) { X.strokeStyle = rgba(mixC(c.acc, '#FFFFFF', 0.6), 0.9); X.lineWidth = 3; X.beginPath(); X.moveTo(540 - dx * L, 960 - dy * L); X.lineTo(540 + dx * L, 960 + dy * L); X.stroke(); } X.restore(); });
    const ext = lerp(-1, 1, k1), la = k2 > 0 ? 1 - k2 : 1; X.save(); X.globalCompositeOperation = 'lighter'; X.globalAlpha = la; X.lineCap = 'round';
    const x1 = 540 - dx * 1300, y1 = 960 - dy * 1300, x2 = 540 + dx * 1300 * ext, y2 = 960 + dy * 1300 * ext;
    [[40, 0.18], [16, 0.45], [5, 1]].forEach(([lw, al]) => { X.strokeStyle = lw < 6 ? mixC(c.acc, '#FFFFFF', 0.7) : rgba(c.acc, al); X.lineWidth = lw; X.beginPath(); X.moveTo(x1, y1); X.lineTo(x2, y2); X.stroke(); });
    if (k1 < 1) { const g = X.createRadialGradient(x2, y2, 0, x2, y2, 60); g.addColorStop(0, rgba('#FFFFFF', 0.95)); g.addColorStop(1, rgba(c.acc, 0)); X.fillStyle = g; X.beginPath(); X.arc(x2, y2, 60, 0, TAU); X.fill(); } X.restore(); };

  /* 306 شخص من حروف — الموضوع يصير شبكة حروف (كثافة الحبر حسب الإضاءة) على خلفية غامقة، والحروف تتبدّل كل كم فريم.
     o: {s, out, draw (Y) المصدر, person (Y) اختياري (الخلفية تبقى غامقة), cell=14, ramp=' .:-=+*#%@' (أو حروف عربية), tint=P.acc, invert=false (للموضوع الغامق)} */
  FX.asciiSubject = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), src = o.draw || fakeSrc(P, 2); if (t < s || (o.out != null && t >= o.out)) { src(X); return; }
    const cell = o.cell || 14, gw = Math.round(1080 / cell), gh = Math.round(1920 / cell), subj = typeof o.person === 'function' ? o.person : src, smp = sample('ascii_src', subj, gw, gh, ctx);
    const ramp = [...(o.ramp || ' .:-=+*#%@')], bg = mixC(c.inkD, '#000000', 0.7); X.fillStyle = bg; X.fillRect(0, 0, 1080, 1920); if (!smp.d) return;
    const D = smp.d, shuf = Math.floor(t * 10), ka = cOut(pr(t, s, s + 0.1)); X.save(); X.globalAlpha *= ka; X.font = ctx.font('num', 700, Math.round(cell * 1.05)); X.textAlign = 'center'; X.textBaseline = 'middle';
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) { const i = (y * gw + x) * 4; if (D[i + 3] < 30) continue; let l = (0.2126 * D[i] + 0.7152 * D[i + 1] + 0.0722 * D[i + 2]) / 255; if (o.invert) l = 1 - l; if (l < 0.06) continue;
      const gi = cl(Math.round(l * (ramp.length - 1) + (h2(x * 31 + y, shuf) - 0.5) * 1.2), 1, ramp.length - 1); X.fillStyle = l > 0.82 ? mixC(c.acc, '#FFFFFF', 0.3) : mixC(bg, '#FFFFFF', 0.25 + 0.75 * l); X.fillText(ramp[gi], x * cell + cell / 2, y * cell + cell / 2); }
    X.restore(); };
})();
