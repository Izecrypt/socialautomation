# Make.com Setup

Base URL: `APP_BASE_URL` (e.g. `https://your-app.com`)

## Authentication headers

| Endpoint group | Header | Env variable |
|----------------|--------|--------------|
| RSS ingest | `x-make-webhook-secret` | `MAKE_RSS_WEBHOOK_SECRET` |
| Queue / approve / mark posted | `x-make-webhook-secret` | `MAKE_PUBLISH_WEBHOOK_SECRET` |

---

## Recommended schedules

| Task | Interval | Endpoint |
|------|----------|----------|
| RSS ingest (optional if using app cron) | Every 15 min | `POST /api/webhooks/rss-item` |
| AI generation | Every 10–15 min | `POST /api/ai/generate-from-rss/{rssItemId}` |
| X publisher | Every 20–30 min | `GET /api/queue/next-post?platform=x` |
| Telegram publisher | Every 20–30 min | `GET ...?platform=telegram` |
| Instagram | Daily | `GET ...?platform=instagram` |
| TikTok script | Every 2 days | `GET ...?platform=tiktok` |
| YouTube Shorts | Every 2 days | `GET ...?platform=youtube_shorts` |

Configure exact rates in **Dashboard → Settings → Posting schedule** (posts/hour, posts/day, every N days).

---

## Approval before publish

`GET /api/queue/next-post` only returns posts with status **`approved`** or **`scheduled`**.

Headless approve (low/medium risk only):

```
POST /api/queue/approve/{generatedPostId}
Header: x-make-webhook-secret: <MAKE_PUBLISH_WEBHOOK_SECRET>
```

High-risk posts return `403` and must be approved in the dashboard.

---

## Scenario 1: RSS News Monitor

1. **RSS** → Watch RSS feed items
2. **HTTP** → `POST /api/webhooks/rss-item`

```json
{
  "source_name": "CoinDesk",
  "feed_url": "https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml",
  "title": "{{title}}",
  "summary": "{{description}}",
  "article_url": "{{link}}",
  "published_at": "{{pubDate}}",
  "raw_payload": {}
}
```

---

## Scenario 2: AI Content Generation

1. List queued items (custom DB/HTTP module) or use app dashboard
2. `POST /api/ai/generate-from-rss/{{rssItemId}}`
3. Optionally `POST /api/queue/approve/{{postId}}` for low-risk auto flow

---

## Scenario 3–6: Platform publishers

1. `GET /api/queue/next-post?platform=x` (or telegram, instagram, tiktok, youtube_shorts)
2. If `data.post` is not null:

```json
{
  "post": {
    "id": "uuid",
    "platform": "x",
    "content_text": "...",
    "hook": "...",
    "hashtags": [],
    "image_prompt": "...",
    "media_url": "https://...",
    "risk_score": "low"
  }
}
```

3. Send to **Buffer** or **Publer** (include `media_url` when present for image posts)
4. `POST /api/queue/mark-posted`:

```json
{
  "generated_post_id": "uuid",
  "platform": "x",
  "external_id": "buffer-id",
  "message": "Published"
}
```

On failure: `POST /api/queue/mark-failed` with `{ "generated_post_id", "platform", "error" }`.

---

## Scenario 7: Short video (TikTok / YouTube Shorts)

Same as publishers above; `content_text` contains the script. Upload video manually or via a video tool in Make, then `mark-posted`.

---

## Cron alternative (no Make for ingest)

```bash
curl -H "x-cron-secret: $CRON_SECRET" $APP_BASE_URL/api/cron/fetch-rss
```

---

## Failure / retry

- `POST /api/webhooks/platform-response` with `status: "failed"` or `"posted"`
- Retry from dashboard **Content Queue**
