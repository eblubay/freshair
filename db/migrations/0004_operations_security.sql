-- Additive operations configuration, durable abuse protection, and integration state.
-- No existing booking, guest, or payment data is changed or removed.
CREATE TABLE IF NOT EXISTS payment_settings (
  property_id text PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'BRAINTREE',
  sandbox_enabled boolean NOT NULL DEFAULT true,
  live_enabled boolean NOT NULL DEFAULT false,
  card_enabled boolean NOT NULL DEFAULT true,
  ach_enabled boolean NOT NULL DEFAULT false,
  stripe_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS property_private_defaults (
  property_id text PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,
  door_code_ciphertext text,
  wifi_name_ciphertext text,
  wifi_password_ciphertext text,
  private_checkin_notes_ciphertext text,
  parking_private_notes_ciphertext text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loyalty_settings (
  property_id text PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  welcome_back_enabled boolean NOT NULL DEFAULT false,
  discount_type text,
  discount_value integer,
  expiration_days integer,
  max_uses integer,
  referral_enabled boolean NOT NULL DEFAULT false,
  referral_discount_type text,
  referral_discount_value integer,
  referral_expiration_days integer,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (discount_type IS NULL OR discount_type IN ('PERCENTAGE','FIXED')),
  CHECK (referral_discount_type IS NULL OR referral_discount_type IN ('PERCENTAGE','FIXED'))
);

CREATE TABLE IF NOT EXISTS ota_price_observations (
  id text PRIMARY KEY,
  property_id text NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  provider text NOT NULL,
  check_in date NOT NULL,
  check_out date NOT NULL,
  guests integer NOT NULL,
  currency text NOT NULL,
  total_amount integer NOT NULL,
  observed_at timestamptz NOT NULL,
  observed_by text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (check_out > check_in),
  CHECK (guests > 0),
  CHECK (total_amount >= 0)
);
CREATE INDEX IF NOT EXISTS ota_price_observations_lookup_idx ON ota_price_observations(property_id, check_in, check_out, guests, currency, observed_at DESC);

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  bucket_key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rate_limit_buckets_expiry_idx ON rate_limit_buckets(expires_at);

CREATE TABLE IF NOT EXISTS integration_events (
  provider text NOT NULL,
  event_id text NOT NULL,
  event_type text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  status text NOT NULL DEFAULT 'RECEIVED',
  error text,
  PRIMARY KEY(provider, event_id)
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id text PRIMARY KEY,
  external_calendar_id text NOT NULL REFERENCES external_calendars(id) ON DELETE CASCADE,
  external_uid text NOT NULL,
  reservation_id text REFERENCES reservations(id) ON DELETE SET NULL,
  check_in date NOT NULL,
  check_out date NOT NULL,
  summary text,
  sequence integer,
  raw_hash text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(external_calendar_id, external_uid),
  CHECK (check_out > check_in)
);
CREATE INDEX IF NOT EXISTS calendar_events_active_dates_idx ON calendar_events(external_calendar_id, active, check_in, check_out);

CREATE TABLE IF NOT EXISTS chat_conversations (
  id text PRIMARY KEY,
  provider_conversation_id text NOT NULL UNIQUE,
  question_count integer NOT NULL DEFAULT 0,
  ai_enabled boolean NOT NULL DEFAULT true,
  human_handoff boolean NOT NULL DEFAULT false,
  handoff_at timestamptz,
  resolved_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE guest_access_tokens ADD COLUMN IF NOT EXISTS revoked_at timestamptz;
ALTER TABLE external_calendars ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE external_calendars ADD COLUMN IF NOT EXISTS last_sync_status text NOT NULL DEFAULT 'NOT_SYNCED';
ALTER TABLE external_calendars ADD COLUMN IF NOT EXISTS last_event_count integer NOT NULL DEFAULT 0;
