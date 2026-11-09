#!/usr/bin/env node
/*
 * I/O Studio — Arabic text QA before delivery (فحص النص العربي قبل التسليم).
 *
 * Adapted from Reel Studio (MIT, © 2026 Mohamed Abdou): engine/src/core/arabic-check.ts and scripts/lib/font-coverage.mjs.
 * Changes: plain CommonJS, reads TTF/OTF/WOFF fonts (ours ship as TTF), knows I/O Studio's files (caps.json, theme.json,
 * compose.html, carousel HTML, lesson scene.json, .io/theme.json numerals) and adds a Persian-letters review rule
 * (ک ی copied from a Persian keyboard) plus Iraqi/Gulf letters (گ چ ڤ) coverage — the font must draw them.
 *
 *   node engine/arabic-qa.js <work-folder | file.json | file.html | file.txt> … [--font Tajawal] [--digits western|arabic]
 *                            [--text "نص"] [--json] [--dir .] [--allow-fallback] [--allow-persian]
 *   --allow-fallback: a letter the font lacks (e.g. گ چ in Tajawal) becomes a review item — only after the creator saw it drawn in the fallback face.
 *
 * Two levels (same as the original): `fail` stops delivery (the text would draw broken: cut joins, glyphs the font lacks,
 * presentation forms, tatweel at a word edge, ZWNJ inside a word, a word split across elements, a per-letter transform);
 * `review` needs eyes on the preview (mixed direction, stacked harakat, digit style, long lines, Persian letters).
 * Exit code: 0 = ok (maybe with review items) · 1 = at least one fail · 2 = usage error.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { dataFile } = require('./data-dir.js');
const zlib = require('zlib');

const FONTS_DIR = path.join(__dirname, '..', 'skills', 'io-video-editor', 'motion', 'fonts');

const CODES = Object.freeze({
  'missing-glyph': 'fail',
  'split-word-markup': 'fail',
  'zwnj-in-word': 'fail',
  'presentation-forms': 'fail',
  'tatweel-edge': 'fail',
  'per-letter-transform': 'fail',
  'mixed-direction': 'review',
  'stacked-harakat': 'review',
  'digit-style': 'review',
  'long-line': 'review',
  'persian-letters': 'review',
});

const AR_MSG = {
  'missing-glyph': 'الخط ما يرسم حرف أو أكثر — راح يطلع بخط ثاني أو مربع فاضي',
  'split-word-markup': 'كلمة عربية مقطّعة بين أكثر من عنصر — الحروف ما راح تتصل',
  'zwnj-in-word': 'فاصل مخفي (ZWNJ) داخل كلمة يقطع وصل الحروف — شيله',
  'presentation-forms': 'حروف بأشكال العرض الجاهزة (مثل ﻻ) — اكتبها حروف عادية والمحرّك يوصلها',
  'tatweel-edge': 'كشيدة (ـ) بأول كلمة أو آخرها — الكشيدة بين الحروف بس',
  'per-letter-transform': 'حرف واحد يتحرك لحاله داخل كلمة — الحروف تنفك؛ حرّك الكلمة كلها',
  'mixed-direction': 'عربي مخلوط بإنقليزي أو رقم بإشارة — راجع الترتيب بالمعاينة',
  'stacked-harakat': 'أكثر من تشكيلة على حرف واحد — راجع إنها ما تتداخل',
  'digit-style': 'شكل الأرقام غير اختيار الهوية — راجع الأرقام',
  'long-line': 'سطر أو كلمة طويلة كلش — راجع إنها داخلة بالعرض الآمن',
  'persian-letters': 'حروف فارسية (ک ی) بدل العربية (ك ي) — غالباً منسوخة من كيبورد فارسي',
};

const LONG_LINE_CHARS = 90;
const LONG_TOKEN_CHARS = 24;
const TATWEEL = 'ـ';
const ZWNJ = '‌';
const MARK = /^\p{M}$/u;
const HARAKAT = /^[ً-ْٰ]$/;
const TAG = /<\/?[A-Za-z][^<>]*>/g;
const HAS_TAG = /<\/?[A-Za-z][^<>]*>/;
const INDIC = /[٠-٩]/;
const PERSIAN_DIGITS = /[۰-۹]/;
const SIGNED_NUMBER = /(?<![0-9٠-٩۰-۹\p{L}])[+\-−–]\s?[0-9٠-٩۰-۹]/u;
const ARABIC_LETTER = /(?=\p{L})[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-ﻼ]/u;
const LATIN_LETTER = /[A-Za-z]/;
const PERSIAN_LETTERS = /[کیۀ]/; // ک ی ۀ
const BLOCK_TAGS = new Set(['div', 'p', 'li', 'ul', 'ol', 'dl', 'dt', 'dd', 'section', 'article', 'header', 'footer', 'main', 'nav', 'aside', 'blockquote', 'pre', 'figure', 'figcaption',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'form', 'fieldset', 'br', 'hr', 'img', 'svg', 'canvas', 'video', 'button', 'input', 'script', 'style']);
const URLISH = /^(?:https?:\/\/|www\.)|:\/\/|^[#@]|@[\w.-]+\.[a-z]{2,}$/i;

const RIGHT_JOINING = [[0x622, 0x625], [0x627, 0x627], [0x629, 0x629], [0x62f, 0x632], [0x648, 0x648], [0x671, 0x673], [0x675, 0x677], [0x688, 0x699],
  [0x6c0, 0x6c0], [0x6c3, 0x6cb], [0x6cd, 0x6cd], [0x6cf, 0x6cf], [0x6d2, 0x6d3], [0x6d5, 0x6d5], [0x6ee, 0x6ef]];
const NON_JOINING = [[0x621, 0x621], [0x674, 0x674]];
const inRanges = (ranges, code) => ranges.some(([a, b]) => code >= a && code <= b);
const isArabicLetter = (ch) => ARABIC_LETTER.test(ch);
const hasArabicLetter = (text) => Array.from(text).some(isArabicLetter);
const joinsForward = (ch) => isArabicLetter(ch) && !inRanges(RIGHT_JOINING, ch.codePointAt(0)) && !inRanges(NON_JOINING, ch.codePointAt(0));
const joinsBackward = (ch) => isArabicLetter(ch) && !inRanges(NON_JOINING, ch.codePointAt(0));
const hex = (ch) => `U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`;
const unique = (items) => [...new Set(items)];

const isPresentationForm = (code) => ((code >= 0xfb50 && code <= 0xfdcf) || (code >= 0xfe70 && code <= 0xfefc)) && code !== 0xfd3e && code !== 0xfd3f;
const isInvisible = (ch) => {
  const code = ch.codePointAt(0);
  return code <= 0x20 || /^[\p{Z}\p{Cc}]$/u.test(ch) || code === 0xad || code === 0x034f || code === 0x061c || (code >= 0x200b && code <= 0x200f)
    || (code >= 0x202a && code <= 0x202e) || (code >= 0x2060 && code <= 0x206f) || (code >= 0xfe00 && code <= 0xfe0f) || code === 0xfeff;
};
const isPictograph = (ch) => /^[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Regional_Indicator}\p{Emoji_Modifier}⃣]$/u.test(ch);

/** Latin digits → Arabic-Indic (what the screen shows when numerals = arabic). */
function toIndic(text) { return text.replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]); }

function tatweelEdges(text) {
  // A tatweel that starts a word, or follows a letter that never joins forward (د ر و ا…), draws a loose stroke: fail.
  // «الـ / للـ» before a foreign or highlighted word (the tatweel follows a joining lam) is a common, deliberate spelling: review only.
  const fail = [], review = [];
  for (const token of text.split(/\s+/)) {
    if (!token) continue;
    const core = token.replace(/^[^\p{L}\p{M}\u0640]+|[^\p{L}\p{M}\u0640]+$/gu, '');
    if (!core || !hasArabicLetter(core) || /^\u0640+$/.test(core)) continue;
    const starts = core.startsWith(TATWEEL);
    const bare = core.replace(/\p{M}+$/u, '');
    const ends = bare.endsWith(TATWEEL);
    if (starts) { fail.push(`${token} (بأولها)`); continue; }
    if (!ends) continue;
    const before = Array.from(bare.replace(/\u0640+$/u, '')).filter((ch) => !MARK.test(ch)).pop();
    (before && joinsForward(before) ? review : fail).push(`${token} (بآخرها)`);
  }
  return { fail, review };
}

function zwnjInside(chars) {
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] !== ZWNJ) continue;
    let b = i - 1; while (b >= 0 && MARK.test(chars[b])) b--;
    let a = i + 1; while (a < chars.length && MARK.test(chars[a])) a++;
    if (b >= 0 && a < chars.length && isArabicLetter(chars[b]) && isArabicLetter(chars[a])) return true;
  }
  return false;
}

function stackedHarakat(text) {
  const chars = Array.from(text.normalize('NFC'));
  const out = [];
  for (let i = 0; i < chars.length; i++) {
    if (MARK.test(chars[i])) continue;
    const marks = [];
    let n = i + 1;
    while (n < chars.length && MARK.test(chars[n])) marks.push(chars[n++]);
    const h = marks.filter((m) => HARAKAT.test(m));
    if (h.length < 2) continue;
    const twice = unique(h).length < h.length;
    out.push(`${chars[i]}${marks.join('')} عليه ${h.length} تشكيلات (${h.map(hex).join(' ')})${twice ? ' — وحدة منها مكررة' : ''}`);
  }
  return out;
}

function mixedDirection(raw) {
  const text = raw.replace(/\{keyword\}/g, ' ');
  if (!hasArabicLetter(text)) return null;
  const latin = unique(text.match(/[A-Za-z][A-Za-z0-9'’._+#-]*/g) || []);
  const signed = SIGNED_NUMBER.test(text);
  if (!latin.length && !signed) return null;
  return [latin.length ? `إنقليزي (${latin.slice(0, 4).join(', ')}) داخل سطر عربي` : '', signed ? 'رقم بإشارة (+3، -5) ممكن ينقلب' : ''].filter(Boolean).join('؛ ');
}

function digitStyle(text, digits) {
  if (digits !== 'arabic-indic' && (INDIC.test(text) || PERSIAN_DIGITS.test(text))) {
    return `أرقام هندية/فارسية (${unique(text.match(/[٠-٩۰-۹]+/g) || []).slice(0, 3).join(' ')}) والهوية على الأرقام الغربية`;
  }
  if (digits === 'arabic-indic' && PERSIAN_DIGITS.test(text)) return 'أرقام فارسية والهوية على الهندية — يختلفون بـ٤ ٥ ٦';
  return null;
}

function longRuns(text, limits) {
  const lines = text.split(/\r?\n/).filter((l) => Array.from(l).length > limits.line);
  const tokens = text.split(/\s+/).filter((t) => Array.from(t).length > limits.token && !URLISH.test(t));
  if (!lines.length && !tokens.length) return null;
  return [lines.length ? `سطر بطول ${Array.from(lines[0]).length} حرف (أكثر من ${limits.line})` : '', tokens.length ? `كلمة متصلة بطول ${Array.from(tokens[0]).length} (أكثر من ${limits.token})` : ''].filter(Boolean).join('؛ ');
}

function missingGlyphs(text, coverage) {
  const fail = [], review = [];
  for (const ch of unique(Array.from(text))) {
    const code = ch.codePointAt(0);
    if (isInvisible(ch) || coverage.has(code)) continue;
    const parts = Array.from(ch.normalize('NFD'));
    if (parts.length > 1 && parts.every((p) => coverage.has(p.codePointAt(0)) || isInvisible(p))) continue;
    (isPictograph(ch) || /^\p{S}$/u.test(ch) ? review : fail).push(ch);
  }
  return { fail, review };
}

/** The rules that read one visible string. Returns [{level, code, text, detail}]. */
function checkString(text, opt = {}) {
  const out = [];
  if (typeof text !== 'string' || !text) return out;
  const add = (code, detail, level = CODES[code]) => out.push({ level, code, text, detail });
  const chars = Array.from(text);
  const forms = unique(chars.filter((ch) => isPresentationForm(ch.codePointAt(0))));
  if (forms.length) add('presentation-forms', `${forms.map((ch) => `${hex(ch)} ${ch}`).join(', ')} — اكتبها: ${unique(forms.map((ch) => ch.normalize('NFKC'))).join(' ')}`);
  const edges = tatweelEdges(text);
  if (edges.fail.length) add('tatweel-edge', edges.fail.slice(0, 3).join('؛ '));
  if (edges.review.length) add('tatweel-edge', `${edges.review.slice(0, 3).join('؛ ')} — «الـ» قبل كلمة أجنبية مقبولة، تأكد إنها مقصودة`, 'review');
  if (zwnjInside(chars)) add('zwnj-in-word', 'U+200C بين حرفين عربيين');
  const st = stackedHarakat(text);
  if (st.length) add('stacked-harakat', st.slice(0, 3).join('؛ '));
  const mixed = mixedDirection(text);
  if (mixed) add('mixed-direction', mixed);
  const d = digitStyle(text, opt.digits);
  if (d) add('digit-style', d);
  const runs = longRuns(text, { line: opt.longLine || LONG_LINE_CHARS, token: opt.longToken || LONG_TOKEN_CHARS });
  if (runs) add('long-line', runs);
  if (PERSIAN_LETTERS.test(text) && !opt.allowPersian) add('persian-letters', unique(chars.filter((c) => PERSIAN_LETTERS.test(c))).map((c) => `${hex(c)} ${c}`).join(', '));
  if (opt.coverage) {
    const shown = opt.digits === 'arabic-indic' ? toIndic(text) : text;
    const m = missingGlyphs(shown, opt.coverage);
    const list = (xs) => xs.slice(0, 8).map((ch) => `${hex(ch)} ${ch}`).join(', ');
    const font = opt.font ? ` «${opt.font}»` : '';
    if (m.fail.length) {
      const alt = opt.alternatives ? opt.alternatives(m.fail) : [];
      add('missing-glyph', `الخط${font} ما يرسم ${list(m.fail)} — المتصفح يرسمه بخط ثاني (أو مربع فاضي بجهاز ثاني)${alt.length ? `؛ خطوط عندنا ترسمه: ${alt.join('، ')}` : ''}`, opt.allowFallback ? 'review' : 'fail');
    }
    if (m.review.length) add('missing-glyph', `الخط${font} ما يرسم الرمز/الإيموجي ${list(m.review)} — يطلع من خط النظام، شوفه بالمعاينة`, 'review');
  }
  return out;
}

/** Markup rules: an Arabic word split across inline elements, and a one-letter element with a transform inside a word. */
function checkMarkup(html) {
  const out = [];
  if (typeof html !== 'string' || !HAS_TAG.test(html)) return out;
  const add = (code, detail) => out.push({ level: CODES[code], code, text: html.length > 160 ? html.slice(0, 160) + '…' : html, detail });
  // drop <script>/<style> bodies — their text is code, not drawn letters
  html = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '<$1></$1>');
  const pieces = [];
  let cursor = 0;
  for (const m of html.matchAll(TAG)) {
    if (m.index > cursor) pieces.push({ kind: 'text', value: html.slice(cursor, m.index) });
    const raw = m[0];
    const st = /style\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(raw);
    pieces.push({ kind: 'tag', name: /^<\/?([A-Za-z][\w-]*)/.exec(raw)[1].toLowerCase(), closing: raw.startsWith('</'), style: st ? (st[1] !== undefined ? st[1] : st[2]) : '' });
    cursor = m.index + raw.length;
  }
  if (cursor < html.length) pieces.push({ kind: 'text', value: html.slice(cursor) });
  const letterRun = (value, fromEnd) => {
    const letters = Array.from(value).filter((ch) => !MARK.test(ch));
    let run = 0;
    for (let i = 0; i < letters.length; i++) { if (!isArabicLetter(fromEnd ? letters[letters.length - 1 - i] : letters[i])) break; run++; }
    return run;
  };
  const splits = [];
  let left = null, crossed = false;
  for (const p of pieces) {
    if (p.kind === 'tag') { if (BLOCK_TAGS.has(p.name)) { left = null; crossed = false; } else if (left) crossed = true; continue; }
    const letters = Array.from(p.value).filter((ch) => !MARK.test(ch));
    if (!letters.length) { left = null; crossed = false; continue; }
    if (left && crossed && joinsForward(left.last) && joinsBackward(letters[0]) && (left.run === 1 || letterRun(p.value, false) === 1)) splits.push(`${left.last}|${letters[0]}`);
    const last = letters[letters.length - 1];
    left = isArabicLetter(last) ? { last, run: letterRun(p.value, true) } : null;
    crossed = false;
  }
  if (splits.length) add('split-word-markup', `مقطوعة عند ${unique(splits).slice(0, 3).join('، ')} — حط الكلمة كلها بعنصر واحد`);
  const neighbour = (from, step) => {
    for (let at = from; at >= 0 && at < pieces.length; at += step) {
      const p = pieces[at];
      if (p.kind === 'text') return Array.from(p.value);
      if (BLOCK_TAGS.has(p.name)) return undefined;
    }
    return undefined;
  };
  const lone = [];
  for (let i = 0; i + 2 < pieces.length; i++) {
    const o = pieces[i], b = pieces[i + 1], c = pieces[i + 2];
    if (o.kind !== 'tag' || o.closing || b.kind !== 'text' || c.kind !== 'tag' || !c.closing || c.name !== o.name) continue;
    if (!/transform|translate|rotate|scale/i.test(o.style)) continue;
    const letters = Array.from(b.value).filter((ch) => !MARK.test(ch));
    if (letters.length !== 1 || !isArabicLetter(letters[0])) continue;
    const prev = (neighbour(i - 1, -1) || []).filter((ch) => !MARK.test(ch)).pop();
    const next = (neighbour(i + 3, 1) || []).find((ch) => !MARK.test(ch));
    if ((prev !== undefined && joinsForward(prev) && joinsBackward(letters[0])) || (next !== undefined && joinsForward(letters[0]) && joinsBackward(next))) lone.push(letters[0]);
  }
  if (lone.length) add('per-letter-transform', `الحرف ${unique(lone).join(' ')}`);
  return out;
}

// ---- font coverage (cmap) — TTF / OTF / TTC / WOFF1 ------------------------------------------------------------

function parseCmap(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const records = view.getUint16(2);
  const covered = new Set();
  const done = new Set();
  for (let i = 0; i < records; i++) {
    const platform = view.getUint16(4 + i * 8), encoding = view.getUint16(6 + i * 8), offset = view.getUint32(8 + i * 8);
    const unicode = platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10));
    if (!unicode || done.has(offset) || offset + 4 > bytes.length) continue;
    done.add(offset);
    const format = view.getUint16(offset);
    if (format === 4) {
      const seg = view.getUint16(offset + 6) / 2;
      const ends = offset + 14, starts = ends + seg * 2 + 2, deltas = starts + seg * 2, offs = deltas + seg * 2;
      for (let s = 0; s < seg; s++) {
        const end = view.getUint16(ends + s * 2), start = view.getUint16(starts + s * 2);
        const delta = view.getUint16(deltas + s * 2), ro = view.getUint16(offs + s * 2);
        for (let code = start; code <= end; code++) {
          if (code === 0xffff) continue;
          let glyph;
          if (ro === 0) glyph = (code + delta) & 0xffff;
          else {
            const at = offs + s * 2 + ro + (code - start) * 2;
            if (at + 2 > view.byteLength) continue;
            const raw = view.getUint16(at);
            glyph = raw === 0 ? 0 : (raw + delta) & 0xffff;
          }
          if (glyph !== 0) covered.add(code);
        }
      }
    } else if (format === 12) {
      const groups = view.getUint32(offset + 12);
      for (let g = 0; g < groups; g++) {
        const at = offset + 16 + g * 12;
        const start = view.getUint32(at), end = Math.min(view.getUint32(at + 4), 0x10ffff), first = view.getUint32(at + 8);
        if (end < start || end - start > 0x20000) continue;
        for (let code = start; code <= end; code++) if (first + (code - start) !== 0) covered.add(code);
      }
    }
  }
  return covered;
}

/** The raw bytes of the cmap table of a font file, or null (WOFF2 is not read: it needs brotli + transforms). */
function cmapTable(buf) {
  const tag = buf.toString('latin1', 0, 4);
  if (tag === 'wOFF') {
    const n = buf.readUInt16BE(12);
    for (let i = 0; i < n; i++) {
      const at = 44 + i * 20;
      if (buf.toString('latin1', at, at + 4) !== 'cmap') continue;
      const off = buf.readUInt32BE(at + 4), comp = buf.readUInt32BE(at + 8), orig = buf.readUInt32BE(at + 12);
      const data = buf.subarray(off, off + comp);
      return comp < orig ? zlib.inflateSync(data) : data;
    }
    return null;
  }
  if (tag === 'wOF2') return null;
  let base = 0;
  if (tag === 'ttcf') base = buf.readUInt32BE(12);
  const n = buf.readUInt16BE(base + 4);
  for (let i = 0; i < n; i++) {
    const at = base + 12 + i * 16;
    if (buf.toString('latin1', at, at + 4) === 'cmap') {
      const off = buf.readUInt32BE(at + 8), len = buf.readUInt32BE(at + 12);
      return buf.subarray(off, off + len);
    }
  }
  return null;
}

const coverageCache = new Map();
/** The code points a font file draws (Set), or null when it cannot be read. */
function fontCoverage(file) {
  if (coverageCache.has(file)) return coverageCache.get(file);
  let covered = null;
  try { const t = cmapTable(fs.readFileSync(file)); if (t) covered = parseCmap(new Uint8Array(t)); } catch (e) { covered = null; }
  coverageCache.set(file, covered);
  return covered;
}

const squash = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
/** Every font file of a family in the plugin fonts folder (or `dirs`), joined into one Set. null when the family is not installed. */
function familyCoverage(family, dirs = [FONTS_DIR]) {
  const want = squash(family);
  if (!want) return null;
  const out = new Set();
  let read = 0;
  for (const dir of dirs) {
    let files = [];
    try { files = fs.readdirSync(dir); } catch (e) { continue; }
    for (const f of files) {
      if (!/\.(ttf|otf|ttc|woff)$/i.test(f)) continue;
      const stem = squash(f.replace(/\.[^.]+$/, '').split('-')[0]);
      if (stem !== want) continue;
      const c = fontCoverage(path.join(dir, f));
      if (c) { read++; for (const x of c) out.add(x); }
    }
  }
  return read ? out : null;
}

/** Family names of the installed font files (Cairo-VF.ttf → Cairo, IBMPlexSansArabic-Bold.ttf → IBMPlexSansArabic). */
function installedFamilies(dirs = [FONTS_DIR]) {
  const names = new Set();
  for (const dir of dirs || [FONTS_DIR]) { try { for (const f of fs.readdirSync(dir)) if (/\.(ttf|otf|ttc|woff)$/i.test(f)) names.add(f.replace(/\.[^.]+$/, '').split('-')[0].replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').replace(/([a-z])([A-Z])/g, '$1 $2')); } catch (e) { /* none */ } }
  return [...names].filter((n) => !/^Amiri Quran$|^Inter$/.test(n));
}

// ---- collecting visible strings from I/O Studio files ---------------------------------------------------------------

const TECHNICAL_KEY = /^(?:id|.*Id|src|path|file|url|href|icon|component|recipe|font|.*Font|fonts|color|colors|.*Color|accent|bg|ink|acc|clay|mut|kind|type|op|ops|cat|category|mode|layout|look|style|fx|grade|numerals|dialect|platforms|handles|hot)$/;
const TECHNICAL_VALUE = /^(?:#[\da-f]{3,8}|(?:https?:\/\/|\.{0,2}\/)\S*|[\w.-]+\.(?:png|jpe?g|webp|gif|svg|mp4|mov|webm|wav|mp3|m4a|json|ttf|otf|woff2?|js|html|css))$/i;

function walkJson(value, where, out, key, depth = 0) {
  if (depth > 14 || (key !== undefined && TECHNICAL_KEY.test(key))) return;
  if (typeof value === 'string') { if (value.trim() && !TECHNICAL_VALUE.test(value.trim())) out.push({ kind: 'text', where, text: value }); return; }
  if (Array.isArray(value)) { value.forEach((v, i) => walkJson(v, `${where}[${i}]`, out, key, depth + 1)); return; }
  if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) walkJson(v, where ? `${where}.${k}` : k, out, k, depth + 1);
}

/** caps.json ({cards:[{w:[{t}]}]}) → one string per caption word. */
function captionStrings(caps, file) {
  const out = [];
  (caps.cards || []).forEach((c, i) => (c.w || []).forEach((w, j) => { if (typeof w.t === 'string' && w.t.trim()) out.push({ kind: 'caption', where: `${file}:card ${i + 1} word ${j + 1}`, text: w.t }); }));
  return out;
}

/** Arabic string literals inside JS/HTML source: '…', "…", `…` and text between tags. */
function sourceStrings(src, file) {
  const out = [];
  const seen = new Set();
  const push = (text, where) => { const t = text.trim(); if (t && hasArabicLetter(t) && !seen.has(where + t)) { seen.add(where + t); out.push({ kind: 'text', where, text: t }); } };
  const lineOf = (i) => src.slice(0, i).split('\n').length;
  // engine messages and comments are never drawn: skip console/throw lines, comments and "w:word" timing anchors
  const lines = src.split('\n');
  const codeLine = (i) => /console\.|throw\s|\balert\(|^\s*(\/\/|\*|\/\*)|^\s*[a-z/]+\s*:\s/.test(lines[lineOf(i) - 1] || '');
  const lit = /(['"`])((?:\\.|(?!\1)[^\\\n])*?)\1/g;
  let m;
  while ((m = lit.exec(src))) if (hasArabicLetter(m[2]) && !codeLine(m.index) && !/^w:/.test(m[2])) push(m[2].replace(/\\n/g, '\n').replace(/\\(.)/g, '$1'), `${file}:${lineOf(m.index)}`);
  const body = src.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, (s) => ' '.repeat(s.length));
  const txt = />([^<>]+)</g;
  while ((m = txt.exec(body))) if (hasArabicLetter(m[1])) push(m[1], `${file}:${lineOf(m.index)}`);
  return out;
}

function readJson(f) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } }

/** All visible strings + markup + the font/digits hints found in one input path. */
function collect(input) {
  const strings = [], markup = [], hints = {};
  const addFile = (file, label) => {
    const ext = path.extname(file).toLowerCase();
    const raw = fs.readFileSync(file, 'utf8');
    if (ext === '.json') {
      const j = readJson(file);
      if (!j) return;
      if (path.basename(file) === 'theme.json') { if (j.font) hints.font = j.font; if (j.fonts && j.fonts.heading) hints.font = hints.font || j.fonts.heading; if (j.numerals) hints.numerals = j.numerals; }
      if (Array.isArray(j.cards)) strings.push(...captionStrings(j, label));
      else if (path.basename(file) !== 'theme.json') { const o = []; walkJson(j, label, o); strings.push(...o); }
    } else if (ext === '.html' || ext === '.htm') {
      strings.push(...sourceStrings(raw, label));
      markup.push({ where: label, html: raw });
    } else if (ext === '.js') {
      strings.push(...sourceStrings(raw, label));
    } else {
      raw.split(/\r?\n/).forEach((l, i) => { if (l.trim()) strings.push({ kind: 'text', where: `${label}:${i + 1}`, text: l }); });
    }
  };
  const st = fs.statSync(input);
  if (st.isDirectory()) {
    for (const f of ['theme.json', 'caps.json', 'compose.html', 'hook.json', 'facts.md', 'scene.json', 'prompt.md']) {
      const p = path.join(input, f);
      if (fs.existsSync(p)) addFile(p, f);
    }
    for (const f of fs.readdirSync(input)) if (/\.(html?)$/i.test(f) && f !== 'compose.html' && !/review|studio/i.test(f)) addFile(path.join(input, f), f);
  } else addFile(input, path.basename(input));
  return { strings, markup, hints };
}

/** Reads `.io/theme.json` of the project for numerals + heading font. */
function identityHints(dir) {
  const t = readJson(dataFile(dir || '.', 'theme.json')) || {};
  return { font: t.fonts && t.fonts.heading, numerals: t.numerals };
}

const digitsFrom = (numerals) => (numerals === 'arabic' || numerals === 'arabic-indic' ? 'arabic-indic' : numerals === 'western' || numerals === 'latin' ? 'latin' : null);

/**
 * Check a list of strings (+ markup). opts: {font, digits, coverage (Set|null), fontsDirs}.
 * Returns {ok, problems:[{level, code, where, text, detail, ar}], notes, counts}.
 */
function checkAll({ strings = [], markup = [] }, opts = {}) {
  const problems = [], notes = [];
  let coverage = opts.coverage;
  if (coverage === undefined && opts.font) {
    coverage = familyCoverage(opts.font, opts.fontsDirs);
    if (!coverage) notes.push(`ما لگيت ملف الخط «${opts.font}» بمجلد الخطوط — فحص الحروف الناقصة ما اشتغل.`);
  }
  const base = { digits: opts.digits, coverage: coverage || null, font: opts.font, allowPersian: opts.allowPersian, allowFallback: opts.allowFallback,
    alternatives: (chars) => installedFamilies(opts.fontsDirs).filter((f) => f !== opts.font && chars.every((ch) => { const c = familyCoverage(f, opts.fontsDirs); return c && c.has(ch.codePointAt(0)); })) };
  for (const s of strings) {
    const holds = HAS_TAG.test(s.text);
    const found = [...(holds ? checkMarkup(s.text) : []), ...checkString(holds ? s.text.replace(TAG, '') : s.text, base)];
    for (const f of found) {
      if (s.kind === 'caption' && f.code === 'mixed-direction') continue; // judged with neighbours below
      problems.push({ ...f, where: s.where });
    }
  }
  // caption words: a Latin word between Arabic words → one grouped review item per word
  const caps = strings.filter((s) => s.kind === 'caption');
  const groups = new Map();
  caps.forEach((s, i) => {
    const own = s.text.trim();
    if (!((LATIN_LETTER.test(own) || SIGNED_NUMBER.test(own)) && !hasArabicLetter(own))) return;
    if (![caps[i - 1], caps[i + 1]].some((n) => n && hasArabicLetter(n.text))) return;
    const k = own.toLowerCase();
    const g = groups.get(k);
    if (g) g.count++; else groups.set(k, { first: s, count: 1 });
  });
  for (const { first, count } of groups.values()) {
    problems.push({ level: 'review', code: 'mixed-direction', where: first.where, text: first.text,
      detail: `«${first.text.trim()}» بين كلمات عربية${count > 1 ? ` (${count} مرات)` : ''} — راجع مكانه بالمعاينة` });
  }
  for (const m of markup) for (const f of checkMarkup(m.html)) problems.push({ ...f, where: m.where });
  for (const p of problems) p.ar = AR_MSG[p.code];
  problems.sort((a, b) => Number(b.level === 'fail') - Number(a.level === 'fail'));
  const fail = problems.filter((p) => p.level === 'fail').length;
  return { ok: fail === 0, problems, notes, counts: { fail, review: problems.length - fail } };
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
  if (!o._.length && !o.text) {
    console.error('الاستخدام: node engine/arabic-qa.js <مجلد العمل | ملف.json | ملف.html | ملف.txt> … [--font Tajawal] [--digits western|arabic] [--text "…"] [--json]');
    process.exit(2);
  }
  const all = { strings: [], markup: [] };
  let hints = identityHints(o.dir);
  for (const p of o._) {
    if (!fs.existsSync(p)) { console.error('مو موجود: ' + p); process.exit(2); }
    const c = collect(p);
    all.strings.push(...c.strings); all.markup.push(...c.markup);
    hints = { font: c.hints.font || hints.font, numerals: c.hints.numerals || hints.numerals };
  }
  if (typeof o.text === 'string') all.strings.push({ kind: 'text', where: '--text', text: o.text });
  const font = typeof o.font === 'string' ? o.font : hints.font || 'Tajawal';
  const digits = digitsFrom(typeof o.digits === 'string' ? o.digits : hints.numerals) || 'latin';
  const r = checkAll(all, { font, digits, allowPersian: !!o['allow-persian'], allowFallback: !!o['allow-fallback'] });
  if (o.json) { console.log(JSON.stringify({ font, digits, checked: all.strings.length, ...r }, null, 2)); process.exit(r.ok ? 0 : 1); }
  console.log(`فحص النص العربي — ${all.strings.length} نص · الخط ${font} · الأرقام ${digits === 'latin' ? 'غربية' : 'هندية'}`);
  for (const n of r.notes) console.log('ℹ️ ' + n);
  for (const p of r.problems) {
    const t = p.text.length > 50 ? p.text.slice(0, 50) + '…' : p.text;
    console.log(`${p.level === 'fail' ? '⛔' : '👀'} ${p.where} «${t}» — ${p.ar}: ${p.detail}`);
  }
  console.log(r.ok ? (r.counts.review ? `✅ يعدّي — ${r.counts.review} شي للمراجعة بالعين` : '✅ سليم') : `⛔ ${r.counts.fail} خطأ يوقف التسليم — صلّحه وأعد الفحص`);
  process.exit(r.ok ? 0 : 1);
}

module.exports = { installedFamilies, CODES, AR_MSG, checkString, checkMarkup, checkAll, collect, fontCoverage, familyCoverage, parseCmap, cmapTable, sourceStrings, captionStrings, digitsFrom, FONTS_DIR };
if (require.main === module) main();
