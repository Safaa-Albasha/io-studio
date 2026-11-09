/*
 * Headless Chromium via Playwright (optional dependency).
 * Looks for a local install, then a global one, then PLAYWRIGHT_PATH.
 */
'use strict';

function loadPlaywright() {
  const tries = ['playwright', 'playwright-core', process.env.PLAYWRIGHT_PATH].filter(Boolean);
  for (const t of tries) {
    try { return require(t); } catch (e) { /* next */ }
  }
  try {
    const { execSync } = require('child_process');
    const root = execSync('npm root -g', { encoding: 'utf8' }).trim();
    return require(require('path').join(root, 'playwright'));
  } catch (e) { /* none */ }
  throw new Error('يحتاج Playwright: npm i -g playwright && npx playwright install chromium');
}

async function launch() {
  const pw = loadPlaywright();
  const opts = { args: ['--autoplay-policy=no-user-gesture-required', '--font-render-hinting=none'] };
  if (process.env.CHROME_PATH) opts.executablePath = process.env.CHROME_PATH;
  return pw.chromium.launch(opts);
}

module.exports = { launch };
