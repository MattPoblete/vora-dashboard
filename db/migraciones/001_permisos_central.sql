-- One-off migration for databases created before:
--   * "backoffice" became "central" (postgres role + policy names)
--   * one `rol` per user became a set of `permisos` (checkboxes in the admin screen)
-- New databases get the final shape straight from db/init/002_auth_rls.sql. Safe to re-run.
-- (the old names below are intentional: they are what is being migrated away from)

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'vora_backoffice') AND NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'vora_central') THEN
    ALTER ROLE vora_backoffice RENAME TO vora_central; -- roles are cluster-wide, so this runs once
  END IF;
END $$;

DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE policyname LIKE '%backoffice%' LOOP
    EXECUTE format('ALTER POLICY %I ON %I.%I RENAME TO %I', p.policyname, p.schemaname, p.tablename, replace(p.policyname, 'backoffice', 'central'));
  END LOOP;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'rol') THEN
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS permisos text[] NOT NULL DEFAULT '{}';
    UPDATE usuarios SET permisos = (CASE rol::text
      WHEN 'admin' THEN '{admin}' WHEN 'vendedor' THEN '{ventas}' WHEN 'backoffice' THEN '{central}'
      WHEN 'empaquetador' THEN '{empaquetado}' WHEN 'peoneta' THEN '{despacho}' END)::text[];
    DROP FUNCTION IF EXISTS auth_intento(text);
    DROP FUNCTION IF EXISTS auth_sesion(text);
    ALTER TABLE usuarios DROP COLUMN rol; -- also drops the old CHECK that used it
    DROP TYPE IF EXISTS rol;
    ALTER TABLE usuarios ADD CONSTRAINT usuarios_permisos_validos
      CHECK (permisos <@ ARRAY['ventas', 'central', 'empaquetado', 'despacho', 'admin']);
    ALTER TABLE usuarios ADD CONSTRAINT usuarios_pareja
      CHECK (('ventas' = ANY(permisos)) = (vendedores IS NOT NULL));
  END IF;
END $$;
