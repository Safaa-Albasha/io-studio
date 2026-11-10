'use strict';
// engine/podcast-link.js — transcript first, rank, pick, download only the picked sections; web/podcast.html wiring.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const L = require('../engine/podcast-link.js');
const B = require('../engine/podcast-batch.js');

const VTT = `WEBVTT

00:00:00.000 --> 00:00:01.500
ليش<00:00:00.400><c> الناس</c><00:00:00.800><c> تفشل؟</c>

00:00:01.500 --> 00:00:03.000
ليش الناس تفشل؟
السبب<00:00:02.000><c> بسيط.</c>

00:00:03.200 --> 00:00:04.000
كلام بدون توقيت
`;

test('parseVtt keeps only new words, uses word stamps, feeds podcast-batch', () => {
  const w = L.parseVtt(VTT);
  assert.deepStrictEqual(w.map((x) => x.text), ['ليش', 'الناس', 'تفشل؟', 'السبب', 'بسيط.', 'كلام', 'بدون', 'توقيت']);
  assert.strictEqual(w[1].startMs, 400); assert.strictEqual(w[3].startMs, 1500); assert.ok(w.every((x) => x.endMs > x.startMs));
  const norm = B.normalizeWords(w); assert.strictEqual(norm.length, 8); assert.ok(Math.abs(norm[4].s - 2) < 1e-9);
});

test('scoreCandidate gives reasons; pickTop never overlaps', () => {
  const a = L.scoreCandidate({ text: 'ليش خسرت عشرة آلاف ريال في أول مشروع؟ السبب إني بديت بالأداة.', fromSec: 0, toSec: 30, seconds: 30, words: 12 });
  assert.ok(a.score > 60, String(a.score)); for (const r of ['يبدأ بسؤال', 'فيه رقم', 'فيه كلمة تشد', 'فكرة كاملة']) assert.ok(a.why.includes(r), r);
  const b = L.scoreCandidate({ text: 'و', fromSec: 0, toSec: 5, seconds: 5, words: 1 }); assert.ok(b.score < a.score);
  const picks = L.pickTop([{ id: 'a', fromSec: 0, toSec: 30, score: 90 }, { id: 'b', fromSec: 10, toSec: 40, score: 80 }, { id: 'c', fromSec: 40, toSec: 60, score: 70 }], 3);
  assert.deepStrictEqual(picks.map((c) => c.id), ['a', 'c']);
});

test('sectionPlan moves words and segments to the downloaded section; yt-dlp argv is a list (no shell)', () => {
  const words = [{ text: 'قبل', s: 95, e: 96 }, { text: 'أول', s: 100, e: 100.5 }, { text: 'آخر', s: 129, e: 130 }, { text: 'بعد', s: 140, e: 141 }];
  const p = L.sectionPlan({ fromSec: 100, toSec: 130, segments: [[100, 129]] }, words, 1.5);
  assert.strictEqual(p.section, '*98.5-131.5'); assert.deepStrictEqual(p.segments, [[1.5, 30.5]]);
  assert.deepStrictEqual(p.words.map((w) => w.text), ['أول', 'آخر']); assert.strictEqual(p.words[0].startMs, 1500);
  const a = L.sectionArgs('https://youtu.be/x', p.section, '/tmp/o.mp4'); assert.ok(a.includes('--download-sections') && a.includes('*98.5-131.5') && a[a.length - 1] === 'https://youtu.be/x');
  const s = L.subsArgs('https://youtu.be/x', '/tmp/subs', 'ar,en'); assert.ok(s.includes('--skip-download') && s.includes('--write-auto-subs'));
  assert.throws(() => L.checkUrl('file:///etc/passwd')); assert.throws(() => L.checkUrl('not a url')); assert.strictEqual(L.checkUrl(' https://x.com/a '), 'https://x.com/a');
  assert.strictEqual(L.slugFrom('https://www.youtube.com/watch?v=AbC_12'), 'abc-12');
});

test('picker draft: known ids only, no overlaps, safe defaults', () => {
  const batch = { candidates: [{ id: 'c1', fromSec: 0, toSec: 20, first: 'أ' }, { id: 'c2', fromSec: 10, toSec: 30, first: 'ب' }, { id: 'c3', fromSec: 40, toSec: 60, first: 'ج' }] };
  assert.strictEqual(L.makeDraft(batch, { ids: [] }).ok, false);
  assert.strictEqual(L.makeDraft(batch, { ids: ['zz'] }).ok, false);
  assert.strictEqual(L.makeDraft(batch, { ids: ['c1', 'c2'] }).ok, false);
  const r = L.makeDraft(batch, { ids: ['c3', 'c1'], count: 99, caption: 'xx', translate: 'en' });
  assert.ok(r.ok); assert.strictEqual(r.draft.count, 5); assert.strictEqual(r.draft.caption, 'ar'); assert.strictEqual(r.draft.translate, 'en');
  assert.deepStrictEqual(r.draft.clips.map((c) => c.from), ['c1', 'c3']); assert.match(r.draft.clips[0].id, /^clip-1$/);
});

test('API lists project batches and saves a draft; rejects bad ids', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'io-pod-')), bd = path.join(dir, '.io', 'podcast', 'demo');
  fs.mkdirSync(bd, { recursive: true });
  fs.writeFileSync(path.join(bd, 'batch.json'), JSON.stringify({ candidates: [{ id: 'c1', fromSec: 0, toSec: 20, text: 'نص', first: 'نص', score: 70, why: ['فكرة كاملة'] }] }));
  fs.writeFileSync(path.join(bd, 'source.json'), JSON.stringify({ title: 'حلقة', url: 'https://youtu.be/x' }));
  const call = (method, u, body) => new Promise((resolve) => {
    const res = {}; const h = { sendJson: (_r, code, j) => resolve({ code, j }), readBody: () => Promise.resolve(body || ''), log: () => {} };
    const handled = L.route({ method }, res, new URL('http://localhost' + u), dir, h); if (!handled) resolve({ code: 0 });
  });
  const list = await call('GET', '/api/podcast/list'); assert.strictEqual(list.j.batches[0].title, 'حلقة');
  const one = await call('GET', '/api/podcast?id=demo'); assert.strictEqual(one.j.candidates[0].score, 70);
  assert.strictEqual((await call('GET', '/api/podcast?id=../etc')).code, 400);
  const saved = await call('POST', '/api/podcast/draft?id=demo', JSON.stringify({ ids: ['c1'], count: 3 }));
  assert.strictEqual(saved.code, 200); assert.ok(fs.existsSync(path.join(bd, 'selections.draft.json')));
  const pg = fs.readFileSync(path.join(__dirname, '..', 'web', 'podcast.html'), 'utf8');
  assert.match(pg, /\/api\/podcast\/draft/); assert.doesNotMatch(pg, /innerHTML/); assert.match(pg, /<title>[^<]+<\/title>/);
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'engine', 'app-api.js'), 'utf8'), /podcast-link\.js'\)\.route/);
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'skills', 'io-podcast-video', 'SKILL.md'), 'utf8'), /podcast-link\.js" subs/);
});
