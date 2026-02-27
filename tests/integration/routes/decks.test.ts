/**
 * Integration tests for deck suggestion routes.
 * Tests: counter deck for PRO, free daily limit, meta decks endpoint.
 */
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createTestApp, mountDeckRoutes } from "../helpers/app";
import { TEST_USER_ID } from "../helpers/mocks";

test("Deck Counter: PRO user gets counter deck suggestion", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async isPro() { return true; },
      async countDeckSuggestionsToday() { return 0; },
      async getUserSettings() { return { id: "s-1", preferredLanguage: "en" } as any; },
      async getMetaDecks() { return []; },
    },
  });

  mountDeckRoutes(app, mockStorage, {
    generateCounterDeck: () => ({
      deck: ["Hog Rider", "Musketeer", "Ice Spirit", "Skeletons", "Cannon", "Fireball", "The Log", "Ice Golem"],
      explanation: "Great counter deck.",
    }),
  });

  const res = await request(app)
    .post("/api/decks/builder/counter")
    .send({ targetCardKey: "golem", deckStyle: "cycle" });

  assert.equal(res.status, 200);
  assert.ok(res.body.deck);
  assert.ok(Array.isArray(res.body.deck.cards));
  assert.equal(res.body.deck.cards.length, 8);
  assert.ok(res.body.explanation);
});

test("Deck Counter: free user within limit gets suggestion", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async isPro() { return false; },
      async countDeckSuggestionsToday() { return 0; },
    },
  });

  mountDeckRoutes(app, mockStorage);

  const res = await request(app)
    .post("/api/decks/builder/counter")
    .send({ targetCardKey: "golem" });

  assert.equal(res.status, 200);
  assert.ok(res.body.deck);
});

test("Deck Counter: free user at daily limit gets 403", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async isPro() { return false; },
      async countDeckSuggestionsToday() { return 2; }, // FREE_DECK_SUGGESTION_DAILY_LIMIT = 2
    },
  });

  mountDeckRoutes(app, mockStorage);

  const res = await request(app)
    .post("/api/decks/builder/counter")
    .send({ targetCardKey: "golem" });

  assert.equal(res.status, 403);
  assert.equal(res.body.code, "DECK_COUNTER_DAILY_LIMIT_REACHED");
  assert.equal(res.body.details.limit, 2);
});

test("Deck Counter: free user exceeding limit gets 403", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async isPro() { return false; },
      async countDeckSuggestionsToday() { return 5; },
    },
  });

  mountDeckRoutes(app, mockStorage);

  const res = await request(app)
    .post("/api/decks/builder/counter")
    .send({ targetCardKey: "golem" });

  assert.equal(res.status, 403);
  assert.equal(res.body.code, "DECK_COUNTER_DAILY_LIMIT_REACHED");
});

test("Deck Counter: unauthenticated returns 401", async () => {
  const { app, mockStorage } = createTestApp({ authenticated: false });
  mountDeckRoutes(app, mockStorage);

  const res = await request(app)
    .post("/api/decks/builder/counter")
    .send({ targetCardKey: "golem" });

  assert.equal(res.status, 401);
  assert.equal(res.body.code, "UNAUTHORIZED");
});

test("Meta Decks: returns cached deck data", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async getMetaDecks() {
        return [
          {
            deckHash: "hash-1",
            cards: ["Hog Rider", "Musketeer", "Ice Spirit", "Skeletons", "Cannon", "Fireball", "The Log", "Ice Golem"],
            usageCount: 100,
            avgElixir: 3.0,
            lastUpdatedAt: new Date(),
          },
        ] as any;
      },
    },
  });

  mountDeckRoutes(app, mockStorage);

  const res = await request(app).get("/api/decks/meta");
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.equal(res.body.length, 1);
  assert.equal(res.body[0].deckHash, "hash-1");
  assert.equal(res.body[0].cards.length, 8);
});

test("Deck Counter: increments usage for free user", async () => {
  let incrementCalled = false;
  const { app, mockStorage } = createTestApp({
    storage: {
      async isPro() { return false; },
      async countDeckSuggestionsToday() { return 1; },
      async incrementDeckSuggestionUsage() { incrementCalled = true; },
    },
  });

  mountDeckRoutes(app, mockStorage);

  await request(app)
    .post("/api/decks/builder/counter")
    .send({ targetCardKey: "golem" });

  assert.ok(incrementCalled, "incrementDeckSuggestionUsage should have been called for free user");
});

test("Deck Counter: does NOT increment usage for PRO user", async () => {
  let incrementCalled = false;
  const { app, mockStorage } = createTestApp({
    storage: {
      async isPro() { return true; },
      async incrementDeckSuggestionUsage() { incrementCalled = true; },
    },
  });

  mountDeckRoutes(app, mockStorage);

  await request(app)
    .post("/api/decks/builder/counter")
    .send({ targetCardKey: "golem" });

  assert.equal(incrementCalled, false, "incrementDeckSuggestionUsage should NOT be called for PRO user");
});
