import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { usePlayerSync } from "@/hooks/usePlayerSync";
import { PushSessionList } from "@/components/push/PushSessionList";
import { PushTimeline } from "@/components/push/PushTimeline";
import { PushAnalysisCard, PushAnalysisCardData } from "@/components/PushAnalysisCard";
import { groupBattlesIntoPushes, PushSession } from "@/lib/pushUtils";
import { useLocale } from "@/hooks/use-locale";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";

export default function PushPage() {
    const { sync, isLoading, derivedStatus } = usePlayerSync();
    const { t } = useLocale();
    const [selectedSession, setSelectedSession] = useState<PushSession | null>(null);
    const [analysis, setAnalysis] = useState<PushAnalysisCardData | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Group battles into push sessions
    const sessions = useMemo(() => {
        if (!sync?.battles) return [];
        return groupBattlesIntoPushes(sync.battles);
    }, [sync?.battles]);

    // Select the first session by default when loaded
    useEffect(() => {
        if (sessions.length > 0 && !selectedSession) {
            setSelectedSession(sessions[0]);
        }
    }, [sessions, selectedSession]);

    // Fetch or generate analysis when a session is selected
    useEffect(() => {
        if (!selectedSession) {
            setAnalysis(null);
            return;
        }

        // Construct basic analysis from session data
        const basicAnalysis: PushAnalysisCardData = {
            id: "local-" + selectedSession.startTime.toISOString(),
            summary: t("components.pushAnalysis.summaryPlaceholder"),
            strengths: [],
            mistakes: [],
            recommendations: [],
            wins: selectedSession.wins,
            losses: selectedSession.losses,
            winRate: (selectedSession.wins / (selectedSession.battles.length || 1)) * 100,
            netTrophies: selectedSession.netTrophies,
            battlesCount: selectedSession.battles.length,
            durationMinutes: Math.round(selectedSession.durationMs / 60000),
            tiltLevel: "none" // TODO: Calculate tilt
        };

        setAnalysis(basicAnalysis);

    }, [selectedSession, t]);

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-[50vh]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="flex flex-col h-[calc(100vh-100px)] gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-foreground">{t("pages.push.title")}</h1>
                    <p className="text-muted-foreground">{t("pages.push.subtitle")}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 overflow-hidden">
                    {/* Left Sidebar: Session List */}
                    <div className="lg:col-span-1 border rounded-lg bg-card/30 overflow-hidden flex flex-col">
                        <div className="p-3 border-b bg-muted/20 font-bold text-sm">
                            {t("pages.push.recentSessions")}
                        </div>
                        <PushSessionList
                            sessions={sessions}
                            selectedSession={selectedSession}
                            onSelect={setSelectedSession}
                        />
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3 space-y-4 overflow-y-auto">
                        {selectedSession && (
                            <>
                                {/* Timeline/Graph */}
                                <div className="h-[300px]">
                                    <PushTimeline session={selectedSession} />
                                </div>

                                {/* Analysis Card */}
                                {analysis && (
                                    <PushAnalysisCard analysis={analysis} className="glass-card" />
                                )}
                            </>
                        )}

                        {!selectedSession && (
                            <div className="flex h-full items-center justify-center text-muted-foreground">
                                {t("pages.push.selectSession")}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
