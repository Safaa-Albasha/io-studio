'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const AT = require('../engine/account-type.js');
const I = require('../engine/identity.js');

const root = path.join(__dirname, '..');
const json = (f) => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));

function moveIds() {
  const dir = path.join(root, 'skills', 'io-video-editor', 'motion', 'moves');
  const ids = new Set();
  for (const f of fs.readdirSync(dir).filter((x) => /^catalog.*\.json$/.test(x))) {
    for (const m of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).moves) ids.add(m.id);
  }
  return ids;
}

test('every id a pack references exists (moods, skills, moves, sfx, looks)', () => {
  const data = AT.load();
  const moves = moveIds();
  const sfx = new Set(json('library/sfx/catalog.json').sounds.map((s) => s.id));
  const looks = new Set(json('library/looks/catalog.json').looks.map((l) => l.id));
  const skills = new Set(fs.readdirSync(path.join(root, 'skills')).filter((d) => fs.existsSync(path.join(root, 'skills', d, 'SKILL.md'))));
  const want = ['doctor', 'interior', 'entrepreneur', 'creator', 'teacher', 'personal'];
  assert.deepStrictEqual(data.types.map((t) => t.id).sort(), want.slice().sort());
  for (const t of data.types) {
    for (const k of ['id', 'name', 'icon', 'description']) assert.ok(t[k], `${t.id}.${k}`);
    assert.ok(t.identity.mood in I.MOODS, `${t.id} mood ${t.identity.mood}`);
    assert.match(t.identity.accent, /^#[0-9A-Fa-f]{6}$/);
    for (const k of ['carousel', 'skills', 'moves', 'sfx', 'looks', 'rules', 'trendSites']) assert.ok(Array.isArray(t[k]) && t[k].length, `${t.id}.${k}`);
    for (const s of t.skills) assert.ok(skills.has(s), `${t.id} skill ${s}`);
    for (const m of t.moves) assert.ok(moves.has(m), `${t.id} move ${m}`);
    for (const s of t.sfx) assert.ok(sfx.has(s), `${t.id} sfx ${s}`);
    for (const l of t.looks) assert.ok(looks.has(l), `${t.id} look ${l}`);
  }
  assert.deepStrictEqual(data.formats.map((f) => f.id).sort(), ['podcast', 'video']);
  for (const f of data.formats) {
    for (const s of f.skills) assert.ok(skills.has(s), `${f.id} skill ${s}`);
    for (const m of f.moves) assert.ok(moves.has(m), `${f.id} move ${m}`);
    assert.ok(f.rules.length);
  }
  assert.ok(data.formats.find((f) => f.id === 'podcast').skills.includes('io-podcast-video'));
  assert.ok(fs.existsSync(path.join(root, 'engine', 'podcast-batch.js')));
});

test('doctor pack makes sources and disclaimer mandatory; nothing personal hard-coded', () => {
  const doc = AT.getType('doctor');
  assert.ok(doc.rules.some((r) => /مصدر/.test(r)));
  assert.ok(doc.rules.some((r) => /إخلاء مسؤولية/.test(r)));
  assert.ok(doc.carousel.some((s) => /خرافة/.test(s)));
  assert.doesNotMatch(fs.readFileSync(AT.FILE, 'utf8'), /safaa\.?io|@safaa/i);
});

test('getPack merges the project type and format', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'io-at-'));
  assert.strictEqual(AT.getPack(d).type, null);
  fs.mkdirSync(path.join(d, '.io'));
  fs.writeFileSync(path.join(d, '.io', 'project.json'), JSON.stringify({ accountType: 'teacher', contentFormat: 'podcast' }));
  const p = AT.getPack(d);
  assert.strictEqual(p.type.id, 'teacher');
  assert.strictEqual(p.format.id, 'podcast');
  assert.ok(p.skills.includes('io-lesson') && p.skills.includes('io-podcast-video'));
  assert.strictEqual(new Set(p.moves).size, p.moves.length, 'no duplicate moves');
  assert.ok(p.rules.some((r) => /podcast-batch/.test(r)));
  const cli = path.join(root, 'engine', 'account-type.js');
  assert.match(execFileSync('node', [cli, 'show', '--dir', d]).toString(), /مدرّس/);
  assert.match(execFileSync('node', [cli, 'list']).toString(), /رائد أعمال[\s\S]*بودكاست/);
});

test('session-start hook names the account type so Claude applies its pack', () => {
  const H = require('../hooks/session-start.js');
  assert.strictEqual(H.accountTypeLine({}), '');
  const line = H.accountTypeLine({ accountType: 'entrepreneur', contentFormat: 'video' });
  assert.match(line, /رائد أعمال · فيديو عادي/);
  assert.match(line, /account-type\.js" show/);
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'io-at-'));
  fs.mkdirSync(path.join(d, '.io'));
  fs.writeFileSync(path.join(d, '.io', 'creator-profile.md'), '- الاسم: تجربة\n');
  fs.writeFileSync(path.join(d, '.io', 'project.json'), JSON.stringify({ accountType: 'doctor' }));
  assert.match(H.run(d), /نوع الحساب: طبيب/);
});
