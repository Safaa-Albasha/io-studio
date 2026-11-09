#!/usr/bin/env node
/*
 * I/O Studio — HTML → PNG (carousels, covers, thumbnails, HTML decks).
 *
 *   node engine/shoot.js carousel.html [--selector .slide] [--out-dir carousel_png] [--prefix slide] [--query size=1080x1920]
 *
 * Every element matching the selector is saved at its own CSS pixel size
 * (a 1080×1440 slide → a 1080×1440 PNG). Pages built by the studio skills
 * read ?export=1 and drop preview scaling and UI in that mode.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { launch } = require('./browser.js');

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; o[k] = v; } else o._.push(a);
  }
  return o;
}

async function main() {
  const o = args(process.argv.slice(2));
  const file = o._[0];
  if (!file || !fs.existsSync(file)) { console.log('الاستخدام: node engine/shoot.js <file.html> [--selector .slide] [--out-dir dir]'); process.exitCode = 1; return; }
  const sel = o.selector || '.slide, [data-slide], .cover';
  const dir = o['out-dir'] || path.join(path.dirname(file), path.basename(file).replace(/\.html?$/, '') + '_png');
  const prefix = o.prefix || 'slide';
  fs.mkdirSync(dir, { recursive: true });
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 2000, height: 2000 }, deviceScaleFactor: 1 });
    await page.goto('file://' + path.resolve(file) + '?export=1' + (o.query ? '&' + o.query : ''), { waitUntil: 'networkidle' }).catch(() => {});
    await page.evaluate(async () => { try { await document.fonts.ready; } catch (e) { /* ignore */ } document.documentElement.classList.add('export'); });
    await page.waitForTimeout(300);
    const els = await page.$$(sel);
    if (!els.length) throw new Error(`ما لگيت عناصر تطابق ${sel}`);
    const files = [];
    for (let i = 0; i < els.length; i++) {
      await els[i].scrollIntoViewIfNeeded();
      const f = path.join(dir, `${prefix}-${String(i + 1).padStart(2, '0')}.png`);
      await els[i].screenshot({ path: f });
      const box = await els[i].boundingBox();
      files.push({ file: f, w: Math.round(box.width), h: Math.round(box.height) });
    }
    for (const f of files) console.log(`✓ ${f.file} (${f.w}×${f.h})`);
  } finally { await browser.close(); }
}

main().catch((e) => { console.error('خطأ: ' + e.message); process.exit(1); });
