import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";

import ClashCardImage from "@/components/clash/ClashCardImage";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageErrorState from "@/components/PageErrorState";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/hooks/use-locale";
import { usePlayerSync } from "@/hooks/usePlayerSync";
import { api, ApiError } from "@/lib/api";
import { buildDeckStatsFromBattles, type DeckCard, type DeckStats } from "@/lib/analytics/deckStats";
import { getApiErrorMessage } from "@/lib/errorMessages";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Copy,
  Loader2,
  RefreshCcw,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

interface MetaDeck {
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

type DecksTab = "meta" | "counter" | "optimizer";

type TrophyRange = "all" | "5000" | "6000" | "7000";

type MetaInnerTab = "decks" | "cards" | "evolutions" | "heroes" | "tower";

type MetaMode = "path-of-legends" | "trophy-road";

type MetaDeckSort = "popularity" | "win-rate" | "avg-crowns";

type MetaCardSort = "win-rate" | "usage-rate";

type MetaCardGroup = "cards" | "evolutions" | "heroes" | "tower";

type MetaTopPlayer = {
  name: string;
  score: number;
};

type DeckStyle = "balanced" | "cycle" | "heavy";

type DeckSuggestion = {
  cards: string[];
  avgElixir: number;
  explanation: string;
  importLink: string;
};

type OptimizerGoal = "cycle" | "counter-card" | "consistency";

type OptimizerChange = {
  from: string;
  to: string;
};

type DeckOptimizerResult = {
  originalDeck: { cards: string[]; avgElixir: number };
  suggestedDeck: { cards: string[]; avgElixir: number };
  changes: OptimizerChange[];
  explanation: string;
  importLink: string;
};

const UNKNOWN_VALUE = "-";

const PROBLEM_CARDS = [
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

const MOCK_TOP_PLAYER_NAMES = [
  "Luna",
  "Kaiser",
  "Bruno",
  "Nova",
  "Rafa",
  "Mika",
  "Sol",
  "Yuki",
  "Zed",
  "Astra",
  "Theo",
  "Nina",
  "Vini",
  "Gaia",
  "Iris",
  "Dante",
  "Cora",
  "Noah",
  "Sage",
  "Jade",
] as const;

// These sets are a temporary, client-only classifier so we can build the Meta Hub UI
// without new backend fields. Replace with real card type metadata when available.
const HERO_KEYS = new Set([
  "archer queen",
  "golden knight",
  "skeleton king",
  "mighty miner",
  "monk",
  "little prince",
]);

const TOWER_TROOP_KEYS = new Set([
  "tower princess",
  "dagger duchess",
  "cannoneer",
]);

const EVOLUTION_KEYS = new Set([
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

function isDecksTab(value: string | null): value is DecksTab {
  return value === "meta" || value === "counter" || value === "optimizer";
}

function isTrophyRange(value: string): value is TrophyRange {
  return value === "all" || value === "5000" || value === "6000" || value === "7000";
}

function isProblemCard(value: string): value is (typeof PROBLEM_CARDS)[number] {
  return (PROBLEM_CARDS as readonly string[]).includes(value);
}

function isDeckStyle(value: string): value is DeckStyle {
  return value === "balanced" || value === "cycle" || value === "heavy";
}

function isOptimizerGoal(value: string): value is OptimizerGoal {
  return value === "cycle" || value === "counter-card" || value === "consistency";
}

function buildCardListText(cards: Array<string | { name: string }>): string {
  return cards.map((card) => (typeof card === "string" ? card : card.name)).join(", ");
}

function isMetaInnerTab(value: string): value is MetaInnerTab {
  return (
    value === "decks" ||
    value === "cards" ||
    value === "evolutions" ||
    value === "heroes" ||
    value === "tower"
  );
}

function isMetaMode(value: string): value is MetaMode {
  return value === "path-of-legends" || value === "trophy-road";
}

function isMetaDeckSort(value: string): value is MetaDeckSort {
  return value === "popularity" || value === "win-rate" || value === "avg-crowns";
}

function isMetaCardSort(value: string): value is MetaCardSort {
  return value === "win-rate" || value === "usage-rate";
}

function normalizeCardKey(name: string): string {
  return name.trim().toLowerCase();
}

function classifyMetaCard(name: string): MetaCardGroup {
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

function toFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function formatPercent(value0to1: number): string {
  if (!Number.isFinite(value0to1)) return UNKNOWN_VALUE;
  return `${(value0to1 * 100).toFixed(1)}%`;
}

function formatPercent100(value0to100: number): string {
  if (!Number.isFinite(value0to100)) return UNKNOWN_VALUE;
  return `${value0to100.toFixed(1)}%`;
}

function hashStringToSeed(input: string): number {
  // FNV-1a 32-bit hash
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildMockAvgCrowns(deckHash: string): number {
  const rand = mulberry32(hashStringToSeed(`${deckHash}:avgCrowns`));
  // Roughly 0.7 - 1.3 crowns per match; stable per deck.
  return clamp(0.7 + rand() * 0.6, 0.7, 1.3);
}

function buildMockTopPlayers(deckHash: string): MetaTopPlayer[] {
  const rand = mulberry32(hashStringToSeed(`${deckHash}:topPlayers`));
  const names = [...MOCK_TOP_PLAYER_NAMES];
  const players: MetaTopPlayer[] = [];

  for (let i = 0; i < 3; i += 1) {
    if (names.length === 0) break;
    const idx = Math.floor(rand() * names.length);
    const name = names.splice(idx, 1)[0] ?? "Player";
    const score = Math.floor(6500 + rand() * 2500); // mock trophy / rating
    players.push({ name, score });
  }

  return players;
}

function getDeckWinRatePercent(deck: MetaDeck): number | null {
  const games = toFiniteNumber(deck.games, 0);
  const wins = toFiniteNumber(deck.wins, 0);

  if (games > 0) return clamp((wins / games) * 100, 0, 100);

  const estimate = toFiniteNumber(deck.winRateEstimate, NaN);
  return Number.isFinite(estimate) ? clamp(estimate, 0, 100) : null;
}

type MetaDeckExtended = MetaDeck & {
  avgCrowns: number;
  topPlayers: MetaTopPlayer[];
  winRatePercent: number | null;
};

type MetaCardRow = {
  key: string;
  name: string;
  group: MetaCardGroup;
  games: number;
  wins: number;
  usageRate: number;
  winRate: number;
};

function buildMetaDeckExtended(deck: MetaDeck): MetaDeckExtended {
  return {
    ...deck,
    avgCrowns: buildMockAvgCrowns(deck.deckHash),
    topPlayers: buildMockTopPlayers(deck.deckHash),
    winRatePercent: getDeckWinRatePercent(deck),
  };
}

function buildMetaCardRows(metaDecks: MetaDeck[]): MetaCardRow[] {
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

type MetaDecksViewProps = {
  metaDecks: MetaDeck[];
  hasStaleCache: boolean;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
};

function MetaDecksView({ metaDecks, hasStaleCache, isLoading, isError, error, onRetry }: MetaDecksViewProps) {
  const { t } = useLocale();
  const { toast } = useToast();
  const [innerTab, setInnerTab] = useState<MetaInnerTab>("decks");

  const metaCardRows = useMemo(() => buildMetaCardRows(metaDecks), [metaDecks]);

  const handleCopyDeck = async (deck: MetaDeck) => {
    const list = buildCardListText((deck.cards || []).slice(0, 8));

    try {
      await navigator.clipboard.writeText(list);
      toast({
        title: t("pages.decks.toast.copiedTitle"),
        description: t("pages.decks.toast.copiedList"),
      });
    } catch (copyError) {
      const message = copyError instanceof Error ? copyError.message : String(copyError);
      toast({
        title: t("pages.decks.toast.copyErrorTitle"),
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">{t("decks.meta.title")}</h1>
          <p className="text-muted-foreground">{t("decks.meta.subtitle")}</p>
        </div>
      </div>

      <Tabs
        value={innerTab}
        onValueChange={(value) => {
          if (isMetaInnerTab(value)) setInnerTab(value);
        }}
      >
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
          <TabsTrigger value="decks">{t("decks.meta.tabs.decks")}</TabsTrigger>
          <TabsTrigger value="cards">{t("decks.meta.tabs.cards")}</TabsTrigger>
          <TabsTrigger value="evolutions">{t("decks.meta.tabs.evolutions")}</TabsTrigger>
          <TabsTrigger value="heroes">{t("decks.meta.tabs.heroes")}</TabsTrigger>
          <TabsTrigger value="tower">{t("decks.meta.tabs.tower")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {hasStaleCache ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{t("pages.decks.staleCache")}</AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t("pages.decks.loadingMetaDecks")}
          </CardContent>
        </Card>
      ) : isError ? (
        <PageErrorState
          title={t("pages.decks.metaErrorTitle")}
          description={getApiErrorMessage(error, t, "pages.decks.metaErrorDescription")}
          error={error}
          onRetry={onRetry}
        />
      ) : metaDecks.length === 0 ? (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {t("pages.decks.emptyMetaDecks")}
          </CardContent>
        </Card>
      ) : (
        <>
          {innerTab === "decks" ? (
            <MetaPopularDecksView metaDecks={metaDecks} onCopyDeck={handleCopyDeck} />
          ) : innerTab === "cards" ? (
            <MetaCardsView rows={metaCardRows} />
          ) : innerTab === "evolutions" ? (
            <MetaEvolutionsView rows={metaCardRows} />
          ) : innerTab === "heroes" ? (
            <MetaHeroesView rows={metaCardRows} />
          ) : (
            <MetaTowerTroopsView rows={metaCardRows} />
          )}
        </>
      )}
    </div>
  );
}

function MetaPopularDecksView({
  metaDecks,
  onCopyDeck,
}: {
  metaDecks: MetaDeck[];
  onCopyDeck: (deck: MetaDeck) => void;
}) {
  const { t } = useLocale();
  const [mode, setMode] = useState<MetaMode>("path-of-legends");
  const [sort, setSort] = useState<MetaDeckSort>("popularity");
  const [trophyRange, setTrophyRange] = useState<TrophyRange>("all");

  const decksExtended = useMemo(() => metaDecks.map(buildMetaDeckExtended), [metaDecks]);

  const sortedDecks = useMemo(() => {
    const sorted = [...decksExtended];

    sorted.sort((a, b) => {
      if (sort === "win-rate") {
        return (b.winRatePercent ?? -1) - (a.winRatePercent ?? -1);
      }

      if (sort === "avg-crowns") {
        return b.avgCrowns - a.avgCrowns;
      }

      // popularity (fallback): highest sample size first
      return toFiniteNumber(b.games, 0) - toFiniteNumber(a.games, 0);
    });

    return sorted;
  }, [decksExtended, sort]);

  return (
    <div className="space-y-5">
      <Card className="border-border/50 bg-card/50">
        <CardContent className="py-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label className="text-xs text-muted-foreground">{t("decks.meta.filters.mode")}</Label>
              <Select
                value={mode}
                onValueChange={(value) => {
                  if (isMetaMode(value)) setMode(value);
                }}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder={t("decks.meta.filters.modes.pathOfLegends")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="path-of-legends">{t("decks.meta.filters.modes.pathOfLegends")}</SelectItem>
                  <SelectItem value="trophy-road">{t("decks.meta.filters.modes.trophyRoad")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">{t("decks.meta.filters.sort")}</Label>
              <Select
                value={sort}
                onValueChange={(value) => {
                  if (isMetaDeckSort(value)) setSort(value);
                }}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder={t("decks.meta.filters.sortByPopularity")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popularity">{t("decks.meta.filters.sortByPopularity")}</SelectItem>
                  <SelectItem value="win-rate">{t("decks.meta.filters.sortByWinRate")}</SelectItem>
                  <SelectItem value="avg-crowns">{t("decks.meta.filters.sortByAvgCrowns")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">{t("decks.meta.trophyRangeLabel")}</Label>
              <Select
                value={trophyRange}
                onValueChange={(value) => {
                  if (isTrophyRange(value)) setTrophyRange(value);
                }}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder={t("decks.meta.trophyRangeAll")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("decks.meta.trophyRangeAll")}</SelectItem>
                  <SelectItem value="5000">{t("decks.meta.trophyRange5000")}</SelectItem>
                  <SelectItem value="6000">{t("decks.meta.trophyRange6000")}</SelectItem>
                  <SelectItem value="7000">{t("decks.meta.trophyRange7000")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            {/* UI-only for now; filtering will be wired to backend later */}
            {mode === "path-of-legends"
              ? t("decks.meta.filters.modes.pathOfLegends")
              : t("decks.meta.filters.modes.trophyRoad")}{" "}
            · {trophyRange === "all" ? t("decks.meta.trophyRangeAll") : `${trophyRange}+`}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sortedDecks.map((deck, index) => {
          const games = toFiniteNumber(deck.games, 0);
          const avgElixirText =
            typeof deck.avgElixir === "number" && Number.isFinite(deck.avgElixir)
              ? deck.avgElixir.toFixed(1)
              : UNKNOWN_VALUE;
          const winRateText =
            typeof deck.winRatePercent === "number" && Number.isFinite(deck.winRatePercent)
              ? formatPercent100(deck.winRatePercent)
              : UNKNOWN_VALUE;
          const crownsText = Number.isFinite(deck.avgCrowns) ? deck.avgCrowns.toFixed(2) : UNKNOWN_VALUE;

          return (
            <Card
              key={deck.deckHash}
              className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Badge variant="secondary" className="px-2">
                        #{index + 1}
                      </Badge>
                      <Target className="w-4 h-4" />
                      <span className="truncate">{deck.archetype || t("decks.meta.deckFallback")}</span>
                      {deck.cacheStatus === "stale" ? (
                        <Badge variant="secondary">{t("pages.decks.staleBadge")}</Badge>
                      ) : null}
                    </CardTitle>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                      <div className="rounded-md border border-border/50 bg-muted/20 px-2 py-1">
                        <p className="text-muted-foreground">{t("decks.meta.avgElixir")}</p>
                        <p className="font-medium">{avgElixirText}</p>
                      </div>
                      <div className="rounded-md border border-border/50 bg-muted/20 px-2 py-1">
                        <p className="text-muted-foreground">{t("decks.meta.winRate")}</p>
                        <p className="font-medium text-green-500">{winRateText}</p>
                      </div>
                      <div className="rounded-md border border-border/50 bg-muted/20 px-2 py-1">
                        <p className="text-muted-foreground">{t("decks.meta.avgCrowns")}</p>
                        <p className="font-medium">{crownsText}</p>
                      </div>
                      <div className="rounded-md border border-border/50 bg-muted/20 px-2 py-1">
                        <p className="text-muted-foreground">{t("decks.meta.sampleSize")}</p>
                        <p className="font-medium">{games}</p>
                      </div>
                    </div>
                  </div>

                  <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={() => onCopyDeck(deck)}>
                    <Copy className="w-3.5 h-3.5 mr-2" />
                    {t("decks.meta.copyDeck")}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {(deck.cards || []).slice(0, 8).map((card, cardIndex) => (
                    <ClashCardImage
                      key={`${deck.deckHash}-${card}-${cardIndex}`}
                      name={card}
                      iconUrls={null}
                      level={null}
                      size="lg"
                      showLevel={false}
                    />
                  ))}
                </div>

                <div className="rounded-lg border border-border/50 bg-muted/10 p-3">
                  <div className="flex items-center gap-2 text-xs font-medium mb-2">
                    <Users className="w-4 h-4" />
                    <span>{t("decks.meta.topPlayers")}</span>
                  </div>
                  <ul className="space-y-1 text-sm">
                    {deck.topPlayers.slice(0, 3).map((player) => (
                      <li key={`${deck.deckHash}-${player.name}`} className="flex items-center justify-between gap-3">
                        <span className="truncate">{player.name}</span>
                        <Badge variant="outline" className="text-muted-foreground">
                          {player.score}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function MetaCardsView({ rows }: { rows: MetaCardRow[] }) {
  return <MetaCardMetaTableView rows={rows} group="cards" />;
}

function MetaEvolutionsView({ rows }: { rows: MetaCardRow[] }) {
  return <MetaCardMetaTableView rows={rows} group="evolutions" />;
}

function MetaHeroesView({ rows }: { rows: MetaCardRow[] }) {
  return <MetaCardMetaTableView rows={rows} group="heroes" />;
}

function MetaTowerTroopsView({ rows }: { rows: MetaCardRow[] }) {
  return <MetaCardMetaTableView rows={rows} group="tower" />;
}

function MetaCardMetaTableView({ rows, group }: { rows: MetaCardRow[]; group: MetaCardGroup }) {
  const { t } = useLocale();
  const [mode, setMode] = useState<MetaMode>("path-of-legends");
  const [sort, setSort] = useState<MetaCardSort>("win-rate");

  const filteredRows = useMemo(() => rows.filter((row) => row.group === group), [rows, group]);

  const sortedRows = useMemo(() => {
    const next = [...filteredRows];
    next.sort((a, b) => {
      if (sort === "usage-rate") return b.usageRate - a.usageRate;
      return b.winRate - a.winRate;
    });
    return next;
  }, [filteredRows, sort]);

  return (
    <div className="space-y-5">
      <Card className="border-border/50 bg-card/50">
        <CardContent className="py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs text-muted-foreground">{t("decks.meta.filters.mode")}</Label>
              <Select
                value={mode}
                onValueChange={(value) => {
                  if (isMetaMode(value)) setMode(value);
                }}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder={t("decks.meta.filters.modes.pathOfLegends")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="path-of-legends">{t("decks.meta.filters.modes.pathOfLegends")}</SelectItem>
                  <SelectItem value="trophy-road">{t("decks.meta.filters.modes.trophyRoad")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">{t("decks.meta.filters.sort")}</Label>
              <Select
                value={sort}
                onValueChange={(value) => {
                  if (isMetaCardSort(value)) setSort(value);
                }}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder={t("decks.meta.filters.sortByWinRate")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="win-rate">{t("decks.meta.filters.sortByWinRate")}</SelectItem>
                  <SelectItem value="usage-rate">{t("decks.meta.filters.sortByUsageRate")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            {/* UI-only for now; the mode selector will influence API calls later */}
            {mode === "path-of-legends"
              ? t("decks.meta.filters.modes.pathOfLegends")
              : t("decks.meta.filters.modes.trophyRoad")}
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {group === "cards"
              ? t("decks.meta.tabs.cards")
              : group === "evolutions"
                ? t("decks.meta.tabs.evolutions")
                : group === "heroes"
                  ? t("decks.meta.tabs.heroes")
                  : t("decks.meta.tabs.tower")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedRows.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">{t("pages.decks.emptyMetaDecks")}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[220px]">{t("decks.meta.tabs.cards")}</TableHead>
                  <TableHead className="min-w-[140px]">{t("decks.meta.winRate")}</TableHead>
                  <TableHead className="min-w-[140px]">{t("decks.meta.usageRate")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <ClashCardImage
                          name={row.name}
                          iconUrls={null}
                          level={null}
                          size="sm"
                          showLevel={false}
                        />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{row.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {t("decks.meta.sampleSize")}: {Math.round(row.games)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 rounded-full bg-muted/40 overflow-hidden">
                          <div
                            className="h-full bg-green-500/80"
                            style={{ width: `${clamp(row.winRate * 100, 0, 100)}%` }}
                          />
                        </div>
                        <span className="tabular-nums">{formatPercent(row.winRate)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 rounded-full bg-muted/40 overflow-hidden">
                          <div
                            className="h-full bg-primary/80"
                            style={{ width: `${clamp(row.usageRate * 100, 0, 100)}%` }}
                          />
                        </div>
                        <span className="tabular-nums">{formatPercent(row.usageRate)}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CounterDeckBuilderView() {
  const { t } = useLocale();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Keep Select controlled for its full lifetime. Empty string = no selection.
  const [selectedCard, setSelectedCard] = useState<(typeof PROBLEM_CARDS)[number] | "">("");
  const [deckStyle, setDeckStyle] = useState<DeckStyle>("balanced");
  const [generatedDeck, setGeneratedDeck] = useState<DeckSuggestion | null>(null);

  const counterMutation = useMutation({
    mutationFn: (payload: { targetCardKey: string; deckStyle: DeckStyle }) =>
      api.decks.generateCounter({
        targetCardKey: payload.targetCardKey,
        deckStyle: payload.deckStyle,
        trophyRange: null,
      }),
    onSuccess: (data) => {
      setGeneratedDeck({
        cards: data.deck.cards,
        avgElixir: data.deck.avgElixir,
        explanation: data.explanation,
        importLink: data.importLink,
      });
    },
  });

  const deckStyleLabel = useMemo(() => {
    if (deckStyle === "cycle") return t("decks.counter.styleCycle");
    if (deckStyle === "heavy") return t("decks.counter.styleHeavy");
    return t("decks.counter.styleBalanced");
  }, [deckStyle, t]);

  const handleGenerate = () => {
    if (!selectedCard) return;
    counterMutation.mutate({ targetCardKey: selectedCard, deckStyle });
  };

  const handleCopyDeckLink = async () => {
    if (!generatedDeck) return;

    try {
      const value = generatedDeck.importLink || buildCardListText(generatedDeck.cards);
      await navigator.clipboard.writeText(value);
      toast({
        title: t("pages.decks.toast.copiedTitle"),
        description: generatedDeck.importLink ? t("pages.decks.toast.copiedLink") : t("pages.decks.toast.copiedList"),
      });
    } catch (copyError) {
      const message = copyError instanceof Error ? copyError.message : String(copyError);
      toast({
        title: t("pages.decks.toast.copyErrorTitle"),
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">{t("decks.counter.title")}</h1>
        <p className="text-muted-foreground">{t("decks.counter.subtitle")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-base">{t("decks.counter.formTitle")}</CardTitle>
            <CardDescription>{t("decks.counter.formSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="text-xs text-muted-foreground">{t("decks.counter.cardLabel")}</Label>
              <Select
                value={selectedCard}
                onValueChange={(value) => {
                  setSelectedCard(isProblemCard(value) ? value : "");
                }}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder={t("decks.counter.cardPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {PROBLEM_CARDS.map((card) => (
                    <SelectItem key={card} value={card}>
                      {card}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">{t("decks.counter.styleLabel")}</Label>
              <div className="mt-2">
                <ToggleGroup
                  type="single"
                  value={deckStyle}
                  onValueChange={(value) => {
                    if (isDeckStyle(value)) setDeckStyle(value);
                  }}
                  className="justify-start flex-wrap"
                >
                  <ToggleGroupItem value="balanced" aria-label={t("decks.counter.styleBalanced")}> 
                    {t("decks.counter.styleBalanced")}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="cycle" aria-label={t("decks.counter.styleCycle")}> 
                    {t("decks.counter.styleCycle")}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="heavy" aria-label={t("decks.counter.styleHeavy")}> 
                    {t("decks.counter.styleHeavy")}
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!selectedCard || counterMutation.isPending}
              className="w-full sm:w-auto"
            >
              {counterMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t("decks.counter.generateButton")}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-base">{t("decks.counter.resultTitle")}</CardTitle>
            <CardDescription>{t("decks.counter.resultSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {counterMutation.isError ? (
              <div className="space-y-3">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {counterMutation.error instanceof ApiError && counterMutation.error.code === "DECK_COUNTER_DAILY_LIMIT_REACHED" ? (
                      <span>{t("apiErrors.codes.deckCounterLimitReached")}</span>
                    ) : (
                      <span>{getApiErrorMessage(counterMutation.error, t, "errors.generic")}</span>
                    )}
                  </AlertDescription>
                </Alert>
                {counterMutation.error instanceof ApiError && counterMutation.error.code === "DECK_COUNTER_DAILY_LIMIT_REACHED" ? (
                  <Button variant="outline" className="w-full" onClick={() => setLocation("/billing")}>
                    {t("pages.profile.upgradeCta")}
                  </Button>
                ) : null}
              </div>
            ) : !generatedDeck ? (
              <div className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
                {t("decks.counter.emptyState")}
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-muted-foreground">
                    {t("decks.meta.avgElixir")}: {generatedDeck.avgElixir.toFixed(1)}
                  </Badge>
                  <Badge variant="secondary">{deckStyleLabel}</Badge>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {generatedDeck.cards.slice(0, 8).map((card, index) => (
                    <ClashCardImage
                      key={`${card}-${index}`}
                      name={card}
                      iconUrls={null}
                      level={null}
                      size="lg"
                      showLevel={false}
                    />
                  ))}
                </div>

                <div className="rounded-lg bg-muted/30 border border-border/50 p-4">
                  <p className="text-xs font-medium mb-1">{t("decks.counter.explanationTitle")}</p>
                  <p className="text-sm text-muted-foreground">{generatedDeck.explanation}</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button size="sm" className="h-9" onClick={handleCopyDeckLink}>
                    <Copy className="w-3.5 h-3.5 mr-2" />
                    {t("decks.counter.copyCode")}
                  </Button>
                  <Button
                    size="sm"
                    className="h-9"
                    variant="outline"
                    onClick={() => {
                      toast({
                        title: t("decks.counter.favorite"),
                        description: t("pages.decks.toast.detailsDescription"),
                      });
                    }}
                  >
                    {t("decks.counter.favorite")}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type DeckOptimizerViewProps = {
  myDecks: DeckStats[];
  syncLoading: boolean;
  syncFetching: boolean;
  onRefresh: () => void;
};

function DeckOptimizerView({ myDecks, syncLoading, syncFetching, onRefresh }: DeckOptimizerViewProps) {
  const { t } = useLocale();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [selectedDeckKey, setSelectedDeckKey] = useState<string | null>(null);
  const [goal, setGoal] = useState<OptimizerGoal | null>(null);
  // Keep Select controlled for its full lifetime. Empty string = no selection.
  const [targetCard, setTargetCard] = useState<(typeof PROBLEM_CARDS)[number] | "">("");

  useEffect(() => {
    if (goal !== "counter-card" && targetCard) setTargetCard("");
  }, [goal, targetCard]);

  useEffect(() => {
    if (selectedDeckKey && !myDecks.some((deck) => deck.key === selectedDeckKey)) {
      setSelectedDeckKey(null);
    }
  }, [myDecks, selectedDeckKey]);

  const selectedDeck = useMemo(() => {
    if (!selectedDeckKey) return null;
    return myDecks.find((deck) => deck.key === selectedDeckKey) ?? null;
  }, [myDecks, selectedDeckKey]);

  const optimizerMutation = useMutation({
    mutationFn: (payload: { currentDeck: string[]; goal: OptimizerGoal; targetCardKey?: string }) =>
      api.decks.optimize({
        currentDeck: payload.currentDeck,
        goal: payload.goal,
        ...(payload.targetCardKey ? { targetCardKey: payload.targetCardKey } : {}),
      }),
  });

  const canOptimize =
    Boolean(selectedDeck) &&
    Boolean(goal) &&
    (goal !== "counter-card" || (goal === "counter-card" && typeof targetCard === "string" && targetCard.length > 0));

  const limitReached =
    optimizerMutation.error instanceof ApiError &&
    optimizerMutation.error.code === "DECK_OPTIMIZER_DAILY_LIMIT_REACHED";

  const handleOptimize = () => {
    if (!selectedDeck || !goal) return;
    if (goal === "counter-card" && !targetCard) return;

    const targetCardKey = goal === "counter-card" ? targetCard : undefined;

    optimizerMutation.mutate({
      currentDeck: selectedDeck.cards.slice(0, 8).map((card) => card.name),
      goal,
      ...(typeof targetCardKey === "string" ? { targetCardKey } : {}),
    });
  };

  const handleCopySuggestedDeckLink = async (result: DeckOptimizerResult) => {
    try {
      const value = result.importLink || buildCardListText(result.suggestedDeck.cards);
      await navigator.clipboard.writeText(value);
      toast({
        title: t("pages.decks.toast.copiedTitle"),
        description: result.importLink ? t("pages.decks.toast.copiedLink") : t("pages.decks.toast.copiedList"),
      });
    } catch (copyError) {
      const message = copyError instanceof Error ? copyError.message : String(copyError);
      toast({
        title: t("pages.decks.toast.copyErrorTitle"),
        description: message,
        variant: "destructive",
      });
    }
  };

  const result = optimizerMutation.data as DeckOptimizerResult | undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold">{t("decks.optimizer.title")}</h1>
          <p className="text-muted-foreground">{t("decks.optimizer.subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => onRefresh()} disabled={syncFetching}>
          {syncFetching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
          {t("pages.decks.refreshSync")}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Badge variant="secondary" className="px-2">
                  1
                </Badge>
                {t("decks.optimizer.selectDeckTitle")}
              </CardTitle>
              <CardDescription>{t("decks.optimizer.selectDeckHint")}</CardDescription>
            </CardHeader>
            <CardContent>
              {syncLoading ? (
                <div className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("pages.decks.loadingMyDecks")}
                </div>
              ) : myDecks.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">{t("pages.decks.emptyMyDecks")}</div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {myDecks.map((deck, index) => {
                    const isSelected = selectedDeckKey === deck.key;
                    return (
                      <button
                        key={deck.key}
                        type="button"
                        onClick={() => setSelectedDeckKey(deck.key)}
                        className={cn(
                          "text-left rounded-xl border bg-card/30 p-4 transition-all hover:bg-card/40 hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                          isSelected ? "border-primary/40 ring-2 ring-primary/20" : "border-border/50",
                        )}
                        aria-pressed={isSelected}
                      >
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium truncate">
                              {t("pages.decks.deckIndex", { index: index + 1 })}
                            </span>
                            {isSelected ? (
                              <Badge className="bg-primary/20 text-primary border-primary/20">
                                {t("decks.optimizer.selected")}
                              </Badge>
                            ) : null}
                          </div>
                          {typeof deck.avgElixir === "number" ? (
                            <Badge variant="outline" className="text-muted-foreground text-xs">
                              {t("pages.decks.avgElixir", { value: deck.avgElixir.toFixed(1) })}
                            </Badge>
                          ) : null}
                        </div>

                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-3">
                          {deck.cards.slice(0, 8).map((card, cardIndex) => (
                            <ClashCardImage
                              key={card.id || `${card.name}-${cardIndex}`}
                              name={card.name}
                              iconUrls={card.iconUrls}
                              level={typeof card.level === "number" ? card.level : null}
                              size="md"
                            />
                          ))}
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1.5 font-medium">
                            {deck.winRate >= 50 ? (
                              <TrendingUp className="w-4 h-4 text-green-500" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-500" />
                            )}
                            <span className={deck.winRate >= 50 ? "text-green-500" : "text-red-500"}>
                              {Math.round(deck.winRate)}% WR
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {t("pages.decks.matches", { count: deck.matches })}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Badge variant="secondary" className="px-2">
                  2
                </Badge>
                {t("decks.optimizer.goalTitle")}
              </CardTitle>
              <CardDescription>{t("decks.optimizer.goalHint")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <ToggleGroup
                type="single"
                value={goal ?? ""}
                onValueChange={(value) => {
                  if (!value) {
                    setGoal(null);
                    return;
                  }
                  if (isOptimizerGoal(value)) setGoal(value);
                }}
                className="justify-start flex-wrap"
              >
                <ToggleGroupItem value="cycle" aria-label={t("decks.optimizer.goalCycle")}>
                  {t("decks.optimizer.goalCycle")}
                </ToggleGroupItem>
                <ToggleGroupItem value="counter-card" aria-label={t("decks.optimizer.goalCounterCard")}>
                  {t("decks.optimizer.goalCounterCard")}
                </ToggleGroupItem>
                <ToggleGroupItem value="consistency" aria-label={t("decks.optimizer.goalConsistency")}>
                  {t("decks.optimizer.goalConsistency")}
                </ToggleGroupItem>
              </ToggleGroup>

              {goal === "counter-card" ? (
                <div>
                  <Label className="text-xs text-muted-foreground">{t("decks.optimizer.targetCardLabel")}</Label>
                  <Select
                    value={targetCard}
                    onValueChange={(value) => {
                      setTargetCard(isProblemCard(value) ? value : "");
                    }}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder={t("decks.counter.cardPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {PROBLEM_CARDS.map((card) => (
                        <SelectItem key={card} value={card}>
                          {card}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5">
          <Card className="border-border/50 bg-card/50 h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Badge variant="secondary" className="px-2">
                  3
                </Badge>
                {t("decks.optimizer.suggestionsTitle")}
              </CardTitle>
              <CardDescription>{t("decks.optimizer.suggestionsHint")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Button className="w-full" onClick={handleOptimize} disabled={!canOptimize || optimizerMutation.isPending}>
                {optimizerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {t("decks.optimizer.improveButton")}
              </Button>

              {optimizerMutation.isError ? (
                <div className="space-y-3">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {limitReached ? (
                        <span>{t("apiErrors.codes.deckOptimizerLimitReached")}</span>
                      ) : (
                        <span>{getApiErrorMessage(optimizerMutation.error, t, "errors.generic")}</span>
                      )}
                    </AlertDescription>
                  </Alert>
                  {limitReached ? (
                    <Button variant="outline" className="w-full" onClick={() => setLocation("/billing")}>
                      {t("pages.profile.upgradeCta")}
                    </Button>
                  ) : null}
                </div>
              ) : !selectedDeck || !goal ? (
                <div className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
                  {t("decks.optimizer.suggestionsPlaceholder")}
                </div>
              ) : !result ? (
                <div className="rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
                  {t("decks.optimizer.suggestionsPlaceholder")}
                </div>
              ) : (
                <>
                  <div className="rounded-lg bg-muted/30 border border-border/50 p-4">
                    <p className="text-xs font-medium mb-1">{t("decks.optimizer.explanationTitle")}</p>
                    <p className="text-sm text-muted-foreground">{result.explanation}</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="border-border/50 bg-card/30">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">{t("decks.optimizer.originalDeck")}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Badge variant="outline" className="text-muted-foreground mb-3">
                          {t("pages.decks.avgElixir", { value: result.originalDeck.avgElixir.toFixed(1) })}
                        </Badge>
                        <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-4 gap-2">
                          {result.originalDeck.cards.slice(0, 8).map((card, index) => (
                            <ClashCardImage
                              key={`original-${card}-${index}`}
                              name={card}
                              iconUrls={null}
                              level={null}
                              size="md"
                              showLevel={false}
                            />
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-border/50 bg-card/30">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">{t("decks.optimizer.suggestedDeck")}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Badge variant="outline" className="text-muted-foreground mb-3">
                          {t("pages.decks.avgElixir", { value: result.suggestedDeck.avgElixir.toFixed(1) })}
                        </Badge>
                        <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-4 gap-2">
                          {result.suggestedDeck.cards.slice(0, 8).map((card, index) => (
                            <ClashCardImage
                              key={`suggested-${card}-${index}`}
                              name={card}
                              iconUrls={null}
                              level={null}
                              size="md"
                              showLevel={false}
                            />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
                    <p className="text-xs font-medium mb-2">{t("decks.optimizer.changesTitle")}</p>
                    {result.changes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t("decks.optimizer.noChanges")}</p>
                    ) : (
                      <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                        {result.changes.map((change) => (
                          <li key={`${change.from}__${change.to}`}>
                            {change.from} {"->"} {change.to}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <Button className="w-full" onClick={() => handleCopySuggestedDeckLink(result)}>
                    <Copy className="w-4 h-4 mr-2" />
                    {t("decks.optimizer.copyNewDeck")}
                  </Button>

                  {result.importLink ? (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => {
                        toast({
                          title: t("decks.optimizer.importLinkTitle"),
                          description: result.importLink,
                        });
                      }}
                    >
                      {t("decks.optimizer.showImportLink")}
                    </Button>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function DecksPage() {
  const { t } = useLocale();

  const search = useSearch();
  const [, setLocation] = useLocation();

  const tabParam = new URLSearchParams(search).get("tab");
  const tab: DecksTab = isDecksTab(tabParam) ? tabParam : "meta";

  useEffect(() => {
    if (tabParam !== tab) {
      setLocation(`/decks?tab=${tab}`, { replace: true });
    }
  }, [setLocation, tab, tabParam]);

  const { sync, isLoading: syncLoading, isFetching: syncFetching, refresh } = usePlayerSync();

  const metaDecksQuery = useQuery({
    queryKey: ["meta-decks"],
    queryFn: () => api.decks.getMetaDecks() as Promise<MetaDeck[]>,
    staleTime: 60 * 60 * 1000,
  });

  const battles = sync?.battles || [];
  const myDecks = useMemo(() => buildDeckStatsFromBattles(battles, { limit: 10 }), [battles]);

  const metaDecks = metaDecksQuery.data || [];
  const hasStaleCache = metaDecks.some((deck) => deck.cacheStatus === "stale");

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {tab === "meta" ? (
          <MetaDecksView
            metaDecks={metaDecks}
            hasStaleCache={hasStaleCache}
            isLoading={metaDecksQuery.isLoading}
            isError={metaDecksQuery.isError}
            error={metaDecksQuery.error}
            onRetry={() => metaDecksQuery.refetch()}
          />
        ) : tab === "counter" ? (
          <CounterDeckBuilderView />
        ) : (
          <DeckOptimizerView
            myDecks={myDecks}
            syncLoading={syncLoading}
            syncFetching={syncFetching}
            onRefresh={() => {
              refresh().catch(() => undefined);
            }}
          />
        )}

        {/* small a11y hint: keeps t() usage for this page intact when new keys are missing */}
        <span className="sr-only">{t("nav.decks")}</span>
      </div>
    </DashboardLayout>
  );
}
