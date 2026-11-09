/*
 * I/O Studio — first-run onboarding (used by the welcome window).
 * Turns what the creator filled in the browser into the three identity files
 * in their project: .io/creator-profile.md, theme.json, project.json.
 * Nothing here is personal to anyone: every value comes from the payload.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { dataDir, DATA_DIR } = require('./data-dir.js');
const { init } = require('./config.js');
const I = require('./identity.js');
const AT = require('./account-type.js');

const PLATFORMS = ['instagram', 'youtube', 'tiktok'];
/** Platforms of the accounts the creator follows in their field (feed the daily trend board). */
const SOURCE_PLATFORMS = ['instagram', 'youtube', 'tiktok', 'x', 'site'];

function clean(v, max) { return String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').trim().slice(0, max || 200); }

/** "@name" with no spaces; empty stays empty. */
function handle(v) {
  const h = clean(v, 60).replace(/\s+/g, '').replace(/^@+/, '');
  return h ? '@' + h : '';
}

/** "https://www.Site.com/path/" → "site.com/path"; empty stays empty. */
function site(v) {
  return clean(v, 200).replace(/\s+/g, '').replace(/^[a-z]+:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '').replace(/^([^/]+)/, (h) => h.toLowerCase());
}

/** A followed account: a profile link or "@name" → "@name"; for platform "site" a domain. */
function sourceAccount(a) {
  const platform = SOURCE_PLATFORMS.includes(a && a.platform) ? a.platform : '';
  if (!platform) return null;
  if (platform === 'site') { const h = site(a.handle); return h ? { platform, handle: h } : null; }
  let raw = clean(a.handle, 200).replace(/\s+/g, '');
  if (/^(https?:\/\/)?(www\.|m\.)?[a-z0-9.-]+\.[a-z]{2,}\//i.test(raw)) {
    const parts = raw.replace(/^[a-z]+:\/\//i, '').split(/[/?#]/).filter(Boolean);
    raw = parts.slice(1).find((x) => !/^(c|user|channel|in)$/i.test(x)) || '';
  }
  const h = handle(raw);
  return h ? { platform, handle: h } : null;
}

/** payload.sources → { accounts:[{platform,handle}], sites:[], keywords:[] }, deduped. */
function normalizeSources(src) {
  const s = src || {};
  const accounts = [];
  const seen = new Set();
  for (const a of Array.isArray(s.accounts) ? s.accounts.slice(0, 60) : []) {
    const n = sourceAccount(a);
    const k = n && n.platform + ':' + n.handle.toLowerCase();
    if (n && !seen.has(k)) { seen.add(k); accounts.push(n); }
  }
  const asList = (v) => (Array.isArray(v) ? v : String(v || '').split(/[\n,،]+/));
  const sites = [...new Set(asList(s.sites).slice(0, 60).map(site).filter(Boolean))];
  const keywords = [...new Set(asList(s.keywords).slice(0, 60).map((k) => clean(k, 60)).filter(Boolean))];
  return { accounts, sites, keywords };
}

/** { enabled, hour } for the daily trend board; hour 0–23 (default 9). Anything else → null. */
function dailyTrends(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'boolean') return { enabled: v, hour: 9 };
  if (typeof v !== 'object') return null;
  const h = Math.floor(Number(v.hour));
  return { enabled: v.enabled === true || v.enabled === 'true' || v.enabled === 1, hour: Number.isFinite(h) && h >= 0 && h <= 23 ? h : 9 };
}

/** Validates the payload and returns { data, errors } with normalized values. */
function normalize(payload) {
  const p = payload || {};
  const errors = [];
  const data = {
    dialect: clean(p.dialect, 40),
    name: clean(p.name, 80),
    brand: clean(p.brand, 80),
    handles: {},
    niche: clean(p.niche, 120),
    audience: clean(p.audience, 200),
    tone: clean(p.tone, 60),
    lessonCharacter: ['male', 'female'].includes(p.lessonCharacter) ? p.lessonCharacter : '',
    accountType: clean(p.accountType, 40),
    contentFormat: clean(p.contentFormat, 20),
    sources: normalizeSources(p.sources),
    dailyTrends: dailyTrends(p.dailyTrends),
  };
  if (data.accountType && !AT.getType(data.accountType)) errors.push('نوع الحساب مو معروف');
  if (data.contentFormat && !AT.FORMAT_IDS.includes(data.contentFormat)) errors.push('شكل المحتوى لازم يكون فيديو عادي أو بودكاست');
  for (const id of PLATFORMS) data.handles[id] = handle((p.handles || {})[id]);
  if (!data.dialect) errors.push('اختار لهجة');
  if (!data.name) errors.push('اكتب اسمك');
  if (!PLATFORMS.some((id) => data.handles[id])) errors.push('اكتب حساب وحد على الأقل');
  return { data, errors };
}

/** The creator profile markdown, same headings as templates/creator-profile.md. */
function profileMarkdown(d, dialectName) {
  const h = d.handles;
  return `# ملف صانع المحتوى

> انكتب من نافذة الترحيب. عدّله براحتك — كل الأدوات تقراه قبل ما تشتغل.

## مَن أنا
- الاسم: ${d.name}
- البراند: ${d.brand || d.name}
- الحسابات: إنستقرام ${h.instagram || '—'} · يوتيوب ${h.youtube || '—'} · تيك توك ${h.tiktok || '—'}
- المجال (النيش): ${d.niche}
- جملة تعريف (سطر واحد):

## الجمهور
- مَن هم: ${d.audience}
- أعمارهم وبلدانهم:
- شنو يحتاجون مني:

## الصوت والأسلوب
- اللهجة: ${dialectName || d.dialect}
- النبرة: ${d.tone}
- كلمات أحبها:
- كلمات ما أستخدمها:

## المحتوى
- الأنواع:
- الأعمدة (٣–٥ مواضيع ثابتة):
- دعوة الفعل المعتادة (CTA):

## قيود (حواجز ما تنكسر)
-

## المنصات — بالتساوي
| المنصة | الحساب | شنو ينزل عليها | كم مرة بالأسبوع |
|---|---|---|---|
| إنستقرام | ${h.instagram} | ريلز + كاروسيل | |
| يوتيوب | ${h.youtube} | شورتس + فيديو طويل | |
| تيك توك | ${h.tiktok} | فيديو + وضع الصور | |
`;
}

function readJson(f, d) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } }

/**
 * Write everything. identity: { mode: 'create', mood, accent, option (1-3) }
 * or { mode: 'upload', files: [{ name, data (base64) }] } or { mode: 'keep' }.
 */
function apply(dir, payload, dialects) {
  const { data, errors } = normalize(payload);
  if (errors.length) return { ok: false, errors };
  init(dir);
  const sdir = dataDir(dir);
  const dialect = (dialects || []).find((x) => x.id === data.dialect || x.name === data.dialect);

  // project.json
  const pp = path.join(sdir, 'project.json');
  const proj = readJson(pp, {});
  Object.assign(proj, { name: data.brand || data.name, owner: data.name, dialect: dialect ? dialect.id : data.dialect, handles: data.handles });
  if (!Array.isArray(proj.platforms) || !proj.platforms.length) proj.platforms = PLATFORMS.slice();
  if (data.lessonCharacter) proj.lessonCharacter = data.lessonCharacter;
  if (data.accountType) proj.accountType = data.accountType;
  if (data.contentFormat) proj.contentFormat = data.contentFormat;
  if (data.dailyTrends) proj.dailyTrends = data.dailyTrends;
  fs.writeFileSync(pp, JSON.stringify(proj, null, 2));
  const type = AT.getType(proj.accountType);

  // sources.json — the accounts and sites the creator follows (first source of the trend board) + the type's sites
  const sp = path.join(sdir, 'sources.json');
  const src = data.sources;
  const newSites = [...src.sites, ...(data.accountType && type ? type.trendSites || [] : [])];
  let wroteSources = false;
  if (src.accounts.length || newSites.length || src.keywords.length) {
    const old = readJson(sp, {});
    const merged = normalizeSources({
      accounts: [...(Array.isArray(old.accounts) ? old.accounts : []), ...src.accounts],
      sites: [...(Array.isArray(old.sites) ? old.sites : []), ...newSites],
      keywords: [...(Array.isArray(old.keywords) ? old.keywords : []), ...src.keywords],
    });
    fs.writeFileSync(sp, JSON.stringify(Object.assign({}, old, merged), null, 2));
    wroteSources = true;
  }

  // creator-profile.md (only replaces an unfilled template)
  const prof = path.join(sdir, 'creator-profile.md');
  const old = fs.existsSync(prof) ? fs.readFileSync(prof, 'utf8') : '';
  if (!old || /^- الاسم:[ \t]*$/m.test(old) || payload.overwriteProfile) fs.writeFileSync(prof, profileMarkdown(data, dialect && dialect.name));

  // theme.json
  const id = payload.identity || { mode: 'keep' };
  const tp = path.join(sdir, 'theme.json');
  let theme = readJson(tp, {});
  if (id.mode === 'create') {
    const pre = !id.mood && type && type.identity ? type.identity : {};
    const opts = I.createOptions(id.mood || pre.mood || 'warm', id.accent || pre.accent, !!id.dark);
    const pick = opts[Math.max(0, Math.min(opts.length - 1, (+id.option || 1) - 1))];
    theme = Object.assign({}, theme, { colors: pick.colors, fonts: pick.fonts });
  } else if (id.mode === 'upload' && Array.isArray(id.files) && id.files.length) {
    const up = path.join(sdir, 'uploads');
    fs.mkdirSync(up, { recursive: true });
    const saved = id.files.slice(0, 8).map((f, i) => {
      const safe = (clean(f.name, 80).replace(/[^\w.\-؀-ۿ]+/g, '_') || `file-${i}.png`);
      const out = path.join(up, safe);
      fs.writeFileSync(out, Buffer.from(String(f.data || '').replace(/^data:[^,]*,/, ''), 'base64'));
      return out;
    });
    const r = I.cmdUpload({ _: ['upload', ...saved] }, dir);
    theme = r.theme;
  }
  theme.name = data.brand || data.name;
  theme.handle = data.handles.instagram || data.handles.tiktok || data.handles.youtube || '';
  if (!theme.fonts || !theme.fonts.heading) theme.fonts = { heading: 'Cairo', body: 'Cairo' };
  fs.writeFileSync(tp, JSON.stringify(theme, null, 2));
  const files = ['creator-profile.md', 'theme.json', 'project.json'].concat(wroteSources ? ['sources.json'] : []);
  return { ok: true, files: files.map((f) => path.join(DATA_DIR, f)), theme, project: proj };
}

/**
 * Settings the app may change later (الإعدادات/هويتي) — only whitelisted keys
 * are merged into .io/project.json. Returns { ok, project, errors }.
 */
function setProject(dir, patch) {
  const p = patch && typeof patch === 'object' ? patch : {};
  const errors = [];
  const next = {};
  if ('dailyTrends' in p) { const d = dailyTrends(p.dailyTrends); if (d) next.dailyTrends = d; else errors.push('إعداد الترند اليومي غلط'); }
  if (!Object.keys(next).length && !errors.length) errors.push('ما بيه شي ينحفظ');
  if (errors.length) return { ok: false, errors };
  const sdir = dataDir(dir);
  fs.mkdirSync(sdir, { recursive: true });
  const pp = path.join(sdir, 'project.json');
  const proj = Object.assign(readJson(pp, {}) || {}, next);
  const tmp = pp + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(proj, null, 2));
  fs.renameSync(tmp, pp);
  return { ok: true, project: proj, errors: [] };
}

/** What the welcome page needs to render. */
function state(dir, dialects) {
  const sdir = dataDir(dir);
  const prof = path.join(sdir, 'creator-profile.md');
  const txt = fs.existsSync(prof) ? fs.readFileSync(prof, 'utf8') : '';
  return {
    dir,
    done: !!txt && !/^- الاسم:[ \t]*$/m.test(txt),
    project: readJson(path.join(sdir, 'project.json'), null),
    theme: readJson(path.join(sdir, 'theme.json'), null),
    dialects: (dialects || []).map((d) => ({ id: d.id, name: d.name, region: d.region, greeting: d.greeting })),
    moods: Object.entries(I.MOODS).map(([id, m]) => ({ id, ar: m.ar })),
    fonts: Object.keys(I.FONTS),
    accountTypes: AT.list().map((t) => { const full = AT.getType(t.id); return Object.assign(t, { identity: full.identity, trendSites: full.trendSites }); }),
    formats: AT.formats(),
    sources: readJson(path.join(sdir, 'sources.json'), null),
    sourcePlatforms: SOURCE_PLATFORMS.slice(),
  };
}

module.exports = { normalize, normalizeSources, dailyTrends, setProject, profileMarkdown, apply, state, handle, site, PLATFORMS, SOURCE_PLATFORMS };

// Chat onboarding writes the same files as the welcome window:
//   node engine/onboard.js apply <payload.json> [--dir <project>]
// payload = the same JSON the welcome page posts (dialect, name, brand, niche, handles,
// accountType, contentFormat, sources, dailyTrends, identity).
if (require.main === module) {
  const argv = process.argv.slice(2);
  const di = argv.indexOf('--dir');
  const dir = path.resolve(di >= 0 ? argv[di + 1] : process.env.CLAUDE_PROJECT_DIR || process.cwd());
  if (argv[0] !== 'apply' || !argv[1] || argv[1] === '--dir') {
    console.error('الاستخدام: node engine/onboard.js apply <payload.json> [--dir <project>]');
    process.exit(2);
  }
  let payload;
  try { payload = JSON.parse(fs.readFileSync(argv[1], 'utf8')); } catch (e) { console.error('ما گدرت أقرا الملف: ' + e.message); process.exit(1); }
  let dialects = [];
  try { dialects = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'library', 'dialects', 'dialects.json'), 'utf8')).dialects; } catch (e) { /* none */ }
  const r = apply(dir, Object.assign({ identity: { mode: 'keep' } }, payload), dialects);
  if (!r.ok) { console.error('❌ ' + r.errors.join(' · ')); process.exit(1); }
  console.log('✓ انحفظت: ' + r.files.join(' · ') + (r.project.dailyTrends ? ` · الترند اليومي: ${r.project.dailyTrends.enabled ? 'شغّال الساعة ' + r.project.dailyTrends.hour : 'مطفي'}` : ''));
}
