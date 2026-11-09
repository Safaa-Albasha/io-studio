'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const T = require('../engine/trends.js');
const api = require('../engine/app-api.js');
const Q = require('../engine/queue.js');

const ROOT = path.join(__dirname, '..');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'io-trends-'));
const PY = ['python3', 'python'].find((p) => spawnSync(p, ['--version']).status === 0);
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

// ScrapeCreators SCRAPECREATORS_LIST_INSTAGRAM_USER_POSTS shapes (trimmed)
const post = (user, code, taken, views, text, extra = {}) => Object.assign({ user: { username: user }, code, taken_at: taken, like_count: Math.round(views / 20), comment_count: 3, ig_play_count: views, caption: { text } }, extra);
const FIX = {
  example_ar_account: { data: { items: [
    post('example_ar_account', 'AR3', 300, 1000, 'نصائح للذكاء الاصطناعي'),
    post('example_ar_account', 'AR1', 500, 10000, 'كيف تستخدم الذكاء الإصطناعي بشغلك\nالتفاصيل بالكابشن', {
      is_paid_partnership: true,
      image_versions2: { candidates: [{ url: 'https://cdn.example/ar1.jpg' }] },
      video_versions: [{ url: 'https://cdn.example/ar1.mp4' }],
    }),
    post('example_ar_account', 'AR2', 400, 2000, 'يوميات بالمكتب'),
    post('example_ar_account', 'AR4', 200, 3000, 'الذكاء الاصطناعي بالسفر'), // older than LAST_N → not a candidate
    post('someone_else', 'RP1', 600, 99999, 'الذكاء الاصطناعي'),           // repost/collab → dropped
  ] } },
  example_en_account: { items: [ // no "data" wrapper, owner instead of user, play_count instead of ig_play_count
    { owner: { username: 'example_en_account' }, code: 'EN1', taken_at: 900, play_count: 5000, like_count: 400, comment_count: 20, caption: { text: 'Claude Code agents in 60 seconds' } },
    { owner: { username: 'example_en_account' }, code: 'EN2', taken_at: 800, play_count: 1000, like_count: 10, comment_count: 1, caption: { text: 'My aim this year' } },
    { owner: { username: 'example_en_account' }, code: 'EN3', taken_at: 700, play_count: 1000, like_count: 10, comment_count: 1, caption: 'new tool #ai' },
  ] },
  example_bad_account: { data: { error: 'private' } },
};

const RUNNER = `
import json, sys
src = open(sys.argv[1], encoding='utf-8').read()
fx = json.load(open(sys.argv[2], encoding='utf-8'))
calls = []
def run_composio_tool(slug, args):
    assert slug == 'SCRAPECREATORS_LIST_INSTAGRAM_USER_POSTS', slug
    assert args.get('trim') is True
    calls.append(args['handle'])
    if args['handle'] not in fx: return None, 'handle not found'
    return fx[args['handle']], None
def upload_local_file(p): return {'s3_url': 'https://s3.example/' + p.split('/')[-1]}, None
exec(compile(src, 'pull.py', 'exec'), {'__name__': '__main__', 'run_composio_tool': run_composio_tool, 'upload_local_file': upload_local_file})
`;

function runPull(inp) {
  const d = tmp();
  const script = path.join(d, 'pull.py');
  fs.writeFileSync(script, T.fill(inp));
  fs.writeFileSync(path.join(d, 'fx.json'), JSON.stringify(FIX));
  fs.writeFileSync(path.join(d, 'runner.py'), RUNNER);
  const out = path.join(d, 'out', 'ig.json');
  const stdout = execFileSync(PY, ['-I', path.join(d, 'runner.py'), script, path.join(d, 'fx.json')], { env: Object.assign({}, process.env, { IO_TRENDS_OUT: out }), encoding: 'utf8' });
  return { rows: read(out), stdout, file: out };
}

const INPUTS = { handles: ['example_ar_account', 'example_en_account', 'example_bad_account', 'example_missing'], arabic: [], keywords: ['الذكاء الاصطناعي', 'claude code', 'ai'], lastN: 3 };

test('template: valid Python, placeholders only, the AI list is an example comment', { skip: !PY && 'no python' }, () => {
  const src = fs.readFileSync(T.TEMPLATE, 'utf8');
  execFileSync(PY, ['-I', '-c', 'import ast,sys; ast.parse(open(sys.argv[1], encoding="utf-8").read())', T.TEMPLATE]);
  const block = /# >>> IO:INPUTS[\s\S]*?# <<< IO:INPUTS/.exec(src)[0];
  const handles = JSON.parse(/HANDLES = (\[.*?\])/.exec(block)[1].replace(/'/g, '"'));
  assert.ok(handles.length && handles.every((h) => /^example_/.test(h)), 'placeholder handles only');
  assert.match(block, /KEYWORDS = \[\]/, 'no niche-specific keywords by default');
  assert.doesNotMatch(src, /claudeai|safaa/i, 'nothing from the owner');
  assert.match(src, /SCRAPECREATORS_LIST_INSTAGRAM_USER_POSTS/);
  assert.match(src, /print\('RESULT', len\(rows\), errs\[:5\], \(u or \{\}\)\.get\('s3_url'\)\)/);
  // the filled copy stays valid Python, also with quotes and Arabic in the inputs
  const filled = T.fill({ handles: ['example_a'], arabic: ['example_a'], keywords: ["it's", 'صحة "x"'], lastN: 4 });
  const d = tmp(); fs.writeFileSync(path.join(d, 'f.py'), filled);
  execFileSync(PY, ['-I', '-m', 'py_compile', path.join(d, 'f.py')]);
  assert.match(filled, /HANDLES = \["example_a"\]/);
  assert.match(filled, /LAST_N = 4/);
});

test('pull: own posts, newest first, Arabic-aware keywords, outlier vs account median, media, tags', { skip: !PY && 'no python' }, () => {
  const { rows, stdout } = runPull(INPUTS);
  const codes = rows.map((r) => /\/p\/([^/]+)\//.exec(r.url)[1]);
  assert.deepStrictEqual(codes, ['EN1', 'AR1', 'EN3', 'AR3'], 'sorted by outlier; repost, non-matching and older posts left out');
  const by = Object.fromEntries(rows.map((r) => [/\/p\/([^/]+)\//.exec(r.url)[1], r]));
  // median of the Arabic account's own posts = (2000+3000)/2 = 2500 (the repost is not counted)
  assert.strictEqual(by.AR1.medianViews, 2500);
  assert.strictEqual(by.AR1.outlier, 4);
  assert.strictEqual(by.AR3.outlier, 0.4, '«للذكاء» matches «الذكاء الاصطناعي»');
  assert.strictEqual(by.EN1.outlier, 5);
  assert.strictEqual(by.EN3.medianViews, 1000);
  assert.ok(!by.EN2, '«ai» does not match inside «aim»');
  assert.deepStrictEqual(by.AR1.metrics, { likes: 500, comments: 3, views: 10000 });
  assert.strictEqual(by.AR1.title, 'كيف تستخدم الذكاء الإصطناعي بشغلك');
  assert.strictEqual(by.AR1.url, 'https://www.instagram.com/p/AR1/');
  assert.strictEqual(by.AR1.platform, 'instagram');
  assert.strictEqual(by.AR1.author, 'example_ar_account');
  assert.strictEqual(by.AR1.published, 500);
  assert.deepStrictEqual(by.AR1.tags, ['person', 'composio', 'arabic', 'paid'], 'Arabic detected from captions');
  assert.deepStrictEqual(by.EN1.tags, ['person', 'composio', 'english']);
  assert.strictEqual(by.AR1.thumbnail, 'https://cdn.example/ar1.jpg');
  assert.strictEqual(by.AR1.videoUrl, 'https://cdn.example/ar1.mp4');
  assert.ok(!('thumbnail' in by.EN1));
  const line = stdout.trim().split('\n').pop();
  assert.match(line, /^RESULT 4 \[/);
  assert.match(line, /example_bad_account', 'shape'/);
  assert.match(line, /example_missing', 'handle not found'/);
  assert.match(line, /https:\/\/s3\.example\/ig\.json$/);
});

test('pull: marked Arabic accounts and an empty keyword list (keep everything)', { skip: !PY && 'no python' }, () => {
  const { rows } = runPull({ handles: ['example_en_account'], arabic: ['example_en_account'], keywords: [], lastN: 10 });
  assert.strictEqual(rows.length, 3);
  assert.ok(rows.every((r) => r.tags.includes('arabic')));
});

function project() {
  const d = tmp();
  fs.mkdirSync(path.join(d, '.io'));
  fs.writeFileSync(path.join(d, '.io', 'project.json'), JSON.stringify({ accountType: 'doctor' }));
  fs.writeFileSync(path.join(d, '.io', 'creator-profile.md'), '# ملف\n- المجال (النيش): صحة، تغذية\n');
  fs.writeFileSync(path.join(d, '.io', 'sources.json'), JSON.stringify({
    accounts: ['instagram:example_one', { platform: 'instagram', handle: '@example_two', arabic: true }, { platform: 'youtube', handle: 'example_yt' }, { url: 'https://www.instagram.com/example_three/' }, 'bad handle!'],
    keywords: ['تمارين'],
  }));
  return d;
}

test('inputs come from the project: instagram accounts, arabic flags, keywords + niche + type pack', () => {
  const d = project();
  const inp = T.inputs(d);
  assert.deepStrictEqual(inp.handles, ['example_one', 'example_two', 'example_three']);
  assert.deepStrictEqual(inp.arabic, ['example_two']);
  for (const k of ['تمارين', 'صحة، تغذية', 'تغذية', 'health']) assert.ok(inp.keywords.includes(k), k);
  const filled = T.fill(inp);
  assert.match(filled, /HANDLES = \["example_one","example_two","example_three"\]/);
  assert.match(filled, /ARABIC = set\(\["example_two"\]\)/);
});

test('every account type has generic Arabic + English trend keywords', () => {
  const types = read(path.join(ROOT, 'library', 'account-types', 'types.json')).types;
  for (const t of types) {
    assert.ok(Array.isArray(t.keywords) && t.keywords.length >= 8, t.id);
    assert.ok(t.keywords.some((k) => /[؀-ۿ]/.test(k)) && t.keywords.some((k) => /^[a-z ]+$/i.test(k)), t.id);
  }
  assert.ok(require('../engine/account-type.js').merge(types[0], null).keywords.length);
});

const ROWS = [
  { title: 'كيف تستخدم الذكاء الاصطناعي', url: 'https://www.instagram.com/p/AR1/', platform: 'instagram', author: 'example_ar_account', note: 'كيف تستخدم الذكاء الاصطناعي\nتفاصيل', published: 1762600000, metrics: { likes: 500, comments: 3, views: 10500 }, tags: ['person', 'composio', 'arabic'], outlier: 4.2, medianViews: 2500, thumbnail: 'https://cdn.example/a.jpg' },
  { title: 'Claude Code agents', url: 'https://www.instagram.com/p/EN1/', platform: 'instagram', author: 'example_en_account', note: 'Claude Code agents', published: 1762500000, metrics: { views: 5000 }, tags: ['person', 'composio', 'english'], outlier: 5, medianViews: 1000 },
  { title: 'عادي', url: 'https://www.instagram.com/p/AR3/', platform: 'instagram', author: 'example_ar_account', note: 'عادي', published: 1762400000, metrics: { views: 1000 }, tags: ['arabic'], outlier: 0.4, medianViews: 2500 },
];

test('outlier is filled from the account median when a row lacks it', () => {
  const rows = T.normalizeRows([
    { url: 'https://x.example/1', author: 'example_a', metrics: { views: 100 } },
    { url: 'https://x.example/2', author: 'example_a', metrics: { views: 300 } },
    { url: 'https://x.example/3', author: 'example_a', metrics: { views: 900 } },
    { url: 'not a url', author: 'example_a' },
  ]);
  assert.strictEqual(rows.length, 3);
  assert.deepStrictEqual(rows.map((r) => r.outlier), [0.33, 1, 3]);
  assert.strictEqual(rows[0].medianViews, 300);
  assert.strictEqual(T.median([4, 1, 3, 2]), 2.5);
  assert.strictEqual(T.arNum(4.2), '٤.٢');
});

test('import → trends/<date>.json, trends-last.json, benchmark.json and trend ideas in plan.json', () => {
  const d = project();
  const now = new Date(2026, 10, 9, 10, 0, 0);
  const r = T.importTrends(d, ROWS, { top: 5, min: 1.5, now });
  assert.ok(r.ok, r.errors.join());
  assert.strictEqual(r.rows, 3);
  const day = read(path.join(d, '.io', 'trends', '2026-11-09.json'));
  assert.deepStrictEqual(day.rows.map((x) => x.url.slice(-4)), ['EN1/', 'AR1/', 'AR3/']);
  assert.strictEqual(day.rows[1].thumbnail, 'https://cdn.example/a.jpg');
  assert.strictEqual(day.rows[1].published, new Date(1762600000 * 1000).toISOString());
  assert.deepStrictEqual(read(path.join(d, '.io', 'trends-last.json')).date, '2026-11-09');
  assert.strictEqual(read(path.join(d, '.io', 'trends-last.json')).added, 2);

  const b = read(path.join(d, '.io', 'benchmark.json'));
  assert.strictEqual(b.accounts['instagram:example_ar_account'].medianViews, 2500);
  assert.strictEqual(b.accounts['instagram:example_ar_account'].topOutlier, 4.2);
  assert.strictEqual(b.accounts['instagram:example_en_account'].medianViews, 1000);
  assert.deepStrictEqual(T.readBenchmark(d).accounts, b.accounts);

  const ideas = api.readPlan(d).ideas;
  assert.strictEqual(ideas.length, 2, 'only rows above --min become ideas');
  const ar = ideas.find((i) => i.trendRef.url.endsWith('/AR1/'));
  assert.strictEqual(ar.source, 'trend');
  assert.strictEqual(ar.status, 'idea');
  assert.strictEqual(ar.why, 'هالريل جاب ٤.٢× مشاهدات الحساب المعتادة');
  assert.deepStrictEqual(ar.trendRef, { title: 'كيف تستخدم الذكاء الاصطناعي', url: 'https://www.instagram.com/p/AR1/', account: '@example_ar_account' });
  assert.strictEqual(ar.format, 'reel');
  assert.match(ar.title, /^على خطى @example_ar_account: /);

  // same pull again: nothing duplicated, day file merged by url
  const again = T.importTrends(d, ROWS, { now });
  assert.strictEqual(again.ideas.added.length, 0);
  assert.strictEqual(api.readPlan(d).ideas.length, 2);
  assert.strictEqual(read(path.join(d, '.io', 'trends', '2026-11-09.json')).rows.length, 3);
});

test('CLI: app-api.js import-trends <file> --dir --top', () => {
  const d = project();
  const f = path.join(d, 'ig.json');
  fs.writeFileSync(f, JSON.stringify(ROWS));
  const out = execFileSync(process.execPath, [path.join(ROOT, 'engine', 'app-api.js'), 'import-trends', f, '--dir', d, '--top', '1'], { encoding: 'utf8' });
  assert.match(out, /3 منشور/);
  const ideas = api.readPlan(d).ideas;
  assert.strictEqual(ideas.length, 1);
  assert.ok(ideas[0].trendRef.url.endsWith('/EN1/'), 'the strongest outlier first');
  assert.ok(fs.existsSync(path.join(d, '.io', 'benchmark.json')));
  const filled = execFileSync(process.execPath, [path.join(ROOT, 'engine', 'trends.js'), 'fill', '--dir', d], { encoding: 'utf8' });
  assert.match(filled, /HANDLES = \["example_one"/);
});

test('stats API serves benchmark.json', async () => {
  const d = project();
  T.importTrends(d, ROWS, { now: new Date(2026, 10, 9) });
  const sapi = require('../engine/stats-api.js');
  const res = await new Promise((resolve) => {
    sapi.route({ method: 'GET' }, {}, new URL('http://x/api/stats'), d, { sendJson: (_r, code, obj) => resolve({ code, obj }) });
  });
  assert.strictEqual(res.code, 200);
  assert.strictEqual(res.obj.benchmark.accounts['instagram:example_en_account'].medianViews, 1000);
  const html = fs.readFileSync(path.join(ROOT, 'web', 'dashboard.html'), 'utf8');
  assert.match(html, /id="benchCard"/);
  assert.match(html, /ST\.bench = j\.benchmark/);
});

test('queue: sync-trends request', () => {
  const d = tmp();
  const r = Q.enqueue(d, { type: 'sync-trends', top: 50 });
  assert.ok(r.ok);
  assert.strictEqual(r.item.platform, 'instagram');
  assert.strictEqual(r.item.top, 10);
  assert.strictEqual(Q.normalize({ type: 'sync-trends', platform: 'tiktok' }).req, null);
  assert.match(Q.describe(r.item), /سحب الترند/);
  const skill = fs.readFileSync(path.join(ROOT, 'skills', 'io-autopilot', 'SKILL.md'), 'utf8');
  assert.match(skill, /`sync-trends`/);
});
