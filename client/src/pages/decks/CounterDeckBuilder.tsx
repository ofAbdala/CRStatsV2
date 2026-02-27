/**
 * CounterDeckBuilder -- Counter-deck suggestion UI.
 *
 * Allows the player to select a "problem card" and a deck style, then
 * generates a counter-deck suggestion via the API.
 *
 * Extracted from the original decks.tsx god-file (Story 1.7, TD-002).
 */

import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/hooks/use-locale";
import { api, ApiError, type CounterDeckData } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errorMessages";
import { AlertCircle, AlertTriangle, Copy, Loader2, Search, Shield, Trophy } from "lucide-react";

import { DeckDisplay } from "./DeckDisplay";
import {
  type DeckStyle,
  type DeckSuggestion,
  PROBLEM_CARDS,
  UNKNOWN_VALUE,
  buildCardListText,
  isDeckStyle,
  isProblemCard,
  getArenaName,
} from "./types";

export function CounterDeckBuilder({ arenaId }: { arenaId: number }) {
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

  // Data-driven counter decks from real battle data (Story 2.1, AC4-AC6)
  const counterDecksQuery = useQuery({
    queryKey: ["counter-decks", selectedCard, arenaId],
    queryFn: () => api.decks.getCounterDecks(selectedCard, arenaId),
    enabled: !!selectedCard,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  const counterDecks = counterDecksQuery.data?.decks || [];
  const counterLimitedData = counterDecksQuery.data?.limitedData ?? false;

  const handleCopyCounterDeck = async (deck: CounterDeckData) => {
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

                <DeckDisplay
                  cards={generatedDeck.cards.slice(0, 8)}
                  keyPrefix="counter"
                  size="lg"
                  showLevel={false}
                />

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

      {/* Data-driven counter decks from real battle data (Story 2.1, AC6) */}
      {selectedCard ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-display font-semibold">
              Counter Decks vs {selectedCard}
            </h2>
            <Badge variant="outline" className="text-xs">
              {getArenaName(arenaId)}
            </Badge>
            {counterLimitedData ? (
              <Badge variant="outline" className="text-yellow-600 border-yellow-600/30 text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Limited Data
              </Badge>
            ) : null}
          </div>

          {counterDecksQuery.isLoading ? (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching battle data for counter decks...
              </CardContent>
            </Card>
          ) : counterDecksQuery.isError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load counter deck data. Try again later.
              </AlertDescription>
            </Alert>
          ) : counterDecks.length === 0 ? (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                No counter deck data available for {selectedCard} in {getArenaName(arenaId)} yet.
                Data is collected daily from real battles.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {counterDecks.map((deck, index) => (
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
                          <Trophy className="w-4 h-4 text-green-500" />
                          <span className="text-green-500 font-semibold">
                            {Number.isFinite(deck.winRateVsTarget)
                              ? `${(deck.winRateVsTarget * 100).toFixed(1)}%`
                              : UNKNOWN_VALUE}{" "}
                            win rate
                          </span>
                          {deck.limitedData ? (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600/30 text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Limited
                            </Badge>
                          ) : null}
                        </CardTitle>

                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                          <div className="rounded-md border border-border/50 bg-muted/20 px-2 py-1">
                            <p className="text-muted-foreground">Win Rate vs {selectedCard}</p>
                            <p className="font-medium text-green-500">
                              {Number.isFinite(deck.winRateVsTarget)
                                ? `${(deck.winRateVsTarget * 100).toFixed(1)}%`
                                : UNKNOWN_VALUE}
                            </p>
                          </div>
                          <div className="rounded-md border border-border/50 bg-muted/20 px-2 py-1">
                            <p className="text-muted-foreground">{t("decks.meta.sampleSize")}</p>
                            <p className="font-medium">{deck.sampleSize}</p>
                          </div>
                          <div className="rounded-md border border-border/50 bg-muted/20 px-2 py-1">
                            <p className="text-muted-foreground">3-Crown Rate</p>
                            <p className="font-medium">
                              {Number.isFinite(deck.threeCrownRate)
                                ? `${(deck.threeCrownRate * 100).toFixed(1)}%`
                                : UNKNOWN_VALUE}
                            </p>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 shrink-0"
                        onClick={() => handleCopyCounterDeck(deck)}
                      >
                        <Copy className="w-3.5 h-3.5 mr-2" />
                        {t("decks.meta.copyDeck")}
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <DeckDisplay
                      cards={(deck.cards || []).slice(0, 8)}
                      keyPrefix={`counter-data-${deck.deckHash}`}
                      size="lg"
                      showLevel={false}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default CounterDeckBuilder;
