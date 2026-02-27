import { Badge } from "@/components/ui/badge";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Crown,
  TrendingUp,
  TrendingDown,
  Clock,
  Swords,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { parseBattleTime } from "@/lib/pushUtils";
import ClashCardImage from "@/components/clash/ClashCardImage";

function formatGameMode(type: string | undefined, t: (key: string) => string): string {
  if (!type) return t('pages.me.battleType.unknown');
  const lowerType = type.toLowerCase();

  if (lowerType.includes('ladder') || lowerType.includes('pvp')) return t('pages.me.battleType.ladder');
  if (lowerType.includes('challenge')) return t('pages.me.battleType.challenge');
  if (lowerType.includes('tournament')) return t('pages.me.battleType.tournament');
  if (lowerType.includes('2v2')) return '2v2';
  if (lowerType.includes('war')) return t('pages.me.battleType.war');
  if (lowerType.includes('friendly')) return t('pages.me.battleType.friendly');
  if (lowerType.includes('party')) return t('pages.me.battleType.party');

  return type.replace(/([A-Z])/g, ' $1').trim();
}

interface BattleRowProps {
  battle: any;
  idx: number;
  locale: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function BattleRow({ battle, idx, locale, t }: BattleRowProps) {
  const dateFnsLocale = locale === 'pt-BR' ? ptBR : enUS;
  const teamCrowns = battle.team?.[0]?.crowns || 0;
  const opponentCrowns = battle.opponent?.[0]?.crowns || 0;
  const isWin = teamCrowns > opponentCrowns;
  const isDraw = teamCrowns === opponentCrowns;
  const trophyChange = battle.team?.[0]?.trophyChange;
  const battleTime = battle.battleTime ? parseBattleTime(battle.battleTime) : null;
  const playerCards = battle.team?.[0]?.cards || [];
  const opponentCards = battle.opponent?.[0]?.cards || [];
  const opponent = battle.opponent?.[0];
  const gameMode = formatGameMode(battle.type, t);

  return (
    <AccordionItem
      key={idx}
      value={`match-${idx}`}
      className={cn(
        "border rounded-lg overflow-hidden transition-colors",
        isWin && !isDraw
          ? "bg-green-500/5 border-green-500/20 hover:bg-green-500/10"
          : isDraw
            ? "bg-muted/50 border-border/50 hover:bg-muted/70"
            : "bg-red-500/5 border-red-500/20 hover:bg-red-500/10"
      )}
      data-testid={`match-row-${idx}`}
    >
      <AccordionTrigger className="px-4 py-3 hover:no-underline">
        <div className="flex items-center justify-between w-full pr-4">
          <div className="flex items-center gap-3">
            <Badge
              variant={isWin && !isDraw ? "default" : isDraw ? "secondary" : "destructive"}
              className={cn(
                "min-w-[70px] justify-center",
                isWin && !isDraw && "bg-green-600 hover:bg-green-700"
              )}
            >
              {isWin && !isDraw ? t('pages.me.result.win') : isDraw ? t('pages.me.result.draw') : t('pages.me.result.loss')}
            </Badge>

            {/* Desktop info */}
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Crown className="w-4 h-4 text-yellow-500" />
                <span className="font-bold">{teamCrowns} x {opponentCrowns}</span>
              </div>
              <Badge variant="outline" className="font-normal">{gameMode}</Badge>
              {trophyChange !== undefined && trophyChange !== null && (
                <span className={cn(
                  "font-medium text-sm flex items-center gap-1",
                  trophyChange > 0 ? "text-green-500" : trophyChange < 0 ? "text-red-500" : "text-muted-foreground"
                )}>
                  {trophyChange > 0 ? <TrendingUp className="w-3 h-3" /> : trophyChange < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                  {trophyChange > 0 ? '+' : ''}{trophyChange}
                </span>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-medium">{opponent?.name || t('pages.me.opponentFallback')}</span>
                {opponent?.tag && (
                  <span className="text-xs text-muted-foreground font-mono">{opponent.tag}</span>
                )}
              </div>
            </div>

            {/* Mobile info */}
            <div className="flex md:hidden flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold">{teamCrowns} x {opponentCrowns}</span>
                {trophyChange !== undefined && trophyChange !== null && (
                  <span className={cn(
                    "text-xs font-medium",
                    trophyChange > 0 ? "text-green-500" : trophyChange < 0 ? "text-red-500" : "text-muted-foreground"
                  )}>
                    ({trophyChange > 0 ? '+' : ''}{trophyChange})
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{t('pages.me.vs')} {opponent?.name || t('pages.me.opponentFallback')}</span>
            </div>
          </div>

          <div className="text-right text-xs text-muted-foreground hidden sm:block">
            {battleTime && (
              <span>{formatDistanceToNow(battleTime, { addSuffix: true, locale: dateFnsLocale })}</span>
            )}
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent data-testid={`match-details-${idx}`}>
        <div className="px-4 pb-4 pt-2 space-y-4">
          <div className="sm:hidden text-xs text-muted-foreground">
            {battleTime && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(battleTime, { addSuffix: true, locale: dateFnsLocale })}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 text-sm">
            <Badge variant="outline">{gameMode}</Badge>
            {opponent?.tag && (
              <span className="text-muted-foreground">
                {t('pages.me.opponent')}: <span className="font-mono">{opponent.tag}</span>
              </span>
            )}
            {battle.deckSelection && (
              <span className="text-muted-foreground">
                {t('pages.me.deckSelection')}: {battle.deckSelection}
              </span>
            )}
          </div>

          {playerCards.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Swords className="w-4 h-4 text-primary" />
                {t('pages.me.yourDeck')}
              </h4>
              <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5">
                {playerCards.map((card: any, cardIdx: number) => (
                  <div key={card?.id || cardIdx} className="flex flex-col items-center">
                    <ClashCardImage
                      name={card?.name || "Card"}
                      iconUrls={card?.iconUrls}
                      size="md"
                      showLevel={false}
                      className="w-12 h-14 md:w-14 md:h-16 rounded bg-background/50 border-0"
                    />
                    <span className="text-[10px] text-muted-foreground mt-0.5 text-center truncate w-full">
                      {card?.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {opponentCards.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-500" />
                {t('pages.me.opponentDeck')}
              </h4>
              <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5">
                {opponentCards.map((card: any, cardIdx: number) => (
                  <div key={card?.id || cardIdx} className="flex flex-col items-center">
                    <ClashCardImage
                      name={card?.name || "Card"}
                      iconUrls={card?.iconUrls}
                      size="md"
                      showLevel={false}
                      className="w-12 h-14 md:w-14 md:h-16 rounded bg-background/50 border-0"
                    />
                    <span className="text-[10px] text-muted-foreground mt-0.5 text-center truncate w-full">
                      {card?.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
