/**
 * TiltHistory — Timeline of tilt events on the Me page.
 * Story 2.5: AC6 (tilt history with dates and trophies lost).
 */
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { api, type TiltHistoryEvent } from "@/lib/api";
import { useLocale } from "@/hooks/use-locale";
import { format } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { AlertTriangle, Trophy, Clock, Loader2 } from "lucide-react";

export function TiltHistory() {
  const { t, locale } = useLocale();
  const dateFnsLocale = locale === "pt-BR" ? ptBR : enUS;

  const { data, isLoading } = useQuery({
    queryKey: ["tilt-history"],
    queryFn: () => api.player.tiltHistory(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const events = data?.events ?? [];

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          {t("pages.me.tiltHistory.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("pages.me.tiltHistory.empty")}
          </p>
        ) : (
          <div className="space-y-3">
            {events.slice(0, 10).map((event: TiltHistoryEvent, idx: number) => {
              const startDate = new Date(event.startTime);
              const endDate = new Date(event.endTime);
              const formattedDate = format(startDate, "MMM d, HH:mm", { locale: dateFnsLocale });
              const severity = event.consecutiveLosses >= 5 ? "high" : "medium";

              return (
                <div
                  key={`tilt-${idx}`}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    severity === "high"
                      ? "border-red-500/30 bg-red-500/5"
                      : "border-orange-500/30 bg-orange-500/5",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      severity === "high" ? "bg-red-500/20" : "bg-orange-500/20",
                    )}>
                      <AlertTriangle className={cn(
                        "w-4 h-4",
                        severity === "high" ? "text-red-500" : "text-orange-500",
                      )} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {t("pages.me.tiltHistory.losses", { count: event.consecutiveLosses })}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formattedDate}
                      </div>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={cn(
                      "gap-1",
                      event.trophiesLost > 0 ? "text-red-500 border-red-500/40" : "text-muted-foreground",
                    )}
                  >
                    <Trophy className="w-3 h-3" />
                    -{event.trophiesLost}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
