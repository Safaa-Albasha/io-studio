'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const O = require('../engine/onboard.js');
const dialects = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'library', 'dialects', 'dialects.json'), 'utf8')).dialects;

test('welcome payload is validated and handles normalized', () => {
  assert.ok(O.normalize({}).errors.length >= 3);
  const { data, errors } = O.normalize({ dialect: 'iraqi', name: ' سارة ', handles: { instagram: ' @@sara ', tiktok: 's a' } });
  assert.deepStrictEqual(errors, []);
  assert.strictEqual(data.name, 'سارة');
  assert.strictEqual(data.handles.instagram, '@sara');
  assert.strictEqual(data.handles.tiktok, '@sa');
});

test('apply writes the three identity files from the payload only', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'io-ob-'));
  const r = O.apply(d, { dialect: 'kuwaiti', name: 'خالد', brand: 'مطبخ خالد', niche: 'طبخ', handles: { youtube: 'khaled' }, lessonCharacter: 'male', identity: { mode: 'create', mood: 'natural', option: 3 } }, dialects);
  assert.ok(r.ok, JSON.stringify(r.errors));
  const proj = JSON.parse(fs.readFileSync(path.join(d, '.io', 'project.json'), 'utf8'));
  assert.strictEqual(proj.dialect, 'kuwaiti');
  assert.strictEqual(proj.lessonCharacter, 'male');
  const theme = JSON.parse(fs.readFileSync(path.join(d, '.io', 'theme.json'), 'utf8'));
  assert.strictEqual(theme.handle, '@khaled');
  assert.strictEqual(theme.name, 'مطبخ خالد');
  assert.match(fs.readFileSync(path.join(d, '.io', 'creator-profile.md'), 'utf8'), /- الاسم: خالد/);
  assert.ok(O.state(d, dialects).done);
});

test('account type, format and followed accounts are saved and feed the trend sources', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'io-ob-'));
  fs.mkdirSync(path.join(d, '.io'), { recursive: true });
  fs.writeFileSync(path.join(d, '.io', 'sources.json'), JSON.stringify({ sites: ['who.int'], accounts: [{ platform: 'instagram', handle: '@old' }], keywords: ['صحة'] }));
  const r = O.apply(d, {
    dialect: 'iraqi', name: 'علي', handles: { instagram: 'ali' },
    accountType: 'doctor', contentFormat: 'podcast',
    sources: {
      accounts: [
        { platform: 'instagram', handle: 'https://www.instagram.com/Some.Doc/' },
        { platform: 'instagram', handle: '@old' },
        { platform: 'youtube', handle: 'youtube.com/@health' },
        { platform: 'x', handle: ' @@xdoc ' },
        { platform: 'myspace', handle: 'nope' },
        { platform: 'tiktok', handle: '' },
      ],
      sites: 'https://www.Example.com/news/\nexample.com/news',
      keywords: ['صحة', 'تغذية'],
    },
    identity: { mode: 'create', option: 1 },
  }, dialects);
  assert.ok(r.ok, JSON.stringify(r.errors));
  assert.ok(r.files.includes(path.join('.io', 'sources.json')));
  const proj = JSON.parse(fs.readFileSync(path.join(d, '.io', 'project.json'), 'utf8'));
  assert.strictEqual(proj.accountType, 'doctor');
  assert.strictEqual(proj.contentFormat, 'podcast');
  const src = JSON.parse(fs.readFileSync(path.join(d, '.io', 'sources.json'), 'utf8'));
  assert.deepStrictEqual(src.accounts, [
    { platform: 'instagram', handle: '@old' },
    { platform: 'instagram', handle: '@Some.Doc' },
    { platform: 'youtube', handle: '@health' },
    { platform: 'x', handle: '@xdoc' },
  ]);
  assert.strictEqual(src.sites.filter((s) => s === 'who.int').length, 1, 'deduped');
  assert.ok(src.sites.includes('example.com/news'));
  assert.ok(src.sites.includes('pubmed.ncbi.nlm.nih.gov'), 'type trend sites added');
  assert.deepStrictEqual(src.keywords, ['صحة', 'تغذية']);
  // no mood given → the doctor pack's calm mood and accent
  const theme = JSON.parse(fs.readFileSync(path.join(d, '.io', 'theme.json'), 'utf8'));
  assert.strictEqual(theme.colors.accent.toUpperCase(), '#4A7FB5');
  const st = O.state(d, dialects);
  assert.ok(st.accountTypes.some((t) => t.id === 'doctor' && t.name && t.icon && t.description));
  assert.deepStrictEqual(st.formats.map((f) => f.id).sort(), ['podcast', 'video']);
});

test('unknown account type or format is rejected; none given keeps old behaviour', () => {
  assert.ok(O.normalize({ dialect: 'iraqi', name: 'x', handles: { tiktok: 'x' }, accountType: 'pilot' }).errors.length);
  assert.ok(O.normalize({ dialect: 'iraqi', name: 'x', handles: { tiktok: 'x' }, contentFormat: 'radio' }).errors.length);
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'io-ob-'));
  const r = O.apply(d, { dialect: 'iraqi', name: 'x', handles: { tiktok: 'x' } }, dialects);
  assert.ok(r.ok);
  assert.ok(!fs.existsSync(path.join(d, '.io', 'sources.json')));
  assert.strictEqual(r.project.accountType, undefined);
});

test('daily trends: asked in onboarding (web or chat), saved in project.json, changeable later', () => {
  assert.deepStrictEqual(O.dailyTrends({ enabled: true, hour: '7' }), { enabled: true, hour: 7 });
  assert.deepStrictEqual(O.dailyTrends({ enabled: false, hour: 99 }), { enabled: false, hour: 9 });
  assert.strictEqual(O.dailyTrends(null), null);
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'io-ob-'));
  const r = O.apply(d, { dialect: 'iraqi', name: 'علي', handles: { instagram: 'ali' }, dailyTrends: { enabled: true, hour: 20 }, identity: { mode: 'create', option: 1 } }, dialects);
  assert.ok(r.ok, JSON.stringify(r.errors));
  const read = () => JSON.parse(fs.readFileSync(path.join(d, '.io', 'project.json'), 'utf8'));
  assert.deepStrictEqual(read().dailyTrends, { enabled: true, hour: 20 });
  assert.ok(O.setProject(d, { dailyTrends: { enabled: false, hour: 6 } }).ok);
  assert.deepStrictEqual(read().dailyTrends, { enabled: false, hour: 6 });
  assert.strictEqual(read().dialect, 'iraqi', 'other keys kept');
  assert.ok(!O.setProject(d, { owner: 'x' }).ok, 'only whitelisted keys');
});

test('chat onboarding writes the same files through `onboard.js apply`', () => {
  const { execFileSync } = require('child_process');
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'io-ob-'));
  const f = path.join(d, 'payload.json');
  fs.writeFileSync(f, JSON.stringify({ dialect: 'kuwaiti', name: 'نورة', handles: { tiktok: 'noura' }, accountType: 'creator', dailyTrends: { enabled: true, hour: 9 }, identity: { mode: 'create', mood: 'calm', option: 2 } }));
  const out = execFileSync(process.execPath, [path.join(__dirname, '..', 'engine', 'onboard.js'), 'apply', f, '--dir', d]).toString();
  assert.match(out, /الترند اليومي: شغّال الساعة 9/);
  for (const x of ['creator-profile.md', 'theme.json', 'project.json']) assert.ok(fs.existsSync(path.join(d, '.io', x)), x);
  assert.strictEqual(JSON.parse(fs.readFileSync(path.join(d, '.io', 'project.json'), 'utf8')).accountType, 'creator');
  assert.ok(O.state(d, dialects).done);
});
