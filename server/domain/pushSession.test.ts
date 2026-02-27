/**
 * Tests for Story 2.5: Push session aggregation & daily summary.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  groupBattlesIntoSessions,
  computeDailySummary,
  buildTrophyProgression,
  filterBattlesByRange,
} from "./pushSession";

// Helper: create a battle at a given time (compact CR format)
function makeBattle(
  timeISO: string,
  result: "win" | "loss" | "draw" = "win",
  trophyChange: number = result === "win" ? 30 : result === "loss" ? -30 : 0,
) {
  // Convert ISO to CR compact format: 20261231T123456.000Z
  const d = new Date(timeISO);
  const compact =
    d.getUTCFullYear().toString() +
    String(d.getUTCMonth() + 1).padStart(2, "0") +
    String(d.getUTCDate()).padStart(2, "0") +
    "T" +
    String(d.getUTCHours()).padStart(2, "0") +
    String(d.getUTCMinutes()).padStart(2, "0") +
    String(d.getUTCSeconds()).padStart(2, "0") +
    ".000Z";

  const teamCrowns = result === "win" ? 2 : result === "draw" ? 1 : 0;
  const oppCrowns = result === "loss" ? 2 : result === "draw" ? 1 : 0;

  return {
    battleTime: compact,
    type: "PvP",
    team: [{ crowns: teamCrowns, trophyChange }],
    opponent: [{ crowns: oppCrowns }],
  };
}

describe("groupBattlesIntoSessions", () => {
  it("groups battles within 30-min gap into one session", () => {
    const battles = [
      makeBattle("2026-02-27T10:00:00Z", "win", 30),
      makeBattle("2026-02-27T10:05:00Z", "loss", -30),
      makeBattle("2026-02-27T10:10:00Z", "win", 30),
    ];

    const sessions = groupBattlesIntoSessions(battles);
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].battles, 3);
    assert.equal(sessions[0].wins, 2);
    assert.equal(sessions[0].losses, 1);
    assert.equal(sessions[0].trophyDelta, 30);
  });

  it("splits sessions when gap exceeds 30 min", () => {
    const battles = [
      makeBattle("2026-02-27T10:00:00Z", "win", 30),
      makeBattle("2026-02-27T10:05:00Z", "win", 30),
      // 45 min gap
      makeBattle("2026-02-27T10:50:00Z", "loss", -25),
      makeBattle("2026-02-27T10:55:00Z", "loss", -25),
    ];

    const sessions = groupBattlesIntoSessions(battles);
    assert.equal(sessions.length, 2);
    // Newest first
    assert.equal(sessions[0].wins, 0);
    assert.equal(sessions[0].losses, 2);
    assert.equal(sessions[1].wins, 2);
    assert.equal(sessions[1].losses, 0);
  });

  it("returns empty for empty input", () => {
    assert.deepEqual(groupBattlesIntoSessions([]), []);
  });
});

describe("computeDailySummary", () => {
  it("filters to today's battles only", () => {
    const now = new Date("2026-02-27T15:00:00Z");

    const battles = [
      makeBattle("2026-02-27T10:00:00Z", "win", 30),
      makeBattle("2026-02-27T12:00:00Z", "loss", -30),
      // Yesterday - should be excluded
      makeBattle("2026-02-26T22:00:00Z", "win", 30),
    ];

    const summary = computeDailySummary(battles, now);
    assert.equal(summary.battles, 2);
    assert.equal(summary.wins, 1);
    assert.equal(summary.losses, 1);
    assert.equal(summary.trophyDelta, 0);
    assert.equal(summary.winRate, 50);
  });

  it("returns empty summary when no battles today", () => {
    const now = new Date("2026-02-27T15:00:00Z");
    const battles = [makeBattle("2026-02-26T10:00:00Z", "win", 30)];

    const summary = computeDailySummary(battles, now);
    assert.equal(summary.battles, 0);
    assert.equal(summary.wins, 0);
    assert.equal(summary.losses, 0);
    assert.equal(summary.trophyDelta, 0);
  });

  it("calculates streak from today's battles", () => {
    const now = new Date("2026-02-27T15:00:00Z");
    // Newest first
    const battles = [
      makeBattle("2026-02-27T14:00:00Z", "loss", -30),
      makeBattle("2026-02-27T13:00:00Z", "loss", -30),
      makeBattle("2026-02-27T12:00:00Z", "loss", -30),
      makeBattle("2026-02-27T11:00:00Z", "win", 30),
    ];

    const summary = computeDailySummary(battles, now);
    assert.equal(summary.streak.type, "loss");
    assert.equal(summary.streak.count, 3);
  });
});

describe("buildTrophyProgression", () => {
  it("builds progression points from battles", () => {
    const battles = [
      makeBattle("2026-02-27T10:00:00Z", "win", 30),
      makeBattle("2026-02-27T10:05:00Z", "win", 30),
      // New session
      makeBattle("2026-02-27T11:00:00Z", "loss", -25),
    ];

    const progression = buildTrophyProgression(battles, 5000);
    assert.ok(progression.length > 0);
    // Last point should be at current trophies
    assert.equal(progression[progression.length - 1].trophies, 5000);
  });

  it("returns empty for no battles", () => {
    assert.deepEqual(buildTrophyProgression([], 5000), []);
  });
});

describe("filterBattlesByRange", () => {
  it("filters to today", () => {
    const now = new Date("2026-02-27T15:00:00Z");
    const battles = [
      makeBattle("2026-02-27T10:00:00Z", "win"),
      makeBattle("2026-02-26T10:00:00Z", "win"),
    ];

    const filtered = filterBattlesByRange(battles, "today", now);
    assert.equal(filtered.length, 1);
  });

  it("filters to this week", () => {
    const now = new Date("2026-02-27T15:00:00Z");
    const battles = [
      makeBattle("2026-02-27T10:00:00Z", "win"),
      makeBattle("2026-02-22T10:00:00Z", "win"),
      makeBattle("2026-02-10T10:00:00Z", "win"), // over 7 days ago
    ];

    const filtered = filterBattlesByRange(battles, "week", now);
    assert.equal(filtered.length, 2);
  });

  it("filters to season (35 days)", () => {
    const now = new Date("2026-02-27T15:00:00Z");
    const battles = [
      makeBattle("2026-02-27T10:00:00Z", "win"),
      makeBattle("2026-02-01T10:00:00Z", "win"),
      makeBattle("2026-01-01T10:00:00Z", "win"), // over 35 days ago
    ];

    const filtered = filterBattlesByRange(battles, "season", now);
    assert.equal(filtered.length, 2);
  });
});
