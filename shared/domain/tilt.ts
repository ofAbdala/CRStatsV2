export type TiltLevel = "high" | "medium" | "none";

export type TiltDecayStage = "none" | "2h" | "6h" | "12h";

export interface TiltState {
  lastBattleAt: Date | null;
  hoursSinceLastBattle: number | null;
  baseLevel: TiltLevel;
  baseRisk: number;
  level: TiltLevel;
  risk: number;
  alert: boolean;
  decayStage: TiltDecayStage;
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

export function computeTiltRiskFromLevel(level: TiltLevel): number {
  if (level === "high") return 100;
  if (level === "medium") return 60;
  return 0;
}

export function computeTiltLevelFromRisk(risk: number): TiltLevel {
  if (risk >= 70) return "high";
  if (risk >= 40) return "medium";
  return "none";
}

export function computeTiltState(battles: any[], now: Date = new Date()): TiltState {
  const baseLevel = computeTiltLevel(battles);
  const baseRisk = computeTiltRiskFromLevel(baseLevel);

  let lastBattleAt: Date | null = null;

  if (Array.isArray(battles) && battles.length > 0) {
    for (const battle of battles) {
      const raw = typeof battle?.battleTime === "string" ? battle.battleTime : "";
      const parsed = parseBattleTime(raw);
      const ms = parsed.getTime();
      if (Number.isNaN(ms)) continue;
      if (!lastBattleAt || ms > lastBattleAt.getTime()) {
        lastBattleAt = parsed;
      }
    }
  }

  const nowMs = now.getTime();
  const lastMs = lastBattleAt?.getTime() ?? null;
  const diffMs = lastMs === null ? null : Math.max(0, nowMs - lastMs);
  const hoursSinceLastBattle = diffMs === null ? null : diffMs / (60 * 60 * 1000);

  let decayStage: TiltDecayStage = "none";
  let multiplier = 1;

  if (typeof hoursSinceLastBattle === "number") {
    if (hoursSinceLastBattle >= 12) {
      decayStage = "12h";
      multiplier = 0;
    } else if (hoursSinceLastBattle >= 6) {
      decayStage = "6h";
      multiplier = 0.4;
    } else if (hoursSinceLastBattle >= 2) {
      decayStage = "2h";
      multiplier = 0.7;
    }
  }

  const risk = Math.round(baseRisk * multiplier);
  const level = computeTiltLevelFromRisk(risk);

  return {
    lastBattleAt,
    hoursSinceLastBattle,
    baseLevel,
    baseRisk,
    level,
    risk,
    alert: level === "high",
    decayStage,
  };
}

