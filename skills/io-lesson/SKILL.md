---
name: io-lesson
description: يحوّل درس يكتبه Claude لمشهد متحرك — سبورة طباشير أو سبورة بيضاء أو دفتر أو كرتون، رسم يترسم بالطباشير قدّام العين، رياضيات (خط أعداد، كسور، رسم دوال، هندسة، معادلات)، محاكاة فيزياء (مقذوف، بندول، دائرة كهربائية، عدسات…)، كيمياء وأحياء وجغرافيا وتاريخ، وتتبع الحروف العربية — مع شخصية تشرح، ويطلعه فيديو MP4 أو يشغّله بالاستوديو. بيه مكتبة ٢٩ درس جاهز. استخدمه لما يگول "درس"، "شرح بالسبورة"، "طباشير"، "علّم حرف"، "درس فيزياء/رياضيات"، "شخصية تحچي"، "درس متحرك"، "مكتبة الدروس".
---

# درس متحرك (مشهد)

### الشخصية: ذكر أو أنثى
اسأل المستخدم بأول درس (إذا ما محفوظ): «تريد الشخصية اللي تشرح ذكر لو أنثى؟» واحفظ الجواب بـ `.io/project.json` تحت `lessonCharacter` حتى الدروس الجاية تمشي عليه.
```json
"character": { "gender": "male", "beard": true, "shirt": "#2F7FBF" }
"character": { "gender": "male", "ghutra": "#FFFFFF", "shirt": "#E8E2D6" }
"character": { "gender": "female", "hijab": "#2F7FBF", "shirt": "#E0663A" }
"character": { "gender": "female", "shirt": "#8E7DBE" }
```
`gender`: `male` (ذكر، الاسم الافتراضي «المعلّم») أو `female` (أنثى، «المعلّمة»). للذكر: `beard` (لحية) و`ghutra` (غترة وعقال بلون تختاره). للأنثى: `hijab` (لون الحجاب) أو بدونه. `skin` و`hair` و`shirt` ألوان.

## ١. ابدأ من المكتبة
`${CLAUDE_PLUGIN_ROOT}/library/lessons/` بيها **٢٩ درس جاهز** (عربي، فيزياء، رياضيات، علوم، كيمياء، أحياء، تاريخ، جغرافيا، صناعة محتوى) بالستايلات الأربعة وبالمقاسين 9:16 و16:9.
- القائمة: `library/lessons/catalog.json` (id، العنوان، المادة، العمر، الستايل، المقاس، المدة، عدد اللقطات).
- تشوفهم وتشغّلهم: افتح `web/lessons.html` (فلتر بالمادة والستايل، تشغيل/إيقاف/سحب، نسخ أمر التصدير).
- إذا طلب درس قريب لواحد موجود: انسخه لـ `lessons/<slug>/scene.json`، احذف `meta`، وعدّل الكلام واللهجة والأرقام. لا تبدي من الصفر إذا اكو قالب قريب.
- إذا أضفت درس للمكتبة نفسها: حط `meta: { id, subject, subjectLabel, level }` وشغّل `node library/lessons/build.js`.

## ٢. اكتب الدرس كلقطات
كل لقطة (beat) = جملة `say` (≤ 14 كلمة، لهجة البروفايل) + حدث بصري. 5–10 لقطات. اختم بسؤال `quiz` واحتفال `celebrate`.

```json
{ "title": "قوانين نيوتن", "format": "16:9", "style": "chalkboard", "numerals": "arabic",
  "character": { "name": "المعلّمة", "shirt": "#E0663A", "hijab": "#2F7FBF" },
  "board": { "frame": true },
  "beats": [ { "say": "…", "write": "عنوان على السبورة" }, … ] }
```
- `style`: `chalkboard` (طباشير على سبورة خضراء وإطار خشب؛ `board.frame: false` يشيل الإطار) · `whiteboard` (ماركر) · `paper` (دفتر؛ `board.paper: "grid"` مربعات أو `"lined"` أسطر) · `cartoon` (الأصلي).
- الشخصية: بالستايلات الثلاث تطلع **معلّمة صغيرة** بجنب الكلام؛ `"character": false` يخفيها؛ `"position": "left"` يحطها يسار.
- `numerals`: `arabic` (٠١٢…) أو `western` — الأرقام اللي يولدها المحرك تتبعه.
- `--theme` يلوّن الكرتون بس؛ السبورات إلها ألوانها (تقدر تغيّرها بـ `palette`).

### الرسم على السبورة
اللوح مربع إحداثياته **0 → 1000** (x لليمين، y لجوه). كل عنصر يترسم بقلم/طباشير ويبقى على السبورة للقطات الجاية لحد `"erase": true` (ممسحة تمسح). أي لقطة بيها `show/morph/count/compare/quiz/reveal` تنظف السبورة. العناصر تترسم ورا بعض بنفس ترتيب كتابتها؛ `"with": true` يرسمه ويا اللي قبله، `"wait": 0.5` يأخّره، `"time": 2` يحدد مدته. أي مفتاح يقبل عنصر واحد أو قائمة.

| المفتاح | مثال |
|---|---|
| `draw` | `{ "shape": "arrow", "from": [100,500], "to": [400,500], "color": "yellow" }` — الأشكال: line · arrow · double-arrow · circle `{center,r}` · ellipse · rect `{x,y,w,h}` · polygon `{points}` · path `{d:"M 0 0 L 100 0 Q 150 50 200 0 Z"}` · curve (يد حرة) `{points}` · text · emoji `{value,at,size}`؛ و `fill`, `dash`, `width` |
| `write` | `"نص"` (ينحط تحت اللي قبله تلقائياً) أو `{ "text": "a² + b² = c²", "at": [500,300], "size": 70, "underline": true, "box": true }` — العربي ينكتب من اليمين، الرياضيات من اليسار |
| `highlight` | `{ "box": [x,y,w,h], "kind": "circle" }` (marker · circle · underline · box) |
| `label` | `{ "text": "النواة", "at": [500,470], "from": [850,250] }` سهم من الكلمة للنقطة |
| `erase` | `true` |

الألوان: `ink accent accent2 yellow blue red green orange pink purple gray brown white` أو hex — كل ستايل يحولها للون طباشير/ماركر مناسب.

### رياضيات
- `numberline`: `{ "from": 0, "to": 10, "start": 3, "jumps": [{ "by": 4 }], "marker": "🐸" }` — قفزات وحدة وحدة؛ `by` سالب = طرح.
- `fraction`: `"3/4"` أو `{ "n": 2, "d": 5, "kind": "bar", "at": [500,400], "size": 500 }` (pie أو bar).
- `grid`: `{ "cols": 4, "rows": 3, "fill": "all", "dots": true, "numbers": true, "top": "٤ بكل صف", "side": "٣ صفوف" }` — للضرب والمساحة.
- `axes` + `plot`: `{ "x": [-3,4], "y": [-3,8], "labels": ["س","ص"] }` ثم `{ "fn": "2x+1", "label": "ص = 2س + 1", "points": [[0,1],[1,3]] }`. الدالة تنقرأ بمحلل آمن (بدون eval): `+ - * / ^ ( )`، ضرب ضمني `2x`، `sin cos tan sqrt abs ln log exp pi e x` (أو `س`). `ticksX: [{ "v": 3.1416, "t": "π" }]` للعلامات الخاصة.
- `geometry`: مثلث `{ "shape": "triangle", "points": [[120,760],[600,760],[600,400]], "right": 1, "sides": ["4","3","5"], "angles": ["37°",null,"53°"], "vertices": ["A","B","C"] }` · دائرة `{ "shape": "circle", "center": [700,300], "r": 140, "radius": "نق", "diameter": true }` · `rect` · `polygon`.
- `equation`: `["2x + 3 = 11", "2x = 8", "x = 4"]` — سطر سطر، والجزء اللي تغيّر يتلوّن، والجواب بمربع.
- `table`: `{ "rows": [["س","ص"],[0,1],[1,3]], "colW": [300,200] }` — أول عمود يمين.

### فيزياء (محاكاة محسوبة من الزمن — نفس النتيجة كل مرة)
| المفتاح | مثال | يعرض |
|---|---|---|
| `projectile` | `{ "v0": 20, "angle": 45, "speed": 0.5, "scale": 18 }` | مسار، متجهات السرعة، المدى وأقصى ارتفاع (`scale` نفسه لمقارنة رميتين) |
| `pendulum` | `{ "length": [1, 0.25], "angle": 15 }` | الزمن الدوري 2π√(L/g) وعداد ذبذبات (زوايا ≤ 30°) |
| `incline` | `{ "angle": 30, "mass": 2, "mu": 0.2, "components": true }` | قوى (وزن، عمودية، احتكاك) والتعجيل والانزلاق |
| `spring` | `{ "k": 20, "m": 0.5 }` | اهتزاز، القوة المعيدة، الزمن الدوري |
| `circuit` | `{ "bulbs": 2, "switch": 1.5, "volts": 9, "current": true }` | بطارية، مصابيح تضوي، مفتاح ينسد بعد 1.5 ث، حركة الإلكترونات من السالب |
| `wave` | `{ "amplitude": 120, "wavelength": 320, "run": 3 }` | موجة مستعرضة تمشي ثم توقف ويطلع الطول الموجي والسعة |
| `orbit` | `{ "planets": [{ "name": "الأرض", "r": 300, "period": 6, "moon": true }] }` | مدارات (السرعات للتوضيح) |
| `lens` | `{ "type": "convex", "f": 150, "object": { "d": 300, "h": 110 } }` | ثلاث أشعة والصورة (حقيقية/خيالية، مقلوبة/معتدلة، مكبرة/مصغرة) محسوبة بقانون العدسة |
| `ray` | `{ "angle": 40 }` | انعكاس بمرآة مستوية |
| `freefall` | `{ "height": 20, "g": 1.62, "objects": ["🪶","🔨"] }` | صور متتابعة، زمن/سرعة/مسافة حية |

`g` الافتراضي 9.8. `speed` يبطّئ (0.5 = نص السرعة). `box: [x,y,w,h]` يحدد المكان.

### مواد ثانية
- `chemistry`: `"H2O"` (أو CO2 O2 H2 N2 CH4 NH3 HCl أو `{atoms, bonds}`) · تفاعل `{ "reaction": { "left": ["2H2","O2"], "right": ["2H2O"], "over": "شرارة" } }` (الأرقام تصير ₂ تلقائياً).
- `biology`: `"animal-cell"` أو `"plant-cell"` مع أسماء الأجزاء بالعربي.
- `geography`: `{ "preset": "world", "oceans": true, "pins": [{ "lonlat": [44.4,33.3], "label": "بغداد" }] }` (رسم تقريبي مو خريطة حقيقية) أو أشكال خاصة `shapes`.
- `timeline`: `{ "events": [{ "year": 762, "label": "تأسيس بغداد" }, …] }` (2–8 أحداث، من اليمين لليسار).
- `alphabet`: `{ "letter": "ب", "word": "بطّة", "emoji": "🦆" }` — خط منقط ونقطة بداية خضراء، القلم يتتبع الحرف، وبعدين النقاط. الحروف الـ28 كلها.

### الأحداث القديمة (تبقى تشتغل بكل الستايلات)
`show` · `bounce` · `morph` · `count` · `reveal` · `compare` · `quiz` · `celebrate` · `mood` (happy surprised thinking sad neutral) · `bg` · `label` (نص تحت العنصر) · `duration`. المثال: `${CLAUDE_PLUGIN_ROOT}/examples/lesson-demo/scene.json`.

## ٣. تأكّد من المعلومة قبل التصدير
- كل رقم بالدرس لازم ينحسب مو ينحفظ: احسبه (مثلاً مدى المقذوف v0²·sin2θ/g، الزمن الدوري 2π√(L/g)، السقوط √(2h/g)) — المحرك يحسب نفس القوانين ويكتب النتيجة، فخلي `say` يطابقها.
- الحقائق التاريخية والعلمية: سنة + اسم + مصدر معروف. إذا مو متأكد قول "تقريباً" أو شيلها. لا تخترع أرقام.
- الرسوم التوضيحية (المدارات، الخريطة، الخلية) مو بمقياس حقيقي — گولها بالكلام إذا مهم.
- فحص النص العربي: `node "${CLAUDE_PLUGIN_ROOT}/engine/arabic-qa.js" lessons/<slug>/scene.json` — ⛔ لازم بلا أخطاء (حرف ما يرسمه الخط، كشيدة بطرف كلمة، أشكال عرض جاهزة).
- تحقق من الملف: `node -e "const S=require('${CLAUDE_PLUGIN_ROOT}/web/lib/scene-core.js');console.log(S.normalizeScene(require('fs').readFileSync('lessons/<slug>/scene.json','utf8')).errors)"` — لازم `[]`.

## ٤. طلّعه
```bash
node "${CLAUDE_PLUGIN_ROOT}/engine/config.js" lesson <slug>          # مجلد درس جديد بقالب scene.json
node "${CLAUDE_PLUGIN_ROOT}/engine/render.js" scene lessons/<slug>/scene.json --theme .io/theme.json
node "${CLAUDE_PLUGIN_ROOT}/engine/render.js" scene "${CLAUDE_PLUGIN_ROOT}/library/lessons/phys-projectile.json" --out projectile.mp4
```
**شوف قبل التسليم:** صدّر نسخة سريعة `--fps 10` وطلّع شريط لقطات:
```bash
ffmpeg -i x.mp4 -vf "select='not(mod(n\,40))',scale=270:-1,tile=6x2" -frames:v 1 strip.png
```
افتح الصورة: لا كتابة فوق كتابة، لا شي برّه المنطقة الآمنة (9:16: x 140→940، y 220→1440)، والطباشير مقروء.

**أو بصوته:** بالاستوديو (سكل io-studio) — افتح المجلد، «🎬 مشهد»، الملقّن يعرض جملة كل لقطة، والتسجيل يبدي من أول المشهد ويوقف بنهايته.

## ٥. بعدها
كابشن (io-video-cut → captions/burn)، كفر من أحلى لقطة (io-thumbnail-video)، وحزمة نشر (io-publish-kit).
