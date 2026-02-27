/**
 * Meta decks refresh cron handler (TD-028).
 *
 * Moves the meta decks cache refresh out of the user request path
 * into a scheduled cron job.  The GET /api/decks/meta endpoint now
 * reads from DB/cache only and never triggers a refresh itself.
 */
import { refreshMetaDecksCacheIfStale } from "../domain/metaDecksRefresh";
import { logger } from "../logger";

/**
 * Trigger a meta decks cache refresh.  Uses the same refresh function
 * but is invoked by the cron scheduler rather than by a user request.
 */
export async function runMetaRefresh(): Promise<void> {
  const startMs = Date.now();

  try {
    const result = await refreshMetaDecksCacheIfStale({
      ttlMs: 6 * 60 * 60 * 1000, // 6 hours
      players: 50,
      battlesPerPlayer: 10,
    });

    const durationMs = Date.now() - startMs;
    logger.info("Cron: meta decks refresh completed", { result, durationMs });
  } catch (error) {
    const durationMs = Date.now() - startMs;
    logger.error("Cron: meta decks refresh failed", {
      error: error instanceof Error ? error.message : String(error),
      durationMs,
    });
  }
}
