# Database Migrations

CRStats uses a **dual-track** migration strategy.

## Track 1: Drizzle ORM (tables, columns, indexes, constraints)

All schema changes managed by Drizzle live in `shared/schema.ts`. Migrations
are generated and applied via the following workflow:

```bash
# 1. Edit shared/schema.ts
# 2. Generate a versioned migration
npm run db:generate

# 3. Review the generated SQL in migrations/
# 4. Apply the migration against the database
npm run db:migrate
```

**Connection strings:**

| Variable                 | Purpose                              |
| ------------------------ | ------------------------------------ |
| `DATABASE_MIGRATIONS_URL`| Direct (non-pooled) connection for migrations |
| `DATABASE_URL`           | Pooled connection (PgBouncer) for the app     |

Drizzle Kit always uses `DATABASE_MIGRATIONS_URL` (falling back to
`DATABASE_URL`) so that migrations bypass the connection pooler, which does
not support the transactional DDL required by `ALTER TABLE` and friends.

## Track 2: SQL Scripts (RLS, triggers, grants, Supabase-specific)

Supabase-specific objects that Drizzle cannot manage are maintained as
hand-written SQL files under `scripts/supabase/`. Apply them with:

```bash
npm run supabase:apply
```

These scripts are also version-controlled and should be reviewed in PRs just
like Drizzle migrations.

## Important Notes

- **Never use `drizzle-kit push` in production.** It applies schema changes
  without generating a migration file, making rollbacks impossible.
- The `db:push` script has been removed from `package.json` to prevent
  accidental usage.
- Always generate a migration (`db:generate`) and apply it (`db:migrate`)
  so there is a complete, auditable history of schema changes.
