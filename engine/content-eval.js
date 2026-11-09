'use strict';
/**
 * I/O Studio — content evaluation (Node side). The rules live in web/lib/content-eval.js so the stats
 * page and the CLI judge posts the same way; this file adds what only Node can do: reading
 * Claude's deep analyses (.io/analysis/<platform>-<postId>.json) and engine/hookmeter results.
 *
 *   node engine/stats.js eval [--platform tiktok] [--json]
 */
const fs = require('fs');
const path = require('path');
const E = require('../web/lib/content-eval.js');
const { dataFile } = require('./data-dir.js');

const safeId = (v) => String(v || '').replace(/[^\w-]/g, '').slice(0, 80);
const analysisFile = (dir, platform, id) => dataFile(dir, 'analysis', `${platform}-${safeId(id)}.json`);

/** Every saved deep analysis, keyed `${platform}-${postId}`. */
function readAnalyses(dir) {
  const out = {};
  let files = [];
  try { files = fs.readdirSync(dataFile(dir, 'analysis')).filter((f) => /^(instagram|youtube|tiktok)-[\w-]+\.json$/.test(f)); } catch (e) { return out; }
  for (const f of files) {
    try {
      const j = JSON.parse(fs.readFileSync(dataFile(dir, 'analysis', f), 'utf8'));
      out[f.replace(/\.json$/, '')] = {
        at: j.at || null, verdict: String(j.verdict || '').slice(0, 2000), promised: String(j.promised || '').slice(0, 600), leftAt: String(j.leftAt || '').slice(0, 300),
        why: String(j.why || '').slice(0, 2000), fixes: (Array.isArray(j.fixes) ? j.fixes : []).map((x) => String(x).slice(0, 400)).slice(0, 5),
        hook: j.hook && typeof j.hook === 'object' ? { original: String(j.hook.original || '').slice(0, 400), rewritten: String(j.hook.rewritten || '').slice(0, 400) } : null,
        hookmeter: j.hookmeter && typeof j.hookmeter === 'object' ? j.hookmeter : null,
        durationSec: Number.isFinite(+j.durationSec) && +j.durationSec > 0 ? +j.durationSec : null,
      };
    } catch (e) { /* skip a broken file */ }
  }
  return out;
}

/** engine/hookmeter results (.io/hookmeter/report.json rows with post_id) + numbers inside analyses. */
function readHookmeter(dir, stats, analyses) {
  const out = {};
  for (const [k, a] of Object.entries(analyses || {})) if (a.hookmeter) out[k] = a.hookmeter;
  try {
    const rep = JSON.parse(fs.readFileSync(dataFile(dir, 'hookmeter', 'report.json'), 'utf8'));
    const rows = Array.isArray(rep.rows) ? rep.rows : Array.isArray(rep.results) ? rep.results : [];
    for (const r of rows) {
      const id = String(r.post_id || '');
      if (!id) continue;
      for (const pl of E.NAMES ? Object.keys(E.NAMES) : []) if ((stats.accounts[pl].posts || []).some((p) => p.id === id)) out[`${pl}-${id}`] = Object.assign({}, r, out[`${pl}-${id}`] || {});
    }
  } catch (e) { /* no hookmeter run */ }
  return out;
}

function evaluateProject(dir, stats, opts = {}) {
  const analyses = readAnalyses(dir);
  return E.evaluate(stats, Object.assign({ analyses, hookmeter: readHookmeter(dir, stats, analyses) }, opts));
}

module.exports = Object.assign({}, E, { readAnalyses, readHookmeter, evaluateProject, analysisFile, safeId });
