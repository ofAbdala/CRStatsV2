/**
 * Shared route utilities — helper functions, types, and constants
 * used across multiple route modules.
 */
import { type Response } from "express";
import { z } from "zod";
import type { IStorage } from "../storage";
import { computeTiltState } from "../domain/syncRules";

// ── Constants ──────────────────────────────────────────────────────────────────

export { FREE_DAILY_LIMIT, FREE_DECK_SUGGESTION_DAILY_LIMIT } from "../../shared/constants/limits";

// ── Types ──────────────────────────────────────────────────────────────────────

export type ApiProvider = "internal" | "supabase-auth" | "clash-royale" | "stripe" | "openai";

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

export interface SyncErrorItem {
  source: "profile" | "player" | "battlelog" | "goals";
  code: string;
  message: string;
  status?: number;
}

export type NotificationCategory = "training" | "billing" | "system";

// ── Helpers ────────────────────────────────────────────────────────────────────

export function getUserId(req: any): string | null {
  return req?.auth?.userId ?? null;
}

export function logApiContext(
  route: string,
  userId: string | null,
  provider: ApiProvider,
  status: number,
  requestId?: string,
) {
  console.info(
    JSON.stringify({
      route,
      userId: userId ?? "anonymous",
      provider,
      status,
      requestId,
      at: new Date().toISOString(),
    }),
  );
}

export function getResponseRequestId(res: Response): string | undefined {
  const headerValue = res.getHeader("x-request-id");
  if (typeof headerValue === "string") return headerValue;
  if (Array.isArray(headerValue) && typeof headerValue[0] === "string") return headerValue[0];
  return undefined;
}

export function sendApiError(
  res: Response,
  {
    route,
    userId,
    provider,
    status,
    error,
  }: {
    route: string;
    userId: string | null;
    provider: ApiProvider;
    status: number;
    error: ApiErrorPayload;
  },
) {
  const requestId = getResponseRequestId(res);
  logApiContext(route, userId, provider, status, requestId);
  return res.status(status).json({
    ...error,
    requestId,
  });
}

export function parseRequestBody<T>(schema: z.ZodType<T>, payload: unknown) {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false as const,
      details: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      })),
    };
  }

  return { ok: true as const, data: parsed.data };
}

export function normalizeTag(tag: string | null | undefined): string | null | undefined {
  if (tag === undefined) return undefined;
  if (tag === null) return null;
  const withoutHash = tag.trim().replace(/^#/, "").toUpperCase();
  return withoutHash ? `#${withoutHash}` : null;
}

export function getCanonicalProfileTag(profile: { defaultPlayerTag?: string | null; clashTag?: string | null } | null | undefined) {
  return profile?.defaultPlayerTag || profile?.clashTag || null;
}

export function isTemporaryProviderStatus(status: number) {
  return status === 429 || status >= 500;
}

export function getClashErrorCode(status: number) {
  if (status === 404) return "CLASH_RESOURCE_NOT_FOUND";
  if (status === 429) return "CLASH_RATE_LIMIT";
  if (status >= 500) return "CLASH_PROVIDER_UNAVAILABLE";
  return "CLASH_PROVIDER_ERROR";
}

// ── Notification helpers ───────────────────────────────────────────────────────

export async function isNotificationAllowed(storage: IStorage, userId: string, category: NotificationCategory) {
  const prefs = await storage.getNotificationPreferences(userId);
  if (!prefs) {
    // No preferences row exists yet -- allow by default
    return true;
  }

  return prefs[category] ?? true;
}

export async function createNotificationIfAllowed(
  storage: IStorage,
  userId: string,
  category: NotificationCategory,
  payload: {
    title: string;
    description?: string | null;
    type: string;
  },
) {
  if (!(await isNotificationAllowed(storage, userId, category))) {
    return null;
  }

  return storage.createNotification({
    userId,
    title: payload.title,
    description: payload.description ?? null,
    type: payload.type,
    read: false,
  });
}

// ── Battle stats helpers ───────────────────────────────────────────────────────

export function getBattleModeName(battle: any): string {
  return battle?.gameMode?.name || battle?.type || "Ladder";
}

export function buildPushModeBreakdown(battles: any[]) {
  const byMode = new Map<string, { mode: string; matches: number; wins: number; losses: number; netTrophies: number }>();

  for (const battle of battles) {
    const mode = getBattleModeName(battle);
    const isWin = (battle?.team?.[0]?.crowns || 0) > (battle?.opponent?.[0]?.crowns || 0);
    const isLoss = (battle?.team?.[0]?.crowns || 0) < (battle?.opponent?.[0]?.crowns || 0);
    const trophyChange = battle?.team?.[0]?.trophyChange || 0;

    const current = byMode.get(mode) || { mode, matches: 0, wins: 0, losses: 0, netTrophies: 0 };
    current.matches += 1;
    if (isWin) current.wins += 1;
    if (isLoss) current.losses += 1;
    current.netTrophies += trophyChange;
    byMode.set(mode, current);
  }

  return Array.from(byMode.values()).sort((a, b) => b.matches - a.matches);
}

export function computeBattleStats(battles: any[]) {
  const tilt = computeTiltState(battles);
  const lastBattleAt = tilt.lastBattleAt ? tilt.lastBattleAt.toISOString() : null;

  if (!battles || battles.length === 0) {
    return {
      totalMatches: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      streak: { type: 'none' as const, count: 0 },
      tiltLevel: tilt.level,
      tiltRisk: tilt.risk,
      tiltAlert: tilt.alert,
      lastBattleAt,
    };
  }

  let wins = 0;
  let losses = 0;

  for (let i = 0; i < battles.length; i++) {
    const battle = battles[i];
    const isVictory = battle.team?.[0]?.crowns > battle.opponent?.[0]?.crowns;

    if (isVictory) {
      wins++;
    } else {
      losses++;
    }
  }

  let currentStreak = 0;
  let currentType: 'win' | 'loss' | 'none' = 'none';
  for (const battle of battles) {
    const isVictory = battle.team?.[0]?.crowns > battle.opponent?.[0]?.crowns;
    const battleType = isVictory ? 'win' : 'loss';

    if (currentType === 'none') {
      currentType = battleType;
      currentStreak = 1;
    } else if (currentType === battleType) {
      currentStreak++;
    } else {
      break;
    }
  }

  return {
    totalMatches: battles.length,
    wins,
    losses,
    winRate: battles.length > 0 ? (wins / battles.length) * 100 : 0,
    streak: { type: currentType, count: currentStreak },
    tiltLevel: tilt.level,
    tiltRisk: tilt.risk,
    tiltAlert: tilt.alert,
    lastBattleAt,
  };
}

// ── Stripe helpers ─────────────────────────────────────────────────────────────

export function getStripeSubscriptionPeriodEnd(subscription: any): Date | null {
  const itemPeriodEnd = subscription?.items?.data?.[0]?.current_period_end;
  if (typeof itemPeriodEnd === "number") {
    return new Date(itemPeriodEnd * 1000);
  }

  return null;
}
