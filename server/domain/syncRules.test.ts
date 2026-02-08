import test from "node:test";
import assert from "node:assert/strict";
import {
  computeConsecutiveLosses,
  computeGoalAutoProgress,
  computePushSessions,
  computeTiltLevel,
  evaluateFreeCoachLimit,
} from "./syncRules";

function battle({
  battleTime,
  myCrowns,
  oppCrowns,
  trophyChange,
}: {
  battleTime: string;
  myCrowns: number;
  oppCrowns: number;
  trophyChange: number;
}) {
  return {
    battleTime,
    team: [{ crowns: myCrowns, trophyChange }],
    opponent: [{ crowns: oppCrowns }],
  };
}

test("grouping de push: gap 30 min é válido e 31 min quebra sessão", () => {
  const battles = [
    battle({ battleTime: "2026-02-08T12:30:00.000Z", myCrowns: 1, oppCrowns: 0, trophyChange: 30 }),
    battle({ battleTime: "2026-02-08T12:00:00.000Z", myCrowns: 0, oppCrowns: 1, trophyChange: -28 }),
    battle({ battleTime: "2026-02-08T11:29:00.000Z", myCrowns: 1, oppCrowns: 0, trophyChange: 29 }),
  ];

  const sessions = computePushSessions(battles, { maxGapMinutes: 30, minBattles: 2 });
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].battles.length, 2);
});

test("grouping de push: sessão de 1 partida não conta", () => {
  const sessions = computePushSessions(
    [battle({ battleTime: "2026-02-08T12:30:00.000Z", myCrowns: 1, oppCrowns: 0, trophyChange: 30 })],
    { maxGapMinutes: 30, minBattles: 2 },
  );
  assert.equal(sessions.length, 0);
});

test("tilt detection: high em sequência de 3 derrotas", () => {
  const battles = [
    battle({ battleTime: "2026-02-08T12:30:00.000Z", myCrowns: 0, oppCrowns: 1, trophyChange: -30 }),
    battle({ battleTime: "2026-02-08T12:20:00.000Z", myCrowns: 1, oppCrowns: 2, trophyChange: -32 }),
    battle({ battleTime: "2026-02-08T12:10:00.000Z", myCrowns: 0, oppCrowns: 3, trophyChange: -35 }),
  ];

  assert.equal(computeTiltLevel(battles), "high");
  assert.equal(computeConsecutiveLosses(battles), 3);
});

test("tilt detection: medium com WR entre 40 e 50 e troféu líquido negativo", () => {
  const battles = [
    battle({ battleTime: "2026-02-08T12:30:00.000Z", myCrowns: 1, oppCrowns: 0, trophyChange: 30 }),
    battle({ battleTime: "2026-02-08T12:20:00.000Z", myCrowns: 0, oppCrowns: 1, trophyChange: -31 }),
    battle({ battleTime: "2026-02-08T12:10:00.000Z", myCrowns: 0, oppCrowns: 1, trophyChange: -31 }),
    battle({ battleTime: "2026-02-08T12:00:00.000Z", myCrowns: 1, oppCrowns: 0, trophyChange: 28 }),
  ];

  assert.equal(computeTiltLevel(battles), "medium");
});

test("limite coach FREE: bloqueia ao atingir limite", () => {
  assert.deepEqual(evaluateFreeCoachLimit(4, 5), { reached: false, remaining: 1 });
  assert.deepEqual(evaluateFreeCoachLimit(5, 5), { reached: true, remaining: 0 });
});

test("auto-progress de goals: trophies/winrate/streak e não altera goal completo", () => {
  const context = {
    playerTrophies: 6200,
    winRate: 58.4,
    streak: { type: "win" as const, count: 4 },
  };

  const trophiesUpdate = computeGoalAutoProgress(
    { type: "trophies", targetValue: 6000, currentValue: 5900, completed: false },
    context,
  );
  assert.deepEqual(trophiesUpdate, { shouldUpdate: true, currentValue: 6200, completed: true });

  const winRateUpdate = computeGoalAutoProgress(
    { type: "winrate", targetValue: 60, currentValue: 50, completed: false },
    context,
  );
  assert.deepEqual(winRateUpdate, { shouldUpdate: true, currentValue: 58, completed: false });

  const streakUpdate = computeGoalAutoProgress(
    { type: "streak", targetValue: 3, currentValue: 1, completed: false },
    context,
  );
  assert.deepEqual(streakUpdate, { shouldUpdate: true, currentValue: 4, completed: true });

  assert.equal(
    computeGoalAutoProgress(
      { type: "trophies", targetValue: 6000, currentValue: 6000, completed: true },
      context,
    ),
    null,
  );
});
