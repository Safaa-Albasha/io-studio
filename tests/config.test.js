'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const K = require('../engine/config.js');

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'io-')); }

test('init creates the three identity files once', () => {
  const d = tmp();
  assert.strictEqual(K.init(d).length, 3);
  assert.strictEqual(K.init(d).length, 0);
  const r = K.check(d);
  assert.deepStrictEqual(r.errors, []);
  assert.ok(r.warnings.some((w) => w.includes('فاضي')));
});

test('check flags bad colors, unknown platforms and missing ones', () => {
  const d = tmp();
  K.init(d);
  const th = path.join(d, '.io', 'theme.json');
  const t = JSON.parse(fs.readFileSync(th, 'utf8'));
  t.colors.accent = 'orange';
  fs.writeFileSync(th, JSON.stringify(t));
  const pj = path.join(d, '.io', 'project.json');
  const p = JSON.parse(fs.readFileSync(pj, 'utf8'));
  p.platforms = ['instagram', 'snapchat'];
  fs.writeFileSync(pj, JSON.stringify(p));
  const r = K.check(d);
  assert.ok(r.errors.some((e) => e.includes('accent')));
  assert.ok(r.errors.some((e) => e.includes('snapchat')));
  assert.ok(r.warnings.some((w) => w.includes('youtube') && w.includes('tiktok')));
});

test('contrast and css', () => {
  assert.ok(Math.abs(K.contrast('#ffffff', '#000000') - 21) < 0.01);
  assert.match(K.css({ colors: { bg: '#fff', ink: '#000', accent: '#f00' }, fonts: {} }), /--accent:#f00/);
});

test('lesson creates a ready folder', () => {
  const d = tmp();
  K.init(d);
  const root = K.lesson(d, 'درس-1');
  for (const f of ['prompt.md', 'scene.json', 'theme.json', 'slides', 'recordings']) assert.ok(fs.existsSync(path.join(root, f)), f);
  assert.throws(() => K.lesson(d, 'درس-1'));
});

test('video-theme maps identity colors to the video engine keys', () => {
  const t = K.videoTheme({ colors: { bg: '#FFFFFF', ink: '#000000', accent: '#E0663A' }, fonts: { heading: 'Cairo' }, handle: '@my.handle' }, { capStyle: 'card' });
  assert.strictEqual(t.acc, '#E0663A');
  assert.strictEqual(t.font, 'Cairo');
  assert.strictEqual(t.capStyle, 'card');
  assert.match(t.mut, /^#[0-9A-F]{6}$/);
  assert.match(t.clay, /^#[0-9A-F]{6}$/);
});

test('every skill folder has a SKILL.md whose name matches the folder, and names are unique', () => {
  const root = path.join(__dirname, '..', 'skills');
  const names = new Set();
  for (const d of fs.readdirSync(root)) {
    const f = path.join(root, d, 'SKILL.md');
    assert.ok(fs.existsSync(f), d);
    const m = fs.readFileSync(f, 'utf8').match(/^name:\s*(.+)$/m);
    assert.ok(m, d);
    assert.strictEqual(m[1].trim(), d);
    assert.ok(!names.has(d)); names.add(d);
  }
});

test('session-start hook reads both profile formats', () => {
  const { execFileSync } = require('child_process');
  const hook = path.join(__dirname, '..', 'hooks', 'session-start.js');
  const d = tmp(); fs.mkdirSync(path.join(d, '.io'));
  fs.writeFileSync(path.join(d, '.io', 'creator-profile.md'), '**اسم الحساب:** @my.handle\n');
  assert.match(execFileSync('node', [hook], { env: { ...process.env, CLAUDE_PROJECT_DIR: d } }).toString(), /@my.handle/);
});

test('dialect library is complete and the hook speaks the chosen dialect', () => {
  const H = require('../hooks/session-start.js');
  const list = H.loadDialects();
  assert.ok(list.length >= 10);
  const ids = new Set();
  for (const d of list) {
    for (const k of ['id', 'name', 'region', 'greeting', 'words', 'spelling', 'sample', 'avoid']) assert.ok(d[k], `${d.id}.${k}`);
    assert.ok(!ids.has(d.id)); ids.add(d.id);
  }
  assert.strictEqual(H.findDialect(list, 'iraqi').name, 'عراقي');
  assert.strictEqual(H.findDialect(list, 'مصري').id, 'egyptian');
  const d = tmp();
  K.init(d);
  const pj = path.join(d, '.io', 'project.json');
  const p = JSON.parse(fs.readFileSync(pj, 'utf8'));
  assert.strictEqual(p.dialect, '', 'public template has no default dialect');
  assert.doesNotMatch(H.run(d), /اللهجة:/);
  p.dialect = 'iraqi'; fs.writeFileSync(pj, JSON.stringify(p));
  assert.match(H.run(d), /اللهجة: عراقي/);
  p.dialect = 'egyptian'; fs.writeFileSync(pj, JSON.stringify(p));
  assert.match(H.run(d), /دلوقتي/);
  p.dialect = 'لهجة جديدة'; fs.writeFileSync(pj, JSON.stringify(p));
  assert.match(H.run(d), /لهجة جديدة/);
  assert.ok(K.check(d).warnings.some((w) => w.includes('لهجة جديدة')));
  assert.match(H.run(tmp()), /onboarding/);
});
