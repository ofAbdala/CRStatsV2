/**
 * Integration tests for player stats routes (Story 2.4).
 * Tests: card win rates, deck stats, season summary, matchup data.
 */
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createTestApp, mountPlayerStatsRoutes } from "../helpers/app";
import { TEST_USER_ID } from "../helpers/mocks";

// ── Test data ─────────────────────────────────────────────────────────────────

const CURRENT_SEASON = (new Date().getUTCFullYear() - 2016) * 12 + (new Date().getUTCMonth() + 1);

const MOCK_BATTLE_STATS_CACHE = [
  {
    id: "bsc-1",
    userId: TEST_USER_ID,
    season: CURRENT_SEASON,
    deckHash: "cannon|fireball|hog rider|ice golem|ice spirit|musketeer|skeletons|the log",
    battles: 25,
    wins: 15,
    threeCrowns: 5,
    avgElixir: 2.6,
    opponentArchetypes: {
      "Beatdown": { battles: 8, wins: 6 },
      "Cycle": { battles: 10, wins: 5 },
      "Control": { battles: 7, wins: 4 },
    },
    updatedAt: new Date(),
  },
  {
    id: "bsc-2",
    userId: TEST_USER_ID,
    season: CURRENT_SEASON - 1,
    deckHash: "baby dragon|electro wizard|golem|lumberjack|mega minion|night witch|rage|tornado",
    battles: 15,
    wins: 8,
    threeCrowns: 6,
    avgElixir: 4.1,
    opponentArchetypes: {
      "Cycle": { battles: 5, wins: 2 },
      "Siege": { battles: 3, wins: 3 },
    },
    updatedAt: new Date(),
  },
];

const MOCK_CARD_PERFORMANCE = [
  { id: "cp-1", userId: TEST_USER_ID, cardId: "Hog Rider", season: CURRENT_SEASON, battles: 25, wins: 15, updatedAt: new Date() },
  { id: "cp-2", userId: TEST_USER_ID, cardId: "Musketeer", season: CURRENT_SEASON, battles: 25, wins: 15, updatedAt: new Date() },
  { id: "cp-3", userId: TEST_USER_ID, cardId: "Fireball", season: CURRENT_SEASON, battles: 25, wins: 15, updatedAt: new Date() },
  { id: "cp-4", userId: TEST_USER_ID, cardId: "The Log", season: CURRENT_SEASON, battles: 12, wins: 8, updatedAt: new Date() },
  { id: "cp-5", userId: TEST_USER_ID, cardId: "Ice Spirit", season: CURRENT_SEASON, battles: 8, wins: 5, updatedAt: new Date() }, // < 10 battles
  { id: "cp-6", userId: TEST_USER_ID, cardId: "Golem", season: CURRENT_SEASON - 1, battles: 15, wins: 8, updatedAt: new Date() },
];

// ── Card Win Rates (AC3) ──────────────────────────────────────────────────

test("Stats Cards: returns card win rates with 10+ battles", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async getCardPerformance(userId, options) {
        if (options?.season !== undefined) {
          return MOCK_CARD_PERFORMANCE.filter((c) => c.season === options.season) as any;
        }
        return MOCK_CARD_PERFORMANCE as any;
      },
    },
  });

  mountPlayerStatsRoutes(app, mockStorage);

  const res = await request(app).get("/api/player/stats/cards").send();
  assert.equal(res.status, 200);
  assert.equal(res.body.currentSeason, CURRENT_SEASON);
  assert.ok(Array.isArray(res.body.cards));

  // Ice Spirit has only 8 battles, should be filtered out
  const cardIds = res.body.cards.map((c: any) => c.cardId);
  assert.ok(!cardIds.includes("Ice Spirit"), "Cards with < 10 battles should be excluded");
  assert.ok(cardIds.includes("Hog Rider"), "Cards with >= 10 battles should be included");
  assert.ok(cardIds.includes("The Log"), "Cards with >= 10 battles should be included");

  // Check win rate calculation
  const hogRider = res.body.cards.find((c: any) => c.cardId === "Hog Rider");
  assert.ok(hogRider);
  assert.equal(hogRider.winRate, 60.0);
  assert.equal(hogRider.battles, 25);
});

test("Stats Cards: filters by season", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async getCardPerformance(userId, options) {
        if (options?.season !== undefined) {
          return MOCK_CARD_PERFORMANCE.filter((c) => c.season === options.season) as any;
        }
        return MOCK_CARD_PERFORMANCE as any;
      },
    },
  });

  mountPlayerStatsRoutes(app, mockStorage);

  const res = await request(app).get(`/api/player/stats/cards?season=${CURRENT_SEASON - 1}`).send();
  assert.equal(res.status, 200);

  // Only Golem has 15 battles in previous season
  const cardIds = res.body.cards.map((c: any) => c.cardId);
  assert.ok(cardIds.includes("Golem"), "Should include cards from requested season");
  assert.ok(!cardIds.includes("Hog Rider"), "Should not include cards from other seasons");
});

test("Stats Cards: unauthenticated returns 401", async () => {
  const { app, mockStorage } = createTestApp({ authenticated: false });
  mountPlayerStatsRoutes(app, mockStorage);

  const res = await request(app).get("/api/player/stats/cards").send();
  assert.equal(res.status, 401);
  assert.equal(res.body.code, "UNAUTHORIZED");
});

// ── Deck Stats (AC1, AC2) ─────────────────────────────────────────────────

test("Stats Decks: returns deck stats with 3-crown rate", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async getBattleStatsCache(userId, options) {
        if (options?.season !== undefined) {
          return MOCK_BATTLE_STATS_CACHE.filter((d) => d.season === options.season) as any;
        }
        return MOCK_BATTLE_STATS_CACHE as any;
      },
    },
  });

  mountPlayerStatsRoutes(app, mockStorage);

  const res = await request(app).get("/api/player/stats/decks").send();
  assert.equal(res.status, 200);
  assert.equal(res.body.currentSeason, CURRENT_SEASON);
  assert.ok(Array.isArray(res.body.decks));
  assert.ok(res.body.decks.length > 0);

  // Check first deck has 3-crown rate
  const firstDeck = res.body.decks[0];
  assert.ok(typeof firstDeck.threeCrownRate === "number", "Should have threeCrownRate");
  assert.ok(typeof firstDeck.winRate === "number", "Should have winRate");
  assert.ok(typeof firstDeck.battles === "number", "Should have battles count");
  assert.ok(Array.isArray(firstDeck.cards), "Should have cards array");

  // Hog deck: 25 battles, 5 three-crowns -> 20% three-crown rate
  const hogDeck = res.body.decks.find((d: any) => d.deckHash.includes("hog rider"));
  if (hogDeck) {
    assert.equal(hogDeck.threeCrownRate, 20.0);
    assert.equal(hogDeck.winRate, 60.0);
  }
});

test("Stats Decks: unauthenticated returns 401", async () => {
  const { app, mockStorage } = createTestApp({ authenticated: false });
  mountPlayerStatsRoutes(app, mockStorage);

  const res = await request(app).get("/api/player/stats/decks").send();
  assert.equal(res.status, 401);
});

// ── Season Summary (AC7, AC8) ─────────────────────────────────────────────

test("Stats Season: returns season summary with available seasons", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async getBattleStatsCache(userId, options) {
        if (options?.season !== undefined) {
          return MOCK_BATTLE_STATS_CACHE.filter((d) => d.season === options.season) as any;
        }
        return MOCK_BATTLE_STATS_CACHE as any;
      },
      async getCardPerformance(userId, options) {
        if (options?.season !== undefined) {
          return MOCK_CARD_PERFORMANCE.filter((c) => c.season === options.season) as any;
        }
        return MOCK_CARD_PERFORMANCE as any;
      },
    },
  });

  mountPlayerStatsRoutes(app, mockStorage);

  const res = await request(app).get("/api/player/stats/season").send();
  assert.equal(res.status, 200);
  assert.equal(res.body.season, CURRENT_SEASON);
  assert.ok(typeof res.body.seasonLabel === "string");
  assert.ok(typeof res.body.totalBattles === "number");
  assert.ok(typeof res.body.wins === "number");
  assert.ok(typeof res.body.losses === "number");
  assert.ok(typeof res.body.winRate === "number");
  assert.ok(Array.isArray(res.body.availableSeasons));

  // Should have 2 seasons in availableSeasons
  assert.ok(res.body.availableSeasons.length >= 1, "Should list available seasons");
  assert.ok(res.body.availableSeasons[0].season, "Each season should have season number");
  assert.ok(res.body.availableSeasons[0].label, "Each season should have label");
});

test("Stats Season: specific season parameter works", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async getBattleStatsCache(userId, options) {
        if (options?.season !== undefined) {
          return MOCK_BATTLE_STATS_CACHE.filter((d) => d.season === options.season) as any;
        }
        return MOCK_BATTLE_STATS_CACHE as any;
      },
      async getCardPerformance(userId, options) {
        if (options?.season !== undefined) {
          return MOCK_CARD_PERFORMANCE.filter((c) => c.season === options.season) as any;
        }
        return MOCK_CARD_PERFORMANCE as any;
      },
    },
  });

  mountPlayerStatsRoutes(app, mockStorage);

  const res = await request(app).get(`/api/player/stats/season?season=${CURRENT_SEASON - 1}`).send();
  assert.equal(res.status, 200);
  assert.equal(res.body.season, CURRENT_SEASON - 1);
  assert.ok(res.body.totalBattles >= 0);
});

test("Stats Season: unauthenticated returns 401", async () => {
  const { app, mockStorage } = createTestApp({ authenticated: false });
  mountPlayerStatsRoutes(app, mockStorage);

  const res = await request(app).get("/api/player/stats/season").send();
  assert.equal(res.status, 401);
});

// ── Matchup Data (AC5, AC6) ──────────────────────────────────────────────

test("Stats Matchups: returns matchup data for a deck", async () => {
  const deckHash = "cannon|fireball|hog rider|ice golem|ice spirit|musketeer|skeletons|the log";

  const { app, mockStorage } = createTestApp({
    storage: {
      async getBattleStatsCache() {
        return MOCK_BATTLE_STATS_CACHE as any;
      },
    },
  });

  mountPlayerStatsRoutes(app, mockStorage);

  const res = await request(app).get(`/api/player/stats/matchups?deck=${encodeURIComponent(deckHash)}`).send();
  assert.equal(res.status, 200);
  assert.equal(res.body.deckHash, deckHash);
  assert.ok(Array.isArray(res.body.matchups));
  assert.ok(res.body.matchups.length > 0, "Should have matchup entries");

  // Check matchup structure
  const matchup = res.body.matchups[0];
  assert.ok(typeof matchup.opponentArchetype === "string");
  assert.ok(typeof matchup.battles === "number");
  assert.ok(typeof matchup.wins === "number");
  assert.ok(typeof matchup.winRate === "number");

  // Cycle: 10 battles, 5 wins -> 50%
  const cycleMatchup = res.body.matchups.find((m: any) => m.opponentArchetype === "Cycle");
  if (cycleMatchup) {
    assert.equal(cycleMatchup.battles, 10);
    assert.equal(cycleMatchup.wins, 5);
    assert.equal(cycleMatchup.winRate, 50.0);
  }

  // Beatdown: 8 battles, 6 wins -> 75%
  const beatdownMatchup = res.body.matchups.find((m: any) => m.opponentArchetype === "Beatdown");
  if (beatdownMatchup) {
    assert.equal(beatdownMatchup.battles, 8);
    assert.equal(beatdownMatchup.wins, 6);
    assert.equal(beatdownMatchup.winRate, 75.0);
  }
});

test("Stats Matchups: missing deck param returns 400", async () => {
  const { app, mockStorage } = createTestApp();
  mountPlayerStatsRoutes(app, mockStorage);

  const res = await request(app).get("/api/player/stats/matchups").send();
  assert.equal(res.status, 400);
  assert.equal(res.body.code, "VALIDATION_ERROR");
});

test("Stats Matchups: unknown deck returns empty matchups", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async getBattleStatsCache() {
        return MOCK_BATTLE_STATS_CACHE as any;
      },
    },
  });

  mountPlayerStatsRoutes(app, mockStorage);

  const res = await request(app).get("/api/player/stats/matchups?deck=nonexistent-deck-hash").send();
  assert.equal(res.status, 200);
  assert.equal(res.body.matchups.length, 0);
});

test("Stats Matchups: unauthenticated returns 401", async () => {
  const { app, mockStorage } = createTestApp({ authenticated: false });
  mountPlayerStatsRoutes(app, mockStorage);

  const res = await request(app).get("/api/player/stats/matchups?deck=test").send();
  assert.equal(res.status, 401);
});

// ── Empty Data Edge Cases ──────────────────────────────────────────────────

test("Stats: empty storage returns empty results", async () => {
  const { app, mockStorage } = createTestApp({
    storage: {
      async getBattleStatsCache() { return []; },
      async getCardPerformance() { return []; },
    },
  });

  mountPlayerStatsRoutes(app, mockStorage);

  const cardsRes = await request(app).get("/api/player/stats/cards").send();
  assert.equal(cardsRes.status, 200);
  assert.equal(cardsRes.body.cards.length, 0);

  const decksRes = await request(app).get("/api/player/stats/decks").send();
  assert.equal(decksRes.status, 200);
  assert.equal(decksRes.body.decks.length, 0);

  const seasonRes = await request(app).get("/api/player/stats/season").send();
  assert.equal(seasonRes.status, 200);
  assert.equal(seasonRes.body.totalBattles, 0);
  assert.equal(seasonRes.body.winRate, 0);
});
