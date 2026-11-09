# Changelog

## 4.0.1
- io-trends: ScrapeCreators يشتغل على الحساب الفوري مال Composio — ما يطلب تسجيل دخول أو مفتاح ScrapeCreators؛ تقدير الكلفة أول مرة وقواعد التشغيل (`references/scrapecreators-composio.md`).

## 4.0.0 — 2026-11-09 — renamed to I/O Studio · آي أو استوديو (breaking)
- New name **I/O Studio · آي أو استوديو**: I = Input (your idea), O = Output (your video), AI in between. Slogan «فكرتك تدخل… والذكاء يكمّل الإبداع» · "Idea in. Story out." (sub: "AI does the in-between."); wordmark `I ── slogan ── O` on the start page (`.sf-io` in `web/lib/brand.css`), short form "I/O Studio" elsewhere.
- New mark `web/lib/logo.svg` — sky square, bold I and O joined by a thin line with a ✦ sparkle; same charcoal/sky palette, readable at 16–24 px. Used in every page header and favicon (incl. the timeline and video-onboarding pages), the guide cover, and `.claude-plugin/icon.png` (1024 px).
- **Breaking:** plugin id `sky` → `io`; skills and agents `sky-*` → `io-*`; commands `/sky:sky-…` → `/io:io-…`; env vars `SKY_*` → `IO_*` (`IO_VISION`, `IO_MODELS`, `IO_BLENDER`, `IO_SFX_LIB`, …); page globals `Sky*` → `Io*`; model cache `~/.cache/sky` → `~/.cache/io`.
- Data: project folder `.sky/` → `.io/`, editor home `~/.sky-editor` → `~/.io-editor`. `engine/data-dir.js` moves `.sky` or the older `.safaa` (and `~/.sky-editor` / `~/.safaa-studio`) once; the Python scripts follow the same rule. Browser settings `sky.*` / `sky-*` are copied to `io.*` / `io-*` by `web/lib/ls-migrate.js`.
- Own repository: install with `/plugin marketplace add Safaa-Albasha/io-studio` then `/plugin install io@io-studio`. `.claude-plugin/marketplace.json` (marketplace `io-studio`, plugin `io`, source `./`) makes the plugin folder a repo root.
- Guide rebuilt as `docs/guide/io-studio-guide.pdf` with new screenshots (old `sky-guide.pdf` removed). `content-guide.html` install steps now use the marketplace commands.
- Fix: `serve.js` now serves `engine/blender/room-core.js` (read-only, exact path) so `interior.html` loads instead of showing «library missing».
- Blender log prefix `SKY` → `IO`; LUT headers say I/O Studio.

## 3.0.0 — 2026-11-09 — renamed to SKY · سكاي
- Trends from followed Instagram accounts via Composio `COMPOSIO_REMOTE_WORKBENCH` + ScrapeCreators (owner-tested path; others later): template `skills/sky-trends/scripts/composio_trend_pull.py` (filled by `engine/trends.js fill`; Arabic-aware keyword match, own posts only, per-account median → `outlier`), `app-api.js import-trends` → `.sky/trends/<date>.json`, `.sky/benchmark.json` (stats page «قارن نفسك»), ideas in `plan.json`; queue type `sync-trends`; `keywords` per account type in `types.json`.
- New name, slogan («من الفكرة للمونتاج… وحدودك السما» · "From idea to montage — the sky's the limit.") and brand mark `web/lib/logo.svg` (header mark + favicon on every page).
- Plugin id `sky` (`/plugin install sky@plugins-lab`, commands `/sky:sky-<skill>`); every skill and agent is prefixed `sky-`.
- Project data folder `.sky/` (video editor home `~/.sky-editor/`). Older project folders are moved once by `engine/data-dir.js`.
- Install guide rebuilt as `docs/guide/sky-guide.pdf`.
- Motion bank 352: «كولاج تحريري ومونتاج المؤثرات» 329–352 (`moves-plus-i.js`) — documentary cut-out scene system (blur-in, slow push, parallax whip-out), selection-box word, fading big number, square-to-label, showcase frame, star sting, hook title banner, app badge sticker, jiggling app icons with strike/delete, colour slider grade, eyedropper, bilingual caption, glass tags, source card, word slates with a drawn clapper, accent beam, slice band, puzzle join, editorial decor kit (paper, cross grid, barcode, marks, micro copy), tracked serif reveal, showcase grid, two-column effect index, effect card with counter and label, pinned comment keyword.
- Motion bank 328: «مراجع الريلز» pack 284–328 (`moves-plus-g.js`, `moves-plus-h.js`) — shared element across cuts (`FX.morphAt`), dithered render-resolve, exploded view with callouts, progress chip + scrolling notes checklist + fixed cadence (`FX.cadence`), Droste tunnel, wall shadows, tier board, variable-weight morph, dust dissolve, slash-command chat, card-to-fullscreen, slot list, comment bar retype, accruing headline, step card, PiP with hand note, mirror quad, proof avatars, measuring ruler, take strip, laser slice, ASCII/halftone subject, link card, editor monitor, neon icons and icon carousel, extruded text on a surface, ring around an object, eye glow, product glow sweep, holo spec panel, photo stack card, face lock, glitter title, viewfinder zoom, thumbnail wall, B&W poster, mood grades, flip clock, card fan, giant/script pair, two-tone headline, stage cones. `orbit` (51) takes `cards`, `iconRain` (155) takes `keys`. Tracking helpers `FX.trackAt`/`FX.placeAt`/`FX.faceAt` accept `o.track` (.sky track JSON) wherever a quad/anchor/box/face is taken. Generic, theme colours only, no names or logos.
- Motion bank 283: «أنظمة الموشن» pack 265–283 (`moves-plus-f.js`) — pixel starfield, capsule headline, tabs card, before/after with editing timeline, progress chips, corner glow, calendar glide, depth grid, README scroll, star sweep and light-line transitions, numbered prompt step, polaroids on a string, giant word behind an object, words with real props (user images, code-drawn fallback), detection boxes, RTL soft wipe, plan-to-build, luxury waves. Theme colours only; optional images.
- Face-move fixes in `moves.js`: `highlight` marker = theme accent, `headlineWall` paper from the theme, `stickerFreeze` label readable on dark themes.
- New motion templates `night-street.html` (optional map/shop images) and `ui-card-reel.html`.
- Green screen engine `engine/greenscreen/` (key, glass widgets, breathing glow, LED line, terminal/page backgrounds, blue/green wall matte) + `references/greenscreen.md`; reel rhythm rules (hook, pace, systems per reel, safe zones, five edit styles) in `references/motion-rules.md` §6.
- Motion bank 264: «أنمي وكرتون» pack 243–264 (`moves-plus-e.js`) — speed/focus lines, impact frame, drama zoom, sparkle/sweat/anger/shock/؟/! marks, entrance shine, poof smoke, manga shout, Arabic onomatopoeia bursts, comic bubbles, original chibi faces (drawn or from a face photo), star burst, halftone, manga-panel/brush/spiral transitions; new `anime` style. All original drawings — no characters or designs from existing series.

## 2.3.0 — 2026-11-08
- Reel Studio (MIT, Mohamed Abdou) compared and ported: Arabic text QA before delivery, smart cuts with dialect fillers, privacy blur, podcast batch, publish pack, style-copy skill, production-manager and edit-analyst agents, 28 CC0 sounds, 59 stickers.
- Motion bank 232: live kashida, stamp-hide, keyhole/ink/paper/magazine/pixel transitions, area camera, riso/blueprint/paper looks, sunburst, documentary map route and country focus (Palestine as a state), torn photo, around-the-speaker, text-built web page, motion-library scenes, and the «question card» explainer style (question card, icon pop, 2.5D Ken Burns, bracket brand mark, series end card).
- Caption styles: box, karaoke, outline, paper; inline kashida in captions.

## 2.2.0 — 2026-11-08
- Onboarding: choose a dialect first (10 dialects; the session hook keeps Claude speaking it) and upload or create a visual identity (`engine/identity.js`).
- Windows/macOS/Linux parity for every video tool (`_vision.py`), trips folder mode, and `engine/doctor.js` that installs what's missing (winget/brew/apt/pip/npm).
- Motion bank doubled to 200 moves.
- Libraries: 104 sound effects (`sfx`), 60 cinematic looks and filters with LUT export (`color-grade`), 29 lessons with chalkboard/whiteboard/paper styles, drawing, math and physics (`lesson`), interior design with a Blender bridge (`interior`).
- Timeline editor for the video engine (`/timeline`).
- Hook meter (experimental): experiment harness, baseline scorer and calibration on the creator's own numbers. TRIBE v2 was tried on CPU and removed (15–20 min per 5 s, no Arabic, non-commercial license).

## 2.1.0 — 2026-11-08
- content-engine merged (author's permission, per the owner): onboarding questionnaire, carousel-creator (now `carousel`), news-dashboard (now `trends`), animated-video-cover, arabize-post, png-exporter, blotato-publish, product-ad-studio and quality-manager agents, content guide page.
- Richer on top: three-platform carousel/cover/ad export, news scoring + per-platform ideas + idea archive + saved sources + daily run, Claude Code questionnaire fallback writing `.sky/` files, three-platform quality checks, publishing defaults to all three platforms.
- Tests check every skill's name matches its folder and the start hook reads both profile formats.

## 2.0.0 — 2026-11-07
- One plugin: merged (copied and modified, MIT) video-ad-editor → `video-editor`, `motion-video`, `podcast-video`, `montage-video`, `thumbnail-video`; live-stage; reels rhythm script (now `script`); trips; BStudio (Arabic UI at `web/bstudio/`). Licenses and changes: `third_party/NOTICE.md`.
- Identity bridge: `config.js video-theme` turns `.sky/theme.json` into the video engine theme; engine reads `.sky/creator-profile.md`; upstream self-update removed.
- More motion: 8 new templates (kinetic, stat, chart, quote, before-after, intro, steps, lower-third); lesson engine adds reveal, compare, quiz, celebrate (confetti), bounce, character moods and per-beat backgrounds.
- New `arabize` skill. `cover` folded into `thumbnail-video` (adds TikTok + quick HTML path). `start` routes to all 21 skills.

## 1.0.0 — 2026-11-07
- First release: 15 skills (start, onboarding, platforms, carousel, trends, script, ads, motion, video-cut, cover, lesson, studio, dashboard, quality, publish-kit) and the quality-manager agent.
- Recording studio page: slides / screen / animated scene, camera bubble or split, teleprompter (in-page and pop-out), MP4/WebM recording saved into the lesson folder with markers, HTML deck import.
- Stats dashboard: Instagram, YouTube, TikTok with identical KPIs, growth index, weekly views, platform balance, table view, light/dark.
- Engine: config, serve, shoot (HTML→PNG), render (scene/motion→MP4), video (fix, silence cut, captions, burn, platform variants), stats (import, API fetch, summary).
- Templates: theme, project, creator profile, lesson (prompt + scene), carousel, cover, motion. Examples: demo lesson and sample exports for the three platforms.
