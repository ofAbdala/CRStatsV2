import React, { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Sparkles, Loader2, AlertCircle, Clock, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "@/hooks/use-locale";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SubscriptionData {
  plan: 'free' | 'pro';
  status: 'inactive' | 'active' | 'canceled' | 'past_due';
  currentPeriodEnd?: string;
  stripeCustomerId?: string;
  cancelAtPeriodEnd?: boolean;
}

export default function BillingPage() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, tArray, pricing, formatPrice, savingsPercent, currency, locale } = useLocale();
  const [loadingPlan, setLoadingPlan] = useState<"monthly" | "yearly" | "portal" | null>(null);
  const [stripeConfigured, setStripeConfigured] = useState<boolean | null>(null);

  const { data: subscription, isLoading: subscriptionLoading, error: subscriptionError } = useQuery<SubscriptionData>({
    queryKey: ["subscription"],
    queryFn: () => api.subscription.get() as Promise<SubscriptionData>,
  });

  useEffect(() => {
    api.stripe.getConfig()
      .then(() => setStripeConfigured(true))
      .catch(() => setStripeConfigured(false));
  }, []);

  const isPro = subscription?.plan === "pro" && subscription?.status === "active";
  const subscriptionStatus = subscription?.status || 'inactive';
  const isCanceled = subscriptionStatus === 'canceled';
  const isPastDue = subscriptionStatus === 'past_due';
  const currentPeriodEnd = subscription?.currentPeriodEnd;
  const cancelAtPeriodEnd = subscription?.cancelAtPeriodEnd;

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const freeFeatures = tArray('billing.free.features');
  const proFeatures = tArray('billing.pro.features');

  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("success") === "true") {
      toast({
        title: t('billing.toast.activated'),
        description: t('billing.toast.activatedDesc'),
      });
      setLocation("/billing", { replace: true });
    } else if (params.get("canceled") === "true") {
      toast({
        title: t('billing.toast.canceled'),
        description: t('billing.toast.canceledDesc'),
        variant: "destructive",
      });
      setLocation("/billing", { replace: true });
    }
  }, [search, toast, setLocation, t]);

  const handleUpgrade = async (priceId: string, plan: "monthly" | "yearly") => {
    setLoadingPlan(plan);
    try {
      const { url } = await api.stripe.createCheckout(priceId, currency);
      window.location.href = url;
    } catch (error: any) {
      toast({
        title: t('billing.toast.checkoutError'),
        description: error.message || t('billing.toast.tryAgain'),
        variant: "destructive",
      });
      setLoadingPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    setLoadingPlan("portal");
    try {
      const { url } = await api.stripe.createPortal();
      window.location.href = url;
    } catch (error: any) {
      toast({
        title: t('billing.toast.portalError'),
        description: error.message || t('billing.toast.tryAgain'),
        variant: "destructive",
      });
      setLoadingPlan(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">{t('billing.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('billing.subtitle')}
          </p>
        </div>

        {subscriptionLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {stripeConfigured === false && (
              <Alert variant="destructive" className="max-w-4xl" data-testid="alert-stripe-not-configured">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t('billing.stripeNotConfigured')}
                </AlertDescription>
              </Alert>
            )}

            {isPastDue && (
              <Alert variant="destructive" className="max-w-4xl" data-testid="alert-past-due">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t('billing.paymentPastDue')}
                </AlertDescription>
              </Alert>
            )}

            {cancelAtPeriodEnd && currentPeriodEnd && subscription?.plan === 'pro' && (
              <Alert className="max-w-4xl border-yellow-500/50" data-testid="alert-cancel-pending">
                <Clock className="h-4 w-4 text-yellow-500" />
                <AlertDescription>
                  {t('billing.cancelPending', { date: formatDate(currentPeriodEnd) })}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-2" data-testid="text-current-plan">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{t('billing.currentPlan')}:</span>
                <Badge variant={isPro ? "default" : "secondary"} className={cn(isPro && "bg-gradient-to-r from-yellow-500 to-orange-500")}>
                  {isPro ? (
                    <>
                      <Crown className="w-3 h-3 mr-1" />
                      PRO
                    </>
                  ) : (
                    "FREE"
                  )}
                </Badge>
                {subscription?.plan === 'pro' && subscriptionStatus !== 'active' && (
                  <Badge variant={isPastDue ? "destructive" : "secondary"} data-testid="badge-subscription-status">
                    {isPastDue ? t('billing.status.pastDue') : isCanceled ? t('billing.status.canceled') : t('billing.status.inactive')}
                  </Badge>
                )}
              </div>
              {isPro && currentPeriodEnd && !cancelAtPeriodEnd && (
                <p className="text-sm text-muted-foreground" data-testid="text-period-end">
                  {t('billing.renewsOn', { date: formatDate(currentPeriodEnd) })}
                </p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
              {/* FREE Plan */}
              <Card className={cn("border-border/50 bg-card/50 backdrop-blur-sm", !isPro && "ring-2 ring-primary/20")} data-testid="plan-free">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-display">{t('billing.free.name')}</CardTitle>
                    {!isPro && <Badge variant="outline">{t('billing.currentPlanButton')}</Badge>}
                  </div>
                  <CardDescription>{t('billing.free.description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <span className="text-3xl font-bold">{formatPrice(0)}</span>
                    <span className="text-muted-foreground">{t('billing.perMonth')}</span>
                  </div>
                  <ul className="space-y-3">
                    {(Array.isArray(freeFeatures) ? freeFeatures : []).map((feature: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {!isPro && (
                    <Button variant="outline" className="w-full" disabled>
                      {t('billing.currentPlanButton')}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* PRO Plan */}
              <Card className={cn("border-primary/50 bg-gradient-to-br from-card to-primary/5 backdrop-blur-sm relative overflow-hidden", isPro && "ring-2 ring-primary")} data-testid="plan-pro">
                <div className="absolute top-0 right-0 px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold rounded-bl-lg">
                  <Sparkles className="w-3 h-3 inline mr-1" />
                  {t('billing.pro.popular')}
                </div>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-display flex items-center gap-2">
                      <Crown className="w-5 h-5 text-yellow-500" />
                      {t('billing.pro.name')}
                    </CardTitle>
                    {isPro && <Badge>{t('billing.currentPlanButton')}</Badge>}
                  </div>
                  <CardDescription>{t('billing.pro.description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-1">
                    <div>
                      <span className="text-3xl font-bold">{formatPrice(pricing.monthlyPrice)}</span>
                      <span className="text-muted-foreground">{t('billing.perMonth')}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t('common.or')} <span className="font-semibold text-green-500">{formatPrice(pricing.yearlyPrice)}{t('billing.perYear')}</span>{" "}
                      <Badge variant="secondary" className="text-xs">{t('billing.savePercent', { percent: savingsPercent })}</Badge>
                    </div>
                  </div>
                  <ul className="space-y-3">
                    {(Array.isArray(proFeatures) ? proFeatures : []).map((feature: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <Zap className="w-4 h-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {isPro ? (
                    <Button 
                      className="w-full" 
                      onClick={handleManageSubscription}
                      disabled={loadingPlan === "portal"}
                      data-testid="button-manage-subscription"
                    >
                      {loadingPlan === "portal" ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      {t('billing.manageSubscription')}
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Button 
                        className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                        onClick={() => handleUpgrade(pricing.monthlyPriceId, "monthly")}
                        disabled={loadingPlan !== null || stripeConfigured === false}
                        data-testid="button-upgrade-monthly"
                      >
                        {loadingPlan === "monthly" ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        {t('billing.subscribeMonthly')}
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full border-green-500/50 text-green-500 hover:bg-green-500/10"
                        onClick={() => handleUpgrade(pricing.yearlyPriceId, "yearly")}
                        disabled={loadingPlan !== null || stripeConfigured === false}
                        data-testid="button-upgrade-yearly"
                      >
                        {loadingPlan === "yearly" ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        {t('billing.subscribeYearly')} ({t('billing.savePercent', { percent: savingsPercent })})
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {isPro && (
              <Card className="border-border/50 bg-card/50 max-w-4xl" data-testid="card-payment-history">
                <CardHeader>
                  <CardTitle className="text-lg font-display flex items-center gap-2">
                    <Receipt className="w-5 h-5" />
                    {t('billing.paymentHistory.title')}
                  </CardTitle>
                  <CardDescription>{t('billing.paymentHistory.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                    <Receipt className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-sm">{t('billing.paymentHistory.comingSoon')}</p>
                    <p className="text-xs mt-1">{t('billing.paymentHistory.usePortal')}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-4"
                      onClick={handleManageSubscription}
                      disabled={loadingPlan === "portal"}
                      data-testid="button-view-invoices-portal"
                    >
                      {loadingPlan === "portal" ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      {t('billing.paymentHistory.viewInPortal')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-border/50 bg-card/50 max-w-4xl">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">{t('billing.faq.title')}</h3>
                <div className="space-y-4 text-sm text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground">{t('billing.faq.cancelQuestion')}</p>
                    <p>{t('billing.faq.cancelAnswer')}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{t('billing.faq.paymentQuestion')}</p>
                    <p>{t('billing.faq.paymentAnswer')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
