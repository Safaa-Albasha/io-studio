#!/usr/bin/env node
/*
 * I/O Studio — stats CLI (shared by the CLI, engine/serve.js and the session hook).
 *   import  — CSV/JSON export files, or a Composio Instagram pull  → stats.json
 *   fetch   — official APIs (keys in env vars) → stats.json   (unchanged)
 *   summary — KPIs + plain-Arabic findings for a period
 *   eval    — content evaluation per post (web/lib/content-eval.js)
 *   connect-status / sync / due — the «إنستقرام عبر Claude + Composio» path
 *
 *   node engine/stats.js import instagram exports/ig.csv [--handle @حسابك] [--followers 42000] [--out stats.json]
 *   node engine/stats.js import --from composio-instagram <pull.json> [--dir <project>]   # → <project>/.io/stats.json
 *   node engine/stats.js connect-status [--json] [--dir <project>]
 *   node engine/stats.js sync [--dir <project>]      # Instagram is pulled by Claude through Composio — prints what to do, queues it with --queue
 *   node engine/stats.js due  [--dir <project>]      # exit 0 when the daily Instagram pull is due (> 24 h)
 *   node engine/stats.js eval [--platform instagram] [--json] [--dir <project>]
 *   node engine/stats.js fetch [--only youtube,tiktok] [--out stats.json]
 *   node engine/stats.js summary [--in stats.json] [--days 28] [--json]
 *
 * No keys live in the plugin: Composio holds the Instagram login. The Instagram pull uses exactly
 * Composio's INSTAGRAM_GET_USER_INFO, INSTAGRAM_GET_IG_USER_MEDIA, INSTAGRAM_GET_IG_MEDIA_INSIGHTS and
 * INSTAGRAM_GET_USER_INSIGHTS (official Graph API under the hood) — skills/io-dashboard/scripts/composio_pull.py.
 * Each post keeps `src` = {metric: 'official'|'manual'|'file'} so the page and content-eval know which numbers are real insights.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const S = require('../web/lib/stats-core.js');
const { dataFile } = require('./data-dir.js');

const PLATFORMS = S.PLATFORM_IDS;
const NAMES = { instagram: 'إنستقرام', youtube: 'يوتيوب', tiktok: 'تيك توك' };
const METRICS = ['views', 'reach', 'likes', 'comments', 'shares', 'saves', 'watchSec', 'avgWatchSec', 'skipRate', 'hold3'];
const DAY = 864e5;

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; o[k] = v; } else o._.push(a);
  }
  return o;
}
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };
const statsFile = (dir) => dataFile(dir, 'stats.json');
const syncFile = (dir) => dataFile(dir, 'stats-sync.json');

function load(file) {
  if (!fs.existsSync(file)) return S.emptyStats();
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const st = S.emptyStats();
  for (const id of S.PLATFORM_IDS) if (j.accounts && j.accounts[id]) Object.assign(st.accounts[id], j.accounts[id]);
  if (j.generatedAt) st.generatedAt = j.generatedAt;
  return st;
}
function save(file, st) {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const tmp = file + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(st, null, 2));
  fs.renameSync(tmp, file);
}
const readSync = (dir) => Object.assign({ version: 1, mode: 'manual', instagram: null }, readJson(syncFile(dir), {}) || {});
function writeSync(dir, s) { const f = syncFile(dir); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(s, null, 2)); }

const num = (v) => (v === null || v === undefined || v === '' || !isFinite(+v) ? null : +v);
const nonNeg = (v) => { const n = num(v); return n === null || n < 0 ? null : n; };
const cleanHandle = (h) => String(h || '').trim().replace(/^https?:\/\/[^/]+\//, '').replace(/^@+/, '').replace(/\/+$/, '').split(/[/?#]/)[0];
const projectDir = (o) => path.resolve(o.dir && o.dir !== true ? o.dir : process.env.CLAUDE_PROJECT_DIR || process.cwd());

/** A post record with every metric present (null = this source cannot see it). */
function post(o, source) {
  const p = {
    id: String(o.id || ''), date: o.date || null, title: String(o.title || '').split('\n')[0].slice(0, 160), caption: String(o.caption || '').slice(0, 2200),
    type: o.type || 'video', url: o.url || '', thumb: o.thumb || '', videoUrl: o.videoUrl || '', durationSec: num(o.durationSec) || 0,
  };
  for (const m of METRICS) p[m] = o[m] === undefined ? null : nonNeg(o[m]);
  if (Array.isArray(o.retention) && o.retention.length) p.retention = o.retention;
  p.src = {};
  for (const m of METRICS) if (p[m] !== null) p.src[m] = source;
  if (p.retention) p.src.retention = source;
  return p;
}

/**
 * Merge into stats without letting a weaker source wipe stronger numbers:
 * null fields are dropped, `src` maps are combined, official insights win over hand-typed ones.
 */
function mergeAccount(st, platform, recs, meta) {
  const acc = st.accounts[platform];
  const byId = new Map((acc.posts || []).map((p) => [p.id, p]));
  const posts = (recs.posts || []).filter((p) => p && p.id).map((p) => {
    const old = byId.get(p.id) || {};
    const clean = {};
    for (const [k, v] of Object.entries(p)) if (v !== null && v !== undefined && v !== '' && k !== 'src') clean[k] = v;
    const src = Object.assign({}, old.src || {});
    for (const [m, s] of Object.entries(p.src || {})) {
      if (old.src && old.src[m] === 'official' && s !== 'official' && old[m] != null) { delete clean[m]; continue; }
      src[m] = s;
    }
    clean.src = src;
    return clean;
  });
  S.merge(st, platform, { posts, snapshots: recs.snapshots || [] }, meta);
  if (recs.extra) acc.extra = Object.assign(acc.extra || {}, recs.extra);
  return st;
}

// ------------------------------------------------------------ Composio Instagram (official Graph API)
/** value of one Graph insight row: total_value.value, else the last values[].value. */
function insightValue(row) {
  if (!row) return null;
  if (row.total_value && row.total_value.value != null) return row.total_value.value;
  if (Array.isArray(row.values) && row.values.length) return row.values[row.values.length - 1].value;
  return null;
}
/** Composio wraps every result as {data, successful, error}; accept both. */
const unwrap = (x) => (x && typeof x === 'object' && !Array.isArray(x) && x.data !== undefined && (x.successful !== undefined || x.error !== undefined) ? x.data : x);
const rows = (x) => { x = unwrap(x); return Array.isArray(x) ? x : x && Array.isArray(x.data) ? x.data : []; };

/** One media item + its INSTAGRAM_GET_IG_MEDIA_INSIGHTS rows → post. */
function normInstagramMedia(m, insights) {
  const I = {};
  for (const r of rows(insights)) I[r.name] = insightValue(r);
  const reel = m.media_product_type === 'REELS' || m.media_type === 'VIDEO';
  // ig_reels_avg_watch_time / ig_reels_video_view_total_time are milliseconds (Meta reference; TO VERIFY on a live account).
  const avgMs = I.ig_reels_avg_watch_time, totalMs = I.ig_reels_video_view_total_time;
  const pick = (...v) => { for (const x of v) if (x !== undefined && x !== null) return x; return null; };
  const p = post({
    id: m.id, date: S.parseDate(m.timestamp), title: m.caption, caption: m.caption,
    type: reel ? 'video' : m.media_type === 'CAROUSEL_ALBUM' ? 'carousel' : 'image',
    url: m.permalink || '', thumb: m.thumbnail_url || (m.media_type === 'IMAGE' ? m.media_url : '') || '', videoUrl: reel ? m.media_url || '' : '',
    views: pick(I.views, m.view_count, m.total_views_count), reach: pick(I.reach),
    likes: pick(I.likes, m.like_count, m.total_like_count), comments: pick(I.comments, m.comments_count, m.total_comments_count),
    shares: pick(I.shares, m.shares_count), saves: pick(I.saved, m.saved_count),
    avgWatchSec: avgMs != null ? avgMs / 1000 : null, watchSec: totalMs != null ? totalMs / 1000 : null,
    skipRate: pick(I.reels_skip_rate),
  }, 'official');
  // reels_skip_rate = % who swiped away in the first ~3 s → % still watching after 3 s.
  if (p.skipRate !== null) { p.hold3 = Math.max(0, 100 - p.skipRate); p.src.hold3 = 'official'; }
  if (I.follows != null) p.follows = I.follows;
  return p;
}

/** follower_demographics / online_followers / follower_count rows → extra. */
function audienceFrom(userInsights) {
  const out = {};
  for (const r of rows(userInsights)) {
    if (/_demographics$/.test(r.name) && r.total_value && Array.isArray(r.total_value.breakdowns)) {
      const a = out.audience = out.audience || {};
      for (const b of r.total_value.breakdowns) {
        const keys = b.dimension_keys || [];
        const ki = keys.findIndex((k) => k !== 'timeframe');
        const key = ki >= 0 ? keys[ki] : 'value';
        a[key] = (b.results || []).map((x) => ({ k: (x.dimension_values || [])[ki >= 0 ? ki : 0], v: x.value })).sort((p, q) => q.v - p.v).slice(0, 10);
      }
    }
    if (r.name === 'online_followers') {
      const v = insightValue(r);
      if (v && typeof v === 'object') out.onlineHours = Array.from({ length: 24 }, (_, h) => +v[h] || 0);
    }
    if (r.name === 'follower_count' && Array.isArray(r.values)) out.followerGains = r.values.map((x) => ({ date: String(x.end_time || '').slice(0, 10), gained: +x.value || 0 })).filter((x) => x.date);
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * composio_pull.py output → Instagram account.
 * {kind:'io-composio-instagram', pulledAt, user: GET_USER_INFO, media:[GET_IG_USER_MEDIA items], insights:{mediaId: GET_IG_MEDIA_INSIGHTS}, userInsights: [GET_USER_INSIGHTS…]}
 */
function fromComposioInstagram(j, now = new Date()) {
  if (!j || typeof j !== 'object') throw new Error('الملف مو JSON صالح');
  const user = unwrap(j.user) || {};
  const mediaRaw = unwrap(j.media);
  const media = Array.isArray(mediaRaw) ? mediaRaw : rows(mediaRaw);
  if (!user.username && !media.length) throw new Error('ما لگيت user ولا media بالملف — هذا مو سحب Composio إنستقرام');
  const ins = j.insights || {};
  const posts = media.filter((m) => m && m.id).map((m) => normInstagramMedia(m, m.insights || ins[m.id]));
  const followers = +user.followers_count || 0;
  const date = String(j.pulledAt || now.toISOString()).slice(0, 10);
  const ui = [].concat(...(Array.isArray(j.userInsights) ? j.userInsights : [j.userInsights]).map(rows));
  let extra = audienceFrom(ui);
  // the profile header of web/instagram.html (public profile fields only)
  const prof = {};
  if (user.name) prof.name = String(user.name).slice(0, 100);
  if (user.biography) prof.bio = String(user.biography).slice(0, 300);
  if (user.follows_count != null && isFinite(+user.follows_count)) prof.follows = +user.follows_count;
  if (user.media_count != null && isFinite(+user.media_count)) prof.mediaCount = +user.media_count;
  if (/^https:\/\//i.test(user.profile_picture_url || '')) prof.picture = String(user.profile_picture_url).slice(0, 1000);
  if (Object.keys(prof).length) extra = Object.assign(extra || {}, { profile: prof });
  const snapshots = followers ? [{ date, followers, newFollowers: 0 }] : [];
  // daily follower_count gains → earlier snapshots, counted back from today's total
  if (extra && extra.followerGains && followers) {
    let run = followers;
    for (const g of [...extra.followerGains].sort((a, b) => b.date.localeCompare(a.date))) {
      if (g.date >= date) continue;
      snapshots.unshift({ date: g.date, followers: run, newFollowers: g.gained });
      run -= g.gained;
    }
  }
  return { handle: user.username ? '@' + user.username : '', followers, posts, snapshots, extra };
}

/** Imports a pull into stats + records «آخر سحب». Returns {posts, followers}. */
function importComposioInstagram(dir, st, json, now = new Date()) {
  const j = typeof json === 'string' ? JSON.parse(json) : json;
  const r = fromComposioInstagram(j, now);
  mergeAccount(st, 'instagram', r, { handle: r.handle, followers: r.followers });
  st.accounts.instagram.sync = { source: 'composio', at: now.toISOString() };
  if (dir) {
    const sy = readSync(dir);
    sy.mode = 'composio';
    sy.instagram = { at: now.toISOString(), posts: r.posts.length, followers: r.followers, handle: r.handle, withInsights: r.posts.filter((p) => p.reach !== null || p.src.reach).length };
    writeSync(dir, sy);
  }
  return { posts: r.posts.length, followers: r.followers, handle: r.handle };
}

// ------------------------------------------------------------ manual entry (page form)
/** short stable id part (same date + title → same post, so re-typing updates it). */
function hash(t) { let h = 2166136261; for (const c of String(t)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

/** {platform, handle, followers, date, posts:[{date,title,url,views,likes,comments,shares,saves,reach,avgWatchSec,durationSec,hold3}]} */
function applyManual(st, body, now = new Date()) {
  const b = body || {};
  const p = b.platform;
  if (!PLATFORMS.includes(p)) return { ok: false, errors: ['اختار المنصة'] };
  const followers = num(b.followers);
  const day = S.parseDate(now).slice(0, 10);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(b.date || '') ? b.date : day;
  const posts = (Array.isArray(b.posts) ? b.posts : []).slice(0, 200).map((x, i) => {
    const d = S.parseDate(x.date) || date + 'T00:00';
    const key = `${d}|${String(x.title || '').trim()}|${x.url || ''}`;
    const id = String(x.id || '').replace(/[^\w-]/g, '').slice(0, 80) || `m-${d.replace(/\D/g, '').slice(0, 12)}-${hash(x.title || x.url ? key : key + '|' + now.getTime() + '|' + i)}`;
    return post({ id, date: d, title: String(x.title || '').slice(0, 160), type: 'video', url: /^https?:\/\//.test(x.url || '') ? x.url : '', durationSec: x.durationSec, views: x.views, likes: x.likes, comments: x.comments, shares: x.shares, saves: x.saves, reach: x.reach, avgWatchSec: x.avgWatchSec, hold3: x.hold3 }, 'manual');
  }).filter((x) => x.views !== null || x.likes !== null);
  if (followers === null && !posts.length) return { ok: false, errors: ['اكتب رقم المتابعين أو منشور واحد بأرقامه على الأقل'] };
  const recs = { posts, snapshots: followers !== null ? [{ date, followers, newFollowers: 0 }] : [] };
  mergeAccount(st, p, recs, { handle: b.handle ? '@' + cleanHandle(b.handle) : '', followers: followers || 0 });
  const cur = st.accounts[p].sync;
  if (!cur || cur.source !== 'composio') st.accounts[p].sync = { source: 'manual', at: now.toISOString() };
  return { ok: true, posts: posts.length, followers };
}

// ------------------------------------------------------------ status / due
/** Is the daily Instagram pull due? Only when the creator chose Composio. */
function syncDue(dir, now = new Date()) {
  const sy = readSync(dir);
  if (sy.mode !== 'composio') return { due: false, mode: sy.mode || 'manual', last: sy.instagram ? sy.instagram.at : null };
  const last = sy.instagram && sy.instagram.at ? Date.parse(sy.instagram.at) : 0;
  return { due: !last || now.getTime() - last > DAY, mode: 'composio', last: sy.instagram ? sy.instagram.at : null };
}

function setMode(dir, mode) {
  if (!['manual', 'composio'].includes(mode)) return { ok: false, errors: ['الطريقة: manual أو composio'] };
  const sy = readSync(dir); sy.mode = mode; writeSync(dir, sy);
  return { ok: true, mode };
}

/** What the page and `connect-status` show — there are no secrets to hide: Composio keeps the login. */
function status(dir, now = new Date()) {
  const sy = readSync(dir);
  const st = load(statsFile(dir));
  const per = {};
  for (const p of PLATFORMS) {
    const a = st.accounts[p];
    const has = (a.posts || []).length || a.followers;
    per[p] = { source: a.sync ? a.sync.source : has ? 'manual' : '', at: a.sync ? a.sync.at : null, handle: a.handle || '', posts: (a.posts || []).length, followers: a.followers || 0 };
  }
  return { mode: sy.mode || 'manual', instagram: sy.instagram || null, due: syncDue(dir, now), platforms: per };
}

// ------------------------------------------------------------ import
function cmdImport(o) {
  const [platform, ...files] = o._.slice(1);
  if (!S.PLATFORM_IDS.includes(platform) || !files.length) throw new Error('الاستخدام: import <instagram|youtube|tiktok> <ملف...>');
  const out = o.out || 'stats.json';
  const st = load(out);
  for (const f of files) {
    const r = S.importText(st, platform, fs.readFileSync(f, 'utf8'), { handle: o.handle, followers: o.followers });
    console.log(`✓ ${path.basename(f)} → ${platform}: ${r.kind === 'followers' ? r.snapshots + ' يوم متابعين' : r.posts + ' منشور'}${r.unknown.length ? ` (أعمدة متجاهلة: ${r.unknown.join(', ')})` : ''}`);
  }
  save(out, st);
  console.log(`انحفظ: ${out}`);
}

// ------------------------------------------------------------ fetch (APIs)
async function getJson(url, init) {
  const r = await fetch(url, init);
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch (e) { throw new Error(`${r.status} ${t.slice(0, 200)}`); }
  if (!r.ok || j.error) throw new Error(`${r.status} ${JSON.stringify(j.error || j).slice(0, 300)}`);
  return j;
}
const today = () => new Date().toISOString().slice(0, 10);
const iso = (d) => S.parseDate(d);

async function fetchYouTube(env) {
  const key = env.YOUTUBE_API_KEY;
  if (!key || !(env.YOUTUBE_CHANNEL_ID || env.YOUTUBE_HANDLE)) return null;
  const base = 'https://www.googleapis.com/youtube/v3';
  const sel = env.YOUTUBE_CHANNEL_ID ? `id=${env.YOUTUBE_CHANNEL_ID}` : `forHandle=${encodeURIComponent(env.YOUTUBE_HANDLE)}`;
  const ch = (await getJson(`${base}/channels?part=snippet,statistics,contentDetails&${sel}&key=${key}`)).items[0];
  if (!ch) throw new Error('youtube: ما لگيت القناة');
  const uploads = ch.contentDetails.relatedPlaylists.uploads;
  const ids = [];
  let page = '';
  for (let i = 0; i < 4; i++) {
    const pl = await getJson(`${base}/playlistItems?part=contentDetails&maxResults=50&playlistId=${uploads}&key=${key}${page ? '&pageToken=' + page : ''}`);
    ids.push(...pl.items.map((x) => x.contentDetails.videoId));
    if (!pl.nextPageToken) break;
    page = pl.nextPageToken;
  }
  const posts = [];
  for (let i = 0; i < ids.length; i += 50) {
    const v = await getJson(`${base}/videos?part=snippet,statistics,contentDetails&id=${ids.slice(i, i + 50).join(',')}&key=${key}`);
    for (const it of v.items) {
      posts.push({
        id: it.id, date: iso(it.snippet.publishedAt), title: it.snippet.title, type: 'video', url: `https://youtu.be/${it.id}`,
        views: +it.statistics.viewCount || 0, reach: 0, likes: +it.statistics.likeCount || 0, comments: +it.statistics.commentCount || 0,
        shares: 0, saves: 0, watchSec: 0, durationSec: isoDuration(it.contentDetails.duration),
      });
    }
  }
  const followers = +ch.statistics.subscriberCount || 0;
  return { handle: ch.snippet.customUrl || ch.snippet.title, followers, posts, snapshots: [{ date: today(), followers, newFollowers: 0 }] };
}
function isoDuration(d) {
  const m = String(d || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0;
}

async function fetchInstagram(env) {
  const token = env.INSTAGRAM_ACCESS_TOKEN, uid = env.INSTAGRAM_USER_ID;
  if (!token || !uid) return null;
  const v = env.META_GRAPH_VERSION || 'v23.0';
  const host = env.INSTAGRAM_GRAPH_HOST || 'graph.facebook.com';
  const base = `https://${host}/${v}`;
  const me = await getJson(`${base}/${uid}?fields=username,followers_count&access_token=${token}`);
  const posts = [];
  let url = `${base}/${uid}/media?fields=id,caption,media_type,media_product_type,timestamp,permalink,like_count,comments_count&limit=50&access_token=${token}`;
  for (let i = 0; i < 4 && url; i++) {
    const pg = await getJson(url);
    for (const m of pg.data) {
      const p = { id: m.id, date: iso(m.timestamp), title: (m.caption || '').split('\n')[0].slice(0, 140), type: m.media_product_type === 'REELS' || m.media_type === 'VIDEO' ? 'video' : m.media_type === 'CAROUSEL_ALBUM' ? 'carousel' : 'image', url: m.permalink, views: 0, reach: 0, likes: m.like_count || 0, comments: m.comments_count || 0, shares: 0, saves: 0, watchSec: 0, durationSec: 0 };
      try {
        const ins = await getJson(`${base}/${m.id}/insights?metric=views,reach,saved,shares&access_token=${token}`);
        for (const x of ins.data) {
          const val = x.values ? x.values[0].value : x.total_value && x.total_value.value;
          if (x.name === 'views') p.views = val || 0;
          if (x.name === 'reach') p.reach = val || 0;
          if (x.name === 'saved') p.saves = val || 0;
          if (x.name === 'shares') p.shares = val || 0;
        }
      } catch (e) { /* some media types have no insights */ }
      posts.push(p);
    }
    url = pg.paging && pg.paging.next;
  }
  return { handle: '@' + me.username, followers: me.followers_count || 0, posts, snapshots: [{ date: today(), followers: me.followers_count || 0, newFollowers: 0 }] };
}

async function fetchTikTok(env) {
  const token = env.TIKTOK_ACCESS_TOKEN;
  if (!token) return null;
  const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const u = (await getJson('https://open.tiktokapis.com/v2/user/info/?fields=username,display_name,follower_count', { headers: H })).data.user;
  const fields = 'id,title,video_description,create_time,share_url,view_count,like_count,comment_count,share_count,duration';
  const posts = [];
  let cursor;
  for (let i = 0; i < 6; i++) {
    const body = JSON.stringify(cursor ? { max_count: 20, cursor } : { max_count: 20 });
    const j = (await getJson(`https://open.tiktokapis.com/v2/video/list/?fields=${fields}`, { method: 'POST', headers: H, body })).data;
    for (const x of j.videos || []) {
      posts.push({ id: x.id, date: iso(new Date(x.create_time * 1000)), title: (x.title || x.video_description || '').slice(0, 140), type: 'video', url: x.share_url, views: x.view_count || 0, reach: 0, likes: x.like_count || 0, comments: x.comment_count || 0, shares: x.share_count || 0, saves: 0, watchSec: 0, durationSec: x.duration || 0 });
    }
    if (!j.has_more) break;
    cursor = j.cursor;
  }
  return { handle: '@' + (u.username || u.display_name || ''), followers: u.follower_count || 0, posts, snapshots: [{ date: today(), followers: u.follower_count || 0, newFollowers: 0 }] };
}

async function cmdFetch(o) {
  const out = o.out || 'stats.json';
  const st = load(out);
  const only = o.only ? String(o.only).split(',') : S.PLATFORM_IDS;
  const fns = { instagram: fetchInstagram, youtube: fetchYouTube, tiktok: fetchTikTok };
  const need = { instagram: 'INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_USER_ID', youtube: 'YOUTUBE_API_KEY + YOUTUBE_CHANNEL_ID (أو YOUTUBE_HANDLE)', tiktok: 'TIKTOK_ACCESS_TOKEN' };
  let ok = 0;
  for (const id of only) {
    try {
      const r = await fns[id](process.env);
      if (!r) { console.log(`– ${id}: ما بيه مفاتيح (${need[id]}) — استخدم import بملف التصدير بدلها`); continue; }
      S.merge(st, id, r, { handle: r.handle, followers: r.followers });
      console.log(`✓ ${id}: ${r.posts.length} منشور، ${r.followers} متابع`);
      ok++;
    } catch (e) { console.log(`✗ ${id}: ${e.message}`); }
  }
  save(out, st);
  console.log(`انحفظ: ${out} (${ok}/${only.length} منصة). شغّله كل يوم حتى يتجمع سجل المتابعين.`);
}

// ------------------------------------------------------------ summary
function cmdSummary(o) {
  const st = load(o.in || (o.dir ? statsFile(projectDir(o)) : 'stats.json'));
  let range = null;
  if (o.from || o.to) range = { from: o.from, to: o.to };
  else if (o.days) {
    let last = '';
    for (const id of S.PLATFORM_IDS) for (const p of st.accounts[id].posts) if (p.date > last) last = p.date;
    const to = (last || new Date().toISOString()).slice(0, 10);
    const f = new Date(to + 'T00:00:00'); f.setDate(f.getDate() - +o.days + 1);
    range = { from: f.toISOString().slice(0, 10), to };
  }
  const c = S.compare(st, range);
  if (o.json) { console.log(JSON.stringify({ ...c, insights: S.insights(c) }, null, 2)); return; }
  const pct = (x) => (x * 100).toFixed(1) + '%';
  console.log(`الفترة: ${range ? `${range.from} → ${range.to}` : 'الكل'}`);
  console.log(['المنصة', 'متابعين', 'نمو', 'منشورات', 'مشاهدات', 'متوسط', 'تفاعل'].join('\t'));
  for (const id of S.PLATFORM_IDS) {
    const k = c.per[id];
    console.log([NAMES[id], k.followers, k.followerGrowth, k.posts, k.views, Math.round(k.avgViews), pct(k.engagementRate)].join('\t'));
  }
  console.log(`المجموع: ${c.totals.followers} متابع · ${c.totals.views} مشاهدة · تفاعل ${pct(c.totals.engagementRate)} · توازن ${c.balance.score}/100`);
  for (const t of S.insights(c)) console.log('• ' + t);
}

function cmdEval(o) {
  const dir = projectDir(o);
  const E = require('./content-eval.js');
  const st = load(o.in || statsFile(dir));
  const r = E.evaluateProject(dir, st, { platform: o.platform && o.platform !== true ? o.platform : null });
  if (o.json) { console.log(JSON.stringify(r, null, 2)); return; }
  if (!r.posts.length) { console.log('ما بيه منشورات بـ stats.json بعد.'); return; }
  console.log(['التقييم', 'الدرجة', 'الهوك', 'المنصة', 'المنشور', 'السبب'].join('\t'));
  for (const p of r.posts.slice(0, +o.top || 20)) console.log([p.gradeAr, p.score, p.hookScore === null ? '—' : p.hookScore + (p.hookEstimated ? ' (تقديري)' : ''), NAMES[p.platform], p.title.slice(0, 50), p.topReason ? p.topReason.text : ''].join('\t'));
  console.log('شنو يشتغل عندك:');
  for (const t of r.patterns.lines) console.log('• ' + t);
}

function cmdImportFrom(o) {
  const dir = projectDir(o);
  const out = o.out || statsFile(dir);
  if (o.from !== 'composio-instagram') throw new Error('--from المدعوم حالياً: composio-instagram');
  const files = o._.slice(1);
  if (!files.length) throw new Error('الاستخدام: import --from composio-instagram <pull.json> [--dir <project>]');
  const st = load(out);
  for (const f of files) {
    const r = importComposioInstagram(dir, st, fs.readFileSync(f, 'utf8'));
    console.log(`✓ إنستقرام (Composio): ${r.handle} · ${r.followers} متابع · ${r.posts} منشور`);
  }
  save(out, st);
  console.log(`انحفظ: ${out}`);
}

function cmdStatus(o) {
  const s = status(projectDir(o));
  if (o.json) { console.log(JSON.stringify(s, null, 2)); return; }
  const SRC = { composio: 'Composio (رسمي)', manual: 'يدوي', '': 'ما بيه بيانات' };
  console.log(`الطريقة: ${s.mode === 'composio' ? 'إنستقرام عبر Claude + Composio' : 'يدوي'}`);
  for (const p of PLATFORMS) { const x = s.platforms[p]; console.log(`${NAMES[p]}: ${SRC[x.source] || x.source}${x.handle ? ' ' + x.handle : ''}${x.at ? ' · آخر تحديث ' + x.at.slice(0, 16).replace('T', ' ') : ''} · ${x.posts} منشور`); }
  if (s.mode === 'composio') console.log(s.due.due ? '⏰ سحب إنستقرام مستحق (أكثر من ٢٤ ساعة) — سكل io-dashboard، قسم Composio' : `آخر سحب: ${s.due.last}`);
}

function cmdSync(o) {
  const dir = projectDir(o);
  const d = syncDue(dir);
  if (d.mode !== 'composio') { console.log('الطريقة يدوية — ما فيه سحب تلقائي. اختار «إنستقرام عبر Claude + Composio» بصفحة الإحصائيات حتى يصير يومي.'); return; }
  if (o.queue) {
    const r = require('./queue.js').enqueue(dir, { type: 'sync-stats', platform: 'instagram', source: 'cli' });
    console.log(r.ok ? `📨 انضاف طلب سحب إنستقرام للطابور (${r.item.id})` : 'ما انضاف: ' + r.errors.join('، '));
    return;
  }
  console.log('سحب إنستقرام يسوّيه Claude عبر Composio (ما فيه مفاتيح بالبلقن): سكل io-dashboard ← «إنستقرام عبر Composio»، وبالنهاية:\n  node engine/stats.js import --from composio-instagram <pull.json>');
  console.log(d.due ? '⏰ مستحق الآن.' : `آخر سحب: ${d.last}`);
}

async function main() {
  const o = args(process.argv.slice(2));
  const cmd = o._[0];
  if (cmd === 'import' && o.from) return cmdImportFrom(o);
  if (cmd === 'import') return cmdImport(o);
  if (cmd === 'fetch') return cmdFetch(o);
  if (cmd === 'summary') return cmdSummary(o);
  if (cmd === 'eval') return cmdEval(o);
  if (cmd === 'connect-status') return cmdStatus(o);
  if (cmd === 'sync') return cmdSync(o);
  if (cmd === 'due') { const d = syncDue(projectDir(o)); console.log(JSON.stringify(d)); process.exitCode = d.due ? 0 : 1; return; }
  console.log('الأوامر: import | fetch | summary | eval | connect-status | sync | due  (اقرأ أول الملف للتفاصيل)');
  process.exitCode = cmd ? 1 : 0;
}

if (require.main === module) main().catch((e) => { console.error('خطأ: ' + e.message); process.exit(1); });
module.exports = {
  isoDuration, load, save, statsFile, syncFile, readSync, writeSync, post, mergeAccount, insightValue, unwrap,
  normInstagramMedia, audienceFrom, fromComposioInstagram, importComposioInstagram, applyManual, syncDue, setMode, status, cleanHandle,
};
