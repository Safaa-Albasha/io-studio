'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const SR = require('../engine/series.js');
const A = require('../engine/app-api.js');
const Q = require('../engine/queue.js');

const ROOT = path.join(__dirname, '..');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'io-series-'));
const put = (dir, rel, obj) => { const f = path.join(dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, typeof obj === 'string' || Buffer.isBuffer(obj) ? obj : JSON.stringify(obj)); return f; };
const rd = (dir, rel) => JSON.parse(fs.readFileSync(path.join(dir, rel), 'utf8'));
const NOW = new Date('2026-11-09T10:00:00Z');

test('sanitizeLook keeps known, valid fields only', () => {
  const l = SR.sanitizeLook({
    theme: { bg: '#101828', ink: 'white', accent: '#f2b33d', font: 'Tajawal<script>', capStill: true, pace: 'fast', colors: { soft: '#98a2b3' } },
    captionStyle: 'karaoke', motionStyle: 'paperCut+keynote', intro: { move: 'hook banner!', text: 'هلا' }, outro: { text: 'نشوفكم' },
    lowerThird: {}, music: { file: '../secret.mp3' }, sfx: ['whoosh', 'whoosh', 'pop soft'], lut: 'teal_orange', lutStrength: 4,
    format: '4:3', imageCount: 99, brollDensity: 'high', cadence: { every: 'weekly', day: 4, time: '19:00' }, cta: 'تابع', evil: 1,
  });
  assert.deepStrictEqual(l.theme, { bg: '#101828', acc: '#F2B33D', mut: '#98A2B3', font: 'Tajawalscript', capStill: true });
  assert.strictEqual(l.captionStyle, 'karaoke');
  assert.strictEqual(l.motionStyle, 'paperCut+keynote');
  assert.deepStrictEqual(l.intro, { move: 'hookbanner', text: 'هلا' });
  assert.strictEqual(l.lowerThird, undefined);
  assert.strictEqual(l.music, undefined, 'no paths outside the project');
  assert.deepStrictEqual(l.sfx, ['whoosh', 'popsoft']);
  assert.strictEqual(l.lutStrength, 1);
  assert.strictEqual(l.format, undefined);
  assert.strictEqual(l.imageCount, 30);
  assert.deepStrictEqual(l.cadence, { every: 'weekly', day: 4, time: '19:00' });
  assert.strictEqual(l.evil, undefined);
  assert.strictEqual(SR.sanitizeLook({ motionStyle: 'a b; rm' }).motionStyle, undefined);
});

test('create / list / update / delete, and deleting clears membership', () => {
  const d = tmp();
  assert.deepStrictEqual(SR.list(d), []);
  assert.strictEqual(SR.create(d, { name: '' }).ok, false);
  const a = SR.create(d, { name: 'Weekly Lesson', look: { captionStyle: 'card', theme: { bg: '#000000' } } }, NOW);
  assert.ok(a.ok);
  assert.strictEqual(a.series.id, 'weekly-lesson');
  assert.ok(fs.existsSync(path.join(d, '.io', 'series', 'weekly-lesson.json')));
  const b = SR.create(d, { name: 'درس أسبوعي' }, new Date(NOW.getTime() + 1000));
  assert.ok(b.ok && /^s-/.test(b.series.id), 'arabic names get a safe id');
  assert.strictEqual(SR.create(d, { name: 'درس أسبوعي' }).ok, false, 'no duplicate names');
  assert.deepStrictEqual(SR.list(d).map((s) => s.name), ['Weekly Lesson', 'درس أسبوعي']);

  const u = SR.update(d, 'weekly-lesson', { look: { theme: { ink: '#ffffff' }, cta: 'تابع', captionStyle: null } }, NOW);
  assert.ok(u.ok);
  assert.deepStrictEqual(u.series.look, { theme: { bg: '#000000', ink: '#FFFFFF' }, cta: 'تابع' }, 'merged; null removes');
  assert.strictEqual(SR.update(d, 'nope', {}).ok, false);
  assert.strictEqual(SR.update(d, 'weekly-lesson', { name: 'درس أسبوعي' }).ok, false);

  A.writePlan(d, { ideas: [{ id: 'i1', title: 'فكرة', series: 'weekly-lesson' }, { id: 'i2', title: 'ثانية' }] });
  assert.strictEqual(A.readPlan(d).ideas[0].series, 'weekly-lesson', 'plan keeps idea.series');
  put(d, '.io/library.json', { version: 1, items: { 'rec:recordings/a.webm': { series: 'weekly-lesson', archived: true } } });
  assert.ok(SR.remove(d, 'weekly-lesson').ok);
  assert.strictEqual(A.readPlan(d).ideas[0].series, undefined);
  assert.deepStrictEqual(rd(d, '.io/library.json').items['rec:recordings/a.webm'], { archived: true });
  assert.strictEqual(SR.remove(d, 'weekly-lesson').ok, false);
});

function finishedWork(d) {
  put(d, 'work/ep1/theme.json', { bg: '#0E1A2B', ink: '#F5F7FA', acc: '#F2B33D', clay: '#C98B18', mut: '#98A2B3', font: 'Tajawal', handle: '@me', capStyle: 'box', capStill: true, grade: false, motionStyle: 'explainer', lut: 'teal_orange_soft' });
  put(d, 'work/ep1/studio.json', { outro: { l1: 'نشوفكم الأسبوع الجاي', l2: 'الحلقة ٢', cta: 'تابعني' }, brollClips: [{}, {}, {}] });
  put(d, 'work/ep1/sfx.json', { outro: 3.5, pop: [1, 2, 3], whoosh_up: [4], click: [] });
  put(d, 'work/ep1/bg-audio.mp3', Buffer.from('ID3'));
}

test('from-work: «اعتمد شكله للسلسلة» extracts the look of a finished work', () => {
  const d = tmp();
  finishedWork(d);
  const look = SR.lookFromWork(path.join(d, 'work/ep1'), d);
  assert.deepStrictEqual(look.theme, { bg: '#0E1A2B', ink: '#F5F7FA', acc: '#F2B33D', clay: '#C98B18', mut: '#98A2B3', font: 'Tajawal', capStill: true });
  assert.strictEqual(look.captionStyle, 'box');
  assert.strictEqual(look.motionStyle, 'explainer');
  assert.strictEqual(look.lut, 'teal_orange_soft');
  assert.deepStrictEqual(look.outro, { text: 'نشوفكم الأسبوع الجاي', sub: 'الحلقة ٢' });
  assert.strictEqual(look.cta, 'تابعني');
  assert.deepStrictEqual(look.music, { file: 'work/ep1/bg-audio.mp3' });
  assert.deepStrictEqual(look.sfx, ['pop', 'whoosh_up']);
  assert.strictEqual(look.imageCount, 3);
  const r = SR.fromWork(d, 'work/ep1', { name: 'حلقات' }, NOW);
  assert.ok(r.ok, JSON.stringify(r.errors));
  assert.deepStrictEqual(r.series.createdFrom, { kind: 'work', ref: 'work/ep1' });
  assert.strictEqual(SR.fromWork(d, 'work/empty', { name: 'x' }).ok, false);
});

test('resolve by idea, work, recording and series id', () => {
  const d = tmp();
  const s = SR.create(d, { name: 'show', look: { captionStyle: 'paper', motionStyle: 'paperCut', lut: 'warm_film', theme: { acc: '#ff0000' } } }, NOW).series;
  A.writePlan(d, { ideas: [{ id: 'i1', title: 'أ', series: s.id }, { id: 'i2', title: 'ب', work: 'work/custom' }] });
  const r = SR.resolve(d, { idea: 'i1' });
  assert.deepStrictEqual(r.series, { id: 'show', name: 'show' });
  assert.strictEqual(r.via, 'idea');
  assert.deepStrictEqual(r.theme, { acc: '#FF0000', capStyle: 'paper', motionStyle: 'paperCut', lut: 'warm_film' }, 'theme.json keys ready to apply');
  assert.strictEqual(SR.resolve(d, { work: 'work/i1' }).series.id, 'show', 'the idea\'s default work folder');
  assert.strictEqual(SR.resolve(d, { work: path.join(d, 'work/i1') }).series.id, 'show', 'absolute path too');
  assert.strictEqual(SR.resolve(d, { idea: 'i2' }).series, null);
  put(d, '.io/library.json', { items: { 'rec:recordings/t.webm': { series: 'show' }, 'work:work/loose': { series: 'show' } } });
  assert.strictEqual(SR.resolve(d, { file: 'recordings/t.webm' }).via, 'library');
  assert.strictEqual(SR.resolve(d, { work: 'work/loose' }).series.id, 'show');
  assert.strictEqual(SR.resolve(d, { series: 'show' }).via, 'series');
  assert.strictEqual(SR.resolve(d, { series: 'gone' }).series, null);
});

test('apply-to-work writes the look and keeps the creator\'s edits', () => {
  const d = tmp();
  SR.create(d, { name: 'show', look: { theme: { bg: '#111111', acc: '#FF0000', font: 'Cairo' }, captionStyle: 'card', outro: { text: 'باي' }, cta: 'تابع', music: { file: 'assets/bed.mp3' }, intro: { move: 'hookBanner', text: 'الحلقة' }, format: '16:9' } }, NOW);
  put(d, 'assets/bed.mp3', Buffer.from('ID3'));
  put(d, 'work/ep2/theme.json', { bg: '#222222', handle: '@me' }); // the creator already chose a background
  const r = SR.applyToWork(d, 'work/ep2', { series: 'show' }, NOW);
  assert.ok(r.ok);
  assert.deepStrictEqual(r.kept, ['bg']);
  const th = rd(d, 'work/ep2/theme.json');
  assert.strictEqual(th.bg, '#222222', 'user edit kept');
  assert.strictEqual(th.acc, '#FF0000');
  assert.strictEqual(th.capStyle, 'card');
  assert.strictEqual(th.handle, '@me');
  assert.deepStrictEqual(rd(d, 'work/ep2/studio.json').outro, { l1: 'باي', cta: 'تابع' });
  assert.ok(fs.existsSync(path.join(d, 'work/ep2/bg-audio.mp3')));
  assert.strictEqual(rd(d, 'work/ep2/series-look.json').look.intro.move, 'hookBanner');
  assert.strictEqual(rd(d, 'work/ep2/series.json').series, 'show');

  // the creator edits acc; the series changes acc and font → acc stays theirs, font follows the series
  th.acc = '#00FF00'; fs.writeFileSync(path.join(d, 'work/ep2/theme.json'), JSON.stringify(th));
  SR.update(d, 'show', { look: { theme: { acc: '#0000FF', font: 'Tajawal' } } }, NOW);
  const r2 = SR.applyToWork(d, 'work/ep2', {}, NOW); // series found through work/ep2/series.json
  assert.ok(r2.ok);
  assert.deepStrictEqual(r2.applied, ['font']);
  assert.ok(r2.kept.includes('acc') && r2.kept.includes('bg'));
  const th2 = rd(d, 'work/ep2/theme.json');
  assert.strictEqual(th2.acc, '#00FF00');
  assert.strictEqual(th2.font, 'Tajawal');
  // studio outro the creator wrote stays
  const st = rd(d, 'work/ep2/studio.json'); st.outro = { l1: 'خاص' }; fs.writeFileSync(path.join(d, 'work/ep2/studio.json'), JSON.stringify(st));
  SR.applyToWork(d, 'work/ep2', { series: 'show' }, NOW);
  assert.deepStrictEqual(rd(d, 'work/ep2/studio.json').outro, { l1: 'خاص' });
  // dry run writes nothing
  const before = fs.readFileSync(path.join(d, 'work/ep2/theme.json'), 'utf8');
  assert.ok(SR.applyToWork(d, 'work/ep2', { series: 'show', dry: true, force: true }).ok);
  assert.strictEqual(fs.readFileSync(path.join(d, 'work/ep2/theme.json'), 'utf8'), before);
  assert.strictEqual(SR.applyToWork(d, 'work/x', { series: 'nope' }).ok, false);
});

test('account-type packs suggest series with valid styles, looks and moves', () => {
  const types = JSON.parse(fs.readFileSync(path.join(ROOT, 'library/account-types/types.json'), 'utf8')).types;
  const c = A.catalogs();
  const styles = new Set(c.styles.map((s) => s.id)), looks = new Set(c.looks.looks.map((l) => l.id)), moves = new Set(c.moves.map((m) => m.id));
  for (const t of types) {
    assert.ok(Array.isArray(t.series) && t.series.length, `${t.id}: has series`);
    for (const s of t.series) {
      assert.ok(s.name, `${t.id}: name`);
      assert.deepStrictEqual(SR.sanitizeLook(s.look), s.look, `${t.id}/${s.name}: look is clean`);
      if (s.look.motionStyle) assert.ok(styles.has(s.look.motionStyle), `${s.look.motionStyle} style exists`);
      if (s.look.lut) assert.ok(looks.has(s.look.lut), `${s.look.lut} look exists`);
      for (const k of ['intro', 'outro', 'lowerThird']) if (s.look[k] && s.look[k].move && moves.size) assert.ok(moves.has(s.look[k].move), `${s.look[k].move} move exists`);
    }
  }
  assert.ok(types.find((t) => t.id === 'teacher').series.some((s) => s.name === 'درس أسبوعي'));
  const d = tmp();
  put(d, '.io/project.json', { accountType: 'teacher' });
  assert.ok(SR.suggestions(d).some((s) => s.name === 'درس أسبوعي'));
  SR.create(d, { name: 'درس أسبوعي' });
  assert.ok(!SR.suggestions(d).some((s) => s.name === 'درس أسبوعي'), 'made ones drop out');
  assert.deepStrictEqual(SR.suggestions(tmp()), []);
});

test('montage requests carry the series', () => {
  assert.strictEqual(Q.normalize({ type: 'montage', format: 'reel', ideaId: 'i1', series: 'Weekly Lesson!' }).req.series, 'weeklylesson');
  assert.match(Q.describe({ type: 'montage', format: 'reel', series: 'show' }), /السلسلة: show/);
});

test('CLI: create, resolve, apply-to-work', () => {
  const d = tmp();
  const cli = (...a) => execFileSync(process.execPath, [path.join(ROOT, 'engine/series.js'), ...a, '--dir', d], { encoding: 'utf8' });
  JSON.parse(cli('create', '--name', 'show', '--look', JSON.stringify({ captionStyle: 'card' })));
  A.writePlan(d, { ideas: [{ id: 'i1', title: 'أ', series: 'show' }] });
  const r = JSON.parse(cli('resolve', '--idea', 'i1'));
  assert.strictEqual(r.series.id, 'show');
  assert.strictEqual(r.look.captionStyle, 'card');
  assert.strictEqual(JSON.parse(cli('resolve', '--idea', 'nope')).series, null);
  const ap = JSON.parse(cli('apply-to-work', 'work/i1', '--idea', 'i1'));
  assert.ok(ap.ok);
  assert.strictEqual(rd(d, 'work/i1/theme.json').capStyle, 'card');
  assert.match(cli('list'), /show/);
});
