import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Crown,
  TrendingUp,
  Target,
  Swords,
  Shield,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TrophyChart } from "./TrophyChart";
import type { MeDataContext, GameModeStats } from "./types";

interface MeOverviewTabProps {
  data: MeDataContext;
}

export function MeOverviewTab({ data }: MeOverviewTabProps) {
  const { stats, tiltAnalysis, chartData, player, isPro, t, locale } = data;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Season Summary */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="w-4 h-4 text-primary" />
              {t('pages.me.seasonSummary.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t('pages.me.seasonSummary.currentTrophies')}</span>
              <span className="font-bold text-primary">{player?.trophies?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t('pages.me.seasonSummary.bestSeason')}</span>
              <span className="font-bold text-yellow-500">{player?.bestTrophies?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t('pages.me.winRate')}</span>
              <span className="font-bold text-green-500">{stats.winRate}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t('pages.me.matches')}</span>
              <span className="font-bold">{stats.totalMatches}</span>
            </div>
          </CardContent>
        </Card>

        {/* Recent Performance */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-4 h-4 text-primary" />
              {t('pages.me.recentPerformance.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t('pages.me.recentPerformance.lastBattles', { count: data.battles.length })}</span>
              <span className="font-bold">{stats.winRate}% WR</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t('pages.me.recentPerformance.currentStreak')}</span>
              <span className={cn(
                "font-bold",
                stats.streak.type === 'win' && "text-green-500",
                stats.streak.type === 'loss' && "text-red-500"
              )}>
                {stats.streak.count > 0
                  ? `${stats.streak.count}${stats.streak.type === 'win' ? 'V' : 'D'}`
                  : '-'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t('pages.me.recentPerformance.status')}</span>
              <Badge variant={tiltAnalysis.trend === 'at-risk' ? 'destructive' : tiltAnalysis.trend === 'improving' ? 'default' : 'secondary'}>{tiltAnalysis.label}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t('pages.me.recentPerformance.winsLosses')}</span>
              <span className="font-bold">
                <span className="text-green-500">{stats.wins}</span>
                {' / '}
                <span className="text-red-500">{stats.losses}</span>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* PRO Status */}
        <Card className={cn(
          "border-border/50 backdrop-blur-sm",
          isPro
            ? "bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30"
            : "bg-card/50"
        )}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className={cn("w-4 h-4", isPro ? "text-yellow-500" : "text-muted-foreground")} />
              {t('pages.me.accountStatus.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t('pages.me.accountStatus.plan')}</span>
              <Badge variant={isPro ? "default" : "secondary"}>
                {isPro ? 'PRO' : 'Free'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t('pages.me.accountStatus.totalWins')}</span>
              <span className="font-bold">{player?.wins?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t('pages.me.accountStatus.cardsCollected')}</span>
              <span className="font-bold">{player?.cards?.length || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trophy Chart */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            {t('pages.me.trophyProgression.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TrophyChart chartData={chartData} locale={locale} />
        </CardContent>
      </Card>

      {/* Game Mode Stats */}
      <div className="grid md:grid-cols-2 gap-6">
        <GameModeCard
          title={t('pages.me.gameModes.ladder')}
          icon={<Shield className="w-5 h-5" />}
          stats={stats.ladderStats}
          color="primary"
          t={t}
        />
        <GameModeCard
          title={t('pages.me.gameModes.challenges')}
          icon={<Zap className="w-5 h-5" />}
          stats={stats.challengeStats}
          color="yellow"
          t={t}
        />
      </div>
    </div>
  );
}

function GameModeCard({ title, icon, stats, color, t }: {
  title: string;
  icon: React.ReactNode;
  stats: GameModeStats;
  color: 'primary' | 'yellow';
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const colorClasses = {
    primary: 'text-primary',
    yellow: 'text-yellow-500',
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={cn("p-2 rounded-lg bg-background/50", colorClasses[color])}>
            {icon}
          </div>
          <h3 className="font-bold">{title}</h3>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-green-500">{stats.wins}</p>
            <p className="text-xs text-muted-foreground">{t('pages.me.gameMode.wins')}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-500">{stats.losses}</p>
            <p className="text-xs text-muted-foreground">{t('pages.me.gameMode.losses')}</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.winRate}%</p>
            <p className="text-xs text-muted-foreground">{t('pages.me.gameMode.winRate')}</p>
          </div>
        </div>
        {stats.matches > 0 && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Swords className="w-4 h-4" />
            {t('pages.me.gameMode.matchCount', { count: stats.matches })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
