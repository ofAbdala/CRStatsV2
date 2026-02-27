import type { PushSession } from "@/lib/pushUtils";
import type { Locale } from "@shared/i18n";

export type PeriodFilter = 'today' | '7days' | '30days' | 'season' | '60days';

export interface BattleStats {
  winRate: string | number;
  wins?: number;
  losses?: number;
  totalMatches: number;
  streak: { type: 'win' | 'loss' | 'none'; count: number };
  lastPlayed: string | null;
  ladderStats: GameModeStats;
  challengeStats: GameModeStats;
}

export interface GameModeStats {
  wins: number;
  losses: number;
  matches: number;
  winRate: number | string;
}

export interface TiltState {
  trend: 'at-risk' | 'improving' | 'consistent';
  label: string;
}

export interface DeckUsageEntry {
  cards: any[];
  wins: number;
  losses: number;
  total: number;
  name: string;
  winRate: number;
}

export interface ArchetypeEntry {
  archetype: string;
  winRate: number;
  matches: number;
}

export interface ArchetypeAnalysis {
  strengths: ArchetypeEntry[];
  weaknesses: ArchetypeEntry[];
}

export interface TrophyEvolutionPoint {
  date: string;
  fullDate: string;
  trophies: number;
  change: number;
}

export interface PlayVolumeData {
  chartData: { date: string; fullDate: string; matches: number; dayName: string }[];
  avgMatchesPerDay: string | number;
  mostActiveDay: string;
  mostActiveDayCount: number;
  peakHour: string;
  peakHourCount: number;
  totalMatches: number;
}

export interface RecentSeriesStats {
  wins: number;
  losses: number;
  total: number;
  winRate: number;
}

export interface MeDataContext {
  // Player info
  player: any;
  clashTag: string | undefined;
  isPro: boolean;

  // Loading / error
  isLoading: boolean;
  playerError: any;
  playerLoading: boolean;
  battlesLoading: boolean;
  goalsLoading: boolean;

  // Raw data
  battles: any[];
  filteredBattles: any[];

  // Filters
  periodFilter: PeriodFilter;
  setPeriodFilter: (filter: PeriodFilter) => void;

  // Computed stats
  stats: BattleStats;
  tiltAnalysis: TiltState;
  recentSeriesStats: RecentSeriesStats;
  lastPush: PushSession | null;
  sessions: PushSession[];

  // Chart data
  chartData: { date: string; trophies: number; dayKey: string }[];
  trophyEvolutionData: TrophyEvolutionPoint[] | null;
  playVolumeData: PlayVolumeData;

  // Deck data
  deckUsage: DeckUsageEntry[];
  archetypeAnalysis: ArchetypeAnalysis;

  // PRO analytics
  trophyPrediction: { net: number | null; sample: number };
  idealDeckWinRate: number | null;
  matchupDeckCount: number | null;

  // Goals
  activeGoals: any[];

  // Actions
  syncMutation: { mutate: () => void; isPending: boolean };

  // i18n
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: Locale;
}
