import { createHash } from "node:crypto";
import { parseBattleTime } from "./syncRules";

export const FREE_BATTLE_LIMIT = 10;
export const PRO_HISTORY_MAX_DAYS = 60;
export const PRO_HISTORY_DEFAULT_DAYS = 60;
export const PRO_HISTORY_MAX_LIMIT = 2000;
export const PRO_HISTORY_DEFAULT_LIMIT = 2000;

function normalizeTag(tag: string): string {
  const withoutHash = tag.trim().replace(/^#/, "").toUpperCase();
  return withoutHash ? `#${withoutHash}` : tag;
}

function normalizeCardIds(cards: unknown): number[] {
  if (!Array.isArray(cards)) return [];
  return cards
    .map((card) => (card && typeof card === "object" ? (card as any).id : null))
    .filter((id): id is number => typeof id === "number" && Number.isFinite(id))
    .slice()
    .sort((a, b) => a - b);
}

export function extractBattleTime(battleTime: unknown): Date | null {
  if (typeof battleTime !== "string" || !battleTime.trim()) return null;
  const parsed = parseBattleTime(battleTime);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function buildBattleKey({
  userId,
  playerTag,
  battle,
}: {
  userId: string;
  playerTag: string;
  battle: any;
}): string {
  const canonical = {
    u: userId,
    p: normalizeTag(playerTag),
    t: typeof battle?.battleTime === "string" ? battle.battleTime : null,
    type: typeof battle?.type === "string" ? battle.type : null,
    mode: battle?.gameMode?.id ?? battle?.gameMode?.name ?? null,
    teamTag: typeof battle?.team?.[0]?.tag === "string" ? battle.team[0].tag : null,
    oppTag: typeof battle?.opponent?.[0]?.tag === "string" ? battle.opponent[0].tag : null,
    teamCrowns: typeof battle?.team?.[0]?.crowns === "number" ? battle.team[0].crowns : null,
    oppCrowns: typeof battle?.opponent?.[0]?.crowns === "number" ? battle.opponent[0].crowns : null,
    trophyChange: typeof battle?.team?.[0]?.trophyChange === "number" ? battle.team[0].trophyChange : null,
    teamCards: normalizeCardIds(battle?.team?.[0]?.cards),
    oppCards: normalizeCardIds(battle?.opponent?.[0]?.cards),
  };

  const payload = JSON.stringify(canonical);
  return createHash("sha256").update(payload).digest("hex");
}

export function clampHistoryDays(value: unknown, fallback = PRO_HISTORY_DEFAULT_DAYS): number {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : typeof value === "number" ? value : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(PRO_HISTORY_MAX_DAYS, Math.max(1, Math.floor(parsed)));
}

export function clampHistoryLimit(value: unknown, fallback = PRO_HISTORY_DEFAULT_LIMIT): number {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : typeof value === "number" ? value : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(PRO_HISTORY_MAX_LIMIT, Math.max(1, Math.floor(parsed)));
}

