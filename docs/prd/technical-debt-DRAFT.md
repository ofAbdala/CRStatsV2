# CRStats -- Technical Debt Assessment (DRAFT)

**Phase:** Brownfield Discovery -- Phase 4 (Technical Debt Consolidation)
**Agent:** @architect (Aria)
**Date:** 2026-02-27
**Status:** DRAFT -- Pending review by @data-engineer, @ux-design-expert, and @qa

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Debt Inventory (Master List)](#2-debt-inventory-master-list)
3. [Cross-Cutting Concerns](#3-cross-cutting-concerns)
4. [Risk Matrix](#4-risk-matrix)
5. [Remediation Roadmap (DRAFT)](#5-remediation-roadmap-draft)
6. [Metrics & Health Scores](#6-metrics--health-scores)

---

## 1. Executive Summary

### Project Health Score: 5.8 / 10

CRStats is a Clash Royale player analytics and coaching SaaS in early-production stage. Core flows (auth, player sync, billing, dashboard) are functional with real data and real API integrations. However, the project accumulates significant structural debt across architecture (god-files), frontend (decomposition, i18n), database (missing constraints), testing (near-zero coverage), and security (missing rate limiting, CORS).

### Debt Distribution by Severity

| Severity | Count | Estimated Total Effort |
|----------|------:|----------------------:|
| CRITICAL | 8 | ~12-20 days |
| HIGH | 14 | ~15-25 days |
| MEDIUM | 16 | ~12-20 days |
| LOW | 12 | ~5-8 days |
| **TOTAL** | **50** | **~44-73 days** |

### Top 5 Most Impactful Issues

| Rank | ID | Title | Why It Matters |
|:----:|------|-------|---------------|
| 1 | TD-001 | `routes.ts` god-file (3,874 lines) | Blocks testability, causes merge conflicts, couples HTTP to business logic. Every other backend improvement depends on splitting this file. |
| 2 | TD-005 | No rate limiting on any endpoint | Public proxy endpoints can be abused to exhaust Clash Royale API quota, and AI endpoints can be exploited for cost amplification. Security blocker for production. |
| 3 | TD-008 | Zero frontend test coverage | 18 pages, 11 hooks, 14 components -- all untested. Any change can silently break the UI. |
| 4 | TD-003 | `me.tsx` god-file (1,931 lines) | Largest frontend file with inline analytics, hardcoded strings, and duplicated business logic. Unmaintainable. |
| 5 | TD-012 | Notification settings duplication (`user_settings` vs `notification_preferences`) | Two tables store overlapping data with a fragile fallback chain. Data inconsistency risk for every user. |

### Estimated Remediation Effort (All Items)

- **Quick wins (< 2h each):** 12 items
- **Half-day to full-day (2-8h):** 18 items
- **Multi-day (1-3 days):** 14 items
- **Major (3+ days):** 6 items

---

## 2. Debt Inventory (Master List)

### CRITICAL Items

---

#### TD-001: `routes.ts` God-File (3,874 Lines)

- **Severity:** CRITICAL
- **Category:** Architecture
- **Source:** Phase 1 (system-architecture.md, W-01, W-02), State Report
- **Description:** All 46 API endpoints are defined in a single `registerRoutes()` function in `server/routes.ts`. Route handlers directly orchestrate storage calls, external API calls, domain logic, and response formatting. There is no service layer separating HTTP concerns from business logic.
- **Impact:** Impossible to write integration tests for individual route groups. Guaranteed merge conflicts with concurrent development. No route-level middleware composition. Extremely difficult to navigate (find a specific endpoint) or reason about side effects.
- **Affected Files:** `server/routes.ts` (3,874 lines)
- **Remediation:** Split into route modules: `routes/auth.ts`, `routes/player.ts`, `routes/coach.ts`, `routes/training.ts`, `routes/decks.ts`, `routes/billing.ts`, `routes/community.ts`, `routes/notifications.ts`, `routes/settings.ts`, `routes/public.ts`. Extract a thin service layer for orchestration logic that calls domain modules and storage.
- **Effort:** XL (3+ days)
- **Dependencies:** None -- this is a foundational improvement that unblocks TD-007 (API integration tests).

---

#### TD-002: `decks.tsx` God-File (1,397 Lines)

- **Severity:** CRITICAL
- **Category:** Frontend
- **Source:** Phase 3 (frontend-spec.md, C2), State Report
- **Description:** Single file contains the Meta Decks tab, Counter-Deck Builder, and Deck Optimizer with complex inline state management. All UI, state logic, and data transformations are co-located.
- **Impact:** Unmaintainable, slow IDE performance, impossible to test individual deck features in isolation.
- **Affected Files:** `client/src/pages/decks.tsx` (1,397 lines)
- **Remediation:** Extract `MetaDecksTab.tsx`, `CounterDeckBuilder.tsx`, `DeckOptimizer.tsx`, and shared `DeckDisplay.tsx` component. Aim for < 300 lines per file.
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
- **Remediation:** Decompose into `MeOverviewTab.tsx`, `MeBattlesTab.tsx`, `MeCardsTab.tsx`, `MeGoalsTab.tsx`, `TiltAnalysis.tsx`, `TrophyChart.tsx`. Migrate all hardcoded strings to `t()` calls. Consolidate duplicated push session logic with `shared/domain/` or `server/domain/syncRules.ts`.
- **Effort:** XL (3+ days)
- **Dependencies:** TD-010 (i18n -- me.tsx hardcoded strings) should be done simultaneously.

---

#### TD-004: `/push` Route is Unreachable (404)

- **Severity:** CRITICAL
- **Category:** Frontend
- **Source:** Phase 3 (frontend-spec.md, C3)
- **Description:** The Sidebar navigation links to `/push`, but `App.tsx` has no `<Route path="/push">` definition. Users who click "Push" in the sidebar see the 404 page.
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
- **Impact:** Public proxy routes can be abused to exhaust the Clash Royale API quota (rate limit from Supercell). AI endpoints can be exploited for OpenAI cost amplification. Potential for denial-of-service.
- **Affected Files:** `server/app.ts`, `server/routes.ts`
- **Remediation:** Add `express-rate-limit` middleware with: (1) global rate limit (100 req/min per IP), (2) stricter limits on AI endpoints (10 req/min per user), (3) stricter limits on public proxy routes (30 req/min per IP).
- **Effort:** M (2-8h)
- **Dependencies:** TD-001 (splitting routes) makes per-route rate limiting cleaner, but rate limiting can be added globally first.

---

#### TD-006: No CORS Configuration

- **Severity:** CRITICAL
- **Category:** Security
- **Source:** Phase 1 (system-architecture.md, W-04, Security Assessment)
- **Description:** No CORS headers are set in the Express server. The app relies entirely on Vercel's default same-origin behavior. This is fragile if the API is ever consumed from another domain, and provides no defense against cross-origin attacks in misconfigured environments.
- **Impact:** If the deployment domain changes or an attacker embeds the API in a malicious page, there is no origin restriction. Missing header could also cause issues with some browser preflight checks.
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

### HIGH Items

---

#### TD-009: `auth.tsx` Fully Hardcoded in Portuguese

- **Severity:** HIGH
- **Category:** i18n
- **Source:** Phase 3 (frontend-spec.md, C4), State Report
- **Description:** The authentication page (login + signup) contains approximately 15 hardcoded Portuguese strings with zero `t()` calls. This is the first interaction page for all users.
- **Impact:** English-speaking users see Portuguese text on the very first page they interact with. Complete i18n failure for the entry point of the application.
- **Affected Files:** `client/src/pages/auth.tsx` (169 lines)
- **Remediation:** Migrate all strings to translation keys. Add corresponding keys to `pt-BR.json` and `en-US.json`.
- **Effort:** M (2-8h)
- **Dependencies:** None.

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

#### TD-011: `goals.tsx` Uses 43 `isPt` Ternaries Instead of `t()`

- **Severity:** HIGH
- **Category:** i18n
- **Source:** Phase 3 (frontend-spec.md, H1)
- **Description:** The goals page uses 43 instances of `isPt ? "Portuguese" : "English"` inline ternary expressions instead of calling the `t()` function. This pattern is brittle, error-prone, and does not scale to additional locales.
- **Impact:** Adding a third locale would require editing 43 ternaries. Each ternary is a potential typo or inconsistency.
- **Affected Files:** `client/src/pages/goals.tsx` (432 lines)
- **Remediation:** Replace all `isPt ? "..." : "..."` with `t("pages.goals.xxx")` and add keys to both JSON translation files.
- **Effort:** M (2-8h)
- **Dependencies:** None.

---

#### TD-012: Notification Settings Duplication (`user_settings` vs `notification_preferences`)

- **Severity:** HIGH (CRITICAL per DB Audit)
- **Category:** Database
- **Source:** Phase 2 (DB-AUDIT.md, C1, Section 1.1)
- **Description:** Both `user_settings` and `notification_preferences` tables store notification toggles. `user_settings` has `notifications_training`, `notifications_billing`, `notifications_system`, AND `notification_preferences` has `training`, `billing`, `system`. The code in `routes.ts:isNotificationAllowed()` checks both with a fallback chain.
- **Impact:** Data inconsistency risk. A user could have `notifications_training = true` in `user_settings` but `training = false` in `notification_preferences`. The fallback chain creates unpredictable behavior. This is a bug waiting to happen.
- **Affected Files:** `shared/schema.ts` (table definitions), `server/storage.ts`, `server/routes.ts` (`isNotificationAllowed()`)
- **Remediation:** Consolidate notification preferences into one table. Either remove `notifications_*` columns from `user_settings` and use `notification_preferences` exclusively, or vice versa. Migrate existing data. Remove fallback chain logic.
- **Effort:** L (1-3 days)
- **Dependencies:** TD-022 (versioned migrations) would help ensure safe migration.

---

#### TD-013: No Automatic `updated_at` Trigger

- **Severity:** HIGH (CRITICAL per DB Audit)
- **Category:** Database
- **Source:** Phase 2 (DB-AUDIT.md, C2)
- **Description:** No PostgreSQL trigger exists for automatic `updated_at` maintenance. Every update in the codebase manually sets `updatedAt: new Date()`, which is error-prone and creates clock skew between the application server and the database.
- **Impact:** If any update path forgets to set `updatedAt`, the timestamp becomes stale. Clock skew between app server and DB means timestamps can be inconsistent.
- **Affected Files:** `scripts/supabase/rls-and-triggers.sql`, `server/storage.ts`
- **Remediation:** Add a PostgreSQL trigger function: `CREATE FUNCTION update_updated_at_column() RETURNS trigger ... SET updated_at = now()`. Apply to all tables with `updated_at` columns.
- **Effort:** S (< 2h)
- **Dependencies:** None. Quick win.

---

#### TD-014: Missing Indexes on Time-Filtered Count Queries

- **Severity:** HIGH
- **Category:** Database / Performance
- **Source:** Phase 2 (DB-AUDIT.md, H1, Section 2.2)
- **Description:** Two daily rate-limiting queries lack optimal indexes: (1) `countCoachMessagesToday()` filters by `userId + role='user' + createdAt >= todayStart` but only has a single-column `user_id` index. (2) `countPushAnalysesToday()` filters by `userId + createdAt >= todayStart` with the same gap.
- **Impact:** As tables grow, these count queries (executed on every coach chat and push analysis request) become increasingly slow. Currently acceptable with small data but will degrade.
- **Affected Files:** `shared/schema.ts` (index definitions), `scripts/supabase/rls-and-triggers.sql`
- **Remediation:** Add composite indexes: `CREATE INDEX idx_coach_messages_user_role_created ON coach_messages(user_id, role, created_at)` and `CREATE INDEX idx_push_analyses_user_created ON push_analyses(user_id, created_at)`.
- **Effort:** S (< 2h)
- **Dependencies:** None. Quick win.

---

#### TD-015: `subscriptions.user_id` Not Unique

- **Severity:** HIGH
- **Category:** Database
- **Source:** Phase 2 (DB-AUDIT.md, H2, Section 3.2)
- **Description:** The `subscriptions` table has no unique constraint on `user_id`. Multiple subscription rows can exist per user. The code selects `ORDER BY created_at DESC LIMIT 1` and the `createSubscription()` method manually queries then updates or inserts. This creates orphan rows and race conditions.
- **Impact:** Race condition if two Stripe webhooks fire simultaneously for the same user. Orphan subscription rows accumulate. The `ORDER BY ... LIMIT 1` pattern is fragile.
- **Affected Files:** `shared/schema.ts`, `server/storage.ts` (`createSubscription()`)
- **Remediation:** Add a unique constraint on `subscriptions.user_id`. Refactor `createSubscription()` to use `ON CONFLICT (user_id) DO UPDATE`. Clean up existing orphan rows first.
- **Effort:** M (2-8h)
- **Dependencies:** Requires careful data cleanup migration.

---

#### TD-016: Dual Toast Systems (Sonner + Radix Toast)

- **Severity:** HIGH
- **Category:** Frontend
- **Source:** Phase 3 (frontend-spec.md, H2, Section 8.4)
- **Description:** Two competing toast implementations coexist: (1) `@radix-ui/react-toast` via `use-toast.ts` used in pages (coach, billing, settings), and (2) `sonner` via `toast.success()/toast.error()` used in hooks (useProfile, useGoals, useFavorites). The Sonner toasts bypass i18n entirely with hardcoded Portuguese strings.
- **Impact:** Inconsistent toast appearance, behavior, and animation. Sonner toasts are always Portuguese. Two dependencies for the same functionality.
- **Affected Files:** `client/src/hooks/use-toast.ts`, `client/src/hooks/useProfile.ts`, `client/src/hooks/useGoals.ts`, `client/src/hooks/useFavorites.ts`, `client/src/hooks/useSettings.ts`
- **Remediation:** Pick one toast system (recommend keeping Radix/use-toast since it is more widely used and i18n-compatible). Remove `sonner` dependency. Migrate hook toasts to `useToast` with `t()` calls.
- **Effort:** M (2-8h)
- **Dependencies:** None.

---

#### TD-017: Login Redirects to `/onboarding` for Returning Users

- **Severity:** HIGH
- **Category:** Frontend
- **Source:** Phase 3 (frontend-spec.md, H3, Section 9.2)
- **Description:** After login, all users are redirected to `/onboarding` regardless of whether they already have a profile with a `clashTag`. Returning users must go through the onboarding flow again (though the onboarding page allows re-confirmation).
- **Impact:** Poor returning-user experience. Every login requires an extra step. Users who already completed onboarding see it again unnecessarily.
- **Affected Files:** `client/src/pages/auth.tsx`, `client/src/hooks/useAuth.ts`
- **Remediation:** After login, check if the user already has `clashTag` in their profile. If yes, redirect to `/dashboard`. If no, redirect to `/onboarding`.
- **Effort:** M (2-8h)
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
- **Description:** `new Pool({ connectionString })` uses pg defaults (10 max connections) with no `max`, `idleTimeoutMillis`, or `connectionTimeoutMillis` configured. On Vercel serverless with concurrent invocations, each cold start creates a new pool, potentially exhausting Supabase connection limits.
- **Impact:** Under high traffic, connection exhaustion causes 500 errors for all users. Supabase free/pro tiers have limited connection counts.
- **Affected Files:** `server/db.ts`
- **Remediation:** Configure pool limits: `max: 3-5` (appropriate for serverless), `connectionTimeoutMillis: 5000`, `idleTimeoutMillis: 30000`. Consider using Supabase's connection pooler (PgBouncer).
- **Effort:** S (< 2h)
- **Dependencies:** None. Quick win.

---

#### TD-020: Dark Mode Toggle is Non-Functional

- **Severity:** HIGH
- **Category:** Frontend
- **Source:** Phase 3 (frontend-spec.md, H5, Section 7.5)
- **Description:** The settings page has a "Dark Mode" toggle that saves the preference to the backend, but toggling it has no visual effect. The application is dark-only: `:root` CSS variables define dark colors only, and no `.dark` class toggling exists. No light-mode token values are defined.
- **Impact:** Users see a toggle that does nothing, which damages trust and perceived quality.
- **Affected Files:** `client/src/index.css`, `client/src/pages/settings.tsx`
- **Remediation:** Either (a) implement light mode CSS variables and wire the toggle, or (b) remove the toggle entirely to avoid confusion. Option (b) is recommended as the gaming aesthetic is inherently dark-themed.
- **Effort:** S (< 2h) for option (b), L (1-3 days) for option (a)
- **Dependencies:** None.

---

#### TD-021: Route Auth Guard Duplication in `App.tsx`

- **Severity:** HIGH
- **Category:** Frontend
- **Source:** Phase 3 (frontend-spec.md, H6, Section 6.3)
- **Description:** Auth is not implemented via a dedicated guard component. Instead, `App.tsx` duplicates all private routes in an `isAuthenticated ? <>...</> : <>...</>` conditional block. The unauthenticated block renders `<RedirectToAuth />` for each private route. Adding a new page requires editing both blocks.
- **Impact:** Developer friction. Route additions require editing two separate blocks. Inconsistency risk (a route could be added to auth block but forgotten in unauth block).
- **Affected Files:** `client/src/App.tsx`
- **Remediation:** Create a `<PrivateRoute>` wrapper component that handles the auth check + redirect. Define each route once.
- **Effort:** M (2-8h)
- **Dependencies:** Should be done alongside TD-004 (add /push route).

---

#### TD-022: No Database Migration Versioning

- **Severity:** HIGH
- **Category:** Database / DevOps
- **Source:** Phase 2 (DB-AUDIT.md, M2, Section 6.1)
- **Description:** The project uses `drizzle-kit push` instead of versioned migrations. No `migrations/` folder exists. Schema changes are pushed directly from `shared/schema.ts` to the database with no rollback capability and no migration history tracking.
- **Impact:** No rollback capability for failed schema changes. No CI verification of schema changes. No audit trail of what changed and when. Dangerous for production databases.
- **Affected Files:** `drizzle.config.ts`, `package.json` (scripts)
- **Remediation:** Switch to `drizzle-kit generate` + `drizzle-kit migrate` for versioned migrations. Keep the SQL scripts (`rls-and-triggers.sql`, `decks-migrations.sql`) for Supabase-specific features.
- **Effort:** M (2-8h)
- **Dependencies:** None, but should be done before TD-012 (notification consolidation) and TD-015 (subscription unique constraint).

---

### MEDIUM Items

---

#### TD-023: `settings.tsx` at 763 Lines

- **Severity:** MEDIUM
- **Category:** Frontend
- **Source:** Phase 3 (frontend-spec.md, M6)
- **Description:** Settings page contains 3 tabs (Account, Billing, Preferences) with multiple mutations in a single file.
- **Impact:** Growing complexity. Not as critical as me.tsx/decks.tsx but trending toward unmaintainability.
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
- **Impact:** First-load bundle is larger than necessary. Users download all page code even for pages they never visit. Recharts (~400KB unminified) is loaded even when no charts are visible.
- **Affected Files:** `client/src/App.tsx`
- **Remediation:** Implement `React.lazy()` + `Suspense` for each page import. Priority splits: landing, auth, me (heavy), decks (heavy + Recharts), billing (infrequent).
- **Effort:** M (2-8h)
- **Dependencies:** TD-021 (PrivateRoute wrapper) pairs well with this change.

---

#### TD-025: `bootstrapUserData()` Code Duplication

- **Severity:** MEDIUM
- **Category:** Architecture
- **Source:** Phase 1 (system-architecture.md, W-05), Phase 2 (DB-AUDIT.md, M1)
- **Description:** `bootstrapUserData()` in `storage.ts` has nearly identical logic (~90 lines each) duplicated for the RLS path (`this.auth`) and the no-RLS path (`!this.auth`). Both branches perform the same 4 INSERT + 4 SELECT operations.
- **Impact:** Any change to bootstrap logic must be made in two places. Bugs can be introduced in one path but not the other.
- **Affected Files:** `server/storage.ts` (lines ~272-443)
- **Remediation:** Extract the shared bootstrap logic into a private method that accepts a transaction object. Call it from both the auth and no-auth branches.
- **Effort:** S (< 2h)
- **Dependencies:** None.

---

#### TD-026: No Enum/CHECK Constraints at DB Level

- **Severity:** MEDIUM
- **Category:** Database
- **Source:** Phase 2 (DB-AUDIT.md, H3, Section 3.2)
- **Description:** All enum-like columns (`subscriptions.plan`, `subscriptions.status`, `goals.type`, `training_plans.status`, `training_drills.status`, `profiles.role`) are stored as `varchar` with no `CHECK` constraints. Validation exists only at the Zod/application level.
- **Impact:** A bug in a future code path, a manual SQL edit, or a migration error could insert invalid enum values, causing application-level crashes or silent data corruption.
- **Affected Files:** `shared/schema.ts`, `scripts/supabase/rls-and-triggers.sql`
- **Remediation:** Add `CHECK` constraints for at minimum: `subscriptions.plan IN ('free', 'pro')`, `subscriptions.status IN ('inactive', 'active', 'canceled', 'past_due')`, `goals.type`, `training_plans.status`, `training_drills.status`.
- **Effort:** S (< 2h)
- **Dependencies:** TD-022 (versioned migrations) recommended first.

---

#### TD-027: `coach_messages` and `deck_suggestions_usage` Grow Unbounded

- **Severity:** MEDIUM
- **Category:** Database / Performance
- **Source:** Phase 2 (DB-AUDIT.md, H4, Section 5.3)
- **Description:** `coach_messages`, `deck_suggestions_usage`, `push_analyses`, and `notifications` have no data retention policy. Rows accumulate indefinitely. Only `battle_history` has pruning logic (`pruneBattleHistory`).
- **Impact:** Tables grow without bound, increasing storage costs, slowing queries, and eventually impacting backup/restore times.
- **Affected Files:** `server/storage.ts`, potentially a new scheduled job
- **Remediation:** Implement retention policies: (1) `coach_messages`: delete messages older than 90 days for free users, 1 year for pro. (2) `deck_suggestions_usage`: delete rows older than 30 days (only today's rows are queried). (3) `notifications`: auto-purge read notifications older than 30 days. Consider `pg_cron` or a scheduled Vercel cron job.
- **Effort:** M (2-8h)
- **Dependencies:** None.

---

#### TD-028: Meta Decks Refresh in Request Path

- **Severity:** MEDIUM
- **Category:** Architecture / Performance
- **Source:** Phase 1 (system-architecture.md, W-09)
- **Description:** `refreshMetaDecksCacheIfStale()` runs within a user's GET request for `/api/decks/meta`. If the cache is stale, it fetches battles from 50+ top players concurrently, potentially adding 10+ seconds to response time.
- **Impact:** One unlucky user per staleness interval gets a multi-second response time while the meta cache refreshes. On serverless, this can hit the function timeout.
- **Affected Files:** `server/domain/metaDecksRefresh.ts`, `server/routes.ts`
- **Remediation:** Move meta decks refresh to a Vercel Cron job (`vercel.json` crons) or a separate background endpoint triggered by a scheduler. The user-facing endpoint should only read from cache.
- **Effort:** M (2-8h)
- **Dependencies:** None.

---

#### TD-029: Excessive `as any` Casting (50+ Instances)

- **Severity:** MEDIUM
- **Category:** Frontend
- **Source:** Phase 3 (frontend-spec.md, M1), Phase 1 (system-architecture.md, W-10, W-18)
- **Description:** Widespread `as any` casting in page-level code and API methods. Battle JSON is typed as `any[]` for both input and output. Several `api.*` methods accept `data: any`. Route handlers use `req: any`.
- **Impact:** Defeats TypeScript's safety guarantees. Refactoring becomes dangerous. IDE autocomplete is useless for these code paths.
- **Affected Files:** `client/src/pages/me.tsx`, `client/src/pages/decks.tsx`, `client/src/lib/api.ts`, `server/routes.ts`, `server/storage.ts`
- **Remediation:** Define proper interfaces for API responses and battle data. Replace `any` with typed payloads. Start with the most frequently used types (battle history, player data, deck data).
- **Effort:** L (1-3 days)
- **Dependencies:** None, but benefits from TD-003 (me.tsx decomposition).

---

#### TD-030: `framer-motion` Dependency Unused

- **Severity:** MEDIUM
- **Category:** Frontend / Performance
- **Source:** Phase 3 (frontend-spec.md, M2, Section 11.1)
- **Description:** `framer-motion` (v12.23, ~150KB) is listed in `package.json` dependencies but is not imported anywhere in the client code. Dead dependency.
- **Impact:** Adds to `npm install` time, `node_modules` size, and potentially to bundle if tree-shaking fails.
- **Affected Files:** `package.json`
- **Remediation:** Remove `framer-motion` from dependencies. If animation is planned, add it back when needed.
- **Effort:** S (< 2h)
- **Dependencies:** None.

---

#### TD-031: Hooks Use Hardcoded Portuguese Toasts

- **Severity:** MEDIUM
- **Category:** i18n
- **Source:** Phase 3 (frontend-spec.md, M3, Section 5)
- **Description:** `useProfile.ts`, `useGoals.ts`, and `useFavorites.ts` use `toast()` from `sonner` with hardcoded Portuguese strings like "Perfil atualizado com sucesso!", "Meta criada com sucesso!", "Jogador adicionado aos favoritos!". Meanwhile, `useSettings.ts` properly uses `t()`.
- **Impact:** English users see Portuguese toast messages after profile/goal/favorite operations.
- **Affected Files:** `client/src/hooks/useProfile.ts`, `client/src/hooks/useGoals.ts`, `client/src/hooks/useFavorites.ts`
- **Remediation:** Migrate to `t()` calls. Since hooks do not have direct access to `useLocale()`, either pass locale/t as parameter or use `useLocale()` inside the hook.
- **Effort:** S (< 2h)
- **Dependencies:** TD-016 (unify toast system) should ideally be done first.

---

#### TD-032: N+1 Queries in `/api/auth/user`

- **Severity:** MEDIUM
- **Category:** Database / Performance
- **Source:** Phase 2 (DB-AUDIT.md, M5, Section 5.2)
- **Description:** The `/api/auth/user` endpoint makes 5 separate queries per authentication request: `getUser` + `bootstrapUserData` + `getProfile` + `getSubscription` + `getUserSettings`.
- **Impact:** Every page load triggers this endpoint. 5 sequential round trips to PostgreSQL add latency. Each round trip includes the 4 `SET` commands for RLS context in `runAsUser()`.
- **Affected Files:** `server/routes.ts` (auth user endpoint), `server/storage.ts`
- **Remediation:** Consolidate into a single SQL query that joins `users`, `profiles`, `subscriptions`, and `user_settings` in one round trip. Keep `bootstrapUserData` as a separate step only for first-time users.
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
- **Remediation:** Add a `last_refreshed_at` column. Refresh cached data when viewing favorites or during player sync. Alternatively, always fetch live data from the Clash API and use the table only for player tag + name storage.
- **Effort:** M (2-8h)
- **Dependencies:** None.

---

#### TD-034: `not-found.tsx` Uses Light Background Color

- **Severity:** MEDIUM
- **Category:** Frontend
- **Source:** Phase 3 (frontend-spec.md, M4)
- **Description:** `not-found.tsx` uses `bg-gray-50` (a light background color) while the entire application uses a dark theme.
- **Impact:** The 404 page looks visually broken and inconsistent with the rest of the app.
- **Affected Files:** `client/src/pages/not-found.tsx` (22 lines)
- **Remediation:** Change `bg-gray-50` to `bg-background` to match the application theme.
- **Effort:** S (< 2h)
- **Dependencies:** None. Quick win.

---

#### TD-035: Server-Side Hardcoded Portuguese Notification Strings

- **Severity:** MEDIUM
- **Category:** i18n
- **Source:** State Report (lines 2167, 2227, 2280 of routes.ts)
- **Description:** Three notification strings in `routes.ts` are hardcoded in Portuguese: (1) "Sua assinatura PRO foi ativada com sucesso...", (2) "Sua assinatura PRO foi cancelada...", (3) "O pagamento da sua assinatura PRO falhou...". These are created server-side in Stripe webhook handlers.
- **Impact:** English-speaking users receive Portuguese notification text for billing events.
- **Affected Files:** `server/routes.ts` (Stripe webhook section)
- **Remediation:** Use i18n keys for notification templates. Determine user locale from `user_settings.preferred_language` before creating the notification, then store the translated string (or store a key and translate on the client).
- **Effort:** M (2-8h)
- **Dependencies:** TD-001 (split routes) for cleaner access to notification logic.

---

#### TD-036: Timestamp Columns Without Timezone

- **Severity:** MEDIUM
- **Category:** Database
- **Source:** Phase 2 (DB-AUDIT.md, M6, Section 1.3)
- **Description:** All timestamp columns use `timestamp` (without time zone) instead of `timestamptz`. While current code always uses UTC via `now()`, this creates a latent risk if the database locale changes or if queries use `now()` in different timezone contexts.
- **Impact:** Low immediate risk since all operations are UTC. Higher risk if the project scales to multi-region or if DB admin tools interpret timestamps incorrectly.
- **Affected Files:** `shared/schema.ts`
- **Remediation:** Migrate to `timestamptz` (TIMESTAMP WITH TIME ZONE). This is a schema change that should be done via versioned migration (TD-022).
- **Effort:** S (< 2h) (schema change is trivial; migration needs care)
- **Dependencies:** TD-022 (versioned migrations).

---

#### TD-037: `formatDate` and `formatMoneyFromCents` Duplicated

- **Severity:** MEDIUM
- **Category:** Frontend
- **Source:** Phase 3 (frontend-spec.md, M7)
- **Description:** The same utility functions `formatDate` and `formatMoneyFromCents` are defined independently in both `billing.tsx` and `settings.tsx`.
- **Impact:** DRY violation. Bug fixes must be applied in two places. Inconsistency risk.
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

### LOW Items

---

#### TD-039: `goals 2.tsx` Dead File

- **Severity:** LOW
- **Category:** Frontend
- **Source:** Phase 3 (frontend-spec.md, H7), Phase 1 (system-architecture.md, W-12)
- **Description:** `client/src/pages/goals 2.tsx` (432 lines) exists as a duplicate/backup of `goals.tsx` and is not imported anywhere. Similarly, `shared/clashTag 2.ts` and `clashTag.test 2.ts` exist as duplicates.
- **Impact:** Clutters the codebase, confuses developers, and may cause accidental edits to the wrong file.
- **Affected Files:** `client/src/pages/goals 2.tsx`, `shared/clashTag 2.ts`, `shared/clashTag.test 2.ts`
- **Remediation:** Delete all duplicate files.
- **Effort:** S (< 2h)
- **Dependencies:** None. Quick win.

---

#### TD-040: ~30 Unused shadcn/ui Components

- **Severity:** LOW
- **Category:** Frontend
- **Source:** Phase 3 (frontend-spec.md, L1, Section 3.1)
- **Description:** Approximately 30 of 55 installed shadcn/ui components are not actively used (aspect-ratio, breadcrumb, calendar, carousel, checkbox, command, context-menu, drawer, dropdown-menu, form, hover-card, menubar, navigation-menu, pagination, radio-group, resizable, skeleton, slider, textarea, toggle, etc.).
- **Impact:** Clutters the components directory. Tree-shaking handles bundle impact, but adds build complexity and developer confusion.
- **Affected Files:** `client/src/components/ui/` (30+ files)
- **Remediation:** Audit and remove truly unused components. Keep a minimal set.
- **Effort:** M (2-8h)
- **Dependencies:** None.

---

#### TD-041: `profiles.clash_tag` Legacy Column

- **Severity:** LOW
- **Category:** Database
- **Source:** Phase 2 (DB-AUDIT.md, L1, Section 1.1)
- **Description:** Two columns (`clash_tag` and `default_player_tag`) exist for the same purpose. `buildCanonicalProfileData()` syncs them, but the dual-column approach is confusing. `clash_tag` is documented as legacy.
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
- **Description:** Landing page hero background uses a PNG file with no WebP/AVIF alternatives, no responsive `srcSet`, no `<picture>` element, and no `loading="lazy"` attribute. Clash card images are loaded from external URLs without local caching.
- **Impact:** Larger initial page load. No progressive enhancement for modern browsers.
- **Affected Files:** `client/src/pages/landing.tsx`, `client/src/components/clash/ClashCardImage.tsx`
- **Remediation:** Convert hero image to WebP. Add `loading="lazy"`. Use `<picture>` element with fallback.
- **Effort:** S (< 2h)
- **Dependencies:** None.

---

#### TD-043: No Skip Navigation Link

- **Severity:** LOW
- **Category:** Frontend / Accessibility
- **Source:** Phase 3 (frontend-spec.md, L3, Section 10)
- **Description:** No "Skip to content" link exists at the top of `DashboardLayout`. Users with keyboard navigation or screen readers must tab through the entire sidebar to reach page content.
- **Impact:** Accessibility gap for keyboard-only users.
- **Affected Files:** `client/src/components/layout/DashboardLayout.tsx`
- **Remediation:** Add a visually-hidden "Skip to content" anchor link that becomes visible on focus, targeting the main content area.
- **Effort:** S (< 2h)
- **Dependencies:** None.

---

#### TD-044: Page Transition CSS Defined but Unused

- **Severity:** LOW
- **Category:** Frontend
- **Source:** Phase 3 (frontend-spec.md, L4, Section 7.3)
- **Description:** `.page-transition-*` CSS classes are defined in `index.css` but never applied to any component.
- **Impact:** Dead CSS adds confusion. Developers may wonder if transitions are supposed to work.
- **Affected Files:** `client/src/index.css`
- **Remediation:** Either implement route transitions or remove the dead CSS.
- **Effort:** S (< 2h)
- **Dependencies:** None.

---

#### TD-045: Copyright Says 2025

- **Severity:** LOW
- **Category:** Frontend
- **Source:** Phase 3 (frontend-spec.md, L5)
- **Description:** Footer copyright text displays "2025" instead of "2026" or a dynamic year.
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
- **Description:** Sidebar avatar displays `src="https://github.com/shadcn.png"` (the shadcn default placeholder) instead of the actual user avatar.
- **Impact:** Users do not see their profile image in navigation.
- **Affected Files:** `client/src/components/layout/Sidebar.tsx`
- **Remediation:** Use user's `profile_image_url` from profile data, with a fallback to initials or a generic avatar.
- **Effort:** S (< 2h)
- **Dependencies:** None.

---

#### TD-047: `push.tsx` Has Portuguese-Only Strings

- **Severity:** LOW
- **Category:** i18n
- **Source:** Phase 3 (frontend-spec.md, L7)
- **Description:** `push.tsx` has ~5 hardcoded Portuguese strings: "Push Analysis", "Sessoes Recentes", etc.
- **Impact:** Minor i18n gap on a secondary page. English users see Portuguese labels.
- **Affected Files:** `client/src/pages/push.tsx` (129 lines)
- **Remediation:** Add translation keys to both JSON files. Replace hardcoded strings with `t()` calls.
- **Effort:** S (< 2h)
- **Dependencies:** None.

---

#### TD-048: Index Naming Convention Inconsistency

- **Severity:** LOW
- **Category:** Database
- **Source:** Phase 2 (DB-AUDIT.md, L3, Section 1.2)
- **Description:** Index names use uppercase `IDX_`/`UIDX_` prefix while table/column names are lowercase snake_case. Inconsistent with PostgreSQL conventions.
- **Impact:** Cosmetic. No functional impact.
- **Affected Files:** `shared/schema.ts`
- **Remediation:** Standardize to lowercase: `idx_table_columns` instead of `IDX_table_columns`.
- **Effort:** S (< 2h)
- **Dependencies:** TD-022 (versioned migrations).

---

#### TD-049: `create-stripe-prices.ts` Uses Dead Replit Connector

- **Severity:** LOW
- **Category:** DevOps
- **Source:** Phase 2 (DB-AUDIT.md, L2)
- **Description:** `scripts/create-stripe-prices.ts` uses a Replit-specific database connector that is dead code. `seed-products.ts` already provides this functionality using the standard Stripe client.
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

**Root Cause:** The project was developed in a rapid-prototype phase (likely Replit-first) where single-file patterns are common for speed. As features accumulated, files grew without decomposition discipline.

**Impact:** Affects TD-001, TD-002, TD-003, TD-023. Decomposition of any one file should establish a pattern/convention for the others.

### 3.2 i18n Inconsistency (Systemic)

The i18n system itself (`shared/i18n/`) is well-designed, but adoption is inconsistent across the codebase:

| Pattern | Files | Items |
|---------|-------|------:|
| Fully using `t()` | dashboard, billing, coach, community, training, notifications, settings, decks | ~8 pages |
| Hardcoded Portuguese | auth.tsx, me.tsx, push.tsx | ~3 pages (47+ strings) |
| `isPt` ternary hack | goals.tsx | 43 occurrences |
| Hardcoded in hooks | useProfile, useGoals, useFavorites | ~10 strings |
| Hardcoded server-side | routes.ts (notifications) | 3 strings |

**Root Cause:** The i18n system was added after initial development. Pages built early (auth, me, goals) were never retrofitted. Hooks adopted `sonner` (which has no i18n awareness) instead of the Radix toast system.

**Impact:** Affects TD-009, TD-010, TD-011, TD-031, TD-035, TD-047. A systematic i18n audit-and-fix sweep would be more efficient than addressing each individually.

### 3.3 Testing Absence (Systemic)

The project has 23 tests across 5 files -- all backend domain logic. Zero frontend tests, zero API integration tests, zero E2E tests.

| Layer | Test Files | Tests | Coverage |
|-------|-----------|------:|----------|
| Backend domain | 3 files | 15 | syncRules, battleHistory, stripeCheckout |
| Shared | 2 files | 8 | clashTag, playerSyncPayload |
| API routes | 0 | 0 | Nothing |
| Frontend | 0 | 0 | Nothing |
| E2E | 0 | 0 | Nothing |

**Root Cause:** Rapid prototyping phase prioritized feature delivery. The `data-testid` attributes on UI elements indicate test intent but no follow-through.

**Impact:** Affects TD-007, TD-008. Any refactoring (TD-001, TD-002, TD-003) is risky without tests to catch regressions.

### 3.4 Type Safety Erosion (Systemic)

TypeScript is used throughout but undermined by widespread `any` usage:

- `battles: any[]` in domain logic and storage layer
- `req: any` in route handlers
- `fetchAPI<any>` in client API calls
- `as any` casting in 50+ page-level instances
- `data: any` in API client methods

**Root Cause:** Speed of development prioritized over type accuracy. The shared schema provides types for database entities, but API response shapes and battle JSON are left untyped.

**Impact:** Affects TD-029. Undermines the value of TypeScript. Makes refactoring dangerous. Should be addressed progressively alongside file decompositions.

---

## 4. Risk Matrix

### Severity x Probability

```
                    HIGH Probability          MEDIUM Probability         LOW Probability
                 +-----------------------+------------------------+------------------------+
CRITICAL         | TD-005 (rate limit)   | TD-001 (routes.ts)     |                        |
Severity         | TD-008 (no FE tests)  | TD-007 (no API tests)  |                        |
                 | TD-004 (/push 404)    | TD-006 (no CORS)       |                        |
                 |                       | TD-002 (decks.tsx)     |                        |
                 |                       | TD-003 (me.tsx)        |                        |
                 +-----------------------+------------------------+------------------------+
HIGH             | TD-010 (me.tsx i18n)   | TD-012 (notif dupl.)  | TD-019 (pool config)   |
Severity         | TD-011 (goals isPt)    | TD-015 (subs unique)  | TD-022 (migrations)    |
                 | TD-016 (dual toasts)   | TD-018 (timeouts)     |                        |
                 | TD-009 (auth i18n)     | TD-013 (updated_at)   |                        |
                 | TD-017 (login redir.)  | TD-014 (indexes)      |                        |
                 |                       | TD-020 (dark toggle)   |                        |
                 |                       | TD-021 (route guard)   |                        |
                 +-----------------------+------------------------+------------------------+
MEDIUM           | TD-029 (any types)    | TD-027 (unbounded)     | TD-036 (timestamptz)   |
Severity         | TD-031 (hook toasts)  | TD-028 (meta refresh)  | TD-038 (aria-live)     |
                 | TD-034 (404 bg)       | TD-024 (code split)    | TD-033 (fav stale)     |
                 | TD-037 (format dupl.) | TD-025 (bootstrap dup) |                        |
                 |                       | TD-023 (settings.tsx)  |                        |
                 |                       | TD-026 (CHECK constr.) |                        |
                 |                       | TD-032 (N+1 auth)     |                        |
                 |                       | TD-035 (server i18n)  |                        |
                 +-----------------------+------------------------+------------------------+
LOW              | TD-039 (dead files)   | TD-040 (unused shadcn) | TD-048 (idx naming)    |
Severity         | TD-045 (copyright)    | TD-041 (clash_tag)     | TD-044 (dead CSS)      |
                 | TD-046 (avatar)       | TD-042 (images)        | TD-049 (dead script)   |
                 | TD-050 (isMobile)     | TD-043 (skip nav)      |                        |
                 |                       | TD-047 (push i18n)     |                        |
                 +-----------------------+------------------------+------------------------+
```

### Business Impact Assessment

| Risk Area | Current Impact | Future Impact If Unaddressed |
|-----------|---------------|------------------------------|
| **Security** (TD-005, TD-006) | Low (low traffic) | CRITICAL at scale -- API abuse, cost amplification |
| **Maintainability** (TD-001, TD-002, TD-003) | HIGH (dev velocity already impacted) | Exponential -- each new feature makes god-files worse |
| **User Experience** (TD-004, TD-017, TD-020) | MEDIUM (users hit broken flows) | HIGH -- churn from first-use friction |
| **i18n** (TD-009, TD-010, TD-011) | MEDIUM (BR-only market) | HIGH when expanding to non-Portuguese markets |
| **Data Integrity** (TD-012, TD-015) | LOW (small user base) | HIGH -- race conditions manifest at scale |
| **Performance** (TD-014, TD-028, TD-032) | LOW (small data volumes) | MEDIUM -- degradation correlates with user growth |

### Security Risk Ranking

| Priority | Item | Risk |
|:--------:|------|------|
| 1 | TD-005: No rate limiting | API abuse, cost amplification, DoS |
| 2 | TD-006: No CORS | Cross-origin exploitation |
| 3 | TD-018: No request timeouts | Resource exhaustion on serverless |
| 4 | TD-019: No pool limits | Connection exhaustion under load |
| 5 | TD-015: Subscription race condition | Billing state corruption |

---

## 5. Remediation Roadmap (DRAFT)

### Phase 1: Critical Fixes and Quick Wins (Week 1)

**Goal:** Eliminate blockers, security gaps, and broken functionality.

| Order | Item | Effort | Impact |
|:-----:|------|:------:|--------|
| 1.1 | TD-004: Add `/push` route to App.tsx | S | Unblocks Push feature entirely |
| 1.2 | TD-006: Add CORS configuration | S | Security baseline |
| 1.3 | TD-005: Add rate limiting middleware | M | Security baseline |
| 1.4 | TD-013: Add `updated_at` trigger | S | Data integrity quick win |
| 1.5 | TD-014: Add missing composite indexes | S | Performance quick win |
| 1.6 | TD-019: Configure connection pool limits | S | Infrastructure hardening |
| 1.7 | TD-039: Delete dead duplicate files | S | Codebase hygiene |
| 1.8 | TD-034: Fix not-found.tsx background | S | Visual fix |
| 1.9 | TD-030: Remove framer-motion dependency | S | Dependency cleanup |
| 1.10 | TD-045: Fix copyright year | S | Cosmetic fix |
| 1.11 | TD-046: Fix sidebar avatar | S | UX fix |
| 1.12 | TD-050: Fix useIsMobile initial state | S | Mobile UX fix |

**Estimated effort:** ~3-4 days total.

### Phase 2: Structural Improvements (Week 2-3)

**Goal:** Decompose god-files, establish testing infrastructure.

| Order | Item | Effort | Impact |
|:-----:|------|:------:|--------|
| 2.1 | TD-001: Split `routes.ts` into modules | XL | Foundational -- unblocks API testing |
| 2.2 | TD-022: Introduce versioned migrations | M | Unblocks safe schema changes |
| 2.3 | TD-021: Create `<PrivateRoute>` wrapper | M | Simplifies routing, unblocks code splitting |
| 2.4 | TD-008: Add E2E test infrastructure (Playwright) | L | Test foundation for critical flows |
| 2.5 | TD-018: Add request timeouts to external calls | M | Resilience improvement |
| 2.6 | TD-025: Refactor bootstrapUserData | S | Code quality |
| 2.7 | TD-037: Extract shared formatters | S | Code quality |

**Estimated effort:** ~8-12 days total.
**Dependency chain:** TD-001 must complete before TD-007.

### Phase 3: i18n Sweep and Frontend Decomposition (Week 3-4)

**Goal:** Fix all i18n issues, decompose frontend god-files.

| Order | Item | Effort | Impact |
|:-----:|------|:------:|--------|
| 3.1 | TD-016: Unify toast system (remove Sonner) | M | Prerequisite for hook i18n fix |
| 3.2 | TD-009: Migrate auth.tsx to i18n | M | First-interaction fix |
| 3.3 | TD-011: Migrate goals.tsx from isPt to t() | M | 43 ternaries eliminated |
| 3.4 | TD-010 + TD-003: Decompose me.tsx + fix i18n | XL | Biggest frontend debt item |
| 3.5 | TD-002: Decompose decks.tsx | L | Second biggest frontend debt item |
| 3.6 | TD-031: Fix hook toast i18n | S | After TD-016 |
| 3.7 | TD-047: Fix push.tsx i18n | S | Minor page fix |
| 3.8 | TD-035: Fix server-side notification i18n | M | Billing notifications |

**Estimated effort:** ~10-15 days total.
**Dependency chain:** TD-016 before TD-031. TD-003 and TD-010 are best done together.

### Phase 4: Database Integrity and Performance (Week 4-5)

**Goal:** Harden data layer, fix performance issues.

| Order | Item | Effort | Impact |
|:-----:|------|:------:|--------|
| 4.1 | TD-015: Add unique constraint on subscriptions.user_id | M | Data integrity |
| 4.2 | TD-012: Consolidate notification preferences | L | Data integrity |
| 4.3 | TD-026: Add CHECK constraints | S | Defense in depth |
| 4.4 | TD-027: Implement data retention policies | M | Unbounded growth prevention |
| 4.5 | TD-028: Move meta refresh to cron job | M | Performance |
| 4.6 | TD-032: Consolidate N+1 auth queries | M | Performance |
| 4.7 | TD-036: Migrate to timestamptz | S | Future-proofing |
| 4.8 | TD-033: Fix favorite_players staleness | M | Data freshness |

**Estimated effort:** ~8-12 days total.
**Dependency chain:** TD-022 (Phase 2) before TD-015, TD-012, TD-026, TD-036, TD-041.

### Phase 5: Polish and Long-Term Quality (Week 5+)

**Goal:** Address remaining medium/low items, establish ongoing quality.

| Order | Item | Effort | Impact |
|:-----:|------|:------:|--------|
| 5.1 | TD-007: Add API integration tests | XL | After TD-001 |
| 5.2 | TD-024: Implement code splitting | M | Performance |
| 5.3 | TD-023: Decompose settings.tsx | M | Maintainability |
| 5.4 | TD-029: Eliminate `any` types | L | Type safety |
| 5.5 | TD-017: Fix login redirect for returning users | M | UX |
| 5.6 | TD-020: Remove dark mode toggle | S | UX clarity |
| 5.7 | TD-038: Add aria-live regions | M | Accessibility |
| 5.8 | TD-043: Add skip navigation link | S | Accessibility |
| 5.9 | TD-040: Remove unused shadcn components | M | Cleanup |
| 5.10 | TD-041: Deprecate clash_tag column | S | Schema cleanup |
| 5.11 | TD-042: Image optimization | S | Performance |
| 5.12 | TD-044: Remove dead CSS | S | Cleanup |
| 5.13 | TD-048: Standardize index naming | S | Convention |
| 5.14 | TD-049: Delete dead Replit script | S | Cleanup |

**Estimated effort:** ~15-20 days total.

### Dependency Graph Summary

```
Phase 1 (Week 1) ──────────────────────────────────────────────────────
  TD-004 (push route)                [standalone]
  TD-005 (rate limiting)             [standalone]
  TD-006 (CORS)                      [standalone]
  TD-013 (updated_at trigger)        [standalone]
  TD-014 (missing indexes)           [standalone]
  TD-019 (pool config)               [standalone]
  Quick wins (TD-030/034/039/045/046/050)  [standalone]

Phase 2 (Week 2-3) ────────────────────────────────────────────────────
  TD-001 (split routes) ─────────────┬──> TD-007 (API tests) [Phase 5]
                                     └──> TD-035 (server i18n) [Phase 3]
  TD-022 (migrations) ──────────────┬──> TD-015 (subs unique) [Phase 4]
                                    ├──> TD-012 (notif consolidate) [Phase 4]
                                    ├──> TD-026 (CHECK constraints) [Phase 4]
                                    ├──> TD-036 (timestamptz) [Phase 4]
                                    └──> TD-041 (deprecate clash_tag) [Phase 5]
  TD-021 (PrivateRoute) ───────────────> TD-024 (code splitting) [Phase 5]
  TD-008 (E2E tests)                [standalone]

Phase 3 (Week 3-4) ────────────────────────────────────────────────────
  TD-016 (unify toasts) ───────────────> TD-031 (hook i18n)
  TD-003 + TD-010 (me.tsx decompose + i18n)  [best done together]

Phase 4 (Week 4-5) ────────────────────────────────────────────────────
  Requires TD-022 from Phase 2
```

---

## 6. Metrics & Health Scores

### Individual Dimension Scores

| Dimension | Score | Rationale |
|-----------|:-----:|-----------|
| **Architecture** | 5 / 10 | Good fundamentals (shared schema, domain modules, RLS pattern, error handling). Severely undermined by god-file pattern (`routes.ts` 3,874 lines), no service layer, no rate limiting, no CORS, no request timeouts. |
| **Database** | 7 / 10 | Solid foundation: proper FKs, cascade deletes, comprehensive RLS policies, battle deduplication, advisory locks. Gaps: notification duplication, missing CHECK constraints, no migration versioning, unbounded table growth, missing indexes. |
| **Frontend** | 5 / 10 | Good patterns (React Query, consistent layout, error boundaries, i18n architecture). Severely undermined by god-files (me.tsx, decks.tsx), broken i18n adoption, unreachable route (/push), dual toast systems, no code splitting, non-functional dark toggle. |
| **Security** | 4 / 10 | Strong auth (JWKS verification, RLS), good input validation (Zod), price ID whitelist. Critical gaps: no rate limiting, no CORS, no request timeouts, no pool limits. Security is the weakest dimension. |
| **Test Coverage** | 2 / 10 | 23 tests total (5 files). Domain logic tests for tilt, battle history, stripe checkout, clash tag, and sync payload are well-written. Zero API integration tests, zero frontend tests, zero E2E tests. |
| **i18n Compliance** | 5 / 10 | The i18n system itself is well-designed (custom t(), locale provider, parameter interpolation). Adoption is inconsistent: ~8 pages fully translated, 3 pages hardcoded Portuguese, 1 page uses isPt ternaries, hooks bypass i18n, server notifications hardcoded. |
| **Performance** | 6 / 10 | React Query caching with Infinity staleTime reduces API calls. Advisory locks prevent thundering herd. Manual sync button is intentional. Gaps: no code splitting, meta refresh in request path, N+1 auth queries, no image optimization. |
| **DevOps** | 5 / 10 | Vercel deployment works. Build pipeline is solid (esbuild + Vite). Gaps: no migration versioning, no health check endpoint, no logging framework, no CI/CD quality gates, dead Replit-specific code. |

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
| This Assessment (weighted) | 2026-02-27 | 5.0 / 10 | -1.5 |

**Note:** The lower score reflects a more rigorous, weighted assessment that penalizes the critical security and testing gaps more heavily than the initial State Report. The database layer improved (mock data removal, real meta decks), but the overall picture is more nuanced when security, testing, and i18n are properly weighted.

### Target Scores (Post-Remediation)

| Dimension | Current | After Phase 1 | After Phase 2 | After Phase 3 | After Phase 4 | After Phase 5 |
|-----------|:-------:|:-------------:|:-------------:|:-------------:|:-------------:|:-------------:|
| Architecture | 5 | 6 | 7 | 7 | 7 | 8 |
| Database | 7 | 7.5 | 8 | 8 | 9 | 9 |
| Frontend | 5 | 5.5 | 6 | 8 | 8 | 9 |
| Security | 4 | 7 | 8 | 8 | 8 | 8 |
| Testing | 2 | 2 | 4 | 4 | 4 | 7 |
| i18n | 5 | 5 | 5 | 9 | 9 | 9 |
| Performance | 6 | 6.5 | 6.5 | 6.5 | 8 | 8 |
| DevOps | 5 | 5 | 7 | 7 | 7 | 8 |
| **OVERALL** | **5.0** | **5.8** | **6.6** | **7.3** | **7.7** | **8.4** |

---

## Appendix: Source Document Cross-Reference

| TD Item | Phase 1 (Architecture) | Phase 2 (DB Audit) | Phase 3 (Frontend) | State Report |
|---------|:---------------------:|:------------------:|:------------------:|:------------:|
| TD-001 | W-01, W-02 | -- | -- | Top 10 #5 |
| TD-002 | -- | -- | C2 | File sizes |
| TD-003 | -- | -- | C1 | Top 10 #4 |
| TD-004 | -- | -- | C3 | -- |
| TD-005 | W-03, Sec.13 | -- | -- | -- |
| TD-006 | W-04, Sec.13 | -- | -- | -- |
| TD-007 | W-11 | -- | -- | Top 10 #3 |
| TD-008 | -- | -- | data-testid note | Top 10 #1a |
| TD-009 | -- | -- | C4, Sec.8.3 | -- |
| TD-010 | -- | -- | Sec.8.3 | i18n violations |
| TD-011 | -- | -- | H1, Sec.8.3 | -- |
| TD-012 | -- | C1, Sec.1.1 | -- | -- |
| TD-013 | -- | C2 | -- | -- |
| TD-014 | -- | H1, Sec.2.2 | -- | -- |
| TD-015 | -- | H2, Sec.3.2 | -- | -- |
| TD-016 | -- | -- | H2, Sec.8.4 | -- |
| TD-017 | -- | -- | H3, Sec.9.2 | -- |
| TD-018 | W-06 | -- | -- | -- |
| TD-019 | W-08 | Sec.5.5 | -- | -- |
| TD-020 | -- | -- | H5, Sec.7.5 | -- |
| TD-021 | -- | -- | H6, Sec.6.3 | -- |
| TD-022 | -- | M2, Sec.6.1 | -- | -- |
| TD-023 | -- | -- | M6 | File sizes |
| TD-024 | -- | -- | H4, Sec.11 | -- |
| TD-025 | W-05 | M1, Sec.7.4 | -- | -- |
| TD-026 | -- | H3, Sec.3.2 | -- | -- |
| TD-027 | -- | H4, Sec.5.3 | -- | -- |
| TD-028 | W-09 | -- | -- | -- |
| TD-029 | W-10, W-18 | L4 | M1 | -- |
| TD-030 | Tech stack | -- | M2, Sec.11.1 | -- |
| TD-031 | -- | -- | M3, Sec.5 | -- |
| TD-032 | -- | M5, Sec.5.2 | -- | -- |
| TD-033 | -- | M3, Sec.1.1 | -- | -- |
| TD-034 | -- | -- | M4 | -- |
| TD-035 | -- | -- | -- | i18n violations |
| TD-036 | -- | M6, Sec.1.3 | -- | -- |
| TD-037 | -- | -- | M7 | -- |
| TD-038 | -- | -- | M5, Sec.10 | -- |
| TD-039 | W-12 | -- | H7 | -- |
| TD-040 | -- | -- | L1, Sec.3.1 | -- |
| TD-041 | -- | L1, Sec.1.1 | -- | -- |
| TD-042 | -- | -- | L2, Sec.11.4 | -- |
| TD-043 | -- | -- | L3, Sec.10 | -- |
| TD-044 | -- | -- | L4, Sec.7.3 | -- |
| TD-045 | -- | -- | L5 | -- |
| TD-046 | -- | -- | L6 | -- |
| TD-047 | -- | -- | L7 | -- |
| TD-048 | -- | L3, Sec.1.2 | -- | -- |
| TD-049 | -- | L2 | -- | -- |
| TD-050 | -- | -- | L8 | -- |

---

*DRAFT generated by @architect (Aria) for Brownfield Discovery Phase 4.*
*Pending review by @data-engineer (Dara), @ux-design-expert, and @qa.*
