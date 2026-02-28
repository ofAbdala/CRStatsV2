import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageErrorState from "@/components/PageErrorState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Users, Loader2, AlertCircle, Shield, Hash, Search } from "lucide-react";
import { RankingRowSkeleton } from "@/components/skeletons";
import { EmptyState } from "@/components/EmptyState";
import { api } from "@/lib/api";
import { useLocale } from "@/hooks/use-locale";
import { getApiErrorMessage } from "@/lib/errorMessages";
import { parseClashTag } from "@shared/clashTag";
import TopDecksSection from "@/components/TopDecksSection";

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
  const { t } = useLocale();
  const [, setLocation] = useLocation();
  const [selectedClanTag, setSelectedClanTag] = useState<string | null>(null);
  const [searchTag, setSearchTag] = useState("");
  const [searchTagError, setSearchTagError] = useState<string | null>(null);

  const handleTagSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = searchTag.trim();
    if (!trimmed) {
      setSearchTagError(t("pages.community.tagSearchEmpty"));
      return;
    }

    const parsed = parseClashTag(trimmed);
    if (!parsed) {
      setSearchTagError(t("pages.community.tagSearchInvalid"));
      return;
    }

    setSearchTagError(null);
    setLocation(`/p/${parsed.withoutHash}`);
  };

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
          <h1 className="text-2xl md:text-3xl font-display font-bold">{t("pages.community.title")}</h1>
          <p className="text-muted-foreground">{t("pages.community.subtitle")}</p>
        </div>

        <Tabs defaultValue="players" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-[520px] h-auto">
            <TabsTrigger value="players">{t("pages.community.tabs.players")}</TabsTrigger>
            <TabsTrigger value="clans">{t("pages.community.tabs.clans")}</TabsTrigger>
            <TabsTrigger value="decks">Top Decks</TabsTrigger>
          </TabsList>

          <TabsContent value="players" className="mt-4">
            <Card className="border-border/50 bg-card/50 mb-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  {t("pages.community.tagSearchTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTagSearchSubmit} className="space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={searchTag}
                        onChange={(event) => {
                          setSearchTag(event.target.value.toUpperCase().replace(/^#/, ""));
                          setSearchTagError(null);
                        }}
                        placeholder={t("pages.community.tagSearchPlaceholder")}
                        className="pl-9 font-mono uppercase"
                        aria-label={t("pages.community.tagSearchPlaceholder")}
                      />
                    </div>
                    <Button type="submit" disabled={!searchTag.trim()}>
                      {t("pages.community.tagSearchButton")}
                    </Button>
                  </div>
                  {searchTagError ? (
                    <p className="text-sm text-destructive">{searchTagError}</p>
                  ) : null}
                </form>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  {t("pages.community.playersRankingTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {playerRankingsQuery.isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <RankingRowSkeleton key={i} />
                    ))}
                  </div>
                ) : playerRankingsQuery.isError ? (
                  <PageErrorState
                    title={t("pages.community.playersErrorTitle")}
                    description={getApiErrorMessage(playerRankingsQuery.error, t, "pages.community.playersErrorDescription")}
                    error={playerRankingsQuery.error}
                    onRetry={() => playerRankingsQuery.refetch()}
                  />
                ) : players.length === 0 ? (
                  <EmptyState
                    icon={Trophy}
                    title={t("pages.community.emptyPlayers")}
                    description={t("pages.community.emptyPlayers")}
                  />
                ) : (
                  players.slice(0, 50).map((player) => (
                    <div key={player.tag} className="flex items-center justify-between rounded-lg border border-border/40 p-3 gap-2">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <Badge variant="outline" className="shrink-0">#{player.rank}</Badge>
                        <Avatar className="w-9 h-9 border border-border/50 shrink-0 hidden sm:flex">
                          <AvatarFallback>{player.name?.slice(0, 2)?.toUpperCase() || "PL"}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <Link href={`/p/${normalizeTagForPath(player.tag)}`}>
                            <p className="font-medium hover:underline cursor-pointer truncate">{player.name}</p>
                          </Link>
                          <p className="text-xs text-muted-foreground truncate">
                            {player.tag}
                            {player.clan?.name ? ` \u2022 ${player.clan.name}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold">{player.trophies}</p>
                        <p className="text-xs text-muted-foreground">{t("pages.community.trophiesLabel")}</p>
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
                  {t("pages.community.clansRankingTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {clanRankingsQuery.isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <RankingRowSkeleton key={i} />
                    ))}
                  </div>
                ) : clanRankingsQuery.isError ? (
                  <PageErrorState
                    title={t("pages.community.clansErrorTitle")}
                    description={getApiErrorMessage(clanRankingsQuery.error, t, "pages.community.clansErrorDescription")}
                    error={clanRankingsQuery.error}
                    onRetry={() => clanRankingsQuery.refetch()}
                  />
                ) : clans.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title={t("pages.community.emptyClans")}
                    description={t("pages.community.emptyClans")}
                  />
                ) : (
                  clans.slice(0, 30).map((clan) => (
                    <div key={clan.tag} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-border/40 p-3 gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">#{clan.rank}</Badge>
                          <p className="font-medium truncate">{clan.name}</p>
                          <Badge variant="secondary" className="text-xs">{clan.tag}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("pages.community.clanScoreLine", { score: clan.clanScore, members: clan.members })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link href={`/clan/${normalizeTagForPath(clan.tag)}`}>
                          <Button variant="outline" size="sm" className="min-h-[44px]">
                            View Clan
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-h-[44px]"
                          onClick={() => setSelectedClanTag(clan.tag)}
                        >
                          {t("pages.community.viewMembers")}
                        </Button>
                      </div>
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
                    {t("pages.community.publicClanTitle", { tag: selectedClanTag })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {publicClanQuery.isLoading ? (
                    <div className="py-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("pages.community.loadingPublicClan")}
                    </div>
                  ) : publicClanQuery.isError ? (
                    <PageErrorState
                      title={t("pages.community.publicClanErrorTitle")}
                      description={getApiErrorMessage(publicClanQuery.error, t, "pages.community.publicClanErrorDescription")}
                      error={publicClanQuery.error}
                      onRetry={() => publicClanQuery.refetch()}
                    />
                  ) : publicClanQuery.data ? (
                    <>
                      <div className="rounded-lg border border-border/40 p-3">
                        <p className="font-semibold">{publicClanQuery.data.clan?.name || t("pages.community.clanFallback")}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("pages.community.publicClanMeta", {
                            tag: publicClanQuery.data.clan?.tag || selectedClanTag,
                            members: publicClanQuery.data.clan?.members || publicClanQuery.data.members.length || 0,
                          })}
                        </p>
                        {publicClanQuery.data.clan?.description ? (
                          <p className="text-sm text-muted-foreground mt-2">{publicClanQuery.data.clan.description}</p>
                        ) : null}
                      </div>

                      {publicClanQuery.data.membersPartial && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            {t("pages.community.partialMembers", {
                              reason: publicClanQuery.data.membersError || t("pages.community.externalUnavailable"),
                            })}
                          </AlertDescription>
                        </Alert>
                      )}

                      {publicClanQuery.data.members.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("pages.community.emptyMembers")}</p>
                      ) : (
                        <div className="space-y-2">
                          {publicClanQuery.data.members.slice(0, 30).map((member) => (
                            <div key={member.tag} className="flex items-center justify-between rounded-lg border border-border/40 p-3">
                              <div>
                                <Link href={`/p/${normalizeTagForPath(member.tag)}`}>
                                  <p className="font-medium hover:underline cursor-pointer">{member.name}</p>
                                </Link>
                                <p className="text-xs text-muted-foreground">
                                  {t("pages.community.memberLine", { tag: member.tag, role: member.role || t("pages.community.memberFallbackRole") })}
                                </p>
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

          <TabsContent value="decks" className="mt-4">
            <TopDecksSection />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
