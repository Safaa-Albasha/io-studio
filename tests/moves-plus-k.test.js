'use strict';
// Motion bank 355–358 (moves-plus-k.js · «ريلز الأدوات والبودكاست»): catalog, loader order, theme-only colours, smoke run.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const VE = path.join(__dirname, '..', 'skills', 'io-video-editor');
const MOTION = path.join(VE, 'motion'), MOVES = path.join(MOTION, 'moves');
const plusK = JSON.parse(fs.readFileSync(path.join(MOVES, 'catalog-plus-k.json'), 'utf8')).moves;
const stubCtx = () => {
  const store = { globalAlpha: 1, filter: 'none', calls: 0 }, grad = { addColorStop() {} };
  return { store, X: new Proxy({}, { get(_, k) { if (k in store) return store[k]; if (k === 'measureText') return (s) => ({ width: String(s).length * 30 });
    if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad; return () => { store.calls++; }; }, set(_, k, v) { store[k] = v; return true; } }) };
};
const sb = { document: { createElement: () => ({ width: 1, height: 1, getContext: () => stubCtx().X }) } }; sb.globalThis = sb; vm.createContext(sb);
for (const f of ['moves-plus-g.js', 'moves-plus-h.js', 'moves-plus-i.js', 'moves-plus-k.js']) vm.runInContext(fs.readFileSync(path.join(MOTION, f), 'utf8'), sb);
const FX = sb.FX;

test('moves 355–358: functions, previews, I/O Studio source, Arabic names; bank total 358 with unique ids', () => {
  assert.deepStrictEqual(plusK.map((m) => m.n), [355, 356, 357, 358]);
  const demos = require(path.join(MOVES, 'render-preview-k.js'));
  for (const m of plusK) {
    assert.strictEqual(typeof FX[m.id], 'function', m.id);
    assert.ok(fs.existsSync(path.join(MOVES, m.preview)), m.id);
    assert.match(m.source.label, /^I\/O Studio/); assert.match(m.name, /[؀-ۿ]/); assert.ok(demos[m.id], `demo ${m.id}`);
  }
  const ids = new Set(), ns = new Set();
  for (const f of fs.readdirSync(MOVES).filter((f) => /^catalog.*\.json$/.test(f))) for (const m of JSON.parse(fs.readFileSync(path.join(MOVES, f), 'utf8')).moves) {
    assert.ok(!ids.has(m.id), m.id); ids.add(m.id); assert.ok(!ns.has(m.n), String(m.n)); ns.add(m.n); }
  assert.strictEqual(ids.size, 358); assert.strictEqual(Math.max(...ns), 358);
});

test('moves-plus-k.js loads after moves-plus-i.js everywhere', () => {
  for (const f of ['motion/engine.html', 'scripts/compose.REFERENCE.html', 'scripts/04_render_frames.js', 'scripts/08_safe_check.js']) {
    const s = fs.readFileSync(path.join(VE, f), 'utf8');
    assert.ok(s.includes('moves-plus-k.js') && s.lastIndexOf('moves-plus-i.js') < s.lastIndexOf('moves-plus-k.js'), f);
  }
  assert.match(fs.readFileSync(path.join(MOVES, 'index.html'), 'utf8'), /catalog-plus-k\.json/);
  assert.match(fs.readFileSync(path.join(VE, 'references', 'moves.md'), 'utf8'), /\*\*358 حركة\*\*/);
});

test('moves-plus-k.js is generic and theme-coloured', () => {
  const src = fs.readFileSync(path.join(MOTION, 'moves-plus-k.js'), 'utf8');
  assert.doesNotMatch(src, /hojas|هوجاس|safaa|صفاء|majed|ماجد|@[a-z]{3}|instagram|tiktok|youtube/i);
  for (const h of new Set((src.match(/#[0-9A-Fa-f]{6}\b/g) || []).map((x) => x.toUpperCase()))) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); assert.ok(Math.max(r, g, b) - Math.min(r, g, b) <= 40, h);
  }
});

test('moves 355–358 draw without throwing (light/dark, no options) and register sounds', () => {
  const P = { bg: '#F0EBE0', ink: '#1B1A17', acc: '#D97757', mut: '#8A847A' };
  for (const pal of [P, Object.assign({}, P, { bg: '#121212', ink: '#FFFFFF' })]) for (const m of plusK) {
    const { X, store } = stubCtx(); const cues = [];
    const ctx = { X, P: pal, font: () => '700 40px sans-serif', text: Object.assign(() => { store.calls++; }, {}), at: () => 0, img: () => null, cue: (k) => cues.push(k) };
    for (let t = 0; t <= 6; t += 0.1) assert.doesNotThrow(() => FX[m.id](ctx, t, { s: 0.2 }), `${m.id} @${t.toFixed(1)}`);
    assert.ok(store.calls > 0, m.id);
    if (m.id !== 'seriesDayTag') assert.ok(cues.length > 0, m.id + ' cue');
  }
});
