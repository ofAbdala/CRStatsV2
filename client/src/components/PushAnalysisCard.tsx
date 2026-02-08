import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";

export interface PushAnalysisCardData {
  id: string;
  summary: string;
  strengths: string[];
  mistakes: string[];
  recommendations: string[];
  wins: number;
  losses: number;
  winRate: number;
  netTrophies: number;
  battlesCount: number;
  durationMinutes?: number;
  tiltLevel?: "high" | "medium" | "none";
}

function tiltLabel(tiltLevel: "high" | "medium" | "none" | undefined, t: (key: string) => string) {
  if (tiltLevel === "high") return t("components.pushAnalysis.tilt.high");
  if (tiltLevel === "medium") return t("components.pushAnalysis.tilt.medium");
  return t("components.pushAnalysis.tilt.none");
}

export function PushAnalysisCard({
  analysis,
  className,
}: {
  analysis: PushAnalysisCardData;
  className?: string;
}) {
  const { t } = useLocale();
  const winRate = Number.isFinite(analysis.winRate) ? analysis.winRate : 0;

  return (
    <Card className={cn("border-border/50 bg-card/50", className)} data-testid="push-analysis-card">
      <CardHeader className="space-y-3">
        <CardTitle className="text-lg">{t("components.pushAnalysis.title")}</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            {t("components.pushAnalysis.winLoss", {
              wins: analysis.wins,
              losses: analysis.losses,
            })}
          </Badge>
          <Badge variant="outline">{Math.round(winRate)}% WR</Badge>
          <Badge
            variant="outline"
            className={cn(
              analysis.netTrophies > 0 && "text-green-500 border-green-500/40",
              analysis.netTrophies < 0 && "text-red-500 border-red-500/40",
            )}
          >
            {t("components.pushAnalysis.netTrophies", {
              value: `${analysis.netTrophies > 0 ? "+" : ""}${analysis.netTrophies}`,
            })}
          </Badge>
          <Badge variant="outline">{t("components.pushAnalysis.matches", { count: analysis.battlesCount })}</Badge>
          {typeof analysis.durationMinutes === "number" && (
            <Badge variant="outline">{t("components.pushAnalysis.minutes", { value: analysis.durationMinutes })}</Badge>
          )}
          <Badge
            variant="outline"
            className={cn(
              analysis.tiltLevel === "high" && "text-red-500 border-red-500/40",
              analysis.tiltLevel === "medium" && "text-yellow-500 border-yellow-500/40",
              (!analysis.tiltLevel || analysis.tiltLevel === "none") && "text-green-500 border-green-500/40",
            )}
          >
            {tiltLabel(analysis.tiltLevel, t)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <section>
          <h4 className="font-medium mb-1">{t("components.pushAnalysis.summaryTitle")}</h4>
          <p className="text-sm text-muted-foreground">{analysis.summary}</p>
        </section>

        <section>
          <h4 className="font-medium mb-1">{t("components.pushAnalysis.strengthsTitle")}</h4>
          {analysis.strengths.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("components.pushAnalysis.emptyStrengths")}</p>
          ) : (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {analysis.strengths.map((item, index) => (
                <li key={`strength-${index}`}>• {item}</li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h4 className="font-medium mb-1">{t("components.pushAnalysis.mistakesTitle")}</h4>
          {analysis.mistakes.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("components.pushAnalysis.emptyMistakes")}</p>
          ) : (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {analysis.mistakes.map((item, index) => (
                <li key={`mistake-${index}`}>• {item}</li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h4 className="font-medium mb-1">{t("components.pushAnalysis.recommendationsTitle")}</h4>
          {analysis.recommendations.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("components.pushAnalysis.emptyRecommendations")}</p>
          ) : (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {analysis.recommendations.map((item, index) => (
                <li key={`recommendation-${index}`}>• {item}</li>
              ))}
            </ul>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
