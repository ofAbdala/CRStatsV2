/**
 * Cron handler entry point for Vercel Cron Jobs.
 *
 * Each cron endpoint validates the CRON_SECRET to prevent unauthorized access,
 * then dispatches to the appropriate handler.
 */
import { Router } from "express";
import { runRetention } from "./retention";
import { runMetaRefresh } from "./metaRefresh";
import { runMetaPipeline } from "./metaPipeline";
import { logger } from "../logger";

const router = Router();

/**
 * Verify the cron request is authentic.
 * In production Vercel sends Authorization: Bearer <CRON_SECRET>.
 * In development, skip the check if CRON_SECRET is not set.
 */
function verifyCronAuth(req: any, res: any): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    if (process.env.NODE_ENV === "production") {
      logger.warn("CRON_SECRET not configured in production — rejecting cron request");
      res.status(401).json({ code: "UNAUTHORIZED", message: "CRON_SECRET not configured" });
      return false;
    }
    return true;
  }

  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${cronSecret}`) {
    res.status(401).json({ code: "UNAUTHORIZED", message: "Invalid cron secret" });
    return false;
  }

  return true;
}

// GET /api/cron/retention — daily data retention cleanup (Vercel Cron sends GET)
router.get("/api/cron/retention", async (req, res) => {
  if (!verifyCronAuth(req, res)) return;

  const startMs = Date.now();
  try {
    logger.info("Cron: retention job started");
    const results = await runRetention();
    const durationMs = Date.now() - startMs;

    logger.info("Cron: retention job completed", { durationMs, results });
    return res.json({ ok: true, durationMs, results });
  } catch (error) {
    const durationMs = Date.now() - startMs;
    logger.error("Cron: retention job failed", {
      error: error instanceof Error ? error.message : String(error),
      durationMs,
    });
    return res.status(500).json({
      ok: false,
      error: "Retention job failed",
      durationMs,
    });
  }
});

// GET /api/cron/meta-refresh — meta decks cache refresh (every 6 hours, Vercel Cron sends GET)
router.get("/api/cron/meta-refresh", async (req, res) => {
  if (!verifyCronAuth(req, res)) return;

  const startMs = Date.now();
  try {
    logger.info("Cron: meta refresh job started");
    await runMetaRefresh();
    const durationMs = Date.now() - startMs;

    logger.info("Cron: meta refresh job completed", { durationMs });
    return res.json({ ok: true, durationMs });
  } catch (error) {
    const durationMs = Date.now() - startMs;
    logger.error("Cron: meta refresh job failed", {
      error: error instanceof Error ? error.message : String(error),
      durationMs,
    });
    return res.status(500).json({
      ok: false,
      error: "Meta refresh job failed",
      durationMs,
    });
  }
});

// GET /api/cron/meta-pipeline — arena-personalized meta deck pipeline (Story 2.1, daily at 04:00 UTC)
router.get("/api/cron/meta-pipeline", async (req, res) => {
  if (!verifyCronAuth(req, res)) return;

  const startMs = Date.now();
  try {
    logger.info("Cron: meta pipeline job started");
    const result = await runMetaPipeline();
    const durationMs = Date.now() - startMs;

    logger.info("Cron: meta pipeline job completed", { durationMs, ...result.stats });
    return res.json({ ok: true, durationMs, stats: result.stats });
  } catch (error) {
    const durationMs = Date.now() - startMs;
    logger.error("Cron: meta pipeline job failed", {
      error: error instanceof Error ? error.message : String(error),
      durationMs,
    });
    return res.status(500).json({
      ok: false,
      error: "Meta pipeline job failed",
      durationMs,
    });
  }
});

export default router;
