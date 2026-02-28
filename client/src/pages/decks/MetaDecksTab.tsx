/**
 * MetaDecksTab -- Meta decks display and filtering.
 *
 * Contains the MetaDecksTab (outer) component that manages inner tabs
 * (decks, cards, evolutions, heroes, tower) and the MetaPopularDecksView
 * with individual deck cards.
 *
 * Extracted from the original decks.tsx god-file (Story 1.7, TD-002).
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import PageErrorState from "@/components/PageErrorState";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/hooks/use-locale";
import { api, type ArenaMetaDeckData } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errorMessages";
import { AlertCircle, AlertTriangle, Copy, Loader2, Target } from "lucide-react";

import { DeckDisplay } from "./DeckDisplay";
import { MetaCardsView, MetaEvolutionsView, MetaHeroesView, MetaTowerTroopsView } from "./MetaCardStatsTable";
import {
  type MetaDeck,
  type MetaDeckExtended,
  type MetaDeckSort,
  type MetaInnerTab,
  type MetaMode,
  type TrophyRange,
  UNKNOWN_VALUE,
  buildCardListText,
  buildMetaDeckExtended,
  buildMetaCardRows,
  formatPercent100,
  isMetaDeckSort,
  isMetaInnerTab,
  isMetaMode,
  isTrophyRange,
  toFiniteNumber,
} from "./types";

// ── MetaDeckCard ─────────────────────────────────────────────────────────────

function MetaDeckCard({
  deck,
  index,
  onCopyDeck,
}: {
  deck: MetaDeckExtended;
  index: number;
  onCopyDeck: (deck: MetaDeck) => void;
}) {
  const { t } = useLocale();

  const games = toFiniteNumber(deck.games, 0);
  const avgElixirText =
    typeof deck.avgElixir === "number" && Number.isFinite(deck.avgElixir)
      ? deck.avgElixir.toFixed(1)
      : UNKNOWN_VALUE;
  const winRateText =
    typeof deck.winRatePercent === "number" && Number.isFinite(deck.winRatePercent)
      ? formatPercent100(deck.winRatePercent)
      : UNKNOWN_VALUE;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all">
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

            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-md border border-border/50 bg-muted/20 px-2 py-1">
                <p className="text-muted-foreground">{t("decks.meta.avgElixir")}</p>
                <p className="font-medium">{avgElixirText}</p>
              </div>
              <div className="rounded-md border border-border/50 bg-muted/20 px-2 py-1">
                <p className="text-muted-foreground">{t("decks.meta.winRate")}</p>
                <p className="font-medium text-green-500">{winRateText}</p>
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
        <DeckDisplay
          cards={(deck.cards || []).slice(0, 8)}
          keyPrefix={deck.deckHash}
          size="lg"
          showLevel={false}
        />
      </CardContent>
    </Card>
  );
}

// ── MetaPopularDecksView ─────────────────────────────────────────────────────

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
        {sortedDecks.map((deck, index) => (
          <MetaDeckCard key={deck.deckHash} deck={deck} index={index} onCopyDeck={onCopyDeck} />
        ))}
      </div>
    </div>
  );
}

// ── ArenaMetaDeckCard ────────────────────────────────────────────────────────

function ArenaMetaDeckCard({
  deck,
  index,
  onCopyDeck,
}: {
  deck: ArenaMetaDeckData;
  index: number;
  onCopyDeck: (deck: ArenaMetaDeckData) => void;
}) {
  const { t } = useLocale();

  const winRateText = Number.isFinite(deck.winRate) ? `${(deck.winRate * 100).toFixed(1)}%` : UNKNOWN_VALUE;
  const usageRateText = Number.isFinite(deck.usageRate) ? `${(deck.usageRate * 100).toFixed(1)}%` : UNKNOWN_VALUE;
  const avgElixirText =
    typeof deck.avgElixir === "number" && Number.isFinite(deck.avgElixir)
      ? deck.avgElixir.toFixed(1)
      : UNKNOWN_VALUE;
  const threeCrownText = Number.isFinite(deck.threeCrownRate)
    ? `${(deck.threeCrownRate * 100).toFixed(1)}%`
    : UNKNOWN_VALUE;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Badge variant="secondary" className="px-2">
                #{index + 1}
              </Badge>
              <Target className="w-4 h-4" />
              <span className="truncate">{deck.archetype || t("decks.meta.deckFallback")}</span>
              {deck.limitedData ? (
                <Badge variant="outline" className="text-yellow-600 border-yellow-600/30">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Limited Data
                </Badge>
              ) : null}
            </CardTitle>

            <div className="mt-3 grid grid-cols-5 gap-2 text-xs">
              <div className="rounded-md border border-border/50 bg-muted/20 px-2 py-1">
                <p className="text-muted-foreground">{t("decks.meta.avgElixir")}</p>
                <p className="font-medium">{avgElixirText}</p>
              </div>
              <div className="rounded-md border border-border/50 bg-muted/20 px-2 py-1">
                <p className="text-muted-foreground">{t("decks.meta.winRate")}</p>
                <p className="font-medium text-green-500">{winRateText}</p>
              </div>
              <div className="rounded-md border border-border/50 bg-muted/20 px-2 py-1">
                <p className="text-muted-foreground">3-Crown</p>
                <p className="font-medium text-yellow-500">{threeCrownText}</p>
              </div>
              <div className="rounded-md border border-border/50 bg-muted/20 px-2 py-1">
                <p className="text-muted-foreground">Usage</p>
                <p className="font-medium">{usageRateText}</p>
              </div>
              <div className="rounded-md border border-border/50 bg-muted/20 px-2 py-1">
                <p className="text-muted-foreground">{t("decks.meta.sampleSize")}</p>
                <p className="font-medium">{deck.sampleSize}</p>
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
        <DeckDisplay
          cards={(deck.cards || []).slice(0, 8)}
          keyPrefix={deck.deckHash}
          size="lg"
          showLevel={false}
        />
      </CardContent>
    </Card>
  );
}

// ── ArenaMetaDecksView ──────────────────────────────────────────────────────

function ArenaMetaDecksView({
  arenaDecks,
  isLoading,
  isError,
  error,
  onRetry,
  onCopyDeck,
}: {
  arenaDecks: ArenaMetaDeckData[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  onCopyDeck: (deck: ArenaMetaDeckData) => void;
}) {
  const { t } = useLocale();
  const [sort, setSort] = useState<MetaDeckSort>("popularity");

  const sortedDecks = useMemo(() => {
    const sorted = [...arenaDecks];
    sorted.sort((a, b) => {
      if (sort === "win-rate") {
        return (b.winRate ?? 0) - (a.winRate ?? 0);
      }
      // popularity: highest usage rate first
      return (b.usageRate ?? 0) - (a.usageRate ?? 0);
    });
    return sorted;
  }, [arenaDecks, sort]);

  const hasLimitedData = arenaDecks.some((d) => d.limitedData);

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardContent className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading arena meta decks...
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <PageErrorState
        title="Failed to load arena meta decks"
        description={getApiErrorMessage(error, t, "pages.decks.metaErrorDescription")}
        error={error}
        onRetry={onRetry}
      />
    );
  }

  if (arenaDecks.length === 0) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No arena-specific meta data available yet. Data is collected daily.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {hasLimitedData ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Some decks have limited sample sizes. Results may be less reliable.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="border-border/50 bg-card/50">
        <CardContent className="py-4">
          <div className="grid gap-3 sm:grid-cols-2">
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
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sortedDecks.map((deck, index) => (
          <ArenaMetaDeckCard key={deck.deckHash} deck={deck} index={index} onCopyDeck={onCopyDeck} />
        ))}
      </div>
    </div>
  );
}

// ── Main export: MetaDecksTab ────────────────────────────────────────────────

export type MetaDecksTabProps = {
  metaDecks: MetaDeck[];
  hasStaleCache: boolean;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  arenaId: number;
};

export function MetaDecksTab({ metaDecks, hasStaleCache, isLoading, isError, error, onRetry, arenaId }: MetaDecksTabProps) {
  const { t } = useLocale();
  const { toast } = useToast();
  const [innerTab, setInnerTab] = useState<MetaInnerTab>("decks");

  // Fetch arena-personalized meta decks (Story 2.1, AC3/AC7)
  const arenaDecksQuery = useQuery({
    queryKey: ["arena-meta-decks", arenaId],
    queryFn: () => api.decks.getArenaMetaDecks(arenaId),
    staleTime: 60 * 60 * 1000, // 1 hour (matches server cache TTL)
  });

  const arenaDecks = arenaDecksQuery.data || [];
  const hasArenaData = arenaDecks.length > 0;

  // Use arena decks when available, fall back to global meta decks
  const effectiveMetaDecks = hasArenaData ? [] : metaDecks;
  const metaCardRows = useMemo(() => buildMetaCardRows(effectiveMetaDecks), [effectiveMetaDecks]);

  const handleCopyDeck = async (deck: MetaDeck | ArenaMetaDeckData) => {
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
          <h1 className="text-2xl md:text-3xl font-display font-bold">{t("decks.meta.title")}</h1>
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

      {hasStaleCache && !hasArenaData ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{t("pages.decks.staleCache")}</AlertDescription>
        </Alert>
      ) : null}

      {innerTab === "decks" ? (
        hasArenaData || arenaDecksQuery.isLoading || arenaDecksQuery.isError ? (
          <ArenaMetaDecksView
            arenaDecks={arenaDecks}
            isLoading={arenaDecksQuery.isLoading}
            isError={arenaDecksQuery.isError}
            error={arenaDecksQuery.error}
            onRetry={() => arenaDecksQuery.refetch()}
            onCopyDeck={handleCopyDeck}
          />
        ) : isLoading ? (
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
          <MetaPopularDecksView metaDecks={metaDecks} onCopyDeck={handleCopyDeck} />
        )
      ) : innerTab === "cards" ? (
        <MetaCardsView rows={metaCardRows} />
      ) : innerTab === "evolutions" ? (
        <MetaEvolutionsView rows={metaCardRows} />
      ) : innerTab === "heroes" ? (
        <MetaHeroesView rows={metaCardRows} />
      ) : (
        <MetaTowerTroopsView rows={metaCardRows} />
      )}
    </div>
  );
}

export default MetaDecksTab;
