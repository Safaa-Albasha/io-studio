#!/usr/bin/env node
/*
 * I/O Studio — project setup & identity files.
 * Identity lives in the creator's project folder, under .io/:
 *   .io/creator-profile.md   who, audience, voice, rules
 *   .io/theme.json           colors, fonts, handle, numerals
 *   .io/project.json         platforms, handles per platform, output folders
 *
 *   node engine/config.js init   [--dir .]          # create missing files from templates
 *   node engine/config.js check  [--dir .]          # validate; exit 1 on errors
 *   node engine/config.js css    [--dir .]          # theme as CSS variables
 *   node engine/config.js lesson <name> [--dir .]   # new lesson folder (slides/, prompt.md, scene.json)
 *   node engine/config.js studio [--dir .]          # copy the web pages into .io/web
 *   node engine/config.js video-theme <work> [--dir .] [--force]  # .io/theme.json → <work>/theme.json for the video engine
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { dataDir, dataFile, editorHome, DATA_DIR } = require('./data-dir.js');
const { PLATFORMS } = require('../web/lib/platforms.js');

const TPL = path.join(__dirname, '..', 'templates');
const HEX = /^#[0-9a-f]{6}$/i;

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; o[k] = v; } else o._.push(a);
  }
  return o;
}

function paths(dir) {
  const d = dataDir(dir);
  return { d, profile: path.join(d, 'creator-profile.md'), theme: path.join(d, 'theme.json'), project: path.join(d, 'project.json') };
}

function init(dir) {
  const p = paths(dir);
  fs.mkdirSync(p.d, { recursive: true });
  const made = [];
  for (const [src, dst] of [['creator-profile.md', p.profile], ['theme.json', p.theme], ['project.json', p.project]]) {
    if (!fs.existsSync(dst)) { fs.copyFileSync(path.join(TPL, src), dst); made.push(path.relative(dir, dst)); }
  }
  return made;
}

/** Returns { errors, warnings } for the identity files in dir. */
function check(dir) {
  const p = paths(dir);
  const errors = [], warnings = [];
  const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { errors.push(`${path.basename(f)}: ${fs.existsSync(f) ? 'JSON غير صالح — ' + e.message : 'مو موجود (شغّل init أو سكل التعريف)'}`); return null; } };
  const theme = read(p.theme), project = read(p.project);
  if (!fs.existsSync(p.profile)) errors.push('creator-profile.md: مو موجود — شغّل سكل التعريف');
  else if (/الاسم:\s*$/m.test(fs.readFileSync(p.profile, 'utf8'))) warnings.push('creator-profile.md: لسه فاضي — شغّل سكل التعريف');
  if (theme) {
    for (const k of ['bg', 'ink', 'accent']) if (!theme.colors || !HEX.test(theme.colors[k] || '')) errors.push(`theme.json: colors.${k} لازم يكون لون hex مثل #E0663A`);
    for (const k of ['accent2', 'soft']) if (theme.colors && theme.colors[k] && !HEX.test(theme.colors[k])) errors.push(`theme.json: colors.${k} مو hex`);
    if (theme.colors && HEX.test(theme.colors.bg || '') && HEX.test(theme.colors.ink || '') && contrast(theme.colors.bg, theme.colors.ink) < 4.5) warnings.push(`theme.json: تباين النص على الخلفية ${contrast(theme.colors.bg, theme.colors.ink).toFixed(1)}:1 — أقل من 4.5، صعب ينقرا بالموبايل`);
    if (theme.numerals && !['western', 'arabic'].includes(theme.numerals)) errors.push('theme.json: numerals = western أو arabic');
    if (!theme.fonts || !theme.fonts.heading) warnings.push('theme.json: ما بيه fonts.heading — راح نستخدم Tajawal');
  }
  if (project) {
    const pl = project.platforms || [];
    for (const id of pl) if (!PLATFORMS[id]) errors.push(`project.json: منصة غير معروفة «${id}»`);
    const missing = Object.keys(PLATFORMS).filter((id) => !pl.includes(id));
    if (missing.length) warnings.push(`project.json: المنصات الثلاث مفروض تكون بالتساوي — ناقص: ${missing.join(', ')}`);
    for (const id of pl) if (!project.handles || !project.handles[id]) warnings.push(`project.json: ما بيه حساب لـ ${id}`);
    if (project.writingStyle && !['auto', 'short', 'educational', 'storytelling'].includes(project.writingStyle)) errors.push('project.json: writingStyle = auto أو short أو educational أو storytelling');
    if (project.ending && project.ending.followCard && !Object.values(project.handles || {}).some(Boolean)) warnings.push('project.json: بطاقة المتابعة تحتاج حساب (handles)');
    const dl = loadDialects();
    if (!project.dialect) warnings.push('project.json: ما بيه dialect — اسأل المستخدم عن لهجته (سكل io-onboarding)');
    else if (!dl.some((d) => d.id === project.dialect || d.name === project.dialect)) warnings.push(`project.json: اللهجة «${project.dialect}» مو بالمكتبة — راح أستخدمها كما هي (المعروفة: ${dl.map((d) => d.id).join(', ')})`);
  }
  // a dialect spelled with گ / چ (iraqi, kuwaiti…) needs a heading font that draws them
  if (theme && project && project.dialect) {
    const d = loadDialects().find((x) => x.id === project.dialect || x.name === project.dialect);
    const font = (theme.fonts && theme.fonts.heading) || 'Tajawal';
    if (d && /[گچ]/.test(`${d.spelling || ''} ${d.sample || ''}`)) {
      try {
        const cov = require('./arabic-qa.js').familyCoverage(font);
        const lacks = ['گ', 'چ'].filter((ch) => cov && !cov.has(ch.codePointAt(0)));
        if (lacks.length) warnings.push(`theme.json: الخط «${font}» ما يرسم ${lacks.join(' ')} — ولهجة ${d.name} تنكتب بيها. اختار Cairo أو IBM Plex Sans Arabic أو Noto Kufi Arabic أو Lalezar (node engine/arabic-qa.js يكشفها قبل التسليم)`);
      } catch (e) { /* font check is advisory */ }
    }
  }
  return { errors, warnings, theme, project };
}

function loadDialects() {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'library', 'dialects', 'dialects.json'), 'utf8')).dialects; } catch (e) { return []; }
}

function lum(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a, b) { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); }

function css(theme) {
  const c = theme.colors || {};
  const f = theme.fonts || {};
  return `:root{\n  --bg:${c.bg};\n  --ink:${c.ink};\n  --accent:${c.accent};\n  --accent2:${c.accent2 || c.accent};\n  --soft:${c.soft || c.bg};\n  --font-heading:"${f.heading || 'Tajawal'}",Tajawal,sans-serif;\n  --font-body:"${f.body || f.heading || 'Tajawal'}",Tajawal,sans-serif;\n}`;
}

function lesson(dir, name) {
  const proj = (() => { try { return JSON.parse(fs.readFileSync(paths(dir).project, 'utf8')); } catch (e) { return {}; } })();
  const root = path.join(dir, proj.lessonsDir || 'lessons', name);
  if (fs.existsSync(root)) throw new Error('الدرس موجود: ' + root);
  fs.mkdirSync(path.join(root, 'slides'), { recursive: true });
  fs.mkdirSync(path.join(root, 'recordings'), { recursive: true });
  fs.copyFileSync(path.join(TPL, 'lesson', 'prompt.md'), path.join(root, 'prompt.md'));
  fs.copyFileSync(path.join(TPL, 'lesson', 'scene.json'), path.join(root, 'scene.json'));
  const th = paths(dir).theme;
  if (fs.existsSync(th)) fs.copyFileSync(th, path.join(root, 'theme.json'));
  return root;
}

function mix(a, b, t) {
  const c = (h, i) => parseInt(h.slice(i, i + 2), 16);
  return '#' + [1, 3, 5].map((i) => Math.round(c(a, i) * (1 - t) + c(b, i) * t).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Identity theme → the video engine's theme.json keys (bg, ink, acc, clay, mut, font, handle). */
function videoTheme(theme, existing) {
  const c = theme.colors || {};
  const t = Object.assign({}, existing || {});
  t.bg = c.bg; t.ink = c.ink; t.acc = c.accent;
  t.clay = c.accent2 || mix(c.accent, c.ink, 0.35);
  t.mut = mix(c.ink, c.bg, 0.45);
  if (theme.fonts && theme.fonts.heading) t.font = theme.fonts.heading;
  if (theme.handle) t.handle = theme.handle;
  if (theme.logo) t.logo = theme.logo;
  return t;
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}

function main() {
  const o = args(process.argv.slice(2));
  const dir = path.resolve(o.dir || '.');
  const cmd = o._[0];
  if (cmd === 'init') {
    const made = init(dir);
    console.log(made.length ? `✓ انعمل: ${made.join('، ')}` : '✓ الملفات موجودة من قبل — ما غيّرت شي');
  } else if (cmd === 'check') {
    const r = check(dir);
    for (const e of r.errors) console.log('✗ ' + e);
    for (const w of r.warnings) console.log('⚠ ' + w);
    if (!r.errors.length) console.log(r.warnings.length ? '✓ صالح مع ملاحظات' : '✓ كل شي تمام');
    process.exitCode = r.errors.length ? 1 : 0;
  } else if (cmd === 'css') {
    const r = check(dir);
    if (!r.theme) { process.exitCode = 1; return; }
    console.log(css(r.theme));
  } else if (cmd === 'lesson') {
    if (!o._[1]) throw new Error('اسم الدرس مطلوب');
    console.log(`✓ ${lesson(dir, o._[1])}\n  حط صور الشرائح بـ slides/، والنص بـ prompt.md، وافتح المجلد بالاستوديو.`);
  } else if (cmd === 'video-theme') {
    const work = o._[1];
    if (!work) throw new Error('مجلد الشغل مطلوب');
    const r = check(dir);
    if (!r.theme) { process.exitCode = 1; return; }
    const tp = path.join(work, 'theme.json');
    if (fs.existsSync(tp) && !o.force) { console.log('⛔ فيه theme.json بمجلد الشغل — ما لمسته (--force لو طلب)'); process.exitCode = 4; return; }
    fs.mkdirSync(work, { recursive: true });
    const old = fs.existsSync(tp) ? JSON.parse(fs.readFileSync(tp, 'utf8')) : {};
    fs.writeFileSync(tp, JSON.stringify(videoTheme(r.theme, old), null, 2));
    console.log(`✓ ${tp} — من هوية .io/theme.json`);
  } else if (cmd === 'studio') {
    const dst = path.join(paths(dir).d, 'web');
    copyDir(path.join(__dirname, '..', 'web'), dst);
    console.log(`✓ ${dst}`);
  } else {
    console.log('الأوامر: init | check | css | lesson <اسم> | studio | video-theme <مجلد-شغل>   [--dir مجلد]');
    process.exitCode = cmd ? 1 : 0;
  }
}

if (require.main === module) { try { main(); } catch (e) { console.error('خطأ: ' + e.message); process.exit(1); } }
module.exports = { init, check, css, lesson, contrast, videoTheme, mix, paths, dataDir, dataFile, editorHome, DATA_DIR };
