/**
 * Integration tests for Story 2.7: Follow system and deck voting.
 */
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createTestApp, mountFollowRoutes, mountTopDecksRoutes } from "../helpers/app";
import { TEST_USER_ID } from "../helpers/mocks";

// ── Follow System ─────────────────────────────────────────────────────────────

test("Follow: successfully follow another user", async () => {
  const { app, mockStorage } = createTestApp();
  mountFollowRoutes(app, mockStorage);

  const res = await request(app)
    .post("/api/follow/target-user-123")
    .send();

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.follow);
});

test("Follow: cannot follow yourself", async () => {
  const { app, mockStorage } = createTestApp();
  mountFollowRoutes(app, mockStorage);

  const res = await request(app)
    .post(`/api/follow/${TEST_USER_ID}`)
    .send();

  assert.equal(res.status, 400);
  assert.equal(res.body.code, "INVALID_TARGET");
});

test("Follow: free tier limit enforced at 50", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async getFollowingCount() { return 50; },
      async getSubscription() { return { id: "sub-1", userId: TEST_USER_ID, plan: "free", status: "inactive" } as any; },
    },
  });
  mountFollowRoutes(app, mockStorage);

  const res = await request(app)
    .post("/api/follow/target-user-456")
    .send();

  assert.equal(res.status, 403);
  assert.equal(res.body.code, "FOLLOW_LIMIT_REACHED");
});

test("Follow: PRO users bypass follow limit", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async getFollowingCount() { return 100; },
      async getSubscription() { return { id: "sub-1", userId: TEST_USER_ID, plan: "pro", status: "active" } as any; },
    },
  });
  mountFollowRoutes(app, mockStorage);

  const res = await request(app)
    .post("/api/follow/target-user-789")
    .send();

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
});

test("Follow: unfollow a user", async () => {
  const { app, mockStorage } = createTestApp();
  mountFollowRoutes(app, mockStorage);

  const res = await request(app)
    .delete("/api/follow/target-user-123")
    .send();

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
});

test("Follow: get following list", async () => {
  const followData = [
    { id: "f1", followerId: TEST_USER_ID, followingId: "user-a", createdAt: new Date() },
    { id: "f2", followerId: TEST_USER_ID, followingId: "user-b", createdAt: new Date() },
  ];

  const { app, mockStorage } = createTestApp({
    storage: {
      async getFollowing() { return followData as any; },
      async getFollowingCount() { return 2; },
    },
  });
  mountFollowRoutes(app, mockStorage);

  const res = await request(app).get("/api/follow/following");

  assert.equal(res.status, 200);
  assert.equal(res.body.following.length, 2);
  assert.equal(res.body.count, 2);
});

test("Follow: check follow status", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async isFollowing() { return true; },
    },
  });
  mountFollowRoutes(app, mockStorage);

  const res = await request(app).get("/api/follow/status/target-user-123");

  assert.equal(res.status, 200);
  assert.equal(res.body.isFollowing, true);
});

test("Follow: unauthenticated request rejected", async () => {
  const { app, mockStorage } = createTestApp({ authenticated: false });
  mountFollowRoutes(app, mockStorage);

  const res = await request(app)
    .post("/api/follow/target-user-123")
    .send();

  assert.equal(res.status, 401);
});

// ── Deck Voting ───────────────────────────────────────────────────────────────

test("DeckVote: successfully vote for a deck with battleId proof", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async getDeckVoteCount() { return 5; },
    },
  });
  mountTopDecksRoutes(app, mockStorage);

  const res = await request(app)
    .post("/api/deck/vote/hog-rider-cycle")
    .send({ battleId: "battle-123abc" });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.totalVotes, 5);
});

test("DeckVote: missing battleId returns 400", async () => {
  const { app, mockStorage } = createTestApp();
  mountTopDecksRoutes(app, mockStorage);

  const res = await request(app)
    .post("/api/deck/vote/hog-rider-cycle")
    .send({});

  assert.equal(res.status, 400);
  assert.equal(res.body.code, "VALIDATION_ERROR");
});

test("DeckVote: unauthenticated vote rejected", async () => {
  const { app, mockStorage } = createTestApp({ authenticated: false });
  mountTopDecksRoutes(app, mockStorage);

  const res = await request(app)
    .post("/api/deck/vote/hog-rider-cycle")
    .send({ battleId: "battle-123" });

  assert.equal(res.status, 401);
});

// ── Top Decks ─────────────────────────────────────────────────────────────────

test("TopDecks: returns top decks list", async () => {
  const topVotedData = [
    { deckHash: "Hog Rider|Musketeer|Cannon", votes: 15 },
    { deckHash: "Golem|Baby Dragon|Lumberjack", votes: 10 },
  ];

  const { app, mockStorage } = createTestApp({
    storage: {
      async getTopVotedDecks() { return topVotedData; },
    },
  });
  mountTopDecksRoutes(app, mockStorage);

  const res = await request(app).get("/api/community/top-decks");

  assert.equal(res.status, 200);
  assert.equal(res.body.decks.length, 2);
  assert.equal(res.body.decks[0].votes, 15);
  assert.equal(res.body.decks[0].rank, 1);
  assert.equal(res.body.period, "week");
});

test("TopDecks: arena filter is passed through", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async getTopVotedDecks() { return []; },
    },
  });
  mountTopDecksRoutes(app, mockStorage);

  const res = await request(app).get("/api/community/top-decks?arena=10");

  assert.equal(res.status, 200);
  assert.equal(res.body.arenaId, 10);
  assert.equal(res.body.decks.length, 0);
});

test("TopDecks: empty response when no data", async () => {
  const { app, mockStorage } = createTestApp();
  mountTopDecksRoutes(app, mockStorage);

  const res = await request(app).get("/api/community/top-decks");

  assert.equal(res.status, 200);
  assert.equal(res.body.decks.length, 0);
});
