# -*- coding: utf-8 -*-
"""بصمة ستايل من فيديو مرجعي — يقيس الأسلوب (إيقاع القطع، الحركة، الكابشن، الشكل، الصوت) ويحوّله لإعدادات محرّكنا.
مأخوذ ومعدّل من Reel Studio (MIT, © 2026 Mohamed Abdou — instructions/STYLE-LEARNING.md + scripts/probe/scenes/audio/contact-sheet):
نفس العقد: يتعلّم الأسلوب مو اللقطات، كل ادّعاء له دليل بتوقيت المرجع، والمجهول يبقى «مجهول».

    python3 style_analyze.py analyze <ref.mp4> --out <مجلد المشروع> [--id ref-a]
        يكتب <out>/style-analysis/<id>/ (probe · cuts · motion · look · text · audio · sheet.jpg · frames/)
        و<out>/STYLE_DNA.json (مسودة: المقاس معبّى، والملاحظات البصرية فاضية لين تشوف الفريمات بعينك)
    python3 style_analyze.py map <STYLE_DNA.json> [--work <مجلد الفيديو>] [--apply]
        يحوّل البصمة لمحرّكنا: theme.json (capStyle · capStill · pace) + 35_moves.py (--family · --style) + اقتراح look/ألوان.
        --apply يكتب capStyle/capStill/pace بس بـ<work>/theme.json (نسخة .bak) — الألوان والـlook ما تنكتب إلا بطلبه الصريح.

يحتاج: ffmpeg/ffprobe + numpy + Pillow (نفس سكل io-video-editor).
"""
import hashlib, json, os, re, subprocess, sys, shutil
import numpy as np
from PIL import Image, ImageDraw

try:
    sys.stdout.reconfigure(encoding="utf-8"); sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

HERE = os.path.dirname(os.path.abspath(__file__))
PLUGIN = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
STYLES = os.path.join(PLUGIN, "skills", "io-video-editor", "motion", "styles", "catalog.json")
LOOKS = os.path.join(PLUGIN, "library", "looks", "catalog.json")
SAMPLE_FPS = 4
SAMPLE_W = 180


def sh(cmd, binary=False):
    r = subprocess.run(cmd, capture_output=True, text=not binary)
    if r.returncode != 0:
        raise SystemExit(f"❌ {cmd[0]} فشل: {(r.stderr if not binary else r.stderr.decode('utf8', 'replace'))[-400:]}")
    return r


def tc(t):
    return f"{int(t // 60):02d}:{t % 60:05.2f}"


def r3(x):
    return round(float(x), 3)


# ── القياسات ──────────────────────────────────────────────────────────────────

def probe(ref):
    j = json.loads(sh(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", ref]).stdout)
    v = next((s for s in j["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in j["streams"] if s["codec_type"] == "audio"), None)
    if not v: raise SystemExit("❌ ما فيه فيديو بالملف")
    n, d = (v.get("avg_frame_rate") or "30/1").split("/")
    fps = float(n) / float(d) if float(d) else 30.0
    w, h = v["width"], v["height"]
    rot = next((sd.get("rotation") for sd in v.get("side_data_list", []) if "rotation" in sd), 0) or 0
    if abs(int(rot)) == 90: w, h = h, w
    hsh = hashlib.sha256()
    with open(ref, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""): hsh.update(chunk)
    return {"file": os.path.abspath(ref), "sha256": hsh.hexdigest(), "duration": r3(j["format"].get("duration", 0)), "width": w, "height": h,
            "fps": r3(fps), "audio": bool(a), "aspect": "9:16" if h > w * 1.5 else "16:9" if w > h * 1.5 else "4:5/1:1"}


def scene_cuts(ref, th):
    err = subprocess.run(["ffmpeg", "-hide_banner", "-i", ref, "-vf", f"select='gt(scene,{th})',showinfo", "-an", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    return [r3(float(m)) for m in re.findall(r"pts_time:([0-9.]+)", err)]


def sample_frames(ref, dur):
    h = None
    raw = sh(["ffmpeg", "-v", "error", "-i", ref, "-vf", f"fps={SAMPLE_FPS},scale={SAMPLE_W}:-2", "-pix_fmt", "rgb24", "-f", "rawvideo", "-"], binary=True).stdout
    p = json.loads(sh(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", ref]).stdout)["streams"][0]
    h = int(round(p["height"] * SAMPLE_W / p["width"] / 2) * 2)
    fr = SAMPLE_W * h * 3
    n = len(raw) // fr
    return np.frombuffer(raw[: n * fr], np.uint8).reshape(n, h, SAMPLE_W, 3).astype(np.float32)


def kmeans(px, k=5, it=10):
    rng = np.random.RandomState(0)
    c = px[rng.choice(len(px), k, replace=False)]
    for _ in range(it):
        lab = np.argmin(((px[:, None, :] - c[None]) ** 2).sum(-1), 1)
        c = np.array([px[lab == i].mean(0) if (lab == i).any() else c[i] for i in range(k)])
    share = np.bincount(lab, minlength=k) / len(lab)
    order = np.argsort(-share)
    return [("#%02X%02X%02X" % tuple(int(v) for v in c[i]), r3(share[i])) for i in order]


def look_stats(F):
    gray = F @ np.array([0.299, 0.587, 0.114], np.float32)
    mx, mn = F.max(-1), F.min(-1)
    sat = np.where(mx > 1, (mx - mn) / np.maximum(mx, 1), 0)
    px = F[:, ::3, ::3].reshape(-1, 3)
    px = px[np.random.RandomState(1).choice(len(px), min(len(px), 12000), replace=False)]
    pal = kmeans(px)
    vivid = sorted(pal, key=lambda c: -(max(int(c[0][1:3], 16), int(c[0][3:5], 16), int(c[0][5:7], 16)) - min(int(c[0][1:3], 16), int(c[0][3:5], 16), int(c[0][5:7], 16))))
    return {"luma": r3(gray.mean()), "contrast": r3(gray.std()), "blacks_p5": r3(np.percentile(gray, 5)), "whites_p95": r3(np.percentile(gray, 95)),
            "saturation": r3(sat.mean()), "warmth": r3(F[..., 0].mean() - F[..., 2].mean()), "palette": pal, "accent_guess": vivid[0][0],
            "bw": bool(sat.mean() < 0.05)}


def motion_stats(F, cuts):
    gray = F @ np.array([0.299, 0.587, 0.114], np.float32)
    d = np.abs(np.diff(gray, axis=0)).mean(axis=(1, 2))
    t = (np.arange(len(d)) + 1) / SAMPLE_FPS
    keep = np.array([min([abs(x - c) for c in cuts] + [9]) > 0.3 for x in t]) if len(d) else np.array([])
    dd = d[keep] if keep.any() else d
    per_sec = [r3(dd[i:i + SAMPLE_FPS].mean()) for i in range(0, len(dd), SAMPLE_FPS)] if len(dd) else []
    m = float(dd.mean()) if len(dd) else 0.0
    return {"mean": r3(m), "p90": r3(np.percentile(dd, 90)) if len(dd) else 0, "per_sec": per_sec[:240],
            "level": "high" if m > 9 else "medium" if m > 4 else "low", "unit": "mean abs luma change between samples at 4 fps (0-255), cuts excluded"}


BANDS = [("top", 0.0, 0.18), ("upper", 0.18, 0.42), ("middle", 0.42, 0.62), ("lower", 0.62, 0.82), ("bottom", 0.82, 1.0)]


def text_stats(F):
    """Caption/on-screen text heuristic: dense sharp horizontal edges in a band, and how often that band changes."""
    gray = F @ np.array([0.299, 0.587, 0.114], np.float32)
    gx = np.abs(np.diff(gray, axis=2))
    strong = gx > 60
    H = gray.shape[1]
    out = {}
    for name, a, b in BANDS:
        y0, y1 = int(a * H), int(b * H)
        dens = strong[:, y0:y1].mean(axis=(1, 2))
        on = dens > 0.035
        bandmap = (strong[:, y0:y1, :]).astype(np.float32)
        change = np.abs(np.diff(bandmap, axis=0)).mean(axis=(1, 2)) if len(bandmap) > 1 else np.array([0])
        changes = int((change > 0.02).sum())
        out[name] = {"density": r3(np.median(dens)), "text_like_share": r3(on.mean()), "changes_per_sec": r3(changes / max(1, len(F)) * SAMPLE_FPS)}
    best = max(out, key=lambda k: out[k]["text_like_share"] * (1 + out[k]["changes_per_sec"]))
    out["_guess"] = {"band": best if out[best]["text_like_share"] > 0.25 else None,
                     "note": "تقدير من حواف حادة أفقية — يميّز وين يقعد النص غالباً، مو يقرأه. أكّد بعينك من الفريمات."}
    return out


def audio_stats(ref, has_audio):
    if not has_audio: return {"present": False}
    err = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", ref, "-vn", "-af", "ebur128=peak=true,silencedetect=noise=-35dB:d=0.3", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    I = re.findall(r"I:\s+(-?[0-9.]+) LUFS", err); LRA = re.findall(r"LRA:\s+([0-9.]+) LU", err)
    sil = sum(float(x) for x in re.findall(r"silence_duration: ([0-9.]+)", err))
    return {"present": True, "integrated_lufs": float(I[-1]) if I else None, "lra": float(LRA[-1]) if LRA else None, "silence_seconds": r3(sil),
            "note": "ما أگدر أسمع: الموسيقى والمؤثرات وأين تنحط مجهولة — اسأل صانع المحتوى عن اللحظات المهمة."}


def frames_at(ref, times, folder, w=360):
    os.makedirs(folder, exist_ok=True)
    out = []
    for t in times:
        p = os.path.join(folder, f"t{t:07.2f}.jpg")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{max(0, t):.3f}", "-i", ref, "-frames:v", "1", "-vf", f"scale={w}:-2", "-q:v", "4", p])
        if os.path.exists(p): out.append(p)
    return out


def contact_sheet(paths, times, dest, cols=4):
    ims = [Image.open(p).convert("RGB") for p in paths]
    if not ims: return None
    w, h = ims[0].size
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * w, rows * h), "black")
    dr = ImageDraw.Draw(sheet)
    for i, (im, t) in enumerate(zip(ims, times)):
        x, y = (i % cols) * w, (i // cols) * h
        sheet.paste(im.resize((w, h)), (x, y))
        dr.rectangle([x, y, x + 74, y + 18], fill="black"); dr.text((x + 4, y + 3), tc(t), fill="white")
    sheet.save(dest, quality=85)
    with open(dest + ".times.json", "w") as f: json.dump([r3(t) for t in times], f)
    return dest


# ── analyze ──────────────────────────────────────────────────────────────────

def analyze(ref, out, rid):
    if not os.path.exists(ref): raise SystemExit("❌ الملف مو موجود: " + ref)
    A = os.path.join(out, "style-analysis", rid)
    os.makedirs(A, exist_ok=True)
    pr = probe(ref); dur = pr["duration"]
    strong, weak = scene_cuts(ref, 0.25), scene_cuts(ref, 0.10)
    shots = np.diff([0.0] + strong + [dur]) if dur else np.array([dur])
    cuts = {"strong_th": 0.25, "weak_th": 0.10, "strong": strong, "weak": [t for t in weak if min([abs(t - s) for s in strong] + [9]) > 0.15],
            "shots": len(shots), "shot_mean": r3(shots.mean()), "shot_median": r3(np.median(shots)), "shot_min": r3(shots.min()), "shot_max": r3(shots.max()),
            "cuts_per_min": r3(len(strong) / max(dur, 1e-6) * 60), "first_cut": strong[0] if strong else None,
            "note": "المرشّحات من كاشف المشاهد — قطع؟ زوم؟ انتقال؟ قناع؟ شيّك الفريمات حوالي كل وحدة قبل ما تسمّيها."}
    F = sample_frames(ref, dur)
    look, motion, text = look_stats(F), motion_stats(F, strong), text_stats(F)
    audio = audio_stats(ref, pr["audio"])
    # الأدلة البصرية: الافتتاح، الوسط، النهاية، وحوالي أول 8 قطعات
    even = [r3(dur * (i + 0.5) / 12) for i in range(12)]
    sheet = contact_sheet(frames_at(ref, even, os.path.join(A, "frames", "sheet")), even, os.path.join(A, "sheet.jpg"))
    opening = frames_at(ref, [x / 2 for x in range(0, int(min(dur, 3) * 2) + 1)], os.path.join(A, "frames", "opening"))
    around = []
    for c in strong[:8]: around += frames_at(ref, [c - 0.12, c + 0.12], os.path.join(A, "frames", f"cut-{c:07.2f}"))
    for name, data in (("probe", pr), ("cuts", cuts), ("look", look), ("motion", motion), ("text", text), ("audio", audio)):
        with open(os.path.join(A, name + ".json"), "w", encoding="utf-8") as f: json.dump(data, f, ensure_ascii=False, indent=1)
    rel = lambda p: os.path.relpath(p, out)
    ev = [
        {"id": f"{rid}-M1", "referenceId": rid, "timecodes": f"00:00.00–{tc(dur)}", "claim": f"{cuts['shots']} لقطة، متوسط اللقطة {cuts['shot_mean']} ث ({cuts['cuts_per_min']} قطع/دقيقة)", "basis": "measured", "confidence": "medium",
         "reason": "كاشف مشاهد بعتبة 0.25 — الزوم القوي والانتقالات ممكن تنحسب قطع", "artifacts": [rel(os.path.join(A, "cuts.json"))], "trait": "uncertain", "exceptions": []},
        {"id": f"{rid}-M2", "referenceId": rid, "timecodes": f"00:00.00–{tc(dur)}", "claim": f"حركة الصورة {motion['level']} (متوسط {motion['mean']})", "basis": "measured", "confidence": "medium",
         "reason": "فرق الإضاءة بين عينات 4 بالثانية — ما يفرّق حركة الكاميرا عن حركة الشخص أو الموشن", "artifacts": [rel(os.path.join(A, "motion.json"))], "trait": "uncertain", "exceptions": []},
        {"id": f"{rid}-M3", "referenceId": rid, "timecodes": f"00:00.00–{tc(dur)}", "claim": f"الشكل: إضاءة {look['luma']} · تباين {look['contrast']} · تشبّع {look['saturation']} · دفء {look['warmth']}{' · أبيض وأسود' if look['bw'] else ''}",
         "basis": "measured", "confidence": "high", "reason": "متوسط على كل العينات", "artifacts": [rel(os.path.join(A, "look.json")), rel(sheet) if sheet else None], "trait": "adaptive", "exceptions": []},
        {"id": f"{rid}-M4", "referenceId": rid, "timecodes": f"00:00.00–{tc(dur)}", "claim": f"نص على الشاشة غالباً بشريط «{text['_guess']['band']}»" if text["_guess"]["band"] else "ما بان نص ثابت واضح (ممكن بلا كابشن)",
         "basis": "measured", "confidence": "low", "reason": text["_guess"]["note"], "artifacts": [rel(os.path.join(A, "text.json"))], "trait": "uncertain", "exceptions": []},
    ]
    if audio.get("present"):
        ev.append({"id": f"{rid}-M5", "referenceId": rid, "timecodes": f"00:00.00–{tc(dur)}", "claim": f"العلو {audio['integrated_lufs']} LUFS، سكوت {audio['silence_seconds']} ث", "basis": "measured",
                   "confidence": "high", "reason": audio["note"], "artifacts": [rel(os.path.join(A, "audio.json"))], "trait": "uncertain", "exceptions": []})
    dna_path = os.path.join(out, "STYLE_DNA.json")
    dna = json.load(open(dna_path, encoding="utf-8")) if os.path.exists(dna_path) else None
    if dna and dna.get("status") == "accepted":
        shutil.copy(dna_path, dna_path + ".rev-%d" % len([f for f in os.listdir(out) if f.startswith("STYLE_DNA.json.rev-")]))
    if not dna:
        dna = {"version": 1, "status": "draft", "baseStyle": None, "scope": "هالمشروع بس — بصمة الأسلوب مو اللقطات. المرجع يبقى كما هو، وما ينستخدم منه أي لقطة أو صوت أو نص.",
               "references": [], "evidence": [], "measured": {}, "observedInvariants": [], "adaptiveVariables": [], "uncertainTraits": [],
               "applicationLogic": [], "antiPatterns": [], "limitations": [], "sampleReview": {"status": "not-reviewed"}, "engine": {}}
    dna["references"] = [r for r in dna["references"] if r.get("id") != rid] + [{"id": rid, "path": pr["file"], "sha256": pr["sha256"], "inspected": f"00:00.00–{tc(dur)}",
                                                                                "role": "style-reference (مو لقطات مرخّصة)", "limitations": []}]
    dna["evidence"] = [e for e in dna["evidence"] if e.get("referenceId") != rid] + ev
    dna["measured"][rid] = {"probe": pr, "cuts": {k: cuts[k] for k in ("shots", "shot_mean", "shot_median", "cuts_per_min", "first_cut")},
                            "motion": {k: motion[k] for k in ("mean", "p90", "level")}, "look": {k: look[k] for k in ("luma", "contrast", "blacks_p5", "saturation", "warmth", "bw", "palette", "accent_guess")},
                            "text": text, "audio": audio}
    for u in ("الصوت والمؤثرات: ما أگدر أسمع — اسأل صانع المحتوى شنو يسوي الصوت باللحظات المهمة، أو خلّه «مجهول».",
              "التوقيت الدقيق للحركة (easing): ما ينعرف من فريمين — شوف الفريمات حول كل قطع بالتسلسل."):
        if u not in dna["uncertainTraits"]: dna["uncertainTraits"].append(u)
    lim = f"مرجع واحد ({rid}) = اتجاه مبدئي، مو قاعدة ثابتة. أي سمة تتكرر بمرجع ثاني تصير invariant."
    if lim not in dna["limitations"]: dna["limitations"].append(lim)
    with open(dna_path, "w", encoding="utf-8") as f: json.dump(dna, f, ensure_ascii=False, indent=1)
    print(f"✅ تحليل {rid}: {tc(dur)} · {pr['width']}×{pr['height']} · {cuts['shots']} لقطة (متوسط {cuts['shot_mean']} ث) · حركة {motion['level']} · نص «{text['_guess']['band']}»")
    print(f"   الأدلة: {A}")
    print(f"   اقرأ {os.path.join(A, 'sheet.jpg')} وفريمات opening/ وcut-*/ بعينك، واكتب الملاحظات (observedInvariants بأدلة) بـ{dna_path}")
    print(f"   بعدها: python3 {os.path.relpath(__file__)} map {dna_path} --work <مجلد الفيديو>")
    return dna_path


# ── map → محرّكنا ────────────────────────────────────────────────────────────

def nearest_looks(lk):
    try: cat = json.load(open(LOOKS, encoding="utf-8"))["looks"]
    except Exception: return []
    ids = {l["id"] for l in cat}
    want = []
    if lk["bw"]: want += ["noir_soft", "noir_classic"]
    if lk["blacks_p5"] > 35 and lk["contrast"] < 50: want += ["matte_fade", "retro_teal_fade"]
    if lk["warmth"] > 18: want += ["warm_film", "golden_hour"]
    if lk["warmth"] < -10: want += ["cool_film", "tech_cool"]
    if lk["saturation"] > 0.42: want += ["summer_vivid", "pop_contrast"]
    if lk["saturation"] < 0.18 and not lk["bw"]: want += ["documentary", "bleach_bypass"]
    if not want: want = ["natural_plus", "clean_bright"]
    return [w for w in want if w in ids][:3]


def style_candidates(family, lk):
    try: cat = json.load(open(STYLES, encoding="utf-8"))["styles"]
    except Exception: return []
    def score(s):
        sc = 0 if family in s.get("families", []) else 5
        if lk["bw"] and s["id"] in ("archive", "newsprint"): sc -= 3
        if lk["saturation"] > 0.42 and s["id"] in ("riso", "brutal", "stickerToon", "paperCut"): sc -= 2
        if lk["saturation"] < 0.2 and lk["luma"] > 150 and s["id"] in ("keynote", "studio3D", "devCard", "editorial"): sc -= 2
        if lk["warmth"] < -10 and s["id"] in ("blueprint", "terminal", "glassUI"): sc -= 2
        if s.get("moment"): sc += 4
        return sc
    return [{"id": s["id"], "name": s.get("name"), "why": s.get("when") or s.get("desc") or ""} for s in sorted(cat, key=score)[:3]]


def map_dna(dna_path, work=None, apply=False):
    dna = json.load(open(dna_path, encoding="utf-8"))
    ms = list(dna.get("measured", {}).values())
    if not ms: raise SystemExit("❌ البصمة بلا قياسات — شغّل analyze أول")
    shot = float(np.median([m["cuts"]["shot_mean"] for m in ms]))
    dur = float(np.median([m["probe"]["duration"] for m in ms]))
    lvl = [m["motion"]["level"] for m in ms]
    lk = ms[0]["look"]
    tx = ms[0]["text"]
    one_take = all(m["cuts"]["shots"] <= max(1, int(m["probe"]["duration"] // 20)) for m in ms)
    family = "onetake" if one_take else "punch" if shot < 2.5 or lvl.count("high") > len(lvl) / 2 else "calm" if shot > 6 and "high" not in lvl else "editorial"
    band = tx.get("_guess", {}).get("band")
    rate = tx.get(band, {}).get("changes_per_sec", 0) if band else 0
    cap = "card" if not band else "big" if rate > 1.6 else "chunk" if rate > 0.6 else "card"
    engine = {
        "theme": {"capStyle": cap, "capStill": family in ("calm", "onetake") and lvl.count("low") >= len(lvl) / 2, "pace": "calm" if family in ("calm", "onetake") else None},
        "moves": {"family": family, "style_candidates": style_candidates(family, lk),
                  "command": f"python3 scripts/35_moves.py plan --title \"…\" --family {family} --style <id من المرشحين بعد ما تشوف الفريمات>"},
        "caption_position": {"band": band, "hint": None if band in (None, "lower", "bottom") else
                             ("window.CAP_Y_AT = t => 960  // نص الشاشة" if band == "middle" else "window.CAP_Y_AT = t => 520  // فوق — بعيد عن منطقة 0-150 الآمنة")},
        "look": {"suggest": nearest_looks(lk), "rule": "صفر تعديل لوني على صورته إلا بطلب صريح (io-video-editor القاعدة 4) — اعرض قبل/بعد واسأله."},
        "colors": {"palette": lk["palette"], "accent_guess": lk["accent_guess"],
                   "rule": "الهوية من .io/theme.json تبقى. ألوان المرجع للكروت بس إذا طلبها — نتعلّم الأسلوب مو هوية غيرنا."},
        "cut": {"shot_mean_ref": round(shot, 2), "reel_seconds_ref": round(dur, 1),
                "advice": "قطعات/زوم كل ~%.1f ث (كاشف المرجع) — الكلام والسكتات من تسجيله هو، ما نفرض فاصل ثابت." % shot},
    }
    dna["engine"] = engine
    dna["baseStyle"] = dna.get("baseStyle") or (engine["moves"]["style_candidates"][0]["id"] if engine["moves"]["style_candidates"] else None)
    if apply:
        if not work: raise SystemExit("❌ --apply يحتاج --work")
        tp = os.path.join(work, "theme.json")
        th = json.load(open(tp, encoding="utf-8")) if os.path.exists(tp) else {}
        if os.path.exists(tp): shutil.copy(tp, tp + ".bak")
        before = {k: th.get(k) for k in ("capStyle", "capStill", "pace")}
        th["capStyle"] = engine["theme"]["capStyle"]
        if engine["theme"]["capStill"]: th["capStill"] = True
        else: th.pop("capStill", None)
        if engine["theme"]["pace"]: th["pace"] = engine["theme"]["pace"]
        else: th.pop("pace", None)
        json.dump(th, open(tp, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        engine["applied"] = {"work": os.path.abspath(work), "before": before, "after": {k: th.get(k) for k in ("capStyle", "capStill", "pace")}}
    if dna.get("status") == "draft": dna["status"] = "awaiting-review"
    json.dump(dna, open(dna_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"🎛️ العائلة: {family} · capStyle: {cap}{' · capStill' if engine['theme']['capStill'] else ''}{' · pace: calm' if engine['theme']['pace'] else ''}")
    print("🎨 ستايلات مرشحة: " + " · ".join(f"{c['id']} ({c['name']})" for c in engine["moves"]["style_candidates"]))
    print("🎞️ looks (بطلبه بس): " + " · ".join(engine["look"]["suggest"]))
    if engine["caption_position"]["hint"]: print("📍 الكابشن بالمرجع مو تحت: " + engine["caption_position"]["hint"])
    print(("✅ انكتب بـ" + os.path.join(work, "theme.json")) if apply else "ℹ️ ما انكتب شي بالثيم — أضف --apply --work <مجلد> بعد موافقته")
    return engine


def main():
    a = sys.argv[1:]
    if len(a) < 2: raise SystemExit(__doc__)
    opt = lambda k, d=None: a[a.index(k) + 1] if k in a and a.index(k) + 1 < len(a) else d
    if a[0] == "analyze":
        out = opt("--out") or os.getcwd()
        rid = opt("--id") or re.sub(r"[^a-z0-9-]+", "-", os.path.splitext(os.path.basename(a[1]))[0].lower()).strip("-") or "ref"
        analyze(a[1], out, rid)
    elif a[0] == "map":
        map_dna(a[1], opt("--work"), "--apply" in a)
    else:
        raise SystemExit(__doc__)


if __name__ == "__main__":
    main()
