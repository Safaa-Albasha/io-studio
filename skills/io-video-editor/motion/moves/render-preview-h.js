#!/usr/bin/env node
/* ═══ render-preview-h.js — معاينات الحركات 307–328 (moves-plus-h.js · باقة «مراجع الريلز» 2) ═══
   node motion/moves/render-preview-h.js                 → previews/307.mp4 … 328.mp4
   node motion/moves/render-preview-h.js 311 315 --keep  → أرقام محددة
   نفس طريقة render-preview-f.js. «الشخص» والمنتج مرسومين بالكود، والتتبّع بالمعاينة ملف .io صغير مكتوب هنا (حركة بسيطة) — بلا صور حقيقية لأحد. */
const D = {
  linkCard: { dur: 4.5, draw: (ctx, t, FX, H) => { FX.linkCard(ctx, t, { s: 0.2, name: 'اسمك هنا', sub: 'YOUR NAME', tagline: 'أعلّمك الذكاء الاصطناعي… *خطوة بخطوة*', links: [{ icon: 'camera', label: 'صور', url: 'example.com/you' }, { icon: 'play', label: 'فيديو', url: 'example.com/you' }, { icon: 'music', label: 'مقاطع', url: 'example.com/you' }, { icon: 'globe', label: 'الموقع', url: 'yoursite.com' }] }); } },
  editorMonitor: { draw: (ctx, t, FX, H) => { const selfie = Y => { Y.fillStyle = '#2E3B33'; Y.fillRect(0, 0, 1080, 1920); Y.fillStyle = '#56705F'; Y.beginPath(); Y.ellipse(540, 820, 300, 360, 0, 0, 6.283); Y.fill(); };
    FX.editorMonitor(ctx, t, { s: 0.6, out: 3.4, draw: H.video(ctx), selfie }); } },
  neonIcon: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); FX.neonIcon(ctx, t, { s: 0.3, icons: [{ name: 'bolt', x: 540, y: 420, size: 260 }, { name: 'spring', x: 300, y: 1450, size: 200 }, { name: 'wheel', x: 780, y: 1450, size: 200 }] }); } },
  iconCarousel: { dur: 5, draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); if (t < 2.4) FX.iconCarousel(ctx, t, { s: 0.2, out: 2.1, number: 5, icons: ['spring', 'wheel', 'bike', 'battery', 'bolt'] });
    else FX.iconCarousel(ctx, t, { s: 2.4, mode: 'wheel', every: 0.6, icons: ['spring', 'wheel', 'bike', 'battery', 'bolt'] }); } },
  surfaceText: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); const track = { frames: [{ t: 0, quad: [[260, 1320], [820, 1320], [980, 1660], [100, 1660]] }, { t: 4, quad: [[220, 1300], [800, 1290], [960, 1640], [60, 1660]] }] };
    FX.surfaceText(ctx, t, { s: 0.4, text: '2500 W', track }); } },
  objectRing: { draw: (ctx, t, FX, H) => { const X = ctx.X; H.video(ctx)(X); X.strokeStyle = '#222222'; X.lineWidth = 40; X.beginPath(); X.ellipse(540, 1250, 260, 120, -0.26, 0, 6.283); X.stroke();
    FX.objectRing(ctx, t, { s: 0.4, center: [540, 1250], radius: 300, tilt: 0.45, value: 40, unit: 'KM', label: 'بشحنة وحدة' }); } },
  eyeGlow: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); FX.eyeGlow(ctx, t, { s: 0.6, out: 3.2, face: tt => ({ x: 390 + 20 * Math.sin(tt), y: 585, w: 300, h: 350 }) }); } },
  objectGlow: { draw: (ctx, t, FX, H) => { const X = ctx.X; H.video(ctx)(X); const box = { x: 300, y: 1250, w: 480, h: 260, r: 26 }; X.fillStyle = '#26262A'; X.beginPath(); X.roundRect(box.x, box.y, box.w, box.h, 26); X.fill();
    FX.objectGlow(ctx, t, { s: 0.5, box, hold: 1.4 }); } },
  holoPanel: { dur: 4.5, draw: (ctx, t, FX, H) => { const X = ctx.X; H.video(ctx)(X); X.fillStyle = '#26262A'; X.beginPath(); X.roundRect(560, 1300, 360, 240, 22); X.fill();
    FX.holoPanel(ctx, t, { s: 0.3, at: [330, 1000], anchor: [600, 1330], title: 'بطارية ليثيوم', lines: ['60V', '27Ah'] }); } },
  photoStackCard: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); FX.photoStackCard(ctx, t, { s: 0.2, out: 3.2, title: 'دراجة ترابية' }); } },
  faceLock: { draw: (ctx, t, FX, H) => { FX.faceLock(ctx, t, { s: 0.6, draw: H.video(ctx), face: { x: 390, y: 585, w: 300, h: 350 }, tag: 'TARGET LOCKED' }); } },
  glitterTitle: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); FX.glitterTitle(ctx, t, { s: 0.3, text: 'لمعة', size: 220, y: 440 }); } },
  viewfinderZoom: { draw: (ctx, t, FX, H) => { FX.viewfinderZoom(ctx, t, { s: 0.3, draw: H.video(ctx), face: { x: 390, y: 585, w: 300, h: 350 }, cues: [0.5, 1.2, 1.9, 2.6] }); } },
  halftoneSubject: { draw: (ctx, t, FX, H) => { FX.halftoneSubject(ctx, t, { s: 0.6, out: 3, draw: H.video(ctx), invert: true }); } },
  thumbWall: { draw: (ctx, t, FX, H) => { const person = Y => { Y.fillStyle = '#3A342C'; Y.beginPath(); Y.ellipse(540, 760, 150, 175, 0, 0, 6.283); Y.fill(); Y.beginPath(); Y.moveTo(160, 1920); Y.bezierCurveTo(160, 1150, 330, 990, 540, 990); Y.bezierCurveTo(750, 990, 920, 1150, 920, 1920); Y.fill(); };
    if (t < 2.2) FX.thumbWall(ctx, t, { s: 0.3, out: 2, draw: H.video(ctx), person, label: 'متابع', button: 'تتابعه' }); else FX.thumbWall(ctx, t, { s: 2.4, mode: 'pullback', draw: H.video(ctx) }); } },
  monoPoster: { draw: (ctx, t, FX, H) => { const person = Y => { Y.fillStyle = '#3A342C'; Y.beginPath(); Y.ellipse(540, 760, 150, 175, 0, 0, 6.283); Y.fill(); Y.beginPath(); Y.moveTo(160, 1920); Y.bezierCurveTo(160, 1150, 330, 990, 540, 990); Y.bezierCurveTo(750, 990, 920, 1150, 920, 1920); Y.fill(); };
    FX.monoPoster(ctx, t, { s: 0.5, draw: H.video(ctx), person, word: 'مجاني', lines: ['كليب واحد.', '24 مؤثر.', 'بلا تطبيقات.'] }); } },
  moodGrade: { draw: (ctx, t, FX, H) => { FX.moodGrade(ctx, t, { s: 0.6, out: 2.4, look: 'moody', draw: H.video(ctx) }); if (t > 2.6) FX.moodGrade(ctx, t, { s: 2.8, look: 'warm', draw: H.video(ctx) }); } },
  flipClock: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); FX.flipClock(ctx, t, { s: 0.3, from: [2, 20], labels: ['ساعة', 'دقيقة'] }); } },
  cardFan: { dur: 5, draw: (ctx, t, FX, H) => { const person = Y => { Y.fillStyle = '#3A342C'; Y.beginPath(); Y.ellipse(540, 760, 150, 175, 0, 0, 6.283); Y.fill(); Y.beginPath(); Y.moveTo(160, 1920); Y.bezierCurveTo(160, 1150, 330, 990, 540, 990); Y.bezierCurveTo(750, 990, 920, 1150, 920, 1920); Y.fill(); };
    H.video(ctx)(ctx.X); if (t < 2.4) FX.cardFan(ctx, t, { s: 0.2, out: 2.1 }); else FX.cardFan(ctx, t, { s: 2.5, mode: 'behind', person }); } },
  giantPair: { draw: (ctx, t, FX, H) => { const person = Y => { Y.fillStyle = '#3A342C'; Y.beginPath(); Y.ellipse(540, 760, 150, 175, 0, 0, 6.283); Y.fill(); Y.beginPath(); Y.moveTo(160, 1920); Y.bezierCurveTo(160, 1150, 330, 990, 540, 990); Y.bezierCurveTo(750, 990, 920, 1150, 920, 1920); Y.fill(); };
    H.video(ctx)(ctx.X); FX.giantPair(ctx, t, { s: 0.4, a: 'ضخم', b: 'كابشن', person }); } },
  gradHeadline: { draw: (ctx, t, FX, H) => { FX.stageCones(ctx, t, { s: 0 }); FX.gradHeadline(ctx, t, { s: 0.2, text: 'فيديوهات *تنتشر*', sub: 'بطلب واحد في {spark} أي أداة' }); } },
  stageCones: { draw: (ctx, t, FX, H) => { FX.stageCones(ctx, t, { s: 0, hero: { x: 540, y: 600, w: 440, h: 800 } }); } },
};
module.exports = D;

if (require.main === module) {
  const path = require('path'), { spawnSync } = require('child_process');
  const args = process.argv.slice(2), nums = args.filter(a => /^\d+(-\d+)?$/.test(a)), rest = args.filter(a => !/^\d+(-\d+)?$/.test(a));
  const r = spawnSync('node', [path.join(__dirname, 'render-preview.js'), ...(nums.length ? nums : ['307-328']), '--demos', __filename, ...rest], { stdio: 'inherit' });
  process.exit(r.status || 0);
}
