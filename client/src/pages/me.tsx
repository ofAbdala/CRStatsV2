import { useMemo, useState } from "react";
import { format, formatDistanceToNow, startOfDay, subDays } from "date-fns";
import { enUS, ptBR } from "date-fns/locale";
import { Link } from "wouter";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { usePlayerSync } from "@/hooks/usePlayerSync";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Layers,
  Loader2,
  RefreshCcw,
  Trophy,
  Zap,
} from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { getApiErrorMessage } from "@/lib/errorMessages";

type PeriodFilter = "today" | "7days" | "30days" | "season";
type TiltLevel = "high" | "medium" | "none";

interface SessionSummary {
  id: string;
  battles: any[];
  wins: number;
  losses: number;
  draws: number;
  netTrophies: number;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  isValidPush: boolean;
  tiltLevel: TiltLevel;
}

function parseBattleTime(value: string): Date {
  if (!value) return new Date();
  const formatted = value.replace(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})\.(\d{3})Z$/,
    "$1-$2-$3T$4:$5:$6.$7Z",
  );
  const parsed = new Date(formatted);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function computeTiltLevel(battles: any[]): TiltLevel {
  if (!battles.length) return "none";

  const last10 = battles.slice(0, 10);
  let wins = 0;
  let losses = 0;
  let netTrophies = 0;
  let consecutiveLosses = 0;
  let maxConsecutiveLosses = 0;

  for (const battle of last10) {
    const myCrowns = battle?.team?.[0]?.crowns || 0;
    const oppCrowns = battle?.opponent?.[0]?.crowns || 0;
    const isWin = myCrowns > oppCrowns;
    if (isWin) {
      wins += 1;
      consecutiveLosses = 0;
    } else {
      losses += 1;
      consecutiveLosses += 1;
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, consecutiveLosses);
    }
    netTrophies += battle?.team?.[0]?.trophyChange || 0;
  }

  const winRate = last10.length > 0 ? (wins / last10.length) * 100 : 50;
  if (maxConsecutiveLosses >= 3 || (winRate < 40 && netTrophies <= -60)) return "high";
  if (winRate >= 40 && winRate <= 50 && netTrophies < 0) return "medium";
  return "none";
}

function tiltText(level: TiltLevel, t: (key: string) => string) {
  if (level === "high") return t("pages.me.tilt.high");
  if (level === "medium") return t("pages.me.tilt.medium");
  return t("pages.me.tilt.none");
}

function tiltClass(level: TiltLevel) {
  if (level === "high") return "border-red-500/50 text-red-500";
  if (level === "medium") return "border-yellow-500/50 text-yellow-500";
  return "border-green-500/50 text-green-500";
}

function groupBattlesIntoSessions(battles: any[], maxGapMinutes = 30): SessionSummary[] {
  if (!battles.length) return [];

  const sorted = [...battles]
    .filter((battle) => battle?.battleTime)
    .sort((a, b) => parseBattleTime(b.battleTime).getTime() - parseBattleTime(a.battleTime).getTime());

  const sessions: SessionSummary[] = [];
  let current: any[] = [];

  const pushCurrentSession = () => {
    if (!current.length) return;
    let wins = 0;
    let losses = 0;
    let draws = 0;
    let netTrophies = 0;

    for (const battle of current) {
      const myCrowns = battle?.team?.[0]?.crowns || 0;
      const oppCrowns = battle?.opponent?.[0]?.crowns || 0;
      if (myCrowns > oppCrowns) wins += 1;
      else if (myCrowns < oppCrowns) losses += 1;
      else draws += 1;
      netTrophies += battle?.team?.[0]?.trophyChange || 0;
    }

    const startTime = parseBattleTime(current[current.length - 1].battleTime);
    const endTime = parseBattleTime(current[0].battleTime);
    const durationMinutes = Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / 60000));
    sessions.push({
      id: `${endTime.toISOString()}-${current.length}`,
      battles: [...current],
      wins,
      losses,
      draws,
      netTrophies,
      startTime,
      endTime,
      durationMinutes,
      isValidPush: current.length >= 2,
      tiltLevel: computeTiltLevel(current),
    });
    current = [];
  };

  for (const battle of sorted) {
    if (current.length === 0) {
      current.push(battle);
      continue;
    }

    const previousTime = parseBattleTime(current[current.length - 1].battleTime);
    const nextTime = parseBattleTime(battle.battleTime);
    const gapMinutes = Math.abs((previousTime.getTime() - nextTime.getTime()) / 60000);

    if (gapMinutes <= maxGapMinutes) {
      current.push(battle);
    } else {
      pushCurrentSession();
      current.push(battle);
    }
  }

  pushCurrentSession();
  return sessions;
}

export default function MePage() {
  const { t, locale } = useLocale();
  const { sync, derivedStatus, isLoading, isFetching, refresh, error } = usePlayerSync();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("7days");

  const player = sync?.player;
  const battles = sync?.battles ?? [];
  const stats = sync?.stats;
  const goals = sync?.goals ?? [];

  const filteredBattles = useMemo(() => {
    const now = new Date();
    return battles.filter((battle: any) => {
      const battleDate = parseBattleTime(battle.battleTime);
      if (periodFilter === "today") return battleDate >= startOfDay(now);
      if (periodFilter === "7days") return battleDate >= subDays(now, 7);
      if (periodFilter === "30days") return battleDate >= subDays(now, 30);
      return battleDate >= subDays(now, 35);
    });
  }, [battles, periodFilter]);

  const sessions = useMemo(() => groupBattlesIntoSessions(filteredBattles), [filteredBattles]);

  const lastPushFromSync = sync?.pushSessions?.[0] as
    | {
        wins: number;
        losses: number;
        netTrophies: number;
        battles: any[];
        startTime: string;
        endTime: string;
      }
    | undefined;

  const lastPushSummary = useMemo(() => {
    if (!lastPushFromSync) return null;
    const start = new Date(lastPushFromSync.startTime);
    const end = new Date(lastPushFromSync.endTime);
    const durationMinutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
    const tiltLevel = computeTiltLevel(lastPushFromSync.battles || []);
    return {
      battlesCount: lastPushFromSync.battles?.length || 0,
      wins: lastPushFromSync.wins || 0,
      losses: lastPushFromSync.losses || 0,
      netTrophies: lastPushFromSync.netTrophies || 0,
      durationMinutes,
      tiltLevel,
    };
  }, [lastPushFromSync]);

  const updatedAtText = sync?.lastSyncedAt
    ? format(new Date(sync.lastSyncedAt), "Pp", { locale: locale === "pt-BR" ? ptBR : enUS })
    : t("pages.me.noSync");

  const recentStats = useMemo(() => {
    const sample = filteredBattles.slice(0, 10);
    let wins = 0;
    let losses = 0;
    for (const battle of sample) {
      const myCrowns = battle?.team?.[0]?.crowns || 0;
      const oppCrowns = battle?.opponent?.[0]?.crowns || 0;
      if (myCrowns > oppCrowns) wins += 1;
      if (myCrowns < oppCrowns) losses += 1;
    }
    return {
      wins,
      losses,
      total: sample.length,
      winRate: sample.length > 0 ? Math.round((wins / sample.length) * 100) : 0,
    };
  }, [filteredBattles]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-display font-bold">{player?.name || t("pages.me.title")}</h1>
            <p className="text-muted-foreground font-mono">{player?.tag || t("pages.me.noTag")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={tiltClass(stats?.tiltLevel || "none")}>
              {tiltText(stats?.tiltLevel || "none", t)}
            </Badge>
            <Badge variant="outline">{t("pages.me.lastUpdate", { time: updatedAtText })}</Badge>
            <Button variant="outline" size="sm" onClick={() => refresh()} disabled={isFetching}>
              {isFetching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
              {t("pages.me.sync")}
            </Button>
          </div>
        </div>

        {derivedStatus === "error" && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {getApiErrorMessage(error, t)}
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
              <TopStat title={t("pages.me.stats.trophies")} value={player?.trophies ?? 0} />
              <TopStat title={t("pages.me.stats.winRate")} value={`${Math.round(stats?.winRate ?? 0)}%`} />
              <TopStat title={t("pages.me.stats.winLoss")} value={`${stats?.wins ?? 0}/${stats?.losses ?? 0}`} />
              <TopStat title={t("pages.me.stats.matches")} value={stats?.totalMatches ?? 0} />
            </div>

            <Tabs defaultValue="history" className="w-full">
              <TabsList className="grid grid-cols-2 w-full md:w-[360px]">
                <TabsTrigger value="history">{t("pages.me.tabs.history")}</TabsTrigger>
                <TabsTrigger value="goals">{t("pages.me.tabs.goals")}</TabsTrigger>
              </TabsList>

              <TabsContent value="history" className="space-y-4 mt-4">
                <Card className="border-border/50 bg-card/50">
                  <CardContent className="py-4 flex items-center justify-between gap-4 flex-wrap">
                    {lastPushSummary ? (
                      <div className="text-sm" data-testid="push-summary-row">
                        <p className="font-medium">
                          {t("pages.me.validPush", { count: lastPushSummary.battlesCount })},
                          {" "}
                          <span className="text-green-500">{lastPushSummary.wins}V</span>/
                          <span className="text-red-500">{lastPushSummary.losses}D</span>,
                          {" "}
                          <span className={cn(lastPushSummary.netTrophies >= 0 ? "text-green-500" : "text-red-500")}>
                            {lastPushSummary.netTrophies > 0 ? "+" : ""}{lastPushSummary.netTrophies}
                          </span>,
                          {" "}
                          {t("pages.me.minutes", { value: lastPushSummary.durationMinutes })}
                        </p>
                        <Badge variant="outline" className={tiltClass(lastPushSummary.tiltLevel)}>
                          {tiltText(lastPushSummary.tiltLevel, t)}
                        </Badge>
                      </div>
                    ) : (
                      <div className="text-sm">
                        {t("pages.me.recentSession", { count: recentStats.total })},
                        {" "}
                        <span className="text-green-500">{recentStats.wins}V</span>/
                        <span className="text-red-500">{recentStats.losses}D</span>
                        {" "}
                        ({recentStats.winRate}% WR)
                      </div>
                    )}
                    <div className="flex gap-2">
                      <PeriodButton value="today" current={periodFilter} onChange={setPeriodFilter} label={t("pages.me.filters.today")} />
                      <PeriodButton value="7days" current={periodFilter} onChange={setPeriodFilter} label="7d" />
                      <PeriodButton value="30days" current={periodFilter} onChange={setPeriodFilter} label="30d" />
                      <PeriodButton value="season" current={periodFilter} onChange={setPeriodFilter} label={t("pages.me.filters.season")} />
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  {sessions.length === 0 ? (
                    <Card className="border-border/50 bg-card/50">
                      <CardContent className="py-8 text-center text-muted-foreground">
                        {t("pages.me.emptyBattles")}
                      </CardContent>
                    </Card>
                  ) : (
                    sessions.map((session) => (
                      <Card key={session.id} className="border-border/50 bg-card/50">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Layers className="w-4 h-4" />
                              {session.isValidPush ? t("pages.me.session.valid") : t("pages.me.session.simple")}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{t("pages.me.matchesBadge", { count: session.battles.length })}</Badge>
                              <Badge variant="outline" className={tiltClass(session.tiltLevel)}>
                                {tiltText(session.tiltLevel, t)}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            {session.isValidPush ? (
                              <>
                                {session.wins}V/{session.losses}D •
                                {" "}
                                <span className={cn(session.netTrophies >= 0 ? "text-green-500" : "text-red-500")}>
                                  {session.netTrophies > 0 ? "+" : ""}{session.netTrophies}
                                </span>
                                {" "}• {t("pages.me.minutes", { value: session.durationMinutes })}
                              </>
                            ) : (
                              t("pages.me.singleSession")
                            )}
                          </p>
                          <div className="space-y-2">
                            {session.battles.map((battle: any, index: number) => {
                              const myCrowns = battle?.team?.[0]?.crowns || 0;
                              const oppCrowns = battle?.opponent?.[0]?.crowns || 0;
                              const result = myCrowns > oppCrowns
                                ? t("battle.victory")
                                : myCrowns < oppCrowns
                                  ? t("battle.defeat")
                                  : t("battle.draw");
                              const trophyChange = battle?.team?.[0]?.trophyChange || 0;
                              return (
                                <div
                                  key={`${battle?.battleTime || "battle"}-${index}`}
                                  className="flex items-center justify-between rounded-md border border-border/30 px-3 py-2 text-sm"
                                >
                                  <div>
                                    <p className="font-medium">{battle?.opponent?.[0]?.name || t("battle.opponent")}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {result} • {myCrowns}x{oppCrowns} •{" "}
                                      {formatDistanceToNow(parseBattleTime(battle?.battleTime), {
                                        addSuffix: true,
                                        locale: locale === "pt-BR" ? ptBR : enUS,
                                      })}
                                    </p>
                                  </div>
                                  <span className={cn(trophyChange > 0 && "text-green-500", trophyChange < 0 && "text-red-500")}>
                                    {trophyChange > 0 ? "+" : ""}{trophyChange}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="goals" className="space-y-4 mt-4">
                <Card className="border-border/50 bg-card/50">
                  <CardHeader>
                    <CardTitle>{t("pages.me.activeGoals")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {goals.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t("pages.me.emptyGoals")}</p>
                    ) : (
                      goals.map((goal: any) => {
                        const current = goal.currentValue || 0;
                        const target = goal.targetValue || 0;
                        const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
                        return (
                          <div key={goal.id} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">{goal.title}</span>
                              <span className="text-muted-foreground">{current}/{target}</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>
                        );
                      })
                    )}
                    <div className="pt-2">
                      <Link href="/billing">
                        <Button variant="outline" size="sm">
                          <Zap className="w-4 h-4 mr-2" />
                          {t("pages.me.viewPro")}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function TopStat({ title, value }: { title: string; value: string | number }) {
  const { t } = useLocale();
  return (
    <Card className="border-border/50 bg-card/50">
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-display font-bold mt-1 flex items-center gap-2">
          {title === t("pages.me.stats.trophies") ? <Trophy className="w-5 h-5 text-yellow-500" /> : null}
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function PeriodButton({
  value,
  current,
  onChange,
  label,
}: {
  value: PeriodFilter;
  current: PeriodFilter;
  onChange: (value: PeriodFilter) => void;
  label: string;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={current === value ? "default" : "outline"}
      onClick={() => onChange(value)}
    >
      {label}
    </Button>
  );
}
