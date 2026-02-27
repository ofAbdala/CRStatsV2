import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion } from "@/components/ui/accordion";
import {
  Target,
  Swords,
  Loader2,
  RotateCcw,
  Lock,
  Layers,
} from "lucide-react";
import { Link } from "wouter";
import type { PushSession } from "@/lib/pushUtils";
import { BattleRow } from "./BattleRow";
import type { MeDataContext } from "./types";

function PushSummaryRow({
  session,
  t
}: {
  session: PushSession;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const durationMin = Math.round(session.durationMs / (1000 * 60));
  const isSingleBattle = session.battles.length === 1;

  const trophiesText = session.netTrophies > 0
    ? `+${session.netTrophies}`
    : `${session.netTrophies}`;

  return (
    <div className="flex items-center gap-2 py-2 px-3 bg-muted/30 rounded-lg border border-border/30" data-testid="push-summary-row">
      <Layers className="w-4 h-4 text-primary shrink-0" />
      {isSingleBattle ? (
        <span className="text-sm font-medium text-muted-foreground">
          {t('battle.quickSession')}
        </span>
      ) : (
        <span className="text-sm font-medium">
          {t('battle.pushSummary', {
            games: session.battles.length,
            wins: session.wins,
            losses: session.losses,
            trophies: trophiesText,
            duration: durationMin,
          })}
          {session.draws > 0 && (
            <span className="text-muted-foreground"> (+{session.draws} {t('battle.draws')})</span>
          )}
        </span>
      )}
    </div>
  );
}

interface MeBattlesTabProps {
  data: MeDataContext;
}

export function MeBattlesTab({ data }: MeBattlesTabProps) {
  const {
    periodFilter, setPeriodFilter,
    isPro, filteredBattles,
    battlesLoading, sessions,
    lastPush, recentSeriesStats,
    syncMutation, clashTag,
    t, locale,
  } = data;

  return (
    <div className="space-y-4">
      {/* Filter Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {(['today', '7days', '30days', 'season'] as const).map((filter) => (
            <Button
              key={filter}
              variant={periodFilter === filter ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriodFilter(filter)}
              data-testid={`filter-${filter}`}
            >
              {t(`me.filters.${filter}`)}
            </Button>
          ))}
          {isPro ? (
            <Button
              variant={periodFilter === '60days' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriodFilter('60days')}
              data-testid="filter-60days"
            >
              {t('pages.me.filters.60days')}
            </Button>
          ) : (
            <Link href="/billing">
              <Button variant="outline" size="sm" data-testid="filter-60days-locked">
                <Lock className="w-4 h-4 mr-2" />
                {t('pages.me.filters.60days')}
              </Button>
            </Link>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending || !clashTag}
          data-testid="button-refresh-history"
        >
          {syncMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <RotateCcw className="w-4 h-4 mr-2" />
          )}
          {t("pages.dashboard.sync")}
        </Button>
      </div>

      {/* Summary */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              {lastPush ? (
                <span className="font-medium" data-testid="push-summary">
                  {t('pages.me.history.lastPush', {
                    count: lastPush.battles.length,
                    wins: lastPush.wins,
                    losses: lastPush.losses,
                    trophies: lastPush.netTrophies > 0 ? `+${lastPush.netTrophies}` : lastPush.netTrophies,
                    duration: Math.round(lastPush.durationMs / (1000 * 60))
                  })}
                </span>
              ) : (
                <span className="font-medium" data-testid="recent-stats-summary">
                  {t('pages.me.history.recentMatches', {
                    count: recentSeriesStats.total,
                    wins: recentSeriesStats.wins,
                    losses: recentSeriesStats.losses,
                    winrate: recentSeriesStats.winRate
                  })}
                </span>
              )}
            </div>
            <Badge variant="outline">{t('pages.me.history.totalBattles', { count: filteredBattles.length })}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Match List - Grouped by Sessions */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Swords className="w-5 h-5 text-primary" />
          {t('pages.me.history.battleHistory')}
        </h3>

        {battlesLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">{t('pages.me.history.noBattlesFound')}</p>
        ) : (
          <div className="space-y-6">
            {sessions.map((session, sessionIdx) => (
              <section key={session.startTime.toISOString()} data-testid={`session-${sessionIdx}`}>
                <PushSummaryRow session={session} t={t} />
                <div className="mt-2 space-y-2">
                  <Accordion type="single" collapsible className="space-y-2">
                    {session.battles.map((battle: any, idx: number) => (
                      <BattleRow key={idx} battle={battle} idx={idx} locale={locale} t={t} />
                    ))}
                  </Accordion>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
