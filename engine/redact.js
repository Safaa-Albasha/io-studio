#!/usr/bin/env node
/*
 * I/O Studio — privacy blur for screen recordings (تمويه البيانات الخاصة).
 *
 * Adapted from Reel Studio (MIT, © 2026 Mohamed Abdou): scripts/lib/redact.mjs + scripts/redact.mjs.
 * Same contract: the creator confirms every region first; a region is pixelized or blurred inside its time window
 * (optionally following keyframes), and each region is verified on the output: the detail inside must be destroyed.
 * Changes: CommonJS, no project-path sandbox (works on any work folder), Arabic messages, a `stills` helper that pulls
 * one still every N seconds (+ drawbox preview of proposed regions) so Claude can propose regions to the creator.
 *
 *   node engine/redact.js stills <video> [--every 2] [--out <dir>] [--rects rects.json]
 *        stills for proposing regions; with --rects draws each region (red box + label) on the still of its window
 *   node engine/redact.js apply  <video> --rects rects.json [--out <video>.redacted.mp4]
 *        writes the redacted copy (the original is never touched) + <out>.redaction.json with a verdict per region
 *
 * rects.json: {"version":1,"rects":[{"x":40,"y":210,"width":620,"height":64,"fromSec":3.2,"toSec":9.8,"mode":"pixelize","label":"الإيميل",
 *              "keys":[{"t":6.0,"x":40,"y":260}]}]}   (pixels of the source frame; keys optional — the box moves linearly)
 * A blur hides pixels, not speech or captions: something private said aloud is a cut question (10_script_edit / 50_smart_cuts).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const MODES = ['pixelize', 'blur'];
const MAX_RECTS = 32;
const MAX_KEYS = 240;
const MIN_SIDE = 8;
const REDACTED_MAX_RATIO = 0.35;
const FLAT_GRADIENT = 2;
const RECT_FIELDS = new Set(['x', 'y', 'width', 'height', 'fromSec', 'toSec', 'mode', 'keys', 'label']);
const floor2 = (v) => 2 * Math.floor(v / 2);
const ceil2 = (v) => 2 * Math.ceil(v / 2);
const round6 = (v) => { const r = Number(v.toFixed(6)); return Object.is(r, -0) ? 0 : r; };
const num = (v) => { const r = round6(v); return r < 0 ? `(${r})` : String(r); };

function finite(v, label) {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`${label} لازم رقم`);
  return v;
}

function validateVideo(video) {
  const { width, height, fps } = video || {};
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 16 || height < 16 || width % 2 || height % 2) throw new Error(`مقاس الفيديو لازم زوجي و≥16 (${width}x${height})`);
  if (typeof fps !== 'number' || !(fps > 0) || fps > 240) throw new Error(`fps غلط: ${fps}`);
  return { width, height, fps };
}

function normalizeRect(rect, index, video) {
  const at = `rects[${index}]`;
  if (!rect || typeof rect !== 'object' || Array.isArray(rect)) throw new Error(`${at} لازم object`);
  for (const k of Object.keys(rect)) if (!RECT_FIELDS.has(k)) throw new Error(`${at}: حقل مو معروف «${k}»`);
  const x = round6(finite(rect.x, `${at}.x`)), y = round6(finite(rect.y, `${at}.y`));
  const width = finite(rect.width, `${at}.width`), height = finite(rect.height, `${at}.height`);
  if (width <= 0 || height <= 0) throw new Error(`${at}: العرض والارتفاع لازم موجبين`);
  const fromSec = round6(finite(rect.fromSec, `${at}.fromSec`)), toSec = round6(finite(rect.toSec, `${at}.toSec`));
  if (fromSec < 0 || toSec <= fromSec) throw new Error(`${at}: لازم 0 ≤ fromSec < toSec`);
  if (!MODES.includes(rect.mode)) throw new Error(`${at}.mode = ${MODES.join(' أو ')}`);
  if (rect.label !== undefined && (typeof rect.label !== 'string' || !rect.label.trim() || rect.label.length > 80)) throw new Error(`${at}.label نص قصير`);
  const track = [{ t: fromSec, x, y }];
  if (rect.keys !== undefined) {
    if (!Array.isArray(rect.keys) || rect.keys.length < 1 || rect.keys.length > MAX_KEYS) throw new Error(`${at}.keys من 1 إلى ${MAX_KEYS}`);
    rect.keys.forEach((k, j) => {
      const p = { t: round6(finite(k && k.t, `${at}.keys[${j}].t`)), x: round6(finite(k.x, `${at}.keys[${j}].x`)), y: round6(finite(k.y, `${at}.keys[${j}].y`)) };
      if (p.t <= track[track.length - 1].t || p.t > toSec) throw new Error(`${at}.keys[${j}].t لازم يزيد وما يتعدى toSec`);
      track.push(p);
    });
  }
  let size, fixed = null;
  if (track.length === 1) {
    const x0 = Math.max(0, floor2(x)), y0 = Math.max(0, floor2(y));
    size = { width: Math.min(video.width, ceil2(x + width)) - x0, height: Math.min(video.height, ceil2(y + height)) - y0 };
    fixed = { x: x0, y: y0 };
  } else {
    if (!track.some((p) => p.x < video.width && p.x + width > 0 && p.y < video.height && p.y + height > 0)) throw new Error(`${at} ما يلمس الكادر أبداً`);
    size = { width: Math.min(video.width, ceil2(width) + 2), height: Math.min(video.height, ceil2(height) + 2) };
  }
  if (size.width < MIN_SIDE || size.height < MIN_SIDE) throw new Error(`${at} أصغر من ${MIN_SIDE}×${MIN_SIDE} داخل الكادر`);
  const pad = 0.5 / video.fps;
  return { index, mode: rect.mode, label: rect.label || null, fromSec, toSec, window: { from: round6(Math.max(0, fromSec - pad)), to: round6(toSec + pad) },
    size, fixed, track, limit: { x: video.width - size.width, y: video.height - size.height } };
}

function validateRects(rects, video) {
  const v = validateVideo(video);
  if (!Array.isArray(rects) || rects.length < 1 || rects.length > MAX_RECTS) throw new Error(`rects من 1 إلى ${MAX_RECTS}`);
  return rects.map((r, i) => normalizeRect(r, i, v));
}

function trackPoint(track, t) {
  for (let i = 0; i < track.length - 1; i++) {
    const a = track[i], b = track[i + 1];
    if (t < b.t) { const tt = i === 0 ? Math.max(t, a.t) : t; return { x: a.x + (b.x - a.x) * (tt - a.t) / (b.t - a.t), y: a.y + (b.y - a.y) * (tt - a.t) / (b.t - a.t) }; }
  }
  const last = track[track.length - 1];
  return { x: last.x, y: last.y };
}

function rectAt(rect, t) {
  const { width, height } = rect.size;
  if (rect.fixed) return { x: rect.fixed.x, y: rect.fixed.y, width, height };
  const p = trackPoint(rect.track, t);
  return { x: Math.max(0, Math.min(rect.limit.x, floor2(p.x))), y: Math.max(0, Math.min(rect.limit.y, floor2(p.y))), width, height };
}

function axisExpr(rect, axis) {
  const p = rect.track;
  let inner = num(p[p.length - 1][axis]);
  for (let i = p.length - 2; i >= 0; i--) {
    const a = p[i], b = p[i + 1];
    const tv = i === 0 ? `max(t,${num(a.t)})` : 't';
    inner = `if(lt(t,${num(b.t)}),${num(a[axis])}+(${num(b[axis])}-${num(a[axis])})*(${tv}-${num(a.t)})/(${num(b.t)}-${num(a.t)}),${inner})`;
  }
  return `max(0,min(${rect.limit[axis]},2*floor((${inner})/2)))`;
}

function effectFilter(rect) {
  const side = Math.min(rect.size.width, rect.size.height);
  if (rect.mode === 'pixelize') { const block = Math.min(48, Math.max(8, 2 * Math.floor(side / 4))); return `pixelize=width=${block}:height=${block}:mode=avg`; }
  const luma = Math.min(32, Math.floor(side / 2) - 1), chroma = Math.max(1, Math.min(16, Math.floor(side / 4) - 1));
  return `boxblur=luma_radius=${luma}:luma_power=3:chroma_radius=${chroma}:chroma_power=3`;
}

/** One filter_complex graph: crop each region, pixelize/blur it, overlay it back inside its window. Output label [vout]. */
function buildFilter(rects, video) {
  const list = validateRects(rects, video);
  const parts = [`[0:v]split=${list.length + 1}[rb]${list.map((_, i) => `[rs${i}]`).join('')}`];
  list.forEach((r, i) => {
    const x = r.fixed ? String(r.fixed.x) : `'${axisExpr(r, 'x')}'`;
    const y = r.fixed ? String(r.fixed.y) : `'${axisExpr(r, 'y')}'`;
    parts.push(`[rs${i}]crop=w=${r.size.width}:h=${r.size.height}:x=${x}:y=${y},${effectFilter(r)}[rp${i}]`);
    const main = i === 0 ? '[rb]' : `[ro${i - 1}]`;
    const out = i === list.length - 1 ? '[vout]' : `[ro${i}]`;
    parts.push(`${main}[rp${i}]overlay=x=${x}:y=${y}:format=auto:enable='between(t,${num(r.window.from)},${num(r.window.to)})'${out}`);
  });
  return parts.join(';');
}

function verificationPoint(rect, fps) {
  const frame = Math.round(((rect.fromSec + rect.toSec) / 2) * fps);
  const box = rectAt(rect, frame / fps);
  return { frame, t: round6(frame / fps), seekSec: round6(Math.max(0, (frame - 0.5) / fps)), box: { x: box.x + 2, y: box.y + 2, width: box.width - 4, height: box.height - 4 } };
}

function meanAbsGradient(pixels, width, height) {
  if (width < 2 || height < 2) throw new Error('المنطقة أصغر من 2×2');
  let sum = 0, count = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const p = pixels[y * width + x];
    if (x + 1 < width) { sum += Math.abs(pixels[y * width + x + 1] - p); count++; }
    if (y + 1 < height) { sum += Math.abs(pixels[(y + 1) * width + x] - p); count++; }
  }
  return sum / count;
}

function verdict(sourceGradient, outputGradient) {
  if (sourceGradient < FLAT_GRADIENT) return { verdict: 'NEEDS-REVIEW', ratio: null, reason: 'المنطقة سادة بالفريم المفحوص — افتح صورة التحقق بعينك' };
  const ratio = round6(outputGradient / sourceGradient);
  return ratio <= REDACTED_MAX_RATIO ? { verdict: 'REDACTED', ratio, reason: 'التفاصيل داخل المنطقة انمسحت' } : { verdict: 'NOT-REDACTED', ratio, reason: 'لسه فيه تفاصيل تنقرا داخل المنطقة' };
}

function parseRectsDocument(doc) {
  if (!doc || typeof doc !== 'object' || doc.version !== 1 || !Array.isArray(doc.rects)) throw new Error('rects.json لازم {"version":1,"rects":[…]}');
  return doc.rects;
}

// ---- media ----------------------------------------------------------------------------------------------------

function run(cmd, a, opts = {}) {
  const r = spawnSync(cmd, a, { encoding: opts.buffer ? 'buffer' : 'utf8', maxBuffer: 1 << 28 });
  if (r.error) throw new Error(`${cmd} مو منصّب: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`${cmd} فشل:\n${String(r.stderr || '').split('\n').slice(-8).join('\n')}`);
  return r;
}

function probeVideo(file) {
  const j = JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,avg_frame_rate,r_frame_rate:format=duration', '-of', 'json', file]).stdout);
  const s = j.streams[0];
  let fps = 30;
  for (const v of [s.avg_frame_rate, s.r_frame_rate]) { const [n, d] = String(v || '').split('/').map(Number); if (n > 0 && d > 0) { fps = n / d; break; } }
  return { width: s.width, height: s.height, fps, duration: parseFloat(j.format.duration) || 0 };
}

function regionGradient(file, seekSec, box) {
  const r = run('ffmpeg', ['-hide_banner', '-v', 'error', '-nostdin', '-ss', String(seekSec), '-i', file, '-frames:v', '1', '-vf', `crop=${box.width}:${box.height}:${box.x}:${box.y},format=gray`, '-f', 'rawvideo', '-'], { buffer: true });
  return meanAbsGradient(r.stdout.subarray(0, box.width * box.height), box.width, box.height);
}

function cmdApply(input, o) {
  const rectsFile = o.rects;
  if (!rectsFile) throw new Error('حدّد --rects rects.json');
  const out = o.out || input.replace(/\.[^.]+$/, '') + '.redacted.mp4';
  if (path.resolve(out) === path.resolve(input)) throw new Error('الناتج لازم ملف جديد — الأصل ما يتغيّر');
  const video = probeVideo(input);
  const rects = parseRectsDocument(JSON.parse(fs.readFileSync(rectsFile, 'utf8')));
  const list = validateRects(rects, video);
  const filter = buildFilter(rects, video);
  run('ffmpeg', ['-hide_banner', '-v', 'error', '-y', '-i', input, '-filter_complex', filter, '-map', '[vout]', '-map', '0:a?', '-c:v', 'libx264', '-preset', 'medium', '-crf', '12', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', out]);
  const checks = list.map((r) => {
    const p = verificationPoint(r, video.fps);
    const src = regionGradient(input, p.seekSec, p.box), dst = regionGradient(out, p.seekSec, p.box);
    const png = `${out}.check-${r.index + 1}.png`;
    run('ffmpeg', ['-hide_banner', '-v', 'error', '-y', '-ss', String(p.seekSec), '-i', out, '-frames:v', '1', '-vf', `drawbox=x=${p.box.x - 2}:y=${p.box.y - 2}:w=${p.box.width + 4}:h=${p.box.height + 4}:color=red@0.9:t=3`, png]);
    return { index: r.index + 1, label: r.label, mode: r.mode, fromSec: r.fromSec, toSec: r.toSec, checkedAt: p.t, sourceGradient: round6(src), outputGradient: round6(dst), ...verdict(src, dst), png };
  });
  const status = checks.some((c) => c.verdict === 'NOT-REDACTED') ? 'NOT-REDACTED' : checks.some((c) => c.verdict === 'NEEDS-REVIEW') ? 'NEEDS-REVIEW' : 'REDACTED';
  const sidecar = { version: 1, tool: 'io engine/redact.js (adapted from Reel Studio, MIT)', source: path.resolve(input), output: path.resolve(out), video, status, rects, checks };
  fs.writeFileSync(`${out}.redaction.json`, JSON.stringify(sidecar, null, 2));
  return sidecar;
}

function cmdStills(input, o) {
  const every = Math.max(0.5, parseFloat(o.every) || 2);
  const out = o.out || input.replace(/\.[^.]+$/, '') + '-privacy';
  fs.mkdirSync(out, { recursive: true });
  const video = probeVideo(input);
  const rects = o.rects ? validateRects(parseRectsDocument(JSON.parse(fs.readFileSync(o.rects, 'utf8'))), video) : [];
  const made = [];
  for (let t = 0; t < video.duration; t += every) {
    const live = rects.filter((r) => t >= r.fromSec && t <= r.toSec);
    const boxes = live.map((r) => { const b = rectAt(r, t); return `drawbox=x=${b.x}:y=${b.y}:w=${b.width}:h=${b.height}:color=red@0.85:t=4`; });
    const name = path.join(out, `t${t.toFixed(1).padStart(6, '0')}.jpg`);
    const chain = [...boxes, 'scale=540:-2'].join(',');
    run('ffmpeg', ['-hide_banner', '-v', 'error', '-y', '-ss', String(t), '-i', input, '-frames:v', '1', '-vf', chain, '-q:v', '4', name]);
    made.push(name);
  }
  return { dir: out, every, stills: made.length, regionsDrawn: rects.length };
}

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; o[k] = v; } else o._.push(a);
  }
  return o;
}

function main() {
  const o = args(process.argv.slice(2));
  const [cmd, input] = o._;
  try {
    if (!input || !fs.existsSync(input)) throw new Error('الاستخدام: node engine/redact.js stills|apply <video> [--rects rects.json] [--out …] [--every 2]');
    if (cmd === 'stills') { console.log(JSON.stringify(cmdStills(input, o), null, 2)); return; }
    if (cmd === 'apply') {
      const r = cmdApply(input, o);
      for (const c of r.checks) console.log(`${c.verdict === 'REDACTED' ? '✅' : c.verdict === 'NEEDS-REVIEW' ? '👀' : '⛔'} منطقة ${c.index}${c.label ? ` «${c.label}»` : ''} ${c.fromSec}–${c.toSec} ث: ${c.reason} (نسبة ${c.ratio}) → ${c.png}`);
      console.log(`${r.status === 'REDACTED' ? '✅' : '⚠️'} ${r.output}\n   السجل: ${r.output}.redaction.json — امسح الفيديو بعينك عبر كل نافذة، وابنِ المونتاج من النسخة الممموّهة مو من الأصل.`);
      if (r.status === 'NOT-REDACTED') process.exitCode = 3;
      return;
    }
    throw new Error('الأوامر: stills · apply');
  } catch (e) { console.error('❌ ' + e.message); process.exitCode = 1; }
}

module.exports = { MODES, validateRects, buildFilter, rectAt, verificationPoint, meanAbsGradient, verdict, parseRectsDocument, REDACTED_MAX_RATIO };
if (require.main === module) main();
