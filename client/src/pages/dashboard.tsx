import React from "react";
import { Link } from "wouter";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Swords, Crown, TrendingUp, Clock, Target, Star, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useProfile } from "@/hooks/useProfile";
import { useClashPlayer, useClashBattles } from "@/hooks/useClashPlayer";
import { useGoals } from "@/hooks/useGoals";
import { useFavorites } from "@/hooks/useFavorites";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const chartData = [
  { date: "Seg", trophies: 5780 },
  { date: "Ter", trophies: 5810 },
  { date: "Qua", trophies: 5795 },
  { date: "Qui", trophies: 5820 },
  { date: "Sex", trophies: 5835 },
  { date: "Sab", trophies: 5800 },
  { date: "Dom", trophies: 5842 },
];

export default function DashboardPage() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: playerData, isLoading: playerLoading, error: playerError } = useClashPlayer((profile as any)?.clashTag);
  const { data: battlesData, isLoading: battlesLoading } = useClashBattles((profile as any)?.clashTag);
  const { data: goals = [], isLoading: goalsLoading } = useGoals();
  const { data: favorites = [], isLoading: favoritesLoading } = useFavorites();

  const isLoading = profileLoading || playerLoading;
  const battles = (battlesData as any) || [];
  const recentBattles = battles.slice(0, 5);

  // Calculate win rate from recent battles
  const calculateWinRate = () => {
    if (!battles.length) return 0;
    const wins = battles.filter((b: any) => 
      b.team?.[0]?.crowns > b.opponent?.[0]?.crowns
    ).length;
    return ((wins / battles.length) * 100).toFixed(1);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Visão geral do seu desempenho na arena</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg shadow-sm">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Carregando...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-muted-foreground">Dados sincronizados agora</span>
              </>
            )}
          </div>
        </div>

        {/* Error State */}
        {playerError && !playerLoading && (
          <Alert data-testid="alert-player-error">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {(profile as any)?.clashTag 
                ? `Não foi possível carregar os dados do jogador ${(profile as any).clashTag}. Verifique se a tag está correta.`
                : 'Configure sua Clash Royale tag no perfil para ver seus dados.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Troféus Atuais" 
            value={isLoading ? "..." : ((playerData as any)?.trophies || 0)} 
            icon={<Trophy className="w-5 h-5 text-primary" />}
            trend={(playerData as any)?.trophies ? `Arena: ${(playerData as any)?.arena?.name || 'N/A'}` : undefined}
            trendUp={true}
          />
          <StatCard 
            title="Melhor Temporada" 
            value={isLoading ? "..." : ((playerData as any)?.bestTrophies || 0)} 
            icon={<Crown className="w-5 h-5 text-yellow-500" />}
            subtext="Recorde Pessoal"
          />
          <StatCard 
            title="Win Rate" 
            value={isLoading ? "..." : `${calculateWinRate()}%`} 
            icon={<TrendingUp className="w-5 h-5 text-green-500" />}
            subtext={`Últimas ${battles.length} batalhas`}
          />
          <StatCard 
            title="Vitórias" 
            value={isLoading ? "..." : ((playerData as any)?.wins || 0)} 
            icon={<Swords className="w-5 h-5 text-blue-500" />}
            subtext={`${(playerData as any)?.losses || 0} derrotas`}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
             {/* Chart Section */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Progresso de Troféus</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorTrophies" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        domain={['dataMin - 50', 'dataMax + 50']}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--popover))', 
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--popover-foreground))'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="trophies" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorTrophies)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Goals Section */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
               <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                     <Target className="w-5 h-5 text-primary" />
                     Metas Ativas
                  </CardTitle>
                  <Link href="/profile">
                    <Button variant="ghost" size="sm" className="h-8 text-xs" data-testid="button-manage-goals">Gerenciar</Button>
                  </Link>
               </CardHeader>
               <CardContent className="space-y-6">
                  {goalsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : (goals as any[]).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhuma meta ativa</p>
                  ) : (
                    (goals as any[]).slice(0, 3).map((goal: any) => (
                      <div key={goal.id} className="space-y-2" data-testid={`goal-${goal.id}`}>
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{goal.title}</span>
                          <span className="text-muted-foreground">{goal.currentValue} / {goal.targetValue}</span>
                        </div>
                        <Progress value={(goal.currentValue / goal.targetValue) * 100} className="h-2" />
                      </div>
                    ))
                  )}
               </CardContent>
            </Card>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-8">
            {/* Recent Battles List */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Últimas Batalhas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {battlesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : recentBattles.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma batalha recente</p>
                ) : (
                  recentBattles.map((battle: any, idx: number) => {
                    const teamCrowns = battle.team?.[0]?.crowns || 0;
                    const opponentCrowns = battle.opponent?.[0]?.crowns || 0;
                    const isWin = teamCrowns > opponentCrowns;
                    const isDraw = teamCrowns === opponentCrowns;
                    const opponentName = battle.opponent?.[0]?.name || 'Oponente';
                    const battleTime = battle.battleTime ? new Date(battle.battleTime) : new Date();

                    return (
                      <div 
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-white/5 transition-colors cursor-pointer interactive-hover"
                        data-testid={`battle-${idx}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded flex items-center justify-center font-bold text-lg border",
                            isWin && !isDraw
                              ? "bg-green-500/10 text-green-500 border-green-500/20" 
                              : isDraw
                              ? "bg-gray-500/10 text-gray-500 border-gray-500/20"
                              : "bg-red-500/10 text-red-500 border-red-500/20"
                          )}>
                            {isWin && !isDraw ? "W" : isDraw ? "D" : "L"}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{opponentName}</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {battleTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm font-bold text-muted-foreground">
                          {teamCrowns}-{opponentCrowns}
                        </div>
                      </div>
                    );
                  })
                )}
                <div className="pt-4 text-center">
                  <Link href="/decks">
                    <button className="text-sm text-primary hover:underline font-medium transition-colors hover:text-primary/80" data-testid="link-view-history">Ver histórico completo</button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Favorite Players */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
               <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                     <Star className="w-5 h-5 text-yellow-500" />
                     Jogadores Favoritos
                  </CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                  {favoritesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : (favorites as any[]).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum jogador favoritado</p>
                  ) : (
                    (favorites as any[]).map((fav: any) => (
                      <div key={fav.id} className="flex items-center justify-between p-3 rounded-lg bg-background/40 hover:bg-background/60 transition-colors cursor-pointer group" data-testid={`favorite-${fav.id}`}>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8 border border-border">
                            <AvatarFallback>{fav.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-bold text-sm">{fav.name}</div>
                            <div className="text-xs text-muted-foreground">{fav.clan || 'Sem clan'}</div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))
                  )}
                  <Link href="/community">
                     <Button variant="ghost" size="sm" className="w-full text-xs mt-2" data-testid="button-explore-community">Explorar Comunidade</Button>
                  </Link>
               </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ title, value, icon, trend, trendUp, subtext }: any) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {icon}
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-2xl font-bold font-display">{value}</div>
          {trend && (
            <p className={cn("text-xs font-medium", trendUp ? "text-green-500" : "text-red-500")}>
              {trend}
            </p>
          )}
          {subtext && (
            <p className="text-xs text-muted-foreground">{subtext}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
