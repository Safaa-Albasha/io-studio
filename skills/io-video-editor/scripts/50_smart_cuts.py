# -*- coding: utf-8 -*-
"""قص ذكي بالكلمة — اقتراحات حشو وتأتأة وإعادة، وختامك المسجّل محمي دائماً.
مأخوذ ومعدّل من Reel Studio (MIT, © 2026 Mohamed Abdou — scripts/lib/auto-cut.mjs): قوائم الحشو حسب اللهجة،
الكلمة اللي لها معنى ما تنقترح إلا جنب سكتة، والختام (signOff) ما ينقص أبداً.

    python 50_smart_cuts.py <work> suggest [--signoff "نشوفكم بالجاي"] [--dialect iraqi] [--protect 12.5-14]
        يقرأ caps.json ويطبع جدول اقتراحات مرقّم (ID ثابت) ويكتب smart_cuts.json. ما يغيّر شي.
    python 50_smart_cuts.py <work> apply 2 5 7 [--dry]
        يشيل الكلمات المعتمدة بس (بأرقام الجدول نفسها) من cut.json وcaps.json وsfx.json — نفس منطق 10_script_edit.py.
        يرفض أي حذف يلمس منطقة محمية. التراجع: python 10_script_edit.py <work> undo

القواعد (لا تُكسر):
- الاقتراح مو قرار: اعرض الجدول على صانع المحتوى بالأرقام نفسها، ولا تنفّذ إلا اللي وافق عليه.
- السكتات يشيلها 01_cut_plan.py — هذا للكلام بس (حشو · كلمة معادة «انا انا» · جملة معادة تجي من 10_script_edit.py dupes).
- الختام: من --signoff أو .io/project.json ← ending.signOff. لو انذكر وما لگيناه بالكلام = تنبيه، والختام غير محمي.
"""
import sys as _sys, builtins as _bi
try:
    _sys.stdout.reconfigure(encoding="utf-8", errors="replace"); _sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass
_real_open = _bi.open
def _utf8_open(f, mode="r", *a, **k):
    if "b" not in mode: k.setdefault("encoding", "utf-8")
    return _real_open(f, mode, *a, **k)
_bi.open = _utf8_open
import json, os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PLUGIN = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
DIALECTS = os.path.join(PLUGIN, "library", "dialects", "dialects.json")
FILLER_PAUSE = 0.20      # ثانية: الكلمة اللي لها معنى تنقترح بس إذا جنبها سكتة بهالطول
STUTTER_GAP = 0.60       # «انا انا»: نفس الكلمة مرتين وبينهم أقل من هذا
PAD = 0.03               # هامش حول الكلمة المحذوفة (ما ياكل الجار)
MIN_SEG = 0.20


def normalize(text):
    t = re.sub(r"[ً-ٰٟـ]", "", str(text))
    t = t.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا").replace("ى", "ي").replace("ة", "ه")
    return t.lower()


def tokens(text):
    return [x for x in re.split(r"[^\w]+", normalize(text)) if x]


def hesitation_key(tok):
    return re.sub(r"(.)\1{2,}", r"\1\1", tok)   # «اممممم» = «امم»


def load_fillers(dialect):
    try:
        f = json.load(open(DIALECTS))["fillers"]
    except Exception:
        return []
    out, seen = [], set()
    for group in ("common", dialect or ""):
        for x in f.get(group, []):
            key = tuple(hesitation_key(t) for t in tokens(" ".join(x["tokens"])))
            if key and key not in seen:
                seen.add(key); out.append({"tokens": list(key), "pause": bool(x.get("pause")), "note": x.get("note", "")})
    out.sort(key=lambda x: -len(x["tokens"]))      # الأطول أول («شنو اسمه» قبل «شنو»)
    return out


def flat_words(caps):
    out = []
    for ci, c in enumerate(caps["cards"]):
        for wi, w in enumerate(c["w"]):
            if str(w.get("t", "")).strip():
                out.append({"card": ci, "i": wi, "t": w["t"], "s": float(w["s"]), "e": float(w["e"]), "tok": tokens(w["t"])})
    return out


def find_signoff(words, phrase):
    want = tokens(phrase or "")
    if not want: return None
    flat = [(t, k) for k, w in enumerate(words) for t in w["tok"]]
    for j in range(len(flat) - len(want), -1, -1):
        if all(flat[j + n][0] == want[n] for n in range(len(want))):
            return words[flat[j][1]]["s"]
    return None


def project_hints(work):
    d = os.path.abspath(work)
    for _ in range(6):
        # .io (current); .sky / .safaa = folders from before the renames, until engine/data-dir.js moves them
        p = next((q for q in (os.path.join(d, n, "project.json") for n in (".io", ".sky", ".safaa")) if os.path.exists(q)), "")
        if p:
            try:
                j = json.load(open(p)); return (j.get("ending") or {}).get("signOff"), j.get("dialect")
            except Exception:
                return None, None
        nd = os.path.dirname(d)
        if nd == d: break
        d = nd
    return None, None


def suggest(words, total, fillers, protect):
    guarded = lambda a, b: any(a < g[1] and g[0] < b for g in protect)
    rows, used = [], set()
    k = 0
    while k < len(words):
        hit = None
        for f in fillers:
            n, got = 0, []
            while n < len(words) - k and len(got) < len(f["tokens"]):
                got += [hesitation_key(t) for t in words[k + n]["tok"]]; n += 1
            if got == f["tokens"]:
                hit = (f, n); break
        if hit:
            f, n = hit
            run = words[k:k + n]
            prev = words[k - 1] if k else None
            nxt = words[k + n] if k + n < len(words) else None
            gap_b = run[0]["s"] - prev["e"] if prev else 9
            gap_a = nxt["s"] - run[-1]["e"] if nxt else 9
            ok = (not f["pause"]) or max(gap_b, gap_a) >= FILLER_PAUSE - 1e-9
            if ok and not guarded(run[0]["s"], run[-1]["e"]):
                rows.append({"kind": "filler", "words": [[w["card"], w["i"]] for w in run], "from": run[0]["s"], "to": run[-1]["e"],
                             "text": " ".join(w["t"] for w in run), "detail": f["note"] or "حشو"})
                used.update(range(k, k + n)); k += n; continue
        # تأتأة: نفس الكلمة مرتين ورا بعض (الأولى تنشال)
        if k + 1 < len(words) and k not in used:
            a, b = words[k], words[k + 1]
            if a["tok"] and a["tok"] == b["tok"] and b["s"] - a["e"] <= STUTTER_GAP and not guarded(a["s"], a["e"]):
                rows.append({"kind": "repeat", "words": [[a["card"], a["i"]]], "from": a["s"], "to": a["e"],
                             "text": f'{a["t"]} {b["t"]}', "detail": "نفس الكلمة مرتين — تنشال الأولى"})
                used.add(k)
        k += 1
    rows.sort(key=lambda r: r["from"])
    for i, r in enumerate(rows): r["id"] = i + 1
    return rows


def clock(t):
    return f"{int(t // 60):02d}:{t % 60:05.2f}"


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    W = os.path.abspath(sys.argv[1]); CMD = sys.argv[2]
    argv = sys.argv[3:]
    opt = lambda name: (argv[argv.index(name) + 1] if name in argv and argv.index(name) + 1 < len(argv) else None)
    DRY = "--dry" in argv
    P = lambda n: os.path.join(W, n)
    caps = json.load(open(P("caps.json")))
    words = flat_words(caps)

    if CMD == "suggest":
        so_profile, dia_profile = project_hints(W)
        signoff = opt("--signoff") or so_profile
        dialect = opt("--dialect") or dia_profile or "iraqi"
        protect, warnings = [], []
        for p in [x for x in argv if re.match(r"^\d+(\.\d+)?-\d+(\.\d+)?$", x)] + ([opt("--protect")] if opt("--protect") else []):
            a, b = map(float, p.split("-")); protect.append([a, b])
        so = find_signoff(words, signoff)
        if so is not None: protect.append([so, 1e9])
        elif signoff: warnings.append(f"الختام «{signoff}» مو موجود بالكلام — النهاية غير محمية. شيّك التفريغ أو حدّد --protect من-إلى.")
        rows = suggest(words, caps.get("total", 0), load_fillers(dialect), protect)
        out = {"version": 1, "dialect": dialect, "signoff": signoff, "signoffFrom": so, "protect": protect, "rows": rows, "warnings": warnings,
               "rule": "اقتراحات فقط — تنفَّذ بأرقامها بعد موافقة صانع المحتوى (apply)."}
        json.dump(out, open(P("smart_cuts.json"), "w"), ensure_ascii=False, indent=1)
        print(f"اقتراحات القص الذكي — لهجة {dialect} · {len(words)} كلمة")
        print(f"{'ID':>3}  {'النوع':6}  {'من':>8}  {'إلى':>8}  الكلام (السبب)")
        for r in rows:
            print(f"{r['id']:>3}  {r['kind']:6}  {clock(r['from']):>8}  {clock(r['to']):>8}  «{r['text']}» ({r['detail']})")
        if not rows: print("  ما فيه حشو أو تأتأة واضحة — الكلام نظيف.")
        if so is not None: print(f"🛡️ الختام محمي من {clock(so)} («{signoff}») — ما ينقص منه شي.")
        for w in warnings: print("⚠️ " + w)
        print("الجمل المعادة كاملة: python 10_script_edit.py <work> dupes")
        print("اعرض الجدول عليه بنفس الأرقام، وبعد موافقته:  python 50_smart_cuts.py <work> apply <الأرقام>")
        return

    if CMD != "apply":
        sys.exit("الأوامر: suggest · apply")
    if not os.path.exists(P("smart_cuts.json")):
        sys.exit("❌ شغّل suggest أول")
    sc = json.load(open(P("smart_cuts.json")))
    if sc.get("stale"): sys.exit("❌ الجدول قديم (انطبق قص بعده) — شغّل suggest من جديد وخذ الأرقام الجديدة")
    # the protected ending is found again on the current captions (times move after any cut)
    protect = [g for g in sc.get("protect", []) if g[1] < 1e8]
    so_now = find_signoff(words, sc.get("signoff"))
    if so_now is not None: protect.append([so_now, 1e9])
    ids = [int(x) for x in argv if x.isdigit()]
    rows = {r["id"]: r for r in sc["rows"]}
    bad = [i for i in ids if i not in rows]
    if bad: sys.exit(f"❌ أرقام مو بالجدول: {bad}")
    if not ids: sys.exit("❌ حدّد أرقام الاقتراحات المعتمدة")
    chosen = [rows[i] for i in ids]
    total = float(caps["total"])
    # فترات الحذف على تايملاين الكابشن الحالي — بين نهاية الجار السابق وبداية اللاحق
    flat = flat_words(caps)
    pos = {(w["card"], w["i"]): n for n, w in enumerate(flat)}
    iv, drop_words = [], set()
    for r in chosen:
        ns = [pos[tuple(x)] for x in r["words"] if tuple(x) in pos]
        if not ns: sys.exit(f"❌ الاقتراح {r['id']} ما يطابق caps.json الحالي — أعد suggest")
        first, last = flat[min(ns)], flat[max(ns)]
        prev = flat[min(ns) - 1] if min(ns) > 0 else None
        nxt = flat[max(ns) + 1] if max(ns) + 1 < len(flat) else None
        a = max(prev["e"] if prev else 0.0, first["s"] - PAD)
        b = min(nxt["s"] if nxt else total, last["e"] + PAD)
        for g in protect:
            if a < g[1] and g[0] < b: sys.exit(f"❌ الاقتراح {r['id']} يلمس منطقة محمية (الختام) — ما ينشال.")
        if b > a: iv.append([a, b])
        drop_words.update(tuple(x) for x in r["words"])
    iv.sort(); merged = []
    for a, b in iv:
        if merged and a - merged[-1][1] < 0.02: merged[-1][1] = max(merged[-1][1], b)
        else: merged.append([a, b])
    gone = sum(b - a for a, b in merged)
    shift = lambda t: t - sum(min(t, b) - a for a, b in merged if a < t)
    inside = lambda t: any(a - 1e-6 <= t <= b + 1e-6 for a, b in merged)
    print("راح ينشال:")
    for r in chosen: print(f"  ✂️ {r['id']}: «{r['text']}» ({clock(r['from'])})")
    print(f"المدة: {total:.2f} → {total - gone:.2f} ثانية (‎-{gone:.2f})")
    if DRY: return

    def save(n, d):
        if os.path.exists(P(n)):
            if not os.path.exists(P(n + ".orig")): shutil.copy(P(n), P(n + ".orig"))
            shutil.copy(P(n), P(n + ".bak"))
        json.dump(d, open(P(n), "w"), ensure_ascii=False, indent=1)

    # 1) cut.json — نفس تحويل 10_script_edit.py (زمن الكابشن ← زمن الأصل)
    cut = json.load(open(P("cut.json"))); keep = [list(x) for x in cut["keep"]]
    off, acc = [], 0.0
    for a, b in keep: off.append(acc); acc += b - a
    src_del = []
    for ds, de in merged:
        for i, (a, b) in enumerate(keep):
            s0, s1 = off[i], off[i] + (b - a)
            lo, hi = max(ds, s0), min(de, s1)
            if hi > lo: src_del.append([a + (lo - s0), a + (hi - s0)])
    new_keep = []
    for a, b in keep:
        parts = [[a, b]]
        for ds, de in src_del:
            o = []
            for x, y in parts:
                if de <= x or ds >= y: o.append([x, y]); continue
                if ds > x: o.append([x, ds])
                if de < y: o.append([de, y])
            parts = o
        new_keep += [p for p in parts if p[1] - p[0] >= MIN_SEG]
    cut["keep"] = new_keep
    cut["total"] = round(sum(b - a for a, b in new_keep), 3)
    save("cut.json", cut)
    # 2) caps.json — الكلمات المعتمدة تنشال، والباقي ينزاح
    cards = []
    for ci, c in enumerate(caps["cards"]):
        ws = [{**w, "s": round(shift(w["s"]), 3), "e": round(shift(w["e"]), 3)} for wi, w in enumerate(c["w"]) if (ci, wi) not in drop_words]
        if ws: cards.append({**c, "s": round(shift(c["s"]), 3), "e": round(shift(c["e"]), 3), "w": ws})
    for i in range(len(cards) - 1):
        if cards[i]["e"] > cards[i + 1]["s"]: cards[i]["e"] = round(cards[i + 1]["s"] - 0.02, 3)
    new_total = round(min(total - gone, cut["total"] + float(cut.get("tail", 0) or 0)), 3)
    save("caps.json", {**caps, "total": new_total, "cards": cards})
    # 3) sfx.json
    if os.path.exists(P("sfx.json")):
        sfx = json.load(open(P("sfx.json")))
        for k, v in list(sfx.items()):
            if isinstance(v, list) and all(isinstance(t, (int, float)) for t in v):
                sfx[k] = [round(shift(t), 3) for t in v if not inside(t)]
            elif k == "lib" and isinstance(v, list):
                sfx[k] = [[x[0], round(shift(x[1]), 3)] + list(x[2:]) for x in v if isinstance(x, list) and len(x) >= 2 and not inside(x[1])]
        save("sfx.json", sfx)
    sc["applied"] = sorted(set(sc.get("applied", []) + ids))
    sc["stale"] = True                                   # times shifted: the next apply needs a fresh suggest
    json.dump(sc, open(P("smart_cuts.json"), "w"), ensure_ascii=False, indent=1)
    print(f"""✅ تم. أعد بناء الفيديو:
   python scripts/03_cut_zoom.py {W}
   mkdir -p {W}/vfr && ffmpeg -v error -i {W}/cutz.mp4 -vf fps=30 -q:v 3 -y {W}/vfr/%05d.jpg
   node scripts/04_render_frames.js {W} all --force
↩️ للتراجع: python scripts/10_script_edit.py {W} undo""")


if __name__ == "__main__":
    main()
