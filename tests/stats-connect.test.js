'use strict';
// Stats page data paths: Instagram via Claude + Composio (import --from composio-instagram),
// manual entry / export upload saved to .io/stats.json, the page API, the daily-pull hook, queue types.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');
const S = require('../web/lib/stats-core.js');
const T = require('../engine/stats.js');
const Q = require('../engine/queue.js');
const hook = require('../hooks/session-start.js');

const ROOT = path.join(__dirname, '..');
const FIX = path.join(__dirname, 'fixtures', 'stats');
const fixture = (f) => JSON.parse(fs.readFileSync(path.join(FIX, f), 'utf8'));
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'io-stats-'));
const ex = (f) => fs.readFileSync(path.join(ROOT, 'examples', 'stats', f), 'utf8');

test('Composio Instagram pull → posts with official insights and src per metric', () => {
  const r = T.fromComposioInstagram(fixture('composio-instagram.json'));
  assert.strictEqual(r.handle, '@example_creator');
  assert.strictEqual(r.followers, 5000);
  assert.strictEqual(r.posts.length, 3);
  const reel = r.posts.find((p) => p.id === '1801');
  assert.deepStrictEqual([reel.views, reel.reach, reel.saves, reel.shares, reel.likes, reel.comments], [12000, 9000, 400, 250, 300, 20]);
  assert.strictEqual(reel.avgWatchSec, 9.8, 'ig_reels_avg_watch_time is milliseconds');
  assert.strictEqual(reel.skipRate, 22.5);
  assert.strictEqual(reel.hold3, 77.5, 'hold after 3 s = 100 − skip rate');
  assert.strictEqual(reel.title, 'ليش ما أحد يگلك هالشي؟', 'first caption line');
  assert.strictEqual(reel.type, 'video');
  assert.strictEqual(reel.src.skipRate, 'official');
  // total_value rows (feed) parse too; a carousel has no reel metrics
  const car = r.posts.find((p) => p.id === '1803');
  assert.strictEqual(car.type, 'carousel');
  assert.strictEqual(car.saves, 210);
  assert.strictEqual(car.skipRate, null);
  assert.strictEqual(car.avgWatchSec, null);
  // account insights: follower history, online hours, demographics
  assert.deepStrictEqual(r.snapshots.map((s) => [s.date, s.followers]), [['2026-10-08', 4980], ['2026-10-09', 5000], ['2026-10-10', 5000]]);
  assert.strictEqual(r.extra.onlineHours[21], 300);
  assert.deepStrictEqual(r.extra.audience.country[0], { k: 'IQ', v: 2600 });
});

test('Composio wrapper and bare Graph shapes both work; garbage is refused in Arabic', () => {
  const j = fixture('composio-instagram.json');
  const bare = { user: j.user.data, media: j.media.data.data, insights: { 1801: j.insights['1801'].data } };
  const r = T.fromComposioInstagram(bare);
  assert.strictEqual(r.posts.length, 3);
  assert.strictEqual(r.posts.find((p) => p.id === '1801').reach, 9000);
  assert.strictEqual(r.posts.find((p) => p.id === '1802').reach, null, 'no insights → null, not 0');
  assert.strictEqual(r.posts.find((p) => p.id === '1802').likes, 40, 'falls back to media like_count');
  assert.throws(() => T.fromComposioInstagram({ foo: 1 }), /Composio/);
});

test('a later weaker source never wipes official numbers', () => {
  const st = S.emptyStats();
  T.importComposioInstagram(null, st, fixture('composio-instagram.json'));
  T.applyManual(st, { platform: 'instagram', posts: [{ id: '1801', views: 5, likes: 1 }] });
  const p = st.accounts.instagram.posts.find((x) => x.id === '1801');
  assert.strictEqual(p.views, 12000);
  assert.strictEqual(p.src.views, 'official');
  assert.strictEqual(p.reach, 9000);
  assert.strictEqual(st.accounts.instagram.sync.source, 'composio', 'badge stays «مربوط»');
});

test('manual form → posts with src manual, follower snapshot, validation', () => {
  const st = S.emptyStats();
  assert.deepStrictEqual(T.applyManual(st, { platform: 'x' }).ok, false);
  assert.strictEqual(T.applyManual(st, { platform: 'tiktok' }).ok, false);
  const r = T.applyManual(st, { platform: 'tiktok', handle: 'https://www.tiktok.com/@someone', followers: '1200', date: '2026-10-01', posts: [{ title: 'أول فيديو', date: '2026-10-01T20:00', views: 900, likes: 50, comments: 4, shares: 3, durationSec: 22, hold3: 64, url: 'javascript:alert(1)' }] }, new Date('2026-10-02T00:00:00Z'));
  assert.ok(r.ok);
  const a = st.accounts.tiktok;
  assert.strictEqual(a.handle, '@someone');
  assert.strictEqual(a.followers, 1200);
  assert.deepStrictEqual(a.snapshots, [{ date: '2026-10-01', followers: 1200, newFollowers: 0 }]);
  assert.ok(!a.posts[0].url, 'only http(s) links');
  assert.strictEqual(a.posts[0].src.hold3, 'manual');
  assert.strictEqual(a.posts[0].saves, undefined, 'not given → not stored');
  assert.strictEqual(a.sync.source, 'manual');
});

test('CLI: import --from composio-instagram writes .io/stats.json, connect-status / due / sync', () => {
  const d = tmp();
  const node = (...a) => execFileSync(process.execPath, [path.join(ROOT, 'engine', 'stats.js'), ...a, '--dir', d], { encoding: 'utf8', env: Object.assign({}, process.env, { CLAUDE_PROJECT_DIR: '' }) });
  const due = (now) => T.syncDue(d, now);
  assert.strictEqual(due().due, false, 'manual mode: never due');
  assert.strictEqual(T.setMode(d, 'composio').ok, true);
  assert.strictEqual(T.setMode(d, 'apify').ok, false);
  assert.strictEqual(due().due, true, 'composio mode with no pull yet');
  assert.match(hook.statsLine(d), /composio-instagram/);
  const out = node('import', '--from', 'composio-instagram', path.join(FIX, 'composio-instagram.json'));
  assert.match(out, /3 منشور/);
  const st = JSON.parse(fs.readFileSync(path.join(d, '.io', 'stats.json'), 'utf8'));
  assert.strictEqual(st.accounts.instagram.posts.length, 3);
  assert.strictEqual(st.accounts.instagram.sync.source, 'composio');
  assert.strictEqual(due().due, false);
  assert.strictEqual(hook.statsLine(d), '');
  assert.strictEqual(due(new Date(Date.now() + 25 * 3600e3)).due, true, 'due again after 24 h');
  assert.match(node('connect-status'), /Composio/);
  const s = JSON.parse(node('connect-status', '--json'));
  assert.strictEqual(s.platforms.instagram.posts, 3);
  assert.match(node('sync'), /Composio/);
  const ev = JSON.parse(node('eval', '--json'));
  assert.strictEqual(ev.posts.length, 3);
  // the old export import still works and nothing secret was ever written
  assert.ok(!fs.existsSync(path.join(d, '.io', 'secrets.json')));
});

function startServer(dir) {
  return new Promise((resolve) => {
    require('../engine/serve.js').start(0, { dir, quiet: true, onListen: (server, port) => resolve({ server, port }) });
  });
}
function req(port, method, p, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? null : JSON.stringify(body);
    const r = http.request({ host: '127.0.0.1', port, method, path: p, headers: Object.assign(data ? { 'content-type': 'application/json' } : {}, headers) }, (res) => {
      let b = ''; res.setEncoding('utf8'); res.on('data', (c) => { b += c; }); res.on('end', () => { let j = null; try { j = JSON.parse(b); } catch (e) { /* */ } resolve({ code: res.statusCode, json: j, text: b }); });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

test('page API: export upload, manual form, Composio file, replace, eval, clear — saved in the project', async () => {
  const d = tmp();
  const { server, port } = await startServer(d);
  try {
    let r = await req(port, 'GET', '/api/stats');
    assert.strictEqual(r.code, 200);
    assert.strictEqual(r.json.status.mode, 'manual');
    r = await req(port, 'POST', '/api/stats/import', { platform: 'youtube', text: ex('youtube-posts.csv') });
    assert.strictEqual(r.code, 200, r.text);
    assert.ok(r.json.stats.accounts.youtube.posts.length > 20);
    r = await req(port, 'POST', '/api/stats/manual', { platform: 'tiktok', followers: 900, posts: [{ title: 'x', views: 10, likes: 1 }] });
    assert.strictEqual(r.code, 200, r.text);
    r = await req(port, 'POST', '/api/stats/manual', { platform: 'tiktok' });
    assert.strictEqual(r.code, 400);
    assert.match(r.json.errors[0], /المتابعين/);
    r = await req(port, 'POST', '/api/stats/import', { from: 'composio-instagram', text: fs.readFileSync(path.join(FIX, 'composio-instagram.json'), 'utf8') });
    assert.strictEqual(r.code, 200, r.text);
    assert.strictEqual(r.json.status.mode, 'composio');
    assert.strictEqual(r.json.status.platforms.instagram.source, 'composio');
    const saved = JSON.parse(fs.readFileSync(path.join(d, '.io', 'stats.json'), 'utf8'));
    assert.strictEqual(saved.accounts.instagram.posts.length, 3);
    assert.ok(saved.accounts.youtube.posts.length > 20);
    r = await req(port, 'GET', '/api/stats/eval');
    assert.ok(r.json.posts.length > 20 && r.json.patterns.lines.length);
    r = await req(port, 'POST', '/api/stats/mode', { mode: 'manual' });
    assert.strictEqual(r.json.status.mode, 'manual');
    r = await req(port, 'POST', '/api/stats/replace', { stats: { nope: 1 } });
    assert.strictEqual(r.code, 400);
    r = await req(port, 'POST', '/api/stats/clear', { platform: 'youtube' });
    assert.strictEqual(r.json.stats.accounts.youtube.posts.length, 0);
    assert.strictEqual(r.json.stats.accounts.instagram.posts.length, 3);
    r = await req(port, 'POST', '/api/stats/manual', { platform: 'tiktok', followers: 1 }, { origin: 'https://evil.example' });
    assert.strictEqual(r.code, 403, 'only pages served from this machine may write');
    r = await req(port, 'GET', '/api/stats/nope');
    assert.strictEqual(r.code, 404);
  } finally { server.close(); }
});

test('no route ever hands out a secret: no keys stored, none in any response', async () => {
  const d = tmp();
  fs.mkdirSync(path.join(d, '.io'), { recursive: true });
  const { server, port } = await startServer(d);
  try {
    await req(port, 'POST', '/api/stats/import', { from: 'composio-instagram', text: fs.readFileSync(path.join(FIX, 'composio-instagram.json'), 'utf8') });
    const bodies = [];
    for (const p of ['/api/stats', '/api/stats/eval', '/api/queue', '/api/paths', '/api/best-times']) bodies.push((await req(port, 'GET', p)).text);
    for (const b of bodies) assert.doesNotMatch(b, /access_token|client_secret|refresh_token|apify_api|"token"/i);
    const files = fs.readdirSync(path.join(d, '.io'));
    assert.ok(!files.includes('secrets.json'), 'nothing secret to store — Composio holds the login');
  } finally { server.close(); }
});

test('queue: stats request types validate and describe in Arabic', () => {
  const d = tmp();
  let r = Q.enqueue(d, { type: 'analyze-post', platform: 'instagram', postId: '1801', title: 'ريل', url: 'https://www.instagram.com/reel/AAA1/', videoUrl: 'https://cdn.example.invalid/v.mp4', metrics: { views: 12000, hold3: 77.5, nested: { a: 1 }, long: 'x'.repeat(500) }, reason: 'هوك قوي' });
  assert.ok(r.ok, r.errors && r.errors.join());
  assert.deepStrictEqual(r.item.metrics, { views: 12000, hold3: 77.5 });
  assert.match(Q.describe(r.item), /تحليل منشور/);
  r = Q.enqueue(d, { type: 'analyze-post', platform: 'instagram', postId: '../../x', url: 'javascript:alert(1)' });
  assert.ok(r.ok);
  assert.strictEqual(r.item.postId, 'x');
  assert.strictEqual(r.item.url, undefined);
  assert.strictEqual(Q.normalize({ type: 'analyze-post' }).req, null);
  r = Q.enqueue(d, { type: 'analyze-post', posts: [{ platform: 'tiktok', postId: '7' }, { platform: 'bad', postId: '1' }, 'x'] });
  assert.strictEqual(r.item.posts.length, 1);
  assert.match(Q.describe(r.item), /1 منشور/);
  assert.ok(Q.enqueue(d, { type: 'sync-stats' }).ok);
  assert.strictEqual(Q.normalize({ type: 'sync-stats', platform: 'tiktok' }).req, null, 'only Instagram is pulled for now');
  assert.ok(Q.enqueue(d, { type: 'stats-ideas', top: [{ title: 'أفضل ريل', url: 'https://x.example/1', metrics: { views: 9 } }] }).ok);
  assert.strictEqual(Q.normalize({ type: 'stats-ideas', top: [] }).req, null);
  assert.ok(Q.enqueue(d, { type: 'stats-reel', numbers: { followers: 5000, views: 12000 } }).ok);
  assert.strictEqual(Q.normalize({ type: 'stats-reel', numbers: {} }).req, null);
  assert.strictEqual(Q.pending(d).length, 6);
});

test('heatmap: weekday × hour averages, date-only posts ignored', () => {
  const st = S.emptyStats();
  S.merge(st, 'instagram', { posts: [{ id: 'a', date: '2026-10-01T18:00', views: 100 }, { id: 'b', date: '2026-10-01T18:00', views: 300 }, { id: 'c', date: '2026-10-02T00:00', views: 999 }] });
  const h = S.heatmap([st.accounts.instagram]);
  const wd = new Date('2026-10-01T18:00').getDay();
  assert.strictEqual(h.cells[wd][18].n, 2);
  assert.strictEqual(h.cells[wd][18].avg, 200);
  assert.strictEqual(h.max, 200);
});
