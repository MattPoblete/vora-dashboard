-- Hosted on Supabase: its Data API (REST) and GraphQL run as the roles anon / authenticated, and Supabase grants
-- those roles every table and function created in public. This app never uses that API (it connects as vora_app and
-- switches roles per request, lib/session.ts), so they get nothing. Without this, anyone holding the publishable key
-- (public by design) could call auth_intento (password hashes) or admin_crear_usuario through /rest/v1/rpc.
-- Also turn the Data API off in the dashboard (Integrations > Data API): defense in depth.
-- No-op for the roles where they don't exist (local docker). Idempotent; runs last, after every object exists.

DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    CONTINUE WHEN NOT EXISTS (SELECT FROM pg_roles WHERE rolname = r);
    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', r);
    EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', r);
    EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %I', r);
    -- and for whatever later migrations create
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', r);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', r);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I', r);
  END LOOP;
END $$;

-- Postgres itself grants EXECUTE on every new function to PUBLIC (every role); the migrations grant what each role
-- needs explicitly, so new functions start closed. app_vendedores() was the one left open that way (harmless: it
-- only echoes the caller's own transaction setting); vora_vendedor keeps its explicit grant.
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION app_vendedores() FROM PUBLIC;
