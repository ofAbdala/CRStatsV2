import test from "node:test";
import assert from "node:assert/strict";
import { parseClashTag } from "./clashTag";

test("parseClashTag: aceita tag sem # e normaliza para uppercase", () => {
  const parsed = parseClashTag("2p090j0");
  assert.ok(parsed);
  assert.equal(parsed.withoutHash, "2P090J0");
  assert.equal(parsed.withHash, "#2P090J0");
});

test("parseClashTag: aceita tag com # e normaliza para uppercase", () => {
  const parsed = parseClashTag("#2p090j0");
  assert.ok(parsed);
  assert.equal(parsed.withoutHash, "2P090J0");
  assert.equal(parsed.withHash, "#2P090J0");
});

test("parseClashTag: rejeita vazio", () => {
  assert.equal(parseClashTag(""), null);
  assert.equal(parseClashTag("   "), null);
});

test("parseClashTag: rejeita caracteres invalidos", () => {
  assert.equal(parseClashTag("AB C"), null);
  assert.equal(parseClashTag("A-BC"), null);
  assert.equal(parseClashTag("A_BC"), null);
});

test("parseClashTag: rejeita # fora do inicio ou duplicado", () => {
  assert.equal(parseClashTag("A#BC"), null);
  assert.equal(parseClashTag("##ABC"), null);
});

test("parseClashTag: rejeita tamanhos fora do intervalo", () => {
  assert.equal(parseClashTag("AB"), null);
  assert.equal(parseClashTag("A".repeat(17)), null);
});

