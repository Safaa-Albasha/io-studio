'use strict';
// Green screen engine (engine/greenscreen/): python syntax, no secrets/personal paths, self-test when numpy+opencv exist, doctor + docs wiring.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.join(__dirname, '..');
const GS = path.join(ROOT, 'engine', 'greenscreen');
const PY = ['greenscreen.py', 'gscore.py', 'gsfx.py'].map((f) => path.join(GS, f));
const py = ['python3', 'python'].find((c) => cp.spawnSync(c, ['--version']).status === 0);

test('greenscreen: the three python files exist and compile', { skip: !py && 'no python' }, () => {
  for (const f of PY) {
    assert.ok(fs.existsSync(f), f);
    const r = cp.spawnSync(py, ['-I', '-c', 'import ast,sys; ast.parse(open(sys.argv[1], encoding="utf-8").read())', f], { encoding: 'utf8' });
    assert.strictEqual(r.status, 0, f + '\n' + r.stderr);
  }
});

test('greenscreen: no API keys, personal paths or hard-coded brand colours in the code', () => {
  for (const f of PY) {
    const s = fs.readFileSync(f, 'utf8');
    assert.doesNotMatch(s, /\/Users\/|\/home\/[a-z]|C:\\\\Users/i, f);
    assert.doesNotMatch(s, /sk_[A-Za-z0-9]{16,}|xi-api-key"\s*:\s*"[A-Za-z0-9]/, f);
    assert.doesNotMatch(s, /safaa|صفاء|majed|ماجد|Alexandria|alex700|Readex Pro/i, f);
    assert.doesNotMatch(s, /\(46,\s*196,\s*240\)|2EC4F0/i, f);
  }
  // the isolation key only ever comes from the environment
  assert.match(fs.readFileSync(PY[0], 'utf8'), /os\.environ\.get\("ELEVENLABS_API_KEY"/);
});

test('greenscreen: CLI help lists every mode', { skip: !py && 'no python' }, () => {
  const r = cp.spawnSync(py, ['-I', PY[0], '--help'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  for (const m of ['key', 'glass', 'glow', 'led', 'terminal', 'page', 'matte', 'voice', 'check', 'selftest']) assert.match(r.stdout, new RegExp('greenscreen\\.py ' + m + '\\b'), m);
});

const hasDeps = py && cp.spawnSync(py, ['-I', '-c', 'import numpy, cv2, PIL'], { encoding: 'utf8' }).status === 0;
test('greenscreen: self-test (key, despill, backgrounds, glass widgets, composite)', { skip: !hasDeps && 'numpy/opencv/Pillow not installed' }, () => {
  const r = cp.spawnSync(py, ['-I', PY[0], 'selftest'], { encoding: 'utf8', timeout: 120000 });
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.doesNotMatch(r.stdout, /❌/);
});

test('greenscreen: doctor detects it and the video editor routes to its reference', () => {
  const D = require('../engine/doctor.js');
  const c = D.CHECKS.find((x) => x.id === 'greenscreen');
  assert.ok(c && c.level === 'optional');
  assert.strictEqual(D.PIP.greenscreen, 'opencv-python-headless');
  const ref = path.join(ROOT, 'skills', 'io-video-editor', 'references', 'greenscreen.md');
  assert.ok(fs.existsSync(ref));
  assert.match(fs.readFileSync(ref, 'utf8'), /engine\/greenscreen\/greenscreen\.py/);
  const skill = fs.readFileSync(path.join(ROOT, 'skills', 'io-video-editor', 'SKILL.md'), 'utf8');
  assert.match(skill, /references\/greenscreen\.md/);
  assert.match(skill, /شاشة خضرا/);
});
