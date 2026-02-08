import type { ReactNode } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { enUS, ptBR } from "date-fns/locale";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ClashCardImage from "@/components/clash/ClashCardImage";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { buildTrophyChartData, parseClashBattleTime } from "@/lib/analytics/trophyChart";
import { getArenaImageUrl } from "@/lib/clashIcons";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/errorMessages";
import { useLocale } from "@/hooks/use-locale";
import { useFavorites } from "@/hooks/useFavorites";
import { usePlayerSync } from "@/hooks/usePlayerSync";
import {
  AlertCircle,
  ChevronRight,
  Clock,
  Crown,
  Loader2,
  RefreshCcw,
  Star,
  Swords,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
  const chartData = buildTrophyChartData({
    battles,
    currentTrophies: player?.trophies,
    locale,
    days: 7,
  });

  const updatedAtText = sync?.lastSyncedAt
    ? format(new Date(sync.lastSyncedAt), "Pp", { locale: locale === "pt-BR" ? ptBR : enUS })
    : t("pages.dashboard.noSync");

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">{t("pages.dashboard.title")}</h1>
            <p className="text-muted-foreground">{t("pages.dashboard.subtitle")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg shadow-sm">
              {isLoading || isFetching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">{t("common.loading")}</span>
                </>
              ) : derivedStatus === "ok" ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium text-muted-foreground">{t("pages.dashboard.syncNow")}</span>
                </>
              ) : derivedStatus === "partial" ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                  <span className="text-sm font-medium text-muted-foreground">{t("pages.dashboard.syncPartial")}</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm font-medium text-muted-foreground">{t("pages.dashboard.syncError")}</span>
                </>
              )}
            </div>

            <Badge variant="outline" className={getTiltClass(stats?.tiltLevel)}>
              {getTiltLabel(stats?.tiltLevel, t)}
            </Badge>

            <Badge variant="outline">{t("pages.dashboard.lastUpdate", { time: updatedAtText })}</Badge>

            <Button variant="outline" size="sm" onClick={() => refresh()} disabled={isFetching}>
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
          <div className="min-h-[320px] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title={t("pages.dashboard.stats.trophies")}
                value={player?.trophies ?? 0}
                icon={<Trophy className="w-5 h-5 text-primary" />}
                trend={
                  player?.arena?.name ? t("pages.dashboard.stats.arenaLabel", { name: player.arena.name }) : undefined
                }
                trendUp
                arenaImage={
                  typeof player?.arena?.id === "number" ? getArenaImageUrl(player.arena.id) : undefined
                }
              />
              <StatCard
                title={t("pages.dashboard.stats.bestSeason")}
                value={player?.bestTrophies ?? 0}
                icon={<Crown className="w-5 h-5 text-yellow-500" />}
                subtext={t("pages.dashboard.stats.personalBest")}
              />
              <StatCard
                title={t("pages.dashboard.stats.winRate")}
                value={`${(stats?.winRate ?? 0).toFixed?.(1) ?? Math.round(stats?.winRate ?? 0)}%`}
                icon={<TrendingUp className="w-5 h-5 text-green-500" />}
                subtext={t("pages.dashboard.stats.lastBattles", { count: stats?.totalMatches ?? 0 })}
              />
              <StatCard
                title={t("pages.dashboard.stats.wins")}
                value={player?.wins ?? stats?.wins ?? 0}
                icon={<Swords className="w-5 h-5 text-blue-500" />}
                subtext={t("pages.dashboard.stats.lossesLine", { count: player?.losses ?? stats?.losses ?? 0 })}
              />
            </div>

            {Array.isArray(player?.currentDeck) && player.currentDeck.length > 0 ? (
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Swords className="w-5 h-5 text-primary" />
                    {t("pages.dashboard.currentDeckTitle")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    {player.currentDeck.map((card: any, idx: number) => (
                      <ClashCardImage
                        key={card?.id || `${card?.name || "card"}-${idx}`}
                        name={card?.name || "Card"}
                        iconUrls={card?.iconUrls}
                        level={typeof card?.level === "number" ? card.level : null}
                        size="md"
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>{t("pages.dashboard.trophyProgressTitle")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="trophyGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                          <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            domain={["dataMin - 50", "dataMax + 50"]}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--popover))",
                              borderColor: "hsl(var(--border))",
                              borderRadius: "8px",
                              color: "hsl(var(--popover-foreground))",
                            }}
                          />
                          <Area type="monotone" dataKey="trophies" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#trophyGradient)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      {t("pages.dashboard.goalsTitle")}
                    </CardTitle>
                    <Link href="/profile">
                      <Button variant="ghost" size="sm" className="h-8 text-xs">
                        {t("pages.dashboard.manageGoals")}
                      </Button>
                    </Link>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {goals.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">{t("pages.dashboard.emptyGoals")}</p>
                    ) : (
                      goals.slice(0, 3).map((goal: any) => {
                        const currentValue = goal.currentValue || 0;
                        const targetValue = goal.targetValue || 0;
                        const progress = targetValue > 0 ? Math.min(100, (currentValue / targetValue) * 100) : 0;
                        return (
                          <div key={goal.id} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">{goal.title}</span>
                              <span className="text-muted-foreground">
                                {currentValue} / {targetValue}
                              </span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-8">
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle>{t("pages.dashboard.recentBattlesTitle")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {latestFive.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">{t("pages.dashboard.emptyBattles")}</p>
                    ) : (
                      latestFive.map((battle: any, idx: number) => {
                        const teamCrowns = battle?.team?.[0]?.crowns || 0;
                        const opponentCrowns = battle?.opponent?.[0]?.crowns || 0;
                        const isWin = teamCrowns > opponentCrowns;
                        const isDraw = teamCrowns === opponentCrowns;
                        const opponentName = battle?.opponent?.[0]?.name || t("pages.dashboard.opponentFallback");
                        const battleTime = parseClashBattleTime(battle?.battleTime);

                        return (
                          <div
                            key={`${battle?.battleTime || "battle"}-${idx}`}
                            className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-white/5 transition-colors cursor-pointer interactive-hover"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "w-10 h-10 rounded flex items-center justify-center font-bold text-lg border shrink-0",
                                  isWin && !isDraw
                                    ? "bg-green-500/10 text-green-500 border-green-500/20"
                                    : isDraw
                                      ? "bg-gray-500/10 text-gray-500 border-gray-500/20"
                                      : "bg-red-500/10 text-red-500 border-red-500/20",
                                )}
                              >
                                {isWin && !isDraw ? "W" : isDraw ? "D" : "L"}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-medium truncate">{opponentName}</span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {battleTime
                                    ? battleTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                    : "--:--"}
                                </span>
                                {Array.isArray(battle?.team?.[0]?.cards) ? (
                                  <div className="flex gap-1 mt-1 flex-wrap">
                                    {(battle.team[0].cards as any[]).slice(0, 8).map((card: any, cardIdx: number) => (
                                      <ClashCardImage
                                        key={card?.id || `${card?.name || "card"}-${cardIdx}`}
                                        name={card?.name || "Card"}
                                        iconUrls={card?.iconUrls}
                                        level={null}
                                        size="sm"
                                        showLevel={false}
                                      />
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                            <div className="text-sm font-bold text-muted-foreground shrink-0">
                              {teamCrowns}-{opponentCrowns}
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div className="pt-2 text-center">
                      <Link href="/me">
                        <button className="text-sm text-primary hover:underline font-medium transition-colors hover:text-primary/80">
                          {t("pages.dashboard.viewFullHistory")}
                        </button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-500" />
                      {t("pages.dashboard.favoritesTitle")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {favoritesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : (favorites as any[]).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">{t("pages.dashboard.emptyFavorites")}</p>
                    ) : (
                      (favorites as any[]).slice(0, 6).map((fav: any) => (
                        <Link
                          key={fav.id}
                          href={fav.playerTag ? `/p/${String(fav.playerTag).replace(/^#/, "")}` : "/me"}
                        >
                          <div className="flex items-center justify-between p-3 rounded-lg bg-background/40 hover:bg-background/60 transition-colors cursor-pointer group">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8 border border-border">
                                <AvatarFallback>{String(fav.name || "").substring(0, 2).toUpperCase() || "PL"}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-bold text-sm">{fav.name}</div>
                                <div className="text-xs text-muted-foreground">{fav.clan || fav.playerTag || ""}</div>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </Link>
                      ))
                    )}
                    <Link href="/community">
                      <Button variant="ghost" size="sm" className="w-full text-xs mt-2">
                        {t("pages.dashboard.exploreCommunity")}
                      </Button>
                    </Link>
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

function StatCard({
  title,
  value,
  icon,
  trend,
  trendUp,
  subtext,
  arenaImage,
}: {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  trendUp?: boolean;
  subtext?: string;
  arenaImage?: string;
}) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-center gap-2">
            {arenaImage ? (
              <img
                src={arenaImage}
                alt="Arena"
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : null}
            {icon}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-2xl font-bold font-display">{value}</div>
          {trend ? (
            <p className={cn("text-xs font-medium", trendUp ? "text-green-500" : "text-red-500")}>{trend}</p>
          ) : null}
          {subtext ? <p className="text-xs text-muted-foreground">{subtext}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
