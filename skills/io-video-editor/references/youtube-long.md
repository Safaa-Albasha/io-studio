# فيديو يوتيوب طويل سينمائي 16:9 (+ ريلز منه)

**متى:** طلب مونتاج بصيغة `youtube` أو `both` (من برنامج آي أو استوديو أو استوديو الكورسات — سكل io-autopilot)، أو «فيديو يوتيوب طويل»، «سينمائي بالعرض»، «درس كامل لليوتيوب»، «حطلي فصول».
**المدخل:** تسجيل بالعرض (كاميرا، شاشة + كاميرا، سلايدات) — من استوديو الكورسات يوصل بـ `recordings/<تاريخ>-<اسم>.webm|mp4`.
**المخرج:** `output/<slug>/` فيه `<slug>.youtube.mp4` (1920×1080، ‎-14 LUFS) · `chapters.txt` · `thumbnail.jpg` · `publish.md` · ولـ `both`: `reels/` (٣–٥ ريلز 9:16 بكابشن).

كل مرحلة = سطر تقدّم للصفحة إذا الطلب من الطابور:
`node "${CLAUDE_PLUGIN_ROOT}/engine/queue.js" progress <id> "<شنو هسه>" <نسبة> --dir "$CLAUDE_PROJECT_DIR"`

| المرحلة | النسبة |
|---|---|
| ١ تجهيز + فحص | 5 |
| ٢ تفريغ | 15 |
| ٣ قص السكتات والأغلاط | 35 |
| ٤ اللون السينمائي | 50 |
| ٥ انترو/أوترو + شريط الاسم | 65 |
| ٦ الفصول | 75 |
| ٧ الثمبنيل + حزمة النشر | 85 |
| ٨ الريلز (لـ both) | 90→100 |

---

## ١. التجهيز
```bash
W="$CLAUDE_PROJECT_DIR/work/<slug>"; mkdir -p "$W" "$CLAUDE_PROJECT_DIR/output/<slug>"
cp "$CLAUDE_PROJECT_DIR/recordings/<الملف>" "$W/src.mov"            # أو رابط (ln -s) للملفات الكبيرة
node "${CLAUDE_PLUGIN_ROOT}/engine/video.js" fix "$W/src.mov" --out "$W/src.fixed.mp4"   # تسجيل متصفح (WebM/MP4 مقطّع) → MP4 نظيف بفريمات ثابتة
node "${CLAUDE_PLUGIN_ROOT}/engine/video.js" probe "$W/src.fixed.mp4"
```
- بالطول (عمودي)؟ مو هالوصفة — روح لـ `SKILL.md` (ريل) ولا تمطّه.
- اقرأ `.io/theme.json` و`project.json` (`ending.signOff` — الختام محمي من القص).

## ٢. التفريغ
```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/18_long_transcribe.py" "$W/src.fixed.mp4" "$W/long"     # words.json + transcript.txt
```
أطول من ١٠ دقايق؟ هذا الطريق (قطع ~٢٠ ث) — لا تفرّغ الملف الطويل مرة وحدة.

## ٣. قص السكتات والأغلاط
```bash
node "${CLAUDE_PLUGIN_ROOT}/engine/video.js" plan "$W/src.fixed.mp4" --noise -32 --min 0.6 --out "$W/cut.json"
```
- **السكتات:** للطويل خلّ `--min 0.6`–`0.8` (أهدأ من الريل؛ نفَس طبيعي يبقى).
- **الأغلاط:** اقرأ `transcript.txt` ودوّر على: جملة معادة (خذ **آخر** محاولة)، بداية غلط («لا لا، خلني أعيد»)، تأتأة طويلة، «اقطع هنا». شيل مداها من `keep` بـ `cut.json` (حدود من `words.json`، على السكتة بين الكلمات). نفس قواعد `50_smart_cuts.py`: الكلمة اللي لها معنى ما تنشال إلا جنب سكتة، والختام ما ينقص.
- طلب من الطابور = موافقة على المونتاج، بس **الأغلاط المشكوك بيها لا تشيلها** — اكتبها بـ `publish.md` («شيّك 12:40»).
```bash
node "${CLAUDE_PLUGIN_ROOT}/engine/video.js" cut "$W/src.fixed.mp4" --plan "$W/cut.json" --out "$W/cut.mp4"   # الصوت ينضبط على ‎-14 LUFS
```

## ٤. اللون السينمائي (+ شرائط ٢.٣٩ وحبيبات خفيفة)
لوكات تناسب كلام طويل بالعرض (من `library/looks/catalog.json`):

| اللوك | يناسب |
|---|---|
| `teal_orange_soft` (الافتراضي) | فلوگ، مقابلة، درس بالكاميرا |
| `documentary` | شرح جدي، تحقيق، أخبار |
| `skin_soft` · `natural_plus` | كلام للكاميرا — أخف لمسة |
| `warm_film` · `warm_interior` | قصة شخصية، بودكاست، قعدة |
| `cool_film` · `tech_cool` | تقنية، برمجة، مكتب |
| `teal_orange` · `bleach_bypass` · `moody_dark` | مقدمة/تريلر، تحفيز، قصة درامية |
| `golden_hour` | تصوير برّه وقت الغروب |

(نفس القائمة بالكود: `CINEMATIC_LOOKS` بـ `engine/video.js`. نوع الحساب عنده `looks` مقترحة — `account-type.js show` — قدّمها إذا بالقائمة.)

قارن ٣ على فريم من الفيديو، وبعدها طبّق:
```bash
node "${CLAUDE_PLUGIN_ROOT}/engine/grade.js" preview "$W/cut.mp4" --looks teal_orange_soft,documentary,skin_soft --out "$W/looks.jpg"
node "${CLAUDE_PLUGIN_ROOT}/engine/video.js" cinematic "$W/cut.mp4" --look teal_orange_soft --strength 0.8 --grain 6 --letterbox 2.39 --out "$W/graded.mp4"
```
- `--letterbox 2.39` (الافتراضي بالعرض) شرائط سودة فوق وجوه. **شاشة أو سلايدات أو نص؟ `--letterbox off`** — الشرائط تغطي المحتوى. بالطول ما تنحط إلا بـ `force`.
- `--grain 6` حبيبات فيلم خفيفة (٠ = بلا). أقوى من ١٠ تبين مثل تشويش بضغط يوتيوب.
- `--strength` ٠٫٦–٠٫٨ لوجوه الناس؛ ١ للمقدمات بس. `--dry` يطبع أوامر ffmpeg بلا تشغيل.
- يعيد ضبط الصوت على ‎-14 LUFS (يوتيوب يطبّع لهالمستوى).

## ٥. انترو / أوترو / شريط الاسم — بهويته
سكل **io-motion** بمقاس 1920×1080 وألوان `theme.json` وخطه:
- **انترو** ٣–٥ ث: «انترو بالحساب» (الاسم + عنوان الحلقة). الهوك الحقيقي = أول جملة قوية من كلامه **قبل** الانترو (٥–١٥ ث)، مو بعده.
- **شريط الاسم** (lower-third): قالب «شريط اسم ليوتيوب» — الاسم + لقب قصير، شفاف (`.mov` ProRes 4444 أو `.webm` alpha)، يطلع بأول ظهور ٥ ث، وعند كل ضيف.
- **أوترو** ٥–٨ ث: بطاقة متابعة (`ending.followCard`) + `ending.ctaDefault`.

التركيب (ffmpeg — الصوت يبقى ‎-14):
```bash
cd "$W"
# شريط الاسم فوق الفيديو من الثانية 8 لين 13
ffmpeg -y -i graded.mp4 -i lower.mov -filter_complex "[1:v]setpts=PTS-STARTPTS+8/TB[l];[0:v][l]overlay=0:0:enable='between(t,8,13)'[v]" -map "[v]" -map 0:a -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a copy body.mp4
# هوك + انترو + جسم + أوترو (نفس المقاس والفريمات والصوت 48k)
printf "file '%s'\n" hook.mp4 intro.mp4 body.mp4 outro.mp4 > list.txt
ffmpeg -y -f concat -safe 0 -i list.txt -c:v libx264 -crf 18 -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -ar 48000 -af loudnorm=I=-14:TP=-1.5:LRA=11 "$CLAUDE_PROJECT_DIR/output/<slug>/<slug>.youtube.mp4"
```
(`hook.mp4` = قصّة الجملة القوية من `graded.mp4` بـ `-ss/-to`. انترو/أوترو بلا صوت؟ ضيف `anullsrc` بنفس المدة قبل الـconcat.)

## ٦. الفصول → نص فصول يوتيوب
من `transcript.txt`: كل تغيير موضوع = فصل. قواعد يوتيوب: أول فصل `00:00`، ٣ فصول على الأقل، كل فصل ≥ ١٠ ث، بترتيب تصاعدي.
- الأزمنة بـ `transcript.txt` = زمن **المصدر**. حوّلها لزمن المخرج بعد القص + الهوك والانترو:
```bash
node -e "const C=require('${CLAUDE_PLUGIN_ROOT}/engine/cut-core.js');const k=require('$W/cut.json').keep;const pre=+process.argv[1];for(const s of process.argv.slice(2)){const t=C.mapTime(+s,k)+pre;console.log(String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0'))}" <طول_الهوك+الانترو> 0 95.2 310.7
```
- اكتب `output/<slug>/chapters.txt` بلهجته، عنوان قصير لكل فصل:
```
00:00 المقدمة
01:35 أول خطأ يسويه الكل
05:10 الطريقة الصح خطوة بخطوة
```

## ٧. الثمبنيل + حزمة النشر
- سكل **io-thumbnail-video** → ثمبنيل يوتيوب 16:9 (1280×720) بثلاث أفكار من أقوى لقطة (وجه واضح + ٣–٤ كلمات) ← `output/<slug>/thumbnail.jpg`.
- سكل **io-publish-kit** ← عنوان (≤ ٦٠ حرف) + وصف (الفصول من `chapters.txt`) + هاشتاقات ← `output/<slug>/publish.md`. لا تنشر — النشر بموافقة صريحة بالشات.

## ٨. ريلز منه (صيغة `both`) — ٣–٥ ريلز بكابشن
نفس طريق «حلقة كاملة ← عدة ريلات» بـ `references/landscape.md` (`words.json` جاهز من خطوة ٢):
1. من `transcript.txt` اختار ٣–٥ لحظات (٢٠–٦٠ ث): معلومة وحدة كاملة، رقم، قصة قصيرة، رأي جريء. **الطابور = موافقة على ٣**؛ أكثر من ٣ اعرض القائمة أول.
2. لكل ريل مجلد `work/<slug>-reel-<n>/` + `spec.json` ← `20_episode_cuts.py` ← `fixes.json` ← `02_captions.py` ← `03_cut_zoom.py` (بالطول حول الوجه) ← **🪝 الهوك المكتوب** (`22_hook.py` — `references/podcast-hook.md`) ← الرسم ← `06b` ← `19_seam_check.py` (إلزامي).
3. اللون: نفس اللوك بلا شرائط وبلا حبيبات قوية: `video.js cinematic <reel> --look <نفسه> --letterbox off --grain 3`.
4. انسخهم لـ `output/<slug>/reels/` وسوّ لكل واحد كفر (thumbnail-video، كفر الريل).

## ٩. التسليم
- `queue.js done <id> --out "output/<slug>/<slug>.youtube.mp4" --note "خلص: فيديو طويل + <n> ريلز"`.
- ورّيه: لقطة من اللون (`looks.jpg`)، الفصول، الثمبنيل، وقائمة الملفات. «شيّك» من خطوة ٣ إذا فيه.

## ⛔
- لا تمط فيديو عمودي لعرضي ولا العكس — بالطول = `SKILL.md`، وريلز من العرضي = قصّ حول الوجه (خطوة ٨).
- لا شرائط على شاشة/سلايدات، ولا حبيبات قوية على نص صغير.
- الفصول بزمن **المخرج** — زمن المصدر يطلع غلط بعد القص.
- لا نشر بدون موافقة صريحة.
