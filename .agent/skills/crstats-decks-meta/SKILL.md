---
name: crstats-decks-meta
description: >
  Deck intelligence features for CRStats: meta decks, counter-deck builder, and deck optimizer.
  Covers meta deck aggregation from top players, AI-powered counter and optimization suggestions,
  FREE vs PRO gating, and card index caching.
  Load this skill when working on deck-related features.
---

# CRStats — Decks & Meta Intelligence

> CRStats provides AI-powered deck intelligence built on **real aggregated data from top Clash Royale players**. No mock decks — everything comes from the CR API and is processed through domain logic + OpenAI.

---

## 1. Meta Decks

**Source:** `server/domain/metaDecksRefresh.ts`

### What It Is

Meta decks are the most-used and highest-performing decks from top-ranked players globally. CRStats aggregates them automatically.

### How Meta Deck Refresh Works

```
Trigger (on page load, if stale)
  → Acquire pg_advisory_lock (prevents concurrent refreshes)
  → Check staleness (TTL-based)
  → Fetch player seeds (top global players)
  → For each player, fetch battle log
  → Extract decks from both sides of every battle
  → Aggregate: usage count, wins, losses, draws, avg trophies
  → Compute: avg elixir, win rate estimate, archetype
  → Store top 50 decks in meta_decks_cache
  → Release lock
```

### Refresh Parameters

| Parameter | Typical Value | Description |
|-----------|--------------|-------------|
| `ttlMs` | Configurable | How long before cache is considered stale |
| `players` | ~50 | Number of top global players to sample |
| `battlesPerPlayer` | ~50 | Max battles to process per player |
| Concurrency | 5 | Parallel CR API calls per batch |
| Max cached decks | **50** | Top decks stored, sorted by usage → winRate → avgTrophies |

### Player Seed Strategy

1. **Primary:** Top global player rankings (`getTopPlayersInLocation("global")`)
2. **Fallback:** If rankings empty → fetch top global clans → sample top 5 members per clan

### Win Rate Estimation

Uses Laplace smoothing: `winRate = (wins + 1) / (games + 2) × 100`

This prevents low-sample decks (1 game, 1 win = 100%) from dominating.

### Data Model

| Table | Key Fields |
|-------|------------|
| `meta_decks_cache` | `deckHash`, `cards` (string[]), `usageCount`, `avgTrophies`, `archetype`, `wins`, `losses`, `draws`, `avgElixir`, `winRateEstimate`, `sourceRegion`, `sourceRange`, `lastUpdatedAt` |

### Concurrency Protection

Uses PostgreSQL advisory lock (`pg_try_advisory_lock(82003771)`) to prevent multiple serverless function instances from refreshing simultaneously. Double-checks staleness after acquiring lock.

---

## 2. Counter-Deck Builder

**Source:** `server/openai.ts` → `generateCounterDeckSuggestion()`

### What It Is

Given a problem card (e.g., "Mega Knight") and a preferred deck style, CRStats suggests a complete 8-card deck that counters it effectively.

### Input: CounterDeckSuggestionContext

```typescript
{
  targetCardKey: string;           // The card to counter (e.g., "Mega Knight")
  deckStyle?: "balanced" | "cycle" | "heavy";
  candidateDecks: Array<{          // Meta decks as candidates
    cards: string[];
    avgElixir: number;
    winRateEstimate?: number;
    games?: number;
  }>;
  language?: "pt" | "en";
}
```

### How It Works

1. Frontend sends target card + deck style + user's locale
2. Backend queries `meta_decks_cache` for candidates that contain counter cards
3. Candidates + context are sent to OpenAI
4. AI selects **one candidate deck** and may swap **at most 2 cards**
5. Result is validated against Zod schema (must be exactly 8 unique cards)

### Output

```typescript
{
  deck: string[];       // Exactly 8 card names
  explanation: string;  // 2-5 sentence practical explanation
}
```

### Deck Style Elixir Ranges

| Style | Avg Elixir |
|-------|-----------|
| `cycle` | 3.0 – 3.3 |
| `balanced` | 3.4 – 3.9 |
| `heavy` | 4.2 – 4.8 |

### Hard-Coded Counter Map

**Source:** `server/domain/decks.ts` → `COUNTER_MAP`

Used as a pre-filter before AI. Maps 9 problem cards to known counters:

| Problem Card | Counter Cards |
|-------------|---------------|
| Mega Knight | Inferno Dragon, Inferno Tower, Mini P.E.K.K.A, Valkyrie |
| Witch | Poison, Valkyrie, The Log |
| X-Bow | Rocket, Earthquake, Knight |
| Hog Rider | Cannon, Tornado, Tesla |
| Royal Giant | Inferno Tower, Fisherman, Electro Wizard |
| Graveyard | Poison, Valkyrie, Baby Dragon |
| Elite Barbarians | Valkyrie, Skeleton Army, Barbarian Barrel |
| Goblin Barrel | The Log, Arrows, Barbarian Barrel |
| Lava Hound | Inferno Dragon, Electro Dragon, Baby Dragon |

### Fallback

If OpenAI is unavailable: returns the **first candidate deck** as-is, pads to 8 cards with "Knight" if needed, and provides a generic explanation.

---

## 3. Deck Optimizer

**Source:** `server/openai.ts` → `generateDeckOptimizationSuggestion()`

### What It Is

Takes the player's current deck and suggests improvements based on a specific goal — without replacing the core win condition.

### Input: DeckOptimizationSuggestionContext

```typescript
{
  currentDeck: string[];           // Player's 8-card deck
  avgElixirBefore: number;         // Current avg elixir
  goal: "cycle" | "counter-card" | "consistency";
  targetCardKey?: string;          // Only for "counter-card" goal
  winCondition?: string | null;    // Auto-detected, must NOT be removed
  metaSimilarDecks?: Array<{       // Similar meta decks as inspiration
    cards: string[];
    avgElixir: number;
    winRateEstimate?: number;
    games?: number;
  }>;
  language?: "pt" | "en";
}
```

### Optimization Goals

| Goal | AI Instruction |
|------|----------------|
| `cycle` | Replace heavy cards with cheaper alternatives to reduce avg elixir |
| `counter-card` | Include at least one reliable counter for `targetCardKey` |
| `consistency` | Improve card synergy and remove clunky combinations |

### Output

```typescript
{
  newDeck: string[];                            // Optimized 8-card deck
  changes: Array<{ from: string; to: string }>; // Card swaps made
  explanation: string;                           // Why these changes
}
```

### Key Rules for AI

1. **Never remove the win condition** — preserve `winCondition` field
2. **Meta decks are inspiration, not constraint** — AI can deviate
3. **Exactly 8 unique cards** — validated with Zod
4. **Practical explanation** — short, actionable

### Fallback

Returns the **first meta similar deck** (or the original deck if none), empty changes array, and a generic explanation.

---

## 4. FREE vs PRO Gating

| Feature | FREE | PRO |
|---------|------|-----|
| View meta decks | ✓ | ✓ |
| Counter-deck suggestions | **2/day** | Unlimited |
| Deck optimizer suggestions | **2/day** | Unlimited |

The daily limit is tracked in the `deck_suggestions_usage` table.

**Constant:** `FREE_DECK_SUGGESTION_DAILY_LIMIT = 2` (defined in `routes.ts`)

**Schema:** `deckSuggestionsUsage` table tracks `userId`, `suggestionType`, `createdAt` — indexed for efficient counting.

---

## 5. Deck Utilities

**Source:** `server/domain/decks.ts`

| Function | Purpose |
|----------|---------|
| `getCardIndex()` | Fetches card catalog from CR API, caches 24h |
| `computeAvgElixir(cards, index)` | Computes average elixir cost (clamped 1–8) |
| `detectWinCondition(cards)` | Finds the primary win condition from 18 known cards |
| `detectArchetype(cards)` | Classifies deck into 17 archetypes |
| `normalizeDeckHash(cards)` | Sorted, lowercase, pipe-separated key for dedup |
| `computeChanges(from, to)` | Diff two decks → card swap pairs |
| `buildClashDeckImportLink(cards, index, lang)` | Generates `link.clashroyale.com` deep link |
| `COUNTER_MAP` | Hard-coded counter relationships |

---

## 6. Key Implementation Rules

1. **Meta decks come from real data** — aggregated from top player battle logs, never hardcoded or mocked
2. **AI suggestions are Zod-validated** — if response doesn't match schema, use deterministic fallback
3. **Card names are case-insensitive** — always normalize with `normalizeKey()` before comparison
4. **Deck always has exactly 8 cards** — validate and pad/truncate where needed
5. **Win condition is sacred** — optimizer must never remove it
6. **Bilingual prompts** — system prompts support `pt` and `en` based on user's locale
7. **Advisory lock for refresh** — never run concurrent meta deck refreshes (data corruption risk)
8. **Fallbacks return plausible data** — never blank decks, always 8 cards, always an explanation
