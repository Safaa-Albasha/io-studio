#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
الشاشة الخضرا — I/O Studio
====================
مدخل واحد لكل مؤثرات الشاشة الخضرا (أو الحايط الأزرق): فيديو عمودي → 1080×1920، 30 فريم، H.264، والصوت الأصلي ينسخ.
الألوان والخط من .io/theme.json (أو --theme)، بلا ألوان ثابتة.

  python3 greenscreen.py key      in.mp4 out.mp4 --bg صورة|فيديو|#لون   قصّ بسيط + خلفية من عندك
  python3 greenscreen.py glass    in.mp4 out.mp4 [--bg غرفة.mp4|صورة] [--widgets w.json]   زجاج مثلّج: إشعار ينزل + كرت رقم + كرت تقدّم
  python3 greenscreen.py glow     in.mp4 out.mp4 [--scale 0.9]          بلا غرفة: تدرّج ليلي وتوهج يتنفس ورا الراس وبوكيه
  python3 greenscreen.py led      in.mp4 out.mp4 [--bg-video مقطع.mp4]  جدار غامق وخط LED (أو مقطعك لوب رايح جاي)
  python3 greenscreen.py terminal in.mp4 out.mp4 [--lines أوامر.txt] [--chips "Prompt,Skill"]   طرفية تكتب ورا الشخص
  python3 greenscreen.py page     in.mp4 out.mp4 --page صفحة.png        صفحة ويب تنسحب ورا الشخص (مضبّبة ومغمّقة)
  python3 greenscreen.py matte    in.mp4 <work> [--color blue]           قصّ الشخص لحركات البنك: <work>/vfr/NNNNN.jpg + <work>/bt/person/NNNNN.png
  python3 greenscreen.py voice    in.mp4 out.wav                          صوت خام نظيف: highpass 70 + loudnorm −14 LUFS (عزل اختياري بمفتاحك)
  python3 greenscreen.py check                                             شنو ناقص (numpy · opencv · Pillow/raqm · ffmpeg)
  python3 greenscreen.py selftest                                          فحص الدوال على فريمات مصنوعة

خيارات عامة: --color green|blue (لون الحايط) · --t1 22 --t2 62 (عتبة القصّ) · --frames N (أول N فريم بس، للتجربة) · --theme path/theme.json
العزل الصوتي (اختياري): يشتغل بس لو حطيت مفتاحك بمتغير البيئة ELEVENLABS_API_KEY — ولا مفتاح ينحفظ بالملفات.
"""
import json, math, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def arg(args, name, default=None):
    if name in args:
        i = args.index(name)
        if i + 1 < len(args):
            return args[i + 1]
    return default


def deps():
    out = {}
    for m in ("numpy", "cv2", "PIL"):
        try:
            __import__(m)
            out[m] = True
        except ImportError:
            out[m] = False
    try:
        from PIL import features
        out["raqm"] = bool(features.check("raqm"))
    except Exception:
        out["raqm"] = False
    import shutil
    out["ffmpeg"] = bool(shutil.which("ffmpeg"))
    return out


def cmd_check(_):
    d = deps()
    names = {"numpy": "numpy", "cv2": "opencv (opencv-python-headless)", "PIL": "Pillow", "raqm": "Pillow + raqm (النص العربي بالويدجتات)", "ffmpeg": "ffmpeg"}
    for k, v in d.items():
        print(("✅ " if v else "❌ ") + names[k])
    if not all(d[k] for k in ("numpy", "cv2", "PIL", "ffmpeg")):
        print("\nالتنصيب: python3 -m pip install --user numpy opencv-python-headless pillow   (أو node engine/doctor.js --fix)")
        return 1
    if not d["raqm"]:
        print("\n⚠️ بلا raqm النص العربي بالويدجتات ممكن يطلع مفكّك — Pillow الرسمي من pip فيه raqm؛ وإلا خلّ الويدجتات بنص لاتيني.")
    return 0


def run(args, mode):
    import numpy as np
    import gscore as C
    import gsfx as FXm
    if len(args) < 2:
        raise SystemExit(__doc__)
    src, out = args[0], args[1]
    if not os.path.exists(src):
        raise SystemExit(f"❌ ما لقيت {src}")
    th = C.load_theme(arg(args, "--theme"))
    color = arg(args, "--color", "green")
    t1, t2 = float(arg(args, "--t1", 22)), float(arg(args, "--t2", 62))
    limit = int(arg(args, "--frames", 0)) or None
    dur = C.probe_dur(src)
    bgsrc, bgimg, bgcol = None, None, None
    b = arg(args, "--bg") or arg(args, "--bg-video")
    if b:
        if b.startswith("#"):
            bgcol = np.zeros((C.H, C.W, 3), np.float32) + np.array(C.hex_rgb(b), np.float32)
        elif b.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
            bgimg = C.still(b)
        else:
            bgsrc = C.reader(b, pingpong=(mode == "led"), loop=(mode != "led"))
    gen = None
    if mode == "glow":
        gen = FXm.GlowBg(th)
    elif mode == "led" and bgsrc is None:
        gen = FXm.LedBg(th)
    elif mode == "terminal":
        lines = open(arg(args, "--lines"), encoding="utf-8").read().splitlines() if arg(args, "--lines") else None
        chips = [c.strip() for c in arg(args, "--chips").split(",")] if arg(args, "--chips") else None
        gen = FXm.TerminalBg(th, lines, chips)
    elif mode == "page":
        if not arg(args, "--page"):
            raise SystemExit("❌ page يحتاج --page لقطة.png (لقطة صفحة طويلة)")
        gen = FXm.PageBg(th, arg(args, "--page"), dur or 7)
    elif mode in ("glass", "key") and bgsrc is None and bgimg is None and bgcol is None:
        gen = FXm.GlowBg(th) if mode == "glass" else None
        if mode == "key":
            raise SystemExit("❌ key يحتاج --bg (صورة أو فيديو أو #لون)")
    widgets = None
    if mode == "glass":
        wf = arg(args, "--widgets")
        widgets = json.load(open(wf, encoding="utf-8")) if wf else FXm.default_widgets()
    scale = float(arg(args, "--scale", 1.0))
    wr = C.writer(out, audio_from=src)
    n = 0
    for f in C.reader(src):
        t = n / C.FPS
        if gen is not None:
            bg = gen.frame(t)
        elif bgsrc is not None:
            bg = next(bgsrc, None)
            bg = bg.astype(np.float32) if bg is not None else np.zeros((C.H, C.W, 3), np.float32)
        else:
            bg = bgimg if bgimg is not None else bgcol
        if scale != 1.0:                      # الشخص أصغر ونازل لتحت (الخلفية تبين أكثر)
            import cv2
            sw, sh = int(C.W * scale), int(C.H * scale)
            small = cv2.resize(f, (sw, sh), interpolation=cv2.INTER_AREA)
            ff = np.zeros_like(f)
            ff[..., 1 if color == "green" else 2] = 255
            x0 = (C.W - sw) // 2
            ff[C.H - sh:C.H, x0:x0 + sw] = small
            f = ff
        grade = (1.02, 0.97, 0.94) if mode in ("glow", "led") else None
        comp, _ = C.composite(f, bg, color, t1, t2, wrap=0.35 if mode != "key" else 0.2, grade=grade)
        if widgets:
            comp = FXm.glass_widgets(comp, t, widgets, th)
        wr.stdin.write(comp.clip(0, 255).astype(np.uint8).tobytes())
        n += 1
        if limit and n >= limit:
            break
    wr.stdin.close()
    wr.wait()
    print(f"✅ {out} · {n} فريم")


def cmd_matte(args):
    """قصّ الشخص على حايط ملوّن (أخضر/أزرق) لحركات البنك اللي تحتاج قصّ (مدار، ستيكر، جدار العناوين…) — بديل سريع لـMODNet لما الخلفية حايط."""
    import numpy as np, cv2
    import gscore as C
    if len(args) < 2:
        raise SystemExit(__doc__)
    src, work = args[0], args[1]
    color = arg(args, "--color", "green")
    t1, t2 = float(arg(args, "--t1", 22)), float(arg(args, "--t2", 62))
    limit = int(arg(args, "--frames", 0)) or None
    os.makedirs(os.path.join(work, "vfr"), exist_ok=True)
    os.makedirs(os.path.join(work, "bt", "person"), exist_ok=True)
    n = 0
    for f in C.reader(src):
        n += 1
        fl = f.astype(np.float32)
        a = C.body_only(C.key_alpha(fl, color, t1, t2))
        rgb = C.despill(fl, color).clip(0, 255).astype(np.uint8)
        cv2.imwrite(os.path.join(work, "vfr", f"{n:05d}.jpg"), cv2.cvtColor(f, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 94])
        rgba = np.dstack([cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR), (a * 255).astype(np.uint8)])
        cv2.imwrite(os.path.join(work, "bt", "person", f"{n:05d}.png"), rgba, [cv2.IMWRITE_PNG_COMPRESSION, 1])
        if limit and n >= limit:
            break
    print(f"✅ {n} فريم → {work}/vfr + {work}/bt/person")


def cmd_voice(args):
    """الصوت الخام: highpass 70 + loudnorm −14 LUFS / −1 dBTP بس (بلا تعلية حدّة ولا كومبرسر قوي). العزل اختياري بمفتاح المستخدم."""
    if len(args) < 2:
        raise SystemExit(__doc__)
    src, out = args[0], args[1]
    tmp = out + ".raw.wav"
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", src, "-vn", "-ac", "1", "-ar", "48000", tmp], check=True)
    key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if key and "--no-isolate" not in args:
        try:
            import urllib.request, uuid
            bnd = uuid.uuid4().hex
            body = (f"--{bnd}\r\nContent-Disposition: form-data; name=\"audio\"; filename=\"a.wav\"\r\nContent-Type: audio/wav\r\n\r\n").encode() + open(tmp, "rb").read() + f"\r\n--{bnd}--\r\n".encode()
            req = urllib.request.Request("https://api.elevenlabs.io/v1/audio-isolation", data=body, headers={"xi-api-key": key, "Content-Type": f"multipart/form-data; boundary={bnd}"})
            data = urllib.request.urlopen(req, timeout=300).read()
            iso = out + ".iso.bin"
            open(iso, "wb").write(data)
            subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", iso, "-ac", "1", "-ar", "48000", tmp], check=True)
            os.remove(iso)
            print("🎧 العزل: تم")
        except Exception as e:
            print(f"⚠️ العزل ما زبط ({e.__class__.__name__}) — أكمل بالخام")
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", tmp, "-af", "highpass=f=70,loudnorm=I=-14:TP=-1:LRA=9", "-ar", "48000", out], check=True)
    os.remove(tmp)
    print(f"✅ {out}")


def cmd_selftest(_):
    import numpy as np
    import gscore as C
    import gsfx as FXm
    ok = True
    def chk(c, m):
        nonlocal ok
        print(("✅ " if c else "❌ ") + m)
        ok = ok and c
    f = np.zeros((40, 40, 3), np.float32)
    f[...] = (40, 200, 50)                 # حايط أخضر
    f[10:30, 10:30] = (180, 140, 120)      # «بشرة»
    a = C.key_alpha(f)
    chk(a[0, 0] < 0.01 and a[20, 20] > 0.99, "key_alpha: الحايط 0 والشخص 1")
    fb = f.copy(); fb[...] = (30, 60, 220); fb[10:30, 10:30] = (180, 140, 120)
    ab = C.key_alpha(fb, "blue")
    chk(ab[0, 0] < 0.01 and ab[20, 20] > 0.99, "key_alpha: الحايط الأزرق")
    sp = np.array([[[100, 180, 90]]], np.float32)
    chk(C.despill(sp)[0, 0, 1] <= 108.01, "despill: الأخضر ما يزيد على أكبر الباقيين + 8")
    th = C.load_theme(os.path.join(HERE, "no-such-theme.json"))
    chk(C.lum(th["dark"]) <= C.lum(th["light"]), "الثيم: dark أغمق من light")
    chk(C.hex_rgb("#0af") == (0, 170, 255), "hex_rgb قصير")
    try:
        import cv2  # noqa
        bg = np.zeros((C.H, C.W, 3), np.float32) + 50
        g = FXm.GlowBg(th).frame(1.0)
        chk(g.shape == (C.H, C.W, 3) and 0 <= g.min() and g.max() <= 255, "glow: فريم 1080×1920 بالمدى")
        l = FXm.LedBg(th).frame(0.5)
        chk(l.shape == (C.H, C.W, 3), "led: فريم 1080×1920")
        tb = FXm.TerminalBg(th).frame(1.5)
        chk(tb.shape == (C.H, C.W, 3), "terminal: فريم 1080×1920")
        comp = FXm.glass_widgets(bg.copy(), 8.0, FXm.default_widgets(), th)
        chk(comp.shape == bg.shape and not np.allclose(comp, bg), "glass: الويدجتات انرسمت")
        full = np.zeros((C.H, C.W, 3), np.uint8); full[...] = (40, 200, 50); full[800:1600, 300:780] = (180, 140, 120)
        c2, a2 = C.composite(full, bg)
        chk(abs(c2[100, 100, 0] - 50) < 1 and a2[1200, 540] > 0.99, "composite: الخلفية مكان الحايط والشخص باقي")
        chk(C.body_only(a2)[1200, 540] > 0.9, "body_only: الجسم باقي")
    except ImportError:
        print("➖ opencv ناقص — تخطّيت فحص الخلفيات")
    return 0 if ok else 1


def main():
    a = sys.argv[1:]
    if not a or a[0] in ("-h", "--help", "help"):
        print(__doc__)
        return 0
    cmd, rest = a[0], a[1:]
    if cmd == "check":
        return cmd_check(rest)
    if cmd == "selftest":
        return cmd_selftest(rest)
    if cmd == "matte":
        return cmd_matte(rest)
    if cmd == "voice":
        return cmd_voice(rest)
    if cmd in ("key", "glass", "glow", "led", "terminal", "page"):
        return run(rest, cmd)
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main() or 0)
