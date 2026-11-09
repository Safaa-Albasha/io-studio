#!/usr/bin/env node
// Tiny local server (no dependencies) for I/O Studio's pages: a secure
// context for camera/mic/File System Access at http://localhost, plus the
// welcome window's API that writes the creator's identity into their project.
//
//   node engine/serve.js [port] [--dir <project>] [--open app.html|welcome.html] [--reuse]
//   --reuse: if a server for this project is already running (4747–4800), just open
//   the page on it and exit — so Claude can call this every session without piling up servers.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { dataDir, dataFile } = require('./data-dir.js');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..', 'web');
const LIB = path.resolve(__dirname, '..', 'library'); // sounds, looks, lessons… (pages use ../library/…)
// Motion-move preview clips, read-only (web/app.html's library tab).
const PREVIEWS = path.resolve(__dirname, '..', 'skills', 'io-video-editor', 'motion', 'moves', 'previews');
const PREVIEW_PREFIX = '/skills/io-video-editor/motion/moves/previews/';
const PREVIEW_EXT = /\.(mp4|webm|jpg|png|webp|gif)$/i;
// The step-by-step tutorial (docs/tutorial): the page, its pictures and the PDF, read-only — the app's «📖 دليل الاستخدام».
const DOCS = path.resolve(__dirname, '..', 'docs', 'tutorial');
const DOCS_PREFIX = '/docs/tutorial/';
const DOCS_EXT = /\.(html|png|pdf)$/i;
// Engine files a page loads directly (interior.html → ../engine/blender/room-core.js), read-only, exact paths only.
const SHARED = { 'engine/blender/room-core.js': path.resolve(__dirname, 'blender', 'room-core.js') };
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon', '.mjs': 'text/javascript; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.pdf': 'application/pdf', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.gif': 'image/gif', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.cube': 'text/plain; charset=utf-8' };

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; o[k] = v; } else o._.push(a);
  }
  return o;
}

function loadDialects() {
  try { return JSON.parse(fs.readFileSync(path.join(LIB, 'dialects', 'dialects.json'), 'utf8')).dialects; } catch (e) { return []; }
}

/** Open a URL in the default browser on Windows, macOS or Linux. */
function openBrowser(url) {
  const cmd = process.platform === 'win32' ? ['cmd', ['/c', 'start', '""', url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  try { const p = spawn(cmd[0], cmd[1], { detached: true, stdio: 'ignore' }); p.on('error', () => {}); p.unref(); } catch (e) { /* print the link instead */ }
}

function sendJson(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(obj));
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('الملف كبير')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

function api(req, res, url, opts) {
  const onboard = require('./onboard.js');
  const dialects = loadDialects();
  // Only pages served from this machine may write files.
  const origin = req.headers.origin || '';
  // The video editor (studio.py, another localhost port) may send requests to Claude's queue.
  if (url.pathname === '/api/queue' && LOCAL_ORIGIN.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Max-Age': '600' });
      return res.end();
    }
  }
  if (req.method !== 'GET' && origin && !LOCAL_ORIGIN.test(origin)) return sendJson(res, 403, { error: 'origin' });
  if (require('./stats-api.js').route(req, res, url, opts.dir, { sendJson, readBody })) return;
  if (require('./app-api.js').route(req, res, url, opts.dir, { sendJson, readBody, recLimit: opts.recLimit, log: opts.quiet ? () => {} : console.log })) return;
  if (url.pathname === '/api/state' && req.method === 'GET') return sendJson(res, 200, onboard.state(opts.dir, dialects));
  if (url.pathname === '/api/identity-options' && req.method === 'GET') {
    const I = require('./identity.js');
    return sendJson(res, 200, I.createOptions(url.searchParams.get('mood') || 'warm', url.searchParams.get('accent') || undefined, url.searchParams.get('dark') === '1'));
  }
  if (url.pathname === '/api/onboard' && req.method === 'POST') {
    return readBody(req, 25 * 1024 * 1024).then((body) => {
      let payload; try { payload = JSON.parse(body); } catch (e) { return sendJson(res, 400, { ok: false, errors: ['بيانات غير صالحة'] }); }
      try {
        const r = onboard.apply(opts.dir, payload, dialects);
        if (r.ok) console.log(`✓ الهوية انحفظت بـ ${dataDir(opts.dir)} — ارجع لـ Claude وكمّل`);
        return sendJson(res, r.ok ? 200 : 400, r);
      } catch (e) { return sendJson(res, 500, { ok: false, errors: [e.message] }); }
    }).catch((e) => sendJson(res, 413, { ok: false, errors: [e.message] }));
  }
  return sendJson(res, 404, { error: 'not found' });
}

/** Asks a port whether it is I/O Studio's server for this project. Resolves the port or 0. */
function probe(port, dir, timeout = 600) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/api/paths', timeout }, (r) => {
      let b = ''; r.setEncoding('utf8'); r.on('data', (c) => { b += c; });
      r.on('end', () => { try { const j = JSON.parse(b); resolve(j && path.resolve(j.project) === path.resolve(dir) ? port : 0); } catch (e) { resolve(0); } });
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', () => resolve(0));
  });
}

/** The port of a server already running for this project (server.json first, then 4747–4800), or 0. */
async function findRunning(dir) {
  let hint = 0;
  try { hint = +JSON.parse(fs.readFileSync(dataFile(dir, 'server.json'), 'utf8')).port || 0; } catch (e) { /* none */ }
  if (hint && await probe(hint, dir)) return hint;
  const ports = []; for (let p = 4747; p <= 4800; p++) if (p !== hint) ports.push(p);
  const found = await Promise.all(ports.map((p) => probe(p, dir, 400)));
  return found.find(Boolean) || 0;
}

function start(port, opts) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname.startsWith('/api/')) return api(req, res, url, opts);
    let p;
    try { p = decodeURIComponent(url.pathname); } catch (e) { res.writeHead(400); res.end(); return; }
    if (p.startsWith(PREVIEW_PREFIX)) {
      const file = path.resolve(PREVIEWS, path.normalize(p.slice(PREVIEW_PREFIX.length)).replace(/^([/\\])+/, ''));
      if (!file.startsWith(PREVIEWS + path.sep) || !PREVIEW_EXT.test(file) || req.method !== 'GET') { res.writeHead(403); res.end(); return; }
      return fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'max-age=3600' });
        res.end(data);
      });
    }
    if (p === DOCS_PREFIX.slice(0, -1) || p === DOCS_PREFIX) p = DOCS_PREFIX + 'tutorial.html';
    if (p.startsWith(DOCS_PREFIX)) {
      const file = path.resolve(DOCS, path.normalize(p.slice(DOCS_PREFIX.length)).replace(/^([/\\])+/, ''));
      if (!file.startsWith(DOCS + path.sep) || !DOCS_EXT.test(file) || req.method !== 'GET') { res.writeHead(403); res.end(); return; }
      return fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); res.end('مو موجود'); return; }
        res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
        res.end(data);
      });
    }
    if (p.endsWith('/')) p += 'index.html';
    const rel = path.normalize(p).replace(/^([/\\])+/, '');
    const isLib = /^library[/\\]/.test(rel);
    const shared = SHARED[rel.replace(/\\/g, '/')];
    const base = shared ? path.dirname(shared) : isLib ? LIB : ROOT;
    const file = shared || path.join(base, isLib ? rel.replace(/^library[/\\]/, '') : rel);
    if (!file.startsWith(base)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); res.end('مو موجود'); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(data);
    });
  });
  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE' && port < 4800 && port > 0) start(port + 1, opts);
    else if (opts.onError) opts.onError(e);
    else { console.error(e.message); process.exit(1); }
  });
  server.listen(port, '127.0.0.1', () => {
    port = server.address().port;
    const base = `http://localhost:${port}`;
    // Lets `--reuse` and the video editor find this server quickly.
    try { if (fs.existsSync(dataDir(opts.dir))) fs.writeFileSync(dataFile(opts.dir, 'server.json'), JSON.stringify({ port, pid: process.pid, url: base, startedAt: new Date().toISOString() }, null, 2)); } catch (e) { /* read-only project */ }
    if (opts.onListen) opts.onListen(server, port);
    if (opts.quiet) return;
    console.log(`آي أو استوديو شغّال (مجلد المشروع: ${opts.dir}):\n  ★ البرنامج الكامل (فكرة ← جدول ← بناء): ${base}/app.html\n  الترحيب:           ${base}/welcome.html\n  التسجيل:           ${base}/studio.html\n  استوديو الكورسات:  ${base}/course-studio/studio.html\n  الإحصائيات:        ${base}/dashboard.html  (تنحفظ بـ .io/stats.json)\n(Ctrl+C للإيقاف)`);
    if (opts.open) openBrowser(`${base}/${String(opts.open).replace(/^\/+/, '')}`);
  });
  return server;
}

if (require.main === module) {
  const o = args(process.argv.slice(2));
  const dir = path.resolve(o.dir && o.dir !== true ? o.dir : process.env.CLAUDE_PROJECT_DIR || process.cwd());
  const open = o.open && o.open !== true ? o.open : (o.open ? 'index.html' : '');
  const go = () => start(+(o._[0] || o.port || process.env.PORT || 4747), { dir, open });
  if (o.reuse) {
    findRunning(dir).then((port) => {
      if (!port) return go();
      const url = `http://localhost:${port}/${String(open || 'app.html').replace(/^\/+/, '')}`;
      console.log(`آي أو استوديو شغّال من قبل لهالمشروع — فتحت: ${url}`);
      if (open) openBrowser(url);
    });
  } else go();
}
module.exports = { start, openBrowser, probe, findRunning, LOCAL_ORIGIN };
