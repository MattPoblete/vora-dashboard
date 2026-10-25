-- Audit trail for the money tables too: payments (uploaded, validated, removed) and sales (created, edited, deleted,
-- every state change). Deletions are recorded with the full row that went away.
-- Idempotent; run once with psql -f on older databases. Needs 006 first.

ALTER TABLE registro DROP CONSTRAINT IF EXISTS registro_accion_check;
ALTER TABLE registro ADD CONSTRAINT registro_accion_check CHECK (accion IN ('insert', 'update', 'delete'));

CREATE OR REPLACE FUNCTION registrar_cambio() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cambios jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    cambios := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    cambios := to_jsonb(OLD);
  ELSE
    SELECT coalesce(jsonb_object_agg(n.key, jsonb_build_object('antes', o.value, 'despues', n.value)), '{}')
    INTO cambios
    FROM jsonb_each(to_jsonb(NEW)) n JOIN jsonb_each(to_jsonb(OLD)) o USING (key)
    WHERE n.value IS DISTINCT FROM o.value;
    IF cambios = '{}' THEN RETURN NEW; END IF; -- an UPDATE that changed nothing is not news
  END IF;
  INSERT INTO registro (tabla, fila_id, accion, usuario, cambios)
  VALUES (TG_TABLE_NAME, CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END, lower(TG_OP),
          nullif(current_setting('app.usuario', true), ''), cambios);
  RETURN NULL; -- AFTER trigger: the return value is ignored
END $$;
REVOKE ALL ON FUNCTION registrar_cambio() FROM PUBLIC;

DROP TRIGGER IF EXISTS registro_pagos ON pagos;
CREATE TRIGGER registro_pagos AFTER INSERT OR UPDATE OR DELETE ON pagos FOR EACH ROW EXECUTE FUNCTION registrar_cambio();
DROP TRIGGER IF EXISTS registro_ventas ON ventas;
CREATE TRIGGER registro_ventas AFTER INSERT OR UPDATE OR DELETE ON ventas FOR EACH ROW EXECUTE FUNCTION registrar_cambio();
