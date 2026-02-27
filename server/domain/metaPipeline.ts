/**
 * Meta Deck Data Pipeline (Story 2.1, AC1-AC2, AC9)
 *
 * Collects top-performing decks per arena from Clash Royale API battle data.
 * Runs as a daily scheduled job. Segments decks by arena (10-20 + Legendary).
 * Respects API rate limits (20 req/s) with batching and exponential backoff.
 * Minimum 50 battles sample size for a deck to appear in results.
 */
import { getTopPlayersInLocation, getPlayerBattles, getClanRankings, getClanMembers } from "../clashRoyaleApi";
import { computeAvgElixir, detectArchetype, getCardIndex, normalizeDeckHash } from "./decks";
import { logger } from "../logger";

// ── Constants ────────────────────────────────────────────────────────────────

export const MIN_SAMPLE_SIZE = 50;
const API_RATE_LIMIT_PER_SECOND = 20;
const MAX_CONCURRENT_REQUESTS = 5;
const BASE_BACKOFF_MS = 500;
const MAX_RETRIES = 3;

// Arena IDs in Clash Royale (10-20 + Legendary = 54)
export const TRACKED_ARENAS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 54] as const;
export type TrackedArenaId = (typeof TRACKED_ARENAS)[number];

// ── Types ────────────────────────────────────────────────────────────────────

export interface BattleAggregation {
  deckHash: string;
  cards: string[];
  arenaId: number;
  wins: number;
  losses: number;
  draws: number;
  threeCrowns: number;
  totalGames: number;
}

export interface ArenaMetaDeckResult {
  arenaId: number;
  deckHash: string;
  cards: string[];
  winRate: number;
  usageRate: number;
  threeCrownRate: number;
  avgElixir: number;
  sampleSize: number;
  archetype: string;
}

export interface CounterDeckResult {
  arenaId: number;
  targetCard: string;
  deckHash: string;
  cards: string[];
  winRateVsTarget: number;
  sampleSize: number;
  threeCrownRate: number;
}

export interface PipelineResult {
  metaDecks: ArenaMetaDeckResult[];
  counterDecks: CounterDeckResult[];
  stats: {
    playersProcessed: number;
    battlesProcessed: number;
    arenasWithData: number;
    duration: number;
  };
}

interface PlayerSeed {
  tag: string;
  trophies: number | null;
  arenaId: number | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Map arena ID from CR API to our tracked arenas.
 * Arena IDs above 20 are treated as Legendary Arena (54).
 * Arena IDs below 10 are ignored (too low level for meaningful meta).
 */
export function mapArenaId(arenaId: number | null | undefined): number | null {
  if (typeof arenaId !== "number" || !Number.isFinite(arenaId)) return null;
  if (arenaId < 10) return null;
  if (arenaId > 20) return 54; // Legendary Arena
  return arenaId;
}

/**
 * Extract arena ID from a battle entry's team member data.
 */
function extractArenaIdFromBattle(battle: any): number | null {
  // CR API battle log has arena info
  const arenaObj = battle?.arena;
  if (arenaObj && typeof arenaObj === "object") {
    const id = arenaObj.id;
    if (typeof id === "number" && Number.isFinite(id)) {
      return mapArenaId(id);
    }
  }

  // Fallback: infer from trophy count
  const trophies = battle?.team?.[0]?.startingTrophies ?? battle?.team?.[0]?.trophies;
  if (typeof trophies === "number" && Number.isFinite(trophies)) {
    return arenaIdFromTrophies(trophies);
  }

  return null;
}

/**
 * Approximate arena from trophy count.
 * This is a rough mapping for when we don't have exact arena data.
 */
export function arenaIdFromTrophies(trophies: number): number | null {
  if (trophies < 3000) return null; // Below arena 10
  if (trophies < 3300) return 10;
  if (trophies < 3600) return 11;
  if (trophies < 4000) return 12;
  if (trophies < 4300) return 13;
  if (trophies < 4600) return 14;
  if (trophies < 5000) return 15;
  if (trophies < 5300) return 16;
  if (trophies < 5600) return 17;
  if (trophies < 6000) return 18;
  if (trophies < 6300) return 19;
  if (trophies < 6600) return 20;
  return 54; // Legendary Arena
}

function extractDeckCards(teamEntry: any): string[] | null {
  const cards = Array.isArray(teamEntry?.cards) ? (teamEntry.cards as any[]) : [];
  const names = cards
    .map((card) => (typeof card?.name === "string" ? card.name.trim() : ""))
    .filter(Boolean);

  if (names.length !== 8) return null;

  const seen = new Set<string>();
  for (const name of names) {
    const key = normalizeKey(name);
    if (seen.has(key)) return null;
    seen.add(key);
  }

  return names;
}

function getCrowns(entry: any): number {
  const crowns = entry?.crowns;
  if (typeof crowns === "number" && Number.isFinite(crowns)) return crowns;
  return 0;
}

/**
 * Concurrency-limited parallel execution with rate limiting.
 */
async function mapWithRateLimit<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const limit = Math.max(1, Math.min(MAX_CONCURRENT_REQUESTS, Math.floor(concurrency)));
  const results: R[] = new Array(items.length);
  let cursor = 0;
  let lastRequestTime = 0;

  async function worker() {
    while (cursor < items.length) {
      const idx = cursor;
      cursor += 1;

      // Rate limit: ensure we don't exceed API_RATE_LIMIT_PER_SECOND
      const now = Date.now();
      const elapsed = now - lastRequestTime;
      const minInterval = 1000 / API_RATE_LIMIT_PER_SECOND;
      if (elapsed < minInterval) {
        await new Promise((resolve) => setTimeout(resolve, minInterval - elapsed));
      }
      lastRequestTime = Date.now();

      results[idx] = await fn(items[idx]!);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Fetch with exponential backoff for rate limit errors.
 */
async function fetchWithBackoff<T>(fn: () => Promise<{ data?: T; error?: string; status: number }>): Promise<{ data?: T; error?: string; status: number }> {
  let retries = 0;
  while (retries <= MAX_RETRIES) {
    const result = await fn();
    if (result.status !== 429 || retries >= MAX_RETRIES) return result;

    const delay = BASE_BACKOFF_MS * Math.pow(2, retries);
    logger.warn("Rate limited by CR API, backing off", { delay, retries });
    await new Promise((resolve) => setTimeout(resolve, delay));
    retries++;
  }
  return { error: "Max retries exceeded", status: 429 };
}

// ── Player Seed Collection ──────────────────────────────────────────────────

async function getPlayerSeeds(options: { players: number }): Promise<PlayerSeed[]> {
  const seeds: PlayerSeed[] = [];
  const seen = new Set<string>();

  // First: try top players from global rankings
  const topPlayers = await fetchWithBackoff(() => getTopPlayersInLocation("global", Math.min(200, options.players)));
  const items = Array.isArray((topPlayers.data as any)?.items) ? ((topPlayers.data as any).items as any[]) : [];

  for (const player of items) {
    const tag = typeof player?.tag === "string" ? player.tag : null;
    if (!tag || seen.has(normalizeKey(tag))) continue;
    seen.add(normalizeKey(tag));

    const trophies = typeof player?.trophies === "number" ? player.trophies : null;
    const arenaId = trophies !== null ? arenaIdFromTrophies(trophies) : null;
    seeds.push({ tag, trophies, arenaId });
  }

  // Second: try clan rankings to get more diverse trophy ranges
  if (seeds.length < options.players) {
    const clans = await fetchWithBackoff(() => getClanRankings("global"));
    const clanItems = Array.isArray((clans.data as any)?.items) ? ((clans.data as any).items as any[]) : [];
    const clanTags = clanItems
      .map((c) => (typeof c?.tag === "string" ? c.tag : null))
      .filter(Boolean)
      .slice(0, 20) as string[];

    const membersByClans = await mapWithRateLimit(
      clanTags,
      3,
      async (clanTag) => {
        const res = await fetchWithBackoff(() => getClanMembers(clanTag));
        return Array.isArray((res.data as any)?.items) ? ((res.data as any).items as any[]) : [];
      },
    );

    for (const members of membersByClans) {
      if (seeds.length >= options.players) break;
      const sorted = members
        .map((m) => ({
          tag: typeof m?.tag === "string" ? m.tag : null,
          trophies: typeof m?.trophies === "number" ? m.trophies : null,
        }))
        .filter((m): m is { tag: string; trophies: number | null } => m.tag !== null)
        .sort((a, b) => (b.trophies ?? 0) - (a.trophies ?? 0));

      for (const member of sorted.slice(0, 5)) {
        if (seeds.length >= options.players) break;
        if (seen.has(normalizeKey(member.tag))) continue;
        seen.add(normalizeKey(member.tag));
        const arenaId = member.trophies !== null ? arenaIdFromTrophies(member.trophies) : null;
        seeds.push({ tag: member.tag, trophies: member.trophies, arenaId });
      }
    }
  }

  logger.info("Player seeds collected for meta pipeline", {
    totalSeeds: seeds.length,
    requested: options.players,
  });

  return seeds.slice(0, options.players);
}

// ── Core Pipeline ───────────────────────────────────────────────────────────

export interface MetaPipelineOptions {
  players?: number;
  battlesPerPlayer?: number;
}

export async function runMetaPipeline(options: MetaPipelineOptions = {}): Promise<PipelineResult> {
  const startMs = Date.now();
  const playerCount = options.players ?? 200;
  const battlesPerPlayer = options.battlesPerPlayer ?? 25;

  const cardIndex = await getCardIndex().catch(() => ({ byNameLower: new Map() as any }));
  const seeds = await getPlayerSeeds({ players: playerCount });

  if (seeds.length === 0) {
    logger.error("Meta pipeline: no player seeds available");
    return {
      metaDecks: [],
      counterDecks: [],
      stats: { playersProcessed: 0, battlesProcessed: 0, arenasWithData: 0, duration: Date.now() - startMs },
    };
  }

  // Fetch battle logs with rate limiting
  const battlesByPlayer = await mapWithRateLimit(
    seeds.map((s) => s.tag),
    MAX_CONCURRENT_REQUESTS,
    async (tag) => {
      const res = await fetchWithBackoff(() => getPlayerBattles(tag));
      if (!res.data) return { tag, battles: [] as any[] };
      return { tag, battles: Array.isArray(res.data) ? (res.data as any[]) : [] };
    },
  );

  // Build aggregations keyed by arenaId+deckHash
  type AggKey = string; // `${arenaId}:${deckHash}`
  const deckAgg = new Map<AggKey, BattleAggregation>();

  // For counter deck calculation: track matchup data
  // Key: `${arenaId}:${winnerDeckHash}:${loserCard}` => wins count
  type MatchupKey = string;
  const matchupWins = new Map<MatchupKey, { deckHash: string; cards: string[]; arenaId: number; targetCard: string; wins: number; totalVs: number; threeCrowns: number }>();

  let totalBattles = 0;
  const trophyByTag = new Map<string, number>();
  for (const seed of seeds) {
    if (seed.trophies !== null) trophyByTag.set(normalizeKey(seed.tag), seed.trophies);
  }

  for (const { tag, battles } of battlesByPlayer) {
    const slice = battles.slice(0, battlesPerPlayer);
    const fallbackArena = seeds.find((s) => normalizeKey(s.tag) === normalizeKey(tag))?.arenaId ?? null;

    for (const battle of slice) {
      const team = Array.isArray(battle?.team) ? battle.team : null;
      const opponent = Array.isArray(battle?.opponent) ? battle.opponent : null;
      if (!team || !opponent || team.length !== 1 || opponent.length !== 1) continue;

      const teamCards = extractDeckCards(team[0]);
      const oppCards = extractDeckCards(opponent[0]);
      if (!teamCards || !oppCards) continue;

      const arenaId = extractArenaIdFromBattle(battle) ?? fallbackArena;
      if (arenaId === null) continue;

      totalBattles++;

      const teamCrowns = getCrowns(team[0]);
      const oppCrowns = getCrowns(opponent[0]);
      const teamResult = teamCrowns > oppCrowns ? "win" : teamCrowns < oppCrowns ? "loss" : "draw";
      const oppResult = teamResult === "win" ? "loss" : teamResult === "loss" ? "win" : "draw";

      const upsertDeckAgg = (cards: string[], result: "win" | "loss" | "draw", crowns: number, arena: number) => {
        const hash = normalizeDeckHash(cards);
        const key: AggKey = `${arena}:${hash}`;
        const existing = deckAgg.get(key) ?? {
          deckHash: hash,
          cards,
          arenaId: arena,
          wins: 0,
          losses: 0,
          draws: 0,
          threeCrowns: 0,
          totalGames: 0,
        };

        existing.totalGames++;
        if (result === "win") existing.wins++;
        if (result === "loss") existing.losses++;
        if (result === "draw") existing.draws++;
        if (result === "win" && crowns >= 3) existing.threeCrowns++;

        deckAgg.set(key, existing);
      };

      upsertDeckAgg(teamCards, teamResult, teamCrowns, arenaId);
      upsertDeckAgg(oppCards, oppResult, oppCrowns, arenaId);

      // Track matchups for counter deck calculation
      if (teamResult === "win") {
        // teamCards beat oppCards — record wins against each card in oppCards
        for (const card of oppCards) {
          const cardKey = normalizeKey(card);
          const winnerHash = normalizeDeckHash(teamCards);
          const mKey: MatchupKey = `${arenaId}:${winnerHash}:${cardKey}`;
          const existing = matchupWins.get(mKey) ?? {
            deckHash: winnerHash,
            cards: teamCards,
            arenaId,
            targetCard: cardKey,
            wins: 0,
            totalVs: 0,
            threeCrowns: 0,
          };
          existing.wins++;
          if (teamCrowns >= 3) existing.threeCrowns++;
          matchupWins.set(mKey, existing);
        }
      }

      if (oppResult === "win") {
        for (const card of teamCards) {
          const cardKey = normalizeKey(card);
          const winnerHash = normalizeDeckHash(oppCards);
          const mKey: MatchupKey = `${arenaId}:${winnerHash}:${cardKey}`;
          const existing = matchupWins.get(mKey) ?? {
            deckHash: winnerHash,
            cards: oppCards,
            arenaId,
            targetCard: cardKey,
            wins: 0,
            totalVs: 0,
            threeCrowns: 0,
          };
          existing.wins++;
          if (oppCrowns >= 3) existing.threeCrowns++;
          matchupWins.set(mKey, existing);
        }
      }

      // Track total games vs each card for win rate calculation
      for (const card of oppCards) {
        const cardKey = normalizeKey(card);
        const teamHash = normalizeDeckHash(teamCards);
        const mKey: MatchupKey = `${arenaId}:${teamHash}:${cardKey}`;
        const existing = matchupWins.get(mKey) ?? {
          deckHash: teamHash,
          cards: teamCards,
          arenaId,
          targetCard: cardKey,
          wins: 0,
          totalVs: 0,
          threeCrowns: 0,
        };
        existing.totalVs++;
        matchupWins.set(mKey, existing);
      }
      for (const card of teamCards) {
        const cardKey = normalizeKey(card);
        const oppHash = normalizeDeckHash(oppCards);
        const mKey: MatchupKey = `${arenaId}:${oppHash}:${cardKey}`;
        const existing = matchupWins.get(mKey) ?? {
          deckHash: oppHash,
          cards: oppCards,
          arenaId,
          targetCard: cardKey,
          wins: 0,
          totalVs: 0,
          threeCrowns: 0,
        };
        existing.totalVs++;
        matchupWins.set(mKey, existing);
      }
    }
  }

  // Build meta deck results — only decks with >= MIN_SAMPLE_SIZE
  const arenaGamesMap = new Map<number, number>();
  for (const agg of Array.from(deckAgg.values())) {
    arenaGamesMap.set(agg.arenaId, (arenaGamesMap.get(agg.arenaId) ?? 0) + agg.totalGames);
  }

  const metaDecks: ArenaMetaDeckResult[] = [];
  for (const agg of Array.from(deckAgg.values())) {
    if (agg.totalGames < MIN_SAMPLE_SIZE) continue;

    const arenaTotal = arenaGamesMap.get(agg.arenaId) ?? 1;
    const winRate = agg.totalGames > 0 ? (agg.wins / agg.totalGames) * 100 : 0;
    const usageRate = agg.totalGames / arenaTotal;
    const threeCrownRate = agg.totalGames > 0 ? (agg.threeCrowns / agg.totalGames) * 100 : 0;
    const avgElixir = computeAvgElixir(agg.cards, cardIndex);
    const archetype = detectArchetype(agg.cards);

    metaDecks.push({
      arenaId: agg.arenaId,
      deckHash: agg.deckHash,
      cards: agg.cards,
      winRate: Number(winRate.toFixed(2)),
      usageRate: Number(usageRate.toFixed(4)),
      threeCrownRate: Number(threeCrownRate.toFixed(2)),
      avgElixir,
      sampleSize: agg.totalGames,
      archetype,
    });
  }

  // Sort meta decks by win rate descending within each arena
  metaDecks.sort((a, b) => {
    if (a.arenaId !== b.arenaId) return a.arenaId - b.arenaId;
    return b.winRate - a.winRate;
  });

  // Build counter deck results
  const counterDecks: CounterDeckResult[] = [];
  for (const m of Array.from(matchupWins.values())) {
    if (m.totalVs < MIN_SAMPLE_SIZE) continue;
    if (m.wins === 0) continue;

    const winRateVs = (m.wins / m.totalVs) * 100;
    const threeCrownRate = m.totalVs > 0 ? (m.threeCrowns / m.totalVs) * 100 : 0;

    counterDecks.push({
      arenaId: m.arenaId,
      targetCard: m.targetCard,
      deckHash: m.deckHash,
      cards: m.cards,
      winRateVsTarget: Number(winRateVs.toFixed(2)),
      sampleSize: m.totalVs,
      threeCrownRate: Number(threeCrownRate.toFixed(2)),
    });
  }

  // Sort counter decks by win rate vs target
  counterDecks.sort((a, b) => b.winRateVsTarget - a.winRateVsTarget);

  const arenasWithData = new Set(metaDecks.map((d) => d.arenaId)).size;
  const duration = Date.now() - startMs;

  logger.info("Meta pipeline completed", {
    playersProcessed: seeds.length,
    battlesProcessed: totalBattles,
    metaDecks: metaDecks.length,
    counterDecks: counterDecks.length,
    arenasWithData,
    duration,
  });

  return {
    metaDecks,
    counterDecks,
    stats: {
      playersProcessed: seeds.length,
      battlesProcessed: totalBattles,
      arenasWithData,
      duration,
    },
  };
}
