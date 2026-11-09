# ─────────────────────────────────────────────────────────────────────
# I/O Studio · آي أو استوديو — trend pull from the Instagram accounts the creator follows.
#
# WHERE IT RUNS: inside Composio's COMPOSIO_REMOTE_WORKBENCH (MCP tool).
#   The workbench provides run_composio_tool() and upload_local_file();
#   this file is a template, not a standalone script.
# NEEDS: the "ScrapeCreators" toolkit connected in the user's own Composio
#   account (tool slug SCRAPECREATORS_LIST_INSTAGRAM_USER_POSTS). Each call is
#   billed per the user's ScrapeCreators plan (one call per handle).
# FILL: Claude fills the INPUTS block from the user's project
#   (`node engine/trends.js fill --dir <project>` prints a filled copy):
#   .io/sources.json accounts with platform instagram, their "arabic" flag,
#   and keywords = sources.keywords + the niche in creator-profile.md + the
#   account-type pack keywords (library/account-types/types.json).
# OUTPUT: OUT (default /mnt/files/ig.json) = a JSON list of rows, plus an S3
#   link printed on the RESULT line. Import it into the project with
#   `node engine/app-api.js import-trends <file.json> --dir <project>`.
#
# A post is a trend when it beats its own account's usual reach:
#   outlier = views / median views of that account's recent own posts.
# ─────────────────────────────────────────────────────────────────────
import json, os, re, statistics, unicodedata
from concurrent.futures import ThreadPoolExecutor

# >>> IO:INPUTS (filled per project — never commit real handles here)
HANDLES = ['example_account_1', 'example_account_2']   # instagram accounts the user follows
ARABIC = set()            # handles marked "arabic" in sources.json
AUTO_ARABIC = True        # also tag an account arabic when most of its captions are Arabic
LAST_N = 6                # newest N own posts per account are trend candidates
KEYWORDS = []             # empty list = keep every post (no topic filter)
# <<< IO:INPUTS
#
# Example KEYWORDS for an AI/tech account (an example only — the real list
# comes from the user's project, Arabic + English):
#   ['claude', 'anthropic', 'openai', 'gemini', 'llm', 'agent', 'mcp',
#    'claude code', 'prompt', 'automation', 'no-code', 'ai', 'chatgpt',
#    'الذكاء الاصطناعي', 'ذكاء اصطناعي', 'وكيل', 'أتمتة', 'برومبت', 'بدون كود']

OUT = os.environ.get('IO_TRENDS_OUT', '/mnt/files/ig.json')
TOOL = 'SCRAPECREATORS_LIST_INSTAGRAM_USER_POSTS'

AR_LETTER = re.compile(r'[؀-ۿ]')
TASHKEEL = re.compile(r'[ؐ-ًؚ-ٰٟۖ-ۭـ]')  # harakat + tatweel


def norm(s):
    """lower-case, NFKC, Arabic folded: no harakat/tatweel, أ/إ/آ→ا, ى→ي, ة→ه."""
    s = unicodedata.normalize('NFKC', str(s or '')).lower()
    s = TASHKEEL.sub('', s)
    return s.replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا').replace('ى', 'ي').replace('ة', 'ه')


def kw_pattern(k):
    """Whole-word match. Arabic keywords also match with attached و/ف/ب/ك/ل and ال
    (so «الذكاء» finds «والذكاء», «بالذكاء», «للذكاء»)."""
    k = norm(k).strip()
    body = re.escape(k).replace(r'\ ', r'\s+')
    if AR_LETTER.search(k):
        if k.startswith('ال'):
            body = re.escape(k[2:]).replace(r'\ ', r'\s+')
            return re.compile(r'(?<!\w)[وف]?(?:[بك]?ال|لل)' + body + r'(?!\w)')
        pre = r'(?:[وف]?[بكل]?(?:ال)?)?'
        return re.compile(r'(?<!\w)' + pre + body + r'(?!\w)')
    return re.compile(r'(?<![^\W_])' + body + r'(?![^\W_])')


PATS = [kw_pattern(k) for k in KEYWORDS if str(k).strip()]


def matches(text):
    if not PATS:
        return True
    t = norm(text)
    return any(p.search(t) for p in PATS)


def caption_of(p):
    cap = p.get('caption') or {}
    return cap.get('text', '') if isinstance(cap, dict) else (cap or '')


def views_of(p):
    return p.get('ig_play_count') or p.get('play_count') or p.get('video_view_count') or p.get('view_count')


def media_of(p):
    """thumbnail / video URLs when the response carries them."""
    out = {}
    thumb = p.get('thumbnail_url') or p.get('display_uri') or p.get('display_url')
    iv = p.get('image_versions2') or {}
    cands = iv.get('candidates') if isinstance(iv, dict) else None
    if not thumb and isinstance(cands, list) and cands and isinstance(cands[0], dict):
        thumb = cands[0].get('url')
    vid = p.get('video_url')
    vv = p.get('video_versions')
    if not vid and isinstance(vv, list) and vv and isinstance(vv[0], dict):
        vid = vv[0].get('url')
    if isinstance(thumb, str) and thumb.startswith('http'):
        out['thumbnail'] = thumb
    if isinstance(vid, str) and vid.startswith('http'):
        out['videoUrl'] = vid
    return out


def fetch(h):
    r, e = run_composio_tool(TOOL, {'handle': h, 'trim': True})
    return h, r, e


rows, errs = [], []
with ThreadPoolExecutor(10) as ex:
    for h, r, e in ex.map(fetch, HANDLES):
        if e:
            errs.append((h, str(e)[:100])); continue
        d = r.get('data', r) if isinstance(r, dict) else None
        items = d.get('items') if isinstance(d, dict) else None
        if not isinstance(items, list):
            errs.append((h, 'shape')); continue
        # keep only the account's own posts (drop reposts/collabs), newest first
        own = [p for p in items if isinstance(p, dict)
               and str((p.get('user') or p.get('owner') or {}).get('username') or '').lower() == h.lower()]
        own.sort(key=lambda p: p.get('taken_at') or p.get('created_at') or 0, reverse=True)
        # the account's usual reach: median views of every own post we got
        vs = [v for v in (views_of(p) for p in own) if isinstance(v, (int, float)) and v > 0]
        med = statistics.median(vs) if vs else None
        caps = [caption_of(p) for p in own]
        arabic = h in ARABIC or (AUTO_ARABIC and caps and
                                 sum(1 for c in caps if AR_LETTER.search(c or '')) * 2 > len(caps))
        for p in own[:LAST_N]:
            cap = caption_of(p)
            if not matches(cap):
                continue                      # not about the user's topics
            v = views_of(p)
            m = {'likes': p.get('like_count'), 'comments': p.get('comment_count'), 'views': v}
            row = {
                'title': cap.split('\n')[0][:200],
                'url': f"https://www.instagram.com/p/{p.get('code')}/",
                'platform': 'instagram',
                'author': h,
                'note': cap[:500],
                'published': p.get('taken_at') or p.get('created_at'),
                'metrics': {k: x for k, x in m.items() if x is not None},
                'tags': ['person', 'composio', 'arabic' if arabic else 'english']
                        + (['paid'] if p.get('is_paid_partnership') else []),
                'outlier': round(v / med, 2) if med and isinstance(v, (int, float)) else None,
                'medianViews': round(med) if med else None,
            }
            row.update(media_of(p))
            rows.append(row)

rows.sort(key=lambda x: x.get('outlier') or 0, reverse=True)
os.makedirs(os.path.dirname(OUT) or '.', exist_ok=True)
json.dump(rows, open(OUT, 'w'), ensure_ascii=False)
u, e = upload_local_file(OUT)
print('RESULT', len(rows), errs[:5], (u or {}).get('s3_url'))
