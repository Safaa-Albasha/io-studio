// No sales lines or outside promo links in what Claude reads while it works (skills, agents, references).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'vendor') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else if (/\.(md|js|py|html|json)$/.test(e.name)) out.push(p);
  }
  return out;
}

test('no course ad, promo link or upstream credit in skills, agents or hooks', () => {
  const files = ['skills', 'agents', 'hooks'].flatMap((d) => walk(path.join(ROOT, d)));
  for (const f of files) {
    const s = fs.readFileSync(f, 'utf8');
    assert.doesNotMatch(s, /dawrat\.com|احترف كلود|instagram\.com\/channel\/|video-ad-editor|majed|ماجد|الزعابي|content-engine/i, path.relative(ROOT, f));
  }
});

test('every skill and agent is named io-…', () => {
  for (const d of ['skills', 'agents']) {
    for (const e of fs.readdirSync(path.join(ROOT, d))) {
      const f = d === 'skills' ? path.join(ROOT, d, e, 'SKILL.md') : path.join(ROOT, d, e);
      if (!f.endsWith('.md') || !fs.existsSync(f)) continue;
      const name = (fs.readFileSync(f, 'utf8').match(/^name:\s*(\S+)/m) || [])[1];
      assert.match(name || '', /^io-/, path.relative(ROOT, f));
      if (d === 'skills') assert.strictEqual(name, e, `${e}: folder and name differ`);
    }
  }
});
