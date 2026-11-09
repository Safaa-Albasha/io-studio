#!/usr/bin/env node
/* ═══ render-preview-b.js — معاينات الحركات 151–200 (moves-plus-b.js) ═══
   node motion/moves/render-preview-b.js                 → previews/151.mp4 … 200.mp4
   node motion/moves/render-preview-b.js 158 163 --keep  → أرقام محددة (أي خيار ثاني يمشي لـrender-preview.js)
   هالملف = ديموهات (module.exports) + مشغّل: يستدعي render-preview.js (نفس المحرّك engine.html، كروم بلا واجهة، 540×960 · 30fps · CRF 30)
   بـ--demos على نفسه. كل ديمو: { dur?, draw: (ctx, t, FX, H) => {…} } و t = الوقت المحلي من 0 (الخلفية H.bg تنرسم قبله).
   الدالة تنسخ كنص لصفحة المحرّك، فلازم تكون مستقلة: ctx وFX وH بس (H.bg · H.title · H.video(ctx,label) · H.A(ctx) · H.B(ctx)). */
const D = {
  /* ── أ) جزيئات واحتفال ── */
  sparkBurst: { draw: (ctx, t, FX, H) => { H.title(ctx, 'لحظة الإعلان'); FX.sparkBurst(ctx, t, { s: 0.6, text: 'وصلنا!', y: 960, out: 3.4 }); } },
  balloonRise: { draw: (ctx, t, FX, H) => { FX.balloonRise(ctx, t, { s: 0.1, pop: 1.6, text: 'مبروك', out: 3.5 }); } },
  dustLight: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); FX.dustLight(ctx, t, { s: 0.1 }); ctx.text(ctx.X, 'خذ نفس', 540, 1420, { family: 'display', size: 120, color: '#FFFFFF', alpha: ctx.at(t, 0.8, 1.6) }); } },
  bokehDrift: { draw: (ctx, t, FX, H) => { const X = ctx.X; X.fillStyle = ctx.P.ink; X.fillRect(0, 0, 1080, 1920); FX.bokehDrift(ctx, t, { s: 0 });
    ctx.text(X, 'ليلة هادية', 540, 990, { family: 'display', size: 150, color: ctx.P.bg, alpha: ctx.at(t, 0.6, 1.4) }); } },
  iconRain: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); FX.iconRain(ctx, t, { s: 0.2, dur: 2.2, out: 3.4 }); } },
  likeBurst: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); FX.likeBurst(ctx, t, { s: 0.6, count: 1240, label: 'إعجاب', out: 3.5 }); } },
  /* ── ب) انتقالات ── */
  blobMorph: { draw: (ctx, t, FX, H) => { FX.blobMorph(ctx, t, { s: 1.2, A: H.A(ctx), B: H.B(ctx) }); } },
  rippleWater: { draw: (ctx, t, FX, H) => { FX.rippleWater(ctx, t, { s: 1.0, A: H.A(ctx), B: H.B(ctx) }); } },
  inkWater: { draw: (ctx, t, FX, H) => { FX.inkWater(ctx, t, { s: 1.0, A: H.A(ctx), B: H.B(ctx) }); } },
  cubeTurn: { draw: (ctx, t, FX, H) => { FX.cubeTurn(ctx, t, { s: 1.2, A: H.A(ctx), B: H.B(ctx) }); } },
  cornerPeel: { draw: (ctx, t, FX, H) => { FX.cornerPeel(ctx, t, { s: 1.1, A: H.A(ctx), B: H.B(ctx) }); } },
  pixelMosaic: { draw: (ctx, t, FX, H) => { FX.pixelMosaic(ctx, t, { s: 1.2, A: H.A(ctx), B: H.B(ctx) }); } },
  kaleido: { draw: (ctx, t, FX, H) => { FX.kaleido(ctx, t, { s: 1.0, A: H.A(ctx), B: H.B(ctx) }); } },
  filmBurn: { draw: (ctx, t, FX, H) => { FX.filmBurn(ctx, t, { s: 1.1, A: H.A(ctx), B: H.B(ctx) }); } },
  vhsRewind: { draw: (ctx, t, FX, H) => { FX.vhsRewind(ctx, t, { s: 1.1, A: H.A(ctx), B: H.B(ctx) }); } },
  paperFold: { draw: (ctx, t, FX, H) => { FX.paperFold(ctx, t, { s: 1.1, A: H.A(ctx), B: H.B(ctx) }); } },
  brushReveal: { draw: (ctx, t, FX, H) => { FX.brushReveal(ctx, t, { s: 1.1, A: H.A(ctx), B: H.B(ctx) }); } },
  tvOff: { draw: (ctx, t, FX, H) => { FX.tvOff(ctx, t, { s: 1.1, A: H.A(ctx), B: H.B(ctx) }); } },
  /* ── ج) كاميرا ── */
  spotlight: { draw: (ctx, t, FX, H) => { FX.spotlight(ctx, t, { s: 0.3, draw: H.video(ctx), at: [540, 760], r: 230, from: [220, 380], label: 'هنا السر', out: 3.4 }); } },
  zoomWord: { draw: (ctx, t, FX, H) => { FX.zoomWord(ctx, t, { text: 'الفكرة البسيطة تكسب دايماً', s: 0.2, word: 1, out: 3.1 }); } },
  dutchTilt: { draw: (ctx, t, FX, H) => { FX.dutchTilt(ctx, t, { s: 0.6, out: 2.8, draw: Y => { H.video(ctx)(Y); ctx.text(Y, 'شي غلط؟', 540, 1400, { family: 'display', size: 130, color: '#FFFFFF' }); } }); } },
  barrelRoll: { draw: (ctx, t, FX, H) => { FX.barrelRoll(ctx, t, { s: 1.3, draw: H.video(ctx, 'هوب') }); } },
  /* ── د) كلام ── */
  waveLine: { draw: (ctx, t, FX, H) => { FX.waveLine(ctx, t, { text: 'خلها تمشي على راحتها', s: 0.2, accent: [1], out: 3.4 }); } },
  longShadow: { draw: (ctx, t, FX, H) => { H.title(ctx, 'كن مختلف'); FX.longShadow(ctx, t, { text: 'تميّز', s: 0.4, size: 260, out: 3.5 }); } },
  textCircle: { draw: (ctx, t, FX, H) => { FX.textCircle(ctx, t, { text: 'تابعنا للمزيد', center: 'جديد', s: 0.2, out: 3.5 }); } },
  wordDrum: { draw: (ctx, t, FX, H) => { H.title(ctx, 'شنو أهم شي؟'); FX.wordDrum(ctx, t, { pre: 'نبي', words: ['سرعة', 'جودة', 'سعر'], s: 0.3, every: 1.0, out: 3.5 }); } },
  /* ── هـ) كروت وطبقات ── */
  magnifier: { draw: (ctx, t, FX, H) => { FX.magnifier(ctx, t, { s: 0.3, at: [560, 900], out: 3.3, draw: Y => { const P = ctx.P; Y.fillStyle = P.bg; Y.fillRect(0, 0, 1080, 1920);
      ctx.text(Y, 'الشروط والأحكام', 540, 420, { family: 'display', size: 96, color: P.ink });
      for (let i = 0; i < 16; i++) { if (i === 7) continue; Y.fillStyle = 'rgba(27,26,23,.18)'; Y.fillRect(160 + (i % 3) * 40, 560 + i * 48, 760 - (i % 3) * 40, 14); }
      ctx.text(Y, 'رسوم مخفية: 9.99 شهرياً', 560, 912, { family: 'body', weight: 700, size: 30, color: P.clay }); } }); } },
  newsTicker: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); FX.newsTicker(ctx, t, { s: 0.3, title: 'خبر اليوم', items: ['إطلاق الخدمة الجديدة', 'التسجيل مفتوح للجميع', 'العرض لين نهاية الشهر'], out: 3.5 }); } },
  timelineRoad: { draw: (ctx, t, FX, H) => { H.title(ctx, 'قصتنا'); FX.timelineRoad(ctx, t, { s: 0.2, items: [{ k: '2019', v: 'الفكرة' }, { k: '2021', v: 'أول منتج' }, { k: '2023', v: 'ألف عميل' }, { k: '2025', v: 'التوسع' }], out: 3.5 }); } },
  ratingStars: { draw: (ctx, t, FX, H) => { FX.ratingStars(ctx, t, { score: 4.5, s: 0.3, label: 'تقييم المتابعين', out: 3.5 }); } },
  burstBadge: { draw: (ctx, t, FX, H) => { H.title(ctx, 'عرض اليوم'); FX.burstBadge(ctx, t, { text: '50%', s: 0.4, out: 3.5 }); } },
  liquidFill: { draw: (ctx, t, FX, H) => { H.title(ctx, 'شحن الطاقة'); FX.liquidFill(ctx, t, { text: 'طاقة', s: 0.2, level: 0.85, dur: 2.2, out: 3.5 }); } },
  podcastMic: { draw: (ctx, t, FX, H) => { FX.podcastMic(ctx, t, { s: 0.2, label: 'حلقة جديدة', out: 3.5 }); } },
  radialEq: { draw: (ctx, t, FX, H) => { FX.radialEq(ctx, t, { s: 0.2, text: 'صوت', out: 3.5 }); } },
  clockSpin: { draw: (ctx, t, FX, H) => { FX.clockSpin(ctx, t, { from: 9, to: 12, s: 0.3, label: 'بعد 3 ساعات', out: 3.5 }); } },
  calendarTear: { draw: (ctx, t, FX, H) => { FX.calendarTear(ctx, t, { from: 24, to: 27, month: 'رمضان', s: 0.3, out: 3.5 }); } },
  routeLine: { draw: (ctx, t, FX, H) => { FX.routeLine(ctx, t, { s: 0.2, out: 3.5 }); } },
  envelopeOpen: { draw: (ctx, t, FX, H) => { FX.envelopeOpen(ctx, t, { text: 'أنت مدعو', s: 0.2, out: 3.5 }); } },
  ribbonBanner: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); FX.ribbonBanner(ctx, t, { text: 'الأكثر مبيعاً', s: 0.4, y: 1300, out: 3.5 }); } },
  ornateFrame: { draw: (ctx, t, FX, H) => { ctx.text(ctx.X, 'العلم نور', 540, 1000, { family: 'display', size: 170, color: ctx.P.ink, alpha: ctx.at(t, 0.8, 1.5) }); FX.ornateFrame(ctx, t, { s: 0.2 }); } },
  lanternFrame: { draw: (ctx, t, FX, H) => { const X = ctx.X; X.fillStyle = '#1D1B2C'; X.fillRect(0, 0, 1080, 1920); FX.lanternFrame(ctx, t, { s: 0.1, title: 'رمضان كريم' }); } },
  endScreen: { draw: (ctx, t, FX, H) => { H.video(ctx)(ctx.X); FX.endScreen(ctx, t, { s: 0.2, channel: 'آي أو استوديو' }); } },
  polaroidDrop: { draw: (ctx, t, FX, H) => { FX.polaroidDrop(ctx, t, { s: 0.2, caption: 'أول يوم', out: 3.5 }); } },
  scrapTape: { draw: (ctx, t, FX, H) => { FX.scrapTape(ctx, t, { text: 'لا تنسى: الفكرة أهم من الأداة', s: 0.3, out: 3.5 }); } },
  oldFilm: { draw: (ctx, t, FX, H) => { FX.oldFilm(ctx, t, { s: 0.4, draw: H.video(ctx, 'زمان') }); } },
  flipCards: { draw: (ctx, t, FX, H) => { FX.flipCards(ctx, t, { items: ['ابدأ صغير', 'كرر كل يوم', 'قيس النتيجة'], s: 0.1, every: 1.15, out: 3.6 }); } },
  heartbeat: { draw: (ctx, t, FX, H) => { FX.heartbeat(ctx, t, { s: 0.2, text: 'حماس', out: 3.5 }); } },
  fireworks: { draw: (ctx, t, FX, H) => { const X = ctx.X; X.fillStyle = '#15131F'; X.fillRect(0, 0, 1080, 1920); FX.fireworks(ctx, t, { s: 0 });
    ctx.text(X, 'عيدكم مبارك', 540, 1380, { family: 'display', size: 140, color: '#FFF3DA', alpha: ctx.at(t, 1.2, 1.9) }); } },
  mashrabiya: { draw: (ctx, t, FX, H) => { FX.mashrabiya(ctx, t, { s: 1.0, A: H.A(ctx), B: H.B(ctx) }); } },
  warpSpeed: { draw: (ctx, t, FX, H) => { FX.warpSpeed(ctx, t, { s: 1.2, A: H.A(ctx), B: H.B(ctx) }); } },
};
module.exports = D;

if (require.main === module) {
  const path = require('path'), { spawnSync } = require('child_process');
  const args = process.argv.slice(2), nums = args.filter(a => /^\d+(-\d+)?$/.test(a)), rest = args.filter(a => !/^\d+(-\d+)?$/.test(a));
  const r = spawnSync('node', [path.join(__dirname, 'render-preview.js'), ...(nums.length ? nums : ['151-200']), '--demos', __filename, ...rest], { stdio: 'inherit' });
  process.exit(r.status || 0);
}
