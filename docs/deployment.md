# Deployment

## Environment variables

Copy `.env.example` and set:

- `DATABASE_URL` — managed Postgres (Supabase, Neon, RDS)
- `OPENAI_API_KEY` — production AI
- `MAKE_RSS_WEBHOOK_SECRET` / `MAKE_PUBLISH_WEBHOOK_SECRET`
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHANNEL_ID` (optional)
- `APP_BASE_URL` — public URL for Make.com
- `DEFAULT_TIMEZONE` — e.g. `Africa/Lagos`
- `CRON_SECRET` — protect `/api/cron/fetch-rss`

## Vercel / Node hosting

1. Connect repo
2. Set env vars
3. Build: `npm run build`
4. Run migrations against production DB:
   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```

## Cron

Schedule external cron (Vercel Cron, GitHub Actions, Make.com):

```
GET /api/cron/fetch-rss
Header: x-cron-secret: <CRON_SECRET>
```

## Security checklist

- [ ] Strong webhook secrets in production
- [ ] `NODE_ENV=production` (disables dev webhook bypass)
- [ ] Database SSL enabled
- [ ] Rate limits on webhooks (built-in, in-memory)
