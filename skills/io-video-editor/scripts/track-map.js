/* ═══ track-map.js — يربط ملف تتبّع (.io track JSON من engine/track/track.py) بإطار الإخراج (1080×1920) ═══
   ملف التتبّع: {type:'plane'|'box'|'point', video, fps, size:[w,h], clock:'out'|'src', frames:[{t, quad|box|points, conf}]}
   الإحداثيات ببكسل الفيديو المتتبَّع، والزمن بساعة الفيديو (out = بعد القص = زمن studio.json · src = زمن المصدر → نحوّله بقائمة keep من cut.json).
   TrackMap.prepare(track, {keep, map})  → نسخة بزمن الإخراج وإحداثيات الكانفس (map = دالة (t) → {x,y,w,h,sc,sx,sy,sw,sh} تأطير الفيديو؛ بلاها ملء الشاشة بتأطير faceAnchor 0.3)
   TrackMap.at(prep, t)                  → {quad, box, points, center, angle, size, alpha} — برّا المدى: يقعد بآخر/أول شكل 0.2 ث وبعدين يختفي بـ0.25 ث (alpha)
   TrackMap.forFX(prep)                  → {frames} جاهز لـo.track بالحركات (FX.trackAt / FX.placeAt)
   يشتغل بالمتصفح (window.TrackMap — compose.html) وبـnode (require) للاختبار. */
(function (root, factory) {
  const M = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = M;
  if (root) root.TrackMap = M;
})(typeof window !== 'undefined' ? window : null, function () {
  const HOLD = 0.2, FADE = 0.25, EPS = 1e-4;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function src2out(ts, keep) {
    let acc = 0;
    for (const [a, b] of keep) { if (ts >= a - EPS && ts <= b + EPS) return acc + clamp(ts - a, 0, b - a); acc += b - a; }
    return null;   // جزء محذوف
  }
  // تأطير «cover» الافتراضي (نفس MV.video بملء الشاشة): الفيديو sw×sh يغطي 1080×1920، والعمودي حسب faceAnchor
  function coverMap(sw, sh, fa) {
    const R = { x: 0, y: 0, w: 1080, h: 1920 }, sc = Math.max(R.w / sw, R.h / sh), cw = R.w / sc, ch = R.h / sc;
    return Object.assign(R, { sc, sx: (sw - cw) / 2, sy: (sh - ch) * (fa == null ? 0.3 : fa), sw, sh });
  }
  const keyOf = tr => (tr.type === 'plane' ? 'quad' : tr.type === 'box' ? 'box' : 'points');
  function mapPt(p, M, kx, ky) { return [M.x + (p[0] * kx - M.sx) * M.sc, M.y + (p[1] * ky - M.sy) * M.sc]; }
  function mapShape(key, sh, M, kx, ky) {
    if (key === 'quad') return sh.map(p => mapPt(p, M, kx, ky));
    if (key === 'box') { const a = mapPt([sh[0], sh[1]], M, kx, ky), b = mapPt([sh[0] + sh[2], sh[1] + sh[3]], M, kx, ky); return [a[0], a[1], b[0] - a[0], b[1] - a[1]]; }
    const o = {}; for (const k in sh) o[k] = mapPt(sh[k], M, kx, ky); return o;
  }
  function prepare(track, opt) {
    opt = opt || {}; if (!track || !Array.isArray(track.frames) || !track.frames.length) return null;
    const key = keyOf(track), size = track.size || [1080, 1920], keep = opt.keep || [], src = track.clock === 'src' && keep.length;
    const frames = [];
    for (const f of track.frames) {
      if (!f || !f[key]) continue;
      const t = src ? src2out(f.t, keep) : f.t; if (t == null) continue;
      let M = typeof opt.map === 'function' ? opt.map(t) : null; if (!M) M = coverMap(size[0], size[1], opt.faceAnchor);
      const kx = (M.sw || size[0]) / size[0], ky = (M.sh || size[1]) / size[1];
      frames.push({ t: Math.round(t * 1000) / 1000, [key]: mapShape(key, f[key], M, kx, ky), conf: f.conf == null ? 1 : f.conf });
    }
    frames.sort((a, b) => a.t - b.t);
    return frames.length ? { type: track.type, key, fps: track.fps || 30, frames, name: track.name } : null;
  }
  const lerpS = (a, b, k) => (Array.isArray(a) ? a.map((v, i) => (Array.isArray(v) ? lerpS(v, b[i], k) : v + (b[i] - v) * k)) : Object.fromEntries(Object.keys(a).map(n => [n, b && b[n] ? lerpS(a[n], b[n], k) : a[n]])));
  function shapeAt(prep, t) {
    const F = prep.frames, key = prep.key; if (t <= F[0].t) return F[0][key]; const L = F[F.length - 1]; if (t >= L.t) return L[key];
    let lo = 0, hi = F.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (F[m].t <= t) lo = m; else hi = m; }
    const a = F[lo], b = F[hi]; if (b.t - a.t > 3.5 / prep.fps) return a[key];   // فجوة (قص أو ضياع) = يقعد
    return lerpS(a[key], b[key], (t - a.t) / (b.t - a.t));
  }
  function at(prep, t) {
    if (!prep) return null; const F = prep.frames, a = F[0].t, b = F[F.length - 1].t, d = t < a ? a - t : t > b ? t - b : 0;
    const alpha = d <= HOLD ? 1 : clamp(1 - (d - HOLD) / FADE, 0, 1), sh = shapeAt(prep, t), out = { alpha, inside: d === 0 };
    if (prep.key === 'quad') { const q = sh; out.quad = q; out.center = [q.reduce((s, p) => s + p[0], 0) / 4, q.reduce((s, p) => s + p[1], 0) / 4];
      out.angle = Math.atan2(q[1][1] - q[0][1], q[1][0] - q[0][0]); out.size = [Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]), Math.hypot(q[3][0] - q[0][0], q[3][1] - q[0][1])];
      const xs = q.map(p => p[0]), ys = q.map(p => p[1]); out.box = [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)]; }
    else if (prep.key === 'box') { const b2 = sh; out.box = b2; out.center = [b2[0] + b2[2] / 2, b2[1] + b2[3] / 2]; out.angle = 0; out.size = [b2[2], b2[3]];
      out.quad = [[b2[0], b2[1]], [b2[0] + b2[2], b2[1]], [b2[0] + b2[2], b2[1] + b2[3]], [b2[0], b2[1] + b2[3]]]; }
    else { out.points = sh; const p = sh.p || sh[Object.keys(sh)[0]]; out.center = p; out.angle = 0; out.size = [0, 0]; }
    return out;
  }
  const forFX = prep => (prep ? { frames: prep.frames } : null);
  return { prepare, at, forFX, src2out, coverMap, HOLD, FADE };
});
