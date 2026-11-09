#!/usr/bin/env node
/*
 * Builds the step-by-step TUTORIAL (Arabic, RTL) with annotated screenshots.
 *
 *   node docs/tutorial/build.js            # tutorial.html → io-studio-tutorial.pdf (takes screenshots if img/ is empty)
 *   node docs/tutorial/build.js --shots    # retake every screenshot first
 *   node docs/tutorial/build.js --only a,b # retake only these screenshots (ids from SHOTS below), then print
 *   node docs/tutorial/build.js --no-pdf   # screenshots only
 *
 * What it does:
 *   1. makes a demo project in a temp folder (shown as ~/my-project): onboard apply with neutral
 *      sample data, sample ideas + trend ideas, a series, an Instagram stats pull (synthetic),
 *      one reel analysis, queue requests, and short test videos made with ffmpeg
 *      (a take in recordings/, a work folder for the timeline, a finished render in output/);
 *   2. starts engine/serve.js (and the video editor's studio.py for the timeline) and takes
 *      Playwright screenshots of each step at desktop and phone sizes;
 *   3. draws the annotations ON the page before each screenshot: numbered sky-blue circles,
 *      arrows and short Arabic labels, placed from the real elements' bounding boxes
 *      (selectors in SHOTS — never hand-typed pixels);
 *   4. prints tutorial.html (which stays viewable as is, it only references img/*.png) to
 *      io-studio-tutorial.pdf (A4).
 *
 * Needs Playwright (require('playwright')), ffmpeg and python3 (timeline shots are skipped without them).
 * Nothing from this machine reaches the pictures: /api/paths is answered with ~/my-project, and
 * every name / handle in the sample is a placeholder («اسمك»، «@حسابك»).
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const HERE = __dirname;
const ROOT = path.resolve(HERE, '..', '..'); // the plugin folder
const IMG = path.join(HERE, 'img');
const SRC = path.join(HERE, 'tutorial.html');
const OUT = path.join(HERE, 'io-studio-tutorial.pdf');
const FONT = path.join(ROOT, 'skills', 'io-video-editor', 'motion', 'fonts', 'Cairo-VF.ttf');
const SAMPLE_PATHS = { project: '~/my-project', plugin: '~/.claude/plugins/marketplaces/io-studio', sep: '/' };
const PORT = 4797; // serve.js
const SP = 8792; // studio.py — the app's default editor port, so the montage tab shows «● شغّال»

const argv = process.argv.slice(2);
const flag = (k) => argv.includes(k);
const optVal = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };

function ymd(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
function has(cmd) { for (const a of ['-version', '--version']) { try { cp.execFileSync(cmd, [a], { stdio: 'ignore' }); return true; } catch (e) { /* next */ } } return false; }
const node = (script, args, opts = {}) => cp.execFileSync(process.execPath, [path.join(ROOT, 'engine', script), ...args], { stdio: opts.quiet ? 'pipe' : 'inherit', encoding: 'utf8' });
const writeJson = (f, o) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(o, null, 2)); };
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

/* ═════════════════════════ 1. the demo project ═════════════════════════ */

function ffmpeg(args) { cp.execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...args]); }
/** A short test video: colour test pattern + a soft tone (no people, no real footage). */
function testVideo(out, { w = 720, h = 1280, d = 8, pattern = 'testsrc2', tone = 220 } = {}) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  ffmpeg(['-f', 'lavfi', '-i', `${pattern}=s=${w}x${h}:d=${d}:r=30`, '-f', 'lavfi', '-i', `sine=frequency=${tone}:duration=${d},volume=0.5`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', out]);
}
/** A gradient «thumbnail» (served instead of the fake CDN images of the sample stats). */
function thumb(out, hue) {
  ffmpeg(['-f', 'lavfi', '-i', `gradients=s=360x640:c0=0x0E1013:c1=${hue}:x0=0:y0=0:x1=360:y1=640:d=1`, '-frames:v', '1', out]);
}

/** Instagram pull in Composio's shape (engine/stats.js import --from composio-instagram) — synthetic numbers. */
function instagramPull() {
  const caps = [
    'ليش ما أحد يگلك هالشي عن الذكاء الاصطناعي؟', '٣ أدوات توفر عليك ساعة يومياً', 'غلطة تخلي الريل يموت بأول ثانية',
    'جربت أسوي فيديو كامل بلا تصوير', 'شلون أكتب هوك يوقف التمرير', 'يوم كامل ويّا Claude', 'قبل وبعد: نفس الفيديو بمونتاج ثاني',
    'سؤال من التعليقات: شنو أبدأ؟', 'أسرع طريقة لكابشن عربي', 'ثلاث أخطاء بالإضاءة', 'شلون أرتّب أفكار الأسبوع', 'الترند اللي ما لازم تلحقه',
  ];
  const media = [], insights = {};
  const now = Date.now();
  caps.forEach((c, k) => {
    const id = String(1901 + k);
    const reel = k % 4 !== 3;
    const t = new Date(now - (3 + k * 3) * 864e5); t.setUTCHours([17, 19, 15, 20][k % 4], 0, 0, 0);
    const views = [42000, 8800, 3100, 15600, 6400, 2400, 21000, 4800, 9900, 3600, 7200, 2900][k];
    const likes = Math.round(views * (0.035 + (k % 3) * 0.01));
    media.push({ id, caption: c, media_type: reel ? 'VIDEO' : 'CAROUSEL_ALBUM', media_product_type: reel ? 'REELS' : 'FEED', media_url: `https://cdn.example.invalid/v${id}.mp4`, permalink: `https://www.instagram.com/reel/SAMPLE${id}/`, thumbnail_url: `https://cdn.example.invalid/t${id}.jpg`, timestamp: t.toISOString().replace('Z', '+0000').replace(/\.\d{3}/, ''), like_count: likes, comments_count: Math.round(likes / 12) });
    const m = (name, value) => ({ name, period: 'lifetime', values: [{ value }], title: name, description: '', id: `${id}/insights/${name}/lifetime` });
    const row = [m('views', views), m('reach', Math.round(views * 0.74)), m('saved', Math.round(views * 0.02)), m('shares', Math.round(views * 0.012)), m('likes', likes), m('comments', Math.round(likes / 12)), m('total_interactions', Math.round(views * 0.07))];
    if (reel) row.push(m('ig_reels_avg_watch_time', [11800, 6200, 2900, 9400, 7100, 3300, 10200, 0, 6800, 3100, 0, 2600][k] || 5000), m('ig_reels_video_view_total_time', views * 7000), m('reels_skip_rate', [28, 46, 71, 35, 44, 66, 31, 0, 47, 69, 0, 73][k] || 50));
    insights[id] = { data: { data: row }, successful: true };
  });
  const series = (n, f) => Array.from({ length: n }, (_, k) => ({ value: f(k), end_time: new Date(now - (n - k) * 864e5).toISOString().replace(/\.\d{3}Z$/, '+0000') }));
  return {
    kind: 'io-composio-instagram', pulledAt: new Date().toISOString(),
    user: { data: { id: '17840000000000001', username: 'your_account', name: 'اسمك', account_type: 'MEDIA_CREATOR', followers_count: 12480, follows_count: 210, media_count: caps.length }, successful: true, error: null },
    media: { data: { data: media }, successful: true },
    insights,
    userInsights: [
      { data: { data: [{ name: 'follower_count', period: 'day', values: series(28, (k) => 20 + ((k * 37) % 45)), title: '', description: '', id: 'a' }] }, successful: true },
      { data: [{ name: 'online_followers', period: 'lifetime', values: [{ value: { 9: 220, 13: 410, 17: 690, 19: 940, 20: 1010, 21: 880, 23: 300 }, end_time: new Date().toISOString().replace(/\.\d{3}Z$/, '+0000') }], title: '', description: '', id: 'b' }] },
      { data: [{ name: 'follower_demographics', period: 'lifetime', title: '', description: '', id: 'c', total_value: { value: 0, breakdowns: [{ dimension_keys: ['timeframe', 'country'], results: [['IQ', 5200], ['SA', 2100], ['KW', 1300], ['AE', 900], ['JO', 600]].map(([c, v]) => ({ dimension_values: ['THIS_MONTH', c], value: v })) }] } }] },
    ],
    errors: [],
  };
}

/** The timeline work folder: a test video split into 4 «sentences» with word timings (like guide/build.js). */
function makeWork(w) {
  fs.mkdirSync(w, { recursive: true });
  ffmpeg(['-f', 'lavfi', '-i', 'smptebars=s=720x1280:d=14:r=30', '-f', 'lavfi', '-i', 'sine=frequency=220:duration=14,volume=0.6', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', path.join(w, 'src.mov')]);
  const segs = [['أهلاً بكم في فيديو اليوم', 0.4, 3.0], ['اليوم أشرح لكم ثلاث أدوات', 3.6, 6.4], ['الأداة الأولى توفر وقتك', 7.2, 10.0], ['تابعوني للنهاية', 10.6, 13.4]];
  const a = { segments: segs.map(([t, s, e]) => { const ws = t.split(' '); const d = (e - s) / ws.length; return { start: s, end: e, text: t, words: ws.map((x, i) => ({ word: x, start: +(s + i * d).toFixed(2), end: +(s + (i + 1) * d).toFixed(2) })) }; }) };
  writeJson(path.join(w, 'a.json'), a);
  writeJson(path.join(w, 'fixes.json'), { fix: segs.map((x) => x[0]) });
  writeJson(path.join(w, 'cut.json'), { keep: segs.map((x) => [x[1], x[2]]), zooms: { '0.40': 1, '3.60': 1.08, '7.20': 1, '10.60': 1.06 }, total: 11.2 });
  writeJson(path.join(w, 'sfx.json'), { outro: 3.5 });
  fs.writeFileSync(path.join(w, 'compose.html'), '<!doctype html><title>sample</title>');
}

function makeSample() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'io-tutorial-'));
  const dir = path.join(base, 'my-project');
  fs.mkdirSync(dir, { recursive: true });
  const payload = {
    dialect: 'iraqi', name: 'اسمك', brand: 'اسم البراند', niche: 'تقنية وذكاء اصطناعي', audience: 'صنّاع محتوى مبتدئين', tone: 'ودّي وبسيط',
    handles: { instagram: '@حسابك', youtube: '@حسابك', tiktok: '@حسابك' },
    accountType: 'creator', contentFormat: 'video',
    sources: { accounts: [{ platform: 'instagram', handle: '@حساب_تتابعه' }, { platform: 'instagram', handle: '@حساب_ثاني' }, { platform: 'youtube', handle: '@قناة_تتابعها' }], sites: ['example.com'], keywords: ['ذكاء اصطناعي', 'مونتاج'] },
    dailyTrends: { enabled: true, hour: 9 },
    identity: { mode: 'create', mood: 'calm', option: 2 },
  };
  writeJson(path.join(base, 'onboard.json'), payload);
  node('onboard.js', ['apply', path.join(base, 'onboard.json'), '--dir', dir], { quiet: true });

  // a series (مشاريعي → السلاسل)
  const look = { format: '9:16', captionStyle: 'karaoke', theme: { acc: '#5CB8F0' }, intro: { text: 'درس الأسبوع', move: 'hookBanner' }, outro: { text: 'تابعني للدرس الجاي', sub: '@حسابك' }, cta: 'احفظ الفيديو', cadence: { every: 'weekly', day: 4, time: '19:00' } };
  node('series.js', ['create', '--name', 'درس الأسبوع', '--look', JSON.stringify(look), '--dir', dir], { quiet: true });
  const serId = (readJson(path.join(dir, '.io', 'series', fs.readdirSync(path.join(dir, '.io', 'series')).find((f) => f.endsWith('.json')))).id);

  // ideas: two «today's suggestions» from the trend, two scheduled, one manual
  const ideas = [
    { title: '٣ أدوات ذكاء اصطناعي توفر عليك ساعة يومياً', hook: 'هالثلاث أدوات غيّرت يومي', format: 'ريل / شورت', source: 'trend', trendRef: { title: 'ريل جاب ٤٫٢× مشاهدات الحساب', url: 'https://example.com/trend-1', account: '@حساب_تتابعه' }, why: 'هالريل جاب ٤٫٢× مشاهدات الحساب المعتادة — وجمهورك يحب النصائح السريعة' },
    { title: 'غلطة تخلي الريل يموت بأول ثانية', hook: 'لا تبدأ بالسلام', format: 'ريل / شورت', source: 'trend', trendRef: { title: 'منشور ترند', url: 'https://example.com/trend-2', account: '@حساب_ثاني' }, why: 'سؤال متكرر بحسابات تتابعها هالأسبوع' },
    { title: 'كيف تكتب هوك يوقف التمرير', hook: 'أول ٣ ثواني هي كل شي', format: 'كاروسيل', source: 'manual', date: day(2), time: '20:30', status: 'scheduled' },
    { title: 'درس: أول فيديو مونتاج بالذكاء الاصطناعي', hook: 'من صفر لريل جاهز', format: 'فيديو طويل', source: 'manual', date: day(4), time: '19:00', status: 'scheduled' },
    { title: 'جولة بمكتبي وأدوات التصوير', hook: 'كل اللي أصوّر بيه', format: 'ريل / شورت', source: 'manual' },
  ];
  writeJson(path.join(base, 'ideas.json'), ideas);
  node('app-api.js', ['add-ideas', path.join(base, 'ideas.json'), '--dir', dir], { quiet: true });
  const planF = path.join(dir, '.io', 'plan.json');
  const plan = readJson(planF);
  const by = (t) => plan.ideas.find((i) => i.title === t);
  const first = by(ideas[0].title), lesson = by(ideas[3].title);
  first.work = 'work/three-tools';
  lesson.series = serId;
  writeJson(planF, plan);

  // videos (test patterns only)
  if (has('ffmpeg')) {
    testVideo(path.join(dir, 'recordings', `${day(-1)}-lesson-1.mp4`), { w: 1280, h: 720, d: 6, pattern: 'testsrc2', tone: 260 });
    testVideo(path.join(dir, 'output', 'video', 'reel-final.mp4'), { d: 4, pattern: 'rgbtestsrc', tone: 330 });
    makeWork(path.join(dir, 'work', 'three-tools'));
    const th = path.join(base, 'thumbs'); fs.mkdirSync(th, { recursive: true });
    ['0x5CB8F0', '0x2E9BE0', '0x8A5CF0', '0x4CC38A', '0xE7B04A', '0xF0716A'].forEach((c, k) => thumb(path.join(th, `t${k}.jpg`), c));
  }

  // Instagram stats (synthetic Composio pull) + one deep analysis
  const pull = path.join(base, 'ig-pull.json');
  writeJson(pull, instagramPull());
  node('stats.js', ['import', '--from', 'composio-instagram', pull, '--dir', dir], { quiet: true });
  writeJson(path.join(dir, '.io', 'analysis', 'instagram-1903.json'), {
    at: day(0), verdict: 'الهوك بطيء: أول ثانيتين بلا وعد واضح، ونسبة التخطي ٧١٪.', promised: 'غلطة وحدة تموّت الريل', leftAt: 'الثانية ٢ — قبل ما يبين الوعد',
    why: 'بدأ بمقدمة عامة بدل الغلطة نفسها، والكابشن نزل متأخر.', fixes: ['ابدأ بالغلطة بأول جملة', 'كابشن من أول فريم', 'قص أول ثانية ونص'],
    hook: { original: 'هلا بيكم، اليوم راح أحچي عن…', rewritten: 'هالغلطة تموّت ريلك بأول ثانية' }, durationSec: 24,
  });

  // requests to Claude (the «🤖 طلباتك لـ Claude» panel)
  const q = (args) => node('queue.js', [...args, '--dir', dir], { quiet: true });
  try {
    const m = JSON.parse(q(['add', 'montage', JSON.stringify({ ideaId: first.id, format: 'reel', title: first.title, source: 'app' })]));
    const mid = (m.item || m).id;
    q(['take', mid]); q(['progress', mid, 'أشيل السكتات وأركّب الكابشن', '45']);
    const r = JSON.parse(q(['add', 'script', JSON.stringify({ text: 'فكرة: شلون أنظّم أسبوع المحتوى بساعة وحدة', format: 'reel', title: 'سكربت مني' })]));
    const rid = (r.item || r).id;
    q(['take', rid]); q(['done', rid, '--note', 'انضافت للأفكار']);
  } catch (e) { console.warn('⚠ queue sample skipped: ' + e.message); }
  return { base, dir, work: path.join(dir, 'work', 'three-tools') };
}


/* ═════════════════════════ 2. annotations (drawn in the page) ═════════════════════════ */

/**
 * Runs inside the page. notes: [{ sel, text, has?, nth?, side?, pad? }] — number = index + 1.
 * Finds each element, outlines it, places a numbered label where it fits best inside `bounds`
 * (document coordinates) and draws an arrow from the label to the element.
 * Returns what it could not find, so the build fails loudly instead of printing a wrong picture.
 */
function drawNotes({ notes, bounds, scale, frame }) {
  const K = scale || 1;
  const old = document.getElementById('__tut'); if (old) old.remove();
  const sx = window.scrollX, sy = window.scrollY;
  // phone shots: the page runs in an <iframe> (the «phone») and the labels go on the host page around it
  const FR = frame ? document.querySelector(frame) : null;
  const D = FR ? FR.contentDocument : document;
  const fr = FR ? FR.getBoundingClientRect() : null;
  const ox = FR ? fr.left + FR.clientLeft + sx : sx, oy = FR ? fr.top + FR.clientTop + sy : sy;
  const FB = FR ? { x: fr.left + FR.clientLeft + sx, y: fr.top + FR.clientTop + sy, w: FR.clientWidth, h: FR.clientHeight } : null;
  const missing = [];
  const visible = (e) => { const r = e.getBoundingClientRect(); const cs = e.ownerDocument.defaultView.getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const targets = notes.map((n, k) => {
    let list = [];
    try { list = [...D.querySelectorAll(n.sel)]; } catch (e) { list = []; }
    list = list.filter(visible);
    if (n.has) list = list.filter((e) => (e.textContent || e.value || '').includes(n.has));
    const el = list[n.nth || 0];
    if (!el) { missing.push(`${k + 1}: ${n.sel}${n.has ? ' «' + n.has + '»' : ''}`); return null; }
    const r = el.getBoundingClientRect();
    const p = n.pad == null ? 4 : n.pad;
    return { x: r.left + ox - p, y: r.top + oy - p, w: r.width + 2 * p, h: r.height + 2 * p };
  });
  const B = { x: bounds.x + 6, y: bounds.y + 6, w: bounds.w - 12, h: bounds.h - 12 };
  const VB = FB || B; // where a target must be to be seen
  targets.forEach((t, k) => { // a target outside the picture would get an arrow to nowhere
    if (t && !(t.x < VB.x + VB.w && t.x + t.w > VB.x && t.y + t.h * 0.5 < VB.y + VB.h && t.y + t.h * 0.5 > VB.y)) { missing.push(`${k + 1}: ${notes[k].sel} (outside the picture)`); targets[k] = null; }
  });
  const root = document.createElement('div');
  root.id = '__tut';
  root.style.cssText = `position:absolute;left:0;top:0;width:${document.documentElement.scrollWidth}px;height:${document.documentElement.scrollHeight}px;pointer-events:none;z-index:2147483647;direction:rtl`;
  // a modal <dialog> sits in the browser's top layer, above any z-index: draw inside it instead
  const modal = FR ? null : [...document.querySelectorAll('dialog[open]')].find((d) => { try { return d.matches(':modal'); } catch (e) { return false; } });
  if (modal) { root.style.position = 'fixed'; root.style.left = -sx + 'px'; root.style.top = -sy + 'px'; modal.appendChild(root); } else document.body.appendChild(root);
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', root.style.width); svg.setAttribute('height', root.style.height);
  svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible';
  svg.innerHTML = '<defs><marker id="__tutA" viewBox="0 0 10 10" refX="8.2" refY="5" markerWidth="4.2" markerHeight="4.2" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#5CB8F0" stroke="#0E1013" stroke-width="1.2"/></marker></defs>';
  root.appendChild(svg);
  const inter = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const inside = (a) => a.x >= B.x && a.y >= B.y && a.x + a.w <= B.x + B.w && a.y + a.h <= B.y + B.h;
  const placed = [], arrows = [];
  // what a label should not cover: words, pictures and controls already on the page
  const obst = [];
  const inB = (r) => r.x < B.x + B.w && r.x + r.w > B.x && r.y < B.y + B.h && r.y + r.h > B.y;
  const tw = D.createTreeWalker(D.body, NodeFilter.SHOW_TEXT, { acceptNode: (t) => (t.nodeValue.trim() && !(t.parentElement && t.parentElement.closest('#__tut')) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
  const rg = D.createRange();
  for (let t = tw.nextNode(); t && obst.length < 4000; t = tw.nextNode()) {
    rg.selectNodeContents(t);
    for (const r of rg.getClientRects()) { const o = { x: r.left + ox, y: r.top + oy, w: r.width, h: r.height }; if (o.w > 1 && inB(o)) obst.push(o); }
  }
  if (FB) obst.push(FB); // the phone itself: labels go beside it
  D.querySelectorAll('img,video,canvas,input,select,textarea,button,.pill').forEach((e) => {
    if (e.closest('#__tut')) return;
    const r = e.getBoundingClientRect(); const o = { x: r.left + ox, y: r.top + oy, w: r.width, h: r.height };
    if (o.w > 2 && o.h > 2 && inB(o)) obst.push(o);
  });
  const segRect = (a, b, r) => { // does segment a→b cross rect r? (Liang–Barsky)
    let t0 = 0, t1 = 1; const dx = b.x - a.x, dy = b.y - a.y;
    for (const [p, q] of [[-dx, a.x - r.x], [dx, r.x + r.w - a.x], [-dy, a.y - r.y], [dy, r.y + r.h - a.y]]) {
      if (p === 0) { if (q < 0) return false; } else { const t = q / p; if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; } }
    }
    return t1 - t0 > 0.02;
  };
  const segSeg = (a, b, c, d) => { const o = (p, q, r) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)); return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b); };
  const shrink = (r, m) => ({ x: r.x + m, y: r.y + m, w: Math.max(0, r.w - 2 * m), h: Math.max(0, r.h - 2 * m) });
  // outlines first (they are obstacles for every label)
  targets.forEach((t) => {
    if (!t) return;
    const o = document.createElement('div');
    o.style.cssText = `position:absolute;left:${t.x}px;top:${t.y}px;width:${t.w}px;height:${t.h}px;border:${3 * K}px solid #5CB8F0;border-radius:${9 * K}px;box-shadow:0 0 0 ${2 * K}px rgba(14,16,19,.75), 0 0 ${14 * K}px rgba(92,184,240,.55);box-sizing:border-box`;
    root.appendChild(o);
  });
  targets.forEach((t, k) => {
    if (!t) return;
    const n = notes[k];
    const lab = document.createElement('div');
    lab.style.cssText = `position:absolute;display:flex;align-items:center;gap:${7 * K}px;max-width:${(n.maxw || 190) * K}px;padding:${4 * K}px ${12 * K}px ${4 * K}px ${5 * K}px;background:#0E1013;color:#fff;border:${2 * K}px solid #5CB8F0;border-radius:${22 * K}px;font:700 ${14.5 * K}px/1.45 TutCairo,Cairo,sans-serif;box-shadow:0 ${4 * K}px ${14 * K}px rgba(0,0,0,.35);white-space:normal;direction:rtl;text-align:right`;
    lab.innerHTML = `<span style="flex:none;display:inline-grid;place-items:center;width:${27 * K}px;height:${27 * K}px;border-radius:50%;background:#5CB8F0;color:#0E1013;font:800 ${15 * K}px/1 TutCairo,Cairo,sans-serif">${k + 1}</span><span></span>`;
    lab.lastChild.textContent = n.text;
    root.appendChild(lab);
    const lw = lab.offsetWidth, lh = lab.offsetHeight;
    const cands = [];
    const sides = n.side ? [n.side, 'left', 'right', 'bottom', 'top'] : ['left', 'right', 'bottom', 'top'];
    sides.forEach((side, si) => {
      for (const g of [18, 34, 60, 100, 150, 220, 320, 440].map((v) => v * K)) {
        const al = side === 'left' || side === 'right'
          ? [t.y + t.h / 2 - lh / 2, t.y - lh - 6 * K, t.y + t.h + 6 * K, t.y, t.y + t.h - lh, t.y - lh - 50 * K, t.y + t.h + 50 * K]
          : [t.x + t.w / 2 - lw / 2, t.x + t.w - lw, t.x, t.x + t.w - lw - 80 * K, t.x + 80 * K, t.x + t.w + 20 * K, t.x - lw - 20 * K];
        al.forEach((a, ai) => {
          const c = side === 'left' ? { x: t.x - g - lw, y: a } : side === 'right' ? { x: t.x + t.w + g, y: a } : side === 'top' ? { x: a, y: t.y - g - lh } : { x: a, y: t.y + t.h + g };
          c.w = lw; c.h = lh; c.cost = (si && n.side ? 500 : si * 120) + (g / K) * 4 + ai * 25;
          cands.push(c);
        });
      }
    });
    // the page's side margins (wide screenshots leave room there): a label in the gutter, level with the element
    for (const gx of [B.x + 8 * K, B.x + B.w - lw - 8 * K]) {
      if ((gx < t.x && gx + lw > t.x - 12 * K) || (gx > t.x && gx < t.x + t.w + 12 * K)) continue; // not beside it
      [0, -46, 46, -96, 96, -150, 150].forEach((dy, i) => cands.push({ x: gx, y: t.y + t.h / 2 - lh / 2 + dy * K, w: lw, h: lh, cost: 160 + i * 30 + Math.abs(gx - t.x) / K * 0.15 }));
    }
    let best = null;
    const tin = shrink(t, 4 * K);
    for (const c of cands) {
      if (!inside(c)) continue;
      let cost = c.cost;
      for (const p of placed) cost += inter(c, { x: p.x - 8 * K, y: p.y - 8 * K, w: p.w + 16 * K, h: p.h + 16 * K }) * 60;
      targets.forEach((o, j) => { if (o) cost += inter(c, o) * (j === k ? 40 : 6); });
      for (const o of obst) cost += inter(c, o) * 3;
      const c1 = { x: c.x + lw / 2, y: c.y + lh / 2 }, c2 = { x: t.x + t.w / 2, y: t.y + t.h / 2 };
      targets.forEach((o, j) => { if (o && j !== k && segRect(c1, c2, shrink(o, 3 * K))) cost += 20000; });
      for (const p of placed) if (segRect(c1, c2, p)) cost += 30000;
      for (const [a, b] of arrows) if (segSeg(c1, c2, a, b)) cost += 30000;
      arrows.forEach(([a, b]) => { if (segRect(a, b, c)) cost += 20000; }); // don't sit on an earlier arrow
      for (const o of obst) if (!inter(o, tin) && segRect(c1, c2, o)) cost += 120;
      cost += Math.hypot(c1.x - c2.x, c1.y - c2.y) / K * 0.8; // short arrows read better
      if (!best || cost < best.cost2) { best = c; best.cost2 = cost; }
    }
    if (!best) { // nothing fits: clamp next to the element
      best = { x: Math.min(Math.max(t.x - lw - 30 * K, B.x), B.x + B.w - lw), y: Math.min(Math.max(t.y, B.y), B.y + B.h - lh), w: lw, h: lh };
    }
    lab.style.left = best.x + 'px'; lab.style.top = best.y + 'px';
    placed.push(best);
    arrows.push([{ x: best.x + lw / 2, y: best.y + lh / 2 }, { x: t.x + t.w / 2, y: t.y + t.h / 2 }]);
    // arrow: from the label's edge to the outline's edge, along the line between their centres
    const c1 = { x: best.x + lw / 2, y: best.y + lh / 2 }, c2 = { x: t.x + t.w / 2, y: t.y + t.h / 2 };
    const clip = (r, from, to) => { // point where segment from(inside r)→to leaves r
      let tt = 1; const dx = to.x - from.x, dy = to.y - from.y;
      if (dx) tt = Math.min(tt, ((dx > 0 ? r.x + r.w : r.x) - from.x) / dx);
      if (dy) tt = Math.min(tt, ((dy > 0 ? r.y + r.h : r.y) - from.y) / dy);
      return { x: from.x + dx * Math.max(0, tt), y: from.y + dy * Math.max(0, tt) };
    };
    const a = clip(best, c1, c2), b = clip(t, c2, c1);
    if (Math.hypot(b.x - a.x, b.y - a.y) > 10 * K && !inter(best, t)) {
      for (const [col, wd, mk] of [['#0E1013', 6.5, false], ['#5CB8F0', 3.2, true]]) {
        const l = document.createElementNS(NS, 'line');
        l.setAttribute('x1', a.x); l.setAttribute('y1', a.y); l.setAttribute('x2', b.x); l.setAttribute('y2', b.y);
        l.setAttribute('stroke', col); l.setAttribute('stroke-width', wd * K); l.setAttribute('stroke-linecap', 'round');
        if (mk) l.setAttribute('marker-end', 'url(#__tutA)');
        svg.appendChild(l);
      }
    }
  });
  root.appendChild(svg); // arrows above outlines, under nothing
  root.querySelectorAll('div').forEach((d) => { if (d.querySelector('span')) root.appendChild(d); }); // labels on top
  return { missing };
}

/* ═════════════════════════ 3. the screenshots ═════════════════════════ */
/*
 * Each shot: id (→ img/<id>.png), vp 'desktop'|'phone', url (on serve.js unless it starts with
 * 'studio:' / 'moves:'), prep(page), clip (selectors whose union, ± margin, is the picture —
 * full page width; omitted = the first screen), notes (see drawNotes).
 */
const tap = (sel) => async (p) => { await p.click(sel); await p.waitForTimeout(500); };
const SHOTS = [
  { id: 'welcome-dialect', url: 'welcome.html', clip: ['.steps', '#next'], notes: [
    { sel: '.steps', text: 'خمس خطوات بس' },
    { sel: '#dialects .opt', text: 'اختار لهجتك' },
    { sel: '#next', text: 'التالي' },
  ] },
  { id: 'welcome-type', url: 'welcome.html', prep: async (p) => {
    await p.click('#dialects .opt'); await p.click('#next'); await p.waitForTimeout(300);
    for (const [s, v] of [['#name', 'اسمك'], ['#h-instagram', '@your_account']]) if (!(await p.inputValue(s))) await p.fill(s, v);
    await p.click('#next'); await p.waitForTimeout(600);
  }, clip: ['section[data-step="3"] h2', '#dtHourBox'], margin: 30, notes: [
    { sel: '#types .opt', text: 'نوع حسابك (صانع محتوى، طبيب، مدرّس…)', has: 'صانع' },
    { sel: '#formats', text: 'فيديو عادي أو بودكاست' },
    { sel: '#srcRows', text: 'الحسابات اللي تتابعها = مصدر الترند' },
    { sel: '#sites', text: 'مواقع مجالك (اختياري)' },
    { sel: '#dtSeg', text: 'تريد الترند يومياً؟' },
    { sel: '#dtHour', text: 'بأي ساعة' },
  ] },
  { id: 'app-ideas', url: 'app.html#ideas', clip: ['header', '#ideaGrid .card'], notes: [
    { sel: 'nav.tabs', text: 'تبويبات البرنامج', side: 'bottom' },
    { sel: '#addForm', text: 'فكرة جديدة بيدك' },
    { sel: '#ownPanel', text: 'سكربت أو فكرة منك' },
    { sel: '#statusFilter [data-filter="trend"]', text: 'اقتراحات اليوم من الترند' },
    { sel: '#ideaGrid .card [data-act="build"]', text: 'خطوات البناء' },
    { sel: '#ideaGrid .card [data-act="montage"]', text: 'أرسلها للمونتاج' },
    { sel: '#queuePanel', text: 'طلباتك لـ Claude وتقدّمها' },
    { sel: '#sourcesPanel h2', text: 'مصادر الترند', pad: 8 },
  ] },
  { id: 'app-ideas-phone', vp: 'phone', url: 'app.html#ideas', prep: async (p) => { await p.evaluate(() => document.querySelector('#statusFilter').scrollIntoView({ block: 'start' })); }, notes: [
    { sel: '#statusFilter [data-filter="trend"]', text: 'اقتراحات اليوم' },
    { sel: '#ideaGrid .card .pill.trend', text: 'من الترند + المصدر' },
    { sel: '#ideaGrid .card [data-act="montage"]', text: 'للمونتاج' },
  ], viewportOnly: true },
  { id: 'idea-trend', url: 'app.html#ideas', prep: async (p) => {
    await p.click('#statusFilter [data-filter="trend"]'); await p.waitForTimeout(300);
    await p.click('#ideaGrid .card [data-act="montage"]'); await p.waitForTimeout(500);
  }, clip: ['#statusFilter', '#ideaGrid .card'], margin: 30, notes: [
    { sel: '#ideaGrid .card .pill.trend', text: 'جاية من الترند' },
    { sel: '#ideaGrid .card a[target]', text: 'المنشور الأصلي' },
    { sel: '#ideaGrid .card .small.muted', text: 'ليش تناسبك', has: '💬' },
    { sel: '#ideaGrid .card .mtpick', text: 'اختار الصيغة ← ينرسل لـ Claude' },
    { sel: '#ideaGrid .card .qline', text: 'هنا يطلع التقدّم' },
    { sel: '#ideaGrid .card [data-act="editidea"]', text: 'عدّل الفكرة' },
  ] },
  { id: 'idea-edit', url: 'app.html#ideas', prep: async (p) => {
    await p.click('#ideaGrid .card [data-act="editidea"]'); await p.waitForTimeout(400);
    await p.evaluate(() => { const d = document.querySelector('#ideaGrid .card details[data-edit]'); if (d) d.open = true; });
    await p.fill('#ideaGrid .card [data-rwnote]', 'خلّ الهوك أقوى وحوّلها لقصة شخصية');
  }, clip: ['#ideaGrid .card details[data-edit]'], margin: 40, notes: [
    { sel: '#ideaGrid .card details[data-edit] [data-f="title"]', text: 'العنوان' },
    { sel: '#ideaGrid .card details[data-edit] [data-f="hook"]', text: 'الهوك' },
    { sel: '#ideaGrid .card details[data-edit] [data-f="series"]', text: 'السلسلة' },
    { sel: '#ideaGrid .card details[data-edit] [data-f="date"]', text: 'الموعد' },
    { sel: '#ideaGrid .card [data-rwnote]', text: 'اكتب شنو تريد يتغيّر' },
    { sel: '#ideaGrid .card [data-act="rewrite"]', text: 'Claude يعيد كتابتها' },
  ] },
  { id: 'own-script', url: 'app.html#ideas', prep: async (p) => {
    await p.click('#ownToggle'); await p.waitForTimeout(300);
    await p.fill('#ownText', 'فكرة: شلون أنظّم أسبوع المحتوى بساعة وحدة — أبدأ بقائمة الأفكار، بعدين أختار ٣، وأصوّرهم بيوم واحد.');
  }, clip: ['#ownPanel'], margin: 40, notes: [
    { sel: '#ownText', text: 'الصق سكربتك أو فكرتك' },
    { sel: '#ownFmt', text: 'الصيغة: ريل، يوتيوب، كاروسيل' },
    { sel: '#ownSend', text: 'أرسلها لـ Claude' },
  ] },
  { id: 'app-schedule', url: 'app.html#schedule', clip: ['nav.tabs', '#cal', '#bin'], notes: [
    { sel: '[data-calmode="week"]', text: 'أسبوع أو شهر' },
    { sel: '#bestLine', text: 'أفضل وقت من إحصائياتك' },
    { sel: '#cal .chip', text: 'فكرة مجدولة — اسحبها ليوم ثاني' },
    { sel: '#bin', text: 'أفكار بلا موعد' },
    { sel: '#balanceLine', text: 'توازن المنصات الثلاث' },
  ] },
  { id: 'app-build', url: 'app.html#build', clip: ['nav.tabs', '#steps .step:nth-child(3)'], notes: [
    { sel: '#buildSel', text: 'اختار الفكرة' },
    { sel: '#buildHead .bar', text: 'كم خطوة خلصت' },
    { sel: '#steps .step input[type=checkbox]', text: 'علّم الخطوة لما تخلص' },
    { sel: '#steps .step a[href*="course-studio"]', text: 'يفتح استوديو الكورسات' },
    { sel: '#steps .step [data-copy]', text: 'ينسخ الطلب لـ Claude' },
  ] },
  { id: 'app-montage', url: 'app.html#montage', clip: ['nav.tabs', '#mtBody'], notes: [
    { sel: '#mtSel', text: 'الفكرة' },
    { sel: '#mtBody input[data-f="work"]', text: 'مجلد الشغل (فيه src.mov)' },
    { sel: '#mtBody [data-copy]', text: 'شغّل المحرّر', has: 'اطلبه' },
    { sel: '#mtBody a.pill', text: 'افتح التايملاين', has: 'افتح المحرّر' },
    { sel: '#mtBody .pill', text: 'حالة المحرّر', has: 'شغّال', side: 'top' },
  ] },
  { id: 'app-projects', url: 'app.html#projects', prep: async (p) => {
    await p.click('.pj-card[data-pj^="rec:"] .pj-more'); await p.waitForTimeout(400);
  }, clip: ['nav.tabs', '.pj-card'], margin: 50, notes: [
    { sel: '#pjStatus', text: 'حالة كل مشروع' },
    { sel: '.pj-folder', text: 'سلسلة بشكل ثابت', has: 'درس الأسبوع' },
    { sel: '.pj-folder.new', text: 'سلسلة جديدة' },
    { sel: '.pj-card[data-pj^="rec:"] .pj-thumb', text: 'فيديو بمجلد recordings' },
    { sel: '.pj-menu [data-pjact="montage"]', text: 'أرسله للمونتاج' },
  ] },
  { id: 'series-dialog', url: 'app.html#projects', prep: async (p) => {
    await p.click('.pj-folder:has-text("درس الأسبوع")'); await p.waitForTimeout(400);
    await p.click('[data-pjedit]'); await p.waitForTimeout(500);
  }, clip: ['#serDlg'], margin: 10, notes: [
    { sel: '#serForm [name="name"]', text: 'اسم السلسلة' },
    { sel: '#serForm .cpick', text: 'ألوانها' },
    { sel: '#serForm [name="captionStyle"]', text: 'ستايل الكابشن' },
    { sel: '#serForm [name="motionStyle"]', text: 'ستايل الموشن' },
    { sel: '#serForm [name="lut"]', text: 'اللوك' },
    { sel: '#serForm .seg2', text: 'ريل أو يوتيوب' },
  ], fullPage: false },
  { id: 'app-library', url: 'app.html#library', prep: async (p) => {
    await p.click('#libKinds [data-kind="moves"]'); await p.waitForTimeout(600);
    // the «follow button» preview carries a real handle — leave it out of the picture
    await p.evaluate(() => document.querySelectorAll('#libSuggest .card').forEach((c) => { if (/@\w/.test(c.textContent) || c.textContent.includes('زر المتابعة')) c.remove(); }));
    await p.evaluate(() => document.querySelectorAll('.lib video').forEach((v) => { v.muted = true; v.preload = 'auto'; v.play().catch(() => {}); }));
    await p.waitForTimeout(4500);
  }, clip: ['nav.tabs', '#libSuggest .card:nth-child(4)'], notes: [
    { sel: '#libQ', text: 'دوّر بالكلمة' },
    { sel: '#libKinds', text: 'حركات، أصوات، ألوان، دروس…' },
    { sel: '#libSuggest h2, #libSuggest h3, #libSuggest b', text: 'مقترح لنوع حسابك' },
    { sel: '#libSuggest .card video', text: 'معاينة الحركة' },
    { sel: '#libSuggest .card [data-copy]', text: 'انسخ اسمها لـ Claude' },
  ] },
  { id: 'moves-gallery', vp: 'desktop', url: 'moves:', prep: async (p) => {
    await p.evaluate(() => document.querySelectorAll('video').forEach((v) => { v.muted = true; v.preload = 'auto'; v.play().catch(() => {}); }));
    await p.waitForTimeout(3500);
  }, viewportOnly: true, notes: [
    { sel: '#main .c .n', text: 'رقم الحركة — اطلبها بيه' },
    { sel: '#main .c video', text: 'معاينة', nth: 1 },
    { sel: '#main .c .yes', text: 'أبي = قدّمها', nth: 2 },
    { sel: '#main .c .no', text: 'لا = لا تستخدمها', nth: 3 },
    { sel: '#save', text: 'احفظ' },
  ] },
  { id: 'app-me', url: 'app.html#me', clip: ['nav.tabs', '#meType'], notes: [
    { sel: '#mePanel', text: 'اسمك ولهجتك وحساباتك', pad: 0 },
    { sel: '#mePanel a.pill', text: 'عدّل من نافذة الترحيب' },
    { sel: '#dtOn', text: 'الترند اليومي', pad: 8 },
    { sel: '#dtHour', text: 'ساعته' },
    { sel: '#meType h2', text: 'حزمة نوع حسابك', pad: 8 },
  ] },
  { id: 'course-studio', vp: 'tall', viewportOnly: true, url: 'course-studio/studio.html', notes: [
    { sel: '#fmtMp4', text: 'صيغة الملف (MP4 أسهل)' },
    { sel: '#resSeg', text: 'الجودة' },
    { sel: '#mtFmtSeg', text: 'يروح للمونتاج كـ: يوتيوب، ريلز، الاثنين' },
    { sel: '#mtIdea', text: 'اربطه بفكرة' },
    { sel: '#mtSeries', text: 'سلسلة (شكل ثابت)' },
    { sel: '#mtAuto', text: 'يرسله لـ Claude أول ما توقف', pad: 8 },
    { sel: '#pickCourse', text: 'مجلد الشرائح/PDF' },
    { sel: '#goScreen', text: 'أو شارك شاشتك' },
  ] },
  { id: 'timeline', vp: 'desktop', url: 'studio:/timeline', viewportOnly: true, notes: [
    { sel: '.player', text: 'المعاينة' },
    { sel: '#rSeg .blk', text: 'مقطع باقي — اسحب طرفه تقصّه', nth: 1 },
    { sel: '#rCap .cap', text: 'جملة — اضغطها تعدّلها', nth: 2 },
    { sel: '#rZoom .zm', text: 'الزوم', nth: 3 },
    { sel: '#bTrack', text: 'التتبّع', side: 'top' },
    { sel: '#askCard h3', text: 'عدّل لي', pad: 8 },
  ] },
  { id: 'timeline-caption', vp: 'desktop', url: 'studio:/timeline', prep: async (p) => {
    await p.click('#rCap .cap >> nth=1'); await p.waitForTimeout(700);
    await p.fill('#cpN', 'خلّها أقصر وبلهجتي');
  }, viewportOnly: true, notes: [
    { sel: '#cpT', text: 'صحّح النص هنا' },
    { sel: '#cpApply', text: 'احفظ وطبّق' },
    { sel: '#cpN', text: 'أو خلّي Claude يعيد صياغتها' },
    { sel: '#cpAsk', text: 'أرسل' },
  ] },
  { id: 'timeline-ask', vp: 'desktop', url: 'studio:/timeline', prep: async (p) => {
    await p.evaluate(() => document.querySelector('#askCard').scrollIntoView({ block: 'center' }));
    await p.selectOption('#askT', 'audio');
    await p.fill('#askN', 'الصوت واطي بالنص الثاني، خلّه أنظف');
  }, clip: ['#askCard'], margin: 60, notes: [
    { sel: '#askT', text: 'على شنو: صوت، كابشن، أي شي' },
    { sel: '#askN', text: 'اكتب طلبك بكلامك' },
    { sel: '#askGo', text: 'يوصل Claude' },
  ] },
  { id: 'timeline-track', vp: 'desktop', url: 'studio:/timeline', prep: async (p) => { await p.click('#bTrack'); await p.waitForTimeout(1500); }, viewportOnly: true, notes: [
    { sel: '#trackCard', text: 'لوحة التتبّع', pad: 0 },
    { sel: '#tkType', text: 'سطح، جسم، أو نقطة' },
    { sel: '#pbadge', text: 'وضع التتبّع' },
  ] },
  { id: 'stats-sources', url: 'dashboard.html', prep: async (p) => { await p.click('#sources [data-mode="composio"]'); await p.waitForTimeout(400); }, clip: ['header', '#sources'], margin: 30, notes: [
    { sel: '#sources [data-mode="composio"]', text: 'إنستقرام عبر Composio' },
    { sel: '#cSync', text: 'اسحب الآن' },
    { sel: '#cMsg', text: 'آخر سحب' },
    { sel: '#sources [data-mode="manual"]', text: 'يوتيوب وتيك توك: يدوي' },
  ] },
  { id: 'stats-manual', url: 'dashboard.html', prep: async (p) => {
    await p.click('#sources [data-mode="manual"]'); await p.waitForTimeout(300);
    await p.selectOption('#mPlatform', 'youtube');
    await p.evaluate(() => { const d = document.querySelector('#paneManual details'); if (d) d.open = true; });
  }, clip: ['#sources'], margin: 30, notes: [
    { sel: '#mPlatform', text: 'المنصة' },
    { sel: '#mFollowers', text: 'متابعينك اليوم' },
    { sel: '#mUpload', text: 'ملف تصدير CSV/JSON' },
    { sel: '#paneManual details summary', text: 'أو منشور بأرقامه' },
  ] },
  { id: 'instagram-phone', vp: 'phone', url: 'instagram.html', viewportOnly: true, notes: [
    { sel: '#syncNow', text: 'اسحب الآن' },
    { sel: '#srcChip', text: 'أرقام رسمية' },
    { sel: '#hl .hlb', text: 'مؤشراتك', nth: 1 },
    { sel: '#reelGrid .tile', text: 'كل ريل بدرجته', nth: 0 },
  ] },
  { id: 'instagram-sheet', vp: 'phone', url: 'instagram.html', prep: async (p) => {
    // newest first: the third reel is the sample post with a saved analysis (.io/analysis/instagram-1903.json)
    await p.waitForFunction(() => document.querySelectorAll('#reelGrid .tile').length > 3, null, { timeout: 15000 });
    await p.evaluate(() => document.querySelectorAll('#reelGrid .tile')[2].click()); await p.waitForTimeout(1500);
    await p.evaluate(() => document.querySelector('#sheetBody .sbtns').scrollIntoView({ block: 'end' })); await p.waitForTimeout(400);
  }, viewportOnly: true, notes: [
    { sel: '#sheetBody .deep > *', text: 'تحليل Claude' },
    { sel: '#sheetBody .newhook', text: 'هوك أقوى' },
    { sel: '#sheetBody [data-act="analyze"]', text: 'حلّل بعمق' },
    { sel: '#sheetBody [data-act="better"]', text: 'نسخة محسّنة' },
  ] },
  { id: 'lessons', url: 'lessons.html', prep: async (p) => { await p.waitForTimeout(1500); }, clip: ['header', '#grid .card:nth-child(6)'], notes: [
    { sel: '#fSubject', text: 'المادة', side: 'left' },
    { sel: '#fStyle', text: 'الستايل', side: 'left' },
    { sel: '#fFormat', text: 'المقاس', side: 'left' },
    { sel: '#grid .card', text: 'اضغطه يشتغل' },
  ] },
];

/* ═════════════════════════ 4. run: servers, browser, pictures ═════════════════════════ */

function waitPort(port, ms = 20000, p = '/') {
  const http = require('http');
  const t0 = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const r = http.get({ host: '127.0.0.1', port, path: p, timeout: 800 }, (res) => { res.resume(); resolve(); });
      r.on('error', () => (Date.now() - t0 > ms ? reject(new Error('port ' + port + ' did not open')) : setTimeout(tryOnce, 300)));
      r.on('timeout', () => r.destroy());
    };
    tryOnce();
  });
}

async function launch() {
  const { chromium } = require('playwright');
  // Installed Chrome plays the H.264 move previews; Playwright's own Chromium may not.
  try { return await chromium.launch({ channel: 'chrome' }); } catch (e) { return chromium.launch(); }
}

const VP = {
  // k = label size: the pictures are printed ~180 mm wide, so a wider page needs bigger labels
  wide: { viewport: { width: 1900, height: 940 }, deviceScaleFactor: 1.15, k: 1.7 }, // app pages: room for labels beside the content
  tall: { viewport: { width: 1600, height: 1480 }, deviceScaleFactor: 1.2, k: 1.5 }, // pages that live in a fixed, scrolling card (course studio)
  desktop: { viewport: { width: 1360, height: 860 }, deviceScaleFactor: 1.5, k: 1.35 }, // full-width pages (timeline, motion bank)
  phone: { viewport: { width: 1000, height: 912 }, deviceScaleFactor: 2, k: 1.6 }, // a 390×844 «phone» (iframe) in the middle, labels beside it
};

async function newPage(browser, vp, thumbsDir) {
  const { k: labelScale, ...opts } = VP[vp]; void labelScale; // k is for drawNotes, not Playwright
  const ctx = await browser.newContext({ ...opts, colorScheme: 'light', locale: 'ar' });
  const page = await ctx.newPage();
  // never show this machine's folders
  await page.route('**/api/paths', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(SAMPLE_PATHS) }));
  await page.route('**/__tut/cairo.ttf', (r) => r.fulfill({ contentType: 'font/ttf', body: fs.readFileSync(FONT) }));
  // the synthetic stats point at a fake CDN — answer with gradient pictures
  let k = 0;
  await page.route('https://cdn.example.invalid/**', (r) => {
    const f = thumbsDir && path.join(thumbsDir, `t${k++ % 6}.jpg`);
    if (f && fs.existsSync(f) && /\.jpg$/.test(r.request().url())) return r.fulfill({ contentType: 'image/jpeg', body: fs.readFileSync(f) });
    return r.fulfill({ status: 404, body: '' });
  });
  return page;
}

const PHONE_HOST = (src) => `<!doctype html><html dir="rtl"><head><meta charset="utf-8">
<style>@font-face{font-family:TutCairo;src:url(/__tut/cairo.ttf) format("truetype");font-weight:200 1000}
html,body{margin:0;height:100%;background:radial-gradient(90% 70% at 50% 0%,#E3F0FA,#F3F8FC 70%)}
iframe{position:absolute;left:50%;top:22px;transform:translateX(-50%);width:390px;height:844px;border:11px solid #0E1013;border-radius:42px;background:#fff;box-shadow:0 24px 60px rgba(14,16,19,.28)}</style></head>
<body><iframe id="phone" src="${src}"></iframe></body></html>`;

async function shoot(page, shot, urls) {
  const url = shot.url.startsWith('studio:') ? urls.studio + shot.url.slice(7) : shot.url.startsWith('moves:') ? urls.moves + shot.url.slice(6) : urls.app + shot.url;
  let target = page, frame = null;
  if (shot.vp === 'phone') {
    await page.route('**/__tut/phone.html', (r) => r.fulfill({ contentType: 'text/html; charset=utf-8', body: PHONE_HOST('/' + shot.url) }));
    await page.goto(urls.app + '__tut/phone.html', { waitUntil: 'load' });
    target = await (await page.$('#phone')).contentFrame();
    await target.waitForLoadState('load');
    frame = '#phone';
  } else {
    await page.goto(url, { waitUntil: 'load' });
    await page.addStyleTag({ content: '@font-face{font-family:TutCairo;src:url(/__tut/cairo.ttf) format("truetype");font-weight:200 1000}' });
  }
  await page.evaluate(() => document.fonts.load('700 16px TutCairo'));
  await page.waitForTimeout(shot.wait || 2200);
  if (shot.prep) await shot.prep(target);
  await page.waitForTimeout(400);
  const vp = page.viewportSize();
  const bounds = await page.evaluate(({ sels, margin, vw, vh, viewportOnly }) => {
    const sx = window.scrollX, sy = window.scrollY;
    if (viewportOnly || !sels) return { x: sx, y: sy, w: vw, h: vh };
    let top = Infinity, bot = -Infinity;
    for (const s of sels) {
      const e = [...document.querySelectorAll(s)].find((x) => x.getBoundingClientRect().height > 0);
      if (!e) continue;
      const r = e.getBoundingClientRect();
      top = Math.min(top, r.top + sy); bot = Math.max(bot, r.bottom + sy);
    }
    if (!isFinite(top)) return { x: sx, y: sy, w: vw, h: vh };
    top = Math.max(0, top - margin);
    bot = Math.min(document.documentElement.scrollHeight, bot + margin);
    return { x: 0, y: top, w: vw, h: bot - top };
  }, { sels: shot.clip || null, margin: shot.margin == null ? 24 : shot.margin, vw: vp.width, vh: vp.height, viewportOnly: shot.viewportOnly || !shot.clip });
  const res = await page.evaluate(drawNotes, { notes: shot.notes, bounds, scale: VP[shot.vp || 'wide'].k, frame });
  if (res.missing.length) throw new Error(`${shot.id}: element(s) not found → ${res.missing.join(' · ')}`);
  await page.waitForTimeout(150);
  const file = path.join(IMG, shot.id + '.png');
  if (shot.viewportOnly || !shot.clip) await page.screenshot({ path: file });
  else await page.screenshot({ path: file, fullPage: true, clip: { x: bounds.x, y: bounds.y, width: bounds.w, height: bounds.h } });
  return file;
}

async function takeShots(only) {
  fs.mkdirSync(IMG, { recursive: true });
  const S = makeSample();
  const kids = [];
  const serve = cp.spawn(process.execPath, [path.join(ROOT, 'engine', 'serve.js'), String(PORT), '--dir', S.dir], { stdio: 'ignore' });
  kids.push(serve);
  const urls = { app: `http://localhost:${PORT}/`, studio: `http://127.0.0.1:${SP}`, moves: null };
  const canVideo = has('ffmpeg') && has('python3');
  if (canVideo) {
    kids.push(cp.spawn('python3', [path.join(ROOT, 'skills', 'io-video-editor', 'studio', 'studio.py'), S.work, String(SP)], { stdio: 'ignore' }));
  }
  if (has('python3')) { // the numbered motion bank (scripts/35_moves.py) — its choices go to a throwaway home
    const MP = 8796;
    kids.push(cp.spawn('python3', [path.join(ROOT, 'skills', 'io-video-editor', 'scripts', '35_moves.py'), 'serve', '--port', String(MP), '--no-open', '--timeout', '900'], { stdio: 'ignore', env: { ...process.env, VAE_HOME: path.join(S.base, 'editor-home') } }));
    urls.moves = `http://127.0.0.1:${MP}/`;
  }
  const browser = await launch();
  const done = [], skipped = [];
  try {
    await waitPort(PORT);
    const pages = {};
    for (const shot of SHOTS) {
      if (only && !only.includes(shot.id)) continue;
      if (shot.url.startsWith('studio:') && !canVideo) { skipped.push(shot.id); continue; }
      if (shot.url.startsWith('moves:') && !urls.moves) { skipped.push(shot.id); continue; }
      if (shot.url.startsWith('studio:')) await waitPort(SP, 20000, '/timeline');
      if (shot.url.startsWith('moves:')) await waitPort(8796, 20000);
      const vp = shot.vp || 'wide';
      if (pages[vp]) await pages[vp].context().close();
      pages[vp] = await newPage(browser, vp, path.join(S.base, 'thumbs'));
      try { await shoot(pages[vp], shot, urls); done.push(shot.id); } catch (e) { console.error('✗ ' + e.message); skipped.push(shot.id); }
    }
  } finally {
    await browser.close();
    kids.forEach((k) => k.kill());
    fs.rmSync(S.base, { recursive: true, force: true });
  }
  console.log(`✓ ${done.length} صورة → ${path.relative(process.cwd(), IMG)}${skipped.length ? ' · ما انأخذت: ' + skipped.join('، ') : ''}`);
  return skipped;
}

/* ═════════════════════════ 5. the PDF ═════════════════════════ */

async function pdf() {
  const version = readJson(path.join(ROOT, '.claude-plugin', 'plugin.json')).version;
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.goto('file://' + SRC, { waitUntil: 'load' });
    await page.evaluate((v) => { document.querySelectorAll('[data-version]').forEach((e) => { e.textContent = v; }); }, version);
    await page.evaluate(() => document.fonts.ready);
    const missing = await page.evaluate(() => [...document.images].filter((i) => !i.naturalWidth).map((i) => i.getAttribute('src')));
    if (missing.length) console.warn('⚠ صور ناقصة: ' + missing.join('، '));
    await page.pdf({ path: OUT, format: 'A4', printBackground: true, preferCSSPageSize: true,
      displayHeaderFooter: true, headerTemplate: '<span></span>',
      footerTemplate: '<div style="width:100%;font-size:7.5pt;color:#8A96A3;font-family:sans-serif;padding:0 15mm;display:flex;justify-content:space-between"><span>I/O Studio · Tutorial</span><span class="pageNumber"></span></div>' });
  } finally { await browser.close(); }
  const pages = (fs.readFileSync(OUT, 'latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  console.log(`✓ ${path.relative(process.cwd(), OUT)} — ${pages} صفحة · ${version}`);
}

async function main() {
  const only = optVal('--only') ? optVal('--only').split(',') : null;
  const empty = !fs.existsSync(IMG) || !fs.readdirSync(IMG).some((f) => f.endsWith('.png'));
  if (flag('--shots') || only || empty) await takeShots(only);
  if (!flag('--no-pdf')) await pdf();
}

main().catch((e) => { console.error(e); process.exit(1); });
