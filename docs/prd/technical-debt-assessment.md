# CRStats -- Technical Debt Assessment (FINAL)

**Phase:** Brownfield Discovery -- Phase 8 (Final Consolidation)
**Agent:** @architect (Aria)
**Date:** 2026-02-27
**Status:** FINAL -- Incorporates Phase 5 (DB Specialist), Phase 6 (UX Specialist), and Phase 7 (QA Gate) reviews
**Supersedes:** `docs/prd/technical-debt-DRAFT.md` (Phase 4)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Debt Inventory (Master List)](#2-debt-inventory-master-list)
3. [Cross-Cutting Concerns](#3-cross-cutting-concerns)
4. [Risk Matrix](#4-risk-matrix)
5. [Remediation Roadmap (FINAL)](#5-remediation-roadmap-final)
6. [Metrics & Health Scores](#6-metrics--health-scores)
7. [Change Log (DRAFT to FINAL)](#7-change-log-draft-to-final)
8. [Appendix](#8-appendix)

---

## 1. Executive Summary

### Project Health Score: 5.0 / 10

CRStats is a Clash Royale player analytics and coaching SaaS in early-production stage. Core flows (auth, player sync, billing, dashboard) are functional with real data and real API integrations. However, the project accumulates significant structural debt across architecture (god-files), frontend (decomposition, i18n), database (missing constraints, data duplication), testing (near-zero coverage), security (missing rate limiting, CORS, XSS protection), and operational gaps (no structured logging, no health check).

This assessment consolidates findings from three independent source analyses (system architecture, database audit, frontend spec) and incorporates corrections from domain specialist reviews (database, UX) and a QA Gate validation. It is the definitive source of truth for all technical debt in CRStats.

### Debt Distribution by Severity

| Severity | Count | Estimated Total Effort |
|----------|------:|----------------------:|
| CRITICAL | 11 | ~18-28 days |
| HIGH | 12 | ~14-22 days |
| MEDIUM | 20 | ~16-26 days |
| LOW | 19 | ~8-14 days |
| **TOTAL** | **62** | **~56-90 days** |

### Estimated Effort Summary

- **Quick wins (< 2h each):** 24 items
- **Half-day to full-day (2-8h):** 18 items
- **Multi-day (1-3 days):** 14 items
- **Major (3+ days):** 6 items

### Top 5 Most Impactful Issues

| Rank | ID | Title | Why It Matters |
|:----:|------|-------|---------------|
| 1 | TD-001 | `routes.ts` god-file (3,874 lines) | Blocks testability, causes merge conflicts, couples HTTP to business logic. Every other backend improvement depends on splitting this file. |
| 2 | TD-005 | No rate limiting on any endpoint | At scale: API cost amplification via OpenAI abuse, Clash Royale API quota exhaustion. Public and AI endpoints are unprotected. |
| 3 | TD-012 | Notification settings duplication | Active data consistency hazard. Dual-table fallback chain with `settingsUpdateInputSchema` accepting conflicting values creates unpredictable notification behavior. Gets worse with every new user. |
| 4 | TD-009 | `auth.tsx` fully hardcoded in Portuguese | The auth page is the absolute first-touch surface for 100% of new users. 18 hardcoded Portuguese strings make the entry point unusable for international audiences. |
| 5 | TD-004 + TD-034 | `/push` route unreachable + 404 page unreadable | A core feature is inaccessible via navigation. Users who click Push see a 404 page with invisible text (`text-gray-900` on dark background). |

---

## 2. Debt Inventory (Master List)

### CRITICAL Items (11)

---

#### TD-001: `routes.ts` God-File (3,874 Lines)

- **Severity:** CRITICAL
- **Category:** Architecture
- **Source:** Phase 1 (system-architecture.md, W-01, W-02), State Report
- **Description:** All 46 API endpoints are defined in a single `registerRoutes()` function in `server/routes.ts`. Route handlers directly orchestrate storage calls, external API calls, domain logic, and response formatting. There is no service layer separating HTTP concerns from business logic.
- **Impact:** Impossible to write integration tests for individual route groups. Guaranteed merge conflicts with concurrent development. No route-level middleware composition. Extremely difficult to navigate or reason about side effects.
- **Affected Files:** `server/routes.ts` (3,874 lines)
- **Remediation:** Split into route modules: `routes/auth.ts`, `routes/player.ts`, `routes/coach.ts`, `routes/training.ts`, `routes/decks.ts`, `routes/billing.ts`, `routes/community.ts`, `routes/notifications.ts`, `routes/settings.ts`, `routes/public.ts`. Extract a thin service layer for orchestration logic that calls domain modules and storage.
- **Effort:** XL (3+ days)
- **Dependencies:** None -- foundational improvement that unblocks TD-007 (API integration tests).

---

#### TD-002: `decks.tsx` God-File (1,397 Lines)

- **Severity:** CRITICAL
- **Category:** Frontend
- **Source:** Phase 3 (frontend-spec.md, C2), State Report
- **Description:** Single file contains the Meta Decks tab, Counter-Deck Builder, and Deck Optimizer with complex inline state management. All UI, state logic, and data transformations are co-located.
- **Impact:** Unmaintainable, slow IDE performance, impossible to test individual deck features in isolation.
- **Affected Files:** `client/src/pages/decks.tsx` (1,397 lines)
- **Remediation:** Extract `MetaDecksTab.tsx`, `CounterDeckBuilder.tsx`, `DeckOptimizer.tsx`, and shared `DeckDisplay.tsx` component. Aim for < 300 lines per file. Per UX specialist: the three tabs are already conceptually separated by tab switching logic, making decomposition straightforward.
- **Effort:** L (1-3 days)
- **Dependencies:** None.

---

#### TD-003: `me.tsx` God-File (1,931 Lines)

- **Severity:** CRITICAL
- **Category:** Frontend
- **Source:** Phase 3 (frontend-spec.md, C1), State Report
- **Description:** Single file contains Overview, Battles, Cards, Goals tabs, multiple charts (AreaChart, LineChart, BarChart), tilt analysis, trophy graph, and 27+ hardcoded Portuguese strings bypassing i18n.
- **Impact:** Unmaintainable, slow IDE, impossible to test in isolation, i18n broken for English users on the most data-rich page.
- **Affected Files:** `client/src/pages/me.tsx` (1,931 lines)
- **Remediation:** Decompose into `MeOverviewTab.tsx`, `MeBattlesTab.tsx`, `MeCardsTab.tsx`, `MeGoalsTab.tsx`, `TiltAnalysis.tsx`, `TrophyChart.tsx`. Migrate all hardcoded strings to `t()` calls. Per UX specialist: consolidate duplicated push session logic with `shared/domain/` or `server/domain/syncRules.ts`.
- **Effort:** XL (3+ days)
- **Dependencies:** TD-010 (i18n -- me.tsx hardcoded strings) should be done simultaneously.

---

#### TD-004: `/push` Route is Unreachable (404)

- **Severity:** CRITICAL
- **Category:** Frontend
- **Source:** Phase 3 (frontend-spec.md, C3)
- **Description:** The Sidebar navigation links to `/push`, but `App.tsx` has no `<Route path="/push">` definition. Users who click "Push" in the sidebar see the 404 page (which itself is unreadable -- see TD-034).
- **Impact:** A core feature (Push Analysis) is completely inaccessible via navigation. The page component (`push.tsx`) exists but is never rendered.
- **Affected Files:** `client/src/App.tsx`
- **Remediation:** Add `<Route path="/push" component={PushPage} />` to the authenticated route block in `App.tsx`. Add `ErrorBoundary` wrapper consistent with other pages.
- **Effort:** S (< 2h)
- **Dependencies:** None.

---

#### TD-005: No Rate Limiting on Any Endpoint

- **Severity:** CRITICAL
- **Category:** Security
- **Source:** Phase 1 (system-architecture.md, W-03, Security Assessment)
- **Description:** No Express rate limiting middleware is configured despite `express-rate-limit` being in the build allowlist. Public endpoints (`/api/clash/*`, `/api/community/*`) and AI endpoints (`/api/coach/chat`, `/api/decks/builder/counter`) are fully unprotected. The app relies solely on Vercel's platform-level limits.
- **Impact:** Public proxy routes can be abused to exhaust the Clash Royale API quota. AI endpoints can be exploited for OpenAI cost amplification. Potential for denial-of-service.
- **Affected Files:** `server/app.ts`, `server/routes.ts`
- **Remediation:** Phase 1: Add global rate limit (`app.use(rateLimit({ windowMs: 60000, max: 100 }))`). Phase 2 (after TD-001 route split): Add per-route limits -- stricter for AI endpoints (10 req/min per user), stricter for public proxy routes (30 req/min per IP).
- **Effort:** M (2-8h) -- split across Phase 1 (global, S) and Phase 2 (per-route, M)
- **Dependencies:** Per-route limiting benefits from TD-001 (splitting routes), but global limiting can be added immediately.

---

#### TD-006: No CORS Configuration

- **Severity:** CRITICAL
- **Category:** Security
- **Source:** Phase 1 (system-architecture.md, W-04, Security Assessment)
- **Description:** No CORS headers are set in the Express server. The app relies entirely on Vercel's default same-origin behavior. This is fragile if the API is ever consumed from another domain, and provides no defense against cross-origin attacks in misconfigured environments.
- **Impact:** If the deployment domain changes or an attacker embeds the API in a malicious page, there is no origin restriction.
- **Affected Files:** `server/app.ts`
- **Remediation:** Add `cors` middleware with explicit `origin` set to the production domain (e.g., `https://crstats.app`). Allow `credentials: true` for auth cookies/headers.
- **Effort:** S (< 2h)
- **Dependencies:** None.

---

#### TD-007: Zero API Route Integration Tests

- **Severity:** CRITICAL
- **Category:** Testing
- **Source:** Phase 1 (system-architecture.md, W-11), State Report
- **Description:** `server/routes.ts` (3,874 lines, 46 endpoints) has zero integration tests. Only domain modules (`syncRules`, `battleHistory`, `stripeCheckout`) have unit tests (23 tests total). Stripe webhook handler, player sync, coach chat, and all CRUD endpoints are untested.
- **Impact:** Any change to API behavior can introduce regressions undetected. Webhook bugs can cause billing state corruption. Sync failures can silently lose battle data.
- **Affected Files:** No test file exists for routes.
- **Remediation:** After TD-001 (route splitting), add integration tests using `supertest` for each route module. Priority: (1) Stripe webhook handler, (2) player sync endpoint, (3) coach chat with free limit enforcement, (4) CRUD endpoints.
- **Effort:** XL (3+ days)
- **Dependencies:** TD-001 (split routes) should come first to enable isolated route testing.

---

#### TD-008: Zero Frontend Test Coverage

- **Severity:** CRITICAL
- **Category:** Testing
- **Source:** Phase 3 (frontend-spec.md, data-testid mention), State Report
- **Description:** 18 pages, 11 hooks, 14 custom components -- all without any frontend tests (unit, integration, or E2E). The presence of `data-testid` attributes on interactive elements indicates test awareness but no follow-through.
- **Impact:** Any UI change can break critical flows (auth, billing, sync, coach) without detection. The freemium gating, i18n switching, and routing logic are all exercised only manually.
- **Affected Files:** Entire `client/src/` directory.
- **Remediation:** (1) Add E2E tests (Playwright) for critical flows: auth, player sync, billing checkout, coach conversation. (2) Add hook tests (React Testing Library) for `useAuth`, `usePlayerSync`, `useLocale`. (3) Add component tests for `ErrorBoundary`, `DashboardLayout`, `PushAnalysisCard`.
- **Effort:** XL (3+ days)
- **Dependencies:** None, can start immediately.

---

#### TD-009: `auth.tsx` Fully Hardcoded in Portuguese

- **Severity:** CRITICAL (upgraded from HIGH per UX specialist and QA Gate)
- **Category:** i18n
- **Source:** Phase 3 (frontend-spec.md, C4), State Report
- **Description:** The authentication page (login + signup) contains 18 hardcoded Portuguese strings with zero `t()` calls. This includes titles ("Crie sua conta" / "Bem-vindo de volta"), descriptions, form labels ("Nome", "Email", "Senha"), buttons ("Criar Conta", "Entrar", "Carregando..."), footer text, toast messages, and placeholder text ("seu@email.com"). This is the first interaction page for all users.
- **Impact:** English-speaking users see Portuguese text on the very first page they interact with. Complete i18n failure for the entry point of the application. A conversion blocker for the documented English-speaking audience.
- **Affected Files:** `client/src/pages/auth.tsx` (169 lines)
- **Remediation:** Import `useLocale()` and migrate all 18 strings to translation keys. Add corresponding keys to `pt-BR.json` and `en-US.json`. Migrate toast messages as well.
- **Effort:** S (< 2h) (re-estimated from M per UX specialist -- 169-line file, ~18 string replacements)
- **Dependencies:** None.

---

#### TD-012: Notification Settings Duplication (`user_settings` vs `notification_preferences`)

- **Severity:** CRITICAL (upgraded from HIGH per DB specialist and QA Gate)
- **Category:** Database
- **Source:** Phase 2 (DB-AUDIT.md, C1, Section 1.1)
- **Description:** Both `user_settings` and `notification_preferences` tables store notification toggles. `user_settings` has `notifications_training`, `notifications_billing`, `notifications_system`, AND `notification_preferences` has `training`, `billing`, `system`. The code in `routes.ts:isNotificationAllowed()` (lines 155-173) checks both with a fallback chain where `notification_preferences` is checked first, then `user_settings` as fallback. Additionally, `settingsUpdateInputSchema` (at `schema.ts:460-474`) accepts BOTH `notificationsTraining`/`notificationsBilling`/`notificationsSystem` (user_settings columns) AND a nested `notificationPreferences` object, making it possible for a single API call to update either or both tables with conflicting values. The `bootstrapUserData()` function and `handle_new_user()` trigger both write to BOTH tables.
- **Impact:** Active data consistency hazard -- not theoretical. A user could have `notifications_training = true` in `user_settings` but `training = false` in `notification_preferences`. The fallback chain creates unpredictable behavior. This inconsistency gap widens with every new user.
- **Affected Files:** `shared/schema.ts` (table definitions, settingsUpdateInputSchema), `server/storage.ts` (bootstrapUserData, isNotificationAllowed), `server/routes.ts`, `scripts/supabase/rls-and-triggers.sql` (handle_new_user trigger)
- **Remediation:** Per DB specialist: keep `notification_preferences` as the canonical table (it is purpose-built, has NOT NULL constraints, and is cleaner). Remove `notifications_training`, `notifications_billing`, `notifications_system` from `user_settings`. Migrate data by preferring `notification_preferences` values where they exist, falling back to `user_settings` values. Update `isNotificationAllowed()` to single source. Update `settingsUpdateInputSchema` to remove dual-update path. Update `bootstrapUserData()` (both branches). Update `handle_new_user()` trigger. **Pre-condition:** Take a full database backup before executing.
- **Effort:** XL (2-4 days) (re-estimated from L per DB specialist -- 7 change points across 4 files plus production data migration)
- **Dependencies:** TD-022 (versioned migrations) should come first. TD-025 (bootstrap refactor) is a prerequisite -- refactoring bootstrap first reduces the number of places that need updating during notification consolidation.

---

#### TD-013: No Automatic `updated_at` Trigger

- **Severity:** CRITICAL (upgraded from HIGH per DB specialist and QA Gate)
- **Category:** Database
- **Source:** Phase 2 (DB-AUDIT.md, C2)
- **Description:** No PostgreSQL trigger exists for automatic `updated_at` maintenance. Every update in the codebase manually sets `updatedAt: new Date()` -- verified: 14 instances in `server/storage.ts`. This is error-prone and creates clock skew between the Vercel serverless application server and the Supabase PostgreSQL database.
- **Impact:** If any update path forgets to set `updatedAt`, the timestamp becomes stale. Clock skew between serverless functions and PostgreSQL `now()` is real, not theoretical -- they can differ by seconds, which matters for ordering and caching logic. The risk compounds with every new update path added.
- **Affected Files:** `scripts/supabase/rls-and-triggers.sql`, `server/storage.ts`
- **Remediation:** Add a PostgreSQL trigger function and apply to all 9 tables with `updated_at` columns:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Apply to: `users`, `profiles`, `subscriptions`, `goals`, `user_settings`, `notification_preferences`, `player_sync_state`, `training_plans`, `training_drills`. After applying the trigger, the 14 manual `updatedAt: new Date()` calls in `storage.ts` become redundant but harmless (the trigger overwrites them). They can be removed in a follow-up cleanup.
- **Effort:** S (< 2h)
- **Dependencies:** None. Highest-priority database quick win.

---

### HIGH Items (12)

---

#### TD-010: `me.tsx` Has 27+ Hardcoded Portuguese Strings

- **Severity:** HIGH
- **Category:** i18n
- **Source:** Phase 3 (frontend-spec.md), State Report (detailed list)
- **Description:** The detailed stats page (`me.tsx`) bypasses the i18n system with 27+ inline Portuguese strings for battle types, tilt states, chart labels, deck names, archetypes, weekday abbreviations, loading messages, and error messages.
- **Impact:** English users see mixed Portuguese/English content on the most data-rich page of the app.
- **Affected Files:** `client/src/pages/me.tsx`, `shared/i18n/translations/pt-BR.json`, `shared/i18n/translations/en-US.json`
- **Remediation:** Extract all hardcoded strings to translation keys. Use `date-fns` locale for weekday names. Replace inline strings with `t()` calls.
- **Effort:** M (2-8h)
- **Dependencies:** Best done alongside TD-003 (me.tsx decomposition).

---

#### TD-011: `goals.tsx` Uses 46 `isPt` Ternaries Instead of `t()`

- **Severity:** HIGH
- **Category:** i18n
- **Source:** Phase 3 (frontend-spec.md, H1)
- **Description:** The goals page uses 46 instances of `isPt ? "Portuguese" : "English"` inline ternary expressions instead of calling the `t()` function. This pattern is brittle, error-prone, and does not scale to additional locales. (Note: DRAFT counted 43; actual verified count is 46 per UX specialist.)
- **Impact:** Adding a third locale would require editing 46 ternaries. Each ternary is a potential typo or inconsistency.
- **Affected Files:** `client/src/pages/goals.tsx` (432 lines)
- **Remediation:** Replace all `isPt ? "..." : "..."` with `t("pages.goals.xxx")` and add keys to both JSON translation files.
- **Effort:** M (2-8h)
- **Dependencies:** None.

---

#### TD-014: Missing Indexes on Time-Filtered Count Queries

- **Severity:** HIGH
- **Category:** Database / Performance
- **Source:** Phase 2 (DB-AUDIT.md, H1, Section 2.2)
- **Description:** Two daily rate-limiting queries lack optimal indexes: (1) `countCoachMessagesToday()` (storage.ts:910-928) filters by `userId + role='user' + createdAt >= todayStart` but only has a single-column `user_id` index. (2) `countPushAnalysesToday()` (storage.ts:968-980) filters by `userId + createdAt >= todayStart` with the same gap.
- **Impact:** As tables grow, these count queries (executed on every coach chat and push analysis request) become increasingly slow.
- **Affected Files:** `shared/schema.ts` (index definitions), `scripts/supabase/rls-and-triggers.sql`
- **Remediation:** Add composite indexes: `CREATE INDEX idx_coach_messages_user_role_created ON coach_messages(user_id, role, created_at)` and `CREATE INDEX idx_push_analyses_user_created ON push_analyses(user_id, created_at)`. Per DB specialist: the equality predicate column (`role`) goes before the range predicate column (`created_at`) for optimal btree scan.
- **Effort:** S (< 2h)
- **Dependencies:** None. Quick win.

---

#### TD-015: `subscriptions.user_id` Not Unique

- **Severity:** HIGH
- **Category:** Database
- **Source:** Phase 2 (DB-AUDIT.md, H2, Section 3.2)
- **Description:** The `subscriptions` table has no unique constraint on `user_id`. Multiple subscription rows can exist per user. The code selects `ORDER BY created_at DESC LIMIT 1` and the `createSubscription()` method (storage.ts:506-531) uses a SELECT-then-INSERT/UPDATE pattern that is vulnerable to race conditions.
- **Impact:** Race condition if two Stripe webhooks fire simultaneously for the same user -- both can proceed past the SELECT and both will INSERT, creating orphan rows. Orphan subscription rows accumulate. The `ORDER BY ... LIMIT 1` pattern is fragile.
- **Affected Files:** `shared/schema.ts`, `server/storage.ts` (`createSubscription()`, `bootstrapUserData()`)
- **Remediation:** Per DB specialist:

```sql
-- Step 1: Cleanup (run manually, verify results first)
DELETE FROM subscriptions s
WHERE s.id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM subscriptions
  ORDER BY user_id,
    CASE WHEN plan = 'pro' THEN 0 ELSE 1 END,
    created_at DESC
);

-- Step 2: Add constraint
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id);
```

After constraint is in place, refactor `createSubscription()` to use `ON CONFLICT (user_id) DO UPDATE`. Also update `bootstrapUserData()` to use `ON CONFLICT (user_id) DO NOTHING` instead of SELECT-then-INSERT. **Pre-condition:** Take a full database backup before executing.
- **Effort:** L (1-2 days) (re-estimated from M per DB specialist -- production data cleanup is the bottleneck)
- **Dependencies:** TD-022 (versioned migrations) is a soft dependency. TD-019 (pool config) is an implicit prerequisite -- long-running cleanup query on unconfigured pool risks connection exhaustion.

---

#### TD-016: Dual Toast Systems (Sonner + Radix Toast)

- **Severity:** HIGH
- **Category:** Frontend
- **Source:** Phase 3 (frontend-spec.md, H2, Section 8.4)
- **Description:** Two competing toast implementations coexist: (1) `@radix-ui/react-toast` via `use-toast.ts` used in pages (coach, billing, settings), and (2) `sonner` via `toast.success()/toast.error()` used in hooks (useProfile, useGoals, useFavorites). The Sonner toasts bypass i18n entirely with hardcoded Portuguese strings.
- **Impact:** Inconsistent toast appearance, behavior, and animation. Sonner toasts are always Portuguese. Two dependencies for the same functionality.
- **Affected Files:** `client/src/hooks/use-toast.ts`, `client/src/hooks/useProfile.ts`, `client/src/hooks/useGoals.ts`, `client/src/hooks/useFavorites.ts`, `client/src/hooks/useSettings.ts`
- **Remediation:** Keep Radix/use-toast (more widely used and i18n-compatible). Remove `sonner` dependency. Migrate hook toasts to `useToast` with `t()` calls.
- **Effort:** M (2-8h)
- **Dependencies:** None.

---

#### TD-017: Login Redirects to `/onboarding` for Returning Users

- **Severity:** HIGH
- **Category:** Frontend
- **Source:** Phase 3 (frontend-spec.md, H3, Section 9.2)
- **Description:** After login, all users are redirected to `/onboarding` regardless of whether they already have a profile with a `clashTag`. Returning users must go through the onboarding flow again. Per UX specialist: the onboarding page does detect existing profiles, so the friction is an extra click rather than a full re-onboarding -- but it is still unnecessary.
- **Impact:** Poor returning-user experience. Every login requires an extra step.
- **Affected Files:** `client/src/pages/auth.tsx`, `client/src/hooks/useAuth.ts`
- **Remediation:** After login, check if the user already has `clashTag` in their profile. If yes, redirect to `/dashboard`. If no, redirect to `/onboarding`. This is a ~15-20 line change in auth.tsx login handler.
- **Effort:** S (< 2h) (re-estimated from M per UX specialist)
- **Dependencies:** None.

---

#### TD-018: No Request Timeouts on External API Calls

- **Severity:** HIGH
- **Category:** Architecture / Performance
- **Source:** Phase 1 (system-architecture.md, W-06)
- **Description:** `fetch()` calls to Clash Royale API and OpenAI have no `AbortController` timeout. A hanging external API could block serverless function execution until Vercel's 10s/30s platform timeout.
- **Impact:** A slow Clash Royale API response can cascade into user-facing timeouts, consuming serverless function execution time and connection pool slots.
- **Affected Files:** `server/clashRoyaleApi.ts`, `server/openai.ts`
- **Remediation:** Add `AbortController` with timeouts: 5s for Clash Royale API, 15s for OpenAI, 10s for Stripe.
- **Effort:** M (2-8h)
- **Dependencies:** None.

---

#### TD-019: No Database Connection Pool Configuration

- **Severity:** HIGH
- **Category:** Architecture / Performance
- **Source:** Phase 1 (system-architecture.md, W-08), Phase 2 (DB-AUDIT.md, Section 5.5)
- **Description:** `new Pool({ connectionString })` at `server/db.ts:13` uses pg defaults (10 max connections) with no `max`, `idleTimeoutMillis`, or `connectionTimeoutMillis` configured. On Vercel serverless with concurrent invocations, each cold start creates a new pool, potentially exhausting Supabase connection limits (60 direct on free, 200 on Pro).
- **Impact:** Under high traffic, connection exhaustion causes 500 errors for all users.
- **Affected Files:** `server/db.ts`
- **Remediation:** Per DB specialist:

```typescript
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,                       // Low for serverless
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000,     // Short for serverless
});
```

Additionally, use Supabase's connection pooler (PgBouncer) URL as the `DATABASE_URL` for the application. The direct connection URL should only be used for migrations (already partially supported via `DATABASE_MIGRATIONS_URL` in `drizzle.config.ts`).
- **Effort:** S (< 2h)
- **Dependencies:** None. Quick win.

---

#### TD-020: Dark Mode Toggle is Non-Functional

- **Severity:** HIGH
- **Category:** Frontend
- **Source:** Phase 3 (frontend-spec.md, H5, Section 7.5)
- **Description:** The settings page has a "Dark Mode" toggle that saves the preference to the backend, but toggling it has no visual effect. The application is dark-only: `:root` CSS variables define dark colors only, and no `.dark` class toggling exists.
- **Impact:** Users see a toggle that does nothing, which damages trust and perceived quality.
- **Affected Files:** `client/src/index.css`, `client/src/pages/settings.tsx`
- **Remediation:** Remove the toggle entirely (option b -- recommended, since the gaming aesthetic is inherently dark-themed). This is a ~10-minute fix.
- **Effort:** S (< 2h) for option (b)
- **Dependencies:** None.

---

#### TD-021: Route Auth Guard Duplication in `App.tsx`

- **Severity:** HIGH
- **Category:** Frontend
- **Source:** Phase 3 (frontend-spec.md, H6, Section 6.3)
- **Description:** Auth is not implemented via a dedicated guard component. Instead, `App.tsx` duplicates all private routes in an `isAuthenticated ? <>...</> : <>...</>` conditional block. Adding a new page requires editing both blocks.
- **Impact:** Developer friction. Route additions require editing two separate blocks. Inconsistency risk.
- **Affected Files:** `client/src/App.tsx`
- **Remediation:** Create a `<PrivateRoute>` wrapper component that handles the auth check + redirect. Define each route once.
- **Effort:** M (2-8h)
- **Dependencies:** Should be done alongside TD-004 (add /push route).

---

#### TD-022: No Database Migration Versioning

- **Severity:** HIGH
- **Category:** Database / DevOps
- **Source:** Phase 2 (DB-AUDIT.md, M2, Section 6.1)
- **Description:** The project uses `drizzle-kit push` instead of versioned migrations. No `migrations/` folder exists, though `drizzle.config.ts` already has `out: "./migrations"` configured. Schema changes are pushed directly with no rollback capability and no migration history tracking.
- **Impact:** No rollback capability for failed schema changes. No CI verification. No audit trail. Dangerous for production databases.
- **Affected Files:** `drizzle.config.ts`, `package.json` (scripts)
- **Remediation:** Per DB specialist: adopt a dual-track migration approach. **Track 1 (Drizzle):** Use `drizzle-kit generate` + `drizzle-kit migrate` for ORM-managed schema changes. **Track 2 (SQL scripts):** Keep `rls-and-triggers.sql` and `decks-migrations.sql` for Supabase-specific features (RLS policies, triggers, grants, functions). Use `DATABASE_MIGRATIONS_URL` for direct connections during migrations. Both tracks versioned in git.
- **Effort:** M (2-8h) (slightly reduced since config is partially set up)
- **Dependencies:** None, but should be done early -- unblocks TD-012, TD-015, TD-026, TD-036, TD-041, TD-048.

---

#### TD-034: `not-found.tsx` Uses Light Background and Light Text Colors

- **Severity:** HIGH (upgraded from MEDIUM per UX specialist and QA Gate)
- **Category:** Frontend
- **Source:** Phase 3 (frontend-spec.md, M4)
- **Description:** `not-found.tsx` uses `bg-gray-50` (light background), `text-gray-900` (dark text on dark background), and `text-gray-600` (medium-gray text on dark background). The entire application uses a dark theme. Combined with TD-004 (`/push` unreachable), ALL Push feature users see this unreadable page.
- **Impact:** The 404 page has functionally invisible text -- not just a wrong background color. Combined with the unreachable `/push` route, this is a live production defect affecting a core feature.
- **Affected Files:** `client/src/pages/not-found.tsx` (22 lines)
- **Remediation:** Change `bg-gray-50` to `bg-background`, `text-gray-900` to `text-foreground`, `text-gray-600` to `text-muted-foreground` to match the application theme.
- **Effort:** S (< 2h)
- **Dependencies:** None. Quick win.

---

### MEDIUM Items (20)

---

#### TD-023: `settings.tsx` at 763 Lines

- **Severity:** MEDIUM
- **Category:** Frontend
- **Source:** Phase 3 (frontend-spec.md, M6)
- **Description:** Settings page contains 3 tabs (Account, Billing, Preferences) with multiple mutations in a single file.
- **Impact:** Growing complexity. Trending toward unmaintainability.
- **Affected Files:** `client/src/pages/settings.tsx` (763 lines)
- **Remediation:** Extract `AccountTab.tsx`, `BillingTab.tsx`, `PreferencesTab.tsx`.
- **Effort:** M (2-8h)
- **Dependencies:** None.

---

#### TD-024: No Route-Based Code Splitting

- **Severity:** MEDIUM
- **Category:** Frontend / Performance
- **Source:** Phase 3 (frontend-spec.md, H4, Section 11.1)
- **Description:** All 18 pages are imported eagerly at the top of `App.tsx`. The entire app is a single chunk with no `React.lazy()` or dynamic imports.
- **Impact:** First-load bundle is larger than necessary. Recharts (~400KB unminified) is loaded even when no charts are visible.
- **Affected Files:** `client/src/App.tsx`
- **Remediation:** Implement `React.lazy()` + `Suspense` for each page import. Priority splits: landing, auth, me (heavy), decks (heavy + Recharts).
- **Effort:** M (2-8h)
- **Dependencies:** TD-021 (PrivateRoute wrapper) pairs well with this change.

---

#### TD-025: `bootstrapUserData()` Code Duplication

- **Severity:** MEDIUM
- **Category:** Architecture
- **Source:** Phase 1 (system-architecture.md, W-05), Phase 2 (DB-AUDIT.md, M1)
- **Description:** `bootstrapUserData()` in `storage.ts` (lines 272-443) has nearly identical logic (~85 lines each) duplicated for the RLS path (`this.auth`) and the no-RLS path (`!this.auth`). Both branches perform the same 4 INSERT + 4 SELECT operations.
- **Impact:** Any change to bootstrap logic must be made in two places.
- **Affected Files:** `server/storage.ts` (lines ~272-443)
- **Remediation:** Extract the shared bootstrap logic into a private method like `_bootstrapInTransaction(tx, userId)` and call it from both branches. The `!this.auth` branch wraps in `db.transaction()`, the `this.auth` branch wraps in `this.runAsUser()`.
- **Effort:** S (< 2h)
- **Dependencies:** None. Should be done before TD-012 (notification consolidation) to reduce change surface.

---

#### TD-026: No Enum/CHECK Constraints at DB Level

- **Severity:** MEDIUM
- **Category:** Database
- **Source:** Phase 2 (DB-AUDIT.md, H3, Section 3.2)
- **Description:** All enum-like columns are stored as `varchar` with no `CHECK` constraints. Validation exists only at the Zod/application level.
- **Impact:** A bug, manual SQL edit, or migration error could insert invalid enum values.
- **Affected Files:** `shared/schema.ts`, `scripts/supabase/rls-and-triggers.sql`
- **Remediation:** Per DB specialist, add in priority order:

```sql
ALTER TABLE subscriptions ADD CONSTRAINT chk_subscriptions_plan
  CHECK (plan IN ('free', 'pro'));
ALTER TABLE subscriptions ADD CONSTRAINT chk_subscriptions_status
  CHECK (status IN ('inactive', 'active', 'canceled', 'past_due'));
ALTER TABLE goals ADD CONSTRAINT chk_goals_type
  CHECK (type IN ('trophies', 'streak', 'winrate', 'custom'));
ALTER TABLE training_plans ADD CONSTRAINT chk_training_plans_status
  CHECK (status IN ('active', 'archived', 'completed'));
ALTER TABLE training_drills ADD CONSTRAINT chk_training_drills_status
  CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped'));
```

- **Effort:** S (< 2h)
- **Dependencies:** TD-022 (versioned migrations) recommended first.

---

#### TD-027: `coach_messages` and `deck_suggestions_usage` Grow Unbounded

- **Severity:** MEDIUM
- **Category:** Database / Performance
- **Source:** Phase 2 (DB-AUDIT.md, H4, Section 5.3)
- **Description:** `coach_messages`, `deck_suggestions_usage`, `push_analyses`, and `notifications` have no data retention policy. Rows accumulate indefinitely. Only `battle_history` has pruning logic. Per DB specialist, the growth characteristics differ: `coach_messages` is highest-volume (~2-4 rows per interaction, heavy users 50-100/day), `deck_suggestions_usage` is bounded by rate limits, `push_analyses` and `notifications` are moderate.
- **Impact:** Tables grow without bound, increasing storage costs, slowing queries, impacting backup/restore times.
- **Affected Files:** `server/storage.ts`, potentially a new scheduled job
- **Remediation:** Per DB specialist retention recommendations: `coach_messages` 90-day (free) / 365-day (pro); `deck_suggestions_usage` 30-day; `push_analyses` 180-day (free) / 365-day (pro); `notifications` 30-day for read, 90-day for unread. Implement as daily cron job. (See also TD-052 for `push_analyses` specifics.)
- **Effort:** M (2-8h)
- **Dependencies:** None.

---

#### TD-028: Meta Decks Refresh in Request Path

- **Severity:** MEDIUM
- **Category:** Architecture / Performance
- **Source:** Phase 1 (system-architecture.md, W-09)
- **Description:** `refreshMetaDecksCacheIfStale()` runs within a user's GET request for `/api/decks/meta`. If the cache is stale, it fetches battles from 50+ top players concurrently, potentially adding 10+ seconds to response time.
- **Impact:** One unlucky user per staleness interval gets a multi-second response time. On serverless, this can hit the function timeout.
- **Affected Files:** `server/domain/metaDecksRefresh.ts`, `server/routes.ts`
- **Remediation:** Move meta decks refresh to a Vercel Cron job (`vercel.json` crons). The user-facing endpoint should only read from cache.
- **Effort:** M (2-8h)
- **Dependencies:** None.

---

#### TD-029: Excessive `as any` Casting

- **Severity:** MEDIUM
- **Category:** Frontend / TypeScript
- **Source:** Phase 3 (frontend-spec.md, M1), Phase 1 (system-architecture.md, W-10, W-18)
- **Description:** Widespread `as any` casting across the full stack. Frontend-specific: 27 instances across 9 files (per UX specialist verification). Server-side: additional instances in routes.ts and storage.ts. Battle JSON is typed as `any[]` for both input and output. Route handlers use `req: any`.
- **Impact:** Defeats TypeScript's safety guarantees. Refactoring becomes dangerous. IDE autocomplete is useless for these code paths.
- **Affected Files:** `client/src/pages/me.tsx`, `client/src/pages/decks.tsx`, `client/src/lib/api.ts`, `server/routes.ts`, `server/storage.ts`
- **Remediation:** Define proper interfaces for API responses and battle data. Replace `any` with typed payloads. Start with the most frequently used types.
- **Effort:** L (1-3 days)
- **Dependencies:** None, but benefits from TD-003 (me.tsx decomposition).

---

#### TD-031: Hooks Use Hardcoded Portuguese Toasts

- **Severity:** MEDIUM
- **Category:** i18n
- **Source:** Phase 3 (frontend-spec.md, M3, Section 5)
- **Description:** `useProfile.ts`, `useGoals.ts`, and `useFavorites.ts` use `toast()` from `sonner` with 14 hardcoded Portuguese strings (per UX specialist -- DRAFT said ~10). Examples: "Perfil atualizado com sucesso!", "Meta criada com sucesso!", "Jogador adicionado aos favoritos!". Meanwhile, `useSettings.ts` properly uses `t()`.
- **Impact:** English users see Portuguese toast messages after profile/goal/favorite operations.
- **Affected Files:** `client/src/hooks/useProfile.ts`, `client/src/hooks/useGoals.ts`, `client/src/hooks/useFavorites.ts`
- **Remediation:** Migrate to `t()` calls. Either pass locale/t as parameter or use `useLocale()` inside the hook.
- **Effort:** S (< 2h)
- **Dependencies:** TD-016 (unify toast system) should ideally be done first.

---

#### TD-032: N+1 Queries in `/api/auth/user`

- **Severity:** MEDIUM
- **Category:** Database / Performance
- **Source:** Phase 2 (DB-AUDIT.md, M5, Section 5.2)
- **Description:** The `/api/auth/user` endpoint makes multiple sequential queries per authentication request. Per DB specialist clarification: when `bootstrapUserData()` runs (first login / new user), it already returns all 4 entities (profile, settings, subscription, notification preferences) -- only 2 runAsUser calls are needed. The 5-query scenario applies when bootstrap is NOT called (returning users), where separate `getUser`, `getProfile`, `getSubscription`, `getUserSettings` calls are made sequentially.
- **Impact:** Every returning-user page load triggers sequential round trips to PostgreSQL. Each round trip includes the 4 `SET` commands for RLS context in `runAsUser()`.
- **Affected Files:** `server/routes.ts` (auth user endpoint), `server/storage.ts`
- **Remediation:** For returning users: consolidate into a single SQL query that joins `users`, `profiles`, `subscriptions`, and `user_settings` in one round trip. Alternatively, since `bootstrapUserData()` already returns all 4 entities, the route handler could use the bootstrap result directly. Keep `bootstrapUserData` as a separate step only for first-time users.
- **Effort:** M (2-8h)
- **Dependencies:** None.

---

#### TD-033: `favorite_players` Data Staleness

- **Severity:** MEDIUM
- **Category:** Database
- **Source:** Phase 2 (DB-AUDIT.md, M3, Section 1.1)
- **Description:** `favorite_players.trophies` and `favorite_players.clan` are denormalized copies of player data that become stale as soon as the player plays a match. No refresh mechanism exists.
- **Impact:** Users see outdated trophy counts and clan info for their favorite players.
- **Affected Files:** `shared/schema.ts`, `server/storage.ts`
- **Remediation:** Per DB specialist: refresh cached data during player sync. When `/api/player/sync` fetches player data from the Clash Royale API, also update any matching `favorite_players` rows. This piggybacks on an existing API call.
- **Effort:** M (2-8h)
- **Dependencies:** None.

---

#### TD-035: Server-Side Hardcoded Portuguese Notification Strings

- **Severity:** MEDIUM
- **Category:** i18n
- **Source:** State Report (lines 2167, 2227, 2280 of routes.ts)
- **Description:** Three notification strings in `routes.ts` are hardcoded in Portuguese in Stripe webhook handlers: (1) "Sua assinatura PRO foi ativada com sucesso...", (2) "Sua assinatura PRO foi cancelada...", (3) "O pagamento da sua assinatura PRO falhou...".
- **Impact:** English-speaking users receive Portuguese notification text for billing events.
- **Affected Files:** `server/routes.ts` (Stripe webhook section)
- **Remediation:** Use i18n keys for notification templates. Determine user locale from `user_settings.preferred_language` before creating the notification.
- **Effort:** M (2-8h)
- **Dependencies:** TD-001 (split routes) for cleaner access to notification logic.

---

#### TD-037: `formatDate` and `formatMoneyFromCents` Duplicated

- **Severity:** MEDIUM
- **Category:** Frontend
- **Source:** Phase 3 (frontend-spec.md, M7)
- **Description:** The same utility functions are defined independently in both `billing.tsx` and `settings.tsx`.
- **Impact:** DRY violation. Bug fixes must be applied in two places.
- **Affected Files:** `client/src/pages/billing.tsx`, `client/src/pages/settings.tsx`
- **Remediation:** Extract to `client/src/lib/formatters.ts` shared module.
- **Effort:** S (< 2h)
- **Dependencies:** None. Quick win.

---

#### TD-038: No `aria-live` Regions for Dynamic Content

- **Severity:** MEDIUM
- **Category:** Frontend / Accessibility
- **Source:** Phase 3 (frontend-spec.md, M5, Section 10)
- **Description:** Dynamic content changes (loading spinners, sync status, chat messages, toast notifications) are not announced to screen readers. No `aria-live`, `role="status"`, or `role="log"` attributes exist.
- **Impact:** Screen reader users are unaware of loading states, sync progress, and chat updates.
- **Affected Files:** Multiple pages and components
- **Remediation:** Add `role="status"` to loading spinners. Add `role="log"` to chat message container. Add `aria-busy` to containers during async operations.
- **Effort:** M (2-8h)
- **Dependencies:** None.

---

#### TD-051: `runAsUser` Per-Query Transaction Overhead

- **Severity:** MEDIUM
- **Category:** Database / Performance
- **Source:** Phase 2 (DB-AUDIT.md, Section 7.2), Phase 5 (@data-engineer)
- **Description:** Every single database operation in `DatabaseStorage` (including simple SELECTs like `getUser`, `getProfile`, `getUserSettings`) is wrapped in a `runAsUser()` call that opens a new transaction with 4 `SET` commands (`set_config` x3 + `SET LOCAL ROLE`). For a sequence of 3 reads, that is 3 transactions with 12 SET commands, instead of 1 transaction with 4 SET commands and 3 queries.
- **Impact:** Increased latency and connection pool pressure. Each `runAsUser` acquires a connection from the pool, starts a transaction, executes 4 SET commands, runs the query, commits, and returns the connection.
- **Affected Files:** `server/storage.ts` (all 60+ storage methods using `runAsUser`)
- **Remediation:** Introduce a "session" concept: `withUserSession(auth, async (session) => { ... })` wrapper that opens one transaction, sets RLS context once, and allows multiple queries within it. Individual storage methods should accept an optional session/transaction parameter.
- **Effort:** L (1-3 days) -- requires refactoring the `runAsUser` pattern across all 60+ methods.
- **Dependencies:** Should be done alongside or after TD-001 (routes.ts split) and TD-032 (N+1 auth queries).

---

#### TD-054: Keyboard-Inaccessible Clickable Cards

- **Severity:** MEDIUM
- **Category:** Frontend / Accessibility
- **Source:** Phase 3 (frontend-spec.md, Section 10.2), Phase 6 (@ux-design-expert)
- **Description:** Interactive cards in `training.tsx` use `<div onClick>` without `tabIndex`, `role="button"`, or `onKeyDown` handlers. This is a WCAG 2.1 SC 2.1.1 violation (keyboard accessibility). The pattern may exist in other pages as well.
- **Impact:** Keyboard-only users cannot interact with training cards.
- **Affected Files:** `client/src/pages/training.tsx`, potentially other pages with clickable cards
- **Remediation:** Add `tabIndex={0}`, `role="button"`, and `onKeyDown` handler (Enter/Space) to all clickable `<div>` elements. Alternatively, replace with `<button>` elements styled as cards.
- **Effort:** M (2-8h)
- **Dependencies:** None.

---

#### TD-055: ErrorBoundary Inconsistency Across Routes

- **Severity:** MEDIUM
- **Category:** Frontend
- **Source:** Phase 3 (frontend-spec.md, Section 6.2), Phase 6 (@ux-design-expert)
- **Description:** Some routes have `ErrorBoundary` wrappers and others do not. Per UX specialist: decks, community, settings, and onboarding lack ErrorBoundary. Particularly concerning for onboarding (new user crash = permanent block).
- **Impact:** Unhandled errors on onboarding, decks, community, or settings pages cause a white screen crash with no recovery path for the user.
- **Affected Files:** `client/src/App.tsx` (route definitions)
- **Remediation:** Wrap all routes with `ErrorBoundary`. If TD-021 (PrivateRoute) is implemented, make ErrorBoundary wrapping the default behavior.
- **Effort:** M (2-8h)
- **Dependencies:** TD-021 (PrivateRoute) -- if PrivateRoute is implemented, ErrorBoundary wrapping can be built in.

---

#### TD-057: No Structured Logging Framework

- **Severity:** MEDIUM
- **Category:** DevOps / Architecture
- **Source:** Phase 1 (system-architecture.md, W-15), Phase 7 (QA Gate, Gap G3)
- **Description:** The application uses `console.log/error/info/warn` directly with no structured logging, no log levels, and no correlation beyond `requestId`. No logging framework is configured.
- **Impact:** Significant operational gap. Debugging production issues requires manually searching unstructured console output. No ability to filter by severity, trace requests across operations, or integrate with log aggregation services.
- **Affected Files:** `server/routes.ts`, `server/storage.ts`, `server/domain/*.ts`
- **Remediation:** Add a structured logging library (e.g., `pino` or `winston`). Configure log levels (debug, info, warn, error). Add request correlation via middleware. Structured JSON output for production.
- **Effort:** M (2-8h)
- **Dependencies:** None.

---

#### TD-059: No XSS Protection on Text Fields

- **Severity:** MEDIUM
- **Category:** Security
- **Source:** Phase 1 (system-architecture.md, Section 13), Phase 7 (QA Gate, Gap G8)
- **Description:** Input sanitization is described as "PARTIAL" in the architecture assessment. Clash tags are sanitized, but text fields (coach messages, goal descriptions, display names) have no general XSS protection. User-supplied text is stored and rendered without sanitization.
- **Impact:** Potential for stored XSS attacks if a user submits malicious content in text fields that is later rendered to other users (e.g., community features, display names).
- **Affected Files:** `server/routes.ts` (input handling), `client/src/pages/coach.tsx`, `client/src/pages/goals.tsx`
- **Remediation:** Add input sanitization middleware for text fields. Use a library like `dompurify` on the client or `sanitize-html` on the server for any user-generated content that is rendered.
- **Effort:** M (2-8h)
- **Dependencies:** None.

---

#### TD-060: Stripe Webhook Signature Verification Unclear

- **Severity:** MEDIUM
- **Category:** Security
- **Source:** Phase 1 (system-architecture.md, W-07), Phase 7 (QA Gate, Gap G6)
- **Description:** The architecture assessment flags Stripe webhook signature verification as "ASSUMED" -- it is not explicitly confirmed in the codebase documentation. If verification is missing, this would be a CRITICAL security issue (anyone could forge webhook events to manipulate subscription state). If it exists, it should be documented.
- **Impact:** If missing: arbitrary subscription manipulation via forged webhook events. If present but undocumented: confusion for future developers.
- **Affected Files:** `server/routes.ts` (Stripe webhook handler)
- **Remediation:** Verify that `stripe.webhooks.constructEvent(body, sig, webhookSecret)` is used. If present, document it. If missing, add it immediately (this would be a CRITICAL security fix).
- **Effort:** S (< 2h) to verify and document; M (2-8h) if implementation is needed
- **Dependencies:** None.

---

### LOW Items (19)

---

#### TD-030: `framer-motion` Dependency Unused

- **Severity:** LOW
- **Category:** Frontend / Performance
- **Source:** Phase 3 (frontend-spec.md, M2, Section 11.1)
- **Description:** `framer-motion` (v12.23, ~150KB) is listed in `package.json` dependencies but is not imported anywhere in the client code.
- **Impact:** Adds to `npm install` time and `node_modules` size.
- **Affected Files:** `package.json`
- **Remediation:** Remove `framer-motion` from dependencies.
- **Effort:** S (< 2h)
- **Dependencies:** None.

---

#### TD-036: Timestamp Columns Without Timezone

- **Severity:** LOW (downgraded from MEDIUM per DB specialist and QA Gate)
- **Category:** Database
- **Source:** Phase 2 (DB-AUDIT.md, M6, Section 1.3)
- **Description:** All timestamp columns use `timestamp` (without time zone) instead of `timestamptz`. Per DB specialist: in practice, CRStats uses UTC everywhere -- both in application code (`new Date()` produces UTC in Node.js) and in PostgreSQL (`now()` returns UTC when the server timezone is UTC, which is the Supabase default). PostgreSQL internally stores `timestamp` and `timestamptz` identically when the input is UTC.
- **Impact:** Near-zero practical risk in a UTC-only, Supabase-hosted environment. The risk would only materialize if the deployment changes to a non-UTC environment, which is unlikely for Supabase.
- **Affected Files:** `shared/schema.ts`
- **Remediation:** Migrate to `timestamptz` using Drizzle: `timestamp("created_at", { withTimezone: true }).defaultNow()`.
- **Effort:** S (< 2h) for schema change; M (2-8h) including testing across 16 tables
- **Dependencies:** TD-022 (versioned migrations).

---

#### TD-039: `goals 2.tsx` Dead File

- **Severity:** LOW
- **Category:** Frontend
- **Source:** Phase 3 (frontend-spec.md, H7), Phase 1 (system-architecture.md, W-12)
- **Description:** `goals 2.tsx` (432 lines), `clashTag 2.ts`, and `clashTag.test 2.ts` exist as dead duplicate files, not imported anywhere.
- **Impact:** Clutters the codebase, confuses developers.
- **Affected Files:** `client/src/pages/goals 2.tsx`, `shared/clashTag 2.ts`, `shared/clashTag.test 2.ts`
- **Remediation:** Delete all duplicate files.
- **Effort:** S (< 2h)
- **Dependencies:** None. Quick win.

---

#### TD-040: ~30 Unused shadcn/ui Components

- **Severity:** LOW
- **Category:** Frontend
- **Source:** Phase 3 (frontend-spec.md, L1, Section 3.1)
- **Description:** Approximately 30 of 55 installed shadcn/ui components are not actively used.
- **Impact:** Clutters the components directory. Tree-shaking handles bundle impact.
- **Affected Files:** `client/src/components/ui/` (30+ files)
- **Remediation:** Audit and remove truly unused components.
- **Effort:** M (2-8h)
- **Dependencies:** None.

---

#### TD-041: `profiles.clash_tag` Legacy Column

- **Severity:** LOW
- **Category:** Database
- **Source:** Phase 2 (DB-AUDIT.md, L1, Section 1.1)
- **Description:** Two columns (`clash_tag` and `default_player_tag`) exist for the same purpose. `buildCanonicalProfileData()` syncs them, but the dual-column approach is confusing.
- **Impact:** Developer confusion, redundant storage, sync logic that can drift.
- **Affected Files:** `shared/schema.ts`, `server/storage.ts`
- **Remediation:** Plan deprecation: migrate any `clash_tag`-only values to `default_player_tag`, rename to `_clash_tag_deprecated`, then drop.
- **Effort:** S (< 2h)
- **Dependencies:** TD-022 (versioned migrations).

---

#### TD-042: No Image Optimization Pipeline

- **Severity:** LOW
- **Category:** Frontend / Performance
- **Source:** Phase 3 (frontend-spec.md, L2, Section 11.4)
- **Description:** Landing page hero background uses a PNG file with no WebP/AVIF alternatives, no responsive `srcSet`, no `<picture>` element, and no `loading="lazy"`.
- **Impact:** Larger initial page load.
- **Affected Files:** `client/src/pages/landing.tsx`, `client/src/components/clash/ClashCardImage.tsx`
- **Remediation:** Convert hero image to WebP. Add `loading="lazy"`. Use `<picture>` element with fallback.
- **Effort:** S (< 2h)
- **Dependencies:** None.

---

#### TD-043: No Skip Navigation Link

- **Severity:** LOW
- **Category:** Frontend / Accessibility
- **Source:** Phase 3 (frontend-spec.md, L3, Section 10)
- **Description:** No "Skip to content" link exists at the top of `DashboardLayout`.
- **Impact:** Accessibility gap for keyboard-only users.
- **Affected Files:** `client/src/components/layout/DashboardLayout.tsx`
- **Remediation:** Add a visually-hidden "Skip to content" anchor link that becomes visible on focus.
- **Effort:** S (< 2h)
- **Dependencies:** None.

---

#### TD-044: Page Transition CSS Defined but Unused

- **Severity:** LOW
- **Category:** Frontend
- **Source:** Phase 3 (frontend-spec.md, L4, Section 7.3)
- **Description:** `.page-transition-*` CSS classes are defined in `index.css` but never applied.
- **Impact:** Dead CSS.
- **Affected Files:** `client/src/index.css`
- **Remediation:** Either implement route transitions or remove the dead CSS.
- **Effort:** S (< 2h)
- **Dependencies:** None.

---

#### TD-045: Copyright Says 2025

- **Severity:** LOW
- **Category:** Frontend
- **Source:** Phase 3 (frontend-spec.md, L5)
- **Description:** Footer copyright text displays "2025" instead of current year.
- **Impact:** Minor cosmetic issue.
- **Affected Files:** Landing page or layout footer.
- **Remediation:** Use `new Date().getFullYear()` for dynamic year.
- **Effort:** S (< 2h)
- **Dependencies:** None.

---

#### TD-046: Sidebar Avatar Uses Hardcoded Placeholder

- **Severity:** LOW
- **Category:** Frontend
- **Source:** Phase 3 (frontend-spec.md, L6)
- **Description:** Sidebar avatar displays `src="https://github.com/shadcn.png"` instead of user avatar.
- **Impact:** Users do not see their profile image in navigation.
- **Affected Files:** `client/src/components/layout/Sidebar.tsx`
- **Remediation:** Use user's `profile_image_url` with fallback to initials or generic avatar.
- **Effort:** S (< 2h)
- **Dependencies:** None.

---

#### TD-047: `push.tsx` Has Portuguese-Only Strings

- **Severity:** LOW
- **Category:** i18n
- **Source:** Phase 3 (frontend-spec.md, L7)
- **Description:** `push.tsx` has 3 Portuguese + 1 English hardcoded string (per UX specialist -- DRAFT said ~5). The page is currently unreachable (TD-004) but will need i18n when the route is fixed.
- **Impact:** Minor i18n gap on a secondary page.
- **Affected Files:** `client/src/pages/push.tsx` (129 lines)
- **Remediation:** Add translation keys. Replace hardcoded strings with `t()` calls.
- **Effort:** S (< 2h)
- **Dependencies:** TD-004 (fix route) should come first.

---

#### TD-048: Index Naming Convention Inconsistency

- **Severity:** LOW
- **Category:** Database
- **Source:** Phase 2 (DB-AUDIT.md, L3, Section 1.2)
- **Description:** Index names use uppercase `IDX_`/`UIDX_` prefix while table/column names are lowercase snake_case.
- **Impact:** Cosmetic only.
- **Affected Files:** `shared/schema.ts`
- **Remediation:** Standardize to lowercase: `idx_table_columns`.
- **Effort:** S (< 2h)
- **Dependencies:** TD-022 (versioned migrations).

---

#### TD-049: `create-stripe-prices.ts` Uses Dead Replit Connector

- **Severity:** LOW
- **Category:** DevOps
- **Source:** Phase 2 (DB-AUDIT.md, L2)
- **Description:** `scripts/create-stripe-prices.ts` uses a Replit-specific database connector that is dead code.
- **Impact:** Dead code, developer confusion.
- **Affected Files:** `scripts/create-stripe-prices.ts`
- **Remediation:** Delete the file.
- **Effort:** S (< 2h)
- **Dependencies:** None.

---

#### TD-050: `useIsMobile` Returns `false` Initially

- **Severity:** LOW
- **Category:** Frontend
- **Source:** Phase 3 (frontend-spec.md, L8)
- **Description:** `useIsMobile` hook initializes from `undefined` (treated as `false`), causing a brief flash of desktop layout on mobile before the `matchMedia` listener fires.
- **Impact:** Minor visual flicker on mobile first render.
- **Affected Files:** `client/src/hooks/use-mobile.tsx`
- **Remediation:** Initialize from `window.innerWidth < 768` instead of `undefined`.
- **Effort:** S (< 2h)
- **Dependencies:** None.

---

#### TD-052: `push_analyses` Lacks Explicit Retention Policy

- **Severity:** LOW
- **Category:** Database
- **Source:** Phase 2 (DB-AUDIT.md, Section 5.3), Phase 5 (@data-engineer)
- **Description:** While TD-027 mentions `push_analyses` in passing, it does not provide a specific retention strategy. Each row contains a `result_json` JSONB column with the full AI analysis result, which can be moderately large. Without pruning, this table grows indefinitely.
- **Impact:** Unbounded growth of moderately-sized JSONB data.
- **Affected Files:** `server/storage.ts`
- **Remediation:** Add to the retention policy job (TD-027): keep push analyses for 180 days (free) / 365 days (pro). Alternatively, archive `result_json` to cold storage after 90 days and keep only summary columns.
- **Effort:** S (< 2h) -- part of TD-027 implementation.
- **Dependencies:** TD-027 (retention policy implementation).

---

#### TD-053: `battle_history.created_at` Is Nullable

- **Severity:** LOW
- **Category:** Database
- **Source:** Phase 2 (DB-AUDIT.md, Section 3.3), Phase 5 (@data-engineer)
- **Description:** `battle_history.created_at` has a `defaultNow()` but is nullable (verified at `schema.ts:245`). A buggy INSERT that explicitly passes `null` would bypass the default. Since `created_at` is used for pruning logic, a NULL value could cause the row to be either always or never pruned.
- **Impact:** Potential for rows to escape pruning logic.
- **Affected Files:** `shared/schema.ts`
- **Remediation:** Add `NOT NULL` constraint to `battle_history.created_at`. Verify no existing rows have NULL values first.
- **Effort:** S (< 2h)
- **Dependencies:** TD-022 (versioned migrations).

---

#### TD-056: Recharts Not Screen-Reader Accessible

- **Severity:** LOW
- **Category:** Frontend / Accessibility
- **Source:** Phase 3 (frontend-spec.md, Section 10.4), Phase 6 (@ux-design-expert)
- **Description:** Charts (Recharts) are core to the analytics value proposition but provide no screen-reader accessible alternative. No `aria-label` on chart containers, no tabular data alternative, no descriptive text.
- **Impact:** Visually impaired users cannot access the core data visualizations that define the product's value.
- **Affected Files:** `client/src/pages/me.tsx` (charts), `client/src/pages/decks.tsx` (charts)
- **Remediation:** Add `aria-label` to chart containers describing the data. Provide a "View as table" toggle for key charts. Add descriptive `<title>` elements to SVG charts.
- **Effort:** M (2-8h)
- **Dependencies:** TD-003 (me.tsx decomposition) would make this easier to implement per-chart.

---

#### TD-058: No Health Check Endpoint

- **Severity:** LOW
- **Category:** DevOps
- **Source:** Phase 1 (system-architecture.md, W-16), Phase 7 (QA Gate, Gap G4)
- **Description:** No `/api/health` endpoint exists. Monitoring tools and uptime checks cannot verify the application is responsive beyond receiving a 200 from static assets.
- **Impact:** No programmatic way to verify application health, database connectivity, or external API availability.
- **Affected Files:** `server/routes.ts` or new `routes/health.ts`
- **Remediation:** Add `/api/health` endpoint that returns 200 with basic status (app version, DB connectivity, uptime).
- **Effort:** S (< 2h)
- **Dependencies:** None.

---

#### TD-061: WebSocket Dependency Unused

- **Severity:** LOW
- **Category:** DevOps
- **Source:** Phase 1 (system-architecture.md, W-17), Phase 7 (QA Gate, Gap G5)
- **Description:** WebSocket-related dependency exists in `package.json` but is not used. Dead dependency alongside framer-motion (TD-030) and the dead Replit script (TD-049).
- **Impact:** Dead dependency, confusion.
- **Affected Files:** `package.json`
- **Remediation:** Remove the unused dependency. Batch with TD-030 (framer-motion removal) for a single dependency cleanup pass.
- **Effort:** S (< 2h)
- **Dependencies:** None.

---

#### TD-062: Hardcoded Free Tier Limits (Magic Numbers)

- **Severity:** LOW
- **Category:** Architecture
- **Source:** Phase 1 (system-architecture.md, W-14), Phase 7 (QA Gate, Gap G2)
- **Description:** `FREE_DAILY_LIMIT = 5` and `FREE_DECK_SUGGESTION_DAILY_LIMIT = 2` are defined as magic numbers at `routes.ts` lines 42-43. These should be configurable or at least centralized in a constants file.
- **Impact:** Maintainability concern. Changing free tier limits requires finding and editing magic numbers in a 3,874-line file.
- **Affected Files:** `server/routes.ts`
- **Remediation:** Extract to a `shared/constants/limits.ts` or `server/config/plans.ts` file. After TD-001 (route split), these can be imported per-route module.
- **Effort:** S (< 2h)
- **Dependencies:** None.

---

## 3. Cross-Cutting Concerns

### 3.1 God-File Pattern (Systemic)

The god-file pattern appears in both backend and frontend, indicating a systemic tendency to grow files rather than decompose them:

| File | Lines | Layer |
|------|------:|-------|
| `server/routes.ts` | 3,874 | Backend |
| `client/src/pages/me.tsx` | 1,931 | Frontend |
| `client/src/pages/decks.tsx` | 1,397 | Frontend |
| `server/storage.ts` | 1,234 | Backend |
| `client/src/pages/settings.tsx` | 763 | Frontend |
| `server/openai.ts` | 555 | Backend |
| `client/src/pages/training.tsx` | 541 | Frontend |

**Root Cause:** The project was developed in a rapid-prototype phase (likely Replit-first) where single-file patterns are common for speed.

**Impact:** Affects TD-001, TD-002, TD-003, TD-023. The UX specialist recommends establishing a decomposition convention with the first file split that serves as a pattern for the others.

### 3.2 i18n Inconsistency (Systemic)

The i18n system itself (`shared/i18n/`) is well-designed, but adoption is inconsistent:

| Pattern | Files | Items |
|---------|-------|------:|
| Fully using `t()` | dashboard, billing, coach, community, training, notifications, settings, decks | ~8 pages |
| Hardcoded Portuguese | auth.tsx, me.tsx, push.tsx | ~3 pages (49+ strings) |
| `isPt` ternary hack | goals.tsx | 46 occurrences |
| Hardcoded in hooks | useProfile, useGoals, useFavorites | 14 strings |
| Hardcoded server-side | routes.ts (notifications) | 3 strings |

**Root Cause:** The i18n system was added after initial development. Pages built early were never retrofitted. Hooks adopted `sonner` (which has no i18n awareness).

**Impact:** Affects TD-009, TD-010, TD-011, TD-031, TD-035, TD-047.

### 3.3 Testing Absence (Systemic)

| Layer | Test Files | Tests | Coverage |
|-------|-----------|------:|----------|
| Backend domain | 3 files | 15 | syncRules, battleHistory, stripeCheckout |
| Shared | 2 files | 8 | clashTag, playerSyncPayload |
| API routes | 0 | 0 | Nothing |
| Frontend | 0 | 0 | Nothing |
| E2E | 0 | 0 | Nothing |

**Root Cause:** Rapid prototyping phase. `data-testid` attributes indicate test intent but no follow-through.

**Impact:** Affects TD-007, TD-008. Any refactoring is risky without tests.

### 3.4 Type Safety Erosion (Systemic)

TypeScript is used throughout but undermined by widespread `any` usage:

- 27 `as any` instances in frontend across 9 files (per UX specialist verification)
- Additional `as any` instances in server-side code
- `battles: any[]` in domain logic and storage layer
- `req: any` in route handlers
- `fetchAPI<any>` in client API calls

**Root Cause:** Speed of development prioritized over type accuracy.

**Impact:** Affects TD-029. Should be addressed progressively alongside file decompositions.

### 3.5 Database Integrity Gaps (Systemic -- added per specialist reviews)

Multiple database integrity issues stem from the same root cause: rapid prototyping that prioritized "make it work" over "make it safe":

- Dual notification tables (TD-012) -- built notification_preferences as a second system without removing the first
- No unique constraint on subscriptions (TD-015) -- SELECT-then-INSERT pattern instead of UPSERT
- No CHECK constraints (TD-026) -- all validation Zod-only, no defense in depth
- No updated_at trigger (TD-013) -- manual timestamps in 14 places
- runAsUser per-query overhead (TD-051) -- no session reuse

Per DB specialist: these issues compound with every new user and every new code path. A dedicated database integrity phase is recommended before cosmetic improvements.

### 3.6 Accessibility Gaps (Systemic -- added per specialist reviews)

Multiple WCAG violations exist across the frontend:

- No `aria-live` regions (TD-038)
- Keyboard-inaccessible cards (TD-054)
- No skip navigation (TD-043)
- Non-accessible charts (TD-056)
- No ErrorBoundary on several routes (TD-055)

**Root Cause:** Accessibility was not a priority during rapid prototyping.

**Impact:** Collectively, these create a poor experience for users with disabilities. Should be addressed as a grouped accessibility pass rather than individually.

---

## 4. Risk Matrix

### Severity x Probability (Updated)

```
                    HIGH Probability          MEDIUM Probability         LOW Probability
                 +-----------------------+------------------------+------------------------+
CRITICAL         | TD-005 (rate limit)   | TD-001 (routes.ts)     |                        |
Severity         | TD-008 (no FE tests)  | TD-007 (no API tests)  |                        |
                 | TD-004 (/push 404)    | TD-006 (no CORS)       |                        |
                 | TD-009 (auth i18n)    | TD-002 (decks.tsx)     |                        |
                 | TD-012 (notif dupl.)  | TD-003 (me.tsx)        |                        |
                 | TD-013 (updated_at)   |                        |                        |
                 +-----------------------+------------------------+------------------------+
HIGH             | TD-010 (me.tsx i18n)   | TD-015 (subs unique)  | TD-019 (pool config)   |
Severity         | TD-011 (goals isPt)    | TD-018 (timeouts)     | TD-022 (migrations)    |
                 | TD-016 (dual toasts)   | TD-014 (indexes)      |                        |
                 | TD-017 (login redir.)  | TD-020 (dark toggle)   |                        |
                 | TD-034 (404 unreadable)| TD-021 (route guard)   |                        |
                 +-----------------------+------------------------+------------------------+
MEDIUM           | TD-029 (any types)    | TD-027 (unbounded)     | TD-036 (timestamptz)   |
Severity         | TD-031 (hook toasts)  | TD-028 (meta refresh)  | TD-038 (aria-live)     |
                 | TD-037 (format dupl.) | TD-024 (code split)    | TD-033 (fav stale)     |
                 | TD-051 (runAsUser)    | TD-025 (bootstrap dup) | TD-055 (ErrorBoundary) |
                 | TD-054 (keyboard a11y)| TD-023 (settings.tsx)  | TD-059 (XSS)           |
                 | TD-057 (no logging)   | TD-026 (CHECK constr.) | TD-060 (Stripe verify) |
                 |                       | TD-032 (N+1 auth)     |                        |
                 |                       | TD-035 (server i18n)  |                        |
                 +-----------------------+------------------------+------------------------+
LOW              | TD-039 (dead files)   | TD-040 (unused shadcn) | TD-048 (idx naming)    |
Severity         | TD-045 (copyright)    | TD-041 (clash_tag)     | TD-044 (dead CSS)      |
                 | TD-046 (avatar)       | TD-042 (images)        | TD-049 (dead script)   |
                 | TD-050 (isMobile)     | TD-043 (skip nav)      | TD-053 (nullable ts)   |
                 | TD-030 (framer-motion)| TD-047 (push i18n)     | TD-061 (WS unused)     |
                 | TD-062 (magic nums)   | TD-056 (charts a11y)   |                        |
                 |                       | TD-052 (push_analyses) |                        |
                 |                       | TD-058 (health check)  |                        |
                 +-----------------------+------------------------+------------------------+
```

### Business Impact Assessment

| Risk Area | Current Impact | Future Impact If Unaddressed |
|-----------|---------------|------------------------------|
| **Security** (TD-005, TD-006, TD-059, TD-060) | Low (low traffic) | CRITICAL at scale -- API abuse, cost amplification, potential XSS |
| **Maintainability** (TD-001, TD-002, TD-003) | HIGH (dev velocity already impacted) | Exponential -- each new feature makes god-files worse |
| **User Experience** (TD-004, TD-017, TD-020, TD-034) | MEDIUM (users hit broken flows) | HIGH -- churn from first-use friction |
| **i18n** (TD-009, TD-010, TD-011) | MEDIUM (BR-only market) | HIGH when expanding to non-Portuguese markets |
| **Data Integrity** (TD-012, TD-013, TD-015) | MEDIUM (compounds with each new user) | HIGH -- race conditions, stale timestamps, inconsistent notifications at scale |
| **Performance** (TD-014, TD-028, TD-032, TD-051) | LOW (small data volumes) | MEDIUM -- degradation correlates with user growth |
| **Operations** (TD-057, TD-058) | LOW (small user base) | HIGH -- debugging production issues without structured logging is exponentially harder at scale |

### Security Risk Ranking

| Priority | Item | Risk |
|:--------:|------|------|
| 1 | TD-005: No rate limiting | API abuse, cost amplification, DoS |
| 2 | TD-006: No CORS | Cross-origin exploitation |
| 3 | TD-060: Stripe webhook verification unclear | Potential billing state manipulation |
| 4 | TD-059: No XSS protection on text fields | Stored XSS risk |
| 5 | TD-018: No request timeouts | Resource exhaustion on serverless |
| 6 | TD-019: No pool limits | Connection exhaustion under load |
| 7 | TD-015: Subscription race condition | Billing state corruption |

---

## 5. Remediation Roadmap (FINAL)

### Migration Strategy Preamble

Per DB specialist recommendations, all database schema changes should follow a dual-track approach:

- **Track 1 (Drizzle):** Use `drizzle-kit generate` + `drizzle-kit migrate` for ORM-managed schema changes (tables, columns, indexes, constraints).
- **Track 2 (SQL scripts):** Keep `rls-and-triggers.sql` and `decks-migrations.sql` for Supabase-specific features (RLS policies, triggers, grants, functions). Run via `npm run supabase:apply`.
- **Connection URLs:** Use `DATABASE_MIGRATIONS_URL` (direct/non-pooled) for migrations. Use `DATABASE_URL` (pooled via PgBouncer) for the application.
- **Pre-migration checks:** Before schema migrations, verify against staging. For constraint additions (UNIQUE, CHECK), run a query to check for existing violations. For column drops, verify no application code references the column.
- **Backup policy:** Take a full database backup before any destructive migration (TD-012 consolidation, TD-015 orphan cleanup). Verify PITR is enabled on the Supabase project.

### Phase 1: Critical Fixes and Quick Wins (Week 1)

**Goal:** Eliminate blockers, security gaps, broken functionality, and high-impact quick wins.

| Order | Item | Effort | Impact |
|:-----:|------|:------:|--------|
| 1.1 | TD-004: Add `/push` route to App.tsx | S | Unblocks Push feature entirely |
| 1.2 | TD-006: Add CORS configuration | S | Security baseline |
| 1.3 | TD-005: Add global rate limiting middleware | S | Security baseline (per-route tuning in Phase 2) |
| 1.4 | TD-013: Add `updated_at` trigger | S | CRITICAL data integrity quick win |
| 1.5 | TD-014: Add missing composite indexes | S | Performance quick win |
| 1.6 | TD-019: Configure connection pool limits | S | Infrastructure hardening |
| 1.7 | TD-034: Fix not-found.tsx (background + text colors) | S | Visual fix for unreadable 404 page |
| 1.8 | TD-009: Migrate auth.tsx to i18n | S | CRITICAL first-touch fix for international users |
| 1.9 | TD-020: Remove non-functional dark mode toggle | S | UX quality fix |
| 1.10 | TD-039: Delete dead duplicate files | S | Codebase hygiene |
| 1.11 | TD-030: Remove framer-motion dependency | S | Dependency cleanup |
| 1.12 | TD-061: Remove unused WebSocket dependency | S | Dependency cleanup |
| 1.13 | TD-049: Delete dead Replit script | S | Dead code cleanup |
| 1.14 | TD-045: Fix copyright year | S | Cosmetic fix |
| 1.15 | TD-046: Fix sidebar avatar | S | UX fix |
| 1.16 | TD-050: Fix useIsMobile initial state | S | Mobile UX fix |

**Estimated effort:** ~4-5 days total (16 items, all S-effort except TD-005 at S for global-only).

### Phase 2: Structural Improvements (Week 2-3)

**Goal:** Decompose backend god-file, establish testing and migration infrastructure.

| Order | Item | Effort | Impact |
|:-----:|------|:------:|--------|
| 2.1 | TD-001: Split `routes.ts` into modules | XL | Foundational -- unblocks API testing |
| 2.2 | TD-022: Introduce versioned migrations (dual-track) | M | Unblocks safe schema changes |
| 2.3 | TD-021: Create `<PrivateRoute>` wrapper | M | Simplifies routing, unblocks code splitting and ErrorBoundary |
| 2.4 | TD-008: Add E2E test infrastructure (Playwright) | L | Test foundation for critical flows |
| 2.5 | TD-018: Add request timeouts to external calls | M | Resilience improvement |
| 2.6 | TD-025: Refactor bootstrapUserData | S | Code quality -- prerequisite for TD-012 |
| 2.7 | TD-037: Extract shared formatters | S | Code quality |
| 2.8 | TD-005 (Phase 2): Add per-route rate limits | M | Security hardening (after route split) |
| 2.9 | TD-057: Add structured logging framework | M | Operational foundation |

**Estimated effort:** ~10-14 days total.
**Dependency chain:** TD-001 must complete before TD-007 and TD-005 per-route tuning. TD-025 must complete before TD-012.

### Phase 3: Database Integrity + i18n Sweep + Frontend Decomposition (Week 3-5)

**Goal:** Fix data integrity issues (which compound with user growth), complete i18n sweep, decompose frontend god-files.

Per QA Gate and DB specialist recommendation, database integrity items are interleaved into this phase rather than deferred. Data integrity issues get worse with every new user and should take precedence over cosmetic improvements.

#### Phase 3A: Database Integrity + Toast Unification (Week 3)

| Order | Item | Effort | Impact |
|:-----:|------|:------:|--------|
| 3A.1 | TD-016: Unify toast system (remove Sonner) | M | Prerequisite for hook i18n fix |
| 3A.2 | TD-015: Add unique constraint on subscriptions.user_id | L | Data integrity -- race condition fix |
| 3A.3 | TD-012: Consolidate notification preferences | XL | CRITICAL data integrity fix |
| 3A.4 | TD-026: Add CHECK constraints | S | Defense in depth |

**Pre-conditions for 3A.2 and 3A.3:** Full database backup. Verify PITR is enabled.

#### Phase 3B: Frontend Decomposition + i18n (Week 3-4)

| Order | Item | Effort | Impact |
|:-----:|------|:------:|--------|
| 3B.1 | TD-003 + TD-010: Decompose me.tsx + fix i18n | XL | Biggest frontend debt item |
| 3B.2 | TD-002: Decompose decks.tsx | L | Second biggest frontend debt item |

#### Phase 3C: i18n Completion (Week 4-5)

| Order | Item | Effort | Impact |
|:-----:|------|:------:|--------|
| 3C.1 | TD-011: Migrate goals.tsx from isPt to t() | M | 46 ternaries eliminated |
| 3C.2 | TD-031: Fix hook toast i18n | S | After TD-016 |
| 3C.3 | TD-047: Fix push.tsx i18n | S | Minor page fix |
| 3C.4 | TD-035: Fix server-side notification i18n | M | Billing notifications |

**Estimated effort (Phase 3 total):** ~14-22 days.
**Dependency chain:** TD-016 before TD-031. TD-003 and TD-010 together. TD-022 (Phase 2) before TD-015, TD-012, TD-026.

### Phase 4: Performance, Optimization, and Remaining Medium Items (Week 5-6)

**Goal:** Performance improvements, type safety, and remaining structural items.

| Order | Item | Effort | Impact |
|:-----:|------|:------:|--------|
| 4.1 | TD-027: Implement data retention policies | M | Unbounded growth prevention |
| 4.2 | TD-028: Move meta refresh to cron job | M | Performance |
| 4.3 | TD-032: Consolidate N+1 auth queries | M | Performance |
| 4.4 | TD-051: Implement runAsUser session pattern | L | Performance / pool pressure |
| 4.5 | TD-033: Fix favorite_players staleness | M | Data freshness |
| 4.6 | TD-029: Eliminate `any` types | L | Type safety |
| 4.7 | TD-023: Decompose settings.tsx | M | Maintainability |
| 4.8 | TD-024: Implement code splitting | M | Performance |
| 4.9 | TD-055: Add ErrorBoundary to all routes | M | Robustness |
| 4.10 | TD-059: Add XSS protection on text fields | M | Security |
| 4.11 | TD-060: Verify/add Stripe webhook signature | S-M | Security |

**Estimated effort:** ~12-18 days total.

### Phase 5: Polish and Long-Term Quality (Week 6+)

**Goal:** Address remaining low items, accessibility, establish ongoing quality.

| Order | Item | Effort | Impact |
|:-----:|------|:------:|--------|
| 5.1 | TD-007: Add API integration tests | XL | After TD-001 |
| 5.2 | TD-017: Fix login redirect for returning users | S | UX |
| 5.3 | TD-038: Add aria-live regions | M | Accessibility |
| 5.4 | TD-054: Fix keyboard-inaccessible cards | M | Accessibility |
| 5.5 | TD-043: Add skip navigation link | S | Accessibility |
| 5.6 | TD-056: Make Recharts accessible | M | Accessibility |
| 5.7 | TD-040: Remove unused shadcn components | M | Cleanup |
| 5.8 | TD-036: Migrate to timestamptz | S-M | Future-proofing |
| 5.9 | TD-041: Deprecate clash_tag column | S | Schema cleanup |
| 5.10 | TD-042: Image optimization | S | Performance |
| 5.11 | TD-044: Remove dead CSS | S | Cleanup |
| 5.12 | TD-048: Standardize index naming | S | Convention |
| 5.13 | TD-052: push_analyses retention (part of TD-027) | S | Cleanup |
| 5.14 | TD-053: battle_history.created_at NOT NULL | S | Data integrity |
| 5.15 | TD-058: Add health check endpoint | S | Operations |
| 5.16 | TD-062: Extract free tier limits to constants | S | Maintainability |

**Estimated effort:** ~15-22 days total (can be addressed incrementally as backlog).

### Dependency Graph Summary (Updated)

```
Phase 1 (Week 1) ──────────────────────────────────────────────────────
  TD-004 (push route)                [standalone]
  TD-005 (global rate limiting)      [standalone -- per-route in Phase 2]
  TD-006 (CORS)                      [standalone]
  TD-009 (auth i18n)                 [standalone -- quick win]
  TD-013 (updated_at trigger)        [standalone]
  TD-014 (missing indexes)           [standalone]
  TD-019 (pool config)               [standalone] ─────> TD-015 (implicit)
  TD-020 (dark toggle removal)       [standalone]
  Quick wins (TD-030/034/039/045/046/049/050/061)  [standalone]

Phase 2 (Week 2-3) ────────────────────────────────────────────────────
  TD-001 (split routes) ─────────────┬──> TD-007 (API tests) [Phase 5]
                                     ├──> TD-035 (server i18n) [Phase 3C]
                                     └──> TD-005 per-route [Phase 2.8]
  TD-022 (migrations) ──────────────┬──> TD-015 (subs unique) [Phase 3A]
                                    ├──> TD-012 (notif consolidate) [Phase 3A]
                                    ├──> TD-026 (CHECK constraints) [Phase 3A]
                                    ├──> TD-036 (timestamptz) [Phase 5]
                                    ├──> TD-041 (deprecate clash_tag) [Phase 5]
                                    └──> TD-048 (index naming) [Phase 5]
  TD-025 (bootstrap refactor) ─────────> TD-012 (notif consolidate) [Phase 3A]
  TD-021 (PrivateRoute) ───────────┬──> TD-024 (code splitting) [Phase 4]
                                   └──> TD-055 (ErrorBoundary) [Phase 4]
  TD-008 (E2E tests)               [standalone]
  TD-057 (logging)                 [standalone]

Phase 3 (Week 3-5) ────────────────────────────────────────────────────
  TD-016 (unify toasts) ───────────────> TD-031 (hook i18n) [Phase 3C]
  TD-003 + TD-010 (me.tsx decompose + i18n)  [best done together]
  TD-012, TD-015  (require TD-022 + TD-025 from Phase 2)
  TD-027 (retention) ──────────────────> TD-052 (push_analyses) [Phase 5]

Phase 4 (Week 5-6) ────────────────────────────────────────────────────
  TD-032 (N+1 auth) ──────────────────> TD-051 (runAsUser session)
  TD-001 (routes split) ──────────────> TD-051 (benefits from)
```

---

## 6. Metrics & Health Scores

### Individual Dimension Scores

| Dimension | Score | Rationale |
|-----------|:-----:|-----------|
| **Architecture** | 5 / 10 | Good fundamentals (shared schema, domain modules, RLS pattern, error handling). Severely undermined by god-file pattern, no service layer, no rate limiting, no CORS, no request timeouts, no structured logging. |
| **Database** | 7 / 10 | Solid foundation: proper FKs, cascade deletes, comprehensive RLS policies, battle deduplication, advisory locks. Gaps: notification duplication (CRITICAL), missing CHECK constraints, no migration versioning, unbounded table growth, missing indexes, no updated_at trigger. |
| **Frontend** | 5 / 10 | Good patterns (React Query, consistent layout, error boundaries, i18n architecture). Severely undermined by god-files, broken i18n adoption, unreachable route, dual toast systems, no code splitting, non-functional dark toggle, accessibility gaps. |
| **Security** | 4 / 10 | Strong auth (JWKS verification, RLS), good input validation (Zod), price ID whitelist. Critical gaps: no rate limiting, no CORS, no request timeouts, no pool limits, unclear Stripe webhook verification, partial XSS protection. |
| **Test Coverage** | 2 / 10 | 23 tests total (5 files). Domain logic tests are well-written. Zero API integration tests, zero frontend tests, zero E2E tests. |
| **i18n Compliance** | 5 / 10 | The i18n system is well-designed. Adoption is inconsistent: ~8 pages fully translated, 3 pages hardcoded Portuguese, 1 page uses 46 isPt ternaries, hooks bypass i18n (14 strings), server notifications hardcoded (3 strings). |
| **Performance** | 6 / 10 | React Query caching, advisory locks, manual sync. Gaps: no code splitting, meta refresh in request path, N+1 auth queries, runAsUser per-query overhead, no image optimization. |
| **DevOps** | 5 / 10 | Vercel deployment works. Build pipeline solid. Gaps: no migration versioning, no health check endpoint, no structured logging, no CI/CD quality gates, dead dependencies. |

### Overall Health Score

```
Architecture:   5/10  (weight: 20%)  =  1.00
Database:       7/10  (weight: 15%)  =  1.05
Frontend:       5/10  (weight: 20%)  =  1.00
Security:       4/10  (weight: 15%)  =  0.60
Test Coverage:  2/10  (weight: 10%)  =  0.20
i18n:           5/10  (weight:  5%)  =  0.25
Performance:    6/10  (weight: 10%)  =  0.60
DevOps:         5/10  (weight:  5%)  =  0.25
─────────────────────────────────────────────
OVERALL:        4.95 / 10  ≈  5.0 / 10
```

### Comparison with Previous Assessments

| Assessment | Date | Score | Delta |
|-----------|------|:-----:|:-----:|
| State Report (initial audit) | 2026-01-16 | 6.5 / 10 | -- |
| DB Audit (Phase 2) | 2026-02-27 | 7.0 / 10 | (DB-specific) |
| This Assessment (weighted, final) | 2026-02-27 | 5.0 / 10 | -1.5 from State Report |

**Note:** The lower score reflects a more rigorous, weighted assessment that penalizes the critical security and testing gaps more heavily. The database layer improved (mock data removal, real meta decks), but the overall picture is more nuanced when security, testing, and i18n are properly weighted.

### Target Scores (Post-Remediation)

| Dimension | Current | After Phase 1 | After Phase 2 | After Phase 3 | After Phase 4 | After Phase 5 |
|-----------|:-------:|:-------------:|:-------------:|:-------------:|:-------------:|:-------------:|
| Architecture | 5 | 6 | 7 | 7 | 7.5 | 8 |
| Database | 7 | 7.5 | 8 | 9 | 9 | 9.5 |
| Frontend | 5 | 5.5 | 6 | 8 | 8.5 | 9 |
| Security | 4 | 7 | 8 | 8 | 8.5 | 8.5 |
| Testing | 2 | 2 | 4 | 4 | 4 | 7 |
| i18n | 5 | 6 | 6 | 9 | 9 | 9 |
| Performance | 6 | 6.5 | 6.5 | 6.5 | 8 | 8 |
| DevOps | 5 | 5.5 | 7 | 7 | 7 | 8 |
| **OVERALL** | **5.0** | **5.9** | **6.6** | **7.5** | **7.8** | **8.4** |

### Monitoring Recommendations (per DB specialist)

After remediation, establish ongoing monitoring:

1. **Table size monitoring:** Weekly check for row counts on `coach_messages`, `battle_history`, `push_analyses`, `deck_suggestions_usage`. Alert if any exceeds 1M rows without retention policy.
2. **Connection pool saturation:** Log `pool.totalCount`, `pool.idleCount`, `pool.waitingCount` periodically. Alert if `waitingCount > 0` persists > 30s.
3. **Query latency:** Instrument `runAsUser` to log execution time. Alert if any query consistently exceeds 500ms.
4. **Orphan data detection:** After TD-015, add weekly check for orphan patterns (e.g., `notification_preferences` without matching `user_settings`).

---

## 7. Change Log (DRAFT to FINAL)

### Severity Changes Applied

| TD-ID | DRAFT Severity | FINAL Severity | Source | Justification |
|-------|:--------------:|:--------------:|--------|---------------|
| TD-009 | HIGH | CRITICAL | UX specialist + QA Gate | Auth page is 100% of users' first touch; 18 hardcoded Portuguese strings block international entry |
| TD-012 | HIGH | CRITICAL | DB specialist + QA Gate | Active dual-table consistency hazard with settingsUpdateInputSchema accepting conflicting values |
| TD-013 | HIGH | CRITICAL | DB specialist + QA Gate | 14 manual updatedAt calls with no trigger safety net; clock skew risk is real |
| TD-034 | MEDIUM | HIGH | UX specialist + QA Gate | 404 page has invisible text (not just wrong background); combined with TD-004 affects all Push users |
| TD-036 | MEDIUM | LOW | DB specialist + QA Gate | Near-zero practical risk in UTC-only Supabase environment |

### Effort Re-estimates Applied

| TD-ID | DRAFT Effort | FINAL Effort | Source | Justification |
|-------|:------------:|:------------:|--------|---------------|
| TD-009 | M (2-8h) | S (< 2h) | UX specialist | 169-line file, ~18 string replacements |
| TD-012 | L (1-3d) | XL (2-4d) | DB specialist | 7 change points across 4 files + production data migration |
| TD-015 | M (2-8h) | L (1-2d) | DB specialist | Production data cleanup is the bottleneck |
| TD-017 | M (2-8h) | S (< 2h) | UX specialist | ~15-20 line change in auth.tsx |

### Factual Corrections Applied

| TD-ID | Correction | Source |
|-------|-----------|--------|
| TD-011 | isPt count: 43 -> 46 | UX specialist |
| TD-029 | Clarified: 27 `as any` in frontend (9 files); 50+ is full-stack total | UX specialist |
| TD-031 | Hook toast count: ~10 -> 14 | UX specialist |
| TD-032 | Clarified two code paths: 5-query only when bootstrapUserData NOT called | DB specialist |
| TD-034 | Added `text-gray-900` and `text-gray-600` as broken classes (not just background) | UX specialist |
| TD-047 | String count: ~5 -> 3 Portuguese + 1 English | UX specialist |
| Health Score | Executive Summary: 5.8 -> 5.0 (matches weighted calculation) | QA Gate |

### New Items Added (12)

| TD-ID | Title | Severity | Source |
|-------|-------|:--------:|--------|
| TD-051 | `runAsUser` per-query transaction overhead | MEDIUM | DB specialist (Phase 5) |
| TD-052 | `push_analyses` lacks explicit retention policy | LOW | DB specialist (Phase 5) |
| TD-053 | `battle_history.created_at` is nullable | LOW | DB specialist (Phase 5) |
| TD-054 | Keyboard-inaccessible clickable cards | MEDIUM | UX specialist (Phase 6) |
| TD-055 | ErrorBoundary inconsistency across routes | MEDIUM | UX specialist (Phase 6) |
| TD-056 | Recharts not screen-reader accessible | LOW | UX specialist (Phase 6) |
| TD-057 | No structured logging framework | MEDIUM | QA Gate (Phase 7, Gap G3) |
| TD-058 | No health check endpoint | LOW | QA Gate (Phase 7, Gap G4) |
| TD-059 | No XSS protection on text fields | MEDIUM | QA Gate (Phase 7, Gap G8) |
| TD-060 | Stripe webhook signature verification unclear | MEDIUM | QA Gate (Phase 7, Gap G6) |
| TD-061 | WebSocket dependency unused | LOW | QA Gate (Phase 7, Gap G5) |
| TD-062 | Hardcoded free tier limits (magic numbers) | LOW | QA Gate (Phase 7, Gap G2) |

### ID Collision Resolution

Both specialist reviews proposed new items starting at TD-051, creating ID collisions. Resolution:

| Original ID | FINAL ID | Item | Source |
|-------------|----------|------|--------|
| DB TD-051 | **TD-051** | `runAsUser` per-query transaction overhead | @data-engineer |
| DB TD-052 | **TD-052** | `push_analyses` retention policy | @data-engineer |
| DB TD-053 | **TD-053** | `battle_history.created_at` nullable | @data-engineer |
| UX TD-051 | **TD-054** | Keyboard-inaccessible clickable cards | @ux-design-expert |
| UX TD-052 | **TD-055** | ErrorBoundary inconsistency across routes | @ux-design-expert |
| UX TD-053 | **TD-056** | Recharts not screen-reader accessible | @ux-design-expert |

Rationale: Database items receive lower IDs (database integrity is foundational); frontend/UX items receive higher IDs.

### Dependencies Added

| Dependency | Source |
|-----------|--------|
| TD-025 -> TD-012 (bootstrap refactor before notification consolidation) | DB specialist |
| TD-019 -> TD-015 (pool config before long-running cleanup query) | DB specialist |
| TD-021 -> TD-055 (PrivateRoute enables consistent ErrorBoundary) | UX specialist |

### Roadmap Changes

| Change | Source |
|--------|--------|
| TD-009 moved from Phase 3 to Phase 1 (quick win) | UX specialist + QA Gate |
| TD-020 moved from Phase 5 to Phase 1 (quick win) | UX specialist + QA Gate |
| TD-012 and TD-015 moved from Phase 4 to Phase 3A (interleaved with i18n) | DB specialist + QA Gate |
| TD-005 split into Phase 1 (global) + Phase 2 (per-route after route split) | QA Gate |
| TD-057 (logging) added to Phase 2 | QA Gate |
| Phase 3 restructured into 3A (DB integrity + toasts), 3B (decomposition), 3C (i18n completion) | @architect incorporating all feedback |

### Items Deferred with Justification

| Item | Deferred? | Justification |
|------|-----------|---------------|
| QA Gap G1 (No API versioning) | Not added | Single consumer (SPA). API versioning is a future concern, not active debt. |
| QA Gap G7 (Weak path parameter validation) | Not added as standalone | LOW severity, partially mitigated by Zod validation. Can be addressed as part of TD-001 route split. |
| UX TD-024 severity downgrade to LOW | Not applied | UX specialist suggested MEDIUM->LOW for code splitting. QA Gate did not flag. MEDIUM is retained as the gaming niche has mixed connection speeds. |

---

## 8. Appendix

### 8.1 Source Document Cross-Reference

| TD Item | Phase 1 (Architecture) | Phase 2 (DB Audit) | Phase 3 (Frontend) | State Report | Phase 5 (DB Review) | Phase 6 (UX Review) | Phase 7 (QA Gate) |
|---------|:---------------------:|:------------------:|:------------------:|:------------:|:-------------------:|:-------------------:|:-----------------:|
| TD-001 | W-01, W-02 | -- | -- | Top 10 #5 | -- | -- | -- |
| TD-002 | -- | -- | C2 | File sizes | -- | Reviewed | -- |
| TD-003 | -- | -- | C1 | Top 10 #4 | -- | Reviewed | -- |
| TD-004 | -- | -- | C3 | -- | -- | Reviewed | -- |
| TD-005 | W-03, Sec.13 | -- | -- | -- | -- | -- | -- |
| TD-006 | W-04, Sec.13 | -- | -- | -- | -- | -- | -- |
| TD-007 | W-11 | -- | -- | Top 10 #3 | -- | -- | -- |
| TD-008 | -- | -- | data-testid | Top 10 #1a | -- | Reviewed | -- |
| TD-009 | -- | -- | C4, Sec.8.3 | -- | -- | Severity UP | MF-3 |
| TD-010 | -- | -- | Sec.8.3 | i18n violations | -- | Reviewed | -- |
| TD-011 | -- | -- | H1, Sec.8.3 | -- | -- | Count fix (46) | MF-12 |
| TD-012 | -- | C1, Sec.1.1 | -- | -- | Severity UP, Effort UP | -- | MF-1, MF-6 |
| TD-013 | -- | C2 | -- | -- | Severity UP | -- | MF-2 |
| TD-014 | -- | H1, Sec.2.2 | -- | -- | Reviewed | -- | -- |
| TD-015 | -- | H2, Sec.3.2 | -- | -- | Effort UP | -- | MF-7 |
| TD-016 | -- | -- | H2, Sec.8.4 | -- | -- | Reviewed | -- |
| TD-017 | -- | -- | H3, Sec.9.2 | -- | -- | Effort DOWN | MF-9 |
| TD-018 | W-06 | -- | -- | -- | -- | -- | -- |
| TD-019 | W-08 | Sec.5.5 | -- | -- | Reviewed | -- | -- |
| TD-020 | -- | -- | H5, Sec.7.5 | -- | -- | Phase 1 | SF (roadmap) |
| TD-021 | -- | -- | H6, Sec.6.3 | -- | -- | Reviewed | -- |
| TD-022 | -- | M2, Sec.6.1 | -- | -- | Reviewed | -- | -- |
| TD-023 | -- | -- | M6 | File sizes | -- | Reviewed | -- |
| TD-024 | -- | -- | H4, Sec.11 | -- | -- | Reviewed | -- |
| TD-025 | W-05 | M1, Sec.7.4 | -- | -- | Prereq for TD-012 | -- | MF-14 |
| TD-026 | -- | H3, Sec.3.2 | -- | -- | Reviewed | -- | -- |
| TD-027 | -- | H4, Sec.5.3 | -- | -- | Detailed per-table | -- | -- |
| TD-028 | W-09 | -- | -- | -- | -- | -- | -- |
| TD-029 | W-10, W-18 | L4 | M1 | -- | -- | Count fix (27 FE) | MF-12 |
| TD-030 | Tech stack | -- | M2, Sec.11.1 | -- | -- | Reviewed | -- |
| TD-031 | -- | -- | M3, Sec.5 | -- | -- | Count fix (14) | MF-12 |
| TD-032 | -- | M5, Sec.5.2 | -- | -- | Clarification | -- | SF-6 |
| TD-033 | -- | M3, Sec.1.1 | -- | -- | Reviewed | -- | -- |
| TD-034 | -- | -- | M4 | -- | -- | Severity UP | MF-4 |
| TD-035 | -- | -- | -- | i18n violations | -- | -- | -- |
| TD-036 | -- | M6, Sec.1.3 | -- | -- | Severity DOWN | -- | MF-5 |
| TD-037 | -- | -- | M7 | -- | -- | Reviewed | -- |
| TD-038 | -- | -- | M5, Sec.10 | -- | -- | Reviewed | -- |
| TD-039 | W-12 | -- | H7 | -- | -- | -- | -- |
| TD-040 | -- | -- | L1, Sec.3.1 | -- | -- | Reviewed | -- |
| TD-041 | -- | L1, Sec.1.1 | -- | -- | Reviewed | -- | -- |
| TD-042 | -- | -- | L2, Sec.11.4 | -- | -- | Reviewed | -- |
| TD-043 | -- | -- | L3, Sec.10 | -- | -- | Reviewed | -- |
| TD-044 | -- | -- | L4, Sec.7.3 | -- | -- | Reviewed | -- |
| TD-045 | -- | -- | L5 | -- | -- | -- | -- |
| TD-046 | -- | -- | L6 | -- | -- | -- | -- |
| TD-047 | -- | -- | L7 | -- | -- | Count fix (3+1) | MF-12 |
| TD-048 | -- | L3, Sec.1.2 | -- | -- | Reviewed | -- | -- |
| TD-049 | -- | L2 | -- | -- | Reviewed | -- | -- |
| TD-050 | -- | -- | L8 | -- | -- | Reviewed | -- |
| TD-051 | -- | Sec.7.2 | -- | -- | NEW | -- | MF-10 |
| TD-052 | -- | Sec.5.3 | -- | -- | NEW | -- | MF-10 |
| TD-053 | -- | Sec.3.3 | -- | -- | NEW | -- | MF-10 |
| TD-054 | -- | -- | Sec.10.2 | -- | -- | NEW | MF-10 |
| TD-055 | -- | -- | Sec.6.2 | -- | -- | NEW | MF-10 |
| TD-056 | -- | -- | Sec.10.4 | -- | -- | NEW | MF-10 |
| TD-057 | W-15 | -- | -- | -- | -- | -- | Gap G3 |
| TD-058 | W-16 | -- | -- | -- | -- | -- | Gap G4 |
| TD-059 | Sec.13 | -- | -- | -- | -- | -- | Gap G8 |
| TD-060 | W-07 | -- | -- | -- | -- | -- | Gap G6 |
| TD-061 | W-17 | -- | -- | -- | -- | -- | Gap G5 |
| TD-062 | W-14 | -- | -- | -- | -- | -- | Gap G2 |

### 8.2 Review Incorporation Checklist

| # | QA Gate Item | Applied? | Notes |
|---|-------------|:--------:|-------|
| MF-1 | Upgrade TD-012 to CRITICAL | YES | |
| MF-2 | Upgrade TD-013 to CRITICAL | YES | |
| MF-3 | Upgrade TD-009 to CRITICAL | YES | |
| MF-4 | Upgrade TD-034 to HIGH | YES | Added text-gray-900 and text-gray-600 to description |
| MF-5 | Downgrade TD-036 to LOW | YES | |
| MF-6 | Re-estimate TD-012 L -> XL | YES | |
| MF-7 | Re-estimate TD-015 M -> L | YES | |
| MF-8 | Re-estimate TD-009 M -> S | YES | |
| MF-9 | Re-estimate TD-017 M -> S | YES | |
| MF-10 | Add 6 new specialist items (TD-051-056) | YES | IDs resolved per collision scheme |
| MF-11 | Add TD-057 (structured logging) | YES | |
| MF-12 | Correct factual errors | YES | TD-011 (46), TD-029 (27 FE), TD-031 (14), TD-047 (3+1) |
| MF-13 | Fix health score to 5.0/10 | YES | |
| MF-14 | Add TD-025 as prerequisite for TD-012 | YES | |
| MF-15 | Move TD-009 and TD-020 to Phase 1 | YES | |
| SF-1 | Add TD-058 (health check) | YES | LOW |
| SF-2 | Add TD-059 (XSS protection) | YES | MEDIUM |
| SF-3 | Add TD-060 (Stripe webhook verify) | YES | MEDIUM |
| SF-4 | Add TD-061 (WebSocket unused) | YES | LOW |
| SF-5 | Add TD-062 (magic numbers) | YES | LOW |
| SF-6 | Clarify TD-032 description | YES | Two code paths documented |
| SF-7 | Add migration strategy guidance | YES | Roadmap preamble |
| SF-8 | Add backup/recovery checklist | YES | Phase 3A pre-conditions |
| SF-9 | Note pooler URL in TD-019 | YES | |
| SF-10 | Interleave DB integrity into Phase 3 | YES | Phase 3A created |
| SF-11 | Update counts and effort totals | YES | 62 items, ~56-90 days |
| NH-1 | Add component decomposition structures | PARTIAL | Referenced in remediation text |
| NH-2 | Add monitoring/alerting suggestions | YES | Section 6, Monitoring Recommendations |
| NH-3 | Add i18n completion strategy | PARTIAL | Reflected in Phase 3C ordering |
| NH-4 | Add DB execution order as roadmap sub-section | YES | Integrated into Phase ordering |

### 8.3 DB Specialist Execution Order (Reference)

Per @data-engineer's recommended execution order for database items:

```
Phase 1 (Quick Wins):
  1. TD-013 -- Add updated_at trigger
  2. TD-014 -- Add missing composite indexes
  3. TD-019 -- Configure connection pool
  4. TD-049 -- Delete dead Replit script

Phase 2 (Structural):
  5. TD-022 -- Introduce versioned migrations
  6. TD-025 -- Refactor bootstrapUserData

Phase 3A (Integrity):
  7. TD-015 -- Add unique constraint on subscriptions.user_id
  8. TD-012 -- Consolidate notification preferences
  9. TD-026 -- Add CHECK constraints
  10. TD-027 -- Implement data retention policies

Phase 4 (Optimization):
  11. TD-032 -- Consolidate N+1 auth queries
  12. TD-033 -- Fix favorite_players staleness
  13. TD-051 -- runAsUser session pattern

Phase 5 (Polish):
  14. TD-036 -- Migrate to timestamptz
  15. TD-041 -- Deprecate clash_tag column
  16. TD-048 -- Standardize index naming
  17. TD-052 -- push_analyses retention
  18. TD-053 -- battle_history.created_at NOT NULL
```

---

*FINAL assessment generated by @architect (Aria) for Brownfield Discovery Phase 8.*
*Incorporates all MUST-FIX, SHOULD-FIX, and select NICE-TO-HAVE items from QA Gate (Phase 7).*
*This document supersedes the Phase 4 DRAFT and is the definitive source of truth for CRStats technical debt.*
*Next steps: Phase 9 (@analyst -- executive summary report), Phase 10 (@pm -- epic creation with stories mapped to the 5-phase roadmap).*
