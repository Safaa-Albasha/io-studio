# I/O Studio — pull YOUR Instagram stats through Composio's Instagram toolkit (official Graph API under the hood).
#
# Runs inside COMPOSIO_REMOTE_WORKBENCH (Composio's Python sandbox). No keys, no handles in here:
# the toolkit is logged in as the creator's own Business/Creator account ("me").
# Tools used (schemas checked with COMPOSIO_GET_TOOL_SCHEMAS on 2026-11-09):
#   INSTAGRAM_GET_USER_INFO        {ig_user_id:"me", fields}
#   INSTAGRAM_GET_IG_USER_MEDIA    {ig_user_id:"me", limit<=100, after, fields}
#   INSTAGRAM_GET_IG_MEDIA_INSIGHTS {ig_media_id, metric:[...], period:"lifetime"}
#   INSTAGRAM_GET_USER_INSIGHTS    {metric:[...], period:"day"|"lifetime", metric_type, timeframe, breakdown, since, until}
#
# Output (printed as ONE JSON line after the marker): the shape
#   node engine/stats.js import --from composio-instagram <file.json>
# reads:  {kind, pulledAt, user, media:[...], insights:{media_id: rows}, userInsights:[rows...], errors:[...]}
#
# Settings — Claude may change these before running:
MAX_POSTS = 60            # newest posts/reels to evaluate
WORKERS = 6               # parallel insight calls
RETRIES = 3
WITH_USER_INSIGHTS = True # follower_count (30 days), online_followers, follower_demographics (need >= 100 followers)

import json, time, datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

REEL_METRICS = ["views", "reach", "saved", "likes", "comments", "shares", "total_interactions",
                "ig_reels_avg_watch_time", "ig_reels_video_view_total_time", "reels_skip_rate"]
FEED_METRICS = ["views", "reach", "saved", "likes", "comments", "shares", "total_interactions"]
MEDIA_FIELDS = "id,caption,media_type,media_product_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count"


def call(slug, args):
    """run_composio_tool is the workbench's built-in helper (TO VERIFY: some versions return (result, error))."""
    last = None
    for attempt in range(RETRIES):
        try:
            r = run_composio_tool(slug, args)  # noqa: F821 — provided by the workbench
            if isinstance(r, tuple):
                r, err = r[0], (r[1] if len(r) > 1 else None)
                if err:
                    raise RuntimeError(str(err))
            if isinstance(r, dict) and r.get("successful") is False:
                raise RuntimeError(str(r.get("error") or "failed"))
            return r.get("data", r) if isinstance(r, dict) else r
        except Exception as e:  # rate limits / transient errors: back off and retry
            last = e
            time.sleep(1.5 * (attempt + 1) ** 2)
    raise RuntimeError(f"{slug}: {last}")


def rows_of(x):
    if isinstance(x, dict):
        return x.get("data") if isinstance(x.get("data"), list) else []
    return x if isinstance(x, list) else []


errors = []
user = call("INSTAGRAM_GET_USER_INFO", {"ig_user_id": "me", "fields": "id,user_id,username,name,biography,profile_picture_url,account_type,followers_count,follows_count,media_count"})

media, after = [], None
while len(media) < MAX_POSTS:
    args = {"ig_user_id": "me", "limit": min(100, MAX_POSTS - len(media)), "fields": MEDIA_FIELDS}
    if after:
        args["after"] = after
    page = call("INSTAGRAM_GET_IG_USER_MEDIA", args)
    media += rows_of(page)
    after = ((page or {}).get("paging") or {}).get("cursors", {}).get("after") if isinstance(page, dict) else None
    if not after or not rows_of(page):
        break


def insights_for(m):
    reel = m.get("media_product_type") == "REELS" or m.get("media_type") == "VIDEO"
    metrics = REEL_METRICS if reel else FEED_METRICS
    try:
        return m["id"], call("INSTAGRAM_GET_IG_MEDIA_INSIGHTS", {"ig_media_id": m["id"], "metric": metrics, "period": "lifetime"})
    except Exception as e:  # a metric the media doesn't support: fall back to the basic set
        try:
            return m["id"], call("INSTAGRAM_GET_IG_MEDIA_INSIGHTS", {"ig_media_id": m["id"], "metric": ["views", "reach", "saved", "shares"], "period": "lifetime"})
        except Exception as e2:
            errors.append(f"insights {m['id']}: {e2}")
            return m["id"], None


insights = {}
with ThreadPoolExecutor(max_workers=WORKERS) as ex:
    for f in as_completed([ex.submit(insights_for, m) for m in media if m.get("media_product_type") != "STORY"]):
        mid, data = f.result()
        if data is not None:
            insights[mid] = data

user_insights = []
if WITH_USER_INSIGHTS:
    now = int(time.time())
    for args in (
        {"metric": ["follower_count"], "period": "day", "since": now - 29 * 86400, "until": now},
        {"metric": ["online_followers"], "period": "lifetime"},
        {"metric": ["follower_demographics"], "period": "lifetime", "metric_type": "total_value", "timeframe": "this_month", "breakdown": "age"},
        {"metric": ["follower_demographics"], "period": "lifetime", "metric_type": "total_value", "timeframe": "this_month", "breakdown": "country"},
        {"metric": ["follower_demographics"], "period": "lifetime", "metric_type": "total_value", "timeframe": "this_month", "breakdown": "gender"},
    ):
        try:
            user_insights.append(call("INSTAGRAM_GET_USER_INSIGHTS", args))
        except Exception as e:  # < 100 followers, or not available for this account
            errors.append(f"user insights {args['metric'][0]}: {e}")

out = {
    "kind": "io-composio-instagram",
    "pulledAt": datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
    "user": user, "media": media, "insights": insights, "userInsights": user_insights, "errors": errors,
}
print("IO_PULL_JSON")
print(json.dumps(out, ensure_ascii=False))
