# CRStats -- QA Gate Review (Brownfield Discovery Phase 7)

**Agent:** @qa
**Date:** 2026-02-27
**Status:** COMPLETE
**Reviewing:** `docs/prd/technical-debt-DRAFT.md` (Phase 4, @architect)
**Cross-references:**
- `docs/reviews/db-specialist-review.md` (Phase 5, @data-engineer)
- `docs/reviews/ux-specialist-review.md` (Phase 6, @ux-design-expert)
- `docs/architecture/system-architecture.md` (Phase 1, @architect)
- `docs/architecture/DB-AUDIT.md` (Phase 2, @data-engineer)
- `docs/frontend/frontend-spec.md` (Phase 3, @ux-design-expert)

---

## 1. QA Gate Summary

### Documents Reviewed

| Document | Phase | Agent | Lines | Status |
|----------|:-----:|-------|------:|--------|
| `technical-debt-DRAFT.md` | 4 | @architect | ~1,150 | Under review |
| `db-specialist-review.md` | 5 | @data-engineer | ~483 | VALIDATED WITH CHANGES |
| `ux-specialist-review.md` | 6 | @ux-design-expert | ~681 | VALIDATED WITH CHANGES |
| `system-architecture.md` | 1 | @architect | ~860 | Source document |
| `DB-AUDIT.md` | 2 | @data-engineer | ~405 | Source document |
| `frontend-spec.md` | 3 | @ux-design-expert | ~834 | Source document |

### Debt Item Count

| Source | Count |
|--------|------:|
| DRAFT (original) | 50 |
| New items from @data-engineer (Phase 5) | +3 (TD-051, TD-052, TD-053) |
| New items from @ux-design-expert (Phase 6) | +3 (TD-051, TD-052, TD-053) |
| **Total after reconciliation** | **56** |

**Note:** Both specialist reviews suggest new items starting at TD-051, creating ID collisions. See Section 3 for resolution.

### Specialist Review Verdicts

| Specialist | Verdict | Severity Upgrades | Severity Downgrades | New Items | Factual Corrections |
|-----------|---------|:-----------------:|:-------------------:|:---------:|:-------------------:|
| @data-engineer | VALIDATED WITH CHANGES | 2 (TD-012, TD-013) | 1 (TD-036) | 3 | 1 (TD-032) |
| @ux-design-expert | VALIDATED WITH CHANGES | 2 (TD-009, TD-034) | 0 | 3 | 4 (TD-011, TD-029, TD-031, TD-047) |

### Overall QA Assessment

The Technical Debt DRAFT is a comprehensive, well-structured document that demonstrates strong cross-referencing to all three source documents. The @architect produced a thorough consolidation of 50 items with a credible remediation roadmap. Both specialist reviews confirm the technical accuracy of item descriptions, with corrections that are incremental rather than structural. The document is fundamentally sound and suitable for finalization after incorporating the changes identified in this review.

---

## 2. Completeness Check

### Phase 1 (system-architecture.md) Coverage

All weaknesses identified in the Phase 1 system architecture document were cross-checked against the DRAFT.

| Architecture Finding | DRAFT Coverage | Status |
|---------------------|----------------|--------|
| W-01: `routes.ts` god-file (3,874 lines) | TD-001 | COVERED |
| W-02: No service layer | TD-001 (combined) | COVERED |
| W-03: No rate limiting | TD-005 | COVERED |
| W-04: No CORS configuration | TD-006 | COVERED |
| W-05: Duplicated bootstrap logic | TD-025 | COVERED |
| W-06: No request timeout | TD-018 | COVERED |
| W-07: Stripe webhook signature unclear | -- | GAP (see below) |
| W-08: No database connection pool limits | TD-019 | COVERED |
| W-09: Meta decks refresh in request path | TD-028 | COVERED |
| W-10: `any` type proliferation | TD-029 | COVERED |
| W-11: No test infrastructure for routes | TD-007 | COVERED |
| W-12: Duplicate page files | TD-039 | COVERED |
| W-13: No API versioning | -- | GAP (see below) |
| W-14: Hardcoded free tier limits | -- | GAP (see below) |
| W-15: No logging framework | -- | GAP (see below) |
| W-16: No health check endpoint | -- | GAP (see below) |
| W-17: WebSocket dependency unused | -- | GAP (see below) |
| W-18: Client API methods use `any` | TD-029 (combined) | COVERED |
| Security: Path parameter validation weak | -- | GAP (see below) |
| Security: No XSS protection on text fields | -- | GAP (see below) |

**Phase 1 Gaps (findings NOT captured in DRAFT):**

| # | Finding | Arch ID | Proposed Severity | Assessment |
|---|---------|---------|:-----------------:|------------|
| G1 | No API versioning | W-13 | LOW | Acceptable omission. API versioning is a future concern, not active debt. The current project has a single consumer (the SPA). |
| G2 | Hardcoded free tier limits (magic numbers) | W-14 | LOW | Should be captured. `FREE_DAILY_LIMIT = 5` and `FREE_DECK_SUGGESTION_DAILY_LIMIT = 2` as magic numbers in `routes.ts` lines 42-43 is a maintainability concern. Minor, but worth tracking. |
| G3 | No logging framework | W-15 | MEDIUM | **Should be captured.** Using `console.log/error/info/warn` directly with no structured logging, no log levels, and no correlation beyond requestId is a significant operational gap. This becomes critical for debugging production issues. |
| G4 | No health check endpoint | W-16 | LOW | Should be captured. Missing `/api/health` prevents monitoring tools and uptime checks from verifying the application is responsive. |
| G5 | WebSocket dependency unused | W-17 | LOW | Should be captured alongside TD-030 (framer-motion unused) and TD-049 (dead Replit script) as part of dead dependency cleanup. |
| G6 | Stripe webhook signature verification unclear | W-07 | MEDIUM | The architecture assessment flags this as "ASSUMED." The DRAFT does not address it. This should at minimum be verified and documented -- if verification is missing, it is a CRITICAL security issue. If it exists, a brief note confirming it would be sufficient. |
| G7 | Weak path parameter validation | Sec.13 | LOW | `:tag` and `:id` path parameters are not validated before use. Minor, but a defense-in-depth gap. |
| G8 | No XSS protection on text fields | Sec.13 | MEDIUM | Input sanitization is described as "PARTIAL" -- tags are sanitized but text fields (coach messages, goal descriptions, display names) have no general XSS protection. This is worth tracking. |

**Verdict:** 12 of 20 Phase 1 findings are covered by explicit TD items. Of the 8 gaps, G3 (no logging framework) and G8 (no XSS protection) are the most significant omissions. The others are LOW severity and can be deferred. **MUST-FIX: Add G3 and G6 to the DRAFT. SHOULD-FIX: Add G2, G4, G5, G8.**

### Phase 2 (DB-AUDIT.md) Coverage

| DB Audit Finding | DRAFT Coverage | Status |
|-----------------|----------------|--------|
| C1: Notification settings duplication | TD-012 | COVERED |
| C2: No `updated_at` trigger | TD-013 | COVERED |
| H1: Missing indexes on time-filtered queries | TD-014 | COVERED |
| H2: `subscriptions.user_id` not unique | TD-015 | COVERED |
| H3: No enum/CHECK constraints | TD-026 | COVERED |
| H4: Unbounded table growth | TD-027 | COVERED |
| M1: Bootstrap code duplication | TD-025 | COVERED |
| M2: No migration versioning | TD-022 | COVERED |
| M3: `favorite_players` staleness | TD-033 | COVERED |
| M4: `meta_decks_cache` limited to 50 rows | -- | ACCEPTABLE (minor concern) |
| M5: N+1 queries in auth | TD-032 | COVERED |
| M6: Timestamp without timezone | TD-036 | COVERED |
| L1: Legacy `clash_tag` column | TD-041 | COVERED |
| L2: Dead Replit script | TD-049 | COVERED |
| L3: Index naming inconsistency | TD-048 | COVERED |
| L4: `any` types in battle history | TD-029 (combined) | COVERED |
| Section 7.2: `runAsUser` per-query overhead | -- | GAP (flagged by Phase 5) |
| Section 5.3: `push_analyses` retention | -- | GAP (flagged by Phase 5) |
| Section 3.3: `battle_history.created_at` nullable | -- | GAP (flagged by Phase 5) |

**Verdict:** 15 of 18 Phase 2 findings are covered. The 3 gaps were all correctly identified by the @data-engineer in the Phase 5 review as new items (TD-051/052/053 in their numbering). **Coverage is adequate after incorporating Phase 5 additions.**

### Phase 3 (frontend-spec.md) Coverage

| Frontend Spec Finding | DRAFT Coverage | Status |
|----------------------|----------------|--------|
| C1: `me.tsx` god-file | TD-003 | COVERED |
| C2: `decks.tsx` god-file | TD-002 | COVERED |
| C3: `/push` route unreachable | TD-004 | COVERED |
| C4: `auth.tsx` hardcoded Portuguese | TD-009 | COVERED |
| H1: `goals.tsx` `isPt` ternaries | TD-011 | COVERED |
| H2: Dual toast systems | TD-016 | COVERED |
| H3: Login redirect to onboarding | TD-017 | COVERED |
| H4: No code splitting | TD-024 | COVERED |
| H5: Dark mode toggle non-functional | TD-020 | COVERED |
| H6: Route auth guard duplication | TD-021 | COVERED |
| H7: `goals 2.tsx` dead file | TD-039 | COVERED |
| M1: Excessive `as any` | TD-029 | COVERED |
| M2: `framer-motion` unused | TD-030 | COVERED |
| M3: Hook hardcoded Portuguese toasts | TD-031 | COVERED |
| M4: `not-found.tsx` light background | TD-034 | COVERED |
| M5: No `aria-live` regions | TD-038 | COVERED |
| M6: `settings.tsx` at 763 lines | TD-023 | COVERED |
| M7: Duplicated formatters | TD-037 | COVERED |
| M8: Sidebar comment clutter | -- | ACCEPTABLE (trivial) |
| L1: ~30 unused shadcn components | TD-040 | COVERED |
| L2: No image optimization | TD-042 | COVERED |
| L3: No skip navigation link | TD-043 | COVERED |
| L4: Page transition CSS unused | TD-044 | COVERED |
| L5: Copyright 2025 | TD-045 | COVERED |
| L6: Sidebar avatar placeholder | TD-046 | COVERED |
| L7: `push.tsx` Portuguese strings | TD-047 | COVERED |
| L8: `useIsMobile` initial false | TD-050 | COVERED |
| Section 10.2: Keyboard-inaccessible cards | -- | GAP (flagged by Phase 6) |
| Section 6.2: ErrorBoundary inconsistency | -- | GAP (flagged by Phase 6) |
| Section 10.4: Recharts not accessible | -- | GAP (flagged by Phase 6) |

**Verdict:** 27 of 30 Phase 3 findings are covered. The 3 gaps were correctly identified by the @ux-design-expert in the Phase 6 review as new items (TD-051/052/053 in their numbering). **Coverage is adequate after incorporating Phase 6 additions.**

### Completeness Summary

| Source Document | Total Findings | Covered in DRAFT | Gaps | Gap Severity |
|----------------|:--------------:|:----------------:|:----:|:-------------|
| Phase 1 (Architecture) | 20 | 12 | 8 | 2 MEDIUM, 6 LOW |
| Phase 2 (DB Audit) | 18 | 15 | 3 | All caught by Phase 5 |
| Phase 3 (Frontend) | 30 | 27 | 3 | All caught by Phase 6 |
| **TOTAL** | **68** | **54** | **14** | 8 caught by specialists |

After incorporating specialist reviews, **6 Phase 1 gaps remain uncaptured** (G1-G5, G7 are LOW; G3, G6, G8 are MEDIUM). This is the primary completeness finding.

---

## 3. Specialist Review Reconciliation

### @data-engineer (Phase 5) Changes Requested

**Severity Changes:**

| TD-ID | DRAFT | Requested | Justification | QA Assessment |
|-------|:-----:|:---------:|---------------|---------------|
| TD-012 | HIGH | CRITICAL | Active dual-table consistency hazard with `settingsUpdateInputSchema` accepting conflicting values across both tables | **AGREE.** The evidence is concrete: `isNotificationAllowed()` implements a fallback chain that can return different results depending on which table was updated last. This is not theoretical. **Upgrade to CRITICAL.** |
| TD-013 | HIGH | CRITICAL | 14 manual `updatedAt: new Date()` calls with no trigger safety net; clock skew between serverless and PostgreSQL is real | **AGREE.** The data-engineer verified all 14 instances. The risk compounds with every new update path added to the codebase. **Upgrade to CRITICAL.** |
| TD-036 | MEDIUM | LOW | UTC-only environment with Supabase defaults makes timezone bugs theoretical, not practical | **AGREE.** The risk is real only if the deployment changes to a non-UTC environment, which is unlikely for Supabase. **Downgrade to LOW.** |

**Effort Re-estimates:**

| TD-ID | DRAFT | Requested | QA Assessment |
|-------|:-----:|:---------:|---------------|
| TD-012 | L (1-3 days) | XL (2-4 days) | **AGREE.** 7 change points across 4 files plus production data migration justifies the increase. |
| TD-015 | M (2-8h) | L (1-2 days) | **AGREE.** Production data cleanup (orphan subscription rows) is the bottleneck. |

**Factual Corrections:**

| TD-ID | Issue | QA Assessment |
|-------|-------|---------------|
| TD-032 | Description says "5 queries per auth request" but this only applies when `bootstrapUserData()` is NOT called; when bootstrap runs, it already returns all 4 entities | **AGREE.** Clarify the two code paths in the description. |

**New Items Proposed:**

| Proposed ID | Description | Severity | QA Assessment |
|-------------|-------------|:--------:|---------------|
| TD-051 | `runAsUser` per-query transaction overhead (DB-AUDIT 7.2) | MEDIUM | **AGREE.** Valid finding omitted from DRAFT. Add to inventory. |
| TD-052 | `push_analyses` lacks explicit retention policy | LOW | **AGREE.** Can be rolled into TD-027 implementation notes rather than a standalone item, but documenting it is correct. |
| TD-053 | `battle_history.created_at` is nullable when it should be NOT NULL | LOW | **AGREE.** Simple constraint addition. |

**Roadmap Changes:**

| Change | QA Assessment |
|--------|---------------|
| Move TD-012 and TD-015 earlier in the roadmap (before i18n, Phase 3 instead of Phase 4) | **AGREE.** Data integrity issues compound with every new user. They should take precedence over i18n cosmetic fixes. See Section 7 for adjusted phasing recommendation. |
| TD-025 should be explicit prerequisite for TD-012 | **AGREE.** Refactoring bootstrap before notification consolidation reduces change surface. |
| Dual-track migration strategy (Drizzle + SQL scripts) should be documented | **AGREE.** Advisory change -- add to roadmap preamble. |

---

### @ux-design-expert (Phase 6) Changes Requested

**Severity Changes:**

| TD-ID | DRAFT | Requested | Justification | QA Assessment |
|-------|:-----:|:---------:|---------------|---------------|
| TD-009 | HIGH | CRITICAL | Auth page is the first interaction for 100% of new users; 18 hardcoded Portuguese strings (not ~15) make the entry point unusable for international users | **AGREE.** The auth page is the absolute first-touch surface. A Portuguese-only page at the entry point is a conversion blocker for the documented English-speaking audience. **Upgrade to CRITICAL.** |
| TD-034 | MEDIUM | HIGH | The 404 page has invisible text (`text-gray-900` on dark background), not just a wrong background color. Combined with TD-004 (`/push` missing), ALL Push users see an unreadable page | **AGREE.** The UX specialist correctly identified TWO additional broken classes (`text-gray-900`, `text-gray-600`) missed by the DRAFT. The page is functionally unreadable, not merely inconsistent. **Upgrade to HIGH.** |

**Effort Re-estimates:**

| TD-ID | DRAFT | Requested | QA Assessment |
|-------|:-----:|:---------:|---------------|
| TD-009 | M (2-8h) | S (< 2h) | **AGREE.** 169-line file with ~18 string replacements. The import of `useLocale()` and the key additions are straightforward. |
| TD-017 | M (2-8h) | S (< 2h) | **AGREE.** The fix is a ~15-20 line change in a single file (auth.tsx login handler). |

**Factual Corrections:**

| TD-ID | Issue | QA Assessment |
|-------|-------|---------------|
| TD-011 | Count is 46 `isPt` ternaries, not 43 | **AGREE.** Minor but should be corrected for accuracy. |
| TD-029 | Frontend `as any` count is 27 across 9 files, not 50+. The 50+ includes server-side code. | **AGREE.** Clarify that 50+ is full-stack; 27 is frontend-only. |
| TD-031 | Hook toast count is 14 hardcoded Portuguese strings, not ~10 | **AGREE.** Correct for accuracy. |
| TD-047 | Count is 3 Portuguese + 1 English string, not ~5 | **AGREE.** Minor correction. |

**New Items Proposed:**

| Proposed ID | Description | Severity | QA Assessment |
|-------------|-------------|:--------:|---------------|
| TD-051 | Keyboard-inaccessible clickable cards in training.tsx | MEDIUM | **AGREE.** WCAG 2.1 SC 2.1.1 violation. Valid a11y finding. |
| TD-052 | ErrorBoundary inconsistency across routes | MEDIUM | **AGREE.** Decks, community, settings, and onboarding lack ErrorBoundary. Particularly concerning for onboarding (new user crash = permanent block). |
| TD-053 | Recharts not screen-reader accessible | LOW | **AGREE.** Charts are core to the analytics value proposition. |

**Roadmap Changes:**

| Change | QA Assessment |
|--------|---------------|
| Move TD-009 to Phase 1 (was Phase 3) | **AGREE.** With effort re-estimated to S (< 2h), this is a high-impact quick win. |
| Move TD-020 to Phase 1 (removing toggle is a 10-minute fix) | **AGREE.** Removing the non-functional toggle is trivially small and improves perceived quality. |

---

### ID Collision Resolution

Both specialist reviews propose new items starting at TD-051. This creates naming conflicts that must be resolved before finalization.

**Collisions:**

| ID | @data-engineer Proposes | @ux-design-expert Proposes |
|----|------------------------|---------------------------|
| TD-051 | `runAsUser` per-query transaction overhead | Keyboard-inaccessible clickable cards |
| TD-052 | `push_analyses` retention policy | ErrorBoundary inconsistency |
| TD-053 | `battle_history.created_at` nullable | Recharts not accessible |

**Recommended Renumbering:**

| Original ID | New ID | Item | Source |
|-------------|--------|------|--------|
| DB TD-051 | **TD-051** | `runAsUser` per-query transaction overhead | @data-engineer |
| DB TD-052 | **TD-052** | `push_analyses` retention policy | @data-engineer |
| DB TD-053 | **TD-053** | `battle_history.created_at` nullable | @data-engineer |
| UX TD-051 | **TD-054** | Keyboard-inaccessible clickable cards | @ux-design-expert |
| UX TD-052 | **TD-055** | ErrorBoundary inconsistency across routes | @ux-design-expert |
| UX TD-053 | **TD-056** | Recharts not screen-reader accessible | @ux-design-expert |

**Rationale:** Database items receive the lower IDs because database integrity is foundational. Frontend/UX items receive higher IDs. This also preserves the @data-engineer review's internal references.

Additionally, the Phase 1 gaps identified in this QA review should receive IDs TD-057 through TD-062 (see Section 9).

### Conflict Analysis

**No direct conflicts exist between the two specialist reviews.** The reviews address orthogonal domains (database vs. frontend/UX) with no overlapping recommendations. The only intersection is:

- Both specialists agree that TD-032 (N+1 auth queries) needs clarification about the two code paths (bootstrap vs. non-bootstrap). No conflict in the recommendation, only in the level of detail.
- The @data-engineer recommends swapping Phase 3 (i18n) and Phase 4 (database integrity) in the roadmap. The @ux-design-expert does not object to this but recommends moving two frontend items (TD-009, TD-020) to Phase 1 regardless of overall phase ordering. These are compatible changes.

---

## 4. Dependency Validation

### Dependency Graph Correctness

I validated all dependencies declared in the DRAFT against the specialist reviews.

| Dependency | DRAFT Says | Correct? | Notes |
|-----------|-----------|:--------:|-------|
| TD-007 depends on TD-001 | Yes | CORRECT | Cannot write isolated route tests without splitting the god-file |
| TD-031 depends on TD-016 | Yes | CORRECT | Hook toast migration requires unified toast system |
| TD-003 + TD-010 together | Yes | CORRECT | i18n migration should happen during decomposition |
| TD-015 depends on TD-022 (soft) | Yes | CORRECT | Data cleanup migration benefits from versioned migrations |
| TD-012 depends on TD-022 | Yes | CORRECT | Schema migration requires versioning |
| TD-026 depends on TD-022 | Yes | CORRECT | CHECK constraints via versioned migration |
| TD-036 depends on TD-022 | Yes | CORRECT | Type change via versioned migration |
| TD-041 depends on TD-022 | Yes | CORRECT | Column drop via versioned migration |
| TD-048 depends on TD-022 | Yes | CORRECT | Index rename via versioned migration |
| TD-024 depends on TD-021 | Yes | CORRECT | Code splitting is cleaner with PrivateRoute wrapper |

**Missing Dependencies (from specialist reviews):**

| Dependency | Source | QA Assessment |
|-----------|--------|---------------|
| TD-012 depends on TD-025 | @data-engineer | **AGREE.** Bootstrap refactor before notification consolidation reduces change surface. Add this dependency. |
| TD-015 implicitly depends on TD-019 | @data-engineer | **AGREE.** Long-running cleanup query on unconfigured pool risks connection exhaustion. TD-019 (Phase 1) is already before TD-015 (Phase 4), so the roadmap naturally respects this. Document the dependency. |
| TD-055 (ErrorBoundary) depends on TD-021 | @ux-design-expert | **AGREE.** If PrivateRoute is implemented, ErrorBoundary wrapping should be the default behavior. |

### Circular Dependency Check

**No circular dependencies detected.** The dependency graph is a DAG (directed acyclic graph):

```
TD-022 (migrations) --> TD-012, TD-015, TD-026, TD-036, TD-041, TD-048
TD-025 (bootstrap)  --> TD-012
TD-001 (routes)     --> TD-007
TD-016 (toasts)     --> TD-031
TD-021 (PrivateRoute) --> TD-024, TD-055
TD-003 + TD-010     (co-dependent, execute together)
```

All chains terminate. No cycles.

### Execution Order Assessment

The DRAFT's 5-phase roadmap is logically sound with one significant concern:

**Concern:** Phase 3 (i18n + frontend decomposition) is scheduled before Phase 4 (database integrity), but the @data-engineer argues that data integrity issues (TD-012, TD-015) are more foundational and get worse with every new user. I **agree** with this assessment. Recommendation: interleave database integrity items into Phase 3 or swap the phases. See Section 7 for specific adjustments.

---

## 5. Risk Assessment

### Severity Level Validation (Post-Specialist Adjustments)

After incorporating all specialist severity changes, the updated distribution is:

| Severity | Original DRAFT | After Adjustments | Delta |
|----------|:-------------:|:-----------------:|:-----:|
| CRITICAL | 8 | 10 | +2 (TD-009, TD-012, TD-013 upgraded; TD-009 was HIGH) |
| HIGH | 14 | 13 | -1 (TD-012, TD-013 promoted; TD-009 promoted; TD-034 promoted from MEDIUM; net -1) |
| MEDIUM | 16 | 18 | +2 (TD-036 demoted from HIGH; 6 new items added, some MEDIUM) |
| LOW | 12 | 15 | +3 (TD-036 demoted; new LOW items TD-052, TD-053, TD-056 added) |
| **TOTAL** | **50** | **56** | **+6** |

Let me verify the adjusted counts precisely:

**CRITICAL (10):** TD-001, TD-002, TD-003, TD-004, TD-005, TD-006, TD-007, TD-008, TD-009 (upgraded), TD-012 (upgraded), TD-013 (upgraded)

Wait -- that is 11. Let me recount. The original 8 CRITICAL items are: TD-001 through TD-008. Upgrades: TD-009 (HIGH->CRITICAL), TD-012 (HIGH->CRITICAL), TD-013 (HIGH->CRITICAL). That gives 11 CRITICAL.

**Corrected adjusted counts:**

| Severity | Count | Items |
|----------|------:|-------|
| CRITICAL | 11 | TD-001 to TD-008, TD-009 (up from HIGH), TD-012 (up from HIGH), TD-013 (up from HIGH) |
| HIGH | 12 | TD-010, TD-011, TD-014, TD-015, TD-016, TD-017, TD-018, TD-019, TD-020, TD-021, TD-022, TD-034 (up from MEDIUM) |
| MEDIUM | 18 | TD-023 to TD-029, TD-031, TD-032, TD-033, TD-035, TD-037, TD-038, TD-051, TD-054, TD-055, + Phase 1 gaps G3/G6/G8 |
| LOW | 15 | TD-030, TD-034 (wait, promoted), TD-036 (down from MEDIUM), TD-039 to TD-050, TD-052, TD-053, TD-056, + Phase 1 gaps |

**QA Assessment of Severity Accuracy:**

All 4 severity changes requested by specialists are well-justified with code-level evidence. I find no items that appear mis-categorized after adjustment. The CRITICAL items genuinely block production readiness (security, broken features, data integrity). The HIGH items represent significant quality gaps but are not show-stoppers for current (small) user base.

### Are Any Items Mis-Categorized?

| Item | Current Severity | Potential Issue |
|------|:----------------:|----------------|
| TD-024 (code splitting) | MEDIUM | **Correct.** Small user base, gaming niche, fast connections. MEDIUM is appropriate. |
| TD-017 (login redirect) | HIGH | **Potentially MEDIUM.** The UX specialist clarified that the onboarding page detects existing profiles, so the friction is an extra click, not a blocker. However, the DRAFT's HIGH is defensible for the returning-user experience. **Keep HIGH.** |
| TD-028 (meta refresh in request path) | MEDIUM | **Correct.** Advisory lock mitigates thundering herd. One slow request per staleness interval is acceptable at current scale. |
| TD-035 (server-side Portuguese notifications) | MEDIUM | **Correct.** Affects billing notifications only, which is a small subset of interactions. |

### Business Risk of NOT Addressing Top Items

| Rank | Item | Risk If Unaddressed |
|:----:|------|---------------------|
| 1 | TD-005 (no rate limiting) | At scale: API cost amplification via OpenAI abuse, Clash Royale API quota exhaustion, potential service disruption. At current scale: LOW but grows linearly with visibility. |
| 2 | TD-004 + TD-034 (push feature broken + unreadable 404) | Immediate: 100% of users who click Push see a broken, unreadable page. This is a live production defect. |
| 3 | TD-012 + TD-013 (data integrity) | Every new user creates entries in BOTH notification tables. The inconsistency gap widens continuously. Every update without the trigger risks stale `updated_at` values. |
| 4 | TD-001 (routes.ts god-file) | Blocks testability. Every feature addition increases the blast radius. Developer velocity is already impacted. |
| 5 | TD-009 (auth page Portuguese-only) | Blocks international expansion. Any marketing effort targeting English speakers is wasted if the auth page is Portuguese. |

### Overall Health Score Assessment

The DRAFT reports a weighted health score of **5.0/10** (down from 5.8 in the Executive Summary -- there is an inconsistency here; see Section 9). The Executive Summary says 5.8, while the calculation in Section 6 yields 4.95, rounded to 5.0.

**QA Assessment:** The 5.0/10 score from the weighted calculation is more accurate and honest. The 5.8 in the Executive Summary appears to be a rounding artifact or earlier draft value. The DRAFT should use a single consistent number. I recommend **5.0/10** as the canonical score, which I validate as accurate given:

- Security at 4/10 and Testing at 2/10 are correctly penalized
- Database at 7/10 correctly reflects the solid RLS/FK foundation
- Frontend and Architecture at 5/10 correctly captures the god-file problem
- The weights are reasonable (Architecture and Frontend at 20% each, reflecting their equal importance)

After incorporating specialist changes (especially the CRITICAL upgrades for TD-012 and TD-013), the health score could arguably be slightly lower (4.8-4.9), but 5.0 remains a defensible round number.

---

## 6. Test Coverage Gap Analysis

### TD Items Requiring New Tests After Remediation

| TD Item | Test Type | Priority | Description |
|---------|-----------|:--------:|-------------|
| TD-001 (routes split) | Integration | P0 | Each new route module needs `supertest` integration tests. The split is the prerequisite for testable routes. |
| TD-005 (rate limiting) | Integration | P0 | Verify rate limits are enforced per endpoint tier. Test limit exceeded response (429). |
| TD-006 (CORS) | Integration | P0 | Verify allowed origins, rejected origins, preflight handling. |
| TD-012 (notification consolidation) | Unit + Integration | P1 | Verify single-source notification queries. Test migration correctness. Verify no data loss during consolidation. |
| TD-015 (subscriptions unique) | Unit + Integration | P1 | Verify `ON CONFLICT` upsert behavior. Test concurrent webhook scenario. Verify orphan cleanup was complete. |
| TD-004 (push route) | E2E | P1 | Verify navigation to `/push` renders the push page, not 404. |
| TD-017 (login redirect) | E2E | P1 | Test returning user (with clashTag) redirects to `/dashboard`. Test new user redirects to `/onboarding`. |
| TD-021 (PrivateRoute) | Unit | P2 | Verify authenticated users see content, unauthenticated users are redirected. |
| TD-016 (unified toasts) | Unit | P2 | Verify all toast calls go through the unified system with `t()` localization. |
| TD-009/010/011 (i18n) | E2E | P2 | Verify pages render correctly in both `pt-BR` and `en-US` locales. Verify no untranslated strings. |
| TD-022 (migrations) | Integration | P2 | Verify migration up/down paths work. Test baseline migration matches production schema. |
| TD-028 (meta refresh cron) | Integration | P2 | Verify cron job refreshes cache. Verify user endpoint serves from cache only. |

### Recommended Test Infrastructure

| Component | Recommendation | Effort |
|-----------|---------------|:------:|
| Backend integration tests | `supertest` + `vitest` with test database (Supabase local or Docker postgres) | M |
| Frontend component tests | React Testing Library + vitest | M |
| E2E tests | Playwright (already recommended in TD-008) | L |
| Test database seeding | Fixtures for user, profile, subscription, goals, battle history | M |

### Test Priority Order

1. **P0 -- Security and Infrastructure** (TD-005, TD-006): Rate limiting and CORS are security-critical and must be verified.
2. **P1 -- Data Integrity and Critical Flows** (TD-012, TD-015, TD-004, TD-017): Prevent data corruption and fix broken features.
3. **P2 -- Quality of Life** (TD-021, TD-016, i18n, TD-022, TD-028): Verify refactorings and improvements.

---

## 7. Roadmap Feasibility

### Is the 5-Phase Plan Realistic?

The DRAFT proposes:
- Phase 1: 3-4 days (quick wins)
- Phase 2: 8-12 days (structural)
- Phase 3: 10-15 days (i18n + frontend decomposition)
- Phase 4: 8-12 days (database integrity + performance)
- Phase 5: 15-20 days (polish + long-term quality)
- **Total: ~44-73 days**

**QA Assessment:**

Phase 1 estimate is **realistic.** 12 items, all S-effort, can be completed in 3-4 days by a single developer. With specialist additions (TD-009, TD-020 moved to Phase 1), add 1 day. **Revised: 4-5 days.**

Phase 2 estimate is **realistic but tight.** TD-001 (routes split) alone is XL (3+ days). Combined with TD-022 (M), TD-021 (M), TD-008 (L), TD-018 (M), TD-025 (S), TD-037 (S), the total is approximately 10-14 days. **Revised: 10-14 days.**

Phase 3 estimate is **realistic.** TD-003 + TD-010 (XL), TD-002 (L), TD-016 (M), TD-011 (M), TD-031 (S), TD-047 (S), TD-035 (M) total approximately 10-15 days. **Agreed.**

Phase 4 estimate is **optimistic after specialist re-estimates.** TD-012 was re-estimated from L to XL (2-4 days), TD-015 from M to L (1-2 days). Combined with TD-026 (S), TD-027 (M), TD-028 (M), TD-032 (M), TD-036 (S), TD-033 (M), the revised total is approximately 10-16 days. **Revised: 10-16 days.**

Phase 5 estimate is **reasonable** as a backlog rather than a sprint. These items can be addressed incrementally.

**Revised Total: ~38-55 days** (excluding Phase 5, which is open-ended).

### Are Phase 1 Quick Wins Truly Quick Wins?

| Item | Effort | Quick Win? | Assessment |
|------|:------:|:----------:|------------|
| TD-004 (push route) | S | YES | 3-line code change |
| TD-006 (CORS) | S | YES | npm install cors + 5-line middleware config |
| TD-005 (rate limiting) | M | BORDERLINE | Needs per-tier configuration. Global rate limit is quick; per-endpoint tuning is not. Recommend: add global limit in Phase 1, tune per-endpoint in Phase 2 after route split. |
| TD-013 (updated_at trigger) | S | YES | ~10 lines SQL, apply to 9 tables |
| TD-014 (composite indexes) | S | YES | 2 CREATE INDEX statements |
| TD-019 (pool config) | S | YES | 4-line config change |
| TD-039 (delete dead files) | S | YES | rm command |
| TD-034 (not-found.tsx) | S | YES | 3 CSS class replacements |
| TD-030 (remove framer-motion) | S | YES | npm uninstall |
| TD-045 (copyright) | S | YES | 1-line change |
| TD-046 (avatar) | S | YES | Small component change |
| TD-050 (useIsMobile) | S | YES | 1-line initialization change |
| TD-009 (auth i18n) -- NEW | S | YES | 18 string replacements in 169-line file |
| TD-020 (dark toggle removal) -- NEW | S | YES | Remove toggle JSX and handler |

**Assessment:** 13 of 14 Phase 1 items are genuine quick wins. TD-005 (rate limiting) at M effort is the only borderline item, but a global rate limit can be applied quickly; per-endpoint tuning can wait for Phase 2. **Phase 1 is well-designed.**

### Recommended Roadmap Adjustments

**Adjustment 1: Move TD-009 and TD-020 to Phase 1** (per @ux-design-expert recommendation)

Both are S-effort with high UX impact. This is a straightforward improvement.

**Adjustment 2: Interleave database integrity into Phase 3**

The @data-engineer correctly argues that TD-012 (notification consolidation) and TD-015 (subscriptions unique) are foundational issues that worsen with user growth. Rather than fully swapping Phase 3 and Phase 4, I recommend interleaving:

- **Phase 3A** (Week 3): TD-016 (toasts), TD-009 (auth i18n -- if not done in Phase 1), TD-015 (subscriptions unique), TD-012 (notification consolidation)
- **Phase 3B** (Week 3-4): TD-003 + TD-010 (me.tsx decomposition + i18n), TD-002 (decks.tsx decomposition)
- **Phase 3C** (Week 4): TD-011 (goals i18n), TD-031 (hook toasts), TD-047 (push i18n), TD-035 (server i18n)

This ensures database integrity fixes happen before the i18n sweep, while keeping the logical grouping of frontend work.

**Adjustment 3: Split TD-005 into two steps**

- Phase 1: Global rate limit (S effort -- `app.use(rateLimit({ windowMs: 60000, max: 100 }))`)
- Phase 2: Per-route rate limits (M effort -- after TD-001 route split enables per-route middleware)

---

## 8. Quality Criteria Validation

| Criterion | Rating | Justification |
|-----------|:------:|---------------|
| **Traceability** | PASS | Every TD item includes a Source field referencing the Phase and section that identified it. The Appendix cross-reference table maps all 50 items to their source documents. Both specialist reviews confirm source accuracy. |
| **Completeness** | CONCERNS | 54 of 68 total findings across source documents are captured. After specialist reviews, 60 of 68 are covered. 8 Phase 1 findings (mostly LOW severity) remain uncaptured. The 2 MEDIUM gaps (no logging framework, Stripe webhook verification, XSS protection) should be added before finalization. |
| **Accuracy** | CONCERNS | Item descriptions are technically accurate per specialist verification. However, 4 factual corrections are needed (counts for TD-011, TD-029, TD-031, TD-047). Additionally, the Executive Summary health score (5.8) conflicts with the calculated score (5.0). These are minor but must be corrected. |
| **Prioritization** | PASS | Severity levels are appropriate after specialist adjustments. The 4 severity changes are well-justified. Effort estimates are reasonable after 2 re-estimates. The risk matrix correctly identifies the highest-impact items. |
| **Actionability** | PASS | Remediations are specific and implementable. The @data-engineer provides concrete SQL for TD-013, TD-015, TD-026. The @ux-design-expert provides concrete component decomposition structures for TD-002, TD-003. Effort estimates use a consistent T-shirt scale. |
| **Dependencies** | PASS | Dependency graph is a valid DAG with no circular dependencies. 2 missing dependencies were identified (TD-025 -> TD-012, TD-019 -> TD-015 implicit) but the roadmap already respects them by phase ordering. Adding explicit documentation is a minor fix. |

---

## 9. Required Changes Before Finalization

### MUST-FIX Items (Blocking Finalization)

| # | Category | Description | Effort |
|---|----------|-------------|:------:|
| MF-1 | Severity | **Upgrade TD-012 to CRITICAL** (per @data-engineer). Active data consistency hazard with dual-table fallback chain. | Trivial |
| MF-2 | Severity | **Upgrade TD-013 to CRITICAL** (per @data-engineer). 14 manual timestamp calls with no trigger safety net. | Trivial |
| MF-3 | Severity | **Upgrade TD-009 to CRITICAL** (per @ux-design-expert). Auth page is 100% Portuguese at the user entry point. | Trivial |
| MF-4 | Severity | **Upgrade TD-034 to HIGH** (per @ux-design-expert). 404 page has invisible text, not just wrong background. Fix description to include `text-gray-900` and `text-gray-600`. | Trivial |
| MF-5 | Severity | **Downgrade TD-036 to LOW** (per @data-engineer). Near-zero practical risk in UTC-only Supabase environment. | Trivial |
| MF-6 | Effort | **Re-estimate TD-012 from L to XL** (per @data-engineer). 7 change points, 4 files, production data migration. | Trivial |
| MF-7 | Effort | **Re-estimate TD-015 from M to L** (per @data-engineer). Production data cleanup is the bottleneck. | Trivial |
| MF-8 | Effort | **Re-estimate TD-009 from M to S** (per @ux-design-expert). 169-line file, ~18 strings. | Trivial |
| MF-9 | Effort | **Re-estimate TD-017 from M to S** (per @ux-design-expert). ~15-20 line change in auth.tsx. | Trivial |
| MF-10 | New Items | **Add 6 new items from specialist reviews** (TD-051 through TD-056) with renumbered IDs per Section 3 collision resolution. | Small |
| MF-11 | New Items | **Add TD-057: No structured logging framework** (Phase 1 gap G3, MEDIUM). `console.log` with no structure, levels, or correlation. | Small |
| MF-12 | Accuracy | **Correct factual errors:** TD-011 count (43->46), TD-029 count (clarify 27 frontend + server-side), TD-031 count (~10->14), TD-047 count (~5->4). | Trivial |
| MF-13 | Accuracy | **Resolve health score inconsistency.** Executive Summary says 5.8/10, Section 6 calculation yields 5.0/10. Use 5.0/10 consistently. | Trivial |
| MF-14 | Dependencies | **Add TD-025 as prerequisite for TD-012.** Bootstrap refactor before notification consolidation. | Trivial |
| MF-15 | Roadmap | **Move TD-009 and TD-020 to Phase 1** quick wins. Both are S-effort with outsized UX impact. | Trivial |

### SHOULD-FIX Items (Recommended but Not Blocking)

| # | Category | Description |
|---|----------|-------------|
| SF-1 | New Items | Add TD-058: No health check endpoint (LOW). Missing `/api/health` prevents monitoring. |
| SF-2 | New Items | Add TD-059: No XSS protection on text fields (MEDIUM). Tags sanitized but coach messages, display names, goal descriptions not protected. |
| SF-3 | New Items | Add TD-060: Stripe webhook signature verification unclear (MEDIUM). Should be verified and documented. If missing, upgrade to CRITICAL. |
| SF-4 | New Items | Add TD-061: WebSocket dependency unused (LOW). Dead dependency alongside framer-motion. |
| SF-5 | New Items | Add TD-062: Hardcoded free tier limits (LOW). Magic numbers in routes.ts lines 42-43. |
| SF-6 | Accuracy | Clarify TD-032 description per @data-engineer: the 5-query scenario only applies when `bootstrapUserData()` is NOT called. |
| SF-7 | Roadmap | Add migration strategy guidance (dual-track Drizzle + SQL scripts) to remediation roadmap preamble (per @data-engineer advisory). |
| SF-8 | Roadmap | Add backup/recovery checklist for TD-012 and TD-015 as pre-conditions (per @data-engineer advisory). |
| SF-9 | Roadmap | Note in TD-019 that the pooler URL should be used for the app and the direct URL for migrations only (per @data-engineer advisory). |
| SF-10 | Roadmap | Interleave database integrity items (TD-012, TD-015) into Phase 3 rather than deferring to Phase 4. |
| SF-11 | Counts | Update Executive Summary debt counts and effort totals to reflect the new items and re-estimates. |

### NICE-TO-HAVE Items

| # | Description |
|---|-------------|
| NH-1 | Add the @ux-design-expert's detailed component decomposition structures (me.tsx, decks.tsx, settings.tsx file trees) as an appendix to the DRAFT. These are valuable implementation guidance. |
| NH-2 | Add the @data-engineer's monitoring/alerting suggestions (table size, pool saturation, query latency, orphan detection) as an appendix. |
| NH-3 | Add the @ux-design-expert's i18n completion strategy (ordered migration plan with string counts per file) as an appendix. |
| NH-4 | Add the @data-engineer's suggested execution order for DB items as a sub-section of the roadmap. |

---

## 10. Verdict

### APPROVED WITH CONDITIONS

The Technical Debt DRAFT is a thorough, well-organized, and technically sound assessment of the CRStats project. It correctly identifies 50 debt items across all layers (architecture, database, frontend, security, testing, i18n, performance, DevOps), with a credible 5-phase remediation roadmap and a transparent health scoring methodology.

Both specialist reviews confirm the fundamental accuracy of the document while providing valuable refinements. The @data-engineer validated 15 database items, confirming technical accuracy and providing concrete SQL remediation code. The @ux-design-expert validated 28 frontend/UX items, confirming code-level accuracy with detailed decomposition recommendations.

**The document is ready for Phase 8 finalization** provided the following conditions are met:

### Conditions for Finalization

1. **Apply all 15 MUST-FIX items** (MF-1 through MF-15). These are primarily severity adjustments, effort re-estimates, factual corrections, and new item additions. All are trivial or small effort.

2. **Resolve the ID collision** between specialist reviews by renumbering UX-proposed items to TD-054 through TD-056 per the scheme in Section 3.

3. **Update the Executive Summary** to reflect the corrected health score (5.0/10, not 5.8/10) and the updated item counts (56 items after additions).

4. **Apply at least SF-6 (TD-032 clarification) and SF-10 (interleave database integrity into Phase 3)** from the SHOULD-FIX list, as these affect the roadmap's logical soundness.

### Justification

The DRAFT demonstrates:
- **Strong source traceability** (Appendix cross-reference table covers all 50 original items)
- **Technical accuracy** confirmed by both domain specialists
- **Actionable remediations** with specific code, SQL, and architectural guidance
- **Sound prioritization** that correctly puts security and broken features first
- **Realistic effort estimates** (after specialist corrections)
- **Logical dependency graph** with no circular dependencies

The conditions are incremental refinements, not structural issues. The document's architecture, methodology, and conclusions are all sound. Phase 8 (@architect) can proceed with confidence once the listed changes are incorporated.

### Updated Debt Summary (Post-QA)

| Severity | Count | Estimated Effort |
|----------|------:|----------------:|
| CRITICAL | 11 | ~18-28 days |
| HIGH | 12 | ~14-22 days |
| MEDIUM | ~18 | ~14-22 days |
| LOW | ~15 | ~6-10 days |
| **TOTAL** | **~56** | **~52-82 days** |

### Recommended Next Steps

1. @architect incorporates all MUST-FIX items and available SHOULD-FIX items into the finalized document (Phase 8)
2. @analyst generates the executive summary report (Phase 9)
3. @pm creates the remediation epic with stories mapped to the 5-phase roadmap (Phase 10)

---

*QA Gate review completed by @qa for Brownfield Discovery Phase 7.*
*Verdict: APPROVED WITH CONDITIONS -- 15 must-fix items, all incremental refinements.*
*Next step: Phase 8 -- @architect finalization (technical-debt-assessment.md).*
