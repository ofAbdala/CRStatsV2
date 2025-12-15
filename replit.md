# CRStats - Clash Royale Intelligent Coach

## Overview

CRStats is a SaaS platform providing intelligent coaching for Clash Royale players. The application pulls player statistics via the official Clash Royale API, displays them in a clear dashboard, and uses AI to analyze battles and provide personalized coaching tips. It operates as a freemium SaaS with authentication, account management, and Stripe-powered subscription billing.

**Core Features:**
- Player statistics dashboard (trophies, win rate, decks, battles)
- AI-powered coaching chat that analyzes player data and answers questions
- Training drills generated from detected weaknesses
- Subscription management with FREE and PRO tiers
- Favorite players tracking and community rankings

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework:** React 18 with TypeScript (strict mode)
- **Routing:** Wouter for client-side routing
- **Styling:** Tailwind CSS with shadcn/ui component library (New York style)
- **State Management:** TanStack React Query for server state
- **Build Tool:** Vite with custom plugins for Replit integration

The frontend follows a page-based structure with shared components. Key directories:
- `client/src/pages/` - Route components (dashboard, coach, settings, etc.)
- `client/src/components/` - Reusable UI components including shadcn/ui
- `client/src/hooks/` - Custom React hooks for data fetching and auth
- `client/src/lib/` - Utilities, API client, and mock data

### Backend Architecture
- **Framework:** Express.js with TypeScript
- **API Pattern:** RESTful endpoints under `/api/`
- **Authentication:** Replit OpenID Connect (passport-based session auth)
- **Session Storage:** PostgreSQL-backed sessions via connect-pg-simple

Key server modules:
- `server/routes.ts` - All API route definitions
- `server/storage.ts` - Data access layer abstracting database operations
- `server/replitAuth.ts` - Authentication middleware and session setup
- `server/openai.ts` - AI coach integration using OpenAI API
- `server/clashRoyaleApi.ts` - Clash Royale official API wrapper
- `server/stripeService.ts` - Subscription and billing logic

### Data Storage
- **Database:** PostgreSQL with Drizzle ORM
- **Schema Location:** `shared/schema.ts` (shared between client/server)
- **Migrations:** Drizzle Kit with `drizzle-kit push` command

**Core Tables:**
- `users` - Basic user data (Replit Auth)
- `sessions` - Session storage for auth
- `profiles` - Extended player info (Clash Royale tag, display name)
- `subscriptions` - Stripe subscription status (FREE/PRO)
- `goals` - Player-defined goals
- `favoritePlayers` - Tracked player tags
- `notifications` - In-app notifications
- `userSettings` - User preferences

### Authentication Flow
1. User clicks login → redirected to Replit OAuth
2. On callback, user is created/updated in database
3. Session stored in PostgreSQL
4. Protected routes check `isAuthenticated` middleware

### AI Integration
- Uses OpenAI API (via Replit AI integration)
- Coach endpoint receives player context (stats, battles) with messages
- System prompt establishes "Clash Royale trainer" persona
- Responses generated in Brazilian Portuguese

### Billing Integration
- Stripe integration via Replit Stripe connector
- Managed webhooks for subscription lifecycle events
- Customer portal for subscription management
- Products: CRStats PRO monthly (R$19.90) and yearly plans

## External Dependencies

### APIs and Services
- **Clash Royale API** (`CLASH_ROYALE_API_KEY`) - Player data, battles, cards
- **OpenAI API** (via Replit AI integration) - AI coaching responses
- **Stripe** (via Replit connector) - Payment processing, subscriptions
- **Replit Auth** - OpenID Connect authentication

### Database
- **PostgreSQL** (`DATABASE_URL`) - Primary data store
- Managed via Drizzle ORM with schema in `shared/schema.ts`

### Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Express session encryption key
- `CLASH_ROYALE_API_KEY` - Official Clash Royale API access
- `AI_INTEGRATIONS_OPENAI_BASE_URL` / `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI access
- Stripe credentials managed via Replit connector (automatic)

### Key NPM Dependencies
- `drizzle-orm` / `drizzle-kit` - Database ORM and migrations
- `express` / `express-session` - Server framework
- `passport` - Authentication middleware
- `openai` - AI API client
- `stripe` / `stripe-replit-sync` - Payment integration
- `@tanstack/react-query` - Data fetching
- `wouter` - Client routing
- `tailwindcss` / `@radix-ui/*` - UI components

## Recent Changes (December 2025)

### Card Images Integration
- Dashboard now displays official Clash Royale card images
- Current deck section shows 8 cards with images from `iconUrls.medium`
- Battle history shows deck thumbnails for each battle
- Arena images loaded from RoyaleAPI CDN

### Billing Page
- New `/billing` route for subscription management
- Plan comparison: FREE vs PRO features
- Stripe checkout integration for upgrades (monthly R$19.90, yearly R$159.00)
- Stripe customer portal for subscription management
- Success/canceled redirect handling with toast notifications

### Navigation Updates
- Dynamic subscription status in sidebar (shows PRO badge or upgrade button)
- Billing link added to navigation menu
- Plan status displayed near user profile
- "Meu Perfil" link added for player profile page

### Player Profile Page (/me) - December 2025
New comprehensive player stats page inspired by DeepLOL/OP.GG:

**Hero Header:**
- Player name, tag, clan with badge
- Arena image and current trophies
- Summary chips: winrate, matches, streak, last played time

**Four Tabs:**
1. **Visão Geral** - Season summary, performance stats, tilt indicator, trophy chart, game mode breakdown
2. **Histórico** - Match history with period filters, expandable battle details with deck images
3. **Decks & Meta** - Most used decks with winrate, archetype strength/weakness analysis
4. **Progresso** - Trophy evolution chart, play volume analysis, goals integration, PRO locked features

**Features:**
- Real-time data from Clash Royale API
- PRO feature locks with blur effect and upgrade CTA
- Responsive design for desktop and mobile

### Internationalization (i18n) - December 2025
New i18n system with support for multiple languages:

**Translation Files:**
- `shared/i18n/translations/pt-BR.json` - Brazilian Portuguese (default)
- `shared/i18n/translations/en-US.json` - US English

**i18n Utilities (`shared/i18n/index.ts`):**
- `t(key, locale, params)` - Type-safe translation function with parameter interpolation
- `detectLocale(acceptLanguage)` - Detects locale from browser Accept-Language header
- `getTranslations(locale)` - Get full translation object for a locale

**React Hook (`client/src/hooks/use-locale.ts`):**
- `useLocale()` - Provides locale, currency, translation functions, and pricing
- Persists user preference to localStorage
- Auto-detects from browser settings

### Multi-Currency Pricing - December 2025
Support for multiple currencies in billing:

**Pricing Module (`shared/pricing.ts`):**
- Supported currencies: BRL, USD, EUR
- `getPricing(currency)` - Get plan prices and Stripe price IDs
- `formatPrice(amount, currency)` - Locale-aware price formatting
- `getYearlySavingsPercent(currency)` - Calculate yearly discount

**Price Tiers:**
- BRL: R$19,90/month, R$159,00/year
- USD: $4.99/month, $39.99/year
- EUR: €4.49/month, €35.99/year

### Icon Utilities - December 2025
Centralized Clash Royale icon helpers (`client/src/lib/clashIcons.ts`):
- `getCardImageUrl(cardName, size)` - Card images from RoyaleAPI CDN
- `getArenaImageUrl(arenaId)` - Arena images
- `getClanBadgeUrl(badgeId)` - Clan badge images
- `getGameModeIcon(gameMode)` - Emoji icons for game modes
- `getCardRarityColor(rarity)` - Color codes by card rarity

### Intelligent Coaching System - December 2025
Complete coaching overhaul with AI-powered features:

**Unified Data Sync (`/api/player/sync`):**
- Single endpoint fetches player, battles, and cards
- SyncButton component with loading state and "last sync X min ago"
- `usePlayerSync` hook for consistent sync behavior

**Coach Message Limits:**
- FREE users: 5 messages per day
- PRO users: Unlimited messages
- UI shows remaining messages and upgrade CTA when limit reached
- Backend tracks daily usage in `coach_messages` table

**Tilt Detection:**
- `computeTiltLevel()` function analyzes recent battles for:
  - Win rate over last 10 games
  - Net trophy change
  - Losing streak detection
- Three levels: `high`, `medium`, `none`
- TiltAlert component with contextual advice
- Integrated into coach system prompt

**Arena Progress Tracking:**
- ArenaProgressBar component on profile page
- 28 arenas configured up to 12,000 trophies
- Visual progress bar to next arena

**Context-Aware Battle Analysis:**
- Coach detects "why did I lose?" patterns
- Automatically injects last battle context into AI prompt
- Includes deck matchup, elixir usage, result

**Push Analysis (PRO Feature):**
- POST `/api/coach/push-analysis` endpoint
- GPT-4o-mini analyzes last 5 battles as a "session"
- Returns structured JSON: summary, strengths, mistakes, recommendations
- PushAnalysisCard component in me.tsx Overview tab
- Stored in `push_analyses` table

**Training Center (PRO Feature):**
- `/training` page with AI-generated training plans
- POST `/api/training/generate` creates plan from latest push analysis
- 3-5 drills per plan with focus areas:
  - tilt (emotional control)
  - macro (elixir/timing)
  - deck (card knowledge)
  - matchup (counter strategies)
  - fundamentals (basic mechanics)
- Drill tracking: target games, completed games, status
- PATCH `/api/training/drills/:id` for progress updates
- GET `/api/training/plan` for active plan with drills

**Database Schema Additions:**
- `coach_messages` - Daily message tracking
- `push_analyses` - Stored AI analysis results
- `training_plans` - User training plans
- `training_drills` - Individual drill exercises