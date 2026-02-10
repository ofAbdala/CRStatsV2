---
description: CRStats bug investigation. Structured debugging for issues from real play sessions. Reproduction, root cause, fix plan, and regression tests.
---

# /crstats-bug - Bug Investigation for CRStats

$ARGUMENTS

---

## 🔴 CRITICAL RULES

1. **Load `crstats-architecture` skill FIRST** — Read `.agent/skills/crstats-architecture/SKILL.md` before investigating
2. **Real data context** — Bugs often come from real Clash Royale play sessions; understand the data flow
3. **Never guess** — Form hypotheses, then verify with evidence (logs, code, data)
4. **Regression test mandatory** — Every fix must include a test that would have caught the bug

---

## Behavior

When `/crstats-bug` is triggered:

### Phase 1: Gather Context

1. **Load architecture context**
   - Read `crstats-architecture` skill
   - Identify which system area is affected

2. **Collect bug details** (ask if missing)
   - What happened? (actual behavior)
   - What should have happened? (expected behavior)
   - When did it happen? (after sync? during coach chat? on billing page?)
   - Player context? (tag, FREE/PRO, locale, tilt state)
   - Error message or screenshot?
   - Is it reproducible?

3. **Classify the bug**

   | Category | Typical Symptoms | Key Files |
   |----------|-----------------|-----------|
   | **Sync** | Missing battles, wrong trophies, stale data | `syncRules.ts`, `battleHistory.ts`, `clashRoyaleApi.ts`, `storage.ts` |
   | **AI/Coach** | Bad advice, empty responses, JSON parse errors | `openai.ts`, `routes.ts` (coach endpoints) |
   | **Tilt** | Wrong tilt level, no decay, alert not showing | `shared/domain/tilt.ts`, `syncRules.ts` |
   | **Billing** | Stuck on FREE, checkout fails, portal broken | `stripeService.ts`, `stripeCheckout.ts`, `storage.ts` (subscriptions) |
   | **Decks** | Wrong meta decks, counter-deck fails, optimizer error | `domain/decks.ts`, `metaDecksRefresh.ts`, `openai.ts` |
   | **Training** | Plan not generated, drills missing, wrong focus area | `openai.ts`, `routes.ts` (training endpoints) |
   | **Auth** | 401 errors, session expired, can't login | `supabaseAuth.ts`, `useAuth.ts`, `supabaseClient.ts` |
   | **i18n** | Missing translations, wrong locale, key shown as text | `shared/i18n/`, `use-locale.tsx` |
   | **UI** | Layout broken, component crash, wrong data displayed | `client/src/pages/`, `components/`, hooks |
   | **Goals** | Auto-progress not updating, wrong target tracking | `syncRules.ts` (`computeGoalAutoProgress`), `useGoals.ts` |

### Phase 2: Hypothesize

List hypotheses ordered by likelihood:

```markdown
### Hypotheses

1. 🔴 **Most likely:** [Description] → Check `[file]:[line range]`
2. 🟡 **Possible:** [Description] → Check `[file]:[line range]`
3. ⚪ **Unlikely:** [Description] → Check `[file]:[line range]`
```

Consider these common CRStats-specific causes:
- **CR API returns unexpected shape** (the API has no TypeScript types)
- **Battle time parsing** (`parseBattleTime` in `tilt.ts` handles a custom CR format)
- **FREE limit off-by-one** (daily limit reset timing, timezone issues)
- **OpenAI JSON malformed** (response doesn't match Zod schema, fallback should trigger)
- **Sync throttle** (`playerSyncState.lastSyncedAt` preventing refresh)
- **Supabase JWT expired** (clock skew, long sessions)
- **i18n key mismatch** (key exists in pt-BR but not en-US or vice versa)

### Phase 3: Investigate

For each hypothesis:

1. **Identify files to inspect** — Use the classification table above
2. **Trace the data flow** — Follow the request from frontend hook → API route → storage/domain → external API → response
3. **Check edge cases** — Empty arrays, null values, expired subscriptions, API errors
4. **Verify with evidence** — Read the code, check error handling, look for missing validation

### Phase 4: Fix Plan

```markdown
### Fix Plan

**Root Cause:** [Clear explanation of why the bug happens]

**Files to modify:**
1. `[file path]` — [what to change and why]
2. `[file path]` — [what to change and why]

**Steps:**
1. [ ] [Specific code change]
2. [ ] [Specific code change]
3. [ ] [Update i18n if user-facing error message changes]
4. [ ] [Add regression test]
5. [ ] [Verify fix locally]

**Regression Test:**
- File: `server/domain/[feature].test.ts` or `shared/contracts/[feature].test.ts`
- Test case: [describe the scenario that would catch this bug]
- Run: `pnpm test:critical`
```

### Phase 5: Prevention

```markdown
### Prevention
- [ ] [Guard clause / validation to add]
- [ ] [Type narrowing to make impossible states unrepresentable]
- [ ] [Fallback to add if external service]
- [ ] [Error logging to improve observability]
```

---

## Output Format

```markdown
## 🐛 Bug: [Short Description]

### Category: [Sync / AI / Tilt / Billing / Decks / Training / Auth / i18n / UI / Goals]
### Severity: [Critical / High / Medium / Low]
### Affected Tier: [FREE / PRO / Both]

### 1. Reproduction Steps
1. [Step]
2. [Step]
3. [Step]
→ **Actual:** [what happens]
→ **Expected:** [what should happen]

### 2. Hypotheses
1. 🔴 [Most likely] → `file.ts`
2. 🟡 [Possible] → `file.ts`

### 3. Root Cause
🎯 [Explanation]

### 4. Fix
- [ ] `[file]` — [change]
- [ ] `[file]` — [change]

### 5. Regression Test
- [ ] `[test file]` — [test case description]

### 6. Prevention
- [ ] [Improvement]
```

---

## Usage Examples

```
/crstats-bug tilt meter shows "none" even after 5 consecutive losses
/crstats-bug coach gives empty response when player has no recent battles
/crstats-bug sync button does nothing, no error shown
/crstats-bug billing page shows PRO but features are locked
/crstats-bug Portuguese translations missing on training drills page
/crstats-bug meta decks page shows stale data from last week
/crstats-bug deck optimizer returns 8 identical cards
```

---

## Key Principles

- **Architecture-first** — Always load `crstats-architecture` skill context
- **Data flow tracing** — Follow the full path: UI → hook → API → domain → external service → response
- **Real data awareness** — CR API has no TypeScript types; always validate shapes
- **Fallback coverage** — Every OpenAI function must have a working deterministic fallback
- **Test after fix** — Run `pnpm test:critical` before considering the bug closed
