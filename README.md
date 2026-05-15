# Crypto Pulse — Crypto AI RSS Social Automation

MVP for monitoring crypto/AI RSS feeds, scoring relevance, generating platform-specific social content with AI, and publishing via **Make.com**, **Buffer/Publer**, and **Telegram**.

## Features

- **News source management** — 14 pre-seeded RSS feeds, custom sources, keywords, priority
- **RSS ingestion** — Internal cron fetcher + Make.com webhook (`POST /api/webhooks/rss-item`)
- **Keyword detection & relevance scoring** — Auto-queue high-score items
- **Deduplication** — URL exact match + title similarity (24h window)
- **AI content generation** — X, Telegram, Instagram, TikTok/Shorts scripts + image prompts
- **Risk/safety review** — Low/medium/high classification
- **Content queue** — Approval workflow + Make.com publisher endpoints
- **Dashboard** — Sources, inbox, generated content, queue, settings, logs

## Quick start

### 1. Prerequisites

- Node.js 20+
- Docker (for local Postgres)

### 2. Setup

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard).

### 3. Environment

See `.env.example`. Minimum for local UI:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/crypto_rss_social?schema=public"
MAKE_RSS_WEBHOOK_SECRET=dev-secret
MAKE_PUBLISH_WEBHOOK_SECRET=dev-publish-secret
```

Add `OPENAI_API_KEY` for real AI generation (otherwise mock content is used).

## API endpoints (Make.com)

| Method | Endpoint | Auth header |
|--------|----------|-------------|
| POST | `/api/webhooks/rss-item` | `x-make-webhook-secret: MAKE_RSS_WEBHOOK_SECRET` |
| GET | `/api/queue/next-post?platform=x` | `MAKE_PUBLISH_WEBHOOK_SECRET` |
| POST | `/api/queue/mark-posted` | same |
| POST | `/api/queue/mark-failed` | same |
| POST | `/api/ai/generate-from-rss/:rssItemId` | — |
| POST | `/api/webhooks/platform-response` | `MAKE_PUBLISH_WEBHOOK_SECRET` |

Internal RSS fetch (cron):

```bash
curl -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/cron/fetch-rss
```

## Docs

- [Architecture](docs/architecture.md)
- [Make.com setup](docs/make-com-setup.md)
- [RSS sources](docs/rss-sources.md)
- [AI prompts](docs/ai-prompts.md)
- [Database](docs/database.md)
- [Deployment](docs/deployment.md)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm test` | Run Vitest suite |
| `npm run db:seed` | Seed RSS sources + defaults |
| `npm run db:push` | Push schema to DB |

## Brand

Default brand **Crypto Pulse** — original crypto-native voice. Not affiliated with any influencer.
