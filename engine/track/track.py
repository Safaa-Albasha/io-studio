#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
التتبّع — I/O Studio
==============
يتبّع سطح (أربع زوايا) أو صندوق أو نقطة بالفيديو، ويكتب JSON بإحداثيات الفيديو نفسه (بكسل) لكل فريم —
عشان عنصر موشن (رقم، ملصق، شعار) «يثبت» على شي يتحرك بالمشهد. references/tracking.md بسكل الفيديو.

  python3 track.py plane   <video> --at <ث> --quad x1,y1,x2,y2,x3,y3,x4,y4 [--to <ث>] [--back [--from <ث>]] --out <json>
        سطح مستوي (شاشة، ورقة، أرضية، لوحة): نقاط مميّزة داخل الزوايا → تدفّق KLT فريم بفريم → هوموغرافي RANSAC
  python3 track.py box     <video> --at <ث> --box x,y,w,h            [--to] [--back] --out <json>
        جسم (وجه، كوب، سيارة): CSRT لو موجود، وإلا KLT على نقاط الصندوق
  python3 track.py point   <video> --at <ث> --pt x,y [--pt name=x,y …] [--to] [--back] --out <json>
        نقطة أو أكثر (KLT)
  python3 track.py fix     <json> --at <ث> --quad …|--box …|--pt …  [--to <ث>] [--out <json>]
        «صلّح من هنا»: مفتاح جديد عند <ث> ويعيد التتبّع من هناك لقدّام، ويدمج مع اللي قبله
  python3 track.py preview <video> <json> --out <mp4> [--pad 0.5]
        يرسم السطح/الصندوق/النقطة فوق الفيديو (أخضر = ثقة عالية · أحمر = واطية)
  python3 track.py info    <json>                                     ملخّص: المدى · الثقة · وين ضاع
  python3 track.py check                                              شنو ناقص (numpy · opencv · CSRT · ffmpeg)
  python3 track.py selftest                                           فيديو مصنوع بحركة معروفة ويقيس الخطأ بالبكسل

خيارات: --smooth 7 (نافذة Savitzky-Golay بالفريمات، 0 = بلا) · --min-conf 0.35 (تحتها يوقف) · --patience 4 (كم فريم ضعيف قبل ما يوقف)
         --maxdim 960 (يشتغل على نسخة مصغّرة بهالحجم، والنتيجة ترجع لبكسل الفيديو الأصلي) · --name <اسم> · --progress (يطبع «تقدّم NN%»)
الإحداثيات دايماً ببكسل الفيديو المعطى (size بالـJSON). الزمن t بثواني الفيديو نفسه:
  cutz.mp4 → زمن الإخراج (نفس caps.json وstudio.json) · src.mov → زمن المصدر.
المخرج المقترح: <work>/track/<اسم>.json — الاستوديو (التايملاين «تتبّع») يحفظ هناك.
"""
import json, math, os, shutil, subprocess, sys, tempfile, time

MIN_CONF, PATIENCE, SMOOTH, MAXDIM = 0.35, 4, 7, 960


# ───────────────────────── أدوات عامة ─────────────────────────
def arg(args, name, default=None):
    if name in args:
        i = args.index(name)
        if i + 1 < len(args):
            return args[i + 1]
    return default


BOOL_FLAGS = ("--back", "--progress")


def positional(args):
    out, skip = [], False
    for a in args:
        if skip:
            skip = False
            continue
        if a.startswith("--"):
            skip = a not in BOOL_FLAGS
            continue
        out.append(a)
    return out


def arg_all(args, name):
    return [args[i + 1] for i, a in enumerate(args) if a == name and i + 1 < len(args)]


def need():
    try:
        import numpy as np
        import cv2
    except ImportError:
        raise SystemExit("❌ التتبّع يحتاج numpy + opencv:\n   python3 -m pip install --user numpy opencv-python-headless   (أو node engine/doctor.js --fix)")
    return np, cv2


def nums(s, n=None, what=""):
    try:
        v = [float(x) for x in str(s).replace(";", ",").replace(" ", ",").split(",") if x != ""]
    except ValueError:
        raise SystemExit(f"❌ {what}: أرقام بس مفصولة بفواصل — وصلني «{s}»")
    if n and len(v) != n:
        raise SystemExit(f"❌ {what}: لازم {n} أرقام — وصلني {len(v)}")
    return v


def parse_points(vals):
    out = {}
    for k, s in enumerate(vals):
        name = "p" if k == 0 else f"p{k + 1}"
        if "=" in s:
            name, s = s.split("=", 1)
        out[name.strip() or f"p{k + 1}"] = nums(s, 2, "--pt")
    return out


def shape_from_args(args):
    if arg(args, "--quad"):
        q = nums(arg(args, "--quad"), 8, "--quad")
        return "plane", [[q[i], q[i + 1]] for i in range(0, 8, 2)]
    if arg(args, "--box"):
        return "box", nums(arg(args, "--box"), 4, "--box")
    if arg_all(args, "--pt"):
        return "point", parse_points(arg_all(args, "--pt"))
    return None, None


def r1(x):
    return round(float(x), 1)


def order_quad(q):
    """أربع زوايا بأي ترتيب → فوق-يسار، فوق-يمين، تحت-يمين، تحت-يسار (مع عقارب الساعة على الشاشة)."""
    cx = sum(p[0] for p in q) / 4.0
    cy = sum(p[1] for p in q) / 4.0
    s = sorted(q, key=lambda p: math.atan2(p[1] - cy, p[0] - cx))     # y لتحت: الزاوية تمشي مع عقارب الساعة
    k = min(range(4), key=lambda i: s[i][0] + s[i][1])
    return [list(map(float, s[(k + i) % 4])) for i in range(4)]


def poly_area(q):
    a = 0.0
    for i in range(len(q)):
        x1, y1 = q[i]
        x2, y2 = q[(i + 1) % len(q)]
        a += x1 * y2 - x2 * y1
    return a / 2.0


def convex(q):
    sg = []
    for i in range(4):
        a, b, c = q[i], q[(i + 1) % 4], q[(i + 2) % 4]
        sg.append((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]))
    return all(x > 0 for x in sg) or all(x < 0 for x in sg)


def say(msg):
    print(msg, flush=True)


# ───────────────────────── قراءة الفيديو ─────────────────────────
class Video:
    def __init__(self, path, maxdim=MAXDIM):
        np, cv2 = need()
        if not os.path.exists(path):
            raise SystemExit(f"❌ ما لقيت الفيديو {path}")
        cap = cv2.VideoCapture(path)
        if not cap.isOpened():
            raise SystemExit(f"❌ opencv ما قدر يفتح {path} (جرّب نسخة H.264: ffmpeg -i in -c:v libx264 out.mp4)")
        self.path, self.cap = path, cap
        self.fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        if self.fps > 240 or self.fps < 1:
            self.fps = 30.0
        self.n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        self.w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.s = min(1.0, float(maxdim) / max(self.w, self.h)) if maxdim else 1.0
        self.pos = None

    def idx(self, t):
        i = int(round(float(t) * self.fps))
        return max(0, min(i, self.n - 1)) if self.n else max(0, i)

    def t(self, i):
        return round(i / self.fps, 3)

    def _small(self, fr):
        np, cv2 = need()
        g = cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY)
        if self.s < 1.0:
            g = cv2.resize(g, (int(round(self.w * self.s)), int(round(self.h * self.s))), interpolation=cv2.INTER_AREA)
        return g

    def frames(self, i0, i1, color=False):
        """فريمات i0..i1 (شاملة) لقدّام: (i, رمادي مصغّر[, ملوّن أصلي])."""
        np, cv2 = need()
        if self.pos != i0:
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, i0)
        i = i0
        while i <= i1:
            ok, fr = self.cap.read()
            if not ok:
                break
            self.pos = i + 1
            yield (i, self._small(fr), fr) if color else (i, self._small(fr))
            i += 1
        self.pos = None if i <= i1 else self.pos


# ───────────────────────── المتتبّعات (كلها على الصورة المصغّرة) ─────────────────────────
LK = None


def lk_params():
    np, cv2 = need()
    return dict(winSize=(21, 21), maxLevel=3, criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 30, 0.01))


def klt(prev, cur, pts, fb_max=1.0):
    """تدفّق KLT لقدّام ولورا — يرجّع (النقاط الجديدة، قناع الصالحة، خطأ الذهاب والإياب)."""
    np, cv2 = need()
    if len(pts) == 0:
        return pts, np.zeros(0, bool), np.zeros(0)
    p0 = pts.reshape(-1, 1, 2).astype(np.float32)
    p1, st, _ = cv2.calcOpticalFlowPyrLK(prev, cur, p0, None, **lk_params())
    pr, st2, _ = cv2.calcOpticalFlowPyrLK(cur, prev, p1, None, **lk_params())
    fb = np.linalg.norm((p0 - pr).reshape(-1, 2), axis=1)
    h, w = cur.shape[:2]
    p1 = p1.reshape(-1, 2)
    inside = (p1[:, 0] >= 0) & (p1[:, 1] >= 0) & (p1[:, 0] < w) & (p1[:, 1] < h)
    good = (st.ravel() == 1) & (st2.ravel() == 1) & (fb < fb_max) & inside
    return p1, good, fb


def features(gray, poly, maxc=400, shrink=0.04, avoid=None, min_d=6):
    """نقاط مميّزة داخل مضلع (منكمش شوي عشان ما ياخذ حواف الخلفية)."""
    np, cv2 = need()
    q = np.array(poly, np.float32)
    c = q.mean(axis=0)
    q = c + (q - c) * (1 - shrink)
    m = np.zeros(gray.shape[:2], np.uint8)
    cv2.fillConvexPoly(m, np.round(q).astype(np.int32), 255)
    if avoid is not None and len(avoid):
        for x, y in avoid:
            cv2.circle(m, (int(x), int(y)), min_d, 0, -1)
    if m.sum() == 0:
        return np.zeros((0, 2), np.float32)
    p = cv2.goodFeaturesToTrack(gray, maxCorners=maxc, qualityLevel=0.005, minDistance=min_d, mask=m, blockSize=7)
    if p is None or len(p) < 12:
        p2 = cv2.goodFeaturesToTrack(gray, maxCorners=maxc, qualityLevel=0.001, minDistance=max(3, min_d // 2), mask=m, blockSize=5)
        if p2 is not None and (p is None or len(p2) > len(p)):
            p = p2
    return np.zeros((0, 2), np.float32) if p is None else p.reshape(-1, 2).astype(np.float32)


class PlaneTracker:
    """نقاط المرجع (إحداثيات فريم المفتاح) تتبع لكل فريم، والهوموغرافي دايماً من المرجع للحالي (مو سلسلة فريم-فريم) → انجراف أقل."""

    def __init__(self, gray, quad):
        np, cv2 = need()
        self.np, self.cv2 = np, cv2
        self.qref = np.array(quad, np.float32)
        self.H = np.eye(3, dtype=np.float64)
        self.prev = gray
        self.cur = np.array(quad, np.float32)
        self.pts = features(gray, quad)
        self.ref = self.pts.copy()
        self.n0 = max(1, len(self.pts))
        if len(self.pts) < 8:
            raise SystemExit("❌ السطح أملس زيادة — ما فيه تفاصيل كافية داخل الزوايا (كبّر الزوايا أو اختر سطح فيه نقش/كتابة)")

    def reseed(self, gray):
        np, cv2 = self.np, self.cv2
        new = features(gray, self.cur, avoid=self.pts)
        if not len(new):
            return
        try:
            Hi = np.linalg.inv(self.H)
        except np.linalg.LinAlgError:
            return
        ref = cv2.perspectiveTransform(new.reshape(-1, 1, 2), Hi).reshape(-1, 2)
        self.pts = np.vstack([self.pts, new]).astype(np.float32)
        self.ref = np.vstack([self.ref, ref]).astype(np.float32)

    def step(self, gray):
        np, cv2 = self.np, self.cv2
        p1, good, fb = klt(self.prev, gray, self.pts)
        self.prev = gray
        ng = int(good.sum())
        if ng < 6:
            self.pts, self.ref = p1[good], self.ref[good]
            return None, 0.0
        H, inl = cv2.findHomography(self.ref[good], p1[good], cv2.RANSAC, 2.0, maxIters=2000, confidence=0.995)
        if H is None:
            return None, 0.0
        inl = inl.ravel().astype(bool)
        ni = int(inl.sum())
        q = cv2.perspectiveTransform(self.qref.reshape(-1, 1, 2), H).reshape(-1, 2)
        ratio = ni / max(1, ng)
        conf = ratio * min(1.0, ni / max(10.0, 0.35 * self.n0))
        a0, a1 = abs(poly_area(self.cur.tolist())), abs(poly_area(q.tolist()))
        if not convex(q.tolist()) or a1 < 1:
            conf *= 0.1
        elif a0 > 0 and not (0.75 < a1 / a0 < 1.33):
            conf *= 0.3                                     # قفزة حجم بفريم واحد = قص أو تتبّع غلط
        self.H, self.cur = H, q.astype(np.float32)
        self.pts, self.ref = p1[good][inl].astype(np.float32), self.ref[good][inl]
        if len(self.pts) < max(24, 0.6 * self.n0):
            self.reseed(gray)
        return q, float(max(0.0, min(1.0, conf)))


class BoxTracker:
    def __init__(self, gray, box, engine="auto"):
        np, cv2 = need()
        self.np, self.cv2 = np, cv2
        self.box = [float(v) for v in box]
        self.engine = "klt"
        self.tr = None
        if engine in ("auto", "csrt"):
            mk = getattr(cv2, "TrackerCSRT_create", None) or getattr(getattr(cv2, "legacy", None), "TrackerCSRT_create", None)
            if mk:
                try:
                    self.tr = mk()
                    self.tr.init(cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR), tuple(int(round(v)) for v in self.box))
                    self.engine = "csrt"
                except Exception:
                    self.tr = None
        x, y, w, h = self.box
        self.tpl = self._patch(gray, self.box)
        self.prev = gray
        self.box0 = list(self.box)
        self.pts = features(gray, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], maxc=200, shrink=0.08, min_d=4)
        self.ref = self.pts.copy()                          # إحداثيات فريم المفتاح: التحويل دايماً من المرجع للحالي (بلا انجراف سلسلة)
        self.M = np.float64([[1, 0, 0], [0, 1, 0]])
        if self.tr is None and len(self.pts) < 6:
            raise SystemExit("❌ الصندوق أملس زيادة — ما فيه تفاصيل يتتبّعها (كبّره شوي)")

    def _patch(self, gray, b):
        np, cv2 = self.np, self.cv2
        x, y, w, h = [int(round(v)) for v in b]
        H, W = gray.shape[:2]
        x0, y0, x1, y1 = max(0, x), max(0, y), min(W, x + w), min(H, y + h)
        if x1 - x0 < 4 or y1 - y0 < 4:
            return None
        return cv2.GaussianBlur(cv2.resize(gray[y0:y1, x0:x1], (32, 32), interpolation=cv2.INTER_AREA).astype(np.float32), (0, 0), 1.5)

    def _ncc(self, gray, b):
        p = self._patch(gray, b)
        if p is None or self.tpl is None:
            return 0.0
        a, c = self.tpl - self.tpl.mean(), p - p.mean()
        d = math.sqrt(float((a * a).sum() * (c * c).sum())) or 1.0
        return float((a * c).sum() / d)

    def _reseed(self, gray, b):
        np, cv2 = self.np, self.cv2
        x, y, w, h = b
        new = features(gray, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], maxc=200, shrink=0.08, min_d=4, avoid=self.pts)
        if not len(new):
            return
        Mi = cv2.invertAffineTransform(self.M)
        ref = cv2.transform(new.reshape(-1, 1, 2), Mi).reshape(-1, 2)
        self.pts = np.vstack([self.pts, new]).astype(np.float32)
        self.ref = np.vstack([self.ref, ref]).astype(np.float32)

    def step(self, gray):
        np, cv2 = self.np, self.cv2
        ok_klt, nb = False, None
        if len(self.pts) >= 4:
            p1, good, _ = klt(self.prev, gray, self.pts)
            if good.sum() >= 4:
                M, inl = cv2.estimateAffinePartial2D(self.ref[good], p1[good], method=cv2.RANSAC, ransacReprojThreshold=2.0)
                if M is not None:
                    s = math.hypot(M[0, 0], M[1, 0])
                    x, y, w, h = self.box0
                    cx, cy = x + w / 2, y + h / 2
                    ncx, ncy = M[0, 0] * cx + M[0, 1] * cy + M[0, 2], M[1, 0] * cx + M[1, 1] * cy + M[1, 2]
                    nb = [ncx - w * s / 2, ncy - h * s / 2, w * s, h * s]
                    ok_klt = True
                    self.M = M
                    keep = inl.ravel().astype(bool) if inl is not None else np.ones(int(good.sum()), bool)
                    self.pts, self.ref = p1[good][keep].astype(np.float32), self.ref[good][keep]
            else:
                self.pts, self.ref = p1[good], self.ref[good]
        self.prev = gray
        b, conf = None, 0.0
        if self.tr is not None:
            ok, bb = self.tr.update(cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR))
            if ok:
                b = [float(v) for v in bb]
                if ok_klt and len(self.pts) >= 8 and math.hypot(b[0] + b[2] / 2 - nb[0] - nb[2] / 2, b[1] + b[3] / 2 - nb[1] - nb[3] / 2) < 0.15 * max(b[2], b[3]):
                    b = nb                                  # متفقين: نقاط KLT أدق (بكسل فرعي) — CSRT يبقى الحَكَم لما يختلفون
                conf = 0.55 + 0.45 * max(0.0, self._ncc(gray, b))
        if b is None and ok_klt:
            b = nb
            conf = 0.4 + 0.6 * max(0.0, self._ncc(gray, b))
        if b is None:
            return None, 0.0
        self.box = b
        if ok_klt and len(self.pts) < 12:
            self._reseed(gray, nb)
        return b, float(max(0.0, min(1.0, conf)))


class PointTracker:
    def __init__(self, gray, pts):
        np, cv2 = need()
        self.np = np
        self.names = list(pts.keys())
        self.p = np.array([pts[k] for k in self.names], np.float32)
        self.prev = gray

    def step(self, gray):
        np = self.np
        p1, good, fb = klt(self.prev, gray, self.p, fb_max=2.0)
        self.prev = gray
        if not good.all():
            return None, 0.0
        self.p = p1.astype(np.float32)
        conf = float(np.exp(-fb / 0.8).min())
        return {k: [float(x), float(y)] for k, (x, y) in zip(self.names, self.p)}, conf


# ───────────────────────── التشغيل ─────────────────────────
def scale_shape(kind, sh, s):
    if kind == "plane":
        return [[x * s, y * s] for x, y in sh]
    if kind == "box":
        return [v * s for v in sh]
    return {k: [v[0] * s, v[1] * s] for k, v in sh.items()}


def make_tracker(kind, gray, sh, engine="auto"):
    if kind == "plane":
        return PlaneTracker(gray, sh)
    if kind == "box":
        return BoxTracker(gray, sh, engine)
    return PointTracker(gray, sh)


def run_dir(vid, kind, sh_small, i_key, i_end, opts, frames_iter, progress=None):
    """يتتبّع بفريمات frames_iter (أول واحد = فريم المفتاح). يرجّع ([(i, shape_small, conf)], lost_i أو None)."""
    out, low, lost = [], 0, None
    tr = None
    total = max(1, abs(i_end - i_key))
    for k, (i, g) in enumerate(frames_iter):
        if tr is None:
            tr = make_tracker(kind, g, sh_small, opts.get("engine", "auto"))
            opts["_engine"] = getattr(tr, "engine", None)
            out.append((i, sh_small, 1.0))
            continue
        shp, conf = tr.step(g)
        if shp is None or conf < opts["min_conf"]:
            low += 1
            if shp is not None:
                out.append((i, shp, conf))
            if low >= opts["patience"] or shp is None:
                lost = i
                break
        else:
            low = 0
            out.append((i, shp, conf))
        if progress and k % 5 == 0:
            progress(k / total)
    while out and out[-1][2] < opts["min_conf"] and len(out) > 1:   # الذيل الضعيف ينشال
        out.pop()
    return out, lost


def savgol(series, win, order=2):
    np, _ = need()
    y = np.asarray(series, np.float64)
    n = len(y)
    if win < 3 or n < 5:
        return y
    win = min(win | 1, n if n % 2 else n - 1)
    if win < 3:
        return y
    k = win // 2
    order = min(order, win - 1)
    A = np.vander(np.arange(-k, k + 1, dtype=np.float64), order + 1, increasing=True)
    c = np.linalg.pinv(A)[0]
    pad = np.pad(y, (k, k), mode="reflect", reflect_type="odd") if n > k else np.pad(y, (k, k), mode="edge")
    return np.convolve(pad, c[::-1], mode="valid")


def smooth_frames(kind, frames, win, keep_first=True):
    """تنعيم Savitzky-Golay لكل إحداثي (بلا تأخير زمني). فريم المفتاح يبقى زي ما حطه المستخدم."""
    if win < 3 or len(frames) < 5:
        return frames
    np, _ = need()
    if kind == "plane":
        M = np.array([[c for p in f["quad"] for c in p] for f in frames])
    elif kind == "box":
        M = np.array([f["box"] for f in frames], np.float64)
        M[:, 0] += M[:, 2] / 2
        M[:, 1] += M[:, 3] / 2                                      # ننعّم المركز والحجم مو الزاوية
    else:
        names = list(frames[0]["points"].keys())
        M = np.array([[c for k in names for c in f["points"][k]] for f in frames])
    S = np.stack([savgol(M[:, j], win) for j in range(M.shape[1])], axis=1)
    for r, f in enumerate(frames):
        if keep_first and f.get("key"):
            continue
        v = S[r]
        if kind == "plane":
            f["quad"] = [[r1(v[0]), r1(v[1])], [r1(v[2]), r1(v[3])], [r1(v[4]), r1(v[5])], [r1(v[6]), r1(v[7])]]
        elif kind == "box":
            w, h = v[2], v[3]
            f["box"] = [r1(v[0] - w / 2), r1(v[1] - h / 2), r1(w), r1(h)]
        else:
            f["points"] = {k: [r1(v[2 * j]), r1(v[2 * j + 1])] for j, k in enumerate(names)}
    return frames


def to_frame(vid, kind, i, shp, conf, key=False):
    s = 1.0 / vid.s
    f = {"t": vid.t(i)}
    if kind == "plane":
        f["quad"] = [[r1(x * s), r1(y * s)] for x, y in (shp.tolist() if hasattr(shp, "tolist") else shp)]
    elif kind == "box":
        f["box"] = [r1(v * s) for v in shp]
    else:
        f["points"] = {k: [r1(v[0] * s), r1(v[1] * s)] for k, v in shp.items()}
    f["conf"] = round(float(conf), 3)
    if key:
        f["key"] = True
    return f


def video_ref(video, out):
    """مسار الفيديو بالـJSON: نسبي لمجلد الشغل (أب مجلد track/) لو داخله."""
    va = os.path.abspath(video)
    od = os.path.dirname(os.path.abspath(out))
    work = os.path.dirname(od) if os.path.basename(od) == "track" else od
    try:
        rel = os.path.relpath(va, work)
        if not rel.startswith(".."):
            return rel.replace(os.sep, "/"), work
    except ValueError:
        pass
    return va, work


def clock_of(video):
    b = os.path.basename(str(video)).lower()
    if b.startswith("cutz"):
        return "out"
    if b.startswith("src.") or b.startswith("proxy"):
        return "src"
    return "video"


def track(video, kind, shape, at, to=None, back=False, frm=None, opts=None, progress=None):
    """النواة: يرجّع (frames مرتبة بالزمن، معلومات)."""
    opts = dict({"min_conf": MIN_CONF, "patience": PATIENCE, "smooth": SMOOTH, "maxdim": MAXDIM, "engine": "auto"}, **(opts or {}))
    vid = Video(video, opts["maxdim"])
    if kind == "plane":
        shape = order_quad(shape)
        if abs(poly_area(shape)) < 64:
            raise SystemExit("❌ الزوايا الأربع صغيرة زيادة أو على خط واحد")
    if kind == "box" and (shape[2] < 6 or shape[3] < 6):
        raise SystemExit("❌ الصندوق صغير زيادة")
    small = scale_shape(kind, shape, vid.s)
    ik = vid.idx(at)
    last = vid.n - 1 if vid.n else ik + int(vid.fps * 3600)
    ie = min(last, vid.idx(to)) if to is not None else last
    ib = max(0, vid.idx(frm)) if frm is not None else 0
    jobs = (ie - ik) + ((ik - ib) if back else 0)

    def prog(share, base):
        if progress:
            progress(min(0.99, (base + share * (ie - ik if base == 0 else ik - ib)) / max(1, jobs)))

    fwd, lost_f = run_dir(vid, kind, small, ik, ie, opts, vid.frames(ik, ie), progress and (lambda s: prog(s, 0)))
    if not fwd:
        raise SystemExit(f"❌ ما قدرت أقرا الفريم عند {at} ث")
    bwd, lost_b = [], None
    if back and ik > ib:
        buf = [(i, g) for i, g in vid.frames(ib, ik)]
        buf.reverse()
        bwd, lost_b = run_dir(vid, kind, small, ik, ib, opts, iter(buf), progress and (lambda s: prog(s, ie - ik)))
        bwd = bwd[1:]
    rows = sorted(bwd + fwd, key=lambda r: r[0])
    frames = [to_frame(vid, kind, i, shp, c, key=(i == ik)) for i, shp, c in rows]
    frames = smooth_frames(kind, frames, int(opts["smooth"]))
    eng = {"plane": "klt+homography", "point": "klt"}.get(kind) or opts.get("_engine") or "klt"
    info = {"fps": round(vid.fps, 3), "size": [vid.w, vid.h], "key": {"t": vid.t(ik), "shape": shape},
            "lost": {"fwd": vid.t(lost_f) if lost_f is not None else None, "back": vid.t(lost_b) if lost_b is not None else None},
            "engine": eng, "scale": round(vid.s, 4)}
    if progress:
        progress(1.0)
    return frames, info


def has_csrt():
    try:
        _, cv2 = need()
        return bool(getattr(cv2, "TrackerCSRT_create", None) or getattr(getattr(cv2, "legacy", None), "TrackerCSRT_create", None))
    except SystemExit:
        return False


def shape_key(kind):
    return {"plane": "quad", "box": "box", "point": "points"}[kind]


def summary(doc):
    fr = doc.get("frames") or []
    if not fr:
        return {"n": 0}
    cs = [f.get("conf", 0) for f in fr]
    weak = [f["t"] for f in fr if f.get("conf", 0) < 0.5]
    return {"n": len(fr), "from": fr[0]["t"], "to": fr[-1]["t"], "conf_mean": round(sum(cs) / len(cs), 3), "conf_min": round(min(cs), 3),
            "weak": len(weak), "first_weak": weak[0] if weak else None, "lost": doc.get("lost")}


def write_json(path, doc):
    os.makedirs(os.path.dirname(os.path.abspath(path)) or ".", exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, path)


def progress_printer(on):
    last = [-1]

    def p(x):
        v = int(x * 100)
        if on and v != last[0] and (v - last[0] >= 2 or v >= 100):
            last[0] = v
            say(f"تقدّم {v}%")
    return p if on else None


def make_doc(kind, video, out, frames, info, name, extra=None):
    vref, _ = video_ref(video, out)
    doc = {"type": kind, "video": vref, "fps": info["fps"], "size": info["size"], "name": name, "clock": clock_of(video),
           "engine": info["engine"], "keys": [{"t": info["key"]["t"], shape_key(kind): info["key"]["shape"]}],
           "lost": info["lost"], "created": time.strftime("%Y-%m-%d %H:%M"), "frames": frames}
    if extra:
        doc.update(extra)
    doc["range"] = [frames[0]["t"], frames[-1]["t"]] if frames else None
    return doc


def opts_from(args):
    return {"min_conf": float(arg(args, "--min-conf", MIN_CONF)), "patience": int(arg(args, "--patience", PATIENCE)),
            "smooth": int(arg(args, "--smooth", SMOOTH)), "maxdim": int(arg(args, "--maxdim", MAXDIM)), "engine": arg(args, "--engine", "auto")}


def cmd_track(kind, args):
    pos = positional(args)
    if not pos or arg(args, "--at") is None:
        raise SystemExit(__doc__)
    video = pos[0]
    k2, shape = shape_from_args(args)
    if k2 is None or (k2 != kind and not (kind == "point" and k2 == "point")):
        need_flag = {"plane": "--quad x1,y1,…,x4,y4", "box": "--box x,y,w,h", "point": "--pt x,y"}[kind]
        raise SystemExit(f"❌ {kind} يحتاج {need_flag}")
    at = float(arg(args, "--at"))
    to = float(arg(args, "--to")) if arg(args, "--to") is not None else None
    frm = float(arg(args, "--from")) if arg(args, "--from") is not None else None
    back = "--back" in args
    name = arg(args, "--name") or f"{kind}-{at:g}"
    out = arg(args, "--out") or os.path.join(os.path.dirname(os.path.abspath(video)), "track", name + ".json")
    t0 = time.time()
    frames, info = track(video, kind, shape, at, to, back, frm, opts_from(args), progress_printer("--progress" in args))
    doc = make_doc(kind, video, out, frames, info, name)
    write_json(out, doc)
    s = summary(doc)
    say(f"✅ {kind}: {s['n']} فريم من {s['from']} لـ{s['to']} ث · الثقة متوسط {s['conf_mean']} أقل {s['conf_min']} · {time.time() - t0:.1f} ث")
    if info["lost"]["fwd"] is not None:
        say(f"⚠️ ضاع التتبّع عند {info['lost']['fwd']} ث — «صلّح من هنا»: track.py fix {out} --at <ث> --{shape_key(kind) if kind != 'point' else 'pt'} …")
    say("→ " + out)
    return 0


def resolve_video(doc, jpath, override=None):
    if override:
        return override
    v = doc.get("video") or ""
    if os.path.isabs(v) and os.path.exists(v):
        return v
    jd = os.path.dirname(os.path.abspath(jpath))
    for base in ((os.path.dirname(jd) if os.path.basename(jd) == "track" else jd), jd, os.getcwd()):
        p = os.path.join(base, v)
        if os.path.exists(p):
            return p
    raise SystemExit(f"❌ ما لقيت الفيديو «{v}» — مرّره بـ--video")


def cmd_fix(args):
    if not args or arg(args, "--at") is None:
        raise SystemExit(__doc__)
    jpath = args[0]
    with open(jpath, encoding="utf-8") as f:
        doc = json.load(f)
    kind = doc["type"]
    k2, shape = shape_from_args(args)
    if k2 != kind:
        raise SystemExit(f"❌ هالتتبّع نوعه {kind} — المفتاح الجديد لازم {'--quad' if kind == 'plane' else '--box' if kind == 'box' else '--pt'}")
    video = resolve_video(doc, jpath, arg(args, "--video"))
    at = float(arg(args, "--at"))
    old = doc.get("frames") or []
    to = float(arg(args, "--to")) if arg(args, "--to") is not None else None
    if to is None and old and old[-1]["t"] > at and not (doc.get("lost") or {}).get("fwd"):
        to = old[-1]["t"]                                 # يغطي نفس المدى القديم (لو كان ضايع، يكمل لين يضيع من جديد)
    o = opts_from(args)
    frames, info = track(video, kind, shape, at, to, False, None, o, progress_printer("--progress" in args))
    eps = 0.5 / max(1.0, info["fps"])
    before = [f for f in old if f["t"] < frames[0]["t"] - eps]
    merged = before + frames
    doc["frames"] = merged
    doc["keys"] = [k for k in (doc.get("keys") or []) if k["t"] < at - eps] + [{"t": info["key"]["t"], shape_key(kind): info["key"]["shape"]}]
    doc["lost"] = {"fwd": info["lost"]["fwd"], "back": (doc.get("lost") or {}).get("back")}
    doc["range"] = [merged[0]["t"], merged[-1]["t"]]
    doc["fixed"] = time.strftime("%Y-%m-%d %H:%M")
    out = arg(args, "--out") or jpath
    write_json(out, doc)
    s = summary(doc)
    say(f"✅ صلّحت من {info['key']['t']} ث: {s['n']} فريم ({s['from']} → {s['to']}) · الثقة متوسط {s['conf_mean']}")
    if info["lost"]["fwd"] is not None:
        say(f"⚠️ ضاع من جديد عند {info['lost']['fwd']} ث — حط مفتاح ثاني هناك")
    say("→ " + out)
    return 0


def frame_at(doc, t):
    fr = doc.get("frames") or []
    if not fr:
        return None
    lo, hi = 0, len(fr) - 1
    if t < fr[0]["t"] - 1e-6 or t > fr[-1]["t"] + 1e-6:
        return None
    while lo < hi:
        m = (lo + hi + 1) // 2
        if fr[m]["t"] <= t + 1e-6:
            lo = m
        else:
            hi = m - 1
    return fr[lo]


def conf_color(c):
    c = max(0.0, min(1.0, c))
    return (40, int(80 + 175 * c), int(255 * (1 - c)))       # BGR: أخضر ← أحمر


def draw(img, doc, f, s=1.0):
    _, cv2 = need()
    np, _ = need()
    col = conf_color(f.get("conf", 1))
    th = max(2, int(round(img.shape[0] / 360)))
    if "quad" in f:
        q = np.round(np.array(f["quad"]) * s).astype(np.int32)
        ov = img.copy()
        cv2.fillPoly(ov, [q], col)
        cv2.addWeighted(ov, 0.18, img, 0.82, 0, img)
        cv2.polylines(img, [q], True, col, th, cv2.LINE_AA)
        cv2.line(img, tuple(q[0]), tuple(q[2]), col, 1, cv2.LINE_AA)
        cv2.line(img, tuple(q[1]), tuple(q[3]), col, 1, cv2.LINE_AA)
        for k, p in enumerate(q):
            cv2.circle(img, tuple(p), th * 3, (255, 255, 255) if k == 0 else col, -1, cv2.LINE_AA)
    elif "box" in f:
        x, y, w, h = [int(round(v * s)) for v in f["box"]]
        cv2.rectangle(img, (x, y), (x + w, y + h), col, th, cv2.LINE_AA)
    elif "points" in f:
        for k, (x, y) in f["points"].items():
            c = (int(round(x * s)), int(round(y * s)))
            cv2.circle(img, c, th * 4, col, th, cv2.LINE_AA)
            cv2.line(img, (c[0] - th * 7, c[1]), (c[0] + th * 7, c[1]), col, 1, cv2.LINE_AA)
            cv2.line(img, (c[0], c[1] - th * 7), (c[0], c[1] + th * 7), col, 1, cv2.LINE_AA)
    lab = f"{f['t']:.2f}s  conf {f.get('conf', 1):.2f}" + ("  KEY" if f.get("key") else "")
    fs = th * 0.28
    (tw, tht), _ = cv2.getTextSize(lab, cv2.FONT_HERSHEY_SIMPLEX, fs, 1)
    cv2.rectangle(img, (8, 8), (16 + tw, 16 + tht + 4), (0, 0, 0), -1)
    cv2.putText(img, lab, (12, 12 + tht), cv2.FONT_HERSHEY_SIMPLEX, fs, (255, 255, 255), 1, cv2.LINE_AA)


def cmd_preview(args):
    pos = positional(args)
    if len(pos) < 2:
        raise SystemExit(__doc__)
    video, jpath = pos[0], pos[1]
    with open(jpath, encoding="utf-8") as f:
        doc = json.load(f)
    out = arg(args, "--out") or os.path.splitext(jpath)[0] + ".preview.mp4"
    pad = float(arg(args, "--pad", 0.5))
    np, cv2 = need()
    vid = Video(video, 0)
    fr = doc.get("frames") or []
    if not fr:
        raise SystemExit("❌ التتبّع فاضي")
    s = vid.w / float(doc.get("size", [vid.w])[0] or vid.w)
    i0, i1 = vid.idx(max(0, fr[0]["t"] - pad)), vid.idx(fr[-1]["t"] + pad)
    os.makedirs(os.path.dirname(os.path.abspath(out)) or ".", exist_ok=True)
    W, H = vid.w - vid.w % 2, vid.h - vid.h % 2
    ff = shutil.which("ffmpeg")
    if ff:
        p = subprocess.Popen([ff, "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(vid.fps), "-i", "-",
                              "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out], stdin=subprocess.PIPE)
        put = lambda im: p.stdin.write(np.ascontiguousarray(im[:H, :W]).tobytes())
    else:
        wr = cv2.VideoWriter(out, cv2.VideoWriter_fourcc(*"mp4v"), vid.fps, (W, H))
        put = lambda im: wr.write(im[:H, :W])
    n = 0
    for i, _, img in vid.frames(i0, i1, color=True):
        f = frame_at(doc, vid.t(i))
        if f is not None:
            draw(img, doc, f, s)
        put(img)
        n += 1
    if ff:
        p.stdin.close()
        p.wait()
    else:
        wr.release()
    say(f"✅ معاينة {n} فريم → {out}")
    return 0


def cmd_info(args):
    if not args:
        raise SystemExit(__doc__)
    with open(args[0], encoding="utf-8") as f:
        doc = json.load(f)
    print(json.dumps({"type": doc.get("type"), "video": doc.get("video"), "size": doc.get("size"), "fps": doc.get("fps"), **summary(doc)}, ensure_ascii=False, indent=1))
    return 0


def cmd_check(_):
    ok = True
    for m, nm in (("numpy", "numpy"), ("cv2", "opencv (opencv-python-headless)")):
        try:
            __import__(m)
            print("✅ " + nm)
        except ImportError:
            print("❌ " + nm)
            ok = False
    if ok:
        print(("✅ " if has_csrt() else "➖ ") + "CSRT للصندوق" + ("" if has_csrt() else " — ما فيه، يستخدم KLT بداله (يشتغل)"))
    print(("✅ " if shutil.which("ffmpeg") else "➖ ") + "ffmpeg (معاينة H.264؛ بلاه mp4v)")
    if not ok:
        print("\nالتنصيب: python3 -m pip install --user numpy opencv-python-headless   (أو node engine/doctor.js --fix)")
        return 1
    return 0


# ───────────────────────── الفحص الذاتي ─────────────────────────
def synth(path, W=640, H=360, n=60, fps=30, seed=7):
    """سطح منقوش يتحرك بهوموغرافي معروفة فوق خلفية منقوشة تتحرك بغير اتجاه + مربع لصندوق. يرجّع دوال الحقيقة."""
    np, cv2 = need()
    rng = np.random.RandomState(seed)

    def tex(h, w, k):
        t = rng.rand(h // k + 2, w // k + 2).astype(np.float32)
        t = cv2.resize(t, (w, h), interpolation=cv2.INTER_CUBIC)
        t += 0.35 * cv2.GaussianBlur(rng.rand(h, w).astype(np.float32), (0, 0), 1.2)
        t = (t - t.min()) / (t.max() - t.min() + 1e-6)
        return (t * 255).astype(np.uint8)

    bgt = tex(H + 80, W + 80, 16)
    pl = tex(240, 320, 6)
    pl = cv2.merge([pl, cv2.flip(pl, 1), 255 - pl])
    for k in range(10):
        cv2.putText(pl, "I/O Studio%d" % k, (int(rng.rand() * 260), int(rng.rand() * 220) + 15), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (int(rng.rand() * 255), 30, 220), 2)
    src = np.float32([[0, 0], [320, 0], [320, 240], [0, 240]])

    def quad(i):
        a = i / float(n - 1)
        cx, cy = 230 + 140 * a, 170 + 25 * math.sin(a * 3)
        sc = 0.62 + 0.18 * a
        ang = math.radians(-8 + 18 * a)
        persp = 0.12 * math.sin(a * 2.5)
        pts = []
        for x, y in [(-160, -120), (160, -120), (160, 120), (-160, 120)]:
            x, y = x * sc, y * sc
            x *= 1 + persp * (y / 120.0)
            xr, yr = x * math.cos(ang) - y * math.sin(ang), x * math.sin(ang) + y * math.cos(ang)
            pts.append([cx + xr, cy + yr])
        return np.float32(pts)

    def box(i):
        a = i / float(n - 1)
        return [60 + 40 * a, 40 + 200 * a * a, 70, 70]

    blob = tex(70, 70, 5)
    blob = cv2.merge([blob, blob // 2, 255 - blob])
    wr = cv2.VideoWriter(path, cv2.VideoWriter_fourcc(*"mp4v"), fps, (W, H))
    for i in range(n):
        ox, oy = int(40 - 30 * i / n), int(40 + 20 * math.sin(i / 9.0))
        bg = cv2.cvtColor(bgt[oy:oy + H, ox:ox + W], cv2.COLOR_GRAY2BGR)
        Hm = cv2.getPerspectiveTransform(src, quad(i))
        warp = cv2.warpPerspective(pl, Hm, (W, H), flags=cv2.INTER_LINEAR)
        m = cv2.warpPerspective(np.full((240, 320), 255, np.uint8), Hm, (W, H))
        img = bg.copy()
        img[m > 127] = warp[m > 127]
        x, y, w, h = [int(round(v)) for v in box(i)]
        img[y:y + h, x:x + w] = blob
        wr.write(img)
    wr.release()
    return quad, box


def cmd_selftest(_):
    np, cv2 = need()
    d = tempfile.mkdtemp(prefix="io-track-")
    bad = 0

    def chk(ok, msg):
        nonlocal bad
        print(("✅ " if ok else "❌ ") + msg)
        if not ok:
            bad += 1

    try:
        vp = os.path.join(d, "synth.mp4")
        n, fps = 60, 30
        quad, box = synth(vp, n=n, fps=fps)
        chk(os.path.exists(vp), "فيديو مصنوع 640×360 · 60 فريم")
        # 1) سطح لقدّام من فريم 10
        at = 10 / fps
        frames, info = track(vp, "plane", quad(10).tolist(), at, None, False, None, {"maxdim": 640})
        errs = [float(np.abs(np.array(f["quad"]) - quad(int(round(f["t"] * fps)))).max()) for f in frames]
        chk(len(frames) >= n - 10 - 1, f"السطح لقدّام: {len(frames)} فريم (المتوقّع {n - 10})")
        chk(np.mean(errs) < 2.5 and max(errs) < 5.0, f"دقة السطح: متوسط {np.mean(errs):.2f} بكسل · أقصى {max(errs):.2f}")
        chk(min(f["conf"] for f in frames) > 0.4, f"الثقة: أقل {min(f['conf'] for f in frames):.2f}")
        # 2) لورا (--back) من فريم 40 لين 20
        frames_b, _ = track(vp, "plane", quad(40).tolist(), 40 / fps, 45 / fps, True, 20 / fps, {"maxdim": 640})
        ts = [f["t"] for f in frames_b]
        eb = [float(np.abs(np.array(f["quad"]) - quad(int(round(f["t"] * fps)))).max()) for f in frames_b]
        chk(abs(ts[0] - 20 / fps) < 1e-3 and abs(ts[-1] - 45 / fps) < 1e-3 and ts == sorted(ts), f"لورا+لقدّام: {ts[0]} → {ts[-1]} مرتّب")
        chk(np.mean(eb) < 2.5, f"دقة لورا: متوسط {np.mean(eb):.2f} بكسل")
        # 3) JSON + fix + preview
        work = os.path.join(d, "work")
        os.makedirs(os.path.join(work, "track"))
        shutil.copy(vp, os.path.join(work, "cutz.mp4"))
        jp = os.path.join(work, "track", "t1.json")
        doc = make_doc("plane", os.path.join(work, "cutz.mp4"), jp, frames, info, "t1")
        write_json(jp, doc)
        dj = json.load(open(jp, encoding="utf-8"))
        okshape = dj["type"] == "plane" and dj["video"] == "cutz.mp4" and dj["size"] == [640, 360] and dj["clock"] == "out" and \
            all(set(("t", "quad", "conf")) <= set(f) and len(f["quad"]) == 4 for f in dj["frames"])
        chk(okshape, "شكل JSON: type · video (نسبي) · fps · size · frames[{t, quad, conf}]")
        rc = cmd_fix([jp, "--at", str(30 / fps), "--quad", ",".join(str(c) for p in quad(30).tolist() for c in p), "--maxdim", "640"])
        dj2 = json.load(open(jp, encoding="utf-8"))
        ts2 = [f["t"] for f in dj2["frames"]]
        e2 = [float(np.abs(np.array(f["quad"]) - quad(int(round(f["t"] * fps)))).max()) for f in dj2["frames"]]
        chk(rc == 0 and ts2 == sorted(ts2) and len(set(ts2)) == len(ts2) and len(dj2["keys"]) == 2 and np.mean(e2) < 2.5,
            f"صلّح من هنا: مفتاحين · {len(ts2)} فريم بلا تكرار · متوسط {np.mean(e2):.2f} بكسل")
        # 4) صندوق
        fb, ib = track(vp, "box", box(5), 5 / fps, 50 / fps, False, None, {"maxdim": 640})
        eb2 = [math.hypot(f["box"][0] + f["box"][2] / 2 - (box(int(round(f["t"] * fps)))[0] + 35), f["box"][1] + f["box"][3] / 2 - (box(int(round(f["t"] * fps)))[1] + 35)) for f in fb]
        chk(len(fb) >= 40 and np.mean(eb2) < 4.0, f"الصندوق ({ib['engine']}): {len(fb)} فريم · خطأ المركز متوسط {np.mean(eb2):.2f} بكسل")
        fk, ik = track(vp, "box", box(5), 5 / fps, 50 / fps, False, None, {"maxdim": 640, "engine": "klt"})
        ek = [math.hypot(f["box"][0] + f["box"][2] / 2 - (box(int(round(f["t"] * fps)))[0] + 35), f["box"][1] + f["box"][3] / 2 - (box(int(round(f["t"] * fps)))[1] + 35)) for f in fk]
        chk(len(fk) >= 40 and np.mean(ek) < 4.0, f"الصندوق (KLT بلا CSRT): خطأ المركز متوسط {np.mean(ek):.2f} بكسل")
        # 5) نقطة: زاوية السطح الأولى (داخلها شوي)
        c0 = quad(10)
        pt = (c0[0] * 0.8 + c0[2] * 0.2).tolist()
        fp, _ = track(vp, "point", {"p": pt}, at, 50 / fps, False, None, {"maxdim": 640})

        def truth(i):
            q = quad(i)
            Hm = cv2.getPerspectiveTransform(quad(10), q)
            return cv2.perspectiveTransform(np.float32([[pt]]), Hm)[0, 0]
        ep = [float(np.linalg.norm(np.array(f["points"]["p"]) - truth(int(round(f["t"] * fps))))) for f in fp]
        chk(len(fp) >= 35 and np.mean(ep) < 3.0, f"النقطة: {len(fp)} فريم · متوسط {np.mean(ep):.2f} بكسل")
        # 6) معاينة
        pv = os.path.join(work, "track", "t1.preview.mp4")
        cmd_preview([os.path.join(work, "cutz.mp4"), jp, "--out", pv])
        cap = cv2.VideoCapture(pv)
        chk(cap.isOpened() and int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) > 30, "المعاينة: mp4 فيه الفريمات")
        # 7) قطع (لقطة ثانية) → يوقف ويقول وين ضاع، بدل ما يرسم زوايا غلط
        cv = os.path.join(d, "cut.mp4")
        cap = cv2.VideoCapture(vp)
        wr = cv2.VideoWriter(cv, cv2.VideoWriter_fourcc(*"mp4v"), fps, (640, 360))
        rng = np.random.RandomState(3)
        for i in range(n):
            ok, fr = cap.read()
            if i >= 30:
                fr = cv2.GaussianBlur((rng.rand(360, 640, 3) * 255).astype(np.uint8), (0, 0), 3)
            wr.write(fr)
        wr.release()
        fc, ic = track(cv, "plane", quad(10).tolist(), at, None, False, None, {"maxdim": 640})
        chk(ic["lost"]["fwd"] is not None and abs(ic["lost"]["fwd"] - 1.0) < 0.15 and fc[-1]["t"] < 1.0,
            f"القطع: وقف عند {ic['lost']['fwd']} ث (القطع عند 1.0) وآخر فريم {fc[-1]['t']}")
        # 8) تنعيم بلا تأخير
        y = np.linspace(0, 10, 40) + np.random.RandomState(1).randn(40) * 0.3
        ys = savgol(y, 7)
        chk(abs(float(ys.mean() - y.mean())) < 0.05 and float(np.abs(ys - np.linspace(0, 10, 40)).mean()) < float(np.abs(y - np.linspace(0, 10, 40)).mean()),
            "تنعيم Savitzky-Golay يقلّل الرجفة بلا إزاحة")
        chk(order_quad([[10, 10], [0, 10], [10, 0], [0, 0]]) == [[0, 0], [10, 0], [10, 10], [0, 10]], "ترتيب الزوايا (أي ترتيب → فوق-يسار مع عقارب الساعة)")
    finally:
        shutil.rmtree(d, ignore_errors=True)
    print("\n" + ("✅ كل الفحوص نجحت" if not bad else f"❌ {bad} فحص فشل"))
    return 1 if bad else 0


def main(argv):
    if not argv or argv[0] in ("-h", "--help", "help"):
        print(__doc__)
        return 0
    c, rest = argv[0], argv[1:]
    if c in ("plane", "box", "point"):
        return cmd_track(c, rest)
    fn = {"fix": cmd_fix, "preview": cmd_preview, "info": cmd_info, "check": cmd_check, "selftest": cmd_selftest}.get(c)
    if not fn:
        print(__doc__)
        return 2
    return fn(rest)


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    sys.exit(main(sys.argv[1:]) or 0)
