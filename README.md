# I/O Studio · آي أو استوديو

<img src="web/lib/logo.svg" width="64" alt="I/O Studio">

**`I` ── Idea in. Story out. ── `O`** · «فكرتك تدخل… والذكاء يكمّل الإبداع»

I = Input (your idea) · O = Output (your video) · AI does the in-between.

One Arabic-first plugin for content creators — skills plus serverless browser pages: a **recording studio** and a **stats dashboard**. Every tool treats **Instagram, YouTube and TikTok equally**.

By Safaa Albasha — [@safaaio](https://instagram.com/safaaio) · **[العربية](README.ar.md)** (main docs)

## What's inside

- **`web/app.html` — the full program:** ideas (incl. daily trend ideas from the accounts you follow) → schedule (3 platforms equally) → build pipeline → montage (timeline editor, filters, sound) → library of every installed move (242), template, sound, look and lesson (56) — tuned to your account type (doctor, interior designer, entrepreneur, creator, teacher/student, personal; video or podcast). Run `node engine/serve.js --open app.html`.
- **Merged plugins (copied and modified):** content-engine (with the author's permission — onboarding, carousel, news board, animated cover, arabize-post, PNG export, Blotato publishing, product-ad and quality agents), video-ad-editor (talking-head reels, 3D motion engine, podcast, beat montage, thumbnails), live-stage, reels rhythm script, trips, and استوديو الكورسات (Arabic UI). See `third_party/NOTICE.md`.
- **Motion:** 11 HTML motion templates (`templates/motion/`) and a lesson engine with show, reveal, morph, count, compare, quiz, confetti, character moods and per-beat colours.
- **Trends from accounts you follow:** `io-trends` pulls their latest Instagram posts through Composio's remote workbench with the ScrapeCreators toolkit (`skills/io-trends/scripts/composio_trend_pull.py`, billed per your ScrapeCreators plan), scores each post against its account's median views (outlier ×), and `node engine/app-api.js import-trends <file>` turns the strongest into ideas and fills the stats page's «قارن نفسك». ScrapeCreators is the path the author tests daily; other providers later. Without it, the skill falls back to web search.
- **Skills:** onboarding (creator identity in `.io/`), carousel, news & trends, script, ads, code-driven motion, video cutting & Arabic captions, covers/thumbnails, animated lessons (a cartoon character talks in a speech bubble, ب morphs into 🦆, objects are counted), recording studio, stats dashboard, quality gate (agent), publish kit (per-platform captions).
- **`web/studio.html`** — slides, screen share or animated scene + camera bubble or split + per-slide teleprompter (in-page or pop-out) → records MP4/WebM straight into the lesson folder (File System Access API), with slide markers. Imports an HTML deck as images. 9:16 / 16:9 / 1:1.
- **`web/dashboard.html`** — Instagram, YouTube and TikTok side by side with identical formulas: followers & growth, views, engagement rate, best day/hour, top posts, platform balance score. Import CSV/JSON exports or `stats.json`. Data stays in the browser.
- **`engine/`** — dependency-free Node tools: `config.js`, `serve.js`, `shoot.js` (HTML→PNG), `render.js` (scene/motion→MP4), `video.js` (ffmpeg cut/captions/variants), `stats.js` (import/fetch/summary).

## Install

```bash
/plugin marketplace add Safaa-Albasha/io-studio
/plugin install io@io-studio
```
Then say **«ابدأ»** or run `/io:io-start`.

Needs Node 18+. Video: `ffmpeg`. HTML→PNG/MP4: Playwright. Auto captions: `openai-whisper` (optional).

## Develop

```bash
node --test
node engine/serve.js     # http://localhost:4747
claude plugin validate . # plugin + marketplace manifests
```

**Repository layout (Safaa-Albasha/io-studio):** the plugin lives at the repo root — `.claude-plugin/plugin.json` (plugin `io`) and `.claude-plugin/marketplace.json` (marketplace `io-studio`, source `./`). Nothing in the plugin reaches outside its own folder.

**Upgrading from SKY (3.x) or SAFAA Studio:** project data moves from `.sky/` (or `.safaa/`) to `.io/`, and `~/.sky-editor` (or `~/.safaa-studio`) to `~/.io-editor`, automatically the first time a session starts. Commands are now `/io:io-…` (were `/sky:sky-…`).

Includes MIT code from [video-ad-editor, live-stage, script, trips](https://github.com/majedphotos) (Majed Alzaabi) and the course recorder (Kondratev Alexander, MIT) — licenses and changes in `third_party/NOTICE.md`. content-engine is included with the author's permission (no upstream license file). I/O Studio's own code: MIT.
