/**
 * Integration tests for player sync routes.
 * Tests: successful sync, Clash API failure handling, unauthenticated access.
 */
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createTestApp, mountPlayerRoutes } from "../helpers/app";
import { TEST_USER_ID, TEST_PLAYER_TAG, mockPlayerData, mockBattleData } from "../helpers/mocks";

test("Player Sync: successful sync returns player data", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async getProfile(userId) {
        return { id: "p-1", userId, clashTag: TEST_PLAYER_TAG, defaultPlayerTag: TEST_PLAYER_TAG } as any;
      },
      async isPro() { return false; },
    },
  });

  mountPlayerRoutes(app, mockStorage, {
    getPlayerByTag: (tag) => ({ data: mockPlayerData(tag), status: 200 }),
    getPlayerBattles: () => ({ data: mockBattleData(), status: 200 }),
  });

  const res = await request(app).post("/api/player/sync").send({});
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "ok");
  assert.equal(res.body.player.name, "TestPlayer");
  assert.equal(res.body.player.trophies, 5500);
  assert.ok(res.body.lastSyncedAt);
  assert.ok(Array.isArray(res.body.battles));
});

test("Player Sync: Clash API failure returns error status", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async getProfile(userId) {
        return { id: "p-1", userId, clashTag: TEST_PLAYER_TAG, defaultPlayerTag: TEST_PLAYER_TAG } as any;
      },
    },
  });

  mountPlayerRoutes(app, mockStorage, {
    getPlayerByTag: () => ({ data: null, error: "API timeout", status: 503 }),
    getPlayerBattles: () => ({ data: [], status: 200 }),
  });

  const res = await request(app).post("/api/player/sync").send({});
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "error");
  assert.equal(res.body.player, null);
  assert.ok(res.body.errors.length > 0);
  assert.equal(res.body.errors[0].code, "PLAYER_FETCH_FAILED");
});

test("Player Sync: no clash tag returns 400", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async getProfile() {
        return { id: "p-1", userId: TEST_USER_ID, clashTag: null, defaultPlayerTag: null } as any;
      },
    },
  });

  mountPlayerRoutes(app, mockStorage);

  const res = await request(app).post("/api/player/sync").send({});
  assert.equal(res.status, 400);
  assert.equal(res.body.code, "NO_CLASH_TAG");
});

test("Player Sync: unauthenticated returns 401", async () => {
  const { app, mockStorage } = createTestApp({ authenticated: false });
  mountPlayerRoutes(app, mockStorage);

  const res = await request(app).post("/api/player/sync").send({});
  assert.equal(res.status, 401);
  assert.equal(res.body.code, "UNAUTHORIZED");
});

test("Player Sync State: returns last synced timestamp", async () => {
  const syncDate = new Date("2026-02-27T10:00:00Z");
  const { app, mockStorage } = createTestApp({
    storage: {
      async getSyncState() {
        return { id: "ss-1", userId: TEST_USER_ID, lastSyncedAt: syncDate } as any;
      },
    },
  });

  mountPlayerRoutes(app, mockStorage);

  const res = await request(app).get("/api/player/sync-state");
  assert.equal(res.status, 200);
  assert.equal(res.body.lastSyncedAt, syncDate.toISOString());
});
