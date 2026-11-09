/* ═══ moves-plus-f.js — بنك الحركات 265–283 (I/O Studio) · باقة «أنظمة الموشن» ═══
   نفس عقد motion/moves.js: كل حركة = FX.<اسم>(ctx, t, o) ترسم على ctx.X بإحداثيات التصميم (1080×1920)، كل خاصية من t (بلا تراكم ولا Math.random).
   o.s = بداية الحركة · o.out = بداية الطلعة (اختياري) · الألوان من ctx.P (bg ink acc clay hi mut) · الخط Cairo (family 'cairo' = خط الثيم بالريلز) أو o.family.
   الكتالوج: motion/moves/catalog-plus-f.json · المعاينات: previews/265–283.mp4 (motion/moves/render-preview-f.js) · الشرح: references/moves.md
   الحركة العامة: دخول من الضباب (blur→حاد + طلعة + تكبير خفيف) وطلعة للضباب — بلا قص حاد، والعربي كلمات كاملة (أول كلمة يمين).
     265–266 خلفية وعنوان: starfieldBg · capsuleHeadline
     267–269 واجهات: uiTabsCard · timelineEdit · progressChips
     270 خلفية كروسيل: cornerGlow
     271–273 أنظمة كاميرا: calendarGlide · depthGrid · readmeScroll
     274 انتقال: starSweep
     275–278 خطوات وأشياء: promptStep · polaroidString · giantWordObject · wordProps
     279 رؤية: detectBoxes · 280 انتقال: lightLineWipe · 281 نص: rtlWipeText · 282 بناء: planToBuild · 283 خلفية: luxWaves
   الصور اختيارية دائماً (o.img / o.props[].img / o.objects / items[].img: صورة أو كانفس أو اسم بالمشروع ctx.img) — بلاها رسم بالكود.
   أدوات للمشاهد: FX.gem(ctx, X, x, y, r, rot, o) كريستالة مرسومة · FX.propCanvas(kind, P) أغراض ورق مرسومة (receipt · stack · phone · notebook · pencil). */
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
  const qOut = k => 1 - Math.pow(1 - cl(k), 4);
  const ioC = k => { k = cl(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
  const eOut = k => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * cl(k)));
  const bOut = (k, c1) => { k = cl(k); const a = c1 || 2.0, c3 = a + 1; return 1 + c3 * Math.pow(k - 1, 3) + a * Math.pow(k - 1, 2); };
  const h2 = (a, b) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const hexRGB = h => { const c = String(h || '#000').replace('#', ''), f = c.length === 3 ? c.split('').map(x => x + x).join('') : c; return [0, 2, 4].map(j => parseInt(f.slice(j, j + 2), 16) || 0); };
  const isHex = h => /^#[0-9a-f]{3,8}$/i.test(String(h));
  const rgba = (h, a) => { if (!isHex(h)) return h; const [r, g, b] = hexRGB(h); return `rgba(${r},${g},${b},${cl(a)})`; };
  const mixC = (a, b, k) => { if (!isHex(a) || !isHex(b)) return a; const A = hexRGB(a), B = hexRGB(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], cl(k))).toString(16).padStart(2, '0')).join(''); };
  const lum = h => { if (!isHex(h)) return 128; const c = hexRGB(h); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const isAr = s => /[؀-ۿ]/.test(String(s));
  // ألوان مشتقة من الثيم (تشتغل بالغامق والفاتح)
  const pal = (P, o) => {
    const dark = lum(P.bg) < 110, ink = P.ink, bg = P.bg, acc = (o && o.color) || P.acc;
    const inkD = lum(ink) <= lum(bg) ? ink : bg, inkL = lum(ink) <= lum(bg) ? bg : ink;
    return { dark, ink, bg, acc, inkD, inkL,
      surf: dark ? mixC(bg, ink, 0.07) : mixC(bg, '#FFFFFF', 0.75),
      surf2: dark ? mixC(bg, ink, 0.035) : mixC(bg, '#FFFFFF', 0.45),
      line: mixC(bg, ink, dark ? 0.16 : 0.14),
      mut: P.mut || mixC(bg, ink, 0.55),
      soft: mixC(bg, ink, 0.72),
      on: P.onAcc || (lum(acc) > 150 ? mixC(inkD, '#000000', 0.2) : '#FFFFFF'),
      code: dark ? mixC(bg, '#000000', 0.5) : mixC(inkD, bg, 0.06),
      codeInk: dark ? mixC(inkL, bg, 0.12) : mixC(bg, '#FFFFFF', 0.4),
      shadow: dark ? 'rgba(0,0,0,.55)' : rgba(inkD, 0.2) };
  };
  const fam = o => (o && o.family) || FAM;
  const T = (ctx, X, s, x, y, size, opt) => ctx.text(X, String(s), x, y, Object.assign({ family: FAM, weight: 700, size }, opt || {}));
  const tw = (ctx, X, s, size, w, f) => { X.save(); X.font = ctx.font(f || FAM, w || 700, size); const v = X.measureText(String(s)).width; X.restore(); return v; };
  const rr = (X, x, y, w, h, r) => { X.beginPath(); if (X.roundRect) X.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); else X.rect(x, y, w, h); };
  const shd = (X, blur, y, a, col) => { X.shadowColor = col || `rgba(0,0,0,${a})`; X.shadowBlur = blur; X.shadowOffsetY = y; X.shadowOffsetX = 0; };
  const noShd = X => { X.shadowColor = 'rgba(0,0,0,0)'; X.shadowBlur = 0; X.shadowOffsetY = 0; X.shadowOffsetX = 0; };
  // دخول (ضباب→حاد، طلعة، تكبير) عند a وطلعة (حاد→ضباب، اختفاء، تصغير) عند z
  const env = (t, a, z, o) => { o = o || {}; const din = pick(o, 'din', 0.45), dout = pick(o, 'dout', 0.28);
    const pi = cOut(pr(t, a, a + din)), po = z == null ? 0 : cIn(pr(t, z, z + dout));
    return { o: pi * (1 - po), b: pick(o, 'bIn', 18) * (1 - pi) + pick(o, 'bOut', 16) * po, y: pick(o, 'yIn', 18) * (1 - pi), s: lerp(pick(o, 'sIn', 0.97), 1, pi) * lerp(1, pick(o, 'sOut', 0.97), po) }; };
  const withE = (X, e, cx, cy, fn) => { if (!e || e.o <= ON) return; X.save(); X.globalAlpha *= cl(e.o); if (e.b > 0.3) X.filter = `blur(${e.b.toFixed(1)}px)`;
    X.translate(cx + (e.x || 0), cy + (e.y || 0)); if (e.r) X.rotate(e.r); const s = e.s == null ? 1 : e.s; X.scale(s * (e.sx || 1), s * (e.sy || 1)); X.translate(-cx, -cy); fn(); X.restore(); };
  const imgOf = (ctx, v) => { if (!v) return null; const im = typeof v === 'string' ? (ctx.img ? ctx.img(v) : null) : v; return im && (im.width || im.naturalWidth) ? im : null; };
  const imW = im => im.naturalWidth || im.width, imH = im => im.naturalHeight || im.height;
  const drawCover = (X, im, x, y, w, h) => { const s = Math.max(w / imW(im), h / imH(im)), dw = imW(im) * s, dh = imH(im) * s; X.save(); X.beginPath(); X.rect(x, y, w, h); X.clip(); X.drawImage(im, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); X.restore(); };
  const drawContain = (X, im, cx, cy, w, h) => { const s = Math.min(w / imW(im), h / imH(im)), dw = imW(im) * s, dh = imH(im) * s; X.drawImage(im, cx - dw / 2, cy - dh / 2, dw, dh); };
  const OFF = {};
  const off = (key, w, h) => { let c = OFF[key]; if (!c) { c = OFF[key] = document.createElement('canvas'); } if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } const Y = c.getContext('2d'); if (Y.setTransform) Y.setTransform(1, 0, 0, 1, 0, 0); if (Y.clearRect) Y.clearRect(0, 0, w, h); return { c, Y }; };

  // تخطيط نص RTL: من المحرّك لو موجود (يحترم اللاتيني داخل العربي)، وإلا تقسيم بسيط
  const layout = (ctx, X, str, size, weight, maxW, lh, f) => {
    if (ctx.text && ctx.text.layout) return ctx.text.layout(X, String(str), { family: f || FAM, weight, size, maxWidth: maxW || 1e9, lineHeight: lh || 1.25 });
    X.save(); X.font = ctx.font(f || FAM, weight, size); const sp = X.measureText(' ').width, words = String(str).split(/\s+/).filter(Boolean), W = words.map(w => X.measureText(w).width); X.restore();
    const lines = []; let cur = [], cw = 0; words.forEach((w, i) => { const add = (cur.length ? sp : 0) + W[i]; if (cur.length && cw + add > (maxW || 1e9)) { lines.push(cur); cur = []; cw = 0; } cur.push(i); cw += (cur.length > 1 ? sp : 0) + W[i]; }); if (cur.length) lines.push(cur);
    const rtl = isAr(str), L = (lh || 1.25) * size;
    const out = lines.map((li, n) => { let x = 0; const placed = []; (rtl ? li : li.slice().reverse()).forEach(i => { placed.push({ text: words[i], i, x: x - W[i], w: W[i] }); x -= W[i] + sp; }); placed.sort((a, b) => a.i - b.i); return { words: placed, width: -x - sp, y: n * L }; });
    return { lines: out, width: Math.max(0, ...out.map(l => l.width)), height: (out.length - 1) * L + size, size, words };
  };
  // صناديق الكلمات: (x,y) = نقطة المحاذاة + أول خط أساس
  const boxes = (L, x, y, align) => { const B = []; L.lines.forEach((line, li) => { const right = align === 'right' ? x : align === 'left' ? x + line.width : x + line.width / 2;
    for (const w of line.words) { const bx = right + w.x, by = y + line.y; B.push({ x: bx, w: w.w, cx: bx + w.w / 2, base: by, cy: by - L.size * 0.32, top: by - L.size * 0.95, h: L.size * 1.3, text: w.text, i: w.i, line: li }); } }); return B; };
  // سطر فيه كبسولة: الكلمات المميزة المتجاورة بكبسولة وحدة، والجيران ينفسحون لها (السطر يبقى بالنص). يرجع {B, pills:[{x,w,cy}]}
  const capBoxes = (L, x, y, cap, pad) => { const B = boxes(L, x, y, 'center'), pills = [];
    L.lines.forEach((_, li) => { const row = B.filter(b => b.line === li).sort((a, b) => b.x - a.x); let shift = 0, inG = false, g = null;
      row.forEach(b => { const c = cap.includes(b.i); if (c && !inG) { shift += pad; g = { r: b.x + b.w - shift + pad, cy: b.cy }; pills.push(g); } if (!c && inG) shift += pad; inG = c; b.x -= shift; b.cx -= shift; if (c) g.l = b.x - pad; });
      if (inG) shift += pad; row.forEach(b => { b.x += shift / 2; b.cx += shift / 2; }); pills.filter(q => q.cy === (row[0] || {}).cy && !q.done).forEach(q => { q.l += shift / 2; q.r += shift / 2; q.done = 1; }); });
    return { B, pills: pills.map(q => ({ x: q.l, w: q.r - q.l, cy: q.cy })) }; };
  const drawWord = (ctx, X, b, size, weight, color, f) => T(ctx, X, b.text, b.cx, b.base, size, { weight, color, family: f || FAM });
  // *كلمة* = تمييز: يرجع النص بلا نجوم + أرقام الكلمات المميزة
  const marks = s => { const ws = String(s || '').split(/\s+/).filter(Boolean), acc = []; const clean = ws.map((w, i) => { if (/^\*.*\*$/.test(w) || /^\*/.test(w) || /\*$/.test(w)) { acc.push(i); return w.replace(/\*/g, ''); } return w; }); return { text: clean.join(' '), acc }; };
  const fitSize = (ctx, X, s, size, w, maxW, f) => { const m = tw(ctx, X, s, size, w, f); return m > maxW ? size * maxW / m : size; };
  // نص على كرت: لاتيني = حرف حرف، عربي = كلمة كلمة (الحروف تبقى متصلة)
  const typed = (s, k) => { s = String(s); if (isAr(s)) { const w = s.split(/\s+/).filter(Boolean); return w.slice(0, Math.round(cl(k) * w.length)).join(' '); } return s.slice(0, Math.round(cl(k) * s.length)); };
  const caret = t => (Math.floor(t * 2.4) % 2 ? '' : '│');
  // مسار مرسوم جزئياً (k من 0 إلى 1) — يرجع رأس القلم
  const partPath = (X, pts, k) => { if (pts.length < 2 || k <= 0) return null; let tot = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); tot += d; }
    let left = tot * cl(k); X.beginPath(); X.moveTo(pts[0][0], pts[0][1]); let tip = pts[0];
    for (let i = 1; i < pts.length; i++) { if (left <= 0) break; const d = seg[i - 1]; if (left >= d) { X.lineTo(pts[i][0], pts[i][1]); tip = pts[i]; left -= d; } else { const q = left / d; tip = [lerp(pts[i - 1][0], pts[i][0], q), lerp(pts[i - 1][1], pts[i][1], q)]; X.lineTo(tip[0], tip[1]); left = 0; } }
    X.stroke(); return tip; };
  const starPath = (X, x, y, R, n, rot, inner) => { X.beginPath(); for (let i = 0; i < n * 2; i++) { const r = i % 2 ? R * (inner || 0.33) : R, a = (rot || 0) + i * Math.PI / n; i ? X.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : X.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } X.closePath(); };

  /* ── كريستالة مرسومة (بديل الصورة): أوجه بتدرّج اللون المميز ── */
  FX.gem = (ctx, X, x, y, r, rot, o) => { o = o || {}; const P = ctx.P, c = pal(P, o), A = c.acc, D = c.dark ? mixC(c.bg, A, 0.25) : mixC(A, c.inkD, 0.45);
    const n = o.sides || 6, pts = []; for (let i = 0; i < n; i++) { const a = (rot || 0) - Math.PI / 2 + i * TAU / n, rr2 = r * (i % 2 ? 0.82 : 1); pts.push([x + Math.cos(a) * rr2, y + Math.sin(a) * rr2 * 1.18]); }
    X.save(); if (o.glow !== false) { const g = X.createRadialGradient(x, y, r * 0.2, x, y, r * 1.9); g.addColorStop(0, rgba(A, 0.35)); g.addColorStop(1, rgba(A, 0)); X.fillStyle = g; X.fillRect(x - r * 2, y - r * 2.2, r * 4, r * 4.4); }
    const tip = [x + Math.sin(rot || 0) * r * 0.1, y - r * 0.08];
    for (let i = 0; i < n; i++) { const p0 = pts[i], p1 = pts[(i + 1) % n], sh = 0.5 + 0.5 * Math.cos((i / n) * TAU + (rot || 0) * 2 - 0.6);
      X.beginPath(); X.moveTo(tip[0], tip[1]); X.lineTo(p0[0], p0[1]); X.lineTo(p1[0], p1[1]); X.closePath(); X.fillStyle = mixC(D, mixC(A, '#FFFFFF', 0.55), Math.pow(sh, 0.8)); X.fill(); }
    X.beginPath(); pts.forEach((p, i) => (i ? X.lineTo(p[0], p[1]) : X.moveTo(p[0], p[1]))); X.closePath(); X.lineWidth = Math.max(1.5, r * 0.012); X.strokeStyle = rgba(mixC(A, '#FFFFFF', 0.5), 0.7); X.stroke();
    X.globalAlpha *= 0.7; X.beginPath(); X.moveTo(tip[0], tip[1]); X.lineTo(pts[0][0], pts[0][1]); X.moveTo(tip[0], tip[1]); X.lineTo(pts[Math.floor(n / 2)][0], pts[Math.floor(n / 2)][1]); X.strokeStyle = rgba('#FFFFFF', 0.5); X.lineWidth = Math.max(1, r * 0.008); X.stroke();
    X.restore(); };

  /* ── أغراض ورق مرسومة (بديل صور الأغراض الحقيقية) — رمادي محايد + لمسة اللون المميز ── */
  const PROP = {};
  const pc = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
  const propDraw = {
    receipt(A, s0, w, h, hi) { const [c, x] = pc(w || 330, h || 980); w = c.width; h = c.height; const z = 14; x.beginPath(); x.moveTo(0, z);
      for (let i = 0; i <= w; i += z) x.lineTo(i, (i / z) % 2 ? 0 : z); for (let i = w; i >= 0; i -= z) x.lineTo(i, h - ((i / z) % 2 ? 0 : z)); x.closePath();
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#E4E7EB'); g.addColorStop(0.12, '#FBFBFC'); g.addColorStop(0.5, '#EEF0F2'); g.addColorStop(0.9, '#FBFBFC'); g.addColorStop(1, '#DDE1E7'); x.fillStyle = g; x.fill(); x.save(); x.clip();
      const m = w * 0.1; x.fillStyle = '#9AA0AA'; x.fillRect(w * 0.3, h * 0.06, w * 0.4, h * 0.018);
      for (let y = h * 0.13, k = 0; y < h * 0.86; y += h * 0.034, k++) { if (h2(k, s0) < 0.12) { x.fillStyle = '#C3C7CE'; for (let q = m; q < w - m; q += 12) x.fillRect(q, y, 6, 2); continue; } x.fillStyle = '#A6ACB5'; x.fillRect(m, y, w * (0.25 + h2(k, s0 + 1) * 0.3), h * 0.011); x.fillRect(w - m - w * 0.15, y, w * 0.15, h * 0.011); }
      if (hi) { x.fillStyle = rgba(A, 0.42); x.fillRect(m - 8, h * 0.62, w - 2 * m + 16, h * 0.03); }
      x.fillStyle = '#8A8F99'; x.fillRect(m, h * 0.9, w - 2 * m, h * 0.02); x.restore(); return c; },
    stack(A) { const [c, x] = pc(900, 700); [[130, 120, -28, 1], [330, 80, 14, 2], [200, 180, -6, 3], [420, 170, 31, 4]].forEach(([px, py, r, s]) => { x.save(); x.translate(px + 130, py + 220); x.rotate(r * Math.PI / 180); shd(x, 14, 6, 0.18); x.drawImage(propDraw.receipt(A, s * 11, 260, 440 + s * 30, s === 3), -130, -220); x.restore(); }); return c; },
    phone(A) { const [c, x] = pc(420, 840); let g = x.createLinearGradient(0, 0, 420, 0); g.addColorStop(0, '#3A404A'); g.addColorStop(0.08, '#1B2029'); g.addColorStop(0.92, '#161A21'); g.addColorStop(1, '#3A404A'); rr(x, 0, 0, 420, 840, 62); x.fillStyle = g; x.fill();
      rr(x, 16, 16, 388, 808, 48); x.fillStyle = '#0B0D11'; x.fill(); rr(x, 24, 24, 372, 792, 42); x.fillStyle = '#F7F8FA'; x.fill(); x.fillStyle = '#101114'; rr(x, 160, 38, 100, 26, 13); x.fill();
      x.fillStyle = '#ADB3BD'; x.fillRect(56, 110, 150, 18); x.fillStyle = '#2A2F38'; x.fillRect(56, 145, 220, 40);
      for (let i = 0; i < 6; i++) { const y = 230 + i * 92; rr(x, 44, y, 332, 76, 18); x.fillStyle = i === 2 ? mixC(A, '#FFFFFF', 0.85) : '#FFFFFF'; x.fill(); x.strokeStyle = i === 2 ? A : '#DDE1E7'; x.lineWidth = i === 2 ? 3 : 1.5; x.stroke();
        x.beginPath(); x.arc(84, y + 38, 20, 0, TAU); x.fillStyle = i === 2 ? A : ['#2A2F38', '#5A606B', '#000', '#8A8F99', '#161A21', '#ADB3BD'][i]; x.fill(); x.fillStyle = '#ADB3BD'; x.fillRect(118, y + 26, 120, 12); x.fillStyle = '#5A606B'; x.fillRect(300, y + 30, 52, 16); }
      g = x.createLinearGradient(0, 0, 420, 840); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.3)'); g.addColorStop(0.6, 'rgba(255,255,255,0)'); rr(x, 24, 24, 372, 792, 42); x.fillStyle = g; x.fill(); return c; },
    notebook(A) { const [c, x] = pc(900, 640); x.fillStyle = '#2A2F38'; rr(x, 6, 14, 888, 620, 18); x.fill();
      [0, 460].forEach(a => { rr(x, a + 14, 6, 426, 612, 10); const g = x.createLinearGradient(a, 0, a + 430, 0); g.addColorStop(0, a ? '#E3E6EA' : '#FBFBFC'); g.addColorStop(a ? 0.12 : 0.88, '#FBFBFC'); g.addColorStop(1, a ? '#FBFBFC' : '#E3E6EA'); x.fillStyle = g; x.fill();
        x.fillStyle = '#C9CED6'; for (let i = a + 50; i < a + 420; i += 30) for (let j = 50; j < 600; j += 30) { x.beginPath(); x.arc(i, j, 1.8, 0, TAU); x.fill(); } });
      for (let j = 40; j < 610; j += 36) { x.lineWidth = 7; const g = x.createLinearGradient(420, 0, 480, 0); g.addColorStop(0, '#5A606B'); g.addColorStop(0.5, '#F7F8FA'); g.addColorStop(1, '#5A606B'); x.strokeStyle = g; x.beginPath(); x.ellipse(450, j, 26, 10, 0, 0, TAU); x.stroke(); }
      x.strokeStyle = '#3A404A'; x.lineWidth = 5; x.lineCap = 'round'; x.beginPath(); x.arc(650, 230, 70, Math.PI * 0.8, Math.PI * 2.2); x.stroke();
      x.beginPath(); x.moveTo(605, 280); x.lineTo(615, 330); x.lineTo(685, 330); x.lineTo(695, 280); x.stroke(); x.beginPath(); x.moveTo(622, 360); x.lineTo(678, 360); x.stroke();
      x.beginPath(); x.moveTo(560, 470); x.bezierCurveTo(620, 430, 700, 520, 780, 460); x.stroke();
      x.fillStyle = A; x.beginPath(); x.moveTo(760, 0); x.lineTo(800, 0); x.lineTo(800, 700); x.lineTo(780, 680); x.lineTo(760, 700); x.closePath(); x.fill(); return c; },
    pencil(A) { const [c, x] = pc(1000, 90), L = 1000; x.fillStyle = '#E7D3B5'; x.beginPath(); x.moveTo(0, 45); x.lineTo(150, 8); x.lineTo(150, 82); x.closePath(); x.fill();
      x.fillStyle = '#1B2029'; x.beginPath(); x.moveTo(0, 45); x.lineTo(42, 35); x.lineTo(42, 55); x.closePath(); x.fill();
      [[8, 30, '#5A606B'], [30, 60, '#3A404A'], [60, 82, '#22272F']].forEach(([a, b, col]) => { x.fillStyle = col; x.fillRect(150, a, L - 330, b - a); }); x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(150, 14, L - 330, 4);
      let g = x.createLinearGradient(0, 8, 0, 82); g.addColorStop(0, '#DDE1E7'); g.addColorStop(0.35, '#FFFFFF'); g.addColorStop(0.7, '#8A8F99'); g.addColorStop(1, '#5A606B'); x.fillStyle = g; x.fillRect(L - 180, 6, 80, 78);
      g = x.createLinearGradient(0, 10, 0, 80); g.addColorStop(0, mixC(A, '#FFFFFF', 0.4)); g.addColorStop(0.4, A); g.addColorStop(1, mixC(A, '#000000', 0.35)); x.fillStyle = g; rr(x, L - 100, 10, 96, 70, 16); x.fill(); return c; },
  };
  FX.propCanvas = (kind, P) => { const A = (P && P.acc) || '#888888', key = kind + A; if (PROP[key]) return PROP[key]; const f = propDraw[kind] || propDraw.receipt; return (PROP[key] = kind === 'receipt' ? f(A, 4, 330, 980, true) : f(A)); };

  /* 265 سما بكسلات — خلفية: لون الخلفية + توهج ناعم يتنفس + جزيئات (نقاط · مربعات مفرّغة · مربعات مليانة) تصعد وتلمع + إطار خطوط اختياري.
     o: {s=0, n=170, glow:[x,y,r], speed=1, frame=false, bg=true} — ارسم الكلام بعدها */
  FX.starfieldBg = (ctx, t, o) => { o = o || {}; const { X, P } = ctx, c = pal(P, o), s = pick(o, 's', 0), k = cOut(pr(t, s, s + 0.5)), gl = o.glow || [540, 1180, 820];
    if (o.bg !== false) { X.fillStyle = c.bg; X.fillRect(0, 0, 1080, 1920); }
    const br = (0.11 + 0.025 * Math.sin(t * 1.3)) * (c.dark ? 1 : 1.5) * k;
    let g = X.createRadialGradient(gl[0], gl[1], 0, gl[0], gl[1], gl[2]); g.addColorStop(0, rgba(c.acc, br)); g.addColorStop(0.5, rgba(c.acc, br * 0.35)); g.addColorStop(1, rgba(c.acc, 0)); X.fillStyle = g; X.fillRect(0, 0, 1080, 1920);
    g = X.createRadialGradient(540, 960, 500, 540, 960, 1250); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, c.dark ? 'rgba(0,0,0,.55)' : rgba(c.inkD, 0.08)); X.fillStyle = g; X.fillRect(0, 0, 1080, 1920);
    const n = pick(o, 'n', 170), sp = pick(o, 'speed', 1);
    for (let i = 0; i < n; i++) { const v = 6 + h2(i, 3) * 22, z = h2(i, 4), kd = h2(i, 5), ph = h2(i, 6) * TAU, w = h2(i, 7);
      const y = (((h2(i, 2) * 1920 - v * t * sp) % 1920) + 1920) % 1920, x = h2(i, 1) * 1080 + Math.sin(t * 0.4 + ph) * 10;
      const a = (0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * (1 + w * 2) + ph))) * (z < 0.55 ? 0.35 : 0.7) * k;
      if (kd < 0.45) { X.fillStyle = rgba(c.inkL === c.bg ? c.ink : c.inkL, a * 0.45); const q = 1.5 + z * 1.6; X.fillRect(x, y, q, q); }
      else if (kd < 0.8) { X.strokeStyle = rgba(c.acc, a * 0.55); X.lineWidth = 1.6; const q = 7 + z * 7; X.strokeRect(x, y, q, q); }
      else { X.fillStyle = rgba(c.acc, a * 0.6); const q = 4 + z * 4; X.fillRect(x, y, q, q); } }
    if (o.frame) { X.save(); X.globalAlpha *= k; X.strokeStyle = rgba(c.ink, 0.07); X.lineWidth = 1.5; X.beginPath(); [222, 1642].forEach(y => { X.moveTo(0, y); X.lineTo(1080, y); }); [66, 1014].forEach(x => { X.moveTo(x, 0); X.lineTo(x, 1920); }); X.stroke();
      X.strokeStyle = rgba(c.ink, 0.25); X.lineWidth = 2; [[66, 222], [1014, 222], [66, 1642], [1014, 1642]].forEach(([x, y]) => { X.beginPath(); X.moveTo(x - 12, y); X.lineTo(x + 12, y); X.moveTo(x, y - 12); X.lineTo(x, y + 12); X.stroke(); }); X.restore(); }
  };

  /* 266 عنوان بكبسولة — سطر صغير فوق (Mono لاتيني اختياري) + سطر هادي + سطر عريض وكلمة وحدة بكبسولة اللون المميز تفرقع.
     o: {s, out, kicker, lead, text ('*كلمة*' = الكبسولة، أو cap: رقم الكلمة), y=300, size=96, color} */
  FX.capsuleHeadline = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = o.s || 0, z = o.out, y = pick(o, 'y', 300), size = o.size || 96, f = fam(o);
    let yy = y;
    if (o.kicker) { const e = env(t, s - 0.05, z, { yIn: 10 }); withE(X, e, 540, yy, () => T(ctx, X, String(o.kicker).toUpperCase(), 540, yy, 24, { weight: 600, color: c.mut, letterSpacing: 7, dir: 'ltr', family: f })); yy += 74; }
    if (o.lead) { const e = env(t, s, z == null ? null : z + 0.02); withE(X, e, 540, yy, () => T(ctx, X, o.lead, 540, yy, size * 0.52, { weight: 400, color: c.soft, maxWidth: 900, family: f })); yy += size * 1.2; }
    const M = marks(o.text || (o.lead || o.kicker ? '' : 'عنوان *واضح*')); if (!M.text) return;
    const cap = o.cap != null ? [].concat(o.cap) : M.acc, L = layout(ctx, X, M.text, size, 900, o.maxWidth || 820, 1.3, f), { B, pills } = capBoxes(L, 540, yy, cap, size * 0.3);
    const e = env(t, s + 0.08, z == null ? null : z + 0.04, { din: 0.5, bIn: 22 });
    withE(X, e, 540, yy - size * 0.3, () => {
      const kp = bOut(pr(t, s + 0.45, s + 0.85));
      pills.forEach(q => { const h = size * 1.18, cx = q.x + q.w / 2; X.save(); X.translate(cx, q.cy); X.scale(lerp(0.6, 1, kp), lerp(0.6, 1, kp)); X.translate(-cx, -q.cy);
        X.fillStyle = c.acc; rr(X, q.x, q.cy - h / 2, q.w, h, h / 2); X.fill(); X.restore(); });
      B.forEach(b => drawWord(ctx, X, b, size, 900, cap.includes(b.i) ? c.on : (o.textColor || c.ink), f));
    });
  };

  /* 267 كرت تبويبات — نافذة تطبيق بتبويبات، والاسم الكبير يتبدّل بسرعة (ضباب) لين يستقر، وتحته سطر وشارة تفرقع.
     o: {s, out, tabs:['أ','ب','ج'], names (افتراضي = tabs), every=.42, settle (وقت الاستقرار، افتراضي s+2.2), pick (رقم اللي يستقر)، label='MODEL', note, badge, y=720, h=620} */
  FX.uiTabsCard = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = o.s || 0, y = pick(o, 'y', 720), h = o.h || 620, x0 = 111, w = 858, f = fam(o);
    const tabs = o.tabs || ['ChatGPT', 'Claude', 'Gemini'], names = o.names || tabs, n = names.length, ev = o.every || 0.42, settle = pick(o, 'settle', s + 2.2), pk = pick(o, 'pick', n - 1);
    const e = env(t, s - 0.08, o.out, { din: 0.42, yIn: 34, sIn: 0.95, bIn: 22 });
    withE(X, e, 540, y + h / 2, () => {
      X.save(); shd(X, 140, 50, c.dark ? 0.65 : 0.18); const g = X.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, c.surf); g.addColorStop(1, c.surf2); X.fillStyle = g; rr(X, x0, y, w, h, 30); X.fill(); noShd(X);
      X.lineWidth = 1.5; X.strokeStyle = c.line; X.stroke(); X.clip();
      X.fillStyle = c.line; X.fillRect(x0, y + 64, w, 1.5);
      for (let i = 0; i < 3; i++) { X.fillStyle = mixC(c.line, c.ink, 0.15); X.beginPath(); X.arc(x0 + 33 + i * 26, y + 32, 7, 0, TAU); X.fill(); }
      const u = Math.max(0, t - (s + 0.5)), fr = (u % ev) / ev; let cur = t < s + 0.5 ? 0 : Math.floor(u / ev) % n; const done = t >= settle; if (done) cur = pk;
      let tx = x0 + 130; tabs.forEach((nm, i) => { const tw0 = tw(ctx, X, nm, 22, 600, f) + 40, on = i === cur; if (on) { X.fillStyle = mixC(c.surf, c.ink, 0.1); rr(X, tx, y + 14, tw0, 36, 12); X.fill(); }
        T(ctx, X, nm, tx + tw0 / 2, y + 40, 22, { weight: 600, color: on ? c.ink : c.mut, family: f }); tx += tw0 + 8; });
      const ny = y + 260, po = done ? 0 : cIn(cl((fr - 0.72) / 0.28)), lab = o.label === undefined ? 'MODEL' : o.label;
      const drawName = (i, a, b, sc, dy) => { if (a <= ON) return; X.save(); X.globalAlpha *= a; if (b > 0.3) X.filter = `blur(${b.toFixed(1)}px)`; X.translate(540, ny + dy); X.scale(sc, sc); X.translate(-540, -ny);
        if (lab) T(ctx, X, `${lab} · 0${i + 1}`, 540, ny - 135, 22, { weight: 600, color: c.mut, letterSpacing: 7, dir: 'ltr', family: f });
        T(ctx, X, names[i], 540, ny, fitSize(ctx, X, names[i], 120, 900, w - 120, f), { weight: 900, color: c.ink, family: f }); X.restore(); };
      drawName(cur, 1 - po, 14 * po, lerp(1, 0.94, po), -20 * po);
      if (!done && fr > 0.72 && t >= s + 0.5) drawName((cur + 1) % n, po, 14 * (1 - po), lerp(1.06, 1, po), 20 * (1 - po));
      if (o.note) T(ctx, X, o.note, 540, y + 400, 36, { weight: 400, color: c.soft, maxWidth: w - 100, family: f });
      X.restore();
      if (o.badge) { const q = bOut(pr(t, s + 1.5, s + 1.85)); if (q > ON) { const bw = tw(ctx, X, o.badge, 34, 800, f) + 68, by = y + h - 110; X.save(); X.globalAlpha *= cl(q * 3); X.translate(540, by); X.rotate(-5 * Math.PI / 180); X.scale(lerp(1.6, 1, q), lerp(1.6, 1, q));
        X.fillStyle = c.acc; rr(X, -bw / 2, -36, bw, 72, 36); X.fill(); T(ctx, X, o.badge, 0, 12, 34, { weight: 800, color: c.on, family: f }); X.restore(); } }
    });
  };

  /* 268 قبل/بعد ويا تايملاين — كرت «قبل» يملأ الشاشة ويصغر يسار، كرت «بعد» يدخل يمين، وتايملاين مونتاج تحت: رأس التشغيل يمشي وكل مقطع يوصله يطبّق تعديل على نص «بعد».
     o: {s, out, before, steps:[{label, text}] ('~كلمة' = مشطوبة)، check, dur=3.6, labels:{before:'BEFORE', after:'AFTER'}} */
  FX.timelineEdit = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = o.s || 0, f = fam(o), dur = o.dur || 3.6;
    const steps = o.steps || [{ label: 'شيل الرموز', text: '~★ بعالم اليوم المتسارع صار الذكاء الاصطناعي أداة لا غنى عنها ~✦' }, { label: 'شيل الحشو', text: '~بعالم ~اليوم ~المتسارع صار الذكاء الاصطناعي أداة' }, { label: 'حط تجربتك', text: 'جرّبت ثلاث أدوات هالأسبوع. وحدة بس وفّرت وقتي.' }];
    const before = o.before || '★ بعالم اليوم المتسارع صار الذكاء الاصطناعي بلا شك أداة لا غنى عنها لكل من يطمح للنجاح ✦';
    const fade = o.out != null ? 1 - cIn(pr(t, o.out, o.out + 0.35)) : 1; if (fade <= ON) return; X.save(); X.globalAlpha *= fade;
    const lb = o.labels || {}, card = (R, lab, txt, hi, size, k0) => {
      X.save(); shd(X, 100, 40, c.dark ? 0.55 : 0.16); X.fillStyle = c.surf; rr(X, R[0], R[1], R[2], R[3], R[4]); X.fill(); noShd(X); X.lineWidth = hi ? 2.5 : 1.5; X.strokeStyle = hi ? c.acc : c.line; X.stroke(); X.clip();
      T(ctx, X, lab, R[0] + R[2] - 30, R[1] + 46, 22, { weight: 600, color: hi ? c.acc : c.mut, letterSpacing: 5, align: 'right', dir: 'ltr', family: f });
      const L = layout(ctx, X, txt.replace(/~/g, ''), size, 400, R[2] - 68, 1.65, f), strike = txt.split(/\s+/).filter(Boolean).map(w => w.startsWith('~'));
      boxes(L, R[0] + R[2] - 34, R[1] + Math.max(90 + size, R[3] * 0.36), 'right').forEach(b => { const st = strike[b.i]; X.save(); X.globalAlpha *= (st ? 0.45 : 1) * (k0 == null ? 1 : k0); drawWord(ctx, X, b, size, 400, hi && !st ? c.ink : c.soft, f);
        if (st) { X.fillStyle = c.ink; X.fillRect(b.x - 2, b.cy, b.w + 4, Math.max(2, size * 0.09)); } X.restore(); });
      X.restore(); };
    // 1) قبل: الشاشة كاملة ← كرت يسار
    const k = ioC(pr(t, s + 0.6, s + 1.4)), R0 = [0, 0, 1080, 1920, 0], R1 = [50, 560, 470, 560, 34], R = R0.map((v, i) => lerp(v, R1[i], k));
    X.save(); X.globalAlpha *= lerp(1, 0.6, pr(t, s + 1.8 + dur, s + 2.3 + dur)); card(R, lb.before || 'BEFORE', before, false, lerp(60, 34, k)); X.restore();
    // 2) بعد: يدخل من اليمين
    const a = cOut(pr(t, s + 1.1, s + 1.8)); if (a > ON) {
      const clips = steps.length, TX = 150, TW = 870, cw = TW / clips, p = pr(t, s + 1.8, s + 1.8 + dur), px = TW * p;
      let st = 0; steps.forEach((q, i) => { if (px >= i * cw + 60) st = i + 1; });
      const tst = st ? s + 1.8 + dur * ((st - 1) * cw + 60) / TW : 0, kx = st ? cOut(pr(t, tst, tst + 0.3)) : 1;
      card([lerp(1080, 560, a), 560, 470, 560, 34], lb.after || 'AFTER', st ? steps[st - 1].text : before.replace(/~/g, ''), true, 34, kx);
      // 3) التايملاين
      const ty = lerp(1600, 1180, cOut(pr(t, s + 1.3, s + 1.9))), ta = pr(t, s + 1.3, s + 1.8); X.save(); X.globalAlpha *= ta;
      X.fillStyle = c.surf2; rr(X, 40, ty, 1000, 330, 24); X.fill(); X.lineWidth = 1.5; X.strokeStyle = c.line; X.stroke();
      T(ctx, X, '00:' + String(Math.floor(24 * p)).padStart(2, '0'), 1016, ty + 44, 22, { weight: 600, color: c.mut, align: 'right', dir: 'ltr', family: f });
      const tracks = ['TEXT', 'VOICE', 'CHECK'];
      tracks.forEach((nm, r) => { const yy = ty + 56 + r * 90; X.fillStyle = c.surf; rr(X, TX, yy, TW, 70, 12); X.fill(); T(ctx, X, nm, 58, yy + 42, 17, { weight: 600, color: c.mut, align: 'left', dir: 'ltr', letterSpacing: 3, family: f });
        if (r === 0) steps.forEach((q, i) => { const x0 = TX + i * cw + 12, done = px >= (i + 1) * cw - 6; X.fillStyle = done ? c.acc : mixC(c.surf, c.acc, 0.18); rr(X, x0, yy + 8, cw - 24, 54, 10); X.fill(); X.strokeStyle = c.acc; X.lineWidth = 1.5; X.stroke();
          T(ctx, X, q.label, x0 + (cw - 24) / 2, yy + 44, 24, { weight: 700, color: done ? c.on : c.ink, maxWidth: cw - 40, family: f }); });
        if (r === 1) { X.fillStyle = mixC(c.surf, c.ink, 0.22); for (let i = 0; i < 140; i++) { const hh = 8 + h2(i, 77) * 40; X.fillRect(TX + 10 + i * 6.1, yy + 35 - hh / 2, 4, hh); } }
        if (r === 2 && o.check !== null) { const x0 = TX + (clips - 1) * cw + 12, ok = px >= TW - 6; X.fillStyle = c.surf2; rr(X, x0, yy + 8, cw - 24, 54, 10); X.fill(); X.strokeStyle = ok ? c.acc : c.line; X.lineWidth = 1.5; X.stroke();
          T(ctx, X, o.check || '✓ يشبه كلامي؟', x0 + (cw - 24) / 2, yy + 44, 22, { weight: 600, color: ok ? c.acc : c.mut, maxWidth: cw - 40, family: f }); } });
      X.fillStyle = c.inkL === c.bg ? c.ink : c.inkL; X.fillRect(TX + px - 2, ty + 14, 4, 300); rr(X, TX + px - 12, ty + 4, 24, 16, 5); X.fill();
      X.restore(); }
    X.restore();
  };

  /* 269 شرائح تقدّم — كروت صغيرة فوق الفيديو (اسم + شريط نسبة + حالة) تفرقع بميلان، ترجف «واقفة»، وتطلع بضباب؛ وكرت «تم» بحد اللون المميز.
     o: {s, out, items:[{label, pct, status, x, y, rot}], every=.18, shake (وقت الرجفة), done:{label, sub, at, out}, draw (الفيديو)} */
  FX.progressChips = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = o.s || 0, f = fam(o); if (o.draw) o.draw(X);
    const items = o.items || [{ label: 'مشروع موقع', pct: 70, status: 'STOPPED · 70%' }, { label: 'كورس يوتيوب', pct: 40, status: 'STOPPED · 40%' }, { label: 'تطبيق جديد', pct: 10, status: 'STOPPED · 10%' }];
    const POS = [[760, 380, -6], [320, 480, 5], [740, 620, -3], [330, 740, 4], [760, 860, -4]];
    const chip = (x, y, rot, label, pct, status, k, kout, hi, i, size) => { if (k <= ON) return; size = size || 30;
      const w = Math.max(320, tw(ctx, X, label, size, 700, f) + 60), h = pct == null ? (status ? 116 : 84) : 132;
      X.save(); X.globalAlpha *= cl(k * 3) * (1 - kout); if (kout > 0.02) X.filter = `blur(${(8 * kout).toFixed(1)}px)`;
      const sh = o.shake != null && t > o.shake && t < o.shake + 0.35 ? Math.sin(t * 70 + i) * 4 : 0;
      X.translate(x + sh + (x > 540 ? 60 : -60) * (1 - cl(k)), y + Math.sin(t * 1.6 + rot) * 6); X.rotate(rot * Math.PI / 180); X.scale(lerp(0.4, 1, k), lerp(0.4, 1, k));
      shd(X, 50, 18, c.dark ? 0.55 : 0.18); X.fillStyle = c.surf; rr(X, -w / 2, -h / 2, w, h, 20); X.fill(); noShd(X); X.lineWidth = hi ? 2.5 : 1.5; X.strokeStyle = hi ? c.acc : c.line; X.stroke();
      T(ctx, X, label, w / 2 - 26, -h / 2 + 46, size, { weight: hi ? 800 : 700, color: c.ink, align: 'right', family: f });
      if (pct != null) { X.fillStyle = c.line; rr(X, -w / 2 + 26, -h / 2 + 66, w - 52, 10, 5); X.fill(); X.fillStyle = c.acc; rr(X, -w / 2 + 26 + (w - 52) * (1 - pct / 100), -h / 2 + 66, (w - 52) * pct / 100, 10, 5); X.fill(); }
      if (status) T(ctx, X, status, w / 2 - 26, h / 2 - 22, 18, { weight: 600, color: c.mut, align: 'right', letterSpacing: 2, family: f });
      X.restore(); };
    items.forEach((it, i) => { const p = POS[i % POS.length], a = s + i * (o.every || 0.18), k = bOut(pr(t, a, a + 0.32)), ko = o.out != null ? cIn(pr(t, o.out, o.out + 0.2)) : 0;
      chip(pick(it, 'x', p[0]), pick(it, 'y', p[1]), pick(it, 'rot', p[2]), it.label, it.pct, it.status, k, ko, false, i); });
    if (o.done) { const d = o.done, a = pick(d, 'at', (o.out != null ? o.out + 0.3 : s + 2)), k = bOut(pr(t, a, a + 0.32)), ko = d.out != null ? cIn(pr(t, d.out, d.out + 0.2)) : 0;
      chip(pick(d, 'x', 540), pick(d, 'y', 440), pick(d, 'rot', -4), '✓ ' + (d.label || 'تم'), null, d.sub, k, ko, true, 9, 38); }
  };

  /* 270 توهج الزاوية — خلفية كروسيل فاخمة: لون الخلفية + توهج ناعم وحيد من زاوية يتحرك ببطء + ظل مقابل + حبيبات.
     o: {s=0, corner='tr'|'tl'|'br'|'bl', h=1920 (1350 للكروسيل), strength=.42, grain=true, bg=true} */
  FX.cornerGlow = (ctx, t, o) => { o = o || {}; const { X, P } = ctx, c = pal(P, o), H = o.h || 1920, s = pick(o, 's', 0), k = cOut(pr(t, s - 0.001, s + 0.6)), cr = o.corner || 'tr';
    if (o.bg !== false) { X.fillStyle = c.bg; X.fillRect(0, 0, 1080, H); }
    const right = cr[1] === 'r', top = cr[0] === 't', gx = (right ? 1080 + 60 * Math.sin(t * 0.35) - 40 : -60 * Math.sin(t * 0.35) + 40), gy = top ? -80 + 70 * Math.sin(t * 0.27 + 1) : H + 80 - 70 * Math.sin(t * 0.27 + 1), r = 1300 + 80 * Math.sin(t * 0.5);
    const st = pick(o, 'strength', 0.42) * (c.dark ? 1 : 0.8) * k;
    let g = X.createRadialGradient(gx, gy, 0, gx, gy, r); g.addColorStop(0, rgba(c.acc, st)); g.addColorStop(0.35, rgba(c.acc, st * 0.36)); g.addColorStop(1, rgba(c.acc, 0)); X.fillStyle = g; X.fillRect(0, 0, 1080, H);
    const ox = right ? -100 : 1180, oy = top ? H + 100 : -100, sh = c.dark ? mixC(c.bg, c.ink, 0.06) : mixC(c.bg, c.inkD, 0.06);
    g = X.createRadialGradient(ox, oy, 0, ox, oy, 900); g.addColorStop(0, rgba(sh, 0.9)); g.addColorStop(1, rgba(sh, 0)); X.fillStyle = g; X.fillRect(0, 0, 1080, H);
    if (o.grain !== false) { const key = 'grain' + (c.dark ? 'd' : 'l'); let gc = OFF[key]; if (!gc) { gc = OFF[key] = document.createElement('canvas'); gc.width = 256; gc.height = 256; const Y = gc.getContext('2d');
        const im = Y.createImageData ? Y.createImageData(256, 256) : null; if (im && im.data) { for (let i = 0; i < im.data.length; i += 4) { const v = h2(i, 91) * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = h2(i, 92) < 0.5 ? 255 * 0.08 : 0; } Y.putImageData(im, 0, 0); } }
      if (X.createPattern) { const pt = X.createPattern(gc, 'repeat'); if (pt) { X.save(); X.globalAlpha *= 0.5; X.fillStyle = pt; X.fillRect(0, 0, 1080, H); X.restore(); } } }
  };

  /* 271 تقويم ينزلق — مربعات أيام مدوّرة (الأول يمين)، تولّع وحدة وحدة والكاميرا تمشي عليها بعمق (البعيد يتضبب)، و«اليوم» بلون الحبر.
     o: {s, out, days=15, cols=5, lit=7, values:['1.2K',…], today=8 (رقم اليوم)، todayLabel='اليوم', title, sub, zoom=1.35, every=.28} */
  FX.calendarGlide = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = o.s || 0, f = fam(o), N = o.days || 15, C = o.cols || 5, lit = pick(o, 'lit', 7), ev = o.every || 0.28, today = pick(o, 'today', lit + 1), zoom = o.zoom || 1.35;
    const fade = o.out != null ? 1 - cIn(pr(t, o.out, o.out + 0.35)) : 1; if (fade <= ON) return;
    const pitch = 200, gw = C * 150 + (C - 1) * 50, rows = Math.ceil(N / C), pos = i => [540 + gw / 2 - 75 - (i % C) * pitch, 860 + Math.floor(i / C) * 250 - (rows - 1) * 125];
    const t0 = s + 0.6, u = (t - t0) / ev, last = lit - 1, endT = t0 + last * ev + 0.5;
    let cam;
    const follow = i => pos(cl(i, 0, N - 1) | 0);
    { const i0 = Math.floor(cl(u, 0, last)), i1 = Math.min(last, i0 + 1), q = ioC(cl(u, 0, last) - i0), A = follow(i0), B = follow(i1); cam = [lerp(A[0], B[0], q), lerp(A[1], B[1], q)]; }
    if (today && t > endT) { const q = ioC(pr(t, endT, endT + 0.7)), T2 = follow(today - 1); cam = [lerp(cam[0], T2[0], q), lerp(cam[1], T2[1], q)]; }
    const zIn = ioC(pr(t, s + 0.2, t0 + 0.3)), center = [540, 860], camA = [lerp(center[0], cam[0], zIn), lerp(center[1], cam[1], zIn)], z = lerp(1, zoom, zIn);
    X.save(); X.globalAlpha *= fade;
    for (let i = 0; i < N; i++) { const [wx, wy] = pos(i), sx = 540 + (wx - camA[0]) * z, sy = 960 + (wy - camA[1]) * z, dist = Math.hypot(sx - 540, (sy - 960) * 1.4), bl = cl((dist - 260) / 300) * 10;
      const appear = cOut(pr(t, s, s + 0.5)), on = i < lit && t >= t0 + i * ev, kp = i < lit ? pr(t, t0 + i * ev, t0 + i * ev + 0.35) : 0, pop = kp > 0 && kp < 1 ? lerp(1.15, 1, bOut(kp)) : 1, isT = i === today - 1;
      X.save(); X.globalAlpha *= appear; if (bl > 0.4) X.filter = `blur(${bl.toFixed(1)}px)`; X.translate(sx, sy); X.scale(z * pop, z * pop);
      if (on) { shd(X, 60, 0, 0, rgba(c.acc, 0.45)); X.fillStyle = c.acc; } else if (isT) X.fillStyle = c.inkL === c.bg ? c.ink : c.inkL; else X.fillStyle = c.surf;
      rr(X, -75, -75, 150, 150, 44); X.fill(); noShd(X); if (!on && !isT) { X.lineWidth = 1.5; X.strokeStyle = c.line; X.stroke(); }
      if (isT) T(ctx, X, o.todayLabel || 'اليوم', 0, 14, 38, { weight: 800, color: c.inkD === c.ink ? c.bg : c.inkD, family: f });
      else T(ctx, X, String(i + 1), 0, 19, 54, { weight: 600, color: on ? c.on : c.mut, dir: 'ltr', family: f });
      if (on && o.values && o.values[i] != null) T(ctx, X, o.values[i], 0, 124, 28, { weight: 600, color: c.soft, dir: 'ltr', family: f });
      X.restore(); }
    if (o.title) { const e = env(t, s + 0.1, null, { din: 0.5, bIn: 20 }); withE(X, e, 540, 300, () => { const M = marks(o.title), L = layout(ctx, X, M.text, 92, 900, 900, 1.25, f); boxes(L, 540, 330, 'center').forEach(b => drawWord(ctx, X, b, 92, 900, M.acc.includes(b.i) ? c.acc : c.ink, f)); }); }
    if (o.sub) { const e = env(t, s + 0.2, null); withE(X, e, 540, 410, () => T(ctx, X, o.sub, 540, 420, 40, { weight: 400, color: c.soft, family: f })); }
    X.restore();
  };

  /* 272 شبكة وعمق — لقطة وحدة بلا قص: الكاميرا تنزل على شبكة بعمق بين 3 أقسام (كلمة كبيرة لكل قسم)، طبقات بسرعات مختلفة، وخط نبض يرتسم ويا الكاميرا.
     o: {s, out, items:[{kick, word, sub, acc}], hold=1.6, glide=.9, objects:[صور اختيارية للطبقة القريبة]} */
  FX.depthGrid = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = o.s || 0, f = fam(o), hold = o.hold || 1.6, gl = o.glide || 0.9, SP = 1300;
    const items = o.items || [{ kick: 'ابدي بـ', word: 'PROMPT', sub: 'قول شنو تريد بالضبط' }, { kick: 'وبعدين', word: 'CONTEXT', sub: 'كل اللي يعرفه عن شغلك', acc: true }, { kick: 'وكل كلمة تنحسب', word: 'TOKEN', sub: 'قطع النص اللي يقراها' }];
    const n = items.length, arr = i => s + i * (hold + gl); let cy = 0;
    for (let i = 1; i < n; i++) cy += SP * ioC(pr(t, arr(i) - gl, arr(i)));
    cy += 100 * pr(t, arr(n - 1), arr(n - 1) + 2.6);
    const fade = o.out != null ? 1 - cIn(pr(t, o.out, o.out + 0.35)) : 1; if (fade <= ON) return;
    X.save(); X.globalAlpha *= fade;
    // الشبكة البعيدة (أبطأ)
    const gy = -((cy * 0.45) % 120), gcol = c.dark ? mixC(c.bg, c.ink, 0.07) : mixC(c.bg, c.inkD, 0.09);
    X.strokeStyle = gcol; X.lineWidth = 1.5; X.beginPath(); for (let x = 60; x <= 1080; x += 120) { X.moveTo(x, 0); X.lineTo(x, 1920); } for (let y = gy; y <= 1920; y += 120) { X.moveTo(0, y); X.lineTo(1080, y); } X.stroke();
    X.fillStyle = mixC(c.bg, c.ink, 0.16); for (let x = 0; x <= 1080; x += 120) for (let y = gy + 60; y <= 1920; y += 120) X.fillRect(x - 3, y - 3, 6, 6);
    let g = X.createRadialGradient(540, 960, 0, 540, 960, 900); g.addColorStop(0, rgba(c.acc, c.dark ? 0.1 : 0.08)); g.addColorStop(1, rgba(c.acc, 0)); X.fillStyle = g; X.fillRect(0, 0, 1080, 1920);
    if (c.dark) { g = X.createRadialGradient(540, 960, 700, 540, 960, 1400); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.5)'); X.fillStyle = g; X.fillRect(0, 0, 1080, 1920); }
    // خط النبض
    const pts = []; items.forEach((_, i) => { const y = 1060 + i * SP, beat = x => [[x, y], [x + 30, y - 90], [x + 60, y + 70], [x + 90, y - 30], [x + 110, y]];
      pts.push([80, y], ...beat(i % 2 ? 300 : 380), ...(i % 2 ? beat(620) : []), [1000, y]); if (i < n - 1) pts.push([1000, y + 540], [540, y + 540], [540, y + 740], [80, y + 740 + 0.01]); });
    const totalT = arr(n - 1) + 1.2 - s, kk = lerp(0.03, 1, pr(t, s + 0.4, s + 0.4 + totalT));
    X.save(); X.translate(0, -cy); X.strokeStyle = c.acc; X.lineWidth = 5; X.lineCap = 'round'; X.lineJoin = 'round'; shd(X, 14, 0, 0, rgba(c.acc, 0.7)); partPath(X, pts, kk); noShd(X); X.restore();
    // الأشياء (طبقتين)
    const OB = [[0, 680, 1240, 150, 0, -8], [1, -260, 1500, 300, 10, 12], [0, 130, 2540, 160, 0, 6], [1, 990, 2900, 280, 12, -14], [0, 690, 3840, 150, 0, -6], [1, -250, 4200, 300, 11, 10]];
    const objs = (o.objects || []).map(v => imgOf(ctx, v)).filter(Boolean);
    const drawObj = (front) => OB.forEach((b, i) => { if (!!b[0] !== front || i >= n * 2) return; const par = front ? 1.5 : 1.05, x = b[1] + b[3] * 0.5, y = b[2] - cy * par + Math.sin(t * 1.3 + i) * 12, r = b[3], rot = (b[5] + Math.sin(t * 0.9 + i) * 4) * Math.PI / 180;
      if (y < -r * 2 || y > 1920 + r * 2) return; X.save(); if (b[4]) X.filter = `blur(${b[4]}px)`; const im = objs.length ? objs[i % objs.length] : null;
      if (im) { X.translate(x, y); X.rotate(rot); drawContain(X, im, 0, 0, r * 2, r * 2); } else FX.gem(ctx, X, x, y, r * 0.75, rot, { glow: !b[4] }); X.restore(); });
    drawObj(false);
    // نص الأقسام
    items.forEach((it, i) => { const yb = 640 + i * SP - cy, a = i ? arr(i) - gl * 0.4 : s + 0.1; if (yb < -600 || yb > 2400) return;
      [[it.kick, 46, 400, c.soft, 0], [it.word, 190, 900, it.acc ? c.acc : c.ink, 1], [it.sub, 40, 400, c.soft, 2]].forEach(([str, size, w, col, k]) => { if (!str) return; const p = eOut(pr(t, a + k * 0.12, a + k * 0.12 + 0.6)); if (p <= ON) return;
        const yy = yb + [0, 200, 290][k]; X.save(); X.globalAlpha *= p; if (p < 0.98) X.filter = `blur(${(20 * (1 - p)).toFixed(1)}px)`; X.translate(540, yy + 40 * (1 - p)); if (k === 1) X.scale(1, 1.12);
        T(ctx, X, str, 0, 0, k === 1 ? fitSize(ctx, X, str, size, w, 960, f) : size, { weight: w, color: col, family: f, maxWidth: 960 }); X.restore(); });
      T(ctx, X, String(i + 1).padStart(2, '0') + (isAr(it.word) ? '' : ' / ' + it.word), 1000, yb - 80, 20, { weight: 600, color: c.mut, align: 'right', dir: 'ltr', letterSpacing: 5, family: f, alpha: 0.9 }); });
    drawObj(true);
    X.restore();
  };

  /* 273 صفحة مشروع تنسحب — نافذة متصفح (عنوان، شارات، أسطر، صناديق أوامر) تطلع من تحت، والصفحة الطويلة تنسحب داخلها مع وقفة على كل أمر.
     o: {s, out, url='github.com / owner / repo', title='Project', badges:['open source','macOS','Linux'], code:['$ tool run x', …], x=120, y=520, w=840, h=1060, scroll:[[t,dur,dy],…]} */
  FX.readmeScroll = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = o.s || 0, f = fam(o), x0 = pick(o, 'x', 120), y0 = pick(o, 'y', 520), w = o.w || 840, h = o.h || 1060;
    const card = c.dark ? mixC(c.bg, c.ink, 0.06) : '#FFFFFF', bar = c.dark ? mixC(c.bg, c.ink, 0.1) : mixC(c.bg, '#FFFFFF', 0.4), ln = c.dark ? mixC(card, c.ink, 0.1) : mixC('#FFFFFF', c.inkD, 0.09);
    const code = o.code || ['$ tool run model', '$ tool list', '$ tool pull model-2'], badges = o.badges || ['open source', 'macOS', 'Windows', 'Linux'];
    const e = env(t, s, o.out, { din: 0.6, yIn: 120, sIn: 0.9, bIn: 16 });
    withE(X, e, x0 + w / 2, y0 + h / 2, () => {
      X.save(); shd(X, 80, 40, c.dark ? 0.6 : 0.18); X.fillStyle = card; rr(X, x0, y0, w, h, 28); X.fill(); noShd(X); X.lineWidth = 1.5; X.strokeStyle = c.line; X.stroke(); X.clip();
      const sc = o.scroll || [[0.9, 0.7, 260], [1.9, 0.8, 190], [3.0, 0.8, 110]]; let dy = 0; sc.forEach(([a, d, v]) => { dy += v * ioC(pr(t, s + a, s + a + d)); });
      X.save(); X.beginPath(); X.rect(x0, y0 + 70, w, h - 70); X.clip(); X.translate(0, -dy);
      let y = y0 + 150; const L = x0 + 44, R = w - 88;
      T(ctx, X, o.title || 'Project', L, y, 52, { weight: 800, color: c.ink, align: 'left', dir: 'ltr', family: f }); y += 46;
      let bx = L; badges.forEach((b, i) => { const bw = tw(ctx, X, b, 18, 600, f) + 28; X.fillStyle = i === 0 ? c.acc : ln; rr(X, bx, y, bw, 34, 8); X.fill(); T(ctx, X, b, bx + bw / 2, y + 24, 18, { weight: 600, color: i === 0 ? c.on : c.mut, dir: 'ltr', family: f }); bx += bw + 10; });
      y += 70; const lines = ws => ws.forEach(q => { X.fillStyle = ln; rr(X, L, y, R * q, 16, 8); X.fill(); y += 32; });
      code.forEach((cmd, i) => { lines(i === 0 ? [0.92, 0.8, 0.86] : [0.4, 1, 0.74, 0.88, 0.66]); y += 10;
        X.fillStyle = c.code; rr(X, L, y, R, 84, 16); X.fill(); const parts = String(cmd).split(' ');
        let cx = L + 26; parts.forEach((p, k) => { const col = k === 1 || (k === 0 && p !== '$') ? c.acc : c.codeInk; T(ctx, X, p, cx, y + 54, 26, { weight: 600, color: col, align: 'left', dir: 'ltr', family: f }); cx += tw(ctx, X, p + ' ', 26, 600, f); });
        y += 120; });
      lines([0.4, 1, 0.84, 0.58, 0.9, 0.72]); X.restore();
      X.fillStyle = bar; X.fillRect(x0, y0, w, 70); X.fillStyle = c.line; X.fillRect(x0, y0 + 70, w, 1.5);
      for (let i = 0; i < 3; i++) { X.fillStyle = mixC(bar, c.ink, 0.2); X.beginPath(); X.arc(x0 + 34 + i * 24, y0 + 35, 7, 0, TAU); X.fill(); }
      T(ctx, X, o.url || 'github.com / owner / repo', x0 + 120, y0 + 43, 22, { weight: 500, color: c.mut, align: 'left', dir: 'ltr', family: f });
      X.restore();
    });
  };

  /* 274 نجمة تعبر قدام — نجمة غامقة مضبّبة (قريبة من الكاميرا) تعبر الشاشة وتلف وتغطي القص بين مشهدين.
     o: {s, dur=.6, A, B (مشاهد: Y=>{…})، points=8, dir='up'|'down', color, cover=true (بالنص تغطي الشاشة كاملة)} */
  FX.starSweep = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = o.s || 0, d = o.dur || 0.6, k = ioC(pr(t, s, s + d));
    if (o.A || o.B) { const sc = (t < s + d / 2 ? o.A : o.B) || o.A || o.B; X.save(); sc(X); X.restore(); }
    if (t < s || t > s + d) return;
    const up = (o.dir || 'up') === 'up', x0 = up ? 1300 : -220, y0 = up ? 2200 : -300, x1 = up ? -220 : 1300, y1 = up ? -300 : 2200;
    const x = lerp(x0, x1, k), y = lerp(y0, y1, k), cover = o.cover !== false && (o.A || o.B), peak = 1 - Math.abs(2 * k - 1);
    const R = cover ? lerp(700, 3500, Math.pow(peak, 1.6)) : 620, n = o.points || 8, col = o.color || c.inkD;
    X.save(); X.filter = `blur(${cover ? 6 + 10 * (1 - peak) : 10}px)`; const g = X.createLinearGradient(x - R, y - R, x + R, y + R); g.addColorStop(0, mixC(col, '#8A8F99', 0.25)); g.addColorStop(0.5, mixC(col, '#000000', 0.1)); g.addColorStop(1, col);
    X.fillStyle = g; starPath(X, x, y, R, n, k * TAU / 3, 0.34); X.fill(); X.restore();
  };

  /* 275 خطوة مرقّمة — «#رقم» ينضرب كبير بالنص ويصعد فوق، والعنوان (كلمة لاتينية) يطلع، وكرت غامق ينكتب فيه السطر، وملصق أمر يفرقع بخط منقّط، وسطر تحت.
     o: {s, out (افتراضي s+1.55), n=1, total=4, lead, key, prompt, tag, sub, note ('*كلمة*' مميزة)} */
  FX.promptStep = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), a = o.s || 0, z = pick(o, 'out', a + 1.55), f = fam(o), n = String(pick(o, 'n', 1));
    const gone = cIn(pr(t, z, z + 0.25)); if (gone >= 1) return;
    // الرقم
    const ni = bOut(pr(t, a, a + 0.3)), nz = ioC(pr(t, a + 0.45, a + 0.8)); if (ni > ON) { X.save(); X.globalAlpha *= cl(ni * 3) * (1 - gone); if (gone > 0.02) X.filter = `blur(${(12 * gone).toFixed(1)}px)`;
      const sc = lerp(1.4, 1, ni) * lerp(1, 0.4, nz), yy = lerp(900, 330, nz); X.translate(540, yy); X.scale(sc, sc);
      const w1 = tw(ctx, X, '#', 260, 900, f), w2 = tw(ctx, X, n, 260, 900, f), tot = w1 + w2; T(ctx, X, '#', -tot / 2 + w1 / 2, 90, 260, { weight: 900, color: c.ink, dir: 'ltr', family: f }); T(ctx, X, n, -tot / 2 + w1 + w2 / 2, 90, 260, { weight: 900, color: c.acc, dir: 'ltr', family: f }); X.restore(); }
    const E = (d, opt) => env(t, a + d, z, opt);
    if (o.lead) withE(X, E(0.5, { yIn: 12 }), 540, 470, () => T(ctx, X, o.lead, 540, 470, 46, { weight: 400, color: c.soft, family: f }));
    if (o.key) withE(X, E(0.56, { din: 0.45, bIn: 22 }), 540, 590, () => T(ctx, X, o.key, 540, 600, fitSize(ctx, X, o.key, 110, 900, 860, f), { weight: 900, color: c.ink, family: f }));
    // الكرت
    const cy = 680, ch = 270; withE(X, E(0.6, { yIn: 50, sIn: 0.94, bIn: 20 }), 540, cy + ch / 2, () => { X.save(); shd(X, 90, 40, c.dark ? 0.6 : 0.3); X.fillStyle = c.code; rr(X, 120, cy, 840, ch, 26); X.fill(); noShd(X);
      const str = o.prompt || 'أنت مسوّق لمحل قهوة صغير.', k = pr(t, a + 0.75, a + 0.75 + Math.max(0.5, String(str).length / 46)), shown = typed(str, k) + (t < a + 1.5 ? caret(t) : '');
      const L = layout(ctx, X, shown || ' ', 34, 400, 760, 1.6, f); boxes(L, isAr(str) ? 920 : 160, cy + 76, isAr(str) ? 'right' : 'left').forEach(b => drawWord(ctx, X, b, 34, 400, c.codeInk, f));
      T(ctx, X, `PROMPT · PART ${n}/${pick(o, 'total', 4)}`, 160, cy + ch - 26, 18, { weight: 600, color: c.mut, align: 'left', dir: 'ltr', letterSpacing: 4, family: f });
      X.fillStyle = mixC(c.code, c.codeInk, 0.15); rr(X, 892, cy + ch - 60, 40, 40, 10); X.fill(); T(ctx, X, '↑', 912, cy + ch - 30, 22, { weight: 700, color: c.codeInk, family: f }); X.restore(); });
    // الملصق + الخط المنقّط
    if (o.tag !== null) { const tag = o.tag || '/role', q = bOut(pr(t, a + 0.85, a + 1.17)); const dl = pr(t, a + 0.95, a + 1.35) * (1 - gone);
      if (dl > 0) { X.save(); X.strokeStyle = c.mut; X.lineWidth = 3; X.lineCap = 'round'; if (X.setLineDash) X.setLineDash([2, 10]); partPath(X, [[700, 690], [730, 650], [780, 625], [820, 612]], dl); X.restore(); }
      if (q > ON) { X.save(); X.globalAlpha *= cl(q * 3) * (1 - gone); const tw0 = tw(ctx, X, tag, 40, 600, f) + 60; X.translate(860, 600); X.rotate(-6 * Math.PI / 180); X.scale(lerp(0.4, 1, q), lerp(0.4, 1, q));
        shd(X, 40, 18, 0.25); X.fillStyle = c.acc; rr(X, -tw0 / 2, -38, tw0, 76, 16); X.fill(); noShd(X); T(ctx, X, tag, 0, 14, 40, { weight: 600, color: c.on, dir: 'ltr', family: f }); X.restore(); } }
    if (o.sub) withE(X, E(0.95, { yIn: 12 }), 540, 1060, () => T(ctx, X, o.sub, 540, 1060, 44, { weight: 400, color: c.soft, family: f }));
    if (o.note) withE(X, E(1.0, { bIn: 20 }), 540, 1170, () => { const M = marks(o.note), L = layout(ctx, X, M.text, 84, 900, 900, 1.2, f); boxes(L, 540, 1180, 'center').forEach(b => drawWord(ctx, X, b, 84, 900, M.acc.includes(b.i) ? c.acc : c.ink, f)); });
  };

  /* 276 بولارويد على حبل — حبل مرخي، والصور تطيح عليه وحدة وحدة وتتمرجح (الأولى يمين)، الكاميرا تمشي معها وبالآخر ترجع تشوف الكل.
     o: {s, out, items:[{big, cap, img}], every=.75, pull (وقت الرجعة، افتراضي بعد آخر صورة)} */
  FX.polaroidString = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = o.s || 0, f = fam(o), ev = o.every || 0.75;
    const items = o.items || [{ big: '☺☺', cap: 'إيموجي بكل سطر' }, { big: '—', cap: 'شَرطات طويلة' }, { big: '«…»', cap: 'بداية محفوظة' }, { big: '6', cap: 'إيد بستة أصابع' }, { big: '؟', cap: 'كلام عام بلا تجربة' }];
    const n = items.length, DX = 560, SY = 520, xi = i => 540 - i * DX, start = s + 0.6, pull = pick(o, 'pull', start + (n - 1) * ev + 0.9);
    const fade = o.out != null ? 1 - cIn(pr(t, o.out, o.out + 0.35)) : 1; if (fade <= ON) return;
    let cx0 = xi(0); for (let i = 1; i < n; i++) cx0 += (xi(i) - xi(i - 1)) * ioC(pr(t, start + i * ev - 0.45, start + i * ev + 0.05));
    const pq = ioC(pr(t, pull, pull + 0.9)), mid = (xi(0) + xi(n - 1)) / 2, z = lerp(1, Math.min(1, 1000 / ((n - 1) * DX + 520)), pq), cx = lerp(cx0, mid, pq), cyw = lerp(1000, 900, pq);
    X.save(); X.globalAlpha *= fade; X.translate(540, 960); X.scale(z, z); X.translate(-cx, -cyw);
    // الحبل
    const sk = pr(t, s, s + 0.4); X.save(); X.globalAlpha *= sk; X.strokeStyle = rgba(c.ink, 0.75); X.lineWidth = 4; if (X.setLineDash) X.setLineDash([14, 10]); X.beginPath();
    X.moveTo(xi(0) + DX / 2 + 260, SY - 50); X.lineTo(xi(0) + DX / 2, SY); for (let i = 0; i < n; i++) X.quadraticCurveTo(xi(i), SY + 120, xi(i) - DX / 2, SY); X.lineTo(xi(n - 1) - DX / 2 - 260, SY - 50); X.stroke(); X.restore();
    const paper = mixC('#FFFFFF', c.bg, c.dark ? 0.04 : 0.1), capInk = '#1A1C20';
    items.forEach((it, i) => { const a = start + i * ev - 0.2, k = bOut(pr(t, a, a + 0.5)); if (k <= ON) return; const d = Math.max(0, t - a), sw = Math.exp(-2.2 * d) * Math.sin(d * 7) * 9 + [-3, 2, -2, 3, -1][i % 5];
      X.save(); X.globalAlpha *= cl(k * 3); X.translate(xi(i), SY + 60 - 260 * (1 - cl(k))); X.rotate(sw * Math.PI / 180); X.translate(0, 40);
      shd(X, 50, 26, c.dark ? 0.5 : 0.22); X.fillStyle = paper; X.fillRect(-210, 0, 420, 552); noShd(X);
      const im = imgOf(ctx, it.img); if (im) drawCover(X, im, -188, 22, 376, 400); else { X.fillStyle = c.code; X.fillRect(-188, 22, 376, 400); const g = X.createRadialGradient(188, 22, 0, 188, 22, 300); g.addColorStop(0, rgba(c.acc, 0.25)); g.addColorStop(1, rgba(c.acc, 0)); X.fillStyle = g; X.fillRect(-188, 22, 376, 400);
        T(ctx, X, it.big || String(i + 1), 0, 280, fitSize(ctx, X, it.big || String(i + 1), 150, 900, 320, f), { weight: 900, color: c.acc, family: f }); }
      T(ctx, X, '0' + (i + 1), 160, 60, 22, { weight: 600, color: '#ADB3BD', dir: 'ltr', family: f });
      T(ctx, X, it.cap || '', 0, 500, 34, { weight: 700, color: capInk, maxWidth: 380, family: f });
      X.strokeStyle = '#6A707B'; X.lineWidth = 7; X.beginPath(); X.moveTo(-14, 30); X.lineTo(-14, -40); X.arcTo(-14, -48, -6, -48, 8); X.lineTo(6, -48); X.arcTo(14, -48, 14, -40, 8); X.lineTo(14, 30); X.stroke();
      X.restore(); });
    X.restore();
  };

  /* 277 كلمة ورا الشي — كلمة عملاقة باهتة ورا، وشي (صورتك أو كريستالة مرسومة) قدامها يطلع من الضباب ويطفو، وعنوان فوق؛ وتبديل الشي بلقطة (Generate).
     o: {s, out, word, img, swap (الصورة الثانية), swapAt, lead, text ('*كلمة*'), drift=30, y=900} */
  FX.giantWordObject = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = o.s || 0, z = o.out, f = fam(o), word = o.word || 'AI', y = pick(o, 'y', 900);
    const lat = !isAr(word), size = o.size || fitSize(ctx, X, word, lat ? 560 : 330, 900, 1160, f), ge = env(t, s, z, { din: 0.6, bIn: 30, yIn: 0, sIn: 1.15, sOut: 0.9 }); ge.x = (o.dir || 1) * pick(o, 'drift', 30) * (t - s);
    withE(X, ge, 540, y, () => T(ctx, X, word, 540, y + size * 0.36, size, { weight: 900, color: mixC(c.bg, c.ink, c.dark ? 0.12 : 0.1), family: f }));
    const ce = env(t, s + 0.12, z == null ? null : z - 0.05, { din: 0.55, bIn: 24, yIn: 90, sIn: 0.8 }); ce.y += Math.sin(t * 1.8) * 14; ce.r = Math.sin(t * 1.1) * 3 * Math.PI / 180;
    const sw = o.swapAt != null ? cOut(pr(t, o.swapAt, o.swapAt + 0.4)) : 0, A = imgOf(ctx, o.img), B = imgOf(ctx, o.swap);
    withE(X, ce, 540, y, () => { const one = (im, a, b, sc, alt) => { if (a <= ON) return; X.save(); X.globalAlpha *= a; if (b > 0.3) X.filter = `blur(${b.toFixed(1)}px)`; X.translate(540, y); X.scale(sc, sc);
        if (im) drawContain(X, im, 0, 0, 800, 800); else FX.gem(ctx, X, 0, 0, 280, alt ? 0.5 : 0, { sides: alt ? 8 : 6 }); X.restore(); };
      one(A, 1 - sw, 20 * sw, lerp(1, 0.9, sw), false); if (o.swapAt != null) one(B, sw, 20 * (1 - sw), lerp(1.1, 1, bOut(pr(t, o.swapAt, o.swapAt + 0.45))), true); });
    if (o.lead) withE(X, env(t, s + 0.05, z, { yIn: 12 }), 540, 260, () => T(ctx, X, o.lead, 540, 270, 46, { weight: 400, color: c.soft, family: f }));
    if (o.text) withE(X, env(t, s + 0.13, z == null ? null : z + 0.03, { din: 0.5, bIn: 22 }), 540, 360, () => { const M = marks(o.text), L = layout(ctx, X, M.text, 92, 900, 920, 1.2, f); boxes(L, 540, 380, 'center').forEach(b => drawWord(ctx, X, b, 92, 900, M.acc.includes(b.i) ? c.acc : c.ink, f)); });
  };

  /* 278 كلمات وأغراض — ورق بشبكة وخطوط إرشاد ترتسم وقوس ناعم، الكلمات تنبني وحدة على كل نبضة (سطر صغير، سطر عريض…)، وأغراض حقيقية (صورك) تدخل من الزوايا وتطفو.
     o: {s, out, lines:['كنت أدفع','200$','بالشهر على أدوات AI'], big=1 (رقم السطر العريض)، beat=.35, align:['right','right','left'], x=970, y=690, props:[{img|kind, x, y, w, rot, from:[dx,dy], at}], paper=true, guides=true, arc=true} */
  FX.wordProps = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = o.s || 0, f = fam(o), beat = o.beat || 0.35, u = t - s;
    const fade = o.out != null ? 1 - cIn(pr(t, o.out, o.out + 0.35)) : 1; if (fade <= ON) return; X.save(); X.globalAlpha *= fade;
    if (o.paper !== false) { const g = X.createRadialGradient(540, 860, 80, 540, 960, 1250); g.addColorStop(0, c.dark ? mixC(c.bg, c.ink, 0.05) : mixC(c.bg, '#FFFFFF', 0.6)); g.addColorStop(0.55, c.bg); g.addColorStop(1, mixC(c.bg, c.dark ? '#000000' : c.inkD, 0.06)); X.fillStyle = g; X.fillRect(0, 0, 1080, 1920);
      X.strokeStyle = c.dark ? rgba(c.acc, 0.05) : rgba(c.inkD, 0.07); X.lineWidth = 1.5; X.beginPath(); for (let i = 0; i <= 1080; i += 82) { X.moveTo(i + 0.5, 0); X.lineTo(i + 0.5, 1920); } for (let j = 0; j <= 1920; j += 82) { X.moveTo(0, j + 0.5); X.lineTo(1080, j + 0.5); } X.stroke(); }
    if (o.guides !== false) { const GL = o.guidePaths || [[[-40, 1080], [520, 820], [1140, 380]], [[230, -40], [395, 980], [560, 2000]], [[-40, 520], [640, 990], [1140, 1460]]];
      GL.forEach((pts, i) => { const q = cOut((u + 0.5 - i * 0.08) / 0.9); X.save(); X.translate(Math.sin(u * 0.5 + i) * 10, u * 6 * (i % 2 ? -1 : 1)); X.strokeStyle = rgba(c.dark ? c.line : c.mut, c.dark ? 0.9 : 0.6); X.lineWidth = 2.2; partPath(X, pts, q); X.restore(); }); }
    if (o.arc !== false) { const q = ioC((u - 0.9) / 1.1); if (q > 0) { X.save(); X.filter = 'blur(2.5px)'; X.strokeStyle = c.dark ? rgba(c.acc, 0.13) : rgba(mixC(c.bg, c.ink, 0.3), 0.55); X.lineWidth = 58; X.lineCap = 'round';
      const pts = []; for (let i = 0; i <= 24; i++) { const k = i / 24; pts.push([lerp(-60, 1140, k), 1520 - Math.sin(k * Math.PI) * 330]); } partPath(X, pts, q); X.restore(); } }
    // الأغراض
    const props = o.props || [{ kind: 'receipt', x: 900, y: 90, w: 360, rot: 24, from: [420, -380] }, { kind: 'stack', x: 180, y: 1560, w: 640, rot: -14, from: [-460, 420] }, { kind: 'phone', x: 920, y: 1620, w: 400, rot: -22, from: [380, 460], at: 1.6 }];
    props.forEach((p, i) => { const a = s + pick(p, 'at', -0.1 + i * 0.07), k = qOut(pr(t, a, a + (p.d || 0.75))); if (k <= ON) return; const im = imgOf(ctx, p.img) || FX.propCanvas(p.kind || 'receipt', P), w = p.w || 400, h = w * imH(im) / imW(im), du = t - a, fr = p.from || [0, 0];
      X.save(); X.globalAlpha *= cl(k * 3); X.translate(p.x + fr[0] * (1 - k) + Math.sin(du * 0.7) * 8, p.y + fr[1] * (1 - k) + Math.cos(du * 0.6) * 6); X.rotate((lerp(pick(p, 'rot0', (p.rot || 0) + 16), p.rot || 0, k) + Math.sin(du * 0.55) * 1.2) * Math.PI / 180); X.scale(lerp(1.06, 1, k), lerp(1.06, 1, k));
      shd(X, 40, 30, c.dark ? 0.5 : 0.2); X.drawImage(im, -w / 2, -h / 2, w, h); noShd(X); X.restore(); });
    // الكلمات
    const lines = (o.lines || ['كنت أدفع', '200$', 'بالشهر على أدوات AI']).map(l => (Array.isArray(l) ? l.join(' ') : String(l))), big = pick(o, 'big', 1), al = o.align || [], xR = pick(o, 'x', 970), xL = 1080 - xR;
    const spec = lines.map((ln, li) => { const isB = li === big, size0 = isB ? (o.bigSize || 250) : (o.smallSize || 60), w = isB ? 900 : 400, size = fitSize(ctx, X, ln, size0, w, xR - xL, f); return { ln, isB, w, size, L: layout(ctx, X, ln, size, w, xR - xL + 1, 1.2, f) }; });
    const blockL = xR - Math.max(...spec.map(q => q.L.width));   // يسار الكتلة = يسار أعرض سطر
    let y = pick(o, 'y', 690), wi = 0;
    spec.forEach(({ ln, isB, w, size, L }, li) => {
      y += isB ? size * 0.92 : size * 1.05; const a2 = al[li] || (li === lines.length - 1 && lines.length > 2 ? 'left' : 'right'), B = boxes(L, a2 === 'left' ? blockL : xR, y, a2);
      B.forEach(b => { const tb = o.times ? o.times[wi] : (wi < 2 ? -0.6 + wi * 0.12 : 0.2 + (wi - 2) * beat) + (o.times ? 0 : 0), p = cOut(pr(u, tb, tb + (isB ? 0.42 : 0.38))); wi++; if (p <= ON) return;
        X.save(); X.globalAlpha *= p; if (p < 0.98) X.filter = `blur(${((isB ? 20 : 14) * (1 - p)).toFixed(1)}px)`; X.translate(b.cx, b.cy + (isB ? 30 : 20) * (1 - p)); const sc = lerp(isB ? 1.08 : 0.98, 1, p); X.scale(sc, sc); X.translate(-b.cx, -b.cy);
        drawWord(ctx, X, b, size, w, isB ? (o.bigColor || c.ink) : c.soft, f); X.restore(); });
      y += isB ? size * 0.12 : size * 0.25; });
    X.restore();
  };

  /* 279 الذكاء يشوف — صناديق كشف تقفل على الأشياء (زوايا تصغر لمقاسها)، وبطاقة اسم ونسبة تعدّ، وخط مسح يعبر.
     o: {s, out, boxes:[{x, y, w, h, label, score}], every=.35, scan=true, draw (الفيديو)} */
  FX.detectBoxes = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = o.s || 0, f = fam(o); if (o.draw) o.draw(X);
    const fade = o.out != null ? 1 - cIn(pr(t, o.out, o.out + 0.3)) : 1; if (fade <= ON) return; X.save(); X.globalAlpha *= fade;
    if (o.scan !== false) { const k = pr(t, s, s + 1.2); if (k > 0 && k < 1) { const y = lerp(150, 1750, ioC(k)), g = X.createLinearGradient(0, y - 120, 0, y + 6); g.addColorStop(0, rgba(c.acc, 0)); g.addColorStop(1, rgba(c.acc, 0.22)); X.fillStyle = g; X.fillRect(0, y - 120, 1080, 126); X.fillStyle = rgba(c.acc, 0.9); X.fillRect(0, y, 1080, 3); } }
    const B = o.boxes || [{ x: 300, y: 620, w: 480, h: 560, label: 'شخص', score: 98 }, { x: 120, y: 1260, w: 260, h: 200, label: 'كوب', score: 91 }, { x: 700, y: 1240, w: 280, h: 240, label: 'لابتوب', score: 87 }];
    B.forEach((b, i) => { const a = s + 0.2 + i * (o.every || 0.35), k = cOut(pr(t, a, a + 0.35)); if (k <= ON) return; const sc = lerp(1.35, 1, k), cx = b.x + b.w / 2, cy = b.y + b.h / 2, w = b.w * sc, h = b.h * sc, x0 = cx - w / 2, y0 = cy - h / 2, L = Math.min(w, h) * 0.22;
      X.save(); X.globalAlpha *= k; X.fillStyle = rgba(c.acc, 0.07 * k); X.fillRect(x0, y0, w, h); X.strokeStyle = c.acc; X.lineWidth = 5; X.lineCap = 'round';
      [[x0, y0, 1, 1], [x0 + w, y0, -1, 1], [x0, y0 + h, 1, -1], [x0 + w, y0 + h, -1, -1]].forEach(([x, y, dx, dy]) => { X.beginPath(); X.moveTo(x + dx * L, y); X.lineTo(x, y); X.lineTo(x, y + dy * L); X.stroke(); });
      X.lineWidth = 1.5; X.strokeStyle = rgba(c.acc, 0.5); X.strokeRect(x0, y0, w, h); X.restore();
      const q = bOut(pr(t, a + 0.25, a + 0.55)); if (q > ON) { const sc2 = Math.round((b.score || 90) * cOut(pr(t, a + 0.25, a + 0.7))), lab = `${b.label || ''}  ${sc2}%`, lw = tw(ctx, X, lab, 28, 700, f) + 32;
        X.save(); X.globalAlpha *= cl(q * 3); X.translate(b.x + b.w, b.y - 8); X.scale(lerp(0.6, 1, q), lerp(0.6, 1, q)); X.fillStyle = c.acc; rr(X, -lw, -48, lw, 48, 10); X.fill(); T(ctx, X, lab, -lw / 2, -14, 28, { weight: 700, color: c.on, family: f }); X.restore(); } });
    X.restore();
  };

  /* 280 خط ضوء يمسح — خط ضوء عمودي باللون المميز يعبر من اليمين لليسار، واللي عبره صار المشهد الجديد (اتجاه القراءة العربية).
     o: {s, dur=.3, A, B, width=6, dir='rtl'|'ltr'} */
  FX.lightLineWipe = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = o.s || 0, d = o.dur || 0.3, k = ioC(pr(t, s, s + d)), rtl = (o.dir || 'rtl') === 'rtl';
    const x = rtl ? lerp(1120, -40, k) : lerp(-40, 1120, k);
    if (o.A) { X.save(); o.A(X); X.restore(); }
    if (o.B && k > 0) { X.save(); X.beginPath(); rtl ? X.rect(x, 0, 1080 - x + 60, 1920) : X.rect(-60, 0, x + 60, 1920); X.clip(); o.B(X); X.restore(); }
    if (k <= 0 || k >= 1) return; const W = o.width || 6, g = X.createLinearGradient(x - 170, 0, x + 170, 0); g.addColorStop(0, rgba(c.acc, 0)); g.addColorStop(0.5, rgba(c.acc, 0.55)); g.addColorStop(1, rgba(c.acc, 0));
    X.save(); X.fillStyle = g; X.fillRect(x - 170, 0, 340, 1920); X.fillStyle = mixC(c.acc, '#FFFFFF', 0.6); X.fillRect(x - W / 2, 0, W, 1920); X.restore();
  };

  /* 281 مسحة عربية ناعمة — الكلمة تنكشف من حافة اليمين لليسار بحافة ناعمة وضباب يستقر، وخط نبض اختياري ينرسم تحتها بنفس الاتجاه.
     o: {s, out, text, size=200, y=960, dur=.7, feather=160, color, lead, line=false} */
  FX.rtlWipeText = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = o.s || 0, f = fam(o), str = o.text || 'استراتيجية', y = pick(o, 'y', 960), d = o.dur || 0.7, fe = o.feather || 160;
    const k = cOut(pr(t, s, s + d)), ko = o.out != null ? cIn(pr(t, o.out, o.out + 0.3)) : 0; if (k <= 0 || ko >= 1) return;
    const size = fitSize(ctx, X, str, o.size || 200, 900, 940, f), H = Math.ceil(size * 1.8), { c: cv, Y } = off('rtlw', 1080, H);
    const M = marks(str), L = layout(ctx, Y, M.text, size, 900, 2000, 1.2, f); boxes(L, 540, size * 1.15, 'center').forEach(b => drawWord(ctx, Y, b, size, 900, M.acc.includes(b.i) ? c.acc : (o.color || c.ink), f));
    const edge = lerp(1080 + fe, -fe, k); if (Y.createLinearGradient) { Y.globalCompositeOperation = 'destination-in'; const g = Y.createLinearGradient(edge - fe, 0, edge, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)'); Y.fillStyle = g; Y.fillRect(0, 0, 1080, H); Y.globalCompositeOperation = 'source-over'; }
    X.save(); X.globalAlpha *= 1 - ko; const bl = 12 * (1 - k) + 14 * ko; if (bl > 0.3) X.filter = `blur(${bl.toFixed(1)}px)`; X.drawImage(cv, 0, y - size * 1.15); X.restore();
    if (o.lead) withE(X, env(t, s + 0.1, o.out, { yIn: 12 }), 540, y - size - 40, () => T(ctx, X, o.lead, 540, y - size - 30, 48, { weight: 400, color: c.soft, family: f }));
    if (o.line) { const kl = ioC(pr(t, s + 0.2, s + 0.2 + 1.1)) * (1 - ko), yl = y + 110, pts = []; for (let x = 1000; x >= 80; x -= 20) { const ph = (1000 - x) / 920, sp = Math.abs(ph - 0.5) < 0.06 ? Math.sin((ph - 0.44) / 0.12 * TAU) * -70 : 0; pts.push([x, yl + sp]); }
      X.save(); X.strokeStyle = c.acc; X.lineWidth = 5; X.lineJoin = 'round'; X.lineCap = 'round'; const tip = partPath(X, pts, kl); if (tip && kl < 1) { X.fillStyle = c.acc; X.beginPath(); X.arc(tip[0], tip[1], 9, 0, TAU); X.fill(); } X.restore(); }
  };

  /* 282 من المخطط للبناية — مخطط (L افتراضياً) يرتسم على ورقة مايلة ويا المقاسات، يلف لمنظور أيزومتري، والجدران تطلع من الأرض، والسقف يلمع.
     o: {s, out, plan:[[x,y]…] بالمتر، walls:[[[x,y],[x,y]]…] جدران داخلية، h=3 (ارتفاع بالمتر)، scale=52, title, dims=true, unit='m'} */
  FX.planToBuild = (ctx, t, o) => { const { X, P } = ctx, c = pal(P, o), s = o.s || 0, f = fam(o);
    const plan = o.plan || [[0, 0], [12, 0], [12, 6], [7, 6], [7, 11], [0, 11]], inner = o.walls || [[[0, 5], [7, 5]], [[5, 0], [5, 5]]], Hm = o.h || 3, S = o.scale || 52;
    const fade = o.out != null ? 1 - cIn(pr(t, o.out, o.out + 0.35)) : 1; if (fade <= ON) return;
    const xs = plan.map(p => p[0]), ys = plan.map(p => p[1]), mx = (Math.min(...xs) + Math.max(...xs)) / 2, my = (Math.min(...ys) + Math.max(...ys)) / 2;
    const kd = pr(t, s + 0.1, s + 1.3), m = ioC(pr(t, s + 1.5, s + 2.4)), kb = cOut(pr(t, s + 2.2, s + 3.2)), kr = pr(t, s + 3.1, s + 3.5), CX = 540, CY = 1040;
    const proj = (x, y, z) => { x -= mx; y -= my; const tx = x * S, ty = y * S * 0.62, ix = (x - y) * S * 0.8, iy = (x + y) * S * 0.46 - (z || 0) * S * m; return [CX + lerp(tx, ix, m), CY + lerp(ty, iy, m) - (z || 0) * 0]; };
    X.save(); X.globalAlpha *= fade;
    // أرضية شبكة
    X.save(); X.globalAlpha *= 0.9 * cOut(pr(t, s, s + 0.5)); X.strokeStyle = rgba(c.acc, c.dark ? 0.14 : 0.18); X.lineWidth = 1.2; X.beginPath();
    for (let gx = -4; gx <= 16; gx++) { const a = proj(gx + mx - 6, -4 + my - 5.5), b = proj(gx + mx - 6, 15 + my - 5.5); X.moveTo(a[0], a[1]); X.lineTo(b[0], b[1]); }
    for (let gy = -4; gy <= 15; gy++) { const a = proj(-4 + mx - 6, gy + my - 5.5), b = proj(16 + mx - 6, gy + my - 5.5); X.moveTo(a[0], a[1]); X.lineTo(b[0], b[1]); } X.stroke(); X.restore();
    const edges = plan.map((p, i) => [p, plan[(i + 1) % plan.length]]).concat(inner);
    // ظل الأرض
    if (kb > 0) { X.save(); X.globalAlpha *= 0.35 * kb; X.fillStyle = c.dark ? '#000000' : rgba(c.inkD, 0.5); X.beginPath(); plan.forEach((p, i) => { const q = proj(p[0] + 0.6 * kb, p[1] + 0.6 * kb, 0); i ? X.lineTo(q[0], q[1]) : X.moveTo(q[0], q[1]); }); X.closePath(); X.fill(); X.restore(); }
    // المخطط يرتسم
    X.save(); X.strokeStyle = c.acc; X.lineWidth = 6; X.lineCap = 'round'; X.lineJoin = 'round'; const tot = edges.length;
    edges.forEach((e, i) => { const q = cl(kd * tot - i); if (q <= 0) return; partPath(X, [proj(e[0][0], e[0][1]), proj(e[1][0], e[1][1])], q); }); X.restore();
    // المقاسات
    if (o.dims !== false) { const da = pr(t, s + 1.0, s + 1.3) * (1 - pr(t, s + 1.5, s + 1.8)); if (da > 0) { X.save(); X.globalAlpha *= da; X.strokeStyle = c.mut; X.lineWidth = 2; const a = proj(plan[0][0], plan[0][1] - 1.2), b = proj(plan[1][0], plan[1][1] - 1.2); X.beginPath(); X.moveTo(a[0], a[1]); X.lineTo(b[0], b[1]); X.stroke();
      T(ctx, X, Math.round(Math.hypot(plan[1][0] - plan[0][0], plan[1][1] - plan[0][1])) + ' ' + (o.unit || 'm'), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 14, 28, { weight: 600, color: c.mut, dir: 'ltr', family: f }); X.restore(); } }
    // الجدران (من البعيد للقريب)
    if (kb > 0) { const Hz = Hm * kb, walls = edges.map(e => ({ e, d: (e[0][0] + e[1][0] + e[0][1] + e[1][1]) / 2 })).sort((a, b) => a.d - b.d);
      walls.forEach(({ e }, i) => { const [p0, p1] = e, A = proj(p0[0], p0[1], 0), B = proj(p1[0], p1[1], 0), C = proj(p1[0], p1[1], Hz), D = proj(p0[0], p0[1], Hz), nx = p1[1] - p0[1], ny = -(p1[0] - p0[0]), sh = 0.5 + 0.5 * Math.sign(nx - ny) * 0.6;
        X.beginPath(); X.moveTo(A[0], A[1]); X.lineTo(B[0], B[1]); X.lineTo(C[0], C[1]); X.lineTo(D[0], D[1]); X.closePath(); X.fillStyle = mixC(c.surf, c.acc, 0.12 + 0.18 * sh); X.globalAlpha = fade * 0.96; X.fill(); X.globalAlpha = fade;
        X.strokeStyle = rgba(c.acc, 0.55); X.lineWidth = 1.5; X.stroke(); X.save(); X.strokeStyle = c.acc; X.lineWidth = 3 + 3 * kr; if (kr > 0) shd(X, 20 * kr, 0, 0, rgba(c.acc, 0.8 * kr)); X.beginPath(); X.moveTo(D[0], D[1]); X.lineTo(C[0], C[1]); X.stroke(); X.restore(); }); }
    if (o.title) withE(X, env(t, s + 0.2, null, { din: 0.5, bIn: 20 }), 540, 330, () => { const M = marks(o.title), L = layout(ctx, X, M.text, 88, 900, 900, 1.2, f); boxes(L, 540, 360, 'center').forEach(b => drawWord(ctx, X, b, 88, 900, M.acc.includes(b.i) ? c.acc : c.ink, f)); });
    X.restore();
  };

  /* 283 تموّج فاخم — خلفية كروسيل وكفر: خطوط حرير كثيرة تتموج بهدوء (لون مميز ← حبر)، وتكمل بين السلايدات (slide = رقم السلايد).
     o: {s=0, h=1920 (1350 للكروسيل), slide=0, lines=56, speed=1, strength=1, bg=true} */
  FX.luxWaves = (ctx, t, o) => { o = o || {}; const { X, P } = ctx, c = pal(P, o), H = o.h || 1920, x0 = (o.slide || 0) * 1080, N = o.lines || 56, sp = pick(o, 'speed', 1), st = pick(o, 'strength', 1) * cOut(pr(t, pick(o, 's', 0) - 0.001, pick(o, 's', 0) + 0.6));
    if (o.bg !== false) { X.fillStyle = c.bg; X.fillRect(0, 0, 1080, H); }
    const g = X.createRadialGradient(540, H * 0.55, 0, 540, H * 0.55, H * 0.7); g.addColorStop(0, rgba(c.acc, (c.dark ? 0.1 : 0.07) * st)); g.addColorStop(1, rgba(c.acc, 0)); X.fillStyle = g; X.fillRect(0, 0, 1080, H);
    const tone = c.dark ? c.inkL : c.inkD, T0 = t * sp;
    X.save(); X.lineCap = 'round'; X.lineJoin = 'round';
    // حزمتين: كل حزمة خطوط متقاربة تنطوي مثل القماش (السمك يتغير على طول الموجة)
    [[0.36, 0.16, 0, 1], [0.66, 0.12, 2.1, 0.7]].forEach(([cy, spread, ph, wgt], bi) => {
      for (let j = 0; j < N; j++) { const v = j / (N - 1), mid = 1 - Math.abs(v - 0.5) * 2;
        X.strokeStyle = rgba(mixC(c.acc, tone, bi ? 0.55 : Math.abs(v - 0.5) * 1.2), (0.08 + 0.42 * Math.pow(mid, 1.6)) * st * wgt); X.lineWidth = (1 + 1.8 * mid) * (bi ? 0.8 : 1);
        X.beginPath(); for (let x = -20; x <= 1100; x += 16) { const wx = (x + x0) / 1080, fold = Math.sin(wx * 1.7 + T0 * 0.3 + ph), thick = 0.35 + 0.65 * Math.abs(Math.sin(wx * 1.3 - T0 * 0.18 + ph * 0.5));
          const y = H * cy + H * 0.11 * fold + H * 0.05 * Math.sin(wx * 3.9 - T0 * 0.25 + v * 1.4 + ph) + (v - 0.5) * H * spread * thick + H * 0.03 * Math.sin(wx * 6.1 + v * 7 + T0 * 0.4);
          x === -20 ? X.moveTo(x, y) : X.lineTo(x, y); } X.stroke(); } });
    X.restore();
  };
})();
