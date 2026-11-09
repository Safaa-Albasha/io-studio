# -*- coding: utf-8 -*-
"""يضيف أصوات CC0 المسجّلة (من Reel Studio — Sound-Kits/cc0، MIT/CC0) لمكتبة المؤثرات بنفس قواعدها.
    python3 library/sfx/cc0/build.py <مجلد Sound-Kits/cc0 فيه ledger.json والـwav>
لكل ملف بالسجل: يتحقق من SHA-256 المسجّل (يرفض أي ملف غيره)، يحوّله مونو 48 kHz 16-bit، يطبّق قاعدة العلو
نفسها (قمة −1 dBFS · أعلى علو لحظي −16 LUFS)، ويكتب library/sfx/cc0/<id>.wav + ledger.json (المصدر + بصمة الأصل + بصمة نسختنا)
ويضيف/يحدّث مدخل cc0_<id> بـ library/sfx/catalog.json (و web/sfx.html). إعادة تشغيل sfx-gen.py تحافظ على هالمدخلات."""
import hashlib, importlib.util, json, os, sys, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SFX = os.path.dirname(HERE)
ROOT = os.path.abspath(os.path.join(SFX, "..", ".."))
spec = importlib.util.spec_from_file_location("sfxgen", os.path.join(ROOT, "engine", "sfx-gen.py"))
G = importlib.util.module_from_spec(spec); spec.loader.exec_module(G)

KIND = {  # kind → (category بمكتبتنا, الاسم العربي للنوع)
    "click": ("ui", "نقرة"), "pop": ("ui", "فقعة"), "chime": ("ui", "رنّة تأكيد"), "tick": ("countdown", "تكّة"),
    "type": ("ui", "زر كيبورد"), "reject": ("ui", "رفض"), "landing": ("impact", "هبوط ناعم"), "paper": ("objects", "ورق"),
}
AR = {
    "click-minimal": "نقرة جافة", "click-mechanical": "نقرة زر ميكانيكي", "click-snap": "نقرة تثبيت", "click-tiny": "نقرة صغيرة جداً",
    "click-metal": "نقرة قفل معدني", "pop-minimal": "فقعة صغيرة", "pop-rubber": "فقعة مطاطية", "pop-organic": "فقعة دافئة", "pop-zen": "فقعة هادية",
    "pop-select": "فقعة اختيار", "chime-minimal": "رنّة تمّ", "chime-zen": "رنّة هادية", "chime-bright": "رنّة مشرقة", "chime-soft": "رنّة ناعمة",
    "tick-minimal": "تكّة عدّاد", "tick-1": "تكّة ١", "tick-2": "تكّة ٢", "tick-3": "تكّة ٣", "type-minimal": "زر كيبورد خفيف",
    "type-mechanical": "زر كيبورد ميكانيكي", "type-organic": "زر كيبورد ناعم", "reject-dull": "رفض مكتوم", "landing-cinematic": "هبوط سينمائي",
    "landing-soft-heavy": "هبوط ثقيل ناعم", "landing-soft-medium": "هبوط خفيف", "landing-wood": "خبطة خشب", "landing-plank": "طرقة لوح", "paper-flip": "قلب صفحة",
}
MIN_DUR = 0.03

def sha(p): return hashlib.sha256(open(p, "rb").read()).hexdigest()

def read(p):
    with wave.open(p, "rb") as w:
        ch, sr, bits, raw = w.getnchannels(), w.getframerate(), w.getsampwidth(), w.readframes(w.getnframes())
    if bits != 2: raise SystemExit(f"{p}: لازم 16-bit")
    x = np.frombuffer(raw, "<i2").astype(float).reshape(-1, ch).mean(axis=1) / 32767
    if sr != G.SR: x = np.interp(np.arange(int(len(x) * G.SR / sr)) * sr / G.SR, np.arange(len(x)), x)
    return x

def main():
    src = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else sys.exit(__doc__)
    up = json.load(open(os.path.join(src, "ledger.json"), encoding="utf-8"))
    cpath = os.path.join(SFX, "catalog.json")
    cat = json.load(open(cpath, encoding="utf-8"))
    taken = {s["id"] for s in cat["sounds"] if s.get("source") != "cc0"}
    entries, ledger = [], []
    for s in up["sounds"]:
        f = os.path.join(src, s["file"])
        if not os.path.exists(f): raise SystemExit("ناقص: " + f)
        if s.get("sha256") and sha(f) != s["sha256"]: raise SystemExit(f"{s['file']}: البصمة ما تطابق السجل — ما أضيفه")
        sid = "cc0_" + s["id"].replace("-", "_")
        if sid in taken: raise SystemExit("id مكرر: " + sid)
        x = read(f)
        if len(x) < MIN_DUR * G.SR: x = np.concatenate([x, np.zeros(int(MIN_DUR * G.SR) - len(x))])
        pk = np.max(np.abs(x)) + 1e-12
        g = min(10 ** (G.PEAK_DB / 20) / pk, 10 ** ((G.MOMENTARY_LUFS - G.momentary_max_lufs(x)) / 20))
        y = x * g
        out = os.path.join(HERE, s["file"])
        pcm = G.write_wav(out, y)
        q = pcm.astype(float) / 32767
        cat_id, kind_ar = KIND[s["kind"]]
        entries.append(dict(id=sid, ar=AR.get(s["id"], kind_ar), en=s["id"].replace("-", " ").capitalize() + " (CC0)",
                            name_ar=AR.get(s["id"], kind_ar), name_en=s["id"].replace("-", " ").capitalize() + " (CC0)", category=cat_id,
                            duration=round(len(pcm) / G.SR, 3), tags=[kind_ar, "مسجّل", "CC0"], use=s["use"], file="cc0/" + s["file"],
                            peak_db=round(20 * np.log10(np.max(np.abs(q)) + 1e-12), 2), momentary_lufs=round(G.momentary_max_lufs(q), 1),
                            gain_rule="cc0-import", source="cc0", license="CC0-1.0", origin=up["sources"][s["source"]]["name"]))
        ledger.append({**s, "sourceSha256": s.get("sha256"), "sha256": sha(out), "bytes": os.path.getsize(out), "file": s["file"], "id": sid,
                       "upstreamId": s["id"], "processing": "mono 48 kHz 16-bit; gain = min(peak −1 dBFS, momentary −16 LUFS); padded to ≥30 ms"})
    json.dump({"version": 1, "licence": "CC0-1.0", "via": "Reel Studio Sound-Kits/cc0 (MIT, © 2026 Mohamed Abdou) — github.com/mohamedabdou-ai/reel-studio",
               "note": "سجل مصدر كل صوت مسجّل بهالمجلد. كل الملفات CC0 1.0 (ملك عام، بلا نسب مطلوب). ما ينضاف صوت بلا مدخله هني.",
               "sources": up["sources"], "sounds": ledger}, open(os.path.join(HERE, "ledger.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    cat["sounds"] = [s for s in cat["sounds"] if s.get("source") != "cc0"] + entries
    json.dump(cat, open(cpath, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    G.embed_catalog_in_page(cat)
    print(f"✅ {len(entries)} صوت CC0 → library/sfx/cc0/ + catalog.json ({len(cat['sounds'])} صوت بالمكتبة)")

if __name__ == "__main__":
    main()
