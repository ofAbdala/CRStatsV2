import { defineConfig } from "drizzle-kit";

const migrationsUrl = process.env.DATABASE_MIGRATIONS_URL || process.env.DATABASE_URL;

if (!migrationsUrl) {
  throw new Error("DATABASE_MIGRATIONS_URL (preferred) or DATABASE_URL must be set");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: migrationsUrl,
  },
});
