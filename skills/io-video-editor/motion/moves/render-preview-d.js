#!/usr/bin/env node
/* ═══ render-preview-d.js — معاينات الحركات 233–242 (moves-plus-d.js) ═══
   node motion/moves/render-preview-d.js                 → previews/233.mp4 … 242.mp4
   node motion/moves/render-preview-d.js 233 241 --keep  → أرقام محددة (أي خيار ثاني يمشي لـrender-preview.js)
   نفس طريقة render-preview-c.js: ديموهات (module.exports) + مشغّل يستدعي render-preview.js بـ--demos على نفسه.
   «صورة الشخص» بالمعاينات مرسومة بالكود (FACE تحت) — بلا أي صورة حقيقية لأحد. بمشروعك: photo: ctx.img('me') أو أي Image/Canvas. */
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
const D = {
  /* ── أ) شخصية كرتونية بصورة أي شخص ── */
  photoToon: F(`FX.photoToon(ctx, t, { s: 0.1, photo: face(), name: 'خالد', gender: 'male', say: 'هلا! اليوم بعلمكم سر بسيط' });`),
  photoToonPoint: F(`H.title(ctx, 'شوف هني', 250); FX.photoToonPoint(ctx, t, { s: 0.1, photo: face(), gender: 'male', name: 'أحمد', label: 'الزر الجديد', y: 700 });`),
  photoToonCard: { draw: (ctx, t, FX, H) => { FX.photoToonCard(ctx, t, { s: 0.1, gender: 'female', name: 'صورتك هني', card: 'الخطوة 1:\nاكتب الفكرة', y: 620 }); } },
  /* ── ب) قوالب واجهات ── */
  pricingTable: { draw: (ctx, t, FX, H) => { FX.pricingTable(ctx, t, { s: 0.1 }); } },
  appScreen: { draw: (ctx, t, FX, H) => { FX.appScreen(ctx, t, { s: 0.1, title: 'طلباتي', subtitle: '4 طلبات هالأسبوع' }); } },
  socialPost: { draw: (ctx, t, FX, H) => { FX.socialPost(ctx, t, { s: 0.1, name: 'آي أو استوديو', handle: '@io.creator' }); } },
  repoCard: { draw: (ctx, t, FX, H) => { H.title(ctx, 'مشروعي المفتوح', 380); FX.repoCard(ctx, t, { s: 0.1, name: 'studio/reel-kit' }); } },
  notifyBanner: { draw: (ctx, t, FX, H) => { FX.notifyBanner(ctx, t, { s: 0.1, every: 0.9 }); ctx.text(ctx.X, 'يوم الإطلاق', 540, 1250, { family: 'cairo', weight: 900, size: 110, color: ctx.P.ink, alpha: ctx.at(t, 2.2, 2.6) }); } },
  /* ── ج) منحنى البقاء ── */
  retentionCurve: { draw: (ctx, t, FX, H) => { FX.retentionCurve(ctx, t, { s: 0.1, duration: 30, avg: 45, draw: 2.2,
    points: [100, 96, 79, 72, 69, 66, 64, 62, 60, 59, 57, 56, 55, 54, 52, 51, 50, 48, 47, 46, 45, 44, 43, 33, 31, 30, 29, 28, 28, 27, 26] }); } },
  /* ── د) كلمة التعليق ← رسالة خاصة ── */
  commentKeyword: { draw: (ctx, t, FX, H) => { FX.commentKeyword(ctx, t, { s: 0.1, keyword: 'دليل', reward: 'الدليل', handle: '@io.creator' }); } },
};
module.exports = D;

if (require.main === module) {
  const path = require('path'), { spawnSync } = require('child_process');
  const args = process.argv.slice(2), nums = args.filter(a => /^\d+(-\d+)?$/.test(a)), rest = args.filter(a => !/^\d+(-\d+)?$/.test(a));
  const r = spawnSync('node', [path.join(__dirname, 'render-preview.js'), ...(nums.length ? nums : ['233-242']), '--demos', __filename, ...rest], { stdio: 'inherit' });
  process.exit(r.status || 0);
}
