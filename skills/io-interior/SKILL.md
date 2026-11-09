---
name: io-interior
description: مكتبة تصميم داخلي مربوطة بـ Blender — يحوّل وصف غرفة أو صورتها لملف room.json، يختار ستايل (مودرن، بوهو، جاباندي، تراثي بغدادي، مجلس خليجي، مغربي، استوديو صانع محتوى…)، يعاينها بالمتصفح، يرندرها بـ Blender، ويطلّع محتوى: ريل قبل/بعد، جولة بالغرفة، وكاروسيل زوايا بمقاسات إنستغرام ويوتيوب وتيك توك. ALWAYS use this skill when the user says "صمم غرفتي"، "رتب غرفتي"، "ديكور"، "تصميم داخلي"، "قبل وبعد للغرفة"، "ميكوفر"، "جولة بالبيت"، "room makeover"، "interior design"، "room tour"، "before and after room"، "Blender room"، أو يرسل صورة غرفة ويطلب فكرة تصميم أو فيديو لها.
---

# مكتبة التصميم الداخلي (Blender)

تحوّل غرفة المستخدم لمشهد ثلاثي الأبعاد مبني بالكود من أشكال بسيطة (ماكو موديلات منزّلة — كلشي أصلي)، وتطلّع منه محتوى للمنصات الثلاث بنفس الأهمية: إنستغرام، يوتيوب، تيك توك.

كل الأوامر من مجلد البلگن: `node engine/interior.js <أمر>`.

## المكتبة

- **13 ستايل** (`library/interiors/styles/`): `modern` مودرن · `minimal` مينيمال · `scandinavian` إسكندنافي · `industrial` صناعي · `boho` بوهو · `classic` كلاسيك · `japandi` جاباندي · `baghdadi-heritage` تراثي بغدادي (شناشيل) · `gulf-majlis` مجلس خليجي · `moroccan` مغربي · `neo-classic` نيو كلاسيك فخم · `kids` غرفة أطفال · `creator-studio` استوديو صانع محتوى.
  كل ستايل بيه ألوان ومواد ووصف عربي، ويبدّل قطع: مثلاً المجلس الخليجي يحوّل الكنبة لجلسة أرضية وطاولة الوسط لصينية شاي.
- **98 قطعة أثاث وديكور** (`library/interiors/furniture/catalog.json`): كنب، جلسة مجلس، مساند، أسرّة، كناتير، مكاتب، مطبخ وجزيرة، حمام، إضاءات، نباتات، برادي، زوالي، مرايات، لوحات، سبلت، پنكة، حاجز شناشيل، ورنگ لايت وترايبود ومايك ولوح عزل للاستوديو. `node engine/interior.js list-furniture`
- **10 غرف جاهزة** (`library/interiors/rooms/`): `living-room` · `majlis` · `bedroom` · `kids-room` · `kitchen` · `bathroom` · `creator-studio` · `cafe-corner` · `studio-apartment` · `balcony`. `node engine/interior.js list-rooms`

## الخطوات

### 1) افهم الغرفة — اسأل بس عن الناقص

- **إذا أرسل صورة:** قدّر الأبعاد من أشياء معروفة الحجم: الباب ≈ 0.9×2.1 م، السرير الدبل ≈ 1.6–1.8 م عرض، الكنبة الثلاثية ≈ 2.1 م، بلاطة الأرض غالباً 60 سم، ارتفاع السقف بالعراق والخليج غالباً 2.8–3.2 م. حدد مكان الشباك والباب على أي جدار.
- **إذا وصف بالكلام:** خذ الأبعاد منه.
- اسأل سؤال واحد بس يجمع الناقص، مثلاً: «كم تقريباً عرض الغرفة وطولها؟ والشباك على أي جدار؟». لا تسأل عن شي تگدر تقدّره.
- اسأله عن الهدف: ريل قبل/بعد؟ جولة؟ كاروسيل أفكار؟ أو كلها.

### 2) سوّي room.json

- ابدأ من أقرب قالب: `node engine/interior.js new living-room --style japandi --out room.json`
- عدّل الأبعاد والجدران والفتحات والقطع حسب الغرفة الحقيقية (الصيغة تحت).
- إذا ما تعرف أي ستايل: اقترح 2–3 تناسب الغرفة والجمهور، مع جملة وحدة عن كل واحد (`list-styles`).
- تحقق دائماً: `node engine/interior.js validate room.json` — صلّح الأخطاء (✗)، والملاحظات (⚠) راجعها.
- غيّر الستايل بأي وقت: `node engine/interior.js restyle room.json --style boho`

### 3) عاين بالمتصفح (ما يحتاج Blender)

`node engine/interior.js preview room.json --open`

الصفحة (`web/interior.html`) فيها: عرض «بيت دمية» تدوّر حوله، «تمشّى» داخل الغرفة، «لقطة» تبين الكادر بالضبط مثل Blender، مخطط من فوق تسحب بيه القطع، تبديل الستايل والوقت والألوان، إضافة قطع، وتشغيل الجولة. زر «💾 حفظ بالملف» يرجّع التعديلات لنفس room.json. خلي المستخدم يرتّب لحد ما يعجبه.

### 4) رندر بـ Blender

- تأكد إن Blender موجود: `node engine/interior.js where-blender`. إذا مو موجود: `node engine/doctor.js --install --only blender` (أو يدوياً: Windows `winget install BlenderFoundation.Blender` · Mac `brew install --cask blender` · Linux `sudo snap install blender --classic`).
- ملف Blender للتعديل اليدوي: `node engine/interior.js build room.json --blend room.blend`
- صور: `node engine/interior.js render room.json --format 9:16 --engine eevee --samples 32`
  - `--engine eevee` أسرع (يحتاج كرت شاشة). إذا فشل، الأداة تعيد تلقائياً بـ `cycles` (يشتغل على أي جهاز، أبطأ).
  - للتجربة السريعة: `--samples 16 --scale 50`. للنهائي: `--samples 64` (eevee) أو `128` (cycles).
  - لقطات محددة: `--shots wide,detail`
- الملفات تطلع بمجلد `room-renders/` جنب room.json.

### 5) المحتوى

| المحتوى | الأمر | المنصة |
|---|---|---|
| **ريل قبل/بعد** | `before-after room.json --format 9:16` → `before.png` + `after.png` + `before_after.mp4` (مسح من القديم للجديد) | ريلز · تيك توك · شورتس |
| **جولة بالغرفة** | `walkthrough room.json --seconds 8 --format 9:16` → `walkthrough.mp4` | ريلز · تيك توك · شورتس |
| **جولة عرضية** | `walkthrough room.json --seconds 12 --format 16:9` | يوتيوب |
| **كاروسيل زوايا** | `render room.json --format 3:4` (كل اللقطات) | كاروسيل إنستغرام (1080×1440) |
| **صورة غلاف** | `render room.json --format 16:9 --shots wide` | ثمنيل يوتيوب |

المقاسات: 9:16 = 1080×1920 · 16:9 = 1920×1080 · 3:4 = 1080×1440.

- «قبل» = نفس الغرفة فاضية بجدران رمادية وإضاءة باهتة. علّم القطع اللي تبقى بالـ «قبل» بـ `"before": true` (مثلاً السرير القديم).
- بعدين: ركّب الفيديو وأضف نص عربي وموسيقى بسكل `io-video-editor` أو `io-montage-video`، والكاروسيل بسكل `io-carousel`.

### 6) نصايح للمستخدم (اختار المناسب)

- **الهوك:** أول ثانية «قبل» بشعة واضحة، وبعدها المسح — لا تطوّل بالـ «قبل».
- **الوقت:** الساعة الذهبية (`golden`) تحلّي البوهو والتراثي، المسا (`evening`) للكلاسيك والمجلس، الليل (`night`) للاستوديو مع النيون.
- **الكاميرا:** لقطة من الزاوية (wide) للفيد، لقطة قريبة (detail) للتفاصيل، والجولة 6–10 ثواني بس.
- **الكاروسيل:** 5–7 صور: واسعة ← تفاصيل ← قبل/بعد ← قائمة القطع والألوان بالأخير (يحفّظها الجمهور).
- **صانع المحتوى:** غرفة `creator-studio` تبين كيف ترتب خلفية الكادر — محتوى بحد ذاته.
- التصاميم التراثية (الشناشيل، المجلس) مستوحاة بشكل عام — لا تقول إنها نسخة من بيت أو مكان حقيقي.

## صيغة room.json

```json
{
  "version": 1,
  "name": "غرفة سارة",
  "style": "japandi",
  "room": { "width": 4.2, "depth": 3.8, "height": 2.9 },
  "walls": [
    { "side": "north", "openings": [{ "type": "window", "offset": 1.2, "width": 1.6, "height": 1.4, "sill": 0.9 }] },
    { "side": "south", "openings": [{ "type": "door", "offset": 0.3, "width": 0.9, "height": 2.1 }] },
    { "side": "east", "color": "#cfd8cc" },
    { "side": "west" }
  ],
  "floor": { "material": "oak" },
  "lighting": { "time_of_day": "golden", "lamps": [{ "type": "point", "position": [2, 2, 2.5], "power": 80 }] },
  "furniture": [
    { "id": "sofa", "type": "sofa", "wall": "west", "at": 1.9, "before": true },
    { "id": "table", "type": "coffee-table-low", "position": [2.1, 1.9], "rotation": 90, "material": "walnut" },
    { "id": "chair", "type": "armchair", "position": [3.2, 1.0], "rotation": -135, "color": "#a3a58c" }
  ],
  "decor": [
    { "id": "rug", "type": "rug", "position": [2.1, 1.9], "size": [2.2, 1.6, 0.015] },
    { "id": "art", "type": "frame-art", "wall": "west", "at": 1.9, "elevation": 1.4 }
  ],
  "cameras": {
    "stills": [{ "name": "wide", "position": [3.9, 0.3, 1.5], "target": [1.2, 3.0, 0.8] }],
    "walkthrough": { "points": [[2.5, 0.4], [2.6, 1.2]], "seconds": 8, "height": 1.55 }
  },
  "outputs": ["9:16", "16:9", "3:4"]
}
```

- **الإحداثيات بالمتر:** `x` من الجدار الغربي (اليسار) للشرقي، `y` من الجدار الجنوبي (الأمامي، اللي الكاميرا عنده عادةً) للشمالي (الخلفي)، `z` للأعلى. `(0,0)` = الزاوية الجنوبية الغربية.
- **الجدران:** `side` = `north|south|east|west`. `offset` للفتحة = المسافة من بداية الجدار (من x=0 للشمالي والجنوبي، من y=0 للشرقي والغربي). `type` = `door|window|opening`. `sill` = ارتفاع الشباك عن الأرض. `"open": true` = ماكو جدار (برندة أو مساحة مفتوحة). `color` أو `material` لجدار مميّز.
- **القطع:** `type` من الكتالوج. المكان إمّا `position: [x, y]` + `rotation` (درجات، 0 = الواجهة نحو الجنوب، 90 = نحو الشرق، 180 = نحو الشمال، -90 = نحو الغرب)، أو `wall` + `at` (تلزق بالجدار وتلف لوحدها نحو الغرفة). اختياري: `size [عرض، عمق، ارتفاع]`، `scale`، `elevation`، `on` (معرّف قطعة ثانية تنحط فوقها، مثل مزهرية على طاولة: `"on": "table"`)، `color`، `material` (اسم من `library/interiors/materials.json` مثل `walnut`، `velvet-green`، `marble-white`، `brass`)، `light: false` لإطفاء ضوء القطعة، `before: true`، `allow_overlap: true`.
- **الإضاءة:** `time_of_day` = `morning|noon|golden|evening|night`. الشمس تدخل من الشباك تلقائياً (`sun_azimuth` لتغيير اتجاهها). إضاءات القطع (أباجورات، تعليقات، رنگ لايت) تشتغل لوحدها.
- **الكاميرات:** `stills` لقطات ثابتة (`lens` اختياري، الافتراضي حسب المقاس). `walkthrough.points` مسار الجولة، `look: "ahead"` يباوع لقدّام، أو `target` يباوع لنقطة ثابتة. إذا ماكو كاميرات تنسوّى تلقائياً.

## لما يصير خلل

- `validate` يگول بالضبط شنو الغلط وبأي قطعة.
- قطعة «طالعة برا الغرفة» أو «متداخلة»: حرّكها بالمخطط بالمتصفح.
- الرندر أسود أو غامق: غيّر `time_of_day` أو زيد `"fill": 1` بـ `lighting`.
- EEVEE فشل على سيرفر أو جهاز بدون كرت: الأداة تحوّل لـ Cycles وحدها؛ أو حط `--engine cycles`.
- لفحص المشهد بدون Blender: `node engine/interior.js dry-run room.json`.
