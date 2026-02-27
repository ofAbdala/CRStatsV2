/**
 * Tests for Story 2.5: Enhanced tilt detection (detectTilt, detectTiltHistory).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectTilt, detectTiltHistory } from "./tilt";

function makeBattle(
  timeISO: string,
  result: "win" | "loss",
  trophyChange?: number,
) {
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

  const teamCrowns = result === "win" ? 2 : 0;
  const oppCrowns = result === "loss" ? 2 : 0;
  const tc = trophyChange ?? (result === "win" ? 30 : -30);

  return {
    battleTime: compact,
    team: [{ crowns: teamCrowns, trophyChange: tc }],
    opponent: [{ crowns: oppCrowns }],
  };
}

describe("detectTilt", () => {
  it("detects tilt with 3+ consecutive losses (newest first)", () => {
    const battles = [
      makeBattle("2026-02-27T10:30:00Z", "loss", -25),
      makeBattle("2026-02-27T10:25:00Z", "loss", -30),
      makeBattle("2026-02-27T10:20:00Z", "loss", -28),
      makeBattle("2026-02-27T10:15:00Z", "win", 30),
    ];

    const result = detectTilt(battles);
    assert.equal(result.isOnTilt, true);
    assert.equal(result.consecutiveLosses, 3);
    assert.equal(result.trophiesLostDuringTilt, 83);
    assert.equal(result.suggestedAction, "counter");
  });

  it("suggests break for 5+ consecutive losses", () => {
    const battles = [
      makeBattle("2026-02-27T10:50:00Z", "loss"),
      makeBattle("2026-02-27T10:45:00Z", "loss"),
      makeBattle("2026-02-27T10:40:00Z", "loss"),
      makeBattle("2026-02-27T10:35:00Z", "loss"),
      makeBattle("2026-02-27T10:30:00Z", "loss"),
      makeBattle("2026-02-27T10:25:00Z", "win"),
    ];

    const result = detectTilt(battles);
    assert.equal(result.isOnTilt, true);
    assert.equal(result.consecutiveLosses, 5);
    assert.equal(result.suggestedAction, "break");
  });

  it("no tilt when first battle is a win", () => {
    const battles = [
      makeBattle("2026-02-27T10:30:00Z", "win"),
      makeBattle("2026-02-27T10:25:00Z", "loss"),
      makeBattle("2026-02-27T10:20:00Z", "loss"),
    ];

    const result = detectTilt(battles);
    assert.equal(result.isOnTilt, false);
    assert.equal(result.consecutiveLosses, 0);
  });

  it("returns safe defaults for empty battles", () => {
    const result = detectTilt([]);
    assert.equal(result.isOnTilt, false);
    assert.equal(result.consecutiveLosses, 0);
    assert.equal(result.trophiesLostDuringTilt, 0);
  });
});

describe("detectTiltHistory", () => {
  it("finds historical tilt events", () => {
    // Newest first
    const battles = [
      makeBattle("2026-02-27T14:00:00Z", "win"),
      makeBattle("2026-02-27T13:30:00Z", "loss"),
      makeBattle("2026-02-27T13:25:00Z", "loss"),
      makeBattle("2026-02-27T13:20:00Z", "loss"),
      makeBattle("2026-02-27T12:00:00Z", "win"),
      makeBattle("2026-02-27T11:00:00Z", "win"),
    ];

    const events = detectTiltHistory(battles);
    assert.equal(events.length, 1);
    assert.equal(events[0].consecutiveLosses, 3);
    assert.equal(events[0].trophiesLost, 90);
  });

  it("finds multiple tilt events", () => {
    const battles = [
      makeBattle("2026-02-27T16:00:00Z", "win"),
      // Second tilt
      makeBattle("2026-02-27T15:30:00Z", "loss"),
      makeBattle("2026-02-27T15:25:00Z", "loss"),
      makeBattle("2026-02-27T15:20:00Z", "loss"),
      makeBattle("2026-02-27T14:00:00Z", "win"),
      // First tilt
      makeBattle("2026-02-27T13:30:00Z", "loss"),
      makeBattle("2026-02-27T13:25:00Z", "loss"),
      makeBattle("2026-02-27T13:20:00Z", "loss"),
      makeBattle("2026-02-27T12:00:00Z", "win"),
    ];

    const events = detectTiltHistory(battles);
    assert.equal(events.length, 2);
    // Newest first
    assert.ok(events[0].startTime > events[1].startTime);
  });

  it("returns empty for no tilt events", () => {
    const battles = [
      makeBattle("2026-02-27T10:30:00Z", "win"),
      makeBattle("2026-02-27T10:25:00Z", "loss"),
      makeBattle("2026-02-27T10:20:00Z", "win"),
    ];

    const events = detectTiltHistory(battles);
    assert.equal(events.length, 0);
  });

  it("detects ongoing tilt (at the end of battles)", () => {
    // Newest first - currently on a tilt
    const battles = [
      makeBattle("2026-02-27T10:30:00Z", "loss"),
      makeBattle("2026-02-27T10:25:00Z", "loss"),
      makeBattle("2026-02-27T10:20:00Z", "loss"),
      makeBattle("2026-02-27T10:15:00Z", "loss"),
      makeBattle("2026-02-27T10:10:00Z", "win"),
    ];

    const events = detectTiltHistory(battles);
    assert.equal(events.length, 1);
    assert.equal(events[0].consecutiveLosses, 4);
  });
});
