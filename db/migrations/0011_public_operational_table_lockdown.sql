-- Close direct Supabase-role access to legacy tables created before the
-- operational RLS migrations. Application reads and writes remain mediated by
-- trusted server connections.
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraping_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_calendar ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.properties FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.scraping_jobs FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.booking_settings FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.rate_calendar FROM anon, authenticated;

GRANT ALL PRIVILEGES ON TABLE public.properties TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.scraping_jobs TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.booking_settings TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.rate_calendar TO service_role;
