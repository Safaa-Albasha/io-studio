# -*- coding: utf-8 -*-
"""ضبط توقيت الكلمات بعد مراجعة النص (اختياري) — محاذاة WhisperX (wav2vec2 العربي) بلا ما يتغيّر ولا حرف.
مأخوذ ومعدّل من Reel Studio (MIT, © 2026 Mohamed Abdou — scripts/python/align.py + scripts/lib/alignment-contract.mjs).
وِسبر يوزّع السكتة داخل توقيت الكلمات؛ المحاذاة تضيّقها، فالكابشن يلمع على الكلمة بالضبط والقص ما ياكل كلمة.

    python3 50_align_words.py <work> [--dry] [--min-score 0.35]
        يقرأ caps.json (النص المصحّح) وصوت cutz.mp4، يحاذي كل جملة لحالها، ويحدّث s/e للكلمات بس.
        جملة عدد كلماتها ما طابق أو ثقتها ضعيفة ← تبقى كما هي. النسخة السابقة: caps.json.bak (والتراجع: 10_script_edit.py undo).
    التنصيب (مرة وحدة، CPU، ~2 GB):  pip install whisperx==3.8.6
        الموديل يتنزّل أول مرة من Hugging Face بنسخة مثبّتة (MODEL/REVISION تحت) — Apache-2.0. WhisperX: BSD-2-Clause.
"""
import json, os, shutil, subprocess, sys

MODEL = "jonatasgrosman/wav2vec2-large-xlsr-53-arabic"
REVISION = "3a200094b44306af86f8732637089706f0277293"

try:
    sys.stdout.reconfigure(encoding="utf-8"); sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass


def segments_from_caps(caps):
    """One alignment segment per caption card: its reviewed text and window on the cut timeline."""
    segs = []
    for i, c in enumerate(caps["cards"]):
        words = [w["t"] for w in c["w"] if str(w.get("t", "")).strip()]
        if not words: continue
        segs.append({"card": i, "text": " ".join(words), "start": max(0.0, float(c["w"][0]["s"]) - 0.15), "end": float(c["w"][-1]["e"]) + 0.15, "n": len(" ".join(words).split())})
    return segs


def apply_alignment(caps, segs, aligned, min_score=0.35):
    """Replace s/e of each card's words when WhisperX returned the same number of timed words with enough confidence."""
    changed, kept = 0, []
    for seg, out in zip(segs, aligned):
        ws = [w for w in out if "start" in w and "end" in w]
        card = caps["cards"][seg["card"]]
        real = [w for w in card["w"] if str(w.get("t", "")).strip()]
        sizes = [len(str(w["t"]).split()) for w in real]          # a caption word may hold two spoken words («ريل يوقف»)
        score = sum(float(w.get("score", 0)) for w in ws) / max(1, len(ws))
        if len(ws) != sum(sizes) or score < min_score:
            kept.append({"card": seg["card"] + 1, "why": f"{len(ws)}/{sum(sizes)} كلمة · ثقة {score:.2f}"}); continue
        k = 0
        for w, n in zip(real, sizes):
            a, b = ws[k], ws[k + n - 1]; k += n
            w["s"], w["e"] = round(float(a["start"]), 3), round(max(float(b["end"]), float(a["start"]) + 0.04), 3)
        for j in range(len(real) - 1):
            if real[j]["e"] > real[j + 1]["s"]: real[j]["e"] = real[j + 1]["s"]
        card["s"], card["e"] = min(card["s"], real[0]["s"]), max(card["e"], real[-1]["e"])
        changed += 1
    return changed, kept


def main():
    if len(sys.argv) < 2: sys.exit(__doc__)
    W = os.path.abspath(sys.argv[1]); dry = "--dry" in sys.argv
    ms = float(sys.argv[sys.argv.index("--min-score") + 1]) if "--min-score" in sys.argv else 0.35
    caps = json.load(open(os.path.join(W, "caps.json"), encoding="utf-8"))
    segs = segments_from_caps(caps)
    src = os.path.join(W, "cutz.mp4")
    print(f"المحاذاة: {len(segs)} جملة · {sum(s['n'] for s in segs)} كلمة · الصوت {'cutz.mp4' if os.path.exists(src) else '❌ cutz.mp4 مو موجود (شغّل 03_cut_zoom.py أول)'}")
    if dry or not os.path.exists(src): return
    try:
        import whisperx  # noqa: F401
    except ImportError:
        sys.exit("ℹ️ المحاذاة اختيارية وتحتاج تنصيب مرة وحدة: pip install whisperx==3.8.6 — بدونها التوقيت من وِسبر يبقى كما هو.")
    import whisperx
    wav = os.path.join(W, "align16k.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-vn", "-ac", "1", "-ar", "16000", wav], check=True)
    model, meta = whisperx.load_align_model(language_code="ar", device="cpu", model_name=MODEL, model_dir=None)
    audio = whisperx.load_audio(wav)
    aligned = []
    for s in segs:
        r = whisperx.align([{"text": s["text"], "start": s["start"], "end": s["end"]}], model, meta, audio, "cpu", interpolate_method="ignore", return_char_alignments=False)
        aligned.append(r.get("word_segments", []))
    changed, kept = apply_alignment(caps, segs, aligned, ms)
    shutil.copy(os.path.join(W, "caps.json"), os.path.join(W, "caps.json.bak"))
    json.dump(caps, open(os.path.join(W, "caps.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"✅ {changed} جملة انضبطت · {len(kept)} بقت كما هي" + "".join(f"\n   جملة {k['card']}: {k['why']}" for k in kept))
    print(f"   الموديل: {MODEL}@{REVISION[:12]} (Apache-2.0) · WhisperX (BSD-2-Clause)")


if __name__ == "__main__":
    main()
