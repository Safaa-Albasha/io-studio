'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const A = require('../engine/app-api.js');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'io-app-'));
const put = (dir, rel, obj) => { const f = path.join(dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, typeof obj === 'string' ? obj : JSON.stringify(obj)); };

test('frontmatter: plain and folded descriptions', () => {
  assert.deepStrictEqual(A.parseFrontmatter('---\nname: a\ndescription: يكتب سكربت\n---\nbody'), { name: 'a', description: 'يكتب سكربت' });
  const fm = A.parseFrontmatter('---\nname: b\ndescription: >\n  سطر أول\n  سطر ثاني\nuser-invocable: false\n---\n');
  assert.strictEqual(fm.description, 'سطر أول سطر ثاني');
  assert.strictEqual(fm['user-invocable'], 'false');
});

test('skills and catalogs read the installed plugin', () => {
  const sk = A.skills();
  assert.ok(sk.length > 10 && sk.every((s) => s.name && typeof s.description === 'string'));
  assert.ok(sk.some((s) => s.name === 'io-script'));
  const c = A.catalogs();
  assert.ok(c.moves.length >= 100, 'moves from every catalog*.json');
  assert.strictEqual(new Set(c.moves.map((m) => m.id)).size, c.moves.length);
  assert.ok(c.moves.some((m) => m.preview && m.preview.startsWith('/skills/io-video-editor/motion/moves/previews/')));
  assert.ok(c.sfx.sounds.length && c.sfx.sounds[0].src.startsWith('/library/sfx/'));
  assert.ok(c.looks.looks.length && c.looks.looks.some((l) => l.preview));
  assert.ok(c.lessons.length && c.styles.length && c.stickers.length && c.furniture.length && c.rooms.length);
  assert.ok(c.pages.some((p) => p.path === 'app.html'));
});

test('catalogs survive a plugin folder with nothing installed', () => {
  const c = A.catalogs(tmp());
  assert.deepStrictEqual(c.moves, []);
  assert.deepStrictEqual(c.sfx.sounds, []);
  assert.deepStrictEqual(c.skills, []);
});

test('sources: missing file, string and object accounts', () => {
  const d = tmp();
  assert.deepStrictEqual(A.sources(d), { sites: [], accounts: [], keywords: [] });
  put(d, '.io/sources.json', { sites: ['example.com'], accounts: ['instagram: @someone', '@plain', { platform: 'youtube', handle: '@chan' }, null], keywords: ['ذكاء'] });
  const s = A.sources(d);
  assert.deepStrictEqual(s.accounts, [{ platform: 'instagram', handle: '@someone' }, { platform: '', handle: '@plain' }, { platform: 'youtube', handle: '@chan' }]);
  assert.deepStrictEqual(s.sites, ['example.com']);
  assert.deepStrictEqual(s.keywords, ['ذكاء']);
});

test('account type: missing types file, and a matched type', () => {
  const d = tmp(), root = tmp();
  put(d, '.io/project.json', { accountType: 'doctor', contentFormat: 'podcast' });
  const none = A.accountType(d, root);
  assert.strictEqual(none.available, false);
  assert.strictEqual(none.type, null);
  assert.strictEqual(none.accountType, 'doctor');
  put(root, 'library/account-types/types.json', { types: [{ id: 'doctor', name: 'طبيب', moves: ['caption'], rules: ['مصادر'] }], formats: [{ id: 'podcast', name: 'بودكاست' }] });
  const at = A.accountType(d, root);
  assert.strictEqual(at.available, true);
  assert.strictEqual(at.type.name, 'طبيب');
  assert.strictEqual(at.format.id, 'podcast');
  assert.strictEqual(at.types.length, 1);
  assert.strictEqual(A.accountType(tmp(), root).type, null);
});

test('plan: read empty, write valid, reject bad', () => {
  const d = tmp();
  assert.deepStrictEqual(A.readPlan(d), { version: 1, ideas: [] });
  const r = A.writePlan(d, { ideas: [{ id: 'a1', title: ' فكرة ', hook: 'هوك', platforms: ['instagram', 'tiktok', 'myspace', 'tiktok'], format: 'ريل', status: 'scheduled', date: '2026-11-10', time: '19:00', steps: { script: true, 'x y': 'z' } }] });
  assert.ok(r.ok, JSON.stringify(r.errors));
  const p = A.readPlan(d);
  assert.strictEqual(p.ideas[0].title, 'فكرة');
  assert.deepStrictEqual(p.ideas[0].platforms, ['instagram', 'tiktok']);
  assert.deepStrictEqual(p.ideas[0].steps, { script: true, xy: 'z' });
  assert.strictEqual(p.ideas[0].date, '2026-11-10');
  assert.ok(fs.existsSync(path.join(d, '.io', 'plan.json')));

  assert.strictEqual(A.writePlan(d, '{nope').ok, false);
  assert.strictEqual(A.writePlan(d, { ideas: 'x' }).ok, false);
  assert.strictEqual(A.writePlan(d, { ideas: [{ title: '' }] }).ok, false);
  assert.strictEqual(A.writePlan(d, { ideas: [{ id: 'a', title: 'x' }, { id: 'a', title: 'y' }] }).ok, false);
  assert.strictEqual(A.writePlan(d, { ideas: [{ title: 'x'.repeat(2e6) }] }).ok, false, 'size limit');
  const n = A.normalizePlan({ ideas: [{ title: 't', status: 'weird', date: 'tomorrow' }] }).plan.ideas[0];
  assert.strictEqual(n.status, 'idea');
  assert.strictEqual(n.date, '');
  assert.ok(n.id);
  assert.strictEqual(A.readPlan(d).ideas.length, 1, 'rejected writes leave the file alone');
});

test('best times come from stats.json via stats-core', () => {
  const d = tmp();
  assert.strictEqual(A.bestTimes(d).available, false);
  const posts = Array.from({ length: 8 }, (_, k) => ({ id: 'p' + k, date: `2026-10-${String(5 + k).padStart(2, '0')}T${k % 2 ? '20' : '09'}:00`, views: k % 2 ? 900 : 100 }));
  put(d, '.io/stats.json', { version: 1, accounts: { instagram: { platform: 'instagram', posts, snapshots: [] } } });
  const b = A.bestTimes(d);
  assert.strictEqual(b.available, true);
  assert.strictEqual(b.per.instagram.hour, 20);
  assert.ok(b.per.instagram.weekdayAr);
});

test('route answers app endpoints and ignores others', async () => {
  const d = tmp();
  const calls = [];
  const h = { sendJson: (res, code, obj) => calls.push([code, obj]), readBody: () => Promise.resolve(JSON.stringify({ ideas: [{ id: 'z', title: 'ت' }] })) };
  const u = (p) => new URL(p, 'http://x');
  assert.strictEqual(A.route({ method: 'GET' }, {}, u('/api/state'), d, h), false);
  assert.strictEqual(A.route({ method: 'GET' }, {}, u('/api/sources'), d, h), true);
  assert.strictEqual(A.route({ method: 'POST' }, {}, u('/api/plan'), d, h), true);
  await new Promise((r) => setImmediate(r));
  assert.strictEqual(calls[1][0], 200);
  assert.strictEqual(A.readPlan(d).ideas[0].id, 'z');
});

test('plan keeps trend fields and the editor work folder', () => {
  const n = A.normalizePlan({ ideas: [{ title: 't', source: 'trend', why: 'لأن الترند', trendRef: { title: 'خبر', url: 'javascript:alert(1)', account: '@acc' }, createdAt: '2026-11-09T08:00:00Z', work: 'work/"x"' }] }).plan.ideas[0];
  assert.strictEqual(n.source, 'trend');
  assert.strictEqual(n.why, 'لأن الترند');
  assert.deepStrictEqual(n.trendRef, { title: 'خبر', url: '', account: '@acc' }, 'only http(s) links');
  assert.strictEqual(n.createdAt, '2026-11-09T08:00:00.000Z');
  assert.strictEqual(n.work, 'work/x');
  assert.strictEqual(A.normalizePlan({ ideas: [{ title: 't', source: 'spam' }] }).plan.ideas[0].source, undefined);
});

test('addIdeas dedupes by title, assigns ids and keeps existing ideas', () => {
  const d = tmp();
  A.writePlan(d, { ideas: [{ id: 'old', title: 'فكرة قديمة', status: 'scheduled', date: '2026-11-12' }] });
  const r = A.addIdeas(d, [
    { title: 'فكرة  قديمة', source: 'trend' },
    { title: 'جديدة', hook: 'هوك', source: 'trend', why: 'ترند اليوم', trendRef: { url: 'https://example.com/a' } },
    { title: 'جديدة ' },
    { title: '' },
  ], new Date('2026-11-09T10:00:00Z'));
  assert.ok(r.ok, JSON.stringify(r.errors));
  assert.strictEqual(r.added.length, 1);
  assert.deepStrictEqual(r.skipped, ['فكرة  قديمة', 'جديدة']);
  const p = A.readPlan(d);
  assert.strictEqual(p.ideas.length, 2);
  const n = p.ideas[0];
  assert.strictEqual(n.title, 'جديدة');
  assert.strictEqual(n.status, 'idea');
  assert.strictEqual(n.source, 'trend');
  assert.strictEqual(n.createdAt, '2026-11-09T10:00:00.000Z');
  assert.deepStrictEqual(n.platforms, ['instagram', 'youtube', 'tiktok']);
  assert.ok(n.id && n.id !== 'old');
  assert.strictEqual(p.ideas[1].date, '2026-11-12');
  assert.strictEqual(A.addIdeas(d, 'x').ok, false);
});

test('CLI add-ideas writes into the project plan', () => {
  const { execFileSync } = require('child_process');
  const d = tmp();
  const f = path.join(d, 'ideas.json');
  fs.writeFileSync(f, JSON.stringify({ ideas: [{ title: 'من السكل', why: 'سبب' }] }));
  const out = execFileSync(process.execPath, [path.join(__dirname, '..', 'engine', 'app-api.js'), 'add-ideas', f, '--dir', d], { encoding: 'utf8' });
  assert.match(out, /انضافت 1/);
  const i = A.readPlan(d).ideas[0];
  assert.strictEqual(i.title, 'من السكل');
  assert.strictEqual(i.source, 'trend', 'CLI marks ideas as trend by default');
  assert.throws(() => execFileSync(process.execPath, [path.join(__dirname, '..', 'engine', 'app-api.js'), 'nope'], { stdio: 'pipe' }));
});

test('route exposes project and plugin paths', () => {
  const calls = [];
  A.route({ method: 'GET' }, {}, new URL('/api/paths', 'http://x'), '/proj', { sendJson: (r, c, o) => calls.push(o) });
  assert.strictEqual(calls[0].project, '/proj');
  assert.ok(fs.existsSync(path.join(calls[0].plugin, 'skills')));
});

test('editorStatus sees a running editor and a stopped one', async () => {
  const http = require('http');
  const srv = http.createServer((q, r) => { r.writeHead(q.url === '/api/tl/state' ? 200 : 404); r.end('{}'); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const port = srv.address().port;
  assert.deepStrictEqual(await A.editorStatus(port), { running: true, port, timeline: true });
  await new Promise((r) => srv.close(r));
  assert.strictEqual((await A.editorStatus(port)).running, false);
  assert.strictEqual((await A.editorStatus(80)).running, false, 'privileged ports are not probed');
});
