-- Unified, property-aware turnover operations. This is additive and never
-- exposes cleaner or operational data to public listing routes.
CREATE TABLE IF NOT EXISTS cleaners (
  id text PRIMARY KEY, name text NOT NULL, company_name text, phone text, email text,
  telegram_chat_id text, active boolean NOT NULL DEFAULT true, preferred_channel text NOT NULL DEFAULT 'TELEGRAM',
  notes text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cleaning_settings (
  property_id text PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false, default_cleaner_id text REFERENCES cleaners(id) ON DELETE SET NULL,
  normal_completion_buffer_hours integer NOT NULL DEFAULT 0, same_day_priority boolean NOT NULL DEFAULT true,
  same_day_ack_timeout_minutes integer NOT NULL DEFAULT 30, normal_ack_timeout_hours integer NOT NULL DEFAULT 12,
  reminder_hours_before_deadline integer NOT NULL DEFAULT 6, urgent_reminder_minutes integer NOT NULL DEFAULT 60,
  host_escalation_hours integer NOT NULL DEFAULT 2, no_next_guest_max_days integer,
  cleaner_notification_channel text NOT NULL DEFAULT 'TELEGRAM', host_notification_channel text NOT NULL DEFAULT 'TELEGRAM',
  external_calendar_stale_hours integer NOT NULL DEFAULT 24, updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cleaning_tasks (
  id text PRIMARY KEY, property_id text NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  checkout_reservation_id text NOT NULL REFERENCES reservations(id) ON DELETE CASCADE, checkout_source text NOT NULL,
  checkout_date date NOT NULL, checkout_time text, next_reservation_id text REFERENCES reservations(id) ON DELETE SET NULL,
  next_arrival_source text, next_checkin_date date, next_checkin_time text, same_day_turnover boolean NOT NULL DEFAULT false,
  no_upcoming_arrival boolean NOT NULL DEFAULT false, cleaning_window_start timestamptz, cleaning_deadline timestamptz,
  priority text NOT NULL DEFAULT 'NORMAL', status text NOT NULL DEFAULT 'PENDING', assigned_cleaner_id text REFERENCES cleaners(id) ON DELETE SET NULL,
  notes text, notified_at timestamptz, acknowledged_at timestamptz, started_at timestamptz, completed_at timestamptz,
  issue_reported_at timestamptz, escalated_at timestamptz, last_reminded_at timestamptz, sync_warning boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(property_id, checkout_reservation_id)
);

CREATE TABLE IF NOT EXISTS cleaning_task_events (
  id text PRIMARY KEY, task_id text NOT NULL REFERENCES cleaning_tasks(id) ON DELETE CASCADE,
  actor_type text NOT NULL, actor_id text, event_type text NOT NULL, channel text, payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cleaning_incidents (
  id text PRIMARY KEY, task_id text NOT NULL REFERENCES cleaning_tasks(id) ON DELETE CASCADE,
  issue_type text NOT NULL, notes text, status text NOT NULL DEFAULT 'OPEN', reported_by text, created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS cleaning_tasks_property_deadline_idx ON cleaning_tasks(property_id, cleaning_deadline);
CREATE INDEX IF NOT EXISTS cleaning_tasks_status_idx ON cleaning_tasks(status, priority);
CREATE INDEX IF NOT EXISTS cleaning_task_events_task_idx ON cleaning_task_events(task_id, created_at);
