# Epic 2: CRStats Vision 2.0 — Hub Definitivo de Clash Royale

## Overview

With Epic 1 (Technical Debt) complete — 62 TD items resolved, codebase clean, 78 tests passing — the foundation is solid. Epic 2 transforms CRStats from an AI coaching tool with basic tracking into the **definitive Clash Royale hub**: tracker + data-driven analytics + AI coaching.

The strategic direction comes from Counsel Squad Session #2 (2026-02-27): ship the killer feature first (arena-personalized counter decks), deploy to production immediately, and build a smart paywall. Then iterate with real user feedback.

**No competitor combines all 3 pillars.** The gap is real, the game is hot, and first-mover advantage matters.

### Product Health Target
```
Current:          Clean codebase, 120+ features, zero revenue
After Epic 2:     Production-deployed, monetized, SEO-indexed, data-driven analytics live
```

### Source Documents
- `docs/prd/vision-2.0-prd.md` — Product Requirements Document
- `docs/PLAN-crstats-vision.md` — Vision 2.0 Rascunho
- `docs/prd/technical-debt-assessment.md` — Epic 1 Assessment (completed)

---

## Scope

### IN
- Arena-personalized meta decks and counter deck system (Pilar 2 MVP)
- Production deployment (Vercel + Supabase + Stripe)
- SEO dynamic pages for organic acquisition
- Advanced battle statistics (3-crown rate, card WR, matchup data)
- Enhanced push tracking with DailyStatusCard and tilt detection
- Smart monetization with two-tier pricing (PRO/Elite)
- Community features (clan tracking, follow, share)
- UX polish and design improvements

### OUT
- Native mobile app
- Tournament management
- Full design system overhaul (deferred to Epic 3)
- Multi-game support
- Paid advertising campaigns
- Content creation tools

---

## Stories

| # | Title | FRs | Effort | Priority | Phase | Dependencies |
|---|-------|-----|--------|----------|-------|-------------|
| 2.1 | Arena-Personalized Meta Decks & Counter System | FR-001, FR-002 | L (3-5d) | P0 | 1 | None |
| 2.2 | Production Deploy & Infrastructure | FR-003 | M (2-3d) | P0 | 1 | None |
| 2.3 | SEO Dynamic Pages & Public Profiles | FR-004 | M (2-3d) | P0 | 1 | 2.1, 2.2 |
| 2.4 | Advanced Battle Stats & Analytics | FR-005 | M (2-3d) | P1 | 2 | 2.2 |
| 2.5 | Enhanced Push Tracking & Tilt Detection | FR-006 | M (2-3d) | P1 | 2 | 2.2 |
| 2.6 | Smart Monetization & Two-Tier Paywall | FR-007 | S (1-2d) | P1 | 2 | 2.2 |
| 2.7 | Community & Social Features | FR-008 | L (3-5d) | P2 | 3 | 2.2, 2.4 |
| 2.8 | UX Polish & Mobile Optimization | — | M (2-3d) | P2 | 3 | 2.1-2.6 |

**Total: 8 stories covering 8 FRs**
**Estimated total effort: 18-27 days (~3-5 weeks)**

---

## Dependency Graph

```
Phase 1 (Launch MVP):
  Story 2.1 (Meta Decks & Counters) ──┐
                                       ├──> Story 2.3 (SEO Pages)
  Story 2.2 (Deploy & Infra) ─────────┘
       │
       └──> feeds all Phase 2 stories

Phase 2 (Complete Product):
  Story 2.4 (Advanced Stats) ──────────┐
  Story 2.5 (Push Tracking V2)        ├──> Story 2.7 (Community)
  Story 2.6 (Smart Monetization)       │
                                       │
Phase 3 (Growth):                      │
  Story 2.7 (Community) ◄─────────────┘
  Story 2.8 (UX Polish) ◄── all previous stories
```

---

## Phase Breakdown

### Phase 1: Launch MVP (Week 1-2) — COUNSEL PRIORITY
**Goal:** Ship the killer feature + go live + start organic acquisition

| Story | Key Outcome |
|-------|-------------|
| 2.1 | Players can find counter decks by arena — THE differentiator |
| 2.2 | CRStats is live in production with payments working |
| 2.3 | SEO pages rank for "best deck arena X" / "counter Y" queries |

### Phase 2: Complete Product (Week 3-4)
**Goal:** Fill the tracker/analytics gaps + optimize monetization

| Story | Key Outcome |
|-------|-------------|
| 2.4 | Full battle analytics — 3-crown rate, card WR, matchups |
| 2.5 | Push tracking with tilt detection — daily engagement hook |
| 2.6 | Two-tier pricing live — PRO R$19,90 / Elite R$39,90 |

### Phase 3: Growth & Polish (Week 5-6)
**Goal:** Community features for retention + visual polish

| Story | Key Outcome |
|-------|-------------|
| 2.7 | Clan tracking, follow, share — social retention layer |
| 2.8 | Visual improvements, mobile optimization, navigation |

---

## Success Criteria

- [ ] CRStats deployed and accessible in production
- [ ] Arena-personalized meta decks and counter system functional
- [ ] SEO pages indexed by Google (minimum 50 pages)
- [ ] Stripe payments working in production (PRO + Elite tiers)
- [ ] At least 10 beta users with real accounts
- [ ] Monthly recurring revenue > R$0 (first paying customer)
- [ ] All existing tests pass (78 tests)
- [ ] No new CRITICAL issues introduced

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|:-----------:|:------:|-----------|
| Clash Royale API rate limits block meta pipeline | Medium | High | Implement smart caching, batch requests, respect 20 req/s |
| Insufficient battle data for accurate meta stats | Medium | Medium | Start with top 1000 players per arena, expand sample size |
| SEO pages take months to rank | High | Medium | Supplement with Reddit/Discord/TikTok distribution |
| Single developer bottleneck | High | High | Strict phase prioritization, ship MVP first |
| Competitor launches similar product | Low | High | Speed-to-market is the mitigation — ship now |
| OpenAI costs exceed budget at scale | Medium | Medium | Aggressive caching, PRO-only for AI features |

---

## Change Log

- 2026-02-27: @pm (Morgan) — Epic created from Counsel Squad Session #2 synthesis + PRD v1.0. 8 stories across 3 phases, estimated 3-5 weeks. Status: Draft.
