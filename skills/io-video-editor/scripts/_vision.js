/* 🧭 نفس فكرة _vision.py لسكربتات نود: أمر أداة Vision كقائمة [برنامج, ...معاملات].
   ماك: يبني أداة السويفت (personmask / facetrack / handpose / hdr2sdr) ويستخدمها مثل قبل.
   ويندوز/لينكس (أو IO_VISION=py): [python, _vision.py, <الأداة>] بنفس المعاملات ونفس الملفات.
     const V=require('./_vision.js');
     const cmd=V.visionCmd('personmask', W+'bt/personmask');   // null لو ولا واحد جاهز
     V.run(cmd, [inDir, outDir, 'accurate', '2.5']);           // يرمي خطأ لو فشل */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const SC = __dirname;

let _py;
function findPython() {
  if (_py !== undefined) return _py;
  const list = (process.env.PY ? [process.env.PY] : [])
    .concat(process.platform === 'win32' ? ['python', 'py', 'python3'] : ['python3', 'python']);
  _py = null;
  for (const c of list) {
    try { if (cp.spawnSync(c, ['-c', 'import sys'], { stdio: 'ignore' }).status === 0) { _py = c; break; } } catch (e) { /* التالي */ }
  }
  return _py;
}

function visionCmd(name, binPath) {
  if (process.platform === 'darwin' && process.env.IO_VISION !== 'py') {
    if (fs.existsSync(binPath)) return [binPath];
    try {
      fs.mkdirSync(path.dirname(binPath), { recursive: true });
      const r = cp.spawnSync('swiftc', ['-O', '-o', binPath, path.join(SC, name + '.swift')], { stdio: 'pipe' });
      if (r.status === 0 && fs.existsSync(binPath)) return [binPath];
    } catch (e) { /* ننزل للبديل */ }
  }
  const py = findPython(); if (!py) return null;
  const vp = path.join(SC, '_vision.py');
  const r = cp.spawnSync(py, [vp, 'check', name], { stdio: 'pipe', env: Object.assign({}, process.env, { PYTHONUTF8: '1' }) });
  return r.status === 0 ? [py, vp, name] : null;
}

function run(cmd, args, opts) {
  const r = cp.spawnSync(cmd[0], cmd.slice(1).concat(args),
    Object.assign({ stdio: 'inherit', env: Object.assign({}, process.env, { PYTHONUTF8: '1' }) }, opts || {}));
  if (r.status !== 0) throw new Error((cmd[2] || path.basename(cmd[0])) + ' فشل (رمز ' + r.status + ')');
  return r;
}

const HINT = 'ماك: xcode-select --install · ويندوز/لينكس: python -m pip install --user onnxruntime mediapipe opencv-python-headless pillow numpy (أو node engine/doctor.js --install)';

module.exports = { visionCmd, run, findPython, HINT };
