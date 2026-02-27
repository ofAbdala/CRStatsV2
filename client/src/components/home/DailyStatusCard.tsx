/**
 * DailyStatusCard — Hero card on the dashboard.
 * Story 2.5: AC1 (daily summary), AC2 (empty state), AC3 (streak),
 * AC4 (tilt visual), AC5 (tilt suggestion), AC10 (quick actions).
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";
import {
  Trophy,
  Swords,
  TrendingUp,
  TrendingDown,
  Flame,
  Coffee,
  Search,
  Target,
  Zap,
  Minus,
} from "lucide-react";
import { Link } from "wouter";

interface DailyStatusCardProps {
  player: any;
  stats: {
    trophies: number;
    delta24h: number;
    winRate: number;
    totalMatches24h: number;
    wins24h: number;
    losses24h: number;
  };
  tilt: {
    level: "high" | "medium" | "none";
    risk: string;
  };
}

function getStatusLabel(
  delta: number,
  t: (key: string) => string,
): { label: string; color: string } {
  if (delta >= 100) return { label: t("home.status.climbingFast"), color: "text-green-500" };
  if (delta > 0) return { label: t("home.status.climbing"), color: "text-green-400" };
  if (delta === 0) return { label: t("home.status.stable"), color: "text-muted-foreground" };
  if (delta > -100) return { label: t("home.status.falling"), color: "text-orange-500" };
  return { label: t("home.status.embarrassing"), color: "text-red-500" };
}

function getStreakFromStats(stats: DailyStatusCardProps["stats"]): {
  type: "win" | "loss" | "none";
  count: number;
} {
  // This is a simplified streak; the real streak comes from battle ordering
  // but for the card display, we use the aggregate data
  if (stats.wins24h > 0 && stats.losses24h === 0) return { type: "win", count: stats.wins24h };
  if (stats.losses24h > 0 && stats.wins24h === 0) return { type: "loss", count: stats.losses24h };
  return { type: "none", count: 0 };
}

export function DailyStatusCard({ player, stats, tilt }: DailyStatusCardProps) {
  const { t } = useLocale();
  const isEmpty = stats.totalMatches24h === 0;
  const isOnTilt = tilt.level === "high";
  const isMediumTilt = tilt.level === "medium";
  const status = getStatusLabel(stats.delta24h, t);

  // Determine border style based on tilt
  const borderClass = isOnTilt
    ? "border-red-500/60 shadow-red-500/20 shadow-lg"
    : isMediumTilt
      ? "border-orange-500/40 shadow-orange-500/10 shadow-md"
      : "border-border/50";

  return (
    <Card
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-card via-card/95 to-primary/5 backdrop-blur-sm transition-all duration-300",
        borderClass,
      )}
      data-testid="daily-status-card"
    >
      {/* Tilt overlay glow */}
      {isOnTilt && (
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
      )}

      <CardContent className="relative p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t("home.dailyStatusTitle")}
          </h3>
          <Badge
            variant="outline"
            className={cn("text-xs", status.color)}
          >
            {status.label}
          </Badge>
        </div>

        {isEmpty ? (
          /* Empty state — AC2 */
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
            <Swords className="w-10 h-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {t("home.noBattlesToday")}
            </p>
          </div>
        ) : (
          <>
            {/* Main stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Battles */}
              <div className="text-center p-2 rounded-lg bg-background/50">
                <p className="text-2xl font-bold">{stats.totalMatches24h}</p>
                <p className="text-xs text-muted-foreground">{t("home.statBattles")}</p>
              </div>

              {/* W/L */}
              <div className="text-center p-2 rounded-lg bg-background/50">
                <p className="text-2xl font-bold">
                  <span className="text-green-500">{stats.wins24h}</span>
                  <span className="text-muted-foreground mx-1">/</span>
                  <span className="text-red-500">{stats.losses24h}</span>
                </p>
                <p className="text-xs text-muted-foreground">{t("home.statWinLoss")}</p>
              </div>

              {/* Trophy delta */}
              <div className="text-center p-2 rounded-lg bg-background/50">
                <p className={cn(
                  "text-2xl font-bold",
                  stats.delta24h > 0 ? "text-green-500" : stats.delta24h < 0 ? "text-red-500" : "text-muted-foreground",
                )}>
                  {stats.delta24h > 0 ? "+" : ""}{stats.delta24h}
                </p>
                <p className="text-xs text-muted-foreground">{t("home.statTrophyDelta")}</p>
              </div>

              {/* Win rate */}
              <div className="text-center p-2 rounded-lg bg-background/50">
                <p className={cn(
                  "text-2xl font-bold",
                  stats.winRate >= 60 ? "text-green-500" : stats.winRate <= 40 ? "text-red-500" : "text-foreground",
                )}>
                  {stats.winRate}%
                </p>
                <p className="text-xs text-muted-foreground">{t("home.statWinRate")}</p>
              </div>
            </div>

            {/* Streak indicator — AC3 */}
            <div className="flex items-center gap-2 flex-wrap">
              {stats.wins24h > stats.losses24h && (
                <Badge variant="outline" className="border-green-500/50 text-green-500 bg-green-500/10 gap-1">
                  <Flame className="w-3 h-3" />
                  {t("home.winStreak", { count: stats.wins24h - stats.losses24h })}
                </Badge>
              )}
              {stats.losses24h > stats.wins24h && (
                <Badge variant="outline" className="border-red-500/50 text-red-500 bg-red-500/10 gap-1">
                  <TrendingDown className="w-3 h-3" />
                  {t("home.lossStreak", { count: stats.losses24h - stats.wins24h })}
                </Badge>
              )}

              {/* Tilt badge — AC4 */}
              {isOnTilt && (
                <Badge variant="outline" className="border-red-500/50 text-red-500 bg-red-500/10 gap-1 animate-pulse">
                  <Coffee className="w-3 h-3" />
                  {t("home.tiltDetected")}
                </Badge>
              )}
              {isMediumTilt && (
                <Badge variant="outline" className="border-orange-500/50 text-orange-500 bg-orange-500/10 gap-1">
                  <Minus className="w-3 h-3" />
                  {t("home.tiltWarning")}
                </Badge>
              )}
            </div>

            {/* Tilt suggestion — AC5 */}
            {isOnTilt && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-200">
                <p>{t("home.tiltSuggestion")}</p>
              </div>
            )}
          </>
        )}

        {/* Quick action buttons — AC10 */}
        <div className="flex gap-2 flex-wrap pt-1">
          {isEmpty ? (
            <Link href="/decks">
              <Button variant="outline" size="sm" className="gap-1 text-xs">
                <Search className="w-3 h-3" />
                {t("home.insight.action.checkMeta")}
              </Button>
            </Link>
          ) : isOnTilt ? (
            <Link href="/push">
              <Button variant="outline" size="sm" className="gap-1 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10">
                <Target className="w-3 h-3" />
                {t("home.insight.action.analyze")}
              </Button>
            </Link>
          ) : stats.wins24h > stats.losses24h ? (
            <Link href="/push">
              <Button variant="outline" size="sm" className="gap-1 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10">
                <Zap className="w-3 h-3" />
                {t("home.insight.action.pushMore")}
              </Button>
            </Link>
          ) : (
            <Link href="/decks">
              <Button variant="outline" size="sm" className="gap-1 text-xs">
                <Search className="w-3 h-3" />
                {t("home.insight.action.checkMeta")}
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
