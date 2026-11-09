'use strict';
const test = require('node:test');
const assert = require('node:assert');
const D = require('../engine/doctor.js');

test('osOf maps node platforms to win / mac / linux', () => {
  assert.strictEqual(D.osOf('win32'), 'win');
  assert.strictEqual(D.osOf('darwin'), 'mac');
  assert.strictEqual(D.osOf('linux'), 'linux');
  assert.strictEqual(D.osOf('freebsd'), 'linux');
});

test('checksFor keeps os-specific checks on their own os', () => {
  const ids = (o) => D.checksFor(o).map((c) => c.id);
  assert.ok(ids('mac').includes('swift'));
  assert.ok(!ids('win').includes('swift'));
  assert.ok(ids('linux').includes('gles'));
  assert.ok(!ids('mac').includes('gles'));
  for (const o of ['win', 'mac', 'linux']) {
    for (const need of ['node', 'python', 'ffmpeg', 'chrome', 'blender']) assert.ok(ids(o).includes(need), o + ' ' + need);
  }
});

test('windows uses winget with the right package ids', () => {
  const steps = D.planInstall('win', ['ffmpeg', 'ffprobe', 'python', 'blender', 'chrome'], { has: { winget: true } });
  const ids = steps.filter((s) => s.cmd === 'winget').map((s) => s.args[2]);
  assert.deepStrictEqual(ids.sort(), ['BlenderFoundation.Blender', 'Google.Chrome', 'Gyan.FFmpeg', 'Python.Python.3.12']);
  const ff = steps.find((s) => s.args && s.args.includes('Gyan.FFmpeg'));
  assert.ok(ff.args.includes('--accept-package-agreements') && ff.args.includes('-e'));
  // ffprobe comes with ffmpeg: one step only
  assert.strictEqual(steps.filter((s) => s.title === 'ffmpeg').length, 1);
});

test('windows without winget gives a manual note instead of running anything', () => {
  const steps = D.planInstall('win', ['ffmpeg'], { has: {} });
  assert.strictEqual(steps.length, 1);
  assert.ok(steps[0].manual && steps[0].manual.includes('winget'));
});

test('mac uses Homebrew and asks before installing Homebrew itself', () => {
  const withBrew = D.planInstall('mac', ['ffmpeg', 'blender', 'chrome'], { has: { brew: true } });
  assert.ok(withBrew.every((s) => s.cmd === 'brew'));
  assert.deepStrictEqual(withBrew.find((s) => s.title === 'blender').args, ['install', '--cask', 'blender']);
  const noBrew = D.planInstall('mac', ['ffmpeg'], { has: {} });
  assert.strictEqual(noBrew[0].ids[0], 'brew');
  assert.strictEqual(noBrew[0].ask, true);
  assert.strictEqual(noBrew[0].shellLine, D.BREW_INSTALL);
  assert.match(D.BREW_INSTALL, /raw\.githubusercontent\.com\/Homebrew\/install\/HEAD\/install\.sh/);
  assert.strictEqual(noBrew[1].cmd, 'brew');
  // Xcode tools on mac
  assert.deepStrictEqual(D.planInstall('mac', ['swift'], { has: { brew: true } })[0].args, ['--install']);
});

test('linux uses apt with sudo unless root, and adds pip with python', () => {
  const user = D.planInstall('linux', ['ffmpeg', 'gles', 'python'], { has: { apt: true }, isRoot: false });
  const ff = user.find((s) => s.title === 'ffmpeg');
  assert.deepStrictEqual([ff.cmd, ...ff.args], ['sudo', 'apt-get', 'install', '-y', 'ffmpeg']);
  assert.ok(user.some((s) => s.title === 'gles' && s.args.includes('libgles2')));
  assert.ok(user.some((s) => s.title === 'pip' && s.args.includes('python3-pip')));
  const root = D.planInstall('linux', ['ffmpeg'], { has: { apt: true }, isRoot: true });
  assert.strictEqual(root[0].cmd, 'apt-get');
});

test('python and node packages are grouped, --user, and in the right folder', () => {
  const steps = D.planInstall('linux', ['mediapipe', 'onnxruntime', 'whisper', 'puppeteer-core', 'playwright'], { py: 'python3', has: { apt: true }, veDir: '/x/ve' });
  const pip = steps.find((s) => s.pip);
  assert.deepStrictEqual(pip.args.slice(0, 4), ['-m', 'pip', 'install', '--user']);
  assert.ok(pip.args.includes('openai-whisper') && pip.args.includes('mediapipe') && pip.args.includes('onnxruntime'));
  assert.strictEqual(steps.filter((s) => s.pip).length, 1);
  const pc = steps.find((s) => s.title === 'puppeteer-core');
  assert.strictEqual(pc.cwd, '/x/ve');
  assert.ok(steps.some((s) => s.cmd === 'npx' && s.args.join(' ') === 'playwright install chromium'));
  // npm on windows is a .cmd: it must go through the shell
  const w = D.planInstall('win', ['puppeteer-core'], { has: { winget: true } });
  assert.strictEqual(w[0].shell, true);
});

test('stepLine shows a copy-pasteable command', () => {
  assert.strictEqual(D.stepLine({ cmd: 'brew', args: ['install', 'ffmpeg'] }), 'brew install ffmpeg');
  assert.strictEqual(D.stepLine({ cmd: 'x', args: ['a b'] }), 'x "a b"');
  assert.match(D.stepLine({ manual: 'نزّل يدوياً' }), /✋/);
});

test('formatReport marks missing items by level and suggests --install', () => {
  const res = D.checksFor('linux').map((c) => ({ id: c.id, ok: c.id !== 'ffmpeg' && c.id !== 'mediapipe' && c.id !== 'blender', detail: 'v1' }));
  const txt = D.formatReport(res, 'linux');
  assert.match(txt, /النظام: لينكس/);
  assert.match(txt, /❌ ffmpeg — ناقص/);
  assert.match(txt, /⚠️ mediapipe — ناقص/);
  assert.match(txt, /➖ Blender — ناقص/);
  assert.match(txt, /ناقص أساسي: ffmpeg/);
  assert.match(txt, /node engine\/doctor\.js --install/);
  assert.match(txt, /apt/);
  const ok = D.formatReport(D.checksFor('win').map((c) => ({ id: c.id, ok: true })), 'win', { notes: ['ملاحظة'] });
  assert.match(ok, /كل شي جاهز/);
  assert.match(ok, /ℹ️ ملاحظة/);
  assert.doesNotMatch(ok, /--install/);
});

test('installs only happen with --install', () => {
  assert.strictEqual(D.wantInstall([]), false);
  assert.strictEqual(D.wantInstall(['--json', '--all']), false);
  assert.strictEqual(D.wantInstall(['--install']), true);
});
