/**
 * DailyInsight — Contextual advice card based on daily performance.
 * Story 2.5: Complements DailyStatusCard with actionable insight.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";
import { Lightbulb, Coffee, Search, Zap, BarChart3 } from "lucide-react";
import { Link } from "wouter";

interface DailyInsightProps {
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

function getInsight(
  stats: DailyInsightProps["stats"],
  tilt: DailyInsightProps["tilt"],
  t: (key: string) => string,
): { message: string; actionLabel: string; actionHref: string; icon: React.ReactNode; color: string } {
  // On tilt (high)
  if (tilt.level === "high") {
    return {
      message: t("home.insight.stopPlaying"),
      actionLabel: t("home.insight.action.chill"),
      actionHref: "/me",
      icon: <Coffee className="w-4 h-4" />,
      color: "text-red-500",
    };
  }

  // Losing day
  if (stats.totalMatches24h > 3 && stats.winRate < 40) {
    return {
      message: t("home.insight.losingStreak"),
      actionLabel: t("home.insight.action.checkMeta"),
      actionHref: "/decks",
      icon: <Search className="w-4 h-4" />,
      color: "text-orange-500",
    };
  }

  // Winning day
  if (stats.totalMatches24h > 2 && stats.winRate > 60) {
    return {
      message: t("home.insight.onFire"),
      actionLabel: t("home.insight.action.pushMore"),
      actionHref: "/push",
      icon: <Zap className="w-4 h-4" />,
      color: "text-green-500",
    };
  }

  // Generic/no battles
  return {
    message: t("home.insight.generic"),
    actionLabel: t("home.insight.action.analyze"),
    actionHref: "/push",
    icon: <BarChart3 className="w-4 h-4" />,
    color: "text-muted-foreground",
  };
}

export function DailyInsight({ stats, tilt }: DailyInsightProps) {
  const { t } = useLocale();
  const insight = getInsight(stats, tilt, t);

  return (
    <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm flex flex-col">
      <CardHeader className="pb-2 px-4 pt-3">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Lightbulb className="w-4 h-4 text-yellow-500" />
          {t("home.dailyInsightTitle")}
        </CardTitle>
      </CardHeader>

      <CardContent className="px-4 pb-4 flex-1 flex flex-col justify-between">
        <div className="flex items-start gap-2 mb-3">
          <div className={cn("mt-0.5", insight.color)}>
            {insight.icon}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {insight.message}
          </p>
        </div>

        <Link href={insight.actionHref}>
          <Button variant="outline" size="sm" className="w-full text-xs gap-1">
            {insight.actionLabel}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
