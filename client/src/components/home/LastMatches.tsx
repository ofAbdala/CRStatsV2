/**
 * LastMatches — Quick view of recent battle results on the dashboard.
 * Story 2.5: Supporting component for the dashboard grid.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";
import { Swords, Trophy } from "lucide-react";
import { Link } from "wouter";
import { parseBattleTime } from "@/lib/pushUtils";

interface LastMatchesProps {
  battles: any[];
}

export function LastMatches({ battles }: LastMatchesProps) {
  const { t } = useLocale();
  const recentBattles = (battles || []).slice(0, 5);

  return (
    <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm flex flex-col">
      <CardHeader className="pb-2 px-4 pt-3">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Swords className="w-4 h-4 text-primary" />
          {t("home.lastMatchesTitle")}
        </CardTitle>
      </CardHeader>

      <CardContent className="px-3 pb-3 flex-1 overflow-hidden">
        {recentBattles.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
            {t("home.noMatches")}
          </div>
        ) : (
          <div className="space-y-1.5">
            {recentBattles.map((battle: any, idx: number) => {
              const teamCrowns = battle?.team?.[0]?.crowns ?? 0;
              const oppCrowns = battle?.opponent?.[0]?.crowns ?? 0;
              const isWin = teamCrowns > oppCrowns;
              const isLoss = teamCrowns < oppCrowns;
              const trophyChange = battle?.team?.[0]?.trophyChange;
              const mode = battle?.type || "Ladder";

              return (
                <div
                  key={`match-${idx}`}
                  className={cn(
                    "flex items-center justify-between px-2 py-1.5 rounded-md text-xs",
                    isWin && "bg-green-500/10 border-l-2 border-green-500",
                    isLoss && "bg-red-500/10 border-l-2 border-red-500",
                    !isWin && !isLoss && "bg-muted/20 border-l-2 border-muted-foreground",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-semibold",
                      isWin ? "text-green-500" : isLoss ? "text-red-500" : "text-muted-foreground",
                    )}>
                      {isWin ? "W" : isLoss ? "L" : "D"}
                    </span>
                    <span className="text-muted-foreground truncate max-w-[80px]">
                      {mode.replace(/^PvP$/, "Ladder")}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">
                      {teamCrowns} - {oppCrowns}
                    </span>
                    {typeof trophyChange === "number" && (
                      <span className={cn(
                        "font-medium",
                        trophyChange > 0 ? "text-green-500" : trophyChange < 0 ? "text-red-500" : "text-muted-foreground",
                      )}>
                        <Trophy className="w-3 h-3 inline mr-0.5" />
                        {trophyChange > 0 ? "+" : ""}{trophyChange}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            <Link href="/me" className="block text-center">
              <span className="text-xs text-primary hover:underline cursor-pointer">
                {t("home.viewAllHistory")}
              </span>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
