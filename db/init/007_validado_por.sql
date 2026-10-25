-- Who validated a payment: central writes its own login (app.usuario, set per transaction by lib/session.ts) into
-- pagos.validado_por together with validado_en. Idempotent; run once with psql -f on older databases. Needs 002 first.

GRANT UPDATE (validado_en, validado_por) ON pagos TO vora_central;
