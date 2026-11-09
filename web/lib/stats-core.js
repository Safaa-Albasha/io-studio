/*
 * I/O Studio — stats core.
 * Turns Instagram / YouTube / TikTok exports (CSV or JSON) into one schema and
 * computes the same KPIs, with the same formulas, for all three platforms.
 * Runs in the browser (window.IoStats) and in Node (require).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.IoStats = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PLATFORM_IDS = ['instagram', 'youtube', 'tiktok'];
  const METRICS = ['views', 'reach', 'likes', 'comments', 'shares', 'saves', 'watchSec'];

  // Header aliases (lower-cased, spaces/punctuation collapsed). Covers the
  // English and Arabic column names seen in Meta Business Suite, YouTube Studio
  // and TikTok Studio exports, plus our own template columns.
  const ALIASES = {
    id: ['id', 'post id', 'media id', 'video id', 'content', 'رقم', 'المعرف', 'معرف المنشور', 'معرف الفيديو'],
    date: ['date', 'publish time', 'published', 'publish date', 'video publish time', 'post time', 'created', 'time', 'التاريخ', 'تاريخ النشر', 'وقت النشر'],
    title: ['title', 'description', 'caption', 'video title', 'post', 'العنوان', 'الوصف', 'النص', 'عنوان الفيديو'],
    type: ['type', 'post type', 'media type', 'content type', 'format', 'النوع', 'نوع المنشور'],
    url: ['url', 'permalink', 'link', 'video link', 'الرابط'],
    views: ['views', 'total views', 'total plays', 'video views', 'plays', 'play count', 'impressions', 'المشاهدات', 'مشاهدات', 'عدد المشاهدات', 'مرات الظهور'],
    reach: ['reach', 'accounts reached', 'unique viewers', 'الوصول', 'الحسابات التي تم الوصول إليها'],
    likes: ['likes', 'total likes', 'like count', 'reactions', 'الإعجابات', 'اعجابات', 'لايكات'],
    comments: ['comments', 'total comments', 'comment count', 'التعليقات', 'تعليقات'],
    shares: ['shares', 'total shares', 'share count', 'المشاركات', 'مشاركات'],
    saves: ['saves', 'total saves', 'saved', 'favorites', 'add to favorites', 'الحفظ', 'المحفوظات', 'حفظ'],
    watchSec: ['watch time sec', 'watch time seconds', 'total watch time sec', 'وقت المشاهدة ثانية'],
    watchHours: ['watch time hours', 'watch time (hours)', 'وقت المشاهدة ساعات', 'وقت المشاهدة (بالساعات)'],
    durationSec: ['duration', 'duration sec', 'length', 'المدة'],
    followers: ['followers', 'subscribers', 'total followers', 'follower count', 'المتابعين', 'المتابعون', 'المشتركين', 'المشتركون'],
    newFollowers: ['new followers', 'subscribers gained', 'follows', 'متابعون جدد', 'مشتركون جدد'],
  };

  function key(s) {
    return String(s || '')
      .replace(/^﻿/, '')
      .toLowerCase()
      .replace(/[_\-:]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const ALIAS_INDEX = {};
  for (const [field, list] of Object.entries(ALIASES)) for (const a of list) ALIAS_INDEX[key(a)] = field;

  function fieldFor(header) {
    const k = key(header);
    if (ALIAS_INDEX[k]) return ALIAS_INDEX[k];
    const stripped = k.replace(/\s*\(.*\)\s*$/, '');
    if (ALIAS_INDEX[stripped]) return ALIAS_INDEX[stripped];
    if (/watch time/.test(k) && /hour|ساع/.test(k)) return 'watchHours';
    return null;
  }

  // ---------------------------------------------------------------- CSV
  function detectDelimiter(line) {
    const counts = { ',': 0, ';': 0, '\t': 0 };
    let q = false;
    for (const ch of line) {
      if (ch === '"') q = !q;
      else if (!q && ch in counts) counts[ch]++;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }

  function parseCSV(text) {
    text = String(text || '').replace(/^﻿/, '');
    const firstLine = text.split(/\r?\n/, 1)[0] || '';
    const d = detectDelimiter(firstLine);
    const rows = [];
    let row = [];
    let cell = '';
    let q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"') {
          if (text[i + 1] === '"') { cell += '"'; i++; } else q = false;
        } else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === d) { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); cell = '';
        if (row.some((c) => c.trim() !== '')) rows.push(row);
        row = [];
      } else cell += ch;
    }
    row.push(cell);
    if (row.some((c) => c.trim() !== '')) rows.push(row);
    return rows;
  }

  // ---------------------------------------------------------------- values
  const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
  const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
  function westernDigits(s) {
    return String(s).replace(/[٠-٩۰-۹]/g, (c) => {
      const i = AR_DIGITS.indexOf(c);
      return String(i >= 0 ? i : FA_DIGITS.indexOf(c));
    }).replace(/٫/g, '.').replace(/٬/g, ',');
  }

  function parseNumber(v) {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    let s = westernDigits(v).trim().toLowerCase().replace(/\s+/g, '');
    if (!s || s === '-' || s === '—') return 0;
    let mult = 1;
    const suf = s.match(/(k|m|b|ألف|الف|مليون)$/);
    if (suf) {
      mult = { k: 1e3, m: 1e6, b: 1e9, 'ألف': 1e3, 'الف': 1e3, 'مليون': 1e6 }[suf[1]];
      s = s.slice(0, -suf[1].length);
    }
    s = s.replace(/%$/, '');
    // 1.234.567 or 1,234,567 → thousands separators; 1,5 → decimal comma
    if (/^\d{1,3}([.,]\d{3})+$/.test(s)) s = s.replace(/[.,]/g, '');
    else s = s.replace(/,(\d{1,2})$/, '.$1').replace(/,/g, '');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n * mult : 0;
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  /** Returns an ISO string (local time, no zone) or null. */
  function parseDate(v) {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v) ? null : toIso(v);
    const s = westernDigits(v).trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
    if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}T${pad(m[4] || 0)}:${pad(m[5] || 0)}`;
    m = s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})(?:[ ,]+(\d{1,2}):(\d{2})\s*(am|pm|ص|م)?)?/i);
    if (m) {
      let a = +m[1], b = +m[2], y = +m[3];
      if (y < 100) y += 2000;
      // Meta & TikTok exports are US style (M/D/Y); a first part > 12 means D/M/Y.
      let mon = a, day = b;
      if (a > 12) { day = a; mon = b; }
      let h = +(m[4] || 0);
      const ap = (m[6] || '').toLowerCase();
      if ((ap === 'pm' || ap === 'م') && h < 12) h += 12;
      if ((ap === 'am' || ap === 'ص') && h === 12) h = 0;
      return `${y}-${pad(mon)}-${pad(day)}T${pad(h)}:${pad(m[5] || 0)}`;
    }
    const t = Date.parse(s);
    return Number.isNaN(t) ? null : toIso(new Date(t));
  }

  function toIso(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // ---------------------------------------------------------------- import
  function emptyAccount(platform) {
    return { platform, handle: '', followers: 0, snapshots: [], posts: [] };
  }

  function emptyStats() {
    const accounts = {};
    for (const p of PLATFORM_IDS) accounts[p] = emptyAccount(p);
    return { version: 1, generatedAt: null, accounts };
  }

  /**
   * Map a parsed table to records. A table with a followers column and no
   * per-post metrics is a follower history; otherwise it's a post list.
   */
  function tableToRecords(rows) {
    if (!rows.length) return { kind: 'empty', posts: [], snapshots: [], unknown: [] };
    // Some exports put a title line above the header; use the first row that
    // maps at least two columns.
    let h = 0;
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      if (rows[i].filter((c) => fieldFor(c)).length >= 2) { h = i; break; }
    }
    const headers = rows[h];
    const fields = headers.map(fieldFor);
    const unknown = headers.filter((x, i) => !fields[i] && String(x).trim());
    const has = (f) => fields.includes(f);
    const isFollowerTable = has('followers') && !METRICS.some((m) => has(m)) || (has('followers') && has('date') && !has('title') && !has('id') && !has('views'));
    const out = { kind: isFollowerTable ? 'followers' : 'posts', posts: [], snapshots: [], unknown };
    for (const r of rows.slice(h + 1)) {
      const rec = {};
      fields.forEach((f, i) => { if (f && rec[f] === undefined) rec[f] = r[i]; });
      const date = parseDate(rec.date);
      if (isFollowerTable) {
        if (!date) continue;
        out.snapshots.push({ date: date.slice(0, 10), followers: parseNumber(rec.followers), newFollowers: parseNumber(rec.newFollowers) });
      } else {
        if (!date && !rec.id && !rec.title) continue;
        const post = {
          id: String(rec.id || '').trim() || null,
          date,
          title: String(rec.title || '').trim().slice(0, 300),
          type: normaliseType(rec.type),
          url: String(rec.url || '').trim(),
          durationSec: parseNumber(rec.durationSec),
        };
        for (const m of METRICS) post[m] = parseNumber(rec[m]);
        if (!post.watchSec && rec.watchHours) post.watchSec = Math.round(parseNumber(rec.watchHours) * 3600);
        if (!post.id) post.id = `${post.date || ''}|${post.title.slice(0, 40)}`;
        out.posts.push(post);
      }
    }
    return out;
  }

  function normaliseType(t) {
    const k = key(t);
    if (!k) return 'video';
    if (/reel|short|video|فيديو|ريل|شورت/.test(k)) return 'video';
    if (/carousel|album|كاروس|ألبوم|photo mode|صور/.test(k)) return 'carousel';
    if (/image|photo|صورة/.test(k)) return 'image';
    if (/story|ستوري|قصة/.test(k)) return 'story';
    if (/live|بث/.test(k)) return 'live';
    return 'video';
  }

  /** Merge records into stats (mutates and returns stats). Newer data wins. */
  function merge(stats, platform, recs, meta) {
    if (!PLATFORM_IDS.includes(platform)) throw new Error(`unknown platform: ${platform}`);
    const acc = stats.accounts[platform] || (stats.accounts[platform] = emptyAccount(platform));
    if (meta && meta.handle) acc.handle = meta.handle;
    if (meta && meta.followers) acc.followers = parseNumber(meta.followers);
    const byId = new Map(acc.posts.map((p) => [p.id, p]));
    for (const p of recs.posts || []) byId.set(p.id, Object.assign(byId.get(p.id) || {}, p));
    acc.posts = [...byId.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const byDate = new Map(acc.snapshots.map((s) => [s.date, s]));
    for (const s of recs.snapshots || []) byDate.set(s.date, s);
    acc.snapshots = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
    // Fill cumulative followers when only daily gains were exported.
    if (acc.snapshots.length && acc.snapshots.every((s) => !s.followers) && acc.followers) {
      let run = acc.followers;
      for (let i = acc.snapshots.length - 1; i >= 0; i--) {
        acc.snapshots[i].followers = run;
        run -= acc.snapshots[i].newFollowers || 0;
      }
    }
    const last = acc.snapshots[acc.snapshots.length - 1];
    if (last && last.followers && !(meta && meta.followers)) acc.followers = last.followers;
    stats.generatedAt = new Date().toISOString();
    return stats;
  }

  function importText(stats, platform, text, meta) {
    const t = String(text).trim();
    let recs;
    if (t.startsWith('{') || t.startsWith('[')) {
      const j = JSON.parse(t);
      if (j.accounts) {
        for (const p of PLATFORM_IDS) if (j.accounts[p]) merge(stats, p, j.accounts[p], j.accounts[p]);
        return { kind: 'stats', posts: 0, snapshots: 0, unknown: [] };
      }
      const arr = Array.isArray(j) ? j : j.posts || [];
      const rows = arr.length ? [Object.keys(arr[0]), ...arr.map((o) => Object.values(o))] : [];
      recs = tableToRecords(rows);
    } else recs = tableToRecords(parseCSV(t));
    merge(stats, platform, recs, meta);
    return { kind: recs.kind, posts: recs.posts.length, snapshots: recs.snapshots.length, unknown: recs.unknown };
  }

  // ---------------------------------------------------------------- KPIs
  function inRange(iso, range) {
    if (!iso) return false;
    const d = iso.slice(0, 10);
    if (range && range.from && d < range.from) return false;
    if (range && range.to && d > range.to) return false;
    return true;
  }

  function median(a) {
    if (!a.length) return 0;
    const s = [...a].sort((x, y) => x - y);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  function engagementOf(p) { return (p.likes || 0) + (p.comments || 0) + (p.shares || 0) + (p.saves || 0); }

  function daysBetween(a, b) {
    return Math.max(1, Math.round((Date.parse(b.slice(0, 10)) - Date.parse(a.slice(0, 10))) / 864e5) + 1);
  }

  const WEEKDAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  function weekStart(iso) {
    const d = new Date(iso.slice(0, 10) + 'T00:00:00');
    d.setDate(d.getDate() - d.getDay()); // weeks start on Sunday
    return toIso(d).slice(0, 10);
  }

  /** Same KPIs, same formulas, for any platform. */
  function kpis(account, range) {
    const posts = (account.posts || []).filter((p) => inRange(p.date, range));
    const snaps = (account.snapshots || []).filter((s) => inRange(s.date, range));
    const views = posts.map((p) => p.views || 0);
    const totalViews = views.reduce((a, b) => a + b, 0);
    const eng = posts.reduce((a, p) => a + engagementOf(p), 0);
    const first = snaps[0], last = snaps[snaps.length - 1];
    const followers = (last && last.followers) || account.followers || 0;
    const growth = first && last ? last.followers - first.followers : snaps.reduce((a, s) => a + (s.newFollowers || 0), 0);
    const startF = first ? first.followers : followers - growth;
    const dates = posts.map((p) => p.date).filter(Boolean).sort();
    const spanFrom = (range && range.from) || dates[0];
    const spanTo = (range && range.to) || dates[dates.length - 1];
    const days = spanFrom && spanTo ? daysBetween(spanFrom, spanTo) : 0;

    const byDay = Array.from({ length: 7 }, () => ({ n: 0, v: 0 }));
    const byHour = Array.from({ length: 24 }, () => ({ n: 0, v: 0 }));
    const weekly = {};
    for (const p of posts) {
      if (!p.date) continue;
      const d = new Date(p.date);
      byDay[d.getDay()].n++; byDay[d.getDay()].v += p.views || 0;
      byHour[d.getHours()].n++; byHour[d.getHours()].v += p.views || 0;
      const w = weekStart(p.date);
      (weekly[w] = weekly[w] || { week: w, posts: 0, views: 0, engagement: 0 });
      weekly[w].posts++; weekly[w].views += p.views || 0; weekly[w].engagement += engagementOf(p);
    }
    const best = (arr) => {
      let bi = -1, bv = -1;
      arr.forEach((x, i) => { if (x.n) { const avg = x.v / x.n; if (avg > bv) { bv = avg; bi = i; } } });
      return bi;
    };
    const hasTimes = posts.some((p) => p.date && !/T00:00$/.test(p.date));
    const bd = best(byDay), bh = hasTimes ? best(byHour) : -1;
    const top = [...posts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5)
      .map((p) => ({ id: p.id, date: p.date, title: p.title, url: p.url, views: p.views || 0, engagementRate: p.views ? engagementOf(p) / p.views : 0 }));

    return {
      platform: account.platform,
      handle: account.handle || '',
      followers,
      followerGrowth: growth,
      followerGrowthPct: startF > 0 ? growth / startF : 0,
      posts: posts.length,
      postsPerWeek: days ? (posts.length / days) * 7 : 0,
      views: totalViews,
      avgViews: posts.length ? totalViews / posts.length : 0,
      medianViews: median(views),
      likes: posts.reduce((a, p) => a + (p.likes || 0), 0),
      comments: posts.reduce((a, p) => a + (p.comments || 0), 0),
      shares: posts.reduce((a, p) => a + (p.shares || 0), 0),
      saves: posts.reduce((a, p) => a + (p.saves || 0), 0),
      engagement: eng,
      engagementRate: totalViews ? eng / totalViews : 0,
      watchHours: posts.reduce((a, p) => a + (p.watchSec || 0), 0) / 3600,
      bestWeekday: bd >= 0 ? { index: bd, nameAr: WEEKDAYS_AR[bd] } : null,
      bestHour: bh >= 0 ? bh : null,
      weekly: Object.values(weekly).sort((a, b) => a.week.localeCompare(b.week)),
      followerSeries: snaps.map((s) => ({ date: s.date, followers: s.followers })),
      top,
    };
  }

  /**
   * Weekday × hour grid of average views (posts with a real time only) — the page's heatmap.
   * Returns { cells: [7][24] {n, avg}, max } with weekday 0 = Sunday.
   */
  function heatmap(accounts, range) {
    const cells = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => ({ n: 0, v: 0, avg: 0 })));
    let max = 0;
    for (const a of accounts) {
      for (const p of a.posts || []) {
        if (!p.date || /T00:00$/.test(p.date) || !inRange(p.date, range)) continue;
        const d = new Date(p.date);
        const c = cells[d.getDay()][d.getHours()];
        c.n++; c.v += p.views || 0;
      }
    }
    for (const row of cells) for (const c of row) { c.avg = c.n ? c.v / c.n : 0; if (c.avg > max) max = c.avg; }
    return { cells, max };
  }

  function compare(stats, range) {
    const per = {};
    for (const p of PLATFORM_IDS) per[p] = kpis(stats.accounts[p] || emptyAccount(p), range);
    const sum = (f) => PLATFORM_IDS.reduce((a, p) => a + (per[p][f] || 0), 0);
    const totals = {
      followers: sum('followers'), followerGrowth: sum('followerGrowth'), posts: sum('posts'),
      views: sum('views'), engagement: sum('engagement'), watchHours: sum('watchHours'),
    };
    totals.engagementRate = totals.views ? totals.engagement / totals.views : 0;
    const share = {};
    for (const p of PLATFORM_IDS) {
      share[p] = {
        followers: totals.followers ? per[p].followers / totals.followers : 0,
        views: totals.views ? per[p].views / totals.views : 0,
        posts: totals.posts ? per[p].posts / totals.posts : 0,
      };
    }
    return { range: range || null, per, totals, share, balance: balance(per) };
  }

  /**
   * Balance score 0–100: how evenly effort (posts) is spread over the three
   * platforms. 100 = exactly equal; the studio's promise is equal treatment.
   */
  function balance(per) {
    const n = PLATFORM_IDS.map((p) => per[p].posts);
    const total = n.reduce((a, b) => a + b, 0);
    if (!total) return { score: 0, lagging: [] };
    const ideal = total / PLATFORM_IDS.length;
    const dev = n.reduce((a, x) => a + Math.abs(x - ideal), 0);
    const maxDev = 2 * (total - ideal); // all posts on one platform
    const score = Math.round(100 * (1 - dev / maxDev));
    const lagging = PLATFORM_IDS.filter((p, i) => n[i] < ideal * 0.7);
    return { score, lagging };
  }

  const NAMES_AR = { instagram: 'إنستقرام', youtube: 'يوتيوب', tiktok: 'تيك توك' };

  function pct(x) { return `${(x * 100).toFixed(1)}%`; }

  /** Plain-Arabic findings, one sentence each, data-driven. */
  function insights(cmp) {
    const out = [];
    const active = PLATFORM_IDS.filter((p) => cmp.per[p].posts || cmp.per[p].followers);
    if (!active.length) return ['ما بيه بيانات بعد — استورد ملفات التصدير من المنصات الثلاث.'];
    const missing = PLATFORM_IDS.filter((p) => !active.includes(p));
    if (missing.length) out.push(`ناقصة بيانات: ${missing.map((p) => NAMES_AR[p]).join('، ')} — المقارنة ما تكمل بدونها.`);
    const by = (f) => [...active].sort((a, b) => cmp.per[b][f] - cmp.per[a][f]);
    const g = by('followerGrowthPct')[0];
    if (cmp.per[g].followerGrowth > 0) out.push(`أسرع نمو بالمتابعين: ${NAMES_AR[g]} (+${pct(cmp.per[g].followerGrowthPct)}).`);
    const e = by('engagementRate')[0];
    if (cmp.per[e].engagementRate > 0) out.push(`أعلى تفاعل نسبةً للمشاهدات: ${NAMES_AR[e]} (${pct(cmp.per[e].engagementRate)}).`);
    const v = by('avgViews')[0];
    if (cmp.per[v].avgViews > 0) out.push(`أعلى متوسط مشاهدات للمنشور: ${NAMES_AR[v]}.`);
    if (cmp.balance.lagging.length) {
      out.push(`التوازن ${cmp.balance.score}/100 — ${cmp.balance.lagging.map((p) => NAMES_AR[p]).join('، ')} ياخذ منشورات أقل من حصته. انشر نفس المحتوى بنسخة مقاسة لكل منصة.`);
    } else if (cmp.totals.posts) out.push(`التوازن ${cmp.balance.score}/100 — النشر موزّع بالتساوي تقريباً.`);
    for (const p of active) {
      const k = cmp.per[p];
      if (k.bestWeekday && k.posts >= 6) out.push(`${NAMES_AR[p]}: أفضل يوم ${k.bestWeekday.nameAr}${k.bestHour !== null ? `، وأفضل ساعة ${k.bestHour}:00` : ''} (حسب متوسط المشاهدات).`);
    }
    return out;
  }

  return {
    PLATFORM_IDS, ALIASES, fieldFor, parseCSV, parseNumber, parseDate, westernDigits,
    emptyStats, tableToRecords, merge, importText, kpis, heatmap, compare, balance, insights, engagementOf,
  };
});
