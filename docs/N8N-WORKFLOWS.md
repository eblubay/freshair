# n8n workflow templates

The files [`n8n_workflow_calendar_sync.json`](n8n_workflow_calendar_sync.json), [`n8n_workflow_checkin_automation.json`](n8n_workflow_checkin_automation.json), [`n8n_workflow_loyalty_referral.json`](n8n_workflow_loyalty_referral.json), [`n8n_workflow_chatwoot_ollama_telegram.json`](n8n_workflow_chatwoot_ollama_telegram.json), and [`n8n_workflow_cleaning_bot.json`](n8n_workflow_cleaning_bot.json) are credential-free import templates.

Before activation, connect the HTTP authentication expected by each internal route, configure the base URL, and connect SMTP/Telegram/Chatwoot only through n8n credentials. Do not add provider secrets or guest private information to workflow JSON, execution notes, or message logs.

Keep every workflow inactive until its corresponding server integration reports a configured and tested state.
