/**
 * Integration tests for community routes (rankings).
 */
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createTestApp, mountCommunityRoutes } from "../helpers/app";

test("Community: player rankings returns data", async () => {
  const rankings = [
    { tag: "#P1", name: "Champion", trophies: 9000, clan: { name: "TopClan" } },
    { tag: "#P2", name: "Runner", trophies: 8500, clan: { name: "NextClan" } },
  ];

  const { app } = createTestApp();
  mountCommunityRoutes(app, {
    getPlayerRankings: () => ({ data: rankings, status: 200 }),
  });

  const res = await request(app).get("/api/community/player-rankings");
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.equal(res.body.length, 2);
  assert.equal(res.body[0].name, "Champion");
});

test("Community: clan rankings returns data", async () => {
  const clans = [
    { tag: "#C1", name: "TopClan", members: 50, trophies: 50000 },
  ];

  const { app } = createTestApp();
  mountCommunityRoutes(app, {
    getClanRankings: () => ({ data: clans, status: 200 }),
  });

  const res = await request(app).get("/api/community/clan-rankings");
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.equal(res.body.length, 1);
  assert.equal(res.body[0].name, "TopClan");
});

test("Community: player rankings handles API error", async () => {
  const { app } = createTestApp();
  mountCommunityRoutes(app, {
    getPlayerRankings: () => ({ error: "API unavailable", status: 503, data: null }),
  });

  const res = await request(app).get("/api/community/player-rankings");
  assert.equal(res.status, 503);
  assert.ok(res.body.error);
});

test("Community: passes locationId query parameter", async () => {
  let receivedLocationId: string | null = null;

  const { app } = createTestApp();
  mountCommunityRoutes(app, {
    getPlayerRankings: (locationId) => {
      receivedLocationId = locationId;
      return { data: [], status: 200 };
    },
  });

  await request(app).get("/api/community/player-rankings?locationId=57000036");
  assert.equal(receivedLocationId, "57000036");
});
