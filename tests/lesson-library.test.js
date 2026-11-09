'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const SS = require('../web/lib/scene-core.js');

const ROOT = path.join(__dirname, '..');
const LIB = path.join(ROOT, 'library', 'lessons');

/** A fake 2D canvas context: every call is a no-op, but numbers must be finite. */
function mockCtx(W, H) {
  const bad = [];
  const grad = { addColorStop() {} };
  const state = { font: '40px x', globalAlpha: 1, lineWidth: 1 };
  const fns = {
    measureText: (s) => ({ width: String(s).length * parseFloat((String(state.font).match(/(\d+(?:\.\d+)?)px/) || [0, '40'])[1]) * 0.5 }),
    createRadialGradient: () => grad, createLinearGradient: () => grad,
  };
  const ctx = new Proxy({ canvas: { width: W, height: H } }, {
    get(target, k) {
      if (k in target) return target[k];
      if (k in state) return state[k];
      if (fns[k]) return (...a) => { check(k, a); return fns[k](...a); };
      return (...a) => check(k, a);
    },
    set(target, k, v) { if (typeof v === 'number' && !Number.isFinite(v)) bad.push(`${String(k)}=${v}`); state[k] = v; return true; },
  });
  function check(k, a) { a.forEach((v) => { if (typeof v === 'number' && !Number.isFinite(v)) bad.push(`${String(k)}(${a.join(',')})`); }); }
  return { ctx, bad };
}

function renderAll(scene, steps) {
  const [W, H] = SS.FORMATS[scene.format];
  const { ctx, bad } = mockCtx(W, H);
  const tl = SS.timeline(scene), total = SS.totalDuration(scene);
  for (let i = 0; i <= steps; i++) SS.drawScene(ctx, scene, (total * i) / steps, { timeline: tl, strict: true, handle: '@x' });
  // and the middle of every item, where pen tips and partial strokes are drawn
  tl.forEach((b) => (b.items || []).forEach((it) => SS.drawScene(ctx, scene, it.start + it.dur / 2, { timeline: tl, strict: true })));
  return bad;
}

// one valid example per board kind
const EXAMPLES = {
  draw: [{ shape: 'line', from: [100, 100], to: [300, 100] }, { shape: 'arrow', from: [100, 200], to: [300, 260] }, { shape: 'double-arrow', from: [100, 300], to: [300, 300] },
    { shape: 'circle', center: [500, 500], r: 100, fill: 'blue' }, { shape: 'ellipse', center: [500, 500], rx: 120, ry: 60 }, { shape: 'rect', x: 600, y: 100, w: 200, h: 100, fill: true },
    { shape: 'polygon', points: [[100, 600], [300, 600], [200, 450]] }, { shape: 'path', d: 'M 100 800 L 200 700 Q 300 650 400 700 C 450 720 500 760 550 800 H 650 V 900 z' },
    { shape: 'path', points: [[700, 700], [800, 800]] }, { shape: 'curve', points: [[100, 900], [300, 850], [500, 950]] }, { shape: 'text', text: 'نص', at: [500, 50] }, { shape: 'emoji', value: '☀️', at: [900, 100] }],
  write: ['سطر تلقائي', { text: 'a² + b² = c²', at: [500, 400], underline: true }, { text: 'الجواب', at: [500, 600], box: 'green', align: 'right' }],
  highlight: [{ box: [100, 100, 300, 80] }, { box: [100, 300, 300, 80], kind: 'circle' }, { box: [100, 500, 300, 80], kind: 'underline' }, { box: [100, 700, 300, 80], kind: 'box' }],
  label: { text: 'النواة', at: [500, 500], from: [800, 300] },
  numberline: { from: 0, to: 10, jumps: [{ from: 3, by: 4 }, { by: -2 }], marker: '🐸', mark: [5] },
  fraction: ['3/4', { n: 2, d: 5, kind: 'bar', at: [500, 700], text: 'خُمسان' }],
  grid: [{ cols: 4, rows: 3, fill: 'all', dots: true, numbers: true, top: 'أ', side: 'ب' }, { cols: 5, rows: 3, fill: 7 }],
  axes: { x: [-4, 4], y: [-3, 5], ticksX: [{ v: 3.14159, t: 'π' }] },
  plot: [{ fn: '2x+1', label: 'ص = ٢س + ١', points: [[0, 1], [1, 3]] }, 'tan(x)', { fn: 'sqrt(x)', x: [0, 4] }],
  geometry: [{ shape: 'triangle', points: [[150, 750], [550, 750], [550, 450]], right: 1, sides: ['4', '3', '5'], angles: ['37°', null, '53°'], vertices: ['أ', 'ب', 'ج'] },
    { shape: 'circle', center: [700, 300], r: 140, radius: 'نق', diameter: 'ق', centerLabel: 'م' }, { shape: 'rect', x: 100, y: 100, w: 300, h: 200, right: 'all', sides: ['5', '3'] }],
  equation: [['2x + 3 = 11', '2x = 8', 'x = 4'], { lines: ['س + ٢ = ٥', 'س = ٣'], at: [500, 600] }],
  table: { rows: [['س', 'ص'], [0, 1], [1, 3]] },
  projectile: { v0: 20, angle: 45 },
  pendulum: [{}, { length: [1, 0.25], angle: 20 }],
  incline: { angle: 30, mass: 2, mu: 0.2, components: true },
  spring: { k: 20, m: 0.5 },
  circuit: [{ bulbs: 2, switch: 1, volts: 9, current: true }, { switch: 'open' }],
  wave: {},
  orbit: { planets: [{ name: 'الأرض', r: 300, period: 6, moon: true }] },
  lens: [{ type: 'convex', f: 150, object: { d: 300, h: 110 } }, { type: 'concave' }, { f: 200, object: { d: 110, h: 70 } }],
  ray: { angle: 40 },
  freefall: [{ height: 20 }, { height: 5, objects: ['🪶', '🔨'] }],
  chemistry: ['H2O', 'CO2', 'CH4', 'NH3', { reaction: { left: ['2H2', 'O2'], right: ['2H2O'], over: 'شرارة' } }, { molecule: { atoms: [['Na', -0.6, 0], ['Cl', 0.6, 0]], bonds: [[0, 1, 1]] } }],
  biology: ['animal-cell', 'plant-cell'],
  geography: [{ preset: 'world', oceans: true, pins: [{ lonlat: [44.4, 33.3], label: 'بغداد' }] }, { preset: 'none', shapes: [{ points: [[100, 300], [400, 250], [450, 600], [150, 650]], label: 'جزيرة' }], pins: [{ at: [300, 400], emoji: '⛰️' }] }],
  timeline: { events: [{ year: 762, label: 'تأسيس بغداد' }, { year: '1258', label: 'سقوط بغداد', emoji: '🏰' }, { year: 1921, label: 'المملكة العراقية' }] },
  alphabet: [{ letter: 'ب', word: 'بطة', emoji: '🦆' }, 'ش'],
};
// one invalid example per kind (each must produce at least one error)
const BAD = {
  draw: { shape: 'star' }, write: { text: '' }, highlight: { box: [1, 2] }, label: { text: 'x' }, numberline: { from: 5, to: 1 },
  fraction: { n: 5, d: 4 }, grid: { cols: 0, rows: 3 }, axes: { x: [3, 1] }, plot: { fn: 'alert(1)' }, geometry: { shape: 'triangle', points: [[0, 0]] },
  equation: { lines: [] }, table: { rows: 'x' }, projectile: { v0: 20, angle: 95 }, pendulum: { angle: 60 }, incline: { angle: 80 }, spring: { k: -1 },
  circuit: { bulbs: 9 }, wave: { wavelength: 10 }, orbit: { planets: [{ r: -1 }] }, lens: { type: 'mirror' }, ray: { angle: 89 }, freefall: { height: -3 },
  chemistry: { molecule: 'XYZ' }, biology: { diagram: 'heart' }, geography: { preset: 'mars' }, timeline: { events: [{ year: 1, label: 'x' }] }, alphabet: { letter: 'Z' },
};

test('every board kind has a valid and an invalid example', () => {
  assert.deepStrictEqual(Object.keys(EXAMPLES).sort(), SS.BOARD_KINDS.slice().sort());
  for (const k of SS.BOARD_KINDS) {
    const ok = SS.normalizeScene({ beats: [{ say: 'x', [k]: EXAMPLES[k] }] });
    assert.deepStrictEqual(ok.errors, [], k);
    const bad = SS.normalizeScene({ beats: [{ say: 'x', [k]: BAD[k] }] });
    assert.ok(bad.errors.length >= 1 && bad.errors.every((e) => e.startsWith(`beats[0].${k}`)), `${k}: ${bad.errors}`);
  }
});

test('every kind draws in every style and format without errors or NaN', () => {
  for (const style of SS.STYLES) for (const format of Object.keys(SS.FORMATS)) {
    const beats = SS.BOARD_KINDS.map((k, i) => ({ say: 'شرح قصير هنا', [k]: EXAMPLES[k], erase: i % 3 === 0 }));
    beats.splice(4, 0, { say: 'سؤال', quiz: { options: ['🍌', '🦆'], answer: 1 } }, { say: 'عد', count: { item: '🦆', n: 3 } }, { say: 'تحول', morph: { to: '🦆' } }, { say: 'نكتب', reveal: 'باب', celebrate: true });
    const { scene, errors } = SS.normalizeScene({ format, style, numerals: format === '9:16' ? 'arabic' : 'western', title: 'عنوان', character: style === 'paper' ? false : undefined, beats });
    assert.deepStrictEqual(errors, []);
    assert.deepStrictEqual(renderAll(scene, 40), [], `${style} ${format}`);
  }
});

test('styles: defaults, validation and hidden character', () => {
  assert.strictEqual(SS.normalizeScene({ beats: [{ say: 'x' }] }).scene.style, 'cartoon');
  assert.ok(SS.normalizeScene({ style: 'neon', beats: [{ say: 'x' }] }).errors[0].startsWith('style'));
  const { scene } = SS.normalizeScene({ style: 'chalkboard', character: false, board: { frame: false }, beats: [{ say: 'x' }] });
  assert.strictEqual(scene.character.hidden, true);
  assert.strictEqual(scene.board.frame, false);
  assert.ok(scene.character.skin);
  assert.ok(SS.normalizeScene({ beats: [{ say: 'x', erase: 'yes' }] }).errors[0].includes('erase'));
});

test('9:16 board layout stays inside the safe area', () => {
  for (const ch of [{}, { position: 'left' }, { hidden: true }]) {
    const B = SS.boardLayout(1080, 1920, { character: ch });
    assert.ok(B.rect.x >= 140 && B.rect.x + B.rect.s <= 940 && B.rect.y >= 220 && B.rect.y + B.rect.s <= 1440);
    assert.ok(B.cap.x0 >= 140 && B.cap.x1 <= 940 && B.cap.y0 >= 220 && B.cap.y1 <= 1440);
    assert.ok(B.title.y - B.title.px / 2 >= 220);
    if (B.tch) assert.ok(B.tch.y - 190 * B.tch.s >= 220 && B.tch.y + 290 * B.tch.s <= 1440 && B.tch.x - 170 * B.tch.s >= 140 && B.tch.x + 140 * B.tch.s <= 940);
  }
});

test('compileExpr: a safe math parser, no eval', () => {
  const f = (s, x) => SS.compileExpr(s)(x);
  assert.strictEqual(f('2x+1', 3), 7);
  assert.strictEqual(f('2*x^2 - 3', 2), 5);
  assert.strictEqual(f('-x^2', 3), -9);
  assert.strictEqual(f('2^3^2', 0), 512);
  assert.strictEqual(f('2(x+1)', 1), 4);
  assert.strictEqual(f('3sin(pi/2)', 0), 3);
  assert.strictEqual(f('sqrt(abs(x))', -16), 4);
  assert.ok(Math.abs(f('tan(pi/4)', 0) - 1) < 1e-12);
  assert.ok(Math.abs(f('cos(π)', 0) + 1) < 1e-12);
  assert.strictEqual(f('س*2', 4), 8); // س is x
  for (const bad of ['alert(1)', 'x;1', 'constructor', 'x=>x', '2+', '(x', 'sin x', 'process.exit()', '', '٢x']) assert.throws(() => SS.compileExpr(bad), bad);
});

test('parsePath: absolute, relative, curves and close', () => {
  const subs = SS.parsePath('M 0 0 L 10 0 l 0 10 H 0 z M 20 20 q 5 -5 10 0 C 40 20 50 30 60 20');
  assert.strictEqual(subs.length, 2);
  assert.deepStrictEqual(subs[0], [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]);
  assert.deepStrictEqual(subs[1][subs[1].length - 1], [60, 20]);
  assert.throws(() => SS.parsePath('L 1 2'));
  assert.throws(() => SS.parsePath('M 0 0 A 1 1 0 0 0 5 5'));
});

test('board items run in order, persist across beats and clear on erase / stage beats', () => {
  const { scene } = SS.normalizeScene({ style: 'chalkboard', beats: [
    { say: 'واحد', draw: { shape: 'line', from: [0, 0], to: [500, 0] }, write: 'سطر' },
    { say: 'اثنين', write: { text: 'مع', at: [1, 1], with: true } },
    { say: 'ثلاثة', erase: true, axes: {}, plot: '2x' },
    { say: 'أربعة', show: 'ب' },
  ] });
  const tl = SS.timeline(scene);
  const [a, b] = tl[0].items;
  assert.ok(b.start >= a.start + a.dur, 'sequential');
  assert.ok(tl[0].end >= b.start + b.dur, 'beat long enough');
  assert.ok(a.pos === undefined && b.pos, 'auto position for write without at');
  assert.strictEqual(tl[1].board.length, 3);
  assert.strictEqual(tl[2].erased.length, 3);
  assert.strictEqual(tl[2].board.length, 2);
  assert.strictEqual(tl[2].items[1].axes, scene.beats[2].axes, 'plot uses the axes on the board');
  assert.ok(tl[2].items[0].at >= 0.9, 'drawing waits for the eraser');
  assert.strictEqual(tl[3].board.length, 0);
  for (let i = 1; i < tl.length; i++) assert.strictEqual(tl[i].start, tl[i - 1].end);
});

test('physics durations follow the real formulas', () => {
  const tl = (b) => SS.timeline(SS.normalizeScene({ beats: [Object.assign({ say: 'x' }, b)] }).scene)[0].items[0];
  // projectile 20 m/s at 45°: flight time 2·v0·sinθ/g = 2.886 s
  assert.ok(Math.abs(tl({ projectile: { v0: 20, angle: 45 } }).dur - (1 + 2.886 + 2)) < 0.01);
  // free fall from 20 m: t = √(2h/g) = 2.02 s
  assert.ok(Math.abs(tl({ freefall: { height: 20 } }).dur - (1 + 2.0203 + 1.6)) < 0.01);
  // slow motion doubles the flight part
  assert.ok(Math.abs(tl({ projectile: { v0: 20, angle: 45, speed: 0.5 } }).dur - (1 + 5.772 + 2)) < 0.01);
});

test('fmt and numerals', () => {
  assert.strictEqual(SS.fmt(40.8163, 'arabic', 1), '٤٠٫٨');
  assert.strictEqual(SS.fmt(2.0, 'western'), '2');
  assert.strictEqual(SS.fmt(-0.0001, 'western', 1), '0.0');
});

test('28 Arabic letters for tracing, each with strokes inside the box', () => {
  const L = SS.LETTERS;
  assert.strictEqual(Object.keys(L).length, 28);
  for (const [ch, d] of Object.entries(L)) {
    assert.ok(d.name && d.strokes.length >= 1, ch);
    for (const st of d.strokes) for (const [x, y] of st) assert.ok(x >= 150 && x <= 900 && y >= 200 && y <= 900, ch);
    for (const [x, y] of d.dots) assert.ok(x >= 150 && x <= 900 && y >= 200 && y <= 900, ch);
  }
});

// ------------------------------------------------------------ the library
const files = fs.existsSync(LIB) ? fs.readdirSync(LIB).filter((f) => f.endsWith('.json') && f !== 'catalog.json').sort() : [];
const catalog = fs.existsSync(path.join(LIB, 'catalog.json')) ? JSON.parse(fs.readFileSync(path.join(LIB, 'catalog.json'), 'utf8')) : null;

test('library: at least 50 valid lessons, mixed styles, formats and subjects', () => {
  assert.ok(files.length >= 50, `${files.length} lessons`);
  const styles = new Set(), formats = new Set();
  for (const f of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(LIB, f), 'utf8'));
    const { scene, errors } = SS.normalizeScene(raw);
    assert.deepStrictEqual(errors, [], f);
    assert.ok(scene.title && scene.beats.length >= 4, f);
    styles.add(scene.style); formats.add(scene.format);
    assert.deepStrictEqual(renderAll(scene, 30), [], f);
  }
  for (const s of SS.STYLES) assert.ok(styles.has(s), s);
  assert.ok(formats.has('9:16') && formats.has('16:9'));
});

test('library: catalog.json matches the lesson files', () => {
  assert.ok(catalog && Array.isArray(catalog.lessons));
  assert.deepStrictEqual(catalog.lessons.map((l) => l.file).sort(), files);
  const ids = new Set();
  for (const l of catalog.lessons) {
    assert.ok(!ids.has(l.id), 'unique id ' + l.id); ids.add(l.id);
    const { scene } = SS.normalizeScene(fs.readFileSync(path.join(LIB, l.file), 'utf8'));
    assert.strictEqual(l.title, scene.title, l.id);
    assert.strictEqual(l.style, scene.style, l.id);
    assert.strictEqual(l.format, scene.format, l.id);
    assert.strictEqual(l.beats, scene.beats.length, l.id);
    assert.ok(Math.abs(l.duration - SS.totalDuration(scene)) < 0.6, l.id);
    for (const k of ['subject', 'subjectLabel', 'level']) assert.ok(typeof l[k] === 'string' && l[k], `${l.id}.${k}`);
  }
  const subjects = new Set(catalog.lessons.map((l) => l.subject));
  for (const s of ['arabic', 'english', 'math', 'science', 'physics', 'chemistry', 'biology', 'geography', 'history', 'life', 'creators']) assert.ok(subjects.has(s), s);
  assert.strictEqual(catalog.count, catalog.lessons.length);
});

test('library: every lesson has an age stage, and every stage, style and character gender is covered', () => {
  const STAGES = ['kindergarten', 'primary', 'middle', 'secondary', 'adults'];
  assert.deepStrictEqual(Object.keys(catalog.stages), STAGES);
  const perStage = {}, perStyle = {}, genders = new Set();
  for (const l of catalog.lessons) {
    const raw = JSON.parse(fs.readFileSync(path.join(LIB, l.file), 'utf8'));
    assert.strictEqual(raw.meta.id, l.id, l.file);
    assert.strictEqual(l.file, l.id + '.json', l.id);
    assert.ok(STAGES.includes(raw.meta.stage), `${l.id}.meta.stage`);
    assert.strictEqual(l.stage, raw.meta.stage, l.id);
    assert.strictEqual(l.stageLabel, catalog.stages[l.stage], l.id);
    perStage[l.stage] = (perStage[l.stage] || 0) + 1;
    perStyle[l.style] = (perStyle[l.style] || 0) + 1;
    const { scene } = SS.normalizeScene(raw);
    if (!scene.character.hidden) genders.add(scene.character.gender);
  }
  for (const s of STAGES) assert.ok(perStage[s] >= 3, `stage ${s}: ${perStage[s] || 0}`);
  for (const s of SS.STYLES) assert.ok(perStyle[s] >= 6, `style ${s}: ${perStyle[s] || 0}`);
  assert.ok(genders.has('male') && genders.has('female'), 'male and female presenters');
});

test('library: lessons.js bundle for the gallery is in sync', () => {
  const src = fs.readFileSync(path.join(LIB, 'lessons.js'), 'utf8');
  const sandbox = {};
  new Function('window', src)(sandbox);
  assert.deepStrictEqual(sandbox.IO_LESSONS.catalog, catalog);
  for (const l of catalog.lessons) assert.deepStrictEqual(sandbox.IO_LESSONS.scenes[l.id], JSON.parse(fs.readFileSync(path.join(LIB, l.file), 'utf8')), l.id);
});

test('gallery page uses scene-core and the library bundle', () => {
  const html = fs.readFileSync(path.join(ROOT, 'web', 'lessons.html'), 'utf8');
  assert.ok(html.includes('lib/scene-core.js') && html.includes('library/lessons/lessons.js'));
  assert.ok(html.includes('dir="rtl"') && html.includes('prefers-color-scheme: dark'));
  assert.ok(/render\.js"? scene/.test(html));
});
