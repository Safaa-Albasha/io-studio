'use strict';
// Motion bank 265–283 (moves-plus-f.js · «أنظمة الموشن»): catalog, loaders, theme-only colours, and a smoke run of every move on a stub canvas.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const VE = path.join(__dirname, '..', 'skills', 'io-video-editor');
const MOTION = path.join(VE, 'motion'), MOVES = path.join(MOTION, 'moves');
const catalogs = fs.readdirSync(MOVES).filter((f) => /^catalog(-plus-[\w-]+)?\.json$/.test(f)).sort();
const all = catalogs.flatMap((f) => JSON.parse(fs.readFileSync(path.join(MOVES, f), 'utf8')).moves);
const plusF = JSON.parse(fs.readFileSync(path.join(MOVES, 'catalog-plus-f.json'), 'utf8')).moves;

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
vm.runInContext(fs.readFileSync(path.join(MOTION, 'moves-plus-f.js'), 'utf8'), sandbox);
const FX = sandbox.FX;

test('moves bank: numbers are 1..N without gaps, ids unique, and the documented count matches', () => {
  const ns = all.map((m) => m.n).sort((a, b) => a - b);
  assert.deepStrictEqual(ns, ns.map((_, i) => i + 1));
  assert.strictEqual(new Set(all.map((m) => m.id)).size, all.length);
  const doc = fs.readFileSync(path.join(VE, 'references', 'moves.md'), 'utf8');
  assert.match(doc, new RegExp(`\\*\\*${all.length} حركة\\*\\*`));
  assert.ok(all.length >= 264);
});

test('moves 265–283: every catalog entry is a function in moves-plus-f.js with a preview and I/O Studio source', () => {
  assert.deepStrictEqual(plusF.map((m) => m.n), Array.from({ length: 19 }, (_, i) => 265 + i));
  const cats = new Set(['text', 'card', 'transition', 'camera']);
  for (const m of plusF) {
    assert.strictEqual(typeof FX[m.id], 'function', m.id);
    assert.strictEqual(m.preview, `previews/${m.n}.mp4`);
    assert.ok(fs.existsSync(path.join(MOVES, m.preview)), `${m.id}: preview file`);
    assert.ok(cats.has(m.cat), `${m.id}.cat`);
    assert.match(m.source.label, /^I\/O Studio/);
    assert.ok(m.energy >= 1 && m.energy <= 3, `${m.id}.energy`);
    for (const k of ['cat', 'name', 'sub', 'desc', 'role', 'families', 'cues']) assert.ok(m[k] !== undefined && m[k] !== '', `${m.id}.${k}`);
    assert.match(m.name, /[؀-ۿ]/, `${m.id}: Arabic name`);
  }
  assert.strictEqual(typeof FX.gem, 'function');
  assert.strictEqual(typeof FX.propCanvas, 'function');
});

test('moves-plus-f.js is loaded wherever moves-plus-e.js is, after it', () => {
  for (const f of ['motion/engine.html', 'scripts/compose.REFERENCE.html', 'scripts/04_render_frames.js', 'scripts/08_safe_check.js']) {
    const s = fs.readFileSync(path.join(VE, f), 'utf8');
    assert.ok(s.includes('moves-plus-e.js') && s.includes('moves-plus-f.js'), f);
    assert.ok(s.lastIndexOf('moves-plus-e.js') < s.lastIndexOf('moves-plus-f.js'), `${f}: plus-f loads after plus-e`);
  }
  assert.match(fs.readFileSync(path.join(MOVES, 'index.html'), 'utf8'), /catalog-plus-f\.json/);
  const demos = require(path.join(MOVES, 'render-preview-f.js'));
  for (const m of plusF) assert.ok(demos[m.id], `demo for ${m.id}`);
});

test('moves-plus-f.js is generic: no personal names/handles, colours only from the theme (plus neutral greys/white/black)', () => {
  const src = fs.readFileSync(path.join(MOTION, 'moves-plus-f.js'), 'utf8');
  assert.doesNotMatch(src, /safaa|صفاء|majed|ماجد|@[a-z]/i);
  assert.doesNotMatch(src, /#2EC4F0|#0E1014|Alexandria|Readex/i);
  const hexes = new Set((src.match(/#[0-9A-Fa-f]{6}\b/g) || []).map((h) => h.toUpperCase()));
  hexes.delete('#E7D3B5');   // خشب القلم المرسوم (لون مادة، مو هوية)
  for (const h of hexes) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    assert.ok(Math.max(r, g, b) - Math.min(r, g, b) <= 40, `${h} should be a neutral grey (brand colours come from ctx.P)`);
  }
});

test('moves 265–283 draw without throwing across their timeline (stub canvas, light and dark theme, no options)', () => {
  const P = { bg: '#F0EBE0', ink: '#1B1A17', acc: '#D97757', clay: '#C15F3C', hi: '#E8A283', mut: '#8A847A' };
  for (const dark of [false, true]) {
    const pal = dark ? Object.assign({}, P, { bg: '#121212', ink: '#FFFFFF' }) : P;
    for (const m of plusF) {
      const { X, store } = stubCtx();
      const ctx = { X, P: pal, font: () => '700 40px Cairo', text: () => {}, at: (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a))), img: () => null };
      const scene = () => {};
      for (let t = 0; t <= 7; t += 0.1) {
        assert.doesNotThrow(() => FX[m.id](ctx, t, { s: 0.2, A: scene, B: scene }), `${m.id} @${t.toFixed(1)}`);
      }
      assert.ok(store.calls > 0, `${m.id} draws something`);
      assert.ok(Number.isFinite(store.globalAlpha), `${m.id} alpha`);
    }
  }
});

test('optional images: moves take an image (or a project image name) and fall back to code drawing without one', () => {
  const P = { bg: '#0E0E10', ink: '#FAFAFA', acc: '#33AAFF', mut: '#888888' };
  const im = { width: 400, height: 300, naturalWidth: 400, naturalHeight: 300 };
  const names = [];
  const { X } = stubCtx();
  const ctx = { X, P, font: () => '', text: () => {}, at: () => 0, img: (n) => { names.push(n); return im; } };
  assert.doesNotThrow(() => FX.giantWordObject(ctx, 1, { s: 0, word: 'كلمة', img: 'shot.png', swap: im, swapAt: 0.5 }));
  assert.doesNotThrow(() => FX.wordProps(ctx, 1, { s: 0, props: [{ img: 'bill.png', x: 300, y: 300, w: 300 }, { kind: 'pencil', x: 700, y: 1500, w: 500 }] }));
  assert.doesNotThrow(() => FX.polaroidString(ctx, 2, { s: 0, items: [{ cap: 'أ', img: im }, { cap: 'ب' }] }));
  assert.doesNotThrow(() => FX.depthGrid(ctx, 1, { s: 0, objects: ['a.png'] }));
  assert.ok(names.includes('shot.png') && names.includes('bill.png') && names.includes('a.png'));
  for (const k of ['receipt', 'stack', 'phone', 'notebook', 'pencil']) assert.ok(FX.propCanvas(k, P), k);
});
