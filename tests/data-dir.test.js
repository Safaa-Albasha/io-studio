'use strict';
// Backward compatibility: projects made before the renames (SAFAA Studio → SKY → I/O Studio) keep their data
// (old folder names live only in engine/data-dir.js and here).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const D = require('../engine/data-dir.js');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'io-dd-'));

test('new project: .io, nothing created until something writes', () => {
  const d = tmp();
  assert.strictEqual(D.dataDir(d), path.join(d, '.io'));
  assert.ok(!fs.existsSync(path.join(d, '.io')));
  assert.strictEqual(D.dataFile(d, 'project.json'), path.join(d, '.io', 'project.json'));
});

for (const old of ['.sky', '.safaa']) {
  test(`an old ${old} folder is renamed to .io once, with its files`, () => {
    const d = tmp();
    fs.mkdirSync(path.join(d, old));
    fs.writeFileSync(path.join(d, old, 'project.json'), '{"dialect":"iraqi"}');
    assert.strictEqual(D.dataDir(d), path.join(d, '.io'));
    assert.ok(!fs.existsSync(path.join(d, old)));
    assert.strictEqual(fs.readFileSync(D.dataFile(d, 'project.json'), 'utf8'), '{"dialect":"iraqi"}');
    assert.strictEqual(D.dataDir(d), path.join(d, '.io')); // second call: no-op
  });
}

test('.sky (newer) wins over .safaa when both exist and .io does not', () => {
  const d = tmp();
  fs.mkdirSync(path.join(d, '.safaa'));
  fs.mkdirSync(path.join(d, '.sky'));
  fs.writeFileSync(path.join(d, '.sky', 'a.txt'), 'sky');
  assert.strictEqual(D.dataDir(d), path.join(d, '.io'));
  assert.strictEqual(fs.readFileSync(path.join(d, '.io', 'a.txt'), 'utf8'), 'sky');
  assert.ok(fs.existsSync(path.join(d, '.safaa')));
});

test('when .io exists, it wins and the old folders are left alone', () => {
  const d = tmp();
  fs.mkdirSync(path.join(d, '.safaa'));
  fs.mkdirSync(path.join(d, '.sky'));
  fs.mkdirSync(path.join(d, '.io'));
  assert.strictEqual(D.dataDir(d), path.join(d, '.io'));
  assert.ok(fs.existsSync(path.join(d, '.safaa')));
  assert.ok(fs.existsSync(path.join(d, '.sky')));
});

test('if the rename fails, the old folder is read in place', { skip: process.platform === 'win32' || process.getuid?.() === 0 }, () => {
  const d = tmp();
  fs.mkdirSync(path.join(d, '.sky'));
  fs.chmodSync(d, 0o555); // parent read-only → rename fails
  try { assert.strictEqual(D.dataDir(d), path.join(d, '.sky')); } finally { fs.chmodSync(d, 0o755); }
});

test('rename failure falls back to the old folder (stubbed)', () => {
  const d = tmp();
  fs.mkdirSync(path.join(d, '.safaa'));
  const orig = fs.renameSync;
  fs.renameSync = () => { throw new Error('EACCES'); };
  try { assert.strictEqual(D.dataDir(d), path.join(d, '.safaa')); } finally { fs.renameSync = orig; }
});

for (const old of ['.sky-editor', '.safaa-studio']) {
  test(`video editor home: ~/${old} → ~/.io-editor; VAE_HOME overrides`, () => {
    const h = tmp();
    fs.mkdirSync(path.join(h, old));
    fs.writeFileSync(path.join(h, old, 'profile.json'), '{}');
    const keep = process.env.VAE_HOME;
    delete process.env.VAE_HOME;
    try {
      assert.strictEqual(D.editorHome(h), path.join(h, '.io-editor'));
      assert.ok(fs.existsSync(path.join(h, '.io-editor', 'profile.json')));
      process.env.VAE_HOME = '/x/y';
      assert.strictEqual(D.editorHome(h), '/x/y');
    } finally { if (keep === undefined) delete process.env.VAE_HOME; else process.env.VAE_HOME = keep; }
  });
}

test('the engine reads an old project through the helper (app-api sources)', () => {
  const d = tmp();
  fs.mkdirSync(path.join(d, '.sky'));
  fs.writeFileSync(path.join(d, '.sky', 'sources.json'), JSON.stringify({ sites: ['example.com'] }));
  const A = require('../engine/app-api.js');
  assert.deepStrictEqual(A.sources(d).sites, ['example.com']);
  assert.ok(fs.existsSync(path.join(d, '.io', 'sources.json')));
});

test('browser settings saved under the old sky.* / sky-* keys are copied to io.* / io-* once (web/lib/ls-migrate.js)', () => {
  const vm = require('vm');
  const store = new Map([['sky.app.theme', 'light'], ['sky-ig-sort', 'views'], ['io.app.tab', 'me'], ['sky.app.tab', 'ideas'], ['other', 'x']]);
  const localStorage = { get length() { return store.size; }, key: (i) => [...store.keys()][i], getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'web', 'lib', 'ls-migrate.js'), 'utf8'), { window: { localStorage } });
  assert.strictEqual(store.get('io.app.theme'), 'light');
  assert.strictEqual(store.get('io-ig-sort'), 'views');
  assert.strictEqual(store.get('io.app.tab'), 'me', 'an existing new key is kept');
  assert.strictEqual(store.get('sky.app.theme'), 'light', 'old keys stay');
});
