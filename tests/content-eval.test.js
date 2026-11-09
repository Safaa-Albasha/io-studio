'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const S = require('../web/lib/stats-core.js');
const T = require('../engine/stats.js');
const E = require('../engine/content-eval.js');

const fixture = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'stats', f), 'utf8'));
const ex = (f) => fs.readFileSync(path.join(__dirname, '..', 'examples', 'stats', f), 'utf8');

/** n posts with a steady baseline; the overrides go on the last one. */
function account(platform, n, last, base = {}) {
  const st = S.emptyStats();
  const posts = [];
  for (let i = 0; i < n; i++) {
    posts.push(Object.assign({ id: `p${i}`, date: `2026-09-${String(i + 1).padStart(2, '0')}T20:00`, title: `منشور ${i}`, views: 1000, likes: 50, comments: 5, shares: 5, saves: 5, durationSec: 25 }, base, i === n - 1 ? last : {}));
  }
  S.merge(st, platform, { posts }, { followers: 2000 });
  return st;
}
const lastOf = (r) => r.posts.find((p) => p.id === r.posts.map((x) => x.id).sort((a, b) => +a.slice(1) - +b.slice(1)).pop());

test('Instagram with official skip rate: real hook score, weak-hook reason with the number', () => {
  const base = { reach: 1500, skipRate: 30, avgWatchSec: 12, src: { skipRate: 'official', avgWatchSec: 'official', reach: 'official' } };
  const r = E.evaluate(account('instagram', 12, { views: 300, skipRate: 62, avgWatchSec: 4 }, base));
  const p = lastOf(r);
  assert.strictEqual(p.hookEstimated, false, 'official skip rate → not «تقديري»');
  assert.ok(p.hookScore < 25, String(p.hookScore));
  assert.strictEqual(p.grade, 'weak');
  assert.strictEqual(p.gradeAr, 'ضعيف');
  assert.strictEqual(p.topReason.code, 'hook-weak');
  assert.match(p.topReason.text, /62% طلعوا قبل الثانية ٣/);
  assert.ok(p.fixes.length >= 1);
  assert.match(p.hookEvidence[0], /نسبة التخطي من إنستقرام/);
  assert.match(p.hookEvidence[1], /متوسط المشاهدة/);
});

test('a strong post: viral + strong hook, good reasons first', () => {
  const base = { reach: 1500, skipRate: 35, avgWatchSec: 10, src: { skipRate: 'official' } };
  const p = lastOf(E.evaluate(account('instagram', 12, { views: 4000, reach: 6000, skipRate: 15, avgWatchSec: 20, likes: 300, saves: 80, shares: 60 }, base)));
  assert.strictEqual(p.grade, 'strong');
  assert.ok(p.hookScore >= 75);
  assert.strictEqual(p.reasons[0].kind, 'good');
  assert.ok(p.reasons.some((r) => r.code === 'viral'));
  assert.ok(p.reasons.some((r) => r.code === 'reach'), 'non-follower reach');
});

test('high saves+shares but low reach → cover / first frame', () => {
  const p = lastOf(E.evaluate(account('instagram', 10, { views: 500, reach: 400, saves: 60, shares: 40 }, { reach: 1200 })));
  assert.ok(p.reasons.some((r) => r.code === 'cover' && /الغلاف/.test(r.text)));
});

test('TikTok (no retention): proxies only, hook «تقديري», honest reason', () => {
  const st = S.emptyStats();
  for (const f of ['tiktok-posts.csv', 'tiktok-followers.csv']) S.importText(st, 'tiktok', ex(f));
  const r = E.evaluate(st, { platform: 'tiktok' });
  assert.ok(r.posts.length > 20);
  for (const p of r.posts) {
    assert.strictEqual(p.platform, 'tiktok');
    assert.strictEqual(p.hookEstimated, true);
    assert.ok(p.score === null || (p.score >= 0 && p.score <= 100));
  }
  const p = r.posts.find((x) => x.hookScore !== null);
  assert.match(p.hookEvidence[0], /تقديري/);
  assert.ok(p.reasons.some((x) => x.code === 'no-retention' && /تيك توك/.test(x.text)));
  assert.ok(r.patterns.lines.length >= 1);
});

test('YouTube manual hold3 → used, but still «تقديري»; retention curve read at 3 s', () => {
  const p = lastOf(E.evaluate(account('youtube', 8, { hold3: 40, src: { hold3: 'manual' } }, { hold3: 70, src: { hold3: 'manual' } })));
  assert.strictEqual(p.hookEstimated, true);
  assert.match(p.hookEvidence[0], /يدوياً/);
  assert.ok(p.reasons.some((r) => r.code === 'hook-weak'));
  const q = lastOf(E.evaluate(account('youtube', 6, { durationSec: 60, retention: [[0, 100], [0.05, 60], [1, 20]] })));
  assert.ok(Math.abs(q.metrics.hold3 - 60) < 0.01, 'x = 3/60');
});

test('dead time, too long, and missing data are handled', () => {
  const st = S.emptyStats();
  const posts = [];
  for (let i = 0; i < 12; i++) posts.push({ id: `q${i}`, date: `2026-08-${String(i + 1).padStart(2, '0')}T${i % 2 ? '20' : '21'}:00`, title: 't', views: i % 3 ? 900 : 1400, likes: 40, comments: 3, durationSec: i % 3 ? 40 : 20 });
  posts.push({ id: 'late', date: '2026-08-20T03:00', title: 'متأخر', views: 300, likes: 5, comments: 0, durationSec: 200 });
  S.merge(st, 'instagram', { posts });
  const p = E.evaluate(st).posts.find((x) => x.id === 'late');
  assert.ok(p.reasons.some((r) => r.code === 'dead-time' && /وقت ميت/.test(r.text)));
  assert.ok(p.reasons.some((r) => r.code === 'too-long' && /طويل على جمهورك/.test(r.text)));
  // a post with nothing measurable doesn't crash
  const empty = S.emptyStats();
  S.merge(empty, 'youtube', { posts: [{ id: 'z', date: null, title: '' }] });
  const z = E.evaluate(empty).posts[0];
  assert.strictEqual(z.score, null);
  assert.strictEqual(z.hookScore, null);
  assert.strictEqual(z.gradeAr, '—');
  assert.deepStrictEqual(E.evaluate(S.emptyStats()).posts, []);
});

test('patterns «شنو يشتغل عندك» compare best vs worst', () => {
  const st = S.emptyStats();
  const posts = [];
  for (let i = 0; i < 16; i++) {
    const good = i % 2 === 0;
    posts.push({ id: `w${i}`, date: `2026-07-${String(i + 1).padStart(2, '0')}T${good ? '20' : '03'}:00`, title: good ? `ليش التصوير بالموبايل أحسن؟ ${i}` : `يوم عادي ${i}`, views: good ? 3000 : 400, likes: good ? 200 : 10, comments: good ? 20 : 1, durationSec: good ? 20 : 90 });
  }
  S.merge(st, 'instagram', { posts });
  const lines = E.evaluate(st).patterns.lines.join('\n');
  assert.match(lines, /سؤال/);
  assert.match(lines, /الأقصر/);
  assert.match(lines, /الوقت/);
  assert.match(lines, /التصوير|بالموبايل/);
  assert.strictEqual(E.hookType('٣ أخطاء بالتصوير'), 'رقم/قائمة');
  assert.strictEqual(E.hookType('لا تشتري كاميرا'), 'تحذير/خطأ');
});

test('Composio fixture end to end + Claude analysis files are attached (and fill the reel length)', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'io-eval-'));
  const st = S.emptyStats();
  T.importComposioInstagram(null, st, fixture('composio-instagram.json'));
  fs.mkdirSync(path.join(d, '.io', 'analysis'), { recursive: true });
  fs.writeFileSync(E.analysisFile(d, 'instagram', '1802'), JSON.stringify({ at: '2026-10-11', verdict: 'الهوك وعد بشي وما وفاه', fixes: ['أ', 'ب', 'ج'], hook: { original: 'x', rewritten: 'هوك أقوى' }, durationSec: 31, hookmeter: { first_word_sec: 1.9 } }));
  fs.writeFileSync(path.join(d, '.io', 'analysis', 'instagram-broken.json'), '{nope');
  const r = E.evaluateProject(d, st);
  const p = r.posts.find((x) => x.id === '1802');
  assert.strictEqual(p.analysis.hook.rewritten, 'هوك أقوى');
  assert.strictEqual(p.durationSec, 31);
  assert.ok(p.metrics.watchRatio > 0.09 && p.metrics.watchRatio < 0.11, 'avg watch 3.1 s ÷ 31 s');
  assert.ok(p.reasons.some((x) => x.code === 'late-word'), 'hookmeter first word');
  assert.ok(p.hookEvidence.some((x) => /مقياس الهوك/.test(x)));
  assert.strictEqual(r.posts.find((x) => x.id === '1801').analysis, null);
  assert.strictEqual(E.analysisFile(d, 'instagram', '../../etc').endsWith(path.join('analysis', 'instagram-etc.json')), true);
});
