import { test } from "node:test";
import assert from "node:assert/strict";
import { duracion, nombrePropio, prendas } from "./formato.ts";

test("duracion", () => {
  assert.equal(duracion(0), "0 min");
  assert.equal(duracion(59), "59 min");
  assert.equal(duracion(60), "1 h");
  assert.equal(duracion(156), "2 h 36 min");
  assert.equal(duracion(60 * 24 * 3 + 5), "3 d");
});

test("prendas", () => {
  assert.equal(prendas(1), "1 prenda");
  assert.equal(prendas(2), "2 prendas");
});

test("nombrePropio", () => {
  assert.equal(nombrePropio("fernando moreno"), "Fernando Moreno");
  assert.equal(nombrePropio("ROCIO peña-duran"), "Rocio Peña-Duran");
  assert.equal(nombrePropio("ángela"), "Ángela");
});
