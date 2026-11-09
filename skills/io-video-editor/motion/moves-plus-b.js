/* ═══ moves-plus-b.js — بنك الحركات 151–200 (I/O Studio) ═══
   نفس عقد motion/moves.js: كل حركة = FX.<اسم>(ctx, t, o) ترسم على ctx.X بإحداثيات التصميم (1080×1920)، كل خاصية من t (بلا تراكم ولا Math.random).
   o.s = بداية الحركة (ثبّتها على توقيت كلمة: ctx.wordTime('l2', 0).s) · o.out = بداية الطلعة (اختياري) · الألوان من ctx.P إلا لو مرّرت غيرها.
   الانتقالات تاخذ o.A و o.B (دوال ترسم الإطار كامل) · الكاميرا تاخذ o.draw (Y) => {...}.
   الكتالوج: motion/moves/catalog-plus-b.json · المعاينات: motion/moves/previews/151–200.mp4 (motion/moves/render-preview-b.js)
   ⚠ الكلمات العربية تتحرك ككلمات كاملة (أو السطر كله بنداء واحد) — لا تقسم الحروف.
   ⚠ الانتقالات اللي تاخذ لقطة (cubeTurn rippleWater pixelMosaic kaleido vhsRewind flipCards) تفترض إن الإطار كامل = 1080×1920 بالتصميم (مثل المحرّك وبريل الكلام). */
(function () {
  const G = typeof window !== 'undefined' ? window : globalThis;
  const FX = (G.FX = G.FX || {});
  const TAU = Math.PI * 2, ON = 0.01;
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const pr = (t, a, b) => cl((t - a) / (b - a));
  const lerp = (a, b, k) => a + (b - a) * k;
  const pick = (o, k, d) => (o[k] === undefined ? d : o[k]);
  const sst = (a, b, x) => { const k = cl((x - a) / (b - a)); return k * k * (3 - 2 * k); };
  // عشوائي ثابت (حتمي)
  const h2 = (a, b) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const rnd = (i, s) => h2(i * 31 + 7, s * 7919 + 101);
  const n1 = (x, sd) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(h2(i, sd), h2(i + 1, sd), u) * 2 - 1; };
  // ألوان
  const hexRGB = h => { const c = String(h || '#000').replace('#', ''), f = c.length === 3 ? c.split('').map(x => x + x).join('') : c; return [0, 2, 4].map(j => parseInt(f.slice(j, j + 2), 16) || 0); };
  const rgba = (h, a) => { if (!/^#/.test(String(h))) return h; const [r, g, b] = hexRGB(h); return `rgba(${r},${g},${b},${a})`; };
  const mixC = (a, b, k) => { const A = hexRGB(a), B = hexRGB(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], cl(k))).toString(16).padStart(2, '0')).join(''); };
  const lum = h => { const c = hexRGB(h); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const darker = (a, b) => (lum(a) <= lum(b) ? a : b);
  const lighter = (a, b) => (lum(a) >= lum(b) ? a : b);
  const onAcc = P => P.onAcc || '#FFFFFF';
  const shd = (X, b, y, a) => { X.shadowColor = 'rgba(0,0,0,' + (a == null ? 0.25 : a) + ')'; X.shadowBlur = b; X.shadowOffsetY = y; X.shadowOffsetX = 0; };
  const noShd = X => { X.shadowColor = 'transparent'; X.shadowBlur = 0; X.shadowOffsetY = 0; X.shadowOffsetX = 0; };
  const fout = (ctx, t, o, d = 0.45) => (o.out != null ? ctx.at(t, o.out, o.out + d, 'cubicIn') : 0);
  // طبقات جانبية: يرسم fn على كانفس بنفس تحويل X، ثم ينرسم فوق (لقطة)
  const offC = (X, slot) => {
    const me = FX['_b' + slot] || (FX['_b' + slot] = { c: document.createElement('canvas') }), c = me.c;
    if (c.width !== X.canvas.width || c.height !== X.canvas.height) { c.width = X.canvas.width; c.height = X.canvas.height; }
    const Y = c.getContext('2d'); Y.setTransform(1, 0, 0, 1, 0, 0); Y.globalAlpha = 1; Y.globalCompositeOperation = 'source-over'; Y.filter = 'none';
    Y.clearRect(0, 0, c.width, c.height); Y.setTransform(X.getTransform()); return { c, Y };
  };
  const lay = (X, slot, fn) => { const C = offC(X, slot); C.Y.save(); fn(C.Y); C.Y.restore(); return C.c; };
  const putC = (X, c, a) => { X.save(); X.setTransform(1, 0, 0, 1, 0, 0); if (a != null) X.globalAlpha *= a; X.drawImage(c, 0, 0); X.restore(); };
  // يرسم لقطة c (انرسمت بتحويل M) تحت التحويل الحالي (بعد translate/scale/rotate/clip محلي)
  const drawSnap = (X, c, M, a) => { X.save(); const cur = X.getTransform(); X.setTransform(cur.multiply(M.inverse())); if (a != null) X.globalAlpha *= a; X.drawImage(c, 0, 0); X.restore(); };
  // جزء من اللقطة (إحداثيات تصميم) لمستطيل وجهة (إحداثيات تصميم) — تحويل X تحجيم وإزاحة بس
  const part = (X, c, sx, sy, sw, sh, dx, dy, dw, dh) => {
    const m = X.getTransform(); if (sw <= 0 || sh <= 0 || dw === 0 || dh === 0) return;
    X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
    X.drawImage(c, m.a * sx + m.e, m.d * sy + m.f, m.a * sw, m.d * sh, m.a * dx + m.e, m.d * dy + m.f, m.a * dw, m.d * dh); X.restore();
  };
  // أشكال
  const heartPath = (X, x, y, s) => { X.beginPath(); X.moveTo(x, y + 0.35 * s);
    X.bezierCurveTo(x - 0.05 * s, y + 0.3 * s, x - 0.5 * s, y + 0.02 * s, x - 0.5 * s, y - 0.2 * s);
    X.bezierCurveTo(x - 0.5 * s, y - 0.42 * s, x - 0.28 * s, y - 0.52 * s, x - 0.14 * s, y - 0.5 * s);
    X.bezierCurveTo(x - 0.05 * s, y - 0.49 * s, x, y - 0.4 * s, x, y - 0.32 * s);
    X.bezierCurveTo(x, y - 0.4 * s, x + 0.05 * s, y - 0.49 * s, x + 0.14 * s, y - 0.5 * s);
    X.bezierCurveTo(x + 0.28 * s, y - 0.52 * s, x + 0.5 * s, y - 0.42 * s, x + 0.5 * s, y - 0.2 * s);
    X.bezierCurveTo(x + 0.5 * s, y + 0.02 * s, x + 0.05 * s, y + 0.3 * s, x, y + 0.35 * s); X.closePath(); };
  const starPath = (X, x, y, r1, r2, n, rot, keep) => { if (!keep) X.beginPath(); for (let i = 0; i <= 2 * n; i++) { const a = rot + i * Math.PI / n - Math.PI / 2, r = i % 2 ? r2 : r1; i ? X.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : X.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } X.closePath(); };
  // نجمة ثمانية (مربعين متراكبين)
  const star8 = (X, x, y, r, rot, keep) => starPath(X, x, y, r, r * 0.765, 8, rot || 0, keep);
  const sparkle = (X, x, y, r, rot) => starPath(X, x, y, r, r * 0.28, 4, rot || 0);
  // كلمات على دايرة (كل كلمة كاملة، القراية من اليمين لليسار على القوس الفوقاني). a0 = زاوية أول كلمة (يمينها)
  const ringWords = (ctx, X, words, cx, cy, r, a0, o) => {
    X.font = ctx.font(o.family || 'body', o.weight == null ? 700 : o.weight, o.size); let a = a0;
    words.forEach((w, i) => { const ww = X.measureText(w).width, da = ww / r, mid = a - da / 2;
      if (!o.only || o.only(i)) { X.save(); X.translate(cx + r * Math.cos(mid), cy + r * Math.sin(mid)); X.rotate(mid + Math.PI / 2);
        ctx.text(X, w, 0, 0, { family: o.family || 'body', weight: o.weight == null ? 700 : o.weight, size: o.size, color: o.color, alpha: o.alpha ? o.alpha(i) : 1 }); X.restore(); }
      a -= da + (o.gap || 24) / r; });
    return a;
  };
  const textW = (ctx, X, str, fam, w, size) => { X.save(); X.font = ctx.font(fam, w, size); const v = X.measureText(ctx.text.westernDigits ? ctx.text.westernDigits(str) : str).width; X.restore(); return v; };
  // تقاطع مضلع مع نصف مستوى f(p) >= 0 (Sutherland–Hodgman)
  const clipPoly = (pts, f) => { const out = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], fa = f(a), fb = f(b);
    if (fa >= 0) out.push(a); if ((fa >= 0) !== (fb >= 0)) { const k = fa / (fa - fb); out.push([lerp(a[0], b[0], k), lerp(a[1], b[1], k)]); } } return out; };
  const poly = (X, pts) => { X.beginPath(); pts.forEach((p, i) => (i ? X.lineTo(p[0], p[1]) : X.moveTo(p[0], p[1]))); X.closePath(); };
  // صوت وهمي من الوقت (للموجات والمعادل)
  const fakeAmp = (t, i, sd) => cl(0.35 + 0.4 * n1(t * 7 + i * 0.41, sd || 3) + 0.25 * n1(t * 2.3 - i * 0.13, (sd || 3) + 5) + 0.35 * Math.pow(1 - ((t * 2) % 1), 3) * (1 - Math.abs(i % 16 - 8) / 8), 0.05, 1);

  /* ══════════ أ) جزيئات وطبقات احتفال ══════════ */

  /* 151 شرر الضربة — شرر يطلق من نقطة بذيول وجاذبية وحلقة صدمة، وكلمة تطلع بالنص (اختياري). o: {s, x=540, y=900, n=56, text, size=170, colors, out} */
  FX.sparkBurst = (ctx, t, o) => {
    const { X, P, at, E } = ctx, x = pick(o, 'x', 540), y = pick(o, 'y', 900), n = o.n || 56, dt = t - o.s; if (dt < 0) return;
    const cols = o.colors || [P.acc, P.clay || P.acc, P.hi || P.acc, '#F2B63C'], kk = 3.2, g = 1100, ko = fout(ctx, t, o);
    const ring = pr(dt, 0, 0.5);
    if (ring < 1) { X.save(); X.globalAlpha = 1 - ring; X.strokeStyle = P.acc; X.lineWidth = 16 * (1 - ring) + 2; X.beginPath(); X.arc(x, y, 30 + 420 * E.expoOut(ring), 0, TAU); X.stroke(); X.restore(); }
    const fl = 1 - pr(dt, 0, 0.18);
    if (fl > 0) { X.save(); const gr = X.createRadialGradient(x, y, 0, x, y, 260); gr.addColorStop(0, rgba('#FFF6E0', 0.95 * fl)); gr.addColorStop(1, rgba('#FFF6E0', 0)); X.fillStyle = gr; X.fillRect(x - 260, y - 260, 520, 520); X.restore(); }
    X.save(); X.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = rnd(i, 1) * TAU, v = 700 + 1300 * rnd(i, 2), life = 0.55 + 0.75 * rnd(i, 3), tt = dt - 0.05 * rnd(i, 4); if (tt <= 0 || tt > life) continue;
      const pos = u => { const e = (1 - Math.exp(-kk * u)) / kk; return [x + Math.cos(a) * v * e, y + Math.sin(a) * v * e + 0.5 * g * u * u]; };
      const p1 = pos(tt), p0 = pos(Math.max(0, tt - 0.1)), q = 1 - tt / life;
      X.strokeStyle = cols[i % cols.length]; X.globalAlpha = Math.min(1, q * 1.6) * (1 - ko); X.lineWidth = (6 + 9 * rnd(i, 5)) * (0.4 + 0.6 * q);
      X.beginPath(); X.moveTo(p0[0], p0[1]); X.lineTo(p1[0], p1[1]); X.stroke();
    }
    X.restore();
    if (o.text) { const k = at(t, o.s + 0.02, o.s + 0.4, 'backOut'); if (k > ON && ko < 1) { const sz = o.size || 170; X.save(); X.translate(x, y); X.scale(k * (1 - 0.3 * ko), k * (1 - 0.3 * ko));
      ctx.text(X, o.text, 0, sz * 0.36, { family: 'display', weight: 400, size: sz, color: o.color || P.ink, alpha: 1 - ko, maxWidth: 900, stroke: { width: sz * 0.1, color: P.bg } }); X.restore(); } }
  };

  /* 152 بالونات — بالونات ملوّنة بخيوط تطلع من تحت وتتمايل، والبالونة اللي بالنص تنفقع (pop) وتكشف كلمة. o: {s, n=9, pop (وقت الفقعة، افتراضي s+1.3), text, size=180, colors, out} */
  FX.balloonRise = (ctx, t, o) => {
    const { X, P, at, E } = ctx, dt = t - o.s, ko = fout(ctx, t, o, 0.5); if (dt < 0) return;
    const cols = o.colors || [P.acc, P.hi || P.acc, P.clay || P.acc, '#F2B63C', '#4FA3A5'], n = o.n || 9, popT = o.pop != null ? o.pop : o.s + 1.3;
    const balloon = (x, y, r, c, sw) => { X.save(); X.translate(x, y); X.rotate(sw);
      X.strokeStyle = rgba(P.ink, 0.45); X.lineWidth = 3; X.beginPath(); X.moveTo(0, r * 1.2); for (let j = 1; j <= 10; j++) X.lineTo(10 * Math.sin(j * 0.9 + t * 3), r * 1.2 + j * 32); X.stroke();
      X.fillStyle = c; X.beginPath(); X.moveTo(0, r * 1.12); X.lineTo(-14, r * 1.26); X.lineTo(14, r * 1.26); X.closePath(); X.fill();
      X.beginPath(); X.ellipse(0, 0, r * 0.86, r * 1.12, 0, 0, TAU); X.fill();
      X.fillStyle = 'rgba(255,255,255,.35)'; X.beginPath(); X.ellipse(-r * 0.32, -r * 0.42, r * 0.16, r * 0.3, -0.4, 0, TAU); X.fill(); X.restore(); };
    X.save(); X.globalAlpha = 1 - ko;
    for (let i = 1; i < n; i++) { const r = 80 + 40 * rnd(i, 1), u = dt - 0.25 * rnd(i, 2), sp = 520 + 300 * rnd(i, 3); if (u < 0) continue;
      const x = 1080 * (i - 0.5) / (n - 1) + 50 * Math.sin(u * 1.4 + i), y = 2150 - u * sp; if (y < -400) continue; balloon(x, y, r, cols[i % cols.length], 0.12 * Math.sin(u * 1.7 + i)); }
    const pk = pr(t, o.s, popT), cy = lerp(2150, 860, E.cubicOut(pk)), R0 = 150;
    if (t < popT) { const sq = 1 + 0.06 * Math.sin(Math.PI * pr(t, popT - 0.25, popT)) * 2; X.save(); X.translate(540, cy); X.scale(sq, 1 / sq); X.translate(-540, -cy); balloon(540, cy, R0, P.acc, 0.05 * Math.sin(t * 2)); X.restore(); }
    else { const q = pr(t, popT, popT + 0.45); if (q < 1) { X.strokeStyle = P.acc; X.lineWidth = 12 * (1 - q); X.globalAlpha = (1 - q) * (1 - ko); X.beginPath(); X.arc(540, 860, R0 * (0.8 + 1.4 * E.expoOut(q)), 0, TAU); X.stroke();
        X.fillStyle = P.acc; for (let j = 0; j < 12; j++) { const a = j / 12 * TAU + 0.2, d = R0 * (0.6 + 1.6 * E.expoOut(q)); X.save(); X.translate(540 + Math.cos(a) * d, 860 + Math.sin(a) * d + 200 * q * q); X.rotate(a + q * 4); X.fillRect(-16, -7, 32, 14); X.restore(); } X.globalAlpha = 1 - ko; } }
    X.restore();
    if (o.text) { const k = at(t, popT, popT + 0.4, 'backOut') * (1 - ko); if (k > ON) { const sz = o.size || 180; X.save(); X.translate(540, 860); X.scale(k, k); ctx.text(X, o.text, 0, sz * 0.36, { family: 'display', weight: 400, size: sz, color: o.color || P.ink, maxWidth: 900, stroke: { width: sz * 0.08, color: P.bg } }); X.restore(); } }
  };

  /* 153 غبار بالضوء — شعاع ضوء دافي مايل يدخل من فوق، وذرات غبار تسبح وتلمع داخله. هادي، للجمل التأملية. o: {s, out, from=[920,-120], angle=2.05, warm='#FFE7B8', dim=.22} */
  FX.dustLight = (ctx, t, o) => {
    const { X } = ctx, a = ctx.at(t, o.s, o.s + 1.2, 'sineInOut') * (1 - fout(ctx, t, o, 0.9)); if (a <= 0) return;
    const S = o.from || [920, -120], ang = pick(o, 'angle', 2.05), d = [Math.cos(ang), Math.sin(ang)], nrm = [-d[1], d[0]], warm = o.warm || '#FFE7B8';
    const hw = L => 70 + L * 0.2, L1 = 2600, fl = 0.85 + 0.15 * n1(t * 1.7, 9);
    X.save(); X.fillStyle = `rgba(15,10,5,${(pick(o, 'dim', 0.22) * a).toFixed(3)})`; X.fillRect(0, 0, 1080, 1920);
    const gr = X.createLinearGradient(S[0], S[1], S[0] + d[0] * L1, S[1] + d[1] * L1); gr.addColorStop(0, rgba(warm, 0.55 * a * fl)); gr.addColorStop(0.6, rgba(warm, 0.22 * a * fl)); gr.addColorStop(1, rgba(warm, 0));
    X.globalCompositeOperation = 'screen'; X.fillStyle = gr;
    poly(X, [[S[0] + nrm[0] * hw(0), S[1] + nrm[1] * hw(0)], [S[0] + d[0] * L1 + nrm[0] * hw(L1), S[1] + d[1] * L1 + nrm[1] * hw(L1)], [S[0] + d[0] * L1 - nrm[0] * hw(L1), S[1] + d[1] * L1 - nrm[1] * hw(L1)], [S[0] - nrm[0] * hw(0), S[1] - nrm[1] * hw(0)]]); X.fill();
    X.globalAlpha = 0.5; X.lineWidth = 40; X.strokeStyle = rgba(warm, 0.18 * a); X.beginPath(); X.moveTo(S[0], S[1]); X.lineTo(S[0] + d[0] * L1, S[1] + d[1] * L1); X.stroke();
    X.globalAlpha = 1; X.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 110; i++) {
      const bx = rnd(i, 1) * 1180 - 50 + 40 * n1(t * 0.25 + i, 2), by = ((rnd(i, 2) * 2000 - t * (8 + 14 * rnd(i, 3)) + 40 * n1(t * 0.2 + i * 1.3, 4)) % 2000 + 2000) % 2000 - 40;
      const L = (bx - S[0]) * d[0] + (by - S[1]) * d[1], q = Math.abs((bx - S[0]) * nrm[0] + (by - S[1]) * nrm[1]), inB = L > 0 ? 1 - sst(hw(L) * 0.55, hw(L), q) : 0;
      const tw = 0.6 + 0.4 * Math.sin(t * (2 + 3 * rnd(i, 5)) + i), al = a * (0.12 + 0.88 * inB) * tw; if (al < 0.03) continue;
      X.globalAlpha = al; X.fillStyle = '#FFF8EA'; X.beginPath(); X.arc(bx, by, 1.5 + 3.5 * rnd(i, 6) * (0.5 + inB), 0, TAU); X.fill();
    }
    X.restore();
  };

  /* 154 بوكيه — دواير ضوء ناعمة (من ألوان الهوية) تسبح لفوق بعمق، ورا الكلام. o: {s, out, n=26, colors, alpha=1} */
  FX.bokehDrift = (ctx, t, o) => {
    const { X, P } = ctx, a = ctx.at(t, o.s, o.s + 1, 'sineInOut') * (1 - fout(ctx, t, o, 0.8)) * pick(o, 'alpha', 1); if (a <= 0) return;
    const cols = o.colors || [P.acc, P.hi || P.acc, '#FFFFFF', P.clay || P.acc], n = o.n || 26;
    X.save();
    for (let i = 0; i < n; i++) {
      const r = 30 + 130 * rnd(i, 1) * rnd(i, 1), dep = r / 160, x = rnd(i, 2) * 1080 + 70 * n1(t * 0.15 + i, 3);
      const y = ((rnd(i, 3) * 2300 - t * (18 + 55 * dep)) % 2300 + 2300) % 2300 - 190, c = cols[i % cols.length];
      const al = a * (0.16 + 0.26 * rnd(i, 4)) * (0.75 + 0.25 * Math.sin(t * 1.3 + i)), gr = X.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, rgba(c, al * 0.55)); gr.addColorStop(0.8, rgba(c, al * 0.75)); gr.addColorStop(0.94, rgba(c, al)); gr.addColorStop(1, rgba(c, 0));
      X.fillStyle = gr; X.beginPath(); X.arc(x, y, r, 0, TAU); X.fill();
    }
    X.restore();
  };

  /* 155 مطر أيقونات — قلوب ونجوم ولمعات تنزل من فوق وتتمايل (أشكال مرسومة، بلا خط إيموجي). o: {s, out, n=44, icons=['heart','star','spark','dot'], colors, dur=2.2 (مدة الإطلاق), keys:['⌘','shift','ctrl',…] (بدل الأيقونات: أزرار كيبورد بيضا تلف وتطيح)} */
  FX.iconRain = (ctx, t, o) => {
    const { X, P } = ctx, dt = t - o.s; if (dt < 0) return;
    const ic = o.icons || ['heart', 'star', 'spark', 'heart', 'dot'], cols = o.colors || [P.acc, P.hi || P.acc, P.clay || P.acc, '#F2B63C'], n = o.n || 44, ko = fout(ctx, t, o, 0.5), span = o.dur || 2.2;
    for (let i = 0; i < n; i++) {
      const u = dt - rnd(i, 1) * span; if (u < 0) continue;
      const sz = 40 + 60 * rnd(i, 2), y = -100 + u * (380 + 420 * rnd(i, 3)) + 140 * u * u, x = rnd(i, 4) * 1000 + 40 + 60 * Math.sin(u * 2 + rnd(i, 5) * 6); if (y > 2050) continue;
      X.save(); X.globalAlpha = Math.min(1, u * 6) * (1 - ko); X.translate(x, y); X.rotate(0.5 * Math.sin(u * 1.6 + rnd(i, 6) * 6)); X.fillStyle = cols[i % cols.length];
      const k = ic[i % ic.length];
      if (o.keys) { const lab = String(o.keys[i % o.keys.length]), kw = Math.max(sz * 1.3, 40 + lab.length * sz * 0.32), kh = sz * 1.3, ph = Math.cos(u * (2 + 3 * rnd(i, 7)) + rnd(i, 8) * 6);   // T31 مطر أزرار كيبورد: يلف ثلاثي (scaleY) ويطيح
        X.scale(1, Math.max(0.12, Math.abs(ph))); X.fillStyle = 'rgba(0,0,0,.25)'; X.beginPath(); X.roundRect(-kw / 2, -kh / 2 + 7, kw, kh, kh * 0.18); X.fill();
        X.fillStyle = ph > 0 ? '#D9D9D9' : '#BDBDBD'; X.beginPath(); X.roundRect(-kw / 2, -kh / 2 + 4, kw, kh, kh * 0.18); X.fill(); X.fillStyle = '#FAFAFA'; X.beginPath(); X.roundRect(-kw / 2 + 3, -kh / 2, kw - 6, kh - 8, kh * 0.16); X.fill();
        if (ph > 0) { X.fillStyle = '#2A2A2A'; X.font = `600 ${Math.round(kh * 0.32)}px "Inter"`; X.textAlign = 'center'; X.textBaseline = 'middle'; X.fillText(lab, 0, -4); } X.restore(); continue; }
      if (k === 'heart') { heartPath(X, 0, 0, sz); X.fill(); } else if (k === 'star') { starPath(X, 0, 0, sz * 0.5, sz * 0.22, 5, 0); X.fill(); }
      else if (k === 'spark') { sparkle(X, 0, 0, sz * 0.5, u); X.fill(); } else { X.beginPath(); X.arc(0, 0, sz * 0.18, 0, TAU); X.fill(); }
      X.restore();
    }
  };

  /* 156 قلب اللايك — قلب كبير ينط مكان الضغطة (دبل تاب)، حلقة ونقاط تنفجر، قلوب صغيرة تطير، والعدّاد يزيد. o: {s, x=540, y=880, size=300, count, label, out} */
  FX.likeBurst = (ctx, t, o) => {
    const { X, P, at, E } = ctx, x = pick(o, 'x', 540), y = pick(o, 'y', 880), S = o.size || 300, dt = t - o.s; if (dt < 0) return;
    const ko = fout(ctx, t, o, 0.4), pop = at(t, o.s, o.s + 0.5, 'elasticOut') * (1 - ko), rp = pr(dt, 0.05, 0.6);
    if (rp > 0 && rp < 1) { X.save(); X.globalAlpha = 1 - rp; X.strokeStyle = P.acc; X.lineWidth = 22 * (1 - rp); X.beginPath(); X.arc(x, y, S * (0.35 + 0.75 * E.cubicOut(rp)), 0, TAU); X.stroke();
      for (let j = 0; j < 10; j++) { const a = j * TAU / 10 + 0.3, d = S * (0.5 + 0.55 * E.expoOut(rp)); X.fillStyle = j % 2 ? P.acc : (P.hi || P.acc); X.beginPath(); X.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 14 * (1 - rp), 0, TAU); X.fill(); } X.restore(); }
    for (let j = 0; j < 7; j++) { const u = pr(dt, 0.25 + j * 0.12, 1.85 + j * 0.12); if (u <= 0 || u >= 1) continue;
      const hx = x + (rnd(j, 1) - 0.5) * S * 1.1 + 40 * Math.sin(u * 7 + j), hy = y - S * 0.2 - u * (380 + 200 * rnd(j, 2));
      X.save(); X.globalAlpha = Math.sin(Math.PI * u) * (1 - ko); X.fillStyle = j % 2 ? P.acc : (P.hi || P.acc); heartPath(X, hx, hy, 50 + 40 * rnd(j, 3)); X.fill(); X.restore(); }
    if (pop > ON) { const beat = 1 + 0.05 * Math.sin(Math.max(0, dt - 0.6) * 9) * Math.exp(-Math.max(0, dt - 0.6) * 1.5);
      X.save(); X.translate(x, y); X.scale(pop * beat, pop * beat); shd(X, 40, 18, 0.25); X.fillStyle = P.acc; heartPath(X, 0, 0, S); X.fill(); noShd(X);
      X.globalAlpha = 0.35; X.fillStyle = '#FFFFFF'; X.beginPath(); X.ellipse(-S * 0.25, -S * 0.27, S * 0.09, S * 0.05, -0.6, 0, TAU); X.fill(); X.restore(); }
    if (o.count != null || o.label) { const k = at(t, o.s + 0.35, o.s + 0.8, 'expoOut') * (1 - ko), v = o.count != null ? Math.round(lerp(o.count * 0.92, o.count, at(t, o.s + 0.4, o.s + 1.6, 'expoOut'))) : null;
      if (k > 0) { const str = (v != null ? ctx.num(v) + (o.label ? ' ' : '') : '') + (o.label || ''), w = Math.min(860, textW(ctx, X, str, 'body', 700, 60)) + 70, yy = y + S * 0.62 + 40 * (1 - k);
      X.save(); X.globalAlpha *= k; shd(X, 20, 8, 0.2); X.fillStyle = lighter(P.bg, '#FFFFFF'); X.beginPath(); X.roundRect(x - w / 2, yy - 62, w, 90, 45); X.fill(); noShd(X); X.restore();
      ctx.text(X, str, x, yy, { family: 'body', weight: 700, size: 60, color: P.ink, alpha: k, maxWidth: 860 }); } }
  };

  /* ══════════ ب) انتقالات (o.A و o.B ترسم الإطار كامل) ══════════ */

  /* 157 فقاعة سائلة — بقعة تتموج (حافة سائلة بلون الهوية) تكبر من زاوية وتبلع A وتكشف B. o: {s, dur=1.3, A, B, at=[820,1450], color=P.acc} */
  FX.blobMorph = (ctx, t, o) => {
    const { X, P, E } = ctx, d = o.dur || 1.3, c = o.at || [820, 1450], k = E.cubicInOut(pr(t, o.s, o.s + d));
    if (k <= 0) { o.A(X); return; } if (k >= 1) { o.B(X); return; }
    o.A(X); const R = 2150 * k, ph = (t - o.s) * 5, amp = 1 - 0.6 * k;
    const blob = (rr, sd) => { X.beginPath(); for (let j = 0; j <= 120; j++) { const th = j / 120 * TAU, w = 1 + amp * (0.1 * Math.sin(3 * th + ph + sd) + 0.06 * Math.sin(5 * th - 1.4 * ph + sd * 2) + 0.04 * Math.sin(8 * th + 2 * ph));
      const px = c[0] + Math.cos(th) * rr * w, py = c[1] + Math.sin(th) * rr * w; j ? X.lineTo(px, py) : X.moveTo(px, py); } X.closePath(); };
    X.fillStyle = o.color || P.acc; blob(R * 1.1 + 60 * Math.sin(Math.PI * k), 1.3); X.fill();
    X.fillStyle = P.hi || P.acc; blob(R * 1.05 + 25, 2.1); X.fill();
    X.save(); blob(R, 0); X.clip(); o.B(X); X.restore();
  };

  /* 158 تموّج الماي — موجة دواير تطلع من نقطة وتهز الصورة مثل سطح ماي، وB يطلع من داخل الموجة. o: {s, dur=1.5, A, B, at=[540,960], amp=.035} */
  FX.rippleWater = (ctx, t, o) => {
    const { X, E } = ctx, d = o.dur || 1.5, c = o.at || [540, 960], k = pr(t, o.s, o.s + d);
    if (k <= 0) { o.A(X); return; } if (k >= 1) { o.B(X); return; }
    const M = X.getTransform(), cA = lay(X, 'rwA', o.A), cB = lay(X, 'rwB', o.B), front = 2300 * E.sineInOut(k), amp = pick(o, 'amp', 0.035) * Math.sin(Math.PI * k), dr = 36, R = 2300;
    for (let r0 = 0; r0 < R; r0 += dr) {
      const rm = r0 + dr / 2, env = Math.exp(-Math.pow((rm - front) / 420, 2)) + 0.25 * Math.exp(-rm / 500) * (1 - k), sc = 1 + amp * Math.sin(rm / 70 - (t - o.s) * 14) * env, m = sst(front + 60, front - 260, rm);
      X.save(); X.beginPath(); X.arc(c[0], c[1], r0 + dr + 1, 0, TAU); X.arc(c[0], c[1], Math.max(0, r0 - 0.5), 0, TAU, true); X.clip();
      X.translate(c[0], c[1]); X.scale(sc, sc); X.translate(-c[0], -c[1]);
      if (m < 0.999) drawSnap(X, cA, M); if (m > 0.001) drawSnap(X, cB, M, m); X.restore();
      const hl = amp * env * Math.cos(rm / 70 - (t - o.s) * 14); if (hl > 0.004) { X.save(); X.globalAlpha = Math.min(0.35, hl * 9); X.strokeStyle = '#FFFFFF'; X.lineWidth = 6; X.beginPath(); X.arc(c[0], c[1], rm, 0, TAU); X.stroke(); X.restore(); }
    }
  };

  /* 159 حبر بالماي — خيوط حبر تنزل من فوق وتتفتح سحب بالماي، وB يطلع من داخل الحبر. o: {s, dur=1.6, A, B, ink=P.ink, n=6} */
  FX.inkWater = (ctx, t, o) => {
    const { X, P, E } = ctx, d = o.dur || 1.6, k = pr(t, o.s, o.s + d), n = o.n || 6;
    if (k <= 0) { o.A(X); return; } if (k >= 1) { o.B(X); return; }
    o.A(X);
    const puffs = (grow) => { X.beginPath(); for (let j = 0; j < n; j++) { const x0 = 1080 * (j + 0.5) / n + (rnd(j, 1) - 0.5) * 120, dl = 0.18 * rnd(j, 2);
      for (let m = 0; m < 24; m++) { const q = E.cubicOut(pr(k, dl + m * 0.018, dl + m * 0.018 + 0.55)); if (q <= 0) continue;
        const px = x0 + 110 * Math.sin(m * 0.45 + j * 2 + k * 3) * (m / 23) + 50 * n1(m * 0.3 + k * 2, j + 3), py = -40 + m * 80 * (0.7 + 0.3 * q);
        const r = (70 + 14 * m) * q * (0.8 + 1.4 * E.cubicIn(k)) + grow, side = 0.55 * r * Math.sin(m * 1.3 + j);
        X.moveTo(px + r, py); X.arc(px, py, Math.max(0, r), 0, TAU); X.moveTo(px + side + r * 0.7, py + r * 0.3); X.arc(px + side, py + r * 0.3, Math.max(0, r * 0.7), 0, TAU); } } };
    X.save(); X.globalAlpha = 0.9; X.filter = 'blur(10px)'; X.fillStyle = o.ink || P.ink; puffs(30); X.fill(); X.restore();
    X.save(); X.globalAlpha = 0.45; X.strokeStyle = o.ink || P.ink; X.lineWidth = 3;
    for (let j = 0; j < n * 2; j++) { const x0 = 1080 * (j + 0.5) / (n * 2), q = pr(k, 0.05 * rnd(j, 4), 0.7); if (q <= 0) continue; X.beginPath(); X.moveTo(x0, -10);
      for (let m = 1; m <= 12; m++) X.lineTo(x0 + 70 * Math.sin(m * 0.8 + j + k * 4) * m / 12, m * 160 * q); X.stroke(); }
    X.restore();
    X.save(); puffs(0); X.clip(); o.B(X); X.restore();
  };

  /* 160 مكعب يلف — الإطار وجه مكعب ثلاثي الأبعاد يلف لليمين، وB على الوجه الثاني يجي من اليسار (اتجاه القراية العربية). o: {s, dur=1, A, B, bg, depth=2600} */
  FX.cubeTurn = (ctx, t, o) => {
    const { X, P, E } = ctx, k = E.cubicInOut(pr(t, o.s, o.s + (o.dur || 1)));
    if (k <= 0.001) { o.A(X); return; } if (k >= 0.999) { o.B(X); return; }
    const cA = lay(X, 'cbA', o.A), cB = lay(X, 'cbB', o.B), th = k * Math.PI / 2, h = 540, D = o.depth || 2600, pull = 1 - 0.2 * Math.sin(2 * th), dk = o.bg || darker(P.ink, P.bg);
    X.fillStyle = dk; X.fillRect(0, 0, 1080, 1920);
    const proj = (u, ph) => { const xp = u * h * Math.cos(ph) + h * Math.sin(ph), zp = u * h * Math.sin(ph) - h * Math.cos(ph), f = D / (D + zp + h) * pull; return [540 + xp * f, f]; };
    const face = (c, ph, shade) => { const N = 72, a = proj(-1, ph), b = proj(1, ph); if (b[0] - a[0] < 1) return;
      for (let i = 0; i < N; i++) { const p0 = proj(-1 + 2 * i / N, ph), p1 = proj(-1 + 2 * (i + 1) / N, ph), f = (p0[1] + p1[1]) / 2; part(X, c, i * 1080 / N, 0, 1080 / N, 1920, p0[0], 960 - 960 * f, p1[0] - p0[0] + 3, 1920 * f); }
      if (shade > 0.01) { X.save(); X.globalAlpha = shade; X.fillStyle = '#000'; poly(X, [[a[0], 960 - 960 * a[1]], [b[0], 960 - 960 * b[1]], [b[0], 960 + 960 * b[1]], [a[0], 960 + 960 * a[1]]]); X.fill(); X.restore(); } };
    const fa = () => face(cA, th, 0.6 * (1 - Math.cos(th))), fb = () => face(cB, th - Math.PI / 2, 0.6 * (1 - Math.cos(Math.PI / 2 - th)));
    if (th < Math.PI / 4) { fb(); fa(); } else { fa(); fb(); }
  };

  /* 161 زاوية تنقشر — زاوية الإطار تحت يسار تنقشر مثل ستيكر وتنطوي، وتكشف B تحتها. o: {s, dur=1.2, A, B, back (لون ظهر الورقة)} */
  FX.cornerPeel = (ctx, t, o) => {
    const { X, P, E } = ctx, k = E.cubicInOut(pr(t, o.s, o.s + (o.dur || 1.2)));
    if (k <= 0) { o.A(X); return; } if (k >= 1) { o.B(X); return; }
    const C = [0, 1920], dl = Math.hypot(1080, 1920), dir = [1080 / dl, -1920 / dl], L = 2.05 * dl * k, Pk = [C[0] + dir[0] * L, C[1] + dir[1] * L], Mid = [(C[0] + Pk[0]) / 2, (C[1] + Pk[1]) / 2];
    const f = p => (p[0] - Mid[0]) * dir[0] + (p[1] - Mid[1]) * dir[1], R = [[0, 0], [1080, 0], [1080, 1920], [0, 1920]];
    o.B(X);
    const keep = clipPoly(R, f), peel = clipPoly(R, p => -f(p));
    if (peel.length > 2) { X.save(); poly(X, peel); X.clip(); const g = X.createLinearGradient(Mid[0], Mid[1], Mid[0] - dir[0] * 180, Mid[1] - dir[1] * 180); g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); X.fillStyle = g; X.fillRect(0, 0, 1080, 1920); X.restore(); }
    if (keep.length > 2) { X.save(); poly(X, keep); X.clip(); o.A(X); X.restore(); }
    if (peel.length > 2) { const fl = peel.map(p => { const v = f(p); return [p[0] - 2 * v * dir[0], p[1] - 2 * v * dir[1]]; }), back = o.back || mixC(P.bg, '#FFFFFF', 0.45);
      X.save(); shd(X, 50, 0, 0.35); X.shadowOffsetX = -14; X.fillStyle = back; poly(X, fl); X.fill(); noShd(X);
      const g = X.createLinearGradient(Mid[0], Mid[1], Mid[0] + dir[0] * 500, Mid[1] + dir[1] * 500); g.addColorStop(0, 'rgba(0,0,0,.22)'); g.addColorStop(0.25, 'rgba(255,255,255,.25)'); g.addColorStop(1, 'rgba(0,0,0,.05)');
      X.fillStyle = g; poly(X, fl); X.fill(); X.restore(); }
  };

  /* 162 بكسلة — A يتبكسل لمربعات كبيرة، وبالذروة يتبدل لـB اللي يرجع يصفى. o: {s, dur=1, A, B, max=72} */
  FX.pixelMosaic = (ctx, t, o) => {
    const { X, E } = ctx, k = pr(t, o.s, o.s + (o.dur || 1));
    if (k <= 0) { o.A(X); return; } if (k >= 1) { o.B(X); return; }
    const q = k < 0.5 ? E.cubicIn(k * 2) : E.cubicOut((1 - k) * 2), b = Math.max(1, Math.round(1 + (o.max || 72) * q));
    const me = FX._bpm || (FX._bpm = { c: document.createElement('canvas') }), tw = Math.ceil(1080 / b), th = Math.ceil(1920 / b);
    const px = (src, slot, a) => { const c = lay(X, slot, src); me.c.width = tw; me.c.height = th; const Y = me.c.getContext('2d'); Y.imageSmoothingEnabled = true; Y.drawImage(c, 0, 0, tw, th);
      X.save(); X.imageSmoothingEnabled = false; if (a != null) X.globalAlpha *= a; X.drawImage(me.c, 0, 0, tw, th, 0, 0, tw * b, th * b); X.restore(); };
    if (b <= 1) { (k < 0.5 ? o.A : o.B)(X); return; }
    const m = sst(0.42, 0.58, k);
    if (m < 1) px(o.A, 'pmA'); if (m > 0) px(o.B, 'pmB', m);
  };

  /* 163 مشكال — المشهد يتحول لمشكال (مرايا دايرية تلف)، وبالنص يتبدل لـB ثم ينفك. o: {s, dur=1.4, A, B, n=10} */
  FX.kaleido = (ctx, t, o) => {
    const { X, E } = ctx, k = pr(t, o.s, o.s + (o.dur || 1.4)), n = (o.n || 10) & ~1;
    if (k <= 0) { o.A(X); return; } if (k >= 1) { o.B(X); return; }
    const M = X.getTransform(), cA = lay(X, 'kdA', o.A), cB = lay(X, 'kdB', o.B), env = Math.sin(Math.PI * k), al = sst(0, 0.35, k) * (1 - sst(0.65, 1, k)), m = sst(0.4, 0.6, k);
    putC(X, k < 0.5 ? cA : cB);
    if (al <= 0.002) return;
    const seg = TAU / n, spin = E.sineInOut(k) * Math.PI * 1.2, z = 1 + 0.7 * env;
    for (let j = 0; j < n; j++) {
      X.save(); X.globalAlpha = al; X.translate(540, 960); X.rotate(j * seg); if (j % 2) { X.rotate(seg); X.scale(1, -1); }
      X.beginPath(); X.moveTo(0, 0); X.arc(0, 0, 2400, -0.002, seg + 0.002); X.closePath(); X.clip();
      X.rotate(spin); X.scale(z, z); X.translate(-540, -960 + 300 * env);
      if (m < 1) drawSnap(X, cA, M); if (m > 0) drawSnap(X, cB, M, m); X.restore();
    }
  };

  /* 164 حرق فيلم — بقع حرق (حافة صفرا ← برتقالي ← محروق) تاكل A وتكشف B، مع وهج دافي. o: {s, dur=1.6, A, B, at:[[x,y],...]} */
  FX.filmBurn = (ctx, t, o) => {
    const { X, E } = ctx, k = pr(t, o.s, o.s + (o.dur || 1.6));
    if (k <= 0) { o.A(X); return; } if (k >= 1) { o.B(X); return; }
    o.A(X);
    const H = o.at || [[300, 640], [820, 1240], [500, 1600], [180, 1180], [880, 380]], dl = [0, 0.12, 0.22, 0.3, 0.38];
    const holes = grow => { X.beginPath(); H.forEach((c, i) => { const q = E.cubicIn(pr(k, dl[i % 5], dl[i % 5] + 0.62)), r = 1700 * q; if (r <= 0) return;
      for (let j = 0; j <= 64; j++) { const a = j / 64 * TAU, rr = (r + grow) * (1 + 0.16 * n1(a * 3 + i * 7, 11 + i) + 0.07 * n1(a * 9 + k * 6, 23 + i)); j ? X.lineTo(c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr) : X.moveTo(c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr); } X.closePath(); }); };
    X.save(); X.fillStyle = 'rgba(40,18,6,.85)'; holes(46); X.fill(); X.fillStyle = '#E8661A'; X.shadowColor = '#FF8A2A'; X.shadowBlur = 40; holes(20); X.fill(); X.fillStyle = '#FFE6A0'; holes(7); X.fill(); X.restore();
    X.save(); holes(0); X.clip(); o.B(X); X.restore();
    const fl = Math.sin(Math.PI * k) * (0.8 + 0.2 * n1(t * 20, 4)); X.save(); X.globalCompositeOperation = 'screen'; X.fillStyle = `rgba(255,140,40,${(0.32 * fl).toFixed(3)})`; X.fillRect(0, 0, 1080, 1920); X.restore();
  };

  /* 165 ترجيع VHS — خطوط تتبّع وتشويش وشريط يلف لفوق مع «◀◀ REW»، ثم B يشتغل «▶ PLAY». o: {s, dur=1.2, A, B} */
  FX.vhsRewind = (ctx, t, o) => {
    const { X, P, E } = ctx, d = o.dur || 1.2, k = pr(t, o.s, o.s + d);
    if (k <= 0) { o.A(X); return; } if (k >= 1) { o.B(X); return; }
    const first = k < 0.52, src = lay(X, 'vhs', first ? o.A : o.B), amt = first ? E.cubicIn(pr(k, 0, 0.5)) : 1 - E.cubicOut(pr(k, 0.52, 1)), roll = first ? 1920 * E.cubicIn(pr(k, 0.3, 0.52)) : 1920 * (1 - E.cubicOut(pr(k, 0.52, 0.7)));
    X.fillStyle = '#0B0B0D'; X.fillRect(0, 0, 1080, 1920);
    const rh = 16, tt = t * 9;
    for (let y = 0; y < 1920; y += rh) {
      const band = Math.abs(n1(y * 0.004 - tt * 0.6, 5)), dx = amt * (n1(y * 0.05 + tt, 3) * 30 + (band > 0.55 ? 160 * (band - 0.55) * n1(y * 0.3 + tt * 3, 7) * 4 : 0));
      let sy = ((y + roll) % 1920 + 1920) % 1920; part(X, src, 0, sy, 1080, Math.min(rh, 1920 - sy), dx, y, 1080, Math.min(rh, 1920 - sy));
    }
    X.save(); X.globalAlpha = 0.5 * amt; X.fillStyle = '#FFFFFF';
    for (let j = 0; j < 70; j++) { const y = ((h2(j, Math.floor(t * 30)) * 1920) | 0), w = 40 + 400 * h2(j, Math.floor(t * 30) + 9); X.fillRect(h2(j + 50, Math.floor(t * 30)) * 1080, y, w, 3); }
    const by = ((tt * 90) % 2200) - 140; X.globalAlpha = 0.35 * amt; X.fillRect(0, by, 1080, 26); X.restore();
    X.save(); X.globalAlpha = 0.18; X.fillStyle = '#000'; for (let y = 0; y < 1920; y += 6) X.fillRect(0, y, 1080, 2); X.restore();
    const osd = first ? cl(k * 8) : 1 - pr(k, 0.85, 1); if (osd > 0) { X.save(); X.globalAlpha = osd; X.fillStyle = '#FFFFFF'; shd(X, 0, 3, 0.6); X.shadowOffsetX = 3;
      if (first) { [0, 44].forEach(dx => { X.beginPath(); X.moveTo(110 + dx, 250); X.lineTo(150 + dx, 222); X.lineTo(150 + dx, 278); X.closePath(); X.fill(); }); }
      else { X.beginPath(); X.moveTo(110, 222); X.lineTo(150, 250); X.lineTo(110, 278); X.closePath(); X.fill(); }
      ctx.text(X, first ? 'REW' : 'PLAY', 220, 270, { family: 'num', weight: 800, size: 56, align: 'left', dir: 'ltr', color: '#FFFFFF' });
      const s = Math.max(0, Math.round(first ? 754 - 600 * k : 154)); ctx.text(X, `00:${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`, 110, 340, { family: 'num', weight: 700, size: 44, align: 'left', dir: 'ltr', color: '#FFFFFF' }); noShd(X); X.restore(); }
  };

  /* 166 طي الورقة — المشهد ينطوي مثل ورقة رسالة (أكورديون 3 طيات بظلال)، ثم المشهد الجديد ينفرد بنفس الطريقة. o: {s, dur=1.3, A, B, n=3, bg, depth=1800} */
  FX.paperFold = (ctx, t, o) => {
    const { X, P, E } = ctx, k = pr(t, o.s, o.s + (o.dur || 1.3)), n = o.n || 3;
    if (k <= 0) { o.A(X); return; } if (k >= 1) { o.B(X); return; }
    const first = k < 0.5, c = lay(X, 'pf', first ? o.A : o.B), f = first ? E.cubicIn(k * 2) : 1 - E.cubicOut((k - 0.5) * 2), th = f * Math.PI / 2 * 0.97, ph = 1920 / n, D = o.depth || 1800;
    X.fillStyle = o.bg || darker(P.ink, P.bg); X.fillRect(0, 0, 1080, 1920);
    const Ht = 1920 * Math.cos(th), y0 = 960 - Ht / 2, rows = 40;
    X.save(); shd(X, 60 * f, 30 * f, 0.4 * f); X.fillStyle = '#000'; X.fillRect(540 - 540 * 0.98, y0, 1080 * 0.98, Ht); noShd(X); X.restore();
    for (let i = 0; i < n; i++) for (let r = 0; r < rows; r++) {
      const v0 = r / rows, v1 = (r + 1) / rows, z = v => ((i % 2 === 0) ? v : 1 - v) * ph * Math.sin(th), sy0 = y0 + (i + v0) * ph * Math.cos(th), sy1 = y0 + (i + v1) * ph * Math.cos(th);
      const ff = D / (D + (z(v0) + z(v1)) / 2), w = 1080 * ff; part(X, c, 0, i * ph + v0 * ph, 1080, ph / rows, 540 - w / 2, sy0, w, sy1 - sy0 + 1.5);
    }
    for (let i = 0; i < n; i++) { const sh = (i % 2 ? 0.45 : 0.12) * Math.sin(th); if (sh < 0.01) continue; const ya = y0 + i * ph * Math.cos(th), yb = ya + ph * Math.cos(th);
      const g = X.createLinearGradient(0, ya, 0, yb); g.addColorStop(0, `rgba(0,0,0,${i % 2 ? sh * 0.6 : sh})`); g.addColorStop(1, `rgba(0,0,0,${i % 2 ? sh : sh * 0.4})`); X.fillStyle = g;
      const fa = D / (D + ((i % 2 === 0) ? 0 : ph * Math.sin(th))), fb = D / (D + ((i % 2 === 0) ? ph * Math.sin(th) : 0));
      poly(X, [[540 - 540 * fa, ya], [540 + 540 * fa, ya], [540 + 540 * fb, yb], [540 - 540 * fb, yb]]); X.fill(); }
  };

  /* 167 ضربة فرشاة — 4 ضربات فرشاة عريضة تمسح من اليمين لليسار بلون الهوية، وB ينرسم داخلها. o: {s, dur=1.3, A, B, color=P.acc} */
  FX.brushReveal = (ctx, t, o) => {
    const { X, P, E } = ctx, k = pr(t, o.s, o.s + (o.dur || 1.3));
    if (k <= 0) { o.A(X); return; } if (k >= 1) { o.B(X); return; }
    o.A(X);
    const band = (j, grow) => { const p = E.cubicInOut(pr(k, j * 0.13, j * 0.13 + 0.5)); if (p <= 0) return; const yc = 200 + j * 470, x1 = 1300, x0 = x1 - 1700 * p, hh = 320 + grow;
      X.save(); X.translate(540, yc); X.rotate(-0.1); X.translate(-540, -yc);
      X.moveTo(x1, yc - hh); for (let x = x1; x >= x0; x -= 40) X.lineTo(x, yc - hh + 16 * n1(x * 0.02, j * 5 + 1) + (grow ? 8 * h2(x | 0, j) : 0));
      for (let yy = yc - hh; yy <= yc + hh; yy += 14) { const e = (yy - yc) / hh, br = 70 * h2(j * 977 + Math.round(yy / 14), grow ? 3 : 4) * (0.4 + 0.6 * e * e); X.lineTo(x0 - 30 * (1 - e * e) + br - (grow ? 14 : 0), yy); }
      for (let x = x0; x <= x1; x += 40) X.lineTo(x, yc + hh + 16 * n1(x * 0.02, j * 5 + 2) - (grow ? 8 * h2(x | 0, j + 9) : 0));
      X.closePath(); X.restore(); };
    X.save(); X.fillStyle = o.color || P.acc; X.beginPath(); for (let j = 0; j < 4; j++) band(j, 34); X.fill(); X.restore();
    X.save(); X.beginPath(); for (let j = 0; j < 4; j++) band(j, 0); X.clip(); o.B(X);
    X.globalAlpha = 0.18 * (1 - sst(0.75, 1, k)); X.strokeStyle = mixC(o.color || P.acc, '#000000', 0.3); X.lineWidth = 3;
    for (let j = 0; j < 4; j++) { const p = E.cubicInOut(pr(k, j * 0.13, j * 0.13 + 0.5)), yc = 200 + j * 470; if (p <= 0) continue; X.save(); X.translate(540, yc); X.rotate(-0.1); X.translate(-540, -yc);
      for (let q = 0; q < 26; q++) { const yy = yc - 300 + q * 24, x0 = 1300 - 1700 * p + 60 * h2(j, q); X.beginPath(); X.moveTo(x0, yy); X.lineTo(x0 + 200 + 500 * h2(q, j + 7), yy + 4 * n1(q, j)); X.stroke(); } X.restore(); }
    X.restore();
    X.save(); X.fillStyle = o.color || P.acc; for (let j = 0; j < 4; j++) { const p = E.cubicInOut(pr(k, j * 0.13, j * 0.13 + 0.5)); if (p <= 0 || p >= 1) continue;
      for (let s = 0; s < 6; s++) { const x = 1300 - 1700 * p - 60 - 160 * rnd(j * 9 + s, 1), y = 200 + j * 470 + (rnd(j * 9 + s, 2) - 0.5) * 600 + (1250 - x) * 0.1 - 50; X.beginPath(); X.arc(x, y, 5 + 12 * rnd(j * 9 + s, 3), 0, TAU); X.fill(); } }
    X.restore();
  };

  /* 168 تلفزيون قديم ينطفي — A ينضغط لخط ثم نقطة بيضا (طفية CRT)، وB يشتغل بالعكس مع نطّة. o: {s, dur=1.1, A, B} */
  FX.tvOff = (ctx, t, o) => {
    const { X, E } = ctx, k = pr(t, o.s, o.s + (o.dur || 1.1));
    if (k <= 0) { o.A(X); return; } if (k >= 1) { o.B(X); return; }
    X.fillStyle = '#050506'; X.fillRect(0, 0, 1080, 1920);
    let sx, sy, wh, src;
    if (k < 0.45) { const a = pr(k, 0, 0.28), b = pr(k, 0.26, 0.45); sy = lerp(1, 0.004, E.expoIn(a)); sx = lerp(1, 0.006, E.expoIn(b)); wh = Math.max(E.cubicIn(a), 0.4); src = o.A; }
    else if (k < 0.55) { sx = sy = 0; wh = 1; src = null; }
    else { const a = pr(k, 0.55, 0.72), b = pr(k, 0.68, 1); sx = lerp(0.006, 1, E.expoOut(a)); sy = b <= 0 ? 0.004 : lerp(0.004, 1, E.elasticOut ? E.backOut(b) : b); wh = 1 - E.cubicOut(b); src = o.B; }
    if (src && sx > 0.002) { X.save(); X.translate(540, 960); X.scale(sx, Math.max(0.002, sy)); X.translate(-540, -960); X.beginPath(); X.rect(0, 0, 1080, 1920); X.clip(); src(X);
      X.fillStyle = `rgba(255,255,255,${(0.9 * wh).toFixed(3)})`; X.fillRect(0, 0, 1080, 1920); X.restore(); }
    const dot = k < 0.55 ? sst(0.3, 0.45, k) * (1 - sst(0.5, 0.55, k)) : 0; if (dot > 0) { X.save(); const g = X.createRadialGradient(540, 960, 0, 540, 960, 90); g.addColorStop(0, `rgba(255,255,255,${dot})`); g.addColorStop(1, 'rgba(255,255,255,0)'); X.fillStyle = g; X.fillRect(400, 820, 280, 280); X.restore(); }
    X.save(); X.globalAlpha = 0.15; X.fillStyle = '#000'; for (let y = 0; y < 1920; y += 6) X.fillRect(0, y, 1080, 2); X.restore();
  };

  /* ══════════ ج) كاميرا وتركيز ══════════ */

  /* 169 كشّاف — الشاشة تظلم وكشّاف ضوء يدوّر ثم يثبت على نقطة (منتج، كلمة، وجه)، وحلقة تنبض لما يوصل. o: {s, draw, at=[540,900], r=260, from=[220,500], label, out} */
  FX.spotlight = (ctx, t, o) => {
    const { X, P, at } = ctx; if (o.draw) o.draw(X);
    const a = at(t, o.s, o.s + 0.45, 'cubicOut') * (1 - fout(ctx, t, o, 0.5)); if (a <= 0) return;
    const to = o.at || [540, 900], fr = o.from || [220, 500], R = o.r || 260, m = at(t, o.s + 0.15, o.s + 1.35, 'expoInOut');
    const px = lerp(fr[0], to[0], m) + Math.sin((t - o.s) * 2.6) * 110 * (1 - m), py = lerp(fr[1], to[1], m) + Math.cos((t - o.s) * 1.9) * 90 * (1 - m), r = R * (1 + 0.2 * (1 - m));
    X.save(); const g = X.createRadialGradient(px, py, r * 0.82, px, py, r * 1.25); g.addColorStop(0, 'rgba(8,6,4,0)'); g.addColorStop(1, `rgba(8,6,4,${(0.84 * a).toFixed(3)})`);
    X.fillStyle = g; X.fillRect(0, 0, 1080, 1920);
    const g2 = X.createRadialGradient(px, py, 0, px, py, r); g2.addColorStop(0, `rgba(255,236,200,${(0.16 * a).toFixed(3)})`); g2.addColorStop(1, 'rgba(255,236,200,0)'); X.globalCompositeOperation = 'screen'; X.fillStyle = g2; X.beginPath(); X.arc(px, py, r, 0, TAU); X.fill(); X.restore();
    const lp = pr(t, o.s + 1.35, o.s + 2.0); if (lp > 0 && lp < 1) { X.save(); X.globalAlpha = a * (1 - lp); X.strokeStyle = P.acc; X.lineWidth = 10 * (1 - lp) + 2; X.beginPath(); X.arc(px, py, r * (0.85 + 0.35 * lp), 0, TAU); X.stroke(); X.restore(); }
    if (o.label) { const k = at(t, o.s + 1.3, o.s + 1.7, 'backOut') * a; if (k > ON) { X.save(); X.translate(px, py + r + 90); X.scale(k, k); X.font = ctx.font('body', 700, 54); const w = Math.min(760, X.measureText(o.label).width) + 70;
      X.fillStyle = P.acc; X.beginPath(); X.roundRect(-w / 2, -50, w, 96, 48); X.fill(); ctx.text(X, o.label, 0, 18, { family: 'body', weight: 700, size: 54, color: onAcc(P), maxWidth: 760 }); X.restore(); } }
  };

  /* 170 زوم على الكلمة — الجملة تطلع، ثم الكاميرا تدخل على كلمة وحدة لين تملى الشاشة وتتلوّن، والباقي يبهت. o: {text, s, word=1 (رقم الكلمة), y=960, size=110, hold=1.2, out} */
  FX.zoomWord = (ctx, t, o) => {
    const { X, P, at } = ctx, size = o.size || 110, y = pick(o, 'y', 960), wi = pick(o, 'word', 1);
    const L = ctx.text.layout(X, o.text, { family: 'display', weight: 400, size, maxWidth: 900, lineHeight: 1.25 });
    const B = ctx.text.drawLayout(X, L, 540, y, { perWord: () => ({ skip: true }) }), b = B[Math.min(wi, B.length - 1)]; if (!b) return;
    const back = o.out != null ? at(t, o.out, o.out + 0.7, 'expoInOut') : 0, z = at(t, o.s + 0.7, o.s + 1.6, 'expoInOut') * (1 - back);
    const Z = lerp(1, Math.min(940 / b.w, 4), z), cx = lerp(540, b.cx, z), cy = lerp(y, b.cy, z);
    X.save(); X.translate(540, lerp(y, 900, z)); X.scale(Z, Z); X.translate(-cx, -cy);
    ctx.text.drawLayout(X, L, 540, y, { perWord: (i) => { const k = at(t, o.s + i * 0.08, o.s + 0.4 + i * 0.08, 'expoOut'), me = i === wi;
      return { alpha: k * (me ? 1 : 1 - 0.85 * z), dy: 40 * (1 - k), color: me && z > 0.55 ? P.acc : (o.color || P.ink) }; } });
    const u = at(t, o.s + 1.5, o.s + 1.9, 'expoOut') * (1 - back); if (u > 0) { X.fillStyle = P.acc; X.globalAlpha = u; X.beginPath(); X.roundRect(b.x + b.w * (1 - u), b.y + b.h + 4, b.w * u, Math.max(4, 10 / Z), 4); X.fill(); }
    X.restore();
  };

  /* 171 ميلان دتش — الكاميرا تميل بزاوية (توتر/مفاجأة) مع زوم يغطي الحواف، وترجع على out. o: {s, draw, angle=.14, dur=.8, out} */
  FX.dutchTilt = (ctx, t, o) => {
    const { X, at } = ctx, k = at(t, o.s, o.s + (o.dur || 0.8), 'expoOut') * (1 - (o.out != null ? at(t, o.out, o.out + 0.6, 'expoInOut') : 0));
    const th = pick(o, 'angle', 0.14) * k + 0.008 * Math.sin(t * 1.3) * k, c = Math.abs(Math.cos(th)), s = Math.abs(Math.sin(th)), sc = Math.max((1080 * c + 1920 * s) / 1080, (1080 * s + 1920 * c) / 1920) * (1 + 0.03 * k);
    X.save(); X.translate(540, 960); X.rotate(th); X.scale(sc, sc); X.translate(-540, -960); o.draw(X); X.restore();
  };

  /* 172 لفّة برميل — الكاميرا تلف 360° بسرعة مع غباش حركة وزوم يغطي، وترجع ثابتة (ضربة). o: {s, draw, dur=.75, dir=1, bg} */
  FX.barrelRoll = (ctx, t, o) => {
    const { X, P, E } = ctx, d = o.dur || 0.75, p = pr(t, o.s, o.s + d); if (p <= 0 || p >= 1) { o.draw(X); return; }
    X.fillStyle = o.bg || darker(P.ink, P.bg); X.fillRect(0, 0, 1080, 1920);
    const ang = q => (o.dir || 1) * TAU * E.expoInOut(q), vel = Math.abs(ang(p + 0.01) - ang(p - 0.01)) / 0.02, N = vel > 3 ? 6 : 1;
    for (let j = N - 1; j >= 0; j--) { const th = ang(p) - (o.dir || 1) * j * vel * d * 0.006, c = Math.abs(Math.cos(th)), s = Math.abs(Math.sin(th)), sc = Math.max((1080 * c + 1920 * s) / 1080, (1080 * s + 1920 * c) / 1920);
      X.save(); X.globalAlpha = j ? 0.5 / (j + 1) : 1; X.translate(540, 960); X.rotate(th); X.scale(sc, sc); X.translate(-540, -960); o.draw(X); X.restore(); }
  };

  /* ══════════ د) كلام ══════════ */

  /* 173 موجة الكلام — الكلمات تنزل وحدة وحدة وتركب على خط موجة يتمايل (كل كلمة تميل مع الموجة). هادي ومرح. o: {text, s, y=940, size=110, amp=46, speed=1.6, stagger=.16, line=true, out} */
  FX.waveLine = (ctx, t, o) => {
    const { X, P, at } = ctx, y = pick(o, 'y', 940), amp = pick(o, 'amp', 46), sp = pick(o, 'speed', 1.6), st = pick(o, 'stagger', 0.16), ko = fout(ctx, t, o, 0.5);
    let size = o.size || 110; const wAll = textW(ctx, X, o.text || '', 'display', 400, size); if (wAll > 940) size *= 940 / wAll;
    const L = ctx.text.layout(X, o.text || '', { family: 'display', weight: 400, size, maxWidth: 1e9 }), B = ctx.text.drawLayout(X, L, 540, y, { perWord: () => ({ skip: true }) });
    const wv = x => amp * Math.sin(x * 0.007 + (t - o.s) * sp * 2), sl = x => Math.atan(amp * 0.007 * Math.cos(x * 0.007 + (t - o.s) * sp * 2));
    const kl = at(t, o.s, o.s + 0.8, 'cubicInOut') * (1 - ko);
    if (o.line !== false && kl > 0) { const pts = []; for (let x = 1020; x >= 60; x -= 20) pts.push([x, y + size * 0.3 + wv(x)]); ctx.drawPath(X, pts, kl, { width: 10, color: P.acc, cap: 'round', smooth: true }); }
    B.forEach((b, i) => { const k = at(t, o.s + 0.15 + i * st, o.s + 0.75 + i * st, 'bounceOut'), ka = at(t, o.s + 0.15 + i * st, o.s + 0.3 + i * st); if (ka <= 0) return;
      X.save(); X.globalAlpha = ka * (1 - ko); X.translate(b.cx, y + wv(b.cx) - 500 * (1 - k) - 60 * ko); X.rotate(sl(b.cx));
      ctx.text(X, b.text, 0, 0, { family: 'display', weight: 400, size, color: (o.accent || []).includes(i) ? P.acc : (o.color || P.ink) }); X.restore(); });
  };

  /* 174 ظل طويل — الكلمة ترتفع من الورقة ويطلع وراها ظل طويل مكدّس (ثلاثي الأبعاد) بلون الهوية الغامق، ولمعة تعبرها. o: {text, s, y=920, size=190, depth=46, color=P.acc, shadow, out} */
  FX.longShadow = (ctx, t, o) => {
    const { X, P, at } = ctx, y = pick(o, 'y', 920), ko = fout(ctx, t, o, 0.45), k = at(t, o.s, o.s + 0.45, 'backOut') * (1 - ko), kd = at(t, o.s + 0.25, o.s + 1.1, 'expoOut') * (1 - ko); if (k <= ON) return;
    let size = o.size || 190; const w = textW(ctx, X, o.text || '', 'display', 400, size); if (w > 880) size *= 880 / w;
    const col = o.color || P.acc, sh = o.shadow || mixC(col, '#000000', 0.45), D = Math.round((o.depth || 46) * kd), lift = 0.35 * D;
    X.save(); X.translate(540 - lift, y - lift); X.scale(k, k);
    for (let i = D; i >= 1; i--) ctx.text(X, o.text, i, size * 0.36 + i, { family: 'display', weight: 400, size, color: mixC(sh, darker(P.ink, P.bg), 0.4 * i / Math.max(1, D)) });
    const sp = pr(t, o.s + 0.9, o.s + 1.5);
    if (sp > 0 && sp < 1) { const c = lay(X, 'lsh', Y => { ctx.text(Y, o.text, 0, size * 0.36, { family: 'display', weight: 400, size, color: col }); Y.globalCompositeOperation = 'source-atop'; Y.fillStyle = 'rgba(255,255,255,.5)'; Y.rotate(0.35); Y.fillRect(-700 + 1400 * sp, -400, 70, 800); }); putC(X, c); }
    else ctx.text(X, o.text, 0, size * 0.36, { family: 'display', weight: 400, size, color: col });
    X.restore();
  };

  /* 176 نص على دايرة — كلمات على دايرة تلف ببطء (مثل ختم ستوري) وبالنص كلمة كبيرة أو زر تشغيل. o: {text, center, s, x=540, y=900, r=330, size=60, spin=.35, out} */
  FX.textCircle = (ctx, t, o) => {
    const { X, P, at } = ctx, x = pick(o, 'x', 540), y = pick(o, 'y', 900), r = o.r || 330, size = o.size || 60, ko = fout(ctx, t, o, 0.5);
    const k = at(t, o.s, o.s + 0.7, 'backOut') * (1 - ko); if (k <= ON) return;
    const base = String(o.text || '').split(/\s+/).filter(Boolean); X.font = ctx.font('body', 700, size);
    const one = base.reduce((a, w) => a + X.measureText(w).width + 24, 0) + 60, rep = Math.max(1, Math.floor(TAU * r / one));
    const words = []; for (let i = 0; i < rep; i++) { base.forEach(w => words.push(w)); words.push('•'); }
    X.save(); X.translate(x, y); X.scale(k, k); X.rotate(-(t - o.s) * pick(o, 'spin', 0.35) - 0.4 * (1 - k));
    X.strokeStyle = rgba(P.acc, 0.35); X.lineWidth = 4; X.beginPath(); X.arc(0, 0, r - size * 0.35, 0, TAU); X.stroke(); X.beginPath(); X.arc(0, 0, r + size * 1.05, 0, TAU); X.stroke();
    const extra = (TAU * r - words.reduce((a, w) => a + X.measureText(w).width + 24, 0)) / words.length;
    ringWords(ctx, X, words, 0, 0, r, -Math.PI / 2 + 0.5, { size, color: o.color || P.ink, gap: 24 + Math.max(0, extra), alpha: i => at(t, o.s + 0.1 + i * 0.03, o.s + 0.35 + i * 0.03) });
    X.restore();
    const c = at(t, o.s + 0.3, o.s + 0.8, 'backOut') * (1 - ko); if (c > ON) { X.save(); X.translate(x, y); X.scale(c, c);
      if (o.center) { const cs = Math.min(200, (r - 60) * 1.6 / Math.max(1, String(o.center).length * 0.38)); ctx.text(X, o.center, 0, cs * 0.36, { family: 'display', weight: 400, size: cs, color: P.acc, maxWidth: r * 1.4 }); }
      else { X.fillStyle = P.acc; X.beginPath(); X.arc(0, 0, r * 0.45, 0, TAU); X.fill(); X.fillStyle = onAcc(P); X.beginPath(); X.moveTo(-r * 0.12, -r * 0.18); X.lineTo(r * 0.2, 0); X.lineTo(-r * 0.12, r * 0.18); X.closePath(); X.fill(); }
      X.restore(); }
  };

  /* 177 أسطوانة الكلمات — كلمة ثابتة، وجنبها أسطوانة تدوّر كلمات بدالها (نبي: سرعة ← جودة ← سعر) بنطّة. o: {pre, words[], s, every=.9, y=960, size=120, out} */
  FX.wordDrum = (ctx, t, o) => {
    const { X, P, at, E } = ctx, size = o.size || 120, y = pick(o, 'y', 960), W = o.words || [], ev = o.every || 0.9, ko = fout(ctx, t, o, 0.4), n = W.length; if (!n) return;
    const k = at(t, o.s - 0.4, o.s, 'expoOut') * (1 - ko); if (k <= 0) return;
    const fam = 'display', wPre = o.pre ? textW(ctx, X, o.pre, fam, 400, size) : 0, wD = Math.max(...W.map(w => textW(ctx, X, w, fam, 400, size))) + 60, gap = o.pre ? 40 : 0, tot = wPre + gap + wD;
    const xr = 540 + tot / 2, dc = xr - wPre - gap - wD / 2;
    let pos = 0; for (let i = 1; i < n; i++) pos += E.backOut(pr(t, o.s + i * ev - 0.05, o.s + i * ev + 0.4));
    X.save(); X.globalAlpha = k;
    if (o.pre) ctx.text(X, o.pre, xr, y + size * 0.36 + 30 * (1 - k), { family: fam, weight: 400, size, align: 'right', color: o.color || P.ink });
    X.fillStyle = P.acc; X.beginPath(); X.roundRect(dc - wD / 2, y - size * 0.72, wD, size * 1.44, 28); X.fill();
    X.save(); X.beginPath(); X.rect(dc - wD / 2 - 10, y - size * 1.6, wD + 20, size * 3.2); X.clip();
    W.forEach((w, i) => { const ph = (i - pos) * 0.62; if (Math.abs(ph) > 1.1) return; const yy = y + Math.sin(ph) * size * 1.25, sy = Math.cos(ph);
      X.save(); X.translate(dc, yy); X.scale(1, Math.max(0.05, sy)); ctx.text(X, w, 0, size * 0.36, { family: fam, weight: 400, size, color: Math.abs(ph) < 0.3 ? onAcc(P) : (P.mut || P.ink), alpha: cl(sy * 1.2) * (Math.abs(ph) < 0.3 ? 1 : 0.35) }); X.restore(); });
    X.restore(); X.restore();
  };

  /* ══════════ هـ) كروت وطبقات ══════════ */

  /* 175 عدسة مكبّرة — عدسة مكبّر بيد تدخل من تحت، تمشي على المشهد وتكبّر اللي تحتها (زوم حقيقي داخل الدايرة)، وتوقف على التفصيلة. o: {s, draw, at=[560,820], from=[880,1500], r=200, zoom=2.2, dur=1.4, out} */
  FX.magnifier = (ctx, t, o) => {
    const { X, P, at } = ctx; o.draw(X);
    const ko = o.out != null ? at(t, o.out, o.out + 0.6, 'expoIn') : 0, k = at(t, o.s, o.s + (o.dur || 1.4), 'expoInOut'); if (t < o.s || ko >= 1) return;
    const to = o.at || [560, 820], fr = o.from || [880, 1500], R = o.r || 200, z = o.zoom || 2.2;
    const cx = lerp(fr[0], to[0], k) + 60 * Math.sin(k * Math.PI) + 500 * ko, cy = lerp(fr[1], to[1], k) - 40 * Math.sin(k * Math.PI * 2) + 900 * ko, zz = lerp(1.2, z, at(t, o.s + 0.3, o.s + (o.dur || 1.4) + 0.2, 'cubicOut'));
    X.save(); X.translate(cx, cy); X.rotate(0.7); shd(X, 30, 14, 0.3); X.fillStyle = P.ink; X.beginPath(); X.roundRect(R * 0.95, -R * 0.17, R * 1.5, R * 0.34, R * 0.17); X.fill(); noShd(X);
    X.fillStyle = mixC(P.ink, '#FFFFFF', 0.2); X.fillRect(R * 0.98, -R * 0.12, R * 0.22, R * 0.24); X.restore();
    X.save(); shd(X, 40, 18, 0.3); X.fillStyle = '#000'; X.beginPath(); X.arc(cx, cy, R + 4, 0, TAU); X.fill(); noShd(X);
    X.beginPath(); X.arc(cx, cy, R, 0, TAU); X.clip(); X.fillStyle = P.bg; X.fillRect(cx - R, cy - R, 2 * R, 2 * R); X.translate(cx, cy); X.scale(zz, zz); X.translate(-cx, -cy); o.draw(X); X.restore();
    X.save(); const g = X.createRadialGradient(cx - R * 0.35, cy - R * 0.4, 0, cx, cy, R); g.addColorStop(0, 'rgba(255,255,255,.28)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(0.92, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.25)');
    X.fillStyle = g; X.beginPath(); X.arc(cx, cy, R, 0, TAU); X.fill(); X.strokeStyle = P.ink; X.lineWidth = 22; X.stroke(); X.strokeStyle = P.acc; X.lineWidth = 6; X.beginPath(); X.arc(cx, cy, R + 9, -2.6, -1.2); X.stroke(); X.restore();
  };

/* 178 شريط الأخبار — شريط «عاجل» يدخل تحت، العنوان يطلع فوقه، والأخبار تمشي (من اليسار لليمين مثل القنوات العربية). o: {s, title, items[], label='عاجل', y=1360, speed=170, out} */
  FX.newsTicker = (ctx, t, o) => {
    const { X, P, at } = ctx, y = pick(o, 'y', 1360), ko = o.out != null ? at(t, o.out, o.out + 0.5, 'expoIn') : 0, kb = at(t, o.s, o.s + 0.5, 'expoOut') * (1 - ko); if (kb <= 0) return;
    const lab = o.label || 'عاجل', lw = textW(ctx, X, lab, 'body', 700, 52) + 70, R0 = pick(o, 'right', 940), barW = R0, bx = R0 - barW * kb;
    X.save(); X.fillStyle = P.ink; X.fillRect(bx, y, barW, 100);
    X.save(); X.beginPath(); X.rect(bx, y, barW - lw, 100); X.clip();
    const items = o.items || [], sep = 70; X.font = ctx.font('body', 700, 48); const widths = items.map(s => X.measureText(s).width), cyc = widths.reduce((a, w) => a + w + sep, 0) || 1;
    let off = ((t - o.s) * (o.speed || 170)) % cyc;
    for (let rep = -1; rep <= Math.ceil(1080 / cyc) + 1; rep++) { let xr = off - rep * cyc;
      items.forEach((s, i) => { if (xr > -50 && xr - widths[i] < 1100) ctx.text(X, s, xr, y + 66, { family: 'body', weight: 700, size: 48, align: 'right', color: P.bg }); xr -= widths[i] + sep / 2;
        X.fillStyle = P.acc; X.save(); X.translate(xr, y + 50); X.rotate(Math.PI / 4); X.fillRect(-8, -8, 16, 16); X.restore(); xr -= sep / 2; }); }
    X.restore();
    X.fillStyle = P.acc; X.fillRect(R0 - lw, y - 6, lw, 112); const blink = 0.5 + 0.5 * Math.sin((t - o.s) * 8);
    X.fillStyle = onAcc(P); X.globalAlpha = 0.4 + 0.6 * blink; X.beginPath(); X.arc(R0 - lw + 30, y + 50, 10, 0, TAU); X.fill(); X.globalAlpha = 1;
    ctx.text(X, lab, R0 - 22, y + 68, { family: 'body', weight: 700, size: 52, align: 'right', color: onAcc(P) });
    if (o.title) { const kt = at(t, o.s + 0.3, o.s + 0.8, 'expoOut') * (1 - ko), tw = Math.min(R0 - 40, textW(ctx, X, o.title, 'display', 400, 84) + 80);
      X.save(); X.beginPath(); X.rect(0, y - 150, 1080, 150); X.clip(); X.translate(0, 150 * (1 - kt)); X.fillStyle = lighter(P.bg, '#FFFFFF'); X.fillRect(R0 - tw, y - 140, tw, 134);
      X.fillStyle = P.acc; X.fillRect(R0 - 10, y - 140, 10, 134); ctx.text(X, o.title, R0 - 40, y - 46, { family: 'display', weight: 400, size: 84, align: 'right', color: P.ink, maxWidth: tw - 80 }); X.restore(); }
    X.restore();
  };

  /* 179 خط زمني — خط ينرسم من اليمين لليسار، ومحطات تنط وحدة ورا وحدة (سنة فوق، وصف تحت بالتناوب). o: {items:[{k:'2019', v:'البداية'}...], s, every=.6, y=960, out} */
  FX.timelineRoad = (ctx, t, o) => {
    const { X, P, at } = ctx, it = o.items || [], n = it.length, y = pick(o, 'y', 960), ev = o.every || 0.6, ko = fout(ctx, t, o, 0.5); if (!n) return;
    const xr = 940, xl = 140, xs = i => (n === 1 ? 540 : xr - (xr - xl) * i / (n - 1)), T = i => o.s + 0.3 + i * ev;
    const kl = at(t, o.s, T(n - 1) + 0.2, 'cubicInOut');
    X.save(); X.globalAlpha = 1 - ko;
    X.strokeStyle = rgba(P.mut || P.ink, 0.3); X.lineWidth = 10; X.lineCap = 'round'; X.beginPath(); X.moveTo(xr + 40, y); X.lineTo(xl - 40, y); X.stroke();
    X.strokeStyle = P.acc; X.beginPath(); X.moveTo(xr + 40, y); X.lineTo(xr + 40 - (xr - xl + 80) * kl, y); X.stroke();
    it.forEach((m, i) => { const k = at(t, T(i), T(i) + 0.4, 'backOut'), x = xs(i), up = i % 2 === 0; if (k <= ON) { X.fillStyle = P.bg; X.strokeStyle = rgba(P.mut || P.ink, 0.5); X.lineWidth = 6; X.beginPath(); X.arc(x, y, 18, 0, TAU); X.fill(); X.stroke(); return; }
      X.save(); X.translate(x, y); X.scale(k, k); X.fillStyle = P.acc; X.beginPath(); X.arc(0, 0, 30, 0, TAU); X.fill(); X.fillStyle = P.bg; X.beginPath(); X.arc(0, 0, 12, 0, TAU); X.fill(); X.restore();
      const kt = at(t, T(i) + 0.1, T(i) + 0.55, 'expoOut'), dy = up ? -1 : 1;
      X.strokeStyle = rgba(P.ink, 0.4); X.lineWidth = 4; X.beginPath(); X.moveTo(x, y + dy * 40); X.lineTo(x, y + dy * (40 + 60 * kt)); X.stroke();
      ctx.text(X, String(m.k), x, y + dy * (up ? 125 : 165) + 30 * (1 - kt) * dy, { family: 'num', weight: 800, size: 64, dir: 'ltr', color: P.acc, alpha: kt });
      ctx.text(X, String(m.v || ''), x, y + dy * (up ? 195 : 235) + 30 * (1 - kt) * dy, { family: 'body', weight: 700, size: 44, color: P.ink, alpha: kt, maxWidth: 260 }); });
    X.restore();
  };

  /* 180 نجوم التقييم — 5 نجوم تتعبّى من اليمين وحدة وحدة (والكسر نص نجمة) مع لمعة، والرقم يعدّ فوقها. o: {score=4.5, s, y=900, label, out} */
  FX.ratingStars = (ctx, t, o) => {
    const { X, P, at } = ctx, sc = pick(o, 'score', 4.5), y = pick(o, 'y', 900), ko = fout(ctx, t, o, 0.4), R = 82, gap = 190;
    const k0 = at(t, o.s, o.s + 0.4, 'expoOut') * (1 - ko); if (k0 <= 0) return;
    X.save(); X.globalAlpha = k0;
    for (let i = 0; i < 5; i++) { const x = 540 + (2 - i) * gap, ts = o.s + 0.3 + i * 0.25, k = at(t, ts, ts + 0.35, 'backOut'), fill = cl(sc - i), fk = at(t, ts, ts + 0.3, 'cubicOut') * fill;
      X.save(); X.translate(x, y); X.rotate(-0.4 * (1 - at(t, o.s, o.s + 0.6))); const pop = 1 + 0.25 * Math.sin(Math.PI * pr(t, ts, ts + 0.35)) * (fill > 0 ? 1 : 0);
      X.scale(pop, pop); starPath(X, 0, 0, R, R * 0.45, 5, 0); X.fillStyle = rgba(P.mut || P.ink, 0.22); X.fill();
      if (fk > 0) { X.save(); starPath(X, 0, 0, R, R * 0.45, 5, 0); X.clip(); X.fillStyle = o.color || P.acc; X.fillRect(R - 2 * R * fk, -R, 2 * R * fk, 2 * R); X.restore(); }
      X.restore();
      const sp = pr(t, ts + 0.15, ts + 0.7); if (fill > 0 && sp > 0 && sp < 1) { X.save(); X.globalAlpha = k0 * (1 - sp); X.fillStyle = P.hi || P.acc; for (let j = 0; j < 4; j++) { const a = j * TAU / 4 + i, d = R * (1 + 0.8 * sp); sparkle(X, x + Math.cos(a) * d, y + Math.sin(a) * d, 18 * (1 - sp * 0.5), sp * 2); X.fill(); } X.restore(); } }
    const kn = at(t, o.s + 0.3, o.s + 0.3 + 5 * 0.25, 'expoOut'); ctx.text(X, (sc * kn).toFixed(1), 540, y - 170, { family: 'num', weight: 900, size: 170, dir: 'ltr', color: P.ink });
    ctx.text(X, '/ 5', 540 + textW(ctx, X, (sc * kn).toFixed(1), 'num', 900, 170) / 2 + 70, y - 170, { family: 'num', weight: 700, size: 60, dir: 'ltr', color: P.mut || P.ink });
    if (o.label) ctx.text(X, o.label, 540, y + 190, { family: 'body', weight: 700, size: 54, color: P.ink, alpha: at(t, o.s + 1.4, o.s + 1.8), maxWidth: 900 });
    X.restore();
  };

  /* 181 ختم خصم نجمي — شارة مسننة تلف وتنط بنسبة الخصم، ولمعة تعبرها وتظل تلف شوي. o: {text='50%', sub='خصم', s, x=540, y=900, r=270, color=P.acc, out} */
  FX.burstBadge = (ctx, t, o) => {
    const { X, P, at } = ctx, x = pick(o, 'x', 540), y = pick(o, 'y', 900), r = o.r || 270, ko = fout(ctx, t, o, 0.35), k = at(t, o.s, o.s + 0.55, 'backOut') * (1 - ko); if (k <= ON) return;
    X.save(); X.translate(x, y); X.rotate(-2.2 * (1 - at(t, o.s, o.s + 0.6, 'expoOut')) + 0.12 * (t - o.s)); X.scale(k, k);
    shd(X, 40, 16, 0.25); X.fillStyle = o.color || P.acc; starPath(X, 0, 0, r, r * 0.86, 22, 0); X.fill(); noShd(X);
    X.strokeStyle = rgba(onAcc(P), 0.6); X.lineWidth = 5; X.setLineDash([4, 14]); X.beginPath(); X.arc(0, 0, r * 0.74, 0, TAU); X.stroke(); X.setLineDash([]);
    const sh = pr(t, o.s + 0.6, o.s + 1.3); if (sh > 0 && sh < 1) { X.save(); starPath(X, 0, 0, r, r * 0.86, 22, 0); X.clip(); X.rotate(0.5); X.fillStyle = 'rgba(255,255,255,.35)'; X.fillRect(-r * 1.4 + 2.8 * r * sh, -r * 1.5, 70, r * 3); X.restore(); }
    X.restore();
    X.save(); X.translate(x, y); const pop = at(t, o.s + 0.25, o.s + 0.6, 'backOut') * (1 - ko); X.scale(pop, pop); X.rotate(-0.08);
    if (pop > ON) { ctx.text(X, '-' + (o.text || '50%'), 0, r * 0.26, { family: 'num', weight: 900, size: r * 0.62, dir: 'ltr', color: onAcc(P), maxWidth: r * 1.5 });
      ctx.text(X, o.sub || 'خصم', 0, -r * 0.4, { family: 'body', weight: 700, size: r * 0.24, color: onAcc(P) }); }
    X.restore();
  };

  /* 182 كلمة تتعبّى — كلمة كبيرة مفرّغة، تتعبّى من تحت بسائل يتموّج (موجتين وفقاعات) لين المستوى المطلوب، والنسبة تحتها. o: {text, s, dur=2, level=1, y=900, size=300, color=P.acc, label, out} */
  FX.liquidFill = (ctx, t, o) => {
    const { X, P, at, E } = ctx, y = pick(o, 'y', 900), ko = fout(ctx, t, o, 0.4), k0 = at(t, o.s - 0.3, o.s, 'cubicOut') * (1 - ko); if (k0 <= 0) return;
    let size = o.size || 300; const w = textW(ctx, X, o.text || '', 'display', 400, size); if (w > 920) size *= 920 / w;
    const col = o.color || P.acc, lv = pick(o, 'level', 1) * E.cubicInOut(pr(t, o.s + 0.2, o.s + 0.2 + (o.dur || 2))), top = y - size * 0.62, bot = y + size * 0.42, wl = lerp(bot + 20, top - 30, lv), tt = t - o.s;
    X.save(); X.globalAlpha = k0;
    ctx.text(X, o.text, 540, y, { family: 'display', weight: 400, size, color: rgba(P.mut || P.ink, 0.18), stroke: { width: 6, color: rgba(P.ink, 0.55) } });
    const c = lay(X, 'lqf', Y => { ctx.text(Y, o.text, 540, y, { family: 'display', weight: 400, size, color: '#000' }); Y.globalCompositeOperation = 'source-in';
      const wave = (amp, f, ph, c2) => { Y.fillStyle = c2; Y.beginPath(); Y.moveTo(0, 1920); for (let x = 0; x <= 1080; x += 20) Y.lineTo(x, wl + amp * Math.sin(x * f + ph)); Y.lineTo(1080, 1920); Y.closePath(); Y.fill(); };
      wave(16, 0.012, -tt * 4 + 1.5, mixC(col, '#FFFFFF', 0.35)); Y.globalCompositeOperation = 'source-atop'; wave(14, 0.016, tt * 5, col);
      Y.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 18; i++) { const by = bot - ((tt * (60 + 60 * rnd(i, 1)) + rnd(i, 2) * 400) % 400); if (by < wl + 10) continue; Y.beginPath(); Y.arc(120 + rnd(i, 3) * 840, by, 4 + 7 * rnd(i, 4), 0, TAU); Y.fill(); } });
    putC(X, c, k0);
    if (o.label !== null) ctx.text(X, (o.label != null ? o.label + ' ' : '') + Math.round(lv * 100) + '%', 540, bot + 150, { family: 'num', weight: 800, size: 84, dir: o.label ? 'rtl' : 'ltr', color: P.ink, maxWidth: 900 });
    X.restore();
  };

  /* 183 ميكروفون البودكاست — مايك بالنص، موجة صوت حيّة على الجنبين، ولمبة «على الهواء» ترمش. o: {s, y=860, label, onAir='ON AIR', out} */
  FX.podcastMic = (ctx, t, o) => {
    const { X, P, at } = ctx, y = pick(o, 'y', 860), ko = fout(ctx, t, o, 0.4), k = at(t, o.s, o.s + 0.5, 'backOut') * (1 - ko); if (k <= ON) return;
    const live = at(t, o.s + 0.3, o.s + 0.7) * (1 - ko);
    X.save(); X.globalAlpha = Math.min(1, k);
    for (let i = 0; i < 18; i++) { const a = fakeAmp(t, i, 3) * live, h = 20 + 230 * a * (1 - i / 22), w = 16; [-1, 1].forEach(sd => { const xx = 540 + sd * (190 + i * 30); X.fillStyle = i % 3 ? P.acc : (P.hi || P.acc); X.globalAlpha = Math.min(1, k) * (1 - i / 20);
      X.beginPath(); X.roundRect(xx - w / 2, y - h / 2, w, h, w / 2); X.fill(); }); }
    X.globalAlpha = Math.min(1, k); X.translate(540, y); X.scale(k, k);
    const rp = ((t - o.s) % 1.2) / 1.2; X.strokeStyle = P.acc; X.globalAlpha = (1 - rp) * 0.5 * live; X.lineWidth = 6; X.beginPath(); X.arc(0, -30, 150 + 60 * rp, 0, TAU); X.stroke(); X.globalAlpha = 1;
    X.fillStyle = P.ink; X.beginPath(); X.roundRect(-80, -210, 160, 290, 80); X.fill();
    X.strokeStyle = P.bg; X.globalAlpha = 0.35; X.lineWidth = 5; for (let j = 0; j < 6; j++) { X.beginPath(); X.moveTo(-58, -150 + j * 30); X.lineTo(58, -150 + j * 30); X.stroke(); } X.globalAlpha = 1;
    X.strokeStyle = P.ink; X.lineWidth = 16; X.lineCap = 'round'; X.beginPath(); X.arc(0, -10, 120, 0.1 * Math.PI, 0.9 * Math.PI); X.stroke();
    X.beginPath(); X.moveTo(0, 110); X.lineTo(0, 190); X.moveTo(-80, 195); X.lineTo(80, 195); X.stroke();
    X.restore();
    const ka = at(t, o.s + 0.4, o.s + 0.8, 'backOut') * (1 - ko); if (ka > ON) { X.save(); X.translate(540, y - 330); X.scale(ka, ka); const lab = o.onAir || 'ON AIR', w = textW(ctx, X, lab, 'num', 800, 46) + 110;
      X.fillStyle = P.ink; X.beginPath(); X.roundRect(-w / 2, -40, w, 80, 40); X.fill(); const bl = Math.floor((t - o.s) * 2) % 2 === 0 ? 1 : 0.35;
      X.fillStyle = P.acc; X.globalAlpha = bl; X.shadowColor = P.acc; X.shadowBlur = 20 * bl; X.beginPath(); X.arc(-w / 2 + 42, 0, 14, 0, TAU); X.fill(); noShd(X); X.globalAlpha = 1;
      ctx.text(X, lab, 20, 16, { family: 'num', weight: 800, size: 46, dir: 'ltr', color: P.bg }); X.restore(); }
    if (o.label) ctx.text(X, o.label, 540, y + 330, { family: 'display', weight: 400, size: 96, color: P.ink, alpha: at(t, o.s + 0.5, o.s + 0.9) * (1 - ko), maxWidth: 900 });
  };

  /* 184 معادل دايري — 64 عمود صوت حول دايرة تنبض على إيقاع وهمي (بلا صوت حقيقي)، وبالنص كلمة. o: {s, text, x=540, y=900, r=200, out} */
  FX.radialEq = (ctx, t, o) => {
    const { X, P, at } = ctx, x = pick(o, 'x', 540), y = pick(o, 'y', 900), r = o.r || 200, ko = fout(ctx, t, o, 0.4), k = at(t, o.s, o.s + 0.6, 'expoOut') * (1 - ko); if (k <= 0) return;
    const N = 64, beat = Math.pow(1 - (((t - o.s) * 2) % 1), 4);
    X.save(); X.translate(x, y); X.rotate((t - o.s) * 0.15); X.lineCap = 'round';
    for (let i = 0; i < N; i++) { const sym = i < N / 2 ? i : N - 1 - i, a = i / N * TAU, h = (30 + 220 * fakeAmp(t, sym, 8)) * k;
      X.strokeStyle = i % 2 ? P.acc : (P.hi || P.acc); X.lineWidth = 12; X.beginPath(); X.moveTo(Math.cos(a) * (r + 18), Math.sin(a) * (r + 18)); X.lineTo(Math.cos(a) * (r + 18 + h), Math.sin(a) * (r + 18 + h)); X.stroke(); }
    X.restore();
    X.save(); X.translate(x, y); const s = k * (1 + 0.05 * beat); X.scale(s, s); X.fillStyle = P.ink; X.beginPath(); X.arc(0, 0, r, 0, TAU); X.fill();
    X.strokeStyle = P.acc; X.lineWidth = 6; X.beginPath(); X.arc(0, 0, r - 18, 0, TAU); X.stroke();
    if (o.text) ctx.text(X, o.text, 0, r * 0.2, { family: 'display', weight: 400, size: r * 0.55, color: P.bg, maxWidth: r * 1.6 }); X.restore();
  };

  /* 185 الساعة تلف — ساعة حائط، عقرب الدقايق يلف بسرعة (بأثر حركة) والساعات معاه لين الوقت المطلوب، ثم رنّة. «بعد 3 ساعات…». o: {from=9, to=12 (ساعات), s, dur=1.6, y=880, label, out} */
  FX.clockSpin = (ctx, t, o) => {
    const { X, P, at, E } = ctx, y = pick(o, 'y', 880), f = pick(o, 'from', 9), to = pick(o, 'to', 12), d = o.dur || 1.6, ko = fout(ctx, t, o, 0.4), R = 300;
    const k0 = at(t, o.s - 0.4, o.s, 'backOut') * (1 - ko); if (k0 <= ON) return;
    const p = E.cubicInOut(pr(t, o.s + 0.2, o.s + 0.2 + d)), hrs = lerp(f, to, p), mA = hrs * TAU - Math.PI / 2, hA = hrs / 12 * TAU - Math.PI / 2, vel = Math.abs(to - f) * TAU / d * Math.sin(Math.PI * p);
    const ding = pr(t, o.s + 0.2 + d, o.s + 0.8 + d), shake = ding > 0 && ding < 1 ? Math.sin(ding * 60) * 0.05 * (1 - ding) : 0;
    X.save(); X.translate(540, y); X.scale(k0, k0); X.rotate(shake);
    shd(X, 40, 16, 0.25); X.fillStyle = lighter(P.bg, '#FFFFFF'); X.beginPath(); X.arc(0, 0, R, 0, TAU); X.fill(); noShd(X);
    X.strokeStyle = P.ink; X.lineWidth = 18; X.stroke();
    for (let i = 0; i < 60; i++) { const a = i / 60 * TAU, big = i % 5 === 0; X.strokeStyle = big ? P.ink : rgba(P.ink, 0.35); X.lineWidth = big ? 8 : 3; X.beginPath(); X.moveTo(Math.cos(a) * (R - 30), Math.sin(a) * (R - 30)); X.lineTo(Math.cos(a) * (R - (big ? 62 : 44)), Math.sin(a) * (R - (big ? 62 : 44))); X.stroke(); }
    [[12, 0, -1], [3, 1, 0], [6, 0, 1], [9, -1, 0]].forEach(([nn, dx, dy]) => ctx.text(X, String(nn), dx * (R - 105), dy * (R - 105) + 22, { family: 'num', weight: 800, size: 60, dir: 'ltr', color: P.ink }));
    if (vel > 2) { X.save(); X.globalAlpha = Math.min(0.45, vel / 40); X.fillStyle = P.acc; X.beginPath(); X.moveTo(0, 0); X.arc(0, 0, R - 70, mA - Math.min(2.5, vel * 0.06), mA); X.closePath(); X.fill(); X.restore(); }
    X.lineCap = 'round'; X.strokeStyle = P.ink; X.lineWidth = 20; X.beginPath(); X.moveTo(0, 0); X.lineTo(Math.cos(hA) * R * 0.5, Math.sin(hA) * R * 0.5); X.stroke();
    X.strokeStyle = P.acc; X.lineWidth = 12; X.beginPath(); X.moveTo(-Math.cos(mA) * 30, -Math.sin(mA) * 30); X.lineTo(Math.cos(mA) * (R - 70), Math.sin(mA) * (R - 70)); X.stroke();
    X.fillStyle = P.ink; X.beginPath(); X.arc(0, 0, 22, 0, TAU); X.fill(); X.fillStyle = P.acc; X.beginPath(); X.arc(0, 0, 9, 0, TAU); X.fill();
    X.restore();
    if (ding > 0 && ding < 1) { X.save(); X.globalAlpha = (1 - ding) * (1 - ko); X.strokeStyle = P.acc; X.lineWidth = 10 * (1 - ding); [0, 0.15].forEach(dl => { const q = pr(ding, dl, 1); X.beginPath(); X.arc(540, y, R * (1.05 + 0.4 * q), 0, TAU); X.stroke(); }); X.restore(); }
    const h = Math.floor(hrs + 1e-6) % 12 || 12, mi = Math.floor((hrs % 1) * 60 + 1e-6); ctx.text(X, `${h}:${String(mi).padStart(2, '0')}`, 540, y + R + 130, { family: 'num', weight: 900, size: 100, dir: 'ltr', color: p >= 1 ? P.acc : P.ink, alpha: k0 });
    if (o.label) ctx.text(X, o.label, 540, y - R - 70, { family: 'display', weight: 400, size: 90, color: P.ink, alpha: at(t, o.s + 0.2 + d, o.s + 0.6 + d, 'expoOut') * (1 - ko), maxWidth: 900 });
  };

  /* 186 تقويم ينشق — تقويم مكتبي، الأوراق تنشق وتطير يوم ورا يوم لين اليوم المطلوب، وينحط حوله دايرة. o: {from=24, to=27, month='رمضان', s, every=.4, y=900, out} */
  FX.calendarTear = (ctx, t, o) => {
    const { X, P, at, E } = ctx, f = o.from == null ? 24 : +o.from, to = o.to == null ? 27 : +o.to, y = pick(o, 'y', 900), ev = o.every || 0.4, ko = fout(ctx, t, o, 0.4), cnt = Math.max(0, to - f);
    const k0 = at(t, o.s - 0.4, o.s, 'backOut') * (1 - ko); if (k0 <= ON) return;
    const W = 600, H = 680, x0 = 540 - W / 2, y0 = y - H / 2, paper = lighter(P.bg, '#FFFFFF');
    const page = (day, rot, dx, dy, al, curl) => { X.save(); X.globalAlpha *= al; X.translate(x0 + dx, y0 + 150 + dy); X.rotate(rot); X.fillStyle = paper; X.beginPath(); X.moveTo(0, 0);
      for (let i = 0; i <= 12; i++) X.lineTo(i * W / 12, (i % 2) * 10); X.lineTo(W, H - 150); X.lineTo(0, H - 150); X.closePath(); if (curl) { shd(X, 30, 20, 0.25); } X.fill(); noShd(X);
      ctx.text(X, String(day), W / 2, 360, { family: 'num', weight: 900, size: 300, dir: 'ltr', color: P.ink }); X.restore(); };
    X.save(); X.translate(540, y); X.scale(k0, k0); X.translate(-540, -y);
    shd(X, 50, 20, 0.25); X.fillStyle = paper; X.beginPath(); X.roundRect(x0, y0, W, H, 30); X.fill(); noShd(X);
    X.save(); X.beginPath(); X.roundRect(x0, y0, W, H, 30); X.clip(); X.fillStyle = P.acc; X.fillRect(x0, y0, W, 150); X.restore();
    ctx.text(X, o.month || 'رمضان', 540, y0 + 105, { family: 'display', weight: 400, size: 84, color: onAcc(P), maxWidth: W - 80 });
    [x0 + 130, x0 + W - 130].forEach(rx => { X.fillStyle = P.ink; X.beginPath(); X.roundRect(rx - 14, y0 - 34, 28, 70, 14); X.fill(); });
    let cur = 0; for (let i = 0; i < cnt; i++) if (t >= o.s + 0.3 + i * ev) cur = i + 1;
    page(Math.min(to, f + cur + 0), 0, 0, 0, 1, false);
    if (cur < cnt) page(f + cur, 0, 0, 0, 1, false);
    for (let i = 0; i < cnt; i++) { const u = pr(t, o.s + 0.3 + i * ev, o.s + 0.3 + i * ev + 0.75); if (u <= 0 || u >= 1) continue; const e = E.cubicIn(u);
      page(f + i, -0.5 * e - 0.15 * Math.sin(u * 6), -260 * e, -120 * Math.sin(Math.PI * u) + 900 * e * e, 1 - pr(u, 0.6, 1), true); }
    const fin = o.s + 0.3 + cnt * ev + 0.2, kc = at(t, fin, fin + 0.55, 'cubicInOut');
    if (kc > 0) { const pts = []; for (let i = 0; i <= 40; i++) { const a = -0.6 + i / 40 * (TAU + 0.5), rr = 200 + 14 * Math.sin(i * 0.9); pts.push([540 + Math.cos(a) * rr * 1.1, y0 + 150 + 255 + Math.sin(a) * rr * 0.75]); }
      ctx.drawPath(X, pts, kc, { width: 12, color: P.acc, cap: 'round', smooth: true }); }
    X.restore();
  };

  /* 187 خط المشوار — خريطة مبسطة، دبوسين ينزلون، خط مشوار منقّط ينرسم ونقطة تمشي عليه، وملصق المسافة. o: {s, from='البيت', to='الدوام', note='15 دقيقة', dur=1.4, out} */
  FX.routeLine = (ctx, t, o) => {
    const { X, P, at, E } = ctx, ko = fout(ctx, t, o, 0.4), k0 = at(t, o.s - 0.4, o.s, 'expoOut') * (1 - ko); if (k0 <= 0) return;
    const R = { x: 80, y: 360, w: 920, h: 1080 }, A = [760, 580], B = [320, 1170], C1 = [300, 520], C2 = [820, 1100], d = o.dur || 1.4;
    const bz = u => { const a = (1 - u) ** 3, b = 3 * u * (1 - u) ** 2, c = 3 * u * u * (1 - u), e = u ** 3; return [a * A[0] + b * C1[0] + c * C2[0] + e * B[0], a * A[1] + b * C1[1] + c * C2[1] + e * B[1]]; };
    X.save(); X.globalAlpha = k0; X.translate(0, 60 * (1 - k0));
    shd(X, 40, 16, 0.2); X.fillStyle = mixC(P.bg, '#FFFFFF', 0.5); X.beginPath(); X.roundRect(R.x, R.y, R.w, R.h, 44); X.fill(); noShd(X);
    X.save(); X.beginPath(); X.roundRect(R.x, R.y, R.w, R.h, 44); X.clip();
    X.fillStyle = rgba(P.acc, 0.1); [[250, 520, 260], [880, 900, 300], [420, 1350, 240], [700, 430, 150]].forEach(([cx, cy, r], i) => { X.beginPath(); for (let j = 0; j <= 40; j++) { const a = j / 40 * TAU, rr = r * (1 + 0.18 * n1(a * 2 + i, 30 + i)); j ? X.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : X.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } X.fill(); });
    X.strokeStyle = rgba(P.ink, 0.07); X.lineWidth = 3; for (let g = R.x; g < R.x + R.w; g += 90) { X.beginPath(); X.moveTo(g, R.y); X.lineTo(g, R.y + R.h); X.stroke(); } for (let g = R.y; g < R.y + R.h; g += 90) { X.beginPath(); X.moveTo(R.x, g); X.lineTo(R.x + R.w, g); X.stroke(); }
    X.strokeStyle = rgba(P.ink, 0.12); X.lineWidth = 26; X.beginPath(); X.moveTo(R.x, 860); X.bezierCurveTo(400, 760, 700, 980, R.x + R.w, 820); X.stroke();
    X.restore();
    const pts = []; for (let i = 0; i <= 60; i++) pts.push(bz(i / 60));
    X.save(); X.setLineDash([2, 28]); X.lineCap = 'round'; X.lineWidth = 12; X.strokeStyle = rgba(P.ink, 0.4); poly(X, pts); X.beginPath(); pts.forEach((p, i) => (i ? X.lineTo(p[0], p[1]) : X.moveTo(p[0], p[1]))); X.stroke(); X.restore();
    const kr = at(t, o.s + 0.6, o.s + 0.6 + d, 'cubicInOut');
    if (kr > 0) { ctx.drawPath(X, pts, kr, { width: 14, color: P.acc, cap: 'round', smooth: false }); const p = bz(kr), q = bz(Math.min(1, kr + 0.01)), an = Math.atan2(q[1] - p[1], q[0] - p[0]);
      if (kr < 1) { X.save(); X.translate(p[0], p[1]); X.rotate(an); X.fillStyle = P.ink; X.beginPath(); X.arc(0, 0, 30, 0, TAU); X.fill(); X.fillStyle = P.bg; X.beginPath(); X.moveTo(16, 0); X.lineTo(-10, -12); X.lineTo(-5, 0); X.lineTo(-10, 12); X.closePath(); X.fill(); X.restore(); } }
    const pin = (p, ts, lab) => { const k = at(t, ts, ts + 0.5, 'bounceOut'); if (k <= 0) return; X.save(); X.translate(p[0], p[1] - 400 * (1 - k));
      X.fillStyle = rgba('#000', 0.18); X.beginPath(); X.ellipse(0, 400 * (1 - k) + 6, 30 * k, 10 * k, 0, 0, TAU); X.fill();
      X.fillStyle = P.acc; X.beginPath(); X.moveTo(0, 0); X.bezierCurveTo(-30, -40, -55, -70, -55, -105); X.arc(0, -105, 55, Math.PI, 0); X.bezierCurveTo(55, -70, 30, -40, 0, 0); X.fill();
      X.fillStyle = onAcc(P); X.beginPath(); X.arc(0, -105, 22, 0, TAU); X.fill(); X.restore();
      if (lab) { const kl = at(t, ts + 0.3, ts + 0.6, 'backOut'); if (kl > ON) { X.save(); X.translate(p[0], p[1] + 60); X.scale(kl, kl); const w = textW(ctx, X, lab, 'body', 700, 44) + 50; X.fillStyle = P.ink; X.beginPath(); X.roundRect(-w / 2, -32, w, 64, 32); X.fill(); ctx.text(X, lab, 0, 15, { family: 'body', weight: 700, size: 44, color: P.bg }); X.restore(); } } };
    pin(A, o.s + 0.1, o.from || 'البيت'); pin(B, o.s + 0.6 + d - 0.15, o.to || 'الدوام');
    if (o.note !== null) { const kn = at(t, o.s + 0.8 + d, o.s + 1.2 + d, 'backOut'); if (kn > ON) { const m = bz(0.5); X.save(); X.translate(m[0] + 40, m[1] - 80); X.rotate(-0.06); X.scale(kn, kn); const lab = o.note || '15 دقيقة', w = textW(ctx, X, lab, 'body', 700, 54) + 70;
      shd(X, 20, 8, 0.2); X.fillStyle = P.acc; X.beginPath(); X.roundRect(-w / 2, -48, w, 96, 48); X.fill(); noShd(X); ctx.text(X, lab, 0, 18, { family: 'body', weight: 700, size: 54, color: onAcc(P) }); X.restore(); } }
    X.restore();
  };

  /* 188 ظرف ينفتح — ظرف يطلع من تحت، الختم ينط، الغطا ينفتح، وبطاقة الرسالة تطلع منه وتكبر (دعوة، إعلان، مفاجأة). o: {text, s, y=1000, color=P.acc, out} */
  FX.envelopeOpen = (ctx, t, o) => {
    const { X, P, at, E } = ctx, y = pick(o, 'y', 1000), col = o.color || P.acc, ko = fout(ctx, t, o, 0.4), dt = t - o.s; if (dt < 0 || ko >= 1) return;
    const W = 760, H = 480, ki = at(t, o.s, o.s + 0.5, 'expoOut'), kseal = at(t, o.s + 0.55, o.s + 0.8, 'cubicIn'), kf = at(t, o.s + 0.75, o.s + 1.15, 'cubicInOut'), kc = at(t, o.s + 1.1, o.s + 1.8, 'expoOut'), kd = at(t, o.s + 1.6, o.s + 2.2, 'expoIn');
    const ey = y + 900 * (1 - ki) + 1100 * kd, top = ey - H / 2, paper = lighter(P.bg, '#FFFFFF'), inside = mixC(col, '#000000', 0.35), front = mixC(col, '#FFFFFF', 0.08), side = mixC(col, '#000000', 0.12);
    X.save(); X.globalAlpha = 1 - ko;
    const fy = top + (H * 0.55) * Math.cos(Math.PI * kf), flapFront = kf < 0.5;
    if (kd < 1) { shd(X, 40, 18, 0.25); X.fillStyle = inside; X.fillRect(540 - W / 2, top, W, H); noShd(X); if (!flapFront) { X.fillStyle = side; poly(X, [[540 - W / 2, top], [540 + W / 2, top], [540, fy]]); X.fill(); } }
    if (kc > 0) { const cw = W - 80, ch = 560, cy = lerp(top + 40 + ch / 2, y - 330, kc) , cs = lerp(0.92, 1.12, kc), out = kc > 0.35 || kd > 0;
      X.save(); if (!out) { X.beginPath(); X.rect(0, 0, 1080, ey + H / 2); X.clip(); } X.translate(540, cy); X.scale(cs, cs); X.rotate(-0.03 * kc); shd(X, 30, 14, 0.2);
      X.fillStyle = paper; X.beginPath(); X.roundRect(-cw / 2, -ch / 2, cw, ch, 24); X.fill(); noShd(X); X.strokeStyle = rgba(col, 0.5); X.lineWidth = 4; X.setLineDash([12, 10]); X.beginPath(); X.roundRect(-cw / 2 + 24, -ch / 2 + 24, cw - 48, ch - 48, 14); X.stroke(); X.setLineDash([]);
      const L = ctx.text.layout(X, o.text || '', { family: 'display', weight: 400, size: 92, maxWidth: cw - 120, lineHeight: 1.2 }); ctx.text.drawLayout(X, L, 0, -L.height / 2 + 92 * 0.78, { color: P.ink, perWord: i => ({ alpha: at(t, o.s + 1.4 + i * 0.08, o.s + 1.7 + i * 0.08) }) });
      X.restore(); }
    if (kd < 1) { X.fillStyle = front; poly(X, [[540 - W / 2, top], [540, ey + 40], [540 + W / 2, top], [540 + W / 2, ey + H / 2], [540 - W / 2, ey + H / 2]]); X.fill();
      X.strokeStyle = rgba('#000000', 0.12); X.lineWidth = 3; X.beginPath(); X.moveTo(540 - W / 2, ey + H / 2); X.lineTo(540, ey + 40); X.lineTo(540 + W / 2, ey + H / 2); X.stroke();
      if (flapFront) { X.fillStyle = side; poly(X, [[540 - W / 2, top], [540 + W / 2, top], [540, fy]]); X.fill(); X.strokeStyle = rgba('#000000', 0.15); X.stroke();
        if (kseal < 1) { X.save(); X.translate(540, fy - 10 - 400 * kseal * kseal); X.rotate(kseal * 3); const s = 1 + 0.3 * Math.sin(Math.PI * at(t, o.s + 0.35, o.s + 0.55)); X.scale(s, s); X.globalAlpha *= 1 - kseal;
          X.fillStyle = mixC(col, '#000000', 0.5); star8(X, 0, 0, 52, 0); X.fill(); X.fillStyle = mixC(col, '#000000', 0.3); X.beginPath(); X.arc(0, 0, 36, 0, TAU); X.fill(); X.fillStyle = rgba('#FFFFFF', 0.5); heartPath(X, 0, 2, 34); X.fill(); X.restore(); } } }
    X.restore();
  };

  /* 189 شريط الراية — راية بأطراف مطوية تنفرد من النص للجنبين، والكلام يطلع عليها. o: {text, s, y=900, size=84, color=P.acc, out} */
  FX.ribbonBanner = (ctx, t, o) => {
    const { X, P, at } = ctx, y = pick(o, 'y', 900), size = o.size || 84, col = o.color || P.acc, ko = fout(ctx, t, o, 0.4);
    const kw = at(t, o.s, o.s + 0.55, 'expoOut') * (1 - ko), kt = at(t, o.s + 0.35, o.s + 0.75, 'backOut') * (1 - ko), kx = at(t, o.s + 0.3, o.s + 0.7, 'expoOut') * (1 - ko); if (kw <= 0) return;
    const tw = Math.min(760, textW(ctx, X, o.text || '', 'display', 400, size)) + 120, W = tw * kw, H = 150, bend = 26, dark = mixC(col, '#000000', 0.35), mid = mixC(col, '#000000', 0.15);
    if (kx > 0) [-1, 1].forEach(sd => { const ex = 540 + sd * W / 2, tl = 190 * kx;
      X.fillStyle = mid; X.beginPath(); X.moveTo(ex - sd * 40, y - H / 2 + 40); X.lineTo(ex + sd * tl, y - H / 2 + 40); X.lineTo(ex + sd * (tl - 60), y + 40 / 2 + 40); X.lineTo(ex + sd * tl, y + H / 2 + 40); X.lineTo(ex - sd * 40, y + H / 2 + 40); X.closePath(); X.fill();
      X.fillStyle = dark; X.beginPath(); X.moveTo(ex, y + H / 2 - bend * 0.3); X.lineTo(ex - sd * 40, y + H / 2 + 40); X.lineTo(ex, y + H / 2 + 40); X.closePath(); X.fill(); });
    X.save(); shd(X, 30, 14, 0.2); X.fillStyle = col; X.beginPath(); X.moveTo(540 - W / 2, y - H / 2); X.quadraticCurveTo(540, y - H / 2 - bend, 540 + W / 2, y - H / 2); X.lineTo(540 + W / 2, y + H / 2); X.quadraticCurveTo(540, y + H / 2 - bend, 540 - W / 2, y + H / 2); X.closePath(); X.fill(); noShd(X);
    X.strokeStyle = rgba(onAcc(P), 0.45); X.lineWidth = 3; X.setLineDash([10, 10]); X.beginPath(); X.moveTo(540 - W / 2 + 20, y - H / 2 + 16); X.quadraticCurveTo(540, y - H / 2 - bend + 16, 540 + W / 2 - 20, y - H / 2 + 16); X.moveTo(540 - W / 2 + 20, y + H / 2 - 16); X.quadraticCurveTo(540, y + H / 2 - bend - 16, 540 + W / 2 - 20, y + H / 2 - 16); X.stroke(); X.setLineDash([]); X.restore();
    if (kt > ON && o.text) { X.save(); X.beginPath(); X.rect(540 - W / 2, y - H, W, H * 2); X.clip(); X.translate(540, y - bend * 0.4); X.scale(kt, kt); ctx.text(X, o.text, 0, size * 0.36, { family: 'display', weight: 400, size, color: onAcc(P), maxWidth: 760 }); X.restore(); }
  };

  /* 190 إطار مزخرف — إطار خطين ينرسم حول الشاشة من فوق للجنبين، وزخارف وردية بالزوايا ومعيّنات بنص الحواف. هادي. o: {s, inset=46, color=P.acc, dur=1.2, out} */
  FX.ornateFrame = (ctx, t, o) => {
    const { X, P, at } = ctx, m = pick(o, 'inset', 46), col = o.color || P.acc, ko = fout(ctx, t, o, 0.5), d = o.dur || 1.2; if (t < o.s) return;
    const k = at(t, o.s, o.s + d, 'cubicInOut'); X.save(); X.globalAlpha = 1 - ko;
    [[m, 7], [m + 22, 3]].forEach(([q, w]) => { const L = [[540, q], [q, q], [q, 1920 - q], [540, 1920 - q]], Rr = L.map(p => [1080 - p[0], p[1]]);
      ctx.drawPath(X, L, k, { width: w, color: col, cap: 'square', smooth: false }); ctx.drawPath(X, Rr, k, { width: w, color: col, cap: 'square', smooth: false }); });
    [[m, m, 0], [1080 - m, m, 1], [1080 - m, 1920 - m, 2], [m, 1920 - m, 3]].forEach(([cx, cy, i]) => { const kc = at(t, o.s + d * 0.5 + i * 0.08, o.s + d * 0.5 + i * 0.08 + 0.5, 'backOut'); if (kc <= ON) return;
      X.save(); X.translate(cx, cy); X.rotate(i * Math.PI / 2); X.scale(kc, kc);
      X.fillStyle = mixC(P.bg, '#FFFFFF', 0.3); star8(X, 0, 0, 62, 0); X.fill(); X.strokeStyle = col; X.lineWidth = 6; X.stroke();
      X.fillStyle = col; star8(X, 0, 0, 30, Math.PI / 8); X.fill();
      X.lineWidth = 4; [100, 135].forEach(rr => { X.beginPath(); X.arc(0, 0, rr, 0.12, Math.PI / 2 - 0.12); X.stroke(); });
      for (let j = 0; j < 3; j++) { const a = (j + 1) * Math.PI / 8; X.beginPath(); X.ellipse(Math.cos(a) * 170, Math.sin(a) * 170, 22, 9, a, 0, TAU); X.fill(); }
      X.restore(); });
    [[540, m], [540, 1920 - m], [m, 960], [1080 - m, 960]].forEach(([cx, cy], i) => { const kd = at(t, o.s + d * 0.8, o.s + d * 0.8 + 0.4, 'backOut'); if (kd <= ON) return;
      X.save(); X.translate(cx, cy); X.rotate(Math.PI / 4); X.scale(kd, kd); X.fillStyle = col; X.fillRect(-20, -20, 40, 40); X.fillStyle = mixC(P.bg, '#FFFFFF', 0.3); X.fillRect(-9, -9, 18, 18); X.restore(); });
    X.restore();
  };

  /* 191 إطار رمضان والعيد — قوس إسلامي ينرسم حول المحتوى، فوانيس تنزل على خيوط وتتمرجح، وهلال ونجوم تلمع. o: {s, title, color=P.acc, out} */
  FX.lanternFrame = (ctx, t, o) => {
    const { X, P, at } = ctx, col = o.color || P.acc, ko = fout(ctx, t, o, 0.6), dt = t - o.s; if (dt < 0) return;
    const gold = '#E9B44C', glass = '#FFD98A';
    X.save(); X.globalAlpha = 1 - ko;
    const ka = at(t, o.s, o.s + 1.4, 'cubicInOut'), arch = q => { const L = 90 + q, Rr = 990 - q, top = 210 + q, sp = 640; return [[L, 1560 - q * 0.3], [L, sp], [L + 40, sp - 170], [L + 170, sp - 330], [540, top], [Rr - 170, sp - 330], [Rr - 40, sp - 170], [Rr, sp], [Rr, 1560 - q * 0.3]]; };
    ctx.drawPath(X, arch(0), ka, { width: 8, color: col, cap: 'round', smooth: true }); ctx.drawPath(X, arch(26), ka, { width: 3, color: col, cap: 'round', smooth: true });
    const kb = at(t, o.s + 1.0, o.s + 1.4, 'backOut'); if (kb > ON) { X.save(); X.translate(540, 175); X.scale(kb, kb); X.fillStyle = col; star8(X, 0, 0, 34, 0); X.fill(); X.restore(); }
    const km = at(t, o.s + 0.4, o.s + 1.0, 'expoOut'); if (km > 0) { X.save(); X.globalAlpha *= km; X.translate(540, 470 - 30 * (1 - km)); X.save(); X.beginPath(); X.rect(-200, -200, 400, 400); X.arc(28, -16, 68, 0, TAU, true); X.clip('evenodd');
      X.fillStyle = gold; X.beginPath(); X.arc(0, 0, 80, 0, TAU); X.fill(); X.restore(); X.restore(); }
    [[300, 300], [800, 380], [420, 560], [690, 260], [230, 700], [860, 640]].forEach(([sx, sy], i) => { const tw = 0.5 + 0.5 * Math.sin(dt * 3 + i * 1.7), k = at(t, o.s + 0.6 + i * 0.1, o.s + 0.9 + i * 0.1); if (k <= 0) return;
      X.save(); X.globalAlpha *= k * (0.5 + 0.5 * tw); X.fillStyle = gold; sparkle(X, sx, sy, 10 + 10 * tw, 0); X.fill(); X.restore(); });
    [[200, 300, 1.55, 0], [880, 420, 1.35, 0.25], [345, 170, 1.05, 0.45], [735, 200, 1.05, 0.6]].forEach(([lx, len, s, dl], i) => {
      const u = Math.max(0, dt - dl), drop = at(t, o.s + dl, o.s + dl + 0.9, 'bounceOut'), sw = 0.22 * Math.exp(-u * 0.9) * Math.sin(u * 3.2 + i) + 0.03 * Math.sin(dt * 1.4 + i);
      if (drop <= 0) return; X.save(); X.translate(lx, 0); X.rotate(sw); const L = len * drop;
      X.strokeStyle = rgba(P.ink, 0.6); X.lineWidth = 3; X.beginPath(); X.moveTo(0, 0); X.lineTo(0, L); X.stroke(); X.translate(0, L); X.scale(s, s);
      const g = X.createRadialGradient(0, 95, 5, 0, 95, 150); g.addColorStop(0, rgba(glass, 0.45 * (0.85 + 0.15 * Math.sin(dt * 7 + i)))); g.addColorStop(1, rgba(glass, 0)); X.fillStyle = g; X.beginPath(); X.arc(0, 95, 150, 0, TAU); X.fill();
      X.strokeStyle = gold; X.lineWidth = 5; X.beginPath(); X.arc(0, 8, 12, 0, TAU); X.stroke();
      X.fillStyle = gold; X.beginPath(); X.moveTo(-14, 20); X.lineTo(14, 20); X.lineTo(44, 48); X.lineTo(-44, 48); X.closePath(); X.fill();
      X.fillStyle = glass; X.beginPath(); X.moveTo(-40, 50); X.lineTo(40, 50); X.lineTo(56, 110); X.lineTo(36, 160); X.lineTo(-36, 160); X.lineTo(-56, 110); X.closePath(); X.fill();
      X.strokeStyle = gold; X.lineWidth = 5; X.stroke(); X.beginPath(); X.moveTo(0, 50); X.lineTo(0, 160); X.moveTo(-56, 110); X.lineTo(56, 110); X.stroke();
      X.fillStyle = gold; X.beginPath(); X.moveTo(-36, 162); X.lineTo(36, 162); X.lineTo(14, 186); X.lineTo(-14, 186); X.closePath(); X.fill(); X.beginPath(); X.arc(0, 196, 9, 0, TAU); X.fill();
      X.restore(); });
    if (o.title) { const k = at(t, o.s + 1.2, o.s + 1.7, 'expoOut'); ctx.text(X, o.title, 540, 1180 + 40 * (1 - k), { family: 'display', weight: 400, size: 130, color: col, alpha: k, maxWidth: 760 }); }
    X.restore();
  };

  /* 193 شاشة النهاية — خلفية غامقة، عنوان، خانتين فيديو (الحلقة الجاية/الأشهر) تدخل من الجنبين، ودايرة القناة. o: {s, title='شكراً للمشاهدة', slots:[(Y,R)=>{},...], labels=['الفيديو الجاي','الأكثر مشاهدة'], channel, out} */
  FX.endScreen = (ctx, t, o) => {
    const { X, P, at } = ctx, ko = fout(ctx, t, o, 0.4), kb = at(t, o.s, o.s + 0.5, 'cubicOut') * (1 - ko); if (kb <= 0) return;
    const bg = o.bg || darker(P.ink, P.bg), fg = lighter(P.ink, P.bg);
    X.save(); X.globalAlpha = kb; X.fillStyle = bg; X.fillRect(0, 0, 1080, 1920);
    X.strokeStyle = rgba(P.acc, 0.08); X.lineWidth = 2; for (let i = -10; i < 30; i++) { X.beginPath(); X.moveTo(i * 90 + ((t - o.s) * 20) % 90, 0); X.lineTo(i * 90 - 600 + ((t - o.s) * 20) % 90, 1920); X.stroke(); }
    X.restore();
    const kt = at(t, o.s + 0.2, o.s + 0.7, 'expoOut') * (1 - ko); ctx.text(X, o.title || 'شكراً للمشاهدة', 540, 300 + 40 * (1 - kt), { family: 'display', weight: 400, size: 104, color: fg, alpha: kt, maxWidth: 900 });
    const labs = o.labels || ['الفيديو الجاي', 'الأكثر مشاهدة'];
    [0, 1].forEach(i => { const k = at(t, o.s + 0.35 + i * 0.18, o.s + 0.95 + i * 0.18, 'backOut') * (1 - ko); if (k <= ON) return;
      const R = { x: 160, y: 400 + i * 480, w: 760, h: 428 }, dx = (i ? -1 : 1) * 900 * (1 - k);
      X.save(); X.translate(dx, 0); shd(X, 40, 16, 0.4); X.fillStyle = '#000'; X.beginPath(); X.roundRect(R.x, R.y, R.w, R.h, 28); X.fill(); noShd(X);
      X.save(); X.beginPath(); X.roundRect(R.x, R.y, R.w, R.h, 28); X.clip();
      if (o.slots && o.slots[i]) o.slots[i](X, R); else { const g = X.createLinearGradient(R.x, R.y, R.x + R.w, R.y + R.h); g.addColorStop(0, i ? P.clay || P.acc : P.acc); g.addColorStop(1, mixC(i ? P.acc : (P.hi || P.acc), '#000000', 0.3)); X.fillStyle = g; X.fillRect(R.x, R.y, R.w, R.h); }
      const sh = ((t - o.s) * 0.6 + i * 0.5) % 1.6; X.fillStyle = 'rgba(255,255,255,.12)'; X.beginPath(); X.moveTo(R.x + sh * 1200 - 300, R.y); X.lineTo(R.x + sh * 1200 - 200, R.y); X.lineTo(R.x + sh * 1200 - 400, R.y + R.h); X.lineTo(R.x + sh * 1200 - 500, R.y + R.h); X.fill();
      X.restore();
      const pp = 1 + 0.06 * Math.sin((t - o.s) * 5 + i); X.save(); X.translate(R.x + R.w / 2, R.y + R.h / 2); X.scale(pp, pp); X.fillStyle = 'rgba(0,0,0,.45)'; X.beginPath(); X.arc(0, 0, 70, 0, TAU); X.fill();
      X.fillStyle = '#FFFFFF'; X.beginPath(); X.moveTo(-22, -34); X.lineTo(38, 0); X.lineTo(-22, 34); X.closePath(); X.fill(); X.restore();
      X.strokeStyle = P.acc; X.lineWidth = 6; X.beginPath(); X.roundRect(R.x, R.y, R.w, R.h, 28); X.stroke();
      const lw = textW(ctx, X, labs[i] || '', 'body', 700, 40) + 50; X.fillStyle = P.acc; X.beginPath(); X.roundRect(R.x + R.w - lw - 20, R.y + 20, lw, 64, 32); X.fill();
      ctx.text(X, labs[i] || '', R.x + R.w - 20 - lw / 2, R.y + 64, { family: 'body', weight: 700, size: 40, color: onAcc(P) }); X.restore(); });
    const kc = at(t, o.s + 0.8, o.s + 1.2, 'backOut') * (1 - ko); if (kc > ON) { X.save(); X.translate(760, 1400); X.scale(kc, kc); X.rotate((t - o.s) * 0.5);
      X.strokeStyle = P.acc; X.lineWidth = 6; X.setLineDash([18, 12]); X.beginPath(); X.arc(0, 0, 82, 0, TAU); X.stroke(); X.setLineDash([]); X.rotate(-(t - o.s) * 0.5);
      X.fillStyle = mixC(P.acc, fg, 0.6); X.beginPath(); X.arc(0, 0, 66, 0, TAU); X.fill(); X.fillStyle = bg; X.beginPath(); X.arc(0, -14, 22, 0, TAU); X.fill(); X.beginPath(); X.arc(0, 52, 42, Math.PI, 0); X.fill(); X.restore();
      ctx.text(X, o.channel || 'قناتي', 650, 1420, { family: 'display', weight: 400, size: 72, align: 'right', color: fg, alpha: kc, maxWidth: 480 }); }
  };

  /* 194 صورة بولارويد — صورة بولارويد تطيح من فوق وتتمرجح وتستقر، الصورة «تتحمض» من غامق لواضح، والتعليق ينكتب. o: {s, draw (Y, R) يرسم الصورة, caption, y=880, out} */
  FX.polaroidDrop = (ctx, t, o) => {
    const { X, P, at, E } = ctx, y = pick(o, 'y', 880), dt = t - o.s, ko = fout(ctx, t, o, 0.4); if (dt < 0 || ko >= 1) return;
    const W = 640, H = 780, ph = 580, drop = E.bounceOut(pr(dt, 0, 0.7)), sp = E.spring ? E.spring({ stiffness: 90, damping: 7 })(dt) : 1, rot = lerp(-0.55, -0.06, Math.min(1.2, sp)) ;
    X.save(); X.globalAlpha = 1 - ko; X.translate(540, y - 1500 * (1 - drop)); X.rotate(rot);
    shd(X, 50, 24, 0.3); X.fillStyle = '#FBFAF6'; X.fillRect(-W / 2, -H / 2, W, H); noShd(X);
    const R = { x: -ph / 2, y: -H / 2 + 30, w: ph, h: ph };
    X.save(); X.beginPath(); X.rect(R.x, R.y, R.w, R.h); X.clip();
    if (o.draw) o.draw(X, R); else { const g = X.createLinearGradient(0, R.y, 0, R.y + R.h); g.addColorStop(0, P.hi || P.acc); g.addColorStop(1, P.acc); X.fillStyle = g; X.fillRect(R.x, R.y, R.w, R.h);
      X.fillStyle = '#FFF2D6'; X.beginPath(); X.arc(80, R.y + 200, 80, 0, TAU); X.fill(); X.fillStyle = mixC(P.acc, '#000', 0.35); X.beginPath(); X.moveTo(R.x, R.y + R.h); X.lineTo(R.x + 200, R.y + 330); X.lineTo(R.x + 360, R.y + 460); X.lineTo(R.x + 470, R.y + 380); X.lineTo(R.x + R.w, R.y + R.h); X.fill(); }
    const dev = 1 - at(t, o.s + 0.5, o.s + 2.3, 'sineInOut'); if (dev > 0) { X.fillStyle = `rgba(32,30,40,${(0.92 * dev).toFixed(3)})`; X.fillRect(R.x, R.y, R.w, R.h); X.fillStyle = `rgba(120,90,60,${(0.25 * Math.sin(Math.PI * dev)).toFixed(3)})`; X.fillRect(R.x, R.y, R.w, R.h); }
    X.restore();
    if (o.caption) { const kc = at(t, o.s + 1.0, o.s + 1.8, 'cubicInOut'), fam = 'Aref Ruqaa', cy = H / 2 - 70;
      X.save(); X.beginPath(); X.rect(W / 2 - 40 - (W - 80) * kc, cy - 70, (W - 80) * kc, 110); X.clip(); ctx.text(X, o.caption, 0, cy + 10, { family: fam, weight: 700, size: 64, color: '#2A2A33', maxWidth: W - 80 }); X.restore(); }
    X.restore();
  };

  /* 195 قصاصة بشريط لاصق — ورقة ملاحظة تنلزق على الشاشة، وقطع شريط لاصق (واشي) تنحط على زواياها وحدة ورا وحدة. o: {text, s, y=900, size=66, tape=P.hi, out} */
  FX.scrapTape = (ctx, t, o) => {
    const { X, P, at } = ctx, y = pick(o, 'y', 900), size = o.size || 66, ko = fout(ctx, t, o, 0.4), k = at(t, o.s, o.s + 0.3, 'backOut') * (1 - ko); if (k <= ON) return;
    const W = 780, H = 560, sl = 1 + 0.25 * (1 - at(t, o.s, o.s + 0.25, 'cubicOut')), tape = o.tape || P.hi || P.acc;
    X.save(); X.globalAlpha = Math.min(1, k * 1.5); X.translate(540, y); X.rotate(-0.035); X.scale(sl, sl);
    shd(X, 30, 14, 0.22); X.fillStyle = '#FFFDF4'; X.beginPath(); X.moveTo(-W / 2, -H / 2); for (let i = 0; i <= 20; i++) X.lineTo(-W / 2 + i * W / 20, -H / 2 + (rnd(i, 3) - 0.5) * 8); X.lineTo(W / 2, H / 2); X.lineTo(-W / 2, H / 2); X.closePath(); X.fill(); noShd(X);
    X.strokeStyle = rgba('#5A86C8', 0.25); X.lineWidth = 2; for (let yy = -H / 2 + 110; yy < H / 2 - 20; yy += 70) { X.beginPath(); X.moveTo(-W / 2 + 30, yy); X.lineTo(W / 2 - 30, yy); X.stroke(); }
    X.strokeStyle = rgba('#D9534F', 0.35); X.beginPath(); X.moveTo(W / 2 - 90, -H / 2 + 10); X.lineTo(W / 2 - 90, H / 2 - 10); X.stroke();
    const L = ctx.text.layout(X, o.text || '', { family: 'body', weight: 700, size, maxWidth: W - 200, lineHeight: 1.06 });
    ctx.text.drawLayout(X, L, -40, -L.height / 2 + size * 0.3, { color: '#24242C', perWord: i => ({ alpha: at(t, o.s + 0.25 + i * 0.07, o.s + 0.5 + i * 0.07) }) });
    [[-W / 2 + 40, -H / 2 + 6, -0.62, 0.35], [W / 2 - 40, -H / 2 + 6, 0.6, 0.55], [W / 2 - 60, H / 2 - 4, -0.5, 0.75]].forEach(([tx, ty, tr, dl], i) => {
      const kt = at(t, o.s + dl, o.s + dl + 0.22, 'cubicOut'); if (kt <= 0) return; const ts = 1 + 0.4 * (1 - kt), tw = 230, th = 70;
      X.save(); X.translate(tx, ty); X.rotate(tr); X.scale(ts, ts); X.globalAlpha = kt * 0.82; X.fillStyle = tape;
      X.beginPath(); X.moveTo(-tw / 2, -th / 2); for (let j = 0; j <= 7; j++) X.lineTo(-tw / 2 + (j % 2 ? 7 : 0), -th / 2 + j * th / 7); for (let j = 7; j >= 0; j--) X.lineTo(tw / 2 - (j % 2 ? 7 : 0), -th / 2 + j * th / 7); X.closePath(); X.fill();
      X.save(); X.clip(); X.globalAlpha = 0.25; X.fillStyle = '#FFFFFF'; for (let s = -tw; s < tw; s += 26) { X.beginPath(); X.moveTo(s, -th / 2); X.lineTo(s + 12, -th / 2); X.lineTo(s + 12 + 40, th / 2); X.lineTo(s + 40, th / 2); X.fill(); } X.restore(); X.restore(); });
    X.restore();
  };

  /* 196 فيلم قديم — المشهد يصير فيلم سينما قديم: سيبيا، رجفة الإطار، وميض، خدوش وغبار وفينيت. o: {s, draw, out, amount=1} */
  FX.oldFilm = (ctx, t, o) => {
    const { X, at } = ctx, a = at(t, o.s, o.s + 0.5, 'cubicOut') * (1 - fout(ctx, t, o, 0.5)) * pick(o, 'amount', 1);
    if (a <= 0) { o.draw(X); return; }
    const fr = Math.floor(t * 12), dx = (h2(fr, 1) - 0.5) * 8 * a, dy = (h2(fr, 2) - 0.5) * 14 * a;
    o.draw(X);
    X.save(); X.globalAlpha = a; X.translate(dx, dy); X.filter = 'sepia(0.9) saturate(0.75) contrast(1.15) brightness(0.88)'; X.translate(540, 960); X.scale(1.02, 1.02); X.translate(-540, -960); o.draw(X); X.restore();
    X.save(); X.globalAlpha = a; const fl = h2(fr, 3); X.fillStyle = fl > 0.5 ? `rgba(255,240,210,${(0.1 * (fl - 0.5)).toFixed(3)})` : `rgba(20,12,4,${(0.18 * (0.5 - fl)).toFixed(3)})`; X.fillRect(0, 0, 1080, 1920);
    for (let j = 0; j < 4; j++) if (h2(fr + j * 13, 4) > 0.55) { const x = h2(fr + j, 5) * 1080, w = 1 + 2 * h2(fr, j + 6); X.fillStyle = h2(fr, j + 9) > 0.5 ? 'rgba(255,250,235,.55)' : 'rgba(30,20,10,.5)'; X.beginPath(); X.moveTo(x, 0); X.lineTo(x + 20 * n1(fr * 0.3, j), 1920); X.lineTo(x + w + 20 * n1(fr * 0.3, j), 1920); X.lineTo(x + w, 0); X.fill(); }
    X.fillStyle = 'rgba(25,15,5,.7)'; for (let j = 0; j < 16; j++) { if (h2(fr, j + 40) < 0.5) continue; X.beginPath(); X.arc(h2(fr, j + 20) * 1080, h2(fr, j + 30) * 1920, 1.5 + 6 * h2(fr, j + 50) ** 2, 0, TAU); X.fill(); }
    const g = X.createRadialGradient(540, 960, 500, 540, 960, 1250); g.addColorStop(0, 'rgba(20,10,0,0)'); g.addColorStop(1, 'rgba(20,10,0,.75)'); X.fillStyle = g; X.fillRect(0, 0, 1080, 1920);
    X.restore();
  };

  /* 197 بطاقات تنقلب — بطاقة نصيحة بالنص تنقلب (ثلاثي الأبعاد) وتكشف اللي بعدها، مع رقم ومؤشر. o: {items[], s, every=1.3, y=900, out} */
  FX.flipCards = (ctx, t, o) => {
    const { X, P, at, E } = ctx, it = o.items || [], n = it.length, y = pick(o, 'y', 900), ev = o.every || 1.3, ko = fout(ctx, t, o, 0.4); if (!n) return;
    const k0 = at(t, o.s, o.s + 0.5, 'backOut') * (1 - ko); if (k0 <= ON) return;
    const W = 760, H = 900, R = { x: 540 - W / 2, y: y - H / 2 }, D = 2400;
    const face = (Y, i) => { const dark = i % 2 === 0, bg = dark ? P.ink : P.acc, fg = dark ? P.bg : onAcc(P);
      Y.fillStyle = bg; Y.beginPath(); Y.roundRect(R.x, R.y, W, H, 44); Y.fill();
      Y.fillStyle = dark ? P.acc : P.ink; Y.beginPath(); Y.arc(R.x + W - 110, R.y + 110, 62, 0, TAU); Y.fill(); ctx.text(Y, String(i + 1), R.x + W - 110, R.y + 136, { family: 'num', weight: 900, size: 76, dir: 'ltr', color: dark ? onAcc(P) : P.bg });
      const L = ctx.text.layout(Y, it[i] || '', { family: 'display', weight: 400, size: 96, maxWidth: W - 140, lineHeight: 1.2 }); ctx.text.drawLayout(Y, L, 540, y - L.height / 2 + 96 * 0.75, { color: fg });
      for (let j = 0; j < n; j++) { Y.fillStyle = j === i ? fg : rgba(fg === P.bg ? P.bg : '#FFFFFF', 0.3); Y.beginPath(); Y.arc(540 + (j - (n - 1) / 2) * 36, R.y + H - 70, j === i ? 11 : 8, 0, TAU); Y.fill(); } };
    let cur = 0, ph = 0; for (let i = 1; i < n; i++) { const p = E.cubicInOut(pr(t, o.s + i * ev, o.s + i * ev + 0.7)); if (p > 0) { cur = i - 1; ph = p; if (p >= 1) { cur = i; ph = 0; } } }
    X.save(); X.translate(540, y); X.scale(k0, k0); X.translate(-540, -y);
    for (let j = Math.min(2, n - 1 - cur); j >= 1; j--) { X.save(); X.translate(540, y); X.rotate(j * 0.04 * (j % 2 ? 1 : -1)); X.translate(-540 + j * 14, -y + j * 18); X.fillStyle = mixC(P.ink, P.bg, 0.3 + j * 0.2); X.beginPath(); X.roundRect(R.x, R.y, W, H, 44); X.fill(); X.restore(); }
    if (ph <= 0) { shd(X, 40, 20, 0.25); face(X, cur); noShd(X); X.restore(); return; }
    const th = Math.PI * ph, back = ph > 0.5, ang = back ? Math.PI - th : th, c = lay(X, 'fc', Y => face(Y, back ? cur + 1 : cur)), N = 60, lift = 1 - 0.1 * Math.sin(th);
    for (let i = 0; i < N; i++) { const pj = u => { const xp = u * W / 2 * Math.cos(ang), zp = u * W / 2 * Math.sin(ang) * (back ? -1 : 1), f = D / (D + zp) * lift; return [540 + xp * f, f]; };
      const [x0, f0] = pj(-1 + 2 * i / N), [x1, f1] = pj(-1 + 2 * (i + 1) / N), f = (f0 + f1) / 2; part(X, c, R.x + i * W / N, R.y, W / N, H, Math.min(x0, x1), y - H / 2 * f, Math.abs(x1 - x0) + 3, H * f); }
    X.restore();
  };

  /* 198 نبض القلب — شاشة جهاز نبض: خط ECG يمشي ويرسم نبضات، والكلمة فوقه تنبض مع كل دقة، ورقم النبض. o: {s, text, bpm=84, y=920, out} */
  FX.heartbeat = (ctx, t, o) => {
    const { X, P, at } = ctx, y = pick(o, 'y', 920), bpm = o.bpm || 84, per = 60 / bpm, ko = fout(ctx, t, o, 0.4), k0 = at(t, o.s, o.s + 0.45, 'expoOut') * (1 - ko); if (k0 <= 0) return;
    const R = { x: 80, y: y - 260, w: 920, h: 520 }, lt = Math.max(0, t - o.s), sweep = 2.2, speed = R.w / sweep;
    const ecg = ph => { ph = ((ph % 1) + 1) % 1; return 0.12 * Math.exp(-Math.pow((ph - 0.12) / 0.03, 2)) - 0.15 * Math.exp(-Math.pow((ph - 0.21) / 0.012, 2)) + Math.exp(-Math.pow((ph - 0.24) / 0.014, 2)) - 0.28 * Math.exp(-Math.pow((ph - 0.27) / 0.014, 2)) + 0.22 * Math.exp(-Math.pow((ph - 0.48) / 0.05, 2)); };
    X.save(); X.globalAlpha = k0; X.fillStyle = '#0F1513'; X.beginPath(); X.roundRect(R.x, R.y, R.w, R.h, 36); X.fill();
    X.save(); X.beginPath(); X.roundRect(R.x, R.y, R.w, R.h, 36); X.clip(); X.strokeStyle = rgba(P.acc, 0.12); X.lineWidth = 2;
    for (let gx = R.x; gx < R.x + R.w; gx += 46) { X.beginPath(); X.moveTo(gx, R.y); X.lineTo(gx, R.y + R.h); X.stroke(); } for (let gy = R.y; gy < R.y + R.h; gy += 46) { X.beginPath(); X.moveTo(R.x, gy); X.lineTo(R.x + R.w, gy); X.stroke(); }
    const hx = (lt * speed) % R.w, base = y + 80, amp = 210, line = o.color || P.acc;
    X.strokeStyle = line; X.lineWidth = 6; X.lineJoin = 'round'; X.shadowColor = line; X.shadowBlur = 16; X.beginPath(); let pen = false;
    for (let px = 0; px < R.w; px += 3) { const behind = px <= hx ? hx - px : hx - px + R.w; if (behind < 50 || lt * speed - behind < 0) { pen = false; continue; }
      const tt = lt - behind / speed, yy = base - amp * ecg(tt / per); pen ? X.lineTo(R.x + px, yy) : X.moveTo(R.x + px, yy); pen = true; }
    X.stroke(); noShd(X); const hy = base - amp * ecg(lt / per); X.fillStyle = '#FFFFFF'; X.shadowColor = line; X.shadowBlur = 24; X.beginPath(); X.arc(R.x + hx, hy, 9, 0, TAU); X.fill(); noShd(X);
    X.restore();
    const bp = Math.exp(-Math.pow(((lt / per - 0.24) % 1 + 1) % 1 * 6, 2)) + Math.exp(-Math.pow((1 - (((lt / per - 0.24) % 1 + 1) % 1)) * 6, 2));
    X.save(); X.translate(R.x + R.w - 120, R.y + 70); const hs = 1 + 0.2 * bp; X.scale(hs, hs); X.fillStyle = line; heartPath(X, 0, 0, 56); X.fill(); X.restore();
    ctx.text(X, String(bpm), R.x + R.w - 170, R.y + 88, { family: 'num', weight: 800, size: 60, align: 'right', dir: 'ltr', color: '#FFFFFF' });
    if (o.text) { X.save(); X.translate(540, R.y - 140); const s = 1 + 0.1 * bp; X.scale(s, s); ctx.text(X, o.text, 0, 45, { family: 'display', weight: 400, size: 130, color: P.ink, maxWidth: 900 }); X.restore(); }
    X.restore();
  };

  /* 199 ألعاب نارية — صواريخ تطلع بذيل وتنفجر كرات شرر ملوّنة تنزل وتلمع (للعيد والإنجازات). o: {s, bursts:[[x,y,dt],...], colors, out} */
  FX.fireworks = (ctx, t, o) => {
    const { X, P } = ctx, dt = t - o.s, ko = fout(ctx, t, o, 0.6); if (dt < 0) return;
    const bs = o.bursts || [[320, 560, 0.45], [780, 440, 0.9], [560, 820, 1.3], [230, 980, 1.7], [850, 900, 2.0]], cols = o.colors || [P.acc, P.hi || P.acc, '#F2B63C', '#FFFFFF', P.clay || P.acc];
    X.save(); X.globalAlpha = 1 - ko; X.lineCap = 'round';
    bs.forEach(([bx, by, tb], j) => { const lu = dt - (tb - 0.5); if (lu < 0) return;
      if (lu < 0.5) { const q = ctx.E.cubicOut(lu / 0.5), rx = bx + 30 * Math.sin(j), ry = lerp(1950, by, q); X.strokeStyle = '#FFE9B0'; X.lineWidth = 6; X.globalAlpha = 1 - ko; X.beginPath(); X.moveTo(rx, ry); X.lineTo(rx, ry + 90); X.stroke();
        X.fillStyle = '#FFF6DE'; X.beginPath(); X.arc(rx, ry, 8, 0, TAU); X.fill(); return; }
      const u = lu - 0.5, life = 1.7; if (u > life) return; const c1 = cols[j % cols.length], c2 = cols[(j + 2) % cols.length];
      const fl = 1 - pr(u, 0, 0.15); if (fl > 0) { X.globalAlpha = fl * (1 - ko); X.fillStyle = '#FFF6DE'; X.beginPath(); X.arc(bx, by, 60 * (1 - fl) + 30, 0, TAU); X.fill(); }
      for (let i = 0; i < 80; i++) { const a = i / 80 * TAU + rnd(i, j + 1) * 0.1, v = (j % 2 ? 640 : 820) * (0.7 + 0.3 * rnd(i, j + 2)), kk = 2.0, g = 260;
        const pos = w => { const e = (1 - Math.exp(-kk * w)) / kk; return [bx + Math.cos(a) * v * e, by + Math.sin(a) * v * e + 0.5 * g * w * w]; };
        const p1 = pos(u), p0 = pos(Math.max(0, u - 0.12)), q = 1 - u / life, tw = u > 1.0 ? (h2(i, Math.floor(t * 20)) > 0.5 ? 1 : 0.2) : 1;
        X.globalAlpha = Math.min(1, q * 1.5) * tw * (1 - ko); X.strokeStyle = i % 3 ? c1 : c2; X.lineWidth = 7 * q + 2; X.beginPath(); X.moveTo(p0[0], p0[1]); X.lineTo(p1[0], p1[1]); X.stroke(); } });
    X.restore();
  };

  /* ══════════ و) انتقالات أخيرة ══════════ */

  /* 192 مشربية — بابين مشربية (شبك نجوم هندسي) ينسكرون على A، وينفتحون على B. o: {s, dur=1.4, A, B, color=P.clay, cell=110} */
  FX.mashrabiya = (ctx, t, o) => {
    const { X, P, E } = ctx, k = pr(t, o.s, o.s + (o.dur || 1.4)), S = o.cell || 110, col = o.color || P.clay || P.acc;
    if (k <= 0) { o.A(X); return; } if (k >= 1) { o.B(X); return; }
    (k < 0.5 ? o.A : o.B)(X);
    const c = k < 0.45 ? E.cubicInOut(k / 0.45) : k < 0.55 ? 1 : 1 - E.cubicInOut((k - 0.55) / 0.45); if (c <= 0) return;
    [-1, 1].forEach(sd => { const x0 = sd < 0 ? -540 + 540 * c : 1080 - 540 * c;
      X.save(); X.translate(x0, 0); shd(X, 40, 0, 0.35); X.shadowOffsetX = -sd * 16; X.fillStyle = col; X.beginPath(); X.rect(0, 0, 540, 1920);
      for (let r = 0; r <= Math.ceil(1920 / S); r++) for (let q = 0; q <= Math.ceil(540 / S); q++) { const cx = q * S + (sd < 0 ? 0 : 540 % S) , cy = r * S; star8(X, cx, cy, S * 0.38, Math.PI / 8, true); X.moveTo(cx + S / 2 + 10, cy + S / 2); X.arc(cx + S / 2, cy + S / 2, 10, 0, TAU); }
      X.fill('evenodd'); noShd(X);
      X.strokeStyle = mixC(col, '#000000', 0.35); X.lineWidth = 14; X.strokeRect(7, 7, 526, 1906); X.restore(); });
    if (c > 0.97) { X.save(); X.fillStyle = mixC(col, '#000000', 0.4); X.fillRect(534, 0, 12, 1920); X.restore(); }
  };

  /* 200 قفزة الضوء — نجوم تتمدد خطوط من النص (هايبر سبيس)، A ينسحب لقدّام، وميض، وB يطلع. o: {s, dur=1.1, A, B} */
  FX.warpSpeed = (ctx, t, o) => {
    const { X, E } = ctx, k = pr(t, o.s, o.s + (o.dur || 1.1));
    if (k <= 0) { o.A(X); return; } if (k >= 1) { o.B(X); return; }
    const z = k < 0.5 ? 1 + 0.7 * E.expoIn(k * 2) : 1 + 0.4 * (1 - E.expoOut((k - 0.5) * 2)), env = Math.pow(Math.sin(Math.PI * k), 0.7);
    X.save(); X.translate(540, 960); X.scale(z, z); X.translate(-540, -960); (k < 0.5 ? o.A : o.B)(X); X.restore();
    X.fillStyle = `rgba(6,6,14,${(0.6 * env).toFixed(3)})`; X.fillRect(0, 0, 1080, 1920);
    X.save(); X.lineCap = 'round';
    for (let i = 0; i < 160; i++) { const a = rnd(i, 1) * TAU, sp = 0.6 + rnd(i, 2), q = ((rnd(i, 3) + (t - o.s) * sp * 1.4) % 1), r = 30 + 1500 * q * q, L = r * 0.45 * env;
      X.globalAlpha = env * (0.4 + 0.6 * q); X.strokeStyle = i % 5 ? '#FFFFFF' : (ctx.P.hi || ctx.P.acc); X.lineWidth = 1.5 + 3.5 * q;
      X.beginPath(); X.moveTo(540 + Math.cos(a) * r, 960 + Math.sin(a) * r); X.lineTo(540 + Math.cos(a) * (r + L), 960 + Math.sin(a) * (r + L)); X.stroke(); }
    X.restore();
    const fl = 1 - Math.min(1, Math.abs(k - 0.5) / 0.08); if (fl > 0) { X.fillStyle = `rgba(255,255,255,${fl.toFixed(3)})`; X.fillRect(0, 0, 1080, 1920); }
  };
})();
