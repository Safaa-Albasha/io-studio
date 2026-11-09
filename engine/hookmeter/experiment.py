#!/usr/bin/env python3
"""مقياس الهوك — تجربة المعايرة على أرقام صانع المحتوى الحقيقية.

Hook-meter calibration experiment. Scores the first N seconds of each reel with
every available scorer, then checks (Spearman rank correlation + permutation
p-value) whether any score moves with the creator's REAL Instagram numbers.

    python3 engine/hookmeter/experiment.py run --reels reels/ --metrics metrics.csv --out hookmeter-out
    python3 engine/hookmeter/experiment.py run ... --calibration .io/hook-calibration.json
    python3 engine/hookmeter/experiment.py check new-reel.mp4 --calibration .io/hook-calibration.json
    python3 engine/hookmeter/experiment.py template > metrics.csv

metrics.csv columns (Arabic or English headers; see README.md):
    file, skip_rate | hold_3s, avg_watch_sec, duration_sec, views, reach  [, post_id, url]
Only `file` is required; every metric you add is tested.
"""
from __future__ import annotations

import argparse
import csv
import datetime as _dt
import json
import math
import os
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import hm_stats  # noqa: E402
from scorers import ALL as SCORERS  # noqa: E402

# ---------------------------------------------------------------- metrics I/O
METRIC_ALIASES = {
    "file": ["file", "filename", "video", "reel", "الملف", "اسم الملف", "المقطع", "الفيديو"],
    "skip_rate": ["skip rate", "skip_rate", "skip", "skip %", "skip rate %", "نسبة التخطي", "معدل التخطي", "التخطي"],
    "hold_3s": ["hold_3s", "3s hold", "2s/3s hold", "3 second hold", "3-second views %", "hold", "hold %",
                "نسبة البقاء 3 ثواني", "البقاء", "نسبة البقاء"],
    "avg_watch_sec": ["avg_watch_sec", "average watch time", "avg watch time", "avg watch", "average watch time sec",
                      "متوسط وقت المشاهدة", "متوسط المشاهدة"],
    "duration_sec": ["duration_sec", "duration", "length", "المدة", "مدة المقطع"],
    "views": ["views", "plays", "total plays", "المشاهدات", "مشاهدات"],
    "reach": ["reach", "accounts reached", "الوصول", "الحسابات التي تم الوصول إليها"],
    "post_id": ["post_id", "post id", "id", "media id", "معرف المنشور"],
    "url": ["url", "permalink", "link", "الرابط"],
}

METRIC_LABELS = {
    "hold_pct": "نسبة البقاء بعد أول ثواني %",
    "avg_watch_sec": "متوسط وقت المشاهدة (ث)",
    "avg_watch_pct": "متوسط المشاهدة من طول المقطع %",
    "views": "المشاهدات",
    "reach": "الوصول",
}
TESTED_METRICS = list(METRIC_LABELS)


def _norm(h: str) -> str:
    return re.sub(r"[\s_\-\(\)\[\]/:]+", " ", str(h).strip().lower()).strip()


def _num(v):
    if v is None:
        return None
    s = str(v).strip().replace("٬", "").replace(",", "").replace("%", "")
    s = s.translate(str.maketrans("٠١٢٣٤٥٦٧٨٩٫", "0123456789."))
    if not s:
        return None
    m = re.fullmatch(r"(?:(\d+):)?(\d+(?:\.\d+)?)", s)  # 0:07 style durations
    if m and m.group(1):
        return int(m.group(1)) * 60 + float(m.group(2))
    try:
        return float(s)
    except ValueError:
        mult = 1
        if s[-1:].lower() == "k":
            mult, s = 1000, s[:-1]
        elif s[-1:].lower() == "m":
            mult, s = 1_000_000, s[:-1]
        try:
            return float(s) * mult
        except ValueError:
            return None


def read_metrics(path: str) -> list[dict]:
    with open(path, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.reader(f))
    rows = [r for r in rows if any(c.strip() for c in r) and not r[0].lstrip().startswith("#")]
    if not rows:
        return []
    lookup = {_norm(a): k for k, al in METRIC_ALIASES.items() for a in al}
    header = [lookup.get(_norm(h)) for h in rows[0]]
    if "file" not in header:
        raise SystemExit("metrics.csv لازم يحتوي عمود file (اسم ملف المقطع)")
    out = []
    for r in rows[1:]:
        rec = {}
        for k, v in zip(header, r):
            if k and k not in rec:
                rec[k] = v.strip()
        if not rec.get("file"):
            continue
        for k in ("skip_rate", "hold_3s", "avg_watch_sec", "duration_sec", "views", "reach"):
            rec[k] = _num(rec.get(k))
        out.append(rec)
    return out


def merge_stats_json(rows: list[dict], stats_path: str) -> int:
    """Fill views/reach/avg watch/duration from I/O Studio's .io/stats.json (engine/stats.js import)."""
    j = json.loads(Path(stats_path).read_text(encoding="utf-8"))
    posts = (j.get("accounts", {}).get("instagram", {}) or {}).get("posts", [])
    by_id = {str(p.get("id")): p for p in posts if p.get("id")}
    by_url = {str(p.get("url")).rstrip("/"): p for p in posts if p.get("url")}
    n = 0
    for r in rows:
        p = by_id.get(str(r.get("post_id") or "")) or by_url.get(str(r.get("url") or "").rstrip("/"))
        if not p:
            continue
        n += 1
        for src, dst in (("views", "views"), ("reach", "reach"), ("durationSec", "duration_sec")):
            if r.get(dst) is None and p.get(src):
                r[dst] = float(p[src])
        if r.get("avg_watch_sec") is None and p.get("watchSec") and p.get("views"):
            r["avg_watch_sec"] = float(p["watchSec"]) / float(p["views"])
    return n


def derive(rec: dict) -> dict:
    m = {k: None for k in TESTED_METRICS}
    if rec.get("hold_3s") is not None:
        m["hold_pct"] = rec["hold_3s"]
    elif rec.get("skip_rate") is not None:
        m["hold_pct"] = 100.0 - rec["skip_rate"]
    m["avg_watch_sec"] = rec.get("avg_watch_sec")
    if rec.get("avg_watch_sec") is not None and rec.get("duration_sec"):
        m["avg_watch_pct"] = 100.0 * rec["avg_watch_sec"] / rec["duration_sec"]
    m["views"] = rec.get("views")
    m["reach"] = rec.get("reach")
    return m


def _duration(path: str):
    try:
        out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                             capture_output=True, text=True, check=True).stdout.strip()
        return float(out)
    except Exception:
        return None


# ---------------------------------------------------------------- scoring
def run_scorers(video: str, names: list[str], seconds: float, lang: str | None, cache: dict, log) -> dict:
    feats: dict = {}
    extras: dict = {}
    st = os.stat(video)
    for name in names:
        key = f"{name}|{os.path.abspath(video)}|{st.st_size}|{int(st.st_mtime)}|{seconds}|{lang}"
        if key in cache:
            res = cache[key]
        else:
            log(f"  · {name} …")
            try:
                res = SCORERS[name].score(video, seconds=seconds, lang=lang)
            except Exception as e:  # keep going; one broken scorer must not kill the run
                log(f"    ✗ {name}: {e}")
                continue
            cache[key] = res
        for k, v in res["scores"].items():
            feats[f"{name}.{k}"] = v
        extras[name] = res.get("extra", {})
    return {"features": feats, "extra": extras}


def read_extra_scores(path: str) -> dict:
    """External per-reel scores (e.g. SnapUGC run elsewhere): file,<score columns…>."""
    out = {}
    with open(path, newline="", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            name = r.pop("file", None)
            if name:
                out[name] = {f"external.{k}": _num(v) for k, v in r.items() if k}
    return out


# ---------------------------------------------------------------- analysis
def analyse(table: list[dict], n_perm: int) -> list[dict]:
    feats = sorted({k for row in table for k in row["features"]})
    tests = []
    for f in feats:
        xs = [row["features"].get(f) for row in table]
        if len({x for x in xs if x is not None}) < 2:
            continue  # constant / empty feature
        for m in TESTED_METRICS:
            ys = [row["metrics"].get(m) for row in table]
            rho, n = hm_stats.spearman(xs, ys)
            if rho is None:
                continue
            tests.append({"feature": f, "metric": m, "rho": rho, "n": n,
                          "p": hm_stats.permutation_p(xs, ys, n_perm=n_perm)})
    qs = hm_stats.benjamini_hochberg([t["p"] for t in tests])
    for t, q in zip(tests, qs):
        t["q"] = q
    return tests


def feature_label(fkey: str) -> str:
    scorer, _, feat = fkey.partition(".")
    mod = SCORERS.get(scorer)
    if mod and feat in getattr(mod, "FEATURES", {}):
        return mod.FEATURES[feat][0]
    return feat


def classify(t: dict) -> str:
    n, r, q = t["n"], abs(t["rho"]), t.get("q")
    if n < 10:
        return "استكشافي"
    if n >= 20 and q is not None and q < 0.1 and r >= 0.4:
        return "واعد"
    if r >= 0.5 and t["p"] is not None and t["p"] < 0.05:
        return "مؤشر أولي"
    return "لا علاقة واضحة"


def verdict_ar(table: list[dict], tests: list[dict], seconds: float, unavailable: dict) -> str:
    n = len(table)
    L = []
    L.append(f"# مقياس الهوك — نتيجة التجربة ({n} مقاطع، أول {seconds:g} ثواني)\n")
    if n < 10:
        L.append(f"> **تنبيه مهم:** مع {n} مقاطع بس، الأرقام هنا **ما لها معنى إحصائي**. "
                 f"حتى لو الترتيب تطابق 100% (ρ = ±1)، أصغر p-value ممكنة = {hm_stats.min_possible_p(n):.3f}، "
                 "ومع عشرات المقارنات بنفس الوقت بعضها راح يطلع «قوي» بالصدفة. "
                 "نحتاج **20–30 مقطع على الأقل** من نفس الحساب قبل ما نعتمد أي رقم.\n")
    elif n < 20:
        L.append(f"> العينة ({n}) صغيرة: النتائج **أولية**. الأفضل 20–30 مقطع.\n")
    need = hm_stats.rho_needed(n)
    if need:
        L.append(f"مع {n} مقطع، الارتباط لازم يكون تقريباً |ρ| ≥ {need:.2f} حتى يعتبر غير صدفة (p<0.05، اختبار واحد).\n")
    if unavailable:
        L.append("**مقاييس ما اشتغلت:** " + "؛ ".join(f"{k}: {v}" for k, v in unavailable.items()) + "\n")
    tested = len(tests)
    if tested:
        L.append(f"اختبرنا {tested} علاقة (مقياس × رقم إنستقرام). بالصدفة وحدها نتوقع ~{tested * 0.05:.0f} منها تطلع p<0.05 — "
                 "لهذا نعرض q (تصحيح المقارنات المتعددة).\n")

    # best per family
    fams: dict = {}
    for t in tests:
        fam = t["feature"].split(".")[0]
        if fam not in fams or abs(t["rho"]) > abs(fams[fam]["rho"]):
            fams[fam] = t
    if fams:
        L.append("## أقوى علاقة لكل مقياس\n")
        for fam, t in fams.items():
            direction = "كل ما زاد، زاد" if t["rho"] > 0 else "كل ما زاد، قلّ"
            L.append(f"- **{fam}** — «{feature_label(t['feature'])}»: {direction} «{METRIC_LABELS[t['metric']]}» "
                     f"(ρ = {t['rho']:+.2f}، p = {t['p']:.3f}، q = {t['q']:.2f}، n = {t['n']}) → **{classify(t)}**")
        L.append("")

    L.append("## الحكم\n")
    base_tests = [t for t in tests if t["feature"].startswith("baseline.")]
    promising = [t for t in tests if classify(t) == "واعد"]
    if n < 20:
        L.append("- **لا يمكن الحكم بعد.** هذي تجربة لفحص إن الأنبوب يشتغل وشكل النتائج، مو دليل إن أي مقياس يتنبأ بأدائك.")
    elif promising:
        L.append("- مقاييس **واعدة** على حسابك: " + "، ".join(f"«{feature_label(t['feature'])}» ↔ «{METRIC_LABELS[t['metric']]}»" for t in promising))
        L.append("- هذا ارتباط مو سبب. جرّبها: غيّر شي واحد بالهوك وراقب الرقم بالمقاطع الجاية.")
    else:
        L.append("- ولا مقياس طلع له علاقة ثابتة بأرقامك. هذا بحد ذاته نتيجة: لا تعتمد على أي «درجة هوك» آلية لحسابك.")
    L.append("\n_تذكير: الحقيقة الوحيدة هي أرقامك أنت._")
    return "\n".join(L)


def fmt(v, d=2):
    if v is None:
        return "—"
    if isinstance(v, float):
        return f"{v:,.0f}" if (abs(v) >= 1000 and v == int(v)) or abs(v) >= 1e5 else f"{v:.{d}f}"
    return str(v)


def table_md(table: list[dict], tests: list[dict]) -> str:
    feats = sorted({k for row in table for k in row["features"]})
    L = ["## الجدول\n", "| المقطع | " + " | ".join(METRIC_LABELS[m] for m in TESTED_METRICS) + " |",
         "|---|" + "---|" * len(TESTED_METRICS)]
    for row in table:
        L.append(f"| {row['file']} | " + " | ".join(fmt(row["metrics"].get(m), 1) for m in TESTED_METRICS) + " |")
    L += ["", "| المقياس | " + " | ".join(r["file"] for r in table) + " |", "|---|" + "---|" * len(table)]
    for f in feats:
        L.append(f"| {f} | " + " | ".join(fmt(r["features"].get(f), 3) for r in table) + " |")
    if tests:
        L += ["", "## كل الارتباطات (Spearman)\n", "| المقياس | الرقم | ρ | p | q | n | التصنيف |", "|---|---|---|---|---|---|---|"]
        for t in sorted(tests, key=lambda t: -abs(t["rho"])):
            L.append(f"| {t['feature']} | {METRIC_LABELS[t['metric']]} | {t['rho']:+.2f} | {fmt(t['p'], 3)} | {fmt(t['q'], 2)} | {t['n']} | {classify(t)} |")
    return "\n".join(L)


# ---------------------------------------------------------------- commands
def resolve_scorers(spec: str | None, log) -> tuple[list[str], dict]:
    wanted = [s.strip() for s in spec.split(",")] if spec else list(SCORERS)
    use, skipped = [], {}
    for name in wanted:
        if name not in SCORERS:
            raise SystemExit(f"مقياس غير معروف: {name} (المتاح: {', '.join(SCORERS)})")
        ok, why = SCORERS[name].available()
        if ok:
            use.append(name)
        else:
            skipped[name] = why
            log(f"↷ {name}: {why}")
    return use, skipped


def cmd_run(a) -> int:
    log = (lambda *x: None) if a.quiet else (lambda *x: print(*x, file=sys.stderr))
    rows = read_metrics(a.metrics)
    if a.stats:
        log(f"stats.json: ربطنا {merge_stats_json(rows, a.stats)} مقطع")
    use, skipped = resolve_scorers(a.scorers, log)
    extra_scores = read_extra_scores(a.extra_scores) if a.extra_scores else {}
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    cache_file = out / "scores-cache.json"
    cache = json.loads(cache_file.read_text()) if cache_file.exists() else {}
    table = []
    for rec in rows:
        video = rec["file"] if os.path.isabs(rec["file"]) else os.path.join(a.reels, rec["file"])
        if not os.path.exists(video):
            log(f"✗ ما لگيت {video} — تخطيناه")
            continue
        if rec.get("duration_sec") is None:
            rec["duration_sec"] = _duration(video)
        log(f"▶ {rec['file']}")
        sc = run_scorers(video, use, a.seconds, None if a.lang == "auto" else a.lang, cache, log)
        cache_file.write_text(json.dumps(cache, ensure_ascii=False))
        sc["features"].update(extra_scores.get(rec["file"], {}))
        table.append({"file": rec["file"], "metrics": derive(rec), **sc})
    if not table:
        raise SystemExit("ولا مقطع انقرا — تأكد من أسماء الملفات بعمود file")
    tests = analyse(table, a.permutations)
    report = verdict_ar(table, tests, a.seconds, skipped) + "\n\n" + table_md(table, tests)
    if a.demo_label:
        report = f"> ⚠️ **{a.demo_label}**\n\n" + report
    (out / "report.md").write_text(report, encoding="utf-8")
    with open(out / "results.csv", "w", newline="", encoding="utf-8") as f:
        feats = sorted({k for r in table for k in r["features"]})
        w = csv.writer(f)
        w.writerow(["file"] + TESTED_METRICS + feats)
        for r in table:
            w.writerow([r["file"]] + [r["metrics"].get(m) for m in TESTED_METRICS] + [r["features"].get(k) for k in feats])
    with open(out / "correlations.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["feature", "metric", "rho", "p", "q", "n", "class"])
        for t in tests:
            w.writerow([t["feature"], t["metric"], round(t["rho"], 4), t["p"], t["q"], t["n"], classify(t)])
    payload = {"created": _dt.datetime.now().isoformat(timespec="seconds"), "seconds": a.seconds,
               "n_reels": len(table), "scorers": use, "skipped": skipped, "demo": bool(a.demo_label),
               "reels": table, "tests": [{**t, "class": classify(t)} for t in tests]}
    (out / "report.json").write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
    if a.calibration:
        cal = Path(a.calibration)
        cal.parent.mkdir(parents=True, exist_ok=True)
        cal.write_text(json.dumps({**payload, "kind": "io-hook-calibration", "version": 1}, ensure_ascii=False, indent=1),
                       encoding="utf-8")
        log(f"✓ ملف المعايرة: {cal}")
    print(report)
    log(f"\n✓ النتائج: {out}/report.md · results.csv · correlations.csv · report.json")
    return 0


def cmd_check(a) -> int:
    """Score one new reel and place it among the creator's own past reels (percentiles)."""
    cal = json.loads(Path(a.calibration).read_text(encoding="utf-8"))
    if cal.get("demo"):
        print("⚠️ ملف المعايرة مبني على بيانات تجريبية مزيفة — النتيجة للعرض فقط.")
    use, skipped = resolve_scorers(",".join(cal.get("scorers", [])) or None, lambda *x: print(*x, file=sys.stderr))
    sc = run_scorers(a.video, use, cal["seconds"], None if a.lang == "auto" else a.lang, {}, lambda *x: print(*x, file=sys.stderr))
    useful = {}
    for t in cal.get("tests", []):
        if t["class"] in ("واعد", "مؤشر أولي"):
            if t["feature"] not in useful or abs(t["rho"]) > abs(useful[t["feature"]]["rho"]):
                useful[t["feature"]] = t
    print(f"# فحص الهوك: {os.path.basename(a.video)} (مقارنة بـ {cal['n_reels']} مقطع سابق لك)\n")
    if not useful:
        print("ما عندك بعد مقياس «واعد» بالمعايرة، فما نگدر نگول إذا الهوك أقوى أو أضعف. "
              "هذي القيم الخام للمرجع فقط:\n")
    for f, v in sorted(sc["features"].items()):
        past = [r["features"].get(f) for r in cal["reels"] if r["features"].get(f) is not None]
        pct = None
        if v is not None and past:
            pct = 100.0 * sum(1 for p in past if p < v) / len(past)
        tag = ""
        if f in useful:
            t = useful[f]
            better = (pct is not None) and ((pct >= 50) == (t["rho"] > 0))
            tag = (f" ← مرتبط بـ«{METRIC_LABELS[t['metric']]}» (ρ={t['rho']:+.2f}, {t['class']})"
                   f" → {'أفضل' if better else 'أضعف'} من نص مقاطعك")
        print(f"- {f} ({feature_label(f)}): {fmt(v, 3)}" + (f" · أعلى من {pct:.0f}% من مقاطعك" if pct is not None else "") + tag)
    return 0


TEMPLATE = """file,hold_3s,skip_rate,avg_watch_sec,duration_sec,views,reach,post_id,url
# مثال — احذف هذا السطر: reel1.mp4,62,38,7.4,31,12500,9800,,https://www.instagram.com/reel/XXXX/
"""


def main(argv=None) -> int:
    p = argparse.ArgumentParser(
        prog="experiment.py",
        description="مقياس الهوك — يقيس أول ثواني المقطع ويقارنها بأرقام إنستقرام الحقيقية (Spearman + permutation test).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="الأمثلة:\n  python3 experiment.py run --reels reels/ --metrics metrics.csv --out out/\n"
               "  python3 experiment.py check new.mp4 --calibration .io/hook-calibration.json\n"
               "  python3 experiment.py scorers\n  python3 experiment.py template > metrics.csv")
    sub = p.add_subparsers(dest="cmd")
    r = sub.add_parser("run", help="شغّل التجربة على مجلد مقاطع + metrics.csv")
    r.add_argument("--reels", required=True, help="مجلد المقاطع (mp4)")
    r.add_argument("--metrics", required=True, help="metrics.csv (انظر README)")
    r.add_argument("--out", default="hookmeter-out", help="مجلد النتائج")
    r.add_argument("--seconds", type=float, default=3.0, help="كم ثانية من البداية نقيس (افتراضي 3)")
    r.add_argument("--scorers", help="baseline,snapugc (افتراضي: كل المتاح)")
    r.add_argument("--lang", default="ar", help="لغة الكلام لـ whisper: ar أو auto")
    r.add_argument("--stats", help=".io/stats.json لتعبئة المشاهدات/الوصول/متوسط المشاهدة تلقائياً")
    r.add_argument("--extra-scores", help="CSV فيه file + أعمدة درجات من أداة خارجية (مثل SnapUGC)")
    r.add_argument("--permutations", type=int, default=10000)
    r.add_argument("--calibration", help="احفظ ملف معايرة (مثلاً .io/hook-calibration.json)")
    r.add_argument("--demo-label", help=argparse.SUPPRESS)
    r.add_argument("--quiet", action="store_true")
    c = sub.add_parser("check", help="قيّم مقطع جديد مقارنة بمقاطعك السابقة (يحتاج ملف معايرة)")
    c.add_argument("video")
    c.add_argument("--calibration", required=True)
    c.add_argument("--lang", default="ar")
    sub.add_parser("scorers", help="اعرض المقاييس المتاحة على هالجهاز")
    sub.add_parser("template", help="اطبع قالب metrics.csv")
    a = p.parse_args(argv)
    if a.cmd == "run":
        return cmd_run(a)
    if a.cmd == "check":
        return cmd_check(a)
    if a.cmd == "scorers":
        for name, mod in SCORERS.items():
            ok, why = mod.available()
            print(f"{'✓' if ok else '✗'} {name}: {why}")
            for k, (lab, d, note) in mod.FEATURES.items():
                print(f"    {k:22s} {lab}" + (f" — {note}" if note else ""))
        return 0
    if a.cmd == "template":
        sys.stdout.write(TEMPLATE)
        return 0
    p.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
