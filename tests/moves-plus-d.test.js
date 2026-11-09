'use strict';
// Motion bank 233–242 (moves-plus-d.js): catalog, loaders, and the retention-curve data helpers.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const VE = path.join(__dirname, '..', 'skills', 'io-video-editor');
const MOTION = path.join(VE, 'motion'), MOVES = path.join(MOTION, 'moves');
const catalogs = fs.readdirSync(MOVES).filter((f) => /^catalog(-plus-[\w-]+)?\.json$/.test(f)).sort();
const all = catalogs.flatMap((f) => JSON.parse(fs.readFileSync(path.join(MOVES, f), 'utf8')).moves);
const plusD = JSON.parse(fs.readFileSync(path.join(MOVES, 'catalog-plus-d.json'), 'utf8')).moves;

const sandbox = {};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(MOTION, 'moves-plus-d.js'), 'utf8'), sandbox);
const FX = sandbox.FX;
const J = (x) => JSON.parse(JSON.stringify(x)); // values from the vm realm → plain objects for deepStrictEqual

test('moves bank: numbers are 1..N without gaps, ids unique, and the documented count matches', () => {
  const ns = all.map((m) => m.n).sort((a, b) => a - b);
  assert.deepStrictEqual(ns, ns.map((_, i) => i + 1));
  assert.strictEqual(new Set(all.map((m) => m.id)).size, all.length);
  const doc = fs.readFileSync(path.join(VE, 'references', 'moves.md'), 'utf8');
  assert.match(doc, new RegExp(`\\*\\*${all.length} حركة\\*\\*`));
});

test('moves 233–242: every catalog entry is a function in moves-plus-d.js with a preview path', () => {
  assert.deepStrictEqual(plusD.map((m) => m.n), [233, 234, 235, 236, 237, 238, 239, 240, 241, 242]);
  for (const m of plusD) {
    assert.strictEqual(typeof FX[m.id], 'function', m.id);
    assert.strictEqual(m.preview, `previews/${m.n}.mp4`);
    for (const k of ['cat', 'name', 'sub', 'desc', 'role', 'families', 'cues']) assert.ok(m[k] !== undefined && m[k] !== '', `${m.id}.${k}`);
  }
  assert.strictEqual(FX['comment-keyword'], FX.commentKeyword);
});

test('moves-plus-d.js is loaded wherever moves-plus-c.js is', () => {
  for (const f of ['motion/engine.html', 'scripts/compose.REFERENCE.html', 'scripts/04_render_frames.js', 'scripts/08_safe_check.js']) {
    const s = fs.readFileSync(path.join(VE, f), 'utf8');
    assert.ok(s.includes('moves-plus-c.js') && s.includes('moves-plus-d.js'), f);
  }
  assert.match(fs.readFileSync(path.join(MOVES, 'index.html'), 'utf8'), /catalog-plus-d\.json/);
  const demos = require(path.join(MOVES, 'render-preview-d.js'));
  for (const m of plusD) assert.ok(demos[m.id], `demo for ${m.id}`);
});

test('retention: numbers, ratios, [sec,%] pairs, objects and a YouTube export all normalise to % over 0..1', () => {
  const a = J(FX.retentionPoints([100, 80, 50], 30));
  assert.deepStrictEqual(a.points.map((p) => [p.x, p.sec, p.v]), [[0, 0, 100], [0.5, 15, 80], [1, 30, 50]]);
  assert.deepStrictEqual(J(FX.retentionPoints([1, 0.8, 0.5])).points.map((p) => Math.round(p.v)), [100, 80, 50]);
  const pairs = J(FX.retentionPoints([[0, 100], [10, 60], [20, 40]]));
  assert.strictEqual(pairs.duration, 20);
  assert.deepStrictEqual(pairs.points.map((p) => p.x), [0, 0.5, 1]);
  const obj = J(FX.retentionPoints({ durationSec: 40, retention: [{ t: 0, pct: '100%' }, { t: 20, pct: '55%' }, { t: 40, pct: '30%' }] }));
  assert.deepStrictEqual(obj.points.map((p) => [p.sec, p.v]), [[0, 100], [20, 55], [40, 30]]);
  const yt = J(FX.retentionPoints([{ elapsedVideoTimeRatio: 0, audienceWatchRatio: 1.05 }, { elapsedVideoTimeRatio: 0.5, audienceWatchRatio: 0.6 }, { elapsedVideoTimeRatio: 1, audienceWatchRatio: 0.3 }], 60));
  assert.deepStrictEqual(yt.points.map((p) => [p.x, p.sec, Math.round(p.v)]), [[0, 0, 105], [0.5, 30, 60], [1, 60, 30]]);
  assert.deepStrictEqual(J(FX.retentionPoints(null)).points, []);
  assert.deepStrictEqual(J(FX.retentionPoints(['x', {}, 70])).points.map((p) => p.v), [70]);
});

test('retention: the biggest drops are found, spaced apart and ordered by time', () => {
  const pts = FX.retentionPoints([100, 98, 70, 68, 67, 66, 65, 64, 63, 62, 61, 60, 59, 40, 39, 38, 37, 36, 35, 34, 33], 20).points;
  const d = FX.retentionDrops(pts, 2, 4);
  assert.strictEqual(d.length, 2);
  assert.ok(d[0].x < d[1].x);
  assert.strictEqual(Math.round(d[0].drop), 28);
  assert.strictEqual(Math.round(d[1].drop), 19);
  assert.strictEqual(FX.retentionDrops(pts, 2, 50).length, 0);
});
