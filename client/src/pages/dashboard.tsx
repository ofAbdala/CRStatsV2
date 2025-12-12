import React from "react";
import { Link } from "wouter";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { mockPlayer, mockBattles, mockGoals, mockFavorites } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Swords, Crown, TrendingUp, Clock, Target, Star, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-muted-foreground">Dados sincronizados agora</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Troféus Atuais" 
            value={mockPlayer.trophies} 
            icon={<Trophy className="w-5 h-5 text-primary" />}
            trend="+42 esta semana"
            trendUp={true}
          />
          <StatCard 
            title="Melhor Temporada" 
            value={mockPlayer.bestTrophies} 
            icon={<Crown className="w-5 h-5 text-yellow-500" />}
            subtext="Recorde Pessoal"
          />
          <StatCard 
            title="Win Rate" 
            value={`${mockPlayer.winRate}%`} 
            icon={<TrendingUp className="w-5 h-5 text-green-500" />}
            trend="+2.1% vs média"
            trendUp={true}
          />
          <StatCard 
            title="Total Batalhas" 
            value="1,254" 
            icon={<Swords className="w-5 h-5 text-blue-500" />}
            subtext="Últimos 30 dias: 142"
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
                  <Button variant="ghost" size="sm" className="h-8 text-xs">Gerenciar</Button>
               </CardHeader>
               <CardContent className="space-y-6">
                  {mockGoals.map((goal) => (
                     <div key={goal.id} className="space-y-2">
                        <div className="flex justify-between text-sm">
                           <span className="font-medium">{goal.title}</span>
                           <span className="text-muted-foreground">{goal.current} / {goal.target}</span>
                        </div>
                        <Progress value={(goal.current / goal.target) * 100} className="h-2" />
                     </div>
                  ))}
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
                {mockBattles.map((battle) => (
                  <div 
                    key={battle.id} 
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-white/5 transition-colors cursor-pointer interactive-hover"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded flex items-center justify-center font-bold text-lg border",
                        battle.result === "victory" 
                          ? "bg-green-500/10 text-green-500 border-green-500/20" 
                          : battle.result === "defeat"
                          ? "bg-red-500/10 text-red-500 border-red-500/20"
                          : "bg-gray-500/10 text-gray-500 border-gray-500/20"
                      )}>
                        {battle.result === "victory" ? "W" : battle.result === "defeat" ? "L" : "D"}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{battle.opponentName}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(battle.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    </div>
                    <div className={cn(
                      "text-sm font-bold",
                      battle.trophyChange > 0 ? "text-green-500" : battle.trophyChange < 0 ? "text-red-500" : "text-muted-foreground"
                    )}>
                      {battle.trophyChange > 0 ? "+" : ""}{battle.trophyChange}
                    </div>
                  </div>
                ))}
                <div className="pt-4 text-center">
                  <Link href="/decks">
                    <button className="text-sm text-primary hover:underline font-medium transition-colors hover:text-primary/80">Ver histórico completo</button>
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
                  {mockFavorites.map((fav) => (
                     <div key={fav.tag} className="flex items-center justify-between p-3 rounded-lg bg-background/40 hover:bg-background/60 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-3">
                           <Avatar className="w-8 h-8 border border-border">
                              <AvatarFallback>{fav.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                           </Avatar>
                           <div>
                              <div className="font-bold text-sm">{fav.name}</div>
                              <div className="text-xs text-muted-foreground">{fav.clan}</div>
                           </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                     </div>
                  ))}
                  <Link href="/community">
                     <Button variant="ghost" size="sm" className="w-full text-xs mt-2">Explorar Comunidade</Button>
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
