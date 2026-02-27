/**
 * Stats Engine (Story 2.4)
 *
 * Processes battle history to compute advanced statistics:
 * - Per-deck stats with 3-crown rate (AC1, AC2)
 * - Card win rates with minimum 10 battle filter (AC3)
 * - Matchup data against opposing archetypes (AC5, AC6)
 * - Season summaries (AC7, AC8)
 *
 * Stats are calculated server-side and cached in battleStatsCache / cardPerformance tables (AC10).
 */

import { normalizeDeckHash, detectArchetype } from "./decks";
import { extractBattleTime } from "./battleHistory";
import { logger } from "../logger";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ProcessedBattleData {
  deckHash: string;
  cards: string[];
  result: "win" | "loss" | "draw";
  crowns: number;
  opponentCrowns: number;
  opponentCards: string[];
  opponentDeckHash: string;
  opponentArchetype: string;
  arenaId: number | null;
  season: number;
  battleTime: Date;
}

export interface DeckStatsResult {
  deckHash: string;
  cards: string[];
  battles: number;
  wins: number;
  threeCrowns: number;
  threeCrownRate: number;
  winRate: number;
  avgElixir: number | null;
  archetype: string;
}

export interface CardWinRateResult {
  cardId: string;
  battles: number;
  wins: number;
  winRate: number;
}

export interface SeasonSummary {
  season: number;
  totalBattles: number;
  wins: number;
  losses: number;
  winRate: number;
  peakTrophies: number | null;
  mostUsedDeck: { deckHash: string; cards: string[]; battles: number } | null;
  bestCard: { cardId: string; winRate: number; battles: number } | null;
}

export interface MatchupResult {
  opponentArchetype: string;
  battles: number;
  wins: number;
  winRate: number;
}

export interface BattleStatsCacheRow {
  userId: string;
  season: number;
  deckHash: string;
  battles: number;
  wins: number;
  threeCrowns: number;
  avgElixir: number | null;
  opponentArchetypes: Record<string, { battles: number; wins: number }>;
}

export interface CardPerformanceRow {
  userId: string;
  cardId: string;
  season: number;
  battles: number;
  wins: number;
}

// ── Season Derivation ────────────────────────────────────────────────────────

/**
 * Clash Royale seasons reset on the first Monday of each month.
 * We approximate season number as (year - 2016) * 12 + month.
 * This gives a monotonically increasing season number.
 */
export function getSeasonFromDate(date: Date): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1; // 1-indexed
  return (year - 2016) * 12 + month;
}

/**
 * Get the current season number.
 */
export function getCurrentSeason(): number {
  return getSeasonFromDate(new Date());
}

/**
 * Get a human-readable season label (e.g., "Feb 2026").
 */
export function getSeasonLabel(season: number): string {
  const monthIndex = ((season - 1) % 12);
  const year = 2016 + Math.floor((season - 1) / 12);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[monthIndex]} ${year}`;
}

// ── Battle Processing ────────────────────────────────────────────────────────

function normalizeCardName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function extractDeckCards(teamEntry: any): string[] {
  const cards = Array.isArray(teamEntry?.cards) ? (teamEntry.cards as any[]) : [];
  return cards
    .map((card) => normalizeCardName(card?.name))
    .filter((name): name is string => name !== null);
}

function getCrowns(entry: any): number {
  const crowns = entry?.crowns;
  if (typeof crowns === "number" && Number.isFinite(crowns)) return crowns;
  return 0;
}

function extractArenaId(battle: any): number | null {
  const arenaObj = battle?.arena;
  if (arenaObj && typeof arenaObj === "object") {
    const id = arenaObj.id;
    if (typeof id === "number" && Number.isFinite(id)) return id;
  }
  const trophies = battle?.team?.[0]?.startingTrophies ?? battle?.team?.[0]?.trophies;
  if (typeof trophies === "number" && Number.isFinite(trophies) && trophies >= 3000) {
    if (trophies >= 6600) return 54;
    if (trophies >= 6300) return 20;
    if (trophies >= 6000) return 19;
    if (trophies >= 5600) return 18;
    if (trophies >= 5300) return 17;
    if (trophies >= 5000) return 16;
    if (trophies >= 4600) return 15;
    if (trophies >= 4300) return 14;
    if (trophies >= 4000) return 13;
    if (trophies >= 3600) return 12;
    if (trophies >= 3300) return 11;
    return 10;
  }
  return null;
}

/**
 * Extract structured data from a raw battle entry.
 * Returns null if the battle cannot be processed (missing data).
 */
export function extractBattleData(battle: any): ProcessedBattleData | null {
  const team = Array.isArray(battle?.team) ? battle.team : null;
  const opponent = Array.isArray(battle?.opponent) ? battle.opponent : null;
  if (!team || !opponent || team.length === 0 || opponent.length === 0) return null;

  const myCards = extractDeckCards(team[0]);
  const oppCards = extractDeckCards(opponent[0]);
  if (myCards.length === 0) return null;

  const myCrowns = getCrowns(team[0]);
  const oppCrowns = getCrowns(opponent[0]);
  const result: "win" | "loss" | "draw" =
    myCrowns > oppCrowns ? "win" : myCrowns < oppCrowns ? "loss" : "draw";

  // Parse battle time
  let battleTime: Date;
  const rawTime = battle?.battleTime;
  if (typeof rawTime === "string") {
    const parsed = extractBattleTime(rawTime);
    if (!parsed) return null;
    battleTime = parsed;
  } else if (rawTime instanceof Date) {
    battleTime = rawTime;
  } else {
    return null;
  }

  const season = getSeasonFromDate(battleTime);
  const arenaId = extractArenaId(battle);

  const deckHash = normalizeDeckHash(myCards);
  const opponentDeckHash = normalizeDeckHash(oppCards);
  const opponentArchetype = oppCards.length > 0 ? detectArchetype(oppCards) : "Unknown";

  return {
    deckHash,
    cards: myCards,
    result,
    crowns: myCrowns,
    opponentCrowns: oppCrowns,
    opponentCards: oppCards,
    opponentDeckHash,
    opponentArchetype,
    arenaId,
    season,
    battleTime,
  };
}

// ── Stats Aggregation ────────────────────────────────────────────────────────

/**
 * Process an array of raw battles into aggregated stats ready for caching.
 * Returns battleStatsCache rows and cardPerformance rows.
 */
export function processBattleStats(
  userId: string,
  battles: any[],
): {
  deckStats: BattleStatsCacheRow[];
  cardStats: CardPerformanceRow[];
} {
  // Deck stats: keyed by season + deckHash
  const deckMap = new Map<string, BattleStatsCacheRow>();
  // Card stats: keyed by season + cardId
  const cardMap = new Map<string, CardPerformanceRow>();

  for (const rawBattle of battles) {
    const battle = extractBattleData(rawBattle);
    if (!battle) continue;

    // --- Deck stats ---
    const deckKey = `${battle.season}:${battle.deckHash}`;
    const existing = deckMap.get(deckKey) ?? {
      userId,
      season: battle.season,
      deckHash: battle.deckHash,
      battles: 0,
      wins: 0,
      threeCrowns: 0,
      avgElixir: null,
      opponentArchetypes: {},
    };

    existing.battles += 1;
    if (battle.result === "win") existing.wins += 1;
    if (battle.result === "win" && battle.crowns >= 3) existing.threeCrowns += 1;

    // Track matchup data per opponent archetype
    const archKey = battle.opponentArchetype;
    const archData = existing.opponentArchetypes[archKey] ?? { battles: 0, wins: 0 };
    archData.battles += 1;
    if (battle.result === "win") archData.wins += 1;
    existing.opponentArchetypes[archKey] = archData;

    deckMap.set(deckKey, existing);

    // --- Card stats ---
    for (const cardName of battle.cards) {
      const cardKey = `${battle.season}:${cardName}`;
      const cardRow = cardMap.get(cardKey) ?? {
        userId,
        cardId: cardName,
        season: battle.season,
        battles: 0,
        wins: 0,
      };

      cardRow.battles += 1;
      if (battle.result === "win") cardRow.wins += 1;
      cardMap.set(cardKey, cardRow);
    }
  }

  return {
    deckStats: Array.from(deckMap.values()),
    cardStats: Array.from(cardMap.values()),
  };
}

/**
 * Compute card win rates from cardPerformance rows.
 * Filters to cards with >= minBattles.
 */
export function computeCardWinRates(
  cardStats: CardPerformanceRow[],
  options: { minBattles?: number; season?: number } = {},
): CardWinRateResult[] {
  const minBattles = options.minBattles ?? 10;

  // Aggregate across seasons if no season filter, or filter to specific season
  const aggregated = new Map<string, { battles: number; wins: number }>();

  for (const row of cardStats) {
    if (options.season !== undefined && row.season !== options.season) continue;

    const existing = aggregated.get(row.cardId) ?? { battles: 0, wins: 0 };
    existing.battles += row.battles;
    existing.wins += row.wins;
    aggregated.set(row.cardId, existing);
  }

  return Array.from(aggregated.entries())
    .filter(([, stats]) => stats.battles >= minBattles)
    .map(([cardId, stats]) => ({
      cardId,
      battles: stats.battles,
      wins: stats.wins,
      winRate: stats.battles > 0 ? Number(((stats.wins / stats.battles) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.winRate - a.winRate);
}

/**
 * Compute deck stats from battleStatsCache rows.
 * Includes 3-crown rate.
 */
export function computeDeckStats(
  deckStats: BattleStatsCacheRow[],
  options: { season?: number } = {},
): DeckStatsResult[] {
  const aggregated = new Map<string, {
    deckHash: string;
    battles: number;
    wins: number;
    threeCrowns: number;
  }>();

  for (const row of deckStats) {
    if (options.season !== undefined && row.season !== options.season) continue;

    const existing = aggregated.get(row.deckHash) ?? {
      deckHash: row.deckHash,
      battles: 0,
      wins: 0,
      threeCrowns: 0,
    };
    existing.battles += row.battles;
    existing.wins += row.wins;
    existing.threeCrowns += row.threeCrowns;
    aggregated.set(row.deckHash, existing);
  }

  return Array.from(aggregated.values())
    .map((stats) => {
      // Reconstruct card names from deckHash (pipe-separated lowercase names)
      const cards = stats.deckHash.split("|").filter(Boolean);
      const archetype = detectArchetype(cards);

      return {
        deckHash: stats.deckHash,
        cards,
        battles: stats.battles,
        wins: stats.wins,
        threeCrowns: stats.threeCrowns,
        threeCrownRate: stats.battles > 0
          ? Number(((stats.threeCrowns / stats.battles) * 100).toFixed(1))
          : 0,
        winRate: stats.battles > 0
          ? Number(((stats.wins / stats.battles) * 100).toFixed(1))
          : 0,
        avgElixir: null,
        archetype,
      };
    })
    .sort((a, b) => b.battles - a.battles);
}

/**
 * Compute season summary from stats cache rows and card performance rows.
 */
export function computeSeasonSummary(
  season: number,
  deckStats: BattleStatsCacheRow[],
  cardStats: CardPerformanceRow[],
  peakTrophies: number | null = null,
): SeasonSummary {
  const seasonDecks = deckStats.filter((d) => d.season === season);
  const seasonCards = cardStats.filter((c) => c.season === season);

  let totalBattles = 0;
  let totalWins = 0;

  for (const deck of seasonDecks) {
    totalBattles += deck.battles;
    totalWins += deck.wins;
  }

  const totalLosses = totalBattles - totalWins;
  const winRate = totalBattles > 0
    ? Number(((totalWins / totalBattles) * 100).toFixed(1))
    : 0;

  // Most used deck
  let mostUsedDeck: SeasonSummary["mostUsedDeck"] = null;
  if (seasonDecks.length > 0) {
    const sorted = [...seasonDecks].sort((a, b) => b.battles - a.battles);
    const top = sorted[0]!;
    mostUsedDeck = {
      deckHash: top.deckHash,
      cards: top.deckHash.split("|").filter(Boolean),
      battles: top.battles,
    };
  }

  // Best card (highest win rate with >= 10 battles)
  let bestCard: SeasonSummary["bestCard"] = null;
  const cardWinRates = computeCardWinRates(seasonCards, { minBattles: 10, season });
  if (cardWinRates.length > 0) {
    const top = cardWinRates[0]!;
    bestCard = {
      cardId: top.cardId,
      winRate: top.winRate,
      battles: top.battles,
    };
  }

  return {
    season,
    totalBattles,
    wins: totalWins,
    losses: totalLosses,
    winRate,
    peakTrophies,
    mostUsedDeck,
    bestCard,
  };
}

/**
 * Compute matchup data for a specific deck against opposing archetypes.
 * Returns top 5 most common opposing archetypes with win rates.
 */
export function computeMatchupData(
  deckStats: BattleStatsCacheRow[],
  deckHash: string,
): MatchupResult[] {
  const archMap = new Map<string, { battles: number; wins: number }>();

  for (const row of deckStats) {
    if (row.deckHash !== deckHash) continue;

    const archetypes = row.opponentArchetypes || {};
    for (const [arch, data] of Object.entries(archetypes)) {
      const existing = archMap.get(arch) ?? { battles: 0, wins: 0 };
      existing.battles += data.battles;
      existing.wins += data.wins;
      archMap.set(arch, existing);
    }
  }

  return Array.from(archMap.entries())
    .map(([archetype, stats]) => ({
      opponentArchetype: archetype,
      battles: stats.battles,
      wins: stats.wins,
      winRate: stats.battles > 0
        ? Number(((stats.wins / stats.battles) * 100).toFixed(1))
        : 0,
    }))
    .sort((a, b) => b.battles - a.battles)
    .slice(0, 5);
}
