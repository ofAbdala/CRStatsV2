/**
 * DeckOptimizer -- Deck optimization UI.
 *
 * Allows the player to select one of their own decks, choose an optimization
 * goal, and receive AI-powered suggestions for card swaps.
 *
 * Extracted from the original decks.tsx god-file (Story 1.7, TD-002).
 */

import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/hooks/use-locale";
import { api, ApiError } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errorMessages";
import type { DeckStats } from "@/lib/analytics/deckStats";
import {
  AlertCircle,
  Copy,
  Loader2,
  RefreshCcw,
} from "lucide-react";

import { DeckDisplay, DeckSelectionCard } from "./DeckDisplay";
import {
  type DeckOptimizerResult,
  type OptimizerGoal,
  PROBLEM_CARDS,
  buildCardListText,
  isOptimizerGoal,
  isProblemCard,
} from "./types";

export type DeckOptimizerProps = {
  myDecks: DeckStats[];
  syncLoading: boolean;
  syncFetching: boolean;
  onRefresh: () => void;
};

export function DeckOptimizer({ myDecks, syncLoading, syncFetching, onRefresh }: DeckOptimizerProps) {
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
          <h1 className="text-2xl md:text-3xl font-display font-bold">{t("decks.optimizer.title")}</h1>
          <p className="text-muted-foreground">{t("decks.optimizer.subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => onRefresh()} disabled={syncFetching}>
          {syncFetching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
          {t("pages.decks.refreshSync")}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          {/* Step 1: Select Deck */}
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
                  {myDecks.map((deck, index) => (
                    <DeckSelectionCard
                      key={deck.key}
                      deck={deck}
                      index={index}
                      isSelected={selectedDeckKey === deck.key}
                      onSelect={setSelectedDeckKey}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Choose Goal */}
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

        {/* Step 3: Results */}
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
                        <DeckDisplay
                          cards={result.originalDeck.cards.slice(0, 8)}
                          keyPrefix="original"
                          size="md"
                          showLevel={false}
                          gridClassName="grid-cols-4 sm:grid-cols-8 md:grid-cols-4"
                        />
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
                        <DeckDisplay
                          cards={result.suggestedDeck.cards.slice(0, 8)}
                          keyPrefix="suggested"
                          size="md"
                          showLevel={false}
                          gridClassName="grid-cols-4 sm:grid-cols-8 md:grid-cols-4"
                        />
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

export default DeckOptimizer;
