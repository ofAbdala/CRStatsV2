/**
 * DeckPage — Client-rendered deck share view with card list, stats, and share actions.
 * Story 2.7: Community & Social Features (AC7, AC8, AC9)
 */
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageErrorState from "@/components/PageErrorState";
import DeckShareCard from "@/components/DeckShareCard";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, type DeckShareData } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errorMessages";
import { useLocale } from "@/hooks/use-locale";

export default function DeckPage() {
  const { t } = useLocale();
  const [, params] = useRoute("/deck/:encoded");
  const encoded = params?.encoded || "";

  const deckQuery = useQuery({
    queryKey: ["deck-share", encoded],
    queryFn: () => api.deckShare.get(encoded),
    enabled: Boolean(encoded),
  });

  if (deckQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (deckQuery.isError) {
    return (
      <DashboardLayout>
        <PageErrorState
          title="Failed to load deck"
          description={getApiErrorMessage(deckQuery.error, t)}
        />
      </DashboardLayout>
    );
  }

  const data = deckQuery.data as DeckShareData | undefined;
  if (!data) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Link href="/community">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Community
          </Button>
        </Link>

        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Shared Deck</h1>
          <p className="text-muted-foreground">
            {data.cards.length} cards &middot; Avg Elixir: {data.avgElixir.toFixed(1)}
          </p>
        </div>

        <DeckShareCard
          encodedDeck={data.encodedDeck}
          cards={data.cards.map((c) => c.name)}
          avgElixir={data.avgElixir}
          copyLink={data.copyLink}
        />
      </div>
    </DashboardLayout>
  );
}
