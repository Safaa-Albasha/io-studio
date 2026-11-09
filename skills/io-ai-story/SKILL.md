---
name: io-ai-story
description: قصة AI بستايل «لقطة» — من فكرة لفيديو قصير بشخصية وحدة ثابتة بكل اللقطات: سكربت ← قائمة لقطات ← ورقة الشخصية ← أوصاف صور بنفس الأوصاف والـseed ← تركيب بالحركات والمؤثرات والتلوين والكابشن الكاريوكي وكن-بيرنز. استخدمه لما يگول "قصة AI"، "قصة بالذكاء الاصطناعي"، "ستايل لقطة"، "سؤال يومي بشخصية"، "حلقات بنفس الشخصية"، "AI story", "consistent character story", "image prompts for a story", "story reel".
---

# قصة AI — شخصية وحدة، لقطات كثيرة، فيديو واحد

ستايل «لقطة»: سؤال أو موقف يومي، شخصية ثابتة نعرفها من أول لقطة، صور ثابتة تتحرك ببطء (كن-بيرنز 2.5D)، لوح غامق تحت فيه السؤال، وكرت «الحلقة الجاية» بالآخر.
**المحرّك مشترك** مع سكل الريل: `${CLAUDE_SKILL_DIR}/../video-editor` (الحركات `motion/`، السكربتات `scripts/`، المراجع `references/`).

## المخرج — كله بمجلد واحد `output/ai-story/<slug>/`
| الملف | شنو |
|---|---|
| `script.md` | السكربت بلهجة صاحب الحساب (سكل `io-script`) — 20–45 ث |
| `shots.json` | قائمة اللقطات (تحت) |
| `character.md` | ورقة الشخصية + الـseed — **أول شي ينكتب** |
| `prompts.md` | وصف صورة لكل لقطة، جاهز ينسخه لأداة الصور |
| `shots/NN.png` | الصور (هو يولّدها، أو `17_gen_scenes.py` للخلفيات بس — شوف ٤) |
| `story.mp4` | الفيديو النهائي · `publish/` حزمة النشر |

## ١. السكربت
سكل `io-script` بنفس هيكله (هوك ← موقف ← لفّة ← سؤال)، بس القصة **بشخصية وحدة** و**موقف واحد**. الهوك سؤال يومي («ليش يشخر وما يحس؟»). كل جملة = لقطة أو لقطتين.

## ٢. قائمة اللقطات `shots.json`
```json
{ "slug": "snore", "ar": "9:16", "seed": 418207, "character": "char_a",
  "shots": [
    { "n": 1, "line": "ليش يشخر وما يحس؟", "shot": "medium close-up", "action": "asleep on the sofa, mouth open", "place": "living room at night, warm lamp", "move": "kenBurns25D", "sfx": "whoosh_soft", "icon": "zzz" },
    { "n": 2, "line": "لأن الدماغ…", "shot": "wide", "action": "…", "place": "…", "move": "kenBurns", "sfx": "pop_soft" }
  ],
  "end": { "next": "ليش نحلم\nبنفس الحلم؟" } }
```
- `shot`: wide / medium / close-up / over-the-shoulder — نوّع، لا تكرر نفس الزاوية مرتين ورا بعض.
- `move` من بنك الحركات: `kenBurns25D` (230، صورة بعمق) · `kenBurns` (32) · `iconPop` (229، ؟ ! zZz لمبة جنب الراس) · `questionCard` (228) · `seriesEndCard` (232) · `brandBracket` (231). أسماء ثانية: `python3 scripts/35_moves.py list`.
- `sfx` من `library/sfx` (أسماء `library/sfx/catalog.json` — دليل الاختيار سكل `io-sfx`). صوت لكل حدث بصري، مو رشّ.

## ٣. ورقة الشخصية `character.md` (قبل أي وصف لقطة)
شخصية **وحدة** بأوصاف ثابتة تنلصق حرفياً بكل وصف:
```
CHARACTER char_a (copy this block verbatim into every prompt):
adult man, early 30s, short black hair, short trimmed beard, warm brown skin, oval face, thick eyebrows,
white thobe, simple wristwatch on left hand, slim build — same face, same clothes in every image
STYLE (verbatim too): soft 3D-animated film still, warm cinematic lighting, shallow depth of field, 9:16 vertical
SEED: 418207    (same seed for every shot; change only the shot line)
NEGATIVE: no text, no letters, no logos, no watermark, no extra people
```
- اسمه بالملف بس — **لا اسم على الصورة**، ولا شخص حقيقي معروف، ولا صورة أحد بدون إذنه.
- أول صورة = **ورقة الشخصية نفسها** (`character sheet: front view, 3/4 view, side view, neutral background` + البلوك فوق). لو أداة الصور تقبل صورة مرجعية، كل اللقطات بعدها تاخذ هالصورة مرجع + نفس الـseed.
- يبي الشخصية هي هو؟ صورة وجهه مرجع (بإذنه) — أو الحركة 233 `photoToon` (صورته بدائرة على جسم كرتوني، بلا توليد).
- قواعد صاحب الحساب أول (`.io/creator-profile.md`): لو فيها «بلا صور نساء» أو غيرها، الشخصية والكومبارس يمشون عليها.

## ٤. أوصاف الصور `prompts.md`
كل لقطة بنفس الترتيب: **CHARACTER (حرفي) + STYLE (حرفي) + لقطة n: shot, action, place, light + NEGATIVE + seed**.
```
### 01 — ليش يشخر وما يحس؟
[CHARACTER block] [STYLE block]
Shot 01: medium close-up, asleep on the sofa with mouth open, living room at night, warm lamp on the right,
leave the lower 40% calm and dark for the question panel. --seed 418207 --ar 9:16
[NEGATIVE]
```
- **اترك تحت 40% هادي** (لوح السؤال `questionCard` ينحط هناك) — وخلي الوجه بالثلث الفوقاني.
- الخلفيات والأماكن **بلا الشخصية**: `python3 scripts/17_gen_scenes.py <work> cost` ثم `fetch` (مرجعه `references/gen-scenes.md`، مفتاح `FAL_KEY`). ⚠ هالسكربت يضيف «no people» لكل وصف — فاللقطات اللي فيها الشخصية يولّدها هو بأداة الصور اللي يستعملها (ينسخ من `prompts.md`) ويحطها `shots/NN.png`.
- قبل التركيب: حط الصور جنب بعض (`bash scripts/07_contact_sheet.sh` أو لوحة مصغّرات) وشيك إن الوجه والملابس نفسها. لقطة طالعة غير؟ أعد توليدها بنفس الـseed + المرجع، لا تكمل فيها.

## ٥. التركيب
الأسهل: مشروع موشن (`motion/README.md` و`motion/ENGINE-API.md`):
1. **الصوت:** `python3 motion/voice.py <proj>` (صوته أو `--own صوتي.wav`) — توقيت كل كلمة → `python3 motion/timeline.py <proj>`.
2. **الصور:** `project.json ← images` (`"s01": "assets/01.png"` …) ومشهد لكل لقطة:
   ```js
   MOTION.scene({ id: 's01', start, end, draw(t, lt, ctx) {
     const img = Y => Y.drawImage(ctx.img('s01'), 0, 0, 1080, 1920);
     ctx.FX.kenBurns25D(ctx, lt, { s: 0, dur: end - start, draw: img });
     ctx.FX.iconPop(ctx, lt, { s: 0.8, icon: 'zzz', x: 760, y: 560 });
     ctx.FX.questionCard(ctx, lt, { s: 0.2, text: 'ليش يشخر\nوما يحس؟' });   // البراند من theme.handle
   } });
   ```
   آخر مشهد: `FX.seriesEndCard` بـ`end.next`. شخصية كرتونية بصورة شخص (بدل التوليد): 233–235. كرت «اكتب كلمة بالتعليقات»: 242 `commentKeyword`.
3. **الرسم:** `node motion/render.js <proj> preview 0.5 3 8 --safe` (شوف الصور!) ثم `all`، ثم `python3 motion/audio.py <proj>`.
4. **الكابشن الكاريوكي:** ستايل `karaoke` (الكلمة تتعبّى بلون التمييز لحظة نطقها — `references/word-fx.md`): بمسار الريل `theme.capStyle = "karaoke"`، وبمشروع الموشن الحركة 1 `FX.caption` على أسطر الصوت.
5. **المؤثرات:** أصوات `library/sfx/wav/<id>.wav` على أوقات `shots.json` — الأمر بسكل `io-sfx` (§٤ «على أي MP4»).
6. **التلوين:** لوك واحد لكل الحلقات (هوية السلسلة) من `library/looks`:
   `node "${CLAUDE_PLUGIN_ROOT}/engine/grade.js" preview story.mp4 --looks warm_film,teal_orange_soft --out sheet.jpg` ← يختار ← `grade.js apply story.mp4 --look <id> --strength 0.6` (سكل `io-color-grade`).
7. **النشر:** سكل `io-publish-kit` (ومعاه `--keyword` لو فيه «اكتب كلمة بالتعليقات»). ما ينشر شي بدون موافقة صريحة (`io-blotato-publish`).

## قواعد
- **شخصية وحدة، بلوك أوصاف واحد، seed واحد** — أي تغيير بالبلوك = شخصية ثانية.
- لا نص داخل الصور المولّدة؛ كل النص بالكود (عربي صحيح، أرقام حسب `numerals`، داخل المنطقة الآمنة).
- لا شعارات ولا أشخاص حقيقيين ولا أطفال بمواقف محرجة. اذكر بالكابشن إن الصور مولّدة بالذكاء الاصطناعي.
- كم بتكلّف قبل أي توليد مدفوع (`17_gen_scenes.py cost`) — وقله الرقم.
