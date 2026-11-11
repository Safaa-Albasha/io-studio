---
name: io-video-cut
description: يحوّل فيديو كلام للكاميرا لنسخ جاهزة للنشر — يشيل السكتات، يرتب الصوت على مستوى المنصات، يركّب كابشن عربي بتوقيت الكلمة، ويطلع نسخة عمودية لإنستقرام ويوتيوب شورتس وتيك توك ونسخة 16:9 ليوتيوب. استخدمه لما يگول "قص الفيديو"، "شيل السكتات"، "كابشن عربي"، "حوّله لريل"، أو بعد التسجيل بالاستوديو.
---

# قص فيديو — من تسجيل لثلاث منصات

كل الأوامر: `node "${CLAUDE_PLUGIN_ROOT}/engine/video.js" <أمر> <ملف>`. تحتاج `ffmpeg` (والكابشن التلقائي يحتاج `whisper`).

## ١. افحص
```bash
node "${CLAUDE_PLUGIN_ROOT}/engine/video.js" probe in.mp4
```
تسجيل من الاستوديو (webm أو mp4 مجزّأ)؟ نظّفه أول: `fix in.webm` → `in.fixed.mp4`.

## ٢. السكتات
```bash
node "${CLAUDE_PLUGIN_ROOT}/engine/video.js" plan in.mp4          # يكتب in.cut.json
```
- اعرض: كم سكتة، الطول قبل/بعد.
- قصّ كثير (كلام انقطع)؟ `--noise -38` أو `--min 0.7`. قليل؟ `--noise -28` أو `--min 0.35`.
- يريد يشيل مقطع معيّن (غلطة، تكرار)؟ عدّل `keep` بـ `in.cut.json` يدوياً.
```bash
node "${CLAUDE_PLUGIN_ROOT}/engine/video.js" cut in.mp4           # → in.cut.mp4 (والصوت على −14 LUFS)
```

## ٣. الكابشن العربي
```bash
node "${CLAUDE_PLUGIN_ROOT}/engine/video.js" captions in.mp4 --plan in.cut.json --srt in.cut.srt
```
- يحتاج `pip install openai-whisper` (أو عندك `words.json` جاهز: `--words`).
- **راجع الـSRT** — صحّح الأسماء والمصطلحات واللهجة قبل الحرق. 3–4 كلمات بالسطر.
```bash
node "${CLAUDE_PLUGIN_ROOT}/engine/video.js" burn in.cut.mp4 --srt in.cut.srt --theme .io/theme.json
```
الكابشن ينحط فوق منطقة واجهة المنصات تلقائياً.

## ٤. النسخ للمنصات
```bash
node "${CLAUDE_PLUGIN_ROOT}/engine/video.js" variants in.cut.captioned.mp4 --out-dir output/video
```
- `*.vertical.mp4` — نفس الملف لريلز وشورتس وتيك توك (1080×1920).
- `*.youtube-16x9.mp4` — إذا المصدر عرضي.
- `--mode crop` للوجه (يقص الوسط)، `--mode blur` للشاشة والسلايدات (الصورة كاملة فوق خلفية مموّهة).
- ينبّه إذا الطول أطول من حد منصة.

## ٥. سلّم
المسارات، الطول النهائي، وكم ثانية انشالت. اقترح: كفر (سكل io-thumbnail-video) وحزمة نشر (io-publish-kit).
