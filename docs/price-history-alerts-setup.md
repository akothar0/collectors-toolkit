# Price history & alerts — deployment setup

Apply after merging the price-history workstream. Migration `013_price_history_alerts` adds observation storage and alert dedupe tables.

## 1. Database

```bash
npx supabase db push
```

Or confirm `price_history_alerts` appears in Supabase migration history.

## 2. Environment variables

Set on **Vercel Production** (and Preview if you test crons there):

| Variable | Required | Notes |
|----------|----------|-------|
| `CARDSIGHTAI_API_KEY` | Yes | Sold comps |
| `PRICING_CRON_SECRET` or `CRON_SECRET` | For crons | Vercel sends `Authorization: Bearer <secret>` |
| `PRICING_CRON_CARD_LIMIT` | Recommended | Default **15** in repo (weekly cron) |
| `PRICING_MONTHLY_CAP` | Recommended | Default **500** CardSight fetches/month |
| `RESEND_API_KEY` | For emails | Alerts + digest return 503 without it |
| `RESEND_FROM_EMAIL` | For emails | Must use a verified Resend domain |
| `NEXT_PUBLIC_APP_URL` | For emails | e.g. `https://your-app.vercel.app` |

Copy placeholders from [`.env.example`](../.env.example) into local `.env.local` for dev.

## 3. Vercel Cron Jobs

[`vercel.json`](../vercel.json) schedules:

| Path | Schedule (UTC) | Purpose |
|------|----------------|---------|
| `/api/pricing/cron` | Sun 06:00 | Refresh stale comps (bounded by `PRICING_CRON_CARD_LIMIT`) |
| `/api/alerts/cron` | Daily 07:00 | Want-list target price emails |
| `/api/alerts/digest-cron` | Mon 08:00 | Weekly portfolio movers email |

Enable **Cron Jobs** on the Vercel project after deploy.

## 4. Smoke-test crons (staging/production)

```bash
curl -X POST "$APP_URL/api/pricing/cron" \
  -H "Authorization: Bearer $PRICING_CRON_SECRET"

curl -X POST "$APP_URL/api/alerts/cron" \
  -H "Authorization: Bearer $PRICING_CRON_SECRET"
```

Pricing cron returns `{ success, summary, quota: { used, cap } }`. Alerts require Resend configured.

## 5. Manual QA

- Collection detail: Comp window, explore filters (no extra CardSight calls), Refresh comps, 90-day sparkline after multiple refreshes.
- Want list: UNDER/OVER chips; item with `target_price` receives email when median ≤ target (after alerts cron).
- `users.email_alerts_enabled` defaults to `true`; set `false` in DB to opt out until a settings UI exists.
