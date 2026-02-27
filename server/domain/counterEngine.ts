/**
 * Counter Deck Engine (Story 2.1, AC4-AC5)
 *
 * Given a card name + arena, finds decks with the highest win rate AGAINST
 * decks containing that card. Data is sourced from real battle data.
 * Falls back to global data with a "limited data" indicator if arena-specific
 * data is insufficient.
 */
import { sql, eq, and, desc, gte } from "drizzle-orm";
import { db } from "../db";
import { arenaCounterDecks, arenaMetaDecks } from "@shared/schema";
import { logger } from "../logger";

// ── Types ────────────────────────────────────────────────────────────────────

export interface CounterDeckQueryResult {
  deckHash: string;
  cards: string[];
  winRateVsTarget: number;
  sampleSize: number;
  threeCrownRate: number;
  arenaId: number;
  limitedData: boolean;
}

export interface CounterDeckResponse {
  results: CounterDeckQueryResult[];
  limitedData: boolean;
  arenaId: number;
  targetCard: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const MIN_SAMPLE_SIZE_IDEAL = 50;
const MIN_SAMPLE_SIZE_FALLBACK = 10;
const MAX_RESULTS = 10;

// ── Engine ───────────────────────────────────────────────────────────────────

function normalizeCardKey(card: string): string {
  return card.trim().toLowerCase();
}

/**
 * Find counter decks for a specific card in a specific arena.
 * Falls back to global data (all arenas) if arena-specific data is insufficient.
 */
export async function findCounterDecks(
  targetCard: string,
  arenaId: number,
): Promise<CounterDeckResponse> {
  const cardKey = normalizeCardKey(targetCard);

  // Try arena-specific data first
  const arenaResults = await db
    .select()
    .from(arenaCounterDecks)
    .where(
      and(
        eq(arenaCounterDecks.arenaId, arenaId),
        eq(arenaCounterDecks.targetCard, cardKey),
        gte(arenaCounterDecks.sampleSize, MIN_SAMPLE_SIZE_IDEAL),
      ),
    )
    .orderBy(desc(arenaCounterDecks.winRateVsTarget))
    .limit(MAX_RESULTS);

  if (arenaResults.length >= 5) {
    return {
      results: arenaResults.map((r) => ({
        deckHash: r.deckHash,
        cards: r.cards,
        winRateVsTarget: r.winRateVsTarget,
        sampleSize: r.sampleSize,
        threeCrownRate: r.threeCrownRate,
        arenaId: r.arenaId,
        limitedData: false,
      })),
      limitedData: false,
      arenaId,
      targetCard: cardKey,
    };
  }

  // Arena-specific data insufficient — try arena-specific with lower sample threshold
  const arenaLowThreshold = await db
    .select()
    .from(arenaCounterDecks)
    .where(
      and(
        eq(arenaCounterDecks.arenaId, arenaId),
        eq(arenaCounterDecks.targetCard, cardKey),
        gte(arenaCounterDecks.sampleSize, MIN_SAMPLE_SIZE_FALLBACK),
      ),
    )
    .orderBy(desc(arenaCounterDecks.winRateVsTarget))
    .limit(MAX_RESULTS);

  if (arenaLowThreshold.length >= 3) {
    return {
      results: arenaLowThreshold.map((r) => ({
        deckHash: r.deckHash,
        cards: r.cards,
        winRateVsTarget: r.winRateVsTarget,
        sampleSize: r.sampleSize,
        threeCrownRate: r.threeCrownRate,
        arenaId: r.arenaId,
        limitedData: true,
      })),
      limitedData: true,
      arenaId,
      targetCard: cardKey,
    };
  }

  // Fall back to global data (all arenas combined)
  logger.info("Counter engine: falling back to global data", {
    targetCard: cardKey,
    arenaId,
    arenaResults: arenaResults.length,
  });

  const globalResults = await db
    .select({
      deckHash: arenaCounterDecks.deckHash,
      cards: arenaCounterDecks.cards,
      targetCard: arenaCounterDecks.targetCard,
      // Aggregate across arenas
      totalWinRate: sql<number>`avg(${arenaCounterDecks.winRateVsTarget})`.as("total_win_rate"),
      totalSample: sql<number>`sum(${arenaCounterDecks.sampleSize})::int`.as("total_sample"),
      avgThreeCrown: sql<number>`avg(${arenaCounterDecks.threeCrownRate})`.as("avg_three_crown"),
    })
    .from(arenaCounterDecks)
    .where(eq(arenaCounterDecks.targetCard, cardKey))
    .groupBy(arenaCounterDecks.deckHash, arenaCounterDecks.cards, arenaCounterDecks.targetCard)
    .having(sql`sum(${arenaCounterDecks.sampleSize}) >= ${MIN_SAMPLE_SIZE_FALLBACK}`)
    .orderBy(sql`avg(${arenaCounterDecks.winRateVsTarget}) desc`)
    .limit(MAX_RESULTS);

  return {
    results: globalResults.map((r) => ({
      deckHash: r.deckHash,
      cards: r.cards,
      winRateVsTarget: Number((r.totalWinRate ?? 0).toFixed(2)),
      sampleSize: r.totalSample ?? 0,
      threeCrownRate: Number((r.avgThreeCrown ?? 0).toFixed(2)),
      arenaId,
      limitedData: true,
    })),
    limitedData: true,
    arenaId,
    targetCard: cardKey,
  };
}
