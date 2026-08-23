-- Remove inherited Supabase API-role privileges from every application table.
-- All public application access is mediated by trusted server routes.
DO $lockdown$
DECLARE
	table_record record;
BEGIN
	FOR table_record IN
		SELECT schemaname, tablename
		FROM pg_tables
		WHERE schemaname = 'public'
	LOOP
		EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', table_record.schemaname, table_record.tablename);
		EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I.%I FROM anon, authenticated', table_record.schemaname, table_record.tablename);
		EXECUTE format('GRANT ALL PRIVILEGES ON TABLE %I.%I TO service_role', table_record.schemaname, table_record.tablename);
	END LOOP;
END
$lockdown$;
