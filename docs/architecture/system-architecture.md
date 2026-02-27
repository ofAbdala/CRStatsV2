# CRStats -- System Architecture Document

**Phase:** Brownfield Discovery -- Phase 1 (System Architecture)
**Agent:** @architect (Aria)
**Date:** 2026-02-27
**Codebase Version:** `rest-express` 1.0.0

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture Pattern](#3-architecture-pattern)
4. [Component Map](#4-component-map)
5. [Data Flow](#5-data-flow)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [API Surface](#7-api-surface)
8. [Deployment Architecture](#8-deployment-architecture)
9. [Dependencies Graph](#9-dependencies-graph)
10. [Integration Points](#10-integration-points)
11. [Strengths](#11-strengths)
12. [Weaknesses & Risks](#12-weaknesses--risks)
13. [Security Assessment](#13-security-assessment)

---

## 1. System Overview

### What It Is

CRStats is a **Clash Royale player analytics and coaching platform** that helps players improve their competitive game performance. It connects to the official Clash Royale API, tracks battle history over time, and uses AI (OpenAI) to generate personalized coaching insights, push session analyses, training plans, and deck suggestions.

### Core Value Proposition

| Capability | Description |
|-----------|-------------|
| **Player Sync** | Link a Clash Royale player tag, sync profile and battle data |
| **Battle Analytics** | Historical battle tracking, win/loss streaks, tilt detection |
| **AI Coach** | GPT-4o-mini powered chat coach with Clash Royale expertise |
| **Push Analysis** | AI-generated session analysis detecting patterns, strengths, mistakes |
| **Training Plans** | AI-generated drill plans tied to push analyses |
| **Deck Intelligence** | Meta deck cache from top-ranked players, counter deck suggestions, deck optimizer |
| **Freemium Model** | Free tier with daily limits, Pro tier (R$19.90/month or R$159/year) via Stripe |
| **i18n** | Portuguese (default) and English support |
| **Public Profiles** | Shareable player profiles at `/p/:tag` |

### Target Market

Brazilian Clash Royale players (default currency BRL, default language `pt-BR`). The system is designed with i18n scaffolding for future expansion but currently supports only BRL pricing.

---

## 2. Technology Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19.2.0 | UI framework |
| TypeScript | 5.6.3 | Type safety |
| Vite | 7.1.9 | Build tool and dev server (HMR) |
| Tailwind CSS | 4.1.14 | Utility-first styling |
| Radix UI | Various | Accessible headless component primitives (20+ packages) |
| shadcn/ui | (via components.json) | Pre-styled component library built on Radix + Tailwind |
| TanStack React Query | 5.60.5 | Server state management, caching, mutations |
| wouter | 3.3.5 | Lightweight client-side routing (3KB alternative to React Router) |
| Recharts | 2.15.4 | Data visualization / charts |
| Framer Motion | 12.23.24 | Animations |
| Lucide React | 0.545.0 | Icon library |
| React Hook Form | 7.66.0 | Form management with Zod resolvers |
| Sonner | 2.0.7 | Toast notifications |
| Vercel Speed Insights | 1.3.1 | Real User Monitoring (RUM) |

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | >= 18 | Runtime (ESM) |
| Express | 4.21.2 | HTTP framework |
| TypeScript (tsx) | 4.20.5 | TS execution for dev server |
| Drizzle ORM | 0.39.3 | Type-safe PostgreSQL ORM with schema-as-code |
| Drizzle Kit | 0.31.4 | Schema push/migration tool |
| pg (node-postgres) | 8.16.3 | PostgreSQL driver |
| Zod | 3.25.76 | Runtime schema validation (shared with frontend) |
| jose | 6.1.3 | JWT verification (Supabase JWKS) |
| OpenAI SDK | 6.10.0 | AI completions (GPT-4o-mini) |
| Stripe | 20.0.0 | Payment processing |
| Supabase JS | 2.95.3 | Auth client (frontend) |
| memoizee | 0.4.17 | Memoization utility |
| ws | 8.18.0 | WebSocket support (listed but minimal usage) |

### Infrastructure

| Component | Details |
|-----------|---------|
| Database | PostgreSQL (Supabase-hosted, connection via `DATABASE_URL`) |
| Auth | Supabase Auth (JWT + JWKS verification) |
| Hosting | Vercel (serverless functions) |
| Build | esbuild (server bundle to CJS) + Vite (client SPA) |
| Dev Environment | Replit (optional, with dev banner/cartographer plugins) |

---

## 3. Architecture Pattern

### Pattern: Monolithic Full-Stack with Shared Schema

```
+-------------------------------------------------------------------+
|                        Vercel Deployment                          |
|                                                                   |
|  +---------------------------+  +------------------------------+  |
|  |   Client (React SPA)     |  |   Server (Express API)       |  |
|  |                           |  |                              |  |
|  |  wouter routing           |  |  /api/* routes               |  |
|  |  React Query cache        |  |  Domain logic modules        |  |
|  |  Supabase Auth client     |  |  Drizzle ORM storage layer   |  |
|  |  API client (fetchAPI)    |  |  External API integrations   |  |
|  +---------------------------+  +------------------------------+  |
|              |                              |                     |
|              +---------- shared/ -----------+                     |
|                   |                                               |
|                   v                                               |
|            schema.ts (DB + Zod)                                   |
|            pricing.ts, i18n/, domain/tilt.ts                      |
+-------------------------------------------------------------------+
                              |
               +--------------+---------------+
               |              |               |
        Supabase Auth    PostgreSQL      External APIs
        (JWKS + JWT)     (Supabase)   (Clash Royale, OpenAI, Stripe)
```

**Classification:** This is a **Monolithic SPA + API Server** architecture with:

- **Shared schema layer** (`shared/`) providing type-safe contracts between client and server
- **Flat route handler** pattern (all endpoints defined in a single `routes.ts` file)
- **Domain module** extraction for business logic (`server/domain/`)
- **Repository pattern** via `IStorage` interface with `DatabaseStorage` implementation
- **No MVC controllers** -- routes directly call storage and domain functions

The architecture follows a **2.5-tier** pattern:

1. **Presentation tier** -- React SPA (client-side routing, React Query)
2. **Application tier** -- Express API (routes + domain logic, no formal service layer)
3. **Data tier** -- PostgreSQL via Drizzle ORM

---

## 4. Component Map

### 4.1 Frontend Components

#### Pages (14 routes)

| Route | Page Component | Auth Required | Description |
|-------|---------------|---------------|-------------|
| `/` | LandingPage / DashboardPage | Conditional | Landing for anon, dashboard for auth |
| `/auth` | AuthPage | No | Supabase Auth UI |
| `/onboarding` | OnboardingPage | Yes | First-time player tag setup |
| `/dashboard` | DashboardPage | Yes | Main analytics dashboard |
| `/coach` | CoachPage | Yes | AI coach chat interface |
| `/training` | TrainingPage | Yes | Training plans and drills |
| `/decks` | DecksPage | Yes | Meta decks, counter builder, optimizer |
| `/community` | CommunityPage | Yes | Player/clan rankings |
| `/goals` | GoalsPage | Yes | Trophy/winrate/streak goals |
| `/settings` | SettingsPage | Yes | User preferences |
| `/profile` | ProfilePage | Yes | Player profile management |
| `/billing` | BillingPage | Yes | Subscription management |
| `/me` | MePage | Yes | Personal stats summary |
| `/notifications` | NotificationsPage | Yes | Notification center |
| `/p/:tag` | PublicProfilePage | No | Public player profile |

#### Key Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useAuth` | `useAuth.ts` | Supabase session + user data via React Query |
| `useLocale` | `use-locale.tsx` | i18n provider and `t()` translation function |
| `useClashPlayer` | `useClashPlayer.ts` | Player data fetching from Clash Royale API |
| `usePlayerSync` | `usePlayerSync.ts` | Sync trigger and sync state management |
| `useProfile` | `useProfile.ts` | Profile CRUD operations |
| `useSettings` | `useSettings.ts` | User settings management |
| `useGoals` | `useGoals.ts` | Goals CRUD and progress tracking |
| `useFavorites` | `useFavorites.ts` | Favorite players management |
| `useNotifications` | `useNotifications.ts` | Notification list and actions |
| `use-mobile` | `use-mobile.tsx` | Responsive breakpoint detection |
| `use-toast` | `use-toast.ts` | Toast notification state |

#### API Client (`client/src/lib/api.ts`)

Centralized HTTP client with:
- Automatic Supabase access token injection via `Authorization: Bearer` header
- Structured error handling (`ApiError` class with code, details, requestId)
- Domain-organized methods matching backend routes (e.g., `api.coach.chat()`, `api.decks.generateCounter()`)

### 4.2 Backend Components

#### Route Organization (`server/routes.ts` -- 3,874 lines)

All 46 endpoints are defined in a single `registerRoutes()` function. The file acts as both the router definition and request handler layer.

#### Storage Layer (`server/storage.ts`)

| Component | Description |
|-----------|-------------|
| `IStorage` | Interface defining 50+ data access methods across 13 entity domains |
| `DatabaseStorage` | Drizzle ORM implementation with RLS-aware transactions |
| `serviceStorage` | Singleton instance without auth context (for webhooks, background jobs) |
| `getUserStorage(auth)` | Factory returning auth-scoped storage (sets PostgreSQL session vars for RLS) |

**RLS Integration:** `DatabaseStorage.runAsUser()` wraps every query in a transaction that sets `request.jwt.claims`, `request.jwt.claim.sub`, and `set local role authenticated` to enable Supabase Row Level Security policies.

#### Domain Modules (`server/domain/`)

| Module | File | Responsibilities |
|--------|------|-----------------|
| **Sync Rules** | `syncRules.ts` | Push session computation, tilt re-exports, consecutive losses, goal auto-progress, coach free limit evaluation |
| **Battle History** | `battleHistory.ts` | Battle key generation (SHA-256), time extraction, history limits (FREE: 10 battles, PRO: 60 days / 2000 max), clamping utilities |
| **Stripe Checkout** | `stripeCheckout.ts` | Price ID whitelist validation against `PRICING` constants |
| **Decks** | `decks.ts` | Card index with TTL cache (24h), avg elixir computation, deck import link builder, deck hash normalization, archetype detection, win condition detection, counter map, card change diffing |
| **Meta Decks Refresh** | `metaDecksRefresh.ts` | Background refresh of top-50 meta decks from global top players with PostgreSQL advisory lock, concurrent battle fetching, clan fallback seeding |

#### Shared Domain (`shared/domain/`)

| Module | File | Responsibilities |
|--------|------|-----------------|
| **Tilt Engine** | `tilt.ts` | Tilt level computation (none/medium/high), risk scoring (0-100), time-decay stages (2h/6h/12h), battle time parsing |

#### External API Integrations

| Module | File | External Service |
|--------|------|-----------------|
| `clashRoyaleApi.ts` | Clash Royale API client | RoyaleAPI proxy (`proxy.royaleapi.dev/v1`) |
| `openai.ts` | OpenAI completions | Configurable base URL + API key |
| `stripeService.ts` | Stripe billing | Customer, checkout, portal management |
| `stripeClient.ts` | Stripe SDK factory | Lazy-initialized Stripe client |
| `supabaseAuth.ts` | JWT verification | Supabase JWKS endpoint |

### 4.3 Shared Layer (`shared/`)

| File/Dir | Purpose |
|----------|---------|
| `schema.ts` | 14 Drizzle table definitions, Zod validation schemas, TypeScript types, ORM relations |
| `pricing.ts` | Pricing plans, currency formatting, yearly savings calculation |
| `i18n/index.ts` | Locale detection, currency detection, `pt-BR` and `en-US` translation files |
| `domain/tilt.ts` | Tilt computation engine (shared between server and potential future client use) |
| `contracts/` | Test file for player sync payload contract |
| `clashTag.ts` | Tag normalization utilities |

---

## 5. Data Flow

### 5.1 Request-Response Lifecycle

```
Browser                    Vercel/Express              PostgreSQL          External APIs
  |                            |                          |                    |
  |-- GET /api/auth/user ----->|                          |                    |
  |   (Bearer JWT)             |                          |                    |
  |                            |-- requireAuth() -------->|                    |
  |                            |   jwtVerify(JWKS)        |                    |
  |                            |                          |                    |
  |                            |-- getUserStorage(auth) ->|                    |
  |                            |   SET request.jwt.claims |                    |
  |                            |   SET local role auth    |                    |
  |                            |                          |                    |
  |                            |-- SELECT from users ---->|                    |
  |                            |<-- user row -------------|                    |
  |                            |                          |                    |
  |                            |-- bootstrapUserData() -->|                    |
  |                            |   INSERT profiles        |                    |
  |                            |   INSERT user_settings   |                    |
  |                            |   INSERT subscriptions   |                    |
  |                            |   INSERT notif_prefs     |                    |
  |                            |<-- profile, settings ----|                    |
  |                            |                          |                    |
  |<-- { user, profile,       |                          |                    |
  |      subscription,        |                          |                    |
  |      settings }            |                          |                    |
```

### 5.2 Player Sync Flow

```
Client                    Server                      PostgreSQL      Clash Royale API
  |                          |                            |                |
  |-- POST /api/player/sync->|                            |                |
  |                          |-- getProfile(userId) ----->|                |
  |                          |<-- { defaultPlayerTag } ---|                |
  |                          |                            |                |
  |                          |-- getPlayerByTag(tag) ---->|                |
  |                          |                            |           -----+
  |                          |<-- player data ------------|-----------|    |
  |                          |                            |                |
  |                          |-- getPlayerBattles(tag) -->|                |
  |                          |                            |           -----+
  |                          |<-- battle log -------------|-----------|    |
  |                          |                            |                |
  |                          |-- upsertBattleHistory() -->|                |
  |                          |   (dedupe by battleKey)    |                |
  |                          |                            |                |
  |                          |-- pruneBattleHistory() --->|                |
  |                          |   (FREE: keep 10,          |                |
  |                          |    PRO: keep 60 days)      |                |
  |                          |                            |                |
  |                          |-- computeBattleStats() ----|                |
  |                          |-- computeGoalAutoProgress()|                |
  |                          |-- updateSyncState() ------>|                |
  |                          |                            |                |
  |<-- { player, stats,     |                            |                |
  |      goals, tilt,       |                            |                |
  |      pushSessions }      |                            |                |
```

### 5.3 AI Coach Chat Flow

```
Client                    Server                      PostgreSQL      OpenAI
  |                          |                            |              |
  |-- POST /api/coach/chat ->|                            |              |
  |   { messages, tag }      |                            |              |
  |                          |-- isPro(userId) ---------->|              |
  |                          |                            |              |
  |                          |-- countCoachMessagesToday->|              |
  |                          |   (FREE limit: 5/day)      |              |
  |                          |                            |              |
  |                          |-- generateCoachResponse -->|              |
  |                          |   (system prompt +         |         -----+
  |                          |    player context +        |---------|    |
  |                          |    chat history)           |              |
  |                          |                            |              |
  |                          |<-- AI response ------------|              |
  |                          |                            |              |
  |                          |-- createCoachMessage() x2->|              |
  |                          |   (user msg + assistant)   |              |
  |                          |                            |              |
  |<-- { message, timestamp, |                            |              |
  |      remainingMessages } |                            |              |
```

---

## 6. Authentication & Authorization

### Auth Architecture

```
+---------------+     +------------------+     +------------------+
|  Supabase     |     |  Express Server  |     |  PostgreSQL      |
|  Auth Service |     |                  |     |                  |
|               |     |  requireAuth()   |     |  RLS Policies    |
|  JWT issuer   |---->|  JWKS verify     |---->|  request.jwt.*   |
|  JWKS endpoint|     |  req.auth = {    |     |  role=authenticated|
|               |     |    userId,       |     |                  |
+---------------+     |    role,         |     +------------------+
                      |    claims,       |
                      |    accessToken   |
                      |  }               |
                      +------------------+
```

### Middleware Chain

1. **Request ID** -- Assigns/propagates `x-request-id` header (UUID)
2. **JSON Body Parser** -- Parses JSON except for Stripe webhook path
3. **URL Encoded Parser** -- Form data support
4. **Request Logger** -- Logs API path, status, duration, requestId, response body
5. **`requireAuth`** -- JWT verification via Supabase JWKS (per-route, not global)
6. **Route Handler** -- Business logic
7. **Error Handler** -- Structured error response with code, message, details, requestId

### JWT Verification Details

- **Library:** `jose` (not `jsonwebtoken`)
- **JWKS URL:** `{SUPABASE_URL}/auth/v1/.well-known/jwks.json` (auto-derived or configurable via `SUPABASE_JWKS_URL`)
- **Audience:** `"authenticated"`
- **Issuer:** `{SUPABASE_URL}/auth/v1`
- **JWKS Set:** Cached in memory after first fetch

### RLS (Row Level Security) Integration

The `DatabaseStorage` class implements dual-mode operation:

| Mode | When Used | RLS Active |
|------|-----------|-----------|
| **Service mode** | `serviceStorage` (webhooks, background jobs) | No -- direct DB access |
| **User mode** | `getUserStorage(req.auth)` (authenticated routes) | Yes -- sets `request.jwt.claims`, `request.jwt.claim.sub`, `local role authenticated` |

### Authorization Tiers

| Feature | Free Tier | Pro Tier |
|---------|-----------|----------|
| Battle history | Last 10 battles | 60 days / 2000 battles |
| Coach chat | 5 messages/day | Unlimited |
| Push analysis | 5/day | Unlimited |
| Deck suggestions (counter) | 2/day | Unlimited |
| Deck suggestions (optimizer) | 2/day | Unlimited |
| Meta decks | Yes | Yes |
| Community rankings | Yes | Yes |

---

## 7. API Surface

### Auth Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/auth/user` | Yes | Get current user with profile, subscription, settings |

### Profile Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/profile` | Yes | Get user profile |
| POST | `/api/profile` | Yes | Create profile |
| PATCH | `/api/profile` | Yes | Update profile |

### Settings Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/settings` | Yes | Get user settings |
| PATCH | `/api/settings` | Yes | Update settings (theme, language, notifications) |

### Notification Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/notifications` | Yes | List notifications |
| POST | `/api/notifications/:id/read` | Yes | Mark notification as read |
| POST | `/api/notifications/read-all` | Yes | Mark all notifications as read |
| DELETE | `/api/notifications` | Yes | Delete all notifications |
| GET | `/api/notification-preferences` | Yes | Get notification preferences |
| PATCH | `/api/notification-preferences` | Yes | Update notification preferences |

### Subscription Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/subscription` | Yes | Get current subscription |

### Goals Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/goals` | Yes | List goals |
| POST | `/api/goals` | Yes | Create goal |
| PATCH | `/api/goals/:id` | Yes | Update goal |
| DELETE | `/api/goals/:id` | Yes | Delete goal |

### Favorites Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/favorites` | Yes | List favorite players |
| POST | `/api/favorites` | Yes | Add favorite player |
| DELETE | `/api/favorites/:id` | Yes | Remove favorite player |

### Clash Royale Proxy Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/clash/player/:tag` | No | Get player by tag |
| GET | `/api/clash/player/:tag/battles` | No | Get player battle log |
| GET | `/api/clash/cards` | No | Get all cards catalog |

### Player Sync Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/player/sync` | Yes | Full sync (profile + battles + goals + stats) |
| GET | `/api/player/sync-state` | Yes | Get last sync timestamp |

### Battle History Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/history/battles` | Yes | Get stored battle history (query: days, limit) |

### Stripe / Billing Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/stripe/config` | No | Get publishable key |
| GET | `/api/stripe/products` | No | List Stripe products |
| GET | `/api/stripe/prices` | No | List Stripe prices |
| GET | `/api/stripe/products-with-prices` | No | Products with expanded prices |
| POST | `/api/stripe/checkout` | Yes | Create checkout session |
| POST | `/api/stripe/portal` | Yes | Create billing portal session |
| GET | `/api/billing/invoices` | Yes | List user invoices |
| POST | `/api/stripe/webhook` | No* | Stripe webhook handler |

*Webhook uses Stripe signature verification instead of JWT auth.

### Coach / AI Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/coach/chat` | Yes | AI coach conversation |
| GET | `/api/coach/messages` | Yes | Get coach message history |
| POST | `/api/coach/push-analysis` | Yes | Generate push session analysis |
| GET | `/api/coach/push-analysis/latest` | Yes | Get latest push analysis |

### Training Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/training/plan` | Yes | Get active training plan |
| GET | `/api/training/plans` | Yes | List all training plans |
| POST | `/api/training/plan/generate` | Yes | Generate AI training plan |
| PATCH | `/api/training/drill/:drillId` | Yes | Update drill progress |
| PATCH | `/api/training/plan/:planId` | Yes | Update plan status |

### Community Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/community/player-rankings` | No | Player rankings by location |
| GET | `/api/community/clan-rankings` | No | Clan rankings by location |

### Public Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/public/player/:tag` | No | Public player profile with stats |
| GET | `/api/public/clan/:tag` | No | Public clan info with members |

### Deck Intelligence Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/decks/meta` | Yes | Get meta deck cache |
| GET | `/api/meta/decks` | Yes | Alias for meta decks |
| POST | `/api/decks/builder/counter` | Yes | AI counter deck suggestion |
| POST | `/api/decks/optimizer` | Yes | AI deck optimization |

**Total: 46 endpoints** (28 authenticated, 18 public/unauthenticated)

---

## 8. Deployment Architecture

### Vercel Serverless Deployment

```
vercel.json
  |
  +-- buildCommand: "npm run build"
  |     |
  |     +-- tsx script/build.ts
  |         |
  |         +-- Vite build (client SPA -> dist/public/)
  |         +-- esbuild (server -> dist/index.cjs, CJS, minified)
  |
  +-- functions:
  |     api/index.ts -> includes dist/**
  |
  +-- routes:
        /(.*) -> /api/index.ts  (catch-all)
```

### Dual-Mode Server

The `server/index.ts` supports two modes:

| Mode | Trigger | Behavior |
|------|---------|----------|
| **Serverless (Vercel)** | `process.env.VERCEL === "1"` | Exports handler function, no port binding |
| **Standalone (Dev/Replit)** | `VERCEL !== "1"` | Binds to `PORT` (default 5000), includes Vite HMR |

The serverless handler uses a **lazy-initialized singleton** pattern (`appPromise`) to avoid cold-start overhead on subsequent invocations.

### Build Pipeline

```
npm run build
  |
  +-- script/build.ts
       |
       +-- 1. rm -rf dist/
       +-- 2. viteBuild()  ->  dist/public/ (SPA assets)
       +-- 3. esbuild()    ->  dist/index.cjs (server bundle)
            |
            +-- Platform: node
            +-- Format: CJS (required for Vercel)
            +-- Bundle mode with selective externals
            +-- Allowlisted deps bundled inline (drizzle-orm, express, stripe, etc.)
            +-- Other deps marked external
            +-- Minified for cold start optimization
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `DATABASE_MIGRATIONS_URL` | No | Separate migration connection (falls back to DATABASE_URL) |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_URL` | Yes (client) | Same as SUPABASE_URL, exposed to Vite |
| `VITE_SUPABASE_ANON_KEY` | Yes (client) | Supabase anonymous key |
| `CLASH_ROYALE_API_KEY` | Yes | Clash Royale API bearer token |
| `CLASH_ROYALE_API_URL` | No | API base URL (default: `proxy.royaleapi.dev/v1`) |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | Yes | OpenAI-compatible API base URL |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | Yes | OpenAI API key |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret |
| `PORT` | No | Server port (default: 5000) |
| `NODE_ENV` | No | Environment (development/production) |
| `VERCEL` | Auto | Set by Vercel to "1" |
| `SUPABASE_JWKS_URL` | No | Override JWKS URL for JWT verification |

---

## 9. Dependencies Graph

### Core Runtime Dependencies

```
Application Core
  |
  +-- Express 4.21 (HTTP framework)
  |     +-- express.json() (body parsing)
  |     +-- express.static() (SPA serving)
  |     +-- express.raw() (Stripe webhook)
  |
  +-- Drizzle ORM 0.39 (database)
  |     +-- pg 8.16 (PostgreSQL driver)
  |     +-- drizzle-zod 0.7 (schema-to-zod bridge)
  |
  +-- Zod 3.25 (validation)
  |     +-- Shared between client and server
  |     +-- Request body validation
  |     +-- Schema type inference
  |
  +-- jose 6.1 (authentication)
  |     +-- JWKS fetching
  |     +-- JWT verification
  |
  +-- OpenAI SDK 6.10 (AI features)
  |     +-- Chat completions (GPT-4o-mini)
  |     +-- Coach, push analysis, training plans, deck suggestions
  |
  +-- Stripe 20.0 (payments)
  |     +-- Checkout sessions
  |     +-- Customer management
  |     +-- Webhook handling
  |     +-- Billing portal
  |
  +-- Supabase JS 2.95 (client-side auth)
       +-- Session management
       +-- Auth state changes
```

### Frontend UI Stack

```
React 19.2
  |
  +-- Radix UI (20+ primitive packages)
  |     +-- Dialog, Dropdown, Tabs, Toast, Tooltip, Select, etc.
  |
  +-- TanStack React Query 5.60
  |     +-- Server state caching
  |     +-- Optimistic updates
  |
  +-- wouter 3.3 (routing, ~3KB)
  |
  +-- Recharts 2.15 (charts)
  |
  +-- Framer Motion 12.23 (animations)
  |
  +-- React Hook Form 7.66 + @hookform/resolvers
  |
  +-- class-variance-authority + clsx + tailwind-merge (styling)
  |
  +-- Lucide React (icons)
  |
  +-- Sonner (toasts) + cmdk (command palette) + vaul (drawer)
```

---

## 10. Integration Points

### 10.1 Clash Royale API (via RoyaleAPI Proxy)

| Aspect | Details |
|--------|---------|
| **Base URL** | `https://proxy.royaleapi.dev/v1` (env-configurable) |
| **Auth** | Bearer token via `CLASH_ROYALE_API_KEY` |
| **Rate Limits** | Handled server-side (429 detection, retry not implemented) |
| **Endpoints Used** | `/players/{tag}`, `/players/{tag}/battlelog`, `/cards`, `/locations/{id}/rankings/players`, `/locations/{id}/rankings/clans`, `/clans/{tag}`, `/clans/{tag}/members` |
| **Error Handling** | Structured error codes: `CLASH_RESOURCE_NOT_FOUND` (404), `CLASH_RATE_LIMIT` (429), `CLASH_PROVIDER_UNAVAILABLE` (5xx), `CLASH_PROVIDER_ERROR` (other) |
| **Retry** | No automatic retry; temporary status detection (429, 5xx) with client-facing error differentiation |
| **Caching** | No HTTP-level cache; card index cached in-memory with 24h TTL |

### 10.2 OpenAI API

| Aspect | Details |
|--------|---------|
| **Base URL** | Configurable via `AI_INTEGRATIONS_OPENAI_BASE_URL` |
| **Model** | `gpt-4o-mini` |
| **Temperature** | 0.6 |
| **Features** | Coach chat (500 tokens), push analysis (700 tokens), training plan (800 tokens), counter deck (500 tokens), deck optimizer (650 tokens) |
| **Language** | Portuguese prompts by default, English for `language=en` requests |
| **Fallback** | Every AI function has a deterministic fallback that returns hardcoded Portuguese content if OpenAI fails |
| **Parsing** | Custom JSON extraction (`extractJsonObject`) handles markdown-wrapped responses |
| **Validation** | Zod schemas validate AI output for deck suggestions (8 cards, explanation required) |

### 10.3 Stripe

| Aspect | Details |
|--------|---------|
| **Products** | Single "Pro" subscription plan |
| **Pricing** | BRL R$19.90/month (price_1SdgN5...) or R$159.00/year (price_1SdgN5...) |
| **Checkout** | Stripe Checkout hosted page (subscription mode) |
| **Portal** | Stripe Billing Portal for self-service management |
| **Webhooks** | Events handled: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed` |
| **Validation** | Price ID whitelist prevents checkout with arbitrary prices |
| **Error Handling** | Structured error response with requestId propagation |

### 10.4 Supabase

| Aspect | Details |
|--------|---------|
| **Auth** | Supabase Auth with email/password (assumed); JWT-based |
| **Database** | PostgreSQL hosted on Supabase with connection pooling |
| **RLS** | Server sets JWT claims per-transaction for Row Level Security |
| **JWKS** | Remote JWKS set cached in memory; auto-discovered from `SUPABASE_URL` |
| **Client SDK** | Used on frontend only for auth session management |

---

## 11. Strengths

### Well-Architected Areas

1. **Shared schema layer** -- `shared/schema.ts` provides a single source of truth for database tables, Zod validators, and TypeScript types. Both client and server import the same types, eliminating type drift.

2. **RLS-aware storage pattern** -- The `DatabaseStorage` dual-mode design (service vs user) cleanly separates privileged operations from user-scoped queries. The `runAsUser()` transaction wrapper correctly sets PostgreSQL session variables for Supabase RLS.

3. **Structured error handling** -- Consistent `sendApiError()` with provider tracking, request IDs, and structured error codes across all routes. The client `ApiError` class preserves error details for UI display.

4. **Domain module extraction** -- Business logic is properly extracted into `server/domain/` modules (tilt engine, battle history rules, sync rules, deck intelligence, stripe checkout validation), keeping route handlers focused on HTTP concerns.

5. **AI resilience** -- Every OpenAI integration has a deterministic fallback function that returns meaningful Portuguese content, ensuring the application degrades gracefully when AI is unavailable.

6. **Freemium enforcement** -- Daily usage limits are enforced server-side with database-backed counters, not client-side checks. The limits are checked before calling external APIs, saving costs.

7. **Build optimization** -- The esbuild server bundle with selective dependency inlining reduces cold-start time on Vercel serverless. The allowlist approach bundles heavy dependencies while keeping light ones external.

8. **Battle deduplication** -- SHA-256 battle keys prevent duplicate battle entries even with overlapping API responses, using composite data (teams, crowns, cards, timestamps) for uniqueness.

9. **Meta decks refresh with advisory locks** -- PostgreSQL advisory locks prevent concurrent meta deck refreshes, and the staleness check after lock acquisition eliminates thundering herd problems.

10. **i18n architecture** -- Clean separation of translations with locale detection, supporting both Portuguese and English throughout the AI prompts and UI.

---

## 12. Weaknesses & Risks

### Critical

| ID | Issue | Location | Impact |
|----|-------|----------|--------|
| W-01 | **God-file: routes.ts (3,874 lines)** | `server/routes.ts` | All 46 endpoints in one function. Extremely difficult to navigate, test, and maintain. No route-level middleware composition. Merge conflicts guaranteed with concurrent development. |
| W-02 | **No service layer** | `server/routes.ts` | Route handlers directly orchestrate storage calls, external API calls, domain logic, and response formatting. Business logic is tightly coupled to HTTP concerns. |
| W-03 | **No rate limiting** | `server/app.ts` | No Express rate limiting middleware despite the `express-rate-limit` package being in the build allowlist. The app relies solely on Vercel's platform limits. Public endpoints (`/api/clash/*`, `/api/community/*`) are fully unprotected. |
| W-04 | **No CORS configuration** | `server/app.ts` | No CORS headers set. Relies entirely on Vercel's default behavior. This is fragile if the API is consumed from any origin other than the same domain. |

### High

| ID | Issue | Location | Impact |
|----|-------|----------|--------|
| W-05 | **Duplicated bootstrap logic** | `storage.ts:272-443` | `bootstrapUserData()` has the same logic duplicated for RLS vs non-RLS paths (170 lines each). Violates DRY. |
| W-06 | **No request timeout** | `clashRoyaleApi.ts` | `fetch()` calls to external APIs have no `AbortController` timeout. A hanging Clash Royale API could block serverless function execution until Vercel's 10s/30s timeout. |
| W-07 | **Stripe webhook signature verification unclear** | `server/routes.ts` | The webhook route uses `express.raw()` for body parsing, but the actual signature verification implementation was not fully visible in the read portion. Missing or weak verification is a payment security risk. |
| W-08 | **No database connection pool limits** | `server/db.ts` | `new Pool({ connectionString })` uses pg defaults (10 connections). On Vercel serverless with many concurrent invocations, this can exhaust Supabase connection limits. No `max`, `idleTimeoutMillis`, or `connectionTimeoutMillis` configured. |
| W-09 | **Meta decks refresh in request path** | `routes.ts` line ~3510 | `refreshMetaDecksCacheIfStale()` runs within a user's GET request. If stale, it fetches battles from 50+ players concurrently, potentially adding 10+ seconds to response time. Should be a background job. |
| W-10 | **`any` type proliferation** | Multiple files | `battles: any[]` throughout domain logic, `req: any` in all route handlers, `fetchAPI<any>` in client API calls. Undermines TypeScript safety. |

### Medium

| ID | Issue | Location | Impact |
|----|-------|----------|--------|
| W-11 | **No test infrastructure for routes** | `server/routes.ts` | The 3,874-line routes file has no associated test file. Only domain modules (`syncRules`, `battleHistory`, `stripeCheckout`) have tests. |
| W-12 | **Duplicate page files** | `client/src/pages/` | `goals 2.tsx` and `goals.tsx` co-exist. `shared/clashTag 2.ts` and `clashTag.test 2.ts` also duplicated. Likely accidental copies. |
| W-13 | **No API versioning** | All routes | All endpoints are at `/api/*` with no version prefix. Breaking changes would require careful coordination. |
| W-14 | **Hardcoded free tier limits** | `routes.ts` lines 42-43 | `FREE_DAILY_LIMIT = 5` and `FREE_DECK_SUGGESTION_DAILY_LIMIT = 2` are magic numbers in the routes file, not in shared config. |
| W-15 | **No logging framework** | `server/app.ts` | Uses `console.log/error/info/warn` directly. No structured logging library, no log levels, no correlation beyond requestId. |
| W-16 | **No health check endpoint** | All routes | No `/api/health` or readiness probe. Vercel may not need one, but monitoring tools and uptime checks require it. |
| W-17 | **WebSocket dependency unused** | `package.json` | `ws` is listed as a dependency and imported in types, but no active WebSocket server is configured. Dead dependency. |
| W-18 | **Client API methods use `any`** | `client/src/lib/api.ts` | Several methods (`api.profile.create(data: any)`, `api.goals.create(data: any)`) accept untyped payloads, defeating the purpose of the shared schema. |

---

## 13. Security Assessment

### Authentication

| Aspect | Status | Notes |
|--------|--------|-------|
| JWT verification | GOOD | JWKS-based verification via `jose`, not static secret |
| Token refresh | GOOD | Supabase client auto-refreshes tokens |
| Session persistence | GOOD | `persistSession: true` with `detectSessionInUrl: true` |
| Audience/Issuer check | GOOD | `audience: "authenticated"`, issuer from Supabase URL |
| Auth fallback | GOOD | Missing Supabase config returns 503, not 500 |

### Input Validation

| Aspect | Status | Notes |
|--------|--------|-------|
| Request body validation | GOOD | Zod schemas validate all POST/PATCH bodies |
| Player tag normalization | GOOD | Tags consistently normalized to `#UPPERCASE` format |
| Query parameter validation | PARTIAL | Some params clamped (`clampHistoryDays`), others passed through |
| Path parameter validation | WEAK | `:tag` and `:id` parameters not validated before use |
| Strict schemas | GOOD | `.strict()` on deck request schemas prevents extra fields |

### Secrets Management

| Aspect | Status | Notes |
|--------|--------|-------|
| API keys in env vars | GOOD | All secrets via environment variables |
| Client-side exposure | CONCERN | `VITE_SUPABASE_ANON_KEY` is intentionally public (by Supabase design) but should be documented |
| Stripe webhook secret | GOOD | `STRIPE_WEBHOOK_SECRET` env var for signature verification |
| No secrets in code | GOOD | No hardcoded keys found in codebase |

### Data Protection

| Aspect | Status | Notes |
|--------|--------|-------|
| RLS enforcement | GOOD | User-scoped queries set PostgreSQL session variables |
| Service bypass | CONCERN | `serviceStorage` bypasses RLS for webhooks/background jobs -- correct but requires careful auditing |
| Battle history pruning | GOOD | Free users limited to 10 battles, Pro to 60 days |
| Input sanitization | PARTIAL | Tags sanitized, but no general XSS protection on text fields |

### API Security

| Aspect | Status | Notes |
|--------|--------|-------|
| Rate limiting | MISSING | No rate limiting on any endpoint. Public proxy endpoints (`/api/clash/*`) can be abused to exhaust Clash Royale API quota |
| CORS | MISSING | No explicit CORS configuration |
| HTTPS | GOOD | Enforced by Vercel |
| Request ID tracking | GOOD | All requests get UUID, propagated to error responses |
| Error information leakage | LOW RISK | Errors include code and message but not stack traces in responses |

### Payment Security

| Aspect | Status | Notes |
|--------|--------|-------|
| Price ID whitelist | GOOD | `validateCheckoutPriceId()` only allows known price IDs |
| Webhook verification | ASSUMED | Route uses `express.raw()` for raw body access (required for signature verification) |
| Subscription state | GOOD | Pro status derived from DB (`plan === "pro" && status === "active"`), not from client claims |

### Recommendations (Priority Order)

1. **CRITICAL:** Add rate limiting middleware (`express-rate-limit`) with per-IP and per-user limits, especially on public proxy routes and AI endpoints
2. **HIGH:** Configure explicit CORS policy to restrict API access to the application domain
3. **HIGH:** Add `AbortController` timeouts to all external API `fetch()` calls (5s for Clash API, 15s for OpenAI)
4. **HIGH:** Configure PostgreSQL pool limits (`max: 3-5` for serverless, `connectionTimeoutMillis: 5000`)
5. **MEDIUM:** Validate path parameters (`:tag`, `:id`) with Zod before database/API calls
6. **MEDIUM:** Move meta decks refresh to a scheduled background job (Vercel Cron)
7. **LOW:** Add Content Security Policy headers

---

## Appendix A: Database Schema (14 Tables)

```
users (PK: id)
  |-- 1:1 --> profiles (FK: user_id)
  |-- 1:1 --> user_settings (FK: user_id)
  |-- 1:1 --> notification_preferences (FK: user_id)
  |-- 1:1 --> player_sync_state (FK: user_id)
  |-- 1:N --> subscriptions (FK: user_id)
  |-- 1:N --> goals (FK: user_id)
  |-- 1:N --> favorite_players (FK: user_id, UNIQUE: user_id+player_tag)
  |-- 1:N --> notifications (FK: user_id)
  |-- 1:N --> battle_history (FK: user_id, UNIQUE: battle_key)
  |-- 1:N --> coach_messages (FK: user_id)
  |-- 1:N --> push_analyses (FK: user_id)
  |-- 1:N --> training_plans (FK: user_id, FK: push_analysis_id)
  |           |-- 1:N --> training_drills (FK: plan_id)
  |-- 1:N --> deck_suggestions_usage (FK: user_id)

meta_decks_cache (standalone, UNIQUE: deck_hash)
```

## Appendix B: File Size Analysis

| File | Lines | Concern |
|------|-------|---------|
| `server/routes.ts` | 3,874 | GOD-FILE -- should be split into route modules |
| `server/storage.ts` | 1,234 | Large but organized by entity domain |
| `shared/schema.ts` | ~600 | Acceptable for schema + validators + types |
| `server/openai.ts` | 555 | 5 AI functions with fallbacks -- reasonable |
| `server/domain/metaDecksRefresh.ts` | 401 | Complex but cohesive refresh logic |
| `server/domain/decks.ts` | 211 | Clean domain module |
| `server/domain/syncRules.ts` | 166 | Clean domain module |

---

*Document generated by @architect (Aria) as Phase 1 of Brownfield Discovery for CRStats Project.*
