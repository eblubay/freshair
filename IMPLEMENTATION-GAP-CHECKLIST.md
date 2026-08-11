# ShellByTheShore implementation gap checklist

Status is based on the committed baseline [`46bf938`](middleware.ts:1), inspected on 2026-08-10. “Verified” means a real automated local or staging check has been run; configuration scaffolding alone is not marked verified.

| Area | Status | Current state / remaining work |
|---|---|---|
| Next.js/Hostinger build consistency | DONE + VERIFIED | Clean staging browser run no longer reports missing Next CSS/chunks; immutable static assets are preserved while documents are no-store. |
| Direct booking schema, quote and hold | IMPLEMENTED BUT NOT VERIFIED | Server quote/hold foundation exists; guest UI is connected, but conflict/expiry integration tests remain. |
| Direct booking guest UI | IMPLEMENTED BUT NOT VERIFIED | Listing page supports dates, guest count, server quote, guest details and temporary holds; payment checkout/certification remain. |
| Braintree server capture | IMPLEMENTED BUT NOT VERIFIED | Nonce capture/idempotency, Hosted Fields, signed webhook parser, owner void/refund endpoints exist; sandbox provider run remains. |
| Stripe fallback | IMPLEMENTED BUT NOT VERIFIED | Environment-gated PaymentIntent adapter and signature-verified webhook are present; Payment Element UI and sandbox run remain. |
| ACH | IMPLEMENTED BUT NOT VERIFIED | Provider-reference pending lifecycle keeps inventory held and only settles after trusted provider settlement input; provider integration/webhook remains. |
| Owner calendar and OTA iCal import | IMPLEMENTED BUT NOT VERIFIED | Owner URL management, manual sync, safe iCal parser, event reconciliation, inventory blocks and cleaning recalc are present; scheduled authenticated runner and live OTA feeds remain. |
| Guest portal/secrets/check-in | IMPLEMENTED BUT NOT VERIFIED | Token hash/AES-GCM API, noindex guest portal and versioned digital check-in acknowledgement exist; owner secret management and secure session exchange remain. |
| Cleaning Bot | IMPLEMENTED BUT NOT VERIFIED | Schema, scheduling rules, private list, actions and n8n template exist; configuration UI, callback signing, reminders/escalation, full notifications remain. |
| Chatwoot/Ollama/Telegram | IMPLEMENTED BUT NOT VERIFIED | Ollama fallback, signed Chatwoot intake, dedupe and persisted handoff state exist; outbound Chatwoot/Telegram delivery remains. |
| Pre-arrival automation/n8n exports | IMPLEMENTED BUT NOT VERIFIED | Credential-free calendar, check-in, loyalty and Chatwoot workflow templates now exist; server-side automation runner and credential connection remain. |
| Loyalty/referrals | IMPLEMENTED BUT NOT VERIFIED | Owner switches, completed-stay idempotent WELCOMEBACK generation and referral creation exist; qualifying-referred-stay reward/email remains. |
| Weather | IMPLEMENTED BUT NOT VERIFIED | Server-side NWS forecast lookup, cache, API route and Local Guide snapshot exist; fallback coverage and live verification remain. |
| OTA comparison | MISSING | No manual verified-price entry or freshness validation surface. |
| Admin control center/health | IMPLEMENTED BUT NOT VERIFIED | Owner booking calendar, settings UI/API and credential-safe health API exist; private-detail/cleaner CRUD surfaces remain. |
| Transactional email suite | MISSING | Existing SMTP inquiry notification only. |
| RLS/rate limiting/webhook validation | IMPLEMENTED BUT NOT VERIFIED | Public sensitive routes use durable PostgreSQL buckets with local fallback; Stripe/Braintree webhook validation exists; RLS policy deployment and full provider tests remain. |
| Test suite | IMPLEMENTED BUT NOT VERIFIED | Five cleaning-rule tests pass; booking/payment/iCal/portal/AI/loyalty/weather test coverage remains. |

## Required-before-live values

Rates, fees, tax, cancellation policy, cleaner/host destinations and provider credentials are owner-configurable inputs. They must stay unconfigured and visible as `REQUIRED_BEFORE_LIVE` or `AWAITING_CREDENTIAL` until supplied; no business amount is inferred.

`APIFY RUNS = 0`
