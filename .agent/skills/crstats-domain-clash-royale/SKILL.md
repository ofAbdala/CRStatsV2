---
name: crstats-domain-clash-royale
description: >
  Clash Royale game concepts and how CRStats uses real API data.
  Covers arenas, leagues, trophies, pushes, decks, meta, tilt, and the Clash Royale API integration.
  Load this skill when working on any feature that touches game data or player progression.
---

# Clash Royale — Game Domain for CRStats

> This skill explains the Clash Royale game concepts that CRStats builds on. Every data point comes from the **real Clash Royale API** — no mock data is allowed.

---

## 1. Core Game Concepts

### 1.1 Trophies & Progression

| Concept | Description |
|---------|-------------|
| **Trophies** | Primary ranking currency. Won/lost per ladder match (+/- varies by range). |
| **Arenas** | Progression tiers (Arena 1 → 15+). Unlocked by reaching trophy thresholds. |
| **Leagues** | End-game tiers above Arena 15 (Challenger I → Ultimate Champion). Trophy gates prevent falling below certain thresholds. |
| **Season Reset** | At the end of each season (~1 month), trophies above a threshold are partially reset. |
| **King Level** | Player's overall level (1–14+). Affects card upgrades and matchmaking. |

### 1.2 Battles

| Concept | Description |
|---------|-------------|
| **Ladder** | Ranked 1v1 matches. Trophies are at stake. |
| **Challenges** | Classic/Grand challenges. Entry fee (gems), competitive, no trophy impact. |
| **War** | Clan-based competitive events (Clan Wars). |
| **Party** | Casual modes (2v2, special events). No trophy impact. |
| **Crowns** | Scored by destroying towers. Match winner has more crowns (or 3-crown = king tower). |
| **Result** | `win` / `loss` / `draw` — determined by crown comparison at time limit. |

### 1.3 Decks

| Concept | Description |
|---------|-------------|
| **Deck** | Exactly 8 unique cards. Always 8, never more or less. |
| **Elixir Cost** | Each card costs 1–9 elixir. Average elixir defines deck archetype speed. |
| **Win Condition** | The primary card that deals tower damage. CRStats recognizes 18 win conditions (see §3). |
| **Archetype** | Deck playstyle classification. CRStats detects 17 archetypes (see §3). |

### 1.4 Meta

| Concept | Description |
|---------|-------------|
| **Meta** | The current most-effective strategies/decks based on usage + win rate at top ladder. |
| **Meta Deck** | A deck widely used by top players with high win rates. |
| **Off-Meta** | Unconventional decks not commonly seen at the top. |

---

## 2. Tilt (Emotional State)

Tilt is a real phenomenon in competitive gaming where frustration from losses degrades decision-making, causing more losses.

### 2.1 How CRStats Detects Tilt

**Source:** `shared/domain/tilt.ts`

CRStats analyzes the **last 10 battles** and computes:

| Metric | Formula |
|--------|---------|
| Win Rate | `wins / totalBattles × 100` |
| Consecutive Losses | Longest loss streak starting from most recent |
| Net Trophies | Sum of all `trophyChange` values |

**Tilt Levels:**

| Level | Trigger |
|-------|---------|
| `high` | ≥3 consecutive losses **OR** (winRate < 40% **AND** netTrophies ≤ -60) |
| `medium` | winRate between 40–50% **AND** netTrophies < 0 |
| `none` | None of the above |

### 2.2 Time-Decay Model

Tilt fades over time when the player stops playing:

| Hours Since Last Battle | Decay Stage | Risk Multiplier |
|------------------------|-------------|-----------------|
| 0–2h | `none` | 1.0× (full tilt) |
| 2–6h | `2h` | 0.7× |
| 6–12h | `6h` | 0.4× |
| 12h+ | `12h` | 0× (tilt cleared) |

**Final state:** `risk = baseRisk × multiplier` → reconverted to level via thresholds (≥70→high, ≥40→medium, else none).

**Alert** is triggered when `level === "high"`.

---

## 3. Deck Intelligence

**Source:** `server/domain/decks.ts`

### 3.1 Win Conditions (18)

Hog Rider, Royal Giant, Graveyard, Golem, Lava Hound, X-Bow, Mortar, Goblin Barrel, Miner, Balloon, Giant, Ram Rider, Battle Ram, Elixir Golem, Goblin Giant, Skeleton Barrel, Royal Hogs, Three Musketeers.

### 3.2 Archetypes (17)

Golem Beatdown, LavaLoon, Giant Skeleton, X-Bow Cycle, Mortar Cycle, Hog Cycle, Royal Giant, Giant Beatdown, P.E.K.K.A Bridge Spam, Elixir Golem, 3M Split, Graveyard Control, Mega Knight, Royal Hogs, Miner WallBreakers, Balloon Cycle, Log Bait, Custom.

### 3.3 Counter Map

Hard-coded counters for 9 problem cards: Mega Knight, Witch, X-Bow, Hog Rider, Royal Giant, Graveyard, Elite Barbarians, Goblin Barrel, Lava Hound.

### 3.4 Card Index

- Fetched from real Clash Royale API (`getCards()`)
- Cached for **24 hours** (TTL-based)
- Maps card name → `{ id, name, elixirCost }`
- Used for elixir computation and Clash deep-link generation

---

## 4. Push Sessions

**Source:** `server/domain/syncRules.ts`

A "push" is a continuous play period where a player chains multiple matches.

### Definition

| Parameter | Default | Config Key |
|-----------|---------|------------|
| Max gap between battles | **30 minutes** | `maxGapMinutes` |
| Minimum battles to form a session | **2** | `minBattles` |

### Algorithm

1. Sort battles by `battleTime` (descending = most recent first)
2. Walk through sorted battles
3. If gap between consecutive battles ≤ 30 min → same session
4. If gap > 30 min → close current session (if ≥ 2 battles), start new one
5. For each session, compute: `wins`, `losses`, `winRate`, `netTrophies`, `startTime`, `endTime`

### Push Session → AI Analysis

After computing a push session, CRStats can run `generatePushAnalysis()` (OpenAI) which produces: `summary`, `strengths[]`, `mistakes[]`, `recommendations[]`.

---

## 5. Clash Royale API Integration

**Source:** `server/clashRoyaleApi.ts`

### 5.1 Proxy

All requests go through `proxy.royaleapi.dev/v1` to avoid IP whitelist issues with Supercell's direct API.

### 5.2 Available Endpoints

| Function | CR Endpoint | Returns |
|----------|-------------|---------|
| `getPlayerByTag(tag)` | `/players/{tag}` | Player profile, trophies, arena, deck, etc. |
| `getPlayerBattles(tag)` | `/players/{tag}/battlelog` | Last 25 battles (Supercell limit) |
| `getCards()` | `/cards` | Full card catalog with elixir costs |
| `getPlayerRankings(location)` | `/locations/{id}/rankings/players` | Top players by location |
| `getClanRankings(location)` | `/locations/{id}/rankings/clans` | Top clans by location |
| `getClanByTag(tag)` | `/clans/{tag}` | Clan info |
| `getClanMembers(tag)` | `/clans/{tag}/members` | Clan member list |
| `getTopPlayersInLocation(location, limit)` | Rankings + slice | Top N players from a location |

### 5.3 Battle Time Format

Clash Royale uses a custom timestamp format: `20250115T143022.000Z` (no dashes/colons). CRStats parses this via `parseBattleTime()` in `shared/domain/tilt.ts`.

### 5.4 Important Limitations

- **Battle log returns max 25 battles** — can't fetch historical data beyond this window
- **Rate limit: 429** — CRStats handles this gracefully with retry awareness
- **No TypeScript types** — All API responses are typed as `any` and require defensive validation
- **Player tag format** — `#` prefix, uppercase alphanumeric. CRStats normalizes with `normalizeTag()`

---

## 6. Battle History Persistence

**Source:** `server/domain/battleHistory.ts`

### De-duplication

Each battle is hashed into a unique `battleKey` (SHA-256) from: `userId + playerTag + battleTime + type + gameMode + teamTag + opponentTag + crowns + trophyChange + card IDs`.

### FREE vs PRO Limits

| Tier | Battle History | Max Days |
|------|---------------|----------|
| FREE | Last **10** battles | — |
| PRO | Up to **2000** battles | Last **60** days |

---

## 7. Data Integrity Rule

> 🔴 **No mock data in production.** Every data point shown to the user must come from the real Clash Royale API. The `audit-data-authenticity.ts` script verifies this. If an API is unavailable, show an error state — never fabricate data.
