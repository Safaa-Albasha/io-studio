---
name: io-sfx
description: مكتبة مؤثرات صوتية حرّة (100+ صوت مولّد بالكود) — ووش، بوب، كليك، إشعار، ضربة سينمائية، رايزر، عملات، عدّ تنازلي، كرتون، طبول — مع طريقة اختيار الصوت حسب المنصة ونوع الفيديو وتركيبه بالمونتاج. Use when user says "حط مؤثرات صوتية"، "صوت ووش"، "sound effects"، "SFX"، "صوت انتقال"، "صوت بوب"، "صوت فلوس"، "عد تنازلي"، "الفيديو ناشف يحتاج أصوات"، or when finishing any reel, motion video or lesson. Not for music or voice-over.
---

# مكتبة المؤثرات الصوتية

**100+ صوت** بـ`library/sfx/wav/` — كلها مولّدة بالكود (`engine/sfx-gen.py`)، فما عليها حقوق لأحد. تنشر بأي منصة بلا خوف.

- القائمة الكاملة (الاسم، الوصف، المدة): `library/sfx/catalog.json`
- **+28 صوت مسجّل CC0** (نقرات، فقعات، رنّات تأكيد، تكّات عدّاد، كيبورد، هبوط ناعم، قلب صفحة) بأسماء `cc0_*` — ملك عام، سجل مصدر كل ملف بـ`library/sfx/cc0/ledger.json`. نفس الاستعمال: `"lib": [["cc0_chime_soft", 4.2]]`. بلا ووش ولا موسيقى، والختام المسجّل يبقى نظيف.
- تسمع وتختار: `node engine/serve.js` ← افتح `/sfx.html` (فيها بحث وتصنيفات وزر ينسخ الاسم)
- تعيد توليد الكل: `python3 engine/sfx-gen.py` (أو صوت واحد: `--only pop_soft`)

## ١. متى تحط صوت؟
**كل صوت لحدث بصري واحد.** مو رشّ.

| اللي يصير بالشاشة | الصوت |
|---|---|
| قطع/انتقال بين لقطتين | `whoosh_short` · `swish_fast` · `swoosh_transition` |
| كرت أو إيموجي يطلع | `pop_soft` · `pop_bright` · `pop_bubble_up` |
| نص ينكتب | `typing_keys` · `key_enter` (آخر الجملة) |
| ضغطة بشرح تطبيق | `click_ui` · `mouse_click` · `toggle_on` · `swipe_ui` |
| رقم أو نتيجة تنكشف | `riser_short` قبلها ← `impact_punch` أو `ta_da` عليها |
| خبر صادم / كلمة قوية | `impact_punch` · `bass_hit` · `sub_drop` |
| افتتاحية أو شعار | `cinematic_hit` · `braam` · `boom_deep` |
| سعر، ربح، خصم | `kaching` · `coin_single` · `cash_register` |
| جواب صح / غلط | `success_chime` / `error_buzz` (أو `error_soft` للأطفال) |
| عد تنازلي | `countdown_3_2_1` (جاهز) أو `countdown_beep` ×3 + `countdown_final` |
| لمعة، تحوّل، قبل/بعد | `sparkle_magic` · `magic_wand` |
| مضحك | `boing` · `slide_whistle_down` · `fail_wah` |
| غموض/توتر | `tension_swell` · `heartbeat` · `riser_noise` |

**القاعدة الذهبية:** أي «رايزر» (riser) **ينتهي** على لحظة الكشف — يعني تبدأه قبلها بطوله (`riser_short` = 1 ث، `riser_noise` = 2.5 ث).

## ٢. حسب المنصة ونوع الفيديو
- **تيك توك:** إيقاع سريع — صوت كل 1–2 ث مقبول (pop، swish، click). ابدأ بضربة بأول نص ثانية حتى توقف التمرير.
- **ريلز إنستغرام:** نفس الشي بس أنعم — `pop_soft`، `whoosh_soft`، `tap_wood`. لايف ستايل وأكل: صوت كل 3–4 ث بالكثير.
- **يوتيوب طويل:** أقل بهواية. انتقالات الفقرات (`swoosh_transition`) + ضربة بالمقدمة + لمسات على الأرقام بس. لا تحط صوت على كل كابشن.
- **شرح تطبيق/تقنية:** `click_ui`، `mouse_click`، `digital_beep`، `data_chirp`، `scan_beam`.
- **محتوى أطفال (درس متحرك):** `pop_bubble_up`، `boing`، `sparkle_magic`، `squeak`، `success_chime` — بلا ضربات ثقيلة.
- **سينمائي/وثائقي/سفر:** `whoosh_long`، `air_pass`، `cinematic_hit`، `hit_trailer_tail`، `wind_gust`.
- **فخم (عطور، ساعات):** `tap_glass`، `whoosh_soft`، `sparkle_magic` — قليل جداً.

## ٣. بمحرّك الفيديو (video-editor)
بـ`sfx.json` ضيف `lib` — كل عنصر `[الاسم، الثانية]` أو `[الاسم، الثانية، القوة]`:
```json
{ "outro": 4.2, "whoosh_up": [3.1], "lib": [["pop_soft", 3.2], ["cinematic_hit", 0.4, 0.16], ["kaching", 12.8]] }
```
ثم `python3 scripts/05_sfx.py <work>` كالعادة. القوة الافتراضية **0.1** (نفس علو لوحة الأصوات القديمة).
محرّر التايملاين يكتبها بالعكس `[الثانية، "الاسم"]` — الاثنين يشتغلن.

## ٤. على أي MP4 (موشن، درس، فيديو جاهز)
صوت واحد على الثانية 3.2:
```bash
ffmpeg -i in.mp4 -i library/sfx/wav/pop_soft.wav -filter_complex "[1:a]adelay=3200:all=1,volume=0.5[s];[0:a][s]amix=inputs=2:duration=first:normalize=0[a]" -map 0:v -map "[a]" -c:v copy -c:a aac out.mp4
```
- الفيديو بلا صوت أصلاً؟ بدّل `[0:a][s]amix…` بـ`[s]apad[a]` وضيف `-shortest`.
- أكثر من صوت: كل صوت `-i` و`adelay` خاص، وكلهم بـ`amix=inputs=N`.
- موشن/درس من `engine/render.js`: اكتب الأوقات من التايملاين وطبّق نفس الأمر بعد الرسم.

## ٥. قواعد العلو
- كل ملفات المكتبة موحّدة: **قمة ≤ −1 dBFS** و**أعلى علو لحظي (400ms) ≤ −16 LUFS** — فالضربة الطويلة ما تطلع أعلى من البوب فجأة.
- الأصوات **تحت الكلام**: بالمزج خلّها تقريباً −10 إلى −14 dB تحت الصوت (`volume=0.3`–`0.5` بأمر ffmpeg، أو 0.08–0.15 بـ`sfx.json`).
- الضربات الواطية (`boom_deep`، `sub_drop`) ما تنسمع بسماعة الجوال — لا تعتمد عليها وحدها، ركّبها ويا `impact_punch`.
- بعد المزج، الفيديو النهائي بحدود −14 LUFS (يوتيوب/إنستغرام/تيك توك) — `06c_loudfix.sh` بالمحرّك يسويها.
- لا تخلي صوتين يطلعون بنفس اللحظة إلا إذا قصدت طبقة (ضربة + لمعة).

## ٦. تضيف صوت جديد؟
اكتب دالة بـ`engine/sfx-gen.py` بنفس شكل الموجود (`@snd("id", "اسم عربي", "English", "category", [وسوم], "متى يستعمل")`)، وشغّل `python3 engine/sfx-gen.py --only <id>`. الاسم إنگليزي صغير بشرطة سفلية، وما يتكرر.
