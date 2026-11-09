'use strict';
// Tracking → render path: track-map.js (clock out/src, video px → 1080×1920, hold 0.2 s then fade), and the wiring in 04/08/compose/moves-compose.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');

const SC = path.join(__dirname, '..', 'skills', 'io-video-editor', 'scripts');
const TM = require(path.join(SC, 'track-map.js'));
const near = (a, b, e = 0.01) => assert.ok(Math.abs(a - b) < e, `${a} ≈ ${b}`);

test('TrackMap: clock out — video px map to the canvas with the cover framing (1080×1920 video = identity)', () => {
  const tr = { type: 'plane', fps: 2, size: [1080, 1920], clock: 'out', frames: [{ t: 1, quad: [[100, 200], [300, 200], [300, 400], [100, 400]], conf: 1 }, { t: 2, quad: [[200, 200], [400, 200], [400, 400], [200, 400]], conf: 1 }] };
  const p = TM.prepare(tr);
  const s = TM.at(p, 1.5);
  near(s.quad[0][0], 150); near(s.center[1], 300); assert.strictEqual(s.alpha, 1); assert.ok(s.inside);
  assert.deepStrictEqual(TM.forFX(p).frames.length, 2);
});

test('TrackMap: a landscape track is scaled into the 9:16 cover frame', () => {
  const tr = { type: 'box', fps: 30, size: [1920, 1080], clock: 'out', frames: [{ t: 0, box: [960, 540, 0, 0] }] };
  const s = TM.at(TM.prepare(tr), 0);
  near(s.center[0], 540, 0.5);   // horizontal centre stays the centre
  near(s.center[1], 960, 0.5);   // vertical: full height covers 1920
});

test('TrackMap: clock src — times follow the cut list, dropped parts vanish', () => {
  const keep = [[0, 2], [5, 8]];   // src 5..8 → out 2..5
  const tr = { type: 'point', fps: 10, size: [1080, 1920], clock: 'src', frames: [{ t: 3, points: { p: [1, 1] } }, { t: 6, points: { p: [500, 600] } }, { t: 7, points: { p: [600, 600] } }] };
  const p = TM.prepare(tr, { keep });
  assert.deepStrictEqual(p.frames.map((f) => f.t), [3, 4]);   // src 3 is cut out
  near(TM.at(p, 3).center[0], 500);
  assert.strictEqual(TM.src2out(3, keep), null);
});

test('TrackMap: outside the range it holds 0.2 s then fades out over 0.25 s', () => {
  const p = TM.prepare({ type: 'box', fps: 2, size: [1080, 1920], frames: [{ t: 1, box: [0, 0, 10, 10] }, { t: 2, box: [100, 0, 10, 10] }] });
  assert.strictEqual(TM.at(p, 2.15).alpha, 1);
  near(TM.at(p, 2.2 + 0.125).alpha, 0.5);
  assert.strictEqual(TM.at(p, 2.6).alpha, 0);
  near(TM.at(p, 2.15).box[0], 100);    // holds the last shape
  assert.strictEqual(TM.at(p, 0.85).alpha, 1);
});

test('TrackMap: a custom frame mapper (video card) is used per frame', () => {
  const tr = { type: 'box', fps: 30, size: [1080, 1920], frames: [{ t: 0, box: [0, 0, 1080, 1920] }] };
  const p = TM.prepare(tr, { map: () => ({ x: 100, y: 200, sc: 0.5, sx: 0, sy: 0, sw: 1080, sh: 1920 }) });
  assert.deepStrictEqual(TM.at(p, 0).box, [100, 200, 540, 960]);
});

test('render path: 04/08 load track JSON for studio elements and inject track-map.js; compose + moves-compose use it', () => {
  for (const f of ['04_render_frames.js', '08_safe_check.js']) {
    const s = fs.readFileSync(path.join(SC, f), 'utf8');
    assert.match(s, /function withTracks\(st\)/, f); assert.match(s, /'track-map\.js'\]/, f); assert.match(s, /withTracks\(JSON\.parse/, f);
    // run withTracks on a temp work folder
    const W = fs.mkdtempSync(path.join(os.tmpdir(), 'trk-')) + '/';
    fs.mkdirSync(W + 'track'); fs.writeFileSync(W + 'track/qaa.json', JSON.stringify({ type: 'box', frames: [{ t: 0, box: [0, 0, 1, 1] }] }));
    fs.writeFileSync(W + 'cut.json', JSON.stringify({ keep: [[0, 3]] }));
    const src = s.match(/function withTracks\(st\)[\s\S]*?return Object\.assign\(\{\},st,\{__tracks:tracks,__keep:keep\}\); \}/)[0];
    const fn = vm.runInNewContext('(' + src + ')', { fs, W, console: { log() {} } });
    const out = fn({ stickers: [{ s: 0, e: 1, t: 'x', track: 'qaa' }, { s: 0, e: 1, track: 'missing' }] });
    assert.ok(out.__tracks.qaa && !out.__tracks.missing); assert.strictEqual(JSON.stringify(out.__keep), '[[0,3]]');
    assert.strictEqual(fn({ stickers: [] }).__tracks, undefined);
  }
  const c = fs.readFileSync(path.join(SC, 'compose.REFERENCE.html'), 'utf8');
  assert.match(c, /<script src="track-map\.js"><\/script>/);
  assert.match(c, /st\.track&&window\.MV&&MV\.trackAt/); assert.match(c, /b\.track&&window\.MV&&MV\.trackAt/);
  const m = fs.readFileSync(path.join(SC, 'moves-compose.js'), 'utf8');
  assert.match(m, /trackAt, track,/); assert.match(m, /st\.__tracks/); assert.match(m, /movesScene\(st\.moves\)/);
});
