# VPS Deployment Guide

Deploy **Crypto Pulse** (RSS → AI → social queue) on a Linux VPS with PostgreSQL, PM2, Nginx, HTTPS, and **cron** for RSS ingestion.

## One domain is enough

This is a **single Next.js app**: dashboard UI and API routes (`/api/...`) live on the same origin. You do **not** need separate frontend/backend domains or subdomains.

Example: `https://crypto.yourdomain.com` serves:

- `/dashboard` — UI
- `/api/cron/fetch-rss` — cron ingest
- `/api/queue/next-post` — Make.com
- etc.

Nginx proxies everything to one Node process (default port **3009** on the VPS).

## Architecture

```text
Internet → Nginx (443) → Next.js (PM2, :3009) → PostgreSQL
                ↑
    Make.com webhooks / cron → /api/cron/fetch-rss
```

| Component | Role |
|-----------|------|
| **PM2** | Keeps `next start` running after reboot |
| **Nginx** | Reverse proxy + SSL termination |
| **PostgreSQL** | App database (Docker or native) |
| **Cron** | Calls `GET /api/cron/fetch-rss` on a schedule (primary RSS ingest) |
| **Make.com** | Optional: publish to Buffer/Publer, or RSS via webhook |

---

## Requirements

- Ubuntu 22.04 or 24.04 LTS (similar steps on Debian)
- SSH access (root or sudo)
- Domain pointed at the VPS IP (recommended for HTTPS and Make.com)
- Minimum: 2 GB RAM, 1 vCPU, 20 GB disk

---

## 1. Initial server setup

```bash
apt update && apt upgrade -y
apt install -y curl git nginx certbot python3-certbot-nginx ufw
```

Firewall:

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

---

## 2. Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v
npm -v
```

---

## 3. PostgreSQL

### Option A — Docker (included in repo)

```bash
apt install -y docker.io docker-compose-v2
cd /opt/socialautomation   # after cloning in step 4
docker compose up -d
```

Default connection (change password in production):

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/crypto_rss_social?schema=public"
```

Edit `docker-compose.yml` to set a strong `POSTGRES_PASSWORD`, then update `DATABASE_URL`.

### Option B — Native PostgreSQL

```bash
apt install -y postgresql postgresql-contrib
sudo -u postgres psql -c "CREATE USER cryptoapp WITH PASSWORD 'your-strong-password';"
sudo -u postgres psql -c "CREATE DATABASE crypto_rss_social OWNER cryptoapp;"
```

```env
DATABASE_URL="postgresql://cryptoapp:your-strong-password@localhost:5432/crypto_rss_social?schema=public"
```

---

## 4. Deploy application code

```bash
mkdir -p /opt
cd /opt
git clone https://github.com/YOUR_USER/socialautomation.git
cd socialautomation
```

Or from your machine:

```bash
rsync -avz --exclude node_modules --exclude .next \
  ~/codes/trenches/socialautomation/ user@YOUR_VPS_IP:/opt/socialautomation/
```

---

## 5. Environment variables

```bash
cd /opt/socialautomation
cp .env.example .env
nano .env
chmod 600 .env
```

### Required

```env
NODE_ENV=production

DATABASE_URL="postgresql://..."

OPENAI_API_KEY=sk-...
AI_PROVIDER=openai

MAKE_RSS_WEBHOOK_SECRET=<random-hex>
MAKE_PUBLISH_WEBHOOK_SECRET=<random-hex>
CRON_SECRET=<random-hex>

APP_BASE_URL=https://crypto.yourdomain.com
PORT=3009
DEFAULT_TIMEZONE=Africa/Lagos
```

`PORT=3009` avoids clashing with other services on `:3000`. Nginx still listens on 80/443; only the internal Node port changes.

Generate secrets:

```bash
openssl rand -hex 32
```

### Optional

```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
DISCORD_AUTO_PUBLISH_ON_APPROVE=true

TELEGRAM_BOT_TOKEN=
TELEGRAM_CHANNEL_ID=

IMAGE_GENERATION_ENABLED=false
GENERATE_IMAGES_ON=generate
OPENAI_IMAGE_MODEL=dall-e-3
```

With `NODE_ENV=production`, webhook routes **require** matching `x-make-webhook-secret` / `x-cron-secret` headers (no dev bypass).

---

## 6. Install dependencies, database, build

```bash
cd /opt/socialautomation
npm ci
npx prisma db push
npm run db:seed
npm run build
```

---

## 7. Run with PM2 (port 3009)

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
# Run the command PM2 prints to enable boot on startup
```

Or without the config file:

```bash
PORT=3009 pm2 start npm --name "crypto-pulse" -- start
```

Verify locally on the server:

```bash
pm2 status
pm2 logs crypto-pulse
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3009/dashboard
```

---

## 8. Nginx reverse proxy

Point DNS **A record** for your subdomain (e.g. `crypto.yourdomain.com`) to the VPS IP.

Create `/etc/nginx/sites-available/crypto-pulse`:

```nginx
server {
    listen 80;
    server_name crypto.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3009;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
    }
}
```

Enable:

```bash
ln -s /etc/nginx/sites-available/crypto-pulse /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

HTTPS:

```bash
certbot --nginx -d crypto.yourdomain.com
```

Set `APP_BASE_URL=https://crypto.yourdomain.com` in `.env`, then:

```bash
pm2 restart crypto-pulse
```

---

## 9. RSS ingestion — cron (required)

RSS fetch runs on the **server cron**, not inside the Next.js process. This calls the internal fetcher which pulls all **active** sources from the database.

### Endpoint

```http
GET /api/cron/fetch-rss
x-cron-secret: <CRON_SECRET from .env>
```

### Install crontab

```bash
crontab -e
```

Every **15 minutes** (adjust as needed; must match your source `check_frequency` settings):

```cron
*/15 * * * * curl -sf -H "x-cron-secret: YOUR_CRON_SECRET" https://crypto.yourdomain.com/api/cron/fetch-rss >> /var/log/crypto-pulse-rss.log 2>&1
```

Replace:

- `YOUR_CRON_SECRET` — same value as `CRON_SECRET` in `.env`
- `https://crypto.yourdomain.com` — your real `APP_BASE_URL`

### Test manually

```bash
curl -sf -H "x-cron-secret: YOUR_CRON_SECRET" \
  https://crypto.yourdomain.com/api/cron/fetch-rss
```

Expected: JSON with `"success": true` and per-source `fetched` counts.

### Logs

```bash
tail -f /var/log/crypto-pulse-rss.log
```

After cron runs, check **Dashboard → News Inbox** for new items.

---

## 10. Make.com (publishing)

Use your public HTTPS base URL. See [make-com-setup.md](./make-com-setup.md).

| Action | Method | Path |
|--------|--------|------|
| Next post | GET | `/api/queue/next-post?platform=x` |
| Mark posted | POST | `/api/queue/mark-posted` |
| Approve (headless) | POST | `/api/queue/approve/{postId}` |
| RSS via Make (optional) | POST | `/api/webhooks/rss-item` |

Header for queue/publish routes:

```http
x-make-webhook-secret: <MAKE_PUBLISH_WEBHOOK_SECRET>
```

Header for RSS webhook (if not using cron):

```http
x-make-webhook-secret: <MAKE_RSS_WEBHOOK_SECRET>
```

**Recommended:** use **cron for RSS ingest** and **Make for publishing** to Buffer/Publer.

---

## 11. Smoke tests

```bash
# Dashboard
curl -I https://crypto.yourdomain.com/dashboard

# RSS cron
curl -s -H "x-cron-secret: YOUR_CRON_SECRET" \
  https://crypto.yourdomain.com/api/cron/fetch-rss

# Queue (empty if nothing approved)
curl -s -H "x-make-webhook-secret: YOUR_PUBLISH_SECRET" \
  "https://crypto.yourdomain.com/api/queue/next-post?platform=x"
```

Workflow:

1. Wait for cron (or run fetch manually)
2. **News Inbox** → queue or generate content
3. **Generated Content** → approve
4. **Content Queue** / Make → publish

---

## 12. Deploy updates

```bash
cd /opt/socialautomation
git pull
npm ci
npx prisma db push
npm run build
pm2 restart crypto-pulse
```

---

## 13. Security checklist

- [ ] `chmod 600 .env` — never commit `.env`
- [ ] Strong `CRON_SECRET`, `MAKE_*` secrets
- [ ] Postgres not exposed to the public internet (bind `localhost` only)
- [ ] UFW: only 22, 80, 443 open
- [ ] HTTPS via Certbot
- [ ] Rotate Discord webhook if ever leaked

---

## 14. Troubleshooting

| Issue | Fix |
|-------|-----|
| `401` on `/api/cron/fetch-rss` | `x-cron-secret` must match `CRON_SECRET` in `.env` |
| Cron runs but no items | Check `/var/log/crypto-pulse-rss.log`; some feeds block or timeout |
| DB connection error | Verify Postgres is up; test `DATABASE_URL` |
| 502 from Nginx | `pm2 status` — app must be running on port 3009 (`curl http://127.0.0.1:3009/dashboard`) |
| AI generate slow | Normal; VPS has no serverless timeout unlike Vercel Hobby |

---

## Alternative: Vercel

For serverless hosting, use env vars + hosted Postgres (Neon/Supabase). RSS cron must be external (Vercel Cron, GitHub Actions, or Make) hitting `/api/cron/fetch-rss` with `x-cron-secret`. VPS is preferred for always-on cron and long AI requests.
