#!/usr/bin/env node
/* ═══ render-preview-c.js — معاينات الحركات 201–232 (moves-plus-c.js) ═══
   node motion/moves/render-preview-c.js                 → previews/201.mp4 … 232.mp4
   node motion/moves/render-preview-c.js 201 214 --keep  → أرقام محددة (أي خيار ثاني يمشي لـrender-preview.js)
   نفس طريقة render-preview-b.js: ديموهات (module.exports) + مشغّل يستدعي render-preview.js بـ--demos على نفسه.
   الرسمة التجريبية لستايل «لقطة» (رجّال بغترة وعقال يسوق) مرسومة بالكود هني (ILL) — بلا أي صورة منزّلة.
   ديموهات اللي تحتاج الرسمة مبنية بـnew Function(ILL + الجسم) عشان تبقى مستقلة لما تنسخ نص لصفحة المحرّك. */
const ILL = String.raw`
const skin = '#C98B63', skinD = '#A86D4A', white = '#F7F5F0', shadeW = '#DCD8CF';
function illBg(Y) {
  const g = Y.createLinearGradient(0, 0, 0, 900); g.addColorStop(0, '#5FA6DB'); g.addColorStop(1, '#CFE6F5'); Y.fillStyle = g; Y.fillRect(0, 0, 1080, 1920);
  Y.fillStyle = 'rgba(255,255,255,.92)'; [[160, 330, 150], [330, 300, 110], [880, 250, 130], [990, 300, 90], [620, 380, 80]].forEach(([x, y, r]) => { Y.beginPath(); Y.ellipse(x, y, r * 1.5, r * 0.55, 0, 0, 6.283); Y.fill(); });
  Y.fillStyle = '#E3C48E'; Y.fillRect(0, 760, 1080, 300); Y.fillStyle = '#7F9B5A';
  [[150, 760], [300, 770], [880, 765]].forEach(([x, y]) => { Y.fillRect(x - 6, y - 110, 12, 110); for (let i = 0; i < 6; i++) { Y.save(); Y.translate(x, y - 110); Y.rotate(-1.4 + i * 0.55); Y.beginPath(); Y.ellipse(40, 0, 46, 10, 0, 0, 6.283); Y.fill(); Y.restore(); } });
  Y.fillStyle = '#3B3F45'; Y.beginPath(); Y.moveTo(0, 0); Y.lineTo(1080, 0); Y.lineTo(1080, 200); Y.quadraticCurveTo(540, 300, 0, 200); Y.closePath(); Y.fill();
  Y.fillStyle = '#4A4F57'; Y.beginPath(); Y.moveTo(0, 200); Y.lineTo(150, 230); Y.lineTo(60, 1300); Y.lineTo(0, 1300); Y.fill(); Y.beginPath(); Y.moveTo(1080, 200); Y.lineTo(930, 230); Y.lineTo(1020, 1300); Y.lineTo(1080, 1300); Y.fill();
  Y.fillStyle = '#2B2E33'; Y.beginPath(); Y.roundRect(40, 300, 210, 70, 20); Y.fill();
  Y.fillStyle = '#8E8577'; Y.beginPath(); Y.roundRect(170, 950, 740, 900, 120); Y.fill();
}
function illPerson(Y) {
  Y.fillStyle = white; Y.beginPath(); Y.moveTo(170, 1920); Y.bezierCurveTo(180, 1250, 330, 1120, 540, 1110); Y.bezierCurveTo(750, 1120, 900, 1250, 910, 1920); Y.fill();
  Y.fillStyle = shadeW; Y.beginPath(); Y.moveTo(530, 1130); Y.lineTo(550, 1130); Y.lineTo(556, 1500); Y.lineTo(524, 1500); Y.fill();
  Y.fillStyle = skin; Y.fillRect(495, 980, 90, 150);
  Y.fillStyle = white; Y.beginPath(); Y.moveTo(540, 600); Y.bezierCurveTo(360, 600, 330, 780, 345, 1000); Y.bezierCurveTo(350, 1100, 300, 1180, 270, 1260); Y.lineTo(420, 1240); Y.bezierCurveTo(430, 1100, 440, 1000, 540, 1000);
  Y.bezierCurveTo(640, 1000, 650, 1100, 660, 1240); Y.lineTo(810, 1260); Y.bezierCurveTo(780, 1180, 730, 1100, 735, 1000); Y.bezierCurveTo(750, 780, 720, 600, 540, 600); Y.fill();
  Y.fillStyle = shadeW; Y.beginPath(); Y.ellipse(540, 860, 118, 165, 0, 0, 6.283); Y.fill();
  Y.fillStyle = skin; Y.beginPath(); Y.ellipse(540, 860, 104, 150, 0, 0, 6.283); Y.fill();
  Y.fillStyle = '#3A2A20'; Y.beginPath(); Y.moveTo(436, 860); Y.bezierCurveTo(450, 1010, 500, 1030, 540, 1030); Y.bezierCurveTo(580, 1030, 630, 1010, 644, 860); Y.bezierCurveTo(620, 950, 580, 940, 540, 945); Y.bezierCurveTo(500, 940, 460, 950, 436, 860); Y.fill();
  Y.fillStyle = '#5B3C2C'; Y.beginPath(); Y.ellipse(540, 968, 26, 20, 0, 0, 6.283); Y.fill();
  Y.strokeStyle = '#2A1E17'; Y.lineWidth = 6; Y.lineCap = 'round'; Y.beginPath(); Y.moveTo(482, 845); Y.quadraticCurveTo(500, 856, 518, 845); Y.moveTo(562, 845); Y.quadraticCurveTo(580, 856, 598, 845); Y.stroke();
  Y.lineWidth = 9; Y.beginPath(); Y.moveTo(475, 812); Y.lineTo(520, 806); Y.moveTo(560, 806); Y.lineTo(605, 812); Y.stroke();
  Y.strokeStyle = skinD; Y.lineWidth = 5; Y.beginPath(); Y.moveTo(540, 860); Y.lineTo(530, 915); Y.lineTo(548, 918); Y.stroke();
  Y.fillStyle = '#1A1A1C'; Y.beginPath(); Y.ellipse(540, 680, 190, 40, 0, 0, 6.283); Y.fill(); Y.fillStyle = white; Y.beginPath(); Y.ellipse(540, 682, 160, 22, 0, 0, 6.283); Y.fill();
  Y.fillStyle = '#1A1A1C'; Y.beginPath(); Y.ellipse(540, 650, 180, 34, 0, 0, 6.283); Y.fill(); Y.fillStyle = white; Y.beginPath(); Y.ellipse(540, 648, 150, 18, 0, 0, 6.283); Y.fill();
  Y.strokeStyle = '#222428'; Y.lineWidth = 46; Y.beginPath(); Y.moveTo(760, 1150); Y.lineTo(420, 1700); Y.stroke();
  Y.strokeStyle = '#26282C'; Y.lineWidth = 60; Y.beginPath(); Y.ellipse(540, 1560, 360, 150, 0, 3.4, 6.0); Y.stroke();
  Y.fillStyle = skin; [[250, 1560], [830, 1560]].forEach(([x, y]) => { Y.beginPath(); Y.ellipse(x, y, 70, 52, 0, 0, 6.283); Y.fill(); });
  Y.fillStyle = '#2B2E33'; Y.fillRect(0, 1640, 1080, 280);
}
function ill(Y) { illBg(Y); illPerson(Y); }
const FACE = { x: 430, y: 690, w: 220, h: 300 };
`;
const L = body => ({ draw: new Function('ctx', 't', 'FX', 'H', ILL + '\n' + body) });
const V = 'const vid = H.video(ctx); const pers = Y => { Y.fillStyle = "#3A342C"; Y.beginPath(); Y.ellipse(540, 760, 150, 175, 0, 0, 6.283); Y.fill(); Y.beginPath(); Y.moveTo(160, 1920); Y.bezierCurveTo(160, 1150, 330, 990, 540, 990); Y.bezierCurveTo(750, 990, 920, 1150, 920, 1920); Y.fill(); };';
const D = {
  /* ── أ) عناوين عربية ── */
  kashidaLive: { draw: (ctx, t, FX, H) => { H.title(ctx, 'كشيدة حية');
    FX.kashidaLive(ctx, t, { text: 'الصبر يصنع المستحيل', word: 2, s: 0.15, at: 0.9, hold: 0.9, y: 900, size: 120 });
    FX.kashidaLive(ctx, t, { text: 'كل يوم خطوة صغيرة', word: 2, s: 0.4, at: 1.9, hold: 0.8, y: 1250, size: 90, family: 'body', color: ctx.P.ink }); } },
  stampHide: { draw: (ctx, t, FX, H) => { H.title(ctx, 'اللي ما ينقال'); FX.stampHide(ctx, t, { text: 'الراتب الحقيقي سر ما ينقال', hide: [2], s: 0.2, stamp: 'سري', out: 3.5 }); } },
  /* ── ب) انتقالات ── */
  keyhole: { draw: (ctx, t, FX, H) => { FX.keyhole(ctx, t, { s: 1.2, A: H.A(ctx), B: H.B(ctx) }); } },
  inkSlab: { draw: (ctx, t, FX, H) => { FX.inkSlab(ctx, t, { s: 1.4, dur: 0.6, A: H.A(ctx), B: H.B(ctx) }); } },
  paperPull: { draw: (ctx, t, FX, H) => { FX.paperPull(ctx, t, { s: 1.3, dur: 0.8, A: H.A(ctx), B: H.B(ctx) }); } },
  magazineFlip: { draw: (ctx, t, FX, H) => { FX.magazineFlip(ctx, t, { s: 1.2, dur: 1.0, A: H.A(ctx), B: H.B(ctx) }); } },
  paperSwap: { draw: (ctx, t, FX, H) => { FX.paperSwap(ctx, t, { s: 1.2, dur: 0.9, A: H.A(ctx), B: H.B(ctx) }); } },
  pixelCurtain: { draw: (ctx, t, FX, H) => { FX.pixelCurtain(ctx, t, { s: 1.0, dur: 1.4, A: H.A(ctx), B: H.B(ctx) }); } },
  /* ── ج) كاميرا ── */
  sceneCam: { draw: (ctx, t, FX, H) => { const P = ctx.P; H.video(ctx)(ctx.X);
    FX.sceneCam(ctx, t, { move: 'orbit', strength: 'strong', s: 0.1, end: 3.9, area: { x: 0, y: 0, w: 1080, h: 960 }, draw: Y => { Y.fillStyle = P.acc; Y.fillRect(0, 0, 1080, 960);
      for (let i = 0; i < 12; i++) { Y.fillStyle = 'rgba(255,255,255,.08)'; Y.fillRect(i * 100, 0, 50, 960); }
      ctx.text(Y, 'نص الرسوم يلف', 540, 470, { family: 'display', size: 120, color: '#FFFFFF' }); ctx.text(Y, 'والمتحدث ثابت تحت', 540, 600, { family: 'body', weight: 700, size: 54, color: '#FFFFFF' }); } });
    ctx.X.fillStyle = P.ink; ctx.X.fillRect(0, 956, 1080, 8); } },
  /* ── د) مظاهر وخلفيات ── */
  risoLook: L(`FX.risoLook(ctx, t, { s: 0.3, draw: ill }); ctx.text(ctx.X, 'طباعة بحبرين', 540, 1500, { family: 'display', size: 110, color: '#FFFFFF', stroke: { width: 14, color: '#1B1A17' } });`),
  blueprintLook: L(`FX.blueprintLook(ctx, t, { s: 0.3, draw: ill }); ctx.text(ctx.X, 'المخطط', 540, 1500, { family: 'display', size: 120, color: '#FFFFFF' });`),
  paperLook: L(`FX.paperLook(ctx, t, { s: 0.3, draw: ill, amount: 0.75 }); ctx.text(ctx.X, 'مطبوع على ورق', 540, 1500, { family: 'display', size: 110, color: '#FFFFFF', stroke: { width: 14, color: '#1B1A17' } });`),
  sunburst: { draw: (ctx, t, FX, H) => { FX.sunburst(ctx, t, { s: 0 }); ctx.text(ctx.X, 'عرض خاص', 540, 800, { family: 'display', size: 170, color: ctx.P.ink, alpha: ctx.at(t, 0.3, 0.8) }); } },
  /* ── هـ) وثائقي ── */
  mapRoute: { draw: (ctx, t, FX, H) => { FX.mapRoute(ctx, t, { s: 0.1, title: 'رحلتنا بالسيارة', caption: 'ثلاث مدن في يومين', dur: 2.2 }); } },
  mapFocus: { draw: (ctx, t, FX, H) => { FX.mapFocus(ctx, t, { s: 0.1, country: 'فلسطين', title: 'فلسطين', caption: 'أرض الزيتون والتاريخ', at: 0.6, dur: 1.6 }); } },
  tornPhoto: L(`FX.tornPhoto(ctx, t, { s: 0.1, draw: ill, title: 'أول رحلة', caption: 'كنا نسافر كل صيف بالسيارة', credit: 'أرشيف العائلة · 1998' });`),
  /* ── و) حوالين المتكلم ── */
  layeredSpeaker: { draw: new Function('ctx', 't', 'FX', 'H', V + `FX.layeredSpeaker(ctx, t, { s: 0.1, video: vid, person: pers, face: { x: 390, y: 585, w: 300, h: 350 }, big: 'الحرية',
      words: [{ text: 'قرار', place: 'right', at: 0.9, mark: 'circle' }, { text: 'مسؤولية', place: 'left', at: 1.5, accent: true, mark: 'underline' }, { text: 'كل يوم', place: 'above', at: 2.1 }] });`) },
  proofScreen: { draw: (ctx, t, FX, H) => { FX.proofScreen(ctx, t, { s: 0.1, page: 'web', url: 'io-studio.example', focus: 2, push: 2.3,
      blocks: [{ kind: 'heading', text: 'متجرك جاهز' }, { kind: 'text', text: 'اطلب من جوالك ويوصلك بنفس اليوم' }, { kind: 'stat', text: 'طلب هالشهر', value: 1240 }, { kind: 'button', text: 'اطلب الحين' }] }); } },
  /* ── ز) مفاهيم ── */
  barsToLine: { draw: (ctx, t, FX, H) => { FX.barsToLine(ctx, t, { s: 0.1, title: 'نمو المتابعين', data: [12, 18, 15, 26, 31, 44], labels: ['1', '2', '3', '4', '5', '6'], morph: 1.7 }); } },
  automationFlow: { draw: (ctx, t, FX, H) => { H.title(ctx, 'كيف تشتغل الأتمتة', 250); FX.automationFlow(ctx, t, { s: 0.1 }); } },
  branchPath: { draw: (ctx, t, FX, H) => { H.title(ctx, 'قرار تلقائي', 300); FX.branchPath(ctx, t, { s: 0.1, decide: 1.5 }); } },
  identityFilter: { draw: (ctx, t, FX, H) => { H.title(ctx, 'مين يناسب الوظيفة؟', 300); FX.identityFilter(ctx, t, { s: 0.1, every: 0.7 }); } },
  promptCards: { draw: (ctx, t, FX, H) => { FX.promptCards(ctx, t, { s: 0.1, type: 1.0 }); } },
  chaosToBrand: { draw: (ctx, t, FX, H) => { FX.chaosToBrand(ctx, t, { s: 0.1, name: 'آي أو استوديو', gather: 1.3 }); } },
  systemLayers: { draw: (ctx, t, FX, H) => { H.title(ctx, 'كيف ينبني مشروعك', 300); FX.systemLayers(ctx, t, { s: 0.1 }); } },
  buttonWindow: { draw: (ctx, t, FX, H) => { FX.buttonWindow(ctx, t, { s: 0.1, tap: 0.9 }); } },
  magneticDock: { draw: (ctx, t, FX, H) => { H.title(ctx, 'أدواتي اليومية', 700); FX.magneticDock(ctx, t, { s: 0.1, every: 0.6 }); } },
  /* ── ح) ستايل «لقطة» ── */
  questionCard: L(`ill(ctx.X); FX.brandBracket(ctx, t, { s: 0, text: 'آي أو استوديو', x: 140, y: 150, size: 34 }); FX.iconPop(ctx, t, { s: 1.0, icon: '?', face: FACE, size: 100 });
    FX.questionCard(ctx, t, { s: 0.2, text: 'المسار اليسار…\\nمنو الصح؟', brand: 'آي أو استوديو' });`),
  iconPop: L(`ill(ctx.X); FX.iconPop(ctx, t, { s: 0.3, icon: '?', face: FACE }); FX.iconPop(ctx, t, { s: 1.4, icon: 'zzz', x: 300, y: 620, size: 100 }); FX.iconPop(ctx, t, { s: 2.3, icon: 'bulb', x: 820, y: 1000, size: 100 });`),
  kenBurns25D: L(`FX.kenBurns25D(ctx, t, { s: 0, dur: 4, draw: ill, person: illPerson, parallax: 1.8 });`),
  brandBracket: L(`ill(ctx.X); FX.brandBracket(ctx, t, { s: 0.3, text: 'آي أو استوديو', sub: '@io.creator', x: 540, y: 1400, size: 90 });`),
  seriesEndCard: L(`FX.seriesEndCard(ctx, t, { s: 0.2, draw: ill, next: 'ليش يشخر\\nوما يحس؟' });`),
};
module.exports = D;

if (require.main === module) {
  const path = require('path'), { spawnSync } = require('child_process');
  const args = process.argv.slice(2), nums = args.filter(a => /^\d+(-\d+)?$/.test(a)), rest = args.filter(a => !/^\d+(-\d+)?$/.test(a));
  const r = spawnSync('node', [path.join(__dirname, 'render-preview.js'), ...(nums.length ? nums : ['201-232']), '--demos', __filename, ...rest], { stdio: 'inherit' });
  process.exit(r.status || 0);
}
