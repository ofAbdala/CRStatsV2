import { getCards } from "../clashRoyaleApi";

export type CardIndexItem = {
  id: number;
  name: string;
  elixirCost: number | null;
};

export type CardIndex = {
  byNameLower: Map<string, CardIndexItem>;
};

type CardIndexCache = {
  index: CardIndex;
  expiresAtMs: number;
};

let cardIndexCache: CardIndexCache | null = null;

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeCardName(name: string): string {
  return typeof name === "string" ? name.trim() : "";
}

export async function getCardIndex({ ttlMs = 24 * 60 * 60 * 1000 }: { ttlMs?: number } = {}): Promise<CardIndex> {
  const now = Date.now();
  if (cardIndexCache && cardIndexCache.expiresAtMs > now) {
    return cardIndexCache.index;
  }

  const result = await getCards();
  const items = Array.isArray((result.data as any)?.items) ? ((result.data as any).items as any[]) : [];

  if (!result.data || items.length === 0) {
    // Keep any previous cache if provider is temporarily unavailable.
    if (cardIndexCache) {
      return cardIndexCache.index;
    }
    throw new Error(result.error || "Failed to fetch card catalog");
  }

  const byNameLower = new Map<string, CardIndexItem>();
  for (const item of items) {
    const name = typeof item?.name === "string" ? item.name.trim() : "";
    const id = typeof item?.id === "number" ? item.id : null;
    if (!name || id === null) continue;

    const elixirCost = typeof item?.elixirCost === "number" && Number.isFinite(item.elixirCost) ? item.elixirCost : null;
    byNameLower.set(normalizeKey(name), { id, name, elixirCost });
  }

  const index = { byNameLower } satisfies CardIndex;
  cardIndexCache = { index, expiresAtMs: now + Math.max(60_000, ttlMs) };
  return index;
}

export function computeAvgElixir(cardNames: string[], cardIndex: CardIndex): number {
  const costs: number[] = [];
  for (const raw of Array.isArray(cardNames) ? cardNames : []) {
    const key = normalizeKey(String(raw ?? ""));
    const item = cardIndex.byNameLower.get(key);
    if (!item) continue;
    if (typeof item.elixirCost === "number" && Number.isFinite(item.elixirCost)) {
      costs.push(item.elixirCost);
    }
  }

  const avg = costs.length > 0 ? costs.reduce((acc, v) => acc + v, 0) / costs.length : 3.5;
  return Math.max(1, Math.min(8, Number(avg.toFixed(2))));
}

export function buildClashDeckImportLink(
  cardNames: string[],
  cardIndex: CardIndex,
  lang: "en" | "pt" = "en",
): string | null {
  const ids: number[] = [];
  for (const raw of Array.isArray(cardNames) ? cardNames : []) {
    const key = normalizeKey(String(raw ?? ""));
    const item = cardIndex.byNameLower.get(key);
    if (!item) return null;
    ids.push(item.id);
  }

  if (ids.length !== 8) return null;
  const deckParam = ids.join(";");
  return `https://link.clashroyale.com/deck/${encodeURIComponent(lang)}?deck=${encodeURIComponent(deckParam)}`;
}

export function normalizeDeckHash(cardNames: string[]): string {
  const normalized = (Array.isArray(cardNames) ? cardNames : [])
    .map((name) => normalizeKey(String(name ?? "")))
    .filter(Boolean)
    .sort();

  return normalized.join("|");
}

export const COUNTER_MAP: Record<string, string[]> = {
  "mega knight": ["Inferno Dragon", "Inferno Tower", "Mini P.E.K.K.A", "Valkyrie"],
  witch: ["Poison", "Valkyrie", "The Log"],
  "x-bow": ["Rocket", "Earthquake", "Knight"],
  "hog rider": ["Cannon", "Tornado", "Tesla"],
  "royal giant": ["Inferno Tower", "Fisherman", "Electro Wizard"],
  graveyard: ["Poison", "Valkyrie", "Baby Dragon"],
  "elite barbarians": ["Valkyrie", "Skeleton Army", "Barbarian Barrel"],
  "goblin barrel": ["The Log", "Arrows", "Barbarian Barrel"],
  "lava hound": ["Inferno Dragon", "Electro Dragon", "Baby Dragon"],
};

const WIN_CONDITIONS: string[] = [
  "Hog Rider",
  "Royal Giant",
  "Graveyard",
  "Golem",
  "Lava Hound",
  "X-Bow",
  "Mortar",
  "Goblin Barrel",
  "Miner",
  "Balloon",
  "Giant",
  "Ram Rider",
  "Battle Ram",
  "Elixir Golem",
  "Goblin Giant",
  "Skeleton Barrel",
  "Royal Hogs",
  "Three Musketeers",
];

export function detectWinCondition(cardNames: string[]): string | null {
  const set = new Set((Array.isArray(cardNames) ? cardNames : []).map((name) => normalizeKey(String(name ?? ""))));
  for (const wc of WIN_CONDITIONS) {
    if (set.has(normalizeKey(wc))) return wc;
  }
  return null;
}

export function computeChanges(fromDeck: string[], toDeck: string[]): Array<{ from: string; to: string }> {
  const fromCounts = new Map<string, number>();
  for (const c of Array.isArray(fromDeck) ? fromDeck : []) {
    const key = normalizeKey(String(c ?? ""));
    if (!key) continue;
    fromCounts.set(key, (fromCounts.get(key) ?? 0) + 1);
  }

  const toCounts = new Map<string, number>();
  for (const c of Array.isArray(toDeck) ? toDeck : []) {
    const key = normalizeKey(String(c ?? ""));
    if (!key) continue;
    toCounts.set(key, (toCounts.get(key) ?? 0) + 1);
  }

  const removed: string[] = [];
  for (const c of Array.isArray(fromDeck) ? fromDeck : []) {
    const key = normalizeKey(String(c ?? ""));
    const keep = toCounts.get(key) ?? 0;
    if (keep > 0) {
      toCounts.set(key, keep - 1);
      continue;
    }
    removed.push(String(c ?? ""));
  }

  const added: string[] = [];
  for (const c of Array.isArray(toDeck) ? toDeck : []) {
    const key = normalizeKey(String(c ?? ""));
    const keep = fromCounts.get(key) ?? 0;
    if (keep > 0) {
      fromCounts.set(key, keep - 1);
      continue;
    }
    added.push(String(c ?? ""));
  }

  const pairs: Array<{ from: string; to: string }> = [];
  for (let i = 0; i < Math.min(removed.length, added.length); i += 1) {
    pairs.push({ from: removed[i]!, to: added[i]! });
  }
  return pairs;
}

export function detectArchetype(cards: string[]): string {
  const cardSet = new Set((Array.isArray(cards) ? cards : []).map((c) => normalizeKey(String(c ?? ""))));

  if (cardSet.has("golem")) return "Golem Beatdown";
  if (cardSet.has("lava hound")) return "LavaLoon";
  if (cardSet.has("giant skeleton")) return "Giant Skeleton";
  if (cardSet.has("x-bow")) return "X-Bow Cycle";
  if (cardSet.has("mortar")) return "Mortar Cycle";
  if (cardSet.has("hog rider")) return "Hog Cycle";
  if (cardSet.has("royal giant")) return "Royal Giant";
  if (cardSet.has("giant")) return "Giant Beatdown";
  if (cardSet.has("p.e.k.k.a")) return "P.E.K.K.A Bridge Spam";
  if (cardSet.has("elixir golem")) return "Elixir Golem";
  if (cardSet.has("three musketeers")) return "3M Split";
  if (cardSet.has("graveyard")) return "Graveyard Control";
  if (cardSet.has("mega knight")) return "Mega Knight";
  if (cardSet.has("royal hogs")) return "Royal Hogs";
  if (cardSet.has("miner") && cardSet.has("wall breakers")) return "Miner WallBreakers";
  if (cardSet.has("balloon")) return "Balloon Cycle";
  if (cardSet.has("goblin barrel")) return "Log Bait";
  if (cardSet.has("sparky")) return "Sparky";

  return "Custom";
}

