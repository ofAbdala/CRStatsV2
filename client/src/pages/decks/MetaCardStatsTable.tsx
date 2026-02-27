/**
 * MetaCardStatsTable -- Card-level meta statistics table.
 *
 * Renders a sortable table of cards/evolutions/heroes/tower troops with
 * win rate and usage rate bars. Used within MetaDecksTab's inner tabs.
 *
 * Extracted from the original decks.tsx god-file (Story 1.7, TD-002).
 */

import { useMemo, useState } from "react";

import ClashCardImage from "@/components/clash/ClashCardImage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocale } from "@/hooks/use-locale";

import {
  type MetaCardGroup,
  type MetaCardRow,
  type MetaCardSort,
  type MetaMode,
  clamp,
  formatPercent,
  isMetaCardSort,
  isMetaMode,
} from "./types";

// ── MetaCardMetaTableView ────────────────────────────────────────────────────

function MetaCardMetaTableView({ rows, group }: { rows: MetaCardRow[]; group: MetaCardGroup }) {
  const { t } = useLocale();
  const [mode, setMode] = useState<MetaMode>("path-of-legends");
  const [sort, setSort] = useState<MetaCardSort>("win-rate");

  const filteredRows = useMemo(() => rows.filter((row) => row.group === group), [rows, group]);

  const sortedRows = useMemo(() => {
    const next = [...filteredRows];
    next.sort((a, b) => {
      if (sort === "usage-rate") return b.usageRate - a.usageRate;
      return b.winRate - a.winRate;
    });
    return next;
  }, [filteredRows, sort]);

  return (
    <div className="space-y-5">
      <Card className="border-border/50 bg-card/50">
        <CardContent className="py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs text-muted-foreground">{t("decks.meta.filters.mode")}</Label>
              <Select
                value={mode}
                onValueChange={(value) => {
                  if (isMetaMode(value)) setMode(value);
                }}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder={t("decks.meta.filters.modes.pathOfLegends")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="path-of-legends">{t("decks.meta.filters.modes.pathOfLegends")}</SelectItem>
                  <SelectItem value="trophy-road">{t("decks.meta.filters.modes.trophyRoad")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">{t("decks.meta.filters.sort")}</Label>
              <Select
                value={sort}
                onValueChange={(value) => {
                  if (isMetaCardSort(value)) setSort(value);
                }}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder={t("decks.meta.filters.sortByWinRate")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="win-rate">{t("decks.meta.filters.sortByWinRate")}</SelectItem>
                  <SelectItem value="usage-rate">{t("decks.meta.filters.sortByUsageRate")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            {/* UI-only for now; the mode selector will influence API calls later */}
            {mode === "path-of-legends"
              ? t("decks.meta.filters.modes.pathOfLegends")
              : t("decks.meta.filters.modes.trophyRoad")}
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {group === "cards"
              ? t("decks.meta.tabs.cards")
              : group === "evolutions"
                ? t("decks.meta.tabs.evolutions")
                : group === "heroes"
                  ? t("decks.meta.tabs.heroes")
                  : t("decks.meta.tabs.tower")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedRows.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">{t("pages.decks.emptyMetaDecks")}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[220px]">{t("decks.meta.tabs.cards")}</TableHead>
                  <TableHead className="min-w-[140px]">{t("decks.meta.winRate")}</TableHead>
                  <TableHead className="min-w-[140px]">{t("decks.meta.usageRate")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <ClashCardImage
                          name={row.name}
                          iconUrls={null}
                          level={null}
                          size="sm"
                          showLevel={false}
                        />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{row.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {t("decks.meta.sampleSize")}: {Math.round(row.games)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 rounded-full bg-muted/40 overflow-hidden">
                          <div
                            className="h-full bg-green-500/80"
                            style={{ width: `${clamp(row.winRate * 100, 0, 100)}%` }}
                          />
                        </div>
                        <span className="tabular-nums">{formatPercent(row.winRate)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 rounded-full bg-muted/40 overflow-hidden">
                          <div
                            className="h-full bg-primary/80"
                            style={{ width: `${clamp(row.usageRate * 100, 0, 100)}%` }}
                          />
                        </div>
                        <span className="tabular-nums">{formatPercent(row.usageRate)}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Convenience wrappers per card group ──────────────────────────────────────

export function MetaCardsView({ rows }: { rows: MetaCardRow[] }) {
  return <MetaCardMetaTableView rows={rows} group="cards" />;
}

export function MetaEvolutionsView({ rows }: { rows: MetaCardRow[] }) {
  return <MetaCardMetaTableView rows={rows} group="evolutions" />;
}

export function MetaHeroesView({ rows }: { rows: MetaCardRow[] }) {
  return <MetaCardMetaTableView rows={rows} group="heroes" />;
}

export function MetaTowerTroopsView({ rows }: { rows: MetaCardRow[] }) {
  return <MetaCardMetaTableView rows={rows} group="tower" />;
}
