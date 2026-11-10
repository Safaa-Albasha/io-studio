#!/usr/bin/env node
/* ═══ render-preview-j.js — معاينات الحركات 353–354 (FX.pixelList · FX.explode داخل motion/moves.js — من video-ad-editor 6.5، MIT) ═══
   node motion/moves/render-preview-j.js            → previews/353.mp4 · 354.mp4
   نفس طريقة render-preview-i.js. الألوان من ثيم المعاينة (P.acc …) — بلا أسماء ولا منتجات حقيقية. */
const D = {
  pixelList: { dur: 5, draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X);
    FX.pixelList(ctx, t, { s: 0.3, out: 4.4, y: 1000, size: 50, titleSize: 70, title: 'شنو بتتعلم؟',
      items: [{ text: 'موشن قرافيكس', at: 0.9 }, { text: 'قصّ الشعر الناعم', at: 1.7 }, { text: 'كلام ورا الراس', at: 2.4 }, { text: 'بدون برامج مونتاج', at: 3.1 }] }); } },
  explode: { dur: 5, draw: (ctx, t, FX, H) => { H.bg(ctx); H.title(ctx, 'طبقات الحماية');
    FX.explode(ctx, t, { s: 0.4, out: 4.3, n: 7, x: 540, y: 1250, w: 420,
      labels: [{ i: 5, text: 'الحرارة', at: 1.6, side: 'r' }, { i: 2, text: 'الشحن الزايد', at: 2.4, side: 'l' }] }); } },
};
module.exports = D;

if (require.main === module) {
  const path = require('path'), { spawnSync } = require('child_process');
  const args = process.argv.slice(2), nums = args.filter(a => /^\d+(-\d+)?$/.test(a)), rest = args.filter(a => !/^\d+(-\d+)?$/.test(a));
  const r = spawnSync('node', [path.join(__dirname, 'render-preview.js'), ...(nums.length ? nums : ['353-354']), '--demos', __filename, ...rest], { stdio: 'inherit' });
  process.exit(r.status || 0);
}
