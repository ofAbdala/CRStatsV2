import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { TiltState } from "./types";

interface TiltAnalysisProps {
  tiltAnalysis: TiltState;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function TiltAnalysis({ tiltAnalysis, t }: TiltAnalysisProps) {
  if (tiltAnalysis.trend === "at-risk") {
    return (
      <Badge variant="outline" className="border-red-500/50 text-red-500 gap-1 bg-red-500/10">
        <TrendingDown className="w-3 h-3" />
        {t('me.analysis.atRisk')}
      </Badge>
    );
  }

  if (tiltAnalysis.trend === "improving") {
    return (
      <Badge variant="outline" className="border-green-500/50 text-green-500 gap-1 bg-green-500/10">
        <TrendingUp className="w-3 h-3" />
        {t('me.analysis.onFire')}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="border-blue-500/50 text-blue-500 gap-1 bg-blue-500/10">
      <Minus className="w-3 h-3" />
      {t('me.analysis.consistent')}
    </Badge>
  );
}
