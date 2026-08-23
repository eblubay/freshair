# Production domain cutover and rollback

Canonical production URL: `https://shellbytheshore.com`.

## Hostinger environment cutover

Set these existing application variables to the canonical origin before the production rebuild:

- `SITE_URL=https://shellbytheshore.com` — Telegram webhook setup/status callback origin.
- `NEXT_PUBLIC_SITE_URL=https://shellbytheshore.com` — metadata indexing gate, metadata base, pre-arrival links, and health configuration check.
- `SHELLBYTHESHORE_BASE_URL=https://shellbytheshore.com` — server-generated pre-arrival links.
- Keep `BOOKING_MODE=inquiry`, `DIRECT_BOOKING_ENABLED=false`, `PAYMENTS_ENABLED=false`, and `PAYMENTS_LIVE_ENABLED=false` for inquiry-only launch.
- Keep `HOST_AI_DRAFT_ENABLED=true`; without an already configured provider the control truthfully reports unavailable.

Do not create similarly named replacement variables. `NEXT_PUBLIC_APP_URL` is not read by the current application.

## External account settings

1. Add `https://shellbytheshore.com` to the existing Clerk production instance's allowed application URLs/origins and redirect URLs. Do not allow wildcard origins.
2. Attach the apex domain in Hostinger, enable its managed TLS certificate, and configure `www.shellbytheshore.com` to permanently redirect to the apex canonical URL.
3. Rebuild once after changing build-time public environment values, then restart the Node application.
4. Use the existing owner-only Telegram setup control after `SITE_URL` changes so Telegram points to `https://shellbytheshore.com/api/telegram/host/callback`.
5. Change only the hostname in the existing Hostinger hourly cron request to the apex production hostname. Keep its schedule, path, method, and `AUTOMATION_SECRET` unchanged.

The application has no permissive CORS configuration. Sitemap, robots production output, canonical metadata, and structured website data are pinned to the apex HTTPS origin.

## Application rollback

Known-good launch baseline before this closure: `8e69d27` (`Fix staging robots metadata route`). In Hostinger, select that Git revision in deployment history (or deploy that revision from `hostinger-deploy-ready`), rebuild, and restart. Do not merge `main` as part of rollback.

Database ACL/RLS migrations `0010`, `0011`, and `0012` are security hardening and must not be casually reversed. Application rollback does not require database rollback. If a later database migration causes an incident, preserve evidence and restore into an isolated database from a verified provider backup or logical dump before planning a forward repair.

## Database backup readiness

Use the database provider's managed backups plus a logical `pg_dump` archive before future schema changes. Store dumps outside the repository and validate with `pg_restore --list`; restore-test only into an isolated disposable PostgreSQL database, never over staging or production.
