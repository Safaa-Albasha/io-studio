'use strict';
const test = require('node:test');
const assert = require('node:assert');
const TL = require('../skills/io-video-editor/studio/timeline-core.js');

const CUT = {
  keep: [[1.5, 8], [8.3, 23.35], [25.48, 32], [32.28, 47.46]],
  zooms: { '1.50': 1, '8.30': 1.08, '25.48': 1, '32.28': 1.06 },
  _zsrc: { '1.50': 8, '8.30': 23.35, '25.48': 32, '32.28': 47.46 },
};

test('out2src / src2out round-trip inside kept parts', () => {
  const k = CUT.keep;
  for (const t of [0, 3.2, 6.5, 10, 30, 40]) {
    const s = TL.out2src(t, k);
    assert.ok(Math.abs(TL.src2out(s, k).t - t) < 1e-6, String(t));
  }
});

test('src2out snaps a removed time to the next kept segment', () => {
  const r = TL.src2out(24, CUT.keep);
  assert.strictEqual(r.inside, false);
  assert.ok(Math.abs(r.t - (6.5 + 15.05)) < 1e-6);
});

test('src2out respects reordered keep', () => {
  const k = [[10, 12], [0, 5]];
  assert.strictEqual(TL.src2out(1, k).t, 3);
  assert.strictEqual(TL.out2src(3, k), 1);
});

test('segsFromCut reads zooms and inherits zoom for a split segment', () => {
  const segs = TL.segsFromCut({ ...CUT, keep: [[1.5, 8], [8.3, 15], [15, 23.35]] });
  assert.deepStrictEqual(segs.map((s) => s.z), [1, 1.08, 1.08]);
});

test('trim clamps to neighbours and snaps to word bounds', () => {
  const segs = TL.segsFromCut(CUT);
  let out = TL.trim(segs, 1, 'a', 2, 47.46);
  assert.strictEqual(out[1].a, 8); // can't overlap segment 1
  out = TL.trim(segs, 0, 'a', 1.93, 47.46, { cands: [1.96, 2.64], tol: 0.1 });
  assert.strictEqual(out[0].a, 1.96);
  out = TL.trim(segs, 0, 'b', 1.0, 47.46);
  assert.ok(out[0].b - out[0].a >= TL.MIN_SEG - 1e-9);
});

test('split, toggle (delete/restore) and move', () => {
  let segs = TL.segsFromCut(CUT);
  const r = TL.split(segs, 15);
  assert.strictEqual(r.index, 2);
  segs = r.segs;
  assert.deepStrictEqual(TL.keepOf(segs).slice(1, 3), [[8.3, 15], [15, 23.35]]);
  segs = TL.toggle(segs, 3);
  assert.strictEqual(TL.keepOf(segs).length, 4);
  const cp = TL.cutPatch(segs);
  assert.deepStrictEqual(cp._tl_removed, [[25.48, 32, 1]]);
  assert.strictEqual(cp.zooms['15.00'], 1.08);
  const back = TL.segsFromCut({ ...CUT, ...cp });
  assert.strictEqual(back.length, 5);
  assert.strictEqual(back[3].on, false);
  segs = TL.toggle(segs, 3);
  assert.strictEqual(TL.keepOf(segs).length, 5);
  const mv = TL.move(TL.keepOf(segs), 4, 0);
  assert.deepStrictEqual(mv[0], [32.28, 47.46]);
});

test('the last segment cannot be deleted', () => {
  const segs = TL.segsFromCut({ keep: [[0, 5]] });
  assert.strictEqual(TL.toggle(segs, 0)[0].on, true);
});

test('caption text keeps whisper word count', () => {
  assert.strictEqual(TL.fixToText(['ريل يوقف', '', 'السكرول']), 'ريل_يوقف ~ السكرول');
  const ok = TL.parseFixText('ريل_يوقف ~ السكرول', 3);
  assert.deepStrictEqual(ok.value, ['ريل يوقف', '', 'السكرول']);
  const bad = TL.parseFixText('ريل يوقف السكرول الحين', 3);
  assert.strictEqual(bad.ok, false);
  assert.match(bad.err, /4/);
  assert.strictEqual(TL.parseFixText('أي عدد كلمات هنا', 2, true).ok, true);
});

test('sfx markers round-trip through source time and follow a new cut', () => {
  const sfx = { outro: 4, whoosh_up: [0.2, 6.6], tap: [9.5], riser: [[12, 1.2]], lib: [[3, 'boom']] };
  const mk = TL.sfxToMarkers(sfx, CUT.keep);
  assert.strictEqual(mk.length, 5);
  const back = TL.markersToSfx(mk, CUT.keep, sfx);
  assert.deepStrictEqual(back, sfx);
  // delete the first segment: a marker at out 9.5 (src 9.5-6.5+8.3=11.3) moves to 11.3-8.3=3
  const nk = CUT.keep.slice(1);
  const moved = TL.markersToSfx(mk, nk, sfx);
  assert.strictEqual(moved.tap[0], 3);
});

test('plan only re-runs what changed', () => {
  const base = { keep: [[0, 1]], zooms: { '0.00': 1 }, fix: [['a']], sfx: { outro: 4, tap: [0.5] } };
  assert.deepStrictEqual(TL.plan(base, base).steps, []);
  assert.deepStrictEqual(TL.plan(base, { ...base, sfx: { outro: 4, tap: [0.6] } }).steps, ['sfx', 'encode']);
  assert.deepStrictEqual(TL.plan(base, { ...base, fix: [['b']] }).steps, ['captions', 'render', 'sfx', 'encode']);
  assert.deepStrictEqual(TL.plan(base, { ...base, keep: [[0, 0.8]] }).steps, ['captions', 'cut', 'frames', 'render', 'sfx', 'encode']);
});

test('libList accepts several catalog shapes', () => {
  assert.deepStrictEqual(TL.libList(null), []);
  assert.deepStrictEqual(TL.libList(['a']), [{ id: 'a', name: 'a' }]);
  assert.strictEqual(TL.libList({ sfx: [{ id: 'boom', name_ar: 'بوم' }] })[0].name, 'بوم');
  assert.strictEqual(TL.libList({ items: { x: { name: 'X' } } })[0].id, 'x');
});

test('history undo/redo', () => {
  const h = new TL.History();
  h.push({ n: 1 });
  assert.deepStrictEqual(h.undo({ n: 2 }), { n: 1 });
  assert.deepStrictEqual(h.redo({ n: 1 }), { n: 2 });
});

test('caption/audio edit requests for Claude\'s queue, with a chat fallback', () => {
  const Q = require('../engine/queue.js');
  const b = TL.editRequest({ target: 'caption', work: '/p/work/a', note: 'أقصر', sentence: { i: 2, a: 3.12345, b: 5 }, text: 'هلا بيكم' });
  assert.deepStrictEqual(b.segment, { index: 2, start: 3.123, end: 5, text: 'هلا بيكم' });
  assert.ok(Q.normalize(b).req, 'the server accepts it');
  const a = TL.editRequest({ target: 'audio', work: '/p/work/a', note: 'الصوت واطي', seg: { a: 1, b: 2.5 } });
  assert.deepStrictEqual(a.segment, { start: 1, end: 2.5 });
  assert.strictEqual(TL.editRequest({ target: 'x', work: 'w', note: 'n' }).target, 'general');
  const cmd = TL.chatCommand(b);
  assert.match(cmd, /^\/io:io-video-editor عدّل الكابشن بمجلد الشغل \/p\/work\/a/);
  assert.match(cmd, /الجملة 3/);
  assert.match(cmd, /أقصر/);
  assert.match(TL.chatCommand(a), /المقطع 00:01\.00 → 00:02\.50/);
  assert.deepStrictEqual(TL.pickServer([{ port: 4747, project: '/q' }, { port: 4749, project: '/p' }], '/p/work/a'), { port: 4749, project: '/p', inside: true });
  assert.strictEqual(TL.pickServer([{ port: 4750, project: '/q' }, { port: 4748, project: '/r' }], '/p/w').port, 4748);
  assert.strictEqual(TL.pickServer([], '/p'), null);
});
