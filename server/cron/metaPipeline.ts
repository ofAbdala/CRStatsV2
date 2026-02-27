/**
 * Arena meta pipeline cron handler (Story 2.1).
 *
 * Runs the arena-personalized meta deck pipeline and stores results
 * in arena_meta_decks and arena_counter_decks tables.
 */
import { runMetaPipeline as runPipeline } from "../domain/metaPipeline";
import { serviceStorage } from "../storage";
import type { InsertArenaMetaDeck, InsertArenaCounterDeck } from "@shared/schema";
import { logger } from "../logger";

export interface MetaPipelineCronResult {
  metaDecksStored: number;
  counterDecksStored: number;
  stats: {
    playersProcessed: number;
    battlesProcessed: number;
    arenasWithData: number;
    duration: number;
  };
}

/**
 * Run the meta pipeline and store results in the database.
 */
export async function runMetaPipeline(): Promise<MetaPipelineCronResult> {
  const startMs = Date.now();

  try {
    const result = await runPipeline({
      players: 200,
      battlesPerPlayer: 25,
    });

    const now = new Date();

    // Convert pipeline results to database rows
    const metaDeckRows: InsertArenaMetaDeck[] = result.metaDecks.map((deck) => ({
      arenaId: deck.arenaId,
      deckHash: deck.deckHash,
      cards: deck.cards,
      winRate: deck.winRate,
      usageRate: deck.usageRate,
      threeCrownRate: deck.threeCrownRate,
      avgElixir: deck.avgElixir,
      sampleSize: deck.sampleSize,
      archetype: deck.archetype,
      snapshotDate: now,
    }));

    const counterDeckRows: InsertArenaCounterDeck[] = result.counterDecks.map((deck) => ({
      arenaId: deck.arenaId,
      targetCard: deck.targetCard,
      deckHash: deck.deckHash,
      cards: deck.cards,
      winRateVsTarget: deck.winRateVsTarget,
      sampleSize: deck.sampleSize,
      threeCrownRate: deck.threeCrownRate,
      snapshotDate: now,
    }));

    // Store in database (replaces old data atomically)
    await serviceStorage.replaceAllArenaData(metaDeckRows, counterDeckRows);

    const durationMs = Date.now() - startMs;
    logger.info("Meta pipeline cron: data stored successfully", {
      metaDecks: metaDeckRows.length,
      counterDecks: counterDeckRows.length,
      durationMs,
    });

    return {
      metaDecksStored: metaDeckRows.length,
      counterDecksStored: counterDeckRows.length,
      stats: result.stats,
    };
  } catch (error) {
    const durationMs = Date.now() - startMs;
    logger.error("Meta pipeline cron: failed", {
      error: error instanceof Error ? error.message : String(error),
      durationMs,
    });
    throw error;
  }
}
