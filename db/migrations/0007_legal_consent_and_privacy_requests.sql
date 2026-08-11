-- Additive legal-consent and privacy-request records. Historical consent is immutable.
CREATE TABLE IF NOT EXISTS booking_consents (
  reservation_id text PRIMARY KEY REFERENCES reservations(id) ON DELETE CASCADE,
  terms_version text NOT NULL,
  privacy_version text NOT NULL,
  terms_accepted boolean NOT NULL,
  privacy_acknowledged boolean NOT NULL,
  terms_effective_date date NOT NULL,
  privacy_effective_date date NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS privacy_requests (
  id text PRIMARY KEY,
  request_type text NOT NULL CHECK (request_type IN ('ACCESS','CORRECTION','DELETION','QUESTION','DO_NOT_SELL_OR_SHARE')),
  name text NOT NULL,
  email text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED','IN_REVIEW','COMPLETED','DECLINED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewer_id text
);
CREATE INDEX IF NOT EXISTS privacy_requests_status_created_idx ON privacy_requests(status, created_at);

CREATE TABLE IF NOT EXISTS data_retention_settings (
  property_id text PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,
  reservation_accounting_days integer,
  guest_access_days integer,
  private_arrival_days integer,
  checkin_acknowledgement_days integer,
  ai_chat_days integer,
  audit_security_days integer,
  optional_id_upload_days integer,
  loyalty_referral_days integer,
  id_uploads_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (reservation_accounting_days IS NULL OR reservation_accounting_days > 0),
  CHECK (guest_access_days IS NULL OR guest_access_days > 0),
  CHECK (private_arrival_days IS NULL OR private_arrival_days > 0),
  CHECK (checkin_acknowledgement_days IS NULL OR checkin_acknowledgement_days > 0),
  CHECK (ai_chat_days IS NULL OR ai_chat_days > 0),
  CHECK (audit_security_days IS NULL OR audit_security_days > 0),
  CHECK (optional_id_upload_days IS NULL OR optional_id_upload_days > 0),
  CHECK (loyalty_referral_days IS NULL OR loyalty_referral_days > 0)
);

ALTER TABLE booking_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_retention_settings ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE booking_consents IS 'Immutable record of the legal policy versions accepted for a reservation.';
COMMENT ON TABLE privacy_requests IS 'Owner-reviewed privacy requests; requests are not exposed through public status URLs.';
