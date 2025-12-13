import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Trophy, 
  Crown, 
  TrendingUp, 
  TrendingDown,
  Clock, 
  Target, 
  Swords, 
  Loader2, 
  AlertCircle,
  Flame,
  Shield,
  Zap,
  Award,
  ChevronDown,
  Timer,
  ThumbsUp,
  ThumbsDown,
  Lock,
  Layers
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/useProfile";
import { useClashPlayer, useClashBattles } from "@/hooks/useClashPlayer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
  BarChart,
  Bar,
} from "recharts";
import { formatDistanceToNow, differenceInDays, startOfDay, format, getDay } from "date-fns";
import { useGoals } from "@/hooks/useGoals";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { ptBR } from "date-fns/locale";

type PeriodFilter = 'today' | '7days' | '30days' | 'season';

function parseBattleTime(battleTime: string): Date {
  return new Date(battleTime.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6'));
}

function formatGameMode(type: string | undefined): string {
  if (!type) return 'Batalha';
  const lowerType = type.toLowerCase();
  if (lowerType.includes('ladder') || lowerType.includes('pvp')) return 'Ladder';
  if (lowerType.includes('challenge')) return 'Desafio';
  if (lowerType.includes('tournament')) return 'Torneio';
  if (lowerType.includes('2v2')) return '2v2';
  if (lowerType.includes('war')) return 'Guerra';
  if (lowerType.includes('friendly')) return 'Amistoso';
  if (lowerType.includes('party')) return 'Festa';
  return type.replace(/([A-Z])/g, ' $1').trim();
}

export default function MePage() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const clashTag = (profile as any)?.clashTag;
  const { data: playerData, isLoading: playerLoading, error: playerError } = useClashPlayer(clashTag);
  const { data: battlesData, isLoading: battlesLoading } = useClashBattles(clashTag);
  
  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => api.subscription.get(),
  });

  const { data: goalsData, isLoading: goalsLoading } = useGoals();

  const isPro = (subscription as any)?.plan === 'PRO' || (subscription as any)?.plan === 'pro' || (subscription as any)?.status === 'active';
  const isLoading = profileLoading || playerLoading;
  const battles = (battlesData as any) || [];
  const player = playerData as any;

  const [periodFilter, setPeriodFilter] = React.useState<PeriodFilter>('7days');

  const filteredBattles = React.useMemo(() => {
    if (!battles.length) return [];
    
    const now = new Date();
    const todayStart = startOfDay(now);
    
    return battles.filter((battle: any) => {
      if (!battle.battleTime) return false;
      const battleDate = parseBattleTime(battle.battleTime);
      const daysDiff = differenceInDays(now, battleDate);
      
      switch (periodFilter) {
        case 'today':
          return battleDate >= todayStart;
        case '7days':
          return daysDiff <= 7;
        case '30days':
          return daysDiff <= 30;
        case 'season':
          return daysDiff <= 35;
        default:
          return true;
      }
    });
  }, [battles, periodFilter]);

  const recentSeriesStats = React.useMemo(() => {
    const recent = filteredBattles.slice(0, 10);
    let wins = 0;
    let losses = 0;
    
    recent.forEach((battle: any) => {
      const teamCrowns = battle.team?.[0]?.crowns || 0;
      const opponentCrowns = battle.opponent?.[0]?.crowns || 0;
      if (teamCrowns > opponentCrowns) wins++;
      else if (teamCrowns < opponentCrowns) losses++;
    });
    
    const total = wins + losses;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    
    return { wins, losses, total: recent.length, winRate };
  }, [filteredBattles]);

  const stats = React.useMemo(() => {
    if (!battles.length) {
      return {
        winRate: 0,
        totalMatches: 0,
        streak: { type: 'none', count: 0 },
        lastPlayed: null,
        ladderStats: { wins: 0, losses: 0, matches: 0, winRate: 0 },
        challengeStats: { wins: 0, losses: 0, matches: 0, winRate: 0 },
      };
    }

    let wins = 0;
    let losses = 0;
    let streakType: 'win' | 'loss' | 'none' = 'none';
    let streakCount = 0;
    let ladderWins = 0, ladderLosses = 0;
    let challengeWins = 0, challengeLosses = 0;

    battles.forEach((b: any, idx: number) => {
      const teamCrowns = b.team?.[0]?.crowns || 0;
      const opponentCrowns = b.opponent?.[0]?.crowns || 0;
      const isWin = teamCrowns > opponentCrowns;
      const isLoss = teamCrowns < opponentCrowns;
      
      if (isWin) wins++;
      else if (isLoss) losses++;

      if (idx === 0) {
        streakType = isWin ? 'win' : isLoss ? 'loss' : 'none';
        streakCount = 1;
      } else if ((streakType === 'win' && isWin) || (streakType === 'loss' && isLoss)) {
        streakCount++;
      } else {
        streakType = isWin ? 'win' : isLoss ? 'loss' : 'none';
        streakCount = 1;
      }

      const battleType = b.type?.toLowerCase() || '';
      if (battleType.includes('ladder') || battleType.includes('pvp')) {
        if (isWin) ladderWins++;
        else if (isLoss) ladderLosses++;
      }
      if (battleType.includes('challenge') || battleType.includes('tournament')) {
        if (isWin) challengeWins++;
        else if (isLoss) challengeLosses++;
      }
    });

    const totalMatches = wins + losses;
    const winRate = totalMatches > 0 ? ((wins / totalMatches) * 100) : 0;
    
    const lastBattle = battles[0];
    const lastPlayed = lastBattle?.battleTime 
      ? formatDistanceToNow(new Date(lastBattle.battleTime.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6')), { addSuffix: true, locale: ptBR })
      : null;

    const ladderMatches = ladderWins + ladderLosses;
    const challengeMatches = challengeWins + challengeLosses;

    return {
      winRate: winRate.toFixed(1),
      wins,
      losses,
      totalMatches,
      streak: { type: streakType, count: streakCount },
      lastPlayed,
      ladderStats: { 
        wins: ladderWins, 
        losses: ladderLosses, 
        matches: ladderMatches,
        winRate: ladderMatches > 0 ? ((ladderWins / ladderMatches) * 100).toFixed(1) : 0
      },
      challengeStats: { 
        wins: challengeWins, 
        losses: challengeLosses, 
        matches: challengeMatches,
        winRate: challengeMatches > 0 ? ((challengeWins / challengeMatches) * 100).toFixed(1) : 0
      },
    };
  }, [battles]);

  const tiltStatus = React.useMemo(() => {
    if (stats.streak.type === 'loss' && stats.streak.count >= 3) {
      return { label: 'Em risco de tilt', variant: 'destructive' as const };
    }
    if (stats.streak.type === 'win' && stats.streak.count >= 3) {
      return { label: 'Em alta!', variant: 'default' as const };
    }
    return { label: 'Consistente', variant: 'secondary' as const };
  }, [stats.streak]);

  const chartData = React.useMemo(() => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (6 - i));
      const baseTrophies = player?.trophies || 5000;
      const variation = Math.floor(Math.random() * 100) - 50;
      return {
        date: days[date.getDay()],
        trophies: Math.max(0, baseTrophies + variation * (i - 3)),
      };
    });
  }, [player?.trophies]);

  const deckUsage = React.useMemo(() => {
    if (!battles.length) return [];
    
    const deckMap: Record<string, { cards: any[]; wins: number; losses: number; total: number }> = {};
    
    battles.forEach((battle: any) => {
      const cards = battle.team?.[0]?.cards;
      if (!cards || cards.length === 0) return;
      
      const deckKey = cards.map((c: any) => c.id).sort().join('-');
      
      if (!deckMap[deckKey]) {
        deckMap[deckKey] = { cards, wins: 0, losses: 0, total: 0 };
      }
      
      const teamCrowns = battle.team?.[0]?.crowns || 0;
      const opponentCrowns = battle.opponent?.[0]?.crowns || 0;
      const isWin = teamCrowns > opponentCrowns;
      
      deckMap[deckKey].total++;
      if (isWin) deckMap[deckKey].wins++;
      else deckMap[deckKey].losses++;
    });
    
    return Object.values(deckMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map((deck, idx) => ({
        ...deck,
        name: idx === 0 ? 'Deck Principal' : idx === 1 ? 'Deck Secundário' : `Deck ${idx + 1}`,
        winRate: deck.total > 0 ? Math.round((deck.wins / deck.total) * 100) : 0,
      }));
  }, [battles]);

  const archetypeAnalysis = React.useMemo(() => {
    if (!battles.length) {
      return {
        strengths: [],
        weaknesses: [],
      };
    }

    const beatdownCards = ['golem', 'giant', 'lavahound', 'elixir golem', 'royal giant'];
    const cycleCards = ['skeletons', 'ice spirit', 'electro spirit', 'fire spirit', 'log', 'zap'];
    const controlCards = ['tornado', 'rocket', 'lightning', 'x-bow', 'mortar', 'inferno tower'];
    const airCards = ['balloon', 'lavahound', 'minions', 'mega minion', 'baby dragon', 'inferno dragon'];

    const archetypeStats: Record<string, { wins: number; losses: number }> = {
      'Beatdown': { wins: 0, losses: 0 },
      'Ciclo': { wins: 0, losses: 0 },
      'Controle': { wins: 0, losses: 0 },
      'Aéreo': { wins: 0, losses: 0 },
    };

    battles.forEach((battle: any) => {
      const opponentCards = battle.opponent?.[0]?.cards || [];
      const cardNames = opponentCards.map((c: any) => (c.name || '').toLowerCase());
      
      const teamCrowns = battle.team?.[0]?.crowns || 0;
      const opponentCrowns = battle.opponent?.[0]?.crowns || 0;
      const isWin = teamCrowns > opponentCrowns;
      
      if (cardNames.some((name: string) => beatdownCards.some(bc => name.includes(bc)))) {
        if (isWin) archetypeStats['Beatdown'].wins++;
        else archetypeStats['Beatdown'].losses++;
      }
      if (cardNames.filter((name: string) => cycleCards.some(cc => name.includes(cc))).length >= 2) {
        if (isWin) archetypeStats['Ciclo'].wins++;
        else archetypeStats['Ciclo'].losses++;
      }
      if (cardNames.some((name: string) => controlCards.some(cc => name.includes(cc)))) {
        if (isWin) archetypeStats['Controle'].wins++;
        else archetypeStats['Controle'].losses++;
      }
      if (cardNames.filter((name: string) => airCards.some(ac => name.includes(ac))).length >= 2) {
        if (isWin) archetypeStats['Aéreo'].wins++;
        else archetypeStats['Aéreo'].losses++;
      }
    });

    const strengths: { archetype: string; winRate: number; matches: number }[] = [];
    const weaknesses: { archetype: string; winRate: number; matches: number }[] = [];

    Object.entries(archetypeStats).forEach(([archetype, stats]) => {
      const total = stats.wins + stats.losses;
      if (total < 3) return;
      
      const winRate = Math.round((stats.wins / total) * 100);
      const entry = { archetype, winRate, matches: total };
      
      if (winRate >= 55) {
        strengths.push(entry);
      } else if (winRate <= 45) {
        weaknesses.push(entry);
      }
    });

    strengths.sort((a, b) => b.winRate - a.winRate);
    weaknesses.sort((a, b) => a.winRate - b.winRate);

    return { strengths, weaknesses };
  }, [battles]);

  const trophyEvolutionData = React.useMemo(() => {
    if (!battles.length || !player?.trophies) {
      return null;
    }

    const battlesWithTrophyChange = battles.filter((battle: any) => 
      battle.battleTime && typeof battle.team?.[0]?.trophyChange === 'number'
    );

    if (battlesWithTrophyChange.length === 0) {
      return null;
    }

    const dataByDate: Record<string, { trophiesAtEnd: number; totalChange: number }> = {};
    let runningTrophies = player.trophies;

    battlesWithTrophyChange.forEach((battle: any) => {
      const battleDate = parseBattleTime(battle.battleTime);
      const dateKey = format(battleDate, 'yyyy-MM-dd');
      const trophyChange = battle.team[0].trophyChange;
      
      if (!dataByDate[dateKey]) {
        dataByDate[dateKey] = { trophiesAtEnd: runningTrophies, totalChange: 0 };
      }
      dataByDate[dateKey].totalChange += trophyChange;
      runningTrophies -= trophyChange;
    });

    const sortedDates = Object.keys(dataByDate).sort();
    
    if (sortedDates.length === 0) {
      return null;
    }

    let trophiesAtEndOfDay = player.trophies;
    
    return sortedDates.slice(-14).map(dateKey => {
      const data = dataByDate[dateKey];
      const result = {
        date: format(new Date(dateKey), 'dd/MM', { locale: ptBR }),
        fullDate: format(new Date(dateKey), 'dd/MM/yyyy', { locale: ptBR }),
        trophies: trophiesAtEndOfDay,
        change: data.totalChange,
      };
      trophiesAtEndOfDay -= data.totalChange;
      return result;
    }).reverse();
  }, [battles, player?.trophies]);

  const playVolumeData = React.useMemo(() => {
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const matchesByDay: Record<string, number> = {};
    const matchesByDayOfWeek: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const matchesByHour: Record<number, number> = {};

    const last14Days: { date: string; fullDate: string; matches: number; dayName: string }[] = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = format(date, 'yyyy-MM-dd');
      matchesByDay[dateKey] = 0;
      last14Days.push({
        date: format(date, 'dd/MM', { locale: ptBR }),
        fullDate: dateKey,
        matches: 0,
        dayName: dayNames[getDay(date)],
      });
    }

    battles.forEach((battle: any) => {
      if (!battle.battleTime) return;
      const battleDate = parseBattleTime(battle.battleTime);
      const dateKey = format(battleDate, 'yyyy-MM-dd');
      const dayOfWeek = getDay(battleDate);
      const hour = battleDate.getHours();

      if (matchesByDay[dateKey] !== undefined) {
        matchesByDay[dateKey]++;
      }
      matchesByDayOfWeek[dayOfWeek]++;
      matchesByHour[hour] = (matchesByHour[hour] || 0) + 1;
    });

    last14Days.forEach(day => {
      day.matches = matchesByDay[day.fullDate] || 0;
    });

    const totalMatchesLast14 = Object.values(matchesByDay).reduce((a, b) => a + b, 0);
    const avgMatchesPerDay = totalMatchesLast14 > 0 ? (totalMatchesLast14 / 14).toFixed(1) : 0;

    const mostActiveDay = Object.entries(matchesByDayOfWeek).reduce((max, [day, count]) => 
      count > max.count ? { day: parseInt(day), count } : max, { day: 0, count: 0 });

    const peakHour = Object.entries(matchesByHour).reduce((max, [hour, count]) => 
      count > max.count ? { hour: parseInt(hour), count } : max, { hour: 12, count: 0 });

    return {
      chartData: last14Days,
      avgMatchesPerDay,
      mostActiveDay: dayNames[mostActiveDay.day],
      mostActiveDayCount: mostActiveDay.count,
      peakHour: `${peakHour.hour.toString().padStart(2, '0')}:00`,
      peakHourCount: peakHour.count,
      totalMatches: totalMatchesLast14,
    };
  }, [battles]);

  const activeGoals = React.useMemo(() => {
    if (!goalsData || !Array.isArray(goalsData)) return [];
    return (goalsData as any[]).filter((goal: any) => goal.status === 'active' || !goal.status).slice(0, 4);
  }, [goalsData]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando perfil...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {playerError && !playerLoading && (
          <Alert data-testid="alert-player-error">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {clashTag 
                ? `Não foi possível carregar os dados do jogador ${clashTag}. Verifique se a tag está correta.`
                : 'Configure sua Clash Royale tag no perfil para ver seus dados.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Hero Header Section */}
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card/95 to-primary/5 backdrop-blur-sm">
          <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)]" />
          <div className="relative p-6 md:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Left: Player Info */}
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                    <Swords className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h1 
                      className="text-2xl md:text-3xl font-display font-bold text-foreground"
                      data-testid="header-player-name"
                    >
                      {player?.name || 'Jogador'}
                    </h1>
                    <p 
                      className="text-muted-foreground font-mono text-sm"
                      data-testid="header-player-tag"
                    >
                      {clashTag || '#XXXXXXXX'}
                    </p>
                  </div>
                </div>

                {player?.clan && (
                  <div className="flex items-center gap-2 mb-4">
                    <Crown className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm text-muted-foreground">
                      {player.clan.name}
                    </span>
                    {player.clan.badgeId && (
                      <img 
                        src={`https://cdn.royaleapi.com/static/img/badge/${player.clan.badgeId}.png`}
                        alt="Clan Badge"
                        className="w-5 h-5"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                  </div>
                )}

                {/* Summary Chips */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-background/50" data-testid="stat-winrate">
                    <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
                    {stats.winRate}% Win Rate
                  </Badge>
                  <Badge variant="outline" className="bg-background/50">
                    <Swords className="w-3 h-3 mr-1" />
                    {stats.totalMatches} partidas
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "bg-background/50",
                      stats.streak.type === 'win' && "border-green-500/50 text-green-500",
                      stats.streak.type === 'loss' && "border-red-500/50 text-red-500"
                    )}
                    data-testid="stat-streak"
                  >
                    <Flame className="w-3 h-3 mr-1" />
                    {stats.streak.count > 0 
                      ? `${stats.streak.count} ${stats.streak.type === 'win' ? 'vitórias' : 'derrotas'} seguidas`
                      : 'Sem sequência'}
                  </Badge>
                  {stats.lastPlayed && (
                    <Badge variant="outline" className="bg-background/50">
                      <Clock className="w-3 h-3 mr-1" />
                      Jogou {stats.lastPlayed}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Right: Arena & Trophies */}
              <div 
                className="flex items-center gap-4 p-4 rounded-xl bg-background/50 border border-border/50"
                data-testid="header-arena"
              >
                {player?.arena?.id && (
                  <img 
                    src={`https://cdn.royaleapi.com/static/img/arenas/arena${player.arena.id}.png`}
                    alt={player.arena.name}
                    className="w-16 h-16 md:w-20 md:h-20 object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                  />
                )}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    {player?.arena?.name || 'Arena'}
                  </p>
                  <div 
                    className="text-3xl md:text-4xl font-display font-bold text-primary flex items-center gap-2"
                    data-testid="header-trophies"
                  >
                    <Trophy className="w-6 h-6 md:w-8 md:h-8" />
                    {player?.trophies?.toLocaleString() || 0}
                  </div>
                  <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Award className="w-3 h-3 text-yellow-500" />
                      Melhor: {player?.bestTrophies?.toLocaleString() || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto bg-card/50 border border-border/50 p-1 h-auto flex-wrap md:flex-nowrap">
            <TabsTrigger value="overview" data-testid="tab-overview" className="flex-1 min-w-[100px]">
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history" className="flex-1 min-w-[100px]">
              Histórico
            </TabsTrigger>
            <TabsTrigger value="decks" data-testid="tab-decks" className="flex-1 min-w-[100px]">
              Decks & Meta
            </TabsTrigger>
            <TabsTrigger value="progress" data-testid="tab-progress" className="flex-1 min-w-[100px]">
              Progresso
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Season Summary */}
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Trophy className="w-4 h-4 text-primary" />
                    Resumo da Temporada
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Troféus Atuais</span>
                    <span className="font-bold text-primary">{player?.trophies?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Melhor Temporada</span>
                    <span className="font-bold text-yellow-500">{player?.bestTrophies?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Win Rate</span>
                    <span className="font-bold text-green-500">{stats.winRate}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Partidas</span>
                    <span className="font-bold">{stats.totalMatches}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Performance */}
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="w-4 h-4 text-primary" />
                    Performance Recente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Últimas {battles.length} batalhas</span>
                    <span className="font-bold">{stats.winRate}% WR</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Sequência Atual</span>
                    <span className={cn(
                      "font-bold",
                      stats.streak.type === 'win' && "text-green-500",
                      stats.streak.type === 'loss' && "text-red-500"
                    )}>
                      {stats.streak.count > 0 
                        ? `${stats.streak.count}${stats.streak.type === 'win' ? 'W' : 'L'}`
                        : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={tiltStatus.variant}>{tiltStatus.label}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">V/D</span>
                    <span className="font-bold">
                      <span className="text-green-500">{stats.wins}</span>
                      {' / '}
                      <span className="text-red-500">{stats.losses}</span>
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* PRO Status */}
              <Card className={cn(
                "border-border/50 backdrop-blur-sm",
                isPro 
                  ? "bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30"
                  : "bg-card/50"
              )}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Crown className={cn("w-4 h-4", isPro ? "text-yellow-500" : "text-muted-foreground")} />
                    Status da Conta
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Plano</span>
                    <Badge variant={isPro ? "default" : "secondary"}>
                      {isPro ? 'PRO' : 'Free'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total de Vitórias</span>
                    <span className="font-bold">{player?.wins?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Cartas Coletadas</span>
                    <span className="font-bold">{player?.cards?.length || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Trophy Chart */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Progressão de Troféus
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorTrophiesMe" x1="0" y1="0" x2="0" y2="1">
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
                        fill="url(#colorTrophiesMe)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Game Mode Stats */}
            <div className="grid md:grid-cols-2 gap-6">
              <GameModeCard 
                title="Ladder / Ranqueada"
                icon={<Shield className="w-5 h-5" />}
                stats={stats.ladderStats}
                color="primary"
              />
              <GameModeCard 
                title="Desafios"
                icon={<Zap className="w-5 h-5" />}
                stats={stats.challengeStats}
                color="yellow"
              />
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-6 space-y-4">
            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={periodFilter === 'today' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriodFilter('today')}
                data-testid="filter-today"
              >
                Hoje
              </Button>
              <Button
                variant={periodFilter === '7days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriodFilter('7days')}
                data-testid="filter-7days"
              >
                7 dias
              </Button>
              <Button
                variant={periodFilter === '30days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriodFilter('30days')}
                data-testid="filter-30days"
              >
                30 dias
              </Button>
              <Button
                variant={periodFilter === 'season' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriodFilter('season')}
                data-testid="filter-season"
              >
                Temporada
              </Button>
            </div>

            {/* Summary */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="py-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    <span className="font-medium">
                      Últimas {recentSeriesStats.total} partidas:{' '}
                      <span className="text-green-500">{recentSeriesStats.wins}V</span>
                      {' / '}
                      <span className="text-red-500">{recentSeriesStats.losses}D</span>
                      {' '}
                      <span className="text-muted-foreground">({recentSeriesStats.winRate}% winrate)</span>
                    </span>
                  </div>
                  <Badge variant="outline">{filteredBattles.length} batalhas</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Match List */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Histórico de Batalhas</CardTitle>
              </CardHeader>
              <CardContent>
                {battlesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : filteredBattles.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhuma batalha encontrada neste período</p>
                ) : (
                  <Accordion type="single" collapsible className="space-y-2">
                    {filteredBattles.slice(0, 25).map((battle: any, idx: number) => {
                      const teamCrowns = battle.team?.[0]?.crowns || 0;
                      const opponentCrowns = battle.opponent?.[0]?.crowns || 0;
                      const isWin = teamCrowns > opponentCrowns;
                      const isDraw = teamCrowns === opponentCrowns;
                      const trophyChange = battle.team?.[0]?.trophyChange;
                      const battleTime = battle.battleTime ? parseBattleTime(battle.battleTime) : null;
                      const playerCards = battle.team?.[0]?.cards || [];
                      const opponentCards = battle.opponent?.[0]?.cards || [];
                      const opponent = battle.opponent?.[0];
                      const gameMode = formatGameMode(battle.type);
                      
                      return (
                        <AccordionItem 
                          key={idx} 
                          value={`match-${idx}`}
                          className={cn(
                            "border rounded-lg overflow-hidden transition-colors",
                            isWin && !isDraw 
                              ? "bg-green-500/5 border-green-500/20 hover:bg-green-500/10" 
                              : isDraw 
                              ? "bg-muted/50 border-border/50 hover:bg-muted/70"
                              : "bg-red-500/5 border-red-500/20 hover:bg-red-500/10"
                          )}
                          data-testid={`match-row-${idx}`}
                        >
                          <AccordionTrigger className="px-4 py-3 hover:no-underline">
                            <div className="flex items-center justify-between w-full pr-4">
                              {/* Left side - Result & Info */}
                              <div className="flex items-center gap-3">
                                <Badge 
                                  variant={isWin && !isDraw ? "default" : isDraw ? "secondary" : "destructive"}
                                  className={cn(
                                    "min-w-[70px] justify-center",
                                    isWin && !isDraw && "bg-green-600 hover:bg-green-700"
                                  )}
                                >
                                  {isWin && !isDraw ? "Vitória" : isDraw ? "Empate" : "Derrota"}
                                </Badge>
                                
                                {/* Desktop info */}
                                <div className="hidden md:flex items-center gap-4">
                                  <div className="flex items-center gap-1">
                                    <Crown className="w-4 h-4 text-yellow-500" />
                                    <span className="font-bold">{teamCrowns} × {opponentCrowns}</span>
                                  </div>
                                  
                                  <Badge variant="outline" className="font-normal">
                                    {gameMode}
                                  </Badge>
                                  
                                  {trophyChange !== undefined && trophyChange !== null && (
                                    <span className={cn(
                                      "font-medium text-sm flex items-center gap-1",
                                      trophyChange > 0 ? "text-green-500" : trophyChange < 0 ? "text-red-500" : "text-muted-foreground"
                                    )}>
                                      {trophyChange > 0 ? <TrendingUp className="w-3 h-3" /> : trophyChange < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                                      {trophyChange > 0 ? '+' : ''}{trophyChange}
                                    </span>
                                  )}
                                  
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium">{opponent?.name || 'Oponente'}</span>
                                    {opponent?.tag && (
                                      <span className="text-xs text-muted-foreground font-mono">{opponent.tag}</span>
                                    )}
                                  </div>
                                </div>

                                {/* Mobile info */}
                                <div className="flex md:hidden flex-col">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold">{teamCrowns} × {opponentCrowns}</span>
                                    {trophyChange !== undefined && trophyChange !== null && (
                                      <span className={cn(
                                        "text-xs font-medium",
                                        trophyChange > 0 ? "text-green-500" : trophyChange < 0 ? "text-red-500" : "text-muted-foreground"
                                      )}>
                                        ({trophyChange > 0 ? '+' : ''}{trophyChange})
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground">vs {opponent?.name || 'Oponente'}</span>
                                </div>
                              </div>

                              {/* Right side - Time */}
                              <div className="text-right text-xs text-muted-foreground hidden sm:block">
                                {battleTime && (
                                  <span>{formatDistanceToNow(battleTime, { addSuffix: true, locale: ptBR })}</span>
                                )}
                              </div>
                            </div>
                          </AccordionTrigger>
                          
                          <AccordionContent data-testid={`match-details-${idx}`}>
                            <div className="px-4 pb-4 pt-2 space-y-4">
                              {/* Battle Time on Mobile */}
                              <div className="sm:hidden text-xs text-muted-foreground">
                                {battleTime && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatDistanceToNow(battleTime, { addSuffix: true, locale: ptBR })}
                                  </div>
                                )}
                              </div>

                              {/* Match Info Summary */}
                              <div className="flex flex-wrap gap-3 text-sm">
                                <Badge variant="outline">{gameMode}</Badge>
                                {opponent?.tag && (
                                  <span className="text-muted-foreground">
                                    Oponente: <span className="font-mono">{opponent.tag}</span>
                                  </span>
                                )}
                                {battle.deckSelection && (
                                  <span className="text-muted-foreground">
                                    Seleção: {battle.deckSelection}
                                  </span>
                                )}
                              </div>
                              
                              {/* Player Deck */}
                              {playerCards.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                    <Swords className="w-4 h-4 text-primary" />
                                    Seu Deck
                                  </h4>
                                  <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5">
                                    {playerCards.map((card: any, cardIdx: number) => (
                                      <div key={card?.id || cardIdx} className="flex flex-col items-center">
                                        <img
                                          src={card?.iconUrls?.medium || ''}
                                          alt={card?.name || 'Card'}
                                          className="w-12 h-14 md:w-14 md:h-16 object-contain rounded bg-background/50"
                                          onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                                        />
                                        <span className="text-[10px] text-muted-foreground mt-0.5 text-center truncate w-full">
                                          {card?.name}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Opponent Deck */}
                              {opponentCards.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-red-500" />
                                    Deck do Oponente
                                  </h4>
                                  <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5">
                                    {opponentCards.map((card: any, cardIdx: number) => (
                                      <div key={card?.id || cardIdx} className="flex flex-col items-center">
                                        <img
                                          src={card?.iconUrls?.medium || ''}
                                          alt={card?.name || 'Card'}
                                          className="w-12 h-14 md:w-14 md:h-16 object-contain rounded bg-background/50"
                                          onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                                        />
                                        <span className="text-[10px] text-muted-foreground mt-0.5 text-center truncate w-full">
                                          {card?.name}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Decks Tab */}
          <TabsContent value="decks" className="mt-6 space-y-6">
            {/* Current Deck - Prominent Display */}
            <Card 
              className="border-border/50 bg-gradient-to-br from-card via-card/95 to-primary/5 backdrop-blur-sm"
              data-testid="deck-current"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  Deck Atual
                </CardTitle>
              </CardHeader>
              <CardContent>
                {player?.currentDeck?.length > 0 ? (
                  <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                    {player.currentDeck.map((card: any, idx: number) => (
                      <div key={card?.id || idx} className="flex flex-col items-center">
                        <img
                          src={card?.iconUrls?.medium || ''}
                          alt={card?.name || 'Card'}
                          className="w-14 h-16 md:w-16 md:h-20 object-contain rounded bg-background/30"
                          onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                        />
                        <span className="text-[10px] md:text-xs text-muted-foreground mt-1 text-center truncate w-full">
                          {card?.name}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Nenhum deck equipado</p>
                )}
              </CardContent>
            </Card>

            {/* Most Used Decks */}
            <div>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Swords className="w-5 h-5 text-primary" />
                Decks Mais Usados
              </h3>
              {deckUsage.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {deckUsage.map((deck, idx) => (
                    <Card 
                      key={idx}
                      className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-colors"
                      data-testid={`deck-most-used-${idx}`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{deck.name}</CardTitle>
                          <Badge 
                            variant="outline"
                            className={cn(
                              deck.winRate >= 50 
                                ? "border-green-500/50 text-green-500" 
                                : "border-red-500/50 text-red-500"
                            )}
                          >
                            <Trophy className="w-3 h-3 mr-1" />
                            {deck.winRate}%
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-4 gap-1">
                          {deck.cards.slice(0, 8).map((card: any, cardIdx: number) => (
                            <img
                              key={card?.id || cardIdx}
                              src={card?.iconUrls?.medium || ''}
                              alt={card?.name || 'Card'}
                              className="w-10 h-12 object-contain rounded bg-background/30"
                              onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                            />
                          ))}
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Swords className="w-3 h-3" />
                            {deck.total} partidas
                          </span>
                          <span>
                            <span className="text-green-500">{deck.wins}V</span>
                            {' / '}
                            <span className="text-red-500">{deck.losses}D</span>
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    {battlesLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analisando batalhas...
                      </div>
                    ) : (
                      'Nenhuma batalha encontrada para analisar decks'
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Strengths */}
              <Card 
                className="border-border/50 bg-card/50 backdrop-blur-sm"
                data-testid="analysis-strengths"
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ThumbsUp className="w-5 h-5 text-green-500" />
                    Forças
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {archetypeAnalysis.strengths.length > 0 ? (
                    archetypeAnalysis.strengths.map((strength, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20"
                      >
                        <div>
                          <p className="font-medium text-green-500">Bom contra: {strength.archetype}</p>
                          <p className="text-xs text-muted-foreground">{strength.matches} partidas</p>
                        </div>
                        <Badge variant="outline" className="border-green-500/50 text-green-500">
                          {strength.winRate}% WR
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="relative">
                      <div className={cn(
                        "p-3 rounded-lg bg-muted/50 border border-border/50",
                        !isPro && "blur-sm"
                      )}>
                        <p className="font-medium text-green-500">Bom contra: Decks de ciclo</p>
                        <p className="text-xs text-muted-foreground">Análise baseada em batalhas</p>
                      </div>
                      {!isPro && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Badge variant="outline" className="bg-background/80 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            PRO
                          </Badge>
                        </div>
                      )}
                    </div>
                  )}
                  {archetypeAnalysis.strengths.length === 0 && isPro && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      Jogue mais partidas para ver suas forças
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Weaknesses */}
              <Card 
                className="border-border/50 bg-card/50 backdrop-blur-sm"
                data-testid="analysis-weaknesses"
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ThumbsDown className="w-5 h-5 text-red-500" />
                    Fraquezas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {archetypeAnalysis.weaknesses.length > 0 ? (
                    archetypeAnalysis.weaknesses.map((weakness, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                      >
                        <div>
                          <p className="font-medium text-red-500">Dificuldade contra: {weakness.archetype}</p>
                          <p className="text-xs text-muted-foreground">{weakness.matches} partidas</p>
                        </div>
                        <Badge variant="outline" className="border-red-500/50 text-red-500">
                          {weakness.winRate}% WR
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="relative">
                      <div className={cn(
                        "p-3 rounded-lg bg-muted/50 border border-border/50",
                        !isPro && "blur-sm"
                      )}>
                        <p className="font-medium text-red-500">Dificuldade contra: Beatdown</p>
                        <p className="text-xs text-muted-foreground">Análise baseada em batalhas</p>
                      </div>
                      {!isPro && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Badge variant="outline" className="bg-background/80 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            PRO
                          </Badge>
                        </div>
                      )}
                    </div>
                  )}
                  {archetypeAnalysis.weaknesses.length === 0 && isPro && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      Jogue mais partidas para ver suas fraquezas
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="mt-6 space-y-6">
            {/* Trophy Evolution Chart */}
            {trophyEvolutionData && trophyEvolutionData.length > 0 ? (
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm" data-testid="chart-trophy-evolution">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Evolução de Troféus
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trophyEvolutionData}>
                        <defs>
                          <linearGradient id="colorTrophiesProgress" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis 
                          dataKey="date" 
                          stroke="hsl(var(--muted-foreground))" 
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))" 
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          domain={['dataMin - 100', 'dataMax + 100']}
                          tickFormatter={(value) => value.toLocaleString()}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--popover))', 
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--popover-foreground))'
                          }}
                          formatter={(value: number, name: string) => [
                            value.toLocaleString(), 
                            name === 'trophies' ? 'Troféus' : name
                          ]}
                          labelFormatter={(label) => `Data: ${label}`}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="trophies" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorTrophiesProgress)" 
                          dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-4 justify-center text-sm">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground">Atual:</span>
                      <span className="font-bold text-primary">{player?.trophies?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-yellow-500" />
                      <span className="text-muted-foreground">Melhor:</span>
                      <span className="font-bold text-yellow-500">{player?.bestTrophies?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm" data-testid="empty-trophy-data">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Evolução de Troféus
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Trophy className="w-12 h-12 text-muted-foreground/50 mb-4" />
                    <p className="text-lg font-medium text-muted-foreground mb-2">
                      Sem dados de evolução disponíveis
                    </p>
                    <p className="text-sm text-muted-foreground/70">
                      {battles.length === 0 
                        ? "Jogue mais partidas para ver seu progresso"
                        : "Suas batalhas recentes não possuem dados de troféus"}
                    </p>
                    {player?.trophies && (
                      <div className="mt-6 flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-primary" />
                        <span className="text-muted-foreground">Troféus atuais:</span>
                        <span className="font-bold text-primary">{player.trophies.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Play Volume Section */}
            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-border/50 bg-card/50 backdrop-blur-sm" data-testid="chart-play-volume">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Swords className="w-5 h-5 text-primary" />
                    Volume de Jogo (14 dias)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={playVolumeData.chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis 
                          dataKey="date" 
                          stroke="hsl(var(--muted-foreground))" 
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))" 
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--popover))', 
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--popover-foreground))'
                          }}
                          formatter={(value: number) => [`${value} partidas`, 'Partidas']}
                          labelFormatter={(label) => `Data: ${label}`}
                        />
                        <Bar 
                          dataKey="matches" 
                          fill="hsl(var(--primary))" 
                          radius={[4, 4, 0, 0]}
                          maxBarSize={40}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Play Stats Cards */}
              <div className="flex flex-col gap-4">
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm flex-1">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/20">
                      <Swords className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Média por Dia</p>
                      <p className="text-2xl font-bold">{playVolumeData.avgMatchesPerDay}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm flex-1">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-green-500/20">
                      <Flame className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Dia Mais Ativo</p>
                      <p className="text-xl font-bold">{playVolumeData.mostActiveDay}</p>
                      <p className="text-xs text-muted-foreground">{playVolumeData.mostActiveDayCount} partidas</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm flex-1">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-yellow-500/20">
                      <Clock className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Horário de Pico</p>
                      <p className="text-xl font-bold">{playVolumeData.peakHour}</p>
                      <p className="text-xs text-muted-foreground">{playVolumeData.peakHourCount} partidas</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Goals Section */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Metas Ativas
                </CardTitle>
                <Link href="/profile">
                  <Button variant="outline" size="sm" data-testid="link-manage-goals">
                    Gerenciar Metas
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {goalsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : activeGoals.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    {activeGoals.map((goal: any) => {
                      const progressValue = goal.targetValue > 0 
                        ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100))
                        : 0;
                      return (
                        <div 
                          key={goal.id}
                          className="p-4 rounded-lg bg-background/50 border border-border/50"
                          data-testid={`goal-card-${goal.id}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-sm">{goal.title || goal.name}</h4>
                            <Badge variant="outline" className={cn(
                              progressValue >= 100 
                                ? "border-green-500/50 text-green-500" 
                                : "border-primary/50 text-primary"
                            )}>
                              {progressValue}%
                            </Badge>
                          </div>
                          <Progress value={progressValue} className="h-2 mb-2" />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Atual: {goal.currentValue || 0}</span>
                            <span>Meta: {goal.targetValue || 0}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="mb-2">Nenhuma meta ativa</p>
                    <Link href="/profile">
                      <Button variant="outline" size="sm">
                        Criar Meta
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Achievements/Stats Summary */}
            <div className="grid md:grid-cols-2 gap-6" data-testid="stats-summary">
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Award className="w-5 h-5 text-yellow-500" />
                    Conquistas Gerais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <StatRow label="Nível do Rei" value={player?.expLevel || 0} />
                  <StatRow label="Total de Vitórias" value={player?.wins?.toLocaleString() || 0} />
                  <StatRow label="Total de Derrotas" value={player?.losses?.toLocaleString() || 0} />
                  <StatRow label="Vitórias em 3 Coroas" value={player?.threeCrownWins?.toLocaleString() || 0} />
                  <StatRow label="Máximo de Desafio" value={player?.challengeMaxWins || 0} />
                  <StatRow label="Cartas Encontradas" value={player?.cards?.length || 0} />
                </CardContent>
              </Card>
              
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    Conquistas de Clã
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <StatRow label="Doações Totais" value={player?.totalDonations?.toLocaleString() || 0} />
                  <StatRow label="Doações Recebidas" value={player?.clanCardsCollected?.toLocaleString() || 0} />
                  <StatRow label="Guerras de Clã" value={player?.warDayWins || 0} />
                  <StatRow label="Contribuição de Clã" value={player?.clanContributionPoints?.toLocaleString() || 0} />
                </CardContent>
              </Card>
            </div>

            {/* PRO Feature Placeholder */}
            <Card 
              className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden"
              data-testid="pro-locked-section"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Análises Avançadas
                  {!isPro && (
                    <Badge variant="outline" className="ml-2 border-yellow-500/50 text-yellow-500">
                      PRO
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <div className={cn(
                    "grid md:grid-cols-3 gap-4 p-4 rounded-lg",
                    !isPro && "blur-sm pointer-events-none"
                  )}>
                    <div className="p-4 bg-background/50 rounded-lg border border-border/50">
                      <h4 className="font-medium mb-2">Predição de Troféus</h4>
                      <p className="text-2xl font-bold text-primary">+150</p>
                      <p className="text-xs text-muted-foreground">próxima semana</p>
                    </div>
                    <div className="p-4 bg-background/50 rounded-lg border border-border/50">
                      <h4 className="font-medium mb-2">Deck Ideal</h4>
                      <p className="text-2xl font-bold text-green-500">85%</p>
                      <p className="text-xs text-muted-foreground">winrate estimado</p>
                    </div>
                    <div className="p-4 bg-background/50 rounded-lg border border-border/50">
                      <h4 className="font-medium mb-2">Matchup Analysis</h4>
                      <p className="text-2xl font-bold text-yellow-500">12</p>
                      <p className="text-xs text-muted-foreground">decks analisados</p>
                    </div>
                  </div>
                  {!isPro && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/20 backdrop-blur-[2px] rounded-lg">
                      <div className="p-3 rounded-full bg-yellow-500/20 mb-3">
                        <Lock className="w-6 h-6 text-yellow-500" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">Disponível no plano PRO</p>
                      <Link href="/billing">
                        <Button 
                          size="sm" 
                          className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600"
                          data-testid="button-unlock-pro"
                        >
                          Desbloquear no PRO
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function GameModeCard({ title, icon, stats, color }: { 
  title: string; 
  icon: React.ReactNode; 
  stats: { wins: number; losses: number; matches: number; winRate: number | string };
  color: 'primary' | 'yellow';
}) {
  const colorClasses = {
    primary: 'text-primary',
    yellow: 'text-yellow-500',
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={cn("p-2 rounded-lg bg-background/50", colorClasses[color])}>
            {icon}
          </div>
          <h3 className="font-bold">{title}</h3>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-green-500">{stats.wins}</p>
            <p className="text-xs text-muted-foreground">Vitórias</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-500">{stats.losses}</p>
            <p className="text-xs text-muted-foreground">Derrotas</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.winRate}%</p>
            <p className="text-xs text-muted-foreground">Win Rate</p>
          </div>
        </div>
        {stats.matches > 0 && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Swords className="w-4 h-4" />
            {stats.matches} partidas
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border/30 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
