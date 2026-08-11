-- Complete the referral qualification lifecycle without altering existing data.
ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS qualifying_reservation_id text REFERENCES reservations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS qualified_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

CREATE UNIQUE INDEX IF NOT EXISTS referrals_qualifying_reservation_unique_idx
  ON referrals(qualifying_reservation_id)
  WHERE qualifying_reservation_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS referrals_referred_email_unique_idx
  ON referrals(lower(referred_email))
  WHERE referred_email IS NOT NULL;

ALTER TABLE referrals
  DROP CONSTRAINT IF EXISTS referrals_status_check;
ALTER TABLE referrals
  ADD CONSTRAINT referrals_status_check
  CHECK (status IN ('CREATED', 'PENDING', 'QUALIFIED', 'REWARDED', 'REJECTED'));

COMMENT ON COLUMN referrals.qualifying_reservation_id IS
  'The referred guest reservation that must complete before a referral reward is issued.';
