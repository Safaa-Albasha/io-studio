'use strict';
// Motion bank 284–328 (moves-plus-g.js + moves-plus-h.js · «مراجع الريلز»): catalogs, loaders, theme-only colours, tracking helpers, and a smoke run of every move.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const VE = path.join(__dirname, '..', 'skills', 'io-video-editor');
const MOTION = path.join(VE, 'motion'), MOVES = path.join(MOTION, 'moves');
const catalogs = fs.readdirSync(MOVES).filter((f) => /^catalog(-plus-[\w-]+)?\.json$/.test(f)).sort();
const all = catalogs.flatMap((f) => JSON.parse(fs.readFileSync(path.join(MOVES, f), 'utf8')).moves);
const plusG = JSON.parse(fs.readFileSync(path.join(MOVES, 'catalog-plus-g.json'), 'utf8')).moves;
const plusH = JSON.parse(fs.readFileSync(path.join(MOVES, 'catalog-plus-h.json'), 'utf8')).moves;

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
for (const f of ['moves.js', 'moves-plus-b.js', 'moves-plus-g.js', 'moves-plus-h.js']) vm.runInContext(fs.readFileSync(path.join(MOTION, f), 'utf8'), sandbox);
const FX = sandbox.FX;

test('moves bank: 1..N without gaps, unique ids, documented count matches (≥ 328)', () => {
  const ns = all.map((m) => m.n).sort((a, b) => a - b);
  assert.deepStrictEqual(ns, ns.map((_, i) => i + 1));
  assert.strictEqual(new Set(all.map((m) => m.id)).size, all.length);
  assert.ok(all.length >= 328);
  const doc = fs.readFileSync(path.join(VE, 'references', 'moves.md'), 'utf8');
  assert.match(doc, new RegExp(`\\*\\*${all.length} حركة\\*\\*`));
});

test('moves 284–328: every entry is a function with a preview, I/O Studio source and Arabic name', () => {
  assert.deepStrictEqual(plusG.map((m) => m.n), Array.from({ length: 23 }, (_, i) => 284 + i));
  assert.deepStrictEqual(plusH.map((m) => m.n), Array.from({ length: 22 }, (_, i) => 307 + i));
  const cats = new Set(['text', 'card', 'transition', 'camera']);
  for (const m of [...plusG, ...plusH]) {
    assert.strictEqual(typeof FX[m.id], 'function', m.id);
    assert.strictEqual(m.preview, `previews/${m.n}.mp4`);
    assert.ok(fs.existsSync(path.join(MOVES, m.preview)), `${m.id}: preview file`);
    assert.ok(cats.has(m.cat), `${m.id}.cat`);
    assert.match(m.source.label, /^I\/O Studio/);
    assert.ok(m.energy >= 1 && m.energy <= 3);
    for (const k of ['name', 'sub', 'desc', 'role', 'families', 'cues']) assert.ok(m[k] !== undefined && m[k] !== '', `${m.id}.${k}`);
    assert.match(m.name, /[؀-ۿ]/);
  }
});

test('moves-plus-g/h load wherever moves-plus-f does, in order f → g → h; demos exist', () => {
  for (const f of ['motion/engine.html', 'scripts/compose.REFERENCE.html', 'scripts/04_render_frames.js', 'scripts/08_safe_check.js']) {
    const s = fs.readFileSync(path.join(VE, f), 'utf8');
    const a = s.lastIndexOf('moves-plus-f.js'), b = s.lastIndexOf('moves-plus-g.js'), c = s.lastIndexOf('moves-plus-h.js');
    assert.ok(a >= 0 && a < b && b < c, f);
  }
  assert.match(fs.readFileSync(path.join(MOVES, 'index.html'), 'utf8'), /catalog-plus-h\.json/);
  const dg = require(path.join(MOVES, 'render-preview-g.js')), dh = require(path.join(MOVES, 'render-preview-h.js'));
  for (const m of plusG) assert.ok(dg[m.id], `demo ${m.id}`);
  for (const m of plusH) assert.ok(dh[m.id], `demo ${m.id}`);
});

test('moves-plus-g/h are generic: no personal names/handles/platform names, colours from the theme', () => {
  for (const f of ['moves-plus-g.js', 'moves-plus-h.js']) {
    const src = fs.readFileSync(path.join(MOTION, f), 'utf8');
    assert.doesNotMatch(src, /safaa|صفاء|majed|ماجد|@[a-z]{3}|instagram|tiktok|youtube|claude/i, f);
    const hexes = new Set((src.match(/#[0-9A-Fa-f]{6}\b/g) || []).map((h) => h.toUpperCase()));
    for (const h of hexes) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
      assert.ok(Math.max(r, g, b) - Math.min(r, g, b) <= 40, `${f}: ${h} should be neutral (brand colours come from ctx.P)`);
    }
  }
});

test('moves 284–328 draw without throwing (stub canvas, light/dark theme, no options)', () => {
  const P = { bg: '#F0EBE0', ink: '#1B1A17', acc: '#D97757', mut: '#8A847A' };
  for (const dark of [false, true]) {
    const pal = dark ? Object.assign({}, P, { bg: '#121212', ink: '#FFFFFF' }) : P;
    for (const m of [...plusG, ...plusH]) {
      const { X, store } = stubCtx();
      const ctx = { X, P: pal, font: () => '700 40px Cairo', text: Object.assign(() => {}, { drawKashida: () => {} }), at: () => 0, img: () => null, num: (v) => String(v) };
      for (let t = 0; t <= 6; t += 0.1) assert.doesNotThrow(() => FX[m.id](ctx, t, { s: 0.2, A: () => {}, B: () => {} }), `${m.id} @${t.toFixed(1)}`);
      assert.ok(store.calls > 0, `${m.id} draws something`);
    }
  }
});

test('tracking helpers: trackAt interpolates quad/box/points; placeAt takes static, function or o.track', () => {
  const tr = { frames: [{ t: 1, quad: [[0, 0], [10, 0], [10, 10], [0, 10]] }, { t: 2, quad: [[10, 0], [20, 0], [20, 10], [10, 10]] }] };
  assert.deepStrictEqual(Array.from(FX.trackAt(tr, 1.5).quad[0]), [5, 0]);
  assert.deepStrictEqual(Array.from(FX.trackAt(tr, 9).quad[0]), [10, 0]);
  assert.deepStrictEqual(FX.placeAt({ quad: [[1, 1]] }, 0, 'quad'), [[1, 1]]);
  assert.strictEqual(FX.placeAt({ anchor: (t) => [t, t] }, 3, 'anchor')[0], 3);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(FX.placeAt({ track: { frames: [{ t: 0, box: [0, 0, 100, 50] }] } }, 0, 'anchor'))), [50, 25]);
  assert.strictEqual(FX.placeAt({ track: { frames: [{ t: 0, box: [0, 0, 100, 50] }] } }, 0, 'quad').length, 4);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(FX.placeAt({ track: { frames: [{ t: 0, points: { p: [7, 8] } }] } }, 0, 'p'))), [7, 8]);
  const f = FX.faceAt({ track: { frames: [{ t: 0, box: [100, 200, 300, 400] }] } }, 0);
  assert.strictEqual(f.cx, 250); assert.strictEqual(f.eyes.length, 2);
  assert.strictEqual(FX.cadence(1.0, { s: 0, every: 0.5, n: 10 }).i, 2);
  const mr = FX.morphAt([{ t: 0, rect: { x: 0, y: 0, w: 10, h: 10 } }, { t: 1, rect: { x: 100, y: 0, w: 10, h: 10 } }], 1.16, 0.32);
  assert.ok(mr.x > 40 && mr.x < 60);
});

test('extended moves stay backward compatible: orbit takes cards, iconRain takes keys', () => {
  const { X } = stubCtx(); const P = { bg: '#F0EBE0', ink: '#1B1A17', acc: '#D97757', mut: '#8A847A' };
  const ctx = { X, P, font: () => '', text: () => {}, at: () => 0.5, img: () => null, E: { sineInOut: (k) => k, expoInOut: (k) => k }, prog: () => 0.5, noise1: () => 0 };
  assert.doesNotThrow(() => FX.iconRain(ctx, 1, { s: 0, keys: ['⌘', 'shift'] }));
  assert.match(fs.readFileSync(path.join(MOTION, 'moves.js'), 'utf8'), /o\.cards \? o\.cards\.map/);
});
