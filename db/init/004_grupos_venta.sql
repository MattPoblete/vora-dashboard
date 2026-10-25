-- Sales groups ("parejas"): the name lives.vendedores / usuarios.vendedores already use becomes a real row, with an
-- optional alias (display name) and photo (file name under uploads/grupos/). Users join a group from the admin screen.
-- Idempotent: new databases get it from the init scripts; older ones run it once with psql -f. Needs 001 + 002 first.

CREATE TABLE IF NOT EXISTS grupos_venta (
  vendedores text PRIMARY KEY CHECK (vendedores <> ''), -- "Fer y Anto": the key lives and users point at
  alias      text CHECK (alias IS NULL OR alias <> ''),
  foto       text,
  creado_en  timestamptz NOT NULL DEFAULT now()
);

-- the three historic pairs, plus any pair already in use
INSERT INTO grupos_venta (vendedores)
SELECT x FROM (
  VALUES ('Diego y Dani'), ('Fer y Anto'), ('Joaco y Cami')
) v(x)
UNION SELECT vendedores FROM usuarios WHERE vendedores IS NOT NULL
UNION SELECT vendedores FROM lives WHERE vendedores IS NOT NULL AND inicio IS NOT NULL
ON CONFLICT DO NOTHING;

-- a seller may exist before being put in a group; a group is only for sellers
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_pareja;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_pareja CHECK (vendedores IS NULL OR 'ventas' = ANY(permisos));
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_grupo_fk;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_grupo_fk FOREIGN KEY (vendedores) REFERENCES grupos_venta ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION admin_guardar_usuario(p_id int, p_permisos text[], p_vendedores text, p_activo boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE usuarios SET
    permisos = p_permisos,
    -- the group is edited on its own tab: a NULL here keeps it (and it goes away with the ventas permission)
    vendedores = CASE WHEN 'ventas' = ANY(p_permisos) THEN coalesce(nullif(p_vendedores, ''), vendedores) END,
    activo = p_activo
  WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'El usuario no existe'; END IF;
  IF NOT EXISTS (SELECT FROM usuarios WHERE activo AND 'admin' = ANY(permisos)) THEN
    RAISE EXCEPTION 'Debe quedar al menos un administrador activo';
  END IF;
  IF NOT p_activo THEN DELETE FROM sesiones WHERE usuario_id = p_id; END IF;
END $$;

CREATE OR REPLACE FUNCTION admin_crear_usuario(p_usuario text, p_hash text, p_permisos text[], p_vendedores text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO usuarios (usuario, password_hash, permisos, vendedores, debe_cambiar)
  VALUES (lower(p_usuario), p_hash, p_permisos,
          CASE WHEN 'ventas' = ANY(p_permisos) THEN nullif(p_vendedores, '') END, true);
END $$;

-- puts exactly these (active, ventas) users in the group and takes everyone else out of it
CREATE OR REPLACE FUNCTION admin_fijar_miembros(p_grupo text, p_ids int[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT FROM grupos_venta WHERE vendedores = p_grupo) THEN
    RAISE EXCEPTION 'El grupo no existe';
  END IF;
  IF cardinality(p_ids) > 2 THEN RAISE EXCEPTION 'Un grupo es una pareja: máximo 2 vendedores'; END IF;
  IF (SELECT count(*) FROM usuarios WHERE id = ANY(p_ids) AND activo AND 'ventas' = ANY(permisos)) <> cardinality(p_ids) THEN
    RAISE EXCEPTION 'Solo usuarios activos con permiso de ventas pueden estar en un grupo';
  END IF;
  UPDATE usuarios SET vendedores = NULL WHERE vendedores = p_grupo AND NOT (id = ANY(p_ids));
  UPDATE usuarios SET vendedores = p_grupo WHERE id = ANY(p_ids);
END $$;

REVOKE ALL ON FUNCTION admin_fijar_miembros(text, int[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_fijar_miembros(text, int[]) TO vora_admin;

ALTER TABLE grupos_venta ENABLE ROW LEVEL SECURITY;
GRANT ALL ON grupos_venta TO vora_admin;
GRANT SELECT ON grupos_venta TO vora_vendedor;
DROP POLICY IF EXISTS admin_all ON grupos_venta;
CREATE POLICY admin_all ON grupos_venta FOR ALL TO vora_admin USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS sel_vora_vendedor ON grupos_venta;
CREATE POLICY sel_vora_vendedor ON grupos_venta FOR SELECT TO vora_vendedor USING (vendedores = app_vendedores());
