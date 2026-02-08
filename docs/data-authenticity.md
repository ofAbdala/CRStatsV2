# CRStats - Data Authenticity Matrix (Real vs Placeholder) + Finish Level (%)

This document is the "single source of truth" for:
- Where each visible stat/box/section gets its data (REAL vs placeholder/mock).
- How "finished" each page is, using a fixed rubric (percent score).
- A repeatable checklist to validate runtime behavior (auth/sync/RLS/Stripe).

Last updated: 2026-02-08

---

## 1) Taxonomy (required)

Every stat/section must be classified as exactly one of:

- **REAL**: comes from DB/API/external service (Supabase/Clash/Stripe/OpenAI) and is displayed without invention.
- **DERIVED**: computed only from REAL data (e.g. winrate computed from battlelog).
- **HEURISTIC**: computed from REAL data but using approximate rules/guessing.
- **PLACEHOLDER**: hardcoded/demo values or static "fake stats" (e.g. `+150`, `85%`, fixed progress 60/30/90).
- **MOCK**: uses simulated datasets (e.g. `client/src/lib/mockData.ts`).

Rule: **PLACEHOLDER/MOCK must never appear as "real stats" to the user.**
If it exists, it must be:
- removed, or
- replaced by REAL/DERIVED, or
- shown as "locked/coming soon" without numeric claims.

---

## 2) Static Audit (baseline)

### 2.1 Command (recommended)

Run:

```bash
npm run audit:data
```

Strict mode (fails non-zero if actionable placeholders/mocks exist):

```bash
npm run audit:data:strict
```

Source: `scripts/audit-data-authenticity.ts`.

### 2.2 Findings (known as of 2026-02-08)

**MOCK**
- `client/src/pages/profile.tsx` imports `@/lib/mockData` and displays `mockPlayer` + hardcoded user info.
- `client/src/lib/mockData.ts` exists (currently only referenced by `profile.tsx`).

**PLACEHOLDER (numeric)**
- `client/src/pages/training.tsx` uses fixed drill progress values:
  - `progress={60}`, `progress={30}`, `progress={90}`
- `client/src/pages/me.tsx` has a PRO placeholder section with hardcoded values:
  - `+150`, `85%`, etc.

**PLACEHOLDER (logic)**
- `client/src/pages/me.tsx` generates chart data using `Math.random()` (not derived from battle history).

**PLACEHOLDER (text / "coming soon")**
- Deck details action is not implemented and shows "Coming soon." toast:
  - `shared/i18n/translations/en-US.json: pages.decks.toast.detailsDescription`
  - `shared/i18n/translations/pt-BR.json: pages.decks.toast.detailsDescription`

**Allowed exception (not a product stat)**
- `client/src/components/ui/sidebar.tsx` uses `Math.random()` only to vary *skeleton loading width*.

---

## 3) Data Lineage Matrix (UI -> hook/api -> endpoint -> source)

This section maps the main user-visible stats per page.

### 3.1 `/dashboard` (Dashboard)

UI: `client/src/pages/dashboard.tsx`

Sections:
- Sync pill + last update
  - Type: **REAL**
  - UI -> `usePlayerSync()` -> `api.player.sync()` -> `POST /api/player/sync`
  - Backend -> `server/routes.ts` -> storage + Clash API (`server/clashRoyaleApi.ts`)
- Stat cards (trophies, best season, winrate, wins/losses)
  - Type: **REAL** (trophies, best trophies, wins/losses) + **DERIVED** (winrate/streak/tilt)
  - Source: same `POST /api/player/sync` payload
- Current deck grid
  - Type: **REAL**
  - Source: `player.currentDeck` from sync payload (Clash player API)
- Trophy progress chart
  - Type: **DERIVED**
  - Source: `buildTrophyChartData({ battles, currentTrophies })` from `POST /api/player/sync`
- Goals summary
  - Type: **REAL**
  - Source: `sync.goals` (DB goals, auto-progress rules in `server/domain/syncRules.ts`)
- Recent battles list
  - Type: **REAL**
  - Source: `sync.battles`
- Favorites list
  - Type: **REAL**
  - UI -> `useFavorites()` -> `api.favorites.list()` -> `GET /api/favorites` -> DB

### 3.2 `/decks` (Decks & Meta)

UI: `client/src/pages/decks.tsx`

Sections:
- "My decks" (deck cards, winrate, matches)
  - Type: **DERIVED**
  - UI -> `usePlayerSync()` -> `POST /api/player/sync` -> battlelog
  - Computation: `buildDeckStatsFromBattles(battles)`
- "Meta decks" (cards grid, estimated WR, usage, trophies)
  - Type: **REAL** (DB cache) + **HEURISTIC/DERIVED** depending on fields (`estimatedWinRate`, `usageCount`, etc)
  - UI -> `api.meta.getDecks()` -> `GET /api/meta/decks` -> DB `meta_decks_cache`
- "View details" button
  - Type: **PLACEHOLDER_TEXT**
  - Currently shows toast: "Coming soon."

### 3.3 `/me` (My Profile - rich analytics)

UI: `client/src/pages/me.tsx`

Main data sources:
- Profile/linked tag: `useProfile()` -> `GET /api/profile` -> DB
- Clash Player: `useClashPlayer(tag)` -> `GET /api/clash/player/:tag` -> Clash API
- Battlelog: `useClashBattles(tag)` -> `GET /api/clash/player/:tag/battles` -> Clash API
- Goals: `useGoals()` -> `GET /api/goals` -> DB
- Subscription: `GET /api/subscription` -> DB

Known non-real parts (must be fixed to reach 100%):
- Trophy evolution chart uses **PLACEHOLDER (Math.random)**:
  - `client/src/pages/me.tsx: chartData` uses `Math.random()` and a base trophy value.
- PRO section uses **PLACEHOLDER_NUMERIC**:
  - Hardcoded "+150", "85%", etc.

### 3.4 `/training` (Training)

UI: `client/src/pages/training.tsx`

Current behavior:
- Subscription badge
  - Type: **REAL**
  - UI -> `api.subscription.get()` -> `GET /api/subscription` -> DB
- Drill cards + progress
  - Type: **PLACEHOLDER_NUMERIC**
  - Progress is fixed (60/30/90)
  - Titles/descriptions are static teaser text (not derived from your battles yet)
- PRO section
  - Type: **REAL** for plan gating, **PLACEHOLDER** for content

Note: the API layer already exists for real training plans/drills:
- `api.training.*` -> `/api/training/*` -> DB (`training_plans`, `training_drills`) + OpenAI generation
but the current page is not wired to it.

### 3.5 `/coach` (AI Coach)

UI: `client/src/pages/coach.tsx`

Sections:
- Chat
  - Type: **REAL**
  - UI -> `api.coach.chat()` -> `POST /api/coach/chat` -> OpenAI + DB `coach_messages`
- Push analysis generation + latest analysis
  - Type: **REAL** (generated content) + **DERIVED** metrics (wins/losses/net trophies, etc)
  - UI -> `api.coach.generatePushAnalysis()` -> `POST /api/coach/push-analysis`
  - Latest -> `GET /api/coach/push-analysis/latest`
  - Backend -> OpenAI + DB `push_analyses`

### 3.6 `/billing` (Billing / Subscription)

UI: `client/src/pages/billing.tsx`

Sections:
- Subscription status + plan badge
  - Type: **REAL**
  - UI -> `GET /api/subscription` -> DB
- Invoices
  - Type: **REAL**
  - UI -> `GET /api/billing/invoices` -> Stripe API
- Checkout/Portal CTAs
  - Type: **REAL**
  - UI -> `POST /api/stripe/checkout` / `POST /api/stripe/portal` -> Stripe API

### 3.7 `/community` and `/p/:tag` (Public)

UI:
- `client/src/pages/community.tsx`
- `client/src/pages/public-profile.tsx`

Sections:
- Rankings
  - Type: **REAL**
  - UI -> `GET /api/community/player-rankings` / `GET /api/community/clan-rankings` -> Clash API
- Public clan + members
  - Type: **REAL** (with partial fallback)
  - UI -> `GET /api/public/clan/:tag` -> Clash API
- Public player summary + recent battles
  - Type: **REAL**
  - UI -> `GET /api/public/player/:tag` -> Clash API

### 3.8 `/settings` and `/notifications`

UI:
- `client/src/pages/settings.tsx`
- `client/src/pages/notifications.tsx`

Settings:
- Account/profile/tag
  - Type: **REAL**
  - UI -> `GET /api/profile` + `PATCH /api/profile`
- Preferences + notification prefs
  - Type: **REAL**
  - UI -> `GET /api/settings` + `PATCH /api/settings`
  - UI -> `GET /api/notification-preferences` + `PATCH /api/notification-preferences`
- Billing tab inside Settings
  - Type: **PLACEHOLDER** (currently static values like "-")

Notifications:
- List + mark read + mark all + clear
  - Type: **REAL**
  - UI -> `GET /api/notifications`, `POST /api/notifications/*`, `DELETE /api/notifications`

### 3.9 `/profile` (Current "Profile" route)

UI: `client/src/pages/profile.tsx`

Status:
- Type: **MOCK**
- Should not exist in a production SaaS as-is (uses `mockData.ts` + hardcoded fields).

---

## 4) Finish Level Scorecard (%)

Rubric (fixed weights):
- Data: 50%
- Functionality: 30%
- Resilience: 10%
- Testability/Observability: 10%

Scoring rule:
- If user-facing stats include PLACEHOLDER/MOCK numeric values, Data score must be <= 25/50.

### 4.1 Summary Table

| Route | Page | Data | Func | Res | Test | Total | Notes |
|---|---:|---:|---:|---:|---:|---:|---|
| `/dashboard` | Dashboard | 50 | 27 | 8 | 5 | **90%** | All stats real/derived |
| `/decks` | Decks | 45 | 22 | 8 | 4 | **79%** | "Details" is coming soon |
| `/me` | My profile | 25 | 24 | 7 | 3 | **59%** | Random chart + PRO numeric placeholder |
| `/training` | Training | 15 | 12 | 7 | 2 | **36%** | Drill progress is hardcoded |
| `/coach` | AI Coach | 45 | 27 | 8 | 4 | **84%** | Depends on OpenAI availability |
| `/billing` | Billing | 45 | 27 | 8 | 4 | **84%** | Depends on Stripe + webhooks |
| `/community` | Community | 40 | 24 | 8 | 3 | **75%** | Depends on Clash availability |
| `/p/:tag` | Public profile | 45 | 22 | 8 | 3 | **78%** | External dependency |
| `/notifications` | Notifications | 50 | 27 | 8 | 3 | **88%** | Solid |
| `/settings` | Settings | 35 | 24 | 7 | 3 | **69%** | Billing tab is placeholder |
| `/onboarding` | Onboarding | 50 | 27 | 8 | 3 | **88%** | Solid |
| `/auth` | Auth | 50 | 27 | 8 | 3 | **88%** | Real; email confirm depends on Supabase config |
| `/profile` | Profile | 0 | 5 | 8 | 0 | **13%** | MOCK page; must be removed/redirected |
| `/` | Landing | 50 | 27 | 8 | 0 | **85%** | Static marketing (no data risk) |

---

## 5) Runtime Verification Checklist (smoke)

### 5.1 Auth (Supabase)
- `GET /api/auth/user` without `Authorization`:
  - Expect: `401` JSON, never `500`
- First login (new user):
  - Expect: `/api/auth/user` returns user + profile + settings + subscription

### 5.2 Clash sync (server-side)
- With a profile tag linked:
  - `POST /api/player/sync`:
    - Expect: `200` with `player`, `battles`, `stats`, `goals`, `lastSyncedAt`
- Without a profile tag:
  - Expect: clear error code (no crash)

### 5.3 RLS (two accounts)
Setup: create Account A + Account B.
- A creates goal/favorite/notification
- B attempts to access A's resource by ID
  - Expect: `404` or `403`, never data leakage

### 5.4 Stripe (test mode)
- `POST /api/stripe/checkout` returns URL and redirects to Stripe
- After webhook events:
  - `GET /api/subscription` reflects `plan=pro` and `status=active`
- `GET /api/billing/invoices` returns list

---

## 6) Backlog To Reach 100% (actionable)

Priority order (highest risk first):

1. **Remove MOCK route `/profile`**
   - Goal: no user-visible route imports `client/src/lib/mockData.ts`.
2. **Fix `/me` placeholders**
   - Replace `Math.random()` trophy chart with DERIVED data from battlelog.
   - Remove hardcoded numeric PRO placeholders (+150 / 85% / etc).
3. **Wire `/training` to real training plans/drills**
   - Use `/api/training/*` endpoints and DB tables.
4. **Implement or remove Decks "Details"**
   - No core CTA should be "coming soon."
5. **Settings billing tab**
   - Either remove it (link to `/billing`) or wire it to real subscription/invoices.

