/*
 * I/O Studio — draw a rendered sticker (PNG frames from engine/stickers.js) on the video canvas.
 * Put next to compose.html (engine/stickers.js render copies it there) and load it: <script src="sticker.js"></script>
 *
 *   const fire = STK.load('stk/emoji-fire', {frames: 60, fps: 30});   // or STK.load('stk/emoji-fire') after STK.ready()
 *   // inside a scene draw(ctx, t):
 *   STK.draw(ctx, fire, t - 3.2, 820, 380, 220, {loop: false, pop: true});   // t - start time · x,y = centre · size in px
 *
 * The frames play at their own speed and hold the last frame (loop:false), or repeat (loop:true). `pop` adds a short
 * scale-in (0.25 s) — whole sticker, never per letter. Nothing is drawn before its start.
 */
(function (G) {
  'use strict';
  const pad = (n) => String(n).padStart(4, '0');
  function load(dir, meta) {
    const s = { dir, frames: (meta && meta.frames) || 1, fps: (meta && meta.fps) || 30, imgs: [], ready: null };
    // sticker.json via fetch (the engine runs Chromium with --allow-file-access-from-files); otherwise count the frames by loading them
    const probe = () => new Promise((ok) => { let n = 0; const next = () => { const im = new Image(); im.onload = () => { n++; n < 900 ? next() : ok({ frames: n, fps: s.fps }); }; im.onerror = () => ok({ frames: Math.max(1, n), fps: s.fps }); im.src = `${dir}/${pad(n + 1)}.png`; }; next(); });
    s.ready = (meta ? Promise.resolve(meta) : fetch(dir + '/sticker.json').then((r) => r.json()).catch(probe))
      .then((m) => { s.frames = m.frames; s.fps = m.fps; return Promise.all(Array.from({ length: s.frames }, (_, i) => new Promise((ok) => {
        const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = `${dir}/${pad(i + 1)}.png`; s.imgs[i] = im;
      }))); });
    (G.__stkWait = G.__stkWait || []).push(s.ready);
    return s;
  }
  function draw(ctx, s, local, x, y, size, opt) {
    if (local < 0 || !s.imgs.length) return;
    opt = opt || {};
    let i = Math.floor(local * s.fps);
    i = opt.loop ? i % s.frames : Math.min(i, s.frames - 1);
    const im = s.imgs[i];
    if (!im || !im.complete) return;
    let k = 1;
    if (opt.pop) { const p = Math.min(1, local / 0.25); k = p < 1 ? 1 - Math.pow(1 - p, 3) * (1 - 0.6) : 1; }
    const w = size * k;
    ctx.save();
    if (opt.alpha !== undefined) ctx.globalAlpha *= opt.alpha;
    ctx.drawImage(im, x - w / 2, y - w / 2, w, w);
    ctx.restore();
  }
  G.STK = { load, draw, ready: () => Promise.all(G.__stkWait || []) };
})(typeof window !== 'undefined' ? window : globalThis);
