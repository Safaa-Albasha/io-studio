#!/usr/bin/env node
/* ═══ render-preview-k.js — معاينات الحركات 355–358 (moves-plus-k.js · «ريلز الأدوات والبودكاست») ═══
   node motion/moves/render-preview-k.js            → previews/355.mp4 … 358.mp4
   نفس طريقة render-preview-i.js. كل شي مرسوم بالكود — بلا صور حقيقية لأحد. */
const D = {
  speakerTag: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); FX.speakerTag(ctx, t, { s: 0.3, name: 'اسم الضيف', sub: 'الحلقة ١٢ · ريادة الأعمال' }); } },
  scoreRing: { dur: 4.5, draw: (ctx, t, FX, H) => { FX.scoreRing(ctx, t, { s: 0.2, value: 94, label: 'أقوى لقطة بالحلقة', reasons: ['يبدأ بسؤال', 'فيه رقم', 'فكرة كاملة'], y: 700 }); } },
  seriesDayTag: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); FX.seriesDayTag(ctx, t, { s: 0.3, day: 3, series: 'سلسلة الأدوات' }); } },
  commandCallout: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); FX.commandCallout(ctx, t, { s: 0.3, cmd: '/io-start شغّل البرنامج' }); } },
};
module.exports = D;

if (require.main === module) {
  const path = require('path'), { spawnSync } = require('child_process');
  const args = process.argv.slice(2), nums = args.filter(a => /^\d+(-\d+)?$/.test(a)), rest = args.filter(a => !/^\d+(-\d+)?$/.test(a));
  const r = spawnSync('node', [path.join(__dirname, 'render-preview.js'), ...(nums.length ? nums : ['355-358']), '--demos', __filename, ...rest], { stdio: 'inherit' });
  process.exit(r.status || 0);
}
