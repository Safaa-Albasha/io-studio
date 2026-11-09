#!/usr/bin/env node
/* ═══ render-preview-i.js — معاينات الحركات 329–352 (moves-plus-i.js · «كولاج تحريري ومونتاج المؤثرات») ═══
   node motion/moves/render-preview-i.js            → previews/329.mp4 … 336.mp4
   node motion/moves/render-preview-i.js 330 --keep → رقم محدد
   نفس طريقة render-preview-f.js. كل الأشياء مرسومة بالكود — بلا صور حقيقية لأحد. */
const D = {
  accentBeam: { draw: (ctx, t, FX, H) => { FX.editorialDecor(ctx, t, { s: 0, grid: false, barcode: false, copy: false });
    FX.trackedReveal(ctx, t, { s: 0.9, text: 'FRAME', lead: 'your day finally in one', y: 620, size: 120 }); FX.accentBeam(ctx, t, { s: 0.2, at: [300, 1520], angle: -38 }); } },
  sliceBand: { draw: (ctx, t, FX, H) => { FX.editorialDecor(ctx, t, { s: 0, grid: false, copy: false, barcode: false }); FX.sliceBand(ctx, t, { s: 0.6, labelTop: 'غني أو فقير', labelBottom: 'الكل ياخذ *نفس* اليوم' }); } },
  puzzleJoin: { draw: (ctx, t, FX, H) => { FX.editorialDecor(ctx, t, { s: 0, barcode: false, grid: { x: 120, y: 1300, w: 300, h: 200, step: 40 } }); FX.puzzleJoin(ctx, t, { s: 0.3, top: 'ناس *تصرفه*', bottom: 'وناس *تستثمره*' }); } },
  editorialDecor: { draw: (ctx, t, FX, H) => { FX.editorialDecor(ctx, t, { s: 0.2, copy: 'الفكرة بسيطة وصعبة: فكرة وحدة، كادر واحد، لون مميز واحد، والباقي يطلع من الطريق.' }); FX.trackedReveal(ctx, t, { s: 0.6, text: 'Time', size: 200, y: 660, spacing: 0.05 }); } },
  trackedReveal: { draw: (ctx, t, FX, H) => { const X = ctx.X; X.fillStyle = '#0C0B0A'; X.fillRect(0, 0, 1080, 1920); FX.trackedReveal(ctx, t, { s: 0.3, text: 'WAITS', sub: 'RETURNS', lead: 'It never', color: '#F2EEE6' }); } },
  showcaseGrid: { draw: (ctx, t, FX, H) => { FX.showcaseGrid(ctx, t, { s: 0.2, lead: 'عرض', title: 'موشن تحريري', items: [H.video(ctx), H.B(ctx), H.A(ctx)] }); } },
  indexTable: { dur: 5, draw: (ctx, t, FX, H) => { FX.effectCard(ctx, t, { s: 0, every: 0.9, box: { x: 250, y: 760, w: 580, h: 1000 }, names: ['مدار', 'جدار الكنبة', 'عالم الواجهات', 'كسر الإطار', 'تقريب'], clips: [H.video(ctx), H.B(ctx), H.A(ctx), H.video(ctx), H.B(ctx)], total: 17 });
    FX.indexTable(ctx, t, { s: 0, every: 0.9, y: 180, items: ['مدار', 'جدار الكنبة', 'عالم الواجهات', 'كسر الإطار', 'تقريب', 'جوال', 'قائمة صح', 'جدار العناوين', 'زوم عبر', 'رسم بياني', 'رجوع للخلف', 'قرين سكرين', 'قصاصة', 'رسم يرجف'] }); } },
  effectCard: { dur: 5, draw: (ctx, t, FX, H) => { FX.effectCard(ctx, t, { s: 0, every: 1.1, total: 17, clips: [H.video(ctx), H.B(ctx), H.A(ctx), H.video(ctx)] }); } },
  pinnedKeyword: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); FX.pinnedKeyword(ctx, t, { s: 0.2, pill: true, rays: true, word: 'ستايل', lines: ['اكتب', 'تحت', 'وأرسلك', 'القائمة كاملة', 'والأوامر.'], every: 0.6 }); } },
  bilingualCaption: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); FX.bilingualCaption(ctx, t, { text: 'الكل قاعد يمنتج فيديوهاته بنفس الأداة', s: 0.2, every: 0.45, sub: [{ text: "Everyone's editing", at: 0.2, hi: 'editing' }, { text: 'their videos with the same tool', at: 1.1, hi: 'same' }] }); } },
  glassTags: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); FX.glassTags(ctx, t, { s: 0.3, items: ['نفس المهارة', 'نفس الأداة', 'تتميز؟'], every: 0.5 }); } },
  sourceCard: { dur: 5, draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); FX.sourceCard(ctx, t, { s: 0.2, every: 1.5 }); } },
  wordSlate: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); FX.wordSlate(ctx, t, { s: 0.8, words: ['هذي خمس', 'مهارات', 'مونتاج'], every: 0.6 }); } },
  iconJiggle: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); FX.iconJiggle(ctx, t, { s: 0.3, remove: [1] }); } },
  colorSlider: { dur: 4.5, draw: (ctx, t, FX, H) => { FX.colorSlider(ctx, t, { s: 0.4, draw: H.video(ctx) }); } },
  eyedropper: { draw: (ctx, t, FX, H) => { FX.eyedropper(ctx, t, { s: 0.4, at: [640, 760], draw: H.video(ctx) }); } },
  hookBanner: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); FX.hookBanner(ctx, t, { s: 0.2, lines: ['ميزة جديدة في *الأداة*', 'رهيبة وبتسهل عليك'] }); } },
  appBadge: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); FX.hookBanner(ctx, t, { s: 0, lines: ['ميزة جديدة في *الأداة*', 'رهيبة وبتسهل عليك'] }); FX.appBadge(ctx, t, { s: 0.4, name: 'الأداة' }); } },
  docuScene: { dur: 5, draw: (ctx, t, FX, H) => { if (t < 2.4) { FX.docuScene(ctx, t, { s: 0, out: 2.1, title: 'النينجا', kicker: 'ما لبس أبداً' }); FX.selectBox(ctx, t, { s: 0.9, out: 2.1, text: 'أسود', y: 1430, size: 130 }); }
    else FX.docuScene(ctx, t, { s: 2.4, title: 'المسرح', kicker: 'غالباً جا من', label: 'عمّال الكواليس', dir: 'right' }); } },
  selectBox: { draw: (ctx, t, FX, H) => { FX.docuScene(ctx, t, { s: 0, title: 'النينجا', kicker: 'ما لبس أبداً' }); FX.selectBox(ctx, t, { s: 0.8, text: 'أسود', y: 1440, size: 140 }); } },
  fadeNumber: { draw: (ctx, t, FX, H) => { FX.docuScene(ctx, t, { s: 0, title: false, subject: Y => { Y.save(); Y.translate(0, 120); FX._g.fakeSrc && 0; Y.restore(); } }); FX.fadeNumber(ctx, t, { s: 0.3, value: '1801', kicker: 'عصر مسرح الكابوكي' }); } },
  squareLabel: { draw: (ctx, t, FX, H) => { FX.docuScene(ctx, t, { s: 0, title: 'وبعدين السينما نشرته', subject: () => {}, bg: () => {} }); FX.squareLabel(ctx, t, { s: 0.8, text: 'للعالم', y: 520 }); } },
  showcaseFrame: { draw: (ctx, t, FX, H) => { FX.showcaseFrame(ctx, t, { s: 0.1, draw: Y => { const c2 = Object.assign({}, ctx, { X: Y, P: ctx.P, FX: ctx.FX }); FX.docuScene(c2, 3, { s: 0, title: 'النينجا', kicker: 'ما لبس أبداً' }); FX.selectBox(c2, 3, { s: 0, text: 'أسود', y: 1440, size: 140 }); } }); } },
  starSting: { draw: (ctx, t, FX, H) => { const X = ctx.X; X.fillStyle = '#F4F4F4'; X.fillRect(0, 0, 1080, 1920); FX.starSting(ctx, t, { s: 0.3 }); } },
};
module.exports = D;

if (require.main === module) {
  const path = require('path'), { spawnSync } = require('child_process');
  const args = process.argv.slice(2), nums = args.filter(a => /^\d+(-\d+)?$/.test(a)), rest = args.filter(a => !/^\d+(-\d+)?$/.test(a));
  const r = spawnSync('node', [path.join(__dirname, 'render-preview.js'), ...(nums.length ? nums : ['329-352']), '--demos', __filename, ...rest], { stdio: 'inherit' });
  process.exit(r.status || 0);
}
