# Database

PostgreSQL via Prisma 7.

## Tables

| Table | Purpose |
|-------|---------|
| `sources` | RSS feed configuration |
| `rss_items` | Ingested articles |
| `generated_posts` | AI social content per platform |
| `media_assets` | Image prompts / URLs |
| `scheduled_posts` | Scheduled publish slots |
| `publish_logs` | Publish & AI events |
| `platform_accounts` | Platform config (future) |
| `settings` | App settings JSON |
| `brand_voice_settings` | Brand tone config |
| `make_webhook_logs` | Webhook audit trail |
| `ingest_logs` | RSS fetch/ingest logs |

## Indexes

- `rss_items.article_url` (unique)
- `rss_items.status`, `relevance_score`, `created_at`
- `generated_posts.platform`, `status`, `risk_score`, `scheduled_at`

## Migrations

```bash
npm run db:push    # dev quick sync
npm run db:migrate # production migrations
```
