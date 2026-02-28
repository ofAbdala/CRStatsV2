import DashboardLayout from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trophy, Crown, TrendingUp, Clock, Swords, AlertCircle, Flame, Award } from "lucide-react";
import { ProfileSkeleton } from "@/components/skeletons";
import { cn } from "@/lib/utils";
import { getArenaImageUrl } from "@/lib/clashIcons";
import { useMeData } from "./useMeData";
import { TiltAnalysis } from "./TiltAnalysis";
import { MeOverviewTab } from "./MeOverviewTab";
import { MeBattlesTab } from "./MeBattlesTab";
import { MeCardsTab } from "./MeCardsTab";
import { MeGoalsTab } from "./MeGoalsTab";

export default function MePage() {
  const data = useMeData();
  const { player, clashTag, isLoading, playerError, playerLoading, stats, tiltAnalysis, t } = data;

  if (isLoading) {
    return (
      <DashboardLayout>
        <ProfileSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {playerError && !playerLoading && (
          <Alert data-testid="alert-player-error">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {clashTag ? t('pages.me.errors.playerNotFound', { tag: clashTag }) : t('pages.me.errors.noTag')}
            </AlertDescription>
          </Alert>
        )}

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card/95 to-primary/5 backdrop-blur-sm">
          <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)]" />
          <div className="relative p-6 md:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 md:gap-4 mb-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                    <Swords className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground" data-testid="header-player-name">
                      {player?.name || t('pages.me.playerFallback')}
                    </h1>
                    <p className="text-muted-foreground font-mono text-sm" data-testid="header-player-tag">
                      {clashTag || '#XXXXXXXX'}
                    </p>
                  </div>
                </div>
                {player?.clan && (
                  <div className="flex items-center gap-2 mb-4">
                    <Crown className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm text-muted-foreground">{player.clan.name}</span>
                    {player.clan.badgeId && (
                      <img src={`https://cdn.royaleapi.com/static/img/badge/${player.clan.badgeId}.png`} alt="Clan Badge" className="w-5 h-5"
                        width={20} height={20} loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    )}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-background/50" data-testid="stat-winrate">
                    <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
                    {stats.winRate}% {t('pages.me.winRate')}
                  </Badge>
                  <Badge variant="outline" className="bg-background/50">
                    <Swords className="w-3 h-3 mr-1" />
                    {stats.totalMatches} {t('pages.me.matches')}
                  </Badge>
                  <Badge variant="outline" className={cn("bg-background/50", stats.streak.type === 'win' && "border-green-500/50 text-green-500", stats.streak.type === 'loss' && "border-red-500/50 text-red-500")} data-testid="stat-streak">
                    <Flame className="w-3 h-3 mr-1" />
                    {stats.streak.count > 0 ? `${stats.streak.count} ${stats.streak.type === 'win' ? t('pages.me.wins') : t('pages.me.losses')} ${t('pages.me.streak')}` : t('pages.me.noStreak')}
                  </Badge>
                  {stats.lastPlayed && (
                    <Badge variant="outline" className="bg-background/50">
                      <Clock className="w-3 h-3 mr-1" />
                      {t('pages.me.lastPlayed', { time: stats.lastPlayed })}
                    </Badge>
                  )}
                  <TiltAnalysis tiltAnalysis={tiltAnalysis} t={t} />
                </div>
              </div>
              <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl bg-background/50 border border-border/50" data-testid="header-arena">
                {player?.arena?.id && (
                  <img src={getArenaImageUrl(player.arena.id)} alt={player.arena.name} className="w-16 h-16 md:w-20 md:h-20 object-contain"
                    width={80} height={80} loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
                )}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    {player?.arena?.name || t('pages.me.arenaFallback')}
                  </p>
                  <div className="text-3xl md:text-4xl font-display font-bold text-primary flex items-center gap-2" data-testid="header-trophies">
                    <Trophy className="w-6 h-6 md:w-8 md:h-8" />
                    {player?.trophies?.toLocaleString() || 0}
                  </div>
                  <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Award className="w-3 h-3 text-yellow-500" />
                      {t('pages.me.best')}: {player?.bestTrophies?.toLocaleString() || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto bg-card/50 border border-border/50 p-1 h-auto flex-wrap md:flex-nowrap">
            <TabsTrigger value="overview" data-testid="tab-overview" className="flex-1 min-w-[100px]">{t('pages.me.tabs.overview')}</TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history" className="flex-1 min-w-[100px]">{t('pages.me.tabs.history')}</TabsTrigger>
            <TabsTrigger value="decks" data-testid="tab-decks" className="flex-1 min-w-[100px]">{t('pages.me.tabs.decks')}</TabsTrigger>
            <TabsTrigger value="progress" data-testid="tab-progress" className="flex-1 min-w-[100px]">{t('pages.me.tabs.progress')}</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-6"><MeOverviewTab data={data} /></TabsContent>
          <TabsContent value="history" className="mt-6"><MeBattlesTab data={data} /></TabsContent>
          <TabsContent value="decks" className="mt-6"><MeCardsTab data={data} /></TabsContent>
          <TabsContent value="progress" className="mt-6"><MeGoalsTab data={data} /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
