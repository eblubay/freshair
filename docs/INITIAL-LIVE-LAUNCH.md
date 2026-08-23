# ShellByTheShore initial live launch

Public booking is inquiry-only. Direct booking remains preserved but requires both `BOOKING_MODE=direct` and `DIRECT_BOOKING_ENABLED=true`; launch configuration is `BOOKING_MODE=inquiry`.

## Required live secrets

- `POSTGRES_URL`
- `AUTOMATION_SECRET`
- `AIRBNB_ICAL_URL` (private, server only)
- `TELEGRAM_HOST_BOT_TOKEN`, `TELEGRAM_HOST_CHAT_ID`, `TELEGRAM_HOST_WEBHOOK_SECRET` (random Telegram webhook secret token)
- `HOST_OWNER_CLERK_USER_ID` (the only Clerk account allowed to provision an operational property)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USERNAME`, `SMTP_PASSWORD`
- `SMTP_FROM_EMAIL=stay@shellbytheshore.com`, `SMTP_FROM_NAME=ShellByTheShore`
- `IMAP_HOST`, `IMAP_PORT`, `IMAP_SECURE`, `IMAP_USERNAME`, `IMAP_PASSWORD`

Optional controls: `AIRBNB_CALENDAR_STALE_MINUTES=180`, `AIRBNB_ICAL_SYNC_MINUTES=30`, `MAX_OCCUPANCY=4`, `HOST_AI_DRAFT_ENABLED=false`, `SITE_URL`.

The Airbnb feed is pulled only into a private shadow calendar. Its advisory always requires owner verification. There is no Airbnb writeback, API, browser automation, scraping, or Apify operation.
