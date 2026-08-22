-- Initial live launch: inquiry-only operations and read-only Airbnb advisory.
-- The private Airbnb feed URL remains exclusively in AIRBNB_ICAL_URL.

ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS public_reference text;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS guest_first_name text;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS guest_last_name text;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS owner_availability_decision text;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS owner_verified_at timestamptz;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS airbnb_advisory_at_creation text;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS airbnb_last_sync_at timestamptz;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS advisory_at_verification text;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS airbnb_sync_at_verification timestamptz;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS quoted_amount_minor integer;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS quoted_currency text;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'WEBSITE';
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS replied_at timestamptz;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS email_thread_message_id text;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS telegram_state text;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS telegram_draft text;
CREATE UNIQUE INDEX IF NOT EXISTS inquiries_public_reference_unique_idx ON inquiries(public_reference) WHERE public_reference IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS inquiries_idempotency_unique_idx ON inquiries(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS inquiries_status_created_idx ON inquiries(status,created_at DESC);

CREATE TABLE IF NOT EXISTS airbnb_shadow_events (
  id text PRIMARY KEY,
  source text NOT NULL DEFAULT 'AIRBNB_ICAL',
  external_uid text NOT NULL UNIQUE,
  source_event_type text NOT NULL DEFAULT 'UNKNOWN_BLOCK',
  start_at date NOT NULL,
  end_at date NOT NULL,
  summary_sanitized text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_sync_at timestamptz NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  source_hash text NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  removed_from_feed_at timestamptz,
  owner_classification text,
  owner_verified_at timestamptz,
  owner_verification_result text,
  reservation_id text REFERENCES reservations(id) ON DELETE SET NULL,
  CHECK(end_at > start_at)
);
CREATE INDEX IF NOT EXISTS airbnb_shadow_active_dates_idx ON airbnb_shadow_events(active,start_at,end_at);

-- Airbnb iCal does not contain trustworthy guest identity or pricing.  The
-- operational reservation model therefore permits those fields to remain
-- unknown for an owner-verified Airbnb stay instead of fabricating values.
ALTER TABLE reservations ALTER COLUMN guest_first_name DROP NOT NULL;
ALTER TABLE reservations ALTER COLUMN guest_last_name DROP NOT NULL;
ALTER TABLE reservations ALTER COLUMN guest_email DROP NOT NULL;
ALTER TABLE reservations ALTER COLUMN total_guests DROP NOT NULL;
ALTER TABLE reservations ALTER COLUMN currency DROP NOT NULL;
ALTER TABLE reservations ALTER COLUMN subtotal DROP NOT NULL;
ALTER TABLE reservations ALTER COLUMN cleaning_fee DROP NOT NULL;
ALTER TABLE reservations ALTER COLUMN taxes DROP NOT NULL;
ALTER TABLE reservations ALTER COLUMN total_amount DROP NOT NULL;
ALTER TABLE reservations ALTER COLUMN amount_due DROP NOT NULL;

CREATE TABLE IF NOT EXISTS airbnb_calendar_state (
  source text PRIMARY KEY DEFAULT 'AIRBNB_ICAL',
  last_sync_attempt timestamptz,
  last_successful_sync timestamptz,
  last_sync_success boolean,
  last_duration_ms integer,
  active_events integer NOT NULL DEFAULT 0,
  consecutive_failures integer NOT NULL DEFAULT 0,
  feed_last_modified_at timestamptz,
  last_material_change_at timestamptz,
  last_error_sanitized text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS airbnb_sync_history (
  id text PRIMARY KEY,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  successful boolean NOT NULL,
  duration_ms integer NOT NULL,
  active_events integer NOT NULL DEFAULT 0,
  events_added integer NOT NULL DEFAULT 0,
  events_changed integer NOT NULL DEFAULT 0,
  events_removed integer NOT NULL DEFAULT 0,
  feed_last_modified_at timestamptz,
  error_sanitized text
);
CREATE INDEX IF NOT EXISTS airbnb_sync_history_attempt_idx ON airbnb_sync_history(attempted_at DESC);

CREATE TABLE IF NOT EXISTS availability_reliability_records (
  id text PRIMARY KEY,
  inquiry_id text NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  advisory text NOT NULL,
  owner_decision text NOT NULL,
  airbnb_last_sync_at timestamptz,
  stale_at_decision boolean NOT NULL DEFAULT false,
  comparison_result text NOT NULL,
  decided_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inquiry_messages (
  id text PRIMARY KEY,
  inquiry_id text NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  direction text NOT NULL,
  channel text NOT NULL DEFAULT 'EMAIL',
  message_id text,
  in_reply_to text,
  references_header text,
  subject text,
  content_plain text NOT NULL,
  owner_identity text,
  sent_at timestamptz,
  received_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS inquiry_messages_message_id_unique_idx ON inquiry_messages(message_id) WHERE message_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS telegram_interactions (
  update_id text PRIMARY KEY,
  chat_id text NOT NULL,
  inquiry_id text REFERENCES inquiries(id) ON DELETE CASCADE,
  action text,
  state text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS operational_health_alerts (
  alert_key text PRIMARY KEY,
  kind text NOT NULL,
  severity text NOT NULL,
  message text NOT NULL,
  occurrence_count integer NOT NULL DEFAULT 1,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_notified_at timestamptz,
  resolved_at timestamptz
);

ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE airbnb_shadow_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE airbnb_calendar_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE airbnb_sync_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_reliability_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_health_alerts ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE inquiries IS 'No direct public reads or writes; valid submissions are mediated by the server endpoint.';
COMMENT ON TABLE airbnb_shadow_events IS 'Private read-only imported advisory layer; never exposed by public APIs.';
