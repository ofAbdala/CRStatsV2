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
  const [trophyRange, setTrophyRange] = useState<TrophyRange>("all");

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">{t("decks.meta.title")}</h1>
          <p className="text-muted-foreground">{t("decks.meta.subtitle")}</p>
        </div>

        <div className="w-full sm:w-[240px]">
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
        <div className="grid gap-4 md:grid-cols-2">
          {metaDecks.map((deck) => {
            const games = typeof deck.games === "number" ? deck.games : 0;
            const winRateText =
              typeof deck.winRateEstimate === "number" && Number.isFinite(deck.winRateEstimate)
                ? `${deck.winRateEstimate.toFixed(1)}%`
                : UNKNOWN_VALUE;
            const avgElixirText =
              typeof deck.avgElixir === "number" && Number.isFinite(deck.avgElixir)
                ? deck.avgElixir.toFixed(1)
                : UNKNOWN_VALUE;

            return (
              <Card
                key={deck.deckHash}
                className="border-border/50 bg-card/50 backdrop-blur-sm group hover:border-primary/30 transition-all"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        <span className="truncate">
                          {deck.archetype || t("decks.meta.deckFallback")}
                        </span>
                        {deck.cacheStatus === "stale" ? (
                          <Badge variant="secondary">{t("pages.decks.staleBadge")}</Badge>
                        ) : null}
                      </CardTitle>

                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <Badge variant="outline" className="text-muted-foreground">
                          {t("decks.meta.avgElixir")}: {avgElixirText}
                        </Badge>
                        <Badge variant="outline" className="text-green-500 border-green-500/40">
                          {t("decks.meta.winRate")}: {winRateText}
                        </Badge>
                        <Badge variant="outline" className="text-muted-foreground">
                          {t("decks.meta.sampleSize")}: {games}
                        </Badge>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0"
                      onClick={() => handleCopyDeck(deck)}
                    >
                      <Copy className="w-3.5 h-3.5 mr-2" />
                      {t("decks.meta.copyDeck")}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {(deck.cards || []).slice(0, 8).map((card, index) => (
                      <ClashCardImage
                        key={`${deck.deckHash}-${card}-${index}`}
                        name={card}
                        iconUrls={null}
                        level={null}
                        size="lg"
                        showLevel={false}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CounterDeckBuilderView() {
  const { t } = useLocale();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [selectedCard, setSelectedCard] = useState<(typeof PROBLEM_CARDS)[number] | null>(null);
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
                value={selectedCard ?? undefined}
                onValueChange={(value) => {
                  if (isProblemCard(value)) setSelectedCard(value);
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
  const [targetCard, setTargetCard] = useState<(typeof PROBLEM_CARDS)[number] | null>(null);

  useEffect(() => {
    if (goal !== "counter-card" && targetCard) setTargetCard(null);
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
                    value={targetCard ?? undefined}
                    onValueChange={(value) => {
                      if (isProblemCard(value)) setTargetCard(value);
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
