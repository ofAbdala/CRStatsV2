# CRStats Vision 2.0 — Product Requirements Document

## Version: 1.0
## Date: 2026-02-27
## Author: @pm (Morgan), synthesized from Counsel Squad Session #2

---

## 1. Executive Summary

CRStats will evolve from an AI coaching tool with basic tracking into the **definitive Clash Royale hub** — combining the strengths of StatsRoyale (tracker), DeepLoL (analytics), and FortniteTracker (community) into a single, data-driven platform. The product serves all players from beginners to competitive pushers across all arenas.

**Core Value Proposition:** "Stop losing trophies. Find the highest win-rate deck against the cards that beat you — updated in real-time from community data."

**Strategic Positioning:** Coach-first, not tracker-first. The tracker attracts; the analytics retains; the AI coaching converts.

---

## 2. Market Gap Analysis

| Competitor | Tracker | Analytics by Arena | Counter Decks (Data) | AI Coaching | Community |
|-----------|:-------:|:------------------:|:--------------------:|:-----------:|:---------:|
| StatsRoyale | Full | None | None | None | Basic |
| RoyaleAPI | Full | Partial | None | None | Basic |
| DeckShop | None | Partial | Manual | None | None |
| **CRStats** | **70%** | **Building** | **Building** | **90%** | **40%** |

**Gap:** No product combines all 3 pillars (tracker + data-driven analytics + AI coaching).

---

## 3. Product Vision — 3 Pillars

### Pilar 1: Complete Tracker (como StatsRoyale)
- Player stats, trophy history, battle log
- Push session tracking with trophy balance
- Leaderboards and rankings (global, regional, clan)
- Public player profiles
- Season-over-season progression

### Pilar 2: Intelligent Analytics (como DeepLoL) — KILLER DIFFERENTIATOR
- **Meta decks PER ARENA** — top-performing decks segmented by arena, updated daily
- **Counter decks data-driven** — given a card, show community decks with highest win rate against it
- **Matchup matrix** — card vs card win rates
- **3-crown rate** — decks that win decisively
- **Card win rates** — per arena, per trophy range
- **Trend tracking** — meta shifts over time (daily snapshots)

### Pilar 3: AI Coaching (exclusivo, ninguem tem)
- Coach chat (GPT-4o) with game context
- Push analysis (AI-powered)
- Deck optimizer
- Training plans and drills
- Already at 90% — most complete in market

---

## 4. Core User Loop

```
Player loses battle → frustrated → searches for counter
    → lands on CRStats (SEO/social)
    → sees counter deck for their arena with win rate
    → uses deck → WINS
    → wants more → creates account (free)
    → uses 5 free queries → hits limit
    → sees PRO value → converts
    → uses AI coach + push tracking → retained
```

---

## 5. Functional Requirements

### FR-001: Arena-Personalized Meta Decks
- System SHALL detect player's current arena from profile
- System SHALL display meta decks filtered by player's arena
- Meta deck data SHALL be sourced from Clash Royale API battle data
- Meta decks SHALL update daily via automated pipeline (cron job)
- Each deck SHALL show: win rate, usage rate, 3-crown rate, average elixir

### FR-002: Counter Deck System
- Given a card (or set of cards), system SHALL return top decks with highest win rate against that card
- Counter recommendations SHALL be filtered by player's arena
- Data SHALL come from real community battle data, not AI generation
- Counter page SHALL be accessible without authentication (SEO)
- Minimum 5 counter deck suggestions per query

### FR-003: Production Deployment
- Application SHALL be deployed to Vercel (serverless)
- Database SHALL use Supabase production instance
- All Epic 1 migrations SHALL be applied to production
- Stripe SHALL be configured with production keys
- Cron jobs SHALL run for meta deck snapshots

### FR-004: SEO Dynamic Pages
- System SHALL generate pages at `/meta/{arena}` for each arena
- System SHALL generate pages at `/counter/{card}` for each card
- Pages SHALL include meta tags for social sharing (Open Graph)
- Pages SHALL be indexable by search engines (SSR or pre-rendered)
- Sitemap SHALL be auto-generated

### FR-005: Advanced Battle Statistics
- System SHALL calculate 3-crown rate per deck
- System SHALL track card win rates per arena
- System SHALL provide matchup matrix (card vs card)
- System SHALL track stats across seasons
- Stats SHALL update with each sync

### FR-006: Enhanced Push Tracking
- DailyStatusCard SHALL show today's push summary (wins, losses, trophy delta)
- System SHALL detect tilt (3+ consecutive losses) and suggest breaks
- Trophy progression graph SHALL show session-by-session data
- Push balance SHALL show win/loss ratio for current push session

### FR-007: Smart Monetization
- PRO tier (R$19,90/month) SHALL include: unlimited meta/counter queries, AI coach, push analysis
- Elite tier (R$39,90/month) SHALL include: everything PRO + training plans, priority coaching, advanced analytics
- Free users SHALL have 5 queries/day for meta/counter decks
- Paywall SHALL trigger at value moments (after user sees a winning result)

### FR-008: Community & Social
- Clan tracking: view clan stats, member activity, war performance
- Follow system: follow players to track their progress
- Deck sharing: share deck builds with community link
- Top decks: community-voted best decks per arena

---

## 6. Non-Functional Requirements

### NFR-001: Performance
- Meta deck queries SHALL respond in < 500ms (cached)
- Counter deck queries SHALL respond in < 1s
- Page load (LCP) SHALL be < 2.5s

### NFR-002: Data Freshness
- Meta deck snapshots SHALL update every 24 hours
- Player sync SHALL reflect data within 5 minutes of game
- Counter data SHALL be no older than 24 hours

### NFR-003: SEO
- Dynamic pages SHALL achieve Core Web Vitals "Good" score
- All public pages SHALL have proper semantic HTML + meta tags
- Sitemap SHALL update daily with new arena/card pages

### NFR-004: Scale
- System SHALL handle 10,000 concurrent users
- API proxy SHALL respect Clash Royale API rate limits (20 req/s)
- Meta cache SHALL survive server restarts (persistent storage)

---

## 7. Strategic Direction (Counsel Squad Synthesis)

**Movement 1 (3-5 days):** MVP Pilar 2 — counter deck by arena + updated meta decks. This is the hook no competitor has.

**Movement 2 (2-3 days):** Deploy to production + create SEO dynamic pages. Each page is an organic acquisition channel.

**Movement 3 (1 day):** Smart paywall with usage limits. Free → PRO conversion at value moments.

**Then iterate** with real user feedback before building the full vision.

**Positioning:** "Win more battles" — not "see your stats." The tracker is a feature, not the identity.

---

## 8. Success Metrics

| Metric | Target (Month 1) | Target (Month 3) |
|--------|:-----------------:|:-----------------:|
| Monthly Active Users | 500 | 5,000 |
| Free → PRO Conversion | 3% | 5% |
| Daily Meta/Counter Queries | 1,000 | 10,000 |
| Organic Traffic (SEO) | 100/day | 1,000/day |
| MRR | R$1,000 | R$10,000 |
| Churn (monthly) | < 15% | < 10% |

---

## 9. Constraints

- **CON-001:** Clash Royale API rate limit: 20 requests/second per token
- **CON-002:** Single developer — stories must be achievable in 1-5 days each
- **CON-003:** Budget-conscious — minimize third-party service costs
- **CON-004:** OpenAI API costs — AI features must be rate-limited for free users
- **CON-005:** Data accuracy — meta/counter data depends on sufficient battle sample size

---

## 10. Out of Scope (Vision 2.0)

- Native mobile app (web-first, responsive)
- Tournament management
- In-game overlay or extension
- Content creation tools (YouTube/TikTok)
- Paid advertising campaigns (organic first)
- Full WCAG 2.1 AA certification
- Multi-game support (CR only)
