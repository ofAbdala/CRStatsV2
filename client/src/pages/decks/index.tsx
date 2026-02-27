/**
 * DecksPage -- Thin shell/orchestrator for the Decks feature.
 *
 * Manages top-level tab state via URL query parameter (?tab=meta|counter|optimizer)
 * and renders the appropriate tab component. All feature logic lives in the
 * individual tab modules.
 *
 * Extracted from the original decks.tsx god-file (Story 1.7, TD-002).
 */

import { useEffect, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { useLocale } from "@/hooks/use-locale";
import { usePlayerSync } from "@/hooks/usePlayerSync";
import { api } from "@/lib/api";
import { buildDeckStatsFromBattles } from "@/lib/analytics/deckStats";

import { MetaDecksTab } from "./MetaDecksTab";
import { CounterDeckBuilder } from "./CounterDeckBuilder";
import { DeckOptimizer } from "./DeckOptimizer";
import { type MetaDeck, isDecksTab } from "./types";

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
      <div className="space-y-8">
        {tab === "meta" ? (
          <MetaDecksTab
            metaDecks={metaDecks}
            hasStaleCache={hasStaleCache}
            isLoading={metaDecksQuery.isLoading}
            isError={metaDecksQuery.isError}
            error={metaDecksQuery.error}
            onRetry={() => metaDecksQuery.refetch()}
          />
        ) : tab === "counter" ? (
          <CounterDeckBuilder />
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
