'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');
const P = require('../engine/projects.js');
const SR = require('../engine/series.js');
const A = require('../engine/app-api.js');
const serve = require('../engine/serve.js');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'io-proj-'));
const put = (dir, rel, obj) => { const f = path.join(dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, typeof obj === 'string' || Buffer.isBuffer(obj) ? obj : JSON.stringify(obj)); return f; };
const NOW = new Date('2026-11-09T10:00:00Z');
let FF = true; try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); } catch (e) { FF = false; }

function video(dir, rel, size = '108x192', d = 1) {
  const f = path.join(dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true });
  if (FF) execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `testsrc2=size=${size}:rate=10:duration=${d}`, '-pix_fmt', 'yuv420p', f]);
  else fs.writeFileSync(f, 'not a real video');
  return f;
}

/** A project in every state: idea, recorded, editing, ready, published, a loose take, a loose render, a loose work. */
function fixture() {
  const d = tmp();
  put(d, '.io/project.json', { accountType: 'teacher' });
  SR.create(d, { name: 'درس أسبوعي', id: 'weekly', look: { captionStyle: 'card', format: '16:9' } }, NOW);
  SR.create(d, { name: 'سؤال امتحان', id: 'exam', look: { captionStyle: 'chunk' } }, NOW);
  A.writePlan(d, { ideas: [
    { id: 'i1', title: 'فكرة بس', series: 'weekly', createdAt: '2026-11-01T00:00:00Z' },
    { id: 'i2', title: 'مسجّلة', createdAt: '2026-11-02T00:00:00Z' },
    { id: 'i3', title: 'بالمونتاج', series: 'exam', createdAt: '2026-11-03T00:00:00Z' },
    { id: 'i4', title: 'جاهزة', series: 'weekly', createdAt: '2026-11-04T00:00:00Z' },
    { id: 'i5', title: 'منشورة', status: 'published', createdAt: '2026-11-05T00:00:00Z' },
    { id: 'i6', title: 'بطابور المونتاج', createdAt: '2026-11-06T00:00:00Z' },
  ] });
  video(d, 'work/i2/src.mp4');
  video(d, 'work/i3/src.mp4'); put(d, 'work/i3/caps.json', []);
  put(d, 'work/i4/theme.json', { bg: '#0E1A2B', acc: '#F2B33D', capStyle: 'box' }); video(d, 'work/i4/ad-master.mp4', '192x108');
  video(d, 'output/i5-final.mp4');
  video(d, 'recordings/2026-11-07-intro-lesson.webm');
  video(d, 'recordings/2026-11-08-queued.mp4');
  video(d, 'output/teaser.mp4');
  put(d, 'work/promo/theme.json', { bg: '#000000' }); put(d, 'work/promo/studio.json', {});
  put(d, 'work/not-a-work/readme.txt', 'x');
  put(d, '.io/queue.json', { version: 1, items: [
    { id: 'q1', type: 'montage', ideaId: 'i5', format: 'reel', status: 'done', out: 'output/i5-final.mp4', createdAt: '2026-11-05T00:00:00Z' },
    { id: 'q2', type: 'montage', ideaId: 'i6', format: 'youtube', status: 'working', createdAt: '2026-11-06T00:00:00Z' },
    { id: 'q3', type: 'montage', file: 'recordings/2026-11-08-queued.mp4', title: 'تسجيل بالطابور', format: 'reel', status: 'pending', createdAt: '2026-11-08T00:00:00Z' },
  ] });
  return d;
}

test('scan derives status, merges linked files and reads the series', () => {
  const d = fixture();
  const r = P.scan(d);
  const by = Object.fromEntries(r.projects.map((p) => [p.id, p]));
  assert.strictEqual(by['idea:i1'].status, 'idea');
  assert.strictEqual(by['idea:i1'].seriesName, 'درس أسبوعي');
  assert.strictEqual(by['idea:i1'].thumb, '', 'no media, no thumbnail');
  assert.strictEqual(by['idea:i1'].aspect, '16:9', 'series format when there is no media');
  assert.strictEqual(by['idea:i2'].status, 'recorded');
  assert.strictEqual(by['idea:i2'].source, 'work/i2/src.mp4');
  assert.strictEqual(by['idea:i3'].status, 'editing');
  assert.strictEqual(by['idea:i4'].status, 'ready');
  assert.strictEqual(by['idea:i4'].render, 'work/i4/ad-master.mp4');
  assert.strictEqual(by['idea:i4'].work, 'work/i4');
  assert.strictEqual(by['idea:i5'].status, 'published');
  assert.strictEqual(by['idea:i5'].render, 'output/i5-final.mp4', 'render of a finished request');
  assert.strictEqual(by['idea:i6'].status, 'editing', 'montage request in progress');
  assert.strictEqual(by['idea:i6'].aspect, '16:9', 'youtube request');
  assert.strictEqual(by['rec:recordings/2026-11-07-intro-lesson.webm'].status, 'recorded');
  assert.strictEqual(by['rec:recordings/2026-11-07-intro-lesson.webm'].title, 'intro lesson');
  assert.strictEqual(by['rec:recordings/2026-11-07-intro-lesson.webm'].date, '2026-11-07');
  assert.strictEqual(by['rec:recordings/2026-11-08-queued.mp4'].status, 'editing');
  assert.strictEqual(by['rec:recordings/2026-11-08-queued.mp4'].title, 'تسجيل بالطابور');
  assert.strictEqual(by['out:output/teaser.mp4'].status, 'ready');
  assert.ok(!by['out:output/i5-final.mp4'], 'a render that belongs to an idea is not listed twice');
  assert.strictEqual(by['work:work/promo'].kind, 'work');
  assert.strictEqual(by['work:work/promo'].status, 'editing');
  assert.ok(!by['work:work/not-a-work'] && !by['work:work/i4'], 'folders without editor data, and claimed works, are skipped');
  assert.strictEqual(r.projects.length, 10);
  assert.strictEqual(r.counts.all, 10);
  assert.strictEqual(r.counts.ready, 2);
  assert.deepStrictEqual(r.series.map((s) => [s.id, s.count]), [['weekly', 2], ['exam', 1]]);
  assert.deepStrictEqual(P.scan(tmp()).projects, [], 'empty project');
});

test('move to a series, take out, archive — ideas in plan.json, the rest in library.json', () => {
  const d = fixture();
  const rec = 'rec:recordings/2026-11-07-intro-lesson.webm';
  assert.ok(P.setMeta(d, { id: rec, series: 'weekly' }).ok);
  assert.strictEqual(JSON.parse(fs.readFileSync(path.join(d, '.io/library.json'), 'utf8')).items[rec].series, 'weekly');
  assert.strictEqual(SR.resolve(d, { file: 'recordings/2026-11-07-intro-lesson.webm' }).series.id, 'weekly');
  assert.ok(P.setMeta(d, { id: 'idea:i2', series: 'exam' }).ok);
  assert.strictEqual(A.readPlan(d).ideas.find((i) => i.id === 'i2').series, 'exam');
  assert.ok(P.setMeta(d, { id: 'idea:i2', series: '' }).ok);
  assert.strictEqual(A.readPlan(d).ideas.find((i) => i.id === 'i2').series, undefined);
  assert.strictEqual(P.setMeta(d, { id: 'idea:i2', series: 'ghost' }).ok, false);
  assert.strictEqual(P.setMeta(d, { id: 'idea:nope', archived: true }).ok, false);
  assert.strictEqual(P.setMeta(d, { id: '../../etc', archived: true }).ok, false);
  assert.ok(P.setMeta(d, { id: 'out:output/teaser.mp4', archived: true }).ok);
  assert.ok(!P.scan(d).projects.some((p) => p.id === 'out:output/teaser.mp4'));
  assert.strictEqual(P.scan(d).counts.archived, 1);
  assert.ok(P.scan(d, { all: true }).projects.find((p) => p.id === 'out:output/teaser.mp4').archived);
  assert.ok(P.setMeta(d, { id: 'out:output/teaser.mp4', archived: false }).ok);
  assert.strictEqual(P.scan(d).counts.archived, 0);
});

test('adopt the look of a finished project as a series', () => {
  const d = fixture();
  const r = P.adoptLook(d, { id: 'idea:i4', name: 'شكل الحلقة ٤' });
  assert.ok(r.ok, JSON.stringify(r.errors));
  assert.strictEqual(r.series.look.captionStyle, 'box');
  assert.strictEqual(r.series.look.theme.acc, '#F2B33D');
  assert.deepStrictEqual(r.series.createdFrom, { kind: 'idea', ref: 'i4' });
  assert.strictEqual(A.readPlan(d).ideas.find((i) => i.id === 'i4').series, r.series.id, 'the project joins the new series');
  assert.strictEqual(P.adoptLook(d, { id: 'idea:i1' }).ok, false, 'nothing edited yet');
  const into = P.adoptLook(d, { id: 'work:work/promo', series: 'exam' });
  assert.ok(into.ok);
  assert.strictEqual(into.series.id, 'exam');
  assert.strictEqual(into.series.look.theme.bg, '#000000');
});

test('durations, aspect and thumbnails through ffmpeg (cached)', { skip: !FF && 'ffmpeg not installed' }, async () => {
  const d = fixture();
  const r = await P.list(d);
  const i4 = r.projects.find((p) => p.id === 'idea:i4');
  assert.strictEqual(i4.duration, 1);
  assert.strictEqual(i4.aspect, '16:9', 'from the render size');
  assert.strictEqual(r.projects.find((p) => p.id === 'idea:i2').aspect, '9:16');
  assert.ok(fs.existsSync(path.join(d, '.io/thumbs/index.json')));
  const t = await P.thumb(d, 'idea:i4');
  assert.ok(t && t.endsWith('.jpg') && fs.statSync(t).size > 100);
  assert.strictEqual(await P.thumb(d, 'idea:i4'), t, 'cached');
  assert.strictEqual(await P.thumb(d, 'idea:i1'), null);
  put(d, 'work/i3/cover.jpg', Buffer.from([0xff, 0xd8, 0xff]));
  assert.strictEqual(await P.thumb(d, 'idea:i3'), path.join(d, 'work/i3/cover.jpg'), 'the work\'s cover wins');
});

function startServer(dir) { return new Promise((resolve) => serve.start(0, { dir, quiet: true, onListen: (server, port) => resolve({ server, port }) })); }
function request(port, method, p, { body, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: p, method, headers }, (res) => {
      const chunks = []; res.on('data', (c) => chunks.push(c));
      res.on('end', () => { const b = Buffer.concat(chunks); let json = null; try { json = JSON.parse(b.toString('utf8')); } catch (e) { /* binary */ } resolve({ status: res.statusCode, headers: res.headers, json, body: b }); });
    });
    req.on('error', reject);
    if (body !== undefined) req.write(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
    req.end();
  });
}

test('the server: projects + series API, origin check, recording upload into a series', async () => {
  const d = fixture();
  const { server, port } = await startServer(d);
  const local = { origin: 'http://localhost:' + port, 'content-type': 'application/json' };
  try {
    const list = await request(port, 'GET', '/api/projects');
    assert.strictEqual(list.status, 200);
    assert.strictEqual(list.json.projects.length, 10);
    assert.strictEqual(list.json.series.length, 2);
    if (FF) {
      const th = await request(port, 'GET', '/api/projects/thumb?id=' + encodeURIComponent('idea:i4'));
      assert.strictEqual(th.status, 200);
      assert.strictEqual(th.headers['content-type'], 'image/jpeg');
      assert.strictEqual(th.body[0], 0xff);
    }
    assert.strictEqual((await request(port, 'GET', '/api/projects/thumb?id=idea:i1')).status, 404);

    const ser = await request(port, 'GET', '/api/series');
    assert.ok(ser.json.options.capStyles.includes('karaoke'));
    assert.ok(ser.json.options.motionStyles.length > 5 && ser.json.options.luts.length > 5);
    assert.ok(ser.json.suggestions.some((s) => s.name === 'سؤال امتحان') === false, 'already made');

    const mk = await request(port, 'POST', '/api/series', { headers: local, body: { action: 'create', name: 'جديدة', look: { format: '9:16', cta: 'تابع' } } });
    assert.strictEqual(mk.status, 200);
    const id = mk.json.series.id;
    const up = await request(port, 'POST', '/api/series', { headers: local, body: { action: 'update', id, look: { captionStyle: 'paper' } } });
    assert.deepStrictEqual(up.json.series.look, { format: '9:16', cta: 'تابع', captionStyle: 'paper' });
    assert.strictEqual((await request(port, 'POST', '/api/series', { headers: local, body: { action: 'nope' } })).status, 400);
    assert.strictEqual((await request(port, 'POST', '/api/series', { headers: local, body: '{bad' })).status, 400);

    const mv = await request(port, 'POST', '/api/projects/meta', { headers: local, body: { id: 'out:output/teaser.mp4', series: id } });
    assert.strictEqual(mv.json.project.seriesName, 'جديدة');
    const ad = await request(port, 'POST', '/api/projects/adopt', { headers: local, body: { id: 'idea:i4', name: 'من الحلقة' } });
    assert.ok(ad.json.ok);

    // same-origin rules: a foreign page cannot write
    for (const [p, body] of [['/api/series', { action: 'create', name: 'x' }], ['/api/projects/meta', { id: 'idea:i1', archived: true }], ['/api/projects/adopt', { id: 'idea:i4' }]]) {
      const f = await request(port, 'POST', p, { headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, body });
      assert.strictEqual(f.status, 403, p);
    }
    assert.ok(!SR.list(d).some((s) => s.name === 'x'));
    assert.ok(!P.readMeta(d)['idea:i1']);

    const rec = await request(port, 'POST', '/api/recordings?name=take&ext=.webm&series=weekly', { headers: { origin: 'http://localhost:' + port, 'content-type': 'video/webm' }, body: Buffer.from('webm-bytes') });
    assert.strictEqual(rec.status, 200);
    assert.strictEqual(rec.json.series, 'weekly');
    assert.strictEqual(P.readMeta(d)['rec:' + rec.json.file].series, 'weekly');
    assert.strictEqual(SR.resolve(d, { file: rec.json.file }).series.id, 'weekly');
  } finally { server.close(); }
});

test('app.html has the projects tab and the series form', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'app.html'), 'utf8');
  assert.match(html, /data-tab="projects"/);
  assert.match(html, /id="tab-projects"/);
  assert.match(html, /\/api\/projects/);
  assert.match(html, /\/api\/series/);
  assert.match(html, /اعتمد شكله للسلسلة/);
  assert.match(html, /id="tab-library"/, 'the asset library stays');
  const cs = fs.readFileSync(path.join(__dirname, '..', 'web', 'course-studio', 'studio.html'), 'utf8');
  assert.match(cs, /id="mtSeries"/);
});
