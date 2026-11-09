#!/usr/bin/env node
/*
 * I/O Studio — code → MP4, frame-exact (Playwright + ffmpeg).
 *
 *   node engine/render.js scene  lesson/scene.json [--out lesson/scene.mp4] [--fps 30] [--handle @حسابك] [--theme theme.json] [--audio voice.m4a]
 *   node engine/render.js motion motion.html [--duration 8] [--size 1080x1920] [--fps 30] [--out motion.mp4] [--audio music.mp3]
 *   node engine/render.js still  motion.html --at 1.5 [--size 1080x1920] [--out poster.png]    # poster / cover frame
 *
 * Motion contract: the page defines window.__seek(t) that draws the frame at
 * time t (seconds) synchronously or returns a Promise; optional
 * window.__duration (seconds). No timers/requestAnimationFrame for timing.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { launch } = require('./browser.js');
const SS = require('../web/lib/scene-core.js');

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; o[k] = v; } else o._.push(a);
  }
  return o;
}

function ffmpegSink(out, fps, audio, duration) {
  const a = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-'];
  if (audio) a.push('-i', audio);
  a.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart');
  if (audio) a.push('-c:a', 'aac', '-b:a', '192k', '-t', String(duration));
  a.push(out);
  const ff = spawn('ffmpeg', a, { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => { ff.on('error', rej); ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg exit ' + c)))); });
  const write = (buf) => new Promise((res) => (ff.stdin.write(buf) ? res() : ff.stdin.once('drain', res)));
  return { write, end: async () => { ff.stdin.end(); await done; } };
}

function progress(i, n) {
  if (i % 15 === 0 || i === n - 1) process.stdout.write(`\r  ${Math.round(((i + 1) / n) * 100)}% (${i + 1}/${n})`);
  if (i === n - 1) process.stdout.write('\n');
}

async function renderScene(o) {
  const file = o._[1];
  const { scene, errors } = SS.normalizeScene(fs.readFileSync(file, 'utf8'));
  if (errors.length) throw new Error('scene.json:\n- ' + errors.join('\n- '));
  if (o.theme && fs.existsSync(o.theme)) {
    const t = JSON.parse(fs.readFileSync(o.theme, 'utf8'));
    const c = t.colors || {};
    for (const k of ['bg', 'ink', 'accent', 'accent2', 'soft']) if (c[k]) scene.theme[k] = c[k];
    if (t.fonts && t.fonts.heading) scene.theme.font = `${t.fonts.heading}, ${scene.theme.font}`;
    if (!o.handle && t.handle) o.handle = t.handle;
  }
  const fps = +(o.fps || 30);
  const dur = SS.totalDuration(scene);
  const [W, H] = SS.FORMATS[scene.format];
  const out = o.out || file.replace(/\.json$/, '') + '.mp4';
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
    const core = fs.readFileSync(path.join(__dirname, '../web/lib/scene-core.js'), 'utf8');
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@500;700;800&family=Tajawal:wght@500;700;800&display=swap"></head><body><canvas id="c" width="${W}" height="${H}"></canvas><script>${core}</script></body></html>`, { waitUntil: 'load' }).catch(() => {});
    await page.evaluate(async () => { try { await document.fonts.load("800 40px Cairo"); await document.fonts.ready; } catch (e) { /* offline: system font */ } });
    await page.evaluate(({ scene, handle }) => { window.__scene = scene; window.__tl = IoScene.timeline(scene); window.__handle = handle; }, { scene, handle: o.handle || '' });
    const n = Math.ceil(dur * fps);
    const sink = ffmpegSink(out, fps, o.audio, dur);
    console.log(`مشهد «${scene.title || path.basename(file)}» — ${dur.toFixed(1)} ث، ${W}×${H}`);
    for (let i = 0; i < n; i++) {
      const b64 = await page.evaluate((t) => {
        const c = document.getElementById('c');
        IoScene.drawScene(c.getContext('2d'), window.__scene, t, { timeline: window.__tl, handle: window.__handle });
        return c.toDataURL('image/png').slice(22);
      }, i / fps);
      await sink.write(Buffer.from(b64, 'base64'));
      progress(i, n);
    }
    await sink.end();
  } finally { await browser.close(); }
  console.log(`✓ ${out}`);
}

function parseSize(s, def) {
  const m = String(s || def).match(/^(\d+)x(\d+)$/);
  if (!m) throw new Error('--size مثل 1080x1920');
  return [+m[1], +m[2]];
}

async function openMotion(file, W, H) {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.resolve(file) + '?render=1', { waitUntil: 'networkidle' }).catch(() => page.goto('file://' + path.resolve(file) + '?render=1'));
  await page.evaluate(async () => { try { await document.fonts.ready; } catch (e) { /* ignore */ } });
  const ok = await page.evaluate(() => typeof window.__seek === 'function');
  if (!ok) { await browser.close(); throw new Error('الصفحة لازم تعرّف window.__seek(t) — شوف skills/io-motion/SKILL.md'); }
  return { browser, page };
}

async function renderMotion(o) {
  const file = o._[1];
  const [W, H] = parseSize(o.size, '1080x1920');
  const fps = +(o.fps || 30);
  const out = o.out || file.replace(/\.html?$/, '') + '.mp4';
  const { browser, page } = await openMotion(file, W, H);
  try {
    const dur = +(o.duration || (await page.evaluate(() => window.__duration)) || 6);
    const n = Math.ceil(dur * fps);
    const sink = ffmpegSink(out, fps, o.audio, dur);
    console.log(`موشن ${path.basename(file)} — ${dur} ث، ${W}×${H}، ${fps}fps`);
    for (let i = 0; i < n; i++) {
      await page.evaluate((t) => window.__seek(t), i / fps);
      await sink.write(await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: W, height: H } }));
      progress(i, n);
    }
    await sink.end();
  } finally { await browser.close(); }
  console.log(`✓ ${out}`);
}

async function renderStill(o) {
  const file = o._[1];
  const [W, H] = parseSize(o.size, '1080x1920');
  const out = o.out || file.replace(/\.html?$/, '') + '.png';
  const { browser, page } = await openMotion(file, W, H);
  try {
    await page.evaluate((t) => window.__seek(t), +(o.at || 0));
    await page.screenshot({ path: out, clip: { x: 0, y: 0, width: W, height: H } });
  } finally { await browser.close(); }
  console.log(`✓ ${out}`);
}

async function main() {
  const o = args(process.argv.slice(2));
  const cmd = o._[0];
  if (!o._[1] || !['scene', 'motion', 'still'].includes(cmd)) { console.log('الأوامر: scene <scene.json> | motion <file.html> | still <file.html> --at <ث>'); process.exitCode = cmd ? 1 : 0; return; }
  if (!fs.existsSync(o._[1])) throw new Error('الملف مو موجود: ' + o._[1]);
  if (cmd === 'scene') return renderScene(o);
  if (cmd === 'motion') return renderMotion(o);
  return renderStill(o);
}

main().catch((e) => { console.error('\nخطأ: ' + e.message); process.exit(1); });
