#!/usr/bin/env node
/*
 * I/O Studio — شكل السلسلة (series look).
 *
 * A series is a folder of videos that should look like one show: same colours and font,
 * same caption style, motion style, intro/outro, lower third, sound bed, colour look (LUT),
 * format, b-roll density, cadence and call to action. It lives in <project>/.io/series/<id>.json:
 *
 *   { id, name, look:{…}, createdFrom:{kind,ref}, createdAt, updatedAt }
 *
 * Ideas belong to a series through idea.series (.io/plan.json); recordings, renders and loose
 * work folders through .io/library.json (items["rec:…"].series …, see engine/projects.js).
 * When Claude montages anything in a series it starts from this look (skills/io-video-editor):
 *
 *   node engine/series.js list                                   [--dir <project>] [--json]
 *   node engine/series.js show <id>                              [--dir <project>]
 *   node engine/series.js create --name "…" [--look '<json>']    [--dir <project>]
 *   node engine/series.js update <id> [--name "…"] [--look '<json>']
 *   node engine/series.js delete <id>
 *   node engine/series.js from-work <work> --name "…"            # «اعتمد شكله للسلسلة»: a finished work's look → a new series
 *   node engine/series.js resolve --idea <id> | --work <dir> | --series <id>   # → JSON {series, look, via}
 *   node engine/series.js apply-to-work <work> [--series <id> | --idea <id>] [--dry]   # writes the look into the work, keeps user edits
 *   node engine/series.js suggest                                # series ideas from the account-type pack
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { dataFile } = require('./data-dir.js');

const PLUGIN = path.resolve(__dirname, '..');
const CAP_STYLES = ['card', 'shadow', 'big', 'underline', 'bar', 'type', 'chunk', 'box', 'karaoke', 'outline', 'paper'];
const FORMATS = ['9:16', '16:9'];
const DENSITY = ['low', 'medium', 'high'];
const CADENCE = ['daily', 'weekly', 'biweekly', 'monthly'];
const COLOR_KEYS = ['bg', 'ink', 'acc', 'clay', 'mut'];
const MAX_SERIES = 200;
// theme.json keys a series may set in a work (the video editor's own names, references/start.md).
const THEME_KEYS = [...COLOR_KEYS, 'font', 'capStyle', 'capStill', 'bar', 'pace', 'capKashida', 'motionStyle', 'lut'];

function readJson(f, d) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } }
function writeJson(f, obj) {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const tmp = f + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, f);
}
const str = (v, max) => String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const hex = (v) => (typeof v === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v.trim()) ? v.trim().toUpperCase() : '');
const ident = (v, max = 60) => str(v, max).replace(/[^\w+-]/g, '');
const cleanId = (v) => str(v, 40).toLowerCase().replace(/[^a-z0-9-]/g, '');
/** A file inside the project (relative, no ..). */
function relFile(v) {
  const p = str(v, 300).replace(/["'`$\\]/g, '/');
  if (!p || path.isAbsolute(p) || /^[A-Za-z]:/.test(p) || p.split('/').includes('..')) return '';
  return p.replace(/^\.?\/+/, '');
}

/** Keeps only known look fields, each validated. Empty fields are dropped. */
function sanitizeLook(l) {
  const x = isObj(l) ? l : {};
  const out = {};
  const th = {};
  const t = isObj(x.theme) ? x.theme : {};
  const colors = isObj(t.colors) ? t.colors : {};
  const alias = { acc: ['acc', 'accent'], clay: ['clay', 'accent2'], mut: ['mut', 'muted', 'soft'], bg: ['bg'], ink: ['ink'] };
  for (const k of COLOR_KEYS) {
    for (const a of alias[k]) { const c = hex(t[a]) || hex(colors[a]); if (c) { th[k] = c; break; } }
  }
  const font = str(t.font || (isObj(t.fonts) && (t.fonts.heading || t.fonts.body)), 60).replace(/[^\p{L}\p{N} _-]/gu, '');
  if (font) th.font = font;
  if (typeof t.capStill === 'boolean') th.capStill = t.capStill;
  if (typeof t.bar === 'boolean') th.bar = t.bar;
  if (t.pace === 'calm') th.pace = 'calm';
  if (t.capKashida === 'inline') th.capKashida = 'inline';
  if (Object.keys(th).length) out.theme = th;
  const cap = CAP_STYLES.includes(x.captionStyle) ? x.captionStyle : CAP_STYLES.includes(t.capStyle) ? t.capStyle : '';
  if (cap) out.captionStyle = cap;
  const ms = str(x.motionStyle, 60);
  if (/^[A-Za-z0-9]+(\+[A-Za-z0-9]+)?$/.test(ms)) out.motionStyle = ms;
  const card = (v, keys) => {
    if (!isObj(v)) return null;
    const o = {};
    if (v.move) { const m = ident(v.move); if (m) o.move = m; }
    for (const k of keys) { const s = str(v[k], 140); if (s) o[k] = s; }
    return Object.keys(o).length ? o : null;
  };
  const intro = card(x.intro, ['text']); if (intro) out.intro = intro;
  const outro = card(x.outro, ['text', 'sub']); if (outro) out.outro = outro;
  const lt = card(x.lowerThird, ['text', 'sub']); if (lt) out.lowerThird = lt;
  if (isObj(x.music)) {
    const f = relFile(x.music.file);
    if (f) { out.music = { file: f }; const v = +x.music.volume; if (Number.isFinite(v)) out.music.volume = Math.max(0, Math.min(1, Math.round(v * 100) / 100)); }
  }
  const sfx = (Array.isArray(x.sfx) ? x.sfx : []).map((s) => ident(s)).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).slice(0, 12);
  if (sfx.length) out.sfx = sfx;
  const lut = ident(x.lut);
  if (lut) out.lut = lut;
  if (Number.isFinite(+x.lutStrength) && x.lutStrength !== '' && x.lutStrength != null) out.lutStrength = Math.max(0, Math.min(1, Math.round(+x.lutStrength * 100) / 100));
  if (FORMATS.includes(x.format)) out.format = x.format;
  if (Number.isFinite(+x.imageCount) && x.imageCount !== '' && x.imageCount != null) out.imageCount = Math.max(0, Math.min(30, Math.round(+x.imageCount)));
  if (DENSITY.includes(x.brollDensity)) out.brollDensity = x.brollDensity;
  if (isObj(x.cadence)) {
    const c = {};
    if (CADENCE.includes(x.cadence.every)) c.every = x.cadence.every;
    if (Number.isInteger(+x.cadence.day) && x.cadence.day !== '' && x.cadence.day != null && +x.cadence.day >= 0 && +x.cadence.day <= 6) c.day = +x.cadence.day;
    if (/^\d{2}:\d{2}$/.test(x.cadence.time || '')) c.time = x.cadence.time;
    if (c.every) out.cadence = c;
  } else if (CADENCE.includes(x.cadence)) out.cadence = { every: x.cadence };
  const cta = str(x.cta, 200);
  if (cta) out.cta = cta;
  return out;
}

/** a ← b, one level deep for objects (theme, intro, outro…); null/'' in b removes the key. */
function mergeLook(a, b) {
  const out = JSON.parse(JSON.stringify(a || {}));
  for (const [k, v] of Object.entries(b || {})) {
    if (v === null || v === '') delete out[k];
    else if (isObj(v) && isObj(out[k])) {
      out[k] = Object.assign({}, out[k], v);
      for (const [kk, vv] of Object.entries(v)) if (vv === null || vv === '') delete out[k][kk];
    } else out[k] = v;
  }
  return out;
}

const seriesDir = (dir) => dataFile(dir, 'series');
const seriesFile = (dir, id) => path.join(seriesDir(dir), cleanId(id) + '.json');

function normalizeSeries(j, fallbackId) {
  if (!isObj(j)) return null;
  const id = cleanId(j.id || fallbackId);
  const name = str(j.name, 80);
  if (!id || !name) return null;
  const s = { id, name, look: sanitizeLook(j.look) };
  const emoji = str(j.emoji, 8); if (emoji) s.emoji = emoji;
  const desc = str(j.description, 300); if (desc) s.description = desc;
  if (isObj(j.createdFrom) && ['work', 'idea', 'project', 'form', 'pack'].includes(j.createdFrom.kind)) s.createdFrom = { kind: j.createdFrom.kind, ref: str(j.createdFrom.ref, 300) };
  for (const k of ['createdAt', 'updatedAt']) if (j[k] && !isNaN(Date.parse(j[k]))) s[k] = new Date(j[k]).toISOString();
  return s;
}

function list(dir) {
  let files = [];
  try { files = fs.readdirSync(seriesDir(dir)).filter((f) => /^[a-z0-9-]+\.json$/.test(f)); } catch (e) { return []; }
  return files.map((f) => normalizeSeries(readJson(path.join(seriesDir(dir), f), null), f.replace(/\.json$/, '')))
    .filter(Boolean).sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')) || a.name.localeCompare(b.name));
}

function get(dir, id) {
  const c = cleanId(id);
  if (!c) return null;
  return normalizeSeries(readJson(seriesFile(dir, c), null), c);
}

function newId(name, taken, now) {
  const latin = String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
  let id = latin || 's-' + now.getTime().toString(36);
  for (let k = 2; taken.has(id); k++) id = (latin || 's-' + now.getTime().toString(36)) + '-' + k;
  return id;
}

function create(dir, body, now = new Date()) {
  const b = isObj(body) ? body : {};
  const name = str(b.name, 80);
  if (!name) return { ok: false, errors: ['سمّ السلسلة'] };
  const all = list(dir);
  if (all.length >= MAX_SERIES) return { ok: false, errors: [`أكثر من ${MAX_SERIES} سلسلة`] };
  if (all.some((s) => s.name === name)) return { ok: false, errors: ['فيه سلسلة بنفس الاسم'] };
  const taken = new Set(all.map((s) => s.id));
  let id = cleanId(b.id);
  if (id && taken.has(id)) return { ok: false, errors: ['الرقم مستخدم'] };
  if (!id) id = newId(name, taken, now);
  const t = now.toISOString();
  const s = normalizeSeries({ id, name, emoji: b.emoji, description: b.description, look: b.look, createdFrom: b.createdFrom || { kind: 'form', ref: '' }, createdAt: t, updatedAt: t }, id);
  writeJson(seriesFile(dir, id), s);
  return { ok: true, series: s, errors: [] };
}

function update(dir, id, patch, now = new Date()) {
  const cur = get(dir, id);
  if (!cur) return { ok: false, errors: ['السلسلة مو موجودة'] };
  const p = isObj(patch) ? patch : {};
  const next = Object.assign({}, cur);
  if (p.name !== undefined) {
    const n = str(p.name, 80);
    if (!n) return { ok: false, errors: ['سمّ السلسلة'] };
    if (list(dir).some((s) => s.name === n && s.id !== cur.id)) return { ok: false, errors: ['فيه سلسلة بنفس الاسم'] };
    next.name = n;
  }
  if (p.emoji !== undefined) next.emoji = p.emoji;
  if (p.description !== undefined) next.description = p.description;
  if (p.look !== undefined) next.look = p.replaceLook ? sanitizeLook(p.look) : sanitizeLook(mergeLook(cur.look, isObj(p.look) ? p.look : {}));
  next.updatedAt = now.toISOString();
  const s = normalizeSeries(next, cur.id);
  writeJson(seriesFile(dir, cur.id), s);
  return { ok: true, series: s, errors: [] };
}

/** Deletes the series and takes its videos out of it (they stay in the library). */
function remove(dir, id) {
  const c = cleanId(id);
  const f = seriesFile(dir, c);
  if (!c || !fs.existsSync(f)) return { ok: false, errors: ['السلسلة مو موجودة'] };
  fs.rmSync(f, { force: true });
  const planF = dataFile(dir, 'plan.json');
  const plan = readJson(planF, null);
  if (plan && Array.isArray(plan.ideas) && plan.ideas.some((i) => i && i.series === c)) {
    plan.ideas.forEach((i) => { if (i && i.series === c) delete i.series; });
    writeJson(planF, plan);
  }
  const libF = dataFile(dir, 'library.json');
  const lib = readJson(libF, null);
  if (lib && isObj(lib.items)) {
    let ch = false;
    for (const v of Object.values(lib.items)) if (isObj(v) && v.series === c) { delete v.series; ch = true; }
    if (ch) writeJson(libF, lib);
  }
  return { ok: true, errors: [] };
}

/** A work folder: absolute, or relative to the project. */
function workPath(dir, w) { return path.isAbsolute(w) ? w : path.join(dir, w); }

/**
 * «اعتمد شكله للسلسلة» — reads a finished work (theme.json, studio.json, series-look.json,
 * bg-audio.mp3, sfx.json) and returns the look it was made with. Pure read.
 */
function lookFromWork(work, dir) {
  const th = readJson(path.join(work, 'theme.json'), {}) || {};
  const st = readJson(path.join(work, 'studio.json'), {}) || {};
  const prev = readJson(path.join(work, 'series-look.json'), null); // the work came from a series: start from that
  const look = prev && isObj(prev.look) ? JSON.parse(JSON.stringify(prev.look)) : {};
  const theme = {};
  for (const k of [...COLOR_KEYS, 'font', 'capStill', 'bar', 'pace', 'capKashida']) if (th[k] !== undefined) theme[k] = th[k];
  if (Object.keys(theme).length) look.theme = Object.assign({}, look.theme, theme);
  if (CAP_STYLES.includes(th.capStyle)) look.captionStyle = th.capStyle;
  const style = th.motionStyle || th.style || st.style;
  if (typeof style === 'string' && style) look.motionStyle = style;
  if (th.lut || th.look) look.lut = th.lut || th.look;
  const ot = isObj(st.outro) ? st.outro : isObj(th.outro) ? th.outro : null;
  if (ot) {
    look.outro = Object.assign({}, look.outro, { text: ot.l1 || ot.text || '', sub: ot.l2 || ot.sub || '' });
    if (ot.cta && !look.cta) look.cta = ot.cta;
  }
  if (fs.existsSync(path.join(work, 'bg-audio.mp3'))) {
    const abs = path.join(work, 'bg-audio.mp3');
    const rel = dir ? path.relative(dir, abs).split(path.sep).join('/') : '';
    if (rel && !rel.startsWith('..')) look.music = Object.assign({}, look.music, { file: rel });
  }
  const sfx = readJson(path.join(work, 'sfx.json'), null);
  if (isObj(sfx)) { // 05_sfx.py: { "<kind>": [times…], "outro": 3.5 } — the kinds used most become the series' sound bed
    const top = Object.entries(sfx).filter(([k, v]) => k !== 'outro' && Array.isArray(v) && v.length).sort((a, b) => b[1].length - a[1].length).slice(0, 6).map((e) => e[0]);
    if (top.length) look.sfx = top;
  }
  const w = +th.W || +th.width, h = +th.H || +th.height;
  if (w && h) look.format = w > h ? '16:9' : '9:16';
  else if (st.format && FORMATS.includes(st.format)) look.format = st.format;
  const br = Array.isArray(st.brollClips) ? st.brollClips.length : 0;
  if (br) look.imageCount = br;
  return sanitizeLook(look);
}

function hasWorkData(work) {
  return ['theme.json', 'studio.json', 'series-look.json'].some((f) => fs.existsSync(path.join(work, f)));
}

/** «اعتمد شكله للسلسلة»: new series from a work folder. */
function fromWork(dir, work, body = {}, now = new Date()) {
  const w = workPath(dir, work);
  if (!hasWorkData(w)) return { ok: false, errors: ['مجلد الشغل ما بيه theme.json ولا studio.json — ما فيه شكل نعتمده'] };
  const look = lookFromWork(w, dir);
  const name = str(body.name, 80) || path.basename(w);
  const rel = path.relative(dir, w).split(path.sep).join('/');
  if (body.series) return update(dir, body.series, { look, replaceLook: true }, now);
  return create(dir, { name, emoji: body.emoji, look, createdFrom: { kind: body.kind || 'work', ref: body.ref || (rel.startsWith('..') ? w : rel) } }, now);
}

const libMeta = (dir) => (readJson(dataFile(dir, 'library.json'), {}) || {}).items || {};

/**
 * Which series (if any) a montage belongs to, and its look.
 * --idea <id> → plan idea.series · --work <dir> → <work>/series.json, the idea whose work it is,
 * or .io/library.json · --file <recordings/…> → .io/library.json · --series <id>.
 */
function resolve(dir, q = {}) {
  let id = '', via = '';
  if (q.series) { id = cleanId(q.series); via = 'series'; }
  const plan = readJson(dataFile(dir, 'plan.json'), {}) || {};
  const ideas = Array.isArray(plan.ideas) ? plan.ideas.filter(isObj) : [];
  if (!id && q.idea) { const i = ideas.find((x) => x.id === q.idea); if (i && i.series) { id = cleanId(i.series); via = 'idea'; } }
  if (!id && q.work) {
    const w = path.resolve(workPath(dir, q.work));
    const mark = readJson(path.join(w, 'series.json'), null);
    if (mark && mark.series) { id = cleanId(mark.series); via = 'work'; }
    if (!id) {
      const i = ideas.find((x) => x.series && path.resolve(workPath(dir, x.work || 'work/' + String(x.id).replace(/[^\w-]/g, ''))) === w);
      if (i) { id = cleanId(i.series); via = 'idea'; }
    }
    if (!id) {
      const rel = path.relative(dir, w).split(path.sep).join('/');
      const m = libMeta(dir)['work:' + rel];
      if (m && m.series) { id = cleanId(m.series); via = 'library'; }
    }
  }
  if (!id && q.file) { const m = libMeta(dir)['rec:' + relFile(q.file)]; if (m && m.series) { id = cleanId(m.series); via = 'library'; } }
  const s = id ? get(dir, id) : null;
  if (!s) return { series: null, look: {}, via: '', note: id ? `السلسلة ${id} مو موجودة` : 'مو ضمن سلسلة — اشتغل بالخطوات العادية' };
  return { series: { id: s.id, name: s.name }, look: s.look, via, theme: themeFromLook(s.look) };
}

/** The theme.json keys a look sets (the video editor's names). */
function themeFromLook(look) {
  const l = look || {};
  const t = Object.assign({}, l.theme || {});
  if (l.captionStyle) t.capStyle = l.captionStyle;
  if (l.motionStyle) t.motionStyle = l.motionStyle;
  if (l.lut) t.lut = l.lut;
  return t;
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Writes a series look into a work folder without overwriting the creator's edits:
 *  - theme.json: a key is written when missing, or when it still holds what the series wrote
 *    last time (recorded in <work>/series.json → applied). A key the creator changed is kept.
 *  - studio.json outro {l1,l2,cta}: only when the work has none.
 *  - <work>/series-look.json: the full look (intro, lower third, sfx, format, b-roll…) for the skill.
 *  - bg-audio.mp3: copied from look.music.file when the work has none.
 */
function applyToWork(dir, work, opts = {}, now = new Date()) {
  let s = null;
  if (opts.series) s = get(dir, opts.series);
  else if (opts.idea || opts.file) { const r = resolve(dir, { idea: opts.idea, file: opts.file }); s = r.series ? get(dir, r.series.id) : null; }
  else { const r = resolve(dir, { work }); s = r.series ? get(dir, r.series.id) : null; }
  if (!s) return { ok: false, errors: ['ما لكيت السلسلة'], applied: [], kept: [] };
  const w = workPath(dir, work);
  const want = themeFromLook(s.look);
  const markF = path.join(w, 'series.json');
  const mark = readJson(markF, {}) || {};
  const before = mark.series === s.id && isObj(mark.applied) ? mark.applied : {};
  const themeF = path.join(w, 'theme.json');
  const theme = readJson(themeF, {}) || {};
  const applied = {}, kept = [], wrote = [];
  for (const [k, v] of Object.entries(want)) {
    if (!THEME_KEYS.includes(k)) continue;
    const has = Object.prototype.hasOwnProperty.call(theme, k);
    if (!has || (Object.prototype.hasOwnProperty.call(before, k) && same(theme[k], before[k])) || opts.force) {
      if (!same(theme[k], v)) wrote.push(k);
      theme[k] = v; applied[k] = v;
    } else if (!same(theme[k], v)) kept.push(k);
    else applied[k] = v;
  }
  const out = { ok: true, series: { id: s.id, name: s.name }, work: w, applied: wrote, kept, errors: [] };
  if (opts.dry) return out;
  fs.mkdirSync(w, { recursive: true });
  writeJson(themeF, theme);
  const l = s.look;
  if (l.outro || l.cta) {
    const stF = path.join(w, 'studio.json');
    const st = readJson(stF, {}) || {};
    if (!st.outro) {
      st.outro = {};
      if (l.outro && l.outro.text) st.outro.l1 = l.outro.text;
      if (l.outro && l.outro.sub) st.outro.l2 = l.outro.sub;
      if (l.cta) st.outro.cta = l.cta;
      writeJson(stF, st);
      out.applied.push('studio.outro');
    }
  }
  if (l.music && l.music.file) {
    const src = path.join(dir, l.music.file), dst = path.join(w, 'bg-audio.mp3');
    if (!fs.existsSync(dst) && fs.existsSync(src) && /\.mp3$/i.test(src)) { fs.copyFileSync(src, dst); out.applied.push('bg-audio.mp3'); }
  }
  writeJson(path.join(w, 'series-look.json'), { series: s.id, name: s.name, look: l, appliedAt: now.toISOString() });
  writeJson(markF, { series: s.id, name: s.name, appliedAt: now.toISOString(), applied });
  return out;
}

/** Series the account-type pack suggests (library/account-types/types.json → series), minus ones already made. */
function suggestions(dir, root = PLUGIN) {
  const lib = readJson(path.join(root, 'library', 'account-types', 'types.json'), null);
  const proj = readJson(dataFile(dir, 'project.json'), {}) || {};
  if (!lib || !Array.isArray(lib.types)) return [];
  const t = lib.types.find((x) => x && x.id === proj.accountType);
  const have = new Set(list(dir).map((s) => s.name));
  return (t && Array.isArray(t.series) ? t.series : []).filter((s) => isObj(s) && s.name && !have.has(s.name))
    .map((s) => ({ name: str(s.name, 80), emoji: str(s.emoji, 8), description: str(s.description, 300), look: sanitizeLook(s.look) }));
}

// ---------- CLI ----------
function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const v = argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') ? argv[++i] : true; o[k] = v; } else o._.push(a);
  }
  return o;
}
function parseLook(v) {
  if (!v || v === true) return undefined;
  try { return JSON.parse(fs.existsSync(v) ? fs.readFileSync(v, 'utf8') : v); } catch (e) { console.error('الشكل لازم JSON: ' + e.message); process.exit(1); }
}
function main() {
  const o = args(process.argv.slice(2));
  const dir = path.resolve(o.dir && o.dir !== true ? o.dir : process.env.CLAUDE_PROJECT_DIR || process.cwd());
  const cmd = o._[0];
  const print = (r) => console.log(JSON.stringify(r, null, 2));
  const done = (r) => { print(r); if (r && r.ok === false) process.exit(1); };
  if (cmd === 'list') {
    const all = list(dir);
    if (o.json) return print(all);
    if (!all.length) return console.log('ما فيه سلاسل بعد (.io/series/). سوّها من «مشاريعي» بالبرنامج، أو: series.js create --name "…"');
    for (const s of all) console.log(`${s.emoji || '📁'} ${s.name} (${s.id}) — ${Object.keys(s.look).join('، ') || 'بلا شكل بعد'}`);
    return;
  }
  if (cmd === 'show') { const s = get(dir, o._[1]); if (!s) { console.error('السلسلة مو موجودة'); process.exit(1); } return print(s); }
  if (cmd === 'create') return done(create(dir, { name: o.name, id: o.id, emoji: o.emoji, look: parseLook(o.look) }));
  if (cmd === 'update') return done(update(dir, o._[1], { name: o.name === true ? undefined : o.name, look: parseLook(o.look) }));
  if (cmd === 'delete') return done(remove(dir, o._[1]));
  if (cmd === 'from-work') { if (!o._[1]) { console.error('أي مجلد شغل؟'); process.exit(2); } return done(fromWork(dir, o._[1], { name: o.name === true ? '' : o.name, series: o.series })); }
  if (cmd === 'resolve') return print(resolve(dir, { idea: o.idea, work: o.work, file: o.file, series: o.series }));
  if (cmd === 'apply-to-work') { if (!o._[1]) { console.error('أي مجلد شغل؟'); process.exit(2); } return done(applyToWork(dir, o._[1], { series: o.series, idea: o.idea, file: o.file, dry: !!o.dry, force: !!o.force })); }
  if (cmd === 'suggest') return print(suggestions(dir));
  console.error('الاستخدام: node engine/series.js list | show <id> | create --name … [--look json] | update <id> … | delete <id> | from-work <work> --name … | resolve --idea <id>|--work <dir>|--file <rec>|--series <id> | apply-to-work <work> [--series <id>|--idea <id>] [--dry] [--force] | suggest   [--dir <project>]');
  process.exit(2);
}

if (require.main === module) main();
module.exports = { CAP_STYLES, FORMATS, DENSITY, CADENCE, THEME_KEYS, sanitizeLook, mergeLook, list, get, create, update, remove, lookFromWork, fromWork, resolve, themeFromLook, applyToWork, suggestions, workPath };
