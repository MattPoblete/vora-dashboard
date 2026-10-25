#!/bin/sh
# empty twin of the main db for development; same schema + access control, no data
set -e
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE vora_dev OWNER $POSTGRES_USER"
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d vora_dev -f /docker-entrypoint-initdb.d/001_schema.sql
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d vora_dev -f /docker-entrypoint-initdb.d/002_auth_rls.sql
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d vora_dev -f /docker-entrypoint-initdb.d/004_grupos_venta.sql
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d vora_dev -f /docker-entrypoint-initdb.d/005_perfil.sql
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d vora_dev -f /docker-entrypoint-initdb.d/006_registro.sql
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d vora_dev -f /docker-entrypoint-initdb.d/007_validado_por.sql
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d vora_dev -f /docker-entrypoint-initdb.d/008_registro_dinero.sql
