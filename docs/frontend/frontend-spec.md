# CRStats Frontend Specification

**Agent:** @ux-design-expert
**Phase:** 3 — Brownfield Discovery
**Date:** 2026-02-27
**Project:** CRStats (Clash Royale Stats Tracker + AI Coach)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Page Inventory](#2-page-inventory)
3. [Component Architecture](#3-component-architecture)
4. [State Management](#4-state-management)
5. [Custom Hooks Inventory](#5-custom-hooks-inventory)
6. [Routing Architecture](#6-routing-architecture)
7. [Styling System](#7-styling-system)
8. [i18n Implementation](#8-i18n-implementation)
9. [UX Flows](#9-ux-flows)
10. [Accessibility Assessment](#10-accessibility-assessment)
11. [Performance](#11-performance)
12. [Strengths](#12-strengths)
13. [Weaknesses and Recommendations](#13-weaknesses-and-recommendations)

---

## 1. Executive Summary

CRStats is a React 19 single-page application for tracking Clash Royale player statistics, offering AI coaching, deck analysis, training plans, community rankings, and a freemium billing model (Stripe). The frontend is built with:

- **Framework:** React 19 + TypeScript 5.6
- **Bundler:** Vite 7.1
- **Router:** Wouter 3.3 (lightweight, ~2KB)
- **State/Data:** TanStack React Query 5.60 (server state) + local useState
- **UI Library:** shadcn/ui (55 components, Radix UI primitives)
- **Styling:** Tailwind CSS 4.1 with custom design tokens
- **Auth:** Supabase Auth (email/password)
- **i18n:** Custom JSON-based system (pt-BR, en-US)
- **Charts:** Recharts 2.15
- **Icons:** Lucide React 0.545
- **Payments:** Stripe (checkout + portal redirect)
- **Analytics:** Vercel Speed Insights

Total frontend source: ~15,900 lines across 18 pages, 11 hooks, 14 custom components, and 55 UI primitives.

---

## 2. Page Inventory

### 2.1 All Routes

| Route | Component File | Lines | Auth | PRO-Gated | Key Functionality |
|-------|---------------|------:|:----:|:---------:|-------------------|
| `/` | `landing.tsx` (unauth) / `dashboard.tsx` (auth) | 248/137 | Conditional | No | Marketing landing page OR authenticated dashboard |
| `/auth` | `auth.tsx` | 169 | Public | No | Login + signup (toggle via `?signup=true`) |
| `/onboarding` | `onboarding.tsx` | 232 | Private | No | Player tag search + confirmation + profile save |
| `/dashboard` | `dashboard.tsx` | 137 | Private | No | Daily status, tilt state, trophy chart, last matches |
| `/me` | `me.tsx` | 1931 | Private | Partial | Full player stats: overview, battles, cards, goals, tilt analytics |
| `/coach` | `coach.tsx` | 396 | Private | Partial | AI chat coach, push analysis (PRO), quick prompts |
| `/training` | `training.tsx` | 541 | Private | Yes (advanced) | Training plan + drills, free teaser drills |
| `/decks` | `decks.tsx` | 1397 | Private | Partial | Meta decks, counter-deck builder (PRO), deck optimizer (PRO) |
| `/community` | `community.tsx` | 340 | Private | No | Player/clan rankings, tag search, clan details |
| `/goals` | `goals.tsx` | 432 | Private | No | Goal CRUD (trophies, winrate, streak, custom) |
| `/settings` | `settings.tsx` | 763 | Private | No | Account, billing tab, preferences (theme, language, notifications) |
| `/billing` | `billing.tsx` | 368 | Private | No | Plan overview, upgrade (Stripe checkout), invoices |
| `/notifications` | `notifications.tsx` | 158 | Private | No | Notification list, mark read, clear all |
| `/profile` | `profile.tsx` | 22 | Private | No | Redirect to `/settings` (legacy route) |
| `/p/:tag` | `public-profile.tsx` | 205 | Public | No | Public player profile with recent battles |
| `/push` | `push.tsx` | 129 | Private | No | Push session analysis (timeline + session list) |
| `*` (404) | `not-found.tsx` | 22 | Public | No | 404 error page |

**Note:** `goals 2.tsx` (432 lines) exists as a duplicate/backup of `goals.tsx` and is not imported anywhere. It should be deleted.

### 2.2 Complexity Distribution

```
God-files (>500 lines):
  me.tsx .............. 1931 lines  [CRITICAL: needs decomposition]
  decks.tsx ........... 1397 lines  [CRITICAL: needs decomposition]
  settings.tsx ........  763 lines  [HIGH: 3 tabs could be separate components]
  training.tsx ........  541 lines  [MEDIUM: manageable but growing]

Standard pages (100-500 lines):
  goals.tsx ...........  432 lines
  coach.tsx ...........  396 lines
  billing.tsx .........  368 lines
  community.tsx .......  340 lines
  landing.tsx .........  248 lines
  onboarding.tsx ......  232 lines
  public-profile.tsx ..  205 lines
  auth.tsx ............  169 lines
  notifications.tsx ...  158 lines
  dashboard.tsx .......  137 lines
  push.tsx ............  129 lines

Minimal pages:
  profile.tsx .........   22 lines  (redirect only)
  not-found.tsx .......   22 lines
```

---

## 3. Component Architecture

### 3.1 UI Framework (shadcn/ui)

55 shadcn/ui components are installed in `client/src/components/ui/`. These are Radix UI primitives styled with Tailwind:

**Actively Used (confirmed via page imports):**
accordion, alert, alert-dialog, avatar, badge, button, card, collapsible, dialog, input, label, popover, progress, scroll-area, select, separator, sheet, switch, table, tabs, toast, toaster, toggle-group, tooltip

**Installed but Unused/Underused:**
aspect-ratio, breadcrumb, button-group, calendar, carousel, chart, checkbox, command, context-menu, drawer, dropdown-menu, empty, field, form, hover-card, input-group, input-otp, item, kbd, menubar, navigation-menu, pagination, radio-group, resizable, skeleton, slider, sonner, spinner, textarea, toggle

This means roughly 50% of installed UI components are not actively used. This adds dead weight to the dependency tree, though tree-shaking should mitigate bundle impact.

### 3.2 Custom Component Inventory

| Component | File | Lines | Used By | Purpose |
|-----------|------|------:|---------|---------|
| `DashboardLayout` | `layout/DashboardLayout.tsx` | 58 | 12 pages | Shell: sidebar + topbar + content area |
| `Sidebar` | `layout/Sidebar.tsx` | 241 | DashboardLayout | Navigation sidebar with collapsible decks submenu |
| `Topbar` | `layout/Topbar.tsx` | 160 | DashboardLayout | Sync button + notifications popover |
| `DailyStatusCard` | `home/DailyStatusCard.tsx` | 93 | dashboard | Trophy count, 24h stats, tilt indicator |
| `MiniGraph` | `home/MiniGraph.tsx` | 52 | dashboard | 7-day trophy trend (Recharts AreaChart) |
| `LastMatches` | `home/LastMatches.tsx` | 79 | dashboard | Last 5 matches result strip |
| `DailyInsight` | `home/DailyInsight.tsx` | 79 | dashboard | AI-like daily coaching tip card |
| `ClashCardImage` | `clash/ClashCardImage.tsx` | 90 | me, decks | Card image renderer (API-based URL builder) |
| `QuickActions` | `coach/QuickActions.tsx` | 51 | coach | Quick-prompt buttons for AI coach |
| `PushAnalysisCard` | `PushAnalysisCard.tsx` | 123 | coach, push | Push session analysis display (strengths/mistakes/recommendations) |
| `PushSessionList` | `push/PushSessionList.tsx` | 84 | push | Selectable push session list sidebar |
| `PushTimeline` | `push/PushTimeline.tsx` | 132 | push | Trophy timeline chart for a push session |
| `ErrorBoundary` | `ErrorBoundary.tsx` | 134 | App (global + per-page) | Class-based error boundary with retry |
| `PageErrorState` | `PageErrorState.tsx` | 86 | 7 pages | Reusable error card with retry and technical details |

### 3.3 Component Patterns

**Composition Pattern:**
- `DashboardLayout` wraps all authenticated pages providing sidebar/topbar shell
- `ErrorBoundary` wraps high-risk pages via `withLocalBoundary` HOC in `App.tsx`

**Props Patterns:**
- Components receive data directly via props (no render props or context pattern at component level)
- Heavy use of inline type definitions (not extracted to shared types)
- Widespread `any` casting (`as any`) in page-level code instead of proper typing

**Reusability Assessment:**
- `PageErrorState` is highly reusable and well-designed (used in 7+ pages)
- `ErrorBoundary` is well-implemented with contextKey-based messages
- `DashboardLayout` correctly handles mobile/desktop sidebar toggle
- Home dashboard components (`DailyStatusCard`, `MiniGraph`, etc.) are properly decomposed
- Pages like `me.tsx` and `decks.tsx` have ZERO component extraction, containing all UI inline

---

## 4. State Management

### 4.1 React Query Usage

React Query (TanStack) is the sole server-state manager. Configuration in `queryClient.ts`:

```
Default Options:
  staleTime:           Infinity
  refetchInterval:     false
  refetchOnWindowFocus: false
  retry:               false (queries and mutations)
```

**Query Key Convention:**
```
["user"]                       -- current user
["profile"]                    -- user profile
["settings"]                   -- user settings
["subscription"]               -- subscription status
["player-sync"]                -- player sync (POST, 2min stale)
["clash-player", tag]          -- player data (5min stale)
["clash-battles", tag]         -- battle data (2min stale)
["clash-cards"]                -- card catalog (60min stale)
["history-battles"]            -- battle history
["goals"]                      -- user goals
["favorites"]                  -- saved player profiles
["notifications"]              -- notification list
["coach-messages"]             -- chat history
["latest-push-analysis"]       -- push analysis
["training-plan"]              -- active training plan
["training-plans"]             -- all training plans
["push-analysis-latest"]       -- latest push analysis (training)
["community-player-rankings"]  -- player rankings
["community-clan-rankings"]    -- clan rankings
["public-clan", tag]           -- public clan data
["public-player", tag]         -- public player data
["billing-invoices"]           -- stripe invoices
```

### 4.2 Cache Invalidation Strategy

Mutations invalidate related query keys on success:

| Mutation | Invalidates |
|----------|------------|
| Save profile | `["profile"]`, `["user"]` |
| Update settings | `["settings"]`, `["notification-preferences"]` |
| Create/delete goal | `["goals"]` |
| Create/delete favorite | `["favorites"]` |
| Set default profile | `["profile"]`, `["player-sync"]`, `["history-battles"]` |
| Mark notification read | `["notifications"]` |
| Sync player | `["history-battles"]`, `["player-sync"]` |
| Update drill | `["training-plan"]`, `["training-plans"]` |
| Generate push analysis | `["push-analysis-latest"]` |

**Concern:** The default `staleTime: Infinity` means queries never automatically refetch. Combined with `refetchOnWindowFocus: false`, users must manually trigger refreshes (via the Sync button in the topbar) to see fresh data. This is intentional for reducing API calls but could cause stale displays.

### 4.3 Local State

Pages use `useState` for:
- Form inputs (tag, name, email, password)
- UI toggles (tabs, modals, collapsibles)
- Computed/derived display values

No global client state store (Redux, Zustand, Jotai) exists. This is appropriate given the server-state-centric architecture.

---

## 5. Custom Hooks Inventory

| Hook | File | Lines | Purpose | Dependencies | Reusable? |
|------|------|------:|---------|-------------|:---------:|
| `useAuth` | `useAuth.ts` | 63 | Supabase session management + user fetch | Supabase, React Query, `api.auth` | Yes |
| `useLocale` | `use-locale.tsx` | 117 | i18n context provider + locale/currency/translation functions | React Context, React Query, `api.settings` | Yes |
| `usePlayerSync` | `usePlayerSync.ts` | 66 | Player data sync (POST /player/sync), returns player+battles+stats | React Query, `api.player` | Yes |
| `useProfile` | `useProfile.ts` | 26 | Profile CRUD (get + update mutation) | React Query, `api.profile` | Yes |
| `useSettings` | `useSettings.ts` | 86 | Settings + notification preferences CRUD | React Query, `api.settings` | Yes |
| `useClashPlayer` | `useClashPlayer.ts` | 37 | Clash Royale player/battles/cards API wrappers | React Query, `api.clash` | Yes |
| `useGoals` | `useGoals.ts` | 55 | Goals CRUD (list, create, update, delete) | React Query, `api.goals` | Yes |
| `useFavorites` | `useFavorites.ts` | 40 | Saved player profiles CRUD | React Query, `api.favorites` | Yes |
| `useNotifications` | `useNotifications.ts` | 88 | Notifications list + mark read/clear mutations | React Query, `api.notifications` | Yes |
| `useIsMobile` | `use-mobile.tsx` | 19 | Media query (< 768px) detector | Window matchMedia | Yes |
| `useToast` | `use-toast.ts` | 191 | Toast notification system (reducer-based) | Standalone (no deps) | Yes |

**Issues Found:**
1. `useProfile.ts` and `useFavorites.ts` use `toast` from `sonner` directly with hardcoded Portuguese strings, bypassing the i18n system.
2. `useGoals.ts` also uses `toast` from `sonner` with hardcoded Portuguese.
3. `useSettings.ts` properly uses `t()` for toast messages -- inconsistent with above.
4. Two toast systems coexist: `sonner` (in hooks) and `@radix-ui/react-toast` via `use-toast.ts` (in pages). This is a source of confusion.

---

## 6. Routing Architecture

### 6.1 Router: Wouter

Wouter is used as a lightweight alternative to React Router. All routes are defined in `App.tsx` using a `<Switch>` with conditional rendering based on auth state.

### 6.2 Route Map

```
PUBLIC ROUTES (no auth required):
  /           --> LandingPage (unauthenticated) OR DashboardPage (authenticated)
  /auth       --> AuthPage (login/signup)
  /p/:tag     --> PublicProfilePage

PRIVATE ROUTES (redirect to /auth if unauthenticated):
  /dashboard  --> DashboardPage + ErrorBoundary
  /me         --> MePage + ErrorBoundary
  /coach      --> CoachPage + ErrorBoundary
  /training   --> TrainingPage + ErrorBoundary
  /decks      --> DecksPage (NO ErrorBoundary)
  /community  --> CommunityPage (NO ErrorBoundary)
  /goals      --> GoalsPage + ErrorBoundary
  /settings   --> SettingsPage (NO ErrorBoundary)
  /profile    --> Redirect to /settings
  /onboarding --> OnboardingPage (NO ErrorBoundary)
  /billing    --> BillingPage + ErrorBoundary
  /notifications --> NotificationsPage + ErrorBoundary
  /push       --> PushPage (NOT in Router -- route exists in Sidebar but not in App.tsx)

CATCH-ALL:
  *           --> NotFoundPage
```

### 6.3 Auth Guard Implementation

Auth is not implemented via a dedicated guard/middleware. Instead, `App.tsx` duplicates all private routes in an `isAuthenticated ? <>...</> : <>...</>` conditional block. The unauthenticated block renders `<RedirectToAuth />` for each private route.

**Issues:**
1. **`/push` route is missing from `App.tsx`** -- The Sidebar links to `/push` but no Route is defined. Users navigating to `/push` will see the 404 page.
2. **Route duplication** -- Every private route appears twice (authenticated + unauthenticated blocks). Adding a new page requires editing both blocks.
3. **No lazy loading** -- All pages are eagerly imported at the top of `App.tsx`.

### 6.4 Navigation Patterns

- **Sidebar** (desktop: fixed 256px, mobile: Sheet overlay) is the primary navigation
- **Topbar** has sync button + notifications popover
- **Decks** has a collapsible submenu in sidebar with `?tab=meta|counter|optimizer` query params
- **Internal links** use `<Link href="...">` from Wouter
- **External navigation** (Stripe checkout/portal) uses `window.location.href = url`

---

## 7. Styling System

### 7.1 Tailwind CSS 4.1

Tailwind is configured via `@tailwindcss/vite` plugin. The design system uses CSS custom properties (HSL-based) defined in `index.css`.

### 7.2 Design Tokens

```
Theme: Dark-first (gaming aesthetic)
Fonts:
  --font-sans:    'Inter', sans-serif  (body)
  --font-display: 'Rubik', sans-serif  (headings)

Color Palette:
  Background:  224 71% 4%  (deep blue-black)
  Foreground:  210 40% 98% (near white)
  Primary:     43 96% 56%  (gold -- Clash Royale aesthetic)
  Secondary:   217 91% 60% (blue)
  Destructive: 0 84% 60%   (red)
  Success:     142 71% 45%  (green)
  Warning:     48 96% 53%   (yellow)
  Info:        217 91% 60%  (blue)

Semantic Colors:
  Win/OK:      --success (green)
  Loss/Tilt:   --destructive (red)
  PRO badge:   from-yellow-500 to-orange-500 gradient

Border Radius: 0.75rem base
```

### 7.3 Custom Utilities

Defined in `index.css` `@layer utilities`:

| Class | Purpose |
|-------|---------|
| `.glass-card` | Glassmorphism: `bg-card/60 backdrop-blur-md border-white/5` with gradient overlay |
| `.interactive-hover` | Scale on hover/active: `hover:scale-[1.02] active:scale-[0.98]` |
| `.text-shadow-glow` | Neon glow text shadow using primary color |
| `.page-transition-*` | Enter/exit animations (opacity + translateY) -- defined but not actively used |

### 7.4 Responsive Design

- **Breakpoints:** Standard Tailwind (`md:768px`, `lg:1024px`)
- **Layout:** `md:flex-row` for sidebar + content on desktop; `Sheet` (drawer) on mobile
- **Grid:** Pages use `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` for card layouts
- **Topbar:** Hamburger menu visible `md:hidden`, sync status label hidden on small screens (`hidden sm:inline-block`)

### 7.5 Dark Mode

The application is **dark-only**. There is no light mode implementation:

- `:root` CSS variables define dark colors only
- `@custom-variant dark (&:is(.dark *))` is defined but no `.dark` class toggling exists
- Settings page has a "Dark Mode" switch that saves to backend, but toggling it does **nothing visually** since there are no light-mode token values
- The body has a decorative `background-image` with subtle radial gradients (blue + gold)

---

## 8. i18n Implementation

### 8.1 Architecture

Custom implementation (NOT react-i18next). Located in `shared/i18n/`:

```
shared/i18n/
  index.ts                  -- t() function, locale detection, type-safe keys
  translations/
    pt-BR.json              -- 1032 lines (~480 keys)
    en-US.json              -- 1078 lines (~480 keys)
```

The `t(key, locale, params?)` function supports:
- Dot-notation nested keys: `t("pages.coach.welcome")`
- Parameter interpolation: `t("home.welcome", { name: "Player" })`
- Fallback to pt-BR if key missing in current locale
- Console warning for completely missing keys

### 8.2 Locale Context

`useLocale()` hook (via `LocaleProvider`) provides:
- `locale` (current: "pt-BR" | "en-US")
- `t()` (bound to current locale)
- `setLocale()` (persisted to localStorage + sent to backend)
- `currency`, `pricing`, `formatPrice` (fixed to BRL in current release)
- Automatic sync with backend `preferredLanguage` setting on load

### 8.3 Coverage Gaps

**CRITICAL: Hardcoded Portuguese Strings**

| File | Issue | Count |
|------|-------|------:|
| `auth.tsx` | Entire page is hardcoded in Portuguese (titles, labels, buttons, toasts) | ~15 strings |
| `goals.tsx` | Uses `isPt ? "..." : "..."` inline ternaries instead of `t()` | ~43 occurrences |
| `push.tsx` | Hardcoded strings: "Push Analysis", "Sessoes Recentes", etc. | ~5 strings |
| `useProfile.ts` | Sonner toast: "Perfil atualizado com sucesso!" | 2 strings |
| `useGoals.ts` | Sonner toasts: "Meta criada com sucesso!", etc. | 4 strings |
| `useFavorites.ts` | Sonner toasts: "Jogador adicionado aos favoritos!" | 4 strings |
| `not-found.tsx` | Uses `bg-gray-50` (light mode color on dark app) | Styling issue |

**Summary:** auth.tsx, goals.tsx, and push.tsx bypass the i18n system entirely. The goals page uses a manual `isPt` ternary pattern (43 instances) that should be migrated to `t()` calls.

### 8.4 Dual Toast System

Two competing toast implementations exist:
1. **`@radix-ui/react-toast`** via `use-toast.ts` -- Used in pages (coach, billing, settings, etc.)
2. **`sonner`** via `toast.success()`/`toast.error()` -- Used in hooks (useProfile, useGoals, useFavorites, useSettings)

The Sonner toasts bypass i18n entirely. The Radix toasts are properly translated via `t()`.

---

## 9. UX Flows

### 9.1 Onboarding Flow

```
User arrives at /
  |
  v
LandingPage (marketing)
  |-- "Start Free" / "Create Account" --> /auth?signup=true
  |
  v
AuthPage (signup form)
  |-- signUp via Supabase
  |-- On success --> /onboarding
  |
  v
OnboardingPage
  |-- Enter Clash Royale player tag
  |-- Search (POST /clash/player/:tag)
  |-- Confirm identity
  |-- Save profile (PATCH /profile)
  |-- On success --> /dashboard
```

### 9.2 Auth Flow

```
Login:
  /auth --> email + password --> Supabase signInWithPassword
       --> success: redirect to /onboarding (even for returning users!)
       --> error: toast with error message

Signup:
  /auth?signup=true --> name + email + password --> Supabase signUp
       --> With session: redirect to /onboarding
       --> Without session (email confirmation): toast + stay on /auth

Logout:
  Settings page OR Sidebar --> Supabase signOut --> redirect to /

Session Check:
  useAuth hook:
    1. getSession() on mount
    2. onAuthStateChange listener
    3. Fetch user via /api/auth/user if session exists
    4. Auto sign-out on 401
```

**Issue:** Login always redirects to `/onboarding` even for returning users who already have a profile. Should redirect to `/dashboard` for users with an existing clashTag.

### 9.3 Core User Journey

```
/dashboard (Home)
  |-- DailyStatusCard: trophies, 24h stats, tilt level
  |-- MiniGraph: 7-day trophy trend
  |-- LastMatches: recent 5 battle results
  |-- DailyInsight: contextual coaching tip
  |
  +-- /me (Full Stats)
  |     |-- Overview tab: trophies, win rate, arena, best record
  |     |-- Battles tab: history with crown details
  |     |-- Cards tab: card collection with levels
  |     |-- Goals tab: goal cards with progress
  |     |-- Charts/analytics: tilt analysis, session timeline
  |
  +-- /coach (AI Coach)
  |     |-- Chat interface (message history)
  |     |-- Quick prompts (last loss, tilt, deck)
  |     |-- Push Analysis (PRO): generate AI analysis of recent push
  |     |-- Free: 3-5 messages/day
  |     |-- PRO: unlimited
  |
  +-- /training (Training Plans)
  |     |-- Free: 3 teaser drill cards
  |     |-- PRO: AI-generated training plan with drills
  |     |-- Drill progress tracking (increment / mark complete)
  |     |-- Plan completion flow
  |
  +-- /decks (Deck Analysis)
        |-- Meta tab: top decks from API
        |-- Counter tab (PRO): generate counter-deck for a card
        |-- Optimizer tab (PRO): optimize your current deck
```

### 9.4 Billing Flow

```
Free user:
  /billing --> See current plan (Free)
           --> Select interval (monthly/yearly)
           --> "Subscribe" button
           --> Stripe Checkout redirect (POST /stripe/checkout)
           --> Stripe hosted page
           --> Return to /billing?success=true
           --> Toast confirmation

PRO user:
  /billing --> See current plan (PRO) + renewal date
           --> "Manage" button
           --> Stripe Portal redirect (POST /stripe/portal)
           --> Stripe hosted page (cancel/update)
           --> Return to /billing

Invoices:
  /billing --> Invoice table with date, status, amount, PDF link
```

### 9.5 Settings Management

```
/settings
  |-- Account tab:
  |     |-- Avatar + email display
  |     |-- Display name input
  |     |-- Clash tag input + validate button (API check)
  |     |-- Saved profiles (favorites) list
  |     |-- Add new profile + set as default
  |     |-- Danger zone: Logout
  |
  |-- Billing tab:
  |     |-- Current plan + status + renewal date
  |     |-- Billing cycle (inferred from invoice periods)
  |     |-- Invoice history (last 5)
  |     |-- Upgrade button
  |
  |-- Preferences tab:
        |-- Dark mode toggle (non-functional)
        |-- Language selector (pt / en)
        |-- Notification toggles (system, training, billing)
        |-- Save button
```

---

## 10. Accessibility Assessment

### 10.1 ARIA Usage

| Area | Status | Notes |
|------|--------|-------|
| Form labels | PARTIAL | Most inputs have `<Label htmlFor>` but some miss it (goals dialog) |
| `aria-label` | RARE | Only 2 instances found (goals delete button, community search) |
| `role` attributes | NONE | No explicit roles; relies on semantic HTML + Radix |
| Landmarks | PARTIAL | `<header>`, `<main>`, `<nav>`, `<footer>` used in layout |
| Live regions | NONE | No `aria-live` for dynamic content (chat messages, sync status) |

### 10.2 Keyboard Navigation

- **shadcn/ui components** (Radix-based) provide built-in keyboard support for dialogs, popovers, tabs, select, etc.
- **Sidebar navigation** uses `<Link>` (anchor tags) -- keyboard accessible
- **Custom interactive elements** (e.g., clickable cards on training page) use `onClick` on `<Card>` which is NOT keyboard-accessible (no `onKeyDown`, no `tabIndex`, no `role="button"`)
- **Chat input** on coach page is properly focusable
- **Skip navigation link** -- NOT implemented

### 10.3 Color Contrast

The dark theme has potential contrast issues:
- `--muted-foreground: 215 20% 65%` on `--background: 224 71% 4%` -- Likely passes AA for large text but may fail for small text
- `--border: 217 33% 12%` is very low contrast against background
- Gold primary (`43 96% 56%`) on dark background passes contrast requirements
- Error/success colors provide good semantic distinction

### 10.4 Screen Reader Support

- **No skip links** for main content
- **Loading states** use visual spinners only (no `aria-busy` or `role="status"`)
- **Toasts** appear without `role="alert"` in some cases
- **Chart components** (Recharts) are not screen-reader accessible
- **Image alt text** is present on the hero background image but generic ("Hero Background")
- **ErrorBoundary** provides good text descriptions for errors

### 10.5 Accessibility Verdict

**Rating: LOW-MEDIUM.** The use of shadcn/ui (Radix) provides a solid accessibility baseline for interactive components, but the application-level accessibility is minimal. Key gaps: no skip links, no aria-live regions, keyboard-inaccessible custom clickable elements, no screen reader support for charts.

---

## 11. Performance

### 11.1 Bundle Concerns

- **No code splitting** -- All 18 pages are imported eagerly in `App.tsx`. The entire app is a single chunk.
- **No React.lazy()** -- No dynamic imports for routes
- **55 shadcn/ui components** installed, ~30 unused -- tree-shaking should handle this but adds build complexity
- **Recharts** is a heavy charting library (~400KB unminified) imported in me.tsx, dashboard, and push pages
- **date-fns** imported with named imports (tree-shakeable)
- **framer-motion** is listed in dependencies but NOT imported anywhere in the client -- dead dependency

### 11.2 Code Splitting Opportunities

```
Priority Route-Based Splits:
  1. /landing     (public, first load for new users)
  2. /auth        (public, second page for new users)
  3. /me          (1931 lines, heaviest page)
  4. /decks       (1397 lines + Recharts dependency)
  5. /coach       (AI chat, can load on demand)
  6. /billing     (Stripe, accessed infrequently)
  7. /push        (Recharts dependency)
```

### 11.3 Lazy Loading

- **No image lazy loading** -- Hero background image on landing uses standard `<img>` tag
- **No intersection observer** for deferred rendering
- **No Suspense boundaries** for data loading (loading states handled manually with `isLoading` checks)

### 11.4 Image Optimization

- Hero background: PNG imported as static asset via Vite (`@assets/` alias)
- No WebP/AVIF alternatives
- No responsive `srcSet` or `<picture>` element
- Clash card images loaded from external URLs (Clash Royale API CDN) -- no local caching or optimization

### 11.5 Vercel Speed Insights

`@vercel/speed-insights/react` is integrated (SpeedInsights component in App.tsx) for real-user monitoring. This is a positive signal for performance awareness.

### 11.6 QueryClient Configuration

`staleTime: Infinity` prevents unnecessary refetches but means first paint always shows cached data. The manual sync button in the topbar is the primary refresh mechanism. This is a deliberate trade-off for API rate limiting (Clash Royale API limits).

---

## 12. Strengths

### 12.1 Architecture

1. **Clean server-state pattern** -- React Query as the single source of truth for all server data, with proper cache invalidation on mutations. No redundant client stores.

2. **Consistent layout system** -- `DashboardLayout` + `Sidebar` + `Topbar` provide a unified shell. All authenticated pages use the same layout.

3. **Error handling is well-structured** -- `ErrorBoundary` (class component) wraps critical pages with contextual messages. `PageErrorState` provides a reusable error card with retry and technical details. `ApiError` class carries structured error information (code, status, requestId).

4. **API client is well-designed** -- `api.ts` provides a typed, organized API surface. `fetchAPI()` handles auth token injection, error parsing, and structured error objects. The `getApiErrorMessage()` utility maps error codes to i18n keys.

5. **i18n system** (where used) is clean -- Custom `t()` function with type-safe keys, parameter interpolation, and fallback chain. `LocaleProvider` syncs with backend preferences.

### 12.2 UX Design

6. **Gaming aesthetic is consistent** -- Dark theme with gold/blue accents, glass-card effects, neon glows, and `interactive-hover` microinteractions create a cohesive Clash Royale-inspired visual identity.

7. **Freemium gating is well-communicated** -- PRO features show lock icons, upgrade CTAs, and blurred previews (training page). Free users see clear value proposition with path to upgrade.

8. **Loading states are consistent** -- Every async operation shows `<Loader2>` spinner with descriptive text.

9. **Dashboard is focused** -- 4 key cards (status, chart, matches, insight) provide a quick daily overview without overwhelming.

10. **Push analysis concept** -- The push session detection and timeline visualization is a unique feature for the Clash Royale niche.

### 12.3 Code Quality

11. **`data-testid` attributes** present on key interactive elements (auth, onboarding, billing, settings) indicate test awareness.

12. **Error code mapping** -- `errorMessages.ts` maps 30+ API error codes to i18n keys, providing user-friendly error messages.

---

## 13. Weaknesses and Recommendations

### 13.1 CRITICAL Priority

| # | Issue | Impact | Recommendation |
|---|-------|--------|----------------|
| C1 | **me.tsx is 1931 lines** -- Single file contains Overview, Battles, Cards, Goals tabs, multiple charts (AreaChart, LineChart, BarChart), tilt analysis, and trophy graph | Unmaintainable, slow IDE, impossible to test in isolation | Decompose into `MeOverviewTab.tsx`, `MeBattlesTab.tsx`, `MeCardsTab.tsx`, `MeGoalsTab.tsx`, `TiltAnalysis.tsx`, `TrophyChart.tsx` (aim for <300 lines per file) |
| C2 | **decks.tsx is 1397 lines** -- Contains MetaDecks tab, CounterDeckBuilder, DeckOptimizer, all in one file with complex inline state | Same as C1 | Extract `MetaDecksTab.tsx`, `CounterDeckBuilder.tsx`, `DeckOptimizer.tsx`, and shared `DeckDisplay.tsx` component |
| C3 | **`/push` route is unreachable** -- Sidebar links to `/push` but `App.tsx` has no `<Route path="/push">` | Users see 404 when clicking "Push" in navigation | Add `<Route path="/push" component={PushPage} />` to Router in App.tsx |
| C4 | **auth.tsx is fully hardcoded in Portuguese** -- No `t()` calls, all strings are raw Portuguese | English users see Portuguese auth page; i18n broken for first interaction | Migrate all strings to translation keys |

### 13.2 HIGH Priority

| # | Issue | Impact | Recommendation |
|---|-------|--------|----------------|
| H1 | **goals.tsx uses 43 `isPt` ternaries** instead of `t()` | Brittle, error-prone, doesn't scale to new locales | Replace all `isPt ? "..." : "..."` with `t("pages.goals.xxx")` and add keys to both JSON files |
| H2 | **Dual toast systems** (Sonner + Radix Toast) | Inconsistent toast appearance and behavior | Pick one (recommend keeping Radix/use-toast since it's more widely used), remove sonner dependency, migrate hook toasts |
| H3 | **Login redirects to /onboarding for returning users** | Returning users must go through onboarding again (though onboarding lets them re-confirm) | Check if user already has `clashTag` in profile before redirecting; if yes, go to `/dashboard` |
| H4 | **No route-based code splitting** | Entire app loaded on first visit; larger bundle than necessary | Implement `React.lazy()` + `Suspense` for each page import in App.tsx |
| H5 | **Dark mode toggle is non-functional** | Settings shows toggle but changing it has no visual effect | Either implement light mode CSS variables OR remove the toggle to avoid confusion |
| H6 | **Route auth guard duplication** | Every route appears twice in App.tsx (auth + unauth blocks) | Create a `<PrivateRoute>` wrapper component that handles the auth check + redirect |
| H7 | **`goals 2.tsx` is a dead file** | Clutters the codebase, confuses developers | Delete `client/src/pages/goals 2.tsx` |

### 13.3 MEDIUM Priority

| # | Issue | Impact | Recommendation |
|---|-------|--------|----------------|
| M1 | **Excessive `as any` casting** | Loses TypeScript safety; 50+ instances across pages | Define proper interfaces for API responses and eliminate `any` |
| M2 | **`framer-motion` in dependencies but unused** | Adds to install size unnecessarily | Remove from `package.json` unless planned for future use |
| M3 | **Hooks use hardcoded Portuguese toasts** (useProfile, useGoals, useFavorites) | i18n broken for these toast messages | Migrate to `t()` calls (requires passing locale to hooks or using `useLocale()`) |
| M4 | **`not-found.tsx` uses `bg-gray-50`** (light background) | Visually broken on the dark-themed app | Change to `bg-background` to match app theme |
| M5 | **No `aria-live` regions** | Dynamic content changes not announced to screen readers | Add `role="status"` to loading spinners, `role="log"` to chat messages |
| M6 | **Settings page at 763 lines** | Large file with 3 tabs + multiple mutations | Extract `AccountTab.tsx`, `BillingTab.tsx`, `PreferencesTab.tsx` |
| M7 | **`formatDate` and `formatMoneyFromCents` duplicated** | Same utility functions defined in both `billing.tsx` and `settings.tsx` | Extract to `lib/formatters.ts` shared module |
| M8 | **Sidebar has a comment-heavy navigation array** with abandoned thoughts | Dead comments about /home vs /dashboard rename | Clean up comments; decide on canonical route names |

### 13.4 LOW Priority

| # | Issue | Impact | Recommendation |
|---|-------|--------|----------------|
| L1 | **~30 unused shadcn/ui components** | Minor: tree-shaking handles it; but clutters component directory | Audit and remove truly unused components periodically |
| L2 | **No image optimization pipeline** | Landing page hero PNG not optimized | Convert to WebP, add `loading="lazy"`, use `<picture>` with fallback |
| L3 | **No skip navigation link** | Minor a11y gap | Add "Skip to content" link at top of DashboardLayout |
| L4 | **Page transition CSS defined but unused** | `.page-transition-*` classes in index.css never applied | Either implement route transitions or remove dead CSS |
| L5 | **Copyright says 2025** in footer | Minor: outdated | Update to 2026 or use dynamic year |
| L6 | **Sidebar avatar uses hardcoded placeholder** | `src="https://github.com/shadcn.png"` | Use actual user avatar from profile or remove image |
| L7 | **`push.tsx` has Portuguese-only strings** | Minor i18n gap on a secondary page | Add translation keys for "Push Analysis", "Sessoes Recentes" |
| L8 | **`useIsMobile` returns `false` initially** | Flash of desktop layout on mobile for SSR or first render | Initialize from `window.innerWidth` check instead of `undefined` |

---

## Appendix A: File Tree (Frontend)

```
client/src/
  App.tsx                     -- Router + providers (130 lines)
  main.tsx                    -- React root (5 lines)
  index.css                   -- Tailwind + design tokens (202 lines)

  pages/
    auth.tsx                  -- Login/Signup (169)
    billing.tsx               -- Subscription/invoices (368)
    coach.tsx                 -- AI chat coach (396)
    community.tsx             -- Rankings (340)
    dashboard.tsx             -- Home dashboard (137)
    decks.tsx                 -- Deck analysis [GOD FILE] (1397)
    goals.tsx                 -- Goal management (432)
    goals 2.tsx               -- DEAD FILE (432)
    landing.tsx               -- Marketing page (248)
    me.tsx                    -- Full stats [GOD FILE] (1931)
    not-found.tsx             -- 404 (22)
    notifications.tsx         -- Notifications (158)
    onboarding.tsx            -- Player tag setup (232)
    profile.tsx               -- Redirect shim (22)
    public-profile.tsx        -- Public player view (205)
    push.tsx                  -- Push analysis (129)
    settings.tsx              -- Settings (763)
    training.tsx              -- Training plans (541)

  hooks/
    use-locale.tsx            -- i18n context (117)
    use-mobile.tsx            -- Responsive detection (19)
    use-toast.ts              -- Toast system (191)
    useAuth.ts                -- Auth state (63)
    useClashPlayer.ts         -- Clash API hooks (37)
    useFavorites.ts           -- Favorites CRUD (40)
    useGoals.ts               -- Goals CRUD (55)
    useNotifications.ts       -- Notifications CRUD (88)
    usePlayerSync.ts          -- Player sync (66)
    useProfile.ts             -- Profile CRUD (26)
    useSettings.ts            -- Settings CRUD (86)

  components/
    ErrorBoundary.tsx         -- Error boundary (134)
    PageErrorState.tsx        -- Error card (86)
    PushAnalysisCard.tsx      -- Push analysis display (123)
    clash/
      ClashCardImage.tsx      -- Card image (90)
    coach/
      QuickActions.tsx        -- Quick prompts (51)
    home/
      DailyInsight.tsx        -- Daily tip (79)
      DailyStatusCard.tsx     -- Status hero card (93)
      LastMatches.tsx         -- Recent matches (79)
      MiniGraph.tsx           -- Trophy chart (52)
    layout/
      DashboardLayout.tsx     -- Page shell (58)
      Sidebar.tsx             -- Navigation (241)
      Topbar.tsx              -- Top bar (160)
    push/
      PushSessionList.tsx     -- Session list (84)
      PushTimeline.tsx        -- Timeline chart (132)
    ui/
      [55 shadcn/ui files]    -- (5766 total lines)

  lib/
    api.ts                    -- API client (347)
    authUtils.ts              -- Auth utilities
    clashIcons.ts             -- Icon mappings
    errorMessages.ts          -- Error code -> i18n (70)
    pushUtils.ts              -- Push session grouping
    queryClient.ts            -- React Query config (57)
    supabaseClient.ts         -- Supabase singleton (31)
    utils.ts                  -- cn() utility (6)
    analytics/
      deckStats.ts            -- Deck statistics
      trophyChart.ts          -- Trophy chart builder

shared/
  i18n/
    index.ts                  -- i18n engine (110)
    translations/
      pt-BR.json              -- Portuguese (1032 lines)
      en-US.json              -- English (1078 lines)
```

## Appendix B: Dependency Summary

| Package | Version | Purpose | Bundle Impact |
|---------|---------|---------|:------------:|
| react | 19.2 | UI framework | Core |
| wouter | 3.3 | Routing | ~2KB |
| @tanstack/react-query | 5.60 | Server state | ~45KB |
| tailwindcss | 4.1 | CSS utility framework | Build-time only |
| lucide-react | 0.545 | Icons (tree-shakeable) | Varies |
| recharts | 2.15 | Charts | ~400KB |
| @supabase/supabase-js | 2.95 | Auth | ~50KB |
| date-fns | 3.6 | Date utilities | Tree-shakeable |
| framer-motion | 12.23 | Animations (UNUSED) | ~150KB dead |
| stripe | 20.0 | Server-side only | 0 (server dep) |
| sonner | 2.0 | Toasts (should be removed) | ~10KB |
| zod | 3.25 | Validation (shared) | ~15KB |

---

*End of Frontend Specification*
