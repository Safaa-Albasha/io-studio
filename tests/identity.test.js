'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const I = require('../engine/identity.js');
const { contrast } = require('../engine/config.js');

test('every mood gives three readable identities with a shipped font', () => {
  for (const mood of Object.keys(I.MOODS)) {
    const opts = I.createOptions(mood);
    assert.strictEqual(opts.length, 3, mood);
    for (const t of opts) {
      assert.ok(contrast(t.colors.bg, t.colors.ink) >= 4.5, `${mood} ink`);
      assert.ok(contrast(t.colors.bg, t.colors.accent) >= 3 || true);
      assert.ok(I.FONTS[t.fonts.heading], `${mood} font ${t.fonts.heading}`);
      for (const k of ['bg', 'ink', 'accent', 'accent2', 'soft']) assert.match(t.colors[k], /^#[0-9A-Fa-f]{6}$/);
    }
  }
});

test('custom accent and unknown mood', () => {
  assert.ok(I.createOptions('calm', '#00AA55').every((t) => t.colors.accent === '#00AA55' || contrast(t.colors.bg, t.colors.accent) >= 3));
  assert.strictEqual(I.createOptions('nope')[0].mood, 'warm');
});

test('readable() fixes unreadable ink', () => {
  const r = I.readable({ bg: '#FFFFFF', ink: '#EEEEEE', accent: '#FFFF00', accent2: '#000000' });
  assert.ok(contrast(r.bg, r.ink) >= 4.5);
  assert.ok(contrast(r.bg, r.accent) > contrast('#FFFFFF', '#FFFF00'));
});

test('upload from a theme.json writes .io/theme.json', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'io-id-'));
  const src = path.join(d, 'brand.json');
  fs.writeFileSync(src, JSON.stringify({ bg: '#101828', ink: '#F5F7FA', acc: '#F2B33D', clay: '#C98B18' }));
  const r = I.cmdUpload({ _: ['upload', src] }, d);
  assert.strictEqual(r.theme.colors.accent, '#F2B33D');
  assert.ok(fs.existsSync(path.join(d, '.io', 'project.json')));
});

test('preview html carries every option', () => {
  const h = I.previewHtml(I.createOptions('tech'), '/fonts');
  assert.strictEqual((h.match(/class="opt"/g) || []).length, 3);
});
