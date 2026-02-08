export type TiltLevel = "high" | "medium" | "none";

export interface PushSession {
  startTime: Date;
  endTime: Date;
  battles: any[];
  wins: number;
  losses: number;
  winRate: number;
  netTrophies: number;
}

interface GoalLike {
  type: "trophies" | "streak" | "winrate" | "custom";
  targetValue: number;
  currentValue?: number | null;
  completed?: boolean | null;
}

interface GoalAutoProgressContext {
  playerTrophies: number;
  winRate: number;
  streak: { type: "win" | "loss" | "none"; count: number };
}

export function parseBattleTime(value: string): Date {
  if (!value) return new Date(NaN);

  const formatted = value.replace(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})\.(\d{3})Z$/,
    "$1-$2-$3T$4:$5:$6.$7Z",
  );

  const parsed = new Date(formatted);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  return new Date(value);
}

export function computeTiltLevel(battles: any[]): TiltLevel {
  if (!battles || battles.length === 0) return "none";

  const last10 = battles.slice(0, 10);

  let wins = 0;
  let netTrophies = 0;
  let consecutiveLosses = 0;
  let maxConsecutiveLosses = 0;

  for (const battle of last10) {
    const isVictory = battle?.team?.[0]?.crowns > battle?.opponent?.[0]?.crowns;
    const trophyChange = battle?.team?.[0]?.trophyChange || 0;

    if (isVictory) {
      wins += 1;
      consecutiveLosses = 0;
    } else {
      consecutiveLosses += 1;
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, consecutiveLosses);
    }

    netTrophies += trophyChange;
  }

  const winRate = last10.length > 0 ? (wins / last10.length) * 100 : 50;

  if (maxConsecutiveLosses >= 3 || (winRate < 40 && netTrophies <= -60)) {
    return "high";
  }

  if (winRate >= 40 && winRate <= 50 && netTrophies < 0) {
    return "medium";
  }

  return "none";
}

export function computeConsecutiveLosses(battles: any[]): number {
  let streak = 0;
  for (const battle of battles) {
    const isVictory = battle?.team?.[0]?.crowns > battle?.opponent?.[0]?.crowns;
    if (isVictory) break;
    streak += 1;
  }
  return streak;
}

function createSessionFromBattles(battles: any[]): PushSession {
  let wins = 0;
  let losses = 0;
  let netTrophies = 0;

  for (const battle of battles) {
    const isVictory = battle?.team?.[0]?.crowns > battle?.opponent?.[0]?.crowns;
    const trophyChange = battle?.team?.[0]?.trophyChange || 0;

    if (isVictory) wins += 1;
    else losses += 1;

    netTrophies += trophyChange;
  }

  const battleTimes = battles.map((battle) => parseBattleTime(battle?.battleTime || ""));
  const startTime = new Date(Math.min(...battleTimes.map((time) => time.getTime())));
  const endTime = new Date(Math.max(...battleTimes.map((time) => time.getTime())));

  return {
    startTime,
    endTime,
    battles,
    wins,
    losses,
    winRate: battles.length > 0 ? (wins / battles.length) * 100 : 0,
    netTrophies,
  };
}

export function computePushSessions(
  battles: any[],
  options?: { maxGapMinutes?: number; minBattles?: number },
): PushSession[] {
  if (!Array.isArray(battles) || battles.length < 2) return [];

  const maxGapMs = (options?.maxGapMinutes ?? 30) * 60 * 1000;
  const minBattles = options?.minBattles ?? 2;

  const sortedBattles = [...battles]
    .filter((battle) => typeof battle?.battleTime === "string")
    .sort((a, b) => parseBattleTime(b.battleTime).getTime() - parseBattleTime(a.battleTime).getTime());

  const sessions: PushSession[] = [];
  let currentSession: any[] = [];

  for (const battle of sortedBattles) {
    if (currentSession.length === 0) {
      currentSession.push(battle);
      continue;
    }

    const previousBattle = currentSession[currentSession.length - 1];
    const previousTime = parseBattleTime(previousBattle.battleTime).getTime();
    const currentTime = parseBattleTime(battle.battleTime).getTime();
    const diff = Math.abs(previousTime - currentTime);

    if (diff <= maxGapMs) {
      currentSession.push(battle);
      continue;
    }

    if (currentSession.length >= minBattles) {
      sessions.push(createSessionFromBattles(currentSession));
    }
    currentSession = [battle];
  }

  if (currentSession.length >= minBattles) {
    sessions.push(createSessionFromBattles(currentSession));
  }

  return sessions;
}

export function evaluateFreeCoachLimit(messagesToday: number, limit: number) {
  const reached = messagesToday >= limit;
  return {
    reached,
    remaining: reached ? 0 : Math.max(0, limit - messagesToday),
  };
}

export function computeGoalAutoProgress(
  goal: GoalLike,
  context: GoalAutoProgressContext,
): { shouldUpdate: boolean; currentValue: number; completed: boolean } | null {
  if (!goal || goal.completed) return null;

  const currentValue = goal.currentValue || 0;

  if (goal.type === "trophies") {
    const nextValue = context.playerTrophies;
    return {
      shouldUpdate: nextValue !== currentValue,
      currentValue: nextValue,
      completed: nextValue >= goal.targetValue,
    };
  }

  if (goal.type === "winrate") {
    const nextValue = Math.round(context.winRate);
    return {
      shouldUpdate: nextValue !== currentValue,
      currentValue: nextValue,
      completed: nextValue >= goal.targetValue,
    };
  }

  if (goal.type === "streak" && context.streak.type === "win") {
    const nextValue = context.streak.count;
    return {
      shouldUpdate: nextValue > currentValue,
      currentValue: nextValue,
      completed: nextValue >= goal.targetValue,
    };
  }

  return null;
}
