/**
 * Unit tests for statsEngine.ts (Story 2.4).
 * Tests: season derivation, battle processing, stats aggregation, card win rates.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  getSeasonFromDate,
  getCurrentSeason,
  getSeasonLabel,
  extractBattleData,
  processBattleStats,
  computeCardWinRates,
  computeDeckStats,
  computeSeasonSummary,
  computeMatchupData,
} from "../../../server/domain/statsEngine";

// ── Season Derivation ─────────────────────────────────────────────────────

test("getSeasonFromDate: returns correct season number", () => {
  // Jan 2016 = (0 * 12) + 1 = 1
  assert.equal(getSeasonFromDate(new Date("2016-01-15T00:00:00Z")), 1);
  // Dec 2016 = (0 * 12) + 12 = 12
  assert.equal(getSeasonFromDate(new Date("2016-12-01T00:00:00Z")), 12);
  // Jan 2017 = (1 * 12) + 1 = 13
  assert.equal(getSeasonFromDate(new Date("2017-01-01T00:00:00Z")), 13);
  // Feb 2026 = (10 * 12) + 2 = 122
  assert.equal(getSeasonFromDate(new Date("2026-02-15T00:00:00Z")), 122);
});

test("getCurrentSeason: returns a valid season number", () => {
  const season = getCurrentSeason();
  assert.ok(season > 0, "Season should be positive");
  assert.ok(season > 100, "Season should be > 100 for 2024+");
});

test("getSeasonLabel: returns human-readable label", () => {
  assert.equal(getSeasonLabel(1), "Jan 2016");
  assert.equal(getSeasonLabel(12), "Dec 2016");
  assert.equal(getSeasonLabel(13), "Jan 2017");
  assert.equal(getSeasonLabel(122), "Feb 2026");
});

// ── Battle Processing ─────────────────────────────────────────────────────

test("extractBattleData: extracts valid battle data", () => {
  const battle = {
    battleTime: "20260215T120000.000Z",
    team: [{ crowns: 2, cards: [{ name: "Hog Rider" }, { name: "Musketeer" }] }],
    opponent: [{ crowns: 1, cards: [{ name: "Giant" }, { name: "Witch" }] }],
    gameMode: { name: "Ladder" },
  };

  const result = extractBattleData(battle);
  assert.ok(result !== null, "Should extract valid battle");
  assert.equal(result!.result, "win");
  assert.equal(result!.crowns, 2);
  assert.equal(result!.opponentCrowns, 1);
  assert.ok(result!.cards.includes("Hog Rider"));
  assert.ok(result!.cards.includes("Musketeer"));
  assert.ok(result!.opponentCards.includes("Giant"));
  assert.ok(result!.deckHash.length > 0);
  assert.ok(result!.season > 0);
});

test("extractBattleData: handles loss correctly", () => {
  const battle = {
    battleTime: "20260215T120000.000Z",
    team: [{ crowns: 1, cards: [{ name: "Hog Rider" }] }],
    opponent: [{ crowns: 3, cards: [{ name: "Golem" }] }],
  };

  const result = extractBattleData(battle);
  assert.ok(result !== null);
  assert.equal(result!.result, "loss");
  assert.equal(result!.crowns, 1);
  assert.equal(result!.opponentCrowns, 3);
});

test("extractBattleData: handles draw correctly", () => {
  const battle = {
    battleTime: "20260215T120000.000Z",
    team: [{ crowns: 1, cards: [{ name: "Hog Rider" }] }],
    opponent: [{ crowns: 1, cards: [{ name: "Golem" }] }],
  };

  const result = extractBattleData(battle);
  assert.ok(result !== null);
  assert.equal(result!.result, "draw");
});

test("extractBattleData: returns null for missing data", () => {
  assert.equal(extractBattleData(null), null);
  assert.equal(extractBattleData({}), null);
  assert.equal(extractBattleData({ team: [], opponent: [] }), null);
  assert.equal(extractBattleData({ team: [{ cards: [] }], opponent: [{ cards: [{ name: "X" }] }] }), null);
});

test("extractBattleData: handles Date object for battleTime", () => {
  const battle = {
    battleTime: new Date("2026-02-15T12:00:00Z"),
    team: [{ crowns: 2, cards: [{ name: "Hog Rider" }] }],
    opponent: [{ crowns: 1, cards: [{ name: "Giant" }] }],
  };

  const result = extractBattleData(battle);
  assert.ok(result !== null);
  assert.equal(result!.season, 122); // Feb 2026
});

// ── Stats Aggregation ─────────────────────────────────────────────────────

test("processBattleStats: aggregates deck and card stats", () => {
  const battles = [
    {
      battleTime: "20260215T120000.000Z",
      team: [{ crowns: 3, cards: [{ name: "Hog Rider" }, { name: "Musketeer" }] }],
      opponent: [{ crowns: 1, cards: [{ name: "Giant" }, { name: "Witch" }] }],
    },
    {
      battleTime: "20260215T130000.000Z",
      team: [{ crowns: 1, cards: [{ name: "Hog Rider" }, { name: "Musketeer" }] }],
      opponent: [{ crowns: 2, cards: [{ name: "Golem" }, { name: "Night Witch" }] }],
    },
    {
      battleTime: "20260215T140000.000Z",
      team: [{ crowns: 2, cards: [{ name: "Hog Rider" }, { name: "Musketeer" }] }],
      opponent: [{ crowns: 0, cards: [{ name: "Giant" }, { name: "Witch" }] }],
    },
  ];

  const { deckStats, cardStats } = processBattleStats("test-user", battles);

  // All 3 battles use same deck -> 1 deck row
  assert.equal(deckStats.length, 1);
  assert.equal(deckStats[0].battles, 3);
  assert.equal(deckStats[0].wins, 2);
  assert.equal(deckStats[0].threeCrowns, 1); // Only first battle has 3+ crowns AND is a win

  // 2 cards used across all battles
  assert.equal(cardStats.length, 2);
  const hogStats = cardStats.find((c) => c.cardId === "Hog Rider");
  assert.ok(hogStats);
  assert.equal(hogStats!.battles, 3);
  assert.equal(hogStats!.wins, 2);
});

test("processBattleStats: handles empty battles", () => {
  const { deckStats, cardStats } = processBattleStats("test-user", []);
  assert.equal(deckStats.length, 0);
  assert.equal(cardStats.length, 0);
});

// ── Card Win Rates ────────────────────────────────────────────────────────

test("computeCardWinRates: filters by minimum battles", () => {
  const cardStats = [
    { userId: "u1", cardId: "Hog Rider", season: 122, battles: 25, wins: 15 },
    { userId: "u1", cardId: "Musketeer", season: 122, battles: 5, wins: 3 },
  ];

  const result = computeCardWinRates(cardStats, { minBattles: 10 });
  assert.equal(result.length, 1);
  assert.equal(result[0].cardId, "Hog Rider");
  assert.equal(result[0].winRate, 60.0);
});

test("computeCardWinRates: aggregates across seasons when no season filter", () => {
  const cardStats = [
    { userId: "u1", cardId: "Hog Rider", season: 121, battles: 10, wins: 6 },
    { userId: "u1", cardId: "Hog Rider", season: 122, battles: 10, wins: 7 },
  ];

  const result = computeCardWinRates(cardStats, { minBattles: 10 });
  assert.equal(result.length, 1);
  assert.equal(result[0].battles, 20);
  assert.equal(result[0].wins, 13);
  assert.equal(result[0].winRate, 65.0);
});

test("computeCardWinRates: filters by season", () => {
  const cardStats = [
    { userId: "u1", cardId: "Hog Rider", season: 121, battles: 15, wins: 10 },
    { userId: "u1", cardId: "Hog Rider", season: 122, battles: 20, wins: 12 },
  ];

  const result = computeCardWinRates(cardStats, { minBattles: 10, season: 122 });
  assert.equal(result.length, 1);
  assert.equal(result[0].battles, 20);
  assert.equal(result[0].winRate, 60.0);
});

// ── Deck Stats ────────────────────────────────────────────────────────────

test("computeDeckStats: includes 3-crown rate", () => {
  const deckStats = [
    {
      userId: "u1",
      season: 122,
      deckHash: "a|b|c|d",
      battles: 20,
      wins: 12,
      threeCrowns: 4,
      avgElixir: 3.0,
      opponentArchetypes: {},
    },
  ];

  const result = computeDeckStats(deckStats);
  assert.equal(result.length, 1);
  assert.equal(result[0].winRate, 60.0);
  assert.equal(result[0].threeCrownRate, 20.0);
  assert.equal(result[0].battles, 20);
});

// ── Season Summary ────────────────────────────────────────────────────────

test("computeSeasonSummary: computes correct totals", () => {
  const deckStats = [
    { userId: "u1", season: 122, deckHash: "a|b", battles: 10, wins: 7, threeCrowns: 2, avgElixir: 3.0, opponentArchetypes: {} },
    { userId: "u1", season: 122, deckHash: "c|d", battles: 5, wins: 2, threeCrowns: 1, avgElixir: 4.0, opponentArchetypes: {} },
  ];
  const cardStats = [
    { userId: "u1", cardId: "A", season: 122, battles: 10, wins: 7 },
    { userId: "u1", cardId: "B", season: 122, battles: 10, wins: 7 },
    { userId: "u1", cardId: "C", season: 122, battles: 5, wins: 2 },
  ];

  const summary = computeSeasonSummary(122, deckStats, cardStats);
  assert.equal(summary.season, 122);
  assert.equal(summary.totalBattles, 15);
  assert.equal(summary.wins, 9);
  assert.equal(summary.losses, 6);
  assert.equal(summary.winRate, 60.0);
  assert.ok(summary.mostUsedDeck !== null);
  assert.equal(summary.mostUsedDeck!.deckHash, "a|b"); // Most played deck
  assert.equal(summary.mostUsedDeck!.battles, 10);
});

test("computeSeasonSummary: handles empty data", () => {
  const summary = computeSeasonSummary(122, [], []);
  assert.equal(summary.totalBattles, 0);
  assert.equal(summary.winRate, 0);
  assert.equal(summary.mostUsedDeck, null);
  assert.equal(summary.bestCard, null);
});

// ── Matchup Data ──────────────────────────────────────────────────────────

test("computeMatchupData: computes win rates against archetypes", () => {
  const deckStats = [
    {
      userId: "u1",
      season: 122,
      deckHash: "a|b",
      battles: 20,
      wins: 12,
      threeCrowns: 3,
      avgElixir: 3.0,
      opponentArchetypes: {
        "Beatdown": { battles: 8, wins: 6 },
        "Cycle": { battles: 7, wins: 3 },
        "Control": { battles: 5, wins: 3 },
      },
    },
  ];

  const result = computeMatchupData(deckStats, "a|b");
  assert.equal(result.length, 3);

  // Should be sorted by battles descending
  assert.equal(result[0].opponentArchetype, "Beatdown");
  assert.equal(result[0].battles, 8);
  assert.equal(result[0].winRate, 75.0);

  assert.equal(result[1].opponentArchetype, "Cycle");
  assert.equal(result[1].battles, 7);
});

test("computeMatchupData: returns empty for unknown deck", () => {
  const deckStats = [
    {
      userId: "u1",
      season: 122,
      deckHash: "a|b",
      battles: 10,
      wins: 5,
      threeCrowns: 1,
      avgElixir: 3.0,
      opponentArchetypes: { "Cycle": { battles: 10, wins: 5 } },
    },
  ];

  const result = computeMatchupData(deckStats, "x|y");
  assert.equal(result.length, 0);
});

test("computeMatchupData: limits to top 5 archetypes", () => {
  const archetypes: Record<string, { battles: number; wins: number }> = {};
  for (let i = 0; i < 8; i++) {
    archetypes[`Archetype${i}`] = { battles: 10 - i, wins: 5 };
  }

  const deckStats = [
    {
      userId: "u1",
      season: 122,
      deckHash: "a|b",
      battles: 60,
      wins: 30,
      threeCrowns: 10,
      avgElixir: 3.0,
      opponentArchetypes: archetypes,
    },
  ];

  const result = computeMatchupData(deckStats, "a|b");
  assert.equal(result.length, 5, "Should limit to top 5");
});
