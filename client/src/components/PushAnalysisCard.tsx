import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  AlertTriangle,
  Lightbulb,
  Loader2,
  RefreshCw,
  Lock,
  Trophy,
  Swords,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useLocale } from "@/hooks/use-locale";
import { Link } from "wouter";

interface PushAnalysisResult {
  id: number | string;
  summary: string;
  strengths: string[];
  mistakes: string[];
  recommendations: string[];
  wins: number;
  losses: number;
  winRate: number;
  netTrophies: number;
  battlesCount: number;
  pushStartTime: string;
  pushEndTime: string;
}

interface PushAnalysisCardProps {
  isPro: boolean;
  onUpgradeClick?: () => void;
}

export function PushAnalysisCard({ isPro, onUpgradeClick }: PushAnalysisCardProps) {
  const { t } = useLocale();
  const [analysis, setAnalysis] = useState<PushAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!isPro) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await api.coach.analyzePush();
      setAnalysis(result as PushAnalysisResult);
    } catch (err: any) {
      setError(err.message || t('errors.generic'));
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const durationMs = endDate.getTime() - startDate.getTime();
    const minutes = Math.round(durationMs / 60000);
    return `${minutes} min`;
  };

  if (!isPro) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm relative overflow-hidden" data-testid="push-analysis-locked">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-orange-500/5" />
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="w-4 h-4 text-primary" />
            {t('pushAnalysis.title')}
            <Badge className="ml-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white">PRO</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
              <Lock className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t('pushAnalysis.proRequired')}</p>
              <p className="text-xs text-muted-foreground">{t('pushAnalysis.proDescription')}</p>
            </div>
            <Link href="/billing">
              <Button 
                size="sm" 
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                data-testid="button-upgrade-push"
              >
                {t('coachLimits.upgradeCta')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm" data-testid="push-analysis-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="w-4 h-4 text-primary" />
            {t('pushAnalysis.title')}
          </CardTitle>
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleAnalyze}
            disabled={isLoading}
            data-testid="button-analyze-push"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {analysis ? t('pushAnalysis.reanalyze') : t('pushAnalysis.analyze')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg flex items-center gap-2" data-testid="push-analysis-error">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        {!analysis && !isLoading && !error && (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm">{t('pushAnalysis.clickToAnalyze')}</p>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t('pushAnalysis.analyzing')}</p>
          </div>
        )}

        {analysis && !isLoading && (
          <div className="space-y-4" data-testid="push-analysis-result">
            <div className="flex items-center justify-between gap-4 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Swords className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{analysis.battlesCount} {t('pushAnalysis.battles')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{formatDuration(analysis.pushStartTime, analysis.pushEndTime)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {analysis.wins}
                </Badge>
                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                  <XCircle className="w-3 h-3 mr-1" />
                  {analysis.losses}
                </Badge>
                <Badge variant={analysis.netTrophies >= 0 ? "default" : "destructive"} className={cn(
                  analysis.netTrophies >= 0 && "bg-primary/80"
                )}>
                  <Trophy className="w-3 h-3 mr-1" />
                  {analysis.netTrophies > 0 ? '+' : ''}{analysis.netTrophies}
                </Badge>
              </div>
            </div>

            <div className="p-3 bg-background/50 rounded-lg">
              <p className="text-sm leading-relaxed">{analysis.summary}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-green-500">
                  <TrendingUp className="w-4 h-4" />
                  {t('pushAnalysis.strengths')}
                </h4>
                <ul className="space-y-1.5">
                  {analysis.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-orange-500">
                  <TrendingDown className="w-4 h-4" />
                  {t('pushAnalysis.mistakes')}
                </h4>
                <ul className="space-y-1.5">
                  {analysis.mistakes.map((m, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <AlertTriangle className="w-3 h-3 text-orange-500 mt-1 flex-shrink-0" />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/50">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-primary">
                <Lightbulb className="w-4 h-4" />
                {t('pushAnalysis.recommendations')}
              </h4>
              <ul className="space-y-1.5">
                {analysis.recommendations.map((r, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
