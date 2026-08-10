-- ShellByTheShore direct-booking foundation. Apply with the existing Supabase
-- PostgreSQL connection before enabling DIRECT_BOOKING_ENABLED in production.
-- Existing listing and inquiry data is never altered or removed.
CREATE TABLE IF NOT EXISTS booking_settings (
  property_id text PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,
  currency text NOT NULL DEFAULT 'USD', timezone text NOT NULL DEFAULT 'America/Los_Angeles',
  base_nightly_rate integer NOT NULL DEFAULT 0, cleaning_fee integer NOT NULL DEFAULT 0,
  tax_rate_basis_points integer NOT NULL DEFAULT 0, min_stay_nights integer NOT NULL DEFAULT 1,
  max_stay_nights integer NOT NULL DEFAULT 30, min_booking_lead_hours integer NOT NULL DEFAULT 0,
  max_guests integer NOT NULL DEFAULT 4, checkin_time text, checkout_time text,
  booking_hold_minutes integer NOT NULL DEFAULT 15, ach_pending_hold_hours integer NOT NULL DEFAULT 72,
  guest_secret_release_hours integer NOT NULL DEFAULT 24, cancellation_policy_text text,
  payments_enabled boolean NOT NULL DEFAULT false, direct_booking_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS rate_calendar (
  property_id text NOT NULL REFERENCES properties(id) ON DELETE CASCADE, date date NOT NULL,
  nightly_rate integer, minimum_stay integer, blocked boolean NOT NULL DEFAULT false, notes text,
  source text NOT NULL DEFAULT 'OWNER', updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(property_id,date)
);
CREATE TABLE IF NOT EXISTS reservations (
  id text PRIMARY KEY, confirmation_code text NOT NULL UNIQUE, property_id text NOT NULL REFERENCES properties(id),
  booking_source text NOT NULL DEFAULT 'DIRECT', external_reference text, client_request_id text UNIQUE, guest_id text,
  guest_first_name text NOT NULL, guest_last_name text NOT NULL, guest_email text NOT NULL, guest_phone text,
  check_in date NOT NULL, check_out date NOT NULL, adults integer NOT NULL DEFAULT 1, children integer NOT NULL DEFAULT 0, total_guests integer NOT NULL,
  booking_status text NOT NULL, payment_status text NOT NULL, currency text NOT NULL,
  subtotal integer NOT NULL, cleaning_fee integer NOT NULL, taxes integer NOT NULL, discount_amount integer NOT NULL DEFAULT 0,
  total_amount integer NOT NULL, amount_paid integer NOT NULL DEFAULT 0, amount_due integer NOT NULL,
  payment_provider text, provider_customer_id text, provider_transaction_id text, price_snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), confirmed_at timestamptz, cancelled_at timestamptz, completed_at timestamptz,
  CHECK(check_out > check_in)
);
-- Supports safe re-application when an earlier foundation was already present.
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS client_request_id text;
CREATE UNIQUE INDEX IF NOT EXISTS reservations_client_request_unique_idx ON reservations(client_request_id) WHERE client_request_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS inventory_days (
  property_id text NOT NULL REFERENCES properties(id) ON DELETE CASCADE, date date NOT NULL,
  reservation_id text REFERENCES reservations(id) ON DELETE CASCADE, source text NOT NULL, status text NOT NULL,
  hold_expires_at timestamptz, external_reference text, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(property_id,date)
);
CREATE TABLE IF NOT EXISTS payments (
  id text PRIMARY KEY, reservation_id text NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  provider text NOT NULL, provider_transaction_id text, method text, amount integer NOT NULL, currency text NOT NULL,
  status text NOT NULL, idempotency_key text NOT NULL UNIQUE, provider_status text, refunded_amount integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), settled_at timestamptz
);
CREATE TABLE IF NOT EXISTS processed_webhook_events (
  provider text NOT NULL, event_id text NOT NULL, received_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb, PRIMARY KEY(provider,event_id)
);
CREATE TABLE IF NOT EXISTS booking_events (
  id text PRIMARY KEY, reservation_id text REFERENCES reservations(id) ON DELETE CASCADE,
  event_type text NOT NULL, payload jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS external_calendars (
  id text PRIMARY KEY, property_id text NOT NULL REFERENCES properties(id) ON DELETE CASCADE, provider text NOT NULL,
  url text NOT NULL, enabled boolean NOT NULL DEFAULT true, last_sync_at timestamptz, last_success_at timestamptz, last_error text, etag text, last_modified text
);
CREATE TABLE IF NOT EXISTS guest_access_tokens (
  id text PRIMARY KEY, reservation_id text NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, used_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS reservation_private_details (
  reservation_id text PRIMARY KEY REFERENCES reservations(id) ON DELETE CASCADE, door_code_ciphertext text, wifi_name_ciphertext text,
  wifi_password_ciphertext text, private_checkin_notes_ciphertext text, parking_private_notes_ciphertext text, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS guest_checkins (
  id text PRIMARY KEY, reservation_id text NOT NULL UNIQUE REFERENCES reservations(id) ON DELETE CASCADE, arrival_time text,
  occupants integer, emergency_contact text, house_rules_version text, agreement_version text, typed_confirmation text,
  accepted_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS coupons (id text PRIMARY KEY, code text NOT NULL UNIQUE, discount_type text NOT NULL, discount_value integer NOT NULL, expiration_date date, max_uses integer, current_uses integer NOT NULL DEFAULT 0, created_for_guest_email text, active boolean NOT NULL DEFAULT true, created_reason text, source_reservation_id text REFERENCES reservations(id), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS coupon_redemptions (id text PRIMARY KEY, coupon_id text NOT NULL REFERENCES coupons(id), reservation_id text NOT NULL UNIQUE REFERENCES reservations(id), amount integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS referrals (id text PRIMARY KEY, referrer_email text NOT NULL, referred_email text, referral_code text NOT NULL UNIQUE, source_reservation_id text REFERENCES reservations(id), status text NOT NULL, reward_coupon_id text REFERENCES coupons(id), created_at timestamptz NOT NULL DEFAULT now(), rewarded_at timestamptz);
CREATE TABLE IF NOT EXISTS audit_events (id text PRIMARY KEY, actor_type text NOT NULL, actor_id text, event_type text NOT NULL, reservation_id text REFERENCES reservations(id), metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS reservations_property_dates_idx ON reservations(property_id,check_in,check_out);
CREATE INDEX IF NOT EXISTS inventory_reservation_idx ON inventory_days(reservation_id);
CREATE INDEX IF NOT EXISTS reservations_client_request_idx ON reservations(client_request_id) WHERE client_request_id IS NOT NULL;
