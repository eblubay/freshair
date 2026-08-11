-- Defense-in-depth for Supabase client access. Application routes use the
-- server database connection and explicit Clerk/property ownership checks.
-- No direct anon/authenticated policies are granted for sensitive operations.
ALTER TABLE IF EXISTS reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inventory_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS processed_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS booking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS guest_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reservation_private_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS guest_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS external_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS property_private_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS loyalty_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ota_price_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rate_limit_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS integration_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cleaning_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cleaning_task_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cleaning_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cleaners ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cleaning_settings ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE reservations IS 'Direct client access denied by RLS; owner and guest access is mediated by authenticated server routes.';
COMMENT ON TABLE reservation_private_details IS 'Encrypted private guest details. Direct client access denied by RLS.';
COMMENT ON TABLE payments IS 'Payment ledger. Direct client access denied by RLS.';
