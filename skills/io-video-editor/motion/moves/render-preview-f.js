#!/usr/bin/env node
/* ═══ render-preview-f.js — معاينات الحركات 265–283 (moves-plus-f.js · باقة «أنظمة الموشن») ═══
   node motion/moves/render-preview-f.js                 → previews/265.mp4 … 283.mp4
   node motion/moves/render-preview-f.js 268 276 --keep  → أرقام محددة (أي خيار ثاني يمشي لـrender-preview.js، مثلاً --strips <مجلد> أو --palette '{…}')
   نفس طريقة render-preview-e.js: ديموهات (module.exports) + مشغّل يستدعي render-preview.js بـ--demos على نفسه.
   كل الصور بالمعاينات مرسومة بالكود (كريستالات وأغراض ورق) — بلا صور حقيقية لأحد. */
const D = {
  /* ── خلفية وعنوان ── */
  starfieldBg: { draw: (ctx, t, FX, H) => { FX.starfieldBg(ctx, t, { s: 0, frame: true });
    FX.capsuleHeadline(ctx, t, { s: 0.3, kicker: 'AI · WHICH ONE?', lead: 'كل يوم نفس السؤال', text: 'يا *AI* أحسن؟', y: 330 }); } },
  capsuleHeadline: { draw: (ctx, t, FX, H) => { FX.capsuleHeadline(ctx, t, { s: 0.2, out: 3.4, kicker: '7 TERMS', lead: 'تسمعها كل يوم وما تعرف معناها؟', text: '7 *مصطلحات* لازم تعرفها', y: 720, size: 100 }); } },
  /* ── واجهات ── */
  uiTabsCard: { draw: (ctx, t, FX, H) => { FX.starfieldBg(ctx, t, { s: 0 });
    FX.capsuleHeadline(ctx, t, { s: 0.1, lead: 'كل يوم نفس السؤال', text: 'منو *أحسن*؟', y: 330 });
    FX.uiTabsCard(ctx, t, { s: 0.2, tabs: ['ChatGPT', 'Claude', 'Gemini'], note: '«منو أحسن؟» … ونرجع نسأل', badge: 'جرّب، لا تسأل', settle: 2.6, pick: 1 }); } },
  timelineEdit: { dur: 6, draw: (ctx, t, FX, H) => { FX.timelineEdit(ctx, t, { s: 0, dur: 3.4, check: '✓ يشبه كلامك؟' }); } },
  progressChips: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X);
    FX.progressChips(ctx, t, { s: 0.2, shake: 1.2, out: 2.0, done: { label: 'منشور', sub: '1 PROJECT · DONE', at: 2.4 } }); } },
  cornerGlow: { draw: (ctx, t, FX, H) => { FX.cornerGlow(ctx, t, { s: 0, corner: 'tr' });
    FX.capsuleHeadline(ctx, t, { s: 0.3, kicker: 'AI · 7 TERMS', lead: 'تسمعها كل يوم؟', text: '7 *مصطلحات* لازم تعرفها', y: 700 }); } },
  /* ── أنظمة كاميرا ── */
  calendarGlide: { dur: 5, draw: (ctx, t, FX, H) => { FX.calendarGlide(ctx, t, { s: 0, lit: 7, values: ['1.2K', '800', '2.4K', '950', '3.1K', '1.7K', '4.0K'], title: 'يوم *بيوم*', sub: 'مثال · أرقام للتوضيح' }); } },
  depthGrid: { dur: 6.5, draw: (ctx, t, FX, H) => { FX.depthGrid(ctx, t, { s: 0, hold: 1.3, glide: 0.8 }); } },
  readmeScroll: { dur: 4.5, draw: (ctx, t, FX, H) => { FX.capsuleHeadline(ctx, t, { s: 0, lead: 'الأولى', text: 'شغّل موديلات *على جهازك*', y: 290, size: 70 });
    FX.readmeScroll(ctx, t, { s: 0.1, url: 'github.com / owner / local-models', title: 'local-models', code: ['$ lm run model', '$ lm list', '$ lm pull model-2'] }); } },
  starSweep: { draw: (ctx, t, FX, H) => { FX.starSweep(ctx, t, { s: 1.4, dur: 0.7, A: H.A(ctx), B: H.B(ctx) }); } },
  /* ── خطوات وأشياء ── */
  promptStep: { draw: (ctx, t, FX, H) => { FX.promptStep(ctx, t, { s: 0.1, out: 3.4, n: 1, total: 4, lead: 'ابدي بـ', key: 'ROLE', prompt: 'أنت مسوّق لمحل قهوة صغير بالمدينة.', tag: '/role', sub: 'يعرف', note: '*منو* هو' }); } },
  polaroidString: { dur: 6.5, draw: (ctx, t, FX, H) => { FX.polaroidString(ctx, t, { s: 0, every: 0.7 }); } },
  giantWordObject: { draw: (ctx, t, FX, H) => { FX.giantWordObject(ctx, t, { s: 0.1, word: 'تلفونك', lead: 'بتلفونك', text: 'يكتبلك *رسالة*', swapAt: 2.2 }); } },
  wordProps: { dur: 4.5, draw: (ctx, t, FX, H) => { FX.wordProps(ctx, t, { s: 0.6 }); } },
  /* ── رؤية · انتقال · نص · بناء · خلفية ── */
  detectBoxes: { draw: (ctx, t, FX, H) => { FX.detectBoxes(ctx, t, { s: 0.2, draw: H.video(ctx), boxes: [{ x: 360, y: 560, w: 360, h: 420, label: 'وجه', score: 98 }, { x: 160, y: 1000, w: 760, h: 760, label: 'شخص', score: 95 }] }); } },
  lightLineWipe: { draw: (ctx, t, FX, H) => { FX.lightLineWipe(ctx, t, { s: 1.6, dur: 0.4, A: H.A(ctx), B: H.B(ctx) }); } },
  rtlWipeText: { draw: (ctx, t, FX, H) => { FX.rtlWipeText(ctx, t, { s: 0.3, out: 3.4, lead: 'كل قرار', text: '*استراتيجية*', line: true }); } },
  planToBuild: { dur: 4.5, draw: (ctx, t, FX, H) => { FX.planToBuild(ctx, t, { s: 0.1, title: 'من المخطط *للبناية*' }); } },
  luxWaves: { draw: (ctx, t, FX, H) => { FX.luxWaves(ctx, t, { s: 0 });
    FX.capsuleHeadline(ctx, t, { s: 0.3, lead: 'خلفية الكروسيل', text: 'تموّج *فاخم*', y: 860 }); } },
};
module.exports = D;

if (require.main === module) {
  const path = require('path'), { spawnSync } = require('child_process');
  const args = process.argv.slice(2), nums = args.filter(a => /^\d+(-\d+)?$/.test(a)), rest = args.filter(a => !/^\d+(-\d+)?$/.test(a));
  const r = spawnSync('node', [path.join(__dirname, 'render-preview.js'), ...(nums.length ? nums : ['265-283']), '--demos', __filename, ...rest], { stdio: 'inherit' });
  process.exit(r.status || 0);
}
