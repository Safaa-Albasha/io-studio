'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const G = require('../engine/grade.js');

const ROOT = path.resolve(__dirname, '..');
const LIB = path.join(ROOT, 'library', 'looks');
const cat = G.loadCatalog();

test('catalog: 40+ looks, unique ids, Arabic names, known groups/kinds, no film-brand names', () => {
  assert.ok(cat.looks.length >= 40);
  assert.ok(cat.looks.filter((l) => l.kind === 'color').length >= 35);
  const ids = cat.looks.map((l) => l.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  for (const l of cat.looks) {
    assert.match(l.id, /^[a-z][a-z0-9_]*$/, l.id);
    assert.match(l.ar, /[؀-ۿ]/, l.id);
    assert.ok(l.en && l.use && l.mood, l.id);
    assert.ok(cat.groups[l.group], `${l.id}: group ${l.group}`);
    assert.ok(['color', 'combo', 'fx'].includes(l.kind), l.id);
    assert.doesNotMatch(JSON.stringify(l), /kodak|fuji|portra|velvia|cinestill|كوداك|فوجي/i, l.id);
    if (l.kind === 'color') assert.ok(l.ops && l.ops.length && !l.fx, l.id);
    if (l.kind === 'fx') assert.ok(!l.ops && !l.base && l.fx.length, l.id);
    if (l.kind === 'combo') assert.ok((l.ops || l.base) && l.fx.length, l.id);
  }
});

test('every look definition parses (ops valid, fx known, base resolves)', () => {
  for (const l of cat.looks) {
    assert.deepStrictEqual(G.validateOps(G.colorOps(cat, l)), [], l.id);
    for (const f of l.fx || []) assert.ok(G.FX[f.name], `${l.id}: fx ${f.name}`);
    const fn = G.compile(G.colorOps(cat, l));
    for (const c of [[0, 0, 0], [1, 1, 1], [0.5, 0.5, 0.5], [0.9, 0.6, 0.45], [0.1, 0.4, 0.8]]) {
      const o = fn(c);
      assert.ok(o.every((v) => Number.isFinite(v) && v >= 0 && v <= 1), `${l.id} → ${o}`);
    }
  }
});

test('colour maths: identity, strength 0, mono, monotone curve', () => {
  const id = G.compile([]);
  assert.deepStrictEqual(id([0.2, 0.4, 0.6]), [0.2, 0.4, 0.6]);
  const warm = G.colorOps(cat, G.getLook(cat, 'warm_film'));
  const z = G.compile(warm, 0)([0.3, 0.5, 0.7]);
  z.forEach((v, i) => assert.ok(Math.abs(v - [0.3, 0.5, 0.7][i]) < 1e-12));
  const w = G.compile(warm)([0.5, 0.5, 0.5]);
  assert.ok(w[0] > w[2], 'warm look should push red over blue on grey');
  const bw = G.compile(G.colorOps(cat, G.getLook(cat, 'noir_classic')))([0.8, 0.2, 0.3]);
  assert.ok(Math.abs(bw[0] - bw[1]) < 1e-9 && Math.abs(bw[1] - bw[2]) < 1e-9);
  const cv = G.monoCurve([[0, 0.1], [0.5, 0.4], [1, 0.95]]);
  let prev = -1;
  for (let x = 0; x <= 1.0001; x += 0.01) { const y = cv(x); assert.ok(y >= prev - 1e-12); prev = y; }
  assert.ok(Math.abs(cv(0.5) - 0.4) < 1e-9);
});

test('.cube text: header, size, row count, domain, red-fastest order', () => {
  const txt = G.cubeText(G.compile([]), 5, 'id');
  const c = G.parseCube(txt);
  assert.match(txt, /^TITLE "id"/);
  assert.match(txt, /\nLUT_3D_SIZE 5\n/);
  assert.match(txt, /\nDOMAIN_MIN 0.0 0.0 0.0\nDOMAIN_MAX 1.0 1.0 1.0\n/);
  assert.strictEqual(c.size, 5); assert.strictEqual(c.data.length, 125);
  assert.deepStrictEqual(c.data[1], [0.25, 0, 0]);
  assert.deepStrictEqual(c.data[5], [0, 0.25, 0]);
  assert.deepStrictEqual(c.data[124], [1, 1, 1]);
});

test('generated luts/: one 33³ cube per colour look, none for fx', (t) => {
  if (!fs.existsSync(path.join(__dirname, '..', 'library', 'looks', 'luts'))) return t.skip('luts/ not built (node engine/grade.js build)');
  const dir = path.join(LIB, 'luts');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.cube')).sort();
  assert.deepStrictEqual(files, cat.looks.filter((l) => l.kind === 'color').map((l) => `${l.id}.cube`).sort());
  for (const f of files.slice(0, 3).concat(['teal_orange.cube'])) {
    const c = G.parseCube(fs.readFileSync(path.join(dir, f), 'utf8'));
    assert.strictEqual(c.size, 33, f);
    assert.strictEqual(c.data.length, 33 ** 3, f);
    assert.ok(c.data.every((r) => r.length === 3 && r.every((v) => v >= 0 && v <= 1)), f);
  }
  // الملف المخزّن = نفس الرياضيات
  const to = G.parseCube(fs.readFileSync(path.join(dir, 'teal_orange.cube'), 'utf8'));
  const fn = G.compile(G.colorOps(cat, G.getLook(cat, 'teal_orange')));
  const idx = (r, g, b) => r + 33 * g + 33 * 33 * b;
  for (const [r, g, b] of [[0, 0, 0], [16, 16, 16], [32, 10, 4], [5, 20, 30]]) {
    const e = fn([r / 32, g / 32, b / 32]);
    to.data[idx(r, g, b)].forEach((v, i) => assert.ok(Math.abs(v - e[i]) < 1e-4));
  }
  for (const l of cat.looks.filter((x) => x.kind !== 'fx')) assert.ok(fs.existsSync(path.join(LIB, 'previews', `${l.id}.jpg`)), l.id);
  for (const l of cat.looks.filter((x) => x.kind === 'fx')) assert.ok(!G.isLutable(cat, l), l.id);
});

test('filter graphs: lut3d first, fx chained, unique labels, single [vout]', () => {
  const g1 = G.buildGraph(cat, G.getLook(cat, 'teal_orange'), { w: 1080, h: 1920 });
  assert.strictEqual(g1, '[0:v]lut3d=file=look.cube:interp=tetrahedral[v1];[v1]format=yuv420p[vout]');
  const g2 = G.buildGraph(cat, G.getLook(cat, 'grain_light'), { w: 1080, h: 1920 });
  assert.doesNotMatch(g2, /lut3d/);
  assert.match(g2, /noise=alls=7:allf=t/);
  for (const l of cat.looks) {
    const g = G.buildGraph(cat, l, { w: 1080, h: 1920 });
    assert.ok(g.startsWith('[0:v]'), l.id);
    assert.ok(g.endsWith('[vout]'), l.id);
    // كل label ينكتب كمخرج مرة وحدة بس
    const outs = [...g.matchAll(/\[([a-z]+\d+)\](?=;|$)/g)].map((m) => m[1]);
    assert.strictEqual(new Set(outs).size, outs.length, `${l.id}: duplicate labels`);
    assert.strictEqual((g.match(/\[vout\]/g) || []).length, 1, l.id);
  }
  const lb = G.buildGraph(cat, G.getLook(cat, 'letterbox'), { w: 1920, h: 1080 });
  assert.match(lb, /drawbox=.*h='max\(0,\(ih-iw\/2\.39\)\/2\)'/);
  const scr = G.buildGraph(cat, G.getLook(cat, 'old_film'), { w: 1080, h: 1920 });
  assert.match(scr, /scale=1080:1920/);
});

test('auto-correct: neutral image untouched, yellow/dark image fixed', () => {
  const frame = (fn) => { const b = Buffer.alloc(64 * 64 * 3); for (let i = 0; i < 64 * 64; i++) { const v = (i % 64) / 63; const c = fn(v); b[i * 3] = c[0]; b[i * 3 + 1] = c[1]; b[i * 3 + 2] = c[2]; } return b; };
  const ok = G.autoFromPixels([frame((v) => [v * 255, v * 255, v * 255])]);
  assert.deepStrictEqual(ok.ops, []);
  const bad = G.autoFromPixels([frame((v) => [40 + v * 150, 35 + v * 140, 20 + v * 100])]);
  const gains = bad.ops.find((o) => o.op === 'gains');
  assert.ok(gains && gains.rgb[2] > gains.rgb[0], 'should cool a yellow image');
  const lv = bad.ops.find((o) => o.op === 'levels');
  assert.ok(lv && lv.inBlack > 0 && lv.inWhite < 1);
  assert.ok(bad.notes.length >= 2);
});

test('skill + page', () => {
  const s = fs.readFileSync(path.join(ROOT, 'skills', 'io-color-grade', 'SKILL.md'), 'utf8');
  assert.match(s, /^---\nname: io-color-grade\n/);
  const ids = new Set(cat.looks.map((l) => l.id));
  for (const m of s.matchAll(/`([a-z]+_[a-z0-9_]+)`/g)) if (!['skin_safe'].includes(m[1])) assert.ok(ids.has(m[1]), `skill mentions unknown look ${m[1]}`);
  const page = fs.readFileSync(path.join(ROOT, 'web', 'looks.html'), 'utf8');
  assert.match(page, /dir="rtl"/);
  const emb = JSON.parse(/<script id="catalog" type="application\/json">([\s\S]*?)<\/script>/.exec(page)[1]);
  assert.strictEqual(emb.looks.length, cat.looks.length, 'embedded catalog out of date — run node engine/grade.js build');
});
