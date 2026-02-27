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

        // Check if there is a saved analysis for this session?
        // For now, we might not have ID for ad-hoc sessions.
        // We can try to generate one locally or fetch from API if we have an ID.
        // Existing `PushAnalysisCard` expects `PushAnalysisCardData`.
        // Let's create a mock/placeholder analysis or basic stats analysis for now
        // since real AI analysis requires backend call on specific "Push" entity which we might not have yet.
        // The previous implementation of `PushAnalysisCard` seems to handle display.

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

        // If we want real analysis, we would call an API here. 
        // For Phase 4, we want "Analysis: Generated output".
        // I'll leave it as basic for now and maybe add a "Generate" button later or if API exists.
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
                    <h1 className="text-3xl font-display font-bold text-foreground">Push Analysis</h1>
                    <p className="text-muted-foreground">Analise suas sessões e entenda sua performance.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 overflow-hidden">
                    {/* Left Sidebar: Session List */}
                    <div className="lg:col-span-1 border rounded-lg bg-card/30 overflow-hidden flex flex-col">
                        <div className="p-3 border-b bg-muted/20 font-bold text-sm">
                            Sessões Recentes
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

                                {/* Detailed Match List could go here if needed, but Timeline covers it visually */}
                            </>
                        )}

                        {!selectedSession && (
                            <div className="flex h-full items-center justify-center text-muted-foreground">
                                Selecione uma sessão para ver os detalhes.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
