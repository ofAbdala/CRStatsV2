import type { ReactNode } from "react";
import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Crown, Loader2, Trophy, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

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

function getBattleResultLabel(battle: any) {
  const myCrowns = battle?.team?.[0]?.crowns || 0;
  const oppCrowns = battle?.opponent?.[0]?.crowns || 0;
  if (myCrowns > oppCrowns) return "Vitória";
  if (myCrowns < oppCrowns) return "Derrota";
  return "Empate";
}

export default function PublicProfilePage() {
  const [, params] = useRoute("/p/:tag");
  const rawTag = params?.tag || "";
  const playerTag = rawTag ? `#${rawTag.replace(/^#/, "")}` : "";

  const publicPlayerQuery = useQuery({
    queryKey: ["public-player", rawTag],
    queryFn: () => api.public.getPlayer(rawTag) as Promise<PublicPlayerResponse>,
    enabled: Boolean(rawTag),
  });

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
            Voltar para Community
          </Button>
        </Link>

        {publicPlayerQuery.isLoading ? (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="py-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando perfil público...
            </CardContent>
          </Card>
        ) : publicPlayerQuery.isError || !player ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Não foi possível carregar o perfil público para {playerTag}.</AlertDescription>
          </Alert>
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
                      <h1 className="text-2xl font-display font-bold">{player.name || "Jogador"}</h1>
                      <Badge variant="outline">{player.tag || playerTag}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {player.arena?.name || "Arena desconhecida"}
                      {player.clan?.name ? ` • ${player.clan.name}` : ""}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 min-w-[230px]">
                  <StatBox label="Troféus" value={String(player.trophies || 0)} icon={<Trophy className="w-4 h-4 text-yellow-500" />} />
                  <StatBox label="Best" value={String(player.bestTrophies || 0)} />
                  <StatBox label="Win Rate" value={`${winRate}%`} className="text-green-500" />
                  <StatBox label="V/D" value={`${player.wins || 0}/${player.losses || 0}`} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle>Histórico recente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {battles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem batalhas recentes disponíveis.</p>
                ) : (
                  battles.slice(0, 10).map((battle: any, index: number) => {
                    const result = getBattleResultLabel(battle);
                    const trophyChange = battle?.team?.[0]?.trophyChange || 0;
                    return (
                      <div key={`${battle?.battleTime || "battle"}-${index}`} className="rounded-lg border border-border/40 p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{result} vs {battle?.opponent?.[0]?.name || "Oponente"}</p>
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
                  <p className="font-medium">Quer análise tática desse jogador?</p>
                  <p className="text-sm text-muted-foreground">Use o Coach IA para comparar padrão de derrota e ajustes.</p>
                </div>
                <Link href="/coach">
                  <Button>
                    <Crown className="w-4 h-4 mr-2" />
                    Abrir Coach
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
