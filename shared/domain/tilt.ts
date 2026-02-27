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

// ── Story 2.5: Enhanced Tilt Detection ──────────────────────────────────────

export type TiltSuggestedAction = "break" | "counter" | "analyze";

export interface TiltDetection {
  isOnTilt: boolean;
  consecutiveLosses: number;
  trophiesLostDuringTilt: number;
  suggestedAction: TiltSuggestedAction;
}

export interface TiltEvent {
  startTime: Date;
  endTime: Date;
  consecutiveLosses: number;
  trophiesLost: number;
}

/**
 * Detects current tilt state from the most recent battles.
 * Looks at the tail of the battle array (newest first) for consecutive losses.
 */
export function detectTilt(battles: any[]): TiltDetection {
  if (!battles || battles.length === 0) {
    return { isOnTilt: false, consecutiveLosses: 0, trophiesLostDuringTilt: 0, suggestedAction: "analyze" };
  }

  let streak = 0;
  let tiltLoss = 0;

  // battles are newest-first
  for (const b of battles) {
    const isVictory = (b?.team?.[0]?.crowns ?? 0) > (b?.opponent?.[0]?.crowns ?? 0);
    if (isVictory) break;
    streak++;
    const trophyChange = b?.team?.[0]?.trophyChange;
    if (typeof trophyChange === "number") {
      tiltLoss += trophyChange; // negative values
    }
  }

  const trophiesLostDuringTilt = Math.abs(tiltLoss);

  let suggestedAction: TiltSuggestedAction = "analyze";
  if (streak >= 5) suggestedAction = "break";
  else if (streak >= 3) suggestedAction = "counter";

  return {
    isOnTilt: streak >= 3,
    consecutiveLosses: streak,
    trophiesLostDuringTilt,
    suggestedAction,
  };
}

/**
 * Scans all battles to find historical tilt events (3+ consecutive losses).
 * Returns an array of tilt events sorted newest-first.
 * Battles must be sorted newest-first.
 */
export function detectTiltHistory(battles: any[]): TiltEvent[] {
  if (!battles || battles.length === 0) return [];

  // Work oldest-first for sequential scan
  const sorted = [...battles].reverse();
  const events: TiltEvent[] = [];
  let currentStreak = 0;
  let currentTrophyLoss = 0;
  let streakStartIdx = -1;

  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i];
    const isVictory = (b?.team?.[0]?.crowns ?? 0) > (b?.opponent?.[0]?.crowns ?? 0);

    if (!isVictory) {
      if (currentStreak === 0) streakStartIdx = i;
      currentStreak++;
      const trophyChange = b?.team?.[0]?.trophyChange;
      if (typeof trophyChange === "number") {
        currentTrophyLoss += trophyChange;
      }
    } else {
      if (currentStreak >= 3) {
        const startBattle = sorted[streakStartIdx];
        const endBattle = sorted[i - 1];
        const startTime = parseBattleTime(startBattle?.battleTime || "");
        const endTime = parseBattleTime(endBattle?.battleTime || "");

        if (!Number.isNaN(startTime.getTime()) && !Number.isNaN(endTime.getTime())) {
          events.push({
            startTime,
            endTime,
            consecutiveLosses: currentStreak,
            trophiesLost: Math.abs(currentTrophyLoss),
          });
        }
      }
      currentStreak = 0;
      currentTrophyLoss = 0;
      streakStartIdx = -1;
    }
  }

  // Check if the last streak (still ongoing) qualifies
  if (currentStreak >= 3 && streakStartIdx >= 0) {
    const startBattle = sorted[streakStartIdx];
    const endBattle = sorted[sorted.length - 1];
    const startTime = parseBattleTime(startBattle?.battleTime || "");
    const endTime = parseBattleTime(endBattle?.battleTime || "");

    if (!Number.isNaN(startTime.getTime()) && !Number.isNaN(endTime.getTime())) {
      events.push({
        startTime,
        endTime,
        consecutiveLosses: currentStreak,
        trophiesLost: Math.abs(currentTrophyLoss),
      });
    }
  }

  // Return newest-first
  return events.reverse();
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

