import React from "react";
import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Crown, ArrowLeft, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { useLocale } from "@/hooks/use-locale";

interface PlayerData {
  tag: string;
  name: string;
  trophies: number;
  bestTrophies: number;
  arena?: { name: string };
  clan?: { tag: string; name: string };
  wins?: number;
  losses?: number;
}

interface BattleData {
  battleTime: string;
  type: string;
  team: Array<{
    crowns: number;
    trophyChange: number;
  }>;
  opponent: Array<{
    name: string;
    tag: string;
    crowns: number;
  }>;
}

interface PublicPlayerResponse {
  player: PlayerData;
  recentBattles: BattleData[];
}

export default function PublicProfilePage() {
  const [match, params] = useRoute("/p/:tag");
  const tag = params?.tag || "";
  const { t } = useLocale();

  const { data, isLoading, error } = useQuery<PublicPlayerResponse>({
    queryKey: ["public-player", tag],
    queryFn: async () => {
      const response = await fetch(`/api/public/player/${encodeURIComponent(tag)}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch player");
      }
      return response.json();
    },
    enabled: !!tag,
    staleTime: 60000,
  });

  const player = data?.player;
  const recentBattles = data?.recentBattles || [];

  const winRate = player && player.wins !== undefined && player.losses !== undefined
    ? ((player.wins / (player.wins + player.losses)) * 100).toFixed(1)
    : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="w-8 h-8" />
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Link href="/dashboard">
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" /> {t("common.back")}
            </Button>
          </Link>
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <p className="text-destructive font-semibold mb-2">{t("common.error")}</p>
              <p className="text-muted-foreground">
                {error instanceof Error ? error.message : t("errors.playerNotFound")}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-6" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" /> {t("common.back")}
          </Button>
        </Link>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 p-8 rounded-2xl bg-card border border-border relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl rounded-full -mr-32 -mt-32" />
          
          <div className="flex items-center gap-6 relative z-10">
            <Avatar className="w-24 h-24 border-4 border-background shadow-xl">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.tag}`} />
              <AvatarFallback>PL</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-display font-bold" data-testid="text-player-name">{player.name}</h1>
                <Badge variant="outline" className="font-mono" data-testid="text-player-tag">#{tag}</Badge>
              </div>
              <p className="text-muted-foreground flex items-center gap-2">
                <Crown className="w-4 h-4 text-yellow-500" />
                {player.arena?.name || "Unknown Arena"}
              </p>
              {player.clan && (
                <Link href={`/clan/${encodeURIComponent(player.clan.tag.replace('#', ''))}`}>
                  <p className="text-muted-foreground flex items-center gap-2 mt-1 hover:text-primary cursor-pointer" data-testid="link-clan">
                    <Users className="w-4 h-4 text-blue-500" />
                    {player.clan.name}
                  </p>
                </Link>
              )}
            </div>
          </div>

          <div className="flex gap-4 relative z-10">
             <div className="text-center p-4 bg-background/50 rounded-xl border border-border">
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">{t("dashboard.stats.trophies")}</div>
                <div className="text-2xl font-display font-bold flex items-center gap-1" data-testid="text-trophies">
                   <Trophy className="w-5 h-5 text-yellow-500" />
                   {player.trophies}
                </div>
             </div>
             {winRate && (
               <div className="text-center p-4 bg-background/50 rounded-xl border border-border">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-1">{t("dashboard.stats.winRate")}</div>
                  <div className="text-2xl font-display font-bold text-green-500" data-testid="text-winrate">
                     {winRate}%
                  </div>
               </div>
             )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
           <Card className="md:col-span-2 border-border/50 bg-card/30">
              <CardHeader>
                 <CardTitle>{t("dashboard.recentBattles")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                 {recentBattles.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">{t("dashboard.noBattles")}</p>
                 ) : (
                   recentBattles.map((battle, index) => {
                      const playerTeam = battle.team?.[0];
                      const opponent = battle.opponent?.[0];
                      const isVictory = playerTeam && opponent && playerTeam.crowns > opponent.crowns;
                      const isDraw = playerTeam && opponent && playerTeam.crowns === opponent.crowns;
                      const trophyChange = playerTeam?.trophyChange || 0;

                      return (
                        <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border/50" data-testid={`battle-row-${index}`}>
                           <div className="flex items-center gap-4">
                              <Badge 
                                variant={isVictory ? "default" : "secondary"} 
                                className={cn(
                                  isVictory ? "bg-green-500/20 text-green-500 hover:bg-green-500/30" : 
                                  isDraw ? "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30" :
                                  "bg-red-500/20 text-red-500 hover:bg-red-500/30"
                                )}
                              >
                                 {isVictory ? t("battle.victory").toUpperCase() : isDraw ? t("battle.draw").toUpperCase() : t("battle.defeat").toUpperCase()}
                              </Badge>
                              <div>
                                 <div className="font-bold text-sm">vs {opponent?.name || "Unknown"}</div>
                                 <div className="text-xs text-muted-foreground">{new Date(battle.battleTime).toLocaleDateString()}</div>
                              </div>
                           </div>
                           <div className={cn(
                             "font-bold font-mono",
                             trophyChange > 0 ? "text-green-500" : trophyChange < 0 ? "text-red-500" : "text-muted-foreground"
                           )}>
                              {trophyChange > 0 ? "+" : ""}{trophyChange}
                           </div>
                        </div>
                      );
                   })
                 )}
              </CardContent>
           </Card>

           <div className="space-y-6">
              <Card className="border-primary/50 bg-primary/5">
                 <CardHeader>
                    <CardTitle className="text-primary">{t("coach.title")}</CardTitle>
                 </CardHeader>
                 <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                       {t("coach.subtitle")}
                    </p>
                    <Link href="/coach">
                       <Button className="w-full font-bold" data-testid="button-analyze-coach">{t("coach.title")}</Button>
                    </Link>
                 </CardContent>
              </Card>
           </div>
        </div>
      </div>
    </div>
  );
}
