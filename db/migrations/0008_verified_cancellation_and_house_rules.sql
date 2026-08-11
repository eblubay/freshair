-- Verified property rules and cancellation policy. All values remain owner-editable.
ALTER TABLE booking_settings
  ADD COLUMN IF NOT EXISTS full_refund_days integer NOT NULL DEFAULT 14,
  ADD COLUMN IF NOT EXISTS partial_refund_start_days integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS partial_refund_percentage integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS late_cancellation_refund_percentage integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pets_allowed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quiet_hours_start text NOT NULL DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS quiet_hours_end text NOT NULL DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS parties_allowed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS commercial_photography_allowed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS indoor_smoking_allowed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS garage_clearance_inches integer NOT NULL DEFAULT 74,
  ADD COLUMN IF NOT EXISTS smoking_cleaning_charge_max integer NOT NULL DEFAULT 25000,
  ADD COLUMN IF NOT EXISTS refundable_fee_policy_configured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS refundable_tax_policy_configured boolean NOT NULL DEFAULT false;

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS scheduled_checkin_at timestamptz,
  ADD COLUMN IF NOT EXISTS california_grace_period_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS california_grace_period_expires_at timestamptz;

ALTER TABLE booking_consents
  ADD COLUMN IF NOT EXISTS house_rules_version text,
  ADD COLUMN IF NOT EXISTS house_rules_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS house_rules_accepted_at timestamptz;

CREATE TABLE IF NOT EXISTS cancellation_requests (
  id text PRIMARY KEY,
  reservation_id text NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  requested_at timestamptz NOT NULL DEFAULT now(),
  tier text NOT NULL,
  accommodation_refund_amount integer NOT NULL,
  fee_refund_amount integer NOT NULL,
  tax_refund_amount integer NOT NULL,
  total_refund_amount integer NOT NULL,
  explanation text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING_OWNER_REVIEW',
  reviewed_at timestamptz,
  reviewer_id text
);
ALTER TABLE cancellation_requests ENABLE ROW LEVEL SECURITY;

UPDATE booking_settings
SET checkin_time='15:00', checkout_time='10:00', max_guests=4,
  full_refund_days=14, partial_refund_start_days=7, partial_refund_percentage=50,
  late_cancellation_refund_percentage=0, pets_allowed=false,
  quiet_hours_start='22:00', quiet_hours_end='08:00', parties_allowed=false,
  commercial_photography_allowed=false, indoor_smoking_allowed=false,
  garage_clearance_inches=74, smoking_cleaning_charge_max=25000;
