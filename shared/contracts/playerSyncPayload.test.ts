import test from "node:test";
import assert from "node:assert/strict";
import { playerSyncRequestSchema } from "../schema";

test("player sync payload: aceita objeto vazio", () => {
  const result = playerSyncRequestSchema.safeParse({});
  assert.equal(result.success, true);
});

test("player sync payload: rejeita campos desconhecidos", () => {
  const result = playerSyncRequestSchema.safeParse({ force: true });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error.issues[0]?.code, "unrecognized_keys");
  }
});
