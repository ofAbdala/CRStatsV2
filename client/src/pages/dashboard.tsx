import { Link } from "wouter";
import { format } from "date-fns";
import { enUS, ptBR } from "date-fns/locale";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { usePlayerSync } from "@/hooks/usePlayerSync";
import { useFavorites } from "@/hooks/useFavorites";
import { AlertCircle, Crown, Loader2, RefreshCcw, Target, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";
import { getApiErrorMessage } from "@/lib/errorMessages";

function getTiltLabel(tiltLevel: "high" | "medium" | "none" | undefined, t: (key: string) => string) {
  if (tiltLevel === "high") return t("pages.dashboard.tilt.high");
  if (tiltLevel === "medium") return t("pages.dashboard.tilt.medium");
  return t("pages.dashboard.tilt.none");
}

function getTiltClass(tiltLevel?: "high" | "medium" | "none") {
  if (tiltLevel === "high") return "border-red-500/50 text-red-500";
  if (tiltLevel === "medium") return "border-yellow-500/50 text-yellow-500";
  return "border-green-500/50 text-green-500";
}

export default function DashboardPage() {
  const { t, locale } = useLocale();
  const { sync, derivedStatus, isLoading, isFetching, refresh, error } = usePlayerSync();
  const { data: favorites = [], isLoading: favoritesLoading } = useFavorites();

  const player = sync?.player ?? null;
  const battles = sync?.battles ?? [];
  const goals = sync?.goals ?? [];
  const stats = sync?.stats;
  const latestFive = battles.slice(0, 5);

  const updatedAtText = sync?.lastSyncedAt
    ? format(new Date(sync.lastSyncedAt), "Pp", { locale: locale === "pt-BR" ? ptBR : enUS })
    : t("pages.dashboard.noSync");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-display font-bold">{t("pages.dashboard.title")}</h1>
            <p className="text-muted-foreground">{t("pages.dashboard.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getTiltClass(stats?.tiltLevel)}>
              {getTiltLabel(stats?.tiltLevel, t)}
            </Badge>
            <Badge variant="outline">
              {t("pages.dashboard.lastUpdate", { time: updatedAtText })}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refresh()}
              disabled={isFetching}
              data-testid="button-refresh-sync"
            >
              {isFetching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
              {t("pages.dashboard.sync")}
            </Button>
          </div>
        </div>

        {derivedStatus === "error" && (
          <Alert data-testid="sync-error-alert">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {getApiErrorMessage(error, t)}
            </AlertDescription>
          </Alert>
        )}

        {sync?.partial && (
          <Alert data-testid="sync-partial-alert">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t("pages.dashboard.partialSync")}
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="min-h-[300px] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title={t("pages.dashboard.stats.trophies")} value={player?.trophies ?? 0} />
              <StatCard title={t("pages.dashboard.stats.winRate")} value={`${Math.round(stats?.winRate ?? 0)}%`} />
              <StatCard title={t("pages.dashboard.stats.wins")} value={stats?.wins ?? 0} />
              <StatCard title={t("pages.dashboard.stats.losses")} value={stats?.losses ?? 0} />
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-border/50 bg-card/50">
                <CardHeader>
                  <CardTitle>{t("pages.dashboard.recentBattlesTitle")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {latestFive.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("pages.dashboard.emptyBattles")}</p>
                  ) : (
                    latestFive.map((battle: any, index: number) => {
                      const myCrowns = battle?.team?.[0]?.crowns || 0;
                      const oppCrowns = battle?.opponent?.[0]?.crowns || 0;
                      const result = myCrowns > oppCrowns ? "W" : myCrowns < oppCrowns ? "L" : "D";
                      const trophyChange = battle?.team?.[0]?.trophyChange || 0;
                      return (
                        <div
                          key={`${battle?.battleTime || "battle"}-${index}`}
                          className="flex items-center justify-between border border-border/40 rounded-lg px-3 py-2"
                        >
                          <div className="flex items-center gap-3">
                            <Badge
                              variant="outline"
                              className={cn(
                                result === "W" && "border-green-500/50 text-green-500",
                                result === "L" && "border-red-500/50 text-red-500",
                              )}
                            >
                              {result}
                            </Badge>
                            <div>
                              <p className="text-sm font-medium">{battle?.opponent?.[0]?.name || t("pages.dashboard.opponentFallback")}</p>
                              <p className="text-xs text-muted-foreground">
                                {myCrowns} x {oppCrowns}
                              </p>
                            </div>
                          </div>
                          <span
                            className={cn(
                              "text-sm font-medium",
                              trophyChange > 0 && "text-green-500",
                              trophyChange < 0 && "text-red-500",
                            )}
                          >
                            {trophyChange > 0 ? "+" : ""}{trophyChange}
                          </span>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="border-border/50 bg-card/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      {t("pages.dashboard.goalsTitle")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {goals.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t("pages.dashboard.emptyGoals")}</p>
                    ) : (
                      goals.slice(0, 3).map((goal: any) => {
                        const currentValue = goal.currentValue || 0;
                        const targetValue = goal.targetValue || 0;
                        const progress = targetValue > 0 ? Math.min(100, (currentValue / targetValue) * 100) : 0;
                        return (
                          <div key={goal.id} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium">{goal.title}</span>
                              <span className="text-muted-foreground">
                                {currentValue}/{targetValue}
                              </span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>
                        );
                      })
                    )}
                    <Link href="/profile">
                      <Button variant="outline" size="sm" className="w-full">
                        {t("pages.dashboard.manageGoals")}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-yellow-500" />
                      {t("pages.dashboard.favoritesTitle")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {favoritesLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    ) : (favorites as any[]).length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t("pages.dashboard.emptyFavorites")}</p>
                    ) : (
                      (favorites as any[]).slice(0, 4).map((fav: any) => (
                        <div key={fav.id} className="flex justify-between text-sm border-b border-border/30 pb-1">
                          <span className="font-medium">{fav.name}</span>
                          <span className="text-muted-foreground">{fav.trophies ?? "-"}</span>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  const { t } = useLocale();
  return (
    <Card className="border-border/50 bg-card/50">
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{title}</p>
        <div className="text-2xl font-display font-bold mt-1 flex items-center gap-2">
          {title === t("pages.dashboard.stats.trophies") ? <Trophy className="w-5 h-5 text-yellow-500" /> : null}
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
