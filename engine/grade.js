#!/usr/bin/env node
/*
 * I/O Studio — فلاتر وتلوين سينمائي (ffmpeg، بلا مكتبات).
 *
 *   node engine/grade.js list [--group film]                       # كل اللوكات
 *   node engine/grade.js preview <video|image> [--looks a,b,c] [--out sheet.jpg] [--cols 6] [--w 320] [--at 2.5]
 *   node engine/grade.js apply <in> --look <id> [--strength 0..1] [--out x.mp4]
 *   node engine/grade.js lut <id> [--out x.cube] [--size 33] [--strength 1]   # LUT لـCapCut/Premiere/DaVinci
 *   node engine/grade.js auto <in> [--look <id>] [--strength 0.8] [--out x.mp4] [--dry]
 *   node engine/grade.js build                                    # يولّد luts/*.cube + sample.jpg + previews/ + يحدّث web/looks.html
 *
 * كل لون معرّف مرة وحدة كبيانات (library/looks/catalog.json ← ops). نفس الرياضيات تطلّع:
 *   - ملف .cube (أخذ عيّنات 33×33×33 من الدالة)، و
 *   - التطبيق بـffmpeg (lut3d على نفس الـcube) — فاللي تشوفه بالمعاينة = اللي يطلع بـCapCut.
 * المؤثرات اللي مو لون (حبيبات، تظليل، توهج، شرائط، VHS، خدوش، تسريب ضوء) سلسلة فلاتر ffmpeg — ما تنحط بـLUT.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const LIB = path.join(ROOT, 'library', 'looks');
const CATALOG = path.join(LIB, 'catalog.json');
const FONT_CANDIDATES = [
  path.join(ROOT, 'skills', 'io-video-editor', 'motion', 'fonts', 'IBMPlexSansArabic-Bold.ttf'),
  path.join(ROOT, 'skills', 'io-video-editor', 'motion', 'fonts', 'Tajawal-Bold.ttf'),
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
];

// ───────────────────────── الكتالوج ─────────────────────────

function loadCatalog(file = CATALOG) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function getLook(cat, id) {
  const l = cat.looks.find((x) => x.id === id);
  if (!l) throw new Error(`ما أعرف لوك باسم «${id}» — شوف: node engine/grade.js list`);
  return l;
}

/** عمليات اللون الكاملة للوك (مع base). */
function colorOps(cat, look, seen = new Set()) {
  if (seen.has(look.id)) throw new Error(`دوران بالـbase: ${look.id}`);
  seen.add(look.id);
  const base = look.base ? colorOps(cat, getLook(cat, look.base), seen) : [];
  return base.concat(look.ops || []);
}

function isLutable(cat, look) {
  return colorOps(cat, look).length > 0;
}

// ───────────────────────── رياضيات اللون ─────────────────────────

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const smooth = (e0, e1, x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };

function hex(h) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(h));
  if (!m) throw new Error(`لون غلط: ${h}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function rgb2hsv([r, g, b]) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d > 1e-9) {
    if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return [h, mx <= 0 ? 0 : d / mx, mx];
}

function hsv2rgb([h, s, v]) {
  h = ((h % 360) + 360) % 360;
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r + m, g + m, b + m];
}

/** منحنى مونوتوني (Fritsch–Carlson) من نقاط [[x,y],…]. */
function monoCurve(pts) {
  const p = pts.map((q) => [Number(q[0]), Number(q[1])]).sort((a, b) => a[0] - b[0]);
  if (p.length < 2) throw new Error('المنحنى يحتاج نقطتين بالأقل');
  const n = p.length, dx = [], m = [], t = new Array(n);
  for (let i = 0; i < n - 1; i++) { dx[i] = p[i + 1][0] - p[i][0]; m[i] = (p[i + 1][1] - p[i][1]) / (dx[i] || 1e-9); }
  t[0] = m[0]; t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  return (x) => {
    if (x <= p[0][0]) return p[0][1];
    if (x >= p[n - 1][0]) return p[n - 1][1];
    let i = 0; while (x > p[i + 1][0]) i++;
    const h = dx[i], u = (x - p[i][0]) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * p[i][1] + (u3 - 2 * u2 + u) * h * t[i] + (-2 * u3 + 3 * u2) * p[i + 1][1] + (u3 - u2) * h * t[i + 1];
  };
}

const OPS = {
  exposure(o) { const k = 2 ** (o.stops || 0); return (c) => c.map((x) => Math.pow(Math.pow(clamp01(x), 2.2) * k, 1 / 2.2)); },
  gains(o) { const g = o.rgb || [1, 1, 1]; return (c) => [c[0] * g[0], c[1] * g[1], c[2] * g[2]]; },
  levels(o) {
    const ib = o.inBlack || 0, iw = o.inWhite == null ? 1 : o.inWhite, gm = o.gamma || 1, ob = o.outBlack || 0, ow = o.outWhite == null ? 1 : o.outWhite;
    return (c) => c.map((x) => ob + (ow - ob) * Math.pow(clamp01((x - ib) / (iw - ib)), 1 / gm));
  },
  contrast(o) {
    const a = o.amount == null ? 1 : o.amount, p = o.pivot || 0.45;
    const f = (x) => { x = clamp01(x); return x < p ? p * Math.pow(x / p, a) : 1 - (1 - p) * Math.pow((1 - x) / (1 - p), a); };
    return (c) => c.map(f);
  },
  saturation(o) { const s = o.amount == null ? 1 : o.amount; return (c) => { const l = luma(c); return c.map((x) => l + (x - l) * s); }; },
  vibrance(o) {
    const v = o.amount || 0;
    return (c) => { const mx = Math.max(...c), mn = Math.min(...c), sat = mx - mn, l = luma(c), k = 1 + v * (1 - sat) * (1 - sat); return c.map((x) => l + (x - l) * k); };
  },
  temp(o) { const a = o.amount || 0; return (c) => [c[0] * (1 + 0.1 * a), c[1] * (1 + 0.015 * a), c[2] * (1 - 0.12 * a)]; },
  tint(o) { const a = o.amount || 0; return (c) => [c[0] * (1 + 0.03 * a), c[1] * (1 - 0.08 * a), c[2] * (1 + 0.03 * a)]; },
  split(o) {
    const s = hex(o.shadows || '#808080'), h = hex(o.highlights || '#808080'), a = o.amount == null ? 0.3 : o.amount, bal = o.balance || 0;
    const sd = s.map((x) => x - luma(s)), hd = h.map((x) => x - luma(h));
    return (c) => {
      const l = clamp01(luma(c) - bal);
      const ws = (1 - l) * (1 - l), wh = l * l;
      return c.map((x, i) => x + a * (ws * sd[i] + wh * hd[i]));
    };
  },
  balance(o) {
    const L = o.lift || [0, 0, 0], G = o.gamma || [1, 1, 1], K = o.gain || [1, 1, 1];
    return (c) => c.map((x, i) => Math.pow(clamp01(x * K[i] + L[i] * (1 - x)), 1 / G[i]));
  },
  curves(o) {
    const all = o.all ? monoCurve(o.all) : null, ch = ['r', 'g', 'b'].map((k) => (o[k] ? monoCurve(o[k]) : null));
    return (c) => c.map((x, i) => { let y = all ? all(clamp01(x)) : x; if (ch[i]) y = ch[i](clamp01(y)); return y; });
  },
  mono(o) { const w = o.weights || [0.2126, 0.7152, 0.0722]; return (c) => { const v = w[0] * c[0] + w[1] * c[1] + w[2] * c[2]; return [v, v, v]; }; },
  colorize(o) {
    const col = hex(o.color), lc = luma(col), a = o.amount == null ? 1 : o.amount;
    return (c) => { const l = luma(c); return c.map((x, i) => x + a * (l * col[i] / lc - x)); };
  },
  gradient(o) {
    const st = o.stops.map(([p, h]) => [p, hex(h)]).sort((a, b) => a[0] - b[0]), a = o.amount == null ? 1 : o.amount;
    const at = (l) => {
      if (l <= st[0][0]) return st[0][1];
      for (let i = 0; i < st.length - 1; i++) if (l <= st[i + 1][0]) { const u = (l - st[i][0]) / (st[i + 1][0] - st[i][0]); return st[i][1].map((x, k) => x + (st[i + 1][1][k] - x) * u); }
      return st[st.length - 1][1];
    };
    return (c) => { const g = at(clamp01(luma(c))); return c.map((x, i) => x + a * (g[i] - x)); };
  },
  hue(o) { const d = o.deg || 0; return (c) => { const v = rgb2hsv(c.map(clamp01)); v[0] += d; return hsv2rgb(v); }; },
  select(o) {
    const hc = o.hue || 0, w = o.width || 30, hs = o.hueShift || 0, sm = o.sat == null ? 1 : o.sat, lm = o.lum || 0;
    return (c) => {
      const v = rgb2hsv(c.map(clamp01));
      let d = Math.abs(v[0] - hc) % 360; if (d > 180) d = 360 - d;
      if (d >= w) return c;
      const wt = (0.5 + 0.5 * Math.cos(Math.PI * d / w)) * smooth(0.02, 0.2, v[1]);
      return hsv2rgb([v[0] + hs * wt, clamp01(v[1] * (1 + (sm - 1) * wt)), clamp01(v[2] + lm * wt)]);
    };
  },
  mixer(o) { const m = o.m; return (c) => m.map((row) => row[0] * c[0] + row[1] * c[1] + row[2] * c[2]); },
};

function validateOps(ops) {
  const errs = [];
  ops.forEach((o, i) => {
    if (!o || !OPS[o.op]) errs.push(`#${i}: عملية مجهولة «${o && o.op}»`);
    else { try { OPS[o.op](o); } catch (e) { errs.push(`#${i} ${o.op}: ${e.message}`); } }
  });
  return errs;
}

/** دالة لون واحدة من قائمة عمليات (مع قوة 0..1 = خلط مع الأصل). */
function compile(ops, strength = 1) {
  const fns = ops.map((o) => { if (!OPS[o.op]) throw new Error(`عملية مجهولة: ${o.op}`); return OPS[o.op](o); });
  const s = Math.max(0, Math.min(1, Number(strength)));
  return (c) => {
    let x = c.slice();
    for (const f of fns) x = f(x);
    x = x.map(clamp01);
    return s === 1 ? x : c.map((v, i) => v + (x[i] - v) * s);
  };
}

// 4 منازل عشرية (دقة 0.0001 — أنعم من خطوة 10-bit) بلا أصفار زايدة: الملف أصغر بالثلث
const num = (x) => { const t = x.toFixed(4).replace(/\.?0+$/, ''); return t === '-0' ? '0' : t; };

/** نص ملف .cube (ترتيب Adobe: الأحمر أسرع). */
function cubeText(fn, size = 33, title = 'I/O Studio look') {
  const lines = [`TITLE "${String(title).replace(/"/g, "'")}"`, '# I/O Studio — generated by engine/grade.js (Rec.709 in → Rec.709 out)', `LUT_3D_SIZE ${size}`, 'DOMAIN_MIN 0.0 0.0 0.0', 'DOMAIN_MAX 1.0 1.0 1.0'];
  const d = size - 1;
  for (let b = 0; b < size; b++) for (let g = 0; g < size; g++) for (let r = 0; r < size; r++) {
    const o = fn([r / d, g / d, b / d]);
    lines.push(`${num(o[0])} ${num(o[1])} ${num(o[2])}`);
  }
  return lines.join('\n') + '\n';
}

function parseCube(text) {
  let size = 0; const data = [];
  for (const ln of text.split(/\r?\n/)) {
    const s = ln.trim();
    if (!s || s.startsWith('#')) continue;
    const m = /^LUT_3D_SIZE\s+(\d+)/.exec(s);
    if (m) { size = +m[1]; continue; }
    if (/^[A-Z_]/.test(s)) continue;
    data.push(s.split(/\s+/).map(Number));
  }
  return { size, data };
}

// ───────────────────────── المؤثرات (ffmpeg) ─────────────────────────

let LBL = 0;
const L = (p) => `${p}${++LBL}`;

/** كل مؤثر = دالة (in, out, {w,h}) → جزء filtergraph. */
const FX = {
  grain: (p, a, b) => `[${a}]noise=alls=${Math.round(p.amount || 8)}:allf=t${p.uniform ? '+u' : ''}[${b}]`,
  vignette: (p, a, b) => `[${a}]vignette=angle=${(p.angle || 0.62).toFixed(3)}[${b}]`,
  sharpen: (p, a, b) => `[${a}]unsharp=5:5:${(p.amount || 0.8).toFixed(2)}:5:5:0[${b}]`,
  chroma: (p, a, b, s) => { const k = Math.max(1, Math.round((p.px || 3) * s.w / 1080)); return `[${a}]format=gbrp,rgbashift=rh=-${k}:bh=${k}[${b}]`; },
  letterbox: (p, a, b) => {
    const r = p.ratio || 2.39, bar = `max(0,(ih-iw/${r})/2)`;
    return `[${a}]drawbox=x=0:y=0:w=iw:h='${bar}':color=black:t=fill,drawbox=x=0:y='ih-${bar}':w=iw:h='${bar}':color=black:t=fill[${b}]`;
  },
  glow: (p, a, b, s) => {
    const x = L('g'), y = L('g'), z = L('g'), sg = Math.max(4, Math.round(s.w / 45));
    return `[${a}]format=gbrp,split[${x}][${y}];[${y}]curves=all='0/0 0.55/0.05 1/1',gblur=sigma=${sg}[${z}];[${x}][${z}]blend=all_mode=screen:all_opacity=${(p.opacity || 0.35).toFixed(2)}[${b}]`;
  },
  halation: (p, a, b, s) => {
    const x = L('h'), y = L('h'), z = L('h'), sg = Math.max(3, Math.round(s.w / 70));
    return `[${a}]format=gbrp,split[${x}][${y}];[${y}]curves=all='0/0 0.7/0 1/1',gblur=sigma=${sg},colorchannelmixer=rr=1:gg=0.35:bb=0.15[${z}];[${x}][${z}]blend=all_mode=screen:all_opacity=${(p.opacity || 0.4).toFixed(2)}[${b}]`;
  },
  soften: (p, a, b, s) => {
    const x = L('s'), y = L('s'), z = L('s'), sg = Math.max(2, Math.round(s.w / 220));
    return `[${a}]split[${x}][${y}];[${y}]gblur=sigma=${sg}[${z}];[${x}][${z}]blend=all_mode=normal:all_opacity=${(p.opacity || 0.5).toFixed(2)}[${b}]`;
  },
  vhs: (p, a, b, s) => {
    const k = Math.max(2, Math.round(4 * s.w / 1080)), line = Math.max(2, Math.round(4 * s.h / 1920));
    return `[${a}]format=gbrp,rgbashift=rh=-${k}:bh=${k}:rv=1,gblur=sigma=${(1.2 * s.w / 1080).toFixed(2)}:sigmaV=0.01,eq=saturation=1.15:contrast=0.95,noise=alls=10:allf=t,drawgrid=w=iw:h=${line}:t=1:color=black@0.22[${b}]`;
  },
  scratches: (p, a, b, s) => {
    // طبقة رمادية (خدوش عمودية + غبار) من geq random() — تتغيّر كل إطار. تنضاف للإضاءة بس (lut2) فالألوان تبقى.
    // الخدش: صف واحد بدقة ربع ← يتمدد عمودياً (≈ 1.5% من الأعمدة) · الغبار: ≈ 0.04% نقاط بدقة ربع.
    const x = L('o'), y = L('o'), d = L('o'), z = L('o'), dz = L('o'), q = L('o'), m = L('o');
    const sw = Math.max(16, Math.round(s.w / 4)), sh = Math.max(16, Math.round(s.h / 4));
    return `[${a}]eq=brightness='0.02*sin(2*PI*t*9)+0.01*sin(2*PI*t*23)':eval=frame,format=yuv420p,split=3[${x}][${y}][${d}];` +
      `[${y}]scale=${sw}:1,format=gray,geq=lum='150*gt(random(1),0.985)',scale=${s.w}:${s.h}:flags=neighbor,gblur=sigma=0.6[${z}];` +
      `[${d}]scale=${sw}:${sh},format=gray,geq=lum='255*gt(random(1),0.9996)',scale=${s.w}:${s.h}:flags=bicubic,gblur=sigma=0.8[${dz}];` +
      `[${z}][${dz}]lut2=c0='max(x,y)',format=yuv420p[${q}];` +
      `[${x}][${q}]lut2=c0='x+(255-x)*max(0,y-16)/239*0.7':c1=x:c2=x[${m}];[${m}]null[${b}]`;
  },
  leak: (p, a, b, s) => {
    const x = L('k'), y = L('k'), z = L('k'), m = L('k');
    const g = (cx, cy, r, amp) => `${amp}*exp(-(pow(X/W-(${cx}),2)+pow(Y/H-(${cy}),2))/${r})`;
    const cx = '0.92+0.06*sin(T*0.6)', cy = '0.18+0.05*sin(T*0.43)';
    return `[${a}]format=gbrp,split[${x}][${y}];[${y}]scale=64:-2,geq=r='${g(cx, cy, 0.09, 255)}+${g('0.05', '0.85', 0.05, 120)}':g='${g(cx, cy, 0.05, 150)}+${g('0.05', '0.85', 0.03, 50)}':b='${g(cx, cy, 0.02, 60)}',scale=${s.w}:${s.h}:flags=bicubic,format=gbrp[${z}];` +
      `[${x}][${z}]blend=all_mode=screen:all_opacity=${(p.opacity || 0.75).toFixed(2)}[${m}];[${m}]null[${b}]`;
  },
};

/**
 * يبني filtergraph كامل: [0:v] → lut3d (لو فيه لون) → المؤثرات → [vout].
 * lutFile = اسم الملف (نسبي لمجلد التشغيل).
 */
function buildGraph(cat, look, { w, h, lutFile = 'look.cube', input = '0:v', output = 'vout', pre = '' } = {}) {
  LBL = 0;
  const parts = [];
  let cur = input;
  const next = () => L('v');
  if (pre) { const n = next(); parts.push(`[${cur}]${pre}[${n}]`); cur = n; }
  if (isLutable(cat, look)) { const n = next(); parts.push(`[${cur}]lut3d=file=${lutFile}:interp=tetrahedral[${n}]`); cur = n; }
  for (const f of look.fx || []) {
    if (!FX[f.name]) throw new Error(`مؤثر مجهول: ${f.name}`);
    const n = next(); parts.push(FX[f.name](f, cur, n, { w, h })); cur = n;
  }
  parts.push(`[${cur}]format=yuv420p[${output}]`);
  return parts.join(';');
}

// ───────────────────────── ffmpeg ─────────────────────────

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; o[k] = v; } else o._.push(a);
  }
  return o;
}

function run(cmd, a, opts = {}) {
  const r = spawnSync(cmd, a, { encoding: opts.binary ? 'buffer' : 'utf8', maxBuffer: 1 << 29, cwd: opts.cwd });
  if (r.error) throw new Error(`${cmd} مو منصّب أو ما يشتغل: ${r.error.message}`);
  if (r.status !== 0 && !opts.quiet) throw new Error(`${cmd} فشل:\n${String(r.stderr || '').split('\n').slice(-14).join('\n')}`);
  return r;
}

const IMG = /\.(jpe?g|png|webp|bmp|tiff?)$/i;

function probe(file) {
  const j = JSON.parse(run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', file]).stdout);
  const v = j.streams.find((s) => s.codec_type === 'video');
  if (!v) throw new Error(`ما لگيت صورة/فيديو بـ${file}`);
  let w = v.width, h = v.height;
  const rot = Math.abs(Number((v.tags && v.tags.rotate) || (v.side_data_list || []).map((d) => d.rotation).find((x) => x != null) || 0));
  if (rot === 90 || rot === 270) [w, h] = [h, w];
  return { w, h, dur: Number(j.format.duration) || 0, audio: j.streams.some((s) => s.codec_type === 'audio'), image: IMG.test(file) || j.streams.length === 1 && (Number(j.format.duration) || 0) < 0.1 };
}

function tmpdir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'io-grade-')); }

function writeLut(cat, look, dir, strength = 1, extraOps = []) {
  const ops = extraOps.concat(colorOps(cat, look));
  fs.writeFileSync(path.join(dir, 'look.cube'), cubeText(compile(ops, strength), 33, look.id));
}

function encodeArgs(outFile, isImage, hasAudio) {
  if (isImage) return ['-frames:v', '1', ...(/\.jpe?g$/i.test(outFile) ? ['-q:v', '2'] : []), outFile];
  return ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
    ...(hasAudio ? ['-map', '0:a?', '-c:a', 'copy'] : []), '-movflags', '+faststart', outFile];
}

/** يطبّق لوك (أو لوك + تصحيح تلقائي) على ملف. */
function applyLook(cat, inFile, look, { strength = 1, out, extraOps = [], quiet = false } = {}) {
  const inAbs = path.resolve(inFile);
  const p = probe(inAbs);
  const outAbs = path.resolve(out || inAbs.replace(/(\.[^.]+)?$/, (m) => `-${look ? look.id : 'auto'}${p.image ? m || '.jpg' : '.mp4'}`));
  const dir = tmpdir();
  try {
    const L0 = look || { id: 'auto', ops: [] };
    writeLut(cat, L0, dir, strength, extraOps);
    const lut = { ...L0, ops: extraOps.concat(colorOps(cat, L0)), base: undefined };
    const graph = buildGraph(cat, lut, { w: p.w, h: p.h });
    fs.writeFileSync(path.join(dir, 'graph.txt'), graph);
    run('ffmpeg', ['-v', 'error', '-y', '-i', inAbs, '-filter_complex_script', 'graph.txt', '-map', '[vout]', ...encodeArgs(outAbs, p.image, p.audio)], { cwd: dir });
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  if (!quiet) console.log(`✅ ${outAbs}`);
  return outAbs;
}

// ───────────────────────── تصحيح تلقائي ─────────────────────────

/** يقرا عيّنة صغيرة من الإطارات (RGB) ويحسب: توازن أبيض (gray-world) + مستويات + سطوع. */
function autoOps(inFile) {
  const p = probe(inFile);
  const W = 160, H = Math.max(2, Math.round(W * p.h / p.w / 2) * 2);
  const n = p.image ? 1 : 8;
  const frames = [];
  for (let i = 0; i < n; i++) {
    const t = p.image ? 0 : p.dur * (i + 0.5) / n;
    const r = run('ffmpeg', ['-v', 'error', ...(p.image ? [] : ['-ss', t.toFixed(3)]), '-i', inFile, '-frames:v', '1', '-vf', `scale=${W}:${H}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { binary: true, quiet: true });
    if (r.stdout && r.stdout.length >= W * H * 3) frames.push(r.stdout.subarray(0, W * H * 3));
  }
  if (!frames.length) throw new Error('ما قدرت أقرا إطارات من الملف');
  return autoFromPixels(frames);
}

function pct(hist, total, q) {
  let acc = 0; const lim = total * q;
  for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= lim) return i / 255; }
  return 1;
}

function autoFromPixels(frames) {
  const hist = new Array(256).fill(0); let sr = 0, sg = 0, sb = 0, cnt = 0, total = 0;
  for (const f of frames) for (let i = 0; i < f.length; i += 3) {
    const r = f[i] / 255, g = f[i + 1] / 255, b = f[i + 2] / 255, l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    hist[Math.min(255, Math.round(l * 255))]++; total++;
    if (l > 0.12 && l < 0.9) { sr += r; sg += g; sb += b; cnt++; }
  }
  const ops = [], notes = [];
  if (cnt > 50) {
    const m = [sr / cnt, sg / cnt, sb / cnt], avg = (m[0] + m[1] + m[2]) / 3;
    const gains = m.map((x) => Math.max(0.88, Math.min(1.12, 1 + 0.6 * (avg / x - 1))));
    const dev = Math.max(...gains.map((g) => Math.abs(g - 1)));
    if (dev > 0.015) {
      ops.push({ op: 'gains', rgb: gains.map((g) => +g.toFixed(4)) });
      notes.push(m[2] < m[0] ? 'الصورة مايلة للأصفر/الدافي — عدّلت التوازن' : 'الصورة مايلة للأزرق/البارد — عدّلت التوازن');
    }
  }
  const lo = pct(hist, total, 0.005), hi = pct(hist, total, 0.995), med = pct(hist, total, 0.5);
  const ib = lo > 0.03 ? Math.min(0.1, lo * 0.8) : 0, iw = hi < 0.94 ? Math.max(0.82, hi + (1 - hi) * 0.2) : 1;
  let gamma = 1;
  const medAfter = Math.max(0.02, (med - ib) / (iw - ib));
  if (medAfter < 0.36 || medAfter > 0.58) gamma = Math.max(0.8, Math.min(1.3, Math.log(medAfter) / Math.log(0.45)));
  if (ib || iw < 1 || gamma !== 1) {
    ops.push({ op: 'levels', inBlack: +ib.toFixed(4), inWhite: +iw.toFixed(4), gamma: +(1 / gamma).toFixed(4) });
    if (ib) notes.push('الأسود رمادي/باهت — رجّعته أسود');
    if (iw < 1) notes.push('الأبيض مو واصل — فتحته');
    if (gamma > 1) notes.push('الصورة غامجة — فتّحت الوسط'); else if (gamma < 1) notes.push('الصورة محروقة شوي — هدّيت الوسط');
  }
  return { ops, notes, stats: { black: +lo.toFixed(3), white: +hi.toFixed(3), median: +med.toFixed(3) } };
}

// ───────────────────────── صورة عيّنة + معاينات ─────────────────────────

/** صورة اختبار محايدة مولّدة (سما، شمس، رمل، نبات، بشرتين، ألوان، تدرّج رمادي). */
function sampleImage(W = 720, H = 900) {
  const buf = Buffer.alloc(W * H * 3);
  let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
  const sky0 = hex('#2f6bb3'), sky1 = hex('#f2d6ae'), sand = hex('#d6a466'), sandD = hex('#a8733f'), leaf = hex('#3e7d36'), leafD = hex('#22501f');
  const skinA = hex('#e7b497'), skinB = hex('#8a5636'), shirtA = hex('#f2f2ee'), shirtB = hex('#1e2b4a');
  const patches = ['#c0392b', '#e67e22', '#f1c40f', '#27ae60', '#1abc9c', '#2e86c1', '#8e44ad', '#808080'].map(hex);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = x / W, v = y / H; let c;
    const horizon = 0.44 + 0.025 * Math.sin(u * 7 + 1) + 0.015 * Math.sin(u * 17);
    if (v < horizon) {
      c = mix(sky0, sky1, Math.pow(v / horizon, 1.6));
      const d = Math.hypot(u - 0.78, (v - 0.22) * H / W);
      c = c.map((k, i) => k + [1, 0.85, 0.55][i] * (Math.exp(-d * d / 0.004) * 0.9 + Math.exp(-d * d / 0.03) * 0.25));
    } else if (v < 0.74) {
      const dune = 0.5 + 0.5 * Math.sin(u * 9 + v * 30 + Math.sin(u * 3) * 2);
      c = mix(sandD, sand, 0.35 + 0.65 * dune * (0.6 + 0.4 * (v - horizon) / (0.74 - horizon)));
      const lb = Math.hypot((u - 0.12) / 0.16, (v - 0.56) / 0.12);
      if (lb < 1) c = mix(leafD, leaf, 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(x * 0.9) * Math.sin(y * 0.7)) * (1 - lb * 0.5));
    } else if (v < 0.83) {
      c = patches[Math.min(7, Math.floor(u * 8))];
      if ((u * 8) % 1 < 0.04) c = [0.08, 0.08, 0.08];
    } else if (v < 0.93) {
      c = Array(3).fill(Math.min(10, Math.floor(u * 11)) / 10);
    } else c = [0.03, 0.03, 0.03];
    // شخصين: بشرة فاتحة وبشرة سمرا
    for (const [cx, sk, sh] of [[0.42, skinA, shirtA], [0.68, skinB, shirtB]]) {
      const fx = (u - cx) / 0.075, fy = (v - 0.47) / 0.07;
      const body = Math.hypot((u - cx) / 0.12, (v - 0.68) / 0.13);
      if (body < 1 && v < 0.74 && v > 0.55) c = mix(sh, sh.map((k) => k * 0.75), Math.max(0, (u - cx) / 0.12));
      const r2 = fx * fx + fy * fy;
      if (r2 < 1) { const shade = 0.78 + 0.32 * (1 - r2) - 0.12 * fx; c = sk.map((k) => k * shade); }
    }
    const nz = (rnd() - 0.5) * 0.02, o = (y * W + x) * 3;
    for (let i = 0; i < 3; i++) buf[o + i] = Math.round(clamp01(c[i] + nz) * 255);
  }
  return { w: W, h: H, rgb: buf };
}

function writeImage(img, out) {
  const head = Buffer.from(`P6\n${img.w} ${img.h}\n255\n`);
  const dir = tmpdir(); const ppm = path.join(dir, 'x.ppm');
  fs.writeFileSync(ppm, Buffer.concat([head, img.rgb]));
  run('ffmpeg', ['-v', 'error', '-y', '-i', ppm, ...(/\.jpe?g$/i.test(out) ? ['-q:v', '2'] : []), out]);
  fs.rmSync(dir, { recursive: true, force: true });
}

function fontFile() { return FONT_CANDIDATES.find((f) => fs.existsSync(f)); }

/** إطار واحد مصغّر من فيديو أو صورة. */
function grabFrame(inFile, out, w, at) {
  const p = probe(inFile);
  const t = at != null ? Number(at) : p.image ? 0 : Math.min(p.dur * 0.3, 3);
  run('ffmpeg', ['-v', 'error', '-y', ...(p.image ? [] : ['-ss', String(t)]), '-i', inFile, '-frames:v', '1', '-vf', `scale=${w}:-2:flags=lanczos`, out]);
  return probe(out);
}

/** يلوّن صورة ثابتة بلوك (للمعاينات ولوحة المقارنة). */
function renderStill(cat, look, inImg, outImg, { label, w, h, strength = 1 } = {}) {
  const dir = tmpdir();
  try {
    if (look && isLutable(cat, look)) writeLut(cat, look, dir, strength);
    let graph = look ? buildGraph(cat, look, { w, h, output: 'g' }) : '[0:v]format=yuv420p[g]';
    if (label) {
      // drawtext يرتّب السطر من اليسار، فالأقواس تنقلب بالعربي — نبدّلها بفاصل
      fs.writeFileSync(path.join(dir, 'label.txt'), String(label).replace(/\s*\(([^)]*)\)/g, ' · $1').trim());
      const fs_ = Math.max(12, Math.round(w / 15));
      const ff = fontFile();
      graph += `;[g]drawbox=x=0:y=ih-${Math.round(fs_ * 2)}:w=iw:h=${Math.round(fs_ * 2)}:color=black@0.62:t=fill,drawtext=${ff ? `fontfile=${ff}:` : ''}textfile=label.txt:fontsize=${fs_}:fontcolor=white:x=(w-text_w)/2:y=h-${Math.round(fs_ * 1.55)}[vout]`;
    } else graph = graph.replace(/\[g\]$/, '[vout]');
    fs.writeFileSync(path.join(dir, 'graph.txt'), graph);
    run('ffmpeg', ['-v', 'error', '-y', '-i', path.resolve(inImg), '-filter_complex_script', 'graph.txt', '-map', '[vout]', '-frames:v', '1', ...(/\.jpe?g$/i.test(outImg) ? ['-q:v', '3'] : []), path.resolve(outImg)], { cwd: dir });
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

function contactSheet(cat, inFile, { looks, out = 'looks-sheet.jpg', cols = 6, w = 320, at } = {}) {
  const dir = tmpdir();
  try {
    const base = path.join(dir, 'base.png');
    const p = grabFrame(path.resolve(inFile), base, w, at);
    const list = looks && looks.length ? looks.map((id) => getLook(cat, id)) : cat.looks;
    const tiles = [null, ...list];
    tiles.forEach((lk, i) => {
      renderStill(cat, lk, base, path.join(dir, `t${String(i).padStart(3, '0')}.png`), { label: lk ? lk.ar : 'الأصل — بلا لون', w: p.w, h: p.h });
    });
    const c = Math.min(cols, tiles.length), r = Math.ceil(tiles.length / c);
    run('ffmpeg', ['-v', 'error', '-y', '-framerate', '1', '-i', path.join(dir, 't%03d.png'), '-vf', `tile=${c}x${r}:padding=6:margin=6:color=0x121110`, '-frames:v', '1', '-q:v', '3', path.resolve(out)]);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  return path.resolve(out);
}

function build(cat) {
  const lutDir = path.join(LIB, 'luts'), prevDir = path.join(LIB, 'previews');
  fs.mkdirSync(lutDir, { recursive: true }); fs.mkdirSync(prevDir, { recursive: true });
  const sample = path.join(LIB, 'sample.jpg');
  const img = sampleImage();
  writeImage(img, sample);
  let nl = 0;
  for (const lk of cat.looks) {
    const errs = validateOps(colorOps(cat, lk));
    if (errs.length) throw new Error(`${lk.id}: ${errs.join('، ')}`);
    if (lk.kind === 'color') { fs.writeFileSync(path.join(lutDir, `${lk.id}.cube`), cubeText(compile(colorOps(cat, lk)), cat.lut_size || 33, lk.en)); nl++; }
    renderStill(cat, lk, sample, path.join(prevDir, `${lk.id}.jpg`), { w: img.w, h: img.h });
    process.stdout.write('.');
  }
  // ملفات cube قديمة للوكات انشالت
  for (const f of fs.readdirSync(lutDir)) if (!cat.looks.some((l) => l.kind === 'color' && `${l.id}.cube` === f)) fs.rmSync(path.join(lutDir, f));
  const page = path.join(ROOT, 'web', 'looks.html');
  if (fs.existsSync(page)) {
    let s = fs.readFileSync(page, 'utf8');
    const head = '<script id="catalog" type="application/json">', a = s.indexOf(head), b = s.indexOf('</script>', a);
    if (a >= 0 && b > a) { s = s.slice(0, a + head.length) + JSON.stringify(cat).replace(/</g, '\\u003c') + s.slice(b); fs.writeFileSync(page, s); }
  }
  console.log(`\n✅ ${nl} ملف .cube → ${lutDir}\n✅ ${cat.looks.length} معاينة → ${prevDir}`);
}

// ───────────────────────── CLI ─────────────────────────

function main() {
  const a = args(process.argv.slice(2));
  const cmd = a._[0];
  const cat = loadCatalog();
  if (!cmd || cmd === 'help' || a.help) { console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 17).join('\n')); return; }
  if (cmd === 'list') {
    for (const [g, gname] of Object.entries(cat.groups)) {
      const ls = cat.looks.filter((l) => l.group === g && (!a.group || a.group === g));
      if (!ls.length) continue;
      console.log(`\n■ ${gname} (${g})`);
      for (const l of ls) console.log(`  ${l.id.padEnd(18)} ${l.ar}${l.kind === 'fx' ? '  [مؤثر]' : l.kind === 'combo' ? '  [لون+مؤثر]' : ''}${l.skin_safe ? '  ✓بشرة' : ''} — ${l.use}`);
    }
    console.log(`\n${cat.looks.length} لوك · node engine/grade.js preview <ملف> --looks a,b,c`);
    return;
  }
  if (cmd === 'lut') {
    const lk = getLook(cat, a._[1]);
    if (!isLutable(cat, lk)) {
      console.error(`«${lk.ar}» مؤثر مو لون (${(lk.fx || []).map((f) => f.name).join('، ')}) — LUT يغيّر الألوان بس، ما يقدر يسوي حبيبات أو تظليل أو توهج أو شرائط.\nطبّقه بـ: node engine/grade.js apply <ملف> --look ${lk.id}\nأو بـCapCut/Premiere من مؤثراتهم الجاهزة (Grain / Vignette).`);
      process.exit(2);
    }
    const size = Number(a.size || 33);
    const out = path.resolve(a.out || `${lk.id}.cube`);
    fs.writeFileSync(out, cubeText(compile(colorOps(cat, lk), a.strength == null ? 1 : Number(a.strength)), size, lk.en));
    console.log(`✅ ${out}  (${size}³)`);
    if (lk.fx && lk.fx.length) console.log(`ℹ️ الملف فيه اللون بس — المؤثرات (${lk.fx.map((f) => f.name).join('، ')}) ضيفها من البرنامج نفسه.`);
    return;
  }
  if (cmd === 'apply') {
    if (!a._[1] || !a.look) throw new Error('الاستعمال: node engine/grade.js apply <ملف> --look <id> [--strength 0.7] [--out x.mp4]');
    applyLook(cat, a._[1], getLook(cat, a.look), { strength: a.strength == null ? 1 : Number(a.strength), out: a.out });
    return;
  }
  if (cmd === 'auto') {
    if (!a._[1]) throw new Error('الاستعمال: node engine/grade.js auto <ملف> [--look <id>] [--out x.mp4]');
    const r = autoOps(path.resolve(a._[1]));
    console.log(`📊 الأسود ${r.stats.black} · الوسط ${r.stats.median} · الأبيض ${r.stats.white}`);
    console.log(r.notes.length ? r.notes.map((n) => '  • ' + n).join('\n') : '  • الصورة مضبوطة — ما يحتاج تصحيح');
    if (a.dry) { console.log(JSON.stringify(r.ops)); return; }
    const lk = a.look ? getLook(cat, a.look) : null;
    const strength = a.strength == null ? 1 : Number(a.strength);
    if (lk) {
      // التصحيح كامل دايماً، والقوة على اللوك بس
      const fnAuto = compile(r.ops), fnLook = compile(colorOps(cat, lk), strength);
      const merged = { ...lk, id: `auto-${lk.id}`, base: undefined, ops: [{ op: '__fn', fn: (c) => fnLook(fnAuto(c)) }] };
      return applyMerged(cat, a._[1], merged, a.out);
    }
    applyLook(cat, a._[1], { id: 'auto', ops: r.ops }, { out: a.out });
    return;
  }
  if (cmd === 'preview') {
    if (!a._[1]) throw new Error('الاستعمال: node engine/grade.js preview <فيديو|صورة> [--looks a,b] [--out sheet.jpg]');
    const out = contactSheet(cat, a._[1], { looks: a.looks ? String(a.looks).split(',').map((s) => s.trim()).filter(Boolean) : null, out: a.out || 'looks-sheet.jpg', cols: Number(a.cols || 6), w: Number(a.w || 320), at: a.at });
    console.log(`✅ ${out}`);
    return;
  }
  if (cmd === 'build') { build(cat); return; }
  throw new Error(`أمر مجهول: ${cmd} — الأوامر: list · preview · apply · lut · auto · build`);
}

/** تطبيق لوك فيه دالة جاهزة (auto + look). */
OPS.__fn = (o) => o.fn;
function applyMerged(cat, inFile, look, out) {
  return applyLook(cat, inFile, look, { out: out || path.resolve(inFile).replace(/(\.[^.]+)?$/, (m) => `-${look.id}${IMG.test(inFile) ? m : '.mp4'}`) });
}

module.exports = { loadCatalog, getLook, colorOps, isLutable, compile, cubeText, parseCube, buildGraph, validateOps, monoCurve, autoFromPixels, sampleImage, OPS, FX, hex };

if (require.main === module) {
  try { main(); } catch (e) { console.error('❌ ' + e.message); process.exit(1); }
}
