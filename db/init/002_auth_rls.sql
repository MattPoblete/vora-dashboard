-- Login + Row Level Security.
-- The app connects as `vora_app` (no privileges of its own) and, per request, does
-- `SET LOCAL ROLE` to the role that matches the user's permissions; table grants + RLS policies below decide what each role sees/changes.
-- Safe to re-run.

DO $$
DECLARE r text;
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'vora_app') THEN
    -- TODO production: change this password (and DATABASE_URL)
    CREATE ROLE vora_app LOGIN PASSWORD 'vora_app' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
  FOREACH r IN ARRAY ARRAY['vora_admin', 'vora_vendedor', 'vora_central', 'vora_empaquetador', 'vora_peoneta'] LOOP
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('CREATE ROLE %I NOLOGIN NOBYPASSRLS', r);
    END IF;
    -- SET only: vora_app must NOT inherit their privileges, otherwise it would hold all of them at once
    EXECUTE format('GRANT %I TO vora_app WITH INHERIT FALSE, SET TRUE', r);
  END LOOP;
END $$;

-- ---------- users & sessions (reachable only through the SECURITY DEFINER functions) ----------
CREATE TABLE IF NOT EXISTS usuarios (
  id              serial PRIMARY KEY,
  usuario         text NOT NULL UNIQUE CHECK (usuario = lower(usuario)),
  password_hash   text NOT NULL,
  permisos        text[] NOT NULL DEFAULT '{}', -- features: ventas, central, empaquetado, despacho, admin
  vendedores      text, -- the pair on air; required for (and only for) the ventas permission
  activo          boolean NOT NULL DEFAULT true,
  fallos          int NOT NULL DEFAULT 0,
  bloqueado_hasta timestamptz,
  debe_cambiar    boolean NOT NULL DEFAULT false, -- temporary password: must be changed before using anything
  creado_en       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT usuarios_permisos_validos CHECK (permisos <@ ARRAY['ventas', 'central', 'empaquetado', 'despacho', 'admin']),
  CONSTRAINT usuarios_pareja CHECK (('ventas' = ANY(permisos)) = (vendedores IS NOT NULL))
);

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS debe_cambiar boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS sesiones (
  token_hash text PRIMARY KEY, -- sha256 of the cookie value; the raw token never touches the db
  usuario_id int NOT NULL REFERENCES usuarios ON DELETE CASCADE,
  expira     timestamptz NOT NULL,
  creado_en  timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON usuarios, sesiones FROM PUBLIC;

DROP FUNCTION IF EXISTS auth_intento(text);
CREATE FUNCTION auth_intento(p_usuario text)
RETURNS TABLE (id int, password_hash text, permisos text[], vendedores text, bloqueado boolean)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.password_hash, u.permisos, u.vendedores, coalesce(u.bloqueado_hasta > now(), false)
  FROM usuarios u WHERE u.usuario = lower(p_usuario) AND u.activo
$$;

-- 5 wrong passwords in a row lock the account for 15 minutes
CREATE OR REPLACE FUNCTION auth_fallo(p_id int) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE usuarios SET
    bloqueado_hasta = CASE WHEN fallos + 1 >= 5 THEN now() + interval '15 minutes' ELSE bloqueado_hasta END,
    fallos          = CASE WHEN fallos + 1 >= 5 THEN 0 ELSE fallos + 1 END
  WHERE id = p_id
$$;

CREATE OR REPLACE FUNCTION auth_ok(p_id int, p_token_hash text, p_expira timestamptz) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE usuarios SET fallos = 0, bloqueado_hasta = NULL WHERE id = p_id;
  DELETE FROM sesiones WHERE expira < now();
  INSERT INTO sesiones (token_hash, usuario_id, expira) VALUES (p_token_hash, p_id, p_expira);
$$;

DROP FUNCTION IF EXISTS auth_sesion(text);
CREATE FUNCTION auth_sesion(p_token_hash text)
RETURNS TABLE (usuario_id int, usuario text, permisos text[], vendedores text, debe_cambiar boolean)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.usuario, u.permisos, u.vendedores, u.debe_cambiar
  FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id
  WHERE s.token_hash = p_token_hash AND s.expira > now() AND u.activo
$$;

CREATE OR REPLACE FUNCTION auth_logout(p_token_hash text) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM sesiones WHERE token_hash = p_token_hash
$$;

REVOKE ALL ON FUNCTION auth_intento(text), auth_fallo(int), auth_ok(int, text, timestamptz), auth_sesion(text), auth_logout(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_intento(text), auth_fallo(int), auth_ok(int, text, timestamptz), auth_sesion(text), auth_logout(text) TO vora_app;

-- the new hash is computed by the app; the user is whoever owns the (valid) session token
CREATE OR REPLACE FUNCTION auth_cambiar_password(p_token_hash text, p_hash text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid int;
BEGIN
  SELECT s.usuario_id INTO uid FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id
  WHERE s.token_hash = p_token_hash AND s.expira > now() AND u.activo;
  IF uid IS NULL THEN RETURN false; END IF;
  UPDATE usuarios SET password_hash = p_hash, debe_cambiar = false, fallos = 0, bloqueado_hasta = NULL WHERE id = uid;
  DELETE FROM sesiones WHERE usuario_id = uid AND token_hash <> p_token_hash; -- every other device is signed out
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION auth_cambiar_password(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_cambiar_password(text, text) TO vora_app;

-- A user holding several permissions runs as a role that INHERITS the matching base roles, so the
-- policies/grants of all of them apply (permissive policies are OR-ed). Letters: v=ventas c=central e=empaquetado d=despacho
-- (lib/session.ts builds the same names).
DO $$
DECLARE
  m int; i int; nombre text; miembros text[];
  bases text[] := ARRAY['vora_vendedor', 'vora_central', 'vora_empaquetador', 'vora_peoneta'];
  letras text := 'vced';
BEGIN
  FOR m IN 1..15 LOOP
    nombre := 'vora_c_'; miembros := '{}';
    FOR i IN 0..3 LOOP
      IF (m >> i) & 1 = 1 THEN nombre := nombre || substr(letras, i + 1, 1); miembros := miembros || bases[i + 1]; END IF;
    END LOOP;
    CONTINUE WHEN cardinality(miembros) < 2;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = nombre) THEN
      EXECUTE format('CREATE ROLE %I NOLOGIN NOBYPASSRLS', nombre);
    END IF;
    EXECUTE format('GRANT %s TO %I', (SELECT string_agg(quote_ident(x), ', ') FROM unnest(miembros) x), nombre);
    EXECUTE format('GRANT %I TO vora_app WITH INHERIT FALSE, SET TRUE', nombre);
  END LOOP;
END $$;

-- user management: callable only by vora_admin (not by vora_app, not by any other role)
CREATE OR REPLACE FUNCTION admin_listar_usuarios()
RETURNS TABLE (id int, usuario text, permisos text[], vendedores text, activo boolean, bloqueado boolean, creado_en timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.usuario, u.permisos, u.vendedores, u.activo, coalesce(u.bloqueado_hasta > now(), false), u.creado_en
  FROM usuarios u ORDER BY u.usuario
$$;

CREATE OR REPLACE FUNCTION admin_guardar_usuario(p_id int, p_permisos text[], p_vendedores text, p_activo boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF 'ventas' = ANY(p_permisos) AND coalesce(p_vendedores, '') = '' THEN
    RAISE EXCEPTION 'Elige la pareja de vendedores para el permiso de ventas';
  END IF;
  UPDATE usuarios SET
    permisos = p_permisos,
    vendedores = CASE WHEN 'ventas' = ANY(p_permisos) THEN p_vendedores END,
    activo = p_activo
  WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'El usuario no existe'; END IF;
  -- raising here rolls back the caller's transaction: the app can never be left without an admin
  IF NOT EXISTS (SELECT FROM usuarios WHERE activo AND 'admin' = ANY(permisos)) THEN
    RAISE EXCEPTION 'Debe quedar al menos un administrador activo';
  END IF;
  IF NOT p_activo THEN DELETE FROM sesiones WHERE usuario_id = p_id; END IF;
END $$;

-- the hash is computed by the app (scrypt); the db never sees the plain password
CREATE OR REPLACE FUNCTION admin_crear_usuario(p_usuario text, p_hash text, p_permisos text[], p_vendedores text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF 'ventas' = ANY(p_permisos) AND coalesce(p_vendedores, '') = '' THEN
    RAISE EXCEPTION 'Elige la pareja de vendedores para el permiso de ventas';
  END IF;
  INSERT INTO usuarios (usuario, password_hash, permisos, vendedores, debe_cambiar)
  VALUES (lower(p_usuario), p_hash, p_permisos, CASE WHEN 'ventas' = ANY(p_permisos) THEN p_vendedores END, true);
END $$;

-- also unlocks the account and signs the user out everywhere; the new password is temporary
CREATE OR REPLACE FUNCTION admin_resetear_password(p_id int, p_hash text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE usuarios SET password_hash = p_hash, debe_cambiar = true, fallos = 0, bloqueado_hasta = NULL WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'El usuario no existe'; END IF;
  DELETE FROM sesiones WHERE usuario_id = p_id;
END $$;

REVOKE ALL ON FUNCTION admin_listar_usuarios(), admin_guardar_usuario(int, text[], text, boolean), admin_crear_usuario(text, text, text[], text), admin_resetear_password(int, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_listar_usuarios(), admin_guardar_usuario(int, text[], text, boolean), admin_crear_usuario(text, text, text[], text), admin_resetear_password(int, text) TO vora_admin;

-- ---------- table privileges ----------
GRANT USAGE ON SCHEMA public TO vora_admin, vora_vendedor, vora_central, vora_empaquetador, vora_peoneta;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vora_admin, vora_vendedor, vora_central, vora_empaquetador, vora_peoneta;

ALTER TABLE clientes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE lives             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas_respaldo ENABLE ROW LEVEL SECURITY;
ALTER TABLE direcciones_envio ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE paquetes          ENABLE ROW LEVEL SECURITY;

-- admin: everything
GRANT ALL ON clientes, lives, ventas, reservas_respaldo, direcciones_envio, pedidos, pagos, paquetes TO vora_admin;

-- vendedor: registers sales, only inside its own lives
GRANT SELECT, INSERT (nombre) ON clientes TO vora_vendedor;
GRANT SELECT, INSERT (nombre, fecha, turno, vendedores, inicio), UPDATE (fin) ON lives TO vora_vendedor;
GRANT SELECT, INSERT (live_id, codigo, monto, talla, material, detalle, cliente_id, comprador_texto),
      UPDATE (codigo, monto, talla, material, detalle, cliente_id, comprador_texto), DELETE ON ventas TO vora_vendedor;
GRANT SELECT, INSERT ON reservas_respaldo TO vora_vendedor;

-- central: payments, shipping data, moves sales up to por_empaquetar
GRANT SELECT, UPDATE (nombre_completo, telefono) ON clientes TO vora_central;
GRANT SELECT ON lives TO vora_central;
GRANT SELECT, UPDATE (estado, pedido_id) ON ventas TO vora_central;
GRANT SELECT, INSERT, UPDATE ON direcciones_envio TO vora_central;
GRANT SELECT, INSERT, UPDATE (courier, direccion_envio_id, cerrado_en) ON pedidos TO vora_central;
GRANT SELECT, INSERT, UPDATE (validado_en), DELETE ON pagos TO vora_central;

-- empaquetador: packs por_empaquetar -> por_enviar
GRANT SELECT ON clientes, lives, direcciones_envio, pedidos TO vora_empaquetador;
GRANT SELECT, UPDATE (estado, paquete_id) ON ventas TO vora_empaquetador;
GRANT SELECT, INSERT ON paquetes TO vora_empaquetador;

-- peoneta: hands packages to the courier, por_enviar -> enviada
GRANT SELECT ON clientes, direcciones_envio TO vora_peoneta;
GRANT SELECT, UPDATE (estado) ON ventas TO vora_peoneta;
GRANT SELECT, UPDATE (recolectado_en) ON paquetes TO vora_peoneta;

-- ---------- row policies ----------
CREATE OR REPLACE FUNCTION app_vendedores() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('app.vendedores', true) $$;
GRANT EXECUTE ON FUNCTION app_vendedores() TO vora_vendedor;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['clientes', 'lives', 'ventas', 'reservas_respaldo', 'direcciones_envio', 'pedidos', 'pagos', 'paquetes'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS admin_all ON %I', t);
    EXECUTE format('CREATE POLICY admin_all ON %I FOR ALL TO vora_admin USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- plain "can read everything" policies
DO $$
DECLARE x record;
BEGIN
  FOR x IN SELECT * FROM (VALUES
    ('clientes', 'vora_vendedor'), ('clientes', 'vora_central'), ('clientes', 'vora_empaquetador'), ('clientes', 'vora_peoneta'),
    ('lives', 'vora_central'), ('lives', 'vora_empaquetador'),
    ('ventas', 'vora_vendedor'), ('ventas', 'vora_central'), ('ventas', 'vora_empaquetador'), ('ventas', 'vora_peoneta'),
    ('reservas_respaldo', 'vora_vendedor'),
    ('direcciones_envio', 'vora_central'), ('direcciones_envio', 'vora_empaquetador'), ('direcciones_envio', 'vora_peoneta'),
    ('pedidos', 'vora_central'), ('pedidos', 'vora_empaquetador'),
    ('pagos', 'vora_central'),
    ('paquetes', 'vora_empaquetador'), ('paquetes', 'vora_peoneta')
  ) v(t, r) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'sel_' || x.r, x.t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO %I USING (true)', 'sel_' || x.r, x.t, x.r);
  END LOOP;
END $$;

-- vendedor: own lives only
DROP POLICY IF EXISTS sel_vora_vendedor ON lives;
CREATE POLICY sel_vora_vendedor ON lives FOR SELECT TO vora_vendedor USING (vendedores = app_vendedores());
DROP POLICY IF EXISTS ins_vora_vendedor ON lives;
CREATE POLICY ins_vora_vendedor ON lives FOR INSERT TO vora_vendedor WITH CHECK (vendedores = app_vendedores());
DROP POLICY IF EXISTS upd_vora_vendedor ON lives;
CREATE POLICY upd_vora_vendedor ON lives FOR UPDATE TO vora_vendedor
  USING (vendedores = app_vendedores() AND fin IS NULL) WITH CHECK (vendedores = app_vendedores());

DROP POLICY IF EXISTS ins_vora_vendedor ON clientes;
CREATE POLICY ins_vora_vendedor ON clientes FOR INSERT TO vora_vendedor WITH CHECK (true);

-- the lives subqueries below are themselves filtered by the lives policy above
DROP POLICY IF EXISTS ins_vora_vendedor ON ventas;
CREATE POLICY ins_vora_vendedor ON ventas FOR INSERT TO vora_vendedor
  WITH CHECK (estado = 'reservada' AND live_id IN (SELECT id FROM lives WHERE fin IS NULL));
DROP POLICY IF EXISTS upd_vora_vendedor ON ventas;
CREATE POLICY upd_vora_vendedor ON ventas FOR UPDATE TO vora_vendedor
  USING (live_id IN (SELECT id FROM lives) AND estado IN ('reservada', 'esperando_pago'))
  WITH CHECK (live_id IN (SELECT id FROM lives) AND estado IN ('reservada', 'esperando_pago'));
DROP POLICY IF EXISTS del_vora_vendedor ON ventas;
CREATE POLICY del_vora_vendedor ON ventas FOR DELETE TO vora_vendedor
  USING (live_id IN (SELECT id FROM lives) AND estado IN ('reservada', 'esperando_pago'));

DROP POLICY IF EXISTS ins_vora_vendedor ON reservas_respaldo;
CREATE POLICY ins_vora_vendedor ON reservas_respaldo FOR INSERT TO vora_vendedor
  WITH CHECK (venta_id IN (SELECT id FROM ventas WHERE live_id IN (SELECT id FROM lives)));

-- central
DROP POLICY IF EXISTS upd_vora_central ON clientes;
CREATE POLICY upd_vora_central ON clientes FOR UPDATE TO vora_central USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS upd_vora_central ON ventas;
CREATE POLICY upd_vora_central ON ventas FOR UPDATE TO vora_central
  USING (estado IN ('reservada', 'esperando_pago', 'pagada'))
  WITH CHECK (estado IN ('reservada', 'esperando_pago', 'pagada', 'por_empaquetar', 'liberada'));
DROP POLICY IF EXISTS wr_vora_central ON direcciones_envio;
CREATE POLICY wr_vora_central ON direcciones_envio FOR INSERT TO vora_central WITH CHECK (true);
DROP POLICY IF EXISTS upd_vora_central ON direcciones_envio;
CREATE POLICY upd_vora_central ON direcciones_envio FOR UPDATE TO vora_central USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS ins_vora_central ON pedidos;
CREATE POLICY ins_vora_central ON pedidos FOR INSERT TO vora_central WITH CHECK (true);
DROP POLICY IF EXISTS upd_vora_central ON pedidos;
CREATE POLICY upd_vora_central ON pedidos FOR UPDATE TO vora_central USING (cerrado_en IS NULL) WITH CHECK (true);
DROP POLICY IF EXISTS ins_vora_central ON pagos;
CREATE POLICY ins_vora_central ON pagos FOR INSERT TO vora_central WITH CHECK (validado_en IS NULL);
DROP POLICY IF EXISTS upd_vora_central ON pagos;
CREATE POLICY upd_vora_central ON pagos FOR UPDATE TO vora_central USING (validado_en IS NULL) WITH CHECK (true);
DROP POLICY IF EXISTS del_vora_central ON pagos;
CREATE POLICY del_vora_central ON pagos FOR DELETE TO vora_central USING (validado_en IS NULL); -- validated payments are final

-- empaquetador
DROP POLICY IF EXISTS upd_vora_empaquetador ON ventas;
CREATE POLICY upd_vora_empaquetador ON ventas FOR UPDATE TO vora_empaquetador
  USING (estado = 'por_empaquetar') WITH CHECK (estado = 'por_enviar');
DROP POLICY IF EXISTS ins_vora_empaquetador ON paquetes;
CREATE POLICY ins_vora_empaquetador ON paquetes FOR INSERT TO vora_empaquetador WITH CHECK (true);

-- peoneta
DROP POLICY IF EXISTS upd_vora_peoneta ON ventas;
CREATE POLICY upd_vora_peoneta ON ventas FOR UPDATE TO vora_peoneta
  USING (estado = 'por_enviar') WITH CHECK (estado = 'enviada');
DROP POLICY IF EXISTS upd_vora_peoneta ON paquetes;
CREATE POLICY upd_vora_peoneta ON paquetes FOR UPDATE TO vora_peoneta USING (recolectado_en IS NULL) WITH CHECK (true);
