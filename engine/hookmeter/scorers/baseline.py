"""Cheap baseline scorer — always works on CPU with ffmpeg + numpy.

Measures simple, explainable things in the first N seconds of a reel.
None of these is a "hook score" by itself; the experiment shows which of them
(if any) move together with the creator's real Instagram numbers.

Optional: openai-whisper for speech timing (first spoken word, words/second).
"""
from __future__ import annotations

import json
import math
import os
import re
import shutil
import subprocess
import tempfile

NAME = "baseline"

# feature -> (Arabic label, expected direction for a "stronger" hook, note)
FEATURES = {
    "first_word_sec": ("أول كلمة منطوقة (ثانية)", "-", "كل ما أبكر غالباً أحسن — يحتاج whisper"),
    "words_per_sec": ("سرعة الكلام (كلمة/ثانية)", "?", "يحتاج whisper"),
    "audio_onset_sec": ("أول صوت واضح (ثانية)", "-", "متى يبدأ صوت فوق −35 dB"),
    "loudness_db": ("مستوى الصوت بالبداية (dBFS)", "?", "متوسط RMS"),
    "cuts": ("عدد القطعات", "?", "تغيّر مشهد بـ ffmpeg"),
    "motion": ("طاقة الحركة", "?", "متوسط الفرق بين الإطارات 0–1"),
    "motion_first_sec": ("حركة أول ثانية", "+", "هل تتحرك الصورة من أول لحظة"),
    "text_edges": ("كثافة حواف تشبه النص", "?", "تقدير تقريبي لوجود كتابة على الشاشة (بدون OCR)"),
    "brightness": ("الإضاءة", "?", "0–255"),
    "contrast": ("التباين", "?", "انحراف معياري للإضاءة"),
    "colorfulness": ("حيوية الألوان", "?", "مقياس Hasler–Süsstrunk"),
}


def available() -> tuple[bool, str]:
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        return False, "ffmpeg/ffprobe غير مثبت"
    try:
        import numpy  # noqa: F401
    except ImportError:
        return False, "numpy غير مثبت (pip install numpy)"
    return True, "ok"


def _probe(path: str) -> dict:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height:format=duration",
         "-of", "json", path], capture_output=True, text=True, check=True).stdout
    j = json.loads(out)
    info = {"duration": float(j.get("format", {}).get("duration") or 0), "has_audio": False, "w": 0, "h": 0}
    for s in j.get("streams", []):
        if s.get("codec_type") == "video" and not info["w"]:
            info["w"], info["h"] = int(s.get("width") or 0), int(s.get("height") or 0)
        if s.get("codec_type") == "audio":
            info["has_audio"] = True
    return info


def _frames(path: str, seconds: float, fps: float, w: int, h: int, gray: bool):
    import numpy as np
    pix = "gray" if gray else "rgb24"
    ch = 1 if gray else 3
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-t", str(seconds), "-i", path, "-vf", f"fps={fps},scale={w}:{h}",
         "-f", "rawvideo", "-pix_fmt", pix, "-"], capture_output=True, check=True).stdout
    n = len(raw) // (w * h * ch)
    a = np.frombuffer(raw[: n * w * h * ch], dtype=np.uint8).astype(np.float32)
    return a.reshape(n, h, w) if gray else a.reshape(n, h, w, 3)


def _audio(path: str, seconds: float, sr: int = 16000):
    import numpy as np
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-t", str(seconds), "-i", path, "-ac", "1", "-ar", str(sr),
         "-f", "s16le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0


def _cuts(path: str, seconds: float, threshold: float = 0.3) -> int:
    r = subprocess.run(
        ["ffmpeg", "-hide_banner", "-t", str(seconds), "-i", path, "-vf",
         f"select='gt(scene,{threshold})',showinfo", "-an", "-f", "null", "-"],
        capture_output=True, text=True)
    return len(re.findall(r"pts_time:", r.stderr))


def _whisper(path: str, seconds: float, lang: str | None):
    try:
        import whisper  # openai-whisper
    except ImportError:
        return None
    model_name = os.environ.get("HOOKMETER_WHISPER_MODEL", "small")
    with tempfile.TemporaryDirectory() as td:
        wav = os.path.join(td, "a.wav")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-t", str(seconds), "-i", path, "-ac", "1",
                        "-ar", "16000", wav], check=True)
        model = _whisper_model(whisper, model_name)
        res = model.transcribe(wav, language=lang, word_timestamps=True, fp16=False,
                               condition_on_previous_text=False)
    words = [w for seg in res.get("segments", []) for w in seg.get("words", [])]
    words = [w for w in words if w.get("start") is not None and w["start"] < seconds]
    return {"words": words, "language": res.get("language"), "text": res.get("text", "").strip()}


_WHISPER_CACHE: dict = {}


def _whisper_model(whisper, name):
    if name not in _WHISPER_CACHE:
        _WHISPER_CACHE[name] = whisper.load_model(name, device="cpu")
    return _WHISPER_CACHE[name]


def score(path: str, seconds: float = 3.0, lang: str | None = "ar", use_whisper: bool = True) -> dict:
    import numpy as np
    info = _probe(path)
    secs = min(seconds, info["duration"] or seconds)
    out: dict = {k: None for k in FEATURES}
    extra: dict = {}

    # --- picture -----------------------------------------------------------
    w = 108
    h = int(round(w * (info["h"] or 1920) / (info["w"] or 1080) / 2) * 2) or 192
    rgb = _frames(path, secs, 10, w, h, gray=False)
    if len(rgb):
        gray = rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
        out["brightness"] = float(gray.mean())
        out["contrast"] = float(gray.std(axis=(1, 2)).mean())
        rg = rgb[..., 0] - rgb[..., 1]
        yb = 0.5 * (rgb[..., 0] + rgb[..., 1]) - rgb[..., 2]
        out["colorfulness"] = float(np.mean(np.sqrt(rg.std(axis=(1, 2)) ** 2 + yb.std(axis=(1, 2)) ** 2)
                                            + 0.3 * np.sqrt(rg.mean(axis=(1, 2)) ** 2 + yb.mean(axis=(1, 2)) ** 2)))
        if len(gray) > 1:
            diffs = np.abs(np.diff(gray, axis=0)).mean(axis=(1, 2)) / 255.0
            out["motion"] = float(diffs.mean())
            out["motion_first_sec"] = float(diffs[:10].mean())

    # text-like edges: dense, sharp edges in a horizontal band (captions/titles)
    gw = 216
    gh = int(round(gw * (info["h"] or 1920) / (info["w"] or 1080) / 2) * 2) or 384
    g = _frames(path, secs, 2, gw, gh, gray=True)
    if len(g):
        gx = np.abs(np.diff(g, axis=2))[:, :-1, :]
        gy = np.abs(np.diff(g, axis=1))[:, :, :-1]
        strong = ((gx > 60) & (gy > 0)) | ((gy > 60) & (gx > 0))
        rows = strong.mean(axis=2)  # per-row edge density, shape (n, h-1)
        band = max(4, rows.shape[1] // 10)  # ~10% of height
        kernel = np.ones(band) / band
        best = [np.convolve(r, kernel, mode="valid").max() for r in rows]
        out["text_edges"] = float(np.mean(best))

    out["cuts"] = _cuts(path, secs)

    # --- sound -------------------------------------------------------------
    if info["has_audio"]:
        a = _audio(path, secs)
        if len(a):
            rms = math.sqrt(float(np.mean(a ** 2))) or 1e-9
            out["loudness_db"] = 20 * math.log10(rms)
            win = 1600  # 0.1 s at 16 kHz
            n = len(a) // win
            if n:
                frame_db = 20 * np.log10(np.sqrt((a[: n * win].reshape(n, win) ** 2).mean(axis=1)) + 1e-9)
                loud = np.where(frame_db > -35)[0]
                out["audio_onset_sec"] = float(loud[0] * 0.1) if len(loud) else None
        if use_whisper:
            tr = _whisper(path, secs, lang)
            if tr is not None:
                words = tr["words"]
                out["first_word_sec"] = float(words[0]["start"]) if words else None
                out["words_per_sec"] = len(words) / secs if secs else None
                extra["transcript"] = tr["text"]
                extra["language"] = tr["language"]
    extra["analysed_sec"] = round(secs, 2)
    extra["has_audio"] = info["has_audio"]
    return {"scores": out, "extra": extra}
