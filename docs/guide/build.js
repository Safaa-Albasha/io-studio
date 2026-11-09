#!/usr/bin/env node
/*
 * Builds the install & usage guide PDF from guide.html.
 *
 *   node docs/guide/build.js            # guide.html → io-studio-guide.pdf (takes screenshots if img/ is empty)
 *   node docs/guide/build.js --shots    # retake the screenshots first (sample project, neutral data)
 *   node docs/guide/build.js --html     # also keep the filled page as guide.built.html (for checking in a browser)
 *
 * Needs Playwright (require('playwright')). Screenshots also need ffmpeg + python3
 * for the timeline shot (skipped if missing).
 *
 * The product name lives ONLY in PRODUCT below. guide.html uses {{NAME}} / {{NAME_EN}}
 * (and the other {{…}} tokens) — rename here, rebuild, done.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

/* ───────────── the one place to rename the product ───────────── */
const PRODUCT = {
  ar: 'آي أو استوديو', en: 'I/O Studio',
  slogan: '«فكرتك تدخل… والذكاء يكمّل الإبداع»',
  sloganEn: "Idea in. Story out. AI does the in-between.",
  logo: path.join(__dirname, '..', '..', 'web', 'lib', 'logo.svg'), // the cover mark
};
/* technical ids (change only if the plugin / marketplace / repo are renamed too) */
const PLUGIN_ID = 'io';
const MARKETPLACE = 'io-studio';
const REPO = 'Safaa-Albasha/io-studio';

const HERE = __dirname;
const ROOT = path.resolve(HERE, '..', '..'); // the plugin folder
const IMG = path.join(HERE, 'img');
const OUT = path.join(HERE, `${MARKETPLACE}-guide.pdf`); // io-studio-guide.pdf
const SAMPLE_PATHS = { project: '~/my-project', plugin: `~/.claude/plugins/marketplaces/${MARKETPLACE}`, sep: '/' };
const SHOTS = ['app-ideas', 'app-schedule', 'app-build', 'app-montage', 'app-library', 'app-me', 'welcome', 'course-studio', 'timeline'];

const argv = process.argv.slice(2);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ───────────── skills list from SKILL.md frontmatter ───────────── */
function oneLine(desc) {
  let d = String(desc || '').replace(/\s+/g, ' ').trim();
  const stops = [' — يُشغَّل', 'ALWAYS', 'Use when', 'استخدمه', 'استخدم هذا', 'استخدم عندما', ' يُقرأ قبل'];
  let cut = d.length;
  for (const s of stops) { const i = d.indexOf(s); if (i > 20 && i < cut) cut = i; }
  d = d.slice(0, cut).trim().replace(/[.،,—\-–:؛\s]+$/, '');
  const dot = d.search(/\.\s/);
  if (dot > 40) d = d.slice(0, dot);
  if (d.length > 175) d = d.slice(0, d.lastIndexOf(' ', 172)) + '…';
  return d;
}

function skillsTable() {
  const { skills } = require(path.join(ROOT, 'engine', 'app-api.js'));
  const list = skills(ROOT);
  const rows = list.map((s) => `<tr><td class="ltr"><code>${esc(s.name)}</code></td><td>${esc(oneLine(s.description))}${s.invocable ? '' : ' <span class="tag">مرجع داخلي</span>'}</td></tr>`).join('\n');
  return { count: list.length, html: `<table class="skills"><thead><tr><th>السكل</th><th>شنو يسوي</th></tr></thead><tbody>\n${rows}\n</tbody></table>` };
}

/* ───────────── screenshots from a sample project ───────────── */
function ymd(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

function has(cmd) { try { cp.execFileSync(cmd, ['-version'], { stdio: 'ignore' }); return true; } catch (e) { try { cp.execFileSync(cmd, ['--version'], { stdio: 'ignore' }); return true; } catch (e2) { return false; } } }

function makeSample() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'guide-'));
  const dir = path.join(base, 'my-project');
  fs.mkdirSync(dir, { recursive: true });
  const payload = {
    dialect: 'msa', name: 'اسمك', brand: 'اسم البراند', niche: 'تقنية وذكاء اصطناعي', audience: 'صنّاع محتوى مبتدئين', tone: 'ودّي وبسيط',
    handles: { instagram: '@حسابك', youtube: '@حسابك', tiktok: '@حسابك' },
    accountType: 'creator', contentFormat: 'video',
    sources: { accounts: [{ platform: 'instagram', handle: '@حساب_تتابعه' }, { platform: 'youtube', handle: '@قناة_تتابعها' }], sites: ['example.com'], keywords: ['ذكاء اصطناعي'] },
    dailyTrends: { enabled: true, hour: 9 },
    identity: { mode: 'create', mood: 'calm', option: 2 },
  };
  const pf = path.join(base, 'onboard.json');
  fs.writeFileSync(pf, JSON.stringify(payload));
  cp.execFileSync(process.execPath, [path.join(ROOT, 'engine', 'onboard.js'), 'apply', pf, '--dir', dir], { stdio: 'inherit' });
  const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
  const ideas = [
    { title: '٣ أدوات ذكاء اصطناعي توفر عليك ساعة يومياً', hook: 'هالثلاث أدوات غيّرت يومي', format: 'reel', source: 'trend', trendRef: { title: 'خبر تقني', url: 'https://example.com', account: '@حساب_تتابعه' }, why: 'جمهورك يحب النصائح السريعة', date: day(1), time: '19:00', status: 'scheduled' },
    { title: 'كيف تكتب هوك يوقف التمرير', hook: 'أول ٣ ثواني هي كل شي', format: 'carousel', source: 'trend', why: 'سؤال متكرر بالتعليقات', date: day(3), time: '20:30', status: 'scheduled' },
    { title: 'جولة بمكتبي وأدوات التصوير', hook: 'كل اللي أصوّر بيه', format: 'youtube', source: 'manual' },
    { title: 'غلطة تخلي الريل يموت بأول ثانية', hook: 'لا تبدأ بالسلام', format: 'reel', source: 'trend', why: 'ترند بحسابات تتابعها' },
  ];
  const idf = path.join(base, 'ideas.json');
  fs.writeFileSync(idf, JSON.stringify(ideas));
  cp.execFileSync(process.execPath, [path.join(ROOT, 'engine', 'app-api.js'), 'add-ideas', idf, '--dir', dir], { stdio: 'inherit' });
  return { base, dir };
}

/** A tiny video work folder (test pattern + tone, 4 sentences) so the timeline page has something to show. */
function makeWork(dir) {
  const w = path.join(dir, 'work', 'sample');
  fs.mkdirSync(w, { recursive: true });
  cp.execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'smptebars=s=720x1280:d=14:r=30', '-f', 'lavfi', '-i', 'sine=frequency=220:duration=14,volume=0.6', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', path.join(w, 'src.mov')]);
  const segs = [['أهلاً بكم في فيديو اليوم', 0.4, 3.0], ['اليوم أشرح لكم ثلاث أدوات', 3.6, 6.4], ['الأداة الأولى توفر وقتك', 7.2, 10.0], ['تابعوني للنهاية', 10.6, 13.4]];
  const a = { segments: segs.map(([t, s, e]) => { const ws = t.split(' '); const d = (e - s) / ws.length; return { start: s, end: e, text: t, words: ws.map((x, i) => ({ word: x, start: +(s + i * d).toFixed(2), end: +(s + (i + 1) * d).toFixed(2) })) }; }) };
  fs.writeFileSync(path.join(w, 'a.json'), JSON.stringify(a));
  fs.writeFileSync(path.join(w, 'fixes.json'), JSON.stringify({ fix: segs.map((x) => x[0]) }));
  fs.writeFileSync(path.join(w, 'cut.json'), JSON.stringify({ keep: segs.map((x) => [x[1], x[2]]), zooms: { '0.40': 1, '3.60': 1.08, '7.20': 1, '10.60': 1.06 }, total: 11.2 }));
  fs.writeFileSync(path.join(w, 'sfx.json'), JSON.stringify({ outro: 3.5 }));
  fs.writeFileSync(path.join(w, 'compose.html'), '<!doctype html><title>sample</title>');
  return w;
}

function waitPort(port, ms = 15000) {
  const http = require('http');
  const t0 = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const r = http.get({ host: '127.0.0.1', port, path: '/', timeout: 800 }, (res) => { res.resume(); resolve(); });
      r.on('error', () => (Date.now() - t0 > ms ? reject(new Error('port ' + port + ' did not open')) : setTimeout(tryOnce, 300)));
      r.on('timeout', () => r.destroy());
    };
    tryOnce();
  });
}

async function launch() {
  const { chromium } = require('playwright');
  // Installed Chrome plays the H.264 move previews in the library tab; Playwright's Chromium may not.
  try { return await chromium.launch({ channel: 'chrome' }); } catch (e) { return chromium.launch(); }
}

async function takeShots() {
  fs.mkdirSync(IMG, { recursive: true });
  const { dir } = makeSample();
  const PORT = 4795;
  const serve = cp.spawn(process.execPath, [path.join(ROOT, 'engine', 'serve.js'), String(PORT), '--dir', dir], { stdio: 'ignore' });
  let studio = null;
  const browser = await launch();
  try {
    await waitPort(PORT);
    const page = await browser.newPage({ viewport: { width: 1360, height: 860 }, deviceScaleFactor: 1.5, colorScheme: 'light' });
    // Never show this machine's real folders: the montage tab prints the plugin + project paths.
    await page.route('**/api/paths', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(SAMPLE_PATHS) }));
    const base = `http://localhost:${PORT}/`;
    for (const t of ['ideas', 'schedule', 'build', 'montage', 'library', 'me']) {
      await page.goto(base + 'app.html#' + t);
      await page.waitForTimeout(2000);
      if (t === 'library') { // move previews play on hover — start them so the tiles are not black
        await page.evaluate(() => document.querySelectorAll('video').forEach((v) => { v.muted = true; v.preload = 'auto'; v.play().catch(() => {}); }));
        await page.waitForTimeout(4000);
      }
      await page.screenshot({ path: path.join(IMG, `app-${t}.png`) });
    }
    for (const [n, u] of [['welcome', 'welcome.html'], ['course-studio', 'course-studio/studio.html']]) {
      await page.goto(base + u);
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(IMG, `${n}.png`) });
    }
    if (has('ffmpeg') && has('python3')) {
      const w = makeWork(dir);
      const SP = 8799;
      studio = cp.spawn('python3', [path.join(ROOT, 'skills', 'io-video-editor', 'studio', 'studio.py'), w, String(SP)], { stdio: 'ignore' });
      try {
        await waitPort(SP);
        await page.goto(`http://127.0.0.1:${SP}/timeline`);
        await page.waitForTimeout(8000);
        await page.screenshot({ path: path.join(IMG, 'timeline.png') });
      } catch (e) { console.warn('⚠ timeline screenshot skipped: ' + e.message); }
    } else console.warn('⚠ timeline screenshot skipped (needs ffmpeg + python3)');
  } finally {
    await browser.close();
    serve.kill();
    if (studio) studio.kill();
  }
  console.log('✓ screenshots → ' + IMG);
}

/* ───────────── fill the template and print ───────────── */
/** web/lib/logo.svg inline (no <title>, decorative on the cover — the name is printed beside it). */
function logoSvg() {
  return fs.readFileSync(PRODUCT.logo, 'utf8').replace(/<title>[\s\S]*?<\/title>\s*/, '').replace(/ role="img" aria-label="[^"]*"/, ' aria-hidden="true"').trim();
}

async function build() {
  const missing = SHOTS.filter((s) => !fs.existsSync(path.join(IMG, s + '.png')));
  if (argv.includes('--shots') || missing.length === SHOTS.length) await takeShots();
  const version = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude-plugin', 'plugin.json'), 'utf8')).version;
  const sk = skillsTable();
  const tokens = {
    NAME: PRODUCT.ar, NAME_EN: PRODUCT.en, SLOGAN: esc(PRODUCT.slogan), SLOGAN_EN: esc(PRODUCT.sloganEn), LOGO_SVG: logoSvg(), PLUGIN: PLUGIN_ID, MARKET: MARKETPLACE, REPO, VERSION: version,
    SKILL_COUNT: String(sk.count), SKILLS_TABLE: sk.html, DATE: ymd(new Date()),
  };
  let html = fs.readFileSync(path.join(HERE, 'guide.html'), 'utf8');
  html = html.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => (k in tokens ? tokens[k] : m));
  // Pages whose screenshot is missing are dropped (e.g. timeline without ffmpeg).
  html = html.replace(/<figure data-shot="([\w-]+)"[\s\S]*?<\/figure>/g, (m, n) => (fs.existsSync(path.join(IMG, n + '.png')) ? m : ''));
  const built = path.join(HERE, 'guide.built.html');
  fs.writeFileSync(built, html);
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.goto('file://' + built, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({ path: OUT, format: 'A4', printBackground: true, preferCSSPageSize: true,
      displayHeaderFooter: true, headerTemplate: '<span></span>',
      footerTemplate: `<div style="width:100%;font-size:7.5pt;color:#8A96A3;font-family:sans-serif;padding:0 15mm;display:flex;justify-content:space-between"><span>${esc(PRODUCT.en)} · ${esc(PLUGIN_ID)}</span><span class="pageNumber"></span></div>` });
  } finally {
    await browser.close();
    if (!argv.includes('--html')) fs.unlinkSync(built);
  }
  const pages = (fs.readFileSync(OUT, 'latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  console.log(`✓ ${path.relative(process.cwd(), OUT)} — ${pages} صفحة · ${sk.count} سكل · ${PRODUCT.ar} ${version}`);
}

build().catch((e) => { console.error(e); process.exit(1); });
