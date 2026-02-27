/**
 * Health check endpoint (TD-058).
 *
 * Returns app status, version, database connectivity, and uptime.
 * Does NOT require authentication — used by monitoring services.
 */
import { Router } from "express";
import { pool } from "../db";
import { logger } from "../logger";

const router = Router();

router.get("/api/health", async (_req, res) => {
  let dbHealthy = false;

  try {
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
      dbHealthy = true;
    } finally {
      client.release();
    }
  } catch (err) {
    logger.warn("Health check: database connectivity failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const status = dbHealthy ? "healthy" : "degraded";

  res.status(dbHealthy ? 200 : 503).json({
    status,
    version: process.env.npm_package_version || "1.0.0",
    uptime: Math.floor(process.uptime()),
    database: dbHealthy ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

export default router;
