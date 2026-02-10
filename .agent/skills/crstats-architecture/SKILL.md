---
name: crstats-architecture
description: >
  Single source of truth for the CRStats project architecture.
  Clash Royale performance coach SaaS — real data, AI coaching, training plans, tilt detection, deck intelligence.
  Load this skill BEFORE any /plan, /debug, /create, or /enhance workflow on this codebase.
trigger: always_on
---

# CRStats — Project Architecture

> **CRStats** is a SaaS performance coach for *Clash Royale* players. It connects to the official Clash Royale API, syncs real battle data, uses AI (OpenAI) to analyze sessions and provide coaching, and offers training plans, deck intelligence, tilt detection, and community features. Monetization via Stripe (FREE / PRO tiers).

---

## 1. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Language** | TypeScript (strict) | Shared types across client & server |
| **Frontend** | React 19 + Vite 7 | SPA, `@/` path alias |
| **Styling** | Tailwind CSS v4 + shadcn/ui (Radix) | `class-variance-authority`, `tailwind-merge` |
| **Routing** | wouter v3 | Lightweight client-side routing |
| **State** | TanStack React Query v5 | Server-state management |
| **Animations** | Framer Motion | Page transitions, micro-interactions |
| **Backend** | Express 4 (Node.js) | Single `routes.ts` (3875 lines) |
| **ORM** | Drizzle ORM + drizzle-zod | Type-safe schema + validation |
| **Database** | PostgreSQL (Supabase) | Hosted; `drizzle-kit push` for migrations |
| **Auth** | Supabase Auth (JWT/JWKS) | `jose` for token verification |
| **AI** | OpenAI API | Coach chat, push analysis, training plans, deck suggestions |
| **Payments** | Stripe | Monthly (R$19.90) / Yearly (R$159) — BRL only |
| **Clash Data** | Clash Royale API | Via `proxy.royaleapi.dev` to avoid IP whitelist |
| **i18n** | Custom (shared/i18n) | `pt-BR` (default), `en-US` |
| **Deployment** | Vercel (Serverless) | `api/index.ts` entry point, single route catch-all |
| **Analytics** | Vercel Speed Insights | Client-side bundle |
| **Charts** | Recharts | Dashboard/stats visualizations |

---

## 2. Directory Structure

```
CRStats-Project/
├── api/index.ts               # Vercel serverless entry
├── server/
│   ├── index.ts               # Dev server bootstrap
│   ├── app.ts                 # Express app setup + middleware
│   ├── routes.ts              # ALL API routes (~3875 lines)
│   ├── storage.ts             # IStorage interface + DatabaseStorage (Drizzle)
│   ├── db.ts                  # Drizzle client init
│   ├── clashRoyaleApi.ts      # CR API wrapper (player, battles, clans, rankings)
│   ├── openai.ts              # AI: coach, push analysis, training, counter-deck, optimizer
│   ├── stripeClient.ts        # Stripe client init
│   ├── stripeService.ts       # Stripe helpers (checkout, portal)
│   ├── supabaseAuth.ts        # JWT verification middleware (requireAuth)
│   ├── static.ts              # Static file serving
│   ├── vite.ts                # Vite dev middleware
│   └── domain/
│       ├── battleHistory.ts   # Battle dedup, key-building, FREE limits
│       ├── syncRules.ts       # Push sessions, tilt, goal auto-progress, free coach limit
│       ├── decks.ts           # Deck utilities, win condition detection
│       ├── metaDecksRefresh.ts # Meta deck cache refresh from top players
│       └── stripeCheckout.ts  # Checkout session creation
├── client/
│   ├── index.html
│   └── src/
│       ├── App.tsx            # Root: providers, router (wouter Switch)
│       ├── main.tsx           # React DOM entry
│       ├── index.css          # Global styles + Tailwind config
│       ├── pages/             # 16 page components (see §4)
│       ├── components/
│       │   ├── ui/            # shadcn/ui primitives
│       │   ├── layout/        # DashboardLayout (sidebar, nav, mobile)
│       │   ├── clash/         # ClashCardImage
│       │   ├── ErrorBoundary.tsx
│       │   ├── PageErrorState.tsx
│       │   └── PushAnalysisCard.tsx
│       ├── hooks/             # 11 custom hooks (see §5)
│       └── lib/
│           ├── api.ts         # Fetch wrapper with auth headers
│           ├── queryClient.ts # React Query client config
│           ├── supabaseClient.ts
│           ├── clashIcons.ts  # Card icon mappings
│           ├── errorMessages.ts
│           ├── authUtils.ts
│           ├── utils.ts
│           └── analytics/     # Analytics utilities
├── shared/
│   ├── schema.ts              # Drizzle table definitions + Zod input schemas + relations
│   ├── pricing.ts             # PricingPlan, formatPrice, yearly savings
│   ├── clashTag.ts            # Tag normalization + validation
│   ├── contracts/             # Payload contracts with tests
│   ├── domain/
│   │   └── tilt.ts            # TiltState computation with time-decay
│   └── i18n/
│       ├── index.ts           # t(), detectLocale, locale utils
│       └── translations/
│           ├── pt-BR.json     # ~37 KB
│           └── en-US.json     # ~37 KB
├── scripts/
│   ├── audit-data-authenticity.ts  # Verify no mock data in DB
│   ├── create-stripe-prices.ts
│   ├── seed-products.ts
│   └── supabase/              # SQL migration scripts
├── docs/                      # Plan files
├── drizzle.config.ts
├── vite.config.ts
├── vercel.json
└── package.json
```

---

## 3. Database Schema (14+ tables)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | Auth identity | `id` (Supabase UID), `email`, `firstName`, `lastName` |
| `profiles` | Player profile | `userId`, `clashTag`, `defaultPlayerTag`, `trophies`, `arena`, `clan` |
| `subscriptions` | Stripe sub state | `userId`, `stripeSubscriptionId`, `status`, `plan`, `currentPeriodEnd` |
| `goals` | Performance goals | `userId`, `type`, `target`, `current`, `status` |
| `favorite_players` | Bookmarked tags | `userId`, `playerTag`, `name` — unique(userId, playerTag) |
| `notifications` | In-app alerts | `userId`, `title`, `type`, `isRead` |
| `user_settings` | Preferences | `userId`, `theme`, `preferredLanguage`, `deckStyle`, `trophyRange` |
| `notification_preferences` | Alert categories | `userId`, `training`, `billing`, `system` |
| `player_sync_state` | Sync throttle | `userId`, `lastSyncedAt` |
| `battle_history` | Persisted battles | `userId`, `playerTag`, `battleTime`, `data` (JSONB) — indexed |
| `coach_messages` | AI chat history | `userId`, `role`, `content` |
| `push_analyses` | Session analyses | `userId`, `summary`, `strengths`, `mistakes`, `recommendations` |
| `training_plans` | AI training plans | `userId`, `title`, `status`, `pushAnalysisId` |
| `training_drills` | Plan sub-tasks | `planId`, `focusArea`, `description`, `targetGames`, `mode`, `priority` |
| `meta_decks_cache` | Top-player deck data | `deckHash`, `cards`, `winRateEstimate`, `usageCount`, `archetype` |
| `deck_suggestions_usage` | FREE limit tracking | `userId`, `suggestionType`, `createdAt` |

**Relations:** User → has one Profile, one Subscription, one Settings, one NotificationPreferences. Has many Goals, FavoritePlayers, Notifications, BattleHistory, CoachMessages, PushAnalyses, TrainingPlans. TrainingPlan → has many TrainingDrills and optionally links to PushAnalysis.

---

## 4. Frontend Pages (16)

| Route | Page | Auth | Description |
|-------|------|------|-------------|
| `/` | Landing / Dashboard | Conditional | Landing for guests, Dashboard for authenticated |
| `/auth` | Auth | No | Supabase login/signup |
| `/onboarding` | Onboarding | Yes | Link Clash Royale tag, initial setup |
| `/dashboard` | Dashboard | Yes | Player stats, tilt meter, recent matches, push sessions |
| `/coach` | Coach | Yes | AI chat coach (OpenAI), battle context |
| `/training` | Training | Yes | AI-generated training plans with drills |
| `/decks` | Decks | Yes | Meta decks, counter-deck finder, deck optimizer |
| `/community` | Community | Yes | Rankings, clan info, top players |
| `/goals` | Goals | Yes | Performance goals with auto-progress |
| `/me` | Me | Yes | Full player profile (90 KB — largest page) |
| `/profile` | Profile | Yes | Quick profile view |
| `/settings` | Settings | Yes | Theme, language, notification prefs, deck style |
| `/billing` | Billing | Yes | Stripe checkout, plan management |
| `/notifications` | Notifications | Yes | In-app notification center |
| `/p/:tag` | Public Profile | No | Shareable public profile by tag |
| `*` | Not Found | No | 404 page |

---

## 5. Custom Hooks (11)

| Hook | Purpose |
|------|---------|
| `useAuth` | Supabase session, `isAuthenticated`, `isLoading` |
| `useLocale` | i18n `t()`, locale detection, `LocaleProvider` |
| `useMobile` | Responsive breakpoint detection |
| `useToast` | Sonner toast notifications |
| `useClashPlayer` | Fetch player data by tag |
| `useFavorites` | CRUD favorite players |
| `useGoals` | CRUD goals with optimistic updates |
| `useNotifications` | Fetch + mark-as-read notifications |
| `usePlayerSync` | Trigger data sync, handle throttle |
| `useProfile` | Fetch/update profile |
| `useSettings` | Fetch/update user settings |

---

## 6. External Integrations

### 6.1 Clash Royale API
- **Proxy:** `proxy.royaleapi.dev/v1` (avoids IP whitelist issues)
- **Endpoints:** `getPlayerByTag`, `getPlayerBattles`, `getCards`, `getPlayerRankings`, `getClanRankings`, `getClanByTag`, `getClanMembers`, `getTopPlayersInLocation`
- **Auth:** Bearer token via `CLASH_ROYALE_API_KEY`
- **Error handling:** Normalized error codes, rate-limit awareness (429), temporary provider detection (5xx)

### 6.2 OpenAI
- **Config:** Custom `baseURL` + `apiKey` via env vars (`AI_INTEGRATIONS_OPENAI_*`)
- **Functions:**
  - `generateCoachResponse` — AI chat with player context (tag, trophies, arena, deck, recent battles)
  - `generatePushAnalysis` — Session analysis → `{ summary, strengths, mistakes, recommendations }`
  - `generateTrainingPlan` — From analysis → `{ title, drills[] }`
  - `generateCounterDeckSuggestion` — Pick counter-deck from meta candidates
  - `generateDeckOptimization` — Optimize existing deck for cycle/counter/consistency
- **Fallbacks:** Every AI function has a deterministic fallback if OpenAI is unavailable
- **JSON parsing:** Strict extraction with `extractJsonObject` + Zod validation

### 6.3 Stripe
- **Products:** Single PRO plan
- **Pricing:** Monthly R$19.90, Yearly R$159.00 (BRL only)
- **Flow:** `stripeCheckout.ts` → Checkout Session → Webhook → `subscriptions` table update
- **Portal:** Customer portal for self-service management

### 6.4 Supabase Auth
- **Method:** JWT verification with JWKS (via `jose`)
- **Middleware:** `requireAuth` Express middleware injects `req.auth` with `userId`, `role`, `claims`
- **Client:** `@supabase/supabase-js` on frontend

---

## 7. Key Domain Logic

### 7.1 Tilt Detection (`shared/domain/tilt.ts`)
- Analyzes last 10 battles for win rate, consecutive losses, net trophies
- **Levels:** `none` / `medium` / `high`
- **Time-decay:** Risk decreases after 2h (0.7×), 6h (0.4×), 12h+ (0×)
- Alert triggered when `level === "high"`

### 7.2 Push Sessions (`server/domain/syncRules.ts`)
- Groups battles into "push sessions" (continuous play periods)
- Computes: wins, losses, winRate, netTrophies, durationMinutes, tiltLevel, consecutive losses
- Mode breakdown per session
- Used as input for AI push analysis

### 7.3 Sync Rules
- `computeConsecutiveLosses` — Streak tracking
- `computeGoalAutoProgress` — Auto-update goals based on battle results
- `evaluateFreeCoachLimit` — Daily coach message limit for FREE users
- Player sync state tracked per-user to throttle API calls

### 7.4 Battle History (`server/domain/battleHistory.ts`)
- De-duplication via `buildBattleKey`
- `FREE_BATTLE_LIMIT` — Free users see limited history
- `PRO_HISTORY_MAX_DAYS` — Pro users get extended history
- `extractBattleTime` — Parse CR's custom timestamp format

### 7.5 Meta Decks (`server/domain/metaDecksRefresh.ts`)
- Scrapes top-player decks from rankings to build meta-deck cache
- Staleness check before refresh
- Used for counter-deck and optimizer AI suggestions

### 7.6 Deck Intelligence (`server/domain/decks.ts`)
- Win condition detection
- Deck normalization and comparison
- Counter-deck and optimizer request schemas with Zod validation

---

## 8. FREE vs PRO Rules

| Feature | FREE | PRO |
|---------|------|-----|
| Coach chat | 5 messages/day (`FREE_DAILY_LIMIT`) | Unlimited |
| Deck suggestions | 2/day (`FREE_DECK_SUGGESTION_DAILY_LIMIT`) | Unlimited |
| Battle history | Limited (`FREE_BATTLE_LIMIT`) | Extended (`PRO_HISTORY_MAX_DAYS`) |
| Push analysis | ✓ | ✓ |
| Training plans | ✓ | ✓ |
| Tilt detection | ✓ | ✓ |
| Goals | ✓ | ✓ |
| Community | ✓ | ✓ |
| Meta decks | ✓ | ✓ |

---

## 9. Main User Flows

1. **Signup** → Supabase Auth → `/auth` → upsert user record
2. **Onboarding** → `/onboarding` → enter Clash Royale tag → validate via CR API → create profile
3. **Sync** → Player presses sync → CR API fetches player data + battle log → dedup → persist → auto-progress goals → compute tilt
4. **Dashboard** → View stats, tilt meter, recent matches, push session summaries
5. **Coach** → Chat with AI coach (OpenAI) providing battle context, deck info, trophies
6. **Push Analysis** → After a session, AI analyzes battles → generates strengths, mistakes, recommendations
7. **Training** → From push analysis, AI generates training plan with drills → track drill completion
8. **Decks** → Browse meta decks, find counter-decks, optimize current deck (all AI-powered)
9. **Community** → View rankings, clans, top players
10. **Goals** → Set performance targets, auto-tracked via battle results
11. **Billing** → Stripe checkout → PRO subscription → manage via customer portal

---

## 10. Conventions & Rules

- **TypeScript strict mode** — No `any` in new code (legacy `any` exists in battle data typing)
- **i18n mandatory** — All user-facing strings go through `t()`, never hardcode text
- **No mock data** — `audit-data-authenticity.ts` script verifies no fake data in production DB
- **Zod validation** — All API inputs validated with schemas from `shared/schema.ts`
- **IStorage interface** — All DB access through `storage.ts` abstraction (dependency injection via `getUserStorage`)
- **Error handling** — Structured `ApiErrorPayload` with codes, provider logging, request IDs
- **Fallbacks** — Every AI feature has a deterministic fallback when OpenAI is down
- **Path alias** — `@/` maps to `client/src/`, `@shared/` maps to `shared/`
- **Component library** — shadcn/ui (Radix primitives) in `client/src/components/ui/`
- **Error boundaries** — Per-page `ErrorBoundary` wrappers via `withLocalBoundary()`
- **Default locale** — `pt-BR` (Brazilian Portuguese), with `en-US` support
- **Currency** — BRL only (hardcoded, extensible structure)

---

## 11. Environment Variables

| Variable | Service | Required |
|----------|---------|----------|
| `CLASH_ROYALE_API_KEY` | Clash Royale API | Yes |
| `CLASH_ROYALE_API_URL` | CR API base URL (default: RoyaleAPI proxy) | No |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | OpenAI API base | Yes (for AI features) |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI API key | Yes (for AI features) |
| `STRIPE_SECRET_KEY` | Stripe backend | Yes |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_JWKS_URL` | Override JWKS endpoint | No |
| `DATABASE_URL` | PostgreSQL connection string | Yes |

---

## 12. Dev Commands

```bash
pnpm dev             # Start dev server (Express + Vite HMR)
pnpm dev:client      # Vite client only (port 5000)
pnpm build           # Production build (tsx script/build.ts)
pnpm start           # Run production bundle
pnpm check           # TypeScript typecheck
pnpm test:critical   # Run domain unit tests (syncRules, battleHistory, stripeCheckout, contracts)
pnpm db:push         # Push schema to Supabase (drizzle-kit push)
pnpm audit:data      # Verify no mock/fake data in DB
```
