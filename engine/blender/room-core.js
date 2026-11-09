// I/O Studio — room-core: قلب مكتبة التصميم الداخلي.
// ملف واحد يشتغل بـ Node وبالمتصفح (UMD): يتحقق من room.json، يدمج الستايل،
// ويحوّل الغرفة لمشهد جاهز (scene) — جدران مقصوصة للأبواب والشبابيك، أثاث من
// أشكال بسيطة، مواد، إضاءة، كاميرات، ومسار جولة. نفس المشهد يبنيه Blender
// (build_room.py) ومعاينة المتصفح (web/interior.html)، فالنتيجة متطابقة.
//
// الإحداثيات: متر. x = العرض (من الغرب للشرق)، y = العمق (من الجنوب للشمال)،
// z = الارتفاع. زاوية الغرفة (0,0,0) = الجنوب الغربي على الأرض.
// rotation = درجات حول z. الأثاث بزاوية 0 وجهه نحو الجنوب (‎-y‎).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RoomCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VERSION = 1;
  const FORMATS = {
    '9:16': { width: 1080, height: 1920, lens: 15, label_ar: 'ريلز / شورتس / تيك توك (عمودي)' },
    '16:9': { width: 1920, height: 1080, lens: 18, label_ar: 'يوتيوب (عرضي)' },
    '3:4': { width: 1080, height: 1440, lens: 17, label_ar: 'كاروسيل إنستغرام' },
  };
  const FORMAT_ALIASES = {
    reel: '9:16', reels: '9:16', shorts: '9:16', tiktok: '9:16', story: '9:16', vertical: '9:16', '1080x1920': '9:16',
    youtube: '16:9', landscape: '16:9', wide: '16:9', '1920x1080': '16:9',
    carousel: '3:4', portrait: '3:4', '1080x1440': '3:4', '4:3': null,
  };
  const SIDES = ['north', 'south', 'east', 'west'];
  const SIDE_AR = { north: 'الشمالي (الخلفي)', south: 'الجنوبي (الأمامي)', east: 'الشرقي (اليمين)', west: 'الغربي (اليسار)' };
  const TIMES = {
    morning: { elev: 22, color: '#fff0d8', strength: 4, world: '#c9d6e4', worldStrength: 0.5, fill: 0.55, label_ar: 'الصبح' },
    noon: { elev: 55, color: '#fffaf2', strength: 5, world: '#d7e3ef', worldStrength: 0.65, fill: 0.65, label_ar: 'الظهر' },
    golden: { elev: 9, color: '#ffb36b', strength: 3.5, world: '#e8c7a5', worldStrength: 0.4, fill: 0.4, label_ar: 'الساعة الذهبية' },
    evening: { elev: 3, color: '#ff8a4c', strength: 1.2, world: '#56607e', worldStrength: 0.22, fill: 0.25, label_ar: 'المغرب' },
    night: { elev: -30, color: '#9fb4ff', strength: 0, world: '#0e1424', worldStrength: 0.06, fill: 0.12, label_ar: 'الليل' },
  };
  const WALL_T = 0.12;
  const HEX = /^#[0-9a-fA-F]{6}$/;

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const num = (v) => typeof v === 'number' && isFinite(v);
  const r4 = (v) => Math.round(v * 10000) / 10000;

  function normFormat(f) {
    if (f == null) return null;
    const k = String(f).trim().toLowerCase();
    if (FORMATS[k]) return k;
    if (Object.prototype.hasOwnProperty.call(FORMAT_ALIASES, k)) return FORMAT_ALIASES[k];
    return null;
  }

  function wallLength(room, side) {
    return side === 'north' || side === 'south' ? room.width : room.depth;
  }

  // ───────── المكتبة ─────────
  // lib = { styles: {id: style}, catalog: {id: item}, materials: {presets, slots}, rooms: {id: room} }
  function libraryFrom(parts) {
    const toMap = (v) => {
      if (!v) return {};
      if (Array.isArray(v)) return Object.fromEntries(v.map((x) => [x.id, x]));
      if (v.items && Array.isArray(v.items)) return Object.fromEntries(v.items.map((x) => [x.id, x]));
      return v;
    };
    return {
      styles: toMap(parts.styles),
      catalog: toMap(parts.catalog),
      materials: parts.materials || { presets: {}, slots: {} },
      rooms: toMap(parts.rooms),
    };
  }

  // ───────── المواد ─────────
  function resolveMaterial(spec, lib, depth = 0) {
    const presets = (lib.materials && lib.materials.presets) || {};
    if (depth > 6) return { kind: 'plain', color: '#888888', roughness: 0.7 };
    if (spec == null) return null;
    if (typeof spec === 'string') {
      if (HEX.test(spec)) return { kind: 'plain', color: spec.toLowerCase(), roughness: 0.6 };
      if (presets[spec]) return Object.assign({ preset: spec }, resolveMaterial(presets[spec], lib, depth + 1));
      return null;
    }
    if (typeof spec === 'object') {
      const base = spec.preset ? resolveMaterial(spec.preset, lib, depth + 1) || {} : {};
      const out = Object.assign({ kind: 'plain', roughness: 0.6 }, base, spec);
      if (!out.color) out.color = '#999999';
      return out;
    }
    return null;
  }

  function slotMaterial(slot, item, style, lib, primary = 'main') {
    const slots = (lib.materials && lib.materials.slots) || {};
    let def = null;
    if (item && item.materials && item.materials[slot] != null) def = resolveMaterial(item.materials[slot], lib);
    if (!def && item && slot === primary && item.material) def = resolveMaterial(item.material, lib);
    if (!def && style && style.materials && style.materials[slot] != null) def = resolveMaterial(style.materials[slot], lib);
    if (!def && slots[slot] != null) def = resolveMaterial(slots[slot], lib);
    if (!def) def = resolveMaterial(slots.main, lib) || { kind: 'plain', color: '#aaaaaa', roughness: 0.7 };
    def = Object.assign({}, def);
    if (item && slot === primary && item.color && HEX.test(item.color)) def.color = item.color.toLowerCase();
    if (item && slot === 'accent' && item.accent_color && HEX.test(item.accent_color)) def.color = item.accent_color.toLowerCase();
    return def;
  }

  // الخانة اللي يغيّرها "material" و "color" بالقطعة: main إذا موجودة، وإلا أول خانة
  function primarySlot(cat) {
    return cat.parts.some((p) => p.m === 'main') ? 'main' : cat.parts[0].m;
  }

  // ───────── وضع الأثاث ─────────
  function itemSize(it, cat) {
    const base = (Array.isArray(it.size) && it.size.length === 3) ? it.size : cat.size;
    const k = num(it.scale) ? it.scale : 1;
    return base.map((v) => v * k);
  }
  // يرجع {x, y, z, rot, size}
  function placeItem(it, cat, room, support) {
    const size = itemSize(it, cat);
    const [w, d, h] = size;
    let x, y, rot = num(it.rotation) ? it.rotation : 0;
    if (it.wall && SIDES.includes(it.wall)) {
      const along = num(it.at) ? it.at : wallLength(room, it.wall) / 2;
      const gap = num(it.gap) ? it.gap : 0.02;
      const off = d / 2 + gap;
      if (it.wall === 'north') { x = along; y = room.depth - off; rot = 0; }
      else if (it.wall === 'south') { x = along; y = off; rot = 180; }
      else if (it.wall === 'west') { x = off; y = along; rot = 90; }
      else { x = room.width - off; y = along; rot = -90; }
      if (num(it.rotation)) rot += it.rotation;
    } else {
      const p = Array.isArray(it.position) ? it.position : [room.width / 2, room.depth / 2];
      x = p[0]; y = p[1];
    }
    let z;
    const base = it.on && support && support[it.on];
    if (base) z = base.z + base.size[2] + (num(it.elevation) ? it.elevation : 0); // فوق قطعة ثانية (on)
    else if (num(it.elevation)) z = it.elevation;
    else if (Array.isArray(it.position) && num(it.position[2])) z = it.position[2];
    else if (cat.mount === 'ceiling') z = room.height - h;
    else z = num(cat.elevation) ? cat.elevation : 0;
    return { x, y, z, rot, size };
  }
  function footprint(pl) {
    const a = pl.rot * Math.PI / 180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
    const w = pl.size[0] * c + pl.size[1] * s, d = pl.size[0] * s + pl.size[1] * c;
    return { x0: pl.x - w / 2, x1: pl.x + w / 2, y0: pl.y - d / 2, y1: pl.y + d / 2 };
  }
  const allItems = (room) => [].concat(room.furniture || [], room.decor || []);
  // يحسب مكان كل القطع؛ القطع اللي عليها "on" تنحط فوق القطعة المذكورة
  function placeAll(room, lib) {
    const out = {}; const R = room.room;
    const items = allItems(room).filter((it) => lib.catalog[it.type]);
    for (const pass of [false, true]) {
      for (const it of items) {
        if (!!it.on !== pass || !it.id) continue;
        out[it.id] = placeItem(it, lib.catalog[it.type], R, out);
      }
    }
    return out;
  }

  // ───────── التحقق ─────────
  function validateRoom(room, lib) {
    const errors = [], warnings = [];
    const E = (m) => errors.push(m), W = (m) => warnings.push(m);
    if (!room || typeof room !== 'object') return { errors: ['الملف مو JSON صحيح لغرفة.'], warnings };
    if (room.version != null && room.version !== VERSION) W(`نسخة الملف ${room.version} — المتوقع ${VERSION}.`);
    const R = room.room;
    if (!R || !num(R.width) || !num(R.depth) || !num(R.height)) {
      E('لازم "room" بيه width و depth و height بالمتر.');
      return { errors, warnings };
    }
    if (R.width < 1 || R.width > 30) E(`عرض الغرفة ${R.width} م غير منطقي (1–30).`);
    if (R.depth < 1 || R.depth > 30) E(`عمق الغرفة ${R.depth} م غير منطقي (1–30).`);
    if (R.height < 2 || R.height > 8) E(`ارتفاع السقف ${R.height} م غير منطقي (2–8).`);
    if (room.style && lib && !lib.styles[room.style]) E(`الستايل "${room.style}" مو موجود بالمكتبة.`);

    const seenSides = new Set();
    for (const w of room.walls || []) {
      if (!SIDES.includes(w.side)) { E(`جدار بجهة غير معروفة "${w.side}" — استخدم north/south/east/west.`); continue; }
      if (seenSides.has(w.side)) E(`الجدار ${SIDE_AR[w.side]} مكرر.`);
      seenSides.add(w.side);
      if (w.color && !HEX.test(w.color)) E(`لون الجدار ${SIDE_AR[w.side]} لازم يكون #RRGGBB.`);
      const L = wallLength(R, w.side);
      const ops = (w.openings || []).slice().sort((a, b) => a.offset - b.offset);
      let lastEnd = -1;
      for (const o of ops) {
        const nm = o.type === 'door' ? 'الباب' : o.type === 'window' ? 'الشباك' : 'الفتحة';
        if (!['door', 'window', 'opening'].includes(o.type)) E(`نوع فتحة غير معروف "${o.type}" بالجدار ${SIDE_AR[w.side]}.`);
        if (!num(o.offset) || !num(o.width) || !num(o.height)) { E(`${nm} بالجدار ${SIDE_AR[w.side]} يحتاج offset و width و height.`); continue; }
        const sill = num(o.sill) ? o.sill : (o.type === 'window' ? 0.9 : 0);
        if (o.offset < 0 || o.offset + o.width > L + 1e-6) E(`${nm} بالجدار ${SIDE_AR[w.side]} طالع برا الجدار (طول الجدار ${L} م).`);
        if (sill + o.height > R.height + 1e-6) E(`${nm} بالجدار ${SIDE_AR[w.side]} أعلى من السقف.`);
        if (o.offset < lastEnd - 1e-6) E(`فتحتين متداخلات بالجدار ${SIDE_AR[w.side]}.`);
        lastEnd = o.offset + o.width;
      }
    }
    for (const k of ['floor', 'ceiling']) {
      const m = room[k] && room[k].material;
      if (m != null && lib && !resolveMaterial(m, lib)) E(`مادة ${k === 'floor' ? 'الأرضية' : 'السقف'} "${typeof m === 'string' ? m : JSON.stringify(m)}" مو معروفة.`);
    }
    const lt = room.lighting || {};
    if (lt.time_of_day && !TIMES[lt.time_of_day]) E(`وقت الإضاءة "${lt.time_of_day}" مو معروف (${Object.keys(TIMES).join(', ')}).`);
    for (const [i, l] of (lt.lamps || []).entries()) {
      if (!Array.isArray(l.position) || l.position.length !== 3) E(`الضوء رقم ${i + 1} يحتاج position [x,y,z].`);
      if (l.type && !['point', 'area', 'spot'].includes(l.type)) E(`نوع الضوء "${l.type}" مو معروف.`);
    }

    const ids = new Set();
    const placed = [];
    const support = lib ? placeAll(room, lib) : {};
    allItems(room).forEach((it, i) => {
      const label = it.id || `${it.type || '?'}#${i + 1}`;
      if (it.id) { if (ids.has(it.id)) E(`المعرّف "${it.id}" مكرر.`); ids.add(it.id); }
      const cat = lib && lib.catalog[it.type];
      if (!cat) { E(`"${label}": النوع "${it.type}" مو موجود بكتالوج الأثاث.`); return; }
      if (it.size && (!Array.isArray(it.size) || it.size.length !== 3 || it.size.some((v) => !(v > 0)))) E(`"${label}": size لازم [عرض، عمق، ارتفاع] أرقام موجبة.`);
      if (it.position && (!Array.isArray(it.position) || it.position.length < 2 || !it.position.slice(0, 2).every(num))) E(`"${label}": position لازم [x, y].`);
      if (it.wall && !SIDES.includes(it.wall)) E(`"${label}": wall لازم north/south/east/west.`);
      if (!it.position && !it.wall) W(`"${label}": ماكو position ولا wall — راح ينحط بنص الغرفة.`);
      if (it.rotation != null && !num(it.rotation)) E(`"${label}": rotation لازم رقم (درجات).`);
      if (it.color && !HEX.test(it.color)) E(`"${label}": اللون لازم #RRGGBB.`);
      if (it.material && lib && !resolveMaterial(it.material, lib)) E(`"${label}": المادة "${typeof it.material === 'string' ? it.material : '…'}" مو معروفة.`);
      if (it.on && !allItems(room).some((o) => o.id === it.on)) E(`"${label}": on = "${it.on}" مو موجود بالغرفة.`);
      const pl = placeItem(it, cat, R, support);
      const fp = footprint(pl);
      const tol = 0.03;
      if (fp.x0 < -tol || fp.y0 < -tol || fp.x1 > R.width + tol || fp.y1 > R.depth + tol) W(`"${label}" طالع شوية برا حدود الغرفة.`);
      if (pl.z + pl.size[2] > R.height + 0.02) W(`"${label}" أعلى من السقف.`);
      placed.push({ label, cat, pl, fp, it });
    });
    // تداخل الأثاث الأرضي
    const solid = placed.filter((p) => p.cat.mount === 'floor' && !p.cat.flat && !p.it.allow_overlap && p.pl.z < 0.05);
    for (let i = 0; i < solid.length; i++) for (let j = i + 1; j < solid.length; j++) {
      const a = solid[i].fp, b = solid[j].fp, t = 0.08;
      if (a.x0 + t < b.x1 && b.x0 + t < a.x1 && a.y0 + t < b.y1 && b.y0 + t < a.y1) W(`"${solid[i].label}" متداخل مع "${solid[j].label}".`);
    }

    const cams = room.cameras || {};
    for (const [i, c] of (cams.stills || []).entries()) {
      if (!Array.isArray(c.position) || c.position.length !== 3 || !Array.isArray(c.target) || c.target.length !== 3) E(`اللقطة ${c.name || i + 1} تحتاج position و target ثلاثية.`);
      else if (c.position[0] < 0 || c.position[1] < 0 || c.position[0] > R.width || c.position[1] > R.depth || c.position[2] > R.height) W(`الكاميرا "${c.name || i + 1}" برا الغرفة — راح تصوّر الجدار من برّا.`);
      else {
        const [x, y, z] = c.position;
        const hit = placed.find((p) => !p.cat.flat && x > p.fp.x0 && x < p.fp.x1 && y > p.fp.y0 && y < p.fp.y1 && z > p.pl.z && z < p.pl.z + p.pl.size[2]);
        if (hit) W(`الكاميرا "${c.name || i + 1}" داخل "${hit.label}" — الصورة راح تطلع مسدودة. حرّك الكاميرا أو القطعة.`);
      }
    }
    const wt = cams.walkthrough;
    if (wt) {
      if (wt.points && (!Array.isArray(wt.points) || wt.points.length < 2)) E('مسار الجولة يحتاج نقطتين على الأقل.');
      if (wt.seconds != null && !(wt.seconds > 0 && wt.seconds <= 120)) E('مدة الجولة لازم بين 1 و 120 ثانية.');
    }
    for (const f of room.outputs || []) if (!normFormat(f)) E(`صيغة الإخراج "${f}" مو معروفة — استخدم 9:16 أو 16:9 أو 3:4.`);
    return { errors, warnings };
  }

  // ───────── دمج القالب مع الستايل ─────────
  function applyStyle(room, styleId, lib) {
    const style = lib.styles[styleId];
    if (!style) throw new Error(`الستايل "${styleId}" مو موجود.`);
    const r = clone(room);
    r.style = styleId;
    const swaps = style.swaps || {};
    for (const list of [r.furniture || [], r.decor || []]) {
      for (const it of list) {
        const orig = it.swapped_from || it.type;
        const to = swaps[orig];
        if (to && to !== orig && lib.catalog[to]) {
          it.swapped_from = orig; it.type = to;
        } else if (it.swapped_from && !to) {
          it.type = it.swapped_from; delete it.swapped_from; // رجّع النوع الأصلي لما نغيّر لستايل ثاني
        }
      }
    }
    r.lighting = Object.assign({}, r.lighting || {});
    if (!r.lighting.time_of_day_locked && style.lighting && style.lighting.time_of_day) r.lighting.time_of_day = style.lighting.time_of_day;
    return r;
  }
  function newFromPreset(presetId, styleId, lib) {
    const preset = lib.rooms[presetId];
    if (!preset) throw new Error(`القالب "${presetId}" مو موجود.`);
    const base = clone(preset);
    base.preset = presetId;
    delete base.description_ar;
    return applyStyle(base, styleId || preset.style || 'modern', lib);
  }

  // ───────── المشهد ─────────
  function rotZ(v, deg) {
    const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
  }

  function resolveScene(room, lib, opts = {}) {
    const R = room.room;
    const W = R.width, D = R.depth, H = R.height;
    const style = lib.styles[room.style] || lib.styles.modern || null;
    const fmt = normFormat(opts.format) || normFormat((room.outputs || [])[0]) || '9:16';
    const variant = opts.variant || 'styled'; // styled | before
    const materials = {}; const matKeys = {};
    function mat(def, hint) {
      const key = JSON.stringify(def);
      if (matKeys[key]) return matKeys[key];
      const name = `${hint}${Object.keys(materials).filter((n) => n.split('.')[0] === hint).length ? '.' + Object.keys(materials).filter((n) => n.split('.')[0] === hint).length : ''}`;
      materials[name] = def; matKeys[key] = name; return name;
    }
    const BEFORE = { kind: 'plain', color: '#cfcac2', roughness: 0.9 };
    const beforeMat = (slot, def) => {
      if (variant !== 'before') return def;
      if (['glass', 'mirror', 'light', 'neon', 'water'].includes(slot)) return def;
      if (slot === 'wall') return { kind: 'plaster', color: '#d9d4cb', roughness: 0.95 };
      if (slot === 'floor') return { kind: 'tile', color: '#b9b4ab', color2: '#8f8a82', roughness: 0.6, scale: 0.5 };
      return Object.assign({}, BEFORE);
    };
    const roomMat = (slot, override) => {
      const def = override != null ? (resolveMaterial(override, lib) || slotMaterial(slot, null, style, lib)) : slotMaterial(slot, null, style, lib);
      return mat(beforeMat(slot, def), slot);
    };

    const objects = [];
    // الأرضية والسقف
    const floorMat = roomMat('floor', room.floor && room.floor.material);
    const ceilMat = roomMat('ceiling', room.ceiling && room.ceiling.material);
    objects.push({ id: 'floor', role: 'floor', position: [0, 0, 0], rotation: 0, parts: [{ shape: 'box', c: [W / 2, D / 2, -0.03], s: [W + 2 * WALL_T, D + 2 * WALL_T, 0.06], mat: floorMat, uv: 'world' }] });
    objects.push({ id: 'ceiling', role: 'ceiling', position: [0, 0, 0], rotation: 0, parts: [{ shape: 'box', c: [W / 2, D / 2, H + 0.03], s: [W + 2 * WALL_T, D + 2 * WALL_T, 0.06], mat: ceilMat }] });

    // الجدران
    const trimMat = roomMat('trim');
    const frameMat = roomMat('frame');
    const doorMat = roomMat('door');
    const glassMat = mat(slotMaterial('glass', null, style, lib), 'glass');
    const metalMat = mat(slotMaterial('metal', null, style, lib), 'metal');
    const wallsBySide = Object.fromEntries((room.walls || []).map((w) => [w.side, w]));
    const windows = [];
    for (const side of SIDES) {
      const w = wallsBySide[side] || { side };
      if (w.open) continue;
      const L = wallLength(R, side);
      let wDef = w.material != null ? resolveMaterial(w.material, lib) : slotMaterial('wall', null, style, lib);
      if (!wDef) wDef = slotMaterial('wall', null, style, lib);
      if (w.color) wDef = Object.assign({}, wDef, { color: w.color.toLowerCase() });
      const wMat = mat(beforeMat('wall', wDef), 'wall');
      // u = على امتداد الجدار، الصندوق بإحداثيات العالم
      const ext = side === 'north' || side === 'south' ? WALL_T : 0; // تسكير الزوايا
      const toBox = (u0, u1, z0, z1, inset = 0, depth = WALL_T) => {
        // inset: مسافة من الوجه الداخلي للجدار للداخل (موجب = داخل الغرفة)
        const cu = (u0 + u1) / 2, lu = u1 - u0, cz = (z0 + z1) / 2, lz = z1 - z0;
        const cv = -depth / 2 + inset; // بالنسبة للوجه الداخلي، السالب = برّا
        if (side === 'north') return { c: [cu, D - cv, cz], s: [lu, depth, lz] };
        if (side === 'south') return { c: [cu, cv, cz], s: [lu, depth, lz] };
        if (side === 'east') return { c: [W - cv, cu, cz], s: [depth, lu, lz] };
        return { c: [cv, cu, cz], s: [depth, lu, lz] };
      };
      const parts = [];
      const ops = (w.openings || []).filter((o) => num(o.offset) && num(o.width) && num(o.height)).slice().sort((a, b) => a.offset - b.offset);
      let u = -ext;
      for (const o of ops) {
        const sill = num(o.sill) ? o.sill : (o.type === 'window' ? 0.9 : 0);
        const u0 = Math.max(0, o.offset), u1 = Math.min(L, o.offset + o.width), top = Math.min(H, sill + o.height);
        if (u0 > u + 1e-4) parts.push(Object.assign({ shape: 'box', mat: wMat }, toBox(u, u0, 0, H)));
        if (sill > 1e-4) parts.push(Object.assign({ shape: 'box', mat: wMat }, toBox(u0, u1, 0, sill)));
        if (top < H - 1e-4) parts.push(Object.assign({ shape: 'box', mat: wMat }, toBox(u0, u1, top, H)));
        const fw = 0.05;
        if (o.type !== 'opening') {
          // إطار
          const fd = WALL_T + 0.02;
          parts.push(Object.assign({ shape: 'box', mat: frameMat }, toBox(u0 - fw, u0, sill, top + fw, 0.01, fd)));
          parts.push(Object.assign({ shape: 'box', mat: frameMat }, toBox(u1, u1 + fw, sill, top + fw, 0.01, fd)));
          parts.push(Object.assign({ shape: 'box', mat: frameMat }, toBox(u0, u1, top, top + fw, 0.01, fd)));
        }
        if (o.type === 'window') {
          parts.push(Object.assign({ shape: 'box', mat: frameMat }, toBox(u0 - fw, u1 + fw, sill - 0.04, sill, 0.05, WALL_T + 0.06)));
          parts.push(Object.assign({ shape: 'box', mat: glassMat, glass: true }, toBox(u0, u1, sill, top, -WALL_T / 2 + 0.01, 0.02)));
          const mull = (u0 + u1) / 2;
          parts.push(Object.assign({ shape: 'box', mat: frameMat }, toBox(mull - 0.02, mull + 0.02, sill, top, -WALL_T / 2 + 0.03, 0.06)));
          windows.push({ side, u0, u1, sill, top });
        } else if (o.type === 'door' && !o.open) {
          parts.push(Object.assign({ shape: 'box', mat: doorMat, b: 0.004 }, toBox(u0, u1, 0, top, 0.0, 0.04)));
          const hu = o.hinge === 'right' ? u0 + 0.08 : u1 - 0.08;
          parts.push(Object.assign({ shape: 'box', mat: metalMat }, toBox(hu - 0.06, hu + 0.06, 1.0, 1.03, 0.06, 0.03)));
        }
        u = u1;
      }
      if (u < L + ext - 1e-4) parts.push(Object.assign({ shape: 'box', mat: wMat }, toBox(u, L + ext, 0, H)));
      // وزرة (نعلة) أسفل الجدار، تنقطع عند الأبواب
      let bu = 0;
      for (const o of ops.filter((x) => x.type !== 'window' && !(num(x.sill) && x.sill > 0.1))) {
        if (o.offset > bu + 0.02) parts.push(Object.assign({ shape: 'box', mat: trimMat }, toBox(bu, o.offset - 0.05, 0, 0.09, 0.015, 0.015)));
        bu = o.offset + o.width + 0.05;
      }
      if (bu < L - 0.02) parts.push(Object.assign({ shape: 'box', mat: trimMat }, toBox(bu, L, 0, 0.09, 0.015, 0.015)));
      objects.push({ id: `wall-${side}`, role: 'wall', side, position: [0, 0, 0], rotation: 0, parts: parts.map((p) => Object.assign(p, { c: p.c.map(r4), s: p.s.map(r4) })) });
    }

    // الأثاث
    const lamps = [];
    const lt = room.lighting || {};
    const lampColor = lt.lamp_color || (style && style.lighting && style.lighting.lamp_color) || '#ffd9a8';
    const keep = (it) => variant !== 'before' || it.before === true || (room.before && Array.isArray(room.before.keep) && room.before.keep.includes(it.id));
    const support = placeAll(room, lib);
    allItems(room).forEach((it, idx) => {
      const cat = lib.catalog[it.type];
      if (!cat || it.hidden || !keep(it)) return;
      const pl = placeItem(it, cat, R, support);
      const f = pl.size.map((v, i) => v / cat.size[i]);
      const fmin = Math.min(...f);
      const slotCache = {};
      const primary = primarySlot(cat);
      const parts = cat.parts.map((p) => {
        if (!slotCache[p.m]) slotCache[p.m] = mat(beforeMat(p.m, slotMaterial(p.m, it, style, lib, primary)), p.m);
        const q = { shape: p.shape, c: p.c.map((v, i) => r4(v * f[i])), s: p.s.map((v, i) => r4(v * f[i])), mat: slotCache[p.m] };
        if (p.r) q.r = p.r;
        if (p.b) q.b = r4(p.b * fmin);
        return q;
      });
      const isDecor = (room.decor || []).includes(it);
      objects.push({
        id: it.id || `${it.type}-${idx + 1}`, type: it.type, name_ar: cat.name_ar, role: isDecor ? 'decor' : 'furniture',
        mount: cat.mount, position: [r4(pl.x), r4(pl.y), r4(pl.z)], rotation: r4(pl.rot), size: pl.size.map(r4), primary_mat: slotCache[primary], parts,
      });
      if (it.light !== false && cat.lights) {
        for (const L0 of cat.lights) {
          const local = L0.c.map((v, i) => v * f[i]);
          const w = rotZ(local, pl.rot);
          let color = lampColor;
          if (L0.color === 'neon') color = slotMaterial('neon', it, style, lib).color;
          else if (L0.color) color = L0.color;
          if (it.light_color && HEX.test(it.light_color)) color = it.light_color;
          const lamp = { type: L0.type, position: [r4(pl.x + w[0]), r4(pl.y + w[1]), r4(pl.z + w[2])], power: L0.power * (num(it.light_power) ? it.light_power : 1), color, size: r4(L0.size * fmin), from: it.id || it.type };
          if (L0.aim) lamp.direction = rotZ(L0.aim, pl.rot).map(r4);
          if (variant === 'before') lamp.power *= 0.0;
          if (lamp.power > 0) lamps.push(lamp);
        }
      }
    });
    for (const l of lt.lamps || []) {
      lamps.push({ type: l.type || 'point', position: l.position, power: num(l.power) ? l.power : 100, color: l.color || lampColor, size: num(l.size) ? l.size : 0.3, direction: l.direction || null, from: 'room' });
    }

    // الشمس والسماء
    const tod = variant === 'before' ? 'noon' : (lt.time_of_day && TIMES[lt.time_of_day] ? lt.time_of_day : 'morning');
    const T = TIMES[tod];
    const winSide = windows.length ? windows[0].side : 'north';
    const baseAz = { north: 0, east: 90, south: 180, west: 270 }[winSide];
    const az = (num(lt.sun_azimuth) ? lt.sun_azimuth : baseAz + 28) * Math.PI / 180;
    const el = T.elev * Math.PI / 180;
    const toSun = [Math.sin(az) * Math.cos(el), Math.cos(az) * Math.cos(el), Math.sin(el)];
    const sunStrength = num(lt.sun_strength) ? lt.sun_strength : T.strength;
    const sun = sunStrength > 0 && T.elev > 0 ? { direction: toSun.map((v) => r4(-v)), color: T.color, strength: sunStrength, angle: 2.5 } : null;
    const fillPower = (num(lt.fill) ? lt.fill : T.fill) * W * D * 22 * (variant === 'before' ? 1.4 : 1);
    const fill = fillPower > 0 ? { position: [W / 2, D / 2, H - 0.02], size: [W * 0.7, D * 0.7], power: r4(fillPower), color: variant === 'before' ? '#f4f6ff' : (tod === 'night' || tod === 'evening' ? '#ffe8cf' : '#fff6ea') } : null;

    // الكاميرات
    const lens0 = FORMATS[fmt].lens;
    const cams = room.cameras || {};
    let stills = (cams.stills || []).map((c, i) => ({ name: c.name || `shot-${i + 1}`, position: c.position, target: c.target, lens: c.lens || lens0 }));
    const furn = objects.filter((o) => o.role === 'furniture' && o.mount === 'floor');
    const focus = furn.length
      ? [furn.reduce((a, o) => a + o.position[0], 0) / furn.length, furn.reduce((a, o) => a + o.position[1], 0) / furn.length, 0.75]
      : [W / 2, D * 0.6, 0.8];
    if (!stills.length) {
      stills = [
        { name: 'wide', position: [W * 0.86, 0.3, Math.min(1.5, H - 0.4)], target: [W * 0.35, D * 0.72, 0.85], lens: lens0, auto: true },
        { name: 'front', position: [W / 2, 0.25, 1.3], target: [W / 2, D, 1.05], lens: lens0, auto: true },
        { name: 'detail', position: [W * 0.25, D * 0.3, 0.9], target: [focus[0], focus[1], 0.55], lens: Math.round(lens0 * 1.6), auto: true },
      ];
    }
    const wt = cams.walkthrough || {};
    const eye = num(wt.height) ? wt.height : 1.55;
    let pts = Array.isArray(wt.points) && wt.points.length >= 2 ? wt.points : [[W * 0.5, 0.35], [W * 0.38, D * 0.32], [W * 0.5, D * 0.5]];
    pts = pts.map((p) => [p[0], p[1], num(p[2]) ? p[2] : eye]);
    const seconds = num(wt.seconds) ? wt.seconds : 8;
    const fps = num(wt.fps) ? wt.fps : 30;
    const lens = wt.lens || lens0;
    const segLen = []; let total = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]); segLen.push(d); total += d; }
    let acc = 0;
    const keys = pts.map((p, i) => {
      if (i > 0) acc += segLen[i - 1];
      let target;
      if (Array.isArray(wt.target)) target = wt.target;
      else if (wt.look === 'ahead') {
        const nx = pts[Math.min(i + 1, pts.length - 1)], pv = pts[Math.max(i - 1, 0)];
        const dx = nx[0] - pv[0], dy = nx[1] - pv[1], n = Math.hypot(dx, dy) || 1;
        target = [p[0] + dx / n * 2, p[1] + dy / n * 2, p[2] - 0.3];
      } else target = focus;
      return { t: r4(total ? acc / total * seconds : i / (pts.length - 1) * seconds), position: p.map(r4), target: target.map(r4) };
    });

    const outputs = (room.outputs && room.outputs.length ? room.outputs : ['9:16', '16:9', '3:4']).map(normFormat).filter(Boolean)
      .map((f) => Object.assign({ format: f }, FORMATS[f]));

    return {
      version: VERSION, name: room.name || room.preset || 'room', style: style ? style.id : null, variant, format: fmt,
      room: { width: W, depth: D, height: H, wall_thickness: WALL_T },
      materials, objects,
      lighting: { time_of_day: tod, sun, world: { color: T.world, strength: T.worldStrength }, fill, lamps },
      cameras: { stills, walkthrough: { fps, seconds, lens, keys } },
      outputs,
    };
  }

  function sceneStats(scene) {
    let parts = 0;
    for (const o of scene.objects) parts += o.parts.length;
    return { objects: scene.objects.length, parts, materials: Object.keys(scene.materials).length, lamps: scene.lighting.lamps.length, cameras: scene.cameras.stills.length };
  }

  return {
    VERSION, FORMATS, FORMAT_ALIASES, SIDES, SIDE_AR, TIMES, WALL_T,
    normFormat, libraryFrom, resolveMaterial, slotMaterial, primarySlot, itemSize, placeItem, placeAll, footprint,
    validateRoom, applyStyle, newFromPreset, resolveScene, sceneStats, clone,
  };
});
