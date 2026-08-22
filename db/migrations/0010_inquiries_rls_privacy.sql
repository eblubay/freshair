-- Guest inquiries contain PII and are accessible only through trusted server
-- connections. Public Supabase roles receive no direct table privileges.
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.inquiries FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.inquiries FROM authenticated;

GRANT ALL PRIVILEGES ON TABLE public.inquiries TO service_role;

COMMENT ON TABLE public.inquiries IS
  'Guest PII. Direct anon/authenticated access is revoked; trusted server operations use service authority.';
