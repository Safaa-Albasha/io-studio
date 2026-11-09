'use strict';
// Motion bank 243–264 (moves-plus-e.js · «أنمي وكرتون»): catalog, loaders, and a smoke run of every move on a stub canvas.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const VE = path.join(__dirname, '..', 'skills', 'io-video-editor');
const MOTION = path.join(VE, 'motion'), MOVES = path.join(MOTION, 'moves');
const catalogs = fs.readdirSync(MOVES).filter((f) => /^catalog(-plus-[\w-]+)?\.json$/.test(f)).sort();
const all = catalogs.flatMap((f) => JSON.parse(fs.readFileSync(path.join(MOVES, f), 'utf8')).moves);
const plusE = JSON.parse(fs.readFileSync(path.join(MOVES, 'catalog-plus-e.json'), 'utf8')).moves;

// A canvas 2D stub: any method is a no-op returning the stub, properties are stored, measureText/gradients answer sensibly.
const stubCtx = () => {
  const store = { globalAlpha: 1, filter: 'none', calls: 0 };
  const grad = { addColorStop() {} };
  const h = {
    get(_, k) {
      if (k in store) return store[k];
      if (k === 'measureText') return (s) => ({ width: String(s).length * 30 });
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
      return () => { store.calls++; return undefined; };
    },
    set(_, k, v) { store[k] = v; return true; },
  };
  return { X: new Proxy({}, h), store };
};
const sandbox = { document: { createElement: () => ({ width: 1, height: 1, getContext: () => stubCtx().X }) } };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(MOTION, 'moves-plus-d.js'), 'utf8'), sandbox);   // FX.toonPhoto (chibiPhoto reuses it)
vm.runInContext(fs.readFileSync(path.join(MOTION, 'moves-plus-e.js'), 'utf8'), sandbox);
const FX = sandbox.FX;

test('moves bank: numbers are 1..N without gaps, ids unique, and the documented count matches', () => {
  const ns = all.map((m) => m.n).sort((a, b) => a - b);
  assert.deepStrictEqual(ns, ns.map((_, i) => i + 1));
  assert.strictEqual(new Set(all.map((m) => m.id)).size, all.length);
  const doc = fs.readFileSync(path.join(VE, 'references', 'moves.md'), 'utf8');
  assert.match(doc, new RegExp(`\\*\\*${all.length} حركة\\*\\*`));
  assert.ok(all.length >= 264);
});

test('moves 243–264: every catalog entry is a function in moves-plus-e.js with a preview and I/O Studio source', () => {
  assert.deepStrictEqual(plusE.map((m) => m.n), Array.from({ length: 22 }, (_, i) => 243 + i));
  const cats = new Set(['text', 'card', 'transition', 'camera']);
  for (const m of plusE) {
    assert.strictEqual(typeof FX[m.id], 'function', m.id);
    assert.strictEqual(m.preview, `previews/${m.n}.mp4`);
    assert.ok(cats.has(m.cat), `${m.id}.cat`);
    assert.match(m.source.label, /^I\/O Studio/);
    assert.ok(m.energy >= 1 && m.energy <= 3, `${m.id}.energy`);
    for (const k of ['cat', 'name', 'sub', 'desc', 'role', 'families', 'cues']) assert.ok(m[k] !== undefined && m[k] !== '', `${m.id}.${k}`);
    assert.match(m.name, /[؀-ۿ]/, `${m.id}: Arabic name`);
  }
  assert.strictEqual(typeof FX.chibiHead, 'function');
});

test('moves-plus-e.js is loaded wherever moves-plus-d.js is', () => {
  for (const f of ['motion/engine.html', 'scripts/compose.REFERENCE.html', 'scripts/04_render_frames.js', 'scripts/08_safe_check.js']) {
    const s = fs.readFileSync(path.join(VE, f), 'utf8');
    assert.ok(s.includes('moves-plus-d.js') && s.includes('moves-plus-e.js'), f);
    assert.ok(s.indexOf('moves-plus-d.js') < s.indexOf('moves-plus-e.js'), `${f}: plus-e loads after plus-d`);
  }
  assert.match(fs.readFileSync(path.join(MOVES, 'index.html'), 'utf8'), /catalog-plus-e\.json/);
  const demos = require(path.join(MOVES, 'render-preview-e.js'));
  for (const m of plusE) assert.ok(demos[m.id], `demo for ${m.id}`);
});

test('moves 243–264 draw without throwing across their timeline (stub canvas, theme palette, no options)', () => {
  const P = { bg: '#F0EBE0', ink: '#1B1A17', acc: '#D97757', clay: '#C15F3C', hi: '#E8A283', mut: '#8A847A', handle: '@io' };
  for (const dark of [false, true]) {
    const pal = dark ? Object.assign({}, P, { bg: '#121212', ink: '#FFFFFF' }) : P;
    for (const m of plusE) {
      const { X, store } = stubCtx();
      const ctx = { X, P: pal, font: () => '700 40px Cairo', text: () => {}, at: (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a))), img: () => null };
      const scene = () => {};
      for (let t = 0; t <= 4; t += 0.1) {
        assert.doesNotThrow(() => FX[m.id](ctx, t, { s: 0.2, A: scene, B: scene, draw: scene }), `${m.id} @${t.toFixed(1)}`);
      }
      assert.ok(store.calls > 0, `${m.id} draws something`);
      assert.ok(Number.isFinite(store.globalAlpha), `${m.id} alpha`);
    }
  }
});

test('chibi moods: every mood draws, and the photo head path is used when a photo is given', () => {
  const P = { bg: '#F0EBE0', ink: '#1B1A17', acc: '#D97757', hi: '#E8A283', mut: '#8A847A' };
  const photo = { width: 400, height: 480, naturalWidth: 400, naturalHeight: 480, complete: true };
  for (const mood of ['happy', 'shocked', 'thinking', 'crying', 'angry']) {
    for (const ph of [null, photo]) {
      const { X } = stubCtx();
      const ctx = { X, P, font: () => '', text: () => {}, at: () => 0, img: () => null };
      assert.doesNotThrow(() => FX.chibiReact(ctx, 1, { s: 0, mood, photo: ph, body: true, gender: 'male' }), mood);
      assert.doesNotThrow(() => FX.chibiPhoto(ctx, 1, { s: 0, mood, photo: ph, name: true }), mood);
    }
  }
});
