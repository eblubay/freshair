# ShellByTheShore implementation gap checklist

Status reflects the `hostinger-deploy-ready` implementation after the additive [`0006_loyalty_referral_lifecycle.sql`](db/migrations/0006_loyalty_referral_lifecycle.sql) migration and local verification on 2026-08-11. `DONE + VERIFIED` requires a completed local code or database verification; external providers remain configuration-gated.

| Area | Status | Current state / remaining work |
|---|---|---|
| Next.js/Hostinger build consistency | DONE + VERIFIED | Existing stale-asset mitigation is preserved; external Hostinger redeploy/browser proof is still required. |
| Direct booking quote, hold, and coupon locking | DONE + VERIFIED | Server-authoritative quote, transactional hold, coupon lock/increment, and expired-hold release are implemented. |
| Direct booking guest UI | DONE + VERIFIED | Date/guest inputs, coupon and referral-code inputs, holds, Braintree, and Stripe checkout selection are connected. |
| Braintree | AWAITING_CREDENTIAL | Hosted Fields, capture, refund/void, signature validation, and idempotency are code complete; sandbox credentials/run are required. |
| Stripe | AWAITING_CREDENTIAL | Payment Element, server-authoritative intents/confirmation, signature-verified webhook, and partial/full refund paths are code complete; sandbox credentials/run are required. |
| ACH | AWAITING_CREDENTIAL | Pending-to-settled lifecycle, authenticated/deduplicated webhook, and failed/returned inventory release are code complete; provider adapter credentials/run are required. |
| Owner calendar and iCal reconciliation | DONE + VERIFIED | Authenticated scheduler, parser, normalized reconciliation, stale/error state, and Cleaning Bot recalculation are implemented. Live OTA feed validation is external. |
| Guest portal, encrypted secrets, and check-in | DONE + VERIFIED | AES-GCM storage, hash-only/revocable tokens, release-window gating, no-store access, and digital check-in are implemented. |
| Cleaning Bot | DONE + VERIFIED | Deadline rules have local automated coverage; cleaner callback authorization/HMAC and event dedupe are implemented. Telegram delivery activation is external. |
| Chatwoot/Ollama/Telegram handoff | AWAITING_CREDENTIAL | Signed intake, persisted handoff, optional Chatwoot reply and Telegram escalation are code complete; provider endpoints/secrets are required. |
| Pre-arrival automation and n8n exports | DONE + VERIFIED | Credential-free inactive templates use protected automation endpoints and valid JSON. Scheduler activation requires deployment variables. |
| Loyalty lifecycle | DONE + VERIFIED | Eligible completed-stay WELCOMEBACK creation, refund/cancel disqualification, duplicate prevention, audit records, and SMTP-gated reward notification are implemented. |
| Referral lifecycle | DONE + VERIFIED | `CREATED → PENDING → QUALIFIED → REWARDED / REJECTED`, unique codes/qualifying stay, self-referral and duplicate prevention, atomic reward issuance, audit records, email event, and protected n8n template are implemented. |
| Weather | DONE + VERIFIED | Server-side NWS lookup, cache/fallback behavior, and public minimal response are implemented. |
| OTA comparison | DONE + VERIFIED | Owner-entered fresh comparable observations only; public route does not fabricate a comparison or expose owner notes. |
| Owner control center and health | DONE + VERIFIED | Owner authorization, booking/calendar/configuration screens, encrypted private defaults, and conservative health statuses are implemented. |
| RLS / cross-role direct database access | DONE + VERIFIED | `npm run test:rls` verified RLS on protected tables; `anon`/`authenticated` have zero direct reservation visibility; `service_role` is the intended bypass. Sensitive tables remain deny-by-default and server routes enforce Clerk property ownership. |
| Automated test suite | DONE + VERIFIED | `npm test` passes current deterministic unit tests and `npm run test:rls` passes live role-semantic RLS checks. External payment/provider acceptance tests require credentials. |

## External activation still required

Configure property rates/fees/taxes/cancellation policy and provider credentials; activate SMTP, Braintree/Stripe/ACH, Chatwoot, Telegram, calendar feeds, scheduler secret, and n8n credentials. Perform a clean-browser Hostinger deployment verification after the final push.

`APIFY RUNS = 0`
