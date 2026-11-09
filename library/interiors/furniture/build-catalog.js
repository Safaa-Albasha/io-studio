#!/usr/bin/env node
// يولّد furniture/catalog.json من أشكال بسيطة (مكعب، أسطوانة، كرة، مخروط، حلقة).
// كل قطعة أثاث مبنية بالكود — ماكو موديلات منزّلة، فكلشي أصلي.
// التشغيل: node library/interiors/furniture/build-catalog.js
//
// صيغة القطعة (part):
//   shape: box | cyl | sphere | cone | torus
//   c: [x, y, z]  مركز القطعة بالمتر، نسبةً لمركز أرضية الأثاث (z من الأرض)
//   s: [w, d, h]  الأبعاد بالمتر (للأسطوانة: القطر × القطر × الطول)
//   m: خانة المادة (main, accent, wood, metal, fabric, cushion, rug, stone, glass,
//      light, leaf, pot, screen, ceramic, mirror, frame, paper, art, black)
//   r: [rx, ry, rz] دوران بالدرجات حول مركز القطعة (اختياري)
//   b: حافة مدوّرة (bevel) بالمتر (اختياري)
// الواجهة الأمامية للأثاث باتجاه ‎-y‎ (يعني تباوع الكاميرا لما rotation = 0).
'use strict';
const fs = require('fs');
const path = require('path');

const r3 = (v) => Math.round(v * 1000) / 1000;
function part(shape, c, s, m, o = {}) {
  const p = { shape, c: c.map(r3), s: s.map(r3), m };
  if (o.r) p.r = o.r;
  if (o.b) p.b = o.b;
  return p;
}
// z هنا = أسفل القطعة (أسهل بالكتابة) ونحوّله لمركز
const box = (x, y, z, w, d, h, m, o) => part('box', [x, y, z + h / 2], [w, d, h], m, o);
const cyl = (x, y, z, dia, h, m, o) => part('cyl', [x, y, z + h / 2], [dia, dia, h], m, o);
const sph = (x, y, z, dia, m, o) => part('sphere', [x, y, z + dia / 2], [dia, dia, dia], m, o);
const ell = (x, y, z, w, d, h, m, o) => part('sphere', [x, y, z + h / 2], [w, d, h], m, o);
const cone = (x, y, z, dia, h, m, o) => part('cone', [x, y, z + h / 2], [dia, dia, h], m, o);
const tor = (x, y, z, dia, th, m, o) => part('torus', [x, y, z], [dia, dia, th], m, o); // z = مركز
// قطعة بمركز صريح (للقطع المدوّرة)
const at = (shape, cx, cy, cz, w, d, h, m, o) => part(shape, [cx, cy, cz], [w, d, h], m, o);

function legs4(W, D, h, t, m, inset = 0.05, round = false) {
  const xs = W / 2 - inset - t / 2, ys = D / 2 - inset - t / 2, out = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    out.push(round ? cyl(sx * xs, sy * ys, 0, t, h, m) : box(sx * xs, sy * ys, 0, t, t, h, m));
  }
  return out;
}
function books(x0, y, z, width, depth, maxH, seed = 1) {
  const out = []; let x = x0; let k = seed;
  const mats = ['accent', 'paper', 'fabric', 'black', 'art'];
  while (x < x0 + width - 0.03) {
    k = (k * 9301 + 49297) % 233280;
    const t = 0.025 + (k % 30) / 1000, h = maxH * (0.72 + (k % 25) / 100);
    out.push(box(x + t / 2, y, z, t, depth, Math.min(h, maxH), mats[k % mats.length]));
    x += t + 0.004;
  }
  return out;
}

const items = [];
function add(id, name_ar, name_en, category, size, parts, extra = {}) {
  items.push(Object.assign({ id, name_ar, name_en, category, size, mount: 'floor' }, extra, { parts }));
}

// ───────── جلوس ─────────
function sofa(W, seats) {
  const D = 0.95, p = [
    box(0, 0.02, 0.12, W, D - 0.04, 0.3, 'main', { b: 0.03 }),
    box(0, D / 2 - 0.12, 0.12, W, 0.24, 0.73, 'main', { b: 0.04 }),
    box(-W / 2 + 0.1, 0, 0.12, 0.2, D, 0.6, 'main', { b: 0.05 }),
    box(W / 2 - 0.1, 0, 0.12, 0.2, D, 0.6, 'main', { b: 0.05 }),
    ...legs4(W, D, 0.12, 0.05, 'wood', 0.06, true),
  ];
  const inner = W - 0.4, sw = inner / seats;
  for (let i = 0; i < seats; i++) {
    const x = -inner / 2 + sw * (i + 0.5);
    p.push(box(x, -0.07, 0.42, sw - 0.02, 0.7, 0.16, 'main', { b: 0.05 }));
    p.push(box(x, D / 2 - 0.3, 0.55, sw - 0.04, 0.18, 0.42, 'cushion', { b: 0.06 }));
  }
  p.push(box(-inner / 2 + 0.25, D / 2 - 0.42, 0.58, 0.42, 0.12, 0.4, 'accent', { b: 0.05, r: [-12, 0, 8] }));
  p.push(box(inner / 2 - 0.25, D / 2 - 0.42, 0.58, 0.42, 0.12, 0.4, 'accent', { b: 0.05, r: [-12, 0, -8] }));
  return p;
}
add('sofa', 'كنبة ثلاثية', 'Sofa (3-seat)', 'seating', [2.2, 0.95, 0.85], sofa(2.2, 3), { tags: ['living'] });
add('loveseat', 'كنبة شخصين', 'Loveseat', 'seating', [1.6, 0.95, 0.85], sofa(1.6, 2), { tags: ['living'] });
add('sectional', 'كنبة زاوية L', 'Sectional sofa (L)', 'seating', [2.8, 1.8, 0.85], (() => {
  const p = sofa(2.8, 3).map((q) => q);
  p.push(box(-1.0, -0.4, 0.12, 0.8, 1.0, 0.3, 'main', { b: 0.03 }));
  p.push(box(-1.0, -0.45, 0.42, 0.76, 0.95, 0.16, 'main', { b: 0.05 }));
  p.push(...legs4(0.8, 0.2, 0.12, 0.05, 'wood', 0.06, true).map((q) => { q.c[0] -= 1.0; q.c[1] -= 0.8; return q; }));
  return p;
})(), { tags: ['living'] });
add('armchair', 'كرسي مفرد (أرمشير)', 'Armchair', 'seating', [0.85, 0.85, 0.85], [
  box(0, 0.02, 0.12, 0.85, 0.81, 0.3, 'main', { b: 0.03 }),
  box(0, 0.31, 0.12, 0.85, 0.22, 0.73, 'main', { b: 0.04 }),
  box(-0.34, 0, 0.12, 0.17, 0.85, 0.58, 'main', { b: 0.05 }),
  box(0.34, 0, 0.12, 0.17, 0.85, 0.58, 'main', { b: 0.05 }),
  box(0, -0.07, 0.42, 0.5, 0.62, 0.15, 'main', { b: 0.05 }),
  box(0, 0.12, 0.55, 0.42, 0.12, 0.36, 'accent', { b: 0.05, r: [-10, 0, 0] }),
  ...legs4(0.85, 0.85, 0.12, 0.045, 'wood', 0.06, true),
], { tags: ['living', 'bedroom'] });
add('rattan-chair', 'كرسي خيزران دائري', 'Round rattan chair', 'seating', [0.8, 0.75, 0.8], [
  cyl(0, 0, 0, 0.42, 0.05, 'wood'),
  ell(0, 0, 0.05, 0.8, 0.75, 0.45, 'rattan'),
  at('torus', 0, 0.12, 0.55, 0.8, 0.6, 0.12, 'rattan', { r: [-55, 0, 0] }),
  cyl(0, -0.02, 0.4, 0.62, 0.1, 'cushion', { b: 0.03 }),
], { tags: ['boho', 'balcony'] });
add('majlis-floor-seat', 'جلسة مجلس أرضية', 'Majlis floor seating', 'seating', [2.4, 0.8, 0.62], [
  box(0, 0, 0, 2.4, 0.8, 0.12, 'wood', { b: 0.01 }),
  box(0, -0.04, 0.12, 2.36, 0.7, 0.14, 'main', { b: 0.04 }),
  box(0, 0.29, 0.12, 2.36, 0.2, 0.5, 'main', { b: 0.06 }),
  ...[-0.8, 0, 0.8].map((x) => box(x, 0.17, 0.26, 0.74, 0.14, 0.36, 'accent', { b: 0.06, r: [-8, 0, 0] })),
  at('cyl', -1.1, -0.02, 0.38, 0.24, 0.24, 0.62, 'accent', { r: [90, 0, 0] }),
  at('cyl', 1.1, -0.02, 0.38, 0.24, 0.24, 0.62, 'accent', { r: [90, 0, 0] }),
], { tags: ['majlis', 'gulf', 'baghdadi'] });
add('majlis-armrest', 'مسند (تكاية)', 'Majlis armrest bolster', 'seating', [0.3, 0.65, 0.32], [
  at('cyl', 0, 0, 0.16, 0.3, 0.3, 0.65, 'accent', { r: [90, 0, 0] }),
  at('torus', 0, -0.33, 0.16, 0.3, 0.3, 0.04, 'metal', { r: [90, 0, 0] }),
], { tags: ['majlis', 'gulf'] });
add('floor-cushion', 'مخدة أرضية', 'Floor cushion', 'seating', [0.7, 0.7, 0.16], [
  box(0, 0, 0, 0.7, 0.7, 0.16, 'accent', { b: 0.06 }),
], { tags: ['majlis', 'boho', 'kids'] });
add('pouf', 'بوف دائري', 'Pouf', 'seating', [0.5, 0.5, 0.42], [
  cyl(0, 0, 0, 0.5, 0.42, 'fabric', { b: 0.05 }),
  tor(0, 0, 0.21, 0.5, 0.04, 'accent'),
], { tags: ['boho', 'moroccan'] });
add('ottoman', 'أوتومان (مسند رجول)', 'Ottoman', 'seating', [0.9, 0.6, 0.42], [
  box(0, 0, 0.1, 0.9, 0.6, 0.32, 'main', { b: 0.05 }),
  ...legs4(0.9, 0.6, 0.1, 0.04, 'wood', 0.06, true),
], { tags: ['living'] });
add('bench', 'مصطبة', 'Bench', 'seating', [1.4, 0.4, 0.46], [
  box(0, 0, 0.4, 1.4, 0.4, 0.06, 'wood', { b: 0.01 }),
  box(-0.6, 0, 0, 0.06, 0.36, 0.4, 'wood'),
  box(0.6, 0, 0, 0.06, 0.36, 0.4, 'wood'),
], { tags: ['dining', 'balcony', 'japandi'] });
add('dining-chair', 'كرسي سفرة', 'Dining chair', 'seating', [0.45, 0.5, 0.9], [
  ...legs4(0.45, 0.5, 0.45, 0.035, 'wood', 0.02),
  box(0, 0, 0.43, 0.45, 0.48, 0.05, 'main', { b: 0.02 }),
  box(0, 0.22, 0.45, 0.42, 0.04, 0.45, 'wood', { b: 0.01 }),
], { tags: ['dining', 'cafe'] });
add('office-chair', 'كرسي مكتب', 'Office chair', 'seating', [0.65, 0.65, 1.15], [
  ...[0, 72, 144, 216, 288].map((a) => {
    const rad = a * Math.PI / 180;
    return at('box', Math.sin(rad) * 0.15, -Math.cos(rad) * 0.15, 0.06, 0.04, 0.32, 0.04, 'black', { r: [0, 0, a] });
  }),
  ...[0, 72, 144, 216, 288].map((a) => {
    const rad = a * Math.PI / 180;
    return sph(Math.sin(rad) * 0.29, -Math.cos(rad) * 0.29, 0, 0.05, 'black');
  }),
  cyl(0, 0, 0.06, 0.05, 0.36, 'metal'),
  box(0, 0, 0.42, 0.52, 0.5, 0.08, 'main', { b: 0.03 }),
  box(0, 0.24, 0.55, 0.48, 0.06, 0.58, 'main', { b: 0.04, r: [-8, 0, 0] }),
  box(-0.27, 0.02, 0.5, 0.04, 0.3, 0.2, 'black'),
  box(0.27, 0.02, 0.5, 0.04, 0.3, 0.2, 'black'),
  box(-0.27, 0.02, 0.68, 0.07, 0.3, 0.03, 'black'),
  box(0.27, 0.02, 0.68, 0.07, 0.3, 0.03, 'black'),
], { tags: ['office', 'creator'] });
add('bar-stool', 'كرسي بار', 'Bar stool', 'seating', [0.4, 0.4, 0.75], [
  cyl(0, 0, 0.72, 0.38, 0.05, 'main', { b: 0.015 }),
  cyl(0, 0, 0, 0.36, 0.02, 'metal'),
  cyl(0, 0, 0.02, 0.05, 0.7, 'metal'),
  tor(0, 0, 0.28, 0.3, 0.02, 'metal'),
], { tags: ['kitchen', 'cafe'] });
add('beanbag', 'بين باگ', 'Beanbag', 'seating', [0.85, 0.85, 0.7], [
  ell(0, 0, 0, 0.85, 0.85, 0.5, 'accent'),
  ell(0, 0.18, 0.22, 0.7, 0.4, 0.48, 'accent'),
], { tags: ['kids', 'creator'] });
add('kids-chair', 'كرسي أطفال', 'Kids chair', 'seating', [0.32, 0.32, 0.55], [
  ...legs4(0.32, 0.32, 0.28, 0.03, 'wood', 0.01),
  box(0, 0, 0.28, 0.32, 0.32, 0.03, 'accent', { b: 0.01 }),
  box(0, 0.14, 0.31, 0.3, 0.03, 0.24, 'accent', { b: 0.01 }),
], { tags: ['kids'] });
add('outdoor-chair', 'كرسي برندة', 'Outdoor chair', 'seating', [0.6, 0.62, 0.8], [
  ...legs4(0.6, 0.62, 0.4, 0.03, 'metal', 0.03, true),
  box(0, 0, 0.4, 0.58, 0.58, 0.04, 'wood'),
  box(0, 0.27, 0.44, 0.56, 0.04, 0.36, 'wood', { r: [-8, 0, 0] }),
  box(0, -0.02, 0.44, 0.5, 0.5, 0.06, 'cushion', { b: 0.02 }),
], { tags: ['balcony'] });

// ───────── طاولات ─────────
add('coffee-table', 'طاولة وسط', 'Coffee table', 'table', [1.1, 0.6, 0.42], [
  box(0, 0, 0.38, 1.1, 0.6, 0.04, 'wood', { b: 0.01 }),
  box(0, 0, 0.1, 1.0, 0.5, 0.02, 'wood'),
  ...legs4(1.1, 0.6, 0.38, 0.04, 'metal', 0.03),
], { tags: ['living'] });
add('coffee-table-round', 'طاولة وسط دائرية', 'Round coffee table', 'table', [0.85, 0.85, 0.4], [
  cyl(0, 0, 0.36, 0.85, 0.04, 'stone', { b: 0.008 }),
  cyl(0, 0, 0, 0.45, 0.36, 'wood'),
], { tags: ['living'] });
add('coffee-table-low', 'طاولة يابانية واطية', 'Low coffee table', 'table', [1.2, 0.6, 0.3], [
  box(0, 0, 0.26, 1.2, 0.6, 0.04, 'wood', { b: 0.008 }),
  box(-0.52, 0, 0, 0.08, 0.52, 0.26, 'wood'),
  box(0.52, 0, 0, 0.08, 0.52, 0.26, 'wood'),
], { tags: ['japandi', 'minimal'] });
add('side-table', 'طاولة جانبية', 'Side table', 'table', [0.45, 0.45, 0.55], [
  cyl(0, 0, 0.52, 0.45, 0.03, 'wood'),
  cyl(0, 0, 0, 0.3, 0.02, 'metal'),
  cyl(0, 0, 0.02, 0.04, 0.5, 'metal'),
], { tags: ['living', 'bedroom'] });
add('dining-table', 'طاولة سفرة', 'Dining table', 'table', [1.8, 0.9, 0.75], [
  box(0, 0, 0.71, 1.8, 0.9, 0.04, 'wood', { b: 0.008 }),
  box(0, 0.4, 0.6, 1.6, 0.03, 0.11, 'wood'),
  box(0, -0.4, 0.6, 1.6, 0.03, 0.11, 'wood'),
  ...legs4(1.8, 0.9, 0.71, 0.06, 'wood', 0.06),
], { tags: ['dining'] });
add('dining-table-round', 'طاولة سفرة دائرية', 'Round dining table', 'table', [1.1, 1.1, 0.75], [
  cyl(0, 0, 0.71, 1.1, 0.04, 'wood', { b: 0.008 }),
  cone(0, 0, 0.0, 0.55, 0.12, 'wood'),
  cyl(0, 0, 0.1, 0.12, 0.62, 'wood'),
], { tags: ['dining', 'cafe'] });
add('console-table', 'كونسول', 'Console table', 'table', [1.2, 0.35, 0.8], [
  box(0, 0, 0.76, 1.2, 0.35, 0.04, 'wood', { b: 0.006 }),
  box(0, 0, 0.12, 1.1, 0.3, 0.02, 'wood'),
  ...legs4(1.2, 0.35, 0.76, 0.03, 'metal', 0.02),
], { tags: ['living', 'entry'] });
add('desk', 'مكتب', 'Desk', 'table', [1.4, 0.7, 0.75], [
  box(0, 0, 0.72, 1.4, 0.7, 0.03, 'wood', { b: 0.005 }),
  box(0.45, -0.02, 0.48, 0.42, 0.62, 0.24, 'main', { b: 0.005 }),
  ...legs4(1.4, 0.7, 0.72, 0.04, 'metal', 0.03),
], { tags: ['office', 'creator', 'bedroom'] });
add('creator-desk', 'مكتب صانع محتوى (ستاند)', 'Creator standing desk', 'table', [1.6, 0.75, 0.75], [
  box(0, 0, 0.71, 1.6, 0.75, 0.04, 'wood', { b: 0.006 }),
  box(-0.65, 0, 0, 0.08, 0.65, 0.02, 'black'),
  box(0.65, 0, 0, 0.08, 0.65, 0.02, 'black'),
  box(-0.65, 0, 0.02, 0.07, 0.07, 0.69, 'black'),
  box(0.65, 0, 0.02, 0.07, 0.07, 0.69, 'black'),
  box(0, 0.2, 0.62, 1.3, 0.05, 0.05, 'black'),
  box(0, -0.05, 0.75, 0.9, 0.35, 0.004, 'fabric'),
], { tags: ['creator', 'office'] });
add('nightstand', 'كومودينو', 'Nightstand', 'storage', [0.5, 0.4, 0.55], [
  box(0, 0, 0.1, 0.5, 0.4, 0.45, 'wood', { b: 0.008 }),
  box(0, -0.201, 0.38, 0.44, 0.005, 0.13, 'main'),
  box(0, -0.205, 0.44, 0.1, 0.01, 0.015, 'metal'),
  ...legs4(0.5, 0.4, 0.1, 0.03, 'wood', 0.03, true),
], { tags: ['bedroom'] });
add('tea-tray-table', 'صينية شاي على ستاند', 'Tea tray table', 'table', [0.6, 0.6, 0.36], [
  cyl(0, 0, 0.32, 0.6, 0.02, 'metal'),
  tor(0, 0, 0.345, 0.6, 0.025, 'metal'),
  at('box', 0, 0, 0.16, 0.04, 0.5, 0.04, 'wood', { r: [55, 0, 0] }),
  at('box', 0, 0, 0.16, 0.04, 0.5, 0.04, 'wood', { r: [-55, 0, 0] }),
  ...[-0.12, 0, 0.12].map((x) => cyl(x, -0.08, 0.34, 0.05, 0.07, 'glass')),
], { tags: ['majlis', 'gulf', 'baghdadi'] });
add('bistro-table', 'طاولة كافيه صغيرة', 'Bistro table', 'table', [0.6, 0.6, 0.75], [
  cyl(0, 0, 0.72, 0.6, 0.03, 'stone', { b: 0.005 }),
  cyl(0, 0, 0, 0.42, 0.02, 'metal'),
  cyl(0, 0, 0.02, 0.06, 0.7, 'metal'),
], { tags: ['cafe', 'balcony'] });
add('kids-desk', 'مكتب أطفال', 'Kids desk', 'table', [0.9, 0.5, 0.55], [
  box(0, 0, 0.52, 0.9, 0.5, 0.03, 'wood', { b: 0.008 }),
  ...legs4(0.9, 0.5, 0.52, 0.05, 'accent', 0.02, true),
], { tags: ['kids'] });

// ───────── نوم ─────────
add('bed-double', 'سرير دبل', 'Double bed', 'bed', [1.8, 2.1, 1.1], [
  box(0, 0, 0.1, 1.8, 2.05, 0.22, 'wood', { b: 0.01 }),
  ...legs4(1.8, 2.05, 0.1, 0.06, 'wood', 0.04),
  box(0, -0.03, 0.32, 1.72, 1.95, 0.22, 'paper', { b: 0.05 }),
  box(0, 1.0, 0.1, 1.8, 0.1, 1.0, 'main', { b: 0.03 }),
  box(-0.42, 0.78, 0.54, 0.7, 0.3, 0.16, 'cushion', { b: 0.06, r: [-20, 0, 0] }),
  box(0.42, 0.78, 0.54, 0.7, 0.3, 0.16, 'cushion', { b: 0.06, r: [-20, 0, 0] }),
  box(0, -0.42, 0.53, 1.78, 1.1, 0.04, 'fabric', { b: 0.02 }),
  box(0, -0.8, 0.565, 1.6, 0.35, 0.03, 'accent', { b: 0.01 }),
], { tags: ['bedroom'] });
add('bed-single', 'سرير مفرد', 'Single bed', 'bed', [1.0, 2.05, 0.9], [
  box(0, 0, 0.12, 1.0, 2.0, 0.2, 'wood', { b: 0.01 }),
  ...legs4(1.0, 2.0, 0.12, 0.05, 'wood', 0.03),
  box(0, -0.02, 0.32, 0.94, 1.92, 0.2, 'paper', { b: 0.05 }),
  box(0, 0.98, 0.12, 1.0, 0.08, 0.78, 'main', { b: 0.03 }),
  box(0, 0.75, 0.52, 0.7, 0.3, 0.14, 'cushion', { b: 0.05, r: [-18, 0, 0] }),
  box(0, -0.4, 0.52, 0.98, 1.1, 0.04, 'fabric', { b: 0.02 }),
], { tags: ['bedroom', 'kids'] });
add('bunk-bed', 'سرير طابقين', 'Bunk bed', 'bed', [1.0, 2.05, 1.65], [
  ...legs4(1.0, 2.05, 1.65, 0.06, 'wood', 0.0),
  box(0, 0, 0.2, 0.94, 1.95, 0.08, 'wood'),
  box(0, 0, 0.28, 0.9, 1.9, 0.16, 'paper', { b: 0.04 }),
  box(0, 0, 1.0, 0.94, 1.95, 0.08, 'wood'),
  box(0, 0, 1.08, 0.9, 1.9, 0.14, 'fabric', { b: 0.04 }),
  box(0, -0.6, 1.3, 0.94, 0.04, 0.18, 'accent'),
  box(0, 0.6, 1.3, 0.94, 0.04, 0.18, 'accent'),
  ...[0.45, 0.7, 0.95, 1.2].map((z) => box(0.47, -0.9, z, 0.04, 0.32, 0.03, 'wood')),
], { tags: ['kids'] });
add('crib', 'سرير طفل (مهد)', 'Crib', 'bed', [0.7, 1.25, 0.9], [
  box(0, 0, 0.25, 0.66, 1.2, 0.12, 'paper', { b: 0.03 }),
  ...legs4(0.7, 1.25, 0.9, 0.04, 'wood', 0),
  box(-0.33, 0, 0.86, 0.03, 1.25, 0.04, 'wood'),
  box(0.33, 0, 0.86, 0.03, 1.25, 0.04, 'wood'),
  box(0, -0.6, 0.86, 0.7, 0.03, 0.04, 'wood'),
  box(0, 0.6, 0.86, 0.7, 0.03, 0.04, 'wood'),
  ...Array.from({ length: 9 }, (_, i) => box(-0.33, -0.5 + i * 0.125, 0.25, 0.02, 0.02, 0.6, 'wood')),
  ...Array.from({ length: 9 }, (_, i) => box(0.33, -0.5 + i * 0.125, 0.25, 0.02, 0.02, 0.6, 'wood')),
], { tags: ['kids'] });

// ───────── تخزين ─────────
add('wardrobe', 'كنتور (دولاب)', 'Wardrobe', 'storage', [1.6, 0.6, 2.2], [
  box(0, 0, 0.06, 1.6, 0.6, 2.14, 'main', { b: 0.005 }),
  box(0, 0, 0, 1.56, 0.56, 0.06, 'black'),
  box(0, -0.302, 0.08, 0.004, 0.004, 2.1, 'black'),
  box(-0.4, -0.302, 0.08, 0.004, 0.004, 2.1, 'black'),
  box(0.4, -0.302, 0.08, 0.004, 0.004, 2.1, 'black'),
  ...[-0.06, 0.06, -0.46, 0.46].map((x) => box(x, -0.315, 0.9, 0.02, 0.02, 0.35, 'metal')),
], { tags: ['bedroom', 'kids'] });
add('dresser', 'تسريحة / درج', 'Dresser', 'storage', [1.2, 0.5, 0.8], [
  box(0, 0, 0.1, 1.2, 0.5, 0.7, 'wood', { b: 0.006 }),
  ...legs4(1.2, 0.5, 0.1, 0.04, 'wood', 0.04),
  ...[0.18, 0.4, 0.62].map((z) => box(0, -0.252, z, 1.12, 0.006, 0.2, 'main')),
  ...[0.28, 0.5, 0.72].map((z) => box(0, -0.262, z, 0.22, 0.015, 0.02, 'metal')),
], { tags: ['bedroom'] });
add('bookshelf', 'مكتبة كتب', 'Bookshelf', 'storage', [0.9, 0.32, 1.9], (() => {
  const p = [
    box(-0.435, 0, 0, 0.03, 0.32, 1.9, 'wood'), box(0.435, 0, 0, 0.03, 0.32, 1.9, 'wood'),
    box(0, 0.15, 0, 0.84, 0.02, 1.9, 'wood'),
  ];
  [0, 0.45, 0.9, 1.35, 1.87].forEach((z, i) => {
    p.push(box(0, 0, z, 0.84, 0.32, 0.03, 'wood'));
    if (i < 4) p.push(...books(-0.4, 0, z + 0.03, i % 2 ? 0.5 : 0.62, 0.22, 0.3, i + 3));
  });
  p.push(sph(0.28, 0, 0.48, 0.14, 'ceramic'));
  p.push(cyl(0.3, 0, 1.38, 0.12, 0.12, 'pot'), sph(0.3, 0, 1.46, 0.2, 'leaf'));
  return p;
})(), { tags: ['living', 'office', 'creator'] });
add('wall-shelf', 'رف حائط', 'Wall shelf', 'storage', [1.0, 0.25, 0.32], [
  box(0, 0, 0, 1.0, 0.25, 0.03, 'wood'),
  ...books(-0.45, 0, 0.03, 0.35, 0.18, 0.26, 7),
  cyl(0.15, 0, 0.03, 0.1, 0.16, 'ceramic'),
  cyl(0.35, 0, 0.03, 0.12, 0.1, 'pot'), sph(0.35, 0, 0.1, 0.18, 'leaf'),
], { mount: 'wall', elevation: 1.45, tags: ['living', 'office', 'creator', 'kids'] });
add('cube-shelf', 'رف مكعبات', 'Cube shelf', 'storage', [1.5, 0.4, 0.8], (() => {
  const p = [box(0, 0, 0, 1.5, 0.4, 0.03, 'main'), box(0, 0, 0.385, 1.5, 0.4, 0.03, 'main'), box(0, 0, 0.77, 1.5, 0.4, 0.03, 'main')];
  [-0.735, -0.37, 0, 0.37, 0.735].forEach((x) => p.push(box(x, 0, 0, 0.03, 0.4, 0.8, 'main')));
  p.push(box(-0.55, 0, 0.03, 0.32, 0.34, 0.3, 'fabric', { b: 0.02 }));
  p.push(box(0.18, 0, 0.415, 0.32, 0.34, 0.3, 'accent', { b: 0.02 }));
  p.push(...books(-0.33, 0, 0.415, 0.3, 0.26, 0.3, 11));
  return p;
})(), { tags: ['living', 'kids', 'creator'] });
add('tv-unit', 'ميز تلفزيون', 'TV unit', 'storage', [1.8, 0.42, 0.5], [
  box(0, 0, 0.12, 1.8, 0.42, 0.38, 'main', { b: 0.006 }),
  box(-0.45, -0.212, 0.15, 0.86, 0.006, 0.32, 'wood'),
  box(0.45, -0.212, 0.15, 0.86, 0.006, 0.32, 'wood'),
  ...legs4(1.8, 0.42, 0.12, 0.035, 'metal', 0.06, true),
], { tags: ['living'] });
add('sideboard', 'بوفيه', 'Sideboard', 'storage', [1.6, 0.45, 0.8], [
  box(0, 0, 0.15, 1.6, 0.45, 0.65, 'wood', { b: 0.006 }),
  ...[-0.53, 0, 0.53].map((x) => box(x, -0.227, 0.19, 0.5, 0.006, 0.57, 'main')),
  ...legs4(1.6, 0.45, 0.15, 0.04, 'metal', 0.05, true),
], { tags: ['dining', 'living', 'classic'] });
add('toy-box', 'صندوق ألعاب', 'Toy box', 'storage', [0.8, 0.45, 0.5], [
  box(0, 0, 0, 0.8, 0.45, 0.46, 'accent', { b: 0.02 }),
  box(0, 0, 0.46, 0.82, 0.47, 0.04, 'main', { b: 0.01 }),
  sph(-0.2, -0.24, 0.15, 0.14, 'main'),
], { tags: ['kids'] });

// ───────── مطبخ ─────────
function counter(W) {
  return [
    box(0, 0.02, 0.1, W, 0.56, 0.76, 'main', { b: 0.004 }),
    box(0, 0.04, 0, W - 0.04, 0.5, 0.1, 'black'),
    box(0, 0, 0.86, W, 0.6, 0.04, 'stone', { b: 0.004 }),
    box(0, -0.262, 0.12, 0.004, 0.004, 0.72, 'black'),
  ];
}
add('kitchen-base', 'كاونتر مطبخ (وحدة)', 'Kitchen base cabinet', 'kitchen', [0.6, 0.6, 0.9], [
  ...counter(0.6), box(0, -0.272, 0.72, 0.3, 0.015, 0.015, 'metal'),
], { tags: ['kitchen'] });
add('kitchen-sink', 'مغسلة مطبخ', 'Kitchen sink unit', 'kitchen', [0.8, 0.6, 1.2], [
  ...counter(0.8),
  box(0, -0.03, 0.8, 0.5, 0.38, 0.105, 'metal'),
  cyl(0, 0.22, 0.9, 0.04, 0.28, 'metal'),
  at('cyl', 0, 0.13, 1.17, 0.03, 0.03, 0.2, 'metal', { r: [90, 0, 0] }),
], { tags: ['kitchen'] });
add('kitchen-stove', 'طباخ مع فرن', 'Stove & oven', 'kitchen', [0.6, 0.6, 0.9], [
  ...counter(0.6),
  box(0, -0.265, 0.2, 0.52, 0.01, 0.48, 'screen'),
  box(0, -0.28, 0.62, 0.4, 0.02, 0.02, 'metal'),
  box(0, 0, 0.9, 0.56, 0.52, 0.006, 'screen'),
  ...[[-0.13, -0.12], [0.13, -0.12], [-0.13, 0.12], [0.13, 0.12]].map(([x, y]) => tor(x, y, 0.91, 0.16, 0.012, 'black')),
], { tags: ['kitchen'] });
add('kitchen-wall-cabinet', 'كبت مطبخ علوي', 'Kitchen wall cabinet', 'kitchen', [0.6, 0.35, 0.7], [
  box(0, 0, 0, 0.6, 0.35, 0.7, 'main', { b: 0.004 }),
  box(0, -0.176, 0.02, 0.004, 0.004, 0.66, 'black'),
  box(-0.06, -0.185, 0.05, 0.015, 0.015, 0.15, 'metal'),
], { mount: 'wall', elevation: 1.45, tags: ['kitchen'] });
add('kitchen-island', 'جزيرة مطبخ', 'Kitchen island', 'kitchen', [1.8, 0.9, 0.92], [
  box(0, 0.05, 0.08, 1.7, 0.7, 0.8, 'main', { b: 0.004 }),
  box(0, 0.05, 0, 1.66, 0.66, 0.08, 'black'),
  box(0, 0, 0.88, 1.8, 0.9, 0.04, 'stone', { b: 0.005 }),
  ...[-0.42, 0, 0.42].map((x) => box(x, 0.401, 0.12, 0.004, 0.004, 0.72, 'black')),
], { tags: ['kitchen'] });
add('fridge', 'ثلاجة', 'Fridge', 'kitchen', [0.75, 0.7, 1.85], [
  box(0, 0, 0.02, 0.75, 0.7, 1.83, 'metal', { b: 0.02 }),
  box(0, -0.352, 1.15, 0.73, 0.006, 0.006, 'black'),
  box(-0.3, -0.37, 1.2, 0.02, 0.03, 0.4, 'black'),
  box(-0.3, -0.37, 0.7, 0.02, 0.03, 0.35, 'black'),
], { tags: ['kitchen'] });
add('range-hood', 'شفاط مطبخ', 'Range hood', 'kitchen', [0.6, 0.5, 0.9], [
  box(0, 0, 0, 0.6, 0.5, 0.08, 'metal'),
  at('cone', 0, 0, 0.2, 0.62, 0.5, 0.25, 'metal'),
  box(0, 0.05, 0.3, 0.24, 0.24, 0.6, 'metal'),
], { mount: 'wall', elevation: 1.6, tags: ['kitchen'] });
add('espresso-machine', 'مكينة قهوة', 'Espresso machine', 'kitchen', [0.35, 0.4, 0.4], [
  box(0, 0, 0, 0.35, 0.4, 0.4, 'metal', { b: 0.02 }),
  box(0, -0.2, 0.06, 0.28, 0.08, 0.02, 'black'),
  cyl(0, -0.2, 0.2, 0.06, 0.04, 'black'),
  cyl(0, -0.15, 0.08, 0.07, 0.08, 'ceramic'),
], { mount: 'surface', elevation: 0.9, tags: ['kitchen', 'cafe'] });
add('bar-counter', 'كاونتر كافيه', 'Café bar counter', 'kitchen', [2.0, 0.6, 1.05], [
  box(0, 0, 0, 2.0, 0.55, 1.0, 'main', { b: 0.005 }),
  box(0, -0.03, 1.0, 2.06, 0.62, 0.05, 'stone', { b: 0.005 }),
  box(0, -0.28, 0.02, 2.0, 0.02, 0.12, 'metal'),
], { tags: ['cafe', 'kitchen'] });

// ───────── حمام ─────────
add('bathtub', 'بانيو', 'Bathtub', 'bath', [1.7, 0.75, 0.76], [
  box(0, 0, 0, 1.7, 0.75, 0.58, 'ceramic', { b: 0.05 }),
  box(0, 0, 0.2, 1.54, 0.6, 0.39, 'water', { b: 0.04 }),
  cyl(0.7, 0.28, 0.58, 0.04, 0.18, 'metal'),
], { tags: ['bath'] });
add('shower-glass', 'شاور زجاج', 'Glass shower', 'bath', [0.9, 0.9, 2.0], [
  box(0, 0, 0, 0.9, 0.9, 0.06, 'ceramic'),
  box(0, -0.44, 0.06, 0.9, 0.01, 1.94, 'glass'),
  box(-0.44, 0, 0.06, 0.01, 0.9, 1.94, 'glass'),
  box(0, -0.44, 1.98, 0.9, 0.02, 0.02, 'metal'),
  cyl(0.2, 0.3, 1.9, 0.22, 0.02, 'metal'),
  box(0.2, 0.42, 1.92, 0.02, 0.24, 0.02, 'metal'),
], { tags: ['bath'] });
add('toilet', 'تواليت', 'Toilet', 'bath', [0.4, 0.65, 0.78], [
  ell(0, -0.05, 0, 0.38, 0.5, 0.42, 'ceramic'),
  ell(0, -0.07, 0.38, 0.38, 0.48, 0.05, 'ceramic'),
  box(0, 0.24, 0.4, 0.38, 0.17, 0.38, 'ceramic', { b: 0.03 }),
], { tags: ['bath'] });
add('vanity', 'مغسلة مع كبت', 'Vanity', 'bath', [0.9, 0.5, 1.08], [
  box(0, 0, 0.15, 0.9, 0.48, 0.65, 'main', { b: 0.005 }),
  box(0, 0, 0.8, 0.92, 0.5, 0.04, 'stone'),
  ell(0, -0.02, 0.84, 0.44, 0.34, 0.12, 'ceramic'),
  cyl(0, 0.18, 0.84, 0.03, 0.22, 'metal'),
  at('cyl', 0, 0.12, 1.05, 0.025, 0.025, 0.13, 'metal', { r: [90, 0, 0] }),
], { tags: ['bath'] });
add('towel-rail', 'علاكة خاولي', 'Towel rail', 'bath', [0.6, 0.1, 0.5], [
  at('cyl', 0, 0, 0.45, 0.025, 0.025, 0.6, 'metal', { r: [0, 90, 0] }),
  box(0.05, -0.02, 0.05, 0.4, 0.03, 0.42, 'fabric', { b: 0.01 }),
], { mount: 'wall', elevation: 0.9, tags: ['bath'] });

// ───────── إضاءة ─────────
add('floor-lamp', 'إضاءة أرضية (ستاند)', 'Floor lamp', 'lighting', [0.4, 0.4, 1.6], [
  cyl(0, 0, 0, 0.3, 0.03, 'metal'),
  cyl(0, 0, 0.03, 0.025, 1.3, 'metal'),
  cone(0, 0, 1.3, 0.42, 0.3, 'paper', { r: [0, 0, 0] }),
], { tags: ['living', 'bedroom'], lights: [{ type: 'point', c: [0, 0, 1.38], power: 60, size: 0.12 }] });
add('table-lamp', 'أباجورة', 'Table lamp', 'lighting', [0.3, 0.3, 0.5], [
  sph(0, 0, 0, 0.18, 'ceramic'),
  cyl(0, 0, 0.17, 0.02, 0.12, 'metal'),
  cyl(0, 0, 0.27, 0.3, 0.22, 'paper'),
], { mount: 'surface', elevation: 0.55, tags: ['bedroom', 'living'], lights: [{ type: 'point', c: [0, 0, 0.36], power: 30, size: 0.08 }] });
add('pendant-lamp', 'تعليقة سقف', 'Pendant lamp', 'lighting', [0.42, 0.42, 0.9], [
  cyl(0, 0, 0.88, 0.1, 0.02, 'metal'),
  cyl(0, 0, 0.3, 0.012, 0.58, 'black'),
  at('sphere', 0, 0, 0.2, 0.42, 0.42, 0.42, 'paper'),
], { mount: 'ceiling', tags: ['living', 'dining', 'kitchen'], lights: [{ type: 'point', c: [0, 0, 0.18], power: 70, size: 0.1 }] });
add('chandelier', 'ثريا', 'Chandelier', 'lighting', [0.85, 0.85, 0.85], (() => {
  const p = [cyl(0, 0, 0.8, 0.14, 0.05, 'metal'), cyl(0, 0, 0.3, 0.02, 0.5, 'metal'), tor(0, 0, 0.3, 0.75, 0.025, 'metal'), sph(0, 0, 0.18, 0.16, 'metal')];
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, x = Math.cos(a) * 0.36, y = Math.sin(a) * 0.36;
    p.push(cyl(x, y, 0.31, 0.04, 0.08, 'metal'), cone(x, y, 0.39, 0.06, 0.12, 'light'));
    p.push(sph(x * 0.85, y * 0.85, 0.12, 0.05, 'glass'));
  }
  return p;
})(), { mount: 'ceiling', tags: ['classic', 'neo-classic', 'dining'], lights: [{ type: 'point', c: [0, 0, 0.42], power: 150, size: 0.4 }] });
add('wall-sconce', 'إضاءة جدارية', 'Wall sconce', 'lighting', [0.2, 0.18, 0.3], [
  box(0, 0.08, 0.08, 0.1, 0.02, 0.14, 'metal'),
  cyl(0, -0.01, 0.02, 0.15, 0.26, 'paper'),
], { mount: 'wall', elevation: 1.65, tags: ['bedroom', 'living', 'classic'], lights: [{ type: 'point', c: [0, -0.01, 0.15], power: 25, size: 0.06 }] });
add('moroccan-lantern', 'فانوس مغربي', 'Moroccan lantern', 'lighting', [0.36, 0.36, 0.9], [
  cyl(0, 0, 0.3, 0.012, 0.6, 'metal'),
  cone(0, 0, 0.25, 0.3, 0.12, 'metal', { r: [0, 0, 0] }),
  part('cyl', [0, 0, 0.16], [0.34, 0.34, 0.2], 'light'),
  tor(0, 0, 0.08, 0.34, 0.03, 'metal'),
  tor(0, 0, 0.16, 0.36, 0.02, 'metal'),
  tor(0, 0, 0.24, 0.34, 0.03, 'metal'),
  cone(0, 0, 0.0, 0.2, 0.06, 'metal', { r: [180, 0, 0] }),
], { mount: 'ceiling', tags: ['moroccan', 'boho', 'majlis'], lights: [{ type: 'point', c: [0, 0, 0.16], power: 50, size: 0.1 }] });
add('ceiling-fan', 'پنكة سقفية', 'Ceiling fan', 'lighting', [1.2, 1.2, 0.4], [
  cyl(0, 0, 0.36, 0.12, 0.04, 'metal'),
  cyl(0, 0, 0.12, 0.03, 0.24, 'metal'),
  cyl(0, 0, 0.0, 0.2, 0.12, 'metal', { b: 0.02 }),
  ...[0, 90, 180, 270].map((a) => {
    const rad = a * Math.PI / 180;
    return at('box', Math.cos(rad) * 0.36, Math.sin(rad) * 0.36, 0.08, 0.5, 0.12, 0.012, 'wood', { r: [0, 0, a] });
  }),
], { mount: 'ceiling', tags: ['bedroom', 'living', 'baghdadi'] });
add('ring-light', 'رنگ لايت', 'Ring light', 'lighting', [0.5, 0.5, 1.75], [
  ...[0, 120, 240].map((a) => {
    const rad = a * Math.PI / 180;
    return at('box', Math.sin(rad) * 0.13, -Math.cos(rad) * 0.13, 0.12, 0.025, 0.32, 0.025, 'black', { r: [50, 0, a] });
  }),
  cyl(0, 0, 0.2, 0.03, 1.25, 'black'),
  at('torus', 0, 0, 1.55, 0.46, 0.46, 0.05, 'light', { r: [90, 0, 0] }),
  at('box', 0, -0.02, 1.48, 0.08, 0.01, 0.15, 'screen'),
], { tags: ['creator'], lights: [{ type: 'area', c: [0, -0.05, 1.55], power: 60, size: 0.42, aim: [0, -1, 0] }] });
add('softbox', 'سوفت بوكس', 'Softbox light', 'lighting', [0.6, 0.6, 1.85], [
  ...[0, 120, 240].map((a) => {
    const rad = a * Math.PI / 180;
    return at('box', Math.sin(rad) * 0.15, -Math.cos(rad) * 0.15, 0.13, 0.025, 0.36, 0.025, 'black', { r: [50, 0, a] });
  }),
  cyl(0, 0, 0.22, 0.03, 1.23, 'black'),
  at('box', 0, 0.08, 1.55, 0.6, 0.25, 0.6, 'black', { r: [-10, 0, 0] }),
  at('box', 0, -0.05, 1.53, 0.56, 0.01, 0.56, 'light', { r: [-10, 0, 0] }),
], { tags: ['creator'], lights: [{ type: 'area', c: [0, -0.08, 1.53], power: 120, size: 0.55, aim: [0, -1, -0.15] }] });
add('string-lights', 'سلسلة إضاءة', 'String lights', 'lighting', [2.0, 0.05, 0.12], (() => {
  const p = [at('cyl', 0, 0, 0.1, 0.008, 0.008, 2.0, 'black', { r: [0, 90, 0] })];
  for (let i = 0; i < 13; i++) {
    const x = -0.96 + i * 0.16, sag = 0.05 * Math.sin(Math.PI * (i / 12));
    p.push(sph(x, 0, 0.05 - sag * 0.6, 0.045, 'light'));
  }
  return p;
})(), { mount: 'wall', elevation: 2.15, tags: ['balcony', 'boho', 'cafe', 'creator'], lights: [{ type: 'point', c: [0, -0.1, 0.05], power: 25, size: 0.6 }] });

// ───────── ديكور ─────────
add('rug', 'زولية مستطيلة', 'Rug', 'decor', [2.0, 1.4, 0.015], [
  box(0, 0, 0, 2.0, 1.4, 0.012, 'rug', { b: 0.005 }),
  box(0, 0, 0.002, 1.8, 1.2, 0.012, 'rug2'),
], { flat: true, tags: ['living', 'bedroom'] });
add('rug-round', 'زولية دائرية', 'Round rug', 'decor', [1.6, 1.6, 0.015], [
  cyl(0, 0, 0, 1.6, 0.012, 'rug'),
  cyl(0, 0, 0.002, 1.3, 0.012, 'rug2'),
], { flat: true, tags: ['living', 'kids', 'boho'] });
add('curtains', 'برادي', 'Curtains', 'decor', [1.6, 0.14, 2.55], (() => {
  const p = [at('cyl', 0, 0.02, 2.5, 0.03, 0.03, 1.7, 'metal', { r: [0, 90, 0] })];
  for (const side of [-1, 1]) for (let i = 0; i < 5; i++) {
    const x = side * (0.5 + i * 0.07);
    p.push(cyl(x, 0, 0.02, 0.1, 2.45, 'fabric'));
  }
  return p;
})(), { tags: ['living', 'bedroom'] });
add('sheer-curtains', 'ستارة شيفون', 'Sheer curtains', 'decor', [1.6, 0.06, 2.55], [
  at('cyl', 0, 0.02, 2.5, 0.025, 0.025, 1.7, 'metal', { r: [0, 90, 0] }),
  box(0, 0, 0.02, 1.6, 0.02, 2.45, 'sheer'),
], { tags: ['living', 'bedroom', 'minimal'] });
add('plant-tall', 'نبتة كبيرة', 'Tall plant', 'decor', [0.6, 0.6, 1.65], [
  cyl(0, 0, 0, 0.36, 0.38, 'pot', { b: 0.02 }),
  cyl(0, 0, 0.38, 0.04, 0.6, 'wood'),
  sph(0, 0, 0.75, 0.5, 'leaf'),
  sph(0.12, 0.05, 1.05, 0.42, 'leaf'),
  sph(-0.1, -0.05, 1.2, 0.4, 'leaf'),
], { tags: ['living', 'office', 'creator', 'boho'] });
add('plant-small', 'نبتة صغيرة', 'Small plant', 'decor', [0.25, 0.25, 0.4], [
  cyl(0, 0, 0, 0.16, 0.16, 'pot', { b: 0.01 }),
  sph(0, 0, 0.13, 0.24, 'leaf'),
], { mount: 'surface', elevation: 0, tags: ['living', 'office', 'kitchen'] });
add('plant-hanging', 'نبتة معلّقة', 'Hanging plant', 'decor', [0.4, 0.4, 0.9], [
  cyl(0, 0, 0.35, 0.008, 0.55, 'black'),
  sph(0, 0, 0.18, 0.24, 'pot'),
  ell(0, 0, 0.0, 0.4, 0.4, 0.38, 'leaf'),
], { mount: 'ceiling', tags: ['boho', 'balcony', 'cafe'] });
add('vase', 'مزهرية', 'Vase', 'decor', [0.2, 0.2, 0.5], [
  ell(0, 0, 0, 0.2, 0.2, 0.3, 'ceramic'),
  cyl(0, 0, 0.26, 0.07, 0.08, 'ceramic'),
  cyl(0.02, 0, 0.3, 0.008, 0.2, 'wood'), sph(0.03, 0, 0.45, 0.06, 'accent'),
], { mount: 'surface', elevation: 0, tags: ['living', 'dining'] });
add('mirror-round', 'مراية دائرية', 'Round mirror', 'decor', [0.7, 0.04, 0.7], [
  at('cyl', 0, 0, 0.35, 0.66, 0.66, 0.02, 'mirror', { r: [90, 0, 0] }),
  at('torus', 0, 0, 0.35, 0.7, 0.7, 0.035, 'metal', { r: [90, 0, 0] }),
], { mount: 'wall', elevation: 1.2, tags: ['living', 'bath', 'bedroom'] });
add('mirror-floor', 'مراية طولية', 'Floor mirror', 'decor', [0.6, 0.05, 1.7], [
  box(0, 0, 0, 0.6, 0.04, 1.7, 'frame', { b: 0.006 }),
  box(0, -0.021, 0.04, 0.52, 0.004, 1.62, 'mirror'),
], { tags: ['bedroom'] });
add('frame-art', 'لوحة فنية', 'Framed art', 'decor', [0.6, 0.03, 0.8], [
  box(0, 0, 0, 0.6, 0.03, 0.8, 'frame', { b: 0.003 }),
  box(0, -0.016, 0.06, 0.48, 0.004, 0.68, 'paper'),
  box(-0.05, -0.02, 0.2, 0.22, 0.004, 0.3, 'art'),
  at('cyl', 0.09, -0.021, 0.48, 0.16, 0.16, 0.004, 'accent', { r: [90, 0, 0] }),
], { mount: 'wall', elevation: 1.25, tags: ['living', 'bedroom', 'office'] });
add('gallery-frames', 'مجموعة لوحات', 'Gallery frames', 'decor', [1.3, 0.03, 0.62], [
  box(-0.45, 0, 0.06, 0.36, 0.03, 0.5, 'frame'), box(-0.45, -0.016, 0.1, 0.28, 0.004, 0.42, 'art'),
  box(0, 0, 0, 0.42, 0.03, 0.62, 'frame'), box(0, -0.016, 0.05, 0.34, 0.004, 0.52, 'paper'),
  box(0, -0.02, 0.15, 0.2, 0.004, 0.2, 'accent'),
  box(0.45, 0, 0.16, 0.34, 0.03, 0.34, 'frame'), box(0.45, -0.016, 0.2, 0.26, 0.004, 0.26, 'art'),
], { mount: 'wall', elevation: 1.3, tags: ['living', 'office', 'creator'] });
add('wall-clock', 'ساعة حائط', 'Wall clock', 'decor', [0.4, 0.05, 0.4], [
  at('cyl', 0, 0, 0.2, 0.4, 0.4, 0.04, 'frame', { r: [90, 0, 0] }),
  at('cyl', 0, -0.021, 0.2, 0.35, 0.35, 0.004, 'paper', { r: [90, 0, 0] }),
  at('box', 0, -0.025, 0.25, 0.012, 0.004, 0.11, 'black'),
  at('box', 0.04, -0.025, 0.2, 0.09, 0.004, 0.01, 'black', { r: [0, 30, 0] }),
], { mount: 'wall', elevation: 1.75, tags: ['kitchen', 'living'] });
add('books-stack', 'كتب مكدسة', 'Book stack', 'decor', [0.28, 0.2, 0.14], [
  box(0, 0, 0, 0.28, 0.2, 0.04, 'accent'),
  box(0.01, 0, 0.04, 0.25, 0.18, 0.035, 'paper', { r: [0, 0, 6] }),
  box(-0.01, 0, 0.075, 0.26, 0.19, 0.04, 'black', { r: [0, 0, -4] }),
], { mount: 'surface', elevation: 0, tags: ['living', 'office'] });
add('candles', 'شموع', 'Candles', 'decor', [0.22, 0.12, 0.2], [
  cyl(-0.06, 0, 0, 0.06, 0.2, 'paper'), cyl(0.05, 0, 0, 0.07, 0.13, 'paper'),
  sph(-0.06, 0, 0.2, 0.015, 'light'), sph(0.05, 0, 0.13, 0.015, 'light'),
], { mount: 'surface', elevation: 0, tags: ['bath', 'living', 'boho'] });
add('basket', 'سلة خوص', 'Woven basket', 'decor', [0.4, 0.4, 0.38], [
  cyl(0, 0, 0, 0.4, 0.34, 'rattan'),
  tor(0, 0, 0.34, 0.4, 0.03, 'rattan'),
  box(0, 0, 0.3, 0.3, 0.3, 0.08, 'fabric', { b: 0.03 }),
], { tags: ['boho', 'kids', 'bath'] });
add('macrame', 'تعليقة مكرمية', 'Macramé wall hanging', 'decor', [0.5, 0.03, 0.9], [
  at('cyl', 0, 0, 0.88, 0.02, 0.02, 0.6, 'wood', { r: [0, 90, 0] }),
  ...Array.from({ length: 9 }, (_, i) => cyl(-0.2 + i * 0.05, 0, 0.1 + Math.abs(4 - i) * 0.05, 0.015, 0.78 - Math.abs(4 - i) * 0.05, 'paper')),
  at('box', 0, 0, 0.6, 0.3, 0.01, 0.3, 'paper', { r: [0, 45, 0] }),
], { mount: 'wall', elevation: 1.2, tags: ['boho'] });
add('coffee-pot-set', 'صينية دلة وفناجين', 'Coffee pot & cups set', 'decor', [0.42, 0.3, 0.32], [
  ell(0, 0, 0, 0.42, 0.3, 0.02, 'metal'),
  cyl(0.06, 0, 0.02, 0.13, 0.12, 'metal'),
  cone(0.06, 0, 0.14, 0.13, 0.1, 'metal'),
  cone(0.06, 0, 0.24, 0.05, 0.06, 'metal', { r: [180, 0, 0] }),
  at('cyl', -0.04, 0, 0.18, 0.025, 0.025, 0.14, 'metal', { r: [0, -50, 0] }),
  ...[[-0.13, -0.08], [-0.13, 0.04], [0.15, -0.09]].map(([x, y]) => cone(x, y, 0.02, 0.06, 0.045, 'ceramic', { r: [180, 0, 0] })),
], { mount: 'surface', elevation: 0.36, tags: ['majlis', 'gulf', 'baghdadi'] });
add('tv', 'تلفزيون', 'TV screen', 'electronics', [1.45, 0.06, 0.85], [
  box(0, 0, 0, 1.45, 0.05, 0.85, 'black', { b: 0.004 }),
  box(0, -0.026, 0.02, 1.41, 0.002, 0.81, 'screen'),
], { mount: 'wall', elevation: 1.0, tags: ['living', 'bedroom'] });
add('monitor', 'شاشة كمبيوتر', 'Monitor', 'electronics', [0.62, 0.22, 0.48], [
  box(0, 0.02, 0, 0.24, 0.18, 0.015, 'black'),
  box(0, 0.06, 0.015, 0.05, 0.03, 0.2, 'black'),
  box(0, 0, 0.12, 0.62, 0.025, 0.36, 'black', { b: 0.003 }),
  box(0, -0.013, 0.135, 0.59, 0.002, 0.33, 'screen'),
], { mount: 'surface', elevation: 0.75, tags: ['office', 'creator'] });
add('laptop', 'لابتوب', 'Laptop', 'electronics', [0.34, 0.24, 0.22], [
  box(0, -0.01, 0, 0.34, 0.23, 0.015, 'metal', { b: 0.003 }),
  at('box', 0, 0.11, 0.11, 0.34, 0.012, 0.22, 'metal', { r: [-12, 0, 0] }),
  at('box', 0, 0.103, 0.11, 0.32, 0.002, 0.2, 'screen', { r: [-12, 0, 0] }),
], { mount: 'surface', elevation: 0.75, tags: ['office', 'creator', 'cafe'] });
add('camera-tripod', 'كاميرا على ترايبود', 'Camera on tripod', 'creator', [0.6, 0.6, 1.55], [
  ...[0, 120, 240].map((a) => {
    const rad = a * Math.PI / 180;
    // الرجل مايلة: فوقها للمركز وتحتها لبرّا
    return at('box', Math.sin(rad) * 0.14, -Math.cos(rad) * 0.14, 0.62, 0.02, 0.02, 1.3, 'black', { r: [-Math.cos(rad) * 12, -Math.sin(rad) * 12, 0] });
  }),
  cyl(0, 0, 1.2, 0.05, 0.2, 'black'),
  box(0, 0, 1.4, 0.13, 0.08, 0.09, 'black', { b: 0.008 }),
  at('cyl', 0, -0.08, 1.45, 0.07, 0.07, 0.09, 'black', { r: [90, 0, 0] }),
  at('cyl', 0, -0.125, 1.45, 0.05, 0.05, 0.004, 'glass', { r: [90, 0, 0] }),
], { tags: ['creator'] });
add('mic-arm', 'مايك على ذراع', 'Mic on boom arm', 'creator', [0.7, 0.2, 0.6], [
  box(0.3, 0.05, 0, 0.06, 0.08, 0.08, 'black'),
  at('cyl', 0.24, 0.05, 0.25, 0.025, 0.025, 0.4, 'black', { r: [0, -25, 0] }),
  at('cyl', 0.0, 0.0, 0.43, 0.025, 0.025, 0.5, 'black', { r: [0, 70, 20] }),
  at('cyl', -0.22, -0.06, 0.42, 0.06, 0.06, 0.17, 'metal', { r: [0, 0, 0] }),
  at('sphere', -0.22, -0.06, 0.52, 0.06, 0.06, 0.06, 'black'),
], { mount: 'surface', elevation: 0.75, tags: ['creator'] });
add('acoustic-panel', 'لوح عزل صوت', 'Acoustic panel', 'creator', [0.6, 0.05, 0.6], [
  box(0, 0, 0, 0.6, 0.05, 0.6, 'fabric', { b: 0.01 }),
  ...[-0.2, -0.1, 0, 0.1, 0.2].map((x) => box(x, -0.03, 0.03, 0.05, 0.02, 0.54, 'accent')),
], { mount: 'wall', elevation: 1.3, tags: ['creator'] });
add('neon-sign', 'لوحة نيون', 'Neon sign', 'creator', [0.8, 0.04, 0.3], [
  box(0, 0.01, 0, 0.8, 0.01, 0.3, 'glass'),
  ...Array.from({ length: 7 }, (_, i) => at('cyl', -0.3 + i * 0.1, -0.01, 0.15 + 0.06 * Math.sin(i * 1.1), 0.02, 0.02, 0.11, 'neon', { r: [0, 90 + (i % 2 ? 35 : -35), 0] })),
], { mount: 'wall', elevation: 1.6, tags: ['creator', 'cafe', 'kids'], lights: [{ type: 'point', c: [0, -0.12, 0.15], power: 10, size: 0.3, color: 'neon' }] });
add('shanasheel-screen', 'حاجز شناشيل خشبي', 'Shanasheel wood lattice screen', 'decor', [1.2, 0.08, 2.2], (() => {
  const W = 1.2, H = 2.2, p = [
    box(0, 0, 0, W, 0.08, 0.08, 'wood'), box(0, 0, H - 0.08, W, 0.08, 0.08, 'wood'),
    box(-W / 2 + 0.04, 0, 0, 0.08, 0.08, H, 'wood'), box(W / 2 - 0.04, 0, 0, 0.08, 0.08, H, 'wood'),
    box(0, 0, 0.75, W, 0.08, 0.06, 'wood'),
  ];
  // شبكة خشب (lattice) فوق مع معينات صغيرة بالتقاطعات، وحشوات خشب تحت
  const z0 = 0.81, z1 = H - 0.08, inner = W - 0.16;
  for (let x = -inner / 2 + 0.1; x < inner / 2 - 0.02; x += 0.1) p.push(box(x, 0, z0, 0.016, 0.03, z1 - z0, 'wood'));
  for (let z = z0 + 0.1; z < z1 - 0.02; z += 0.1) p.push(box(0, 0, z - 0.008, inner, 0.03, 0.016, 'wood'));
  let k = 0;
  for (let x = -inner / 2 + 0.1; x < inner / 2 - 0.02; x += 0.1) {
    for (let z = z0 + 0.1; z < z1 - 0.02; z += 0.1) if ((k++) % 2 === 0) p.push(at('box', x, 0, z, 0.05, 0.035, 0.05, 'wood', { r: [0, 45, 0] }));
  }
  p.push(box(-0.27, 0, 0.12, 0.46, 0.05, 0.56, 'wood', { b: 0.01 }), box(0.27, 0, 0.12, 0.46, 0.05, 0.56, 'wood', { b: 0.01 }));
  return p;
})(), { tags: ['baghdadi', 'majlis', 'heritage'], clip: true });
add('arch-niche', 'قوس ديكوري', 'Decorative arch', 'decor', [1.0, 0.06, 2.1], [
  box(-0.45, 0, 0, 0.1, 0.06, 1.6, 'frame'), box(0.45, 0, 0, 0.1, 0.06, 1.6, 'frame'),
  at('torus', 0, 0, 1.6, 1.0, 0.06, 0.1, 'frame', { r: [90, 0, 0] }),
], { tags: ['moroccan', 'neo-classic', 'gulf'], clip: true });
add('air-conditioner', 'سبلت (مكيف جداري)', 'Split AC unit', 'electronics', [0.9, 0.22, 0.3], [
  box(0, 0, 0, 0.9, 0.22, 0.3, 'ceramic', { b: 0.04 }),
  box(0, -0.105, 0.03, 0.8, 0.02, 0.03, 'black'),
], { mount: 'wall', elevation: 2.2, tags: ['bedroom', 'living', 'majlis'] });

// ───────── برندة ─────────
add('balcony-railing', 'محجّر برندة', 'Balcony railing', 'outdoor', [3.0, 0.06, 1.05], (() => {
  const p = [box(0, 0, 1.0, 3.0, 0.06, 0.05, 'metal'), box(0, 0, 0.05, 3.0, 0.04, 0.04, 'metal')];
  for (let i = 0; i <= 6; i++) p.push(box(-1.47 + i * 0.49, 0, 0, 0.05, 0.05, 1.0, 'metal'));
  p.push(box(0, 0, 0.12, 2.9, 0.01, 0.85, 'glass'));
  return p;
})(), { tags: ['balcony'] });
add('planter-box', 'حوض زرع', 'Planter box', 'outdoor', [1.0, 0.35, 0.6], [
  box(0, 0, 0, 1.0, 0.35, 0.4, 'wood', { b: 0.01 }),
  ...[-0.33, 0, 0.33].map((x, i) => ell(x, 0, 0.32, 0.36, 0.3, 0.28 + i % 2 * 0.06, 'leaf')),
], { tags: ['balcony', 'cafe'] });
add('lounge-chair', 'كرسي استرخاء', 'Lounge chair', 'outdoor', [0.7, 1.6, 0.75], [
  ...legs4(0.7, 1.6, 0.25, 0.04, 'wood', 0.05),
  box(0, 0.2, 0.25, 0.7, 1.2, 0.05, 'wood'),
  box(0, 0.2, 0.3, 0.64, 1.15, 0.06, 'cushion', { b: 0.02 }),
  at('box', 0, -0.55, 0.5, 0.64, 0.5, 0.06, 'cushion', { r: [-50, 0, 0], b: 0.02 }),
], { tags: ['balcony'] });
add('menu-board', 'لوحة منيو', 'Menu board', 'decor', [0.7, 0.03, 0.9], [
  box(0, 0, 0, 0.7, 0.03, 0.9, 'wood'),
  box(0, -0.016, 0.05, 0.62, 0.004, 0.8, 'black'),
  ...[0.2, 0.33, 0.46, 0.59, 0.72].map((z, i) => box(-0.05 + (i % 2) * 0.04, -0.02, z, 0.4 - (i % 3) * 0.06, 0.003, 0.025, 'paper')),
], { mount: 'wall', elevation: 1.4, tags: ['cafe'] });

// ───────── الإخراج ─────────
function check(it) {
  const errs = [];
  if (!/^[a-z0-9-]+$/.test(it.id)) errs.push('id');
  if (!Array.isArray(it.size) || it.size.length !== 3 || it.size.some((v) => !(v > 0))) errs.push('size');
  if (!it.parts.length) errs.push('parts');
  return errs;
}
function build() {
  const ids = new Set();
  for (const it of items) {
    if (ids.has(it.id)) throw new Error('duplicate id ' + it.id);
    ids.add(it.id);
    const e = check(it);
    if (e.length) throw new Error(it.id + ': ' + e.join(','));
  }
  return {
    version: 1,
    note: 'Generated by build-catalog.js — do not edit by hand. كل الأثاث مبني من أشكال بسيطة بالكود.',
    units: 'meters; front faces -y; parts: c = center, s = size, r = rotation degrees',
    items,
  };
}
module.exports = { build };
if (require.main === module) {
  const out = path.join(__dirname, 'catalog.json');
  const cat = build();
  fs.writeFileSync(out, JSON.stringify(cat, null, 1) + '\n');
  console.log(`✓ ${cat.items.length} قطعة → ${out}`);
}
