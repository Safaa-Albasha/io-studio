'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn, execFileSync } = require('child_process');
const Q = require('../engine/queue.js');
const serve = require('../engine/serve.js');

const ROOT = path.join(__dirname, '..');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'io-q-'));

function startServer(dir, extra = {}) {
  return new Promise((resolve) => serve.start(0, Object.assign({ dir, quiet: true, onListen: (server, port) => resolve({ server, port }) }, extra)));
}
function request(port, method, p, { body, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: p, method, headers }, (res) => {
      let b = ''; res.setEncoding('utf8'); res.on('data', (c) => { b += c; });
      res.on('end', () => { let json = null; try { json = JSON.parse(b); } catch (e) { /* not json */ } resolve({ status: res.statusCode, headers: res.headers, json, text: b }); });
    });
    req.on('error', reject);
    if (body !== undefined) req.write(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
    req.end();
  });
}

test('requests are validated per type', () => {
  assert.ok(Q.normalize({ type: 'nope' }).errors.length);
  assert.ok(Q.normalize({ type: 'montage', ideaId: 'i1' }).errors.length, 'format required');
  assert.ok(Q.normalize({ type: 'montage', format: 'reel' }).errors.length, 'idea or file required');
  assert.deepStrictEqual(Q.normalize({ type: 'montage', ideaId: 'i 1!', format: 'both' }).req, { type: 'montage', ideaId: 'i1', format: 'both' });
  assert.strictEqual(Q.normalize({ type: 'montage', format: 'youtube', file: '../etc/passwd' }).req, null, 'no .. paths');
  assert.strictEqual(Q.normalize({ type: 'montage', format: 'youtube', file: 'recordings/2026-11-09-take.webm' }).req.file, 'recordings/2026-11-09-take.webm');
  assert.ok(Q.normalize({ type: 'rewrite-idea', ideaId: 'i1' }).errors.length, 'note required');
  assert.strictEqual(Q.normalize({ type: 'rewrite-idea', ideaId: 'i1', note: ' أقصر ' }).req.note, 'أقصر');
  const e = Q.normalize({ type: 'edit', target: 'caption', work: '/p/work/x', segment: { index: 2, start: 1.23456, end: 3, text: 'هلا' }, note: 'أقصر' }).req;
  assert.deepStrictEqual(e.segment, { index: 2, start: 1.235, end: 3, text: 'هلا' });
  assert.strictEqual(Q.normalize({ type: 'edit', target: 'weird', work: 'w', note: 'x' }).req.target, 'general');
  assert.ok(Q.normalize({ type: 'edit', note: 'x' }).errors.length, 'work or idea required');
  assert.strictEqual(Q.normalize({ type: 'script', text: 'سكربت' }).req.format, 'reel');
  assert.ok(Q.normalize({ type: 'script', text: '  ' }).errors.length);
});

test('a request goes pending → working → done (or error) with progress', () => {
  const d = tmp();
  const a = Q.enqueue(d, { type: 'montage', ideaId: 'i1', format: 'reel' });
  const b = Q.enqueue(d, { type: 'script', text: 'فكرة', format: 'both' });
  assert.ok(a.ok && b.ok);
  assert.strictEqual(Q.pending(d).length, 2);
  assert.strictEqual(Q.take(d, a.item.id).item.status, 'working');
  const p = Q.progress(d, a.item.id, 'أشيل السكتات', 140);
  assert.deepStrictEqual(p.item.progress, { msg: 'أشيل السكتات', pct: 100 });
  const dn = Q.done(d, a.item.id, 'output/x.mp4', 'خلص الريل');
  assert.strictEqual(dn.item.status, 'done');
  assert.strictEqual(dn.item.out, 'output/x.mp4');
  assert.strictEqual(Q.fail(d, b.item.id, 'بلا صوت').item.error, 'بلا صوت');
  assert.deepStrictEqual(Q.list(d, { ideaId: 'i1' }).map((x) => x.id), [a.item.id]);
  assert.ok(!Q.take(d, 'missing').ok);
  assert.strictEqual(Q.pending(d).length, 0);
});

test('wait resolves at once with a pending request, or when one arrives', async () => {
  const d = tmp();
  assert.strictEqual(await Q.wait(d, { timeoutMs: 150, pollMs: 50 }), null);
  const later = Q.wait(d, { pollMs: 50 });
  setTimeout(() => Q.enqueue(d, { type: 'script', text: 'x' }), 120);
  const r = await later;
  assert.strictEqual(r.item.type, 'script');
  assert.strictEqual(r.pending, 1);
  const again = await Q.wait(d, { pollMs: 50 });
  assert.strictEqual(again.item.id, r.item.id, 'still pending until taken');
});

test('the server: queue API with CORS for localhost pages, project settings, origin check', async () => {
  const d = tmp();
  const { server, port } = await startServer(d);
  try {
    const pre = await request(port, 'OPTIONS', '/api/queue', { headers: { origin: 'http://127.0.0.1:8792', 'access-control-request-method': 'POST' } });
    assert.strictEqual(pre.status, 204);
    assert.strictEqual(pre.headers['access-control-allow-origin'], 'http://127.0.0.1:8792');
    assert.match(pre.headers['access-control-allow-headers'], /content-type/);
    const ok = await request(port, 'POST', '/api/queue', { headers: { origin: 'http://127.0.0.1:8792', 'content-type': 'application/json' }, body: { type: 'edit', target: 'caption', work: '/w', segment: { index: 0 }, note: 'أقصر' } });
    assert.strictEqual(ok.status, 200);
    assert.strictEqual(ok.headers['access-control-allow-origin'], 'http://127.0.0.1:8792');
    const bad = await request(port, 'POST', '/api/queue', { headers: { 'content-type': 'application/json' }, body: { type: 'montage' } });
    assert.strictEqual(bad.status, 400);
    const foreign = await request(port, 'POST', '/api/queue', { headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, body: { type: 'script', text: 'x' } });
    assert.strictEqual(foreign.status, 403);
    assert.strictEqual(foreign.headers['access-control-allow-origin'], undefined);
    const list = await request(port, 'GET', '/api/queue');
    assert.strictEqual(list.json.items.length, 1);
    assert.strictEqual(path.resolve(list.json.project), path.resolve(d));
    const set = await request(port, 'POST', '/api/project', { headers: { 'content-type': 'application/json' }, body: { dailyTrends: { enabled: true, hour: '21' }, name: 'ignored' } });
    assert.strictEqual(set.status, 200);
    const proj = JSON.parse(fs.readFileSync(path.join(d, '.io', 'project.json'), 'utf8'));
    assert.deepStrictEqual(proj.dailyTrends, { enabled: true, hour: 21 });
    assert.strictEqual(proj.name, undefined, 'only whitelisted keys');
    assert.strictEqual((await request(port, 'POST', '/api/project', { body: { foo: 1 } })).status, 400);
  } finally { server.close(); }
});

test('recordings upload streams into <project>/recordings/<date>-<slug>.<ext>, size-limited', async () => {
  const d = tmp();
  const { server, port } = await startServer(d, { recLimit: 1024 });
  try {
    const body = Buffer.alloc(600, 7);
    const r = await request(port, 'POST', '/api/recordings?name=' + encodeURIComponent('درس 1: مقدمة') + '&ext=.webm', { headers: { origin: 'http://localhost:' + port, 'content-type': 'video/webm' }, body });
    assert.strictEqual(r.status, 200, r.text);
    assert.match(r.json.file, /^recordings\/\d{4}-\d{2}-\d{2}-درس-1-مقدمة\.webm$/);
    assert.strictEqual(fs.statSync(path.join(d, r.json.file)).size, 600);
    const r2 = await request(port, 'POST', '/api/recordings?name=' + encodeURIComponent('درس 1: مقدمة') + '&ext=.exe', { body });
    assert.match(r2.json.file, /-2\.webm$/, 'never overwrites; unknown ext → .webm');
    const big = await request(port, 'POST', '/api/recordings?name=big&ext=.mp4', { body: Buffer.alloc(4096, 1) });
    assert.strictEqual(big.status, 413);
    assert.deepStrictEqual(fs.readdirSync(path.join(d, 'recordings')).filter((f) => /big/.test(f)), [], 'no partial file left');
    const foreign = await request(port, 'POST', '/api/recordings?name=x', { headers: { origin: 'http://evil.example' }, body });
    assert.strictEqual(foreign.status, 403);
  } finally { server.close(); }
});

test('queue.js wait (CLI) blocks until the page posts a request, then prints it and exits', async () => {
  const d = tmp();
  fs.mkdirSync(path.join(d, '.io'));
  const { server, port } = await startServer(d);
  try {
    const child = spawn(process.execPath, [path.join(ROOT, 'engine', 'queue.js'), 'wait', '--dir', d], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = ''; child.stdout.on('data', (c) => { out += c; });
    const exited = new Promise((resolve) => child.on('exit', resolve));
    await new Promise((r) => setTimeout(r, 400));
    assert.strictEqual(child.exitCode, null, 'still waiting');
    await request(port, 'POST', '/api/queue', { headers: { 'content-type': 'application/json' }, body: { type: 'montage', ideaId: 'i9', format: 'youtube', title: 'درس' } });
    const code = await Promise.race([exited, new Promise((r) => setTimeout(() => r('timeout'), 5000))]);
    assert.strictEqual(code, 0);
    const item = JSON.parse(out);
    assert.strictEqual(item.type, 'montage');
    assert.strictEqual(item.format, 'youtube');
    assert.match(item._summary, /يوتيوب طويل/);
    assert.match(item._next, /take q/);
    execFileSync(process.execPath, [path.join(ROOT, 'engine', 'queue.js'), 'take', item.id, '--dir', d]);
    execFileSync(process.execPath, [path.join(ROOT, 'engine', 'queue.js'), 'progress', item.id, 'أقص', '40', '--dir', d]);
    execFileSync(process.execPath, [path.join(ROOT, 'engine', 'queue.js'), 'done', item.id, '--out', 'output/a.mp4', '--dir', d]);
    const it = Q.list(d)[0];
    assert.strictEqual(it.status, 'done');
    assert.strictEqual(it.out, 'output/a.mp4');
  } finally { server.close(); }
});

test('serve --reuse finds the server already running for the same project', async () => {
  const d = tmp();
  fs.mkdirSync(path.join(d, '.io'));
  const { server, port } = await startServer(d);
  try {
    assert.strictEqual(JSON.parse(fs.readFileSync(path.join(d, '.io', 'server.json'), 'utf8')).port, port);
    assert.strictEqual(await serve.probe(port, d), port);
    assert.strictEqual(await serve.probe(port, tmp()), 0, 'another project');
    assert.strictEqual(await serve.findRunning(d), port);
  } finally { server.close(); }
});

test('session start: daily trends fallback and the request queue', () => {
  const H = require('../hooks/session-start.js');
  assert.match(H.run(tmp()), /تكمل الإعدادات من صفحة الويب لو هنا بالشات؟/);
  const d = tmp();
  const sd = path.join(d, '.io');
  fs.mkdirSync(sd);
  fs.writeFileSync(path.join(sd, 'creator-profile.md'), '- الاسم: سارة\n');
  const now = new Date(2026, 10, 9, 10, 0);
  assert.strictEqual(H.dailyTrendsLine(d, {}, now), '');
  assert.strictEqual(H.dailyTrendsLine(d, { dailyTrends: { enabled: false, hour: 9 } }, now), '');
  fs.writeFileSync(path.join(sd, 'project.json'), JSON.stringify({ dailyTrends: { enabled: true, hour: 8 } }));
  let out = H.run(d, now);
  assert.match(out, /الترند اليومي مفعّل \(الساعة 8:00\)/);
  assert.match(out, /app\.html#ideas" --reuse/);
  fs.writeFileSync(path.join(sd, 'trends-last.json'), JSON.stringify({ date: '2026-11-09' }));
  assert.doesNotMatch(H.run(d, now), /الترند اليومي مفعّل/);
  assert.match(H.run(d, new Date(2026, 10, 10, 9)), /الترند اليومي مفعّل/, 'next day again');
  assert.doesNotMatch(H.run(d, now), /autopilot/, 'app never used, nothing queued');
  fs.writeFileSync(path.join(sd, 'plan.json'), '{"ideas":[]}');
  assert.match(H.run(d, now), /سكل io-autopilot/);
  Q.enqueue(d, { type: 'script', text: 'x' });
  out = H.run(d, now);
  assert.match(out, /1 طلب بالانتظار/);
  assert.match(out, /queue\.js" wait/);
});

test('add-ideas CLI marks today\'s trends as done', () => {
  const d = tmp();
  const f = path.join(d, 'ideas.json');
  fs.writeFileSync(f, JSON.stringify([{ title: 'فكرة من الترند' }]));
  execFileSync(process.execPath, [path.join(ROOT, 'engine', 'app-api.js'), 'add-ideas', f, '--dir', d]);
  const last = JSON.parse(fs.readFileSync(path.join(d, '.io', 'trends-last.json'), 'utf8'));
  const t = new Date();
  assert.strictEqual(last.date, `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`);
  assert.strictEqual(last.added, 1);
});
