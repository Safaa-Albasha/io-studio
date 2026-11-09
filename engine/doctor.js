#!/usr/bin/env node
/*
 * I/O Studio — الطبيب: يفحص الجهاز (ويندوز · ماك · لينكس) ويقول شنو جاهز وشنو ناقص، وينصّب الناقص بس لما تطلب.
 *
 *   node engine/doctor.js                 فحص وتقرير بالعربي (ما ينصّب ولا شي)
 *   node engine/doctor.js --install       ينصّب الناقص الأساسي والمستحسن:
 *                                           ويندوز winget · ماك Homebrew (ويسأل قبل ما ينصّب Homebrew نفسه) · لينكس apt
 *                                           + pip install --user لمكتبات بايثون + npm لمكتبات نود
 *   node engine/doctor.js --install --all يضيف الاختياري (Blender · أدوات Xcode · قارئ HEIC)
 *   node engine/doctor.js --install --only ffmpeg,blender
 *   node engine/doctor.js --yes           بلا أسئلة (يوافق على تنصيب Homebrew لو ناقص)
 *   node engine/doctor.js --json          النتيجة JSON (للسكربتات)
 *   node engine/doctor.js --dry-run --install   يطبع أوامر التنصيب بلا تشغيل
 *
 * بلا مكتبات خارجية. ما يشغّل أي أمر تنصيب بدون --install أبداً.
 * رمز الخروج: 0 الأساسي جاهز · 10 ناقص أساسي · 11 التنصيب ما كمّل.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const VE = path.join(ROOT, 'skills', 'io-video-editor');
const BREW_INSTALL = '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"';

/* ───────────── الأجزاء الصافية (تنفحص بـtests/doctor.test.js) ───────────── */

function osOf(platform) {
  return platform === 'win32' ? 'win' : platform === 'darwin' ? 'mac' : 'linux';
}

const OS_NAME = { win: 'ويندوز', mac: 'ماك', linux: 'لينكس' };
const PM_OF = { win: 'winget', mac: 'brew', linux: 'apt' };
const LEVEL_NAME = { required: 'الأساسيات', recommended: 'مستحسن (قصّ الشخص · الوجه · الكابشن · التصدير)', optional: 'اختياري' };

// كل فحص: id · اسم · ليش نحتاجه · المستوى · الأنظمة (لو مخصص)
const CHECKS = [
  { id: 'node', label: 'Node.js 18+', why: 'كل أدوات الإضافة', level: 'required' },
  { id: 'python', label: 'Python 3.9+', why: 'سكربتات الفيديو والرحلات', level: 'required' },
  { id: 'pip', label: 'pip', why: 'تنصيب مكتبات بايثون', level: 'required' },
  { id: 'ffmpeg', label: 'ffmpeg', why: 'كل شغل الفيديو والصوت', level: 'required' },
  { id: 'ffprobe', label: 'ffprobe', why: 'قراءة معلومات الفيديو', level: 'required' },
  { id: 'chrome', label: 'Chrome / Chromium / Edge', why: 'رسم الموشن والتصدير', level: 'required' },
  { id: 'puppeteer-core', label: 'puppeteer-core', why: 'محرّك الرسم بسكل الفيديو', level: 'required' },
  { id: 'numpy', label: 'numpy', why: 'تحليل الصوت والصورة', level: 'recommended' },
  { id: 'pillow', label: 'Pillow', why: 'الصور (الكفرات · الرحلات)', level: 'recommended' },
  { id: 'whisper', label: 'whisper', why: 'الكابشن التلقائي', level: 'recommended' },
  { id: 'onnxruntime', label: 'onnxruntime', why: 'قصّ الشخص بلا ماك (MODNet)', level: 'recommended', os: ['win', 'linux'] },
  { id: 'mediapipe', label: 'mediapipe', why: 'تتبّع الوجه والكف بلا ماك', level: 'recommended', os: ['win', 'linux'] },
  { id: 'opencv', label: 'opencv', why: 'احتياط راصد الوجه بلا ماك', level: 'recommended', os: ['win', 'linux'] },
  { id: 'gles', label: 'libGLESv2', why: 'mediapipe يحتاجها على لينكس', level: 'recommended', os: ['linux'] },
  { id: 'playwright', label: 'Playwright', why: 'تصدير PNG/MP4 من HTML', level: 'recommended' },
  { id: 'zscale', label: 'ffmpeg zscale', why: 'تحويل فيديو آيفون HDR بلا ماك', level: 'recommended', os: ['win', 'linux'] },
  { id: 'swift', label: 'أدوات Xcode (swiftc)', why: 'Vision بالماك: قصّ الشخص والوجه الأسرع', level: 'optional', os: ['mac'] },
  { id: 'heif', label: 'pillow-heif', why: 'قراءة صور آيفون HEIC بمرتب الرحلات', level: 'optional' },
  { id: 'blender', label: 'Blender', why: 'سكل التصميم الداخلي (3D)', level: 'optional' },
  { id: 'greenscreen', label: 'شاشة خضرا (numpy + opencv + Pillow/raqm)', why: 'مؤثرات الشاشة الخضرا: engine/greenscreen/greenscreen.py', level: 'optional' },
  { id: 'track', label: 'التتبّع (numpy + opencv)', why: 'تثبيت عنصر على سطح/جسم يتحرك: engine/track/track.py', level: 'optional' },
];

const PKG = {
  winget: { ffmpeg: 'Gyan.FFmpeg', python: 'Python.Python.3.12', chrome: 'Google.Chrome', blender: 'BlenderFoundation.Blender', node: 'OpenJS.NodeJS.LTS' },
  brew: { ffmpeg: 'ffmpeg', python: 'python@3.12', chrome: '--cask google-chrome', blender: '--cask blender', node: 'node' },
  apt: { ffmpeg: 'ffmpeg', python: 'python3', pip: 'python3-pip', chrome: 'chromium', blender: 'blender', gles: 'libgles2 libegl1', node: 'nodejs' },
};
const ALIAS = { ffprobe: 'ffmpeg', zscale: 'ffmpeg' }; // ffmpeg الكامل فيه ffprobe وzscale
const PIP = { greenscreen: 'opencv-python-headless', track: 'opencv-python-headless', numpy: 'numpy', pillow: 'pillow', whisper: 'openai-whisper', onnxruntime: 'onnxruntime', mediapipe: 'mediapipe', opencv: 'opencv-python-headless', heif: 'pillow-heif' };
const PY_MOD = { numpy: 'numpy', pillow: 'PIL', whisper: 'whisper', onnxruntime: 'onnxruntime', mediapipe: 'mediapipe', opencv: 'cv2', heif: 'pillow_heif' };

function checksFor(osName) {
  return CHECKS.filter((c) => !c.os || c.os.includes(osName));
}

/** أمر تنصيب حزمة نظام: { cmd, args, sudo } أو null لو ما لها حزمة بهالمدير */
function systemInstall(pm, id, { isRoot = false } = {}) {
  const pkg = (PKG[pm] || {})[ALIAS[id] || id];
  if (!pkg) return null;
  const words = pkg.split(' ');
  if (pm === 'winget') return { cmd: 'winget', args: ['install', '--id', pkg, '-e', '--accept-package-agreements', '--accept-source-agreements'] };
  if (pm === 'brew') return { cmd: 'brew', args: ['install', ...words] };
  if (pm === 'apt') return isRoot ? { cmd: 'apt-get', args: ['install', '-y', ...words] } : { cmd: 'sudo', args: ['apt-get', 'install', '-y', ...words], sudo: true };
  return null;
}

/**
 * خطة التنصيب (بلا تشغيل): قائمة خطوات { ids, title, cmd, args, shell?, ask?, manual? }
 * missing: ids الناقصة · ctx: { py, has: {winget, brew, apt}, isRoot, veDir }
 */
function planInstall(osName, missing, ctx = {}) {
  const has = ctx.has || {};
  const pm = PM_OF[osName];
  const steps = [];
  const want = new Set(missing);
  const seen = new Set();

  if (osName === 'mac' && !has.brew && [...want].some((id) => (PKG.brew[ALIAS[id] || id]))) {
    steps.push({ ids: ['brew'], title: 'Homebrew (مدير البرامج بالماك)', cmd: '/bin/bash', args: ['-c', BREW_INSTALL], shellLine: BREW_INSTALL, ask: true });
  }
  const pmReady = has[pm] || (osName === 'mac' && steps.length > 0);
  if (osName === 'linux' && want.has('python')) want.add('pip');
  for (const id of want) {
    if (id === 'swift') { steps.push({ ids: ['swift'], title: 'أدوات Xcode', cmd: 'xcode-select', args: ['--install'] }); continue; }
    const real = ALIAS[id] || id;
    if (!(PKG[pm] || {})[real] || seen.has(real)) continue;
    if (osName === 'win' && real === 'pip') continue; // pip يجي مع بايثون من winget
    seen.add(real);
    const s = systemInstall(pm, real, ctx);
    if (!pmReady) {
      steps.push({ ids: [real], title: real, manual: osName === 'win'
        ? 'winget ناقص — نصّب «App Installer» من متجر مايكروسوفت، أو نزّل ' + real + ' يدوياً'
        : (pm + ' ناقص — نصّب ' + real + ' يدويا') });
      continue;
    }
    steps.push(Object.assign({ ids: [real], title: real }, s));
  }
  const pipPk = [...new Set([...want].filter((id) => PIP[id]).map((id) => PIP[id]))];
  if (pipPk.length) {
    const py = ctx.py || (osName === 'win' ? 'python' : 'python3');
    steps.push({ ids: [...want].filter((id) => PIP[id]), title: 'مكتبات بايثون', cmd: py, args: ['-m', 'pip', 'install', '--user', ...pipPk], pip: true });
  }
  if (want.has('puppeteer-core')) {
    steps.push({ ids: ['puppeteer-core'], title: 'puppeteer-core', cmd: 'npm', args: ['i', '--silent', 'puppeteer-core'], cwd: ctx.veDir || VE, shell: osName === 'win' });
  }
  if (want.has('playwright')) {
    steps.push({ ids: ['playwright'], title: 'Playwright', cmd: 'npm', args: ['i', '-g', 'playwright'], shell: osName === 'win' });
    steps.push({ ids: ['playwright'], title: 'متصفح Playwright', cmd: 'npx', args: ['playwright', 'install', 'chromium'], shell: osName === 'win' });
  }
  return steps;
}

function stepLine(s) {
  if (s.manual) return '✋ ' + s.manual;
  if (s.shellLine) return s.shellLine;
  return [s.cmd].concat(s.args).map((a) => (/[\s"]/.test(a) ? JSON.stringify(a) : a)).join(' ');
}

/** التقرير بالعربي — results: [{id, ok, detail, note}] */
function formatReport(results, osName, opts = {}) {
  const byId = Object.fromEntries(results.map((r) => [r.id, r]));
  const lines = [];
  lines.push('🩺 فحص آي أو استوديو — النظام: ' + (OS_NAME[osName] || osName) + (opts.arch ? ' (' + opts.arch + ')' : ''));
  for (const level of ['required', 'recommended', 'optional']) {
    const cs = checksFor(osName).filter((c) => c.level === level && byId[c.id]);
    if (!cs.length) continue;
    lines.push('');
    lines.push('▸ ' + LEVEL_NAME[level]);
    for (const c of cs) {
      const r = byId[c.id];
      const mark = r.ok ? '✅' : level === 'optional' ? '➖' : level === 'recommended' ? '⚠️' : '❌';
      lines.push('  ' + mark + ' ' + c.label + ' — ' + (r.ok ? (r.detail || 'جاهز') : 'ناقص · ' + c.why) + (r.note ? ' · ' + r.note : ''));
    }
  }
  const miss = (lv) => checksFor(osName).filter((c) => c.level === lv && byId[c.id] && !byId[c.id].ok).map((c) => c.label);
  const req = miss('required'), rec = miss('recommended');
  lines.push('');
  if (!req.length && !rec.length) lines.push('✅ كل شي جاهز — نقدر نبدأ.');
  else {
    if (req.length) lines.push('❌ ناقص أساسي: ' + req.join('، '));
    if (rec.length) lines.push('⚠️ ناقص مستحسن: ' + rec.join('، ') + ' (الشغل يمشي بدونه بس بعض المؤثرات تطفي)');
    lines.push('👉 للتنصيب: node engine/doctor.js --install' + (osName === 'mac' ? '   (يستخدم Homebrew)' : osName === 'win' ? '   (يستخدم winget)' : '   (يستخدم apt — يطلب كلمة سر المدير)'));
  }
  if (opts.notes && opts.notes.length) { lines.push(''); for (const n of opts.notes) lines.push('ℹ️ ' + n); }
  return lines.join('\n');
}

function wantInstall(argv) {
  return argv.includes('--install');
}

/* ───────────── الفحص الفعلي (يلمس النظام) ───────────── */

function run(cmd, args, opts = {}) {
  try {
    const r = cp.spawnSync(cmd, args, Object.assign({ encoding: 'utf8', timeout: 30000, windowsHide: true }, opts));
    return { ok: r.status === 0, out: ((r.stdout || '') + (r.stderr || '')).trim(), status: r.status };
  } catch (e) { return { ok: false, out: String(e.message || e), status: -1 }; }
}

function which(name, platform = process.platform) {
  const exts = platform === 'win32' ? (process.env.PATHEXT || '.EXE;.CMD;.BAT').split(';').concat(['']) : [''];
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    if (!dir) continue;
    for (const e of exts) {
      const p = path.join(dir, name + e.toLowerCase());
      const P = path.join(dir, name + e);
      for (const q of [p, P]) { try { if (fs.statSync(q).isFile()) return q; } catch (_) { /* التالي */ } }
    }
  }
  return null;
}

function firstExisting(list) {
  for (const p of list) { try { if (p && fs.statSync(p).isFile()) return p; } catch (_) { /* التالي */ } }
  return null;
}

function listDir(d) { try { return fs.readdirSync(d); } catch (_) { return []; } }

function findPython(osName) {
  const list = (process.env.PY ? [process.env.PY] : []).concat(osName === 'win' ? ['python', 'py', 'python3'] : ['python3', 'python']);
  for (const c of list) {
    const r = run(c, ['-c', 'import sys;print("%d.%d.%d"%sys.version_info[:3])']);
    if (r.ok && /^3\.(\d+)/.test(r.out)) return { cmd: c, version: r.out.split('\n').pop(), minor: +r.out.match(/^3\.(\d+)/)[1] };
  }
  return null;
}

function findChrome(osName) {
  const env = process.env;
  const pf = env.ProgramFiles || 'C:\\Program Files', pf86 = env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', la = env.LOCALAPPDATA || '';
  const byOs = {
    win: [pf + '\\Google\\Chrome\\Application\\chrome.exe', pf86 + '\\Google\\Chrome\\Application\\chrome.exe', la + '\\Google\\Chrome\\Application\\chrome.exe',
      pf86 + '\\Microsoft\\Edge\\Application\\msedge.exe', pf + '\\Microsoft\\Edge\\Application\\msedge.exe'],
    mac: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', path.join(os.homedir(), 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome')],
    linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/microsoft-edge'],
  };
  return firstExisting([env.CHROME_PATH].concat(byOs[osName] || []))
    || ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'chrome', 'msedge'].map((n) => which(n)).find(Boolean) || null;
}

function findBlender(osName) {
  const env = process.env;
  const list = [env.BLENDER_PATH];
  if (osName === 'win') {
    for (const base of [env.ProgramFiles || 'C:\\Program Files', env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)']) {
      const f = path.join(base, 'Blender Foundation');
      for (const v of listDir(f).filter((n) => /^blender/i.test(n)).sort().reverse()) list.push(path.join(f, v, 'blender.exe'));
    }
  } else if (osName === 'mac') {
    list.push('/Applications/Blender.app/Contents/MacOS/Blender', path.join(os.homedir(), 'Applications/Blender.app/Contents/MacOS/Blender'));
  } else {
    list.push('/usr/bin/blender', '/snap/bin/blender', '/usr/local/bin/blender');
    for (const n of listDir('/opt').filter((x) => /^blender/i.test(x))) list.push(path.join('/opt', n, 'blender'));
  }
  return which('blender') || firstExisting(list);
}

function findBrew() {
  return which('brew') || firstExisting(['/opt/homebrew/bin/brew', '/usr/local/bin/brew']);
}

function resolveFrom(dirs, mod) {
  for (const d of dirs) { try { return require.resolve(mod, { paths: [d] }); } catch (_) { /* التالي */ } }
  return null;
}

function npmGlobalRoot(osName) {
  const r = run('npm', ['root', '-g'], { shell: osName === 'win' });
  return r.ok ? r.out.split('\n').pop().trim() : null;
}

function probe(osName) {
  const R = {};
  const set = (id, ok, detail, note) => { R[id] = { id, ok: !!ok, detail: detail || '', note: note || '' }; };
  const nodeMajor = +process.versions.node.split('.')[0];
  set('node', nodeMajor >= 18, 'v' + process.versions.node, nodeMajor >= 18 ? '' : 'حدّثه لـ18 أو أحدث');

  const py = findPython(osName);
  set('python', py && py.minor >= 9, py ? py.cmd + ' ' + py.version : '', py && py.minor < 9 ? 'قديم — يحتاج 3.9+' : '');
  if (py) {
    const pip = run(py.cmd, ['-m', 'pip', '--version']);
    set('pip', pip.ok, pip.ok ? (pip.out.match(/pip [\d.]+/) || [''])[0] : '');
    const mods = Object.values(PY_MOD);
    const code = 'import json,importlib.util as u;print(json.dumps({m:bool(u.find_spec(m)) for m in ' + JSON.stringify(mods) + '}))';
    const r = run(py.cmd, ['-c', code]);
    let found = {};
    try { found = JSON.parse(r.out.split('\n').pop()); } catch (_) { /* فاضي */ }
    for (const [id, m] of Object.entries(PY_MOD)) set(id, found[m], found[m] ? 'مثبّت' : '');
    // الشاشة الخضرا: numpy + opencv + Pillow (وraqm للنص العربي بالويدجتات — بدونه يشتغل بس النص العربي يتفكك)
    const gs = found.numpy && found.cv2 && found.PIL;
    let raqm = false; if (gs) { const q = run(py.cmd, ['-c', 'from PIL import features;print(bool(features.check("raqm")))']); raqm = q.ok && /True/.test(q.out); }
    set('greenscreen', gs, gs ? (raqm ? 'جاهز (raqm ✓)' : 'جاهز — بلا raqm') : '', gs && !raqm ? 'النص العربي بالويدجتات يحتاج Pillow فيه raqm' : '');
    // التتبّع: numpy + opencv (CSRT للصندوق لو موجود — بلاه KLT)
    const tk = found.numpy && found.cv2;
    let csrt = false; if (tk) { const q = run(py.cmd, ['-c', 'import cv2;print(bool(getattr(cv2,"TrackerCSRT_create",None) or getattr(getattr(cv2,"legacy",None),"TrackerCSRT_create",None)))']); csrt = q.ok && /True/.test(q.out); }
    set('track', tk, tk ? (csrt ? 'جاهز (CSRT ✓)' : 'جاهز — الصندوق بـKLT') : '');
  } else {
    set('pip', false);
    for (const id of Object.keys(PY_MOD)) set(id, false);
    set('greenscreen', false);
    set('track', false);
  }

  const ff = which('ffmpeg'), fp = which('ffprobe');
  const ffv = ff ? run(ff, ['-version']) : null;
  set('ffmpeg', ff && ffv.ok, ff ? (ffv.out.match(/ffmpeg version (\S+)/) || [, ''])[1] : '');
  set('ffprobe', !!fp, fp ? 'جاهز' : '');
  if (osName !== 'mac') {
    const filters = ff ? run(ff, ['-hide_banner', '-filters']).out : '';
    const z = /\szscale\s/.test(filters) && /\stonemap\s/.test(filters);
    set('zscale', z, z ? 'zscale + tonemap' : '', ff && !z ? 'نسخة ffmpeg بلا zscale — نصّب البناء الكامل' : '');
  }

  const ch = findChrome(osName);
  set('chrome', ch, ch || '', ch ? '' : 'أو حدّد CHROME_PATH');
  const pc = resolveFrom([VE, ROOT], 'puppeteer-core');
  set('puppeteer-core', pc, pc ? 'جاهز (skills/io-video-editor)' : '');
  let pw = resolveFrom([ROOT, path.join(ROOT, 'engine')], 'playwright') || resolveFrom([ROOT], 'playwright-core');
  if (!pw) { const g = npmGlobalRoot(osName); if (g && fs.existsSync(path.join(g, 'playwright'))) pw = path.join(g, 'playwright'); }
  set('playwright', pw, pw ? 'جاهز' : '');

  if (osName === 'linux') {
    const l = run('ldconfig', ['-p']);
    const g = l.ok ? /libGLESv2\.so\.2/.test(l.out) : !!firstExisting(['/usr/lib/x86_64-linux-gnu/libGLESv2.so.2', '/usr/lib/aarch64-linux-gnu/libGLESv2.so.2']);
    set('gles', g, g ? 'جاهز' : '');
  }
  if (osName === 'mac') {
    const sw = which('swiftc');
    set('swift', sw, sw ? 'Vision جاهز' : '', sw ? '' : 'بدونها البدائل ببايثون (onnxruntime/mediapipe) تشتغل');
  }
  const bl = findBlender(osName);
  set('blender', bl, bl || '');
  return { results: checksFor(osName).map((c) => R[c.id]).filter(Boolean), py };
}

/* ───────────── التنصيب (بس مع --install) ───────────── */

function ask(q) {
  if (!process.stdin.isTTY) return Promise.resolve(false);
  const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(q + ' (y/n) ', (a) => { rl.close(); res(/^(y|yes|ن|نعم|اي|إي)/i.test(a.trim())); }));
}

async function execute(steps, { yes = false, dry = false } = {}) {
  const failed = [];
  for (const s of steps) {
    console.log('\n⏬ ' + s.title + ' ← ' + stepLine(s));
    if (s.manual) { failed.push(s.title); continue; }
    if (dry) continue;
    if (s.ask && !yes) {
      const ok = await ask('هذا أمر Homebrew الرسمي (brew.sh) — يطلب كلمة سر الماك. أنصّبه؟');
      if (!ok) { console.log('   تخطّيت — نصّبه بنفسك:\n   ' + BREW_INSTALL); failed.push(s.title); continue; }
    }
    let cmd = s.cmd;
    if (s.cmd === 'brew') cmd = findBrew() || 'brew';
    const opts = { stdio: 'inherit', cwd: s.cwd, shell: !!s.shell, timeout: 0 };
    let r = cp.spawnSync(cmd, s.args, opts);
    if (r.status !== 0 && s.pip) {
      // pip الجديد على لينكس/ماك يرفض --user ببيئة «externally managed» (PEP 668) — نعيد بالخيار الصريح
      console.log('   ↻ أعيد مع --break-system-packages (بيئة بايثون محمية)');
      r = cp.spawnSync(cmd, s.args.concat(['--break-system-packages']), opts);
    }
    if (r.status !== 0) { console.log('   ⚠️ ما كمّل: ' + s.title); failed.push(s.title); }
  }
  return failed;
}

async function main(argv) {
  const osName = osOf(process.platform);
  const json = argv.includes('--json');
  const { results, py } = probe(osName);
  const notes = [];
  if (osName === 'mac') notes.push('بالماك قصّ الشخص والوجه يستخدم Vision المدمج (أسرع) — البدائل ببايثون تشتغل لو أدوات Xcode ناقصة.');
  if (osName === 'win') notes.push('بعد أي تنصيب بـwinget افتح طرفية جديدة عشان PATH يتحدّث.');
  if (osName !== 'mac') notes.push('مرتب الرحلات: تطبيق الصور بالماك بس — هنا يشتغل على مجلد صور (trip.py scan).');
  if (json) { console.log(JSON.stringify({ os: osName, arch: process.arch, results }, null, 1)); }
  else console.log(formatReport(results, osName, { arch: process.arch, notes }));

  const reqMissing = results.filter((r) => !r.ok && CHECKS.find((c) => c.id === r.id).level === 'required');
  if (!wantInstall(argv)) return reqMissing.length ? 10 : 0;

  const only = (argv.find((a) => a.startsWith('--only=')) || '').slice(7) || (argv.includes('--only') ? argv[argv.indexOf('--only') + 1] || '' : '');
  const pick = only ? new Set(only.split(',').map((x) => x.trim())) : null;
  const all = argv.includes('--all');
  const missing = results.filter((r) => !r.ok).map((r) => r.id)
    .filter((id) => (pick ? pick.has(id) : all || CHECKS.find((c) => c.id === id).level !== 'optional'))
    .filter((id) => id !== 'node');
  if (!missing.length) { console.log('\nما فيه شي أنصّبه.'); return reqMissing.length ? 10 : 0; }
  const has = { winget: !!which('winget'), brew: !!findBrew(), apt: !!which('apt-get') };
  const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;
  const steps = planInstall(osName, missing, { py: py && py.cmd, has, isRoot, veDir: VE });
  console.log('\n🔧 التنصيب (' + (OS_NAME[osName]) + '): ' + missing.join('، '));
  const failed = await execute(steps, { yes: argv.includes('--yes'), dry: argv.includes('--dry-run') });
  if (argv.includes('--dry-run')) return 0;
  console.log('\n— بعد التنصيب —');
  const again = probe(osName).results;
  console.log(formatReport(again, osName, { arch: process.arch }));
  const still = again.filter((r) => !r.ok && CHECKS.find((c) => c.id === r.id).level === 'required');
  if (failed.length) console.log('\n⚠️ ما كمّل: ' + failed.join('، '));
  return still.length || failed.length ? 11 : 0;
}

module.exports = { osOf, CHECKS, PKG, PIP, checksFor, systemInstall, planInstall, stepLine, formatReport, wantInstall, BREW_INSTALL };

if (require.main === module) {
  main(process.argv.slice(2)).then((code) => process.exit(code), (e) => { console.error(e); process.exit(1); });
}
