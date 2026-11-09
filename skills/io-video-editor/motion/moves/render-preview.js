#!/usr/bin/env node
/* ═══ render-preview.js — يرسم معاينات بنك الحركات (previews/NN.mp4) بمحرّك الموشن نفسه ═══
   node motion/moves/render-preview.js 101-150            → previews/101.mp4 … 150.mp4 (540×960 · 30fps · CRF 30)
   node motion/moves/render-preview.js 107 112 140        → أرقام محددة
   خيارات:
     --demos <ملف.js>   ديموهات إضافية (module.exports = { <id>: { dur, draw: (ctx, t, FX, H) => {…} } }) — مثلاً لحركات 151–200
     --out <مجلد>       مكان الـmp4 (افتراضي motion/moves/previews)
     --strips <مجلد>    شريط 6 لقطات PNG لكل حركة (للمراجعة بالعين) — افتراضي <tmp>/strips
     --dur 4 · --fps 30 · --crf 30 · --scale 0.5 · --keep (يخلي مجلد المشروع المؤقت) · --no-mp4 (شرائط بس)
   كيف يشتغل: يبني مشروع موشن مؤقت، كل حركة مشهد مدته dur (الديمو يرسم الخلفية ويستدعي ctx.FX.<id> بوقت محلي)،
   يرسم الفريمات بـmotion/render.js (كروم بلا واجهة)، ويقص كل مشهد لملفه بـffmpeg.
   الديمو يشوف H: H.bg(ctx) خلفية الثيم · H.title(ctx, نص) عنوان فوق · H.A(ctx) / H.B(ctx) مشهدين للانتقالات (دوال Y=>…) · H.video(ctx) «فيديو» بديل (متحدث).
   الحركات تتحمّل من motion/moves.js + moves-plus-*.js (engine.html). */
const fs = require('fs'), path = require('path'), os = require('os'), { spawnSync } = require('child_process');
const MOTION = path.resolve(__dirname, '..'), MOVES = __dirname;
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf('--' + n); if (i < 0) return d; const v = argv[i + 1]; return v === undefined || v.startsWith('--') ? true : v; };
const FLAGS_WITH_VALUE = ['--demos', '--out', '--strips', '--dur', '--fps', '--crf', '--scale', '--workers'];
const pos = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && FLAGS_WITH_VALUE.includes(argv[i - 1])));
if (!pos.length) { console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 12).join('\n')); process.exit(1); }

/* الكتالوج: catalog.json + catalog-plus-*.json (رقم → id) */
const catalog = () => {
  const out = new Map();
  for (const f of ['catalog.json', ...fs.readdirSync(MOVES).filter(f => /^catalog-plus-[\w-]+\.json$/.test(f)).sort()]) {
    try { for (const m of JSON.parse(fs.readFileSync(path.join(MOVES, f), 'utf8')).moves || []) out.set(m.n, m); } catch (e) { console.warn('⚠️ ' + f + ': ' + e.message); }
  }
  return out;
};
const CAT = catalog();
const wanted = [];
for (const a of pos) { const m = /^(\d+)-(\d+)$/.exec(a); if (m) for (let n = +m[1]; n <= +m[2]; n++) wanted.push(n); else if (/^\d+$/.test(a)) wanted.push(+a); else wanted.push(a); }

const DEMOS = Object.assign({}, require('./render-preview.demos.js'));
if (flag('demos')) Object.assign(DEMOS, require(path.resolve(flag('demos'))));
const DUR = parseFloat(flag('dur', '4')), FPS = parseInt(flag('fps', '30')), CRF = String(flag('crf', '30')), SCALE = parseFloat(flag('scale', '0.5'));
const OUT = path.resolve(flag('out', path.join(MOVES, 'previews')));
const jobs = [];
for (const w of wanted) {
  const m = typeof w === 'number' ? CAT.get(w) : [...CAT.values()].find(x => x.id === w);
  const id = m ? m.id : String(w), n = m ? m.n : null;
  if (!DEMOS[id]) { console.warn('⚠️ ما فيه ديمو لـ' + id + (n ? ' (' + n + ')' : '') + ' — تخطّيت'); continue; }
  jobs.push({ id, n, file: m && m.preview ? path.basename(m.preview) : (n != null ? String(n).padStart(2, '0') + '.mp4' : id + '.mp4'), demo: DEMOS[id] });
}
if (!jobs.length) { console.error('❌ ما فيه شي أرسمه'); process.exit(1); }

/* المساعدات داخل المتصفح (نص — تنحط براس كل مشهد) */
const HELPERS = `
const H = {
  bg(ctx) { const X = ctx.X; X.fillStyle = ctx.P.bg; X.fillRect(0, 0, 1080, 1920); },
  title(ctx, s, y) { ctx.text(ctx.X, s, 540, y || 330, { family: 'display', size: 72, color: ctx.P.ink, maxWidth: 900 }); },
  video(ctx, label) { return Y => { const P = ctx.P, g = Y.createLinearGradient(0, 0, 0, 1920); g.addColorStop(0, '#E9E1D3'); g.addColorStop(1, '#CDBFA8'); Y.fillStyle = g; Y.fillRect(0, 0, 1080, 1920);
    Y.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 6; i++) Y.fillRect(0, 260 + i * 120, 1080, 6);
    Y.fillStyle = 'rgba(232,162,131,.55)'; Y.beginPath(); Y.arc(840, 380, 120, 0, 6.283); Y.fill();
    Y.fillStyle = '#3A342C'; Y.beginPath(); Y.ellipse(540, 760, 150, 175, 0, 0, 6.283); Y.fill();
    Y.beginPath(); Y.moveTo(160, 1920); Y.bezierCurveTo(160, 1150, 330, 990, 540, 990); Y.bezierCurveTo(750, 990, 920, 1150, 920, 1920); Y.fill();
    if (label) ctx.text(Y, label, 540, 1360, { family: 'display', size: 130, color: '#FFFFFF' }); }; },
  A(ctx) { return H.video(ctx, 'قبل'); },
  B(ctx) { return Y => { const P = ctx.P; Y.fillStyle = P.acc; Y.fillRect(0, 0, 1080, 1920);
    Y.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 9; i++) { Y.beginPath(); Y.arc(540, 960, 160 + i * 140, 0, 6.283); Y.lineWidth = 30; Y.strokeStyle = 'rgba(255,255,255,.07)'; Y.stroke(); }
    ctx.text(Y, 'بعد', 540, 980, { family: 'display', size: 260, color: P.onAcc || '#FFFFFF' });
    ctx.text(Y, 'المشهد الجديد', 540, 1130, { family: 'body', weight: 700, size: 60, color: P.onAcc || '#FFFFFF' }); }; },
};
`;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'moves-preview-'));
fs.mkdirSync(path.join(tmp, 'scenes'));
const scenes = jobs.map((j, i) => {
  const d = j.demo.dur || DUR, start = jobs.slice(0, i).reduce((a, x) => a + (x.demo.dur || DUR), 0), sid = 'm_' + j.id;
  const src = `${HELPERS}\nconst DEMO = ${j.demo.draw.toString()};\nMOTION.scene({ id: ${JSON.stringify(sid)}, start: ${start}, end: ${start + d},\n  draw(t, lt, ctx) { H.bg(ctx); DEMO(ctx, lt, ctx.FX, H); } });\n`;
  fs.writeFileSync(path.join(tmp, 'scenes', sid + '.js'), src);
  j.start = start; j.dur = d;
  return { id: sid, file: 'scenes/' + sid + '.js', start, end: start + d };
});
const pal = flag('palette') ? JSON.parse(flag('palette')) : { bg: '#F0EBE0', ink: '#1B1A17', acc: '#D97757', clay: '#C15F3C', hi: '#E8A283', mut: '#8A847A' };
fs.writeFileSync(path.join(tmp, 'project.json'), JSON.stringify({ name: 'moves-preview', fps: FPS, width: 1080, height: 1920, bpm: 120, palette: pal,
  fonts: { display: 'Lalezar', body: 'IBM Plex Sans Arabic', num: 'Inter' }, post: { grain: 0, vignette: 0 }, scenes }, null, 1));

const findChrome = () => [process.env.CHROME, process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser']
  .find(c => c && fs.existsSync(c));
const env = Object.assign({}, process.env, { CHROME: findChrome() || '' });
console.log(`🎬 ${jobs.length} حركة → ${tmp}`);
const r = spawnSync('node', [path.join(MOTION, 'render.js'), tmp, 'all', '--scale', String(SCALE), '--fps', String(FPS), '--no-encode', '--fresh', '--no-blur', '--workers', String(flag('workers', '2'))], { stdio: 'inherit', env });
if (r.status !== 0) { console.error('❌ render.js فشل'); process.exit(1); }
const frames = path.join(tmp, 'renders', SCALE === 1 ? 'frames' : `frames_s${SCALE}`);
const STRIPS = path.resolve(flag('strips', path.join(tmp, 'strips')));
fs.mkdirSync(STRIPS, { recursive: true }); if (!flag('no-mp4')) fs.mkdirSync(OUT, { recursive: true });
const ff = a => { const x = spawnSync('ffmpeg', a, { stdio: ['ignore', 'ignore', 'inherit'] }); if (x.status !== 0) throw new Error('ffmpeg failed: ' + a.join(' ')); };
for (const j of jobs) {
  const f0 = Math.round(j.start * FPS), nf = Math.round(j.dur * FPS), inp = ['-y', '-v', 'error', '-framerate', String(FPS), '-start_number', String(f0), '-i', path.join(frames, 'f_%06d.jpg')];
  if (!flag('no-mp4')) ff([...inp, '-frames:v', String(nf), '-vf', 'scale=in_range=full:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', CRF, '-profile:v', 'high', '-movflags', '+faststart', '-an', path.join(OUT, j.file)]);
  const step = Math.max(1, Math.floor(nf / 6));
  ff([...inp, '-frames:v', String(nf), '-vf', `select='not(mod(n\\,${step}))',scale=180:-1,tile=6x1`, '-frames:v', '1', path.join(STRIPS, j.file.replace(/\.mp4$/, '.png'))]);
  console.log(`  ✓ ${j.n != null ? j.n : ''} ${j.id}${flag('no-mp4') ? '' : ' → ' + path.join(OUT, j.file)}`);
}
console.log('🖼️ الشرائط: ' + STRIPS);
if (!flag('keep')) fs.rmSync(path.join(tmp, 'renders'), { recursive: true, force: true });
