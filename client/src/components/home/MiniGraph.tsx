/**
 * MiniGraph — Compact trophy progression chart for the dashboard.
 * Story 2.5: AC7 (session-by-session), AC8 (zoom levels), AC9 (push balance).
 */
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";
import { TrendingUp } from "lucide-react";
import type { TrophyChartPoint } from "@/lib/analytics/trophyChart";

type ZoomLevel = "today" | "week" | "season";

interface MiniGraphProps {
  data: TrophyChartPoint[];
}

export function MiniGraph({ data }: MiniGraphProps) {
  const { t } = useLocale();
  const [zoom, setZoom] = useState<ZoomLevel>("week");

  // Filter data based on zoom level
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const now = new Date();

    if (zoom === "today") {
      const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      return data.filter((p) => p.dayKey === todayKey);
    }

    if (zoom === "week") {
      // Last 7 days (the default data is already 7 days)
      return data;
    }

    // Season: show all data (up to 30 days)
    return data;
  }, [data, zoom]);

  // Calculate push balance from chart data
  const pushBalance = useMemo(() => {
    if (filteredData.length < 2) return null;
    const first = filteredData[0].trophies;
    const last = filteredData[filteredData.length - 1].trophies;
    return last - first;
  }, [filteredData]);

  const zoomButtons: { key: ZoomLevel; label: string }[] = [
    { key: "today", label: t("home.zoomToday") },
    { key: "week", label: t("home.zoomWeek") },
    { key: "season", label: t("home.zoomSeason") },
  ];

  return (
    <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2 px-4 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-primary" />
            {t("home.progress7d")}
          </CardTitle>

          {/* Push Balance — AC9 */}
          {pushBalance !== null && (
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                pushBalance > 0 ? "text-green-500 border-green-500/40" : pushBalance < 0 ? "text-red-500 border-red-500/40" : "",
              )}
            >
              {pushBalance > 0 ? "+" : ""}{pushBalance} {t("home.trophiesLabel")}
            </Badge>
          )}
        </div>

        {/* Zoom buttons — AC8 */}
        <div className="flex gap-1 pt-1">
          {zoomButtons.map((btn) => (
            <Button
              key={btn.key}
              variant={zoom === btn.key ? "secondary" : "ghost"}
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setZoom(btn.key)}
            >
              {btn.label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="px-2 pb-2 h-[calc(100%-80px)]">
        {filteredData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
            {t("home.noMatches")}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTrophiesHome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="label"
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                domain={["dataMin - 30", "dataMax + 30"]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--popover-foreground))",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [value.toLocaleString(), "Trophies"]}
              />
              <Area
                type="monotone"
                dataKey="trophies"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorTrophiesHome)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, fill: "hsl(var(--primary))" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
