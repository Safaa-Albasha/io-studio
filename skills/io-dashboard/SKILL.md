---
name: io-dashboard
description: الإحصائيات وتقييم المحتوى — إنستقرام ويوتيوب وتيك توك جنب بعض وبنفس المعادلات (متابعين ونمو، مشاهدات، تفاعل، أفضل يوم وساعة، أعلى المنشورات)، وتقييم كل ريل مقارنة بعادة الحساب (درجة، هوك، ليش نجح أو فشل وشلون يتصلّح)، وتحليل عميق لريل واحد. إنستقرام يُسحب يومياً عبر Claude + Composio (إحصائيات رسمية)، والباقي يدوي أو ملف تصدير. استخدمه لما يگول "إحصائياتي"، "شلون حساباتي"، "ليش هالريل ما مشى"، "حلّل ريلي"، "قيّم محتواي"، "أي منصة أحسن"، "تقرير شهري"، أو لما يوصل طلب sync-stats / analyze-post / stats-ideas / stats-reel من الطابور.
---

# الإحصائيات وتقييم المحتوى

الصفحة: `http://localhost:<port>/dashboard.html` (من البرنامج: زر «📊 الإحصائيات»). شغّل السيرفر بالخلفية إذا مو شغّال:
```bash
node "${CLAUDE_PLUGIN_ROOT}/engine/serve.js" --dir "$CLAUDE_PROJECT_DIR" --open dashboard.html --reuse
```
كل الأرقام تنحفظ بالمشروع: `.io/stats.json` (و`.io/stats-sync.json` = الطريقة وآخر سحب). ما فيه سيرفر لآي أو استوديو — كلشي على جهازه.

## ١. من وين الأرقام (الصفحة تعرض خيارين)

| | إنستقرام | يوتيوب | تيك توك |
|---|---|---|---|
| **🔗 Claude + Composio** (موصى به لإنستقرام) | رسمي: مشاهدات، وصول، حفظ، مشاركة، إعجاب، تعليق، **متوسط المشاهدة ونسبة التخطي للريلز**، أعمار/بلدان/أوقات المتابعين | — (لاحقاً) | — (لاحقاً) |
| **✍️ يدوي** | ملف تصدير أو أرقام بالفورم | YouTube Studio ← Analytics ← Advanced ← Export | TikTok Studio ← Analytics ← Download data |

- كل رقم بالمنشور معاه مصدره (`src`: `official` / `manual` / ملف). رقم يدوي ما يمسح رقم رسمي.
- **ما يجي من أي طريقة حالياً:** منحنى البقاء ثانية بثانية لإنستقرام، طول الريل من API إنستقرام (يكمّله التحليل العميق)، وتيك توك ما يطلّع وقت مشاهدة ولا بقاء بالتصدير → هوكه «تقديري».
- **مقارنة بحسابات اللي يتابعهم (benchmark): مؤجلة.** أدوات Composio الأربع تشتغل على حسابه هو بس (`INSTAGRAM_GET_USER_INFO` يگول متابعين الحسابات الثانية تحتاج business_discovery، وهي مو منها). لا تسحب حسابات غيره.

### يدوي (CLI إذا عطاك ملفات)
```bash
node "${CLAUDE_PLUGIN_ROOT}/engine/stats.js" import instagram <posts.csv> <followers.csv> --handle @… --out .io/stats.json
```
الأعمدة عربي أو إنكليزي تنعرف تلقائياً؛ اللي ما انعرف ينطبع — أضفه لـ `ALIASES` بـ `web/lib/stats-core.js`.

## ٢. إنستقرام عبر Composio (طلب `sync-stats`، أو سطر الهوك اليومي)
بلا مفاتيح بالبلقن: Composio ماسك تسجيل الدخول. الحساب لازم **احترافي** (منشئ محتوى/تجاري).

1. **الأدوات:** `COMPOSIO_SEARCH_TOOLS` بـ use_case «get Instagram account insights and media insights» — لازم تطلع: `INSTAGRAM_GET_USER_INFO`, `INSTAGRAM_GET_IG_USER_MEDIA`, `INSTAGRAM_GET_IG_MEDIA_INSIGHTS`, `INSTAGRAM_GET_USER_INSIGHTS`.
2. **الربط:** إذا `has_active_connection` مو true → `COMPOSIO_MANAGE_CONNECTIONS` toolkit `instagram` وعطه رابط الموافقة، وانتظر.
3. **السحب — الأسهل:** `COMPOSIO_REMOTE_WORKBENCH` بمحتوى `skills/io-dashboard/scripts/composio_pull.py` كما هو (يسحب `me`، آخر ٦٠ منشور، الـ insights بالتوازي مع إعادة المحاولة، وإحصائيات الحساب). المخرج سطر JSON بعد `IO_PULL_JSON`.
   **أو يدوياً** بـ `COMPOSIO_MULTI_EXECUTE_TOOL` (نفس الوسائط — مأخوذة من `COMPOSIO_GET_TOOL_SCHEMAS`):
   - `INSTAGRAM_GET_USER_INFO` `{ig_user_id:"me", fields:"id,username,account_type,followers_count,follows_count,media_count"}`
   - `INSTAGRAM_GET_IG_USER_MEDIA` `{ig_user_id:"me", limit:≤100, after:<cursor>, fields:"id,caption,media_type,media_product_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count"}`
   - `INSTAGRAM_GET_IG_MEDIA_INSIGHTS` `{ig_media_id, metric:[…], period:"lifetime"}` — ريلز: `views, reach, saved, likes, comments, shares, total_interactions, ig_reels_avg_watch_time, ig_reels_video_view_total_time, reels_skip_rate`؛ بوست/كاروسيل: نفسها بدون الثلاث الأخيرة. (`impressions`/`plays` ملغية.)
   - `INSTAGRAM_GET_USER_INSIGHTS` `{metric:["follower_count"], period:"day", since, until}` · `{metric:["online_followers"], period:"lifetime"}` · `{metric:["follower_demographics"], period:"lifetime", metric_type:"total_value", timeframe:"this_month", breakdown:"age"|"country"|"gender"}` — فاضية تحت ١٠٠ متابع، وهذا طبيعي.
   ثم ركّبها بهالشكل: `{"kind":"io-composio-instagram","pulledAt":"…","user":…,"media":[…],"insights":{"<media_id>":…},"userInsights":[…]}` (غلاف Composio `{data, successful}` مقبول كما هو).
4. **الحفظ:** اكتب الـ JSON بـ `.io/pulls/instagram-<YYYY-MM-DD>.json` وبعدها:
```bash
node "${CLAUDE_PLUGIN_ROOT}/engine/stats.js" import --from composio-instagram .io/pulls/instagram-<date>.json --dir "$CLAUDE_PROJECT_DIR"
```
   يكتب `.io/stats.json` ويحدّث «آخر سحب»، والصفحة تتحدّث بروحها. سلّم الطلب `queue.js done <id> --note "سحبت N منشور"`.
- **يومياً:** إذا الطريقة composio وآخر سحب > ٢٤ ساعة، هوك بداية الجلسة يطلّع سطر — اسحب بهدوء بعد أول طلب للمستخدم. فحص يدوي: `stats.js due` (exit 0 = مستحق) و`stats.js connect-status`.
- `ig_reels_avg_watch_time` بالملّي ثانية حسب Meta (نقسم على ١٠٠٠) — إذا طلع متوسط المشاهدة أطول من الريل، بلّغ.
- `media_url` رابط مؤقت (ينتهي) — للتحليل العميق نزّله بنفس اليوم أو اسحب من جديد.

## ٣. الملخص
```bash
node "${CLAUDE_PLUGIN_ROOT}/engine/stats.js" summary --in .io/stats.json --days 28
```
جدول الثلاث منصات (نفس الأعمدة) ثم الملاحظات كما طلعت. **الأرقام من الأمر بس — لا تحسب أو تقدّر بنفسك.** التفاعل = (إعجاب + تعليق + مشاركة + حفظ) ÷ المشاهدات للكل. التوازن < 80 → اقترح خطة تعيد التوازن.

## ٤. تقييم المحتوى
```bash
node "${CLAUDE_PLUGIN_ROOT}/engine/stats.js" eval --dir "$CLAUDE_PROJECT_DIR" [--platform instagram] [--json]
```
القواعد بـ `web/lib/content-eval.js` (نفسها بالصفحة). كل منشور مقابل **وسيط آخر ٢٠ منشور لنفس الحساب**:
- **الدرجة ٠–١٠٠** من: المشاهدات ÷ عادته، التفاعل، (حفظ+مشاركة)÷مشاهدات، المشاهدة ÷ الطول، البقاء بعد ٣ث → قوي ≥ ٦٥، متوسط ≥ ٤٠، ضعيف.
- **الهوك ٠–١٠٠** + دليله: إنستقرام = `100 − reels_skip_rate` (رسمي) + متوسط المشاهدة ÷ الطول. يدوي (يوتيوب/تيك توك: «كمّلوا بعد ٣ث» أو متوسط المشاهدة) ← يُستخدم بس **«تقديري»**. بلا شي ← من المشاهدات والتفاعل نسبةً لعادته = «تقديري».
- **الأسباب** (عربي، كل واحد معاه تصليح): الهوك ضعيف (٪ طلعوا قبل ٣ث)، طلعوا بدري، طويل على جمهورك (مقارنة بأفضل طول عنده)، نزل بوقت ميت، حفظ ومشاركة عالية بس وصول قليل ← الغلاف/أول فريم، انتشر، وصل لغير المتابعين، التفاعل أقل من عادته…
- **«شنو يشتغل عندك»**: أقوى ربع مقابل أضعف ربع — نوع البداية (سؤال، رقم، تحذير، قصة، فضول)، الطول، الوقت، الكلمات المتكررة. يحتاج ٨ منشورات.
لا تبالغ: «تقديري» يعني تخمين من أرقام غير مباشرة — گوله هيچ.

## ٥. حلّل هالريل (طلب `analyze-post`)
الطلب فيه `platform, postId, title, url, videoUrl?, metrics{score, hookScore, views, reach, saves, shares, avgWatchSec, hold3, skipRate, viewsVsMedian…}, reason`، أو `posts:[…]` لعدة منشورات.
1. **الفيديو:** إنستقرام = `videoUrl` (= `media_url` الرسمي من stats.json؛ إذا انتهى → اسحب من جديد بـ `INSTAGRAM_GET_IG_USER_MEDIA`). وإلا ملفه المحلي: دوّر بـ `recordings/` ومجلدات شغل الأفكار. يوتيوب/تيك توك بلا ملف محلي → اطلب منه الملف (سؤال واحد). نزّله لـ `.io/analysis/media/<platform>-<postId>.mp4`.
2. **الطول:** `ffprobe` → `durationSec` (إنستقرام ما يعطيه).
3. **أول ٥ ثواني:** فرّغها (whisper مثل مقياس الهوك). مقياس الهوك: إذا فيه `.io/hook-calibration.json` → `python3 "${CLAUDE_PLUGIN_ROOT}/engine/hookmeter/experiment.py" check <file> --calibration .io/hook-calibration.json --lang ar` (يرتّبه بين مقاطعه السابقة). ما فيه معايرة → خذ المقاييس الخام من `engine/hookmeter/scorers/baseline.py` (أول كلمة `first_word_sec`، القطعات `cuts`، الحركة، كتابة على الشاشة) بدون حكم «أقوى/أضعف» منها — سكل io-hook-meter يشرح ليش.
4. **شوف:** أول فريم/الغلاف (`ffmpeg -frames:v 1`)، الكابشن، النص على الشاشة، وقارنه بأقوى ٣ منشورات عنده من `stats.js eval --json`.
5. **اكتب** `.io/analysis/<platform>-<postId>.json`:
```json
{"at":"2026-11-09","durationSec":31,"verdict":"جملة حكم","promised":"شنو وعد الهوك","leftAt":"وين طلعوا وليش (من skip/البقاء)","why":"ليش نجح/فشل","fixes":["…","…","…"],"hook":{"original":"…","rewritten":"هوك أقوى بلهجته"},"hookmeter":{"first_word_sec":1.4,"cuts":2}}
```
   يطلع بالصفحة تحت المنشور، ومعاه «✨ سو نسخة محسّنة» (يرسل طلب `script` ريل بالهوك الجديد والتصليحات). `durationSec` و`hookmeter` يدخلون بالتقييم.
6. حدّث التقدّم لكل منشور (`queue.js progress`)، وبالنهاية `done`.

## ٦. أفكار وريل من الأرقام
- **`stats-ideas`** (زر «اطلع أفكار من أفضل منشوراتي»): `top` = أقوى منشوراته نسبةً لعادته. ٥ أفكار بنفس الزاوية/نوع الهوك، بلهجته، `why` = ليش نجح الأصلي → `node "${CLAUDE_PLUGIN_ROOT}/engine/app-api.js" add-ideas <ideas.json> --no-trends-mark`.
- **`stats-reel`** (زر «سو ريل من هالأرقام»): `numbers` حقيقية → سكل io-motion (عدّاد، أعمدة مقارنة، منحنى البقاء 241 إذا فيه نقاط). لا أرقام من عندك.

## ٧. تقرير شهري (إذا طلب)
`summary --json --days 30` + `eval --json` ← `output/reports/<YYYY-MM>.md`: الأرقام، أفضل ٣ وأضعف ٣ لكل منصة مع السبب، «شنو يشتغل عندك»، و٣ خطوات للشهر الجاي.
