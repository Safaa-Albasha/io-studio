'use strict';
// video editor 6.4–6.5.1 port (MIT, licence in third_party/): soft hair cut, depth, SFX bank, moves 353–354, io-review-video.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const VE = path.join(ROOT, 'skills', 'io-video-editor');
const MOTION = path.join(VE, 'motion'), MOVES = path.join(MOTION, 'moves');
const read = (p) => fs.readFileSync(path.join(VE, p), 'utf8');

test('engine version and ported files are in place', () => {
  assert.strictEqual(read('VERSION').trim(), '6.5.1');
  for (const f of ['scripts/depth.js', 'scripts/43_textbox.py', 'scripts/44_matte.py', 'scripts/review/review.py', 'scripts/review/overlay.html',
    'scripts/review/render_overlay.js', 'scripts/review/stage.py', 'scripts/review/cover.html', 'scripts/review/cover_render.js',
    'references/depth.md', 'references/pro-editor.md', 'references/review-video.md', 'sfx/bank.npz'])
    assert.ok(fs.existsSync(path.join(VE, f)), f);
});

test('moves 353–354: catalog, previews, functions in moves.js', () => {
  const j = JSON.parse(read('motion/moves/catalog-plus-j.json')).moves;
  assert.deepStrictEqual(j.map((m) => [m.n, m.id]), [[353, 'pixelList'], [354, 'explode']]);
  for (const m of j) { assert.ok(fs.existsSync(path.join(MOVES, m.preview)), m.preview); assert.match(m.source.label, /NOTICE/); assert.match(m.name, /[؀-ۿ]/); }
  const ids = new Set();
  for (const f of fs.readdirSync(MOVES).filter((f) => /^catalog.*\.json$/.test(f))) for (const m of JSON.parse(fs.readFileSync(path.join(MOVES, f), 'utf8')).moves) {
    assert.ok(!ids.has(m.id), 'duplicate id ' + m.id); ids.add(m.id); }
  assert.ok(ids.size >= 354, String(ids.size));   // the exact total is checked by the newest bank test
  assert.match(read('motion/moves/index.html'), /catalog-plus-j\.json/);
  const demos = require(path.join(MOVES, 'render-preview-j.js'));
  assert.ok(demos.pixelList && demos.explode);
});

test('pixelList and explode draw with theme colours (light/dark) and register cues', () => {
  const grad = { addColorStop() {} };
  const stub = () => { const st = { calls: 0, globalAlpha: 1, filter: 'none' }; return { st, X: new Proxy({}, { get(_, k) {
    if (k in st) return st[k]; if (k === 'measureText') return (s) => ({ width: String(s).length * 28, actualBoundingBoxAscent: 40, actualBoundingBoxDescent: 12 });
    if (k === 'getTransform') return () => ({ a: 1 }); if (/^create(Linear|Radial)Gradient$/.test(k)) return () => grad;
    if (k === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) }); return () => { st.calls++; }; }, set(_, k, v) { st[k] = v; return true; } }) }; };
  const sb = { document: { createElement: () => ({ width: 1, height: 1, getContext: () => stub().X }), fonts: { check: () => false } } }; sb.globalThis = sb; vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(MOTION, 'moves.js'), 'utf8'), sb);
  const FX = sb.FX; assert.strictEqual(typeof FX.pixelList, 'function'); assert.strictEqual(typeof FX.explode, 'function');
  const at = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
  for (const P of [{ bg: '#F0EBE0', ink: '#1B1A17', acc: '#D97757', clay: '#C9A27E' }, { bg: '#121212', ink: '#FFFFFF', acc: '#5AA2D2', clay: '#444444' }]) {
    const cues = []; const { X, st } = stub();
    const ctx = { X, P, at, font: () => '700 40px sans-serif', text: Object.assign(() => {}, {}), hash01: (...n) => (Math.abs(Math.sin(n.reduce((a, b) => a * 31 + b, 7))) % 1),
      findWord: () => 1.2, needFont: () => false, cue: (k, t) => cues.push([k, t]) };
    const L = { s: 0.3, out: 4, title: 'شنو بتتعلم؟', items: [{ text: 'موشن', key: 'موشن' }, { text: 'قص ناعم', at: 2 }] };
    const E = { s: 0.4, out: 4.2, n: 6, labels: [{ i: 3, text: 'الحرارة', at: 1.8, side: 'r' }] };
    for (let t = 0; t <= 5; t += 0.1) { assert.doesNotThrow(() => FX.pixelList(ctx, t, L), 'pixelList @' + t.toFixed(1)); assert.doesNotThrow(() => FX.explode(ctx, t, E), 'explode @' + t.toFixed(1)); }
    assert.ok(st.calls > 0); assert.ok(cues.length > 0, 'MV.cue sounds registered');
  }
});

test('MV exposes cue/findWord/json/headGap and keeps the tracker; render loads depth.js and has cues mode', () => {
  const mc = read('scripts/moves-compose.js');
  for (const k of ['cue, findWord, json', 'trackAt, track', 'headGap']) assert.ok(mc.includes(k), k);
  const r = read('scripts/04_render_frames.js');
  assert.match(r, /'depth\.js':path\.join\(__dirname,'depth\.js'\)/); assert.match(r, /mode==='cues'/); assert.match(r, /moves-plus-i\.js/);
  assert.match(read('scripts/11_behind_text.js'), /44_matte\.py/);
  assert.match(read('scripts/05_sfx.py'), /bank\.npz/); assert.match(read('scripts/05_sfx.py'), /_LIB=/);   // our library/sfx still mixed in
});

test('io-review-video skill points at the shared engine; sibling skills use the real folder', () => {
  const s = fs.readFileSync(path.join(ROOT, 'skills', 'io-review-video', 'SKILL.md'), 'utf8');
  assert.match(s, /^name: io-review-video$/m); assert.match(s, /\$\{CLAUDE_SKILL_DIR\}\/\.\.\/io-video-editor/);
  for (const d of fs.readdirSync(path.join(ROOT, 'skills'))) {
    const f = path.join(ROOT, 'skills', d, 'SKILL.md'); if (!fs.existsSync(f)) continue;
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/\$\{CLAUDE_SKILL_DIR\}\/\.\.\/([\w-]+)/g)) assert.ok(fs.existsSync(path.join(ROOT, 'skills', m[1])), d + ' → ' + m[1]);
  }
});

test('ported text carries no personal names, affiliate codes or upstream data paths', () => {
  const files = ['references/depth.md', 'references/pro-editor.md', 'references/review-video.md', 'scripts/depth.js', 'scripts/43_textbox.py', 'scripts/44_matte.py',
    'scripts/41_review.py', 'scripts/02_captions.py', 'references/moves.md', 'references/keyword-automation.md', 'scripts/review/review.py'];
  for (const f of files) { const s = read(f); assert.doesNotMatch(s, /ماجد|عزيز|CUKTECH|كود \*\*MAJED|video-ad-editor/, f); }
  assert.match(read('scripts/41_review.py'), /\.io-editor/);
  assert.match(fs.readFileSync(path.join(ROOT, 'third_party', 'NOTICE.md'), 'utf8'), /6\.4\.0 → 6\.5\.1/);
});
