#!/usr/bin/env python3
"""مرتب الرحلات — يرتب صور رحلة حسب المدينة والفعالية.

مصدران للصور:
  ماك (تطبيق الصور):   trip.py fetch <work> --query "Thailand" [--from 2026-08-27 --to 2026-09-08]
  أي نظام (مجلد صور):  trip.py scan  <work> --dir "D:/Photos/Thailand" [--from … --to …] [--name "تايلند"]
ثم نفس الخطوات للاثنين:
  trip.py events <work> [--gap 90 --km 2 --min 10] [--geo auto|apple|osm|offline|none]
  trip.py page   <work> [--shape M]
  trip.py thumbs <work> · trip.py review <work>
  trip.py albums <work> --folder "رحلة تايلند" [--only "اسم,اسم"] [--no-airports] [--out مجلد]

ماك + تطبيق الصور: يقرا اسم الملف والتاريخ واللوكيشن بس، وأسماء الأماكن من خريطة أبل (CLGeocoder).
مجلد صور (ويندوز/لينكس/ماك): التاريخ والـGPS من EXIF (Pillow · HEIC يحتاج pillow-heif · الفيديو من ffprobe)،
وأسماء الأماكن: خريطة أبل لو ماك، وإلا OpenStreetMap (Nominatim — مجاني، يرسل إحداثيات وسط كل فعالية بس، طلب بالثانية)،
أو offline (مكتبة reverse_geocoder — اسم المدينة بس، بلا إنترنت). الألبومات بالمجلد = مجلدات فيها روابط للصور (أو نسخ).
"""
import argparse, json, math, os, re, shutil, subprocess, sys, tempfile, time
from datetime import datetime

for _s in (sys.stdout, sys.stderr):          # ويندوز: cp1252 يكسر العربي
    try: _s.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass
IS_MAC = sys.platform == 'darwin'

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, '..', 'assets')


def osa(script, timeout=600):
    if not IS_MAC or not shutil.which('osascript'):
        sys.exit('تطبيق الصور موجود بالماك بس — على هالجهاز استخدم مجلد صور: trip.py scan <work> --dir <المجلد>')
    r = subprocess.run(['osascript', '-e', script], capture_output=True, text=True, timeout=timeout)
    if r.returncode:
        sys.exit('تطبيق الصور رفض: ' + r.stderr.strip() + '\n(System Settings ← Privacy ← Automation ← اسمح للطرفية تتحكم بـPhotos)')
    return r.stdout


def esc(s):
    return s.replace('\\', '\\\\').replace('"', '\\"')


def load(work):
    with open(os.path.join(work, 'trip.json'), encoding='utf-8') as f: return json.load(f)


def save(work, data):
    with open(os.path.join(work, 'trip.json'), 'w', encoding='utf-8') as f: json.dump(data, f, ensure_ascii=False, indent=1)


def open_url(url):
    """يفتح الرابط بالمتصفح. الماك: osascript (لأن `open` يشيل ?query من روابط file). غيره: webbrowser."""
    if IS_MAC and shutil.which('osascript'):
        subprocess.run(['osascript', '-e', f'open location "{url}"'])
    else:
        import webbrowser
        webbrowser.open(url)


# ---------- 1) fetch ----------
def fetch(a):
    os.makedirs(a.work, exist_ok=True)
    out = osa(f'''tell application "Photos"
set r to search for "{esc(a.query)}"
set out to ""
repeat with m in r
  set loc to location of m
  set la to ""
  set lo to ""
  try
    set la to (item 1 of loc) as text
    set lo to (item 2 of loc) as text
  end try
  set out to out & (id of m) & tab & (filename of m) & tab & ((date of m) as «class isot» as string) & tab & la & tab & lo & linefeed
end repeat
return out
end tell''', timeout=1800)
    files = []
    for line in out.splitlines():
        p = line.split('\t')
        if len(p) < 5: continue
        d = p[2][:10]
        if a.from_ and d < a.from_: continue
        if a.to and d > a.to: continue
        try: lat, lon = round(float(p[3]), 5), round(float(p[4]), 5)
        except ValueError: lat = lon = None
        if lat == 0 and lon == 0: lat = lon = None
        files.append({'id': p[0], 'f': p[1], 't': p[2], 'd': d, 'lat': lat, 'lon': lon})
    files.sort(key=lambda r: r['t'])
    save(a.work, {'query': a.query, 'files': files, 'events': []})
    days = sorted({f['d'] for f in files})
    print(f'{len(files)} ملف · {sum(f["lat"] is not None for f in files)} فيها لوكيشن · من {days[0] if days else "-"} إلى {days[-1] if days else "-"}')


# ---------- 1b) scan: مجلد صور عادي (ويندوز · لينكس · ماك) ----------
IMG_EXT = ('.jpg', '.jpeg', '.png', '.heic', '.heif', '.tif', '.tiff', '.webp', '.dng')
VID_EXT = ('.mov', '.mp4', '.m4v', '.3gp')


def _heif():
    try:
        import pillow_heif; pillow_heif.register_heif_opener(); return True
    except Exception: return False


def _dms(v, ref):
    try:
        d, m, s = (float(x) for x in v)
        deg = d + m / 60 + s / 3600
        return -deg if str(ref).upper() in ('S', 'W') else deg
    except Exception: return None


def exif_info(path):
    """(وقت ISO أو None, lat, lon) من EXIF — Pillow."""
    from PIL import Image
    try:
        with Image.open(path) as im: ex = im.getexif()
    except Exception: return None, None, None
    t = None
    try: t = ex.get_ifd(0x8769).get(0x9003) or ex.get_ifd(0x8769).get(0x9004)   # DateTimeOriginal / Digitized
    except Exception: pass
    t = t or ex.get(0x0132)                                                     # DateTime
    iso = None
    if t:
        try: iso = datetime.strptime(str(t).strip()[:19], '%Y:%m:%d %H:%M:%S').isoformat()
        except ValueError: pass
    lat = lon = None
    try:
        g = ex.get_ifd(0x8825)
        if g and 2 in g and 4 in g: lat, lon = _dms(g[2], g.get(1, 'N')), _dms(g[4], g.get(3, 'E'))
    except Exception: pass
    return iso, lat, lon


def video_info(path):
    """(وقت ISO, lat, lon) من وسوم الفيديو (آيفون: com.apple.quicktime.location.ISO6709)."""
    if not shutil.which('ffprobe'): return None, None, None
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format_tags', '-of', 'json', path], capture_output=True, text=True)
    try: tags = {k.lower(): v for k, v in json.loads(r.stdout or '{}').get('format', {}).get('tags', {}).items()}
    except ValueError: tags = {}
    t = tags.get('com.apple.quicktime.creationdate') or tags.get('creation_time')
    iso = None
    if t:
        try:
            dt = datetime.fromisoformat(t.replace('Z', '+00:00'))
            iso = (dt.astimezone().replace(tzinfo=None) if dt.tzinfo else dt).isoformat(timespec='seconds')
        except ValueError: pass
    loc = tags.get('com.apple.quicktime.location.iso6709') or tags.get('location') or ''
    m = re.match(r'([+-]\d+(?:\.\d+)?)([+-]\d+(?:\.\d+)?)', loc)
    return iso, (float(m.group(1)) if m else None), (float(m.group(2)) if m else None)


def scan(a):
    root = os.path.abspath(a.dir)
    if not os.path.isdir(root): sys.exit(f'ما لقيت المجلد: {root}')
    os.makedirs(a.work, exist_ok=True)
    heif = _heif()
    files, no_heif = [], 0
    for dp, dn, fn in os.walk(root):
        dn[:] = [d for d in dn if not d.startswith('.')]
        for name in fn:
            ext = os.path.splitext(name)[1].lower()
            if ext not in IMG_EXT + VID_EXT or name.startswith('.'): continue
            p = os.path.join(dp, name)
            if ext in VID_EXT: t, lat, lon = video_info(p)
            elif ext in ('.heic', '.heif') and not heif: t, lat, lon = None, None, None; no_heif += 1
            else: t, lat, lon = exif_info(p)
            t = t or datetime.fromtimestamp(os.path.getmtime(p)).isoformat(timespec='seconds')   # بلا EXIF: وقت الملف
            d = t[:10]
            if a.from_ and d < a.from_: continue
            if a.to and d > a.to: continue
            if lat is not None and lon is not None: lat, lon = round(lat, 5), round(lon, 5)
            if lat == 0 and lon == 0: lat = lon = None
            files.append({'id': os.path.relpath(p, root).replace(os.sep, '/'), 'f': name, 't': t, 'd': d, 'lat': lat, 'lon': lon})
    files.sort(key=lambda r: r['t'])
    save(a.work, {'query': a.name or os.path.basename(root.rstrip('/\\')), 'source': 'folder', 'root': root, 'files': files, 'events': []})
    days = sorted({f['d'] for f in files})
    print(f'{len(files)} ملف · {sum(f["lat"] is not None for f in files)} فيها لوكيشن · من {days[0] if days else "-"} إلى {days[-1] if days else "-"}')
    if no_heif:
        print(f'⚠️ {no_heif} صورة HEIC بلا تاريخ ولوكيشن — نصّب القارئ وعيد: python -m pip install --user pillow-heif')


# ---------- 2) events ----------
GEO_SWIFT = r'''
import CoreLocation
import Foundation
let a = CommandLine.arguments.dropFirst().map { Double($0)! }
var i = 0
let g = CLGeocoder()
func next() {
  if i >= a.count { exit(0) }
  let loc = CLLocation(latitude: a[i], longitude: a[i+1]); i += 2
  g.reverseGeocodeLocation(loc, preferredLocale: Locale(identifier: "en")) { p, e in
    let m = p?.first
    let parts = [m?.areasOfInterest?.first ?? "", m?.name ?? "", m?.subLocality ?? "", m?.locality ?? "", m?.administrativeArea ?? "", m?.country ?? "", m?.isoCountryCode ?? ""]
    print(parts.joined(separator: "\t"))
    fflush(stdout)
    DispatchQueue.main.asyncAfter(deadline: .now() + 1.3) { next() }
  }
}
next()
RunLoop.main.run()
'''


def geocode(points, how='auto'):
    """[[aoi, name, subLocality, locality, admin, country, cc] أو None] لكل نقطة.
       auto: خريطة أبل بالماك ← وإلا OpenStreetMap. offline: reverse_geocoder (المدينة بس). none: بلا أسماء."""
    if not points or how == 'none': return [None] * len(points)
    if how == 'auto': how = 'apple' if IS_MAC and shutil.which('swift') else 'osm'
    if how == 'osm': return geocode_osm(points)
    if how == 'offline': return geocode_offline(points)
    if not shutil.which('swift'): return [None] * len(points)
    with tempfile.NamedTemporaryFile('w', suffix='.swift', delete=False) as f: f.write(GEO_SWIFT)
    args = [str(v) for p in points for v in p]
    r = subprocess.run(['swift', f.name, *args], capture_output=True, text=True, timeout=60 + 4 * len(points))
    rows = [l.split('\t') for l in r.stdout.splitlines()]
    return rows + [None] * (len(points) - len(rows))


AOI_CATS = {'tourism', 'leisure', 'amenity', 'shop', 'aeroway', 'natural', 'historic', 'building', 'man_made', 'railway'}


def osm_fields(j):
    """رد Nominatim (jsonv2) ← نفس الحقول السبعة اللي ترجعها خريطة أبل."""
    ad = j.get('address') or {}
    nm = j.get('name') or ''
    aoi = nm if j.get('category') in AOI_CATS else ''
    aoi = aoi or next((ad[k] for k in ('aerodrome', 'aeroway', 'attraction', 'leisure', 'historic') if ad.get(k)), '')
    road = ad.get('road') or ad.get('pedestrian') or ''
    name = f"{ad['house_number']} {road}".strip() if ad.get('house_number') else (nm or road)
    sub = ad.get('suburb') or ad.get('neighbourhood') or ad.get('quarter') or ad.get('city_district') or ''
    city = ad.get('city') or ad.get('town') or ad.get('village') or ad.get('municipality') or ''
    admin = ad.get('state') or ad.get('province') or ad.get('region') or ad.get('county') or ''
    return [aoi, name, sub, city, admin, ad.get('country', ''), (ad.get('country_code') or '').upper()]


def geocode_osm(points):
    """OpenStreetMap Nominatim — مجاني بشرط: طلب واحد بالثانية + اسم برنامج واضح. يرسل الإحداثيات بس."""
    import urllib.parse, urllib.request
    print('🗺️ أسماء الأماكن من OpenStreetMap (يرسل إحداثيات وسط كل فعالية بس — طلب كل ثانية)…', flush=True)
    out = []
    for i, (lat, lon) in enumerate(points):
        q = urllib.parse.urlencode({'format': 'jsonv2', 'lat': lat, 'lon': lon, 'zoom': 18, 'addressdetails': 1, 'accept-language': 'en'})
        req = urllib.request.Request('https://nominatim.openstreetmap.org/reverse?' + q,
                                     headers={'User-Agent': 'io-trips/1.0 (personal trip sorter)'})
        try:
            with urllib.request.urlopen(req, timeout=20) as r: out.append(osm_fields(json.loads(r.read().decode('utf-8'))))
        except Exception as e:
            print(f'  ⚠️ ما رجع اسم ({str(e)[:60]})', flush=True); out.append(None)
        if i < len(points) - 1: time.sleep(1.1)
    return out


def geocode_offline(points):
    """بلا إنترنت: أقرب مدينة من قاعدة GeoNames (pip install reverse_geocoder). ما فيه أسماء معالم."""
    try: import reverse_geocoder as rg
    except ImportError:
        print('⚠️ offline يحتاج: python -m pip install --user reverse_geocoder — الأسماء بتبقى إحداثيات'); return [None] * len(points)
    return [['', '', '', r.get('name', ''), r.get('admin1', ''), r.get('cc', ''), r.get('cc', '')] for r in rg.search(list(points), verbose=False)]


def is_airport(*fields):
    t = ' '.join(fields).lower()
    return bool(re.search(r'\bairport\b|مطار|^(main|passenger|international|domestic) terminal', t))


def events(a):
    data = load(a.work)
    files, evs, cur = data['files'], [], None
    for r in files:
        if r['lat'] is None: continue
        T = datetime.fromisoformat(r['t'])
        if cur:
            km = math.hypot(r['lat'] - cur['lat'], (r['lon'] - cur['lon']) * math.cos(math.radians(r['lat']))) * 111
            if (T - cur['end']).total_seconds() < a.gap * 60 and km < a.km:
                cur['n'] += 1; cur['end'] = T
                cur['lat'] += (r['lat'] - cur['lat']) / cur['n']; cur['lon'] += (r['lon'] - cur['lon']) / cur['n']
                cur['ids'].append(r['id']); continue
        cur = {'start': T, 'end': T, 'lat': r['lat'], 'lon': r['lon'], 'n': 1, 'ids': [r['id']]}
        evs.append(cur)
    big = [e for e in evs if e['n'] >= a.min]
    print(f'{len(big)} فعالية (من {len(evs)} تجمّع) — أطلب أسماءها…')
    names = geocode([(round(e['lat'], 5), round(e['lon'], 5)) for e in big], a.geo)
    out, by_id = [], {}
    for k, (e, g) in enumerate(zip(big, names)):
        aoi, nm, sub, city, admin, country, cc = (g + [''] * 7)[:7] if g else [''] * 7
        # a street address means a house or hotel, so name it after the neighbourhood
        address = any(ch.isdigit() for ch in nm)
        name = (sub or city) if address else (aoi or nm or sub or city)
        name = name or f'{e["lat"]:.3f}, {e["lon"]:.3f}'
        ev = {'id': k, 'name_en': name, 'name': name, 'city': admin or city or country, 'country': country, 'cc': cc,
              'start': e['start'].isoformat(), 'end': e['end'].isoformat(), 'count': e['n'],
              'lat': round(e['lat'], 5), 'lon': round(e['lon'], 5), 'airport': is_airport(name, aoi), 'stay': address}
        out.append(ev)
        for i in e['ids']: by_id[i] = k
    # same place visited twice (the hotel) → one event
    merged = {}
    def km(a, b): return math.hypot(a['lat'] - b['lat'], (a['lon'] - b['lon']) * math.cos(math.radians(a['lat']))) * 111
    for ev in out:
        key = ev['name_en']
        if key not in merged:
            key = next((k for k, m in merged.items() if km(m, ev) < 0.3), key)
        if key in merged:
            m = merged[key]; m['count'] += ev['count']; m['end'] = max(m['end'], ev['end'])
            for i, k in list(by_id.items()):
                if k == ev['id']: by_id[i] = m['id']
        else: merged[key] = ev
    data['events'] = list(merged.values())
    # no province from the geocoder (a beach, open sea) → borrow the nearest event's city
    known = [e for e in data['events'] if e['city'] and e['city'] != e['country']]
    for e in data['events']:
        if known and (not e['city'] or e['city'] == e['country']):
            e['city'] = min(known, key=lambda k: abs(k['lat'] - e['lat']) + abs(k['lon'] - e['lon']))['city']
    for r in files:
        r['ev'] = by_id.get(r['id'])
        if r['ev'] is None and r['lat'] is not None:  # loose shots inherit the nearest event's city
            near = min(data['events'], key=lambda e: abs(e['lat'] - r['lat']) + abs(e['lon'] - r['lon']), default=None)
            r['city'] = near['city'] if near else None
        elif r['ev'] is not None:
            r['city'] = next(e['city'] for e in data['events'] if e['id'] == r['ev'])
    save(a.work, data)
    for ev in sorted(data['events'], key=lambda e: e['start']):
        tag = ' ✈' if ev['airport'] else ' 🏨' if ev['stay'] else ''
        print(f'  {ev["start"][:10]}  {ev["count"]:4d}  {ev["name_en"]} · {ev["city"]}{tag}')


# ---------- 3) page ----------
def page(a):
    data = load(a.work)
    names = {e['id']: e for e in data['events']}
    rows = []
    for r in data['files']:
        ev = names.get(r.get('ev'))
        if ev and ev['airport'] and a.no_airports: continue
        rows.append({'f': r['f'], 'd': r['d'], 'lat': r['lat'], 'lon': r['lon'], 'city': r.get('city'),
                     'ev': ev['name'] if ev else ((r.get('city') or 'بلا لوكيشن') + ' · متفرقات'),
                     'air': bool(ev and ev['airport'])})
    site = os.path.join(a.work, 'page')
    os.makedirs(site, exist_ok=True)
    shutil.copy(os.path.join(ASSETS, 'index.html'), os.path.join(site, 'index.html'))
    with open(os.path.join(site, 'trip-data.js'), 'w') as f:
        f.write('window.TRIP=' + json.dumps({'name': a.name or data['query'], 'home': a.home, 'files': rows}, ensure_ascii=False) + ';\n')
    from pathlib import Path
    url = Path(site, 'index.html').resolve().as_uri() + (f'?shape={a.shape}' if a.shape else '')   # file:///C:/… صح بويندوز
    print(url)
    open_url(url)


# ---------- 4) thumbs + review ----------
def thumbs(a):
    """Export a couple of photos per event, shrink them, delete the big export (private, for the owner's eyes only)."""
    import random
    data = load(a.work)
    out = os.path.join(a.work, 'review', 'thumbs'); os.makedirs(out, exist_ok=True)
    if a.fresh:
        for f in os.listdir(out): os.remove(os.path.join(out, f))
    if data.get('source') == 'folder': return thumbs_folder(a, data, out)
    tmp = tempfile.mkdtemp()
    for ev in sorted(data['events'], key=lambda e: e['start']):
        if all(os.path.exists(os.path.join(out, f'{ev["id"]}-{k}.jpg')) for k in range(a.per)): continue
        mine = [r for r in data['files'] if r.get('ev') == ev['id']]
        photos = [r for r in mine if r['f'].lower().endswith(('.heic', '.jpg', '.jpeg'))]
        pool = photos if len(photos) >= a.per else photos + [r for r in mine if r not in photos]
        # one random pick from each slice of the event, so the two don't come from the same burst
        n = min(a.per, len(pool))
        pick = [random.choice(pool[k * len(pool) // n:(k + 1) * len(pool) // n]) for k in range(n)]
        if not pick: continue
        items = ', '.join(f'media item id "{esc(r["id"])}"' for r in pick)
        osa(f'tell application "Photos" to export {{{items}}} to (POSIX file "{tmp}" as alias) without using originals')
        for k, r in enumerate(pick):
            stem = os.path.splitext(r['f'])[0]
            src = next((os.path.join(tmp, f) for f in os.listdir(tmp) if os.path.splitext(f)[0] == stem), None)
            if not src: continue
            dst = os.path.join(out, f'{ev["id"]}-{k}.jpg')
            if src.lower().endswith(('.mov', '.mp4', '.m4v')):  # a video: let Quick Look draw its poster frame
                subprocess.run(['qlmanage', '-t', '-s', '420', '-o', tmp, src], capture_output=True)
                png = src + '.png'
                if os.path.exists(png):
                    subprocess.run(['sips', '-s', 'format', 'jpeg', png, '--out', dst], capture_output=True); os.remove(png)
            else:
                subprocess.run(['sips', '-Z', '420', '-s', 'format', 'jpeg', src, '--out', dst], capture_output=True)
            os.remove(src)
        print(f'  ✓ {ev["name"]}', flush=True)
    shutil.rmtree(tmp, ignore_errors=True)


def thumb_file(src, dst, size=420):
    """صورة مصغرة 420 بكسل: الصور بـPillow (HEIC بـpillow-heif)، الفيديو أول فريم واضح بـffmpeg."""
    if src.lower().endswith(VID_EXT):
        if not shutil.which('ffmpeg'): return False
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', '1', '-i', src, '-frames:v', '1',
                        '-vf', f'scale={size}:{size}:force_original_aspect_ratio=decrease', dst], capture_output=True)
        return os.path.exists(dst)
    from PIL import Image, ImageOps
    try:
        with Image.open(src) as im:
            im = ImageOps.exif_transpose(im).convert('RGB'); im.thumbnail((size, size)); im.save(dst, quality=85)
        return True
    except Exception: return False


def thumbs_folder(a, data, out):
    import random
    _heif()
    for ev in sorted(data['events'], key=lambda e: e['start']):
        if all(os.path.exists(os.path.join(out, f'{ev["id"]}-{k}.jpg')) for k in range(a.per)): continue
        mine = [r for r in data['files'] if r.get('ev') == ev['id']]
        photos = [r for r in mine if not r['f'].lower().endswith(VID_EXT)]
        pool = photos if len(photos) >= a.per else mine
        n = min(a.per, len(pool))
        pick = [random.choice(pool[k * len(pool) // n:(k + 1) * len(pool) // n]) for k in range(n)]
        for k, r in enumerate(pick):
            thumb_file(os.path.join(data['root'], r['id']), os.path.join(out, f'{ev["id"]}-{k}.jpg'))
        print(f'  ✓ {ev["name"]}', flush=True)


def review(a):
    """Local page: the trip day by day, real thumbs, editable names. Saves straight into trip.json."""
    import http.server
    site = os.path.join(a.work, 'review'); os.makedirs(site, exist_ok=True)
    shutil.copy(os.path.join(ASSETS, 'review.html'), os.path.join(site, 'index.html'))
    work = a.work

    class H(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *x, **k): super().__init__(*x, directory=site, **k)
        def log_message(self, *x): pass
        def do_GET(self):
            if self.path.startswith('/data'):
                body = json.dumps(load(work), ensure_ascii=False).encode()
                self.send_response(200); self.send_header('Content-Type', 'application/json'); self.end_headers(); self.wfile.write(body)
            else: super().do_GET()
        def do_POST(self):
            edits = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            data = load(work)
            for ev in data['events']:
                e = edits.get(str(ev['id']))
                if e: ev['name'] = e['name'].strip() or ev['name']; ev['skip'] = bool(e.get('skip'))
            save(work, data)
            self.send_response(200); self.end_headers(); self.wfile.write(b'ok')

    for port in range(a.port, a.port + 20):  # another app may already own the port
        try: srv = http.server.ThreadingHTTPServer(('127.0.0.1', port), H); break
        except OSError: continue
    url = f'http://localhost:{port}/'
    print(url, flush=True)
    if IS_MAC: subprocess.run(['open', url])
    else:
        import webbrowser; webbrowser.open(url)
    srv.serve_forever()


# ---------- 5) albums ----------
def albums(a):
    data = load(a.work)
    only = {x.strip() for x in a.only.split(',')} if a.only else None
    evs = sorted((e for e in data['events'] if not e.get('skip') and not (a.no_airports and e['airport'])
                  and (not only or e['name'] in only)), key=lambda e: e['start'])
    keep = {e['id'] for e in evs}
    names, by_name = [], {}
    for e in evs:
        if e['name'] not in by_name: names.append(e['name']); by_name[e['name']] = set()
        by_name[e['name']].add(e['id'])
    by_ev = {n: [r['id'] for r in data['files'] if r.get('ev') in ids] for n, ids in by_name.items()}
    whole = [r['id'] for r in data['files'] if r.get('ev') in keep]  # files are already in time order
    if data.get('source') == 'folder':
        return albums_folder(a, data, names, by_ev, whole)
    fo = esc(a.folder)
    head = ['with timeout of 1800 seconds', 'tell application "Photos"',
            f'if not (exists folder "{fo}") then make new folder named "{fo}"', f'set fo to folder "{fo}"']
    def add(name, ids):
        n = esc(name)
        script = head + [f'if not (exists album "{n}" of fo) then make new album named "{n}" at fo',
                         f'set al to album "{n}" of fo']
        for i in range(0, len(ids), 100):
            items = ', '.join(f'media item id "{esc(x)}"' for x in ids[i:i + 100])
            script.append(f'add {{{items}}} to al')
        osa('\n'.join(script + ['end tell', 'end timeout']), timeout=1900)
        # Photos sometimes drops a whole batch without an error: count, then add back what is missing
        got = osa('\n'.join(head + [f'set AppleScript\'s text item delimiters to linefeed',
                                     f'return (id of media items of album "{n}" of fo) as text', 'end tell', 'end timeout']), timeout=1900)
        missing = [x for x in ids if x not in set(got.split())]
        if missing:
            items = ', '.join(f'media item id "{esc(x)}"' for x in missing)
            osa('\n'.join(head + [f'add {{{items}}} to album "{n}" of fo', 'end tell', 'end timeout']), timeout=1900)
        print(f'  {len(ids):4d}  {a.folder} ← {name}' + (f'  (رجّعت {len(missing)} ناقصة)' if missing else ''), flush=True)
    for k, n in enumerate(names, 1):
        add(f'{k:02d} · {n}', by_ev[n])
    if not only: add(a.whole, whole)


def safe_name(s):
    return re.sub(r'[<>:"/\\|?*\x00-\x1f]', '_', s).strip(' .') or '_'


def albums_folder(a, data, names, by_ev, whole):
    """مجلد صور: «ألبوم» = مجلد فيه روابط ثابتة للصور (نفس الصورة بلا مساحة زيادة) — أو نسخة لو القرص مختلف.
       الأصل ما ينلمس، والأسماء مرقّمة بالترتيب الزمني."""
    out = os.path.abspath(a.out or os.path.join(a.work, 'albums', safe_name(a.folder)))
    by_id = {r['id']: r for r in data['files']}
    def put(name, ids):
        d = os.path.join(out, safe_name(name)); os.makedirs(d, exist_ok=True)
        copied = 0
        for k, i in enumerate(ids, 1):
            src = os.path.join(data['root'], i); dst = os.path.join(d, f'{k:04d} - {safe_name(by_id[i]["f"])}')
            if os.path.exists(dst): continue
            try: os.link(src, dst)
            except OSError: shutil.copy2(src, dst); copied += 1
        print(f'  {len(ids):4d}  {d}' + (f'  ({copied} نسخة — قرص مختلف)' if copied else ''), flush=True)
    for k, n in enumerate(names, 1):
        put(f'{k:02d} · {n}', by_ev[n])
    if not a.only: put(a.whole, whole)
    print('📁', out)


def main():
    ap = argparse.ArgumentParser()
    sp = ap.add_subparsers(dest='cmd', required=True)
    p = sp.add_parser('fetch'); p.add_argument('work'); p.add_argument('--query', required=True)
    p.add_argument('--from', dest='from_'); p.add_argument('--to'); p.set_defaults(fn=fetch)
    p = sp.add_parser('scan'); p.add_argument('work'); p.add_argument('--dir', required=True); p.add_argument('--name')
    p.add_argument('--from', dest='from_'); p.add_argument('--to'); p.set_defaults(fn=scan)
    p = sp.add_parser('events'); p.add_argument('work'); p.add_argument('--gap', type=int, default=90)
    p.add_argument('--km', type=float, default=2); p.add_argument('--min', type=int, default=10)
    p.add_argument('--geo', default='auto', choices=['auto', 'apple', 'osm', 'offline', 'none']); p.set_defaults(fn=events)
    p = sp.add_parser('page'); p.add_argument('work'); p.add_argument('--shape', default='')
    p.add_argument('--name'); p.add_argument('--home'); p.add_argument('--no-airports', action='store_true'); p.set_defaults(fn=page)
    p = sp.add_parser('thumbs'); p.add_argument('work'); p.add_argument('--per', type=int, default=2)
    p.add_argument('--fresh', action='store_true', help='اختار صور جديدة'); p.set_defaults(fn=thumbs)
    p = sp.add_parser('review'); p.add_argument('work'); p.add_argument('--port', type=int, default=8790); p.set_defaults(fn=review)
    p = sp.add_parser('albums'); p.add_argument('work'); p.add_argument('--folder', required=True)
    p.add_argument('--whole', default='الرحلة كاملة')
    p.add_argument('--only'); p.add_argument('--no-airports', action='store_true')
    p.add_argument('--out', help='مجلد الألبومات (مصدر المجلد بس)'); p.set_defaults(fn=albums)
    a = ap.parse_args(); a.fn(a)


if __name__ == '__main__':
    main()
