/**
 * Data retention cron handler (TD-027 + TD-052).
 *
 * Enforces retention windows per table using batched deletes to avoid
 * long-running transactions.  Tier-aware: free vs pro users get
 * different retention windows for coach_messages and push_analyses.
 *
 * Retention windows:
 *   coach_messages:         90 days (free) / 365 days (pro)
 *   deck_suggestions_usage: 30 days (all)
 *   push_analyses:          180 days (free) / 365 days (pro)
 *   notifications:          30 days (read) / 90 days (unread)
 */
import { db } from "../db";
import { sql } from "drizzle-orm";
import { logger } from "../logger";

const BATCH_SIZE = 1000;

interface RetentionResult {
  table: string;
  deleted: number;
}

/**
 * Delete rows in batches of BATCH_SIZE to avoid long-running transactions.
 * Returns total deleted count.
 *
 * SAFETY: tableName and whereClause MUST be developer-controlled literals,
 * never user input. These values are interpolated directly into SQL.
 */
async function batchDelete(tableName: string, whereClause: string): Promise<number> {
  let totalDeleted = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const result = await db.execute(sql.raw(`
      DELETE FROM "${tableName}"
      WHERE id IN (
        SELECT id FROM "${tableName}"
        WHERE ${whereClause}
        LIMIT ${BATCH_SIZE}
      )
    `));

    const deleted = (result as any)?.rowCount ?? 0;
    totalDeleted += deleted;

    if (deleted < BATCH_SIZE) break;
  }

  return totalDeleted;
}

/**
 * Run all retention policies.  Returns a summary of rows deleted per table.
 */
export async function runRetention(): Promise<RetentionResult[]> {
  const now = new Date();
  const results: RetentionResult[] = [];

  // ── coach_messages: 90d free / 365d pro ──────────────────────────────
  {
    // Free users: 90 days
    const freeCutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const freeDeleted = await batchDelete(
      "coach_messages",
      `created_at < '${freeCutoff}' AND user_id NOT IN (
        SELECT user_id FROM subscriptions WHERE plan = 'pro' AND status = 'active'
      )`,
    );

    // Pro users: 365 days
    const proCutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const proDeleted = await batchDelete(
      "coach_messages",
      `created_at < '${proCutoff}' AND user_id IN (
        SELECT user_id FROM subscriptions WHERE plan = 'pro' AND status = 'active'
      )`,
    );

    const total = freeDeleted + proDeleted;
    results.push({ table: "coach_messages", deleted: total });
    logger.info("Retention: coach_messages", { deleted: total, freeDeleted, proDeleted });
  }

  // ── deck_suggestions_usage: 30d ──────────────────────────────────────
  {
    const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const deleted = await batchDelete(
      "deck_suggestions_usage",
      `created_at < '${cutoff}'`,
    );
    results.push({ table: "deck_suggestions_usage", deleted });
    logger.info("Retention: deck_suggestions_usage", { deleted });
  }

  // ── push_analyses: 180d free / 365d pro (TD-052) ─────────────────────
  {
    const freeCutoff = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString();
    const freeDeleted = await batchDelete(
      "push_analyses",
      `created_at < '${freeCutoff}' AND user_id NOT IN (
        SELECT user_id FROM subscriptions WHERE plan = 'pro' AND status = 'active'
      )`,
    );

    const proCutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const proDeleted = await batchDelete(
      "push_analyses",
      `created_at < '${proCutoff}' AND user_id IN (
        SELECT user_id FROM subscriptions WHERE plan = 'pro' AND status = 'active'
      )`,
    );

    const total = freeDeleted + proDeleted;
    results.push({ table: "push_analyses", deleted: total });
    logger.info("Retention: push_analyses", { deleted: total, freeDeleted, proDeleted });
  }

  // ── notifications: 30d read / 90d unread ─────────────────────────────
  {
    const readCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const readDeleted = await batchDelete(
      "notifications",
      `created_at < '${readCutoff}' AND read = true`,
    );

    const unreadCutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const unreadDeleted = await batchDelete(
      "notifications",
      `created_at < '${unreadCutoff}' AND read = false`,
    );

    const total = readDeleted + unreadDeleted;
    results.push({ table: "notifications", deleted: total });
    logger.info("Retention: notifications", { deleted: total, readDeleted, unreadDeleted });
  }

  return results;
}
