# Epic 1: CRStats Technical Debt Remediation

## Overview

CRStats is a Clash Royale player analytics and coaching SaaS in early-production stage. While core flows (auth, player sync, billing, dashboard) are functional with real data and real API integrations, an independent Brownfield Discovery assessment identified **62 structural debt items** accumulated during rapid prototyping that now threaten the product's ability to grow safely.

### Business Justification

1. **Security Exposure:** All 46 API endpoints are unprotected -- no rate limiting, no CORS. AI coaching endpoints can be abused for OpenAI cost amplification ($500+/hour at scale).
2. **International Growth Blocked:** The sign-up page is 100% Portuguese with zero translation support. The Clash Royale player base is predominantly English-speaking.
3. **Revenue at Risk:** The billing system has a race condition where simultaneous payment events create duplicate subscription records.
4. **Compounding Debt:** Every new user increases data corruption risk (notification duplication, subscription race condition). Every new feature is slower to build on a 3,874-line monolithic API file.

### Health Score Target

```
Current:       5.0 / 10
After Phase 1: 5.9 / 10  (security baseline, broken features restored)
After Phase 2: 6.6 / 10  (maintainable architecture, test infrastructure)
After Phase 3: 7.5 / 10  (data integrity secured, full i18n, frontend decomposed)
After Phase 4: 7.8 / 10  (performance optimized, error handling hardened)
After Phase 5: 8.4 / 10  (comprehensive tests, accessibility, clean codebase)
```

### Source Documents

- Technical Debt Assessment (FINAL): `docs/prd/technical-debt-assessment.md` (62 items, Phase 8)
- Executive Report: `docs/reports/TECHNICAL-DEBT-REPORT.md` (Phase 9)

---

## Scope

### IN
- All 62 TD items (TD-001 through TD-062) organized into 12 development-ready stories
- Security hardening (rate limiting, CORS, XSS protection, Stripe verification)
- Backend architecture refactor (routes.ts split, service layer extraction)
- Frontend decomposition (me.tsx, decks.tsx, settings.tsx god-files)
- Complete i18n coverage across all pages, hooks, and server-side notifications
- Database integrity fixes (notification consolidation, subscription unique constraint, CHECK constraints, updated_at trigger)
- Test infrastructure and comprehensive coverage (API integration, E2E, frontend)
- Accessibility compliance pass (WCAG 2.1 basics)
- Performance optimization (code splitting, data retention, query optimization)
- Codebase cleanup (dead files, unused dependencies, dead CSS)

### OUT
- Vision 2.0 features (new design system, Push redesign, enhanced Coach, new Home page) -- separate epic
- New feature development beyond what is needed to fix debt
- Infrastructure migration (e.g., moving off Vercel or Supabase)
- Third language support (only EN + PT-BR are in scope)

---

## Stories

| # | Title | TD Items | Effort | Priority | Phase | Dependencies |
|---|-------|----------|--------|----------|-------|-------------|
| 1.1 | Critical Fixes & Quick Wins | TD-004, TD-005 (global), TD-006, TD-009, TD-013, TD-014, TD-019, TD-020, TD-030, TD-034, TD-039, TD-045, TD-046, TD-049, TD-050, TD-061 | ~4-5 days | P0 | 1 | None |
| 1.2 | Split routes.ts God-File into Domain Modules | TD-001 | ~3-5 days | P0 | 2 | Story 1.1 |
| 1.3 | Infrastructure: Migrations, Logging, Timeouts & Code Quality | TD-018, TD-022, TD-025, TD-037, TD-057, TD-062 | ~4-5 days | P1 | 2 | Story 1.1 |
| 1.4 | Frontend Routing Refactor & E2E Test Foundation | TD-005 (per-route), TD-008, TD-021 | ~3-5 days | P1 | 2 | Story 1.1, Story 1.2 (for per-route rate limits) |
| 1.5 | Database Integrity: Subscriptions, Notifications & Constraints | TD-012, TD-015, TD-016, TD-026 | ~5-8 days | P0 | 3A | Story 1.3 (TD-022, TD-025) |
| 1.6 | Decompose me.tsx & Complete Stats Page i18n | TD-003, TD-010 | ~3-5 days | P1 | 3B | None |
| 1.7 | Decompose decks.tsx into Feature Modules | TD-002 | ~1-3 days | P1 | 3B | None |
| 1.8 | Complete i18n Coverage Sweep | TD-011, TD-031, TD-035, TD-047 | ~2-4 days | P1 | 3C | Story 1.2 (TD-035 server i18n), Story 1.5 (TD-016 toast unification) |
| 1.9 | Performance & Data Optimization | TD-027, TD-028, TD-032, TD-033, TD-051, TD-052 | ~4-7 days | P2 | 4 | Story 1.2 (TD-051 benefits from route split) |
| 1.10 | Frontend Hardening: Settings, Code Split, Error Recovery & Security | TD-023, TD-024, TD-029, TD-055, TD-059, TD-060 | ~5-8 days | P2 | 4 | Story 1.4 (TD-021 for code split + ErrorBoundary) |
| 1.11 | Comprehensive API Integration Tests | TD-007, TD-017 | ~3-5 days | P2 | 5 | Story 1.2 (route split enables isolated testing) |
| 1.12 | Accessibility, Cleanup & Polish | TD-036, TD-038, TD-040, TD-041, TD-042, TD-043, TD-044, TD-048, TD-053, TD-054, TD-056, TD-058 | ~5-8 days | P3 | 5 | Story 1.3 (TD-022 for DB items) |

**Total: 12 stories covering all 62 TD items**
**Estimated total effort: 56-90 days (~10-12 weeks)**

---

## Dependency Graph

```
Story 1.1 (Critical Fixes & Quick Wins) ──────────────────────────────
    │
    ├──> Story 1.2 (Split routes.ts) ─────────────────────────────────
    │       │
    │       ├──> Story 1.4 (Frontend Routing + E2E + per-route limits)
    │       ├──> Story 1.8 (i18n Sweep -- server-side notifications)
    │       ├──> Story 1.9 (Performance -- benefits from route split)
    │       └──> Story 1.11 (API Integration Tests)
    │
    ├──> Story 1.3 (Infrastructure: Migrations, Logging, etc.) ──────
    │       │
    │       └──> Story 1.5 (DB Integrity -- needs migrations + bootstrap)
    │               │
    │               └──> Story 1.8 (i18n Sweep -- needs toast unification)
    │
    ├──> Story 1.6 (me.tsx Decomposition) ─── [independent]
    ├──> Story 1.7 (decks.tsx Decomposition) ─ [independent]
    │
    ├──> Story 1.4 ──> Story 1.10 (Frontend Hardening -- needs PrivateRoute)
    │
    ├──> Story 1.9 (Performance) ── [after Story 1.2]
    │
    └──> Story 1.12 (Accessibility, Cleanup & Polish) ── [after Story 1.3 for DB items]
```

### Parallelization Opportunities

- Stories 1.6 and 1.7 (frontend decomposition) can run **in parallel** with Stories 1.2 and 1.3 (backend work)
- Story 1.12 can be worked on incrementally, interleaved with other stories
- Stories 1.9 and 1.10 can run in parallel once their dependencies are met

---

## Success Criteria

- [ ] Health score >= 8.0 / 10
- [ ] Zero CRITICAL items remaining (all 11 resolved)
- [ ] Zero HIGH items remaining (all 12 resolved)
- [ ] Test coverage: >= 70% of critical paths (auth, billing, sync, coach)
- [ ] i18n compliance: 100% of user-facing strings use `t()` system
- [ ] No file exceeds 500 lines
- [ ] All database schema changes versioned via migration system
- [ ] Rate limiting active on all endpoints (global + per-route for AI endpoints)
- [ ] CORS configured for production domain
- [ ] Push Analysis feature fully accessible via navigation

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|:-----------:|:------:|-----------|
| TD-012 notification consolidation corrupts production data | MEDIUM | CRITICAL | Full database backup before migration. Test on staging first. PITR enabled on Supabase. |
| TD-001 route split introduces regressions (3,874 lines, zero tests) | HIGH | HIGH | Add smoke tests for critical endpoints before splitting. Test each module independently after extraction. |
| TD-015 subscription cleanup deletes valid records | MEDIUM | HIGH | Manual review of cleanup query results before applying. Keep-highest-plan selection logic. |
| Frontend decomposition breaks existing pages | MEDIUM | MEDIUM | Visual regression testing. Keep existing tests passing throughout. |
| Phase 2-3 timeline slips, delaying Vision 2.0 | MEDIUM | MEDIUM | Phase 1 delivers immediate value. Phase 2+ can be parallelized with Vision 2.0 planning. |
| Database migration on production causes downtime | LOW | HIGH | Use Supabase PITR. Apply migrations during low-traffic windows. Dual-track migration approach. |

---

## Timeline

| Phase | Weeks | Stories | Key Outcome |
|-------|:-----:|---------|------------|
| Phase 1 | 1-2 | 1.1 | Security baseline, broken features restored, 16 quick wins |
| Phase 2 | 2-4 | 1.2, 1.3, 1.4 | Maintainable backend, test infrastructure, safe migrations |
| Phase 3 | 4-7 | 1.5, 1.6, 1.7, 1.8 | Data integrity secured, full i18n, frontend decomposed |
| Phase 4 | 7-9 | 1.9, 1.10 | Performance optimized, frontend hardened |
| Phase 5 | 9-12+ | 1.11, 1.12 | Comprehensive tests, accessibility, clean codebase |

**Decision gates:** After Phase 1 (review health score improvement) and after Phase 3 (minimum viable point for Vision 2.0 feature development).

---

*Epic created by @pm (Morgan) -- Brownfield Discovery Phase 10*
*Source: Technical Debt Assessment (FINAL) -- 62 items across 8 categories*
*Date: 2026-02-27*
