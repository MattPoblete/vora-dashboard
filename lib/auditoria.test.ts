import { test } from "node:test";
import assert from "node:assert/strict";
import { lineas, parseBusqueda, type Evento } from "./auditoria.ts";

test("search box: keys, quotes, free text", () => {
  assert.deepEqual(
    parseBusqueda(`cliente:"cami rojas" maria Estado:pagada foo:bar #128`),
    {
      texto: ["maria", "foo:bar", "#128"],
      cliente: ["cami rojas"],
      estado: ["pagada"],
    },
  );
  assert.deepEqual(parseBusqueda("   "), { texto: [] });
});

const en = new Date("2026-10-25T14:00:00Z");
const ev = (e: Partial<Evento>): Evento => ({
  id: 1,
  en,
  tabla: "ventas",
  accion: "update",
  usuario: "maria",
  cambios: {},
  codigo: null,
  monto_pago: null,
  ...e,
});

test("history lines: one statement over several sales is one line", () => {
  const pagada = (id: number, codigo: number, antes: string) =>
    ev({
      id,
      codigo,
      cambios: { estado: { antes, despues: "pagada" } },
    });
  const ls = lineas(
    [
      pagada(3, 51, "reservada"),
      pagada(2, 44, "esperando_pago"),
      ev({
        id: 1,
        tabla: "pagos",
        monto_pago: 34990,
        cambios: { validado_en: { antes: null, despues: "x" } },
      }),
    ],
    7,
  );
  assert.equal(ls.length, 2);
  assert.equal(ls[0].texto, "ventas #44, #51: pagada");
  assert.match(ls[1].texto, /^validó pago por \$34.990$/);
});

test("history lines: sale leaving the order vs released", () => {
  const [salio, libero] = lineas(
    [
      ev({
        id: 2,
        codigo: 9,
        usuario: "pedro",
        cambios: { pedido_id: { antes: 7, despues: 8 } },
      }),
      ev({
        id: 1,
        codigo: 9,
        cambios: {
          estado: { antes: "reservada", despues: "liberada" },
          pedido_id: { antes: 7, despues: null },
        },
      }),
    ],
    7,
  );
  assert.equal(salio.texto, "venta #9: salió del pedido");
  assert.equal(libero.texto, "venta #9: liberó la prenda");
});
