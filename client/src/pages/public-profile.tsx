import { useEffect, type ReactNode } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import PageErrorState from "@/components/PageErrorState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Crown, Loader2, Trophy } from "lucide-react";
import { ApiError, api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";
import { parseClashTag } from "@shared/clashTag";

interface PublicPlayerResponse {
  player: {
    name?: string;
    tag?: string;
    trophies?: number;
    bestTrophies?: number;
    arena?: { name?: string };
    clan?: { name?: string };
    wins?: number;
    losses?: number;
  };
  recentBattles: any[];
}

function getBattleResultLabel(battle: any, t: (key: string) => string) {
  const myCrowns = battle?.team?.[0]?.crowns || 0;
  const oppCrowns = battle?.opponent?.[0]?.crowns || 0;
  if (myCrowns > oppCrowns) return t("battle.victory");
  if (myCrowns < oppCrowns) return t("battle.defeat");
  return t("battle.draw");
}

export default function PublicProfilePage() {
  const { t } = useLocale();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/p/:tag");
  const rawTagParam = params?.tag || "";
  const parsedTag = parseClashTag(rawTagParam);
  const canonicalTag = parsedTag?.withoutHash || "";
  const displayTag = parsedTag?.withHash || (rawTagParam ? `#${rawTagParam.replace(/^#/, "").toUpperCase()}` : "");

  useEffect(() => {
    if (!parsedTag) return;
    if (rawTagParam !== parsedTag.withoutHash) {
      setLocation(`/p/${parsedTag.withoutHash}`, { replace: true });
    }
  }, [parsedTag, rawTagParam, setLocation]);

  const publicPlayerQuery = useQuery({
    queryKey: ["public-player", canonicalTag],
    queryFn: () => api.public.getPlayer(canonicalTag) as Promise<PublicPlayerResponse>,
    enabled: Boolean(canonicalTag),
  });

  const isNotFound = publicPlayerQuery.error instanceof ApiError && publicPlayerQuery.error.status === 404;

  const player = publicPlayerQuery.data?.player;
  const battles = publicPlayerQuery.data?.recentBattles || [];

  const totalBattles = (player?.wins || 0) + (player?.losses || 0);
  const winRate = totalBattles > 0 ? Math.round(((player?.wins || 0) / totalBattles) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Link href="/community">
          <Button variant="ghost">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("pages.publicProfile.backToCommunity")}
          </Button>
        </Link>

        {!canonicalTag ? (
          <PageErrorState
            title={t("pages.publicProfile.invalidTagTitle")}
            description={t("pages.publicProfile.invalidTagDescription", { tag: displayTag || "#?" })}
            showReload={false}
          />
        ) : publicPlayerQuery.isLoading ? (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="py-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("pages.publicProfile.loading")}
            </CardContent>
          </Card>
        ) : publicPlayerQuery.isError || !player ? (
          <PageErrorState
            title={isNotFound ? t("pages.publicProfile.tagNotFoundTitle") : t("pages.publicProfile.errorTitle")}
            description={
              isNotFound
                ? t("pages.publicProfile.tagNotFoundDescription", { tag: displayTag })
                : t("pages.publicProfile.errorDescription", { tag: displayTag })
            }
            error={publicPlayerQuery.error}
            onRetry={() => publicPlayerQuery.refetch()}
          />
        ) : (
          <>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="py-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <Avatar className="w-20 h-20 border border-border/50">
                    <AvatarFallback>{player.name?.slice(0, 2)?.toUpperCase() || "PL"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-display font-bold">{player.name || t("pages.publicProfile.playerFallback")}</h1>
                      <Badge variant="outline">{player.tag || displayTag}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {player.arena?.name || t("pages.publicProfile.arenaFallback")}
                      {player.clan?.name ? ` • ${player.clan.name}` : ""}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 min-w-[230px]">
                  <StatBox label={t("pages.publicProfile.stats.trophies")} value={String(player.trophies || 0)} icon={<Trophy className="w-4 h-4 text-yellow-500" />} />
                  <StatBox label={t("pages.publicProfile.stats.best")} value={String(player.bestTrophies || 0)} />
                  <StatBox label={t("pages.publicProfile.stats.winRate")} value={`${winRate}%`} className="text-green-500" />
                  <StatBox label={t("pages.publicProfile.stats.winLoss")} value={`${player.wins || 0}/${player.losses || 0}`} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle>{t("pages.publicProfile.recentHistoryTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {battles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("pages.publicProfile.emptyBattles")}</p>
                ) : (
                  battles.slice(0, 10).map((battle: any, index: number) => {
                    const result = getBattleResultLabel(battle, t);
                    const trophyChange = battle?.team?.[0]?.trophyChange || 0;
                    return (
                      <div key={`${battle?.battleTime || "battle"}-${index}`} className="rounded-lg border border-border/40 p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {t("pages.publicProfile.battleLine", {
                              result,
                              opponent: battle?.opponent?.[0]?.name || t("battle.opponent"),
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(battle?.team?.[0]?.crowns || 0)} x {(battle?.opponent?.[0]?.crowns || 0)}
                          </p>
                        </div>
                        <span className={cn("font-semibold", trophyChange > 0 && "text-green-500", trophyChange < 0 && "text-red-500")}>
                          {trophyChange > 0 ? "+" : ""}{trophyChange}
                        </span>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50">
              <CardContent className="py-5 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-medium">{t("pages.publicProfile.coachCtaTitle")}</p>
                  <p className="text-sm text-muted-foreground">{t("pages.publicProfile.coachCtaDescription")}</p>
                </div>
                <Link href="/coach">
                  <Button>
                    <Crown className="w-4 h-4 mr-2" />
                    {t("pages.publicProfile.openCoach")}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className="rounded-lg border border-border/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("font-semibold mt-1 flex items-center gap-1", className)}>
        {icon}
        {value}
      </p>
    </div>
  );
}
