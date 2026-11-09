#!/usr/bin/env node
/*
 * I/O Studio — request queue (page → Claude).
 *
 * The web pages (app.html, the course studio, the video editor's timeline) can't
 * talk to Claude directly. They drop a request into <project>/.io/queue.json
 * through the local server (POST /api/queue); Claude keeps `queue.js wait`
 * running in the background, gets woken when it exits, handles the request with
 * the right skill, reports progress, and re-arms the wait (skills/io-autopilot).
 *
 *   node engine/queue.js wait     [--dir <project>] [--timeout <sec>]   # blocks until a request is pending, prints it as JSON
 *   node engine/queue.js list     [--dir <project>] [--all]
 *   node engine/queue.js take     <id> [--dir <project>]                # pending → working
 *   node engine/queue.js progress <id> "<message>" [pct] [--dir <project>]
 *   node engine/queue.js done     <id> [--out <path>] [--note "<msg>"] [--dir <project>]
 *   node engine/queue.js fail     <id> "<message>" [--dir <project>]
 *   node engine/queue.js add      <type> '<json>' [--dir <project>]     # same validation as the page
 *
 * Request types:
 *   montage      { ideaId?, format: reel|youtube|both, file?, title?, series? } — edit a recording into a video (series: start from its look)
 *   rewrite-idea { ideaId, note }                                        — rewrite an idea in the plan
 *   edit         { target: caption|audio|general, ideaId?, work?, segment?, note }
 *   script       { text, format: reel|youtube|both|carousel, ideaId? }  — the creator's own script/idea
 *   analyze-post { platform, postId, title?, url?, file?, metrics{…}, note? } or { platform?, posts:[…≤30] } — deep reel analysis (stats page)
 *   sync-stats   { platform: instagram }                                — pull Instagram through Claude + Composio (skills/io-dashboard)
 *   sync-trends  { platform: instagram, top?: 1–10 }                     — trend pull from followed accounts via Composio ScrapeCreators (skills/io-trends)
 *   stats-ideas  { platform?, top:[{title,url,views,…}], note? }        — ideas from the best posts
 *   stats-reel   { platform?, numbers{…}, note? }                       — a motion reel built from the numbers
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { dataDir, dataFile } = require('./data-dir.js');

const TYPES = ['montage', 'rewrite-idea', 'edit', 'script', 'analyze-post', 'sync-stats', 'sync-trends', 'stats-ideas', 'stats-reel'];
const STAT_PLATFORMS = ['instagram', 'youtube', 'tiktok'];
const STATUSES = ['pending', 'working', 'done', 'error'];
const FORMATS = ['reel', 'youtube', 'both'];
const SCRIPT_FORMATS = ['reel', 'youtube', 'both', 'carousel'];
const TARGETS = ['caption', 'audio', 'general'];
const MAX_ITEMS = 300;          // finished items beyond this are dropped (oldest first)
const BODY_LIMIT = 64 * 1024;   // bytes of JSON accepted per request

const FORMAT_AR = { reel: 'ريل 9:16', youtube: 'يوتيوب طويل 16:9', both: 'ريل + يوتيوب طويل', carousel: 'كاروسيل' };
const TYPE_AR = { montage: 'مونتاج', 'rewrite-idea': 'تعديل فكرة', edit: 'تعديل', script: 'سكربت/فكرة', 'analyze-post': 'تحليل منشور', 'sync-stats': 'سحب الإحصائيات', 'sync-trends': 'سحب الترند', 'stats-ideas': 'أفكار من أفضل منشوراتي', 'stats-reel': 'ريل من الأرقام' };

const file = (dir) => dataFile(dir, 'queue.json');
function str(v, max) { return String(v == null ? '' : v).replace(/\r\n?/g, '\n').trim().slice(0, max); }
const oneLine = (v, max) => str(v, max).replace(/\s*\n\s*/g, ' ');
const cleanId = (v) => str(v, 60).replace(/[^\w-]/g, '');
/** A path inside the project (relative, no ..) or an absolute path for the video editor's work folder. */
function cleanPath(v) {
  const p = oneLine(v, 400).replace(/["'`$]/g, '');
  if (!p || p.split(/[/\\]/).includes('..')) return '';
  return p;
}

function read(dir) {
  try {
    const j = JSON.parse(fs.readFileSync(file(dir), 'utf8'));
    return { version: 1, items: Array.isArray(j.items) ? j.items.filter((x) => x && x.id && TYPES.includes(x.type)) : [] };
  } catch (e) { return { version: 1, items: [] }; }
}

function write(dir, q) {
  const f = file(dir);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  // keep every unfinished item; drop the oldest finished ones past the cap
  let items = q.items;
  if (items.length > MAX_ITEMS) {
    const extra = items.length - MAX_ITEMS;
    let dropped = 0;
    items = items.filter((x) => !(dropped < extra && (x.status === 'done' || x.status === 'error') && ++dropped));
  }
  const tmp = f + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({ version: 1, items }, null, 2));
  fs.renameSync(tmp, f);
}

/** Validates a request from a page or the CLI. Returns { req, errors }. */
function normalize(body) {
  const b = body && typeof body === 'object' ? body : {};
  const type = String(b.type || '');
  const errors = [];
  if (!TYPES.includes(type)) return { req: null, errors: ['نوع الطلب لازم يكون: ' + TYPES.join(' / ')] };
  const req = { type };
  const ideaId = cleanId(b.ideaId);
  if (ideaId) req.ideaId = ideaId;
  if (b.title) req.title = oneLine(b.title, 200);
  if (b.source) req.source = oneLine(b.source, 40).replace(/[^\w-]/g, '');
  if (type === 'montage') {
    req.format = FORMATS.includes(b.format) ? b.format : '';
    if (!req.format) errors.push('اختار الصيغة: ريل، يوتيوب طويل، لو الاثنين');
    const f = cleanPath(b.file);
    if (f) req.file = f;
    if (!req.ideaId && !req.file) errors.push('طلب المونتاج يحتاج فكرة أو تسجيل');
    const series = str(b.series, 40).toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (series) req.series = series; // .io/series/<id>.json — start from the series look (engine/series.js resolve)
    if (b.note) req.note = str(b.note, 2000);
  } else if (type === 'rewrite-idea') {
    if (!req.ideaId) errors.push('أي فكرة؟');
    req.note = str(b.note, 2000);
    if (!req.note) errors.push('اكتب شنو تريد يتغيّر بالفكرة');
  } else if (type === 'edit') {
    req.target = TARGETS.includes(b.target) ? b.target : 'general';
    const w = cleanPath(b.work);
    if (w) req.work = w;
    if (b.segment != null && typeof b.segment === 'object') {
      const s = b.segment, seg = {};
      if (Number.isFinite(+s.index)) seg.index = Math.max(0, Math.floor(+s.index));
      if (Number.isFinite(+s.start)) seg.start = Math.round(+s.start * 1000) / 1000;
      if (Number.isFinite(+s.end)) seg.end = Math.round(+s.end * 1000) / 1000;
      if (s.text) seg.text = str(s.text, 2000);
      if (Object.keys(seg).length) req.segment = seg;
    } else if (Number.isFinite(+b.segment) && b.segment !== '' && b.segment !== null) req.segment = { index: Math.max(0, Math.floor(+b.segment)) };
    req.note = str(b.note, 2000);
    if (!req.note) errors.push('اكتب شنو تريد Claude يعدّل');
    if (!req.work && !req.ideaId) errors.push('التعديل يحتاج مجلد شغل أو فكرة');
  } else if (type === 'script') {
    req.text = str(b.text, 20000);
    if (!req.text) errors.push('الصق السكربت أو الفكرة');
    req.format = SCRIPT_FORMATS.includes(b.format) ? b.format : 'reel';
  } else if (type === 'analyze-post') {
    const one = (x) => {
      const o = { platform: STAT_PLATFORMS.includes(x.platform) ? x.platform : req.platform || '', postId: cleanId(x.postId || x.id) };
      if (!o.platform || !o.postId) return null;
      if (x.title) o.title = oneLine(x.title, 200);
      const u = oneLine(x.url, 500); if (/^https?:\/\//i.test(u)) o.url = u;
      const v = oneLine(x.videoUrl, 1000); if (/^https?:\/\//i.test(v)) o.videoUrl = v;
      const f = cleanPath(x.file); if (f) o.file = f;
      o.metrics = cleanMetrics(x.metrics);
      if (x.reason) o.reason = oneLine(x.reason, 300);
      return o;
    };
    if (STAT_PLATFORMS.includes(b.platform)) req.platform = b.platform;
    if (Array.isArray(b.posts)) {
      req.posts = b.posts.slice(0, 30).map((x) => (x && typeof x === 'object' ? one(x) : null)).filter(Boolean);
      if (!req.posts.length) errors.push('ما فيه منشورات للتحليل');
    } else {
      const o = one(b);
      if (!o) errors.push('أي منشور؟ (المنصة ورقم المنشور)'); else Object.assign(req, o);
    }
    if (b.note) req.note = str(b.note, 2000);
  } else if (type === 'sync-stats') {
    req.platform = b.platform === undefined || b.platform === 'instagram' ? 'instagram' : '';
    if (!req.platform) errors.push('السحب التلقائي لإنستقرام بس حالياً');
  } else if (type === 'sync-trends') {
    req.platform = b.platform === undefined || b.platform === 'instagram' ? 'instagram' : '';
    if (!req.platform) errors.push('سحب الترند من الحسابات لإنستقرام بس حالياً');
    if (b.top !== undefined && Number.isFinite(+b.top)) req.top = Math.max(1, Math.min(10, Math.round(+b.top)));
  } else if (type === 'stats-ideas' || type === 'stats-reel') {
    if (STAT_PLATFORMS.includes(b.platform)) req.platform = b.platform;
    if (type === 'stats-ideas') {
      req.top = (Array.isArray(b.top) ? b.top : []).slice(0, 15).filter((x) => x && typeof x === 'object').map((x) => {
        const o = { title: oneLine(x.title, 200), platform: STAT_PLATFORMS.includes(x.platform) ? x.platform : '', metrics: cleanMetrics(x.metrics || x) };
        const u = oneLine(x.url, 500); if (/^https?:\/\//i.test(u)) o.url = u;
        return o;
      });
      if (!req.top.length) errors.push('ما فيه منشورات قوية بعد — استورد إحصائياتك أول');
    } else {
      req.numbers = cleanMetrics(b.numbers, 40);
      if (!Object.keys(req.numbers).length) errors.push('ما فيه أرقام');
    }
    if (b.note) req.note = str(b.note, 2000);
  }
  return { req: errors.length ? null : req, errors };
}

/** {name: number|short string} — numbers only, nothing nested, a few dozen keys at most. */
function cleanMetrics(m, max = 24) {
  const out = {};
  if (!m || typeof m !== 'object') return out;
  for (const [k, v] of Object.entries(m).slice(0, 60)) {
    const key = String(k).replace(/[^\w]/g, '').slice(0, 30);
    if (!key || Object.keys(out).length >= max) continue;
    if (typeof v === 'number' && Number.isFinite(v)) out[key] = Math.round(v * 10000) / 10000;
    else if (typeof v === 'string' && v.trim() && v.length <= 120) out[key] = oneLine(v, 120);
  }
  return out;
}

function newId(now) { return 'q' + now.getTime().toString(36) + Math.random().toString(36).slice(2, 6); }

/** Adds a request. Returns { ok, item, errors }. */
function enqueue(dir, body, now = new Date()) {
  const { req, errors } = normalize(body);
  if (!req) return { ok: false, errors };
  const q = read(dir);
  const t = now.toISOString();
  const item = Object.assign({ id: newId(now) }, req, { status: 'pending', createdAt: t, updatedAt: t, progress: { msg: '', pct: null } });
  q.items.push(item);
  write(dir, q);
  return { ok: true, item, errors: [] };
}

function list(dir, filter = {}) {
  let items = read(dir).items;
  if (filter.ideaId) items = items.filter((x) => x.ideaId === filter.ideaId);
  if (filter.status) items = items.filter((x) => x.status === filter.status);
  return items;
}

const pending = (dir) => list(dir, { status: 'pending' });

function update(dir, id, fn) {
  const q = read(dir);
  const it = q.items.find((x) => x.id === id);
  if (!it) return { ok: false, errors: ['ما لگيت طلب بهالرقم: ' + id] };
  fn(it);
  it.updatedAt = new Date().toISOString();
  write(dir, q);
  return { ok: true, item: it, errors: [] };
}

function take(dir, id) {
  return update(dir, id, (it) => { it.status = 'working'; it.startedAt = new Date().toISOString(); it.progress = { msg: 'Claude استلم الطلب', pct: 0 }; });
}
function progress(dir, id, msg, pct) {
  const p = pct === undefined || pct === null || pct === '' || !Number.isFinite(+pct) ? null : Math.max(0, Math.min(100, Math.round(+pct)));
  return update(dir, id, (it) => { if (it.status === 'pending') it.status = 'working'; it.progress = { msg: oneLine(msg, 300), pct: p }; });
}
function done(dir, id, out, note) {
  return update(dir, id, (it) => {
    it.status = 'done'; it.finishedAt = new Date().toISOString();
    it.progress = { msg: oneLine(note || 'خلص ✓', 300), pct: 100 };
    if (out) it.out = cleanPath(out) || oneLine(out, 400);
  });
}
function fail(dir, id, msg) {
  return update(dir, id, (it) => { it.status = 'error'; it.finishedAt = new Date().toISOString(); it.error = oneLine(msg || 'صار خطأ', 500); it.progress = { msg: it.error, pct: it.progress && it.progress.pct }; });
}

/**
 * Resolves with the oldest pending request once there is one (immediately if
 * there already is). Watches the folder and polls as a fallback (fs.watch is
 * unreliable on some file systems). timeoutMs > 0 → resolves null on timeout.
 */
function wait(dir, { timeoutMs = 0, pollMs = 1000 } = {}) {
  return new Promise((resolve) => {
    let finished = false, watcher = null, timer = null, tout = null;
    const finish = (v) => {
      if (finished) return; finished = true;
      clearInterval(timer); clearTimeout(tout);
      try { if (watcher) watcher.close(); } catch (e) { /* ignore */ }
      resolve(v);
    };
    const check = () => { const p = pending(dir); if (p.length) finish({ item: p[0], pending: p.length }); };
    check();
    if (finished) return;
    const sdir = dataDir(dir);
    try { fs.mkdirSync(sdir, { recursive: true }); watcher = fs.watch(sdir, (ev, name) => { if (!name || /^queue\.json/.test(String(name))) check(); }); watcher.on('error', () => {}); } catch (e) { watcher = null; }
    timer = setInterval(check, pollMs);
    if (timeoutMs > 0) tout = setTimeout(() => finish(null), timeoutMs);
  });
}

/** One Arabic line describing a request (for the CLI and session-start). */
function describe(it) {
  const bits = [TYPE_AR[it.type] || it.type];
  if (it.format) bits.push(FORMAT_AR[it.format] || it.format);
  if (it.title) bits.push('«' + it.title + '»');
  if (it.target) bits.push('الهدف: ' + it.target);
  if (it.series) bits.push('السلسلة: ' + it.series);
  if (it.platform) bits.push(it.platform + (it.postId ? ' #' + it.postId : ''));
  if (Array.isArray(it.posts)) bits.push(it.posts.length + ' منشور');
  if (it.note) bits.push('الملاحظة: ' + it.note.slice(0, 120));
  return bits.join(' · ');
}

module.exports = { normalize, enqueue, list, pending, take, progress, done, fail, wait, read, describe, file, TYPES, STATUSES, FORMATS, TARGETS, BODY_LIMIT, FORMAT_AR, TYPE_AR };

// ───────────────────────── CLI ─────────────────────────
function cliArgs(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const v = argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') ? argv[++i] : true; o[k] = v; } else o._.push(a);
  }
  return o;
}

if (require.main === module) {
  const o = cliArgs(process.argv.slice(2));
  const dir = path.resolve(o.dir && o.dir !== true ? o.dir : process.env.CLAUDE_PROJECT_DIR || process.cwd());
  const [cmd, a1, a2, a3] = o._;
  const out = (r) => { if (!r.ok) { console.error('❌ ' + r.errors.join('، ')); process.exit(1); } console.log(JSON.stringify(r.item, null, 2)); };
  if (cmd === 'wait') {
    const timeoutMs = +(o.timeout || 0) * 1000;
    wait(dir, { timeoutMs }).then((r) => {
      if (!r) { console.log(JSON.stringify({ timeout: true, pending: 0 })); return; }
      console.log(JSON.stringify(Object.assign({}, r.item, { _pending: r.pending, _summary: describe(r.item), _next: `node "${__filename}" take ${r.item.id} --dir "${dir}"` }), null, 2));
    });
  } else if (cmd === 'list') {
    const items = list(dir).filter((x) => o.all || x.status === 'pending' || x.status === 'working');
    if (!items.length) console.log('ما بيه طلبات ' + (o.all ? '' : 'مفتوحة'));
    for (const it of items) console.log(`${it.id}  [${it.status}]  ${describe(it)}${it.progress && it.progress.msg ? '  — ' + it.progress.msg : ''}`);
  } else if (cmd === 'take' && a1) out(take(dir, a1));
  else if (cmd === 'progress' && a1) out(progress(dir, a1, a2 || '', a3));
  else if (cmd === 'done' && a1) out(done(dir, a1, o.out && o.out !== true ? o.out : '', o.note && o.note !== true ? o.note : ''));
  else if (cmd === 'fail' && a1) out(fail(dir, a1, a2 || ''));
  else if (cmd === 'add' && a1) {
    let extra = {};
    try { extra = a2 ? JSON.parse(a2) : {}; } catch (e) { console.error('❌ JSON غلط: ' + e.message); process.exit(1); }
    out(enqueue(dir, Object.assign({}, extra, { type: a1 })));
  } else {
    console.error('الاستخدام: node engine/queue.js wait|list|take <id>|progress <id> "<msg>" [pct]|done <id> [--out f]|fail <id> "<msg>"|add <type> \'<json>\'  [--dir <project>]');
    process.exit(2);
  }
}
