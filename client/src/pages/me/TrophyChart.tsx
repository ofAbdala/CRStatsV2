import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Table } from "lucide-react";

interface TrophyChartProps {
  chartData: { date: string; trophies: number; dayKey: string }[];
  locale: string;
}

export function TrophyChart({ chartData, locale }: TrophyChartProps) {
  const dateFnsLocale = locale === 'pt-BR' ? ptBR : enUS;
  const [showTable, setShowTable] = useState(false);

  return (
    <div>
      <div className="flex justify-end mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowTable(!showTable)}
          aria-pressed={showTable}
          className="text-xs gap-1"
        >
          <Table className="w-3 h-3" />
          {showTable ? "View as chart" : "View as table"}
        </Button>
      </div>

      {showTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse" aria-label="Trophy progression data">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Date</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Trophies</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row) => (
                <tr key={row.dayKey} className="border-b border-border/50">
                  <td className="py-2 px-3">
                    {(() => {
                      const d = new Date(row.date);
                      return format(d, 'EEE, MMM d', { locale: dateFnsLocale });
                    })()}
                  </td>
                  <td className="py-2 px-3 text-right font-medium">{row.trophies.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-[250px] w-full" role="img" aria-label="Trophy progression chart showing trophies over the last 7 days">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorTrophiesMe" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(date) => {
                  const d = new Date(date);
                  return format(d, 'EEE', { locale: dateFnsLocale });
                }}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                domain={['dataMin - 50', 'dataMax + 50']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--popover-foreground))'
                }}
              />
              <Area
                type="monotone"
                dataKey="trophies"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorTrophiesMe)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
