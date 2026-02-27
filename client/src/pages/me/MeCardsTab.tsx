import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Swords,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Lock,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ClashCardImage from "@/components/clash/ClashCardImage";
import type { MeDataContext } from "./types";

interface MeCardsTabProps {
  data: MeDataContext;
}

export function MeCardsTab({ data }: MeCardsTabProps) {
  const { player, isPro, battlesLoading, deckUsage, archetypeAnalysis, t } = data;

  return (
    <div className="space-y-6">
      {/* Current Deck */}
      <Card
        className="border-border/50 bg-gradient-to-br from-card via-card/95 to-primary/5 backdrop-blur-sm"
        data-testid="deck-current"
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            {t('pages.me.currentDeck.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {player?.currentDeck?.length > 0 ? (
            <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
              {player.currentDeck.map((card: any, idx: number) => (
                <div key={card?.id || idx} className="flex flex-col items-center">
                  <ClashCardImage
                    name={card?.name || "Card"}
                    iconUrls={card?.iconUrls}
                    size="md"
                    showLevel={false}
                    className="w-14 h-16 md:w-16 md:h-20 rounded bg-background/30 border-0"
                  />
                  <span className="text-[10px] md:text-xs text-muted-foreground mt-1 text-center truncate w-full">
                    {card?.name}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">{t('pages.me.currentDeck.noDeckEquipped')}</p>
          )}
        </CardContent>
      </Card>

      {/* Most Used Decks */}
      <div>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Swords className="w-5 h-5 text-primary" />
          {t('pages.me.mostUsedDecks.title')}
        </h3>
        {deckUsage.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deckUsage.map((deck, idx) => (
              <Card
                key={idx}
                className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-colors"
                data-testid={`deck-most-used-${idx}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{deck.name}</CardTitle>
                    <Badge
                      variant="outline"
                      className={cn(
                        deck.winRate >= 50
                          ? "border-green-500/50 text-green-500"
                          : "border-red-500/50 text-red-500"
                      )}
                    >
                      <Trophy className="w-3 h-3 mr-1" />
                      {deck.winRate}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-4 gap-1">
                    {deck.cards.slice(0, 8).map((card: any, cardIdx: number) => (
                      <ClashCardImage
                        key={card?.id || cardIdx}
                        name={card?.name || "Card"}
                        iconUrls={card?.iconUrls}
                        size="sm"
                        showLevel={false}
                        className="w-10 h-12 rounded bg-background/30 border-0"
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Swords className="w-3 h-3" />
                      {t('pages.me.mostUsedDecks.matches', { count: deck.total })}
                    </span>
                    <span>
                      <span className="text-green-500">{deck.wins}V</span>
                      {' / '}
                      <span className="text-red-500">{deck.losses}D</span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="py-8 text-center text-muted-foreground">
              {battlesLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('pages.me.mostUsedDecks.analyzingBattles')}
                </div>
              ) : (
                t('pages.me.mostUsedDecks.noBattlesForAnalysis')
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Strengths */}
        <Card
          className="border-border/50 bg-card/50 backdrop-blur-sm"
          data-testid="analysis-strengths"
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ThumbsUp className="w-5 h-5 text-green-500" />
              {t('pages.me.strengthsWeaknesses.strengths')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {archetypeAnalysis.strengths.length > 0 ? (
              archetypeAnalysis.strengths.map((strength, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20"
                >
                  <div>
                    <p className="font-medium text-green-500">{t('pages.me.strengthsWeaknesses.goodAgainst', { archetype: strength.archetype })}</p>
                    <p className="text-xs text-muted-foreground">{t('pages.me.strengthsWeaknesses.matches', { count: strength.matches })}</p>
                  </div>
                  <Badge variant="outline" className="border-green-500/50 text-green-500">
                    {strength.winRate}% WR
                  </Badge>
                </div>
              ))
            ) : (
              <div className="relative">
                <div className={cn(
                  "p-3 rounded-lg bg-muted/50 border border-border/50",
                  !isPro && "blur-sm"
                )}>
                  <p className="font-medium text-green-500">{t('pages.me.strengthsWeaknesses.goodAgainst', { archetype: t('pages.me.archetype.cycle') })}</p>
                  <p className="text-xs text-muted-foreground">{t('pages.me.strengthsWeaknesses.analysisBasedOnBattles')}</p>
                </div>
                {!isPro && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Badge variant="outline" className="bg-background/80 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      PRO
                    </Badge>
                  </div>
                )}
              </div>
            )}
            {archetypeAnalysis.strengths.length === 0 && isPro && (
              <p className="text-sm text-muted-foreground text-center py-2">
                {t('pages.me.strengthsWeaknesses.playMoreForStrengths')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Weaknesses */}
        <Card
          className="border-border/50 bg-card/50 backdrop-blur-sm"
          data-testid="analysis-weaknesses"
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ThumbsDown className="w-5 h-5 text-red-500" />
              {t('pages.me.strengthsWeaknesses.weaknesses')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {archetypeAnalysis.weaknesses.length > 0 ? (
              archetypeAnalysis.weaknesses.map((weakness, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                >
                  <div>
                    <p className="font-medium text-red-500">{t('pages.me.strengthsWeaknesses.difficultyAgainst', { archetype: weakness.archetype })}</p>
                    <p className="text-xs text-muted-foreground">{t('pages.me.strengthsWeaknesses.matches', { count: weakness.matches })}</p>
                  </div>
                  <Badge variant="outline" className="border-red-500/50 text-red-500">
                    {weakness.winRate}% WR
                  </Badge>
                </div>
              ))
            ) : (
              <div className="relative">
                <div className={cn(
                  "p-3 rounded-lg bg-muted/50 border border-border/50",
                  !isPro && "blur-sm"
                )}>
                  <p className="font-medium text-red-500">{t('pages.me.strengthsWeaknesses.difficultyAgainst', { archetype: t('pages.me.archetype.beatdown') })}</p>
                  <p className="text-xs text-muted-foreground">{t('pages.me.strengthsWeaknesses.analysisBasedOnBattles')}</p>
                </div>
                {!isPro && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Badge variant="outline" className="bg-background/80 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      PRO
                    </Badge>
                  </div>
                )}
              </div>
            )}
            {archetypeAnalysis.weaknesses.length === 0 && isPro && (
              <p className="text-sm text-muted-foreground text-center py-2">
                {t('pages.me.strengthsWeaknesses.playMoreForWeaknesses')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
