#!/usr/bin/env node
/*
 * I/O Studio — podcast batch clipping (حلقة وحدة ← دفعة ريلات).
 *
 * Adapted from Reel Studio (MIT, © 2026 Mohamed Abdou): scripts/lib/podcast-batch.mjs (proposePodcastCandidates,
 * validatePodcastSelections) and instructions/PODCAST.md. Changes: reads the words.json of
 * skills/io-video-editor/scripts/18_long_transcribe.py, writes one work folder per clip with the spec.json that
 * 20_episode_cuts.py takes, and a resumable `status` that names the next step of every clip (io-video-editor steps 5-11).
 *
 *   node engine/podcast-batch.js propose <words.json> --episode <episode.mp4> [--dir <batch dir>] [--min 15] [--max 90] [--gap 1.2]
 *        pause-bounded transcript windows → <dir>/batch.json + candidates.md. A map of clean edges — it does NOT judge
 *        which moments work: Claude reads the whole transcript, picks 3-5 self-contained moments and shows them first.
 *   node engine/podcast-batch.js select <batch.json> <selections.json> --approved-by "<name>"
 *        selections.json: {"clips":[{"id":"one-idea","fromSec":630.2,"toSec":661.8,"hook":[700.1,706.4],"title":"…"}]}
 *        checks bounds, overlaps, whole words and the 10-minute limit; writes <dir>/clips/<id>/spec.json for 20_episode_cuts.py
 *   node engine/podcast-batch.js status <batch.json>
 *        where every clip is and the next command; run it again after any stop — finished steps are kept.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const MAX_CLIP_SEC = 600;
const SLUG = /^[a-z0-9][a-z0-9-]{0,47}$/;
const r3 = (n) => Math.round(n * 1000) / 1000;
const clock = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(1).padStart(4, '0')}`;

/** words.json of 18_long_transcribe ([{start,end,text,words:[{w,s,e}]}]) or a flat [{text,startMs,endMs}] → [{text,s,e}] in seconds. */
function normalizeWords(raw) {
  const list = [];
  const arr = Array.isArray(raw) ? raw : raw && (raw.words || raw.segments);
  if (!Array.isArray(arr)) throw new Error('words.json لازم قائمة جمل فيها words، أو قائمة كلمات');
  for (const seg of arr) {
    if (seg && Array.isArray(seg.words)) {
      for (const w of seg.words) {
        const text = String(w.w !== undefined ? w.w : w.word !== undefined ? w.word : w.text || '').trim();
        const s = Number(w.s !== undefined ? w.s : w.start), e = Number(w.e !== undefined ? w.e : w.end);
        if (text && Number.isFinite(s) && Number.isFinite(e) && e > s) list.push({ text, s, e });
      }
    } else if (seg && typeof seg.text === 'string' && Number.isFinite(seg.startMs)) {
      if (seg.text.trim() && seg.endMs > seg.startMs) list.push({ text: seg.text.trim(), s: seg.startMs / 1000, e: seg.endMs / 1000 });
    }
  }
  if (!list.length) throw new Error('ما فيه كلمات بتوقيت بالملف');
  list.sort((a, b) => a.s - b.s);
  return list;
}

/** Literal transcript windows bounded by pauses, sentence ends or the max length (Reel Studio's transcript-boundaries-v1). */
function proposeCandidates(words, { durationSec = Infinity, minSec = 15, maxSec = 90, gapSec = 1.2 } = {}) {
  if (!(minSec > 0) || !(maxSec >= minSec) || maxSec > MAX_CLIP_SEC) throw new Error(`المدى غلط: ${minSec}-${maxSec} ث (الحد ${MAX_CLIP_SEC})`);
  const out = [];
  let start = 0;
  while (start < words.length) {
    let end = start;
    while (end + 1 < words.length) {
      const span = words[end].e - words[start].s;
      const gap = words[end + 1].s - words[end].e;
      const nextSpan = words[end + 1].e - words[start].s;
      if (gap >= gapSec || nextSpan > maxSec || (span >= minSec && /[.!?؟؛…]$/u.test(words[end].text))) break;
      end++;
    }
    const fromSec = r3(words[start].s), toSec = r3(Math.min(durationSec, words[end].e));
    if (toSec - fromSec >= minSec && toSec - fromSec <= maxSec + 1e-6) {
      out.push({ id: `c${out.length + 1}`, fromSec, toSec, seconds: r3(toSec - fromSec), words: end - start + 1,
        first: words.slice(start, Math.min(end + 1, start + 14)).map((w) => w.text).join(' '),
        text: words.slice(start, end + 1).map((w) => w.text).join(' '),
        reason: end + 1 === words.length ? 'نهاية الكلام' : 'سكتة أو نهاية جملة أو حد الطول' });
    }
    start = end + 1;
  }
  return out;
}

const near = (words, t, key) => words.reduce((best, w, i) => (Math.abs(w[key] - t) < Math.abs(words[best][key] - t) ? i : best), 0);

/** Check the approved clips against the transcript; returns clips with word indices and the 20_episode_cuts segments. */
function validateSelections(raw, words, { durationSec = Infinity, tolerance = 0.12 } = {}) {
  const clips = raw && raw.clips;
  if (!Array.isArray(clips) || !clips.length) throw new Error('selections.json لازم فيه clips');
  const seen = new Set();
  const out = clips.map((c, n) => {
    const at = `clips[${n}]`;
    if (!c || !SLUG.test(String(c.id || ''))) throw new Error(`${at}.id لازم slug إنقليزي صغير (one-idea)`);
    if (seen.has(c.id)) throw new Error(`${at}.id مكرر: ${c.id}`);
    seen.add(c.id);
    const from = Number(c.fromSec), to = Number(c.toSec);
    if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to <= from) throw new Error(`${at}: fromSec < toSec`);
    if (to > durationSec + 0.05) throw new Error(`${at}: ينتهي بعد الحلقة (${r3(durationSec)} ث)`);
    if (to - from > MAX_CLIP_SEC) throw new Error(`${at}: أطول من ${MAX_CLIP_SEC / 60} دقائق`);
    const i0 = near(words, from, 's'), i1 = near(words, to, 'e');
    if (Math.abs(words[i0].s - from) > tolerance) throw new Error(`${at}: البداية ${from} مو على أول كلمة — الأقرب «${words[i0].text}» عند ${r3(words[i0].s)}`);
    if (Math.abs(words[i1].e - to) > tolerance) throw new Error(`${at}: النهاية ${to} تقطع كلمة — الأقرب «${words[i1].text}» تخلص عند ${r3(words[i1].e)}`);
    const clip = { id: c.id, title: c.title || '', fromSec: r3(words[i0].s), toSec: r3(words[i1].e), firstWord: words[i0].text, lastWord: words[i1].text,
      segments: [[r3(words[i0].s), r3(words[i1].s)]] };
    if (c.hook !== undefined) {
      if (!Array.isArray(c.hook) || c.hook.length !== 2) throw new Error(`${at}.hook = [من, إلى]`);
      const h0 = near(words, Number(c.hook[0]), 's'), h1 = near(words, Number(c.hook[1]), 'e');
      if (words[h1].e - words[h0].s > 15) throw new Error(`${at}.hook أطول من 15 ث — الهوك 3-12 ث`);
      clip.hook = [r3(words[h0].s), r3(words[h1].e)];
      clip.segments.unshift([r3(words[h0].s), r3(words[h1].s)]);
    }
    return clip;
  });
  const sorted = [...out].sort((a, b) => a.fromSec - b.fromSec);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].fromSec < sorted[i - 1].toSec) throw new Error(`المقطعين ${sorted[i - 1].id} و${sorted[i].id} متداخلين — كل مقطع فكرة مستقلة`);
  }
  return out;
}

// ---- status ---------------------------------------------------------------------------------------------------

const STAGES = [
  ['spec.json', 'اختيار معتمد', (d, ep, w) => `python3 scripts/20_episode_cuts.py ${d} ${ep} ${w || '<words.json>'}`],
  ['a.json', 'تفريغ المقطع', (d) => `صحّح ${d}/fixes.json ثم python3 scripts/02_captions.py ${d}`],
  ['caps.json', 'كابشن مصحّح', (d) => `python3 scripts/22_hook.py suggest ${d}  (هوك مكتوب إلزامي) ← python3 scripts/03_cut_zoom.py ${d}`],
  ['cutz.mp4', 'مقصوص بالطول', (d) => `صمّم المشاهد ← node scripts/04_render_frames.js ${d} all`],
  ['ad-final.mp4', 'مرسوم', (d) => `bash scripts/06b_master.sh ${d} ${d}/ad-final.mp4 ${d}/ad-master.mp4 ← python3 scripts/19_seam_check.py ${d}`],
  ['ad-master.mp4', 'صوت معاير', (d) => `python3 scripts/28_cover.py ${d} "…" --first ${d}/ad-master.mp4 ← node engine/arabic-qa.js ${d}`],
  ['ad-master-cover.mp4', 'بالكفر', (d) => `حزمة نشر للمقطع: سكل io-publish-kit ← node engine/publish-pack.js check ${d}/publish.json`],
  ['publish.md', 'وصف النشر', () => 'سلّم بعد ما يسمعه صانع المحتوى بالصوت ويوافق'],
];

function clipStatus(dir, episode, words) {
  let done = -1;
  for (let i = 0; i < STAGES.length; i++) if (fs.existsSync(path.join(dir, STAGES[i][0]))) done = i;
  const finished = done === STAGES.length - 1;
  // the command of stage i is what turns its artifact into the next one
  const next = finished ? null : done < 0 ? 'node engine/podcast-batch.js select <batch.json> <selections.json> --approved-by "<الاسم>"' : STAGES[done][2](dir, episode, words);
  return { stage: done >= 0 ? STAGES[done][1] : 'ما بدأ', done: done + 1, of: STAGES.length, next, finished };
}

function readJson(f) { return JSON.parse(fs.readFileSync(f, 'utf8')); }
function writeJson(f, d) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(d, null, 2)); }

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; o[k] = v; } else o._.push(a);
  }
  return o;
}

function main() {
  const o = args(process.argv.slice(2));
  const cmd = o._[0];
  try {
    if (cmd === 'propose') {
      const wordsFile = path.resolve(o._[1] || '');
      if (!fs.existsSync(wordsFile)) throw new Error('حدّد words.json (من 18_long_transcribe.py)');
      const words = normalizeWords(readJson(wordsFile));
      const dir = path.resolve(o.dir || path.dirname(wordsFile));
      const cands = proposeCandidates(words, { minSec: Number(o.min || 15), maxSec: Number(o.max || 90), gapSec: Number(o.gap || 1.2) });
      const batch = { version: 1, tool: 'io podcast-batch (adapted from Reel Studio, MIT)', episode: o.episode ? path.resolve(o.episode) : null, words: wordsFile,
        createdAt: new Date().toISOString(), selectionApproved: false, candidates: cands, clips: [],
        notice: 'النوافذ خريطة حدود نظيفة من التفريغ، مو تقييم للفكرة. اقرأ التفريغ كامل واختار 3-5 لحظات مستقلة (سؤال وجوابه، قصة بنهايتها، فكرة وحدة)، واعرضها أول.' };
      writeJson(path.join(dir, 'batch.json'), batch);
      const md = ['# مقترحات مقاطع — نوافذ بين السكتات', '', batch.notice, '', '| ID | من | إلى | المدة | أول الكلام |', '|---|---|---|---|---|',
        ...cands.map((c) => `| ${c.id} | ${clock(c.fromSec)} | ${clock(c.toSec)} | ${c.seconds.toFixed(0)} ث | ${c.first.replace(/\|/g, '/')}… |`)];
      fs.writeFileSync(path.join(dir, 'candidates.md'), md.join('\n') + '\n');
      console.log(`✅ ${cands.length} نافذة من ${words.length} كلمة → ${path.join(dir, 'candidates.md')}\n   batch: ${path.join(dir, 'batch.json')}`);
      return;
    }
    if (cmd === 'select') {
      const batchFile = path.resolve(o._[1] || ''), selFile = path.resolve(o._[2] || '');
      if (!fs.existsSync(batchFile) || !fs.existsSync(selFile)) throw new Error('الاستخدام: select <batch.json> <selections.json> --approved-by "<الاسم>"');
      if (typeof o['approved-by'] !== 'string' || !o['approved-by'].trim() || /^(creator|user)$/i.test(o['approved-by'])) throw new Error('--approved-by باسم صانع المحتوى الحقيقي (بعد موافقته)');
      const batch = readJson(batchFile);
      const words = normalizeWords(readJson(batch.words));
      const clips = validateSelections(readJson(selFile), words);
      const dir = path.dirname(batchFile);
      for (const c of clips) {
        const work = path.join(dir, 'clips', c.id);
        const spec = path.join(work, 'spec.json');
        if (fs.existsSync(spec) && JSON.stringify(readJson(spec).segments) !== JSON.stringify(c.segments)) {
          throw new Error(`${c.id}: spec.json موجود بحدود ثانية — ما أكتب فوقه. غيّر الـid أو احذفه بموافقته.`);
        }
        writeJson(spec, { segments: c.segments, title: c.title, source: 'podcast-batch' });
        c.work = work;
      }
      batch.clips = clips; batch.selectionApproved = true; batch.approvedBy = o['approved-by'].trim(); batch.approvedAt = new Date().toISOString();
      writeJson(batchFile, batch);
      for (const c of clips) console.log(`✅ ${c.id}: ${clock(c.fromSec)}–${clock(c.toSec)} «${c.firstWord} … ${c.lastWord}»${c.hook ? ' + هوك' : ''} → ${c.work}/spec.json`);
      console.log(`التالي لكل مقطع: python3 scripts/20_episode_cuts.py <مجلد المقطع> ${batch.episode || '<الحلقة>'} ${batch.words}`);
      return;
    }
    if (cmd === 'status') {
      const batchFile = path.resolve(o._[1] || '');
      if (!fs.existsSync(batchFile)) throw new Error('حدّد batch.json');
      const batch = readJson(batchFile);
      if (!batch.selectionApproved || !batch.clips.length) { console.log('لسه ما فيه اختيار معتمد — اعرض المقترحات وخلّه يختار، ثم select.'); return; }
      let finished = 0;
      for (const c of batch.clips) {
        const s = clipStatus(c.work, c.episode || batch.episode || '<الحلقة>', c.wordsFile || batch.words);   // c.episode/c.wordsFile: مقطع نزل لحاله (podcast-link.js fetch)
        if (s.finished) finished++;
        console.log(`${s.finished ? '✅' : '⏳'} ${c.id} (${clock(c.fromSec)}–${clock(c.toSec)}) — ${s.stage} [${s.done}/${s.of}]${s.next ? `\n     التالي: ${s.next}` : ''}`);
      }
      console.log(`${finished}/${batch.clips.length} جاهز. صدّر واحد واحد بالترتيب (رسم واحد بكل مرة).`);
      return;
    }
    throw new Error('الأوامر: propose · select · status');
  } catch (e) { console.error('❌ ' + e.message); process.exitCode = 1; }
}

module.exports = { normalizeWords, proposeCandidates, validateSelections, clipStatus, STAGES, MAX_CLIP_SEC };
if (require.main === module) main();
