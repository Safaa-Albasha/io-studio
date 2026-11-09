---
name: io-color-grade
description: تلوين سينمائي وفلاتر للفيديو والصور — 60 لوك (تيل وبرتقالي، فيلم دافي، أبيض وأسود، ليالي رمضان، الساعة الذهبية، سايبربانك…) ومؤثرات (حبيبات، تظليل، توهج، شرائط سينما، VHS، خدوش فيلم، تسريب ضوء)، تصحيح تلقائي للإضاءة، وتصدير LUT (.cube) لـCapCut وPremiere وDaVinci. Use when user says "لوّن الفيديو"، "فلتر سينمائي"، "color grading"، "LUT"، "لوك"، "خلّي الألوان أحلى"، "الفيديو غامج/أصفر"، "صحّح الألوان"، "ستايل فيلم"، "أبيض وأسود". Not for editing cuts or captions.
---

# التلوين السينمائي والفلاتر

الأداة: `engine/grade.js` (ffmpeg بس). الكتالوج: `library/looks/catalog.json`. تشوف كل اللوكات قبل/بعد: `node engine/serve.js` ← `/looks.html`.

```bash
node engine/grade.js list                                   # كل اللوكات مع المزاج والاستعمال
node engine/grade.js preview video.mp4 --looks teal_orange,warm_film,ramadan_night --out sheet.jpg
node engine/grade.js apply video.mp4 --look warm_film --strength 0.7      # → video-warm_film.mp4
node engine/grade.js auto video.mp4 [--look natural_plus]                 # تصحيح إضاءة/أبيض تلقائي (+ لوك)
node engine/grade.js lut teal_orange --out teal_orange.cube               # LUT 33³
```

> ملفات `.cube` ما تنحفظ بالمستودع (30 ميقا) — تنولد عندك: `node "${CLAUDE_PLUGIN_ROOT}/engine/grade.js" build` (كلها، ومطلوبة لزر «نزّل LUT» بالصفحة) أو `grade.js lut <id> --out x.cube` (وحدة). `apply` ما يحتاجها.

## ⚠️ القاعدة الأولى: لا تلوّن بلا طلب
صورة صاحب المحتوى **ما تتغيّر ألوانها إلا إذا طلب** (نفس قاعدة سكل الريل «صفر تعديل لوني»).
- مو طالب؟ لا تطبّق شي. تگدر تقترح: «تحب أعرض عليك 6 ستايلات على لقطة من فيديوك؟» ← `preview`.
- طلب «صحّح»؟ `auto` بس (بلا لوك). يطبع شنو لگى («مايل للأصفر، الأبيض مو واصل») — گوله إياه بكلام بسيط.
- طلب «لوك/فلتر»؟ اعرض لوحة `preview` عليه **قبل** التطبيق، وخلّه يختار.

## ١. اختيار اللوك حسب المزاج والموضوع
| الموضوع | جرّب |
|---|---|
| كلام للكاميرا، شرح، بودكاست | `natural_plus` · `skin_soft` · `clean_bright` · `warm_interior` |
| سفر وطبيعة | `golden_hour` · `teal_orange_soft` · `green_film` · `sea_aqua` · `desert_warm` · `forest_green` |
| أكل ومطاعم | `food_warm` · `classic_warm_film` |
| منتج فخم (عطر، ساعة، عقار) | `luxury_gold` · `pop_contrast` · `tech_cool` |
| تقنية/قيمنگ/ذكاء اصطناعي | `tech_cool` · `cyberpunk` · `night_neon` |
| قصة مؤثرة، حزن، غموض | `moody_dark` · `noir_soft` · `cold_thriller` · `bleach_bypass` |
| ذكريات، «زمن الطيبين» | `warm_film` · `vintage_70s` · `old_photo` · `vhs_retro` · `old_film_reel` |
| رمضان والعيد | `ramadan_night` · `warm_interior` · `golden_hour` |
| أطفال، حلويات، أعراس | `pastel` · `dreamy_glow` |
| تريلر، مقدمة يوتيوب | `cinema_scope` · `teal_orange` · `bleach_bypass` · `documentary` |

**الأنواع:** `color` = لون بس (له ملف .cube) · `combo` = لون + مؤثرات · `fx` = مؤثر بس (يركب فوق أي لون — طبّقه مرة ثانية على الناتج).

## ٢. البشرة أهم شي
- اللوكات المعلّمة `skin_safe` (بالكتالوج و«✓ آمن للبشرة» بالصفحة) تحافظ على لون الوجه.
- `teal_orange` محمي من الوجه بس **لا تزيد قوته فوق 0.8** على كلام للكاميرا.
- `cyberpunk`، `duotone_purple`، `day_for_night`، `noir_*` تغيّر الوجه كلياً — للقطات بلا وجه أو للستايل المقصود.
- شوف الوجه بلوحة `preview` على **لقطة فيها الوجه** (`--at <ثانية>`). الوجه رمادي/أخضر/برتقالي زايد؟ نزّل `--strength` لـ0.5 أو بدّل اللوك.
- البشرة السمرا تغمق بالتباين العالي (`pop_contrast`، `noir_contrast`، `luxury_gold`) — شيك عليها.

## ٣. نفس اللوك لكل السلسلة
- اختار **لوك واحد + قوة وحدة** للسلسلة كلها واحفظهن بـ`.io/theme.json` كملاحظة (`"look": "warm_film", "lookStrength": 0.7`) — اقراها بكل حلقة جديدة وطبّق نفسها.
- صوّرت بإضاءات مختلفة؟ أول شي `auto` لكل مقطع (يوحّد الأبيض والسطوع)، بعدين نفس اللوك: `auto clip.mp4 --look warm_film --strength 0.7`.
- تحتاج تكمّل بـCapCut؟ صدّر LUT بنفس القوة: `lut warm_film --strength 0.7 --out series.cube` واستعمله بكل الحلقات.

## ٤. المنصات والتصدير
- اللوك يتطبّق **بعد** المونتاج وقبل الرفع. `apply` يحافظ على الأبعاد والصوت (نسخ بلا إعادة ترميز) ويطلّع H.264 بجودة عالية (CRF 18) بوسوم bt709.
- **إنستغرام وتيك توك** يضغطون الفيديو ويطفّون الألوان شوي — لوك أقوى بـ10٪ يبيّن أحسن. الحبيبات الثقيلة تصير «وسخ» بعد الضغط: استعمل `grain_light` بس.
- **يوتيوب** يحافظ على التفاصيل أكثر — `grain_light` و`halation` يبينون حلو.
- `letterbox` و`cinema_scope` للفيديو **بالعرض 16:9** بس. على 9:16 تغطي نص الصورة.
- الصور (كفر، كاروسيل): `apply cover.jpg --look ...` يطلّع صورة بنفس الصيغة.

## ٥. مع محرّك الفيديو (video-editor)
- `theme.json` ← `"grade"` يقبل `false` (الافتراضي) أو `"auto"` (تصحيح مقاس بعد موافقته — شوف `25_scopes.py`). اللوكات الفنية ما تنحط هناك.
- اللوك الفني = **مرحلة أخيرة بعد `06_encode.sh`**:
  ```bash
  bash scripts/06_encode.sh <work> <work>/ad-final.mp4
  node ../../engine/grade.js apply <work>/ad-final.mp4 --look teal_orange_soft --strength 0.7 --out <work>/ad-graded.mp4
  ```
  ⚠️ هذا يلوّن **كل شي** — حتى الكابشن وكروت الموشن (ألوان الهوية تتغيّر). تبي اللون على الفيديو بس؟ لوّن `cutz.mp4` (الفيديو المقصوص) قبل `04_render_frames.js`، وبعدين ارسم:
  `node ../../engine/grade.js apply <work>/cutz.mp4 --look warm_film --out <work>/cutz.mp4.tmp.mp4 && mv <work>/cutz.mp4.tmp.mp4 <work>/cutz.mp4`
- الحجم بعد التلوين أكبر شوي (CRF 18). ريل بكفر؟ `28_cover.py --first` يضبطه بعدين.

## ٦. LUT لبرامج المونتاج
- `lut <id>` يطلّع ملف `.cube` 33×33×33 (Rec.709 داخل ← Rec.709 طالع) — الجاهزة كلها بـ`library/looks/luts/`.
- **CapCut:** Adjust ← LUT ← Import. **Premiere:** Lumetri ← Creative ← Look ← Browse. **DaVinci:** Color ← LUTs ← انسخ الملف لمجلد LUT.
- اللقطات مصوّرة **Log** (S-Log، Apple Log…)؟ هذي اللوكات مو لها — حوّل لـRec.709 أول.
- المؤثرات (`grain`، `vignette`، `halation`…) ما تنحط بملف LUT — الأمر يرفض ويوضّح. بالبرنامج استعمل مؤثراته الجاهزة، أو طبّقها بـ`apply`.

## ٧. لوك جديد؟
ضيفه بـ`library/looks/catalog.json` كبيانات (`ops` = عمليات لون، `fx` = مؤثرات، `base` = يبني على لوك ثاني)، وبعدين `node engine/grade.js build` (يولّد .cube والمعاينة ويحدّث الصفحة). العمليات المتاحة: `exposure`، `contrast`، `saturation`، `vibrance`، `temp`، `tint`، `levels`، `curves`، `split`، `balance`، `mono`، `colorize`، `gradient`، `hue`، `select` (لون معيّن)، `mixer`، `gains`. الأسماء عامة — لا أسماء ماركات أفلام.
