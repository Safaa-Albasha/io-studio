#!/usr/bin/env node
// Adds context at session start: is this folder set up for I/O Studio, and
// which dialect should Claude speak and write in (from .io/project.json).
'use strict';
const fs = require('fs');
const path = require('path');
const { dataDir, dataFile, editorHome } = require('../engine/data-dir.js');

const DIALECTS = path.join(__dirname, '..', 'library', 'dialects', 'dialects.json');

function loadDialects() {
  try { return JSON.parse(fs.readFileSync(DIALECTS, 'utf8')).dialects; } catch (e) { return []; }
}

/** Find a dialect by id or by its Arabic name (users type either). */
function findDialect(list, value) {
  if (!value) return null;
  const v = String(value).trim();
  return list.find((d) => d.id === v || d.name === v || v.includes(d.name) || d.name.includes(v)) || null;
}

/** The instruction Claude gets for the whole session. */
function dialectInstruction(d) {
  const words = Object.keys(d.words).slice(0, 8).join('، ');
  return `اللهجة: ${d.name} (${d.region}). احچي ويّا المستخدم وكل ردودك وأسئلتك ونصوص المحتوى بهاللهجة — جمل قصيرة وطبيعية، مو فصحى رسمية. مفردات: ${words}. ${d.spelling}. مثال: «${d.sample}». تجنّب: ${d.avoid.join('، ')}. التفاصيل: library/dialects/dialects.json.`;
}

/** One line naming the account type + format, so Claude applies its pack (library/account-types/types.json). */
function accountTypeLine(proj) {
  if (!proj || !proj.accountType) return '';
  let t = null; let f = null;
  try {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'library', 'account-types', 'types.json'), 'utf8'));
    t = data.types.find((x) => x.id === proj.accountType);
    f = data.formats.find((x) => x.id === proj.contentFormat);
  } catch (e) { /* no library */ }
  const name = t ? t.name : proj.accountType;
  return `نوع الحساب: ${name}${f ? ' · ' + f.name : ''} — قبل أي محتوى شغّل node "\${CLAUDE_PLUGIN_ROOT}/engine/account-type.js" show وطبّق حزمته (شرائح، حركات، أصوات، لوك، وقواعده إلزامية).`;
}

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function readJson(f, d) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } }

/** The first-run question: finish setup in the web page or here in the chat. */
const FIRST_RUN = 'آي أو استوديو: أول استخدام بهالمجلد (ما بيه .io/). قبل أي أداة محتوى، أول رسالة منك سؤال واحد بالضبط: «تكمل الإعدادات من صفحة الويب لو هنا بالشات؟» (AskUserQuestion بخيارين إذا متوفرة: «صفحة الويب» · «هنا بالشات»). '
  + '— صفحة الويب: شغّل بالخلفية node "${CLAUDE_PLUGIN_ROOT}/engine/serve.js" --dir "$CLAUDE_PROJECT_DIR" --open welcome.html --reuse وگله يخلّصها ويرجعلك يگول «خلصت». '
  + '— هنا بالشات: سكل io-onboarding (قسم «الإعداد بالشات») — سؤال لكل خطوة، وبالنهاية node "${CLAUDE_PLUGIN_ROOT}/engine/onboard.js" apply <payload.json> يكتب نفس ملفات الصفحة. '
  + 'بالطريقتين يُسأل: «تريد الترند يومياً؟» والساعة المفضّلة (project.json → dailyTrends). بعدها كمّل سكل io-onboarding.';

/** Daily trends fallback: enabled but not run today → run it first, then open the app on the ideas tab. */
function dailyTrendsLine(dir, proj, now) {
  const dt = proj && proj.dailyTrends;
  if (!dt || dt.enabled !== true) return '';
  const last = readJson(dataFile(dir, 'trends-last.json'), null);
  if (last && last.date === ymd(now)) return '';
  const hour = Number.isFinite(+dt.hour) ? +dt.hour : 9;
  return `الترند اليومي مفعّل (الساعة ${hour}:00) وما انسوّى اليوم (${ymd(now)}): بعد التحية وقبل أي شي ثاني، شغّل سكل io-trends — `
    + 'يجيب ترند مصادره ويكتب الأفكار بالبرنامج (node "${CLAUDE_PLUGIN_ROOT}/engine/app-api.js" add-ideas <ideas.json> — يكتب .io/trends-last.json)، '
    + 'وبعدها افتح البرنامج على الأفكار بالخلفية: node "${CLAUDE_PLUGIN_ROOT}/engine/serve.js" --dir "$CLAUDE_PROJECT_DIR" --open "app.html#ideas" --reuse. '
    + 'وإذا عندك أداة جدولة وما فيه مهمة يومية للترند، سوّها (سكل io-trends، قسم «يومياً تلقائياً»).';
}

/** Requests the pages left for Claude in .io/queue.json. */
function queueLine(dir) {
  const q = readJson(dataFile(dir, 'queue.json'), null);
  const items = q && Array.isArray(q.items) ? q.items : [];
  const pend = items.filter((x) => x && x.status === 'pending');
  const working = items.filter((x) => x && x.status === 'working');
  const arm = 'node "${CLAUDE_PLUGIN_ROOT}/engine/queue.js" wait --dir "$CLAUDE_PROJECT_DIR"';
  if (pend.length || working.length) {
    return `طابور الطلبات: ${pend.length} طلب بالانتظار${working.length ? ` و${working.length} كان يشتغل (كمّله أو علّمه fail)` : ''} من صفحات آي أو استوديو (مونتاج، تعديل فكرة، سكربت، تعديل كابشن). شغّل سكل io-autopilot: عالج كل طلب بسكله، حدّث التقدّم، وبعدها سلّح ${arm} بالخلفية (run_in_background) حتى توصلك الطلبات الجاية.`;
  }
  const used = fs.existsSync(dataFile(dir, 'plan.json')) || fs.existsSync(dataFile(dir, 'server.json'));
  return used ? `إذا فتح المستخدم برنامج آي أو استوديو (app.html) أو استوديو الكورسات أو محرّر التايملاين، شغّل سكل io-autopilot — ${arm} بالخلفية (run_in_background) يصحّيك أول ما الصفحة ترسل طلب.` : '';
}

/** Daily Instagram pull (Composio mode): last pull > 24 h → Claude runs it once, quietly. */
function statsLine(dir, now = new Date()) {
  let d;
  try { d = require('../engine/stats.js').syncDue(dir, now); } catch (e) { return ''; }
  if (!d || !d.due) return '';
  return `إحصائيات إنستقرام: آخر سحب ${d.last ? d.last.slice(0, 10) : 'ما صار'} (أكثر من ٢٤ ساعة) والطريقة «إنستقرام عبر Claude + Composio». `
    + 'بعد ما تخلّص طلب المستخدم الأول (لا تأخره)، اسحبها بهدوء: سكل io-dashboard قسم «إنستقرام عبر Composio» (أدوات INSTAGRAM_* بـ Composio، وبالنهاية '
    + 'node "${CLAUDE_PLUGIN_ROOT}/engine/stats.js" import --from composio-instagram <pull.json> --dir "$CLAUDE_PROJECT_DIR"). ما فيه Composio بهالجلسة؟ تجاهل هالسطر.';
}

function run(dir, now = new Date()) {
  const prof = dataFile(dir, 'creator-profile.md');
  const projFile = dataFile(dir, 'project.json');
  const out = [];
  if (!fs.existsSync(prof)) {
    out.push(FIRST_RUN);
    return out.join('\n');
  }
  const txt = fs.readFileSync(prof, 'utf8');
  const name = ((txt.match(/^- الاسم:[ \t]*([^\n]*)$/m) || txt.match(/^\*\*اسم الحساب:\*\*[ \t]*([^\n]*)$/m) || [])[1] || '').trim();
  if (!name) {
    out.push('آي أو استوديو: ملف الهوية لسه فاضي (.io/creator-profile.md) — إذا طلب المستخدم أي أداة محتوى، شغّل سكل io-onboarding أول (أول سؤال: اللهجة).');
  }
  else out.push(`آي أو استوديو: الهوية جاهزة (${name}) — اقرأ .io/ قبل أي محتوى.`);
  let dialect = null;
  let proj = {};
  try { proj = JSON.parse(fs.readFileSync(projFile, 'utf8')) || {}; dialect = proj.dialect; } catch (e) { /* no project file */ }
  const typeLine = accountTypeLine(proj);
  if (typeLine) out.push(typeLine);
  if (!dialect) dialect = ((txt.match(/^\*\*اللهجة:\*\*[ \t]*([^\n]*)$/m) || txt.match(/^- اللهجة:[ \t]*([^\n]*)$/m) || [])[1] || '').trim();
  const d = findDialect(loadDialects(), dialect);
  if (d) out.push(dialectInstruction(d));
  else if (dialect) out.push(`اللهجة: ${String(dialect).trim()} — احچي ويّا المستخدم واكتب كل المحتوى بهاللهجة.`);
  const tl = dailyTrendsLine(dir, proj, now);
  if (tl) out.push(tl);
  const ql = queueLine(dir);
  if (ql) out.push(ql);
  const sl = statsLine(dir, now);
  if (sl) out.push(sl);
  return out.join('\n');
}

if (require.main === module) {
  const dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  try { dataDir(dir); editorHome(); } catch (e) { /* one-time move of the old data folders; never block the session */ }
  try { process.stdout.write(run(dir) + '\n'); } catch (e) { /* never block the session */ }
}
module.exports = { run, findDialect, dialectInstruction, loadDialects, accountTypeLine, dailyTrendsLine, queueLine, statsLine, FIRST_RUN };
