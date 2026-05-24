# Make.com Scenario Handoff — Crypto Pulse Social Automation

**Purpose of this document:** Paste this entire file into ChatGPT (or another assistant) and ask it to walk me through building a Make.com scenario step-by-step using the **current** Make.com UI, module names, and flow-control patterns (Router, Filter, Schedule, HTTP, Buffer, etc.).

---

## 1. What we are building (high level)

We have a self-hosted web app called **Crypto Pulse** that:

1. Ingests crypto/AI RSS news (already working via VPS cron — **not** required in Make for MVP).
2. Generates social posts with AI (done in the app dashboard or APIs).
3. Holds posts in a **content queue** until a human approves them in the dashboard.
4. Exposes HTTP APIs for **Make.com** to poll for the next approved post and publish it to social platforms via **Buffer** (free tier: X/Twitter first).

**Make.com’s job (MVP):** Run on a schedule → fetch the next approved X post from our API → if a post exists → send text to Buffer → tell our API the post was published.

**Make.com is NOT responsible for:** RSS ingest (VPS cron handles that), AI generation (dashboard for now), Discord posting (app handles on approve if configured).

---

## 2. Live deployment details

| Item | Value |
|------|--------|
| Production base URL | `https://social.playtrenches.xyz` |
| Platform for first scenario | `x` (Twitter/X via Buffer) |
| Dashboard | `https://social.playtrenches.xyz` (approve posts before Make can publish) |

---

## 3. Authentication (critical)

All **queue/publish** endpoints use the same header:

```
Header name:  x-make-webhook-secret
Header value: <MAKE_PUBLISH_WEBHOOK_SECRET>   (64-char hex on our VPS .env)
```

- This is **not** OAuth on the HTTP module — set HTTP authentication to **No authentication** and use the custom header above.
- Do **not** confuse with `MAKE_RSS_WEBHOOK_SECRET` (that is only for RSS webhook ingest, a different scenario).

Optional fallback the server accepts: `Authorization: Bearer <same secret>` — but prefer `x-make-webhook-secret`.

In production (`NODE_ENV=production`), missing/wrong secret → **401 Unauthorized**.

---

## 4. API response envelope (all JSON routes)

Success:

```json
{
  "success": true,
  "data": { ... }
}
```

Error:

```json
{
  "success": false,
  "error": "message",
  "details": { ... }
}
```

When using Make **HTTP → Parse response: Yes**, mapped fields are typically under `data` (e.g. `data.post`, `data.post.content_text`). Help me pick the correct pills after one test run.

---

## 5. Primary scenario: X publisher via Buffer (build this first)

### Desired flow (logical)

```
[Trigger: every 15–30 minutes]
    → [HTTP GET next-post?platform=x]
    → [Only continue if post is not null]
    → [Buffer: create scheduled/pending post for X profile]
    → [HTTP POST mark-posted]
```

### Step A — Trigger / schedule

We could not find **Schedule** under **Flow control** (only Router, Iterator, Repeater). Please suggest the **current** Make.com way to run this on an interval, e.g.:

- Scenario-level scheduling toggle (“Every 15 minutes” at bottom), and/or
- **Tools → Schedule** (or equivalent built-in trigger), and/or
- Another recommended pattern in 2025/2026 Make UI.

Target interval: **every 15–30 minutes** for X.

### Step B — HTTP module #1: Get next post

| Setting | Value |
|---------|--------|
| App | HTTP |
| Action | Make a request |
| Method | `GET` |
| URL | `https://social.playtrenches.xyz/api/queue/next-post?platform=x` |
| Authentication | No authentication |
| Headers | `x-make-webhook-secret` = our publish secret |
| Parse response | **Yes** |

**Valid `platform` query values:** `x`, `telegram`, `instagram`, `tiktok`, `youtube_shorts`

**Already verified:** This returns **200** with parsed data when the queue has an eligible post.

#### Success response when a post is available

```json
{
  "success": true,
  "data": {
    "post": {
      "id": "uuid",
      "platform": "x",
      "content_text": "Full tweet text to publish...",
      "hook": "...",
      "hashtags": ["crypto", "AI"],
      "image_prompt": "...",
      "media_url": "https://..." ,
      "risk_score": "low",
      "rss_item": {
        "id": "...",
        "title": "...",
        "article_url": "...",
        "source_name": "..."
      }
    }
  }
}
```

#### Success response when queue is empty (still 200)

```json
{
  "success": true,
  "data": {
    "post": null,
    "message": "No eligible post in queue"
  }
}
```

**Important:** The scenario must **not** call Buffer when `post` is `null`. Use whichever flow-control pattern fits the current Make UI best:

- **Filter** module: `post` exists / is not empty, OR
- **Router** with Route 1 filter: `post` exists; Route 2 empty (fallback), OR
- Equivalent modern pattern you recommend.

I had trouble finding where to set a **Router route filter** — please give click-by-click instructions for the current UI.

### Step C — Buffer module

| Setting | Guidance |
|---------|----------|
| App | Buffer |
| Action | Create a status update (or current equivalent for posting to X) |
| Account | User’s Buffer account with X/Twitter channel connected |
| Text / body | Map from HTTP: `data.post.content_text` (exact path after parse) |
| Media / image | If Buffer supports URL and `media_url` is non-empty, map `data.post.media_url` |

Buffer free tier limitations apply — if image posting isn’t supported on free, text-only is OK for MVP.

### Step D — HTTP module #2: Mark posted in our app

| Setting | Value |
|---------|--------|
| Method | `POST` |
| URL | `https://social.playtrenches.xyz/api/queue/mark-posted` |
| Headers | Same `x-make-webhook-secret` |
| Body content type | `application/json` |
| Parse response | Yes (optional) |

**JSON body (snake_case required):**

```json
{
  "generated_post_id": "<uuid from data.post.id>",
  "platform": "x",
  "external_id": "<optional Buffer post/update id>",
  "message": "Published via Buffer"
}
```

| Field | Source |
|-------|--------|
| `generated_post_id` | HTTP module #1 → `post.id` |
| `platform` | literal `x` or `post.platform` |
| `external_id` | Optional — Buffer module output ID if available |
| `message` | Optional string |

Success response:

```json
{ "success": true, "data": { "marked": true } }
```

### Step E — Optional: failure path

If Buffer fails, call:

| Setting | Value |
|---------|--------|
| Method | `POST` |
| URL | `https://social.playtrenches.xyz/api/queue/mark-failed` |
| Body | `{ "generated_post_id": "<uuid>", "platform": "x", "error": "<error message>" }` |

Use Make error handling / break / resume as appropriate for the current Make plan.

---

## 6. When will `next-post` return a real post?

The API only returns a post when **all** of the following are true:

1. Status is **`approved`** or **`scheduled`** (user approves in dashboard: Generated Content / Content Queue).
2. Platform matches query (`platform=x`).
3. `risk_score` is **not** `high` (high-risk must be approved manually and may be excluded).
4. Scheduling rules in dashboard Settings allow it (active hours, posts/hour, posts/day, every N days, min gap).
5. Not blocked by duplicate-topic cooldown for same RSS item.

If we get `post: null` with 200, auth is fine — we need to approve a post or relax schedule settings.

---

## 7. What is already done vs. not done

| Done | Not done / needs help |
|------|------------------------|
| HTTP GET `next-post` returns 200 with data | Wire Filter/Router correctly |
| Header `x-make-webhook-secret` with publish secret | Buffer module mapping |
| VPS cron for RSS ingest | HTTP POST `mark-posted` |
| Dashboard for approve/generate | Scenario schedule enabled + saved |
| | End-to-end test: Buffer queue shows tweet, app marks posted |

---

## 8. Other scenarios (later — do not build unless asked)

### RSS ingest (optional — we use VPS cron instead)

```
POST https://social.playtrenches.xyz/api/webhooks/rss-item
Header: x-make-webhook-secret: <MAKE_RSS_WEBHOOK_SECRET>   ← different secret
Body: { source_name, feed_url, title, summary, article_url, published_at, raw_payload }
```

### Headless approve (low/medium risk only)

```
POST https://social.playtrenches.xyz/api/queue/approve/{generatedPostId}
Header: x-make-webhook-secret: <MAKE_PUBLISH_WEBHOOK_SECRET>
```

High risk → 403; use dashboard.

### Additional platforms

Duplicate the publisher scenario per platform with different `?platform=` values and different Buffer/social connections:

- `telegram`, `instagram`, `tiktok`, `youtube_shorts`

`youtube_shorts` / `tiktok`: `content_text` is often a script; video upload may be manual.

---

## 9. Testing checklist

1. Approve at least one **X** post in `https://social.playtrenches.xyz` dashboard.
2. Run HTTP GET module once → confirm `data.post` is not null.
3. Run full scenario once → confirm Buffer received `content_text`.
4. Confirm POST `mark-posted` returns 200 and dashboard shows post as **posted**.
5. Run again with empty queue → scenario should stop after filter (no Buffer call).
6. Turn on scenario scheduling and activate scenario.

---

## 10. What I want from ChatGPT

Please provide:

1. **Exact module sequence** using current Make.com naming (HTTP, Buffer, Filter vs Router, scenario schedule, etc.).
2. **Click-by-click** setup for the “only if post exists” branch (I could not find Router route filter easily).
3. **Field mapping table**: Make pill path → Buffer field → mark-posted JSON field.
4. **Common mistakes** (wrong secret, wrong platform param, publishing when `post` is null, snake_case body fields).
5. **How to test** each module with “Run once” and what output to expect.

Assume I am on **Make.com free tier** with **Buffer free** connected to **X/Twitter**.

---

## 11. Quick reference — curl equivalents

```bash
# Get next X post
curl -s -H "x-make-webhook-secret: YOUR_PUBLISH_SECRET" \
  "https://social.playtrenches.xyz/api/queue/next-post?platform=x"

# Mark posted
curl -s -X POST -H "Content-Type: application/json" \
  -H "x-make-webhook-secret: YOUR_PUBLISH_SECRET" \
  -d '{"generated_post_id":"UUID","platform":"x","message":"test"}' \
  "https://social.playtrenches.xyz/api/queue/mark-posted"
```

---

*Document generated for Crypto Pulse / socialautomation repo. Production URL: social.playtrenches.xyz*
