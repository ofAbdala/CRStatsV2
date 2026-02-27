/**
 * Contextual conversion prompt (Story 2.6, AC7-AC8).
 *
 * Subtle, non-blocking upgrade prompt that appears at value moments:
 * - After a successful counter deck suggestion
 * - After push analysis reveals actionable insights
 * - After tilt detection and recovery
 *
 * Cooldown: max 1 prompt per session, max 3 per day.
 * Uses sessionStorage for session tracking and localStorage for daily tracking.
 */
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, X } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { trackFunnelEvent } from "@/lib/funnelTracking";

// ── Cooldown logic ────────────────────────────────────────────────────────

const SESSION_KEY = "crstats_conversion_shown";
const DAILY_KEY = "crstats_conversion_daily";
const MAX_PER_SESSION = 1;
const MAX_PER_DAY = 3;

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function getSessionCount(): number {
  try {
    return Number(sessionStorage.getItem(SESSION_KEY) || "0");
  } catch {
    return 0;
  }
}

function incrementSessionCount(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, String(getSessionCount() + 1));
  } catch {
    // ignore
  }
}

function getDailyCount(): number {
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    if (parsed.date !== getTodayKey()) return 0;
    return typeof parsed.count === "number" ? parsed.count : 0;
  } catch {
    return 0;
  }
}

function incrementDailyCount(): void {
  try {
    const todayKey = getTodayKey();
    const current = getDailyCount();
    localStorage.setItem(DAILY_KEY, JSON.stringify({ date: todayKey, count: current + 1 }));
  } catch {
    // ignore
  }
}

export function canShowConversionPrompt(): boolean {
  return getSessionCount() < MAX_PER_SESSION && getDailyCount() < MAX_PER_DAY;
}

// ── Component ─────────────────────────────────────────────────────────────

export type ConversionTrigger = "counter_success" | "push_insight" | "tilt_recovery";

interface ConversionPromptProps {
  trigger: ConversionTrigger;
  /** Win rate for counter_success context */
  winRate?: number;
  /** Called when the prompt is dismissed or actioned */
  onDismiss?: () => void;
}

export default function ConversionPrompt({ trigger, winRate, onDismiss }: ConversionPromptProps) {
  const { t } = useLocale();
  const [, setLocation] = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!canShowConversionPrompt()) return;

    // Show after a short delay for a less jarring experience
    const timer = setTimeout(() => {
      setVisible(true);
      incrementSessionCount();
      incrementDailyCount();
      trackFunnelEvent("upgrade_prompt_shown", { trigger });
    }, 1500);

    return () => clearTimeout(timer);
  }, [trigger]);

  const handleUpgrade = useCallback(() => {
    trackFunnelEvent("upgrade_prompt_clicked", { trigger });
    setVisible(false);
    onDismiss?.();
    setLocation("/pricing");
  }, [trigger, onDismiss, setLocation]);

  const handleDismiss = useCallback(() => {
    trackFunnelEvent("upgrade_prompt_dismissed", { trigger });
    setVisible(false);
    onDismiss?.();
  }, [trigger, onDismiss]);

  if (!visible) return null;

  const getMessage = () => {
    switch (trigger) {
      case "counter_success":
        return t("pages.conversionPrompt.counterSuccess", {
          winRate: String(winRate || 0),
        });
      case "push_insight":
        return t("pages.conversionPrompt.pushInsight");
      case "tilt_recovery":
        return t("pages.conversionPrompt.tiltRecovery");
      default:
        return t("pages.conversionPrompt.pushInsight");
    }
  };

  return (
    <Card className="fixed bottom-4 right-4 z-40 w-80 border-yellow-500/30 bg-card/95 backdrop-blur-sm shadow-lg animate-in slide-in-from-bottom-4 fade-in duration-300">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center shrink-0 mt-0.5">
            <Crown className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground leading-relaxed mb-3">
              {getMessage()}
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-xs"
                onClick={handleUpgrade}
              >
                {t("pages.conversionPrompt.upgradeButton")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-muted-foreground"
                onClick={handleDismiss}
              >
                {t("pages.conversionPrompt.dismiss")}
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
