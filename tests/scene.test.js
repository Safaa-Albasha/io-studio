'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const SS = require('../web/lib/scene-core.js');

const sample = fs.readFileSync(path.join(__dirname, '..', 'templates', 'lesson', 'scene.json'), 'utf8');

test('the template scene is valid and fills defaults', () => {
  const { scene, errors } = SS.normalizeScene(sample);
  assert.deepStrictEqual(errors, []);
  assert.strictEqual(scene.format, '9:16');
  assert.ok(scene.theme.bg && scene.character.skin);
});

test('validation catches bad beats', () => {
  const { errors } = SS.normalizeScene({ format: '4:3', beats: [{ say: 1, count: { item: '🦆', n: 40 } }, { say: 'x', morph: { to: {} } }] });
  assert.strictEqual(errors.length, 4);
  assert.ok(SS.normalizeScene({ beats: [] }).errors.length);
});

test('string shorthands become elements', () => {
  const { scene } = SS.normalizeScene({ beats: [{ say: 'a', show: 'ب' }, { say: 'b', morph: { to: '🦆' } }] });
  assert.deepStrictEqual(scene.beats[0].show, { kind: 'text', value: 'ب' });
  assert.deepStrictEqual(scene.beats[1].morph.to, { kind: 'emoji', value: '🦆' });
});

test('timeline is contiguous and gives counting enough time', () => {
  const { scene } = SS.normalizeScene(sample);
  const tl = SS.timeline(scene);
  for (let i = 1; i < tl.length; i++) assert.strictEqual(tl[i].start, tl[i - 1].end);
  const count = tl.find((b) => b.beat.count);
  assert.ok(count.dur >= 0.8 + count.beat.count.n * 0.55);
  assert.ok(SS.totalDuration(scene) > tl[tl.length - 1].end);
});

test('explicit duration wins', () => {
  const { scene } = SS.normalizeScene({ beats: [{ say: 'كلمة', duration: 5 }] });
  assert.strictEqual(SS.timeline(scene)[0].dur, 5);
});

test('prompter text has one block per beat', () => {
  const { scene } = SS.normalizeScene(sample);
  assert.strictEqual(SS.prompterText(scene).split('## ').length - 1, scene.beats.length);
});

test('new beat types validate and get enough time', () => {
  const { scene, errors } = SS.normalizeScene({ beats: [
    { say: 'نكتب', reveal: 'باب', mood: 'thinking' },
    { say: 'قارن', compare: { a: '🦆', b: '🐥' }, bg: '#EAF3FB' },
    { say: 'سؤال؟', quiz: { options: ['🍌', '🦆'], answer: 1 } },
    { say: 'برافو', celebrate: true, mood: 'happy' },
  ] });
  assert.deepStrictEqual(errors, []);
  assert.deepStrictEqual(scene.beats[0].reveal, { text: 'باب' });
  const tl = SS.timeline(scene);
  assert.ok(tl[2].quizAt > 0 && tl[2].quizAt < tl[2].dur);
  assert.ok(tl[0].dur >= 0.4 + 0.25 * 3);
});

test('bad new beats are reported', () => {
  const { errors } = SS.normalizeScene({ beats: [
    { say: 'x', quiz: { options: ['a'], answer: 3 } },
    { say: 'y', mood: 'angry', bg: 'red', compare: { a: '🦆' } },
  ] });
  assert.strictEqual(errors.length, 5);
});

test('the demo lesson uses every beat type and is valid', () => {
  const demo = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'examples', 'lesson-demo', 'scene.json'), 'utf8'));
  const { errors } = SS.normalizeScene(demo);
  assert.deepStrictEqual(errors, []);
  for (const k of ['show', 'reveal', 'morph', 'count', 'compare', 'quiz', 'celebrate']) assert.ok(demo.beats.some((b) => b[k] !== undefined), k);
});

test('character gender: male/female with names, beard and ghutra options', () => {
  const m = SS.normalizeScene({ character: { gender: 'male', ghutra: '#FFFFFF', hijab: '#000000' }, beats: [{ say: 'هلا' }] });
  assert.deepStrictEqual(m.errors, []);
  assert.strictEqual(m.scene.character.name, 'المعلّم');
  assert.strictEqual(m.scene.character.hijab, '');
  const f = SS.normalizeScene({ beats: [{ say: 'هلا' }] });
  assert.strictEqual(f.scene.character.gender, 'female');
  assert.strictEqual(f.scene.character.name, 'المعلّمة');
  assert.strictEqual(SS.normalizeScene({ character: { gender: 'x' }, beats: [{ say: 'a' }] }).errors.length, 1);
});

// ---- character face photo (optional) ----
// a recording 2D context: every method is a no-op except drawImage (recorded) and measureText/gradients
function mockCtx(W, H) {
  const calls = [];
  const target = { canvas: { width: W, height: H }, calls,
    measureText: (s) => ({ width: String(s).length * 10 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), createPattern: () => null,
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    drawImage: (...a) => calls.push(a) };
  return new Proxy(target, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
}

test('character photo: a string path is kept, anything else is an error, empty is dropped', () => {
  const ok = SS.normalizeScene({ character: { gender: 'male', photo: 'me.jpg' }, beats: [{ say: 'هلا' }] });
  assert.deepStrictEqual(ok.errors, []);
  assert.strictEqual(ok.scene.character.photo, 'me.jpg');
  assert.strictEqual(SS.normalizeScene({ character: { photo: 42 }, beats: [{ say: 'a' }] }).errors.length, 1);
  assert.ok(!('photo' in SS.normalizeScene({ character: { photo: '' }, beats: [{ say: 'a' }] }).scene.character));
  assert.ok(!('photo' in SS.normalizeScene({ beats: [{ say: 'a' }] }).scene.character), 'old scenes stay as they were');
});

test('character photo: drawScene draws the face image in place of the head; without one nothing changes', () => {
  const { scene } = SS.normalizeScene(sample);
  const plain = mockCtx(1080, 1920);
  SS.drawScene(plain, scene, 0.5);
  assert.strictEqual(plain.calls.length, 0, 'no photo → no drawImage');
  const face = { width: 300, height: 400 };
  const withPhoto = mockCtx(1080, 1920);
  SS.drawScene(withPhoto, scene, 0.5, { photo: face });
  assert.ok(withPhoto.calls.some((c) => c[0] === face), 'the photo is drawn');
  // a string photo in Node (no Image) falls back to the drawn head instead of failing
  const s2 = SS.normalizeScene(Object.assign(JSON.parse(sample), { character: { gender: 'female', photo: 'face.png' } })).scene;
  const fallback = mockCtx(1080, 1920);
  assert.doesNotThrow(() => SS.drawScene(fallback, s2, 0.5));
  assert.strictEqual(fallback.calls.length, 0);
  return SS.loadPhoto('face.png').then((ready) => assert.strictEqual(ready, false));
});
