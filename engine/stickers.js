#!/usr/bin/env node
/*
 * I/O Studio — stickers: animated emoji/icons (Lottie) and still emoji (SVG) → transparent PNG frames.
 *
 * The files and their provenance come from Reel Studio (MIT, © 2026 Mohamed Abdou): engine/public/stickers +
 * third-party/emoji, third-party/icons (Google Noto Animated Emoji CC BY 4.0, Microsoft Fluent Emoji MIT,
 * useAnimations MIT, Meteocons MIT). Reel Studio plays them with @remotion/lottie; I/O Studio has no Remotion, so this tool
 * renders them once in headless Chromium (Playwright, engine/browser.js) with lottie-web 5.12.2 (MIT), downloaded
 * from cdnjs and pinned to its SHA-256, and our canvas engine draws the PNG frames (library/stickers/sticker.js).
 *
 *   node engine/stickers.js list [--kind lottie|svg]
 *   node engine/stickers.js render <id> --out <work>/stk/<id> [--size 360] [--fps 30] [--loops 1] [--mov]
 *        → <out>/0001.png … + <out>/sticker.json ({fps, frames, size}); --mov also writes <out>.mov (ProRes 4444, alpha) for CapCut
 *        and copies library/stickers/sticker.js next to the stk/ folder for compose.html.
 * Credits live in library/stickers/catalog.json, licenses/ and third_party/NOTICE.md — never on the video.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const DIR = path.join(__dirname, '..', 'library', 'stickers');
const LOTTIE = { version: '5.12.2', url: 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js', sha256: 'a0757321f974527bda3cc2593bf56cc7ffe4578421249ced6ae49ffb1c529f90' };

function catalog() { return JSON.parse(fs.readFileSync(path.join(DIR, 'catalog.json'), 'utf8')); }

function find(id) {
  const s = catalog().stickers.find((x) => x.id === id || x.id === `emoji-${id}` || x.id === `icon-${id}`);
  if (!s) throw new Error(`ملصق مو موجود: ${id} — شوف: node engine/stickers.js list`);
  return s;
}

/** Lottie JSON sanity: what lottie-web needs to play it (version, size, frame range, layers). */
function checkLottie(json, label = 'lottie') {
  const ok = json && typeof json === 'object' && typeof json.v === 'string' && json.w > 0 && json.h > 0 && json.fr > 0 && Number.isFinite(json.ip) && json.op > json.ip && Array.isArray(json.layers) && json.layers.length > 0;
  if (!ok) throw new Error(`${label}: مو ملف Lottie صالح`);
  return { width: json.w, height: json.h, fps: json.fr, frames: Math.round(json.op - json.ip), seconds: (json.op - json.ip) / json.fr };
}

/** Output-frame index → file frame (the file plays at its own speed whatever the video fps). */
function fileFrame(k, fileFps, videoFps, total, loop) {
  const f = (k * fileFps) / videoFps;
  return loop ? f % total : Math.min(f, total - 1);
}

function cacheDir() { const d = path.join(os.homedir(), '.cache', 'io'); fs.mkdirSync(d, { recursive: true }); return d; }

async function lottieSource() {
  const file = path.join(cacheDir(), `lottie-${LOTTIE.version}.min.js`);
  const good = (buf) => crypto.createHash('sha256').update(buf).digest('hex') === LOTTIE.sha256;
  if (fs.existsSync(file) && good(fs.readFileSync(file))) return fs.readFileSync(file, 'utf8');
  let buf = null;
  try { const r = await fetch(LOTTIE.url); if (r.ok) buf = Buffer.from(await r.arrayBuffer()); } catch (e) { buf = null; }
  if (!buf) { const r = spawnSync('curl', ['-sSL', LOTTIE.url], { maxBuffer: 1 << 24 }); if (r.status === 0) buf = r.stdout; }
  if (!buf) throw new Error('ما گدرت أنزّل lottie-web — يحتاج إنترنت أول مرة بس');
  if (!good(buf)) throw new Error('lottie-web المنزّل بصمته غير المثبّتة — ما أستخدمه');
  fs.writeFileSync(file, buf);
  return buf.toString('utf8');
}

async function render(id, o) {
  const s = find(id);
  const size = Math.max(32, Math.min(1080, parseInt(o.size, 10) || 360));
  const fps = Math.max(1, Math.min(60, parseFloat(o.fps) || 30));
  const loops = Math.max(1, parseInt(o.loops, 10) || 1);
  const out = path.resolve(o.out || `stk/${s.id}`);
  fs.mkdirSync(out, { recursive: true });
  for (const f of fs.readdirSync(out)) if (/^\d{4}\.png$/.test(f)) fs.unlinkSync(path.join(out, f));
  const { launch } = require('./browser.js');
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    let frames = 1, meta = {};
    if (s.kind === 'svg') {
      const svg = fs.readFileSync(path.join(DIR, s.file)).toString('base64');
      await page.setContent(`<html><body style="margin:0;background:transparent"><img id="s" src="data:image/svg+xml;base64,${svg}" style="width:${size}px;height:${size}px;object-fit:contain;display:block"></body></html>`);
      await page.waitForFunction(() => document.getElementById('s').complete);
      await page.screenshot({ path: path.join(out, '0001.png'), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
    } else {
      const json = JSON.parse(fs.readFileSync(path.join(DIR, s.file), 'utf8'));
      meta = checkLottie(json, s.id);
      await page.setContent(`<html><body style="margin:0;background:transparent"><div id="a" style="width:${size}px;height:${size}px"></div></body></html>`);
      await page.addScriptTag({ content: await lottieSource() });
      await page.evaluate((data) => {
        window.__anim = window.lottie.loadAnimation({ container: document.getElementById('a'), renderer: 'svg', loop: false, autoplay: false, animationData: data, rendererSettings: { preserveAspectRatio: 'xMidYMid meet' } });
      }, json);
      await page.waitForFunction(() => window.__anim && window.__anim.isLoaded);
      const total = meta.frames;
      frames = Math.max(1, Math.round((meta.seconds * fps) * loops));
      for (let k = 0; k < frames; k++) {
        const ff = fileFrame(k, meta.fps, fps, total, loops > 1);
        await page.evaluate((f) => window.__anim.goToAndStop(f, true), ff);
        await page.screenshot({ path: path.join(out, `${String(k + 1).padStart(4, '0')}.png`), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
      }
    }
    const info = { id: s.id, kind: s.kind, fps, frames, size, loops, seconds: +(frames / fps).toFixed(3), source: catalog().sources[s.source].name, license: catalog().sources[s.source].license };
    fs.writeFileSync(path.join(out, 'sticker.json'), JSON.stringify(info, null, 2));
    // the canvas helper next to the stk/ folder (compose.html: <script src="sticker.js"></script>)
    const helperDst = path.join(path.dirname(path.dirname(out)), 'sticker.js');
    if (path.basename(path.dirname(out)) === 'stk' && !fs.existsSync(helperDst)) fs.copyFileSync(path.join(DIR, 'sticker.js'), helperDst);
    if (o.mov && frames > 1) {
      const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(fps), '-i', path.join(out, '%04d.png'), '-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le', `${out}.mov`]);
      if (r.status !== 0) throw new Error('ffmpeg ما گدر يطلّع mov: ' + String(r.stderr).slice(-300));
      info.mov = `${out}.mov`;
    }
    return { out, ...info };
  } finally { await browser.close(); }
}

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; o[k] = v; } else o._.push(a);
  }
  return o;
}

async function main() {
  const o = args(process.argv.slice(2));
  const cmd = o._[0];
  if (cmd === 'list') {
    for (const s of catalog().stickers) if (!o.kind || s.kind === o.kind) console.log(`${s.id.padEnd(30)} ${s.kind === 'lottie' ? 'متحرك' : 'ثابت '}  ${s.ar}`);
    return;
  }
  if (cmd === 'render' && o._[1]) { console.log(JSON.stringify(await render(o._[1], o), null, 2)); return; }
  console.error('الاستخدام: node engine/stickers.js list | render <id> --out <work>/stk/<id> [--size 360] [--fps 30] [--loops 1] [--mov]');
  process.exitCode = 2;
}

module.exports = { catalog, find, checkLottie, fileFrame, LOTTIE, DIR };
if (require.main === module) main().catch((e) => { console.error('❌ ' + e.message); process.exitCode = 1; });
