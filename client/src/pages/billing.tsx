import React, { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "@/hooks/use-locale";

export default function BillingPage() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, pricing, formatPrice, savingsPercent, currency } = useLocale();
  const [loadingPlan, setLoadingPlan] = useState<"monthly" | "yearly" | "portal" | null>(null);

  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => api.subscription.get(),
  });

  const isPro = (subscription as any)?.plan === "pro" || (subscription as any)?.status === "active";

  const freeFeatures = t('billing.free.features') as unknown as string[];
  const proFeatures = t('billing.pro.features') as unknown as string[];

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
            <div className="flex items-center gap-3" data-testid="text-current-plan">
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
                        disabled={loadingPlan !== null}
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
                        disabled={loadingPlan !== null}
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
