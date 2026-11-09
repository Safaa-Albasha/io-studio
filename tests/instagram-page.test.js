'use strict';
// web/instagram.html — I/O Studio's Instagram page: its read-only API additions (profile header, one post's
// analysis), the page wiring (queue requests, demo label, links), and the brand rule: generic stroke
// icons only, no platform logo, wordmark or gradient.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const S = require('../web/lib/stats-core.js');
const T = require('../engine/stats.js');
const API = require('../engine/stats-api.js');
const Q = require('../engine/queue.js');

const ROOT = path.join(__dirname, '..');
const WEB = path.join(ROOT, 'web');
const page = fs.readFileSync(path.join(WEB, 'instagram.html'), 'utf8');
const fixture = () => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'stats', 'composio-instagram.json'), 'utf8'));
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'io-igpage-'));

function project() {
  const d = tmp();
  const j = fixture();
  j.user.data.biography = 'سطر من إنستقرام';
  j.user.data.profile_picture_url = 'https://cdn.example.invalid/me.jpg';
  const st = S.emptyStats();
  T.importComposioInstagram(d, st, j);
  T.save(T.statsFile(d), st);
  fs.mkdirSync(path.join(d, '.io', 'analysis'), { recursive: true });
  fs.writeFileSync(path.join(d, '.io', 'analysis', 'instagram-1801.json'), JSON.stringify({ at: '2026-10-11', promised: 'سبب واحد', leftAt: 'الثانية ٩', fixes: ['أ', 'ب', 'ج'], hook: { original: 'x', rewritten: 'هوك أقوى' }, durationSec: 30 }));
  return d;
}
function startServer(dir) {
  return new Promise((resolve) => { require('../engine/serve.js').start(0, { dir, quiet: true, onListen: (server, port) => resolve({ server, port }) }); });
}
function get(port, p) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path: p }, (res) => {
      let b = ''; res.setEncoding('utf8'); res.on('data', (c) => { b += c; });
      res.on('end', () => { let j = null; try { j = JSON.parse(b); } catch (e) { /* */ } resolve({ code: res.statusCode, json: j, text: b }); });
    }).on('error', reject);
  });
}

test('Composio pull keeps the public profile fields for the header (no tokens)', () => {
  const j = fixture();
  j.user.data.biography = 'بايو';
  j.user.data.profile_picture_url = 'javascript:alert(1)';
  const r = T.fromComposioInstagram(j);
  assert.deepStrictEqual(r.extra.profile, { name: 'Example', bio: 'بايو', follows: 100, mediaCount: 3 });
  assert.ok(fs.readFileSync(path.join(ROOT, 'skills', 'io-dashboard', 'scripts', 'composio_pull.py'), 'utf8').includes('biography,profile_picture_url'));
});

test('readProfile: creator-profile.md lines win, the pull fills the rest', () => {
  const d = project();
  let p = API.readProfile(d);
  assert.strictEqual(p.handle, '@example_creator');
  assert.strictEqual(p.followers, 5000);
  assert.strictEqual(p.follows, 100);
  assert.strictEqual(p.mediaCount, 3);
  assert.strictEqual(p.name, 'Example');
  assert.strictEqual(p.bio, 'سطر من إنستقرام');
  assert.strictEqual(p.picture, 'https://cdn.example.invalid/me.jpg');
  fs.writeFileSync(path.join(d, '.io', 'creator-profile.md'), '## مَن أنا\n- الاسم: سما\n- الحسابات: إنستقرام @sama.demo\n- المجال (النيش): تصوير بالموبايل\n- جملة تعريف (سطر واحد): أعلّمك الريلز\n');
  p = API.readProfile(d);
  assert.deepStrictEqual([p.name, p.niche, p.bio], ['سما', 'تصوير بالموبايل', 'أعلّمك الريلز']);
  // an empty template line stays empty (does not swallow the next line)
  fs.writeFileSync(path.join(d, '.io', 'creator-profile.md'), '- الاسم: \n- المجال (النيش): \n');
  p = API.readProfile(d);
  assert.strictEqual(p.name, 'Example');
  assert.strictEqual(p.niche, '');
});

test('GET /api/stats/profile and /api/stats/analysis/:id — read-only, nothing secret', async () => {
  const d = project();
  const { server, port } = await startServer(d);
  try {
    const pr = await get(port, '/api/stats/profile');
    assert.strictEqual(pr.code, 200);
    assert.deepStrictEqual(Object.keys(pr.json).sort(), ['bio', 'followers', 'follows', 'handle', 'mediaCount', 'name', 'niche', 'picture']);
    const a = await get(port, '/api/stats/analysis/instagram-1801');
    assert.strictEqual(a.code, 200);
    assert.strictEqual(a.json.key, 'instagram-1801');
    assert.strictEqual(a.json.analysis.hook.rewritten, 'هوك أقوى');
    assert.strictEqual(a.json.post.id, '1801');
    assert.ok(a.json.post.score !== undefined && Array.isArray(a.json.post.reasons));
    assert.strictEqual(a.json.post.durationSec, 30, 'the analysis fills the reel length');
    assert.ok(a.json.baseline && a.json.baseline.followers === 5000);
    // bare id + ?platform, a post with no analysis yet
    const b = await get(port, '/api/stats/analysis/1802?platform=instagram');
    assert.strictEqual(b.code, 200);
    assert.strictEqual(b.json.analysis, null);
    assert.strictEqual(b.json.post.id, '1802');
    for (const bad of ['/api/stats/analysis/9999', '/api/stats/analysis/..%2F..%2Fetc%2Fpasswd', '/api/stats/analysis/instagram-a.b', '/api/stats/analysis/%E0%A4%A']) {
      const r = await get(port, bad);
      assert.strictEqual(r.code, 404, bad);
    }
    for (const r of [pr, a, b]) assert.ok(!/token|secret|api_?key|password/i.test(r.text), 'no secrets in the response');
  } finally { server.close(); }
});

test('page wiring: data sources, queue types the queue accepts, demo label, file:// note', () => {
  for (const s of ['lib/brand.css', 'lib/stats-core.js', 'lib/content-eval.js', 'lib/logo.svg']) assert.ok(page.includes(s), s);
  for (const s of ["'/api/stats'", "'/api/stats/profile'", "'/api/stats/eval?platform=instagram'", "'/api/stats/analysis/'", "'/api/queue'"]) assert.ok(page.includes(s), s);
  for (const t of ['sync-stats', 'analyze-post', 'stats-ideas', 'script']) {
    assert.ok(page.includes(`type: '${t}'`), t);
    assert.ok(Q.TYPES.includes(t), t + ' is a queue type');
  }
  // the bodies the page sends pass the queue's own validation
  assert.ok(Q.normalize({ type: 'sync-stats', platform: 'instagram' }).req);
  assert.ok(Q.normalize({ type: 'analyze-post', platform: 'instagram', postId: '1801', title: 't', url: 'https://x.invalid/', videoUrl: '', metrics: { views: 1 } }).req);
  assert.ok(Q.normalize({ type: 'stats-ideas', platform: 'instagram', top: [{ title: 't', platform: 'instagram', metrics: { views: 1 } }], note: 'n' }).req);
  assert.ok(Q.normalize({ type: 'script', format: 'reel', title: 'نسخة محسّنة', text: 'x' }).req);
  for (const s of ['بيانات تجريبية', 'اسحب الآن', 'آخر مزامنة', 'هايلايت', 'ريلز', 'منشورات', 'الجمهور', 'تحليل', 'الإحصائيات', 'نظرة عامة', 'الاحتفاظ', 'التفاعل', 'حلّل هالريل بعمق', 'سو نسخة محسّنة', 'انسخ الهوك الجديد', 'أضف للأفكار', 'شنو يشتغل عندك', 'منشورات', 'متابعين', 'يتابع', 'نسبة السحب', 'متوسط المشاهدة']) assert.ok(page.includes(s), s);
  for (const s of ['data-sort="date"', 'data-sort="score"', 'data-sort="views"', 'data-sort="hook"']) assert.ok(page.includes(s), s);
  assert.match(page, /location\.protocol === 'file:'/);
  assert.match(page, /node engine\/serve\.js --open instagram\.html/);
  assert.match(page, /prefers-color-scheme/);
  assert.match(page, /dataset\.theme/);
});

test('brand: generic inline stroke icons, I/O Studio logo, no platform logo/wordmark/gradient', () => {
  for (const n of ['heart', 'comment', 'share', 'save', 'play', 'eye', 'reach', 'clock', 'swipe', 'grid', 'reels', 'user', 'users']) assert.ok(page.includes(`<symbol id="i-${n}"`), n);
  assert.match(page, /stroke:currentColor/);
  assert.ok(page.includes('fill="#5CB8F0"'), 'I/O Studio mark inlined');
  const low = page.toLowerCase();
  for (const bad of ['#f09433', '#e6683c', '#dc2743', '#cc2366', '#bc1888', '#833ab4', '#fd1d1d', '#f77737', '#fcaf45', '#e1306c', '#c13584', '#405de6', '#5851db', '#ffdc80', 'instagram-logo', 'instagram_logo', 'ig-logo', 'glyph', 'cdninstagram', 'static.cdninstagram', 'font-awesome', 'fa-instagram', 'simple-icons', 'bi-instagram']) assert.ok(!low.includes(bad), 'found ' + bad);
  assert.ok(!/<img[^>]+src="[^"$]*instagram/i.test(page), 'no remote platform images');
  assert.ok(!/<link[^>]+href="(?!https:\/\/fonts\.g|lib\/)/.test(page), 'only Google Fonts + our own css');
  assert.ok(!/<script[^>]+src="(?!lib\/)/.test(page), 'only our own scripts');
  for (const f of fs.readdirSync(path.join(WEB, 'lib'))) assert.ok(!/insta|ig[-_]?logo/i.test(f), 'no logo asset ' + f);
});

test('linked from app.html (next to الإحصائيات) and index.html', () => {
  const app = fs.readFileSync(path.join(WEB, 'app.html'), 'utf8');
  const idx = fs.readFileSync(path.join(WEB, 'index.html'), 'utf8');
  assert.ok((app.match(/href="instagram\.html"/g) || []).length >= 2, 'header + nav');
  assert.ok(app.indexOf('href="instagram.html"') > app.indexOf('href="dashboard.html"'));
  assert.ok(idx.includes('href="instagram.html"'));
});
