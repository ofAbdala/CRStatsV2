import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

function tiltLabel(tiltLevel?: "high" | "medium" | "none") {
  if (tiltLevel === "high") return "Tilt alto";
  if (tiltLevel === "medium") return "Tilt moderado";
  return "Tilt controlado";
}

export function PushAnalysisCard({
  analysis,
  className,
}: {
  analysis: PushAnalysisCardData;
  className?: string;
}) {
  const winRate = Number.isFinite(analysis.winRate) ? analysis.winRate : 0;

  return (
    <Card className={cn("border-border/50 bg-card/50", className)} data-testid="push-analysis-card">
      <CardHeader className="space-y-3">
        <CardTitle className="text-lg">Análise de Push</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{analysis.wins}V / {analysis.losses}D</Badge>
          <Badge variant="outline">{Math.round(winRate)}% WR</Badge>
          <Badge
            variant="outline"
            className={cn(
              analysis.netTrophies > 0 && "text-green-500 border-green-500/40",
              analysis.netTrophies < 0 && "text-red-500 border-red-500/40",
            )}
          >
            {analysis.netTrophies > 0 ? "+" : ""}{analysis.netTrophies} troféus
          </Badge>
          <Badge variant="outline">{analysis.battlesCount} partidas</Badge>
          {typeof analysis.durationMinutes === "number" && (
            <Badge variant="outline">{analysis.durationMinutes} min</Badge>
          )}
          <Badge
            variant="outline"
            className={cn(
              analysis.tiltLevel === "high" && "text-red-500 border-red-500/40",
              analysis.tiltLevel === "medium" && "text-yellow-500 border-yellow-500/40",
              (!analysis.tiltLevel || analysis.tiltLevel === "none") && "text-green-500 border-green-500/40",
            )}
          >
            {tiltLabel(analysis.tiltLevel)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <section>
          <h4 className="font-medium mb-1">Resumo</h4>
          <p className="text-sm text-muted-foreground">{analysis.summary}</p>
        </section>

        <section>
          <h4 className="font-medium mb-1">Forças</h4>
          {analysis.strengths.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem forças detectadas.</p>
          ) : (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {analysis.strengths.map((item, index) => (
                <li key={`strength-${index}`}>• {item}</li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h4 className="font-medium mb-1">Erros</h4>
          {analysis.mistakes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem erros detectados.</p>
          ) : (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {analysis.mistakes.map((item, index) => (
                <li key={`mistake-${index}`}>• {item}</li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h4 className="font-medium mb-1">Recomendações</h4>
          {analysis.recommendations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem recomendações disponíveis.</p>
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

