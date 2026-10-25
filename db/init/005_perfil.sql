-- Own profile (name, contact phone, avatar file under uploads/avatares/). Like the password change, the user is whoever
-- owns the (valid) session token, so nobody can edit another profile. Idempotent; run once with psql -f on older databases.

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nombre   text CHECK (nombre IS NULL OR length(nombre) BETWEEN 1 AND 60);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefono text CHECK (telefono IS NULL OR length(telefono) BETWEEN 8 AND 20);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS avatar   text;

CREATE OR REPLACE FUNCTION auth_perfil(p_token_hash text)
RETURNS TABLE (nombre text, telefono text, avatar text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT u.nombre, u.telefono, u.avatar
  FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id
  WHERE s.token_hash = p_token_hash AND s.expira > now() AND u.activo
$$;

-- returns the avatar it replaced (so the app can delete that file), or NULL
CREATE OR REPLACE FUNCTION auth_guardar_perfil(p_token_hash text, p_nombre text, p_telefono text, p_avatar text)
RETURNS TABLE (ok boolean, avatar_anterior text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid int; viejo text;
BEGIN
  SELECT s.usuario_id INTO uid FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id
  WHERE s.token_hash = p_token_hash AND s.expira > now() AND u.activo;
  IF uid IS NULL THEN RETURN QUERY SELECT false, NULL::text; RETURN; END IF;
  SELECT u.avatar INTO viejo FROM usuarios u WHERE u.id = uid;
  UPDATE usuarios SET nombre = nullif(p_nombre, ''), telefono = nullif(p_telefono, ''), avatar = p_avatar WHERE id = uid;
  RETURN QUERY SELECT true, CASE WHEN viejo IS DISTINCT FROM p_avatar THEN viejo END;
END $$;

REVOKE ALL ON FUNCTION auth_perfil(text), auth_guardar_perfil(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_perfil(text), auth_guardar_perfil(text, text, text, text) TO vora_app;
