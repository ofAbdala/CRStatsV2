import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Users, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "@/hooks/use-locale";

interface PlayerRanking {
  tag: string;
  name: string;
  eloRating: number;
  rank: number;
  clan?: {
    tag: string;
    name: string;
  };
}

interface ClanRanking {
  tag: string;
  name: string;
  clanScore: number;
  rank: number;
  members: number;
  badgeId: number;
}

interface RankingsResponse {
  items: PlayerRanking[] | ClanRanking[];
}

export default function CommunityPage() {
  const { t } = useLocale();

  const {
    data: playerRankings,
    isLoading: playersLoading,
    error: playersError,
  } = useQuery<RankingsResponse>({
    queryKey: ["/api/community/player-rankings", "global"],
    queryFn: async () => {
      const res = await fetch("/api/community/player-rankings?locationId=global");
      if (!res.ok) throw new Error("Failed to fetch player rankings");
      return res.json();
    },
  });

  const {
    data: clanRankings,
    isLoading: clansLoading,
    error: clansError,
  } = useQuery<RankingsResponse>({
    queryKey: ["/api/community/clan-rankings", "global"],
    queryFn: async () => {
      const res = await fetch("/api/community/clan-rankings?locationId=global");
      if (!res.ok) throw new Error("Failed to fetch clan rankings");
      return res.json();
    },
  });

  const players = (playerRankings?.items || []) as PlayerRanking[];
  const clans = (clanRankings?.items || []) as ClanRanking[];

  const RankingSkeleton = () => (
    <div className="divide-y divide-border/50">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="w-8 h-8 rounded" />
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="w-24 h-4" />
              <Skeleton className="w-16 h-3" />
            </div>
          </div>
          <Skeleton className="w-20 h-6" />
        </div>
      ))}
    </div>
  );

  const ErrorState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="w-12 h-12 text-destructive mb-4" />
      <h3 className="text-lg font-bold">{t("common.error")}</h3>
      <p className="text-muted-foreground">{message}</p>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground" data-testid="text-community-title">
            {t("community.title")}
          </h1>
          <p className="text-muted-foreground" data-testid="text-community-subtitle">
            {t("community.subtitle")}
          </p>
        </div>

        <Tabs defaultValue="rankings" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="rankings" data-testid="tab-top-players">
              {t("community.topPlayers")}
            </TabsTrigger>
            <TabsTrigger value="clans" data-testid="tab-top-clans">
              {t("community.topClans")}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="rankings" className="mt-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  {t("community.globalRanking")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {playersLoading ? (
                  <RankingSkeleton />
                ) : playersError ? (
                  <ErrorState message={t("community.loadError")} />
                ) : players.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    {t("community.noRankings")}
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {players.map((player) => (
                      <div
                        key={player.tag}
                        className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                        data-testid={`row-player-${player.tag.replace("#", "")}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 flex items-center justify-center font-bold text-muted-foreground">
                            #{player.rank}
                          </div>
                          <Avatar className="w-10 h-10 border border-border">
                            <AvatarFallback>
                              {player.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <Link href={`/p/${player.tag.replace("#", "")}`}>
                              <div
                                className="font-bold cursor-pointer hover:underline"
                                data-testid={`link-player-${player.tag.replace("#", "")}`}
                              >
                                {player.name}
                              </div>
                            </Link>
                            {player.clan && (
                              <Link href={`/clan/${player.clan.tag.replace("#", "")}`}>
                                <div
                                  className="text-xs text-muted-foreground cursor-pointer hover:underline"
                                  data-testid={`link-player-clan-${player.tag.replace("#", "")}`}
                                >
                                  {player.clan.name}
                                </div>
                              </Link>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 min-w-[100px] justify-end">
                          <Trophy className="w-4 h-4 text-yellow-500" />
                          <span className="font-bold font-display" data-testid={`text-player-trophies-${player.tag.replace("#", "")}`}>
                            {(player.eloRating ?? 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="clans" className="mt-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  {t("community.clanRanking")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {clansLoading ? (
                  <RankingSkeleton />
                ) : clansError ? (
                  <ErrorState message={t("community.loadError")} />
                ) : clans.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    {t("community.noRankings")}
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {clans.map((clan) => (
                      <div
                        key={clan.tag}
                        className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                        data-testid={`row-clan-${clan.tag.replace("#", "")}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 flex items-center justify-center font-bold text-muted-foreground">
                            #{clan.rank}
                          </div>
                          <Avatar className="w-10 h-10 border border-border">
                            <AvatarFallback>
                              {clan.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <Link href={`/clan/${clan.tag.replace("#", "")}`}>
                              <div
                                className="font-bold cursor-pointer hover:underline"
                                data-testid={`link-clan-${clan.tag.replace("#", "")}`}
                              >
                                {clan.name}
                              </div>
                            </Link>
                            <div className="text-xs text-muted-foreground">
                              {clan.members} {t("community.members")}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 min-w-[100px] justify-end">
                          <Trophy className="w-4 h-4 text-yellow-500" />
                          <span className="font-bold font-display" data-testid={`text-clan-score-${clan.tag.replace("#", "")}`}>
                            {(clan.clanScore ?? 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
