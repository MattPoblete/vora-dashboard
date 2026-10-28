import { test } from "node:test";
import assert from "node:assert/strict";
import { leerBusqueda, patron } from "./busqueda.ts";

test("leerBusqueda: trims and caps the text, orden falls back to the first valid one", () => {
  const ordenes = ["reciente", "numero"];
  assert.deepEqual(leerBusqueda({ q: "  ana ", orden: "numero" }, ordenes), {
    q: "ana",
    orden: "numero",
  });
  assert.equal(
    leerBusqueda({ orden: "id; drop table" }, ordenes).orden,
    "reciente",
  );
  assert.equal(leerBusqueda({ q: "x".repeat(500) }, ordenes, 60).q.length, 60);
  assert.deepEqual(leerBusqueda({}), { q: "", orden: "" });
});

test("patron: wildcards typed by the user are literal", () => {
  assert.equal(patron("50%_off\\"), "%50\\%\\_off\\\\%");
});
