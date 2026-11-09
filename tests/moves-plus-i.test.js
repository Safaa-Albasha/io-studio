'use strict';
// Motion bank 329–352 (moves-plus-i.js · «كولاج تحريري ومونتاج المؤثرات»): catalog, loader order, theme-only colours, smoke run.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const VE = path.join(__dirname, '..', 'skills', 'io-video-editor');
const MOTION = path.join(VE, 'motion'), MOVES = path.join(MOTION, 'moves');
const plusI = JSON.parse(fs.readFileSync(path.join(MOVES, 'catalog-plus-i.json'), 'utf8')).moves;
const stubCtx = () => {
  const store = { globalAlpha: 1, filter: 'none', calls: 0 }, grad = { addColorStop() {} };
  return { store, X: new Proxy({}, { get(_, k) { if (k in store) return store[k]; if (k === 'measureText') return (s) => ({ width: String(s).length * 30 });
    if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad; return () => { store.calls++; }; }, set(_, k, v) { store[k] = v; return true; } }) };
};
const sb = { document: { createElement: () => ({ width: 1, height: 1, getContext: () => stubCtx().X }) } }; sb.globalThis = sb; vm.createContext(sb);
for (const f of ['moves-plus-g.js', 'moves-plus-h.js', 'moves-plus-i.js']) vm.runInContext(fs.readFileSync(path.join(MOTION, f), 'utf8'), sb);
const FX = sb.FX;

test('moves 329–352: functions, previews, I/O Studio source, Arabic names', () => {
  assert.deepStrictEqual(plusI.map((m) => m.n), Array.from({ length: 24 }, (_, i) => 329 + i));
  const demos = require(path.join(MOVES, 'render-preview-i.js'));
  for (const m of plusI) {
    assert.strictEqual(typeof FX[m.id], 'function', m.id);
    assert.ok(fs.existsSync(path.join(MOVES, m.preview)), m.id);
    assert.match(m.source.label, /^I\/O Studio/); assert.match(m.name, /[؀-ۿ]/); assert.ok(demos[m.id], `demo ${m.id}`);
  }
});

test('moves-plus-i.js loads after moves-plus-h.js everywhere', () => {
  for (const f of ['motion/engine.html', 'scripts/compose.REFERENCE.html', 'scripts/04_render_frames.js', 'scripts/08_safe_check.js']) {
    const s = fs.readFileSync(path.join(VE, f), 'utf8');
    assert.ok(s.lastIndexOf('moves-plus-h.js') < s.lastIndexOf('moves-plus-i.js'), f);
  }
  assert.match(fs.readFileSync(path.join(MOVES, 'index.html'), 'utf8'), /catalog-plus-i\.json/);
});

test('moves-plus-i.js is generic and theme-coloured', () => {
  const src = fs.readFileSync(path.join(MOTION, 'moves-plus-i.js'), 'utf8');
  assert.doesNotMatch(src, /safaa|صفاء|majed|ماجد|@[a-z]{3}|instagram|tiktok|youtube|claude|notion/i);
  for (const h of new Set((src.match(/#[0-9A-Fa-f]{6}\b/g) || []).map((x) => x.toUpperCase()))) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); assert.ok(Math.max(r, g, b) - Math.min(r, g, b) <= 40, h);
  }
});

test('moves 329–352 draw without throwing (light/dark, no options)', () => {
  const P = { bg: '#F0EBE0', ink: '#1B1A17', acc: '#D97757', mut: '#8A847A' };
  for (const pal of [P, Object.assign({}, P, { bg: '#121212', ink: '#FFFFFF' })]) for (const m of plusI) {
    const { X, store } = stubCtx(); const ctx = { X, P: pal, font: () => '', text: Object.assign(() => {}, {}), at: () => 0, img: () => null };
    for (let t = 0; t <= 6; t += 0.1) assert.doesNotThrow(() => FX[m.id](ctx, t, { s: 0.2 }), `${m.id} @${t.toFixed(1)}`);
    assert.ok(store.calls > 0, m.id);
  }
});
