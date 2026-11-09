<!-- مرجع لسكل io-video-editor — يُقرأ عند الحاجة فقط (توفير توكنز) -->

## 🪟 تشغيل السكل على ويندوز (وماك ولينكس)

**القاعدة:** كل شي مصمّم للماك له بديل على ويندوز ولينكس، والعكس. ولو أداة ناقصة، الإضافة تنصّبها بنفسها — بس بعد ما تطلب.

### التجهيز — أمر واحد
| وين | الأمر |
|---|---|
| أي نظام (الأسهل) | `node engine/doctor.js` ← فحص وتقرير بالعربي · `node engine/doctor.js --install` ← ينصّب الناقص |
| ويندوز PowerShell/CMD بلا قِت-باش | `powershell -ExecutionPolicy Bypass -File skills/io-video-editor/scripts/00_setup.ps1 [--install]` (يحوّل لـdoctor.js، ولو نود ناقص ينصّبه بـwinget) |
| قِت-باش / ماك / لينكس | `scripts/00_setup.sh [--install]` (نفس الشي + `--extras`) |

`--install` على ويندوز يستخدم **winget**: `Gyan.FFmpeg` (فيه ffprobe وzscale) · `Python.Python.3.12` · `Google.Chrome` ·
`BlenderFoundation.Blender` (مع `--all` بس)، ثم `python -m pip install --user …` و`npm i puppeteer-core`.
بعد winget **افتح طرفية جديدة** عشان PATH يتحدّث، وعيد `doctor.js`. ما فيه winget؟ نصّب «App Installer» من متجر مايكروسوفت.
بالماك: Homebrew (ويسأل قبل تنصيب Homebrew نفسه). بلينكس: apt (ومعه `libgles2 libegl1` اللي يحتاجها mediapipe).

### فروق ويندوز اللي لازم تعرفها
- **`python` مو `python3`** — على ويندوز `python3` اختصار متجر مايكروسوفت ويفشل.
  سكربتات الـshell تكتشف المفسّر بنفسها (`scripts/_compat.sh`)، و`_vision.js`/`doctor.js` كذلك. أوامر بايثون المكتوبة بالمراجع بدّلها لـ`python`.
- **العربي وUTF-8** — ترميز ويندوز الافتراضي `cp1252` يكسر أي طباعة أو ملف عربي.
  سكربتات بايثون فيها تهيئة UTF-8 بأولها، وسكربتات الـshell تصدّر `PYTHONUTF8=1`.
- **المسارات** — `pwd` بقِت-باش يعطي `/c/…` وبايثون ما يشوفه إطلاقاً.
  دالة `abspath` بـ`_compat.sh` تعطي `C:/…` الأصلي — **مرّر مجلد الشغل بهذا الشكل دائماً.**
- **الروابط الرمزية** — ويندوز ما يسمح بها بلا صلاحيات؛ `36_facetrack.py` و`23_headcrop.py` ينسخون بدلها (`link_or_copy`).
- **كروم** — يُكتشف تلقائياً (كروم ثم إيدج). للتحديد اليدوي: `set CHROME_PATH=…\chrome.exe`.

### بدائل أدوات الماك (Vision / AVFoundation) — تلقائية
السكربتات تختار بنفسها: **بالماك** تبني أداة السويفت مثل قبل. **بغيره** (أو `IO_VISION=py`) تستخدم `scripts/_vision.py` بنفس المعاملات ونفس الملفات:

| أداة الماك | البديل (ويندوز · لينكس) | يستخدمها |
|---|---|---|
| `personmask.swift` (قصّ الشخص) | MODNet عبر onnxruntime (موديل 25 ميقا ينزل أول مرة) ← احتياط MediaPipe selfie | 11 «الكلام ورا الشخص» + cutout/headout/person · 13 الكولاج · 14 الخلفية الباهتة · 15 البودكاست (الراس برّا) · `_cutout` (28 الكفر · 33 الثمبنيل) · 35 يفعّل حركات القصّ |
| `facetrack.swift` (الوجه + الفم) | MediaPipe FaceLandmarker ← احتياط OpenCV (بلا فم) | 15 · 24 البودكاست · 22b · 23 · 36 · `_landscape` · 28 |
| `handpose.swift` (الكف) | MediaPipe HandLandmarker | 29 |
| `hdr2sdr.swift` (آيفون HDR) | ffmpeg `zscale` + `tonemap=hable` | 03 |

المكتبات: `python -m pip install --user onnxruntime mediapipe opencv-python-headless pillow numpy` (أو `doctor.js --install`).
فحص سريع: `python scripts/_vision.py check`. الموديلات تنحفظ بـ`%USERPROFILE%\.cache\io\models` (أو `IO_MODELS`).
⚠️ القصّ ببايثون أبطأ من Vision (≈0.5 ث للفريم على المعالج) — شغّله بالخلفية للمقاطع الطويلة. الجودة قريبة؛ الشعر والأيدي أصعب.

لو وِسبر يشتغل على المعالج بس (torch بلا CUDA)، استخدم `--model small` بدل `medium`.

### غيرها
- **مشروع كاب كت** (`40_capcut.py`) يشتغل على الاثنين: ماك `~/Movies` (ساندبوكس) · ويندوز `%LOCALAPPDATA%\CapCut\…` — `references/capcut.md`.
- **ترتيب صور الرحلة** من تطبيق الصور ماك بس — بديله بكل الأنظمة: مجلد صور (`skills/io-trips` ← `trip.py scan`).
- **دافنشي** (خط المقابلة بالهوك) برنامج متوفر لويندوز وماك ولينكس — ما يحتاج بديل.
