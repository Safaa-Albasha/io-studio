'use strict';
const test = require('node:test');
const assert = require('node:assert');
const C = require('../engine/cut-core.js');

test('parseSilences reads ffmpeg output, including a trailing open silence', () => {
  const err = '[silencedetect @ 0x1] silence_start: 1.5\n[silencedetect @ 0x1] silence_end: 2.7 | silence_duration: 1.2\n[silencedetect @ 0x1] silence_start: 9.1\n';
  assert.deepStrictEqual(C.parseSilences(err, 10), [{ start: 1.5, end: 2.7 }, { start: 9.1, end: 10 }]);
});

test('keepSegments pads, merges close parts and drops blips', () => {
  const sil = [{ start: 1, end: 2 }, { start: 2.3, end: 4 }, { start: 4.1, end: 6 }];
  const k = C.keepSegments(sil, 8, { pad: 0.1, join: 0.25, minKeep: 0.3 });
  // 0–1 kept, 2–2.3 (0.3+pad) kept, 4–4.1 merges? 4.0-0.1=3.9..4.2 → too close to nothing, length 0.3 kept; 6–8 kept
  assert.deepStrictEqual(k[0], { start: 0, end: 1.1 });
  assert.deepStrictEqual(k[k.length - 1], { start: 5.9, end: 8 });
  assert.ok(C.totalOf(k) < 8);
});

test('keepSegments with no silence keeps everything', () => {
  assert.deepStrictEqual(C.keepSegments([], 5), [{ start: 0, end: 5 }]);
});

test('concatFilter builds one trim per segment', () => {
  const f = C.concatFilter([{ start: 0, end: 1 }, { start: 2, end: 3 }], true);
  assert.match(f, /concat=n=2:v=1:a=1\[v\]\[a\]$/);
  assert.strictEqual((f.match(/atrim/g) || []).length, 2);
  assert.match(C.concatFilter([{ start: 0, end: 1 }], false), /concat=n=1:v=1:a=0\[v\]$/);
});

test('vertical filter: pass-through, crop, or blurred fill', () => {
  assert.match(C.verticalFilter(1080, 1920), /^scale=1080:1920/);
  assert.match(C.verticalFilter(1920, 1080, 'crop'), /crop=1080:1920/);
  assert.match(C.verticalFilter(1920, 1080, 'blur'), /boxblur/);
});

test('srt timing and word grouping', () => {
  assert.strictEqual(C.srtTime(3723.456), '01:02:03,456');
  const words = [{ word: 'هلا', start: 0, end: 0.4 }, { word: 'بيكم', start: 0.4, end: 0.9 }, { word: 'اليوم', start: 2, end: 2.4 }];
  const srt = C.wordsToSrt(words, { maxWords: 4 });
  assert.strictEqual(srt.split('-->').length - 1, 2); // gap > 0.6s starts a new cue
});

test('mapTime moves timings through a cut', () => {
  const segs = [{ start: 0, end: 2 }, { start: 5, end: 7 }];
  assert.strictEqual(C.mapTime(1, segs), 1);
  assert.strictEqual(C.mapTime(6, segs), 3);
  assert.strictEqual(C.mapTime(3, segs), 2);
});

test('cinematic finish: LUT + subtle grain + 2.39 bars on 16:9, loudness −14 (args only, no ffmpeg)', () => {
  const V = require('../engine/video.js');
  const G = require('../engine/grade.js');
  const cat = G.loadCatalog();
  for (const id of V.CINEMATIC_LOOKS) assert.ok(G.getLook(cat, id), id);
  const look = G.getLook(cat, 'teal_orange_soft');
  const p = V.cinematicPlan({ input: '/in.mp4', out: '/out.mp4', w: 1920, h: 1080, hasAudio: true, look, catalog: cat });
  assert.match(p.graph, /^\[0:v\]lut3d=file=look\.cube:interp=tetrahedral\[c1\]/);
  assert.match(p.graph, /noise=alls=6:allf=t/);
  assert.match(p.graph, /drawbox=.*iw\/2\.39/);
  assert.match(p.graph, /format=yuv420p\[vout\]$/);
  assert.deepStrictEqual(p.steps, ['lut:teal_orange_soft', 'grain:6', 'letterbox:2.39', 'loudnorm:-14']);
  const i = p.args.indexOf('-af');
  assert.strictEqual(p.args[i + 1], 'loudnorm=I=-14:TP=-1.5:LRA=11');
  assert.deepStrictEqual(p.args.slice(p.args.indexOf('-map'), p.args.indexOf('-map') + 4), ['-map', '[vout]', '-map', '0:a?']);
  assert.strictEqual(p.args[p.args.length - 1], '/out.mp4');
  assert.ok(p.args.includes('-filter_complex_script'));
  // vertical: no bars unless forced; options turn pieces off
  assert.doesNotMatch(V.cinematicPlan({ input: 'a', out: 'b', w: 1080, h: 1920, look, catalog: cat }).graph, /drawbox/);
  assert.match(V.cinematicPlan({ input: 'a', out: 'b', w: 1080, h: 1920, look, catalog: cat, letterbox: 'force' }).graph, /drawbox/);
  const bare = V.cinematicPlan({ input: 'a', out: 'b', w: 1920, h: 1080, look: null, catalog: cat, grain: 0, letterbox: 'off', hasAudio: false });
  assert.strictEqual(bare.graph, '[0:v]format=yuv420p[vout]');
  assert.ok(!bare.args.includes('-af'));
  // a look that already has grain / bars is not doubled
  const scope = V.cinematicPlan({ input: 'a', out: 'b', w: 1920, h: 1080, look: G.getLook(cat, 'cinema_scope'), catalog: cat });
  assert.strictEqual((scope.graph.match(/drawbox=x=0:y=0/g) || []).length, 1);
  // already wider than 2.39 → no bars
  assert.doesNotMatch(V.cinematicPlan({ input: 'a', out: 'b', w: 2560, h: 1000, look, catalog: cat }).graph, /drawbox/);
});
