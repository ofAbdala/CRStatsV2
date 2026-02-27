/**
 * DecksPage -- Thin shell/orchestrator for the Decks feature.
 *
 * Manages top-level tab state via URL query parameter (?tab=meta|counter|optimizer)
 * and renders the appropriate tab component. All feature logic lives in the
 * individual tab modules.
 *
 * Story 2.1: Added arena selector that defaults to player's current arena.
 *
 * Extracted from the original decks.tsx god-file (Story 1.7, TD-002).
 */

import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocale } from "@/hooks/use-locale";
import { usePlayerSync } from "@/hooks/usePlayerSync";
import { api } from "@/lib/api";
import { buildDeckStatsFromBattles } from "@/lib/analytics/deckStats";

import { MetaDecksTab } from "./MetaDecksTab";
import { CounterDeckBuilder } from "./CounterDeckBuilder";
import { DeckOptimizer } from "./DeckOptimizer";
import { type MetaDeck, isDecksTab, ARENA_OPTIONS, getArenaName } from "./types";

export default function DecksPage() {
  const { t } = useLocale();

  const search = useSearch();
  const [, setLocation] = useLocation();

  const tabParam = new URLSearchParams(search).get("tab");
  const tab = isDecksTab(tabParam) ? tabParam : "meta";

  useEffect(() => {
    if (tabParam !== tab) {
      setLocation(`/decks?tab=${tab}`, { replace: true });
    }
  }, [setLocation, tab, tabParam]);

  const { sync, isLoading: syncLoading, isFetching: syncFetching, refresh } = usePlayerSync();

  // Detect player's current arena from sync data (Story 2.1, AC3)
  const playerArenaId = useMemo(() => {
    const arenaObj = (sync?.player as any)?.arena;
    if (arenaObj && typeof arenaObj === "object" && typeof arenaObj.id === "number") {
      return arenaObj.id;
    }
    // Fallback: infer from trophies
    const trophies = (sync?.player as any)?.trophies;
    if (typeof trophies === "number" && trophies >= 3000) {
      if (trophies >= 6600) return 54;
      if (trophies >= 6300) return 20;
      if (trophies >= 6000) return 19;
      if (trophies >= 5600) return 18;
      if (trophies >= 5300) return 17;
      if (trophies >= 5000) return 16;
      if (trophies >= 4600) return 15;
      if (trophies >= 4300) return 14;
      if (trophies >= 4000) return 13;
      if (trophies >= 3600) return 12;
      if (trophies >= 3300) return 11;
      return 10;
    }
    return 15; // Default to Arena 15
  }, [sync?.player]);

  const [selectedArena, setSelectedArena] = useState<number | null>(null);
  const arenaId = selectedArena ?? playerArenaId;

  // Update selected arena when player data loads
  useEffect(() => {
    if (selectedArena === null && playerArenaId !== 15) {
      setSelectedArena(playerArenaId);
    }
  }, [playerArenaId, selectedArena]);

  const metaDecksQuery = useQuery({
    queryKey: ["meta-decks"],
    queryFn: () => api.decks.getMetaDecks() as Promise<MetaDeck[]>,
    staleTime: 60 * 60 * 1000,
  });

  const battles = sync?.battles || [];
  const myDecks = useMemo(() => buildDeckStatsFromBattles(battles, { limit: 10 }), [battles]);

  const metaDecks = metaDecksQuery.data || [];
  const hasStaleCache = metaDecks.some((deck) => deck.cacheStatus === "stale");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top-level tab navigation + arena selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Tabs
            value={tab}
            onValueChange={(value) => {
              if (isDecksTab(value)) {
                setLocation(`/decks?tab=${value}`);
              }
            }}
          >
            <TabsList>
              <TabsTrigger value="meta">{t("decks.meta.title") || "Meta"}</TabsTrigger>
              <TabsTrigger value="counter">{t("decks.counter.title") || "Counter"}</TabsTrigger>
              <TabsTrigger value="optimizer">{t("nav.decks") || "Optimizer"}</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Arena selector (Story 2.1, AC3) */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Arena:</Label>
            <Select
              value={String(arenaId)}
              onValueChange={(value) => {
                const parsed = Number.parseInt(value, 10);
                if (Number.isFinite(parsed)) setSelectedArena(parsed);
              }}
            >
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="Select Arena" />
              </SelectTrigger>
              <SelectContent>
                {ARENA_OPTIONS.map((arena) => (
                  <SelectItem key={arena.id} value={String(arena.id)}>
                    {arena.name}
                    {arena.id === playerArenaId ? " (You)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {tab === "meta" ? (
          <MetaDecksTab
            metaDecks={metaDecks}
            hasStaleCache={hasStaleCache}
            isLoading={metaDecksQuery.isLoading}
            isError={metaDecksQuery.isError}
            error={metaDecksQuery.error}
            onRetry={() => metaDecksQuery.refetch()}
            arenaId={arenaId}
          />
        ) : tab === "counter" ? (
          <CounterDeckBuilder arenaId={arenaId} />
        ) : (
          <DeckOptimizer
            myDecks={myDecks}
            syncLoading={syncLoading}
            syncFetching={syncFetching}
            onRefresh={() => {
              refresh().catch(() => undefined);
            }}
          />
        )}

        {/* small a11y hint: keeps t() usage for this page intact when new keys are missing */}
        <span className="sr-only">{t("nav.decks")}</span>
      </div>
    </DashboardLayout>
  );
}
