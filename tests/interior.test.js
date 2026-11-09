'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const Core = require('../engine/blender/room-core.js');
const I = require('../engine/interior.js');
const { build: buildCatalog } = require('../library/interiors/furniture/build-catalog.js');

const lib = I.loadLibrary();
const SHAPES = new Set(['box', 'cyl', 'sphere', 'cone', 'torus']);
const HEX = /^#[0-9a-f]{6}$/i;

function baseRoom() {
  return {
    version: 1, style: 'modern',
    room: { width: 4, depth: 3.5, height: 2.8 },
    walls: [{ side: 'north', openings: [{ type: 'window', offset: 1, width: 1.5, height: 1.2, sill: 0.9 }] }, { side: 'south', openings: [{ type: 'door', offset: 0.3, width: 0.9, height: 2.1 }] }],
    furniture: [{ id: 'sofa', type: 'sofa', wall: 'west', at: 1.75 }, { id: 'table', type: 'coffee-table', position: [2.0, 1.75], rotation: 90 }],
    decor: [{ id: 'rug', type: 'rug', position: [2, 1.75] }],
    outputs: ['9:16'],
  };
}

// ───────── التحقق من room.json ─────────
test('a well-formed room validates without errors', () => {
  const r = Core.validateRoom(baseRoom(), lib);
  assert.deepStrictEqual(r.errors, []);
});

test('validation catches bad sizes, unknown furniture, bad openings and formats', () => {
  const room = baseRoom();
  room.room.height = 1.2;
  room.furniture.push({ id: 'x', type: 'flying-carpet', position: [1, 1] });
  room.walls[0].openings.push({ type: 'window', offset: 3.5, width: 1.0, height: 1.0 });
  room.walls[1].openings.push({ type: 'door', offset: 0.5, width: 0.9, height: 2.0 });
  room.outputs = ['9:16', '5:4'];
  room.lighting = { time_of_day: 'midnight-sun' };
  const r = Core.validateRoom(room, lib);
  const all = r.errors.join('\n');
  assert.match(all, /ارتفاع السقف/);
  assert.match(all, /flying-carpet/);
  assert.match(all, /طالع برا الجدار/);
  assert.match(all, /متداخلات/);
  assert.match(all, /5:4/);
  assert.match(all, /midnight-sun/);
});

test('validation warns about overlaps and out-of-room furniture', () => {
  const room = baseRoom();
  room.furniture.push({ id: 'chair', type: 'armchair', position: [0.5, 1.75] });
  room.furniture.push({ id: 'far', type: 'side-table', position: [9, 9] });
  const r = Core.validateRoom(room, lib);
  assert.deepStrictEqual(r.errors, []);
  assert.ok(r.warnings.some((w) => w.includes('"sofa"') && w.includes('"chair"')));
  assert.ok(r.warnings.some((w) => w.includes('"far"') && w.includes('برا')));
});

test('every room preset validates with zero errors', () => {
  assert.ok(Object.keys(lib.rooms).length >= 10);
  const need = ['living-room', 'majlis', 'bedroom', 'kids-room', 'kitchen', 'bathroom', 'creator-studio', 'cafe-corner', 'studio-apartment', 'balcony'];
  for (const id of need) assert.ok(lib.rooms[id], `missing preset ${id}`);
  for (const [id, room] of Object.entries(lib.rooms)) {
    const r = Core.validateRoom(room, lib);
    assert.deepStrictEqual(r.errors, [], `${id}: ${r.errors.join(' | ')}`);
    assert.ok(room.name_ar && room.description_ar, `${id} needs Arabic name/description`);
  }
});

// ───────── دمج القالب والستايل ─────────
test('preset + style merge swaps furniture and can switch back', () => {
  const majlis = Core.newFromPreset('living-room', 'gulf-majlis', lib);
  const sofa = majlis.furniture.find((i) => i.id === 'sofa');
  assert.strictEqual(sofa.type, 'majlis-floor-seat');
  assert.strictEqual(sofa.swapped_from, 'sofa');
  assert.strictEqual(majlis.furniture.find((i) => i.id === 'coffee-table').type, 'tea-tray-table');
  assert.strictEqual(majlis.style, 'gulf-majlis');
  assert.strictEqual(majlis.preset, 'living-room');
  assert.strictEqual(majlis.lighting.time_of_day, lib.styles['gulf-majlis'].lighting.time_of_day);
  assert.ok(!('description_ar' in majlis));
  const back = Core.applyStyle(majlis, 'modern', lib);
  assert.strictEqual(back.furniture.find((i) => i.id === 'sofa').type, 'sofa');
  assert.ok(!('swapped_from' in back.furniture.find((i) => i.id === 'sofa')));
  // الأصل ما يتغيّر
  assert.strictEqual(lib.rooms['living-room'].furniture.find((i) => i.id === 'sofa').type, 'sofa');
  assert.deepStrictEqual(Core.validateRoom(majlis, lib).errors, []);
});

test('time of day chosen by the user survives a style change', () => {
  const r = Core.newFromPreset('bedroom', 'modern', lib);
  r.lighting.time_of_day = 'night'; r.lighting.time_of_day_locked = true;
  assert.strictEqual(Core.applyStyle(r, 'boho', lib).lighting.time_of_day, 'night');
});

test('style materials flow into the resolved scene and item colors override', () => {
  const room = Core.newFromPreset('living-room', 'industrial', lib);
  room.furniture.find((i) => i.id === 'armchair').color = '#123456';
  const s = Core.resolveScene(room, lib, { format: '16:9' });
  const wall = s.objects.find((o) => o.id === 'wall-east');
  assert.strictEqual(s.materials[wall.parts[0].mat].kind, 'brick');
  const arm = s.objects.find((o) => o.id === 'armchair');
  const mainMat = arm.parts.map((p) => s.materials[p.mat]).find((m) => m.color === '#123456');
  assert.ok(mainMat, 'armchair color override applied');
  assert.strictEqual(s.format, '16:9');
  assert.strictEqual(s.cameras.stills[0].lens, Core.FORMATS['16:9'].lens);
});

test('every style is complete and its swaps/materials resolve', () => {
  const styles = Object.values(lib.styles);
  assert.ok(styles.length >= 12);
  for (const id of ['modern', 'minimal', 'scandinavian', 'industrial', 'boho', 'classic', 'japandi', 'baghdadi-heritage', 'gulf-majlis', 'moroccan', 'neo-classic', 'kids', 'creator-studio']) assert.ok(lib.styles[id], id);
  for (const s of styles) {
    assert.ok(s.name_ar && s.description_ar && s.description_ar.length > 30, `${s.id} Arabic text`);
    assert.ok(Array.isArray(s.palette) && s.palette.length >= 4 && s.palette.every((c) => HEX.test(c)), `${s.id} palette`);
    for (const [from, to] of Object.entries(s.swaps || {})) {
      assert.ok(lib.catalog[from], `${s.id} swap from ${from}`);
      assert.ok(lib.catalog[to], `${s.id} swap to ${to}`);
    }
    for (const r of s.recommended || []) assert.ok(lib.catalog[r], `${s.id} recommends ${r}`);
    for (const [slot, m] of Object.entries(s.materials)) assert.ok(Core.resolveMaterial(m, lib), `${s.id}.${slot}`);
    assert.ok(Core.TIMES[s.lighting.time_of_day], `${s.id} time_of_day`);
  }
});

// ───────── سلامة الكتالوج ─────────
test('furniture catalog is complete, original and consistent', () => {
  const items = Object.values(lib.catalog);
  assert.ok(items.length >= 60, `only ${items.length} items`);
  const slots = lib.materials.slots;
  for (const it of items) {
    assert.match(it.id, /^[a-z0-9-]+$/);
    assert.ok(it.name_ar && it.name_en && it.category, it.id);
    assert.ok(it.size.length === 3 && it.size.every((v) => v > 0), `${it.id} size`);
    assert.ok(['floor', 'wall', 'ceiling', 'surface'].includes(it.mount), `${it.id} mount`);
    assert.ok(it.parts.length > 0);
    for (const p of it.parts) {
      assert.ok(SHAPES.has(p.shape), `${it.id} shape ${p.shape}`);
      assert.ok(p.s.every((v) => v > 0), `${it.id} part size`);
      assert.ok(slots[p.m] != null, `${it.id} uses unknown material slot ${p.m}`);
      // كل قطعة تقريباً داخل صندوق الأثاث
      const [w, d, h] = it.size;
      assert.ok(Math.abs(p.c[0]) <= w * 0.75 + 0.05 && Math.abs(p.c[1]) <= d * 0.75 + 0.05, `${it.id} part outside footprint`);
      assert.ok(p.c[2] >= -0.05 && p.c[2] <= h + 0.05, `${it.id} part outside height`);
    }
    for (const l of it.lights || []) assert.ok(['point', 'area', 'spot'].includes(l.type) && l.power > 0, `${it.id} light`);
  }
  const must = ['sofa', 'armchair', 'majlis-floor-seat', 'coffee-table', 'dining-table', 'dining-chair', 'bed-double', 'wardrobe', 'desk', 'office-chair', 'bookshelf', 'wall-shelf', 'rug', 'curtains', 'floor-lamp', 'table-lamp', 'pendant-lamp', 'plant-tall', 'tv-unit', 'kitchen-base', 'kitchen-island', 'kitchen-wall-cabinet', 'mirror-round', 'frame-art', 'ring-light', 'camera-tripod', 'mic-arm', 'shanasheel-screen'];
  for (const id of must) assert.ok(lib.catalog[id], `missing ${id}`);
});

test('catalog.json is in sync with its generator', () => {
  const onDisk = JSON.parse(fs.readFileSync(path.join(I.LIB_DIR, 'furniture', 'catalog.json'), 'utf8'));
  assert.deepStrictEqual(onDisk, JSON.parse(JSON.stringify(buildCatalog())), 'run: node library/interiors/furniture/build-catalog.js');
});

test('browser bundle.js is in sync with the library', () => {
  const onDisk = fs.readFileSync(path.join(I.LIB_DIR, 'bundle.js'), 'utf8');
  assert.strictEqual(onDisk, I.bundleSource(lib), 'run: node engine/interior.js bundle');
});

// ───────── المشهد ─────────
test('resolved scene: walls are cut for openings, materials and cameras complete', () => {
  for (const id of Object.keys(lib.rooms)) {
    const s = Core.resolveScene(lib.rooms[id], lib, { format: '9:16' });
    for (const o of s.objects) for (const p of o.parts) {
      assert.ok(s.materials[p.mat], `${id}/${o.id} material ${p.mat}`);
      assert.ok(p.s.every((v) => v > 0), `${id}/${o.id} size`);
    }
    assert.ok(s.cameras.stills.length >= 2, id);
    assert.ok(s.cameras.walkthrough.keys.length >= 2, id);
    const keys = s.cameras.walkthrough.keys;
    assert.ok(Math.abs(keys[keys.length - 1].t - s.cameras.walkthrough.seconds) < 1e-6);
    assert.ok(s.outputs.every((o) => o.width && o.height));
  }
  const living = Core.resolveScene(lib.rooms['living-room'], lib, {});
  const north = living.objects.find((o) => o.id === 'wall-north');
  assert.ok(north.parts.some((p) => living.materials[p.mat].kind === 'glass'), 'window glass');
  // جدار الشباك: قطعة تحت الشباك (sill) وقطعة فوقه
  const wallParts = north.parts.filter((p) => p.mat.startsWith('wall'));
  assert.ok(wallParts.length >= 4, 'wall split around window');
  const balcony = Core.resolveScene(lib.rooms.balcony, lib, {});
  assert.ok(!balcony.objects.some((o) => o.id === 'wall-south'), 'open side has no wall');
});

test('wall placement puts items flush and facing into the room', () => {
  const R = { width: 5, depth: 4, height: 2.8 };
  const cat = lib.catalog.sofa;
  const n = Core.placeItem({ type: 'sofa', wall: 'north', at: 2 }, cat, R);
  assert.strictEqual(n.rot, 0); assert.ok(Math.abs(n.y - (4 - cat.size[1] / 2 - 0.02)) < 1e-9);
  const w = Core.placeItem({ type: 'sofa', wall: 'west', at: 1.5 }, cat, R);
  assert.strictEqual(w.rot, 90); assert.ok(Math.abs(w.x - (cat.size[1] / 2 + 0.02)) < 1e-9);
  const e = Core.placeItem({ type: 'sofa', wall: 'east', at: 1.5 }, cat, R);
  assert.strictEqual(e.rot, -90);
  const pend = Core.placeItem({ type: 'pendant-lamp', position: [1, 1] }, lib.catalog['pendant-lamp'], R);
  assert.ok(Math.abs(pend.z + lib.catalog['pendant-lamp'].size[2] - 2.8) < 1e-9, 'ceiling items hang from the ceiling');
});

test('"on" stacks decor on top of its supporting item, even after a style swap', () => {
  const modern = Core.resolveScene(Core.newFromPreset('living-room', 'modern', lib), lib, {});
  const japandi = Core.resolveScene(Core.newFromPreset('living-room', 'japandi', lib), lib, {});
  const top = (s) => { const t = s.objects.find((o) => o.id === 'coffee-table'); return t.position[2] + t.size[2]; };
  for (const s of [modern, japandi]) assert.ok(Math.abs(s.objects.find((o) => o.id === 'vase').position[2] - top(s)) < 1e-6);
  assert.notStrictEqual(top(modern), top(japandi));
  const bad = Core.newFromPreset('living-room', 'modern', lib);
  bad.decor.find((i) => i.id === 'vase').on = 'ghost';
  assert.ok(Core.validateRoom(bad, lib).errors.some((e) => e.includes('ghost')));
});

test('before variant empties the room and keeps only marked items', () => {
  const room = Core.newFromPreset('bedroom', 'boho', lib);
  room.furniture.find((i) => i.id === 'bed').before = true;
  const s = Core.resolveScene(room, lib, { variant: 'before' });
  const items = s.objects.filter((o) => o.role === 'furniture' || o.role === 'decor');
  assert.deepStrictEqual(items.map((o) => o.id), ['bed']);
  assert.strictEqual(s.variant, 'before');
  assert.strictEqual(s.lighting.lamps.length, 0);
});

test('formats map to platform sizes', () => {
  assert.deepStrictEqual([Core.FORMATS['9:16'].width, Core.FORMATS['9:16'].height], [1080, 1920]);
  assert.deepStrictEqual([Core.FORMATS['16:9'].width, Core.FORMATS['16:9'].height], [1920, 1080]);
  assert.deepStrictEqual([Core.FORMATS['3:4'].width, Core.FORMATS['3:4'].height], [1080, 1440]);
  assert.strictEqual(Core.normFormat('reels'), '9:16');
  assert.strictEqual(Core.normFormat('tiktok'), '9:16');
  assert.strictEqual(Core.normFormat('YouTube'), '16:9');
  assert.strictEqual(Core.normFormat('carousel'), '3:4');
  assert.strictEqual(Core.normFormat('4:3'), null);
});

// ───────── إيجاد Blender ─────────
function fakeFs(files, dirs = {}) {
  return { exists: (p) => files.includes(p), readdir: (d) => { if (!(d in dirs)) throw new Error('ENOENT'); return dirs[d]; } };
}

test('findBlender: Windows Program Files picks the newest version', () => {
  const f = fakeFs(
    ['C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe', 'C:\\Program Files\\Blender Foundation\\Blender 3.6\\blender.exe'],
    { 'C:\\Program Files\\Blender Foundation': ['Blender 3.6', 'Blender 4.2', 'notes.txt'] },
  );
  const r = I.findBlender({ platform: 'win32', env: { PATH: 'C:\\Windows;C:\\Tools' }, ...f });
  assert.strictEqual(r.path, 'C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe');
  assert.strictEqual(r.source, 'Program Files');
});

test('findBlender: PATH wins over default locations; env override wins over all', () => {
  const f = fakeFs(['/home/u/bin/blender', '/usr/bin/blender', '/custom/blender']);
  assert.strictEqual(I.findBlender({ platform: 'linux', env: { PATH: '/usr/local/sbin:/home/u/bin' }, ...f }).path, '/home/u/bin/blender');
  assert.strictEqual(I.findBlender({ platform: 'linux', env: { PATH: '/home/u/bin', IO_BLENDER: '/custom/blender' }, ...f }).source, 'env:IO_BLENDER');
});

test('findBlender: macOS app bundle, snap/flatpak/portable on Linux, null when missing', () => {
  const mac = fakeFs(['/Applications/Blender.app/Contents/MacOS/Blender'], { '/Applications': ['Blender.app', 'Safari.app'] });
  assert.strictEqual(I.findBlender({ platform: 'darwin', env: { PATH: '/usr/bin' }, home: '/Users/s', ...mac }).path, '/Applications/Blender.app/Contents/MacOS/Blender');
  const snap = fakeFs(['/snap/bin/blender']);
  assert.strictEqual(I.findBlender({ platform: 'linux', env: {}, ...snap }).source, 'snap');
  const flat = fakeFs(['/home/s/.local/share/flatpak/exports/bin/org.blender.Blender']);
  assert.strictEqual(I.findBlender({ platform: 'linux', env: {}, home: '/home/s', ...flat }).source, 'flatpak (user)');
  const portable = fakeFs(['/opt/blender-4.2.3-linux-x64/blender', '/opt/blender-3.6.0-linux-x64/blender'], { '/opt': ['blender-3.6.0-linux-x64', 'blender-4.2.3-linux-x64'] });
  assert.strictEqual(I.findBlender({ platform: 'linux', env: {}, ...portable }).path, '/opt/blender-4.2.3-linux-x64/blender');
  assert.strictEqual(I.findBlender({ platform: 'linux', env: { PATH: '/usr/bin' }, ...fakeFs([]) }), null);
  assert.strictEqual(I.findBlender({ platform: 'win32', env: {}, ...fakeFs([]) }), null);
});

test('install hints name the right package manager per platform', () => {
  assert.match(I.installHint('win32'), /winget .*BlenderFoundation\.Blender/);
  assert.match(I.installHint('darwin'), /brew install --cask blender/);
  assert.match(I.installHint('linux'), /snap|apt/);
});

// ───────── CLI ─────────
test('CLI: new + validate + scene round trip', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'io-int-'));
  const out = path.join(dir, 'room.json');
  const cli = path.join(__dirname, '..', 'engine', 'interior.js');
  let r = spawnSync(process.execPath, [cli, 'new', 'kids-room', '--style', 'scandinavian', '--out', out], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(JSON.parse(fs.readFileSync(out, 'utf8')).style, 'scandinavian');
  r = spawnSync(process.execPath, [cli, 'validate', out], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  r = spawnSync(process.execPath, [cli, 'scene', out, '--format', '3:4'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(JSON.parse(r.stdout).format, '3:4');
});

test('Blender script dry-run reads the resolved scene (no Blender needed)', (t) => {
  const py = process.platform === 'win32' ? 'python' : 'python3';
  if (spawnSync(py, ['--version']).status !== 0) { t.skip('python3 not available'); return; }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'io-int-'));
  const sceneFile = path.join(dir, 'scene.json');
  fs.writeFileSync(sceneFile, JSON.stringify(Core.resolveScene(lib.rooms['creator-studio'], lib, { format: '9:16' })));
  const r = spawnSync(py, [path.join(__dirname, '..', 'engine', 'blender', 'build_room.py'), '--dry-run', '--scene', sceneFile], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /dry-run OK/);
  assert.match(r.stdout, /ring-light/);
});

test('serve.js gives the interior page its shared engine file (and nothing else under engine/)', async () => {
  const os = require('os');
  const http = require('http');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'io-int-serve-'));
  const { server, port } = await new Promise((resolve) => { require('../engine/serve.js').start(0, { dir, quiet: true, onListen: (s, p) => resolve({ server: s, port: p }) }); });
  const get = (u) => new Promise((resolve) => http.get({ host: '127.0.0.1', port, path: u }, (r) => { let b = ''; r.on('data', (c) => { b += c; }); r.on('end', () => resolve({ status: r.statusCode, body: b })); }));
  try {
    const ok = await get('/engine/blender/room-core.js');
    assert.strictEqual(ok.status, 200);
    assert.strictEqual(ok.body, fs.readFileSync(path.join(__dirname, '..', 'engine', 'blender', 'room-core.js'), 'utf8'));
    assert.strictEqual((await get('/engine/serve.js')).status, 404);
    assert.strictEqual((await get('/engine/blender/../data-dir.js')).status, 404);
  } finally { server.close(); }
});
