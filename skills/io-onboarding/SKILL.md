---
name: io-onboarding
description: يجمع هوية صانع المحتوى ويحفظها في .io/creator-profile.md — يُشغَّل تلقائياً في أول استخدام أو عند قول "سجل بياناتي"، "عرّف نفسك"، "احفظ معلوماتي"، "أنا صانع محتوى". يعرض استبانة تفاعلية داخل الشات مباشرة. ALWAYS use this skill at the very start before any other skill if no creator-profile.md exists.
---

# Onboarding — I/O Studio

## نوع الحساب وشكل المحتوى والحسابات المتابَعة
نافذة الترحيب تسأل عنهم (خطوة «نوع حسابك»). بالشات (بلا نافذة) اسأل بعد الاسم والحسابات — سؤال لكل وحدة:
1. **نوع حسابك؟** طبيب/صحة · مهندس ديكور · رائد أعمال · صانع محتوى · مدرّس/طالب · شخص عادي (القائمة: `node "${CLAUDE_PLUGIN_ROOT}/engine/account-type.js" list`).
2. **شكل المحتوى؟** فيديو عادي (كلام للكاميرا) لو بودكاست (حلقة تنقص لريلز).
3. **شنو الحسابات اللي تتابعها بمجالك؟** (إنستقرام/يوتيوب/تيك توك/إكس + مواقع) — تصير أول مصدر للوحة الترند اليومية.
احفظ `accountType` (الـid: doctor/interior/entrepreneur/creator/teacher/personal) و`contentFormat` (video/podcast) بـ `.io/project.json`، والحسابات بـ `.io/sources.json` بشكل `{"sites":[...],"accounts":[{"platform":"instagram","handle":"@name"}],"keywords":[...]}` وضيف لـ `sites` مواقع النوع (`trendSites` من `node "${CLAUDE_PLUGIN_ROOT}/engine/account-type.js" show`). اقترح مزاج الهوية من الحزمة (`identity.mood`).

## ٠. أول سؤال بعد التنصيب: الويب لو الشات؟
أول رسالة منك — سؤال واحد بالضبط (AskUserQuestion بخيارين إذا متوفرة، وإلا سطر واحد):

> **«تكمل الإعدادات من صفحة الويب لو هنا بالشات؟»** — «صفحة الويب» · «هنا بالشات»

الطريقتين يكتبون **نفس الملفات** (`.io/creator-profile.md` · `theme.json` · `project.json` · `sources.json`) بنفس الكود (`engine/onboard.js`).

### أ) صفحة الويب (نافذة الترحيب)
افتحها بالخلفية — يختار لهجته، يكتب اسمه والبراند وحساباته ومجاله، نوع حسابه، الحسابات اللي يتابعها، **الترند اليومي والساعة**، ويختار هويته:
```bash
node "${CLAUDE_PLUGIN_ROOT}/engine/serve.js" --dir "$CLAUDE_PROJECT_DIR" --open welcome.html --reuse
```
گوله بجملة: «فتحتلك نافذة الترحيب — خلّصها وگلي "خلصت"». لما يرجع: اقرأ `.io/` (اللهجة صارت محفوظة) وكمّل من الخطوة اللي بعدها بلهجته (الجمهور، النبرة، القيود)، وبعدها **الترند اليومي** (تحت). ما انفتحت النافذة (سيرفر بعيد، جوال)؟ اعطه الرابط اللي طبعه الأمر، أو حوّل للشات.

### ب) هنا بالشات (الإعداد بالشات)
نفس خطوات الصفحة، سؤال لكل خطوة (AskUserQuestion إذا متوفرة) وبلهجته من لحظة ما يختارها:
1. اللهجة (قسم «تحية البداية» تحت) · 2. اسمه + البراند + حساباته الثلاث + مجاله · 3. نوع حسابه وشكل المحتوى والحسابات اللي يتابعها · 4. **«تريد الترند يومياً؟»** وإذا إي: «بأي ساعة؟» · 5. الهوية البصرية (خطوة 2 تحت: ترفعها لو ننشئها).

بعد آخر جواب اكتب ملف JSON مؤقت بنفس شكل الصفحة واكتبه بأمر واحد:
```json
{ "dialect": "iraqi", "name": "…", "brand": "…", "niche": "…",
  "handles": { "instagram": "@…", "youtube": "@…", "tiktok": "@…" },
  "accountType": "creator", "contentFormat": "video",
  "sources": { "accounts": [{ "platform": "instagram", "handle": "@…" }], "sites": [], "keywords": [] },
  "dailyTrends": { "enabled": true, "hour": 9 },
  "identity": { "mode": "create", "mood": "warm", "option": 1 } }
```
```bash
node "${CLAUDE_PLUGIN_ROOT}/engine/onboard.js" apply /tmp/io-onboard.json --dir "$CLAUDE_PROJECT_DIR"
```
(`identity.mode`: `create` + mood/accent/option، أو `keep` إذا سوّيت الهوية بـ `identity.js` قبلها.) صلّح أي خطأ يطبعه وأعد.

## ٠.٥ الترند اليومي (بالطريقتين)
السؤال: **«تريد الترند يومياً؟»** — إي ← «بأي ساعة يناسبك؟» (افتراضي ٩ الصبح). ينحفظ بـ `.io/project.json`:
`"dailyTrends": { "enabled": true, "hour": 9 }` — يتغيّر بعدين من البرنامج (تبويب «هويتي» ← الترند اليومي).

إذا مفعّل:
1. **عندك أداة جدولة؟** (مهام مجدولة بـ Claude Code أو تطبيق Claude — أي أداة تسوي «مهمة يومية») سوّ مهمة يومية بالساعة `<hour>` (بتوقيته) بهالطلب:
   «شغّل سكل io-trends من آي أو استوديو لمجلد `<المشروع>`: جيب ترند مصادري، اكتب ٣–٥ أفكار بالبرنامج (add-ideas)، وبعدها افتح برنامج آي أو استوديو على الأفكار.» — وگله بجملة إنها انجدولت. ما تگدر تجدول؟ لا تحچي عن أدوات؛ الهوك يكفي.
2. **الاحتياط (دائماً شغّال):** الهوك `hooks/session-start.js` — إذا الترند مفعّل وتاريخ `.io/trends-last.json` مو اليوم، يذكّرك أول الجلسة تشغّل سكل io-trends، تكتب الأفكار بالبرنامج، وتفتح `app.html#ideas` (`serve.js --reuse`).

## تحية البداية + اختيار اللهجة (إذا ما استخدم النافذة)
في أول رسالة رحّب بجملة وحدة، وبنفس الرسالة اسأل عن اللهجة — **سؤال واحد** بخيارات (أداة الأسئلة AskUserQuestion إذا متوفرة، وإلا قائمة مرقمة):

"مرحباً 👋 — أنا آي أو استوديو. بأي لهجة تحب أحچي وياك وأكتب محتواك؟"

الخيارات من `${CLAUDE_PLUGIN_ROOT}/library/dialects/dialects.json` (اعرض الاسم بس):
عراقي · كويتي · سعودي · إماراتي · شامي · فلسطيني/أردني · مصري · سوداني · مغاربي · فصحى مبسّطة · (غير ذلك — يكتبها).
إذا الأداة تسمح بـ4 خيارات بس: اعرض الأقرب لجمهوره + «غير ذلك» وخلّه يكتب.

**من لحظة ما يختار:** كل كلامك ويّاه — الأسئلة الجاية، التأكيدات، الأخطاء، الملخصات — بهاللهجة، بمفرداتها من الملف (`words`، `spelling`، `sample`، وتجنّب `avoid`). ومحتواه (سكربتات، كاروسيلات، كابشنات) بنفس اللهجة إلا إذا طلب غير ذلك.
- احفظها فوراً، حتى لو ما كمّل التعريف: `node "${CLAUDE_PLUGIN_ROOT}/engine/config.js" init` ثم اكتب `"dialect": "<id>"` بـ `.io/project.json` (الـid من الملف، مثل `iraqi`). لهجة مو بالقائمة؟ اكتب اسمها كما هو.
- الجلسات الجاية: الهوك (`hooks/session-start.js`) يقراها ويذكّرك بيها تلقائياً.
- يريد يغيّرها بأي وقت («احچي ويّاي مصري»)؟ غيّر `dialect` بـ project.json وكمّل باللهجة الجديدة على طول.
- باستبانة الهوية تحت: سؤال اللهجة **مختار مسبقاً** بالجواب هذا — لا تسأله مرة ثانية.

## الهدف
جمع هوية صانع المحتوى عبر استبانة تفاعلية تظهر داخل الشات مباشرة، ثم حفظها في `.io/creator-profile.md`.

## الخطوات

### 1. تحقق من وجود بروفايل
ابحث في فولدر المشروع عن `.io/creator-profile.md`:
- **إن وجد:** اقرأه واسأل المستخدم إن أراد التعديل عليه
- **إن لم يوجد:** انتقل لخطوة 2

### 2. الهوية البصرية: ترفعها، لو ننشئها؟ (سؤال واحد، بلهجته)
اسأل بخيارين واضحين (AskUserQuestion إذا متوفرة):
- **📤 أرفع هويتي** — عنده شعار، بوستات سابقة، لقطات من حسابه، ملف ألوان، أو دليل هوية (PDF).
- **✨ أنشئ لي هوية** — يبدي من صفر.

**أ) أرفع هويتي:**
1. خلّه يحط الملفات بمجلد المشروع (أو يسحبها للشات)، وشوف شنو بالمجلد بنفسك (صور، `theme.json`، PDF) — لا تسأله «عندك؟».
2. صور/شعار/theme.json:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/engine/identity.js" upload <الشعار> [صور بوستات…] [theme.json]
   ```
   يطلّع الألوان من الصور بتباين مقروء، يحفظ الشعار بـ `.io/logo.*`، ويكتب `.io/theme.json`، ويرسم `.io/identity-preview.png` (شريحة تجريبية بالهوية) و`.io/refs_palette.jpg`.
3. دليل هوية PDF؟ اقراه بنفسك، خذ منه الألوان (hex) والخطوط، واكتبها بـ `theme.json` (`colors` و`fonts`)، وبعدين `identity.js preview`.
4. افتح المعاينة بـ Read وورّيه: «هاي ألوانك وخطك على شريحة تجريبية — تمام؟». الخط ما ينطلع من الصور — اسأله أو اقترح من الخطوط الجاهزة (تحت).

**ب) أنشئ لي هوية:**
1. سؤال واحد عن **الإحساس** (بلهجته): دافئ وودّي · هادئ ومريح · جريء ولافت · فخم وراقي · مرح وشبابي · طبيعي وترابي · تقني وحديث · ناعم وأنثوي. (`identity.js moods` يطبعها.) عنده لون يحبه؟ خذه كـ `--accent`.
2. ```bash
   node "${CLAUDE_PLUGIN_ROOT}/engine/identity.js" create --mood <الإحساس> [--accent "#hex"] [--dark]
   ```
   يطلّع 3 هويات كاملة (ألوان بتباين مقروء + خط عناوين) ويرسمها جنب بعض بـ `.io/identity-options.png` — افتحها بـ Read واعرضها عليه.
3. اختار؟ `node "${CLAUDE_PLUGIN_ROOT}/engine/identity.js" pick <رقم>`. يريد تعديل («أغمق»، «غيّر البرتقالي لأخضر»)؟ عدّل `theme.json` بيدك وبعدين `identity.js preview`.
4. شعار؟ ما نرسم شعار رسمي، بس نگدر نسوي **شعار حرفي بسيط** (أول حرف من اسمه بدائرة بلون التمييز، مثل شعار الاستوديو) — اسأله إذا يريده.

**الخطوط الجاهزة بالبلقن:** Tajawal (نظيف وودّي) · Cairo (عصري) · IBM Plex Sans Arabic (تقني) · Readex Pro (هادئ) · Noto Kufi Arabic (رسمي) · Lalezar (عناوين مرحة) · Aref Ruqaa (رقعة تراثي).

بعد ما تثبت الهوية → كمّل للاستبانة (خطوة 3) بس **بدون** سؤال الألوان — صار محفوظ.

### 3. ابنِ الاستبانة كـ artifact داخل الشات

**مهم:** اعرض الاستبانة كاملة دفعة واحدة كـ artifact — لا تسأل سؤالاً سؤالاً ولا تكتب مقدمة. استخدم `create_artifact` مع الـ HTML أدناه مباشرة:

```html
<h2 class="sr-only">استبانة هوية صانع المحتوى</h2>

<style>
.ob-wrap { padding: 1rem 0; }
.ob-section { background: var(--color-background-secondary); border: 0.5px solid var(--color-border-tertiary); border-radius: var(--border-radius-lg); padding: 1rem 1.25rem; margin-bottom: 12px; }
.ob-label { font-size: 14px; font-weight: 500; color: var(--color-text-primary); margin-bottom: 3px; }
.ob-hint { font-size: 12px; color: var(--color-text-secondary); margin-bottom: 10px; }
.chips { display: flex; flex-wrap: wrap; gap: 7px; direction: rtl; }
.chip { background: var(--color-background-primary); border: 0.5px solid var(--color-border-secondary); border-radius: 20px; padding: 6px 14px; font-size: 13px; cursor: pointer; color: var(--color-text-secondary); transition: all 0.15s; user-select: none; font-family: inherit; }
.chip:hover { border-color: var(--color-border-primary); color: var(--color-text-primary); }
.chip.on { background: #D97757; border-color: #D97757; color: #fff; font-weight: 500; }
.chip.disabled { opacity: 0.38; cursor: default; pointer-events: none; }
.ob-other { margin-top: 8px; display: none; }
.ob-other.show { display: block; }
.ob-btn { width: 100%; background: #D97757; color: #fff; border: none; border-radius: var(--border-radius-md); padding: 13px; font-size: 15px; font-weight: 500; cursor: pointer; font-family: inherit; margin-top: 4px; transition: opacity 0.15s; }
.ob-btn:hover { opacity: 0.88; }
</style>

<div class="ob-wrap" dir="rtl">

  <div class="ob-section">
    <div class="ob-label">اسم حسابك على انستقرام</div>
    <div class="ob-hint">مثال: @your_handle</div>
    <input type="text" id="ob-handle" placeholder="@username" style="width:100%; direction:rtl; text-align:right;">
  </div>

  <div class="ob-section">
    <div class="ob-label">نيشك</div>
    <div class="ob-hint">اختر حتى اثنين</div>
    <div class="chips" id="g-niche">
      <span class="chip" data-g="niche" data-max="2">تقنية وذكاء اصطناعي</span>
      <span class="chip" data-g="niche" data-max="2">استثمار ومال</span>
      <span class="chip" data-g="niche" data-max="2">تطوير ذات</span>
      <span class="chip" data-g="niche" data-max="2">ريادة أعمال</span>
      <span class="chip" data-g="niche" data-max="2">رياضة ولياقة</span>
      <span class="chip" data-g="niche" data-max="2">طبخ وأكل</span>
      <span class="chip" data-g="niche" data-max="2">سفر وسياحة</span>
      <span class="chip" data-g="niche" data-max="2">تعليم</span>
      <span class="chip" data-g="niche" data-max="2">ترفيه</span>
      <span class="chip ob-other-trigger" data-g="niche" data-max="2">أخرى</span>
    </div>
    <div class="ob-other" id="other-niche"><input type="text" placeholder="اكتب نيشك" style="width:100%; direction:rtl; text-align:right;"></div>
  </div>

  <div class="ob-section">
    <div class="ob-label">جمهورك</div>
    <div class="ob-hint">اختر كل ما ينطبق</div>
    <div class="chips" id="g-audience">
      <span class="chip" data-g="audience">شباب 18-24</span>
      <span class="chip" data-g="audience">بالغون 25-35</span>
      <span class="chip" data-g="audience">مهنيون وموظفون</span>
      <span class="chip" data-g="audience">رجال أعمال</span>
      <span class="chip" data-g="audience">طلاب</span>
      <span class="chip" data-g="audience">عائلات</span>
    </div>
  </div>

  <div class="ob-section">
    <div class="ob-label">لهجتك</div>
    <div class="ob-hint">اختر واحدة</div>
    <div class="chips" id="g-dialect">
      <span class="chip" data-g="dialect" data-max="1">عراقي</span>
      <span class="chip" data-g="dialect" data-max="1">كويتي</span>
      <span class="chip" data-g="dialect" data-max="1">سعودي</span>
      <span class="chip" data-g="dialect" data-max="1">إماراتي</span>
      <span class="chip" data-g="dialect" data-max="1">شامي</span>
      <span class="chip" data-g="dialect" data-max="1">فلسطيني/أردني</span>
      <span class="chip" data-g="dialect" data-max="1">مصري</span>
      <span class="chip" data-g="dialect" data-max="1">سوداني</span>
      <span class="chip" data-g="dialect" data-max="1">مغاربي</span>
      <span class="chip" data-g="dialect" data-max="1">فصحى مبسّطة</span>
      <span class="chip ob-other-trigger" data-g="dialect" data-max="1">أخرى</span>
    </div>
    <div class="ob-other" id="other-dialect"><input type="text" placeholder="اكتب لهجتك" style="width:100%; direction:rtl; text-align:right;"></div>
  </div>

  <div class="ob-section">
    <div class="ob-label">نبرة محتواك</div>
    <div class="ob-hint">اختر حتى اثنين</div>
    <div class="chips" id="g-tone">
      <span class="chip" data-g="tone" data-max="2">رسمي وموضوعي</span>
      <span class="chip" data-g="tone" data-max="2">ودّي وقريب</span>
      <span class="chip" data-g="tone" data-max="2">جريء ومباشر</span>
      <span class="chip" data-g="tone" data-max="2">تعليمي وشارح</span>
      <span class="chip" data-g="tone" data-max="2">ساخر وخفيف</span>
    </div>
  </div>

  <div class="ob-section">
    <div class="ob-label">منصاتك</div>
    <div class="ob-hint">اختر كل ما ينطبق</div>
    <div class="chips" id="g-platforms">
      <span class="chip" data-g="platforms">انستقرام</span>
      <span class="chip" data-g="platforms">تيك توك</span>
      <span class="chip" data-g="platforms">تويتر / X</span>
      <span class="chip" data-g="platforms">يوتيوب</span>
      <span class="chip" data-g="platforms">لينكدإن</span>
      <span class="chip" data-g="platforms">سناب شات</span>
    </div>
  </div>

  <div class="ob-section">
    <div class="ob-label">ثيم ألوانك</div>
    <div class="ob-hint">اختر ستايل جاهز أو اكتب ألوانك — عندك شعار أو هوية؟ حطها في فولدر المشروع وأنا أستخرج الألوان منها تلقائياً</div>
    <div class="chips" id="g-colors">
      <span class="chip" data-g="colors" data-max="1">ستايل Claude — بيج وبرتقالي</span>
      <span class="chip" data-g="colors" data-max="1">ستايل انستقرام — بنفسجي ووردي</span>
      <span class="chip" data-g="colors" data-max="1">داكن ذهبي</span>
      <span class="chip" data-g="colors" data-max="1">أبيض نظيف</span>
      <span class="chip" data-g="colors" data-max="1">أزرق مؤسسي</span>
      <span class="chip ob-other-trigger" data-g="colors" data-max="1">ألواني الخاصة</span>
    </div>
    <div class="ob-other" id="other-colors"><input type="text" placeholder="مثال: #D97757 خلفية فاتحة #F0EEE6" style="width:100%; direction:ltr; text-align:left;"></div>
  </div>

  <button class="ob-btn" onclick="obSave()">احفظ هويتي ✓</button>
</div>

<script>
document.querySelectorAll('.chip').forEach(function(chip) {
  chip.addEventListener('click', function() {
    var g = chip.dataset.g;
    var max = parseInt(chip.dataset.max) || 99;
    var isOther = chip.classList.contains('ob-other-trigger');
    var group = document.getElementById('g-' + g);
    var otherDiv = document.getElementById('other-' + g);
    if (chip.classList.contains('on')) {
      chip.classList.remove('on');
      if (isOther && otherDiv) otherDiv.classList.remove('show');
      updateDisabled(group, max);
      return;
    }
    var active = group.querySelectorAll('.chip.on').length;
    if (active >= max) return;
    chip.classList.add('on');
    if (isOther && otherDiv) otherDiv.classList.add('show');
    updateDisabled(group, max);
  });
});

function updateDisabled(group, max) {
  var active = group.querySelectorAll('.chip.on').length;
  group.querySelectorAll('.chip').forEach(function(c) {
    if (!c.classList.contains('on')) {
      if (active >= max) c.classList.add('disabled');
      else c.classList.remove('disabled');
    }
  });
}

function getVals(g) {
  var group = document.getElementById('g-' + g);
  var vals = [];
  group.querySelectorAll('.chip.on').forEach(function(c) {
    if (c.classList.contains('ob-other-trigger')) {
      var inp = document.querySelector('#other-' + g + ' input');
      if (inp && inp.value.trim()) vals.push(inp.value.trim());
    } else {
      vals.push(c.textContent.trim());
    }
  });
  return vals.join('، ');
}

function obSave() {
  var handle = document.getElementById('ob-handle').value.trim();
  if (!handle) { alert('اكتب اسم حسابك أولاً'); return; }
  var niche = getVals('niche');
  var dialect = getVals('dialect');
  var tone = getVals('tone');
  if (!niche || !dialect || !tone) { alert('اختر النيش واللهجة والنبرة على الأقل'); return; }
  var msg = 'احفظ هويتي:\nاسم الحساب: ' + handle
    + '\nالنيش: ' + niche
    + '\nالجمهور: ' + (getVals('audience') || 'غير محدد')
    + '\nاللهجة: ' + dialect
    + '\nالنبرة: ' + tone
    + '\nالمنصات: ' + (getVals('platforms') || 'انستقرام')
    + '\nالألوان: ' + (getVals('colors') || 'غير محدد');
  sendPrompt(msg);
}
</script>
```

### 4. احفظ البروفايل
بعد استلام رسالة "احفظ هويتي:" من المستخدم، احفظ البيانات في `.io/creator-profile.md`:

```markdown
---
name: creator-profile
description: هوية صانع المحتوى — تستخدم في كل الكاروسيلات والداش بوردات
type: user
---

**اسم الحساب:** [الجواب]
**النيش:** [الجواب]
**الجمهور:** [الجواب]
**اللهجة:** [الجواب]
**نبرة المحتوى:** [الجواب]
**المنصات:** [الجواب]
**الألوان:** [الجواب]
**القياس المفضل:** 1080×1440 (الافتراضي — الأكبر بفيد انستقرام؛ يتغيّر لو طلب المستخدم 1080×1350)
```

### 5. بعد الحفظ — اعرض القائمة
قل للمستخدم:

"تم حفظ هويتك ✅ — من الحين كل كاروسيل وداش بورد راح يكون بألوانك وأسلوبك تلقائياً.

شو تبي نبدأ فيه؟
- **جيب أخبار** — أشوف آخر الأخبار في مجالك وتختار منها
- **اعمل كاروسيل** — حدد الموضوع وأبنيه لك مباشرة
- **كفر فيديو متحرك** — أصمم كفر أول سلايد فيديو يشد الانتباه
- **🛍️ إعلان منتج** — أرسل لي رابط أي منتج وأسحب صوره الرسمية وأبني لك إعلان 10 شرائح كامل
- **👔 فحص جودة** — قبل ما تنشر أي كاروسيل، أشغّل مدير الجودة يفحصه بالرؤية مقابل قيودك (بدون أي نشر)"

### 6. مثال استخدام: استوديو إعلان المنتجات 🛍️
لما يسأل المستخدم "شلون أسوي إعلان منتج؟" أو يختار «إعلان منتج»، اعرض له هذا المثال:

"سهلة حيل — ترسل لي رسالة وحدة بس، مثل:

> **سو لي إعلان عن https://store.insta360.com/product/ace-pro-2**
> وصلتني الكاميرا أمس، وأبي الـCTA يوجه لمتجري

وأنا أسوي الباقي كله:
1. 🔍 أقرأ صفحة المنتج الرسمية **بترتيب أقسامها** — كل ميزة بعنوانها ومقطعها الخاص
2. 🎬 كل ميزة لها مقطع تصير **شريحة فيديو** بنص ميزتها هي (الفيديو يتقدّم على الصورة)
3. 👁️ أفحص كل مقطع بأربع لقطات وأستبعد أو أقصّ أي شي يخالف قيودك
4. 📊 كل رقم من نص الصفحة حرفياً — ما أخترع، والمصطلحات التقنية تبقى إنقليزية (4K/120fps · f/2.0)
5. 🎨 أبني الكاروسيل بألوانك ولهجتك: فيديو المنتج أولاً، شريحة لكل ميزة، وCTA بصورتك ومتجرك
6. 📤 المقاطع تنركّب بمقاس الشريحة (1080×1440) جاهزة للنشر، مو مقاطع خام 16:9

حتى لو ما عندك رابط — قول لي اسم المنتج بس وأنا ألقى صفحته الرسمية."


### 7. مدير الجودة (بوابة قبل النشر) 👔
عند "افحص الجودة" أو قبل أي نشر، شغّل إيجنت **quality-manager**: يفتح كل شريحة بعينه ويفحصها مقابل **قيودك من البروفايل** (لو حطيت قيد محتوى مثل "بدون صور نساء" يفحصه حتى داخل الشاشات والانعكاسات) + دستور جودة عام (الهوك يوقف السكرول، أرقام غربية، ما فيه نص يطفح، شريحة حفظ، CTA). يطلع تقرير: ✅ يعدّي / ⛔ يحتاج إصلاح — **بدون ما ينشر أبداً**. أنت آخر قرار.

---

## 🆕 I/O Studio — ملفات الهوية الثلاثة
> مبني على onboarding من content-engine (ماجد الزعابي، بإذنه).

**بـ Claude Code (بدون artifacts):** بدل الاستبانة، اسأل نفس الأسئلة بأداة الأسئلة (AskUserQuestion) — سؤال لكل بند بخيارات جاهزة — أو قائمة مرقمة وحدة.

**أضف للأسئلة:** حساب كل منصة (إنستقرام · يوتيوب · تيك توك — نفس الاسم؟)، ونوع الأرقام (1 2 3 أو ١ ٢ ٣)، والقيود (أشياء ما تطلع أبداً).
**ونهاية الفيديو ووصف المنشور** (اختياري، «تلقائي» إذا ما قرر): الجملة اللي يختم بيها كلامه بالضبط (`ending.signOff` — القص الذكي ما يقصها أبداً) · كلمة التعليق الافتراضية للـCTA (`ending.ctaDefault`) · بطاقة متابعة بالنهاية؟ (`ending.followCard`) · أسلوب وصف المنشور: مختصر / تعليمي / حكاية (`writingStyle`: `short`/`educational`/`storytelling`/`auto`) · ستايل الفيديو ثابت أو يختاره Claude لكل فيديو (`videoStyle`: id من بنك الستايلات أو `auto`). اختيار لفيديو واحد ما يغيّر المحفوظ.

**بعد الحفظ، جهّز ملفات الاستوديو:**
```bash
node "${CLAUDE_PLUGIN_ROOT}/engine/config.js" init
```
- `.io/creator-profile.md` — اكتب فيه الحقول فوق، وأضف تحتها: `- الاسم:`، `- الحسابات:` (الثلاث)، و`## قيود (حواجز ما تنكسر)`.
- `.io/theme.json` — `colors.bg/ink/accent/accent2/soft` hex من ألوانه (تباين النص ≥ 4.5:1)، `fonts.heading`، `handle`، `numerals`.
- `.io/project.json` — `platforms` الثلاث (بالتساوي)، و`handles` لكل منصة، و`dialect`، و`carouselSize`، و`ending` {`followCard`، `ctaDefault`، `signOff`}، و`writingStyle`، و`videoStyle`.
- لهجة تنكتب بـگ أو چ (عراقي، كويتي)؟ اختار خط يرسمها (Cairo · IBM Plex Sans Arabic · Noto Kufi Arabic · Lalezar) — `config.js check` ينبّه لو الخط ما يرسمها (Tajawal وReadex Pro ما يرسمونها).
```bash
node "${CLAUDE_PLUGIN_ROOT}/engine/config.js" check
```
صلّح أي خطأ. محرّك الفيديو ياخذ نفس الهوية: `config.js video-theme <work>`.

**القائمة بعد الحفظ** — أضف للخيارات: «🎬 منتج فيديو»، «✨ موشن»، «🎙️ أسجّل درس»، «📊 إحصائياتي»، «🧒 درس متحرك».
