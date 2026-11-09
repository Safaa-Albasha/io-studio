#!/usr/bin/env node
/*
 * I/O Studio — video tools (ffmpeg). One talking video → posts for all three
 * platforms.
 *
 *   node engine/video.js probe   in.mp4
 *   node engine/video.js fix     rec.webm|rec.mp4 [--out x.mp4]       # studio recording → clean MP4
 *   node engine/video.js plan    in.mp4 [--noise -32] [--min 0.45]    # find silences → in.cut.json
 *   node engine/video.js cut     in.mp4 [--plan in.cut.json] [--out x.mp4]
 *   node engine/video.js captions in.mp4 [--words words.json] [--srt out.srt]  # needs whisper, or words.json
 *   node engine/video.js burn    in.mp4 --srt subs.srt [--theme theme.json] [--out x.mp4]
 *   node engine/video.js variants in.mp4 [--mode crop|blur] [--out-dir output/]  # 9:16 for IG/YT/TT + 16:9 for YouTube
 *   node engine/video.js cinematic in.mp4 [--look teal_orange_soft|none] [--strength 0.8] [--grain 6|0]
 *                          [--letterbox 2.39|off|force] [--out x.mp4] [--dry]   # long-form YouTube finish: LUT + grain + 2.39 bars, −14 LUFS
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const C = require('./cut-core.js');
const { PLATFORMS } = require('../web/lib/platforms.js');

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; o[k] = v; } else o._.push(a);
  }
  return o;
}

function run(cmd, a, quiet) {
  const r = spawnSync(cmd, a, { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.error) throw new Error(`${cmd} مو منصّب أو ما يشتغل: ${r.error.message}`);
  if (r.status !== 0 && !quiet) throw new Error(`${cmd} فشل:\n${(r.stderr || '').split('\n').slice(-12).join('\n')}`);
  return r;
}

function probe(file) {
  const r = run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', file]);
  const j = JSON.parse(r.stdout);
  const v = j.streams.find((s) => s.codec_type === 'video');
  const a = j.streams.find((s) => s.codec_type === 'audio');
  let w = v ? v.width : 0, h = v ? v.height : 0;
  const rot = v && ((v.side_data_list || []).find((d) => d.rotation !== undefined) || {}).rotation;
  if (Math.abs(rot) === 90) [w, h] = [h, w];
  return { duration: parseFloat(j.format.duration) || 0, width: w, height: h, hasAudio: !!a, fps: v ? fpsOf(v.r_frame_rate) : 30 };
}

function fpsOf(r) { const [n, d] = String(r || '30/1').split('/').map(Number); return d ? n / d : n; }

const base = (f) => f.replace(/\.[^.]+$/, '');
const ENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart'];
// Platforms normalise loudness to around −14 LUFS; deliver at that level.
const LOUD = 'loudnorm=I=-14:TP=-1.5:LRA=11';

function cmdFix(o) {
  const inp = o._[1];
  const out = o.out || base(inp) + '.fixed.mp4';
  const p = probe(inp);
  const a = ['-y', '-i', inp];
  if (p.hasAudio) a.push('-af', LOUD);
  run('ffmpeg', [...a, ...ENC, out]);
  console.log(`✓ ${out} (${p.width}×${p.height}، ${p.duration.toFixed(1)} ث)`);
}

function cmdPlan(o) {
  const inp = o._[1];
  const p = probe(inp);
  if (!p.hasAudio) throw new Error('الفيديو بدون صوت — ما أگدر أكشف السكتات');
  const noise = o.noise || -32, min = o.min || 0.45;
  const r = run('ffmpeg', ['-hide_banner', '-i', inp, '-af', `silencedetect=noise=${noise}dB:d=${min}`, '-f', 'null', '-'], true);
  const sil = C.parseSilences(r.stderr, p.duration);
  const keep = C.keepSegments(sil, p.duration, { pad: +(o.pad || 0.12) });
  const plan = { source: path.basename(inp), duration: p.duration, noise: +noise, minSilence: +min, keep, kept: C.totalOf(keep) };
  const out = o.out || base(inp) + '.cut.json';
  fs.writeFileSync(out, JSON.stringify(plan, null, 2));
  console.log(`✓ ${out}: ${sil.length} سكتة، يبقى ${plan.kept.toFixed(1)} من ${p.duration.toFixed(1)} ث (${keep.length} مقطع)`);
}

function cmdCut(o) {
  const inp = o._[1];
  const planFile = o.plan || base(inp) + '.cut.json';
  if (!fs.existsSync(planFile)) cmdPlan({ _: ['plan', inp], out: planFile });
  const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
  const p = probe(inp);
  const out = o.out || base(inp) + '.cut.mp4';
  const fc = C.concatFilter(plan.keep, p.hasAudio) + (p.hasAudio ? `;[a]${LOUD}[an]` : '');
  const maps = p.hasAudio ? ['-map', '[v]', '-map', '[an]'] : ['-map', '[v]'];
  const script = out + '.filter.txt';
  fs.writeFileSync(script, fc);
  try { run('ffmpeg', ['-y', '-i', inp, '-filter_complex_script', script, ...maps, ...ENC, out]); } finally { fs.rmSync(script, { force: true }); }
  console.log(`✓ ${out} — ${C.totalOf(plan.keep).toFixed(1)} ث`);
}

function cmdCaptions(o) {
  const inp = o._[1];
  const srt = o.srt || base(inp) + '.srt';
  let words;
  if (o.words) words = JSON.parse(fs.readFileSync(o.words, 'utf8'));
  else {
    // openai-whisper CLI with word timestamps
    const dir = path.dirname(path.resolve(srt));
    const model = o.model || 'small';
    run('whisper', [inp, '--language', 'Arabic', '--model', model, '--word_timestamps', 'True', '--output_format', 'json', '--output_dir', dir]);
    const j = JSON.parse(fs.readFileSync(path.join(dir, path.basename(base(inp)) + '.json'), 'utf8'));
    words = j.segments.flatMap((s) => (s.words || []).map((w) => ({ word: w.word, start: w.start, end: w.end })));
  }
  if (o.plan) {
    const plan = JSON.parse(fs.readFileSync(o.plan, 'utf8'));
    words = words.filter((w) => plan.keep.some((k) => w.start >= k.start - 0.05 && w.end <= k.end + 0.05)).map((w) => ({ word: w.word, start: C.mapTime(w.start, plan.keep), end: C.mapTime(w.end, plan.keep) }));
  }
  fs.writeFileSync(srt, C.wordsToSrt(words, { maxWords: +(o.maxWords || 4) }));
  console.log(`✓ ${srt} — راجع الكلمات قبل الحرق (الأسماء والمصطلحات)`);
}

function assColor(hex) { const h = hex.replace('#', ''); return `&H00${h.slice(4, 6)}${h.slice(2, 4)}${h.slice(0, 2)}`.toUpperCase(); }

function cmdBurn(o) {
  const inp = o._[1];
  if (!o.srt) throw new Error('--srt مطلوب');
  let theme = { colors: { ink: '#1E1B18', accent: '#E0663A' }, fonts: { heading: 'Tajawal' } };
  if (o.theme && fs.existsSync(o.theme)) theme = JSON.parse(fs.readFileSync(o.theme, 'utf8'));
  const p = probe(inp);
  const portrait = p.height > p.width;
  const font = (theme.fonts && theme.fonts.heading) || 'Tajawal';
  // Caption sits above the bottom UI band of all three platforms.
  const marginV = portrait ? Math.round((Math.max(...Object.values(PLATFORMS).map((x) => x.uiSafe.bottom)) + 40) * 288 / 1920) : 40;
  const style = `FontName=${font},FontSize=${portrait ? 15 : 22},Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=${assColor((theme.colors && theme.colors.ink) || '#000000')},BorderStyle=1,Outline=3,Shadow=0,Alignment=2,MarginV=${marginV}`;
  const out = o.out || base(inp) + '.captioned.mp4';
  const srtPath = path.resolve(o.srt).replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
  run('ffmpeg', ['-y', '-i', inp, '-vf', `subtitles='${srtPath}':force_style='${style}'`, ...ENC, out]);
  console.log(`✓ ${out}`);
}

function cmdVariants(o) {
  const inp = o._[1];
  const p = probe(inp);
  const dir = o['out-dir'] || path.dirname(inp);
  fs.mkdirSync(dir, { recursive: true });
  const name = path.basename(base(inp));
  const mode = o.mode || (p.height > p.width ? 'crop' : 'blur');
  const results = [];
  // One vertical master serves Reels, Shorts and TikTok (same 1080×1920 spec).
  const vert = path.join(dir, `${name}.vertical.mp4`);
  run('ffmpeg', ['-y', '-i', inp, '-filter_complex', `[0:v]${C.verticalFilter(p.width, p.height, mode)}[v]`, '-map', '[v]', ...(p.hasAudio ? ['-map', '0:a', '-af', LOUD] : []), ...ENC, vert]);
  results.push(vert);
  for (const id of ['instagram', 'youtube', 'tiktok']) {
    const lim = PLATFORMS[id].video.maxSec;
    const flag = p.duration > lim ? `⚠️ أطول من حد ${PLATFORMS[id].nameAr} (${lim} ث) — قصّه أو انشره كفيديو عادي` : '✓';
    console.log(`${flag} ${PLATFORMS[id].nameAr} ${PLATFORMS[id].video.label}: ${vert}`);
  }
  if (p.width > p.height || o.landscape) {
    const land = path.join(dir, `${name}.youtube-16x9.mp4`);
    run('ffmpeg', ['-y', '-i', inp, '-filter_complex', `[0:v]${C.landscapeFilter(p.width, p.height)}[v]`, '-map', '[v]', ...(p.hasAudio ? ['-map', '0:a', '-af', LOUD] : []), ...ENC, land]);
    results.push(land);
    console.log(`✓ يوتيوب فيديو طويل 16:9: ${land}`);
  }
  return results;
}

/** Looks that suit a long, talking 16:9 YouTube video (library/looks/catalog.json ids). */
const CINEMATIC_LOOKS = ['teal_orange_soft', 'documentary', 'cool_film', 'warm_film', 'skin_soft', 'natural_plus', 'warm_interior', 'teal_orange', 'bleach_bypass', 'moody_dark', 'tech_cool', 'golden_hour'];

/**
 * Builds the ffmpeg filtergraph + arguments for the cinematic finish (no ffmpeg needed).
 * o = { input, out, w, h, hasAudio, look (catalog look object | null), lutFile, strength, grain, letterbox }
 *   grain: noise amount (0 = off) · letterbox: ratio number, 'off', or 'force' (also on vertical video)
 * Returns { graph, args, steps } — run with cwd = the folder that holds lutFile.
 */
function cinematicPlan(o) {
  const G = require('./grade.js');
  const w = +o.w || 1920, h = +o.h || 1080;
  const parts = []; const steps = [];
  let cur = '0:v', n = 0;
  const next = () => 'c' + (++n);
  const push = (frag) => { const lab = next(); parts.push(frag(cur, lab)); cur = lab; };
  const cat = o.catalog || null;
  const look = o.look || null;
  const fx = (look && look.fx) || [];
  if (look && cat && G.isLutable(cat, look)) { push((a, b) => `[${a}]lut3d=file=${o.lutFile || 'look.cube'}:interp=tetrahedral[${b}]`); steps.push('lut:' + look.id); }
  for (const f of fx) {
    if (!G.FX[f.name]) throw new Error('مؤثر مجهول: ' + f.name);
    push((a, b) => G.FX[f.name](f, a, b, { w, h })); steps.push('fx:' + f.name);
  }
  const grain = o.grain === undefined || o.grain === null || o.grain === true ? 6 : Math.max(0, Math.min(40, +o.grain || 0));
  if (grain > 0 && !fx.some((f) => f.name === 'grain')) { push((a, b) => G.FX.grain({ amount: grain }, a, b)); steps.push('grain:' + grain); }
  const lb = o.letterbox === undefined || o.letterbox === null || o.letterbox === true ? 2.39 : o.letterbox;
  const lbOff = lb === 'off' || lb === false || lb === 'none' || lb === 0 || lb === '0';
  const ratio = lb === 'force' ? 2.39 : +lb || 2.39;
  const landscape = w > h;
  if (!lbOff && (landscape || lb === 'force') && w / h < ratio - 0.01 && !fx.some((f) => f.name === 'letterbox')) { push((a, b) => G.FX.letterbox({ ratio }, a, b)); steps.push('letterbox:' + ratio); }
  parts.push(`[${cur}]format=yuv420p[vout]`);
  const graph = parts.join(';');
  const args = ['-v', 'error', '-y', '-i', o.input, '-filter_complex_script', 'graph.txt', '-map', '[vout]'];
  if (o.hasAudio) args.push('-map', '0:a?', '-af', LOUD, '-c:a', 'aac', '-b:a', '192k', '-ar', '48000');
  args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', o.out);
  if (o.hasAudio) steps.push('loudnorm:-14');
  return { graph, args, steps };
}

function cmdCinematic(o) {
  const G = require('./grade.js');
  const os = require('os');
  const inp = path.resolve(o._[1]);
  const p = probe(inp);
  const cat = G.loadCatalog();
  const lookId = o.look && o.look !== true ? String(o.look) : 'teal_orange_soft';
  const look = lookId === 'none' ? null : G.getLook(cat, lookId);
  const out = path.resolve(o.out || base(inp) + '.cinematic.mp4');
  const strength = o.strength !== undefined ? Math.max(0, Math.min(1, +o.strength)) : 0.8;
  const plan = cinematicPlan({ input: inp, out, w: p.width, h: p.height, hasAudio: p.hasAudio, look, catalog: cat, lutFile: 'look.cube', strength, grain: o.grain, letterbox: o.letterbox });
  if (o.dry) { console.log(JSON.stringify({ graph: plan.graph, args: plan.args, steps: plan.steps }, null, 2)); return plan; }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'io-cine-'));
  try {
    if (look && G.isLutable(cat, look)) fs.writeFileSync(path.join(dir, 'look.cube'), G.cubeText(G.compile(G.colorOps(cat, look), strength), 33, look.id));
    fs.writeFileSync(path.join(dir, 'graph.txt'), plan.graph);
    const r = spawnSync('ffmpeg', plan.args, { cwd: dir, encoding: 'utf8', maxBuffer: 1 << 28 });
    if (r.error) throw new Error('ffmpeg مو منصّب: ' + r.error.message);
    if (r.status !== 0) throw new Error('ffmpeg فشل:\n' + String(r.stderr || '').split('\n').slice(-12).join('\n'));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  console.log(`✓ ${out} — ${plan.steps.join(' · ')}`);
  return plan;
}

function main() {
  const o = args(process.argv.slice(2));
  const cmd = o._[0];
  const map = { probe: () => console.log(JSON.stringify(probe(o._[1]), null, 2)), fix: cmdFix, plan: cmdPlan, cut: cmdCut, captions: cmdCaptions, burn: cmdBurn, variants: cmdVariants, cinematic: cmdCinematic };
  if (!map[cmd] || (!o._[1])) { console.log('الأوامر: probe | fix | plan | cut | captions | burn | variants | cinematic  <ملف>'); process.exitCode = cmd ? 1 : 0; return; }
  if (!fs.existsSync(o._[1])) throw new Error('الملف مو موجود: ' + o._[1]);
  map[cmd](o);
}

if (require.main === module) { try { main(); } catch (e) { console.error('خطأ: ' + e.message); process.exit(1); } }
module.exports = { probe, cinematicPlan, CINEMATIC_LOOKS, LOUD };
