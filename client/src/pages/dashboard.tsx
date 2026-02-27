import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useLocale } from "@/hooks/use-locale";
import { usePlayerSync } from "@/hooks/usePlayerSync";
import { computeTiltState } from "@shared/domain/tilt";
import { DailyStatusCard } from "@/components/home/DailyStatusCard";
import { MiniGraph } from "@/components/home/MiniGraph";
import { LastMatches } from "@/components/home/LastMatches";
import { DailyInsight } from "@/components/home/DailyInsight";
import { buildTrophyChartData } from "@/lib/analytics/trophyChart";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { t, locale } = useLocale();
  const { sync, isLoading } = usePlayerSync();

  const player = sync?.player ?? null;
  const battles = sync?.battles ?? [];
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Update time every minute
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  // Compute Tilt State
  const tilt = useMemo(() => {
    const state = computeTiltState(battles, new Date(nowMs));
    // Map to DailyStatusCard expected format
    return {
      level: (state.level === "high" || state.level === "medium" || state.level === "none") ? state.level : "none",
      risk: state.level === "high" ? t("pages.dashboard.tilt.high") : state.level === "medium" ? t("pages.dashboard.tilt.medium") : t("pages.dashboard.tilt.none")
    };
  }, [battles, nowMs, t]);

  // Calculate 24h Stats
  const stats24h = useMemo(() => {
    const oneDayAgo = nowMs - 24 * 60 * 60 * 1000;
    const recentBattles = battles.filter((b: any) => new Date(b.battleTime).getTime() > oneDayAgo);

    const totalMatches24h = recentBattles.length;
    let wins24h = 0;
    let losses24h = 0;
    let delta24h = 0;

    recentBattles.forEach((battle: any) => {
      const teamCrowns = battle?.team?.[0]?.crowns || 0;
      const opponentCrowns = battle?.opponent?.[0]?.crowns || 0;
      if (teamCrowns > opponentCrowns) wins24h++;
      else if (opponentCrowns > teamCrowns) losses24h++;

      // Trophy change approximation (since API might not give explicit delta history per match clearly in all endpoints, 
      // usually derived from context. Assuming battle.trophyChange exists or we approximate. 
      // For now, if ladder, typical +30/-30. Real implementation needs robust parser)
      // `battleHistory` table has trophyChange.
      if (battle.trophyChange) {
        delta24h += battle.trophyChange;
      } else {
        // Fallback estimation
        if (teamCrowns > opponentCrowns) delta24h += 30;
        else if (opponentCrowns > teamCrowns) delta24h -= 30;
      }
    });

    const winRate = totalMatches24h > 0 ? Math.round((wins24h / totalMatches24h) * 100) : 0;

    return {
      trophies: player?.trophies || 0,
      delta24h,
      winRate,
      totalMatches24h,
      wins24h,
      losses24h
    };
  }, [battles, nowMs, player]);

  // Chart Data
  const chartData = useMemo(() => buildTrophyChartData({
    battles,
    currentTrophies: player?.trophies,
    locale,
    days: 7,
  }), [battles, player, locale]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">{t("home.welcome", { name: player?.name || "Player" })}</h1>
          <p className="text-muted-foreground">{t("home.subtitle")}</p>
        </div>

        {/* Core Loop Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 1. Status of the Day (Hero) */}
          <div className="lg:col-span-2">
            <DailyStatusCard
              player={player}
              stats={stats24h}
              tilt={tilt}
            />
          </div>

          {/* 4. Daily Insight */}
          <div className="lg:col-span-1">
            <DailyInsight stats={stats24h} tilt={tilt} />
          </div>

          {/* 2. Mini Graph */}
          <div className="lg:col-span-2 h-[200px]">
            <MiniGraph data={chartData} />
          </div>

          {/* 3. Last Matches */}
          <div className="lg:col-span-1 h-[200px]">
            <LastMatches battles={battles} />
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}

