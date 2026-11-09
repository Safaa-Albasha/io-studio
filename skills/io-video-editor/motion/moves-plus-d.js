/* ═══ moves-plus-d.js — بنك الحركات 233–242 (I/O Studio) ═══
   نفس عقد motion/moves.js: كل حركة = FX.<اسم>(ctx, t, o) ترسم على ctx.X بإحداثيات التصميم (1080×1920)، كل خاصية من t (بلا تراكم ولا Math.random).
   o.s = بداية الحركة · o.out = بداية الطلعة (اختياري) · الألوان من ctx.P (bg ink acc clay hi mut onAcc) إلا لو مرّرت غيرها · الخط Cairo (family 'cairo').
   الكتالوج: motion/moves/catalog-plus-d.json · المعاينات: previews/233–242.mp4 (motion/moves/render-preview-d.js) · الشرح: references/moves.md
   أفكار الريلز (خطة ٩ نوفمبر §٥) — تصميم أصلي بكودنا، بلا شعارات أو أسماء منصات حقيقية:
     233–235 شخصية كرتونية بصورة أي شخص (الوجه بدائرة على جسم كرتوني: تلوّح/تتكلم · تأشّر · تعرض كرت)
     236–240 قوالب واجهات تنبني من نص (جدول أسعار · شاشة تطبيق · بطاقة منشور · بطاقة مستودع · إشعارات)
     241 منحنى البقاء المتحرك من أرقام الإحصائيات · 242 كرت «اكتب كلمة بالتعليقات ← يوصلك بالخاص»
   أدوات للمشاهد والاختبارات: FX.retentionPoints(input, dur) · FX.retentionDrops(points, n, min) · FX.toonPhoto(ctx, X, photo, x, y, r, o) */
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
  const ioC = k => { k = cl(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
  const h2 = (a, b) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const hexRGB = h => { const c = String(h || '#000').replace('#', ''), f = c.length === 3 ? c.split('').map(x => x + x).join('') : c; return [0, 2, 4].map(j => parseInt(f.slice(j, j + 2), 16) || 0); };
  const rgba = (h, a) => { if (!/^#/.test(String(h))) return h; const [r, g, b] = hexRGB(h); return `rgba(${r},${g},${b},${a})`; };
  const mixC = (a, b, k) => { if (!/^#/.test(String(a)) || !/^#/.test(String(b))) return a; const A = hexRGB(a), B = hexRGB(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], cl(k))).toString(16).padStart(2, '0')).join(''); };
  const lum = h => { const c = hexRGB(h); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const onAcc = P => P.onAcc || (lum(P.acc) > 165 ? '#16171A' : '#FFFFFF');
  const surf = P => (lum(P.bg) < 110 ? mixC(P.bg, '#FFFFFF', 0.1) : mixC(P.bg, '#FFFFFF', 0.82));   // لون البطاقة: أفتح من الخلفية (أو أغمق شوي بالثيم الغامق)
  const shd = (X, b, y, a) => { X.shadowColor = 'rgba(0,0,0,' + (a == null ? 0.2 : a) + ')'; X.shadowBlur = b; X.shadowOffsetY = y; X.shadowOffsetX = 0; };
  const noShd = X => { X.shadowColor = 'transparent'; X.shadowBlur = 0; X.shadowOffsetY = 0; };
  const fout = (ctx, t, o, d = 0.45) => (o.out != null ? ctx.at(t, o.out, o.out + d, 'cubicIn') : 0);
  const rr = (X, x, y, w, h, r) => { X.beginPath(); X.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); };
  const T = (ctx, X, s, x, y, size, opt) => ctx.text(X, String(s), x, y, Object.assign({ family: FAM, weight: 700, size }, opt || {}));
  const tw = (ctx, X, s, size, w) => { X.save(); X.font = ctx.font(FAM, w || 700, size); const v = X.measureText(String(s)).width; X.restore(); return v; };
  const ar = s => /[؀-ۿ]/.test(String(s));
  const ltr = s => '\u2066' + s + '\u2069';   // رقم/نسبة/وقت داخل جملة عربية: يبقى بترتيبه (عزل اتجاه)
  const initial = s => { const c = [...String(s || '').replace(/^@/, '').trim().replace(/^ال(?=\S\S)/, '')][0]; return c ? c.toUpperCase() : '•'; };
  const compact = (ctx, n) => (n >= 1e6 ? ctx.num(n / 1e6, n % 1e6 ? 1 : 0) + 'M' : n >= 1e4 ? ctx.num(n / 1e3, n % 1e3 >= 100 ? 1 : 0) + 'K' : ctx.num(n));
  /* سطور ملفوفة بكلمات كاملة (\n = سطر جديد) */
  const wrap = (ctx, X, str, size, w, maxW) => { X.save(); X.font = ctx.font(FAM, w, size); const out = [];
    String(str || '').split('\n').forEach(par => { let line = ''; par.split(/\s+/).filter(Boolean).forEach(word => { const tr = line ? line + ' ' + word : word; if (line && X.measureText(tr).width > maxW) { out.push(line); line = word; } else line = tr; }); out.push(line); });
    X.restore(); return out; };
  /* كتابة كلمة كلمة على سطور ملفوفة: n = عدد الكلمات الظاهرة */
  const drawWords = (ctx, X, lines, n, x, y, lh, size, w, color, align) => { let c = 0;
    lines.forEach((ln, i) => { const ws = ln.split(' ').filter(Boolean), k = Math.max(0, Math.min(ws.length, n - c)); c += ws.length; if (k > 0) T(ctx, X, ws.slice(0, k).join(' '), x, y + i * lh, size, { weight: w, color, align: align || 'right' }); }); };
  const imgOf = (ctx, p) => { if (!p) return null; if (typeof p === 'string') p = ctx.img ? ctx.img(p) : null; if (!p) return null;
    const w = p.naturalWidth || p.videoWidth || p.width, h = p.naturalHeight || p.videoHeight || p.height; if (!w || !h || p.complete === false) return null; return { img: p, w, h }; };

  /* ── أيقونات مرسومة (بلا شعارات) ── */
  const IC = {
    heart(X, x, y, s) { X.beginPath(); X.moveTo(x, y + s * 0.42); X.bezierCurveTo(x - s * 0.95, y - s * 0.2, x - s * 0.5, y - s * 0.95, x, y - s * 0.4); X.bezierCurveTo(x + s * 0.5, y - s * 0.95, x + s * 0.95, y - s * 0.2, x, y + s * 0.42); X.closePath(); },
    star(X, x, y, r) { X.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; i ? X.lineTo(x + q * Math.cos(a), y + q * Math.sin(a)) : X.moveTo(x + q * Math.cos(a), y + q * Math.sin(a)); } X.closePath(); },
    bubble(X, x, y, s) { X.beginPath(); X.ellipse(x, y - s * 0.06, s * 0.62, s * 0.48, 0, 0, TAU); X.moveTo(x - s * 0.3, y + s * 0.3); X.lineTo(x - s * 0.5, y + s * 0.62); X.lineTo(x - s * 0.02, y + s * 0.4); },
    repost(X, x, y, s) { X.beginPath(); X.moveTo(x - s * 0.55, y + s * 0.1); X.lineTo(x - s * 0.55, y - s * 0.3); X.lineTo(x + s * 0.4, y - s * 0.3); X.moveTo(x + s * 0.2, y - s * 0.5); X.lineTo(x + s * 0.42, y - s * 0.3); X.lineTo(x + s * 0.2, y - s * 0.1);
      X.moveTo(x + s * 0.55, y - s * 0.1); X.lineTo(x + s * 0.55, y + s * 0.3); X.lineTo(x - s * 0.4, y + s * 0.3); X.moveTo(x - s * 0.2, y + s * 0.5); X.lineTo(x - s * 0.42, y + s * 0.3); X.lineTo(x - s * 0.2, y + s * 0.1); },
    share(X, x, y, s) { X.beginPath(); X.moveTo(x, y + s * 0.2); X.lineTo(x, y - s * 0.55); X.moveTo(x - s * 0.28, y - s * 0.3); X.lineTo(x, y - s * 0.58); X.lineTo(x + s * 0.28, y - s * 0.3); X.moveTo(x - s * 0.5, y); X.lineTo(x - s * 0.5, y + s * 0.5); X.lineTo(x + s * 0.5, y + s * 0.5); X.lineTo(x + s * 0.5, y); },
    plane(X, x, y, s) { X.beginPath(); X.moveTo(x - s * 0.6, y - s * 0.05); X.lineTo(x + s * 0.6, y - s * 0.5); X.lineTo(x + s * 0.2, y + s * 0.55); X.lineTo(x + s * 0.02, y + s * 0.12); X.closePath(); },
    pin(X, x, y, s) { X.beginPath(); X.moveTo(x - s * 0.3, y - s * 0.55); X.lineTo(x + s * 0.3, y - s * 0.55); X.lineTo(x + s * 0.22, y - s * 0.1); X.lineTo(x + s * 0.42, y + s * 0.1); X.lineTo(x - s * 0.42, y + s * 0.1); X.lineTo(x - s * 0.22, y - s * 0.1); X.closePath(); X.moveTo(x, y + s * 0.1); X.lineTo(x, y + s * 0.6); },
    check(X, x, y, s) { X.beginPath(); X.moveTo(x - s * 0.42, y); X.lineTo(x - s * 0.12, y + s * 0.3); X.lineTo(x + s * 0.45, y - s * 0.32); },
    book(X, x, y, s) { X.beginPath(); X.roundRect(x - s * 0.45, y - s * 0.55, s * 0.9, s * 1.1, s * 0.12); X.moveTo(x - s * 0.45, y + s * 0.3); X.lineTo(x + s * 0.45, y + s * 0.3); },
    fork(X, x, y, s) { X.beginPath(); X.arc(x - s * 0.32, y - s * 0.45, s * 0.14, 0, TAU); X.moveTo(x + s * 0.46, y - s * 0.45); X.arc(x + s * 0.32, y - s * 0.45, s * 0.14, 0, TAU); X.moveTo(x + s * 0.14, y + s * 0.5); X.arc(x, y + s * 0.5, s * 0.14, 0, TAU);
      X.moveTo(x - s * 0.32, y - s * 0.31); X.lineTo(x - s * 0.32, y - s * 0.12); X.quadraticCurveTo(x - s * 0.32, y + s * 0.05, x, y + s * 0.08); X.quadraticCurveTo(x + s * 0.32, y + s * 0.05, x + s * 0.32, y - s * 0.12); X.lineTo(x + s * 0.32, y - s * 0.31); X.moveTo(x, y + s * 0.08); X.lineTo(x, y + s * 0.36); },
    search(X, x, y, s) { X.beginPath(); X.arc(x - s * 0.08, y - s * 0.08, s * 0.32, 0, TAU); X.moveTo(x + s * 0.16, y + s * 0.16); X.lineTo(x + s * 0.45, y + s * 0.45); },
    home(X, x, y, s) { X.beginPath(); X.moveTo(x - s * 0.5, y - s * 0.05); X.lineTo(x, y - s * 0.5); X.lineTo(x + s * 0.5, y - s * 0.05); X.moveTo(x - s * 0.36, y - s * 0.15); X.lineTo(x - s * 0.36, y + s * 0.45); X.lineTo(x + s * 0.36, y + s * 0.45); X.lineTo(x + s * 0.36, y - s * 0.15); },
    user(X, x, y, s) { X.beginPath(); X.arc(x, y - s * 0.2, s * 0.24, 0, TAU); X.moveTo(x + s * 0.45, y + s * 0.5); X.quadraticCurveTo(x + s * 0.45, y + s * 0.08, x, y + s * 0.08); X.quadraticCurveTo(x - s * 0.45, y + s * 0.08, x - s * 0.45, y + s * 0.5); },
  };
  const icon = (X, kind, x, y, s, color, lw, fill) => { X.save(); X.strokeStyle = color; X.fillStyle = color; X.lineWidth = lw || s * 0.11; X.lineCap = 'round'; X.lineJoin = 'round'; IC[kind](X, x, y, s); fill ? X.fill() : X.stroke(); X.restore(); };
  const avatar = (ctx, X, x, y, r, o, i) => { const P = ctx.P, ph = imgOf(ctx, o.avatar); X.save(); X.beginPath(); X.arc(x, y, r, 0, TAU); X.clip();
    if (ph) { const sc = Math.max(2 * r / ph.w, 2 * r / ph.h); X.drawImage(ph.img, x - ph.w * sc / 2, y - ph.h * sc / 2, ph.w * sc, ph.h * sc); }
    else { const c = [P.acc, P.clay || P.acc, P.hi || P.acc, P.mut][(i || 0) % 4]; X.fillStyle = c; X.fillRect(x - r, y - r, 2 * r, 2 * r); T(ctx, X, initial(o.name), x, y + r * 0.36, r * 0.95, { weight: 800, color: lum(c) > 165 ? '#16171A' : '#FFFFFF' }); }
    X.restore(); };

  /* ═════════ أ) شخصية كرتونية بصورة أي شخص ═════════ */
  /* صورة الوجه داخل دائرة (cover، مركز الوجه focus={x:.5,y:.42,zoom:1})، وبلا صورة: ظل شخص لطيف + حلقة متقطعة («صورتك هني»). */
  FX.toonPhoto = (ctx, X, photo, x, y, r, o) => {
    o = o || {}; const P = ctx.P, ph = imgOf(ctx, photo);
    X.save(); X.beginPath(); X.arc(x, y, r, 0, TAU); X.clip();
    if (ph) {
      const f = o.focus || {}, z = f.zoom || 1, sc = Math.max(2 * r / ph.w, 2 * r / ph.h) * z, dw = ph.w * sc, dh = ph.h * sc;
      const dx = cl(x - pick(f, 'x', 0.5) * dw, x + r - dw, x - r), dy = cl(y - pick(f, 'y', 0.42) * dh, y + r - dh, y - r);
      X.drawImage(ph.img, dx, dy, dw, dh);
    } else {
      const g = X.createLinearGradient(x, y - r, x, y + r); g.addColorStop(0, mixC(P.hi || P.acc, '#FFFFFF', 0.35)); g.addColorStop(1, P.acc); X.fillStyle = g; X.fillRect(x - r, y - r, 2 * r, 2 * r);
      X.fillStyle = 'rgba(255,255,255,.78)'; X.beginPath(); X.arc(x, y - r * 0.16, r * 0.36, 0, TAU); X.fill(); X.beginPath(); X.ellipse(x, y + r * 0.82, r * 0.72, r * 0.52, 0, 0, TAU); X.fill();
      X.strokeStyle = 'rgba(255,255,255,.7)'; X.lineWidth = r * 0.035; X.setLineDash([r * 0.12, r * 0.09]); X.beginPath(); X.arc(x, y, r * 0.88, 0, TAU); X.stroke(); X.setLineDash([]);
    }
    X.restore();
    X.save(); X.lineWidth = r * 0.075; X.strokeStyle = o.ring || '#FFFFFF'; X.beginPath(); X.arc(x, y, r, 0, TAU); X.stroke();
    X.lineWidth = r * 0.03; X.strokeStyle = o.outline || '#211D1A'; X.beginPath(); X.arc(x, y, r * 1.04, 0, TAU); X.stroke(); X.restore();
    return !!ph;
  };
  // ذراعين بعظمتين: الكوع يتحسب من مكان الكف (IK) — bend = جهة انثناء الكوع
  const ik = (sx, sy, hx, hy, l1, l2, bend) => { let dx = hx - sx, dy = hy - sy, d = Math.hypot(dx, dy) || 1; const dd = Math.min(d, (l1 + l2) * 0.999), base = Math.atan2(dy, dx);
    const a = Math.acos(cl((l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd), -1, 1)), e = base + bend * a; return [sx + l1 * Math.cos(e), sy + l1 * Math.sin(e), sx + (dx / d) * dd, sy + (dy / d) * dd]; };
  const limb = (X, pts, w, color, line) => { X.save(); X.lineCap = 'round'; X.lineJoin = 'round'; X.beginPath(); pts.forEach((p, i) => (i ? X.lineTo(p[0], p[1]) : X.moveTo(p[0], p[1])));
    X.strokeStyle = line; X.lineWidth = w + 10; X.stroke(); X.strokeStyle = color; X.lineWidth = w; X.stroke(); X.restore(); };
  const dot = (X, x, y, r, fill, line) => { X.beginPath(); X.arc(x, y, r, 0, TAU); X.fillStyle = fill; X.fill(); X.lineWidth = 5; X.strokeStyle = line; X.stroke(); };

  function toon(ctx, t, o, pose) {
    const { X, P } = ctx, s0 = o.s || 0; if (t < s0) return;
    const ko = fout(ctx, t, o), ki = bOut(pr(t, s0, s0 + 0.6)), lt = t - s0;
    const r = o.size || 150, male = o.gender === 'male', dir = o.dir === 'left' ? -1 : 1;
    const say = o.say || '', talking = pose === 'talk' || (!!say && pose !== 'present');
    const cx = pick(o, 'x', pose === 'point' ? (dir > 0 ? 340 : 740) : 540), hy = pick(o, 'y', 640);
    const line = o.outline || '#211D1A', skin = o.skin || '#D9A27E', shirt = o.shirt || P.acc, pants = o.pants || mixC(P.ink, '#2F3A55', 0.35);
    const sh = r * 1.12, bob = Math.sin(lt * 2.4) * 6 * (r / 150);
    X.save(); X.globalAlpha *= cl(ki * 1.6) * (1 - ko); X.translate(cx, hy + (1 - ki) * 300 + bob);
    // أرجل + جسم
    if (male) {
      limb(X, [[-r * 0.42, sh + r * 2.3], [-r * 0.46, sh + r * 3.55]], r * 0.5, pants, line); limb(X, [[r * 0.42, sh + r * 2.3], [r * 0.46, sh + r * 3.55]], r * 0.5, pants, line);
      [-1, 1].forEach(sd => { X.beginPath(); X.ellipse(sd * r * 0.55, sh + r * 3.72, r * 0.36, r * 0.17, 0, 0, TAU); X.fillStyle = line; X.fill(); });
      X.beginPath(); X.moveTo(-r * 1.0, sh + r * 0.05); X.quadraticCurveTo(-r * 1.3, sh + r * 0.1, -r * 1.22, sh + r * 0.6); X.lineTo(-r * 1.0, sh + r * 2.55); X.lineTo(r * 1.0, sh + r * 2.55); X.lineTo(r * 1.22, sh + r * 0.6); X.quadraticCurveTo(r * 1.3, sh + r * 0.1, r * 1.0, sh + r * 0.05); X.closePath();
      X.fillStyle = shirt; X.fill(); X.lineWidth = 6; X.strokeStyle = line; X.stroke();
      X.fillStyle = mixC(shirt, '#FFFFFF', 0.7); [-1, 1].forEach(sd => { X.beginPath(); X.moveTo(0, sh + r * 0.42); X.lineTo(sd * r * 0.36, sh + r * 0.02); X.lineTo(sd * r * 0.06, sh + r * 0.0); X.closePath(); X.fill(); X.stroke(); });
      X.fillStyle = mixC(shirt, '#000000', 0.25); [0.9, 1.4, 1.9].forEach(k => { X.beginPath(); X.arc(0, sh + r * k, r * 0.045, 0, TAU); X.fill(); });
    } else {
      limb(X, [[-r * 0.32, sh + r * 2.9], [-r * 0.34, sh + r * 3.55]], r * 0.28, skin, line); limb(X, [[r * 0.32, sh + r * 2.9], [r * 0.34, sh + r * 3.55]], r * 0.28, skin, line);
      [-1, 1].forEach(sd => { X.beginPath(); X.ellipse(sd * r * 0.42, sh + r * 3.7, r * 0.3, r * 0.15, 0, 0, TAU); X.fillStyle = line; X.fill(); });
      const sway = Math.sin(lt * 2.4) * r * 0.05;
      X.beginPath(); X.moveTo(-r * 0.85, sh + r * 0.05); X.quadraticCurveTo(-r * 1.15, sh + r * 0.1, -r * 1.08, sh + r * 0.6); X.quadraticCurveTo(-r * 1.25 + sway, sh + r * 2.0, -r * 1.55 + sway, sh + r * 3.05);
      X.quadraticCurveTo(0, sh + r * 3.3, r * 1.55 + sway, sh + r * 3.05); X.quadraticCurveTo(r * 1.25 + sway, sh + r * 2.0, r * 1.08, sh + r * 0.6); X.quadraticCurveTo(r * 1.15, sh + r * 0.1, r * 0.85, sh + r * 0.05); X.closePath();
      X.fillStyle = shirt; X.fill(); X.lineWidth = 6; X.strokeStyle = line; X.stroke();
      X.strokeStyle = mixC(shirt, '#FFFFFF', 0.55); X.lineWidth = r * 0.07; X.beginPath(); X.moveTo(-r * 1.02, sh + r * 1.25); X.quadraticCurveTo(0, sh + r * 1.4, r * 1.02, sh + r * 1.25); X.stroke();
    }
    // رقبة
    X.fillStyle = skin; X.strokeStyle = line; X.lineWidth = 6; rr(X, -r * 0.2, r * 0.78, r * 0.4, sh - r * 0.6, r * 0.12); X.fill(); X.stroke();
    // الذراعين: مكان الكفين حسب الوضع
    const SX = r * (male ? 1.02 : 0.9), SY = sh + r * 0.28, L1 = r * 0.98, L2 = r * 0.9, AW = r * 0.38;
    const hands = side => {
      const k = Math.sin(lt * 2.4 + side);
      if (pose === 'wave' && side === 1) return { x: r * 1.7 + r * 0.32 * Math.sin(lt * 9), y: -r * 0.35, bend: 1 };
      if (pose === 'talk') return { x: side * (r * 1.45 + r * 0.12 * Math.sin(lt * 4 + side)), y: sh + r * 1.25 + r * 0.2 * Math.sin(lt * 5.2 + side * 1.7), bend: side };
      if (pose === 'point') return side === dir ? { x: dir * r * 2.75, y: sh + r * 0.15, bend: -side, point: true } : { x: side * r * 1.3, y: sh + r * 1.75, bend: side };
      if (pose === 'present') return { x: side * (o.cardW || r * 3.1) / 2, y: sh + r * 1.55, bend: -side };
      return { x: side * r * 1.35 + r * 0.04 * k, y: sh + r * 2.05, bend: -side };
    };
    const arms = [-1, 1].map(side => { const h = hands(side); const [ex, ey, hx, hy2] = ik(side * SX, SY, h.x, h.y, L1, L2, h.bend); return { side, ex, ey, hx, hy: hy2, point: h.point }; });
    const drawArm = A => { limb(X, [[A.side * SX, SY], [A.ex, A.ey], [A.hx, A.hy]], AW, shirt, line);
      if (A.point) { const ang = Math.atan2(A.hy - A.ey, A.hx - A.ex); limb(X, [[A.hx, A.hy], [A.hx + Math.cos(ang) * r * 0.42, A.hy + Math.sin(ang) * r * 0.42]], r * 0.1, skin, line); }
      dot(X, A.hx, A.hy, r * 0.22, skin, line); };
    if (pose !== 'present') arms.forEach(drawArm);
    else {
      // الكرت قدّام الجسم والكفين على أطرافه
      const kc = bOut(pr(t, s0 + 0.45, s0 + 0.95)), cw = o.cardW || r * 3.1, cy = sh + r * 1.55, lines = wrap(ctx, X, o.card || 'الفكرة\nبسطر واحد', r * 0.32, 800, cw - r * 0.5), lh = r * 0.46, ch = Math.max(r * 1.35, lines.length * lh + r * 0.6);
      arms.forEach(A => limb(X, [[A.side * SX, SY], [A.ex, A.ey]], AW, shirt, line));
      X.save(); X.translate(0, cy); X.scale(kc, kc); X.rotate(-0.03 + 0.015 * Math.sin(lt * 2));
      shd(X, 30, 14, 0.25); X.fillStyle = surf(P); rr(X, -cw / 2, -ch / 2, cw, ch, r * 0.16); X.fill(); noShd(X); X.lineWidth = 6; X.strokeStyle = line; X.stroke();
      X.fillStyle = P.acc; rr(X, -cw / 2, -ch / 2, cw, r * 0.14, r * 0.07); X.fill();
      lines.forEach((ln, i) => T(ctx, X, ln, 0, -ch / 2 + r * 0.42 + (ch - lines.length * lh) / 2 + i * lh + r * 0.1, r * 0.32, { weight: 800, color: P.ink, maxWidth: cw - r * 0.4 }));
      X.restore();
      arms.forEach(A => { limb(X, [[A.ex, A.ey], [A.hx, A.hy]], AW, shirt, line); dot(X, A.hx, A.hy, r * 0.22, skin, line); });
    }
    // الراس = الصورة بدائرة (تتمايل وتنبض شوي وهي تتكلم)
    const tilt = (talking ? 0.05 * Math.sin(lt * 3.1) : 0.025 * Math.sin(lt * 1.7)), pulse = talking ? 1 + 0.018 * Math.abs(Math.sin(lt * 12.5)) : 1;
    X.save(); X.translate(0, r * 0.85); X.rotate(tilt); X.scale(pulse, pulse); X.translate(0, -r * 0.85);
    FX.toonPhoto(ctx, X, o.photo, 0, 0, r, { focus: o.focus, ring: o.ring, outline: line }); X.restore();
    if (talking) { X.save(); X.strokeStyle = P.acc; X.lineCap = 'round'; X.lineWidth = r * 0.045; for (let i = 0; i < 3; i++) { const k = (lt * 1.6 + i / 3) % 1; X.globalAlpha *= 1; X.save(); X.globalAlpha *= 1 - k; X.beginPath(); X.arc(0, 0, r * (1.18 + k * 0.45), -0.55, 0.55); X.stroke(); X.beginPath(); X.arc(0, 0, r * (1.18 + k * 0.45), Math.PI - 0.55, Math.PI + 0.55); X.stroke(); X.restore(); } X.restore(); }
    // اسم تحت الوجه
    if (o.name && o.tag !== false) { const kn = cOut(pr(t, s0 + 0.35, s0 + 0.75)), fs = r * 0.27, w = tw(ctx, X, o.name, fs, 800) + r * 0.5;
      X.save(); X.globalAlpha *= kn; X.translate(0, r * 0.98); X.scale(lerp(0.7, 1, kn), lerp(0.7, 1, kn)); X.fillStyle = P.ink; rr(X, -w / 2, -fs * 0.85, w, fs * 1.7, fs * 0.85); X.fill();
      T(ctx, X, o.name, 0, fs * 0.36, fs, { weight: 800, color: P.bg }); X.restore(); }
    X.restore();
    // فقاعة الكلام (كلمة كلمة)
    if (say) { const ks = cOut(pr(t, s0 + 0.5, s0 + 0.85)), fs = o.sayer || 50, ls = wrap(ctx, X, say, fs, 800, 760), lh = fs * 1.45, bw = Math.min(860, Math.max(...ls.map(l => tw(ctx, X, l, fs, 800))) + 90), bh = ls.length * lh + 60;
      const bx = cl(cx, 90 + bw / 2, 990 - bw / 2), by = hy + bob - r - 70 - bh / 2, n = Math.floor((t - s0 - 0.7) / (o.step || 0.14)) + 1;
      if (ks > ON) { X.save(); X.globalAlpha *= ks * (1 - ko); X.translate(bx, by + bh / 2); X.scale(lerp(0.6, 1, bOut(ks)), lerp(0.6, 1, bOut(ks))); X.translate(-bx, -(by + bh / 2));
        shd(X, 24, 10, 0.18); X.fillStyle = '#FFFFFF'; rr(X, bx - bw / 2, by - bh / 2, bw, bh, 44); X.fill(); X.beginPath(); const tx = cl(cx, bx - bw / 2 + 60, bx + bw / 2 - 60); X.moveTo(tx - 26, by + bh / 2 - 2); X.lineTo(tx + 6, by + bh / 2 + 44); X.lineTo(tx + 30, by + bh / 2 - 2); X.fill(); noShd(X);
        drawWords(ctx, X, ls, n, bx, by - bh / 2 + 30 + fs * 1.05, lh, fs, 800, '#16171A', 'center'); X.restore(); } }
    // تأشير: ليبل عند الإصبع
    if (pose === 'point' && o.label) { const kl = bOut(pr(t, s0 + 0.6, s0 + 1.0)), fs = 52, lw = Math.min(520, tw(ctx, X, o.label, fs, 800) + 80), lx = cx + dir * (r * 3.25) + dir * lw / 2, ly = hy + bob + sh + r * 0.15;
      const x0 = cl(lx, 70 + lw / 2, 1010 - lw / 2); if (kl > ON) { X.save(); X.translate(x0, ly); X.scale(kl, kl); X.globalAlpha *= 1 - ko; X.fillStyle = P.acc; shd(X, 20, 8, 0.2); rr(X, -lw / 2, -50, lw, 100, 50); X.fill(); noShd(X); T(ctx, X, o.label, 0, 18, fs, { weight: 800, color: onAcc(P), maxWidth: lw - 40 }); X.restore(); } }
  }
  /* 233 شخصيتك الكرتونية — صورة أي شخص (o.photo: صورة/كانفس أو اسم صورة بالمشروع) بدائرة راس على جسم كرتوني بسيط: يطلع، يلوّح، ويتكلم (فقاعة كلمة كلمة).
     بلا صورة: ظل شخص بحلقة متقطعة (يبين مكان الصورة). o: {photo, name, gender='female'|'male', pose='wave'|'talk'|'idle', say, x=540, y=640 (مركز الراس), size=150 (نص قطر الراس), focus:{x,y,zoom}, shirt, skin, s, out} */
  FX.photoToon = (ctx, t, o) => toon(ctx, t, o, o.pose || (o.say ? 'talk' : 'wave'));
  /* 234 شخصيتك تأشّر — نفس الشخصية تأشّر بإيدها على شي بالشاشة وليبل ينبثق عند إصبعها. o: {photo, name, gender, label, dir='right'|'left', x, y, size, s, out} */
  FX.photoToonPoint = (ctx, t, o) => toon(ctx, t, o, 'point');
  /* 235 شخصيتك تعرض كرت — ماسكة كرت قدامها (فكرة، رقم، عرض) بالإيدين. o: {photo, name, gender, card='نص\nسطرين', cardW, x, y, size, s, out} */
  FX.photoToonCard = (ctx, t, o) => toon(ctx, t, o, 'present');

  /* ═════════ ب) قوالب واجهات تنبني من نص ═════════ */
  const enter = (ctx, t, s, d) => { const k = bOut(pr(t, s, s + (d || 0.55))); return { k, a: cl(pr(t, s, s + (d || 0.55)) * 2) }; };
  const priceStr = (cur, n, d) => { const v = d ? n.toFixed(d) : String(Math.round(n)); return !cur ? v : ar(cur) ? `${v} ${cur}` : `${cur}${v}`; };

  /* 236 جدول أسعار — باقات تطلع وحدة وحدة، السعر يعدّ، المميزات تنعلّم ✓، والباقة المميزة تتكبّر بإطار وشارة.
     o: {title='اختر باقتك', plans:[{name, price, period, features:[…], best}], currency='$', badge='الأكثر طلباً', y=430, s, out} */
  FX.pricingTable = (ctx, t, o) => {
    const { X, P } = ctx, s0 = o.s || 0; if (t < s0) return; const ko = fout(ctx, t, o);
    const plans = o.plans || [{ name: 'أساسي', price: 0, period: 'مجاناً', features: ['3 مشاريع', 'تصدير عادي'] }, { name: 'احترافي', price: 9, period: 'بالشهر', features: ['مشاريع بلا حد', 'تصدير 4K', 'بلا علامة مائية'], best: true }, { name: 'فريق', price: 29, period: 'بالشهر', features: ['5 أعضاء', 'مساحة مشتركة', 'دعم سريع'] }];
    const cur = o.currency == null ? '$' : o.currency, N = plans.length, gap = 36, ch = Math.min(310, (1080 - (N - 1) * gap) / N), y0 = pick(o, 'y', 430), S = surf(P);
    X.save(); X.globalAlpha *= 1 - ko;
    const kt = cOut(pr(t, s0, s0 + 0.4)); T(ctx, X, o.title || 'اختر باقتك', 540, y0 - 90 + (1 - kt) * 30, 68, { weight: 800, color: P.ink, alpha: kt });
    plans.forEach((p, i) => {
      const st = s0 + 0.25 + i * 0.2, e = enter(ctx, t, st), y = y0 + i * (ch + gap); if (e.a <= 0) return;
      const pk = p.best ? 1 + 0.035 * bOut(pr(t, st + 0.9, st + 1.3)) : 1;
      X.save(); X.globalAlpha *= e.a; X.translate(540, y + ch / 2 + (1 - e.k) * 120); X.scale(pk, pk); X.translate(-540, -(y + ch / 2));
      shd(X, p.best ? 40 : 22, p.best ? 16 : 8, p.best ? 0.22 : 0.12); X.fillStyle = p.best ? mixC(S, P.acc, 0.07) : S; rr(X, 90, y, 900, ch, 40); X.fill(); noShd(X);
      if (p.best) { X.lineWidth = 6; X.strokeStyle = P.acc; X.stroke(); const bt = o.badge || 'الأكثر طلباً', bw = tw(ctx, X, bt, 30, 800) + 50; X.fillStyle = P.acc; rr(X, 900 - bw, y - 24, bw, 52, 26); X.fill(); T(ctx, X, bt, 900 - bw / 2, y + 12, 30, { weight: 800, color: onAcc(P) }); }
      T(ctx, X, p.name || '', 940, y + 78, 52, { weight: 800, color: P.ink, align: 'right', maxWidth: 480 });
      (p.features || []).slice(0, Math.max(1, Math.floor((ch - 120) / 50))).forEach((f, j) => { const kf = cOut(pr(t, st + 0.4 + j * 0.15, st + 0.7 + j * 0.15)); if (kf <= 0) return; const fy = y + 135 + j * 50;
        X.save(); X.globalAlpha *= kf; X.fillStyle = rgba(P.acc, 0.16); X.beginPath(); X.arc(925, fy - 10, 19, 0, TAU); X.fill(); icon(X, 'check', 925, fy - 10, 26 * kf, P.acc, 4.5); T(ctx, X, f, 890, fy, 32, { weight: 600, color: P.ink, align: 'right', maxWidth: 440 }); X.restore(); });
      const pv = typeof p.price === 'number' ? p.price : parseFloat(String(p.price).replace(/[^\d.]/g, '')), num = isFinite(pv) ? pv : null, kc = ioC(pr(t, st + 0.2, st + 1.0));
      const ps = num == null ? String(p.price || '') : num === 0 && !p.price && p.free !== false ? (p.freeLabel || 'مجاني') : priceStr(cur, num * kc, (String(pv).split('.')[1] || '').length);
      T(ctx, X, ps, 130, y + ch / 2 + 10, num === 0 ? 70 : 96, { weight: 900, color: p.best ? P.acc : P.ink, align: 'left', dir: ar(ps) ? 'rtl' : 'ltr', maxWidth: 320 });
      if (p.period && num !== 0) T(ctx, X, p.period, 130, y + ch / 2 + 62, 30, { weight: 600, color: P.mut, align: 'left', maxWidth: 300 });
      X.restore();
    });
    X.restore();
  };

  /* 237 شاشة تطبيق — جوال (إطار عام بلا ماركة) فيه عنوان وبحث وقائمة عناصر تنزلق، ضغطة على عنصر بموجة، وزر رئيسي وشريط سفلي.
     o: {title='طلباتي', subtitle, search='ابحث…', items:[{title, sub, value}], button='طلب جديد', tap (وقت الضغطة)=s+1.8, tapRow=1, y=300, s, out} */
  FX.appScreen = (ctx, t, o) => {
    const { X, P } = ctx, s0 = o.s || 0; if (t < s0) return; const ko = fout(ctx, t, o), e = enter(ctx, t, s0, 0.6);
    const pw = 640, ph = 1260, px = 220, py = pick(o, 'y', 300), S = surf(P), dark = lum(S) < 110, ink = P.ink;
    const items = o.items || [{ title: 'تصميم شعار', sub: 'التسليم بكرة', value: '$45' }, { title: 'مونتاج ريل', sub: 'قيد التنفيذ', value: '$30' }, { title: 'كتابة سكربت', sub: 'تم التسليم', value: '$20' }, { title: 'صور منتج', sub: 'بانتظار الدفع', value: '$60' }];
    X.save(); X.globalAlpha *= e.a * (1 - ko); X.translate(540, py + ph / 2 + (1 - e.k) * 200); X.translate(-540, -(py + ph / 2));
    shd(X, 60, 30, 0.3); X.fillStyle = mixC(ink, '#000000', 0.2); rr(X, px, py, pw, ph, 90); X.fill(); noShd(X);
    const sx = px + 18, sy = py + 18, sw = pw - 36, sh = ph - 36; X.save(); rr(X, sx, sy, sw, sh, 74); X.clip(); X.fillStyle = S; X.fillRect(sx, sy, sw, sh);
    X.fillStyle = mixC(ink, '#000000', 0.2); rr(X, 540 - 85, sy + 18, 170, 46, 23); X.fill();
    T(ctx, X, o.time || '9:41', sx + 70, sy + 54, 30, { weight: 700, color: ink, dir: 'ltr' });
    X.fillStyle = ink; [0, 1, 2, 3].forEach(i => X.fillRect(sx + sw - 150 + i * 13, sy + 54 - 8 - i * 6, 8, 8 + i * 6)); X.strokeStyle = ink; X.lineWidth = 3; rr(X, sx + sw - 92, sy + 30, 46, 24, 7); X.stroke(); X.fillRect(sx + sw - 88, sy + 34, 30, 16);
    T(ctx, X, o.title || 'طلباتي', sx + sw - 50, sy + 170, 58, { weight: 800, color: ink, align: 'right', maxWidth: sw - 100 });
    if (o.subtitle) T(ctx, X, o.subtitle, sx + sw - 50, sy + 215, 28, { weight: 600, color: P.mut, align: 'right', maxWidth: sw - 100 });
    const qy = sy + 250; X.fillStyle = mixC(S, ink, dark ? 0.12 : 0.06); rr(X, sx + 40, qy, sw - 80, 80, 40); X.fill(); icon(X, 'search', sx + sw - 90, qy + 40, 38, P.mut, 4.5);
    T(ctx, X, o.search || 'ابحث…', sx + sw - 130, qy + 51, 30, { weight: 600, color: P.mut, align: 'right' });
    const tap = pick(o, 'tap', s0 + 1.8), tr = pick(o, 'tapRow', 1), rh = 132, ry0 = qy + 120;
    items.slice(0, 5).forEach((it, i) => {
      const k = cOut(pr(t, s0 + 0.4 + i * 0.13, s0 + 0.8 + i * 0.13)); if (k <= 0) return; const y = ry0 + i * rh;
      X.save(); X.globalAlpha *= k; X.translate((1 - k) * 90, 0);
      if (i === tr && t >= tap) { const kp = pr(t, tap, tap + 0.6); X.fillStyle = rgba(P.acc, 0.14 * (1 - 0.5 * kp)); X.fillRect(sx, y, sw, rh); X.save(); X.beginPath(); X.rect(sx, y, sw, rh); X.clip(); X.fillStyle = rgba(P.acc, 0.25 * (1 - kp)); X.beginPath(); X.arc(sx + sw * 0.55, y + rh / 2, 30 + 420 * cOut(kp), 0, TAU); X.fill(); X.restore(); }
      avatar(ctx, X, sx + sw - 90, y + rh / 2, 44, { name: it.title }, i);
      T(ctx, X, it.title || '', sx + sw - 155, y + 58, 36, { weight: 700, color: ink, align: 'right', maxWidth: sw - 340 });
      if (it.sub) T(ctx, X, it.sub, sx + sw - 155, y + 100, 27, { weight: 500, color: P.mut, align: 'right', maxWidth: sw - 340 });
      if (it.value) T(ctx, X, it.value, sx + 50, y + 78, 34, { weight: 800, color: ink, align: 'left', dir: ar(it.value) ? 'rtl' : 'ltr' });
      X.strokeStyle = rgba(P.mut, 0.25); X.lineWidth = 2; X.beginPath(); X.moveTo(sx + 50, y + rh); X.lineTo(sx + sw - 150, y + rh); X.stroke(); X.restore();
    });
    if (t >= tap && t < tap + 0.5) { const kf = pr(t, tap - 0.1, tap + 0.5); X.fillStyle = rgba('#FFFFFF', 0.9 * (1 - kf)); X.strokeStyle = rgba(ink, 0.5 * (1 - kf)); X.lineWidth = 3; X.beginPath(); X.arc(sx + sw * 0.55, ry0 + tr * rh + rh / 2, 34, 0, TAU); X.fill(); X.stroke(); }
    const kb = bOut(pr(t, s0 + 1.0, s0 + 1.45)); if (o.button !== null && kb > ON) { const by = sy + sh - 250, bw = sw - 100; X.save(); X.translate(540, by + 48); X.scale(kb, kb); shd(X, 20, 10, 0.2); X.fillStyle = P.acc; rr(X, -bw / 2, -48, bw, 96, 48); X.fill(); noShd(X);
      T(ctx, X, o.button || 'طلب جديد', 0, 14, 40, { weight: 800, color: onAcc(P) }); X.restore(); }
    const ny = sy + sh - 105; X.strokeStyle = rgba(P.mut, 0.25); X.lineWidth = 2; X.beginPath(); X.moveTo(sx, ny - 50); X.lineTo(sx + sw, ny - 50); X.stroke();
    ['home', 'search', 'heart', 'user'].forEach((k, i) => { const x = sx + sw - (i + 0.5) * sw / 4; if (k === 'heart') icon(X, 'heart', x, ny + 4, 44, i === 0 ? P.acc : P.mut, 4.5); else icon(X, k, x, ny, 52, i === 0 ? P.acc : P.mut, 4.5); });
    X.fillStyle = ink; rr(X, 540 - 90, sy + sh - 26, 180, 9, 4.5); X.fill();
    X.restore(); X.restore();
  };

  /* 238 بطاقة منشور (socialPost — غير postCard رقم 88) — منشور/تغريدة عامة (بلا شعار منصة): صورة الحساب، الاسم وشارة، المعرّف (theme.handle)، النص ينكتب كلمة كلمة، وأزرار الرد/إعادة النشر/الإعجاب — القلب ينضغط ويعدّ.
     o: {text, name, handle, avatar (صورة اختيارية), time='الحين', verified=true, counts:{reply, repost, like}, image (صورة اختيارية), tap=s+2.2, step=.09, y=520, s, out} */
  FX.socialPost = (ctx, t, o) => {
    const { X, P } = ctx, s0 = o.s || 0; if (t < s0) return; const ko = fout(ctx, t, o), e = enter(ctx, t, s0, 0.55), S = surf(P);
    const x = 90, w = 900, y = pick(o, 'y', 520), fs = o.textSize || 46, lh = fs * 1.55, lines = wrap(ctx, X, o.text || 'أهم درس تعلمته هالسنة: ابدأ قبل لا تكون جاهز، والباقي يجي مع الوقت.', fs, 600, w - 120);
    const ph = imgOf(ctx, o.image), imH = ph ? 440 : 0, bodyH = lines.length * lh, h = 200 + bodyH + (ph ? imH + 30 : 0) + 130;
    const name = o.name || 'حسابك', handle = o.handle || ctx.P.handle || '@handle', c = Object.assign({ reply: 24, repost: 61, like: 1240 }, o.counts || {});
    X.save(); X.globalAlpha *= e.a * (1 - ko); X.translate(0, (1 - e.k) * 110);
    shd(X, 40, 16, 0.18); X.fillStyle = S; rr(X, x, y, w, h, 44); X.fill(); noShd(X);
    avatar(ctx, X, x + w - 95, y + 100, 56, { name, avatar: o.avatar }, 0);
    T(ctx, X, name, x + w - 175, y + 92, 42, { weight: 800, color: P.ink, align: 'right', maxWidth: 440 });
    if (o.verified !== false) { const nx = x + w - 175 - Math.min(440, tw(ctx, X, name, 42, 800)) - 32; X.fillStyle = P.acc; X.beginPath(); X.arc(nx, y + 78, 19, 0, TAU); X.fill(); icon(X, 'check', nx, y + 78, 22, onAcc(P), 4); }
    T(ctx, X, handle, x + w - 175, y + 142, 31, { weight: 500, color: P.mut, align: 'right', dir: 'ltr', maxWidth: 360 });
    T(ctx, X, o.time || 'الحين', x + 70, y + 92, 30, { weight: 500, color: P.mut, align: 'left' });
    X.fillStyle = P.mut; [0, 1, 2].forEach(i => { X.beginPath(); X.arc(x + 70 + i * 16, y + 135, 5, 0, TAU); X.fill(); });
    const n = Math.floor((t - s0 - 0.45) / (o.step || 0.09)) + 1; drawWords(ctx, X, lines, n, x + w - 60, y + 210 + fs * 0.5, lh, fs, 600, P.ink, 'right');
    let yy = y + 200 + bodyH; if (ph) { const ki = cOut(pr(t, s0 + 0.6, s0 + 1.0)); X.save(); X.globalAlpha *= ki; rr(X, x + 50, yy + 10, w - 100, imH, 30); X.clip(); const sc = Math.max((w - 100) / ph.w, imH / ph.h); X.drawImage(ph.img, x + w / 2 - ph.w * sc / 2, yy + 10 + imH / 2 - ph.h * sc / 2, ph.w * sc, ph.h * sc); X.restore(); yy += imH + 30; }
    X.strokeStyle = rgba(P.mut, 0.25); X.lineWidth = 2; X.beginPath(); X.moveTo(x + 50, yy + 10); X.lineTo(x + w - 50, yy + 10); X.stroke();
    const fy = yy + 75, tap = pick(o, 'tap', s0 + 2.2), liked = t >= tap, kh = liked ? bOut(pr(t, tap, tap + 0.35)) : 0;
    const btn = (kind, cx, val, col) => { icon(X, kind, cx, fy, 46, col, 4.5); if (val != null) T(ctx, X, compact(ctx, val), cx - 42, fy + 12, 31, { weight: 700, color: col, align: 'right', dir: 'ltr' }); };
    btn('bubble', x + w - 90, c.reply, P.mut); btn('repost', x + w - 330, c.repost, P.mut);
    const hx = x + w - 570; if (liked) { X.save(); X.translate(hx, fy); X.scale(0.6 + 0.4 * kh + 0.25 * Math.sin(Math.PI * pr(t, tap, tap + 0.35)), 0.6 + 0.4 * kh + 0.25 * Math.sin(Math.PI * pr(t, tap, tap + 0.35))); X.fillStyle = P.acc; IC.heart(X, 0, 0, 46); X.fill(); X.restore();
      const kb = pr(t, tap, tap + 0.5); if (kb < 1) for (let i = 0; i < 8; i++) { const a = i * TAU / 8, d = 30 + 50 * cOut(kb); X.fillStyle = rgba(P.acc, 1 - kb); X.beginPath(); X.arc(hx + Math.cos(a) * d, fy + Math.sin(a) * d, 7 * (1 - kb), 0, TAU); X.fill(); }
      T(ctx, X, compact(ctx, c.like + 1), hx - 42, fy + 12, 31, { weight: 700, color: P.acc, align: 'right', dir: 'ltr' }); } else btn('heart', hx, c.like, P.mut);
    icon(X, 'share', x + 90, fy, 44, P.mut, 4.5);
    X.restore();
  };

  /* 239 بطاقة مستودع — مشروع كود عام (بلا شعار موقع): اسم المستودع، «عام»، الوصف، مواضيع، لغة، نجوم تعدّ وزر «نجمة» ينضغط، ونشاط آخر الأسابيع.
     o: {name='user/project', desc, topics:[…], lang='JavaScript', stars=1280, forks=96, updated='حُدّث قبل يومين', visibility='عام', activity:[…], tap=s+2.0, y=520, s, out} */
  FX.repoCard = (ctx, t, o) => {
    const { X, P } = ctx, s0 = o.s || 0; if (t < s0) return; const ko = fout(ctx, t, o), e = enter(ctx, t, s0, 0.55), S = surf(P);
    const x = 90, w = 900, y = pick(o, 'y', 520), dl = wrap(ctx, X, o.desc || 'أداة مفتوحة المصدر تسوي ريلز عربية من سكربت واحد.', 36, 500, w - 120), topics = o.topics || ['عربي', 'فيديو', 'أتمتة'];
    const h = 190 + dl.length * 56 + (topics.length ? 90 : 0) + 110 + 130;
    const stars = o.stars == null ? 1280 : +o.stars, forks = o.forks == null ? 96 : +o.forks, tap = pick(o, 'tap', s0 + 2.0), starred = t >= tap;
    const nm = o.name || ((ctx.P.handle || '@studio').replace(/^@/, '') + '/project'), [own, rep] = nm.includes('/') ? [nm.slice(0, nm.lastIndexOf('/') + 1), nm.slice(nm.lastIndexOf('/') + 1)] : ['', nm];
    X.save(); X.globalAlpha *= e.a * (1 - ko); X.translate(0, (1 - e.k) * 110);
    shd(X, 40, 16, 0.18); X.fillStyle = S; rr(X, x, y, w, h, 36); X.fill(); noShd(X); X.strokeStyle = rgba(P.mut, 0.3); X.lineWidth = 3; X.stroke();
    icon(X, 'book', x + w - 75, y + 92, 46, P.mut, 4.5);
    const fsN = 42, wr = tw(ctx, X, rep, fsN, 800), wo = tw(ctx, X, own, fsN, 500), sc = Math.min(1, 470 / (wr + wo)), nx = x + w - 125;
    X.save(); X.translate(nx, y + 106); X.scale(sc, sc); T(ctx, X, rep, 0, 0, fsN, { weight: 800, color: P.acc, align: 'right', dir: 'ltr' }); T(ctx, X, own, -wr, 0, fsN, { weight: 500, color: P.mut, align: 'right', dir: 'ltr' }); X.restore();
    const vis = o.visibility || 'عام', vw = tw(ctx, X, vis, 26, 700) + 36, vx = nx - (wr + wo) * sc - 24 - vw; X.strokeStyle = rgba(P.mut, 0.6); X.lineWidth = 2.5; rr(X, vx, y + 76, vw, 44, 22); X.stroke(); T(ctx, X, vis, vx + vw / 2, y + 107, 26, { weight: 700, color: P.mut });
    const kp = starred ? bOut(pr(t, tap, tap + 0.3)) : 0, bw = 236; X.save(); X.translate(x + 50 + bw / 2, y + 98); X.scale(1 + 0.08 * Math.sin(Math.PI * pr(t, tap, tap + 0.3)), 1 + 0.08 * Math.sin(Math.PI * pr(t, tap, tap + 0.3)));
    X.fillStyle = starred ? rgba(P.acc, 0.14) : mixC(S, P.ink, 0.05); rr(X, -bw / 2, -36, bw, 72, 18); X.fill(); X.strokeStyle = starred ? P.acc : rgba(P.mut, 0.5); X.lineWidth = 2.5; X.stroke();
    X.save(); X.translate(bw / 2 - 38, 0); X.scale(starred ? 0.8 + 0.2 * kp : 1, starred ? 0.8 + 0.2 * kp : 1); X.fillStyle = P.acc; X.strokeStyle = starred ? P.acc : P.mut; X.lineWidth = 3.5; IC.star(X, 0, 0, 20); starred ? X.fill() : X.stroke(); X.restore();
    T(ctx, X, starred ? (o.starredLabel || 'نجّمته') : (o.starLabel || 'نجمة'), -26, 11, 30, { weight: 700, color: starred ? P.acc : P.ink }); X.restore();
    dl.forEach((l, i) => { const k = cOut(pr(t, s0 + 0.4 + i * 0.12, s0 + 0.8 + i * 0.12)); T(ctx, X, l, x + w - 60, y + 200 + i * 56, 36, { weight: 500, color: P.ink, align: 'right', alpha: k }); });
    let yy = y + 190 + dl.length * 56;
    if (topics.length) { let tx = x + w - 60; topics.forEach((tp, i) => { const k = bOut(pr(t, s0 + 0.8 + i * 0.12, s0 + 1.15 + i * 0.12)), ww = tw(ctx, X, tp, 28, 700) + 44; if (tx - ww < x + 50) return; if (k > ON) { X.save(); X.translate(tx - ww / 2, yy + 40); X.scale(k, k); X.fillStyle = rgba(P.acc, 0.14); rr(X, -ww / 2, -26, ww, 52, 26); X.fill(); T(ctx, X, tp, 0, 10, 28, { weight: 700, color: P.acc }); X.restore(); } tx -= ww + 14; }); yy += 90; }
    const by = yy + 45, kc = ioC(pr(t, s0 + 0.6, s0 + 1.8)); let bx = x + w - 60;
    const meta = (draw, label, col) => { const lw = tw(ctx, X, label, 30, 600); draw(bx - 16); T(ctx, X, label, bx - 44, by + 10, 30, { weight: 600, color: col || P.mut, align: 'right', dir: ar(label) ? 'rtl' : 'ltr' }); bx -= 44 + lw + 46; };
    meta(cx => { X.fillStyle = P.clay || P.acc; X.beginPath(); X.arc(cx, by, 13, 0, TAU); X.fill(); }, o.lang || 'JavaScript', P.ink);
    meta(cx => { X.save(); X.strokeStyle = P.mut; X.lineWidth = 3.5; IC.star(X, cx, by, 17); X.stroke(); X.restore(); }, compact(ctx, Math.round(stars * kc) + (starred ? 1 : 0)));
    meta(cx => icon(X, 'fork', cx, by, 36, P.mut, 3.5), compact(ctx, Math.round(forks * kc)));
    if (o.updated !== null) T(ctx, X, o.updated || 'حُدّث قبل يومين', x + 60, by + 10, 28, { weight: 500, color: P.mut, align: 'left' });
    const act = o.activity || Array.from({ length: 26 }, (_, i) => 0.15 + 0.85 * h2(i, 9) * (0.4 + 0.6 * i / 25)), ay = yy + 110, aw = w - 120, bwid = aw / act.length, mx = Math.max(...act) || 1;
    T(ctx, X, o.activityLabel || 'النشاط', x + w - 60, ay + 4, 26, { weight: 700, color: P.mut, align: 'right' });
    act.forEach((v, i) => { const k = cOut(pr(t, s0 + 1.0 + i * 0.025, s0 + 1.4 + i * 0.025)), hh = 70 * (v / mx) * k; X.fillStyle = rgba(P.acc, 0.35 + 0.65 * (v / mx)); rr(X, x + 60 + (act.length - 1 - i) * bwid + 2, ay + 100 - hh, bwid - 5, hh, 4); X.fill(); });
    X.restore();
  };

  /* 240 إشعارات — بانرات إشعار تنزل من فوق وحدة ورا الثانية، الجديد فوق ويدف القديم لتحت (بلا أسماء تطبيقات حقيقية).
     o: {items:[{app, title, text, time}], every=.8, y=230, s, out} */
  FX.notifyBanner = (ctx, t, o) => {
    const { X, P } = ctx, s0 = o.s || 0; if (t < s0) return; const ko = fout(ctx, t, o), S = surf(P);
    const items = o.items || [{ app: 'المتجر', title: 'طلب جديد', text: 'وصلك طلب جديد بقيمة ' + ltr('$25') }, { app: 'المتابعين', title: 'متابعين جدد', text: '120 شخص تابعوك اليوم' }, { app: 'الرسائل', title: 'رسالة جديدة', text: '«شلون أقدر أشترك؟»' }];
    const every = o.every || 0.8, bh = 176, gap = 22, x = 70, w = 940, y0 = pick(o, 'y', 230);
    X.save(); X.globalAlpha *= 1 - ko;
    for (let i = items.length - 1; i >= 0; i--) {
      const ti = s0 + i * every; if (t < ti) continue; const it = items[i], kd = bOut(pr(t, ti, ti + 0.5));
      let push = 0; for (let j = i + 1; j < items.length; j++) push += cOut(pr(t, s0 + j * every, s0 + j * every + 0.45)) * (bh + gap);
      const y = lerp(-bh - 60, y0, kd) + push, sc = 1 - Math.min(0.06, push / (bh + gap) * 0.025);
      X.save(); X.translate(540, y + bh / 2); X.scale(sc, sc); X.translate(-540, -(y + bh / 2)); X.globalAlpha *= cl(pr(t, ti, ti + 0.25) * 1.5);
      shd(X, 36, 14, 0.2); X.fillStyle = rgba(S, 0.97); rr(X, x, y, w, bh, 48); X.fill(); noShd(X);
      const c = [P.acc, P.clay || P.acc, P.hi || P.acc, P.mut][i % 4], ix = x + w - 40 - 104; X.fillStyle = c; rr(X, ix, y + 36, 104, 104, 28); X.fill();
      if (it.icon && IC[it.icon]) icon(X, it.icon, ix + 52, y + 88, 54, lum(c) > 165 ? '#16171A' : '#FFFFFF', 5); else T(ctx, X, initial(it.app || it.title), ix + 52, y + 106, 54, { weight: 800, color: lum(c) > 165 ? '#16171A' : '#FFFFFF' });
      T(ctx, X, it.app || '', ix - 28, y + 58, 27, { weight: 700, color: P.mut, align: 'right', maxWidth: 480 });
      T(ctx, X, it.time || 'الحين', x + 44, y + 58, 26, { weight: 500, color: P.mut, align: 'left' });
      T(ctx, X, it.title || '', ix - 28, y + 104, 36, { weight: 800, color: P.ink, align: 'right', maxWidth: w - 230 });
      T(ctx, X, it.text || '', ix - 28, y + 148, 31, { weight: 500, color: P.ink, align: 'right', maxWidth: w - 230, alpha: 0.85 });
      X.restore();
    }
    X.restore();
  };

  /* ═════════ ج) منحنى البقاء ═════════ */
  const RT = ['t', 'sec', 'time', 'second', 'seconds', 'x', 'elapsed', 'elapsedVideoTimeRatio', 'ratio'];
  const RV = ['v', 'pct', 'percent', 'value', 'retention', 'y', 'audienceWatchRatio', 'watchRatio', 'viewers', 'audience'];
  /* أي شكل معقول → {points:[{x 0..1, sec|null, v %}], duration}:
     [100, 82, 70…] · [0.95, 0.8…] (نسب → %) · [[sec, %]…] · [{t|sec|time, v|pct|retention|value}…] · تصدير يوتيوب [{elapsedVideoTimeRatio, audienceWatchRatio}…]
     · كائن {points|retention|curve|data, durationSec|duration} · منشور من stats.json فيه retention: […] و durationSec */
  FX.retentionPoints = (input, dur) => {
    let arr = input, D = dur;
    if (input && !Array.isArray(input) && typeof input === 'object') { arr = input.points || input.retention || input.curve || input.data || input.values || []; if (D == null) D = input.durationSec != null ? input.durationSec : input.duration != null ? input.duration : input.dur; }
    if (!Array.isArray(arr)) arr = [];
    const raw = arr.map((p, i) => {
      if (typeof p === 'number' || (typeof p === 'string' && p.trim() !== '')) return { i, tx: null, v: parseFloat(p) };
      if (Array.isArray(p)) return { i, tx: parseFloat(p[0]), v: parseFloat(p[1]) };
      if (p && typeof p === 'object') { const kt = RT.find(k => p[k] != null), kv = RV.find(k => p[k] != null); return { i, tx: kt ? parseFloat(p[kt]) : null, ratioT: kt === 'elapsedVideoTimeRatio' || kt === 'ratio', v: kv ? parseFloat(String(p[kv]).replace('%', '')) : NaN }; }
      return null;
    }).filter(p => p && isFinite(p.v));
    D = D != null && isFinite(+D) && +D > 0 ? +D : null;
    if (!raw.length) return { points: [], duration: D };
    const scale = Math.max(...raw.map(p => p.v)) <= 1.5 ? 100 : 1, n = raw.length;
    const hasT = raw.every(p => p.tx != null && isFinite(p.tx));
    let pts;
    if (hasT) {
      const mt = Math.max(...raw.map(p => p.tx)), ratio = raw[0].ratioT || (mt <= 1 && n > 2 && (D == null || D > 1));
      if (!ratio && D == null) D = mt || null;
      pts = raw.map(p => { const x = ratio ? p.tx : (D ? p.tx / D : 0); return { x: cl(x), sec: D ? x * D : null, v: p.v * scale }; });
    } else pts = raw.map((p, i) => { const x = n > 1 ? i / (n - 1) : 0; return { x, sec: D ? x * D : null, v: p.v * scale }; });
    pts.sort((a, b) => a.x - b.x);
    return { points: pts, duration: D };
  };
  /* أكبر نزلات: نافذة بطول ~5% من النقاط، n نزلات على الأكثر (≥ min نقطة %)، متباعدة */
  FX.retentionDrops = (points, n, min) => {
    const P = points || [], N = P.length, w = Math.max(1, Math.round(N / 20)), m = min == null ? 4 : min, c = [];
    for (let i = 0; i + w < N; i++) c.push({ i, j: i + w, drop: P[i].v - P[i + w].v });
    c.sort((a, b) => b.drop - a.drop); const out = [];
    for (const d of c) { if (out.length >= (n == null ? 2 : n) || d.drop < m) break; if (out.some(q => Math.abs(q.i - d.i) <= w * 2)) continue; out.push(d); }
    return out.map(d => ({ i: d.i, j: d.j, drop: d.drop, from: P[d.i].v, to: P[d.j].v, x: P[d.j].x, sec: P[d.j].sec })).sort((a, b) => a.x - b.x);
  };
  const mmss = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  /* 241 منحنى البقاء — رسم «كم واحد كمّل يشوف» من أرقام الإحصائيات: الخط ينرسم والنسبة تمشي معاه، علامات على أكبر نزلات (−18% عند 0:03)، ونسبة اللي كمّلوا للآخر.
     o: {points (أي شكل يقبله FX.retentionPoints), duration (ثواني)، title='منحنى البقاء', sub, drops=2, minDrop=4, marks:[{at (ثانية، أو 0..1 بلا مدة), label}], avg (%)،
         endLabel='كمّلوا للآخر', draw=2.2 (مدة الرسم), y=420, h=860, s, out} */
  FX.retentionCurve = (ctx, t, o) => {
    const { X, P } = ctx, s0 = o.s || 0; if (t < s0) return; const ko = fout(ctx, t, o), S = surf(P), red = o.dropColor || P.clay || P.acc;
    const R = FX.retentionPoints(o.points || [100, 78, 66, 61, 58, 52, 50, 49, 44, 42, 41, 40, 38, 31, 30, 29], o.duration), pts = R.points, D = R.duration;
    const x0 = 70, w = 940, y0 = pick(o, 'y', 420), h = o.h || 860, e = enter(ctx, t, s0, 0.5);
    X.save(); X.globalAlpha *= e.a * (1 - ko); X.translate(0, (1 - e.k) * 80);
    T(ctx, X, o.title || 'منحنى البقاء', 540, y0 - 110, 66, { weight: 800, color: P.ink });
    T(ctx, X, o.sub || 'كم واحد كمّل يشوف الفيديو', 540, y0 - 50, 34, { weight: 600, color: P.mut });
    shd(X, 40, 16, 0.15); X.fillStyle = S; rr(X, x0, y0, w, h, 44); X.fill(); noShd(X);
    const L = x0 + 130, Rr = x0 + w - 60, Tp = y0 + 80, B = y0 + h - 110, px = x => L + x * (Rr - L), py = v => B - cl(v, 0, 100) / 100 * (B - Tp);
    X.lineWidth = 2; [0, 25, 50, 75, 100].forEach(v => { X.strokeStyle = rgba(P.mut, v === 0 ? 0.5 : 0.22); X.setLineDash(v ? [10, 10] : []); X.beginPath(); X.moveTo(L, py(v)); X.lineTo(Rr, py(v)); X.stroke(); T(ctx, X, v + '%', L - 22, py(v) + 10, 28, { weight: 600, color: P.mut, align: 'right', dir: 'ltr' }); }); X.setLineDash([]);
    const xl = D ? [[0, '0:00'], [0.5, mmss(D / 2)], [1, mmss(D)]] : [[0, 'البداية'], [0.5, 'النص'], [1, 'النهاية']];
    xl.forEach(([x, s], i) => T(ctx, X, s, px(x), B + 54, 28, { weight: 600, color: P.mut, align: i === 0 ? 'left' : i === 2 ? 'right' : 'center', dir: ar(s) ? 'rtl' : 'ltr' }));
    if (!pts.length) { T(ctx, X, 'ما فيه أرقام بقاء', 540, (Tp + B) / 2, 40, { weight: 700, color: P.mut }); X.restore(); return; }
    const kd = ioC(pr(t, s0 + 0.4, s0 + 0.4 + (o.draw || 2.2))), cx = px(kd);
    const vAt = x => { if (x <= pts[0].x) return pts[0].v; for (let i = 1; i < pts.length; i++) if (x <= pts[i].x) { const a = pts[i - 1], b = pts[i]; return lerp(a.v, b.v, (x - a.x) / ((b.x - a.x) || 1)); } return pts[pts.length - 1].v; };
    if (o.avg != null) { const ya = py(+o.avg), ka = cOut(pr(t, s0 + 0.3, s0 + 0.9)); X.save(); X.globalAlpha *= ka; X.strokeStyle = P.mut; X.lineWidth = 3; X.setLineDash([16, 12]); X.beginPath(); X.moveTo(L, ya); X.lineTo(Rr, ya); X.stroke(); X.setLineDash([]);
      T(ctx, X, `${o.avgLabel || 'المتوسط'} ${ltr(ctx.num(+o.avg) + '%')}`, Rr - 6, ya - 14, 26, { weight: 700, color: P.mut, align: 'right' }); X.restore(); }
    X.save(); X.beginPath(); X.rect(L - 10, Tp - 40, cx - L + 10, B - Tp + 60); X.clip();
    const path = Y => { Y.beginPath(); pts.forEach((p, i) => (i ? Y.lineTo(px(p.x), py(p.v)) : Y.moveTo(px(p.x), py(p.v)))); };
    const g = X.createLinearGradient(0, Tp, 0, B); g.addColorStop(0, rgba(P.acc, 0.38)); g.addColorStop(1, rgba(P.acc, 0.02)); path(X); X.lineTo(px(pts[pts.length - 1].x), B); X.lineTo(px(pts[0].x), B); X.closePath(); X.fillStyle = g; X.fill();
    path(X); X.strokeStyle = P.acc; X.lineWidth = 9; X.lineJoin = 'round'; X.lineCap = 'round'; X.stroke(); X.restore();
    // علامات النزلات (أو o.marks)
    const marks = o.marks ? o.marks.map(m => { const x = D && m.at > 1 ? m.at / D : D ? m.at / D : m.at; return { x: cl(x), label: m.label, v: vAt(cl(x)) }; })
      : FX.retentionDrops(pts, o.drops == null ? 2 : o.drops, o.minDrop).map(d => ({ x: d.x, v: d.to, label: ltr(`−${ctx.num(Math.round(d.drop))}%`) + (d.sec != null ? ` عند ${ltr(mmss(d.sec))}` : '') }));
    marks.forEach((m, i) => { if (kd < m.x - 0.001) return; const ta = s0 + 0.4 + (o.draw || 2.2) * m.x, k = bOut(pr(t, ta, ta + 0.4)), mx = px(m.x), my = py(m.v);
      X.save(); X.fillStyle = red; X.strokeStyle = '#FFFFFF'; X.lineWidth = 5; X.beginPath(); X.arc(mx, my, 15 * k, 0, TAU); X.fill(); X.stroke();
      const fs = 30, lw = tw(ctx, X, m.label || '', fs, 800) + 40, up = i % 2 ? 1 : -1, ly = cl(my + up * 90, Tp + 10, B - 40), lx = cl(mx, L + lw / 2, Rr - lw / 2);
      X.globalAlpha *= cl(k); X.strokeStyle = red; X.lineWidth = 3; X.beginPath(); X.moveTo(mx, my); X.lineTo(lx, ly); X.stroke();
      X.translate(lx, ly); X.scale(k, k); X.fillStyle = red; rr(X, -lw / 2, -30, lw, 60, 30); X.fill(); T(ctx, X, m.label || '', 0, 11, fs, { weight: 800, color: '#FFFFFF' }); X.restore(); });
    // الراس: نقطة + النسبة الحالية
    if (kd > 0) { const v = vAt(kd), hy = py(v); X.fillStyle = P.acc; X.strokeStyle = '#FFFFFF'; X.lineWidth = 6; X.beginPath(); X.arc(cx, hy, 17, 0, TAU); X.fill(); X.stroke();
      const s = ctx.num(Math.round(v)) + '%', bw = tw(ctx, X, s, 34, 800) + 36, bx = cl(cx, L + bw / 2, Rr - bw / 2); X.fillStyle = P.ink; rr(X, bx - bw / 2, hy - 92, bw, 56, 28); X.fill(); T(ctx, X, s, bx, hy - 52, 34, { weight: 800, color: P.bg, dir: 'ltr' }); }
    // اللي كمّلوا للآخر
    const ke = bOut(pr(t, s0 + 0.5 + (o.draw || 2.2), s0 + 0.9 + (o.draw || 2.2))); if (ke > ON && o.endLabel !== null) { const s = `${ltr(ctx.num(Math.round(pts[pts.length - 1].v)) + '%')} ${o.endLabel || 'كمّلوا للآخر'}`, bw = tw(ctx, X, s, 40, 800) + 60;
      X.save(); X.translate(540, y0 + h + 70); X.scale(ke, ke); X.fillStyle = P.acc; rr(X, -bw / 2, -40, bw, 80, 40); X.fill(); T(ctx, X, s, 0, 14, 40, { weight: 800, color: onAcc(P) }); X.restore(); }
    X.restore();
  };

  /* ═════════ د) كلمة التعليق ← رسالة خاصة ═════════ */
  /* 242 كرت «اكتب الكلمة بالتعليقات» — كرت نهاية: «اكتب» + الكلمة بكبسولة تنبض + «بالتعليقات»، خانة تعليق تنكتب فيها الكلمة وتنرسل،
     وبعدها رسالة خاصة توصل من حسابك (theme.handle) — ويوتيوب (ما فيه خاص): تعليق مثبّت فيه الرابط بدالها. نفس كلمة publish-pack.js --keyword.
     o: {keyword='رابط', reward='الرابط', reply (نص الرسالة)، platform='instagram'|'tiktok'|'youtube', handle, s, out} */
  FX.commentKeyword = (ctx, t, o) => {
    const { X, P } = ctx, s0 = o.s || 0; if (t < s0) return; const ko = fout(ctx, t, o), S = surf(P);
    const kw = o.keyword || 'رابط', reward = o.reward || 'الرابط', yt = o.platform === 'youtube', handle = o.handle || ctx.P.handle || '';
    X.save(); X.globalAlpha *= 1 - ko;
    const k1 = cOut(pr(t, s0, s0 + 0.35)); T(ctx, X, 'اكتب', 540, 430 + (1 - k1) * 30, 78, { weight: 800, color: P.ink, alpha: k1 });
    const kp = bOut(pr(t, s0 + 0.2, s0 + 0.65)), pulse = 1 + 0.04 * Math.max(0, Math.sin((t - s0 - 0.65) * TAU / 1.2)) * (t > s0 + 0.65 ? 1 : 0), fs = Math.min(150, 150 * 640 / Math.max(1, tw(ctx, X, kw, 150, 900)));
    if (kp > ON) { const pw = tw(ctx, X, kw, fs, 900) + 120; X.save(); X.translate(540, 600); X.rotate(-0.025); X.scale(kp * pulse, kp * pulse); shd(X, 30, 14, 0.25); X.fillStyle = P.acc; rr(X, -pw / 2, -105, pw, 210, 105); X.fill(); noShd(X);
      T(ctx, X, kw, 0, fs * 0.36, fs, { weight: 900, color: onAcc(P) }); X.restore(); }
    const k2 = cOut(pr(t, s0 + 0.45, s0 + 0.8)); T(ctx, X, 'بالتعليقات', 540, 820 + (1 - k2) * 30, 78, { weight: 800, color: P.ink, alpha: k2 });
    // خانة التعليق
    const kf = cOut(pr(t, s0 + 0.7, s0 + 1.0)), fy = 900, typed = ctx.text.typeSub ? ctx.text.typeSub(kw, pr(t, s0 + 0.95, s0 + 1.45)) : kw.slice(0, Math.round(kw.length * pr(t, s0 + 0.95, s0 + 1.45)));
    if (kf > ON) { X.save(); X.globalAlpha *= kf; X.translate(0, (1 - kf) * 40); shd(X, 24, 10, 0.12); X.fillStyle = S; rr(X, 110, fy, 860, 116, 58); X.fill(); noShd(X);
      avatar(ctx, X, 905, fy + 58, 38, { name: 'م' }, 2);
      T(ctx, X, typed || (o.placeholder || 'أضف تعليق…'), 850, fy + 70, 38, { weight: typed ? 800 : 500, color: typed ? P.ink : P.mut, align: 'right' });
      const sent = pr(t, s0 + 1.5, s0 + 1.7); X.fillStyle = typed.length >= kw.length ? P.acc : rgba(P.mut, 0.4); X.beginPath(); X.arc(175, fy + 58, 40 * (1 + 0.15 * Math.sin(Math.PI * sent)), 0, TAU); X.fill(); icon(X, 'plane', 175, fy + 58, 40, onAcc(P), 4, true); X.restore(); }
    // الطيارة تطير للخاص / التعليق المثبّت
    const kfly = pr(t, s0 + 1.6, s0 + 2.1); if (kfly > 0 && kfly < 1 && !yt) { const fx = lerp(175, 540, cOut(kfly)), fyy = lerp(fy + 58, 1180, kfly) - 160 * Math.sin(Math.PI * kfly); X.save(); X.globalAlpha *= 1 - kfly * 0.6; icon(X, 'plane', fx, fyy, 70, P.acc, 4, true); X.restore(); }
    const kd = bOut(pr(t, s0 + 2.0, s0 + 2.45)); if (kd > ON) {
      X.save(); X.translate(540, 1240); X.scale(kd, kd); shd(X, 34, 14, 0.18); X.fillStyle = S; rr(X, -430, -150, 860, 300, 46); X.fill(); noShd(X);
      if (yt) { X.save(); X.translate(375, -92); X.rotate(0.5); icon(X, 'pin', 0, 0, 40, P.acc, 4.5); X.restore(); T(ctx, X, `مثبّت من ${handle ? ltr(handle) : 'صاحب القناة'}`, 335, -80, 30, { weight: 700, color: P.mut, align: 'right', maxWidth: 640 });
        T(ctx, X, o.reply || `${reward} هني`, 380, 5, 40, { weight: 800, color: P.ink, align: 'right', maxWidth: 760 }); X.fillStyle = rgba(P.acc, 0.14); rr(X, -380, 50, 760, 64, 20); X.fill(); T(ctx, X, o.link || 'example.com/link', 0, 93, 30, { weight: 700, color: P.acc, dir: 'ltr', maxWidth: 720 }); }
      else { avatar(ctx, X, 360, -88, 36, { name: handle || 'ص' }, 0); T(ctx, X, handle || 'حسابك', 305, -76, 32, { weight: 800, color: P.ink, align: 'right', dir: handle && !ar(handle) ? 'ltr' : undefined, maxWidth: 420 });
        T(ctx, X, o.dmLabel || 'رسالة جديدة', -380, -76, 28, { weight: 600, color: P.mut, align: 'left' });
        const msg = o.reply || `هلا! هذا ${reward} اللي طلبته`, mw = Math.min(700, tw(ctx, X, msg, 38, 700) + 70); X.fillStyle = P.acc; rr(X, 380 - mw, -10, mw, 100, 40); X.fill(); T(ctx, X, msg, 380 - mw / 2, 52, 38, { weight: 700, color: onAcc(P), maxWidth: mw - 50 }); }
      X.restore(); }
    const k3 = cOut(pr(t, s0 + 2.3, s0 + 2.7)); T(ctx, X, yt ? `و${reward} بالتعليق المثبّت` : `ويوصلك ${reward} بالخاص`, 540, 1500 + (1 - k3) * 30, 54, { weight: 800, color: P.acc, alpha: k3, maxWidth: 900 });
    X.restore();
  };
  FX['comment-keyword'] = FX.commentKeyword;
})();
