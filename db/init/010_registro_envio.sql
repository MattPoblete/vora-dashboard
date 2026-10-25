-- Shipping data edits belong to an order's history too (the Auditoría tab links them through pedidos.direccion_envio_id).
-- Idempotent; run once with psql -f on older databases. Needs 008 first.

DROP TRIGGER IF EXISTS registro_direcciones ON direcciones_envio;
CREATE TRIGGER registro_direcciones AFTER INSERT OR UPDATE ON direcciones_envio FOR EACH ROW EXECUTE FUNCTION registrar_cambio();
