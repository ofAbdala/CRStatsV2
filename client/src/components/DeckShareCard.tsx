/**
 * DeckShareCard — Share a deck via URL with native share API support.
 * Story 2.7: Community & Social Features (AC9)
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Share2, Copy, Check, ExternalLink } from "lucide-react";

interface DeckShareCardProps {
  /** Encoded deck string for URL */
  encodedDeck: string;
  /** Card names in the deck */
  cards: string[];
  /** Average elixir cost */
  avgElixir?: number;
  /** Copy-to-game deep link */
  copyLink?: string | null;
  /** Number of community votes */
  votes?: number;
  className?: string;
}

export default function DeckShareCard({
  encodedDeck,
  cards,
  avgElixir,
  copyLink,
  votes,
  className,
}: DeckShareCardProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/deck/${encodedDeck}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Clash Royale Deck - CRStats",
          text: `Check out this deck: ${cards.join(", ")}`,
          url: shareUrl,
        });
      } catch {
        // User cancelled or share failed — fall through to clipboard
        await copyToClipboard();
      }
    } else {
      await copyToClipboard();
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  };

  return (
    <Card className={`border-border/50 bg-card/50 ${className || ""}`}>
      <CardContent className="pt-4 space-y-3">
        <div className="flex flex-wrap gap-1">
          {cards.map((card, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {card}
            </Badge>
          ))}
        </div>

        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {avgElixir != null && (
            <span>Avg Elixir: {avgElixir.toFixed(1)}</span>
          )}
          {typeof votes === "number" && votes > 0 && (
            <span>{votes} vote{votes !== 1 ? "s" : ""}</span>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleShare}>
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-1" />
                Copied!
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 mr-1" />
                Share
              </>
            )}
          </Button>

          <Button variant="outline" size="sm" onClick={copyToClipboard}>
            <Copy className="w-4 h-4 mr-1" />
            Copy Link
          </Button>

          {copyLink && (
            <Button variant="default" size="sm" asChild>
              <a href={copyLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-1" />
                Copy to Game
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
