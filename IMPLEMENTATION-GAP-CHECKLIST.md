# ShellByTheShore implementation gap checklist

Status is based on the committed baseline [`46bf938`](middleware.ts:1), inspected on 2026-08-10. “Verified” means a real automated local or staging check has been run; configuration scaffolding alone is not marked verified.

| Area | Status | Current state / remaining work |
|---|---|---|
| Next.js/Hostinger build consistency | DONE + VERIFIED | Clean staging browser run no longer reports missing Next CSS/chunks; immutable static assets are preserved while documents are no-store. |
| Direct booking schema, quote and hold | IMPLEMENTED BUT NOT VERIFIED | Server quote/hold foundation exists; guest UI is connected, but conflict/expiry integration tests remain. |
| Direct booking guest UI | IMPLEMENTED BUT NOT VERIFIED | Listing page supports dates, guest count, server quote, guest details and temporary holds; payment checkout/certification remain. |
| Braintree server capture | IMPLEMENTED BUT NOT VERIFIED | Nonce capture/idempotency and Hosted Fields UI exist; sandbox run, webhook and refund lifecycle remain. |
| Stripe fallback | MISSING | No adapter or environment-safe fallback implemented. |
| ACH | MISSING | No pending/settled workflow adapter. |
| Owner calendar and OTA iCal import | IMPLEMENTED BUT NOT VERIFIED | Private owner booking calendar and private iCal export exist; imports, reconciliation and sync status remain. |
| Guest portal/secrets/check-in | IMPLEMENTED BUT NOT VERIFIED | Token hash/AES-GCM API, noindex guest portal and versioned digital check-in acknowledgement exist; owner secret management and secure session exchange remain. |
| Cleaning Bot | IMPLEMENTED BUT NOT VERIFIED | Schema, scheduling rules, private list, actions and n8n template exist; configuration UI, callback signing, reminders/escalation, full notifications remain. |
| Chatwoot/Ollama/Telegram | MISSING | Concierge no-key fallback exists only; webhook, state, handoff and private integrations remain. |
| Pre-arrival automation/n8n exports | MISSING | Only Cleaning workflow template exists. |
| Loyalty/referrals | MISSING | Schema foundation exists; lifecycle/configuration UI and reward jobs remain. |
| Weather | IMPLEMENTED BUT NOT VERIFIED | Server-side NWS forecast lookup, cache, API route and Local Guide snapshot exist; fallback coverage and live verification remain. |
| OTA comparison | MISSING | No manual verified-price entry or freshness validation surface. |
| Admin control center/health | IMPLEMENTED BUT NOT VERIFIED | Owner booking calendar and credential-safe health API exist; rate/payment/calendar/private-detail settings UI remains. |
| Transactional email suite | MISSING | Existing SMTP inquiry notification only. |
| RLS/rate limiting/webhook validation | IMPLEMENTED BUT NOT VERIFIED | Public booking and guest-token endpoints have process-local IP rate limiting; database RLS policies, shared rate-limit store and full provider webhook validation remain. |
| Test suite | IMPLEMENTED BUT NOT VERIFIED | Five cleaning-rule tests pass; booking/payment/iCal/portal/AI/loyalty/weather test coverage remains. |

## Required-before-live values

Rates, fees, tax, cancellation policy, cleaner/host destinations and provider credentials are owner-configurable inputs. They must stay unconfigured and visible as `REQUIRED_BEFORE_LIVE` or `AWAITING_CREDENTIAL` until supplied; no business amount is inferred.

`APIFY RUNS = 0`
