/**
 * Coach context helpers — extracts player context gathering logic
 * used by the coach chat endpoint.
 */
import { getPlayerByTag, getPlayerBattles } from "../clashRoyaleApi";
import type { IStorage } from "../storage";
import { getCanonicalProfileTag, computeBattleStats } from "./utils";

/**
 * Gather player context for the AI coach, including tilt status,
 * recent battles, active goals, and optionally the last loss for analysis.
 */
export async function gatherPlayerContext(
  storage: IStorage,
  userId: string,
  playerTag: string | undefined,
  options: { shouldInjectLastBattle: boolean },
) {
  let playerContext: any = {};
  let lastBattleContext: any = null;

  const userGoals = await storage.getGoals(userId);
  const activeGoals = userGoals.filter(g => !g.completed).slice(0, 3);

  const tagToUse = playerTag || await resolveProfileTag(storage, userId);
  if (!tagToUse) {
    return { playerContext, lastBattleContext, activeGoals };
  }

  const playerResult = await getPlayerByTag(tagToUse);
  if (!playerResult.data) {
    return { playerContext, lastBattleContext, activeGoals };
  }

  const player = playerResult.data as any;
  playerContext = {
    playerTag: player.tag,
    trophies: player.trophies,
    arena: player.arena?.name,
    currentDeck: player.currentDeck?.map((c: any) => c.name),
  };

  const battlesResult = await getPlayerBattles(tagToUse);
  if (!battlesResult.data) {
    return { playerContext, lastBattleContext, activeGoals };
  }

  const battles = battlesResult.data as any[];
  playerContext.recentBattles = battles.slice(0, 5);

  const stats = computeBattleStats(battles);
  const tiltLevel = stats.tiltLevel;
  const consecutiveLosses = stats.streak.type === 'loss' ? stats.streak.count : 0;
  playerContext.lastBattleAt = stats.lastBattleAt;
  playerContext.tiltStatus = {
    level: tiltLevel,
    risk: stats.tiltRisk,
    recentWinRate: stats.winRate,
    currentStreak: stats.streak,
    consecutiveLosses: tiltLevel === 'high' ? consecutiveLosses : 0,
  };

  if (activeGoals.length > 0) {
    playerContext.activeGoals = activeGoals.map(g => ({
      title: g.title,
      type: g.type,
      target: g.targetValue,
      current: g.currentValue,
      progress: Math.round(((g.currentValue || 0) / g.targetValue) * 100),
    }));
  }

  if (options.shouldInjectLastBattle) {
    const lastLoss = battles.find((b: any) => {
      const teamCrowns = b.team?.[0]?.crowns || 0;
      const opponentCrowns = b.opponent?.[0]?.crowns || 0;
      return teamCrowns < opponentCrowns;
    });

    if (lastLoss) {
      const playerTeam = lastLoss.team?.[0];
      const opponent = lastLoss.opponent?.[0];

      lastBattleContext = {
        result: 'loss',
        gameMode: lastLoss.gameMode?.name || lastLoss.type || 'Unknown',
        arena: lastLoss.arena?.name,
        playerDeck: playerTeam?.cards?.map((c: any) => c.name) || [],
        opponentDeck: opponent?.cards?.map((c: any) => c.name) || [],
        playerCrowns: playerTeam?.crowns || 0,
        opponentCrowns: opponent?.crowns || 0,
        trophyChange: playerTeam?.trophyChange || 0,
        elixirLeaked: playerTeam?.elixirLeaked || 0,
        battleTime: lastLoss.battleTime,
      };
      playerContext.lastBattleAnalysis = lastBattleContext;
    }
  }

  return { playerContext, lastBattleContext, activeGoals };
}

async function resolveProfileTag(storage: IStorage, userId: string): Promise<string | null> {
  const profile = await storage.getProfile(userId);
  return getCanonicalProfileTag(profile);
}
