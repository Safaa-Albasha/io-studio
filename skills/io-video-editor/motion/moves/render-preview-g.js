#!/usr/bin/env node
/* ═══ render-preview-g.js — معاينات الحركات 284–306 (moves-plus-g.js · باقة «مراجع الريلز» 1) ═══
   node motion/moves/render-preview-g.js                 → previews/284.mp4 … 306.mp4
   node motion/moves/render-preview-g.js 288 292 --keep  → أرقام محددة (أي خيار ثاني يمشي لـrender-preview.js، مثلاً --strips <مجلد>)
   نفس طريقة render-preview-f.js. «الشخص» بالمعاينات = صورة ظلية مرسومة (H.video) وقصّها مرسوم بالكود — بلا صور حقيقية لأحد. */
const D = {
  sharedMorph: { draw: (ctx, t, FX, H) => { const X = ctx.X; if (t < 1.6) { H.video(ctx)(X); } else { X.fillStyle = '#141414'; X.fillRect(0, 0, 1080, 1920); H.title(ctx, 'المشهد الثاني', 260); }
    FX.sharedMorph(ctx, t, { s: 1.6, from: { x: 90, y: 1620, w: 900, h: 110 }, to: { x: 90, y: 340, w: 900, h: 110 }, text: 'اكتب *فيديو* بالتعليقات' }); } },
  ditherResolve: { draw: (ctx, t, FX, H) => { const X = ctx.X; X.fillStyle = '#18181B'; X.fillRect(0, 0, 1080, 1920);
    FX.ditherResolve(ctx, t, { s: 1.6, wait: 1.3, dur: 0.6, draw: H.B(ctx), box: { x: 140, y: 380, w: 800, h: 1180, r: 28 } }); } },
  explodedCallouts: { dur: 5, draw: (ctx, t, FX, H) => {
    FX.explodedCallouts(ctx, t, { s: 0.2, parts: [{ label: 'الغطا', sub: 'سيليكون ناعم' }, { label: 'الفلتر', sub: 'شبك ناعم' }, { label: 'السماعة', sub: '11 مم' }, { label: 'البطارية', sub: 'خلية صغيرة' }, { label: 'الشريحة', sub: 'صوت · عزل' }], total: '5 أجزاء، مفكوكة' }); } },
  progressChip: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); FX.progressChip(ctx, t, { s: 0.2, every: 0.85, total: 24, names: ['زجاج', 'دولي زوم', 'مدار', 'قفل الوجه', 'قصاصة'] });
    FX.notesChecklist(ctx, t, { s: 0.2, every: 0.85, items: ['/زجاج', '/دولي-زوم', '/مدار', '/قفل-الوجه', '/قصاصة', '/بريق', '/كلمة-ورا', '/تقريب', '/نفق', '/ظلال', '/عد', '/رجوع'], title: 'مؤثرات تجرّبها', back: 'ملاحظات', date: 'اليوم' }); } },
  drosteTunnel: { draw: (ctx, t, FX, H) => { FX.drosteTunnel(ctx, t, { s: 0.6, draw: H.video(ctx) }); } },
  wallShadows: { draw: (ctx, t, FX, H) => { const person = Y => { Y.fillStyle = '#3A342C'; Y.beginPath(); Y.ellipse(540, 760, 150, 175, 0, 0, 6.283); Y.fill(); Y.beginPath(); Y.moveTo(160, 1920); Y.bezierCurveTo(160, 1150, 330, 990, 540, 990); Y.bezierCurveTo(750, 990, 920, 1150, 920, 1920); Y.fill(); };
    FX.wallShadows(ctx, t, { s: 0.6, draw: H.video(ctx), person }); } },
  tierBoard: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); FX.tierBoard(ctx, t, { s: 0.3, items: [{ row: 'S', text: 'اختيارك', at: 1.1 }, { row: 'B', text: 'البديل', at: 1.6 }] }); } },
  weightMorph: { draw: (ctx, t, FX, H) => { FX.weightMorph(ctx, t, { s: 1, lead: 'كلمة…', text: 'ثقيلة' }); } },
  dustDissolve: { draw: (ctx, t, FX, H) => { FX.dustDissolve(ctx, t, { s: 1.2, dur: 1.2, A: H.A(ctx), B: H.B(ctx) }); } },
  notesChecklist: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); FX.notesChecklist(ctx, t, { s: 0.2, every: 0.6, x: 690, y: 560, w: 360 }); } },
  slashCommand: { draw: (ctx, t, FX, H) => { FX.slashCommand(ctx, t, { s: 0.2 }); } },
  cardExpand: { draw: (ctx, t, FX, H) => { const X = ctx.X, A = Y => { Y.fillStyle = '#18181B'; Y.fillRect(0, 0, 1080, 1920); ctx.text(Y, '✳ Animating…', 80, 300, { family: 'num', size: 30, color: '#9A9AA0', align: 'left' }); };
    FX.cardExpand(ctx, t, { s: 1.6, A, B: H.B(ctx), rect: { x: 60, y: 380, w: 520, h: 924, r: 24 } }); } },
  slotList: { dur: 5, draw: (ctx, t, FX, H) => { FX.slotList(ctx, t, { s: 0, every: 0.45, labels: ['أنمي', 'مجرّة', 'مدينة مكعبات', 'كروم سائل', 'نيون', 'جرافيتي', 'هولوجرام', 'كريستال', 'ستيمبنك', 'زيتية'] }); } },
  ctaRetype: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); FX.ctaRetype(ctx, t, { s: 0, every: 4, at: 0.8, text: 'اكتب {kw} بالتعليقات للشرح كامل', kw: 'فيديو' }); } },
  headlineAccrue: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); FX.headlineAccrue(ctx, t, { lines: [{ text: '14 ألف متابع', at: 0.2 }, { text: 'من ريل واحد', at: 1.2, color: 'pale' }, { text: '6 خطوات', at: 2.2, size: 70 }] }); } },
  stepCard: { draw: (ctx, t, FX, H) => { FX.stepCard(ctx, t, { s: 0, n: 1, sub: 'انشر أقل محتوى', script: 'أقل', clip: H.video(ctx) }); } },
  pipNote: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); FX.pipNote(ctx, t, { s: 0.3, note: 'منو أنت', clip: H.B(ctx) }); } },
  mirrorQuad: { draw: (ctx, t, FX, H) => { FX.mirrorQuad(ctx, t, { s: 0.5, draw: H.video(ctx) }); ctx.text(ctx.X, 'لا تستعجل', 540, 980, { family: 'display', size: 90, color: '#FFFFFF', alpha: ctx.at(t, 1, 1.4) }); } },
  proofAvatars: { draw: (ctx, t, FX, H) => { const X = ctx.X; X.fillStyle = '#4A4440'; X.fillRect(0, 0, 1080, 1920); FX.proofAvatars(ctx, t, { s: 0.4, items: [{ name: 'creator.one', delta: '+500K' }, { name: 'maker.two', delta: '+100K' }, { name: 'studio.three', delta: '+35K' }] }); } },
  measureRuler: { draw: (ctx, t, FX, H) => { FX.measureRuler(ctx, t, { s: 1, lead: 'الكتابة…', text: 'تتمدد', stretch: 240 }); } },
  takeStrip: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); FX.takeStrip(ctx, t, { s: 0.5, draw: H.video(ctx) }); } },
  laserSlice: { draw: (ctx, t, FX, H) => { FX.laserSlice(ctx, t, { s: 1.4, dur: 0.6, A: H.A(ctx), B: H.B(ctx) }); } },
  asciiSubject: { draw: (ctx, t, FX, H) => { FX.asciiSubject(ctx, t, { s: 0.8, out: 3.2, draw: H.video(ctx), invert: true }); } },
};
module.exports = D;

if (require.main === module) {
  const path = require('path'), { spawnSync } = require('child_process');
  const args = process.argv.slice(2), nums = args.filter(a => /^\d+(-\d+)?$/.test(a)), rest = args.filter(a => !/^\d+(-\d+)?$/.test(a));
  const r = spawnSync('node', [path.join(__dirname, 'render-preview.js'), ...(nums.length ? nums : ['284-306']), '--demos', __filename, ...rest], { stdio: 'inherit' });
  process.exit(r.status || 0);
}
