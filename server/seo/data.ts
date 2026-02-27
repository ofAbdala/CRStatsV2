/**
 * SEO data access layer — queries arena meta/counter data without auth context.
 * Story 2.3: SEO Dynamic Pages & Public Profiles
 *
 * Uses `db` directly (no RLS) since these pages are public and read-only.
 * Arena meta/counter tables do not have RLS policies.
 */
import { eq, desc, sql } from "drizzle-orm";
import { db } from "../db";
import { arenaMetaDecks, arenaCounterDecks } from "@shared/schema";
import { getPlayerByTag, getPlayerBattles } from "../clashRoyaleApi";
import type { MetaDeckRow, CounterDeckRow, PlayerPageInput, PlayerBattle } from "./templates";
import { logger } from "../logger";

// Re-export pure sitemap/robots functions from their own module (no DB dependency)
export { buildSitemapXml, buildRobotsTxt } from "./sitemap";

// ── In-memory cache (1 hour TTL) ──────────────────────────────────────────

type CacheEntry<T> = { data: T; expiresAt: number };
const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    if (entry) cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ── Arena Meta Decks ──────────────────────────────────────────────────────

export async function fetchArenaMetaDecks(arenaId: number): Promise<MetaDeckRow[]> {
  const cacheKey = `seo:arena-meta:${arenaId}`;
  const cached = getCached<MetaDeckRow[]>(cacheKey);
  if (cached) return cached;

  try {
    const rows = await db
      .select()
      .from(arenaMetaDecks)
      .where(eq(arenaMetaDecks.arenaId, arenaId))
      .orderBy(desc(arenaMetaDecks.winRate))
      .limit(10);

    const result: MetaDeckRow[] = rows.map((row, idx) => ({
      rank: idx + 1,
      cards: row.cards,
      winRate: row.winRate,
      usageRate: row.usageRate,
      threeCrownRate: row.threeCrownRate,
      sampleSize: row.sampleSize,
      archetype: row.archetype,
    }));

    setCache(cacheKey, result);
    return result;
  } catch (error) {
    logger.error("SEO: Error fetching arena meta decks", {
      arenaId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

// ── Counter Decks ───────────────────────────────────────────────────────────

const MIN_SAMPLE_IDEAL = 50;
const MIN_SAMPLE_FALLBACK = 10;

export async function fetchCounterDecks(cardName: string): Promise<{ decks: CounterDeckRow[]; limitedData: boolean }> {
  const cardKey = cardName.trim().toLowerCase();
  const cacheKey = `seo:counter:${cardKey}`;
  const cached = getCached<{ decks: CounterDeckRow[]; limitedData: boolean }>(cacheKey);
  if (cached) return cached;

  try {
    // Try across all arenas with good sample size first
    const idealRows = await db
      .select({
        deckHash: arenaCounterDecks.deckHash,
        cards: arenaCounterDecks.cards,
        targetCard: arenaCounterDecks.targetCard,
        totalWinRate: sql<number>`avg(${arenaCounterDecks.winRateVsTarget})`.as("total_win_rate"),
        totalSample: sql<number>`sum(${arenaCounterDecks.sampleSize})::int`.as("total_sample"),
        avgThreeCrown: sql<number>`avg(${arenaCounterDecks.threeCrownRate})`.as("avg_three_crown"),
      })
      .from(arenaCounterDecks)
      .where(eq(arenaCounterDecks.targetCard, cardKey))
      .groupBy(arenaCounterDecks.deckHash, arenaCounterDecks.cards, arenaCounterDecks.targetCard)
      .having(sql`sum(${arenaCounterDecks.sampleSize}) >= ${MIN_SAMPLE_IDEAL}`)
      .orderBy(sql`avg(${arenaCounterDecks.winRateVsTarget}) desc`)
      .limit(10);

    if (idealRows.length >= 5) {
      const decks: CounterDeckRow[] = idealRows.map((r, idx) => ({
        rank: idx + 1,
        cards: r.cards,
        winRateVsTarget: Number((r.totalWinRate ?? 0).toFixed(1)),
        sampleSize: r.totalSample ?? 0,
        threeCrownRate: Number((r.avgThreeCrown ?? 0).toFixed(1)),
      }));
      const result = { decks, limitedData: false };
      setCache(cacheKey, result);
      return result;
    }

    // Fall back to lower sample threshold
    const fallbackRows = await db
      .select({
        deckHash: arenaCounterDecks.deckHash,
        cards: arenaCounterDecks.cards,
        targetCard: arenaCounterDecks.targetCard,
        totalWinRate: sql<number>`avg(${arenaCounterDecks.winRateVsTarget})`.as("total_win_rate"),
        totalSample: sql<number>`sum(${arenaCounterDecks.sampleSize})::int`.as("total_sample"),
        avgThreeCrown: sql<number>`avg(${arenaCounterDecks.threeCrownRate})`.as("avg_three_crown"),
      })
      .from(arenaCounterDecks)
      .where(eq(arenaCounterDecks.targetCard, cardKey))
      .groupBy(arenaCounterDecks.deckHash, arenaCounterDecks.cards, arenaCounterDecks.targetCard)
      .having(sql`sum(${arenaCounterDecks.sampleSize}) >= ${MIN_SAMPLE_FALLBACK}`)
      .orderBy(sql`avg(${arenaCounterDecks.winRateVsTarget}) desc`)
      .limit(10);

    const decks: CounterDeckRow[] = fallbackRows.map((r, idx) => ({
      rank: idx + 1,
      cards: r.cards,
      winRateVsTarget: Number((r.totalWinRate ?? 0).toFixed(1)),
      sampleSize: r.totalSample ?? 0,
      threeCrownRate: Number((r.avgThreeCrown ?? 0).toFixed(1)),
    }));
    const result = { decks, limitedData: decks.length > 0 };
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    logger.error("SEO: Error fetching counter decks", {
      card: cardKey,
      error: error instanceof Error ? error.message : String(error),
    });
    return { decks: [], limitedData: true };
  }
}

// ── Player Profile ──────────────────────────────────────────────────────────

export async function fetchPlayerProfile(tag: string): Promise<PlayerPageInput | null> {
  const cacheKey = `seo:player:${tag.toUpperCase()}`;
  const cached = getCached<PlayerPageInput>(cacheKey);
  if (cached) return cached;

  try {
    const playerResult = await getPlayerByTag(tag);
    if (playerResult.error || !playerResult.data) return null;

    const player = playerResult.data as any;
    const battlesResult = await getPlayerBattles(tag);
    const rawBattles = (battlesResult.data || []) as any[];

    const recentBattles: PlayerBattle[] = rawBattles.slice(0, 10).map((b: any) => {
      const team = b.team?.[0] || {};
      const opponent = b.opponent?.[0] || {};
      const teamCrowns = team.crowns ?? 0;
      const oppCrowns = opponent.crowns ?? 0;
      const deck = (team.cards || []).map((c: any) => c.name || "Unknown").slice(0, 8);

      return {
        type: b.gameMode?.name || b.type || "Ladder",
        isWin: teamCrowns > oppCrowns,
        crowns: teamCrowns,
        opponentCrowns: oppCrowns,
        trophyChange: team.trophyChange ?? 0,
        deck,
      };
    });

    const currentDeck = (player.currentDeck || [])
      .map((c: any) => c.name || "Unknown")
      .slice(0, 8);

    const result: PlayerPageInput = {
      tag: player.tag || tag,
      name: player.name || "Unknown Player",
      trophies: player.trophies ?? 0,
      bestTrophies: player.bestTrophies ?? 0,
      level: player.expLevel ?? player.kingLevel ?? 1,
      clan: player.clan?.name || null,
      wins: player.wins ?? 0,
      losses: player.losses ?? 0,
      battleCount: player.battleCount ?? 0,
      currentDeck,
      recentBattles,
    };

    // Shorter cache for player profiles since they change more frequently
    cache.set(cacheKey, { data: result, expiresAt: Date.now() + 10 * 60 * 1000 }); // 10 min
    return result;
  } catch (error) {
    logger.error("SEO: Error fetching player profile", {
      tag,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

