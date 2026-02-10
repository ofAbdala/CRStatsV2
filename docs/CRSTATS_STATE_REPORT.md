# CRStats — State of the Project Report

> **Generated:** 2026-01-16  
> **Audit Type:** Read-only diagnostic  
> **Scope:** Full-stack (backend, frontend, shared, i18n, tests, infra)

---

## Executive Summary

CRStats is a **Clash Royale statistics and coaching SaaS** built with React 19 + Vite 7 (frontend), Express + Drizzle ORM (backend), Supabase (auth + DB), Stripe (billing), and OpenAI (AI coach). The project is in **advanced prototype / early-production** stage — core user flows (auth, sync, dashboard, billing) are functional and use real APIs, but several secondary features carry **mock data**, **hardcoded pt-BR strings bypassing i18n**, and have **zero frontend test coverage**.

### Health Score: `6.5 / 10`

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Core Flows** | 8/10 | Auth, sync, dashboard, billing work end-to-end with real data |
| **AI Features** | 7/10 | Coach, training, deck optimization integrated with OpenAI; fallbacks in place |
| **Data Integrity** | 6/10 | Mock data still present in production Decks page |
| **i18n Compliance** | 5/10 | `me.tsx` (2049 lines) has 27+ hardcoded pt-BR strings bypassing i18n system |
| **Test Coverage** | 3/10 | Only 5 test files, all backend domain logic — zero frontend tests |
| **Code Quality** | 6/10 | `routes.ts` is 3875 lines (god-file); `me.tsx` is 2049 lines |

---

## Feature Status Matrix

| Feature Area | Status | Confidence | Key Files | Notes |
|---|---|---|---|---|
| **Auth (Supabase)** | ✅ Production-ready | High | `supabaseAuth.ts`, `auth.tsx`, `useAuth.ts` | JWT verification, `requireAuth` middleware, OAuth flow |
| **Player Sync** | ✅ Production-ready | High | `routes.ts` (sync block), `usePlayerSync.ts`, `syncRules.ts` | Real CR API via proxy, push session computation, battle de-dup |
| **Dashboard** | ✅ Production-ready | High | `dashboard.tsx` (535 lines) | Fully i18n'd, real data, tilt detection, trophy chart, goals, favorites |
| **Tilt Detection** | ✅ Production-ready | High | `shared/domain/tilt.ts`, `syncRules.ts` + tests | Time-decay model, 3-tier levels, snooze/dismiss UI, 5 test cases |
| **Goals** | ✅ Implemented | Medium | `goals.tsx`, `routes.ts`, `syncRules.ts` | Auto-progress (trophies/winrate/streak), tested in `syncRules.test.ts` |
| **Billing (Stripe)** | ✅ Production-ready | High | `stripeService.ts`, `stripeClient.ts`, `billing.tsx`, `stripeCheckout.test.ts` | Checkout, portal, webhook handler, invoice history, price validation tested |
| **Notifications** | ✅ Implemented | Medium | `notifications.tsx`, `useNotifications.ts`, `routes.ts` | CRUD + preferences, triggered on billing events & training plans |
| **Community** | ✅ Implemented | Medium | `community.tsx` | Global rankings (players/clans), clan details, tag search — all real CR API |
| **Public Profile** | ✅ Implemented | Medium | `public-profile.tsx` | View any player by tag, real data |
| **Settings** | ✅ Implemented | Medium | `settings.tsx` (764 lines) | Profile, tag management, notification prefs, locale, danger zone |
| **Coach AI** | ⚠️ Implemented, fragile | Medium | `coach.tsx`, `openai.ts`, `routes.ts` | OpenAI integration with fallbacks; FREE limit (5 msgs/day) enforced server-side |
| **Training Center** | ⚠️ Implemented, fragile | Medium | `training.tsx`, `openai.ts`, `routes.ts` | Training plans, drills, push analysis; PRO-gated; notifications on completion |
| **Meta Decks** | ✅ Implemented (Real Data) | High | `decks.tsx`, `metaDecksRefresh.ts` | **REAL DATA**: Mock `avgCrowns`/`topPlayers` removed. Shows real backend stats only. |
| **Counter Decks** | ⚠️ Implemented, fragile | Medium | `decks.tsx`, `openai.ts` | Hard-coded COUNTER_MAP + OpenAI suggestions; PRO-gated |
| **Deck Optimizer** | ⚠️ Implemented, fragile | Medium | `decks.tsx`, `openai.ts` | 3 optimization goals via OpenAI; PRO-gated |
| **Me Page (Detailed Stats)** | ⚠️ Implemented, i18n-broken | Medium | `me.tsx` (2049 lines) | Rich analytics but 27+ hardcoded pt-BR strings; duplicated push logic |
| **Landing Page** | ✅ Implemented | Medium | `landing.tsx` | Marketing page |
| **Onboarding** | ✅ Implemented | Medium | `onboarding.tsx` | New user flow |
| **i18n System** | ⚠️ Partially implemented | Medium | `shared/i18n/`, translations `pt-BR.json`, `en-US.json` | System works but `me.tsx` and `routes.ts` bypass it with hardcoded strings |

---

## Mock Data & Placeholder Inventory

### 🔴 CRITICAL — Visible to Users

| File | Lines | Type | Description | Impact |
|---|---|---|---|---|
| `client/src/pages/decks.tsx` | — | **RESOLVED** | Mock data functions removed. UI now shows only real backend stats. |
| `client/src/pages/me.tsx` | 803 | **PLACEHOLDER** | `#XXXXXXXX` shown if no tag configured | Minor — only shown to users without tag |

### 🟡 MODERATE — UI shimmer / placeholder text

| File | Lines | Type | Description |
|---|---|---|---|
| `shared/i18n/translations/en-US.json` | — | **PLACEHOLDER** | `detailsDescription: "Coming soon."` |
| `shared/i18n/translations/pt-BR.json` | — | **PLACEHOLDER** | `detailsDescription: "Em breve."` |
| `client/src/lib/clashIcons.ts` | — | **FALLBACK** | 1x1 transparent GIF as "never 404" placeholder for missing icons (acceptable) |

### 🟢 BENIGN — Filters not yet wired

| File | Lines | Type | Description |
|---|---|---|---|
| `client/src/pages/decks.tsx` | 568 | **UI-only** | Comment: `/* UI-only for now; filtering will be wired to backend later */` — mode and trophy range selectors are visual stubs |
| `client/src/pages/decks.tsx` | 750 | **UI-only** | Comment: `/* UI-only for now; the mode selector will influence API calls later */` |

---

## i18n Compliance Audit

### ✅ Well-i18n'd Pages

- `dashboard.tsx` — All strings use `t()` function
- `billing.tsx` — Fully translated
- `coach.tsx` — Uses locale system
- `community.tsx` — Uses locale system
- `training.tsx` — Uses locale system
- `notifications.tsx` — Uses locale system
- `settings.tsx` — Uses locale system
- `decks.tsx` — Mostly uses locale system

### 🔴 i18n Violations

#### `me.tsx` — **27+ hardcoded pt-BR strings** (most critical)

| Line | Hardcoded String | Should Be |
|---|---|---|
| 71 | `'Batalha'` | `t('me.battleType.default')` |
| 73 | `'Ladder'` | `t('me.battleType.ladder')` |
| 74 | `'Desafio'` | `t('me.battleType.challenge')` |
| 75 | `'Torneio'` | `t('me.battleType.tournament')` |
| 77 | `'Guerra'` | `t('me.battleType.war')` |
| 78 | `'Amistoso'` | `t('me.battleType.friendly')` |
| 79 | `'Festa'` | `t('me.battleType.party')` |
| 453 | `'Em risco de tilt'` | `t('me.tilt.atRisk')` |
| 456 | `'Em alta!'` | `t('me.tilt.onFire')` |
| 458 | `'Consistente'` | `t('me.tilt.consistent')` |
| 505 | `'Deck Principal'`, `'Deck Secundário'` | `t('me.deckPrimary')` etc. |
| 587–590 | `'Beatdown'`, `'Ciclo'`, `'Controle'`, `'Aéreo'` | `t('me.archetype.*')` |
| 692 | `['Dom', 'Seg', ...]` | Use date-fns locale |
| 760 | `'Carregando perfil...'` | `t('common.loadingProfile')` |
| 775–776 | Error messages in pt-BR | `t('me.errors.*')` |
| 797 | `'Jogador'` | `t('me.playerFallback')` |
| 873 | `'Arena'` | `t('me.arenaFallback')` |
| 1282, 1302 | `'Oponente'` | `t('me.opponentFallback')` |
| 1676 | `'Troféus'` | `t('me.chartLabel.trophies')` |
| 1773 | `'partidas'`, `'Partidas'` | `t('me.chartLabel.matches')` |

#### `server/routes.ts` — **2 hardcoded pt-BR notification strings**

| Line | String |
|---|---|
| 2167 | `'Sua assinatura PRO foi ativada com sucesso. Aproveite todos os recursos premium!'` |
| 2227 | `'Sua assinatura PRO foi cancelada. Você voltou para o plano gratuito.'` |
| 2280 | `'O pagamento da sua assinatura PRO falhou...'` |

---

## Test Coverage Map

### Existing Tests (5 files, all server-side / shared)

| File | Tests | What's Covered |
|---|---|---|
| `server/domain/battleHistory.test.ts` | 5 | Battle key generation, battle time parsing, history limit clamping |
| `server/domain/stripeCheckout.test.ts` | 3 | Checkout price ID allowlist, validation (missing/invalid) |
| `server/domain/syncRules.test.ts` | 7 | Push session grouping, tilt detection (high/medium), tilt decay (2h/6h/12h), coach limit, goal auto-progress |
| `shared/clashTag.test.ts` | 6 | Tag parsing (with/without #), normalization, validation (empty, invalid chars, length) |
| `shared/contracts/playerSyncPayload.test.ts` | 2 | Sync payload validation (accept empty, reject unknown fields) |
| **TOTAL** | **23 tests** | |

### 🔴 Critical Test Gaps

| Area | Risk Level | Why |
|---|---|---|
| **Frontend (0 tests)** | 🔴 Critical | No component, integration, or E2E tests. 16 pages, 11 hooks, many components — all untested |
| **API Routes (0 tests)** | 🔴 Critical | `routes.ts` (3875 lines) has zero integration tests. Stripe webhook, sync endpoints, AI endpoints — all untested |
| **OpenAI integration** | 🔴 High | `openai.ts` (555 lines) has no tests. Fallback logic, JSON parsing, prompt construction — untested |
| **Meta Deck Refresh** | 🟡 Medium | `metaDecksRefresh.ts` (401 lines) — concurrency control, advisory locks, fallback — untested |
| **Storage layer** | 🟡 Medium | `storage.ts` (1234 lines) — all DB operations untested |
| **Tilt domain (shared)** | ✅ Covered | `shared/domain/tilt.ts` tested via `syncRules.test.ts` |

---

## Architecture & Code Quality Observations

### 🔴 God Files (high complexity, maintenance risk)

| File | Lines | Concern |
|---|---|---|
| `server/routes.ts` | 3875 | Entire API surface in one file. Should be split into route modules |
| `client/src/pages/me.tsx` | 2049 | Detailed stats page. Contains duplicated push session logic (also in `syncRules.ts`), hardcoded strings, complex analytics computations inline |
| `client/src/pages/decks.tsx` | 1492 | Meta, counter, optimizer all in one page + mock data |
| `server/storage.ts` | 1234 | All DB operations |
| `server/openai.ts` | 555 | All AI integrations |

### 🟡 Architecture Patterns (Good)

- **Domain layer**: Clean separation in `server/domain/` (syncRules, battleHistory, decks, metaDecksRefresh, stripeCheckout)
- **Shared types**: `shared/schema.ts` with Drizzle + Zod provides type safety
- **i18n system**: Well-structured `shared/i18n/` with JSON translations and `t()` function
- **Error handling**: Centralized `errorMessages.ts` with i18n-aware API error codes
- **PRO gating**: Consistent `isPro` checks across 15+ endpoints server-side

### 🟢 Infrastructure (Solid)

- **Deployment**: Vercel + serverless functions configured via `vercel.json`
- **Auth**: Supabase JWT verification with middleware pattern
- **Billing**: Full Stripe integration (checkout, portal, webhooks, invoice history)
- **CR API**: Proxy-based wrapper with error handling

---

## Top 10 Risks (Prioritized)

| # | Risk | Severity | Impact | Mitigation |
|---|---|---|---|---|
| 1 | **Mock data visible to users** (decks.tsx) | ✅ Resolved | Mock functions removed |
| 1a | **Zero frontend tests** | 🔴 Critical | Any change can break UI without detection | Add E2E tests for critical flows (auth, sync, billing) |
| 3 | **Zero API route tests** | 🔴 Critical | Webhook bugs, sync failures undetectable | Add integration tests for Stripe webhook + sync |
| 4 | **`me.tsx` i18n violations** (27+ hardcoded pt-BR strings) | 🟡 High | English users see Portuguese text | Extract all strings to translation files |
| 5 | **`routes.ts` god-file** (3875 lines) | 🟡 High | Merge conflicts, hard to reason about | Split into route modules |
| 6 | **Server-side hardcoded pt-BR notifications** | 🟡 High | Notification text not localized for en-US users | Use i18n keys in notifications |
| 7 | **OpenAI fallback untested** | 🟡 Medium | AI failures may produce unexpected responses | Add unit tests for fallback paths |
| 8 | **Duplicated push session logic** (me.tsx vs syncRules.ts) | 🟡 Medium | Divergent implementations may produce inconsistent results | Consolidate to shared module |
| 9 | **Meta deck filters are UI-only** (mode, trophy range) | 🟢 Low | Filters don't affect results — cosmetic issue | Wire to API query params |
| 10 | **Decks page card classifier hardcoded** (heroes, evolutions, tower troops) | 🟢 Low | New cards require manual code updates | Fetch card metadata from CR API |

---

## Prioritized Action Plan

### Phase 1: Data Integrity (Week 1) — **Highest Priority**

- [x] **Remove or replace mock data in `decks.tsx`**
  - Removed `MOCK_TOP_PLAYER_NAMES`, `buildMockAvgCrowns`, `buildMockTopPlayers`
  - Removed `avgCrowns` + `topPlayers` from UI and types
  - Verified backend `/api/decks/meta` returns real data
  
- [ ] **Fix server-side hardcoded pt-BR notification strings** in `routes.ts` (lines 2167, 2227, 2280)
  - Use i18n keys or store locale-aware notification templates

### Phase 2: i18n Compliance (Week 1–2)

- [ ] **Extract all hardcoded strings from `me.tsx`** (~27 strings)
  - Add keys to `pt-BR.json` and `en-US.json`
  - Replace inline strings with `t()` calls
  - Special attention to date formatting (use `date-fns` locale)
  
- [ ] **Fix "Coming soon" / "Em breve" placeholder** in `detailsDescription`

### Phase 3: Test Coverage (Week 2–3)

- [ ] **Add E2E tests** (Playwright) for critical flows:
  - Auth flow (login → dashboard)
  - Player sync + data display
  - Billing checkout flow
  - Coach AI conversation
  
- [ ] **Add API integration tests** for:
  - Stripe webhook handler (all event types)
  - Player sync endpoint
  - Coach message endpoint (with/without FREE limit)
  
- [ ] **Add unit tests** for:
  - `openai.ts` fallback paths
  - `metaDecksRefresh.ts` concurrency + fallback logic
  - `storage.ts` critical operations

### Phase 4: Code Quality (Week 3–4)

- [ ] **Split `routes.ts`** into route modules:
  - `routes/auth.ts`
  - `routes/player.ts`
  - `routes/coach.ts`
  - `routes/training.ts`
  - `routes/decks.ts`
  - `routes/billing.ts`
  - `routes/community.ts`
  - `routes/notifications.ts`
  
- [ ] **Refactor `me.tsx`** — extract analytics computations into shared hooks/utils
  - Consolidate push session logic with `syncRules.ts`
  - Extract chart data builders
  
- [ ] **Refactor `decks.tsx`** — split into sub-components

### Phase 5: Feature Completion (Week 4+)

- [ ] Wire meta deck mode/trophy-range filters to API
- [ ] Fetch card type metadata (heroes, evolutions, tower troops) from CR API instead of hardcoding
- [ ] Add real `avgCrowns` and `topPlayers` aggregation to `metaDecksRefresh.ts`
- [ ] Implement `detailsDescription` feature (whatever it's meant to show)

---

## File Size Summary (Top 10 Largest Source Files)

| File | Lines | Bytes |
|---|---|---|
| `server/routes.ts` | 3,875 | — |
| `client/src/pages/me.tsx` | 2,049 | 90 KB |
| `client/src/pages/decks.tsx` | 1,492 | 57 KB |
| `server/storage.ts` | 1,234 | — |
| `client/src/pages/settings.tsx` | 764 | 33 KB |
| `shared/schema.ts` | 697+ | — |
| `server/openai.ts` | 555 | — |
| `client/src/pages/dashboard.tsx` | 535 | 25 KB |
| `client/src/pages/training.tsx` | 542 | 26 KB |
| `server/domain/metaDecksRefresh.ts` | 401 | — |

---

## Appendix: Test File Inventory

```
server/domain/battleHistory.test.ts    — 88 lines,  5 tests
server/domain/stripeCheckout.test.ts   — 25 lines,  3 tests
server/domain/syncRules.test.ts        — 170 lines, 7 tests
shared/clashTag.test.ts                — 40 lines,  6 tests
shared/contracts/playerSyncPayload.test.ts — 17 lines, 2 tests
─────────────────────────────────────────────────────────────
TOTAL: 5 files, 340 lines, 23 tests
```

---

*Report generated by Antigravity audit. No files were modified during this audit.*
