/* I/O Studio — one-time copy of browser settings saved under the old SKY names (sky.app.*, sky-theme …)
 * to the new io.* / io-* keys, so a creator's theme, tab and page choices survive the rename.
 * Old keys are left alone; a key that already exists under the new name is never overwritten. */
(function () {
  try {
    var ls = window.localStorage, old = [];
    for (var i = 0; i < ls.length; i++) { var k = ls.key(i); if (/^sky[.-]/.test(k)) old.push(k); }
    old.forEach(function (k) { var n = 'io' + k.slice(3); if (ls.getItem(n) === null) ls.setItem(n, ls.getItem(k)); });
  } catch (e) { /* storage blocked: nothing to move */ }
})();
