'use strict';
// Motion tracker (engine/track/track.py) + timeline «🎯 تتبّع» (studio.py endpoints, timeline-core helpers) + doctor/docs wiring.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const TRACK = path.join(ROOT, 'engine', 'track', 'track.py');
const STUDIO_DIR = path.join(ROOT, 'skills', 'io-video-editor', 'studio');
const TL = require('../skills/io-video-editor/studio/timeline-core.js');
const py = ['python3', 'python'].find((c) => cp.spawnSync(c, ['--version']).status === 0);
const hasCv = py && cp.spawnSync(py, ['-I', '-c', 'import numpy, cv2'], { encoding: 'utf8' }).status === 0;
const hasFf = cp.spawnSync('ffprobe', ['-version']).status === 0;

test('track: python files compile', { skip: !py && 'no python' }, () => {
  for (const f of [TRACK, path.join(STUDIO_DIR, 'studio.py')]) {
    const r = cp.spawnSync(py, ['-I', '-c', 'import ast,sys; ast.parse(open(sys.argv[1], encoding="utf-8").read())', f], { encoding: 'utf8' });
    assert.strictEqual(r.status, 0, f + '\n' + r.stderr);
  }
});

test('track: no personal paths or keys in the tracker', () => {
  const s = fs.readFileSync(TRACK, 'utf8');
  assert.doesNotMatch(s, /\/Users\/|\/home\/[a-z]|C:\\\\Users/i);
  assert.doesNotMatch(s, /sk_[A-Za-z0-9]{16,}/);
});

test('track: CLI help lists every mode', { skip: !py && 'no python' }, () => {
  const r = cp.spawnSync(py, ['-I', TRACK, '--help'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  for (const m of ['plane', 'box', 'point', 'fix', 'preview', 'info', 'check', 'selftest']) assert.match(r.stdout, new RegExp('track\\.py ' + m + '\\b'), m);
});

test('track: self-test on a synthetic homography video (error < a few px)', { skip: !hasCv && 'numpy/opencv not installed' }, () => {
  const r = cp.spawnSync(py, ['-I', TRACK, 'selftest'], { encoding: 'utf8', timeout: 180000 });
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.doesNotMatch(r.stdout, /❌/);
  const m = r.stdout.match(/دقة السطح: متوسط ([\d.]+)/);
  assert.ok(m && +m[1] < 2.5, r.stdout);
});

function synthWork() {
  const w = fs.mkdtempSync(path.join(os.tmpdir(), 'io-track-'));
  const code = 'import sys,json; sys.path.insert(0, sys.argv[1]); import track; q,b = track.synth(sys.argv[2], n=60); print(json.dumps({"q": q(10).tolist(), "b": b(5)}))';
  const r = cp.spawnSync(py, ['-I', '-c', code, path.dirname(TRACK), path.join(w, 'cutz.mp4')], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  return { w, truth: JSON.parse(r.stdout.trim().split('\n').pop()) };
}

test('track: CLI writes the agreed JSON shape (plane, box, point) and fix merges', { skip: !hasCv && 'numpy/opencv not installed' }, () => {
  const { w, truth } = synthWork();
  try {
    const out = path.join(w, 'track', 'qaa.json');
    const quad = truth.q.map((p) => p.map((c) => c.toFixed(1)).join(',')).join(',');
    let r = cp.spawnSync(py, ['-I', TRACK, 'plane', path.join(w, 'cutz.mp4'), '--at', String(10 / 30), '--quad', quad, '--back', '--out', out], { encoding: 'utf8' });
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
    const d = JSON.parse(fs.readFileSync(out, 'utf8'));
    assert.strictEqual(d.type, 'plane');
    assert.strictEqual(d.video, 'cutz.mp4');
    assert.strictEqual(d.clock, 'out');
    assert.deepStrictEqual(d.size, [640, 360]);
    assert.ok(Math.abs(d.fps - 30) < 0.01);
    assert.ok(d.frames.length >= 55, 'back + forward covers the clip: ' + d.frames.length);
    assert.strictEqual(d.frames[0].t, 0);
    for (const f of d.frames) {
      assert.ok(typeof f.t === 'number' && typeof f.conf === 'number' && f.conf >= 0 && f.conf <= 1);
      assert.strictEqual(f.quad.length, 4);
      for (const p of f.quad) assert.ok(p.length === 2 && p.every(Number.isFinite));
    }
    const ts = d.frames.map((f) => f.t);
    assert.deepStrictEqual(ts, [...ts].sort((a, b) => a - b));
    // re-key at 1.0 s and merge
    r = cp.spawnSync(py, ['-I', TRACK, 'fix', out, '--at', '1.0', '--quad', d.frames.find((f) => Math.abs(f.t - 1) < 0.02).quad.flat().join(',')], { encoding: 'utf8' });
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
    const d2 = JSON.parse(fs.readFileSync(out, 'utf8'));
    assert.strictEqual(d2.keys.length, 2);
    assert.strictEqual(new Set(d2.frames.map((f) => f.t)).size, d2.frames.length, 'no duplicate frames after merge');
    // box + point
    const bo = path.join(w, 'track', 'b.json');
    r = cp.spawnSync(py, ['-I', TRACK, 'box', path.join(w, 'cutz.mp4'), '--at', String(5 / 30), '--to', '1.5', '--box', truth.b.join(','), '--out', bo], { encoding: 'utf8' });
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
    const db = JSON.parse(fs.readFileSync(bo, 'utf8'));
    assert.strictEqual(db.type, 'box');
    assert.ok(db.frames.every((f) => f.box.length === 4 && typeof f.conf === 'number'));
    const po = path.join(w, 'track', 'p.json');
    r = cp.spawnSync(py, ['-I', TRACK, 'point', path.join(w, 'cutz.mp4'), '--at', String(10 / 30), '--to', '1.2', '--pt', truth.q[0].map((c) => c + 30).join(','), '--pt', 'tip=' + truth.q[2].map((c) => c - 30).join(','), '--out', po], { encoding: 'utf8' });
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
    const dp = JSON.parse(fs.readFileSync(po, 'utf8'));
    assert.strictEqual(dp.type, 'point');
    assert.deepStrictEqual(Object.keys(dp.frames[0].points).sort(), ['p', 'tip']);
    // preview mp4
    const pv = path.join(w, 'track', 'qaa.mp4');
    r = cp.spawnSync(py, ['-I', TRACK, 'preview', path.join(w, 'cutz.mp4'), out, '--out', pv], { encoding: 'utf8' });
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
    assert.ok(fs.statSync(pv).size > 1000);
  } finally { fs.rmSync(w, { recursive: true, force: true }); }
});

/* ---------- timeline-core helpers ---------- */
test('timeline-core: orderQuad gives TL, TR, BR, BL from any order', () => {
  assert.deepStrictEqual(TL.orderQuad([[10, 10], [0, 10], [10, 0], [0, 0]]), [[0, 0], [10, 0], [10, 10], [0, 10]]);
  assert.deepStrictEqual(TL.orderQuad([[100, 210], [300, 190], [320, 400], [90, 420]].reverse()), [[100, 210], [300, 190], [320, 400], [90, 420]]);
});

test('timeline-core: screen/video mapping round-trips through object-fit contain', () => {
  const R = TL.fitRect(1080, 1920, 400, 900);
  assert.ok(Math.abs(R.w - 400) < 1e-9 && Math.abs(R.h - 400 * 1920 / 1080) < 1e-9 && R.x === 0);
  const p = [540, 960], s = TL.toScreen(p, R);
  assert.deepStrictEqual(TL.toVideo(s, R), p);
  assert.deepStrictEqual(TL.toVideo([-50, -50], R, [1080, 1920]), [0, 0]);
  assert.deepStrictEqual(TL.rectFrom2([50, 80], [10, 20]), [10, 20, 40, 60]);
  assert.deepStrictEqual(TL.quadFromBox([1, 2, 3, 4]), [[1, 2], [4, 2], [4, 6], [1, 6]]);
});

test('timeline-core: trackFrameAt interpolates and stays inside the range', () => {
  const tr = { type: 'plane', fps: 30, frames: [
    { t: 1, quad: [[0, 0], [10, 0], [10, 10], [0, 10]], conf: 1 },
    { t: 1 + 1 / 30, quad: [[3, 0], [13, 0], [13, 10], [3, 10]], conf: 0.8 },
  ] };
  const mid = TL.trackFrameAt(tr, 1 + 1 / 60);
  assert.ok(Math.abs(mid.quad[0][0] - 1.5) < 1e-9);
  assert.strictEqual(mid.conf, 0.8);
  assert.strictEqual(TL.trackFrameAt(tr, 0.5), null);
  assert.strictEqual(TL.trackFrameAt(tr, 2), null);
  const pt = TL.trackFrameAt({ type: 'point', fps: 30, frames: [{ t: 0, points: { p: [0, 0] }, conf: 1 }, { t: 1 / 30, points: { p: [2, 4] }, conf: 1 }] }, 1 / 60);
  assert.deepStrictEqual(pt.points.p, [1, 2]);
  assert.deepStrictEqual(TL.trackSummary(tr), { n: 2, a: 1, b: 1 + 1 / 30, conf: 0.9, weak: 0, lost: null });
});

test('timeline-core: trackRequest validates and builds the server body', () => {
  assert.strictEqual(TL.trackRequest({ type: 'plane', at: 2, shape: [[0, 0], [1, 0]] }).ok, false);
  assert.strictEqual(TL.trackRequest({ type: 'plane', at: 2, shape: [[0, 0], [1, 0], [2, 0], [3, 0]] }).ok, false, 'collinear');
  const r = TL.trackRequest({ type: 'plane', at: 30.0004, shape: [[100, 300], [100, 100], [300, 100], [300, 300]], to: 34, back: true, name: 'qaa' });
  assert.ok(r.ok, r.err);
  assert.deepStrictEqual(r.body, { type: 'plane', at: 30, quad: [[100, 100], [300, 100], [300, 300], [100, 300]], to: 34, back: true, name: 'qaa' });
  assert.strictEqual(TL.trackRequest({ type: 'plane', at: 5, shape: [[100, 300], [100, 100], [300, 100], [300, 300]], to: 4 }).ok, false);
  assert.deepStrictEqual(TL.trackRequest({ type: 'box', at: 1, shape: [1, 2, 30, 40] }).body, { type: 'box', at: 1, box: [1, 2, 30, 40] });
  assert.strictEqual(TL.trackRequest({ type: 'box', at: 1, shape: [1, 2, 3, 40] }).ok, false);
  assert.deepStrictEqual(TL.trackRequest({ type: 'point', at: 1, shape: [5.04, 6] }).body.points, { p: [5, 6] });
  const fx = TL.trackRequest({ type: 'box', at: 3, shape: [1, 2, 30, 40], fix: true, name: 'b', to: 9, back: true });
  assert.deepStrictEqual(fx.body, { type: 'box', at: 3, box: [1, 2, 30, 40], fix: true, name: 'b' });
  assert.strictEqual(TL.trackRequest({ type: 'box', at: 3, shape: [1, 2, 30, 40], fix: true }).ok, false);
});

test('timeline-core: trackName is safe and unique; attachables lists studio.json elements', () => {
  assert.strictEqual(TL.trackName('plane', 30.04, []), 'plane-30');
  assert.strictEqual(TL.trackName('plane', 30, ['plane-30', 'plane-30-2']), 'plane-30-3');
  assert.strictEqual(TL.trackName('box', 1, [], '../قاع القدر'), '-قاع-القدر');
  const els = TL.attachables({ scenes: [{ s: 0, e: 9, m: 'R_FULL' }], stickers: [{ s: 2, e: 4, t: '2500 W', track: 'qaa' }], brollClips: [{ s: 1, e: 2 }], moves: [{ s: 3, e: 5, id: 'countUp' }], behindOff: [3, 4] });
  assert.deepStrictEqual(els.map((e) => [e.list, e.i, e.track]), [['brollClips', 0, null], ['stickers', 0, 'qaa'], ['moves', 0, null]]);
  assert.match(els[1].label, /2500 W/);
  assert.strictEqual(TL.trackClockTime('out', 5, [[0, 2], [4, 8]]), 3);
  assert.strictEqual(TL.trackClockTime('out', 3, [[0, 2], [4, 8]]), null);
  assert.strictEqual(TL.trackClockTime('src', 3, [[0, 2]]), 3);
});

/* ---------- studio.py endpoints (background job like /api/progress) ---------- */
function req(port, method, p, body) {
  return new Promise((resolve, reject) => {
    const data = body ? Buffer.from(JSON.stringify(body)) : null;
    const r = http.request({ host: '127.0.0.1', port, path: p, method, headers: data ? { 'Content-Type': 'application/json', 'Content-Length': data.length } : {} }, (res) => {
      let b = ''; res.setEncoding('utf8'); res.on('data', (c) => { b += c; }); res.on('end', () => { try { resolve({ status: res.statusCode, json: JSON.parse(b) }); } catch (e) { reject(new Error(b)); } });
    });
    r.on('error', reject); if (data) r.write(data); r.end();
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('studio: /api/track/list · run · attach · delete', { skip: (!hasCv || !hasFf) && 'needs numpy/opencv + ffprobe' }, async () => {
  const { w, truth } = synthWork();
  fs.writeFileSync(path.join(w, 'compose.html'), '<!doctype html><title>t</title>');
  fs.writeFileSync(path.join(w, 'studio.json'), JSON.stringify({ stickers: [{ s: 0.2, e: 1.5, i: '⭐', t: '2500 W', y: 300 }] }));
  const port = 8900 + Math.floor(Math.random() * 80);
  const srv = cp.spawn(py, [path.join(STUDIO_DIR, 'studio.py'), w, String(port)], { stdio: 'ignore' });
  try {
    let list;
    for (let i = 0; i < 40; i++) { try { list = await req(port, 'GET', '/api/track/list'); break; } catch (e) { await sleep(250); } }
    assert.ok(list, 'server up');
    assert.deepStrictEqual(list.json.video.path, 'cutz.mp4');
    assert.strictEqual(list.json.video.clock, 'out');
    assert.deepStrictEqual(list.json.video.size, [640, 360]);
    assert.ok(list.json.tool);
    const rq = TL.trackRequest({ type: 'plane', at: 10 / 30, shape: truth.q, to: 1.6, name: 'qaa' });
    let r = await req(port, 'POST', '/api/track/run', rq.body);
    assert.ok(r.json.ok);
    let p;
    for (let i = 0; i < 120; i++) { await sleep(250); p = (await req(port, 'GET', '/api/progress')).json; if (!p.running) break; }
    assert.strictEqual(p.kind, 'track');
    assert.strictEqual(p.err, null, p.log);
    assert.strictEqual(JSON.parse(p.done).name, 'qaa');
    list = await req(port, 'GET', '/api/track/list');
    const t = list.json.tracks.find((x) => x.name === 'qaa');
    assert.ok(t && t.type === 'plane' && t.n > 30 && t.conf > 0.8, JSON.stringify(list.json.tracks));
    const doc = await new Promise((res) => http.get(`http://127.0.0.1:${port}/track/qaa.json`, (x) => { let b = ''; x.on('data', (c) => { b += c; }); x.on('end', () => res(JSON.parse(b))); }));
    assert.strictEqual(doc.frames.length, t.n);
    // attach to the sticker, then a bad attach is refused
    r = await req(port, 'POST', '/api/track/attach', { list: 'stickers', i: 0, name: 'qaa' });
    assert.ok(r.json.ok);
    assert.strictEqual(JSON.parse(fs.readFileSync(path.join(w, 'studio.json'), 'utf8')).stickers[0].track, 'qaa');
    r = await req(port, 'POST', '/api/track/attach', { list: 'scenes', i: 0, name: 'qaa' });
    assert.strictEqual(r.status, 400);
    r = await req(port, 'POST', '/api/track/attach', { list: 'stickers', i: 0, name: 'nope' });
    assert.strictEqual(r.status, 400);
    // re-key (fix) through the same endpoint
    const f = doc.frames.find((x) => Math.abs(x.t - 1) < 0.02);
    r = await req(port, 'POST', '/api/track/run', TL.trackRequest({ type: 'plane', at: 1, shape: f.quad, fix: true, name: 'qaa' }).body);
    assert.ok(r.json.ok);
    for (let i = 0; i < 120; i++) { await sleep(250); p = (await req(port, 'GET', '/api/progress')).json; if (!p.running) break; }
    assert.strictEqual(p.err, null, p.log);
    list = await req(port, 'GET', '/api/track/list');
    assert.deepStrictEqual(list.json.tracks.find((x) => x.name === 'qaa').keys.length, 2);
    // delete detaches
    r = await req(port, 'POST', '/api/track/delete', { name: 'qaa' });
    assert.ok(r.json.ok && r.json.tracks.length === 0);
    assert.strictEqual(JSON.parse(fs.readFileSync(path.join(w, 'studio.json'), 'utf8')).stickers[0].track, undefined);
  } finally { srv.kill(); fs.rmSync(w, { recursive: true, force: true }); }
});

test('timeline page has the tracking UI wired to the endpoints', () => {
  const h = fs.readFileSync(path.join(STUDIO_DIR, 'timeline.html'), 'utf8');
  for (const id of ['bTrack', 'trackCard', 'trov', 'tkRun', 'tkList', 'tkType']) assert.match(h, new RegExp('id="' + id + '"'), id);
  for (const u of ['/api/track/list', '/api/track/run', '/api/track/attach', '/api/track/delete', '/track/']) assert.ok(h.includes(u), u);
  assert.match(h, /صلّح من هنا/);
});

test('track: doctor check «التتبّع» and docs routing', () => {
  const D = require('../engine/doctor.js');
  const c = D.CHECKS.find((x) => x.id === 'track');
  assert.ok(c && c.level === 'optional' && /التتبّع/.test(c.label));
  assert.strictEqual(D.PIP.track, 'opencv-python-headless');
  const steps = D.planInstall('linux', ['greenscreen', 'track'], { has: { apt: true } });
  const pip = steps.find((s) => s.pip);
  assert.strictEqual(pip.args.filter((a) => a === 'opencv-python-headless').length, 1, 'opencv only once');
  const ref = path.join(ROOT, 'skills', 'io-video-editor', 'references', 'tracking.md');
  assert.ok(fs.existsSync(ref));
  const md = fs.readFileSync(ref, 'utf8');
  for (const k of ['engine/track/track.py', 'cutz.mp4', 'صلّح من هنا', '"track"', 'ثبّت']) assert.ok(md.includes(k), k);
  assert.match(fs.readFileSync(path.join(ROOT, 'skills', 'io-video-editor', 'SKILL.md'), 'utf8'), /references\/tracking\.md/);
  assert.match(fs.readFileSync(path.join(ROOT, 'skills', 'io-autopilot', 'SKILL.md'), 'utf8'), /references\/tracking\.md/);
});
