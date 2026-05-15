# Make.com Setup

Base URL: `APP_BASE_URL` (e.g. `https://your-app.com`)

Headers for publish/queue endpoints:

```
x-make-webhook-secret: <MAKE_PUBLISH_WEBHOOK_SECRET>
```

RSS webhook header:

```
x-make-webhook-secret: <MAKE_RSS_WEBHOOK_SECRET>
```

---

## Scenario 1: RSS News Monitor

1. **RSS** → Watch RSS feed items (per source or bundled)
2. **Filter** → Optional category/keyword filter
3. **HTTP** → POST `/api/webhooks/rss-item`

**Body example:**

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

**Response example:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "queued",
    "relevanceScore": 12,
    "detectedKeywords": ["bitcoin", "etf"],
    "isDuplicate": false,
    "message": "RSS item saved as queued"
  }
}
```

---

## Scenario 2: AI Content Generation Trigger

1. **Schedule** → Every 10–15 minutes
2. **HTTP** → Query app for `rss_items` with `status=queued` (or use dashboard)
3. **HTTP** → POST `/api/ai/generate-from-rss/{{rssItemId}}`

---

## Scenario 3: X/Twitter Publisher

1. **Schedule** → Every 30 minutes
2. **HTTP GET** → `/api/queue/next-post?platform=x`
3. If `data.post` exists → Buffer/Publer module
4. **HTTP POST** → `/api/queue/mark-posted` or `mark-failed`

**mark-posted body:**

```json
{
  "generated_post_id": "uuid",
  "platform": "x",
  "external_id": "buffer-id",
  "message": "Published"
}
```

---

## Scenario 4: Telegram Publisher

Same as Scenario 3 with `platform=telegram`, then Telegram Bot `sendMessage` or app's direct endpoint.

---

## Scenario 5: Instagram Publisher

Schedule daily → `platform=instagram` → Buffer/Publer.

---

## Scenario 6: Short Video Workflow

Every 2 days → `platform=tiktok` → manual/video tool → mark posted.

---

## Failure / retry

- On publish failure: `POST /api/queue/mark-failed` with `{ "error": "..." }`
- Or `POST /api/webhooks/platform-response` with `status: "failed"`
- Retry failed posts from dashboard Content Queue
