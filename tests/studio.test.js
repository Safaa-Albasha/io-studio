'use strict';
const test = require('node:test');
const assert = require('node:assert');
const SC = require('../web/lib/studio-core.js');
const P = require('../web/lib/platforms.js');

test('parsePrompter splits on headings and ignores the preamble', () => {
  const t = '# عنوان\nملاحظات\n\n## 1\nأهلاً\n\n## شريحة 2\nسطر\nسطر ثاني\n\n## 3\n';
  assert.deepStrictEqual(SC.parsePrompter(t), ['أهلاً', 'سطر\nسطر ثاني']);
});

test('parsePrompter splits on --- when there are no headings', () => {
  assert.deepStrictEqual(SC.parsePrompter('واحد\n---\nاثنين\r\n---\nثلاثة'), ['واحد', 'اثنين', 'ثلاثة']);
});

test('parsePrompter keeps empty slides in the middle', () => {
  assert.deepStrictEqual(SC.parsePrompter('## 1\nأ\n## 2\n## 3\nج'), ['أ', '', 'ج']);
});

test('pickMime prefers MP4 then WebM', () => {
  assert.strictEqual(SC.pickMime(() => true).ext, 'mp4');
  assert.strictEqual(SC.pickMime((m) => m.startsWith('video/webm')).ext, 'webm');
  assert.deepStrictEqual(SC.pickMime(() => false), { mime: '', ext: 'webm' });
});

test('fit contain/cover', () => {
  assert.deepStrictEqual(SC.fit(1920, 1080, 1080, 1920, 'contain'), { x: 0, y: (1920 - 607.5) / 2, w: 1080, h: 607.5 });
  const c = SC.fit(1920, 1080, 1080, 1920, 'cover');
  assert.strictEqual(c.h, 1920);
});

test('natural sort of slide names', () => {
  assert.deepStrictEqual(['p-10.png', 'p-2.png', 'p-1.png'].sort(SC.naturalCompare), ['p-1.png', 'p-2.png', 'p-10.png']);
});

test('all three platforms are defined with the same fields', () => {
  const keys = (o) => ['video', 'carousel', 'cover', 'uiSafe', 'captionMax', 'hashtags'].every((k) => k in o);
  assert.deepStrictEqual(P.ORDER, ['instagram', 'youtube', 'tiktok']);
  for (const id of P.ORDER) assert.ok(keys(P.PLATFORMS[id]), id);
  const s = P.safeArea();
  assert.ok(s.y >= 220 && s.y + s.h <= 1920 - 480 && s.x >= 140);
});
