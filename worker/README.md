# Stats refresh worker

The half-hourly clock for the site. Lives at Cloudflare, calls
`/api/revalidate` on the deployed site, does nothing else.

## Why this folder exists

The deployed worker lives in Cloudflare's dashboard editor. That editor
is not backed up, has no history, and is not visible from the repo — so
if it were the only copy, the one piece of infrastructure holding the
whole refresh schedule together would exist nowhere you can read it.
`refresh.js` here is the source of truth for *what the code says*.
Cloudflare holds the running copy and the secrets.

## Deployed configuration

| Setting | Value |
| --- | --- |
| Worker name | `portfolio-stats-refresh` |
| Cron trigger | `5,35 * * * *` — every 30 min, offset off the top of the hour |
| Variable `SITE_URL` | `https://shubham-kumar.vercel.app` (plain text) |
| Variable `CRON_SECRET` | same value as Vercel's Production `CRON_SECRET` (**secret**) |

`wrangler.toml` mirrors this so the config is readable here too. It is
reference, not the deployment path — nothing in CI runs `wrangler`.

## Changing the code

Edit `refresh.js` here, then paste it into the Cloudflare dashboard
editor (Workers & Pages → `portfolio-stats-refresh` → Edit code →
Deploy). Keeping the two in sync is manual and deliberate: one worker,
changed roughly never.

## Testing it

```
https://portfolio-stats-refresh.<subdomain>.workers.dev/?key=<CRON_SECRET>
```

- JSON with `"ok": true` → working
- `unauthorized` → `CRON_SECRET` here does not match Vercel's
- `{"ok": false}` with a KV message → Vercel is missing the Upstash vars

## What it deliberately does not do

- **No retries.** A missed tick is picked up 30 minutes later, and the
  merge is designed so a skipped refresh loses nothing.
- **No alerting.** Cloudflare will not email on failure. The daily
  GitHub Actions run in `.github/workflows/refresh-stats.yml` exists for
  that, since it fails loudly on a non-200.
