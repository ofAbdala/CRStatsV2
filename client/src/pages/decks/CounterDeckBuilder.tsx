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
import { AlertCircle, Copy, Loader2 } from "lucide-react";

import { DeckDisplay } from "./DeckDisplay";
import {
  type DeckStyle,
  type DeckSuggestion,
  PROBLEM_CARDS,
  buildCardListText,
  isDeckStyle,
  isProblemCard,
} from "./types";

export function CounterDeckBuilder() {
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
    </div>
  );
}

export default CounterDeckBuilder;
