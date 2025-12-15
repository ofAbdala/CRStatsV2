import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/hooks/use-locale";
import { useProfile } from "@/hooks/useProfile";
import { useClashBattles } from "@/hooks/useClashPlayer";
import { getCardImageUrl } from "@/lib/clashIcons";
import { TrendingUp, TrendingDown, Copy, Crosshair, Layers } from "lucide-react";
import { toast } from "sonner";

interface MetaDeck {
  id: number;
  deckHash: string;
  cards: string[];
  winRate: number | null;
  usageCount: number;
  avgTrophies: number;
  archetype: string | null;
}

interface ComputedDeck {
  deckHash: string;
  cards: { name: string; iconUrls?: { medium?: string }; elixirCost?: number; level?: number }[];
  wins: number;
  losses: number;
  total: number;
  winRate: number;
}

export default function DecksPage() {
  const { t } = useLocale();
  const { data: profile } = useProfile();
  const playerTag = (profile as any)?.clashTag;
  
  const { data: battles, isLoading: battlesLoading } = useClashBattles(playerTag);
  
  const { data: metaDecks, isLoading: metaLoading } = useQuery<MetaDeck[]>({
    queryKey: ['meta-decks'],
    queryFn: async () => {
      const res = await fetch('/api/meta/decks', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch meta decks');
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  const myDecks = useMemo(() => {
    if (!battles || !Array.isArray(battles)) return [];
    
    const deckMap = new Map<string, ComputedDeck>();
    
    for (const battle of battles) {
      if (!battle.team?.[0]?.cards) continue;
      
      const cards = battle.team[0].cards;
      const cardNames = cards.map((c: any) => c.name).sort();
      const deckHash = cardNames.join('|');
      
      const isWin = battle.team[0].crowns > (battle.opponent?.[0]?.crowns || 0);
      const isLoss = battle.team[0].crowns < (battle.opponent?.[0]?.crowns || 0);
      
      if (deckMap.has(deckHash)) {
        const existing = deckMap.get(deckHash)!;
        existing.total++;
        if (isWin) existing.wins++;
        if (isLoss) existing.losses++;
        existing.winRate = existing.total > 0 ? (existing.wins / existing.total) * 100 : 0;
      } else {
        deckMap.set(deckHash, {
          deckHash,
          cards: cards,
          wins: isWin ? 1 : 0,
          losses: isLoss ? 1 : 0,
          total: 1,
          winRate: isWin ? 100 : 0,
        });
      }
    }
    
    return Array.from(deckMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [battles]);

  return (
    <DashboardLayout>
      <div className="space-y-8" data-testid="decks-page">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground" data-testid="text-decks-title">
            {t('decks.title')}
          </h1>
          <p className="text-muted-foreground" data-testid="text-decks-subtitle">
            {t('decks.subtitle')}
          </p>
        </div>

        <Tabs defaultValue="my-decks" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]" data-testid="tabs-decks">
            <TabsTrigger value="my-decks" data-testid="tab-my-decks">{t('decks.myDecks')}</TabsTrigger>
            <TabsTrigger value="meta-decks" data-testid="tab-meta-decks">{t('decks.metaDecks')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="my-decks" className="mt-6 space-y-6" data-testid="content-my-decks">
            {battlesLoading ? (
              <DecksLoadingSkeleton />
            ) : !playerTag ? (
              <EmptyStateCard
                icon={<Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />}
                title={t('decks.noDecks')}
                description={t('decks.noDecksDesc')}
                testId="empty-no-tag"
              />
            ) : myDecks.length === 0 ? (
              <EmptyStateCard
                icon={<Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />}
                title={t('decks.noDecks')}
                description={t('decks.noDecksDesc')}
                testId="empty-no-decks"
              />
            ) : (
              myDecks.map((deck, index) => (
                <MyDeckCard
                  key={deck.deckHash}
                  deck={deck}
                  isMain={index === 0}
                  t={t}
                />
              ))
            )}
          </TabsContent>
          
          <TabsContent value="meta-decks" className="mt-6 space-y-6" data-testid="content-meta-decks">
            {metaLoading ? (
              <DecksLoadingSkeleton />
            ) : !metaDecks || metaDecks.length === 0 ? (
              <EmptyStateCard
                icon={<Crosshair className="w-12 h-12 mx-auto mb-4 opacity-50" />}
                title={t('decks.noMetaDecks')}
                description={t('decks.noMetaDecksDesc')}
                testId="empty-no-meta"
              />
            ) : (
              metaDecks.map((deck) => (
                <MetaDeckCard key={deck.id} deck={deck} t={t} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function MyDeckCard({ deck, isMain, t }: { deck: ComputedDeck; isMain: boolean; t: (key: string) => string }) {
  const avgElixir = useMemo(() => {
    const total = deck.cards.reduce((sum, card) => sum + (card.elixirCost || 0), 0);
    return (total / deck.cards.length).toFixed(1);
  }, [deck.cards]);

  const handleCopyLink = () => {
    const cardNames = deck.cards.map((c) => c.name).join(', ');
    navigator.clipboard.writeText(cardNames);
    toast.success(t('decks.copyLink'));
  };

  return (
    <Card 
      className="border-border/50 bg-card/50 backdrop-blur-sm group hover:border-primary/30 transition-all"
      data-testid={`card-my-deck-${deck.deckHash.substring(0, 20)}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <CardTitle data-testid="text-deck-name">
              {deck.cards.slice(0, 2).map((c) => c.name).join(' + ')}
            </CardTitle>
            {isMain && (
              <Badge 
                className="bg-primary/20 text-primary border-primary/20 hover:bg-primary/30"
                data-testid="badge-main-deck"
              >
                {t('decks.mainDeck')}
              </Badge>
            )}
            <Badge variant="outline" className="text-muted-foreground">
              {avgElixir} {t('decks.elixir')}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 font-medium" data-testid="text-win-rate">
              {deck.winRate >= 50 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className={deck.winRate >= 50 ? "text-green-500" : "text-red-500"}>
                {deck.winRate.toFixed(0)}% {t('decks.winRate')}
              </span>
            </div>
            <span className="text-muted-foreground" data-testid="text-matches">
              {deck.total} {t('decks.matches')}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-8 gap-2 mb-4">
          {deck.cards.map((card, idx) => (
            <div 
              key={`${card.name}-${idx}`} 
              className="relative aspect-[4/5] bg-black/40 rounded overflow-hidden border border-white/10 group-hover:border-white/20 transition-colors"
              data-testid={`card-image-${card.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <img 
                src={card.iconUrls?.medium || getCardImageUrl(card.name)} 
                alt={card.name} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getCardImageUrl(card.name);
                }}
              />
              {card.level && (
                <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[10px] text-center py-0.5 text-white font-bold">
                  Lvl {card.level}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8"
            onClick={handleCopyLink}
            data-testid="button-copy-deck"
          >
            <Copy className="w-3.5 h-3.5 mr-2" />
            {t('decks.copyLink')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MetaDeckCard({ deck, t }: { deck: MetaDeck; t: (key: string) => string }) {
  const handleCopyLink = () => {
    navigator.clipboard.writeText(deck.cards.join(', '));
    toast.success(t('decks.copyLink'));
  };

  return (
    <Card 
      className="border-border/50 bg-card/50 backdrop-blur-sm group hover:border-primary/30 transition-all"
      data-testid={`card-meta-deck-${deck.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <CardTitle data-testid="text-meta-deck-archetype">
              {deck.archetype || deck.cards.slice(0, 2).join(' + ')}
            </CardTitle>
            <Badge variant="outline" className="text-muted-foreground">
              {t('decks.usageCount')}: {deck.usageCount}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {deck.winRate !== null && (
              <div className="flex items-center gap-1.5 font-medium" data-testid="text-meta-win-rate">
                {deck.winRate >= 50 ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
                <span className={deck.winRate >= 50 ? "text-green-500" : "text-red-500"}>
                  {deck.winRate.toFixed(0)}% {t('decks.winRate')}
                </span>
              </div>
            )}
            <span className="text-muted-foreground" data-testid="text-avg-trophies">
              {t('decks.avgTrophies')}: {deck.avgTrophies.toLocaleString()}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-8 gap-2 mb-4">
          {deck.cards.map((cardName, idx) => (
            <div 
              key={`${cardName}-${idx}`} 
              className="relative aspect-[4/5] bg-black/40 rounded overflow-hidden border border-white/10 group-hover:border-white/20 transition-colors"
              data-testid={`meta-card-image-${cardName.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <img 
                src={getCardImageUrl(cardName)} 
                alt={cardName} 
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8"
            onClick={handleCopyLink}
            data-testid="button-copy-meta-deck"
          >
            <Copy className="w-3.5 h-3.5 mr-2" />
            {t('decks.copyLink')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyStateCard({ 
  icon, 
  title, 
  description,
  testId
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  testId: string;
}) {
  return (
    <div 
      className="text-center py-12 text-muted-foreground bg-card/30 rounded-lg border border-border border-dashed"
      data-testid={testId}
    >
      {icon}
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function DecksLoadingSkeleton() {
  return (
    <div className="space-y-6" data-testid="decks-loading">
      {[1, 2].map((i) => (
        <Card key={i} className="border-border/50 bg-card/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-5 w-20" />
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-8 gap-2 mb-4">
              {[...Array(8)].map((_, j) => (
                <Skeleton key={j} className="aspect-[4/5]" />
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Skeleton className="h-8 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
