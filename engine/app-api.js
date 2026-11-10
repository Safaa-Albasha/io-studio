'use strict';
/**
 * I/O Studio — the API behind web/app.html (idea → schedule → build).
 * Pure functions over the plugin folder and the creator's project folder;
 * engine/serve.js routes /api/catalogs, /api/skills, /api/plan, /api/sources,
 * /api/account-type and /api/best-times here.
 */
const fs = require('fs');
const path = require('path');
const { dataFile, DATA_DIR } = require('./data-dir.js');

const PLUGIN = path.resolve(__dirname, '..');
const PLATFORMS = ['instagram', 'youtube', 'tiktok'];
const STATUSES = ['idea', 'picked', 'scheduled', 'published'];
const PLAN_LIMIT = 1024 * 1024; // bytes of JSON accepted for plan.json
const MAX_IDEAS = 1000;

function readJson(f, d) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } }
function str(v, max) { return String(v == null ? '' : v).trim().slice(0, max); }
const arr = (v) => (Array.isArray(v) ? v : []);

/** name + description from a SKILL.md frontmatter (handles `>` folded blocks). */
function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text || '');
  const out = {};
  if (!m) return out;
  const lines = m[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const kv = /^([\w-]+):\s*(.*)$/.exec(lines[i]);
    if (!kv) continue;
    let v = kv[2].trim();
    if (/^[>|][-+]?$/.test(v)) {
      const parts = [];
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) parts.push(lines[++i].trim());
      v = parts.join(' ');
    }
    out[kv[1]] = v.replace(/^["']|["']$/g, '');
  }
  return out;
}

function skills(root = PLUGIN) {
  const dir = path.join(root, 'skills');
  let names = [];
  try { names = fs.readdirSync(dir).sort(); } catch (e) { return []; }
  const out = [];
  for (const n of names) {
    let txt; try { txt = fs.readFileSync(path.join(dir, n, 'SKILL.md'), 'utf8'); } catch (e) { continue; }
    const fm = parseFrontmatter(txt);
    out.push({ name: fm.name || n, description: str(fm.description, 600), invocable: fm['user-invocable'] !== 'false' });
  }
  return out;
}

/** Every HTML page under web/ (top level + known sub-apps), with its <title>. */
function pages(root = PLUGIN) {
  const web = path.join(root, 'web');
  const files = [];
  try { for (const f of fs.readdirSync(web)) if (f.endsWith('.html')) files.push(f); } catch (e) { /* none */ }
  for (const f of ['course-studio/studio.html', 'live-stage/live-stage.html']) if (fs.existsSync(path.join(web, f))) files.push(f);
  return files.map((f) => {
    let t = ''; try { t = (/<title>([^<]*)<\/title>/i.exec(fs.readFileSync(path.join(web, f), 'utf8')) || [])[1] || ''; } catch (e) { /* skip */ }
    return { path: f, title: t.trim() || f };
  });
}

/** All installed libraries in one object; media paths are URLs the server serves. */
function catalogs(root = PLUGIN) {
  const lib = (p) => readJson(path.join(root, 'library', p), null);
  const mdir = path.join(root, 'skills', 'io-video-editor', 'motion');
  const moves = [];
  let families = {};
  let mfiles = [];
  try { mfiles = fs.readdirSync(path.join(mdir, 'moves')).filter((f) => /^catalog.*\.json$/.test(f)).sort(); } catch (e) { /* none */ }
  for (const f of mfiles) {
    const c = readJson(path.join(mdir, 'moves', f), {});
    Object.assign(families, c.families || {});
    for (const m of arr(c.moves)) {
      if (!m || !m.id || moves.some((x) => x.id === m.id)) continue; // first catalog wins on a clashing id
      const prev = m.preview && fs.existsSync(path.join(mdir, 'moves', m.preview)) ? '/skills/io-video-editor/motion/moves/' + m.preview : null;
      moves.push({ id: m.id, n: m.n, name: m.name, sub: m.sub || '', desc: m.desc || '', cat: m.cat || '', families: arr(m.families), cues: arr(m.cues), energy: m.energy || 0, preview: prev });
    }
  }
  const st = readJson(path.join(mdir, 'styles', 'catalog.json'), {});
  const sfx = lib('sfx/catalog.json') || {};
  const looks = lib('looks/catalog.json') || {};
  const lessons = lib('lessons/catalog.json') || {};
  const stk = lib('stickers/catalog.json') || {};
  const fur = lib('interiors/furniture/catalog.json') || {};
  const named = (sub) => {
    let fl = []; try { fl = fs.readdirSync(path.join(root, 'library', 'interiors', sub)).filter((f) => f.endsWith('.json')); } catch (e) { /* none */ }
    return fl.map((f) => { const j = readJson(path.join(root, 'library', 'interiors', sub, f), {}); return { id: j.id || f.replace(/\.json$/, ''), name: j.name_ar || j.name || j.ar || f.replace(/\.json$/, '') }; });
  };
  return {
    moves, moveFamilies: families,
    styles: arr(st.styles).map((s) => ({ id: s.id, name: s.name, desc: s.desc || '', families: arr(s.families), cues: arr(s.cues) })),
    sfx: { categories: sfx.categories || {}, sounds: arr(sfx.sounds).map((s) => ({ id: s.id, name: s.ar || s.name_ar || s.id, category: s.category, duration: s.duration, tags: arr(s.tags), use: s.use || '', src: s.file ? '/library/sfx/' + s.file : null })) },
    looks: { groups: looks.groups || {}, looks: arr(looks.looks).map((l) => ({ id: l.id, name: l.ar || l.en || l.id, group: l.group, mood: l.mood || '', use: l.use || '', tags: arr(l.tags), preview: fs.existsSync(path.join(root, 'library', 'looks', 'previews', l.id + '.jpg')) ? '/library/looks/previews/' + l.id + '.jpg' : null })) },
    lessons: arr(lessons.lessons).map((l) => ({ id: l.id, title: l.title, subject: l.subjectLabel || l.subject || '', level: l.level || '', style: l.style || '', format: l.format || '', duration: l.duration || 0 })),
    stickers: arr(stk.stickers).map((s) => ({ id: s.id, name: s.ar || s.id, kind: s.kind, src: s.kind === 'svg' && s.file ? '/library/stickers/' + s.file : null })),
    furniture: arr(fur.items).map((i) => ({ id: i.id, name: i.name_ar || i.name_en || i.id, category: i.category || '', tags: arr(i.tags) })),
    interiorStyles: named('styles'),
    rooms: named('rooms'),
    skills: skills(root),
    pages: pages(root),
  };
}

function sources(dir) {
  const s = readJson(dataFile(dir, 'sources.json'), {}) || {};
  const accounts = arr(s.accounts).map((a) => {
    if (typeof a === 'string') {
      const m = /^(instagram|youtube|tiktok|x|threads|snapchat)\s*[:/]\s*(.+)$/i.exec(a.trim());
      return m ? { platform: m[1].toLowerCase(), handle: m[2].trim() } : { platform: '', handle: a.trim() };
    }
    return a && typeof a === 'object' ? { platform: str(a.platform, 30), handle: str(a.handle || a.url || a.name, 200) } : null;
  }).filter((a) => a && a.handle);
  return { sites: arr(s.sites).map((x) => str(typeof x === 'object' && x ? x.url || x.name : x, 300)).filter(Boolean), accounts, keywords: arr(s.keywords).map((x) => str(x, 120)).filter(Boolean) };
}

function accountType(dir, root = PLUGIN) {
  const proj = readJson(dataFile(dir, 'project.json'), {}) || {};
  const lib = readJson(path.join(root, 'library', 'account-types', 'types.json'), null);
  const types = lib ? arr(lib.types) : [];
  const formats = lib ? arr(lib.formats) : [];
  const at = typeof proj.accountType === 'string' ? proj.accountType : '';
  const cf = typeof proj.contentFormat === 'string' ? proj.contentFormat : '';
  return {
    available: !!lib, accountType: at, contentFormat: cf,
    type: types.find((t) => t && t.id === at) || null,
    format: formats.find((f) => f && f.id === cf) || null,
    types: types.map((t) => ({ id: t.id, name: t.name, icon: t.icon || '', description: t.description || '' })),
    formats: formats.map((f) => ({ id: f.id, name: f.name || f.id, icon: f.icon || '' })),
  };
}

/** Best weekday/hour per platform from stats.json (.io/ first), via web/lib/stats-core.js. */
function bestTimes(dir, root = PLUGIN) {
  const st = readJson(dataFile(dir, 'stats.json'), null) || readJson(path.join(dir, 'stats.json'), null);
  if (!st || !st.accounts) return { available: false, per: {} };
  try {
    const S = require(path.join(root, 'web', 'lib', 'stats-core.js'));
    const cmp = S.compare(st);
    const per = {};
    for (const p of PLATFORMS) {
      const k = cmp.per[p];
      if (k && k.posts && k.bestWeekday) per[p] = { weekday: k.bestWeekday.index, weekdayAr: k.bestWeekday.nameAr, hour: k.bestHour, posts: k.posts };
    }
    return { available: Object.keys(per).length > 0, per };
  } catch (e) { return { available: false, per: {} }; }
}

const planFile = (dir) => dataFile(dir, 'plan.json');

/** Validates + normalizes a plan payload. Returns { plan, errors }. */
function normalizePlan(p) {
  const errors = [];
  if (!p || typeof p !== 'object' || !Array.isArray(p.ideas)) return { plan: null, errors: ['الخطة لازم تكون {ideas:[...]}'] };
  if (p.ideas.length > MAX_IDEAS) return { plan: null, errors: [`أكثر من ${MAX_IDEAS} فكرة`] };
  const seen = new Set();
  const ideas = [];
  p.ideas.forEach((x, i) => {
    if (!x || typeof x !== 'object') { errors.push(`فكرة ${i + 1}: مو كائن`); return; }
    const id = str(x.id, 60).replace(/[^\w-]/g, '') || 'i' + Date.now().toString(36) + i;
    const title = str(x.title, 200);
    if (!title) { errors.push(`فكرة ${i + 1}: بلا عنوان`); return; }
    if (seen.has(id)) { errors.push(`فكرة ${i + 1}: رقم مكرر`); return; }
    seen.add(id);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(x.date || '') ? x.date : '';
    const steps = {};
    if (x.steps && typeof x.steps === 'object') for (const [k, v] of Object.entries(x.steps).slice(0, 30)) {
      const key = str(k, 40).replace(/[^\w-]/g, '');
      if (key) steps[key] = typeof v === 'boolean' ? v : str(v, 500);
    }
    const idea = {
      id, title, hook: str(x.hook, 500),
      platforms: arr(x.platforms).filter((pl) => PLATFORMS.includes(pl)).filter((v, j, a) => a.indexOf(v) === j),
      format: str(x.format, 40),
      status: STATUSES.includes(x.status) ? x.status : 'idea',
      date, time: /^\d{2}:\d{2}$/.test(x.time || '') ? x.time : '',
      notes: str(x.notes, 4000), steps,
    };
    if (x.source === 'trend' || x.source === 'manual') idea.source = x.source;
    if (x.trendRef && typeof x.trendRef === 'object') {
      const url = str(x.trendRef.url, 500);
      const ref = { title: str(x.trendRef.title, 300), url: /^https?:\/\//i.test(url) ? url : '', account: str(x.trendRef.account, 120) };
      if (ref.title || ref.url || ref.account) idea.trendRef = ref;
    }
    if (x.why) idea.why = str(x.why, 300);
    if (x.work) idea.work = str(x.work, 300).replace(/["'`$\r\n]/g, ''); // the video editor's work folder
    if (x.series) { const sr = str(x.series, 40).toLowerCase().replace(/[^a-z0-9-]/g, ''); if (sr) idea.series = sr; } // .io/series/<id>.json (engine/series.js)
    if (x.createdAt && !isNaN(Date.parse(x.createdAt))) idea.createdAt = new Date(x.createdAt).toISOString();
    ideas.push(idea);
  });
  return { plan: errors.length ? null : { version: 1, ideas }, errors };
}

function readPlan(dir) {
  const p = readJson(planFile(dir), null);
  const n = p ? normalizePlan(p) : null;
  if (n && n.plan) return n.plan;
  // Keep what's valid from a hand-edited file rather than hiding it all.
  if (p && Array.isArray(p.ideas)) return { version: 1, ideas: p.ideas.map((x) => normalizePlan({ ideas: [x] }).plan).filter(Boolean).map((x) => x.ideas[0]) };
  return { version: 1, ideas: [] };
}

function writePlan(dir, payload) {
  const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
  if (Buffer.byteLength(raw || '') > PLAN_LIMIT) return { ok: false, errors: ['الخطة كبيرة'] };
  let obj; try { obj = typeof payload === 'string' ? JSON.parse(payload) : payload; } catch (e) { return { ok: false, errors: ['بيانات غير صالحة'] }; }
  const { plan, errors } = normalizePlan(obj);
  if (!plan) return { ok: false, errors };
  const f = planFile(dir);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const tmp = f + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(plan, null, 2));
  fs.renameSync(tmp, f);
  return { ok: true, plan, file: path.join(DATA_DIR, 'plan.json') };
}

/** Is the video editor (skills/io-video-editor/studio/studio.py) answering on this port? */
function editorStatus(port, timeout = 800) {
  port = +port || 8792;
  if (port < 1024 || port > 65535) return Promise.resolve({ running: false, port });
  return new Promise((resolve) => {
    const req = require('http').get({ host: '127.0.0.1', port, path: '/api/tl/state', timeout }, (r) => { r.resume(); resolve({ running: true, port, timeline: r.statusCode === 200 }); });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', () => resolve({ running: false, port }));
  });
}

/** .io/trends-last.json — the daily-trends check in hooks/session-start.js reads its date. */
function writeTrendsLast(dir, added, now = new Date()) {
  const f = dataFile(dir, 'trends-last.json');
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify({ date, at: now.toISOString(), added: +added || 0 }, null, 2));
  return { date };
}

const titleKey = (t) => String(t || '').replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * Appends new ideas to <dir>/.io/plan.json (newest first). Skips titles that
 * already exist (in the plan or earlier in the batch), assigns ids, stamps
 * createdAt and status «idea». Returns { ok, added:[{id,title}], skipped:[titles], errors }.
 */
function addIdeas(dir, ideas, now = new Date()) {
  if (!Array.isArray(ideas)) return { ok: false, added: [], skipped: [], errors: ['لازم قائمة أفكار'] };
  const plan = readPlan(dir);
  const seen = new Set(plan.ideas.map((i) => titleKey(i.title)));
  const ids = new Set(plan.ideas.map((i) => i.id));
  const fresh = [], skipped = [];
  ideas.forEach((x, k) => {
    if (!x || typeof x !== 'object' || !str(x.title, 200)) return;
    const key = titleKey(str(x.title, 200));
    if (seen.has(key)) { skipped.push(str(x.title, 200)); return; }
    seen.add(key);
    let id = 'i' + now.getTime().toString(36) + k.toString(36) + Math.random().toString(36).slice(2, 5);
    while (ids.has(id)) id += 'x';
    ids.add(id);
    fresh.push(Object.assign({}, x, { id, status: STATUSES.includes(x.status) ? x.status : 'idea', createdAt: x.createdAt || now.toISOString(), platforms: Array.isArray(x.platforms) && x.platforms.length ? x.platforms : PLATFORMS.slice(), steps: {} }));
  });
  if (!fresh.length) return { ok: true, added: [], skipped, errors: [] };
  const r = writePlan(dir, { ideas: [...fresh, ...plan.ideas] });
  if (!r.ok) return { ok: false, added: [], skipped, errors: r.errors };
  return { ok: true, added: r.plan.ideas.slice(0, fresh.length).map((i) => ({ id: i.id, title: i.title })), skipped, errors: [], file: r.file };
}

const REC_LIMIT = 4 * 1024 * 1024 * 1024; // 4 GB per take
const REC_EXT = ['.webm', '.mp4', '.mov', '.mkv'];

/** "Lesson 1: intro" → "lesson-1-intro"; keeps Arabic letters; never empty. */
function slugify(v) {
  const s = String(v || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  return s || 'take';
}

/** <project>/recordings/<YYYY-MM-DD>-<slug><ext>, with -2, -3… when taken. */
function recordingTarget(dir, name, ext, now = new Date()) {
  const e = REC_EXT.includes(String(ext || '').toLowerCase()) ? String(ext).toLowerCase() : '.webm';
  const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const folder = path.join(dir, 'recordings');
  const base = `${d}-${slugify(name)}`;
  let f = path.join(folder, base + e);
  for (let k = 2; fs.existsSync(f); k++) f = path.join(folder, `${base}-${k}${e}`);
  return f;
}

/**
 * Streams a take from the course studio into the project (POST /api/recordings?name=&ext=).
 * Writes to a .part file first and renames when complete, so a cut upload never
 * looks like a finished recording. Resolves { code, body }.
 */
function saveRecording(req, dir, url, limit = REC_LIMIT) {
  return new Promise((resolve) => {
    const len = Number(req.headers['content-length']);
    if (Number.isFinite(len) && len > limit) { req.resume(); return resolve({ code: 413, body: { ok: false, errors: ['التسجيل أكبر من الحد'] } }); }
    const target = recordingTarget(dir, url.searchParams.get('name'), url.searchParams.get('ext'));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const part = target + '.part';
    const out = fs.createWriteStream(part);
    let size = 0, over = false, settled = false;
    const end = (r) => { if (!settled) { settled = true; resolve(r); } };
    const abort = (code, msg) => { out.destroy(); fs.rm(part, { force: true }, () => end({ code, body: { ok: false, errors: [msg] } })); };
    req.on('data', (c) => {
      size += c.length;
      if (size > limit && !over) { over = true; req.unpipe(out); req.resume(); abort(413, 'التسجيل أكبر من الحد'); }
    });
    req.on('aborted', () => { if (!over) abort(400, 'انقطع الرفع'); });
    req.on('error', () => { if (!over) abort(400, 'انقطع الرفع'); });
    out.on('error', (e) => abort(500, e.message));
    out.on('finish', () => {
      if (over || settled) return;
      if (!size) return abort(400, 'التسجيل فاضي');
      fs.rename(part, target, (e) => {
        if (e) return abort(500, e.message);
        const file = path.relative(dir, target).split(path.sep).join('/');
        const series = String(url.searchParams.get('series') || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
        if (series) { try { require('./projects.js').setMeta(dir, { id: 'rec:' + file, series }); } catch (e) { /* the take is saved; the series link is optional */ } }
        end({ code: 200, body: { ok: true, file, path: target, size, series: series || undefined } });
      });
    });
    req.pipe(out);
  });
}

/**
 * Routes the app's endpoints. Returns true when it answered the request.
 * h = { sendJson, readBody } from serve.js (origin is checked there).
 */
function route(req, res, url, dir, h) {
  const p = url.pathname;
  const get = req.method === 'GET';
  try {
    if (p === '/api/catalogs' && get) return h.sendJson(res, 200, catalogs()), true;
    if (p === '/api/skills' && get) return h.sendJson(res, 200, skills()), true;
    if (p === '/api/sources' && get) return h.sendJson(res, 200, sources(dir)), true;
    if (p === '/api/account-type' && get) return h.sendJson(res, 200, accountType(dir)), true;
    if (p === '/api/best-times' && get) return h.sendJson(res, 200, bestTimes(dir)), true;
    if (p === '/api/plan' && get) return h.sendJson(res, 200, readPlan(dir)), true;
    if (p === '/api/paths' && get) return h.sendJson(res, 200, { project: dir, plugin: PLUGIN, sep: path.sep }), true;
  } catch (e) { return h.sendJson(res, 500, { error: e.message }), true; }
  if (p === '/api/editor-status' && get) {
    editorStatus(url.searchParams.get('port')).then((r) => h.sendJson(res, 200, r));
    return true;
  }
  if (p === '/api/queue' && get) {
    const Q = require('./queue.js');
    const ideaId = url.searchParams.get('ideaId') || '';
    h.sendJson(res, 200, { project: dir, items: Q.list(dir, ideaId ? { ideaId } : {}).slice(-100) });
    return true;
  }
  if (p === '/api/queue' && req.method === 'POST') {
    const Q = require('./queue.js');
    h.readBody(req, Q.BODY_LIMIT).then((body) => {
      let j; try { j = JSON.parse(body); } catch (e) { return h.sendJson(res, 400, { ok: false, errors: ['بيانات غير صالحة'] }); }
      try {
        const r = Q.enqueue(dir, j);
        if (r.ok) (h.log || console.log)(`📨 طلب جديد من الصفحة: ${Q.describe(r.item)} (${r.item.id})`);
        h.sendJson(res, r.ok ? 200 : 400, r);
      } catch (e) { h.sendJson(res, 500, { ok: false, errors: [e.message] }); }
    }).catch((e) => h.sendJson(res, 413, { ok: false, errors: [e.message] }));
    return true;
  }
  if (p === '/api/project' && req.method === 'POST') {
    h.readBody(req, 16 * 1024).then((body) => {
      let j; try { j = JSON.parse(body); } catch (e) { return h.sendJson(res, 400, { ok: false, errors: ['بيانات غير صالحة'] }); }
      try { const r = require('./onboard.js').setProject(dir, j); h.sendJson(res, r.ok ? 200 : 400, r); } catch (e) { h.sendJson(res, 500, { ok: false, errors: [e.message] }); }
    }).catch((e) => h.sendJson(res, 413, { ok: false, errors: [e.message] }));
    return true;
  }
  if (p === '/api/recordings' && req.method === 'POST') {
    saveRecording(req, dir, url, h.recLimit || REC_LIMIT).then((r) => {
      if (r.body.ok) (h.log || console.log)(`🎥 وصل تسجيل: ${r.body.file} (${(r.body.size / 1048576).toFixed(1)} MB)`);
      h.sendJson(res, r.code, r.body);
    });
    return true;
  }
  if (p.startsWith('/api/projects') || p.startsWith('/api/series')) return libraryRoute(req, res, url, dir, h);
  if (p.startsWith('/api/podcast')) return require('./podcast-link.js').route(req, res, url, dir, h);
  if (p === '/api/plan' && req.method === 'POST') {
    h.readBody(req, PLAN_LIMIT).then((body) => {
      try { const r = writePlan(dir, body); h.sendJson(res, r.ok ? 200 : 400, r); } catch (e) { h.sendJson(res, 500, { ok: false, errors: [e.message] }); }
    }).catch((e) => h.sendJson(res, 413, { ok: false, errors: [e.message] }));
    return true;
  }
  return false;
}

const LIB_BODY = 64 * 1024;
/**
 * مكتبة المشاريع + شكل السلسلة (engine/projects.js, engine/series.js):
 *   GET  /api/projects[?all=1]          the project grid (ideas, works, recordings, renders) + series
 *   GET  /api/projects/thumb?id=…       first-frame jpg (cached in .io/thumbs)
 *   POST /api/projects/meta  {id, series?, archived?, published?}
 *   POST /api/projects/adopt {id, name?, series?}   «اعتمد شكله للسلسلة»
 *   GET  /api/series                    {series, suggestions, options}
 *   POST /api/series  {action: create|update|delete, id?, name?, look?, emoji?, description?}
 * Writes only from local pages (serve.js checks the origin for every non-GET).
 */
function libraryRoute(req, res, url, dir, h) {
  const P = require('./projects.js'), SR = require('./series.js');
  const p = url.pathname, get = req.method === 'GET', post = req.method === 'POST';
  const fail = (e) => h.sendJson(res, 500, { ok: false, errors: [e.message] });
  const withBody = (fn) => h.readBody(req, LIB_BODY).then((body) => {
    let j; try { j = JSON.parse(body); } catch (e) { return h.sendJson(res, 400, { ok: false, errors: ['بيانات غير صالحة'] }); }
    try { const r = fn(j); h.sendJson(res, r.ok ? 200 : 400, r); } catch (e) { fail(e); }
  }).catch((e) => h.sendJson(res, 413, { ok: false, errors: [e.message] }));
  if (p === '/api/projects' && get) { P.list(dir, { all: url.searchParams.get('all') === '1' }).then((r) => h.sendJson(res, 200, r), fail); return true; }
  if (p === '/api/projects/thumb' && get) {
    P.thumb(dir, String(url.searchParams.get('id') || '')).then((f) => {
      if (!f) { res.writeHead(404, { 'cache-control': 'no-store' }); return res.end(); }
      fs.readFile(f, (err, data) => {
        if (err) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { 'content-type': /\.png$/i.test(f) ? 'image/png' : 'image/jpeg', 'cache-control': 'max-age=300' });
        res.end(data);
      });
    }, () => { res.writeHead(500); res.end(); });
    return true;
  }
  if (p === '/api/projects/meta' && post) return withBody((j) => P.setMeta(dir, j)), true;
  if (p === '/api/projects/adopt' && post) return withBody((j) => P.adoptLook(dir, j)), true;
  if (p === '/api/series' && get) {
    try {
      const c = catalogs();
      return h.sendJson(res, 200, { series: SR.list(dir), suggestions: SR.suggestions(dir), options: {
        capStyles: SR.CAP_STYLES, formats: SR.FORMATS, density: SR.DENSITY, cadence: SR.CADENCE,
        motionStyles: c.styles.map((s) => ({ id: s.id, name: s.name })), luts: c.looks.looks.map((l) => ({ id: l.id, name: l.name })),
        moves: c.moves.map((m) => ({ id: m.id, name: m.name, n: m.n })), sfx: c.sfx.sounds.map((s) => ({ id: s.id, name: s.name })),
      } }), true;
    } catch (e) { return fail(e), true; }
  }
  if (p === '/api/series' && post) {
    return withBody((j) => {
      if (j.action === 'create') return SR.create(dir, j);
      if (j.action === 'update') return SR.update(dir, j.id, j);
      if (j.action === 'delete') return SR.remove(dir, j.id);
      return { ok: false, errors: ['action: create / update / delete'] };
    }), true;
  }
  h.sendJson(res, 404, { ok: false, errors: ['not found'] });
  return true;
}

module.exports = { libraryRoute, writeTrendsLast, slugify, recordingTarget, saveRecording, REC_LIMIT, parseFrontmatter, skills, pages, catalogs, sources, accountType, bestTimes, normalizePlan, readPlan, writePlan, addIdeas, editorStatus, route, PLATFORMS, STATUSES };

if (require.main === module) {
  const argv = process.argv.slice(2);
  // import-trends <rows.json> [--top N] [--min X] [--dir] → engine/trends.js (rows from the Composio workbench pull)
  if (argv[0] === 'import-trends') { require('./trends.js').cli(['import', ...argv.slice(1)]); return; }
  const di = argv.indexOf('--dir');
  const dir = path.resolve(di >= 0 ? argv[di + 1] : process.env.CLAUDE_PROJECT_DIR || process.cwd());
  if (argv[0] !== 'add-ideas' || !argv[1] || argv[1] === '--dir') {
    console.error('الاستخدام: node engine/app-api.js add-ideas <ideas.json> [--dir <project>]  |  import-trends <rows.json> [--top 5] [--min 1.5] [--dir <project>]');
    process.exit(2);
  }
  let data;
  try { data = JSON.parse(fs.readFileSync(argv[1], 'utf8')); } catch (e) { console.error('ما گدرت أقرا الملف: ' + e.message); process.exit(1); }
  const list = (Array.isArray(data) ? data : data && data.ideas || []).map((x) => (x && typeof x === 'object' && !x.source ? Object.assign({}, x, { source: 'trend' }) : x));
  const r = addIdeas(dir, list);
  if (!r.ok) { console.error('ما انضافت: ' + r.errors.join('، ')); process.exit(1); }
  if (!argv.includes('--no-trends-mark')) writeTrendsLast(dir, r.added.length);
  console.log(`✓ انضافت ${r.added.length} فكرة لـ ${dataFile(dir, 'plan.json')}${r.skipped.length ? ` (تخطّيت ${r.skipped.length} مكررة)` : ''} — تطلع ببرنامج آي أو استوديو (app.html) تحت «اقتراحات اليوم».`);
}
