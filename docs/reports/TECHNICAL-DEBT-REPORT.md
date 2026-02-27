# CRStats -- Technical Debt Executive Report

**Prepared by:** @analyst (Business Analyst)
**Date:** 2026-02-27
**Phase:** Brownfield Discovery -- Phase 9 (Executive Summary)
**Audience:** Stakeholders, Decision-Makers, Product Leadership
**Source:** Technical Debt Assessment (FINAL) -- 62 items across 8 categories

---

## 1. Executive Summary

**CRStats** is a Clash Royale player analytics and coaching platform (SaaS) that helps gamers improve their performance through real-time stats, AI coaching, deck analysis, and training plans. The product generates revenue through a freemium model with a PRO subscription tier powered by Stripe billing.

### Current Health Score: 5.0 / 10

The platform's core features -- authentication, player data sync, billing, and the main dashboard -- are functional and serving real users. However, an independent technical assessment has identified **62 structural issues** accumulated during the rapid-build phase that now threaten the product's ability to grow safely.

| Severity | Count | Estimated Remediation |
|----------|:-----:|----------------------:|
| CRITICAL -- Immediate business risk | 11 | 18-28 days |
| HIGH -- Degrades growth potential | 12 | 14-22 days |
| MEDIUM -- Increases ongoing costs | 20 | 16-26 days |
| LOW -- Suboptimal but not urgent | 19 | 8-14 days |
| **TOTAL** | **62** | **56-90 days** |

### Top 3 Business Risks If Debt Is Not Addressed

1. **Security Exposure:** The platform has no protection against automated abuse. An attacker could consume thousands of dollars in AI API costs (OpenAI) in minutes by flooding the coaching endpoints, or exhaust the Clash Royale data quota for all users. No safeguards exist today.

2. **International Growth Blocked:** The sign-up page -- the very first screen every new user sees -- is entirely in Portuguese with zero translation support. Three additional core pages have the same problem. Expanding to English-speaking markets (the majority of the Clash Royale player base) is impossible without fixing this.

3. **Revenue at Risk from Data Corruption:** The billing system has a race condition where simultaneous payment events can create duplicate subscription records, leading to users potentially receiving free PRO access or losing paid access. This risk grows with every new subscriber.

### Recommendation

**Proceed with a structured remediation program before building Vision 2.0 features.** The 62 identified issues create compounding risk -- they get worse with each new user, each new feature, and each passing week. A 5-phase, 10-week remediation plan can raise the health score from 5.0 to 8.4 out of 10, creating a solid foundation for the ambitious Vision 2.0 roadmap.

---

## 2. Business Impact Analysis

### CRITICAL Items (11) -- "The building is standing, but the fire exits are locked"

These issues represent **immediate risk to users, revenue, or security**. Left unaddressed, any one of them could cause a user-facing incident, financial loss, or security breach.

**What breaks for users:**
- **A core feature is completely inaccessible.** The "Push Analysis" feature -- where users review their gaming sessions -- shows a broken error page when clicked. Worse, the error page itself displays invisible text (white text on a white-ish background), so users see a blank screen with no guidance. This affects 100% of users who try to access this feature.
- **The sign-up page is Portuguese-only.** Every new user -- regardless of language preference -- encounters 18 hardcoded Portuguese strings on the registration page. For the English-speaking Clash Royale community (which represents the majority of the global player base), this is a dead end.

**Revenue and security exposure:**
- **No protection against API abuse.** All 46 API endpoints are wide open. The AI coaching and deck analysis features use paid OpenAI calls with zero throttling. A single malicious user (or bot) could generate hundreds of dollars in API costs per hour.
- **Billing data can become corrupted.** The subscription system lacks safeguards against duplicate records. When two payment events arrive simultaneously (common with webhooks), both get processed, creating phantom subscription entries that accumulate over time.
- **Notification settings are split across two conflicting databases.** Users' notification preferences are stored in two different locations with no guarantee they agree. A user who turns off billing notifications might still receive them because the system checks both locations with unpredictable priority.
- **Timestamps can drift silently.** The system relies on 14 separate manual timestamp updates instead of using a single automatic rule. If any one is missed (a near-certainty as the codebase grows), data ordering and caching logic will produce incorrect results.

**Testing gap:**
- **Zero automated safety checks for the user interface.** Across 18 pages, 11 interactive features, and 14 custom components -- not a single automated test exists for the frontend. Any change to the interface could break the login flow, billing checkout, or data sync without anyone noticing until users report it.
- **Zero automated safety checks for the API.** The 46 API endpoints (3,874 lines of code in a single file) have no integration tests. The Stripe webhook handler -- which controls subscription state and directly impacts revenue -- is completely untested.

### HIGH Items (12) -- "Users can get in, but they keep tripping"

These issues **degrade the user experience, block feature development, or create scaling bottlenecks**.

**User experience friction:**
- **Returning users are forced through onboarding again.** Every login redirects to the new-user setup flow, even for existing users. This adds an unnecessary click on every single session.
- **A toggle that does nothing.** The settings page shows a "Dark Mode" switch that saves the preference but has zero visual effect. The app is always dark. This erodes trust in the product's quality.
- **The 404 error page has invisible text.** When any page fails to load, users see a blank-looking screen because the error page uses light-colored text that blends into the dark background.
- **Mixed Portuguese and English on the statistics page.** The detailed stats page -- the most data-rich screen in the product -- shows 27+ untranslated Portuguese strings mixed with English content. Battle types, chart labels, and error messages all appear in Portuguese regardless of the user's language setting.
- **The goals page uses a fragile translation hack.** Instead of the proper translation system, the goals page uses 46 inline if-then switches for language. Adding a third language (Spanish, for example) would require editing all 46 in lockstep.
- **Two competing notification systems.** Toast notifications appear with different styles, animations, and language behavior depending on which part of the app triggers them. Some are always Portuguese.

**Growth blockers:**
- **No protection against slow external services.** If the Clash Royale API or OpenAI takes too long to respond, the entire request hangs until the platform's hosting provider forcibly kills it (after 10-30 seconds). During this time, the user sees a spinning loader with no feedback.
- **Database connections can run out under load.** The connection pool uses default settings that allow too many simultaneous connections. Under moderate traffic, the database will start rejecting requests for all users.
- **No migration safety net for the database.** Schema changes are applied directly to the production database with no versioning, no rollback capability, and no audit trail. A failed change could corrupt the database with no easy recovery path.

### MEDIUM Items (20) -- "The car runs, but maintenance costs are climbing"

These issues **increase the cost of every future change** and create friction across the team.

- **Oversized files make changes slow and risky.** Four frontend pages and two backend files exceed 500 lines each, with the largest at 3,874 lines. Any modification requires understanding thousands of lines of intertwined logic. This is like having an entire department's work in a single spreadsheet -- every edit risks breaking something unrelated.
- **No ability to load pages independently.** All 18 pages are loaded upfront even if the user only visits one. This is like downloading every book in a library to read a single chapter. The initial page load includes a 400KB charting library even when no charts are displayed.
- **Data tables grow without limit.** Chat messages, analysis results, and usage logs accumulate forever. Without cleanup policies, storage costs will grow linearly with the user base, and queries will slow down progressively.
- **Core data visualizations are inaccessible.** Charts -- the central value proposition of an analytics platform -- provide no alternative for screen readers. Users with visual impairments cannot access the product's primary feature.
- **No production debugging capability.** The application writes unstructured text logs with no severity levels, no request tracing, and no search capability. Investigating a production issue requires manually scanning raw text output -- a process that becomes exponentially harder as traffic grows.
- **Potential vulnerability in user-submitted text.** Text fields (coach messages, goal descriptions, display names) have no protection against code injection. If malicious content is submitted and later displayed to other users, it could execute unauthorized actions in their browser.

### LOW Items (19) -- "Polish items for when the house is in order"

These are **cosmetic issues, dead code, and minor inconsistencies** that do not affect functionality but contribute to a sense of an unfinished product.

- Unused code libraries adding to install time (framer-motion, WebSocket)
- Dead duplicate files cluttering the codebase
- Copyright date showing 2025 instead of 2026
- User avatar showing a placeholder image instead of the actual profile picture
- Minor mobile layout flicker on first load
- Inconsistent naming conventions in the database

---

## 3. Risk Dashboard

```
+-------------------+--------+--------------------------------------------------+
| RISK AREA         | LEVEL  | TOP CONCERNS                                     |
+-------------------+--------+--------------------------------------------------+
| SECURITY          |  HIGH  | No rate limiting on any endpoint (46 exposed)    |
|                   |        | No cross-origin protection (CORS)                |
|                   |        | Unclear billing webhook verification             |
|                   |        | No input sanitization on text fields             |
+-------------------+--------+--------------------------------------------------+
| REVENUE           |  HIGH  | Subscription race condition (duplicate records)  |
|                   |        | OpenAI cost amplification (no throttling)        |
|                   |        | Billing notification inconsistency               |
+-------------------+--------+--------------------------------------------------+
| USER ACQUISITION  |  HIGH  | Sign-up page 100% Portuguese (18 strings)        |
|                   |        | 3 additional pages with hardcoded Portuguese      |
|                   |        | Returning users forced through onboarding         |
+-------------------+--------+--------------------------------------------------+
| USER RETENTION    | MEDIUM | Core feature (Push Analysis) unreachable          |
|                   |        | Non-functional dark mode toggle                   |
|                   |        | Mixed-language content on statistics page          |
|                   |        | Invisible 404 error page                           |
+-------------------+--------+--------------------------------------------------+
| SCALABILITY       | MEDIUM | 3,874-line monolithic API file                    |
|                   |        | No database migration versioning                   |
|                   |        | Connection pool defaults (will exhaust at scale)   |
|                   |        | Unbounded table growth (no retention policies)     |
+-------------------+--------+--------------------------------------------------+
| MAINTENANCE       |  HIGH  | Zero frontend test coverage (18 pages untested)  |
|                   |        | Zero API integration tests (46 endpoints)         |
|                   |        | God-file pattern (7 files > 500 lines)            |
|                   |        | No structured logging for production debugging     |
+-------------------+--------+--------------------------------------------------+
```

---

## 4. Investment Analysis

### Total Estimated Effort

| Phase | Timeline | Effort | Items |
|-------|----------|:------:|:-----:|
| Phase 1: Critical Fixes & Quick Wins | Week 1-2 | 4-5 days | 16 |
| Phase 2: Structural Improvements | Week 2-4 | 10-14 days | 9 |
| Phase 3: Data Integrity, i18n & Frontend | Week 4-7 | 14-22 days | 10 |
| Phase 4: Performance & Optimization | Week 7-9 | 12-18 days | 11 |
| Phase 5: Polish & Long-Term Quality | Week 9-12+ | 15-22 days | 16 |
| **TOTAL** | **~10-12 weeks** | **56-90 days** | **62** |

### Phase-by-Phase ROI

| Phase | Investment | Business Value Delivered |
|-------|-----------|------------------------|
| **Phase 1** (4-5 days) | Lowest cost, highest impact | Security baseline established. Push feature restored. International sign-up unblocked. 16 quick wins shipped. Health score: 5.0 --> 5.9 |
| **Phase 2** (10-14 days) | Moderate cost, foundational | API becomes testable and maintainable. Database changes become safe and reversible. Logging enables production debugging. Health score: 5.9 --> 6.6 |
| **Phase 3** (14-22 days) | Highest cost phase | Billing data integrity secured. Full international language support. Frontend code becomes maintainable. Health score: 6.6 --> 7.5 |
| **Phase 4** (12-18 days) | Moderate cost, performance focus | Page load speed improved. Database queries optimized. Error handling hardened. Health score: 7.5 --> 7.8 |
| **Phase 5** (15-22 days) | Gradual, can be interleaved | Full test coverage established. Accessibility compliance. Clean codebase. Health score: 7.8 --> 8.4 |

### Cost of Inaction

Technical debt compounds like financial debt -- it accrues "interest" in the form of:

1. **Every new user increases data corruption risk.** The notification duplication (TD-012) and subscription race condition (TD-015) grow worse with each sign-up. At 1,000 users, the probability of encountering a billing inconsistency becomes near-certain.

2. **Every new feature takes longer to build.** Adding a feature to the 3,874-line API file currently requires understanding the entire file. After the Phase 2 split, the same change would involve a focused 200-300 line module. The productivity multiplier is 10x or more.

3. **Every day without rate limiting is a day of financial exposure.** A single automated script hitting the AI coaching endpoint could generate $500+ in OpenAI charges before anyone notices. The fix takes less than 2 hours.

4. **International expansion remains locked.** The Clash Royale player base is predominantly English-speaking. Every week the sign-up page remains Portuguese-only is a week of lost international growth.

### Opportunity Cost: Debt Blocking Vision 2.0

The Vision 2.0 roadmap envisions transforming CRStats into a "dopamine-driven correction loop" with a new design system, reimagined home page, enhanced Push analysis, and improved coaching. **Several Vision 2.0 features cannot be safely built on the current foundation:**

| Vision 2.0 Feature | Blocked By |
|--------------------|------------|
| New "Liquid Glass" design system | God-file CSS, no code splitting, non-functional dark toggle |
| Push Analysis redesign | Route is currently unreachable (TD-004), page component isolated from navigation |
| Enhanced Coach experience | No rate limiting to protect AI costs, no request timeouts |
| New Home page with real-time data | N+1 database queries, no structured logging for debugging |
| Profile hub redesign | 1,931-line me.tsx god-file, 27+ untranslated strings |
| E2E verification of the loop | Zero test infrastructure exists |

Building Vision 2.0 features on top of the current debt would be like renovating a house with a cracked foundation -- each addition increases the risk of collapse.

---

## 5. Recommended Action Plan

### Immediate: Week 1-2 (Phase 1 -- Critical Fixes & Quick Wins)

**Goal:** Stop the bleeding. Fix security gaps, restore broken features, clear dead code.

| Priority | Action | Time | Business Outcome |
|:--------:|--------|:----:|-----------------|
| 1 | Restore Push Analysis feature (add missing route) | 2h | Core feature accessible again |
| 2 | Add cross-origin security protection | 2h | Security baseline |
| 3 | Add API rate limiting (global) | 2h | Prevent cost amplification attacks |
| 4 | Add automatic timestamp management | 2h | Data integrity safeguard |
| 5 | Add database performance indexes | 2h | Coach chat and Push analysis speed |
| 6 | Configure database connection limits | 2h | Prevent connection exhaustion |
| 7 | Fix invisible 404 error page | 2h | Users see helpful error messages |
| 8 | Translate sign-up page to support English | 2h | International sign-up unblocked |
| 9 | Remove broken dark mode toggle | 1h | Remove trust-damaging UI element |
| 10-16 | Clean up dead files, unused libraries, copyright, avatar | 4h | Codebase hygiene |

**Decision gate:** After Phase 1, review health score improvement (target: 5.9). Decide whether to proceed with Phase 2 or redirect to Vision 2.0 features.

### Short-Term: Week 3-4 (Phase 2 -- Structural Improvements)

**Goal:** Make the codebase maintainable and testable. Establish safety nets.

| Priority | Action | Time | Business Outcome |
|:--------:|--------|:----:|-----------------|
| 1 | Split monolithic API file into modules | 3+ days | Developers can work on features independently |
| 2 | Introduce database migration versioning | 4-8h | Schema changes become safe and reversible |
| 3 | Create reusable routing framework | 4-8h | New pages can be added in minutes, not hours |
| 4 | Set up end-to-end test infrastructure | 1-3 days | Automated verification of critical flows |
| 5 | Add API timeout protection | 4-8h | Prevent cascading failures from slow APIs |
| 6 | Add per-route rate limiting | 4-8h | Granular protection (stricter for AI endpoints) |
| 7 | Add structured production logging | 4-8h | Debug production issues in minutes, not hours |

**Decision gate:** After Phase 2, review structural readiness. The codebase should now support parallel development.

### Medium-Term: Week 5-7 (Phase 3 -- Data Integrity, Language & Frontend)

**Goal:** Secure billing data. Complete international language support. Make the frontend maintainable.

| Priority | Action | Time | Business Outcome |
|:--------:|--------|:----:|-----------------|
| 1 | Unify notification system | 4-8h | Consistent user notifications |
| 2 | Fix subscription race condition | 1-2 days | Billing data integrity secured |
| 3 | Consolidate notification settings | 2-4 days | Users' preferences always respected |
| 4 | Decompose statistics page (1,931 lines) | 3+ days | Maintainable, testable analytics |
| 5 | Decompose deck analysis page (1,397 lines) | 1-3 days | Maintainable deck features |
| 6 | Complete language translation (goals, hooks, push, server) | 3-5 days | Full English support across all pages |

**Decision gate:** After Phase 3, the product should fully support English-speaking users and have secure billing infrastructure. This is the minimum viable point for aggressive user acquisition.

### Long-Term: Week 8-10 (Phase 4 -- Performance & Optimization)

**Goal:** Speed up the product. Harden error handling. Control data growth.

| Priority | Action | Time | Business Outcome |
|:--------:|--------|:----:|-----------------|
| 1 | Implement data retention policies | 4-8h | Controlled storage costs |
| 2 | Move background processing out of user requests | 4-8h | Faster page loads |
| 3 | Optimize authentication queries | 4-8h | Faster login experience |
| 4 | Implement database session optimization | 1-3 days | Reduced infrastructure costs |
| 5 | Add error recovery to all pages | 4-8h | No more "white screen" crashes |
| 6 | Add input security protection | 4-8h | Protection against code injection |
| 7 | Implement page-level code splitting | 4-8h | Faster initial page load |

### Vision 2.0 Preparation: Week 11+ (Phase 5 -- Polish & Foundation)

**Goal:** Achieve test coverage, accessibility compliance, and a clean foundation for Vision 2.0.

| Priority | Action | Time | Business Outcome |
|:--------:|--------|:----:|-----------------|
| 1 | Add comprehensive API tests | 3+ days | Safe API evolution |
| 2 | Fix returning-user login redirect | 2h | Smoother login experience |
| 3 | Accessibility compliance pass | 3-5 days | Broader user reach, legal compliance |
| 4 | Remove unused components and dependencies | 4-8h | Clean, fast codebase |
| 5 | Database schema cleanup | 2-4h | Clear, consistent data model |
| 6 | Remaining polish items | 3-5 days | Professional-grade codebase |

**After Phase 5:** The codebase achieves a health score of 8.4/10 and is ready to safely support the Vision 2.0 "dopamine-driven correction loop" transformation.

---

## 6. Health Score Trajectory

```
10 |
   |                                                              *  8.4
 8 |                                              *  7.8    *
   |                              *  7.5
   |                *  6.6
 6 |    *  5.9
   | *  5.0
 4 |
   |
 2 |
   |
 0 +-------+--------+--------+--------+--------+--------+--------->
   Current  Phase 1  Phase 2  Phase 3  Phase 4  Phase 5   Target
            Wk 1-2   Wk 3-4   Wk 5-7   Wk 8-10  Wk 11+
```

| Milestone | Health Score | Key Achievement |
|-----------|:-----------:|-----------------|
| **Current state** | 5.0 / 10 | Functional prototype with significant structural risk |
| **After Phase 1** | 5.9 / 10 | Security baseline, broken features restored, quick wins shipped |
| **After Phase 2** | 6.6 / 10 | Maintainable architecture, test infrastructure, safe migrations |
| **After Phase 3** | 7.5 / 10 | Full i18n, data integrity secured, frontend decomposed |
| **After Phase 4** | 7.8 / 10 | Performance optimized, error handling hardened |
| **After Phase 5** | 8.4 / 10 | Production-grade quality, ready for Vision 2.0 |

**The biggest jump (5.0 to 5.9) comes from Phase 1 at the lowest cost (4-5 days).** This is the highest-ROI investment in the entire plan.

---

## 7. Key Metrics to Track

| Metric | Current | Phase 1 | Phase 3 | Phase 5 (Target) |
|--------|:-------:|:-------:|:-------:|:-----------------:|
| **Test Coverage** | 23 tests (backend only) | 23 tests | 23+ tests + E2E infra | 100+ tests across all layers |
| **i18n Compliance** | ~60% (8 of 14 pages) | ~65% (auth fixed) | ~95% (all pages) | 100% |
| **Code Quality** (largest file) | 3,874 lines | 3,874 lines | < 500 lines (split) | < 300 lines |
| **Security Posture** | 4/10 | 7/10 | 8/10 | 8.5/10 |
| **Pages with broken UX** | 3 (push, 404, auth) | 0 | 0 | 0 |
| **Database integrity gaps** | 5 issues | 3 issues | 0 issues | 0 issues |
| **Unreachable features** | 1 (Push Analysis) | 0 | 0 | 0 |

### Scoring Rubric

- **Test Coverage:** 2/10 currently (23 tests, zero frontend/E2E) --> Target 7/10 (comprehensive coverage of critical paths)
- **i18n Compliance:** 5/10 currently (inconsistent adoption) --> Target 9/10 (all user-facing strings translated)
- **Code Quality:** 5/10 currently (god-file pattern, `any` types) --> Target 8/10 (modular, typed, testable)
- **Security Posture:** 4/10 currently (no rate limiting, no CORS) --> Target 9/10 (defense in depth)

---

## 8. Alignment with Vision 2.0

### How Debt Remediation Enables Vision 2.0

The Vision 2.0 roadmap describes a four-phase transformation:

1. **Foundation & Design System** -- Requires clean CSS architecture (blocked by non-functional dark toggle, dead CSS), modular components (blocked by god-files), and code splitting (blocked by monolithic imports).

2. **Core Loop Implementation** -- The "PLAY, SYNC, SEE STATUS, SEE PUSH, GET 1 ACTION, BACK TO GAME" loop requires Push Analysis to work (currently broken), fast page transitions (blocked by no code splitting), and reliable data sync (untested).

3. **Secondary Modules** -- Deck Lab redesign requires decomposing the 1,397-line decks.tsx. Training redesign requires accessible, keyboard-navigable cards. Community features require XSS protection.

4. **Polish & Verification** -- E2E testing of the complete loop requires test infrastructure that does not exist today. The onboarding redesign requires ErrorBoundary coverage to prevent new-user crashes.

### Features Directly BLOCKED by Current Debt

| Vision 2.0 Feature | Blocking Debt Item(s) | Resolution Phase |
|--------------------|----------------------|:----------------:|
| Push page redesign | TD-004 (route unreachable) | Phase 1 |
| New design system rollout | TD-020 (dead dark toggle), TD-044 (dead CSS) | Phase 1 |
| International launch | TD-009 (auth), TD-010 (stats), TD-011 (goals) | Phase 1 + 3 |
| AI Coach enhancements | TD-005 (no rate limiting), TD-018 (no timeouts) | Phase 1 + 2 |
| Profile hub ("Me" page) | TD-003 (1,931-line god-file), TD-010 (27+ hardcoded strings) | Phase 3 |
| Deck Lab redesign | TD-002 (1,397-line god-file) | Phase 3 |
| E2E loop verification | TD-008 (zero frontend tests) | Phase 2 + 5 |
| Real-time sync status | TD-057 (no structured logging for debugging) | Phase 2 |

### Recommended Sequencing: Debt First, Then Features

```
RECOMMENDED:
  Phase 1-2 (debt) --> Phase 3 (debt) --> Vision 2.0 Phase 1 (features)
                                     \--> interleave with Vision 2.0 Phase 2-4

NOT RECOMMENDED:
  Vision 2.0 immediately --> debt accumulates further --> rework required
```

**The optimal path** is to complete Phases 1-3 of debt remediation (approximately 7 weeks), which addresses all CRITICAL and HIGH items and brings the health score to 7.5. At that point, Vision 2.0 feature development can begin in parallel with Phases 4-5 of debt remediation.

Starting Vision 2.0 features before Phase 2 (the structural split) would mean building new features on a 3,874-line monolithic file with zero tests -- virtually guaranteeing that the new code introduces regressions and that the debt remediation becomes significantly more expensive later.

---

## 9. Appendix

### 9.1 Complete Debt Inventory (62 Items)

| ID | Title | Severity | Category | Effort |
|----|-------|:--------:|----------|:------:|
| TD-001 | `routes.ts` god-file (3,874 lines) | CRITICAL | Architecture | XL |
| TD-002 | `decks.tsx` god-file (1,397 lines) | CRITICAL | Frontend | L |
| TD-003 | `me.tsx` god-file (1,931 lines) | CRITICAL | Frontend | XL |
| TD-004 | `/push` route unreachable (404) | CRITICAL | Frontend | S |
| TD-005 | No rate limiting on any endpoint | CRITICAL | Security | M |
| TD-006 | No CORS configuration | CRITICAL | Security | S |
| TD-007 | Zero API route integration tests | CRITICAL | Testing | XL |
| TD-008 | Zero frontend test coverage | CRITICAL | Testing | XL |
| TD-009 | `auth.tsx` fully hardcoded in Portuguese | CRITICAL | i18n | S |
| TD-012 | Notification settings duplication | CRITICAL | Database | XL |
| TD-013 | No automatic `updated_at` trigger | CRITICAL | Database | S |
| TD-010 | `me.tsx` 27+ hardcoded Portuguese strings | HIGH | i18n | M |
| TD-011 | `goals.tsx` uses 46 `isPt` ternaries | HIGH | i18n | M |
| TD-014 | Missing indexes on time-filtered queries | HIGH | Database | S |
| TD-015 | `subscriptions.user_id` not unique | HIGH | Database | L |
| TD-016 | Dual toast notification systems | HIGH | Frontend | M |
| TD-017 | Login redirects to onboarding for returning users | HIGH | Frontend | S |
| TD-018 | No request timeouts on external API calls | HIGH | Architecture | M |
| TD-019 | No database connection pool configuration | HIGH | Architecture | S |
| TD-020 | Dark mode toggle is non-functional | HIGH | Frontend | S |
| TD-021 | Route auth guard duplication | HIGH | Frontend | M |
| TD-022 | No database migration versioning | HIGH | Database | M |
| TD-034 | `not-found.tsx` uses invisible text colors | HIGH | Frontend | S |
| TD-023 | `settings.tsx` oversized (763 lines) | MEDIUM | Frontend | M |
| TD-024 | No route-based code splitting | MEDIUM | Frontend | M |
| TD-025 | `bootstrapUserData()` code duplication | MEDIUM | Architecture | S |
| TD-026 | No enum/CHECK constraints at database level | MEDIUM | Database | S |
| TD-027 | Tables grow unbounded (no retention policy) | MEDIUM | Database | M |
| TD-028 | Meta decks refresh blocks user requests | MEDIUM | Architecture | M |
| TD-029 | Excessive `as any` type casting | MEDIUM | Frontend | L |
| TD-031 | Hooks use hardcoded Portuguese toasts | MEDIUM | i18n | S |
| TD-032 | N+1 queries in authentication endpoint | MEDIUM | Database | M |
| TD-033 | Favorite players data becomes stale | MEDIUM | Database | M |
| TD-035 | Server-side hardcoded Portuguese notifications | MEDIUM | i18n | M |
| TD-037 | Duplicated formatting utility functions | MEDIUM | Frontend | S |
| TD-038 | No screen reader announcements for dynamic content | MEDIUM | Accessibility | M |
| TD-051 | Per-query database transaction overhead | MEDIUM | Database | L |
| TD-054 | Keyboard-inaccessible interactive cards | MEDIUM | Accessibility | M |
| TD-055 | Inconsistent error recovery across pages | MEDIUM | Frontend | M |
| TD-057 | No structured logging framework | MEDIUM | DevOps | M |
| TD-059 | No XSS protection on text fields | MEDIUM | Security | M |
| TD-060 | Stripe webhook signature verification unclear | MEDIUM | Security | S-M |
| TD-030 | `framer-motion` dependency unused | LOW | Frontend | S |
| TD-036 | Timestamp columns without timezone | LOW | Database | S-M |
| TD-039 | Dead duplicate files | LOW | Frontend | S |
| TD-040 | ~30 unused UI components | LOW | Frontend | M |
| TD-041 | Legacy `clash_tag` column | LOW | Database | S |
| TD-042 | No image optimization pipeline | LOW | Frontend | S |
| TD-043 | No skip navigation link | LOW | Accessibility | S |
| TD-044 | Page transition CSS defined but unused | LOW | Frontend | S |
| TD-045 | Copyright says 2025 | LOW | Frontend | S |
| TD-046 | Sidebar avatar uses hardcoded placeholder | LOW | Frontend | S |
| TD-047 | `push.tsx` has Portuguese-only strings | LOW | i18n | S |
| TD-048 | Index naming convention inconsistency | LOW | Database | S |
| TD-049 | Dead Replit connector script | LOW | DevOps | S |
| TD-050 | `useIsMobile` returns false initially | LOW | Frontend | S |
| TD-052 | `push_analyses` lacks retention policy | LOW | Database | S |
| TD-053 | `battle_history.created_at` is nullable | LOW | Database | S |
| TD-056 | Charts not screen-reader accessible | LOW | Accessibility | M |
| TD-058 | No health check endpoint | LOW | DevOps | S |
| TD-061 | WebSocket dependency unused | LOW | DevOps | S |
| TD-062 | Hardcoded free tier limits (magic numbers) | LOW | Architecture | S |

**Effort Key:** S = < 2 hours | M = 2-8 hours | L = 1-3 days | XL = 3+ days

### 9.2 Glossary

| Term | Meaning |
|------|---------|
| **God-file** | A single file that has grown to contain far too much functionality, making it difficult to understand, test, or modify safely. Like a filing cabinet where every document in the company is stored in one drawer. |
| **i18n** | Internationalization -- the ability for the application to display content in multiple languages. CRStats supports Portuguese and English. |
| **Rate limiting** | A safeguard that limits how many requests a user can make per minute, preventing abuse and protecting paid API costs. |
| **CORS** | Cross-Origin Resource Sharing -- a security mechanism that controls which websites can interact with the API. Without it, any website could make requests to CRStats's backend. |
| **Race condition** | A timing bug where two simultaneous operations interfere with each other, producing incorrect results. Like two cashiers simultaneously processing the same transaction. |
| **XSS (Cross-Site Scripting)** | A security vulnerability where an attacker injects malicious code through text fields that is later executed in other users' browsers. |
| **Code splitting** | Loading only the code needed for the current page instead of the entire application upfront. Reduces initial page load time. |
| **E2E tests** | End-to-end tests that simulate real user interactions (clicking buttons, filling forms) to verify the entire application works correctly. |
| **Migration versioning** | Tracking every change to the database structure in numbered files, allowing changes to be applied, verified, and rolled back safely. |
| **SaaS** | Software as a Service -- a subscription-based software delivery model. CRStats uses a freemium SaaS model with free and PRO tiers. |
| **Webhook** | An automated message sent from one service to another when an event occurs (e.g., Stripe sends a webhook to CRStats when a payment is processed). |
| **Connection pool** | A set of pre-opened database connections shared across requests. Without proper limits, the pool can be exhausted under load, causing all requests to fail. |
| **Toast notification** | A brief message that appears on screen (usually in a corner) to confirm an action or report an error. Named after the way bread pops up from a toaster. |

---

*Report generated by @analyst for Brownfield Discovery Phase 9.*
*Source: Technical Debt Assessment (FINAL) -- Phase 8, authored by @architect.*
*Next step: Phase 10 (@pm) -- Create remediation epic with stories mapped to the 5-phase roadmap.*
