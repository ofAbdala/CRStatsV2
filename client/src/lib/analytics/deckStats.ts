export interface DeckCard {
  id?: number;
  name: string;
  iconUrls?: { medium?: string; small?: string };
  level?: number;
  elixirCost?: number;
}

export interface DeckStats {
  key: string;
  cards: DeckCard[];
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  netTrophies: number;
  avgElixir: number | null;
}

interface DeckAccumulator {
  cards: DeckCard[];
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  netTrophies: number;
  elixirSamples: number[];
}

function normalizeCardName(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function extractCardsFromBattleTeam(team: any): DeckCard[] {
  const cards = Array.isArray(team?.cards) ? (team.cards as any[]) : [];
  return cards
    .map((card) => {
      const name = normalizeCardName(card?.name);
      if (!name) return null;
      const deckCard: DeckCard = {
        name,
        ...(typeof card?.id === "number" ? { id: card.id } : {}),
        ...(card?.iconUrls ? { iconUrls: { medium: card.iconUrls.medium, small: card.iconUrls.small } } : {}),
        ...(typeof card?.level === "number" ? { level: card.level } : {}),
        ...(typeof card?.elixirCost === "number" ? { elixirCost: card.elixirCost } : {}),
      };
      return deckCard;
    })
    .filter((value): value is DeckCard => value !== null);
}

function getBattleCrowns(battle: any) {
  const myCrowns = battle?.team?.[0]?.crowns ?? 0;
  const oppCrowns = battle?.opponent?.[0]?.crowns ?? 0;
  return {
    my: typeof myCrowns === "number" ? myCrowns : 0,
    opp: typeof oppCrowns === "number" ? oppCrowns : 0,
  };
}

function getBattleResult(battle: any): "win" | "loss" | "draw" {
  const crowns = getBattleCrowns(battle);
  if (crowns.my > crowns.opp) return "win";
  if (crowns.my < crowns.opp) return "loss";
  return "draw";
}

function computeDeckAvgElixir(cards: DeckCard[]): number | null {
  const costs = cards
    .map((card) => (typeof card.elixirCost === "number" ? card.elixirCost : null))
    .filter((value): value is number => value !== null);

  if (costs.length === 0) return null;
  return costs.reduce((acc, value) => acc + value, 0) / costs.length;
}

export function buildDeckStatsFromBattles(battles: any[] | null | undefined, { limit = 10 }: { limit?: number } = {}): DeckStats[] {
  const map = new Map<string, DeckAccumulator>();

  for (const battle of Array.isArray(battles) ? battles : []) {
    const team = battle?.team?.[0];
    const deckCards = extractCardsFromBattleTeam(team);
    if (deckCards.length === 0) continue;

    const key = [...deckCards].map((card) => card.name).sort().join("|");
    if (!key) continue;

    const existing =
      map.get(key) ||
      ({
        cards: deckCards,
        matches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        netTrophies: 0,
        elixirSamples: [],
      } satisfies DeckAccumulator);

    existing.matches += 1;

    const result = getBattleResult(battle);
    if (result === "win") existing.wins += 1;
    if (result === "loss") existing.losses += 1;
    if (result === "draw") existing.draws += 1;

    const trophyChange = team?.trophyChange;
    if (typeof trophyChange === "number" && Number.isFinite(trophyChange)) {
      existing.netTrophies += trophyChange;
    }

    const avgElixir = computeDeckAvgElixir(deckCards);
    if (avgElixir !== null) existing.elixirSamples.push(avgElixir);

    map.set(key, existing);
  }

  return Array.from(map.entries())
    .map(([key, value]) => {
      const avgElixir =
        value.elixirSamples.length > 0
          ? value.elixirSamples.reduce((acc, current) => acc + current, 0) / value.elixirSamples.length
          : null;

      return {
        key,
        cards: value.cards,
        matches: value.matches,
        wins: value.wins,
        losses: value.losses,
        draws: value.draws,
        winRate: value.matches > 0 ? (value.wins / value.matches) * 100 : 0,
        netTrophies: value.netTrophies,
        avgElixir,
      } satisfies DeckStats;
    })
    .sort((a, b) => b.matches - a.matches)
    .slice(0, Math.max(1, Math.min(50, limit)));
}
