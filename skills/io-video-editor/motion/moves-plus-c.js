/* ═══ moves-plus-c.js — بنك الحركات 201–232 (I/O Studio) ═══
   نفس عقد motion/moves.js: كل حركة = FX.<اسم>(ctx, t, o) ترسم على ctx.X بإحداثيات التصميم (1080×1920)، كل خاصية من t (بلا تراكم ولا Math.random).
   o.s = بداية الحركة · o.out = بداية الطلعة (اختياري) · الألوان من ctx.P إلا لو مرّرت غيرها.
   الانتقالات تاخذ o.A و o.B (دوال ترسم الإطار كامل) · الكاميرا والمظاهر تاخذ o.draw (Y) => {...} · القصّ o.person · الوجه o.face (مثل 85/86).
   الكتالوج: motion/moves/catalog-plus-c.json · المعاينات: previews/201–232.mp4 (motion/moves/render-preview-c.js) · الشرح: references/reel-studio-visuals.md
   ⚠ الكلمات العربية تتحرك ككلمات كاملة — والكشيدة (U+0640) تنحط بس بوصلة صالحة (kSlots تحت)، فالكلمة ما تنكسر.

   مصدر الأفكار (201–227): Reel Studio — MIT License, Copyright (c) 2026 Mohamed Abdou — https://github.com/mohamedabdou-ai/reel-studio
   المنطق منقول ومكتوب من جديد على محرّك الكانفس (لا React ولا Remotion): مواضع الكشيدة وأولوياتها (engine/src/arabic/kashida.ts)، شريحة الكشيدة المتمددة
   (arabic-type/moves/kashida-stretch.tsx)، الانتقالات (core/transitions-v4/*)، كاميرا المشهد (core/camera.ts · organic.ts)، المظاهر والخلفيات (looks/*)،
   الوثائقي (maps/* · styles/documentary)، حوالين المتكلم (styles/layered-speaker)، شاشة الإثبات (creative-kit/proof-screen)، ومفاهيم الموشن (motion-concepts/*).
   بيانات الخريطة (MENA تحت): Natural Earth 5.1.1 — ملك عام (public domain)، بوجهة نظر فلسطين (فلسطين دولة)، مبسّطة ومقصوصة لمنطقتنا من world.json حق Reel Studio.
   228–232 ستايل «لقطة» (سؤال يومي): تصميم أصلي بكودنا مستوحى من شكل حساب lagta.studio — بلا أي صورة أو ملف منهم. */
(function () {
  const G = typeof window !== 'undefined' ? window : globalThis;
  const FX = (G.FX = G.FX || {});
  const TAU = Math.PI * 2, ON = 0.01;
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const pr = (t, a, b) => cl((t - a) / (b - a));
  const lerp = (a, b, k) => a + (b - a) * k;
  const pick = (o, k, d) => (o[k] === undefined ? d : o[k]);
  const sst = k => { k = cl(k); return k * k * (3 - 2 * k); };
  const ioC = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const oC = k => 1 - Math.pow(1 - cl(k), 3);
  const bez = (x1, y1, x2, y2) => k => { if (k <= 0) return 0; if (k >= 1) return 1; let lo = 0, hi = 1, u = k; for (let i = 0; i < 22; i++) { u = (lo + hi) / 2; const x = 3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u; if (x < k) lo = u; else hi = u; } return 3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u; };
  const h2 = (a, b) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const rnd = (i, s) => h2(i * 31 + 7, s * 7919 + 101);
  const n1 = (x, sd) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(h2(i, sd), h2(i + 1, sd), u) * 2 - 1; };
  const vn2 = (x, y, sd) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = h2(xi * 57 + yi * 131, sd), b = h2((xi + 1) * 57 + yi * 131, sd), c = h2(xi * 57 + (yi + 1) * 131, sd), d = h2((xi + 1) * 57 + (yi + 1) * 131, sd); return lerp(lerp(a, b, u), lerp(c, d, u), v); };
  const hexRGB = h => { const c = String(h || '#000').replace('#', ''), f = c.length === 3 ? c.split('').map(x => x + x).join('') : c; return [0, 2, 4].map(j => parseInt(f.slice(j, j + 2), 16) || 0); };
  const rgba = (h, a) => { if (!/^#/.test(String(h))) return h; const [r, g, b] = hexRGB(h); return `rgba(${r},${g},${b},${a})`; };
  const mixC = (a, b, k) => { const A = hexRGB(a), B = hexRGB(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], cl(k))).toString(16).padStart(2, '0')).join(''); };
  const lum = h => { const c = hexRGB(h); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const darker = (a, b) => (lum(a) <= lum(b) ? a : b);
  const lighter = (a, b) => (lum(a) >= lum(b) ? a : b);
  const onAcc = P => P.onAcc || '#FFFFFF';
  const shd = (X, b, y, a, x) => { X.shadowColor = 'rgba(0,0,0,' + (a == null ? 0.25 : a) + ')'; X.shadowBlur = b; X.shadowOffsetY = y; X.shadowOffsetX = x || 0; };
  const noShd = X => { X.shadowColor = 'transparent'; X.shadowBlur = 0; X.shadowOffsetY = 0; X.shadowOffsetX = 0; };
  const fout = (ctx, t, o, d = 0.45) => (o.out != null ? ctx.at(t, o.out, o.out + d, 'cubicIn') : 0);
  const mOf = X => Math.hypot(X.getTransform().a, X.getTransform().b) || 1;
  const offC = (X, slot) => {
    const me = FX['_c' + slot] || (FX['_c' + slot] = { c: document.createElement('canvas') }), c = me.c;
    if (c.width !== X.canvas.width || c.height !== X.canvas.height) { c.width = X.canvas.width; c.height = X.canvas.height; }
    const Y = c.getContext('2d'); Y.setTransform(1, 0, 0, 1, 0, 0); Y.globalAlpha = 1; Y.globalCompositeOperation = 'source-over'; Y.filter = 'none';
    Y.clearRect(0, 0, c.width, c.height); Y.setTransform(X.getTransform()); return { c, Y };
  };
  const lay = (X, slot, fn) => { const C = offC(X, slot); C.Y.save(); fn(C.Y); C.Y.restore(); return C.c; };
  const putC = (X, c, a) => { X.save(); X.setTransform(1, 0, 0, 1, 0, 0); if (a != null) X.globalAlpha *= a; X.drawImage(c, 0, 0); X.restore(); };
  // جزء من لقطة (إحداثيات تصميم) لمستطيل وجهة (إحداثيات تصميم) — تحويل X تحجيم وإزاحة بس
  const part = (X, c, sx, sy, sw, sh, dx, dy, dw, dh) => {
    const m = X.getTransform(); if (sw <= 0 || sh <= 0 || dw === 0 || dh === 0) return;
    X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
    X.drawImage(c, m.a * sx + m.e, m.d * sy + m.f, m.a * sw, m.d * sh, m.a * dx + m.e, m.d * dy + m.f, m.a * dw, m.d * dh); X.restore();
  };
  const poly = (X, pts) => { X.beginPath(); pts.forEach((p, i) => (i ? X.lineTo(p[0], p[1]) : X.moveTo(p[0], p[1]))); X.closePath(); };
  const hasP = o => typeof o.person === 'function' && (typeof o.person.ok === 'function' ? !!o.person.ok() : true);
  const faceOf = (o, t, def) => {
    let f = typeof o.face === 'function' ? o.face(t) : o.face; if (!f) f = def; if (!f) return null;
    if (Array.isArray(f)) f = { x: f[0] - 150, y: f[1] - 185, w: 300, h: 370 };
    return { x: f.x, y: f.y, w: f.w, h: f.h, cx: f.x + f.w / 2, cy: f.y + f.h / 2 };
  };
  const textW = (ctx, X, str, fam, w, size) => { X.save(); X.font = ctx.font(fam, w, size); const v = X.measureText(str).width; X.restore(); return v; };
  const fitSize = (ctx, X, str, fam, w, size, maxW) => { const v = textW(ctx, X, str, fam, w, size); return v > maxW ? size * maxW / v : size; };
  // صورة/فيديو داخل مستطيل (cover، الوجه على ثلث الطول)
  const fitIn = (X, R, rad, draw) => { X.save(); X.beginPath(); X.roundRect(R.x, R.y, R.w, R.h, rad || 0); X.clip();
    const sc = Math.max(R.w / 1080, R.h / 1920); X.translate(R.x + R.w / 2, R.y + R.h * 0.4); X.scale(sc, sc); X.translate(-540, -1920 * 0.4); draw(X); X.restore(); };
  const tinted = (src, color, key) => { const me = src._tint || (src._tint = {}); if (me[key || color]) return me[key || color];
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const Y = c.getContext('2d'); Y.drawImage(src, 0, 0);
    Y.globalCompositeOperation = 'source-in'; Y.fillStyle = color; Y.fillRect(0, 0, c.width, c.height); return (me[key || color] = c); };
  // ملمس ورق ثابت (يتولّد مرة) — ألياف وبقع خفيفة، رمادي فاتح حول 90%
  const paperTex = () => { if (FX._cPaper) return FX._cPaper; const c = document.createElement('canvas'); c.width = 540; c.height = 960; const Y = c.getContext('2d'), im = Y.createImageData(540, 960), d = im.data;
    for (let y = 0; y < 960; y++) for (let x = 0; x < 540; x++) { const f = 0.5 * vn2(x / 90, y / 90, 3) + 0.3 * vn2(x / 22, y / 22, 5) + 0.2 * vn2(x / 5, y / 1.6, 7), sp = vn2(x / 40, y / 40, 11) > 0.83 ? 0.06 : 0;
      const v = Math.round(255 * (0.83 + 0.17 * f - sp)), i = (y * 540 + x) * 4; d[i] = v; d[i + 1] = v - 2; d[i + 2] = v - 7; d[i + 3] = 255; }
    Y.putImageData(im, 0, 0); return (FX._cPaper = c); };
  const grainTex = () => { if (FX._cGrain) return FX._cGrain; const c = document.createElement('canvas'); c.width = 256; c.height = 256; const Y = c.getContext('2d'), im = Y.createImageData(256, 256), d = im.data;
    for (let i = 0; i < 65536; i++) { const v = Math.round(255 * h2(i, 77)); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; } Y.putImageData(im, 0, 0); return (FX._cGrain = c); };
  const grainOver = (X, t, a, cell) => { const g = grainTex(), ph = Math.floor(t * 12); X.save(); X.globalAlpha *= a; X.globalCompositeOperation = 'multiply'; X.imageSmoothingEnabled = false;
    const s = cell || 2, ox = -Math.floor(h2(ph, 1) * 256) * s, oy = -Math.floor(h2(ph, 2) * 256) * s; for (let y = oy; y < 1920; y += 256 * s) for (let x = ox; x < 1080; x += 256 * s) X.drawImage(g, x, y, 256 * s, 256 * s); X.restore(); };

  /* ══════════ الكشيدة: المواضع الصالحة (منقولة من Reel Studio — arabic/kashida.ts، MIT) ══════════
     الكشيدة تنحط بعد حرف يوصل لقدّام وقبل حرف يستقبل الوصل؛ ممنوع بعد ا أ إ آ د ذ ر ز و ؤ ة ء ى، وداخل «لا»، وبأول/آخر الكلمة، وبكلمة أقل من 3 حروف.
     الأولوية: +3 بعد س ش ص ض، +2 لو الحرف الجاي هو الأخير، −1 لو الأخير من ب ت ث ن ي ئ؛ والتعادل للأقرب لنص الكلمة. التشكيل يبقى مع حرفه. */
  const RJ = [[0x622, 0x625], [0x627, 0x627], [0x629, 0x629], [0x62f, 0x632], [0x648, 0x649], [0x671, 0x673], [0x675, 0x677], [0x688, 0x699], [0x6c0, 0x6c0], [0x6c3, 0x6cb], [0x6cd, 0x6cd], [0x6cf, 0x6cf], [0x6d2, 0x6d3], [0x6d5, 0x6d5]];
  const TR = [[0x610, 0x61a], [0x64b, 0x65f], [0x670, 0x670], [0x6d6, 0x6dc], [0x6df, 0x6e4], [0x6e7, 0x6e8], [0x6ea, 0x6ed], [0x200e, 0x200f]];
  const inR = (c, R) => R.some(([a, b]) => c >= a && c <= b);
  const jt = c => (c === 0x640 || c === 0x200d ? 'C' : inR(c, TR) ? 'T' : inR(c, RJ) ? 'R' : c === 0x621 ? 'U' : (c >= 0x620 && c <= 0x64a) || (c >= 0x66e && c <= 0x6d3) ? 'D' : 'U');
  const SEEN = new Set([0x633, 0x634, 0x635, 0x636]), WEAK = new Set([0x628, 0x62a, 0x62b, 0x646, 0x64a, 0x626, 0x6cc]), ALEF = new Set([0x627, 0x623, 0x625, 0x622, 0x671]);
  const kSlots = w => {   // مؤشرات (نحط الكشيدة بعد w[i]) — الأحسن أول
    const runs = []; let run = []; const flush = () => { if (run.length) runs.push(run); run = []; };
    for (let i = 0; i < w.length;) { const c = w.charCodeAt(i), ty = jt(c);
      if (ty === 'R' || ty === 'D' || c === 0x621) { let end = i, j = i + 1; while (j < w.length) { const t2 = jt(w.charCodeAt(j)); if (t2 === 'T' || t2 === 'C') { end = j; j++; } else break; }
        run.push({ c, on: ty === 'D', acc: ty === 'R' || ty === 'D', end }); i = j; }
      else { flush(); i++; } }
    flush(); const R = [];
    runs.forEach(r => { const n = r.length; if (n < 3) return; const last = r[n - 1];
      for (let i = 0; i < n - 1; i++) { const a = r[i], b = r[i + 1]; if (!a.on || !b.acc) continue; if (a.c === 0x644 && ALEF.has(b.c)) continue;
        let p = 0; if (SEEN.has(a.c)) p += 3; if (i + 1 === n - 1) { p += 2; if (WEAK.has(last.c)) p -= 1; } R.push({ i: a.end, p, d: Math.abs(i + 1 - n / 2) }); } });
    R.sort((a, b) => b.p - a.p || a.d - b.d || a.i - b.i); return R.map(r => r.i);
  };
  FX.kashidaSlots = kSlots;   // للاستعمال من مشاهدك (نفس القاعدة)
  // الكلمة مرسومة بيضا بـn كشيدة بأحسن موضع + مكان شريط الكشيدة (إحداثيات تصميم من يسار الكانفس). null لو ما فيه موضع صالح.
  const kGlyph = (ctx, X, word, fam, wgt, size) => {
    const m = Math.min(3, mOf(X) * 1.0), key = word + '|' + fam + '|' + wgt + '|' + size + '|' + m, me = FX._cKG || (FX._cKG = {});
    if (me[key] !== undefined) return me[key];
    const slots = kSlots(word); if (!slots.length) return (me[key] = null);
    const at = slots[0] + 1, pre = word.slice(0, at), suf = word.slice(at), n = 24, font = ctx.font(fam, wgt, size);
    X.save(); X.font = font; const k = X.measureText('ا' + 'ـــ' + 'ا').width - X.measureText('ا' + 'ــ' + 'ا').width;
    const full = pre + 'ـ'.repeat(n) + suf, W = X.measureText(full).width, Wp = X.measureText(pre + 'ـ').width - k, Wn = X.measureText(word).width; X.restore();
    if (!(k > 0)) return (me[key] = null);
    const pad = size * 0.4, cw = W + pad * 2, ch = size * 2.2, base = size * 1.35, c = document.createElement('canvas');
    c.width = Math.ceil(cw * m); c.height = Math.ceil(ch * m); const Y = c.getContext('2d'); Y.scale(m, m); Y.font = font; Y.direction = 'rtl'; Y.textAlign = 'right'; Y.fillStyle = '#FFFFFF'; Y.fillText(full, pad + W, base);
    const barR = pad + W - Wp, barL = barR - n * k;
    return (me[key] = { c, m, cw, ch, base, pad, W, Wn, b0: barL + 3, b1: barR - 3, mid: (barL + barR) / 2, rest: Math.max(1, size * 0.04) });
  };
  // يرسم الكلمة متمددة: يمينها عند xr، الشريط الظاهر L (تصميم). يرجّع العرض المرسوم
  const kDraw = (X, G, xr, yBase, L, color, alpha) => {
    const img = tinted(G.c, color), m = G.m, lw = G.b0, rw = G.cw - G.b1, x0 = xr - (rw - G.pad) - L - lw, y0 = yBase - G.base;
    X.save(); if (alpha != null) X.globalAlpha *= alpha;
    X.drawImage(img, 0, 0, G.b0 * m, G.c.height, x0, y0, lw, G.ch);
    X.drawImage(img, (G.mid - 1) * m, 0, 2 * m, G.c.height, x0 + lw - 0.5, y0, L + 1, G.ch);
    X.drawImage(img, G.b1 * m, 0, rw * m, G.c.height, x0 + lw + L, y0, rw, G.ch); X.restore();
    return lw + L + rw - 2 * G.pad;
  };
  const kWidth = (G, L) => G.b0 + L + (G.cw - G.b1) - 2 * G.pad;
  FX.kashidaGlyph = kGlyph; FX.kashidaDraw = kDraw;

  /* ══════════ أ) حركات العناوين العربية ══════════ */

  /* 201 كشيدة حية — السطر ثابت، ولحظة نطق الكلمة المهمة تتمدد على وصلة حروفها (كشيدة حقيقية بموضع صالح) ثم ترجع، والكلمات اللي حولها تنزاح تفسح لها والسطر ما ينكسر.
     تنفع عنوان أو كابشن. o: {text, word (رقمها؛ افتراضي أطول كلمة تقبل كشيدة), at (وقت نطقها — ctx.wordTime)، line (لو فيه صوت: الكلمات تطلع على أوقاتها و at يجي منه),
        s, x=540, y=1000, size=130, family='display', maxWidth=940, extra (أقصى تمدد بالبكسل)، hold=.8, step=.16, color, accent, underline=true, out} */
  FX.kashidaLive = (ctx, t, o) => {
    const { X, P, at } = ctx, fam = o.family || 'display', wgt = fam === 'display' ? 400 : (o.weight || 800), x = pick(o, 'x', 540), y = pick(o, 'y', 1000), maxW = o.maxWidth || 940;
    const words = ctx.text.westernDigits(o.text).trim().split(/\s+/), n = words.length; if (t < o.s) return;
    let size = o.size || 130; const gapK = 0.28;
    const natural = s => { X.save(); X.font = ctx.font(fam, wgt, s); const v = words.reduce((a, w) => a + X.measureText(w).width, 0) + s * gapK * (n - 1); X.restore(); return v; };
    const nw = natural(size); if (nw > maxW * 0.86) size *= maxW * 0.86 / nw;
    let wi = o.word; if (wi == null) { let best = -1; words.forEach((w, i) => { if (kSlots(w).length && w.length > best) { best = w.length; wi = i; } }); }
    const Gk = wi != null ? kGlyph(ctx, X, words[wi], fam, wgt, size) : null;
    const tw = o.line != null ? (i => ctx.wordTime(o.line, i).s) : (i => o.s + i * pick(o, 'step', 0.16));
    const tAt = o.at != null ? o.at : (o.line != null && wi != null ? ctx.wordTime(o.line, wi).s : o.s + 0.7), hold = pick(o, 'hold', 0.8);
    const k = at(t, tAt, tAt + 0.5, 'expoInOut') * (1 - at(t, tAt + 0.5 + hold, tAt + 1.15 + hold, 'expoInOut'));
    X.save(); X.font = ctx.font(fam, wgt, size); const ws = words.map(w => X.measureText(w).width); X.restore();
    const gap = size * gapK, rest = Gk ? Gk.rest : 0;
    const totalRest = ws.reduce((a, v, i) => a + (i === wi && Gk ? kWidth(Gk, rest) : v), 0) + gap * (n - 1);
    const extra = Math.max(0, o.extra != null ? o.extra : Math.min(size * 3.2, maxW - totalRest)), L = rest + extra * k;
    const total = totalRest + extra * k, ko = fout(ctx, t, o);
    let xr = x + total / 2;
    X.save(); X.globalAlpha *= 1 - ko;
    words.forEach((w, i) => {
      const a = at(t, tw(i) - 0.04, tw(i) + 0.22, 'backOut'), isK = i === wi, wv = isK && Gk ? kWidth(Gk, L) : ws[i];
      if (a > ON) {
        const col = isK && (k > 0 || o.accentAlways !== false) ? (o.accent || P.acc) : (o.color || P.ink), cx = xr - wv / 2, sc = 0.82 + 0.18 * a;
        X.save(); X.globalAlpha *= cl(a * 2); X.translate(cx, y); X.scale(sc, sc); X.translate(-cx, -y);
        if (isK && Gk) kDraw(X, Gk, xr, y, L, col);
        else if (isK) { const p = 1 + 0.18 * Math.sin(Math.PI * k); X.translate(cx, y); X.scale(p, p); X.translate(-cx, -y); ctx.text(X, w, xr, y, { family: fam, weight: wgt, size, align: 'right', color: col }); }
        else ctx.text(X, w, xr, y, { family: fam, weight: wgt, size, align: 'right', color: col });
        X.restore();
        if (isK && Gk && o.underline !== false && k > ON) { X.fillStyle = o.accent || P.acc; X.globalAlpha *= cl(k * 3); const ux = xr - (Gk.cw - Gk.b1 - Gk.pad) - L - Gk.b0 + Gk.b0; X.beginPath(); X.roundRect(ux, y + size * 0.42, L, size * 0.06, size * 0.03); X.fill(); X.globalAlpha = 1 - ko; }
      }
      xr -= wv + gap;
    });
    X.restore();
  };

  /* 202 ختم يحجب الكلمة — السطر يطلع، وعلى وقت كل كلمة محجوبة شريط حبر خشن ينمد عليها من اليمين لليسار، وبعد آخر شريط ختم «محذوف» ينطبع مايل برجّة.
     عكس 73 (اللي يكشف). o: {text, hide:[أرقام الكلمات], at:[أوقات] (أو every=.5 بعد s+.6), stamp='محذوف' (null بلا ختم), s, x=540, y=960, size=120, out} */
  FX.stampHide = (ctx, t, o) => {
    const { X, P, E, at } = ctx; if (t < o.s) return;
    const x = pick(o, 'x', 540), y = pick(o, 'y', 960), str = ctx.text.westernDigits(o.text), size = fitSize(ctx, X, str, 'display', 400, o.size || 120, o.maxWidth || 900);
    const L = ctx.text.layout(X, str, { family: 'display', weight: 400, size, maxWidth: o.maxWidth || 900, lineHeight: 1.3 });
    const ko = fout(ctx, t, o), hide = o.hide || [1], ev = pick(o, 'every', 0.5), ink = darker(P.ink, P.bg), tH = j => (o.at && o.at[j] != null ? o.at[j] : o.s + 0.6 + j * ev);
    const a0 = at(t, o.s, o.s + 0.35, 'cubicOut');
    X.save(); X.globalAlpha *= 1 - ko;
    const B = ctx.text.drawLayout(X, L, x, y, { color: o.color || P.ink, perWord: () => ({ alpha: a0, dy: (1 - a0) * 30 }) });
    hide.forEach((wi, j) => { const b = B[wi]; if (!b) return; const ts = tH(j), k = E.expoOut(pr(t, ts, ts + 0.3)); if (k <= 0) return;
      const w = (b.w + 24) * k, h = size * 0.78, r = b.x + b.w + 12, yy = b.y + size * 0.62;
      X.save(); X.translate(r, yy); X.rotate((rnd(wi, 9) - 0.5) * 0.05); X.fillStyle = ink; X.beginPath(); X.moveTo(0, -h / 2);
      for (let q = 1; q <= 8; q++) X.lineTo(-w * q / 8, -h / 2 + (rnd(wi, q) - 0.5) * 7);
      for (let q = 8; q >= 0; q--) X.lineTo(-w * q / 8, h / 2 + (rnd(q, wi + 3) - 0.5) * 7); X.closePath(); X.fill(); X.restore(); });
    const ts = tH(hide.length - 1) + 0.5;
    if (o.stamp !== null && t >= ts) { const f = pr(t, ts, ts + 0.25), sc = lerp(1.7, 1, E.backOut(f)), sh = t > ts + 0.25 ? 6 * Math.sin(TAU * 14 * (t - ts - 0.25)) * (1 - pr(t, ts + 0.25, ts + 0.5)) : 0;
      const s = o.stamp || 'محذوف', fs = 104, last = B[B.length - 1] || { y }, sy = Math.max(...B.map(b => b.y)) + size * 1.8;
      X.save(); X.globalAlpha *= cl(f * 2); X.translate(x + sh + 120, sy); X.rotate(-0.14); X.scale(sc, sc);
      X.font = ctx.font('display', 400, fs); const w = X.measureText(s).width + 70, h = fs * 1.5; X.strokeStyle = P.acc; X.lineWidth = 7; X.beginPath(); X.roundRect(-w / 2, -h / 2, w, h, 14); X.stroke();
      X.lineWidth = 3; X.beginPath(); X.roundRect(-w / 2 + 12, -h / 2 + 12, w - 24, h - 24, 8); X.stroke();
      ctx.text(X, s, 0, fs * 0.34, { family: 'display', size: fs, color: P.acc }); X.restore(); void last; }
    X.restore();
  };

  /* ══════════ ب) انتقالات (Reel Studio v4) — o: {s, dur, A, B} ══════════ */

  /* 203 ثقب المفتاح — B يطلع من فتحة على شكل ثقب مفتاح تكبر من نقطة لين تغطي الشاشة، بحافة بلون الهوية. o: {s, dur=.9, A, B, at=[540,900]} */
  FX.keyhole = (ctx, t, o) => {
    const { X, P, E } = ctx, k = pr(t, o.s, o.s + (o.dur || 0.9)), c = o.at || [540, 900];
    if (k <= 0) { o.A(X); return; } if (k >= 1) { o.B(X); return; }
    o.A(X); const r = 2600 * Math.pow(k, 2.6) + 40 * E.backOut(cl(k * 5));
    const path = Y => { Y.beginPath(); Y.arc(c[0], c[1] - r * 0.28, r * 0.42, Math.PI * 0.72, Math.PI * 2.28); Y.lineTo(c[0] + r * 0.3, c[1] + r * 0.7); Y.lineTo(c[0] - r * 0.3, c[1] + r * 0.7); Y.closePath(); };
    X.save(); path(X); X.clip(); const z = 1.2 - 0.2 * E.cubicOut(k); X.translate(c[0], c[1]); X.scale(z, z); X.translate(-c[0], -c[1]); o.B(X); X.restore();
    X.save(); path(X); X.strokeStyle = o.ring || P.acc; X.lineWidth = 14 * (1 - k) + 2; X.stroke(); X.restore();
  };

  /* 204 لوح حبر — لوح حبر غامق بحافة لون الهوية يمسح الشاشة من اليمين لليسار بسرعة، ووراه يطلع المشهد الجديد. o: {s, dur=.5, A, B, slab=560, ink, edge} */
  FX.inkSlab = (ctx, t, o) => {
    const { X, P } = ctx, k = pr(t, o.s, o.s + (o.dur || 0.5)); if (k <= 0) { o.A(X); return; } if (k >= 1) { o.B(X); return; }
    const p = bez(0.7, 0, 0.25, 1)(k), SW = o.slab || 560, lead = 1120 - 1680 * p, trail = lead + SW;
    X.save(); X.beginPath(); X.rect(-10, 0, Math.max(0, lead) + 10, 1920); X.clip(); o.A(X); X.restore();
    X.save(); X.beginPath(); X.rect(trail, 0, 1200, 1920); X.clip(); o.B(X); X.restore();
    const ink = o.ink || darker(P.ink, '#14181F'); X.fillStyle = ink; X.fillRect(lead + 34, 0, SW - 34, 1920);
    X.save(); X.beginPath(); X.rect(lead + 34, 0, SW - 34, 1920); X.clip(); X.globalAlpha = 0.5; grainOver(X, t, 0.35, 3); X.restore();
    X.fillStyle = o.edge || P.acc; X.fillRect(lead, 0, 34, 1920);
  };

  /* 205 سحب الورقة — المشهد القديم ورقة تنسحب لفوق وتميل شوي، وحافتها التحتية ممزقة بظل، وتكشف الجديد تحتها. o: {s, dur=.6, A, B, paper} */
  FX.paperPull = (ctx, t, o) => {
    const { X, P } = ctx, q = pr(t, o.s, o.s + (o.dur || 0.6)); if (q <= 0) { o.A(X); return; } if (q >= 1) { o.B(X); return; }
    const e = bez(0.55, 0.04, 0.3, 1)(q), dy = -e * (1920 + 220), rot = -4 * e * Math.PI / 180;
    o.B(X); X.fillStyle = `rgba(26,14,6,${(0.3 * (1 - e)).toFixed(3)})`; X.fillRect(0, 0, 1080, 1920);
    const torn = (y0, amp, sd) => { const pts = []; for (let x = -60; x <= 1140; x += 12) pts.push([x, y0 + (rnd(x, sd) - 0.5) * amp * 2 + Math.sin(x / 1080 * 11 + sd) * amp * 0.55]); return pts; };
    X.save(); X.translate(324, 1920); X.translate(0, dy); X.rotate(rot); X.translate(-324, -1920);
    const g = X.createLinearGradient(0, 1940, 0, 2150); g.addColorStop(0, 'rgba(26,14,6,0.34)'); g.addColorStop(1, 'rgba(26,14,6,0)'); X.fillStyle = g; X.fillRect(-60, 1930, 1200, 220);
    const e1 = torn(1920 + 30, 5, 91), e2 = torn(1920 + 18, 6, 77);
    X.fillStyle = '#FBF8F0'; poly(X, [[-60, 1800], [1140, 1800], ...e1.slice().reverse()]); X.fill();
    X.fillStyle = o.paper || '#F4EDE1'; poly(X, [[-60, 1800], [1140, 1800], ...e2.slice().reverse()]); X.fill();
    X.save(); poly(X, [[-60, -40], [1140, -40], ...e2.slice().reverse()]); X.clip(); o.A(X); X.restore();
    X.restore();
  };

  /* 206 قلب صفحة مجلة — المشهد القديم صفحة تنقلب على مفصلها بمنظور ثلاثي الأبعاد (افتراضياً مفصل يمين = اتجاه الكتاب العربي)، ظل يطيح على الجديد. o: {s, dur=.75, A, B, hinge='right'|'left'} */
  FX.magazineFlip = (ctx, t, o) => {
    const { X } = ctx, k = pr(t, o.s, o.s + (o.dur || 0.75)); if (k <= 0) { o.A(X); return; } if (k >= 1) { o.B(X); return; }
    const right = (o.hinge || 'right') === 'right', ang = (1 - Math.cos(Math.PI * k)) / 2 * 92 * Math.PI / 180, PP = 2200, sh = Math.sin(Math.min(ang, Math.PI / 2));
    const proj = u => ({ x: u * Math.cos(ang) * PP / (PP + u * Math.sin(ang)), s: PP / (PP + u * Math.sin(ang)) });
    const edge = ang >= Math.PI / 2 ? 0 : proj(1080).x;
    o.B(X);
    const cf = 1 - cl((k - 0.78) / 0.22), g = right ? X.createLinearGradient(1080, 0, 1080 - edge - 90, 0) : X.createLinearGradient(0, 0, edge + 90, 0);
    g.addColorStop(0, `rgba(20,12,4,${0.34 * sh * cf})`); g.addColorStop(cl(edge / (edge + 90)), `rgba(20,12,4,${0.34 * sh * cf})`); g.addColorStop(1, 'rgba(20,12,4,0)'); X.fillStyle = g; X.fillRect(0, 0, 1080, 1920);
    if (ang >= Math.PI / 2) return;
    const A = lay(X, 'mfA', o.A), N = 60;
    for (let i = 0; i < N; i++) { const u0 = 1080 * i / N, u1 = 1080 * (i + 1) / N, p0 = proj(u0), p1 = proj(u1), sm = (p0.s + p1.s) / 2, hh = 1920 * sm;
      const sx = right ? 1080 - u1 : u0, dx = right ? 1080 - p1.x : p0.x, dw = Math.abs(p1.x - p0.x) + 0.6;
      part(X, A, sx, 0, 1080 / N, 1920, dx, 960 - hh / 2, dw, hh); }
    X.save(); X.globalAlpha = 0.62 * sh; const gg = right ? X.createLinearGradient(1080, 0, 1080 - edge, 0) : X.createLinearGradient(0, 0, edge, 0);
    gg.addColorStop(0, 'rgba(0,0,0,1)'); gg.addColorStop(1, 'rgba(0,0,0,0.48)'); X.fillStyle = gg;
    const he = 1920 * proj(1080).s; poly(X, right ? [[1080, 0], [1080 - edge, 960 - he / 2], [1080 - edge, 960 + he / 2], [1080, 1920]] : [[0, 0], [edge, 960 - he / 2], [edge, 960 + he / 2], [0, 1920]]); X.fill(); X.restore();
    X.fillStyle = `rgba(255,236,200,${0.55 * (1 - 0.4 * sh)})`; X.fillRect(right ? 1080 - edge - 1.5 : edge - 1.5, 960 - he / 2, 3, he);
  };

  /* 207 تبديل الورقة — ورقة ملوّنة ضخمة بحواف مقصوصة وشريط لاصق تعبر الشاشة من اليمين لليسار، تغطيها كلها بالنص وتكشف الجديد. o: {s, dur=.6, A, B, color} */
  FX.paperSwap = (ctx, t, o) => {
    const { X, P } = ctx, k = pr(t, o.s, o.s + (o.dur || 0.6)); if (k <= 0) { o.A(X); return; } if (k >= 1) { o.B(X); return; }
    const q = ioC(k), PW = 1560, PH = 2500, cx = 540 + (1 - 2 * q) * 1560, rot = 5.5 * (1 - 2 * q) * Math.PI / 180, col = o.color || mixC(P.ink, P.acc, 0.3);
    (q < 0.5 ? o.A : o.B)(X);
    X.save(); X.translate(cx, 960); X.rotate(rot); X.translate(-PW / 2, -PH / 2);
    const pts = []; const cut = (x0, y0, x1, y1, sd) => { for (let i = 0; i < 26; i++) { const u = i / 26, j = (rnd(i, sd) - 0.5) * 22; pts.push([lerp(x0, x1, u) + (y0 === y1 ? 0 : j), lerp(y0, y1, u) + (y0 === y1 ? j : 0)]); } };
    cut(0, 0, PW, 0, 1); cut(PW, 0, PW, PH, 2); cut(PW, PH, 0, PH, 3); cut(0, PH, 0, 0, 4);
    shd(X, 70, 8, 0.42); X.fillStyle = col; poly(X, pts); X.fill(); noShd(X);
    X.save(); poly(X, pts); X.clip(); X.globalAlpha = 0.18; X.strokeStyle = '#FFFFFF'; X.lineWidth = 2; for (let y = 40; y < PH; y += 46) { X.beginPath(); X.moveTo(0, y); X.lineTo(PW, y + 14); X.stroke(); } X.restore();
    X.strokeStyle = mixC(col, '#FFFFFF', 0.5); X.lineWidth = 3; poly(X, pts); X.stroke();
    [[430, 1010, -24], [1150, 1500, -18]].forEach(([x, y, r]) => { X.save(); X.translate(x, y); X.rotate(r * Math.PI / 180); X.fillStyle = 'rgba(246,240,220,0.82)'; X.fillRect(-115, -32, 230, 64);
      X.fillStyle = 'rgba(0,0,0,0.06)'; for (let i = -115; i < 115; i += 18) X.fillRect(i, -32, 6, 64); X.restore(); });
    X.restore();
  };

  /* 208 ستارة بكسلات — مربعات صغيرة بلون الخلفية تتكوّن لين تغطي الشاشة، ثم تتفكك مربع مربع وتكشف الجديد. o: {s, dur=.9, A, B, color, cols=24} */
  FX.pixelCurtain = (ctx, t, o) => {
    const { X, P } = ctx, k = pr(t, o.s, o.s + (o.dur || 0.9)); if (k <= 0) { o.A(X); return; } if (k >= 1) { o.B(X); return; }
    (k < 0.5 ? o.A : o.B)(X);
    const cols = o.cols || 24, rows = Math.round(cols * 1920 / 1080), cw = 1080 / cols, ch = 1920 / rows, cov = k <= 0.5 ? k * 2 : 2 - k * 2, fe = 0.1;
    X.fillStyle = o.color || P.bg;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const th = rnd(r * 97 + c, 7) * (1 - fe), g = cl((cov - th) / fe); if (g <= 0) continue;
      const s = g >= 1 ? 1 : g; X.fillRect(c * cw + cw * (1 - s) / 2 - 0.5, r * ch + ch * (1 - s) / 2 - 0.5, cw * s + 1, ch * s + 1); }
  };

  /* ══════════ ج) كاميرا المشهد — للإطار كامل أو لنص الرسوم بالمشهد المقسوم ══════════ */

  /* 209 كاميرا المشهد — أربع حركات من Reel Studio بقوة soft/normal/strong: snap (ضربة زوم على لحظة وترجع) · orbit (دوران بمنظور ثلاثي الأبعاد) · dolly (اقتراب بطيء) · handheld (كاميرا باليد).
     تشتغل على area (مستطيل نص الرسوم مثلاً {x:0,y:0,w:1080,h:960}) وتكبّر بالقدر اللي يغطي المستطيل بلا حواف. o: {draw, move='snap', strength='normal', s, end (dolly/orbit), at (snap), area, seed} */
  const cover3d = (ry, w, h, PP) => { if (Math.abs(ry) < 1e-6) return 1; const ok = s => { const hw = w / 2 * s, hh = h / 2 * s, f = u => PP / (PP - u * Math.sin(ry) * -1);
      const xL = -hw * Math.cos(ry) * f(-hw), xR = hw * Math.cos(ry) * f(hw), hL = hh * f(-hw), hR = hh * f(hw); return xL <= -w / 2 && xR >= w / 2 && Math.min(hL, hR) >= h / 2; };
    let lo = 1, hi = 2; for (let i = 0; i < 28; i++) { const m = (lo + hi) / 2; if (ok(m)) hi = m; else lo = m; } return hi + 0.002; };
  FX.sceneCam = (ctx, t, o) => {
    const { X } = ctx, A = o.area || { x: 0, y: 0, w: 1080, h: 1920 }, st = o.strength || 'normal', mv = o.move || 'snap', cx = A.x + A.w / 2, cy = A.y + A.h / 2;
    const end = o.end != null ? o.end : o.s + 3, p = pr(t, o.s, end);
    let sc = 1, dx = 0, dy = 0, rot = 0, ry = 0;
    if (mv === 'snap') { const pk = { soft: 0.05, normal: 0.1, strong: 0.18 }[st], u = t - (o.at != null ? o.at : o.s); let e = 0;
      if (u > 0) e = u < 0.14 ? pk * oC(u / 0.14) : u < 0.44 ? pk : u < 1.34 ? pk * (1 - ioC((u - 0.44) / 0.9)) : 0; sc = 1 + e; }
    else if (mv === 'dolly') sc = 1 + { soft: 0.04, normal: 0.08, strong: 0.14 }[st] * sst(p);
    else if (mv === 'orbit') { ry = { soft: 3, normal: 5, strong: 8 }[st] * (2 * sst(p) - 1) * Math.PI / 180; sc = cover3d(ry, A.w, A.h, 1800); }
    else if (mv === 'handheld') { const H = { soft: [3, 4, 0.12, 0.003, 3.2], normal: [8, 10, 0.35, 0.006, 1.6], strong: [18, 26, 0.9, 0.012, 0.95] }[st], sd = o.seed || 3, f = t / H[4];
      const nn = (x, s2) => 0.6 * n1(x, s2) + 0.3 * n1(x * 2.1, s2 + 9) + 0.1 * n1(x * 4.3, s2 + 17);
      dx = H[0] * nn(f, sd); dy = H[1] * nn(f, sd + 31); rot = H[2] * nn(f * 0.8, sd + 57) * Math.PI / 180;
      sc = (1 + H[3] * Math.sin(TAU * t / (H[4] * 2.6))) * (Math.cos(Math.abs(rot)) + Math.max(A.w / A.h, A.h / A.w) * Math.sin(Math.abs(rot))) + 2 * Math.max(Math.abs(dx) / A.w, Math.abs(dy) / A.h); }
    X.save(); X.beginPath(); X.rect(A.x, A.y, A.w, A.h); X.clip();
    if (!ry) { X.translate(cx + dx, cy + dy); if (rot) X.rotate(rot); X.scale(sc, sc); X.translate(-cx, -cy); o.draw(X); X.restore(); return; }
    const C = lay(X, 'cam', o.draw), N = 48, PP = 1800;
    for (let i = 0; i < N; i++) { const u0 = (-A.w / 2 + A.w * i / N) * sc, u1 = u0 + A.w * sc / N, f0 = PP / (PP + u0 * Math.sin(ry)), f1 = PP / (PP + u1 * Math.sin(ry)),
      x0 = cx + u0 * Math.cos(ry) * f0, x1 = cx + u1 * Math.cos(ry) * f1, hh = A.h * sc * (f0 + f1) / 2;
      part(X, C, A.x + A.w * i / N, A.y, A.w / N, A.h, x0, cy - hh / 2, x1 - x0 + 0.6, hh); }
    X.restore();
  };

  /* ══════════ د) مظاهر للفيديو كله (الكابشن ينرسم بعدها فيبقى واضح) وخلفيات للعناوين ══════════
     المظهر يعالج o.draw بس (الصورة)؛ ارسم الكابشن والعناوين بعد النداء. معالجة بكسلات بنص الدقة (540×960) — رخيصة كفاية للرندر. */
  const lookBuf = (X, slot, draw, w, h) => { const me = FX['_cL' + slot] || (FX['_cL' + slot] = { c: document.createElement('canvas') }), c = me.c; if (c.width !== w) { c.width = w; c.height = h; }
    const Y = me.Y || (me.Y = c.getContext('2d', { willReadFrequently: true })); Y.setTransform(w / 1080, 0, 0, h / 1920, 0, 0); Y.globalAlpha = 1; Y.globalCompositeOperation = 'source-over'; Y.filter = 'none';
    Y.fillStyle = '#808080'; Y.fillRect(0, 0, 1080, 1920); Y.save(); draw(Y); Y.restore(); return { c, Y }; };
  const lookIn = (ctx, t, o) => { const ki = o.s != null ? ctx.at(t, o.s, o.s + (o.fade || 0.4)) : 1, ko = fout(ctx, t, o, o.fade || 0.4); return cl(ki * (1 - ko) * (o.amount == null ? 1 : o.amount)); };

  /* 210 طباعة ريزو — الصورة تنفصل لحبرين (افتراضي أزرق ووردي فسفوري) بحبيبات طباعة وانزياح تسجيل خفيف، مطبوعة على ورق دافي.
     o: {draw, inks=['#2D5BA8','#F0568C'], paper='#F2EADB', s, out, amount=1, fade=.4} */
  FX.risoLook = (ctx, t, o) => {
    const { X } = ctx, a = lookIn(ctx, t, o); o.draw(X); if (a <= ON) return;
    const W = 540, H = 960, src = lookBuf(X, 'riso', o.draw, W, H), id = src.Y.getImageData(0, 0, W, H), d = id.data;
    const inks = o.inks || ['#2D5BA8', '#F0568C'], paper = hexRGB(o.paper || '#F2EADB'), I1 = hexRGB(inks[0]).map(v => 1 - v / 255), I2 = hexRGB(inks[1]).map(v => 1 - v / 255);
    const a11 = I1[0] * I1[0] + I1[1] * I1[1] + I1[2] * I1[2], a22 = I2[0] * I2[0] + I2[1] * I2[1] + I2[2] * I2[2], a12 = I1[0] * I2[0] + I1[1] * I2[1] + I1[2] * I2[2], det = a11 * a22 - a12 * a12 || 1;
    const c1 = new Float32Array(W * H), c2 = new Float32Array(W * H), ph = Math.floor(t * 8), gx = Math.floor(h2(ph, 3) * 97), gy = Math.floor(h2(ph, 4) * 97);
    for (let i = 0, p = 0; p < W * H; p++, i += 4) { const r = 1 - d[i] / 255, g = 1 - d[i + 1] / 255, b = 1 - d[i + 2] / 255, b1 = r * I1[0] + g * I1[1] + b * I1[2], b2 = r * I2[0] + g * I2[1] + b * I2[2];
      let u = (a22 * b1 - a12 * b2) / det, v = (a11 * b2 - a12 * b1) / det; u = u * 1.3 - 0.12; v = v * 1.3 - 0.12;
      const x = p % W, y = (p / W) | 0, nz = h2(((x >> 1) + gx) * 7 + ((y >> 1) + gy) * 1931, 5), nz2 = h2(((x >> 1) + gy) * 13 + ((y >> 1) + gx) * 977, 6);
      c1[p] = 0.95 / (1 + Math.exp(-14 * (0.7 * cl(u) + 0.3 * nz - 0.5))); c2[p] = 0.95 / (1 + Math.exp(-14 * (0.7 * cl(v) + 0.3 * nz2 - 0.5))); }
    for (let p = 0, i = 0; p < W * H; p++, i += 4) { const x = p % W, y = (p / W) | 0, q1 = cl(y - 1, 0, H - 1) * W + cl(x + 1, 0, W - 1), q2 = cl(y + 1, 0, H - 1) * W + cl(x - 1, 0, W - 1), k1 = c1[q1], k2 = c2[q2];
      const fib = 1 - 0.07 * vn2(x / 9, y / 9, 8);
      d[i] = paper[0] * (1 - k1 * I1[0]) * (1 - k2 * I2[0]) * fib; d[i + 1] = paper[1] * (1 - k1 * I1[1]) * (1 - k2 * I2[1]) * fib; d[i + 2] = paper[2] * (1 - k1 * I1[2]) * (1 - k2 * I2[2]) * fib; d[i + 3] = 255; }
    src.Y.putImageData(id, 0, 0); X.save(); X.globalAlpha *= a; X.drawImage(src.c, 0, 0, 1080, 1920); X.restore();
  };

  /* 211 بلوبرنت — الصورة تصير مخطط أزرق: الإضاءة بين أزرق غامق وفاتح، وخطوط بيضاء على الحواف، وشبكة وزوايا وخطوط قياس. o: {draw, s, out, amount=1, grid=true, paper='#1D4F91', line='#EAF2FF'} */
  FX.blueprintLook = (ctx, t, o) => {
    const { X } = ctx, a = lookIn(ctx, t, o); o.draw(X); if (a <= ON) return;
    const W = 540, H = 960, src = lookBuf(X, 'bp', o.draw, W, H), d0 = src.Y.getImageData(0, 0, W, H);
    const bl = FX._cLbpb || (FX._cLbpb = document.createElement('canvas')); bl.width = W; bl.height = H; const BY = bl.getContext('2d', { willReadFrequently: true }); BY.filter = 'blur(2.5px) grayscale(1)'; BY.drawImage(src.c, 0, 0); BY.filter = 'none';
    const d1 = BY.getImageData(0, 0, W, H).data, d = d0.data, pp = hexRGB(o.paper || '#1D4F91'), lt = mixC(o.paper || '#1D4F91', '#9CC2F0', 0.55), L2 = hexRGB(lt), ln = hexRGB(o.line || '#EAF2FF');
    for (let i = 0; i < d.length; i += 4) { const g = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255, gb = d1[i] / 255, e = cl((Math.abs(g - gb) - 0.035) * 9), k = 0.15 + 0.7 * g;
      for (let j = 0; j < 3; j++) d[i + j] = lerp(lerp(pp[j], L2[j], k), ln[j], e); }
    src.Y.putImageData(d0, 0, 0); X.save(); X.globalAlpha *= a; X.drawImage(src.c, 0, 0, 1080, 1920);
    if (o.grid !== false) { X.strokeStyle = o.line || '#EAF2FF'; for (let v = 0; v <= 1920; v += 40) { X.globalAlpha = a * (v % 200 ? 0.1 : 0.22); X.lineWidth = v % 200 ? 1 : 1.6; X.beginPath(); X.moveTo(0, v); X.lineTo(1080, v); X.stroke(); if (v <= 1080) { X.beginPath(); X.moveTo(v, 0); X.lineTo(v, 1920); X.stroke(); } }
      X.globalAlpha = a * 0.55; X.lineWidth = 2.5; [[60, 140, 1, 1], [1020, 140, -1, 1], [60, 1780, 1, -1], [1020, 1780, -1, -1]].forEach(([x, y, sx, sy]) => { X.beginPath(); X.moveTo(x, y + sy * 70); X.lineTo(x, y); X.lineTo(x + sx * 70, y); X.stroke(); });
      X.beginPath(); X.moveTo(120, 1700); X.lineTo(960, 1700); X.moveTo(120, 1685); X.lineTo(120, 1715); X.moveTo(960, 1685); X.lineTo(960, 1715); X.stroke();
      [[150, 250], [930, 1630]].forEach(([x, y]) => { X.beginPath(); X.arc(x, y, 22, 0, TAU); X.moveTo(x - 34, y); X.lineTo(x + 34, y); X.moveTo(x, y - 34); X.lineTo(x, y + 34); X.stroke(); }); }
    X.restore();
  };

  /* 212 ورق مطبوع — كأن الفيديو مطبوع على ورقة: ملمس ورق بالضرب (multiply) بنص القوة، البشرة تبقى طبيعية. بلا draw = خلفية ورق فوق اللي انرسم (لمشاهد العناوين).
     o: {draw?, s, out, amount (.5 للفيديو · .9 للخلفية)} */
  FX.paperLook = (ctx, t, o) => {
    const { X } = ctx; if (o.draw) o.draw(X); const a = lookIn(ctx, t, Object.assign({ amount: o.draw ? 0.5 : 0.9 }, o)); if (a <= ON) return;
    X.save(); X.globalCompositeOperation = 'multiply'; X.globalAlpha *= a; X.drawImage(paperTex(), 0, 0, 1080, 1920); X.restore();
  };

  /* 213 شمس تدور — خلفية عنوان: 16 شعاع بدرجتين من لون الخلفية مايلين للون الهوية (قريبين من الخلفية فالكلام يبقى مقروء)، تلف ببطء 3° بالثانية.
     o: {s, at=[540,760], ground=P.bg, colour=P.acc, speed=1, out} */
  FX.sunburst = (ctx, t, o) => {
    const { X, P } = ctx, c = o.at || [540, 760], gr = o.ground || P.bg, ac = o.colour || P.acc, a = (o.s != null ? ctx.at(t, o.s, o.s + 0.5) : 1) * (1 - fout(ctx, t, o));
    if (a <= ON) return; const rot = (7.5 + Math.max(0, t - (o.s || 0)) * 3 * (o.speed == null ? 1 : o.speed)) * Math.PI / 180, R = 2400, n = 16;
    X.save(); X.globalAlpha *= a; X.fillStyle = mixC(gr, ac, 0.08); X.fillRect(0, 0, 1080, 1920); X.fillStyle = mixC(gr, ac, 0.2);
    for (let i = 0; i < n; i += 2) { const a0 = rot + i * TAU / n, a1 = a0 + TAU / n; X.beginPath(); X.moveTo(c[0], c[1]); X.lineTo(c[0] + R * Math.cos(a0), c[1] + R * Math.sin(a0)); X.lineTo(c[0] + R * Math.cos(a1), c[1] + R * Math.sin(a1)); X.closePath(); X.fill(); }
    X.restore();
  };
  // [اسم, [[[lon,lat],…] مضلع خارجي …]] — Natural Earth (public domain)، lon -20..66 · lat 5..46، تبسيط 0.1°
  const MENA = [["قبرص",[[[33.91,35.07],[32.96,34.62],[32.46,34.72],[32.27,35.07],[32.87,35.16],[32.92,35.4],[33.66,35.36],[34.59,35.69],[33.92,35.28],[34.1,34.97],[33.84,34.96],[33.91,35.07]]]],["إسرائيل",[[[34.25,31.21],[34.56,31.54],[35.1,33.09],[35.48,33.09],[35.55,33.28],[35.67,33.25],[35.56,32.38],[35.19,32.54],[34.96,32.19],[34.96,31.83],[35.23,31.76],[34.96,31.61],[34.88,31.36],[35.46,31.49],[34.91,29.49],[34.25,31.21]]]],["فلسطين",[[[34.99,31.97],[35.06,32.46],[35.21,32.54],[35.56,32.38],[35.46,31.49],[34.88,31.36],[34.96,31.61],[35.23,31.74],[34.97,31.82],[34.99,31.97]]]],["لبنان",[[[35.11,33.09],[35.64,34.0],[35.67,34.31],[35.97,34.65],[36.44,34.63],[36.32,34.51],[36.6,34.2],[36.29,33.95],[36.37,33.84],[36.05,33.82],[35.92,33.64],[36.04,33.57],[35.55,33.28],[35.48,33.09],[35.11,33.09]]]],["إثيوبيا",[[[34.07,9.45],[34.33,10.22],[34.28,10.57],[34.57,10.88],[34.84,10.73],[35.07,11.82],[35.69,12.66],[36.12,12.7],[36.53,14.26],[37.06,14.28],[37.29,14.46],[37.55,14.11],[37.89,14.88],[38.43,14.42],[39.01,14.65],[39.21,14.44],[39.52,14.57],[40.1,14.47],[40.83,14.11],[42.38,12.47],[41.79,11.7],[41.76,11.0],[42.92,11.0],[42.65,10.63],[42.84,10.21],[43.42,9.41],[43.98,9.01],[46.98,8.0],[47.98,8.0],[45.03,5],[35.77,5],[35.8,5.32],[35.29,5.37],[34.97,5.86],[34.7,6.68],[33.72,7.66],[32.99,7.92],[33.24,8.46],[33.74,8.37],[34.09,8.56],[34.07,9.45]]]],["جنوب السودان",[[[35.41,5],[27.46,5],[27.12,5.77],[26.42,6.07],[26.51,6.21],[26.27,6.47],[26.38,6.65],[25.19,7.5],[25.22,7.86],[24.8,8.18],[24.15,8.32],[24.18,8.71],[24.56,8.89],[24.8,9.82],[25.08,10.29],[25.83,10.42],[26.63,9.48],[27.9,9.6],[28.05,9.33],[28.84,9.32],[28.91,9.53],[29.48,9.76],[29.62,10.06],[30.01,10.27],[30.77,9.72],[31.16,9.76],[32.43,11.08],[32.35,11.7],[32.08,12.0],[32.75,12.0],[32.73,12.22],[33.21,12.21],[33.14,10.74],[33.92,10.17],[33.88,9.5],[34.07,9.45],[34.11,8.63],[33.75,8.37],[33.24,8.46],[32.99,7.92],[33.72,7.66],[34.7,6.68],[35.29,5.37],[35.8,5.32],[35.77,5],[35.41,5]]]],["الصومال",[[[46.47,6.54],[47.98,8.0],[46.98,8.0],[44.02,8.99],[43.42,9.41],[42.65,10.61],[43.24,11.49],[43.49,11.38],[43.92,10.72],[44.59,10.38],[44.96,10.42],[45.77,10.88],[46.45,10.69],[47.41,11.18],[48.13,11.14],[48.52,11.32],[48.98,11.25],[50.07,11.51],[50.77,11.99],[51.29,11.83],[51.08,11.34],[51.16,10.6],[51.01,10.43],[51.22,10.44],[51.18,10.56],[51.4,10.4],[50.93,10.33],[50.83,9.42],[49.82,7.93],[49.04,6.14],[48.3,5],[45.02,5],[46.47,6.54]]]],["سوريا",[[[35.76,32.74],[35.59,32.71],[35.6,33.24],[36.04,33.57],[35.92,33.64],[36.05,33.82],[36.36,33.82],[36.29,33.95],[36.6,34.2],[36.32,34.51],[36.44,34.63],[35.97,34.65],[35.92,35.42],[35.72,35.58],[35.8,35.85],[36.16,35.82],[36.37,36.23],[36.66,36.23],[36.53,36.48],[36.64,36.83],[37.05,36.62],[37.45,36.63],[38.22,36.91],[39.24,36.66],[40.71,37.1],[42.35,37.24],[42.38,37.06],[41.84,36.62],[41.39,36.52],[41.28,36.35],[41.36,35.66],[41.2,34.79],[40.97,34.4],[36.82,32.32],[36.39,32.38],[35.76,32.74]]]],["فرنسا",[[[6.94,46],[7.02,45.93],[6.8,45.72],[7.16,45.41],[7.06,45.21],[6.6,45.1],[7.01,44.82],[6.87,44.37],[7.69,44.07],[7.48,43.76],[6.73,43.41],[6.59,43.27],[6.68,43.2],[6.18,43.04],[5.03,43.34],[5.23,43.48],[5.03,43.56],[4.86,43.34],[4.69,43.58],[4.82,43.35],[3.95,43.54],[3.11,43.11],[3.04,42.63],[3.18,42.43],[2.0,42.35],[1.72,42.61],[0.81,42.83],[0.66,42.84],[0.64,42.68],[-0.57,42.77],[-1.29,43.11],[-1.46,43.05],[-1.4,43.24],[-1.8,43.37],[-1.48,43.58],[-1.26,44.56],[-1.04,44.67],[-1.17,44.78],[-1.26,44.63],[-1.09,45.57],[-0.53,44.9],[-0.6,45.02],[-0.49,45.0],[-0.8,45.48],[-1.25,45.71],[-0.99,45.72],[-1.15,45.87],[-1.07,46],[6.94,46]],[[8.57,42.21],[8.71,42.58],[9.29,42.67],[9.35,43.0],[9.46,42.99],[9.56,42.15],[9.22,41.37],[8.79,41.56],[8.92,41.69],[8.66,41.75],[8.81,41.91],[8.61,41.9],[8.74,42.06],[8.57,42.21]]]],["المغرب",[[[-17.01,21.42],[-16.92,21.93],[-16.47,22.38],[-15.77,23.79],[-15.78,23.91],[-15.99,23.64],[-15.94,23.77],[-14.9,24.71],[-14.47,26.19],[-13.56,26.75],[-12.95,27.93],[-11.49,28.33],[-10.25,29.3],[-9.66,30.13],[-9.61,30.4],[-9.89,30.65],[-9.85,31.4],[-9.28,32.2],[-9.26,32.58],[-8.53,33.27],[-6.82,34.04],[-5.93,35.78],[-5.4,35.92],[-5.07,35.42],[-4.38,35.15],[-3.7,35.29],[-3.32,35.2],[-2.97,35.45],[-2.86,35.13],[-2.75,35.12],[-2.88,35.25],[-2.28,35.11],[-1.77,34.74],[-1.87,34.6],[-1.7,34.48],[-1.81,34.37],[-1.67,34.08],[-1.67,33.24],[-1.42,32.74],[-1.03,32.49],[-1.24,32.36],[-1.21,32.09],[-2.88,32.08],[-2.83,31.79],[-3.66,31.65],[-3.84,31.17],[-3.55,30.96],[-3.65,30.71],[-4.37,30.51],[-5.18,29.98],[-5.54,29.52],[-5.76,29.61],[-7.62,29.39],[-8.67,28.71],[-8.69,26],[-12.02,25.99],[-12.02,23.46],[-12.62,23.27],[-13.15,22.82],[-13.02,21.33],[-16.96,21.33],[-17.06,20.77],[-17.01,21.42]]]],["سلطنة عمان",[[[56.38,24.98],[56.61,24.5],[57.15,23.95],[58.76,23.54],[59.52,22.56],[59.82,22.51],[59.81,22.24],[59.34,21.44],[58.68,20.83],[58.52,20.42],[58.2,20.4],[58.21,20.61],[57.86,20.26],[57.69,19.73],[57.82,18.99],[56.81,18.75],[56.36,17.94],[55.45,17.84],[55.23,17.54],[55.26,17.23],[55.03,17.01],[54.09,17.01],[53.09,16.64],[51.98,19.0],[54.98,20.0],[55.64,21.98],[55.19,22.7],[55.54,23.77],[55.46,23.96],[56.0,24.08],[55.76,24.23],[55.83,24.92],[56.01,24.96],[56.1,24.73],[56.38,24.98]],[[56.08,26.06],[56.21,26.26],[56.4,26.21],[56.36,26.39],[56.5,26.36],[56.48,26.15],[56.33,26.17],[56.47,26.1],[56.28,25.63],[56.15,25.67],[56.08,26.06]],[[58.91,20.63],[58.65,20.17],[58.65,20.37],[58.91,20.63]]]],["أوزبكستان",[[[66,38.23],[65.6,38.24],[64.34,38.97],[64.15,38.95],[62.45,40.01],[62.35,40.43],[61.88,41.12],[61.43,41.3],[61.28,41.16],[60.48,41.21],[60.09,41.39],[60.05,41.75],[60.25,41.78],[59.91,41.97],[60.03,42.2],[59.26,42.35],[58.59,42.79],[58.53,42.65],[58.12,42.62],[58.49,42.3],[58.02,42.5],[57.85,42.19],[57.38,42.16],[56.98,41.9],[57.02,41.47],[57.16,41.37],[57.03,41.26],[55.98,41.32],[55.98,44.99],[58.55,45.56],[61.04,44.38],[62.03,43.48],[63.21,43.63],[64.43,43.55],[64.92,43.72],[65.52,43.3],[65.8,42.88],[66,42.95],[66,38.23]]]],["كازاخستان",[[[66.0,46],[66,42.95],[65.8,42.88],[65.52,43.3],[64.92,43.72],[64.43,43.55],[63.21,43.63],[62.03,43.48],[61.04,44.38],[58.55,45.56],[55.98,45.0],[55.98,41.32],[55.45,41.28],[54.91,41.93],[54.12,42.34],[52.98,42.13],[52.44,41.75],[52.4,42.09],[52.68,42.54],[52.56,42.74],[52.71,42.59],[52.74,42.7],[51.91,42.84],[51.65,43.19],[51.28,43.15],[51.31,43.46],[50.85,44.19],[50.28,44.34],[50.22,44.57],[51.56,44.51],[50.96,44.86],[50.96,44.98],[51.27,45.02],[51.42,45.39],[53.26,45.34],[52.73,45.55],[53.04,46],[66.0,46]]]],["روسيا",[[[48.71,46],[48.79,45.84],[48.55,45.97],[47.82,45.61],[47.56,45.77],[47.65,45.56],[47.38,45.75],[47.57,45.57],[47.37,45.19],[46.68,44.53],[47.25,44.21],[47.5,43.78],[47.4,43.51],[47.54,43.87],[47.7,43.87],[47.46,43.02],[48.58,41.85],[47.87,41.21],[47.27,41.3],[46.74,41.85],[46.57,41.79],[45.93,42.03],[45.63,42.2],[45.7,42.51],[45.12,42.7],[44.86,42.76],[44.77,42.61],[44.51,42.75],[43.94,42.55],[43.72,42.62],[43.8,42.75],[42.83,43.17],[41.58,43.22],[40.23,43.58],[39.96,43.39],[38.76,44.27],[38.22,44.39],[37.78,44.73],[37.5,44.67],[37.19,44.99],[36.58,45.19],[36.96,45.28],[36.67,45.33],[36.83,45.44],[37.14,45.34],[37.08,45.24],[37.73,45.3],[37.6,45.64],[37.93,46],[38.08,46],[38.04,45.82],[38.12,46],[48.71,46]]]],["الإمارات العربية المتحدة",[[[56.28,25.63],[56.38,24.98],[56.1,24.73],[55.98,24.97],[55.8,24.89],[55.76,24.23],[56.0,24.08],[55.46,23.96],[55.54,23.77],[55.12,22.62],[52.56,22.94],[51.58,24.1],[51.59,24.38],[51.93,23.96],[52.34,24.01],[52.6,24.21],[53.88,24.06],[54.43,24.29],[54.57,24.45],[54.42,24.54],[54.58,24.51],[54.64,24.75],[55.33,25.2],[56.08,26.06],[56.15,25.67],[56.28,25.63]]]],["جورجيا",[[[41.55,42.41],[41.42,42.74],[40.86,43.06],[40.34,43.14],[39.99,43.39],[40.06,43.54],[40.65,43.54],[41.58,43.22],[42.83,43.17],[43.8,42.75],[43.72,42.62],[43.94,42.55],[44.51,42.75],[44.77,42.61],[44.86,42.76],[45.74,42.47],[45.63,42.2],[46.41,41.91],[46.19,41.61],[46.69,41.27],[46.47,41.04],[45.28,41.45],[44.85,41.21],[43.45,41.1],[42.8,41.58],[41.81,41.42],[41.52,41.51],[41.77,41.82],[41.55,42.41]]]],["مقدونيا الشمالية",[[[20.57,41.87],[21.1,42.2],[21.29,42.09],[21.44,42.25],[22.27,42.37],[22.84,42.02],[23.01,41.72],[22.94,41.35],[22.75,41.32],[22.7,41.14],[22.05,41.15],[21.58,40.87],[20.97,40.85],[20.72,40.91],[20.5,41.24],[20.57,41.87]]]],["ألبانيا",[[[20.57,41.87],[20.5,41.24],[20.72,40.91],[20.96,40.89],[21.04,40.64],[20.65,40.09],[20.3,39.99],[20.4,39.82],[20.18,39.64],[19.29,40.42],[19.47,40.35],[19.3,40.65],[19.38,40.91],[19.52,40.92],[19.44,41.59],[19.61,41.61],[19.27,42.18],[19.7,42.65],[19.78,42.47],[20.04,42.56],[20.48,42.23],[20.57,41.87]]]],["أذربيجان",[[[45.0,41.29],[45.46,41.43],[46.5,41.04],[46.69,41.28],[46.18,41.66],[46.43,41.89],[46.74,41.85],[47.27,41.3],[47.83,41.2],[48.58,41.85],[49.54,40.65],[50.24,40.5],[50.39,40.23],[49.89,40.37],[49.49,40.15],[49.28,39.52],[49.41,39.29],[49.27,39.34],[49.08,38.96],[49.15,39.08],[48.97,39.18],[48.87,38.43],[48.61,38.4],[47.99,38.85],[48.29,39.0],[48.11,39.27],[48.34,39.38],[47.97,39.7],[46.51,38.88],[46.4,39.2],[46.6,39.22],[46.36,39.41],[46.52,39.55],[46.18,39.59],[45.58,39.97],[45.87,40.01],[45.98,40.22],[45.53,40.44],[45.37,40.68],[45.6,40.86],[45.07,41.06],[45.2,41.14],[45.0,41.29]],[[46.14,38.86],[45.44,39.0],[44.77,39.7],[45.03,39.77],[45.43,39.49],[45.79,39.55],[45.76,39.37],[45.99,39.25],[46.14,38.86]]]],["صربيا",[[[20.07,42.55],[20.03,42.74],[20.35,42.89],[19.18,43.48],[19.51,43.65],[19.24,44.0],[19.62,44.04],[19.12,44.34],[19.38,44.86],[19.02,44.87],[19.13,44.95],[19.04,45.14],[19.41,45.2],[18.98,45.37],[19.11,45.51],[18.9,45.57],[18.84,45.82],[19.05,46],[20.37,46],[20.78,45.76],[20.77,45.48],[21.49,45.15],[21.35,45.0],[21.54,44.89],[21.4,44.79],[22.13,44.5],[22.43,44.73],[22.77,44.58],[22.48,44.5],[22.69,44.23],[22.35,43.81],[22.52,43.47],[22.98,43.2],[22.73,42.89],[22.43,42.81],[22.54,42.48],[22.42,42.33],[21.44,42.25],[21.29,42.09],[21.1,42.2],[20.78,42.08],[20.68,41.84],[20.5,42.21],[20.07,42.55]]]],["تركيا",[[[43.44,41.11],[43.72,40.76],[43.56,40.48],[43.67,40.11],[44.33,40.03],[44.81,39.64],[44.57,39.77],[44.39,39.41],[44.01,39.37],[44.27,38.84],[44.29,38.38],[44.46,38.34],[44.2,37.9],[44.6,37.72],[44.57,37.45],[44.8,37.29],[44.77,37.14],[44.28,36.97],[44.09,37.31],[43.81,37.2],[42.78,37.38],[42.55,37.14],[42.36,37.11],[42.21,37.32],[41.48,37.08],[40.71,37.1],[39.24,36.66],[38.22,36.91],[37.45,36.63],[37.05,36.62],[36.64,36.83],[36.53,36.48],[36.67,36.24],[36.37,36.23],[36.36,35.99],[36.14,35.82],[35.91,35.92],[35.79,36.3],[36.21,36.64],[36.02,36.93],[35.35,36.54],[34.69,36.81],[33.96,36.21],[33.87,36.31],[33.69,36.14],[32.8,36.03],[32.37,36.18],[32.02,36.55],[30.69,36.89],[30.43,36.23],[30.16,36.3],[29.67,36.12],[29.1,36.39],[29.1,36.67],[28.94,36.75],[28.83,36.6],[28.45,36.88],[28.04,36.56],[27.97,36.69],[28.12,36.8],[27.4,36.67],[28.03,36.78],[28.04,36.94],[28.33,37.04],[27.26,36.96],[27.25,37.12],[27.57,37.13],[27.62,37.27],[27.19,37.36],[27.21,37.6],[27.01,37.67],[27.25,37.74],[27.24,37.99],[26.23,38.28],[26.51,38.43],[26.39,38.45],[26.41,38.68],[26.67,38.31],[26.7,38.43],[27.16,38.45],[26.94,38.43],[26.72,38.65],[27.06,38.89],[26.81,38.95],[26.88,39.09],[26.61,39.28],[26.94,39.57],[26.07,39.5],[26.17,39.97],[26.74,40.4],[27.29,40.47],[27.76,40.32],[27.88,40.39],[27.76,40.54],[28.03,40.47],[27.94,40.37],[29.05,40.37],[29.15,40.43],[28.79,40.55],[29.94,40.74],[29.25,40.81],[29.01,41.03],[29.17,41.23],[31.23,41.09],[31.4,41.32],[32.26,41.72],[33.32,42.02],[34.69,41.95],[35.02,42.09],[35.22,42.02],[35.09,41.93],[35.3,41.72],[36.04,41.7],[36.4,41.26],[36.76,41.37],[37.14,41.15],[38.33,40.92],[39.43,41.11],[40.14,40.92],[41.52,41.51],[42.46,41.43],[42.66,41.59],[43.44,41.11]],[[28.02,41.97],[27.97,41.82],[28.23,41.52],[29.11,41.24],[28.99,41.01],[27.52,40.99],[27.29,40.7],[26.16,40.06],[26.22,40.33],[26.83,40.6],[26.05,40.66],[26.36,40.96],[26.32,41.25],[26.63,41.36],[26.6,41.61],[26.33,41.79],[27.05,42.08],[27.55,41.9],[28.02,41.97]]]],["إسبانيا",[[[-1.79,43.39],[-1.4,43.24],[-1.46,43.05],[-1.29,43.11],[-0.57,42.77],[0.28,42.67],[0.81,42.83],[1.34,42.71],[1.45,42.43],[1.71,42.5],[2.01,42.35],[3.18,42.43],[3.32,42.32],[3.12,42.22],[3.23,41.95],[2.13,41.3],[1.02,41.05],[0.71,40.82],[0.86,40.69],[0.56,40.59],[-0.32,39.52],[-0.16,39.0],[0.23,38.74],[-0.51,38.34],[-0.86,37.74],[-0.71,37.62],[-1.32,37.56],[-1.67,37.36],[-2.13,36.74],[-2.36,36.84],[-2.72,36.68],[-4.4,36.72],[-4.66,36.51],[-5.19,36.41],[-5.61,36.01],[-6.04,36.19],[-6.39,36.64],[-6.19,36.93],[-6.39,36.81],[-6.89,37.17],[-6.85,37.3],[-6.93,37.17],[-7.41,37.19],[-7.51,37.6],[-6.95,38.2],[-7.1,38.17],[-7.36,38.45],[-6.97,39.01],[-7.56,39.68],[-7.02,39.69],[-6.88,40.01],[-7.04,40.18],[-6.79,40.36],[-6.94,41.02],[-6.21,41.57],[-6.54,41.66],[-6.61,41.96],[-8.18,41.81],[-8.1,42.04],[-8.22,42.15],[-8.88,41.89],[-8.9,42.12],[-8.62,42.35],[-8.87,42.26],[-8.66,42.44],[-8.94,42.47],[-8.73,42.69],[-9.03,42.54],[-8.89,42.83],[-9.1,42.76],[-9.13,42.92],[-9.27,42.89],[-9.11,43.14],[-9.22,43.16],[-8.83,43.34],[-8.21,43.31],[-8.31,43.45],[-8.17,43.49],[-8.31,43.57],[-7.69,43.79],[-7.04,43.48],[-5.85,43.66],[-4.48,43.38],[-3.58,43.52],[-3.01,43.32],[-2.77,43.45],[-2.13,43.29],[-1.79,43.39]],[[3.35,39.78],[3.45,39.66],[3.06,39.27],[2.68,39.56],[2.35,39.58],[3.18,39.97],[3.14,39.79],[3.35,39.78]],[[-16.43,28.15],[-16.69,28.0],[-16.92,28.36],[-16.12,28.57],[-16.43,28.15]],[[-13.97,28.74],[-13.82,28.68],[-13.93,28.24],[-14.51,28.07],[-14.22,28.22],[-13.97,28.74]],[[-15.39,28.03],[-15.38,27.85],[-15.58,27.73],[-15.82,27.92],[-15.71,28.17],[-15.41,28.18],[-15.39,28.03]],[[-13.48,29.24],[-13.48,29.0],[-13.87,28.86],[-13.48,29.24]],[[4.3,39.93],[4.25,39.82],[3.8,40.02],[4.11,40.08],[4.3,39.93]],[[-17.76,28.82],[-17.84,28.46],[-18.0,28.78],[-17.76,28.82]],[[1.61,39.09],[1.4,38.83],[1.22,38.89],[1.36,39.08],[1.61,39.09]],[[-17.93,27.85],[-17.98,27.64],[-18.16,27.72],[-17.93,27.85]]]],["أرمينيا",[[[45.0,41.29],[45.2,41.14],[45.07,41.06],[45.6,40.86],[45.37,40.68],[45.53,40.44],[45.98,40.22],[45.87,40.01],[45.58,39.97],[46.18,39.59],[46.52,39.55],[46.36,39.41],[46.6,39.22],[46.4,39.2],[46.51,38.88],[46.14,38.86],[45.77,39.56],[45.43,39.49],[44.33,40.03],[43.67,40.11],[43.56,40.48],[43.72,40.76],[43.44,41.11],[45.0,41.29]]]],["ليبيا",[[[11.51,33.18],[12.35,32.83],[13.35,32.9],[15.18,32.4],[15.76,31.39],[17.85,30.92],[19.06,30.27],[19.62,30.42],[20.1,30.93],[20.15,31.22],[19.92,31.76],[20.07,32.18],[20.56,32.56],[21.62,32.94],[22.15,32.95],[23.11,32.64],[23.08,32.33],[23.31,32.16],[25.02,31.95],[25.16,31.66],[24.85,31.35],[24.99,30.79],[24.69,30.14],[24.98,29.18],[24.98,20.0],[23.98,20.0],[23.98,19.5],[15.99,23.44],[14.22,22.62],[13.48,23.18],[11.97,23.52],[11.51,24.31],[10.26,24.58],[10.03,24.86],[10.01,25.33],[9.38,26.17],[9.85,26.52],[9.91,26.84],[9.72,27.31],[9.94,27.87],[9.78,28.27],[9.83,29.13],[9.29,30.12],[9.87,30.36],[10.19,30.73],[10.11,31.43],[10.26,31.68],[11.55,32.43],[11.51,33.18]]]],["تونس",[[[11.51,33.18],[11.55,32.43],[10.26,31.68],[10.11,31.43],[10.25,30.84],[9.87,30.36],[9.52,30.23],[9.04,32.07],[8.33,32.53],[8.09,33.09],[7.72,33.23],[7.48,33.85],[7.52,34.09],[8.24,34.65],[8.43,35.24],[8.29,35.33],[8.24,35.83],[8.36,36.43],[8.17,36.53],[8.64,36.84],[8.6,36.94],[9.74,37.35],[9.86,37.33],[9.82,37.15],[9.88,37.26],[10.27,37.18],[10.13,37.16],[10.35,36.88],[10.19,36.8],[10.36,36.73],[11.05,37.08],[11.13,36.85],[10.8,36.45],[10.55,36.38],[10.47,36.11],[10.62,35.84],[11.04,35.64],[11.16,35.22],[10.6,34.54],[10.01,34.17],[10.33,33.7],[10.72,33.71],[10.74,33.48],[11.04,33.62],[11.1,33.36],[11.29,33.29],[11.13,33.31],[11.18,33.21],[11.51,33.18]],[[10.99,33.84],[10.89,33.64],[10.74,33.72],[10.74,33.88],[10.99,33.84]]]],["اليونان",[[[20.97,40.85],[21.58,40.87],[22.05,41.15],[22.7,41.14],[22.78,41.33],[24.23,41.56],[25.29,41.24],[26.12,41.36],[26.05,41.69],[26.23,41.75],[26.6,41.61],[26.64,41.4],[26.32,41.25],[26.36,40.96],[26.08,40.74],[25.14,41.01],[23.73,40.75],[23.87,40.41],[24.39,40.15],[23.73,40.36],[23.99,39.95],[23.44,40.28],[23.36,40.15],[23.75,39.93],[23.36,39.96],[23.3,40.24],[22.89,40.39],[22.91,40.64],[22.58,40.47],[22.57,40.05],[23.34,39.18],[23.05,39.1],[23.22,39.18],[22.94,39.36],[22.83,39.22],[23.07,39.04],[22.53,38.86],[23.31,38.65],[23.34,38.5],[24.08,38.17],[24.03,37.65],[23.57,38.05],[23.0,37.88],[23.53,37.44],[23.17,37.3],[23.13,37.45],[22.73,37.57],[23.2,36.43],[22.69,36.81],[22.49,36.39],[22.15,37.02],[21.94,36.99],[21.88,36.73],[21.71,36.82],[21.57,37.12],[21.67,37.4],[21.11,37.88],[21.37,38.22],[21.62,38.15],[21.85,38.34],[22.87,37.94],[23.22,38.16],[22.4,38.45],[22.38,38.34],[21.52,38.3],[21.32,38.5],[21.16,38.3],[20.99,38.66],[20.73,38.81],[20.77,38.96],[21.09,38.86],[21.16,39.0],[20.82,39.11],[20.74,38.95],[20.0,39.69],[20.25,39.66],[20.4,39.82],[20.3,39.99],[20.65,40.09],[20.77,40.42],[21.02,40.56],[20.97,40.85]],[[26.32,35.32],[26.15,35.0],[25.02,34.93],[24.74,34.93],[24.74,35.08],[24.4,35.19],[23.52,35.29],[23.74,35.69],[23.82,35.53],[24.18,35.59],[24.07,35.5],[24.34,35.35],[25.77,35.34],[25.8,35.12],[26.32,35.32]],[[24.59,38.16],[24.57,37.99],[24.37,37.97],[24.04,38.4],[23.65,38.41],[23.2,38.83],[22.83,38.85],[23.3,39.04],[23.59,38.77],[24.16,38.65],[24.25,38.23],[24.59,38.16]],[[26.61,39.05],[26.17,39.02],[26.28,39.2],[26.06,39.09],[25.84,39.23],[26.36,39.38],[26.61,39.05]],[[28.24,36.43],[28.09,36.06],[27.73,35.92],[27.68,36.16],[28.24,36.43]],[[26.16,38.54],[26.11,38.22],[25.89,38.22],[25.99,38.38],[25.85,38.58],[26.16,38.54]],[[20.73,38.06],[20.45,38.28],[20.35,38.18],[20.54,38.47],[20.73,38.06]],[[20.09,39.43],[19.91,39.43],[19.63,39.75],[19.95,39.79],[19.84,39.65],[20.09,39.43]],[[25.45,40.04],[25.35,39.79],[25.25,39.92],[25.05,39.84],[25.03,40.0],[25.45,40.04]],[[25.53,37.2],[25.45,36.92],[25.34,37.08],[25.53,37.2]],[[20.9,37.79],[21.0,37.7],[20.82,37.65],[20.62,37.86],[20.9,37.79]],[[24.79,40.74],[24.78,40.61],[24.52,40.64],[24.64,40.8],[24.79,40.74]],[[27.21,35.52],[27.14,35.4],[27.07,35.59],[27.22,35.83],[27.21,35.52]],[[23.01,36.31],[23.1,36.24],[22.99,36.14],[22.9,36.34],[23.01,36.31]]]],["سيراليون",[[[-10.28,8.48],[-10.32,8.18],[-10.61,8.03],[-10.62,7.77],[-11.48,6.92],[-12.51,7.39],[-12.18,7.6],[-12.46,7.56],[-12.45,7.77],[-12.6,7.68],[-12.94,7.89],[-12.82,7.92],[-12.88,8.1],[-12.97,8.25],[-13.16,8.17],[-13.29,8.5],[-13.03,8.38],[-13.12,8.47],[-12.88,8.69],[-13.16,8.67],[-13.16,8.52],[-13.24,8.83],[-12.99,8.86],[-13.3,9.04],[-12.76,9.35],[-12.47,9.88],[-11.25,9.99],[-10.68,9.31],[-10.75,9.08],[-10.59,9.05],[-10.48,8.67],[-10.74,8.29],[-10.28,8.48]]]],["غينيا",[[[-13.3,9.04],[-13.16,9.19],[-13.32,9.18],[-13.3,9.36],[-13.41,9.29],[-13.49,9.57],[-13.73,9.51],[-13.56,9.79],[-13.73,9.74],[-13.69,9.95],[-13.84,9.86],[-14.06,10.03],[-14.0,10.2],[-14.15,10.06],[-14.14,10.18],[-14.45,10.21],[-14.54,10.51],[-14.66,10.48],[-14.5,10.89],[-14.7,10.64],[-14.65,10.81],[-14.76,10.7],[-14.82,10.91],[-14.69,11.06],[-14.92,11.03],[-14.96,10.77],[-15.08,10.86],[-14.71,11.5],[-13.73,11.71],[-13.72,12.0],[-13.97,12.15],[-13.7,12.29],[-13.73,12.67],[-13.08,12.64],[-13.05,12.47],[-12.36,12.31],[-11.48,12.43],[-11.51,12.19],[-11.33,12.03],[-10.95,12.22],[-10.71,11.89],[-10.27,12.22],[-9.72,12.03],[-9.34,12.27],[-9.41,12.46],[-9.27,12.5],[-8.98,12.37],[-8.85,11.66],[-8.38,11.37],[-8.7,10.98],[-8.33,11.02],[-8.28,10.51],[-7.97,10.28],[-8.17,9.94],[-8.16,9.53],[-7.87,9.41],[-7.93,9.18],[-7.75,9.08],[-7.97,8.81],[-7.7,8.62],[-7.66,8.37],[-8.25,8.45],[-8.27,8.25],[-8.0,8.18],[-7.96,8.02],[-8.07,8.03],[-8.2,7.58],[-8.69,7.69],[-8.86,7.27],[-9.13,7.19],[-9.23,7.38],[-9.49,7.38],[-9.36,7.74],[-9.5,8.34],[-9.77,8.56],[-10.06,8.42],[-10.37,8.49],[-10.74,8.29],[-10.48,8.67],[-10.59,9.05],[-10.75,9.08],[-10.68,9.31],[-11.2,9.98],[-12.47,9.88],[-12.76,9.35],[-13.3,9.04]]]],["ليبيريا",[[[-11.48,6.92],[-10.62,7.77],[-10.61,8.03],[-10.32,8.18],[-10.28,8.48],[-9.77,8.56],[-9.5,8.34],[-9.36,7.74],[-9.49,7.38],[-9.23,7.38],[-9.13,7.19],[-8.91,7.25],[-8.57,7.69],[-8.28,7.02],[-8.62,6.49],[-7.91,6.27],[-7.79,5.96],[-7.45,5.85],[-7.39,5.32],[-7.55,5],[-9.05,5],[-11.48,6.92]]]],["جمهورية أفريقيا الوسطى",[[[22.86,10.92],[23.64,9.86],[23.63,9.28],[23.44,9.02],[23.57,8.97],[23.51,8.71],[24.22,8.69],[24.15,8.32],[24.8,8.18],[25.22,7.86],[25.19,7.5],[26.38,6.65],[26.27,6.47],[26.51,6.21],[26.42,6.07],[27.12,5.77],[27.44,5.07],[27.07,5.2],[26.87,5.04],[26.5,5.05],[25.54,5.38],[25.15,5],[24.4,5.12],[24.31,5],[19.98,5],[19.41,5.13],[19.22,5],[14.68,5],[14.52,5.29],[14.62,5.87],[14.39,6.04],[14.77,6.32],[15.48,7.52],[15.93,7.49],[16.55,7.87],[16.78,7.54],[17.64,7.99],[18.59,8.05],[19.12,8.68],[18.87,8.85],[19.02,8.99],[20.44,9.14],[21.72,10.3],[21.72,10.64],[22.45,11.0],[22.86,10.92]]]],["السودان",[[[22.86,10.92],[22.95,11.25],[22.54,11.63],[22.61,12.07],[22.46,12.03],[22.45,12.61],[22.2,12.74],[21.94,12.64],[21.81,12.79],[22.27,13.33],[22.07,13.78],[22.55,14.14],[22.36,14.54],[22.68,14.69],[22.96,15.2],[22.91,15.54],[23.09,15.7],[23.98,15.72],[23.98,20.0],[24.98,20.0],[24.98,22.0],[31.25,21.99],[31.42,22.23],[31.44,22.0],[33.18,22.0],[33.56,21.71],[34.0,21.77],[34.08,22.0],[36.88,22.0],[36.89,21.65],[37.31,21.06],[37.1,21.21],[37.43,18.86],[38.6,18.01],[38.23,17.53],[37.5,17.31],[37.4,17.03],[36.97,17.06],[36.95,16.28],[36.43,15.13],[36.53,14.26],[36.12,12.72],[35.69,12.66],[35.07,11.82],[34.84,10.73],[34.57,10.88],[34.28,10.57],[34.33,10.22],[34.07,9.45],[33.88,9.5],[33.92,10.17],[33.14,10.74],[33.21,12.21],[32.73,12.22],[32.75,12.0],[32.08,12.0],[32.35,11.7],[32.43,11.08],[31.16,9.76],[30.77,9.72],[30.01,10.27],[29.62,10.06],[29.48,9.76],[28.99,9.59],[28.99,10.16],[27.83,10.16],[27.9,9.6],[26.63,9.48],[25.83,10.42],[25.08,10.29],[24.8,9.82],[24.56,8.89],[24.11,8.68],[23.49,8.73],[23.64,9.86],[22.86,10.92]]]],["جيبوتي",[[[43.24,11.49],[42.87,10.98],[42.62,11.09],[41.76,11.0],[41.79,11.7],[42.43,12.52],[42.68,12.36],[43.12,12.71],[43.33,12.49],[43.38,12.0],[42.52,11.57],[42.6,11.47],[43.15,11.61],[43.24,11.49]]]],["إريتريا",[[[43.12,12.71],[42.68,12.36],[42.38,12.47],[40.83,14.11],[40.1,14.47],[39.52,14.57],[39.21,14.44],[39.01,14.65],[38.43,14.42],[37.89,14.88],[37.55,14.11],[37.29,14.46],[37.06,14.28],[36.53,14.26],[36.43,15.13],[36.95,16.28],[36.97,17.06],[37.4,17.03],[37.5,17.31],[38.23,17.53],[38.6,18.0],[39.72,15.09],[39.85,15.17],[39.88,15.5],[40.08,15.34],[40.16,14.98],[40.51,15.02],[40.77,14.7],[41.17,14.64],[41.68,13.94],[42.29,13.57],[42.38,13.22],[43.12,12.71]],[[40.39,15.64],[39.98,15.61],[39.94,15.7],[40.08,15.66],[39.95,15.89],[40.16,15.64],[40.39,15.64]]]],["العراق",[[[44.77,37.14],[44.99,36.53],[45.24,36.4],[45.32,35.99],[45.75,35.81],[46.33,35.8],[46.0,35.67],[46.15,35.11],[45.91,35.09],[45.67,34.81],[45.7,34.55],[45.5,34.59],[45.54,34.14],[45.38,33.97],[46.16,33.26],[46.1,32.95],[47.41,32.4],[47.83,31.81],[47.67,30.99],[48.01,30.99],[48.01,30.46],[48.56,29.95],[47.93,30.11],[47.95,29.99],[47.2,30.03],[46.53,29.1],[44.69,29.2],[42.08,31.08],[40.42,31.92],[39.15,32.12],[39.29,32.24],[39.03,32.33],[38.77,33.37],[40.97,34.4],[41.2,34.79],[41.36,35.66],[41.28,36.35],[41.39,36.52],[41.84,36.62],[42.72,37.36],[43.81,37.2],[44.09,37.31],[44.28,36.97],[44.77,37.14]]]],["إيطاليا",[[[7.02,45.93],[8.77,46],[9.0,45.82],[9.02,46],[13.61,45.99],[13.57,45.83],[13.85,45.58],[13.57,45.79],[13.4,45.68],[13.12,45.77],[13.09,45.64],[12.42,45.44],[12.58,45.55],[12.4,45.54],[12.15,45.31],[12.53,44.97],[12.27,44.83],[12.37,44.25],[13.62,43.56],[14.08,42.6],[14.74,42.08],[15.17,41.93],[16.14,41.92],[16.18,41.78],[15.9,41.61],[15.96,41.46],[18.01,40.65],[18.52,40.14],[18.39,39.82],[18.07,39.91],[17.86,40.29],[16.98,40.49],[16.49,39.78],[17.16,39.41],[17.17,38.96],[16.59,38.8],[16.57,38.43],[16.08,37.94],[15.68,37.95],[15.63,38.22],[15.92,38.52],[15.84,38.65],[16.22,38.86],[15.62,40.08],[15.26,40.03],[14.91,40.24],[15.0,40.4],[14.78,40.67],[14.34,40.57],[14.47,40.73],[14.05,40.79],[13.72,41.25],[13.04,41.23],[11.66,42.28],[11.11,42.39],[11.16,42.56],[10.73,42.8],[10.76,42.92],[10.5,42.94],[10.53,43.25],[10.09,44.03],[8.76,44.43],[8.07,43.9],[7.5,43.79],[7.66,44.18],[6.97,44.25],[6.84,44.53],[7.06,44.68],[7.0,44.83],[6.6,45.1],[7.11,45.26],[7.16,45.41],[6.78,45.78],[7.02,45.93]],[[15.53,38.3],[15.65,38.28],[15.09,37.48],[15.33,37.01],[15.09,36.65],[14.49,36.79],[14.28,37.04],[13.17,37.49],[12.66,37.57],[12.43,37.8],[12.73,38.19],[12.9,38.03],[13.32,38.22],[13.79,37.97],[15.53,38.3]],[[9.79,40.56],[9.63,40.26],[9.73,40.08],[9.57,39.15],[9.01,39.26],[9.03,39.0],[8.64,38.86],[8.37,39.22],[8.56,39.85],[8.39,39.91],[8.49,40.1],[8.38,40.47],[8.15,40.59],[8.19,40.96],[8.52,40.83],[9.23,41.26],[9.66,41.0],[9.5,40.93],[9.72,40.84],[9.79,40.56]]]],["إيران",[[[44.81,39.64],[45.44,39.0],[46.13,38.86],[46.55,38.89],[47.97,39.7],[48.34,39.38],[48.11,39.27],[48.29,39.0],[47.99,38.85],[48.61,38.4],[48.87,38.43],[49.13,37.62],[50.2,37.39],[50.32,37.15],[51.0,36.77],[51.91,36.58],[54.01,36.95],[53.61,36.88],[54.01,36.82],[53.91,37.34],[54.65,37.44],[55.13,37.95],[57.17,38.28],[57.35,37.97],[58.36,37.63],[58.8,37.69],[59.31,37.53],[59.46,37.21],[60.02,37.03],[60.34,36.64],[61.17,36.64],[61.13,35.97],[61.29,35.55],[61.07,34.81],[60.7,34.52],[60.89,34.32],[60.49,34.14],[60.51,33.64],[60.92,33.51],[60.56,33.06],[60.83,32.25],[60.82,31.49],[61.69,31.37],[61.83,31.02],[60.84,29.86],[61.89,28.54],[62.76,28.25],[62.74,27.27],[63.18,27.26],[63.32,27.12],[63.16,26.65],[62.42,26.56],[61.83,26.23],[61.62,25.29],[61.41,25.06],[60.63,25.27],[60.55,25.45],[60.4,25.38],[60.47,25.29],[58.07,25.56],[57.31,25.78],[56.97,27.0],[56.81,27.14],[56.12,27.16],[54.79,26.5],[54.31,26.71],[53.72,26.71],[52.6,27.35],[52.67,27.45],[52.46,27.63],[51.4,27.93],[51.06,28.74],[50.8,28.93],[50.93,29.05],[50.64,29.14],[50.66,29.45],[50.14,29.94],[50.07,30.2],[49.53,30.02],[48.92,30.38],[49.2,30.35],[49.21,30.51],[48.98,30.52],[48.92,30.04],[48.46,29.99],[48.4,30.22],[48.01,30.46],[48.01,30.99],[47.67,30.99],[47.83,31.81],[47.41,32.4],[46.1,32.95],[46.16,33.26],[45.38,33.97],[45.54,34.14],[45.5,34.59],[45.7,34.55],[45.67,34.81],[45.91,35.09],[46.15,35.11],[46.0,35.67],[46.33,35.8],[45.75,35.81],[45.32,35.99],[45.24,36.4],[45.07,36.42],[45.04,36.69],[44.82,36.81],[44.89,37.02],[44.57,37.43],[44.6,37.72],[44.2,37.9],[44.46,38.34],[44.29,38.38],[44.27,38.84],[44.01,39.37],[44.39,39.41],[44.57,39.77],[44.81,39.64]],[[56.21,27.0],[55.95,26.7],[55.29,26.55],[55.28,26.66],[55.77,26.8],[55.76,26.95],[56.21,27.0]]]],["ساحل العاج",[[[-7.99,10.16],[-7.5,10.46],[-7.02,10.14],[-6.96,10.34],[-6.67,10.36],[-6.67,10.65],[-6.45,10.55],[-6.26,10.73],[-6.24,10.25],[-6.02,10.19],[-5.59,10.45],[-5.14,10.3],[-4.97,9.9],[-4.68,9.68],[-4.51,9.75],[-4.37,9.58],[-3.75,9.94],[-3.21,9.92],[-2.81,9.41],[-2.69,9.49],[-2.77,9.05],[-2.62,8.92],[-2.51,8.21],[-2.79,7.94],[-3.26,6.62],[-3.03,5.7],[-2.79,5.59],[-2.77,5.16],[-3.14,5.14],[-3.15,5.37],[-3.31,5.12],[-4.0,5.27],[-3.73,5.27],[-3.8,5.38],[-3.74,5.27],[-4.67,5.31],[-4.81,5.18],[-4.0,5.23],[-4.89,5.13],[-5.32,5.23],[-5.4,5.14],[-5.0,5.13],[-5.94,5],[-7.58,5],[-7.39,5.32],[-7.45,5.85],[-7.79,5.96],[-7.91,6.27],[-8.62,6.49],[-8.29,6.99],[-8.49,7.56],[-8.23,7.54],[-7.96,8.02],[-8.0,8.18],[-8.27,8.25],[-8.25,8.45],[-7.66,8.37],[-7.7,8.62],[-7.97,8.81],[-7.75,9.08],[-7.93,9.18],[-7.87,9.41],[-8.16,9.53],[-8.17,9.94],[-7.99,10.16]]]],["مالي",[[[-12.26,14.77],[-11.82,14.9],[-11.73,15.54],[-11.52,15.64],[-10.92,15.1],[-10.73,15.43],[-9.42,15.44],[-9.36,15.7],[-9.35,15.5],[-5.51,15.49],[-5.35,16.31],[-5.62,16.53],[-6.59,24.99],[-4.82,25.0],[1.15,21.1],[1.15,20.74],[1.56,20.6],[1.78,20.3],[2.2,20.27],[2.4,20.06],[3.2,19.82],[3.26,19.39],[3.1,19.14],[3.28,19.0],[4.23,19.14],[4.18,16.42],[3.87,15.71],[3.51,15.35],[1.33,15.28],[0.67,14.94],[-0.72,15.08],[-1.7,14.5],[-2.0,14.47],[-2.04,14.18],[-2.6,14.22],[-2.87,14.0],[-2.9,13.65],[-3.29,13.7],[-3.25,13.29],[-3.45,13.17],[-3.98,13.5],[-4.35,13.12],[-4.21,12.82],[-4.49,12.71],[-4.41,12.31],[-4.76,12.01],[-5.41,11.83],[-5.22,11.42],[-5.33,11.12],[-5.5,11.07],[-5.48,10.54],[-6.02,10.19],[-6.24,10.25],[-6.26,10.73],[-6.45,10.55],[-6.67,10.65],[-6.67,10.36],[-6.96,10.34],[-7.02,10.14],[-7.5,10.46],[-7.99,10.16],[-8.3,10.54],[-8.33,11.02],[-8.7,10.96],[-8.38,11.37],[-8.85,11.66],[-8.82,12.01],[-9.15,12.47],[-9.4,12.47],[-9.34,12.27],[-9.72,12.03],[-10.27,12.22],[-10.71,11.89],[-10.95,12.22],[-11.33,12.03],[-11.51,12.19],[-11.39,12.97],[-11.61,13.36],[-11.83,13.31],[-12.1,13.7],[-11.96,13.83],[-12.0,14.17],[-12.22,14.39],[-12.26,14.77]]]],["السنغال",[[[-12.26,14.77],[-12.22,14.39],[-12.0,14.17],[-11.96,13.83],[-12.1,13.7],[-11.83,13.31],[-11.61,13.36],[-11.39,12.98],[-11.39,12.4],[-12.36,12.31],[-13.05,12.47],[-13.09,12.64],[-15.2,12.68],[-15.68,12.44],[-16.73,12.33],[-16.8,12.49],[-16.58,12.63],[-15.64,12.54],[-15.39,12.84],[-15.64,12.56],[-16.02,12.73],[-16.37,12.56],[-16.63,12.67],[-16.6,12.8],[-16.75,12.57],[-16.71,13.16],[-15.83,13.16],[-15.82,13.33],[-15.28,13.38],[-15.14,13.59],[-14.37,13.24],[-13.82,13.43],[-13.99,13.58],[-14.37,13.45],[-15.08,13.82],[-15.39,13.77],[-15.52,13.58],[-16.56,13.59],[-16.49,14.0],[-16.7,13.77],[-16.75,13.95],[-16.36,14.17],[-16.73,14.06],[-16.78,13.84],[-16.96,14.39],[-17.22,14.69],[-17.54,14.76],[-16.88,15.23],[-16.3,16.51],[-15.67,16.48],[-14.97,16.69],[-14.41,16.66],[-13.84,16.12],[-13.48,16.16],[-13.24,15.62],[-12.26,14.77]]]],["نيجيريا",[[[3.6,11.7],[3.64,12.52],[4.09,13.0],[4.13,13.47],[4.51,13.69],[5.52,13.88],[6.37,13.63],[6.94,13.0],[7.82,13.35],[8.68,12.92],[9.59,12.8],[10.12,13.25],[10.68,13.38],[11.44,13.36],[12.47,13.06],[12.84,13.49],[13.61,13.7],[14.06,13.08],[14.19,12.37],[14.67,12.17],[14.61,11.51],[14.17,11.24],[13.98,11.28],[13.75,11.02],[13.43,10.15],[13.23,10.05],[13.2,9.54],[12.86,9.38],[12.77,8.76],[12.37,8.61],[12.23,8.39],[12.19,7.96],[11.74,7.26],[11.87,7.08],[11.56,6.88],[11.53,6.65],[11.11,6.43],[11.04,6.74],[10.58,7.13],[10.5,6.87],[10.14,7.01],[8.86,5.85],[8.7,5],[5.43,5],[5.5,5.14],[5.34,5.34],[5.64,5.54],[5.43,5.4],[5.2,5.5],[5.51,5.59],[5.33,5.61],[5.34,5.72],[5.13,5.63],[5.1,5.79],[5.29,5.91],[5.04,5.77],[4.41,6.36],[3.38,6.44],[3.84,6.61],[3.48,6.6],[3.38,6.4],[2.7,6.37],[2.77,9.06],[3.08,9.1],[3.13,9.46],[3.59,9.95],[3.57,10.29],[3.84,10.6],[3.72,11.11],[3.47,11.42],[3.6,11.7]]]],["بنين",[[[3.6,11.7],[3.47,11.42],[3.72,11.11],[3.84,10.6],[3.57,10.29],[3.59,9.95],[3.13,9.46],[3.08,9.1],[2.77,9.06],[2.7,6.37],[1.62,6.21],[1.78,6.28],[1.53,6.99],[1.6,9.05],[1.33,9.52],[1.33,10.0],[0.77,10.37],[0.78,10.69],[0.9,10.99],[1.11,11.03],[1.14,11.26],[1.44,11.47],[1.98,11.41],[2.27,11.65],[2.46,11.98],[2.36,12.22],[2.5,12.28],[2.84,12.4],[3.6,11.7]]]],["كرواتيا",[[[17.27,46],[18.4,45.74],[18.9,45.93],[18.9,45.57],[19.11,45.51],[18.98,45.37],[19.41,45.2],[19.12,45.2],[19.13,44.95],[18.89,44.86],[18.68,45.08],[18.24,45.16],[17.84,45.06],[16.92,45.28],[16.53,45.22],[16.32,45.0],[15.79,45.19],[15.73,44.77],[16.03,44.62],[16.33,44.08],[17.27,43.46],[17.63,42.95],[16.88,43.41],[15.96,43.5],[15.95,43.69],[15.14,44.2],[15.26,44.33],[15.53,44.27],[15.01,44.57],[14.85,45.09],[14.57,45.29],[14.31,45.34],[13.9,44.77],[13.62,45.07],[13.73,45.13],[13.6,45.15],[13.51,45.51],[14.37,45.48],[14.58,45.67],[14.8,45.47],[15.33,45.45],[15.26,45.72],[15.68,45.84],[15.66,46],[17.27,46]],[[18.44,42.56],[18.5,42.42],[17.89,42.79],[17.0,43.05],[17.81,42.91],[18.44,42.56]]]],["قطر",[[[50.81,24.75],[50.78,25.6],[50.9,25.53],[50.98,25.98],[51.25,26.16],[51.58,25.88],[51.47,25.52],[51.61,25.02],[51.34,24.57],[50.98,24.57],[50.81,24.75]]]],["السعودية",[[[50.81,24.75],[50.98,24.57],[51.5,24.58],[51.28,24.31],[51.57,24.26],[52.56,22.94],[55.19,22.7],[55.64,21.98],[54.98,20.0],[51.98,19.0],[49.04,18.58],[48.16,18.15],[47.43,17.09],[47.16,16.95],[46.97,16.96],[46.71,17.28],[45.17,17.43],[43.92,17.3],[43.41,17.52],[43.16,17.33],[43.18,16.66],[42.79,16.37],[42.71,16.73],[42.36,17.18],[42.36,17.02],[42.3,17.45],[41.49,18.22],[40.74,19.78],[40.08,20.28],[39.76,20.35],[39.17,21.11],[39.11,21.75],[38.93,22.01],[39.14,22.4],[38.45,23.78],[37.95,24.21],[37.43,24.37],[37.15,24.85],[37.24,25.18],[35.22,28.05],[34.57,28.11],[34.8,28.53],[34.95,29.35],[36.07,29.2],[36.73,29.85],[37.47,29.99],[37.65,30.33],[37.98,30.5],[36.96,31.49],[39.16,32.12],[40.37,31.94],[42.08,31.08],[44.69,29.2],[47.43,28.99],[47.67,28.53],[48.49,28.5],[48.88,27.83],[48.83,27.61],[49.24,27.55],[49.31,27.45],[49.12,27.44],[49.37,27.15],[49.57,27.19],[50.16,26.66],[49.99,26.72],[50.22,26.32],[50.14,26.04],[50.03,26.2],[49.99,26.0],[50.81,24.75]],[[42.19,16.71],[42.18,16.58],[41.96,16.67],[41.76,16.9],[42.19,16.71]]]],["باكستان",[[[66,25.42],[64.74,25.32],[64.66,25.17],[64.05,25.45],[64.06,25.34],[63.57,25.36],[63.5,25.19],[62.53,25.26],[62.38,25.09],[62.15,25.22],[61.73,25.02],[61.78,25.19],[61.59,25.2],[61.83,26.23],[62.42,26.56],[63.14,26.63],[63.32,27.12],[63.18,27.26],[62.74,27.27],[62.76,28.25],[61.89,28.54],[60.84,29.86],[62.48,29.41],[63.57,29.5],[64.09,29.39],[64.48,29.57],[65.04,29.54],[66,29.79],[66,25.42]]]],["بلغاريا",[[[26.33,41.71],[26.05,41.7],[26.18,41.43],[25.88,41.3],[25.24,41.24],[24.51,41.56],[22.92,41.34],[23.01,41.74],[22.34,42.31],[22.53,42.46],[22.43,42.81],[22.73,42.89],[22.98,43.2],[22.52,43.47],[22.4,43.99],[22.69,44.23],[23.03,44.09],[22.89,43.84],[25.4,43.65],[26.15,44.01],[27.03,44.18],[28.58,43.74],[28.56,43.45],[28.12,43.39],[27.9,43.2],[27.89,42.71],[27.45,42.48],[27.72,42.41],[28.02,41.97],[27.55,41.9],[27.05,42.08],[26.61,41.97],[26.33,41.71]]]],["تشاد",[[[14.06,13.08],[13.61,13.7],[13.45,14.44],[13.66,14.55],[14.37,15.75],[15.47,16.89],[15.74,19.9],[15.97,20.34],[15.18,21.49],[14.98,23.0],[15.99,23.44],[23.98,19.5],[23.98,15.72],[23.09,15.7],[22.91,15.54],[22.96,15.2],[22.68,14.69],[22.36,14.54],[22.55,14.14],[22.07,13.78],[22.27,13.33],[21.81,12.79],[21.94,12.64],[22.2,12.74],[22.45,12.61],[22.46,12.03],[22.61,12.07],[22.54,11.63],[22.91,11.4],[22.92,11.09],[22.86,10.92],[22.45,11.0],[21.72,10.64],[21.72,10.3],[20.44,9.14],[19.02,8.99],[18.87,8.85],[19.12,8.68],[18.59,8.05],[17.64,7.99],[16.81,7.54],[16.55,7.87],[15.93,7.49],[15.48,7.52],[15.56,7.79],[15.18,8.48],[13.95,9.64],[14.18,9.98],[15.68,9.99],[15.13,10.54],[15.11,11.78],[14.83,12.62],[14.55,12.77],[14.42,13.08],[14.06,13.08]]]],["الكويت",[[[47.95,29.99],[48.18,29.54],[47.97,29.58],[47.7,29.36],[48.1,29.35],[48.43,28.54],[47.67,28.53],[47.43,28.99],[46.53,29.1],[47.14,30.0],[47.67,30.1],[47.95,29.99]],[[48.35,29.71],[48.16,29.63],[48.12,29.98],[48.35,29.71]]]],["الجزائر",[[[-4.82,25.0],[-8.68,27.29],[-8.68,28.69],[-7.62,29.39],[-5.76,29.61],[-5.54,29.52],[-5.18,29.98],[-4.37,30.51],[-3.65,30.71],[-3.55,30.96],[-3.84,31.17],[-3.66,31.65],[-2.83,31.79],[-2.88,32.08],[-1.21,32.09],[-1.24,32.36],[-1.03,32.49],[-1.42,32.74],[-1.67,33.24],[-1.67,34.08],[-1.81,34.37],[-1.7,34.48],[-1.87,34.6],[-1.77,34.74],[-2.22,35.09],[-1.76,35.13],[-1.03,35.68],[-0.63,35.72],[-0.48,35.89],[-0.08,35.79],[0.34,36.21],[1.35,36.55],[2.6,36.6],[2.93,36.81],[3.87,36.92],[4.79,36.9],[5.3,36.64],[6.42,37.09],[6.95,36.89],[7.23,36.97],[7.22,37.09],[7.91,36.85],[8.6,36.94],[8.64,36.84],[8.17,36.53],[8.36,36.43],[8.24,35.83],[8.29,35.33],[8.43,35.24],[8.24,34.65],[7.83,34.41],[7.48,33.89],[7.72,33.23],[8.09,33.09],[8.33,32.53],[9.04,32.07],[9.52,30.23],[9.29,30.12],[9.83,29.13],[9.78,28.27],[9.93,27.83],[9.72,27.29],[9.9,26.65],[9.38,26.17],[10.01,25.33],[10.03,24.86],[10.24,24.6],[11.54,24.3],[11.97,23.52],[7.48,20.87],[5.79,19.45],[3.33,18.98],[3.1,19.14],[3.26,19.39],[3.2,19.82],[2.4,20.06],[2.2,20.27],[1.78,20.3],[1.56,20.6],[1.15,20.74],[1.15,21.1],[-4.82,25.0]]]],["أندورا",[[[1.71,42.5],[1.41,42.53],[1.54,42.65],[1.71,42.5]]]],["أفغانستان",[[[66,29.79],[65.04,29.54],[64.48,29.57],[64.09,29.39],[63.57,29.5],[62.48,29.41],[60.84,29.86],[61.83,31.02],[61.69,31.37],[60.82,31.49],[60.83,32.25],[60.56,33.06],[60.92,33.51],[60.51,33.64],[60.49,34.14],[60.89,34.32],[60.7,34.52],[61.07,34.81],[61.27,35.62],[61.6,35.43],[62.01,35.44],[62.29,35.14],[62.69,35.25],[63.08,35.44],[63.21,35.7],[63.1,35.86],[64.05,36.0],[64.48,36.27],[64.78,37.12],[65.54,37.26],[65.76,37.58],[66,37.47],[66,29.79]]]],["الجبل الأسود",[[[18.5,42.42],[18.43,42.95],[18.82,43.34],[19.07,43.31],[18.98,43.55],[20.35,42.89],[20.03,42.74],[19.98,42.51],[19.62,42.6],[19.27,42.19],[19.37,41.85],[18.55,42.42],[18.69,42.48],[18.5,42.42]]]],["البوسنة والهرسك",[[[17.65,42.89],[17.27,43.46],[16.33,44.08],[16.03,44.62],[15.73,44.77],[15.79,45.19],[16.32,45.0],[16.53,45.22],[16.92,45.28],[17.84,45.06],[18.68,45.09],[18.89,44.86],[19.37,44.89],[19.11,44.38],[19.61,44.05],[19.23,43.96],[19.49,43.56],[18.91,43.51],[19.07,43.31],[18.82,43.34],[18.64,43.02],[18.45,42.99],[18.49,42.56],[17.65,42.89]]]],["البرتغال",[[[-7.1,38.83],[-7.36,38.45],[-7.1,38.17],[-6.95,38.2],[-7.53,37.57],[-7.41,37.16],[-7.82,37.0],[-8.58,37.12],[-9.0,37.02],[-8.75,37.73],[-8.89,37.95],[-8.8,38.36],[-8.94,38.48],[-8.61,38.42],[-8.77,38.57],[-9.23,38.42],[-9.25,38.67],[-8.94,38.78],[-9.01,38.91],[-8.77,39.1],[-9.11,38.71],[-9.5,38.81],[-9.41,39.38],[-9.09,39.58],[-8.79,40.12],[-8.91,40.2],[-8.75,40.64],[-8.57,40.76],[-8.66,40.84],[-8.75,40.65],[-8.65,41.15],[-8.83,41.67],[-8.7,41.72],[-8.88,41.74],[-8.63,42.05],[-8.22,42.15],[-8.1,42.04],[-8.23,41.89],[-8.09,41.81],[-6.61,41.96],[-6.54,41.66],[-6.21,41.57],[-6.94,41.02],[-6.79,40.36],[-7.04,40.18],[-6.88,40.01],[-7.02,39.69],[-7.56,39.68],[-7.24,39.2],[-6.99,39.07],[-7.1,38.83]],[[-16.79,32.69],[-17.25,32.81],[-16.67,32.76],[-16.79,32.69]]]],["تركمانستان",[[[61.27,35.62],[61.13,35.97],[61.17,36.64],[60.34,36.64],[60.02,37.03],[59.46,37.21],[59.31,37.53],[58.8,37.69],[58.36,37.63],[57.35,37.97],[57.19,38.28],[55.45,38.08],[54.86,37.76],[54.65,37.44],[53.91,37.34],[53.83,38.53],[53.98,38.92],[53.7,39.08],[53.72,39.24],[53.68,39.08],[53.57,39.19],[53.56,39.35],[53.15,39.34],[53.16,39.18],[53.09,39.4],[53.28,39.66],[53.22,39.53],[53.73,39.53],[53.42,39.65],[53.57,39.97],[52.91,40.02],[53.01,39.77],[52.74,40.05],[52.74,40.48],[52.92,41.09],[53.12,40.77],[53.48,40.74],[53.62,40.89],[53.72,40.63],[54.4,40.67],[54.25,40.89],[54.64,40.84],[54.77,41.04],[54.07,41.49],[53.82,42.12],[52.96,41.98],[52.77,41.68],[52.92,41.67],[52.88,41.05],[52.44,41.75],[52.98,42.13],[54.12,42.34],[54.91,41.93],[55.48,41.27],[57.01,41.25],[57.16,41.37],[57.02,41.47],[56.98,41.9],[57.38,42.16],[57.85,42.19],[58.02,42.5],[58.49,42.3],[58.12,42.62],[58.53,42.65],[58.59,42.79],[59.26,42.35],[60.03,42.2],[59.91,41.97],[60.25,41.78],[60.05,41.75],[60.09,41.39],[60.48,41.21],[61.28,41.16],[61.43,41.3],[61.88,41.12],[62.35,40.43],[62.45,40.01],[64.15,38.95],[64.34,38.97],[65.6,38.24],[66,38.22],[66,37.49],[65.76,37.58],[65.54,37.26],[64.81,37.14],[64.48,36.27],[64.05,36.0],[63.1,35.86],[63.21,35.7],[63.08,35.44],[62.69,35.25],[62.29,35.14],[62.01,35.44],[61.6,35.43],[61.27,35.62]]]],["الأردن",[[[35.61,32.68],[35.9,32.71],[36.07,32.52],[36.81,32.31],[38.77,33.37],[39.03,32.33],[39.29,32.24],[38.96,31.99],[36.96,31.49],[37.98,30.5],[37.65,30.33],[37.47,29.99],[36.73,29.85],[36.02,29.19],[34.95,29.35],[35.14,30.43],[35.44,31.1],[35.61,32.68]]]],["الكاميرون",[[[8.69,5],[8.9,5.6],[8.85,5.83],[9.69,6.53],[9.79,6.79],[10.14,7.01],[10.5,6.87],[10.58,7.13],[11.04,6.74],[11.1,6.45],[11.26,6.43],[11.87,7.08],[11.74,7.26],[12.19,7.96],[12.23,8.39],[12.37,8.61],[12.79,8.79],[12.86,9.38],[13.2,9.54],[13.23,10.05],[13.43,10.15],[13.75,11.02],[13.98,11.28],[14.17,11.24],[14.62,11.54],[14.67,12.18],[14.19,12.37],[14.06,13.08],[14.42,13.08],[14.55,12.77],[14.82,12.64],[14.9,12.15],[15.05,12.08],[15.14,10.52],[15.68,9.99],[14.18,9.98],[13.95,9.65],[15.05,8.64],[15.56,7.79],[14.77,6.32],[14.39,6.04],[14.62,5.87],[14.52,5.29],[14.68,5],[8.69,5]]]],["النيجر",[[[3.6,11.7],[2.84,12.4],[2.37,12.24],[2.39,11.9],[2.05,12.34],[2.25,12.42],[2.11,12.71],[1.56,12.63],[0.98,13.03],[0.98,13.37],[1.27,13.35],[0.59,13.69],[0.15,14.55],[0.22,15.0],[0.95,14.98],[1.33,15.28],[3.51,15.35],[3.85,15.69],[4.18,16.42],[4.23,19.14],[5.79,19.45],[7.48,20.87],[11.97,23.52],[13.48,23.18],[14.22,22.62],[14.98,23.0],[15.18,21.49],[15.97,20.34],[15.74,19.9],[15.47,16.92],[14.37,15.75],[13.66,14.55],[13.45,14.44],[13.61,13.7],[12.84,13.49],[12.47,13.06],[11.44,13.36],[10.68,13.38],[10.12,13.25],[9.59,12.8],[8.68,12.92],[7.82,13.35],[6.94,13.0],[6.3,13.66],[5.52,13.88],[4.82,13.77],[4.13,13.47],[4.09,13.0],[3.64,12.52],[3.6,11.7]]]],["بوركينا فاسو",[[[2.39,11.9],[2.01,11.43],[1.44,11.47],[0.96,10.97],[0.49,10.93],[-0.3,11.16],[-0.63,10.91],[-2.84,11.0],[-2.93,10.63],[-2.77,10.42],[-2.76,9.39],[-3.21,9.92],[-3.75,9.94],[-4.37,9.58],[-4.51,9.75],[-4.68,9.68],[-4.97,9.9],[-5.12,10.29],[-5.52,10.43],[-5.5,11.07],[-5.33,11.12],[-5.22,11.42],[-5.41,11.83],[-4.76,12.01],[-4.41,12.31],[-4.49,12.71],[-4.21,12.82],[-4.33,13.17],[-3.98,13.5],[-3.45,13.17],[-3.25,13.29],[-3.29,13.7],[-2.9,13.65],[-2.87,14.0],[-2.6,14.22],[-2.04,14.18],[-2.0,14.47],[-1.7,14.5],[-0.72,15.08],[0.22,14.91],[0.16,14.5],[0.59,13.69],[1.27,13.35],[0.98,13.37],[0.98,13.03],[1.56,12.63],[2.11,12.71],[2.25,12.42],[2.05,12.34],[2.39,11.9]]]],["توغو",[[[-0.17,11.13],[0.49,10.93],[0.9,10.99],[0.76,10.38],[1.34,9.96],[1.33,9.52],[1.6,9.08],[1.64,8.49],[1.53,6.99],[1.78,6.28],[1.62,6.21],[1.19,6.1],[0.52,6.83],[0.65,7.32],[0.5,7.5],[0.57,8.2],[0.71,8.3],[0.37,8.77],[0.51,8.87],[0.53,9.4],[0.23,9.43],[0.38,9.59],[0.26,9.66],[0.4,10.28],[-0.09,10.63],[0.02,11.06],[-0.17,11.13]]]],["غانا",[[[-0.17,11.13],[0.02,11.06],[-0.09,10.63],[0.4,10.28],[0.26,9.66],[0.38,9.59],[0.23,9.43],[0.53,9.4],[0.51,8.87],[0.37,8.77],[0.71,8.3],[0.57,8.2],[0.5,7.5],[0.65,7.32],[0.52,6.84],[1.19,6.1],[0.95,5.79],[0.24,5.76],[-0.8,5.21],[-1.65,5],[-3.12,5.09],[-2.77,5.16],[-2.73,5.37],[-2.79,5.61],[-3.03,5.7],[-3.24,6.81],[-2.97,7.21],[-2.79,7.94],[-2.51,8.21],[-2.62,8.92],[-2.77,9.05],[-2.66,9.27],[-2.77,10.42],[-2.93,10.63],[-2.84,11.0],[-0.63,10.91],[-0.17,11.13]]]],["غينيا بيساو",[[[-13.73,12.67],[-13.7,12.29],[-13.97,12.15],[-13.72,12.0],[-13.73,11.71],[-14.71,11.5],[-15.09,10.93],[-15.0,11.22],[-15.23,10.99],[-15.21,11.23],[-15.36,11.14],[-15.43,11.29],[-15.27,11.43],[-15.51,11.36],[-15.28,11.62],[-15.01,11.61],[-15.23,11.76],[-15.44,11.56],[-15.55,11.73],[-15.09,11.94],[-14.94,11.75],[-15.01,11.98],[-15.83,11.75],[-15.8,11.89],[-15.96,11.73],[-15.71,12.02],[-16.12,11.89],[-16.36,12.09],[-16.06,12.35],[-16.46,12.17],[-16.73,12.33],[-15.68,12.44],[-15.2,12.68],[-13.73,12.67]]]],["مصر",[[[34.25,31.21],[34.89,29.49],[34.26,27.73],[33.23,28.57],[33.18,28.99],[32.72,29.46],[32.58,30.01],[32.34,29.59],[32.58,29.37],[32.87,28.58],[33.55,27.9],[33.5,27.65],[34.0,26.9],[33.94,26.65],[35.14,24.5],[35.79,23.9],[35.49,23.95],[35.62,23.14],[35.21,22.79],[35.62,23.14],[35.85,22.76],[36.23,22.64],[36.88,22.0],[31.44,22.0],[31.42,22.23],[31.25,21.99],[24.98,22.0],[24.98,29.18],[24.69,30.18],[24.99,30.79],[24.85,31.35],[25.09,31.61],[27.32,31.38],[27.45,31.22],[27.85,31.24],[27.93,31.1],[28.42,31.08],[29.03,30.83],[30.07,31.33],[30.29,31.24],[30.18,31.28],[30.36,31.51],[30.97,31.59],[30.54,31.4],[30.73,31.39],[31.12,31.49],[30.98,31.58],[31.1,31.61],[31.56,31.44],[31.94,31.52],[32.2,31.3],[31.89,31.53],[31.77,31.28],[32.11,31.05],[32.28,31.14],[32.21,31.3],[32.6,31.06],[32.93,31.16],[32.7,31.04],[33.11,31.2],[33.13,31.05],[34.2,31.31],[34.25,31.21]]]],["اليمن",[[[51.98,19.0],[53.09,16.64],[52.29,16.26],[52.16,15.98],[52.23,15.62],[49.37,14.65],[48.7,14.04],[48.02,14.06],[46.7,13.43],[45.67,13.34],[45.12,12.96],[45.06,12.76],[44.61,12.82],[43.95,12.6],[43.47,12.68],[42.94,14.95],[42.61,15.24],[42.71,15.37],[42.79,15.21],[42.69,15.7],[42.83,15.92],[42.79,16.37],[43.18,16.66],[43.12,17.09],[43.3,17.46],[43.5,17.51],[43.92,17.3],[45.17,17.43],[46.71,17.28],[46.97,16.96],[47.16,16.95],[47.43,17.09],[48.16,18.15],[49.04,18.58],[51.98,19.0]],[[54.47,12.54],[53.73,12.3],[53.31,12.54],[53.52,12.71],[54.47,12.54]]]],["موريتانيا",[[[-8.68,27.29],[-4.82,25.0],[-6.59,24.99],[-5.62,16.53],[-5.35,16.31],[-5.51,15.49],[-9.35,15.5],[-9.36,15.7],[-9.42,15.44],[-10.73,15.43],[-10.92,15.1],[-11.52,15.64],[-11.73,15.54],[-11.82,14.9],[-12.07,14.73],[-12.89,15.25],[-13.48,16.16],[-13.84,16.12],[-14.41,16.66],[-16.27,16.52],[-16.54,15.81],[-16.04,18.14],[-16.2,18.98],[-16.54,19.38],[-16.28,19.53],[-16.47,19.41],[-16.23,19.79],[-16.2,20.23],[-16.41,20.68],[-16.53,20.74],[-16.54,20.56],[-16.67,20.68],[-16.92,21.16],[-17.06,20.77],[-16.97,21.32],[-13.02,21.33],[-13.15,22.82],[-12.62,23.27],[-12.02,23.46],[-12.02,25.99],[-8.69,26],[-8.68,27.29]]]],["غامبيا",[[[-16.75,13.06],[-16.83,13.34],[-16.68,13.5],[-16.42,13.21],[-16.15,13.28],[-16.16,13.43],[-15.29,13.5],[-16.39,13.34],[-16.56,13.59],[-15.52,13.58],[-15.39,13.77],[-15.1,13.82],[-14.37,13.45],[-13.99,13.58],[-13.82,13.43],[-14.37,13.24],[-15.14,13.59],[-15.28,13.38],[-15.82,13.33],[-15.83,13.16],[-16.75,13.06]]]],["بئر طويل",[[[33.18,22.0],[34.08,22.0],[34.0,21.77],[33.56,21.71],[33.18,22.0]]]],["البحرين",[[[50.55,26.19],[50.57,25.79],[50.45,26.16],[50.55,26.19]]]]];

  /* ══════════ هـ) الوثائقي: ورق، خريطة بمسار أحمر، تقريب على بلد، صور ممزقة الحواف ══════════
     الخريطة تعرض فلسطين دولة (بيانات Natural Earth بوجهة نظر فلسطين). أسماء البلدان من البيانات نفسها (name_ar). المدن من عندك {name, lon, lat}. */
  const PHI = Math.cos(28 * Math.PI / 180);
  const fitB = (pts, aspect, pad) => { const xs = pts.map(p => p[0] * PHI), ys = pts.map(p => p[1]); const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const w = Math.max(4, Math.max(...xs) - Math.min(...xs)) * (1 + pad * 2), h = Math.max(4, Math.max(...ys) - Math.min(...ys)) * (1 + pad * 2), fw = Math.max(w, h * aspect), fh = Math.max(h, w / aspect);
    return [cx - fw / 2, cy - fh / 2, cx + fw / 2, cy + fh / 2]; };
  const projB = (B, R) => p => [R.x + (p[0] * PHI - B[0]) / (B[2] - B[0]) * R.w, R.y + (B[3] - p[1]) / (B[3] - B[1]) * R.h];
  const ringArea = r => r.reduce((s, p, i) => { const q = r[(i + 1) % r.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
  const countryOf = name => MENA.find(c => c[0] === name);
  const focusOf = polys => { const main = polys.reduce((b, p) => (Math.abs(ringArea(p)) > Math.abs(ringArea(b)) ? p : b), polys[0]), bx = r => [Math.min(...r.map(p => p[0])), Math.min(...r.map(p => p[1])), Math.max(...r.map(p => p[0])), Math.max(...r.map(p => p[1]))], m = bx(main);
    const close = polys.filter(p => { const b = bx(p); return b[0] <= m[2] + 8 && b[2] >= m[0] - 8 && b[1] <= m[3] + 8 && b[3] >= m[1] - 8; });
    const A = ringArea(main); let cx = 0, cy = 0; main.forEach((p, i) => { const q = main[(i + 1) % main.length], f = p[0] * q[1] - q[0] * p[1]; cx += (p[0] + q[0]) * f; cy += (p[1] + q[1]) * f; });
    return { pts: close.flat(), anchor: A ? [cx / (6 * A), cy / (6 * A)] : [(m[0] + m[2]) / 2, (m[1] + m[3]) / 2] }; };
  const mapDraw = (X, B, R, focus) => { const pj = projB(B, R); X.save(); X.beginPath(); X.rect(R.x, R.y, R.w, R.h); X.clip(); X.fillStyle = '#CCD8D5'; X.fillRect(R.x, R.y, R.w, R.h);
    X.lineJoin = 'round'; X.lineWidth = 1.6;
    MENA.forEach(([name, polys]) => { X.beginPath(); polys.forEach(r => { r.forEach((p, i) => { const q = pj(p); i ? X.lineTo(q[0], q[1]) : X.moveTo(q[0], q[1]); }); X.closePath(); });
      X.fillStyle = name === focus ? '#D4AD82' : '#DBD2B8'; X.fill('evenodd'); X.strokeStyle = '#86765F'; X.stroke(); });
    X.restore(); return pj; };
  const TORN = [[0, 2], [8, 0], [17, 2], [27, 1], [38, 3], [49, 0], [60, 2], [72, 1], [83, 3], [94, 0], [100, 2], [99, 97], [91, 99], [80, 97], [69, 100], [57, 98], [46, 100], [35, 97], [23, 99], [12, 97], [1, 100]];
  const tornPath = (X, x, y, w, h) => poly(X, TORN.map(([u, v]) => [x + u / 100 * w, y + v / 100 * h]));
  const docTag = (ctx, X, str, x, y, size) => { X.save(); X.font = ctx.font('body', 700, size); const w = Math.min(420, X.measureText(str).width) + size; X.fillStyle = '#FFFCF3'; X.fillRect(x - w / 2, y - size * 1.05, w, size * 1.6);
    ctx.text(X, str, x, y, { family: 'body', weight: 700, size, color: '#28251F', maxWidth: 400 }); X.restore(); };
  // صفحة الوثائقي: ورق، عنوان فوق، شريط تعليق ممزق تحت، وحبيبات أرشيفية
  const docPage = (ctx, X, t, o, a, body) => {
    X.fillStyle = '#EFE5D4'; X.fillRect(0, 0, 1080, 1920); X.save(); X.globalAlpha *= a; body(); X.restore();
    if (o.title) { const L = ctx.text.layout(X, o.title, { family: 'body', weight: 800, size: 58, maxWidth: 860, lineHeight: 1.35 }); ctx.text.drawLayout(X, L, 540, 300, { color: '#28251F', perWord: () => ({ alpha: a, dy: (1 - a) * 24 }) }); }
    if (o.caption) { const ka = ctx.at(t, o.s + 0.5, o.s + 0.9, 'cubicOut'), L = ctx.text.layout(X, o.caption, { family: 'body', weight: 700, size: 38, maxWidth: 760, lineHeight: 1.45 }), h = L.height + 70;
      X.save(); X.globalAlpha *= ka * a; X.translate(0, (1 - ka) * 30); tornPath(X, 130, 1300, 820, h); X.fillStyle = '#FFFCF3'; shd(X, 14, 8, 0.12); X.fill(); noShd(X);
      ctx.text.drawLayout(X, L, 540, 1300 + 35, { color: '#28251F' }); X.restore(); }
    grainOver(X, t, 0.14, 2);
  };

  /* 214 خريطة بمسار — خريطة ورقية (بحر، يابسة، حدود)، خط أحمر يمشي بين الأماكن ونقطة تمشي عليه، وكل مكان يطلع بدبوس واسم لما يوصله الخط.
     o: {places:[{name, lon, lat}] (افتراضي الكويت ← الرياض ← جدة), title, caption, s, dur=2.4, borders=true, out} */
  FX.mapRoute = (ctx, t, o) => {
    const { X } = ctx; if (t < o.s) return;
    const P0 = o.places || [{ name: 'الكويت', lon: 47.98, lat: 29.38 }, { name: 'الرياض', lon: 46.72, lat: 24.69 }, { name: 'جدة', lon: 39.19, lat: 21.49 }];
    const R = { x: 90, y: 480, w: 900, h: 760 }, B = fitB(P0.map(p => [p.lon, p.lat]), R.w / R.h, 0.35), a = ctx.at(t, o.s, o.s + 0.4) * (1 - fout(ctx, t, o));
    docPage(ctx, X, t, o, a, () => {
      const zz = 1.04 - 0.04 * ctx.at(t, o.s, o.s + 3, 'sineOut'); X.save(); X.beginPath(); X.rect(R.x, R.y, R.w, R.h); X.clip(); X.translate(540, R.y + R.h / 2); X.scale(zz, zz); X.translate(-540, -(R.y + R.h / 2));
      const pj = mapDraw(X, B, R, null), pts = P0.map(p => pj([p.lon, p.lat])), segs = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1])), tot = segs.reduce((x, y) => x + y, 0) || 1;
      const k = ioC(pr(t, o.s + 0.5, o.s + 0.5 + (o.dur || 2.4))); let left = tot * k, mk = pts[0], reached = 0;
      X.strokeStyle = '#A52B25'; X.lineWidth = 7; X.lineCap = 'round'; X.lineJoin = 'round'; X.setLineDash([]); X.beginPath(); X.moveTo(pts[0][0], pts[0][1]);
      for (let i = 0; i < segs.length && left > 0; i++) { const f = Math.min(1, left / segs[i]); mk = [lerp(pts[i][0], pts[i + 1][0], f), lerp(pts[i][1], pts[i + 1][1], f)]; X.lineTo(mk[0], mk[1]); left -= segs[i]; if (f >= 1) reached = i + 1; }
      X.stroke(); X.restore();
      pts.forEach((p, i) => { if (i > reached) return; const tt = i === 0 ? o.s + 0.4 : o.s + 0.5 + (o.dur || 2.4) * (segs.slice(0, i).reduce((x, y) => x + y, 0) / tot), kk = ctx.at(t, tt, tt + 0.3, 'backOut');
        X.save(); X.globalAlpha *= cl(kk * 2); X.fillStyle = '#28251F'; X.strokeStyle = '#FFFCF3'; X.lineWidth = 5; X.beginPath(); X.arc(p[0], p[1], 11 * kk, 0, TAU); X.fill(); X.stroke();
        docTag(ctx, X, P0[i].name, cl(p[0], 230, 850), cl(p[1] - 34, R.y + 70, R.y + R.h - 20), 34); X.restore(); });
      if (k > 0 && k < 1) { X.fillStyle = '#A52B25'; X.strokeStyle = '#FFFCF3'; X.lineWidth = 5; X.beginPath(); X.arc(mk[0], mk[1], 13, 0, TAU); X.fill(); X.stroke(); }
    });
  };

  /* 215 تقريب على بلد — الخريطة الورقية تقرّب من المنطقة على بلد واحد، يتلوّن ويطلع اسمه (من البيانات). افتراضي فلسطين.
     o: {country='فلسطين' (بالاسم العربي كما بالبيانات), title, caption, s, at (بداية التقريب = s+.5), dur=1.6, zoom=1, from:[w,s,e,n] (lon/lat للبداية), out} */
  FX.mapFocus = (ctx, t, o) => {
    const { X } = ctx; if (t < o.s) return;
    const R = { x: 90, y: 480, w: 900, h: 760 }, name = o.country || 'فلسطين', C = countryOf(name), a = ctx.at(t, o.s, o.s + 0.4) * (1 - fout(ctx, t, o));
    const fr = o.from || [24, 12, 62, 40], B0 = fitB([[fr[0], fr[1]], [fr[2], fr[3]]], R.w / R.h, 0);
    let B1 = B0, anchor = null; if (C) { const f = focusOf(C[1]); anchor = f.anchor; const e = fitB(f.pts, R.w / R.h, 0.4), z = o.zoom || 1, cx = (e[0] + e[2]) / 2, cy = (e[1] + e[3]) / 2, w = (e[2] - e[0]) / z, h = (e[3] - e[1]) / z; B1 = [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2]; }
    const t0 = o.at != null ? o.at : o.s + 0.5, k = ioC(pr(t, t0, t0 + (o.dur || 1.6)));
    const lg = v => Math.log(v), wB = Math.exp(lerp(lg(B0[2] - B0[0]), lg(B1[2] - B1[0]), k)), cxB = lerp((B0[0] + B0[2]) / 2, (B1[0] + B1[2]) / 2, k), cyB = lerp((B0[1] + B0[3]) / 2, (B1[1] + B1[3]) / 2, k), hB = wB * R.h / R.w;
    const B = [cxB - wB / 2, cyB - hB / 2, cxB + wB / 2, cyB + hB / 2];
    docPage(ctx, X, t, o, a, () => { const hl = ctx.at(t, t0 + (o.dur || 1.6) * 0.6, t0 + (o.dur || 1.6) + 0.2); const pj = mapDraw(X, B, R, hl > 0.5 ? name : null);
      if (C && anchor) { const p = pj(anchor), kk = ctx.at(t, t0 + (o.dur || 1.6), t0 + (o.dur || 1.6) + 0.35, 'backOut');
        if (kk > ON) { X.save(); X.globalAlpha *= cl(kk * 2); X.fillStyle = '#28251F'; X.strokeStyle = '#FFFCF3'; X.lineWidth = 5; X.beginPath(); X.arc(p[0], p[1], 11, 0, TAU); X.fill(); X.stroke();
          docTag(ctx, X, name, cl(p[0], 240, 840), cl(p[1] - 40, R.y + 70, R.y + R.h - 20), 40); X.restore(); } } });
  };

  /* 216 صورة ممزقة الحواف — على ورق الوثائقي: بطاقة صورة (من فيديوك/صورتك) بحواف ممزقة وألوان باهتة شوي ومايلة، تحتها سطر المصدر، وشريط تعليق ممزق.
     o: {draw (Y)=>{} يرسم الصورة/الفيديو كإطار كامل, title, caption, credit, tilt=-2.5, s, at (=s+.15), out} */
  FX.tornPhoto = (ctx, t, o) => {
    const { X } = ctx; if (t < o.s) return; const a = ctx.at(t, o.s, o.s + 0.35) * (1 - fout(ctx, t, o));
    docPage(ctx, X, t, o, a, () => { const ta = o.at != null ? o.at : o.s + 0.15, k = sst(pr(t, ta, ta + 0.4)); if (k <= 0) return;
      const R = { x: 150, y: 470, w: 780, h: 760 }; X.save(); X.globalAlpha *= k; X.translate(540, R.y + R.h / 2 + (1 - k) * 35); X.rotate(pick(o, 'tilt', -2.5) * Math.PI / 180); X.translate(-540, -(R.y + R.h / 2));
      shd(X, 16, 14, 0.2, 10); tornPath(X, R.x, R.y, R.w, R.h); X.fillStyle = '#FFFCF3'; X.fill(); noShd(X);
      const ih = o.credit ? R.h * 0.86 - 44 : R.h - 44, IR = { x: R.x + 22, y: R.y + 22, w: R.w - 44, h: ih };
      X.save(); X.filter = 'saturate(0.65) contrast(1.03)'; fitIn(X, IR, 0, Y => (o.draw ? o.draw(Y) : (Y.fillStyle = '#9A8F7E', Y.fillRect(0, 0, 1080, 1920)))); X.restore();
      if (o.credit) ctx.text(X, o.credit, IR.x + IR.w, IR.y + IR.h + 50, { family: 'body', weight: 500, size: 28, align: 'right', color: '#655B4F', maxWidth: IR.w });
      X.restore(); });
  };

  /* ══════════ و) حوالين المتكلم ══════════ */
  // علامة يد خشنة على مستطيل كلمة: circle · underline · band · strike · arrow — k من 0 لـ1 (ترسم بالتدريج)
  const roughMark = (X, kind, R, k, col, sd, lw) => {
    if (k <= 0) return; X.save(); X.strokeStyle = col; X.fillStyle = col; X.lineCap = 'round'; X.lineJoin = 'round'; X.lineWidth = lw || 10;
    const jit = (i, a) => (rnd(i, sd) - 0.5) * a, pts = [];
    if (kind === 'circle') { const cx = R.x + R.w / 2, cy = R.y + R.h / 2, rx = R.w / 2 + 34, ry = R.h / 2 + 26, a0 = -2.2 + jit(1, 0.4), sw = TAU * 1.12;
      for (let i = 0; i <= 64; i++) { const u = i / 64, an = a0 - sw * u, gr = 1 + 0.06 * Math.sin(u * 5 + sd) + 0.05 * u; pts.push([cx + Math.cos(an) * rx * gr, cy + Math.sin(an) * ry * gr]); } }
    else if (kind === 'underline' || kind === 'strike') { const y = kind === 'strike' ? R.y + R.h * 0.55 : R.y + R.h + 14; for (let i = 0; i <= 20; i++) { const u = i / 20; pts.push([R.x + R.w + 16 - (R.w + 32) * u, y + Math.sin(u * 3 + sd) * 5 + jit(i, 3) - u * 6]); } }
    else if (kind === 'band') { X.globalAlpha *= 0.35; X.lineWidth = R.h * 0.62; X.lineCap = 'butt'; for (let i = 0; i <= 12; i++) { const u = i / 12; pts.push([R.x + R.w + 10 - (R.w + 20) * u, R.y + R.h * 0.58 + jit(i, 4)]); } }
    else if (kind === 'arrow') { const ex = R.x + R.w + 18, ey = R.y + R.h * 0.5, sx = ex + 190, sy = ey + 150; for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push([lerp(sx, ex, u) + Math.sin(u * Math.PI) * 50, lerp(sy, ey, u) + jit(i, 3)]); } }
    const n = Math.max(1, Math.floor((pts.length - 1) * cl(k))); X.beginPath(); pts.slice(0, n + 1).forEach((p, i) => (i ? X.lineTo(p[0], p[1]) : X.moveTo(p[0], p[1]))); X.stroke();
    if (kind === 'arrow' && k >= 1) { const p = pts[pts.length - 1], q = pts[pts.length - 3], an = Math.atan2(p[1] - q[1], p[0] - q[0]); X.beginPath(); X.moveTo(p[0] - 46 * Math.cos(an - 0.5), p[1] - 46 * Math.sin(an - 0.5)); X.lineTo(p[0], p[1]); X.lineTo(p[0] - 46 * Math.cos(an + 0.5), p[1] - 46 * Math.sin(an + 0.5)); X.stroke(); }
    X.restore(); };
  FX.roughMark = roughMark;

  /* 217 حوالين المتكلم — كلمة كبيرة وراك (تتمدد بالكشيدة لين تملى العرض)، وكلمات تطلع يمين/يسار/فوق راسك بحد عريض، وعلامة يد (دائرة/خط/تظليل/شطب/سهم) على الكلمة المهمة.
     بالقصّ (o.person — ماك) الكلمة الكبيرة تنرسم ورا جسمك؛ بلاه تطلع فوق الراس عشان ما تغطي الوجه. الوجه o.face (MV.faceAt) يحدد الأماكن، بلاه مكان افتراضي.
     o: {video|draw, person, face, big:'الحرية', bigAt (=s), words:[{text, place:'right'|'left'|'above', at, accent, mark, markAt}], s, out} */
  FX.layeredSpeaker = (ctx, t, o) => {
    const { X, P, at } = ctx, vd = o.video || o.draw; if (vd) vd(X); if (t < o.s) return;
    const ko = fout(ctx, t, o), f = faceOf(o, t, { x: 390, y: 560, w: 300, h: 370 }), PM = hasP(o), ink = '#0B0E13';
    X.save(); X.globalAlpha *= 1 - ko;
    if (o.big) { const bt = o.bigAt != null ? o.bigAt : o.s, ka = at(t, bt, bt + 0.35, 'cubicOut'), ks = at(t, bt + 0.2, bt + 1.1, 'expoInOut');
      const size = Math.round(fitSize(ctx, X, o.big, 'display', 400, PM ? 330 : 190, PM ? 600 : 520)), G = kGlyph(ctx, X, o.big, 'display', 400, size), y = PM ? f.y + f.h * 0.42 : Math.max(330, f.y - 70), target = 1000;
      if (ka > ON) { X.save(); X.globalAlpha *= ka;
        if (G) { const base = kWidth(G, G.rest), L = G.rest + Math.max(0, target - base) * ks, w = kWidth(G, L); kDraw(X, G, 540 + w / 2, y, L, o.bigColor || lighter(P.bg, '#FFFFFF')); }
        else ctx.text(X, o.big, 540, y, { family: 'display', size, color: o.bigColor || lighter(P.bg, '#FFFFFF'), maxWidth: target });
        X.restore(); }
      if (PM) o.person(X); }
    (o.words || []).forEach((w, i) => { const wt = w.at != null ? w.at : o.s + 0.5 + i * 0.5, e = at(t, wt, wt + 0.4, 'backOut'); if (e <= ON) return;
      const size = w.place === 'above' ? 110 : 92; X.font = ctx.font('display', 400, size); const ww = Math.min(420, X.measureText(w.text).width);
      let cx, cy; if (w.place === 'left') { cx = f.x - 50 - ww / 2; cy = f.cy; } else if (w.place === 'above') { cx = f.cx; cy = f.y - 90; } else { cx = f.x + f.w + 50 + ww / 2; cy = f.cy; }
      cx = cl(cx, 90 + ww / 2, 990 - ww / 2); cy = cl(cy, 260, 1500);
      const side = w.place === 'left' ? -1 : w.place === 'right' ? 1 : 0, R = { x: cx - ww / 2, y: cy - size * 0.75, w: ww, h: size * 0.95 }, col = w.accent ? P.acc : '#FFFFFF';
      const mk = w.mark ? at(t, w.markAt != null ? w.markAt : wt + 0.45, (w.markAt != null ? w.markAt : wt + 0.45) + ({ underline: 0.3, strike: 0.3, arrow: 0.4, band: 0.4, circle: 0.5 }[w.mark] || 0.4), 'sineInOut') : 0;
      X.save(); X.globalAlpha *= cl(e * 2); X.translate(side * (1 - e) * 60, side === 0 ? -(1 - e) * 60 : 0); X.translate(cx, cy); X.rotate((side * 3) * Math.PI / 180); X.translate(-cx, -cy);
      if (w.mark === 'band') roughMark(X, 'band', R, mk, P.acc, i + 3);
      shd(X, 0, size * 0.06, 0.5, size * 0.05);
      ctx.text(X, w.text, cx, cy, { family: 'display', size, color: col, maxWidth: 420, stroke: { width: size * 0.13, color: ink } }); noShd(X);
      if (w.mark && w.mark !== 'band') roughMark(X, w.mark, R, mk, P.acc, i + 3, 9);
      X.restore(); });
    X.restore();
  };

  /* ══════════ ز) الفريق يرسم كلامك: صفحة ويب / لوحة أرقام / محادثة تنبني من نصوصك، والكاميرا تقرّب للتفصيلة ══════════ */

  /* 218 صفحة تنبني من كلامك — نافذة متصفح (أو لوحة أرقام أو تطبيق محادثة) تنبني بلوك بلوك من نصوصك وأرقامك، ثم الكاميرا تقترب من البلوك المهم ويخفت الباقي.
     o: {page='web'|'dashboard'|'chat', title, url, blocks:[{kind:'heading'|'text'|'stat'|'button'|'row'|'msg', text, value, me}], focus (رقم البلوك), s, every=.28, push (وقت الاقتراب)، zoom=1.55, out}
     ⚠ الأرقام والنصوص من عندك بس — لا تخترع أرقام. */
  FX.proofScreen = (ctx, t, o) => {
    const { X, P, E, at } = ctx; if (t < o.s) return;
    const page = o.page || 'web', blocks = o.blocks || [], ev = pick(o, 'every', 0.28), ko = fout(ctx, t, o), W = 860, x0 = 110, top = 420, fg = darker(P.ink, P.bg), bgc = lighter(P.bg, '#FFFFFF');
    const hOf = b => ({ heading: 96, text: 110, stat: 190, button: 110, row: 92, msg: 120, image: 260 }[b.kind] || 100);
    const lay2 = []; let y = top + (page === 'web' ? 110 : 120);
    if (page === 'dashboard') { let col = 0, rowY = y; blocks.forEach((b, i) => { if (b.kind === 'stat') { const w = (W - 60 - 24) / 2; lay2.push({ x: x0 + W - 30 - w - col * (w + 24), y: rowY, w, h: 190 }); col++; if (col === 2) { col = 0; rowY += 214; } }
        else { if (col) { col = 0; rowY += 214; } lay2.push({ x: x0 + 30, y: rowY, w: W - 60, h: hOf(b) }); rowY += hOf(b) + 18; } }); y = rowY + (col ? 214 : 0); }
    else blocks.forEach(b => { const h = hOf(b); lay2.push({ x: x0 + 30, y, w: W - 60, h }); y += h + 22; });
    const winH = Math.max(700, y - top + 40), ka = at(t, o.s, o.s + 0.4, 'backOut'), tp = o.push != null ? o.push : o.s + 0.5 + blocks.length * ev + 0.4, kz = o.focus != null ? at(t, tp, tp + 0.9, 'expoInOut') : 0;
    const F = o.focus != null && lay2[o.focus] ? lay2[o.focus] : null, z = 1 + ((o.zoom || 1.55) - 1) * kz, fx = F ? F.x + F.w / 2 : 540, fy = F ? F.y + F.h / 2 : 960;
    X.save(); X.globalAlpha *= 1 - ko;
    X.translate(540, 960); X.scale(z, z); X.translate(-lerp(540, fx, kz), -lerp(960, fy, kz));
    X.save(); X.translate(540, top + winH / 2); const s0 = 0.9 + 0.1 * ka; X.scale(s0, s0); X.translate(-540, -(top + winH / 2)); X.globalAlpha *= cl(ka * 2);
    shd(X, 50, 20, 0.22); X.fillStyle = bgc; X.beginPath(); X.roundRect(x0, top, W, winH, 34); X.fill(); noShd(X);
    if (page === 'web') { X.fillStyle = mixC(bgc, fg, 0.06); X.beginPath(); X.roundRect(x0, top, W, 84, [34, 34, 0, 0]); X.fill(); ['#EC6A5E', '#F4BF4F', '#61C554'].forEach((c, i) => { X.fillStyle = c; X.beginPath(); X.arc(x0 + 44 + i * 34, top + 42, 11, 0, TAU); X.fill(); });
      X.fillStyle = bgc; X.beginPath(); X.roundRect(x0 + 170, top + 20, W - 210, 44, 22); X.fill(); ctx.text(X, o.url || 'example.com', x0 + 170 + (W - 210) / 2, top + 52, { family: 'num', weight: 500, size: 24, color: P.mut || fg, dir: 'ltr', maxWidth: W - 250 }); }
    else { X.fillStyle = page === 'chat' ? P.acc : mixC(bgc, fg, 0.06); X.beginPath(); X.roundRect(x0, top, W, 92, [34, 34, 0, 0]); X.fill();
      ctx.text(X, o.title || (page === 'chat' ? 'المحادثة' : 'لوحة الأرقام'), x0 + W - 40, top + 60, { family: 'body', weight: 800, size: 38, align: 'right', color: page === 'chat' ? onAcc(P) : fg, maxWidth: W - 80 }); }
    X.restore();
    blocks.forEach((b, i) => { const R = lay2[i], tb = o.s + 0.45 + i * ev, k = at(t, tb, tb + 0.35, 'backOut'); if (k <= ON || !R) return;
      const dim = F && i !== o.focus ? 1 - 0.55 * kz : 1; X.save(); X.globalAlpha *= cl(k * 2) * dim * cl(ka * 2); X.translate(0, (1 - k) * 30);
      const xr = R.x + R.w - 10;
      if (b.kind === 'heading') ctx.text(X, b.text, xr, R.y + 66, { family: 'body', weight: 800, size: 56, align: 'right', color: fg, maxWidth: R.w - 20 });
      else if (b.kind === 'text') { const L = ctx.text.layout(X, b.text, { family: 'body', weight: 500, size: 34, maxWidth: R.w - 20, lineHeight: 1.45 }); ctx.text.drawLayout(X, L, xr, R.y + 6, { align: 'right', color: mixC(fg, bgc, 0.25) }); }
      else if (b.kind === 'stat') { X.fillStyle = mixC(bgc, P.acc, 0.1); X.beginPath(); X.roundRect(R.x, R.y, R.w, R.h, 26); X.fill(); const kv = E.expoOut(pr(t, tb, tb + 1.1)), v = (b.value || 0) * kv;
        ctx.text(X, ctx.num(Math.round(v)), R.x + R.w - 30, R.y + 104, { family: 'num', weight: 800, size: 78, align: 'right', color: P.acc, dir: 'ltr' });
        if (b.text) ctx.text(X, b.text, R.x + R.w - 30, R.y + 156, { family: 'body', weight: 700, size: 30, align: 'right', color: mixC(fg, bgc, 0.3), maxWidth: R.w - 50 }); }
      else if (b.kind === 'button') { X.font = ctx.font('body', 800, 38); const bw = Math.min(R.w, X.measureText(b.text).width + 90); X.fillStyle = P.acc; X.beginPath(); X.roundRect(xr - bw, R.y + 10, bw, 88, 44); X.fill(); ctx.text(X, b.text, xr - bw / 2, R.y + 67, { family: 'body', weight: 800, size: 38, color: onAcc(P) }); }
      else if (b.kind === 'row') { X.fillStyle = mixC(bgc, fg, 0.04); X.beginPath(); X.roundRect(R.x, R.y, R.w, R.h - 10, 18); X.fill(); ctx.text(X, b.text, xr - 20, R.y + 54, { family: 'body', weight: 700, size: 34, align: 'right', color: fg, maxWidth: R.w - 260 });
        if (b.value != null) ctx.text(X, ctx.num(b.value), R.x + 30, R.y + 54, { family: 'num', weight: 800, size: 36, align: 'left', color: P.acc, dir: 'ltr' }); }
      else if (b.kind === 'msg') { X.font = ctx.font('body', 600, 34); const bw = Math.min(R.w * 0.8, X.measureText(b.text).width + 60), me = !!b.me, bx = me ? R.x : xr - bw;
        X.fillStyle = me ? P.acc : mixC(bgc, fg, 0.07); X.beginPath(); X.roundRect(bx, R.y + 8, bw, 92, 30); X.fill(); ctx.text(X, b.text, bx + bw / 2, R.y + 66, { family: 'body', weight: 600, size: 34, color: me ? onAcc(P) : fg, maxWidth: bw - 40 }); }
      X.restore();
      if (F && i === o.focus && kz > ON) { X.save(); X.strokeStyle = P.acc; X.lineWidth = 6 / z; X.globalAlpha *= kz; X.beginPath(); X.roundRect(R.x - 14, R.y - 10, R.w + 28, R.h + 16, 28); X.stroke(); X.restore(); } });
    X.restore();
  };

  /* ══════════ ح) مفاهيم الشرح (Reel Studio motion-concepts) ══════════ */
  const card = (X, x, y, w, h, r, fill, sh) => { if (sh) shd(X, sh, sh * 0.4, 0.18); X.fillStyle = fill; X.beginPath(); X.roundRect(x, y, w, h, r); X.fill(); noShd(X); };

  /* 219 أعمدة تصير خط — نفس الأرقام: أعمدة تكبر، ثم تنكمش لنقاط على رؤوسها ويرتسم خط الاتجاه ومساحة تحته. o: {data:[أرقام], labels:[], title, s, morph (=s+1.6), out} */
  FX.barsToLine = (ctx, t, o) => {
    const { X, P, E, at } = ctx; if (t < o.s) return; const D = o.data || [12, 18, 15, 26, 31, 44], n = D.length, mx = Math.max(...D), ko = fout(ctx, t, o), tm = o.morph != null ? o.morph : o.s + 1.6;
    const L = 150, Rr = 930, base = 1350, top = 700, bw = (Rr - L) / n * 0.56, xs = D.map((_, i) => Rr - (Rr - L) * (i + 0.5) / n), ys = D.map(v => base - (base - top) * v / mx), km = at(t, tm, tm + 0.7, 'expoInOut');
    X.save(); X.globalAlpha *= 1 - ko; if (o.title) ctx.text(X, o.title, 540, 520, { family: 'display', size: 84, color: P.ink, maxWidth: 900, alpha: at(t, o.s, o.s + 0.4) });
    X.strokeStyle = rgba(P.ink, 0.2); X.lineWidth = 3; X.beginPath(); X.moveTo(L - 30, base); X.lineTo(Rr + 30, base); X.stroke();
    D.forEach((v, i) => { const kg = E.backOut(pr(t, o.s + 0.2 + i * 0.1, o.s + 0.75 + i * 0.1)), h = (base - ys[i]) * kg, w = lerp(bw, 26, km), hh = lerp(h, 26, km), yy = lerp(base - h, ys[i] - 13, km);
      if (kg <= 0) return; X.fillStyle = P.acc; X.beginPath(); X.roundRect(xs[i] - w / 2, yy, w, hh, lerp(12, 13, km)); X.fill();
      if (o.labels && o.labels[i]) ctx.text(X, o.labels[i], xs[i], base + 60, { family: 'body', weight: 700, size: 32, color: P.mut || P.ink }); });
    if (km > 0) { const kl = at(t, tm + 0.35, tm + 1.3, 'cubicInOut'), m = Math.max(1, kl * (n - 1));
      X.save(); X.beginPath(); X.moveTo(xs[0], base); for (let i = 0; i <= Math.floor(m); i++) X.lineTo(xs[i], ys[i]); const fi = Math.floor(m), fr = m - fi; if (fi < n - 1) X.lineTo(lerp(xs[fi], xs[fi + 1], fr), lerp(ys[fi], ys[fi + 1], fr));
      X.lineTo(fi < n - 1 ? lerp(xs[fi], xs[fi + 1], fr) : xs[n - 1], base); X.closePath(); X.fillStyle = rgba(P.acc, 0.16 * kl); X.fill(); X.restore();
      ctx.drawPath(X, xs.map((x, i) => [x, ys[i]]), kl, { width: 10, color: P.acc, tip: { r: 14, color: P.acc } }); }
    X.restore();
  };

  /* 220 نبض الأتمتة — كروت خطوات من فوق لتحت (محفّز ← خطوات ← نتيجة) موصولة بخط، نبضة ضوء تمشي وتولّع كل خطوة، وكرت النتيجة ينط. o: {steps:[نصوص], icons, s, every=.6, out} */
  FX.automationFlow = (ctx, t, o) => {
    const { X, P, E, at } = ctx; if (t < o.s) return; const S = o.steps || ['رسالة جديدة', 'الذكاء يقرأها', 'يرد تلقائياً', 'عميل راضي'], n = S.length, ev = o.every || 0.6, ko = fout(ctx, t, o);
    const gap = Math.min(300, 1100 / n), y0 = 960 - gap * (n - 1) / 2, ys = S.map((_, i) => y0 + i * gap), bg = lighter(P.bg, '#FFFFFF'), fg = darker(P.ink, P.bg), tp = i => o.s + 0.6 + i * ev;
    X.save(); X.globalAlpha *= 1 - ko;
    X.strokeStyle = rgba(fg, 0.18); X.lineWidth = 8; X.setLineDash([2, 16]); X.lineCap = 'round'; X.beginPath(); X.moveTo(540, ys[0]); X.lineTo(540, ys[n - 1]); X.stroke(); X.setLineDash([]);
    const kp = pr(t, tp(0), tp(n - 1)); if (kp > 0) { X.strokeStyle = P.acc; X.beginPath(); X.moveTo(540, ys[0]); X.lineTo(540, lerp(ys[0], ys[n - 1], kp)); X.stroke();
      if (kp < 1) { const py = lerp(ys[0], ys[n - 1], kp), g = X.createRadialGradient(540, py, 0, 540, py, 60); g.addColorStop(0, rgba(P.acc, 0.9)); g.addColorStop(1, rgba(P.acc, 0)); X.fillStyle = g; X.fillRect(480, py - 60, 120, 120); } }
    S.forEach((s, i) => { const ka = E.backOut(pr(t, o.s + i * 0.12, o.s + 0.45 + i * 0.12)), lit = pr(t, tp(i), tp(i) + 0.25), last = i === n - 1, pop = last ? 1 + 0.12 * Math.sin(Math.PI * pr(t, tp(i), tp(i) + 0.4)) : 1;
      if (ka <= ON) return; const w = last ? 640 : 560, h = 150; X.save(); X.translate(540, ys[i]); X.scale(ka * pop, ka * pop);
      card(X, -w / 2, -h / 2, w, h, 40, lit > 0.5 ? (last ? P.acc : bg) : bg, 30); if (lit > 0) { X.strokeStyle = P.acc; X.lineWidth = 6; X.globalAlpha *= lit; X.beginPath(); X.roundRect(-w / 2, -h / 2, w, h, 40); X.stroke(); X.globalAlpha /= lit || 1; }
      X.fillStyle = lit > 0.5 ? (last ? onAcc(P) : P.acc) : rgba(fg, 0.25); X.beginPath(); X.arc(w / 2 - 70, 0, 30, 0, TAU); X.fill();
      ctx.text(X, String(i + 1), w / 2 - 70, 12, { family: 'num', weight: 800, size: 34, color: lit > 0.5 && last ? P.acc : '#FFFFFF', dir: 'ltr' });
      ctx.text(X, s, w / 2 - 130, 16, { family: 'body', weight: 800, size: 46, align: 'right', color: lit > 0.5 && last ? onAcc(P) : fg, maxWidth: w - 170 }); X.restore(); });
    X.restore();
  };

  /* 221 مسار بشرط — كرت المدخل فوق، معيّن الشرط بالنص، ومنه فرعين (نعم يمين / لا يسار)؛ النبضة تختار فرع واحد والثاني يخفت. o: {input, cond, yes, no, pick='yes'|'no', s, decide (=s+1.4), out} */
  FX.branchPath = (ctx, t, o) => {
    const { X, P, E, at } = ctx; if (t < o.s) return; const ko = fout(ctx, t, o), bg = lighter(P.bg, '#FFFFFF'), fg = darker(P.ink, P.bg), td = o.decide != null ? o.decide : o.s + 1.4, yes = (o.pick || 'yes') === 'yes';
    const kd = at(t, td, td + 0.7, 'cubicInOut'), ka = i => E.backOut(pr(t, o.s + i * 0.25, o.s + 0.45 + i * 0.25));
    X.save(); X.globalAlpha *= 1 - ko;
    const br = (sx, ex, on) => { X.strokeStyle = on ? P.acc : rgba(fg, 0.2); X.lineWidth = 9; X.lineCap = 'round'; X.beginPath(); X.moveTo(540, 1040); X.bezierCurveTo(540, 1160, ex, 1120, ex, 1250); X.stroke(); };
    if (ka(2) > ON) { X.globalAlpha *= cl(ka(2)); br(540, 790, false); br(540, 290, false); if (kd > 0) { X.save(); X.beginPath(); X.rect(0, 1000, 1080, 260 * kd); X.clip(); br(540, yes ? 790 : 290, true); X.restore(); } X.globalAlpha /= cl(ka(2)) || 1; }
    if (ka(0) > ON) { X.save(); X.translate(540, 560); X.scale(ka(0), ka(0)); card(X, -330, -80, 660, 160, 40, bg, 30); ctx.text(X, o.input || 'طلب جديد', 0, 16, { family: 'body', weight: 800, size: 50, color: fg, maxWidth: 600 }); X.restore();
      X.strokeStyle = rgba(fg, 0.25); X.lineWidth = 9; X.beginPath(); X.moveTo(540, 640); X.lineTo(540, 800 * 1); X.stroke(); }
    if (ka(1) > ON) { X.save(); X.translate(540, 920); X.scale(ka(1), ka(1)); X.rotate(Math.PI / 4); card(X, -105, -105, 210, 210, 26, P.acc, 30); X.rotate(-Math.PI / 4);
      ctx.text(X, o.cond || 'أكثر من ١٠٠؟', 0, 14, { family: 'body', weight: 800, size: 38, color: onAcc(P), maxWidth: 250 }); X.restore(); }
    [[790, o.yes || 'نعم: خصم فوري', true], [290, o.no || 'لا: رسالة شكر', false]].forEach(([x, s, isY], j) => { const k = ka(2 + j * 0.4); if (k <= ON) return; const on = isY === yes, dim = 1 - 0.6 * kd * (on ? 0 : 1), pop = on ? 1 + 0.1 * Math.sin(Math.PI * pr(t, td + 0.6, td + 1)) : 1;
      X.save(); X.globalAlpha *= dim; X.translate(x, 1340); X.scale(k * pop, k * pop); card(X, -230, -90, 460, 180, 40, on && kd > 0.9 ? P.acc : bg, 30);
      ctx.text(X, s, 0, 16, { family: 'body', weight: 800, size: 42, color: on && kd > 0.9 ? onAcc(P) : fg, maxWidth: 410 }); X.restore(); });
    X.restore();
  };

  /* 222 فلترة الكروت — شبكة كروت (أسماء/خيارات بوسوم)، شروط تطلع وحدة وحدة، واللي ما يطابق يبهت ويصغر بعلامة ✕، والباقين يتلوّنون. o: {cards:[{name, tags:[]}], criteria:[وسوم], s, every=.8, out} */
  FX.identityFilter = (ctx, t, o) => {
    const { X, P, E, at } = ctx; if (t < o.s) return; const ko = fout(ctx, t, o), bg = lighter(P.bg, '#FFFFFF'), fg = darker(P.ink, P.bg), ev = o.every || 0.8;
    const C = o.cards || [{ name: 'سارة', tags: ['تصميم', 'خبرة'] }, { name: 'خالد', tags: ['برمجة'] }, { name: 'نورة', tags: ['تصميم', 'خبرة', 'عربي'] }, { name: 'فهد', tags: ['تصميم'] }, { name: 'ريم', tags: ['تصميم', 'خبرة', 'عربي'] }, { name: 'علي', tags: ['خبرة'] }];
    const Q = o.criteria || ['تصميم', 'خبرة', 'عربي'], cw = 400, chh = 230;
    X.save(); X.globalAlpha *= 1 - ko;
    Q.forEach((q, j) => { const k = E.backOut(pr(t, o.s + 0.8 + j * ev, o.s + 1.1 + j * ev)); if (k <= ON) return; X.font = ctx.font('body', 800, 38); const w = X.measureText(q).width + 70, x = 540 + (Q.length - 1) * 110 - j * 220;
      X.save(); X.translate(x, 470); X.scale(k, k); card(X, -w / 2, -38, w, 76, 38, P.acc, 16); ctx.text(X, q, 0, 13, { family: 'body', weight: 800, size: 38, color: onAcc(P) }); X.restore(); });
    C.forEach((c, i) => { const col = i % 2, row = Math.floor(i / 2), x = col ? 310 : 770, y = 700 + row * (chh + 40), ka = E.backOut(pr(t, o.s + i * 0.07, o.s + 0.4 + i * 0.07)); if (ka <= ON) return;
      let fail = -1; Q.forEach((q, j) => { if (fail < 0 && !c.tags.includes(q)) fail = j; }); const kf = fail >= 0 ? at(t, o.s + 1.0 + fail * ev, o.s + 1.4 + fail * ev, 'cubicOut') : 0, kw = fail < 0 ? at(t, o.s + 1.0 + Q.length * ev, o.s + 1.4 + Q.length * ev) : 0;
      X.save(); X.translate(x, y); const s = ka * (1 - 0.12 * kf); X.scale(s, s); X.globalAlpha *= 1 - 0.6 * kf;
      card(X, -cw / 2, -chh / 2, cw, chh, 34, kw > 0.5 ? P.acc : bg, 26); X.fillStyle = kw > 0.5 ? onAcc(P) : rgba(fg, 0.12); X.beginPath(); X.arc(cw / 2 - 70, -35, 40, 0, TAU); X.fill();
      ctx.text(X, c.name, cw / 2 - 130, -20, { family: 'body', weight: 800, size: 46, align: 'right', color: kw > 0.5 ? onAcc(P) : fg, maxWidth: 230 });
      ctx.text(X, c.tags.join(' · '), cw / 2 - 30, 60, { family: 'body', weight: 600, size: 28, align: 'right', color: kw > 0.5 ? onAcc(P) : rgba(fg, 0.6), maxWidth: cw - 60 });
      if (kf > 0) { X.strokeStyle = '#C8402F'; X.lineWidth = 10; X.lineCap = 'round'; X.globalAlpha = kf; const r = 36 * kf; X.beginPath(); X.moveTo(-cw / 2 + 50 - r, -r - 40); X.lineTo(-cw / 2 + 50 + r, r - 40); X.moveTo(-cw / 2 + 50 + r, -r - 40); X.lineTo(-cw / 2 + 50 - r, r - 40); X.stroke(); }
      X.restore(); });
    X.restore();
  };

  /* 223 طلب واحد وكروت كثيرة — صندوق طلب ينكتب فيه سطر، زر إرسال ينضغط، وبعده كروت نتائج تنفتح مروحة تحت. o: {prompt, results:[نصوص], s, type (مدة الكتابة=1.2), out} */
  FX.promptCards = (ctx, t, o) => {
    const { X, P, E, at } = ctx; if (t < o.s) return; const ko = fout(ctx, t, o), bg = lighter(P.bg, '#FFFFFF'), fg = darker(P.ink, P.bg), str = o.prompt || 'اكتب لي أفكار محتوى عن القهوة', tt = o.type || 1.2;
    const R = o.results || ['فيديو: ٣ أخطاء بالتحميص', 'بوست: قصة أول فنجان', 'ريل: قهوة بدقيقة', 'ستوري: سؤال اليوم'], ts = o.s + 0.3 + tt + 0.25;
    X.save(); X.globalAlpha *= 1 - ko; const ka = E.backOut(pr(t, o.s, o.s + 0.4)), up = at(t, ts, ts + 0.6, 'expoInOut'), by = lerp(900, 520, up);
    X.save(); X.translate(540, by); X.scale(ka, ka); card(X, -440, -85, 880, 170, 85, bg, 40);
    const sub = ctx.text.typeSub(str, pr(t, o.s + 0.3, o.s + 0.3 + tt)); ctx.text(X, sub, 340, 14, { family: 'body', weight: 600, size: 38, align: 'right', color: fg, maxWidth: 680 });
    const press = 1 - 0.15 * Math.sin(Math.PI * pr(t, ts - 0.15, ts + 0.05)); X.save(); X.translate(-360, 0); X.scale(press, press); X.fillStyle = P.acc; X.beginPath(); X.arc(0, 0, 56, 0, TAU); X.fill();
    X.strokeStyle = onAcc(P); X.lineWidth = 9; X.lineCap = 'round'; X.lineJoin = 'round'; X.beginPath(); X.moveTo(0, 24); X.lineTo(0, -22); X.moveTo(-18, -4); X.lineTo(0, -22); X.lineTo(18, -4); X.stroke(); X.restore(); X.restore();
    R.forEach((r, i) => { const k = E.backOut(pr(t, ts + 0.35 + i * 0.14, ts + 0.8 + i * 0.14)); if (k <= ON) return; const y = 760 + i * 200, rot = (i % 2 ? -1.5 : 1.5) * (1 - k) * 6;
      X.save(); X.translate(540, y + (1 - k) * -120); X.rotate(rot * Math.PI / 180); X.scale(k, k); card(X, -400, -80, 800, 160, 32, bg, 30); X.fillStyle = P.acc; X.fillRect(380, -80, 20, 160);
      ctx.text(X, r, 340, 14, { family: 'body', weight: 700, size: 42, align: 'right', color: fg, maxWidth: 700 }); X.restore(); });
    X.restore();
  };

  /* 224 فوضى تصير علامة — كلمات وأشكال متناثرة تطفو بفوضى، ثم تنجذب للنص وتصير دائرة العلامة، وبعدها الاسم يطلع جنبها. o: {name, items:[كلمات], s, gather (=s+1.3), out} */
  FX.chaosToBrand = (ctx, t, o) => {
    const { X, P, E, at } = ctx; if (t < o.s) return; const ko = fout(ctx, t, o), tg = o.gather != null ? o.gather : o.s + 1.3, kg = at(t, tg, tg + 0.8, 'expoInOut'), I = o.items || ['أفكار', 'ألوان', 'خطوط', 'شعار', 'صور', 'رسائل', 'قصص', 'أسماء'], fg = darker(P.ink, P.bg);
    X.save(); X.globalAlpha *= 1 - ko; const c = [540, 900];
    for (let i = 0; i < 26; i++) { const isW = i < I.length, a0 = rnd(i, 1) * TAU, rr = 260 + 260 * rnd(i, 2), dx = Math.cos(a0) * rr + 40 * n1(t * 0.8 + i, 5), dy = Math.sin(a0) * rr * 1.5 + 40 * n1(t * 0.7 + i, 9);
      const ka = at(t, o.s + i * 0.03, o.s + 0.3 + i * 0.03), x = lerp(c[0] + dx, c[0], kg), y = lerp(c[1] + dy, c[1], kg), rot = lerp((rnd(i, 3) - 0.5) * 0.8 + 0.2 * n1(t + i, 2), 0, kg), sc = 1 - 0.85 * kg;
      if (ka <= 0 || sc < 0.06) continue; X.save(); X.globalAlpha *= ka * (1 - kg * 0.9); X.translate(x, y); X.rotate(rot); X.scale(sc, sc);
      if (isW) ctx.text(X, I[i], 0, 0, { family: 'display', size: 70, color: i % 3 ? fg : P.acc }); else { X.fillStyle = [P.acc, fg, P.hi || P.acc][i % 3]; if (i % 2) { X.beginPath(); X.arc(0, 0, 24, 0, TAU); X.fill(); } else X.fillRect(-22, -22, 44, 44); }
      X.restore(); }
    const kb = E.backOut(pr(t, tg + 0.55, tg + 1.0)), kn = at(t, tg + 0.9, tg + 1.4, 'expoOut'), name = o.name || 'آي أو استوديو';
    if (kb > ON) { X.font = ctx.font('display', 400, 120); const nw = X.measureText(name).width, mx = 540 + (nw + 40) / 2 * kn;
      X.save(); X.translate(mx, 900); X.scale(kb, kb); X.fillStyle = P.acc; X.beginPath(); X.arc(0, 0, 110, 0, TAU); X.fill(); X.strokeStyle = onAcc(P); X.lineWidth = 12; X.beginPath(); X.arc(0, 0, 60, Math.PI * 0.15, Math.PI * 1.85); X.stroke(); X.restore();
      if (kn > ON) { X.save(); X.beginPath(); X.rect(0, 750, mx - 130, 300); X.clip(); ctx.text(X, name, mx - 150, 940 + (1 - kn) * 0, { family: 'display', size: 120, align: 'right', color: fg, alpha: kn }); X.restore(); } }
    X.restore();
  };

  /* 225 طبقات النظام — ألواح متساوية القياس تنبني من تحت لفوق (البيانات ← الأتمتة ← الواجهة ← العميل)، كل لوح باسمه، وبعدها تنفصل شوي عن بعض. o: {layers:[], s, every=.35, split (=بعد البناء), out} */
  FX.systemLayers = (ctx, t, o) => {
    const { X, P, E, at } = ctx; if (t < o.s) return; const Ls = o.layers || ['البيانات', 'الأتمتة', 'الواجهة', 'العميل'], n = Ls.length, ev = o.every || 0.35, ko = fout(ctx, t, o), fg = darker(P.ink, P.bg);
    const tsp = o.split != null ? o.split : o.s + 0.4 + n * ev + 0.3, ks = at(t, tsp, tsp + 0.7, 'expoInOut'), bg = lighter(P.bg, '#FFFFFF');
    X.save(); X.globalAlpha *= 1 - ko;
    for (let i = 0; i < n; i++) { const k = E.backOut(pr(t, o.s + 0.3 + i * ev, o.s + 0.75 + i * ev)); if (k <= ON) continue; const yc = 1300 - i * (120 + 110 * ks) - (1 - k) * -160, col = mixC(bg, P.acc, 0.15 + 0.7 * i / Math.max(1, n - 1));
      const w = 400, h = 125, d = 34; X.save(); X.globalAlpha *= cl(k * 2); X.translate(540, yc);
      X.fillStyle = mixC(col, '#000000', 0.25); poly(X, [[-w, 0], [0, h], [0, h + d], [-w, d]]); X.fill(); X.fillStyle = mixC(col, '#000000', 0.12); poly(X, [[w, 0], [0, h], [0, h + d], [w, d]]); X.fill();
      shd(X, 20, 10, 0.15); X.fillStyle = col; poly(X, [[0, -h], [w, 0], [0, h], [-w, 0]]); X.fill(); noShd(X);
      ctx.text(X, Ls[i], 0, 14, { family: 'body', weight: 800, size: 46, color: lum(col) > 150 ? fg : '#FFFFFF', maxWidth: 400 }); X.restore(); }
    X.restore();
  };

  /* 226 زر يصير نافذة — مؤشر ينقر زر، والزر نفسه يتمدد ويصير نافذة كبيرة فيها المحتوى (عنوان وسطور). o: {button='جرّب الحين', title, lines:[نصوص], s, tap (=s+.8), out} */
  FX.buttonWindow = (ctx, t, o) => {
    const { X, P, E, at } = ctx; if (t < o.s) return; const ko = fout(ctx, t, o), tap = o.tap != null ? o.tap : o.s + 0.8, kx = at(t, tap + 0.1, tap + 0.75, 'expoInOut'), bg = lighter(P.bg, '#FFFFFF'), fg = darker(P.ink, P.bg);
    X.save(); X.globalAlpha *= 1 - ko; const ka = E.backOut(pr(t, o.s, o.s + 0.4)), press = 1 - 0.08 * Math.sin(Math.PI * pr(t, tap - 0.08, tap + 0.1));
    X.font = ctx.font('body', 800, 48); const bw = X.measureText(o.button || 'جرّب الحين').width + 120, R0 = { x: 540 - bw / 2, y: 960 - 60, w: bw, h: 120, r: 60 }, R1 = { x: 110, y: 460, w: 860, h: 1000, r: 40 };
    const R = { x: lerp(R0.x, R1.x, kx), y: lerp(R0.y, R1.y, kx), w: lerp(R0.w, R1.w, kx), h: lerp(R0.h, R1.h, kx), r: lerp(R0.r, R1.r, kx) };
    X.save(); X.translate(540, 960); X.scale(ka * press, ka * press); X.translate(-540, -960); card(X, R.x, R.y, R.w, R.h, R.r, kx > 0.4 ? mixC(P.acc, bg, cl((kx - 0.4) / 0.3)) : P.acc, 40);
    if (kx < 0.3) ctx.text(X, o.button || 'جرّب الحين', 540, 977, { family: 'body', weight: 800, size: 48, color: onAcc(P), alpha: 1 - kx / 0.3 });
    if (kx > 0.7) { const kc = (kx - 0.7) / 0.3; X.fillStyle = rgba(P.acc, 0.9); X.beginPath(); X.roundRect(R.x, R.y, R.w, 110, [40, 40, 0, 0]); X.globalAlpha *= kc; X.fill();
      ctx.text(X, o.title || 'لوحة التحكم', R.x + R.w - 40, R.y + 72, { family: 'body', weight: 800, size: 44, align: 'right', color: onAcc(P) });
      (o.lines || ['مشاريعك كلها بمكان واحد', 'تقارير تتحدث لحالها', 'فريقك يشتغل معك']).forEach((s, i) => { const kl = at(t, tap + 0.75 + i * 0.15, tap + 1.1 + i * 0.15); X.save(); X.globalAlpha *= kl;
        X.fillStyle = rgba(fg, 0.06); X.beginPath(); X.roundRect(R.x + 40, R.y + 160 + i * 150, R.w - 80, 120, 24); X.fill(); X.fillStyle = P.acc; X.beginPath(); X.arc(R.x + R.w - 90, R.y + 220 + i * 150, 22, 0, TAU); X.fill();
        ctx.text(X, s, R.x + R.w - 140, R.y + 234 + i * 150, { family: 'body', weight: 700, size: 40, align: 'right', color: fg, maxWidth: R.w - 220 }); X.restore(); }); }
    X.restore();
    const kc = at(t, o.s + 0.2, tap, 'cubicInOut'), cx = lerp(820, 560, kc), cy = lerp(1300, 985, kc), ca = 1 - at(t, tap + 0.3, tap + 0.5);
    if (ca > 0) { X.save(); X.globalAlpha *= ca; X.translate(cx, cy); const s2 = press; X.scale(s2, s2); shd(X, 10, 4, 0.3); X.fillStyle = '#FFFFFF'; X.strokeStyle = '#111111'; X.lineWidth = 4;
      poly(X, [[0, 0], [0, 70], [18, 54], [32, 84], [44, 78], [30, 50], [54, 50]]); X.fill(); noShd(X); X.stroke(); X.restore(); }
    X.restore();
  };

  /* 227 شريط الأدوات — شريط أدوات مثل الماك؛ المؤشر يمر على الأيقونات وحدة وحدة، الأيقونة تكبر وجيرانها شوي، وفوقها اسم الأداة. o: {tools:[{name, color}], s, every=.7, y=1100, out} */
  FX.magneticDock = (ctx, t, o) => {
    const { X, P, E, at } = ctx; if (t < o.s) return; const ko = fout(ctx, t, o), Tl = o.tools || [{ name: 'التصميم' }, { name: 'الكتابة' }, { name: 'الصوت' }, { name: 'المونتاج' }, { name: 'النشر' }], n = Tl.length, ev = o.every || 0.7, y = pick(o, 'y', 1100);
    const cols = [P.acc, P.clay || P.acc, P.hi || P.acc, darker(P.ink, P.bg), P.mut || P.acc], kin = E.backOut(pr(t, o.s, o.s + 0.45));
    const hov = cl((t - o.s - 0.6) / ev, 0, n - 1), base = 130, sc = Tl.map((_, i) => 1 + 0.7 * Math.exp(-Math.pow(i - hov, 2) / 0.6) * at(t, o.s + 0.5, o.s + 0.8));
    const tot = sc.reduce((a, s) => a + base * s + 26, -26); let x = 540 + tot / 2;
    X.save(); X.globalAlpha *= 1 - ko; X.translate(540, y); X.scale(kin, kin); X.translate(-540, -y);
    card(X, 540 - tot / 2 - 40, y - 40, tot + 80, base + 80, 56, rgba(lighter(P.bg, '#FFFFFF'), 0.85), 40);
    Tl.forEach((tl, i) => { const s = base * sc[i]; x -= s; const cx = x + s / 2, cy = y + base + 0 - s / 2 + 20;
      X.fillStyle = tl.color || cols[i % cols.length]; X.beginPath(); X.roundRect(x, cy - s / 2, s, s, s * 0.24); X.fill();
      ctx.text(X, (tl.icon || (tl.name || '').replace(/^ال/, '').slice(0, 1)), cx, cy + s * 0.18, { family: 'display', size: s * 0.5, color: '#FFFFFF' });
      const kl = cl(1 - Math.abs(i - hov) * 2.2) * at(t, o.s + 0.5, o.s + 0.8); if (kl > ON) { X.save(); X.globalAlpha *= kl; X.font = ctx.font('body', 800, 40); const w = X.measureText(tl.name).width + 50;
        card(X, cx - w / 2, cy - s / 2 - 100, w, 70, 35, darker(P.ink, P.bg), 0); ctx.text(X, tl.name, cx, cy - s / 2 - 52, { family: 'body', weight: 800, size: 40, color: lighter(P.bg, '#FFFFFF') }); X.restore(); }
      x -= 26; });
    X.restore();
  };

  /* ══════════ ط) ستايل «لقطة» (سؤال يومي) — صورة كاملة، علامة بأقواس زوايا، أيقونة سؤال جنب الراس، ولوح غامق تحت فيه سؤال بخط عريض ══════════
     تصميم أصلي بكودنا (228–232). الألوان: اللوح غامق ثابت (يقرا فوق أي صورة) والشرطة بلون الهوية. كل الكلام داخل المنطقة الآمنة لريلز 9:16 (بين 1100 و1620، وعرض ≤ 860). */
  // علامة بأقواس زوايا: الأقواس ترتسم (k من 0 لـ1) والكلمة تطلع بينها
  const bracketMark = (ctx, X, str, x, y, size, k, col, sub) => {
    if (k <= ON || !str) return; X.save(); X.font = ctx.font('body', 800, size); const w = X.measureText(str).width + size * 0.9, h = size * 1.45, L = size * 0.42, ka = cl(k * 1.4), kt = cl(k * 2 - 0.6);
    X.strokeStyle = col; X.lineWidth = Math.max(2.5, size * 0.07); X.lineCap = 'square';
    const corner = (cx, cy, sx, sy) => { X.beginPath(); X.moveTo(cx, cy + sy * L * ka); X.lineTo(cx, cy); X.lineTo(cx + sx * L * ka, cy); X.stroke(); };
    corner(x - w / 2, y - h / 2, 1, 1); corner(x + w / 2, y + h / 2, -1, -1);
    X.globalAlpha *= kt; ctx.text(X, str, x, y + size * 0.36 + (1 - kt) * 8, { family: 'body', weight: 800, size, color: col });
    if (sub) ctx.text(X, sub, x, y + h / 2 + size * 0.62, { family: 'num', weight: 600, size: size * 0.42, color: rgba(col, 0.75), dir: 'ltr' });
    X.restore(); };
  // اللوح الغامق تحت (تدرّج يطلع لفوق)
  const qPanel = (X, top, a, col) => { const c = col || '#0E0F12', g = X.createLinearGradient(0, top - 260, 0, top + 140); g.addColorStop(0, rgba(c, 0)); g.addColorStop(0.55, rgba(c, 0.78)); g.addColorStop(1, rgba(c, 0.96));
    X.save(); X.globalAlpha *= a; X.fillStyle = g; X.fillRect(0, top - 260, 1080, 400); X.fillStyle = rgba(c, 0.96); X.fillRect(0, top + 139, 1080, 1920 - top); X.restore(); };
  const qLines = (ctx, X, t, text, y0, size, tWord, col, maxW) => { const lines = String(text).split('\n'); let wi = 0, y = y0;
    lines.forEach(line => { const L = ctx.text.layout(X, line, { family: 'body', weight: 800, size, maxWidth: maxW, lineHeight: 1.15 });
      ctx.text.drawLayout(X, L, 540, y, { color: col, perWord: i => { const k = ctx.at(t, tWord(wi + i), tWord(wi + i) + 0.3, 'backOut'); return { alpha: cl(k * 2), dy: (1 - k) * 36, scale: 0.9 + 0.1 * k }; } });
      wi += L.lines.reduce((a, l) => a + (l.words ? l.words.length : 0), 0) || line.trim().split(/\s+/).length; y += L.height; });
    return y; };

  /* 228 كرت السؤال — لوح غامق يطلع من تحت (تدرّج)، علامتك الصغيرة بأقواس، شرطة بلون الهوية، والسؤال بخط عريض سطرين ينكتب كلمة كلمة (كلمات كاملة).
     o: {text='المسار اليسار…\nمنو الصح؟' (\n = سطر جديد), brand=حساب الهوية (theme.handle), s, step=.12 (أو line لأوقات الصوت), panel=.42 (نسبة الطول), size=96, dash, panelColor, out} */
  FX.questionCard = (ctx, t, o) => {
    const { X, P, at } = ctx; if (t < o.s) return; const ko = fout(ctx, t, o), top = 1920 * (1 - (o.panel || 0.42)), ka = at(t, o.s, o.s + 0.45, 'cubicOut');
    X.save(); X.globalAlpha *= 1 - ko; qPanel(X, top + (1 - ka) * 120, ka, o.panelColor);
    bracketMark(ctx, X, o.brand == null ? (ctx.P.handle || '') : o.brand, 540, top + 90, 34, at(t, o.s + 0.15, o.s + 0.6), '#FFFFFF');
    const kd = at(t, o.s + 0.3, o.s + 0.6, 'expoOut'); X.fillStyle = o.dash || P.acc; X.beginPath(); X.roundRect(540 - 38 * kd, top + 160, 76 * kd, 9, 4.5); X.fill();
    const step = pick(o, 'step', 0.12), tw = o.line != null ? (i => ctx.wordTime(o.line, i).s) : (i => o.s + 0.5 + i * step);
    qLines(ctx, X, t, o.text || 'المسار اليسار…\nمنو الصح؟', top + 200 + (o.size || 96) * 0.62, o.size || 96, tw, '#FFFFFF', 860); // first line clears the accent dash
    X.restore();
  };

  /* 229 أيقونة تطفو — فقاعة بيضا (؟ · ! · zZz · لمبة) تفرقع جنب راس الشخص وتتمايل بهدوء. مع o.face تلحق الوجه (فوق يمينه)، بلاه o.x/o.y.
     o: {icon='?'|'!'|'zzz'|'bulb'|'نص قصير', s, face, x=760, y=560, size=120, out} */
  FX.iconPop = (ctx, t, o) => {
    const { X, P, E } = ctx; if (t < o.s) return; const ko = fout(ctx, t, o, 0.3), f = o.face ? faceOf(o, t, null) : null, sz = o.size || 120;
    const x = f ? f.x + f.w * 0.95 + sz * 0.3 : pick(o, 'x', 760), y = (f ? f.y + f.h * 0.08 : pick(o, 'y', 560)) + 9 * Math.sin(TAU * (t - o.s) / 1.7);
    const k = E.backOut(pr(t, o.s, o.s + 0.42)) * (1 - ko), rot = lerp(-14, 0, E.cubicOut(pr(t, o.s, o.s + 0.5))) + 4 * Math.sin(TAU * (t - o.s) / 2.3); if (k <= ON) return;
    const ic = o.icon || '?', ink = '#16171A';
    X.save(); X.translate(x, y); X.rotate(rot * Math.PI / 180); X.scale(k, k); shd(X, 22, 10, 0.3);
    X.fillStyle = '#FFFFFF'; X.beginPath(); X.roundRect(-sz / 2, -sz / 2, sz, sz, sz * 0.26); X.fill(); X.beginPath(); X.moveTo(-sz * 0.38, sz * 0.36); X.lineTo(-sz * 0.58, sz * 0.62); X.lineTo(-sz * 0.12, sz * 0.46); X.closePath(); X.fill(); noShd(X);
    if (ic === 'zzz') [[-18, 22, 0.34], [6, -2, 0.44], [26, -26, 0.54]].forEach(([dx, dy, s2], j) => { const kz = cl((t - o.s) * 2 - j * 0.35); if (kz > 0) ctx.text(X, 'z', dx, dy + sz * s2 * 0.35, { family: 'num', weight: 900, size: sz * s2, color: ink, dir: 'ltr', alpha: kz }); });
    else if (ic === 'bulb') { X.strokeStyle = ink; X.fillStyle = P.acc; X.lineWidth = sz * 0.06; X.beginPath(); X.arc(0, -sz * 0.08, sz * 0.24, Math.PI * 0.8, Math.PI * 2.2); X.lineTo(sz * 0.1, sz * 0.18); X.lineTo(-sz * 0.1, sz * 0.18); X.closePath(); X.fill(); X.stroke();
      X.beginPath(); X.moveTo(-sz * 0.09, sz * 0.26); X.lineTo(sz * 0.09, sz * 0.26); X.moveTo(-sz * 0.06, sz * 0.33); X.lineTo(sz * 0.06, sz * 0.33); X.stroke(); }
    else ctx.text(X, ic, 0, sz * 0.28, { family: /^[?!؟]$/.test(ic) ? 'num' : 'body', weight: 900, size: ic.length > 1 ? sz * 0.36 : sz * 0.78, color: ink, dir: /^[?!]$/.test(ic) ? 'ltr' : undefined, maxWidth: sz * 0.86 });
    X.restore();
  };

  /* 230 صورة بعمق 2.5D — صورة ثابتة تتحرك ببطء (زوم وتحريك) بطبقتين: الشخص/المقدمة تتحرك أكثر من الخلفية (بارالاكس) مع نَفَس خفيف.
     مع o.person (قصّ) المقدمة = الشخص؛ بلاه المقدمة = النص التحتاني من الصورة بحافة ناعمة (بديل بسيط). o: {draw, person, s, dur=5, from={z:1,x:0,y:0}, to={z:1.12,x:-30,y:-24}, parallax=1.7, breath=true} */
  FX.kenBurns25D = (ctx, t, o) => {
    const { X } = ctx, k = sst(pr(t, o.s || 0, (o.s || 0) + (o.dur || 5))), A = o.from || { z: 1, x: 0, y: 0 }, B = o.to || { z: 1.12, x: -30, y: -24 }, par = o.parallax || 1.7;
    const br = o.breath === false ? 1 : 1 + 0.004 * Math.sin(TAU * t / 3.2), z = lerp(A.z || 1, B.z || 1, k) * br, dx = lerp(A.x || 0, B.x || 0, k), dy = lerp(A.y || 0, B.y || 0, k);
    const tf = (Y, zz, ox, oy) => { Y.translate(540 + ox, 1000 + oy); Y.scale(zz, zz); Y.translate(-540, -1000); };
    X.save(); tf(X, z + 0.02, dx, dy); o.draw(X); X.restore();
    const zf = 1 + (z - 1) * par + 0.02, fx = dx * par, fy = dy * par;
    if (hasP(o)) { X.save(); tf(X, zf, fx, fy); o.person(X); X.restore(); return; }
    const C = offC(X, 'kb'); C.Y.save(); tf(C.Y, zf, fx, fy); o.draw(C.Y); C.Y.restore();
    C.Y.save(); C.Y.globalCompositeOperation = 'destination-in'; const g = C.Y.createLinearGradient(0, 1050, 0, 1450); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)'); C.Y.fillStyle = g; C.Y.fillRect(0, 0, 1080, 1920); C.Y.restore();
    putC(X, C.c);
  };

  /* 231 علامة بأقواس — اسمك/علامتك بين أقواس زوايا ترتسم، وتحتها معرّف صغير. تنفع ختم ثابت بزاوية الشاشة. o: {text='آي أو استوديو', sub (@handle), s, x=150, y=170, size=40, color='#FFFFFF', out} */
  FX.brandBracket = (ctx, t, o) => {
    const { X, at } = ctx; if (t < o.s) return; const ko = fout(ctx, t, o); X.save(); X.globalAlpha *= 1 - ko; shd(X, 12, 2, 0.35);
    bracketMark(ctx, X, o.text || ctx.P.handle || '', pick(o, 'x', 150), pick(o, 'y', 170), o.size || 40, at(t, o.s, o.s + 0.6, 'cubicOut'), o.color || '#FFFFFF', o.sub); noShd(X); X.restore();
  };

  /* 232 كرت الحلقة الجاية — نفس شكل «لقطة»: الصورة تغمق وتتغبش، لوح غامق أطول، علامة وشرطة، «الحلقة الجاية» بلون الهوية، وعنوانها كسؤال عريض، وكبسولة «تابع عشان ما تفوتك».
     o: {next='ليش يشخر وما يحس؟', label='الحلقة الجاية', brand=حساب الهوية (theme.handle), follow='تابع عشان ما تفوتك' (null بلاها), draw (الصورة ورا — اختياري), s, out} */
  FX.seriesEndCard = (ctx, t, o) => {
    const { X, P, E, at } = ctx; if (t < o.s) return; const ko = fout(ctx, t, o), ka = at(t, o.s, o.s + 0.5, 'cubicOut'), top = 1920 * 0.5;
    if (o.draw) { X.save(); X.filter = `blur(${(10 * ka).toFixed(1)}px)`; X.translate(540, 960); X.scale(1 + 0.04 * ka, 1 + 0.04 * ka); X.translate(-540, -960); o.draw(X); X.restore(); X.fillStyle = `rgba(0,0,0,${0.3 * ka})`; X.fillRect(0, 0, 1080, 1920); }
    X.save(); X.globalAlpha *= 1 - ko; qPanel(X, top + (1 - ka) * 140, ka, o.panelColor);
    bracketMark(ctx, X, o.brand == null ? (ctx.P.handle || '') : o.brand, 540, top + 70, 34, at(t, o.s + 0.15, o.s + 0.6), '#FFFFFF');
    const kd = at(t, o.s + 0.3, o.s + 0.6, 'expoOut'); X.fillStyle = o.dash || P.acc; X.beginPath(); X.roundRect(540 - 38 * kd, top + 140, 76 * kd, 9, 4.5); X.fill();
    ctx.text(X, o.label || 'الحلقة الجاية', 540, top + 212, { family: 'body', weight: 700, size: 44, color: o.dash || P.acc, alpha: at(t, o.s + 0.45, o.s + 0.75) });
    const yEnd = qLines(ctx, X, t, o.next || 'ليش يشخر\nوما يحس؟', top + 300, 100, i => o.s + 0.7 + i * 0.12, '#FFFFFF', 860);
    if (o.follow !== null) { const kf = E.backOut(pr(t, o.s + 1.4, o.s + 1.8)); if (kf > ON) { const s = o.follow || 'تابع عشان ما تفوتك'; X.save(); X.font = ctx.font('body', 800, 40); const w = X.measureText(s).width + 120, yy = Math.min(1600, yEnd + 70);
      X.translate(540, yy); X.scale(kf, kf); X.fillStyle = '#FFFFFF'; X.beginPath(); X.roundRect(-w / 2, -42, w, 84, 42); X.fill(); ctx.text(X, s, 20, 14, { family: 'body', weight: 800, size: 40, color: '#16171A' });
      X.fillStyle = o.dash || P.acc; X.beginPath(); X.arc(-w / 2 + 46, 0, 24, 0, TAU); X.fill(); X.strokeStyle = '#FFFFFF'; X.lineWidth = 6; X.lineCap = 'round'; X.beginPath(); X.moveTo(-w / 2 + 46, -10); X.lineTo(-w / 2 + 46, 10); X.moveTo(-w / 2 + 36, 0); X.lineTo(-w / 2 + 56, 0); X.stroke(); X.restore(); } }
    X.restore();
  };
})();
