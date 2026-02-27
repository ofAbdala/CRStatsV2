/**
 * Shared types, constants, and utility functions for the Decks feature.
 *
 * Extracted from the original decks.tsx god-file (Story 1.7, TD-002).
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface MetaDeck {
  deckHash: string;
  cards: string[];
  avgElixir: number;
  games: number;
  wins: number;
  losses: number;
  winRateEstimate: number;
  archetype: string | null;
  lastUpdatedAt: string;
  cacheStatus?: "fresh" | "stale";
}

export type DecksTab = "meta" | "counter" | "optimizer";

export type TrophyRange = "all" | "5000" | "6000" | "7000";

export type MetaInnerTab = "decks" | "cards" | "evolutions" | "heroes" | "tower";

export type MetaMode = "path-of-legends" | "trophy-road";

export type MetaDeckSort = "popularity" | "win-rate";

export type MetaCardSort = "win-rate" | "usage-rate";

export type MetaCardGroup = "cards" | "evolutions" | "heroes" | "tower";

export type DeckStyle = "balanced" | "cycle" | "heavy";

export type DeckSuggestion = {
  cards: string[];
  avgElixir: number;
  explanation: string;
  importLink: string;
};

export type OptimizerGoal = "cycle" | "counter-card" | "consistency";

export type OptimizerChange = {
  from: string;
  to: string;
};

export type DeckOptimizerResult = {
  originalDeck: { cards: string[]; avgElixir: number };
  suggestedDeck: { cards: string[]; avgElixir: number };
  changes: OptimizerChange[];
  explanation: string;
  importLink: string;
};

export type MetaDeckExtended = MetaDeck & {
  winRatePercent: number | null;
};

export type MetaCardRow = {
  key: string;
  name: string;
  group: MetaCardGroup;
  games: number;
  wins: number;
  usageRate: number;
  winRate: number;
};

// ── Constants ────────────────────────────────────────────────────────────────

export const UNKNOWN_VALUE = "-";

/** Arena definitions for the arena selector (Story 2.1) */
export const ARENA_OPTIONS = [
  { id: 10, name: "Hog Mountain" },
  { id: 11, name: "Electro Valley" },
  { id: 12, name: "Spooky Town" },
  { id: 13, name: "Rascal's Hideout" },
  { id: 14, name: "Serenity Peak" },
  { id: 15, name: "Miner's Mine" },
  { id: 16, name: "Executioner's Kitchen" },
  { id: 17, name: "Royal Crypt" },
  { id: 18, name: "Silent Sanctuary" },
  { id: 19, name: "Dragon Spa" },
  { id: 20, name: "Legendary Arena" },
  { id: 54, name: "Legendary Arena (Top)" },
] as const;

export type ArenaId = (typeof ARENA_OPTIONS)[number]["id"];

export function isArenaId(value: number): value is ArenaId {
  return ARENA_OPTIONS.some((a) => a.id === value);
}

export function getArenaName(id: number): string {
  const arena = ARENA_OPTIONS.find((a) => a.id === id);
  return arena?.name ?? `Arena ${id}`;
}

export const PROBLEM_CARDS = [
  "Mega Knight",
  "Witch",
  "X-Bow",
  "Hog Rider",
  "Royal Giant",
  "Graveyard",
  "Elite Barbarians",
  "Goblin Barrel",
  "Lava Hound",
] as const;

// These sets are a temporary, client-only classifier so we can build the Meta Hub UI
// without new backend fields. Replace with real card type metadata when available.
export const HERO_KEYS = new Set([
  "archer queen",
  "golden knight",
  "skeleton king",
  "mighty miner",
  "monk",
  "little prince",
]);

export const TOWER_TROOP_KEYS = new Set([
  "tower princess",
  "dagger duchess",
  "cannoneer",
]);

export const EVOLUTION_KEYS = new Set([
  "archers",
  "barbarians",
  "bats",
  "bomber",
  "firecracker",
  "ice spirit",
  "knight",
  "mortar",
  "royal giant",
  "skeletons",
  "valkyrie",
  "wall breakers",
  "royal recruits",
  "tesla",
]);

// ── Type Guards ──────────────────────────────────────────────────────────────

export function isDecksTab(value: string | null): value is DecksTab {
  return value === "meta" || value === "counter" || value === "optimizer";
}

export function isTrophyRange(value: string): value is TrophyRange {
  return value === "all" || value === "5000" || value === "6000" || value === "7000";
}

export function isProblemCard(value: string): value is (typeof PROBLEM_CARDS)[number] {
  return (PROBLEM_CARDS as readonly string[]).includes(value);
}

export function isDeckStyle(value: string): value is DeckStyle {
  return value === "balanced" || value === "cycle" || value === "heavy";
}

export function isOptimizerGoal(value: string): value is OptimizerGoal {
  return value === "cycle" || value === "counter-card" || value === "consistency";
}

export function isMetaInnerTab(value: string): value is MetaInnerTab {
  return (
    value === "decks" ||
    value === "cards" ||
    value === "evolutions" ||
    value === "heroes" ||
    value === "tower"
  );
}

export function isMetaMode(value: string): value is MetaMode {
  return value === "path-of-legends" || value === "trophy-road";
}

export function isMetaDeckSort(value: string): value is MetaDeckSort {
  return value === "popularity" || value === "win-rate";
}

export function isMetaCardSort(value: string): value is MetaCardSort {
  return value === "win-rate" || value === "usage-rate";
}

// ── Utility Functions ────────────────────────────────────────────────────────

export function normalizeCardKey(name: string): string {
  return name.trim().toLowerCase();
}

export function classifyMetaCard(name: string): MetaCardGroup {
  const key = normalizeCardKey(name);

  if (TOWER_TROOP_KEYS.has(key)) return "tower";
  if (HERO_KEYS.has(key)) return "heroes";
  if (
    EVOLUTION_KEYS.has(key) ||
    key.includes("evolved") ||
    key.includes("evolution") ||
    key.startsWith("evo ")
  ) {
    return "evolutions";
  }

  return "cards";
}

export function toFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function formatPercent(value0to1: number): string {
  if (!Number.isFinite(value0to1)) return UNKNOWN_VALUE;
  return `${(value0to1 * 100).toFixed(1)}%`;
}

export function formatPercent100(value0to100: number): string {
  if (!Number.isFinite(value0to100)) return UNKNOWN_VALUE;
  return `${value0to100.toFixed(1)}%`;
}

export function getDeckWinRatePercent(deck: MetaDeck): number | null {
  const games = toFiniteNumber(deck.games, 0);
  const wins = toFiniteNumber(deck.wins, 0);

  if (games > 0) return clamp((wins / games) * 100, 0, 100);

  const estimate = toFiniteNumber(deck.winRateEstimate, NaN);
  return Number.isFinite(estimate) ? clamp(estimate, 0, 100) : null;
}

export function buildMetaDeckExtended(deck: MetaDeck): MetaDeckExtended {
  return {
    ...deck,
    winRatePercent: getDeckWinRatePercent(deck),
  };
}

export function buildCardListText(cards: Array<string | { name: string }>): string {
  return cards.map((card) => (typeof card === "string" ? card : card.name)).join(", ");
}

export function buildMetaCardRows(metaDecks: MetaDeck[]): MetaCardRow[] {
  const map = new Map<string, { name: string; games: number; wins: number }>();
  let totalGames = 0;

  for (const deck of metaDecks) {
    const deckGames = toFiniteNumber(deck.games, 0);
    const safeDeckGames = deckGames > 0 ? deckGames : 1;
    totalGames += safeDeckGames;

    const deckWinRate =
      deckGames > 0 ? clamp(toFiniteNumber(deck.wins, 0) / deckGames, 0, 1) : clamp(toFiniteNumber(deck.winRateEstimate, 50) / 100, 0, 1);

    for (const cardName of (deck.cards || []).slice(0, 8)) {
      const key = normalizeCardKey(cardName);
      if (!key) continue;

      const current = map.get(key) ?? { name: cardName, games: 0, wins: 0 };
      current.games += safeDeckGames;
      current.wins += deckWinRate * safeDeckGames;
      map.set(key, current);
    }
  }

  const safeTotalGames = totalGames > 0 ? totalGames : 1;

  return Array.from(map.entries()).map(([key, entry]) => {
    const usageRate = clamp(entry.games / safeTotalGames, 0, 1);
    const winRate = entry.games > 0 ? clamp(entry.wins / entry.games, 0, 1) : 0;
    const group = classifyMetaCard(entry.name);

    return {
      key,
      name: entry.name,
      group,
      games: entry.games,
      wins: entry.wins,
      usageRate,
      winRate,
    };
  });
}
