#!/usr/bin/env node
/* ═══ render-preview-e.js — معاينات الحركات 243–264 (moves-plus-e.js · باقة «أنمي وكرتون») ═══
   node motion/moves/render-preview-e.js                 → previews/243.mp4 … 264.mp4
   node motion/moves/render-preview-e.js 245 259 --keep  → أرقام محددة (أي خيار ثاني يمشي لـrender-preview.js، مثلاً --strips <مجلد>)
   نفس طريقة render-preview-d.js: ديموهات (module.exports) + مشغّل يستدعي render-preview.js بـ--demos على نفسه.
   «صورة الشخص» (chibiPhoto) مرسومة بالكود (FACE تحت، نفس وجه render-preview-d.js) — بلا أي صورة حقيقية لأحد. */
const FACE = String.raw`
const face = () => { if (FX._demoFace) return FX._demoFace; const c = document.createElement('canvas'); c.width = 400; c.height = 480; const Y = c.getContext('2d');
  const g = Y.createLinearGradient(0, 0, 0, 480); g.addColorStop(0, '#9FC3D9'); g.addColorStop(1, '#5E8BA8'); Y.fillStyle = g; Y.fillRect(0, 0, 400, 480);
  Y.fillStyle = '#2E2A33'; Y.beginPath(); Y.moveTo(30, 480); Y.bezierCurveTo(40, 380, 120, 340, 200, 340); Y.bezierCurveTo(280, 340, 360, 380, 370, 480); Y.fill();
  Y.fillStyle = '#C48A66'; Y.fillRect(165, 290, 70, 70);
  Y.fillStyle = '#2B1D16'; Y.beginPath(); Y.ellipse(200, 165, 118, 120, 0, 0, 6.283); Y.fill();
  Y.fillStyle = '#D19A74'; Y.beginPath(); Y.ellipse(200, 205, 96, 118, 0, 0, 6.283); Y.fill();
  Y.fillStyle = '#2B1D16'; Y.beginPath(); Y.ellipse(196, 112, 104, 48, -0.12, 0, 6.283); Y.fill();
  Y.fillStyle = '#1C1410'; [[162, 200], [238, 200]].forEach(([x, y]) => { Y.beginPath(); Y.ellipse(x, y, 11, 13, 0, 0, 6.283); Y.fill(); });
  Y.strokeStyle = '#2B1D16'; Y.lineWidth = 7; Y.lineCap = 'round'; Y.beginPath(); Y.moveTo(140, 172); Y.lineTo(182, 168); Y.moveTo(218, 168); Y.lineTo(260, 172); Y.stroke();
  Y.strokeStyle = '#A86D4A'; Y.lineWidth = 5; Y.beginPath(); Y.moveTo(200, 210); Y.lineTo(192, 248); Y.lineTo(206, 250); Y.stroke();
  Y.strokeStyle = '#8A3B2C'; Y.lineWidth = 7; Y.beginPath(); Y.arc(200, 262, 30, 0.2, Math.PI - 0.2); Y.stroke();
  return (FX._demoFace = c); };
`;
const F = body => ({ draw: new Function('ctx', 't', 'FX', 'H', FACE + '\n' + body) });
const AB = (id, s, extra) => ({ draw: new Function('ctx', 't', 'FX', 'H', `FX.${id}(ctx, t, Object.assign({ s: ${s}, A: H.A(ctx), B: H.B(ctx) }, ${extra || '{}'}));`) });
const D = {
  /* ── أ) كاميرا وضربات ── */
  speedLines: { draw: (ctx, t, FX, H) => { const P = ctx.P;
    FX.speedLines(ctx, t, { s: 0.05, e: 1.95, mode: 'parallel', angle: -8, clear: 150 });
    FX.speedLines(ctx, t, { s: 2.0, x: 540, y: 900, inner: 330 });
    ctx.text(ctx.X, 'انطلق!', 540, 950, { family: 'cairo', weight: 900, size: 170, color: P.acc, stroke: { width: 26, color: '#1B1A17' } }); } },
  focusBurst: { draw: (ctx, t, FX, H) => { FX.focusBurst(ctx, t, { s: 0.2, text: 'فجأة!' }); } },
  impactFrame: { draw: (ctx, t, FX, H) => { FX.impactFrame(ctx, t, { s: 1.3, draw: H.video(ctx), at: [540, 760], text: 'لا!' }); } },
  dramaZoom: { draw: (ctx, t, FX, H) => { FX.dramaZoom(ctx, t, { s: 0.6, draw: H.video(ctx), at: [540, 760], out: 3.0 }); } },
  /* ── ب) علامات فوق نقطة (H.video = متحدث، راسه عند 540,760) ── */
  twinkleStars: { draw: (ctx, t, FX, H) => { const P = ctx.P; ctx.text(ctx.X, 'الإصدار الجديد', 540, 960, { family: 'cairo', weight: 900, size: 120, color: P.ink });
    FX.twinkleStars(ctx, t, { s: 0.2, x: 540, y: 900, r: 420, count: 11 }); } },
  sweatDrop: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); FX.sweatDrop(ctx, t, { s: 0.4, x: 735, y: 650 }); } },
  angerMark: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); FX.angerMark(ctx, t, { s: 0.4, x: 690, y: 590 }); } },
  shockMarks: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); FX.shockMarks(ctx, t, { s: 0.4, x: 540, y: 560, repeat: 3 }); } },
  questionPop: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); FX.questionPop(ctx, t, { s: 0.4, x: 720, y: 520 }); } },
  exclaimPop: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); FX.exclaimPop(ctx, t, { s: 0.4, x: 540, y: 470 }); } },
  /* ── ج) دخول وطلعة ونص ── */
  entranceShine: { draw: (ctx, t, FX, H) => { FX.entranceShine(ctx, t, { s: 0.2, text: 'عرض حصري', again: 1.6 }); } },
  poofSmoke: { draw: (ctx, t, FX, H) => { const P = ctx.P;
    FX.poofSmoke(ctx, t, { s: 1.4, word: 'بوف!', draw: Y => { Y.fillStyle = '#1B1A17'; Y.beginPath(); Y.roundRect(250, 790, 590, 230, 50); Y.fill(); Y.fillStyle = P.acc; Y.beginPath(); Y.roundRect(240, 776, 590, 230, 50); Y.fill();
      ctx.text(Y, 'الطريقة القديمة', 535, 920, { family: 'cairo', weight: 900, size: 70, color: '#FFFFFF' }); } });
    ctx.text(ctx.X, 'خلاص… راحت', 540, 1380, { family: 'cairo', weight: 800, size: 80, color: P.ink, alpha: ctx.at(t, 2.3, 2.7) }); } },
  boldShout: { draw: (ctx, t, FX, H) => { FX.boldShout(ctx, t, { s: 0.3, text: 'مستحيل!' }); } },
  onoBurst: { draw: (ctx, t, FX, H) => { FX.onoBurst(ctx, t, { s: 0.1, words: ['بووم', 'ووش', 'طاخ'], every: 1.3 }); } },
  comicBubble: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X);
    FX.comicBubble(ctx, t, { s: 0.1, out: 1.2, shape: 'round', text: 'هلا! اليوم عندي لكم سر', tail: [470, 640], y: 380, from: '@io.creator' });
    FX.comicBubble(ctx, t, { s: 1.45, out: 2.6, shape: 'spiky', text: 'لا تسوونها أبداً!', tail: [480, 640], y: 380 });
    FX.comicBubble(ctx, t, { s: 2.85, shape: 'thought', text: 'طيب… وش الحل؟', tail: [600, 610], y: 330 }); } },
  /* ── د) تشيبي ونجوم وخلفية ── */
  chibiReact: { draw: (ctx, t, FX, H) => { FX.chibiReact(ctx, t, { s: 0.1, moods: ['happy', 'shocked', 'thinking', 'crying'], every: 0.97, gender: 'female', body: true, y: 760, size: 220 }); } },
  chibiPhoto: F(`FX.chibiPhoto(ctx, t, { s: 0.1, photo: face(), gender: 'male', name: 'خالد', moods: ['happy', 'shocked', 'thinking', 'crying'], every: 0.97, y: 840, eyes: [[-0.2, -0.02], [0.2, -0.02]] });`),
  starBurst: { draw: (ctx, t, FX, H) => { const P = ctx.P; FX.starBurst(ctx, t, { s: 0.3, y: 860 });
    ctx.text(ctx.X, '100 ألف!', 540, 920, { family: 'cairo', weight: 900, size: 160, color: P.acc, stroke: { width: 24, color: '#1B1A17' }, alpha: ctx.at(t, 0.3, 0.5) }); } },
  halftoneBg: { draw: (ctx, t, FX, H) => { const P = ctx.P; FX.halftoneBg(ctx, t, { s: 0.1, rays: true });
    ctx.text(ctx.X, 'الحلقة 2', 540, 900, { family: 'cairo', weight: 900, size: 180, color: P.ink, alpha: ctx.at(t, 0.6, 1.0) }); } },
  /* ── هـ) انتقالات ── */
  mangaPanels: AB('mangaPanels', 1.0),
  brushWipe: AB('brushWipe', 1.2),
  spiralWipe: AB('spiralWipe', 1.2),
};
module.exports = D;

if (require.main === module) {
  const path = require('path'), { spawnSync } = require('child_process');
  const args = process.argv.slice(2), nums = args.filter(a => /^\d+(-\d+)?$/.test(a)), rest = args.filter(a => !/^\d+(-\d+)?$/.test(a));
  const r = spawnSync('node', [path.join(__dirname, 'render-preview.js'), ...(nums.length ? nums : ['243-264']), '--demos', __filename, ...rest], { stdio: 'inherit' });
  process.exit(r.status || 0);
}
