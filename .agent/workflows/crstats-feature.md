---
description: CRStats feature planning. Breaks down feature requests into backend, frontend, data model, and QA tasks with FREE/PRO and i18n awareness.
---

# /crstats-feature - Feature Breakdown for CRStats

$ARGUMENTS

---

## 🔴 CRITICAL RULES

1. **Load `crstats-architecture` skill FIRST** — Read `.agent/skills/crstats-architecture/SKILL.md` before any analysis
2. **No mock data** — All implementations must use real APIs (Clash Royale, OpenAI, Stripe) or leave explicit `// TODO: integrate with [API]` comments
3. **i18n mandatory** — Every user-facing string must have keys in both `pt-BR.json` and `en-US.json`
4. **FREE vs PRO gating** — Explicitly declare which tier gets the feature, and if limits apply
5. **Socratic Gate** — Ask at least 2 clarifying questions before producing the breakdown

---

## Behavior

When `/crstats-feature` is triggered:

### Phase 1: Context & Clarification

1. **Load architecture context**
   - Read `crstats-architecture` skill
   - Identify related existing features, tables, and components

2. **Ask clarifying questions** (minimum 2)
   - Who is this for? (FREE, PRO, or both?)
   - Does this need AI (OpenAI)? Real-time data (CR API)?
   - Any interaction with existing features (coach, training, decks, etc.)?
   - Mobile considerations?

### Phase 2: Breakdown

Produce a structured plan file at `docs/PLAN-crstats-{slug}.md` with these sections:

#### 2.1 Data Model Changes
- New tables or columns in `shared/schema.ts`
- New Zod input/output schemas
- Relations to add
- Migration steps (`drizzle-kit push` or `supabase:apply`)

#### 2.2 Backend Tasks
- New routes in `server/routes.ts` (group by resource)
- Storage interface methods (`IStorage`) + `DatabaseStorage` implementation
- Domain logic files in `server/domain/`
- OpenAI integration (new prompt? new function in `openai.ts`? fallback?)
- Clash Royale API usage (new endpoints?)
- Stripe implications (new product/price?)
- FREE vs PRO gating logic with daily limits if applicable

#### 2.3 Frontend Tasks
- New or modified pages in `client/src/pages/`
- New components (reusable vs page-specific)
- New hooks in `client/src/hooks/`
- Route registration in `App.tsx` (auth-gated?)
- Sidebar/navigation updates in `DashboardLayout.tsx`
- i18n keys to add (list the key paths and both translations)

#### 2.4 QA Plan
- Unit tests for domain logic (`server/domain/*.test.ts`)
- Contract tests for payloads (`shared/contracts/`)
- API endpoint tests (happy path + edge cases + FREE limit exhaustion)
- UI verification (list specific user actions to test)
- Edge cases (no battles, expired subscription, rate-limited CR API, OpenAI down)

### Phase 3: Summary

```markdown
## Feature Summary

| Dimension | Count |
|-----------|-------|
| New DB tables/columns | X |
| New API routes | X |
| New/modified pages | X |
| New hooks | X |
| New i18n keys | X |
| Tests to write | X |
| PRO-only? | Yes/No |
```

---

## Output Format

```markdown
## 🚀 Feature: [Feature Name]

### Tier: FREE / PRO / Both
### Depends on: [existing features]

### 1. Data Model
- [ ] Add `table_name` to `shared/schema.ts`
- [ ] Add Zod schema `inputSchema`
- [ ] Run `pnpm db:push`

### 2. Backend
- [ ] Add `POST /api/resource` route
- [ ] Add `IStorage.methodName()` + implementation
- [ ] Add domain logic in `server/domain/featureName.ts`
- [ ] Add OpenAI function (if applicable)
- [ ] Add FREE limit check (if applicable)

### 3. Frontend
- [ ] Create `client/src/pages/feature.tsx`
- [ ] Create `client/src/hooks/useFeature.ts`
- [ ] Add route in `App.tsx`
- [ ] Add sidebar link in `DashboardLayout.tsx`
- [ ] Add i18n keys: `feature.title`, `feature.description`, ...

### 4. QA
- [ ] Unit test: `server/domain/featureName.test.ts`
- [ ] API test: POST /api/resource (200, 401, 403 PRO-only, 429 limit)
- [ ] UI test: [specific user flow]
- [ ] Edge case: [OpenAI down / CR API 429 / no battles]
```

---

## Usage Examples

```
/crstats-feature add clan war tracking
/crstats-feature implement deck versioning history
/crstats-feature add trophy milestone notifications
/crstats-feature build season summary report
/crstats-feature add card mastery tracking
```

---

## Key Principles

- **Architecture-first** — Always check `crstats-architecture` skill before planning
- **Real data only** — No mocks, no fake battle logs, no placeholder AI responses
- **i18n from day one** — Never add a feature without both translations
- **FREE/PRO explicit** — Every feature must declare its tier access
- **Incremental** — Prefer small, shippable increments over big-bang releases
