-- Failed logins per IP: the per-account lockout (002) stops guessing one password, this stops one address trying many
-- accounts. 30 failures from an IP in 15 minutes block that IP for the rest of the window. Only failures count, so a
-- whole shop behind one router logging in at shift start is fine.
-- Idempotent; run once with psql -f on older databases. Needs 002 first.

CREATE TABLE IF NOT EXISTS intentos_login (
  ip text        NOT NULL,
  en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS intentos_login_ip ON intentos_login (ip, en);
REVOKE ALL ON intentos_login FROM PUBLIC;

CREATE OR REPLACE FUNCTION auth_ip_bloqueada(p_ip text) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*) >= 30 FROM intentos_login WHERE ip = p_ip AND en > now() - interval '15 minutes'
$$;

CREATE OR REPLACE FUNCTION auth_fallo_ip(p_ip text) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM intentos_login WHERE en < now() - interval '15 minutes';
  INSERT INTO intentos_login (ip) VALUES (p_ip);
$$;

REVOKE ALL ON FUNCTION auth_ip_bloqueada(text), auth_fallo_ip(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_ip_bloqueada(text), auth_fallo_ip(text) TO vora_app;
