'use strict';
/**
 * I/O Studio — the stats page's API (web/dashboard.html), routed from engine/serve.js.
 * Everything is saved in the project: <project>/.io/stats.json (+ stats-sync.json for «آخر سحب»).
 * There are no secrets here at all: the Instagram login lives in Composio, and Claude runs the pull.
 *
 *   GET  /api/stats            → { stats, status, benchmark }   (benchmark = .io/benchmark.json from engine/trends.js, or null)
 *   GET  /api/stats/eval       → content evaluation (+ Claude's saved analyses)
 *   GET  /api/stats/analysis/<platform>-<postId>   (or /<postId>?platform=instagram)
 *                              → { key, post (its evaluation), analysis (Claude's deep analysis or null) } — read-only
 *   GET  /api/stats/profile    → { name, bio, niche, handle, followers, follows, mediaCount, picture } — the profile
 *                              header of web/instagram.html: a few lines of creator-profile.md + the last pull
 *   POST /api/stats/import     { platform, text }                    export file (CSV/JSON)
 *                              { from: 'composio-instagram', text }  a Composio pull file
 *   POST /api/stats/manual     { platform, handle, followers, date, posts:[…] }
 *   POST /api/stats/replace    { stats }                             a whole stats.json (open file / demo)
 *   POST /api/stats/clear      { platform? }
 *   POST /api/stats/mode       { mode: 'manual'|'composio' }
 * Requests for Claude (sync-stats, analyze-post, stats-ideas, stats-reel) go through /api/queue.
 */
const fs = require('fs');
const S = require('../web/lib/stats-core.js');
const T = require('./stats.js');

const BODY = 8 * 1024 * 1024;

function readStats(dir) { try { return T.load(T.statsFile(dir)); } catch (e) { return S.emptyStats(); } }

function replaceStats(dir, obj) {
  if (!obj || typeof obj !== 'object' || !obj.accounts || typeof obj.accounts !== 'object') return { ok: false, errors: ['مو ملف stats.json'] };
  const st = S.emptyStats();
  for (const id of S.PLATFORM_IDS) {
    const a = obj.accounts[id];
    if (!a || typeof a !== 'object') continue;
    T.mergeAccount(st, id, { posts: Array.isArray(a.posts) ? a.posts.filter((p) => p && typeof p === 'object').map((p) => Object.assign({}, p, { id: String(p.id || '') })) : [], snapshots: Array.isArray(a.snapshots) ? a.snapshots.filter((s) => s && /^\d{4}-\d{2}-\d{2}/.test(s.date || '')) : [] }, { handle: String(a.handle || '').slice(0, 100), followers: +a.followers || 0 });
    if (a.sync && typeof a.sync === 'object') st.accounts[id].sync = { source: ['manual', 'composio'].includes(a.sync.source) ? a.sync.source : 'manual', at: String(a.sync.at || '').slice(0, 40) || null };
    if (a.extra && typeof a.extra === 'object') st.accounts[id].extra = a.extra;
  }
  T.save(T.statsFile(dir), st);
  return { ok: true };
}

const PROFILE_MAX = 64 * 1024;
/** `- الاسم: …` style lines of .io/creator-profile.md — only the public bits a profile header shows. */
function readProfile(dir, stats) {
  let txt = '';
  try {
    const f = require('./data-dir.js').dataFile(dir, 'creator-profile.md');
    if (fs.statSync(f).size <= PROFILE_MAX) txt = fs.readFileSync(f, 'utf8');
  } catch (e) { /* no profile yet */ }
  const line = (label) => { const m = txt.match(new RegExp('^-\\s*' + label + ':[ \\t]*(.*)$', 'm')); return m ? m[1].trim().slice(0, 200) : ''; };
  const st = stats || readStats(dir);
  const ig = st.accounts.instagram || {};
  const x = (ig.extra && ig.extra.profile) || {};
  const accounts = line('الحسابات');
  const fromProfile = (accounts.match(/إنستقرام\s*@([\w.]+)/) || [])[1];
  const pic = String(x.picture || '');
  return {
    name: line('الاسم') || String(x.name || '').slice(0, 100),
    bio: line('جملة تعريف \\(سطر واحد\\)') || line('جملة تعريف') || String(x.bio || '').slice(0, 300),
    niche: line('المجال \\(النيش\\)') || line('المجال'),
    handle: ig.handle || (fromProfile ? '@' + fromProfile : ''),
    followers: ig.followers || 0,
    follows: Number.isFinite(+x.follows) ? +x.follows : null,
    mediaCount: Number.isFinite(+x.mediaCount) ? +x.mediaCount : null,
    picture: /^https:\/\//i.test(pic) ? pic.slice(0, 1000) : '',
  };
}

/** One post's evaluation + Claude's deep analysis. key = "<platform>-<postId>". */
function analysisFor(dir, key) {
  const CE = require('./content-eval.js');
  const m = String(key || '').match(/^(instagram|youtube|tiktok)-([\w-]{1,80})$/);
  if (!m) return null;
  const st = readStats(dir);
  const ev = CE.evaluateProject(dir, st, { platform: m[1] });
  const post = ev.posts.find((p) => p.key === key) || null;
  const analysis = CE.readAnalyses(dir)[key] || null;
  if (!post && !analysis) return null;
  return { key, platform: m[1], postId: m[2], post, analysis, baseline: ev.baseline[m[1]] || null };
}

function route(req, res, url, dir, h) {
  const p = url.pathname;
  if (!p.startsWith('/api/stats')) return false;
  const send = (code, obj) => h.sendJson(res, code, obj);
  const body = (fn) => h.readBody(req, BODY).then((b) => {
    let j; try { j = JSON.parse(b || '{}'); } catch (e) { return send(400, { ok: false, errors: ['بيانات غير صالحة'] }); }
    try { fn(j); } catch (e) { send(400, { ok: false, errors: [e.message] }); }
  }).catch((e) => send(413, { ok: false, errors: [e.message] }));
  const done = (extra) => send(200, Object.assign({ ok: true, stats: readStats(dir), status: T.status(dir) }, extra || {}));
  try {
    if (req.method === 'GET' && p === '/api/stats') return send(200, { stats: readStats(dir), status: T.status(dir), benchmark: require('./trends.js').readBenchmark(dir) }), true;
    if (req.method === 'GET' && p === '/api/stats/profile') return send(200, readProfile(dir)), true;
    if (req.method === 'GET' && p.startsWith('/api/stats/analysis/')) {
      let id = ''; try { id = decodeURIComponent(p.slice('/api/stats/analysis/'.length)); } catch (e) { /* bad escape */ }
      const pl = url.searchParams.get('platform') || 'instagram';
      const key = /^(instagram|youtube|tiktok)-/.test(id) ? id : `${pl}-${id}`;
      const r = analysisFor(dir, key);
      return send(r ? 200 : 404, r ? Object.assign({ ok: true }, r) : { ok: false, error: 'not found' }), true;
    }
    if (req.method === 'GET' && p === '/api/stats/eval') return send(200, require('./content-eval.js').evaluateProject(dir, readStats(dir), { platform: url.searchParams.get('platform') || null })), true;
  } catch (e) { return send(500, { error: e.message }), true; }
  if (req.method !== 'POST') return send(404, { error: 'not found' }), true;
  if (p === '/api/stats/import') {
    body((j) => {
      const text = String(j.text || '');
      if (!text.trim()) return send(400, { ok: false, errors: ['الملف فاضي'] });
      const st = readStats(dir);
      if (j.from === 'composio-instagram') {
        const r = T.importComposioInstagram(dir, st, text);
        T.save(T.statsFile(dir), st);
        return done({ result: r });
      }
      if (!S.PLATFORM_IDS.includes(j.platform)) return send(400, { ok: false, errors: ['اختار المنصة'] });
      const r = S.importText(st, j.platform, text, { handle: j.handle, followers: j.followers });
      if (!st.accounts[j.platform].sync || st.accounts[j.platform].sync.source !== 'composio') st.accounts[j.platform].sync = { source: 'manual', at: new Date().toISOString() };
      T.save(T.statsFile(dir), st);
      done({ result: r });
    });
    return true;
  }
  if (p === '/api/stats/manual') {
    body((j) => {
      const st = readStats(dir);
      const r = T.applyManual(st, j);
      if (!r.ok) return send(400, r);
      T.save(T.statsFile(dir), st);
      done({ result: r });
    });
    return true;
  }
  if (p === '/api/stats/replace') { body((j) => { const r = replaceStats(dir, j.stats); return r.ok ? done() : send(400, r); }); return true; }
  if (p === '/api/stats/clear') {
    body((j) => {
      const st = readStats(dir);
      if (S.PLATFORM_IDS.includes(j.platform)) st.accounts[j.platform] = S.emptyStats().accounts[j.platform];
      else if (j.platform) return send(400, { ok: false, errors: ['منصة مو معروفة'] });
      T.save(T.statsFile(dir), j.platform ? st : S.emptyStats());
      done();
    });
    return true;
  }
  if (p === '/api/stats/mode') { body((j) => { const r = T.setMode(dir, j.mode); return r.ok ? done() : send(400, r); }); return true; }
  send(404, { error: 'not found' });
  return true;
}

module.exports = { route, readStats, replaceStats, readProfile, analysisFor };
