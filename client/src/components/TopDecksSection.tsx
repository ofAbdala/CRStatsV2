/**
 * TopDecksSection — Top community decks with arena filter and upvoting.
 * Story 2.7: Community & Social Features (AC10, AC11)
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, ThumbsUp, Loader2, Swords, BarChart3 } from "lucide-react";
import { api, type TopDecksResponse } from "@/lib/api";
import PageErrorState from "@/components/PageErrorState";
import { getApiErrorMessage } from "@/lib/errorMessages";
import { useLocale } from "@/hooks/use-locale";

const ARENA_OPTIONS = [
  { value: "all", label: "All Arenas" },
  { value: "1", label: "Arena 1 - Goblin Stadium" },
  { value: "2", label: "Arena 2 - Bone Pit" },
  { value: "3", label: "Arena 3 - Barbarian Bowl" },
  { value: "4", label: "Arena 4 - P.E.K.K.A's Playhouse" },
  { value: "5", label: "Arena 5 - Spell Valley" },
  { value: "6", label: "Arena 6 - Builder's Workshop" },
  { value: "7", label: "Arena 7 - Royal Arena" },
  { value: "8", label: "Arena 8 - Frozen Peak" },
  { value: "9", label: "Arena 9 - Jungle Arena" },
  { value: "10", label: "Arena 10 - Hog Mountain" },
  { value: "11", label: "Arena 11 - Electro Valley" },
  { value: "12", label: "Arena 12 - Spooky Town" },
  { value: "13", label: "Arena 13 - Rascal's Hideout" },
  { value: "14", label: "Arena 14 - Serenity Peak" },
  { value: "15", label: "Arena 15 - Legendary Arena" },
];

export default function TopDecksSection() {
  const { t } = useLocale();
  const [selectedArena, setSelectedArena] = useState<string>("all");

  const arenaFilter = selectedArena !== "all" ? Number(selectedArena) : undefined;

  const topDecksQuery = useQuery({
    queryKey: ["community-top-decks", arenaFilter],
    queryFn: () => api.community.getTopDecks({ arena: arenaFilter }),
  });

  const decks = topDecksQuery.data?.decks || [];

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-orange-500" />
            Top Decks This Week
          </CardTitle>
          <Select value={selectedArena} onValueChange={setSelectedArena}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filter by arena" />
            </SelectTrigger>
            <SelectContent>
              {ARENA_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {topDecksQuery.isLoading ? (
          <div className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading top decks...
          </div>
        ) : topDecksQuery.isError ? (
          <PageErrorState
            title="Failed to load top decks"
            description={getApiErrorMessage(topDecksQuery.error, t)}
            error={topDecksQuery.error}
            onRetry={() => topDecksQuery.refetch()}
          />
        ) : decks.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No deck data available yet. Play some battles to populate community stats.
          </p>
        ) : (
          <div className="space-y-3">
            {decks.map((deck, idx) => (
              <div
                key={deck.deckHash}
                className="flex items-start justify-between gap-4 py-3 px-3 rounded-md hover:bg-muted/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-muted-foreground text-sm font-medium w-6 text-right">
                      #{idx + 1}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {deck.cards.map((card, cardIdx) => (
                        <Badge key={cardIdx} variant="secondary" className="text-xs">
                          {card}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground ml-8">
                    {deck.archetype && (
                      <Badge variant="outline" className="text-xs">
                        {deck.archetype}
                      </Badge>
                    )}
                    {deck.avgElixir != null && (
                      <span>Avg: {deck.avgElixir.toFixed(1)}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-yellow-500" />
                      {(deck.winRate * 100).toFixed(1)}% WR
                    </span>
                    <span className="flex items-center gap-1">
                      <BarChart3 className="w-3 h-3" />
                      {(deck.usageRate * 100).toFixed(1)}% usage
                    </span>
                    <span>{deck.sampleSize.toLocaleString()} games</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {deck.votes > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ThumbsUp className="w-3 h-3" />
                      {deck.votes}
                    </span>
                  )}
                  <Link href={`/deck/${deck.deckHash}`}>
                    <Button variant="outline" size="sm" className="text-xs">
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
