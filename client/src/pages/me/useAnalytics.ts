import React from "react";
import { format, getDay } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { buildTrophyChartData } from "@/lib/analytics/trophyChart";
import { parseBattleTime } from "@/lib/pushUtils";
import type { Locale } from "@shared/i18n";
import type {
  DeckUsageEntry,
  ArchetypeAnalysis,
  TrophyEvolutionPoint,
  PlayVolumeData,
} from "./types";

export function useChartData(battles: any[], playerTrophies: number | undefined, locale: Locale) {
  return React.useMemo(() => {
    const points = buildTrophyChartData({
      battles,
      currentTrophies: playerTrophies,
      locale,
      days: 7,
    });
    return points.map((point) => ({
      date: point.label,
      trophies: point.trophies,
      dayKey: point.dayKey,
    }));
  }, [battles, locale, playerTrophies]);
}

export function useDeckUsage(battles: any[], t: (key: string) => string): DeckUsageEntry[] {
  return React.useMemo(() => {
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
      .map((deck, index) => ({
        ...deck,
        name: index === 0 ? t('me.deck.primary') : index === 1 ? t('me.deck.secondary') : t('me.deck.other'),
        winRate: deck.total > 0 ? Math.round((deck.wins / deck.total) * 100) : 0,
      }));
  }, [battles, t]);
}

export function useArchetypeAnalysis(battles: any[], t: (key: string) => string): ArchetypeAnalysis {
  return React.useMemo(() => {
    if (!battles.length) return { strengths: [], weaknesses: [] };

    const beatdownCards = ['golem', 'giant', 'lavahound', 'elixir golem', 'royal giant'];
    const cycleCards = ['skeletons', 'ice spirit', 'electro spirit', 'fire spirit', 'log', 'zap'];
    const controlCards = ['tornado', 'rocket', 'lightning', 'x-bow', 'mortar', 'inferno tower'];
    const airCards = ['balloon', 'lavahound', 'minions', 'mega minion', 'baby dragon', 'inferno dragon'];

    const archetypeKeys: Record<string, { wins: number; losses: number }> = {
      [t('me.archetype.beatdown')]: { wins: 0, losses: 0 },
      [t('me.archetype.cycle')]: { wins: 0, losses: 0 },
      [t('me.archetype.control')]: { wins: 0, losses: 0 },
      [t('me.archetype.air')]: { wins: 0, losses: 0 },
    };

    battles.forEach((battle: any) => {
      const opponentCards = battle.opponent?.[0]?.cards || [];
      const cardNames = opponentCards.map((c: any) => (c.name || '').toLowerCase());
      const teamCrowns = battle.team?.[0]?.crowns || 0;
      const opponentCrowns = battle.opponent?.[0]?.crowns || 0;
      const isWin = teamCrowns > opponentCrowns;

      if (cardNames.some((n: string) => beatdownCards.some(bc => n.includes(bc)))) {
        if (isWin) archetypeKeys[t('me.archetype.beatdown')].wins++; else archetypeKeys[t('me.archetype.beatdown')].losses++;
      }
      if (cardNames.filter((n: string) => cycleCards.some(cc => n.includes(cc))).length >= 2) {
        if (isWin) archetypeKeys[t('me.archetype.cycle')].wins++; else archetypeKeys[t('me.archetype.cycle')].losses++;
      }
      if (cardNames.some((n: string) => controlCards.some(cc => n.includes(cc)))) {
        if (isWin) archetypeKeys[t('me.archetype.control')].wins++; else archetypeKeys[t('me.archetype.control')].losses++;
      }
      if (cardNames.filter((n: string) => airCards.some(ac => n.includes(ac))).length >= 2) {
        if (isWin) archetypeKeys[t('me.archetype.air')].wins++; else archetypeKeys[t('me.archetype.air')].losses++;
      }
    });

    const strengths: ArchetypeAnalysis['strengths'] = [];
    const weaknesses: ArchetypeAnalysis['weaknesses'] = [];

    Object.entries(archetypeKeys).forEach(([archetype, s]) => {
      const total = s.wins + s.losses;
      if (total < 3) return;
      const winRate = Math.round((s.wins / total) * 100);
      const entry = { archetype, winRate, matches: total };
      if (winRate >= 55) strengths.push(entry);
      else if (winRate <= 45) weaknesses.push(entry);
    });

    strengths.sort((a, b) => b.winRate - a.winRate);
    weaknesses.sort((a, b) => a.winRate - b.winRate);
    return { strengths, weaknesses };
  }, [battles, t]);
}

export function useTrophyEvolution(battles: any[], playerTrophies: number | undefined, locale: Locale): TrophyEvolutionPoint[] | null {
  const dateFnsLocale = locale === 'pt-BR' ? ptBR : enUS;
  return React.useMemo(() => {
    if (!battles.length || !playerTrophies) return null;
    const battlesWithTrophyChange = battles.filter((b: any) => b.battleTime && typeof b.team?.[0]?.trophyChange === 'number');
    if (battlesWithTrophyChange.length === 0) return null;

    const dataByDate: Record<string, { trophiesAtEnd: number; totalChange: number }> = {};
    let runningTrophies = playerTrophies;

    battlesWithTrophyChange.forEach((battle: any) => {
      const battleDate = parseBattleTime(battle.battleTime);
      const dateKey = format(battleDate, 'yyyy-MM-dd');
      const trophyChange = battle.team[0].trophyChange;
      if (!dataByDate[dateKey]) dataByDate[dateKey] = { trophiesAtEnd: runningTrophies, totalChange: 0 };
      dataByDate[dateKey].totalChange += trophyChange;
      runningTrophies -= trophyChange;
    });

    const sortedDates = Object.keys(dataByDate).sort();
    if (sortedDates.length === 0) return null;

    let trophiesAtEndOfDay = playerTrophies;
    return sortedDates.slice(-14).map(dateKey => {
      const data = dataByDate[dateKey];
      const result = {
        date: format(new Date(dateKey), 'dd/MM', { locale: dateFnsLocale }),
        fullDate: format(new Date(dateKey), 'dd/MM/yyyy', { locale: dateFnsLocale }),
        trophies: trophiesAtEndOfDay,
        change: data.totalChange,
      };
      trophiesAtEndOfDay -= data.totalChange;
      return result;
    }).reverse();
  }, [battles, playerTrophies, dateFnsLocale]);
}

export function usePlayVolume(battles: any[], locale: Locale, t: (key: string) => string): PlayVolumeData {
  const dateFnsLocale = locale === 'pt-BR' ? ptBR : enUS;
  return React.useMemo(() => {
    const dayNames = [
      t('me.weekday.sun'), t('me.weekday.mon'), t('me.weekday.tue'),
      t('me.weekday.wed'), t('me.weekday.thu'), t('me.weekday.fri'),
      t('me.weekday.sat'),
    ];
    const matchesByDay: Record<string, number> = {};
    const matchesByDayOfWeek: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const matchesByHour: Record<number, number> = {};

    const last14Days: PlayVolumeData['chartData'] = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = format(date, 'yyyy-MM-dd');
      matchesByDay[dateKey] = 0;
      last14Days.push({ date: format(date, 'dd/MM', { locale: dateFnsLocale }), fullDate: dateKey, matches: 0, dayName: dayNames[getDay(date)] });
    }

    battles.forEach((battle: any) => {
      if (!battle.battleTime) return;
      const battleDate = parseBattleTime(battle.battleTime);
      const dateKey = format(battleDate, 'yyyy-MM-dd');
      const dayOfWeek = getDay(battleDate);
      const hour = battleDate.getHours();
      if (matchesByDay[dateKey] !== undefined) matchesByDay[dateKey]++;
      matchesByDayOfWeek[dayOfWeek]++;
      matchesByHour[hour] = (matchesByHour[hour] || 0) + 1;
    });

    last14Days.forEach(day => { day.matches = matchesByDay[day.fullDate] || 0; });

    const totalMatchesLast14 = Object.values(matchesByDay).reduce((a, b) => a + b, 0);
    const avgMatchesPerDay = totalMatchesLast14 > 0 ? (totalMatchesLast14 / 14).toFixed(1) : 0;
    const mostActiveDay = Object.entries(matchesByDayOfWeek).reduce((max, [day, count]) => count > max.count ? { day: parseInt(day), count } : max, { day: 0, count: 0 });
    const peakHour = Object.entries(matchesByHour).reduce((max, [hour, count]) => count > max.count ? { hour: parseInt(hour), count } : max, { hour: 12, count: 0 });

    return {
      chartData: last14Days,
      avgMatchesPerDay,
      mostActiveDay: dayNames[mostActiveDay.day],
      mostActiveDayCount: mostActiveDay.count,
      peakHour: `${peakHour.hour.toString().padStart(2, '0')}:00`,
      peakHourCount: peakHour.count,
      totalMatches: totalMatchesLast14,
    };
  }, [battles, t, dateFnsLocale]);
}

export function useProAnalytics(battles: any[], filteredBattles: any[], deckUsage: DeckUsageEntry[]) {
  const trophyPrediction = React.useMemo(() => {
    const now = new Date();
    const since = new Date(now);
    since.setDate(since.getDate() - 7);
    let sum = 0, sample = 0;
    for (const battle of Array.isArray(battles) ? battles : []) {
      const btv = battle?.battleTime;
      if (typeof btv !== "string") continue;
      const bt = parseBattleTime(btv);
      if (Number.isNaN(bt.getTime()) || bt < since) continue;
      const tc = battle?.team?.[0]?.trophyChange;
      if (typeof tc !== "number" || !Number.isFinite(tc)) continue;
      sum += tc;
      sample += 1;
    }
    return { net: sample >= 3 ? sum : null, sample };
  }, [battles]);

  const idealDeckWinRate = React.useMemo(() => {
    const candidates = deckUsage.filter((d) => typeof d?.total === "number" && d.total >= 5);
    if (candidates.length === 0) return null;
    const best = candidates.reduce((acc, d) => (d.winRate > acc.winRate ? d : acc), candidates[0]);
    return typeof best?.winRate === "number" ? best.winRate : null;
  }, [deckUsage]);

  const matchupDeckCount = React.useMemo(() => {
    const sample = (Array.isArray(filteredBattles) && filteredBattles.length ? filteredBattles : battles).slice(0, 50);
    const keys = new Set<string>();
    for (const battle of sample) {
      const cards = battle?.opponent?.[0]?.cards;
      if (!Array.isArray(cards) || cards.length === 0) continue;
      const ids = cards.map((c: any) => c?.id).filter((id: any) => typeof id === "number" && Number.isFinite(id)).sort((a: number, b: number) => a - b);
      if (ids.length === 0) continue;
      keys.add(ids.join("-"));
    }
    return keys.size > 0 ? keys.size : null;
  }, [battles, filteredBattles]);

  return { trophyPrediction, idealDeckWinRate, matchupDeckCount };
}
