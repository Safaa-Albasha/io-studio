/*
 * I/O Studio — platform specs shared by the web pages and the Node tools.
 * The three platforms are first-class and equal: every tool that produces an
 * output produces it for all three unless the creator picks fewer.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.IoPlatforms = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PLATFORMS = {
    instagram: {
      id: 'instagram',
      nameAr: 'إنستقرام',
      nameEn: 'Instagram',
      short: 'IG',
      slot: 1,
      video: { w: 1080, h: 1920, ratio: '9:16', maxSec: 180, label: 'ريلز' },
      gridSafe: { w: 1080, h: 1440, ratio: '3:4' },
      carousel: { w: 1080, h: 1440, ratio: '3:4', maxSlides: 20 },
      cover: { w: 1080, h: 1920, safe: { w: 1080, h: 1440 } },
      uiSafe: { top: 220, bottom: 380, side: 60 },
      captionMax: 2200,
      hashtags: { recommended: 3, max: 30 },
    },
    youtube: {
      id: 'youtube',
      nameAr: 'يوتيوب',
      nameEn: 'YouTube',
      short: 'YT',
      slot: 2,
      video: { w: 1080, h: 1920, ratio: '9:16', maxSec: 180, label: 'شورتس' },
      long: { w: 1920, h: 1080, ratio: '16:9', label: 'فيديو طويل' },
      carousel: { w: 1080, h: 1080, ratio: '1:1', maxSlides: 10, label: 'منشور مجتمع' },
      cover: { w: 1280, h: 720, safe: { w: 1280, h: 720 }, label: 'ثمبنيل' },
      uiSafe: { top: 200, bottom: 420, side: 60 },
      captionMax: 5000,
      titleMax: 100,
      hashtags: { recommended: 3, max: 15 },
    },
    tiktok: {
      id: 'tiktok',
      nameAr: 'تيك توك',
      nameEn: 'TikTok',
      short: 'TT',
      slot: 3,
      video: { w: 1080, h: 1920, ratio: '9:16', maxSec: 600, label: 'فيديو' },
      carousel: { w: 1080, h: 1920, ratio: '9:16', maxSlides: 35, label: 'وضع الصور' },
      cover: { w: 1080, h: 1920, safe: { w: 1080, h: 1440 } },
      uiSafe: { top: 160, bottom: 480, side: 140 },
      captionMax: 4000,
      hashtags: { recommended: 4, max: 10 },
    },
  };

  const ORDER = ['instagram', 'youtube', 'tiktok'];

  /** Safe rectangle (no platform UI overlaps it) for a 1080x1920 frame. */
  function safeArea(platformIds) {
    const ids = platformIds && platformIds.length ? platformIds : ORDER;
    const m = { top: 0, bottom: 0, side: 0 };
    for (const id of ids) {
      const s = PLATFORMS[id].uiSafe;
      m.top = Math.max(m.top, s.top);
      m.bottom = Math.max(m.bottom, s.bottom);
      m.side = Math.max(m.side, s.side);
    }
    return { x: m.side, y: m.top, w: 1080 - 2 * m.side, h: 1920 - m.top - m.bottom };
  }

  return { PLATFORMS, ORDER, safeArea };
});
