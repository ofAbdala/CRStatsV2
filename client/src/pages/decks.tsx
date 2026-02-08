import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import ClashCardImage from "@/components/clash/ClashCardImage";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageErrorState from "@/components/PageErrorState";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/hooks/use-locale";
import { usePlayerSync } from "@/hooks/usePlayerSync";
import { api } from "@/lib/api";
import { buildDeckStatsFromBattles, type DeckStats } from "@/lib/analytics/deckStats";
import { getApiErrorMessage } from "@/lib/errorMessages";
import { cn } from "@/lib/utils";
import { AlertCircle, Copy, Loader2, RefreshCcw, Swords, Target, TrendingDown, TrendingUp } from "lucide-react";

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

export default function DecksPage() {
  const { t, locale } = useLocale();
  const { toast } = useToast();
  const { sync, isLoading: syncLoading, isFetching: syncFetching, refresh } = usePlayerSync();

  const metaDecksQuery = useQuery({
    queryKey: ["meta-decks"],
    queryFn: () => api.meta.getDecks() as Promise<MetaDeck[]>,
    staleTime: 60 * 60 * 1000,
  });

  const battles = sync?.battles || [];
  const myDecks = useMemo(() => buildDeckStatsFromBattles(battles, { limit: 10 }), [battles]);

  const metaDecks = metaDecksQuery.data || [];
  const hasStaleCache = metaDecks.some((deck) => deck.cacheStatus === "stale");

  const copyMyDeckLink = async (deck: DeckStats) => {
    const ids = deck.cards.map((card) => card.id).filter((value): value is number => typeof value === "number");
    const language = locale === "pt-BR" ? "pt" : "en";
    const link = ids.length === 8 ? `https://link.clashroyale.com/deck/${language}?deck=${ids.join(";")}` : null;

    try {
      await navigator.clipboard.writeText(link || deck.cards.map((card) => card.name).join(", "));
      toast({
        title: t("pages.decks.toast.copiedTitle"),
        description: link ? t("pages.decks.toast.copiedLink") : t("pages.decks.toast.copiedList"),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast({
        title: t("pages.decks.toast.copyErrorTitle"),
        description: message,
        variant: "destructive",
      });
    }
  };

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
                <Card key={deck.key} className="border-border/50 bg-card/50 backdrop-blur-sm group hover:border-primary/30 transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Swords className="w-4 h-4" />
                        {t("pages.decks.deckIndex", { index: index + 1 })}
                        {index === 0 ? <Badge className="bg-primary/20 text-primary border-primary/20 hover:bg-primary/30">{t("pages.decks.mainDeckBadge")}</Badge> : null}
                        {deck.avgElixir !== null ? (
                          <Badge variant="outline" className="text-muted-foreground">
                            {t("pages.decks.avgElixir", { value: deck.avgElixir.toFixed(1) })}
                          </Badge>
                        ) : null}
                      </CardTitle>

                      <div className="flex items-center gap-4 text-sm">
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
                        <span className="text-muted-foreground">{t("pages.decks.matches", { count: deck.matches })}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-4">
                      {deck.cards.slice(0, 8).map((card, cardIndex) => (
                        <ClashCardImage
                          key={card.id || `${card.name}-${cardIndex}`}
                          name={card.name}
                          iconUrls={card.iconUrls}
                          level={typeof card.level === "number" ? card.level : null}
                          size="lg"
                        />
                      ))}
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" className="h-8" onClick={() => copyMyDeckLink(deck)}>
                        <Copy className="w-3.5 h-3.5 mr-2" />
                        {t("pages.decks.actions.copyLink")}
                      </Button>
                      <Button
                        size="sm"
                        className="h-8"
                        onClick={() => {
                          toast({
                            title: t("pages.decks.toast.detailsTitle"),
                            description: t("pages.decks.toast.detailsDescription"),
                          });
                        }}
                      >
                        {t("pages.decks.actions.viewDetails")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="meta-decks" className="mt-4 space-y-4">
            {hasStaleCache ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{t("pages.decks.staleCache")}</AlertDescription>
              </Alert>
            ) : null}

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
                <Card key={deck.id || deck.deckHash} className="border-border/50 bg-card/50 backdrop-blur-sm group hover:border-primary/30 transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        {deck.archetype || t("pages.decks.metaDeckFallback")}
                        {deck.cacheStatus === "stale" ? <Badge variant="secondary">{t("pages.decks.staleBadge")}</Badge> : null}
                      </CardTitle>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="outline" className="text-green-500 border-green-500/40">
                          {t("pages.decks.estimatedWr", { value: deck.estimatedWinRate?.toFixed?.(1) ?? deck.estimatedWinRate })}
                        </Badge>
                        <Badge variant="outline">{t("pages.decks.sampleSize", { value: deck.sampleSize ?? deck.usageCount ?? 0 })}</Badge>
                        <Badge variant="outline">{t("pages.decks.usageCount", { value: deck.usageCount ?? 0 })}</Badge>
                        {typeof deck.avgTrophies === "number" ? <Badge variant="outline">{t("pages.decks.avgTrophies", { value: deck.avgTrophies })}</Badge> : null}
                      </div>
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
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
