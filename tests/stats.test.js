'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const S = require('../web/lib/stats-core.js');

const ex = (f) => fs.readFileSync(path.join(__dirname, '..', 'examples', 'stats', f), 'utf8');

test('parseNumber handles separators, suffixes and Arabic digits', () => {
  assert.strictEqual(S.parseNumber('1,234'), 1234);
  assert.strictEqual(S.parseNumber('1.234.567'), 1234567);
  assert.strictEqual(S.parseNumber('1.5K'), 1500);
  assert.strictEqual(S.parseNumber('2M'), 2e6);
  assert.strictEqual(S.parseNumber('١٢٣٤'), 1234);
  assert.strictEqual(S.parseNumber('٣٫٥'), 3.5);
  assert.strictEqual(S.parseNumber('12,5'), 12.5);
  assert.strictEqual(S.parseNumber('—'), 0);
  assert.strictEqual(S.parseNumber('45%'), 45);
});

test('parseDate reads ISO, US, day-first and long forms', () => {
  assert.strictEqual(S.parseDate('2026-08-04 21:00'), '2026-08-04T21:00');
  assert.strictEqual(S.parseDate('8/4/2026 15:00'), '2026-08-04T15:00');
  assert.strictEqual(S.parseDate('25/4/2026'), '2026-04-25T00:00');
  assert.strictEqual(S.parseDate('3/4/2026 9:30 pm'), '2026-03-04T21:30');
  assert.strictEqual(S.parseDate('Aug 5, 2026').slice(0, 10), '2026-08-05');
  assert.strictEqual(S.parseDate(''), null);
});

test('parseCSV: quotes, BOM, semicolons', () => {
  assert.deepStrictEqual(S.parseCSV('﻿a,b\n"x, y","he said ""hi"""\n'), [['a', 'b'], ['x, y', 'he said "hi"']]);
  assert.deepStrictEqual(S.parseCSV('a;b\n1;2'), [['a', 'b'], ['1', '2']]);
});

test('header aliases map English and Arabic columns', () => {
  assert.strictEqual(S.fieldFor('Total views'), 'views');
  assert.strictEqual(S.fieldFor('المشاهدات'), 'views');
  assert.strictEqual(S.fieldFor('Watch time (hours)'), 'watchHours');
  assert.strictEqual(S.fieldFor('Video publish time'), 'date');
  assert.strictEqual(S.fieldFor('Subscribers'), 'followers');
});

test('the three example exports import the same way', () => {
  const st = S.emptyStats();
  for (const p of S.PLATFORM_IDS) {
    const a = S.importText(st, p, ex(`${p}-posts.csv`));
    const b = S.importText(st, p, ex(`${p}-followers.csv`));
    assert.strictEqual(a.kind, 'posts', p);
    assert.ok(a.posts > 20, p);
    assert.deepStrictEqual(a.unknown.filter((u) => !/Content|Post type|Duration/i.test(u)), [], p);
    assert.strictEqual(b.kind, 'followers', p);
    assert.strictEqual(b.snapshots, 90, p);
    assert.ok(st.accounts[p].followers > 0, p);
  }
  // YouTube watch hours become seconds
  assert.ok(st.accounts.youtube.posts[0].watchSec > 0);
  // re-import does not duplicate
  const n = st.accounts.instagram.posts.length;
  S.importText(st, 'instagram', ex('instagram-posts.csv'));
  assert.strictEqual(st.accounts.instagram.posts.length, n);
});

test('kpis use one formula for every platform', () => {
  const st = S.emptyStats();
  const posts = [
    { id: 'a', date: '2026-01-01T10:00', views: 100, likes: 5, comments: 2, shares: 1, saves: 2 },
    { id: 'b', date: '2026-01-08T10:00', views: 300, likes: 10, comments: 0, shares: 0, saves: 0 },
  ];
  for (const p of S.PLATFORM_IDS) S.merge(st, p, { posts, snapshots: [{ date: '2026-01-01', followers: 1000 }, { date: '2026-01-08', followers: 1100 }] });
  const c = S.compare(st);
  for (const p of S.PLATFORM_IDS) {
    const k = c.per[p];
    assert.strictEqual(k.views, 400);
    assert.strictEqual(k.engagement, 20);
    assert.strictEqual(k.engagementRate, 0.05);
    assert.strictEqual(k.followerGrowth, 100);
    assert.strictEqual(k.followerGrowthPct, 0.1);
    assert.strictEqual(k.medianViews, 200);
    assert.strictEqual(k.posts, 2);
    assert.strictEqual(k.postsPerWeek, 7 * 2 / 8);
    assert.strictEqual(k.bestHour, 10);
  }
  assert.strictEqual(c.balance.score, 100);
  assert.strictEqual(c.totals.views, 1200);
});

test('range filter and balance score', () => {
  const st = S.emptyStats();
  const mk = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, date: `2026-02-${String(i + 1).padStart(2, '0')}T12:00`, views: 10 }));
  S.merge(st, 'instagram', { posts: mk(10) });
  S.merge(st, 'youtube', { posts: mk(2) });
  S.merge(st, 'tiktok', { posts: mk(9) });
  const all = S.compare(st);
  assert.ok(all.balance.score < 80);
  assert.deepStrictEqual(all.balance.lagging, ['youtube']);
  const r = S.compare(st, { from: '2026-02-01', to: '2026-02-02' });
  assert.strictEqual(r.per.instagram.posts, 2);
  assert.strictEqual(r.balance.score, 100);
  const one = S.emptyStats();
  S.merge(one, 'tiktok', { posts: mk(6) });
  assert.strictEqual(S.compare(one).balance.score, 0);
});

test('date-only posts report no best hour', () => {
  const st = S.emptyStats();
  S.merge(st, 'youtube', { posts: [{ id: 'x', date: '2026-01-01T00:00', views: 5 }] });
  assert.strictEqual(S.kpis(st.accounts.youtube).bestHour, null);
});

test('insights are Arabic sentences and flag missing platforms', () => {
  const st = S.emptyStats();
  S.merge(st, 'instagram', { posts: [{ id: 'a', date: '2026-01-01T10:00', views: 100, likes: 5 }] });
  const out = S.insights(S.compare(st));
  assert.ok(out[0].includes('يوتيوب') && out[0].includes('تيك توك'));
  assert.deepStrictEqual(S.insights(S.compare(S.emptyStats())).length, 1);
});
