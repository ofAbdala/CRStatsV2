/**
 * Player sync & battle history routes
 * Endpoints: POST /api/player/sync, GET /api/player/sync-state, GET /api/history/battles
 * Story 2.4: GET /api/player/stats/cards, /stats/decks, /stats/season, /stats/matchups
 */
import { Router } from "express";
import { getUserStorage } from "../storage";
import { requireAuth } from "../supabaseAuth";
import { playerSyncRequestSchema, playerStatsQuerySchema, playerMatchupsQuerySchema } from "@shared/schema";
import { getPlayerByTag, getPlayerBattles } from "../clashRoyaleApi";
import {
  type PushSession,
  computeGoalAutoProgress,
  computePushSessions,
} from "../domain/syncRules";
import { FREE_BATTLE_LIMIT, clampHistoryDays, clampHistoryLimit } from "../domain/battleHistory";
import {
  processBattleStats,
  computeCardWinRates,
  computeDeckStats,
  computeSeasonSummary,
  computeMatchupData,
  getCurrentSeason,
  getSeasonLabel,
  type BattleStatsCacheRow,
  type CardPerformanceRow,
} from "../domain/statsEngine";
import {
  getUserId,
  sendApiError,
  parseRequestBody,
  normalizeTag,
  getCanonicalProfileTag,
  isTemporaryProviderStatus,
  logApiContext,
  getResponseRequestId,
  computeBattleStats,
  type SyncErrorItem,
} from "./utils";

const router = Router();

// POST /api/player/sync
router.post('/api/player/sync', requireAuth, async (req: any, res) => {
  const route = "/api/player/sync";
  const userId = getUserId(req);

  try {
    if (!userId) {
      return sendApiError(res, {
        route,
        userId,
        provider: "supabase-auth",
        status: 401,
        error: { code: "UNAUTHORIZED", message: "Unauthorized" },
      });
    }

    const storage = getUserStorage(req.auth!);
    const isPro = await storage.isPro(userId);
    const payload = parseRequestBody(playerSyncRequestSchema, req.body);
    if (!payload.ok) {
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 400,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid player sync payload",
          details: payload.details,
        },
      });
    }

    const profile = await storage.getProfile(userId);
    const tagToSync = getCanonicalProfileTag(profile);

    if (!tagToSync) {
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 400,
        error: {
          code: "NO_CLASH_TAG",
          message: "No Clash Royale tag linked to your profile",
        },
      });
    }

    const syncErrors: SyncErrorItem[] = [];
    let syncStatus: "ok" | "partial" | "error" = "ok";
    let battles: any[] = [];
    let pushSessions: PushSession[] = [];
    let stats = computeBattleStats([]);
    let goals: any[] = [];
    let lastSyncedAt = (await storage.getSyncState(userId))?.lastSyncedAt || null;

    const playerResult = await getPlayerByTag(tagToSync);
    if (playerResult.error || !playerResult.data) {
      syncStatus = "error";
      syncErrors.push({
        source: "player",
        code: isTemporaryProviderStatus(playerResult.status)
          ? "PLAYER_TEMPORARY_UNAVAILABLE"
          : "PLAYER_FETCH_FAILED",
        message: playerResult.error || "Failed to fetch player data",
        status: playerResult.status,
      });

      logApiContext(route, userId, "clash-royale", playerResult.status || 500, getResponseRequestId(res));

      return res.json({
        status: syncStatus,
        partial: false,
        syncedTag: tagToSync,
        player: null,
        battles,
        pushSessions,
        stats,
        goals,
        lastSyncedAt,
        errors: syncErrors,
      });
    }

    const player = playerResult.data as any;

    const battlesResult = await getPlayerBattles(tagToSync);
    if (battlesResult.error) {
      syncStatus = "partial";
      syncErrors.push({
        source: "battlelog",
        code: isTemporaryProviderStatus(battlesResult.status)
          ? "BATTLELOG_TEMPORARY_UNAVAILABLE"
          : "BATTLELOG_FETCH_FAILED",
        message: battlesResult.error,
        status: battlesResult.status,
      });
    } else {
      battles = (battlesResult.data as any[]) || [];
    }

    const canonicalPlayerTag = normalizeTag(player.tag) || player.tag || tagToSync;
    const battlesForPlan = isPro ? battles : battles.slice(0, FREE_BATTLE_LIMIT);
    battles = battlesForPlan;

    if (battlesForPlan.length > 0) {
      try {
        await storage.upsertBattleHistory(userId, canonicalPlayerTag, battlesForPlan);
        await storage.pruneBattleHistory(userId, canonicalPlayerTag, { isPro });
      } catch (historyError) {
        console.warn("Battle history persistence failed during player sync:", historyError);
        syncStatus = "partial";
        syncErrors.push({
          source: "battlelog",
          code: "BATTLE_HISTORY_PERSIST_FAILED",
          message: "Battle history could not be persisted",
        });
      }

      // Story 2.4 (AC9, AC10): Process and cache battle stats on each sync
      try {
        // Get ALL stored battles for full aggregation (not just current sync)
        const allBattles = await storage.getBattleHistory(userId, canonicalPlayerTag, { limit: 2000 });
        const rawBattles = allBattles.map((b: any) => b.battleJson ?? b);
        const { deckStats, cardStats } = processBattleStats(userId, rawBattles);

        // Clear and replace — full recalculation from all stored battles
        await storage.clearBattleStatsCache(userId);
        await storage.clearCardPerformance(userId);

        if (deckStats.length > 0) {
          await storage.upsertBattleStatsCache(
            deckStats.map((d) => ({
              userId: d.userId,
              season: d.season,
              deckHash: d.deckHash,
              battles: d.battles,
              wins: d.wins,
              threeCrowns: d.threeCrowns,
              avgElixir: d.avgElixir,
              opponentArchetypes: d.opponentArchetypes,
            })),
          );
        }

        if (cardStats.length > 0) {
          await storage.upsertCardPerformance(
            cardStats.map((c) => ({
              userId: c.userId,
              cardId: c.cardId,
              season: c.season,
              battles: c.battles,
              wins: c.wins,
            })),
          );
        }
      } catch (statsError) {
        // Non-critical — stats update failure should not break sync
        console.warn("Battle stats cache update failed during player sync:", statsError);
      }
    }

    pushSessions = computePushSessions(battles);
    stats = computeBattleStats(battles);

    // TD-033: Piggyback on existing player data to refresh favorite_players rows
    // No additional API calls — uses data already fetched above
    try {
      const clanName = typeof player.clan?.name === "string" ? player.clan.name : null;
      const playerTrophies = typeof player.trophies === "number" ? player.trophies : null;
      await storage.refreshFavoritePlayerData(userId, canonicalPlayerTag, {
        trophies: playerTrophies,
        clan: clanName,
      });
    } catch (favError) {
      // Non-critical — log and continue
      console.warn("Favorite player refresh failed during player sync:", favError);
    }

    // Canonical rule: lastSyncedAt is updated whenever player core payload is fetched successfully,
    // even when battlelog fails/returns empty, because profile-level data is still fresh.
    const syncState = await storage.updateSyncState(userId);
    lastSyncedAt = syncState.lastSyncedAt || null;

    try {
      goals = await storage.getGoals(userId);

      for (const goal of goals) {
        const progress = computeGoalAutoProgress(goal, {
          playerTrophies: player.trophies || 0,
          winRate: stats.winRate || 0,
          streak: stats.streak,
        });

        if (progress?.shouldUpdate) {
          await storage.updateGoal(goal.id, {
            currentValue: progress.currentValue,
            completed: progress.completed,
            completedAt: progress.completed ? new Date() : undefined,
          });
        }
      }

      goals = await storage.getGoals(userId);
    } catch (goalError) {
      console.warn("Goal sync failed during player sync:", goalError);
      syncStatus = "partial";
      syncErrors.push({
        source: "goals",
        code: "GOAL_SYNC_PARTIAL_FAILURE",
        message: "Goals could not be fully synchronized",
      });
    }

    const responseStatus = syncStatus;
    logApiContext(route, userId, "clash-royale", 200, getResponseRequestId(res));

    res.json({
      status: responseStatus,
      partial: responseStatus !== "ok",
      syncedTag: player.tag || tagToSync,
      player: {
        tag: player.tag,
        name: player.name,
        trophies: player.trophies,
        arena: player.arena,
        expLevel: player.expLevel,
        clan: player.clan,
        currentDeck: player.currentDeck,
        bestTrophies: player.bestTrophies,
        wins: player.wins,
        losses: player.losses,
        battleCount: player.battleCount,
        lastBattleAt: stats.lastBattleAt,
      },
      battles,
      pushSessions,
      stats,
      lastSyncedAt,
      goals,
      errors: syncErrors,
    });
  } catch (error) {
    console.error("Error syncing player data:", error);
    return sendApiError(res, {
      route,
      userId,
      provider: "internal",
      status: 500,
      error: { code: "PLAYER_SYNC_FAILED", message: "Failed to sync player data" },
    });
  }
});

// GET /api/player/sync-state
router.get('/api/player/sync-state', requireAuth, async (req: any, res) => {
  const route = "/api/player/sync-state";
  const userId = getUserId(req);

  try {
    if (!userId) {
      return sendApiError(res, {
        route,
        userId,
        provider: "supabase-auth",
        status: 401,
        error: { code: "UNAUTHORIZED", message: "Unauthorized" },
      });
    }

    const storage = getUserStorage(req.auth!);
    const syncState = await storage.getSyncState(userId);

    res.json({
      lastSyncedAt: syncState?.lastSyncedAt || null,
    });
  } catch (error) {
    console.error("Error fetching sync state:", error);
    return sendApiError(res, {
      route,
      userId,
      provider: "internal",
      status: 500,
      error: { code: "SYNC_STATE_FETCH_FAILED", message: "Failed to fetch sync state" },
    });
  }
});

// GET /api/history/battles
router.get('/api/history/battles', requireAuth, async (req: any, res) => {
  const route = "/api/history/battles";
  const userId = getUserId(req);

  try {
    if (!userId) {
      return sendApiError(res, {
        route,
        userId,
        provider: "supabase-auth",
        status: 401,
        error: { code: "UNAUTHORIZED", message: "Unauthorized" },
      });
    }

    const storage = getUserStorage(req.auth!);
    const profile = await storage.getProfile(userId);
    const playerTag = getCanonicalProfileTag(profile);

    if (!playerTag) {
      return sendApiError(res, {
        route,
        userId,
        provider: "internal",
        status: 400,
        error: { code: "NO_CLASH_TAG", message: "No Clash Royale tag linked to your profile" },
      });
    }

    const isPro = await storage.isPro(userId);
    if (!isPro) {
      const battles = await storage.getBattleHistory(userId, playerTag, { limit: FREE_BATTLE_LIMIT });
      return res.json(battles);
    }

    const days = clampHistoryDays(req.query.days);
    const limit = clampHistoryLimit(req.query.limit);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const battles = await storage.getBattleHistory(userId, playerTag, { since, limit });
    return res.json(battles);
  } catch (error) {
    console.error("Error fetching battle history:", error);
    return sendApiError(res, {
      route,
      userId,
      provider: "internal",
      status: 500,
      error: { code: "BATTLE_HISTORY_FETCH_FAILED", message: "Failed to fetch battle history" },
    });
  }
});

// ── Story 2.4: Advanced Stats Endpoints ──────────────────────────────────────

// GET /api/player/stats/cards — Card win rates (AC3)
router.get('/api/player/stats/cards', requireAuth, async (req: any, res) => {
  const route = "/api/player/stats/cards";
  const userId = getUserId(req);

  try {
    if (!userId) {
      return sendApiError(res, {
        route, userId, provider: "supabase-auth", status: 401,
        error: { code: "UNAUTHORIZED", message: "Unauthorized" },
      });
    }

    const parsed = playerStatsQuerySchema.safeParse(req.query);
    const season = parsed.success ? parsed.data.season : undefined;

    const storage = getUserStorage(req.auth!);
    const cardStats = await storage.getCardPerformance(userId, { season });

    // Convert DB rows to the format expected by computeCardWinRates
    const rows: CardPerformanceRow[] = cardStats.map((r) => ({
      userId: r.userId,
      cardId: r.cardId,
      season: r.season ?? 0,
      battles: r.battles,
      wins: r.wins,
    }));

    const winRates = computeCardWinRates(rows, { minBattles: 10, season });

    res.json({
      season: season ?? null,
      currentSeason: getCurrentSeason(),
      cards: winRates,
    });
  } catch (error) {
    console.error("Error fetching card stats:", error);
    return sendApiError(res, {
      route, userId, provider: "internal", status: 500,
      error: { code: "CARD_STATS_FETCH_FAILED", message: "Failed to fetch card stats" },
    });
  }
});

// GET /api/player/stats/decks — Deck stats with 3-crown rate (AC1, AC2)
router.get('/api/player/stats/decks', requireAuth, async (req: any, res) => {
  const route = "/api/player/stats/decks";
  const userId = getUserId(req);

  try {
    if (!userId) {
      return sendApiError(res, {
        route, userId, provider: "supabase-auth", status: 401,
        error: { code: "UNAUTHORIZED", message: "Unauthorized" },
      });
    }

    const parsed = playerStatsQuerySchema.safeParse(req.query);
    const season = parsed.success ? parsed.data.season : undefined;

    const storage = getUserStorage(req.auth!);
    const deckStats = await storage.getBattleStatsCache(userId, { season });

    // Convert DB rows to the format expected by computeDeckStats
    const rows: BattleStatsCacheRow[] = deckStats.map((r) => ({
      userId: r.userId,
      season: r.season ?? 0,
      deckHash: r.deckHash ?? "",
      battles: r.battles,
      wins: r.wins,
      threeCrowns: r.threeCrowns,
      avgElixir: r.avgElixir,
      opponentArchetypes: (r.opponentArchetypes as Record<string, { battles: number; wins: number }>) ?? {},
    }));

    const decks = computeDeckStats(rows, { season });

    res.json({
      season: season ?? null,
      currentSeason: getCurrentSeason(),
      decks,
    });
  } catch (error) {
    console.error("Error fetching deck stats:", error);
    return sendApiError(res, {
      route, userId, provider: "internal", status: 500,
      error: { code: "DECK_STATS_FETCH_FAILED", message: "Failed to fetch deck stats" },
    });
  }
});

// GET /api/player/stats/season — Season summary (AC7, AC8)
router.get('/api/player/stats/season', requireAuth, async (req: any, res) => {
  const route = "/api/player/stats/season";
  const userId = getUserId(req);

  try {
    if (!userId) {
      return sendApiError(res, {
        route, userId, provider: "supabase-auth", status: 401,
        error: { code: "UNAUTHORIZED", message: "Unauthorized" },
      });
    }

    const parsed = playerStatsQuerySchema.safeParse(req.query);
    const season = parsed.success && parsed.data.season ? parsed.data.season : getCurrentSeason();

    const storage = getUserStorage(req.auth!);

    const [deckStats, cardStats] = await Promise.all([
      storage.getBattleStatsCache(userId, { season }),
      storage.getCardPerformance(userId, { season }),
    ]);

    const deckRows: BattleStatsCacheRow[] = deckStats.map((r) => ({
      userId: r.userId,
      season: r.season ?? 0,
      deckHash: r.deckHash ?? "",
      battles: r.battles,
      wins: r.wins,
      threeCrowns: r.threeCrowns,
      avgElixir: r.avgElixir,
      opponentArchetypes: (r.opponentArchetypes as Record<string, { battles: number; wins: number }>) ?? {},
    }));

    const cardRows: CardPerformanceRow[] = cardStats.map((r) => ({
      userId: r.userId,
      cardId: r.cardId,
      season: r.season ?? 0,
      battles: r.battles,
      wins: r.wins,
    }));

    const summary = computeSeasonSummary(season, deckRows, cardRows);

    // List available seasons for the selector
    const allDeckStats = await storage.getBattleStatsCache(userId);
    const seasonSet = new Set(allDeckStats.map((d) => d.season).filter((s): s is number => s != null));
    const seasons = Array.from(seasonSet).sort((a, b) => b - a);

    res.json({
      ...summary,
      seasonLabel: getSeasonLabel(season),
      availableSeasons: seasons.map((s) => ({ season: s, label: getSeasonLabel(s) })),
    });
  } catch (error) {
    console.error("Error fetching season summary:", error);
    return sendApiError(res, {
      route, userId, provider: "internal", status: 500,
      error: { code: "SEASON_STATS_FETCH_FAILED", message: "Failed to fetch season stats" },
    });
  }
});

// GET /api/player/stats/matchups — Matchup data for a deck (AC5, AC6)
router.get('/api/player/stats/matchups', requireAuth, async (req: any, res) => {
  const route = "/api/player/stats/matchups";
  const userId = getUserId(req);

  try {
    if (!userId) {
      return sendApiError(res, {
        route, userId, provider: "supabase-auth", status: 401,
        error: { code: "UNAUTHORIZED", message: "Unauthorized" },
      });
    }

    const parsed = playerMatchupsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return sendApiError(res, {
        route, userId, provider: "internal", status: 400,
        error: { code: "VALIDATION_ERROR", message: "deck query parameter is required" },
      });
    }

    const deckHash = parsed.data.deck;
    const storage = getUserStorage(req.auth!);
    const deckStats = await storage.getBattleStatsCache(userId);

    const rows: BattleStatsCacheRow[] = deckStats.map((r) => ({
      userId: r.userId,
      season: r.season ?? 0,
      deckHash: r.deckHash ?? "",
      battles: r.battles,
      wins: r.wins,
      threeCrowns: r.threeCrowns,
      avgElixir: r.avgElixir,
      opponentArchetypes: (r.opponentArchetypes as Record<string, { battles: number; wins: number }>) ?? {},
    }));

    const matchups = computeMatchupData(rows, deckHash);

    res.json({
      deckHash,
      matchups,
    });
  } catch (error) {
    console.error("Error fetching matchup data:", error);
    return sendApiError(res, {
      route, userId, provider: "internal", status: 500,
      error: { code: "MATCHUP_STATS_FETCH_FAILED", message: "Failed to fetch matchup data" },
    });
  }
});

export default router;
