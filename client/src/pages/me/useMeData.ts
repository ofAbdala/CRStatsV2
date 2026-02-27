import React from "react";
import { useProfile } from "@/hooks/useProfile";
import { useClashPlayer } from "@/hooks/useClashPlayer";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ClashPlayerData, type BattleRecord } from "@/lib/api";
import { formatDistanceToNow, differenceInDays, startOfDay } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { useGoals } from "@/hooks/useGoals";
import { useLocale } from "@/hooks/use-locale";
import { groupBattlesIntoPushes, groupBattlesIntoSessions, parseBattleTime } from "@/lib/pushUtils";
import {
  useChartData, useDeckUsage, useArchetypeAnalysis,
  useTrophyEvolution, usePlayVolume, useProAnalytics,
} from "./useAnalytics";
import type { PeriodFilter, BattleStats, TiltState, RecentSeriesStats, MeDataContext } from "./types";

export function useMeData(): MeDataContext {
  const queryClient = useQueryClient();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const clashTag = profile?.clashTag;
  const { data: playerData, isLoading: playerLoading, error: playerError } = useClashPlayer(clashTag);
  const { data: subscription } = useQuery({ queryKey: ['subscription'], queryFn: () => api.subscription.get() });
  const { data: goalsData, isLoading: goalsLoading } = useGoals();
  const { t, locale } = useLocale();
  const dateFnsLocale = locale === 'pt-BR' ? ptBR : enUS;

  const sub = subscription as { plan?: string; status?: string } | undefined;
  const subscriptionPlan = typeof sub?.plan === "string" ? sub.plan.toLowerCase() : "";
  const isPro = subscriptionPlan === "pro" && sub?.status === "active";

  const historyBattlesQuery = useQuery({
    queryKey: ["history-battles", clashTag, isPro ? "pro" : "free"],
    queryFn: () => api.history.getBattles(isPro ? { days: 60, limit: 2000 } : undefined),
    enabled: Boolean(clashTag), staleTime: 2 * 60 * 1000, retry: 1,
  });

  const battlesLoading = historyBattlesQuery.isLoading || historyBattlesQuery.isFetching;
  const battles: BattleRecord[] = historyBattlesQuery.data || [];

  const syncMutation = useMutation({
    mutationFn: () => api.player.sync(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["history-battles"] });
      await queryClient.invalidateQueries({ queryKey: ["player-sync"] });
      await historyBattlesQuery.refetch();
    },
  });

  const isLoading = profileLoading || playerLoading;
  const player = playerData as ClashPlayerData | undefined;
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
        case 'today': return battleDate >= todayStart;
        case '7days': return daysDiff <= 7;
        case '30days': return daysDiff <= 30;
        case 'season': return daysDiff <= 35;
        case '60days': return daysDiff <= 60;
        default: return true;
      }
    });
  }, [battles, periodFilter]);

  const recentSeriesStats = React.useMemo<RecentSeriesStats>(() => {
    const recent = filteredBattles.slice(0, 10);
    let wins = 0, losses = 0;
    recent.forEach((battle: any) => {
      const tc = battle.team?.[0]?.crowns || 0;
      const oc = battle.opponent?.[0]?.crowns || 0;
      if (tc > oc) wins++; else if (tc < oc) losses++;
    });
    const total = wins + losses;
    return { wins, losses, total: recent.length, winRate: total > 0 ? Math.round((wins / total) * 100) : 0 };
  }, [filteredBattles]);

  const lastPush = React.useMemo(() => {
    const pushes = groupBattlesIntoPushes(filteredBattles);
    return pushes.length > 0 ? pushes[pushes.length - 1] : null;
  }, [filteredBattles]);

  const sessions = React.useMemo(() => {
    return groupBattlesIntoSessions(filteredBattles)
      .map(s => ({ ...s, battles: [...s.battles].sort((a, b) => parseBattleTime(b.battleTime).getTime() - parseBattleTime(a.battleTime).getTime()) }))
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }, [filteredBattles]);

  const stats = React.useMemo<BattleStats>(() => {
    if (!battles.length) {
      return { winRate: 0, totalMatches: 0, streak: { type: 'none', count: 0 }, lastPlayed: null, ladderStats: { wins: 0, losses: 0, matches: 0, winRate: 0 }, challengeStats: { wins: 0, losses: 0, matches: 0, winRate: 0 } };
    }
    let wins = 0, losses = 0, streakType: 'win' | 'loss' | 'none' = 'none', streakCount = 0;
    let ladderWins = 0, ladderLosses = 0, challengeWins = 0, challengeLosses = 0;

    battles.forEach((b: any, idx: number) => {
      const tc = b.team?.[0]?.crowns || 0, oc = b.opponent?.[0]?.crowns || 0;
      const isWin = tc > oc, isLoss = tc < oc;
      if (isWin) wins++; else if (isLoss) losses++;
      if (idx === 0) { streakType = isWin ? 'win' : isLoss ? 'loss' : 'none'; streakCount = 1; }
      else if ((streakType === 'win' && isWin) || (streakType === 'loss' && isLoss)) streakCount++;
      else { streakType = isWin ? 'win' : isLoss ? 'loss' : 'none'; streakCount = 1; }
      const bt = b.type?.toLowerCase() || '';
      if (bt.includes('ladder') || bt.includes('pvp')) { if (isWin) ladderWins++; else if (isLoss) ladderLosses++; }
      if (bt.includes('challenge') || bt.includes('tournament')) { if (isWin) challengeWins++; else if (isLoss) challengeLosses++; }
    });

    const totalMatches = wins + losses;
    const lastBattle = battles[0];
    const lastPlayed = lastBattle?.battleTime
      ? formatDistanceToNow(new Date(lastBattle.battleTime.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6')), { addSuffix: true, locale: dateFnsLocale })
      : null;
    const lm = ladderWins + ladderLosses, cm = challengeWins + challengeLosses;

    return {
      winRate: totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : 0, wins, losses, totalMatches,
      streak: { type: streakType, count: streakCount }, lastPlayed,
      ladderStats: { wins: ladderWins, losses: ladderLosses, matches: lm, winRate: lm > 0 ? ((ladderWins / lm) * 100).toFixed(1) : 0 },
      challengeStats: { wins: challengeWins, losses: challengeLosses, matches: cm, winRate: cm > 0 ? ((challengeWins / cm) * 100).toFixed(1) : 0 },
    };
  }, [battles, dateFnsLocale]);

  const tiltAnalysis = React.useMemo<TiltState>(() => {
    if (stats.streak.type === 'loss' && stats.streak.count >= 3) return { trend: 'at-risk', label: t('pages.me.analysis.atRisk') };
    if (stats.streak.type === 'win' && stats.streak.count >= 3) return { trend: 'improving', label: t('pages.me.analysis.onFire') };
    return { trend: 'consistent', label: t('pages.me.analysis.consistent') };
  }, [stats.streak, t]);

  const chartData = useChartData(battles, player?.trophies, locale);
  const deckUsage = useDeckUsage(battles, t);
  const archetypeAnalysis = useArchetypeAnalysis(battles, t);
  const trophyEvolutionData = useTrophyEvolution(battles, player?.trophies, locale);
  const playVolumeData = usePlayVolume(battles, locale, t);
  const { trophyPrediction, idealDeckWinRate, matchupDeckCount } = useProAnalytics(battles, filteredBattles, deckUsage);

  const activeGoals = React.useMemo(() => {
    if (!goalsData || !Array.isArray(goalsData)) return [];
    return goalsData.filter((g) => !g.completed).slice(0, 4);
  }, [goalsData]);

  return {
    player, clashTag: clashTag ?? undefined, isPro, isLoading, playerError, playerLoading, battlesLoading, goalsLoading,
    battles, filteredBattles, periodFilter, setPeriodFilter,
    stats, tiltAnalysis, recentSeriesStats, lastPush, sessions,
    chartData, trophyEvolutionData, playVolumeData,
    deckUsage, archetypeAnalysis, trophyPrediction, idealDeckWinRate, matchupDeckCount,
    activeGoals, syncMutation, t, locale,
  };
}
