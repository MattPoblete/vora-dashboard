-- Audit trail: who created or changed a client / order, when, and what changed. Filled by triggers, so no code path
-- can forget it; the app tells the trigger who is acting through the transaction setting app.usuario (lib/session.ts).
-- Idempotent; run once with psql -f on older databases. Needs 001 + 002 first.

CREATE TABLE IF NOT EXISTS registro (
  id       bigserial PRIMARY KEY,
  en       timestamptz NOT NULL DEFAULT now(),
  tabla    text NOT NULL,
  fila_id  int  NOT NULL,
  accion   text NOT NULL CHECK (accion IN ('insert', 'update')),
  usuario  text,  -- login name; NULL when the change did not come through the app (scripts, psql)
  cambios  jsonb NOT NULL -- insert: the new row; update: { column: { antes, despues } } for what changed only
);
CREATE INDEX IF NOT EXISTS registro_fila ON registro (tabla, fila_id, en DESC);
CREATE INDEX IF NOT EXISTS registro_en ON registro (en DESC);

-- SECURITY DEFINER: the acting role (vendedor, central…) has no access to the table, only this function writes to it
CREATE OR REPLACE FUNCTION registrar_cambio() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cambios jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    cambios := to_jsonb(NEW);
  ELSE
    SELECT coalesce(jsonb_object_agg(n.key, jsonb_build_object('antes', o.value, 'despues', n.value)), '{}')
    INTO cambios
    FROM jsonb_each(to_jsonb(NEW)) n JOIN jsonb_each(to_jsonb(OLD)) o USING (key)
    WHERE n.value IS DISTINCT FROM o.value;
    IF cambios = '{}' THEN RETURN NEW; END IF; -- an UPDATE that changed nothing is not news
  END IF;
  INSERT INTO registro (tabla, fila_id, accion, usuario, cambios)
  VALUES (TG_TABLE_NAME, NEW.id, lower(TG_OP), nullif(current_setting('app.usuario', true), ''), cambios);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION registrar_cambio() FROM PUBLIC;

DROP TRIGGER IF EXISTS registro_clientes ON clientes;
CREATE TRIGGER registro_clientes AFTER INSERT OR UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION registrar_cambio();
DROP TRIGGER IF EXISTS registro_pedidos ON pedidos;
CREATE TRIGGER registro_pedidos AFTER INSERT OR UPDATE ON pedidos FOR EACH ROW EXECUTE FUNCTION registrar_cambio();

ALTER TABLE registro ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON registro TO vora_admin;
DROP POLICY IF EXISTS admin_all ON registro;
CREATE POLICY admin_all ON registro FOR SELECT TO vora_admin USING (true);
