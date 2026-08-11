# n8n workflow templates

The files [`n8n_workflow_calendar_sync.json`](n8n_workflow_calendar_sync.json), [`n8n_workflow_checkin_automation.json`](n8n_workflow_checkin_automation.json), [`n8n_workflow_loyalty_referral.json`](n8n_workflow_loyalty_referral.json), [`n8n_workflow_chatwoot_ollama_telegram.json`](n8n_workflow_chatwoot_ollama_telegram.json), and [`n8n_workflow_cleaning_bot.json`](n8n_workflow_cleaning_bot.json) are credential-free import templates.

Before activation, configure `SHELLBYTHESHORE_BASE_URL` and `AUTOMATION_SECRET` in n8n credentials/environment variables. The calendar and check-in templates call the protected server-to-server routes [`/api/internal/automation/calendar-sync`](app/api/internal/automation/calendar-sync/route.ts) and [`/api/internal/automation/checkin`](app/api/internal/automation/checkin/route.ts) with the `x-automation-secret` header. Do not use the owner session routes for scheduled jobs.

The Cleaning Bot template requires a Telegram bot credential and a `TELEGRAM_CALLBACK_SECRET` to create signed callback payloads. The Chatwoot template requires a Chatwoot API credential plus `CHATWOOT_WEBHOOK_SECRET`; host escalation additionally requires the Telegram host chat destination. The loyalty/referral template needs the automation header and SMTP configuration for any outbound email.

Connect SMTP/Telegram/Chatwoot only through n8n credentials or server environment variables. Do not add provider secrets or guest private information to workflow JSON, execution notes, or message logs.

Keep every workflow inactive until its corresponding server integration reports a configured and tested state.
