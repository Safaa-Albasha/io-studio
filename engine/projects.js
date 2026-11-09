#!/usr/bin/env node
/*
 * I/O Studio — مكتبة المشاريع (project library).
 *
 * One list of everything the creator is making, built from what is already on disk:
 *   - ideas in .io/plan.json (with their work folder, idea.work or work/<id>)
 *   - work folders under work/ that have theme.json / studio.json / caps.json / src.*
 *   - takes in recordings/ (the course studio uploads there)
 *   - renders in output/ and the `out` of finished montage requests (.io/queue.json)
 * Things that belong together are merged into one project (an idea + its take + its render).
 *
 * Status is derived, never stored: فكرة → مسجّل → قيد المونتاج → جاهز → منشور.
 * Per-project choices that have no other home (series of a take, archived) live in
 * .io/library.json → items["<project id>"]. An idea's series is idea.series in plan.json.
 * Thumbnails: first frame via ffmpeg (or the work's cover.jpg), cached in .io/thumbs/.
 *
 *   node engine/projects.js list [--dir <project>] [--all]       # --all: archived too
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { dataFile } = require('./data-dir.js');
const SR = require('./series.js');

const VIDEO = /\.(mp4|mov|webm|mkv|m4v)$/i;
const STATUS = ['idea', 'recorded', 'editing', 'ready', 'published'];
const STATUS_AR = { idea: 'فكرة', recorded: 'مسجّل', editing: 'قيد المونتاج', ready: 'جاهز', published: 'منشور' };
// final files the video editor writes (SKILL.md: ad-final → ad-master; youtube-long: final/youtube…; podcast/montage: *-final)
const RENDER_RANK = [/^ad-master\.mp4$/i, /^ad-final\.mp4$/i, /master.*\.mp4$/i, /final.*\.mp4$/i, /^(youtube|reel|short)[\w-]*\.mp4$/i];
const POSTER = ['cover.jpg', 'cover.png', 'thumbnail.jpg', 'thumb.jpg', 'poster.jpg'];
const EDIT_MARKS = ['caps.json', 'cut.json', 'studio.json', 'a.json', 'fixes.json'];

function readJson(f, d) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } }
function writeJson(f, obj) {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const tmp = f + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, f);
}
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const rel = (dir, p) => path.relative(dir, p).split(path.sep).join('/');
const stat = (p) => { try { return fs.statSync(p); } catch (e) { return null; } };
const ls = (d) => { try { return fs.readdirSync(d); } catch (e) { return []; } };
/** "2026-11-09-lesson-1-intro-2.webm" → "lesson 1 intro 2" */
const titleFromFile = (f) => path.basename(f).replace(/\.[^.]+$/, '').replace(/^\d{4}-\d{2}-\d{2}-?/, '').replace(/[-_ ]*(final|master)$/i, '').replace(/[-_]+/g, ' ').trim() || path.basename(f);

// ---------- .io/library.json ----------
const libFile = (dir) => dataFile(dir, 'library.json');
function readMeta(dir) {
  const j = readJson(libFile(dir), {}) || {};
  return isObj(j.items) ? j.items : {};
}
function writeMeta(dir, items) { writeJson(libFile(dir), { version: 1, items }); }

// ---------- media probe cache (.io/thumbs/index.json) ----------
const thumbsDir = (dir) => dataFile(dir, 'thumbs');
const cacheFile = (dir) => path.join(thumbsDir(dir), 'index.json');
const keyOf = (abs, st) => crypto.createHash('sha1').update(abs + '|' + (st ? st.size + '|' + Math.round(st.mtimeMs) : '')).digest('hex').slice(0, 16);
function readCache(dir) { const j = readJson(cacheFile(dir), {}); return isObj(j) ? j : {}; }

function run(cmd, argv, timeout) {
  return new Promise((resolve) => {
    try {
      execFile(cmd, argv, { timeout, windowsHide: true, maxBuffer: 1 << 20 }, (err, out) => resolve(err ? null : String(out)));
    } catch (e) { resolve(null); }
  });
}

/** {duration, w, h} of a video via ffprobe (null fields when ffprobe is missing or fails). */
async function probeMedia(abs) {
  const out = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:stream_tags=rotate:format=duration', '-of', 'json', abs], 8000);
  let j = null; try { j = JSON.parse(out); } catch (e) { return { duration: null, w: null, h: null }; }
  const s = (j.streams || [])[0] || {};
  let w = +s.width || null, h = +s.height || null;
  const rot = Math.abs(+((s.tags || {}).rotate) || 0);
  if (rot === 90 || rot === 270) [w, h] = [h, w];
  const d = +((j.format || {}).duration);
  return { duration: Number.isFinite(d) ? Math.round(d * 10) / 10 : null, w, h };
}

/** Probes every media file not cached yet (a few at a time), then saves the cache. */
async function probeAll(dir, files, { limit = 3, budgetMs = 6000 } = {}) {
  const cache = readCache(dir);
  const todo = [];
  for (const abs of files) { const st = stat(abs); if (!st) continue; const k = keyOf(abs, st); if (!cache[k]) todo.push([abs, k]); }
  if (!todo.length) return cache;
  const t0 = Date.now();
  let i = 0;
  const worker = async () => {
    while (i < todo.length && Date.now() - t0 < budgetMs) {
      const [abs, k] = todo[i++];
      const m = await probeMedia(abs);
      cache[k] = Object.assign({ file: abs }, m);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, todo.length) }, worker));
  try { writeJson(cacheFile(dir), cache); } catch (e) { /* read-only */ }
  return cache;
}

// ---------- scanning ----------
function bestRender(work) {
  const files = ls(work).filter((f) => /\.mp4$/i.test(f));
  for (const re of RENDER_RANK) { const f = files.find((x) => re.test(x)); if (f) return path.join(work, f); }
  return null;
}
function sourceOf(work) {
  const f = ls(work).find((x) => /^src\.(mov|mp4|webm|mkv|m4v)$/i.test(x));
  return f ? path.join(work, f) : null;
}
function posterOf(work) {
  const f = POSTER.find((x) => fs.existsSync(path.join(work, x)));
  return f ? path.join(work, f) : null;
}
const isWork = (w) => ['theme.json', 'studio.json', 'caps.json', 'series.json'].some((f) => fs.existsSync(path.join(w, f))) || !!sourceOf(w);

/** Builds the project list. Pure read (plus nothing written). opts.cache: probe cache to use. */
function scan(dir, opts = {}) {
  const cache = opts.cache || readCache(dir);
  const meta = readMeta(dir);
  const plan = readJson(dataFile(dir, 'plan.json'), {}) || {};
  const ideas = Array.isArray(plan.ideas) ? plan.ideas.filter((i) => isObj(i) && i.id && i.title) : [];
  const queue = ((readJson(dataFile(dir, 'queue.json'), {}) || {}).items || []).filter(isObj);
  const seriesList = SR.list(dir);
  const seriesById = Object.fromEntries(seriesList.map((s) => [s.id, s]));
  const used = new Set(); // absolute paths already part of a project
  const projects = [];

  const mediaInfo = (abs) => { const st = stat(abs); return st ? cache[keyOf(abs, st)] || null : null; };
  const finish = (p) => {
    const m = meta[p.id] || {};
    if (!p.series && m.series) p.series = m.series;
    if (p.series && !seriesById[p.series]) p.series = '';
    p.seriesName = p.series ? seriesById[p.series].name : '';
    p.archived = !!m.archived;
    if (m.published && p.status !== 'published') p.status = 'published';
    const primary = p._render || p._source;
    const info = primary ? mediaInfo(primary) : null;
    p.duration = info && info.duration != null ? info.duration : null;
    const sLook = p.series && seriesById[p.series] ? seriesById[p.series].look : {};
    p.aspect = info && info.w && info.h ? (info.w > info.h ? '16:9' : '9:16') : p.aspect || sLook.format || '9:16';
    p.render = p._render ? rel(dir, p._render) : '';
    p.source = p._source ? rel(dir, p._source) : '';
    p.thumb = p._poster || primary ? '/api/projects/thumb?id=' + encodeURIComponent(p.id) : '';
    p.folder = p.work || (primary ? rel(dir, path.dirname(primary)) : '');
    p.statusAr = STATUS_AR[p.status];
    for (const k of ['_render', '_source', '_poster']) delete p[k];
    projects.push(p);
  };
  const fileDate = (abs) => { const st = stat(abs); return st ? st.mtime.toISOString() : ''; };

  for (const i of ideas) {
    const slug = String(i.id).replace(/[^\w-]/g, '');
    const workRel = i.work || 'work/' + slug;
    const work = SR.workPath(dir, workRel);
    const hasWork = fs.existsSync(work) && isWork(work);
    const qs = queue.filter((x) => x.ideaId === i.id);
    let render = hasWork ? bestRender(work) : null;
    let source = hasWork ? sourceOf(work) : null;
    for (const x of qs) {
      if (!render && x.status === 'done' && x.out) { const a = SR.workPath(dir, x.out); if (fs.existsSync(a) && VIDEO.test(a)) render = a; }
      if (!source && x.file) { const a = SR.workPath(dir, x.file); if (fs.existsSync(a)) source = a; }
    }
    for (const x of qs) if (x.file) used.add(path.resolve(SR.workPath(dir, x.file)));
    for (const x of qs) if (x.out) used.add(path.resolve(SR.workPath(dir, x.out)));
    if (hasWork) used.add(path.resolve(work));
    const editing = (hasWork && EDIT_MARKS.some((f) => fs.existsSync(path.join(work, f)))) || qs.some((x) => x.type === 'montage' && (x.status === 'pending' || x.status === 'working'));
    let status = 'idea';
    if (i.status === 'published') status = 'published';
    else if (render) status = 'ready';
    else if (editing) status = 'editing';
    else if (source) status = 'recorded';
    const fmt = qs.find((x) => x.type === 'montage' && x.format);
    finish({
      id: 'idea:' + i.id, kind: 'idea', ideaId: i.id, title: i.title, hook: i.hook || '', format: i.format || '', platforms: i.platforms || [],
      date: i.date || (i.createdAt || '').slice(0, 10) || (render ? fileDate(render).slice(0, 10) : ''), updated: render ? fileDate(render) : source ? fileDate(source) : i.createdAt || '',
      status, series: i.series || '', work: hasWork ? (path.isAbsolute(workRel) ? workRel : workRel.split(path.sep).join('/')) : '',
      aspect: fmt && fmt.format === 'youtube' ? '16:9' : '', _render: render, _source: source, _poster: hasWork ? posterOf(work) : null,
    });
  }

  // loose work folders (work/<name>/) that no idea claims
  const workRoot = path.join(dir, 'work');
  for (const n of ls(workRoot).sort()) {
    const w = path.join(workRoot, n);
    if (used.has(path.resolve(w)) || !stat(w) || !stat(w).isDirectory() || !isWork(w)) continue;
    used.add(path.resolve(w));
    const render = bestRender(w), source = sourceOf(w);
    const mark = readJson(path.join(w, 'series.json'), null);
    const title = (readJson(path.join(w, 'project.json'), {}) || {}).title || (readJson(path.join(w, 'theme.json'), {}) || {}).title || titleFromFile(n);
    const editing = EDIT_MARKS.some((f) => fs.existsSync(path.join(w, f)));
    const st = stat(w);
    finish({
      id: 'work:' + rel(dir, w), kind: 'work', title: String(title).slice(0, 200), date: st.mtime.toISOString().slice(0, 10), updated: (render ? stat(render) : st).mtime.toISOString(),
      status: render ? 'ready' : editing ? 'editing' : source ? 'recorded' : 'idea', series: mark && mark.series ? String(mark.series) : '', work: rel(dir, w),
      _render: render, _source: source, _poster: posterOf(w),
    });
  }

  // finished montage requests for a take with no idea → the render belongs to that take
  const outsByFile = {};
  for (const x of queue) if (!x.ideaId && x.file && x.status === 'done' && x.out) outsByFile[path.resolve(SR.workPath(dir, x.file))] = path.resolve(SR.workPath(dir, x.out));
  const busyFiles = new Set(queue.filter((x) => !x.ideaId && x.file && (x.status === 'pending' || x.status === 'working')).map((x) => path.resolve(SR.workPath(dir, x.file))));

  for (const n of ls(path.join(dir, 'recordings')).sort()) {
    const abs = path.resolve(dir, 'recordings', n);
    if (!VIDEO.test(n) || used.has(abs)) continue;
    used.add(abs);
    const out = outsByFile[abs] && fs.existsSync(outsByFile[abs]) ? outsByFile[abs] : null;
    if (out) used.add(out);
    const q = queue.find((x) => x.file && path.resolve(SR.workPath(dir, x.file)) === abs && x.title);
    const st = stat(abs);
    finish({
      id: 'rec:recordings/' + n, kind: 'recording', title: (q && q.title) || titleFromFile(n), date: (/^\d{4}-\d{2}-\d{2}/.exec(n) || [st.mtime.toISOString().slice(0, 10)])[0], updated: st.mtime.toISOString(),
      status: out ? 'ready' : busyFiles.has(abs) ? 'editing' : 'recorded', series: '', work: '', _render: out, _source: abs, _poster: null,
    });
  }

  for (const n of ls(path.join(dir, 'output')).sort()) {
    const abs = path.resolve(dir, 'output', n);
    if (!VIDEO.test(n) || used.has(abs)) continue;
    used.add(abs);
    const st = stat(abs);
    finish({ id: 'out:output/' + n, kind: 'render', title: titleFromFile(n), date: st.mtime.toISOString().slice(0, 10), updated: st.mtime.toISOString(), status: 'ready', series: '', work: '', _render: abs, _source: null, _poster: null });
  }

  const shown = opts.all ? projects : projects.filter((p) => !p.archived);
  shown.sort((a, b) => String(b.updated || b.date).localeCompare(String(a.updated || a.date)));
  const counts = { all: 0, archived: projects.filter((p) => p.archived).length };
  for (const s of STATUS) counts[s] = 0;
  for (const p of projects) if (!p.archived) { counts.all++; counts[p.status]++; }
  const bySeries = {};
  for (const p of projects) if (!p.archived && p.series) bySeries[p.series] = (bySeries[p.series] || 0) + 1;
  return {
    project: dir, projects: shown, counts, statuses: STATUS.map((s) => ({ id: s, name: STATUS_AR[s] })),
    series: seriesList.map((s) => Object.assign({}, s, { count: bySeries[s.id] || 0 })),
  };
}

/** Every media file a scan would probe (for probeAll). */
function mediaFiles(dir, res) {
  const out = [];
  for (const p of res.projects) for (const r of [p.render, p.source]) if (r) { out.push(SR.workPath(dir, r)); break; }
  return out;
}

/** scan + ffprobe for durations/aspect of media not seen before (cached). */
async function list(dir, opts = {}) {
  const first = scan(dir, opts);
  if (opts.probe === false) return first;
  const cache = await probeAll(dir, mediaFiles(dir, first), opts);
  return scan(dir, Object.assign({}, opts, { cache }));
}

let memo = null; // thumbnails ask one by one: reuse a scan for a moment instead of rescanning per card
function find(dir, id, fresh = true) {
  if (fresh || !memo || memo.dir !== dir || Date.now() - memo.at > 2000) memo = { dir, at: Date.now(), res: scan(dir, { all: true }) };
  return memo.res.projects.find((p) => p.id === id) || null;
}

/**
 * Thumbnail for a project: the work's cover, or the first frame (0.4 s in) of its render/source
 * via ffmpeg, cached in .io/thumbs/<hash>.jpg. Resolves an absolute file path or null.
 */
async function thumb(dir, id) {
  const p = find(dir, id, false);
  if (!p) return null;
  if (p.work) { const pos = posterOf(SR.workPath(dir, p.work)); if (pos) return pos; }
  const media = p.render || p.source;
  if (!media) return null;
  const abs = SR.workPath(dir, media);
  const st = stat(abs);
  if (!st) return null;
  const out = path.join(thumbsDir(dir), keyOf(abs, st) + '.jpg');
  if (fs.existsSync(out)) return out;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const tmp = out + '.' + process.pid + '.tmp.jpg';
  for (const ss of ['0.4', '0']) {
    await run('ffmpeg', ['-v', 'error', '-y', '-ss', ss, '-i', abs, '-frames:v', '1', '-vf', 'scale=360:-2', '-q:v', '4', tmp], 15000);
    if (stat(tmp) && stat(tmp).size > 0) { fs.renameSync(tmp, out); return out; }
  }
  fs.rmSync(tmp, { force: true });
  return null;
}

/**
 * Changes a project's series / archived flag. Ideas keep their series in plan.json (idea.series);
 * everything else in .io/library.json. series: '<id>' to move in, '' to take it out.
 */
function setMeta(dir, body) {
  const b = isObj(body) ? body : {};
  const id = String(b.id || '').slice(0, 400);
  if (!/^(idea|work|rec|out):/.test(id) || id.includes('..')) return { ok: false, errors: ['أي مشروع؟'] };
  const p = find(dir, id);
  if (!p) return { ok: false, errors: ['المشروع مو موجود'] };
  const errors = [];
  let series;
  if (b.series !== undefined) {
    series = String(b.series || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (series && !SR.get(dir, series)) errors.push('السلسلة مو موجودة');
  }
  if (errors.length) return { ok: false, errors };
  const items = readMeta(dir);
  const m = Object.assign({}, items[id]);
  if (series !== undefined) {
    if (p.kind === 'idea') {
      const A = require('./app-api.js');
      const plan = A.readPlan(dir);
      const i = plan.ideas.find((x) => x.id === p.ideaId);
      if (series) i.series = series; else delete i.series;
      const r = A.writePlan(dir, plan);
      if (!r.ok) return { ok: false, errors: r.errors };
      delete m.series;
    } else if (series) m.series = series; else delete m.series;
    if (p.work && series) { // keep the work's marker in step, so resolve --work agrees
      const markF = path.join(SR.workPath(dir, p.work), 'series.json');
      const mark = readJson(markF, null);
      if (mark && mark.series !== series) { mark.series = series; delete mark.applied; writeJson(markF, mark); }
    }
  }
  if (b.archived !== undefined) { if (b.archived) m.archived = true; else delete m.archived; }
  if (b.published !== undefined && p.kind !== 'idea') { if (b.published) m.published = true; else delete m.published; }
  if (Object.keys(m).length) items[id] = m; else delete items[id];
  writeMeta(dir, items);
  return { ok: true, project: find(dir, id), errors: [] };
}

/** «اعتمد شكله للسلسلة» from a project card: its work folder → a new series (or an existing one's look). */
function adoptLook(dir, body) {
  const b = isObj(body) ? body : {};
  const p = find(dir, String(b.id || ''));
  if (!p) return { ok: false, errors: ['المشروع مو موجود'] };
  if (!p.work) return { ok: false, errors: ['هالمشروع ما له مجلد مونتاج (theme.json) — منتجه أول وبعدين اعتمد شكله'] };
  const r = SR.fromWork(dir, p.work, { name: b.name || p.title, series: b.series, kind: p.kind === 'idea' ? 'idea' : 'work', ref: p.kind === 'idea' ? p.ideaId : p.work });
  if (r.ok && b.join !== false) setMeta(dir, { id: p.id, series: r.series.id });
  return r;
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const di = argv.indexOf('--dir');
  const dir = path.resolve(di >= 0 ? argv[di + 1] : process.env.CLAUDE_PROJECT_DIR || process.cwd());
  if (argv[0] !== 'list') { console.error('الاستخدام: node engine/projects.js list [--dir <project>] [--all] [--json]'); process.exit(2); }
  list(dir, { all: argv.includes('--all') }).then((r) => {
    if (argv.includes('--json')) return console.log(JSON.stringify(r, null, 2));
    for (const p of r.projects) console.log(`${STATUS_AR[p.status].padEnd(12)} ${p.seriesName ? '[' + p.seriesName + '] ' : ''}${p.title}${p.work ? '  — ' + p.work : p.source ? '  — ' + p.source : ''}`);
    console.log(`${r.counts.all} مشروع · ${r.series.length} سلسلة`);
  });
}

module.exports = { STATUS, STATUS_AR, scan, list, find, thumb, setMeta, adoptLook, probeMedia, probeAll, readMeta, titleFromFile };
