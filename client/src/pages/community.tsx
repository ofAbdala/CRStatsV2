import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Users, Loader2, AlertCircle, Shield } from "lucide-react";
import { api } from "@/lib/api";

interface RankingPlayer {
  rank: number;
  name: string;
  tag: string;
  trophies: number;
  clan?: {
    name?: string;
    tag?: string;
  };
}

interface RankingClan {
  rank: number;
  name: string;
  tag: string;
  clanScore: number;
  members: number;
  badgeId?: number;
}

interface ClanMember {
  name: string;
  tag: string;
  role?: string;
  trophies?: number;
}

interface PublicClanResponse {
  clan: {
    name?: string;
    tag?: string;
    description?: string;
    members?: number;
    clanScore?: number;
    requiredTrophies?: number;
  };
  members: ClanMember[];
  membersPartial?: boolean;
  membersError?: string | null;
}

function normalizeTagForPath(tag?: string) {
  if (!tag) return "";
  return tag.replace(/^#/, "");
}

function extractItems<T>(payload: { items?: T[] } | T[] | null | undefined): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload.items) ? payload.items : [];
}

export default function CommunityPage() {
  const [selectedClanTag, setSelectedClanTag] = useState<string | null>(null);

  const playerRankingsQuery = useQuery({
    queryKey: ["community-player-rankings", "global"],
    queryFn: () => api.community.getPlayerRankings("global") as Promise<{ items?: RankingPlayer[] } | RankingPlayer[]>,
  });

  const clanRankingsQuery = useQuery({
    queryKey: ["community-clan-rankings", "global"],
    queryFn: () => api.community.getClanRankings("global") as Promise<{ items?: RankingClan[] } | RankingClan[]>,
  });

  const publicClanQuery = useQuery({
    queryKey: ["public-clan", selectedClanTag],
    queryFn: () => api.public.getClan(selectedClanTag || "") as Promise<PublicClanResponse>,
    enabled: Boolean(selectedClanTag),
  });

  const players = extractItems<RankingPlayer>(playerRankingsQuery.data);
  const clans = extractItems<RankingClan>(clanRankingsQuery.data);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Community</h1>
          <p className="text-muted-foreground">Rankings públicos de jogadores e clãs com links cruzados.</p>
        </div>

        <Tabs defaultValue="players" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-[420px]">
            <TabsTrigger value="players">Top jogadores</TabsTrigger>
            <TabsTrigger value="clans">Top clãs</TabsTrigger>
          </TabsList>

          <TabsContent value="players" className="mt-4">
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Ranking de Jogadores
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {playerRankingsQuery.isLoading ? (
                  <div className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Carregando ranking...
                  </div>
                ) : playerRankingsQuery.isError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Falha ao carregar ranking de jogadores.</AlertDescription>
                  </Alert>
                ) : players.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Sem dados de ranking no momento.</p>
                ) : (
                  players.slice(0, 50).map((player) => (
                    <div key={player.tag} className="flex items-center justify-between rounded-lg border border-border/40 p-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">#{player.rank}</Badge>
                        <Avatar className="w-9 h-9 border border-border/50">
                          <AvatarFallback>{player.name?.slice(0, 2)?.toUpperCase() || "PL"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <Link href={`/p/${normalizeTagForPath(player.tag)}`}>
                            <p className="font-medium hover:underline cursor-pointer">{player.name}</p>
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {player.tag}
                            {player.clan?.name ? ` • ${player.clan.name}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{player.trophies}</p>
                        <p className="text-xs text-muted-foreground">troféus</p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clans" className="mt-4 space-y-4">
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Ranking de Clãs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {clanRankingsQuery.isLoading ? (
                  <div className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Carregando clãs...
                  </div>
                ) : clanRankingsQuery.isError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Falha ao carregar ranking de clãs.</AlertDescription>
                  </Alert>
                ) : clans.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Sem dados de clãs no momento.</p>
                ) : (
                  clans.slice(0, 30).map((clan) => (
                    <div key={clan.tag} className="flex items-center justify-between rounded-lg border border-border/40 p-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">#{clan.rank}</Badge>
                          <p className="font-medium">{clan.name}</p>
                          <Badge variant="secondary">{clan.tag}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Score {clan.clanScore} • {clan.members} membros
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedClanTag(clan.tag)}
                      >
                        Ver membros
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {selectedClanTag && (
              <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Clan público {selectedClanTag}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {publicClanQuery.isLoading ? (
                    <div className="py-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Carregando dados do clã...
                    </div>
                  ) : publicClanQuery.isError ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>Falha ao carregar dados públicos do clã.</AlertDescription>
                    </Alert>
                  ) : publicClanQuery.data ? (
                    <>
                      <div className="rounded-lg border border-border/40 p-3">
                        <p className="font-semibold">{publicClanQuery.data.clan?.name || "Clã"}</p>
                        <p className="text-xs text-muted-foreground">
                          {publicClanQuery.data.clan?.tag || selectedClanTag} • {publicClanQuery.data.clan?.members || publicClanQuery.data.members.length || 0} membros
                        </p>
                        {publicClanQuery.data.clan?.description ? (
                          <p className="text-sm text-muted-foreground mt-2">{publicClanQuery.data.clan.description}</p>
                        ) : null}
                      </div>

                      {publicClanQuery.data.membersPartial && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Dados de membros parciais. {publicClanQuery.data.membersError || "Fonte externa indisponível."}
                          </AlertDescription>
                        </Alert>
                      )}

                      {publicClanQuery.data.members.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sem membros disponíveis para este clã.</p>
                      ) : (
                        <div className="space-y-2">
                          {publicClanQuery.data.members.slice(0, 30).map((member) => (
                            <div key={member.tag} className="flex items-center justify-between rounded-lg border border-border/40 p-3">
                              <div>
                                <Link href={`/p/${normalizeTagForPath(member.tag)}`}>
                                  <p className="font-medium hover:underline cursor-pointer">{member.name}</p>
                                </Link>
                                <p className="text-xs text-muted-foreground">{member.tag} • {member.role || "member"}</p>
                              </div>
                              <p className="text-sm font-medium">{member.trophies || 0}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : null}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
