import { PushSession } from "@/lib/pushUtils";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Layers, Trophy, Clock, Swords } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";

interface PushSessionListProps {
    sessions: PushSession[];
    selectedSession: PushSession | null;
    onSelect: (session: PushSession) => void;
}

export function PushSessionList({ sessions, selectedSession, onSelect }: PushSessionListProps) {
    const { t } = useLocale();

    if (sessions.length === 0) {
        return (
            <div className="p-4 text-center text-muted-foreground text-sm border rounded-lg bg-card/50 h-full flex flex-col items-center justify-center">
                <Layers className="w-8 h-8 mb-2 opacity-50" />
                <p>{t("pages.push.noSessions")}</p>
            </div>
        );
    }

    return (
        <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-200px)] pr-2">
            {sessions.map((session, index) => {
                const isSelected = selectedSession === session;

                return (
                    <div
                        key={session.startTime.toISOString()}
                        onClick={() => onSelect(session)}
                        className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-all hover:bg-muted/50",
                            isSelected
                                ? "bg-primary/10 border-primary"
                                : "bg-card/50 border-border/50"
                        )}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-muted-foreground uppercase">
                                {format(session.startTime, "dd/MM • HH:mm")}
                            </span>
                            <div className={cn(
                                "text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-1",
                                session.netTrophies > 0 ? "bg-green-500/10 text-green-500" :
                                    session.netTrophies < 0 ? "bg-red-500/10 text-red-500" : "bg-muted text-muted-foreground"
                            )}>
                                <span className="text-[10px]">{session.netTrophies > 0 ? "+" : ""}{session.netTrophies}</span>
                                <Trophy className="w-3 h-3" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-1.5 text-foreground">
                                <Clock className="w-3 h-3 text-muted-foreground" />
                                <span>{Math.round(session.durationMs / 60000)} min</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-foreground">
                                <Swords className="w-3 h-3 text-muted-foreground" />
                                <span>{t("pages.push.matches", { count: session.battles.length })}</span>
                            </div>
                            <div className="col-span-2 mt-1 flex gap-2">
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <span className="text-muted-foreground">{t("pages.push.winsAbbr", { count: session.wins })}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                    <span className="text-muted-foreground">{t("pages.push.lossesAbbr", { count: session.losses })}</span>
                                </div>
                                {session.draws > 0 && (
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-gray-500" />
                                        <span className="text-muted-foreground">{t("pages.push.drawsAbbr", { count: session.draws })}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
