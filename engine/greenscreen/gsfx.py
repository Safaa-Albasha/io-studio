# -*- coding: utf-8 -*-
"""الشاشة الخضرا (I/O Studio) — الخلفيات المولّدة والويدجتات الزجاجية. كل شي من t (حتمي)، والألوان من الثيم.
النص العربي: Pillow بمحرّك raqm (نفس تشكيل HarfBuzz اللي بالمتصفح) — الحروف متصلة واتجاه RTL صح، والخط من خطوط الإضافة."""
import math, os
import numpy as np
from gscore import W, H, FPS

HERE = os.path.dirname(os.path.abspath(__file__))
FONT_DIRS = [os.path.join(HERE, "..", "..", "skills", "io-video-editor", "motion", "fonts")]


def ease(x):
    x = max(0.0, min(1.0, x))
    return 1 - (1 - x) ** 3


def hashf(i, s):
    h = (i * 374761393) ^ (s * 668265263)
    h = (h ^ (h >> 13)) * 1274126177 & 0xFFFFFFFF
    return ((h ^ (h >> 16)) & 0xFFFFFFFF) / 4294967296.0


# ───────── الخط والنص ─────────
_FONTS = {}


def font(name="Cairo", size=40, weight=700):
    from PIL import ImageFont
    key = (name, size, weight)
    if key in _FONTS:
        return _FONTS[key]
    path = None
    for d in FONT_DIRS:
        if os.path.isdir(d):
            for f in sorted(os.listdir(d)):
                if f.lower().startswith(str(name).lower().replace(" ", "")) and f.lower().endswith((".ttf", ".otf")):
                    path = os.path.join(d, f)
                    break
            if not path:
                c = os.path.join(d, "Cairo-VF.ttf")
                path = c if os.path.exists(c) else None
    try:
        ft = ImageFont.truetype(path, size, layout_engine=ImageFont.Layout.RAQM) if path else ImageFont.load_default()
    except Exception:
        ft = ImageFont.truetype(path, size) if path else ImageFont.load_default()
    try:
        ft.set_variation_by_axes([weight])
    except Exception:
        pass
    _FONTS[key] = ft
    return ft


def has_raqm():
    try:
        from PIL import features
        return bool(features.check("raqm"))
    except Exception:
        return False


def text(draw, xy, s, ft, fill, anchor="rm"):
    """نص بمرساة (rm = يمين-وسط للعربي). العربي بالاتجاه RTL عن طريق raqm."""
    ar = any("؀" <= ch <= "ۿ" for ch in s)
    kw = {"direction": "rtl", "language": "ar"} if ar and has_raqm() else {}
    try:
        draw.text(xy, s, font=ft, fill=fill, anchor=anchor, **kw)
    except Exception:
        draw.text(xy, s, font=ft, fill=fill, anchor=anchor)


# ───────── خلفيات مولّدة ─────────
class GlowBg:
    """بلا غرفة: تدرّج ليلي من الثيم + توهج يتنفس ورا الراس + بوكيه يطفو + حبيبات."""
    def __init__(self, th, head=(0.5, 0.44)):
        self.th, self.head = th, head
        self.sw, self.sh = 270, 480
        yy, xx = np.mgrid[0:self.sh, 0:self.sw].astype(np.float32)
        self.yy, self.xx = yy, xx
        d = np.array(th["dark"], np.float32)
        top, bot = d * 0.85, np.minimum(255, d * 1.25 + 6)
        self.base = top + (bot - top) * (yy / self.sh)[..., None]
        self.orbs = [(hashf(i, 1) * self.sw, hashf(i, 2) * self.sh * 0.75, 6 + hashf(i, 3) * 16, 0.15 + hashf(i, 4) * 0.3, hashf(i, 5) * 6.28) for i in range(14)]

    def frame(self, t):
        import cv2
        im = self.base.copy()
        acc = np.array(self.th["accent"], np.float32)
        br = 0.8 + 0.2 * math.sin(t * 0.9)
        d = ((self.xx - self.sw * self.head[0]) ** 2 / (self.sw * 0.55) ** 2 + (self.yy - self.sh * self.head[1]) ** 2 / (self.sh * 0.3) ** 2)
        im += acc * (np.exp(-d * 2.2) * 0.55 * br)[..., None]
        for (ox, oy, r, a, ph) in self.orbs:
            cx = ox + 12 * math.sin(t * 0.25 + ph)
            cy = (oy - 2.4 * t + 8 * math.cos(t * 0.2 + ph)) % (self.sh * 0.8)
            g = np.exp(-((self.xx - cx) ** 2 + (self.yy - cy) ** 2) / (2 * r * r)) * a * (0.7 + 0.3 * math.sin(t * 0.7 + ph))
            im += acc * g[..., None] * 0.5
        big = cv2.resize(im, (W, H), interpolation=cv2.INTER_CUBIC)
        rng = np.random.default_rng(int(t * FPS) + 7)
        return np.clip(big + rng.normal(0, 2.2, (H, W, 1)).astype(np.float32), 0, 255)


class LedBg:
    """جدار غامق مولّد وخط LED عمودي باللون المميز (يتنفس) — أو مقطعك (--bg-video) لوب رايح جاي."""
    def __init__(self, th, x=0.78):
        self.th, self.x = th, x
        yy, xx = np.mgrid[0:H // 4, 0:W // 4].astype(np.float32)
        d = np.array(th["dark"], np.float32)
        wall = d * (0.8 + 0.35 * (1 - np.abs(xx / (W // 4) - 0.45) * 1.4)[..., None])
        floor = (yy > (H // 4) * 0.78)[..., None]
        self.wall = np.where(floor, d * 0.6, wall)
        self.xx = xx

    def frame(self, t):
        import cv2
        acc = np.array(self.th["accent"], np.float32)
        lx = self.x * (W // 4)
        p = 0.85 + 0.15 * math.sin(t * 1.4)
        glow = np.exp(-((self.xx - lx) ** 2) / (2 * 14 ** 2)) * 0.9 * p + np.exp(-((self.xx - lx) ** 2) / (2 * 2.2 ** 2)) * 1.4
        im = self.wall + acc * glow[..., None] * 0.6
        im[..., :] += (np.exp(-((self.xx - lx) ** 2) / (2 * 0.9 ** 2)) * 255 * 0.5)[..., None]
        return np.clip(cv2.resize(im, (W, H), interpolation=cv2.INTER_LINEAR), 0, 255)


class TerminalBg:
    """طرفية حيّة تكتب أوامرك + رقائق كلمات تطفو + شبكة تنزلق، كلها بألوان الثيم."""
    def __init__(self, th, lines=None, chips=None):
        self.th = th
        self.lines = lines or ["$ ai-agent", "> organize ./reels by date", "  reading 214 files...", "  ✓ created 2026-11/", "  ✓ moved 37 videos", "> write captions for each reel", "  ✓ caption.md ×12", "> done in 41s"]
        self.chips = chips or ["Prompt", "Skill", "Agent", "MCP"]

    def frame(self, t):
        from PIL import Image, ImageDraw, ImageFilter
        th = self.th
        dk, lt, ac = th["dark"], th["light"], th["accent"]
        mixc = lambda a, b, k: tuple(int(a[i] + (b[i] - a[i]) * k) for i in range(3))
        im = Image.new("RGB", (W, H), dk)
        d = ImageDraw.Draw(im)
        off = int(t * 40) % 90
        for x in range(-90, W + 300, 90):
            d.line([(x + off, 0), (x + off - 300, H)], fill=mixc(dk, lt, 0.06), width=2)
        px, py, pw, ph = 70, 250, 940, 640
        d.rounded_rectangle((px, py, px + pw, py + ph), radius=28, fill=mixc(dk, lt, 0.05), outline=mixc(dk, lt, 0.16), width=3)
        for k in range(3):
            d.ellipse((px + 30 + k * 34, py + 26, px + 50 + k * 34, py + 46), fill=mixc(dk, lt, 0.25))
        mono = font("Inter", 32, 500)
        chars, shown, yy = int(t * 38), 0, py + 80
        for L in self.lines:
            if shown >= chars:
                break
            s = L[:max(0, chars - shown)]
            shown += len(L)
            col = ac if L.startswith((">", "$")) else (mixc(lt, ac, 0.35) if "✓" in L else mixc(dk, lt, 0.75))
            d.text((px + 40, yy), s, font=mono, fill=col)
            yy += 58
        if int(t * 2) % 2 == 0:
            d.rectangle((px + 40, yy + 6, px + 60, yy + 42), fill=ac)
        cf = font("Inter", 38, 700)
        spots = [(40, 1000), (780, 1060), (30, 1320), (820, 1380), (330, 1560)]
        for k, txt in enumerate(self.chips):
            cx, cy = spots[k % len(spots)]
            a = max(0.0, min(1.0, (t - 0.3 * k) / 0.6))
            if a <= 0:
                continue
            dy = math.sin(t * 1.3 + k) * 18
            w = d.textlength(txt, font=cf)
            d.rounded_rectangle((cx, cy + dy, cx + w + 44, cy + dy + 66), radius=33, fill=mixc(dk, mixc(dk, lt, 0.1), a), outline=mixc(dk, ac, a), width=3)
            d.text((cx + 22, cy + dy + 12), txt, font=cf, fill=mixc(dk, ac, a))
        im = im.filter(ImageFilter.GaussianBlur(1.2))
        g = Image.new("L", (W, H), 0)
        ImageDraw.Draw(g).ellipse((240, 660, 840, 1260), fill=70)
        g = g.filter(ImageFilter.GaussianBlur(140))
        return np.asarray(Image.composite(Image.new("RGB", (W, H), ac), im, g)).astype(np.float32)


class PageBg:
    """صفحة ويب حقيقية (لقطة طويلة PNG) تنسحب ورا الشخص، مضبّبة ومغمّقة بلون الثيم، وتوهج خفيف ورا الراس."""
    def __init__(self, th, page, dur):
        from PIL import Image
        self.th, self.dur = th, max(1.0, dur)
        im = Image.open(page).convert("RGB")
        s = W / im.width
        self.page = im.resize((W, max(int(H * 0.8) + 1, round(im.height * s))))

    def frame(self, t):
        from PIL import Image, ImageDraw, ImageFilter
        k = min(1.0, t / self.dur)
        span = max(0, self.page.height - int(H * 0.8))
        y = int(k * span)
        z = 1.12 - 0.06 * k
        crop = self.page.crop((0, y, W, y + int(H * 0.8)))
        cw, ch = int(W * z), int(H * z)
        im = crop.resize((cw, ch)).crop(((cw - W) // 2, (ch - H) // 2, (cw - W) // 2 + W, (ch - H) // 2 + H))
        im = Image.blend(im.filter(ImageFilter.GaussianBlur(2.5)), Image.new("RGB", (W, H), self.th["dark"]), 0.72)
        g = Image.new("L", (W, H), 0)
        ImageDraw.Draw(g).ellipse((190, 520, 890, 1220), fill=110)
        g = g.filter(ImageFilter.GaussianBlur(150))
        return np.asarray(Image.composite(Image.new("RGB", (W, H), self.th["accent"]), im, g)).astype(np.float32)


# ───────── ويدجتات زجاجية فوق التركيب ─────────
def default_widgets():
    return [
        {"type": "pill", "from": 1.0, "to": 5.8, "title": "خلّص الشغل", "app": "AI", "sub": "الريلز جاهزة للنشر"},
        {"type": "stat", "from": 7.0, "to": 16.0, "value": "36", "label": "Skills", "app": "AI", "side": "left"},
        {"type": "bar", "from": 7.5, "to": 16.0, "label": "Rendering", "sub": "4K", "side": "right", "fill": [7.6, 13.6]},
    ]


def _env(t, a, z, d_in=0.45, d_out=0.5):
    if t < a or t > z:
        return 0.0
    return ease((t - a) / d_in) if t < z - d_out else 1 - ease((t - (z - d_out)) / d_out)


def glass_widgets(comp, t, widgets, th):
    """زجاج مثلّج: يضبّب اللي وراه ويفتّحه، حد أبيض رفيع، والكلام بلون الثيم الغامق."""
    import cv2
    from PIL import Image, ImageDraw
    dk, ac = th["dark"], th["accent"]
    boxes = []
    for w in widgets:
        a = _env(t, w.get("from", 0), w.get("to", 1e9))
        if a <= 0:
            continue
        fl = math.sin(t * 1.6) * 10
        if w["type"] == "pill":
            y = int(-160 + 380 * a)
            boxes.append((w, (110, y, 970, y + 130), a))
        elif w["type"] == "stat":
            x0 = 60 if w.get("side", "left") == "left" else 680
            boxes.append((w, (x0, 480 + fl + (1 - a) * 60, x0 + 340, 740 + fl + (1 - a) * 60), a))
        else:
            x0 = 640 if w.get("side", "right") == "right" else 60
            boxes.append((w, (x0, 540 - fl + (1 - a) * 60, x0 + 380, 700 - fl + (1 - a) * 60), a))
    for w, box, a in boxes:
        x0, y0, x1, y1 = [int(v) for v in box]
        x0, y0, x1, y1 = max(0, x0), max(0, y0), min(W, x1), min(H, y1)
        if x1 - x0 < 8 or y1 - y0 < 8:
            continue
        reg = cv2.GaussianBlur(comp[y0:y1, x0:x1], (0, 0), 22) * 0.78 + 255 * 0.14
        m = Image.new("L", (x1 - x0, y1 - y0), 0)
        ImageDraw.Draw(m).rounded_rectangle((0, 0, x1 - x0 - 1, y1 - y0 - 1), radius=34, fill=255)
        m = np.asarray(m, np.float32)[..., None] / 255 * a
        comp[y0:y1, x0:x1] = comp[y0:y1, x0:x1] * (1 - m) + reg * m
        im = Image.fromarray(comp.clip(0, 255).astype(np.uint8))
        d = ImageDraw.Draw(im)
        ink = tuple(int(v) for v in dk)
        d.rounded_rectangle((x0, y0, x1 - 1, y1 - 1), radius=34, outline=(255, 255, 255), width=2)
        if w["type"] == "pill":
            d.rounded_rectangle((x1 - 110, y0 + 25, x1 - 30, y0 + 105), radius=20, fill=ac)
            d.line([(x1 - 92, y0 + 66), (x1 - 76, y0 + 82), (x1 - 48, y0 + 50)], fill=ink, width=8)
            text(d, (x1 - 135, y0 + 46), (w.get("app", "") + " · " if w.get("app") else "") + w.get("title", ""), font(th["font"], 44, 800), ink)
            text(d, (x1 - 135, y0 + 98), w.get("sub", ""), font(th["bodyFont"], 30, 600), ink)
        elif w["type"] == "stat":
            text(d, (x1 - 30, y0 + 42), w.get("app", ""), font("Inter", 30, 700), ink)
            text(d, (x0 + 30, y0 + 150), str(w.get("value", "")), font("Inter", 120, 800), ink, anchor="lm")
            text(d, (x0 + 34, y0 + 222), w.get("label", ""), font(th["bodyFont"], 32, 600), ink, anchor="lm")
        else:
            f0, f1 = w.get("fill", [w.get("from", 0) + 0.1, w.get("to", 1) - 2])
            prog = max(0.0, min(1.0, (t - f0) / max(0.1, f1 - f0)))
            text(d, (x1 - 30, y0 + 42), w.get("label", ""), font(th["bodyFont"], 30, 700), ink)
            d.rounded_rectangle((x0 + 30, y0 + 80, x1 - 30, y0 + 96), radius=8, fill=(220, 224, 230))
            d.rounded_rectangle((x0 + 30, y0 + 80, x0 + 30 + max(16, int((x1 - x0 - 60) * prog)), y0 + 96), radius=8, fill=ac)
            text(d, (x0 + 30, y0 + 125), f"{w.get('sub', '')} · {int(prog * 100)}%".strip(" ·"), font("Inter", 30, 600), ink, anchor="lm")
        comp = np.asarray(im).astype(np.float32)
    return comp
