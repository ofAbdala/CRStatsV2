/**
 * Integration tests for favorites routes.
 */
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createTestApp, mountFavoriteRoutes } from "../helpers/app";
import { TEST_USER_ID, TEST_PLAYER_TAG } from "../helpers/mocks";

test("Favorites GET: returns favorite players", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async getFavoritePlayers() {
        return [
          { id: "f-1", userId: TEST_USER_ID, playerTag: TEST_PLAYER_TAG, name: "TestPlayer" },
        ] as any;
      },
    },
  });

  mountFavoriteRoutes(app, mockStorage);

  const res = await request(app).get("/api/favorites");
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.equal(res.body.length, 1);
  assert.equal(res.body[0].playerTag, TEST_PLAYER_TAG);
});

test("Favorites POST: adds a new favorite", async () => {
  let createdFav: any = null;
  const { app, mockStorage } = createTestApp({
    storage: {
      async createFavoritePlayer(fav) {
        createdFav = fav;
        return { id: "f-new", ...fav, createdAt: new Date() } as any;
      },
    },
  });

  mountFavoriteRoutes(app, mockStorage);

  const res = await request(app).post("/api/favorites").send({
    playerTag: "#XYZ789",
    name: "Rival",
  });

  assert.equal(res.status, 200);
  assert.ok(createdFav);
  assert.equal(createdFav.playerTag, "#XYZ789");
  assert.equal(createdFav.userId, TEST_USER_ID);
});

test("Favorites DELETE: removes existing favorite", async () => {
  let deleteCalled = false;
  const { app, mockStorage } = createTestApp({
    storage: {
      async getFavoritePlayer(id) {
        return { id, userId: TEST_USER_ID, playerTag: TEST_PLAYER_TAG } as any;
      },
      async deleteFavoritePlayer() { deleteCalled = true; },
    },
  });

  mountFavoriteRoutes(app, mockStorage);

  const res = await request(app).delete("/api/favorites/f-1");
  assert.equal(res.status, 200);
  assert.ok(deleteCalled);
});

test("Favorites DELETE: returns 404 for non-existent", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async getFavoritePlayer() { return undefined; },
    },
  });

  mountFavoriteRoutes(app, mockStorage);

  const res = await request(app).delete("/api/favorites/nonexistent");
  assert.equal(res.status, 404);
  assert.equal(res.body.code, "FAVORITE_NOT_FOUND");
});
