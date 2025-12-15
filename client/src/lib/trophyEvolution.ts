import { format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface TrophyDataPoint {
  date: string;
  fullDate?: string;
  trophies: number;
  change?: number;
}

export function parseBattleTime(battleTime: string): Date {
  if (!battleTime) return new Date();
  const formatted = battleTime.replace(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})\.?(\d{3})?Z?$/,
    '$1-$2-$3T$4:$5:$6.000Z'
  );
  const date = new Date(formatted);
  return isNaN(date.getTime()) ? new Date() : date;
}

export function computeRealTrophyEvolution(
  battles: any[],
  currentTrophies: number,
  maxDays: number = 14
): TrophyDataPoint[] {
  if (!battles || !battles.length || typeof currentTrophies !== 'number') {
    return [];
  }

  const validBattles = battles.filter(
    (b) =>
      b.battleTime &&
      b.team?.[0] &&
      typeof b.team[0].startingTrophies === 'number' &&
      typeof b.team[0].trophyChange === 'number'
  );

  if (validBattles.length === 0) {
    return [];
  }

  const sortedBattles = [...validBattles].sort((a, b) => {
    const dateA = parseBattleTime(a.battleTime);
    const dateB = parseBattleTime(b.battleTime);
    return dateA.getTime() - dateB.getTime();
  });

  const dailyData: Map<number, { date: Date; trophies: number; change: number }> = new Map();

  sortedBattles.forEach((battle) => {
    const battleDate = parseBattleTime(battle.battleTime);
    const dayStart = startOfDay(battleDate);
    const dayKey = dayStart.getTime();
    const startingTrophies = battle.team[0].startingTrophies;
    const trophyChange = battle.team[0].trophyChange;
    const endingTrophies = startingTrophies + trophyChange;

    const existing = dailyData.get(dayKey);
    if (!existing) {
      dailyData.set(dayKey, { date: dayStart, trophies: endingTrophies, change: trophyChange });
    } else {
      existing.trophies = endingTrophies;
      existing.change += trophyChange;
    }
  });

  const todayStart = startOfDay(new Date());
  const todayKey = todayStart.getTime();
  const todayEntry = dailyData.get(todayKey);
  if (!todayEntry) {
    dailyData.set(todayKey, { date: todayStart, trophies: currentTrophies, change: 0 });
  } else {
    todayEntry.trophies = currentTrophies;
  }

  const sortedEntries = Array.from(dailyData.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );
  const recentEntries = sortedEntries.slice(-maxDays);

  return recentEntries.map((entry) => ({
    date: format(entry.date, 'dd/MM', { locale: ptBR }),
    fullDate: format(entry.date, 'dd/MM/yyyy', { locale: ptBR }),
    trophies: entry.trophies,
    change: entry.change,
  }));
}
