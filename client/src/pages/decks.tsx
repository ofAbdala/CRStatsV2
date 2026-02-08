import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageErrorState from "@/components/PageErrorState";
import { usePlayerSync } from "@/hooks/usePlayerSync";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { AlertCircle, Loader2, RefreshCcw, Swords, Target } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { getApiErrorMessage } from "@/lib/errorMessages";

interface MyDeckStats {
  key: string;
  cards: string[];
  matches: number;
  wins: number;
  losses: number;
  winRate: number;
  netTrophies: number;
  avgElixir: number | null;
}

interface DeckAccumulator {
  cards: string[];
  matches: number;
  wins: number;
  losses: number;
  netTrophies: number;
  elixirSamples: number[];
}

interface MetaDeck {
  id: string;
  deckHash: string;
  cards: string[];
  usageCount: number;
  avgTrophies: number | null;
  archetype: string | null;
  sampleSize: number;
  estimatedWinRate: number;
  cacheStatus?: "fresh" | "stale";
}

function getBattleResult(battle: any): "win" | "loss" | "draw" {
  const myCrowns = battle?.team?.[0]?.crowns || 0;
  const oppCrowns = battle?.opponent?.[0]?.crowns || 0;
  if (myCrowns > oppCrowns) return "win";
  if (myCrowns < oppCrowns) return "loss";
  return "draw";
}

function buildMyDeckStats(battles: any[]): MyDeckStats[] {
  const map = new Map<string, DeckAccumulator>();

  for (const battle of battles) {
    const team = battle?.team?.[0];
    const cards: string[] = Array.isArray(team?.cards)
      ? (team.cards as any[])
          .map((card: any) => String(card?.name || "").trim())
          .filter((cardName: string) => cardName.length > 0)
      : [];

    if (cards.length === 0) continue;

    const key = [...cards].sort().join("|");
    if (!key) continue;

    const existing: DeckAccumulator =
      map.get(key) ||
      {
        cards,
        matches: 0,
        wins: 0,
        losses: 0,
        netTrophies: 0,
        elixirSamples: [],
      };

    existing.matches += 1;

    const result = getBattleResult(battle);
    if (result === "win") existing.wins += 1;
    if (result === "loss") existing.losses += 1;

    existing.netTrophies += team?.trophyChange || 0;

    const costs: number[] = cards
      .map((cardName: string) => {
        const card = team.cards.find((item: any) => item?.name === cardName);
        return typeof card?.elixirCost === "number" ? card.elixirCost : null;
      })
      .filter((value: number | null): value is number => value !== null);

    if (costs.length > 0) {
      const avg = costs.reduce((acc: number, value: number) => acc + value, 0) / costs.length;
      existing.elixirSamples.push(avg);
    }

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
        winRate: value.matches > 0 ? (value.wins / value.matches) * 100 : 0,
        netTrophies: value.netTrophies,
        avgElixir,
      };
    })
    .sort((a, b) => b.matches - a.matches)
    .slice(0, 10);
}

export default function DecksPage() {
  const { t } = useLocale();
  const { sync, isLoading: syncLoading, isFetching: syncFetching, refresh } = usePlayerSync();

  const metaDecksQuery = useQuery({
    queryKey: ["meta-decks"],
    queryFn: () => api.meta.getDecks() as Promise<MetaDeck[]>,
    staleTime: 60 * 60 * 1000,
  });

  const battles = sync?.battles || [];
  const myDecks = useMemo(() => buildMyDeckStats(battles), [battles]);

  const metaDecks = metaDecksQuery.data || [];
  const hasStaleCache = metaDecks.some((deck) => deck.cacheStatus === "stale");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-display font-bold">{t("pages.decks.title")}</h1>
            <p className="text-muted-foreground">{t("pages.decks.subtitle")}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refresh()} disabled={syncFetching}>
            {syncFetching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
            {t("pages.decks.refreshSync")}
          </Button>
        </div>

        <Tabs defaultValue="my-decks" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-[420px]">
            <TabsTrigger value="my-decks">{t("pages.decks.tabs.myDecks")}</TabsTrigger>
            <TabsTrigger value="meta-decks">{t("pages.decks.tabs.metaDecks")}</TabsTrigger>
          </TabsList>

          <TabsContent value="my-decks" className="mt-4 space-y-4">
            {syncLoading ? (
              <Card className="border-border/50 bg-card/50">
                <CardContent className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("pages.decks.loadingMyDecks")}
                </CardContent>
              </Card>
            ) : myDecks.length === 0 ? (
              <Card className="border-border/50 bg-card/50">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  {t("pages.decks.emptyMyDecks")}
                </CardContent>
              </Card>
            ) : (
              myDecks.map((deck, index) => (
                <Card key={deck.key} className="border-border/50 bg-card/50">
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Swords className="w-4 h-4" />
                          {t("pages.decks.deckIndex", { index: index + 1 })}
                          {index === 0 ? <Badge>{t("pages.decks.mainDeckBadge")}</Badge> : null}
                        </CardTitle>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant="outline">{t("pages.decks.matches", { count: deck.matches })}</Badge>
                          <Badge variant="outline" className={cn(deck.winRate >= 50 ? "text-green-500 border-green-500/40" : "text-red-500 border-red-500/40")}>
                            {Math.round(deck.winRate)}% WR
                          </Badge>
                          <Badge variant="outline" className={cn(deck.netTrophies >= 0 ? "text-green-500 border-green-500/40" : "text-red-500 border-red-500/40")}>
                          {t("pages.decks.netTrophies", { value: `${deck.netTrophies > 0 ? "+" : ""}${deck.netTrophies}` })}
                          </Badge>
                          {deck.avgElixir !== null && (
                          <Badge variant="outline">{t("pages.decks.avgElixir", { value: deck.avgElixir.toFixed(1) })}</Badge>
                          )}
                        </div>
                      </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {deck.cards.map((card) => (
                        <Badge key={`${deck.key}-${card}`} variant="secondary">
                          {card}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="meta-decks" className="mt-4 space-y-4">
            {hasStaleCache && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t("pages.decks.staleCache")}
                </AlertDescription>
              </Alert>
            )}

            {metaDecksQuery.isLoading ? (
              <Card className="border-border/50 bg-card/50">
                <CardContent className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("pages.decks.loadingMetaDecks")}
                </CardContent>
              </Card>
            ) : metaDecksQuery.isError ? (
              <PageErrorState
                title={t("pages.decks.metaErrorTitle")}
                description={getApiErrorMessage(metaDecksQuery.error, t, "pages.decks.metaErrorDescription")}
                error={metaDecksQuery.error}
                onRetry={() => metaDecksQuery.refetch()}
              />
            ) : metaDecks.length === 0 ? (
              <Card className="border-border/50 bg-card/50">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  {t("pages.decks.emptyMetaDecks")}
                </CardContent>
              </Card>
            ) : (
              metaDecks.map((deck) => (
                <Card key={deck.id || deck.deckHash} className="border-border/50 bg-card/50">
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        {deck.archetype || t("pages.decks.metaDeckFallback")}
                      </CardTitle>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="outline" className="text-green-500 border-green-500/40">
                          {t("pages.decks.estimatedWr", { value: deck.estimatedWinRate?.toFixed?.(1) ?? deck.estimatedWinRate })}
                        </Badge>
                        <Badge variant="outline">{t("pages.decks.sampleSize", { value: deck.sampleSize ?? deck.usageCount ?? 0 })}</Badge>
                        <Badge variant="outline">{t("pages.decks.usageCount", { value: deck.usageCount ?? 0 })}</Badge>
                        {typeof deck.avgTrophies === "number" && <Badge variant="outline">{t("pages.decks.avgTrophies", { value: deck.avgTrophies })}</Badge>}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {(deck.cards || []).map((card) => (
                        <Badge key={`${deck.deckHash}-${card}`} variant="secondary">
                          {card}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
