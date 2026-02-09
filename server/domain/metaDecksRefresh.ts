import { sql } from "drizzle-orm";
import { db } from "../db";
import { getClanMembers, getClanRankings, getPlayerBattles, getTopPlayersInLocation } from "../clashRoyaleApi";
import { serviceStorage } from "../storage";
import type { InsertMetaDeckCache } from "@shared/schema";
import { computeAvgElixir, detectArchetype, getCardIndex, normalizeDeckHash } from "./decks";

type RefreshResult = "refreshed" | "skipped" | "failed";

type RefreshOptions = {
  ttlMs: number;
  players: number;
  battlesPerPlayer: number;
};

const META_REFRESH_LOCK_ID = 82_003_771; // arbitrary constant, stable across deploys

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

type PlayerSeed = {
  tag: string;
  trophies: number | null;
};

async function getPlayerSeeds({ players }: { players: number }): Promise<{ seeds: PlayerSeed[]; sourceRange: string } | null> {
  const topPlayers = await getTopPlayersInLocation("global", players);
  const items = Array.isArray((topPlayers.data as any)?.items) ? ((topPlayers.data as any).items as any[]) : [];

  if (topPlayers.data && items.length > 0) {
    const seeds: PlayerSeed[] = items
      .map((player) => {
        const tag = typeof player?.tag === "string" ? player.tag : null;
        if (!tag) return null;
        const trophies =
          typeof player?.trophies === "number" && Number.isFinite(player.trophies) ? (player.trophies as number) : null;
        return { tag, trophies } satisfies PlayerSeed;
      })
      .filter(Boolean) as PlayerSeed[];

    return {
      seeds: seeds.slice(0, players),
      sourceRange: `global_top_${Math.min(players, seeds.length)}`,
    };
  }

  // Fallback: player rankings may return an empty list in some environments. Use top clans, then sample members.
  console.warn(
    JSON.stringify({
      provider: "clash-royale",
      route: "meta-decks-refresh",
      message: "Player rankings empty. Falling back to clan rankings.",
      at: new Date().toISOString(),
    }),
  );

  const clans = await getClanRankings("global");
  const clanItems = Array.isArray((clans.data as any)?.items) ? ((clans.data as any).items as any[]) : [];
  if (!clans.data || clanItems.length === 0) {
    console.error(
      JSON.stringify({
        provider: "clash-royale",
        route: "meta-decks-refresh",
        message: "Clan rankings unavailable for fallback.",
        status: clans.status,
        error: clans.error,
        at: new Date().toISOString(),
      }),
    );
    return null;
  }

  const perClan = 5;
  const clansToFetch = Math.max(10, Math.ceil(players / perClan));
  const clanTags: string[] = clanItems
    .map((clan) => (typeof clan?.tag === "string" ? clan.tag : null))
    .filter(Boolean)
    .slice(0, Math.min(50, clansToFetch)) as string[];

  if (clanTags.length === 0) {
    return null;
  }

  const membersByClan = await mapWithConcurrency(
    clanTags,
    3,
    async (clanTag) => {
      const res = await getClanMembers(clanTag);
      const items = Array.isArray((res.data as any)?.items) ? ((res.data as any).items as any[]) : [];
      return {
        clanTag,
        ok: Boolean(res.data),
        status: res.status,
        error: res.error,
        members: items,
      };
    },
  );

  const seeds: PlayerSeed[] = [];
  const seen = new Set<string>();

  for (const clan of membersByClan) {
    if (!clan.ok) {
      console.warn(
        JSON.stringify({
          provider: "clash-royale",
          route: "meta-decks-refresh",
          message: "Failed to fetch clan members for fallback.",
          clanTag: clan.clanTag,
          status: clan.status,
          error: clan.error,
          at: new Date().toISOString(),
        }),
      );
      continue;
    }

    const sortedMembers = (Array.isArray(clan.members) ? clan.members : [])
      .map((m) => {
        const tag = typeof m?.tag === "string" ? m.tag : null;
        if (!tag) return null;
        const trophies = typeof m?.trophies === "number" && Number.isFinite(m.trophies) ? (m.trophies as number) : null;
        return { tag, trophies } satisfies PlayerSeed;
      })
      .filter(Boolean) as PlayerSeed[];

    sortedMembers.sort((a, b) => (b.trophies ?? 0) - (a.trophies ?? 0));

    for (const member of sortedMembers.slice(0, perClan)) {
      const key = normalizeKey(member.tag);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      seeds.push(member);
      if (seeds.length >= players) break;
    }

    if (seeds.length >= players) break;
  }

  if (seeds.length === 0) {
    console.error(
      JSON.stringify({
        provider: "clash-royale",
        route: "meta-decks-refresh",
        message: "Fallback failed to find any player tags from clans.",
        clansTried: clanTags.length,
        at: new Date().toISOString(),
      }),
    );
    return null;
  }

  console.info(
    JSON.stringify({
      provider: "clash-royale",
      route: "meta-decks-refresh",
      message: "Using clan fallback for meta decks refresh.",
      clansTried: clanTags.length,
      players: seeds.length,
      at: new Date().toISOString(),
    }),
  );

  return {
    seeds: seeds.slice(0, players),
    sourceRange: `global_clan_top_${clanTags.length}_members_${seeds.length}`,
  };
}

function extractDeckCards(teamEntry: any): string[] | null {
  const cards = Array.isArray(teamEntry?.cards) ? (teamEntry.cards as any[]) : [];
  const names = cards
    .map((card) => (typeof card?.name === "string" ? card.name.trim() : ""))
    .filter(Boolean);

  if (names.length !== 8) return null;

  // Require uniqueness by normalized name.
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

function getBattleSideTrophies(entry: any): number | null {
  const starting = entry?.startingTrophies;
  if (typeof starting === "number" && Number.isFinite(starting)) return starting;
  const trophies = entry?.trophies;
  if (typeof trophies === "number" && Number.isFinite(trophies)) return trophies;
  return null;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const limit = Math.max(1, Math.min(10, Math.floor(concurrency)));
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const idx = cursor;
      cursor += 1;
      results[idx] = await fn(items[idx]!);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function refreshMetaDecksCacheIfStale(options: RefreshOptions): Promise<RefreshResult> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - Math.max(60_000, options.ttlMs));

  try {
    const lastUpdated = await serviceStorage.getMetaDecksLastUpdated();
    if (lastUpdated && lastUpdated > cutoff) {
      return "skipped";
    }

    const lock = await db.execute(sql`select pg_try_advisory_lock(${META_REFRESH_LOCK_ID}) as locked`);
    const locked = Boolean((lock as any)?.rows?.[0]?.locked ?? false);
    if (!locked) {
      return "skipped";
    }

    try {
      // Re-check staleness after acquiring the lock (another request may have refreshed).
      const lastUpdatedAfterLock = await serviceStorage.getMetaDecksLastUpdated();
      if (lastUpdatedAfterLock && lastUpdatedAfterLock > cutoff) {
        return "skipped";
      }

      const cardIndex = await getCardIndex().catch(() => ({ byNameLower: new Map() }));

      const playerSeedResult = await getPlayerSeeds({ players: options.players });
      if (!playerSeedResult) {
        return "failed";
      }

      const trophiesByTag = new Map<string, number>();
      const tags: string[] = [];
      for (const seed of playerSeedResult.seeds) {
        tags.push(seed.tag);
        if (typeof seed.trophies === "number" && Number.isFinite(seed.trophies)) {
          trophiesByTag.set(normalizeKey(seed.tag), seed.trophies);
        }
      }

      type Agg = {
        deckHash: string;
        cards: string[];
        games: number;
        wins: number;
        losses: number;
        draws: number;
        trophiesSum: number;
        trophiesCount: number;
      };

      const deckMap = new Map<string, Agg>();

      const battlesByPlayer = await mapWithConcurrency(
        tags,
        5,
        async (tag) => {
          const res = await getPlayerBattles(tag);
          if (!res.data) return { tag, battles: [] as any[] };
          const battles = Array.isArray(res.data) ? (res.data as any[]) : [];
          return { tag, battles };
        },
      );

      for (const { tag, battles } of battlesByPlayer) {
        const tagKey = normalizeKey(tag);
        const fallbackTrophies = trophiesByTag.get(tagKey) ?? null;
        const slice = battles.slice(0, Math.max(1, Math.min(50, options.battlesPerPlayer)));

        for (const battle of slice) {
          const team = Array.isArray(battle?.team) ? battle.team : null;
          const opponent = Array.isArray(battle?.opponent) ? battle.opponent : null;
          if (!team || !opponent || team.length !== 1 || opponent.length !== 1) continue;

          const teamEntry = team[0];
          const oppEntry = opponent[0];

          const teamCards = extractDeckCards(teamEntry);
          const oppCards = extractDeckCards(oppEntry);
          if (!teamCards || !oppCards) continue;

          const teamCrowns = getCrowns(teamEntry);
          const oppCrowns = getCrowns(oppEntry);

          const teamResult = teamCrowns > oppCrowns ? "win" : teamCrowns < oppCrowns ? "loss" : "draw";
          const oppResult = teamResult === "win" ? "loss" : teamResult === "loss" ? "win" : "draw";

          const teamTrophies = getBattleSideTrophies(teamEntry) ?? fallbackTrophies;
          const oppTrophies = getBattleSideTrophies(oppEntry);

          const upsertAgg = (cards: string[], result: "win" | "loss" | "draw", trophies: number | null) => {
            const deckHash = normalizeDeckHash(cards);
            const existing =
              deckMap.get(deckHash) ||
              ({
                deckHash,
                cards,
                games: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                trophiesSum: 0,
                trophiesCount: 0,
              } satisfies Agg);

            existing.games += 1;
            if (result === "win") existing.wins += 1;
            if (result === "loss") existing.losses += 1;
            if (result === "draw") existing.draws += 1;
            if (typeof trophies === "number" && Number.isFinite(trophies)) {
              existing.trophiesSum += trophies;
              existing.trophiesCount += 1;
            }

            deckMap.set(deckHash, existing);
          };

          upsertAgg(teamCards, teamResult, teamTrophies);
          upsertAgg(oppCards, oppResult, oppTrophies);
        }
      }

      const aggregates = Array.from(deckMap.values());
      if (aggregates.length === 0) {
        return "failed";
      }

      const sourceRegion = "global";
      const sourceRange = `${playerSeedResult.sourceRange}_last_${options.battlesPerPlayer}`;

      const rows: InsertMetaDeckCache[] = aggregates
        .map((agg) => {
          const avgTrophies = agg.trophiesCount > 0 ? Math.round(agg.trophiesSum / agg.trophiesCount) : null;
          const winRateEstimate = ((agg.wins + 1) / (agg.games + 2)) * 100;
          const avgElixir = computeAvgElixir(agg.cards, cardIndex);
          return {
            deckHash: agg.deckHash,
            cards: agg.cards,
            usageCount: agg.games,
            avgTrophies,
            archetype: detectArchetype(agg.cards),
            wins: agg.wins,
            losses: agg.losses,
            draws: agg.draws,
            avgElixir,
            winRateEstimate: Number(winRateEstimate.toFixed(2)),
            sourceRegion,
            sourceRange,
            lastUpdatedAt: now,
          };
        })
        .sort((a, b) => {
          if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
          if ((b.winRateEstimate ?? 0) !== (a.winRateEstimate ?? 0)) return (b.winRateEstimate ?? 0) - (a.winRateEstimate ?? 0);
          return (b.avgTrophies ?? 0) - (a.avgTrophies ?? 0);
        })
        .slice(0, 50);

      if (rows.length === 0) {
        return "failed";
      }

      await serviceStorage.replaceMetaDecks(rows);
      return "refreshed";
    } finally {
      await db.execute(sql`select pg_advisory_unlock(${META_REFRESH_LOCK_ID})`).catch(() => undefined);
    }
  } catch (error) {
    console.error("Failed to refresh meta decks cache:", error);
    return "failed";
  }
}
