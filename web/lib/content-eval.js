/*
 * I/O Studio — content evaluation. Every post is judged against the account's OWN baseline
 * (median of its last N posts on the same platform, the post itself excluded), with
 * the same rules for Instagram, YouTube and TikTok.
 *
 *   score 0–100 · grade قوي/متوسط/ضعيف · hookScore 0–100 (+ evidence, + «تقديري» when only proxies exist)
 *   reasons (Arabic, rule-based) each with a concrete fix · patterns «شنو يشتغل عندك» (best vs worst)
 *
 * Hook evidence, best first:
 *   hold3  — % still watching at ~3 s: YouTube retention curve (official) · Instagram 100 − reels_skip_rate (official)
 *   watch  — average watch time ÷ duration (YouTube averageViewDuration, Instagram ig_reels_avg_watch_time, manual)
 *   hookmeter — first word / cuts / motion from engine/hookmeter (when Claude ran it on the file)
 *   proxies — views vs own median, views per follower, engagement (TikTok / public scrapes have nothing else)
 * Runs in the browser (window.IoEval) and in Node (engine/content-eval.js re-exports it).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.IoEval = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PLATFORMS = ['instagram', 'youtube', 'tiktok'];
  const NAMES = { instagram: 'إنستقرام', youtube: 'يوتيوب', tiktok: 'تيك توك' };
  const GRADE_AR = { strong: 'قوي', mid: 'متوسط', weak: 'ضعيف' };
  const BUCKETS = [[0, 15], [15, 30], [30, 60], [60, 180], [180, 600], [600, 1e9]];
  const WINDOW = 20;

  const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
  const has = (v) => v !== null && v !== undefined && isFinite(v);
  const r1 = (v) => Math.round(v * 10) / 10;
  function median(a) { const s = a.filter(has).sort((x, y) => x - y); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
  /** ratio → 0..100, 1× = 50, 2× = 85, ½× = 15. */
  const comp = (r) => (has(r) && r > 0 ? clamp(50 + 35 * Math.log2(r)) : has(r) ? 0 : null);
  const pct = (x, d = 0) => (x * 100).toFixed(d) + '%';
  const secTxt = (s) => (s >= 60 ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')} د` : `${Math.round(s)}ث`);
  const bucketOf = (d) => BUCKETS.findIndex(([a, b]) => d >= a && d < b);
  const bucketTxt = (i) => { const [a, b] = BUCKETS[i]; return b >= 1e9 ? `أطول من ${a / 60} د` : b <= 60 ? `${a}–${b}ث` : `${a < 60 ? a + 'ث' : a / 60 + ' د'}–${b / 60} د`; };
  const hourTxt = (h) => { const am = h < 12; const x = h % 12 || 12; return `${x}${am ? ' ص' : ' م'}`; };
  const hourDist = (a, b) => { const d = Math.abs(a - b) % 24; return Math.min(d, 24 - d); };

  function retentionAt(pts, x) {
    if (!pts || !pts.length) return null;
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, v0] = pts[i - 1], [x1, v1] = pts[i]; return v0 + (v1 - v0) * ((x - x0) / ((x1 - x0) || 1)); }
    return pts[pts.length - 1][1];
  }

  /** Derived per-post metrics; null when this source can't see it. */
  function derive(p, followers) {
    const views = has(p.views) ? p.views : null;
    const parts = ['likes', 'comments', 'shares', 'saves'].filter((k) => has(p[k]));
    const eng = parts.reduce((a, k) => a + p[k], 0);
    const m = {
      views,
      er: views && parts.length ? eng / views : null,
      ssr: views && (has(p.saves) || has(p.shares)) ? ((p.saves || 0) + (p.shares || 0)) / views : null,
      commentsRate: views && has(p.comments) ? p.comments / views : null,
      commentsPerLike: has(p.comments) && p.likes ? p.comments / p.likes : null,
      reachRatio: has(p.reach) && followers ? p.reach / followers : null,
      viewsPerFollower: views !== null && followers ? views / followers : null,
      watchRatio: has(p.avgWatchSec) && p.durationSec ? Math.min(1.5, p.avgWatchSec / p.durationSec) : null,
      hold3: null, hold3From: '',
    };
    const src = p.src || {};
    if (has(p.skipRate)) { m.hold3 = 100 - p.skipRate; m.hold3From = 'skip'; m.hold3Src = src.skipRate || src.hold3 || 'file'; }
    else if (has(p.hold3)) { m.hold3 = p.hold3; m.hold3From = src.hold3 === 'manual' ? 'manual' : 'retention'; m.hold3Src = src.hold3 || 'file'; }
    else if (p.retention && p.durationSec) { m.hold3 = retentionAt(p.retention, 3 / p.durationSec); m.hold3From = 'retention'; m.hold3Src = src.retention || 'file'; }
    m.watchSrc = has(m.watchRatio) ? src.avgWatchSec || 'file' : '';
    return m;
  }

  function baselineOf(list) {
    const keys = ['views', 'er', 'ssr', 'commentsRate', 'reachRatio', 'viewsPerFollower', 'watchRatio', 'hold3'];
    const b = { n: list.length };
    for (const k of keys) b[k] = median(list.map((x) => x.m[k]));
    return b;
  }

  /** Account-level context: best hour (by avg views), length sweet spot (by median views index). */
  function accountContext(items) {
    const timed = items.filter((x) => x.p.date && !/T00:00$/.test(x.p.date));
    let bestHour = null;
    if (timed.length >= 6) {
      const by = Array.from({ length: 24 }, () => ({ n: 0, v: 0 }));
      for (const x of timed) { const h = +x.p.date.slice(11, 13); by[h].n++; by[h].v += x.m.views || 0; }
      let bv = -1; by.forEach((h, i) => { if (h.n && h.v / h.n > bv) { bv = h.v / h.n; bestHour = i; } });
    }
    const med = median(items.map((x) => x.m.views));
    let sweet = null;
    if (med && items.filter((x) => x.p.durationSec).length >= 6) {
      let best = -1;
      BUCKETS.forEach((_, i) => {
        const inB = items.filter((x) => x.p.durationSec && bucketOf(x.p.durationSec) === i).map((x) => (x.m.views || 0) / med);
        if (inB.length >= 2) { const v = median(inB); if (v > best) { best = v; sweet = i; } }
      });
    }
    return { bestHour, sweet, medianViews: med };
  }

  const R = (code, kind, text, fix, weight) => ({ code, kind, text, fix: fix || '', weight: weight || 1 });

  /** Evaluate one post against its baseline. */
  function judge(x, base, ctx, opts) {
    const { p, m } = x;
    const idx = (k) => (has(m[k]) && has(base[k]) && base[k] > 0 ? m[k] / base[k] : null);
    const I = { views: idx('views'), er: idx('er'), ssr: idx('ssr'), comments: idx('commentsRate'), reach: idx('reachRatio'), vpf: idx('viewsPerFollower'), watch: idx('watchRatio'), hold: idx('hold3') };
    // ---- score
    const parts = [[comp(I.views), 0.35], [comp(I.er), 0.2], [comp(I.ssr), 0.15], [comp(I.watch), 0.15], [comp(I.hold), 0.15]].filter(([v]) => v !== null);
    const wsum = parts.reduce((a, [, w]) => a + w, 0);
    const score = wsum ? Math.round(parts.reduce((a, [v, w]) => a + v * w, 0) / wsum) : null;
    // ---- hook
    const ev = [];
    let hook = null, estimated = true;
    if (has(m.hold3)) {
      const abs = clamp((m.hold3 - 40) / 50 * 100);
      const rel = comp(I.hold);
      let h = rel !== null ? 0.6 * abs + 0.4 * rel : abs;
      const from = m.hold3From === 'skip' ? (m.hold3Src === 'official' ? 'نسبة التخطي من إنستقرام' : 'نسبة التخطي') : m.hold3From === 'manual' ? 'رقم كتبته يدوياً' : 'منحنى البقاء';
      ev.push(`${r1(m.hold3)}% كمّلوا بعد أول ٣ ثواني (${from})${has(base.hold3) ? ` — عادتك ${r1(base.hold3)}%` : ''}`);
      if (has(m.watchRatio)) { h = 0.75 * h + 0.25 * clamp((m.watchRatio - 0.2) / 0.6 * 100); ev.push(`متوسط المشاهدة ${pct(m.watchRatio)} من الطول`); }
      hook = h; estimated = m.hold3Src !== 'official';
    } else if (has(m.watchRatio)) {
      const abs = clamp((m.watchRatio - 0.2) / 0.6 * 100), rel = comp(I.watch);
      hook = rel !== null ? 0.6 * abs + 0.4 * rel : abs;
      ev.push(`متوسط المشاهدة ${pct(m.watchRatio)} من الطول${has(base.watchRatio) ? ` — عادتك ${pct(base.watchRatio)}` : ''} (بلا نسبة بقاء مباشرة)`);
    } else if (I.views !== null) {
      hook = 0.65 * comp(I.views) + 0.35 * (comp(I.er) !== null ? comp(I.er) : 50);
      ev.push(`تقديري: المشاهدات ${r1(I.views)}× متوسطك${I.er !== null ? ` والتفاعل ${r1(I.er)}×` : ''} — ${p.platform === 'tiktok' ? 'أرقام تيك توك ما فيها وقت مشاهدة ولا بقاء' : 'ما عندنا وقت مشاهدة لهالمنشور'}`);
    }
    const hm = opts.hookmeter && opts.hookmeter[x.key];
    if (hm && hook !== null) {
      if (has(hm.first_word_sec)) { ev.push(`أول كلمة عند ${r1(hm.first_word_sec)}ث (مقياس الهوك)`); if (hm.first_word_sec > 1.2) hook -= 8; }
      if (has(hm.cuts)) ev.push(`${hm.cuts} قطعات بأول ثواني`);
    }
    // ---- reasons
    const reasons = [];
    if (base.n < 3) reasons.push(R('few', 'info', 'منشورات قليلة للمقارنة — الحكم يتحسن بعد ٥+ منشورات', 'استمر بالنشر وخل المزامنة يومية', 0.1));
    if (has(m.hold3) && (m.hold3 < 60 || (has(base.hold3) && m.hold3 < base.hold3 * 0.85))) reasons.push(R('hook-weak', 'bad', `الهوك ضعيف: ${Math.round(100 - m.hold3)}% طلعوا قبل الثانية ٣`, 'ابدأ بالنتيجة أو بسؤال بأول ثانية، شيل التحية والمقدمة، وحط نص كبير على الشاشة يكمل الوعد', 3));
    else if (has(m.hold3) && m.hold3 >= 75) reasons.push(R('hook-strong', 'good', `هوك قوي: ${Math.round(m.hold3)}% ظلوا بعد ٣ ثواني`, 'كرر نفس أسلوب البداية', 2));
    if (hm && has(hm.first_word_sec) && hm.first_word_sec > 1.2) reasons.push(R('late-word', 'bad', `أول كلمة تأخرت (${r1(hm.first_word_sec)}ث)`, 'ابدأ الكلام من أول فريم — قص الصمت', 2));
    if (has(m.watchRatio) && m.watchRatio < 0.3) reasons.push(R('drop-mid', 'bad', `أغلب الناس طلعت بدري: متوسط المشاهدة ${pct(m.watchRatio)} من الطول`, 'قص الحشو، وكل ٣–٥ ثواني شي جديد (قطعة، نص، مثال)', 2));
    else if (has(m.watchRatio) && m.watchRatio >= 0.7) reasons.push(R('watched', 'good', `الناس كمّلته تقريباً (${pct(m.watchRatio)} من الطول)`, '', 1.5));
    if (has(p.durationSec) && p.durationSec && ctx.sweet !== null) {
      const b = bucketOf(p.durationSec);
      if (b > ctx.sweet && (b - ctx.sweet >= 2 || p.durationSec > BUCKETS[ctx.sweet][1] * 1.5) && ((I.views !== null && I.views < 1) || (has(m.watchRatio) && m.watchRatio < 0.4)))
        reasons.push(R('too-long', 'bad', `طويل على جمهورك: ${secTxt(p.durationSec)} وأفضل أداء عندك ${bucketTxt(ctx.sweet)}`, `قصّه لـ ${bucketTxt(ctx.sweet)} أو قسّمه لجزئين`, 1.5));
    }
    if (ctx.bestHour !== null && p.date && !/T00:00$/.test(p.date)) {
      const h = +p.date.slice(11, 13);
      if (hourDist(h, ctx.bestHour) >= 4 && I.views !== null && I.views < 1) reasons.push(R('dead-time', 'bad', `نزل بوقت ميت (${hourTxt(h)}) — أفضل ساعة عندك ${hourTxt(ctx.bestHour)}`, `جدول الجاي على ${hourTxt(ctx.bestHour)}`, 1));
    }
    if (I.ssr !== null && I.ssr >= 1.4 && ((I.views !== null && I.views < 0.8) || (I.reach !== null && I.reach < 0.8)))
      reasons.push(R('cover', 'bad', 'حفظ ومشاركة عالية بس وصول قليل → المشكلة بالغلاف/أول فريم مو بالمحتوى', 'غيّر الغلاف وأول فريم والعنوان على الشاشة، وأعد نشره (ستوري/نسخة ثانية)', 2.5));
    if (I.views !== null && I.views >= 2) reasons.push(R('viral', 'good', `انتشر: ${r1(I.views)}× متوسط مشاهداتك`, 'سوّ جزء ثاني أو نفس الفكرة بزاوية جديدة', 2.5));
    else if (I.views !== null && I.views < 0.5) reasons.push(R('low-views', 'bad', `المشاهدات ${r1(I.views)}× متوسطك بس`, has(m.hold3) || has(m.watchRatio) ? 'شوف الهوك والطول فوق' : 'جرّب هوك أوضح بأول ثانية وغلاف بنص كبير', 1.5));
    if (I.reach !== null && I.reach >= 1.6) reasons.push(R('reach', 'good', `وصل لغير المتابعين: الوصول ${pct(m.reachRatio)} من متابعينك`, '', 1.5));
    if (I.er !== null && I.er < 0.6) reasons.push(R('low-eng', 'bad', `التفاعل أقل من عادتك (${pct(m.er, 1)} مقابل ${pct(base.er, 1)})`, 'اختم بسؤال أو دعوة واضحة (احفظه / اكتب كلمة بالتعليقات)', 1));
    if (I.comments !== null && I.comments >= 2) reasons.push(R('talk', 'good', 'النقاش عالي — التعليقات ضعف عادتك', 'رد على التعليقات بفيديو', 1));
    if (I.ssr !== null && I.ssr >= 1.5 && !reasons.some((r) => r.code === 'cover')) reasons.push(R('saves', 'good', 'حفظ ومشاركة فوق عادتك — محتوى ينفع', 'حوّله لكاروسيل أو سلسلة', 1.5));
    if (!has(m.hold3) && !has(m.watchRatio)) reasons.push(R('no-retention', 'info', p.platform === 'tiktok' ? 'تيك توك ما يطلّع بقاء ولا وقت مشاهدة بالتصدير — الهوك تقديري من المشاهدات' : 'ما عندنا بقاء ولا وقت مشاهدة لهالمنشور — الهوك تقديري (أضفها يدوياً إذا عندك)', '', 0.05));
    const order = { bad: 0, good: 1, info: 2 };
    reasons.sort((a, b) => (score !== null && score >= 65 ? order[a.kind === 'good' ? 'bad' : a.kind === 'bad' ? 'good' : 'info'] - order[b.kind === 'good' ? 'bad' : b.kind === 'bad' ? 'good' : 'info'] : order[a.kind] - order[b.kind]) || b.weight - a.weight);
    const grade = score === null ? null : score >= 65 ? 'strong' : score >= 40 ? 'mid' : 'weak';
    const src = p.src || {};
    return {
      key: x.key, platform: p.platform, id: p.id, title: p.title || '', url: p.url || '', thumb: p.thumb || '', videoUrl: p.videoUrl || '', date: p.date, type: p.type, durationSec: p.durationSec || 0,
      score, grade, gradeAr: grade ? GRADE_AR[grade] : '—',
      hookScore: hook === null ? null : Math.round(clamp(hook)), hookEstimated: estimated, hookEvidence: ev,
      metrics: {
        views: m.views, likes: has(p.likes) ? p.likes : null, comments: has(p.comments) ? p.comments : null, shares: has(p.shares) ? p.shares : null, saves: has(p.saves) ? p.saves : null, reach: has(p.reach) ? p.reach : null,
        er: m.er, ssr: m.ssr, commentsRate: m.commentsRate, reachRatio: m.reachRatio, viewsPerFollower: m.viewsPerFollower, watchRatio: m.watchRatio, hold3: m.hold3, avgWatchSec: has(p.avgWatchSec) ? p.avgWatchSec : null, skipRate: has(p.skipRate) ? p.skipRate : null,
      },
      index: I,
      sources: src,
      reasons, topReason: reasons.find((r) => r.kind !== 'info') || reasons[0] || null,
      fixes: reasons.filter((r) => r.kind === 'bad' && r.fix).map((r) => r.fix).slice(0, 3),
      retention: p.retention || null,
      analysis: opts.analyses && opts.analyses[x.key] || null,
    };
  }

  // ---------------------------------------------------------------- patterns
  function hookType(t) {
    const s = String(t || '').trim();
    if (!s) return 'بلا نص';
    if (/[؟?]/.test(s.slice(0, 80)) || /^(ليش|شلون|كيف|هل|شنو|وين|متى|منو|why|how|what)\b/i.test(s)) return 'سؤال';
    if (/^\s*[\d٠-٩]+/.test(s) || /\b[\d٠-٩]+\s*(أشياء|طرق|أخطاء|خطوات|نصائح|things|ways|tips)/i.test(s)) return 'رقم/قائمة';
    if (/(لا ت|غلط|خطأ|تحذير|انتبه|أكبر|أسوأ|stop|don'?t|mistake)/i.test(s)) return 'تحذير/خطأ';
    if (/(سر|محد|ما راح تصدق|أحد يعرف|secret|nobody)/i.test(s)) return 'فضول/سر';
    if (/^(أنا|انا|قصة|يوم|مرة|كنت|I |my )/i.test(s)) return 'قصة';
    return 'جملة مباشرة';
  }
  const STOP = new Set('من في على عن الى إلى هذا هذه هاي هذي اللي الي التي الذي مع بس كل شي شيء ما لا هو هي انت أنت انا أنا عند كان يكون حتى لو او أو و ثم the and for you your with this that are from'.split(' '));
  const words = (t) => String(t || '').toLowerCase().replace(/#[^\s]+/g, ' ').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w));

  function patterns(list) {
    const lines = [];
    const scored = list.filter((x) => x.score !== null);
    if (scored.length < 8) return { lines: ['نحتاج ٨ منشورات على الأقل حتى نطلع أنماط — كمّل النشر والمزامنة.'], best: null, worst: null };
    const s = [...scored].sort((a, b) => b.score - a.score);
    const q = Math.max(2, Math.floor(s.length / 4));
    const best = s.slice(0, q), worst = s.slice(-q);
    const prof = (g) => {
      const types = {}; for (const x of g) { const k = hookType(x.title); types[k] = (types[k] || 0) + 1; }
      const hours = g.filter((x) => x.date && !/T00:00$/.test(x.date)).map((x) => +x.date.slice(11, 13));
      return { n: g.length, medSec: median(g.map((x) => x.durationSec || null)), medHour: median(hours), hook: median(g.map((x) => x.hookScore)), types, words: g.flatMap((x) => [...new Set(words(x.title))]) };
    };
    const B = prof(best), W = prof(worst);
    const topType = (t) => Object.entries(t).sort((a, b) => b[1] - a[1])[0];
    const bt = topType(B.types), wt = topType(W.types);
    if (bt && (!wt || bt[0] !== wt[0])) lines.push(`أفضل منشوراتك تبدي غالباً بـ«${bt[0]}» (${bt[1]} من ${B.n})${wt ? `، والأضعف بـ«${wt[0]}»` : ''}.`);
    else if (bt) lines.push(`نوع البداية الأكثر عندك «${bt[0]}» — جرّب نوع ثاني (سؤال أو رقم) وقارن.`);
    if (B.medSec && W.medSec && Math.abs(B.medSec - W.medSec) >= 8) lines.push(`الطول: الأقوى حوالي ${secTxt(B.medSec)} والأضعف ${secTxt(W.medSec)} — ${B.medSec < W.medSec ? 'الأقصر يشتغل أحسن عندك' : 'جمهورك يتحمّل الأطول إذا المحتوى يستاهل'}.`);
    if (has(B.medHour) && has(W.medHour) && hourDist(B.medHour, W.medHour) >= 3) lines.push(`الوقت: الأقوى نزلت حوالي ${hourTxt(Math.round(B.medHour))} والأضعف حوالي ${hourTxt(Math.round(W.medHour))}.`);
    if (has(B.hook) && has(W.hook)) lines.push(`درجة الهوك: الأقوى ${Math.round(B.hook)} مقابل ${Math.round(W.hook)} للأضعف${B.hook - W.hook >= 15 ? ' — الفرق يبدي من أول ثواني' : ''}.`);
    const cnt = (a) => a.reduce((m, w) => (m[w] = (m[w] || 0) + 1, m), {});
    const cb = cnt(B.words), cw = cnt(W.words);
    const topics = Object.entries(cb).filter(([w, n]) => n >= 2 && !(cw[w] >= n)).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([w]) => w);
    if (topics.length) lines.push(`مواضيع تتكرر بالأقوى: ${topics.join('، ')}.`);
    const byPl = {};
    for (const x of scored) (byPl[x.platform] = byPl[x.platform] || []).push(x.score);
    const pls = Object.entries(byPl).filter(([, a]) => a.length >= 3).map(([p, a]) => [p, median(a)]).sort((a, b) => b[1] - a[1]);
    if (pls.length >= 2) lines.push(`نسبةً لعادتها: ${NAMES[pls[0][0]]} ماشية أحسن (${Math.round(pls[0][1])}) و${NAMES[pls[pls.length - 1][0]]} أضعف (${Math.round(pls[pls.length - 1][1])}).`);
    return { lines, best: B, worst: W };
  }

  /**
   * stats (stats.json shape) → {posts, baseline, patterns}.
   * opts: {platform, window=20, analyses:{key}, hookmeter:{key:{first_word_sec, cuts…}}}
   */
  function evaluate(stats, opts = {}) {
    const out = [], baseline = {};
    const N = opts.window || WINDOW;
    for (const pl of PLATFORMS) {
      if (opts.platform && opts.platform !== pl) continue;
      const acc = stats && stats.accounts && stats.accounts[pl];
      if (!acc || !(acc.posts || []).length) continue;
      const followers = acc.followers || 0;
      const items = acc.posts.filter((p) => p && p.id).sort((a, b) => String(a.date).localeCompare(String(b.date)))
        .map((p) => {
          const q = Object.assign({ platform: pl }, p);
          // Instagram's API has no video length — Claude's deep analysis fills it (ffprobe on the file).
          const an = opts.analyses && opts.analyses[`${pl}-${p.id}`];
          if (!q.durationSec && an && an.durationSec > 0) q.durationSec = an.durationSec;
          return { key: `${pl}-${p.id}`, p: q, m: derive(q, followers) }; });
      const ctx = accountContext(items);
      baseline[pl] = Object.assign(baselineOf(items.slice(-N)), { bestHour: ctx.bestHour, sweet: ctx.sweet !== null ? bucketTxt(ctx.sweet) : null, followers });
      items.forEach((x, i) => {
        const others = items.slice(Math.max(0, i - N), i).concat(items.slice(i + 1, i + 1 + Math.max(0, N - i))).slice(0, N);
        out.push(judge(x, baselineOf(others), ctx, opts));
      });
    }
    out.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    return { generatedAt: new Date().toISOString(), posts: out, baseline, patterns: patterns(out) };
  }

  return { evaluate, derive, judge, patterns, hookType, retentionAt, median, comp, GRADE_AR, NAMES };
});
