import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Award, Zap, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

function formatSigned(value: number) {
  if (!Number.isFinite(value)) return "N/A";
  if (value > 0) return `+${Math.round(value)}`;
  return `${Math.round(value)}`;
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border/30 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

interface ProAnalyticsProps {
  isPro: boolean;
  player: any;
  trophyPrediction: { net: number | null; sample: number };
  idealDeckWinRate: number | null;
  matchupDeckCount: number | null;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function ProAnalyticsSection({
  isPro, player, trophyPrediction, idealDeckWinRate, matchupDeckCount, t,
}: ProAnalyticsProps) {
  return (
    <>
      {/* Achievements/Stats Summary */}
      <div className="grid md:grid-cols-2 gap-6" data-testid="stats-summary">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="w-5 h-5 text-yellow-500" />
              {t('pages.me.achievements.general')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <StatRow label={t('pages.me.achievements.kingLevel')} value={player?.expLevel || 0} />
            <StatRow label={t('pages.me.achievements.totalWins')} value={player?.wins?.toLocaleString() || 0} />
            <StatRow label={t('pages.me.achievements.totalLosses')} value={player?.losses?.toLocaleString() || 0} />
            <StatRow label={t('pages.me.achievements.threeCrownWins')} value={player?.threeCrownWins?.toLocaleString() || 0} />
            <StatRow label={t('pages.me.achievements.maxChallenge')} value={player?.challengeMaxWins || 0} />
            <StatRow label={t('pages.me.achievements.cardsFound')} value={player?.cards?.length || 0} />
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="w-5 h-5 text-yellow-500" />
              {t('pages.me.achievements.clan')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <StatRow label={t('pages.me.achievements.totalDonations')} value={player?.totalDonations?.toLocaleString() || 0} />
            <StatRow label={t('pages.me.achievements.donationsReceived')} value={player?.clanCardsCollected?.toLocaleString() || 0} />
            <StatRow label={t('pages.me.achievements.clanWars')} value={player?.warDayWins || 0} />
            <StatRow label={t('pages.me.achievements.clanContribution')} value={player?.clanContributionPoints?.toLocaleString() || 0} />
          </CardContent>
        </Card>
      </div>

      {/* PRO Advanced Analytics */}
      <Card
        className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden"
        data-testid="pro-locked-section"
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            {t('pages.me.proAnalytics.title')}
            {!isPro && (
              <Badge variant="outline" className="ml-2 border-yellow-500/50 text-yellow-500">
                PRO
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className={cn(
              "grid md:grid-cols-3 gap-4 p-4 rounded-lg",
              !isPro && "blur-sm pointer-events-none"
            )}>
              <div className="p-4 bg-background/50 rounded-lg border border-border/50">
                <h4 className="font-medium mb-2">{t('pages.me.proAnalytics.trophyPrediction')}</h4>
                <p className="text-2xl font-bold text-primary">
                  {trophyPrediction.net === null ? "N/A" : formatSigned(trophyPrediction.net)}
                </p>
                <p className="text-xs text-muted-foreground">{t('pages.me.proAnalytics.nextWeek')}</p>
              </div>
              <div className="p-4 bg-background/50 rounded-lg border border-border/50">
                <h4 className="font-medium mb-2">{t('pages.me.proAnalytics.idealDeck')}</h4>
                <p className="text-2xl font-bold text-green-500">
                  {idealDeckWinRate === null ? "N/A" : `${idealDeckWinRate}%`}
                </p>
                <p className="text-xs text-muted-foreground">{t('pages.me.proAnalytics.recentWinrate')}</p>
              </div>
              <div className="p-4 bg-background/50 rounded-lg border border-border/50">
                <h4 className="font-medium mb-2">{t('pages.me.proAnalytics.matchupAnalysis')}</h4>
                <p className="text-2xl font-bold text-yellow-500">
                  {matchupDeckCount === null ? "N/A" : matchupDeckCount}
                </p>
                <p className="text-xs text-muted-foreground">{t('pages.me.proAnalytics.decksDetected')}</p>
              </div>
            </div>
            {!isPro && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/20 backdrop-blur-[2px] rounded-lg">
                <div className="p-3 rounded-full bg-yellow-500/20 mb-3">
                  <Lock className="w-6 h-6 text-yellow-500" />
                </div>
                <p className="text-sm text-muted-foreground mb-3">{t('pages.me.proAnalytics.availableOnPro')}</p>
                <Link href="/billing">
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600"
                    data-testid="button-unlock-pro"
                  >
                    {t('pages.me.proAnalytics.unlockPro')}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
