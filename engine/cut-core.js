/*
 * Pure helpers for silence cutting and platform variants (tested in Node).
 */
'use strict';

/** Parse `ffmpeg -af silencedetect` stderr into [{start, end}] (seconds). */
function parseSilences(stderr, duration) {
  const out = [];
  let start = null;
  for (const line of String(stderr).split('\n')) {
    let m = line.match(/silence_start:\s*(-?[\d.]+)/);
    if (m) { start = Math.max(0, parseFloat(m[1])); continue; }
    m = line.match(/silence_end:\s*([\d.]+)/);
    if (m && start !== null) { out.push({ start, end: parseFloat(m[1]) }); start = null; }
  }
  if (start !== null && duration) out.push({ start, end: duration });
  return out;
}

/**
 * Turn silences into the parts to keep. Each kept part gets `pad` seconds of
 * breathing room on both sides; parts closer than `join` merge; parts shorter
 * than `minKeep` are dropped (coughs, clicks).
 */
function keepSegments(silences, duration, opts) {
  const o = Object.assign({ pad: 0.12, join: 0.25, minKeep: 0.3 }, opts || {});
  const keeps = [];
  let cur = 0;
  for (const s of [...silences].sort((a, b) => a.start - b.start)) {
    if (s.start > cur) keeps.push({ start: cur, end: s.start });
    cur = Math.max(cur, s.end);
  }
  if (cur < duration) keeps.push({ start: cur, end: duration });
  const padded = keeps.map((k) => ({ start: Math.max(0, k.start - o.pad), end: Math.min(duration, k.end + o.pad) }));
  const merged = [];
  for (const k of padded) {
    const last = merged[merged.length - 1];
    if (last && k.start - last.end <= o.join) last.end = Math.max(last.end, k.end);
    else merged.push({ ...k });
  }
  return merged.filter((k) => k.end - k.start >= o.minKeep).map((k) => ({ start: round(k.start), end: round(k.end) }));
}

function round(x) { return Math.round(x * 1000) / 1000; }

function totalOf(segs) { return round(segs.reduce((a, s) => a + (s.end - s.start), 0)); }

/** ffmpeg filter_complex that keeps only the given segments. */
function concatFilter(segs, hasAudio) {
  const parts = [];
  const labels = [];
  segs.forEach((s, i) => {
    parts.push(`[0:v]trim=start=${s.start}:end=${s.end},setpts=PTS-STARTPTS[v${i}]`);
    if (hasAudio) parts.push(`[0:a]atrim=start=${s.start}:end=${s.end},asetpts=PTS-STARTPTS[a${i}]`);
    labels.push(hasAudio ? `[v${i}][a${i}]` : `[v${i}]`);
  });
  parts.push(`${labels.join('')}concat=n=${segs.length}:v=1:a=${hasAudio ? 1 : 0}[v]${hasAudio ? '[a]' : ''}`);
  return parts.join(';');
}

/**
 * Video filter that turns any source into a vertical 1080x1920 frame.
 * mode 'crop'  — fill by cropping the centre (talking head);
 * mode 'blur'  — whole frame on a blurred, zoomed copy of itself (screens, slides).
 */
function verticalFilter(srcW, srcH, mode) {
  const W = 1080, H = 1920;
  if (srcW * 16 === srcH * 9 || Math.abs(srcW / srcH - W / H) < 0.01) return `scale=${W}:${H}:flags=lanczos,setsar=1`;
  if (mode === 'crop') return `scale=${W}:${H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${W}:${H},setsar=1`;
  return `split[a][b];[a]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=30:2,eq=brightness=-0.08[bg];[b]scale=${W}:${H}:force_original_aspect_ratio=decrease:flags=lanczos[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1`;
}

function landscapeFilter(srcW, srcH) {
  const W = 1920, H = 1080;
  if (Math.abs(srcW / srcH - W / H) < 0.01) return `scale=${W}:${H}:flags=lanczos,setsar=1`;
  return `split[a][b];[a]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=30:2,eq=brightness=-0.08[bg];[b]scale=${W}:${H}:force_original_aspect_ratio=decrease:flags=lanczos[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1`;
}

/** SRT helpers for captions. */
function srtTime(t) {
  const ms = Math.round(t * 1000);
  const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60, r = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(r).padStart(3, '0')}`;
}

/** Group word timings into short caption lines (max words / seconds). */
function wordsToSrt(words, opts) {
  const o = Object.assign({ maxWords: 4, maxSec: 2.2 }, opts || {});
  const cues = [];
  let cur = [];
  for (const w of words) {
    if (cur.length && (cur.length >= o.maxWords || w.end - cur[0].start > o.maxSec || w.start - cur[cur.length - 1].end > 0.6)) { cues.push(cur); cur = []; }
    cur.push(w);
  }
  if (cur.length) cues.push(cur);
  return cues.map((c, i) => `${i + 1}\n${srtTime(c[0].start)} --> ${srtTime(c[c.length - 1].end)}\n${c.map((w) => w.word.trim()).join(' ')}\n`).join('\n');
}

/** Shift caption/word timings through a cut plan (times in the original → in the cut). */
function mapTime(t, segs) {
  let acc = 0;
  for (const s of segs) {
    if (t < s.start) return acc;
    if (t <= s.end) return acc + (t - s.start);
    acc += s.end - s.start;
  }
  return acc;
}

module.exports = { parseSilences, keepSegments, totalOf, concatFilter, verticalFilter, landscapeFilter, srtTime, wordsToSrt, mapTime };
