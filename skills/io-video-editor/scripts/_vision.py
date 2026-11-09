# -*- coding: utf-8 -*-
"""🧭 بدائل Vision لكل الأنظمة (ويندوز · ماك · لينكس) — نفس مخرجات أدوات السويفت بالحرف.

الماك: السكربتات تبني أداة السويفت (Vision المدمج) وتستخدمها مثل قبل — ما تغيّر شي.
غير الماك (أو IO_VISION=py): نفس الأوامر بنفس المعاملات وبنفس صيغة الملفات، ببايثون:

  python _vision.py personmask <inDir> <outDir> [fast|balanced|accurate] [feather]
        ← قناع PNG رمادي لكل jpg (نفس الاسم .png) + meta.json [{f, face:{x,y,w,h} بكسل}]
        القصّ: MODNet (onnxruntime) ← وإلا MediaPipe selfie segmenter
  python _vision.py facetrack <inDir> <out.json>
        ← [{f, face:{x,y,w,h} نِسَب 0..1 أصلها أعلى يسار, mouth, n}]
        الوجه: MediaPipe FaceLandmarker (فيه الفم) ← وإلا OpenCV Haar (بلا فم)
  python _vision.py handpose <dir> <f0> <f1> <out.json>
        ← [{f, hands:[{x,y,c}]}] بكسل (مركز الكف: الرسغ + مفاصل الأصابع) — MediaPipe HandLandmarker
  python _vision.py hdr2sdr <in> <out>
        ← ffmpeg: zscale + tonemap=hable (فيديو آيفون HLG/Dolby Vision ← SDR bt709)
  python _vision.py check [name…]      ← يطبع الجاهز والناقص (رمز خروج 0 = كله جاهز)

المكتبات (مرة وحدة): python -m pip install --user onnxruntime mediapipe opencv-python-headless pillow numpy
الموديلات تنزل أول مرة لـ~/.cache/io/models (أو IO_MODELS): MODNet ‏25 ميقا · وجه 4 · كف 8.

بالسكربتات:  from _vision import tool_cmd ;  cmd = tool_cmd("facetrack", <مسار البرنامج المترجَم>)
             subprocess.run(cmd + [inDir, out])   # cmd = [برنامج السويفت] بالماك، أو [python, _vision.py, facetrack]
"""
import json, os, shutil, subprocess, sys, urllib.request

for _s in (sys.stdout, sys.stderr):          # ويندوز: cp1252 يكسر العربي
    try: _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception: pass

HERE = os.path.dirname(os.path.abspath(__file__))
TOOLS = ("personmask", "facetrack", "handpose", "hdr2sdr")
MODELS = {
    "modnet": ("https://huggingface.co/Xenova/modnet/resolve/main/onnx/model.onnx", "modnet.onnx"),
    "face": ("https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
             "face_landmarker.task"),
    "hand": ("https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
             "hand_landmarker.task"),
    "yunet": ("https://huggingface.co/opencv/face_detection_yunet/resolve/main/face_detection_yunet_2023mar.onnx",
              "face_detection_yunet_2023mar.onnx"),
    "selfie": ("https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite",
               "selfie_segmenter.tflite"),
}
PIP_HINT = "python -m pip install --user onnxruntime mediapipe opencv-python-headless pillow numpy"
# الشفاه الداخلية بشبكة MediaPipe (478 نقطة) — نفس innerLips بـVision
INNER_LIPS = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95]
PALM = [0, 5, 9, 13, 17]   # الرسغ + مفاصل الأصابع (MCP) — نفس handpose.swift


# ───────────── أدوات عامة ─────────────
def _has(mod):
    try:
        __import__(mod); return True
    except Exception:
        return False


def models_dir():
    d = os.environ.get("IO_MODELS") or os.path.join(os.path.expanduser("~"), ".cache", "io", "models")
    os.makedirs(d, exist_ok=True); return d


def model(key):
    """مسار الموديل — ينزّله أول مرة (ملف مؤقت ثم إعادة تسمية، فالتنزيل المقطوع ما يخرّب)."""
    url, name = MODELS[key]
    p = os.path.join(models_dir(), name)
    if os.path.exists(p) and os.path.getsize(p) > 100_000: return p
    print(f"⏬ أنزّل موديل {key} (مرة وحدة) ← {p}", file=sys.stderr, flush=True)
    tmp = p + ".part"
    req = urllib.request.Request(url, headers={"User-Agent": "io-studio"})
    with urllib.request.urlopen(req, timeout=120) as r, open(tmp, "wb") as f: shutil.copyfileobj(r, f)
    os.replace(tmp, p); return p


def link_or_copy(src, dst):
    """رابط رمزي (ماك/لينكس) — ويندوز ما يسمح بالروابط بلا صلاحيات، فننسخ."""
    try: os.symlink(src, dst)
    except (OSError, NotImplementedError, AttributeError): shutil.copyfile(src, dst)


def _ffmpeg_has(filt):
    if not shutil.which("ffmpeg"): return False
    r = subprocess.run(["ffmpeg", "-hide_banner", "-filters"], capture_output=True, text=True)
    return any(len(l.split()) > 1 and l.split()[1] == filt for l in r.stdout.splitlines())


def backend(name):
    """شنو يشغّل الأداة بهالجهاز ببايثون (أو None)."""
    if name == "hdr2sdr": return "ffmpeg-zscale" if _ffmpeg_has("zscale") and _ffmpeg_has("tonemap") else None
    if not (_has("numpy") and _has("PIL")): return None
    if name == "personmask":
        return "modnet" if _has("onnxruntime") else ("mediapipe" if _has("mediapipe") else None)
    if name == "facetrack":
        return "mediapipe" if _has("mediapipe") else ("opencv-haar" if _has("cv2") else None)
    if name == "handpose": return "mediapipe" if _has("mediapipe") else None
    return None


def missing_hint(name):
    if name == "hdr2sdr": return "ffmpeg فيه zscale (ويندوز: winget install Gyan.FFmpeg · ماك: brew install ffmpeg)"
    return PIP_HINT


def tool_cmd(name, bin_path=None, quiet=False):
    """أمر تشغيل الأداة كقائمة: [برنامج السويفت] بالماك لو ينبني، وإلا [python, _vision.py, name]. None لو ولا واحد.
       bin_path = مكان البرنامج المترجَم (كل سكربت عنده مكانه، مثل <work>/bt/facetrack)."""
    if sys.platform == "darwin" and os.environ.get("IO_VISION") != "py":
        b = bin_path or os.path.join(HERE, name)
        if os.path.exists(b): return [b]
        if shutil.which("swiftc"):
            os.makedirs(os.path.dirname(os.path.abspath(b)), exist_ok=True)
            r = subprocess.run(["swiftc", "-O", "-o", b, os.path.join(HERE, name + ".swift")], capture_output=True)
            if r.returncode == 0 and os.path.exists(b): return [b]
    if backend(name): return [sys.executable, os.path.abspath(__file__), name]
    if not quiet: print(f"⚠️ {name}: لا Vision (ماك) ولا البديل جاهز — نصّب: {missing_hint(name)}", file=sys.stderr)
    return None


def _jpgs(d):
    return sorted(f for f in os.listdir(d) if f.endswith(".jpg"))


# ───────────── الوجه ─────────────
class FaceFinder:
    """أكبر وجه + فتحة الفم. MediaPipe لو موجود، وإلا Haar من OpenCV (بلا فم)."""
    def __init__(self, num=4):
        self.mp = self.haar = self.yunet = None
        if _has("mediapipe"):
            try:
                import mediapipe as mp
                from mediapipe.tasks.python import vision, BaseOptions
                o = vision.FaceLandmarkerOptions(base_options=BaseOptions(model_asset_path=model("face")), num_faces=num,
                                                 min_face_detection_confidence=0.4, min_face_presence_confidence=0.4)
                self.mp, self._mpmod = vision.FaceLandmarker.create_from_options(o), mp
            except Exception as e:
                print("⚠️ MediaPipe للوجه ما اشتغل:", str(e)[:120], file=sys.stderr)
        self._cv = None if _has("cv2") else False      # OpenCV يتجهّز وقت الحاجة بس (ما ننزّل شي لو MediaPipe كافي)
        if not self.mp: self._cv_init()
        self.used = "mediapipe" if self.mp else ("opencv-haar" if self.haar is not None else ("opencv-yunet" if self.yunet else None))

    def _cv_init(self):
        """احتياط: Haar (مدمج بـopencv 4) ← وإلا YuNet (موديل 230 كيلو، opencv 4.8+ و5)."""
        if self._cv is not None: return self._cv
        import cv2
        p = os.path.join(getattr(getattr(cv2, "data", None), "haarcascades", ""), "haarcascade_frontalface_default.xml")
        if os.path.exists(p): self.haar = cv2.CascadeClassifier(p)
        elif hasattr(cv2, "FaceDetectorYN"):
            try: self.yunet = cv2.FaceDetectorYN.create(model("yunet"), "", (320, 320), 0.7)
            except Exception as e: print("⚠️ YuNet ما اشتغل:", str(e)[:120], file=sys.stderr)
        self._cv = self.haar is not None or self.yunet is not None
        return self._cv

    def close(self):
        if self.mp: self.mp.close(); self.mp = None

    def find(self, rgb):
        """rgb: numpy HxWx3 → [(x,y,w,h, mouth|None)] نِسَب 0..1 مرتّبة من الأكبر."""
        import numpy as np
        H, W = rgb.shape[:2]; out = []
        if self.mp:
            img = self._mpmod.Image(image_format=self._mpmod.ImageFormat.SRGB, data=np.ascontiguousarray(rgb))
            for lm in self.mp.detect(img).face_landmarks or []:
                xs = [p.x for p in lm]; ys = [p.y for p in lm]
                x0, x1, y0, y1 = max(0, min(xs)), min(1, max(xs)), max(0, min(ys)), min(1, max(ys))
                fh = max(1e-6, max(ys) - min(ys))
                ly = [lm[i].y for i in INNER_LIPS]
                out.append((x0, y0, x1 - x0, y1 - y0, (max(ly) - min(ly)) / fh))
        if not out and self._cv is not False and self._cv_init():   # وجه صغير/جانبي فات MediaPipe — OpenCV يحاول (بلا فم)
            import cv2
            if self.haar is not None:
                g = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
                boxes = self.haar.detectMultiScale(g, 1.1, 5, minSize=(max(24, W // 40),) * 2)
            else:
                self.yunet.setInputSize((W, H))
                found = self.yunet.detect(cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR))[1]
                boxes = [r[:4] for r in found] if found is not None else []
            for (x, y, w, h) in boxes:
                x, y = max(0.0, float(x)), max(0.0, float(y))
                out.append((x / W, y / H, min(float(w), W - x) / W, min(float(h), H - y) / H, None))
        out.sort(key=lambda r: r[2] * r[3], reverse=True)
        return out


def _rgb(path):
    import numpy as np
    from PIL import Image
    return np.asarray(Image.open(path).convert("RGB"))


def facetrack(in_dir, out_path):
    ff = FaceFinder()
    if not ff.used: sys.exit("❌ راصد الوجه يحتاج mediapipe أو opencv: " + PIP_HINT)
    rows = []
    for f in _jpgs(in_dir):
        try: faces = ff.find(_rgb(os.path.join(in_dir, f)))
        except Exception: continue
        row = {"f": f}
        if faces:
            x, y, w, h, m = faces[0]
            row["face"] = {"x": x, "y": y, "w": w, "h": h}
            if m is not None: row["mouth"] = m
            row["n"] = len(faces)
        rows.append(row)
    ff.close()
    json.dump(rows, open(out_path, "w"))
    print(f"faces: {len(rows)}  ({ff.used})")


# ───────────── قصّ الشخص ─────────────
class Segmenter:
    def __init__(self, quality="accurate"):
        self.ref = {"fast": 384, "balanced": 512}.get(quality, 640)
        self.kind = backend("personmask")
        if self.kind == "modnet":
            import onnxruntime as ort
            so = ort.SessionOptions(); so.log_severity_level = 3
            self.sess = ort.InferenceSession(model("modnet"), so, providers=["CPUExecutionProvider"])
            self.inp = self.sess.get_inputs()[0].name
        elif self.kind == "mediapipe":
            import mediapipe as mp
            from mediapipe.tasks.python import vision, BaseOptions
            o = vision.ImageSegmenterOptions(base_options=BaseOptions(model_asset_path=model("selfie")), output_confidence_masks=True)
            self.seg, self._mp = vision.ImageSegmenter.create_from_options(o), mp
        else:
            sys.exit("❌ قصّ الشخص يحتاج onnxruntime (MODNet) أو mediapipe: " + PIP_HINT)

    def close(self):
        if self.kind == "mediapipe": self.seg.close()

    def mask(self, im):
        """im: PIL RGB → قناع float32 HxW بين 0 و1 بنفس مقاس الصورة."""
        import numpy as np
        from PIL import Image
        W, H = im.size
        if self.kind == "modnet":
            s = self.ref / min(W, H)                       # الضلع القصير = المرجع، والمقاسات مضاعفات 32
            w, h = max(32, int(round(W * s / 32)) * 32), max(32, int(round(H * s / 32)) * 32)
            x = np.asarray(im.resize((w, h), Image.BILINEAR), dtype=np.float32) / 255.0
            x = ((x - 0.5) / 0.5).transpose(2, 0, 1)[None]
            m = self.sess.run(None, {self.inp: x})[0][0, 0]
        else:
            img = self._mp.Image(image_format=self._mp.ImageFormat.SRGB, data=np.ascontiguousarray(np.asarray(im)))
            r = self.seg.segment(img); cm = r.confidence_masks
            m = cm[-1].numpy_view() if cm else np.zeros((H, W), np.float32)
            m = np.squeeze(np.asarray(m, dtype=np.float32))
        m = np.clip(m, 0, 1)
        return np.asarray(Image.fromarray((m * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), dtype=np.float32) / 255.0


def personmask(in_dir, out_dir, quality="accurate", feather=2.5):
    import numpy as np
    from PIL import Image, ImageFilter
    os.makedirs(out_dir, exist_ok=True)
    seg = Segmenter(quality); ff = FaceFinder()
    meta = []
    for f in _jpgs(in_dir):
        try: im = Image.open(os.path.join(in_dir, f)).convert("RGB")
        except Exception: continue
        W, H = im.size
        m = Image.fromarray((seg.mask(im) * 255).astype(np.uint8), "L")
        if feather > 0: m = m.filter(ImageFilter.GaussianBlur(feather))   # حواف ناعمة مثل CIGaussianBlur
        m.save(os.path.join(out_dir, f[:-4] + ".png"))
        row = {"f": f}
        if ff.used:
            faces = ff.find(np.asarray(im))
            if faces:
                x, y, w, h, _ = max(faces, key=lambda r: r[2])   # نفس السويفت: الأعرض
                row["face"] = {"x": x * W, "y": y * H, "w": w * W, "h": h * H}
        meta.append(row)
    ff.close(); seg.close()
    json.dump(meta, open(os.path.join(out_dir, "meta.json"), "w"))
    print(f"masks: {len(meta)}  ({seg.kind}{' + ' + ff.used if ff.used else ''})")


# ───────────── الكف ─────────────
def handpose(d, f0, f1, out_path):
    if not _has("mediapipe"): sys.exit("❌ تتبّع الكف يحتاج mediapipe: " + PIP_HINT)
    import numpy as np
    import mediapipe as mp
    from mediapipe.tasks.python import vision, BaseOptions
    o = vision.HandLandmarkerOptions(base_options=BaseOptions(model_asset_path=model("hand")), num_hands=2,
                                     min_hand_detection_confidence=0.3, min_hand_presence_confidence=0.3)
    det = vision.HandLandmarker.create_from_options(o)
    out = []
    for i in range(int(f0), int(f1) + 1):
        p = os.path.join(d, f"{i:05d}.jpg")
        if not os.path.exists(p): continue
        rgb = _rgb(p); H, W = rgb.shape[:2]
        r = det.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(rgb)))
        hands = []
        for k, lm in enumerate(r.hand_landmarks or []):
            c = r.handedness[k][0].score if r.handedness and r.handedness[k] else 0.5
            if c <= 0.3: continue
            hands.append({"x": float(np.mean([lm[j].x for j in PALM]) * W), "y": float(np.mean([lm[j].y for j in PALM]) * H), "c": float(c)})
        out.append({"f": i, "hands": hands})
    det.close()
    json.dump(out, open(out_path, "w"))
    print("ok", len(out))


# ───────────── HDR ← SDR ─────────────
def hdr2sdr_filter(trc):
    tin = trc if trc in ("arib-std-b67", "smpte2084") else "arib-std-b67"
    return (f"zscale=tin={tin}:pin=bt2020:min=bt2020nc:t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,"
            "tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p")


def hdr2sdr(src, dst):
    if not _ffmpeg_has("zscale"): sys.exit("❌ ffmpeg هذا ما فيه zscale — " + missing_hint("hdr2sdr"))
    trc = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=color_transfer",
                          "-of", "csv=p=0", src], capture_output=True, text=True).stdout.strip().strip(",")
    r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-map", "0:v:0", "-map", "0:a:0?", "-vf", hdr2sdr_filter(trc),
                        "-c:v", "libx264", "-preset", "medium", "-crf", "14", "-color_primaries", "bt709", "-color_trc", "bt709",
                        "-colorspace", "bt709", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", dst])
    if r.returncode or not os.path.exists(dst): print("❌ فشل التحويل"); sys.exit(1)
    print("✅ SDR:", dst)


def check(names):
    ok = True
    for n in names or TOOLS:
        b = backend(n); ok &= bool(b)
        print(f"{'✅' if b else '❌'} {n}: {b or 'ناقص — ' + missing_hint(n)}")
    return ok


if __name__ == "__main__":
    os.environ.setdefault("GLOG_minloglevel", "2"); os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
    a = sys.argv[1:]
    if not a or a[0] not in TOOLS + ("check",): print(__doc__); sys.exit(2)
    cmd, a = a[0], a[1:]
    if cmd == "check": sys.exit(0 if check(a) else 1)
    if cmd == "personmask" and len(a) >= 2:
        personmask(a[0], a[1], a[2] if len(a) > 2 else "accurate", float(a[3]) if len(a) > 3 else 2.5)
    elif cmd == "facetrack" and len(a) >= 2: facetrack(a[0], a[1])
    elif cmd == "handpose" and len(a) >= 4: handpose(a[0], a[1], a[2], a[3])
    elif cmd == "hdr2sdr" and len(a) >= 2: hdr2sdr(a[0], a[1])
    else: print(__doc__); sys.exit(2)
