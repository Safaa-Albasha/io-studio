/*
 * I/O Studio — animated lesson scenes («مشهد درس»).
 * A lesson is a list of beats. Each beat: a cartoon character says a line in a
 * speech bubble, while a big element appears, morphs into another (ب → 🦆), or
 * a set of objects is counted one by one.
 *
 * Lessons library extensions: board styles (chalkboard «طباشير», whiteboard,
 * paper, cartoon), drawing beats that are drawn on with a chalk/marker/pencil
 * tip (draw, write, highlight, label, erase), math (numberline, fraction, grid,
 * axes + plot with a safe expression parser, geometry, equation, table),
 * physics simulations computed from t (projectile, pendulum, incline, spring,
 * circuit, wave, orbit, lens, ray, freefall) and other subjects (chemistry,
 * biology, geography, timeline, alphabet tracing). Board items stay on the
 * board across beats until an `erase` beat (or a big-stage beat) clears it.
 *
 * drawScene(ctx, scene, t) is a pure function of time t (seconds), so the same
 * scene plays live in the studio and renders frame-exact to MP4 headlessly.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.IoScene = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const FORMATS = { '9:16': [1080, 1920], '16:9': [1920, 1080], '1:1': [1080, 1080], '3:4': [1080, 1440] };
  const DEFAULT_THEME = { bg: '#FFF7EC', ink: '#2A2622', accent: '#E0663A', accent2: '#2F7FBF', soft: '#F3E3CF', font: 'Cairo, Tajawal, "Noto Naskh Arabic", "Segoe UI", sans-serif' };
  const DEFAULT_CHAR = { name: '', gender: 'female', skin: '#F1C6A3', hair: '#3A2A22', shirt: '#E0663A', hijab: '', ghutra: '', beard: false, position: 'right' };
  const GENDERS = ['female', 'male'];
  const AR = '٠١٢٣٤٥٦٧٨٩';
  const MOODS = ['happy', 'surprised', 'thinking', 'sad', 'neutral'];

  // ------------------------------------------------------------ styles
  const STYLES = ['cartoon', 'chalkboard', 'whiteboard', 'paper'];
  const PALETTES = {
    cartoon: { theme: {}, colors: { white: '#FFFFFF', black: '#2A2622', yellow: '#E8A90C', blue: '#2F7FBF', red: '#D9483B', green: '#2E9B5B', orange: '#E0663A', pink: '#D9568E', purple: '#7E57C2', gray: '#8D8780', brown: '#8B5A2B' } },
    chalkboard: {
      theme: { bg: '#26392F', ink: '#F3F0E7', accent: '#F7D774', accent2: '#93D0EE', soft: '#3A5446', card: '#2E4639', good: '#A6E3A1', goodBg: '#35563F' },
      colors: { white: '#F3F0E7', black: '#F3F0E7', yellow: '#F7D774', blue: '#93D0EE', red: '#F4978E', green: '#A6E3A1', orange: '#F8B878', pink: '#F6AECB', purple: '#C9B3F2', gray: '#B4BFB8', brown: '#D9B48F' },
    },
    whiteboard: {
      theme: { bg: '#F8F9F7', ink: '#1F2933', accent: '#D7263D', accent2: '#1C5FAD', soft: '#E1E5E8', card: '#FFFFFF', good: '#1F8A4C', goodBg: '#E3F4E8' },
      colors: { white: '#1F2933', black: '#1F2933', yellow: '#D99A00', blue: '#1C5FAD', red: '#D7263D', green: '#1F8A4C', orange: '#E0701A', pink: '#C8378A', purple: '#6B3FA0', gray: '#7B8794', brown: '#8B5A2B' },
    },
    paper: {
      theme: { bg: '#FBF8F0', ink: '#27313D', accent: '#D2502A', accent2: '#2A64AA', soft: '#CFE0EE', card: '#FFF3B0', good: '#2E8B57', goodBg: '#E2F2E6' },
      colors: { white: '#27313D', black: '#27313D', yellow: '#C99500', blue: '#2A64AA', red: '#D2502A', green: '#2E8B57', orange: '#DD7A1E', pink: '#C2417F', purple: '#6D45A6', gray: '#7D8590', brown: '#8B5A2B' },
    },
  };
  const LINE_W = { cartoon: 7, chalkboard: 7.5, whiteboard: 6, paper: 5 };
  const styleOf = (scene) => (STYLES.includes(scene && scene.style) ? scene.style : 'cartoon');

  /** The scene with its effective theme for the chosen style (palette + card colours). */
  const styledCache = new WeakMap();
  function styled(scene) {
    let s = styledCache.get(scene);
    if (s) return s;
    const st = styleOf(scene);
    const base = { card: '#FFFFFF', good: '#2E9B5B', goodBg: '#DFF3E6' };
    const theme = st === 'cartoon'
      ? Object.assign(base, scene.theme, scene.palette || {})
      : Object.assign(base, scene.theme, PALETTES[st].theme, scene.palette || {});
    s = Object.assign({}, scene, { theme, board: scene.board || {}, character: scene.character || DEFAULT_CHAR });
    styledCache.set(scene, s);
    return s;
  }

  // ------------------------------------------------------------ small utils
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const easeOutBack = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
  const prog = (t, a, d) => clamp((t - a) / d, 0, 1);
  const TAU = Math.PI * 2;
  function rnd(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function hashStr(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }

  function digits(n, numerals) {
    const s = String(n);
    return numerals === 'arabic' ? s.replace(/\d/g, (d) => AR[d]) : s;
  }
  /** Engine-made numbers: rounded, with Arabic-Indic digits and ٫ when numerals = arabic. */
  function fmt(v, numerals, dec) {
    let s = typeof v === 'number' ? (dec === undefined ? String(Math.round(v * 100) / 100) : v.toFixed(dec)) : String(v);
    if (s === '-0' || /^-0\.0*$/.test(s)) s = s.slice(1);
    if (numerals === 'arabic') s = s.replace(/\d/g, (d) => AR[d]).replace(/\./g, '٫');
    return s;
  }

  // ------------------------------------------------------------ safe expression parser (no eval)
  const FUNCS = { sin: Math.sin, cos: Math.cos, tan: Math.tan, sqrt: Math.sqrt, abs: Math.abs, ln: Math.log, log: Math.log10, exp: Math.exp };
  const NAMES = ['sqrt', 'sin', 'cos', 'tan', 'abs', 'exp', 'log', 'ln', 'pi', 'x', 'e'];
  /**
   * compileExpr("2x^2 - 3sin(x) + sqrt(abs(x))") → f(x).
   * + - * / ^, unary minus, ( ), implicit multiplication (2x, 2(x+1), 3sin(x)),
   * sin cos tan sqrt abs ln log exp, pi (π), e, x (or س). Throws an Arabic message.
   */
  function compileExpr(src) {
    const s = String(src == null ? '' : src).toLowerCase().replace(/\s+/g, '').replace(/[×·]/g, '*').replace(/÷/g, '/')
      .replace(/[−–]/g, '-').replace(/π/g, 'pi').replace(/س/g, 'x').replace(/\*\*/g, '^');
    if (!s) throw new Error('المعادلة فارغة');
    if (s.length > 200) throw new Error('المعادلة طويلة (200 حرف بالكثير)');
    const toks = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/[0-9.]/.test(c)) {
        const m = s.slice(i).match(/^(\d+\.?\d*|\.\d+)/);
        if (!m) throw new Error(`رقم غلط عند «${s.slice(i, i + 6)}»`);
        toks.push({ t: 'n', v: parseFloat(m[1]) }); i += m[1].length; continue;
      }
      if ('+-*/^()'.includes(c)) { toks.push({ t: c }); i++; continue; }
      const name = NAMES.find((n) => s.startsWith(n, i));
      if (!name) throw new Error(`رمز مو مفهوم «${s.slice(i, i + 6)}» — المسموح: + - * / ^ ( ) sin cos tan sqrt abs ln log exp pi x`);
      toks.push(FUNCS[name] ? { t: 'f', v: name } : { t: 'id', v: name }); i += name.length;
    }
    let pos = 0;
    const peek = () => toks[pos];
    const eat = (t) => { if (!toks[pos] || toks[pos].t !== t) throw new Error(`متوقع «${t}»`); pos++; };
    const startsPrimary = (k) => k && (k.t === 'n' || k.t === 'id' || k.t === 'f' || k.t === '(');
    function expr() {
      let a = term();
      while (peek() && (peek().t === '+' || peek().t === '-')) {
        const op = toks[pos++].t, b = term(), l = a;
        a = op === '+' ? (x) => l(x) + b(x) : (x) => l(x) - b(x);
      }
      return a;
    }
    function term() {
      let a = unary();
      for (;;) {
        const k = peek();
        if (k && (k.t === '*' || k.t === '/')) { pos++; const b = unary(), l = a; a = k.t === '*' ? (x) => l(x) * b(x) : (x) => l(x) / b(x); }
        else if (startsPrimary(k)) { const b = power(), l = a; a = (x) => l(x) * b(x); }
        else return a;
      }
    }
    function unary() {
      const k = peek();
      if (k && k.t === '-') { pos++; const a = unary(); return (x) => -a(x); }
      if (k && k.t === '+') { pos++; return unary(); }
      return power();
    }
    function power() {
      const base = primary();
      if (peek() && peek().t === '^') { pos++; const ex = unary(); return (x) => Math.pow(base(x), ex(x)); }
      return base;
    }
    function primary() {
      const k = toks[pos++];
      if (!k) throw new Error('المعادلة ناقصة');
      if (k.t === 'n') { const v = k.v; return () => v; }
      if (k.t === 'id') { if (k.v === 'x') return (x) => x; const v = k.v === 'pi' ? Math.PI : Math.E; return () => v; }
      if (k.t === 'f') { const f = FUNCS[k.v]; eat('('); const a = expr(); eat(')'); return (x) => f(a(x)); }
      if (k.t === '(') { const a = expr(); eat(')'); return a; }
      throw new Error(`«${k.t}» بغير مكانه`);
    }
    const f = expr();
    if (pos !== toks.length) throw new Error(`زيادة بالمعادلة عند «${toks[pos].t}»`);
    return f;
  }

  // ------------------------------------------------------------ geometry helpers (board units 0..1000)
  const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  function polyLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += dist(pts[i - 1], pts[i]); return L; }
  function densify(pts, step) {
    if (!pts.length) return pts;
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.ceil(dist(a, b) / (step || 8)));
      for (let j = 1; j <= n; j++) out.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]);
    }
    return out;
  }
  function catmull(pts, seg, closed) {
    if (pts.length < 3) return pts.slice();
    seg = seg || 10;
    const n = pts.length, out = [];
    const P = (i) => (closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)]);
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      for (let j = 0; j < seg; j++) {
        const t = j / seg, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
      }
    }
    out.push(closed ? pts[0] : pts[n - 1]);
    return out;
  }
  function arcPts(cx, cy, rx, ry, a0, a1, n) {
    n = n || Math.max(8, Math.ceil(Math.abs(a1 - a0) * 16));
    const out = [];
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
    return out;
  }
  function cutPoly(pts, len) {
    const out = [pts[0]];
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const d = dist(pts[i - 1], pts[i]);
      if (acc + d >= len) { const f = d ? (len - acc) / d : 0; out.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]); return out; }
      acc += d; out.push(pts[i]);
    }
    return out;
  }
  function pointAt(pts, f) { const c = cutPoly(pts, polyLen(pts) * clamp(f, 0, 1)); return c[c.length - 1]; }
  function rrectPts(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    return [].concat(
      arcPts(x + w - r, y + r, r, r, -Math.PI / 2, 0, 6), arcPts(x + w - r, y + h - r, r, r, 0, Math.PI / 2, 6),
      arcPts(x + r, y + h - r, r, r, Math.PI / 2, Math.PI, 6), arcPts(x + r, y + r, r, r, Math.PI, Math.PI * 1.5, 6), [[x + w - r, y]]);
  }
  /** SVG-like path: M L H V C Q Z (and lowercase relative). Returns sub-paths of points. */
  function parsePath(d) {
    const toks = String(d).match(/[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
    const subs = [];
    let cur = null, x = 0, y = 0, sx = 0, sy = 0, cmd = null, i = 0;
    const num = () => { const v = parseFloat(toks[i++]); if (!isFinite(v)) throw new Error('رقم ناقص بالـ path'); return v; };
    while (i < toks.length) {
      if (/[a-z]/i.test(toks[i])) cmd = toks[i++];
      else if (!cmd) throw new Error('الـ path لازم يبدي بـ M');
      const rel = cmd === cmd.toLowerCase(), op = cmd.toUpperCase();
      if (op === 'Z') { if (cur) cur.push([sx, sy]); x = sx; y = sy; cur = null; continue; }
      if (op === 'M') { x = (rel ? x : 0) + num(); y = (rel ? y : 0) + num(); cur = [[x, y]]; subs.push(cur); sx = x; sy = y; cmd = rel ? 'l' : 'L'; continue; }
      if (!subs.length) throw new Error('الـ path لازم يبدي بـ M');
      if (!cur) { cur = [[x, y]]; subs.push(cur); }
      if (op === 'L') { x = (rel ? x : 0) + num(); y = (rel ? y : 0) + num(); cur.push([x, y]); }
      else if (op === 'H') { x = (rel ? x : 0) + num(); cur.push([x, y]); }
      else if (op === 'V') { y = (rel ? y : 0) + num(); cur.push([x, y]); }
      else if (op === 'Q' || op === 'C') {
        const ox = rel ? x : 0, oy = rel ? y : 0, n = op === 'Q' ? 2 : 3, c = [];
        for (let k = 0; k < n; k++) c.push([ox + num(), oy + num()]);
        const p0 = [x, y];
        for (let s = 1; s <= 16; s++) {
          const t = s / 16, m = 1 - t;
          cur.push(n === 2
            ? [m * m * p0[0] + 2 * m * t * c[0][0] + t * t * c[1][0], m * m * p0[1] + 2 * m * t * c[0][1] + t * t * c[1][1]]
            : [m * m * m * p0[0] + 3 * m * m * t * c[0][0] + 3 * m * t * t * c[1][0] + t * t * t * c[2][0], m * m * m * p0[1] + 3 * m * m * t * c[0][1] + 3 * m * t * t * c[1][1] + t * t * t * c[2][1]]);
        }
        x = c[n - 1][0]; y = c[n - 1][1];
      } else throw new Error(`أمر path مو مدعوم «${cmd}»`);
    }
    return subs.filter((s) => s.length > 1);
  }

  // ------------------------------------------------------------ Arabic letters for tracing
  // 1000×1000 box, baseline y≈630, strokes written right → left. Simple polylines,
  // smoothed when drawn. Dots are added after the strokes.
  const BOWL = [[770, 470], [758, 560], [715, 615], [600, 630], [420, 632], [300, 622], [250, 582], [238, 512]];
  const HAA = [[[660, 410], [560, 390], [430, 402]], [[430, 402], [560, 495]], [[560, 495], [430, 535], [350, 612], [338, 715], [410, 795], [560, 820], [690, 785]]];
  const SEEN = [[[860, 520], [852, 600], [815, 630], [780, 612], [772, 550], [765, 612], [730, 630], [697, 612], [690, 550], [684, 620], [640, 705], [550, 765], [420, 775], [320, 735], [268, 655], [262, 565]]];
  const SAAD = [[[560, 630], [600, 545], [690, 505], [790, 520], [820, 580], [770, 625], [560, 632]], [[560, 632], [520, 700], [440, 760], [330, 762], [262, 700], [250, 600]]];
  const TAA = [[[330, 630], [700, 630], [740, 575], [690, 520], [570, 515], [470, 570], [440, 630]], [[470, 260], [470, 600]]];
  const AIN = [[[650, 420], [570, 395], [490, 430], [495, 500], [600, 545]], [[600, 545], [470, 585], [375, 665], [375, 765], [460, 825], [610, 825], [700, 790]]];
  const LETTERS = {
    'ا': { name: 'ألف', strokes: [[[500, 230], [500, 630]]], dots: [] },
    'ب': { name: 'باء', strokes: [BOWL], dots: [[505, 735]] },
    'ت': { name: 'تاء', strokes: [BOWL], dots: [[455, 505], [560, 505]] },
    'ث': { name: 'ثاء', strokes: [BOWL], dots: [[455, 510], [560, 510], [508, 425]] },
    'ج': { name: 'جيم', strokes: HAA, dots: [[515, 680]] },
    'ح': { name: 'حاء', strokes: HAA, dots: [] },
    'خ': { name: 'خاء', strokes: HAA, dots: [[540, 300]] },
    'د': { name: 'دال', strokes: [[[520, 400], [600, 520], [625, 590], [600, 625], [420, 630]]], dots: [] },
    'ذ': { name: 'ذال', strokes: [[[520, 400], [600, 520], [625, 590], [600, 625], [420, 630]]], dots: [[530, 310]] },
    'ر': { name: 'راء', strokes: [[[580, 500], [575, 590], [540, 680], [460, 760], [350, 800]]], dots: [] },
    'ز': { name: 'زاي', strokes: [[[580, 500], [575, 590], [540, 680], [460, 760], [350, 800]]], dots: [[590, 405]] },
    'س': { name: 'سين', strokes: SEEN, dots: [] },
    'ش': { name: 'شين', strokes: SEEN, dots: [[775, 445], [700, 445], [738, 372]] },
    'ص': { name: 'صاد', strokes: SAAD, dots: [] },
    'ض': { name: 'ضاد', strokes: SAAD, dots: [[690, 420]] },
    'ط': { name: 'طاء', strokes: TAA, dots: [] },
    'ظ': { name: 'ظاء', strokes: TAA, dots: [[600, 420]] },
    'ع': { name: 'عين', strokes: AIN, dots: [] },
    'غ': { name: 'غين', strokes: AIN, dots: [[570, 315]] },
    'ف': { name: 'فاء', strokes: [[[700, 625], [630, 605], [615, 545], [665, 505], [730, 525], [740, 595], [700, 628]], [[700, 628], [520, 635], [340, 628], [270, 595], [245, 520]]], dots: [[675, 420]] },
    'ق': { name: 'قاف', strokes: [[[650, 612], [590, 590], [585, 530], [640, 495], [700, 520], [705, 585], [662, 615]], [[662, 615], [650, 700], [575, 775], [455, 795], [350, 750], [305, 660], [312, 580]]], dots: [[612, 412], [692, 412]] },
    'ك': { name: 'كاف', strokes: [[[700, 240], [700, 560], [670, 615], [600, 630], [400, 632], [300, 622], [262, 582], [255, 520]], [[545, 455], [480, 480], [545, 515], [480, 540]]], dots: [] },
    'ل': { name: 'لام', strokes: [[[650, 240], [650, 600], [630, 710], [550, 785], [430, 800], [340, 760], [305, 680], [312, 610]]], dots: [] },
    'م': { name: 'ميم', strokes: [[[520, 630], [540, 560], [600, 545], [640, 585], [610, 630], [520, 632]], [[520, 632], [462, 642], [440, 700], [440, 830]]], dots: [] },
    'ن': { name: 'نون', strokes: [[[730, 500], [725, 600], [685, 710], [590, 775], [440, 780], [340, 720], [300, 625], [300, 520]]], dots: [[515, 525]] },
    'ه': { name: 'هاء', strokes: [[[505, 440], [600, 475], [650, 560], [610, 632], [490, 645], [400, 605], [392, 525], [455, 485], [540, 525], [538, 592], [478, 606], [445, 565]]], dots: [] },
    'و': { name: 'واو', strokes: [[[600, 620], [540, 605], [528, 545], [575, 500], [640, 515], [655, 600], [625, 700], [545, 780], [420, 815]]], dots: [] },
    'ي': { name: 'ياء', strokes: [[[610, 440], [545, 495], [560, 565], [650, 600], [720, 635], [700, 710], [600, 760], [460, 770], [340, 735], [280, 665], [278, 600]]], dots: [[470, 870], [570, 870]] },
  };

  // ------------------------------------------------------------ board rendering primitives
  // R = { ctx, style, th (theme), x0, y0, k (px per board unit), u (layout unit), t, num, lw, font }
  const X = (R, x) => R.x0 + x * R.k;
  const Y = (R, y) => R.y0 + y * R.k;
  function makeR(ctx, sc, style, rect, u, t) {
    return { ctx, style, th: sc.theme, x0: rect.x, y0: rect.y, k: rect.s / 1000, u, t, num: sc.numerals, lw: LINE_W[style], font: sc.theme.font };
  }
  /** Colour by name (yellow, blue, …), theme key (ink, accent, accent2) or hex. */
  function C(R, c, def) {
    if (!c || c === true) c = def || 'ink';
    if (c[0] === '#' || c.startsWith('rgb')) return c;
    if (c === 'ink' || c === 'accent' || c === 'accent2' || c === 'bg' || c === 'soft') return R.th[c];
    return PALETTES[R.style].colors[c] || R.th.ink;
  }
  const N = (R, v, dec) => fmt(v, R.num, dec);

  function tracePath(ctx, parts, amp, seed) {
    ctx.beginPath();
    for (let s = 0; s < parts.length; s++) {
      const pts = parts[s];
      for (let i = 0; i < pts.length; i++) {
        let x = pts[i][0], y = pts[i][1];
        if (amp) { x += (rnd(seed + s * 97.3 + i * 13.7) - 0.5) * amp; y += (rnd(seed + s * 41.9 + i * 7.31 + 3) - 0.5) * amp; }
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
    }
  }
  /** Stroke pixel polylines in the style's medium: chalk (dusty, grainy), marker, pencil or clean. */
  function inkStroke(R, parts, o) {
    const ctx = R.ctx, w = o.width, a = o.alpha === undefined ? 1 : o.alpha, seed = o.seed || 1, u = R.u;
    if (a <= 0) return;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = o.color;
    if (o.dash) ctx.setLineDash(o.dash);
    if (R.style === 'chalkboard') {
      const amp = 2.2 * u;
      ctx.globalAlpha = 0.13 * a; ctx.lineWidth = w * 2.3; tracePath(ctx, parts, amp, seed); ctx.stroke();
      ctx.globalAlpha = 0.9 * a; ctx.lineWidth = w; tracePath(ctx, parts, amp, seed); ctx.stroke();
      ctx.globalAlpha = 0.45 * a; ctx.lineWidth = w * 0.5; tracePath(ctx, parts, amp * 1.6, seed + 9); ctx.stroke();
      if (!o.dash && w > 3 * u) { ctx.setLineDash([Math.max(1.5 * u, w * 0.12), Math.max(4 * u, w * 0.4)]); ctx.strokeStyle = R.th.bg; ctx.globalAlpha = 0.28 * a; ctx.lineWidth = w * 0.55; tracePath(ctx, parts, amp * 1.3, seed + 2); ctx.stroke(); }
    } else if (R.style === 'whiteboard') {
      ctx.globalAlpha = 0.22 * a; ctx.lineWidth = w * 1.25; tracePath(ctx, parts, 1.2 * u, seed + 4); ctx.stroke();
      ctx.globalAlpha = 0.95 * a; ctx.lineWidth = w; tracePath(ctx, parts, 0.9 * u, seed); ctx.stroke();
    } else if (R.style === 'paper') {
      ctx.globalAlpha = 0.85 * a; ctx.lineWidth = w; tracePath(ctx, parts, 0.9 * u, seed); ctx.stroke();
      ctx.globalAlpha = 0.3 * a; ctx.lineWidth = w * 0.6; tracePath(ctx, parts, 1.8 * u, seed + 5); ctx.stroke();
    } else {
      ctx.globalAlpha = a; ctx.lineWidth = w; tracePath(ctx, parts, 0, seed); ctx.stroke();
    }
    ctx.restore();
  }
  /** Draw the first p (0..1) of board-unit sub-paths. Returns the pen tip (px) while drawing. */
  function bline(R, subs, p, o) {
    o = o || {};
    if (p <= 0) return null;
    let total = 0;
    const lens = subs.map((s) => { const L = polyLen(s); total += L; return L; });
    let budget = total * clamp(p, 0, 1);
    const parts = [];
    let tip = null;
    for (let i = 0; i < subs.length && budget > 0; i++) {
      const seg = budget >= lens[i] ? subs[i] : cutPoly(subs[i], budget);
      budget -= lens[i];
      const px = seg.map((q) => [X(R, q[0]), Y(R, q[1])]);
      parts.push(px); tip = px[px.length - 1];
    }
    if (!parts.length) return null;
    inkStroke(R, parts, { color: C(R, o.color, 'ink'), width: (o.width || R.lw) * R.k, alpha: o.alpha, dash: o.dash ? o.dash.map((d) => d * R.k) : null, seed: o.seed });
    return p < 1 ? tip : null;
  }
  const bpoly = (R, pts, p, o) => bline(R, [densify(pts, 8)], p, o);
  function arrowHead(R, from, to, o, p) {
    if (p <= 0) return;
    const a = Math.atan2(to[1] - from[1], to[0] - from[0]), L = (o && o.head) || 26 * Math.max(0.8, ((o && o.width) || R.lw) / R.lw);
    const h1 = [to[0] - Math.cos(a - 0.45) * L, to[1] - Math.sin(a - 0.45) * L], h2 = [to[0] - Math.cos(a + 0.45) * L, to[1] - Math.sin(a + 0.45) * L];
    if (R.style === 'cartoon') {
      const ctx = R.ctx; ctx.save(); ctx.globalAlpha = clamp(p * 2, 0, 1) * (o.alpha === undefined ? 1 : o.alpha); ctx.fillStyle = C(R, o.color, 'ink');
      ctx.beginPath(); ctx.moveTo(X(R, to[0]), Y(R, to[1])); ctx.lineTo(X(R, h1[0]), Y(R, h1[1])); ctx.lineTo(X(R, h2[0]), Y(R, h2[1])); ctx.closePath(); ctx.fill(); ctx.restore();
    } else bline(R, [[h1, to], [to, h2]], p, Object.assign({}, o, { dash: null }));
  }
  function barrow(R, a, b, p, o) {
    o = o || {};
    if (dist(a, b) < 2) return null;
    const tip = bline(R, [densify([a, b], 8)], clamp(p / 0.85, 0, 1), o);
    if (p > 0.85) { arrowHead(R, a, b, o, (p - 0.85) / 0.15); if (o.both) arrowHead(R, b, a, o, (p - 0.85) / 0.15); }
    return tip;
  }
  /** Fill a board-unit polygon in the style's medium (chalk = light wash + hatching). */
  function bfill(R, pts, color, alpha, solid) {
    if (alpha <= 0 || pts.length < 3) return;
    const ctx = R.ctx;
    ctx.save();
    ctx.beginPath();
    pts.forEach((q, i) => (i ? ctx.lineTo(X(R, q[0]), Y(R, q[1])) : ctx.moveTo(X(R, q[0]), Y(R, q[1]))));
    ctx.closePath();
    ctx.fillStyle = color;
    if (R.style === 'chalkboard' && !solid) {
      ctx.globalAlpha = alpha * 0.24; ctx.fill(); ctx.clip();
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const q of pts) { x0 = Math.min(x0, X(R, q[0])); x1 = Math.max(x1, X(R, q[0])); y0 = Math.min(y0, Y(R, q[1])); y1 = Math.max(y1, Y(R, q[1])); }
      const st = 11 * R.u, hgt = y1 - y0;
      ctx.globalAlpha = alpha * 0.5; ctx.strokeStyle = color; ctx.lineWidth = 2.4 * R.u; ctx.beginPath();
      for (let x = x0 - hgt; x < x1; x += st) { ctx.moveTo(x, y1); ctx.lineTo(x + hgt, y0); }
      ctx.stroke();
    } else {
      ctx.globalAlpha = alpha * (solid ? 1 : R.style === 'cartoon' ? 0.85 : R.style === 'whiteboard' ? 0.3 : 0.32);
      ctx.fill();
    }
    ctx.restore();
  }
  function bdisk(R, c, r, color, alpha, solid) { bfill(R, arcPts(c[0], c[1], r, r, 0, TAU, 32), color, alpha === undefined ? 1 : alpha, solid); }
  function measure(R, str, px, weight) { R.ctx.save(); R.ctx.font = `${weight || 700} ${Math.round(px)}px ${R.font}`; const w = R.ctx.measureText(String(str)).width; R.ctx.restore(); return w; }
  const isRTL = (s) => /[؀-ۿ]/.test(s);

  /**
   * Text at pixel (x, y) written on with a stroke-by-stroke feel: revealed glyph by
   * glyph (RTL from the right for Arabic, LTR for math) with the pen riding the edge.
   * o: { p, color, align: center|left|right (physical), dir, weight, alpha }
   */
  function inkText(R, str, x, y, px, o) {
    o = o || {};
    str = String(str);
    const p = o.p === undefined ? 1 : o.p;
    if (!str || p <= 0) return null;
    const ctx = R.ctx;
    const dir = o.dir && o.dir !== 'auto' ? o.dir : (isRTL(str) ? 'rtl' : 'ltr');
    ctx.save();
    ctx.font = `${o.weight || 700} ${Math.round(px)}px ${R.font}`;
    ctx.direction = dir; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const w = ctx.measureText(str).width;
    const align = o.align || 'center';
    const left = align === 'center' ? x - w / 2 : align === 'left' ? x : x - w;
    let tip = null;
    if (p < 1) {
      const n = [...str].length, kk = p * n, q = (Math.floor(kk) + easeInOut(kk - Math.floor(kk))) / n;
      const cw = w * q;
      ctx.beginPath();
      if (dir === 'rtl') ctx.rect(left + w - cw, y - px * 1.2, cw + px * 0.3, px * 2.4); else ctx.rect(left - px * 0.3, y - px * 1.2, cw + px * 0.3, px * 2.4);
      ctx.clip();
      tip = [dir === 'rtl' ? left + w - cw : left + cw, y + px * 0.1 + Math.sin(kk * 7) * px * 0.2];
    }
    const seed = hashStr(str);
    if (R.style !== 'cartoon') { const rot = (seed - 0.5) * 0.02; ctx.translate(x, y); ctx.rotate(rot); ctx.translate(-x, -y); }
    ctx.globalAlpha *= o.alpha === undefined ? 1 : o.alpha;
    const base = ctx.globalAlpha;
    const color = C(R, o.color, 'ink');
    ctx.fillStyle = color;
    if (R.style === 'chalkboard') {
      ctx.globalAlpha = base * 0.95; ctx.fillText(str, left, y);
      ctx.globalAlpha = base * 0.3; ctx.lineWidth = Math.max(1, px * 0.045); ctx.strokeStyle = color; ctx.lineJoin = 'round'; ctx.strokeText(str, left, y);
      ctx.globalAlpha = base * 0.5; ctx.fillStyle = R.th.bg;
      const nS = Math.min(90, Math.floor((w * px) / 450)), s = Math.max(1, px * 0.05);
      for (let i = 0; i < nS; i++) ctx.fillRect(left + rnd(seed * 1000 + i) * w, y - px * 0.5 + rnd(seed * 1000 + i * 1.7 + 0.3) * px, s, s);
    } else if (R.style === 'cartoon') {
      ctx.lineWidth = px * 0.14; ctx.strokeStyle = R.th.bg; ctx.lineJoin = 'round'; ctx.strokeText(str, left, y);
      ctx.fillText(str, left, y);
    } else {
      ctx.globalAlpha = base * (R.style === 'paper' ? 0.93 : 0.97); ctx.fillText(str, left, y);
    }
    ctx.restore();
    return tip;
  }
  const TK = (R) => R.k * (R.fs || 1); // px per board unit for text (bigger on phones)
  const btext = (R, str, x, y, size, o) => inkText(R, str, X(R, x), Y(R, y), size * TK(R), o);
  function drawEmoji(R, value, at, size, p, alpha) {
    if (p <= 0) return;
    const ctx = R.ctx, s = easeOutBack(clamp(p, 0, 1));
    ctx.save(); ctx.translate(X(R, at[0]), Y(R, at[1])); ctx.scale(s, s);
    ctx.globalAlpha *= clamp(p * 3, 0, 1) * (alpha === undefined ? 1 : alpha);
    ctx.font = `${Math.round(size * R.k * 0.9)}px "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(value, 0, size * R.k * 0.04);
    ctx.restore();
  }
  /** Stacked fraction n/d centred at board (x, y). */
  function fracLabel(R, n, d, x, y, size, p, color) {
    if (p <= 0) return;
    const w = Math.max(measure(R, digits(n, R.num), size * TK(R), 800), measure(R, digits(d, R.num), size * TK(R), 800)) / R.k + 24;
    btext(R, digits(n, R.num), x, y - size * 0.62, size, { p: clamp(p * 3, 0, 1), color, weight: 800 });
    bpoly(R, [[x + w / 2, y], [x - w / 2, y]], clamp(p * 3 - 1, 0, 1), { color, width: R.lw * 0.8 });
    btext(R, digits(d, R.num), x, y + size * 0.62, size, { p: clamp(p * 3 - 2, 0, 1), color, weight: 800 });
  }
  /** The tool that draws: chalk stick, marker or pencil. */
  function drawTip(R, x, y) {
    const ctx = R.ctx, u = R.u;
    ctx.save();
    ctx.translate(x, y);
    if (R.style === 'chalkboard') {
      ctx.rotate(-0.7);
      ctx.fillStyle = '#F7F4EC'; roundRect(ctx, -8 * u, -72 * u, 16 * u, 74 * u, 6 * u); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(2 * u, -70 * u, 5 * u, 70 * u);
    } else if (R.style === 'whiteboard') {
      ctx.rotate(-0.6);
      ctx.fillStyle = '#2D3748'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-6 * u, -16 * u); ctx.lineTo(6 * u, -16 * u); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#E8EBEF'; ctx.strokeStyle = '#8D96A0'; ctx.lineWidth = 2 * u; roundRect(ctx, -12 * u, -136 * u, 24 * u, 120 * u, 7 * u); ctx.fill(); ctx.stroke();
      ctx.fillStyle = R.th.accent2; ctx.fillRect(-12 * u, -40 * u, 24 * u, 12 * u);
    } else {
      ctx.rotate(-0.6);
      ctx.fillStyle = '#333'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-4 * u, -10 * u); ctx.lineTo(4 * u, -10 * u); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#EBCB9E'; ctx.beginPath(); ctx.moveTo(-4 * u, -10 * u); ctx.lineTo(-9 * u, -30 * u); ctx.lineTo(9 * u, -30 * u); ctx.lineTo(4 * u, -10 * u); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#F2C14E'; ctx.fillRect(-9 * u, -130 * u, 18 * u, 100 * u);
      ctx.fillStyle = '#E8A0A8'; ctx.fillRect(-9 * u, -148 * u, 18 * u, 18 * u);
    }
    ctx.restore();
  }

  // ------------------------------------------------------------ board item kinds
  const KINDS = {};
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const isPt = (p) => Array.isArray(p) && p.length === 2 && p.every(isNum);
  const isPts = (a, min) => Array.isArray(a) && a.length >= (min || 2) && a.every(isPt);
  const isBox = (b) => Array.isArray(b) && b.length === 4 && b.every(isNum) && b[2] > 0 && b[3] > 0;
  const memo = new WeakMap();
  function cached(o, fn) { let v = memo.get(o); if (!v) { v = fn(o); memo.set(o, v); } return v; }
  const textDur = (s) => clamp(0.3 + [...String(s || '')].length * 0.085, 0.5, 4.5);
  const boxErr = (o) => (o.box !== undefined && !isBox(o.box) ? ['box: [x, y, w, h] بوحدات اللوح (0–1000)'] : []);

  // ---- draw: line, arrow, circle, rect, polygon, path, freehand curve (+ text, emoji)
  const SHAPES = ['line', 'arrow', 'double-arrow', 'circle', 'ellipse', 'rect', 'polygon', 'path', 'curve', 'text', 'emoji'];
  function drawGeo(o) {
    return cached(o, () => {
      let subs = [], closed = false;
      switch (o.shape) {
        case 'line': case 'arrow': case 'double-arrow': subs = [[o.from, o.to]]; break;
        case 'circle': subs = [arcPts(o.center[0], o.center[1], o.r, o.r, -Math.PI / 2, -Math.PI / 2 - TAU, 72)]; closed = true; break;
        case 'ellipse': subs = [arcPts(o.center[0], o.center[1], o.rx, o.ry, -Math.PI / 2, -Math.PI / 2 - TAU, 72)]; closed = true; break;
        case 'rect': subs = [[[o.x + o.w, o.y], [o.x, o.y], [o.x, o.y + o.h], [o.x + o.w, o.y + o.h], [o.x + o.w, o.y]]]; closed = true; break;
        case 'polygon': subs = [o.points.concat([o.points[0]])]; closed = true; break;
        case 'path': subs = typeof o.d === 'string' ? parsePath(o.d) : [o.points]; closed = !!o.fill; break;
        case 'curve': subs = [catmull(o.points, 12, !!o.closed)]; closed = !!o.closed; break;
        default: break;
      }
      return { subs: subs.map((s) => densify(s, 8)), closed };
    });
  }
  KINDS.draw = {
    check(o) {
      const e = [], s = o.shape;
      if (!SHAPES.includes(s)) return [`shape: واحد من ${SHAPES.join('، ')}`];
      if (['line', 'arrow', 'double-arrow'].includes(s) && !(isPt(o.from) && isPt(o.to))) e.push('from و to نقطتين [x, y]');
      if (s === 'circle' && !(isPt(o.center) && o.r > 0)) e.push('center و r');
      if (s === 'ellipse' && !(isPt(o.center) && o.rx > 0 && o.ry > 0)) e.push('center و rx و ry');
      if (s === 'rect' && !['x', 'y', 'w', 'h'].every((k) => isNum(o[k]))) e.push('x و y و w و h');
      if ((s === 'polygon' || s === 'curve') && !isPts(o.points, s === 'polygon' ? 3 : 2)) e.push('points: قائمة نقاط [[x,y],…]');
      if (s === 'path') {
        if (typeof o.d === 'string') { try { if (!parsePath(o.d).length) e.push('d: path فارغ'); } catch (err) { e.push('d: ' + err.message); } }
        else if (!isPts(o.points)) e.push('d (نص path مثل "M 100 100 L 300 200") أو points');
      }
      if ((s === 'text' || s === 'emoji') && !(isPt(o.at) && typeof (o.text || o.value) === 'string')) e.push('at و text (أو value للإيموجي)');
      return e;
    },
    dur(o) {
      if (o.time) return o.time;
      if (o.shape === 'text') return textDur(o.text);
      if (o.shape === 'emoji') return 0.6;
      return clamp(drawGeo(o).subs.reduce((a, s) => a + polyLen(s), 0) / 850 + 0.2, 0.4, 3);
    },
    draw(R, o, p, lt, it) {
      if (o.shape === 'text') return btext(R, o.text, o.at[0], o.at[1], o.size || 60, { p, color: o.color, align: o.align, dir: o.dir, weight: o.weight });
      if (o.shape === 'emoji') { drawEmoji(R, o.value || o.text, o.at, o.size || 120, p); return null; }
      const g = drawGeo(o);
      if (o.fill && g.closed) bfill(R, g.subs[0], C(R, o.fill === true ? o.color : o.fill, 'accent'), prog(p, 0.7, 0.3));
      const so = { color: o.color, width: o.width, dash: o.dash ? (Array.isArray(o.dash) ? o.dash : [18, 14]) : null, seed: it.seed };
      if (o.shape === 'arrow' || o.shape === 'double-arrow') return barrow(R, o.from, o.to, p, Object.assign(so, { both: o.shape === 'double-arrow' }));
      return bline(R, g.subs, p, so);
    },
  };

  // ---- write: text / equations written on (RTL Arabic, LTR math)
  KINDS.write = {
    norm: (o) => (typeof o === 'string' ? { text: o } : o),
    check: (o) => (typeof o.text === 'string' && o.text ? (o.at !== undefined && !isPt(o.at) ? ['at: نقطة [x, y]'] : []) : ['text: نص مطلوب']),
    dur: (o) => o.time || textDur(o.text) * ((o.size || 60) > 90 ? 1.3 : 1) + (o.underline || o.box ? 0.4 : 0),
    draw(R, o, p, lt, it) {
      const at = o.at || it.pos || [500, 500], size = o.size || 60, align = o.align || it.align || 'center';
      const extra = o.underline || o.box;
      const tp = extra ? clamp(p / 0.8, 0, 1) : p;
      const tip = btext(R, o.text, at[0], at[1], size, { p: tp, color: o.color, align, dir: o.dir, weight: o.weight });
      if (extra && p > 0.8) {
        const w = measure(R, o.text, size * TK(R), o.weight) / R.k, x0 = align === 'center' ? at[0] - w / 2 : align === 'left' ? at[0] : at[0] - w;
        const ep = (p - 0.8) / 0.2, col = (o.underline || o.box) === true ? 'accent' : (o.underline || o.box);
        if (o.box) bpoly(R, rrectPts(x0 - 24, at[1] - size * 0.75, w + 48, size * 1.5, 16), ep, { color: col, seed: it.seed });
        else bpoly(R, [[x0 + w + 8, at[1] + size * 0.6], [x0 - 8, at[1] + size * 0.62]], ep, { color: col, seed: it.seed });
      }
      return tip;
    },
  };

  // ---- highlight: marker wash, circle, underline or box around a region
  KINDS.highlight = {
    check: (o) => [].concat(isBox(o.box) ? [] : ['box: [x, y, w, h]'], o.kind && !['marker', 'circle', 'underline', 'box'].includes(o.kind) ? ['kind: marker أو circle أو underline أو box'] : []),
    dur: (o) => o.time || 0.7,
    draw(R, o, p, lt, it) {
      const [x, y, w, h] = o.box, kind = o.kind || (R.style === 'chalkboard' ? 'circle' : 'marker');
      if (kind === 'marker') {
        const ctx = R.ctx, ww = w * easeInOut(p);
        ctx.save();
        if (R.style !== 'chalkboard') ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = R.style === 'chalkboard' ? 0.3 : 0.42; ctx.fillStyle = C(R, o.color, 'yellow');
        if (R.style === 'chalkboard') ctx.fillStyle = C(R, o.color, 'yellow');
        else if (!o.color) ctx.fillStyle = '#FFE14D';
        ctx.fillRect(X(R, x + w - ww), Y(R, y), ww * R.k, h * R.k);
        ctx.restore();
        return p < 1 ? [X(R, x + w - ww), Y(R, y + h)] : null;
      }
      const so = { color: o.color || 'accent', seed: it.seed };
      if (kind === 'circle') return bline(R, [densify(arcPts(x + w / 2, y + h / 2, w / 2 + 28, h / 2 + 24, -Math.PI * 0.55, Math.PI * 1.55, 64), 8)], p, so);
      if (kind === 'underline') { const pts = []; for (let i = 0; i <= 40; i++) pts.push([x + w - (w * i) / 40, y + h + 12 + Math.sin(i * 0.9) * 6]); return bline(R, [pts], p, so); }
      return bpoly(R, rrectPts(x - 12, y - 12, w + 24, h + 24, 12), p, so);
    },
  };

  // ---- label: text + arrow pointing to a point
  KINDS.label = {
    check: (o) => [].concat(typeof o.text === 'string' && o.text ? [] : ['text: نص مطلوب'], isPt(o.at) ? [] : ['at: النقطة اللي يأشّر عليها [x, y]'], isPt(o.from) ? [] : ['from: مكان الكتابة [x, y]']),
    dur: (o) => o.time || 0.7 + textDur(o.text),
    draw(R, o, p, lt, it) {
      const size = o.size || 44, tp = clamp(p / 0.6, 0, 1), ap = clamp((p - 0.55) / 0.45, 0, 1);
      const tip = btext(R, o.text, o.from[0], o.from[1], size, { p: tp, color: o.color });
      const w = measure(R, o.text, size * TK(R)) / R.k / 2 + 14, h = size * 0.7;
      const dx = o.at[0] - o.from[0], dy = o.at[1] - o.from[1], L = Math.hypot(dx, dy) || 1;
      const f = Math.min(dx ? w / Math.abs(dx) : Infinity, dy ? h / Math.abs(dy) : Infinity, 0.9);
      const s = [o.from[0] + dx * f, o.from[1] + dy * f], e = [o.at[0] - (dx / L) * 10, o.at[1] - (dy / L) * 10];
      const t2 = barrow(R, s, e, ap, { color: o.arrowColor || o.color || 'ink', width: R.lw * 0.8, seed: it.seed });
      return tip || t2;
    },
  };

  // ---- numberline with jumping marker (addition / subtraction)
  function nlGeo(o) {
    return cached(o, () => {
      const from = o.from, to = o.to, step = o.step || 1, x0 = isNum(o.x0) ? o.x0 : 80, x1 = isNum(o.x1) ? o.x1 : 920, y = isNum(o.y) ? o.y : 560;
      const rtl = o.dir === 'rtl';
      const xOf = (v) => (rtl ? x1 - ((v - from) / (to - from)) * (x1 - x0) : x0 + ((v - from) / (to - from)) * (x1 - x0));
      const ticks = [];
      for (let v = from; v <= to + 1e-9; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
      let at = isNum(o.start) ? o.start : null, t = 1.2;
      const jumps = (o.jumps || []).map((j) => {
        const a = isNum(j.from) ? j.from : at !== null ? at : from;
        const hops = j.unit === false || o.unit === false || Math.abs(j.by) > 12 || !Number.isInteger(j.by) ? 1 : Math.abs(j.by);
        const out = { from: a, to: a + j.by, by: j.by, hops, start: t, label: j.label };
        t += hops * 0.45 + 0.4; at = a + j.by;
        return out;
      });
      return { xOf, y, ticks, jumps, end: t, x0, x1 };
    });
  }
  KINDS.numberline = {
    check(o) {
      const e = [];
      if (!(isNum(o.from) && isNum(o.to) && o.to > o.from)) return ['from و to أرقام و to أكبر'];
      if ((o.to - o.from) / (o.step || 1) > 30) e.push('step: الشرطات أكثر من 30 — كبّر step');
      (o.jumps || []).forEach((j, i) => { if (!j || !isNum(j.by) || !j.by) e.push(`jumps[${i}].by: رقم (موجب للجمع، سالب للطرح)`); });
      return e;
    },
    dur: (o) => o.time || nlGeo(o).end + 0.3,
    draw(R, o, p, lt, it) {
      const g = nlGeo(o), y = g.y, lp = prog(lt, 0, 1.0), col = o.color || 'ink';
      barrow(R, [g.x0 - 40, y], [g.x1 + 40, y], lp, { color: col, both: true, seed: it.seed });
      const size = o.size || 40, every = g.ticks.length > 16 ? 2 : 1;
      g.ticks.forEach((v, i) => {
        const x = g.xOf(v), f = (x - g.x0) / (g.x1 - g.x0);
        const tp = prog(lp, o.dir === 'rtl' ? 1 - f - 0.05 : f - 0.05, 0.15);
        if (tp <= 0) return;
        bpoly(R, [[x, y - 16], [x, y + 16]], tp, { color: col, width: R.lw * 0.7, seed: it.seed + i });
        if (i % every === 0) btext(R, N(R, v), x, y + 52, size, { alpha: tp, color: col });
      });
      (o.mark || []).forEach((v) => bline(R, [arcPts(g.xOf(v), y, 30, 30, 0, TAU, 32)], prog(lt, 1.0, 0.4), { color: 'accent2', seed: it.seed + v }));
      let marker = null;
      g.jumps.forEach((j, ji) => {
        const unit = j.by / j.hops;
        if (lt >= j.start - 0.3 && !marker) marker = [g.xOf(j.from), y];
        let top = y;
        for (let h = 0; h < j.hops; h++) {
          const a = j.from + h * unit, b = a + unit, xa = g.xOf(a), xb = g.xOf(b);
          const hh = clamp(Math.abs(xb - xa) * 0.6, 50, 170);
          top = Math.min(top, y - hh);
          const pts = []; for (let s = 0; s <= 24; s++) { const f = s / 24; pts.push([xa + (xb - xa) * f, y - 22 - 4 * hh * f * (1 - f)]); }
          const hp = prog(lt, j.start + h * 0.45, 0.45);
          if (hp <= 0) continue;
          bline(R, [pts], hp, { color: j.by > 0 ? 'accent' : 'red', width: R.lw * 0.8, dash: [10, 10], seed: it.seed + ji * 31 + h });
          marker = pointAt(pts, easeInOut(hp));
          if (hp >= 1 && j.hops > 1) btext(R, N(R, h + 1), (xa + xb) / 2, y - 22 - hh - 26, 30, { color: 'accent2' });
        }
        const endT = j.start + j.hops * 0.45;
        const lp2 = prog(lt, endT, 0.4);
        if (lp2 > 0) {
          const txt = j.label || (j.by > 0 ? '+' : '−') + N(R, Math.abs(j.by));
          btext(R, txt, (g.xOf(j.from) + g.xOf(j.to)) / 2, top - 22 - (j.hops > 1 ? 70 : 34), 52, { p: lp2, color: j.by > 0 ? 'accent' : 'red', weight: 800, dir: 'ltr' });
          bline(R, [arcPts(g.xOf(j.to), y, 32, 32, 0, TAU, 32)], lp2, { color: 'accent', seed: it.seed + ji });
        }
      });
      if (marker && lt >= (g.jumps[0] ? g.jumps[0].start - 0.3 : 0)) {
        if (o.marker) drawEmoji(R, o.marker, [marker[0], marker[1] - 40], 80, prog(lt, g.jumps[0].start - 0.3, 0.3));
        else bdisk(R, [marker[0], marker[1] - 12], 16, C(R, 'accent2'), 1, true);
      }
      return lp < 1 ? [X(R, g.x0 + (g.x1 - g.x0) * lp), Y(R, y)] : null;
    },
  };

  // ---- fraction: pie or bar
  KINDS.fraction = {
    norm: (o) => { if (typeof o !== 'string') return o; const m = o.match(/^\s*(\d+)\s*\/\s*(\d+)\s*$/); return m ? { n: +m[1], d: +m[2] } : { n: -1, d: 0 }; },
    check: (o) => [].concat(Number.isInteger(o.n) && Number.isInteger(o.d) && o.d >= 1 && o.d <= 16 && o.n >= 0 && o.n <= o.d ? [] : ['n و d أعداد صحيحة (0 ≤ n ≤ d ≤ 16)'], o.kind && !['pie', 'bar'].includes(o.kind) ? ['kind: pie أو bar'] : [], o.at !== undefined && !isPt(o.at) ? ['at: نقطة'] : []),
    dur: (o) => o.time || 1.1 + 0.3 * o.n + 0.7,
    draw(R, o, p, lt, it) {
      const at = o.at || [500, 420], size = o.size || 380, col = C(R, o.color, 'accent'), op = prog(lt, 0, 0.6), dp = prog(lt, 0.6, 0.4);
      const rtl = o.dir !== 'ltr';
      let labelY;
      if (o.kind === 'bar') {
        const w = size, h = size * 0.3, x = at[0] - w / 2, y = at[1] - h / 2, cw = w / o.d;
        for (let i = 0; i < o.n; i++) { const cx = rtl ? x + w - (i + 1) * cw : x + i * cw; bfill(R, [[cx, y], [cx + cw, y], [cx + cw, y + h], [cx, y + h]], col, prog(lt, 1.1 + i * 0.3, 0.3)); }
        bpoly(R, [[x + w, y], [x, y], [x, y + h], [x + w, y + h], [x + w, y]], op, { color: o.lineColor, seed: it.seed });
        const subs = []; for (let i = 1; i < o.d; i++) subs.push(densify([[x + i * cw, y], [x + i * cw, y + h]], 8));
        if (subs.length) bline(R, subs, dp, { color: o.lineColor, width: R.lw * 0.7, seed: it.seed + 3 });
        labelY = y + h + 110;
      } else {
        const r = size / 2, c = at;
        for (let i = 0; i < o.n; i++) {
          const s = rtl ? 1 : -1, a0 = -Math.PI / 2 + s * (i / o.d) * TAU, a1 = -Math.PI / 2 + s * ((i + 1) / o.d) * TAU;
          bfill(R, [c].concat(arcPts(c[0], c[1], r, r, a0, a1, 24)), col, prog(lt, 1.1 + i * 0.3, 0.3));
        }
        bline(R, [densify(arcPts(c[0], c[1], r, r, -Math.PI / 2, -Math.PI / 2 - TAU, 64), 8)], op, { color: o.lineColor, seed: it.seed });
        if (o.d > 1) { const subs = []; for (let i = 0; i < o.d; i++) { const a = -Math.PI / 2 + (i / o.d) * TAU; subs.push(densify([c, [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]], 8)); } bline(R, subs, dp, { color: o.lineColor, width: R.lw * 0.7, seed: it.seed + 3 }); }
        labelY = c[1] + r + 100;
      }
      if (o.label !== false) fracLabel(R, o.n, o.d, at[0], labelY, o.labelSize || 56, prog(lt, 1.1 + 0.3 * o.n, 0.6), o.labelColor || 'ink');
      if (o.text) btext(R, o.text, at[0], labelY + (o.labelSize || 56) * 1.6, 44, { p: prog(lt, 1.4 + 0.3 * o.n, 0.6), color: 'accent2' });
      return null;
    },
  };

  // ---- grid: arrays for multiplication and unit squares for area
  const gridFillN = (o) => (o.fill === 'all' || o.fill === true ? o.cols * o.rows : clamp(Math.floor(+o.fill || 0), 0, o.cols * o.rows));
  KINDS.grid = {
    check: (o) => (Number.isInteger(o.cols) && Number.isInteger(o.rows) && o.cols >= 1 && o.rows >= 1 && o.cols <= 20 && o.rows <= 20 ? (o.at !== undefined && !isPt(o.at) ? ['at: مركز الشبكة [x, y]'] : []) : ['cols و rows أعداد صحيحة من 1 إلى 20']),
    dur: (o) => o.time || 0.9 + Math.min(3.6, gridFillN(o) * 0.14) + (o.top || o.side ? 0.9 : 0) + 0.2,
    draw(R, o, p, lt, it) {
      const cell = o.cell || Math.min(90, 760 / Math.max(o.cols, o.rows)), W = cell * o.cols, H = cell * o.rows;
      const c = o.at || [500, 470], x0 = c[0] - W / 2, y0 = c[1] - H / 2, rtl = o.dir !== 'ltr';
      const n = gridFillN(o), step = Math.min(0.14, 3.6 / Math.max(1, n)), col = C(R, o.color, 'accent');
      for (let i = 0; i < n; i++) {
        const fp = prog(lt, 0.9 + i * step, 0.25);
        if (fp <= 0) break;
        const r = Math.floor(i / o.cols), cc = i % o.cols, x = rtl ? x0 + W - (cc + 1) * cell : x0 + cc * cell, y = y0 + r * cell;
        if (o.dots) bdisk(R, [x + cell / 2, y + cell / 2], cell * 0.3 * easeOutBack(fp), col, 1, true);
        else bfill(R, [[x + 4, y + 4], [x + cell - 4, y + 4], [x + cell - 4, y + cell - 4], [x + 4, y + cell - 4]], col, fp);
        if (o.numbers) btext(R, N(R, i + 1), x + cell / 2, y + cell / 2, cell * 0.42, { alpha: fp, color: o.dots ? 'bg' : 'ink' });
      }
      if (o.lines !== false) {
        const subs = [];
        for (let i = 0; i <= o.rows; i++) subs.push(densify([[x0 + W, y0 + i * cell], [x0, y0 + i * cell]], 8));
        for (let i = 0; i <= o.cols; i++) subs.push(densify([[x0 + W - i * cell, y0], [x0 + W - i * cell, y0 + H]], 8));
        bline(R, subs, prog(lt, 0, 0.8), { color: o.lineColor || 'ink', width: R.lw * 0.55, alpha: o.dots ? 0.35 : 0.9, seed: it.seed });
      }
      const lp = prog(lt, 0.9 + n * step + 0.1, 0.6);
      if (o.top) btext(R, o.top, c[0], y0 - 48, o.labelSize || 46, { p: lp, color: 'accent2' });
      if (o.side) btext(R, o.side, x0 + W + 24, c[1], o.labelSize || 46, { p: lp, color: 'accent2', align: 'left' });
      return null;
    },
  };

  // ---- axes + plot
  const DEFAULT_AX = Object.freeze({ x: [-5, 5], y: [-5, 5] });
  function axGeo(o) {
    return cached(o, () => {
      const box = isBox(o.box) ? o.box : [110, 90, 800, 800];
      const ax = { x: o.x || [-5, 5], y: o.y || [-5, 5], box };
      const [bx, by, bw, bh] = box, sx = bw / (ax.x[1] - ax.x[0]), sy = bh / (ax.y[1] - ax.y[0]);
      ax.X = (v) => bx + (v - ax.x[0]) * sx;
      ax.Y = (v) => by + bh - (v - ax.y[0]) * sy;
      ax.ox = ax.X(clamp(0, ax.x[0], ax.x[1]));
      ax.oy = ax.Y(clamp(0, ax.y[0], ax.y[1]));
      return ax;
    });
  }
  const rangeOk = (r) => Array.isArray(r) && r.length === 2 && r.every(isNum) && r[1] > r[0];
  function tickList(range, step, custom) {
    if (Array.isArray(custom)) return custom.map((c) => (typeof c === 'number' ? { v: c } : c));
    const out = [];
    const n = (range[1] - range[0]) / step, every = n > 14 ? Math.ceil(n / 12) : 1;
    for (let v = Math.ceil(range[0] / step) * step, i = 0; v <= range[1] + 1e-9; v += step, i++) if (Math.abs(v) > 1e-9 && i % every === 0) out.push({ v: Math.round(v * 1e6) / 1e6 });
    return out;
  }
  function drawAxes(R, o, lt, seed) {
    const ax = axGeo(o), [bx, by, bw, bh] = ax.box;
    const sx = o.step ? (Array.isArray(o.step) ? o.step[0] : o.step) : 1, sy = o.step ? (Array.isArray(o.step) ? o.step[1] : o.step) : 1;
    const tx = tickList(ax.x, sx, o.ticksX), ty = tickList(ax.y, sy, o.ticksY);
    if (o.grid !== false) {
      const subs = [];
      tx.forEach((k) => subs.push(densify([[ax.X(k.v), by], [ax.X(k.v), by + bh]], 10)));
      ty.forEach((k) => subs.push(densify([[bx, ax.Y(k.v)], [bx + bw, ax.Y(k.v)]], 10)));
      bline(R, subs, prog(lt, 0, 0.7), { color: 'gray', width: R.lw * 0.3, alpha: 0.45, seed });
    }
    barrow(R, [bx - 10, ax.oy], [bx + bw + 30, ax.oy], prog(lt, 0.3, 0.6), { color: o.color || 'ink', seed: seed + 1 });
    barrow(R, [ax.ox, by + bh + 10], [ax.ox, by - 30], prog(lt, 0.45, 0.6), { color: o.color || 'ink', seed: seed + 2 });
    const np = prog(lt, 0.9, 0.5), size = o.size || 30;
    if (np > 0 && o.numbers !== false) {
      tx.forEach((k) => btext(R, k.t || N(R, k.v), ax.X(k.v), ax.oy + size * 1.05, size, { alpha: np, color: 'gray' }));
      ty.forEach((k) => btext(R, k.t || N(R, k.v), ax.ox - 12, ax.Y(k.v), size, { alpha: np, color: 'gray', align: 'right' }));
      if (ax.x[0] < 0 && ax.y[0] < 0) btext(R, N(R, 0), ax.ox - 12, ax.oy + size * 1.05, size, { alpha: np, color: 'gray', align: 'right' });
    }
    const lb = o.labels || ['x', 'y'];
    btext(R, lb[0], bx + bw + 28, ax.oy - 40, 40, { alpha: np, color: 'accent2', weight: 800 });
    btext(R, lb[1], ax.ox + 40, by - 24, 40, { alpha: np, color: 'accent2', weight: 800 });
  }
  KINDS.axes = {
    norm: (o) => (o === true ? {} : o),
    check: (o) => [].concat(o.x !== undefined && !rangeOk(o.x) ? ['x: [أصغر, أكبر]'] : [], o.y !== undefined && !rangeOk(o.y) ? ['y: [أصغر, أكبر]'] : [], boxErr(o)),
    dur: (o) => o.time || 1.5,
    draw(R, o, p, lt, it) { drawAxes(R, o, lt, it.seed); return null; },
  };
  KINDS.plot = {
    norm: (o) => (typeof o === 'string' ? { fn: o } : o),
    check(o) {
      if (typeof o.fn !== 'string' && !isPts(o.points, 1)) return ['fn: دالة مثل "2*x+1" أو "sin(x)" (أو points)'];
      if (typeof o.fn === 'string') { try { compileExpr(o.fn); } catch (e) { return ['fn: ' + e.message]; } }
      if (o.x !== undefined && !rangeOk(o.x)) return ['x: مجال الرسم [من, إلى]'];
      return [];
    },
    dur: (o) => o.time || (o.fn ? 1.8 : 0.4) + (o.points ? o.points.length * 0.3 : 0) + (o.label ? 0.5 : 0),
    draw(R, o, p, lt, it) {
      const axo = it.axes || DEFAULT_AX, ax = axGeo(axo), [bx, by, bw, bh] = ax.box;
      if (!it.axes) drawAxes(R, axo, lt + 2, it.seed + 50);
      const ctx = R.ctx, cd = o.fn ? 1.8 : 0, col = o.color || 'accent';
      let tip = null, labelPt = null;
      if (o.fn) {
        const segs = cached(o, () => {
          const f = compileExpr(o.fn), dom = o.x || ax.x, out = [];
          const span = ax.y[1] - ax.y[0];
          let cur = [];
          for (let i = 0; i <= 360; i++) {
            const xv = dom[0] + ((dom[1] - dom[0]) * i) / 360, yv = f(xv);
            if (!isFinite(yv) || yv > ax.y[1] + span || yv < ax.y[0] - span) { if (cur.length > 1) out.push(cur); cur = []; continue; }
            cur.push([ax.X(xv), ax.Y(yv)]);
          }
          if (cur.length > 1) out.push(cur);
          return out;
        });
        ctx.save(); ctx.beginPath(); ctx.rect(X(R, bx - 8), Y(R, by - 8), (bw + 16) * R.k, (bh + 16) * R.k); ctx.clip();
        tip = bline(R, segs, prog(lt, 0, cd), { color: col, width: o.width || R.lw * 1.15, seed: it.seed });
        ctx.restore();
        const last = segs.length ? segs[segs.length - 1] : null;
        if (last) labelPt = last.slice().reverse().find((q) => q[0] >= bx && q[0] <= bx + bw && q[1] >= by && q[1] <= by + bh);
      }
      (o.points || []).forEach((q, i) => {
        const dp = prog(lt, cd + i * 0.3, 0.3);
        if (dp <= 0) return;
        const c = [ax.X(q[0]), ax.Y(q[1])];
        bdisk(R, c, 13 * easeOutBack(dp), C(R, o.pointColor || 'accent2'), 1, true);
        if (o.pointLabels !== false) btext(R, `(${N(R, q[0])}${R.num === 'arabic' ? '، ' : ', '}${N(R, q[1])})`, c[0] + 22, c[1] - 34, 30, { alpha: dp, color: 'accent2', align: 'left', dir: 'ltr' });
      });
      if (o.label) {
        const at = o.labelAt ? [ax.X(o.labelAt[0]), ax.Y(o.labelAt[1])] : labelPt ? [labelPt[0] - 20, labelPt[1] - 44] : [bx + bw - 20, by + 40];
        btext(R, o.label, at[0], at[1], o.labelSize || 44, { p: prog(lt, cd + (o.points ? o.points.length * 0.3 : 0), 0.5), color: col, align: o.labelAt ? 'center' : 'right', weight: 800 });
      }
      return tip;
    },
  };

  // ---- geometry: triangle / polygon / rect with labels, angle arcs, right-angle marks; circle with radius
  function geoPts(o) {
    if (o.shape === 'rect') return [[o.x, o.y], [o.x + o.w, o.y], [o.x + o.w, o.y + o.h], [o.x, o.y + o.h]];
    return o.points;
  }
  KINDS.geometry = {
    check(o) {
      const s = o.shape;
      if (!['triangle', 'circle', 'rect', 'polygon'].includes(s)) return ['shape: triangle أو circle أو rect أو polygon'];
      if (s === 'triangle' && !(isPts(o.points, 3) && o.points.length === 3)) return ['points: ثلاث نقاط [[x,y],[x,y],[x,y]]'];
      if (s === 'polygon' && !isPts(o.points, 3)) return ['points: 3 نقاط أو أكثر'];
      if (s === 'circle' && !(isPt(o.center) && o.r > 0)) return ['center و r'];
      if (s === 'rect' && !['x', 'y', 'w', 'h'].every((k) => isNum(o[k]))) return ['x و y و w و h'];
      return [];
    },
    dur(o) { const n = ['sides', 'angles', 'vertices'].reduce((a, k) => a + (o[k] || []).filter(Boolean).length, 0) + (o.radius ? 1 : 0) + (o.diameter ? 1 : 0); return o.time || 1.4 + 0.32 * n + 0.2; },
    draw(R, o, p, lt, it) {
      const col = o.color || 'ink', lp = prog(lt, 0, 1.2), lab = o.labelColor || 'accent', size = o.labelSize || 44;
      let k = 0;
      const nextP = () => prog(lt, 1.3 + 0.32 * k++, 0.4);
      if (o.shape === 'circle') {
        const c = o.center, r = o.r;
        if (o.fill) bfill(R, arcPts(c[0], c[1], r, r, 0, TAU, 48), C(R, o.fill === true ? 'accent2' : o.fill), prog(lt, 1.0, 0.4));
        const tip = bline(R, [densify(arcPts(c[0], c[1], r, r, -Math.PI / 2, -Math.PI / 2 - TAU, 72), 8)], lp, { color: col, seed: it.seed });
        bdisk(R, c, 7, C(R, col), prog(lt, 1.0, 0.3), true);
        if (o.centerLabel) btext(R, o.centerLabel, c[0] - 26, c[1] + 30, 36, { alpha: prog(lt, 1.0, 0.3), color: col });
        if (o.radius) {
          const a = ((o.radiusAngle === undefined ? -30 : o.radiusAngle) * Math.PI) / 180, e = [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r];
          const rp = nextP();
          bpoly(R, [c, e], rp, { color: lab, seed: it.seed + 1 });
          btext(R, o.radius, (c[0] + e[0]) / 2 + Math.sin(a) * 40, (c[1] + e[1]) / 2 - Math.cos(a) * 40, size, { p: rp, color: lab });
        }
        if (o.diameter) {
          const dp = nextP();
          bpoly(R, [[c[0] - r, c[1]], [c[0] + r, c[1]]], dp, { color: 'accent2', dash: [16, 12], seed: it.seed + 2 });
          if (typeof o.diameter === 'string') btext(R, o.diameter, c[0], c[1] + 44, size, { p: dp, color: 'accent2' });
        }
        return tip;
      }
      const pts = geoPts(o), n = pts.length;
      const cx = pts.reduce((a, q) => a + q[0], 0) / n, cy = pts.reduce((a, q) => a + q[1], 0) / n;
      if (o.fill) bfill(R, pts, C(R, o.fill === true ? 'accent2' : o.fill), prog(lt, 1.0, 0.4));
      const tip = bpoly(R, pts.concat([pts[0]]), lp, { color: col, seed: it.seed });
      const rights = o.right === 'all' ? pts.map((_, i) => i) : [].concat(o.right === undefined ? [] : o.right);
      const unit = (a, b) => { const d = dist(a, b) || 1; return [(b[0] - a[0]) / d, (b[1] - a[1]) / d]; };
      rights.forEach((i) => {
        const v = pts[i], u1 = unit(v, pts[(i + n - 1) % n]), u2 = unit(v, pts[(i + 1) % n]), s = 34;
        bpoly(R, [[v[0] + u1[0] * s, v[1] + u1[1] * s], [v[0] + (u1[0] + u2[0]) * s, v[1] + (u1[1] + u2[1]) * s], [v[0] + u2[0] * s, v[1] + u2[1] * s]], prog(lt, 1.1, 0.3), { color: col, width: R.lw * 0.7, seed: it.seed + i });
      });
      (o.angles || []).forEach((txt, i) => {
        if (!txt) return;
        const ap = nextP(), v = pts[i], A = pts[(i + n - 1) % n], B = pts[(i + 1) % n];
        const a1 = Math.atan2(A[1] - v[1], A[0] - v[0]);
        let d = Math.atan2(B[1] - v[1], B[0] - v[0]) - a1;
        while (d > Math.PI) d -= TAU;
        while (d < -Math.PI) d += TAU;
        if (!rights.includes(i)) bline(R, [densify(arcPts(v[0], v[1], 52, 52, a1, a1 + d, 24), 6)], ap, { color: lab, width: R.lw * 0.7, seed: it.seed + 10 + i });
        const bis = a1 + d / 2, rr = o.angleDist || 100;
        btext(R, txt, v[0] + Math.cos(bis) * rr, v[1] + Math.sin(bis) * rr, size * 0.85, { p: ap, color: lab, dir: 'ltr' });
      });
      (o.sides || []).forEach((txt, i) => {
        if (!txt) return;
        const sp = nextP(), a = pts[i], b = pts[(i + 1) % n], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        let nx = -(b[1] - a[1]), ny = b[0] - a[0];
        const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
        if (nx * (m[0] - cx) + ny * (m[1] - cy) < 0) { nx = -nx; ny = -ny; }
        const off = o.sideDist || 52;
        btext(R, txt, m[0] + nx * off, m[1] + ny * off, size, { p: sp, color: o.sideColor || 'accent2' });
      });
      (o.vertices || []).forEach((txt, i) => {
        if (!txt) return;
        const vp = nextP(), v = pts[i], d = Math.hypot(v[0] - cx, v[1] - cy) || 1;
        btext(R, txt, v[0] + ((v[0] - cx) / d) * 46, v[1] + ((v[1] - cy) / d) * 46, size * 0.9, { p: vp, color: col, weight: 800 });
      });
      return tip;
    },
  };

  // ---- equation steps: line by line, changed terms highlighted
  function eqLines(o) {
    return cached(o, () => {
      let prev = null;
      return o.lines.map((text) => {
        const toks = text.trim().split(/\s+/);
        const pool = prev ? prev.slice() : null;
        const tokens = toks.map((s) => { let hl = false; if (pool) { const j = pool.indexOf(s); if (j >= 0) pool.splice(j, 1); else hl = true; } return { s, hl: hl && o.highlight !== false }; });
        prev = toks;
        return { text, tokens, d: clamp(0.45 + [...text].length * 0.07, 0.7, 3.5) };
      });
    });
  }
  KINDS.equation = {
    norm: (o) => (Array.isArray(o) ? { lines: o } : typeof o === 'string' ? { lines: [o] } : o),
    check: (o) => (Array.isArray(o.lines) && o.lines.length && o.lines.every((l) => typeof l === 'string' && l.trim()) ? (o.lines.length > 8 ? ['lines: 8 أسطر بالكثير'] : []) : ['lines: قائمة أسطر ["2x + 3 = 11", "2x = 8", …]']),
    dur: (o) => o.time || eqLines(o).reduce((a, l) => a + l.d + 0.25, 0) + 0.6,
    draw(R, o, p, lt, it) {
      const size = o.size || 64, gap = size * (o.gap || 1.55), at = o.at || [500, 200], L = eqLines(o), ctx = R.ctx;
      let ts = 0, tip = null;
      L.forEach((ln, i) => {
        const lp = prog(lt, ts, ln.d);
        const start = ts;
        ts += ln.d + 0.25;
        if (lp <= 0) return;
        const y = at[1] + i * gap, dir = o.dir || (isRTL(ln.text) ? 'rtl' : 'ltr');
        const px = size * TK(R), sp = measure(R, ' ', px) * 1.2;
        const ws = ln.tokens.map((tk) => measure(R, tk.s, px));
        const total = ws.reduce((a, w) => a + w, 0) + sp * (ws.length - 1);
        const left = X(R, at[0]) - total / 2;
        ctx.save();
        if (lp < 1) {
          const cw = total * easeInOut(lp);
          ctx.beginPath();
          if (dir === 'rtl') ctx.rect(left + total - cw, Y(R, y) - px, cw + 4, px * 2); else ctx.rect(left - 4, Y(R, y) - px, cw + 4, px * 2);
          ctx.clip();
          tip = [dir === 'rtl' ? left + total - cw : left + cw, Y(R, y) + Math.sin(lp * 40) * px * 0.15];
        }
        let x = dir === 'rtl' ? left + total : left;
        ln.tokens.forEach((tk, j) => {
          const w = ws[j], cx = dir === 'rtl' ? x - w / 2 : x + w / 2;
          if (tk.hl) {
            const hp = prog(lt, start + ln.d, 0.4);
            if (hp > 0) { ctx.save(); ctx.globalAlpha = 0.28 * hp; ctx.fillStyle = C(R, o.hlColor || 'yellow'); if (R.style !== 'chalkboard') ctx.globalCompositeOperation = 'multiply'; ctx.fillRect(cx - w / 2 - 6 * R.u, Y(R, y) - px * 0.62, (w + 12 * R.u) * hp, px * 1.24); ctx.restore(); }
          }
          inkText(R, tk.s, cx, Y(R, y), px, { color: tk.hl ? (o.hl || 'accent') : (o.color || 'ink'), dir: 'ltr' });
          x += dir === 'rtl' ? -(w + sp) : w + sp;
        });
        ctx.restore();
        if (i === L.length - 1 && o.box !== false && L.length > 1) {
          const bp = prog(lt, ts - 0.25, 0.5);
          const bw = total / R.k + 60;
          bpoly(R, rrectPts(at[0] - bw / 2, y - size * 0.8, bw, size * 1.6, 18), bp, { color: o.boxColor || 'accent2', seed: it.seed });
        }
      });
      return tip;
    },
  };

  // ---- table
  KINDS.table = {
    check: (o) => (o.colW !== undefined && !(isNum(o.colW) || (Array.isArray(o.colW) && o.colW.every(isNum))) ? ['colW: رقم أو قائمة أرقام'] : Array.isArray(o.rows) && o.rows.length && o.rows.every(Array.isArray) ? (o.rows.length > 8 || o.rows.some((r) => r.length > 6) ? ['rows: 8 صفوف و6 أعمدة بالكثير'] : []) : ['rows: قائمة صفوف [["…","…"],[…]]']),
    dur: (o) => o.time || 0.8 + o.rows.reduce((a, r) => a + r.length, 0) * 0.2 + 0.3,
    draw(R, o, p, lt, it) {
      const cols = Math.max(...o.rows.map((r) => r.length)), rows = o.rows.length, size = o.size || 44;
      const rowH = o.rowH || size * 1.9, cw = Array.from({ length: cols }, (_, i) => (Array.isArray(o.colW) ? o.colW[i] || o.colW[o.colW.length - 1] : o.colW || Math.min(260, 860 / cols)));
      const W = cw.reduce((a, b) => a + b, 0), H = rowH * rows, cx0 = cw.map((_, i) => cw.slice(0, i).reduce((a, b) => a + b, 0));
      const at = o.at || [500, 200], x0 = at[0] - W / 2, y0 = at[1], rtl = o.dir !== 'ltr';
      if (o.header !== false) bfill(R, [[x0, y0], [x0 + W, y0], [x0 + W, y0 + rowH], [x0, y0 + rowH]], C(R, 'accent2'), prog(lt, 0.3, 0.4) * 0.6);
      const subs = [];
      for (let i = 0; i <= rows; i++) subs.push(densify([[x0 + W, y0 + i * rowH], [x0, y0 + i * rowH]], 8));
      for (let i = 0; i <= cols; i++) { const off = i < cols ? cx0[i] : W; const lx = rtl ? x0 + W - off : x0 + off; subs.push(densify([[lx, y0], [lx, y0 + H]], 8)); }
      bline(R, subs, prog(lt, 0, 0.7), { color: o.lineColor || 'ink', width: R.lw * 0.55, seed: it.seed });
      let k = 0, tip = null;
      o.rows.forEach((row, r) => row.forEach((cell, c) => {
        const cp = prog(lt, 0.8 + k++ * 0.2, 0.3);
        if (cp <= 0) return;
        const mid = cx0[c] + cw[c] / 2, x = rtl ? x0 + W - mid : x0 + mid, y = y0 + (r + 0.5) * rowH;
        const t = btext(R, typeof cell === 'number' ? N(R, cell) : String(cell), x, y, size, { p: cp, color: r === 0 && o.header !== false ? 'accent' : 'ink', weight: r === 0 ? 800 : 700 });
        if (t) tip = t;
      }));
      return tip;
    },
  };

  // ------------------------------------------------------------ physics (deterministic from t)
  const G = (o) => (isNum(o.g) && o.g > 0 ? o.g : 9.8);
  const spd = (o) => (o.speed > 0 ? o.speed : 1);
  function hatch(R, a, b, side, p, seed) {
    // short diagonal strokes along a→b (ground / ceiling / wall)
    const L = dist(a, b), n = Math.floor(L / 34), subs = [];
    const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, nx = -uy * side, ny = ux * side;
    for (let i = 0; i <= n; i++) { const x = a[0] + ux * i * 34, y = a[1] + uy * i * 34; subs.push([[x, y], [x + nx * 22 - ux * 18, y + ny * 22 - uy * 18]]); }
    bline(R, subs, p, { color: 'gray', width: R.lw * 0.45, seed });
  }

  function projK(o) {
    const g = G(o), th = (o.angle * Math.PI) / 180, v0 = o.v0;
    const vx = v0 * Math.cos(th), vy = v0 * Math.sin(th), T = (2 * vy) / g;
    return { g, th, v0, vx, vy, T, R: vx * T, H: (vy * vy) / (2 * g) };
  }
  KINDS.projectile = {
    check: (o) => [].concat(o.v0 > 0 && o.v0 <= 200 ? [] : ['v0: السرعة الابتدائية م/ث (أكبر من 0 لحد 200)'], o.angle > 0 && o.angle < 90 ? [] : ['angle: زاوية الإطلاق بين 0 و 90 درجة'], o.g !== undefined && !(o.g > 0) ? ['g: رقم موجب'] : [], boxErr(o)),
    dur: (o) => o.time || 1.0 + projK(o).T / spd(o) + 2.0,
    draw(R, o, p, lt, it) {
      const k = projK(o), [bx, by, bw, bh] = o.box || [40, 150, 920, 640];
      const sc = o.scale > 0 ? o.scale : Math.min((bw * 0.8) / k.R, (bh * 0.6) / k.H); // board units per metre (set it to compare throws)
      const ox = bx + bw * 0.08, oy = by + bh - 20;
      const P = (x, y) => [ox + x * sc, oy - y * sc];
      const sp = prog(lt, 0, 0.7);
      bpoly(R, [[bx, oy], [bx + bw, oy]], sp, { seed: it.seed });
      hatch(R, [bx, oy], [bx + bw, oy], 1, sp, it.seed + 1);
      const c = Math.cos(k.th), s = Math.sin(k.th);
      bpoly(R, [[ox - c * 10, oy + s * 10], [ox + c * 70, oy - s * 70]], sp, { color: 'gray', width: R.lw * 2.6, seed: it.seed + 2 });
      bline(R, [arcPts(ox, oy, 110, 110, 0, -k.th, 24)], prog(lt, 0.4, 0.4), { color: 'accent2', width: R.lw * 0.7, seed: it.seed + 3 });
      btext(R, `${N(R, o.angle)}°`, ox + Math.cos(-k.th / 2) * 160, oy + Math.sin(-k.th / 2) * 160, 36, { p: prog(lt, 0.5, 0.4), color: 'accent2', dir: 'ltr' });
      const ip = prog(lt, 0.3, 0.6);
      if (o.info !== false) {
        btext(R, `السرعة الابتدائية = ${N(R, k.v0)} م/ث`, bx + bw, by - 40, 36, { p: ip, align: 'right' });
        btext(R, `الزمن = ${N(R, clamp((lt - 1.0) * spd(o), 0, k.T), 1)} ث`, bx + bw, by + 10, 34, { alpha: prog(lt, 1.0, 0.3), align: 'right', color: 'gray' });
      }
      const ts = clamp((lt - 1.0) * spd(o), 0, k.T);
      const pos = (tt) => P(k.vx * tt, k.vy * tt - 0.5 * k.g * tt * tt);
      if (lt > 1.0) {
        const pts = [], n = Math.max(2, Math.ceil((ts / k.T) * 90));
        for (let i = 0; i <= n; i++) pts.push(pos((ts * i) / n));
        bline(R, [pts], 1, { color: o.traceColor || 'yellow', width: R.lw * 0.8, dash: [6, 16], seed: it.seed + 4 });
      }
      const b = pos(ts);
      bdisk(R, b, 20, C(R, o.color || 'accent'), prog(lt, 0.6, 0.3), true);
      if (o.vectors !== false && lt > 1.0 && ts < k.T) {
        const vyNow = k.vy - k.g * ts, vs = 120 / k.v0;
        barrow(R, b, [b[0] + k.vx * vs, b[1]], 1, { color: 'blue', width: R.lw * 0.8 });
        if (Math.abs(vyNow) * vs > 8) barrow(R, b, [b[0], b[1] - vyNow * vs], 1, { color: 'pink', width: R.lw * 0.8 });
        barrow(R, b, [b[0] + k.vx * vs, b[1] - vyNow * vs], 1, { color: 'yellow', width: R.lw * 0.9 });
      }
      const ep = prog(lt, 1.0 + k.T / spd(o) + 0.15, 0.8);
      if (ep > 0 && o.labels !== false) {
        barrow(R, [ox, oy + 50], [ox + k.R * sc, oy + 50], ep, { color: 'accent', both: true, width: R.lw * 0.8, seed: it.seed + 5 });
        btext(R, `المدى ≈ ${N(R, k.R, 1)} م`, ox + (k.R * sc) / 2, oy + 100, 40, { p: ep, color: 'accent' });
        const apex = P(k.R / 2, k.H);
        bpoly(R, [[apex[0], oy], apex], ep, { color: 'accent2', dash: [12, 12], width: R.lw * 0.7, seed: it.seed + 6 });
        btext(R, `أقصى ارتفاع ≈ ${N(R, k.H, 1)} م`, apex[0] + 24, (apex[1] + oy) / 2, 36, { p: ep, color: 'accent2', align: 'left' });
      }
      return null;
    },
  };

  const pendLens = (o) => [].concat(o.length === undefined ? 1 : o.length);
  KINDS.pendulum = {
    norm: (o) => (o === true ? {} : o),
    check: (o) => [].concat(pendLens(o).every((l) => l > 0 && l <= 100) && pendLens(o).length <= 3 ? [] : ['length: طول الخيط بالمتر (أو قائمة لحد 3 أطوال)'], o.angle !== undefined && !(o.angle > 0 && o.angle <= 30) ? ['angle: بين 0 و 30 درجة (قانون الزوايا الصغيرة)'] : [], boxErr(o)),
    dur: (o) => o.time || 1.0 + (o.run || clamp(2 * TAU * Math.sqrt(Math.max(...pendLens(o)) / G(o)), 3, 10)) + 0.8,
    draw(R, o, p, lt, it) {
      const Ls = pendLens(o), g = G(o), th0 = ((o.angle || 15) * Math.PI) / 180, [bx, by, bw, bh] = o.box || [60, 130, 880, 780];
      const maxL = Math.max(...Ls), top = by + 30, sp = prog(lt, 0, 0.8);
      bpoly(R, [[bx + 60, top], [bx + bw - 60, top]], sp, { seed: it.seed });
      hatch(R, [bx + 60, top], [bx + bw - 60, top], -1, sp, it.seed + 1);
      Ls.forEach((L, i) => {
        const cx = bx + bw * (Ls.length === 1 ? 0.5 : (Ls.length - i - 0.5) / Ls.length);
        const len = Math.max(120, ((bh - 280) * L) / maxL), w = Math.sqrt(g / L), T = TAU / w;
        const tt = Math.max(0, lt - 1.0) * spd(o), th = th0 * Math.cos(w * tt);
        bpoly(R, [[cx, top], [cx, top + len + 40]], sp, { color: 'gray', dash: [10, 12], width: R.lw * 0.45, seed: it.seed + 2 + i });
        bline(R, [arcPts(cx, top, len, len, Math.PI / 2 + th0, Math.PI / 2 - th0, 24)], prog(lt, 0.5, 0.5), { color: 'gray', dash: [8, 12], width: R.lw * 0.45, seed: it.seed + 3 + i });
        const bob = [cx + Math.sin(th) * len, top + Math.cos(th) * len];
        bpoly(R, [[cx, top], bob], sp, { width: R.lw * 0.55, seed: it.seed + 4 + i });
        bdisk(R, [cx, top], 9, C(R, 'ink'), sp, true);
        bdisk(R, bob, 34, C(R, o.color || (i ? 'accent2' : 'accent')), prog(lt, 0.6, 0.3), true);
        const ly = top + len + 100, lp = prog(lt, 1.0, 0.6);
        if (o.labels !== false) {
          btext(R, `الطول = ${N(R, L)} م`, cx, ly, 36, { p: lp });
          btext(R, `الزمن الدوري ≈ ${N(R, T, 1)} ث`, cx, ly + 54, 36, { p: prog(lt, 1.5, 0.6), color: 'accent' });
          if (o.count !== false) btext(R, `عدد الذبذبات: ${N(R, Math.floor(tt / T))}`, cx, ly + 108, 32, { alpha: prog(lt, 1.5, 0.4), color: 'gray' });
        }
      });
      return null;
    },
  };

  function incK(o) {
    const g = G(o), th = ((o.angle || 30) * Math.PI) / 180, mu = o.mu || 0, m = o.mass || 2, W = m * g;
    const par = W * Math.sin(th), perp = W * Math.cos(th), slides = Math.tan(th) > mu;
    const a = slides ? g * (Math.sin(th) - mu * Math.cos(th)) : 0, fric = slides ? mu * perp : par, len = o.length || 4;
    return { g, th, mu, m, W, par, perp, fric, a, len, Ts: a > 0 ? Math.sqrt((2 * len) / a) : 0, slides };
  }
  KINDS.incline = {
    norm: (o) => (o === true ? {} : o),
    check: (o) => [].concat(o.angle === undefined || (o.angle > 0 && o.angle <= 60) ? [] : ['angle: بين 0 و 60 درجة'], o.mass === undefined || o.mass > 0 ? [] : ['mass: كتلة موجبة (كغم)'], o.mu === undefined || (o.mu >= 0 && o.mu <= 2) ? [] : ['mu: معامل الاحتكاك من 0 إلى 2'], boxErr(o)),
    dur: (o) => o.time || 3.0 + (o.slide !== false ? incK(o).Ts / spd(o) : 0) + 1.0,
    draw(R, o, p, lt, it) {
      const k = incK(o), [bx, by, bw, bh] = o.box || [40, 170, 920, 700], tan = Math.tan(k.th);
      const base = by + bh - 30, baseLen = Math.min(bw - 120, (bh - 280) / tan);
      const A = [bx + 60, base], B = [A[0] + baseLen, base], Cc = [B[0], base - baseLen * tan];
      const sp = prog(lt, 0, 0.8);
      bfill(R, [A, B, Cc], C(R, 'brown'), sp * 0.6);
      bpoly(R, [A, B, Cc, A], sp, { seed: it.seed });
      bline(R, [arcPts(A[0], A[1], 110, 110, 0, -k.th, 20)], prog(lt, 0.6, 0.4), { color: 'accent2', width: R.lw * 0.7, seed: it.seed + 1 });
      btext(R, `${N(R, o.angle || 30)}°`, A[0] + Math.cos(-k.th / 2) * 160, A[1] + Math.sin(-k.th / 2) * 160 + 6, 34, { p: prog(lt, 0.7, 0.4), color: 'accent2', dir: 'ltr' });
      const up = [Math.cos(k.th), -Math.sin(k.th)], nrm = [-Math.sin(k.th), -Math.cos(k.th)], bs = 100;
      const Lv = baseLen / Math.cos(k.th), s0 = Lv - bs * 0.75, sMin = bs * 0.6;
      const tt = o.slide === false ? 0 : Math.max(0, lt - 3.0) * spd(o);
      const dReal = Math.min(k.len, 0.5 * k.a * tt * tt), s = s0 - ((s0 - sMin) * dReal) / k.len;
      const c = [A[0] + up[0] * s + nrm[0] * (bs / 2), A[1] + up[1] * s + nrm[1] * (bs / 2)];
      const corner = (a, b) => [c[0] + up[0] * a * bs / 2 + nrm[0] * b * bs / 2, c[1] + up[1] * a * bs / 2 + nrm[1] * b * bs / 2];
      const blk = [corner(1, 1), corner(-1, 1), corner(-1, -1), corner(1, -1)];
      const bp = prog(lt, 0.6, 0.4);
      bfill(R, blk, C(R, o.color || 'accent'), bp, R.style === 'cartoon');
      bpoly(R, blk.concat([blk[0]]), bp, { seed: it.seed + 2 });
      btext(R, `${N(R, k.m)} كغم`, c[0], c[1], 28, { alpha: bp, color: R.style === 'cartoon' ? 'bg' : 'ink' });
      const fs = 200 / k.W, f1 = prog(lt, 1.1, 0.5), f2 = prog(lt, 1.6, 0.5), f3 = prog(lt, 2.1, 0.5);
      if (o.forces !== false) {
        const leg = (txt, col, i, pp) => { const ly = by + 50 + i * 50; bpoly(R, [[bx + bw, ly], [bx + bw - 40, ly]], pp, { color: col, width: R.lw * 0.9 }); btext(R, txt, bx + bw - 56, ly, 32, { p: pp, color: col, align: 'right' }); };
        barrow(R, c, [c[0], c[1] + k.W * fs], f1, { color: 'red', seed: it.seed + 3 });
        leg(`الوزن = ${N(R, k.W, 1)} نيوتن`, 'red', 0, f1);
        barrow(R, c, [c[0] + nrm[0] * k.perp * fs, c[1] + nrm[1] * k.perp * fs], f2, { color: 'blue', seed: it.seed + 4 });
        leg(`القوة العمودية = ${N(R, k.perp, 1)} نيوتن`, 'blue', 1, f2);
        let li = 2;
        if (k.mu > 0) {
          barrow(R, c, [c[0] + up[0] * k.fric * fs, c[1] + up[1] * k.fric * fs], f3, { color: 'orange', seed: it.seed + 5 });
          leg(`الاحتكاك = ${N(R, k.fric, 1)} نيوتن`, 'orange', li++, f3);
        }
        if (o.components) {
          barrow(R, c, [c[0] - up[0] * k.par * fs, c[1] - up[1] * k.par * fs], f3, { color: 'pink', dash: [12, 10], seed: it.seed + 6 });
          leg(`مركّبة الوزن على السطح = ${N(R, k.par, 1)} نيوتن`, 'pink', li++, f3);
        }
      }
      const ap = prog(lt, 2.6, 0.5);
      btext(R, k.slides ? `التعجيل = ${N(R, k.a, 2)} م/ث²` : 'الجسم ساكن: الاحتكاك يمنع الانزلاق', bx + bw, by + 50 + 50 * (o.forces === false ? -1 : 2 + (k.mu > 0) + !!o.components) + 10, 38, { p: ap, color: 'accent', align: 'right' });
      return null;
    },
  };

  KINDS.spring = {
    norm: (o) => (o === true ? {} : o),
    check: (o) => [].concat(o.k === undefined || o.k > 0 ? [] : ['k: ثابت النابض (نيوتن/م) موجب'], o.m === undefined || o.m > 0 ? [] : ['m: الكتلة (كغم) موجبة'], boxErr(o)),
    dur: (o) => { const T = TAU * Math.sqrt((o.m || 0.5) / (o.k || 20)); return o.time || 1.0 + (o.run || clamp(3 * T, 3, 8)) + 0.6; },
    draw(R, o, p, lt, it) {
      const kk = o.k || 20, m = o.m || 0.5, w = Math.sqrt(kk / m), T = TAU / w, [bx, by, bw, bh] = o.box || [40, 300, 920, 420];
      const floor = by + bh - 60, wall = bx + 40, xe = bx + bw * 0.58, A = 170 * clamp(o.amplitude === undefined ? 0.7 : o.amplitude, 0.1, 1), ms = 130;
      const sp = prog(lt, 0, 0.8), tt = Math.max(0, lt - 1.0) * spd(o), x = xe + A * Math.cos(w * tt);
      bpoly(R, [[wall, floor - 280], [wall, floor]], sp, { seed: it.seed });
      hatch(R, [wall, floor], [wall, floor - 280], -1, sp, it.seed + 1);
      bpoly(R, [[wall, floor], [bx + bw, floor]], sp, { seed: it.seed + 2 });
      bpoly(R, [[xe, floor - 230], [xe, floor + 14]], prog(lt, 0.4, 0.4), { color: 'gray', dash: [10, 12], width: R.lw * 0.5, seed: it.seed + 3 });
      btext(R, 'موضع الاتزان', xe, floor + 56, 32, { p: prog(lt, 0.6, 0.5), color: 'gray' });
      const yc = floor - ms / 2, end = x - ms / 2, coils = 12, pts = [[wall, yc], [wall + 24, yc]];
      for (let i = 1; i < coils * 2; i++) pts.push([wall + 24 + ((end - 24 - wall - 24) * i) / (coils * 2), yc + (i % 2 ? -30 : 30)]);
      pts.push([end - 24, yc], [end, yc]);
      bline(R, [pts], sp, { color: 'accent2', width: R.lw * 0.7, seed: it.seed + 4 });
      const blk = [[x - ms / 2, floor - ms], [x + ms / 2, floor - ms], [x + ms / 2, floor], [x - ms / 2, floor]];
      bfill(R, blk, C(R, o.color || 'accent'), sp, R.style === 'cartoon');
      bpoly(R, blk.concat([blk[0]]), sp, { seed: it.seed + 5 });
      btext(R, `${N(R, m)} كغم`, x, floor - ms / 2, 30, { alpha: sp, color: R.style === 'cartoon' ? 'bg' : 'ink' });
      if (o.force !== false && lt > 1.0 && Math.abs(x - xe) > 12) {
        const fy = floor - ms - 40;
        barrow(R, [x, fy], [x - (x - xe) * 0.9, fy], 1, { color: 'red', width: R.lw * 0.8 });
        btext(R, 'القوة المُعيدة', x, fy - 44, 30, { color: 'red' });
      }
      const ip = prog(lt, 0.8, 0.6);
      btext(R, `ثابت النابض = ${N(R, kk)} نيوتن/م`, bx + bw, by - 60, 34, { p: ip, align: 'right' });
      btext(R, `الزمن الدوري ≈ ${N(R, T, 2)} ث`, bx + bw, by - 6, 34, { p: prog(lt, 1.2, 0.6), color: 'accent', align: 'right' });
      if (o.formula !== false) btext(R, 'T = 2π √(m / k)', bx + 40, by - 30, 38, { p: prog(lt, 1.6, 0.8), color: 'accent2', align: 'left', dir: 'ltr' });
      return null;
    },
  };

  const swAt = (o) => (o.switch === 'open' ? Infinity : isNum(o.switch) ? o.switch : 0);
  KINDS.circuit = {
    norm: (o) => (o === true ? {} : o),
    check: (o) => [].concat(o.bulbs === undefined || (Number.isInteger(o.bulbs) && o.bulbs >= 1 && o.bulbs <= 3) ? [] : ['bulbs: من 1 إلى 3'], o.switch === undefined || o.switch === 'open' || o.switch === 'closed' || (isNum(o.switch) && o.switch >= 0) ? [] : ['switch: "open" أو "closed" أو ثواني لحد ما ينسد'], boxErr(o)),
    dur: (o) => o.time || 1.2 + (isNum(o.switch) ? o.switch : 0) + 3.0,
    draw(R, o, p, lt, it) {
      const [x0, y0, w, h] = o.box || [170, 230, 680, 520], x1 = x0 + w, y1 = y0 + h, my = (y0 + y1) / 2, nb = o.bulbs || 1;
      const sp = prog(lt, 0, 1.0), closeT = swAt(o) + 1.0, closed = lt >= closeT, cp = prog(lt, closeT - 0.3, 0.3);
      const ctx = R.ctx, bg = R.th.bg;
      const gaps = [];
      bpoly(R, [[x0, my - 12], [x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, my + 12]], sp, { seed: it.seed });
      // battery (left side, + on top)
      const cover = (x, y, ww, hh) => { ctx.save(); ctx.fillStyle = bg; ctx.globalAlpha = sp; ctx.fillRect(X(R, x), Y(R, y), ww * R.k, hh * R.k); ctx.restore(); };
      cover(x0 - 50, my - 11, 100, 22);
      bpoly(R, [[x0 - 50, my - 12], [x0 + 50, my - 12]], sp, { color: 'ink', width: R.lw * 0.8, seed: it.seed + 1 });
      bpoly(R, [[x0 - 26, my + 12], [x0 + 26, my + 12]], sp, { color: 'ink', width: R.lw * 1.8, seed: it.seed + 2 });
      btext(R, '+', x0 + 74, my - 40, 40, { alpha: sp, color: 'red', dir: 'ltr' });
      btext(R, '−', x0 + 74, my + 42, 40, { alpha: sp, color: 'blue', dir: 'ltr' });
      const lp = prog(lt, 0.8, 0.6);
      btext(R, o.battery || 'البطارية', x0 - 40, my - 30, 34, { p: lp, align: 'right' });
      if (o.volts) btext(R, `${N(R, o.volts)} فولت`, x0 - 40, my + 30, 32, { p: lp, align: 'right', color: 'gray' });
      // bulbs on top
      for (let i = 0; i < nb; i++) {
        const cx = x0 + (w * (i + 1)) / (nb + 1), r = 40;
        if (closed) {
          const gl = ctx.createRadialGradient(X(R, cx), Y(R, y0), 0, X(R, cx), Y(R, y0), r * 3 * R.k);
          gl.addColorStop(0, 'rgba(255,225,90,0.85)'); gl.addColorStop(1, 'rgba(255,225,90,0)');
          ctx.save(); ctx.globalAlpha = clamp((lt - closeT) * 3, 0, 1) * (0.85 + 0.15 * Math.sin(lt * 9 + i)); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(X(R, cx), Y(R, y0), r * 3 * R.k, 0, TAU); ctx.fill(); ctx.restore();
        }
        bdisk(R, [cx, y0], r, closed ? '#FFE680' : bg, sp, true);
        bline(R, [densify(arcPts(cx, y0, r, r, Math.PI, Math.PI + TAU, 40), 6)], sp, { seed: it.seed + 10 + i });
        bpoly(R, [[cx - 20, y0 + 6], [cx - 10, y0 - 16], [cx, y0 + 6], [cx + 10, y0 - 16], [cx + 20, y0 + 6]], sp, { color: closed ? 'orange' : 'gray', width: R.lw * 0.5, seed: it.seed + 20 + i });
        gaps.push(cx);
        if (i === 0) btext(R, nb > 1 ? 'المصابيح' : 'المصباح', cx, y0 - 84, 34, { p: lp });
      }
      // switch (bottom middle)
      const sx = x0 + w / 2, sa = sx - 50, sb = sx + 50;
      cover(sa + 8, y1 - 10, 84, 20);
      const ang = closed ? 0 : -0.55 * (1 - cp);
      bdisk(R, [sa, y1], 9, C(R, 'ink'), sp, true);
      bdisk(R, [sb, y1], 9, C(R, 'ink'), sp, true);
      bpoly(R, [[sa, y1], [sa + Math.cos(ang) * 100, y1 + Math.sin(ang) * 100]], sp, { width: R.lw * 0.9, seed: it.seed + 30 });
      btext(R, closed ? 'المفتاح مغلق' : 'المفتاح مفتوح', sx, y1 + 60, 32, { alpha: lp, color: closed ? 'green' : 'red' });
      // electrons: from − terminal along bottom → right → top → back to +
      if (closed && o.electrons !== false) {
        const loop = densify([[x0, my + 12], [x0, y1], [x1, y1], [x1, y0], [x0, y0], [x0, my - 12]], 6), L = polyLen(loop), off = ((lt - closeT) * 70) % 56;
        ctx.save(); ctx.globalAlpha = clamp((lt - closeT) * 2, 0, 1);
        for (let d = off; d < L; d += 56) { const q = pointAt(loop, d / L); bdisk(R, q, 8, C(R, 'blue'), 1, true); }
        ctx.restore();
        btext(R, 'حركة الإلكترونات ←', x1 - 20, y1 - 40, 30, { alpha: prog(lt, closeT + 0.6, 0.5), color: 'blue', align: 'right' });
      }
      if (closed && o.current) {
        const cp2 = prog(lt, closeT + 1.0, 0.6);
        barrow(R, [x0 + 60, y0 + 60], [x0 + 220, y0 + 60], cp2, { color: 'red', width: R.lw * 0.8 });
        btext(R, 'اتجاه التيار الاصطلاحي', x0 + 60, y0 + 104, 30, { p: cp2, color: 'red', align: 'left' });
      }
      return null;
    },
  };

  KINDS.wave = {
    norm: (o) => (o === true ? {} : o),
    check: (o) => [].concat(o.amplitude === undefined || (o.amplitude > 0 && o.amplitude <= 220) ? [] : ['amplitude: السعة بوحدات اللوح (1–220)'], o.wavelength === undefined || (o.wavelength >= 120 && o.wavelength <= 500) ? [] : ['wavelength: الطول الموجي بوحدات اللوح (120–500)'], boxErr(o)),
    dur: (o) => o.time || 1.2 + (o.run === undefined ? 3 : o.run) + 1.8,
    draw(R, o, p, lt, it) {
      const [bx, by, bw, bh] = o.box || [40, 230, 920, 540], ay = by + bh / 2, A = o.amplitude || 130, lam = o.wavelength || 320, run = o.run === undefined ? 3 : o.run;
      const v = o.speed === undefined ? 160 : o.speed, tt = clamp(lt - 1.2, 0, run), ph = (TAU * v * tt) / lam, x0 = bx + 20, x1 = bx + bw - 20;
      bpoly(R, [[x0, ay], [x1, ay]], prog(lt, 0, 0.6), { color: 'gray', dash: [12, 12], width: R.lw * 0.5, seed: it.seed });
      const pts = [];
      for (let x = x0; x <= x1; x += 6) pts.push([x, ay - A * Math.sin((TAU * (x - x0)) / lam - ph)]);
      const tip = bline(R, [pts], prog(lt, 0, 1.2), { color: o.color || 'accent', width: R.lw * 1.1, seed: it.seed + 1 });
      if (o.particle !== false && lt > 1.2) {
        const px = x0 + lam * 1.25, py = ay - A * Math.sin((TAU * (px - x0)) / lam - ph);
        bdisk(R, [px, py], 15, C(R, 'red'), 1, true);
        barrow(R, [px + 40, ay - 50], [px + 40, ay - A + 10], 0.99, { color: 'red', width: R.lw * 0.5, both: true });
      }
      const lp = prog(lt, 1.2 + run + 0.2, 0.8);
      if (lp > 0 && o.labels !== false) {
        let c1 = x0 + lam * ((Math.PI / 2 + ph) / TAU);
        while (c1 - lam >= x0 + 30) c1 -= lam;
        while (c1 < x0 + 30) c1 += lam;
        const c2 = c1 + lam;
        if (c2 <= x1) {
          bpoly(R, [[c1, ay - A], [c1, ay - A - 70]], lp, { color: 'gray', width: R.lw * 0.4 });
          bpoly(R, [[c2, ay - A], [c2, ay - A - 70]], lp, { color: 'gray', width: R.lw * 0.4 });
          barrow(R, [c1, ay - A - 50], [c2, ay - A - 50], lp, { color: 'accent2', both: true, width: R.lw * 0.8, seed: it.seed + 2 });
          btext(R, 'الطول الموجي λ', (c1 + c2) / 2, ay - A - 100, 40, { p: lp, color: 'accent2' });
        }
        const tr = c1 + lam / 2 <= x1 ? c1 + lam / 2 : c1 - lam / 2;
        barrow(R, [tr, ay], [tr, ay + A], prog(lt, 1.2 + run + 0.8, 0.6), { color: 'green', both: true, width: R.lw * 0.8, seed: it.seed + 3 });
        btext(R, 'السعة', tr + 20, ay + A / 2, 38, { p: prog(lt, 1.2 + run + 0.9, 0.6), color: 'green', align: 'left' });
        if (o.crest !== false) { btext(R, 'قمة', c1, ay - A + 50, 32, { alpha: lp, color: 'gray' }); btext(R, 'قاع', tr, ay + A + 46, 32, { alpha: lp, color: 'gray' }); }
      }
      return tip;
    },
  };

  KINDS.orbit = {
    norm: (o) => (o === true ? {} : o),
    check: (o) => (o.planets === undefined || (Array.isArray(o.planets) && o.planets.length >= 1 && o.planets.length <= 9 && o.planets.every((q) => q && q.r > 0 && q.r <= 480 && (q.period === undefined || q.period > 0))) ? (o.center !== undefined && !isPt(o.center) ? ['center: نقطة'] : []) : ['planets: قائمة {name, r (≤480), period بالثواني}']),
    dur: (o) => o.time || 1.0 + (o.planets ? o.planets.length * 0.3 : 0.3) + (o.run === undefined ? 4 : o.run),
    draw(R, o, p, lt, it) {
      const c = o.center || [500, 500], sr = o.sunSize || 62, planets = o.planets || [{ name: 'الأرض', r: 300, period: 6, color: 'blue', size: 26 }];
      const ctx = R.ctx;
      const gl = ctx.createRadialGradient(X(R, c[0]), Y(R, c[1]), 0, X(R, c[0]), Y(R, c[1]), sr * 2.2 * R.k);
      gl.addColorStop(0, 'rgba(255,200,60,0.6)'); gl.addColorStop(1, 'rgba(255,200,60,0)');
      ctx.save(); ctx.globalAlpha = prog(lt, 0, 0.6); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(X(R, c[0]), Y(R, c[1]), sr * 2.2 * R.k, 0, TAU); ctx.fill(); ctx.restore();
      bdisk(R, c, sr, C(R, 'yellow'), prog(lt, 0, 0.6), R.style !== 'chalkboard');
      const rays = [];
      for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU + lt * 0.2; rays.push([[c[0] + Math.cos(a) * (sr + 10), c[1] + Math.sin(a) * (sr + 10)], [c[0] + Math.cos(a) * (sr + 28), c[1] + Math.sin(a) * (sr + 28)]]); }
      bline(R, rays, prog(lt, 0.3, 0.5), { color: 'orange', width: R.lw * 0.6, seed: it.seed });
      if (o.sun !== false) btext(R, o.sun || 'الشمس', c[0], c[1], o.sunLabelSize || 30, { alpha: prog(lt, 0.4, 0.4), color: R.style === 'chalkboard' ? 'ink' : '#5A3A00', weight: 800 });
      planets.forEach((q, i) => {
        const st = 0.8 + i * 0.3, op = prog(lt, st, 0.6);
        bline(R, [densify(arcPts(c[0], c[1], q.r, q.r, 0, TAU, 96), 8)], op, { color: 'gray', dash: [8, 12], width: R.lw * 0.4, seed: it.seed + i });
        const per = q.period || 6, a = (q.start === undefined ? i * 1.7 : q.start) - (TAU * Math.max(0, lt - st)) / per;
        const pos = [c[0] + Math.cos(a) * q.r, c[1] + Math.sin(a) * q.r], size = q.size || 22;
        bdisk(R, pos, size * easeOutBack(op), C(R, q.color || 'blue'), 1, true);
        if (q.moon) { const ma = -(TAU * lt) / (q.moonPeriod || per / 4); bdisk(R, [pos[0] + Math.cos(ma) * (size + 26), pos[1] + Math.sin(ma) * (size + 26)], 8, C(R, 'gray'), op, true); }
        if (q.name) btext(R, q.name, pos[0], pos[1] - size - 26, q.labelSize || 30, { alpha: op, color: q.color || 'ink' });
      });
      return null;
    },
  };

  KINDS.lens = {
    norm: (o) => (o === true ? {} : o),
    check(o) {
      const e = [];
      if (o.type !== undefined && !['convex', 'concave'].includes(o.type)) e.push('type: convex (لامة) أو concave (مفرّقة)');
      const f = o.f || 150, d = (o.object && o.object.d) || 300;
      if (!(f >= 60 && f <= 400)) e.push('f: البعد البؤري بوحدات اللوح (60–400)');
      if (!(d > 0 && d <= 440)) e.push('object.d: بعد الجسم عن العدسة (لحد 440)');
      if (o.type !== 'concave' && Math.abs(d - f) < 10) e.push('object.d: لا تحط الجسم بالبؤرة بالضبط (ما تتكوّن صورة)');
      return e.concat(boxErr(o));
    },
    dur: (o) => o.time || 1.0 + 3 * 1.0 + 1.6,
    draw(R, o, p, lt, it) {
      const [bx, by, bw, bh] = o.box || [30, 170, 940, 620], ay = by + bh / 2, lx = bx + bw / 2;
      const concave = o.type === 'concave', f = o.f || 150, d = (o.object && o.object.d) || 300, h = (o.object && o.object.h) || 110;
      const fe = concave ? -f : f, di = (fe * d) / (d - fe), hi = (-h * di) / d, virt = di < 0;
      const sp = prog(lt, 0, 0.8);
      bpoly(R, [[bx, ay], [bx + bw, ay]], sp, { color: 'gray', width: R.lw * 0.5, seed: it.seed });
      const lh = Math.min(bh / 2 - 20, 230);
      if (concave) bline(R, [densify(catmull([[lx - 26, ay - lh], [lx - 8, ay], [lx - 26, ay + lh]], 10), 6), densify(catmull([[lx + 26, ay - lh], [lx + 8, ay], [lx + 26, ay + lh]], 10), 6), [[lx - 26, ay - lh], [lx + 26, ay - lh]], [[lx - 26, ay + lh], [lx + 26, ay + lh]]], sp, { color: 'accent2', seed: it.seed + 1 });
      else bline(R, [densify(arcPts(lx, ay, 24, lh, -Math.PI / 2, -Math.PI / 2 + TAU, 60), 6)], sp, { color: 'accent2', seed: it.seed + 1 });
      const fp = prog(lt, 0.5, 0.4);
      [[lx - f, 'ب'], [lx + f, 'ب'], [lx - 2 * f, '٢ب'], [lx + 2 * f, '٢ب']].forEach(([fx, t], i) => {
        if (fx < bx || fx > bx + bw || (i > 1 && concave)) return;
        bdisk(R, [fx, ay], 8, C(R, 'ink'), fp, true);
        btext(R, R.num === 'arabic' ? t : t.replace('٢', '2'), fx, ay + 40, 30, { alpha: fp, color: 'gray' });
      });
      const O = [lx - d, ay - h];
      barrow(R, [O[0], ay], O, prog(lt, 0.6, 0.4), { color: 'accent', width: R.lw * 1.2, seed: it.seed + 2 });
      btext(R, 'الجسم', O[0], ay + 84, 32, { p: prog(lt, 0.7, 0.4), color: 'accent' });
      const I = [lx + di, ay - hi], right = bx + bw, cols = ['yellow', 'blue', 'pink'];
      const F = concave ? [lx + f, ay] : [lx - f, ay];
      const rays = [[lx, O[1]], [lx, ay], [lx, O[1] + ((F[1] - O[1]) * (lx - O[0])) / (F[0] - O[0])]];
      rays.forEach((P, i) => {
        const rp = prog(lt, 1.0 + i * 1.0, 1.0);
        if (rp <= 0) return;
        bpoly(R, [O, P], clamp(rp / 0.45, 0, 1), { color: cols[i], width: R.lw * 0.75, seed: it.seed + 10 + i });
        if (rp <= 0.45) return;
        let D = virt ? [P[0] - I[0], P[1] - I[1]] : [I[0] - P[0], I[1] - P[1]];
        if (Math.abs(D[0]) < 1e-6) D = [1, 0];
        const tEnd = (right - P[0]) / D[0], E = [P[0] + D[0] * tEnd, P[1] + D[1] * tEnd];
        const q = (rp - 0.45) / 0.55;
        bpoly(R, [P, E], q, { color: cols[i], width: R.lw * 0.75, seed: it.seed + 20 + i });
        if (virt) bpoly(R, [P, I], q, { color: cols[i], width: R.lw * 0.5, dash: [10, 12], seed: it.seed + 30 + i });
      });
      const ip = prog(lt, 4.0, 0.6);
      if (ip > 0) {
        barrow(R, [I[0], ay], I, ip, { color: 'green', width: R.lw * 1.2, dash: virt ? [14, 10] : null, seed: it.seed + 40 });
        const m = Math.abs(di / d), size = m > 1.05 ? 'مكبّرة' : m < 0.95 ? 'مصغّرة' : 'بنفس الحجم';
        const txt = `${virt ? 'صورة خيالية معتدلة' : 'صورة حقيقية مقلوبة'} ${size}`;
        const ty = virt ? I[1] - 46 : hi < 0 ? I[1] + 50 : ay + 84;
        btext(R, txt, clamp(I[0], bx + 200, bx + bw - 200), clamp(ty, by, by + bh + 40), 32, { p: prog(lt, 4.3, 0.8), color: 'green' });
      }
      return null;
    },
  };

  KINDS.ray = {
    norm: (o) => (o === true ? {} : isNum(o) ? { angle: o } : o),
    check: (o) => [].concat(o.angle === undefined || (o.angle >= 10 && o.angle <= 75) ? [] : ['angle: زاوية السقوط بين 10 و 75 درجة'], boxErr(o)),
    dur: (o) => o.time || 3.4,
    draw(R, o, p, lt, it) {
      const [bx, by, bw, bh] = o.box || [80, 160, 840, 620], a = ((o.angle || 40) * Math.PI) / 180;
      const my = by + bh - 40, Pm = [bx + bw / 2, my], L = Math.min(bh - 80, 460);
      const sp = prog(lt, 0, 0.6);
      bpoly(R, [[bx + 60, my], [bx + bw - 60, my]], sp, { color: 'accent2', width: R.lw * 1.4, seed: it.seed });
      hatch(R, [bx + 60, my], [bx + bw - 60, my], 1, sp, it.seed + 1);
      btext(R, o.mirror || 'مرآة مستوية', bx + bw - 70, my + 64, 30, { alpha: sp, color: 'accent2', align: 'right' });
      bpoly(R, [Pm, [Pm[0], my - L]], prog(lt, 0.4, 0.5), { color: 'gray', dash: [12, 12], width: R.lw * 0.5, seed: it.seed + 2 });
      btext(R, 'العمود المقام', Pm[0], my - L - 34, 30, { p: prog(lt, 0.6, 0.5), color: 'gray' });
      const S = [Pm[0] - Math.sin(a) * L, my - Math.cos(a) * L], E = [Pm[0] + Math.sin(a) * L, my - Math.cos(a) * L];
      barrow(R, S, Pm, prog(lt, 0.8, 0.8), { color: 'yellow', seed: it.seed + 3 });
      barrow(R, Pm, E, prog(lt, 1.6, 0.8), { color: 'orange', seed: it.seed + 4 });
      const ap = prog(lt, 2.4, 0.5), rr = 120;
      bline(R, [arcPts(Pm[0], Pm[1], rr, rr, -Math.PI / 2, -Math.PI / 2 - a, 20)], ap, { color: 'yellow', width: R.lw * 0.6, seed: it.seed + 5 });
      bline(R, [arcPts(Pm[0], Pm[1], rr, rr, -Math.PI / 2, -Math.PI / 2 + a, 20)], ap, { color: 'orange', width: R.lw * 0.6, seed: it.seed + 6 });
      const deg = `${N(R, o.angle || 40)}°`;
      btext(R, `زاوية السقوط ${deg}`, Pm[0] - 30, my - rr - 70, 30, { p: ap, color: 'yellow', align: 'right' });
      btext(R, `زاوية الانعكاس ${deg}`, Pm[0] + 30, my - rr - 70, 30, { p: prog(lt, 2.7, 0.5), color: 'orange', align: 'left' });
      return null;
    },
  };

  const ffT = (o) => Math.sqrt((2 * (o.height || 20)) / G(o));
  KINDS.freefall = {
    norm: (o) => (o === true ? {} : o),
    check: (o) => [].concat(o.height === undefined || (o.height > 0 && o.height <= 500) ? [] : ['height: الارتفاع بالمتر (لحد 500)'], o.objects === undefined || (Array.isArray(o.objects) && o.objects.length >= 1 && o.objects.length <= 3) ? [] : ['objects: 1–3 إيموجي'], boxErr(o)),
    dur: (o) => o.time || 1.0 + ffT(o) / spd(o) + 1.6,
    draw(R, o, p, lt, it) {
      const g = G(o), Hm = o.height || 20, T = ffT(o), [bx, by, bw, bh] = o.box || [60, 150, 880, 760];
      const y0 = by + 40, y1 = by + bh - 30, rx = bx + 70, sp = prog(lt, 0, 0.8), sc = (y1 - y0 - 40) / Hm;
      bpoly(R, [[bx, y1], [bx + bw, y1]], sp, { seed: it.seed });
      hatch(R, [bx, y1], [bx + bw, y1], 1, sp, it.seed + 1);
      bpoly(R, [[rx, y0], [rx, y1]], sp, { color: 'gray', seed: it.seed + 2 });
      const stepM = Hm <= 10 ? 2 : Hm <= 25 ? 5 : Hm <= 60 ? 10 : 50;
      for (let m = 0; m <= Hm + 1e-9; m += stepM) {
        const y = y1 - m * sc;
        bpoly(R, [[rx - 16, y], [rx + 16, y]], sp, { color: 'gray', width: R.lw * 0.5 });
        btext(R, `${N(R, m)} م`, rx - 26, y, 28, { alpha: sp, color: 'gray', align: 'right' });
      }
      const tt = clamp((lt - 1.0) * spd(o), 0, T), objs = o.objects || [null];
      const yAt = (t) => y1 - Hm * sc - 30 + 0.5 * g * t * t * sc;
      objs.forEach((ob, i) => {
        const x = bx + bw * (objs.length === 1 ? 0.4 : 0.26 + (0.26 * i) / (objs.length - 1));
        if (o.strobe !== false) for (let s = 0; s < tt - 1e-9; s += 0.2) { if (ob) drawEmoji(R, ob, [x, yAt(s)], 70, 1, 0.3); else bdisk(R, [x, yAt(s)], 22, C(R, 'gray'), 0.4, true); }
        if (ob) drawEmoji(R, ob, [x, yAt(tt)], 80, prog(lt, 0.5, 0.4)); else bdisk(R, [x, yAt(tt)], 26, C(R, o.color || 'accent'), prog(lt, 0.5, 0.4), true);
      });
      const ip = prog(lt, 0.8, 0.4), tx = bx + bw;
      btext(R, `الزمن = ${N(R, tt, 2)} ث`, tx, y0 + 20, 36, { alpha: ip, align: 'right' });
      btext(R, `السرعة = ${N(R, g * tt, 1)} م/ث`, tx, y0 + 76, 36, { alpha: ip, align: 'right', color: 'accent' });
      btext(R, `المسافة = ${N(R, 0.5 * g * tt * tt, 1)} م`, tx, y0 + 132, 36, { alpha: ip, align: 'right', color: 'accent2' });
      return null;
    },
  };

  // ------------------------------------------------------------ other subjects
  const ATOMS = {
    H: { r: 0.3, c: '#F2F2F2', t: '#333333' }, O: { r: 0.44, c: '#E5533D', t: '#FFFFFF' }, C: { r: 0.42, c: '#4A4A4A', t: '#FFFFFF' },
    N: { r: 0.42, c: '#3B6FD8', t: '#FFFFFF' }, Cl: { r: 0.48, c: '#2EAA5C', t: '#FFFFFF' }, Na: { r: 0.48, c: '#8E5BB5', t: '#FFFFFF' },
  };
  const s52 = Math.sin((52.25 * Math.PI) / 180), c52 = Math.cos((52.25 * Math.PI) / 180);
  const MOLECULES = {
    H2O: { name: 'جزيء الماء H₂O', atoms: [['O', 0, -0.25], ['H', -s52, c52 - 0.25], ['H', s52, c52 - 0.25]], bonds: [[0, 1, 1], [0, 2, 1]], angle: { at: 0, a: 1, b: 2, text: '104.5°' } },
    CO2: { name: 'ثاني أكسيد الكربون CO₂', atoms: [['O', -1.2, 0], ['C', 0, 0], ['O', 1.2, 0]], bonds: [[1, 0, 2], [1, 2, 2]] },
    O2: { name: 'جزيء الأكسجين O₂', atoms: [['O', -0.6, 0], ['O', 0.6, 0]], bonds: [[0, 1, 2]] },
    H2: { name: 'جزيء الهيدروجين H₂', atoms: [['H', -0.42, 0], ['H', 0.42, 0]], bonds: [[0, 1, 1]] },
    N2: { name: 'جزيء النيتروجين N₂', atoms: [['N', -0.6, 0], ['N', 0.6, 0]], bonds: [[0, 1, 3]] },
    CH4: { name: 'الميثان CH₄', atoms: [['C', 0, 0], ['H', 0, -1], ['H', 1, 0], ['H', 0, 1], ['H', -1, 0]], bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]] },
    NH3: { name: 'الأمونيا NH₃', atoms: [['N', 0, -0.2], ['H', -0.9, 0.35], ['H', 0.9, 0.35], ['H', 0, 0.85]], bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1]] },
    HCl: { name: 'كلوريد الهيدروجين HCl', atoms: [['H', -0.6, 0], ['Cl', 0.55, 0]], bonds: [[0, 1, 1]] },
  };
  const SUB = '₀₁₂₃₄₅₆₇₈₉';
  const chemFmt = (s) => String(s).replace(/([A-Za-z)])(\d+)/g, (m, a, d) => a + d.replace(/\d/g, (x) => SUB[x]));
  KINDS.chemistry = {
    norm: (o) => (typeof o === 'string' ? { molecule: o } : o),
    check(o) {
      if (o.molecule !== undefined) {
        if (typeof o.molecule === 'string' && !MOLECULES[o.molecule]) return [`molecule: واحد من ${Object.keys(MOLECULES).join('، ')} (أو {atoms, bonds})`];
        if (typeof o.molecule === 'object' && !(Array.isArray(o.molecule.atoms) && Array.isArray(o.molecule.bonds))) return ['molecule: {atoms:[["O",0,0],…], bonds:[[0,1,1],…]}'];
        return [];
      }
      if (o.reaction) return Array.isArray(o.reaction.left) && Array.isArray(o.reaction.right) && o.reaction.left.length && o.reaction.right.length ? [] : ['reaction: {left:[…], right:[…]}'];
      return ['molecule أو reaction'];
    },
    dur(o) { if (o.time) return o.time; if (o.reaction) return 2.2 + (o.reaction.over ? 0.6 : 0); const m = typeof o.molecule === 'string' ? MOLECULES[o.molecule] : o.molecule; return 0.6 + m.atoms.length * 0.4 + m.bonds.length * 0.3 + 1.0; },
    draw(R, o, p, lt, it) {
      if (o.reaction) {
        const rx = o.reaction, size = o.size || 60, at = o.at || [500, 760];
        const L = rx.left.map(chemFmt).join(' + '), Rt = rx.right.map(chemFmt).join(' + '), full = `${L}  →  ${Rt}`;
        const wp = prog(lt, 0, 1.8), tip = btext(R, full, at[0], at[1], size, { p: wp, dir: 'ltr', color: o.color });
        if (rx.over) {
          const wl = measure(R, `${L}  `, size * TK(R)) / R.k, wf = measure(R, full, size * TK(R)) / R.k, wa = measure(R, '→', size * TK(R)) / R.k;
          const ax = at[0] - wf / 2 + wl + wa / 2;
          btext(R, rx.over, ax, at[1] - size * 0.95, size * 0.5, { p: prog(lt, 1.8, 0.6), color: 'accent' });
          if (rx.under) btext(R, rx.under, ax, at[1] + size * 0.95, size * 0.5, { p: prog(lt, 2.0, 0.6), color: 'accent' });
        }
        return tip;
      }
      const m = typeof o.molecule === 'string' ? MOLECULES[o.molecule] : o.molecule, at = o.at || [500, 420], u = (o.size || 420) / 3;
      const P = (a) => [at[0] + a[1] * u, at[1] + a[2] * u], rad = (a) => (ATOMS[a[0]] || ATOMS.C).r * u;
      let k = 0;
      m.atoms.forEach((a, i) => {
        const ap = prog(lt, 0.3 + i * 0.4, 0.4), c = P(a), sp = ATOMS[a[0]] || ATOMS.C;
        if (ap <= 0) return;
        const r = rad(a) * easeOutBack(ap);
        bdisk(R, c, r, R.style === 'chalkboard' ? C(R, { O: 'red', H: 'white', C: 'gray', N: 'blue', Cl: 'green', Na: 'purple' }[a[0]] || 'gray') : sp.c, 1, R.style !== 'chalkboard');
        bline(R, [densify(arcPts(c[0], c[1], r, r, 0, TAU, 40), 6)], 1, { width: R.lw * 0.6, seed: it.seed + i });
        btext(R, a[0], c[0], c[1], rad(a) * 0.9, { alpha: ap, color: R.style === 'chalkboard' ? 'ink' : sp.t, weight: 800, dir: 'ltr' });
        k = i;
      });
      const b0 = 0.3 + m.atoms.length * 0.4;
      m.bonds.forEach((b, i) => {
        const A = m.atoms[b[0]], B = m.atoms[b[1]], pa = P(A), pb = P(B), d = dist(pa, pb) || 1, ux = (pb[0] - pa[0]) / d, uy = (pb[1] - pa[1]) / d;
        const s = [pa[0] + ux * rad(A), pa[1] + uy * rad(A)], e = [pb[0] - ux * rad(B), pb[1] - uy * rad(B)], n = b[2] || 1, subs = [];
        for (let j = 0; j < n; j++) { const off = (j - (n - 1) / 2) * 16; subs.push(densify([[s[0] - uy * off, s[1] + ux * off], [e[0] - uy * off, e[1] + ux * off]], 6)); }
        bline(R, subs, prog(lt, b0 + i * 0.3, 0.3), { width: R.lw * 0.8, seed: it.seed + 30 + i });
      });
      const after = b0 + m.bonds.length * 0.3;
      if (m.angle && o.angle !== false) {
        const v = P(m.atoms[m.angle.at]), A = P(m.atoms[m.angle.a]), B = P(m.atoms[m.angle.b]);
        const a1 = Math.atan2(A[1] - v[1], A[0] - v[0]), a2 = Math.atan2(B[1] - v[1], B[0] - v[0]), rr = rad(m.atoms[m.angle.at]) + 40;
        const ap = prog(lt, after, 0.5);
        bline(R, [arcPts(v[0], v[1], rr, rr, a1, a2, 24)], ap, { color: 'accent', width: R.lw * 0.6, dash: [8, 8], seed: it.seed + 60 });
        btext(R, R.num === 'arabic' ? fmt(104.5, 'arabic') + '°' : m.angle.text, v[0], v[1] + rr + 40, 36, { p: ap, color: 'accent', dir: 'ltr' });
      }
      const maxY = Math.max(...m.atoms.map((a) => a[2] * u + rad(a)));
      if (o.name !== false) btext(R, o.name || m.name || '', at[0], at[1] + maxY + 90, 44, { p: prog(lt, after + 0.3, 0.7), color: 'accent2' });
      return null;
    },
  };

  function cellGeo(kind) {
    const c = [500, 470];
    if (kind === 'plant-cell') {
      return {
        outline: [rrectPts(c[0] - 230, c[1] - 175, 460, 350, 30), rrectPts(c[0] - 212, c[1] - 157, 424, 314, 22)],
        fills: [{ pts: rrectPts(c[0] - 150, c[1] - 95, 210, 190, 50), color: 'blue' }],
        blobs: [[c[0] + 120, c[1] - 85, 52, 'purple'], [c[0] + 125, c[1] - 85, 18, 'ink']],
        ovals: [[c[0] + 130, c[1] + 60, 48, 22, 0.3, 'green'], [c[0] - 170, c[1] + 120, 40, 18, -0.2, 'green'], [c[0] + 30, c[1] + 125, 44, 20, 0.1, 'green'], [c[0] - 175, c[1] - 125, 40, 18, 0.4, 'green']],
        labels: [
          { text: 'الجدار الخلوي', at: [c[0] + 230, c[1] - 120], side: 'right', y: 190 },
          { text: 'الغشاء الخلوي', at: [c[0] + 212, c[1] + 20], side: 'right', y: 330 },
          { text: 'النواة', at: [c[0] + 120, c[1] - 85], side: 'right', y: 470 },
          { text: 'البلاستيدات الخضراء', at: [c[0] + 130, c[1] + 60], side: 'right', y: 760 },
          { text: 'الفجوة العصارية', at: [c[0] - 100, c[1]], side: 'left', y: 240 },
          { text: 'السيتوبلازم', at: [c[0] - 190, c[1] + 40], side: 'left', y: 720 },
        ],
      };
    }
    const mem = [];
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU, rr = 1 + (rnd(i * 3.3) - 0.5) * 0.12; mem.push([c[0] + Math.cos(a) * 215 * rr, c[1] + Math.sin(a) * 165 * rr]); }
    return {
      outline: [catmull(mem, 8, true)],
      fills: [],
      blobs: [[c[0] - 30, c[1] - 10, 70, 'purple'], [c[0] - 20, c[1] - 15, 22, 'ink']],
      ovals: [[c[0] + 115, c[1] + 70, 42, 20, 0.4, 'orange'], [c[0] - 130, c[1] + 85, 40, 19, -0.3, 'orange'], [c[0] + 95, c[1] - 95, 38, 18, -0.5, 'orange']],
      labels: [
        { text: 'الغشاء الخلوي', at: [c[0] + 200, c[1] - 70], side: 'right', y: 240 },
        { text: 'النواة', at: [c[0] - 30, c[1] - 10], side: 'right', y: 470 },
        { text: 'الميتوكوندريا', at: [c[0] + 115, c[1] + 70], side: 'right', y: 720 },
        { text: 'السيتوبلازم', at: [c[0] - 150, c[1] - 60], side: 'left', y: 300 },
        { text: 'النُّوَيّة', at: [c[0] - 20, c[1] - 15], side: 'left', y: 560 },
      ],
    };
  }
  KINDS.biology = {
    norm: (o) => (typeof o === 'string' ? { diagram: o } : o),
    check: (o) => (['animal-cell', 'plant-cell'].includes(o.diagram) ? [] : ['diagram: animal-cell أو plant-cell']),
    dur: (o) => o.time || 1.6 + cellGeo(o.diagram).labels.length * 0.55 + 0.3,
    draw(R, o, p, lt, it) {
      const g = cellGeo(o.diagram), sp = prog(lt, 0, 1.0);
      if (o.diagram === 'animal-cell') bfill(R, g.outline[0], C(R, 'pink'), sp * 0.5);
      else bfill(R, g.outline[1], C(R, 'green'), sp * 0.35);
      g.fills.forEach((f) => bfill(R, f.pts, C(R, f.color), prog(lt, 0.6, 0.4)));
      g.fills.forEach((f, i) => bpoly(R, f.pts, prog(lt, 0.6, 0.5), { color: f.color, width: R.lw * 0.6, seed: it.seed + 40 + i }));
      bline(R, g.outline.map((s) => densify(s, 8)), sp, { seed: it.seed });
      g.blobs.forEach(([x, y, r, col], i) => { const bp = prog(lt, 0.8 + i * 0.1, 0.4); bdisk(R, [x, y], r, C(R, col), bp * (i ? 1 : 0.6), i > 0); if (!i) bline(R, [densify(arcPts(x, y, r, r, 0, TAU, 40), 6)], bp, { color: col, seed: it.seed + 5 }); });
      g.ovals.forEach(([x, y, rx, ry, rot, col], i) => {
        const op = prog(lt, 1.0 + i * 0.1, 0.4), pts = arcPts(0, 0, rx, ry, 0, TAU, 32).map(([a, b]) => [x + a * Math.cos(rot) - b * Math.sin(rot), y + a * Math.sin(rot) + b * Math.cos(rot)]);
        bfill(R, pts, C(R, col), op * 0.8);
        bline(R, [densify(pts, 6)], op, { color: col, width: R.lw * 0.6, seed: it.seed + 10 + i });
      });
      if (R.style !== 'paper') for (let i = 0; i < 26; i++) { const a = rnd(i * 7.7) * TAU, rr = Math.sqrt(rnd(i * 3.1)) * 0.8; bdisk(R, [500 + Math.cos(a) * 190 * rr, 470 + Math.sin(a) * 140 * rr], 4, C(R, 'gray'), sp * 0.6, true); }
      let tip = null;
      if (o.labels !== false) g.labels.forEach((l, i) => {
        const lp = prog(lt, 1.6 + i * 0.55, 0.55), right = l.side === 'right', tx = right ? 985 : 15;
        if (lp <= 0) return;
        const tw = measure(R, l.text, 34 * TK(R)) / R.k, ex = right ? tx - tw - 14 : tx + tw + 14;
        bpoly(R, [[ex, l.y], l.at], clamp(lp * 2, 0, 1), { color: 'gray', width: R.lw * 0.45, seed: it.seed + 20 + i });
        bdisk(R, l.at, 7, C(R, 'accent'), lp, true);
        const t = btext(R, l.text, tx, l.y, 34, { p: clamp(lp * 2 - 1, 0, 1), align: right ? 'right' : 'left', color: 'ink' });
        if (t) tip = t;
      });
      return tip;
    },
  };

  // rough continents (lon, lat) — a teaching sketch, not a real map
  const CONTINENTS = [
    { name: 'أمريكا الشمالية', at: [-102, 46], pts: [[-165, 66], [-140, 70], [-95, 74], [-78, 72], [-62, 60], [-55, 50], [-70, 44], [-76, 35], [-81, 26], [-97, 20], [-87, 15], [-80, 8], [-92, 15], [-105, 21], [-114, 30], [-124, 40], [-126, 50], [-140, 59], [-160, 58]] },
    { name: '', at: [0, 0], pts: [[-52, 82], [-25, 81], [-20, 72], [-42, 60], [-54, 68]] },
    { name: 'أمريكا الجنوبية', at: [-60, -14], pts: [[-78, 9], [-62, 10], [-50, 0], [-35, -6], [-40, -22], [-48, -28], [-58, -38], [-66, -55], [-74, -50], [-72, -30], [-71, -18], [-81, -5]] },
    { name: 'أوروبا', at: [18, 52], pts: [[-10, 37], [0, 43], [-4, 48], [5, 53], [9, 57], [6, 62], [15, 69], [28, 71], [42, 67], [50, 60], [50, 46], [40, 43], [28, 41], [24, 37], [16, 39], [10, 44], [3, 42]] },
    { name: 'آسيا', at: [100, 60], pts: [[50, 60], [62, 70], [80, 74], [105, 77], [140, 72], [178, 68], [170, 60], [158, 53], [142, 47], [130, 40], [122, 31], [120, 22], [108, 18], [105, 10], [100, 2], [96, 12], [86, 20], [78, 8], [72, 20], [62, 25], [56, 24], [52, 17], [43, 13], [36, 30], [36, 36], [40, 43], [50, 46]] },
    { name: 'أفريقيا', at: [20, 5], pts: [[-17, 21], [-10, 34], [10, 37], [32, 31], [43, 12], [51, 11], [42, -2], [40, -15], [34, -26], [20, -35], [14, -24], [12, -6], [9, 4], [-8, 5], [-17, 14]] },
    { name: 'أستراليا', at: [134, -26], pts: [[114, -22], [130, -12], [142, -11], [153, -27], [150, -37], [140, -38], [130, -32], [115, -34]] },
    { name: 'القارة القطبية الجنوبية', at: [0, -80], pts: [[-180, -72], [-120, -73], [-60, -66], [0, -70], [60, -67], [120, -66], [180, -72], [180, -86], [-180, -86]] },
  ];
  const OCEANS = [['المحيط الهادئ', -150, -10], ['المحيط الأطلسي', -32, 12], ['المحيط الهندي', 78, -22], ['المتجمد الشمالي', 20, 81], ['المتجمد الجنوبي', 95, -57]];
  KINDS.geography = {
    norm: (o) => (typeof o === 'string' ? { preset: o } : o),
    check(o) {
      const e = [];
      if (o.preset !== undefined && !['world', 'none'].includes(o.preset)) e.push('preset: world أو none');
      (o.shapes || []).forEach((s, i) => { if (!s || !isPts(s.points, 3)) e.push(`shapes[${i}].points: 3 نقاط أو أكثر`); });
      (o.pins || []).forEach((q, i) => { if (!q || !(isPt(q.at) || isPt(q.lonlat))) e.push(`pins[${i}]: at [x,y] أو lonlat [خط طول, خط عرض]`); });
      return e.concat(boxErr(o));
    },
    dur: (o) => o.time || 0.8 + (o.preset === 'world' ? CONTINENTS.length * 0.35 : 0) + (o.shapes || []).length * 0.6 + (o.oceans ? 1.0 : 0) + (o.pins || []).length * 0.6 + 0.4,
    draw(R, o, p, lt, it) {
      const [bx, by, bw, bh] = o.box || [30, 230, 940, 470];
      const LL = (lon, lat) => [bx + ((lon + 180) / 360) * bw, by + ((90 - lat) / 180) * bh];
      const sp = prog(lt, 0, 0.6);
      if (o.sea !== false) bfill(R, [[bx, by], [bx + bw, by], [bx + bw, by + bh], [bx, by + bh]], C(R, 'blue'), sp * 0.35);
      bpoly(R, [[bx, by], [bx + bw, by], [bx + bw, by + bh], [bx, by + bh], [bx, by]], sp, { color: 'gray', width: R.lw * 0.5, seed: it.seed });
      let t0 = 0.6;
      const land = (pts, label, at, i, col) => {
        const lp = prog(lt, t0, 0.5);
        const sm = catmull(pts, 4, true);
        bfill(R, sm, C(R, col || 'green'), lp * 0.8);
        bline(R, [densify(sm, 6)], lp, { color: col || 'green', width: R.lw * 0.6, seed: it.seed + i });
        if (label) btext(R, label, at[0], at[1], o.labelSize || 26, { p: prog(lt, t0 + 0.3, 0.5), color: 'ink', weight: 800 });
        t0 += o.preset === 'world' ? 0.35 : 0.6;
      };
      const ctx = R.ctx;
      ctx.save(); ctx.beginPath(); ctx.rect(X(R, bx), Y(R, by), bw * R.k, bh * R.k); ctx.clip();
      if (o.preset === 'world') CONTINENTS.forEach((c, i) => land(c.pts.map((q) => LL(q[0], q[1])), c.name, LL(c.at[0], c.at[1]), i, i === 7 ? 'gray' : 'green'));
      (o.shapes || []).forEach((s, i) => land(s.points, s.label, s.labelAt || s.points.reduce((a, q) => [a[0] + q[0] / s.points.length, a[1] + q[1] / s.points.length], [0, 0]), 20 + i, s.color));
      ctx.restore();
      if (o.oceans) { const op = prog(lt, t0, 0.8); OCEANS.forEach(([n, lo, la]) => btext(R, n, LL(lo, la)[0], LL(lo, la)[1], 24, { alpha: op, color: 'blue' })); t0 += 1.0; }
      (o.pins || []).forEach((q, i) => {
        const pp = prog(lt, t0 + i * 0.6, 0.5);
        if (pp <= 0) return;
        const at = q.lonlat ? LL(q.lonlat[0], q.lonlat[1]) : q.at, drop = (1 - easeOutBack(pp)) * 80;
        const tipPt = [at[0], at[1] - drop];
        bfill(R, [tipPt, [tipPt[0] - 16, tipPt[1] - 34], [tipPt[0] + 16, tipPt[1] - 34]], C(R, q.color || 'red'), 1, true);
        bdisk(R, [tipPt[0], tipPt[1] - 42], 18, C(R, q.color || 'red'), 1, true);
        bdisk(R, [tipPt[0], tipPt[1] - 42], 7, '#FFFFFF', 1, true);
        if (q.emoji) drawEmoji(R, q.emoji, [tipPt[0], tipPt[1] - 100], 56, pp);
        if (q.label) btext(R, q.label, tipPt[0] + (q.side === 'left' ? -28 : 28), tipPt[1] - 42, 32, { p: prog(lt, t0 + i * 0.6 + 0.3, 0.5), align: q.side === 'left' ? 'right' : 'left', color: q.color || 'red', weight: 800 });
      });
      if (o.compass !== false) {
        const cc = o.compassAt || [bx + bw - 60, by - 90], cp = prog(lt, 0.3, 0.5);
        barrow(R, [cc[0], cc[1] + 34], [cc[0], cc[1] - 34], cp, { color: 'red', width: R.lw * 0.7 });
        bpoly(R, [[cc[0] - 34, cc[1]], [cc[0] + 34, cc[1]]], cp, { color: 'gray', width: R.lw * 0.5 });
        [['ش', 0, -62], ['ج', 0, 62], ['ق', 58, 0], ['غ', -58, 0]].forEach(([t, dx, dy]) => btext(R, t, cc[0] + dx, cc[1] + dy, 28, { alpha: cp, color: t === 'ش' ? 'red' : 'gray', weight: 800 }));
      }
      return null;
    },
  };

  KINDS.timeline = {
    norm: (o) => (Array.isArray(o) ? { events: o } : o),
    check: (o) => (Array.isArray(o.events) && o.events.length >= 2 && o.events.length <= 8 && o.events.every((e) => e && typeof e.label === 'string' && (typeof e.year === 'string' || isNum(e.year))) ? [] : ['events: 2–8 أحداث {year, label}']),
    dur: (o) => o.time || 1.0 + o.events.length * 0.9 + 0.4,
    draw(R, o, p, lt, it) {
      const y = isNum(o.y) ? o.y : 500, x0 = 60, x1 = 940, rtl = o.dir !== 'ltr', n = o.events.length, ctx = R.ctx;
      barrow(R, rtl ? [x1, y] : [x0, y], rtl ? [x0, y] : [x1, y], prog(lt, 0, 0.9), { color: o.color || 'ink', seed: it.seed });
      const span = (x1 - x0 - 140) / (n - 1), maxW = Math.min(300, span * 1.9);
      let tip = null;
      o.events.forEach((e, i) => {
        const ep = prog(lt, 1.0 + i * 0.9, 0.8);
        if (ep <= 0) return;
        const x = rtl ? x1 - 70 - i * span : x0 + 70 + i * span, up = i % 2 === 0, s = up ? -1 : 1;
        bdisk(R, [x, y], 16 * easeOutBack(clamp(ep * 3, 0, 1)), C(R, 'accent'), 1, true);
        bpoly(R, [[x, y + s * 20], [x, y + s * 60]], clamp(ep * 3, 0, 1), { color: 'gray', width: R.lw * 0.5 });
        const yr = typeof e.year === 'number' ? N(R, e.year) : digits(e.year, R.num);
        const t1 = btext(R, yr, x, y + s * 95, o.yearSize || 44, { p: clamp(ep * 2, 0, 1), color: 'accent', weight: 800 });
        ctx.save(); ctx.font = `700 ${Math.round(32 * TK(R))}px ${R.font}`; ctx.direction = 'rtl';
        const lines = wrapWords(ctx, e.label.split(/\s+/), maxW * R.k).slice(0, 3);
        ctx.restore();
        lines.forEach((ln, j) => { const ly = up ? y - 150 - (lines.length - 1 - j) * 44 : y + 150 + j * 44; const t2 = btext(R, ln, x, ly, 32, { p: clamp(ep * 2 - 0.6, 0, 1) }); if (t2) tip = t2; });
        if (e.emoji) drawEmoji(R, e.emoji, [x, up ? y - 150 - lines.length * 44 - 40 : y + 150 + lines.length * 44 + 30], 64, clamp(ep * 2 - 1, 0, 1));
        if (t1) tip = t1;
      });
      return tip;
    },
  };

  function letterGeo(o) {
    return cached(o, () => {
      const L = LETTERS[o.letter], at = o.at || [500, 470], s = (o.size || 640) / 1000;
      const map = (q) => [at[0] + (q[0] - 500) * s, at[1] + (q[1] - 560) * s];
      const strokes = L.strokes.map((st) => densify(catmull(st.map(map), 10), 6));
      return { strokes, dots: L.dots.map(map), s, len: strokes.reduce((a, q) => a + polyLen(q), 0) };
    });
  }
  KINDS.alphabet = {
    norm: (o) => (typeof o === 'string' ? { letter: o } : o),
    check: (o) => (LETTERS[o.letter] ? (o.at !== undefined && !isPt(o.at) ? ['at: نقطة'] : []) : [`letter: حرف من ${Object.keys(LETTERS).join(' ')}`]),
    dur: (o) => { const g = letterGeo(o); return o.time || 0.9 + g.len / 380 + g.dots.length * 0.35 + 0.5 + (o.word ? textDur(o.word) + 0.3 : 0); },
    draw(R, o, p, lt, it) {
      const g = letterGeo(o), w = (o.width || 26) * g.s * 1.6, gp = prog(lt, 0, 0.7);
      if (o.guide !== false) {
        bline(R, g.strokes, gp, { color: 'gray', width: w * 1.5, alpha: 0.35, seed: it.seed });
        bline(R, g.strokes, gp, { color: 'gray', width: w * 0.25, dash: [6, 16], alpha: 0.9, seed: it.seed + 1 });
        g.strokes.forEach((st, i) => { if (i === 0 || dist(st[0], g.strokes[i - 1][g.strokes[i - 1].length - 1]) > 20) bdisk(R, st[0], 14, C(R, 'green'), gp, true); });
      }
      const tlen = g.len / 380, tp = prog(lt, 0.9, tlen);
      const tip = bline(R, g.strokes, tp, { color: o.color || 'accent', width: w, seed: it.seed + 2 });
      g.dots.forEach((d, i) => bdisk(R, d, w * 0.9 * easeOutBack(prog(lt, 0.9 + tlen + i * 0.35, 0.35)), C(R, o.color || 'accent'), 1, true));
      const after = 0.9 + tlen + g.dots.length * 0.35 + 0.3;
      if (o.word) btext(R, o.word, (o.at || [500, 470])[0], (o.at || [500, 470])[1] + (o.size || 640) * 0.5 + 40, o.wordSize || 80, { p: prog(lt, after, textDur(o.word)), color: 'accent2' });
      if (o.emoji) drawEmoji(R, o.emoji, o.emojiAt || [150, 160], 140, prog(lt, after, 0.5));
      return tip;
    },
  };

  const BOARD_KINDS = Object.keys(KINDS);
  const STAGE_KEYS = ['show', 'morph', 'reveal', 'count', 'compare', 'quiz'];
  const hasStage = (b) => STAGE_KEYS.some((k) => b[k] !== undefined);
  /** The board items of a beat, in the order the author wrote the keys. */
  function beatItems(b) {
    const out = [];
    for (const key of Object.keys(b)) {
      if (!KINDS[key] || (key === 'label' && typeof b.label === 'string')) continue;
      for (const o of [].concat(b[key])) if (o && typeof o === 'object') out.push({ key, o });
    }
    return out;
  }

  // ------------------------------------------------------------ validation
  function isElement(e) {
    return e && typeof e === 'object' && ['text', 'emoji'].includes(e.kind || 'text') && typeof e.value === 'string' && e.value.length > 0;
  }

  /** Returns { scene, errors }. scene has every default filled in. */
  function normalizeScene(input) {
    const errors = [];
    const s = typeof input === 'string' ? JSON.parse(input) : JSON.parse(JSON.stringify(input || {}));
    if (!Array.isArray(s.beats) || !s.beats.length) errors.push('beats: لازم يكون بيه مشهد واحد على الأقل');
    s.format = s.format || '9:16';
    if (!FORMATS[s.format]) errors.push(`format: «${s.format}» مو مدعوم (9:16، 16:9، 1:1، 3:4)`);
    s.style = s.style || 'cartoon';
    if (!STYLES.includes(s.style)) errors.push(`style: «${s.style}» مو مدعوم (${STYLES.join('، ')})`);
    s.theme = Object.assign({}, DEFAULT_THEME, s.theme || {});
    const noChar = s.character === false;
    s.character = Object.assign({}, DEFAULT_CHAR, noChar ? {} : s.character || {});
    if (noChar) s.character.hidden = true;
    if (!GENDERS.includes(s.character.gender)) errors.push(`character.gender: «${s.character.gender}» — male (ذكر) أو female (أنثى)`);
    if (!s.character.name) s.character.name = s.character.gender === 'male' ? 'المعلّم' : 'المعلّمة';
    if (s.character.gender === 'male' && s.character.hijab) s.character.hijab = '';
    // optional face photo: the head becomes this picture in a circle (a path, URL or data: URI)
    if (s.character.photo === undefined || s.character.photo === null || s.character.photo === '') delete s.character.photo;
    else if (typeof s.character.photo !== 'string') errors.push('character.photo: صورة الوجه لازم رابط أو مسار (نص) — مثل "me.jpg" أو data:image/…');
    s.board = Object.assign({ frame: true, paper: 'grid' }, s.board || {});
    if (s.palette !== undefined && (typeof s.palette !== 'object' || !s.palette)) errors.push('palette: كائن ألوان مثل {"accent": "#F7D774"}');
    s.numerals = s.numerals === 'arabic' ? 'arabic' : 'western';
    s.title = s.title || '';
    (s.beats || []).forEach((b, i) => {
      const at = `beats[${i}]`;
      if (typeof b.say !== 'string') errors.push(`${at}.say: نص الكلام مطلوب`);
      for (const k of ['show']) if (b[k] !== undefined) { if (typeof b[k] === 'string') b[k] = { kind: guessKind(b[k]), value: b[k] }; if (!isElement(b[k])) errors.push(`${at}.${k}: عنصر غير صالح`); }
      if (b.morph !== undefined) {
        if (typeof b.morph.to === 'string') b.morph.to = { kind: guessKind(b.morph.to), value: b.morph.to };
        if (!isElement(b.morph.to)) errors.push(`${at}.morph.to: عنصر غير صالح`);
      }
      if (b.count !== undefined) {
        if (typeof b.count.item === 'string') b.count.item = { kind: guessKind(b.count.item), value: b.count.item };
        if (!isElement(b.count.item)) errors.push(`${at}.count.item: عنصر غير صالح`);
        if (!(b.count.n >= 1 && b.count.n <= 12)) errors.push(`${at}.count.n: من 1 إلى 12`);
      }
      if (b.reveal !== undefined) {
        if (typeof b.reveal === 'string') b.reveal = { text: b.reveal };
        if (!b.reveal || typeof b.reveal.text !== 'string' || !b.reveal.text) errors.push(`${at}.reveal.text: نص مطلوب`);
      }
      if (b.compare !== undefined) {
        const c = b.compare || {};
        for (const k of ['a', 'b']) { if (typeof c[k] === 'string') c[k] = { kind: guessKind(c[k]), value: c[k] }; if (!isElement(c[k])) errors.push(`${at}.compare.${k}: عنصر غير صالح`); }
      }
      if (b.quiz !== undefined) {
        const q = b.quiz || {};
        if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 4) errors.push(`${at}.quiz.options: من 2 إلى 4 خيارات`);
        else q.options = q.options.map((o) => (typeof o === 'string' ? { kind: guessKind(o), value: o } : o));
        if (!(Number.isInteger(q.answer) && q.options && q.answer >= 0 && q.answer < q.options.length)) errors.push(`${at}.quiz.answer: رقم الخيار الصحيح (يبدي من 0)`);
      }
      if (b.mood !== undefined && !MOODS.includes(b.mood)) errors.push(`${at}.mood: واحد من ${MOODS.join('، ')}`);
      if (b.bg !== undefined && !/^#[0-9a-f]{6}$/i.test(b.bg)) errors.push(`${at}.bg: لون hex`);
      if (b.duration !== undefined && !(b.duration > 0.5 && b.duration < 60)) errors.push(`${at}.duration: بين 0.5 و 60 ثانية`);
      if (b.erase !== undefined && typeof b.erase !== 'boolean') errors.push(`${at}.erase: true أو false`);
      // board items (draw, write, numberline, projectile, …)
      for (const key of Object.keys(b)) {
        const K = KINDS[key];
        if (!K || (key === 'label' && typeof b.label === 'string')) continue;
        const many = Array.isArray(b[key]);
        const arr = many ? b[key] : [b[key]];
        const normed = arr.map((o) => (K.norm ? K.norm(o) : o));
        normed.forEach((o, j) => {
          let errs;
          if (!o || typeof o !== 'object' || Array.isArray(o)) errs = ['لازم يكون كائن {…}'];
          else { try { errs = K.check(o); } catch (e) { errs = ['إعدادات غير صالحة: ' + e.message]; } }
          errs.forEach((m) => errors.push(`${at}.${key}${many ? `[${j}]` : ''}: ${m}`));
        });
        b[key] = many ? normed : normed[0];
      }
    });
    return { scene: s, errors };
  }

  function guessKind(v) {
    return /\p{Extended_Pictographic}/u.test(v) ? 'emoji' : 'text';
  }

  // ------------------------------------------------------------ timeline
  function wordCount(s) { return String(s || '').trim().split(/\s+/).filter(Boolean).length; }

  /** Talking time for a line: ~2.6 words/second for clear Arabic narration. */
  function talkSeconds(say) { return Math.max(1.2, wordCount(say) / 2.6); }

  /** Board items of one beat, one after another (or `with: true` alongside the previous one). */
  function planBeat(b, scene) {
    const items = [];
    let prev = null;
    const lead = b.erase ? 0.9 : 0.3;
    for (const { key, o } of beatItems(b)) {
      let d;
      try { d = KINDS[key].dur(o, scene); } catch (e) { d = 1; }
      d = clamp(+d || 1, 0.2, 40);
      const at = (o.with && prev ? prev.at : prev ? prev.at + prev.dur + 0.15 : lead) + (+o.wait || 0);
      const it = { key, o, at, dur: d };
      items.push(it);
      prev = it;
    }
    return { items, end: items.reduce((m, it) => Math.max(m, it.at + it.dur), 0) };
  }

  function timeline(scene) {
    let t = 0.4; // small lead-in
    const tl = scene.beats.map((b, i) => {
      const talk = talkSeconds(b.say);
      const countTime = b.count ? 0.8 + b.count.n * 0.55 : 0;
      const morphTime = b.morph ? 1.4 : 0;
      const revealTime = b.reveal ? 0.4 + 0.25 * [...b.reveal.text].length + 0.8 : 0;
      const quizAt = b.quiz ? Math.max(talk + 0.6, 0.6 + b.quiz.options.length * 0.45 + 1.2) : 0;
      const quizTime = b.quiz ? quizAt + 1.6 : 0;
      const plan = planBeat(b, scene);
      const dur = b.duration || Math.max(2.4, talk + 0.8, countTime + 0.8, morphTime + talk * 0.6, revealTime, quizTime, b.compare ? 2.6 : 0, plan.end ? plan.end + 0.7 : 0);
      const beat = { index: i, start: t, end: t + dur, dur, talk: Math.min(talk, dur - 0.3), beat: b, quizAt: b.quiz ? (b.quiz.revealAt || Math.min(quizAt, dur - 1)) : 0, items: plan.items };
      t += dur;
      return beat;
    });
    // what is on the board during each beat (items persist until erase / a big-stage beat)
    let board = [], cursor = 110, lastAx = null, seed = 1;
    tl.forEach((x) => {
      const b = x.beat;
      x.erased = [];
      if (b.erase || hasStage(b)) { if (b.erase) x.erased = board; board = []; cursor = 110; lastAx = null; }
      x.items.forEach((it) => {
        it.start = x.start + it.at;
        it.seed = (seed++) * 7.31;
        if (it.key === 'write' && !it.o.at) {
          const sz = it.o.size || 60, al = it.o.align || 'center';
          it.pos = [al === 'right' ? 950 : al === 'left' ? 50 : 500, cursor + sz * 0.6];
          it.align = al;
          cursor += sz * 1.6;
        }
        if (it.key === 'axes') lastAx = it.o;
        if (it.key === 'plot') it.axes = it.o.axes && typeof it.o.axes === 'object' ? it.o.axes : lastAx;
        board.push(it);
      });
      x.board = board.slice();
    });
    return tl;
  }

  function totalDuration(scene) {
    const tl = timeline(scene);
    return tl.length ? tl[tl.length - 1].end + 0.8 : 0;
  }

  /** Which element is on stage at the start of each beat (carried forward). */
  function stageAt(tl) {
    let current = null;
    return tl.map((x) => {
      const before = current;
      if (x.items && x.items.length) current = null;
      if (x.beat.show) current = x.beat.show;
      if (x.beat.morph) current = x.beat.morph.to;
      if (x.beat.reveal) current = { kind: 'text', value: x.beat.reveal.text, color: x.beat.reveal.color };
      if (x.beat.compare || x.beat.quiz) current = null;
      return { before, after: current };
    });
  }

  // ------------------------------------------------------------ layout
  function layout(W, H) {
    const portrait = H > W * 1.2;
    if (portrait) {
      // Everything important sits inside the area no platform UI covers.
      const u = W / 1080;
      return {
        portrait, u,
        title: { x: W / 2, y: 280 * u },
        stage: { x: W / 2, y: 600 * u, size: 340 * u },
        label: { x: W / 2, y: 830 * u },
        count: { x: W / 2, y: 930 * u, cell: 120 * u, cols: 6 },
        bubble: { x: W / 2 - 60 * u, y: 1110 * u, w: 700 * u },
        char: { x: W - 260 * u, y: 1390 * u, s: 1.0 * u },
        progress: { y: H - 26 * u },
      };
    }
    const u = H / 1080;
    return {
      portrait, u,
      title: { x: W * 0.4, y: 110 * u },
      stage: { x: W * 0.36, y: 430 * u, size: 380 * u },
      label: { x: W * 0.36, y: 690 * u },
      count: { x: W * 0.36, y: 850 * u, cell: 120 * u, cols: 8 },
      bubble: { x: W * 0.78, y: 300 * u, w: 620 * u },
      char: { x: W * 0.8, y: 860 * u, s: 1.05 * u },
      progress: { y: H - 18 * u },
    };
  }

  /**
   * Layout for board styles (chalkboard / whiteboard / paper): a square board in
   * 0..1000 units, a title, a caption box for the line, and a small teacher.
   * 9:16 keeps everything inside the safe area x 140→940, y 220→1440.
   */
  function boardLayout(W, H, scene) {
    const ch = scene.character || {}, hidden = !!ch.hidden, left = ch.position === 'left';
    if (H / W >= 1.7) {
      const u = W / 1080, capTop = 1170 * u, capBot = 1436 * u;
      const tch = hidden ? null : { x: (left ? 244 : 848) * u, y: 1276 * u, s: 0.55 * u };
      return {
        u, portrait: true, rect: { x: 140 * u, y: 340 * u, s: 800 * u },
        title: { x: W / 2, y: 266 * u, maxW: 800 * u, px: 58 * u },
        cap: hidden ? { x0: 140 * u, x1: 940 * u, y0: capTop, y1: capBot } : { x0: (left ? 335 : 140) * u, x1: (left ? 940 : 745) * u, y0: capTop, y1: capBot, side: left ? 'left' : 'right' },
        tch, handleY: 1490 * u,
      };
    }
    if (H >= W) {
      const u = W / 1080, s = Math.min(860 * u, H - 560 * u), top = 130 * u, capTop = top + s + 26 * u, capBot = H - 40 * u;
      const ts = Math.min(0.5, (capBot - capTop) / 480) * u;
      const tch = hidden ? null : { x: left ? 150 * u : W - 150 * u, y: capBot - 290 * ts / u * u, s: ts };
      return {
        u, portrait: true, rect: { x: (W - s) / 2, y: top, s },
        title: { x: W / 2, y: 70 * u, maxW: W - 160 * u, px: 52 * u },
        cap: hidden ? { x0: 80 * u, x1: W - 80 * u, y0: capTop, y1: capBot } : { x0: left ? 280 * u : 80 * u, x1: left ? W - 80 * u : W - 280 * u, y0: capTop, y1: capBot, side: left ? 'left' : 'right' },
        tch, handleY: H - 20 * u,
      };
    }
    const u = H / 1080, s = Math.min(900 * u, W - 960 * u), px0 = 80 * u + s + 50 * u, px1 = W - 50 * u, cx = (px0 + px1) / 2;
    const tch = hidden ? null : { x: cx, y: H - 50 * u - 290 * 0.72 * u, s: 0.72 * u };
    return {
      u, portrait: false, rect: { x: 80 * u, y: (H - s) / 2, s },
      title: { x: cx, y: 120 * u, maxW: px1 - px0, px: 54 * u },
      cap: hidden ? { x0: px0, x1: px1, y0: 210 * u, y1: H - 100 * u } : { x0: px0, x1: px1, y0: 210 * u, y1: tch.y - 190 * tch.s - 24 * u, side: 'down' },
      tch, handleY: H - 50 * u,
    };
  }
  /** Where board items go in the cartoon style (between the title and the bubble). */
  function cartoonBoardRect(W, H) {
    const L = layout(W, H), u = L.u;
    return L.portrait ? { x: W / 2 - 310 * u, y: 356 * u, s: 620 * u } : { x: 150 * u, y: 182 * u, s: 840 * u };
  }
  // ------------------------------------------------------------ drawing
  function setFont(ctx, scene, px, weight) {
    ctx.font = `${weight || 700} ${Math.round(px)}px ${scene.theme.font}`;
  }

  function drawElement(ctx, scene, el, x, y, size, alpha, scale, rot) {
    if (!el || alpha <= 0 || scale <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    ctx.scale(scale, scale);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = 'rtl';
    if (el.kind === 'emoji') {
      ctx.font = `${Math.round(size * 0.9)}px "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      ctx.fillText(el.value, 0, size * 0.04);
    } else {
      const len = [...el.value].length;
      setFont(ctx, scene, size * (len <= 2 ? 1 : len <= 4 ? 0.62 : 0.4), 800);
      ctx.lineWidth = size * 0.06;
      ctx.strokeStyle = scene.theme.bg;
      ctx.lineJoin = 'round';
      ctx.strokeText(el.value, 0, 0);
      ctx.fillStyle = el.color || scene.theme.accent;
      ctx.fillText(el.value, 0, 0);
    }
    ctx.restore();
  }

  function sparkles(ctx, scene, x, y, r, p) {
    if (p <= 0 || p >= 1) return;
    ctx.save();
    ctx.globalAlpha = 1 - p;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + i * 0.3;
      const d = r * (0.4 + p * 0.9);
      ctx.fillStyle = i % 2 ? scene.theme.accent : scene.theme.accent2;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * 0.045 * (1 - p * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function wrapWords(ctx, words, maxW) {
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  function drawBubble(ctx, scene, L, text, reveal, charX, charTop, noTail) {
    if (!text) return;
    const words = text.trim().split(/\s+/);
    const shown = words.slice(0, Math.max(1, Math.ceil(words.length * reveal)));
    const px = 46 * L.u;
    setFont(ctx, scene, px, 700);
    ctx.direction = 'rtl';
    const maxW = L.bubble.w - 64 * L.u;
    const allLines = wrapWords(ctx, words, maxW); // size the bubble for the full line so it doesn't jump
    const lines = wrapWords(ctx, shown, maxW);
    const lh = px * 1.45;
    const w = Math.min(L.bubble.w, Math.max(...allLines.map((l) => ctx.measureText(l).width)) + 64 * L.u);
    const h = allLines.length * lh + 44 * L.u;
    const bx = L.bubble.x - w / 2, by = L.bubble.y - h / 2;
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = scene.theme.ink;
    ctx.lineWidth = 5 * L.u;
    roundRect(ctx, bx, by, w, h, 36 * L.u);
    ctx.fill(); ctx.stroke();
    // tail pointing at the character
    const tx = clamp(charX, bx + 60 * L.u, bx + w - 60 * L.u);
    if (!noTail) {
    ctx.beginPath();
    ctx.moveTo(tx - 26 * L.u, by + h - 3 * L.u);
    ctx.lineTo(charX, Math.min(charTop, by + h + 70 * L.u));
    ctx.lineTo(tx + 26 * L.u, by + h - 3 * L.u);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(tx - 23 * L.u, by + h - 9 * L.u, 46 * L.u, 8 * L.u);
    }
    ctx.fillStyle = scene.theme.ink;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    lines.forEach((l, i) => ctx.fillText(l, bx + w - 32 * L.u, by + 22 * L.u + lh * (i + 0.5)));
    ctx.restore();
  }

  // ------------------------------------------------------------ face photo (optional)
  const PHOTOS = {};
  /** Image-like ready to draw (Image/Canvas/Video, or a cached Image for a string src) → {img,w,h}, else null (still loading / no DOM). */
  function photoOf(p) {
    if (!p) return null;
    if (typeof p === 'string') {
      if (typeof Image === 'undefined') return null;
      if (!PHOTOS[p]) { const im = new Image(); im.crossOrigin = 'anonymous'; im.src = p; PHOTOS[p] = im; }
      p = PHOTOS[p];
    }
    const w = p.naturalWidth || p.videoWidth || p.width, h = p.naturalHeight || p.videoHeight || p.height;
    if (!w || !h || p.complete === false) return null;
    return { img: p, w, h };
  }
  /** Preload a scene's face photo (headless renders await this before the first frame). Resolves true when it can be drawn. */
  function loadPhoto(src) {
    if (!src || typeof src !== 'string' || typeof Image === 'undefined') return Promise.resolve(!!photoOf(src));
    photoOf(src);
    const im = PHOTOS[src];
    if (im.complete && im.naturalWidth) return Promise.resolve(true);
    return new Promise((res) => { im.addEventListener('load', () => res(true), { once: true }); im.addEventListener('error', () => res(false), { once: true }); });
  }
  /** The head as a photo in a circle (cover, face at ~42% height), white ring + ink outline. */
  function drawPhotoHead(ctx, scene, ph, t, talking) {
    const r = 112, cy = -40, k = talking ? 1 + 0.02 * Math.abs(Math.sin(t * 12.5)) : 1;
    ctx.save();
    ctx.translate(0, cy); ctx.rotate(talking ? 0.05 * Math.sin(t * 3.1) : 0.02 * Math.sin(t * 1.7)); ctx.scale(k, k);
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
    const sc = Math.max(2 * r / ph.w, 2 * r / ph.h), dw = ph.w * sc, dh = ph.h * sc;
    ctx.drawImage(ph.img, Math.min(-r, Math.max(r - dw, -dw / 2)), Math.min(-r, Math.max(r - dh, -0.42 * dh)), dw, dh);
    ctx.restore();
    ctx.lineWidth = 9; ctx.strokeStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 6; ctx.strokeStyle = scene.theme.ink; ctx.beginPath(); ctx.arc(0, 0, r + 6, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  function drawCharacter(ctx, scene, L, t, talking, mood, photo) {
    const c = scene.character;
    const s = 1.0 * L.char.s;
    const bob = Math.sin(t * 2.2) * 6 * s;
    const x = L.char.x, y = L.char.y + bob;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.lineWidth = 6;
    ctx.strokeStyle = scene.theme.ink;
    // body
    ctx.fillStyle = c.shirt;
    roundRect(ctx, -120, 60, 240, 230, 90);
    ctx.fill(); ctx.stroke();
    // waving arm while talking
    const wave = talking ? Math.sin(t * 7) * 0.35 : 0;
    ctx.save();
    ctx.translate(-105, 110);
    ctx.rotate(-0.6 + wave);
    ctx.fillStyle = c.shirt;
    roundRect(ctx, -26, -120, 52, 140, 26);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = c.skin;
    ctx.beginPath(); ctx.arc(0, -128, 28, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
    const male = c.gender === 'male';
    // a face photo replaces the drawn head (falls back to the drawing while it loads or when there is none)
    const ph = photoOf(photo || c.photo);
    if (ph) {
      drawPhotoHead(ctx, scene, ph, t, talking);
      if (mood === 'thinking') {
        ctx.fillStyle = '#fff'; ctx.strokeStyle = scene.theme.ink; ctx.lineWidth = 4;
        [[120, -160, 12], [150, -200, 18], [190, -250, 26]].forEach(([x0, y0, r]) => { ctx.beginPath(); ctx.arc(x0, y0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); });
      }
      ctx.restore();
      return { x, top: y - 160 * s };
    }
    // head cover or hair (back): ghutra (Gulf headscarf), hijab, long hair, or short hair
    if (c.ghutra) {
      ctx.fillStyle = c.ghutra;
      ctx.beginPath(); ctx.moveTo(-128, -60); ctx.quadraticCurveTo(-140, 120, -110, 170); ctx.lineTo(110, 170); ctx.quadraticCurveTo(140, 120, 128, -60);
      ctx.ellipse(0, -60, 128, 118, 0, 0, Math.PI, true); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (c.hijab) {
      ctx.fillStyle = c.hijab;
      ctx.beginPath(); ctx.ellipse(0, -40, 132, 150, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else if (!male) {
      ctx.fillStyle = c.hair;
      ctx.beginPath(); ctx.ellipse(0, -60, 122, 128, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else {
      ctx.fillStyle = c.hair;
      ctx.beginPath(); ctx.ellipse(0, -78, 106, 96, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    // face
    ctx.fillStyle = c.skin;
    ctx.beginPath(); ctx.ellipse(0, -40, 100, 108, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (c.ghutra) {
      // band across the forehead + black agal ring
      ctx.fillStyle = c.ghutra;
      ctx.beginPath(); ctx.ellipse(0, -118, 104, 48, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#1C1A18'; ctx.lineWidth = 14;
      ctx.beginPath(); ctx.ellipse(0, -132, 98, 22, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = scene.theme.ink; ctx.lineWidth = 6;
    } else if (!c.hijab) {
      ctx.fillStyle = c.hair;
      ctx.beginPath();
      if (male) ctx.ellipse(-4, -128, 92, 30, -0.08, 0, Math.PI * 2);
      else ctx.ellipse(-10, -128, 96, 42, -0.15, 0, Math.PI * 2);
      ctx.fill();
    }
    if (c.beard || (male && c.beard !== false && c.ghutra)) {
      // beard around the jaw; the mouth is drawn on top later
      ctx.fillStyle = c.hair;
      ctx.beginPath(); ctx.ellipse(0, 2, 98, 66, 0, 0.04 * Math.PI, 0.96 * Math.PI); ctx.closePath(); ctx.fill();
    }
    // eyes (blink every ~3.2s)
    const blink = (t % 3.2) < 0.12;
    ctx.fillStyle = scene.theme.ink;
    for (const ex of [-38, 38]) {
      if (blink) { ctx.fillRect(ex - 14, -52, 28, 5); } else { ctx.beginPath(); ctx.ellipse(ex, -50, 11, 15, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + 4, -55, 4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = scene.theme.ink; }
    }
    // eyebrows show the mood: [raise whole brow, lift inner end, extra raise on the right brow]
    const brow = { happy: [6, -2, 0], surprised: [16, 0, 0], thinking: [2, 0, 12], sad: [0, 10, 0], neutral: [0, 0, 0] }[mood || 'neutral'];
    ctx.strokeStyle = (c.hijab || c.ghutra) ? scene.theme.ink : c.hair;
    ctx.lineWidth = 7; ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      const y0 = -80 - brow[0] - (side > 0 ? brow[2] : 0);
      const outer = side * 54, inner = side * 22;
      ctx.beginPath(); ctx.moveTo(outer, y0); ctx.quadraticCurveTo(side * 38, y0 - 6, inner, y0 - brow[1]); ctx.stroke();
    }
    // cheeks
    ctx.fillStyle = 'rgba(224,102,58,0.25)';
    for (const ex of [-62, 62]) { ctx.beginPath(); ctx.arc(ex, -14, 15, 0, Math.PI * 2); ctx.fill(); }
    // mouth: opens and closes while talking; otherwise follows the mood
    const open = talking ? (0.35 + 0.65 * Math.abs(Math.sin(t * 13))) : 0;
    ctx.fillStyle = '#7A2E22';
    ctx.beginPath();
    if (open > 0.05) ctx.ellipse(0, 18, 26, 6 + 18 * open, 0, 0, Math.PI * 2);
    else if (mood === 'surprised') ctx.ellipse(0, 20, 14, 18, 0, 0, Math.PI * 2);
    else if (mood === 'sad') ctx.ellipse(0, 26, 22, 9, 0, 1.1 * Math.PI, 1.9 * Math.PI);
    else if (mood === 'thinking') ctx.ellipse(12, 18, 16, 5, -0.2, 0, Math.PI * 2);
    else ctx.ellipse(0, 14, 26, mood === 'happy' ? 16 : 10, 0, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.fill();
    if (mood === 'thinking') {
      ctx.fillStyle = '#fff'; ctx.strokeStyle = scene.theme.ink; ctx.lineWidth = 4;
      [[110, -150, 12], [140, -190, 18], [180, -240, 26]].forEach(([x0, y0, r]) => { ctx.beginPath(); ctx.arc(x0, y0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); });
    }
    ctx.restore();
    return { x, top: y - 160 * s };
  }

  function confetti(ctx, scene, W, H, p, seed) {
    if (p <= 0 || p >= 1) return;
    const cols = [scene.theme.accent, scene.theme.accent2, '#F2C14E', '#5BB98C', '#E86FA0'];
    let r = seed || 7;
    const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
    ctx.save();
    for (let i = 0; i < 90; i++) {
      const x0 = W * (0.15 + rnd() * 0.7), vx = (rnd() - 0.5) * W * 0.9, vy = -H * (0.35 + rnd() * 0.45);
      const x = x0 + vx * p, y = H * 0.55 + vy * p + H * 1.1 * p * p;
      ctx.globalAlpha = 1 - p * p;
      ctx.fillStyle = cols[i % cols.length];
      ctx.save(); ctx.translate(x, y); ctx.rotate(p * 12 * (rnd() - 0.5));
      ctx.fillRect(-W * 0.008, -W * 0.004, W * 0.016, W * 0.008); ctx.restore();
    }
    ctx.restore();
  }

  /** Write a word on with a right-to-left wipe and a pen dot riding the edge. */
  function drawReveal(ctx, scene, L, el, x, y, size, p) {
    if (p <= 0) return;
    const len = [...el.value].length;
    setFont(ctx, scene, size * (len <= 2 ? 1 : len <= 4 ? 0.62 : 0.4), 800);
    const w = ctx.measureText(el.value).width + size * 0.2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + w / 2 - w * p, y - size * 0.75, w * p, size * 1.5); // RTL: reveal from the right
    ctx.clip();
    drawElement(ctx, scene, el, x, y, size, 1, 1, 0);
    ctx.restore();
    if (p < 1) {
      const px = x + w / 2 - w * p;
      ctx.fillStyle = scene.theme.accent2;
      ctx.beginPath(); ctx.arc(px, y + Math.sin(p * 30) * size * 0.18, size * 0.06, 0, Math.PI * 2); ctx.fill();
    }
  }

  function card(ctx, scene, L, x, y, w, h, fill, stroke) {
    ctx.save();
    ctx.fillStyle = fill; ctx.strokeStyle = stroke || scene.theme.ink; ctx.lineWidth = 5 * L.u;
    roundRect(ctx, x - w / 2, y - h / 2, w, h, 28 * L.u); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function drawCompare(ctx, scene, L, c, lt) {
    const S = L.stage, gap = S.size * 0.62;
    const pa = easeOutBack(prog(lt, 0.1, 0.5)), pb = easeOutBack(prog(lt, 0.45, 0.5));
    // first item on the right (RTL reading order)
    drawElement(ctx, scene, c.a, S.x + gap - (1 - pa) * 200 * L.u * -1, S.y, S.size * 0.62, prog(lt, 0.1, 0.3), pa, 0);
    drawElement(ctx, scene, c.b, S.x - gap + (1 - pb) * 200 * L.u * -1, S.y, S.size * 0.62, prog(lt, 0.45, 0.3), pb, 0);
    const pv = prog(lt, 0.8, 0.3);
    if (pv > 0) {
      ctx.save(); ctx.globalAlpha = pv;
      setFont(ctx, scene, 64 * L.u, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = scene.theme.accent2; ctx.fillText(c.sign || '⇄', S.x, S.y);
      ctx.restore();
    }
    const pl = prog(lt, 0.9, 0.4);
    if (pl > 0) {
      ctx.save(); ctx.globalAlpha = pl;
      setFont(ctx, scene, 54 * L.u, 800); ctx.textAlign = 'center'; ctx.direction = 'rtl'; ctx.fillStyle = scene.theme.ink;
      if (c.labelA) ctx.fillText(c.labelA, S.x + gap, S.y + S.size * 0.5);
      if (c.labelB) ctx.fillText(c.labelB, S.x - gap, S.y + S.size * 0.5);
      ctx.restore();
    }
  }

  function drawQuiz(ctx, scene, L, q, lt, revealAt) {
    const S = L.stage, n = q.options.length;
    const cols = n <= 2 ? n : 2, rows = Math.ceil(n / cols);
    const cw = (L.portrait ? 340 : 360) * L.u, ch = 200 * L.u, gx = 30 * L.u;
    const top = S.y + (L.portrait ? 40 * L.u : 0) - ((rows - 1) * (ch + gx)) / 2 + (q.question ? 40 * L.u : 0);
    if (q.question) {
      ctx.save(); ctx.globalAlpha = prog(lt, 0.1, 0.4);
      setFont(ctx, scene, 58 * L.u, 800); ctx.textAlign = 'center'; ctx.direction = 'rtl'; ctx.fillStyle = scene.theme.ink;
      ctx.fillText(q.question, S.x, top - ch / 2 - 50 * L.u);
      ctx.restore();
    }
    const shown = lt >= revealAt;
    q.options.forEach((o, i) => {
      const r = Math.floor(i / cols), c = i % cols;
      const inRow = Math.min(cols, n - r * cols); // a lone last option sits in the middle
      const x = S.x + ((inRow - 1) / 2 - c) * (cw + gx); // first option on the right
      const y = top + r * (ch + gx);
      const p = prog(lt, 0.6 + i * 0.45, 0.35);
      if (p <= 0) return;
      const right = i === q.answer;
      const pr = prog(lt, revealAt, 0.35);
      ctx.save();
      ctx.globalAlpha = p * (shown && !right ? 1 - 0.6 * pr : 1);
      ctx.translate(x, y); const sc = easeOutBack(p) * (shown && right ? 1 + 0.08 * Math.sin(pr * Math.PI) : 1); ctx.scale(sc, sc); ctx.translate(-x, -y);
      card(ctx, scene, L, x, y, cw, ch, shown && right ? (scene.theme.goodBg || '#DFF3E6') : (scene.theme.card || '#FFFFFF'), shown && right ? (scene.theme.good || '#2E9B5B') : scene.theme.ink);
      drawElement(ctx, scene, o, x, y, ch * 0.62, 1, 1, 0);
      if (shown && right) {
        ctx.fillStyle = scene.theme.good || '#2E9B5B'; ctx.beginPath(); ctx.arc(x + cw / 2 - 10 * L.u, y - ch / 2 + 10 * L.u, 34 * L.u, 0, Math.PI * 2); ctx.fill();
        setFont(ctx, scene, 44 * L.u, 800); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('✓', x + cw / 2 - 10 * L.u, y - ch / 2 + 12 * L.u);
      }
      ctx.restore();
    });
  }

  function drawBackground(ctx, scene, W, H, L) {
    ctx.fillStyle = scene.theme.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = scene.theme.soft;
    const step = 64 * L.u;
    for (let y = step / 2; y < H; y += step) for (let x = step / 2; x < W; x += step) { ctx.beginPath(); ctx.arc(x, y, 3 * L.u, 0, Math.PI * 2); ctx.fill(); }
  }

  // ------------------------------------------------------------ board styles: background, title, caption, teacher
  function woodFrame(ctx, W, H, u) {
    const f = 30 * u;
    ctx.save();
    ctx.fillStyle = '#8A5A33';
    ctx.fillRect(0, 0, W, f); ctx.fillRect(0, H - f, W, f); ctx.fillRect(0, 0, f, H); ctx.fillRect(W - f, 0, f, H);
    ctx.strokeStyle = '#5F3B1F'; ctx.globalAlpha = 0.45; ctx.lineWidth = 1.6 * u;
    for (let i = 0; i < 4; i++) {
      const o = (6 + i * 6) * u;
      ctx.beginPath(); for (let x = 0; x <= W; x += 40 * u) ctx.lineTo(x, o + Math.sin(x / (90 * u) + i) * 1.5 * u); ctx.stroke();
      ctx.beginPath(); for (let x = 0; x <= W; x += 40 * u) ctx.lineTo(x, H - o + Math.sin(x / (70 * u) + i * 2) * 1.5 * u); ctx.stroke();
      ctx.beginPath(); for (let y = 0; y <= H; y += 40 * u) ctx.lineTo(o + Math.sin(y / (80 * u) + i) * 1.5 * u, y); ctx.stroke();
      ctx.beginPath(); for (let y = 0; y <= H; y += 40 * u) ctx.lineTo(W - o + Math.sin(y / (60 * u) + i) * 1.5 * u, y); ctx.stroke();
    }
    ctx.globalAlpha = 0.7; ctx.strokeStyle = '#3A2414'; ctx.lineWidth = 4 * u; ctx.strokeRect(f, f, W - 2 * f, H - 2 * f);
    ctx.globalAlpha = 0.5; ctx.strokeStyle = '#B98552'; ctx.lineWidth = 2 * u; ctx.strokeRect(u, u, W - 2 * u, H - 2 * u);
    ctx.restore();
  }

  function drawBoardBg(ctx, sc, W, H, u, style, bg) {
    const th = sc.theme;
    ctx.fillStyle = bg || th.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    if (style === 'chalkboard') {
      ctx.fillStyle = th.ink;
      for (let i = 0; i < 26; i++) { ctx.globalAlpha = 0.016 + rnd(i * 3.1) * 0.028; ctx.beginPath(); ctx.ellipse(rnd(i * 1.7) * W, rnd(i * 2.9 + 1) * H, (120 + rnd(i * 5.3) * 380) * u, (40 + rnd(i * 7.1) * 120) * u, (rnd(i * 9.7) - 0.5) * 0.8, 0, TAU); ctx.fill(); }
      for (let i = 0; i < 6; i++) { ctx.globalAlpha = 0.02; ctx.save(); ctx.translate(W / 2, rnd(i * 11.3) * H); ctx.rotate((rnd(i * 4.1) - 0.5) * 0.12); ctx.fillRect(-W * 0.45, 0, W * 0.9, (30 + rnd(i * 2.2) * 50) * u); ctx.restore(); }
      ctx.globalAlpha = 0.08;
      for (let i = 0; i < 420; i++) { const s = (1 + rnd(i * 1.31) * 2.2) * u; ctx.fillRect(rnd(i * 4.7 + 2) * W, rnd(i * 6.1 + 5) * H, s, s); }
      ctx.globalAlpha = 1;
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.32)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.restore();
      if (sc.board.frame !== false) woodFrame(ctx, W, H, u);
      return;
    }
    if (style === 'whiteboard') {
      ctx.fillStyle = '#9AA5AE';
      for (let i = 0; i < 18; i++) { ctx.globalAlpha = 0.012 + rnd(i * 3.7) * 0.02; ctx.beginPath(); ctx.ellipse(rnd(i * 2.3) * W, rnd(i * 3.9 + 1) * H, (140 + rnd(i * 5.9) * 300) * u, (30 + rnd(i * 6.1) * 70) * u, (rnd(i * 8.7) - 0.5) * 0.5, 0, TAU); ctx.fill(); }
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.45, 'rgba(255,255,255,0.55)'); g.addColorStop(0.55, 'rgba(255,255,255,0)');
      ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if (sc.board.frame !== false) {
        const f = 20 * u;
        ctx.fillStyle = '#C3C9CF'; ctx.fillRect(0, 0, W, f); ctx.fillRect(0, H - f, W, f); ctx.fillRect(0, 0, f, H); ctx.fillRect(W - f, 0, f, H);
        ctx.strokeStyle = '#8F98A1'; ctx.lineWidth = 3 * u; ctx.strokeRect(f, f, W - 2 * f, H - 2 * f);
        ctx.strokeStyle = '#EEF1F3'; ctx.lineWidth = 2 * u; ctx.strokeRect(3 * u, 3 * u, W - 6 * u, H - 6 * u);
      }
      ctx.restore();
      return;
    }
    // paper: grid (default) or lined notebook with the margin on the right (RTL)
    ctx.strokeStyle = th.soft;
    if (sc.board.paper === 'lined') {
      ctx.lineWidth = 2 * u;
      for (let y = 150 * u; y < H; y += 62 * u) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.strokeStyle = '#E8A3A3'; ctx.lineWidth = 2.5 * u;
      ctx.beginPath(); ctx.moveTo(W - 100 * u, 0); ctx.lineTo(W - 100 * u, H); ctx.stroke();
    } else {
      ctx.lineWidth = 1.3 * u;
      const st = 40 * u;
      for (let x = (W % st) / 2; x < W; x += st) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += st) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    }
    ctx.fillStyle = '#8A7A5A';
    for (let i = 0; i < 160; i++) { ctx.globalAlpha = 0.04; const s = (1 + rnd(i * 2.1) * 2) * u; ctx.fillRect(rnd(i * 3.3) * W, rnd(i * 5.7) * H, s, s); }
    ctx.restore();
  }

  function boardTitle(ctx, sc, B, R) {
    const T = B.title;
    let px = T.px;
    ctx.save(); ctx.direction = 'rtl';
    for (let k = 0; k < 6; k++) { setFont(ctx, sc, px, 800); if (ctx.measureText(sc.title).width <= T.maxW) break; px *= 0.9; }
    const w = ctx.measureText(sc.title).width;
    ctx.restore();
    const col = R.style === 'chalkboard' ? R.th.accent : R.style === 'paper' ? R.th.accent2 : R.th.ink;
    inkText(R, sc.title, T.x, T.y, px, { color: col, weight: 800 });
    const pts = [];
    for (let i = 0; i <= 30; i++) pts.push([T.x + w / 2 - (w * i) / 30, T.y + px * 0.68 + Math.sin(i * 0.8) * 3 * B.u]);
    inkStroke(R, [pts], { color: R.style === 'whiteboard' ? R.th.accent : col, width: 4 * B.u, alpha: 0.85, seed: 3 });
  }

  function drawCaption(ctx, sc, B, R, text, reveal, tchHead) {
    if (!text) return;
    const u = B.u, cap = B.cap, style = R.style, th = R.th;
    const words = text.trim().split(/\s+/);
    const maxW = cap.x1 - cap.x0, maxH = cap.y1 - cap.y0;
    let px = (B.portrait ? 44 : 46) * u, lines = [], lh = 0;
    ctx.save();
    ctx.direction = 'rtl';
    for (let k = 0; k < 8; k++) { setFont(ctx, sc, px, 700); lines = wrapWords(ctx, words, maxW - 60 * u); lh = px * 1.42; if (lines.length * lh + 44 * u <= maxH) break; px *= 0.9; }
    const w = Math.min(maxW, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 64 * u), h = lines.length * lh + 44 * u;
    ctx.restore();
    let bx, by;
    if (cap.side === 'right') { bx = cap.x1 - w; by = (cap.y0 + cap.y1) / 2 - h / 2; }
    else if (cap.side === 'left') { bx = cap.x0; by = (cap.y0 + cap.y1) / 2 - h / 2; }
    else if (cap.side === 'down') { bx = (cap.x0 + cap.x1) / 2 - w / 2; by = cap.y1 - h; }
    else { bx = (cap.x0 + cap.x1) / 2 - w / 2; by = (cap.y0 + cap.y1) / 2 - h / 2; }
    const PR = Object.assign({}, R, { x0: 0, y0: 0, k: 1 });
    // tail towards the teacher
    let tail = null;
    if (tchHead) {
      if (cap.side === 'down') { const tx = clamp(tchHead[0], bx + 50 * u, bx + w - 50 * u); tail = [[tx - 24 * u, by + h - 2 * u], [tchHead[0] + 10 * u, tchHead[1]], [tx + 24 * u, by + h - 2 * u]]; }
      else { const ex = cap.side === 'right' ? bx + w - 2 * u : bx + 2 * u, ty = clamp(tchHead[1], by + 40 * u, by + h - 40 * u); tail = [[ex, ty - 22 * u], [tchHead[0], tchHead[1]], [ex, ty + 22 * u]]; }
    }
    ctx.save();
    const outline = rrectPts(bx, by, w, h, 30 * u);
    if (style === 'paper') {
      ctx.fillStyle = 'rgba(0,0,0,0.10)'; roundRect(ctx, bx + 6 * u, by + 8 * u, w, h, 10 * u); ctx.fill();
      ctx.fillStyle = th.card; roundRect(ctx, bx, by, w, h, 10 * u); ctx.fill();
      if (tail) { ctx.beginPath(); ctx.moveTo(...tail[0]); ctx.lineTo(...tail[1]); ctx.lineTo(...tail[2]); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = 'rgba(160,130,40,0.18)'; ctx.fillRect(bx + w / 2 - 50 * u, by - 12 * u, 100 * u, 26 * u);
    } else {
      ctx.fillStyle = style === 'chalkboard' ? 'rgba(10,22,16,0.45)' : th.card;
      roundRect(ctx, bx, by, w, h, 30 * u); ctx.fill();
      if (tail) { ctx.beginPath(); ctx.moveTo(...tail[0]); ctx.lineTo(...tail[1]); ctx.lineTo(...tail[2]); ctx.closePath(); ctx.fill(); }
      inkStroke(PR, [outline], { color: th.ink, width: (style === 'chalkboard' ? 4 : 4.5) * u, alpha: style === 'chalkboard' ? 0.85 : 1, seed: 11 });
      if (tail) inkStroke(PR, [densify([tail[0], tail[1], tail[2]], 6)], { color: th.ink, width: 4 * u, alpha: style === 'chalkboard' ? 0.85 : 1, seed: 12 });
    }
    ctx.restore();
    const shown = Math.max(1, Math.ceil(words.length * reveal));
    let used = 0;
    lines.forEach((l, i) => {
      const lw = l.split(/\s+/), take = clamp(shown - used, 0, lw.length);
      used += lw.length;
      if (take <= 0) return;
      inkText(PR, lw.slice(0, take).join(' '), bx + w - 32 * u, by + 22 * u + lh * (i + 0.5), px, { align: 'right', dir: 'rtl', color: th.ink });
    });
  }

  function drawEraser(ctx, R, x, y) {
    const u = R.u;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(0.12);
    ctx.fillStyle = '#9A6A3F'; roundRect(ctx, -44 * u, -100 * u, 88 * u, 140 * u, 10 * u); ctx.fill();
    ctx.fillStyle = R.style === 'chalkboard' ? '#D8D4CB' : '#5B6670'; ctx.fillRect(-44 * u, 40 * u, 88 * u, 26 * u);
    ctx.restore();
  }

  /**
   * Draw the scene at time t. opts: { handle, showProgress=true, timeline, strict (rethrow item errors),
   *   photo (Image/Canvas for the character's face — overrides scene.character.photo) }
   * Returns the index of the current beat (or -1 before/after).
   */
  function drawScene(ctx, scene, t, opts) {
    opts = opts || {};
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const style = styleOf(scene);
    const sc = styled(scene);
    const L = layout(W, H);
    const B = style === 'cartoon' ? null : boardLayout(W, H, sc);
    if (B) {
      // big-stage beats (show / morph / count / quiz …) sit on the board
      const r = B.rect, s = r.s;
      Object.assign(L, { portrait: B.portrait, stage: { x: r.x + s / 2, y: r.y + s * 0.36, size: s * 0.42 }, label: { x: r.x + s / 2, y: r.y + s * 0.68 }, count: { x: r.x + s / 2, y: r.y + s * 0.84, cell: s * 0.14, cols: 6 } });
    }
    const tl = opts.timeline || timeline(scene);
    const stages = stageAt(tl);
    let bi = -1;
    for (let i = 0; i < tl.length; i++) if (t >= tl[i].start) bi = i;
    // per-beat background color, cross-faded over 0.4s
    const prevBg = bi > 0 ? (tl[bi - 1].beat.bg || sc.theme.bg) : sc.theme.bg;
    const curBg = bi >= 0 ? (tl[bi].beat.bg || sc.theme.bg) : sc.theme.bg;
    const bgAt = (bg) => (B ? drawBoardBg(ctx, sc, W, H, B.u, style, bg) : drawBackground(ctx, Object.assign({}, sc, { theme: Object.assign({}, sc.theme, { bg }) }), W, H, L));
    bgAt(prevBg);
    if (curBg !== prevBg) {
      ctx.save(); ctx.globalAlpha = prog(t, tl[bi].start, 0.4);
      bgAt(curBg);
      ctx.restore();
    }
    const rect = B ? B.rect : cartoonBoardRect(W, H);
    const R = makeR(ctx, sc, style, rect, L.u, t);
    R.fs = H > W * 1.2 ? 1.2 : 1;

    if (sc.title) {
      if (B) boardTitle(ctx, sc, B, Object.assign({}, R, { x0: 0, y0: 0, k: 1 }));
      else {
        setFont(ctx, sc, 52 * L.u, 800);
        ctx.direction = 'rtl';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const tw = ctx.measureText(sc.title).width + 70 * L.u;
        ctx.fillStyle = sc.theme.ink;
        roundRect(ctx, L.title.x - tw / 2, L.title.y - 42 * L.u, tw, 84 * L.u, 42 * L.u);
        ctx.fill();
        ctx.fillStyle = sc.theme.bg;
        ctx.fillText(sc.title, L.title.x, L.title.y + 2 * L.u);
      }
    }

    // teacher drawn with a dark outline whatever the board colour
    const charScene = B ? Object.assign({}, sc, { theme: Object.assign({}, sc.theme, { ink: '#2A2622' }) }) : sc;
    const hidden = !!sc.character.hidden;
    const drawPerson = (talking, mood) => {
      if (hidden) return null;
      if (B) return drawCharacter(ctx, charScene, { char: B.tch }, t, talking, mood, opts.photo);
      return drawCharacter(ctx, sc, L, t, talking, mood, opts.photo);
    };

    let idx = -1;
    for (let i = 0; i < tl.length; i++) if (t >= tl[i].start) idx = i;
    if (idx < 0) { drawPerson(false, 'happy'); return -1; }
    const cur = tl[idx];
    const b = cur.beat;
    const lt = t - cur.start; // local time inside the beat
    const st = stages[idx];
    const S = L.stage;
    const board = cur.board || [], erased = cur.erased || [];

    // --- board items (drawn on, persist until erased)
    if (board.length || (erased.length && lt < 1.0)) {
      if (!B) {
        const pad = 20 * L.u;
        ctx.save(); ctx.globalAlpha = 0.92;
        card(ctx, sc, L, rect.x + rect.s / 2, rect.y + rect.s / 2, rect.s + pad * 2, rect.s + pad * 2, '#FFFFFF', sc.theme.ink);
        ctx.restore();
      }
      if (erased.length && lt < 1.0) {
        const e = prog(lt, 0.05, 0.75), x0 = rect.x - 60 * L.u, x1 = rect.x + rect.s + 60 * L.u, edge = x1 - (x1 - x0) * e;
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, edge, H); ctx.clip();
        for (const it of erased) { try { KINDS[it.key].draw(R, it.o, 1, Math.max(t - it.start, it.dur), it); } catch (err) { if (opts.strict) throw err; } }
        ctx.restore();
        if (e > 0 && e < 1) {
          if (style === 'chalkboard') {
            // chalk dust left behind the eraser: soft streaks that fade out
            ctx.save(); ctx.fillStyle = sc.theme.ink;
            for (let i = 0; i < 7; i++) { ctx.globalAlpha = 0.035 * (1 - e); ctx.beginPath(); ctx.ellipse((edge + x1) / 2, rect.y + rect.s * (0.1 + i * 0.13), Math.max(1, (x1 - edge) / 2), 26 * L.u, 0, 0, TAU); ctx.fill(); }
            ctx.restore();
          }
          drawEraser(ctx, R, edge, rect.y + rect.s * (0.5 + Math.sin(e * 22) * 0.38));
        }
      }
      let tip = null;
      for (const it of board) {
        if (t < it.start) continue;
        const p = prog(t, it.start, it.dur);
        let r = null;
        try { r = KINDS[it.key].draw(R, it.o, p, t - it.start, it); } catch (err) { if (opts.strict) throw err; r = null; }
        if (r && p < 1) tip = r;
      }
      if (tip && isFinite(tip[0]) && isFinite(tip[1])) drawTip(R, tip[0], tip[1]);
    }

    // --- stage element
    const strLabel = typeof b.label === 'string' ? b.label : null;
    if (b.compare) {
      drawCompare(ctx, sc, L, b.compare, lt);
    } else if (b.quiz) {
      drawQuiz(ctx, sc, L, b.quiz, lt, cur.quizAt);
    } else if (b.reveal) {
      const el = { kind: 'text', value: b.reveal.text, color: b.reveal.color };
      drawReveal(ctx, sc, L, el, S.x, S.y, S.size, prog(lt, 0.3, 0.25 * [...b.reveal.text].length));
      if (strLabel) drawLabel(ctx, sc, L, strLabel, prog(lt, 0.3 + 0.25 * [...b.reveal.text].length, 0.4));
    } else if (b.morph) {
      const pOut = prog(lt, 0.1, 0.5), pIn = prog(lt, 0.55, 0.7);
      drawElement(ctx, sc, st.before, S.x, S.y, S.size, 1 - pOut, 1 - 0.6 * easeInOut(pOut), pOut * 1.2);
      sparkles(ctx, sc, S.x, S.y, S.size, prog(lt, 0.45, 0.8));
      drawElement(ctx, sc, b.morph.to, S.x, S.y, S.size, pIn, easeOutBack(pIn), (1 - pIn) * -0.8);
      if (b.morph.label) drawLabel(ctx, sc, L, b.morph.label, prog(lt, 1.0, 0.4));
    } else if (b.show) {
      const p = prog(lt, 0.05, 0.6);
      const hop = b.bounce ? Math.abs(Math.sin(Math.max(0, lt - 0.6) * 5)) * 60 * L.u * Math.max(0, 1 - Math.max(0, lt - 0.6) / 3) : 0;
      drawElement(ctx, sc, b.show, S.x, S.y - hop, S.size, p, easeOutBack(p), 0);
      if (strLabel) drawLabel(ctx, sc, L, strLabel, prog(lt, 0.5, 0.4));
    } else if (st.after && !board.length) {
      const pulse = 1 + Math.sin(t * 2) * 0.02;
      drawElement(ctx, sc, st.after, S.x, S.y, b.count ? S.size * 0.7 : S.size, 1, pulse, 0);
      if (strLabel && !b.count) drawLabel(ctx, sc, L, strLabel, prog(lt, 0.2, 0.4));
    }

    // --- counting
    if (b.count) {
      const Cn = L.count, n = b.count.n;
      const cols = Math.min(n, Cn.cols);
      const rows = Math.ceil(n / cols);
      const shownN = Math.min(n, Math.floor(Math.max(0, lt - 0.6) / 0.55) + (lt >= 0.6 ? 1 : 0));
      for (let i = 0; i < n; i++) {
        const r = Math.floor(i / cols), col = i % cols;
        // right-to-left order: first item on the right
        const x = Cn.x + ((cols - 1) / 2 - col) * Cn.cell;
        const y = Cn.y + (r - (rows - 1) / 2) * Cn.cell;
        const p = prog(lt, 0.6 + i * 0.55, 0.35);
        drawElement(ctx, sc, b.count.item, x, y, Cn.cell * 0.9, p, easeOutBack(p), 0);
      }
      if (shownN > 0) {
        const p = prog(lt, 0.6 + (shownN - 1) * 0.55, 0.3);
        const label = b.count.label ? `${digits(shownN, sc.numerals)} ${b.count.label}` : digits(shownN, sc.numerals);
        setFont(ctx, sc, 96 * L.u * (0.8 + 0.2 * easeOutBack(p)), 800);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.direction = 'rtl';
        ctx.fillStyle = sc.theme.accent2;
        const cy = L.portrait ? S.y + S.size * 0.6 : Cn.y - Cn.cell * (rows / 2 + 0.6);
        ctx.fillText(label, S.x, cy);
      }
    }

    // --- character + bubble
    const talking = lt < cur.talk && t < cur.end;
    const mood = b.mood || (b.celebrate ? 'happy' : b.quiz && lt >= cur.quizAt ? 'happy' : 'neutral');
    const ch = drawPerson(talking, mood);
    const reveal = clamp(lt / Math.max(0.4, cur.talk * 0.9), 0, 1);
    if (B) drawCaption(ctx, sc, B, R, b.say, reveal, ch ? [ch.x + (B.cap.side === 'right' ? -40 : B.cap.side === 'left' ? 40 : 0) * B.u, ch.top + (B.cap.side === 'down' ? 0 : 50 * B.u)] : null);
    else drawBubble(ctx, sc, L, b.say, reveal, ch ? ch.x : L.bubble.x, ch ? ch.top : L.bubble.y, hidden);

    if (b.celebrate) confetti(ctx, sc, W, H, prog(lt, b.quiz ? cur.quizAt : 0.3, 2.2), idx * 31 + 7);
    if (b.quiz && b.quiz.celebrate !== false) confetti(ctx, sc, W, H, prog(lt, cur.quizAt + 0.1, 2.2), idx * 17 + 3);

    if (opts.handle) {
      setFont(ctx, sc, 30 * L.u, 700);
      ctx.textAlign = 'center';
      ctx.direction = 'ltr';
      ctx.fillStyle = sc.theme.ink;
      ctx.globalAlpha = 0.55;
      ctx.fillText(opts.handle, W / 2, B ? B.handleY : L.portrait ? 1480 * L.u : H - 50 * L.u);
      ctx.globalAlpha = 1;
    }
    if (opts.showProgress !== false) {
      const total = tl[tl.length - 1].end;
      ctx.fillStyle = sc.theme.soft;
      ctx.fillRect(0, L.progress.y, W, 8 * L.u);
      ctx.fillStyle = sc.theme.accent;
      ctx.fillRect(W - W * clamp(t / total, 0, 1), L.progress.y, W * clamp(t / total, 0, 1), 8 * L.u);
    }
    return idx;
  }

  function drawLabel(ctx, scene, L, text, p) {
    if (p <= 0) return;
    ctx.save();
    ctx.globalAlpha = p;
    setFont(ctx, scene, 72 * L.u, 800);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = 'rtl';
    ctx.fillStyle = scene.theme.ink;
    ctx.fillText(text, L.label.x, L.label.y + (1 - p) * 20 * L.u);
    ctx.restore();
  }

  /** Prompter text for a scene: one block per beat. */
  function prompterText(scene) {
    return scene.beats.map((b, i) => `## ${i + 1}\n${b.say}`).join('\n\n');
  }

  return {
    FORMATS, DEFAULT_THEME, MOODS, STYLES, PALETTES, BOARD_KINDS, LETTERS, MOLECULES,
    normalizeScene, timeline, totalDuration, drawScene, loadPhoto, talkSeconds, prompterText, layout, boardLayout, compileExpr, parsePath, fmt,
  };
});
