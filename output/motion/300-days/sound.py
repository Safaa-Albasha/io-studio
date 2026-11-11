#!/usr/bin/env python3
"""صوت «فكرة عمرها 300 يوم»: خلفية درون مولّدة بالكود + مؤثرات من مكتبة I/O Studio.
   python3 sound.py  → audio/mix.wav  (بعدها ffmpeg يعاير ‎-14 LUFS ويركّبه على الفيديو)"""
import os, wave, numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.path.abspath(os.path.join(HERE, '../../../library/sfx'))
SR, DUR = 48000, 54.0
N = int(SR * DUR)

def load(name):
    p = os.path.join(LIB, 'wav', name + '.wav')
    if not os.path.exists(p):
        p = os.path.join(LIB, 'cc0', name.replace('cc0_', '').replace('_', '-') + '.wav')
    w = wave.open(p); sr, ch, sw = w.getframerate(), w.getnchannels(), w.getsampwidth()
    a = np.frombuffer(w.readframes(w.getnframes()), dtype={2: np.int16, 4: np.int32}[sw]).astype(np.float64)
    a /= float(2 ** (8 * sw - 1))
    if ch > 1: a = a.reshape(-1, ch).mean(axis=1)
    if sr != SR: a = np.interp(np.arange(0, len(a), sr / SR), np.arange(len(a)), a)
    return a

def env(points):
    """غلاف خطي من نقاط (ثانية، قيمة)"""
    t = np.arange(N) / SR
    xs, ys = zip(*points)
    return np.interp(t, xs, ys)

t = np.arange(N) / SR
rng = np.random.default_rng(300)

# ── الخلفية: درون A صغير يتنفس ──
lfo = 0.75 + 0.25 * np.sin(2 * np.pi * 0.11 * t)
drone = (0.5 * np.sin(2 * np.pi * 55 * t) + 0.35 * np.sin(2 * np.pi * 82.41 * t + 0.4) + 0.22 * np.sin(2 * np.pi * 110 * t + 1.1)) * lfo
noise = rng.standard_normal(N)
k = 400; noise = np.convolve(noise, np.ones(k) / k, mode='same') * 6       # هوا ناعم (low-pass بسيط)
shimmer = 0.18 * np.sin(2 * np.pi * 220 * t) + 0.12 * np.sin(2 * np.pi * 329.6 * t + 0.7) + 0.08 * np.sin(2 * np.pi * 440 * t + 2)
shimmer *= 0.6 + 0.4 * np.sin(2 * np.pi * 0.5 * t)

g_drone = env([(0, 0), (1.5, .22), (4, .26), (10, .3), (17.6, .36), (22.6, .42), (23.0, 0), (26.6, 0), (28.4, .55), (40, .5), (40.4, .3), (46, .26), (49.6, .3), (52.5, .28), (54, 0)])
g_noise = env([(0, .05), (10, .07), (17.6, .1), (22.9, .14), (23.0, 0), (26.6, 0), (28.4, .12), (40.4, .05), (54, 0)])
g_shim = env([(0, 0), (28.4, 0), (29.5, .35), (39.5, .45), (40.4, .1), (46, .05), (49.6, .15), (54, 0)])
bed = 0.35 * drone * g_drone + 0.25 * noise * g_noise + 0.3 * shimmer * g_shim

mix = bed.copy()
def put(name, at, gain=0.5, rate=1.0, end=False):
    a = load(name)
    if rate != 1.0: a = np.interp(np.arange(0, len(a), rate), np.arange(len(a)), a)
    i = int((at - (len(a) / SR if end else 0)) * SR)
    j0, j1 = max(0, i), min(N, i + len(a))
    if j1 > j0: mix[j0:j1] += gain * a[j0 - i:j1 - i]

# 1 · الهوك
put('heartbeat', 0.0, .55); put('heartbeat', 2.0, .5)
put('cc0_tick_minimal', 1.4, .35)
put('whoosh_reverse', 4.2, .35, end=True)
# 2 · الطمر: كل ملاحظة تنزل
for d in [1.6, 2.15, 2.65, 3.05, 3.4, 3.72, 4.0]:
    put('cc0_click_minimal', 4 + d + 0.38, .28); put('whoosh_short', 4 + d + 0.2, .08)
put('heartbeat', 6.6, .3, rate=0.8); put('heartbeat', 8.8, .25, rate=0.75)
# 3 · الأعذار
for i, h in enumerate([0.45, 2.05, 3.65, 5.25]):
    at = 10.4 + h
    put('impact_punch', at, .55 if i < 3 else .7); put('bass_hit', at, .45 if i < 3 else .6)
put('downer_drop', 16.0, .25)
# 4 · الحذف
put('tension_swell', 17.6, .32)
put('heartbeat', 18.3, .4, rate=0.7); put('heartbeat', 20.6, .32, rate=0.6)
put('whoosh_soft', 18.9, .25)
# 5 · السكوت ← الكتابة ← إنتر
for w in [24.1, 24.55, 25.0]:
    put('cc0_click_mechanical', w, .45); put('cc0_click_mechanical', w + .07, .3)
put('key_enter', 26.75, .6)
put('sparkle_magic', 26.8, .25)
put('riser_noise', 28.4, .45, end=True)
# 6 · الانفجار ← الحرف ← العبور
put('cinematic_hit', 28.4, .6); put('boom_deep', 28.4, .45); put('air_pass', 28.7, .3)
put('riser_tone', 34.6, .3, end=True); put('hit_trailer_tail', 34.6, .35)
put('whoosh_long', 39.6, .4); put('riser_short', 40.4, .3, end=True)
# 7 · المفاجأة
put('cc0_chime_soft', 40.45, .4)
put('whoosh_soft', 41.0, .25)
put('cc0_chime_minimal', 42.9, .35)
for i in range(10): put('cc0_click_tiny', 44.1 + i * 0.07, .18)
put('cc0_chime_zen', 45.0, .4)
# 8 · بلا… بلا… بلا
for i, w in enumerate([46.2, 46.9, 47.6]): put('bass_hit', w, .25 + .1 * i); put('cc0_tick_minimal', w, .35)
# 9 · الختام
put('braam', 49.6, .22)
put('cc0_chime_zen', 50.7, .3)
put('heartbeat', 52.1, .4)

# تلاشي آخر ثانية + منع التقطيع
mix *= env([(0, 1), (53.0, 1), (54, 0)])
peak = np.max(np.abs(mix)); mix = mix / peak * 0.89
os.makedirs(os.path.join(HERE, 'audio'), exist_ok=True)
out = os.path.join(HERE, 'audio', 'mix.wav')
with wave.open(out, 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print('✓', out)
