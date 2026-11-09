#!/usr/bin/env node
/*
 * I/O Studio — account-type packs (نوع الحساب).
 * The welcome window saves .io/project.json → accountType + contentFormat; every skill reads the pack here:
 * suggested identity, carousel slide types, skills, motion moves, sounds, looks, rules and trend sites.
 * Nothing personal: the packs live in library/account-types/types.json.
 *
 *   node engine/account-type.js list                 all types and formats
 *   node engine/account-type.js show [--dir <proj>]  the pack of this project (type + format merged)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { dataFile } = require('./data-dir.js');

const FILE = path.join(__dirname, '..', 'library', 'account-types', 'types.json');
const FORMAT_IDS = ['video', 'podcast'];

let cache = null;
/** { types, formats } from library/account-types/types.json. */
function load() {
  if (!cache) cache = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  return cache;
}

function getType(id) { return load().types.find((t) => t.id === id) || null; }
function getFormat(id) { return load().formats.find((f) => f.id === id) || null; }

/** Short list for pickers: [{ id, name, icon, description }]. */
function list() { return load().types.map((t) => ({ id: t.id, name: t.name, icon: t.icon, description: t.description })); }
function formats() { return load().formats.map((f) => ({ id: f.id, name: f.name, description: f.description })); }

function uniq(a) { return [...new Set(a.filter(Boolean))]; }

/** Merge a type and a format into one pack (either may be null). */
function merge(type, format) {
  const t = type || {};
  const f = format || {};
  return {
    type: type ? { id: t.id, name: t.name, icon: t.icon, description: t.description } : null,
    format: format ? { id: f.id, name: f.name, description: f.description } : null,
    identity: t.identity || null,
    carousel: (t.carousel || []).slice(),
    skills: uniq([...(t.skills || []), ...(f.skills || [])]),
    moves: uniq([...(t.moves || []), ...(f.moves || [])]),
    sfx: (t.sfx || []).slice(),
    looks: (t.looks || []).slice(),
    rules: [...(t.rules || []), ...(f.rules || [])],
    trendSites: (t.trendSites || []).slice(),
    keywords: (t.keywords || []).slice(),
    series: (t.series || []).map((x) => Object.assign({}, x)), // suggested series (engine/series.js suggest)
  };
}

function readProject(dir) {
  try { return JSON.parse(fs.readFileSync(dataFile(dir, 'project.json'), 'utf8')); } catch (e) { return {}; }
}

/** The pack of a project folder (reads .io/project.json accountType + contentFormat). */
function getPack(dir) {
  const p = readProject(dir);
  return merge(getType(p.accountType), getFormat(p.contentFormat));
}

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; o[k] = v; } else o._.push(a);
  }
  return o;
}

function showText(pack) {
  const out = [];
  if (!pack.type && !pack.format) {
    out.push('نوع الحساب: ما متحدّد بعد (.io/project.json → accountType). افتح نافذة الترحيب أو اسأل المستخدم: طبيب/صحة، مهندس ديكور، رائد أعمال، صانع محتوى، مدرّس/طالب، شخص عادي — وفيديو عادي لو بودكاست.');
    return out.join('\n');
  }
  if (pack.type) out.push(`نوع الحساب: ${pack.type.icon} ${pack.type.name} (${pack.type.id}) — ${pack.type.description}`);
  if (pack.format) out.push(`شكل المحتوى: ${pack.format.name} (${pack.format.id}) — ${pack.format.description}`);
  if (pack.identity) out.push(`الهوية المقترحة: مزاج ${pack.identity.mood} · لون ${pack.identity.accent}`);
  if (pack.carousel.length) out.push(`شرائح الكاروسيل: ${pack.carousel.join(' ← ')}`);
  if (pack.skills.length) out.push(`السكلات المقترحة: ${pack.skills.join('، ')}`);
  if (pack.moves.length) out.push(`حركات الموشن: ${pack.moves.join('، ')}`);
  if (pack.sfx.length) out.push(`الأصوات: ${pack.sfx.join('، ')}`);
  if (pack.looks.length) out.push(`اللوكات: ${pack.looks.join('، ')}`);
  if (pack.trendSites.length) out.push(`مواقع المجال للترند: ${pack.trendSites.join('، ')}`);
  if (pack.keywords.length) out.push(`كلمات الترند: ${pack.keywords.join('، ')}`);
  if (pack.series.length) out.push(`سلاسل مقترحة (شكل ثابت لكل حلقة — engine/series.js): ${pack.series.map((x) => x.name).join('، ')}`);
  if (pack.rules.length) out.push('القواعد (لازم تنطبق):\n' + pack.rules.map((r) => `- ${r}`).join('\n'));
  return out.join('\n');
}

function main() {
  const o = args(process.argv.slice(2));
  const cmd = o._[0] || 'show';
  if (cmd === 'list') {
    console.log('أنواع الحسابات:');
    for (const t of list()) console.log(`  ${t.icon} ${t.name} (${t.id}) — ${t.description}`);
    console.log('شكل المحتوى:');
    for (const f of formats()) console.log(`  ${f.name} (${f.id}) — ${f.description}`);
    return;
  }
  if (cmd === 'show') {
    const dir = path.resolve(o.dir || process.env.CLAUDE_PROJECT_DIR || process.cwd());
    const pack = o.type || o.format ? merge(getType(o.type), getFormat(o.format)) : getPack(dir);
    if (o.json) console.log(JSON.stringify(pack, null, 2));
    else console.log(showText(pack));
    return;
  }
  console.error('الاستخدام: node engine/account-type.js list | show [--dir <مجلد>] [--type <id>] [--format video|podcast] [--json]');
  process.exit(1);
}

if (require.main === module) main();
module.exports = { load, list, formats, getType, getFormat, merge, getPack, showText, FORMAT_IDS, FILE };
