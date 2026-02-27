import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageErrorState from "@/components/PageErrorState";
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
import { PRICING, ELITE_PRICING } from "@shared/pricing";
import { cn } from "@/lib/utils";
import { Crown, ExternalLink, Loader2, ReceiptText, Sparkles } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { getApiErrorMessage } from "@/lib/errorMessages";
import { getYearlySavingsPercent, getEliteYearlySavingsPercent } from "@shared/pricing";
import { formatDate, formatMoneyFromCents } from "@/lib/formatters";
import { trackFunnelEvent } from "@/lib/funnelTracking";

interface SubscriptionResponse {
  plan?: string;
  status?: string;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean | null;
}

interface BillingInvoice {
  id: string;
  status: string;
  amountPaid: number;
  amountDue: number;
  currency: string;
  createdAt: string;
  periodStart: string | null;
  periodEnd: string | null;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
}

export default function BillingPage() {
  const { t, locale } = useLocale();
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeAction, setActiveAction] = useState<"checkout" | "portal" | "upgrade" | null>(null);
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");

  const subscriptionQuery = useQuery({
    queryKey: ["subscription"],
    queryFn: () => api.subscription.get() as Promise<SubscriptionResponse>,
  });

  const invoicesQuery = useQuery({
    queryKey: ["billing-invoices"],
    queryFn: () => api.billing.getInvoices() as Promise<BillingInvoice[]>,
  });

  const checkoutMutation = useMutation({
    mutationFn: (priceId: string) => api.stripe.createCheckout(priceId, "BRL"),
    onMutate: () => setActiveAction("checkout"),
    onSuccess: ({ url }) => {
      trackFunnelEvent("checkout_start");
      window.location.href = url;
    },
    onError: (error: unknown) => {
      toast({
        title: t("pages.billing.toast.checkoutErrorTitle"),
        description: getApiErrorMessage(error, t, "pages.billing.errors.checkout"),
        variant: "destructive",
      });
      setActiveAction(null);
    },
  });

  const portalMutation = useMutation({
    mutationFn: () => api.stripe.createPortal(),
    onMutate: () => setActiveAction("portal"),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (error: unknown) => {
      toast({
        title: t("pages.billing.toast.portalErrorTitle"),
        description: getApiErrorMessage(error, t, "pages.billing.errors.portal"),
        variant: "destructive",
      });
      setActiveAction(null);
    },
  });

  const upgradeMutation = useMutation({
    mutationFn: () => api.stripe.upgrade(billingInterval),
    onMutate: () => setActiveAction("upgrade"),
    onSuccess: () => {
      toast({
        title: t("pages.billing.toast.upgradeSuccessTitle"),
        description: t("pages.billing.toast.upgradeSuccessDescription"),
      });
      setActiveAction(null);
      subscriptionQuery.refetch();
    },
    onError: (error: unknown) => {
      toast({
        title: t("pages.billing.toast.upgradeErrorTitle"),
        description: getApiErrorMessage(error, t, "pages.billing.errors.checkout"),
        variant: "destructive",
      });
      setActiveAction(null);
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("success") === "true") {
      trackFunnelEvent("payment_complete");
      toast({
        title: t("pages.billing.toast.activatedTitle"),
        description: t("pages.billing.toast.activatedDescription"),
      });
      setLocation("/billing", { replace: true });
    }
    if (params.get("canceled") === "true") {
      toast({
        title: t("pages.billing.toast.canceledTitle"),
        description: t("pages.billing.toast.canceledDescription"),
        variant: "destructive",
      });
      setLocation("/billing", { replace: true });
    }
  }, [search, setLocation, toast]);

  const subscription = subscriptionQuery.data;
  const invoices = invoicesQuery.data || [];

  const isPro = subscription?.plan === "pro" && subscription?.status === "active";
  const isElite = subscription?.plan === "elite" && subscription?.status === "active";
  const isPaid = isPro || isElite;

  const hasProYearly = Boolean(PRICING.BRL.yearlyPriceId) && typeof PRICING.BRL.yearlyPrice === "number";
  const hasEliteYearly = Boolean(ELITE_PRICING.BRL.yearlyPriceId) && typeof ELITE_PRICING.BRL.yearlyPrice === "number";
  const proSavingsPercent = hasProYearly ? getYearlySavingsPercent("BRL") : 0;
  const eliteSavingsPercent = hasEliteYearly ? getEliteYearlySavingsPercent("BRL") : 0;

  const selectedProPriceId =
    billingInterval === "year" && hasProYearly ? (PRICING.BRL.yearlyPriceId as string) : PRICING.BRL.monthlyPriceId;
  const selectedProAmount =
    billingInterval === "year" && hasProYearly ? (PRICING.BRL.yearlyPrice as number) : PRICING.BRL.monthlyPrice;
  const selectedProLabel =
    billingInterval === "year"
      ? `${formatMoneyFromCents(Math.round(selectedProAmount * 100), "BRL", locale)}/${t("common.year")}`
      : `${formatMoneyFromCents(Math.round(selectedProAmount * 100), "BRL", locale)}/${t("common.month")}`;

  const renewalText = useMemo(() => {
    if (!subscription?.currentPeriodEnd) return t("pages.billing.renewal.none");
    if (subscription.cancelAtPeriodEnd) {
      return t("pages.billing.renewal.cancelAt", {
        date: formatDate(subscription.currentPeriodEnd, locale),
      });
    }
    return t("pages.billing.renewal.nextAt", {
      date: formatDate(subscription.currentPeriodEnd, locale),
    });
  }, [locale, subscription?.cancelAtPeriodEnd, subscription?.currentPeriodEnd, t]);

  const hasLoadError = subscriptionQuery.isError || invoicesQuery.isError;
  const isLoading = checkoutMutation.isPending || portalMutation.isPending || upgradeMutation.isPending;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">{t("pages.billing.title")}</h1>
          <p className="text-muted-foreground">{t("pages.billing.subtitle")}</p>
        </div>

        {hasLoadError ? (
          <PageErrorState
            title={t("pages.billing.errorTitle")}
            description={getApiErrorMessage(subscriptionQuery.error || invoicesQuery.error, t, "pages.billing.errors.load")}
            error={subscriptionQuery.error || invoicesQuery.error}
            onRetry={() => {
              subscriptionQuery.refetch();
              invoicesQuery.refetch();
            }}
          />
        ) : null}

        {subscriptionQuery.isLoading ? (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("pages.billing.loadingSubscription")}
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-border/50 bg-card/50" data-testid="billing-plan-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {isElite ? (
                    <Sparkles className="w-5 h-5 text-purple-500" />
                  ) : (
                    <Crown className="w-5 h-5 text-yellow-500" />
                  )}
                  {t("pages.billing.planTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={isPaid ? "default" : "secondary"}
                    className={cn(
                      isElite && "bg-gradient-to-r from-purple-500 to-indigo-600",
                      isPro && !isElite && "bg-gradient-to-r from-yellow-500 to-orange-500",
                    )}
                  >
                    {isElite
                      ? t("pages.billing.planElite")
                      : isPro
                        ? t("pages.billing.planActive")
                        : t("pages.billing.planFree")}
                  </Badge>
                  {!isPaid && (
                    <Badge variant="outline">
                      {selectedProLabel}
                    </Badge>
                  )}
                  {!isPaid && billingInterval === "year" && proSavingsPercent > 0 ? (
                    <Badge variant="outline" className="border-green-500/30 text-green-600">
                      {t("pages.billing.interval.savePercent", { percent: proSavingsPercent })}
                    </Badge>
                  ) : null}
                </div>

                <p className="text-sm text-muted-foreground">{renewalText}</p>

                {!isPaid && hasProYearly ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={billingInterval === "month" ? "default" : "outline"}
                      onClick={() => setBillingInterval("month")}
                      disabled={isLoading}
                      data-testid="button-billing-interval-month"
                    >
                      {t("pages.billing.interval.monthly")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={billingInterval === "year" ? "default" : "outline"}
                      onClick={() => setBillingInterval("year")}
                      disabled={isLoading}
                      data-testid="button-billing-interval-year"
                    >
                      {t("pages.billing.interval.yearly")}
                    </Button>
                  </div>
                ) : null}

                <div className="grid md:grid-cols-2 gap-3">
                  <FeatureItem text={t("pages.billing.features.coach")} />
                  <FeatureItem text={t("pages.billing.features.pushAnalysis")} />
                  <FeatureItem text={t("pages.billing.features.training")} />
                  <FeatureItem text={t("pages.billing.features.portal")} />
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {isPaid ? (
                    <>
                      <Button
                        onClick={() => portalMutation.mutate()}
                        disabled={isLoading}
                        data-testid="button-manage-subscription"
                      >
                        {activeAction === "portal" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {t("pages.billing.manage")}
                      </Button>
                      {isPro && !isElite && (
                        <Button
                          variant="outline"
                          className="border-purple-500/30 text-purple-600 hover:bg-purple-500/10"
                          onClick={() => upgradeMutation.mutate()}
                          disabled={isLoading}
                          data-testid="button-upgrade-elite"
                        >
                          {activeAction === "upgrade" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          {t("pages.billing.upgradeToElite")}
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <Button
                        className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                        onClick={() => checkoutMutation.mutate(selectedProPriceId)}
                        disabled={isLoading}
                        data-testid="button-upgrade-pro-brl"
                      >
                        {activeAction === "checkout" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {t("pages.billing.subscribePro")}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setLocation("/pricing")}
                        disabled={isLoading}
                      >
                        {t("pages.billing.viewPricing")}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50" data-testid="billing-status-card">
              <CardHeader>
                <CardTitle className="text-base">{t("pages.billing.status.title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("pages.billing.status.plan")}</span>
                  <span className="font-medium uppercase">{subscription?.plan || t("pages.billing.status.freeFallback")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("pages.billing.status.status")}</span>
                  <span className="font-medium">{subscription?.status || t("pages.billing.status.inactiveFallback")}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">{t("pages.billing.status.nextCycle")}</span>
                  <span className="font-medium text-right">{formatDate(subscription?.currentPeriodEnd, locale)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("pages.billing.status.cancelAtEnd")}</span>
                  <span className="font-medium">{subscription?.cancelAtPeriodEnd ? t("common.yes") : t("common.no")}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="border-border/50 bg-card/50" data-testid="billing-invoices-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ReceiptText className="w-5 h-5" />
              {t("pages.billing.invoices.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invoicesQuery.isLoading ? (
                <div className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("pages.billing.invoices.loading")}
                </div>
              ) : invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("pages.billing.invoices.empty")}</p>
              ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("pages.billing.invoices.table.date")}</TableHead>
                        <TableHead>{t("pages.billing.invoices.table.status")}</TableHead>
                        <TableHead>{t("pages.billing.invoices.table.amount")}</TableHead>
                        <TableHead>{t("pages.billing.invoices.table.period")}</TableHead>
                        <TableHead className="text-right">{t("pages.billing.invoices.table.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell>{formatDate(invoice.createdAt, locale)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{invoice.status || t("pages.billing.invoices.unknownStatus")}</Badge>
                          </TableCell>
                          <TableCell>{formatMoneyFromCents(invoice.amountPaid || invoice.amountDue || 0, invoice.currency || "BRL", locale)}</TableCell>
                          <TableCell>
                            {formatDate(invoice.periodStart, locale)} - {formatDate(invoice.periodEnd, locale)}
                          </TableCell>
                          <TableCell className="text-right">
                            {invoice.hostedInvoiceUrl ? (
                          <a
                            href={invoice.hostedInvoiceUrl}
                            target="_blank"
                            rel="noreferrer"
                                className="inline-flex items-center text-sm text-primary hover:underline"
                              >
                                {t("pages.billing.invoices.open")}
                                {" "}
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-border/40 px-3 py-2 text-sm">
      {text}
    </div>
  );
}
