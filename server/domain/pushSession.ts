/**
 * Push session aggregation & daily summary logic.
 * Story 2.5: Enhanced Push Tracking
 *
 * Sessions are detected by 30-minute gaps between battles.
 * Daily summaries aggregate battles from the current day (UTC).
 */

import { parseBattleTime } from "@shared/domain/tilt";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SessionData {
  startTime: Date;
  endTime: Date;
  battles: number;
  wins: number;
  losses: number;
  draws: number;
  trophyDelta: number;
  winRate: number;
}

export interface DailySummary {
  date: string; // YYYY-MM-DD
  battles: number;
  wins: number;
  losses: number;
  trophyDelta: number;
  winRate: number;
  streak: { type: "win" | "loss" | "none"; count: number };
  sessions: SessionData[];
}

export interface TrophyProgressionPoint {
  time: string; // ISO timestamp
  trophies: number;
  sessionIndex: number;
  trophyDelta: number;
  wins: number;
  losses: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function isBattleWin(battle: any): boolean {
  return (battle?.team?.[0]?.crowns ?? 0) > (battle?.opponent?.[0]?.crowns ?? 0);
}

function isBattleLoss(battle: any): boolean {
  return (battle?.team?.[0]?.crowns ?? 0) < (battle?.opponent?.[0]?.crowns ?? 0);
}

function getTrophyChange(battle: any): number {
  const tc = battle?.team?.[0]?.trophyChange;
  if (typeof tc === "number" && Number.isFinite(tc)) return tc;
  // Fallback estimation
  if (isBattleWin(battle)) return 30;
  if (isBattleLoss(battle)) return -30;
  return 0;
}

function computeStreak(battles: any[]): { type: "win" | "loss" | "none"; count: number } {
  if (!battles || battles.length === 0) return { type: "none", count: 0 };

  let streakType: "win" | "loss" | "none" = "none";
  let count = 0;

  // battles are newest-first
  for (const b of battles) {
    const isWin = isBattleWin(b);
    const isLoss = isBattleLoss(b);
    const thisType = isWin ? "win" : isLoss ? "loss" : "none";

    if (thisType === "none") break; // draw breaks streak

    if (count === 0) {
      streakType = thisType;
      count = 1;
    } else if (thisType === streakType) {
      count++;
    } else {
      break;
    }
  }

  return { type: streakType, count };
}

function startOfDayUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ── Session Detection ──────────────────────────────────────────────────────────

/**
 * Groups battles into sessions based on time gaps.
 * A new session starts when the gap between consecutive battles exceeds maxGapMinutes.
 *
 * @param battles - Array of battles (newest first from API)
 * @param maxGapMinutes - Maximum gap in minutes (default: 30)
 * @returns Sessions sorted newest-first
 */
export function groupBattlesIntoSessions(
  battles: any[],
  maxGapMinutes: number = 30,
): SessionData[] {
  if (!battles || battles.length === 0) return [];

  // Sort oldest-first for grouping
  const sorted = [...battles]
    .filter((b) => typeof b?.battleTime === "string")
    .sort((a, b) => parseBattleTime(a.battleTime).getTime() - parseBattleTime(b.battleTime).getTime());

  if (sorted.length === 0) return [];

  const maxGapMs = maxGapMinutes * 60 * 1000;
  const sessions: SessionData[] = [];
  let currentGroup: any[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prevTime = parseBattleTime(sorted[i - 1].battleTime).getTime();
    const currTime = parseBattleTime(sorted[i].battleTime).getTime();

    if (currTime - prevTime <= maxGapMs) {
      currentGroup.push(sorted[i]);
    } else {
      sessions.push(buildSessionData(currentGroup));
      currentGroup = [sorted[i]];
    }
  }

  sessions.push(buildSessionData(currentGroup));

  // Return newest-first
  return sessions.reverse();
}

function buildSessionData(battles: any[]): SessionData {
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let trophyDelta = 0;

  for (const b of battles) {
    if (isBattleWin(b)) wins++;
    else if (isBattleLoss(b)) losses++;
    else draws++;
    trophyDelta += getTrophyChange(b);
  }

  const total = wins + losses;
  const startTime = parseBattleTime(battles[0].battleTime);
  const endTime = parseBattleTime(battles[battles.length - 1].battleTime);

  return {
    startTime,
    endTime,
    battles: battles.length,
    wins,
    losses,
    draws,
    trophyDelta,
    winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
  };
}

// ── Daily Summary ──────────────────────────────────────────────────────────────

/**
 * Computes today's push summary from a list of battles.
 * Filters to today's battles only (using local time).
 *
 * @param battles - All battles (newest first)
 * @param now - Current time for "today" calculation
 */
export function computeDailySummary(battles: any[], now: Date = new Date()): DailySummary {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayKey = toDayKey(now);

  const todayBattles = (battles || []).filter((b: any) => {
    if (typeof b?.battleTime !== "string") return false;
    const bt = parseBattleTime(b.battleTime);
    return bt >= todayStart;
  });

  // todayBattles maintains original order (newest first)
  let wins = 0;
  let losses = 0;
  let trophyDelta = 0;

  for (const b of todayBattles) {
    if (isBattleWin(b)) wins++;
    else if (isBattleLoss(b)) losses++;
    trophyDelta += getTrophyChange(b);
  }

  const total = wins + losses;
  const sessions = groupBattlesIntoSessions(todayBattles);
  const streak = computeStreak(todayBattles);

  return {
    date: todayKey,
    battles: todayBattles.length,
    wins,
    losses,
    trophyDelta,
    winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
    streak,
    sessions,
  };
}

// ── Trophy Progression ─────────────────────────────────────────────────────────

/**
 * Builds session-by-session trophy progression data for charting.
 * Each point represents a session with its cumulative trophy position.
 *
 * @param battles - All battles within the desired range (newest first)
 * @param currentTrophies - Player's current trophy count
 * @returns Points sorted chronologically (oldest first) for charting
 */
export function buildTrophyProgression(
  battles: any[],
  currentTrophies: number,
): TrophyProgressionPoint[] {
  if (!battles || battles.length === 0) return [];

  const sessions = groupBattlesIntoSessions(battles);

  // Sessions are newest-first, reverse for chronological order
  const chronological = [...sessions].reverse();

  // Calculate total delta from all sessions to find starting trophies
  const totalDelta = chronological.reduce((sum, s) => sum + s.trophyDelta, 0);
  let runningTrophies = currentTrophies - totalDelta;

  return chronological.map((session, idx) => {
    runningTrophies += session.trophyDelta;
    return {
      time: session.endTime.toISOString(),
      trophies: Math.round(runningTrophies),
      sessionIndex: idx,
      trophyDelta: session.trophyDelta,
      wins: session.wins,
      losses: session.losses,
    };
  });
}

/**
 * Filters battles by time range for trophy progression queries.
 *
 * @param battles - All battles (newest first)
 * @param range - Time range filter
 * @param now - Current time reference
 */
export function filterBattlesByRange(
  battles: any[],
  range: "today" | "week" | "season",
  now: Date = new Date(),
): any[] {
  if (!battles || battles.length === 0) return [];

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  let cutoff: Date;

  switch (range) {
    case "today":
      cutoff = todayStart;
      break;
    case "week":
      cutoff = new Date(todayStart);
      cutoff.setDate(cutoff.getDate() - 7);
      break;
    case "season":
      // CR seasons are ~35 days; use 35 as safe upper bound
      cutoff = new Date(todayStart);
      cutoff.setDate(cutoff.getDate() - 35);
      break;
    default:
      cutoff = new Date(todayStart);
      cutoff.setDate(cutoff.getDate() - 7);
  }

  return battles.filter((b: any) => {
    if (typeof b?.battleTime !== "string") return false;
    return parseBattleTime(b.battleTime) >= cutoff;
  });
}
