/**
 * Pricing page with two-tier comparison (Story 2.6, AC2).
 *
 * Shows Free / PRO / Elite tiers with feature comparison table,
 * monthly/annual toggle, and CTA buttons linking to Stripe checkout.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/hooks/use-locale";
import { PRICING, ELITE_PRICING, getYearlySavingsPercent, getEliteYearlySavingsPercent } from "@shared/pricing";
import { formatMoneyFromCents } from "@/lib/formatters";
import { trackFunnelEvent } from "@/lib/funnelTracking";
import { Check, Crown, Loader2, Sparkles, X as XIcon, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

interface SubscriptionResponse {
  plan?: string;
  status?: string;
}

export default function PricingPage() {
  const { t, locale } = useLocale();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [activeAction, setActiveAction] = useState<string | null>(null);

  useEffect(() => {
    trackFunnelEvent("pricing_view");
  }, []);

  const subscriptionQuery = useQuery({
    queryKey: ["subscription"],
    queryFn: () => api.subscription.get() as Promise<SubscriptionResponse>,
  });

  const checkoutMutation = useMutation({
    mutationFn: (priceId: string) => {
      trackFunnelEvent("checkout_start", { priceId });
      return api.stripe.createCheckout(priceId, "BRL");
    },
    onMutate: (priceId) => setActiveAction(priceId),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: () => {
      toast({
        title: t("pages.billing.toast.checkoutErrorTitle"),
        variant: "destructive",
      });
      setActiveAction(null);
    },
  });

  const upgradeMutation = useMutation({
    mutationFn: (interval: string) =>
      api.stripe.createCheckout(
        interval === "year" && ELITE_PRICING.BRL.yearlyPriceId
          ? ELITE_PRICING.BRL.yearlyPriceId
          : ELITE_PRICING.BRL.monthlyPriceId,
        "BRL",
      ),
    onMutate: () => setActiveAction("upgrade"),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: () => {
      toast({
        title: t("pages.billing.toast.upgradeErrorTitle"),
        variant: "destructive",
      });
      setActiveAction(null);
    },
  });

  const subscription = subscriptionQuery.data;
  const currentPlan = subscription?.status === "active" ? subscription?.plan : "free";
  const isPro = currentPlan === "pro";
  const isElite = currentPlan === "elite";

  const proSavings = getYearlySavingsPercent("BRL");
  const eliteSavings = getEliteYearlySavingsPercent("BRL");
  const hasProYearly = Boolean(PRICING.BRL.yearlyPriceId);
  const hasEliteYearly = Boolean(ELITE_PRICING.BRL.yearlyPriceId);

  // Price display
  const proMonthly = PRICING.BRL.monthlyPrice;
  const proYearly = PRICING.BRL.yearlyPrice || proMonthly * 12;
  const eliteMonthly = ELITE_PRICING.BRL.monthlyPrice;
  const eliteYearly = ELITE_PRICING.BRL.yearlyPrice || eliteMonthly * 12;

  const formatAmount = (amount: number) =>
    formatMoneyFromCents(Math.round(amount * 100), "BRL", locale);

  const getProPriceId = () =>
    billingInterval === "year" && hasProYearly
      ? (PRICING.BRL.yearlyPriceId as string)
      : PRICING.BRL.monthlyPriceId;

  const getElitePriceId = () =>
    billingInterval === "year" && hasEliteYearly
      ? (ELITE_PRICING.BRL.yearlyPriceId as string)
      : ELITE_PRICING.BRL.monthlyPriceId;

  const isLoading = checkoutMutation.isPending || upgradeMutation.isPending;

  // Feature comparison data
  const features = [
    { key: "metaDecks", free: "5/day", pro: t("pages.pricing.featureTable.unlimited"), elite: t("pages.pricing.featureTable.unlimited") },
    { key: "counterDecks", free: "5/day", pro: t("pages.pricing.featureTable.unlimited"), elite: t("pages.pricing.featureTable.unlimited") },
    { key: "coachChat", free: "5/day", pro: t("pages.pricing.featureTable.unlimited"), elite: t("pages.pricing.featureTable.unlimitedPriority") },
    { key: "pushAnalysis", free: t("pages.pricing.featureTable.none"), pro: t("pages.pricing.featureTable.full"), elite: t("pages.pricing.featureTable.full") },
    { key: "deckOptimizer", free: "5/day", pro: t("pages.pricing.featureTable.unlimited"), elite: t("pages.pricing.featureTable.unlimited") },
    { key: "trainingPlans", free: t("pages.pricing.featureTable.none"), pro: t("pages.pricing.featureTable.none"), elite: t("pages.pricing.featureTable.full") },
    { key: "advancedAnalytics", free: t("pages.pricing.featureTable.none"), pro: t("pages.pricing.featureTable.none"), elite: t("pages.pricing.featureTable.full") },
    { key: "matchupData", free: t("pages.pricing.featureTable.basic"), pro: t("pages.pricing.featureTable.basic"), elite: t("pages.pricing.featureTable.detailed") },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-display font-bold">{t("pages.pricing.title")}</h1>
          <p className="text-muted-foreground mt-2">{t("pages.pricing.subtitle")}</p>
        </div>

        {/* Billing interval toggle */}
        <div className="flex justify-center gap-2">
          <Button
            size="sm"
            variant={billingInterval === "month" ? "default" : "outline"}
            onClick={() => setBillingInterval("month")}
            disabled={isLoading}
          >
            {t("pages.pricing.monthly")}
          </Button>
          <Button
            size="sm"
            variant={billingInterval === "year" ? "default" : "outline"}
            onClick={() => setBillingInterval("year")}
            disabled={isLoading}
          >
            {t("pages.pricing.yearly")}
          </Button>
        </div>

        {/* Tier cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Free tier */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="text-center">
              <CardTitle className="text-lg">{t("pages.pricing.free.name")}</CardTitle>
              <p className="text-sm text-muted-foreground">{t("pages.pricing.free.description")}</p>
              <div className="text-3xl font-bold mt-2">
                {formatAmount(0)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.values(t("pages.pricing.free.features") as unknown as Record<string, string>).map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500 shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
              <Button
                className="w-full mt-4"
                variant="outline"
                disabled={currentPlan === "free" || isLoading}
              >
                {currentPlan === "free" ? t("pages.pricing.currentPlan") : t("pages.pricing.free.cta")}
              </Button>
            </CardContent>
          </Card>

          {/* PRO tier */}
          <Card className={cn(
            "border-border/50 bg-card/50 relative",
            !isElite && "ring-2 ring-yellow-500/50",
          )}>
            {!isElite && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-white">
                {t("pages.pricing.mostPopular")}
              </Badge>
            )}
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-lg">
                <Crown className="w-5 h-5 text-yellow-500" />
                {t("pages.pricing.pro.name")}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{t("pages.pricing.pro.description")}</p>
              <div className="text-3xl font-bold mt-2">
                {billingInterval === "month"
                  ? formatAmount(proMonthly)
                  : formatAmount(proYearly)}
                <span className="text-sm font-normal text-muted-foreground">
                  {billingInterval === "month" ? t("pages.pricing.perMonth") : t("pages.pricing.perYear")}
                </span>
              </div>
              {billingInterval === "year" && proSavings > 0 && (
                <Badge variant="outline" className="border-green-500/30 text-green-600 mx-auto">
                  {t("pages.pricing.savePercent", { percent: proSavings })}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.values(t("pages.pricing.pro.features") as unknown as Record<string, string>).map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Zap className="w-4 h-4 text-yellow-500 shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
              <Button
                className={cn(
                  "w-full mt-4",
                  !isPro && !isElite && "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600",
                )}
                disabled={isPro || isElite || isLoading}
                onClick={() => checkoutMutation.mutate(getProPriceId())}
              >
                {activeAction === getProPriceId() && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {isPro || isElite ? t("pages.pricing.currentPlan") : t("pages.pricing.pro.cta")}
              </Button>
            </CardContent>
          </Card>

          {/* Elite tier */}
          <Card className={cn(
            "border-border/50 bg-card/50 relative",
            isElite && "ring-2 ring-purple-500/50",
          )}>
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white">
              {t("pages.pricing.bestValue")}
            </Badge>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-lg">
                <Sparkles className="w-5 h-5 text-purple-500" />
                {t("pages.pricing.elite.name")}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{t("pages.pricing.elite.description")}</p>
              <div className="text-3xl font-bold mt-2">
                {billingInterval === "month"
                  ? formatAmount(eliteMonthly)
                  : formatAmount(eliteYearly)}
                <span className="text-sm font-normal text-muted-foreground">
                  {billingInterval === "month" ? t("pages.pricing.perMonth") : t("pages.pricing.perYear")}
                </span>
              </div>
              {billingInterval === "year" && eliteSavings > 0 && (
                <Badge variant="outline" className="border-green-500/30 text-green-600 mx-auto">
                  {t("pages.pricing.savePercent", { percent: eliteSavings })}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.values(t("pages.pricing.elite.features") as unknown as Record<string, string>).map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
              <Button
                className={cn(
                  "w-full mt-4",
                  !isElite && "bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700",
                )}
                disabled={isElite || isLoading}
                onClick={() => {
                  if (isPro) {
                    upgradeMutation.mutate(billingInterval);
                  } else {
                    checkoutMutation.mutate(getElitePriceId());
                  }
                }}
              >
                {(activeAction === getElitePriceId() || activeAction === "upgrade") && (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                )}
                {isElite
                  ? t("pages.pricing.currentPlan")
                  : isPro
                    ? t("pages.billing.upgradeToElite")
                    : t("pages.pricing.elite.cta")}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Feature comparison table */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle>{t("pages.pricing.featureTable.feature")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("pages.pricing.featureTable.feature")}</TableHead>
                  <TableHead className="text-center">{t("pages.pricing.free.name")}</TableHead>
                  <TableHead className="text-center">{t("pages.pricing.pro.name")}</TableHead>
                  <TableHead className="text-center">{t("pages.pricing.elite.name")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {features.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="font-medium">
                      {t(`pages.pricing.featureTable.${row.key}`)}
                    </TableCell>
                    <TableCell className="text-center text-sm">{row.free}</TableCell>
                    <TableCell className="text-center text-sm">{row.pro}</TableCell>
                    <TableCell className="text-center text-sm">{row.elite}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle>{t("pages.pricing.faq.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium text-sm">{t("pages.pricing.faq.upgradeQuestion")}</p>
              <p className="text-sm text-muted-foreground mt-1">{t("pages.pricing.faq.upgradeAnswer")}</p>
            </div>
            <div>
              <p className="font-medium text-sm">{t("pages.pricing.faq.cancelQuestion")}</p>
              <p className="text-sm text-muted-foreground mt-1">{t("pages.pricing.faq.cancelAnswer")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
