#!/usr/bin/env node
/*
 * I/O Studio — visual identity: upload it, or create it.
 *
 *   node engine/identity.js upload <logo.png> [post1.jpg …] [theme.json] [--dir .]
 *        colors from the creator's own images (logo, old posts, screenshots) → .io/theme.json
 *   node engine/identity.js moods
 *   node engine/identity.js create [--mood warm] [--accent #E0663A] [--dark] [--dir .]
 *        three ready identities to choose from → .io/identity-options.json + preview image
 *   node engine/identity.js pick <1|2|3> [--dir .]        write the chosen option to .io/theme.json
 *   node engine/identity.js preview [--options] [--dir .] render .io/identity-preview.png
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { dataDir } = require('./data-dir.js');
const { spawnSync } = require('child_process');
const { contrast, mix, init } = require('./config.js');

const FONTS_DIR = path.join(__dirname, '..', 'skills', 'io-video-editor', 'motion', 'fonts');
const THEME_REFS = path.join(__dirname, '..', 'skills', 'io-video-editor', 'scripts', '00_theme_refs.py');
const HEX = /^#[0-9a-f]{6}$/i;

// Fonts that ship with the plugin (OFL — see motion/fonts/LICENSES.txt).
const FONTS = {
  Tajawal: { file: 'Tajawal-Bold.ttf', feel: 'نظيف وودّي' },
  Cairo: { file: 'Cairo-VF.ttf', feel: 'عصري وواضح' },
  'IBM Plex Sans Arabic': { file: 'IBMPlexSansArabic-Bold.ttf', feel: 'تقني ومرتب' },
  'Readex Pro': { file: 'ReadexPro-VF.ttf', feel: 'هادئ ومريح' },
  'Noto Kufi Arabic': { file: 'NotoKufiArabic-VF.ttf', feel: 'رسمي وقوي' },
  Lalezar: { file: 'Lalezar-Regular.ttf', feel: 'عناوين جريئة ومرحة' },
  'Aref Ruqaa': { file: 'ArefRuqaa-Bold.ttf', feel: 'خط رقعة تراثي' },
};

// Each mood: three palettes [bg, ink, accent, accent2] + a heading font.
const MOODS = {
  warm: { ar: 'دافئ وودّي', options: [['#FFF7EC', '#2A2622', '#E0663A', '#2F7FBF', 'Tajawal'], ['#FBF1E6', '#3B2418', '#C8553D', '#588B8B', 'Readex Pro'], ['#2B1E16', '#FFF3E6', '#F29E4C', '#E8D5B7', 'Cairo']] },
  calm: { ar: 'هادئ ومريح', options: [['#F3F6F4', '#1F2D2A', '#5B8A72', '#C9A66B', 'Readex Pro'], ['#EEF3F8', '#1C2B3A', '#4A7FB5', '#E0A458', 'Tajawal'], ['#1E2A2F', '#EAF2F0', '#8CC0B0', '#F2C4A0', 'IBM Plex Sans Arabic']] },
  bold: { ar: 'جريء ولافت', options: [['#111111', '#FFFFFF', '#FFD23F', '#EE4266', 'Lalezar'], ['#FFFFFF', '#111111', '#FF3B30', '#1E88E5', 'Cairo'], ['#0D1B2A', '#F4F4F4', '#00E0B8', '#FF6B35', 'Noto Kufi Arabic']] },
  luxury: { ar: 'فخم وراقي', options: [['#0F1A2E', '#F5EFE3', '#C9A24D', '#8A9BB5', 'Noto Kufi Arabic'], ['#F7F3EC', '#1B1B1B', '#9C7A3C', '#2C3E50', 'Aref Ruqaa'], ['#1A1A1A', '#EDE6D6', '#B08D57', '#6E6E6E', 'Cairo']] },
  playful: { ar: 'مرح وشبابي', options: [['#FFF4F8', '#2D1B3D', '#FF5C8A', '#17BEBB', 'Lalezar'], ['#F0FBFF', '#1B2A41', '#3A86FF', '#FFBE0B', 'Cairo'], ['#FFFBEA', '#232323', '#FB5607', '#8338EC', 'Tajawal']] },
  natural: { ar: 'طبيعي وترابي', options: [['#F5F1E6', '#2E2A20', '#6B7F3A', '#C27C4E', 'Readex Pro'], ['#EFE9DD', '#2B2B26', '#A0522D', '#5F7161', 'Tajawal'], ['#263027', '#F1EEE4', '#C7B37A', '#8FB996', 'IBM Plex Sans Arabic']] },
  tech: { ar: 'تقني وحديث', options: [['#0B1020', '#E6EDF7', '#4F8CFF', '#22D3EE', 'IBM Plex Sans Arabic'], ['#F6F8FB', '#0F172A', '#6366F1', '#10B981', 'IBM Plex Sans Arabic'], ['#111317', '#F1F3F5', '#00D18F', '#7C5CFF', 'Cairo']] },
  soft: { ar: 'ناعم وأنثوي', options: [['#FFF5F5', '#3A2430', '#D4708F', '#8E7DBE', 'Readex Pro'], ['#F8F1F6', '#2F2235', '#A45A8C', '#E7B4A3', 'Tajawal'], ['#2A1F2D', '#FBEFF4', '#F4A6C1', '#C9B6E4', 'Cairo']] },
};

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; o[k] = v; } else o._.push(a);
  }
  return o;
}

/** Make sure text is readable: ink ≥ 4.5:1 on bg, accent ≥ 3:1 (nudge toward ink if not). */
function readable(t) {
  const out = Object.assign({}, t);
  if (contrast(out.bg, out.ink) < 4.5) out.ink = contrast(out.bg, '#111111') >= contrast(out.bg, '#FFFFFF') ? '#111111' : '#FFFFFF';
  let k = 0;
  while (contrast(out.bg, out.accent) < 3 && k < 10) { out.accent = mix(out.accent, out.ink, 0.15); k++; }
  return out;
}

/** One palette row → a .io/theme.json object. */
function toTheme([bg, ink, accent, accent2, font], extra) {
  const base = readable({ bg, ink, accent, accent2 });
  return Object.assign({
    name: 'هويتي',
    colors: { bg: base.bg, ink: base.ink, accent: base.accent, accent2: base.accent2, soft: mix(base.bg, base.accent, 0.14) },
    fonts: { heading: font, body: font === 'Lalezar' || font === 'Aref Ruqaa' ? 'Tajawal' : font },
    numerals: 'western',
  }, extra || {});
}

/** Three options for a mood; a custom accent replaces each option's accent. */
function createOptions(mood, accent, dark) {
  const m = MOODS[mood] || MOODS.warm;
  let rows = m.options.map((r) => r.slice());
  if (accent && HEX.test(accent)) rows = rows.map((r) => [r[0], r[1], accent, r[3], r[4]]);
  if (dark) rows = rows.map((r) => (contrast(r[0], '#000000') > contrast(r[0], '#FFFFFF') ? [r[1], r[0], r[2], r[3], r[4]] : r));
  return rows.map((r, i) => Object.assign(toTheme(r), { option: i + 1, mood: mood in MOODS ? mood : 'warm', feel: FONTS[r[4]] ? FONTS[r[4]].feel : '' }));
}

/** The video engine's theme keys → identity theme (used after colour extraction from images). */
function fromEngineTheme(e) {
  return readable({ bg: e.bg, ink: e.ink, accent: e.acc, accent2: e.clay || e.mut || e.acc });
}


function readJson(f, d) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } }

function writeTheme(dir, theme) {
  init(dir); // make sure the other identity files exist
  const tp = path.join(dataDir(dir), 'theme.json');
  const old = readJson(tp, {});
  const merged = Object.assign({}, old, theme, { colors: Object.assign({}, old.colors, theme.colors), fonts: Object.assign({}, old.fonts, theme.fonts) });
  delete merged.option; delete merged.mood; delete merged.feel;
  fs.writeFileSync(tp, JSON.stringify(merged, null, 2));
  return tp;
}

function cmdUpload(o, dir) {
  const files = o._.slice(1).map((f) => path.resolve(f));
  if (!files.length) throw new Error('ارفع ملف وحد على الأقل: شعار، صور بوستات سابقة، أو theme.json');
  for (const f of files) if (!fs.existsSync(f)) throw new Error('الملف مو موجود: ' + f);
  const jsons = files.filter((f) => /\.json$/i.test(f));
  const images = files.filter((f) => /\.(png|jpe?g|webp|bmp|gif)$/i.test(f));
  let theme = {};
  for (const j of jsons) {
    const t = readJson(j, null);
    if (!t) throw new Error('JSON مو صالح: ' + j);
    if (t.colors) theme = Object.assign(theme, t);
    else if (t.bg && (t.acc || t.accent)) theme.colors = fromEngineTheme({ bg: t.bg, ink: t.ink, acc: t.acc || t.accent, clay: t.clay });
  }
  if (images.length && !theme.colors) {
    const work = fs.mkdtempSync(path.join(os.tmpdir(), 'io-id-'));
    const r = spawnSync('python3', [THEME_REFS, work, ...images, '--force', ...(o.dark ? ['--dark'] : o.light ? ['--light'] : [])], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error('ما گدرت أطلّع الألوان من الصور:\n' + (r.stderr || r.stdout).slice(-600));
    const e = readJson(path.join(work, 'theme.json'), null);
    const c = fromEngineTheme(e);
    theme.colors = Object.assign({}, c, { soft: mix(c.bg, c.accent, 0.14) });
    const sheet = path.join(work, 'refs_palette.jpg');
    if (fs.existsSync(sheet)) { init(dir); fs.copyFileSync(sheet, path.join(dataDir(dir), 'refs_palette.jpg')); }
  }
  const logo = images.find((f) => /logo|شعار/i.test(path.basename(f))) || (images.length === 1 ? images[0] : null);
  if (logo) {
    init(dir);
    const dst = path.join(dataDir(dir), 'logo' + path.extname(logo).toLowerCase());
    fs.copyFileSync(logo, dst);
    theme.logo = path.relative(dir, dst);
  }
  if (!theme.colors) throw new Error('ما لگيت ألوان — ارفع صور (شعار أو بوستات) أو theme.json');
  const tp = writeTheme(dir, theme);
  return { theme: readJson(tp), path: tp, logo: theme.logo || null };
}

function previewHtml(themes, fontsDir) {
  const faces = Object.entries(FONTS).map(([n, f]) => `@font-face{font-family:"${n}";src:url("${'file://' + path.join(fontsDir, f.file)}")}`).join('');
  const card = (t, i) => {
    const c = t.colors, h = t.fonts.heading, b = t.fonts.body;
    return `<section class="opt" style="background:${c.bg};color:${c.ink};font-family:'${b}',Tajawal,sans-serif">
      ${themes.length > 1 ? `<div class="n" style="background:${c.accent};color:${c.bg}">${i + 1}</div>` : ''}
      <div class="sw">${['bg', 'ink', 'accent', 'accent2', 'soft'].map((k) => `<span style="background:${c[k]}"></span>`).join('')}</div>
      <h1 style="font-family:'${h}',Tajawal,sans-serif">3 أخطاء <b style="color:${c.accent}">تقتل</b> الريل</h1>
      <p>شريحة كاروسيل تجريبية بهالهوية — العنوان بخط ${h}.</p>
      <div class="pill" style="background:${c.accent};color:${contrast(c.accent, '#FFFFFF') >= contrast(c.accent, '#111111') ? '#FFFFFF' : '#111111'}">احفظها 🔖</div>
      <div class="cap" style="background:${c.soft}">كابشن <b style="color:${c.accent2}">بكلمة ملوّنة</b></div>
      <small>${t.mood ? (MOODS[t.mood] ? MOODS[t.mood].ar : '') + ' · ' : ''}${t.feel || ''}</small>
    </section>`;
  };
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>${faces}
  body{margin:0;display:flex;gap:24px;padding:24px;background:#ddd;font-family:Tajawal,sans-serif}
  .opt{width:420px;height:560px;border-radius:24px;padding:36px;box-sizing:border-box;position:relative;display:flex;flex-direction:column;gap:18px;box-shadow:0 8px 30px rgba(0,0,0,.15)}
  .n{position:absolute;top:18px;left:18px;width:48px;height:48px;border-radius:50%;display:grid;place-items:center;font:800 26px Tajawal,sans-serif}
  .sw{display:flex;gap:8px}.sw span{width:44px;height:44px;border-radius:12px;border:2px solid rgba(127,127,127,.3)}
  h1{font-size:52px;line-height:1.15;margin:8px 0 0}p{font-size:20px;line-height:1.6;margin:0;opacity:.85}
  .pill{align-self:flex-start;padding:12px 26px;border-radius:999px;font-weight:800;font-size:22px}
  .cap{padding:12px 18px;border-radius:14px;font-size:22px;font-weight:700;align-self:flex-start}
  small{margin-top:auto;font-size:16px;opacity:.7}</style></head><body>${themes.map(card).join('')}</body></html>`;
}

async function renderPreview(themes, out) {
  const { launch } = require('./browser.js');
  const html = path.join(os.tmpdir(), `io-identity-${process.pid}.html`);
  fs.writeFileSync(html, previewHtml(themes, FONTS_DIR));
  const b = await launch();
  try {
    const p = await b.newPage({ viewport: { width: 24 + themes.length * 444, height: 608 } });
    await p.goto('file://' + html);
    await p.evaluate(async () => { try { await document.fonts.ready; } catch (e) { /* ignore */ } });
    await p.screenshot({ path: out });
  } finally { await b.close(); }
  return out;
}

async function main() {
  const o = args(process.argv.slice(2));
  const dir = path.resolve(o.dir || '.');
  const cmd = o._[0];
  if (cmd === 'moods') {
    for (const [k, m] of Object.entries(MOODS)) console.log(`${k}\t${m.ar}`);
  } else if (cmd === 'upload') {
    const r = cmdUpload(o, dir);
    console.log(`✓ ${path.relative(dir, r.path)} — ${JSON.stringify(r.theme.colors)}${r.logo ? `\n✓ الشعار: ${r.logo}` : ''}`);
    if (fs.existsSync(path.join(dataDir(dir), 'refs_palette.jpg'))) console.log('✓ ورقة الألوان: .io/refs_palette.jpg');
    if (!o['no-preview']) console.log('✓ المعاينة: ' + path.relative(dir, await renderPreview([r.theme], path.join(dataDir(dir), 'identity-preview.png'))));
  } else if (cmd === 'create') {
    const opts = createOptions(o.mood || 'warm', o.accent, !!o.dark);
    init(dir);
    fs.writeFileSync(path.join(dataDir(dir), 'identity-options.json'), JSON.stringify(opts, null, 2));
    opts.forEach((t) => console.log(`${t.option}) ${t.fonts.heading} · ${Object.values(t.colors).join(' ')} · ${t.feel}`));
    if (!o['no-preview']) console.log('✓ المعاينة: ' + path.relative(dir, await renderPreview(opts, path.join(dataDir(dir), 'identity-options.png'))));
    console.log('اختار: node engine/identity.js pick <1|2|3>');
  } else if (cmd === 'pick') {
    const opts = readJson(path.join(dataDir(dir), 'identity-options.json'), null);
    if (!opts) throw new Error('ما بيه خيارات — شغّل create أول');
    const t = opts[(+o._[1] || 0) - 1];
    if (!t) throw new Error(`اختار رقم من 1 إلى ${opts.length}`);
    console.log('✓ ' + path.relative(dir, writeTheme(dir, t)));
  } else if (cmd === 'preview') {
    const themes = o.options ? readJson(path.join(dataDir(dir), 'identity-options.json'), []) : [readJson(path.join(dataDir(dir), 'theme.json'), null)].filter(Boolean);
    if (!themes.length) throw new Error('ما بيه هوية بعد');
    console.log('✓ ' + await renderPreview(themes, path.join(dataDir(dir), o.options ? 'identity-options.png' : 'identity-preview.png')));
  } else {
    console.log('الأوامر: upload <ملفات> | moods | create [--mood] [--accent] [--dark] | pick <n> | preview [--options]   [--dir مجلد]');
    process.exitCode = cmd ? 1 : 0;
  }
}

if (require.main === module) main().catch((e) => { console.error('خطأ: ' + e.message); process.exit(1); });
module.exports = { MOODS, FONTS, createOptions, toTheme, readable, fromEngineTheme, previewHtml, cmdUpload };
