#!/usr/bin/env node
'use strict';
/**
 * I/O Studio — trends from the accounts the creator follows (skills/io-trends).
 *
 * The pull itself runs in Composio's COMPOSIO_REMOTE_WORKBENCH
 * (skills/io-trends/scripts/composio_trend_pull.py, ScrapeCreators toolkit).
 * This file fills that template from the project and imports what it returns:
 *
 *   node engine/trends.js inputs  [--dir <project>]            # handles / arabic / keywords as JSON
 *   node engine/trends.js fill    [--dir <project>] [--out f]  # the template with the INPUTS block filled
 *   node engine/trends.js import  <rows.json> [--top 5] [--min 1.5] [--dir <project>]
 *   (same as: node engine/app-api.js import-trends <rows.json> …)
 *
 * import writes:
 *   .io/trends/<YYYY-MM-DD>.json   the day's rows (merged by url)
 *   .io/trends-last.json           the daily-trends mark (hooks/session-start.js)
 *   .io/benchmark.json             each followed account's median views (stats page «قارن نفسك»)
 *   .io/plan.json                  the top N rows by outlier as ideas (source "trend")
 * Nothing personal lives here: handles and keywords come from the project's own files.
 */
const fs = require('fs');
const path = require('path');
const { dataFile, DATA_DIR } = require('./data-dir.js');
const api = require('./app-api.js');

const PLUGIN = path.resolve(__dirname, '..');
const TEMPLATE = path.join(PLUGIN, 'skills', 'io-trends', 'scripts', 'composio_trend_pull.py');
const HANDLE_RE = /^[A-Za-z0-9._]{1,30}$/;
const MAX_ROWS = 500;

function readJson(f, d) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } }
function str(v, max) { return String(v == null ? '' : v).trim().slice(0, max); }
const arr = (v) => (Array.isArray(v) ? v : []);
const uniq = (a) => { const seen = new Set(); return a.filter((x) => { const k = String(x).toLowerCase(); if (!x || seen.has(k)) return false; seen.add(k); return true; }); };
const day = (now) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

/** «4.2» → «٤.٢» (Arabic-Indic digits, as the app shows numbers). */
function arNum(n) { return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]); }

function median(a) {
  const v = a.filter((x) => typeof x === 'number' && Number.isFinite(x) && x > 0).sort((x, y) => x - y);
  if (!v.length) return null;
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/** One sources.json account → { platform, handle, arabic } or null. */
function parseAccount(a) {
  let platform = '', handle = '', arabic = false;
  if (typeof a === 'string') {
    const m = /^(instagram|youtube|tiktok|x|threads|snapchat)\s*[:/]\s*(.+)$/i.exec(a.trim());
    if (m) { platform = m[1].toLowerCase(); handle = m[2]; } else handle = a;
  } else if (a && typeof a === 'object') {
    platform = str(a.platform, 30).toLowerCase();
    handle = str(a.handle || a.url || a.name, 200);
    arabic = a.arabic === true || /^ar/i.test(str(a.lang || a.language, 10));
  } else return null;
  handle = str(handle, 200);
  const u = /instagram\.com\/([^/?#\s]+)/i.exec(handle);
  if (u) { handle = u[1]; if (!platform) platform = 'instagram'; }
  handle = handle.replace(/^@/, '').replace(/\/+$/, '');
  return handle ? { platform, handle, arabic } : null;
}

/** «- المجال (النيش): تقنية، ذكاء اصطناعي» from .io/creator-profile.md → ['تقنية، ذكاء اصطناعي', 'تقنية', 'ذكاء اصطناعي']. */
function nicheKeywords(dir) {
  let md = '';
  try { md = fs.readFileSync(dataFile(dir, 'creator-profile.md'), 'utf8'); } catch (e) { return []; }
  const m = /^\s*[-*]?\s*(?:المجال(?:\s*\(النيش\))?|النيش|niche)\s*[:：]\s*(.+)$/im.exec(md);
  if (!m) return [];
  const whole = str(m[1].replace(/[*_`]/g, ''), 120);
  if (!whole || /^[—-]+$/.test(whole)) return [];
  const parts = whole.split(/\s*[،,/|؛;]\s*|\s+و(?=\S)/).map((x) => str(x, 60)).filter((x) => x.length > 1);
  return uniq([whole, ...parts]);
}

/** What the template needs, from the project: { handles, arabic, keywords, lastN, accountType }. */
function inputs(dir, { lastN = 6 } = {}) {
  const src = readJson(dataFile(dir, 'sources.json'), {}) || {};
  const accounts = arr(src.accounts).map(parseAccount).filter((a) => a && (a.platform === 'instagram' || !a.platform) && HANDLE_RE.test(a.handle));
  const proj = readJson(dataFile(dir, 'project.json'), {}) || {};
  let typeKw = [];
  try { const t = require('./account-type.js').getType(proj.accountType); typeKw = arr(t && t.keywords); } catch (e) { /* no library */ }
  const handles = uniq(accounts.map((a) => a.handle));
  return {
    handles,
    arabic: uniq(accounts.filter((a) => a.arabic).map((a) => a.handle)),
    keywords: uniq([...arr(src.keywords).map((k) => str(k, 60)), ...nicheKeywords(dir), ...typeKw.map((k) => str(k, 60))].filter(Boolean)).slice(0, 120),
    lastN: Math.max(1, Math.min(30, +lastN || 6)),
    accountType: typeof proj.accountType === 'string' ? proj.accountType : '',
  };
}

const py = (v) => JSON.stringify(v); // a JSON list of strings is a valid Python literal

/** The template with its INPUTS block replaced. */
function fill(inp, template = fs.readFileSync(TEMPLATE, 'utf8')) {
  const block = [
    '# >>> IO:INPUTS (filled by engine/trends.js fill)',
    `HANDLES = ${py(inp.handles || [])}`,
    `ARABIC = set(${py(inp.arabic || [])})`,
    'AUTO_ARABIC = True',
    `LAST_N = ${Math.max(1, Math.min(30, +inp.lastN || 6))}`,
    `KEYWORDS = ${py(inp.keywords || [])}`,
    '# <<< IO:INPUTS',
  ].join('\n');
  const re = /# >>> IO:INPUTS[^\n]*\n[\s\S]*?# <<< IO:INPUTS[^\n]*/;
  if (!re.test(template)) throw new Error('القالب ما بيه قسم IO:INPUTS');
  return template.replace(re, () => block);
}

function num(v) { const n = typeof v === 'string' ? Number(v.replace(/,/g, '')) : v; return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null; }
function url(v) { const u = str(v, 1000); return /^https?:\/\//i.test(u) ? u : ''; }
function iso(v) {
  if (v == null || v === '') return '';
  const n = typeof v === 'number' ? v : /^\d+$/.test(String(v)) ? +v : NaN;
  const d = Number.isFinite(n) ? new Date(n < 1e12 ? n * 1000 : n) : new Date(String(v));
  return isNaN(d) ? '' : d.toISOString();
}

/**
 * Rows from the workbench (or any list shaped like them) → clean rows.
 * Fills medianViews/outlier per account when a row lacks them.
 */
function normalizeRows(data) {
  const list = Array.isArray(data) ? data : data && typeof data === 'object' ? arr(data.rows || data.items) : [];
  const rows = [];
  for (const x of list.slice(0, MAX_ROWS)) {
    if (!x || typeof x !== 'object') continue;
    const u = url(x.url);
    if (!u) continue;
    const m = x.metrics && typeof x.metrics === 'object' ? x.metrics : {};
    const metrics = {};
    for (const k of ['views', 'likes', 'comments', 'shares', 'saves']) { const n = num(m[k]); if (n !== null) metrics[k] = n; }
    const r = {
      title: str(x.title, 200), url: u, platform: str(x.platform, 30).toLowerCase() || 'instagram',
      author: str(x.author, 60).replace(/^@/, ''), note: str(x.note, 1000), published: iso(x.published),
      metrics, tags: arr(x.tags).map((t) => str(t, 30)).filter(Boolean).slice(0, 10),
      outlier: num(x.outlier), medianViews: num(x.medianViews),
    };
    const th = url(x.thumbnail), vu = url(x.videoUrl);
    if (th) r.thumbnail = th;
    if (vu) r.videoUrl = vu;
    rows.push(r);
  }
  // rows without a median: use the median of that account's rows we do have
  const by = {};
  for (const r of rows) (by[r.platform + ':' + r.author.toLowerCase()] = by[r.platform + ':' + r.author.toLowerCase()] || []).push(r);
  for (const list2 of Object.values(by)) {
    const med = median(list2.map((r) => r.metrics.views));
    for (const r of list2) {
      if (!r.medianViews && med) r.medianViews = Math.round(med);
      if (r.outlier === null && r.medianViews && r.metrics.views != null) r.outlier = Math.round((r.metrics.views / r.medianViews) * 100) / 100;
    }
  }
  return rows;
}

/** Per-account medians → .io/benchmark.json (merged with what is there). */
function updateBenchmark(dir, rows, now = new Date()) {
  const f = dataFile(dir, 'benchmark.json');
  const old = readJson(f, null);
  const accounts = old && old.accounts && typeof old.accounts === 'object' ? old.accounts : {};
  const seen = {};
  for (const r of rows) {
    if (!r.author || !r.medianViews) continue;
    const key = r.platform + ':' + r.author.toLowerCase();
    const a = seen[key] || (seen[key] = { platform: r.platform, handle: r.author, medianViews: r.medianViews, topOutlier: 0, arabic: r.tags.includes('arabic'), updatedAt: now.toISOString() });
    a.topOutlier = Math.max(a.topOutlier, r.outlier || 0);
  }
  Object.assign(accounts, seen);
  const out = { version: 1, updatedAt: now.toISOString(), accounts };
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(out, null, 2));
  return out;
}

function readBenchmark(dir) {
  const b = readJson(dataFile(dir, 'benchmark.json'), null);
  return b && b.accounts && typeof b.accounts === 'object' ? b : null;
}

/** A row → an idea for plan.json (addIdeas). */
function rowToIdea(r) {
  const first = str(String(r.title || r.note || '').split('\n')[0], 110);
  const x = r.outlier ? Math.round(r.outlier * 10) / 10 : null;
  const bits = [];
  if (r.metrics.views != null) bits.push(`مشاهدات ${r.metrics.views}`);
  if (r.metrics.likes != null) bits.push(`إعجابات ${r.metrics.likes}`);
  if (r.metrics.comments != null) bits.push(`تعليقات ${r.metrics.comments}`);
  if (r.medianViews) bits.push(`وسيط الحساب ${r.medianViews}`);
  return {
    title: first ? `على خطى @${r.author}: ${first}` : `ريل ناجح من @${r.author}`,
    hook: '',
    format: r.metrics.views != null || r.videoUrl ? 'reel' : '',
    source: 'trend',
    trendRef: { title: str(r.title, 300), url: r.url, account: '@' + r.author },
    why: x ? `هالريل جاب ${arNum(x)}× مشاهدات الحساب المعتادة` : 'ترند من حساب تتابعه',
    notes: [`الكابشن الأصلي (@${r.author}): ${str(r.note, 600)}`, bits.join(' · ')].filter(Boolean).join('\n'),
  };
}

/**
 * Imports the workbench rows into the project. opts: { top=5, min=1.5, now }.
 * Returns { ok, rows, file, ideas:{added,skipped}, benchmark, errors }.
 */
function importTrends(dir, data, { top = 5, min = 1.5, now = new Date() } = {}) {
  const rows = normalizeRows(data);
  const date = day(now);
  const f = dataFile(dir, 'trends', date + '.json');
  const prev = readJson(f, null);
  const merged = new Map(arr(prev && prev.rows).filter((r) => r && r.url).map((r) => [r.url, r]));
  for (const r of rows) merged.set(r.url, r);
  const all = [...merged.values()].sort((a, b) => (b.outlier || 0) - (a.outlier || 0));
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify({ version: 1, date, updatedAt: now.toISOString(), source: 'composio-scrapecreators', rows: all }, null, 2));
  const benchmark = updateBenchmark(dir, rows, now);

  const used = new Set(api.readPlan(dir).ideas.map((i) => i.trendRef && i.trendRef.url).filter(Boolean));
  const pick = rows.filter((r) => r.outlier && r.outlier >= min && !used.has(r.url))
    .sort((a, b) => b.outlier - a.outlier).slice(0, Math.max(0, +top || 0));
  const res = pick.length ? api.addIdeas(dir, pick.map(rowToIdea), now) : { ok: true, added: [], skipped: [], errors: [] };
  api.writeTrendsLast(dir, res.added.length, now);
  return { ok: res.ok, rows: rows.length, file: path.join(DATA_DIR, 'trends', date + '.json'), ideas: { added: res.added, skipped: res.skipped }, benchmark, errors: res.errors };
}

module.exports = { TEMPLATE, arNum, median, parseAccount, nicheKeywords, inputs, fill, normalizeRows, updateBenchmark, readBenchmark, rowToIdea, importTrends };

// ───────────────────────── CLI ─────────────────────────
function cli(argv) {
  const opt = (k) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : undefined; };
  const dir = path.resolve(opt('dir') || process.env.CLAUDE_PROJECT_DIR || process.cwd());
  const cmd = argv[0];
  if (cmd === 'inputs') return console.log(JSON.stringify(inputs(dir, { lastN: opt('last') }), null, 2));
  if (cmd === 'fill') {
    const inp = inputs(dir, { lastN: opt('last') });
    if (!inp.handles.length) { console.error('ما بـ .io/sources.json حسابات إنستقرام — ضيف حساباتك أول ({"accounts":[{"platform":"instagram","handle":"…"}]}).'); process.exit(1); }
    const out = fill(inp);
    if (opt('out')) { fs.writeFileSync(opt('out'), out); console.log(`✓ ${opt('out')} — ${inp.handles.length} حساب، ${inp.keywords.length} كلمة`); } else process.stdout.write(out);
    return;
  }
  if (cmd === 'import' && argv[1] && !argv[1].startsWith('--')) {
    let data;
    try { data = JSON.parse(fs.readFileSync(argv[1], 'utf8')); } catch (e) { console.error('ما گدرت أقرا الملف: ' + e.message); process.exit(1); }
    const r = importTrends(dir, data, { top: opt('top') !== undefined ? +opt('top') : 5, min: opt('min') !== undefined ? +opt('min') : 1.5 });
    if (!r.ok) { console.error('ما انضافت الأفكار: ' + r.errors.join('، ')); process.exit(1); }
    console.log(`✓ ${r.rows} منشور بـ ${r.file} · ${Object.keys(r.benchmark.accounts).length} حساب بـ ${DATA_DIR}/benchmark.json · ${r.ideas.added.length} فكرة جديدة${r.ideas.skipped.length ? ` (تخطّيت ${r.ideas.skipped.length} مكررة)` : ''} — تطلع ببرنامج آي أو استوديو (app.html) تحت «اقتراحات اليوم».`);
    return;
  }
  console.error('الاستخدام: node engine/trends.js inputs|fill [--out f]|import <rows.json> [--top 5] [--min 1.5]  [--dir <project>]');
  process.exit(2);
}

if (require.main === module) cli(process.argv.slice(2));
else module.exports.cli = cli;
