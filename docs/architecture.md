# Architecture

## Overview

```
RSS Sources → Ingestion → Scoring/Dedup → RSS Items DB
                    ↓
              AI Generation → Generated Posts
                    ↓
         Risk Check + Approval → Content Queue
                    ↓
    Make.com / Telegram / Buffer → Publish Logs
```

## Layers

| Layer | Responsibility |
|-------|----------------|
| **Dashboard** | Next.js App Router pages + server actions |
| **API** | Webhooks and queue endpoints for Make.com |
| **lib/rss** | Ingestion, internal RSS fetcher |
| **lib/scoring** | Relevance score + status decisions |
| **lib/ai** | Summarizer, multi-platform generator, risk filter |
| **lib/queue** | Next-post selection with scheduling rules |
| **Prisma** | PostgreSQL persistence |

## Ingestion modes

1. **Make.com** — RSS module watches feeds → `POST /api/webhooks/rss-item`
2. **Internal** — Cron hits `GET /api/cron/fetch-rss` → fetches active sources

## Publishing

- **X / Instagram / TikTok** — Make.com → Buffer/Publer (no direct API in MVP)
- **Telegram** — Direct Bot API via `POST /api/telegram/publish/:postId` or Make.com
