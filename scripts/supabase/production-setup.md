# CRStats — Supabase Production Setup Guide

This guide documents the manual steps to configure Supabase for production.

## 1. Create Production Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Choose your organization
4. Project name: `crstats-production`
5. Database password: generate a strong password and save it securely
6. Region: choose closest to your users (e.g., `South America (São Paulo)` for BR users)
7. Click **Create new project**

## 2. Get Connection Strings

After the project is created:

1. Go to **Settings → Database**
2. Copy the **Transaction Pooler** URI (port `6543`) — use this as `DATABASE_URL`
3. Copy the **Direct Connection** URI (port `5432`) — use this as `DATABASE_MIGRATIONS_URL`

> **Important:** For Vercel serverless, always use the Transaction Pooler (port 6543)
> for `DATABASE_URL`. The direct connection is only for migrations.

## 3. Apply Schema (Drizzle Migrations)

Run migrations against the production database:

```bash
# Set the direct connection URL (port 5432) for migrations
export DATABASE_MIGRATIONS_URL="postgresql://postgres.[ref]:[password]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"

# Generate and apply migrations
npm run db:generate
npm run db:migrate
```

Alternatively, apply SQL files manually in the Supabase SQL Editor:
1. Run each file in `migrations/0001_database_integrity/` in order (00, 01, 02)
2. Run each file in `migrations/0002_accessibility_cleanup_polish/` in order (00, 01, 02, 03)

## 4. Apply RLS Policies & Triggers

After the schema is in place, apply security policies:

1. Go to **SQL Editor** in the Supabase Dashboard
2. Paste the entire contents of `scripts/supabase/rls-and-triggers.sql`
3. Click **Run**

This script is idempotent — it is safe to run multiple times. It will:
- Enable RLS on all 16 user-facing tables
- Create row-level policies (users can only access their own data)
- Set up the `handle_new_user()` trigger for automatic row creation on signup
- Create the `updated_at` triggers for 9 tables
- Create composite indexes for performance

### Verify RLS is Active

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

All tables should show `rowsecurity = true`.

## 5. Apply Deck Migrations (if needed)

If the `meta_decks_cache` table needs additional columns:

1. Go to **SQL Editor**
2. Paste contents of `scripts/supabase/decks-migrations.sql`
3. Click **Run**

## 6. Configure Authentication

1. Go to **Authentication → Providers**
2. Enable **Email** provider (enabled by default)
3. Go to **Authentication → URL Configuration**
4. Set **Site URL** to your production domain: `https://crstats.app` (or your Vercel URL)
5. Add **Redirect URLs**:
   - `https://crstats.app/**`
   - `https://cr-stats.vercel.app/**` (if using Vercel subdomain)
6. (Optional) Enable **Google** or **GitHub** OAuth providers

## 7. Get API Keys

1. Go to **Settings → API**
2. Copy these values for your environment variables:
   - **Project URL** → `SUPABASE_URL` and `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`
   - **service_role secret key** → `SUPABASE_SERVICE_ROLE_KEY` (never expose to client!)

## 8. Enable Connection Pooling

Connection pooling should be enabled by default on new Supabase projects.
Verify at **Settings → Database → Connection Pooling**:

- **Pool Mode:** Transaction (recommended for serverless)
- **Pool Size:** Default is fine for start

Use the **Transaction Pooler** connection string (port 6543) as your `DATABASE_URL`
in Vercel environment variables.

## 9. Set Up Database Backups

Supabase Pro plan includes daily backups. For the free tier:

1. Go to **Database → Backups**
2. Note that free tier gets daily backups retained for 7 days
3. For critical data, consider upgrading to Pro for point-in-time recovery

## Post-Setup Verification Checklist

- [ ] Schema tables exist (run `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`)
- [ ] RLS is enabled on all tables
- [ ] Signup trigger works (create a test user via Auth)
- [ ] Connection pooler URL works from Vercel
- [ ] API keys are set in Vercel environment variables
- [ ] Auth redirect URLs include production domain
