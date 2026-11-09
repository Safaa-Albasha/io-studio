/*
 * I/O Studio — small pure helpers used by the recording page:
 * teleprompter parsing, file naming, frame geometry. Testable in Node.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.IoRecorder = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Split a script into one block per slide. Accepted separators:
   *   "## 3" / "## شريحة 3" / "## Slide 3: title"  (markdown heading)
   *   a line with only "---"
   * Text before the first separator is ignored when headings are used
   * (it's usually a title or notes). Returns an array of strings.
   */
  function parsePrompter(text) {
    const src = String(text || '').replace(/\r\n?/g, '\n').replace(/^﻿/, '');
    const lines = src.split('\n');
    const hasHeadings = lines.some((l) => /^#{2,3}\s+/.test(l));
    const blocks = [];
    let cur = null;
    for (const line of lines) {
      if (hasHeadings && /^#{2,3}\s+/.test(line)) { if (cur !== null) blocks.push(cur); cur = ''; continue; }
      if (!hasHeadings && /^\s*-{3,}\s*$/.test(line)) { blocks.push(cur || ''); cur = ''; continue; }
      if (cur === null) { if (hasHeadings) continue; cur = ''; }
      cur += (cur ? '\n' : '') + line;
    }
    if (cur !== null) blocks.push(cur);
    return blocks.map((b) => b.trim()).filter((b, i, a) => b || i < a.length - 1);
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function stamp(d) {
    d = d || new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
  }

  /** Pick the best recording container the browser supports. */
  function pickMime(isSupported) {
    const list = [
      ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'mp4'],
      ['video/mp4;codecs=avc1,mp4a', 'mp4'],
      ['video/mp4', 'mp4'],
      ['video/webm;codecs=vp9,opus', 'webm'],
      ['video/webm;codecs=vp8,opus', 'webm'],
      ['video/webm', 'webm'],
    ];
    for (const [m, ext] of list) if (isSupported(m)) return { mime: m, ext };
    return { mime: '', ext: 'webm' };
  }

  /** Fit a source (sw×sh) into a box (bw×bh). mode: 'contain' | 'cover'. */
  function fit(sw, sh, bw, bh, mode) {
    const s = mode === 'cover' ? Math.max(bw / sw, bh / sh) : Math.min(bw / sw, bh / sh);
    const w = sw * s, h = sh * s;
    return { x: (bw - w) / 2, y: (bh - h) / 2, w, h };
  }

  const OUTPUTS = {
    vertical: { w: 1080, h: 1920, labelAr: 'عمودي 9:16 — ريلز، شورتس، تيك توك', platforms: ['instagram', 'youtube', 'tiktok'] },
    landscape: { w: 1920, h: 1080, labelAr: 'عرضي 16:9 — يوتيوب', platforms: ['youtube'] },
    square: { w: 1080, h: 1080, labelAr: 'مربع 1:1', platforms: ['instagram', 'youtube'] },
  };

  /** Natural sort for slide file names: p-2.png before p-10.png. */
  function naturalCompare(a, b) {
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
  }

  const IMAGE_RE = /\.(png|jpe?g|webp|avif|gif|bmp)$/i;

  return { parsePrompter, stamp, pickMime, fit, OUTPUTS, naturalCompare, IMAGE_RE };
});
