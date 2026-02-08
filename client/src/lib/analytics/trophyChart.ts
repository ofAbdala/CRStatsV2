import type { Locale } from "@shared/i18n";

export interface TrophyChartPoint {
  label: string;
  trophies: number;
  dayKey: string;
}

const WEEKDAY_LABELS: Record<Locale, string[]> = {
  "pt-BR": ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"],
  "en-US": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

function startOfDayLocal(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDaysLocal(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDayKeyLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseClashBattleTime(value?: string | null) {
  if (!value) return null;

  // Clash Royale API: "20231215T123456.000Z"
  const formatted = value.replace(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})\.(\d{3})Z$/,
    "$1-$2-$3T$4:$5:$6.$7Z",
  );

  const parsed = new Date(formatted);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function extractTrophyChange(battle: any): number | null {
  const value = battle?.team?.[0]?.trophyChange;
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value)) return null;
  return value;
}

export function buildTrophyChartData({
  battles,
  currentTrophies,
  locale,
  days = 7,
  now = new Date(),
}: {
  battles: any[] | null | undefined;
  currentTrophies: number | null | undefined;
  locale: Locale;
  days?: number;
  now?: Date;
}): TrophyChartPoint[] {
  const safeDays = Math.max(2, Math.min(30, Math.floor(days)));
  const todayStart = startOfDayLocal(now);

  const dayStarts: Date[] = [];
  for (let i = safeDays - 1; i >= 0; i -= 1) {
    dayStarts.push(addDaysLocal(todayStart, -i));
  }

  const initialTrophies = typeof currentTrophies === "number" && Number.isFinite(currentTrophies) ? currentTrophies : 0;

  const rangeStart = dayStarts[0];
  const rangeEndExclusive = addDaysLocal(dayStarts[dayStarts.length - 1], 1);

  const deltaByDay = new Map<string, number>();
  let anyDeltas = false;

  for (const battle of Array.isArray(battles) ? battles : []) {
    const battleTime = parseClashBattleTime(battle?.battleTime);
    if (!battleTime) continue;
    if (battleTime < rangeStart || battleTime >= rangeEndExclusive) continue;

    const trophyChange = extractTrophyChange(battle);
    if (trophyChange === null) continue;

    const dayKey = toDayKeyLocal(battleTime);
    deltaByDay.set(dayKey, (deltaByDay.get(dayKey) || 0) + trophyChange);
    anyDeltas = true;
  }

  if (!anyDeltas) {
    return dayStarts.map((dayStart) => ({
      label: WEEKDAY_LABELS[locale][dayStart.getDay()],
      trophies: initialTrophies,
      dayKey: toDayKeyLocal(dayStart),
    }));
  }

  const totalDelta = Array.from(deltaByDay.values()).reduce((acc, value) => acc + value, 0);
  let trophies = initialTrophies - totalDelta;

  return dayStarts.map((dayStart) => {
    const dayKey = toDayKeyLocal(dayStart);
    trophies += deltaByDay.get(dayKey) || 0;
    return {
      label: WEEKDAY_LABELS[locale][dayStart.getDay()],
      trophies: Math.round(trophies),
      dayKey,
    };
  });
}

