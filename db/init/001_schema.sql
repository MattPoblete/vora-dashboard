CREATE TYPE courier AS ENUM ('starken', 'bluex', 'retiro_tienda');
CREATE TYPE estado_venta AS ENUM (
  'reservada', 'esperando_pago', 'pagada', 'por_empaquetar', 'empaquetada',
  'por_enviar', 'enviada', 'liberada', 'no_habla', 'no_se_encuentra'
);

CREATE TABLE clientes (
  id       serial PRIMARY KEY,
  nombre   text NOT NULL,
  telefono text UNIQUE, -- 569XXXXXXXX; NULL when the sheet had none
  rut      text,
  email    text,
  nombre_completo text -- real name for shipping labels; `nombre` is the TikTok nick
);

CREATE TABLE lives (
  id     serial PRIMARY KEY,
  nombre text NOT NULL UNIQUE, -- sheet name in the Excel
  fecha  date,
  turno  text,
  vendedores text, -- pair on air, e.g. 'Diego y Dani'
  inicio timestamptz, -- NULL on live sheets imported from the Excel
  fin    timestamptz CHECK (fin IS NULL OR inicio IS NULL OR fin >= inicio)
);

CREATE TABLE direcciones_envio (
  id           serial PRIMARY KEY,
  cliente_id   int NOT NULL REFERENCES clientes ON DELETE CASCADE,
  rut          text,   -- Starken
  email        text,   -- Starken
  telefono     text,   -- BlueExpress
  direccion    text,
  ciudad       text
);

CREATE TABLE pedidos ( -- groups ventas paid with one transfer
  id                 serial PRIMARY KEY,
  cliente_id         int NOT NULL REFERENCES clientes,
  courier            courier,
  direccion_envio_id int REFERENCES direcciones_envio,
  creado_en          timestamptz NOT NULL DEFAULT now(),
  cerrado_en         timestamptz -- set when sent to packing
);
CREATE UNIQUE INDEX pedidos_uno_abierto ON pedidos (cliente_id) WHERE cerrado_en IS NULL;

CREATE TABLE pagos (
  id           serial PRIMARY KEY,
  pedido_id    int NOT NULL REFERENCES pedidos ON DELETE CASCADE,
  monto        int NOT NULL,
  comprobante  text, -- file path / URL of the transfer evidence
  validado_por text,
  validado_en  timestamptz,
  creado_en    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE paquetes (
  id                 serial PRIMARY KEY,
  cliente_id         int NOT NULL REFERENCES clientes,
  direccion_envio_id int REFERENCES direcciones_envio,
  courier            courier,
  etiqueta           text,
  empaquetado_en     timestamptz,
  recolectado_en     timestamptz
);

CREATE TABLE ventas (
  id              serial PRIMARY KEY,
  live_id         int NOT NULL REFERENCES lives ON DELETE CASCADE,
  codigo          int NOT NULL CHECK (codigo BETWEEN 0 AND 9999), -- resets per live
  monto           int,
  talla           text,
  material        text,
  cliente_id      int REFERENCES clientes,
  comprador_texto text, -- name exactly as typed in the sheet
  estado          estado_venta NOT NULL DEFAULT 'reservada',
  courier         courier,
  detalle         text,
  pedido_id       int REFERENCES pedidos,
  paquete_id      int REFERENCES paquetes,
  creado_en       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON ventas (live_id, codigo);
CREATE INDEX ON ventas (cliente_id);
CREATE INDEX ON ventas (estado);

CREATE TABLE reservas_respaldo ( -- 2nd / 3rd buyer in line
  venta_id        int NOT NULL REFERENCES ventas ON DELETE CASCADE,
  orden           int NOT NULL CHECK (orden IN (2, 3)),
  comprador_texto text NOT NULL,
  cliente_id      int REFERENCES clientes,
  PRIMARY KEY (venta_id, orden)
);
