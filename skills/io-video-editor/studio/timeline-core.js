/* timeline-core.js — منطق محرّر التايملاين (بلا واجهة): يشتغل بالمتصفح (window.TL) وبـnode (require) للاختبار.
   كل الأزمنة الداخلية بثواني «المصدر» (src.mov) — هي المرجع الثابت اللي ما يتغيّر مهما تغيّر القص.
   زمن «الإخراج» = بعد القص (caps.json · sfx.json · studio.json). التحويل بين الاثنين هنا بس. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TL = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var MIN_SEG = 0.1;           // أقصر مقطع مسموح (ث)
  var EPS = 1e-6;
  /* أصوات 05_sfx.py: قيمة المفتاح قائمة أزمنة، أو قائمة أزواج [زمن، رقم ثاني] */
  var SFX_IDS = {
    whoosh_up: 0, whoosh_down: 0, thud: 0, tap: 0, pop: 0, click: 0, shimmer: 0, sub: 0, glitch: 0,
    riser: 1.2, type: 0.8, counter: 1.0, soft: 0.05
  };
  var SFX_NAMES = {
    whoosh_up: 'ووش صاعد', whoosh_down: 'ووش نازل', thud: 'ضربة', tap: 'نقرة', pop: 'فقاعة', click: 'كليك',
    shimmer: 'لمعة', sub: 'ضربة عميقة', glitch: 'خلل', riser: 'صعود', type: 'كتابة', counter: 'عدّاد', soft: 'ووش خفيف'
  };

  function r3(x) { return Math.round(x * 1000) / 1000; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function zkey(s) { return Number(s).toFixed(2); }
  function fmt(t) {
    t = Math.max(0, t || 0); var m = Math.floor(t / 60), s = t - m * 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s.toFixed(2);
  }
  function keepTotal(keep) { var s = 0; for (var i = 0; i < keep.length; i++) s += keep[i][1] - keep[i][0]; return s; }
  function offsets(keep) { var o = [], acc = 0; for (var i = 0; i < keep.length; i++) { o.push(acc); acc += keep[i][1] - keep[i][0]; } return o; }

  /* إخراج ← مصدر (بترتيب keep المكتوب، مثل studio.py) */
  function out2src(t, keep) {
    if (!keep.length) return t;
    var acc = 0;
    for (var i = 0; i < keep.length; i++) {
      var L = keep[i][1] - keep[i][0];
      if (t <= acc + L + EPS) return keep[i][0] + Math.max(0, t - acc);
      acc += L;
    }
    return keep[keep.length - 1][1];
  }
  /* مصدر ← إخراج. يرجّع {t, inside, seg}. لو الزمن داخل جزء محذوف: يلصق ببداية أقرب مقطع بعده بالمصدر (أو نهاية آخر مقطع). */
  function src2out(ts, keep) {
    var off = offsets(keep), i;
    for (i = 0; i < keep.length; i++) if (ts >= keep[i][0] - EPS && ts <= keep[i][1] + EPS) return { t: off[i] + clamp(ts - keep[i][0], 0, keep[i][1] - keep[i][0]), inside: true, seg: i };
    var best = -1, bd = Infinity;
    for (i = 0; i < keep.length; i++) if (keep[i][0] > ts && keep[i][0] - ts < bd) { bd = keep[i][0] - ts; best = i; }
    if (best >= 0) return { t: off[best], inside: false, seg: best };
    // بعد كل المقاطع: نهاية آخر مقطع بالمصدر
    for (i = 0; i < keep.length; i++) if (best < 0 || keep[i][1] > keep[best][1]) best = i;
    if (best < 0) return { t: 0, inside: false, seg: -1 };
    return { t: off[best] + keep[best][1] - keep[best][0], inside: false, seg: best };
  }

  /* ---------- نموذج المقاطع: [{id,a,b,z,on}] بترتيب الإخراج ---------- */
  var _id = 0; function nid() { return 's' + (++_id) + '_' + Math.floor(Math.random() * 1e4); }
  function segsFromCut(cut) {
    var keep = (cut && cut.keep) || [], zs = (cut && cut.zooms) || {}, src = (cut && cut._zsrc) || {};
    var zl = Array.isArray(zs) && zs.length === keep.length ? zs : null;
    var keys = (!zl && zs && typeof zs === 'object') ? Object.keys(zs).sort(function (x, y) { return x - y; }) : [];
    var segs = keep.map(function (k, i) {
      var z = 1;
      if (zl) z = Number(zl[i]) || 1;
      else if (zs[zkey(k[0])] != null) z = Number(zs[zkey(k[0])]);
      else { // نفس منطق 03_cut_zoom: بداية داخل مقطع مقفول = جزء منه
        var par = keys.filter(function (x) { return Number(x) <= k[0] + EPS && k[0] < Number(src[x] != null ? src[x] : x); });
        if (par.length) z = Number(zs[par[par.length - 1]]);
      }
      return { id: nid(), a: r3(k[0]), b: r3(k[1]), z: z, on: true };
    });
    (cut && cut._tl_removed || []).forEach(function (r) {
      var seg = { id: nid(), a: r3(r[0]), b: r3(r[1]), z: Number(r[2]) || 1, on: false };
      var at = 0; for (var i = 0; i < segs.length; i++) if (segs[i].a < seg.a) at = i + 1;
      segs.splice(at, 0, seg);
    });
    return segs;
  }
  function keepOf(segs) { return segs.filter(function (s) { return s.on; }).map(function (s) { return [s.a, s.b]; }); }
  function cutPatch(segs) {
    var on = segs.filter(function (s) { return s.on; }), zooms = {}, zsrc = {};
    on.forEach(function (s) { zooms[zkey(s.a)] = Math.round(s.z * 1e4) / 1e4; zsrc[zkey(s.a)] = r3(s.b); });
    return {
      keep: on.map(function (s) { return [s.a, s.b]; }), zooms: zooms, _zsrc: zsrc,
      _tl_removed: segs.filter(function (s) { return !s.on; }).map(function (s) { return [s.a, s.b, s.z]; })
    };
  }
  /* الجيران بترتيب المصدر (عشان القص ما يركب مقطع فوق مقطع) */
  function neighbors(segs, idx, srcDur) {
    var me = segs[idx], lo = 0, hi = srcDur;
    segs.forEach(function (s, j) {
      if (j === idx || !s.on) return;
      if (s.b <= me.a + EPS && s.b > lo) lo = s.b;
      if (s.a >= me.b - EPS && s.a < hi) hi = s.a;
    });
    return { lo: lo, hi: hi };
  }
  function snapTo(t, cands, tol) {
    var best = t, bd = tol;
    for (var i = 0; i < cands.length; i++) { var d = Math.abs(cands[i] - t); if (d <= bd) { bd = d; best = cands[i]; } }
    return best;
  }
  /* حدود الكلمات من وِسبر (a.json) — نقاط الالتصاق */
  function wordBounds(a) {
    var out = [];
    ((a && a.segments) || []).forEach(function (sg) { (sg.words || []).forEach(function (w) { out.push(r3(w.start), r3(w.end)); }); });
    out.sort(function (x, y) { return x - y; });
    return out.filter(function (x, i) { return i === 0 || x !== out[i - 1]; });
  }
  /* سحب طرف مقطع. edge: 'a' | 'b'. snap: {cands, tol} اختياري */
  function trim(segs, idx, edge, t, srcDur, snap) {
    var s = segs[idx]; if (!s) return segs;
    if (snap && snap.cands) t = snapTo(t, snap.cands, snap.tol);
    var nb = s.on ? neighbors(segs, idx, srcDur) : { lo: 0, hi: srcDur };
    var out = segs.map(function (x) { return Object.assign({}, x); }), m = out[idx];
    if (edge === 'a') m.a = r3(clamp(t, nb.lo, m.b - MIN_SEG));
    else m.b = r3(clamp(t, m.a + MIN_SEG, nb.hi));
    return out;
  }
  function segAt(segs, t, onlyOn) {
    for (var i = 0; i < segs.length; i++) { var s = segs[i]; if ((s.on || !onlyOn) && t > s.a + EPS && t < s.b - EPS) return i; }
    return -1;
  }
  function split(segs, t) {
    var i = segAt(segs, t, false);
    if (i < 0) return { segs: segs, index: -1 };
    var s = segs[i];
    if (t - s.a < MIN_SEG || s.b - t < MIN_SEG) return { segs: segs, index: -1 };
    var out = segs.map(function (x) { return Object.assign({}, x); });
    var left = Object.assign({}, s, { b: r3(t) }), right = Object.assign({}, s, { id: nid(), a: r3(t) });
    out.splice(i, 1, left, right);
    return { segs: out, index: i + 1 };
  }
  function toggle(segs, i) {
    var out = segs.map(function (x) { return Object.assign({}, x); });
    if (!out[i]) return out;
    if (out[i].on && out.filter(function (s) { return s.on; }).length < 2) return out; // آخر مقطع ما ينحذف
    out[i].on = !out[i].on;
    if (out[i].on) { // الاسترجاع ما يركب فوق جار تغيّر بعد الحذف
      var me = out[i];
      out.forEach(function (s, j) {
        if (j === i || !s.on) return;
        if (s.a < me.b && s.b > me.a) { if (s.a <= me.a) me.a = r3(Math.min(me.b - MIN_SEG, s.b)); else me.b = r3(Math.max(me.a + MIN_SEG, s.a)); }
      });
    }
    return out;
  }
  function move(segs, from, to) {
    var out = segs.slice(); var x = out.splice(from, 1)[0]; out.splice(clamp(to, 0, out.length), 0, x); return out;
  }
  function setZoom(segs, i, z) {
    var out = segs.map(function (x) { return Object.assign({}, x); });
    if (out[i]) out[i].z = Math.round(clamp(Number(z) || 1, 1, 1.6) * 100) / 100;
    return out;
  }

  /* ---------- الكابشن: fixes.json ← fix[i] لكل جملة وِسبر ---------- */
  /* نص للتحرير: الكلمة اللي فيها مسافة تنكتب بـ_ ، والكلمة الفاضية ("" = تنشال من الكابشن) تنكتب ~ */
  function fixToText(f) {
    if (typeof f === 'string') return f;
    return (f || []).map(function (w) { return w === '' ? '~' : String(w).replace(/ /g, '_'); }).join(' ');
  }
  function fixToDisplay(f) {
    if (typeof f === 'string') return f;
    return (f || []).filter(function (w) { return w; }).join(' ');
  }
  /* يرجّع {ok, value, count, expected, err}. free=true لو الجملة أصلاً نص (وِسبر هلوس) — بلا شرط العدد */
  function parseFixText(text, expected, free) {
    var t = String(text || '').trim();
    if (free) return t ? { ok: true, value: t } : { ok: false, err: 'الجملة فاضية' };
    var toks = t ? t.split(/\s+/) : [];
    if (toks.length !== expected) {
      return {
        ok: false, count: toks.length, expected: expected,
        err: 'عدد الكلمات ' + toks.length + ' ووِسبر سمع ' + expected + ' — لازم يتساوون (اربط كلمتين بـ _ ، أو اكتب ~ مكان كلمة تبي تشيلها من الكابشن)'
      };
    }
    return { ok: true, count: toks.length, expected: expected, value: toks.map(function (w) { return w === '~' ? '' : w.replace(/_/g, ' '); }) };
  }
  function sentences(a, fix) {
    return ((a && a.segments) || []).map(function (sg, i) {
      var ws = sg.words || [];
      return {
        i: i, a: ws.length ? r3(ws[0].start) : r3(sg.start), b: ws.length ? r3(ws[ws.length - 1].end) : r3(sg.end),
        n: ws.length, free: typeof (fix && fix[i]) === 'string', fix: fix ? fix[i] : null,
        words: ws.map(function (w) { return { s: r3(w.start), e: r3(w.end) }; })
      };
    }).filter(function (s) { return s.n > 0; });
  }

  /* ---------- المؤثرات الصوتية: sfx.json (زمن إخراج) ⇄ علامات بزمن المصدر ---------- */
  function sfxToMarkers(sfx, keep) {
    var out = [];
    Object.keys(sfx || {}).forEach(function (k) {
      if (k === 'outro' || !Array.isArray(sfx[k])) return;
      if (k === 'lib') {
        sfx[k].forEach(function (v) { if (Array.isArray(v)) out.push({ id: 'lib:' + v[1], t: r3(out2src(Number(v[0]), keep)), x: v.length > 2 ? v[2] : null }); });
        return;
      }
      sfx[k].forEach(function (v) {
        if (Array.isArray(v)) out.push({ id: k, t: r3(out2src(Number(v[0]), keep)), x: v[1] });
        else out.push({ id: k, t: r3(out2src(Number(v), keep)), x: null });
      });
    });
    out.sort(function (p, q) { return p.t - q.t; });
    return out;
  }
  /* base = sfx.json الحالي (نحفظ outro وأي مفتاح ما نعرفه) */
  function markersToSfx(markers, keep, base) {
    var o = {}; base = base || {};
    Object.keys(base).forEach(function (k) { if (!Array.isArray(base[k])) o[k] = base[k]; });
    if (o.outro === undefined) o.outro = 3.5;
    var tot = keepTotal(keep);
    markers.slice().sort(function (p, q) { return p.t - q.t; }).forEach(function (m) {
      var t = r3(src2out(m.t, keep).t);
      if (t > tot + EPS) return;
      if (m.id.indexOf('lib:') === 0) { (o.lib = o.lib || []).push(m.x != null ? [t, m.id.slice(4), m.x] : [t, m.id.slice(4)]); return; }
      var pair = SFX_IDS[m.id] > 0 || (m.x != null && !(m.id in SFX_IDS));
      (o[m.id] = o[m.id] || []).push(pair ? [t, m.x != null ? m.x : (SFX_IDS[m.id] || 0)] : t);
    });
    return o;
  }
  /* كتالوج library/sfx/catalog.json بأي شكل معقول → [{id,name}] */
  function libList(cat) {
    if (!cat) return [];
    var arr = Array.isArray(cat) ? cat : (cat.sfx || cat.items || cat.sounds || []);
    if (!Array.isArray(arr) && typeof arr === 'object') arr = Object.keys(arr).map(function (k) { return Object.assign({ id: k }, arr[k]); });
    return arr.map(function (x) {
      if (typeof x === 'string') return { id: x, name: x };
      var id = x.id || x.key || x.name || x.file; return id ? { id: String(id), name: String(x.name_ar || x.ar || x.name || x.title || id) } : null;
    }).filter(Boolean);
  }

  /* ---------- وش لازم يتعاد بعد التعديل ---------- */
  function plan(saved, cur) {
    // saved/cur: {keep, zooms:{}, fix:[], sfx:{}}
    var keepCh = JSON.stringify(saved.keep) !== JSON.stringify(cur.keep);
    var zoomCh = JSON.stringify(sortObj(saved.zooms)) !== JSON.stringify(sortObj(cur.zooms));
    var fixCh = JSON.stringify(saved.fix) !== JSON.stringify(cur.fix);
    var sfxCh = JSON.stringify(sortObj(saved.sfx)) !== JSON.stringify(sortObj(cur.sfx));
    var steps = [];
    if (keepCh || fixCh) steps.push('captions');
    if (keepCh || zoomCh) steps.push('cut', 'frames');
    if (keepCh || zoomCh || fixCh) steps.push('render');
    if (steps.length || sfxCh) steps.push('sfx', 'encode');
    return { keep: keepCh, zoom: zoomCh, fix: fixCh, sfx: sfxCh, any: steps.length > 0, steps: steps };
  }
  function sortObj(o) {
    if (!o || typeof o !== 'object' || Array.isArray(o)) return o;
    var r = {}; Object.keys(o).sort().forEach(function (k) { r[k] = o[k]; }); return r;
  }

  /* ---------- تراجع/إعادة ---------- */
  function History(limit) { this.u = []; this.r = []; this.limit = limit || 100; }
  History.prototype.push = function (snap) { this.u.push(JSON.stringify(snap)); if (this.u.length > this.limit) this.u.shift(); this.r = []; };
  History.prototype.undo = function (cur) { if (!this.u.length) return null; this.r.push(JSON.stringify(cur)); return JSON.parse(this.u.pop()); };
  History.prototype.redo = function (cur) { if (!this.r.length) return null; this.u.push(JSON.stringify(cur)); return JSON.parse(this.r.pop()); };

  /* ---------- طلب لـ Claude (طابور آي أو استوديو: POST /api/queue بسيرفر engine/serve.js) ---------- */
  var TARGET_AR = { caption: 'الكابشن', audio: 'الصوت', general: 'الفيديو' };
  /* o = {target, work, note, sentence:{i,a,b}, text, seg:{a,b}} → جسم الطلب */
  function editRequest(o) {
    o = o || {};
    var body = { type: 'edit', target: TARGET_AR[o.target] ? o.target : 'general', work: String(o.work || ''), note: String(o.note || '').trim(), source: 'timeline' };
    if (o.sentence) body.segment = { index: o.sentence.i, start: r3(o.sentence.a), end: r3(o.sentence.b), text: String(o.text || '') };
    else if (o.seg) body.segment = { start: r3(o.seg.a), end: r3(o.seg.b) };
    if (o.ideaId) body.ideaId = o.ideaId;
    return body;
  }
  /* نفس الطلب كأمر يلصقه بالشات لو سيرفر آي أو استوديو مو شغّال */
  function chatCommand(body) {
    var b = body || {}, s = b.segment || {}, where = '';
    if (s.index != null) where = 'الجملة ' + (s.index + 1) + ' (' + fmt(s.start) + ' → ' + fmt(s.end) + ')' + (s.text ? ' «' + s.text + '»' : '');
    else if (s.start != null) where = 'المقطع ' + fmt(s.start) + ' → ' + fmt(s.end) + ' (زمن المصدر)';
    return '/io:io-video-editor عدّل ' + (TARGET_AR[b.target] || 'الفيديو') + ' بمجلد الشغل ' + (b.work || '<work>') +
      (where ? ' — ' + where : '') + ': ' + (b.note || '') + ' — وبعدها طبّق بس اللي تغيّر (التايملاين «طبّق»).';
  }
  /* سيرفرات آي أو استوديو المحتملة: نفضّل اللي مجلد مشروعه يحتوي مجلد الشغل */
  function pickServer(found, work) {
    var w = String(work || '').replace(/\\/g, '/');
    var best = null;
    (found || []).forEach(function (f) {
      if (!f) return;
      var p = String(f.project || '').replace(/\\/g, '/').replace(/\/+$/, '');
      var inside = p && (w === p || w.indexOf(p + '/') === 0);
      if (!best || (inside && !best.inside) || (inside === best.inside && f.port < best.port)) best = { port: f.port, project: f.project, inside: !!inside };
    });
    return best;
  }

  /* ---------- 🎯 التتبّع (engine/track/track.py · references/tracking.md) ----------
     ملف التتبّع: {type:'plane'|'box'|'point', video, fps, size:[w,h], clock:'out'|'src'|'video', frames:[{t, quad|box|points, conf}]}
     الإحداثيات ببكسل الفيديو المتتبَّع، والزمن بساعة نفس الفيديو (cutz.mp4 = زمن الإخراج). */
  var TRACK_TYPES = { plane: 'سطح (4 زوايا)', box: 'صندوق', point: 'نقطة' };
  /* أربع زوايا بأي ترتيب → فوق-يسار، فوق-يمين، تحت-يمين، تحت-يسار (نفس order_quad بالبايثون) */
  function orderQuad(q) {
    if (!q || q.length !== 4) return q;
    var cx = 0, cy = 0; q.forEach(function (p) { cx += p[0] / 4; cy += p[1] / 4; });
    var s = q.map(function (p) { return [Number(p[0]), Number(p[1])]; })
      .sort(function (a, b) { return Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx); });
    var k = 0; for (var i = 1; i < 4; i++) if (s[i][0] + s[i][1] < s[k][0] + s[k][1]) k = i;
    return [0, 1, 2, 3].map(function (j) { return s[(k + j) % 4]; });
  }
  /* سحب من نقطة لنقطة → [x,y,w,h] موجب */
  function rectFrom2(a, b) {
    var x = Math.min(a[0], b[0]), y = Math.min(a[1], b[1]);
    return [r1(x), r1(y), r1(Math.abs(b[0] - a[0])), r1(Math.abs(b[1] - a[1]))];
  }
  function r1(x) { return Math.round(x * 10) / 10; }
  function quadFromBox(b) { return [[b[0], b[1]], [b[0] + b[2], b[1]], [b[0] + b[2], b[1] + b[3]], [b[0], b[1] + b[3]]]; }
  /* مكان الفيديو داخل عنصر (object-fit: contain): {x,y,w,h,s} — s = بكسل شاشة لكل بكسل فيديو */
  function fitRect(vw, vh, cw, ch) {
    if (!vw || !vh || !cw || !ch) return { x: 0, y: 0, w: cw || 0, h: ch || 0, s: 1 };
    var s = Math.min(cw / vw, ch / vh), w = vw * s, h = vh * s;
    return { x: (cw - w) / 2, y: (ch - h) / 2, w: w, h: h, s: s };
  }
  function toScreen(p, R) { return [R.x + p[0] * R.s, R.y + p[1] * R.s]; }
  function toVideo(p, R, size) {
    var x = (p[0] - R.x) / R.s, y = (p[1] - R.y) / R.s;
    if (size) { x = clamp(x, 0, size[0]); y = clamp(y, 0, size[1]); }
    return [r1(x), r1(y)];
  }
  function lerpShape(a, b, k) {
    if (Array.isArray(a)) return a.map(function (v, i) { return Array.isArray(v) ? lerpShape(v, b[i], k) : v + (b[i] - v) * k; });
    var o = {}; Object.keys(a).forEach(function (n) { o[n] = b && b[n] ? lerpShape(a[n], b[n], k) : a[n]; }); return o;
  }
  /* شكل التتبّع عند t (بساعة الفيديو المتتبَّع) — يمزج بين فريمين متجاورين. null برّا المدى. */
  function trackFrameAt(track, t) {
    var fr = (track && track.frames) || [];
    if (!fr.length) return null;
    var half = 0.5 / ((track && track.fps) || 30), key = track.type === 'plane' ? 'quad' : track.type === 'box' ? 'box' : 'points';
    if (t < fr[0].t - half || t > fr[fr.length - 1].t + half) return null;
    var lo = 0, hi = fr.length - 1;
    while (lo < hi) { var m = (lo + hi + 1) >> 1; if (fr[m].t <= t) lo = m; else hi = m - 1; }
    var a = fr[lo], b = fr[lo + 1], out = { t: t, conf: a.conf };
    if (!b || t <= a.t || b.t - a.t > 3.5 / ((track && track.fps) || 30)) { out[key] = a[key]; return out; }
    var k = clamp((t - a.t) / (b.t - a.t), 0, 1);
    out[key] = lerpShape(a[key], b[key], k); out.conf = Math.min(a.conf, b.conf);
    return out;
  }
  function trackSummary(track) {
    var fr = (track && track.frames) || [];
    if (!fr.length) return { n: 0, a: 0, b: 0, conf: 0, weak: 0, lost: null };
    var sum = 0, weak = 0; fr.forEach(function (f) { sum += f.conf || 0; if ((f.conf || 0) < 0.5) weak++; });
    var lost = track.lost && track.lost.fwd != null ? track.lost.fwd : null;
    return { n: fr.length, a: fr[0].t, b: fr[fr.length - 1].t, conf: Math.round(sum / fr.length * 100) / 100, weak: weak, lost: lost };
  }
  /* اسم ملف آمن وفريد: plane-30.5 · plane-30.5-2 … */
  function trackName(type, at, names, wanted) {
    var base = String(wanted || (type + '-' + (Math.round(Number(at) * 10) / 10))).trim().replace(/[\\/:*?"<>|\s]+/g, '-').replace(/^\.+/, '').slice(0, 40) || type;
    var have = {}; (names || []).forEach(function (n) { have[n] = 1; });
    if (wanted && !have[base]) return base;
    var n = base, k = 2; while (have[n]) n = base + '-' + (k++);
    return n;
  }
  /* جسم POST /api/track/run (أو {ok:false, err}). o = {type, at, shape, to, back, name, fix} */
  function trackRequest(o) {
    o = o || {}; var t = o.type, at = Number(o.at), sh = o.shape;
    if (!TRACK_TYPES[t]) return { ok: false, err: 'اختر نوع التتبّع' };
    if (!(at >= 0)) return { ok: false, err: 'وقّف على فريم أول' };
    var body = { type: t, at: Math.round(at * 1000) / 1000 };
    if (t === 'plane') {
      if (!sh || sh.length !== 4) return { ok: false, err: 'اضغط الزوايا الأربع على الصورة' };
      var q = orderQuad(sh), A = 0;
      for (var i = 0; i < 4; i++) { var p = q[i], n = q[(i + 1) % 4]; A += p[0] * n[1] - n[0] * p[1]; }
      if (Math.abs(A / 2) < 64) return { ok: false, err: 'الزوايا صغيرة زيادة أو على خط واحد' };
      body.quad = q.map(function (p) { return [r1(p[0]), r1(p[1])]; });
    } else if (t === 'box') {
      if (!sh || sh.length !== 4 || !(sh[2] >= 6 && sh[3] >= 6)) return { ok: false, err: 'ارسم صندوق (اسحب على الصورة)' };
      body.box = sh.map(r1);
    } else {
      var pts = Array.isArray(sh) ? { p: sh } : sh;
      if (!pts || !Object.keys(pts).length) return { ok: false, err: 'اضغط النقطة على الصورة' };
      body.points = {}; Object.keys(pts).forEach(function (k) { body.points[k] = [r1(pts[k][0]), r1(pts[k][1])]; });
    }
    if (o.to != null && o.to !== '' && !o.fix) {
      var to = Number(o.to); if (!(to > at)) return { ok: false, err: '«إلى» لازم بعد الفريم الحالي' };
      body.to = Math.round(to * 1000) / 1000;
    }
    if (o.back && !o.fix) body.back = true;
    if (o.fix) { if (!o.name) return { ok: false, err: 'اختر التتبّع اللي تبي تصلّحه' }; body.fix = true; }
    if (o.name) body.name = String(o.name);
    return { ok: true, body: body };
  }
  /* عناصر studio.json اللي ينربط فيها تتبّع: أي قائمة كائنات فيها s وe (stickers · brollClips · moves …) ما عدا المشاهد */
  function attachables(studio) {
    var out = [], NAMES = { stickers: 'ملصق', brollClips: 'بي-رول', moves: 'حركة', fx: 'مؤثر', motion: 'موشن', elements: 'عنصر' };
    Object.keys(studio || {}).forEach(function (k) {
      var arr = studio[k]; if (k === 'scenes' || !Array.isArray(arr)) return;
      arr.forEach(function (el, i) {
        if (!el || typeof el !== 'object' || Array.isArray(el) || typeof el.s !== 'number' || typeof el.e !== 'number') return;
        var lab = el.label || el.name || el.t || el.text || el.id || el.move || el.key || '';
        out.push({ list: k, i: i, s: el.s, e: el.e, track: el.track || null, label: (NAMES[k] || k) + ' ' + (i + 1) + (lab ? ' · ' + String(lab).slice(0, 24) : '') });
      });
    });
    return out.sort(function (a, b) { return a.s - b.s; });
  }
  /* زمن الفيديو المتتبَّع من زمن المصدر (مؤشر التايملاين): 'out' = بعد القص (null لو المؤشر بجزء محذوف) */
  function trackClockTime(clock, srcT, keep) {
    if (clock !== 'out') return srcT;
    var r = src2out(srcT, keep || []); return r.inside ? r.t : null;
  }

  return {
    TRACK_TYPES: TRACK_TYPES, orderQuad: orderQuad, rectFrom2: rectFrom2, quadFromBox: quadFromBox, fitRect: fitRect, toScreen: toScreen, toVideo: toVideo,
    trackFrameAt: trackFrameAt, trackSummary: trackSummary, trackName: trackName, trackRequest: trackRequest, attachables: attachables, trackClockTime: trackClockTime,
    editRequest: editRequest, chatCommand: chatCommand, pickServer: pickServer,
    MIN_SEG: MIN_SEG, SFX_IDS: SFX_IDS, SFX_NAMES: SFX_NAMES, r3: r3, clamp: clamp, zkey: zkey, fmt: fmt,
    keepTotal: keepTotal, offsets: offsets, out2src: out2src, src2out: src2out,
    segsFromCut: segsFromCut, keepOf: keepOf, cutPatch: cutPatch, neighbors: neighbors, snapTo: snapTo, wordBounds: wordBounds,
    trim: trim, segAt: segAt, split: split, toggle: toggle, move: move, setZoom: setZoom,
    fixToText: fixToText, fixToDisplay: fixToDisplay, parseFixText: parseFixText, sentences: sentences,
    sfxToMarkers: sfxToMarkers, markersToSfx: markersToSfx, libList: libList, plan: plan, History: History
  };
});
