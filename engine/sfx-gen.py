#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
مولّد مكتبة المؤثرات الصوتية — I/O Studio
=============================================
كل صوت هنا كود (توليف رقمي بـnumpy) — ولا ملف مأخوذ من أحد، فالمكتبة حرّة بالكامل
(نفس رخصة البلگن). التوليد ثابت: نفس الكود = نفس الصوت بالضبط (بذرة عشوائية لكل صوت من اسمه).

الاستعمال:
  python3 engine/sfx-gen.py                 # يولّد الكل → library/sfx/wav/*.wav + catalog.json
  python3 engine/sfx-gen.py --only pop_soft,whoosh_long
  python3 engine/sfx-gen.py --list          # يطبع الأسماء بس
  python3 engine/sfx-gen.py --previews      # + نسخ ogg صغيرة للتصفح (library/sfx/ogg) — يحتاج ffmpeg

الصيغة: WAV · 48000 Hz · مونو · 16-bit.
العلو (موحّد لكل الأصوات):
  - القمة ≤ −1 dBFS
  - أعلى علو لحظي (نافذة 400 ms، K-weighted حسب EBU R128) ≤ −16 LUFS
  الربح = الأقل بين الاثنين — فالضربات القصيرة توصل للقمة، والأصوات الطويلة المليانة تنضبط بالعلو.
"""
import sys, os, json, wave, zlib, argparse, subprocess
import numpy as np

SR = 48000
PEAK_DB = -1.0
MOMENTARY_LUFS = -16.0
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
OUT = os.path.join(ROOT, "library", "sfx")

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

# ───────────────────────── أدوات التوليف ─────────────────────────

def T(d):
    return np.arange(int(round(d * SR))) / SR

def n_(d):
    return int(round(d * SR))

def osc(freq, d, kind="sine", phase=0.0):
    """مذبذب بتردد ثابت أو متغيّر (مصفوفة)."""
    L = n_(d)
    f = np.broadcast_to(np.asarray(freq, dtype=float), (L,)) if np.ndim(freq) == 0 else np.asarray(freq, dtype=float)[:L]
    ph = 2 * np.pi * np.cumsum(f) / SR + phase
    if kind == "sine":
        return np.sin(ph)
    if kind == "tri":
        return 2 / np.pi * np.arcsin(np.sin(ph))
    # موجات غنية محدودة النطاق (جمع توافقيات تحت نايكوست) — بلا تشويه تعرّج
    out = np.zeros(L)
    fmax = float(np.max(f)) + 1e-9
    nh = max(1, min(40, int((SR / 2 - 500) / fmax)))
    for k in range(1, nh + 1):
        if kind == "square" and k % 2 == 0:
            continue
        a = 1.0 / k
        out += a * np.sin(k * ph)
    return out * (0.6 if kind == "saw" else 0.8)

def expdec(d, tau, attack=0.001):
    t = T(d)
    a = np.minimum(1.0, t / max(attack, 1e-5))
    return a * np.exp(-t / tau)

def adsr(d, a=0.01, dc=0.1, s=0.7, r=0.1):
    t = T(d)
    e = np.ones_like(t) * s
    e[t < a] = t[t < a] / max(a, 1e-5)
    m = (t >= a) & (t < a + dc)
    e[m] = 1 - (1 - s) * (t[m] - a) / max(dc, 1e-5)
    rm = t > d - r
    e[rm] *= np.clip((d - t[rm]) / max(r, 1e-5), 0, 1)
    return e

def sweep(f0, f1, d, curve="exp"):
    t = T(d) / max(d, 1e-9)
    if curve == "exp":
        return f0 * (f1 / f0) ** t
    return f0 + (f1 - f0) * t

def noise(r, d):
    return r.standard_normal(n_(d))

def fftf(x, lo=None, hi=None, order=2):
    """فلتر ثابت بالمجال الترددي (بترورث بالمقدار)."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR) + 1e-9
    g = np.ones_like(f)
    if hi:
        g *= 1 / np.sqrt(1 + (f / hi) ** (2 * order))
    if lo:
        g *= 1 / np.sqrt(1 + (lo / f) ** (2 * order))
    return np.fft.irfft(X * g, len(x))

def svf(x, fc, q=0.707, mode="bp"):
    """فلتر متغيّر الحالة (TPT) بتردد قطع يتحرك مع الزمن."""
    L = len(x)
    fc = np.clip(np.broadcast_to(np.asarray(fc, dtype=float), (L,)) if np.ndim(fc) == 0 else np.asarray(fc, dtype=float)[:L], 20, SR * 0.45)
    g = np.tan(np.pi * fc / SR)
    k = 1.0 / q
    a1 = 1 / (1 + g * (g + k)); a2 = g * a1; a3 = g * a2
    xs = x.tolist(); A1 = a1.tolist(); A2 = a2.tolist(); A3 = a3.tolist()
    lp = [0.0] * L; bp = [0.0] * L
    ic1 = ic2 = 0.0
    for i in range(L):
        v3 = xs[i] - ic2
        v1 = A1[i] * ic1 + A2[i] * v3
        v2 = ic2 + A2[i] * ic1 + A3[i] * v3
        ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2
        lp[i] = v2; bp[i] = v1
    lp = np.array(lp); bp = np.array(bp)
    if mode == "lp":
        return lp
    if mode == "hp":
        return x - k * bp - lp
    return bp

def reverb(x, r, t60=1.2, mix=0.25, tone=6000, pre=0.012):
    """صدى بالالتفاف مع استجابة ضوضاء متلاشية (غرفة اصطناعية)."""
    L = n_(t60 * 1.1)
    t = np.arange(L) / SR
    ir = r.standard_normal(L) * np.exp(-6.9 * t / t60)
    ir = fftf(ir, lo=120, hi=tone, order=1)
    ir[: n_(pre)] = 0
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    N = len(x) + L
    nfft = 1 << (N - 1).bit_length()
    wet = np.fft.irfft(np.fft.rfft(x, nfft) * np.fft.rfft(ir, nfft), nfft)[:N]
    dry = np.concatenate([x, np.zeros(L)])
    wet *= (np.max(np.abs(dry)) + 1e-9) / (np.max(np.abs(wet)) + 1e-9)
    return dry * (1 - mix * 0.5) + wet * mix

def place(dst, sig, t0, g=1.0):
    i = max(0, n_(t0)); j = min(len(dst), i + len(sig))
    if j > i:
        dst[i:j] += sig[: j - i] * g
    return dst

def mix(d, *items):
    """items = (sig, t0, gain)."""
    out = np.zeros(n_(d))
    for s, t0, g in items:
        place(out, s, t0, g)
    return out

def norm(x):
    return x / (np.max(np.abs(x)) + 1e-9)

def bell(f, d, partials=((1, 1), (2.76, 0.5), (5.4, 0.25), (8.93, 0.12)), tau=0.6):
    t = T(d)
    s = np.zeros_like(t)
    for ratio, amp in partials:
        s += amp * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t / (tau / (1 + 0.6 * (ratio - 1))))
    return s * np.minimum(1, t / 0.002)

def pluck(r, f, d, damp=0.996):
    """كارپلس-سترونگ: وتر منقور."""
    N = max(2, int(SR / f)); L = n_(d)
    buf = (r.random(N) * 2 - 1).tolist()
    out = [0.0] * L
    for i in range(L):
        a = buf[i % N]; b = buf[(i + 1) % N]
        v = damp * 0.5 * (a + b)
        out[i] = a; buf[i % N] = v
    return np.array(out)

def click_(r, d=0.004, hi=7000, lo=1500):
    return fftf(noise(r, d), lo=lo, hi=hi) * expdec(d, d / 4)

def P(*xs):
    """جمع إشارات بأطوال مختلفة (تتعبّى بأصفار)."""
    L = max(len(x) for x in xs); o = np.zeros(L)
    for x in xs: o[: len(x)] += x
    return o

def tanh_sat(x, drive=2.0):
    return np.tanh(x * drive) / np.tanh(drive)

def crush(x, bits=6, hold=4):
    y = np.repeat(x[::hold], hold)[: len(x)]
    q = 2 ** (bits - 1)
    return np.round(y * q) / q

def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)

# ───────────────────────── السجل ─────────────────────────

SOUNDS = []

def snd(id, ar, en, cat, tags, use):
    def deco(fn):
        SOUNDS.append(dict(id=id, ar=ar, en=en, category=cat, tags=tags, use=use, fn=fn))
        return fn
    return deco

def rng_for(id):
    return np.random.RandomState(zlib.crc32(id.encode("utf-8")) & 0x7FFFFFFF)

# ─────────────── انتقالات (whoosh / swish / swoosh) ───────────────

def _whoosh(r, d, f0, f1, fpk=None, q=1.4, shape=1.6, peak=0.5):
    L = n_(d); t = T(d); u = t / d
    # منحنى السرعة: يعلى لحد القمة ثم ينزل
    env = np.where(u < peak, (u / peak), (1 - u) / (1 - peak)).clip(0, 1) ** shape
    fpk = fpk or np.sqrt(f0 * f1)
    fc = np.where(u < peak, f0 * (fpk / f0) ** (u / peak), fpk * (f1 / fpk) ** ((u - peak) / (1 - peak)))
    x = noise(r, d)
    y = svf(x, fc, q, "bp") * 0.8 + svf(x, fc * 0.5, 0.6, "lp") * 0.35
    return y * env

@snd("whoosh_short", "ووش قصير", "Short whoosh", "transition", ["ووش", "انتقال", "سريع"], "قطع سريع بين لقطتين أو دخول نص")
def _(r): return _whoosh(r, 0.38, 400, 900, 2600, peak=0.55)

@snd("whoosh_long", "ووش طويل", "Long whoosh", "transition", ["ووش", "انتقال", "بطيء"], "انتقال مشهد كامل أو حركة كاميرا بطيئة")
def _(r): return _whoosh(r, 1.25, 250, 500, 2200, peak=0.5, shape=1.3)

@snd("whoosh_up", "ووش صاعد", "Whoosh up", "transition", ["ووش", "صعود", "دخول"], "عنصر يطلع من تحت أو تكبير (زوم إن)")
def _(r): return _whoosh(r, 0.5, 300, 4200, 3000, peak=0.8, shape=1.4)

@snd("whoosh_down", "ووش نازل", "Whoosh down", "transition", ["ووش", "نزول", "خروج"], "عنصر يطلع برّه الشاشة أو زوم آوت")
def _(r): return _whoosh(r, 0.5, 3600, 250, 3200, peak=0.2, shape=1.4)

@snd("whoosh_soft", "ووش ناعم", "Soft whoosh", "transition", ["ووش", "هادي", "ناعم"], "فيديوهات هادئة (طبخ، سفر، تأمل) — انتقال بلا إزعاج")
def _(r): return fftf(_whoosh(r, 0.7, 200, 300, 1100, q=0.9, shape=2.0), hi=2500)

@snd("whoosh_heavy", "ووش ثقيل", "Heavy whoosh", "transition", ["ووش", "ثقيل", "سينمائي"], "انتقال قوي قبل لقطة مهمة")
def _(r):
    w = _whoosh(r, 0.9, 150, 300, 1500, q=1.0, shape=1.3, peak=0.6)
    sub = osc(sweep(70, 40, 0.9), 0.9) * np.sin(np.pi * np.clip(T(0.9) / 0.9, 0, 1)) ** 2
    return norm(w) + 0.6 * sub

@snd("swish_fast", "سويش سريع", "Fast swish", "transition", ["سويش", "سريع", "سحب"], "سحب سريع لكرت أو صورة")
def _(r): return _whoosh(r, 0.2, 1500, 3000, 6500, q=1.8, peak=0.45, shape=1.2)

@snd("swish_double", "سويش مزدوج", "Double swish", "transition", ["سويش", "مزدوج"], "حركة ذهاب وإياب، أو عنصرين يدخلون ورا بعض")
def _(r):
    a = _whoosh(r, 0.2, 1500, 3000, 6000, q=1.8, peak=0.45)
    b = _whoosh(r, 0.22, 1200, 2500, 5200, q=1.8, peak=0.45)
    return mix(0.5, (a, 0, 1), (b, 0.2, 0.85))

@snd("swoosh_transition", "سووش انتقال", "Swoosh transition", "transition", ["سووش", "انتقال", "مشهد"], "انتقال بين فقرتين — فيه نفَس هوائي ونغمة خفيفة")
def _(r):
    d = 0.85; w = _whoosh(r, d, 300, 600, 3000, q=1.2, peak=0.5)
    tone = osc(sweep(300, 900, d), d) * np.sin(np.pi * T(d) / d) ** 3 * 0.25
    return norm(w) + tone

@snd("whoosh_reverse", "سحبة معكوسة", "Reverse swell", "transition", ["معكوس", "سحبة", "تمهيد"], "تمهيد قبل الكشف — ينتهي بالضبط على لحظة القطع")
def _(r):
    hit = fftf(noise(r, 0.15), lo=200, hi=5000) * expdec(0.15, 0.03)
    y = reverb(hit, r, t60=1.6, mix=1.0)
    y = y[::-1][-n_(1.3):]
    return y * np.minimum(1, (n_(1.3) - np.arange(len(y))) / 200.0)

@snd("air_pass", "شي يمر سريع", "Air pass-by", "transition", ["مرور", "دوبلر", "طيران"], "شي يعبر الشاشة (سيارة، طيارة ورق، عنصر طاير)")
def _(r):
    d = 1.1; t = T(d); u = t / d
    env = np.exp(-((u - 0.5) / 0.17) ** 2)
    f = 700 * 2 ** (-1.2 * (1 / (1 + np.exp(-(u - 0.5) * 12)) - 0.5))
    tone = osc(f, d, "saw"); tone = svf(tone, 1800, 0.7, "lp")
    nz = svf(noise(r, d), f * 3, 1.0, "bp")
    return (norm(tone) * 0.45 + norm(nz)) * env

@snd("swipe_ui", "سحبة إصبع", "UI swipe", "transition", ["سحب", "واجهة", "تطبيق"], "سحب شاشة تطبيق أو تقليب ستوري")
def _(r): return _whoosh(r, 0.14, 2500, 7000, 7500, q=2.0, peak=0.6, shape=1.0)

# ───────────────────────── واجهة (UI) ─────────────────────────

def _pop(r, f0, f1, d=0.11, tau=0.03):
    s = osc(sweep(f0, f1, d), d) * expdec(d, tau, 0.0008)
    return P(s, click_(r, 0.003) * 0.15)

@snd("pop_soft", "بوب ناعم", "Soft pop", "ui", ["بوب", "فقاعة", "ظهور"], "كرت أو إيموجي يطلع — الأكثر استعمالاً")
def _(r): return _pop(r, 620, 260)

@snd("pop_bright", "بوب حاد", "Bright pop", "ui", ["بوب", "حاد", "ظهور"], "نقطة مهمة تطلع، رقم، أيقونة")
def _(r): return _pop(r, 1300, 520, 0.09, 0.022)

@snd("pop_bubble_up", "بلوب صاعد", "Bubble bloop", "ui", ["بلوب", "صعود", "لطيف"], "عنصر يكبر ويطلع — محتوى أطفال ولطيف")
def _(r): return _pop(r, 280, 1250, 0.13, 0.05)

@snd("click_ui", "كليك واجهة", "UI click", "ui", ["كليك", "زر", "اختيار"], "ضغطة زر أو اختيار بشرح تطبيق")
def _(r):
    d = 0.03; t = T(d)
    return P(np.sin(2 * np.pi * 3400 * t) * np.exp(-t / 0.004), click_(r, 0.006) * 0.5)

@snd("click_soft", "كليك ناعم", "Soft click", "ui", ["كليك", "هادي"], "تحديد عنصر بهدوء، قائمة، تبويب")
def _(r):
    d = 0.04; t = T(d)
    return fftf(P(np.sin(2 * np.pi * 1600 * t) * np.exp(-t / 0.006), click_(r, 0.006, hi=4000) * 0.4), hi=4500)

@snd("tap_wood", "نقرة خشب", "Wood tap", "ui", ["نقرة", "خشب", "طبيعي"], "ظهور كلمة بإيقاع دافئ — بديل طبيعي للبوب")
def _(r):
    d = 0.12; t = T(d)
    s = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / tau) for f, a, tau in [(820, 1, 0.025), (2150, 0.5, 0.012), (3900, 0.25, 0.006)])
    return P(s, click_(r, 0.004, hi=6000) * 0.3)

@snd("tap_glass", "نقرة زجاج", "Glass tap", "ui", ["زجاج", "رنين", "أنيق"], "منتج فاخر، عطر، مجوهرات — لمسة أنيقة")
def _(r):
    d = 0.6; t = T(d)
    return P(sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / tau) for f, a, tau in [(2093, 1, 0.22), (5310, 0.5, 0.12), (8720, 0.25, 0.06), (11800, 0.1, 0.03)]), click_(r, 0.002, hi=12000) * 0.2)

def _blip(fs, step=0.07, kind="square", tone=4500):
    d = step * len(fs) + 0.05
    out = np.zeros(n_(d))
    for i, f in enumerate(fs):
        s = osc(f, step, kind) * adsr(step, 0.002, 0.02, 0.6, 0.02)
        place(out, s, i * step)
    return fftf(out, hi=tone)

@snd("blip_up", "بليب صاعد", "Blip up", "ui", ["بليب", "صعود", "إيجابي"], "إشعار إيجابي صغير، تفعيل ميزة")
def _(r): return _blip([midi(84), midi(91)])

@snd("blip_down", "بليب نازل", "Blip down", "ui", ["بليب", "نزول"], "إغلاق، رجوع، إلغاء خفيف")
def _(r): return _blip([midi(91), midi(84)])

@snd("blip_select", "بليب اختيار", "Select blip", "ui", ["بليب", "اختيار", "قائمة"], "التنقل بين خيارات قائمة")
def _(r): return _blip([midi(88)], 0.06, "tri")

@snd("toggle_on", "تشغيل مفتاح", "Toggle on", "ui", ["مفتاح", "تشغيل"], "تفعيل خيار بشرح تطبيق")
def _(r): return mix(0.12, (_pop(r, 900, 1400, 0.04, 0.01), 0, 1), (_pop(r, 1500, 2000, 0.04, 0.01), 0.05, 0.8))

@snd("toggle_off", "إطفاء مفتاح", "Toggle off", "ui", ["مفتاح", "إطفاء"], "إلغاء تفعيل خيار")
def _(r): return mix(0.12, (_pop(r, 1500, 1100, 0.04, 0.01), 0, 1), (_pop(r, 900, 650, 0.04, 0.01), 0.05, 0.8))

@snd("notify_ding", "دنگ إشعار", "Notification ding", "ui", ["إشعار", "دنگ", "رسالة"], "وصول رسالة، تنبيه، معلومة جديدة")
def _(r): return bell(midi(88), 1.2, tau=0.5)

@snd("notify_double", "إشعار نغمتين", "Two-note notification", "ui", ["إشعار", "نغمتين"], "تنبيه لطيف، فكرة جديدة")
def _(r): return mix(1.3, (bell(midi(88), 1.0, tau=0.35), 0, 1), (bell(midi(95), 1.1, tau=0.4), 0.13, 0.8))

@snd("notify_message", "رسالة واردة", "Message pluck", "ui", ["رسالة", "دردشة", "واتساب"], "محادثة على الشاشة، تعليق متابع يطلع")
def _(r):
    def m(f, d=0.35):
        t = T(d); return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t / 0.01)) * np.exp(-t / 0.08)
    return mix(0.5, (m(midi(81)), 0, 1), (m(midi(86)), 0.09, 0.9))

@snd("success_chime", "رنّة نجاح", "Success chime", "ui", ["نجاح", "صح", "إنجاز"], "النتيجة النهائية، قبل/بعد ناجح، إجابة صحيحة")
def _(r):
    out = np.zeros(n_(1.6))
    for i, m in enumerate([72, 76, 79, 84]):
        place(out, bell(midi(m), 1.2, tau=0.45), i * 0.075, 0.9 if i < 3 else 1)
    return reverb(out, r, t60=1.0, mix=0.2)[: n_(1.8)]

@snd("error_buzz", "خطأ (بز)", "Error buzz", "ui", ["خطأ", "غلط", "رفض"], "إجابة غلط، «لا تسوي هيچ»، خرافة شائعة")
def _(r):
    d = 0.18
    s = (osc(110, d, "square") + osc(116.5, d, "square")) * adsr(d, 0.004, 0.02, 0.85, 0.03)
    s = fftf(s, hi=2500)
    return mix(0.42, (s, 0, 1), (s, 0.22, 1))

@snd("error_soft", "خطأ ناعم", "Soft error", "ui", ["خطأ", "تنبيه", "هادي"], "تنبيه غلطة بلطف (محتوى تعليمي)")
def _(r): return _blip([midi(79), midi(75)], 0.12, "tri", 3000)

@snd("like_heart", "لايك قلب", "Like heart", "ui", ["لايك", "قلب", "تفاعل"], "طلب لايك/متابعة، قلب يطلع على الشاشة")
def _(r):
    p = _pop(r, 400, 1600, 0.12, 0.05)
    sp = sum(np.sin(2 * np.pi * f * T(0.5)) * np.exp(-T(0.5) / 0.12) for f in [2637, 3136, 3951]) * 0.15
    return mix(0.6, (p, 0, 1), (sp, 0.06, 1))

def _mouse(r):
    body = lambda: (P(np.sin(2 * np.pi * 1700 * T(0.015)) * np.exp(-T(0.015) / 0.002), click_(r, 0.006, 9000, 2000) * 0.8))
    return mix(0.11, (body(), 0, 1), (body(), 0.075, 0.55))

@snd("mouse_click", "كليك ماوس", "Mouse click", "ui", ["ماوس", "كمبيوتر", "شرح"], "شرح شاشة كمبيوتر، ضغطة على رابط")
def _(r): return _mouse(r)

@snd("mouse_double", "دبل كليك", "Mouse double click", "ui", ["ماوس", "دبل"], "فتح ملف بشرح برنامج")
def _(r): return mix(0.3, (_mouse(r), 0, 1), (_mouse(r), 0.13, 1))

def _key(r, f=1900, thock=420):
    d = 0.06; t = T(d)
    s = click_(r, 0.008, 8000, 1500) * 0.9
    s = np.concatenate([s, np.zeros(n_(d) - len(s))])
    s += np.sin(2 * np.pi * thock * t) * np.exp(-t / 0.01) * 0.5 + np.sin(2 * np.pi * f * t) * np.exp(-t / 0.004) * 0.3
    return s

@snd("typing_keys", "كتابة كيبورد", "Keyboard typing", "ui", ["كتابة", "كيبورد", "نص"], "نص ينكتب حرف حرف على الشاشة")
def _(r):
    d = 2.0; out = np.zeros(n_(d)); t = 0.05
    while t < d - 0.1:
        place(out, _key(r, r.uniform(1500, 2500), r.uniform(350, 500)), t, r.uniform(0.55, 1))
        t += r.uniform(0.07, 0.16) + (0.2 if r.random_sample() < 0.08 else 0)
    return out

@snd("key_single", "زر كيبورد", "Single key", "ui", ["كيبورد", "زر"], "حرف واحد، رقم يتغيّر")
def _(r): return _key(r)

@snd("key_enter", "زر إنتر", "Enter key", "ui", ["إنتر", "كيبورد", "إرسال"], "إرسال، تأكيد، بحث بگوگل")
def _(r):
    d = 0.18; t = T(d)
    s = np.sin(2 * np.pi * sweep(260, 180, d) * t) * np.exp(-t / 0.025) + fftf(noise(r, d), 1500, 6000) * np.exp(-t / 0.006) * 0.8
    return mix(0.25, (s, 0, 1), (_key(r, 1700, 300), 0.09, 0.4))

@snd("camera_shutter", "غالق كاميرا", "Camera shutter", "ui", ["كاميرا", "صورة", "لقطة"], "لقطة شاشة، صورة تثبت، فلاش")
def _(r):
    def clk(f): return fftf(noise(r, 0.02), lo=f, hi=9000) * expdec(0.02, 0.003) + np.sin(2 * np.pi * f * T(0.02)) * expdec(0.02, 0.004) * 0.4
    mech = fftf(noise(r, 0.07), 800, 5000) * expdec(0.07, 0.02) * 0.4
    return mix(0.25, (clk(1800), 0, 1), (mech, 0.01, 1), (clk(1300), 0.11, 0.8))

@snd("scroll_tick", "تمرير", "Scroll ticks", "ui", ["تمرير", "سكرول", "عجلة"], "تمرير قائمة أو عجلة اختيار تدور")
def _(r):
    d = 0.7; out = np.zeros(n_(d)); t = 0.0; gap = 0.025
    while t < d - 0.03:
        place(out, click_(r, 0.004, 9000, 2500), t, 1 - t / d * 0.6); gap *= 1.09; t += gap
    return out

# ───────────────────────── ضربات (impact) ─────────────────────────

@snd("thud_soft", "دگة ناعمة", "Soft thud", "impact", ["دگة", "هبوط", "ثقيل"], "عنصر ينزل ويثبت، عنوان يستقر")
def _(r):
    d = 0.35; t = T(d)
    s = osc(sweep(130, 55, d), d) * np.exp(-t / 0.08)
    return s + fftf(noise(r, d), hi=1200) * np.exp(-t / 0.006) * 0.4

@snd("impact_punch", "ضربة بوكس", "Punch impact", "impact", ["ضربة", "قوة", "پنچ"], "معلومة صادمة، كلمة قوية، قطع حاد")
def _(r):
    d = 0.45; t = T(d)
    body = osc(sweep(150, 45, d), d) * np.exp(-t / 0.09)
    sn = fftf(noise(r, d), 200, 3000) * np.exp(-t / 0.03) * 0.7
    return P(tanh_sat(body + sn, 2.2), click_(r, 0.004) * 0.25)

@snd("boom_deep", "بووم عميق", "Deep boom", "impact", ["بووم", "عميق", "سينمائي"], "كشف كبير، عنوان الفيديو، لحظة الذروة")
def _(r):
    d = 2.2; t = T(d)
    s = osc(sweep(62, 27, d), d) * np.exp(-t / 0.5)
    rum = fftf(noise(r, d), hi=180, order=3) * np.exp(-t / 0.6) * 1.5
    return tanh_sat(s + rum, 1.6)

@snd("cinematic_hit", "ضربة سينمائية", "Cinematic hit", "impact", ["سينمائي", "ترايلر", "ضربة"], "افتتاحية قوية، ظهور الشعار، تريلر")
def _(r):
    d = 2.5; t = T(d)
    sub = osc(sweep(80, 32, d), d) * np.exp(-t / 0.45)
    crash = fftf(noise(r, d), 250, 4000) * np.exp(-t / 0.18) * 0.6
    metal = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / tau) for f, a, tau in [(187, .5, .8), (313, .35, .6), (522, .25, .45), (871, .15, .3)])
    return reverb(tanh_sat(sub + crash + metal * 0.5, 1.5), r, t60=2.2, mix=0.35)[: n_(3.2)]

@snd("braam", "برااام", "Braam", "impact", ["برااام", "توتر", "سينمائي", "نحاس"], "لحظة درامية ضخمة، مقدمة وثائقي")
def _(r):
    d = 3.0; t = T(d)
    s = np.zeros_like(t)
    for f, det in [(55, 0), (55, 0.4), (110, -0.3), (82.4, 0.2), (164.8, -0.2)]:
        s += osc(f * 2 ** (det / 12 / 4), d, "saw")
    fc = 200 + 1600 * np.exp(-t / 0.6) * np.minimum(1, t / 0.12)
    s = svf(s, fc, 1.2, "lp")
    s = tanh_sat(s * 0.6, 2.5) * adsr(d, 0.06, 0.4, 0.75, 1.4)
    return reverb(s, r, t60=2.5, mix=0.3)[: n_(3.6)]

@snd("sub_drop", "سب دروب", "Sub drop", "impact", ["سب", "نزول", "بيس"], "بعد الرايزر مباشرة، لحظة الكشف")
def _(r):
    d = 1.6; t = T(d)
    return osc(sweep(90, 24, d), d) * np.exp(-t / 0.55) * np.minimum(1, t / 0.005)

@snd("bass_hit", "ضربة بيس", "Bass hit", "impact", ["بيس", "808", "ضربة"], "إيقاع، ضربة على الكلمة المهمة")
def _(r):
    d = 1.1; t = T(d)
    s = osc(sweep(110, 52, 0.08).tolist() + [52] * (n_(d) - n_(0.08)), d) * np.exp(-t / 0.4)
    return P(tanh_sat(s, 2.0), click_(r, 0.003, 6000) * 0.3)

@snd("slam_metal", "خبطة حديد", "Metal slam", "impact", ["حديد", "باب", "قفل"], "قفل، باب يتسكّر، «خلص!»")
def _(r):
    d = 1.4; t = T(d)
    parts = [(237, 1, .5), (391, .8, .45), (618, .6, .35), (1043, .45, .25), (1517, .3, .18), (2389, .2, .1)]
    m = sum(a * np.sin(2 * np.pi * f * t + r.uniform(0, 6)) * np.exp(-t / tau) for f, a, tau in parts)
    hit = fftf(noise(r, d), 400, 6000) * np.exp(-t / 0.02)
    return reverb(m * 0.6 + hit + osc(sweep(120, 60, d), d) * np.exp(-t / 0.08) * 0.8, r, 0.9, 0.2)[: n_(1.8)]

@snd("hit_trailer_tail", "ضربة بذيل طويل", "Trailer hit with tail", "impact", ["ترايلر", "صدى", "نهاية"], "آخر لقطة قبل الشعار، نهاية درامية")
def _(r):
    d = 0.6; t = T(d)
    h = osc(sweep(70, 35, d), d) * np.exp(-t / 0.25) + fftf(noise(r, d), 150, 5000) * np.exp(-t / 0.08) * 0.7
    return reverb(tanh_sat(h, 1.8), r, t60=3.5, mix=0.6, tone=4000)[: n_(4.0)]

# ───────────────────────── صعود ونزول (riser/downer) ─────────────────────────

@snd("riser_noise", "رايزر هوائي", "Noise riser", "riser", ["رايزر", "صعود", "تشويق"], "قبل الكشف بثانيتين — ينتهي على لحظة الكشف")
def _(r):
    d = 2.5; t = T(d); u = t / d
    s = svf(noise(r, d), 200 * (30 ** (u ** 1.5)), 2.0, "bp")
    return s * u ** 2.2 * np.minimum(1, (d - t) / 0.02)

@snd("riser_tone", "رايزر نغمي", "Tonal riser", "riser", ["رايزر", "نغمة", "تشويق"], "تصاعد تشويق (سؤال قبل الجواب)")
def _(r):
    d = 2.5; t = T(d); u = t / d
    f = 110 * 8 ** (u ** 1.4)
    s = osc(f, d, "saw") + osc(f * 1.01, d, "saw") + 0.5 * osc(f * 1.5, d, "saw")
    s = svf(s, 400 + 5000 * u ** 2, 1.5, "lp")
    nz = svf(noise(r, d), 500 * 12 ** u, 1.5, "bp") * 0.5
    return (norm(s) + nz) * u ** 1.8 * np.minimum(1, (d - t) / 0.02)

@snd("riser_short", "رايزر قصير", "Short riser", "riser", ["رايزر", "قصير"], "تمهيد سريع قبل رقم أو نتيجة")
def _(r):
    d = 1.0; t = T(d); u = t / d
    s = svf(noise(r, d), 400 * 18 ** (u ** 1.2), 2.2, "bp") + 0.3 * osc(300 * 4 ** u, d, "tri")
    return s * u ** 2 * np.minimum(1, (d - t) / 0.015)

@snd("downer_drop", "نزول ودروب", "Downer drop", "riser", ["نزول", "دروب", "هبوط"], "بعد الذروة، انتقال للهدوء، «بس انتبه…»")
def _(r):
    d = 2.0; t = T(d); u = t / d
    f = 600 * (1 / 12) ** (u ** 0.7)
    s = svf(osc(f, d, "saw") + osc(f * 0.995, d, "saw"), 3000 * (1 - u) + 150, 1.0, "lp")
    nz = svf(noise(r, d), 5000 * (1 / 25) ** u, 1.5, "bp") * 0.6
    return (norm(s) + nz) * (1 - u) ** 1.3 * np.minimum(1, t / 0.01)

@snd("downer_tone", "نغمة نازلة", "Pitch dive", "riser", ["نزول", "غوص"], "شي يطيح، رقم ينزل، خسارة")
def _(r):
    d = 1.2; t = T(d)
    return osc(sweep(1100, 55, d), d, "tri") * adsr(d, 0.01, 0.2, 0.8, 0.4)

@snd("tension_swell", "توتر يتصاعد", "Tension swell", "riser", ["توتر", "غموض", "درون"], "غموض، قصة جريمة، «اللي صار بعدين…»")
def _(r):
    d = 3.2; t = T(d); u = t / d
    s = sum(osc(f * (1 + 0.003 * np.sin(2 * np.pi * 0.3 * k * t)), d, "saw") for k, f in enumerate([65.4, 69.3, 98, 103.8]))
    s = svf(s, 150 + 2200 * u ** 2, 1.0, "lp")
    return reverb(norm(s) * u ** 1.6 * np.minimum(1, (d - t) / 0.05), r, 1.5, 0.3)[: n_(3.6)]

# ───────────────────────── تقنية (tech) ─────────────────────────

def _glitch(r, d, n):
    out = np.zeros(n_(d))
    for _ in range(n):
        a = r.randint(0, n_(d) - 900); L = r.randint(400, 2400)
        kind = r.randint(3)
        if kind == 0:
            seg = crush(noise(r, L / SR), 4, r.randint(4, 20))
        elif kind == 1:
            seg = osc(r.uniform(200, 3000), L / SR, "square")
        else:
            seg = crush(osc(r.uniform(80, 800), L / SR, "saw"), 3, 8)
        place(out, seg * r.uniform(0.4, 1), a / SR)
    return out

@snd("glitch_short", "گلتش قصير", "Short glitch", "tech", ["گلتش", "خلل", "ديجيتال"], "قطع تقني، تحويل لنص ثاني، خطأ نظام")
def _(r): return _glitch(r, 0.3, 7)

@snd("glitch_long", "گلتش طويل", "Long glitch", "tech", ["گلتش", "تشويش", "هاكر"], "انتقال تقني، «النظام انهار»، محتوى سايبر")
def _(r): return _glitch(r, 1.0, 22)

@snd("digital_beep", "بيب رقمي", "Digital beep", "tech", ["بيب", "جهاز", "رقمي"], "جهاز يشتغل، تأكيد، عنصر تقني")
def _(r): return fftf(osc(1000, 0.15, "square") * adsr(0.15, 0.003, 0.02, 0.9, 0.02), hi=6000)

@snd("data_chirp", "تشيرپ بيانات", "Data chirps", "tech", ["بيانات", "كمبيوتر", "معالجة"], "تحليل بيانات، تحميل، الذكاء الاصطناعي يفكر")
def _(r):
    d = 0.9; out = np.zeros(n_(d)); t = 0
    while t < d - 0.04:
        L = r.choice([0.02, 0.03, 0.045])
        place(out, osc(r.choice([880, 1320, 1760, 2640, 3520]), L, "square") * adsr(L, 0.001, 0.005, 0.8, 0.004), t, 0.7); t += L + 0.005
    return fftf(out, hi=7000)

@snd("scan_beam", "مسح ضوئي", "Scan beam", "tech", ["مسح", "سكانر", "ليزر"], "مسح منتج أو وجه، خط ضوء يمر")
def _(r):
    d = 1.3; t = T(d); u = t / d
    f = 600 + 900 * np.sin(np.pi * u)
    s = osc(f, d, "saw") * (0.6 + 0.4 * np.sin(2 * np.pi * 18 * t))
    return svf(s, 2500, 1.0, "lp") * np.sin(np.pi * u) ** 0.8

@snd("power_up", "تشغيل طاقة", "Power up", "tech", ["تشغيل", "طاقة", "شحن"], "شي يشتغل، تطوير، «ابدأ»")
def _(r):
    d = 1.3; t = T(d); u = t / d
    f = 80 * 10 ** (u ** 1.3)
    s = osc(f, d, "saw") * (0.7 + 0.3 * np.sin(2 * np.pi * np.cumsum(4 + 30 * u) / SR))
    return svf(s, 300 + 5000 * u, 1.2, "lp") * np.minimum(1, t / 0.05) * np.minimum(1, (d - t) / 0.08)

@snd("power_down", "إطفاء طاقة", "Power down", "tech", ["إطفاء", "نهاية"], "شي ينطفي، بطارية خلصت، نهاية")
def _(r):
    d = 1.3; t = T(d); u = t / d
    f = 800 * (1 / 12) ** (u ** 0.8)
    s = osc(f, d, "saw") * (0.7 + 0.3 * np.sin(2 * np.pi * np.cumsum(30 - 26 * u) / SR))
    return svf(s, 5000 * (1 - u) + 200, 1.2, "lp") * (1 - u) ** 0.8 * np.minimum(1, t / 0.01)

@snd("robot_blips", "روبوت يحچي", "Robot blips", "tech", ["روبوت", "ذكاء اصطناعي", "بليب"], "روبوت أو ذكاء اصطناعي يرد")
def _(r):
    d = 1.0; out = np.zeros(n_(d)); t = 0
    while t < d - 0.08:
        L = r.uniform(0.04, 0.09)
        place(out, osc(sweep(r.uniform(300, 900), r.uniform(300, 1400), L), L, "square") * adsr(L, 0.002, 0.01, 0.8, 0.01), t, 0.8); t += L + r.uniform(0.01, 0.04)
    return fftf(out, hi=5000)

@snd("static_burst", "تشويش راديو", "Static burst", "tech", ["تشويش", "راديو", "تلفزيون"], "تقليب قنوات، ذكريات، انقطاع إرسال")
def _(r):
    d = 0.55; t = T(d)
    return fftf(crush(noise(r, d), 5, 3), 300, 7000) * adsr(d, 0.005, 0.05, 0.8, 0.08) * (0.7 + 0.3 * (r.random_sample(n_(d)) > 0.3))

# ───────────────────────── فلوس (money) ─────────────────────────

def _coin(r, f=4200, d=0.5):
    t = T(d)
    return P(sum(a * np.sin(2 * np.pi * f * k * t + r.uniform(0, 6)) * np.exp(-t / tau) for k, a, tau in [(1, 1, .18), (1.47, .6, .12), (2.13, .45, .08), (2.92, .3, .05)]), click_(r, 0.002, 12000, 3000) * 0.3)

@snd("coin_single", "عملة", "Coin", "money", ["عملة", "فلوس", "ربح"], "ربح صغير، نقطة، توفير")
def _(r): return mix(0.6, (_coin(r), 0, 1), (_coin(r, 4400, 0.3), 0.07, 0.4))

@snd("coins_shower", "مطر عملات", "Coins shower", "money", ["عملات", "فلوس", "ثروة"], "أرباح كبيرة، «كم وفّرت؟»")
def _(r):
    d = 1.4; out = np.zeros(n_(d))
    for _ in range(26):
        place(out, _coin(r, r.uniform(3400, 5600), 0.35), r.uniform(0, 1.0) ** 1.5, r.uniform(0.3, 1))
    return out

@snd("cash_register", "كاشير", "Cash register", "money", ["كاشير", "بيع", "شراء"], "بيع، سعر، «اشتريته بـ…»")
def _(r):
    drawer = svf(noise(r, 0.35), sweep(800, 300, 0.35), 1.2, "bp") * adsr(0.35, 0.01, 0.1, 0.6, 0.1)
    ding = bell(midi(96), 1.0, ((1, 1), (2.0, 0.4), (3.01, 0.2)), tau=0.5)
    return mix(1.5, (drawer, 0, 0.6), (ding, 0.22, 1), (_coin(r, 3900, 0.3), 0.4, 0.4), (_coin(r, 4600, 0.3), 0.47, 0.3))

@snd("kaching", "كاچينگ", "Ka-ching", "money", ["فلوس", "ربح", "سعر"], "رقم الربح، سعر مغري، خصم")
def _(r):
    hit = fftf(noise(r, 0.05), 2000, 9000) * expdec(0.05, 0.01)
    ch = sum(bell(midi(m), 1.0, ((1, 1), (2.0, 0.3), (3.0, 0.15)), tau=0.45) for m in [91, 95, 98])
    return mix(1.2, (hit, 0, 1), (_coin(r), 0, 0.6), (ch, 0.06, 0.8))

# ───────────────────────── عد تنازلي (countdown) ─────────────────────────

def _beep(f, d):
    return osc(f, d, "sine") * adsr(d, 0.003, 0.02, 0.9, 0.02) + 0.15 * osc(f * 2, d) * adsr(d, 0.003, 0.02, 0.9, 0.02)

@snd("countdown_beep", "بيب عدّ", "Countdown beep", "countdown", ["عدّ", "بيب", "ثانية"], "كل رقم بالعد التنازلي (3، 2، 1)")
def _(r): return _beep(880, 0.14)

@snd("countdown_final", "بيب الصفر", "Countdown final beep", "countdown", ["عدّ", "نهاية", "انطلاق"], "الصفر — لحظة البداية")
def _(r): return _beep(1760, 0.6) * np.exp(-T(0.6) / 0.4)

@snd("countdown_3_2_1", "عدّ ٣-٢-١", "3-2-1 countdown", "countdown", ["عدّ", "٣٢١", "انطلاق"], "عد تنازلي كامل (3 ث + الانطلاق)")
def _(r):
    return mix(3.7, (_beep(880, 0.14), 0, 1), (_beep(880, 0.14), 1, 1), (_beep(880, 0.14), 2, 1), (_beep(1760, 0.6) * np.exp(-T(0.6) / 0.4), 3, 1))

def _wood(f, d=0.08):
    t = T(d)
    return np.sin(2 * np.pi * f * t) * np.exp(-t / 0.012) + 0.4 * np.sin(2 * np.pi * f * 2.7 * t) * np.exp(-t / 0.005)

@snd("tick_tock", "تك توك", "Tick tock", "countdown", ["ساعة", "وقت", "انتظار"], "الوقت يمشي، انتظار، تحدّي بوقت")
def _(r): return mix(2.0, *[(_wood(2000 if i % 2 == 0 else 1400), i * 0.5, 1 if i % 2 == 0 else 0.8) for i in range(4)])

@snd("clock_tick", "تكة ساعة", "Clock tick", "countdown", ["ساعة", "تكة"], "ثانية وحدة، عدّاد يتحرك")
def _(r): return _wood(2300, 0.06)

@snd("timer_alarm", "منبّه", "Timer alarm", "countdown", ["منبه", "وقت", "انتهى"], "الوقت خلص، تذكير، «قوم!»")
def _(r):
    out = np.zeros(n_(1.6))
    for k in range(4):
        for j in range(4):
            place(out, osc(2000, 0.04, "square") * adsr(0.04, 0.002, 0.01, 0.9, 0.005), k * 0.4 + j * 0.06, 1)
    return fftf(out, hi=6000)

# ───────────────────────── طبيعة (nature) ─────────────────────────

def _drop(r, f0=700, f1=1700, d=0.16):
    t = T(d)
    return osc(sweep(f0, f1, d * 0.6).tolist() + [f1] * (n_(d) - n_(d * 0.6)), d) * np.exp(-t / 0.035) * np.minimum(1, t / 0.002)

@snd("water_drop", "قطرة ماي", "Water drop", "nature", ["ماي", "قطرة", "هدوء"], "مشروب، بشرة، منتج عناية، لحظة هادئة")
def _(r): return reverb(_drop(r), r, 0.6, 0.25)[: n_(0.7)]

@snd("bubble", "فقاعة", "Bubble", "nature", ["فقاعة", "ماي", "لطيف"], "عنصر يطفو، محتوى أطفال")
def _(r): return _drop(r, 350, 1100, 0.12)

@snd("bubbles_stream", "فقاعات", "Bubbles stream", "nature", ["فقاعات", "ماي", "غوص"], "تحت الماي، مشروب غازي، غسيل")
def _(r):
    d = 1.6; out = np.zeros(n_(d))
    for _ in range(28):
        f0 = r.uniform(250, 900)
        place(out, _drop(r, f0, f0 * r.uniform(1.8, 3.0), r.uniform(0.04, 0.1)), r.uniform(0, 1.5), r.uniform(0.25, 1))
    return out

@snd("heartbeat", "دقات قلب", "Heartbeat", "nature", ["قلب", "توتر", "خوف"], "لحظة توتر، انتظار نتيجة، خوف")
def _(r):
    def thump(f=55): d = 0.2; t = T(d); return osc(sweep(f * 1.6, f, d), d) * np.exp(-t / 0.05)
    out = np.zeros(n_(2.0))
    for k in range(2):
        place(out, thump(), k * 0.9); place(out, thump(48), k * 0.9 + 0.24, 0.7)
    return fftf(out, hi=300)

@snd("wind_gust", "هبّة هوا", "Wind gust", "nature", ["هوا", "رياح", "صحراء"], "صحراء، جبل، سفر، فراغ")
def _(r):
    d = 3.0; t = T(d); u = t / d
    fc = 500 + 400 * np.sin(2 * np.pi * 0.7 * t) + 300 * np.sin(2 * np.pi * 1.9 * t + 1)
    s = svf(noise(r, d), fc, 3.0, "bp")
    return s * np.sin(np.pi * u) ** 1.5

@snd("rain_patter", "مطر خفيف", "Light rain", "nature", ["مطر", "شتاء", "هدوء"], "جو شتوي، قهوة، محتوى هادئ")
def _(r):
    d = 3.0; base = fftf(noise(r, d), 800, 6000) * 0.15
    for _ in range(260):
        place(base, click_(r, 0.003, 9000, 1500), r.uniform(0, d - 0.01), r.uniform(0.1, 0.6))
    return base * np.minimum(1, T(d) / 0.3) * np.minimum(1, (d - T(d)) / 0.4)

@snd("fire_crackle", "طقطقة نار", "Fire crackle", "nature", ["نار", "حطب", "دفء"], "شوي، مخيم، شتاء، طبخ على الفحم")
def _(r):
    d = 3.0; base = fftf(noise(r, d), hi=400) * 0.4
    for _ in range(90):
        place(base, click_(r, r.uniform(0.002, 0.008), 7000, 600), r.uniform(0, d - 0.01), r.uniform(0.2, 1))
    return base * np.minimum(1, T(d) / 0.3) * np.minimum(1, (d - T(d)) / 0.4)

# ───────────────────────── كرتون وسحر (cartoon / magic) ─────────────────────────

@snd("sparkle_magic", "لمعة سحرية", "Magic sparkle", "cartoon", ["لمعة", "سحر", "نجوم"], "شي يلمع، تحوّل، قبل/بعد تنظيف")
def _(r):
    d = 1.4; out = np.zeros(n_(d))
    for i in range(22):
        t0 = (i / 22) ** 1.2 * 1.0
        place(out, bell(r.uniform(2500, 6500) * (1 + t0 * 0.3), 0.35, ((1, 1), (2.4, 0.3)), tau=0.12), t0, r.uniform(0.3, 1))
    return reverb(out, r, 0.8, 0.3)[: n_(1.7)]

@snd("magic_wand", "عصا سحرية", "Magic wand", "cartoon", ["سحر", "تحول", "عصا"], "حرف يتحوّل لصورة (درس متحرك)، مفاجأة")
def _(r):
    out = np.zeros(n_(1.4))
    for i, m in enumerate([72, 76, 79, 83, 84, 88, 91, 95, 96]):
        place(out, bell(midi(m), 0.6, tau=0.25), i * 0.04, 0.6 + i * 0.04)
    return reverb(out, r, 1.0, 0.3)[: n_(1.6)]

def _boing(f0, d, wob=11):
    t = T(d)
    f = f0 * (1 + 0.6 * np.exp(-t / 0.25) * np.sin(2 * np.pi * wob * t)) * (1 + 0.5 * t / d)
    return (osc(f, d) + 0.25 * osc(f * 2, d)) * np.exp(-t / (d / 3)) * np.minimum(1, t / 0.003)

@snd("boing", "بوينگ", "Boing", "cartoon", ["بوينگ", "قفزة", "مضحك"], "قفزة، شي يرتد، لحظة مضحكة")
def _(r): return _boing(260, 0.7)

@snd("boing_low", "بوينگ واطي", "Low boing", "cartoon", ["بوينگ", "ثقيل", "مضحك"], "شي ثقيل يرتد، سقوط مضحك")
def _(r): return _boing(120, 0.9, 8)

def _slide(f0, f1, d):
    t = T(d)
    f = sweep(f0, f1, d) * (1 + 0.012 * np.sin(2 * np.pi * 6 * t))
    s = osc(f, d) + 0.1 * osc(f * 2, d)
    return s * adsr(d, 0.04, 0.1, 0.85, 0.1)

@snd("slide_whistle_up", "صفّارة صاعدة", "Slide whistle up", "cartoon", ["صفارة", "صعود", "كرتون"], "شي يطير لفوق، فكرة ترتفع")
def _(r): return _slide(450, 1700, 0.8)

@snd("slide_whistle_down", "صفّارة نازلة", "Slide whistle down", "cartoon", ["صفارة", "نزول", "سقوط"], "سقوط مضحك، فشل خفيف")
def _(r): return _slide(1700, 380, 0.8)

@snd("spring_wobble", "سبرنگ", "Spring wobble", "cartoon", ["سبرنگ", "اهتزاز", "مرن"], "عنصر يهتز بمرونة (bounce)")
def _(r):
    d = 0.8; t = T(d)
    f = 180 + 90 * np.sin(2 * np.pi * 22 * t) * np.exp(-t / 0.3)
    s = osc(f, d, "saw"); s = svf(s, 1200, 3, "bp")
    return s * np.exp(-t / 0.25)

@snd("cartoon_zip", "زيپ سريع", "Cartoon zip", "cartoon", ["زيپ", "سرعة", "هروب"], "شخصية تركض بسرعة، شي يختفي")
def _(r):
    d = 0.35; t = T(d)
    return osc(sweep(300, 2400, d), d, "square") * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 60 * t))) * adsr(d, 0.01, 0.05, 0.8, 0.05) * 0.5

@snd("squeak", "صويت لعبة", "Toy squeak", "cartoon", ["لعبة", "صويت", "أطفال"], "لعبة أطفال، شي صغير ينضغط")
def _(r):
    d = 0.28; t = T(d)
    f = sweep(1500, 2300, d) * (1 + 0.04 * np.sin(2 * np.pi * 30 * t))
    return (osc(f, d) + 0.3 * osc(f * 2, d) + fftf(noise(r, d), 1000, 4000) * 0.08) * np.sin(np.pi * t / d) ** 0.7

@snd("pluck_cartoon", "نقرة وتر", "Cartoon pluck", "cartoon", ["وتر", "نقرة", "لطيف"], "ظهور عنصر لطيف، فكرة صغيرة")
def _(r): return fftf(pluck(r, midi(67), 0.7, 0.994), hi=3500)

@snd("fail_wah", "واه فشل", "Fail wah-wah", "cartoon", ["فشل", "مضحك", "حزين"], "فشل مضحك، توقّع غلط (بلا ضحك جاهز)")
def _(r):
    out = np.zeros(n_(2.2))
    for i, (m, d) in enumerate([(58, 0.35), (57, 0.35), (56, 0.35), (55, 1.0)]):
        t = T(d); f = midi(m) * (1 + (0.03 * np.sin(2 * np.pi * 6 * t) if i == 3 else 0))
        s = svf(osc(f, d, "saw"), 600 + 900 * np.sin(np.pi * np.clip(t / 0.3, 0, 1)), 1.5, "lp") * adsr(d, 0.03, 0.05, 0.85, 0.08)
        place(out, s, i * 0.38)
    return out

# ───────────────────────── ورق وأشياء (objects) ─────────────────────────

@snd("paper_flip", "قلبة ورقة", "Paper flip", "objects", ["ورق", "قلب", "كرت"], "تقليب كروت، ورقة تطلع")
def _(r):
    d = 0.25; t = T(d)
    s = fftf(noise(r, d), 1500, 9000) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 35 * t))) * np.sin(np.pi * t / d) ** 2
    return s

@snd("page_turn", "تقليب صفحة", "Page turn", "objects", ["صفحة", "كتاب", "قصة"], "قصة، كتاب، الفصل التالي")
def _(r):
    d = 0.7; t = T(d); u = t / d
    s = svf(noise(r, d), 1500 + 4000 * np.sin(np.pi * u), 0.8, "bp") * np.sin(np.pi * u) ** 1.5
    for _ in range(14):
        place(s, click_(r, 0.004, 8000, 2000), r.uniform(0.1, 0.6), r.uniform(0.2, 0.6))
    return s

@snd("zipper", "سحّاب", "Zipper", "objects", ["سحاب", "شنطة", "سفر"], "فتح شنطة، سفر، تجهيز")
def _(r):
    d = 0.8; out = np.zeros(n_(d)); t = 0; rate = 60
    while t < d - 0.01:
        place(out, click_(r, 0.003, 7000, 1800), t, r.uniform(0.5, 1)); rate = min(160, rate * 1.04); t += 1 / rate
    return out * np.sin(np.pi * T(d) / d) ** 0.4

@snd("paper_crumple", "كرمشة ورق", "Paper crumple", "objects", ["ورق", "كرمشة", "رمي"], "رمي فكرة غلط، «انسَ هالطريقة»")
def _(r):
    d = 1.0; out = fftf(noise(r, d), 2000, 8000) * 0.1
    for _ in range(70):
        place(out, fftf(noise(r, 0.01), 1000, 8000) * expdec(0.01, 0.003), r.uniform(0, 0.95), r.uniform(0.2, 1))
    return out * np.sin(np.pi * T(d) / d) ** 0.5

# ───────────────────────── موسيقى/طبول (music) ─────────────────────────

@snd("kick", "كيك", "Kick drum", "music", ["طبل", "كيك", "إيقاع"], "إيقاع المونتاج على البيت، ضربة كلمة")
def _(r):
    d = 0.5; t = T(d)
    f = 50 + 110 * np.exp(-t / 0.03)
    return P(tanh_sat(osc(f, d) * np.exp(-t / 0.14), 1.5), click_(r, 0.003, 7000) * 0.25)

@snd("snare", "سنير", "Snare drum", "music", ["طبل", "سنير", "إيقاع"], "ضربة ثانية بالإيقاع، تأكيد")
def _(r):
    d = 0.3; t = T(d)
    return osc(sweep(220, 180, d), d) * np.exp(-t / 0.04) * 0.6 + fftf(noise(r, d), 1200, 9000) * np.exp(-t / 0.07)

@snd("hat_closed", "هاي هات مسكّر", "Closed hi-hat", "music", ["هاي هات", "إيقاع"], "إيقاع خفيف سريع")
def _(r):
    d = 0.08; t = T(d)
    m = sum(osc(f, d, "square") for f in [3140, 4410, 5530, 6650, 8230])
    return fftf(m * 0.3 + noise(r, d), lo=7000) * np.exp(-t / 0.015)

@snd("hat_open", "هاي هات مفتوح", "Open hi-hat", "music", ["هاي هات", "إيقاع"], "نهاية جملة إيقاعية")
def _(r):
    d = 0.5; t = T(d)
    m = sum(osc(f, d, "square") for f in [3140, 4410, 5530, 6650, 8230])
    return fftf(m * 0.3 + noise(r, d), lo=6500) * np.exp(-t / 0.14)

@snd("clap", "تصفيق", "Clap", "music", ["تصفيق", "إيقاع", "يد"], "إيقاع، «برافو» صغيرة")
def _(r):
    d = 0.35; out = np.zeros(n_(d))
    for k, g in enumerate([0.7, 0.8, 1.0]):
        place(out, fftf(noise(r, 0.012), 800, 5000) * expdec(0.012, 0.004), k * 0.011, g)
    tail = fftf(noise(r, 0.3), 900, 3500) * expdec(0.3, 0.06)
    return place(out, tail, 0.033, 0.8)

@snd("tom", "توم", "Tom drum", "music", ["طبل", "توم"], "حشوة إيقاع، انتقال طبول")
def _(r):
    d = 0.5; t = T(d)
    return osc(sweep(170, 110, d), d) * np.exp(-t / 0.12) + fftf(noise(r, d), 200, 2000) * np.exp(-t / 0.01) * 0.2

@snd("rim", "ريم", "Rim shot", "music", ["طبل", "ريم", "خشب"], "إيقاع لاتيني خفيف، تكة")
def _(r):
    d = 0.1; t = T(d)
    return P(np.sin(2 * np.pi * 1700 * t) * np.exp(-t / 0.008) + np.sin(2 * np.pi * 420 * t) * np.exp(-t / 0.015) * 0.6, click_(r, 0.002) * 0.3)

@snd("stinger_positive", "ستنگر إيجابي", "Positive stinger", "music", ["ستنگر", "نهاية", "إيجابي"], "نهاية فقرة حلوة، كشف نتيجة جيدة")
def _(r):
    d = 1.5; out = np.zeros(n_(d))
    for m in [60, 64, 67, 72, 76]:
        place(out, fftf(pluck(r, midi(m), d, 0.9975), hi=4500), r.uniform(0, 0.015), 0.6)
    return reverb(out, r, 1.2, 0.25)[: n_(1.9)]

@snd("ta_da", "تادا", "Ta-da fanfare", "music", ["تادا", "كشف", "مفاجأة"], "كشف المنتج، النتيجة النهائية، قبل/بعد")
def _(r):
    def chord(ms, d):
        s = sum(osc(midi(m) * (1 + 0.002 * k), d, "saw") for k, m in enumerate(ms))
        t = T(d)
        return svf(s, 600 + 2500 * np.minimum(1, t / 0.05), 1.0, "lp") * adsr(d, 0.01, 0.1, 0.8, 0.15)
    out = mix(1.4, (chord([60, 64, 67, 72], 0.14), 0, 0.8), (chord([60, 64, 67, 72, 76], 0.95), 0.2, 1))
    return reverb(out, r, 1.0, 0.25)[: n_(1.8)]

@snd("orchestra_hit", "ضربة أوركسترا", "Orchestra-style stab", "music", ["أوركسترا", "ضربة", "درامي"], "مفاجأة درامية، عنوان كبير")
def _(r):
    d = 0.9; t = T(d)
    s = sum(osc(midi(m) * (1 + 0.003 * k), d, "saw") for k, m in enumerate([43, 50, 55, 62, 67, 74]))
    s = svf(s, 3500 * np.exp(-t / 0.3) + 300, 0.9, "lp") * np.exp(-t / 0.22) * np.minimum(1, t / 0.006)
    return reverb(s + osc(sweep(90, 45, d), d) * np.exp(-t / 0.15), r, 1.4, 0.3)[: n_(1.6)]

# ───────────────────────── قياس وكتابة ─────────────────────────

def _biquad_mag(b, a, f):
    w = 2 * np.pi * f / SR
    z = np.exp(-1j * w)
    num = b[0] + b[1] * z + b[2] * z * z
    den = a[0] + a[1] * z + a[2] * z * z
    return np.abs(num / den)

def k_weight(x):
    """ترشيح K حسب ITU-R BS.1770 (معاملات 48 kHz) — بالمقدار في المجال الترددي."""
    f = np.fft.rfftfreq(len(x), 1 / SR)
    h1 = _biquad_mag([1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585], f)
    h2 = _biquad_mag([1.0, -2.0, 1.0], [1, -1.99004745483398, 0.99007225036621], f)
    return np.fft.irfft(np.fft.rfft(x) * h1 * h2, len(x))

def momentary_max_lufs(x):
    y = k_weight(np.concatenate([x, np.zeros(n_(0.4))]))
    w = n_(0.4)
    c = np.concatenate([[0], np.cumsum(y * y)])
    ms = (c[w:] - c[:-w]) / w
    m = float(np.max(ms)) if len(ms) else 0
    return -0.691 + 10 * np.log10(m + 1e-12)

def dc_block(x, R=0.9995):
    """مانع تيار مستمر سببي (~4 Hz) — بلا رنين قبل الضربة."""
    xs = x.tolist(); y = [0.0] * len(xs); px = py = 0.0
    for i, v in enumerate(xs):
        py = v - px + R * py; px = v; y[i] = py
    return np.array(y)

def finalize(x):
    x = dc_block(np.asarray(x, dtype=float))
    # تلاشي قصير بالأطراف — لا طقّة
    fi = min(len(x) // 4, n_(0.0015)); fo = min(len(x) // 4, n_(0.012))
    if fi > 0: x[:fi] *= np.linspace(0, 1, fi)
    if fo > 0: x[-fo:] *= np.linspace(1, 0, fo)
    # قص الصمت بالنهاية (تحت −70 dB)
    pk = np.max(np.abs(x)) + 1e-12
    idx = np.where(np.abs(x) > pk * 10 ** (-70 / 20))[0]
    if len(idx):
        x = x[: min(len(x), idx[-1] + n_(0.01))]
    g_peak = 10 ** (PEAK_DB / 20) / pk
    lm = momentary_max_lufs(x)
    g_loud = 10 ** ((MOMENTARY_LUFS - lm) / 20)
    g = min(g_peak, g_loud)
    y = x * g
    return y, dict(gain_rule="peak" if g_peak <= g_loud else "loudness")

def write_wav(path, x):
    pcm = np.clip(np.round(x * 32767), -32768, 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    return pcm

def render(meta):
    r = rng_for(meta["id"])
    y, info = finalize(meta["fn"](r))
    return y, info

def embed_catalog_in_page(cat):
    """يحدّث نسخة الكتالوج المضمّنة داخل web/sfx.html (حتى تشتغل الصفحة لو انفتحت كملف)."""
    page = os.path.join(ROOT, "web", "sfx.html")
    if not os.path.exists(page):
        return False
    s = open(page, encoding="utf-8").read()
    a = s.find('<script id="catalog" type="application/json">'); b = s.find("</script>", a)
    if a < 0 or b < 0:
        return False
    head = '<script id="catalog" type="application/json">'
    s = s[: a + len(head)] + json.dumps(cat, ensure_ascii=False) + s[b:]
    open(page, "w", encoding="utf-8").write(s)
    return True

def main():
    ap = argparse.ArgumentParser(description="مولّد مكتبة المؤثرات الصوتية")
    ap.add_argument("--only", default="")
    ap.add_argument("--out", default=OUT)
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--previews", action="store_true")
    a = ap.parse_args()
    ids = [s["id"] for s in SOUNDS]
    assert len(ids) == len(set(ids)), "ids مكررة"
    if a.list:
        for s in SOUNDS: print(s["id"], "\t", s["ar"])
        return
    only = set(x.strip() for x in a.only.split(",") if x.strip())
    bad = only - set(ids)
    if bad:
        print("❌ أسماء مو موجودة:", ", ".join(sorted(bad))); sys.exit(2)
    wdir = os.path.join(a.out, "wav"); os.makedirs(wdir, exist_ok=True)
    cpath = os.path.join(a.out, "catalog.json")
    old = {}
    if os.path.exists(cpath):
        try: old = {s["id"]: s for s in json.load(open(cpath, encoding="utf-8"))["sounds"]}
        except Exception: old = {}
    entries = []
    total = 0
    for meta in SOUNDS:
        sid = meta["id"]
        if only and sid not in only:
            if sid in old: entries.append(old[sid])
            continue
        y, info = render(meta)
        pcm = write_wav(os.path.join(wdir, sid + ".wav"), y)
        q = pcm.astype(float) / 32767
        e = dict(id=sid, ar=meta["ar"], en=meta["en"], name_ar=meta["ar"], name_en=meta["en"], category=meta["category"],
                 duration=round(len(pcm) / SR, 3), tags=meta["tags"], use=meta["use"],
                 file="wav/%s.wav" % sid,
                 peak_db=round(20 * np.log10(np.max(np.abs(q)) + 1e-12), 2),
                 momentary_lufs=round(momentary_max_lufs(q), 1), gain_rule=info["gain_rule"])
        entries.append(e)
        total += os.path.getsize(os.path.join(wdir, sid + ".wav"))
        print(f"  {sid:22s} {e['duration']:5.2f}s  peak {e['peak_db']:6.2f} dB  M {e['momentary_lufs']:6.1f} LUFS  ({e['gain_rule']})")
        if a.previews:
            od = os.path.join(a.out, "ogg"); os.makedirs(od, exist_ok=True)
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(wdir, sid + ".wav"), "-c:a", "libvorbis", "-q:a", "3", os.path.join(od, sid + ".ogg")])
    # أصوات CC0 المسجّلة (library/sfx/cc0 — build.py) مو مولّدة هني: تبقى كما هي بالكتالوج
    entries += [s for s in old.values() if s.get("source") == "cc0"]
    order = {s: i for i, s in enumerate(ids)}
    entries.sort(key=lambda e: order.get(e["id"], 1e9))
    cat = dict(
        name="I/O Studio SFX library", version=1,
        license="مولّدة بالكامل بالكود (engine/sfx-gen.py) — حرّة، بلا حقوق لأحد. نفس رخصة البلگن (MIT). مدخلات cc0_* أصوات مسجّلة CC0 1.0 (library/sfx/cc0/ledger.json).",
        format=dict(sample_rate=SR, channels=1, bits=16, container="wav"),
        loudness=dict(peak_dbfs_max=PEAK_DB, momentary_lufs_max=MOMENTARY_LUFS,
                      rule="الربح = الأقل بين (قمة −1 dBFS) و(أعلى علو لحظي 400ms = −16 LUFS)"),
        regenerate="python3 engine/sfx-gen.py",
        categories={"transition": "انتقالات", "ui": "واجهة وتطبيقات", "impact": "ضربات", "riser": "صعود ونزول",
                    "tech": "تقنية", "money": "فلوس", "countdown": "عدّ ووقت", "nature": "طبيعة",
                    "cartoon": "كرتون وسحر", "objects": "ورق وأشياء", "music": "طبول وموسيقى"},
        sounds=entries)
    json.dump(cat, open(cpath, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    emb = embed_catalog_in_page(cat)
    print(f"✅ {len(entries)} صوت → {cpath}" + ("  (+ web/sfx.html)" if emb else ""))

if __name__ == "__main__":
    main()
