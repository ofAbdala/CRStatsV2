/**
 * Smart contextual paywall (Story 2.6, AC5-AC6).
 *
 * Shows when a free user hits their daily limit. Displays contextual
 * messaging based on what the user was doing and the value they've
 * already received. Dismissible and non-blocking.
 */
import { useCallback } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles, X } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { PRICING } from "@shared/pricing";
import { trackFunnelEvent } from "@/lib/funnelTracking";

export interface PaywallContext {
  /** What triggered the paywall */
  trigger: "limit_reached" | "feature_locked" | "value_moment";
  /** Feature category that hit the limit */
  feature?: "coach" | "counter" | "meta" | "optimizer" | "push" | "training" | "analytics";
  /** Number of queries used today */
  used?: number;
  /** Daily limit for this feature */
  limit?: number;
  /** Win rate of the last counter deck found (for value messaging) */
  winRate?: number;
  /** Card name related to the last counter deck */
  card?: string;
  /** Number of counter decks found today */
  counterDecksFound?: number;
  /** Whether to suggest Elite instead of PRO */
  suggestElite?: boolean;
}

interface PaywallProps {
  open: boolean;
  onClose: () => void;
  context: PaywallContext;
}

export default function Paywall({ open, onClose, context }: PaywallProps) {
  const { t, locale } = useLocale();
  const [, setLocation] = useLocation();

  const proPriceText = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: PRICING.BRL.currency,
    minimumFractionDigits: 2,
  }).format(PRICING.BRL.monthlyPrice);

  const getMessage = useCallback(() => {
    if (context.trigger === "limit_reached" && context.used != null && context.limit != null) {
      return t("pages.paywall.limitReached", {
        used: String(context.used),
        limit: String(context.limit),
      });
    }

    if (context.trigger === "value_moment" && context.winRate && context.card) {
      return t("pages.paywall.valueMessage", {
        winRate: String(context.winRate),
        card: context.card,
      });
    }

    if (context.counterDecksFound) {
      return t("pages.paywall.genericValue", {
        count: String(context.counterDecksFound),
      });
    }

    if (context.trigger === "feature_locked") {
      if (context.suggestElite) {
        return t("pages.paywall.eliteRequired");
      }
      return t("pages.paywall.proRequired");
    }

    return t("pages.paywall.unlockPro", { price: proPriceText });
  }, [context, t, proPriceText]);

  const handleUpgrade = useCallback(() => {
    trackFunnelEvent("pricing_view", { source: "paywall" });
    onClose();
    setLocation("/pricing");
  }, [onClose, setLocation]);

  const handleDismiss = useCallback(() => {
    trackFunnelEvent("paywall_dismissed", {
      feature: context.feature || "unknown",
    });
    onClose();
  }, [onClose, context.feature]);

  // Track paywall shown
  if (open) {
    trackFunnelEvent("paywall_shown", {
      trigger: context.trigger,
      feature: context.feature || "unknown",
    });
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleDismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <DialogTitle className="text-lg font-bold">
              {context.suggestElite ? "CRStats Elite" : "CRStats PRO"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            {getMessage()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4 text-yellow-500 shrink-0" />
            <span>{t("pages.paywall.unlockPro", { price: proPriceText })}</span>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
              onClick={handleUpgrade}
            >
              {t("pages.paywall.viewPlans")}
            </Button>
            <Button
              variant="ghost"
              onClick={handleDismiss}
            >
              {t("pages.paywall.maybeLater")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
