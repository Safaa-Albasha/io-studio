# -*- coding: utf-8 -*-
"""الشاشة الخضرا (I/O Studio) — الأساس: الثيم، قراءة/كتابة الفيديو بـffmpeg، القصّ بالمفتاح اللوني، إزالة الانسكاب، ولفّ الضوء.
كل الدوال نقية على مصفوفات numpy (float32، RGB، 0..255) — تنفحص بـ greenscreen.py selftest."""
import json, os, subprocess, shutil
import numpy as np

W, H, FPS = 1080, 1920, 30

# ───────── الثيم: الألوان من .io/theme.json (بلا ألوان ثابتة لأحد) ─────────
DEFAULT_THEME = {"bg": "#101216", "ink": "#F5F6F8", "accent": "#4FB3FF"}


def hex_rgb(h):
    h = str(h or "#000").lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    try:
        return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
    except ValueError:
        return (0, 0, 0)


def lum(c):
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def load_theme(path=None):
    """يرجع {dark, light, accent, font} — dark = الأغمق من bg/ink (أرضية الخلفيات الليلية)، light = الأفتح (النص)."""
    cands = [path] if path else []
    cands += [os.path.join(os.getcwd(), n, "theme.json") for n in (".io", ".sky")]  # .sky = the folder name before the rename
    data = {}
    for p in cands:
        if p and os.path.exists(p):
            try:
                data = json.load(open(p, encoding="utf-8"))
                break
            except Exception:
                pass
    col = dict(DEFAULT_THEME)
    col.update({k: v for k, v in (data.get("colors") or {}).items() if isinstance(v, str)})
    bg, ink, acc = hex_rgb(col.get("bg")), hex_rgb(col.get("ink")), hex_rgb(col.get("accent"))
    dark, light = (bg, ink) if lum(bg) <= lum(ink) else (ink, bg)
    if lum(dark) > 90:            # ثيم فاتح كلّه: الأرضية الليلية = الحبر مغمّق
        dark = tuple(int(v * 0.25) for v in dark)
    fonts = data.get("fonts") or {}
    return {"dark": dark, "light": light, "accent": acc, "font": fonts.get("heading") or "Cairo", "bodyFont": fonts.get("body") or fonts.get("heading") or "Cairo"}


# ───────── فيديو ─────────
def need(tool):
    if not shutil.which(tool):
        raise SystemExit(f"❌ {tool} ناقص — شغّل: node engine/doctor.js")


def probe_dur(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], capture_output=True, text=True).stdout
    try:
        return float(out.strip())
    except ValueError:
        return 0.0


def reader(path, loop=False, pingpong=False):
    """يولّد فريمات RGB (H,W,3) uint8 بمقاس 1080×1920 (يملأ ويقص). pingpong: يقرا الكل مرة ويعيده رايح جاي (لوب ناعم لمقطع قصير)."""
    need("ffmpeg")
    vf = f"fps={FPS},scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}"
    def once():
        p = subprocess.Popen(["ffmpeg", "-nostdin", "-v", "error", "-i", path, "-vf", vf, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
        try:
            while True:
                b = p.stdout.read(W * H * 3)
                if len(b) < W * H * 3:
                    break
                yield np.frombuffer(b, np.uint8).reshape(H, W, 3)
        finally:
            if p.poll() is None:
                p.kill()          # وقفنا بدري (--frames): بلا رسائل «broken pipe»
            p.wait()
    if pingpong:
        frames = list(once())
        if not frames:
            return
        seq = frames + frames[-2:0:-1]
        i = 0
        while True:
            yield seq[i % len(seq)]
            i += 1
    elif loop:
        while True:
            got = False
            for f in once():
                got = True
                yield f
            if not got:
                return
    else:
        yield from once()


def writer(out, audio_from=None, crf=18):
    need("ffmpeg")
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    cmd = ["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-"]
    if audio_from:
        cmd += ["-i", audio_from, "-map", "0:v", "-map", "1:a?", "-c:a", "aac", "-b:a", "192k", "-shortest"]
    cmd += ["-c:v", "libx264", "-crf", str(crf), "-preset", "fast", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]
    return subprocess.Popen(cmd, stdin=subprocess.PIPE)


def still(path):
    """صورة ثابتة كخلفية، تملأ 1080×1920."""
    from PIL import Image
    im = Image.open(path).convert("RGB")
    s = max(W / im.width, H / im.height)
    im = im.resize((max(W, round(im.width * s)), max(H, round(im.height * s))))
    x, y = (im.width - W) // 2, (im.height - H) // 2
    return np.asarray(im.crop((x, y, x + W, y + H))).astype(np.float32)


# ───────── القصّ ─────────
def key_alpha(f, color="green", t1=22.0, t2=62.0):
    """alpha (H,W) 1 = الشخص. اللون المسيطر ناقص أكبر الباقيين: أخضر = g − max(r,b)، أزرق = b − max(r,g)."""
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    s = (g - np.maximum(r, b)) if color == "green" else (b - np.maximum(r, g))
    return 1.0 - np.clip((s - t1) / max(1e-3, (t2 - t1)), 0.0, 1.0)


def despill(f, color="green", margin=8.0):
    """يقص اللون المسيطر لحد أكبر الباقيين + هامش (يشيل الحافة الخضرا/الزرقا عن الشعر والكتوف)."""
    f = f.copy()
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    if color == "green":
        f[..., 1] = np.minimum(g, np.maximum(r, b) + margin)
    else:
        f[..., 2] = np.minimum(b, np.maximum(r, g) + margin)
    return f


def soften(a, sigma=0.8):
    try:
        import cv2
        return cv2.GaussianBlur(a, (0, 0), sigma)
    except ImportError:
        return a


def light_wrap(fg, a, bg, amount=0.35):
    """لفّ الضوء: حافة الشخص تاخذ شوي من لون الخلفية — يركّبه بالمكان بدل ما يطلع ملزوق."""
    try:
        import cv2
        wrap = cv2.GaussianBlur(bg, (0, 0), 6)
    except ImportError:
        wrap = bg
    edge = (1 - a) * a * 4
    return fg * (1 - amount * edge[..., None]) + wrap * amount * edge[..., None]


def composite(frame_u8, bg, color="green", t1=22.0, t2=62.0, wrap=0.35, grade=None):
    f = frame_u8.astype(np.float32)
    a = soften(key_alpha(f, color, t1, t2))
    f = despill(f, color)
    if grade is not None:
        f = f * np.asarray(grade, np.float32)
    fg = light_wrap(f, a, bg, wrap) if wrap else f
    return fg * a[..., None] + bg * (1 - a[..., None]), a


def body_only(a):
    """يخلي أكبر جسم يلمس الحافة التحتية ويعبّي الفراغات (يشيل نباتات/بقع بالحايط) — يحتاج opencv."""
    import cv2
    b = (a > 0.5).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(b, 8)
    if n <= 1:
        return a
    bottom = set(np.unique(lab[-4:, :])) - {0}
    keep = max(bottom or range(1, n), key=lambda i: st[i, cv2.CC_STAT_AREA])
    body = (lab == keep).astype(np.uint8)
    inv = 1 - body
    m2 = np.zeros((a.shape[0] + 2, a.shape[1] + 2), np.uint8)
    fl = inv.copy()
    cv2.floodFill(fl, m2, (0, 0), 2)
    body = np.where(fl == 1, 1, body).astype(np.float32)
    body = cv2.dilate(body, np.ones((5, 5), np.uint8))
    return np.clip(cv2.GaussianBlur(a * body, (0, 0), 1.2), 0, 1)
