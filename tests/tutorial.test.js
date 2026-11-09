'use strict';
// The step-by-step tutorial (docs/tutorial): every picture the page uses exists and is built by
// build.js, and the local server hands out the page, pictures and PDF — nothing else from docs/.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

const DIR = path.join(__dirname, '..', 'docs', 'tutorial');
const html = fs.readFileSync(path.join(DIR, 'tutorial.html'), 'utf8');
const build = fs.readFileSync(path.join(DIR, 'build.js'), 'utf8');
const used = [...html.matchAll(/src="img\/([\w-]+)\.png"/g)].map((m) => m[1]);
const shots = [...build.matchAll(/\{ id: '([a-z][\w-]*)', (?:vp|url):/g)].map((m) => m[1]);

test('every screenshot the tutorial shows is one build.js takes', () => {
  assert.ok(used.length >= 20, 'the tutorial shows its screenshots');
  for (const id of used) assert.ok(shots.includes(id), `img/${id}.png is not in build.js SHOTS`);
  for (const id of shots) assert.ok(used.includes(id), `SHOTS has «${id}» but tutorial.html never shows it`);
});

test('the pictures that are in the repo are the ones the page uses', () => {
  const img = path.join(DIR, 'img');
  if (!fs.existsSync(img)) return; // not built yet
  for (const id of used) assert.ok(fs.existsSync(path.join(img, id + '.png')), `missing img/${id}.png`);
});

test('the tutorial keeps placeholders, not real people or machine paths', () => {
  assert.ok(!/\/home\/|\/Users\/|C:\\\\Users/.test(html), 'no machine paths');
  assert.ok(!/@safaa/i.test(html), 'no real handles in the tutorial text');
  assert.ok(html.includes('~/my-project'));
});

test('serve.js serves the tutorial (page, pictures, PDF) read-only and nothing else from docs/', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'io-tut-'));
  const { server, port } = await new Promise((resolve) => { require('../engine/serve.js').start(0, { dir, quiet: true, onListen: (s, p) => resolve({ server: s, port: p }) }); });
  const get = (p) => new Promise((resolve, reject) => http.get({ host: '127.0.0.1', port, path: p }, (r) => { let b = ''; r.setEncoding('utf8'); r.on('data', (c) => { b += c; }); r.on('end', () => resolve({ status: r.statusCode, type: r.headers['content-type'], body: b })); }).on('error', reject));
  try {
    const page = await get('/docs/tutorial/tutorial.html');
    assert.strictEqual(page.status, 200);
    assert.match(page.type, /text\/html/);
    assert.ok(page.body.includes('عندي فيديوهات'));
    assert.strictEqual((await get('/docs/tutorial/')).status, 200);
    assert.strictEqual((await get('/docs/tutorial/build.js')).status, 403);
    assert.notStrictEqual((await get('/docs/tutorial/../guide/build.js')).status, 200);
    assert.notStrictEqual((await get('/docs/tutorial/%2e%2e/%2e%2e/engine/serve.js')).status, 200);
    assert.strictEqual((await get('/docs/tutorial/..%2f..%2fengine%2fserve.js')).status, 403);
    if (fs.existsSync(path.join(DIR, 'img', used[0] + '.png'))) assert.strictEqual((await get('/docs/tutorial/img/' + used[0] + '.png')).status, 200);
  } finally { server.close(); }
});

test('the app links the tutorial', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'web', 'app.html'), 'utf8');
  assert.ok(app.includes('href="/docs/tutorial/tutorial.html"'), 'app header «دليل الاستخدام»');
});
