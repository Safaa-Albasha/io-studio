#!/usr/bin/env node
/*
 * I/O Studio — podcast from a link: «النص أول» (transcript first, download only what you pick).
 * Own code (I/O Studio). Works on top of engine/podcast-batch.js (propose · select · status).
 *
 *   node engine/podcast-link.js subs <رابط> [--id <slug>] [--langs ar,en]
 *        yt-dlp reads the title/length and the platform's subtitles only (no video) → .io/podcast/<id>/
 *        source.json + words.json. No subtitles? --audio downloads the sound only for 18_long_transcribe.py.
 *   node engine/podcast-batch.js propose .io/podcast/<id>/words.json --dir .io/podcast/<id>
 *   node engine/podcast-link.js score .io/podcast/<id>/batch.json [--top 5]
 *        a first rank for every window (0–100 + Arabic reasons: starts with a question, a number, a pull word,
 *        fast speech, a complete idea, length). Claude reads the text and re-ranks — the score is a hint, not a verdict.
 *   web/podcast.html  (node engine/serve.js --open podcast.html) — the creator ticks clips, count, caption language
 *        → .io/podcast/<id>/selections.draft.json. Claude confirms with the creator, then podcast-batch select.
 *   node engine/podcast-link.js fetch .io/podcast/<id>/batch.json [--pad 1.5]
 *        after select: downloads ONLY each approved clip's section (yt-dlp --download-sections) into
 *        clips/<clip>/source.mp4 with its own words.json and spec.json shifted to the section — ready for 20_episode_cuts.py.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { dataFile } = require('./data-dir.js');

const SLUG = /^[a-z0-9][a-z0-9-]{0,47}$/;
const r3 = (n) => Math.round(n * 1000) / 1000;
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { if (d !== undefined) return d; throw e; } };
const writeJson = (f, d) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(d, null, 2)); };

// ---- links ----------------------------------------------------------------------------------------------------
/** Only http(s) links, no whitespace or shell characters (passed as an argv item anyway, never through a shell). */
function checkUrl(u) {
  const s = String(u || '').trim();
  let x; try { x = new URL(s); } catch (e) { throw new Error('الرابط غير صالح'); }
  if (!/^https?:$/.test(x.protocol) || /\s/.test(s)) throw new Error('الرابط لازم يبدأ بـhttp أو https');
  return s;
}
function slugFrom(u) {
  try { const x = new URL(u); const v = x.searchParams.get('v') || x.pathname.split('/').filter(Boolean).pop() || 'episode';
    return (v.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'episode'); } catch (e) { return 'episode'; }
}

// ---- subtitles (WebVTT) → words --------------------------------------------------------------------------------
const ts = (s) => { const m = /(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})/.exec(s); if (!m) return NaN; return (+(m[1] || 0)) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4].padEnd(3, '0')) / 1000; };
const clean = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * WebVTT → [{text,startMs,endMs}] (one entry per word — the flat form podcast-batch.normalizeWords reads).
 * Auto-captions repeat the previous line in each cue and carry per-word <00:00:01.234> stamps: we keep only new words
 * and use the stamps when present; otherwise a cue's words share its time evenly.
 */
function parseVtt(text) {
  const out = []; let lastEnd = -1;
  const blocks = String(text || '').replace(/\r/g, '').split(/\n\n+/);
  for (const b of blocks) {
    const lines = b.split('\n'); const ti = lines.findIndex((l) => l.includes('-->')); if (ti < 0) continue;
    const [a, z] = lines[ti].split('-->'); const cs = ts(a), ce = ts(z); if (!(ce > cs)) continue;
    const body = lines.slice(ti + 1).filter((l) => l.trim());
    if (!body.length) continue;
    const stamped = body.find((l) => /<\d{1,2}:\d{2}[:.]/.test(l));
    let words = [];
    if (stamped) {           // "first <00:00:01.200><c> second</c><00:00:01.700><c> third</c>"
      const parts = stamped.split(/<(\d{1,2}:\d{2}(?::\d{2})?[.,]\d{1,3})>/);
      let t = cs;
      for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 1) { t = ts(parts[i]); continue; }
        for (const w of clean(parts[i]).split(' ').filter(Boolean)) words.push({ text: w, s: t });
      }
      words.forEach((w, i) => { w.e = i + 1 < words.length ? Math.max(w.s + 0.05, words[i + 1].s) : ce; });
    } else {
      const tx = clean(body[body.length - 1]);             // rolling captions: the last line is the new one
      const ws = tx.split(' ').filter(Boolean); const d = (ce - cs) / Math.max(1, ws.length);
      words = ws.map((w, i) => ({ text: w, s: cs + i * d, e: cs + (i + 1) * d }));
    }
    for (const w of words) {
      if (w.s < lastEnd - 0.05) continue;                  // repeated text from the previous cue
      out.push({ text: w.text, startMs: Math.round(w.s * 1000), endMs: Math.round(Math.max(w.e, w.s + 0.05) * 1000) });
      lastEnd = w.e;
    }
  }
  return out;
}

// ---- scoring --------------------------------------------------------------------------------------------------
const PULL = ['سر', 'أسرار', 'غلط', 'خطأ', 'أخطر', 'أهم', 'أكبر', 'أول مرة', 'محد', 'ما أحد', 'لازم', 'ممنوع', 'تخيل', 'صدق', 'الحقيقة', 'السبب', 'فلوس', 'ريال', 'دولار', 'مليون', 'نجاح', 'فشل', 'ندمت', 'تجربتي', 'قصة', 'secret', 'mistake', 'never', 'money', 'million', 'truth'];
const QWORDS = /^(ليش|ليه|لماذا|كيف|شلون|شنو|وش|ايش|إيش|هل|متى|مين|من|وين|أين|كم|تعرف|تدري|why|how|what|who|when|where|do|does|is|are|can)\b/iu;
const DIGIT = /[0-9٠-٩]|(?:^|\s)(?:و|ب)?(?:واحد|اثنين|ثنين|ثلاث\S*|أربع\S*|خمس\S*|ست\S*|سبع\S*|ثمان\S*|تسع\S*|عشر\S*|عشرين|مية|مئة|ألف|آلاف|مليون|ملايين|نص|ربع)(?=\s|[.,،؟?!]|$)/u;

/** First-pass score of one window: {score 0–100, why:[Arabic reasons]}. Hints only — Claude re-ranks by meaning. */
function scoreCandidate(c) {
  const text = String(c.text || ''), first = text.split(/\s+/).slice(0, 12).join(' '), secs = Number(c.seconds) || Math.max(0.1, (c.toSec || 0) - (c.fromSec || 0));
  const nw = Number(c.words) || text.split(/\s+/).filter(Boolean).length, pace = nw / secs;
  const why = []; let s = 30;
  if (QWORDS.test(first.trim()) || /[?؟]/.test(first)) { s += 18; why.push('يبدأ بسؤال'); }
  if (DIGIT.test(text)) { s += 10; why.push('فيه رقم'); }
  const pulls = PULL.filter((w) => text.includes(w));
  if (pulls.length) { s += Math.min(16, 8 * pulls.length); why.push('فيه كلمة تشد'); }
  if (pace >= 2.6) { s += 8; why.push('كلامه سريع وحماسي'); } else if (pace < 1.4) { s -= 8; why.push('كلام بطيء'); }
  if (/[.!?؟…]$/u.test(text.trim())) { s += 10; why.push('فكرة كاملة'); }
  if (secs >= 20 && secs <= 60) { s += 8; why.push('طول مناسب للريل'); } else if (secs < 12 || secs > 90) { s -= 10; why.push(secs < 12 ? 'قصير' : 'طويل'); }
  return { score: Math.max(0, Math.min(100, Math.round(s))), why };
}

/** The strongest n windows that do not overlap, in score order. */
function pickTop(cands, n) {
  const out = [];
  for (const c of [...cands].sort((a, b) => (b.score || 0) - (a.score || 0))) {
    if (out.length >= n) break;
    if (out.some((o) => c.fromSec < o.toSec && o.fromSec < c.toSec)) continue;
    out.push(c);
  }
  return out;
}

// ---- sections (download only what was picked) ------------------------------------------------------------------
/** Section to download for one approved clip, and the clip's words/segments moved to that section's clock. */
function sectionPlan(clip, words, pad = 1.5) {
  const segs = clip.segments || [[clip.fromSec, clip.toSec]];
  const lo = Math.min(...segs.map((x) => x[0]), clip.fromSec), hi = Math.max(...segs.map((x) => x[1]), clip.toSec);
  const from = Math.max(0, r3(lo - pad)), to = r3(hi + pad);
  const local = words.filter((w) => w.e > from && w.s < to).map((w) => ({ text: w.text, startMs: Math.round((w.s - from) * 1000), endMs: Math.round((w.e - from) * 1000) }));
  return { from, to, offset: from, section: `*${from}-${to}`, segments: segs.map(([a, b]) => [r3(a - from), r3(b - from)]), words: local };
}

function ytdlp() {
  for (const c of [process.env.IO_YTDLP, 'yt-dlp', 'yt-dlp.exe'].filter(Boolean)) { const r = spawnSync(c, ['--version'], { encoding: 'utf8' }); if (r.status === 0) return c; }
  const py = spawnSync('python3', ['-m', 'yt_dlp', '--version'], { encoding: 'utf8' }); if (py.status === 0) return ['python3', '-m', 'yt_dlp'];
  throw new Error('yt-dlp مو منصّب — node engine/doctor.js --install (أو pip install -U yt-dlp)');
}
function run(bin, args) { const [cmd, ...pre] = Array.isArray(bin) ? bin : [bin]; const r = spawnSync(cmd, [...pre, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); if (r.status !== 0) throw new Error((r.stderr || r.stdout || 'yt-dlp فشل').trim().split('\n').slice(-3).join(' · ')); return r.stdout; }
/** argv for the subtitle-only pass (exported for tests). */
function subsArgs(url, outBase, langs) { return ['--skip-download', '--write-subs', '--write-auto-subs', '--sub-format', 'vtt', '--sub-langs', langs, '--no-playlist', '-o', outBase + '.%(ext)s', url]; }
/** argv for one section (exported for tests). */
function sectionArgs(url, section, out) { return ['--download-sections', section, '--force-keyframes-at-cuts', '-f', 'bv*[height<=1080]+ba/b[height<=1080]/b', '--merge-output-format', 'mp4', '--no-playlist', '-o', out, url]; }

// ---- UI draft ------------------------------------------------------------------------------------------------------
const LANGS = ['none', 'ar', 'en', 'es', 'fr', 'tr', 'ur'];
/** Validate the picker page's draft → {ok, draft} | {ok:false, errors}. Only ids of known windows are accepted. */
function makeDraft(batch, j) {
  const errors = []; const byId = new Map((batch.candidates || []).map((c) => [c.id, c]));
  const ids = Array.isArray(j && j.ids) ? j.ids.map(String) : [];
  if (!ids.length) errors.push('اختار مقطع واحد على الأقل');
  const bad = ids.filter((i) => !byId.has(i)); if (bad.length) errors.push('مقاطع مو معروفة: ' + bad.join(', '));
  const count = [3, 5, 8, 10].includes(+j.count) ? +j.count : 5;
  const caption = LANGS.includes(j.caption) ? j.caption : 'ar', translate = LANGS.includes(j.translate) ? j.translate : 'none', dub = LANGS.includes(j.dub) ? j.dub : 'none';
  if (errors.length) return { ok: false, errors };
  const clips = ids.map((i) => byId.get(i)).sort((a, b) => a.fromSec - b.fromSec);
  for (let k = 1; k < clips.length; k++) if (clips[k].fromSec < clips[k - 1].toSec) return { ok: false, errors: [`${clips[k - 1].id} و${clips[k].id} متداخلين`] };
  return { ok: true, draft: { savedAt: new Date().toISOString(), count, caption, translate, dub, by: j.by === 'claude' ? 'claude' : 'creator',
    clips: clips.map((c, n) => ({ id: `clip-${n + 1}`, from: c.id, fromSec: c.fromSec, toSec: c.toSec, title: String(c.first || '').slice(0, 80) })) } };
}

// ---- API for web/podcast.html ------------------------------------------------------------------------------------
function batches(dir) {
  const root = dataFile(dir, 'podcast'); let ids = [];
  try { ids = fs.readdirSync(root).filter((d) => SLUG.test(d) && fs.existsSync(path.join(root, d, 'batch.json'))); } catch (e) { /* none */ }
  return ids.map((id) => { const b = readJson(path.join(root, id, 'batch.json'), {}); const src = readJson(path.join(root, id, 'source.json'), {});
    return { id, title: src.title || id, url: src.url || '', duration: src.duration || null, candidates: (b.candidates || []).length, approved: !!b.selectionApproved,
      draft: fs.existsSync(path.join(root, id, 'selections.draft.json')) }; });
}
function route(req, res, url, dir, h) {
  const p = url.pathname; if (!p.startsWith('/api/podcast')) return false;
  const root = dataFile(dir, 'podcast');
  if (p === '/api/podcast/list' && req.method === 'GET') return h.sendJson(res, 200, { batches: batches(dir) }), true;
  const id = url.searchParams.get('id') || '';
  if (!SLUG.test(id)) return h.sendJson(res, 400, { ok: false, errors: ['id غير صالح'] }), true;
  const bf = path.join(root, id, 'batch.json');
  if (!fs.existsSync(bf)) return h.sendJson(res, 404, { ok: false, errors: ['ما فيه دفعة بهالاسم'] }), true;
  const batch = readJson(bf, {});
  if (p === '/api/podcast' && req.method === 'GET') {
    return h.sendJson(res, 200, { id, source: readJson(path.join(root, id, 'source.json'), {}), approved: !!batch.selectionApproved,
      candidates: (batch.candidates || []).map((c) => ({ id: c.id, fromSec: c.fromSec, toSec: c.toSec, seconds: c.seconds, text: c.text, first: c.first, score: c.score == null ? null : c.score, why: c.why || [] })),
      draft: readJson(path.join(root, id, 'selections.draft.json'), null) }), true;
  }
  if (p === '/api/podcast/draft' && req.method === 'POST') {
    h.readBody(req, 64 * 1024).then((body) => {
      let j; try { j = JSON.parse(body); } catch (e) { return h.sendJson(res, 400, { ok: false, errors: ['بيانات غير صالحة'] }); }
      const r = makeDraft(batch, j); if (!r.ok) return h.sendJson(res, 400, r);
      writeJson(path.join(root, id, 'selections.draft.json'), r.draft);
      (h.log || console.log)(`🎙️ اختيار مقاطع البودكاست انحفظ: ${id} (${r.draft.clips.length} مقطع) — Claude يأكده معك ثم select`);
      h.sendJson(res, 200, { ok: true, draft: r.draft });
    }).catch((e) => h.sendJson(res, 413, { ok: false, errors: [e.message] }));
    return true;
  }
  return false;
}

// ---- CLI ---------------------------------------------------------------------------------------------------------
function args(argv) { const o = { _: [] }; for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (a.startsWith('--')) { const k = a.slice(2); o[k] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; } else o._.push(a); } return o; }
function main() {
  const o = args(process.argv.slice(2)), cmd = o._[0];
  try {
    if (cmd === 'subs') {
      const url = checkUrl(o._[1]); const id = String(o.id || slugFrom(url)); if (!SLUG.test(id)) throw new Error('--id slug إنقليزي صغير');
      const dir = dataFile(process.cwd(), 'podcast', id); fs.mkdirSync(dir, { recursive: true });
      const Y = ytdlp(); const meta = JSON.parse(run(Y, ['-J', '--no-playlist', url]));
      writeJson(path.join(dir, 'source.json'), { url, id: meta.id, title: meta.title, uploader: meta.uploader || meta.channel || '', duration: meta.duration || null, fetchedAt: new Date().toISOString() });
      const langs = String(o.langs || 'ar,ar-orig,en,en-orig');
      run(Y, subsArgs(url, path.join(dir, 'subs'), langs));
      const vtts = fs.readdirSync(dir).filter((f) => /^subs\..*\.vtt$/.test(f)).sort((a, b) => (/\.ar/.test(b) ? 1 : 0) - (/\.ar/.test(a) ? 1 : 0));
      if (!vtts.length) {
        if (o.audio) { run(Y, ['-f', 'ba', '-x', '--audio-format', 'm4a', '--no-playlist', '-o', path.join(dir, 'audio.%(ext)s'), url]); console.log(`🔈 ما فيه ترجمة — نزّلت الصوت بس: ${path.join(dir, 'audio.m4a')}\n   فرّغه: python3 skills/io-video-editor/scripts/18_long_transcribe.py ${path.join(dir, 'audio.m4a')} ${dir}`); return; }
        throw new Error('ما لقيت ترجمة بالمنصة — أعد بـ--audio (ينزّل الصوت بس للتفريغ)');
      }
      const words = parseVtt(fs.readFileSync(path.join(dir, vtts[0]), 'utf8'));
      writeJson(path.join(dir, 'words.json'), words);
      console.log(`✅ «${meta.title}» — ${words.length} كلمة من ${vtts[0]} (بلا تنزيل فيديو)\n   التالي: node engine/podcast-batch.js propose ${path.join(dir, 'words.json')} --dir ${dir}\n   ثم: node engine/podcast-link.js score ${path.join(dir, 'batch.json')}`);
      return;
    }
    if (cmd === 'score') {
      const bf = path.resolve(o._[1] || ''); const b = readJson(bf); const top = Math.max(1, Math.min(20, +o.top || 5));
      for (const c of b.candidates || []) Object.assign(c, scoreCandidate(c));
      b.candidates.sort((x, y) => y.score - x.score); b.scoredAt = new Date().toISOString();
      writeJson(bf, b);
      const best = pickTop(b.candidates, top), clock = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
      const md = ['# مقاطع البودكاست مرتّبة (درجة أولية — Claude يقرأ ويعيد الترتيب بالمعنى)', '', '| الدرجة | ID | من | إلى | ليش | أول الكلام |', '|---|---|---|---|---|---|',
        ...b.candidates.slice(0, 20).map((c) => `| ${c.score} | ${c.id} | ${clock(c.fromSec)} | ${clock(c.toSec)} | ${c.why.join(' · ')} | ${String(c.first).replace(/\|/g, '/')}… |`), '',
        `**أقوى ${best.length} بلا تداخل:** ${best.map((c) => c.id).join(' · ')}`, '', 'اختار من الصفحة: `node engine/serve.js --open podcast.html`'];
      fs.writeFileSync(path.join(path.dirname(bf), 'candidates.md'), md.join('\n') + '\n');
      console.log(`✅ ${b.candidates.length} نافذة مرتّبة — الأقوى: ${best.map((c) => `${c.id} (${c.score})`).join(' · ')}\n   ${path.join(path.dirname(bf), 'candidates.md')}`);
      return;
    }
    if (cmd === 'fetch') {
      const bf = path.resolve(o._[1] || ''); const b = readJson(bf); const src = readJson(path.join(path.dirname(bf), 'source.json'), {});
      if (!b.selectionApproved || !(b.clips || []).length) throw new Error('لسه ما فيه اختيار معتمد — podcast-batch select أول');
      const url = checkUrl(src.url); const Y = ytdlp(); const pad = Number(o.pad || 1.5);
      const words = require('./podcast-batch.js').normalizeWords(readJson(b.words));
      for (const c of b.clips) {
        const plan = sectionPlan(c, words, pad), out = path.join(c.work, 'source.mp4');
        if (!fs.existsSync(out)) run(Y, sectionArgs(url, plan.section, out));
        writeJson(path.join(c.work, 'words.json'), plan.words);
        writeJson(path.join(c.work, 'spec.json'), Object.assign(readJson(path.join(c.work, 'spec.json'), {}), { segments: plan.segments, offset: plan.offset, source: 'podcast-link' }));
        c.episode = out; c.wordsFile = path.join(c.work, 'words.json');
        console.log(`✅ ${c.id}: نزّلت ${plan.section.slice(1)} ث بس → ${out}`);
      }
      writeJson(bf, b);
      console.log('التالي لكل مقطع: python3 skills/io-video-editor/scripts/20_episode_cuts.py <مجلد المقطع> <مجلد المقطع>/source.mp4 <مجلد المقطع>/words.json');
      return;
    }
    throw new Error('الأوامر: subs · score · fetch');
  } catch (e) { console.error('❌ ' + e.message); process.exitCode = 1; }
}

module.exports = { parseVtt, scoreCandidate, pickTop, sectionPlan, subsArgs, sectionArgs, makeDraft, checkUrl, slugFrom, route, batches };
if (require.main === module) main();
