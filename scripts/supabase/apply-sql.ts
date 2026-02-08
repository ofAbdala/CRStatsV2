import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;

const migrationsUrl = process.env.DATABASE_MIGRATIONS_URL || process.env.DATABASE_URL;
if (!migrationsUrl) {
  console.error("DATABASE_MIGRATIONS_URL (preferred) or DATABASE_URL must be set");
  process.exit(1);
}

async function main() {
  const sqlPath = path.resolve(process.cwd(), "scripts", "supabase", "rls-and-triggers.sql");
  const sqlText = await readFile(sqlPath, "utf-8");

  const pool = new Pool({ connectionString: migrationsUrl });
  const client = await pool.connect();

  try {
    console.log("Applying Supabase RLS + triggers SQL...");
    await client.query("begin");
    await client.query(sqlText);
    await client.query("commit");
    console.log("Done.");
  } catch (err) {
    await client.query("rollback").catch(() => undefined);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Failed to apply SQL:", err);
  process.exit(1);
});

