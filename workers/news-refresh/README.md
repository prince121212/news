# News refresh Cron Worker

This Worker keeps the 择流 information stream warm when no users are visiting.
It runs every 5 minutes and calls the protected Pages API:

```text
POST /api/news/refresh
x-refresh-token: <NEWS_REFRESH_TOKEN>
```

Deployment steps:

1. Set the same `NEWS_REFRESH_TOKEN` in the Pages project environment variables.
2. Replace `NEWS_REFRESH_URL` in `workers/news-refresh/wrangler.toml` with the production URL.
3. Set the Worker secret:

```bash
corepack pnpm exec wrangler secret put NEWS_REFRESH_TOKEN -c workers/news-refresh/wrangler.toml
```

4. Deploy the Worker:

```bash
corepack pnpm exec wrangler deploy -c workers/news-refresh/wrangler.toml
```
