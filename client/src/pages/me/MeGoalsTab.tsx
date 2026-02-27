import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  TrendingUp,
  Clock,
  Target,
  Swords,
  Loader2,
  Flame,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";
import { ProAnalyticsSection } from "./ProAnalytics";
import type { MeDataContext } from "./types";

interface MeGoalsTabProps {
  data: MeDataContext;
}

export function MeGoalsTab({ data }: MeGoalsTabProps) {
  const {
    player, isPro, battles,
    trophyEvolutionData, playVolumeData,
    trophyPrediction, idealDeckWinRate, matchupDeckCount,
    activeGoals, goalsLoading,
    t,
  } = data;

  return (
    <div className="space-y-6">
      {/* Trophy Evolution Chart */}
      {trophyEvolutionData && trophyEvolutionData.length > 0 ? (
        <TrophyEvolutionChart data={trophyEvolutionData} player={player} t={t} />
      ) : (
        <TrophyEvolutionEmpty battles={battles} player={player} t={t} />
      )}

      {/* Play Volume Section */}
      <PlayVolumeSection playVolumeData={playVolumeData} t={t} />

      {/* Goals Section */}
      <GoalsSection activeGoals={activeGoals} goalsLoading={goalsLoading} t={t} />

      {/* Achievements + PRO Analytics */}
      <ProAnalyticsSection
        isPro={isPro}
        player={player}
        trophyPrediction={trophyPrediction}
        idealDeckWinRate={idealDeckWinRate}
        matchupDeckCount={matchupDeckCount}
        t={t}
      />
    </div>
  );
}

function TrophyEvolutionChart({ data: trophyEvolutionData, player, t }: {
  data: NonNullable<MeDataContext['trophyEvolutionData']>;
  player: any;
  t: MeDataContext['t'];
}) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm" data-testid="chart-trophy-evolution">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          {t('pages.me.trophyEvolution.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full" role="img" aria-label="Trophy evolution chart showing trophy progression over time">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trophyEvolutionData}>
              <defs>
                <linearGradient id="colorTrophiesProgress" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} domain={['dataMin - 100', 'dataMax + 100']} tickFormatter={(v) => v.toLocaleString()} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--popover-foreground))' }}
                formatter={(value: number, name: string) => [value.toLocaleString(), name === 'trophies' ? t('pages.me.trophies') : name]}
                labelFormatter={(label) => `${t('pages.me.date')}: ${label}`}
              />
              <Area type="monotone" dataKey="trophies" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorTrophiesProgress)" dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: 'hsl(var(--primary))' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 justify-center text-sm">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">{t('pages.me.current')}:</span>
            <span className="font-bold text-primary">{player?.trophies?.toLocaleString() || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-yellow-500" />
            <span className="text-muted-foreground">{t('pages.me.best')}:</span>
            <span className="font-bold text-yellow-500">{player?.bestTrophies?.toLocaleString() || 0}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TrophyEvolutionEmpty({ battles, player, t }: { battles: any[]; player: any; t: MeDataContext['t'] }) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm" data-testid="empty-trophy-data">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          {t('pages.me.trophyEvolution.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Trophy className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <p className="text-lg font-medium text-muted-foreground mb-2">{t('pages.me.trophyEvolution.noDataAvailable')}</p>
          <p className="text-sm text-muted-foreground/70">
            {battles.length === 0 ? t('pages.me.trophyEvolution.playMoreToSeeProgress') : t('pages.me.trophyEvolution.recentBattlesNoTrophyData')}
          </p>
          {player?.trophies && (
            <div className="mt-6 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">{t('pages.me.currentTrophies')}:</span>
              <span className="font-bold text-primary">{player.trophies.toLocaleString()}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PlayVolumeSection({ playVolumeData, t }: { playVolumeData: MeDataContext['playVolumeData']; t: MeDataContext['t'] }) {
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2 border-border/50 bg-card/50 backdrop-blur-sm" data-testid="chart-play-volume">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-primary" />
            {t('pages.me.playVolume.title', { days: 14 })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] w-full" role="img" aria-label="Play volume bar chart showing matches per day over the last 14 days">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={playVolumeData.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--popover-foreground))' }}
                  formatter={(value: number) => [`${value} ${t('pages.me.matches')}`, t('pages.me.matches')]}
                  labelFormatter={(label) => `${t('pages.me.date')}: ${label}`}
                />
                <Bar dataKey="matches" name={t('pages.me.chart.matches')} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <div className="flex flex-col gap-4">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm flex-1">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/20"><Swords className="w-5 h-5 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">{t('pages.me.playStats.avgPerDay')}</p>
              <p className="text-2xl font-bold">{playVolumeData.avgMatchesPerDay}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm flex-1">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-500/20"><Flame className="w-5 h-5 text-green-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground">{t('pages.me.playStats.mostActiveDay')}</p>
              <p className="text-xl font-bold">{playVolumeData.mostActiveDay}</p>
              <p className="text-xs text-muted-foreground">{t('pages.me.playStats.matchCount', { count: playVolumeData.mostActiveDayCount })}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm flex-1">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-yellow-500/20"><Clock className="w-5 h-5 text-yellow-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground">{t('pages.me.playStats.peakHour')}</p>
              <p className="text-xl font-bold">{playVolumeData.peakHour}</p>
              <p className="text-xs text-muted-foreground">{t('pages.me.playStats.matchCount', { count: playVolumeData.peakHourCount })}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function GoalsSection({ activeGoals, goalsLoading, t }: { activeGoals: any[]; goalsLoading: boolean; t: MeDataContext['t'] }) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          {t('pages.me.goals.activeGoals')}
        </CardTitle>
        <Link href="/goals">
          <Button variant="outline" size="sm" data-testid="link-manage-goals">{t('pages.me.goals.manageGoals')}</Button>
        </Link>
      </CardHeader>
      <CardContent>
        {goalsLoading ? (
          <div className="flex items-center justify-center py-8" role="status" aria-label="Loading goals"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : activeGoals.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {activeGoals.map((goal: any) => {
              const progressValue = goal.targetValue > 0 ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100)) : 0;
              return (
                <div key={goal.id} className="p-4 rounded-lg bg-background/50 border border-border/50" data-testid={`goal-card-${goal.id}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{goal.title || goal.name}</h4>
                    <Badge variant="outline" className={cn(progressValue >= 100 ? "border-green-500/50 text-green-500" : "border-primary/50 text-primary")}>{progressValue}%</Badge>
                  </div>
                  <Progress value={progressValue} className="h-2 mb-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t('pages.me.goals.current')}: {goal.currentValue || 0}</span>
                    <span>{t('pages.me.goals.target')}: {goal.targetValue || 0}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="mb-2">{t('pages.me.goals.noActiveGoals')}</p>
            <Link href="/goals"><Button variant="outline" size="sm">{t('pages.me.goals.createGoal')}</Button></Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
