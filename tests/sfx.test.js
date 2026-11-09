'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'library', 'sfx');
const cat = JSON.parse(fs.readFileSync(path.join(DIR, 'catalog.json'), 'utf8'));

function wavInfo(file) {
  const b = fs.readFileSync(file);
  assert.strictEqual(b.toString('ascii', 0, 4), 'RIFF', file);
  assert.strictEqual(b.toString('ascii', 8, 12), 'WAVE', file);
  let o = 12, fmt = null, data = null;
  while (o + 8 <= b.length) {
    const id = b.toString('ascii', o, o + 4), sz = b.readUInt32LE(o + 4);
    if (id === 'fmt ') fmt = { ch: b.readUInt16LE(o + 10), sr: b.readUInt32LE(o + 12), bits: b.readUInt16LE(o + 22) };
    if (id === 'data') data = { off: o + 8, size: sz };
    o += 8 + sz + (sz & 1);
  }
  assert.ok(fmt && data, file);
  let peak = 0;
  for (let i = data.off; i + 1 < data.off + data.size; i += 2) peak = Math.max(peak, Math.abs(b.readInt16LE(i)));
  return { ...fmt, dur: data.size / (fmt.sr * fmt.ch * fmt.bits / 8), peak: peak / 32767 };
}

test('catalog: 80+ sounds, unique snake_case ids, Arabic + English names, known categories', () => {
  assert.ok(cat.sounds.length >= 80, `only ${cat.sounds.length}`);
  const ids = cat.sounds.map((s) => s.id);
  assert.strictEqual(new Set(ids).size, ids.length, 'duplicate ids');
  for (const s of cat.sounds) {
    assert.match(s.id, /^[a-z][a-z0-9_]*$/, s.id);
    assert.match(s.ar, /[؀-ۿ]/, `${s.id} Arabic name`);
    assert.ok(s.en && s.use && Array.isArray(s.tags) && s.tags.length, s.id);
    assert.strictEqual(s.name_ar, s.ar); assert.strictEqual(s.name_en, s.en);
    assert.ok(cat.categories[s.category], `${s.id}: unknown category ${s.category}`);
  }
  for (const c of ['transition', 'ui', 'impact', 'riser', 'tech', 'money', 'countdown', 'nature', 'cartoon', 'music'])
    assert.ok(cat.sounds.some((s) => s.category === c), `no sounds in ${c}`);
});

test('every file exists, is 48 kHz mono 16-bit, matches its catalog duration, and respects the loudness rule', () => {
  let total = 0;
  for (const s of cat.sounds) {
    const f = path.join(DIR, s.file);
    assert.ok(fs.existsSync(f), `missing ${s.file}`);
    total += fs.statSync(f).size;
    const w = wavInfo(f);
    assert.deepStrictEqual([w.sr, w.ch, w.bits], [48000, 1, 16], s.id);
    assert.ok(Math.abs(w.dur - s.duration) < 0.002, `${s.id}: ${w.dur} vs ${s.duration}`);
    assert.ok(s.duration > 0.02 && s.duration <= 6, `${s.id} duration ${s.duration}`);
    assert.ok(w.peak <= 0.8913 + 1e-3, `${s.id} peak ${w.peak} above -1 dBFS`);
    assert.ok(w.peak > 0.1, `${s.id} nearly silent`);
    assert.ok(s.momentary_lufs <= cat.loudness.momentary_lufs_max + 0.2, `${s.id} too loud`);
    assert.ok(s.peak_db <= cat.loudness.peak_dbfs_max + 0.01, s.id);
  }
  assert.ok(total < 25 * 1024 * 1024, `library is ${total} bytes`);
});

test('generator registers exactly the catalog ids (no orphans)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'engine', 'sfx-gen.py'), 'utf8');
  const gen = [...src.matchAll(/@snd\("([a-z0-9_]+)"/g)].map((m) => m[1]);
  const generated = cat.sounds.filter((s) => s.source !== 'cc0').map((s) => s.id).sort();
  assert.deepStrictEqual([...gen].sort(), generated);
  const wavs = fs.readdirSync(path.join(DIR, 'wav')).filter((f) => f.endsWith('.wav')).map((f) => f.slice(0, -4));
  assert.deepStrictEqual(wavs.sort(), generated);
});

test('recorded CC0 sounds: every one has a ledger entry with its source, licence and the sha256 of the shipped file', () => {
  const crypto = require('crypto');
  const ledger = JSON.parse(fs.readFileSync(path.join(DIR, 'cc0', 'ledger.json'), 'utf8'));
  const cc0 = cat.sounds.filter((s) => s.source === 'cc0');
  assert.ok(cc0.length >= 20, `only ${cc0.length} CC0 sounds`);
  assert.strictEqual(ledger.licence, 'CC0-1.0');
  const byId = new Map(ledger.sounds.map((e) => [e.id, e]));
  for (const s of cc0) {
    assert.match(s.id, /^cc0_[a-z0-9_]+$/);
    assert.strictEqual(s.license, 'CC0-1.0', s.id);
    const e = byId.get(s.id);
    assert.ok(e, `${s.id} has no ledger entry`);
    assert.ok(ledger.sources[e.source] && ledger.sources[e.source].licence === 'CC0-1.0', `${s.id}: source licence`);
    assert.ok(/^https:\/\//.test(e.originUrl), `${s.id}: origin url`);
    const file = path.join(DIR, s.file);
    assert.strictEqual(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'), e.sha256, `${s.id}: shipped file differs from the ledger`);
  }
  assert.strictEqual(ledger.sounds.length, cc0.length, 'ledger and catalog list different CC0 sounds');
});

test('video engine reads "lib" in both orders and keeps the old keys', () => {
  const py = fs.readFileSync(path.join(ROOT, 'skills', 'io-video-editor', 'scripts', '05_sfx.py'), 'utf8');
  assert.match(py, /_s\.get\("lib",\[\]\)/);
  assert.match(py, /isinstance\(it\[0\],str\)/);
  for (const k of ['whoosh_up', 'whoosh_down', 'thud', 'tap', 'pop', 'click', 'riser', 'counter', 'soft']) assert.ok(py.includes(`_s.get("${k}"`), k);
});

test('skill + page exist and reference real ids', () => {
  const skill = fs.readFileSync(path.join(ROOT, 'skills', 'io-sfx', 'SKILL.md'), 'utf8');
  assert.match(skill, /^---\nname: io-sfx\n/);
  const ids = new Set(cat.sounds.map((s) => s.id));
  for (const m of skill.matchAll(/`([a-z]+_[a-z0-9_]+)`/g)) if (!/^(sfx_|engine_)/.test(m[1])) assert.ok(ids.has(m[1]), `skill mentions unknown sound ${m[1]}`);
  const page = fs.readFileSync(path.join(ROOT, 'web', 'sfx.html'), 'utf8');
  assert.match(page, /dir="rtl"/);
  const emb = JSON.parse(/<script id="catalog" type="application\/json">([\s\S]*?)<\/script>/.exec(page)[1]);
  assert.strictEqual(emb.sounds.length, cat.sounds.length, 'embedded catalog out of date — run python3 engine/sfx-gen.py');
});
