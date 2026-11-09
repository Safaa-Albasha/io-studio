#!/usr/bin/env node
/*
 * I/O Studio — publish pack check + render (فحص حزمة النشر للمنصات الثلاث).
 *
 * Adapted from Reel Studio (MIT, © 2026 Mohamed Abdou): scripts/lib/publish-pack.mjs (validatePublishCopy, renderPublishPack).
 * Changes: Instagram, YouTube and TikTok equally (YouTube = title + description, any length, Shorts or long);
 * identity from .io/project.json (platforms, handles, hashtags count, ending.ctaDefault, writingStyle);
 * Arabic text QA (engine/arabic-qa.js) on every line; ad disclosure; the output matches skills/io-publish-kit.
 *
 *   node engine/publish-pack.js check  <copy.json> [--dir .]
 *   node engine/publish-pack.js render <copy.json> [--dir .] [--video ad-master-cover.mp4] [--out output/publish/<slug>.md]
 *   … --keyword "دليل" --dm "https://…" [--reward "الدليل"]   (أو بالملف: "keyword", "dm", "reward")
 *       كلمة التعليق ← رسالة خاصة: يضيف لكل كابشن «اكتب "الكلمة" بالتعليقات ويوصلك … بالخاص» (يوتيوب: «… بالتعليق المثبّت» —
 *       ما فيه خاص)، يصير هو cta، ويكتب <slug>.dm-reply.txt جنب الحزمة: نص الرد التلقائي + ملاحظات كل منصة. كرت النهاية: FX.commentKeyword (حركة 242).
 *
 * copy.json:
 *   {"title":"…","slug":"hook-rules","cta":"هوك","ad":false,
 *    "instagram":{"caption":"…","hashtags":["#…"],"coverText":"…","altText":"…"},
 *    "youtube":{"title":"…","description":"…","hashtags":["#…"],"thumbText":"…"},
 *    "tiktok":{"caption":"…","hashtags":["#…"],"onScreenText":"…"},
 *    "notes":["…"],"credits":["…"]}
 * Nothing is posted. Publishing is skills/io-blotato-publish, after an explicit yes.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { dataFile } = require('./data-dir.js');
const QA = require('./arabic-qa.js');

const PLATFORMS = ['instagram', 'youtube', 'tiktok'];
const LABEL = { instagram: 'إنستقرام', youtube: 'يوتيوب', tiktok: 'تيك توك' };
const CAPTION_FIELD = { instagram: 'caption', youtube: 'description', tiktok: 'caption' };
const CAPTION_MAX = { instagram: 2200, youtube: 5000, tiktok: 2200 };
const YT_TITLE_MAX = 100, YT_TITLE_SOFT = 60, IG_FIRST_LINE = 125, SHORT_STYLE_MAX = 450;
const HASHTAG = /^#[\p{L}\p{N}_]{2,40}$/u;
const MENTION = /@[A-Za-z0-9_.]{1,30}/g;
const INLINE_HASHTAG = /(^|\s)#[\p{L}\p{N}_]/u;
const OPTIONAL = { instagram: ['coverText', 'altText', 'pinnedComment'], youtube: ['thumbText', 'pinnedComment', 'chapters'], tiktok: ['onScreenText', 'pinnedComment'] };

const len = (s) => Array.from(String(s || '')).length;
const IS_URL = /^https?:\/\/\S+$/i;

/** Comment keyword → DM: options from flags or the copy itself ({keyword, dm, reward}); null when there is no keyword. */
function keywordOptions(copy, o = {}) {
  const keyword = String(o.keyword || (copy && copy.keyword) || '').trim();
  if (!keyword) return null;
  const dm = String(o.dm || (copy && copy.dm) || '').trim();
  const reward = String(o.reward || (copy && copy.reward) || (IS_URL.test(dm) ? 'الرابط' : 'التفاصيل')).trim();
  return { keyword, dm, reward };
}

/** The CTA line for one platform. YouTube has no DMs, so it points at the pinned comment. */
function keywordCta(platform, k) {
  return platform === 'youtube'
    ? `اكتب «${k.keyword}» بالتعليقات و${k.reward} بالتعليق المثبّت`
    : `اكتب «${k.keyword}» بالتعليقات ويوصلك ${k.reward} بالخاص`;
}

/** The auto-reply message itself (what the DM says). */
function dmMessage(k) {
  if (!k.dm) return `هلا! هذا ${k.reward} اللي طلبته — (حط الرابط أو الملف هني)`;
  return IS_URL.test(k.dm) ? `هلا! هذا ${k.reward} اللي طلبته: ${k.dm}` : k.dm;
}

/** Returns a new copy: cta = keyword, each platform caption ends with its CTA line, YouTube gets a pinned comment. */
function applyKeyword(copy, opts) {
  const k = keywordOptions(copy, opts);
  if (!k || !copy || typeof copy !== 'object') return copy;
  const out = JSON.parse(JSON.stringify(copy));
  out.keyword = k.keyword; out.cta = k.keyword;
  if (k.dm) out.dm = k.dm;
  if (opts && opts.reward) out.reward = k.reward;
  for (const p of PLATFORMS) {
    const e = out[p];
    if (!e || typeof e !== 'object') continue;
    const f = CAPTION_FIELD[p], line = keywordCta(p, k), cap = typeof e[f] === 'string' ? e[f].trimEnd() : '';
    if (!cap.includes(line)) e[f] = cap ? `${cap}\n\n${line}` : line;
    if (p === 'youtube' && !e.pinnedComment) e.pinnedComment = k.dm ? (IS_URL.test(k.dm) ? `${k.reward}: ${k.dm}` : k.dm) : `${k.reward} هني (حط الرابط)`;
  }
  return out;
}

/** dm-reply.txt: the auto-reply text and how each platform handles it. */
function dmReplyText(copy, opts, profile = {}) {
  const k = keywordOptions(copy, opts);
  if (!k) return '';
  const platforms = (profile.platforms || PLATFORMS).filter((p) => !copy || copy[p]);
  const out = [
    `كلمة التعليق: «${k.keyword}»`, '',
    'الرد التلقائي بالخاص (انسخه كما هو):', '-----', dmMessage(k), '-----', '',
    `رد عام على التعليق (يبين للكل): «وصلك بالخاص 👌» — والرد يكون على كل تعليق فيه «${k.keyword}» حتى لو مكتوبة بشكل ثاني (مسافة، تشكيل، همزة).`, '',
    'ملاحظات كل منصة (ما انتشر ولا انربط شي — هذي خطوات تسويها بنفسك):',
  ];
  const notes = {
    instagram: `- إنستقرام: الحساب لازم احترافي (صانع محتوى أو أعمال). اربط الكلمة «${k.keyword}» بالرسالة فوق من أدوات الردود التلقائية بالتطبيق أو أداة أتمتة رسائل معتمدة. الرسالة توصل «طلبات الرسائل» للي ما يتابعك — اطلب منه يتابعك عشان يشوفها. لا ترسل أكثر من رسالة وحدة لنفس الشخص.`,
    tiktok: `- تيك توك: الرسائل الخاصة محدودة (عمر الحساب وإعدادات الخصوصية عند الطرفين)، والرد التلقائي على كلمة بالتعليقات مو متاح لكل الحسابات. إذا ما قدرت ترسل: رد على تعليقه بفيديو أو تعليق فيه «${k.reward}»، وحط الرابط بالبايو، وقول بالكابشن «الرابط بالبايو».`,
    youtube: `- يوتيوب: ما فيه رسائل خاصة. ثبّت تعليق فيه ${k.reward} (pinnedComment جاهز بالحزمة)، وحط نفس الرابط بأول سطرين بالوصف، ورد على التعليقات اللي فيها «${k.keyword}» بـ«${k.reward} بالتعليق المثبّت». الشورتس: الروابط بالوصف ما تنضغط دايماً — المثبّت أضمن.`,
  };
  for (const p of platforms) if (notes[p]) out.push(notes[p]);
  out.push('', 'كرت النهاية بالفيديو: الحركة 242 commentKeyword — FX.commentKeyword(ctx, t, { keyword: «' + k.keyword + '», reward: «' + k.reward + '» }) (ويوتيوب: platform: \'youtube\').');
  return out.join('\n') + '\n';
}

function readJson(f, d) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } }

/** The bits of .io/ the copy is checked against. */
function profileFrom(dir) {
  const p = readJson(dataFile(dir, 'project.json'), {}) || {};
  const t = readJson(dataFile(dir, 'theme.json'), {}) || {};
  const handles = Object.values(p.handles || {}).concat(t.handle ? [t.handle] : []).filter(Boolean);
  return {
    platforms: Array.isArray(p.platforms) && p.platforms.length ? p.platforms.filter((x) => PLATFORMS.includes(x)) : PLATFORMS,
    handles: [...new Set(handles.map((h) => h.toLowerCase()))],
    hashtags: Number.isInteger(p.hashtags) && p.hashtags > 0 ? p.hashtags : 3,
    cta: (p.ending && p.ending.ctaDefault) || null,
    writingStyle: p.writingStyle && p.writingStyle !== 'auto' ? p.writingStyle : null,
    numerals: t.numerals || 'western',
    font: (t.fonts && t.fonts.heading) || null,
  };
}

/** Returns {ok, errors[], warnings[]} — errors stop the pack, warnings are shown to the creator. */
function validateCopy(copy, profile) {
  const errors = [], warnings = [];
  if (!copy || typeof copy !== 'object' || Array.isArray(copy)) return { ok: false, errors: ['الملف لازم JSON object'], warnings };
  if (typeof copy.title !== 'string' || !copy.title.trim() || len(copy.title) > 80) errors.push('title: عنوان داخلي قصير (≤ 80 حرف)');
  const allowed = new Set(['title', 'slug', 'cta', 'ad', 'notes', 'credits', 'video', 'keyword', 'dm', 'reward', ...PLATFORMS]);
  for (const k of Object.keys(copy)) if (!allowed.has(k)) errors.push(`حقل مو معروف: ${k}`);
  for (const k of PLATFORMS) if (copy[k] && !profile.platforms.includes(k)) warnings.push(`${LABEL[k]} مو ضمن منصات الهوية (.io/project.json) — تأكد إنه يريدها`);
  const cta = copy.cta === undefined ? profile.cta : copy.cta;
  const lines = [];
  for (const k of profile.platforms) {
    const e = copy[k];
    const field = CAPTION_FIELD[k];
    if (!e || typeof e !== 'object') { errors.push(`${LABEL[k]}: ناقص — المنصات الثلاث بالتساوي (${field} + hashtags${k === 'youtube' ? ' + title' : ''})`); continue; }
    const known = new Set([field, 'hashtags', ...(k === 'youtube' ? ['title'] : []), ...OPTIONAL[k]]);
    for (const f of Object.keys(e)) if (!known.has(f)) errors.push(`${k}.${f}: حقل مو معروف`);
    const cap = typeof e[field] === 'string' ? e[field].trim() : '';
    if (!cap) { errors.push(`${k}.${field}: فاضي`); continue; }
    if (len(cap) > CAPTION_MAX[k]) errors.push(`${k}.${field}: ${len(cap)} حرف — الحد ${CAPTION_MAX[k]}`);
    if (INLINE_HASHTAG.test(cap)) errors.push(`${k}.${field}: الهاشتاقات بحقل hashtags مو داخل النص`);
    if (profile.writingStyle === 'short' && len(cap) > SHORT_STYLE_MAX) errors.push(`${k}.${field}: أطول من أسلوب «مختصر» المحفوظ (${SHORT_STYLE_MAX} حرف)`);
    if (cta && !cap.includes(cta)) errors.push(`${k}.${field}: لازم فيه كلمة التعليق «${cta}» (نفس كرت النهاية)`);
    if (copy.ad && !/إعلان|اعلان|#ad\b|برعاية|رعاية|شراكة/i.test(cap.split('\n')[0])) errors.push(`${k}.${field}: إعلان — الإفصاح بأول سطر («إعلان» أو «برعاية»)`);
    if (k === 'instagram' && len(cap.split('\n')[0]) > IG_FIRST_LINE) warnings.push(`instagram: أول سطر ${len(cap.split('\n')[0])} حرف — فوق ${IG_FIRST_LINE} ينقص قبل «المزيد»`);
    if (k === 'youtube') {
      const t = typeof e.title === 'string' ? e.title.trim() : '';
      if (!t) errors.push('youtube.title: فاضي');
      else {
        if (len(t) > YT_TITLE_MAX) errors.push(`youtube.title: ${len(t)} حرف — الحد ${YT_TITLE_MAX}`);
        else if (len(t) > YT_TITLE_SOFT) warnings.push(`youtube.title: ${len(t)} حرف — فوق ${YT_TITLE_SOFT} ينقص بالجوال`);
        if (INLINE_HASHTAG.test(t)) errors.push('youtube.title: بلا هاشتاقات بالعنوان');
        lines.push({ where: 'youtube.title', text: t });
      }
    }
    for (const m of `${e.title || ''} ${cap}`.match(MENTION) || []) {
      if (!profile.handles.includes(m.toLowerCase())) errors.push(`${k}: منشن ${m} — مسموح بس حساباته (${profile.handles.join(' ') || 'ما فيه حساب محفوظ'})`);
    }
    const tags = e.hashtags;
    const maxTags = k === 'tiktok' ? Math.max(profile.hashtags, 5) : profile.hashtags;
    if (!Array.isArray(tags) || tags.length < 1 || tags.length > maxTags) errors.push(`${k}.hashtags: من 1 إلى ${maxTags}`);
    else {
      const seen = new Set();
      for (const tag of tags) {
        if (typeof tag !== 'string' || !HASHTAG.test(tag)) errors.push(`${k}.hashtags: ${JSON.stringify(tag)} مو هاشتاق (#تعديل_فيديو)`);
        else if (seen.has(tag.toLowerCase())) errors.push(`${k}.hashtags: ${tag} مكرر`);
        else seen.add(tag.toLowerCase());
      }
    }
    lines.push({ where: `${k}.${field}`, text: cap });
    for (const f of OPTIONAL[k]) if (typeof e[f] === 'string' && e[f].trim()) lines.push({ where: `${k}.${f}`, text: e[f].trim() });
  }
  if (copy.instagram && copy.instagram.coverText && copy.instagram.coverText.trim().split(/\s+/).length > 6) warnings.push('instagram.coverText: أكثر من 6 كلمات');
  if (copy.youtube && copy.youtube.thumbText && copy.youtube.thumbText.trim().split(/\s+/).length > 4) warnings.push('youtube.thumbText: أكثر من 4 كلمات');
  // Arabic QA on every visible line (the copy is plain text: glyph coverage is the app's font, so it is not checked here)
  const qa = QA.checkAll({ strings: lines.map((l) => ({ kind: 'text', where: l.where, text: l.text })) }, { digits: QA.digitsFrom(profile.numerals), coverage: null });
  for (const p of qa.problems) {
    if (p.code === 'long-line' || p.code === 'mixed-direction') continue; // captions are long and mix handles/links by nature
    (p.level === 'fail' ? errors : warnings).push(`${p.where}: ${p.ar} — ${p.detail}`);
  }
  return { ok: errors.length === 0, errors, warnings, cta };
}

function renderPack(copy, profile, { video } = {}) {
  const v = copy.video || video;
  const out = [`# ${copy.title} — حزمة النشر`, '', 'ما انتشر شي. النشر بسكل io-blotato-publish وبموافقة صريحة.', ''];
  if (v) out.push(`الفيديو: \`${v}\``, '');
  out.push(`كلمة التعليق: ${copy.cta || profile.cta ? `«${copy.cta || profile.cta}»` : 'ما فيه'}`, '');
  for (const k of PLATFORMS) {
    const e = copy[k];
    if (!e) continue;
    out.push(`## ${LABEL[k]}`, '');
    if (k === 'youtube') out.push('**العنوان**', '', e.title, '', '**الوصف**', '', e.description, '');
    else out.push(e.caption, '');
    out.push(e.hashtags.join(' '), '');
    if (e.coverText) out.push(`**نص الغلاف:** ${e.coverText}`, '');
    if (e.altText) out.push(`**Alt text:** ${e.altText}`, '');
    if (e.thumbText) out.push(`**نص الثمبنيل:** ${e.thumbText}`, '');
    if (e.onScreenText) out.push(`**نص أول ثانيتين:** ${e.onScreenText}`, '');
    if (e.pinnedComment) out.push(`**تعليق مثبّت:** ${e.pinnedComment}`, '');
  }
  const k = keywordOptions(copy);
  if (k) out.push('## كلمة التعليق ← الخاص', '', `الكلمة: «${k.keyword}» — الرد التلقائي: ${dmMessage(k)}`, '', 'التفاصيل وملاحظات كل منصة بملف `.dm-reply.txt` جنب هالحزمة.', '');
  if (copy.credits && copy.credits.length) out.push('## الحقوق', '', ...copy.credits.map((c) => `- ${c}`), '');
  if (copy.notes && copy.notes.length) out.push('## ملاحظات', '', ...copy.notes.map((c) => `- ${c}`), '');
  return out.join('\n');
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
  const [cmd, file] = o._;
  if (!['check', 'render'].includes(cmd) || !file || !fs.existsSync(file)) { console.error('الاستخدام: node engine/publish-pack.js check|render <copy.json> [--dir .] [--video …] [--out …] [--keyword كلمة --dm "رسالة أو رابط" --reward الرابط]'); process.exit(2); }
  const dir = path.resolve(o.dir || '.');
  const profile = profileFrom(dir);
  const kopts = { keyword: typeof o.keyword === 'string' ? o.keyword : '', dm: typeof o.dm === 'string' ? o.dm : '', reward: typeof o.reward === 'string' ? o.reward : '' };
  if (o.keyword === true) { console.error('--keyword يحتاج كلمة: --keyword "دليل"'); process.exit(2); }
  const copy = applyKeyword(readJson(file, null), kopts);
  const r = validateCopy(copy, profile);
  for (const e of r.errors) console.log('⛔ ' + e);
  for (const w of r.warnings) console.log('👀 ' + w);
  if (!r.ok) { console.log(`⛔ ${r.errors.length} مشكلة — صلّحها وأعد الفحص`); process.exit(1); }
  if (cmd === 'check') { console.log('✅ الحزمة سليمة للمنصات: ' + profile.platforms.map((k) => LABEL[k]).join(' · ')); return; }
  const slug = String(copy.slug || copy.title).toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, '-').replace(/^-|-$/g, '') || 'pack';
  const out = o.out || path.join(dir, 'output', 'publish', `${slug}.md`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, renderPack(copy, profile, { video: o.video }) + '\n');
  console.log('✅ ' + out);
  if (keywordOptions(copy)) {
    const dmf = out.replace(/\.md$/i, '') + '.dm-reply.txt';
    fs.writeFileSync(dmf, dmReplyText(copy, kopts, profile));
    console.log('✅ ' + dmf);
  }
}

module.exports = { validateCopy, renderPack, profileFrom, PLATFORMS, applyKeyword, keywordCta, dmReplyText, keywordOptions };
if (require.main === module) main();
