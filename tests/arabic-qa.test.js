'use strict';
// Adapted from Reel Studio tests/arabic-check.test.mjs (MIT, © 2026 Mohamed Abdou) for engine/arabic-qa.js.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Q = require('../engine/arabic-qa.js');

const LAM_ALEF_FORM = 'ﻻ';
const ZWNJ = '‌';
const TATWEEL = 'ـ';
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const cairoLike = (without = '') => {
  const s = new Set([...range(0x20, 0x7e), 0xa0, ...range(0x0621, 0x063a), ...range(0x0641, 0x064a), ...range(0x064b, 0x0652), 0x0640, ...range(0x0660, 0x0669), 0x060c, 0x061f, 0x061b]);
  for (const ch of without) s.delete(ch.codePointAt(0));
  return s;
};
const codes = (list, level) => list.filter((p) => !level || p.level === level).map((p) => p.code);
const caps = (words) => ({ strings: words.map((t, i) => ({ kind: 'caption', where: `w${i}`, text: t })) });

test('code table: broken joins and missing glyphs fail, the rest is review', () => {
  assert.deepStrictEqual(Object.entries(Q.CODES).filter(([, l]) => l === 'fail').map(([c]) => c).sort(),
    ['missing-glyph', 'per-letter-transform', 'presentation-forms', 'split-word-markup', 'tatweel-edge', 'zwnj-in-word']);
  for (const c of Object.keys(Q.CODES)) assert.ok(Q.AR_MSG[c], `Arabic message for ${c}`);
});

test('plain Arabic text is clean', () => {
  assert.deepStrictEqual(Q.checkString('هلا بيكم اليوم راح أعلمكم', { coverage: cairoLike(), digits: 'latin' }), []);
});

test('presentation forms, ZWNJ inside a word and a leading tatweel fail', () => {
  assert.deepStrictEqual(codes(Q.checkString(`ك${LAM_ALEF_FORM}م`), 'fail'), ['presentation-forms']);
  assert.deepStrictEqual(codes(Q.checkString(`كتب${ZWNJ}نا`), 'fail'), ['zwnj-in-word']);
  assert.deepStrictEqual(codes(Q.checkString(`كتب${ZWNJ} نا`)), []);
  assert.deepStrictEqual(codes(Q.checkString(`${TATWEEL}كتب`), 'fail'), ['tatweel-edge']);
  assert.deepStrictEqual(codes(Q.checkString(`كت${TATWEEL}ب`)), []);
  assert.deepStrictEqual(codes(Q.checkString('﷽ ﷺ')), [], 'honorific ligatures are symbols');
});

test('«الـ / للـ» before a word is review, a tatweel after a non-joining letter fails', () => {
  assert.deepStrictEqual(Q.checkString(`للـ هوك`).map((p) => [p.code, p.level]), [['tatweel-edge', 'review']]);
  assert.deepStrictEqual(codes(Q.checkString(`د${TATWEEL}`), 'fail'), ['tatweel-edge']);
});

test('a letter the font lacks fails and names it; emoji and symbols are review; spaces never count', () => {
  const r = Q.checkString('وگولولي', { coverage: cairoLike('گ'), font: 'Tajawal' });
  assert.deepStrictEqual(codes(r, 'fail'), ['missing-glyph']);
  assert.match(r[0].detail, /U\+06AF/);
  assert.deepStrictEqual(Q.checkString('تمام 🔥', { coverage: cairoLike() }).map((p) => p.level), ['review']);
  assert.deepStrictEqual(Q.checkString('كتب   تب', { coverage: cairoLike() }), []);
  assert.deepStrictEqual(Q.checkString('وگولولي', { coverage: cairoLike('گ'), allowFallback: true }).map((p) => p.level), ['review']);
});

test('mixed direction, signed numbers, stacked harakat, digits and Persian letters go to review', () => {
  assert.deepStrictEqual(codes(Q.checkString('جرّب ChatGPT هسه')), ['mixed-direction']);
  assert.deepStrictEqual(codes(Q.checkString('خلال 3 أيام')), []);
  assert.deepStrictEqual(codes(Q.checkString('زيادة +3 نقاط')), ['mixed-direction']);
  assert.deepStrictEqual(codes(Q.checkString('ChatGPT Plus')), [], 'an English line is not an Arabic line');
  assert.deepStrictEqual(codes(Q.checkString('مَُرحبا')), ['stacked-harakat']);
  assert.deepStrictEqual(codes(Q.checkString('سنة ٧٦٢', { digits: 'latin' })), ['digit-style']);
  assert.deepStrictEqual(codes(Q.checkString('سنة ٧٦٢', { digits: 'arabic-indic' })), []);
  assert.deepStrictEqual(codes(Q.checkString('کتاب')), ['persian-letters']);
  assert.ok(Q.checkAll({ strings: [{ text: 'جرّب ChatGPT' }] }, { coverage: null }).ok, 'review never blocks');
});

test('caption words: a Latin word between Arabic words is one grouped review item', () => {
  const r = Q.checkAll(caps(['جرّب', 'ChatGPT', 'هسه', 'ولو', 'تريد', 'ChatGPT', 'بعد']), { coverage: null });
  const hits = r.problems.filter((p) => p.code === 'mixed-direction');
  assert.strictEqual(hits.length, 1);
  assert.match(hits[0].detail, /2/);
});

test('markup: a word split across inline elements and a per-letter transform fail; block boundaries do not', () => {
  assert.deepStrictEqual(codes(Q.checkMarkup('<p>ك<span>تاب</span></p>'), 'fail'), ['split-word-markup']);
  assert.deepStrictEqual(codes(Q.checkMarkup('<div>كتاب</div><div>جديد</div>')), []);
  assert.deepStrictEqual(codes(Q.checkMarkup('<p>للـ<span class="mark">هوك</span> بس</p>')), [], 'whole words in two spans');
  assert.deepStrictEqual(codes(Q.checkMarkup('<p>ك<span style="transform:translateY(4px)">ت</span>اب</p>'), 'fail').sort(), ['per-letter-transform', 'split-word-markup']);
});

test('real fonts: Cairo draws گ چ, Tajawal does not (the Iraqi-dialect trap)', () => {
  const cairo = Q.familyCoverage('Cairo'), taj = Q.familyCoverage('Tajawal');
  assert.ok(cairo && taj, 'plugin fonts readable');
  assert.ok(cairo.has(0x06af) && cairo.has(0x0686));
  assert.ok(!taj.has(0x06af));
  for (const cp of [...range(0x0621, 0x063a), ...range(0x0641, 0x064a)]) assert.ok(taj.has(cp), `Tajawal U+${cp.toString(16)}`);
  assert.ok(Q.installedFamilies().includes('IBM Plex Sans Arabic'));
});

test('a I/O Studio work folder: caps.json words + theme font + compose strings are collected, engine messages skipped', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-'));
  fs.writeFileSync(path.join(d, 'caps.json'), JSON.stringify({ total: 2, cards: [{ s: 0, e: 1, w: [{ t: 'جربوها', s: 0, e: 0.5 }, { t: 'وگولولي', s: 0.5, e: 1 }] }] }));
  fs.writeFileSync(path.join(d, 'theme.json'), JSON.stringify({ font: 'Tajawal', bg: '#fff' }));
  fs.writeFileSync(path.join(d, 'compose.html'), `<script>\nconst t = 'عنوان المشهد';\nconsole.error('⚠️ رسالة محرك');\n</script>`);
  const c = Q.collect(d);
  assert.strictEqual(c.hints.font, 'Tajawal');
  assert.deepStrictEqual(c.strings.map((s) => s.text), ['جربوها', 'وگولولي', 'عنوان المشهد']);
  const r = Q.checkAll(c, { font: 'Tajawal', digits: 'latin' });
  assert.strictEqual(r.ok, false);
  assert.ok(r.problems[0].detail.includes('Cairo'), 'suggests a font that draws it');
  assert.ok(Q.checkAll(c, { font: 'Cairo', digits: 'latin' }).ok);
});
