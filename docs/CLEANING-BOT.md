# Cleaning Bot operations

The authoritative turnover calculation is [`recalculateCleaningTaskForCheckout()`](../lib/cleaning-domain.ts:18). It uses normalized records in [`reservations`](../db/migrations/0002_direct_booking_foundation.sql:21), regardless of source (`DIRECT`, `AIRBNB`, `BOOKING_COM`, `OTHER_OTA`, or `MANUAL`). It does not use browser calendar state or duplicate calculations in n8n.

## Safety and operational rules

- A task is derived from a completed/confirmed departure and the next confirmed guest arrival for the same `property_id`.
- Owner and maintenance blocks must be stored without a confirmed guest reservation, so they cannot become a next guest arrival.
- Same-day departures are `URGENT`; next-day arrivals are `HIGH`; no known next guest remains `NORMAL` with no invented deadline unless `no_next_guest_max_days` is set.
- Completed tasks are preserved during later calendar recalculation; they are not blindly reopened.
- Cleaner data, guest information, and access instructions are private. The public application has no cleaning route.

## Activation

1. Apply additive migrations [`0002_direct_booking_foundation.sql`](../db/migrations/0002_direct_booking_foundation.sql) and [`0003_cleaning_bot.sql`](../db/migrations/0003_cleaning_bot.sql).
2. Configure one [`cleaning_settings`](../db/migrations/0003_cleaning_bot.sql:11) row per enabled property and cleaners in [`cleaners`](../db/migrations/0003_cleaning_bot.sql:3).
3. Import [`n8n_workflow_cleaning_bot.json`](../n8n_workflow_cleaning_bot.json), configure n8n credentials/environment, then activate it.
4. Use `CALENDAR_SYNC_SECRET` only server-to-server in the `x-automation-secret` header. Never expose it to Telegram callbacks or the browser.

## Unified availability export

The authenticated, token-protected [`GET`](../app/api/calendar/[propertyId]/export/route.ts:7) route exports direct confirmed/held inventory as iCalendar availability. It deliberately includes no guest identity, access codes, payment details, or private notes. OTA import/sync clients must normalize inbound reservations into [`reservations`](../db/migrations/0002_direct_booking_foundation.sql:21), then invoke the recalculate route for affected departures.

## Callback validation

Telegram/n8n must map its signed callback payload to a known cleaner and invoke [`POST`](../app/api/internal/cleaning/action/route.ts:4) with a server-only automation secret. Supported state transitions are `CONFIRM`, `STARTED`, `COMPLETED`, `PROBLEM`, and `CANCEL`; `PROBLEM` creates a private incident.

## Required follow-up integrations

The workflow template intentionally has no live credentials, chat IDs, or recipient data. Configure cleaner-specific chat IDs from the private cleaner record, fallback SMTP only for a cleaner without Telegram, and add scheduled reminder/escalation jobs after actual account credentials and owner notification policy are supplied.
