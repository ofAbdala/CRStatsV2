/**
 * Advanced Stats Section (Story 2.4)
 *
 * Renders season selector, season summary card, card win rates,
 * deck stats with 3-crown rate, and matchup data per deck.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  BarChart3,
  Calendar,
  Crown,
  Loader2,
  Swords,
  Target,
  Trophy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api, type DeckStatsData, type CardWinRateData, type MatchupData } from "@/lib/api";
import ClashCardImage from "@/components/clash/ClashCardImage";

interface AdvancedStatsSectionProps {
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function MeAdvancedStatsSection({ t }: AdvancedStatsSectionProps) {
  const [selectedSeason, setSelectedSeason] = useState<number | undefined>(undefined);

  // Fetch season summary (also returns available seasons list)
  const seasonQuery = useQuery({
    queryKey: ["player-stats-season", selectedSeason],
    queryFn: () => api.player.stats.season(selectedSeason !== undefined ? { season: selectedSeason } : undefined),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Fetch card win rates for selected season
  const cardStatsQuery = useQuery({
    queryKey: ["player-stats-cards", selectedSeason],
    queryFn: () => api.player.stats.cards(selectedSeason !== undefined ? { season: selectedSeason } : undefined),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Fetch deck stats for selected season
  const deckStatsQuery = useQuery({
    queryKey: ["player-stats-decks", selectedSeason],
    queryFn: () => api.player.stats.decks(selectedSeason !== undefined ? { season: selectedSeason } : undefined),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const seasonData = seasonQuery.data;
  const availableSeasons = seasonData?.availableSeasons ?? [];
  const cardWinRates = cardStatsQuery.data?.cards ?? [];
  const deckStats = deckStatsQuery.data?.decks ?? [];

  return (
    <div className="space-y-6">
      {/* Season Selector */}
      {availableSeasons.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-primary" />
              <Label className="text-sm font-medium">{t("pages.me.advancedStats.seasonSelector")}</Label>
              <Select
                value={selectedSeason !== undefined ? String(selectedSeason) : "current"}
                onValueChange={(value) => {
                  if (value === "current") {
                    setSelectedSeason(undefined);
                  } else {
                    const num = Number(value);
                    if (Number.isFinite(num)) setSelectedSeason(num);
                  }
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={seasonData?.seasonLabel ?? t("pages.me.advancedStats.allSeasons")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">
                    {seasonData?.seasonLabel ?? t("pages.me.advancedStats.allSeasons")}
                  </SelectItem>
                  {availableSeasons
                    .filter((s) => s.season !== seasonData?.season)
                    .map((s) => (
                      <SelectItem key={s.season} value={String(s.season)}>
                        {s.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Season Summary Card (AC7, AC8) */}
      {seasonQuery.isLoading ? (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t("pages.me.advancedStats.cardWinRates.loading")}
          </CardContent>
        </Card>
      ) : seasonData && seasonData.totalBattles > 0 ? (
        <SeasonSummaryCard data={seasonData} t={t} />
      ) : null}

      {/* Deck Stats with 3-Crown Rate (AC1, AC2) */}
      <DeckStatsSection decks={deckStats} isLoading={deckStatsQuery.isLoading} t={t} />

      {/* Card Win Rates (AC3) */}
      <CardWinRatesSection cards={cardWinRates} isLoading={cardStatsQuery.isLoading} t={t} />
    </div>
  );
}

// ── Season Summary Card ────────────────────────────────────────────────────

function SeasonSummaryCard({
  data,
  t,
}: {
  data: {
    seasonLabel: string;
    totalBattles: number;
    wins: number;
    losses: number;
    winRate: number;
    peakTrophies: number | null;
    mostUsedDeck: { deckHash: string; cards: string[]; battles: number } | null;
    bestCard: { cardId: string; winRate: number; battles: number } | null;
  };
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <Card className="border-border/50 bg-gradient-to-br from-card via-card/95 to-primary/5 backdrop-blur-sm" data-testid="season-summary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="w-5 h-5 text-primary" />
          {t("pages.me.advancedStats.seasonSummaryCard.title")} - {data.seasonLabel}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-background/50 border border-border/50">
            <p className="text-xs text-muted-foreground">{t("pages.me.advancedStats.seasonSummaryCard.totalBattles")}</p>
            <p className="text-2xl font-bold">{data.totalBattles}</p>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500">{data.wins}W</span>
              {" / "}
              <span className="text-red-500">{data.losses}L</span>
            </p>
          </div>
          <div className="p-3 rounded-lg bg-background/50 border border-border/50">
            <p className="text-xs text-muted-foreground">{t("pages.me.advancedStats.seasonSummaryCard.winRate")}</p>
            <p className={cn("text-2xl font-bold", data.winRate >= 50 ? "text-green-500" : "text-red-500")}>
              {data.winRate}%
            </p>
          </div>
          {data.peakTrophies != null && (
            <div className="p-3 rounded-lg bg-background/50 border border-border/50">
              <p className="text-xs text-muted-foreground">{t("pages.me.advancedStats.seasonSummaryCard.peakTrophies")}</p>
              <p className="text-2xl font-bold text-yellow-500">{data.peakTrophies.toLocaleString()}</p>
            </div>
          )}
          {data.bestCard && (
            <div className="p-3 rounded-lg bg-background/50 border border-border/50">
              <p className="text-xs text-muted-foreground">{t("pages.me.advancedStats.seasonSummaryCard.bestCard")}</p>
              <p className="text-lg font-bold text-primary">{data.bestCard.cardId}</p>
              <p className="text-xs text-muted-foreground">{data.bestCard.winRate}% WR</p>
            </div>
          )}
        </div>
        {data.mostUsedDeck && (
          <div className="mt-4 p-3 rounded-lg bg-background/30 border border-border/30">
            <p className="text-xs text-muted-foreground mb-2">
              {t("pages.me.advancedStats.seasonSummaryCard.mostUsedDeck")} ({t("pages.me.advancedStats.seasonSummaryCard.battles", { count: data.mostUsedDeck.battles })})
            </p>
            <div className="flex gap-1">
              {data.mostUsedDeck.cards.slice(0, 8).map((cardName, idx) => (
                <ClashCardImage
                  key={idx}
                  name={cardName}
                  size="sm"
                  showLevel={false}
                  className="w-8 h-10 rounded bg-background/30 border-0"
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Deck Stats Section (AC1, AC2, AC5) ──────────────────────────────────────

function DeckStatsSection({
  decks,
  isLoading,
  t,
}: {
  decks: DeckStatsData[];
  isLoading: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const [expandedDeck, setExpandedDeck] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t("pages.me.advancedStats.deckStats.loading")}
        </CardContent>
      </Card>
    );
  }

  if (decks.length === 0) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Swords className="w-5 h-5 text-primary" />
            {t("pages.me.advancedStats.deckStats.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("pages.me.advancedStats.deckStats.noData")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Swords className="w-5 h-5 text-primary" />
        {t("pages.me.advancedStats.deckStats.title")}
      </h3>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {decks.map((deck) => (
          <DeckStatCard
            key={deck.deckHash}
            deck={deck}
            isExpanded={expandedDeck === deck.deckHash}
            onToggle={() => setExpandedDeck(expandedDeck === deck.deckHash ? null : deck.deckHash)}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

function DeckStatCard({
  deck,
  isExpanded,
  onToggle,
  t,
}: {
  deck: DeckStatsData;
  isExpanded: boolean;
  onToggle: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-colors" data-testid={`deck-stat-${deck.deckHash.slice(0, 10)}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span className="truncate">{deck.archetype || "Custom"}</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                deck.winRate >= 50 ? "border-green-500/50 text-green-500" : "border-red-500/50 text-red-500"
              )}
            >
              <Trophy className="w-3 h-3 mr-1" />
              {deck.winRate}%
            </Badge>
            <Badge variant="outline" className="border-yellow-500/50 text-yellow-500">
              <Crown className="w-3 h-3 mr-1" />
              {deck.threeCrownRate}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-4 gap-1">
          {deck.cards.slice(0, 8).map((cardName, idx) => (
            <ClashCardImage
              key={idx}
              name={cardName}
              size="sm"
              showLevel={false}
              className="w-10 h-12 rounded bg-background/30 border-0"
            />
          ))}
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Swords className="w-3 h-3" />
            {t("pages.me.advancedStats.deckStats.battles", { count: deck.battles })}
          </span>
          <span>
            <span className="text-green-500">{deck.wins}W</span>
            {" / "}
            <span className="text-red-500">{deck.battles - deck.wins}L</span>
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {t("pages.me.advancedStats.deckStats.threeCrownRate")}: <span className="text-yellow-500 font-medium">{deck.threeCrownRate}%</span>
          </span>
          <button
            onClick={onToggle}
            className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors text-xs font-medium"
          >
            {t("pages.me.advancedStats.deckStats.matchups")}
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
        {isExpanded && <DeckMatchupsPanel deckHash={deck.deckHash} t={t} />}
      </CardContent>
    </Card>
  );
}

// ── Matchups Panel (AC5, AC6) ─────────────────────────────────────────────

function DeckMatchupsPanel({
  deckHash,
  t,
}: {
  deckHash: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const matchupsQuery = useQuery({
    queryKey: ["player-stats-matchups", deckHash],
    queryFn: () => api.player.stats.matchups(deckHash),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const matchups: MatchupData[] = matchupsQuery.data?.matchups ?? [];

  if (matchupsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        {t("pages.me.advancedStats.matchups.loading")}
      </div>
    );
  }

  if (matchups.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-2">
        {t("pages.me.advancedStats.matchups.noData")}
      </p>
    );
  }

  return (
    <div className="space-y-2 pt-2 border-t border-border/30">
      <p className="text-xs font-medium text-muted-foreground">{t("pages.me.advancedStats.matchups.title")}</p>
      {matchups.map((matchup) => (
        <div
          key={matchup.opponentArchetype}
          className="flex items-center justify-between py-1.5 px-2 rounded bg-background/30"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">{matchup.opponentArchetype}</span>
            <span className="text-[10px] text-muted-foreground">
              {t("pages.me.advancedStats.matchups.battles", { count: matchup.battles })}
            </span>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-1.5 py-0",
              matchup.winRate >= 50 ? "border-green-500/50 text-green-500" : "border-red-500/50 text-red-500"
            )}
          >
            {matchup.winRate}%
          </Badge>
        </div>
      ))}
    </div>
  );
}

// ── Card Win Rates Section (AC3) ─────────────────────────────────────────

function CardWinRatesSection({
  cards,
  isLoading,
  t,
}: {
  cards: CardWinRateData[];
  isLoading: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t("pages.me.advancedStats.cardWinRates.loading")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm" data-testid="card-win-rates">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="w-5 h-5 text-primary" />
          {t("pages.me.advancedStats.cardWinRates.title")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t("pages.me.advancedStats.cardWinRates.subtitle")}</p>
      </CardHeader>
      <CardContent>
        {cards.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("pages.me.advancedStats.cardWinRates.noData")}
          </p>
        ) : (
          <div className="space-y-2">
            {cards.slice(0, 20).map((card) => (
              <div
                key={card.cardId}
                className="flex items-center gap-3 py-2 px-3 rounded-lg bg-background/30 border border-border/30"
              >
                <ClashCardImage
                  name={card.cardId}
                  size="sm"
                  showLevel={false}
                  className="w-8 h-10 rounded bg-background/30 border-0 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{card.cardId}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {card.battles} {t("pages.me.advancedStats.cardWinRates.battles").toLowerCase()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        card.winRate >= 55 ? "bg-green-500" : card.winRate >= 45 ? "bg-yellow-500" : "bg-red-500"
                      )}
                      style={{ width: `${Math.min(card.winRate, 100)}%` }}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium w-14 text-right",
                      card.winRate >= 55 ? "text-green-500" : card.winRate >= 45 ? "text-yellow-500" : "text-red-500"
                    )}
                  >
                    {card.winRate}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
