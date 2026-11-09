'use strict';
// Logic ported from Reel Studio (MIT, © 2026 Mohamed Abdou): redaction, podcast batch, publish copy, smart cuts, stickers, CC0 ledger, style DNA.
// Adapted from its tests/podcast-batch.test.mjs, tests/publishing-preferences.test.mjs, tests/stickers.test.mjs and the redact/auto-cut unit tests.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const R = require('../engine/redact.js');
const PB = require('../engine/podcast-batch.js');
const PP = require('../engine/publish-pack.js');
const ST = require('../engine/stickers.js');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'io-rs-'));
const has = (cmd, args = ['-version']) => spawnSync(cmd, args).status === 0;

// ---- redaction ----
const VIDEO = { width: 1080, height: 1920, fps: 30 };
test('redact: rects are validated (fields, mode, window, size)', () => {
  assert.throws(() => R.validateRects([{ x: 0, y: 0, width: 100, height: 40, fromSec: 2, toSec: 1, mode: 'pixelize' }], VIDEO), /fromSec/);
  assert.throws(() => R.validateRects([{ x: 0, y: 0, width: 100, height: 40, fromSec: 0, toSec: 1, mode: 'erase' }], VIDEO), /mode/);
  assert.throws(() => R.validateRects([{ x: 0, y: 0, width: 100, height: 40, fromSec: 0, toSec: 1, mode: 'blur', colour: 1 }], VIDEO), /colour/);
  assert.throws(() => R.validateRects([{ x: 0, y: 0, width: 4, height: 4, fromSec: 0, toSec: 1, mode: 'blur' }], VIDEO), /8/);
  assert.throws(() => R.validateRects([], VIDEO), /rects/);
  const [r] = R.validateRects([{ x: 41, y: 211, width: 100, height: 40, fromSec: 1, toSec: 3, mode: 'pixelize' }], VIDEO);
  assert.deepStrictEqual(r.fixed, { x: 40, y: 210 }, 'snapped to even pixels');
});

test('redact: the filter overlays each region inside its window, and a moving region follows its keys', () => {
  const f = R.buildFilter([{ x: 40, y: 200, width: 600, height: 60, fromSec: 1, toSec: 4, mode: 'pixelize' },
    { x: 40, y: 900, width: 600, height: 60, fromSec: 0, toSec: 5, mode: 'blur', keys: [{ t: 5, x: 40, y: 1100 }] }], VIDEO);
  assert.match(f, /^\[0:v\]split=3/);
  assert.match(f, /pixelize=width=\d+/);
  assert.match(f, /boxblur=luma_radius=/);
  assert.match(f, /between\(t,0\.983333,4\.016667\)/);
  assert.match(f, /\[vout\]$/);
  const [, moving] = R.validateRects([{ x: 40, y: 200, width: 600, height: 60, fromSec: 1, toSec: 4, mode: 'pixelize' },
    { x: 40, y: 900, width: 600, height: 60, fromSec: 0, toSec: 5, mode: 'blur', keys: [{ t: 5, x: 40, y: 1100 }] }], VIDEO);
  assert.strictEqual(R.rectAt(moving, 2.5).y, 1000);
});

test('redact: verdict needs the detail destroyed; a flat source needs eyes', () => {
  assert.strictEqual(R.verdict(30, 3).verdict, 'REDACTED');
  assert.strictEqual(R.verdict(30, 20).verdict, 'NOT-REDACTED');
  assert.strictEqual(R.verdict(1, 1).verdict, 'NEEDS-REVIEW');
  assert.strictEqual(R.meanAbsGradient(Uint8Array.from([0, 255, 255, 0]), 2, 2), 255);
});

test('redact: end to end on a generated screen recording', { skip: !has('ffmpeg') }, () => {
  const d = tmp();
  const src = path.join(d, 'screen.mp4');
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'nullsrc=s=320x240:d=2:r=15,geq=lum=random(1)*255:cb=128:cr=128', '-pix_fmt', 'yuv420p', src]);
  fs.writeFileSync(path.join(d, 'rects.json'), JSON.stringify({ version: 1, rects: [{ x: 20, y: 20, width: 200, height: 100, fromSec: 0, toSec: 1.9, mode: 'pixelize', label: 'إيميل' }] }));
  const r = spawnSync(process.execPath, [path.join(ROOT, 'engine', 'redact.js'), 'apply', src, '--rects', path.join(d, 'rects.json')], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr + r.stdout);
  const side = JSON.parse(fs.readFileSync(path.join(d, 'screen.redacted.mp4.redaction.json'), 'utf8'));
  assert.strictEqual(side.status, 'REDACTED');
  assert.ok(fs.existsSync(src), 'the original stays');
});

// ---- podcast batch ----
const words = (list) => [{ start: 0, end: 0, text: '', words: list.map(([w, s, e]) => ({ w, s, e })) }];
test('podcast: candidates are literal windows bounded by pauses and the length limits', () => {
  const W = [];
  let t = 0;
  for (let i = 0; i < 40; i++) { W.push([`كلمة${i}`, t, t + 0.4]); t += 0.5; }
  t += 2; // a long pause
  for (let i = 0; i < 40; i++) { W.push([`ثانية${i}`, t, t + 0.4]); t += 0.5; }
  const c = PB.proposeCandidates(PB.normalizeWords(words(W)), { minSec: 10, maxSec: 30, gapSec: 1.2 });
  assert.strictEqual(c.length, 2);
  assert.strictEqual(c[0].fromSec, 0);
  assert.ok(c[1].fromSec > 20);
  assert.throws(() => PB.proposeCandidates([], { minSec: 10, maxSec: 700 }), /600/);
});

test('podcast: selections refuse partial words, overlaps and long hooks; a hook becomes the first segment', () => {
  const W = PB.normalizeWords(words(Array.from({ length: 60 }, (_, i) => [`ك${i}`, i, i + 0.8])));
  assert.throws(() => PB.validateSelections({ clips: [{ id: 'a', fromSec: 0.5, toSec: 10.8 }] }, W), /أول كلمة/);
  assert.throws(() => PB.validateSelections({ clips: [{ id: 'a', fromSec: 0, toSec: 10.3 }] }, W), /تقطع كلمة/);
  assert.throws(() => PB.validateSelections({ clips: [{ id: 'a', fromSec: 0, toSec: 10.8 }, { id: 'b', fromSec: 10, toSec: 20.8 }] }, W), /متداخلين/);
  assert.throws(() => PB.validateSelections({ clips: [{ id: 'A b', fromSec: 0, toSec: 10.8 }] }, W), /slug/);
  assert.throws(() => PB.validateSelections({ clips: [{ id: 'a', fromSec: 0, toSec: 10.8, hook: [30, 50.8] }] }, W), /15/);
  const [c] = PB.validateSelections({ clips: [{ id: 'a', fromSec: 0, toSec: 10.8, hook: [30, 34.8] }] }, W);
  assert.deepStrictEqual(c.segments, [[30, 34], [0, 10]], '20_episode_cuts takes [first word start, last word start]');
});

test('podcast: status names the next step and resumes from the files already made', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'spec.json'), '{}');
  assert.match(PB.clipStatus(d, 'ep.mp4', 'words.json').next, /20_episode_cuts\.py .* ep\.mp4 words\.json/);
  for (const f of ['a.json', 'caps.json', 'cutz.mp4']) fs.writeFileSync(path.join(d, f), '');
  const s = PB.clipStatus(d, 'ep.mp4');
  assert.strictEqual(s.done, 4);
  assert.match(s.next, /04_render_frames/);
  for (const f of ['ad-final.mp4', 'ad-master.mp4', 'ad-master-cover.mp4', 'publish.md']) fs.writeFileSync(path.join(d, f), '');
  assert.strictEqual(PB.clipStatus(d, 'ep.mp4').finished, true);
});

// ---- publish copy ----
const profile = { platforms: ['instagram', 'youtube', 'tiktok'], handles: ['@my.handle'], hashtags: 3, cta: null, writingStyle: null, numerals: 'western' };
const good = () => ({ title: 'ريل', cta: 'هوك',
  instagram: { caption: 'سطر أول\nاكتبوا «هوك» بالتعليقات', hashtags: ['#ريلز', '#محتوى'] },
  youtube: { title: 'شلون تسوي ريل؟', description: 'اكتب «هوك» بالتعليقات', hashtags: ['#شورتس'] },
  tiktok: { caption: 'گولولي «هوك» بالتعليقات', hashtags: ['#تيك_توك', '#محتوى', '#ريلز', '#نصائح'] } });
test('publish: a complete three-platform copy passes', () => {
  const r = PP.validateCopy(good(), profile);
  assert.deepStrictEqual(r.errors, []);
});
test('publish: missing platform, inline hashtags, missing CTA, foreign mention, short style, ad disclosure, too many tags', () => {
  const e = (mut, p = profile) => { const c = good(); mut(c); return PP.validateCopy(c, p).errors.join('\n'); };
  assert.match(e((c) => delete c.tiktok), /تيك توك: ناقص/);
  assert.match(e((c) => { c.instagram.caption += ' #ريلز'; }), /hashtags مو داخل النص/);
  assert.match(e((c) => { c.youtube.description = 'بلا كلمة'; }), /«هوك»/);
  assert.match(e((c) => { c.tiktok.caption += ' @someone'; }), /@someone/);
  assert.match(e((c) => { c.instagram.hashtags = ['#a1', '#b2', '#c3', '#d4']; }), /من 1 إلى 3/);
  assert.match(e((c) => { c.ad = true; }), /الإفصاح/);
  assert.match(e((c) => { c.instagram.caption = 'هوك ' + 'كلام '.repeat(120); }, { ...profile, writingStyle: 'short' }), /مختصر/);
  assert.match(e((c) => { c.youtube.title = 'ع'.repeat(101); }), /100/);
  assert.match(e((c) => { c.instagram.caption = `كﻻم «هوك»`; }), /أشكال العرض/);
});
test('publish: renders a Markdown pack in the three-platform order, saying nothing was posted', () => {
  const md = PP.renderPack(good(), profile, { video: 'x.mp4' });
  assert.ok(md.indexOf('## إنستقرام') < md.indexOf('## يوتيوب') && md.indexOf('## يوتيوب') < md.indexOf('## تيك توك'));
  assert.match(md, /ما انتشر شي/);
});
test('publish: comment keyword → DM adds a CTA per platform (YouTube → pinned comment), passes the checks and writes dm-reply.txt', () => {
  const c = PP.applyKeyword(good(), { keyword: 'دليل', dm: 'https://example.com/guide' });
  assert.strictEqual(c.cta, 'دليل');
  assert.match(c.instagram.caption, /اكتب «دليل» بالتعليقات ويوصلك الرابط بالخاص$/);
  assert.match(c.tiktok.caption, /ويوصلك الرابط بالخاص$/);
  assert.match(c.youtube.description, /اكتب «دليل» بالتعليقات والرابط بالتعليق المثبّت$/);
  assert.strictEqual(c.youtube.pinnedComment, 'الرابط: https://example.com/guide');
  assert.deepStrictEqual(PP.validateCopy(c, profile).errors, []);
  assert.strictEqual(PP.applyKeyword(c, { keyword: 'دليل', dm: 'https://example.com/guide' }).instagram.caption, c.instagram.caption, 'applying twice adds nothing');
  assert.strictEqual(PP.applyKeyword(good(), {}).cta, 'هوك', 'no keyword → unchanged');
  const txt = PP.dmReplyText(c, {}, profile);
  assert.match(txt, /هلا! هذا الرابط اللي طلبته: https:\/\/example\.com\/guide/);
  assert.match(txt, /إنستقرام/); assert.match(txt, /تيك توك/); assert.match(txt, /يوتيوب: ما فيه رسائل خاصة/);
  assert.match(PP.dmReplyText(PP.applyKeyword(good(), { keyword: 'خطة', dm: 'أرسل لك الخطة كاملة' }), {}, profile), /^-----\nأرسل لك الخطة كاملة\n-----$/m);
  assert.match(PP.renderPack(c, profile), /## كلمة التعليق ← الخاص/);
  const d = tmp(), f = path.join(d, 'copy.json');
  fs.writeFileSync(f, JSON.stringify(good()));
  const r = spawnSync(process.execPath, [path.join(ROOT, 'engine', 'publish-pack.js'), 'render', f, '--dir', d, '--keyword', 'دليل', '--dm', 'https://example.com/guide'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.ok(fs.existsSync(path.join(d, 'output', 'publish', 'ريل.dm-reply.txt')), r.stdout);
  assert.match(fs.readFileSync(path.join(d, 'output', 'publish', 'ريل.md'), 'utf8'), /بالتعليق المثبّت/);
});

// ---- smart cuts (python) ----
const py = spawnSync('python3', ['-c', 'import numpy'], { encoding: 'utf8' }).status === 0 ? 'python3' : null;
test('smart cuts: dialect fillers and repeats are suggested, the sign-off is protected, apply shifts cut/caps/sfx', { skip: !py }, () => {
  const d = tmp();
  const w = (t, s) => ({ t, s, e: s + 0.4, hot: false });
  fs.writeFileSync(path.join(d, 'caps.json'), JSON.stringify({ total: 6, cards: [
    { s: 0, e: 2.9, w: [w('هلا', 0), w('اممم', 0.5), w('اليوم', 1.0), w('انا', 1.5), w('انا', 2.0), w('راح', 2.5)] },
    { s: 3.5, e: 5.9, w: [w('يعني', 3.5), w('جربوها', 4.0), w('نشوفكم', 5.0), w('بالجاي', 5.5)] }] }));
  fs.writeFileSync(path.join(d, 'cut.json'), JSON.stringify({ keep: [[10, 16]], total: 6, tail: 0 }));
  fs.writeFileSync(path.join(d, 'sfx.json'), JSON.stringify({ thud: [1.2, 5.6], lib: [['pop_soft', 4.1]] }));
  const script = path.join(ROOT, 'skills', 'io-video-editor', 'scripts', '50_smart_cuts.py');
  const s = spawnSync(py, [script, d, 'suggest', '--signoff', 'نشوفكم بالجاي', '--dialect', 'iraqi'], { encoding: 'utf8' });
  assert.strictEqual(s.status, 0, s.stderr);
  const sc = JSON.parse(fs.readFileSync(path.join(d, 'smart_cuts.json'), 'utf8'));
  assert.deepStrictEqual(sc.rows.map((r) => [r.kind, r.text]), [['filler', 'اممم'], ['repeat', 'انا انا'], ['filler', 'يعني']]);
  assert.strictEqual(sc.signoffFrom, 5);
  const a = spawnSync(py, [script, d, 'apply', '1', '2'], { encoding: 'utf8' });
  assert.strictEqual(a.status, 0, a.stderr);
  const caps = JSON.parse(fs.readFileSync(path.join(d, 'caps.json'), 'utf8'));
  assert.deepStrictEqual(caps.cards[0].w.map((x) => x.t), ['هلا', 'اليوم', 'انا', 'راح']);
  const cut = JSON.parse(fs.readFileSync(path.join(d, 'cut.json'), 'utf8'));
  assert.ok(cut.keep.length === 3 && Math.abs(cut.total - caps.total) < 0.05, JSON.stringify(cut));
  const sfx = JSON.parse(fs.readFileSync(path.join(d, 'sfx.json'), 'utf8'));
  assert.ok(sfx.thud[1] < 5.6 && sfx.lib[0][1] < 4.1, 'later effects moved with the speech');
  assert.ok(fs.existsSync(path.join(d, 'caps.json.bak')), 'undo through 10_script_edit.py');
  // the old table is stale after a cut; a fresh suggest still protects the (moved) ending
  assert.notStrictEqual(spawnSync(py, [script, d, 'apply', '3', '--dry'], { encoding: 'utf8' }).status, 0, 'stale table refused');
  spawnSync(py, [script, d, 'suggest', '--signoff', 'نشوفكم بالجاي', '--dialect', 'iraqi'], { encoding: 'utf8' });
  const sc2 = JSON.parse(fs.readFileSync(path.join(d, 'smart_cuts.json'), 'utf8'));
  assert.ok(sc2.signoffFrom < 5, 'the ending moved with the cut and is still protected');
  sc2.rows.push({ id: 9, kind: 'filler', words: [[1, 2]], from: sc2.signoffFrom, to: sc2.signoffFrom + 0.4, text: 'نشوفكم', detail: '' });
  fs.writeFileSync(path.join(d, 'smart_cuts.json'), JSON.stringify(sc2));
  const bad = spawnSync(py, [script, d, 'apply', '9', '--dry'], { encoding: 'utf8' });
  assert.notStrictEqual(bad.status, 0);
  assert.match(bad.stderr + bad.stdout, /محمية/);
});

test('dialects: every filler group belongs to a known dialect', () => {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'library', 'dialects', 'dialects.json'), 'utf8'));
  const ids = new Set(d.dialects.map((x) => x.id));
  for (const k of Object.keys(d.fillers)) if (k !== 'note' && k !== 'common') assert.ok(ids.has(k), k);
  for (const k of Object.keys(d.fillers)) if (k !== 'note') for (const f of d.fillers[k]) assert.ok(Array.isArray(f.tokens) && f.tokens.length && typeof f.pause === 'boolean', `${k} ${JSON.stringify(f)}`);
});

// ---- stickers ----
test('stickers: every catalog file exists with its pinned size and sha256, Lottie files are playable, licences are shipped', () => {
  const crypto = require('crypto');
  const cat = ST.catalog();
  assert.ok(cat.stickers.length >= 50);
  let total = 0;
  for (const s of cat.stickers) {
    const f = path.join(ST.DIR, s.file);
    const buf = fs.readFileSync(f);
    total += buf.length;
    assert.strictEqual(buf.length, s.bytes, s.id);
    assert.strictEqual(crypto.createHash('sha256').update(buf).digest('hex'), s.sha256, s.id);
    assert.ok(cat.sources[s.source], s.id);
    if (s.kind === 'lottie') { const m = ST.checkLottie(JSON.parse(buf.toString('utf8')), s.id); assert.ok(m.frames > 0 && m.fps > 0); }
    else assert.match(buf.toString('utf8', 0, 400), /<svg/);
  }
  assert.ok(total < 15 * 1024 * 1024, `stickers are ${total} bytes`);
  for (const src of Object.values(cat.sources)) assert.ok(fs.existsSync(path.join(ST.DIR, src.notice)), src.notice);
  assert.match(fs.readFileSync(path.join(ST.DIR, 'licenses', 'NOTICE-noto-animated-emoji.md'), 'utf8'), /CC BY 4\.0/);
  assert.match(ST.LOTTIE.sha256, /^[0-9a-f]{64}$/);
  assert.strictEqual(ST.fileFrame(30, 60, 30, 90, false), 60);
  assert.strictEqual(ST.fileFrame(60, 60, 30, 90, true), 30);
  assert.strictEqual(ST.fileFrame(60, 60, 30, 90, false), 89);
});

// ---- style DNA (python) ----
test('style copy: a measured DNA maps onto our engine (capStyle, pace, moves family, style candidates) and --apply writes only those keys', { skip: !py }, () => {
  const d = tmp();
  const dna = { version: 1, status: 'draft', baseStyle: null, measured: { 'ref-a': {
    probe: { duration: 30 }, cuts: { shots: 18, shot_mean: 1.6, shot_median: 1.5, cuts_per_min: 34, first_cut: 0.9 }, motion: { mean: 11, p90: 20, level: 'high' },
    look: { luma: 120, contrast: 60, blacks_p5: 10, saturation: 0.5, warmth: 4, bw: false, palette: [['#FF2266', 0.3]], accent_guess: '#FF2266' },
    text: { lower: { density: 0.06, text_like_share: 0.8, changes_per_sec: 2.2 }, _guess: { band: 'lower' } }, audio: { present: true } } } };
  fs.writeFileSync(path.join(d, 'STYLE_DNA.json'), JSON.stringify(dna));
  fs.writeFileSync(path.join(d, 'theme.json'), JSON.stringify({ bg: '#FFF7EC', acc: '#E0663A', font: 'Cairo', pace: 'calm' }));
  const r = spawnSync(py, [path.join(ROOT, 'skills', 'io-style-copy', 'scripts', 'style_analyze.py'), 'map', path.join(d, 'STYLE_DNA.json'), '--work', d, '--apply'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = JSON.parse(fs.readFileSync(path.join(d, 'STYLE_DNA.json'), 'utf8'));
  assert.strictEqual(out.engine.moves.family, 'punch');
  assert.strictEqual(out.engine.theme.capStyle, 'big');
  assert.strictEqual(out.status, 'awaiting-review');
  assert.ok(out.engine.moves.style_candidates.length === 3);
  const th = JSON.parse(fs.readFileSync(path.join(d, 'theme.json'), 'utf8'));
  assert.deepStrictEqual(th, { bg: '#FFF7EC', acc: '#E0663A', font: 'Cairo', capStyle: 'big' }, 'colours and font untouched, calm pace removed for a punchy reference');
});

test('licences: Reel Studio MIT text is kept and NOTICE names it and the Remotion boundary', () => {
  assert.match(fs.readFileSync(path.join(ROOT, 'third_party', 'LICENSE.reel-studio'), 'utf8'), /Mohamed Abdou/);
  const n = fs.readFileSync(path.join(ROOT, 'third_party', 'NOTICE.md'), 'utf8');
  assert.match(n, /Reel Studio/);
  assert.match(n, /Remotion/);
  assert.match(n, /CC0/);
  assert.match(n, /CC BY 4\.0/);
});

test('new skill and agents have valid front matter and are routed from start', () => {
  const skill = fs.readFileSync(path.join(ROOT, 'skills', 'io-style-copy', 'SKILL.md'), 'utf8');
  assert.match(skill, /^---\nname: io-style-copy\ndescription: /);
  for (const a of ['io-production-manager', 'io-edit-analyst']) assert.match(fs.readFileSync(path.join(ROOT, 'agents', `${a}.md`), 'utf8'), new RegExp(`^---\\nname: ${a}\\ndescription: `));
  const start = fs.readFileSync(path.join(ROOT, 'skills', 'io-start', 'SKILL.md'), 'utf8');
  assert.match(start, /io-style-copy/);
  assert.match(start, /io-production-manager/);
});
