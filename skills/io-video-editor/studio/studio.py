#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""📱 استوديو الجوال/الويب — خادم صغير يفتح مجلد الشغل على الشبكة المحلية، وتعدّل من أي متصفح وتشوف النتيجة حيّة.
   python3 studio/studio.py <work> [port]      ← يطبع الرابط
   الصفحة: /m · الحالة: GET /api/state · الحفظ: POST /api/save · الرسم: POST /api/render · التقدّم: GET /api/progress
   القص: POST /api/recut {keep} · حذف جمل: POST /api/drop {cards} · ورا الراس: POST /api/behind {cards}
   قصّ الشخص لمدى: POST /api/cutout {from,to} · بي-رول: POST /api/broll (الملف بالجسم + X-Name) · تعليقات: /api/comments · صفحة العميل: /share
   التايملاين (محرّر بالمصدر): /timeline · GET /api/tl/state · POST /api/tl/apply · POST /api/tl/preview {a,b} · POST /api/tl/draft — references/timeline.md
   التتبّع: GET /api/track/list · POST /api/track/run {type,at,quad|box|points,to?,back?,name?,fix?} · POST /api/track/attach {list,i,name} · POST /api/track/delete {name}
            الملفات <work>/track/<name>.json (engine/track/track.py) — references/tracking.md
   ما فيه محرّك جديد: نفس compose.html ونفس الراسم — الاستوديو يكتب studio.json وcaps.json وtheme.json وsfx.json بس."""
import http.server, json, os, sys, subprocess, threading, socket, time, shutil, re, urllib.parse

W = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8792
HERE = os.path.dirname(os.path.abspath(__file__))           # مجلد الاستوديو (ملفاته)
S = os.path.join(os.path.dirname(HERE), 'scripts')            # سكربتات السكل الأساسية — الاستوديو يستدعيها ولا يعدّلها
PY = sys.executable
JOB = {"running": False, "kind": "", "log": "", "done": None, "err": None, "started": 0, "reload": False, "stage": "", "pct": 0}

def P(*a): return os.path.join(W, *a)
def rd(name, default=None):
    p = P(name)
    if not os.path.exists(p): return default
    with open(p, encoding='utf-8') as f: return json.load(f)
def wr(name, obj):
    p = P(name); tmp = p + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f: json.dump(obj, f, ensure_ascii=False, indent=1)
    os.replace(tmp, p)
def log(s): JOB["log"] += s if s.endswith('\n') else s + '\n'
def sh(cmd, check=True):
    log('$ ' + ' '.join(os.path.basename(c) if os.sep in str(c) else str(c) for c in cmd))
    r = subprocess.run(cmd, capture_output=True, text=True, cwd=W)
    out = (r.stdout or '') + (r.stderr or '')
    if out.strip(): log(out.strip()[-600:])
    if check and r.returncode: raise RuntimeError(' '.join(cmd[:2]) + ' فشل: ' + out.strip()[-300:])
    return r

def default_scenes(total):
    try:
        src = open(P('compose.html'), encoding='utf-8').read()
        i = src.index('SCENES=['); j = src.index('];', i); out = []
        for m in re.finditer(r"\{s:([\d.]+),e:([\d.]+),m:(R_[A-Z]+)([^}]*)\}", src[i:j]):
            d = {"s": float(m.group(1)), "e": min(float(m.group(2)), total + 5), "m": m.group(3)}
            if 'nocap:true' in m.group(4): d["nocap"] = True
            mt = re.search(r"tr:([\d.]+)", m.group(4))   # 6.1: مدة انتقال خاصة بالمشهد (tr:0.001) تنقل مع الاستوديو
            if mt: d["tr"] = float(mt.group(1))
            out.append(d)
        if out: return out
    except Exception: pass
    return [{"s": 0, "e": total + 5, "m": "R_FULL"}]

def state():
    caps = rd('caps.json', {"cards": [], "total": 0}); theme = rd('theme.json', {}); cut = rd('cut.json', {})
    sfx = rd('sfx.json', {"outro": 3.5}); behind = rd('behind.json'); studio = rd('studio.json') or {}
    if not studio.get('scenes'): studio['scenes'] = default_scenes(caps.get('total', 0))
    for k, v in (('stickers', []), ('behindOff', []), ('brollClips', []), ('brNeed', {})): studio.setdefault(k, v)
    studio['sfx'] = {k: v for k, v in sfx.items() if k != 'outro'}
    nvf = len(os.listdir(P('vfr'))) if os.path.isdir(P('vfr')) else 0
    final = [f for f in ('ad-master.mp4', 'ad-final.mp4') if os.path.exists(P(f))]
    src_dur = 0
    try: src_dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', P('src.mov')], capture_output=True, text=True).stdout.strip() or 0)
    except Exception: pass
    return {"caps": caps, "theme": theme, "cut": cut, "srcDur": src_dur, "outro": sfx.get('outro', 3.5), "behind": behind, "studio": studio,
            "nvf": nvf, "final": final[0] if final else None, "hasPerson": os.path.isdir(P('bt', 'person')),
            "hasRaw": os.path.exists(P('cutz.mp4')), "comments": rd('comments.json', [])}

# ---------- تحويل الأزمنة عند تغيير القص (زمن الإخراج القديم → المصدر → الإخراج الجديد) ----------
def out2src(t, keep):
    acc = 0
    for a, b in keep:
        L = b - a
        if t <= acc + L + 1e-6: return a + max(0, t - acc)
        acc += L
    return keep[-1][1] if keep else t
def src2out(ts, keep):
    acc = 0
    for a, b in keep:
        if ts <= b + 1e-6: return acc + max(0, ts - a)
        acc += b - a
    return acc
def shift_studio(old_keep, new_keep, do_sfx=True):
    st = rd('studio.json') or {}
    conv = lambda t: round(src2out(out2src(t, old_keep), new_keep), 3)
    total = sum(b - a for a, b in new_keep)
    for sc in st.get('scenes', []): sc['s'], sc['e'] = conv(sc['s']), conv(sc['e'])
    st['scenes'] = [sc for sc in st.get('scenes', []) if sc['e'] - sc['s'] > 0.15]
    old_total = sum(b - a for a, b in old_keep)
    if st.get('scenes'):
        st['scenes'][0]['s'] = 0
        if st['scenes'][-1]['e'] >= old_total - 0.05: st['scenes'][-1]['e'] = total + 5   # آخر مشهد يمتد للنهاية بس لو كان ممتداً أصلاً
    for arr in ('stickers', 'brollClips'):
        st[arr] = [x for x in (st.get(arr) or []) if conv(x['e']) - conv(x['s']) > 0.2]
        for x in st[arr]: x['s'], x['e'] = conv(x['s']), conv(x['e'])
    st['behindOff'] = []
    wr('studio.json', st)
    if not do_sfx: return
    sfx = rd('sfx.json', {"outro": 3.5})
    for k in list(sfx.keys()):
        if isinstance(sfx[k], list): sfx[k] = [conv(t) for t in sfx[k] if conv(t) < total]
    wr('sfx.json', sfx)

def reapply_words(old_caps):
    """بعد إعادة التوقيت: أرجع الكلمات الساخنة ومؤثراتها بمطابقة النص وترتيبه (أفضل جهد)."""
    caps = rd('caps.json')
    old = {}
    for c in old_caps.get('cards', []):
        for w in c['w']:
            if w.get('hot') or w.get('fx'): old.setdefault(w['t'], []).append({"hot": w.get('hot', False), "fx": w.get('fx')})
    for c in caps['cards']:
        for w in c['w']:
            if w['t'] in old and old[w['t']]:
                o = old[w['t']].pop(0); w['hot'] = o['hot']
                if o['fx']: w['fx'] = o['fx']
    wr('caps.json', caps)

def rebuild_after_cut(old_keep):
    log("✂️ أقصّ وأزوّم من جديد…"); sh([PY, os.path.join(S, '03_cut_zoom.py'), W])
    log("🖼️ أطلّع الفريمات…"); shutil.rmtree(P('vfr'), ignore_errors=True); os.makedirs(P('vfr'))
    sh(['ffmpeg', '-v', 'error', '-i', P('cutz.mp4'), '-vf', 'fps=30', '-q:v', '3', '-y', P('vfr', '%05d.jpg')])
    new_keep = rd('cut.json')['keep']; shift_studio(old_keep, new_keep)
    for f in ('behind.json', 'sfx.wav'):
        try: os.remove(P(f))
        except FileNotFoundError: pass
    shutil.rmtree(P('bt'), ignore_errors=True); shutil.rmtree(P('out'), ignore_errors=True)
    log("ℹ️ الكلام ورا الراس انلغى لأن الفريمات تغيّرت — أعده من الاستوديو لو تبيه.")

def job(kind, fn):
    if JOB["running"]: return False
    JOB.update(running=True, kind=kind, log="", done=None, err=None, started=time.time(), reload=False, stage="", pct=0)
    def run():
        try: fn(); log("✅ خلص")
        except Exception as e: JOB["err"] = str(e)[:400]; log("❌ " + str(e)[:400])
        finally: JOB["running"] = False
    threading.Thread(target=run, daemon=True).start(); return True

def do_render(rng):
    if rng: cmd = ['node', os.path.join(S, '04_render_frames.js'), W, 'range', str(rng[0]), str(rng[1])]
    else:   cmd = ['node', os.path.join(S, '04_render_frames.js'), W, 'all', '--force']
    log('$ ' + os.path.basename(cmd[1]) + ' ' + ' '.join(cmd[3:]))
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    for line in p.stdout:
        log(line)
        if 'فريم مرسوم من' in line: time.sleep(1.5); p.kill(); break
    p.wait()
    sh([PY, os.path.join(S, '05_sfx.py'), W], check=False)
    for f in ('ad-final.mp4', 'ad-master.mp4'):
        try: os.remove(P(f))
        except FileNotFoundError: pass
    log("🎞️ تجميع…"); sh(['bash', os.path.join(S, '06_encode.sh'), W, P('ad-final.mp4')])
    log("🔊 معايرة الصوت…"); sh(['bash', os.path.join(S, '06b_master.sh'), W, P('ad-final.mp4'), P('ad-master.mp4')])
    if not os.path.exists(P('ad-master.mp4')): raise RuntimeError('ما طلع الملف النهائي')
    JOB["done"] = 'ad-master.mp4'

def do_recut(keep):
    old = rd('cut.json'); old_caps = rd('caps.json'); os.makedirs(P('.studio_bak'), exist_ok=True)
    for f in ('cut.json', 'caps.json', 'studio.json', 'sfx.json'):
        if os.path.exists(P(f)): shutil.copy(P(f), P('.studio_bak', f))
    keep = [[round(float(a), 3), round(float(b), 3)] for a, b in keep if float(b) - float(a) > 0.15]
    wr('cut.json', {**old, "keep": keep})
    log("📝 أعيد توقيت الكابشن…"); sh([PY, os.path.join(S, '02_captions.py'), W]); reapply_words(old_caps)
    rebuild_after_cut(old['keep']); JOB["reload"] = True

def do_drop(cards):
    old = rd('cut.json'); old_caps = rd('caps.json'); os.makedirs(P('.studio_bak'), exist_ok=True)
    for f in ('cut.json', 'caps.json', 'studio.json', 'sfx.json'):
        if os.path.exists(P(f)): shutil.copy(P(f), P('.studio_bak', f))
    sh([PY, os.path.join(S, '10_script_edit.py'), W, 'drop'] + [str(c) for c in cards])
    reapply_words(old_caps); rebuild_after_cut(old['keep']); JOB["reload"] = True

def do_behind(cards):
    sh(['node', os.path.join(S, '11_behind_text.js'), W, 'build'] + [str(c) for c in cards]); JOB["reload"] = True
def do_cutout(a, b):
    sh(['node', os.path.join(S, '11_behind_text.js'), W, 'cutout', '%.2f-%.2f' % (a, b)]); JOB["reload"] = True

def do_undo_cut():
    """يرجّع ملفات ما قبل آخر قص/حذف (.studio_bak) ويعيد البناء"""
    bk = P('.studio_bak')
    if not os.path.exists(os.path.join(bk, 'cut.json')): raise RuntimeError('ما فيه قص سابق أرجع له')
    old = rd('cut.json')
    for f in ('cut.json', 'caps.json', 'studio.json', 'sfx.json'):
        if os.path.exists(os.path.join(bk, f)): shutil.copy(os.path.join(bk, f), P(f))
    log("↶ رجّعت ملفات ما قبل القص…")
    sh([PY, os.path.join(S, '03_cut_zoom.py'), W]); shutil.rmtree(P('vfr'), ignore_errors=True); os.makedirs(P('vfr'))
    sh(['ffmpeg', '-v', 'error', '-i', P('cutz.mp4'), '-vf', 'fps=30', '-q:v', '3', '-y', P('vfr', '%05d.jpg')])
    shutil.rmtree(P('out'), ignore_errors=True); JOB["reload"] = True

def do_broll(name, data):
    key = re.sub(r'[^a-z0-9]+', '', name.lower().rsplit('.', 1)[0])[:12] or 'clip'
    key = key + str(int(time.time()) % 1000)
    os.makedirs(P('broll_src'), exist_ok=True); os.makedirs(P('broll'), exist_ok=True)
    src = P('broll_src', key + '.mov'); open(src, 'wb').write(data)
    pr = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=color_transfer', '-show_entries', 'format=duration', '-of', 'csv=p=0', src], capture_output=True, text=True).stdout
    hdr = ('arib-std-b67' in pr) or ('smpte2084' in pr)
    use = src
    if hdr and os.path.exists(os.path.join(S, 'hdr2sdr')):
        log("🎨 لقطة HDR — أحوّلها بمحوّل أبل…"); use = P('broll_src', key + '_sdr.mov'); sh([os.path.join(S, 'hdr2sdr'), src, use], check=False)
        if not os.path.exists(use): use = src
    sh(['ffmpeg', '-v', 'error', '-i', use, '-vf', 'fps=30,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920', '-q:v', '3', '-y', P('broll', key + '_%04d.jpg')])
    n = len([f for f in os.listdir(P('broll')) if f.startswith(key + '_')])
    st = rd('studio.json') or {}; st.setdefault('brNeed', {})[key] = [1, n]; wr('studio.json', st)
    JOB["done"] = json.dumps({"key": key, "frames": n}); JOB["reload"] = True

# ================= 🎞️ التايملاين (references/timeline.md) =================
# كل ملفات التايملاين المساعدة بـ<work>/.timeline/ (نسخة خفيفة للمعاينة · موجة الصوت · صور مصغّرة · مسودة · معاينة مقطع).
# ما يكتب ملفات السكل إلا «طبّق»: cut.json · fixes.json · sfx.json — وبعدها نفس السكربتات (02 · 03 · 04 · 05 · 06).
TLM = {"busy": False, "proxy": False, "peaks": False, "thumbs": None, "err": None}
def T(*a): return P('.timeline', *a)
def _probe_dur(f):
    try: return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout.strip() or 0)
    except Exception: return 0.0

def tl_media():
    """يجهّز (مرة وحدة، بالخلفية): نسخة H.264 خفيفة بمفاتيح كثيفة (قفز دقيق بأي متصفح، حتى لو src.mov HEVC/HDR) · قمم الموجة · صور مصغّرة."""
    if TLM["busy"]: return
    TLM["busy"] = True
    def run():
        try:
            os.makedirs(T(), exist_ok=True); src = P('src.mov'); dur = _probe_dur(src)
            if not os.path.exists(T('peaks.json')):
                rate = 100 if dur < 600 else 40; sr = 8000; step = sr // rate
                pr = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-vn', '-ac', '1', '-ar', str(sr), '-f', 's16le', '-'], capture_output=True)
                import array
                a = array.array('h'); a.frombytes(pr.stdout[:len(pr.stdout) // 2 * 2])
                if sys.byteorder == 'big': a.byteswap()
                pk = []
                for i in range(0, len(a), step):
                    ch = a[i:i + step]; m = max(max(ch), -min(ch)) if len(ch) else 0
                    pk.append(min(255, int(m / 128)))
                mx = max(pk) if pk else 1
                with open(T('peaks.json'), 'w') as f: json.dump({"rate": rate, "max": mx, "peaks": pk}, f, separators=(',', ':'))
            TLM["peaks"] = True
            if not os.path.exists(T('thumbs', 'index.json')):
                iv = max(1.0, round(dur / 150, 2)); shutil.rmtree(T('thumbs'), ignore_errors=True); os.makedirs(T('thumbs'))
                subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-vf', f'fps=1/{iv},scale=-2:96', '-q:v', '6', T('thumbs', '%04d.jpg')])
                n = len([x for x in os.listdir(T('thumbs')) if x.endswith('.jpg')])
                with open(T('thumbs', 'index.json'), 'w') as f: json.dump({"iv": iv, "n": n}, f)
            TLM["thumbs"] = rd(os.path.join('.timeline', 'thumbs', 'index.json'))
            if not os.path.exists(T('proxy.mp4')):
                tmp = T('proxy.tmp.mp4')
                r = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-vf', 'scale=-2:640,format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26',
                                    '-g', '15', '-keyint_min', '15', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-y', tmp], capture_output=True, text=True)
                if r.returncode == 0: os.replace(tmp, T('proxy.mp4'))
                else: TLM["err"] = 'proxy: ' + (r.stderr or '')[-200:]
            TLM["proxy"] = os.path.exists(T('proxy.mp4'))
        except Exception as e: TLM["err"] = str(e)[:300]
        finally: TLM["busy"] = False
    threading.Thread(target=run, daemon=True).start()

def _lib_catalog():
    skill = os.path.dirname(HERE)
    for c in (os.path.join(os.path.dirname(os.path.dirname(skill)), 'library', 'sfx', 'catalog.json'), os.path.join(skill, 'library', 'sfx', 'catalog.json')):
        if os.path.exists(c):
            try:
                with open(c, encoding='utf-8') as f: return json.load(f)
            except Exception: return None
    return None

def tl_state():
    if not TLM["busy"] and not (TLM["proxy"] and TLM["peaks"] and TLM["thumbs"]): tl_media()
    st = state()
    final = [f for f in ('ad-final.mp4', 'ad-master.mp4') if os.path.exists(P(f))]
    return {"work": W, "cut": st["cut"], "a": rd('a.json', {"segments": []}), "fixes": rd('fixes.json', {"fix": []}), "sfx": rd('sfx.json', {"outro": 3.5}),
            "srcDur": st["srcDur"] or _probe_dur(P('src.mov')), "capsTotal": st["caps"].get('total', 0), "scenes": st["studio"].get('scenes', []),
            "stickers": st["studio"].get('stickers', []), "theme": st["theme"], "lib": _lib_catalog(), "draft": rd(os.path.join('.timeline', 'draft.json')),
            "media": {"proxy": TLM["proxy"], "peaks": TLM["peaks"], "thumbs": TLM["thumbs"], "busy": TLM["busy"], "err": TLM["err"]},
            "files": {"final": final[0] if final else None, "cutz": os.path.exists(P('cutz.mp4')), "preview": os.path.exists(T('preview.mp4')),
                      "mtime": int(os.path.getmtime(P(final[0]))) if final else 0}}

def _render_all(force=True):
    cmd = ['node', os.path.join(S, '04_render_frames.js'), W, 'all'] + (['--force'] if force else [])
    log('$ 04_render_frames.js all' + (' --force' if force else ''))
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding='utf-8', errors='replace')
    for line in p.stdout:
        m = re.search(r'فريم\s+(\d+)\s*/\s*(\d+)', line)
        if m and int(m.group(2)): JOB["pct"] = min(99, int(int(m.group(1)) * 100 / int(m.group(2)))); continue
        log(line)
        if 'فريم مرسوم من' in line: time.sleep(1.5); p.kill(); break   # نفس do_render: كروم أحياناً يعلّق بعد آخر فريم
    p.wait()

def captions_for_keep(keep):
    """02_captions.py يلصق كلمات الجزء المحذوف بطرف أقرب مقطع — فنخفيها مؤقتاً ("" بـfixes.json = تنشال من الكابشن) ثم نرجّع fixes.json زي ما هو."""
    fx = rd('fixes.json'); a = rd('a.json', {"segments": []}); eff = json.loads(json.dumps(fx)); hid = 0
    inside = lambda w: any(x - 0.02 <= (w['start'] + w['end']) / 2 <= y + 0.02 for x, y in keep)
    for i, sg in enumerate(a.get('segments', [])):
        ws = sg.get('words', [])
        if i >= len(eff['fix']) or not ws: continue
        f = eff['fix'][i]; ins = [inside(w) for w in ws]
        if isinstance(f, list) and len(f) == len(ws):
            for j, ok in enumerate(ins):
                if not ok and f[j]: f[j] = ''; hid += 1
        elif isinstance(f, str) and not any(ins): eff['fix'][i] = [''] * len(ws); hid += len(ws)
    if hid: log(f"🙈 {hid} كلمة بأجزاء محذوفة ما تطلع بالكابشن")
    try:
        if hid: wr('fixes.json', eff)
        sh([PY, os.path.join(S, '02_captions.py'), W])
    finally:
        if hid: wr('fixes.json', fx)

def do_tl_apply(d):
    """يكتب cut.json/fixes.json/sfx.json ثم يعيد بس الخطوات اللازمة: 02 → 03 → فريمات → 04 → 05 → 06."""
    old = rd('cut.json'); old_caps = rd('caps.json'); old_keep = old['keep']
    os.makedirs(P('.studio_bak'), exist_ok=True)
    for f in ('cut.json', 'caps.json', 'studio.json', 'sfx.json', 'fixes.json'):
        if os.path.exists(P(f)): shutil.copy(P(f), P('.studio_bak', f))
    keep = [[round(float(a), 3), round(float(b), 3)] for a, b in d['keep'] if float(b) - float(a) >= 0.1]
    if not keep: raise RuntimeError('ما فيه ولا مقطع باقي')
    keep_ch = keep != [[round(a, 3), round(b, 3)] for a, b in old_keep]
    zooms = {k: float(v) for k, v in (d.get('zooms') or {}).items()}
    oz = old.get('zooms') if isinstance(old.get('zooms'), dict) else {}
    zoom_ch = keep_ch or any(abs(float(oz.get(k, -1)) - v) > 1e-6 for k, v in zooms.items())   # الزوم بس لمقاطع keep الحالية
    fix_ch = False
    if d.get('fix') is not None:
        fx = rd('fixes.json', {}); fix_ch = d['fix'] != fx.get('fix')
        if fix_ch: wr('fixes.json', {**fx, "fix": d['fix']})
    if keep_ch or zoom_ch or '_tl_removed' in d:
        wr('cut.json', {**old, "keep": keep, "total": round(sum(b - a for a, b in keep), 5), "zooms": zooms or old.get('zooms', {}),
                        "_zsrc": d.get('_zsrc') or old.get('_zsrc', {}), "_tl_removed": d.get('_tl_removed', [])})
    if d.get('sfx') is not None:
        cur = rd('sfx.json', {"outro": 3.5}); wr('sfx.json', {"outro": cur.get('outro', 3.5), **d['sfx']})
    if keep_ch or fix_ch:
        JOB["stage"] = "الكابشن"; log("📝 أعيد توقيت الكابشن…"); captions_for_keep(keep); reapply_words(old_caps)
    if zoom_ch:
        JOB["stage"] = "القص والزوم"; log("✂️ أقصّ وأزوّم…"); sh([PY, os.path.join(S, '03_cut_zoom.py'), W])
        JOB["stage"] = "الفريمات"; shutil.rmtree(P('vfr'), ignore_errors=True); os.makedirs(P('vfr'))
        sh(['ffmpeg', '-v', 'error', '-i', P('cutz.mp4'), '-vf', 'fps=30', '-q:v', '3', '-y', P('vfr', '%05d.jpg')])
        if keep_ch:
            shift_studio(old_keep, keep, do_sfx=False)   # المشاهد والملصقات تمشي مع القص — sfx.json وصل محوّل من الصفحة
            for f in ('behind.json',):
                try: os.remove(P(f))
                except FileNotFoundError: pass
            shutil.rmtree(P('bt'), ignore_errors=True)
    nout = len(os.listdir(P('out'))) if os.path.isdir(P('out')) else 0
    if zoom_ch or fix_ch or nout == 0 or d.get('force_render'):
        JOB["stage"] = "الرسم"; JOB["pct"] = 0; log("🎨 أرسم الكابشن والموشن فوق الفريمات…"); _render_all(True)
    JOB["stage"] = "المؤثرات"; JOB["pct"] = 100; sh([PY, os.path.join(S, '05_sfx.py'), W])
    JOB["stage"] = "التجميع"
    for f in ('ad-final.mp4', 'ad-master.mp4'):
        try: os.remove(P(f))
        except FileNotFoundError: pass
    sh(['bash', os.path.join(S, '06_encode.sh'), W, P('ad-final.mp4')])
    if not os.path.exists(P('ad-final.mp4')): raise RuntimeError('ما طلع ad-final.mp4')
    try: os.remove(T('draft.json'))
    except FileNotFoundError: pass
    JOB["stage"] = "خلص"; JOB["done"] = 'ad-final.mp4'; JOB["reload"] = True

def do_tl_preview(a, b):
    """يرسم نافذة وحدة (زمن الإخراج) ويطلّع منها .timeline/preview.mp4 بالصوت والمؤثرات."""
    a, b = max(0.0, a), max(a + 0.5, b); fps = 30
    JOB["stage"] = "رسم النافذة"
    sh(['node', os.path.join(S, '04_render_frames.js'), W, 'range', '%.2f' % a, '%.2f' % b])
    if not os.path.exists(P('sfx.wav')): sh([PY, os.path.join(S, '05_sfx.py'), W])
    os.makedirs(T(), exist_ok=True); i0 = int(a * fps); n = max(1, int(round((b - a) * fps)))   # out/ يبدأ من 00000
    JOB["stage"] = "تجميع المعاينة"
    sh(['ffmpeg', '-v', 'error', '-framerate', str(fps), '-start_number', str(i0), '-i', P('out', '%05d.jpg'), '-ss', '%.3f' % a, '-t', '%.3f' % (b - a), '-i', P('cutz.mp4'),
        '-ss', '%.3f' % a, '-t', '%.3f' % (b - a), '-i', P('sfx.wav'), '-frames:v', str(n),
        '-filter_complex', '[1:a][2:a]amix=inputs=2:duration=first:normalize=0[am]', '-map', '0:v', '-map', '[am]',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', '-y', T('preview.mp4')])
    JOB["done"] = json.dumps({"preview": '.timeline/preview.mp4', "a": a, "b": b})

# ================= 🎯 التتبّع (references/tracking.md · engine/track/track.py) =================
# يتتبّع على cutz.mp4 (زمن الإخراج وإحداثيات الفريمات اللي يرسم فوقها المحرّك) — ولو ما فيه، src.mov (زمن المصدر).
TRACK_PY = os.environ.get('IO_TRACK') or os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(HERE))), 'engine', 'track', 'track.py')
_VINFO = {}
def track_video():
    rel = 'cutz.mp4' if os.path.exists(P('cutz.mp4')) else 'src.mov'
    f = P(rel); key = (rel, os.path.getmtime(f) if os.path.exists(f) else 0)
    if _VINFO.get('key') != key:
        w = h = 0; fps = 30.0
        try:
            out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate:stream_side_data=rotation:stream_tags=rotate',
                                  '-of', 'json', f], capture_output=True, text=True).stdout
            st = (json.loads(out or '{}').get('streams') or [{}])[0]; w, h = int(st.get('width') or 0), int(st.get('height') or 0)
            rot = abs(int(float((st.get('tags') or {}).get('rotate') or next((d.get('rotation') for d in st.get('side_data_list') or [] if 'rotation' in d), 0) or 0)))
            if rot in (90, 270): w, h = h, w
            a, b = (st.get('r_frame_rate') or '30/1').split('/'); fps = float(a) / float(b or 1) if float(b or 1) else 30.0
        except Exception: pass
        _VINFO.update(key=key, size=[w, h], fps=round(fps, 3))
    clock = 'out' if rel == 'cutz.mp4' else 'src'
    url = '/cutz.mp4' if clock == 'out' else ('/.timeline/proxy.mp4' if os.path.exists(T('proxy.mp4')) else '/src.mov')
    return {"path": rel, "clock": clock, "url": url, "size": _VINFO.get('size'), "fps": _VINFO.get('fps'), "ok": os.path.exists(f)}

def track_safe(name):
    n = re.sub(r'[^\w\-.]+', '-', str(name or ''), flags=re.UNICODE).strip('.-')[:40]
    if not n: raise RuntimeError('اسم التتبّع فاضي')
    return n

def track_list():
    out = []
    d = P('track')
    for fn in sorted(os.listdir(d)) if os.path.isdir(d) else []:
        if not fn.endswith('.json'): continue
        try:
            with open(os.path.join(d, fn), encoding='utf-8') as f: doc = json.load(f)
            fr = doc.get('frames') or []
            if not isinstance(fr, list) or doc.get('type') not in ('plane', 'box', 'point'): continue
            cs = [x.get('conf', 0) for x in fr]
            out.append({"name": fn[:-5], "type": doc['type'], "video": doc.get('video'), "clock": doc.get('clock'), "size": doc.get('size'), "fps": doc.get('fps'),
                        "range": [fr[0]['t'], fr[-1]['t']] if fr else None, "n": len(fr), "conf": round(sum(cs) / len(cs), 2) if cs else 0,
                        "lost": (doc.get('lost') or {}).get('fwd'), "keys": [k.get('t') for k in doc.get('keys') or []], "mtime": int(os.path.getmtime(os.path.join(d, fn)))})
        except Exception: continue
    st = rd('studio.json') or {}
    return {"video": track_video(), "tracks": out, "studio": {k: v for k, v in st.items() if isinstance(v, list) and k != 'scenes'}, "tool": os.path.exists(TRACK_PY)}

def do_track(d):
    kind = d.get('type')
    if kind not in ('plane', 'box', 'point'): raise RuntimeError('نوع التتبّع غلط')
    if not os.path.exists(TRACK_PY): raise RuntimeError('ما لقيت engine/track/track.py')
    os.makedirs(P('track'), exist_ok=True)
    name = track_safe(d.get('name') or '%s-%g' % (kind, round(float(d['at']), 1)))
    out = P('track', name + '.json')
    shape = []
    if kind == 'plane': shape = ['--quad', ','.join('%.1f' % float(c) for p in d['quad'] for c in p)]
    elif kind == 'box': shape = ['--box', ','.join('%.1f' % float(c) for c in d['box'])]
    else:
        for k, v in (d.get('points') or {}).items(): shape += ['--pt', '%s=%.1f,%.1f' % (re.sub(r'[^\w]+', '', k) or 'p', float(v[0]), float(v[1]))]
    if d.get('fix'):
        if not os.path.exists(out): raise RuntimeError('ما فيه تتبّع بهالاسم أصلحه')
        cmd = [PY, TRACK_PY, 'fix', out, '--at', '%.3f' % float(d['at'])] + shape + ['--progress']
    else:
        cmd = [PY, TRACK_PY, kind, P(track_video()['path']), '--at', '%.3f' % float(d['at'])] + shape + ['--out', out, '--name', name, '--progress']
        if d.get('to') is not None: cmd += ['--to', '%.3f' % float(d['to'])]
        if d.get('back'): cmd += ['--back']
    JOB["stage"] = "التتبّع"; JOB["pct"] = 0
    log('$ track.py ' + ' '.join(os.path.basename(c) if os.sep in str(c) else str(c) for c in cmd[2:]))
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding='utf-8', errors='replace', cwd=W)
    tail = ''
    for line in p.stdout:
        m = re.search(r'تقدّم\s+(\d+)%', line)
        if m: JOB["pct"] = int(m.group(1)); continue
        log(line); tail = (tail + line)[-400:]
    p.wait()
    if p.returncode: raise RuntimeError('التتبّع فشل: ' + tail.strip()[-300:])
    JOB["pct"] = 100; JOB["done"] = json.dumps({"name": name})

def track_attach(d):
    st = rd('studio.json') or {}
    lst, i = d.get('list'), d.get('i')
    if lst == 'scenes' or not isinstance(st.get(lst), list) or not isinstance(i, int) or not (0 <= i < len(st[lst])) or not isinstance(st[lst][i], dict):
        raise RuntimeError('العنصر مو موجود بـstudio.json')
    name = d.get('name')
    if name:
        name = track_safe(name)
        if not os.path.exists(P('track', name + '.json')): raise RuntimeError('ما فيه تتبّع بهالاسم')
        st[lst][i]['track'] = name
    else: st[lst][i].pop('track', None)
    wr('studio.json', st)

def track_delete(name):
    name = track_safe(name)
    for f in (P('track', name + '.json'), P('track', name + '.preview.mp4')):
        try: os.remove(f)
        except FileNotFoundError: pass
    st = rd('studio.json')
    if st:
        ch = False
        for k, v in st.items():
            if k == 'scenes' or not isinstance(v, list): continue
            for el in v:
                if isinstance(el, dict) and el.get('track') == name: el.pop('track'); ch = True
        if ch: wr('studio.json', st)

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=W, **k)
    def log_message(self, *a): pass
    def _json(self, code, obj):
        b = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code); self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
    def _html(self, name):
        b = open(os.path.join(HERE, name), 'rb').read()
        self.send_response(200); self.send_header('Content-Type', 'text/html; charset=utf-8'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
    def end_headers(self): self.send_header('Cache-Control', 'no-store'); self.send_header('Accept-Ranges', 'bytes'); super().end_headers()
    def do_GET(self):
        p = self.path.split('?')[0]
        if p in ('/', '/m', '/m/'): return self._html('studio-mobile.html')
        if p == '/share': return self._html('studio-share.html')
        if p in ('/timeline', '/timeline/', '/t'): return self._html('timeline.html')
        if p == '/timeline-core.js':
            b = open(os.path.join(HERE, 'timeline-core.js'), 'rb').read()
            self.send_response(200); self.send_header('Content-Type', 'text/javascript; charset=utf-8'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b); return
        if p.startswith('/api/tl/state'): return self._json(200, tl_state())
        if p.startswith('/api/tl/peaks'): return self._json(200, rd(os.path.join('.timeline', 'peaks.json'), {"rate": 100, "peaks": []}))
        if p.startswith('/sfx_prev/'):
            f = os.path.join(HERE, 'sfx_prev', os.path.basename(p))
            if os.path.exists(f):
                b = open(f, 'rb').read(); self.send_response(200); self.send_header('Content-Type', 'audio/wav'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b); return
        if p.startswith('/api/track/list'): return self._json(200, track_list())
        if p.startswith('/api/state'): return self._json(200, state())
        if p.startswith('/api/comments'): return self._json(200, rd('comments.json', []))
        if p.startswith('/api/progress'):
            return self._json(200, {"running": JOB["running"], "kind": JOB["kind"], "log": JOB["log"][-1800:], "done": JOB["done"], "err": JOB["err"], "reload": JOB["reload"], "stage": JOB["stage"], "pct": JOB["pct"], "elapsed": round(time.time() - JOB["started"]) if JOB["started"] else 0})
        return self._ranged() if self._wants_range() else super().do_GET()
    def _wants_range(self): return bool(self.headers.get('Range'))
    def _ranged(self):
        """طلبات Range (206) — بدونها المتصفح ما يقدر يقفز داخل cutz.mp4 ويشغّل دايماً من البداية (سبب مشكلة المؤشر)."""
        path = self.translate_path(self.path.split('?')[0])
        if not os.path.isfile(path): return self.send_error(404)
        size = os.path.getsize(path); m = re.match(r'bytes=(\d*)-(\d*)', self.headers.get('Range', ''))
        a = int(m.group(1)) if m and m.group(1) else 0; b = int(m.group(2)) if m and m.group(2) else size - 1; b = min(b, size - 1)
        if a > b: return self.send_error(416)
        self.send_response(206); self.send_header('Content-Type', self.guess_type(path)); self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Range', f'bytes {a}-{b}/{size}'); self.send_header('Content-Length', str(b - a + 1)); self.end_headers()
        with open(path, 'rb') as f:
            f.seek(a); left = b - a + 1
            while left > 0:
                chunk = f.read(min(1 << 20, left))
                if not chunk: break
                try: self.wfile.write(chunk)
                except (BrokenPipeError, ConnectionResetError): break
                left -= len(chunk)
    def do_POST(self):
        p = self.path.split('?')[0]; n = int(self.headers.get('Content-Length') or 0); raw = self.rfile.read(n)
        if p.startswith('/api/broll'):
            name = urllib.parse.unquote(self.headers.get('X-Name') or 'clip.mov')
            ok = job('broll', lambda: do_broll(name, raw)); return self._json(200 if ok else 409, {"ok": ok})
        data = json.loads(raw or b'{}')
        if p.startswith('/api/tl/draft'):
            os.makedirs(T(), exist_ok=True)
            if data.get('clear'):
                try: os.remove(T('draft.json'))
                except FileNotFoundError: pass
            else: wr(os.path.join('.timeline', 'draft.json'), data)
            return self._json(200, {"ok": True})
        if p.startswith('/api/tl/apply'): ok = job('tl_apply', lambda: do_tl_apply(data)); return self._json(200 if ok else 409, {"ok": ok, "msg": "" if ok else "فيه عملية شغالة"})
        if p.startswith('/api/tl/preview'): ok = job('tl_preview', lambda: do_tl_preview(float(data['a']), float(data['b']))); return self._json(200 if ok else 409, {"ok": ok, "msg": "" if ok else "فيه عملية شغالة"})
        if p.startswith('/api/track/run'): ok = job('track', lambda: do_track(data)); return self._json(200 if ok else 409, {"ok": ok, "msg": "" if ok else "فيه عملية شغالة"})
        if p.startswith('/api/track/attach') or p.startswith('/api/track/delete'):
            try:
                if p.startswith('/api/track/attach'): track_attach(data)
                else: track_delete(data.get('name'))
            except Exception as e: return self._json(400, {"ok": False, "msg": str(e)[:200]})
            return self._json(200, {"ok": True, **track_list()})
        if p.startswith('/api/save'):
            if data.get('caps'): wr('caps.json', data['caps'])
            if data.get('theme'): wr('theme.json', data['theme'])
            if data.get('studio') is not None:
                st = data['studio']; sfx = st.pop('sfx', None); wr('studio.json', st)
                if sfx is not None: cur = rd('sfx.json', {"outro": 3.5}); wr('sfx.json', {"outro": cur.get('outro', 3.5), **{k: v for k, v in sfx.items() if v}})
            return self._json(200, {"ok": True})
        if p.startswith('/api/comment'):
            cs = rd('comments.json', []); cs.append({"t": data.get('t'), "who": (data.get('who') or 'عميل')[:40], "text": (data.get('text') or '')[:500], "at": time.strftime('%Y-%m-%d %H:%M')}); wr('comments.json', cs); return self._json(200, {"ok": True})
        if p.startswith('/api/render'):  ok = job('render', lambda: do_render(data.get('range')))
        elif p.startswith('/api/recut'): ok = job('recut', lambda: do_recut(data['keep']))
        elif p.startswith('/api/drop'):  ok = job('drop', lambda: do_drop(data['cards']))
        elif p.startswith('/api/behind'): ok = job('behind', lambda: do_behind(data['cards']))
        elif p.startswith('/api/cutout'): ok = job('cutout', lambda: do_cutout(float(data['from']), float(data['to'])))
        elif p.startswith('/api/undo_cut'): ok = job('undo_cut', do_undo_cut)
        else: return self._json(404, {"ok": False})
        return self._json(200 if ok else 409, {"ok": ok, "msg": "" if ok else "فيه عملية شغالة"})

def lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(('8.8.8.8', 80)); ip = s.getsockname()[0]; s.close(); return ip
    except Exception: return '127.0.0.1'

if __name__ == '__main__':
    if not os.path.exists(P('compose.html')): sys.exit('❌ ما فيه compose.html بمجلد الشغل')
    srv = http.server.ThreadingHTTPServer(('0.0.0.0', PORT), H)
    print(f"📱 الاستوديو شغّال — بالجوال (نفس الواي فاي): http://{lan_ip()}:{PORT}/m   · بالجهاز: http://127.0.0.1:{PORT}/m   · للعميل: /share")
    print(f"🎞️ التايملاين (قص · كابشن · زوم · مؤثرات): http://127.0.0.1:{PORT}/timeline")
    tl_media()
    try: srv.serve_forever()
    except KeyboardInterrupt: pass
