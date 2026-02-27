/**
 * DeckDisplay -- Shared deck card visualization components.
 *
 * Contains:
 * - DeckDisplay: A grid of ClashCardImage cards (used across all tabs)
 * - DeckSelectionCard: A selectable deck card button (used by Deck Optimizer)
 *
 * Extracted from the original decks.tsx god-file (Story 1.7, TD-002).
 */

import ClashCardImage from "@/components/clash/ClashCardImage";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";
import type { DeckStats } from "@/lib/analytics/deckStats";
import { TrendingDown, TrendingUp } from "lucide-react";

// ── DeckDisplay ──────────────────────────────────────────────────────────────

export type DeckDisplayCard = {
  name: string;
  iconUrls?: { medium?: string; small?: string } | null;
  level?: number | null;
};

type DeckDisplayProps = {
  /** Array of card names (strings) or card objects with name/icon/level */
  cards: Array<string | DeckDisplayCard>;
  /** Unique prefix for React keys (e.g. deck hash or identifier) */
  keyPrefix: string;
  /** Card image size */
  size?: "sm" | "md" | "lg";
  /** Whether to show level badge. Default: false for meta/counter, true for optimizer user decks */
  showLevel?: boolean;
  /** Grid column classes. Default: "grid-cols-4 sm:grid-cols-8" */
  gridClassName?: string;
};

function normalizeCard(card: string | DeckDisplayCard): DeckDisplayCard {
  if (typeof card === "string") {
    return { name: card, iconUrls: null, level: null };
  }
  return card;
}

export function DeckDisplay({
  cards,
  keyPrefix,
  size = "lg",
  showLevel = false,
  gridClassName = "grid-cols-4 sm:grid-cols-8",
}: DeckDisplayProps) {
  return (
    <div className={`grid gap-2 ${gridClassName}`}>
      {cards.slice(0, 8).map((card, index) => {
        const normalized = normalizeCard(card);
        return (
          <ClashCardImage
            key={`${keyPrefix}-${normalized.name}-${index}`}
            name={normalized.name}
            iconUrls={normalized.iconUrls ?? null}
            level={typeof normalized.level === "number" ? normalized.level : null}
            size={size}
            showLevel={showLevel}
          />
        );
      })}
    </div>
  );
}

// ── DeckSelectionCard ────────────────────────────────────────────────────────

export type DeckSelectionCardProps = {
  deck: DeckStats;
  index: number;
  isSelected: boolean;
  onSelect: (key: string) => void;
};

export function DeckSelectionCard({ deck, index, isSelected, onSelect }: DeckSelectionCardProps) {
  const { t } = useLocale();

  return (
    <button
      key={deck.key}
      type="button"
      onClick={() => onSelect(deck.key)}
      className={cn(
        "text-left rounded-xl border bg-card/30 p-4 transition-all hover:bg-card/40 hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        isSelected ? "border-primary/40 ring-2 ring-primary/20" : "border-border/50",
      )}
      aria-pressed={isSelected}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium truncate">
            {t("pages.decks.deckIndex", { index: index + 1 })}
          </span>
          {isSelected ? (
            <Badge className="bg-primary/20 text-primary border-primary/20">
              {t("decks.optimizer.selected")}
            </Badge>
          ) : null}
        </div>
        {typeof deck.avgElixir === "number" ? (
          <Badge variant="outline" className="text-muted-foreground text-xs">
            {t("pages.decks.avgElixir", { value: deck.avgElixir.toFixed(1) })}
          </Badge>
        ) : null}
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-3">
        {deck.cards.slice(0, 8).map((card, cardIndex) => (
          <ClashCardImage
            key={card.id || `${card.name}-${cardIndex}`}
            name={card.name}
            iconUrls={card.iconUrls}
            level={typeof card.level === "number" ? card.level : null}
            size="md"
          />
        ))}
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5 font-medium">
          {deck.winRate >= 50 ? (
            <TrendingUp className="w-4 h-4 text-green-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500" />
          )}
          <span className={deck.winRate >= 50 ? "text-green-500" : "text-red-500"}>
            {Math.round(deck.winRate)}% WR
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {t("pages.decks.matches", { count: deck.matches })}
        </span>
      </div>
    </button>
  );
}

export default DeckDisplay;
