import test from "node:test";
import assert from "node:assert/strict";
import {
  FREE_BATTLE_LIMIT,
  PRO_HISTORY_MAX_DAYS,
  PRO_HISTORY_MAX_LIMIT,
  buildBattleKey,
  clampHistoryDays,
  clampHistoryLimit,
  extractBattleTime,
} from "./battleHistory";

test("battle history constants: FREE limit and PRO clamps", () => {
  assert.equal(FREE_BATTLE_LIMIT, 10);
  assert.equal(PRO_HISTORY_MAX_DAYS, 60);
  assert.equal(PRO_HISTORY_MAX_LIMIT, 2000);
});

test("battleKey: deterministic for same battle", () => {
  const battle = {
    battleTime: "20260208T123000.000Z",
    type: "PvP",
    gameMode: { id: 72000001, name: "Ladder" },
    team: [
      {
        tag: "#AAA",
        crowns: 2,
        trophyChange: 30,
        cards: [{ id: 26000000 }, { id: 26000001 }],
      },
    ],
    opponent: [
      {
        tag: "#BBB",
        crowns: 1,
        cards: [{ id: 26000010 }, { id: 26000011 }],
      },
    ],
  };

  const key1 = buildBattleKey({ userId: "u1", playerTag: "#AAA", battle });
  const key2 = buildBattleKey({ userId: "u1", playerTag: "#AAA", battle: { ...battle } });
  assert.equal(key1, key2);
});

test("battleKey: changes when battle differs", () => {
  const base = {
    battleTime: "20260208T123000.000Z",
    type: "PvP",
    team: [{ tag: "#AAA", crowns: 2, trophyChange: 30, cards: [{ id: 1 }] }],
    opponent: [{ tag: "#BBB", crowns: 1, cards: [{ id: 2 }] }],
  };

  const key1 = buildBattleKey({ userId: "u1", playerTag: "#AAA", battle: base });
  const key2 = buildBattleKey({
    userId: "u1",
    playerTag: "#AAA",
    battle: { ...base, team: [{ ...(base as any).team[0], trophyChange: 29 }] },
  });

  assert.notEqual(key1, key2);
});

test("extractBattleTime: parses clash format and ISO strings", () => {
  const clash = extractBattleTime("20260208T123000.000Z");
  assert.equal(clash?.toISOString(), "2026-02-08T12:30:00.000Z");

  const iso = extractBattleTime("2026-02-08T12:30:00.000Z");
  assert.equal(iso?.toISOString(), "2026-02-08T12:30:00.000Z");

  assert.equal(extractBattleTime(""), null);
});

test("clampHistoryDays: defaults and clamps to 1..60", () => {
  assert.equal(clampHistoryDays(undefined), 60);
  assert.equal(clampHistoryDays("0"), 60);
  assert.equal(clampHistoryDays("1"), 1);
  assert.equal(clampHistoryDays("999"), 60);
});

test("clampHistoryLimit: defaults and clamps to 1..2000", () => {
  assert.equal(clampHistoryLimit(undefined), 2000);
  assert.equal(clampHistoryLimit("0"), 2000);
  assert.equal(clampHistoryLimit("1"), 1);
  assert.equal(clampHistoryLimit("999999"), 2000);
});

