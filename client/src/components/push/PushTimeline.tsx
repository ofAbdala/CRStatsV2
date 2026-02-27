import { PushSession } from "@/lib/pushUtils";
import { useLocale } from "@/hooks/use-locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format } from "date-fns";

interface PushTimelineProps {
    session: PushSession;
}

export function PushTimeline({ session }: PushTimelineProps) {
    const { t } = useLocale();

    // Transform battles to chart data
    // We need to reverse battles (newest first -> oldest first) for the timeline
    const battles = [...session.battles].reverse();

    const data = battles.map((battle, index) => {
        const team = battle.team?.[0];
        const opponent = battle.opponent?.[0];
        const result = team.crowns > opponent.crowns ? "W" : team.crowns < opponent.crowns ? "L" : "D";

        // Calculate trophies at the END of the match.
        // If we have startingTrophies + trophyChange, we use that.
        // Or just trophies (which usually means current trophies, might be same for all in batch if cached? No, battlelog has snapshot).
        // API returns `team[0].trophies` which is usually the trophies *before* or *at start*? 
        // Actually `startingTrophies` exists in some API versions.
        // Let's assume `team.trophies` + `team.trophyChange` is the end result.
        // Or just `team.trophies` if it represents result.
        // In `me.tsx`, `trophyChange` is used.

        let currentTrophies = team.trophies;
        if (team.trophyChange) {
            // If trophies field is "start", then end is start + change.
            // If trophies field is "end", then end is trophies.
            // Clash API `trophies` is usually *starting* trophies for the match in the log context?
            // Actually in `me.tsx` logic: `netTrophies += trophyChange`.
            // Let's try to reconstruct the progression.
            // If index 0 (oldest), we start.
            // We can just plot the "end" trophies of each match.
            if (team.startingTrophies) {
                currentTrophies = team.startingTrophies + (team.trophyChange || 0);
            } else {
                // Fallback
                currentTrophies = team.trophies; // normalized
            }
        }

        return {
            match: index + 1,
            trophies: currentTrophies,
            result,
            change: team.trophyChange || 0,
            opponent: opponent.name,
            time: battle.battleTime
        };
    });

    // Add a "Start" point?
    // The start of the session is before the first match.
    // First match start trophies = data[0].trophies - data[0].change.
    if (data.length > 0) {
        const firstMatch = data[0];
        const startTrophies = firstMatch.trophies - firstMatch.change;
        data.unshift({
            match: 0,
            trophies: startTrophies,
            result: "Start",
            change: 0,
            opponent: "Start",
            time: session.startTime.toISOString() // approx
        });
    }

    return (
        <Card className="glass-card h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-display">{t("profile.trophyChart")}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorTrophies" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis
                                dataKey="match"
                                stroke="hsl(var(--muted-foreground))"
                                tick={{ fontSize: 10 }}
                                tickFormatter={(value) => value === 0 ? "Start" : `#${value}`}
                            />
                            <YAxis
                                domain={['auto', 'auto']}
                                stroke="hsl(var(--muted-foreground))"
                                tick={{ fontSize: 10 }}
                                width={30}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "hsl(var(--card))",
                                    borderColor: "hsl(var(--border))",
                                    borderRadius: "8px",
                                    color: "hsl(var(--foreground))"
                                }}
                                labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                                formatter={(value: any, name: any, props: any) => {
                                    const change = props.payload.change;
                                    const changeStr = change > 0 ? `+${change}` : change;
                                    return [`${value} (${changeStr})`, "Trophies"];
                                }}
                                labelFormatter={(label) => label === 0 ? "Início da Sessão" : `Partida #${label}`}
                            />
                            <Area
                                type="monotone"
                                dataKey="trophies"
                                stroke="hsl(var(--primary))"
                                fillOpacity={1}
                                fill="url(#colorTrophies)"
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
