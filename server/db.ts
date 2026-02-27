import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const isServerless = process.env.VERCEL === "1";

/**
 * Connection pool configured for the runtime environment:
 * - Serverless (Vercel): minimal pool (max 2), aggressive timeouts to avoid
 *   exhausting Supabase's connection limit across concurrent invocations.
 *   Use the Supabase Transaction Pooler URL (port 6543) in production.
 * - Long-running server (dev): slightly larger pool with relaxed timeouts.
 */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: isServerless ? 2 : 5,
  connectionTimeoutMillis: isServerless ? 3000 : 5000,
  idleTimeoutMillis: isServerless ? 5000 : 30000,
  // In serverless, allow connections to be reused across invocations within
  // the same container, but prevent stale connections from lingering.
  allowExitOnIdle: isServerless,
});

export const db = drizzle(pool, { schema });
