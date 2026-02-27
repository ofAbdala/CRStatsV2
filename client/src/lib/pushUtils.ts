
export interface PushSession {
    battles: any[];
    startTime: Date;
    endTime: Date;
    wins: number;
    losses: number;
    draws: number;
    netTrophies: number;
    durationMs: number;
}

export function parseBattleTime(battleTime: string): Date {
    return new Date(battleTime.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6'));
}

function createPushSession(battles: any[]): PushSession {
    let wins = 0;
    let losses = 0;
    let draws = 0;
    let netTrophies = 0;

    battles.forEach((battle: any, index: number) => {
        const teamCrowns = battle.team?.[0]?.crowns || 0;
        const opponentCrowns = battle.opponent?.[0]?.crowns || 0;
        const trophyChange = battle.team?.[0]?.trophyChange;

        const isWin = teamCrowns > opponentCrowns;
        const isLoss = teamCrowns < opponentCrowns;

        if (isWin) wins++;
        else if (isLoss) losses++;
        else draws++;

        // Use trophyChange if it's a valid per-battle delta (Clash Royale typically ±20-45)
        if (typeof trophyChange === 'number' && trophyChange >= -60 && trophyChange <= 60) {
            netTrophies += trophyChange;
        } else {
            // Try computing delta from startingTrophies between consecutive battles
            const prevBattle = index > 0 ? battles[index - 1] : null;
            const prevTrophies = prevBattle?.team?.[0]?.startingTrophies || prevBattle?.team?.[0]?.trophies;
            const currentStartTrophies = battle.team?.[0]?.startingTrophies;

            if (typeof prevTrophies === 'number' && typeof currentStartTrophies === 'number') {
                // Delta = current starting - previous starting (adjusted for previous result)
                const computedDelta = currentStartTrophies - prevTrophies;
                if (computedDelta >= -60 && computedDelta <= 60) {
                    netTrophies += computedDelta;
                } else if (isWin) {
                    netTrophies += 30;
                } else if (isLoss) {
                    netTrophies -= 30;
                }
            } else if (isWin) {
                netTrophies += 30; // Estimate for wins
            } else if (isLoss) {
                netTrophies -= 30; // Estimate for losses
            }
        }
        // Draws typically give 0 trophies
    });

    const startTime = parseBattleTime(battles[0].battleTime);
    const endTime = parseBattleTime(battles[battles.length - 1].battleTime);

    return {
        battles,
        startTime,
        endTime,
        wins,
        losses,
        draws,
        netTrophies,
        durationMs: endTime.getTime() - startTime.getTime(),
    };
}

/**
 * Groups battles into "push sessions" based on time gaps.
 * A push is a sequence of games where the player never waits more than 30 minutes between matches.
 * If the gap between two battles exceeds 30 minutes, a new push starts.
 * 
 * @param battles - Array of battles (newest first from API)
 * @param minBattlesPerPush - Minimum battles required for a valid push (default: 2)
 * @param maxGapMinutes - Maximum gap in minutes between battles in same push (default: 30)
 * @returns Array of PushSession objects, ordered from oldest to newest push
 */
export function groupBattlesIntoPushes(
    battles: any[],
    minBattlesPerPush: number = 2,
    maxGapMinutes: number = 30
): PushSession[] {
    if (!battles.length) return [];

    const sortedBattles = [...battles]
        .filter(b => b.battleTime)
        .sort((a, b) => {
            const dateA = parseBattleTime(a.battleTime);
            const dateB = parseBattleTime(b.battleTime);
            return dateA.getTime() - dateB.getTime();
        });

    if (sortedBattles.length === 0) return [];

    const pushes: PushSession[] = [];
    let currentPush: any[] = [sortedBattles[0]];

    for (let i = 1; i < sortedBattles.length; i++) {
        const prevBattle = sortedBattles[i - 1];
        const currBattle = sortedBattles[i];

        const prevTime = parseBattleTime(prevBattle.battleTime);
        const currTime = parseBattleTime(currBattle.battleTime);
        const gapMinutes = (currTime.getTime() - prevTime.getTime()) / (1000 * 60);

        if (gapMinutes <= maxGapMinutes) {
            currentPush.push(currBattle);
        } else {
            if (currentPush.length >= minBattlesPerPush) {
                pushes.push(createPushSession(currentPush));
            }
            currentPush = [currBattle];
        }
    }

    if (currentPush.length >= minBattlesPerPush) {
        pushes.push(createPushSession(currentPush));
    }

    // Reverse pushes to show newest first
    return pushes.reverse();
}

/**
 * Groups battles into sessions for visual display (includes single-battle sessions)
 */
export function groupBattlesIntoSessions(battles: any[], maxGapMinutes: number = 30): PushSession[] {
    return groupBattlesIntoPushes(battles, 1, maxGapMinutes);
}
