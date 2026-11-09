# Daily trend: Instagram accounts via Composio (instructions for the plugin)

> تعليمات للبلقن: شلون يسحب الترند من حسابات إنستقرام عن طريق Composio بدون ما يطلب من المستخدم حساب ScrapeCreators.

## Rule 1: use the Composio instant account, never ask for a ScrapeCreators login
- The ScrapeCreators toolkit runs on Composio's **instant account**. The user pays only through their Composio balance. They do not need a ScrapeCreators account or API key.
- Before pulling, call `COMPOSIO_SEARCH_TOOLS` with a use case like "list recent instagram posts of a public user via scrapecreators". If the response shows `has_active_connection: true` and `instant_account.allowed_tool_slugs` contains `SCRAPECREATORS_LIST_INSTAGRAM_USER_POSTS`, go ahead.
- **Do not call `COMPOSIO_MANAGE_CONNECTIONS` with `action: "add"` for `scrapecreators`.** That opens the "Composio wants to connect to your ScrapeCreators" screen, which asks for a key the user does not have.
- Only if the instant account is missing or the call fails with an auth error: stop and tell the user in their dialect. Offer the connect link as an option, and say clearly that it needs their own ScrapeCreators key.

## Rule 2: cost (tell the user before the first run)
- `SCRAPECREATORS_LIST_INSTAGRAM_USER_POSTS`: about $0.001 per request (one page = latest posts of one account). Cached results are free.
- `SCRAPECREATORS_GET_INSTAGRAM_POST`: about $0.001 per request. Pass `cache_max_age: "1d"` when a day-old result is fine.
- Avoid `SCRAPECREATORS_LIST_INSTAGRAM_POST_COMMENTS` with `include_replies: true`. It costs 15 credits per call even with no replies.
- Example: 20 accounts once a day ≈ 20 requests ≈ $0.02/day ≈ $0.60/month. Show the estimate for the user's own list on the first run and ask once.
- Prices come from Composio's tool listing. Re-read `instant_account.prices` on each setup, because they can change.

## Rule 3: where it runs
- Run the pull inside `COMPOSIO_REMOTE_WORKBENCH`. It provides `run_composio_tool()` and `upload_local_file()`.
- Use the template `skills/io-trends/scripts/composio_trend_pull.py` (filled by `engine/trends.js fill`) (settings at the top: `HANDLES`, `ARABIC`, `LAST_N`, `KEYWORDS`). Fill `HANDLES` and `ARABIC` from the user's `.io/sources.json` (the accounts they entered in onboarding).
- Call one account per request, at most 10 in parallel. Take only the account's own posts (`user.username == handle`), newest first, latest 4. Keep only posts whose caption matches the user's topic keywords.
- Output: a JSON list of `{title, url, platform, author, note, published, metrics{likes, comments, views}, tags}` saved to `/mnt/files/ig.json`, plus the S3 link from `upload_local_file`. Download it with `curl -L` and merge it into the day's trend board.

## Rule 4: schedule and limits
- Run once a day at the hour the user chose in onboarding ("تريد الترند يومياً؟"). Never more than once a day by default.
- If an account fails (private, renamed, error), skip it, record it under "failed sources" in the day's summary, and continue.
- Websites and RSS sources in the user's list need no Composio connection. Fetch them directly.

## Rule 5: what to show the user
- For each post: the account, the date, the first caption line, likes / comments / views, and a link to the original.
- Then 3–5 ready ideas built from the strongest posts, in the user's dialect. Each idea gets a hook ≤6 words, the format (reel / carousel / YouTube), and the source link.
- Never copy another account's wording or script. Take the idea and rewrite it in the user's voice. Keep account names out of the user's posts.
